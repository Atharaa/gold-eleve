import { describe, it, expect } from 'vitest'
import { buildSquads, eligibleGroups, drawSquad } from './squad'
import { samplePool } from '../../data/samplePool'
import { createRng } from '../game'
import { PoolPlayer } from '../game'

function pl(id: string, club: string, season: string, group: PoolPlayer['positionGroup'], elig?: PoolPlayer['positionGroup'][]): PoolPlayer {
  return { playerId: id, playerName: id, clubName: club, season, competition: 'L1', positionGroup: group, rating: 80, reliability: 4, eligiblePositions: elig }
}

describe('buildSquads', () => {
  it('groups players by club + season + competition', () => {
    const pool = [pl('a', 'PSG', '2018-19', 'GK'), pl('b', 'PSG', '2018-19', 'ATT'), pl('c', 'Lyon', '2014-15', 'GK')]
    const squads = buildSquads(pool)
    expect(squads).toHaveLength(2)
    const psg = squads.find((s) => s.club === 'PSG')!
    expect(psg.players).toHaveLength(2)
    expect(psg.season).toBe('2018-19')
  })
  it('builds one squad per club-season in the sample pool', () => {
    expect(buildSquads(samplePool).length).toBe(5)
  })
})

describe('eligibleGroups', () => {
  it('returns the explicit eligible positions when present', () => {
    expect(eligibleGroups(pl('a', 'PSG', '2018-19', 'ATT', ['ATT', 'MID']))).toEqual(['ATT', 'MID'])
  })
  it('falls back to the primary group when absent', () => {
    expect(eligibleGroups(pl('a', 'PSG', '2018-19', 'DEF'))).toEqual(['DEF'])
  })
})

describe('drawSquad', () => {
  const squads = buildSquads(samplePool)
  it('returns a squad from the list, deterministically per seed', () => {
    const a = drawSquad(squads, createRng(5))
    const b = drawSquad(squads, createRng(5))
    expect(a.club).toBe(b.club)
    expect(squads.includes(a)).toBe(true)
  })
  it('never returns the excluded squad when alternatives exist', () => {
    const first = drawSquad(squads, createRng(1))
    const second = drawSquad(squads, createRng(1), first)
    expect(second).not.toBe(first)
  })
})
