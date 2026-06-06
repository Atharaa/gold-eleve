import { RatedRow } from './types'
import { PrimeRef } from './prime'

export interface PlayerSeasonPayload {
  playerName: string
  clubName: string
  season: string
  competition: string
  position: string
  tier: string
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
  ratingComputed: number
  reliability: number
}

export interface UpsertPayload {
  clubs: string[]
  players: { name: string; primeSeason: string; primeCompetition: string }[]
  playerSeasons: PlayerSeasonPayload[]
}

export function buildUpsertPayload(rated: RatedRow[], prime: Map<string, PrimeRef>): UpsertPayload {
  const clubs = [...new Set(rated.map((r) => r.clubName))].sort()
  const playerNames = [...new Set(rated.map((r) => r.playerName))].sort()

  const players = playerNames.map((name) => {
    const ref = prime.get(name)
    if (!ref) throw new Error(`No prime season for player: ${name}`)
    return { name, primeSeason: ref.season, primeCompetition: ref.competition }
  })

  const playerSeasons: PlayerSeasonPayload[] = rated.map((r) => ({
    playerName: r.playerName,
    clubName: r.clubName,
    season: r.season,
    competition: r.competition,
    position: r.stats.position,
    tier: r.tier,
    minutes: r.stats.minutes,
    matches: r.stats.matches,
    goals: r.stats.goals,
    assists: r.stats.assists,
    xG: r.stats.xG,
    xA: r.stats.xA,
    tacklesInterceptions: r.stats.tacklesInterceptions,
    progressivePasses: r.stats.progressivePasses,
    passCompletionPct: r.stats.passCompletionPct,
    savePct: r.stats.savePct,
    cleanSheets: r.stats.cleanSheets,
    goalsConcededPer90: r.stats.goalsConcededPer90,
    marketValue: r.stats.marketValue,
    ratingComputed: r.ratingComputed,
    reliability: r.reliability,
  }))

  return { clubs, players, playerSeasons }
}
