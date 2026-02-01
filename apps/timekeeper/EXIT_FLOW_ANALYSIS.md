# 🔍 FLUXO COMPLETO DE SAÍDA (EXIT) - OnSite Timekeeper

## 📍 PONTO 1: Evento Nativo (Sistema Operacional)

**Quando:** Você sai fisicamente da geofence (GPS detecta que saiu do círculo)

**Arquivo:** Sistema iOS/Android → Expo Location

**O que acontece:**
- O sistema operacional detecta que você saiu da região monitorada
- Dispara um evento nativo de geofence
- Expo Location TaskManager recebe o evento

---

## 📍 PONTO 2: Task Manager (backgroundTasks.ts)

**Arquivo:** `src/lib/backgroundTasks.ts` (linha 102-121)

```typescript
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  const eventData = data as {
    eventType: Location.GeofencingEventType;
    region: Location.LocationRegion
  };

  // SAÍDA DETECTADA
  if (eventData.eventType === Location.GeofencingEventType.Exit) {
    await processGeofenceEvent({
      region: eventData.region,
      state: Location.GeofencingRegionState.Outside,  // ← Marca como OUTSIDE
    });
  }
});
```

**Task Name:** `'onsite-geofence'` (definido em `backgroundTypes.ts`)

**O que acontece:**
- Recebe o evento EXIT do sistema
- Converte para formato interno: `{ region, state: Outside }`
- Chama `processGeofenceEvent()` de `geofenceLogic.ts`

---

## 📍 PONTO 3: Processamento do Evento (geofenceLogic.ts)

**Arquivo:** `src/lib/geofenceLogic.ts` (linha 287-373)

```typescript
export async function processGeofenceEvent(event: InternalGeofenceEvent): Promise<void> {
  const { region, state } = event;
  const regionId = region.identifier ?? 'unknown';
  const eventType = state === Location.GeofencingRegionState.Inside ? 'enter' : 'exit';

  // 1. BLOQUEIO: Verifica se está reconfigurando
  if (isReconfiguring) {
    queueEventDuringReconfigure(event);
    return;  // ❌ PARA AQUI se estiver reconfigurando fences
  }

  // 2. BLOQUEIO: Deduplicação (10 segundos)
  if (isDuplicateEvent(regionId, eventType)) {
    logger.warn('pingpong', `🚫 DUPLICATE event ignored: EXIT - ${regionId}`);
    return;  // ❌ PARA AQUI se exit duplicado em 10s
  }

  // 3. Obtém informações da fence do cache
  const fence = fenceCache.get(regionId);
  const fenceName = fence?.name || 'Unknown';

  // 4. Captura GPS atual (para ping-pong tracking)
  let currentLocation: Location.LocationObject | null = null;
  try {
    currentLocation = await Location.getLastKnownPositionAsync({
      maxAge: 10000,
      requiredAccuracy: 100,
    });
  } catch {
    logger.warn('pingpong', 'Could not get GPS for ping-pong log');
  }

  // 5. Log de ping-pong (se tiver GPS)
  if (currentLocation && fence) {
    await logPingPongEvent({
      type: 'exit',
      fenceId: regionId,
      fenceName,
      timestamp: Date.now(),
      distance: calculateDistance(...),
      radius: fence.radius,
      effectiveRadius: fence.radius * 1.3,
      margin: effectiveRadius - distance,
      gpsAccuracy: currentLocation.coords.accuracy,
      source: 'geofence',
    });
  }

  // 6. Log do evento
  logger.info('geofence', `📍 Geofence exit: ${fenceName}`);

  // 7. CHAMA O CALLBACK REGISTRADO
  const geofenceCallback = getGeofenceCallback();
  if (geofenceCallback) {
    geofenceCallback({
      type: 'exit',  // ← TIPO: EXIT
      regionIdentifier: regionId,
      timestamp: Date.now(),
    });
  }
}
```

**Possíveis Bloqueios AQUI:**
- ❌ **Reconfigurando:** Se `isReconfiguring === true`, evento vai pra fila
- ❌ **Evento Duplicado:** Se já processou EXIT nos últimos 10 segundos, ignora
- ⚠️ **Callback Não Registrado:** Se `geofenceCallback === null`, nada acontece

---

## 📍 PONTO 4: Callback (bootstrap.ts)

**Arquivo:** `src/lib/bootstrap.ts` (linha 49-57)

