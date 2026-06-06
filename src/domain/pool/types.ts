export interface DbSeasonRow {
  playerId: string
  playerName: string
  clubName: string
  season: string
  competition: string
  position: string
  ratingComputed: number
  ratingOverride: number | null
  reliability: number
  marketValue: number | null
}
