import { describe, it, expect } from 'vitest'
import { assembleScorers, assembleKeepers, assembleBestRated } from './rankings'
import { createRng } from './rng'
import { PoolPlayer, TableRow } from './types'
import { Opponent } from './match'

function player(id: string, group: PoolPlayer['positionGroup'], rating = 80): PoolPlayer {
  return { playerId: id, playerName: id, clubName: 'User', season: '2018-19', competition: 'L1', positionGroup: group, rating, reliability: 4 }
}

const team = [player('gk', 'GK', 85), player('def', 'DEF', 70), player('mid', 'MID', 82), player('att', 'ATT', 90)]
const userRow: TableRow = { name: 'User', isUser: true, played: 6, won: 4, drawn: 1, lost: 1, gf: 12, ga: 5, points: 13, cleanSheets: 3, position: 2 }
const opponentRows: TableRow[] = [
  { name: 'B', isUser: false, played: 6, won: 5, drawn: 0, lost: 1, gf: 14, ga: 4, points: 15, cleanSheets: 4, position: 1 },
  { name: 'C', isUser: false, played: 6, won: 1, drawn: 1, lost: 4, gf: 5, ga: 13, points: 4, cleanSheets: 1, position: 3 },
]

describe('assembleScorers', () => {
  it('caps at 10 entries and is sorted descending by goals', () => {
    const scorers = assembleScorers(createRng(1), team, userRow, opponentRows)
    expect(scorers.length).toBeLessThanOrEqual(10)
    for (let i = 1; i < scorers.length; i++) {
      expect(scorers[i - 1].value).toBeGreaterThanOrEqual(scorers[i].value)
    }
  })
  it('includes at least one user player flagged isUser', () => {
    const scorers = assembleScorers(createRng(1), team, userRow, opponentRows)
    expect(scorers.some((s) => s.isUser)).toBe(true)
  })
  it("user scorers' goals sum to the user team goals for", () => {
    const scorers = assembleScorers(createRng(1), team, userRow, opponentRows)
    const userGoals = scorers.filter((s) => s.isUser).reduce((a, s) => a + s.value, 0)
    // les buteurs user listés peuvent être tronqués par le top 10, mais avec 4 joueurs ils tiennent tous
    expect(userGoals).toBe(12)
  })
})

describe('assembleKeepers', () => {
  it('uses the user goalkeeper clean sheets and flags isUser', () => {
    const keepers = assembleKeepers(team, userRow, opponentRows)
    const userKeeper = keepers.find((k) => k.isUser)
    expect(userKeeper?.playerName).toBe('gk')
    expect(userKeeper?.value).toBe(3)
  })
})

describe('assembleBestRated', () => {
  it('returns the highest-rated entry across user and opponents', () => {
    const opponents: Opponent[] = [{ name: 'B', strength: 88 }, { name: 'C', strength: 60 }]
    const best = assembleBestRated(team, userRow, opponents)
    // meilleur joueur user = att (90) > meilleure force adverse (88)
    expect(best.value).toBe(90)
    expect(best.isUser).toBe(true)
  })
})
