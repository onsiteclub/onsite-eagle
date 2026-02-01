# 🔍 DEBUG: Auto-Stop Timer Not Working

## Status: INVESTIGATION COMPLETE ✅

---

## 🎯 Summary

The auto-stop timer is configured in `sessionHandlers.ts:317-361` and should fire **15 seconds** after geofence EXIT event. However, there are **5 critical blocks** that can prevent it from executing.

---

## 📍 Exit Flow Chain

```
Native Exit Event
     ↓
geofenceLogic.ts → processGeofenceEvent()
     ↓
bootstrap.ts → handleGeofenceEvent()
     ↓
locationStore.ts → handleGeofenceEvent()
     ↓
workSessionStore.ts → handleGeofenceExit()
     ↓
sessionHandlers.ts → handleGeofenceExitLogic()
     ↓
setTimeout(15000ms)
     ↓
GPS Check (hysteresis)
     ↓
registerExitWithAdjustment() ✅ TIMER STOPS
```

---

## ⚠️ 5 Critical Blocks That Prevent Auto-Stop

### Block #1: Boot Gate (App Not Ready)
**File:** `sessionHandlers.ts:244`
```typescript
if (!isBootReady()) {
  queueEvent({ type: 'exit', ... });
  return; // ❌ BLOCKS - Events queued until boot completes
}
```
**How to detect:** Check logs for `🚪 BOOT_GATE`

---

### Block #2: Duplicate Exit Already Pending
**File:** `sessionHandlers.ts:263`
```typescript
if (pendingAction?.type === 'exit' && pendingAction.locationId === locationId) {
  logger.debug('session', 'Duplicate exit ignored (already pending)');
  return; // ❌ BLOCKS - Can only have ONE pending exit per location
}
```
**How to detect:** Check logs for `Duplicate exit ignored`

---

### Block #3: No Active Session
**File:** `sessionHandlers.ts:298`
```typescript
if (!activeSession || activeSession.location_id !== locationId) {
  logger.debug('session', 'No active session at this location');
  return; // ❌ BLOCKS - Session already closed or wrong location
}
```
**How to detect:** Check logs for `No active session at this location`

**MOST LIKELY ISSUE:** The timer might have already been stopped manually or by another process.

---

### Block #4: Session is Paused
**File:** `sessionHandlers.ts:304`
```typescript
if (pauseState?.locationId === locationId) {
  logger.info('session', '⏸️ Exit during pause - countdown continues');
  return; // ❌ BLOCKS - Pause countdown continues outside fence
}
```
**How to detect:** Check logs for `⏸️ Exit during pause`

---

### Block #5: GPS Shows Still Inside (Hysteresis)
**File:** `sessionHandlers.ts:335`
```typescript
// After timeout fires, GPS is checked again with 30% buffer
const { isInside } = await checkInsideFence(
  lat, lng, userId,
  true, // useHysteresis = radius × 1.3
);

if (isInside) {
  logger.info('session', '🛡️ AUTO END CANCELLED - Still inside fence (hysteresis)');
  startVigilanceMode(...); // Checks every 60s for 5 minutes
  return; // ❌ BLOCKS - Vigilance mode starts instead
}
```
**How to detect:** Check logs for `🛡️ AUTO END CANCELLED`

**Note:** Vigilance mode will eventually call `registerExit()` if you stay outside for 1 minute.

---

## 🔎 Step-by-Step Debug Guide

### Step 1: Check if Exit Event is Being Received
**Search logs for:**
```
🚶 GEOFENCE EXIT: [location_name]
```

**If NOT found:**
- Geofence event is not firing at all
- Check `app.json` for task registration
- Check permissions: Location Always + Background Location

**If FOUND:** ✅ Event is being received, continue to Step 2

---

### Step 2: Check Which Block is Active
**Search logs for these patterns:**

| Log Message | Block Active | Solution |
|-------------|--------------|----------|
| `🚪 BOOT_GATE` | #1: Boot not ready | Wait for app initialization |
| `Duplicate exit ignored` | #2: Duplicate exit | Previous exit still pending |
| `No active session at this location` | **#3: No session** ⚠️ | **Session already ended** |
| `⏸️ Exit during pause` | #4: Paused | Resume session before exiting |
| `🛡️ AUTO END CANCELLED` | #5: GPS hysteresis | Vigilance mode started |

---

### Step 3: Check if Timeout Fires
**Search logs for:**
```
⏱️ AUTO END (15s timeout) with 5 min adjustment
```

**If FOUND:** ✅ Timeout fired and called `registerExitWithAdjustment()`

**If NOT found:**
- Timeout was cancelled (clearTimeout called)
- JavaScript runtime error in timeout callback
- App killed before timeout fired

---

### Step 4: Check if Exit was Registered
**Search logs for:**
```
📤 EXIT
```
(This is logged in `recordStore.ts:200` inside `registerExit()`)

