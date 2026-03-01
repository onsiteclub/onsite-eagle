import type { GateCheckTransition } from '../types/gate-check'

/** All 4 gate check transitions in order */
export const GATE_CHECK_TRANSITIONS: GateCheckTransition[] = [
  'framing_to_roofing',
  'roofing_to_trades',
  'trades_to_backframe',
  'backframe_to_final',
]

/** Human-readable labels for transitions */
export const TRANSITION_LABELS: Record<GateCheckTransition, string> = {
  framing_to_roofing: 'Framing → Roofing',
  roofing_to_trades: 'Roofing → Trades',
  trades_to_backframe: 'Trades → Backframe',
  backframe_to_final: 'Backframe → Final (Drywall)',
}

/** Short labels for compact UI */
export const TRANSITION_SHORT_LABELS: Record<GateCheckTransition, string> = {
  framing_to_roofing: 'F→R',
  roofing_to_trades: 'R→T',
  trades_to_backframe: 'T→B',
  backframe_to_final: 'B→D',
}

/** Expected item counts per transition (for validation) */
export const TRANSITION_ITEM_COUNTS: Record<GateCheckTransition, number> = {
  framing_to_roofing: 16,
  roofing_to_trades: 5,
  trades_to_backframe: 7,
  backframe_to_final: 20,
}

/** Get the next transition after the given one (undefined if last) */
export function getNextTransition(current: GateCheckTransition): GateCheckTransition | undefined {
  const idx = GATE_CHECK_TRANSITIONS.indexOf(current)
  return idx >= 0 && idx < GATE_CHECK_TRANSITIONS.length - 1
    ? GATE_CHECK_TRANSITIONS[idx + 1]
    : undefined
}
