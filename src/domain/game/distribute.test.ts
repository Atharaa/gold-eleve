import { describe, it, expect } from 'vitest'
import { goalWeight, assistWeight, distribute } from './distribute'
import { createRng } from './rng'
import { PoolPlayer } from './types'

function player(id: string, group: PoolPlayer['positionGroup'], rating = 80): PoolPlayer {
  return { playerId: id, playerName: id, clubName: 'Club', season: '2018-19', competition: 'L1', positionGroup: group, rating, reliability: 4 }
}

describe('weights', () => {
  it('weights attackers above midfielders above defenders for goals', () => {
    expect(goalWeight(player('a', 'ATT'))).toBeGreaterThan(goalWeight(player('b', 'MID')))
    expect(goalWeight(player('b', 'MID'))).toBeGreaterThan(goalWeight(player('c', 'DEF')))
  })
  it('gives goalkeepers zero goal weight', () => {
    expect(goalWeight(player('gk', 'GK'))).toBe(0)
  })
  it('weights midfielders highest for assists', () => {
    expect(assistWeight(player('m', 'MID'))).toBeGreaterThan(assistWeight(player('a', 'ATT')))
  })
})

describe('distribute', () => {
  const team = [player('gk', 'GK'), player('def', 'DEF'), player('mid', 'MID'), player('att', 'ATT')]

  it('distributes exactly the total count', () => {
    const counts = distribute(createRng(1), team, 30, goalWeight)
    const sum = [...counts.values()].reduce((a, b) => a + b, 0)
    expect(sum).toBe(30)
  })
  it('never assigns goals to a zero-weight player', () => {
    const counts = distribute(createRng(1), team, 30, goalWeight)
    expect(counts.get('gk')).toBeUndefined()
  })
  it('gives the attacker more goals than the defender over a large sample', () => {
    const counts = distribute(createRng(7), team, 500, goalWeight)
    expect((counts.get('att') ?? 0)).toBeGreaterThan(counts.get('def') ?? 0)
  })
  it('returns an empty map when no player has positive weight', () => {
    const counts = distribute(createRng(1), [player('gk', 'GK')], 10, goalWeight)
    expect(counts.size).toBe(0)
  })
})
