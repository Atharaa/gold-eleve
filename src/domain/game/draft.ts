import { PositionGroup } from '../ratings'
import { pickN } from './rng'
import { Constraint } from './constraints'
import { PoolPlayer } from './types'

export interface DraftOptions {
  candidatesPerSlot?: number
  constraints?: Constraint[]
}

export function proposeCandidates(
  pool: PoolPlayer[],
  group: PositionGroup,
  picked: PoolPlayer[],
  rng: () => number,
  options: DraftOptions = {},
): PoolPlayer[] {
  const n = options.candidatesPerSlot ?? 3
  const constraints = options.constraints ?? []
  const pickedIds = new Set(picked.map((p) => p.playerId))

  const eligible = pool.filter(
    (p) =>
      p.positionGroup === group &&
      !pickedIds.has(p.playerId) &&
      constraints.every((c) => c.allows(p, picked)),
  )

  return pickN(rng, eligible, n)
}

export function teamRating(team: PoolPlayer[]): number {
  if (team.length === 0) return 0
  return Math.round(team.reduce((sum, p) => sum + p.rating, 0) / team.length)
}
