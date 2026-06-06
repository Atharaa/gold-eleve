# Onze d'Or — Plan 3 : Moteurs de jeu (draft + simulation)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter la logique pure et déterministe du jeu : proposition de candidats de draft sous contraintes, note d'équipe, et simulation d'une saison produisant un classement de championnat + classements individuels (buteurs, passeurs, gardiens, meilleure note).

**Architecture:** Modules de domaine purs sous `src/domain/game/`, sans I/O ni framework, alimentés par un RNG seedé (reproductible et testable). Le draft opère sur un pool de joueurs en mémoire (`PoolPlayer[]` — construit depuis la base en Plan 4). La simulation enchaîne : génération d'adversaires → matchs (Poisson sur buts attendus dérivés des notes) → agrégation du classement → distribution pondérée des buts/passes aux joueurs → assemblage des classements. Imports relatifs uniquement.

**Tech Stack:** TypeScript, Vitest. **Node ≥ 20.9** (`nvm use 20` avant toute commande). Réutilise `src/domain/ratings` (Plan 1).

**Référence spec:** `docs/superpowers/specs/2026-06-06-onze-dor-design.md` (§4 boucle de jeu, §5 simulation). **Hors de ce plan :** UI, lecture base, persistance, profondeur.

**Convention RNG :** toutes les fonctions stochastiques reçoivent un `rng: () => number` (float [0,1)) en paramètre. `Math.random` est interdit. Déterminisme = même seed → même résultat.

---

### Task 1: RNG seedé et helpers stochastiques

**Files:**
- Create: `src/domain/game/rng.ts`
- Test: `src/domain/game/rng.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/game/rng.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createRng, randomInt, pickN, poisson } from './rng'

describe('createRng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42)
    const b = createRng(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('produces floats in [0, 1)', () => {
    const rng = createRng(1)
    for (let i = 0; i < 100; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('randomInt', () => {
  it('stays within [0, maxExclusive)', () => {
    const rng = createRng(7)
    for (let i = 0; i < 100; i++) {
      const v = randomInt(rng, 5)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(5)
      expect(Number.isInteger(v)).toBe(true)
    }
  })
})

describe('pickN', () => {
  it('returns n distinct items when the pool is large enough', () => {
    const rng = createRng(3)
    const picked = pickN(rng, [1, 2, 3, 4, 5], 3)
    expect(picked).toHaveLength(3)
    expect(new Set(picked).size).toBe(3)
  })
  it('returns at most the pool size', () => {
    const rng = createRng(3)
    expect(pickN(rng, [1, 2], 5)).toHaveLength(2)
  })
  it('does not mutate the input array', () => {
    const rng = createRng(3)
    const input = [1, 2, 3, 4]
    pickN(rng, input, 2)
    expect(input).toEqual([1, 2, 3, 4])
  })
})

describe('poisson', () => {
  it('returns a non-negative integer', () => {
    const rng = createRng(9)
    for (let i = 0; i < 50; i++) {
      const v = poisson(rng, 1.4)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(v)).toBe(true)
    }
  })
  it('has a sample mean close to lambda over many draws', () => {
    const rng = createRng(123)
    let sum = 0
    const n = 5000
    for (let i = 0; i < n; i++) sum += poisson(rng, 2)
    expect(sum / n).toBeGreaterThan(1.7)
    expect(sum / n).toBeLessThan(2.3)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/game/rng.test.ts`
Expected: FAIL ("Cannot find module './rng'").

- [ ] **Step 3: Implémenter**

Create `src/domain/game/rng.ts`:
```ts
// PRNG déterministe (mulberry32). Retourne un float dans [0, 1).
export function createRng(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomInt(rng: () => number, maxExclusive: number): number {
  return Math.floor(rng() * maxExclusive)
}

// Tire n éléments distincts sans muter l'entrée (Fisher-Yates partiel sur une copie).
export function pickN<T>(rng: () => number, items: T[], n: number): T[] {
  const copy = [...items]
  const out: T[] = []
  const k = Math.min(n, copy.length)
  for (let i = 0; i < k; i++) {
    const idx = randomInt(rng, copy.length)
    out.push(copy.splice(idx, 1)[0])
  }
  return out
}

// Tirage de Poisson (algorithme de Knuth).
export function poisson(rng: () => number, lambda: number): number {
  const L = Math.exp(-lambda)
  let k = 0
  let p = 1
  do {
    k++
    p *= rng()
  } while (p > L)
  return k - 1
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/game/rng.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: seeded RNG and stochastic helpers"
```

---

### Task 2: Types de jeu et formations

**Files:**
- Create: `src/domain/game/types.ts`
- Create: `src/domain/game/formations.ts`
- Test: `src/domain/game/formations.test.ts`

- [ ] **Step 1: Définir les types**

