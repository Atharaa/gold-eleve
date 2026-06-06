import { describe, it, expect } from 'vitest'
import { initDraft, draftReducer, currentGroup } from './draftReducer'
import { samplePool } from '../../data/samplePool'

describe('initDraft', () => {
  it('starts on slot 0 in the drafting phase with candidates', () => {
    const state = initDraft(samplePool, '4-3-3', 7)
    expect(state.slotIndex).toBe(0)
    expect(state.phase).toBe('drafting')
    expect(state.candidates.length).toBeGreaterThan(0)
    expect(currentGroup(state)).toBe('GK')
  })
  it('proposes only candidates of the current slot group', () => {
    const state = initDraft(samplePool, '4-3-3', 7)
    expect(state.candidates.every((c) => c.positionGroup === 'GK')).toBe(true)
  })
  it('is deterministic for a given seed', () => {
    const a = initDraft(samplePool, '4-3-3', 7).candidates.map((c) => c.playerId)
    const b = initDraft(samplePool, '4-3-3', 7).candidates.map((c) => c.playerId)
    expect(a).toEqual(b)
  })
})

describe('draftReducer PICK', () => {
  it('advances to the next slot and proposes its group', () => {
    let state = initDraft(samplePool, '4-3-3', 7)
    const keeper = state.candidates[0]
    state = draftReducer(state, { type: 'PICK', player: keeper })
    expect(state.picked).toHaveLength(1)
    expect(state.slotIndex).toBe(1)
    expect(currentGroup(state)).toBe('DEF')
    expect(state.candidates.every((c) => c.positionGroup === 'DEF')).toBe(true)
  })
  it('never re-proposes an already-picked player', () => {
    let state = initDraft(samplePool, '4-4-2', 1)
    const picked: string[] = []
    while (state.phase === 'drafting') {
      const choice = state.candidates[0]
      picked.push(choice.playerId)
      state = draftReducer(state, { type: 'PICK', player: choice })
    }
    expect(new Set(picked).size).toBe(picked.length)
  })
  it('reaches the done phase after 11 picks with an empty candidate list', () => {
    let state = initDraft(samplePool, '4-3-3', 3)
    while (state.phase === 'drafting') {
      state = draftReducer(state, { type: 'PICK', player: state.candidates[0] })
    }
    expect(state.picked).toHaveLength(11)
    expect(state.phase).toBe('done')
    expect(state.candidates).toEqual([])
    expect(currentGroup(state)).toBeNull()
  })
  it('ignores a PICK once done', () => {
    let state = initDraft(samplePool, '4-3-3', 3)
    while (state.phase === 'drafting') {
      state = draftReducer(state, { type: 'PICK', player: state.candidates[0] })
    }
    const after = draftReducer(state, { type: 'PICK', player: samplePool[0] })
    expect(after).toBe(state)
  })
})
