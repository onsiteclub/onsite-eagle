# 06 — Use Case Layer

**Status:** Implementado
**Diretorio:** `src/usecases/` (8 arquivos)

---

## Principio

Voice, UI e Secretary AI chamam os MESMOS use cases.

```
Voice "sai as 4pm"   --+
UI modal edita exit  --+--> usecases/editSession.ts --> persistence --> effects
Secretary AI corrige --+
```

Padrao: validar -> persistence -> effects -> result.

---

## SOURCE_PRIORITY

```
voice(4) > manual(3) = edited(3) > secretary(2) > gps(1) = sdk(1)
```

---

## editSession.ts

```typescript
editSession({ sessionId, changes, source, reason? }): Promise<void>
```

1. Buscar sessao
2. Check prioridade (secretary nao sobrescreve voice/manual)
3. Se secretary + reason: logar em ai_corrections
4. Aplicar changes, recalcular duration
5. rebuildDaySummary()
6. Enqueue: SYNC_NOW, UI_REFRESH

---

## createManualSession.ts

```typescript
createManualSession({ date, enterTime, exitTime, breakMinutes, locationId?, source, notes? }): Promise<string>
```

INSERT -> rebuildDaySummary -> SYNC_NOW + UI_REFRESH.

---

## deleteSession.ts

```typescript
deleteSession(sessionId): Promise<void>
```

Soft-delete -> rebuildDaySummary -> SYNC_NOW + UI_REFRESH.

---

## pauseResume.ts

```typescript
pauseSession(): Promise<void>
resumeSession(): Promise<void>
```

Pause: armazena pause_start_at no meta JSON.
Resume: calcula elapsed, soma a break_seconds.

Pos-patch: NOTIFY_PAUSED e NOTIFY_RESUMED removidos.

---

## manageFence.ts

```typescript
createFence(input): Promise<string>
updateFence(fenceId, changes): Promise<void>
deleteFence(fenceId): Promise<void>
```

- Enforce radius min 150m
- Sync com SDK (addSdkGeofence/removeSdkGeofence)
- checkAfterFenceChange() apos create/update

---

## markAbsence.ts

```typescript
markAbsence(date, type: DayType, notes?): Promise<void>
```

Se sessoes existem -> soft-delete todas. Upsert day_summary com type e total=0.

---

## generateReport.ts

```typescript
generateReport({ startDate, endDate, format, includeAISummary? }): Promise<void>
```

Agrega -> AI summary (opcional, graceful) -> Render (pdf/whatsapp/text) -> Share.

---

## undoAICorrection.ts

```typescript
undoAICorrection(date): Promise<boolean>
```

Reverte correcoes: restaura original_value, reverted=1, rebuild day_summary.
