# HELP REQUEST — Operator App Android Build

> **Date:** 2026-02-25
> **From:** Cerbero (AI assistant managing this monorepo)
> **To:** Any AI with fresh perspective
> **Goal:** Get the Operator Expo app running on a physical Android device (Samsung SM_G990W)

---

## 1. CURRENT STATUS

| Item | Status |
|------|--------|
| APK built | YES — `BUILD SUCCESSFUL in 27s` |
| APK installed on device | YES — Samsung SM_G990W via USB |
| App opens on device | YES — but shows loading/blank because no JS bundle |
| Metro serves JS bundle | **NO — this is the blocking issue** |
| Full pipeline works end-to-end | **NO** |

**The native build is done.** The problem is getting Metro bundler to serve the JavaScript bundle to the app on the device.

---

## 2. THE MONOREPO ARCHITECTURE

```
onsite-eagle/                     ← Turborepo + npm workspaces
├── package.json                  ← Root: only turbo + metro pins as devDeps
├── node_modules/                 ← Hoisted deps (React 19, RN 0.76.9, etc.)
├── apps/
│   ├── monitor/                  ← Next.js 16, React 19.2.3
│   ├── analytics/                ← Next.js 16, React 19.0.0
│   ├── dashboard/                ← Next.js 16, React 19.0.0
│   ├── auth/                     ← Next.js 16, React 19.0.0
│   ├── timekeeper/               ← Expo 52, React 18.3.1, RN 0.76.0 ← WORKS
│   ├── field/                    ← Expo 52, React 18.3.1
│   ├── inspect/                  ← Expo 52, React 18.3.1
│   ├── operator/                 ← Expo 52, React 18.3.1, RN 0.76.0 ← THIS APP
│   └── calculator/               ← Vite + Capacitor, React 18.3.1
├── packages/
│   ├── shared/                   ← Pure TS types, no deps
│   ├── timeline/                 ← Supabase timeline, depends on shared
│   ├── offline/                  ← Offline queue, peer deps only
│   └── ... (15 packages total)
└── supabase/
    └── migrations/
```

### The React Version Problem

The root `node_modules/` has React 19.x (hoisted from Next.js apps). Expo apps need React 18.3.1.
Without isolation, Metro (the Expo JS bundler) picks up React 19 from root → runtime crash.

**Solution:** Each Expo app's `metro.config.js` has `blockList` to block root React/RN and `extraNodeModules` to force local versions.

### How Expo Build Pipeline Works

```
1. expo prebuild     → Generates android/ directory (AndroidManifest, build.gradle, etc.)
2. Gradle build      → Compiles native code → APK
3. adb install       → Installs APK on connected device
4. Metro bundler     → Serves JS bundle to the app at runtime (like webpack-dev-server)

`npx expo run:android` = steps 1-4 combined
`npx expo start --dev-client` = step 4 only (app already installed)
```

**Key insight:** The APK is just a shell. The actual app logic (React components, screens, navigation) is JavaScript served by Metro over the network. Without Metro running, the app shows a blank/loading screen.

---

## 3. WHAT WE ALREADY FIXED (12 problems)

These are all SOLVED. Documenting so you don't re-investigate them.

### Problem 1: Kotlin version mismatch
```
Compose Compiler requires Kotlin 1.9.25 but found 1.9.24
```
**Fix:** Added `android.kotlinVersion=1.9.25` to `apps/operator/android/gradle.properties` and changed `build.gradle` classpath to use `$kotlinVersion`.

### Problem 2: metro-transform-worker wrong version
```
ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './src/utils/getMinifier'
is not defined by "exports" in metro-transform-worker/package.json
```
**Cause:** `metro-transform-worker@0.83.3` was hoisted from a transitive dependency (`@onsite/camera` → `expo@54`). Expo 52 needs `@expo/metro-config@0.19.12` which expects metro 0.81.x API.
**Fix:** Root `package.json` pins `metro-transform-worker@0.81.0` as devDep.

### Problem 3: metro-cache-key API change
```
metro_cache_key_1.default is not a function
```
**Cause:** `metro-cache-key@0.83.3` changed its export from `export default fn` to `export { getCacheKey }`.
**Fix:** Root `package.json` pins `metro-cache-key@0.81.0` as devDep.

