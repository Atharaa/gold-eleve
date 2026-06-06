import { PlayerSeasonStats } from '../domain/ratings'
import { RawSeasonRow } from './csv'
import { NormalizedRow } from './types'

function optionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function requiredNumber(value: string | undefined, field: string): number {
  const n = optionalNumber(value)
  if (n === undefined) throw new Error(`Missing required numeric field: ${field}`)
  return n
}

function requiredText(value: string | undefined, field: string): string {
  const v = value?.trim()
  if (!v) throw new Error(`Missing required field: ${field}`)
  return v
}

export function toNormalizedRow(row: RawSeasonRow): NormalizedRow {
  const playerName = requiredText(row.player, 'player')
  const clubName = requiredText(row.club, 'club')
  const season = requiredText(row.season, 'season')
  const competition = requiredText(row.competition, 'competition')
  const position = requiredText(row.position, 'position')

  const stats: PlayerSeasonStats = {
    playerId: playerName,
    seasonId: season,
    position,
    minutes: requiredNumber(row.minutes, 'minutes'),
    matches: requiredNumber(row.matches, 'matches'),
    goals: requiredNumber(row.goals, 'goals'),
    assists: requiredNumber(row.assists, 'assists'),
    xG: optionalNumber(row.xg),
    xA: optionalNumber(row.xa),
    tacklesInterceptions: optionalNumber(row.tackles_interceptions),
    progressivePasses: optionalNumber(row.progressive_passes),
    passCompletionPct: optionalNumber(row.pass_completion_pct),
    savePct: optionalNumber(row.save_pct),
    cleanSheets: optionalNumber(row.clean_sheets),
    goalsConcededPer90: optionalNumber(row.goals_conceded_per90),
    marketValue: optionalNumber(row.market_value),
  }

  return { playerName, clubName, season, competition, stats }
}
