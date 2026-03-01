/** Phase IDs — TEXT primary keys, matching frm_phases seed data */
export type PhaseId =
  | 'capping'
  | 'floor_1'
  | 'walls_1'
  | 'floor_2'
  | 'walls_2'
  | 'roof'
  | 'backframe_basement'
  | 'backframe_strapping'
  | 'backframe_backing'

export interface FrmPhase {
  id: PhaseId
  name: string
  description: string | null
  sort_order: number
  is_backframe: boolean
  is_optional: boolean
}