### Problem 4: Metro can't resolve subpath exports
```
Unable to resolve "@onsite/timeline/data"
```
**Cause:** Metro bundler does NOT support `exports` field subpaths from package.json.
**Fix:** Import from root: `import { fn } from '@onsite/timeline'` (not `@onsite/timeline/data`).

### Problem 5: Root android/ contamination
Running `expo prebuild` from monorepo root (instead of `apps/operator/`) created a phantom `android/` directory at root and added `expo`, `react`, `react-native` to root `package.json` dependencies.
**Fix:** Deleted `android/` from root. Cleaned root `package.json`. Added `/android/` and `/ios/` to root `.gitignore`.

### Problem 6: Metro hanging (>5 minutes, no output)
After the root contamination, Metro would start but produce no output — just hang indefinitely.
**Fix:** Full clean: `rm -rf android/` (root), `rm -rf node_modules`, `npm install`, then rebuild.

### Problems 7-12: Preventive fixes
- `newArchEnabled: false` (was true, crashes with some plugins)
- React 18/19 isolation in `metro.config.js` (blockList + extraNodeModules)
- Babel config: only `babel-preset-expo`, no extra plugins
- `.env.local` with real Supabase keys (not placeholders)
- `assets/` directory with required PNGs
- Push notification registration typo fix

---

## 4. THE CURRENT BLOCKING ISSUE

### What happens

1. `npx expo run:android` from `apps/operator/` — Gradle builds successfully in 27s
2. APK installs on Samsung SM_G990W via USB
3. App opens on phone — shows Expo splash/loading screen
4. **App stays on loading screen forever** — no JS bundle arrives

### Why

The app needs Metro bundler running on the dev machine to serve the JS bundle. The problem manifests in several ways:

#### Scenario A: Metro runs inside `expo run:android`
When `expo run:android` completes the Gradle build, it should automatically start Metro. But in our experience, Metro either:
- Hangs silently (no output for 5+ minutes)
- Starts but the phone can't connect to it

#### Scenario B: Metro started separately
Running `npx expo start --dev-client` from `apps/operator/` should start Metro independently. But:
- It starts and shows the QR code / URL
- The phone (connected via USB) doesn't connect to it
- Or it connects but then the bundle fails to load

### What we haven't tried / investigated

1. **Network connectivity:** Is the phone actually able to reach the dev machine on port 8081?
   - Are they on the same WiFi network?
   - Is Windows Firewall blocking port 8081?
   - Should we use `adb reverse tcp:8081 tcp:8081` to tunnel over USB?

2. **Metro URL configuration:** Does the app know where to find Metro?
   - The dev server URL should be `http://10.0.2.2:8081` for emulator or `http://<local-ip>:8081` for physical device
   - For USB: `adb reverse tcp:8081 tcp:8081` makes `localhost:8081` on phone point to PC

3. **Port conflicts:** Something else might be on port 8081
   - Previous Metro instances not killed properly
   - Another dev server

4. **Metro process ownership:** When Claude (AI) runs Metro in a background shell, the process is attached to that shell. When the shell closes or times out, Metro dies. The user needs to run Metro in THEIR OWN terminal.

---

## 5. KEY FILES

### apps/operator/package.json
```json
{
  "name": "@onsite/operator",
  "version": "0.1.0",
  "private": true,
  "main": "expo-router/entry",
  "dependencies": {
    "@onsite/offline": "*",
    "@onsite/shared": "*",
    "@onsite/timeline": "*",
    "@react-native-async-storage/async-storage": "1.23.1",
    "@react-native-community/netinfo": "11.4.1",
    "date-fns": "^4.1.0",
    "@supabase/supabase-js": "^2.93.3",
    "expo": "~52.0.0",
    "expo-constants": "~17.0.0",
    "expo-device": "~7.0.0",
    "expo-linking": "~7.0.0",
    "expo-notifications": "~0.29.11",
    "expo-router": "~4.0.0",
    "expo-status-bar": "~2.0.0",
    "react": "18.3.1",
    "react-native": "0.76.0",
    "react-native-web": "~0.19.13",
    "react-dom": "18.3.1",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.0.0",
    "react-native-gesture-handler": "~2.20.0",
    "react-native-svg": "15.8.0"
  },
  "devDependencies": {
    "@babel/core": "^7.25.0",
    "@expo/metro-config": "~0.19.0",
    "@types/react": "~18.3.0",
    "typescript": "^5.3.0"
  }
}
```

