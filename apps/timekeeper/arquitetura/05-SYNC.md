# 05 — Sync

**Status:** Implementado (pos-patch)
**Arquivos:** `src/sync/syncEngine.ts` (173), `mapping.ts` (137), `upload.ts` (182), `download.ts` (172)

---

## Estrategia

SQLite e rei. Supabase e backup + multi-device + AI. App funciona 100% offline.

---

## Direcao por Tabela (pos-patch)

| Local | Supabase | Direcao | Notas |
|-------|----------|---------|-------|
| work_sessions | tmk_sessions | Bidirecional | Core data |
| **day_summary** | **tmk_day_summary** | **Upload only** | Pos-patch |
| geofence_locations | tmk_geofences | Bidirecional | Multi-device |
| ai_corrections | tmk_corrections | Upload only | Audit |
| geofence_events | tmk_events | Upload only | Audit |
| location_audit | tmk_audit | Upload only | GPS proof |
| error_log | tmk_errors | Upload only | Debug |
| ~~analytics_daily~~ | ~~tmk_analytics~~ | **REMOVIDO** | Dead code |

**Pos-patch:** day_summary era bidirecional. Agora upload-only. Cada device reconstroi de work_sessions.

---

## Column Mapping (mapping.ts)

Unico rename: day_summary.date -> tmk_day_summary.work_date

7 tabelas em SYNC_TABLES. analytics_daily removido pos-patch.

---

## Sync Flow (syncEngine.ts)

```typescript
class OfflineError extends Error {}

syncNow():
  if (isSyncing) return null      // Mutex
  if (!isOnline()) throw new OfflineError()  // Pos-patch: throw

  1. UPLOAD — todas as tabelas (synced_at IS NULL)
  2. UPLOAD TOMBSTONES — soft-deleted + synced
  3. DOWNLOAD — apenas bidirecionais (work_sessions, geofence_locations)
  4. REBUILD — day_summary para datas afetadas pelo download
  5. CLEANUP
```

### isOnline() check

SELECT simples no Supabase. Falha = offline.

### Post-download rebuild

Apos baixar work_sessions: busca datas com synced_at recente -> rebuildDaySummary() para cada.

---

## Upload (upload.ts)

```
uploadTable(): SELECT WHERE synced_at IS NULL -> mapLocalToRemote -> supabase.upsert -> SET synced_at
uploadTombstones(): deleted_at NOT NULL AND synced_at NOT NULL -> upsert remote -> hard DELETE local
```

---

## Download (download.ts)

```
downloadTable(): MAX(synced_at) -> supabase.select WHERE updated_at > lastSync
  -> Para cada: !local = INSERT, local + shouldOverwrite = UPDATE, else skip
```

---

## Conflict Resolution (SOURCE_PRIORITY)

```
voice: 4, manual: 3, edited: 3, secretary: 2, gps: 1, sdk: 1
```

shouldOverwrite: higher priority wins. Same priority: newer updated_at wins.

---

## Soft Delete Propagation

1. Local delete: SET deleted_at + synced_at=NULL
2. Upload: envia com deleted_at
3. Tombstone: upsert remote + hard DELETE local
4. Download: se remote deleted_at -> aplica
5. Cleanup: hard delete > 90d

---

## OfflineError Handling (pos-patch)

| Erro | Tratamento |
|------|-----------|
| OfflineError | Backoff 1min |
| Server error | Backoff progressivo [1,5,15,60]min |
| Mutex busy | null -> drain marca done |

SYNC_NOW = critical, nunca 'failed'.
