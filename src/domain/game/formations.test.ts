import { describe, it, expect } from 'vitest'
import { formationSlots, FORMATION_NAMES } from './formations'

describe('formationSlots', () => {
  it('returns 11 slots for 4-3-3', () => {
    const slots = formationSlots('4-3-3')
    expect(slots).toHaveLength(11)
  })
  it('4-3-3 has 1 GK, 4 DEF, 3 MID, 3 ATT', () => {
    const slots = formationSlots('4-3-3')
    const count = (g: string) => slots.filter((s) => s === g).length
    expect(count('GK')).toBe(1)
    expect(count('DEF')).toBe(4)
    expect(count('MID')).toBe(3)
    expect(count('ATT')).toBe(3)
  })
  it('every known formation has exactly 11 slots and exactly 1 GK', () => {
    for (const name of FORMATION_NAMES) {
      const slots = formationSlots(name)
      expect(slots).toHaveLength(11)
      expect(slots.filter((s) => s === 'GK')).toHaveLength(1)
    }
  })
  it('returns a copy (mutating the result does not affect later calls)', () => {
    const slots = formationSlots('4-4-2')
    slots.pop()
    expect(formationSlots('4-4-2')).toHaveLength(11)
  })
  it('throws on an unknown formation', () => {
    expect(() => formationSlots('9-0-1')).toThrow()
  })
})
