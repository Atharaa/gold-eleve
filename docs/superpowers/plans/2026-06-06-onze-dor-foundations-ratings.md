# Onze d'Or — Plan 1 : Fondations & moteur de note

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place le projet (Next.js + TypeScript + Vitest + Prisma/Postgres) et un moteur de note de joueur par poste, à deux niveaux (riche/base), entièrement testé sur fixtures.

**Architecture:** Le moteur de note est un module de **domaine pur** (aucune I/O, aucune dépendance framework) sous `src/domain/ratings/`. Il prend une cohorte de stats `(joueur, saison)` pour un même poste/saison, normalise chaque métrique en percentile au sein de la cohorte, applique une pondération par poste et par tier, et produit une note 0–99 + un indicateur de fiabilité. Le schéma Prisma fixe le contrat de données que le pipeline d'ingestion remplira plus tard. Aucune base live n'est requise pour ce plan (tests sur fixtures, schéma validé hors-ligne).

**Tech Stack:** Next.js (App Router), TypeScript, Vitest, Prisma, PostgreSQL.

**Référence spec:** `docs/superpowers/specs/2026-06-06-onze-dor-design.md` (§2 modèle de note, §8 modèle de données).

---

### Task 1: Scaffolding du projet (Next.js + TypeScript)

**Files:**
- Create: tout l'arbre Next.js à la racine du repo `/Users/cpetit/Desktop/Projects/onze-de-reve-game`

- [ ] **Step 1: Générer l'app Next.js dans le dossier courant**

Le dossier contient déjà `docs/` et `.gitignore` (versionnés). `create-next-app` accepte un dossier non vide tant qu'il n'y a pas de collision.

Run:
```bash
cd /Users/cpetit/Desktop/Projects/onze-de-reve-game
npx create-next-app@latest . --typescript --eslint --app --src-dir --tailwind --import-alias "@/*" --use-npm --no-turbopack
```
Si une question interactive apparaît, accepter les valeurs par défaut proposées par les flags ci-dessus.

Expected: création de `src/app/`, `package.json`, `tsconfig.json`, `next.config.*`, `tailwind.config.*`.

- [ ] **Step 2: Vérifier que le projet démarre en build**

