import { describe, it, expect } from 'vitest'
import { seasonStartYear } from './seasons'

describe('seasonStartYear', () => {
  it('extracts the start year from "2018-19"', () => { expect(seasonStartYear('2018-19')).toBe(2018) })
  it('extracts the start year from "2002-2003"', () => { expect(seasonStartYear('2002-2003')).toBe(2002) })
  it('trims whitespace', () => { expect(seasonStartYear('  2020-21 ')).toBe(2020) })
  it('throws on a malformed season', () => { expect(() => seasonStartYear('saison')).toThrow() })
})
