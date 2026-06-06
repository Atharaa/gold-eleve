import { describe, it, expect } from 'vitest'
import { buildUpsertPayload } from './payload'
import { RatedRow } from './types'
import { PrimeRef } from './prime'

function rated(playerName: string, club: string, season: string, competition: string, ratingComputed: number): RatedRow {
  return {
    playerName, clubName: club, season, competition,
    stats: { playerId: playerName, seasonId: season, position: 'ST', minutes: 2700, matches: 30, goals: 10, assists: 3, marketValue: 5_000_000 },
    tier: 'rich', ratingComputed, reliability: 4,
  }
}

describe('buildUpsertPayload', () => {
  const rows = [
    rated('A', 'PSG', '2018-19', 'L1', 80), rated('A', 'PSG', '2019-20', 'L1', 88),
    rated('B', 'Lyon', '2018-19', 'L1', 75),
  ]
  const prime = new Map<string, PrimeRef>([
    ['A', { season: '2019-20', competition: 'L1' }],
    ['B', { season: '2018-19', competition: 'L1' }],
  ])

  it('produces a deduplicated, sorted club list', () => {
    expect(buildUpsertPayload(rows, prime).clubs).toEqual(['Lyon', 'PSG'])
  })
  it('produces one player entry with its prime ref', () => {
    const payload = buildUpsertPayload(rows, prime)
    expect(payload.players).toContainEqual({ name: 'A', primeSeason: '2019-20', primeCompetition: 'L1' })
    expect(payload.players).toHaveLength(2)
  })
  it('produces one player-season per rated row with rating fields', () => {
    const payload = buildUpsertPayload(rows, prime)
    expect(payload.playerSeasons).toHaveLength(3)
    const a1819 = payload.playerSeasons.find((p) => p.playerName === 'A' && p.season === '2018-19')!
    expect(a1819.ratingComputed).toBe(80)
    expect(a1819.reliability).toBe(4)
    expect(a1819.tier).toBe('rich')
    expect(a1819.marketValue).toBe(5_000_000)
  })
  it('throws if a player has no prime ref', () => { expect(() => buildUpsertPayload(rows, new Map())).toThrow() })
})
