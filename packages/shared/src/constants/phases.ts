export const CONSTRUCTION_PHASES = [
  {
    id: 1,
    name: 'First Floor',
    description: 'First floor framing - joists, subfloor, blocking',
  },
  {
    id: 2,
    name: '1st Floor Walls',
    description: 'First floor wall framing',
  },
  {
    id: 3,
    name: 'Second Floor',
    description: 'Second floor framing',
  },
  {
    id: 4,
    name: '2nd Floor Walls',
    description: 'Second floor wall framing',
  },
  {
    id: 5,
    name: 'Roof',
    description: 'Roof framing and sheathing',
  },
  {
    id: 6,
    name: 'Stairs Landing',
    description: 'Stair framing and landing',
  },
  {
    id: 7,
    name: 'Backing Frame',
    description: 'Backing for fixtures and finishes',
  },
] as const

export type PhaseName = typeof CONSTRUCTION_PHASES[number]['name']

export interface PhaseItem {
  id: string
  name: string
  description: string
  isCritical: boolean
  requiresPhoto: boolean
}

// Phase items - approximately 66 items total
// AI can detect multiple items from a single photo
export const PHASE_ITEMS: PhaseItem[][] = [
  // Phase 1: First Floor (10 items)
  [
    { id: 'ff-1', name: 'Floor Joists', description: 'Floor joists installed at proper spacing (16" or 24" OC)', isCritical: true, requiresPhoto: true },
    { id: 'ff-2', name: 'Joist Hangers', description: 'Joist hangers properly installed and nailed', isCritical: true, requiresPhoto: false },
    { id: 'ff-3', name: 'Rim Board', description: 'Rim board/band joist installed', isCritical: true, requiresPhoto: true },
    { id: 'ff-4', name: 'Subfloor Sheathing', description: 'Subfloor sheathing installed (3/4" T&G)', isCritical: true, requiresPhoto: true },
    { id: 'ff-5', name: 'Blocking', description: 'Blocking between joists at bearing points', isCritical: false, requiresPhoto: false },
    { id: 'ff-6', name: 'Beam Pockets', description: 'Beam pockets properly framed', isCritical: true, requiresPhoto: false },
    { id: 'ff-7', name: 'Glue Applied', description: 'Construction adhesive applied to joists', isCritical: false, requiresPhoto: false },
    { id: 'ff-8', name: 'Squeak Prevention', description: 'Screws/nails at proper spacing', isCritical: false, requiresPhoto: false },
    { id: 'ff-9', name: 'Cantilever Support', description: 'Cantilever framing if applicable', isCritical: true, requiresPhoto: false },
    { id: 'ff-10', name: 'No Visible Damage', description: 'No cracked or damaged lumber', isCritical: true, requiresPhoto: false },
  ],

  // Phase 2: First Floor Walls (12 items)
  [
    { id: 'fw-1', name: 'Wall Studs', description: 'Studs at proper spacing (16" or 24" OC)', isCritical: true, requiresPhoto: true },
    { id: 'fw-2', name: 'Bottom Plate', description: 'Bottom plate secured to subfloor', isCritical: true, requiresPhoto: false },
    { id: 'fw-3', name: 'Double Top Plate', description: 'Double top plate installed', isCritical: true, requiresPhoto: true },
    { id: 'fw-4', name: 'Window Headers', description: 'Headers over window openings', isCritical: true, requiresPhoto: true },
    { id: 'fw-5', name: 'Door Headers', description: 'Headers over door openings', isCritical: true, requiresPhoto: true },
    { id: 'fw-6', name: 'King Studs', description: 'King studs at openings', isCritical: true, requiresPhoto: false },
    { id: 'fw-7', name: 'Jack Studs', description: 'Jack studs supporting headers', isCritical: true, requiresPhoto: false },
    { id: 'fw-8', name: 'Corner Framing', description: 'Three-stud or California corners', isCritical: true, requiresPhoto: false },
    { id: 'fw-9', name: 'Cripple Studs', description: 'Cripple studs above/below openings', isCritical: false, requiresPhoto: false },
    { id: 'fw-10', name: 'Window Rough Opening', description: 'Window RO per plans', isCritical: true, requiresPhoto: false },
    { id: 'fw-11', name: 'Door Rough Opening', description: 'Door RO per plans', isCritical: true, requiresPhoto: false },
    { id: 'fw-12', name: 'Plumb & Square', description: 'Walls plumb and square', isCritical: true, requiresPhoto: false },
  ],

  // Phase 3: Second Floor (8 items)
  [
    { id: 'sf-1', name: 'Floor Joists', description: 'Second floor joists installed', isCritical: true, requiresPhoto: true },
    { id: 'sf-2', name: 'Subfloor Sheathing', description: 'Subfloor sheathing installed', isCritical: true, requiresPhoto: true },
    { id: 'sf-3', name: 'Stairwell Opening', description: 'Stairwell opening framed', isCritical: true, requiresPhoto: true },
    { id: 'sf-4', name: 'Double Headers', description: 'Double headers at stair opening', isCritical: true, requiresPhoto: false },
    { id: 'sf-5', name: 'Blocking', description: 'Blocking between joists', isCritical: false, requiresPhoto: false },
    { id: 'sf-6', name: 'Bearing on Walls', description: 'Proper bearing on walls below', isCritical: true, requiresPhoto: false },
    { id: 'sf-7', name: 'Joist Hangers', description: 'Joist hangers at stair opening', isCritical: true, requiresPhoto: false },
    { id: 'sf-8', name: 'Rim Board', description: 'Rim board installed', isCritical: true, requiresPhoto: false },
  ],

  // Phase 4: Second Floor Walls (9 items)
  [
    { id: 'sw-1', name: 'Wall Studs', description: 'Studs properly spaced', isCritical: true, requiresPhoto: true },
    { id: 'sw-2', name: 'Headers', description: 'Headers over all openings', isCritical: true, requiresPhoto: true },
    { id: 'sw-3', name: 'Corner Framing', description: 'Corner framing complete', isCritical: true, requiresPhoto: false },
    { id: 'sw-4', name: 'Top Plate', description: 'Double top plate installed', isCritical: true, requiresPhoto: false },
    { id: 'sw-5', name: 'Ceiling Joist Connection', description: 'Proper connection to ceiling joists', isCritical: true, requiresPhoto: false },
    { id: 'sw-6', name: 'Gable End Framing', description: 'Gable end framing if applicable', isCritical: true, requiresPhoto: false },
    { id: 'sw-7', name: 'King & Jack Studs', description: 'King and jack studs at openings', isCritical: true, requiresPhoto: false },
    { id: 'sw-8', name: 'Window RO', description: 'Window rough openings correct', isCritical: true, requiresPhoto: false },
    { id: 'sw-9', name: 'Plumb & Square', description: 'Walls plumb and square', isCritical: true, requiresPhoto: false },
  ],

  // Phase 5: Roof (10 items)
  [
    { id: 'rf-1', name: 'Roof Trusses', description: 'Roof trusses or rafters installed', isCritical: true, requiresPhoto: true },
    { id: 'rf-2', name: 'Truss Spacing', description: 'Proper truss spacing (24" OC)', isCritical: true, requiresPhoto: false },
    { id: 'rf-3', name: 'Ridge Board', description: 'Ridge board or ridge beam', isCritical: true, requiresPhoto: true },
    { id: 'rf-4', name: 'Roof Sheathing', description: 'Roof sheathing installed', isCritical: true, requiresPhoto: true },
    { id: 'rf-5', name: 'Fascia Board', description: 'Fascia board installed', isCritical: true, requiresPhoto: false },
    { id: 'rf-6', name: 'Soffit Framing', description: 'Soffit framing complete', isCritical: false, requiresPhoto: false },
    { id: 'rf-7', name: 'Gable End Framing', description: 'Gable end framing', isCritical: true, requiresPhoto: false },
    { id: 'rf-8', name: 'Truss Bracing', description: 'Lateral and diagonal bracing', isCritical: true, requiresPhoto: false },
    { id: 'rf-9', name: 'Hurricane Ties', description: 'Hurricane ties/straps installed', isCritical: true, requiresPhoto: false },
    { id: 'rf-10', name: 'Sheathing H-Clips', description: 'H-clips between sheathing panels', isCritical: false, requiresPhoto: false },
  ],

  // Phase 6: Stairs Landing (7 items)
  [
    { id: 'st-1', name: 'Stair Stringers', description: 'Stair stringers installed', isCritical: true, requiresPhoto: true },
    { id: 'st-2', name: 'Landing Framing', description: 'Landing platform framed', isCritical: true, requiresPhoto: true },
    { id: 'st-3', name: 'Header at Top', description: 'Header at top of stairs', isCritical: true, requiresPhoto: false },
    { id: 'st-4', name: 'Rise & Run', description: 'Proper rise and run (7-3/4" rise, 10" run)', isCritical: true, requiresPhoto: false },
    { id: 'st-5', name: 'Handrail Blocking', description: 'Blocking for handrail', isCritical: true, requiresPhoto: false },
    { id: 'st-6', name: 'Guard Rail Framing', description: 'Guard rail framing at landing', isCritical: true, requiresPhoto: false },
    { id: 'st-7', name: 'Stringer Attachment', description: 'Stringers properly attached', isCritical: true, requiresPhoto: false },
  ],

  // Phase 7: Backing Frame (10 items)
  [
    { id: 'bf-1', name: 'Bathroom Blocking', description: 'Blocking for bathroom fixtures', isCritical: true, requiresPhoto: true },
    { id: 'bf-2', name: 'Toilet Flange Blocking', description: 'Blocking around toilet flange', isCritical: true, requiresPhoto: false },
    { id: 'bf-3', name: 'Kitchen Cabinet Blocking', description: 'Blocking for upper cabinets', isCritical: true, requiresPhoto: true },
    { id: 'bf-4', name: 'Handrail Blocking', description: 'Blocking for handrails', isCritical: true, requiresPhoto: false },
    { id: 'bf-5', name: 'TV Mount Blocking', description: 'Blocking for TV mounts', isCritical: false, requiresPhoto: false },
    { id: 'bf-6', name: 'Grab Bar Blocking', description: 'Blocking for grab bars', isCritical: true, requiresPhoto: false },
    { id: 'bf-7', name: 'Medicine Cabinet', description: 'Blocking for medicine cabinet', isCritical: false, requiresPhoto: false },
    { id: 'bf-8', name: 'Towel Bar Blocking', description: 'Blocking for towel bars', isCritical: false, requiresPhoto: false },
    { id: 'bf-9', name: 'Shower Valve Blocking', description: 'Blocking at shower valve height', isCritical: true, requiresPhoto: false },
    { id: 'bf-10', name: 'Closet Rod Blocking', description: 'Blocking for closet rods', isCritical: false, requiresPhoto: false },
  ],
]

// Items that require photos (AI validation) - approximately 15 items
export const REQUIRED_PHOTO_ITEMS = PHASE_ITEMS.flat().filter(item => item.requiresPhoto)

// Critical items that must be verified
export const CRITICAL_ITEMS = PHASE_ITEMS.flat().filter(item => item.isCritical)

// Get items for a specific phase
export function getPhaseItems(phaseIndex: number): PhaseItem[] {
  return PHASE_ITEMS[phaseIndex] || []
}

// Get phase by index
export function getPhase(index: number) {
  return CONSTRUCTION_PHASES[index]
}

// Total items count
export const TOTAL_ITEMS = PHASE_ITEMS.flat().length
