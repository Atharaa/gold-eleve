import { PositionGroup } from './positions'

export type Metric =
  | 'goals' | 'assists' | 'minutes'
  | 'xG' | 'xA' | 'tacklesInterceptions' | 'progressivePasses' | 'passCompletionPct'
  | 'savePct' | 'cleanSheets' | 'goalsConcededInv' | 'marketValue'

export type WeightSet = Partial<Record<Metric, number>>

export const RICH_WEIGHTS: Record<PositionGroup, WeightSet> = {
  GK: { savePct: 0.45, cleanSheets: 0.3, goalsConcededInv: 0.25 },
  DEF: { tacklesInterceptions: 0.35, passCompletionPct: 0.2, cleanSheets: 0.2, goals: 0.1, assists: 0.15 },
  MID: { passCompletionPct: 0.2, progressivePasses: 0.25, xA: 0.2, assists: 0.15, goals: 0.2 },
  ATT: { goals: 0.4, xG: 0.25, assists: 0.15, xA: 0.1, minutes: 0.1 },
}

export const BASIC_WEIGHTS: Record<PositionGroup, WeightSet> = {
  GK: { cleanSheets: 0.4, goalsConcededInv: 0.2, marketValue: 0.4 },
  DEF: { marketValue: 0.45, minutes: 0.2, goals: 0.15, assists: 0.2 },
  MID: { marketValue: 0.4, assists: 0.2, goals: 0.2, minutes: 0.2 },
  ATT: { goals: 0.4, assists: 0.2, minutes: 0.1, marketValue: 0.3 },
}
