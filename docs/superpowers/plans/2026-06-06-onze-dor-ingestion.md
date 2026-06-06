# Onze d'Or — Plan 2 : Pipeline d'ingestion (cœur déterministe)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer des CSV de stats joueur-saison (déposés dans `data/raw/`) en lignes de base notées : parse → normalisation → tier → notes (moteur de Plan 1) → upsert Postgres.

**Architecture:** Pipeline en étages purs et testables. Le CSV normalisé est le contrat d'entrée. Chaque étage est une fonction pure sans I/O (`parseSeasonCsv` → `toNormalizedRow` → `rateAllSeasons` → `assignPrimeSeasons` → `buildUpsertPayload`) ; seul `loadRatedSeasons` touche la base via Prisma. Un CLI `scripts/ingest.ts` câble le tout. Imports relatifs (pas d'alias `@/`) pour compatibilité tsx + Vitest sans config supplémentaire. Le scraping des sources est hors de ce plan (Plan 2b).

**Tech Stack:** TypeScript, Vitest, Prisma, `csv-parse`, `tsx`. **Node ≥ 20.9** (`nvm use 20` avant toute commande).

**Référence spec:** `docs/superpowers/specs/2026-06-06-onze-dor-design.md` (§3 pipeline, §2.3 tiers, §8 données). **Dépend de** Plan 1 (`src/domain/ratings`).

**Format CSV d'entrée** (une ligne par joueur-saison-compétition ; en-tête obligatoire) :
```
player,club,season,competition,position,minutes,matches,goals,assists,xg,xa,tackles_interceptions,progressive_passes,pass_completion_pct,save_pct,clean_sheets,goals_conceded_per90,market_value
```
Colonnes requises : `player,club,season,competition,position,minutes,matches,goals,assists`. Le reste est optionnel (vide = absent). `season` au format `2018-19`. `competition` ∈ `{L1, L2}`.

---

### Task 1: Setup ingestion (deps, dossiers, types, fixture)

**Files:**
- Modify: `package.json` (deps + script `ingest`)
- Modify: `.gitignore`
- Create: `src/ingestion/types.ts`
- Create: `src/ingestion/__fixtures__/sample-seasons.csv`

- [ ] **Step 1: Installer les dépendances**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npm install csv-parse && npm install -D tsx`
Expected: `csv-parse` en dependencies, `tsx` en devDependencies.

- [ ] **Step 2: Ignorer les données brutes**

Ajouter à la fin de `.gitignore` :
```
# Données d'ingestion (non versionnées)
data/raw/
```

- [ ] **Step 3: Ajouter le script d'ingestion**

Dans `package.json` "scripts", ajouter :
```json
"ingest": "tsx scripts/ingest.ts"
```

- [ ] **Step 4: Définir les types du pipeline**

Create `src/ingestion/types.ts`:
```ts
import { PlayerSeasonStats, Tier } from '../domain/ratings'

export interface NormalizedRow {
  playerName: string
  clubName: string
  season: string
  competition: string
  stats: PlayerSeasonStats
}

export interface RatedRow extends NormalizedRow {
  tier: Tier
  ratingComputed: number
  reliability: 1 | 2 | 3 | 4
}
```

- [ ] **Step 5: Créer une fixture CSV d'exemple**

Create `src/ingestion/__fixtures__/sample-seasons.csv`:
```
player,club,season,competition,position,minutes,matches,goals,assists,xg,xa,tackles_interceptions,progressive_passes,pass_completion_pct,save_pct,clean_sheets,goals_conceded_per90,market_value
Kylian Mbappe,PSG,2018-19,L1,ST,2700,29,33,7,28,6,12,80,82,,,,180000000
Wissam Ben Yedder,Toulouse,2018-19,L1,ST,2900,38,21,5,19,4,15,75,79,,,,40000000
Florian Thauvin,Marseille,2018-19,L1,RW,3000,38,16,8,14,9,20,140,81,,,,45000000
Pape Souare,Lille,2014-15,L2,LB,2500,30,1,3,,,,,,,,,3000000
Sloppy Sub,Niceville,2018-19,L1,ST,500,12,1,0,1,0,3,20,70,,,,2000000
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: set up ingestion module (deps, types, sample fixture)"
```

---

### Task 2: Parsing des saisons

**Files:**
- Create: `src/ingestion/seasons.ts`
- Test: `src/ingestion/seasons.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/ingestion/seasons.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { seasonStartYear } from './seasons'

