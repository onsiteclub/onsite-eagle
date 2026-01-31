export const CONSTRUCTION_PHASES = [
  {
    id: 1,
    name: 'First Floor',
    description: 'First floor framing - joists, subfloor, blocking',
  },
  {
    id: 2,
    name: 'First Floor Walls',
    description: 'First floor wall framing',
  },
  {
    id: 3,
    name: 'Second Floor',
    description: 'Second floor framing',
  },
  {
    id: 4,
    name: 'Second Floor Walls',
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
