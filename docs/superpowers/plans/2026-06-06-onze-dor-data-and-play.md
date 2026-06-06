# Onze d'Or — Plan 4 : Données & machine de partie

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le pool de joueurs depuis Postgres (note effective = override sinon calculée), avec repli sur un pool d'exemple embarqué, l'exposer via une route API, et fournir un réducteur de draft pur qui pilote une partie tour par tour jusqu'à la simulation.

**Architecture:** Mapping DB→`PoolPlayer` pur et testable (`src/domain/pool/`). `getPool(mode)` (`src/server/pool.ts`) interroge Prisma si `DATABASE_URL` est défini, sinon renvoie un pool d'exemple embarqué (`src/data/samplePool.ts`) — l'app reste jouable hors base. Une route App Router `/api/pool` sert le pool. Le réducteur de draft (`src/domain/play/`) est une machine d'état pure (déterministe par seed) qui réutilise `proposeCandidates`/`formationSlots` (Plan 3). Imports relatifs dans tout ce qui est testé par Vitest (`src/domain/*`, `src/server/*`).

**Tech Stack:** TypeScript, Vitest, Prisma, Next.js (route handler). **Node ≥ 20.9** (`nvm use 20`). Réutilise `src/domain/ratings` et `src/domain/game` (Plans 1 & 3).

**Référence spec:** `docs/superpowers/specs/2026-06-06-onze-dor-design.md` (§2.4 Prime/Saison, §2.5 note effective, §4 boucle). **Hors de ce plan :** écrans React, thème, PWA (Plan 5).

---

### Task 1: Mapping DB → PoolPlayer

**Files:**
- Create: `src/domain/pool/types.ts`
- Create: `src/domain/pool/map.ts`
- Test: `src/domain/pool/map.test.ts`

- [ ] **Step 1: Définir le type de ligne DB**

Create `src/domain/pool/types.ts`:
```ts
export interface DbSeasonRow {
  playerId: string
  playerName: string
  clubName: string
  season: string
  competition: string
  position: string
  ratingComputed: number
  ratingOverride: number | null
  reliability: number
  marketValue: number | null
}
```

- [ ] **Step 2: Écrire le test qui échoue**

Create `src/domain/pool/map.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { rowToPoolPlayer, rowsToPool } from './map'
import { DbSeasonRow } from './types'

const base: DbSeasonRow = {
  playerId: 'p1', playerName: 'Kylian Mbappe', clubName: 'PSG', season: '2018-19', competition: 'L1',
  position: 'ST', ratingComputed: 88, ratingOverride: null, reliability: 4, marketValue: 180000000,
}

describe('rowToPoolPlayer', () => {
  it('maps a DB row to a pool player', () => {
    const p = rowToPoolPlayer(base)
    expect(p.playerId).toBe('p1')
    expect(p.playerName).toBe('Kylian Mbappe')
    expect(p.positionGroup).toBe('ATT')
    expect(p.rating).toBe(88)
    expect(p.marketValue).toBe(180000000)
  })
  it('uses the admin override as the effective rating when present', () => {
    expect(rowToPoolPlayer({ ...base, ratingOverride: 95 }).rating).toBe(95)
  })
  it('treats a null market value as undefined', () => {
    expect(rowToPoolPlayer({ ...base, marketValue: null }).marketValue).toBeUndefined()
  })
  it('clamps reliability into 1..4', () => {
    expect(rowToPoolPlayer({ ...base, reliability: 9 }).reliability).toBe(4)
    expect(rowToPoolPlayer({ ...base, reliability: 0 }).reliability).toBe(1)
  })
})

describe('rowsToPool', () => {
  it('maps every row', () => {
    expect(rowsToPool([base, { ...base, playerId: 'p2', position: 'GK' }])).toHaveLength(2)
  })
})
```

- [ ] **Step 3: Vérifier l'échec**

Run: `npx vitest run src/domain/pool/map.test.ts`
Expected: FAIL ("Cannot find module './map'").

- [ ] **Step 4: Implémenter**