```typescript
function handleGeofenceEvent(event: {
  type: 'enter' | 'exit';
  regionIdentifier: string;
  timestamp: number
}): void {
  logger.info('geofence', `🎯 Geofence event: ${event.type} @ ${event.regionIdentifier}`);

  // Roteia para locationStore
  const locationStore = useLocationStore.getState();
  locationStore.handleGeofenceEvent(event);
}

// Registrado em initializeListeners()
setGeofenceCallback(handleGeofenceEvent);
```

**O que acontece:**
- Recebe o evento: `{ type: 'exit', regionIdentifier: 'abc123', timestamp: ... }`
- Log: `🎯 Geofence event: exit @ abc123`
- Chama `locationStore.handleGeofenceEvent(event)`

**Possível Bloqueio AQUI:**
- ⚠️ **Callback Não Registrado:** Se `bootstrap.ts` não chamou `initializeListeners()`

---

## 📍 PONTO 5: Location Store (locationStore.ts)

**Arquivo:** `src/stores/locationStore.ts` (linha 824-890)

```typescript
handleGeofenceEvent: async (event) => {
  const userId = useAuthStore.getState().getUserId();
  if (!userId) {
    logger.warn('geofence', 'Cannot handle event: no userId');
    return;  // ❌ BLOQUEIO: Sem userId
  }

  // Atualiza currentFenceId
  if (event.type === 'exit') {
    const current = get().currentFenceId;
    set({
      lastGeofenceEvent: event,
      currentFenceId: current === event.regionIdentifier ? null : current
    });
    // ← currentFenceId vai para NULL se estava nesta fence
  }

  // Busca location no banco
  const location = await getLocationById(event.regionIdentifier);
  if (!location) {
    logger.warn('geofence', `Location not found: ${event.regionIdentifier}`);
    return;  // ❌ BLOQUEIO: Location não existe no DB
  }

  logger.info('geofence', `📍 Geofence exit: ${location.name}`);

  // Captura GPS para audit
  let coords: LocationResult | null = null;
  try {
    coords = await getCurrentLocation();
  } catch (e) {
    logger.warn('geofence', 'Could not get GPS for audit');
  }

  // Track no analytics
  await trackGeofenceTrigger(userId, coords?.accuracy ?? null);

  try {
    const sessionFlow = useWorkSessionStore.getState();
    const payloadCoords = coords ? {
      latitude: coords.coords.latitude,
      longitude: coords.coords.longitude,
      accuracy: coords.accuracy ?? undefined,
    } : undefined;

    // CHAMA WORKSESSIONSTORE
    if (event.type === 'exit') {
      await sessionFlow.handleGeofenceExit(
        location.id,           // locationId
        location.name,         // locationName
        payloadCoords          // GPS coords
      );
    }
  } catch (error) {
    logger.error('geofence', 'Error handling geofence event', { error: String(error) });
    await captureGeofenceError(error as Error, { ... });
  }
}
```

**Possíveis Bloqueios AQUI:**
- ❌ **Sem UserId:** Se `useAuthStore.getUserId()` retorna `null`
- ❌ **Location Não Existe:** Se `getLocationById()` retorna `null`
- ❌ **Erro no Try/Catch:** Se `sessionFlow.handleGeofenceExit()` lançar exceção

---

## 📍 PONTO 6: Work Session Store (workSessionStore.ts)

**Arquivo:** `src/stores/workSessionStore.ts` (linha 209-210)

```typescript
handleGeofenceExit: async (locationId, locationName, coords) => {
  await handleGeofenceExitLogic(get, set, locationId, locationName, coords);
}
```

**O que acontece:**
- Delega para `sessionHandlers.ts`
- Passa `get` e `set` do Zustand store

---

## 📍 PONTO 7: Exit Logic (sessionHandlers.ts) - CRÍTICO ⚠️

**Arquivo:** `src/stores/sessionHandlers.ts` (linha 236-384)

