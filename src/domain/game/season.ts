import { simulateMatch } from './match'
import { TableRow } from './types'

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

// Double round-robin. Chaque paire ordonnée (i, j), i != j, est une rencontre
// distincte (i à domicile) ; la rencontre retour est l'itération (j, i). À chaque
// rencontre on met à jour les DEUX équipes (domicile ET extérieur), sinon les
// stats à l'extérieur ne seraient jamais comptées (played = N-1 au lieu de 2*(N-1),
// et gf != ga sur l'ensemble du championnat).
export function playSeason(rng: () => number, teams: TeamSeed[]): TableRow[] {
  const rows = teams.map(emptyRow)
  for (let i = 0; i < teams.length; i++) {
    for (let j = 0; j < teams.length; j++) {
      if (i === j) continue
      const [goalsHome, goalsAway] = simulateMatch(rng, teams[i].strength, teams[j].strength)
      applyResult(rows[i], goalsHome, goalsAway)
      applyResult(rows[j], goalsAway, goalsHome)
    }
  }
  return rows
}

export function buildTable(rows: TableRow[]): TableRow[] {
  const sorted = [...rows].sort(
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