**If FOUND:** ✅ Timer stopped successfully

**If NOT found:** Something blocked the DB call

---

## 🧪 Test Scenarios

### Scenario A: Exit Immediately After Entry
**Expected:** Entry pending is cancelled, no exit happens
**Log:** `❌ Canceling pending enter - user left`
**Code:** `sessionHandlers.ts:287-292`

---

### Scenario B: Exit While Paused
**Expected:** Exit is ignored, pause countdown continues
**Log:** `⏸️ Exit during pause - countdown continues`
**Code:** `sessionHandlers.ts:304-307`

---

### Scenario C: Exit Near Fence Border
**Expected:**
1. Exit timeout fires after 15s
2. GPS check shows still inside (hysteresis)
3. Vigilance mode starts (checks every 60s)
4. After 1 min outside: `registerExit()` called

**Logs:**
```
🚶 GEOFENCE EXIT: Site A
🛡️ AUTO END CANCELLED - Still inside fence (hysteresis)
👁️ Vigilance mode started
👁️ Vigilance check: Still inside fence
👁️ Vigilance check: NOW outside fence - ending session
📤 EXIT
```

---

### Scenario D: Clean Exit (Far from Fence)
**Expected:**
1. Exit timeout fires after 15s
2. GPS check confirms outside
3. `registerExitWithAdjustment()` called immediately

**Logs:**
```
🚶 GEOFENCE EXIT: Site A
⏱️ AUTO END (15s timeout) with 5 min adjustment
📤 EXIT
```

---

## 🐛 Most Likely Issues

### Issue #1: Session Already Ended (Block #3)
**Symptom:** Log shows `No active session at this location`

**Cause:**
- User manually stopped timer before exiting
- Another process already called `registerExit()`
- Session ended due to timeout/error

**Fix:** Check `recordStore.currentSession` state when exit event fires

---

### Issue #2: Timeout Not Firing
**Symptom:** No `⏱️ AUTO END` log after 15 seconds

**Cause:**
- `clearTimeout()` called prematurely
- App killed/suspended before timeout fires
- JavaScript error in timeout callback

**Fix:** Add try/catch in timeout callback + log when timeout is created

---

### Issue #3: GPS Hysteresis Always Blocking (Block #5)
**Symptom:** Always see `🛡️ AUTO END CANCELLED`

**Cause:**
- Fence radius too small + GPS inaccuracy
- Hysteresis buffer (radius × 1.3) keeps you "inside"
- Phone GPS accuracy > 50m

**Fix:**
- Increase fence radius in location settings
- Check GPS accuracy in logs
- Disable hysteresis temporarily for testing

---

## 📝 Recommended Logging Additions

Add these logs to `sessionHandlers.ts` for better debugging:

```typescript
// At start of setTimeout callback (line 317)
logger.info('session', `🔔 EXIT TIMEOUT FIRED (${EXIT_TIMEOUT}ms elapsed)`, { locationId });

// Before GPS check (line 322)
logger.debug('session', '📍 Checking GPS position before auto-end...');

// After GPS check (line 326)
logger.debug('session', `🔍 Fence check result: isInside=${isInside}`);

// Before registerExitWithAdjustment (line 350)
logger.debug('session', '✅ GPS confirms outside - proceeding with auto-end');

// After registerExitWithAdjustment (line 357)
logger.info('session', '✅ Session exit registered successfully');
```

---

## 🛠️ Quick Diagnostic Commands

### Check if geofence task is registered:
```bash
grep -r "GEOFENCE_TASK\|onsite-geofence" app.json
```

### Check exit handler implementation:
```bash
grep -A 20 "handleGeofenceExit" src/stores/workSessionStore.ts
```

### Check recordStore exit function:
```bash
grep -A 30 "registerExitWithAdjustment" src/stores/recordStore.ts
```

---

## 📊 Settings Configuration

**File:** `src/stores/settingsStore.ts`

```typescript
exitTimeoutSeconds: 15,     // How long before auto-stop (default: 15s)
exitAdjustmentMinutes: 5,   // Time subtracted from exit (-5 min)
```

**To change for testing:**
```typescript
// Faster timeout for debugging
useSettingsStore.getState().updateSettings({ exitTimeoutSeconds: 5 });
```

---

## ✅ Success Criteria

When working correctly, you should see this sequence:

```
🚶 GEOFENCE EXIT: [Location Name]
⏱️ AUTO END (15s timeout) with 5 min adjustment
📤 EXIT
```

**Time elapsed:** ~15 seconds from first log to last log

---

## 🎯 Next Steps

1. **Run the app** and trigger an exit event
2. **Check console logs** for the patterns above
3. **Identify which block** is preventing auto-stop (#1-#5)
4. **Report findings** with:
   - Which block is active
   - Full log sequence
   - Session state before exit (`recordStore.currentSession`)

---

**Generated:** 2025-01-15
**Investigation Agent ID:** ab3adb6