describe('seasonStartYear', () => {
  it('extracts the start year from "2018-19"', () => {
    expect(seasonStartYear('2018-19')).toBe(2018)
  })
  it('extracts the start year from "2002-2003"', () => {
    expect(seasonStartYear('2002-2003')).toBe(2002)
  })
  it('trims whitespace', () => {
    expect(seasonStartYear('  2020-21 ')).toBe(2020)
  })
  it('throws on a malformed season', () => {
    expect(() => seasonStartYear('saison')).toThrow()
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/ingestion/seasons.test.ts`
Expected: FAIL ("Cannot find module './seasons'").

- [ ] **Step 3: Implémenter**

Create `src/ingestion/seasons.ts`:
```ts
// "2018-19" ou "2002-2003" -> année de début (2018, 2002).
export function seasonStartYear(season: string): number {
  const match = season.trim().match(/^(\d{4})/)
  if (!match) throw new Error(`Invalid season: ${season}`)
  return Number(match[1])
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/ingestion/seasons.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: parse season start year"
```

---

### Task 3: Classification du tier

**Files:**
- Create: `src/ingestion/tier.ts`
- Test: `src/ingestion/tier.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/ingestion/tier.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { classifyTier } from './tier'

describe('classifyTier', () => {
  it('L1 from 2017-18 onward is rich', () => {
    expect(classifyTier({ competition: 'L1', season: '2017-18' })).toBe('rich')
    expect(classifyTier({ competition: 'L1', season: '2022-23' })).toBe('rich')
  })
  it('L1 before 2017 is basic', () => {
    expect(classifyTier({ competition: 'L1', season: '2016-17' })).toBe('basic')
    expect(classifyTier({ competition: 'L1', season: '2003-04' })).toBe('basic')
  })
  it('L2 is always basic', () => {
    expect(classifyTier({ competition: 'L2', season: '2020-21' })).toBe('basic')
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/ingestion/tier.test.ts`
Expected: FAIL ("Cannot find module './tier'").

- [ ] **Step 3: Implémenter**

Create `src/ingestion/tier.ts`:
```ts
import { Tier } from '../domain/ratings'
import { seasonStartYear } from './seasons'

// Stats avancées StatsBomb/FBref : Ligue 1 à partir de 2017-18. Sinon tier base.
export function classifyTier(input: { competition: string; season: string }): Tier {
  if (input.competition === 'L1' && seasonStartYear(input.season) >= 2017) return 'rich'
  return 'basic'
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/ingestion/tier.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: classify rating tier by competition and season"
```

---

### Task 4: Parsing CSV

**Files:**
- Create: `src/ingestion/csv.ts`
- Test: `src/ingestion/csv.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/ingestion/csv.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseSeasonCsv } from './csv'

const csv = `player,club,season,competition,position,minutes,matches,goals,assists
Star Player,PSG,2018-19,L1,ST,2700,29,33,7
Other Guy,Lyon,2018-19,L1,CM,2500,30,5,8`

describe('parseSeasonCsv', () => {
  it('parses rows keyed by header', () => {
    const rows = parseSeasonCsv(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0].player).toBe('Star Player')
    expect(rows[0].goals).toBe('33')
    expect(rows[1].club).toBe('Lyon')
  })
  it('skips empty lines', () => {
    expect(parseSeasonCsv(csv + '\n\n')).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/ingestion/csv.test.ts`
Expected: FAIL ("Cannot find module './csv'").

- [ ] **Step 3: Implémenter**

Create `src/ingestion/csv.ts`:
```ts
import { parse } from 'csv-parse/sync'

export type RawSeasonRow = Record<string, string>

export function parseSeasonCsv(text: string): RawSeasonRow[] {
  return parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as RawSeasonRow[]
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/ingestion/csv.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: parse season CSV into header-keyed rows"
```

---

### Task 5: Normalisation d'une ligne

**Files:**
- Create: `src/ingestion/normalize.ts`
- Test: `src/ingestion/normalize.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/ingestion/normalize.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { toNormalizedRow } from './normalize'
import { RawSeasonRow } from './csv'

const full: RawSeasonRow = {
  player: 'Kylian Mbappe', club: 'PSG', season: '2018-19', competition: 'L1', position: 'ST',
  minutes: '2700', matches: '29', goals: '33', assists: '7',
  xg: '28', xa: '6', tackles_interceptions: '12', progressive_passes: '80',
  pass_completion_pct: '82', save_pct: '', clean_sheets: '', goals_conceded_per90: '', market_value: '180000000',
}

describe('toNormalizedRow', () => {
  it('maps required fields and metadata', () => {
    const row = toNormalizedRow(full)
    expect(row.playerName).toBe('Kylian Mbappe')
    expect(row.clubName).toBe('PSG')
    expect(row.season).toBe('2018-19')
    expect(row.competition).toBe('L1')
    expect(row.stats.position).toBe('ST')
    expect(row.stats.minutes).toBe(2700)
    expect(row.stats.goals).toBe(33)
  })
  it('coerces present optional numbers and leaves blanks undefined', () => {
    const row = toNormalizedRow(full)
    expect(row.stats.xG).toBe(28)
    expect(row.stats.marketValue).toBe(180000000)
    expect(row.stats.savePct).toBeUndefined()
    expect(row.stats.cleanSheets).toBeUndefined()
  })
  it('uses player name and season as provisional ids', () => {
    const row = toNormalizedRow(full)
    expect(row.stats.playerId).toBe('Kylian Mbappe')
    expect(row.stats.seasonId).toBe('2018-19')
  })
  it('throws when a required text field is missing', () => {
    expect(() => toNormalizedRow({ ...full, player: '' })).toThrow()
  })
  it('throws when a required numeric field is missing', () => {
    expect(() => toNormalizedRow({ ...full, minutes: '' })).toThrow()
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/ingestion/normalize.test.ts`
Expected: FAIL ("Cannot find module './normalize'").

- [ ] **Step 3: Implémenter**

Create `src/ingestion/normalize.ts`:
```ts
import { PlayerSeasonStats } from '../domain/ratings'
import { RawSeasonRow } from './csv'
import { NormalizedRow } from './types'

function optionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function requiredNumber(value: string | undefined, field: string): number {
  const n = optionalNumber(value)
  if (n === undefined) throw new Error(`Missing required numeric field: ${field}`)
  return n
}

function requiredText(value: string | undefined, field: string): string {
  const v = value?.trim()
  if (!v) throw new Error(`Missing required field: ${field}`)
  return v
}

export function toNormalizedRow(row: RawSeasonRow): NormalizedRow {
  const playerName = requiredText(row.player, 'player')
  const clubName = requiredText(row.club, 'club')
  const season = requiredText(row.season, 'season')
  const competition = requiredText(row.competition, 'competition')
  const position = requiredText(row.position, 'position')

  const stats: PlayerSeasonStats = {
    playerId: playerName,
    seasonId: season,
    position,
    minutes: requiredNumber(row.minutes, 'minutes'),
    matches: requiredNumber(row.matches, 'matches'),
    goals: requiredNumber(row.goals, 'goals'),
    assists: requiredNumber(row.assists, 'assists'),
    xG: optionalNumber(row.xg),
    xA: optionalNumber(row.xa),
    tacklesInterceptions: optionalNumber(row.tackles_interceptions),
    progressivePasses: optionalNumber(row.progressive_passes),
    passCompletionPct: optionalNumber(row.pass_completion_pct),
    savePct: optionalNumber(row.save_pct),
    cleanSheets: optionalNumber(row.clean_sheets),
    goalsConcededPer90: optionalNumber(row.goals_conceded_per90),
    marketValue: optionalNumber(row.market_value),
  }

  return { playerName, clubName, season, competition, stats }
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/ingestion/normalize.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: normalize a raw CSV row into a typed season record"
```

---

### Task 6: Notation de toutes les saisons

**Files:**
- Create: `src/ingestion/rate.ts`
- Test: `src/ingestion/rate.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/ingestion/rate.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { rateAllSeasons } from './rate'
import { NormalizedRow } from './types'

function row(playerName: string, season: string, competition: string, position: string, goals: number, minutes = 2700): NormalizedRow {
  return {
    playerName, clubName: 'Club', season, competition,
    stats: { playerId: playerName, seasonId: season, position, minutes, matches: 30, goals, assists: 3 },
  }
}

describe('rateAllSeasons', () => {
  it('rates every row and tags tier per group', () => {
    const rows = [
      row('A', '2018-19', 'L1', 'ST', 30),
      row('B', '2018-19', 'L1', 'ST', 5),
    ]
    const rated = rateAllSeasons(rows)
    expect(rated).toHaveLength(2)
    const byId = Object.fromEntries(rated.map((r) => [r.playerName, r]))
    expect(byId.A.tier).toBe('rich')
    expect(byId.A.ratingComputed).toBeGreaterThan(byId.B.ratingComputed)
  })
  it('normalizes within (position group, season, competition), not across them', () => {
    // Un ST de L2 seul dans sa cohorte et un ST de L1 seul: chacun normalisé chez lui.
    const rows = [
      row('L1Star', '2018-19', 'L1', 'ST', 30),
      row('L2Star', '2018-19', 'L2', 'ST', 30),
    ]
    const rated = rateAllSeasons(rows)
    const tiers = Object.fromEntries(rated.map((r) => [r.playerName, r.tier]))
    expect(tiers.L1Star).toBe('rich')
    expect(tiers.L2Star).toBe('basic')
  })
  it('keeps goalkeepers and strikers in separate cohorts', () => {
    const rows = [
      row('Keeper', '2018-19', 'L1', 'GK', 0),
      row('Striker', '2018-19', 'L1', 'ST', 20),
    ]
    // Ne doit PAS jeter (chaque cohorte est mono-poste après regroupement).
    expect(() => rateAllSeasons(rows)).not.toThrow()
    expect(rateAllSeasons(rows)).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/ingestion/rate.test.ts`
Expected: FAIL ("Cannot find module './rate'").

- [ ] **Step 3: Implémenter**

Create `src/ingestion/rate.ts`:
```ts
import { computeSeasonRatings, toPositionGroup } from '../domain/ratings'
import { classifyTier } from './tier'
import { NormalizedRow, RatedRow } from './types'

// Regroupe par (groupe de poste, saison, compétition) — cohorte mono-poste et
// tier homogène — puis applique le moteur de note de Plan 1 à chaque cohorte.
export function rateAllSeasons(rows: NormalizedRow[]): RatedRow[] {
  const groups = new Map<string, NormalizedRow[]>()
  for (const row of rows) {
    const group = toPositionGroup(row.stats.position)
    const key = `${group}|${row.season}|${row.competition}`
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }

  const out: RatedRow[] = []
  for (const list of groups.values()) {
    const { season, competition } = list[0]
    const tier = classifyTier({ competition, season })
    const results = computeSeasonRatings(
      list.map((r) => r.stats),
      tier,
    )
    list.forEach((row, index) => {
      out.push({
        ...row,
        tier,
        ratingComputed: results[index].ratingComputed,
        reliability: results[index].reliability,
      })
    })
  }
  return out
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/ingestion/rate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: rate all seasons by position/season/competition cohort"
```

---

### Task 7: Sélection de la saison Prime par joueur

**Files:**
- Create: `src/ingestion/prime.ts`
- Test: `src/ingestion/prime.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/ingestion/prime.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { assignPrimeSeasons } from './prime'
import { RatedRow } from './types'

function rated(playerName: string, season: string, competition: string, ratingComputed: number): RatedRow {
  return {
    playerName, clubName: 'Club', season, competition,
    stats: { playerId: playerName, seasonId: season, position: 'ST', minutes: 2700, matches: 30, goals: 10, assists: 3 },
    tier: 'rich', ratingComputed, reliability: 4,
  }
}

describe('assignPrimeSeasons', () => {
  it('picks each player best-rated (season, competition)', () => {
    const rows = [
      rated('A', '2018-19', 'L1', 80),
      rated('A', '2019-20', 'L1', 88),
      rated('A', '2017-18', 'L2', 70),
      rated('B', '2018-19', 'L1', 75),
    ]
    const prime = assignPrimeSeasons(rows)
    expect(prime.get('A')).toEqual({ season: '2019-20', competition: 'L1' })
    expect(prime.get('B')).toEqual({ season: '2018-19', competition: 'L1' })
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/ingestion/prime.test.ts`
Expected: FAIL ("Cannot find module './prime'").

- [ ] **Step 3: Implémenter**

Create `src/ingestion/prime.ts`:
```ts
import { RatedRow } from './types'

export interface PrimeRef {
  season: string
  competition: string
}

// Pour chaque joueur, la (saison, compétition) de meilleure note calculée.
export function assignPrimeSeasons(rated: RatedRow[]): Map<string, PrimeRef> {
  const byPlayer = new Map<string, RatedRow[]>()
  for (const row of rated) {
    const list = byPlayer.get(row.playerName) ?? []
    list.push(row)
    byPlayer.set(row.playerName, list)
  }

  const prime = new Map<string, PrimeRef>()
  for (const [playerName, list] of byPlayer) {
    const best = list.reduce((b, r) => (r.ratingComputed > b.ratingComputed ? r : b))
    prime.set(playerName, { season: best.season, competition: best.competition })
  }
  return prime
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/ingestion/prime.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: select prime season per player"
```

---

### Task 8: Construction du payload d'upsert

**Files:**
- Create: `src/ingestion/payload.ts`
- Test: `src/ingestion/payload.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/ingestion/payload.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { buildUpsertPayload } from './payload'
import { RatedRow } from './types'
import { PrimeRef } from './prime'

function rated(playerName: string, club: string, season: string, competition: string, ratingComputed: number): RatedRow {
  return {
    playerName, clubName: club, season, competition,
    stats: { playerId: playerName, seasonId: season, position: 'ST', minutes: 2700, matches: 30, goals: 10, assists: 3, marketValue: 5_000_000 },
    tier: 'rich', ratingComputed, reliability: 4,
  }
}

describe('buildUpsertPayload', () => {
  const rows = [
    rated('A', 'PSG', '2018-19', 'L1', 80),
    rated('A', 'PSG', '2019-20', 'L1', 88),
    rated('B', 'Lyon', '2018-19', 'L1', 75),
  ]
  const prime = new Map<string, PrimeRef>([
    ['A', { season: '2019-20', competition: 'L1' }],
    ['B', { season: '2018-19', competition: 'L1' }],
  ])

  it('produces a deduplicated, sorted club list', () => {
    const payload = buildUpsertPayload(rows, prime)
    expect(payload.clubs).toEqual(['Lyon', 'PSG'])
  })
  it('produces one player entry with its prime ref', () => {
    const payload = buildUpsertPayload(rows, prime)
    expect(payload.players).toContainEqual({ name: 'A', primeSeason: '2019-20', primeCompetition: 'L1' })
    expect(payload.players).toHaveLength(2)
  })
  it('produces one player-season per rated row with rating fields', () => {
    const payload = buildUpsertPayload(rows, prime)
    expect(payload.playerSeasons).toHaveLength(3)
    const a1819 = payload.playerSeasons.find((p) => p.playerName === 'A' && p.season === '2018-19')!
    expect(a1819.ratingComputed).toBe(80)
    expect(a1819.reliability).toBe(4)
    expect(a1819.tier).toBe('rich')
    expect(a1819.marketValue).toBe(5_000_000)
  })
  it('throws if a player has no prime ref', () => {
    expect(() => buildUpsertPayload(rows, new Map())).toThrow()
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/ingestion/payload.test.ts`
Expected: FAIL ("Cannot find module './payload'").

- [ ] **Step 3: Implémenter**

Create `src/ingestion/payload.ts`:
```ts
import { RatedRow } from './types'
import { PrimeRef } from './prime'

export interface PlayerSeasonPayload {
  playerName: string
  clubName: string
  season: string
  competition: string
  position: string
  tier: string
  minutes: number
  matches: number
  goals: number
  assists: number
  xG?: number
  xA?: number
  tacklesInterceptions?: number
  progressivePasses?: number
  passCompletionPct?: number
  savePct?: number
  cleanSheets?: number
  goalsConcededPer90?: number
  marketValue?: number
  ratingComputed: number
  reliability: number
}

export interface UpsertPayload {
  clubs: string[]
  players: { name: string; primeSeason: string; primeCompetition: string }[]
  playerSeasons: PlayerSeasonPayload[]
}

export function buildUpsertPayload(rated: RatedRow[], prime: Map<string, PrimeRef>): UpsertPayload {
  const clubs = [...new Set(rated.map((r) => r.clubName))].sort()
  const playerNames = [...new Set(rated.map((r) => r.playerName))].sort()

  const players = playerNames.map((name) => {
    const ref = prime.get(name)
    if (!ref) throw new Error(`No prime season for player: ${name}`)
    return { name, primeSeason: ref.season, primeCompetition: ref.competition }
  })

  const playerSeasons: PlayerSeasonPayload[] = rated.map((r) => ({
    playerName: r.playerName,
    clubName: r.clubName,
    season: r.season,
    competition: r.competition,
    position: r.stats.position,
    tier: r.tier,
    minutes: r.stats.minutes,
    matches: r.stats.matches,
    goals: r.stats.goals,
    assists: r.stats.assists,
    xG: r.stats.xG,
    xA: r.stats.xA,
    tacklesInterceptions: r.stats.tacklesInterceptions,
    progressivePasses: r.stats.progressivePasses,
    passCompletionPct: r.stats.passCompletionPct,
    savePct: r.stats.savePct,
    cleanSheets: r.stats.cleanSheets,
    goalsConcededPer90: r.stats.goalsConcededPer90,
    marketValue: r.stats.marketValue,
    ratingComputed: r.ratingComputed,
    reliability: r.reliability,
  }))

  return { clubs, players, playerSeasons }
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/ingestion/payload.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: build DB-ready upsert payload from rated rows"
```

---

### Task 9: Schéma (clés uniques) + chargement Prisma

**Files:**
- Modify: `prisma/schema.prisma` (ajout `@unique` sur `Club.name` et `Player.name`)
- Create: `src/ingestion/load.ts`
- Test: `src/ingestion/load.test.ts`

> Note : `Club.name` et `Player.name` deviennent uniques pour servir de clé d'upsert. Simplification assumée (deux joueurs homonymes seraient fusionnés) — la désambiguïsation (ex. nom + année de naissance) est un raffinement ultérieur, mentionné dans le spec §2.5/admin.

- [ ] **Step 1: Ajouter les contraintes d'unicité**

Dans `prisma/schema.prisma`, modifier le champ `name` de `Club` :
```prisma
  name          String         @unique
```
et celui de `Player` :
```prisma
  name          String         @unique
```

- [ ] **Step 2: Valider et régénérer le client**

Run: `npx prisma validate && npx prisma generate`
Expected: "valid" puis client généré.

> La migration (`npx prisma migrate dev --name unique-names`) sera lancée par l'utilisateur quand `DATABASE_URL` (Neon) sera renseigné. Ce plan ne nécessite pas de base live.

- [ ] **Step 3: Écrire le test (intégration, sauté sans DATABASE_URL)**

Create `src/ingestion/load.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { loadRatedSeasons } from './load'
import { UpsertPayload } from './payload'

const hasDb = !!process.env.DATABASE_URL

describe('loadRatedSeasons', () => {
  it('exports a function', () => {
    expect(typeof loadRatedSeasons).toBe('function')
  })

  it.skipIf(!hasDb)('upserts clubs, players, seasons and prime ids', async () => {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    const payload: UpsertPayload = {
      clubs: ['TestClub'],
      players: [{ name: 'TestPlayer', primeSeason: '2018-19', primeCompetition: 'L1' }],
      playerSeasons: [{
        playerName: 'TestPlayer', clubName: 'TestClub', season: '2018-19', competition: 'L1',
        position: 'ST', tier: 'rich', minutes: 2700, matches: 30, goals: 20, assists: 5,
        ratingComputed: 85, reliability: 4,
      }],
    }
    await loadRatedSeasons(prisma, payload)
    const player = await prisma.player.findUnique({ where: { name: 'TestPlayer' } })
    expect(player?.primeSeasonId).toBeTruthy()
    await prisma.$disconnect()
  })
})
```

- [ ] **Step 4: Vérifier l'échec**

Run: `npx vitest run src/ingestion/load.test.ts`
Expected: FAIL ("Cannot find module './load'").

- [ ] **Step 5: Implémenter**

Create `src/ingestion/load.ts`:
```ts
import type { PrismaClient } from '@prisma/client'
import { UpsertPayload, PlayerSeasonPayload } from './payload'

function seasonData(ps: PlayerSeasonPayload) {
  return {
    position: ps.position,
    tier: ps.tier,
    minutes: ps.minutes,
    matches: ps.matches,
    goals: ps.goals,
    assists: ps.assists,
    xG: ps.xG ?? null,
    xA: ps.xA ?? null,
    tacklesInterceptions: ps.tacklesInterceptions ?? null,
    progressivePasses: ps.progressivePasses ?? null,
    passCompletionPct: ps.passCompletionPct ?? null,
    savePct: ps.savePct ?? null,
    cleanSheets: ps.cleanSheets ?? null,
    goalsConcededPer90: ps.goalsConcededPer90 ?? null,
    marketValue: ps.marketValue ?? null,
    ratingComputed: ps.ratingComputed,
    reliability: ps.reliability,
  }
}

export async function loadRatedSeasons(prisma: PrismaClient, payload: UpsertPayload): Promise<void> {
  const clubIdByName = new Map<string, string>()
  for (const name of payload.clubs) {
    const club = await prisma.club.upsert({ where: { name }, update: {}, create: { name } })
    clubIdByName.set(name, club.id)
  }

  const playerIdByName = new Map<string, string>()
  for (const p of payload.players) {
    const player = await prisma.player.upsert({ where: { name: p.name }, update: {}, create: { name: p.name } })
    playerIdByName.set(p.name, player.id)
  }

  for (const ps of payload.playerSeasons) {
    const playerId = playerIdByName.get(ps.playerName)!
    const clubId = clubIdByName.get(ps.clubName)!
    const data = seasonData(ps)
    await prisma.playerSeason.upsert({
      where: { playerId_season_competition: { playerId, season: ps.season, competition: ps.competition } },
      update: { clubId, ...data },
      create: { playerId, clubId, season: ps.season, competition: ps.competition, ...data },
    })
  }

  for (const p of payload.players) {
    const playerId = playerIdByName.get(p.name)!
    const season = await prisma.playerSeason.findUnique({
      where: { playerId_season_competition: { playerId, season: p.primeSeason, competition: p.primeCompetition } },
    })
    if (season) {
      await prisma.player.update({ where: { id: playerId }, data: { primeSeasonId: season.id } })
    }
  }
}
```

- [ ] **Step 6: Vérifier le succès**

Run: `npx vitest run src/ingestion/load.test.ts`
Expected: PASS (le test d'intégration est SKIPPED sans `DATABASE_URL` ; le test "exports a function" passe).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: load rated seasons into Postgres via Prisma upserts"
```

---

### Task 10: CLI d'orchestration + test end-to-end

**Files:**
- Create: `scripts/ingest.ts`
- Test: `src/ingestion/pipeline.test.ts`

- [ ] **Step 1: Écrire le test end-to-end (pur, sur la fixture)**

Create `src/ingestion/pipeline.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseSeasonCsv } from './csv'
import { toNormalizedRow } from './normalize'
import { rateAllSeasons } from './rate'
import { assignPrimeSeasons } from './prime'
import { buildUpsertPayload } from './payload'

describe('ingestion pipeline (pure, on sample fixture)', () => {
  const csv = readFileSync(join(__dirname, '__fixtures__', 'sample-seasons.csv'), 'utf8')
  const rated = rateAllSeasons(parseSeasonCsv(csv).map(toNormalizedRow))
  const payload = buildUpsertPayload(rated, assignPrimeSeasons(rated))

  it('produces one player-season per CSV row', () => {
    expect(payload.playerSeasons).toHaveLength(5)
  })
  it('rates the prolific striker above the bit-part striker in the same cohort', () => {
    const byKey = Object.fromEntries(payload.playerSeasons.map((p) => [p.playerName, p]))
    expect(byKey['Kylian Mbappe'].ratingComputed).toBeGreaterThan(byKey['Sloppy Sub'].ratingComputed)
  })
  it('tags L1 2018-19 as rich and L2 2014-15 as basic', () => {
    const byKey = Object.fromEntries(payload.playerSeasons.map((p) => [p.playerName, p]))
    expect(byKey['Kylian Mbappe'].tier).toBe('rich')
    expect(byKey['Pape Souare'].tier).toBe('basic')
  })
  it('keeps every rating within 40..99', () => {
    for (const ps of payload.playerSeasons) {
      expect(ps.ratingComputed).toBeGreaterThanOrEqual(40)
      expect(ps.ratingComputed).toBeLessThanOrEqual(99)
    }
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/ingestion/pipeline.test.ts`
Expected: FAIL au départ uniquement si un module manque ; sinon les assertions doivent passer une fois `scripts/ingest.ts` créé n'est PAS requis pour ce test (il est pur). Si tous les modules des Tasks 4-8 existent, ce test doit PASSER directement. Lance-le : s'il passe, tant mieux ; sinon corrige l'assertion défaillante.

> Ce test ne dépend pas du CLI ni de la base. Il valide la chaîne pure de bout en bout.

- [ ] **Step 3: Créer le CLI d'orchestration**

Create `scripts/ingest.ts`:
```ts
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { parseSeasonCsv } from '../src/ingestion/csv'
import { toNormalizedRow } from '../src/ingestion/normalize'
import { rateAllSeasons } from '../src/ingestion/rate'
import { assignPrimeSeasons } from '../src/ingestion/prime'
import { buildUpsertPayload } from '../src/ingestion/payload'
import { loadRatedSeasons } from '../src/ingestion/load'

async function main() {
  const dir = join(process.cwd(), 'data', 'raw')
  if (!existsSync(dir)) {
    throw new Error(`Dossier introuvable: ${dir}. Dépose des CSV (voir le format dans le plan).`)
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.csv'))
  if (files.length === 0) throw new Error(`Aucun .csv dans ${dir}`)

  const rawRows = files.flatMap((f) => parseSeasonCsv(readFileSync(join(dir, f), 'utf8')))
  const normalized = rawRows.map(toNormalizedRow)
  const rated = rateAllSeasons(normalized)
  const prime = assignPrimeSeasons(rated)
  const payload = buildUpsertPayload(rated, prime)

  const prisma = new PrismaClient()
  await loadRatedSeasons(prisma, payload)
  await prisma.$disconnect()

  console.log(
    `Ingéré: ${payload.playerSeasons.length} joueur-saisons, ` +
    `${payload.players.length} joueurs, ${payload.clubs.length} clubs (depuis ${files.length} fichier(s)).`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 4: Vérifier le pipeline pur + type-check du CLI**

Run: `npx vitest run src/ingestion/pipeline.test.ts && npx tsc --noEmit`
Expected: test PASS ; `tsc --noEmit` sans erreur (le CLI compile).

> Exécution réelle (`npm run ingest`) : nécessite des CSV dans `data/raw/` ET `DATABASE_URL` (Neon) + migration appliquée. À lancer par l'utilisateur dans son environnement — hors périmètre vérifiable de ce plan.

- [ ] **Step 5: Lancer toute la suite + lint + build**

Run: `npm test && npm run lint && npm run build`
Expected: tous les tests PASS, lint OK, build OK.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: ingestion CLI orchestrator and end-to-end pipeline test"
```

---

## Couverture du spec (auto-revue)

- §3 pipeline hors-ligne, l'app lit seulement → Tasks 4-10 (pipeline + CLI), `data/raw/` ignoré.
- §3 idempotence → upserts (Task 9).
- §2.3 modèle deux niveaux / classification tier → Tasks 2-3, appliqué en Task 6.
- §2.4 saison Prime pré-calculée (`primeSeasonId`) → Tasks 7, 9.
- §8 écriture `players` / `player_seasons` / `clubs` avec `ratingComputed`, `reliability`, `tier` → Tasks 8-9.
- §2.5 `ratingOverride` : non touché par l'ingestion (laissé null ; l'admin l'éditera dans un plan ultérieur). L'upsert en Task 9 ne réécrit PAS `ratingOverride` (update ne le liste pas) → les overrides admin survivent à une ré-ingestion. ✔

**Hors de ce plan :** récupération des sources FBref/Transfermarkt (Plan 2b, exploratoire), cœur de jeu/simulation, UI, admin, profondeur. Adjustement de force inter-compétitions (L1 vs L2) : noté comme calibration ultérieure (ajustable via override admin).