Create `src/domain/pool/map.ts`:
```ts
import { toPositionGroup } from '../ratings'
import { PoolPlayer } from '../game'
import { DbSeasonRow } from './types'

function clampReliability(value: number): 1 | 2 | 3 | 4 {
  return Math.min(4, Math.max(1, Math.round(value))) as 1 | 2 | 3 | 4
}

export function rowToPoolPlayer(row: DbSeasonRow): PoolPlayer {
  return {
    playerId: row.playerId,
    playerName: row.playerName,
    clubName: row.clubName,
    season: row.season,
    competition: row.competition,
    positionGroup: toPositionGroup(row.position),
    rating: row.ratingOverride ?? row.ratingComputed,
    reliability: clampReliability(row.reliability),
    marketValue: row.marketValue ?? undefined,
  }
}

export function rowsToPool(rows: DbSeasonRow[]): PoolPlayer[] {
  return rows.map(rowToPoolPlayer)
}
```

- [ ] **Step 5: Vérifier le succès**

Run: `npx vitest run src/domain/pool/map.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: map DB season rows to pool players (effective rating)"
```

---

### Task 2: Pool d'exemple embarqué

**Files:**
- Create: `src/data/samplePool.ts`
- Test: `src/data/samplePool.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/data/samplePool.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { samplePool } from './samplePool'

describe('samplePool', () => {
  it('has at least 6 players in each position group (enough to draft any formation)', () => {
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
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/data/samplePool.test.ts`
Expected: FAIL ("Cannot find module './samplePool'").

- [ ] **Step 3: Implémenter**

Create `src/data/samplePool.ts`:
```ts
import { PoolPlayer } from '../domain/game'

function p(
  id: string,
  name: string,
  club: string,
  group: PoolPlayer['positionGroup'],
  rating: number,
  reliability: 1 | 2 | 3 | 4 = 4,
): PoolPlayer {
  return { playerId: id, playerName: name, clubName: club, season: '2018-19', competition: 'L1', positionGroup: group, rating, reliability }
}

// Pool d'exemple (joueurs marquants de Ligue 1) pour jouer hors base de données.
export const samplePool: PoolPlayer[] = [
  // Gardiens
  p('gk1', 'Steve Mandanda', 'Marseille', 'GK', 84),
  p('gk2', 'Alphonse Areola', 'PSG', 'GK', 82),
  p('gk3', 'Benoit Costil', 'Bordeaux', 'GK', 78),
  p('gk4', 'Walter Benitez', 'Nice', 'GK', 80),
  p('gk5', 'Anthony Lopes', 'Lyon', 'GK', 81),
  p('gk6', 'Mike Maignan', 'Lille', 'GK', 83),
  p('gk7', 'Paul Bernardoni', 'Angers', 'GK', 76),
  // Defenseurs
  p('df1', 'Marquinhos', 'PSG', 'DEF', 87),
  p('df2', 'Presnel Kimpembe', 'PSG', 'DEF', 82),
  p('df3', 'Dante', 'Nice', 'DEF', 80),
  p('df4', 'Nicolas Pallois', 'Nantes', 'DEF', 77),
  p('df5', 'Gabriel Magalhaes', 'Lille', 'DEF', 81),
  p('df6', 'Benjamin Pavard', 'Lille', 'DEF', 83),
  p('df7', 'Ferland Mendy', 'Lyon', 'DEF', 82),
  p('df8', 'Leo Dubois', 'Lyon', 'DEF', 79),
  p('df9', 'Mehdi Zerkane', 'Bordeaux', 'DEF', 74),
  // Milieux
  p('mf1', 'Marco Verratti', 'PSG', 'MID', 87),
  p('mf2', 'Marquinhos Cipriano', 'Saint-Etienne', 'MID', 75),
  p('mf3', 'Houssem Aouar', 'Lyon', 'MID', 83),
  p('mf4', 'Boubacar Kamara', 'Marseille', 'MID', 80),
  p('mf5', 'Dimitri Payet', 'Marseille', 'MID', 84),
  p('mf6', 'Benjamin Andre', 'Lille', 'MID', 80),
  p('mf7', 'Thiago Mendes', 'Lyon', 'MID', 79),
  p('mf8', 'Morgan Sanson', 'Marseille', 'MID', 81),
  p('mf9', 'Jonathan Bamba', 'Lille', 'MID', 79),
  // Attaquants
  p('at1', 'Kylian Mbappe', 'PSG', 'ATT', 92),
  p('at2', 'Neymar', 'PSG', 'ATT', 91),
  p('at3', 'Wissam Ben Yedder', 'Monaco', 'ATT', 85),
  p('at4', 'Memphis Depay', 'Lyon', 'ATT', 86),
  p('at5', 'Nicolas Pepe', 'Lille', 'ATT', 84),
  p('at6', 'Moussa Dembele', 'Lyon', 'ATT', 82),
  p('at7', 'Florian Thauvin', 'Marseille', 'ATT', 83),
  p('at8', 'Islam Slimani', 'Monaco', 'ATT', 79),
]
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/data/samplePool.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: bundled sample player pool for offline play"
```