```typescript
export async function handleGeofenceExitLogic(
  get: GetState,
  set: SetState,
  locationId: string,
  locationName: string | null,
  coords?: Coordinates & { accuracy?: number }
): Promise<void> {

  // ==============================
  // BLOQUEIO #1: BOOT GATE
  // ==============================
  if (!isBootReady()) {
    queueEvent({
      type: 'exit',
      locationId,
      locationName,
      coords,
      timestamp: Date.now(),
    });
    return;  // ❌ PARA AQUI - Evento vai pra fila
  }

  // Resolve location name se for null
  const resolvedName = (locationName && locationName !== 'Unknown' && locationName !== 'null')
    ? locationName
    : resolveLocationName(locationId);

  const { pendingAction, pauseState, skippedToday } = get();

  // ==============================
  // BLOQUEIO #2: EXIT DUPLICADO
  // ==============================
  if (pendingAction?.type === 'exit' && pendingAction.locationId === locationId) {
    logger.debug('session', 'Duplicate exit ignored (already pending)', { locationId });
    return;  // ❌ PARA AQUI - Já existe exit pendente
  }

  // Busca timeout das settings
  const settings = useSettingsStore.getState();
  const EXIT_TIMEOUT = settings.getExitTimeoutMs();  // default: 15000ms (15s)
  const EXIT_ADJUSTMENT = settings.getExitAdjustment();  // default: 5 min

  logger.info('session', `🚶 GEOFENCE EXIT: ${resolvedName}`, { locationId });
  // ← VOCÊ DEVERIA VER ESTE LOG

  // Limpa vigilance mode se existir
  clearVigilanceInterval();

  // Limpa skipped today para esta location
  if (skippedToday.includes(locationId)) {
    removeFromSkippedToday(locationId);
    set({ skippedToday: skippedToday.filter(id => id !== locationId) });
  }

  // Reset lastProcessedEnterLocationId
  set({ lastProcessedEnterLocationId: null });

  // ==============================
  // BLOQUEIO #3: CANCELA ENTRY PENDENTE
  // ==============================
  if (pendingAction?.type === 'enter' && pendingAction.locationId === locationId) {
    logger.info('session', '❌ Canceling pending enter - user left');
    await clearPendingAction(pendingAction);
    set({ pendingAction: null });
    return;  // ❌ PARA AQUI - Cancelou entry, não faz exit
  }

  // ==============================
  // BLOQUEIO #4: SEM SESSÃO ATIVA ⚠️⚠️⚠️
  // ==============================
  const recordStore = useRecordStore.getState();
  const activeSession = recordStore.currentSession;

  if (!activeSession || activeSession.location_id !== locationId) {
    logger.debug('session', 'No active session at this location');
    return;  // ❌ PARA AQUI - Sem sessão rodando
    // ← ESTE É O MAIS PROVÁVEL
  }

  // ==============================
  // BLOQUEIO #5: SESSÃO PAUSADA
  // ==============================
  if (pauseState?.locationId === locationId) {
    logger.info('session', '⏸️ Exit during pause - countdown continues');
    return;  // ❌ PARA AQUI - Timer pausado continua
  }

  // ==============================
  // 🎯 CRIAR O TIMEOUT DE AUTO-STOP
  // ==============================

  // Mostra notificação de exit
  const notificationId = await showExitNotification(
    locationId,
    resolvedName,
    settings.exitTimeoutSeconds,  // 15 segundos
    settings.exitAdjustmentMinutes  // -5 minutos
  );

  // CRIA O TIMEOUT (15 segundos)
  const timeoutId = setTimeout(async () => {
    // ==============================
    // BLOQUEIO #6: GPS HYSTERESIS
    // ==============================
    const userId = useAuthStore.getState().getUserId();
    if (userId) {
      try {
        const { getCurrentLocation } = await import('../lib/location');
        const location = await getCurrentLocation();

        if (location) {
          const { isInside } = await checkInsideFence(
            location.coords.latitude,
            location.coords.longitude,
            userId,
            true,  // ← useHysteresis = radius × 1.3
            'geofence',
            location.accuracy ?? undefined
          );

          if (isInside) {
            logger.info('session', '🛡️ AUTO END CANCELLED - Still inside fence (hysteresis)');
            await clearPersistedPending();
            set({ pendingAction: null });

            // Inicia vigilance mode (checa cada 60s por 5 min)
            startVigilanceMode(get, set, locationId, userId);
            return;  // ❌ PARA AQUI - Vigilance mode ativado
          }
        }
      } catch (error) {
        logger.warn('session', 'GPS check failed, proceeding with exit', { error: String(error) });
      }
    }

    // ==============================
    // ✅ FINALMENTE: PARA O CRONÔMETRO
    // ==============================
    logger.info('session', `⏱️ AUTO END (${settings.exitTimeoutSeconds}s timeout) with ${settings.exitAdjustmentMinutes} min adjustment`);
    // ← VOCÊ DEVERIA VER ESTE LOG APÓS 15s

    const recordStore = useRecordStore.getState();
    await recordStore.registerExitWithAdjustment(
      locationId,
      coords,
      EXIT_ADJUSTMENT  // -5 minutos
    );

    await clearPersistedPending();
    set({ pendingAction: null });
  }, EXIT_TIMEOUT);  // ← 15000ms

  // Persiste pending no AsyncStorage (para heartbeat verificar TTL)
  const persistedPending = createExitPending(
    locationId,
    resolvedName,
    notificationId,
    EXIT_TIMEOUT,
    coords
  );
  persistPending(persistedPending);

  // Salva pending action no state
  set({
    pendingAction: createPendingAction(
      'exit',
      locationId,
      resolvedName,
      notificationId,
      timeoutId,  // ← ID do setTimeout
      Date.now(),
      coords
    ),
  });
}
```

