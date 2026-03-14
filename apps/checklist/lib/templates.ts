/**
 * Hardcoded gate check templates (same as migration 021).
 * Used by self-service mode (offline) and as fallback.
 */

export interface TemplateItem {
  code: string
  label: string
  sortOrder: number
  isBlocking: boolean
}

export type ChecklistTransition =
  | 'framing_to_roofing'
  | 'roofing_to_trades'
  | 'backframe_to_final'

export const TRANSITION_LABELS: Record<ChecklistTransition, string> = {
  framing_to_roofing: 'Framing Check-List',
  roofing_to_trades: 'Trusses Check-List',
  backframe_to_final: 'Backing Check-List',
}

export const CHECKLIST_TEMPLATES: Record<ChecklistTransition, TemplateItem[]> = {
  framing_to_roofing: [
    { code: 'wall_sheathing', label: 'Wall sheathing alignment + tna blocks + nail @ bottom', sortOrder: 1, isBlocking: true },
    { code: 'leftovers_floor', label: 'All leftovers filled in front of 1st/2nd floor and basement free of debris', sortOrder: 2, isBlocking: false },
    { code: 'safety_railings', label: 'Safety railings installed @ stair holes, windows, doors & temp stair', sortOrder: 3, isBlocking: true },
    { code: 'window_doors', label: 'All windows & doors openings and location as per plan', sortOrder: 4, isBlocking: true },
    { code: 'walls_location', label: 'All walls installed @ the right location, even shower and mech walls', sortOrder: 5, isBlocking: true },
    { code: 'point_loads', label: 'All point loads installed & carried down to foundation, including the trusses ones', sortOrder: 6, isBlocking: true },
    { code: 'stair_holes', label: 'Stairs holes & landings framed as per plan with hanger and posts installed', sortOrder: 7, isBlocking: true },
    { code: 'steel_beams', label: 'Steel beams supported to the foundation with 8" space for the steel posts', sortOrder: 8, isBlocking: true },
    { code: 'i24_joists', label: 'I24-joists fully nailed with screws & glue', sortOrder: 9, isBlocking: true },
    { code: 'joist_blkn', label: 'Joist blkn nailed with horizontal angled nails + glue @ top/bottom', sortOrder: 10, isBlocking: false },
  ],
  roofing_to_trades: [
    { code: 'temp_bracing', label: 'All temporary bracing, blocks and scaffolding removed', sortOrder: 1, isBlocking: true },
    { code: 'house_clean2', label: 'House and garage free of debris & all leftovers piled up', sortOrder: 2, isBlocking: false },
    { code: 'girder_truss', label: 'Girder truss point load installed', sortOrder: 3, isBlocking: true },
    { code: 'insulation_stop', label: 'Insulation stop installed', sortOrder: 4, isBlocking: false },
    { code: 'drywall_backing', label: 'Backing for drywall @ ceiling', sortOrder: 5, isBlocking: false },
    { code: 'guardrails', label: 'Guardrails re-installed on windows', sortOrder: 6, isBlocking: true },
    { code: 'stair_hole', label: 'Stair hole platform removed & guardrails installed', sortOrder: 7, isBlocking: true },
    { code: 'osb_sheathing', label: 'OSB sheathing and debris picked from around the unit', sortOrder: 8, isBlocking: false },
    { code: 'fascias', label: 'Fascias lined & straight', sortOrder: 9, isBlocking: false },
    { code: 'hangers', label: 'Hangers installed, even lower', sortOrder: 10, isBlocking: true },
    { code: 'truss_bracing', label: 'All the truss bracing installed', sortOrder: 11, isBlocking: true },
    { code: 'gypsum_garage', label: 'Gypsum board installed @ garage', sortOrder: 12, isBlocking: false },
    { code: 'vents', label: 'Vents cut off', sortOrder: 13, isBlocking: false },
  ],
  backframe_to_final: [
    { code: 'porch_ceiling', label: 'Porch dropped ceiling or strapped', sortOrder: 1, isBlocking: false },
    { code: 'mech_walls', label: 'All mech walls framed', sortOrder: 2, isBlocking: true },
    { code: 'i_joists_cut', label: 'I-joists supported where top plates were cut', sortOrder: 3, isBlocking: true },
    { code: 'strapping', label: 'Strapping leveled', sortOrder: 4, isBlocking: false },
    { code: 'bsmt_backing', label: 'Basement backing walls: EPW, laundry', sortOrder: 5, isBlocking: false },
    { code: 'bsmt_plates', label: 'Bsmt plates installed @ top/bottom', sortOrder: 6, isBlocking: true },
    { code: 'bathroom_backing', label: 'Main bathroom railing backing', sortOrder: 7, isBlocking: false },
    { code: 'fireplace', label: 'Fireplace framed', sortOrder: 8, isBlocking: true },
    { code: 'tv_backing', label: 'TV backing, closet, shelves & bath blkn', sortOrder: 9, isBlocking: false },
    { code: 'garage_ceiling', label: 'Garage dropped ceiling', sortOrder: 10, isBlocking: false },
    { code: 'garage_jambs', label: 'Garage jambs installed', sortOrder: 11, isBlocking: false },
    { code: 'porch_posts', label: 'Porch PT posts installed', sortOrder: 12, isBlocking: false },
    { code: 'house_clean', label: 'House & garage free of debris or leftovers', sortOrder: 13, isBlocking: false },
    { code: 'attic_hatch', label: 'Attic hatch installed', sortOrder: 14, isBlocking: false },
  ],
}
