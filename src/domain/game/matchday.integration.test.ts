import { describe, it, expect } from 'vitest'
import { simulateSeason, standingsAfter, PoolPlayer } from './index'

function makeTeam(rating: number): PoolPlayer[] {
  const groups: PoolPlayer['positionGroup'][] = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'ATT', 'ATT', 'ATT']
  return groups.map((group, i) => ({
    playerId: `p${i}`, playerName: `Player ${i}`, clubName: 'User', season: '2018-19', competition: 'L1',
    positionGroup: group, rating, reliability: 4,
  }))
}

describe('matchday integration', () => {
  const result = simulateSeason(makeTeam(82), { seed: 2024, teamName: 'User' })

  it('the standings after the final matchday match the final table (order + points)', () => {
    const last = standingsAfter(result.matchdays, result.table.map((r) => ({ name: r.name, strength: 0, isUser: r.isUser })), 34)
    expect(last.map((r) => r.name)).toEqual(result.table.map((r) => r.name))
    expect(last.map((r) => r.points)).toEqual(result.table.map((r) => r.points))
  })
  it('the user total points only grows across the season', () => {
    let prev = -1
    for (let n = 0; n <= 34; n++) {
      const row = standingsAfter(result.matchdays, result.table.map((r) => ({ name: r.name, strength: 0, isUser: r.isUser })), n).find((r) => r.isUser)!
      expect(row.points).toBeGreaterThanOrEqual(prev)
      prev = row.points
    }
  })
})
