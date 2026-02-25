# 09 — Monitoring, Logging & Retention

**Status:** Implementado
**Arquivos:** `src/monitoring/sentry.ts` (78), `errorCapture.ts` (109), `sdkDebug.ts` (100)

---

## Sentry — Crash Reporting

Primeiro no boot. Antes de tudo.

```typescript
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  enableAutoSessionTracking: true,
  attachStacktrace: true,
});
```

Captura automatica: unhandled exceptions, native crashes, ANRs, session health.

### Logger -> Sentry Sink

```typescript
logger.addSink((entry) => {
  Sentry.addBreadcrumb({
    category: entry.tag.toLowerCase(),
    message: entry.message,
    level: mapLevel(entry.level),
    data: entry.data,
  });
});
```

User context: setSentryUser(userId, email) / clearSentryUser().

---

## @onsite/logger

Ring buffer 200 entries + sink system.

```typescript
logger.debug/info/warn/error(tag, msg, data?)
logger.getEntries()
logger.clear()
logger.addSink(sink)
```

Tags: ENTER, EXIT, HEARTBEAT, WATCHDOG, SESSION, SYNC, AI, VOICE, REPORT, ERROR, BOOT, AUTH, GPS, DB, UI, NOTIFY.

- Sanitiza sensiveis (password, token, secret, apiKey)
- Console em __DEV__
- NAO persiste em disco (apenas memoria)

---

## Error Capture (monitoring/errorCapture.ts)

```typescript
captureError(type, message, context?): Promise<void>
captureException(error, context?): Promise<void>
```

Flow: INSERT error_log (SQLite) -> Sentry -> logger.error().

---

## SDK Debug (monitoring/sdkDebug.ts)

verifySdkState(): enabled, trackingMode=1, stopOnTerminate=false, startOnBoot=true, GPS=Always(3).
getSdkLog(): 3 dias nativos. emailSdkLog(): email direto do device.
toggleDebugSounds(enabled): BackgroundGeolocation.setConfig({ debug }).

Debug sounds: blip (location), doodly-doo (aggressive), beeeeeep (stationary), beep-beep-beep (geofence).

---

## Data Retention

### Local (SQLite)

| Tabela | Retencao |
|--------|----------|
| work_sessions | Indefinido (soft-deleted > 90d) |
| day_summary | Indefinido |
| geofence_locations | Indefinido |
| ai_corrections | 90d (synced) |
| geofence_events | 30d (synced) |
| location_audit | 90d (synced) |
| error_log | 14d (synced) |
| analytics_daily | 30d (synced) |
| effects_queue done | 7d |

### Cloud (Supabase)

| Tabela | Retencao |
|--------|----------|
| tmk_sessions | 2 anos (legal) |
| tmk_day_summary | 2 anos |
| tmk_geofences | Indefinido |
| tmk_corrections | 1 ano |
| tmk_events | 1 ano |
| tmk_audit | 1 ano (disputas) |
| tmk_errors | 6 meses |

Cleanup: boot (se > 24h) + midnight sync.