### apps/operator/metro.config.js
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Block React 19 + root RN from being bundled
const rootReact = path.resolve(monorepoRoot, 'node_modules', 'react')
  .replace(/[\\]/g, '\\\\');
const rootReactDom = path.resolve(monorepoRoot, 'node_modules', 'react-dom')
  .replace(/[\\]/g, '\\\\');
const rootRN = path.resolve(monorepoRoot, 'node_modules', 'react-native')
  .replace(/[\\]/g, '\\\\');

config.resolver.blockList = [
  new RegExp(`${rootReact}[\\\\/].*`),
  new RegExp(`${rootReactDom}[\\\\/].*`),
  new RegExp(`${rootRN}[\\\\/].*`),
];

config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};

module.exports = config;
```

### apps/operator/babel.config.js
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

### apps/operator/app.json
```json
{
  "expo": {
    "name": "OnSite Operator",
    "slug": "onsite-operator",
    "version": "1.0.0",
    "newArchEnabled": false,
    "android": {
      "package": "com.onsiteclub.operator"
    },
    "plugins": ["expo-router"]
  }
}
```

### Root package.json (relevant parts)
```json
{
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "metro-cache-key": "^0.81.0",
    "metro-transform-worker": "0.81.0",
    "turbo": "^2.3.0"
  },
  "packageManager": "npm@10.0.0",
  "engines": { "node": ">=20.0.0" }
}
```

### Root .gitignore (relevant lines)
```
apps/*/android/
apps/*/ios/
/android/
/ios/
```

---

## 6. ENVIRONMENT

| Item | Value |
|------|-------|
| OS | Windows 11 Home 10.0.26200 |
| Shell | Git Bash (Unix-style commands work) |
| Node | >=20 |
| npm | 10.0.0 |
| Device | Samsung SM_G990W (Android), connected via USB |
| USB debugging | Enabled (adb sees the device) |
| Android SDK | compileSdk 35, targetSdk 34, minSdk 24 |
| Kotlin | 1.9.25 |
| NDK | 26.1.10909125 |
| Expo SDK | 52 |
| React | 18.3.1 (local to operator) |
| React Native | 0.76.0 (local) / 0.76.9 (root, blocked by metro) |

---

## 7. REFERENCE: TIMEKEEPER WORKS

The Timekeeper app (`apps/timekeeper/`) uses the same Expo 52 + React 18.3.1 stack and builds + runs successfully on the same Samsung device. Its metro.config.js is similar but only blocks root `react-native` (not `react` or `react-dom`).

The Timekeeper's successful pipeline:
```bash
cd apps/timekeeper
npx expo run:android          # builds + installs APK
# After APK installed, in same or new terminal:
npx expo start --dev-client   # starts Metro, phone connects, app loads
```

The key difference: Timekeeper has been built many times and its `android/` directory is committed to git. Operator's `android/` was freshly generated via `expo prebuild` on 2026-02-25.

---

## 8. SUGGESTED INVESTIGATION PATH

1. **First: verify Metro actually starts and serves**
   ```bash
   cd apps/operator
   npx expo start --dev-client -c
   ```
   - Does it print the QR code and URL?
   - Can you open `http://localhost:8081` in a browser on the same machine?
   - If YES → Metro is fine, problem is phone-to-PC connectivity

2. **Second: set up USB tunneling**
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
   This makes `localhost:8081` on the phone route to the PC's port 8081 over USB.
   This is the most reliable method for physical devices.

3. **Third: check if bundle loads via browser**
   Open in PC browser:
   ```
   http://localhost:8081/index.bundle?platform=android&dev=true&minify=false
   ```
   If this returns JavaScript → Metro is working. Problem is device connectivity.
   If this hangs or errors → Metro has a bundling problem.

4. **Fourth: check Windows Firewall**
   Windows Firewall may block incoming connections on 8081.
   Either add a firewall rule or use `adb reverse` (step 2) to bypass network entirely.

5. **Fifth: check for port conflicts**
   ```bash
   netstat -ano | findstr :8081
   ```
   Kill any process already on 8081 before starting Metro.

