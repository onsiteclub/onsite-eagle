# 🔍 ANÁLISE DOS DADOS REAIS - Ping Pong Events

## 📊 Dados Recebidos (8 eventos)

### ✅ Eventos DENTRO da fence (isInside: true)

| Índice | Location | Distance | GPS Accuracy | Margin | Inside? | Source |
|--------|----------|----------|--------------|--------|---------|--------|
| 0 | Office | 7.0m | 11.2m | 123.0m (94.6%) | ✅ YES | geofence |
| 1 | Office | 7.7m | 22.6m | 122.3m (94.0%) | ✅ YES | geofence |
| 3 | Office | 8.2m | 15.8m | 121.8m (93.7%) | ✅ YES | geofence |
| 7 | Office | 9.1m | 49.0m | 120.9m (93.0%) | ✅ YES | geofence |

### ❌ Eventos FORA da fence (isInside: false)

| Índice | Location | Distance | GPS Accuracy | Margin | Inside? | Source |
|--------|----------|----------|--------------|--------|---------|--------|
| 4 | Almonte | 602.3m | 3.8m | -82.3m (-15.8%) | ❌ NO | geofence |
| 5 | Office | 620.9m | 8.6m | -490.9m (-377.6%) | ❌ NO | geofence |
| 6 | Office | 571.4m | 3.8m | -441.4m (-339.5%) | ❌ NO | geofence |

### ⚠️ Evento com GPS ruim (accuracy: 100m)

| Índice | Location | Distance | GPS Accuracy | Margin | Inside? | Source |
|--------|----------|----------|--------------|--------|---------|--------|
| 2 | Office | 17.3m | 100.0m | 112.7m (86.7%) | ✅ YES | geofence |

---

## 🎯 DESCOBERTA CRÍTICA

### Todos os eventos são `eventType: "check"` ⚠️

```json
"eventType": "check"
```

**ISSO NÃO É UM EVENTO DE EXIT!**

Esses são eventos de **HEARTBEAT CHECKING**, não eventos nativos de geofence!

---

## 🔍 O Que Está Acontecendo

### Fonte dos Eventos

**De acordo com o error_type:**
- `pingpong_event` (índices 0, 1, 3)
- `pingpong_warning` (índices 2, 4, 5, 6, 7)

**Source em todos:** `"source": "geofence"`

**Mas...**
```json
"eventType": "check"  // ← ESTE É O PROBLEMA
```

### Tipos Esperados

**Para o fluxo de auto-stop funcionar, você deveria ver:**

```json
"eventType": "enter"  // Entrada na fence
"eventType": "exit"   // Saída da fence ← ESTE ESTÁ FALTANDO!
```

---

## 🚨 DIAGNÓSTICO: Eventos Nativos de EXIT Não Estão Chegando

### O Que os Dados Revelam

1. ✅ **Geofencing está funcionando** - Sistema detecta entrada
2. ✅ **GPS está bom** - Accuracies entre 3.8m - 49m (exceto um de 100m)
3. ✅ **Heartbeat checking funciona** - Sistema verifica posição periodicamente
4. ❌ **Eventos EXIT nativos NÃO estão sendo disparados**

### Eventos FORA (isInside: false)

Você tem 3 eventos claramente FORA das fences:

**Evento 5:** Office - 620.9m de distância (margin: -490.9m)
```json
{
  "distance": 620.9,
  "isInside": false,
  "margin": -490.9,
  "marginPercent": -377.6
}
```

**Evento 6:** Office - 571.4m de distância (margin: -441.4m)
```json
{
  "distance": 571.4,
  "isInside": false,
  "margin": -441.4,
  "marginPercent": -339.5
}
```

**Você está CLARAMENTE FORA (> 500m de distância)**, mas:
- ❌ **Nenhum evento `"eventType": "exit"` foi gerado**
- ❌ **Apenas eventos `"eventType": "check"` (heartbeat)**

---

## 🔎 Por Que Eventos EXIT Não Estão Sendo Disparados?

### Possíveis Causas

### 1. **Geofence Task Não Está Registrada Corretamente** ⚠️

