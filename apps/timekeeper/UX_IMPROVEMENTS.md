# UX Improvements - Manual Entry v2.0

## 🎯 Objetivo
Tornar a marcação manual de horas mais **amigável, intuitiva e destacada** sem usar cores fortes.

## ✅ Implementações

### 1. **Seletor de Data** 📅
- **Sempre visível** abaixo do header "Log Hours"
- Formato: `Wed, Jan 15` (dia da semana + data)
- Dropdown com 3 opções rápidas:
  - ✅ Today
  - ⏮️ Yesterday
  - 📆 Choose date... (abre calendário nativo)
- **Visual:** Background sutil com borda primary (`opacity: 0.05` e `0.2`)

```typescript
// Exemplo de uso
📅 Wed, Jan 15 [▼]
  → Today
  → Yesterday
  → Choose date...
```

### 2. **Time Pickers Nativos** ⏰
**Substituiu:** 6 TextInputs separados (HH e MM para Entry/Exit/Break)
**Por:** 2 botões touch-friendly que abrem pickers nativos

#### Entry Time
- Botão: `09:00` com ícone de relógio
- Toque → Abre modal nativo de hora
- iOS: Wheel picker (spinner)
- Android: Dialog padrão

#### Exit Time
- Botão MAIOR: `17:00` (fonte 26px vs 22px)
- Mesmo comportamento do Entry
- Visual mais destacado (border thickness 2px)

#### Break
- Mantido como TextInput numérico (`60 min`)
- Mais rápido para valores pequenos

**Benefícios:**
- ✅ Mais intuitivo (UI nativa familiar)
- ✅ Menos espaço vertical
- ✅ Menos erros de digitação
- ✅ Suporte a AM/PM automático

### 3. **Cálculo de Total em Tempo Real** 🧮
**Nova feature:** Display do total de horas trabalhadas atualiza instantaneamente

```
Total    🕐 8h 30min
```

- Calcula: `(Exit - Entry) - Break`
- Suporta turnos noturnos (overnight shifts)
- Mostra `--` se dados incompletos
- Formatos: `8h 30min`, `8h`, `45min`
- **Visual:** Badge com background success suave (`opacity: 0.08`) e borda

**Lógica:**
```typescript
worked = exitTotal - entryTotal;
if (worked < 0) worked += 24 * 60; // Handle overnight
worked -= pause;
```

### 4. **Hierarquia Visual Melhorada** 🎨

#### Sombras Sutis
```typescript
timePickerButton: {
  ...shadows.sm,      // Sombra pequena
  borderWidth: 2,
}

timePickerButtonLg: {
  ...shadows.md,      // Sombra média (Exit mais destacado)
  borderWidth: 2,
}

totalRow: {
  backgroundColor: withOpacity(colors.success, 0.08),
  borderColor: withOpacity(colors.success, 0.2),
}
```

#### Cores Sutis (sem apelo forte)
- Date selector: `primary + 5% opacity` background
- Time buttons: border `primary + 15-20% opacity`
- Total badge: `success + 8% opacity` background
- **Sem cores vibrantes**, apenas acentos sutis

#### Tipografia
- Entry: 22px normal
- Exit: **26px bold** (mais destaque)
- Total: **18px bold tabular-nums**
- Data: 14px semibold

### 5. **Ajustes de Proporção** 📐
Aumentou levemente a seção de formulário para acomodar novos elementos:

```diff
- formSection: { flex: 2 }     // 50%
+ formSection: { flex: 2.2 }   // ~55%

- locationsSection: { flex: 1 }  // 25%
+ locationsSection: { flex: 0.9 } // ~22.5%

- timerSection: { flex: 1 }      // 25%
+ timerSection: { flex: 0.9 }    // ~22.5%
```

Total ainda próximo de 100% (flex: 4.0 total)

---

## 📱 Layout Final

```
┌──────────────────────────────────────┐
│ ⏰ Log Hours              Reports    │
│                                      │
│ 📅 Wed, Jan 15              [▼]     │  ← Date picker
├──────────────────────────────────────┤
│ [● Site A                       ▼]  │  ← Location
│                                      │
│  Entry      [ 09:00  🕐 ]           │  ← Time picker button
│  Exit       [ 17:00  🕐 ]           │  ← Larger button
│  Break      [ 60 min ]               │  ← Text input
│                                      │
│  Total      🕐 8h 30min              │  ← Real-time calc
│                                      │
│  [✓ Save Hours                    ]  │  55% space
├──────────────────────────────────────┤
│ Locations                       [+]  │
│ ┌─────────┐ ┌─────────┐            │  22.5%
│ │● Site A │ │● Site B │            │
│ └─────────┘ └─────────┘            │
├──────────────────────────────────────┤
│         🟢 Active Session            │
│          01:23:45                    │  22.5%
│          [⏸]  [⏹]                   │
└──────────────────────────────────────┘
```

---

## 🔧 Dependências Adicionadas

```bash
npm install @react-native-community/datetimepicker
```

---

## 📝 Arquivos Modificados

1. **[app/(tabs)/index.tsx](app/(tabs)/index.tsx)** - Componente principal
   - Adicionado state para date picker
   - Adicionado state para time pickers (Entry/Exit)
   - Implementada lógica de cálculo de total
   - Helpers `formatDateWithDay()` e `calculateTotalHours()`
   - Modais iOS para time pickers

2. **[src/screens/home/styles/home.styles.ts](src/screens/home/styles/home.styles.ts)** - Estilos
   - Novos estilos: `dateSelector`, `dateDropdown`, `dateOption`
   - Novos estilos: `timePickerButton`, `timePickerButtonLg`
   - Novos estilos: `totalRow`, `totalBadge`, `totalText`
   - Novos estilos: `pickerOverlay`, `pickerContainer`, `pickerHeader` (iOS modals)

---

## 🎨 Design Tokens Usados

```typescript
// Destaque sutil (sem cores fortes)
backgroundColor: withOpacity(colors.primary, 0.05)   // 5% tint
borderColor: withOpacity(colors.primary, 0.15-0.2)   // 15-20% tint

// Success feedback (total)
backgroundColor: withOpacity(colors.success, 0.08)
borderColor: withOpacity(colors.success, 0.2)

// Sombras
...shadows.sm   // pequena (Entry, buttons)
...shadows.md   // média (Exit - destaque, dropdowns)
```

---

## ✨ Benefícios UX

### Antes (v1.5)
- ❌ Data implícita (sempre hoje)
- ❌ 6 inputs separados (confuso)
- ❌ Sem feedback de total
- ❌ Visual plano

### Depois (v2.0)
- ✅ **Data clara e editável**
- ✅ **Time pickers nativos (amigável)**
- ✅ **Total em tempo real (feedback imediato)**
- ✅ **Hierarquia visual com sombras sutis**
- ✅ **Cores discretas mas destacadas**

---

## 🚀 Próximos Passos (Futuro)

1. Integrar `selectedDate` com `handleSaveManual()` para salvar na data escolhida
2. Adicionar validação: Exit > Entry
3. Animações sutis nos pickers (opcional)
4. Sugerir horários baseado em histórico da location + data

---

*Implementado: 2026-01-15*
*Versão: v2.0 - Enhanced Manual Entry UX*
