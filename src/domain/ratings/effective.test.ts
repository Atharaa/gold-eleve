import { describe, it, expect } from 'vitest'
import { effectiveRating, selectPrimeSeason, RatedSeason } from './effective'

describe('effectiveRating', () => {
  it('uses the override when present', () => {
    expect(effectiveRating({ seasonId: 's1', ratingComputed: 80, ratingOverride: 90 })).toBe(90)
  })
  it('falls back to computed when no override', () => {
    expect(effectiveRating({ seasonId: 's1', ratingComputed: 80 })).toBe(80)
  })
  it('treats null override as absent', () => {
    expect(effectiveRating({ seasonId: 's1', ratingComputed: 80, ratingOverride: null })).toBe(80)
  })
})

describe('selectPrimeSeason', () => {
  const seasons: RatedSeason[] = [
    { seasonId: '2018-19', ratingComputed: 82 },
    { seasonId: '2019-20', ratingComputed: 88 },
    { seasonId: '2020-21', ratingComputed: 85 },
  ]
  it('picks the highest effective rating', () => { expect(selectPrimeSeason(seasons)).toBe('2019-20') })
  it('respects overrides when picking prime', () => {
    const withOverride: RatedSeason[] = [
      { seasonId: '2018-19', ratingComputed: 82, ratingOverride: 95 },
      { seasonId: '2019-20', ratingComputed: 88 },
    ]
    expect(selectPrimeSeason(withOverride)).toBe('2018-19')
  })
  it('throws when there are no seasons', () => { expect(() => selectPrimeSeason([])).toThrow() })
})
