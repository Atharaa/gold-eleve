# Onze d'Or — Plan 6 : Défis (objectifs & contraintes de draft)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter des défis à la partie : un défi applique des contraintes au draft et définit des objectifs évalués après la simulation (champion, invincible, meilleur buteur, défense de fer…), qui rapportent des points.

**Architecture:** Logique pure sous `src/domain/challenges/` : `Objective` (libellé + points + prédicat sur un `EvalContext`), `Challenge` (contraintes + objectifs), des fabriques d'objectifs, un catalogue de défis, et `evaluateChallenge`. Réutilise les `Constraint` de Plan 3 (+ une nouvelle `maxPlayerRating`). L'UI ajoute un sélecteur de défi à l'accueil ; la page de jeu applique les contraintes au draft et affiche les objectifs/score à la fin. Tous les défis livrés sont **jouables sur le pool d'exemple** (aucun ne peut bloquer le draft).

**Tech Stack:** TypeScript, Vitest, Next.js. **Node ≥ 20.9** (`nvm use 20`). Réutilise `src/domain/game` et `src/domain/play`.

**Référence spec:** `docs/superpowers/specs/2026-06-06-onze-dor-design.md` (§6 profondeur — objectifs & contraintes). **Hors de ce plan :** carrière, défi du jour, collection, admin, scraping.

---

### Task 1: Types & fabriques d'objectifs

**Files:**
- Create: `src/domain/challenges/types.ts`
- Create: `src/domain/challenges/objectives.ts`
- Test: `src/domain/challenges/objectives.test.ts`

- [ ] **Step 1: Types**

Create `src/domain/challenges/types.ts`:
```ts
import { PoolPlayer, SeasonResult, Constraint } from '../game'

export interface EvalContext {
  picked: PoolPlayer[]
  result: SeasonResult
  teamRating: number
}

export interface Objective {
  id: string
  label: string
  points: number
  check: (ctx: EvalContext) => boolean
}

export interface Challenge {
  id: string
  name: string
  description: string
  constraints: Constraint[]
  objectives: Objective[]
}

export interface ObjectiveResult {
  id: string
  label: string
  points: number
  completed: boolean
}

export interface ChallengeResult {
  objectives: ObjectiveResult[]
  totalPoints: number
  maxPoints: number
}
```

- [ ] **Step 2: Écrire le test qui échoue**

Create `src/domain/challenges/objectives.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { champion, invincible, topScorer, scoreAtLeast, concedeAtMost, bestRatedIsUser } from './objectives'
import { EvalContext } from './types'
import { SeasonResult, TableRow, RankRow } from '../game'

function userRow(over: Partial<TableRow> = {}): TableRow {
  return { name: 'Mon XI', isUser: true, played: 34, won: 20, drawn: 8, lost: 6, gf: 60, ga: 30, points: 68, cleanSheets: 10, position: 3, ...over }
}
function rank(isUser: boolean): RankRow {
  return { playerName: 'X', club: 'Mon XI', value: 20, isUser }
}
function result(over: Partial<SeasonResult> = {}): SeasonResult {
  const u = over.userRow ?? userRow()
  return {
    table: over.table ?? [u],
    userRow: u,
    invincible: over.invincible ?? false,
    scorers: over.scorers ?? [rank(false)],
    assisters: over.assisters ?? [rank(false)],
    keepers: over.keepers ?? [rank(false)],
    bestRated: over.bestRated ?? rank(false),
  }
}
function ctx(over: Partial<SeasonResult> = {}): EvalContext {
  return { picked: [], result: result(over), teamRating: 80 }
}

describe('objective factories', () => {
  it('champion checks position 1', () => {
    expect(champion(50).check(ctx({ userRow: userRow({ position: 1 }) }))).toBe(true)
    expect(champion(50).check(ctx({ userRow: userRow({ position: 2 }) }))).toBe(false)
  })
  it('invincible checks the invincible flag', () => {
    expect(invincible(100).check(ctx({ invincible: true }))).toBe(true)
    expect(invincible(100).check(ctx({ invincible: false }))).toBe(false)
  })
  it('topScorer checks the leading scorer is the user', () => {
    expect(topScorer(40).check(ctx({ scorers: [rank(true)] }))).toBe(true)
    expect(topScorer(40).check(ctx({ scorers: [rank(false)] }))).toBe(false)
    expect(topScorer(40).check(ctx({ scorers: [] }))).toBe(false)
  })
  it('scoreAtLeast checks goals for', () => {
    expect(scoreAtLeast(70, 30).check(ctx({ userRow: userRow({ gf: 75 }) }))).toBe(true)
    expect(scoreAtLeast(70, 30).check(ctx({ userRow: userRow({ gf: 60 }) }))).toBe(false)
  })
  it('concedeAtMost checks goals against', () => {
    expect(concedeAtMost(25, 60).check(ctx({ userRow: userRow({ ga: 20 }) }))).toBe(true)
    expect(concedeAtMost(25, 60).check(ctx({ userRow: userRow({ ga: 30 }) }))).toBe(false)
  })
  it('bestRatedIsUser checks the best-rated flag', () => {
    expect(bestRatedIsUser(50).check(ctx({ bestRated: rank(true) }))).toBe(true)
    expect(bestRatedIsUser(50).check(ctx({ bestRated: rank(false) }))).toBe(false)
  })
  it('carries its points value', () => {
    expect(champion(50).points).toBe(50)
  })
})
```

