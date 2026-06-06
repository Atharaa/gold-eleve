export type Tier = 'rich' | 'basic'

export interface PlayerSeasonStats {
  playerId: string
  seasonId: string
  position: string
  minutes: number
  matches: number
  goals: number
  assists: number
  xG?: number
  xA?: number
  tacklesInterceptions?: number
  progressivePasses?: number
  passCompletionPct?: number
  savePct?: number
  cleanSheets?: number
  goalsConcededPer90?: number
  marketValue?: number
}

export interface RatingResult {
  playerId: string
  seasonId: string
  ratingComputed: number
  tier: Tier
  reliability: 1 | 2 | 3 | 4
}
