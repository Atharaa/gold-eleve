import { describe, it, expect } from 'vitest'
import { createRng, randomInt, pickN, poisson } from './rng'

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('produces floats in [0, 1)', () => {
    const rng = createRng(1)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('randomInt', () => {
  it('stays within [0, maxExclusive)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 100; i++) {
      const v = randomInt(rng, 5)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(5)
      expect(Number.isInteger(v)).toBe(true)
    }
  })
})

describe('pickN', () => {
  it('returns n distinct items when the pool is large enough', () => {
    const rng = createRng(3)
    const picked = pickN(rng, [1, 2, 3, 4, 5], 3)
    expect(picked).toHaveLength(3)
    expect(new Set(picked).size).toBe(3)
  })
  it('returns at most the pool size', () => {
    const rng = createRng(3)
    expect(pickN(rng, [1, 2], 5)).toHaveLength(2)
  })
  it('does not mutate the input array', () => {
    const rng = createRng(3)
    const input = [1, 2, 3, 4]
    pickN(rng, input, 2)
    expect(input).toEqual([1, 2, 3, 4])
  })
})

describe('poisson', () => {
  it('returns a non-negative integer', () => {
    const rng = createRng(9)
    for (let i = 0; i < 50; i++) {
      const v = poisson(rng, 1.4)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(v)).toBe(true)
    }
  })
  it('has a sample mean close to lambda over many draws', () => {
    const rng = createRng(123)
    let sum = 0
    const n = 5000
    for (let i = 0; i < n; i++) sum += poisson(rng, 2)
    expect(sum / n).toBeGreaterThan(1.7)
    expect(sum / n).toBeLessThan(2.3)
  })
})