- [ ] **Step 3: Vérifier l'échec**

Run: `npx vitest run src/domain/challenges/objectives.test.ts`
Expected: FAIL ("Cannot find module './objectives'").

- [ ] **Step 4: Implémenter**

Create `src/domain/challenges/objectives.ts`:
```ts
import { Objective } from './types'

export function champion(points: number): Objective {
  return { id: 'champion', label: 'Terminer champion', points, check: (c) => c.result.userRow.position === 1 }
}

export function invincible(points: number): Objective {
  return { id: 'invincible', label: 'Saison invincible', points, check: (c) => c.result.invincible }
}

export function topScorer(points: number): Objective {
  return {
    id: 'top-scorer',
    label: 'Avoir le meilleur buteur',
    points,
    check: (c) => c.result.scorers.length > 0 && c.result.scorers[0].isUser,
  }
}

export function scoreAtLeast(goals: number, points: number): Objective {
  return { id: `goals-${goals}`, label: `Marquer ${goals} buts`, points, check: (c) => c.result.userRow.gf >= goals }
}

export function concedeAtMost(goals: number, points: number): Objective {
  return { id: `conceded-${goals}`, label: `Encaisser ${goals} buts maximum`, points, check: (c) => c.result.userRow.ga <= goals }
}

export function bestRatedIsUser(points: number): Objective {
  return { id: 'best-rated', label: 'Avoir la meilleure note du championnat', points, check: (c) => c.result.bestRated.isUser }
}
```

- [ ] **Step 5: Vérifier le succès**

Run: `npx vitest run src/domain/challenges/objectives.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: challenge objective types and factories"
```

---

### Task 2: Contrainte maxPlayerRating

**Files:**
- Modify: `src/domain/game/constraints.ts` (ajouter `maxPlayerRating`)
- Test: `src/domain/game/constraints.test.ts` (ajouter des cas)

- [ ] **Step 1: Ajouter le test qui échoue**

Ajoute à la fin de `src/domain/game/constraints.test.ts` (le fichier importe déjà `PoolPlayer` et la fonction `player`) un nouveau bloc, et ajoute `maxPlayerRating` à l'import existant `import { oneClubPerTeam, budgetCap } from './constraints'` → `import { oneClubPerTeam, budgetCap, maxPlayerRating } from './constraints'` :
```ts
describe('maxPlayerRating', () => {
  it('allows a candidate at or below the cap', () => {
    expect(maxPlayerRating(85).allows({ ...player('a', 'PSG'), rating: 85 }, [])).toBe(true)
    expect(maxPlayerRating(85).allows({ ...player('a', 'PSG'), rating: 80 }, [])).toBe(true)
  })
  it('blocks a candidate above the cap', () => {
    expect(maxPlayerRating(85).allows({ ...player('a', 'PSG'), rating: 90 }, [])).toBe(false)
  })
})
```

