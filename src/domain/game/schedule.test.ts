import { describe, it, expect } from 'vitest'
import { roundRobinSchedule } from './schedule'

describe('roundRobinSchedule', () => {
  it('produces 2*(n-1) rounds for an even team count', () => {
    expect(roundRobinSchedule(4)).toHaveLength(6)
    expect(roundRobinSchedule(18)).toHaveLength(34)
  })
  it('plays n/2 matches per round for an even team count', () => {
    for (const round of roundRobinSchedule(18)) {
      expect(round).toHaveLength(9)
    }
  })
  it('no team plays itself', () => {
    for (const round of roundRobinSchedule(6)) {
      for (const [home, away] of round) expect(home).not.toBe(away)
    }
  })
  it('no team appears twice in the same round', () => {
    for (const round of roundRobinSchedule(6)) {
      const seen = new Set<number>()
      for (const [home, away] of round) {
        expect(seen.has(home)).toBe(false)
        expect(seen.has(away)).toBe(false)
        seen.add(home)
        seen.add(away)
      }
    }
  })
  it('every ordered pair (i,j), i!=j, appears exactly once (full double round-robin)', () => {
    const n = 6
    const seen = new Set<string>()
    for (const round of roundRobinSchedule(n)) {
      for (const [home, away] of round) seen.add(`${home}-${away}`)
    }
    expect(seen.size).toBe(n * (n - 1))
  })
  it('handles an odd team count by giving each team a bye (fewer matches some rounds)', () => {
    const rounds = roundRobinSchedule(5)
    // each team plays 2*(5-1) = 8 matches across the schedule
    const counts = new Map<number, number>()
    for (const round of rounds) {
      for (const [home, away] of round) {
        counts.set(home, (counts.get(home) ?? 0) + 1)
        counts.set(away, (counts.get(away) ?? 0) + 1)
      }
    }
    for (let i = 0; i < 5; i++) expect(counts.get(i)).toBe(8)
  })
})
