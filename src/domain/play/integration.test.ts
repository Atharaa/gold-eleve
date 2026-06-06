import { describe, it, expect } from 'vitest'
import { initDraft, draftReducer, simulateFromPicks } from './index'
import { samplePool } from '../../data/samplePool'

describe('play integration: draft from the sample pool then simulate', () => {
  it('drafts a full 4-3-3 and simulates a coherent season', () => {
    let state = initDraft(samplePool, '4-3-3', 2024)
    while (state.phase === 'drafting') {
      state = draftReducer(state, { type: 'PICK', player: state.candidates[0] })
    }
    expect(state.picked).toHaveLength(11)

    const result = simulateFromPicks(state.picked, { seed: 2024, teamName: 'Mon XI' })
    expect(result.userRow.played).toBe(34)
    expect(result.scorers.length).toBeGreaterThan(0)
    expect(result.table.find((r) => r.isUser)).toBeDefined()
  })
})