> `player(id, club)` (fabrique existante dans ce fichier) renvoie un `PoolPlayer` complet ; on surcharge juste `rating` par spread, ce qui reste un `PoolPlayer` valide (pas de cast nécessaire).

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/game/constraints.test.ts`
Expected: FAIL ("maxPlayerRating is not exported / not a function").

- [ ] **Step 3: Implémenter**

Ajoute à la fin de `src/domain/game/constraints.ts` :
```ts
export function maxPlayerRating(cap: number): Constraint {
  return {
    name: `max-rating-${cap}`,
    allows: (candidate) => candidate.rating <= cap,
  }
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/game/constraints.test.ts`
Expected: PASS (existants + nouveaux). `maxPlayerRating` est déjà ré-exporté par le barrel `src/domain/game/index.ts` (qui fait `export * from './constraints'`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: maxPlayerRating draft constraint"
```

---

### Task 3: Catalogue de défis

**Files:**
- Create: `src/domain/challenges/challenges.ts`
- Test: `src/domain/challenges/challenges.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/challenges/challenges.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { listChallenges, getChallenge } from './challenges'

describe('challenge catalogue', () => {
  it('lists several challenges including "libre"', () => {
    const all = listChallenges()
    expect(all.length).toBeGreaterThanOrEqual(3)
    expect(all.some((c) => c.id === 'libre')).toBe(true)
  })
  it('every challenge has at least one objective with positive points', () => {
    for (const c of listChallenges()) {
      expect(c.objectives.length).toBeGreaterThan(0)
      expect(c.objectives.every((o) => o.points > 0)).toBe(true)
    }
  })
  it('getChallenge returns the matching challenge', () => {
    expect(getChallenge('modeste').id).toBe('modeste')
  })
  it('getChallenge falls back to "libre" for an unknown id', () => {
    expect(getChallenge('does-not-exist').id).toBe('libre')
  })
  it('only the "modeste" challenge restricts the draft (others have no constraints, sample-safe)', () => {
    const modeste = getChallenge('modeste')
    expect(modeste.constraints.length).toBeGreaterThan(0)
    for (const c of listChallenges().filter((x) => x.id !== 'modeste')) {
      expect(c.constraints).toHaveLength(0)
    }
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/challenges/challenges.test.ts`
Expected: FAIL ("Cannot find module './challenges'").

- [ ] **Step 3: Implémenter**

Create `src/domain/challenges/challenges.ts`:
```ts
import { maxPlayerRating } from '../game'
import { Challenge } from './types'
import { champion, invincible, topScorer, scoreAtLeast, concedeAtMost } from './objectives'

const CHALLENGES: Challenge[] = [
  {
    id: 'libre',
    name: 'Partie libre',
    description: 'Aucune contrainte. Compose le meilleur XI possible.',
    constraints: [],
    objectives: [champion(50), invincible(120), topScorer(40), scoreAtLeast(70, 30)],
  },
  {
    id: 'gachette',
    name: 'La gâchette',
    description: "Mets l'accent sur l'attaque et plante des buts.",
    constraints: [],
    objectives: [topScorer(60), scoreAtLeast(80, 60), champion(40)],
  },
  {
    id: 'forteresse',
    name: 'La forteresse',
    description: 'Bâtis la défense la plus solide du championnat.',
    constraints: [],
    objectives: [concedeAtMost(25, 60), invincible(120), champion(40)],
  },
  {
    id: 'modeste',
    name: 'Équipe modeste',
    description: 'Uniquement des joueurs notés 85 ou moins. Gagne avec des outsiders.',
    constraints: [maxPlayerRating(85)],
    objectives: [champion(100), invincible(200), topScorer(50)],
  },
]

export function listChallenges(): Challenge[] {
  return CHALLENGES
}

export function getChallenge(id: string): Challenge {
  return CHALLENGES.find((c) => c.id === id) ?? CHALLENGES[0]
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/challenges/challenges.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: sample-safe challenge catalogue"
```

---

### Task 4: Évaluation d'un défi + barrel

**Files:**
- Create: `src/domain/challenges/evaluate.ts`
- Create: `src/domain/challenges/index.ts`
- Test: `src/domain/challenges/evaluate.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/challenges/evaluate.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { evaluateChallenge } from './evaluate'
import { champion, invincible } from './objectives'
import { Challenge, EvalContext } from './types'
import { SeasonResult, TableRow, RankRow } from '../game'

function userRow(over: Partial<TableRow> = {}): TableRow {
  return { name: 'Mon XI', isUser: true, played: 34, won: 30, drawn: 4, lost: 0, gf: 90, ga: 15, points: 94, cleanSheets: 20, position: 1, ...over }
}
function rank(): RankRow {
  return { playerName: 'X', club: 'Mon XI', value: 20, isUser: false }
}
function ctx(invinc: boolean, position: number): EvalContext {
  const u = userRow({ position, lost: invinc ? 0 : 5 })
  const result: SeasonResult = {
    table: [u], userRow: u, invincible: invinc,
    scorers: [rank()], assisters: [rank()], keepers: [rank()], bestRated: rank(),
  }
  return { picked: [], result, teamRating: 88 }
}

const challenge: Challenge = {
  id: 'test', name: 'Test', description: '', constraints: [],
  objectives: [champion(50), invincible(120)],
}

describe('evaluateChallenge', () => {
  it('marks each objective completed or not and sums completed points', () => {
    const res = evaluateChallenge(challenge, ctx(true, 1))
    expect(res.objectives).toHaveLength(2)
    expect(res.objectives.every((o) => o.completed)).toBe(true)
    expect(res.totalPoints).toBe(170)
    expect(res.maxPoints).toBe(170)
  })
  it('counts only completed objectives toward total', () => {
    const res = evaluateChallenge(challenge, ctx(false, 2))
    expect(res.totalPoints).toBe(0)
    expect(res.maxPoints).toBe(170)
    expect(res.objectives.find((o) => o.id === 'champion')?.completed).toBe(false)
  })
  it('partial completion sums only the met objectives', () => {
    // champion oui (pos 1), invincible non
    const res = evaluateChallenge(challenge, ctx(false, 1))
    expect(res.totalPoints).toBe(50)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/challenges/evaluate.test.ts`
Expected: FAIL ("Cannot find module './evaluate'").

- [ ] **Step 3: Implémenter + barrel**

Create `src/domain/challenges/evaluate.ts`:
```ts
import { Challenge, ChallengeResult, EvalContext } from './types'

export function evaluateChallenge(challenge: Challenge, ctx: EvalContext): ChallengeResult {
  const objectives = challenge.objectives.map((o) => ({
    id: o.id,
    label: o.label,
    points: o.points,
    completed: o.check(ctx),
  }))
  const totalPoints = objectives.filter((o) => o.completed).reduce((sum, o) => sum + o.points, 0)
  const maxPoints = challenge.objectives.reduce((sum, o) => sum + o.points, 0)
  return { objectives, totalPoints, maxPoints }
}
```

Create `src/domain/challenges/index.ts`:
```ts
export * from './types'
export * from './objectives'
export * from './challenges'
export * from './evaluate'
```

- [ ] **Step 4: Vérifier le succès + suite complète**

Run: `npx vitest run src/domain/challenges/evaluate.test.ts && npm test`
Expected: PASS (challenges + tous les tests existants).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: challenge evaluation and barrel export"
```

---

### Task 5: Sélecteur de défi à l'accueil

**Files:**
- Create: `src/components/ChallengePicker.tsx`
- Modify: `src/app/page.tsx` (ajouter la sélection de défi + passer `challenge` à `/game`)

- [ ] **Step 1: Composant ChallengePicker**

Create `src/components/ChallengePicker.tsx`:
```tsx
'use client'

import { listChallenges } from '@/domain/challenges'

export function ChallengePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div>
      {listChallenges().map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className={value === c.id ? 'panel-gold' : 'panel'}
          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 8, cursor: 'pointer', color: '#fff' }}
        >
          <div style={{ fontWeight: 800, fontSize: 13 }} className={value === c.id ? 'txt-gold' : ''}>
            {c.name}
          </div>
          <div className="muted">{c.description}</div>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Câbler l'accueil**

