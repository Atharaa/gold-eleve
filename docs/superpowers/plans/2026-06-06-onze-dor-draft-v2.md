# Onze d'Or — Plan 7 : Données & draft v2 (effectifs, postes éligibles, équipe-par-pick)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Poser les fondations du draft v2 : postes éligibles par joueur, regroupement du pool en effectifs (club-saison), pool d'exemple étendu en vrais effectifs complets, et un réducteur de draft « une équipe par pick » avec sélection manuelle du poste, verrou de poste et 3 rerolls.

**Architecture:** `PoolPlayer` gagne un champ optionnel `eligiblePositions` (les groupes de postes jouables ; défaut = `[positionGroup]`). Un nouveau module `src/domain/play/squadDraft.ts` (pur, testable) regroupe le pool en `Squad[]` (club-saison) et expose une machine d'état : on tire une équipe, on remplit un slot choisi avec un joueur éligible, on peut re-tirer (reroll) jusqu'à 3 fois. **Additif** : l'ancien `draftReducer` et l'UI actuelle restent intacts (la bascule UI est en Plan 9), donc l'app reste jouable. Imports relatifs dans `src/domain/*`.

**Tech Stack:** TypeScript, Vitest. **Node ≥ 20.9** (`nvm use 20`). Réutilise `src/domain/game`.

**Référence spec:** `docs/superpowers/specs/2026-06-06-onze-dor-design.md` §12 (addendum draft v2). **Hors de ce plan :** simulation par journées (Plan 8), UI v2 (Plan 9).

---

### Task 1: Postes éligibles sur PoolPlayer

**Files:**
- Modify: `src/domain/game/types.ts` (ajouter `eligiblePositions?`)
- Modify: `src/domain/pool/map.ts` (renseigner `eligiblePositions`)
- Test: `src/domain/pool/map.test.ts` (ajouter un cas)

- [ ] **Step 1: Ajouter le champ au type**