Create `src/domain/game/types.ts`:
```ts
import { PositionGroup } from '../ratings'

export interface PoolPlayer {
  playerId: string
  playerName: string
  clubName: string
  season: string
  competition: string
  positionGroup: PositionGroup
  rating: number
  reliability: 1 | 2 | 3 | 4
  marketValue?: number
}

export interface TableRow {
  name: string
  isUser: boolean
  played: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  points: number
  cleanSheets: number
  position?: number
}

export interface RankRow {
  playerName: string
  club: string
  value: number
  isUser: boolean
}

export interface SeasonResult {
  table: TableRow[]
  userRow: TableRow
  invincible: boolean
  scorers: RankRow[]
  assisters: RankRow[]
  keepers: RankRow[]
  bestRated: RankRow
}
```

- [ ] **Step 2: Écrire le test qui échoue**

Create `src/domain/game/formations.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { formationSlots, FORMATION_NAMES } from './formations'

describe('formationSlots', () => {
  it('returns 11 slots for 4-3-3', () => {
    const slots = formationSlots('4-3-3')
    expect(slots).toHaveLength(11)
  })
  it('4-3-3 has 1 GK, 4 DEF, 3 MID, 3 ATT', () => {
    const slots = formationSlots('4-3-3')
    const count = (g: string) => slots.filter((s) => s === g).length
    expect(count('GK')).toBe(1)
    expect(count('DEF')).toBe(4)
    expect(count('MID')).toBe(3)
    expect(count('ATT')).toBe(3)
  })
  it('every known formation has exactly 11 slots and exactly 1 GK', () => {
    for (const name of FORMATION_NAMES) {
      const slots = formationSlots(name)
      expect(slots).toHaveLength(11)
      expect(slots.filter((s) => s === 'GK')).toHaveLength(1)
    }
  })
  it('returns a copy (mutating the result does not affect later calls)', () => {
    const slots = formationSlots('4-4-2')
    slots.pop()
    expect(formationSlots('4-4-2')).toHaveLength(11)
  })
  it('throws on an unknown formation', () => {
    expect(() => formationSlots('9-0-1')).toThrow()
  })
})
```

- [ ] **Step 3: Vérifier l'échec**

Run: `npx vitest run src/domain/game/formations.test.ts`
Expected: FAIL ("Cannot find module './formations'").

- [ ] **Step 4: Implémenter**

Create `src/domain/game/formations.ts`:
```ts
import { PositionGroup } from '../ratings'

const FORMATIONS: Record<string, PositionGroup[]> = {
  '4-3-3': ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'ATT', 'ATT', 'ATT'],
  '4-4-2': ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'ATT', 'ATT'],
  '3-5-2': ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'ATT', 'ATT'],
  '4-2-3-1': ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'MID', 'ATT'],
}

export const FORMATION_NAMES = Object.keys(FORMATIONS)

export function formationSlots(name: string): PositionGroup[] {
  const slots = FORMATIONS[name]
  if (!slots) throw new Error(`Unknown formation: ${name}`)
  return [...slots]
}
```

- [ ] **Step 5: Vérifier le succès**

Run: `npx vitest run src/domain/game/formations.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: game types and formation definitions"
```

---

### Task 3: Contraintes de draft

**Files:**
- Create: `src/domain/game/constraints.ts`
- Test: `src/domain/game/constraints.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/game/constraints.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { oneClubPerTeam, budgetCap } from './constraints'
import { PoolPlayer } from './types'

function player(id: string, club: string, marketValue?: number): PoolPlayer {
  return {
    playerId: id, playerName: id, clubName: club, season: '2018-19', competition: 'L1',
    positionGroup: 'MID', rating: 80, reliability: 4, marketValue,
  }
}

describe('oneClubPerTeam', () => {
  it('allows a club not yet present', () => {
    expect(oneClubPerTeam.allows(player('a', 'PSG'), [player('b', 'Lyon')])).toBe(true)
  })
  it('blocks a club already present', () => {
    expect(oneClubPerTeam.allows(player('a', 'PSG'), [player('b', 'PSG')])).toBe(false)
  })
})

describe('budgetCap', () => {
  const cap = budgetCap(100)
  it('allows when the candidate fits under the cap', () => {
    expect(cap.allows(player('a', 'PSG', 40), [player('b', 'Lyon', 50)])).toBe(true)
  })
  it('blocks when the candidate would exceed the cap', () => {
    expect(cap.allows(player('a', 'PSG', 60), [player('b', 'Lyon', 50)])).toBe(false)
  })
  it('treats a missing market value as 0', () => {
    expect(cap.allows(player('a', 'PSG'), [player('b', 'Lyon', 50)])).toBe(true)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/game/constraints.test.ts`
Expected: FAIL ("Cannot find module './constraints'").

- [ ] **Step 3: Implémenter**

