import { describe, it, expect } from 'vitest'
import { reliabilityFor } from './reliability'
import { PlayerSeasonStats } from './types'

const base: PlayerSeasonStats = {
  playerId: 'p1', seasonId: '2020-21', position: 'CM',
  minutes: 1800, matches: 20, goals: 4, assists: 6,
}

describe('reliabilityFor', () => {
  it('returns 4 when rich tier has 4+ advanced stats', () => {
    const row = { ...base, xG: 3, xA: 4, tacklesInterceptions: 50, progressivePasses: 120, passCompletionPct: 88 }
    expect(reliabilityFor(row, 'rich')).toBe(4)
  })
  it('returns 3 when rich tier is missing advanced stats', () => {
    const row = { ...base, xG: 3 }
    expect(reliabilityFor(row, 'rich')).toBe(3)
  })
  it('returns 2 for basic tier with market value', () => {
    expect(reliabilityFor({ ...base, marketValue: 5_000_000 }, 'basic')).toBe(2)
  })
  it('returns 1 for basic tier without market value', () => {
    expect(reliabilityFor(base, 'basic')).toBe(1)
  })
})
