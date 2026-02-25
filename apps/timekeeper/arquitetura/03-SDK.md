# 03 — SDK (Transistorsoft Background Geolocation)

**Status:** Implementado
**Arquivos:** `src/sdk/bgGeo.ts` (214 linhas), `src/sdk/headless.ts` (95 linhas), `src/sdk/modes.ts` (36 linhas)

---

## Config Definitiva (bgGeo.ts)

```typescript
const SDK_CONFIG = {
  locationAuthorizationRequest: 'Always',
  disableLocationAuthorizationAlert: true,
  stopOnTerminate: false,
  startOnBoot: true,
  enableHeadless: true,
  foregroundService: true,
  desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
  distanceFilter: 200,
  stationaryRadius: 150,
  geofenceModeHighAccuracy: true,
  geofenceInitialTriggerEntry: true,
  heartbeatInterval: 60,
  logLevel: BackgroundGeolocation.LOG_LEVEL_WARNING,
  logMaxDays: 3,
  debug: false,
  reset: false,   // true DESTROI toda config a cada boot
};
```

---

## Mode Switching (modes.ts)

```typescript
ACTIVE_MODE = { distanceFilter: 10, stationaryRadius: 25, stopTimeout: 5 }
IDLE_MODE   = { distanceFilter: 200, stationaryRadius: 150 }
```

ENTER -> ACTIVE_MODE. confirmExit -> IDLE_MODE. Via effect SWITCH_GPS_MODE.

---

## Listeners (bgGeo.ts)

- onGeofence -> normalizeSdkEvent() -> engine.handleEvent()
- onHeartbeat -> watchdog.onHeartbeat()
- onProviderChange -> logger.info()

### Inicializacao

1. BackgroundGeolocation.ready(SDK_CONFIG)
2. BackgroundGeolocation.start()  ← SEMPRE start(), NUNCA startGeofences()
3. Registrar listeners
4. checkRecovery()

### Geofence Registration

addSdkGeofence(id, lat, lng, radius): radius = Math.max(radius, 150). Min 150m enforced.

---

## Headless Mode (headless.ts) — Android Only

```typescript
BackgroundGeolocation.registerHeadlessTask(async ({ name, params }) => {
  await ensureInitialized();  // initDatabase() + lazy imports
  if (name === 'geofence') await handleEvent(normalizeHeadlessEvent(params));
  if (name === 'heartbeat') await onHeartbeat();
});
```

- ensureInitialized(): initDatabase (NAO initAuthCore). JS tem ~30s de vida.
- Import estatico obrigatorio em _layout.tsx: `import '../src/sdk/headless'`

---

## Watchdog (tracking/watchdog.ts, 123 linhas)

Heartbeat nativo 60s alimenta o watchdog.

```
onHeartbeat():
  1. checkExpiredCooldown()
  2. drain()
  3. checkSessionGuard()
  4. Se nao TRACKING -> return
  5. GPS check: getCurrentPosition(samples:1, timeout:10)
     - distance > radius -> outsideCount++
     - outsideCount >= 2 -> synthetic EXIT (watchdog)
     - distance <= radius -> outsideCount = 0
  6. GPS falha -> conservador (nao conta)
```

2 checks consecutivos: GPS drift perto da borda. Tempo minimo exit: ~2.5 min.

---

## Recovery (tracking/recovery.ts, 207 linhas)

### checkRecovery() — apos start()

```
Step 1: DB check para sessao orfao (exit_at IS NULL)
  Se existe -> rehydrate active_tracking (TRACKING, session_id, location_id)
  -> NAO cria nova sessao, restaura existente. Return.

Step 2: Se nenhum orfao + IDLE:
  -> GPS check -> para cada fence ativo:
     distance < radius -> synthetic ENTER (confidence=0.5)
```

Pos-patch: Recovery NUNCA fecha orfaos. Sempre rehydrata primeiro.

### checkAfterFenceChange()

5s delay -> GPS check -> dentro + nao tracking = ENTER. Fora + tracking = EXIT (accuracy < 50m).
Post-start NUNCA injeta EXIT.

---

## Licenca

- Transistorsoft license ($399, comprada)
- Bundle ID: com.onsiteclub.timekeeper
- JWT string no app.json (NAO objeto)

---

## EAS Build

```bash
eas build --platform android --profile development  # Dev APK
eas build --platform android --profile production    # Release AAB
```

### Permissoes Android

ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, ACCESS_BACKGROUND_LOCATION,
FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION, POST_NOTIFICATIONS,
RECEIVE_BOOT_COMPLETED, ACTIVITY_RECOGNITION

### Permissoes iOS

NSLocationAlwaysAndWhenInUseUsageDescription, NSLocationWhenInUseUsageDescription,
NSMotionUsageDescription, UIBackgroundModes: [location, fetch, processing]

---

## Platform Gotchas

### Android

| Issue | Mitigacao |
|-------|-----------|
| Samsung/Xiaomi battery opt | Detectar + prompt |
| Doze mode delays 60s->180s | Aceitar erro. Watchdog compensa |
| Android 14+ foreground service | Tipo location |
| POST_NOTIFICATIONS (13+) | Runtime permission |

### iOS

| Issue | Mitigacao |
|-------|-----------|
| Sem Always = processo morto | locationAuthorizationRequest: 'Always' |
| Core Location mais confiavel | Menos watchdog |

---

## Debug Tools

| Som | Significado |
|-----|-------------|
| "blip" | Location recorded |
| "doodly-doo" | Aggressive tracking |
| "beeeeeep" | Stationary state |
| "beep-beep-beep" | Geofence crossing |

verifySdkState(): enabled, trackingMode=1, stopOnTerminate=false, startOnBoot=true, GPS=Always(3).
emailSdkLog(): Email 3 dias de logs nativos.
