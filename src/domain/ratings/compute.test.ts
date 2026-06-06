import { describe, it, expect } from 'vitest'
import { computeSeasonRatings } from './compute'
import { PlayerSeasonStats } from './types'

const cohort: PlayerSeasonStats[] = [
  { playerId: 'star', seasonId: '2020-21', position: 'ST', minutes: 3000, matches: 34, goals: 30, assists: 10, xG: 25, xA: 8 },
  { playerId: 'mid', seasonId: '2020-21', position: 'ST', minutes: 2500, matches: 30, goals: 12, assists: 5, xG: 11, xA: 4 },
  { playerId: 'sub', seasonId: '2020-21', position: 'ST', minutes: 800, matches: 20, goals: 2, assists: 1, xG: 2, xA: 1 },
]

describe('computeSeasonRatings (rich)', () => {
  const results = computeSeasonRatings(cohort, 'rich')
  it('returns one result per player', () => { expect(results).toHaveLength(3) })
  it('ranks the prolific striker highest', () => {
    const byId = Object.fromEntries(results.map((r) => [r.playerId, r.ratingComputed]))
    expect(byId.star).toBeGreaterThan(byId.mid)
    expect(byId.mid).toBeGreaterThan(byId.sub)
  })
  it('keeps ratings within 40..99', () => {
    for (const r of results) {
      expect(r.ratingComputed).toBeGreaterThanOrEqual(40)
      expect(r.ratingComputed).toBeLessThanOrEqual(99)
    }
  })
  it('tags the tier', () => { expect(results[0].tier).toBe('rich') })
  it('returns empty for empty cohort', () => { expect(computeSeasonRatings([], 'rich')).toEqual([]) })
})

describe('computeSeasonRatings (basic)', () => {
  const basicCohort: PlayerSeasonStats[] = [
    { playerId: 'expensive', seasonId: '2005-06', position: 'ST', minutes: 3000, matches: 34, goals: 20, assists: 6, marketValue: 40_000_000 },
    { playerId: 'cheap', seasonId: '2005-06', position: 'ST', minutes: 2000, matches: 28, goals: 5, assists: 2, marketValue: 2_000_000 },
  ]
  it('ranks the more valuable, prolific player higher', () => {
    const results = computeSeasonRatings(basicCohort, 'basic')
    const byId = Object.fromEntries(results.map((r) => [r.playerId, r.ratingComputed]))
    expect(byId.expensive).toBeGreaterThan(byId.cheap)
  })
})
