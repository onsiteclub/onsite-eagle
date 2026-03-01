import type { FrmPhase, PhaseId } from '../types/phase'

/** All 9 framing phases (matches frm_phases seed data) */
export const FRAMING_PHASES: FrmPhase[] = [
  { id: 'capping', name: 'Capping', description: 'Cobertura de fundação (inverno)', sort_order: 0, is_backframe: false, is_optional: true },
  { id: 'floor_1', name: 'First Floor', description: 'Piso térreo', sort_order: 1, is_backframe: false, is_optional: false },
  { id: 'walls_1', name: 'First Floor Walls', description: 'Paredes térreo', sort_order: 2, is_backframe: false, is_optional: false },
  { id: 'floor_2', name: 'Second Floor', description: 'Piso superior', sort_order: 3, is_backframe: false, is_optional: false },
  { id: 'walls_2', name: 'Second Floor Walls', description: 'Paredes 2º andar', sort_order: 4, is_backframe: false, is_optional: false },
  { id: 'roof', name: 'Roof', description: 'Telhado', sort_order: 5, is_backframe: false, is_optional: false },
  { id: 'backframe_basement', name: 'Backframe Basement', description: 'Backframe porão', sort_order: 6, is_backframe: true, is_optional: false },
  { id: 'backframe_strapping', name: 'Backframe Strapping', description: 'Strapping', sort_order: 7, is_backframe: true, is_optional: false },
  { id: 'backframe_backing', name: 'Backframe Backing', description: 'Backing, escadas, fireplaces, limpeza', sort_order: 8, is_backframe: true, is_optional: false },
]

/** Phase IDs in order */
export const PHASE_ORDER: PhaseId[] = FRAMING_PHASES.map(p => p.id)

/** Main (non-backframe) phases */
export const MAIN_PHASES = FRAMING_PHASES.filter(p => !p.is_backframe)

/** Backframe phases */
export const BACKFRAME_PHASES = FRAMING_PHASES.filter(p => p.is_backframe)

/** Get phase by ID */
export function getPhaseById(id: PhaseId): FrmPhase | undefined {
  return FRAMING_PHASES.find(p => p.id === id)
}

/** Get next phase (returns undefined if at end) */
export function getNextPhase(currentPhaseId: PhaseId): FrmPhase | undefined {
  const idx = FRAMING_PHASES.findIndex(p => p.id === currentPhaseId)
  return idx >= 0 && idx < FRAMING_PHASES.length - 1 ? FRAMING_PHASES[idx + 1] : undefined
}
