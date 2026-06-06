import { PositionGroup } from '../ratings'
import { PoolPlayer, formationSlots, proposeCandidates, createRng, Constraint } from '../game'

export interface DraftState {
  pool: PoolPlayer[]
  formation: PositionGroup[]
  seed: number
  constraints: Constraint[]
  picked: PoolPlayer[]
  slotIndex: number
  candidates: PoolPlayer[]
  phase: 'drafting' | 'done'
}

export type DraftAction = { type: 'PICK'; player: PoolPlayer }

// Candidats déterministes par créneau : un RNG seedé par (seed, slotIndex).
function candidatesFor(state: Omit<DraftState, 'candidates' | 'phase'>, slotIndex: number): PoolPlayer[] {
  const group = state.formation[slotIndex]
  const rng = createRng(state.seed * 1000 + slotIndex)
  return proposeCandidates(state.pool, group, state.picked, rng, { constraints: state.constraints })
}

export function initDraft(pool: PoolPlayer[], formationName: string, seed: number, constraints: Constraint[] = []): DraftState {
  const formation = formationSlots(formationName)
  const core = { pool, formation, seed, constraints, picked: [] as PoolPlayer[], slotIndex: 0 }
  return { ...core, candidates: candidatesFor(core, 0), phase: 'drafting' }
}

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  if (action.type !== 'PICK' || state.phase === 'done') return state

  const picked = [...state.picked, action.player]
  const slotIndex = state.slotIndex + 1

  if (slotIndex >= state.formation.length) {
    return { ...state, picked, slotIndex, candidates: [], phase: 'done' }
  }
  const core = { ...state, picked, slotIndex }
  return { ...core, candidates: candidatesFor(core, slotIndex) }
}

export function currentGroup(state: DraftState): PositionGroup | null {
  return state.phase === 'drafting' ? state.formation[state.slotIndex] : null
}
