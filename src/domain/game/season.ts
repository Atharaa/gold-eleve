import { simulateMatch } from './match'
import { Match, Matchday, TableRow } from './types'
import { roundRobinSchedule } from './schedule'

export interface TeamSeed {
  name: string
  strength: number
  isUser: boolean
}

function emptyRow(seed: TeamSeed): TableRow {
  return { name: seed.name, isUser: seed.isUser, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, cleanSheets: 0 }
}

function applyResult(row: TableRow, scored: number, conceded: number): void {
  row.played++
  row.gf += scored
  row.ga += conceded
  if (conceded === 0) row.cleanSheets++
  if (scored > conceded) {
    row.won++
    row.points += 3
  } else if (scored === conceded) {
    row.drawn++
    row.points++
  } else {
    row.lost++
  }
}

export function playSeasonByMatchday(rng: () => number, teams: TeamSeed[]): Matchday[] {
  const schedule = roundRobinSchedule(teams.length)
  return schedule.map((pairs, index) => ({
    round: index + 1,
    matches: pairs.map(([h, a]): Match => {
      const [homeGoals, awayGoals] = simulateMatch(rng, teams[h].strength, teams[a].strength)
      return { home: teams[h].name, away: teams[a].name, homeGoals, awayGoals }
    }),
  }))
}

export function accumulateStandings(matchdays: Matchday[], teams: TeamSeed[]): TableRow[] {
  const rows = teams.map(emptyRow)
  const byName = new Map(rows.map((r) => [r.name, r]))
  for (const md of matchdays) {
    for (const m of md.matches) {
      const home = byName.get(m.home)
      const away = byName.get(m.away)
      if (home) applyResult(home, m.homeGoals, m.awayGoals)
      if (away) applyResult(away, m.awayGoals, m.homeGoals)
    }
  }
  return rows
}

export function standingsAfter(matchdays: Matchday[], teams: TeamSeed[], uptoRound: number): TableRow[] {
  return buildTable(accumulateStandings(matchdays.filter((m) => m.round <= uptoRound), teams))
}

export function playSeason(rng: () => number, teams: TeamSeed[]): TableRow[] {
  return accumulateStandings(playSeasonByMatchday(rng, teams), teams)
}

export function buildTable(rows: TableRow[]): TableRow[] {
  const sorted = rows.map((row) => ({ ...row })).sort(
    (a, b) =>
      b.points - a.points ||
      b.gf - b.ga - (a.gf - a.ga) ||
      b.gf - a.gf ||
      a.name.localeCompare(b.name),
  )
  sorted.forEach((row, index) => {
    row.position = index + 1
  })
  return sorted
}