Create `src/domain/game/constraints.ts`:
```ts
import { PoolPlayer } from './types'

export interface Constraint {
  name: string
  allows: (candidate: PoolPlayer, picked: PoolPlayer[]) => boolean
}

export const oneClubPerTeam: Constraint = {
  name: 'one-per-club',
  allows: (candidate, picked) => !picked.some((p) => p.clubName === candidate.clubName),
}

export function budgetCap(maxTotal: number): Constraint {
  return {
    name: `budget-${maxTotal}`,
    allows: (candidate, picked) => {
      const spent = picked.reduce((sum, p) => sum + (p.marketValue ?? 0), 0)
      return spent + (candidate.marketValue ?? 0) <= maxTotal
    },
  }
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/game/constraints.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: draft constraints (one per club, budget cap)"
```

---

### Task 4: Proposition de candidats et note d'équipe

**Files:**
- Create: `src/domain/game/draft.ts`
- Test: `src/domain/game/draft.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/game/draft.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { proposeCandidates, teamRating } from './draft'
import { createRng } from './rng'
import { oneClubPerTeam } from './constraints'
import { PoolPlayer } from './types'

function player(id: string, group: PoolPlayer['positionGroup'], club = 'Club', rating = 80): PoolPlayer {
  return { playerId: id, playerName: id, clubName: club, season: '2018-19', competition: 'L1', positionGroup: group, rating, reliability: 4 }
}

const pool: PoolPlayer[] = [
  player('gk1', 'GK'), player('def1', 'DEF'), player('def2', 'DEF'),
  player('mid1', 'MID'), player('mid2', 'MID'), player('mid3', 'MID'),
  player('att1', 'ATT'), player('att2', 'ATT'),
]

describe('proposeCandidates', () => {
  it('only proposes players of the requested position group', () => {
    const candidates = proposeCandidates(pool, 'MID', [], createRng(1))
    expect(candidates.every((c) => c.positionGroup === 'MID')).toBe(true)
  })
  it('defaults to 3 candidates', () => {
    expect(proposeCandidates(pool, 'MID', [], createRng(1))).toHaveLength(3)
  })
  it('excludes already-picked players', () => {
    const picked = [pool.find((p) => p.playerId === 'mid1')!]
    const candidates = proposeCandidates(pool, 'MID', picked, createRng(1))
    expect(candidates.some((c) => c.playerId === 'mid1')).toBe(false)
  })
  it('is deterministic for a given seed', () => {
    const a = proposeCandidates(pool, 'MID', [], createRng(5)).map((c) => c.playerId)
    const b = proposeCandidates(pool, 'MID', [], createRng(5)).map((c) => c.playerId)
    expect(a).toEqual(b)
  })
  it('respects constraints (one per club)', () => {
    const clubPool = [player('a', 'ATT', 'PSG'), player('b', 'ATT', 'PSG'), player('c', 'ATT', 'PSG')]
    const picked = [player('x', 'GK', 'PSG')]
    const candidates = proposeCandidates(clubPool, 'ATT', picked, createRng(2), { constraints: [oneClubPerTeam] })
    expect(candidates).toHaveLength(0)
  })
})

describe('teamRating', () => {
  it('is the rounded average of player ratings', () => {
    expect(teamRating([player('a', 'ATT', 'Club', 90), player('b', 'ATT', 'Club', 81)])).toBe(86)
  })
  it('is 0 for an empty team', () => {
    expect(teamRating([])).toBe(0)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/game/draft.test.ts`
Expected: FAIL ("Cannot find module './draft'").

- [ ] **Step 3: Implémenter**

Create `src/domain/game/draft.ts`:
```ts
import { PositionGroup } from '../ratings'
import { pickN } from './rng'
import { Constraint } from './constraints'
import { PoolPlayer } from './types'

export interface DraftOptions {
  candidatesPerSlot?: number
  constraints?: Constraint[]
}

export function proposeCandidates(
  pool: PoolPlayer[],
  group: PositionGroup,
  picked: PoolPlayer[],
  rng: () => number,
  options: DraftOptions = {},
): PoolPlayer[] {
  const n = options.candidatesPerSlot ?? 3
  const constraints = options.constraints ?? []
  const pickedIds = new Set(picked.map((p) => p.playerId))

  const eligible = pool.filter(
    (p) =>
      p.positionGroup === group &&
      !pickedIds.has(p.playerId) &&
      constraints.every((c) => c.allows(p, picked)),
  )

  return pickN(rng, eligible, n)
}

export function teamRating(team: PoolPlayer[]): number {
  if (team.length === 0) return 0
  return Math.round(team.reduce((sum, p) => sum + p.rating, 0) / team.length)
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/game/draft.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: draft candidate proposal and team rating"
```

---

### Task 5: Génération d'adversaires et simulation d'un match