**Verificar:** `app.json` ou `app.config.js`

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "...",
          "isAndroidBackgroundLocationEnabled": true
        }
      ]
    ]
  }
}
```

**E também:** Task deve estar registrada no TaskManager

```typescript
// backgroundTasks.ts
TaskManager.defineTask('onsite-geofence', async ({ data, error }) => {
  // ... código de exit
});
```

---

### 2. **Geofence Não Foi Iniciada (startGeofencingAsync)** ⚠️

**Verificar:** Onde é chamado `Location.startGeofencingAsync()`

```typescript
await Location.startGeofencingAsync('onsite-geofence', regions);
```

**Possível problema:**
- `startGeofencingAsync` nunca foi chamado
- Foi chamado mas falhou silenciosamente
- Regiões (fences) estão vazias

---

### 3. **Android: Background Location Permission Negada** ⚠️

**No Android 10+**, você precisa de:
- `ACCESS_FINE_LOCATION` ✅ (você tem, GPS funciona)
- `ACCESS_BACKGROUND_LOCATION` ❓ (pode estar faltando)

**Verificar:**
```typescript
const { status } = await Location.requestBackgroundPermissionsAsync();
if (status !== 'granted') {
  // ❌ Geofence EXIT não vai funcionar
}
```

---

### 4. **iOS: "Always Allow" Não Foi Concedido** ⚠️

**No iOS**, você precisa de:
- "While Using the App" ✅
- "Always Allow" ❓ (pode estar faltando)

---

### 5. **Regiões Foram Removidas/Recriadas** ⚠️

**Se você chamou:**
```typescript
await Location.stopGeofencingAsync('onsite-geofence');
```

**E depois não recriou as regiões**, o sistema não dispara eventos EXIT.

---

## 🧪 Como os "check" Events Estão Sendo Gerados?

### Origem: Heartbeat Logic

**Arquivo:** `src/lib/heartbeatLogic.ts` (provavelmente)

**Fluxo:**
1. Background heartbeat roda a cada X minutos
2. Obtém GPS atual
3. Calcula distância para cada fence
4. Loga evento de "check"
5. **MAS NÃO dispara `handleGeofenceExit()`** ❌

**Por quê?**
- Heartbeat só VERIFICA posição
- Não SUBSTITUI eventos nativos de geofence
- Eventos nativos de EXIT devem vir do sistema operacional

---

## 🎯 SOLUÇÃO: Por Que Auto-Stop Não Funciona

### Resposta Curta

**Eventos nativos de EXIT do sistema operacional NÃO estão sendo disparados.**

**Portanto:**
- `TaskManager.defineTask('onsite-geofence')` NUNCA recebe `Exit` event
- `processGeofenceEvent()` NUNCA é chamado com `type: 'exit'`
- `handleGeofenceExitLogic()` NUNCA cria o timeout de 15 segundos
- Cronômetro NUNCA para automaticamente

### O Que Você Está Vendo

**Você tem dois sistemas rodando:**

1. ✅ **Heartbeat Checking** - Funciona, gera eventos "check"
2. ❌ **Native Geofence Events** - Não funciona, deveria gerar "enter"/"exit"

**Heartbeat NÃO substitui geofence nativo** - ele só serve para:
- Verificar TTL de pending actions
- Detectar se usuário voltou durante pause
- Logging de ping-pong

**Mas NÃO dispara auto-stop.**

---

## 📋 CHECKLIST DE DEBUG

### Passo 1: Verificar Task Registration

**Arquivo:** `app.json` ou `app.config.js`

```bash
grep -r "onsite-geofence" app.json app.config.js
```

**Esperado:**
```json
"taskName": "onsite-geofence"
```

---

### Passo 2: Verificar startGeofencingAsync

**Procure por:**
```bash
grep -r "startGeofencingAsync" src/
```

**Verifique:**
- É chamado quando fences são criadas?
- Está passando task name correto: `'onsite-geofence'`?
- Array de regiões não está vazio?

---

### Passo 3: Verificar Permissions

**No console/logs:**
```
Background location permission: granted
```

**Se não estiver "granted":**
- Android: `requestBackgroundPermissionsAsync()`
- iOS: "Always Allow" location

---

### Passo 4: Testar Entrada

**Faça este teste:**
1. App fechado
2. Entre na fence fisicamente
3. Espere 30 segundos
4. Abra o app
5. Verifique logs

**Procure por:**
```
📍 Geofence enter: [location]
```

**Se NÃO aparecer:**
- Evento ENTER também não funciona
- Problema é com geofencing nativo inteiro

---

### Passo 5: Verificar TaskManager

**Adicione este log em `backgroundTasks.ts:102`:**

```typescript
TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
  console.log('🔔 GEOFENCE TASK FIRED', { data, error });  // ← ADD THIS

  if (error) {
    logger.error('geofence', 'Geofence task error', { error: String(error) });
    return;
  }

  // ... resto do código
});
```

**Depois:**
1. Saia da fence
2. Espere 2 minutos
3. Verifique se `🔔 GEOFENCE TASK FIRED` apareceu

**Se NÃO aparecer:**
- Task nunca foi chamada pelo sistema
- Problema é permissões ou task registration

---

## 🛠️ ARQUIVOS PARA VERIFICAR

### 1. locationStore.ts - reconfigureGeofencing()

**Procure por:**
```typescript
await Location.startGeofencingAsync(GEOFENCE_TASK, regions);
```

**Verifique:**
- `regions` não está vazio
- `GEOFENCE_TASK` é `'onsite-geofence'`
- Não há erro sendo silenciado (try/catch vazio)

---

### 2. app.json - Task Configuration

**Procure por:**
```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "isAndroidBackgroundLocationEnabled": true,
          "isAndroidForegroundServiceEnabled": true
        }
      ]
    ]
  }
}
```

---

### 3. bootstrap.ts - Initialization

**Verifique ordem de inicialização:**
1. Request permissions
2. Initialize stores
3. Start geofencing ← **ESTE PASSO PODE ESTAR FALTANDO**

---

## 🎯 CONCLUSÃO

### O Problema Real

**Eventos nativos de geofence EXIT não estão sendo disparados pelo sistema operacional.**

**NÃO É um problema no seu código de auto-stop** - o fluxo de `sessionHandlers.ts` está correto.

**É um problema de configuração/permissões/registro do geofencing nativo.**

---

### Próximos Passos

1. **Verifique `Location.startGeofencingAsync()`** - está sendo chamado?
2. **Verifique permissions** - background location granted?
3. **Verifique app.json** - task registrada?
4. **Teste ENTER events** - também não funcionam?
5. **Adicione logs em TaskManager.defineTask** - task está sendo chamada?

---

### Teste Rápido

**No código onde você cria/atualiza fences, adicione:**

```typescript
// Após startGeofencingAsync
const isRegistered = await TaskManager.isTaskRegisteredAsync('onsite-geofence');
console.log('🔍 Geofence task registered:', isRegistered);

if (isRegistered) {
  const taskInfo = await TaskManager.getTaskOptionsAsync('onsite-geofence');
  console.log('🔍 Task info:', taskInfo);
}
```

**Se `isRegistered === false`:**
- Task nunca foi registrada
- Sistema não pode disparar eventos

**Me diga o resultado deste teste!** 🚀
