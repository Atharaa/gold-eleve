import { describe, it, expect } from 'vitest'
import { samplePool, sampleSquads } from './samplePool'

describe('samplePool', () => {
  it('has at least 6 players in each position group', () => {
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
  it('every player has at least one eligible position', () => {
    for (const p of samplePool) {
      expect(p.eligiblePositions && p.eligiblePositions.length).toBeGreaterThan(0)
    }
  })
})

describe('sampleSquads', () => {
  it('exposes several full squads', () => {
    expect(sampleSquads.length).toBeGreaterThanOrEqual(4)
  })
  it('each squad covers all four position groups (so a draft can fill any slot)', () => {
    for (const s of sampleSquads) {
      for (const group of ['GK', 'DEF', 'MID', 'ATT'] as const) {
        expect(s.some((p) => (p.eligiblePositions ?? [p.positionGroup]).includes(group))).toBe(true)
      }
    }
  })
})
