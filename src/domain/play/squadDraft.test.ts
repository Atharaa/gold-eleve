import { describe, it, expect } from 'vitest'
import { initSquadDraft, squadDraftReducer, eligibleSlots, pickedPlayers } from './squadDraft'
import { samplePool } from '../../data/samplePool'

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
