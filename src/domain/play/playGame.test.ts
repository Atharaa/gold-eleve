import { describe, it, expect } from 'vitest'
import { simulateFromPicks } from './playGame'
import { samplePool } from '../../data/samplePool'

describe('simulateFromPicks', () => {
  it('simulates a season from a list of picked players', () => {
    const picked = samplePool.slice(0, 11)
    const result = simulateFromPicks(picked, { seed: 1, teamName: 'Mon XI' })
    expect(result.table).toHaveLength(18)
    expect(result.userRow.name).toBe('Mon XI')
  })
  it('throws when there are no picks', () => {
    expect(() => simulateFromPicks([], { seed: 1 })).toThrow()
  })
})
