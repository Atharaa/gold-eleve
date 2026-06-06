import { describe, it, expect } from 'vitest'
import { oneClubPerTeam, budgetCap, maxPlayerRating } from './constraints'
import { PoolPlayer } from './types'

function player(id: string, club: string, marketValue?: number): PoolPlayer {
  return {
    playerId: id, playerName: id, clubName: club, season: '2018-19', competition: 'L1',
    positionGroup: 'MID', rating: 80, reliability: 4, marketValue,
  }
}

describe('oneClubPerTeam', () => {
  it('allows a club not yet present', () => {
    expect(oneClubPerTeam.allows(player('a', 'PSG'), [player('b', 'Lyon')])).toBe(true)
  })
  it('blocks a club already present', () => {
    expect(oneClubPerTeam.allows(player('a', 'PSG'), [player('b', 'PSG')])).toBe(false)
  })
})

describe('budgetCap', () => {
  const cap = budgetCap(100)
  it('allows when the candidate fits under the cap', () => {
    expect(cap.allows(player('a', 'PSG', 40), [player('b', 'Lyon', 50)])).toBe(true)
  })
  it('blocks when the candidate would exceed the cap', () => {
    expect(cap.allows(player('a', 'PSG', 60), [player('b', 'Lyon', 50)])).toBe(false)
  })
  it('treats a missing market value as 0', () => {
    expect(cap.allows(player('a', 'PSG'), [player('b', 'Lyon', 50)])).toBe(true)
  })
})

describe('maxPlayerRating', () => {
  it('allows a candidate at or below the cap', () => {
    expect(maxPlayerRating(85).allows({ ...player('a', 'PSG'), rating: 85 }, [])).toBe(true)
    expect(maxPlayerRating(85).allows({ ...player('a', 'PSG'), rating: 80 }, [])).toBe(true)
  })
  it('blocks a candidate above the cap', () => {
    expect(maxPlayerRating(85).allows({ ...player('a', 'PSG'), rating: 90 }, [])).toBe(false)
  })
})