Remplace tout le contenu de `src/app/page.tsx` par :
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModeToggle, Mode } from '@/components/ModeToggle'
import { ChallengePicker } from '@/components/ChallengePicker'

export default function Home() {
  const [mode, setMode] = useState<Mode>('prime')
  const [challenge, setChallenge] = useState('libre')
  const router = useRouter()

  return (
    <main className="wrap">
      <h1 className="title">ONZE D&apos;OR</h1>
      <p className="subtitle">2000 – 2026 · Ligue 1 &amp; Ligue 2</p>

      <div style={{ margin: '18px 0 6px' }}>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>
      <p className="subtitle" style={{ marginBottom: 16 }}>
        {mode === 'prime' ? 'Prime = meilleure saison de chaque joueur' : 'Saison = note de la saison de la carte'}
      </p>

      <div className="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Choisis ton défi
      </div>
      <ChallengePicker value={challenge} onChange={setChallenge} />

      <button
        className="btn btn-gold"
        style={{ marginTop: 8 }}
        onClick={() => router.push(`/game?mode=${mode}&challenge=${challenge}`)}
      >
        ▶ NOUVELLE PARTIE
      </button>
    </main>
  )
}
```

- [ ] **Step 3: Vérifier**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npx tsc --noEmit && npm run build`
Expected: tsc OK, build OK.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: challenge picker on the home screen"
```

---

### Task 6: Appliquer le défi en jeu + objectifs à la fin

**Files:**
- Modify: `src/app/game/page.tsx` (appliquer les contraintes au draft, évaluer les objectifs, les afficher + score)

- [ ] **Step 1: Mettre à jour la page de jeu**

Remplace tout le contenu de `src/app/game/page.tsx` par :
```tsx
'use client'

