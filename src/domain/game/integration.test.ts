import { describe, it, expect } from 'vitest'
import { formationSlots, proposeCandidates, teamRating, simulateSeason, oneClubPerTeam, createRng } from './index'
import type { PoolPlayer } from './index'

// Construit un pool de 8 joueurs par groupe de poste, notes variées, clubs variés.
function buildPool(): PoolPlayer[] {
  const groups: PoolPlayer['positionGroup'][] = ['GK', 'DEF', 'MID', 'ATT']
  const pool: PoolPlayer[] = []
  for (const group of groups) {
    for (let i = 0; i < 8; i++) {
      pool.push({
        playerId: `${group}-${i}`, playerName: `${group} ${i}`, clubName: `${group}-club-${i}`,
        season: '2018-19', competition: 'L1', positionGroup: group, rating: 70 + i * 3, reliability: 4,
      })
    }
  }
  return pool
}

describe('game integration: draft a full XI then simulate', () => {
  it('drafts 11 players respecting the formation and one-per-club, then simulates a coherent season', () => {
    const pool = buildPool()
    const rng = createRng(2024)
    const slots = formationSlots('4-3-3')
    const picked: PoolPlayer[] = []

    for (const group of slots) {
      const candidates = proposeCandidates(pool, group, picked, rng, { constraints: [oneClubPerTeam] })
      expect(candidates.length).toBeGreaterThan(0)
      picked.push(candidates[0])
    }

    expect(picked).toHaveLength(11)
    // une seule équipe par club
    expect(new Set(picked.map((p) => p.clubName)).size).toBe(11)

    const result = simulateSeason(picked, { seed: 1, teamName: 'Mon XI' })
    expect(result.table).toHaveLength(18)
    expect(result.userRow.played).toBe(34)
    expect(teamRating(picked)).toBeGreaterThan(0)
  })
})