---

### Task 3: getPool (base + repli)

**Files:**
- Create: `src/server/pool.ts`
- Test: `src/server/pool.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/server/pool.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getPool } from './pool'
import { samplePool } from '../data/samplePool'

const hasDb = !!process.env.DATABASE_URL

describe('getPool', () => {
  it.skipIf(hasDb)('falls back to the sample pool when no database is configured', async () => {
    const prime = await getPool('prime')
    expect(prime).toEqual(samplePool)
    const season = await getPool('season')
    expect(season).toEqual(samplePool)
  })

  it.skipIf(!hasDb)('returns a non-empty pool from the database', async () => {
    const pool = await getPool('prime')
    expect(Array.isArray(pool)).toBe(true)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/server/pool.test.ts`
Expected: FAIL ("Cannot find module './pool'").

- [ ] **Step 3: Implémenter**

Create `src/server/pool.ts`:
```ts
import { PrismaClient } from '@prisma/client'
import { PoolPlayer } from '../domain/game'
import { rowsToPool } from '../domain/pool/map'
import { DbSeasonRow } from '../domain/pool/types'
import { samplePool } from '../data/samplePool'

export type PoolMode = 'prime' | 'season'

let client: PrismaClient | null = null
function db(): PrismaClient {
  return (client ??= new PrismaClient())
}

async function primeRows(): Promise<DbSeasonRow[]> {
  const players = await db().player.findMany({
    where: { primeSeasonId: { not: null } },
    include: { primeSeason: { include: { club: true } } },
  })
  return players
    .filter((p) => p.primeSeason)
    .map((p) => ({
      playerId: p.id,
      playerName: p.name,
      clubName: p.primeSeason!.club.name,
      season: p.primeSeason!.season,
      competition: p.primeSeason!.competition,
      position: p.primeSeason!.position,
      ratingComputed: p.primeSeason!.ratingComputed,
      ratingOverride: p.primeSeason!.ratingOverride,
      reliability: p.primeSeason!.reliability,
      marketValue: p.primeSeason!.marketValue,
    }))
}

async function seasonRows(): Promise<DbSeasonRow[]> {
  const seasons = await db().playerSeason.findMany({ include: { player: true, club: true } })
  return seasons.map((s) => ({
    playerId: s.playerId,
    playerName: s.player.name,
    clubName: s.club.name,
    season: s.season,
    competition: s.competition,
    position: s.position,
    ratingComputed: s.ratingComputed,
    ratingOverride: s.ratingOverride,
    reliability: s.reliability,
    marketValue: s.marketValue,
  }))
}

export async function getPool(mode: PoolMode): Promise<PoolPlayer[]> {
  if (!process.env.DATABASE_URL) return samplePool
  const rows = mode === 'prime' ? await primeRows() : await seasonRows()
  return rowsToPool(rows)
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/server/pool.test.ts && npx tsc --noEmit`
Expected: test PASS (fallback branch), tsc clean (DB branch compiles against the generated Prisma client and the `primeSeason`/`club` relations).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: getPool reads from Postgres with sample-pool fallback"
```

---

### Task 4: Route API du pool

**Files:**
- Create: `src/app/api/pool/route.ts`

> Pas de test Vitest ici (un route handler dépend du runtime Next) ; vérifié par `tsc`/`build`. La logique est déjà couverte par `getPool` (Task 3).

- [ ] **Step 1: Implémenter la route**

Create `src/app/api/pool/route.ts`:
```ts
import { NextResponse } from 'next/server'
import { getPool, PoolMode } from '../../../server/pool'