**Files:**
- Create: `src/domain/game/match.ts`
- Test: `src/domain/game/match.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/game/match.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { generateOpponents, expectedGoals, simulateMatch } from './match'
import { createRng } from './rng'

describe('generateOpponents', () => {
  it('generates the requested count with distinct names', () => {
    const opps = generateOpponents(createRng(1), 17)
    expect(opps).toHaveLength(17)
    expect(new Set(opps.map((o) => o.name)).size).toBe(17)
  })
  it('keeps strengths within a plausible band', () => {
    for (const o of generateOpponents(createRng(2), 17)) {
      expect(o.strength).toBeGreaterThanOrEqual(50)
      expect(o.strength).toBeLessThanOrEqual(92)
    }
  })
})

describe('expectedGoals', () => {
  it('gives equal teams the same baseline', () => {
    expect(expectedGoals(75, 75)).toBeCloseTo(1.35)
  })
  it('rewards a stronger attack', () => {
    expect(expectedGoals(90, 70)).toBeGreaterThan(expectedGoals(70, 90))
  })
})

describe('simulateMatch', () => {
  it('returns two non-negative integer goal counts', () => {
    const [a, b] = simulateMatch(createRng(3), 80, 70)
    expect(Number.isInteger(a)).toBe(true)
    expect(Number.isInteger(b)).toBe(true)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(b).toBeGreaterThanOrEqual(0)
  })
  it('lets the much stronger team outscore the weaker on average', () => {
    let strong = 0
    let weak = 0
    const rng = createRng(99)
    for (let i = 0; i < 2000; i++) {
      const [a, b] = simulateMatch(rng, 90, 55)
      strong += a
      weak += b
    }
    expect(strong).toBeGreaterThan(weak)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/game/match.test.ts`
Expected: FAIL ("Cannot find module './match'").

- [ ] **Step 3: Implémenter**

Create `src/domain/game/match.ts`:
```ts
import { poisson } from './rng'

export interface Opponent {
  name: string
  strength: number
}

export function generateOpponents(rng: () => number, count: number): Opponent[] {
  const opponents: Opponent[] = []
  for (let i = 0; i < count; i++) {
    const raw = 55 + rng() * 37 // 55..92
    opponents.push({ name: `Club ${i + 1}`, strength: Math.round(Math.min(92, Math.max(50, raw))) })
  }
  return opponents
}

// Buts attendus d'une attaque face à une défense. Base 1.35, modulée par l'écart de force.
export function expectedGoals(attack: number, defense: number): number {
  return 1.35 * Math.pow(2, (attack - defense) / 18)
}

export function simulateMatch(rng: () => number, strengthA: number, strengthB: number): [number, number] {
  return [poisson(rng, expectedGoals(strengthA, strengthB)), poisson(rng, expectedGoals(strengthB, strengthA))]
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/game/match.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: opponent generation and single-match simulation"
```

---

### Task 6: Déroulé de saison et construction du classement

**Files:**
- Create: `src/domain/game/season.ts`
- Test: `src/domain/game/season.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/game/season.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { playSeason, buildTable, TeamSeed } from './season'
import { createRng } from './rng'

const teams: TeamSeed[] = [
  { name: 'User', strength: 85, isUser: true },
  { name: 'B', strength: 70, isUser: false },
  { name: 'C', strength: 60, isUser: false },
  { name: 'D', strength: 75, isUser: false },
]

describe('playSeason', () => {
  const rows = playSeason(createRng(10), teams)

  it('returns one row per team', () => {
    expect(rows).toHaveLength(4)
  })
  it('each team plays 2*(N-1) matches', () => {
    for (const r of rows) expect(r.played).toBe(2 * (teams.length - 1))
  })
  it('points equal 3*won + drawn', () => {
    for (const r of rows) expect(r.points).toBe(3 * r.won + r.drawn)
  })
  it('won + drawn + lost equals played', () => {
    for (const r of rows) expect(r.won + r.drawn + r.lost).toBe(r.played)
  })
  it('total goals for equals total goals against across the league', () => {
    const gf = rows.reduce((s, r) => s + r.gf, 0)
    const ga = rows.reduce((s, r) => s + r.ga, 0)
    expect(gf).toBe(ga)
  })
  it('is deterministic for a given seed', () => {
    expect(playSeason(createRng(10), teams)).toEqual(rows)
  })
})

describe('buildTable', () => {
  it('sorts by points then goal difference and assigns positions', () => {
    const sorted = buildTable(playSeason(createRng(10), teams))
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const cur = sorted[i]
      const prevGd = prev.gf - prev.ga
      const curGd = cur.gf - cur.ga
      expect(prev.points > cur.points || (prev.points === cur.points && prevGd >= curGd)).toBe(true)
    }
    expect(sorted[0].position).toBe(1)
    expect(sorted[sorted.length - 1].position).toBe(sorted.length)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/game/season.test.ts`
Expected: FAIL ("Cannot find module './season'").

- [ ] **Step 3: Implémenter**

