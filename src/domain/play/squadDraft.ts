import { PositionGroup } from '../ratings'
import { PoolPlayer, formationSlots, createRng, Constraint } from '../game'
import { Squad, buildSquads, drawSquad, eligibleGroups } from './squad'

export interface SquadDraftState {
  formation: PositionGroup[]
  slots: (PoolPlayer | null)[]
  squads: Squad[]
  currentSquad: Squad
  rerollsLeft: number
  seed: number
  drawCount: number
  constraints: Constraint[]
  phase: 'drafting' | 'done'
}

export type SquadDraftAction = { type: 'PICK'; slotIndex: number; player: PoolPlayer } | { type: 'REROLL' }

export interface SquadDraftOptions {
  rerolls?: number
  constraints?: Constraint[]
}

function nextSquad(squads: Squad[], seed: number, drawCount: number, exclude?: Squad): Squad {
  return drawSquad(squads, createRng(seed * 1000 + drawCount), exclude)
}

export function initSquadDraft(pool: PoolPlayer[], formationName: string, seed: number, options: SquadDraftOptions = {}): SquadDraftState {
  const formation = formationSlots(formationName)
  const squads = buildSquads(pool)
  return {
    formation,
    slots: formation.map(() => null),
    squads,
    currentSquad: nextSquad(squads, seed, 0),
    rerollsLeft: options.rerolls ?? 3,
    seed,
    drawCount: 0,
    constraints: options.constraints ?? [],
    phase: 'drafting',
  }
}

export function pickedPlayers(state: SquadDraftState): PoolPlayer[] {
  return state.slots.filter((s): s is PoolPlayer => s !== null)
}

// Slots vides que ce joueur peut occuper (groupe compatible, non encore sélectionné).
export function eligibleSlots(state: SquadDraftState, player: PoolPlayer): number[] {
  const groups = eligibleGroups(player)
  const alreadyPicked = pickedPlayers(state).some((p) => p.playerId === player.playerId)
  if (alreadyPicked) return []
  const out: number[] = []
  state.slots.forEach((slot, index) => {
    if (slot === null && groups.includes(state.formation[index])) out.push(index)
  })
  return out
}

function canPick(state: SquadDraftState, slotIndex: number, player: PoolPlayer): boolean {
  if (state.slots[slotIndex] !== null) return false
  if (!state.currentSquad.players.some((p) => p.playerId === player.playerId)) return false
  if (!eligibleGroups(player).includes(state.formation[slotIndex])) return false
  if (pickedPlayers(state).some((p) => p.playerId === player.playerId)) return false
  const picked = pickedPlayers(state)
  return state.constraints.every((c) => c.allows(player, picked))
}

export function squadDraftReducer(state: SquadDraftState, action: SquadDraftAction): SquadDraftState {
  if (state.phase === 'done') return state

  if (action.type === 'REROLL') {
    if (state.rerollsLeft <= 0) return state
    const drawCount = state.drawCount + 1
    return {
      ...state,
      currentSquad: nextSquad(state.squads, state.seed, drawCount, state.currentSquad),
      rerollsLeft: state.rerollsLeft - 1,
      drawCount,
    }
  }

  // PICK
  if (!canPick(state, action.slotIndex, action.player)) return state

  const slots = [...state.slots]
  slots[action.slotIndex] = action.player

  if (slots.every((s) => s !== null)) {
    return { ...state, slots, phase: 'done' }
  }
  const drawCount = state.drawCount + 1
  return { ...state, slots, currentSquad: nextSquad(state.squads, state.seed, drawCount), drawCount }
}
