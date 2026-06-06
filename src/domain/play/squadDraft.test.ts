import { describe, it, expect } from 'vitest'
import { initSquadDraft, squadDraftReducer, eligibleSlots, pickedPlayers, SquadDraftState } from './squadDraft'
import { samplePool } from '../../data/samplePool'
import { PoolPlayer } from '../game'

function poolPlayer(id: string, name: string, club: string, season: string, group: PoolPlayer['positionGroup']): PoolPlayer {
  return { playerId: id, playerName: name, clubName: club, season, competition: 'L1', positionGroup: group, rating: 80, reliability: 4 }
}

describe('initSquadDraft', () => {
  const state = initSquadDraft(samplePool, '4-3-3', 7)
  it('has 11 empty slots for 4-3-3 and a drawn squad', () => {
    expect(state.slots).toHaveLength(11)
    expect(state.slots.every((s) => s === null)).toBe(true)
    expect(state.currentSquad.players.length).toBeGreaterThan(0)
  })
  it('starts with 3 rerolls and is drafting', () => {
    expect(state.rerollsLeft).toBe(3)
    expect(state.phase).toBe('drafting')
  })
  it('is deterministic for a given seed', () => {
    expect(initSquadDraft(samplePool, '4-3-3', 7).currentSquad.club).toBe(state.currentSquad.club)
  })
})

describe('eligibleSlots', () => {
  it('lists empty slots whose group the player can fill', () => {
    const state = initSquadDraft(samplePool, '4-3-3', 7)
    const gk = state.currentSquad.players.find((p) => p.positionGroup === 'GK')
    if (gk) {
      // GK slot is index 0 in 4-3-3
      expect(eligibleSlots(state, gk)).toContain(0)
    }
  })
})

describe('squadDraftReducer PICK', () => {
  it('fills the chosen slot with an eligible player and draws a new squad', () => {
    const state = initSquadDraft(samplePool, '4-3-3', 7)
    const gk = state.currentSquad.players.find((p) => p.positionGroup === 'GK')!
    const next = squadDraftReducer(state, { type: 'PICK', slotIndex: 0, player: gk })
    expect(next.slots[0]).toEqual(gk)
    expect(pickedPlayers(next)).toHaveLength(1)
  })
  it('rejects placing a player on an ineligible slot', () => {
    const state = initSquadDraft(samplePool, '4-3-3', 7)
    const striker = state.currentSquad.players.find((p) => !eligibleSlots(state, p).includes(0))
    if (striker) {
      const next = squadDraftReducer(state, { type: 'PICK', slotIndex: 0, player: striker })
      expect(next).toBe(state) // unchanged
    }
  })
  it('completes after filling all 11 slots', () => {
    let state = initSquadDraft(samplePool, '4-3-3', 1)
    let guard = 0
    while (state.phase === 'drafting' && guard < 500) {
      guard++
      const slotIndex = state.slots.findIndex((s) => s === null)
      const player = state.currentSquad.players.find((p) => eligibleSlots(state, p).includes(slotIndex))
      if (!player) {
        state = squadDraftReducer(state, { type: 'REROLL' })
        continue
      }
      state = squadDraftReducer(state, { type: 'PICK', slotIndex, player })
    }
    expect(state.phase).toBe('done')
    expect(pickedPlayers(state)).toHaveLength(11)
  })
})

describe('squadDraftReducer REROLL', () => {
  it('decrements rerolls and changes the squad', () => {
    const state = initSquadDraft(samplePool, '4-3-3', 7)
    const next = squadDraftReducer(state, { type: 'REROLL' })
    expect(next.rerollsLeft).toBe(2)
    expect(next.currentSquad).not.toBe(state.currentSquad)
  })
  it('does nothing when no rerolls remain', () => {
    let state = initSquadDraft(samplePool, '4-3-3', 7)
    state = squadDraftReducer(state, { type: 'REROLL' })
    state = squadDraftReducer(state, { type: 'REROLL' })
    state = squadDraftReducer(state, { type: 'REROLL' })
    const after = squadDraftReducer(state, { type: 'REROLL' })
    expect(after).toBe(state)
    expect(after.rerollsLeft).toBe(0)
  })
})

describe('squadDraft hardening', () => {
  it('rejects picking a player whose name is already on the team (different squad/year)', () => {
    const star1 = poolPlayer('a1', 'Star', 'PSG', '2018-19', 'ATT')
    const star2 = poolPlayer('b1', 'Star', 'Monaco', '2016-17', 'ATT')
    const squad1 = { club: 'PSG', season: '2018-19', competition: 'L1', players: [star1] }
    const squad2 = { club: 'Monaco', season: '2016-17', competition: 'L1', players: [star2] }
    // formation 4-3-3 : slot 0 = GK, slots 8-10 = ATT
    const formation = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'ATT', 'ATT', 'ATT'] as PoolPlayer['positionGroup'][]
    const baseState: SquadDraftState = {
      formation,
      slots: formation.map((g, i) => (i === 8 ? star1 : null)), // star1 déjà posé sur slot 8
      squads: [squad1, squad2],
      currentSquad: squad2,
      rerollsLeft: 3,
      seed: 1,
      drawCount: 1,
      constraints: [],
      phase: 'drafting',
    }
    // star2 est dans currentSquad mais a le même nom que star1 déjà posé → doit être rejeté
    expect(eligibleSlots(baseState, star2)).toHaveLength(0)
  })

  it('REROLL is a no-op when the pool has a single squad', () => {
    const pool = [
      poolPlayer('a1', 'Keeper', 'PSG', '2018-19', 'GK'),
      poolPlayer('a2', 'Back', 'PSG', '2018-19', 'DEF'),
      poolPlayer('a3', 'Mid', 'PSG', '2018-19', 'MID'),
      poolPlayer('a4', 'Fwd', 'PSG', '2018-19', 'ATT'),
    ]
    const state = initSquadDraft(pool, '4-3-3', 1)
    const after = squadDraftReducer(state, { type: 'REROLL' })
    expect(after).toBe(state)
    expect(after.rerollsLeft).toBe(3)
  })
})
