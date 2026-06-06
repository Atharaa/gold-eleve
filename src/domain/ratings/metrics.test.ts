import { describe, it, expect } from 'vitest'
import { metricValue } from './metrics'
import { PlayerSeasonStats } from './types'

const base: PlayerSeasonStats = {
  playerId: 'p1', seasonId: '2020-21', position: 'ST',
  minutes: 1800, matches: 20, goals: 10, assists: 5,
}

describe('metricValue', () => {
  it('computes goals per 90', () => { expect(metricValue(base, 'goals')).toBeCloseTo(0.5) })
  it('returns 0 for missing advanced metric', () => { expect(metricValue(base, 'xG')).toBe(0) })
  it('returns raw percentage for passCompletionPct', () => {
    expect(metricValue({ ...base, passCompletionPct: 88 }, 'passCompletionPct')).toBe(88)
  })
  it('inverts goals conceded so lower is better', () => {
    expect(metricValue({ ...base, goalsConcededPer90: 1.2 }, 'goalsConcededInv')).toBe(-1.2)
  })
  it('returns total minutes for minutes metric', () => { expect(metricValue(base, 'minutes')).toBe(1800) })
  it('returns 0 per90 when minutes is 0', () => {
    expect(metricValue({ ...base, minutes: 0 }, 'goals')).toBe(0)
  })
})
