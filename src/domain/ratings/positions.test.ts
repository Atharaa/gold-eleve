import { describe, it, expect } from 'vitest'
import { toPositionGroup } from './positions'

describe('toPositionGroup', () => {
  it('maps goalkeeper', () => { expect(toPositionGroup('GK')).toBe('GK') })
  it('maps defenders', () => {
    expect(toPositionGroup('CB')).toBe('DEF')
    expect(toPositionGroup('lb')).toBe('DEF')
  })
  it('maps midfielders', () => {
    expect(toPositionGroup('CM')).toBe('MID')
    expect(toPositionGroup('AM')).toBe('MID')
  })
  it('maps attackers', () => {
    expect(toPositionGroup('ST')).toBe('ATT')
    expect(toPositionGroup('LW')).toBe('ATT')
  })
  it('throws on unknown position', () => { expect(() => toPositionGroup('XYZ')).toThrow() })
})
