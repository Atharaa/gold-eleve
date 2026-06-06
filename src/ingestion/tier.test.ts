import { describe, it, expect } from 'vitest'
import { classifyTier } from './tier'

describe('classifyTier', () => {
  it('L1 from 2017-18 onward is rich', () => {
    expect(classifyTier({ competition: 'L1', season: '2017-18' })).toBe('rich')
    expect(classifyTier({ competition: 'L1', season: '2022-23' })).toBe('rich')
  })
  it('L1 before 2017 is basic', () => {
    expect(classifyTier({ competition: 'L1', season: '2016-17' })).toBe('basic')
    expect(classifyTier({ competition: 'L1', season: '2003-04' })).toBe('basic')
  })
  it('L2 is always basic', () => {
    expect(classifyTier({ competition: 'L2', season: '2020-21' })).toBe('basic')
  })
})
