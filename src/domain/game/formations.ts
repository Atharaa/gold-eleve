import { PositionGroup } from '../ratings'

const FORMATIONS: Record<string, PositionGroup[]> = {
  '4-3-3': ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'ATT', 'ATT', 'ATT'],
  '4-4-2': ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'ATT', 'ATT'],
  '3-5-2': ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'ATT', 'ATT'],
  '4-2-3-1': ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'ATT'],
}

export const FORMATION_NAMES = Object.keys(FORMATIONS)

export function formationSlots(name: string): PositionGroup[] {
  const slots = FORMATIONS[name]
  if (!slots) throw new Error(`Unknown formation: ${name}`)
  return [...slots]
}