Create `src/domain/game/season.ts`:
```ts
import { simulateMatch } from './match'
import { TableRow } from './types'

export interface TeamSeed {
  name: string
  strength: number
  isUser: boolean
}

function emptyRow(seed: TeamSeed): TableRow {
  return { name: seed.name, isUser: seed.isUser, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, cleanSheets: 0 }
}

// Double round-robin. Chaque paire ordonnée (i home, j away) joue une fois ;
// la rencontre retour est couverte quand les rôles s'inversent (j, i).
export function playSeason(rng: () => number, teams: TeamSeed[]): TableRow[] {
  const rows = teams.map(emptyRow)
  for (let i = 0; i < teams.length; i++) {
    for (let j = 0; j < teams.length; j++) {
      if (i === j) continue
      const [goalsHome, goalsAway] = simulateMatch(rng, teams[i].strength, teams[j].strength)
      const home = rows[i]
      home.played++
      home.gf += goalsHome
      home.ga += goalsAway
      if (goalsAway === 0) home.cleanSheets++
      if (goalsHome > goalsAway) {
        home.won++
        home.points += 3
      } else if (goalsHome === goalsAway) {
        home.drawn++
        home.points++
      } else {
        home.lost++
      }
    }
  }
  return rows
}

export function buildTable(rows: TableRow[]): TableRow[] {
  const sorted = [...rows].sort(
    (a, b) =>
      b.points - a.points ||
      b.gf - b.ga - (a.gf - a.ga) ||
      b.gf - a.gf ||
      a.name.localeCompare(b.name),
  )
  sorted.forEach((row, index) => {
    row.position = index + 1
  })
  return sorted
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/game/season.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: season round-robin simulation and league table"
```

---

### Task 7: Distribution pondérée des buts et passes

**Files:**
- Create: `src/domain/game/distribute.ts`
- Test: `src/domain/game/distribute.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/game/distribute.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { goalWeight, assistWeight, distribute } from './distribute'
import { createRng } from './rng'
import { PoolPlayer } from './types'

function player(id: string, group: PoolPlayer['positionGroup'], rating = 80): PoolPlayer {
  return { playerId: id, playerName: id, clubName: 'Club', season: '2018-19', competition: 'L1', positionGroup: group, rating, reliability: 4 }
}

describe('weights', () => {
  it('weights attackers above midfielders above defenders for goals', () => {
    expect(goalWeight(player('a', 'ATT'))).toBeGreaterThan(goalWeight(player('b', 'MID')))
    expect(goalWeight(player('b', 'MID'))).toBeGreaterThan(goalWeight(player('c', 'DEF')))
  })
  it('gives goalkeepers zero goal weight', () => {
    expect(goalWeight(player('gk', 'GK'))).toBe(0)
  })
  it('weights midfielders highest for assists', () => {
    expect(assistWeight(player('m', 'MID'))).toBeGreaterThan(assistWeight(player('a', 'ATT')))
  })
})

describe('distribute', () => {
  const team = [player('gk', 'GK'), player('def', 'DEF'), player('mid', 'MID'), player('att', 'ATT')]

  it('distributes exactly the total count', () => {
    const counts = distribute(createRng(1), team, 30, goalWeight)
    const sum = [...counts.values()].reduce((a, b) => a + b, 0)
    expect(sum).toBe(30)
  })
  it('never assigns goals to a zero-weight player', () => {
    const counts = distribute(createRng(1), team, 30, goalWeight)
    expect(counts.get('gk')).toBeUndefined()
  })
  it('gives the attacker more goals than the defender over a large sample', () => {
    const counts = distribute(createRng(7), team, 500, goalWeight)
    expect((counts.get('att') ?? 0)).toBeGreaterThan(counts.get('def') ?? 0)
  })
  it('returns an empty map when no player has positive weight', () => {
    const counts = distribute(createRng(1), [player('gk', 'GK')], 10, goalWeight)
    expect(counts.size).toBe(0)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/game/distribute.test.ts`
Expected: FAIL ("Cannot find module './distribute'").

- [ ] **Step 3: Implémenter**

Create `src/domain/game/distribute.ts`:
```ts
import { PositionGroup } from '../ratings'
import { PoolPlayer } from './types'

const GOAL_FACTOR: Record<PositionGroup, number> = { ATT: 1, MID: 0.45, DEF: 0.12, GK: 0 }
const ASSIST_FACTOR: Record<PositionGroup, number> = { ATT: 0.6, MID: 1, DEF: 0.3, GK: 0 }

export function goalWeight(player: PoolPlayer): number {
  return player.rating * GOAL_FACTOR[player.positionGroup]
}

export function assistWeight(player: PoolPlayer): number {
  return player.rating * ASSIST_FACTOR[player.positionGroup]
}

function weightedPick(rng: () => number, players: PoolPlayer[], weights: number[], total: number): PoolPlayer {
  let r = rng() * total
  for (let i = 0; i < players.length; i++) {
    r -= weights[i]
    if (r <= 0) return players[i]
  }
  return players[players.length - 1]
}

// Répartit `total` unités (buts/passes) entre les joueurs au prorata de leur poids.
export function distribute(
  rng: () => number,
  players: PoolPlayer[],
  total: number,
  weightFn: (p: PoolPlayer) => number,
): Map<string, number> {
  const counts = new Map<string, number>()
  const eligible = players.filter((p) => weightFn(p) > 0)
  if (eligible.length === 0) return counts

  const weights = eligible.map(weightFn)
  const weightTotal = weights.reduce((a, b) => a + b, 0)

  for (let i = 0; i < total; i++) {
    const player = weightedPick(rng, eligible, weights, weightTotal)
    counts.set(player.playerId, (counts.get(player.playerId) ?? 0) + 1)
  }
  return counts
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/game/distribute.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: weighted goal and assist distribution"
```

