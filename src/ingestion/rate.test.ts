import { describe, it, expect } from 'vitest'
import { rateAllSeasons } from './rate'
import { NormalizedRow } from './types'

function row(playerName: string, season: string, competition: string, position: string, goals: number, minutes = 2700): NormalizedRow {
  return {
    playerName, clubName: 'Club', season, competition,
    stats: { playerId: playerName, seasonId: season, position, minutes, matches: 30, goals, assists: 3 },
  }
}

describe('rateAllSeasons', () => {
  it('rates every row and tags tier per group', () => {
    const rows = [ row('A', '2018-19', 'L1', 'ST', 30), row('B', '2018-19', 'L1', 'ST', 5) ]
    const rated = rateAllSeasons(rows)
    expect(rated).toHaveLength(2)
    const byId = Object.fromEntries(rated.map((r) => [r.playerName, r]))
    expect(byId.A.tier).toBe('rich')
    expect(byId.A.ratingComputed).toBeGreaterThan(byId.B.ratingComputed)
  })
  it('normalizes within (position group, season, competition), not across them', () => {
    const rows = [ row('L1Star', '2018-19', 'L1', 'ST', 30), row('L2Star', '2018-19', 'L2', 'ST', 30) ]
    const rated = rateAllSeasons(rows)
    const tiers = Object.fromEntries(rated.map((r) => [r.playerName, r.tier]))
    expect(tiers.L1Star).toBe('rich')
    expect(tiers.L2Star).toBe('basic')
  })
  it('keeps goalkeepers and strikers in separate cohorts', () => {
    const rows = [ row('Keeper', '2018-19', 'L1', 'GK', 0), row('Striker', '2018-19', 'L1', 'ST', 20) ]
    expect(() => rateAllSeasons(rows)).not.toThrow()
    expect(rateAllSeasons(rows)).toHaveLength(2)
  })
})
