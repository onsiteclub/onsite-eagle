# 🔧 FIX: Native Geofence EXIT Events

## 🎯 Problem Identified

**Native geofence EXIT events were not being dispatched by the OS.**

Based on your real data (error_log), all events were `"eventType": "check"` (from heartbeat), not `"exit"` events from native geofencing.

---

## ✅ Changes Made

### 1. Enhanced Geofencing Initialization (`src/lib/location.ts`)

**Added:**
- ✅ Explicit `notifyOnEnter: true` and `notifyOnExit: true` for ALL regions
- ✅ Stop existing geofencing before restart (clean slate)
- ✅ Verification after starting (checks `hasStartedGeofencingAsync`)
- ✅ Debug logs for each region being registered
- ✅ Confirmation logs when geofencing starts successfully

**Why:**
- Ensures both ENTER and EXIT notifications are always enabled
- Prevents stale geofence registrations from interfering
- Verifies the system actually started geofencing

---

### 2. Enhanced Task Debugging (`src/lib/backgroundTasks.ts`)

**Added:**
- ✅ Log EVERY time the geofence task is fired by the OS
- ✅ Log the native event type (`Enter` or `Exit`)
- ✅ Log region identifier for each event
- ✅ Warning if unknown event type received
- ✅ Warning if null data received

**Why:**
- Now you can see if the OS is calling the task at all
- Can confirm if EXIT events are being dispatched
- Helps identify if the problem is OS-level or app-level

---

## 📊 Expected Logs (After Fix)

### When Geofencing Starts:

```
[geofence] 🎯 Starting geofencing for 2 region(s)
[geofence] Region 1: abc123 @ (45.3751, -75.1234) radius=100m
[geofence] Region 2: def456 @ (45.3800, -75.1300) radius=150m
[geofence] ✅ Geofencing started successfully with 2 regions
[geofence] ✅ notifyOnEnter: true, notifyOnExit: true for all regions
```

---

### When You EXIT a Fence:

**NOW you should see:**

```
[geofence] 🔔 GEOFENCE TASK FIRED
[geofence] 🔔 Native event type: Exit
[geofence] 🔔 Processing EXIT event
[geofence] 📍 Geofence exit: Office
[bootstrap] 🎯 Geofence event: exit @ abc123
[locationStore] 📍 Geofence exit: Office
[sessionHandlers] 🚶 GEOFENCE EXIT: Office
(wait 15 seconds...)
[sessionHandlers] ⏱️ AUTO END (15s timeout) with 5 min adjustment
[recordStore] 📤 EXIT with adjustment: -5min
```

**✅ Timer should auto-stop!**

---

## 🧪 How to Test

### Step 1: Rebuild the App

```bash
# Clear Metro cache
npx expo start -c

# Rebuild native code (geofencing changes require native rebuild)
npx expo prebuild --clean
eas build --profile development --platform android
```

**IMPORTANT:** Geofencing requires **native rebuild** because:
- Task registration happens at native level
- Location permissions are native
- Background modes are native

---

### Step 2: Install Fresh Build

1. Uninstall old version completely
2. Install new build
3. Grant ALL permissions:
   - Location: **Always Allow** (not just "While Using")
   - Notifications: Allow
4. Restart device (optional but recommended)

---

### Step 3: Test ENTER First

1. Start OUTSIDE all fences
2. Open app
3. Check logs: Should see `✅ Geofencing started successfully`
4. Close/minimize app
5. Walk INTO a fence
6. Wait 30 seconds
7. Open app and check logs

**Expected:**
```
🔔 GEOFENCE TASK FIRED
🔔 Native event type: Enter
🔔 Processing ENTER event
```

**If you DON'T see this:**
- Geofencing is not working at all
- Check permissions (must be "Always Allow")
- Check if task is registered: `TaskManager.isTaskRegisteredAsync('onsite-geofence')`

---

### Step 4: Test EXIT

1. With app closed/background
2. Start timer (enter fence, wait for auto-start)
3. Confirm timer is running
4. Walk OUT of fence (at least 150m away)
5. Wait 2 minutes
6. Open app and check logs