import { Suspense, useEffect, useMemo, useReducer, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PoolPlayer, teamRating } from '@/domain/game'
import { initDraft, draftReducer, currentGroup, simulateFromPicks } from '@/domain/play'
import { getChallenge, evaluateChallenge, Challenge } from '@/domain/challenges'
import { PlayerCard } from '@/components/PlayerCard'
import { FormationProgress } from '@/components/FormationProgress'
import { StandingsTable } from '@/components/StandingsTable'
import { RankingList } from '@/components/RankingList'

const FORMATION = '4-3-3'

function Loading() {
  return (
    <main className="wrap">
      <p className="subtitle">Chargement…</p>
    </main>
  )
}

export default function GamePage() {
  return (
    <Suspense fallback={<Loading />}>
      <GameLoader />
    </Suspense>
  )
}

function GameLoader() {
  const params = useSearchParams()
  const mode = params.get('mode') === 'season' ? 'season' : 'prime'
  const challenge = getChallenge(params.get('challenge') ?? 'libre')
  const [pool, setPool] = useState<PoolPlayer[] | null>(null)
  const [round, setRound] = useState(0)
  const [baseSeed] = useState(() => Date.now() % 1_000_000)

  useEffect(() => {
    let active = true
    fetch(`/api/pool?mode=${mode}`)
      .then((r) => r.json())
      .then((data: PoolPlayer[]) => {
        if (active) setPool(data)
      })
      .catch(() => {
        if (active) setPool([])
      })
    return () => {
      active = false
    }
  }, [mode])

  if (!pool) return <Loading />
  if (pool.length === 0) {
    return (
      <main className="wrap">
        <p className="subtitle">Aucun joueur disponible.</p>
        <Link className="btn" href="/">
          Retour
        </Link>
      </main>
    )
  }

  return (
    <Game
      key={round}
      pool={pool}
      challenge={challenge}
      seed={baseSeed + round}
      onReplay={() => setRound((r) => r + 1)}
    />
  )
}

function Game({ pool, challenge, seed, onReplay }: { pool: PoolPlayer[]; challenge: Challenge; seed: number; onReplay: () => void }) {
  const [state, dispatch] = useReducer(draftReducer, undefined, () =>
    initDraft(pool, FORMATION, seed, challenge.constraints),
  )

  if (state.phase === 'drafting') {
    return (
      <main className="wrap">
        <h1 className="title" style={{ fontSize: 18 }}>
          ONZE D&apos;OR
        </h1>
        <p className="subtitle txt-gold" style={{ fontWeight: 700 }}>
          {challenge.name}
        </p>
        <div style={{ margin: '12px 0' }}>
          <FormationProgress total={state.formation.length} done={state.picked.length} group={currentGroup(state)} />
        </div>
        {state.candidates.length === 0 ? (
          <>
            <p className="subtitle">Plus de candidats disponibles pour ce poste avec ce défi.</p>
            <Link className="btn" href="/">
              Changer de défi
            </Link>
          </>
        ) : (
          state.candidates.map((c) => (
            <PlayerCard key={c.playerId} player={c} onPick={() => dispatch({ type: 'PICK', player: c })} />
          ))
        )}
      </main>
    )
  }

  return <End picked={state.picked} challenge={challenge} seed={seed} onReplay={onReplay} />
}

