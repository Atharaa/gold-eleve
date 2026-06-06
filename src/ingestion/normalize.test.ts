import { describe, it, expect } from 'vitest'
import { toNormalizedRow } from './normalize'
import { RawSeasonRow } from './csv'

const full: RawSeasonRow = {
  player: 'Kylian Mbappe', club: 'PSG', season: '2018-19', competition: 'L1', position: 'ST',
  minutes: '2700', matches: '29', goals: '33', assists: '7',
  xg: '28', xa: '6', tackles_interceptions: '12', progressive_passes: '80',
  pass_completion_pct: '82', save_pct: '', clean_sheets: '', goals_conceded_per90: '', market_value: '180000000',
}

describe('toNormalizedRow', () => {
  it('maps required fields and metadata', () => {
    const row = toNormalizedRow(full)
    expect(row.playerName).toBe('Kylian Mbappe')
    expect(row.clubName).toBe('PSG')
    expect(row.season).toBe('2018-19')
    expect(row.competition).toBe('L1')
    expect(row.stats.position).toBe('ST')
    expect(row.stats.minutes).toBe(2700)
    expect(row.stats.goals).toBe(33)
  })
  it('coerces present optional numbers and leaves blanks undefined', () => {
    const row = toNormalizedRow(full)
    expect(row.stats.xG).toBe(28)
    expect(row.stats.marketValue).toBe(180000000)
    expect(row.stats.savePct).toBeUndefined()
    expect(row.stats.cleanSheets).toBeUndefined()
  })
  it('uses player name and season as provisional ids', () => {
    const row = toNormalizedRow(full)
    expect(row.stats.playerId).toBe('Kylian Mbappe')
    expect(row.stats.seasonId).toBe('2018-19')
  })
  it('throws when a required text field is missing', () => { expect(() => toNormalizedRow({ ...full, player: '' })).toThrow() })
  it('throws when a required numeric field is missing', () => { expect(() => toNormalizedRow({ ...full, minutes: '' })).toThrow() })
})
