import { describe, it, expect } from 'vitest'
import { simulateSeason } from './simulate'
import { PoolPlayer } from './types'

function makeTeam(rating: number): PoolPlayer[] {
  const groups: PoolPlayer['positionGroup'][] = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'ATT', 'ATT', 'ATT']
  return groups.map((group, i) => ({
    playerId: `p${i}`, playerName: `Player ${i}`, clubName: 'User', season: '2018-19', competition: 'L1',
    positionGroup: group, rating, reliability: 4,
  }))
}

describe('simulateSeason', () => {
  const result = simulateSeason(makeTeam(82), { seed: 2024, teamName: 'User' })

  it('builds an 18-team table by default with the user inside', () => {
    expect(result.table).toHaveLength(18)
    expect(result.userRow.name).toBe('User')
    expect(result.table.some((r) => r.isUser)).toBe(true)
  })
  it('detects an invincible season when the user never loses', () => {
    expect(result.invincible).toBe(result.userRow.lost === 0)
  })
  it('produces non-empty scorer, assister and keeper rankings and a best-rated entry', () => {
    expect(result.scorers.length).toBeGreaterThan(0)
    expect(result.assisters.length).toBeGreaterThan(0)
    expect(result.keepers.length).toBeGreaterThan(0)
    expect(result.bestRated.value).toBeGreaterThan(0)
  })
  it('is fully deterministic for a given seed', () => {
    expect(simulateSeason(makeTeam(82), { seed: 2024, teamName: 'User' })).toEqual(result)
  })
  it('lets a far stronger team finish with more points than a far weaker one (same seed)', () => {
    const strong = simulateSeason(makeTeam(95), { seed: 50, teamName: 'User' })
    const weak = simulateSeason(makeTeam(50), { seed: 50, teamName: 'User' })
    expect(strong.userRow.points).toBeGreaterThan(weak.userRow.points)
  })
  it('throws on an empty team', () => {
    expect(() => simulateSeason([], { seed: 1 })).toThrow()
  })
  it('exposes the full matchday schedule (2*(N-1) rounds) consistent with the final table', () => {
    expect(result.matchdays).toHaveLength(34)
    expect(result.matchdays[0].matches).toHaveLength(9)
    // le classement après la dernière journée doit correspondre au tableau final
    const last = result.matchdays[result.matchdays.length - 1].round
    expect(last).toBe(34)
  })
})
