import { describe, it, expect } from 'vitest'
import { listChallenges, getChallenge } from './challenges'

describe('challenge catalogue', () => {
  it('lists several challenges including "libre"', () => {
    const all = listChallenges()
    expect(all.length).toBeGreaterThanOrEqual(3)
    expect(all.some((c) => c.id === 'libre')).toBe(true)
  })
  it('every challenge has at least one objective with positive points', () => {
    for (const c of listChallenges()) {
      expect(c.objectives.length).toBeGreaterThan(0)
      expect(c.objectives.every((o) => o.points > 0)).toBe(true)
    }
  })
  it('getChallenge returns the matching challenge', () => {
    expect(getChallenge('modeste').id).toBe('modeste')
  })
  it('getChallenge falls back to "libre" for an unknown id', () => {
    expect(getChallenge('does-not-exist').id).toBe('libre')
  })
  it('only the "modeste" challenge restricts the draft (others have no constraints, sample-safe)', () => {
    const modeste = getChallenge('modeste')
    expect(modeste.constraints.length).toBeGreaterThan(0)
    for (const c of listChallenges().filter((x) => x.id !== 'modeste')) {
      expect(c.constraints).toHaveLength(0)
    }
  })
})
