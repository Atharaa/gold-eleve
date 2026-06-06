import { PoolPlayer } from './types'

export interface Constraint {
  name: string
  allows: (candidate: PoolPlayer, picked: PoolPlayer[]) => boolean
}

export const oneClubPerTeam: Constraint = {
  name: 'one-per-club',
  allows: (candidate, picked) => !picked.some((p) => p.clubName === candidate.clubName),
}

export function budgetCap(maxTotal: number): Constraint {
  return {
    name: `budget-${maxTotal}`,
    allows: (candidate, picked) => {
      const spent = picked.reduce((sum, p) => sum + (p.marketValue ?? 0), 0)
      return spent + (candidate.marketValue ?? 0) <= maxTotal
    },
  }
}

export function maxPlayerRating(cap: number): Constraint {
  return {
    name: `max-rating-${cap}`,
    allows: (candidate) => candidate.rating <= cap,
  }
}