---

### Task 8: Assemblage des classements individuels

**Files:**
- Create: `src/domain/game/rankings.ts`
- Test: `src/domain/game/rankings.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/game/rankings.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { assembleScorers, assembleKeepers, assembleBestRated } from './rankings'
import { createRng } from './rng'
import { PoolPlayer, TableRow } from './types'
import { Opponent } from './match'

function player(id: string, group: PoolPlayer['positionGroup'], rating = 80): PoolPlayer {
  return { playerId: id, playerName: id, clubName: 'User', season: '2018-19', competition: 'L1', positionGroup: group, rating, reliability: 4 }
}

const team = [player('gk', 'GK', 85), player('def', 'DEF', 70), player('mid', 'MID', 82), player('att', 'ATT', 90)]
const userRow: TableRow = { name: 'User', isUser: true, played: 6, won: 4, drawn: 1, lost: 1, gf: 12, ga: 5, points: 13, cleanSheets: 3, position: 2 }
const opponentRows: TableRow[] = [
  { name: 'B', isUser: false, played: 6, won: 5, drawn: 0, lost: 1, gf: 14, ga: 4, points: 15, cleanSheets: 4, position: 1 },
  { name: 'C', isUser: false, played: 6, won: 1, drawn: 1, lost: 4, gf: 5, ga: 13, points: 4, cleanSheets: 1, position: 3 },
]

describe('assembleScorers', () => {
  it('caps at 10 entries and is sorted descending by goals', () => {
    const scorers = assembleScorers(createRng(1), team, userRow, opponentRows)
    expect(scorers.length).toBeLessThanOrEqual(10)
    for (let i = 1; i < scorers.length; i++) {
      expect(scorers[i - 1].value).toBeGreaterThanOrEqual(scorers[i].value)
    }
  })
  it('includes at least one user player flagged isUser', () => {
    const scorers = assembleScorers(createRng(1), team, userRow, opponentRows)
    expect(scorers.some((s) => s.isUser)).toBe(true)
  })
  it("user scorers' goals sum to the user team goals for", () => {
    const scorers = assembleScorers(createRng(1), team, userRow, opponentRows)
    const userGoals = scorers.filter((s) => s.isUser).reduce((a, s) => a + s.value, 0)
    // les buteurs user listés peuvent être tronqués par le top 10, mais avec 4 joueurs ils tiennent tous
    expect(userGoals).toBe(12)
  })
})

describe('assembleKeepers', () => {
  it('uses the user goalkeeper clean sheets and flags isUser', () => {
    const keepers = assembleKeepers(team, userRow, opponentRows)
    const userKeeper = keepers.find((k) => k.isUser)
    expect(userKeeper?.playerName).toBe('gk')
    expect(userKeeper?.value).toBe(3)
  })
})

describe('assembleBestRated', () => {
  it('returns the highest-rated entry across user and opponents', () => {
    const opponents: Opponent[] = [{ name: 'B', strength: 88 }, { name: 'C', strength: 60 }]
    const best = assembleBestRated(team, userRow, opponents)
    // meilleur joueur user = att (90) > meilleure force adverse (88)
    expect(best.value).toBe(90)
    expect(best.isUser).toBe(true)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/game/rankings.test.ts`
Expected: FAIL ("Cannot find module './rankings'").

- [ ] **Step 3: Implémenter**

