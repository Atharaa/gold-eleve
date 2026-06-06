import { describe, it, expect } from 'vitest'
import { rowToPoolPlayer, rowsToPool } from './map'
import { DbSeasonRow } from './types'

const base: DbSeasonRow = {
  playerId: 'p1', playerName: 'Kylian Mbappe', clubName: 'PSG', season: '2018-19', competition: 'L1',
  position: 'ST', ratingComputed: 88, ratingOverride: null, reliability: 4, marketValue: 180000000,
}

describe('rowToPoolPlayer', () => {
  it('maps a DB row to a pool player', () => {
    const p = rowToPoolPlayer(base)
    expect(p.playerId).toBe('p1')
    expect(p.playerName).toBe('Kylian Mbappe')
    expect(p.positionGroup).toBe('ATT')
    expect(p.rating).toBe(88)
    expect(p.marketValue).toBe(180000000)
  })
  it('uses the admin override as the effective rating when present', () => {
    expect(rowToPoolPlayer({ ...base, ratingOverride: 95 }).rating).toBe(95)
  })
  it('treats a null market value as undefined', () => {
    expect(rowToPoolPlayer({ ...base, marketValue: null }).marketValue).toBeUndefined()
  })
  it('clamps reliability into 1..4', () => {
    expect(rowToPoolPlayer({ ...base, reliability: 9 }).reliability).toBe(4)
    expect(rowToPoolPlayer({ ...base, reliability: 0 }).reliability).toBe(1)
  })
})

describe('rowsToPool', () => {
  it('maps every row', () => {
    expect(rowsToPool([base, { ...base, playerId: 'p2', position: 'GK' }])).toHaveLength(2)
  })
})