Run: `npm run build`
Expected: build Next.js réussi (page d'accueil par défaut).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TypeScript app"
```

---

### Task 2: Mise en place de Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (script `test`)
- Create: `src/domain/ratings/__tests__/smoke.test.ts`

- [ ] **Step 1: Installer Vitest**

Run: `npm install -D vitest`
Expected: `vitest` ajouté en devDependencies.

- [ ] **Step 2: Créer la config Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 3: Ajouter le script de test**

Dans `package.json`, ajouter dans `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Écrire un test smoke**

Create `src/domain/ratings/__tests__/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Lancer les tests**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: set up Vitest"
```

---

### Task 3: Schéma de données (Prisma)

**Files:**
- Create: `prisma/schema.prisma`
- Modify: `package.json` (devDependency prisma)
- Create: `.env.example`

- [ ] **Step 1: Installer Prisma**

Run: `npm install -D prisma && npm install @prisma/client`
Expected: dépendances ajoutées.

- [ ] **Step 2: Écrire le schéma**

Create `prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Club {
  id            String         @id @default(cuid())
  name          String
  playerSeasons PlayerSeason[]
}

model Player {
  id            String         @id @default(cuid())
  name          String
  primeSeasonId String?
  seasons       PlayerSeason[]
}

model PlayerSeason {
  id          String @id @default(cuid())
  player      Player @relation(fields: [playerId], references: [id])
  playerId    String
  club        Club   @relation(fields: [clubId], references: [id])
  clubId      String
  season      String // ex "2014-15"
  competition String // "L1" | "L2"
  position    String // poste brut, ex "CM"
  tier        String // "rich" | "basic"

  minutes Int
  matches Int
  goals   Int
  assists Int

  xG                   Float?
  xA                   Float?
  tacklesInterceptions Float?
  progressivePasses    Float?
  passCompletionPct    Float?
  savePct              Float?
  cleanSheets          Int?
  goalsConcededPer90   Float?
  marketValue          Int?

  ratingComputed Int
  ratingOverride Int?
  reliability    Int // 1..4

  @@unique([playerId, season, competition])
}

model User {
  id        String   @id @default(cuid())
  email     String?  @unique
  deviceId  String?  @unique
  role      String   @default("player") // "player" | "admin"
  createdAt DateTime @default(now())
}
```

- [ ] **Step 3: Créer `.env.example`**

Create `.env.example`:
```
# Postgres (Neon). Renseigner DATABASE_URL pour les migrations.
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```

- [ ] **Step 4: Valider le schéma (sans base live)**

Run: `npx prisma validate`
Expected: "The schema at prisma/schema.prisma is valid".

- [ ] **Step 5: Générer le client Prisma**

Run: `npx prisma generate`
Expected: client généré sans erreur.

> Note : `npx prisma migrate dev` sera lancé plus tard, une fois `DATABASE_URL` (Neon) renseigné. Ce plan ne nécessite pas de base live.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Prisma data model for players and player seasons"
```

---

### Task 4: Mapping poste → groupe de poste

**Files:**
- Create: `src/domain/ratings/positions.ts`
- Test: `src/domain/ratings/positions.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/ratings/positions.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { toPositionGroup } from './positions'

describe('toPositionGroup', () => {
  it('maps goalkeeper', () => {
    expect(toPositionGroup('GK')).toBe('GK')
  })
  it('maps defenders', () => {
    expect(toPositionGroup('CB')).toBe('DEF')
    expect(toPositionGroup('lb')).toBe('DEF')
  })
  it('maps midfielders', () => {
    expect(toPositionGroup('CM')).toBe('MID')
    expect(toPositionGroup('AM')).toBe('MID')
  })
  it('maps attackers', () => {
    expect(toPositionGroup('ST')).toBe('ATT')
    expect(toPositionGroup('LW')).toBe('ATT')
  })
  it('throws on unknown position', () => {
    expect(() => toPositionGroup('XYZ')).toThrow()
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `npx vitest run src/domain/ratings/positions.test.ts`
Expected: FAIL ("Cannot find module './positions'").

- [ ] **Step 3: Implémenter le module**

Create `src/domain/ratings/positions.ts`:
```ts
export type PositionGroup = 'GK' | 'DEF' | 'MID' | 'ATT'

const MAP: Record<string, PositionGroup> = {
  GK: 'GK',
  CB: 'DEF', LB: 'DEF', RB: 'DEF', WB: 'DEF', LWB: 'DEF', RWB: 'DEF', DF: 'DEF',
  DM: 'MID', CM: 'MID', AM: 'MID', MF: 'MID', LM: 'MID', RM: 'MID',
  LW: 'ATT', RW: 'ATT', FW: 'ATT', ST: 'ATT', CF: 'ATT',
}

export function toPositionGroup(raw: string): PositionGroup {
  const key = raw.trim().toUpperCase()
  const group = MAP[key]
  if (!group) throw new Error(`Unknown position: ${raw}`)
  return group
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `npx vitest run src/domain/ratings/positions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: map raw positions to position groups"
```

---

### Task 5: Normalisation en percentiles

**Files:**
- Create: `src/domain/ratings/percentile.ts`
- Test: `src/domain/ratings/percentile.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/ratings/percentile.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { toPercentiles } from './percentile'

describe('toPercentiles', () => {
  it('returns empty for empty input', () => {
    expect(toPercentiles([])).toEqual([])
  })
  it('returns 0.5 for a single value', () => {
    expect(toPercentiles([42])).toEqual([0.5])
  })
  it('maps min to 0 and max to 1', () => {
    const result = toPercentiles([10, 20, 30])
    expect(result[0]).toBe(0)
    expect(result[2]).toBe(1)
  })
  it('ranks the middle value proportionally', () => {
    // valeurs strictement inférieures / (n - 1)
    expect(toPercentiles([10, 20, 30])[1]).toBeCloseTo(0.5)
  })
  it('gives tied values the same rank', () => {
    const result = toPercentiles([10, 10, 30])
    expect(result[0]).toBe(0)
    expect(result[1]).toBe(0)
    expect(result[2]).toBe(1)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `npx vitest run src/domain/ratings/percentile.test.ts`
Expected: FAIL ("Cannot find module './percentile'").

- [ ] **Step 3: Implémenter le module**

Create `src/domain/ratings/percentile.ts`:
```ts
// Percentile rang : pour chaque valeur, fraction des valeurs strictement
// inférieures, divisée par (n - 1). min -> 0, max -> 1, ties -> même rang.
export function toPercentiles(values: number[]): number[] {
  const n = values.length
  if (n === 0) return []
  if (n === 1) return [0.5]
  return values.map((v) => {
    const below = values.filter((x) => x < v).length
    return below / (n - 1)
  })
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `npx vitest run src/domain/ratings/percentile.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: percentile normalization helper"
```

---

### Task 6: Types de stats, métriques et pondérations

**Files:**
- Create: `src/domain/ratings/types.ts`
- Create: `src/domain/ratings/weights.ts`
- Create: `src/domain/ratings/metrics.ts`
- Test: `src/domain/ratings/metrics.test.ts`

- [ ] **Step 1: Définir les types**

Create `src/domain/ratings/types.ts`:
```ts
export type Tier = 'rich' | 'basic'

export interface PlayerSeasonStats {
  playerId: string
  seasonId: string
  position: string // poste brut
  minutes: number
  matches: number
  goals: number
  assists: number
  // avancées (tier riche) — optionnelles
  xG?: number
  xA?: number
  tacklesInterceptions?: number
  progressivePasses?: number
  passCompletionPct?: number
  savePct?: number
  cleanSheets?: number
  goalsConcededPer90?: number
  // ancrage (tier base)
  marketValue?: number
}

export interface RatingResult {
  playerId: string
  seasonId: string
  ratingComputed: number
  tier: Tier
  reliability: 1 | 2 | 3 | 4
}
```

- [ ] **Step 2: Définir les pondérations par poste et par tier**

Create `src/domain/ratings/weights.ts`:
```ts
import { PositionGroup } from './positions'

export type Metric =
  | 'goals'
  | 'assists'
  | 'minutes'
  | 'xG'
  | 'xA'
  | 'tacklesInterceptions'
  | 'progressivePasses'
  | 'passCompletionPct'
  | 'savePct'
  | 'cleanSheets'
  | 'goalsConcededInv'
  | 'marketValue'

export type WeightSet = Partial<Record<Metric, number>>

export const RICH_WEIGHTS: Record<PositionGroup, WeightSet> = {
  GK: { savePct: 0.45, cleanSheets: 0.3, goalsConcededInv: 0.25 },
  DEF: { tacklesInterceptions: 0.35, passCompletionPct: 0.2, cleanSheets: 0.2, goals: 0.1, assists: 0.15 },
  MID: { passCompletionPct: 0.2, progressivePasses: 0.25, xA: 0.2, assists: 0.15, goals: 0.2 },
  ATT: { goals: 0.4, xG: 0.25, assists: 0.15, xA: 0.1, minutes: 0.1 },
}

export const BASIC_WEIGHTS: Record<PositionGroup, WeightSet> = {
  GK: { cleanSheets: 0.4, goalsConcededInv: 0.2, marketValue: 0.4 },
  DEF: { marketValue: 0.45, minutes: 0.2, goals: 0.15, assists: 0.2 },
  MID: { marketValue: 0.4, assists: 0.2, goals: 0.2, minutes: 0.2 },
  ATT: { goals: 0.4, assists: 0.2, minutes: 0.1, marketValue: 0.3 },
}
```

- [ ] **Step 3: Écrire le test du calcul de métrique**

Create `src/domain/ratings/metrics.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { metricValue } from './metrics'
import { PlayerSeasonStats } from './types'

const base: PlayerSeasonStats = {
  playerId: 'p1', seasonId: '2020-21', position: 'ST',
  minutes: 1800, matches: 20, goals: 10, assists: 5,
}

describe('metricValue', () => {
  it('computes goals per 90', () => {
    // 10 buts sur 1800 min = 0.5 / 90
    expect(metricValue(base, 'goals')).toBeCloseTo(0.5)
  })
  it('returns 0 for missing advanced metric', () => {
    expect(metricValue(base, 'xG')).toBe(0)
  })
  it('returns raw percentage for passCompletionPct', () => {
    expect(metricValue({ ...base, passCompletionPct: 88 }, 'passCompletionPct')).toBe(88)
  })
  it('inverts goals conceded so lower is better', () => {
    expect(metricValue({ ...base, goalsConcededPer90: 1.2 }, 'goalsConcededInv')).toBe(-1.2)
  })
  it('returns total minutes for minutes metric', () => {
    expect(metricValue(base, 'minutes')).toBe(1800)
  })
  it('returns 0 per90 when minutes is 0', () => {
    expect(metricValue({ ...base, minutes: 0 }, 'goals')).toBe(0)
  })
})
```

- [ ] **Step 4: Lancer le test pour vérifier l'échec**

Run: `npx vitest run src/domain/ratings/metrics.test.ts`
Expected: FAIL ("Cannot find module './metrics'").

- [ ] **Step 5: Implémenter le calcul de métrique**

Create `src/domain/ratings/metrics.ts`:
```ts
import { Metric } from './weights'
import { PlayerSeasonStats } from './types'

function per90(value: number | undefined, minutes: number): number {
  if (!value || minutes <= 0) return 0
  return (value * 90) / minutes
}

export function metricValue(row: PlayerSeasonStats, metric: Metric): number {
  switch (metric) {
    case 'goals': return per90(row.goals, row.minutes)
    case 'assists': return per90(row.assists, row.minutes)
    case 'xG': return per90(row.xG, row.minutes)
    case 'xA': return per90(row.xA, row.minutes)
    case 'tacklesInterceptions': return per90(row.tacklesInterceptions, row.minutes)
    case 'progressivePasses': return per90(row.progressivePasses, row.minutes)
    case 'passCompletionPct': return row.passCompletionPct ?? 0
    case 'savePct': return row.savePct ?? 0
    case 'cleanSheets': return row.cleanSheets ?? 0
    case 'goalsConcededInv': return -(row.goalsConcededPer90 ?? 99)
    case 'minutes': return row.minutes
    case 'marketValue': return row.marketValue ?? 0
  }
}
```

- [ ] **Step 6: Lancer le test pour vérifier le succès**

Run: `npx vitest run src/domain/ratings/metrics.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: metric extraction and position/tier weights"
```

---

### Task 7: Indicateur de fiabilité

**Files:**
- Create: `src/domain/ratings/reliability.ts`
- Test: `src/domain/ratings/reliability.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/ratings/reliability.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { reliabilityFor } from './reliability'
import { PlayerSeasonStats } from './types'

const base: PlayerSeasonStats = {
  playerId: 'p1', seasonId: '2020-21', position: 'CM',
  minutes: 1800, matches: 20, goals: 4, assists: 6,
}

describe('reliabilityFor', () => {
  it('returns 4 when rich tier has 4+ advanced stats', () => {
    const row = { ...base, xG: 3, xA: 4, tacklesInterceptions: 50, progressivePasses: 120, passCompletionPct: 88 }
    expect(reliabilityFor(row, 'rich')).toBe(4)
  })
  it('returns 3 when rich tier is missing advanced stats', () => {
    const row = { ...base, xG: 3 }
    expect(reliabilityFor(row, 'rich')).toBe(3)
  })
  it('returns 2 for basic tier with market value', () => {
    expect(reliabilityFor({ ...base, marketValue: 5_000_000 }, 'basic')).toBe(2)
  })
  it('returns 1 for basic tier without market value', () => {
    expect(reliabilityFor(base, 'basic')).toBe(1)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `npx vitest run src/domain/ratings/reliability.test.ts`
Expected: FAIL ("Cannot find module './reliability'").

- [ ] **Step 3: Implémenter le module**

Create `src/domain/ratings/reliability.ts`:
```ts
import { PlayerSeasonStats, Tier } from './types'

export function reliabilityFor(row: PlayerSeasonStats, tier: Tier): 1 | 2 | 3 | 4 {
  if (tier === 'rich') {
    const advanced = [
      row.xG,
      row.xA,
      row.tacklesInterceptions,
      row.progressivePasses,
      row.passCompletionPct,
    ]
    const present = advanced.filter((v) => v !== undefined && v !== null).length
    return present >= 4 ? 4 : 3
  }
  return row.marketValue ? 2 : 1
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `npx vitest run src/domain/ratings/reliability.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: reliability indicator for ratings"
```

---

### Task 8: Calcul des notes d'une cohorte

**Files:**
- Create: `src/domain/ratings/compute.ts`
- Test: `src/domain/ratings/compute.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/ratings/compute.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeSeasonRatings } from './compute'
import { PlayerSeasonStats } from './types'

// Cohorte d'attaquants, même saison
const cohort: PlayerSeasonStats[] = [
  { playerId: 'star', seasonId: '2020-21', position: 'ST', minutes: 3000, matches: 34, goals: 30, assists: 10, xG: 25, xA: 8 },
  { playerId: 'mid', seasonId: '2020-21', position: 'ST', minutes: 2500, matches: 30, goals: 12, assists: 5, xG: 11, xA: 4 },
  { playerId: 'sub', seasonId: '2020-21', position: 'ST', minutes: 800, matches: 20, goals: 2, assists: 1, xG: 2, xA: 1 },
]

describe('computeSeasonRatings (rich)', () => {
  const results = computeSeasonRatings(cohort, 'rich')

  it('returns one result per player', () => {
    expect(results).toHaveLength(3)
  })
  it('ranks the prolific striker highest', () => {
    const byId = Object.fromEntries(results.map((r) => [r.playerId, r.ratingComputed]))
    expect(byId.star).toBeGreaterThan(byId.mid)
    expect(byId.mid).toBeGreaterThan(byId.sub)
  })
  it('keeps ratings within 40..99', () => {
    for (const r of results) {
      expect(r.ratingComputed).toBeGreaterThanOrEqual(40)
      expect(r.ratingComputed).toBeLessThanOrEqual(99)
    }
  })
  it('tags the tier', () => {
    expect(results[0].tier).toBe('rich')
  })

  it('returns empty for empty cohort', () => {
    expect(computeSeasonRatings([], 'rich')).toEqual([])
  })
})

describe('computeSeasonRatings (basic)', () => {
  const basicCohort: PlayerSeasonStats[] = [
    { playerId: 'expensive', seasonId: '2005-06', position: 'ST', minutes: 3000, matches: 34, goals: 20, assists: 6, marketValue: 40_000_000 },
    { playerId: 'cheap', seasonId: '2005-06', position: 'ST', minutes: 2000, matches: 28, goals: 5, assists: 2, marketValue: 2_000_000 },
  ]
  it('ranks the more valuable, prolific player higher', () => {
    const results = computeSeasonRatings(basicCohort, 'basic')
    const byId = Object.fromEntries(results.map((r) => [r.playerId, r.ratingComputed]))
    expect(byId.expensive).toBeGreaterThan(byId.cheap)
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `npx vitest run src/domain/ratings/compute.test.ts`
Expected: FAIL ("Cannot find module './compute'").

- [ ] **Step 3: Implémenter le calcul**

Create `src/domain/ratings/compute.ts`:
```ts
import { toPositionGroup } from './positions'
import { toPercentiles } from './percentile'
import { metricValue } from './metrics'
import { reliabilityFor } from './reliability'
import { RICH_WEIGHTS, BASIC_WEIGHTS, Metric } from './weights'
import { PlayerSeasonStats, RatingResult, Tier } from './types'

const FLOOR = 40
const SPAN = 59 // échelle 40..99

// Calcule les notes d'une cohorte de joueurs d'un MÊME groupe de poste et
// d'une MÊME saison. La normalisation est relative à cette cohorte.
export function computeSeasonRatings(cohort: PlayerSeasonStats[], tier: Tier): RatingResult[] {
  if (cohort.length === 0) return []

  const group = toPositionGroup(cohort[0].position)
  const weights = tier === 'rich' ? RICH_WEIGHTS[group] : BASIC_WEIGHTS[group]
  const metrics = Object.keys(weights) as Metric[]

  // Percentile de chaque joueur, métrique par métrique.
  const percentilesByMetric: Record<string, number[]> = {}
  for (const metric of metrics) {
    const values = cohort.map((row) => metricValue(row, metric))
    percentilesByMetric[metric] = toPercentiles(values)
  }

  return cohort.map((row, index) => {
    let weighted = 0
    let totalWeight = 0
    for (const metric of metrics) {
      const weight = weights[metric]!
      weighted += weight * percentilesByMetric[metric][index]
      totalWeight += weight
    }
    const normalized = totalWeight > 0 ? weighted / totalWeight : 0
    return {
      playerId: row.playerId,
      seasonId: row.seasonId,
      ratingComputed: Math.round(FLOOR + normalized * SPAN),
      tier,
      reliability: reliabilityFor(row, tier),
    }
  })
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `npx vitest run src/domain/ratings/compute.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: compute position/tier-aware season ratings for a cohort"
```

---

### Task 9: Note effective & sélection de la saison Prime

**Files:**
- Create: `src/domain/ratings/effective.ts`
- Test: `src/domain/ratings/effective.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/ratings/effective.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { effectiveRating, selectPrimeSeason, RatedSeason } from './effective'

describe('effectiveRating', () => {
  it('uses the override when present', () => {
    expect(effectiveRating({ seasonId: 's1', ratingComputed: 80, ratingOverride: 90 })).toBe(90)
  })
  it('falls back to computed when no override', () => {
    expect(effectiveRating({ seasonId: 's1', ratingComputed: 80 })).toBe(80)
  })
  it('treats null override as absent', () => {
    expect(effectiveRating({ seasonId: 's1', ratingComputed: 80, ratingOverride: null })).toBe(80)
  })
})

describe('selectPrimeSeason', () => {
  const seasons: RatedSeason[] = [
    { seasonId: '2018-19', ratingComputed: 82 },
    { seasonId: '2019-20', ratingComputed: 88 },
    { seasonId: '2020-21', ratingComputed: 85 },
  ]
  it('picks the highest effective rating', () => {
    expect(selectPrimeSeason(seasons)).toBe('2019-20')
  })
  it('respects overrides when picking prime', () => {
    const withOverride: RatedSeason[] = [
      { seasonId: '2018-19', ratingComputed: 82, ratingOverride: 95 },
      { seasonId: '2019-20', ratingComputed: 88 },
    ]
    expect(selectPrimeSeason(withOverride)).toBe('2018-19')
  })
  it('throws when there are no seasons', () => {
    expect(() => selectPrimeSeason([])).toThrow()
  })
})
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `npx vitest run src/domain/ratings/effective.test.ts`
Expected: FAIL ("Cannot find module './effective'").

- [ ] **Step 3: Implémenter le module**

Create `src/domain/ratings/effective.ts`:
```ts
export interface RatedSeason {
  seasonId: string
  ratingComputed: number
  ratingOverride?: number | null
}

// Note effective = override admin si présent, sinon note calculée.
export function effectiveRating(season: RatedSeason): number {
  return season.ratingOverride ?? season.ratingComputed
}

// Saison Prime = celle avec la meilleure note effective.
export function selectPrimeSeason(seasons: RatedSeason[]): string {
  if (seasons.length === 0) throw new Error('no seasons')
  return seasons.reduce((best, season) =>
    effectiveRating(season) > effectiveRating(best) ? season : best
  ).seasonId
}
```

- [ ] **Step 4: Lancer le test pour vérifier le succès**

Run: `npx vitest run src/domain/ratings/effective.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: effective rating and prime season selection"
```

---

### Task 10: Point d'entrée du module + sanity check d'intégration

**Files:**
- Create: `src/domain/ratings/index.ts`
- Test: `src/domain/ratings/integration.test.ts`

- [ ] **Step 1: Créer le barrel d'export**

Create `src/domain/ratings/index.ts`:
```ts
export * from './types'
export * from './positions'
export * from './weights'
export * from './metrics'
export * from './reliability'
export * from './compute'
export * from './effective'
```

- [ ] **Step 2: Écrire le test d'intégration (sanity)**

Create `src/domain/ratings/integration.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeSeasonRatings, selectPrimeSeason, effectiveRating } from './index'
import type { PlayerSeasonStats, RatedSeason } from './index'

describe('ratings integration', () => {
  it('a star season outranks a journeyman season, end to end', () => {
    const cohort: PlayerSeasonStats[] = [
      { playerId: 'ibra', seasonId: '2012-13', position: 'ST', minutes: 3100, matches: 34, goals: 30, assists: 8, xG: 24, xA: 6, passCompletionPct: 78, progressivePasses: 90, tacklesInterceptions: 20 },
      { playerId: 'journeyman', seasonId: '2012-13', position: 'ST', minutes: 1500, matches: 22, goals: 4, assists: 2, xG: 5, xA: 2, passCompletionPct: 70, progressivePasses: 40, tacklesInterceptions: 10 },
    ]
    const results = computeSeasonRatings(cohort, 'rich')
    const byId = Object.fromEntries(results.map((r) => [r.playerId, r]))
    expect(byId.ibra.ratingComputed).toBeGreaterThan(byId.journeyman.ratingComputed)
    expect(byId.ibra.reliability).toBe(4)
  })

  it('prime season is the best effective rating across a career', () => {
    const career: RatedSeason[] = [
      { seasonId: '2010-11', ratingComputed: 84 },
      { seasonId: '2012-13', ratingComputed: 92 },
      { seasonId: '2014-15', ratingComputed: 88 },
    ]
    const prime = selectPrimeSeason(career)
    expect(prime).toBe('2012-13')
    expect(effectiveRating(career.find((s) => s.seasonId === prime)!)).toBe(92)
  })
})
```

- [ ] **Step 3: Lancer toute la suite**

Run: `npm test`
Expected: PASS (tous les tests des tâches 4 à 10).

- [ ] **Step 4: Lint + build de contrôle**

Run: `npm run lint && npm run build`
Expected: lint OK, build Next.js OK.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: ratings module barrel export and integration sanity checks"
```

---

## Couverture du spec (auto-revue)

- §2.1 granularité (joueur, saison) → Tasks 3, 6 (types), 8.
- §2.2 notation par poste + normalisation 0–99 → Tasks 4, 5, 6, 8.
- §2.3 modèle à deux niveaux (riche/base) + valeur marchande → Tasks 6 (weights), 8.
- §2.3 indicateur de fiabilité 4 crans → Task 7.
- §2.4 Prime vs Saison → Task 9.
- §2.5 override admin (note effective) → Task 9 (logique) + Task 3 (champ `ratingOverride`). L'UI admin est dans un plan ultérieur.
- §8 modèle de données → Task 3.

**Hors de ce plan (plans suivants) :** pipeline d'ingestion FBref/Transfermarkt (§3), cœur de jeu + simulation + classements (§4–5), UI (accueil/draft/fin), back-office admin (UI), piliers de profondeur (§6).