**6 BLOQUEIOS CRÍTICOS AQUI:**

1. ❌ **Boot Gate:** App não terminou de inicializar
2. ❌ **Exit Duplicado:** Já tem exit pendente
3. ❌ **Pending Enter:** Você saiu antes do entry timeout acabar
4. ❌ **Sem Sessão Ativa:** `recordStore.currentSession === null` ou location diferente
5. ❌ **Sessão Pausada:** `pauseState?.locationId === locationId`
6. ❌ **GPS Hysteresis:** GPS diz que você ainda está dentro (após 15s)

---

## 📍 PONTO 8: Register Exit (recordStore.ts)

**Arquivo:** `src/stores/recordStore.ts` (linha 230-263)

```typescript
registerExitWithAdjustment: async (locationId, _coords, adjustmentMinutes = 0) => {
  const userId = useAuthStore.getState().getUserId();
  if (!userId) throw new Error('Not authenticated');

  // Calcula exit_at com ajuste
  const now = new Date();
  const adjustedExit = new Date(now.getTime() - adjustmentMinutes * 60 * 1000);

  logger.info('session', `📤 EXIT with adjustment: -${adjustmentMinutes}min`, {
    locationId,
    actualTime: now.toISOString(),
    adjustedTime: adjustedExit.toISOString(),
  });

  // Chama função do database
  await dbRegisterExit(userId, locationId, adjustedExit.toISOString());

  // Recarrega currentSession (que agora deve ser null)
  await get().reloadData();

  // Guarda última sessão finalizada
  const { todaySessions } = get();
  const finishedSession = todaySessions.find(
    s => s.location_id === locationId && s.status === 'finished'
  );
  if (finishedSession) {
    set({ lastFinishedSession: finishedSession });
  }
}
```

**O que acontece:**
- Calcula `exit_at` subtraindo 5 minutos
- Chama `dbRegisterExit()` que faz UPDATE no SQLite
- Recarrega `currentSession` (que vai para null)
- **CRONÔMETRO PARA** ✅

---

## 🔴 POSSÍVEIS PROBLEMAS (Por Ordem de Probabilidade)

### 1. **BLOQUEIO #4: Sem Sessão Ativa** (MAIS PROVÁVEL) ⭐⭐⭐
**Linha:** `sessionHandlers.ts:298`

**Sintoma:**
- Log `🚶 GEOFENCE EXIT:` aparece
- Mas NÃO aparece `⏱️ AUTO END` depois de 15s

**Causa:**
```typescript
if (!activeSession || activeSession.location_id !== locationId) {
  return;  // PARA AQUI
}
```

**Por que isso acontece:**
- O cronômetro já foi parado antes (manualmente ou por outro processo)
- `recordStore.currentSession` está `null`
- Ou `currentSession.location_id` é diferente do `locationId` do evento

**Como confirmar:**
- Verifique se existe log `No active session at this location`

---

### 2. **BLOQUEIO #6: GPS Hysteresis** ⭐⭐
**Linha:** `sessionHandlers.ts:335`

**Sintoma:**
- Log `🚶 GEOFENCE EXIT:` aparece
- Depois de 15s aparece `🛡️ AUTO END CANCELLED`

**Causa:**
```typescript
const { isInside } = await checkInsideFence(..., true);  // useHysteresis = radius × 1.3

if (isInside) {
  startVigilanceMode(...);  // Checa cada 60s por 5 min
  return;  // PARA AQUI
}
```

**Por que isso acontece:**
- GPS não é preciso (accuracy > 20m)
- Fence radius é pequena (ex: 50m)
- Com hysteresis (× 1.3), você ainda está "dentro" (50m × 1.3 = 65m)
- Sistema acha que você ainda não saiu completamente

**Como confirmar:**
- Verifique se existe log `🛡️ AUTO END CANCELLED`
- Verifique se aparece `👁️ Vigilance mode started`

---

### 3. **BLOQUEIO #3: Exit Durante Pending Enter** ⭐
**Linha:** `sessionHandlers.ts:287`

**Sintoma:**
- Log `🚶 GEOFENCE EXIT:` aparece
- Log `❌ Canceling pending enter - user left` aparece

