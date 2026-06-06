import { PositionGroup } from '../ratings'
import { PoolPlayer } from './types'

const GOAL_FACTOR: Record<PositionGroup, number> = { ATT: 1, MID: 0.45, DEF: 0.12, GK: 0 }
const ASSIST_FACTOR: Record<PositionGroup, number> = { ATT: 0.6, MID: 1, DEF: 0.3, GK: 0 }

export function goalWeight(player: PoolPlayer): number {
  return player.rating * GOAL_FACTOR[player.positionGroup]
}

export function assistWeight(player: PoolPlayer): number {
  return player.rating * ASSIST_FACTOR[player.positionGroup]
}

function weightedPick(rng: () => number, players: PoolPlayer[], weights: number[], total: number): PoolPlayer {
  let r = rng() * total
  for (let i = 0; i < players.length; i++) {
    r -= weights[i]
    if (r <= 0) return players[i]
  }
  return players[players.length - 1]
}

// Répartit `total` unités (buts/passes) entre les joueurs au prorata de leur poids.
export function distribute(
  rng: () => number,
  players: PoolPlayer[],
  total: number,
  weightFn: (p: PoolPlayer) => number,
): Map<string, number> {
  const counts = new Map<string, number>()
  const eligible = players.filter((p) => weightFn(p) > 0)
  if (eligible.length === 0) return counts

  const weights = eligible.map(weightFn)
  const weightTotal = weights.reduce((a, b) => a + b, 0)

  for (let i = 0; i < total; i++) {
    const player = weightedPick(rng, eligible, weights, weightTotal)
    counts.set(player.playerId, (counts.get(player.playerId) ?? 0) + 1)
  }
  return counts
}
