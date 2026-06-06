import { describe, it, expect } from 'vitest'
import { samplePool } from './samplePool'

describe('samplePool', () => {
  it('has at least 6 players in each position group (enough to draft any formation)', () => {
    for (const group of ['GK', 'DEF', 'MID', 'ATT'] as const) {
      expect(samplePool.filter((p) => p.positionGroup === group).length).toBeGreaterThanOrEqual(6)
    }
  })
  it('has unique player ids', () => {
    expect(new Set(samplePool.map((p) => p.playerId)).size).toBe(samplePool.length)
  })
  it('has ratings within 40..99', () => {
    for (const p of samplePool) {
      expect(p.rating).toBeGreaterThanOrEqual(40)
      expect(p.rating).toBeLessThanOrEqual(99)
    }
  })
})
