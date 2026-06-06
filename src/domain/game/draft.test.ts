import { describe, it, expect } from 'vitest'
import { proposeCandidates, teamRating } from './draft'
import { createRng } from './rng'
import { oneClubPerTeam } from './constraints'
import { PoolPlayer } from './types'

function player(id: string, group: PoolPlayer['positionGroup'], club = 'Club', rating = 80): PoolPlayer {
  return { playerId: id, playerName: id, clubName: club, season: '2018-19', competition: 'L1', positionGroup: group, rating, reliability: 4 }
}

const pool: PoolPlayer[] = [
  player('gk1', 'GK'), player('def1', 'DEF'), player('def2', 'DEF'),
  player('mid1', 'MID'), player('mid2', 'MID'), player('mid3', 'MID'),
  player('att1', 'ATT'), player('att2', 'ATT'),
]

describe('proposeCandidates', () => {
  it('only proposes players of the requested position group', () => {
    const candidates = proposeCandidates(pool, 'MID', [], createRng(1))
    expect(candidates.every((c) => c.positionGroup === 'MID')).toBe(true)
  })
  it('defaults to 3 candidates', () => {
    expect(proposeCandidates(pool, 'MID', [], createRng(1))).toHaveLength(3)
  })
  it('excludes already-picked players', () => {
    const picked = [pool.find((p) => p.playerId === 'mid1')!]
    const candidates = proposeCandidates(pool, 'MID', picked, createRng(1))
    expect(candidates.some((c) => c.playerId === 'mid1')).toBe(false)
  })
  it('is deterministic for a given seed', () => {
    const a = proposeCandidates(pool, 'MID', [], createRng(5)).map((c) => c.playerId)
    const b = proposeCandidates(pool, 'MID', [], createRng(5)).map((c) => c.playerId)
    expect(a).toEqual(b)
  })
  it('respects constraints (one per club)', () => {
    const clubPool = [player('a', 'ATT', 'PSG'), player('b', 'ATT', 'PSG'), player('c', 'ATT', 'PSG')]
    const picked = [player('x', 'GK', 'PSG')]
    const candidates = proposeCandidates(clubPool, 'ATT', picked, createRng(2), { constraints: [oneClubPerTeam] })
    expect(candidates).toHaveLength(0)
  })
})

describe('teamRating', () => {
  it('is the rounded average of player ratings', () => {
    expect(teamRating([player('a', 'ATT', 'Club', 90), player('b', 'ATT', 'Club', 81)])).toBe(86)
  })
  it('is 0 for an empty team', () => {
    expect(teamRating([])).toBe(0)
  })
})