Dans `src/domain/game/types.ts`, dans l'interface `PoolPlayer`, ajoute après `positionGroup` :
```ts
  /** Groupes de postes que le joueur peut occuper. Défaut implicite : [positionGroup]. */
  eligiblePositions?: import('../ratings').PositionGroup[]
```
(Si `PositionGroup` est déjà importé en tête du fichier, utilise simplement `eligiblePositions?: PositionGroup[]` sans l'`import(...)` inline.)

- [ ] **Step 2: Ajouter le test qui échoue**

Dans `src/domain/pool/map.test.ts`, ajoute ce cas dans le `describe('rowToPoolPlayer', ...)` existant :
```ts
  it('sets eligiblePositions to the mapped position group by default', () => {
    expect(rowToPoolPlayer(base).eligiblePositions).toEqual(['ATT'])
  })
```

- [ ] **Step 3: Vérifier l'échec**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npx vitest run src/domain/pool/map.test.ts`
Expected: FAIL (eligiblePositions undefined).

- [ ] **Step 4: Implémenter**

Dans `src/domain/pool/map.ts`, dans l'objet retourné par `rowToPoolPlayer`, ajoute après `positionGroup: toPositionGroup(row.position),` :
```ts
    eligiblePositions: [toPositionGroup(row.position)],
```

- [ ] **Step 5: Vérifier le succès**

Run: `npx vitest run src/domain/pool/map.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: eligiblePositions on PoolPlayer (default mapped group)"
```

---

### Task 2: Pool d'exemple étendu en effectifs complets

**Files:**
- Modify: `src/data/samplePool.ts` (réécrire en effectifs)
- Modify: `src/data/samplePool.test.ts` (adapter/ajouter)

- [ ] **Step 1: Réécrire le pool d'exemple en effectifs**

Remplace tout le contenu de `src/data/samplePool.ts` par :
```ts
import { PoolPlayer } from '../domain/game'
import { PositionGroup } from '../domain/ratings'

interface Seed {
  name: string
  group: PositionGroup
  rating: number
  elig?: PositionGroup[]
}

function squad(club: string, season: string, seeds: Seed[]): PoolPlayer[] {
  return seeds.map((s, i) => ({
    playerId: `${club}-${season}-${i}`.replace(/\s+/g, '').toLowerCase(),
    playerName: s.name,
    clubName: club,
    season,
    competition: 'L1',
    positionGroup: s.group,
    rating: s.rating,
    reliability: 4,
    eligiblePositions: s.elig ?? [s.group],
  }))
}

// Effectifs d'exemple (joueurs L1 plausibles) pour jouer hors base.
// Chaque effectif couvre tous les groupes de postes.
export const sampleSquads: PoolPlayer[][] = [
  squad('PSG', '2018-19', [
    { name: 'Alphonse Areola', group: 'GK', rating: 80 },
    { name: 'Gianluigi Buffon', group: 'GK', rating: 82 },
    { name: 'Thilo Kehrer', group: 'DEF', rating: 79, elig: ['DEF', 'MID'] },
    { name: 'Presnel Kimpembe', group: 'DEF', rating: 82 },
    { name: 'Thiago Silva', group: 'DEF', rating: 86 },
    { name: 'Juan Bernat', group: 'DEF', rating: 80, elig: ['DEF', 'MID'] },
    { name: 'Marco Verratti', group: 'MID', rating: 87 },
    { name: 'Marquinhos', group: 'MID', rating: 85, elig: ['MID', 'DEF'] },
    { name: 'Julian Draxler', group: 'MID', rating: 81, elig: ['MID', 'ATT'] },
    { name: 'Angel Di Maria', group: 'ATT', rating: 85, elig: ['ATT', 'MID'] },
    { name: 'Neymar', group: 'ATT', rating: 91, elig: ['ATT', 'MID'] },
    { name: 'Kylian Mbappe', group: 'ATT', rating: 90 },
    { name: 'Edinson Cavani', group: 'ATT', rating: 86 },
  ]),
  squad('Lyon', '2014-15', [
    { name: 'Anthony Lopes', group: 'GK', rating: 80 },
    { name: 'Christophe Jallet', group: 'DEF', rating: 76, elig: ['DEF', 'MID'] },
    { name: 'Samuel Umtiti', group: 'DEF', rating: 80 },
    { name: 'Milan Bisevac', group: 'DEF', rating: 74 },
    { name: 'Henri Bedimo', group: 'DEF', rating: 75, elig: ['DEF', 'MID'] },
    { name: 'Maxime Gonalons', group: 'MID', rating: 79, elig: ['MID', 'DEF'] },
    { name: 'Corentin Tolisso', group: 'MID', rating: 81 },
    { name: 'Clement Grenier', group: 'MID', rating: 78, elig: ['MID', 'ATT'] },
    { name: 'Nabil Fekir', group: 'ATT', rating: 84, elig: ['ATT', 'MID'] },
    { name: 'Alexandre Lacazette', group: 'ATT', rating: 85 },
    { name: 'Jordan Ferri', group: 'MID', rating: 73 },
    { name: 'Rachid Ghezzal', group: 'ATT', rating: 76, elig: ['ATT', 'MID'] },
  ]),
  squad('Marseille', '2017-18', [
    { name: 'Steve Mandanda', group: 'GK', rating: 83 },
    { name: 'Bouna Sarr', group: 'DEF', rating: 75, elig: ['DEF', 'MID'] },
    { name: 'Adil Rami', group: 'DEF', rating: 78 },
    { name: 'Rolando', group: 'DEF', rating: 76 },
    { name: 'Jordan Amavi', group: 'DEF', rating: 76, elig: ['DEF', 'MID'] },
    { name: 'Luiz Gustavo', group: 'MID', rating: 81, elig: ['MID', 'DEF'] },
    { name: 'Morgan Sanson', group: 'MID', rating: 80 },
    { name: 'Florian Thauvin', group: 'ATT', rating: 84, elig: ['ATT', 'MID'] },
    { name: 'Dimitri Payet', group: 'MID', rating: 84, elig: ['MID', 'ATT'] },
    { name: 'Valere Germain', group: 'ATT', rating: 77 },
    { name: 'Kostas Mitroglou', group: 'ATT', rating: 76 },
    { name: 'Clinton Njie', group: 'ATT', rating: 74, elig: ['ATT', 'MID'] },
  ]),
  squad('Monaco', '2016-17', [
    { name: 'Danijel Subasic', group: 'GK', rating: 80 },
    { name: 'Djibril Sidibe', group: 'DEF', rating: 80, elig: ['DEF', 'MID'] },
    { name: 'Kamil Glik', group: 'DEF', rating: 81 },
    { name: 'Jemerson', group: 'DEF', rating: 78 },
    { name: 'Benjamin Mendy', group: 'DEF', rating: 81, elig: ['DEF', 'MID'] },
    { name: 'Fabinho', group: 'MID', rating: 83, elig: ['MID', 'DEF'] },
    { name: 'Tiemoue Bakayoko', group: 'MID', rating: 82 },
    { name: 'Bernardo Silva', group: 'MID', rating: 84, elig: ['MID', 'ATT'] },
    { name: 'Thomas Lemar', group: 'MID', rating: 82, elig: ['MID', 'ATT'] },
    { name: 'Radamel Falcao', group: 'ATT', rating: 84 },
    { name: 'Kylian Mbappe', group: 'ATT', rating: 83 },
    { name: 'Valere Germain', group: 'ATT', rating: 77 },
  ]),
  squad('Lille', '2018-19', [
    { name: 'Mike Maignan', group: 'GK', rating: 82 },
    { name: 'Mehmet Celik', group: 'DEF', rating: 74, elig: ['DEF', 'MID'] },
    { name: 'Gabriel Magalhaes', group: 'DEF', rating: 80 },
    { name: 'Jose Fonte', group: 'DEF', rating: 79 },
    { name: 'Domagoj Bradaric', group: 'DEF', rating: 74, elig: ['DEF', 'MID'] },
    { name: 'Benjamin Andre', group: 'MID', rating: 80, elig: ['MID', 'DEF'] },
    { name: 'Thiago Mendes', group: 'MID', rating: 80 },
    { name: 'Jonathan Ikone', group: 'ATT', rating: 79, elig: ['ATT', 'MID'] },
    { name: 'Jonathan Bamba', group: 'ATT', rating: 79, elig: ['ATT', 'MID'] },
    { name: 'Nicolas Pepe', group: 'ATT', rating: 85, elig: ['ATT', 'MID'] },
    { name: 'Loic Remy', group: 'ATT', rating: 76 },
    { name: 'Xeka', group: 'MID', rating: 75 },
  ]),
]

export const samplePool: PoolPlayer[] = sampleSquads.flat()
```

- [ ] **Step 2: Adapter le test du pool**

Remplace tout le contenu de `src/data/samplePool.test.ts` par :
```ts
import { describe, it, expect } from 'vitest'
import { samplePool, sampleSquads } from './samplePool'

describe('samplePool', () => {
  it('has at least 6 players in each position group', () => {
    for (const group of ['GK', 'DEF', 'MID', 'ATT'] as const) {
      expect(samplePool.filter((p) => p.positionGroup === group).length).toBeGreaterThanOrEqual(6)
    }
  })
  it('has unique player ids', () => {
    expect(new Set(samplePool.map((p) => p.playerId)).size).toBe(samplePool.length)
  })
  it('has ratings within 40..99', () => {
    for (const p of samplePool) {
      expect(p.rating).toBeGreaterThanOrEqual(40)
      expect(p.rating).toBeLessThanOrEqual(99)
    }
  })
  it('every player has at least one eligible position', () => {
    for (const p of samplePool) {
      expect(p.eligiblePositions && p.eligiblePositions.length).toBeGreaterThan(0)
    }
  })
})

describe('sampleSquads', () => {
  it('exposes several full squads', () => {
    expect(sampleSquads.length).toBeGreaterThanOrEqual(4)
  })
  it('each squad covers all four position groups (so a draft can fill any slot)', () => {
    for (const s of sampleSquads) {
      for (const group of ['GK', 'DEF', 'MID', 'ATT'] as const) {
        expect(s.some((p) => (p.eligiblePositions ?? [p.positionGroup]).includes(group))).toBe(true)
      }
    }
  })
})
```

- [ ] **Step 3: Vérifier**

Run: `npx vitest run src/data/samplePool.test.ts && npx tsc --noEmit`
Expected: PASS, tsc OK.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: expand sample pool into full squads with eligible positions"
```

---

### Task 3: Regroupement en effectifs + tirage

**Files:**
- Create: `src/domain/play/squad.ts`
- Test: `src/domain/play/squad.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/play/squad.test.ts`:
```ts
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
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/play/squad.test.ts`
Expected: FAIL ("Cannot find module './squad'").

- [ ] **Step 3: Implémenter**

Create `src/domain/play/squad.ts`:
```ts
import { PositionGroup } from '../ratings'
import { PoolPlayer, randomInt } from '../game'

export interface Squad {
  club: string
  season: string
  competition: string
  players: PoolPlayer[]
}

export function eligibleGroups(player: PoolPlayer): PositionGroup[] {
  return player.eligiblePositions && player.eligiblePositions.length > 0
    ? player.eligiblePositions
    : [player.positionGroup]
}

export function buildSquads(pool: PoolPlayer[]): Squad[] {
  const byKey = new Map<string, Squad>()
  for (const player of pool) {
    const key = `${player.clubName}|${player.season}|${player.competition}`
    const squad = byKey.get(key)
    if (squad) {
      squad.players.push(player)
    } else {
      byKey.set(key, { club: player.clubName, season: player.season, competition: player.competition, players: [player] })
    }
  }
  return [...byKey.values()]
}

// Tire un effectif au hasard ; si `exclude` est fourni et qu'il existe une
// alternative, garantit un effectif différent.
export function drawSquad(squads: Squad[], rng: () => number, exclude?: Squad): Squad {
  if (squads.length === 0) throw new Error('drawSquad: no squads')
  const pick = squads[randomInt(rng, squads.length)]
  if (exclude && pick === exclude && squads.length > 1) {
    const others = squads.filter((s) => s !== exclude)
    return others[randomInt(rng, others.length)]
  }
  return pick
}
```

> `randomInt` est exporté par le barrel `src/domain/game` (depuis `rng.ts`). Vérifie qu'il l'est ; sinon importe-le depuis `../game/rng`.

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/play/squad.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: squad grouping, eligible groups, seeded squad draw"
```

---

### Task 4: Réducteur de draft « une équipe par pick »

**Files:**
- Create: `src/domain/play/squadDraft.ts`
- Test: `src/domain/play/squadDraft.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/play/squadDraft.test.ts`:
```ts
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
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/play/squadDraft.test.ts`
Expected: FAIL ("Cannot find module './squadDraft'").

- [ ] **Step 3: Implémenter**

Create `src/domain/play/squadDraft.ts`:
```ts
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

// Slots vides que ce joueur peut occuper (groupe compatible).
export function eligibleSlots(state: SquadDraftState, player: PoolPlayer): number[] {
  const groups = eligibleGroups(player)
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
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/play/squadDraft.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: squad-per-pick draft reducer with manual slot, position lock, rerolls"
```

---

### Task 5: Exports + intégration + checks

**Files:**
- Modify: `src/domain/play/index.ts` (exporter les nouveaux modules)
- Test: `src/domain/play/squadDraft.integration.test.ts`

- [ ] **Step 1: Étendre le barrel**

Dans `src/domain/play/index.ts`, ajoute :
```ts
export * from './squad'
export * from './squadDraft'
```
(garde les exports existants `./draftReducer` et `./playGame`.)

- [ ] **Step 2: Écrire le test d'intégration**

Create `src/domain/play/squadDraft.integration.test.ts`:
```ts
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
```

> Note : le pool d'exemple n'a que 5 effectifs et certains slots (ex. plusieurs MID) peuvent demander des rerolls. Le test boucle avec un garde-fou et un repli, et vérifie qu'un XI complet est draftable. Si le test n'atteint pas `done` (squads d'exemple insuffisamment fournis pour une formation), STOP et signale-le : il faudra étoffer un effectif plutôt que modifier le réducteur.

- [ ] **Step 3: Lancer toute la suite + checks**

Run: `npm test && npm run lint && npm run build && npx tsc --noEmit`
Expected: tous les tests PASS (Plans 1-6 inchangés + nouveaux), lint OK, build OK, tsc OK.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: squad draft barrel exports and v2 draft-to-simulation integration"
```

---

## Couverture du spec (auto-revue §12)

- Postes éligibles par joueur (verrou de poste) → Tasks 1 (champ), 3 (`eligibleGroups`), 4 (validation `canPick`).
- Draft « une équipe par pick » + rerolls → Task 4 (`initSquadDraft`, PICK tire la suivante, REROLL ≤ rerolls).
- Sélection manuelle du poste → Task 4 (`PICK { slotIndex, player }` + `eligibleSlots`).
- Effectifs complets de données → Tasks 2 (sample étendu), 3 (`buildSquads`).

**Additif et non-cassant :** l'ancien `draftReducer` et l'UI actuelle restent intacts ; l'app reste jouable. **Hors de ce plan :** choix de formation côté UI, écran de draft v2, simulation par journées, défilement animé (Plans 8-9). Le champ `eligiblePositions` est optionnel → les fixtures de tests existantes (sans ce champ) compilent toujours.
```
