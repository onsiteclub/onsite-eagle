/**
 * Hardcoded gate check templates (same as migration 021).
 * Used by self-service mode (offline) and as fallback.
 */

export interface TemplateItem {
  code: string
  label: string
  sortOrder: number
  isBlocking: boolean
  maxPhotos: number // maximum photos allowed (up to 5)
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
    { code: 'wall_sheathing', label: 'Exterior OSB sheathing nailed and aligned on the rimboard', sortOrder: 1, isBlocking: true, maxPhotos: 5 },
    { code: 'safety_railings', label: 'Safety railings installed at the stair holes, windows, doors and temporary stairs', sortOrder: 2, isBlocking: true, maxPhotos: 5 },
    { code: 'window_doors', label: 'Door/Window rough openings and locations as per plan', sortOrder: 3, isBlocking: true, maxPhotos: 5 },
    { code: 'point_loads', label: 'Headers/lintels as per plan, all the point loads transferred to the foundation, including the truss ones', sortOrder: 4, isBlocking: true, maxPhotos: 5 },
    { code: 'stair_holes', label: 'Stair openings and landings are framed as per the stair layout', sortOrder: 5, isBlocking: true, maxPhotos: 5 },
    { code: 'bsmt_debris', label: 'Basement free of debris and lumber posts levelled and anchored to the footing with brackets', sortOrder: 6, isBlocking: false, maxPhotos: 5 },
    { code: 'no_joist_mech', label: 'No joist installed below mechanical walls, toilets, or shower panels', sortOrder: 7, isBlocking: true, maxPhotos: 5 },
    { code: 'hangers_nailed', label: 'Hangers fully nailed with construction screws and glue', sortOrder: 8, isBlocking: true, maxPhotos: 5 },
    { code: 'joist_blkn', label: 'Floor joist blocking nailed with horizontal angled nails + glue @ top/bottom', sortOrder: 9, isBlocking: false, maxPhotos: 5 },
    { code: 'mech_walls_ground', label: 'Mechanical walls nailed to the ground next to the studs, even the shower walls', sortOrder: 10, isBlocking: true, maxPhotos: 5 },
    { code: 'steel_beams', label: 'Steel beams supported on the foundation with 8" space for the steel posts', sortOrder: 11, isBlocking: true, maxPhotos: 5 },
    { code: 'porch_beam', label: 'Porch beam and/or flat roofing installed, levelled and braced', sortOrder: 12, isBlocking: false, maxPhotos: 5 },
    { code: 'house_clean', label: 'Unit is free of debris or leftovers (attach pics)', sortOrder: 13, isBlocking: false, maxPhotos: 5 },
  ],
  roofing_to_trades: [
    { code: 'temp_bracing', label: 'All temporary bracing, blocks and scaffolding removed', sortOrder: 1, isBlocking: true, maxPhotos: 5 },
    { code: 'house_clean2', label: 'House and garage free of debris & all leftovers piled up', sortOrder: 2, isBlocking: false, maxPhotos: 5 },
    { code: 'girder_truss', label: 'Girder truss point load installed', sortOrder: 3, isBlocking: true, maxPhotos: 5 },
    { code: 'insulation_stop', label: 'Insulation stop installed', sortOrder: 4, isBlocking: false, maxPhotos: 5 },
    { code: 'drywall_backing', label: 'Backing for drywall @ ceiling', sortOrder: 5, isBlocking: false, maxPhotos: 5 },
    { code: 'guardrails', label: 'Guardrails re-installed on windows', sortOrder: 6, isBlocking: true, maxPhotos: 5 },
    { code: 'stair_hole', label: 'Stair hole platform removed & guardrails installed', sortOrder: 7, isBlocking: true, maxPhotos: 5 },
    { code: 'osb_sheathing', label: 'OSB sheathing and debris picked from around the unit', sortOrder: 8, isBlocking: false, maxPhotos: 5 },
    { code: 'fascias', label: 'Fascias lined & straight', sortOrder: 9, isBlocking: false, maxPhotos: 5 },
    { code: 'hangers', label: 'Hangers installed, even lower', sortOrder: 10, isBlocking: true, maxPhotos: 5 },
    { code: 'truss_bracing', label: 'All the truss bracing installed', sortOrder: 11, isBlocking: true, maxPhotos: 5 },
    { code: 'gypsum_garage', label: 'Gypsum board installed @ garage', sortOrder: 12, isBlocking: false, maxPhotos: 5 },
    { code: 'vents', label: 'Vents cut off', sortOrder: 13, isBlocking: false, maxPhotos: 5 },
  ],
  backframe_to_final: [
    { code: 'attic_hatch', label: 'Attic hatch is installed', sortOrder: 1, isBlocking: false, maxPhotos: 5 },
    { code: 'strapping', label: 'Strapping is levelled on the ceiling sides', sortOrder: 2, isBlocking: false, maxPhotos: 5 },
    { code: 'bathroom_backing', label: 'Main bathroom grab bar reinforcement added', sortOrder: 3, isBlocking: false, maxPhotos: 5 },
    { code: 'stairways', label: 'Stairways framed with consistent review on both sides', sortOrder: 4, isBlocking: true, maxPhotos: 5 },
    { code: 'mech_walls', label: 'All the mech walls are framed and nailed to the ground', sortOrder: 5, isBlocking: true, maxPhotos: 5 },
    { code: 'fireplace', label: 'Fireplaces fully framed, levelled and straightened', sortOrder: 6, isBlocking: true, maxPhotos: 5 },
    { code: 'i_joists_cut', label: 'I-joists supported where the top plates were cut-off', sortOrder: 7, isBlocking: true, maxPhotos: 5 },
    { code: 'bsmt_plates', label: 'Basement plates installed on top/bottom for insulation', sortOrder: 8, isBlocking: true, maxPhotos: 5 },
    { code: 'bsmt_backing', label: 'Basement EP, LT, WM, HWT backing walls', sortOrder: 9, isBlocking: false, maxPhotos: 5 },
    { code: 'garage_ceiling', label: 'Garage dropped ceiling fully framed', sortOrder: 10, isBlocking: false, maxPhotos: 5 },
    { code: 'garage_jambs', label: 'Garage jambs installed and levelled', sortOrder: 11, isBlocking: false, maxPhotos: 5 },
    { code: 'porch_ceiling', label: 'Porch dropped ceiling or strapped', sortOrder: 12, isBlocking: false, maxPhotos: 5 },
    { code: 'porch_posts', label: 'Porch PT posts installed', sortOrder: 13, isBlocking: false, maxPhotos: 5 },
    { code: 'house_clean', label: 'Unit is free of debris or leftovers', sortOrder: 14, isBlocking: false, maxPhotos: 5 },
  ],
}