**Expected:**
```
🔔 GEOFENCE TASK FIRED
🔔 Native event type: Exit
🔔 Processing EXIT event
🚶 GEOFENCE EXIT: Office
⏱️ AUTO END (15s timeout) with 5 min adjustment
📤 EXIT
```

**Timer should be stopped!**

---

## 🔍 Diagnostic Commands

### Check if geofencing is running:

```typescript
const isRunning = await Location.hasStartedGeofencingAsync('onsite-geofence');
console.log('Geofencing active:', isRunning);
```

### Check if task is registered:

```typescript
const isRegistered = await TaskManager.isTaskRegisteredAsync('onsite-geofence');
console.log('Task registered:', isRegistered);
```

### Get registered regions:

```typescript
const regions = await Location.getRegisteredRegionsAsync('onsite-geofence');
console.log('Registered regions:', regions);
```

---

## 🚨 If Still Not Working

### Problem: Task Never Fires

**Logs:** No `🔔 GEOFENCE TASK FIRED` when you exit

**Possible causes:**
1. Background location permission not granted
2. Task not registered in app.json/native code
3. Device killed background services (battery optimization)
4. Android: App in "Restricted" battery mode

**Solution:**
```bash
# Check Android battery optimization
adb shell dumpsys deviceidle whitelist

# Add app to whitelist (for testing)
adb shell dumpsys deviceidle whitelist +com.onsiteclub.timekeeper
```

---

### Problem: Task Fires but No EXIT Events

**Logs:** `🔔 GEOFENCE TASK FIRED` appears, but event type is NOT "Exit"

**Possible causes:**
1. `notifyOnExit: false` in region config (fixed in this update)
2. OS not detecting exit (GPS accuracy issue)
3. Geofence regions not properly registered

**Solution:**
- Check logs for region registration
- Verify `notifyOnExit: true` in logs
- Test with LARGE radius (300m+) to rule out GPS issues

---

### Problem: EXIT Events Fire but Timer Doesn't Stop

**Logs:** You see `🚶 GEOFENCE EXIT` but NO `⏱️ AUTO END`

**Possible causes:**
- One of the 6 blocks is active (see EXIT_FLOW_ANALYSIS.md)
- Most likely: No active session (#4)

**Solution:**
- Check logs for block messages:
  - `No active session at this location`
  - `⏸️ Exit during pause`
  - `❌ Canceling pending enter`
  - `Duplicate exit ignored`
  - `🛡️ AUTO END CANCELLED`

---

## 📋 Checklist Before Testing

- [ ] Native rebuild completed (`eas build` or `npx expo prebuild`)
- [ ] Old app uninstalled completely
- [ ] Fresh install from new build
- [ ] Permissions granted:
  - [ ] Location: **Always Allow**
  - [ ] Notifications: Allow
- [ ] Device restarted (optional)
- [ ] Battery optimization disabled (for testing)
- [ ] Metro logs visible (to see console.log)

---

## 🎯 Success Criteria

**When working correctly:**

1. ✅ You see `✅ Geofencing started successfully` on app start
2. ✅ ENTER events fire: `🔔 Native event type: Enter`
3. ✅ EXIT events fire: `🔔 Native event type: Exit`
4. ✅ Timer auto-stops 15 seconds after exit
5. ✅ `error_log` shows `"eventType": "exit"` (not just "check")

---

## 📝 Summary

**What was fixed:**
1. Explicit `notifyOnExit: true` configuration
2. Clean slate (stop before start)
3. Verification after start
4. Comprehensive debug logging

**What needs testing:**
1. Native rebuild required
2. Fresh install with full permissions
3. Test ENTER first, then EXIT
4. Monitor logs for `🔔 GEOFENCE TASK FIRED`

**Next steps:**
1. Rebuild app
2. Test in real environment
3. Report back what logs you see
4. We'll debug further if needed

---

**Created:** 2026-01-15
**Files Modified:**
- `src/lib/location.ts` (lines 267-325)
- `src/lib/backgroundTasks.ts` (lines 102-142)
