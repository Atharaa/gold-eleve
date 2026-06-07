import { createRng } from './rng'
import { teamRating } from './draft'
import { generateOpponents } from './match'
import { playSeasonByMatchday, accumulateStandings, buildTable, TeamSeed } from './season'
import { assembleScorers, assembleAssisters, assembleKeepers, assembleBestRated } from './rankings'
import { PoolPlayer, SeasonResult } from './types'

export interface SimulateOptions {
  seed: number
  teamName?: string
  opponents?: number
}

export function simulateSeason(team: PoolPlayer[], options: SimulateOptions): SeasonResult {
  if (team.length === 0) throw new Error('simulateSeason: team must not be empty')
  const rng = createRng(options.seed)
  const opponentCount = options.opponents ?? 17
  const teamName = options.teamName ?? 'Ton équipe'

  const opponents = generateOpponents(rng, opponentCount)
  const seeds: TeamSeed[] = [
    { name: teamName, strength: teamRating(team), isUser: true },
    ...opponents.map((o) => ({ name: o.name, strength: o.strength, isUser: false })),
  ]

  const matchdays = playSeasonByMatchday(rng, seeds)
  const table = buildTable(accumulateStandings(matchdays, seeds))
  const userRow = table.find((r) => r.isUser)!
  const opponentRows = table.filter((r) => !r.isUser)

  return {
    table,
    userRow,
    invincible: userRow.lost === 0,
    scorers: assembleScorers(rng, team, userRow, opponentRows),
    assisters: assembleAssisters(rng, team, userRow, opponentRows),
    keepers: assembleKeepers(team, userRow, opponentRows),
    bestRated: assembleBestRated(team, userRow, opponents),
    matchdays,
  }
}
