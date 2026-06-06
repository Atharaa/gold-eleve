import { distribute, goalWeight, assistWeight } from './distribute'
import { Opponent } from './match'
import { PoolPlayer, RankRow, TableRow } from './types'

function topTen(rows: RankRow[]): RankRow[] {
  return [...rows]
    .sort((a, b) => b.value - a.value || a.playerName.localeCompare(b.playerName))
    .slice(0, 10)
}

function userRankRows(
  rng: () => number,
  team: PoolPlayer[],
  userRow: TableRow,
  total: number,
  weightFn: (p: PoolPlayer) => number,
): RankRow[] {
  const counts = distribute(rng, team, total, weightFn)
  return team
    .filter((p) => counts.has(p.playerId))
    .map((p) => ({ playerName: p.playerName, club: userRow.name, value: counts.get(p.playerId)!, isUser: true }))
}

export function assembleScorers(rng: () => number, team: PoolPlayer[], userRow: TableRow, opponentRows: TableRow[]): RankRow[] {
  const user = userRankRows(rng, team, userRow, userRow.gf, goalWeight)
  const opponents = opponentRows.map((r) => ({
    playerName: `Buteur ${r.name}`,
    club: r.name,
    value: Math.round(r.gf * 0.35),
    isUser: false,
  }))
  return topTen([...user, ...opponents])
}

export function assembleAssisters(rng: () => number, team: PoolPlayer[], userRow: TableRow, opponentRows: TableRow[]): RankRow[] {
  const user = userRankRows(rng, team, userRow, Math.round(userRow.gf * 0.7), assistWeight)
  const opponents = opponentRows.map((r) => ({
    playerName: `Passeur ${r.name}`,
    club: r.name,
    value: Math.round(r.gf * 0.25),
    isUser: false,
  }))
  return topTen([...user, ...opponents])
}

export function assembleKeepers(team: PoolPlayer[], userRow: TableRow, opponentRows: TableRow[]): RankRow[] {
  const keeper = team.find((p) => p.positionGroup === 'GK')
  const user: RankRow[] = keeper
    ? [{ playerName: keeper.playerName, club: userRow.name, value: userRow.cleanSheets, isUser: true }]
    : []
  const opponents = opponentRows.map((r) => ({
    playerName: `Gardien ${r.name}`,
    club: r.name,
    value: r.cleanSheets,
    isUser: false,
  }))
  return topTen([...user, ...opponents])
}

export function assembleBestRated(team: PoolPlayer[], userRow: TableRow, opponents: Opponent[]): RankRow {
  const userBest = team.reduce((best, p) => (p.rating > best.rating ? p : best))
  const candidates: RankRow[] = [
    { playerName: userBest.playerName, club: userRow.name, value: userBest.rating, isUser: true },
    ...opponents.map((o) => ({ playerName: `Cadre ${o.name}`, club: o.name, value: o.strength, isUser: false })),
  ]
  return topTen(candidates)[0]
}
