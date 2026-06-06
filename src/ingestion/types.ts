import { PlayerSeasonStats, Tier } from '../domain/ratings'

export interface NormalizedRow {
  playerName: string
  clubName: string
  season: string
  competition: string
  stats: PlayerSeasonStats
}

export interface RatedRow extends NormalizedRow {
  tier: Tier
  ratingComputed: number
  reliability: 1 | 2 | 3 | 4
}
