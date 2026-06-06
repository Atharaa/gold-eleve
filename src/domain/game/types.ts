import { PositionGroup } from '../ratings'

export interface PoolPlayer {
  playerId: string
  playerName: string
  clubName: string
  season: string
  competition: string
  positionGroup: PositionGroup
  rating: number
  reliability: 1 | 2 | 3 | 4
  marketValue?: number
}

export interface TableRow {
  name: string
  isUser: boolean
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  points: number
  cleanSheets: number
  position?: number
}

export interface RankRow {
  playerName: string
  club: string
  value: number
  isUser: boolean
}

export interface SeasonResult {
  table: TableRow[]
  userRow: TableRow
  invincible: boolean
  scorers: RankRow[]
  assisters: RankRow[]
  keepers: RankRow[]
  bestRated: RankRow
}
