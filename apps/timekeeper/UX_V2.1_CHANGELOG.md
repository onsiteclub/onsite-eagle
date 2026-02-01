# UX v2.1 - Location Carousel & Simplified Layout

**Date:** 2026-01-15
**Version:** v2.1
**Previous:** v2.0 (Enhanced Manual Entry)

---

## 🎯 Goals

1. **Eliminate friction**: Remove location dropdown, use visual card selection
2. **Maximize timer visibility**: Give timer 57% of screen (vs 25% before)
3. **Harmonize typography**: Fix disproportionate font sizes
4. **Simplify UI**: Remove unnecessary visual complexity
5. **Streamline Break input**: Quick preset selection

---

## ✅ Changes Implemented

### 1. **Location Cards Moved Above Form**

**Changed:** Moved existing location cards from BELOW timer to ABOVE the form
**Benefit:** Visual card selection eliminates need for dropdown

```
┌──────────────────────────────────────┐
│ [Site A] [Site B] [Site C]  [+]     │  ← Location carousel (8% of screen)
├──────────────────────────────────────┤
│ 📅 Wed, Jan 15              [▼]     │  ← Date selector
│ Entry   [ 09:00  🕐 ]               │
│ Exit    [ 17:00  🕐 ]               │
│ Break   [ 60 min  ▼ ]               │
│ Total: 8h                            │  22% of screen
│ [✓ Save Hours]                       │
├──────────────────────────────────────┤
│         🟢 Active Session            │
│          01:23:45                    │  57% of screen
│          [⏸]  [⏹]                   │
└──────────────────────────────────────┘
```

**Features:**
- Shows **3 most used locations** (sorted by active session → total hours today → alphabetical)
- **Tap card** = Select for logging (yellow highlight)
- **Long press** = Navigate to map view
- **"+" button** in section header = Add new location
- Uses existing `locationCardsRow` with horizontal scroll

