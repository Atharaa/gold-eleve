import { describe, it, expect } from 'vitest'
import { toPercentiles } from './percentile'

describe('toPercentiles', () => {
  it('returns empty for empty input', () => { expect(toPercentiles([])).toEqual([]) })
  it('returns 0.5 for a single value', () => { expect(toPercentiles([42])).toEqual([0.5]) })
  it('maps min to 0 and max to 1', () => {
    const result = toPercentiles([10, 20, 30])
    expect(result[0]).toBe(0)
    expect(result[2]).toBe(1)
  })
  it('ranks the middle value proportionally', () => {
    expect(toPercentiles([10, 20, 30])[1]).toBeCloseTo(0.5)
  })
  it('gives tied values the same rank', () => {
    const result = toPercentiles([10, 10, 30])
    expect(result[0]).toBe(0)
    expect(result[1]).toBe(0)
    expect(result[2]).toBe(1)
  })
})