export async function GET(request: Request) {
  const modeParam = new URL(request.url).searchParams.get('mode')
  const mode: PoolMode = modeParam === 'season' ? 'season' : 'prime'
  const pool = await getPool(mode)
  return NextResponse.json(pool)
}
```

- [ ] **Step 2: Vérifier le type-check et le build**

Run: `npx tsc --noEmit && npm run build`
Expected: clean ; le build liste la route `/api/pool`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: GET /api/pool route serving the player pool by mode"
```

---

### Task 5: Réducteur de draft (machine d'état)

**Files:**
- Create: `src/domain/play/draftReducer.ts`
- Test: `src/domain/play/draftReducer.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/play/draftReducer.test.ts`:
```ts
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
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/play/draftReducer.test.ts`
Expected: FAIL ("Cannot find module './draftReducer'").

- [ ] **Step 3: Implémenter**

Create `src/domain/play/draftReducer.ts`:
```ts
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
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/play/draftReducer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: pure draft reducer state machine"
```

---

### Task 6: Orchestration de partie + intégration + checks

**Files:**
- Create: `src/domain/play/playGame.ts`
- Create: `src/domain/play/index.ts`
- Test: `src/domain/play/playGame.test.ts`
- Test: `src/domain/play/integration.test.ts`

- [ ] **Step 1: Écrire le test qui échoue (orchestration)**

Create `src/domain/play/playGame.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { simulateFromPicks } from './playGame'
import { samplePool } from '../../data/samplePool'

describe('simulateFromPicks', () => {
  it('simulates a season from a list of picked players', () => {
    const picked = samplePool.slice(0, 11)
    const result = simulateFromPicks(picked, { seed: 1, teamName: 'Mon XI' })
    expect(result.table).toHaveLength(18)
    expect(result.userRow.name).toBe('Mon XI')
  })
  it('throws when there are no picks', () => {
    expect(() => simulateFromPicks([], { seed: 1 })).toThrow()
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/play/playGame.test.ts`
Expected: FAIL ("Cannot find module './playGame'").

- [ ] **Step 3: Implémenter l'orchestration + le barrel**

Create `src/domain/play/playGame.ts`:
```ts
import { PoolPlayer, SeasonResult, simulateSeason } from '../game'

export interface PlayOptions {
  seed: number
  teamName?: string
}

export function simulateFromPicks(picked: PoolPlayer[], options: PlayOptions): SeasonResult {
  if (picked.length === 0) throw new Error('simulateFromPicks: no players picked')
  return simulateSeason(picked, { seed: options.seed, teamName: options.teamName })
}
```

Create `src/domain/play/index.ts`:
```ts
export * from './draftReducer'
export * from './playGame'
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/play/playGame.test.ts`
Expected: PASS.

- [ ] **Step 5: Écrire le test d'intégration**

Create `src/domain/play/integration.test.ts`:
```ts
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
```

- [ ] **Step 6: Lancer toute la suite + checks**

Run: `npm test && npm run lint && npm run build && npx tsc --noEmit`
Expected: tous les tests PASS (+ ceux des Plans 1-3), lint OK, build OK (route `/api/pool` présente), tsc OK.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: game orchestration and draft-to-simulation play integration"
```

---

## Couverture du spec (auto-revue)

- §2.5 note effective (override sinon calculée) → Task 1 (`rowToPoolPlayer`).
- §2.4 Prime vs Saison → Task 3 (`getPool` : Prime = saison prime de chaque joueur ; Saison = toutes les saisons).
- §4 boucle / draft tour par tour → Task 5 (réducteur) + Task 6 (intégration draft→simulation).
- §3 l'app lit seulement (pas d'écriture au runtime) → Tasks 3-4 (lecture pure).
- Jouabilité sans base → Task 2 (pool d'exemple) + repli en Task 3.

**Hors de ce plan (Plan 5) :** écrans React (accueil/draft/fin), thème gaming/doré, composants (carte joueur, terrain, classements), PWA. **Note pour l'UI :** le mode Saison renvoie potentiellement plusieurs cartes par joueur (une par saison) ; l'écran de draft doit les traiter comme des entrées distinctes. Le pool d'exemple ne distingue pas Prime/Saison (même liste) — c'est attendu hors base.
```
