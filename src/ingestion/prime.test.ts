import { describe, it, expect } from 'vitest'
import { assignPrimeSeasons } from './prime'
import { RatedRow } from './types'

function rated(playerName: string, season: string, competition: string, ratingComputed: number): RatedRow {
  return {
    playerName, clubName: 'Club', season, competition,
    stats: { playerId: playerName, seasonId: season, position: 'ST', minutes: 2700, matches: 30, goals: 10, assists: 3 },
    tier: 'rich', ratingComputed, reliability: 4,
  }
}

describe('assignPrimeSeasons', () => {
  it('picks each player best-rated (season, competition)', () => {
    const rows = [
      rated('A', '2018-19', 'L1', 80), rated('A', '2019-20', 'L1', 88),
      rated('A', '2017-18', 'L2', 70), rated('B', '2018-19', 'L1', 75),
    ]
    const prime = assignPrimeSeasons(rows)
    expect(prime.get('A')).toEqual({ season: '2019-20', competition: 'L1' })
    expect(prime.get('B')).toEqual({ season: '2018-19', competition: 'L1' })
  })
})
