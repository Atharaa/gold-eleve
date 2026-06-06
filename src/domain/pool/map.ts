import { toPositionGroup } from '../ratings'
import { PoolPlayer } from '../game'
import { DbSeasonRow } from './types'

function clampReliability(value: number): 1 | 2 | 3 | 4 {
  return Math.min(4, Math.max(1, Math.round(value))) as 1 | 2 | 3 | 4
}

export function rowToPoolPlayer(row: DbSeasonRow): PoolPlayer {
  return {
    playerId: row.playerId,
    playerName: row.playerName,
    clubName: row.clubName,
    season: row.season,
    competition: row.competition,
    positionGroup: toPositionGroup(row.position),
    eligiblePositions: [toPositionGroup(row.position)],
    rating: row.ratingOverride ?? row.ratingComputed,
    reliability: clampReliability(row.reliability),
    marketValue: row.marketValue ?? undefined,
  }
}

export function rowsToPool(rows: DbSeasonRow[]): PoolPlayer[] {
  return rows.map(rowToPoolPlayer)
}