function End({ picked, challenge, seed, onReplay }: { picked: PoolPlayer[]; challenge: Challenge; seed: number; onReplay: () => void }) {
  const result = useMemo(() => simulateFromPicks(picked, { seed, teamName: 'Mon XI' }), [picked, seed])
  const rating = teamRating(picked)
  const evaluation = useMemo(
    () => evaluateChallenge(challenge, { picked, result, teamRating: rating }),
    [challenge, picked, result, rating],
  )
  const u = result.userRow

  return (
    <main className="wrap">
      <p className="subtitle">TON ONZE D&apos;OR · {challenge.name.toUpperCase()}</p>
      <div style={{ textAlign: 'center', margin: '6px 0 12px' }}>
        <div className="rating" style={{ fontSize: 42 }}>
          {rating}
        </div>
        <div className="muted">note moyenne de l&apos;équipe</div>
      </div>

      <div className={result.invincible ? 'panel-gold' : 'panel'} style={{ textAlign: 'center', marginBottom: 12 }}>
        {result.invincible ? (
          <div className="txt-green" style={{ fontWeight: 900 }}>
            SAISON INVINCIBLE 🏆
          </div>
        ) : (
          <div style={{ fontWeight: 800 }}>{u.position}e de Ligue 1</div>
        )}
        <div className="muted">
          {u.won} V · {u.drawn} N · {u.lost} D · {u.gf} buts
        </div>
      </div>

      <div className="panel-gold" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13 }}>
          <span>Objectifs</span>
          <span className="txt-gold">
            {evaluation.totalPoints} / {evaluation.maxPoints} pts
          </span>
        </div>
        {evaluation.objectives.map((o) => (
          <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
            <span className={o.completed ? 'txt-green' : 'muted'}>
              {o.completed ? '✓ ' : '○ '}
              {o.label}
            </span>
            <span className={o.completed ? 'txt-gold' : 'muted'} style={{ fontWeight: 700 }}>
              +{o.points}
            </span>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>Classement</div>
        <StandingsTable table={result.table} />
      </div>

      <RankingList title="Meilleurs buteurs" rows={result.scorers} unit="buts" />
      <RankingList title="Meilleurs passeurs" rows={result.assisters} unit="passes" />
      <RankingList title="Meilleurs gardiens" rows={result.keepers} unit="clean sheets" />

      <button className="btn btn-gold" onClick={onReplay} style={{ marginBottom: 8 }}>
        ↻ Rejouer
      </button>
      <Link className="btn" href="/">
        Accueil
      </Link>
    </main>
  )
}
```

> Changements vs Plan 5 : `initDraft(..., challenge.constraints)`, nom du défi affiché pendant le draft, bouton « Changer de défi » si plus de candidats, panneau Objectifs + score à la fin, et l'entrée « Meilleure note du championnat » est retirée au profit du panneau Objectifs (la donnée reste dans `result.bestRated`, réutilisable via l'objectif `bestRatedIsUser`).

- [ ] **Step 2: Vérification finale complète**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npm test && npm run lint && npm run build && npx tsc --noEmit`
Expected: tous les tests PASS, lint OK, build OK (routes `/`, `/game`, `/api/pool`, `/manifest.webmanifest`), tsc OK.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: apply challenge constraints in draft and show objectives/score"
```

---

## Couverture du spec (auto-revue)

- §6 objectifs & contraintes de draft, rejouabilité, système de points → Tasks 1-4 (logique) + 5-6 (UI).
- Réutilisation des contraintes existantes (Plan 3) + nouvelle `maxPlayerRating` → Task 2.
- Affichage des objectifs validés + score à la fin → Task 6.

**Sécurité de conception :** les défis livrés ne bloquent jamais le draft sur le pool d'exemple — seul « modeste » contraint (note ≤ 85, vérifié : ≥ 3 attaquants éligibles), et la page gère le cas « plus de candidats » avec un retour à l'accueil. Les contraintes plus dures (un par club, budget) restent disponibles comme primitives pour des défis créés sur données réelles (le pool d'exemple n'a que ~10 clubs et pas de valeurs marchandes, donc on ne les utilise pas en preset ici).

**Hors de ce plan :** carrière multi-saisons, défi du jour + classement communautaire, collection/palmarès, back-office admin, scraping, persistance des scores (le score est affiché mais non sauvegardé — la persistance viendra avec les comptes).
```