6. **Sixth: full nuclear clean + rebuild**
   ```bash
   # From monorepo root
   rm -rf node_modules
   npm install

   # From apps/operator
   cd apps/operator
   rm -rf node_modules/.cache
   rm -rf android/app/build
   npx expo start --dev-client -c
   ```

---

## 9. THINGS TO ABSOLUTELY NOT DO

These are mistakes we already made. Please don't repeat them:

1. **DO NOT** run any expo command from the monorepo root. Always `cd apps/operator` first.
2. **DO NOT** add `transform-inline-environment-variables` to babel config.
3. **DO NOT** set `newArchEnabled: true` in app.json.
4. **DO NOT** import from package subpaths like `@onsite/timeline/data` — Metro can't resolve them.
5. **DO NOT** add `react`, `react-native`, or `expo` to root package.json dependencies.
6. **DO NOT** delete `metro-cache-key` or `metro-transform-worker` from root devDependencies — they're pinned there intentionally to override bad hoisted versions.

---

## 10. TIMELINE OF SESSION (2026-02-25)

| Time | Action | Result |
|------|--------|--------|
| Start | Read codebase, understand operator v2 redesign | OK |
| +20min | Fix metro.config.js, babel, app.json preventively | OK |
| +35min | First `expo run:android` → Kotlin version error | FAIL |
| +40min | Fix gradle.properties + build.gradle Kotlin | OK |
| +45min | Second `expo run:android` → BUILD SUCCESSFUL 27s | OK |
| +50min | APK installed on SM_G990W | OK |
| +55min | Metro started in background → hanging | FAIL |
| +60min | Discovered root android/ contamination | Root cause |
| +70min | Cleaned root, killed processes, retried | Partial |
| +80min | Metro starts but phone doesn't load bundle | FAIL |
| +90min | Port 8081 conflict from previous Metro | Fixed |
| +100min | Retried — still hanging/not loading | FAIL |
| +105min | User: "travou de novo, faz documento pra outra IA" | Here we are |

---

## 11. SUMMARY FOR THE REVIEWING AI

**What works:** Native build (Gradle) compiles and installs APK successfully.

**What doesn't work:** Metro bundler either hangs, or starts but the phone can't reach it.

**Most likely root causes (in order of probability):**
1. **adb reverse not configured** — physical device can't reach localhost:8081 on Windows
2. **Windows Firewall** blocking port 8081
3. **Metro process dying** when started from AI's background shell (process lifecycle issue)
4. **Stale Metro cache** or corrupted watchman state
5. **Something in the monorepo watchFolders** causing Metro to scan too many files and hang

**What the user needs to do in their own terminal:**
```bash
cd c:\Dev\Onsite-club\onsite-eagle\apps\operator
adb reverse tcp:8081 tcp:8081
npx expo start --dev-client -c
```

Then shake the phone or open the dev menu to enter the Metro URL if it doesn't auto-connect.

---

## 12. FIX APPLIED (2026-02-25, after external review)

An external AI identified the most likely root cause: `watchFolders = [monorepoRoot]` makes Metro watch the ENTIRE monorepo on Windows, including `.next/`, `.turbo/`, `dist/`, `build/`, and all node_modules. On Windows, file watchers are slow — this causes Metro to hang during initial bundling.

### Changes made to `apps/operator/metro.config.js`:

1. **watchFolders**: Changed from `[monorepoRoot]` (everything) to only the 3 packages Operator imports:
   - `packages/shared`
   - `packages/timeline`
   - `packages/offline`

2. **blockList**: Added patterns to block Next.js/Turbo build artifacts:
   - `.next/`, `dist/`, `build/`, `.turbo/`, `coverage/`

3. **disableHierarchicalLookup**: Set to `true` to prevent Metro from walking up the directory tree.

### Commands to test (user must run in their own terminal):

```bash
# Terminal 1: Kill anything on 8081, then start Metro
cd /c/Dev/Onsite-club/onsite-eagle/apps/operator
npx expo start --dev-client --localhost --clear --port 8081

# Terminal 2: Set up USB tunnel + verify
adb reverse tcp:8081 tcp:8081
adb reverse tcp:19000 tcp:19000
curl http://localhost:8081/status
# Expected: "packager-status:running"
```

---

*Document created by Cerbero — 2026-02-25*
*Updated after external AI review — 2026-02-25*
*Monorepo: onsite-eagle | App: operator | Device: Samsung SM_G990W*