**Files Modified:**
- [app/(tabs)/index.tsx:332-380](app/(tabs)/index.tsx#L332-L380) - Moved location section above form
- [src/screens/home/styles/home.styles.ts:314-318](src/screens/home/styles/home.styles.ts#L314-L318) - Added selected state style

---

### 2. **Removed "Log Hours" Header**

**Before:**
```
┌────────────────────────────────┐
│ ⏰ Log Hours        Reports    │  ← REMOVED
├────────────────────────────────┤
│ 📅 Date                        │
```

**After:**
```
┌────────────────────────────────┐
│ 📅 Date                        │  ← Starts immediately
```

**Benefit:** Saved ~5% vertical space

**Files Modified:**
- [app/(tabs)/index.tsx:361](app/(tabs)/index.tsx#L361) - Removed formHeader section

---

### 3. **Harmonized Font Sizes & Weights**

**Problem:** Times were too large (22px/26px) vs labels (14px) → disproportionate. Entry and Exit had different font weights.

**Solution:**

| Element | Before (v2.0) | After (v2.1) | Change |
|---------|---------------|--------------|--------|
| Entry time | 22px bold | **18px semibold (600)** | -4px, consistent weight |
| Exit time | 26px heavy (700) | **18px semibold (600)** | -8px, consistent weight |
| Labels | 14-16px | **15-16px** | Consistent |
| Break | 24px | **18px** (dropdown) | -6px |
| Total | 18px bold badge | **15px normal text** | Simplified |

**Result:** Both time pickers now have **identical styling** - same size (18px), same weight (600), same padding, same border radius.

**Files Modified:**
- [src/screens/home/styles/home.styles.ts:573-610](src/screens/home/styles/home.styles.ts#L573-L610) - Font size and weight harmonization

---

### 4. **Break Input → Dropdown**

**Before:** Text input (requires typing)
**After:** Dropdown with presets + Custom option

**Options:**
- None (0 min)
- 15 min
- 30 min
- 45 min
- 60 min
- Custom... (opens text input)

**Benefits:**
- Faster selection for common values
- Less typing
- Cleaner UI (smaller footprint)

**Files Modified:**
- [app/(tabs)/index.tsx:444-517](app/(tabs)/index.tsx#L444-L517) - Break dropdown implementation
- [src/screens/home/styles/home.styles.ts:725-786](src/screens/home/styles/home.styles.ts#L725-L786) - Break dropdown styles

---

### 5. **Simplified Total Hours**

**Before (v2.0):**
```
┌──────────────────────────────┐
│ Total    🕐 8h 30min         │  ← Green badge with icon
└──────────────────────────────┘
```

**After (v2.1):**
```
Total: 8h 30min   ← Simple text (15px)
```

**Removed:**
- Green background container
- Success border
- Icon
- Badge wrapper

**Benefit:** Cleaner, less visual noise

**Files Modified:**
- [app/(tabs)/index.tsx:520-524](app/(tabs)/index.tsx#L520-L524) - Simplified total display
- [src/screens/home/styles/home.styles.ts:791-804](src/screens/home/styles/home.styles.ts#L791-L804) - Simple total styles

---

### 6. **"3 Most Used" Sorting Logic**

Locations in carousel are sorted by:

1. **Active session** (if user is clocked in at a location)
2. **Total hours TODAY** (descending)
3. **Alphabetical** (tiebreaker)

**Example:**
```
User has 3 locations:
- Site A: 0h today, no active session
- Site B: 3h today, no active session
- Site C: 0h today, ACTIVE SESSION

Carousel shows: [Site C] [Site B] [Site A] [+]
                 ^active  ^3h      ^0h
```

**Files Modified:**
- [src/screens/home/hooks.ts:201-275](src/screens/home/hooks.ts#L201-L275) - Sorting logic

---

### 7. **ScrollView + Flex Layout (100% Screen Coverage)**

**Problem 1:** Timer container was responsive (grows when active), causing it to overlap the bottom tab bar when session is running.
**Problem 2:** Empty space (~2cm) between timer and bottom tab bar - wasted screen space.

**Solution:** Wrapped content in ScrollView with `flexGrow: 1` + timer section with `flex: 1`

```typescript
// ScrollView with flexGrow to fill parent
<ScrollView
  style={{ flex: 1 }}
  contentContainerStyle={{ flexGrow: 1 }}
  showsVerticalScrollIndicator={false}
>
  {/* ... content ... */}

  {/* Timer section with flex: 1 to fill remaining space */}
  <Card style={timerSection}>  {/* flex: 1, minHeight: 180px */}
    {/* Timer content */}
  </Card>
</ScrollView>
```

**Changes:**
- ScrollView: `paddingBottom: 20` → `flexGrow: 1`
- Timer section: `minHeight: 120px` → `flex: 1, minHeight: 180px, marginBottom: 8px`
- Timer padding: `12px` → `16px` (more breathing room)

**Benefits:**
- ✅ Timer fills all available space (no wasted screen)
- ✅ Can scroll when timer expands (no overlap with tab bar)
- ✅ Content always occupies 100% of viewport
- ✅ Future-proof for different screen sizes

**Files Modified:**
- [app/(tabs)/index.tsx:273-276](app/(tabs)/index.tsx#L273-L276) - ScrollView with flexGrow
- [src/screens/home/styles/home.styles.ts:356-367](src/screens/home/styles/home.styles.ts#L356-L367) - Timer flex layout

---

## 📐 New Layout Proportions

| Section | v2.0 (Before) | v2.1 (After) | Change |
|---------|---------------|--------------|--------|
| Header | 5% | 5% | — |
| **Location carousel** | — | **8%** | NEW |
| **Manual entry form** | 50% | **22%** | -28% |
| Location cards (old) | 25% | **0%** | REMOVED |
| **Timer** | 25% | **~65%** (flex: 1) | +40% |

**Result:** Timer now uses **flex: 1** to fill ALL remaining space dynamically!
- Minimum height: 180px (comfortable baseline)
- Maximum: Fills to bottom of screen with 8px margin
- **100% screen coverage** - no wasted space

---

## 🎨 Visual Design Tokens

### Location Carousel
- **Normal card:** `colors.card` background, `colors.border` border
- **Selected card:** `warning + 15% opacity` background, `colors.warning` border (2px)
- **Add card:** `colors.surfaceMuted` background, dashed border

### Break Dropdown
- Background: `colors.surfaceMuted`
- Border: `colors.border`
- Font: 15px semibold
- Menu: `shadows.md` elevation

### Simplified Total
- Font: 15px normal (`colors.textSecondary`)
- Value: 15px semibold (`colors.text`)
- No background, no border, no icon

---

## 🔄 User Flow Changes

### Selecting a Location (v2.0 → v2.1)

**Before (v2.0):**
1. Tap location dropdown
2. Scroll through list
3. Tap location name
4. Dropdown closes

**After (v2.1):**
1. **Tap location card** (carousel)
2. Card highlights yellow (selected)
3. Continue filling form

**Benefit:** 1 tap instead of 3, visual feedback instant

---

### Setting Break Time (v2.0 → v2.1)

**Before (v2.0):**
1. Tap Break input (3 fields: HH, MM, unit)
2. Type numbers
3. Confirm

**After (v2.1):**
1. **Tap Break dropdown**
2. Select preset (15/30/45/60 min) OR "Custom..."
3. If custom: type number, tap away

**Benefit:** Common values = 1 tap, custom still available

---

## 📱 Responsive Behavior

- **Carousel:** Horizontal scroll if more than 5 locations
- **Selected state:** Persists across dropdowns
- **Long press:** Opens map view (preserves existing navigation)
- **Auto-sync:** Selected location syncs with `manualLocationId` state
- **ScrollView:** Content scrolls when timer expands (no overlap with tab bar)

---

## 🧪 Testing Checklist

- [ ] Location carousel shows 5 most used locations
- [ ] Active session location appears first in carousel
- [ ] Tapping card selects it (yellow highlight)
- [ ] Long pressing card navigates to map
- [ ] "+" card adds new location
- [ ] Entry time shows 18px font, semibold (600)
- [ ] Exit time shows 18px font, semibold (600) - **SAME as Entry**
- [ ] Both time pickers have identical styling
- [ ] Break dropdown shows 6 options (None, 15, 30, 45, 60, Custom)
- [ ] Custom break input opens on "Custom..." selection
- [ ] Total shows as plain text "Total: Xh Ymin"
- [ ] Timer occupies majority of screen space
- [ ] Content scrolls when timer is active (no overlap with tab bar)

---

## 📊 Comparison: v2.0 vs v2.1

| Feature | v2.0 | v2.1 |
|---------|------|------|
| Location selection | Dropdown (3 taps) | Carousel (1 tap) |
| Location visibility | Hidden until tap | Always visible (5 cards) |
| Break input | Text input | Dropdown presets |
| Font sizes | 22px/26px inconsistent | **18px/18px harmonized** |
| Font weights | Different (600/700) | **Same (600)** |
| Total display | Green badge + icon | Simple text |
| Form header | "Log Hours" + Reports link | None (removed) |
| Timer screen space | 25% | **57%** |
| Location cards (bottom) | 25% (2 cards) | 0% (removed) |
| Layout overflow | Fixed containers | **ScrollView** (responsive) |

---

## 🚀 Next Steps (Future)

1. **Swipe gestures:** Swipe carousel card left to delete
2. **Location stats:** Tap card to see weekly hours
3. **Color coding:** Show location color dot on carousel cards
4. **Accessibility:** VoiceOver labels for carousel navigation
5. **Animation:** Smooth scroll to selected card on load

---

## 📝 Files Changed Summary

### Component
- [app/(tabs)/index.tsx](app/(tabs)/index.tsx)
  - Added location carousel (lines 320-356)
  - Removed form header (line 361)
  - Removed location dropdown (lines 374-399 deleted)
  - Added break dropdown (lines 444-517)
  - Simplified total display (lines 520-524)

### Styles
- [src/screens/home/styles/home.styles.ts](src/screens/home/styles/home.styles.ts)
  - Harmonized fonts (lines 569-593)
  - Added carousel styles (lines 677-720)
  - Added break dropdown styles (lines 725-786)
  - Added simplified total styles (lines 791-804)

### Logic
- [src/screens/home/hooks.ts](src/screens/home/hooks.ts)
  - Updated locationCardsData to use TODAY's sessions (line 202-206)
  - Added sorting logic: active → hours → alphabetical (lines 261-274)

---

*Implemented: 2026-01-15*
*Version: v2.1 - Location Carousel & Simplified Layout*
*Previous: v2.0 - Enhanced Manual Entry UX*