Create `src/domain/game/rankings.ts`:
```ts
import { distribute, goalWeight, assistWeight } from './distribute'
import { Opponent } from './match'
import { PoolPlayer, RankRow, TableRow } from './types'

function topTen(rows: RankRow[]): RankRow[] {
  return [...rows]
    .sort((a, b) => b.value - a.value || a.playerName.localeCompare(b.playerName))
    .slice(0, 10)
}

function userRankRows(
  rng: () => number,
  team: PoolPlayer[],
  userRow: TableRow,
  total: number,
  weightFn: (p: PoolPlayer) => number,
): RankRow[] {
  const counts = distribute(rng, team, total, weightFn)
  return team
    .filter((p) => counts.has(p.playerId))
    .map((p) => ({ playerName: p.playerName, club: userRow.name, value: counts.get(p.playerId)!, isUser: true }))
}

export function assembleScorers(rng: () => number, team: PoolPlayer[], userRow: TableRow, opponentRows: TableRow[]): RankRow[] {
  const user = userRankRows(rng, team, userRow, userRow.gf, goalWeight)
  const opponents = opponentRows.map((r) => ({
    playerName: `Buteur ${r.name}`,
    club: r.name,
    value: Math.round(r.gf * 0.35),
    isUser: false,
  }))
  return topTen([...user, ...opponents])
}

export function assembleAssisters(rng: () => number, team: PoolPlayer[], userRow: TableRow, opponentRows: TableRow[]): RankRow[] {
  const user = userRankRows(rng, team, userRow, Math.round(userRow.gf * 0.7), assistWeight)
  const opponents = opponentRows.map((r) => ({
    playerName: `Passeur ${r.name}`,
    club: r.name,
    value: Math.round(r.gf * 0.25),
    isUser: false,
  }))
  return topTen([...user, ...opponents])
}

export function assembleKeepers(team: PoolPlayer[], userRow: TableRow, opponentRows: TableRow[]): RankRow[] {
  const keeper = team.find((p) => p.positionGroup === 'GK')
  const user: RankRow[] = keeper
    ? [{ playerName: keeper.playerName, club: userRow.name, value: userRow.cleanSheets, isUser: true }]
    : []
  const opponents = opponentRows.map((r) => ({
    playerName: `Gardien ${r.name}`,
    club: r.name,
    value: r.cleanSheets,
    isUser: false,
  }))
  return topTen([...user, ...opponents])
}

export function assembleBestRated(team: PoolPlayer[], userRow: TableRow, opponents: Opponent[]): RankRow {
  const userBest = team.reduce((best, p) => (p.rating > best.rating ? p : best))
  const candidates: RankRow[] = [
    { playerName: userBest.playerName, club: userRow.name, value: userBest.rating, isUser: true },
    ...opponents.map((o) => ({ playerName: `Cadre ${o.name}`, club: o.name, value: o.strength, isUser: false })),
  ]
  return topTen(candidates)[0]
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/game/rankings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: assemble scorers, assisters, keepers and best-rated rankings"
```

---

### Task 9: Simulation de saison de bout en bout

**Files:**
- Create: `src/domain/game/simulate.ts`
- Test: `src/domain/game/simulate.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/game/simulate.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { simulateSeason } from './simulate'
import { PoolPlayer } from './types'

function makeTeam(rating: number): PoolPlayer[] {
  const groups: PoolPlayer['positionGroup'][] = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'ATT', 'ATT', 'ATT']
  return groups.map((group, i) => ({
    playerId: `p${i}`, playerName: `Player ${i}`, clubName: 'User', season: '2018-19', competition: 'L1',
    positionGroup: group, rating, reliability: 4,
  }))
}

describe('simulateSeason', () => {
  const result = simulateSeason(makeTeam(82), { seed: 2024, teamName: 'User' })

  it('builds an 18-team table by default with the user inside', () => {
    expect(result.table).toHaveLength(18)
    expect(result.userRow.name).toBe('User')
    expect(result.table.some((r) => r.isUser)).toBe(true)
  })
  it('detects an invincible season when the user never loses', () => {
    expect(result.invincible).toBe(result.userRow.lost === 0)
  })
  it('produces non-empty scorer, assister and keeper rankings and a best-rated entry', () => {
    expect(result.scorers.length).toBeGreaterThan(0)
    expect(result.assisters.length).toBeGreaterThan(0)
    expect(result.keepers.length).toBeGreaterThan(0)
    expect(result.bestRated.value).toBeGreaterThan(0)
  })
  it('is fully deterministic for a given seed', () => {
    expect(simulateSeason(makeTeam(82), { seed: 2024, teamName: 'User' })).toEqual(result)
  })
  it('lets a far stronger team finish with more points than a far weaker one (same seed)', () => {
    const strong = simulateSeason(makeTeam(95), { seed: 50, teamName: 'User' })
    const weak = simulateSeason(makeTeam(50), { seed: 50, teamName: 'User' })
    expect(strong.userRow.points).toBeGreaterThan(weak.userRow.points)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/game/simulate.test.ts`
Expected: FAIL ("Cannot find module './simulate'").

- [ ] **Step 3: Implémenter**

