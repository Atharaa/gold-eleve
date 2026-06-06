import { describe, it, expect } from 'vitest'
import { computeSeasonRatings, selectPrimeSeason, effectiveRating } from './index'
import type { PlayerSeasonStats, RatedSeason } from './index'

describe('ratings integration', () => {
  it('a star season outranks a journeyman season, end to end', () => {
    const cohort: PlayerSeasonStats[] = [
      { playerId: 'ibra', seasonId: '2012-13', position: 'ST', minutes: 3100, matches: 34, goals: 30, assists: 8, xG: 24, xA: 6, passCompletionPct: 78, progressivePasses: 90, tacklesInterceptions: 20 },
      { playerId: 'journeyman', seasonId: '2012-13', position: 'ST', minutes: 1500, matches: 22, goals: 4, assists: 2, xG: 5, xA: 2, passCompletionPct: 70, progressivePasses: 40, tacklesInterceptions: 10 },
    ]
    const results = computeSeasonRatings(cohort, 'rich')
    const byId = Object.fromEntries(results.map((r) => [r.playerId, r]))
    expect(byId.ibra.ratingComputed).toBeGreaterThan(byId.journeyman.ratingComputed)
    expect(byId.ibra.reliability).toBe(4)
  })

  it('prime season is the best effective rating across a career', () => {
    const career: RatedSeason[] = [
      { seasonId: '2010-11', ratingComputed: 84 },
      { seasonId: '2012-13', ratingComputed: 92 },
      { seasonId: '2014-15', ratingComputed: 88 },
    ]
    const prime = selectPrimeSeason(career)
    expect(prime).toBe('2012-13')
    expect(effectiveRating(career.find((s) => s.seasonId === prime)!)).toBe(92)
  })
})
