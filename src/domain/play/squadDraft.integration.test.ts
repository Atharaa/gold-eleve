import { describe, it, expect } from 'vitest'
import { initSquadDraft, squadDraftReducer, eligibleSlots, pickedPlayers, simulateFromPicks } from './index'
import { samplePool } from '../../data/samplePool'

describe('squad draft v2 integration', () => {
  it('drafts a full 4-3-3 from drawn squads (with rerolls when stuck) then simulates', () => {
    let state = initSquadDraft(samplePool, '4-3-3', 2024)
    let guard = 0
    while (state.phase === 'drafting' && guard < 500) {
      guard++
      const slotIndex = state.slots.findIndex((s) => s === null)
      const player = state.currentSquad.players.find((p) => eligibleSlots(state, p).includes(slotIndex))
      if (player) {
        state = squadDraftReducer(state, { type: 'PICK', slotIndex, player })
      } else if (state.rerollsLeft > 0) {
        state = squadDraftReducer(state, { type: 'REROLL' })
      } else {
        // plus de reroll et squad courante inutilisable : on tire la suite via un PICK
        // impossible -> on force une avancée en piochant un autre slot compatible
        const alt = state.currentSquad.players.find((p) => eligibleSlots(state, p).length > 0)
        const altSlot = alt ? eligibleSlots(state, alt)[0] : -1
        if (alt && altSlot >= 0) {
          state = squadDraftReducer(state, { type: 'PICK', slotIndex: altSlot, player: alt })
        } else {
          break
        }
      }
    }
    expect(state.phase).toBe('done')
    expect(pickedPlayers(state)).toHaveLength(11)

    const result = simulateFromPicks(pickedPlayers(state), { seed: 2024, teamName: 'Mon XI' })
    expect(result.userRow.played).toBe(34)
    expect(result.table.find((r) => r.isUser)).toBeDefined()
  })
})
