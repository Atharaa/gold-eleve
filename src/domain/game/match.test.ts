import { describe, it, expect } from 'vitest'
import { generateOpponents, expectedGoals, simulateMatch } from './match'
import { createRng } from './rng'

describe('generateOpponents', () => {
  it('generates the requested count with distinct names', () => {
    const opps = generateOpponents(createRng(1), 17)
    expect(opps).toHaveLength(17)
    expect(new Set(opps.map((o) => o.name)).size).toBe(17)
  })
  it('keeps strengths within a plausible band', () => {
    for (const o of generateOpponents(createRng(2), 17)) {
      expect(o.strength).toBeGreaterThanOrEqual(50)
      expect(o.strength).toBeLessThanOrEqual(92)
    }
  })
})

describe('expectedGoals', () => {
  it('gives equal teams the same baseline', () => {
    expect(expectedGoals(75, 75)).toBeCloseTo(1.35)
  })
  it('rewards a stronger attack', () => {
    expect(expectedGoals(90, 70)).toBeGreaterThan(expectedGoals(70, 90))
  })
})

describe('simulateMatch', () => {
  it('returns two non-negative integer goal counts', () => {
    const [a, b] = simulateMatch(createRng(3), 80, 70)
    expect(Number.isInteger(a)).toBe(true)
    expect(Number.isInteger(b)).toBe(true)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(b).toBeGreaterThanOrEqual(0)
  })
  it('lets the much stronger team outscore the weaker on average', () => {
    let strong = 0
    let weak = 0
    const rng = createRng(99)
    for (let i = 0; i < 2000; i++) {
      const [a, b] = simulateMatch(rng, 90, 55)
      strong += a
      weak += b
    }
    expect(strong).toBeGreaterThan(weak)
  })
})