**Causa:**
- Você entrou na fence
- Entry timeout ainda não acabou (ex: 2 minutos)
- Você saiu ANTES do timeout acabar
- Sistema cancela o entry e NÃO cria exit

**Como confirmar:**
- Verifique se existe log `❌ Canceling pending enter - user left`

---

### 4. **BLOQUEIO #2: Exit Duplicado** ⭐
**Linha:** `sessionHandlers.ts:263`

**Sintoma:**
- Primeiro log `🚶 GEOFENCE EXIT:` aparece
- Segundo exit é ignorado com log `Duplicate exit ignored`

**Causa:**
- Sistema já tem um exit pendente
- Você (ou algo) disparou exit duas vezes

**Como confirmar:**
- Verifique se existe log `Duplicate exit ignored (already pending)`

---

### 5. **BLOQUEIO #5: Sessão Pausada**
**Linha:** `sessionHandlers.ts:304`

**Sintoma:**
- Log `🚶 GEOFENCE EXIT:` aparece
- Log `⏸️ Exit during pause - countdown continues` aparece

**Causa:**
- Você clicou em "Pause" no timer
- Saiu da fence enquanto pausado
- Sistema mantém o pause countdown (não cria exit timeout)

**Como confirmar:**
- Verifique se existe log `⏸️ Exit during pause`

---

## ✅ LOGS QUE VOCÊ DEVERIA VER (Fluxo Normal)

```
[geofenceLogic] 📍 Geofence exit: Site A
[bootstrap] 🎯 Geofence event: exit @ abc123
[locationStore] 📍 Geofence exit: Site A
[sessionHandlers] 🚶 GEOFENCE EXIT: Site A
(espera 15 segundos...)
[sessionHandlers] ⏱️ AUTO END (15s timeout) with 5 min adjustment
[recordStore] 📤 EXIT with adjustment: -5min
```

---

## 🔍 COMO DEBUGAR

### Passo 1: Verifique se o evento EXIT chega
**Procure este log:**
```
🚶 GEOFENCE EXIT: [nome da location]
```

**Se NÃO aparecer:**
- O evento nativo não está sendo disparado
- Problema no sistema operacional ou permissions
- Verifique `app.json` → `taskName: 'onsite-geofence'`

**Se aparecer:** ✅ Evento chegou, continue...

---

### Passo 2: Verifique qual bloqueio está ativo
**Procure estes logs:**

| Log | Bloqueio | Linha |
|-----|----------|-------|
| `No active session at this location` | #4: Sem sessão | 299 |
| `⏸️ Exit during pause` | #5: Pausado | 305 |
| `❌ Canceling pending enter` | #3: Pending enter | 288 |
| `Duplicate exit ignored` | #2: Duplicado | 264 |
| `🛡️ AUTO END CANCELLED` | #6: Hysteresis | 336 |

---

### Passo 3: Verifique se timeout dispara
**Procure este log (15 segundos após exit):**
```
⏱️ AUTO END (15s timeout) with 5 min adjustment
```

**Se NÃO aparecer:**
- Timeout foi cancelado ou nunca foi criado
- Um dos bloqueios #1-#5 está ativo

**Se aparecer:** ✅ Timeout disparou, continue...

---

### Passo 4: Verifique se exit foi registrado
**Procure este log:**
```
📤 EXIT with adjustment: -5min
```

**Se aparecer:** ✅ Cronômetro parou com sucesso!

**Se NÃO aparecer:**
- Erro no `registerExitWithAdjustment()`
- Problema no banco de dados

---

## 🎯 RESUMO: O QUE ESTÁ ACONTECENDO?

**MAIS PROVÁVEL:**

O bloqueio **#4** está ativo:

```typescript
// sessionHandlers.ts:298
if (!activeSession || activeSession.location_id !== locationId) {
  logger.debug('session', 'No active session at this location');
  return;  // ❌ PARA AQUI
}
```

**Isso significa:**
- O evento EXIT está chegando normalmente
- Mas quando chega em `handleGeofenceExitLogic()`, não existe sessão ativa
- `recordStore.currentSession` é `null` ou está em outra location

**Por quê?**
- Sessão já foi finalizada antes (manualmente?)
- Outro exit já processou e finalizou
- Entry nunca criou a sessão (foi bloqueado?)

---

## 🛠️ PRÓXIMO PASSO

**Me diga:**

1. Você vê o log `🚶 GEOFENCE EXIT:` quando sai?
2. Qual é o próximo log que aparece depois?
3. Você vê algum dos logs de bloqueio listados acima?
4. O cronômetro está rodando ANTES de você sair da fence?

**Com essas informações, consigo identificar exatamente onde o fluxo está quebrando.**
