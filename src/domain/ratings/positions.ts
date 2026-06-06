export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'ATT'

const MAP: Record<string, PositionGroup> = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF', WB: 'DEF', LWB: 'DEF', RWB: 'DEF', DF: 'DEF',
  DM: 'MID', CM: 'MID', AM: 'MID', MF: 'MID', LM: 'MID', RM: 'MID',
  LW: 'ATT', RW: 'ATT', FW: 'ATT', ST: 'ATT', CF: 'ATT',
}

export function toPositionGroup(raw: string): PositionGroup {
  const key = raw.trim().toUpperCase()
  const group = MAP[key]
  if (!group) throw new Error(`Unknown position: ${raw}`)
  return group
}