Create `src/domain/game/simulate.ts`:
```ts
import { createRng } from './rng'
import { teamRating } from './draft'
import { generateOpponents } from './match'
import { playSeason, buildTable, TeamSeed } from './season'
import { assembleScorers, assembleAssisters, assembleKeepers, assembleBestRated } from './rankings'
import { PoolPlayer, SeasonResult } from './types'

export interface SimulateOptions {
  seed: number
  teamName?: string
  opponents?: number
}

export function simulateSeason(team: PoolPlayer[], options: SimulateOptions): SeasonResult {
  const rng = createRng(options.seed)
  const opponentCount = options.opponents ?? 17
  const teamName = options.teamName ?? 'Ton équipe'

  const opponents = generateOpponents(rng, opponentCount)
  const seeds: TeamSeed[] = [
    { name: teamName, strength: teamRating(team), isUser: true },
    ...opponents.map((o) => ({ name: o.name, strength: o.strength, isUser: false })),
  ]

  const table = buildTable(playSeason(rng, seeds))
  const userRow = table.find((r) => r.isUser)!
  const opponentRows = table.filter((r) => !r.isUser)

  return {
    table,
    userRow,
    invincible: userRow.lost === 0,
    scorers: assembleScorers(rng, team, userRow, opponentRows),
    assisters: assembleAssisters(rng, team, userRow, opponentRows),
    keepers: assembleKeepers(team, userRow, opponentRows),
    bestRated: assembleBestRated(team, userRow, opponents),
  }
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/game/simulate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: end-to-end season simulation"
```

---

### Task 10: Barrel d'export + sanity d'intégration

**Files:**
- Create: `src/domain/game/index.ts`
- Test: `src/domain/game/integration.test.ts`

- [ ] **Step 1: Créer le barrel**

Create `src/domain/game/index.ts`:
```ts
export * from './types'
export * from './rng'
export * from './formations'
export * from './constraints'
export * from './draft'
export * from './match'
export * from './season'
export * from './distribute'
export * from './rankings'
export * from './simulate'
```

- [ ] **Step 2: Écrire le test d'intégration**

Create `src/domain/game/integration.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { formationSlots, proposeCandidates, teamRating, simulateSeason, oneClubPerTeam, createRng } from './index'
import type { PoolPlayer } from './index'

// Construit un pool de 8 joueurs par groupe de poste, notes variées, clubs variés.
function buildPool(): PoolPlayer[] {
  const groups: PoolPlayer['positionGroup'][] = ['GK', 'DEF', 'MID', 'ATT']
  const pool: PoolPlayer[] = []
  for (const group of groups) {
    for (let i = 0; i < 8; i++) {
      pool.push({
        playerId: `${group}-${i}`, playerName: `${group} ${i}`, clubName: `${group}-club-${i}`,
        season: '2018-19', competition: 'L1', positionGroup: group, rating: 70 + i * 3, reliability: 4,
      })
    }
  }
  return pool
}

describe('game integration: draft a full XI then simulate', () => {
  it('drafts 11 players respecting the formation and one-per-club, then simulates a coherent season', () => {
    const pool = buildPool()
    const rng = createRng(2024)
    const slots = formationSlots('4-3-3')
    const picked: PoolPlayer[] = []

    for (const group of slots) {
      const candidates = proposeCandidates(pool, group, picked, rng, { constraints: [oneClubPerTeam] })
      expect(candidates.length).toBeGreaterThan(0)
      picked.push(candidates[0])
    }

    expect(picked).toHaveLength(11)
    // une seule équipe par club
    expect(new Set(picked.map((p) => p.clubName)).size).toBe(11)

    const result = simulateSeason(picked, { seed: 1, teamName: 'Mon XI' })
    expect(result.table).toHaveLength(18)
    expect(result.userRow.played).toBe(34)
    expect(teamRating(picked)).toBeGreaterThan(0)
  })
})
```

> Le pool a ainsi 32 clubs distincts (`GK-club-0`, `DEF-club-3`, …), ce qui permet au draft sous `oneClubPerTeam` d'aboutir à 11 clubs distincts.

- [ ] **Step 3: Lancer toute la suite + checks**

Run: `npm test && npm run lint && npm run build && npx tsc --noEmit`
Expected: tous les tests PASS, lint OK, build OK, tsc OK.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: game engine barrel export and draft-to-simulation integration test"
```

---

## Couverture du spec (auto-revue)

- §4 boucle : draft par poste avec candidats → Tasks 2 (formations), 3-4 (contraintes + proposition), note d'équipe → Task 4.
- §4 contraintes/objectifs (budget, quotas) → Task 3 (oneClubPerTeam, budgetCap ; base extensible).
- §5 simulation probabiliste seedée et déterministe → Tasks 1 (RNG), 5-6 (match + saison), 9 (bout en bout).
- §5 classement championnat (équipe surlignée via `isUser`, position) → Task 6.
- §5 classements buteurs / passeurs / gardiens / meilleure note (joueurs user inclus et flaggés) → Tasks 7-8.
- §5 saison invincible → Task 9.

**Hors de ce plan :** UI (accueil/draft/fin, direction gaming/dorée), construction du `PoolPlayer[]` depuis Postgres, modes Prime/Saison côté lecture (le mode détermine quelles `(joueur, saison)` entrent dans le pool — fait en Plan 4), persistance, profondeur. **Calibration** (forces d'adversaires, facteurs offensifs, base de buts attendus) : valeurs raisonnables posées ici, ajustables ultérieurement.
```
