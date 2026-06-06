# Onze d'Or — Plan 8 : Simulation par journées

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire dérouler la saison journée par journée (calendrier round-robin), exposer les `matchdays` dans `SeasonResult`, et permettre de calculer le classement après une journée donnée — base du défilement animé (Plan 9).

**Architecture:** Un planificateur `roundRobinSchedule` (méthode du cercle, double aller-retour) produit les rencontres par journée. `playSeasonByMatchday` simule chaque journée. `accumulateStandings` agrège des journées en lignes de classement ; `playSeason` est redéfini par-dessus (signature inchangée, ses tests passent toujours). `standingsAfter` donne le classement après la journée N. `simulateSeason` utilise ce chemin et **inclut `matchdays`** dans son résultat — le tableau final est dérivé des mêmes journées (cohérence animation/résultat). Additif : champ `matchdays` ajouté à `SeasonResult`.

**Tech Stack:** TypeScript, Vitest. **Node ≥ 20.9** (`nvm use 20`). Modules sous `src/domain/game/`.

**Référence spec:** §5 simulation, §12 (défilement animé). **Hors de ce plan :** l'UI animée (Plan 9).

---

### Task 1: Planificateur round-robin

**Files:**
- Create: `src/domain/game/schedule.ts`
- Test: `src/domain/game/schedule.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/game/schedule.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { roundRobinSchedule } from './schedule'

describe('roundRobinSchedule', () => {
  it('produces 2*(n-1) rounds for an even team count', () => {
    expect(roundRobinSchedule(4)).toHaveLength(6)
    expect(roundRobinSchedule(18)).toHaveLength(34)
  })
  it('plays n/2 matches per round for an even team count', () => {
    for (const round of roundRobinSchedule(18)) {
      expect(round).toHaveLength(9)
    }
  })
  it('no team plays itself', () => {
    for (const round of roundRobinSchedule(6)) {
      for (const [home, away] of round) expect(home).not.toBe(away)
    }
  })
  it('no team appears twice in the same round', () => {
    for (const round of roundRobinSchedule(6)) {
      const seen = new Set<number>()
      for (const [home, away] of round) {
        expect(seen.has(home)).toBe(false)
        expect(seen.has(away)).toBe(false)
        seen.add(home)
        seen.add(away)
      }
    }
  })
  it('every ordered pair (i,j), i!=j, appears exactly once (full double round-robin)', () => {
    const n = 6
    const seen = new Set<string>()
    for (const round of roundRobinSchedule(n)) {
      for (const [home, away] of round) seen.add(`${home}-${away}`)
    }
    expect(seen.size).toBe(n * (n - 1))
  })
  it('handles an odd team count by giving each team a bye (fewer matches some rounds)', () => {
    const rounds = roundRobinSchedule(5)
    // each team plays 2*(5-1) = 8 matches across the schedule
    const counts = new Map<number, number>()
    for (const round of rounds) {
      for (const [home, away] of round) {
        counts.set(home, (counts.get(home) ?? 0) + 1)
        counts.set(away, (counts.get(away) ?? 0) + 1)
      }
    }
    for (let i = 0; i < 5; i++) expect(counts.get(i)).toBe(8)
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npx vitest run src/domain/game/schedule.test.ts`
Expected: FAIL ("Cannot find module './schedule'").

- [ ] **Step 3: Implémenter**

Create `src/domain/game/schedule.ts`:
```ts
// Calendrier double aller-retour (méthode du cercle). Renvoie les journées ;
// chaque journée est une liste de rencontres [domicile, extérieur] (indices d'équipe).
// Si le nombre d'équipes est impair, une équipe fictive ("bye") fait tourner les
// repos : ses rencontres sont retirées (l'équipe au repos ce tour-là ne joue pas).
export function roundRobinSchedule(teamCount: number): [number, number][][] {
  const odd = teamCount % 2 !== 0
  const n = odd ? teamCount + 1 : teamCount
  const bye = odd ? teamCount : -1 // index fictif
  const half = n / 2

  let order = Array.from({ length: n }, (_, i) => i)
  const firstHalf: [number, number][][] = []

  for (let round = 0; round < n - 1; round++) {
    const pairs: [number, number][] = []
    for (let i = 0; i < half; i++) {
      const a = order[i]
      const b = order[n - 1 - i]
      if (a !== bye && b !== bye) {
        // alterne domicile/extérieur selon la parité de la journée (équité)
        pairs.push(round % 2 === 0 ? [a, b] : [b, a])
      }
    }
    firstHalf.push(pairs)
    // rotation : on fixe order[0], on fait tourner le reste
    order = [order[0], order[n - 1], ...order.slice(1, n - 1)]
  }

  // retour : on inverse domicile/extérieur
  const secondHalf = firstHalf.map((round) => round.map(([a, b]) => [b, a] as [number, number]))
  return [...firstHalf, ...secondHalf]
}
```

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/game/schedule.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: round-robin schedule (circle method, double legs)"
```

---

### Task 2: Types de journées + simulation par journées

**Files:**
- Modify: `src/domain/game/types.ts` (ajouter `Match`, `Matchday`, et `matchdays` sur `SeasonResult`)
- Modify: `src/domain/game/season.ts` (ajouter `playSeasonByMatchday`, `accumulateStandings`, `standingsAfter` ; redéfinir `playSeason`)
- Test: `src/domain/game/matchday.test.ts`

- [ ] **Step 1: Ajouter les types**

Dans `src/domain/game/types.ts`, ajoute :
```ts
export interface Match {
  home: string
  away: string
  homeGoals: number
  awayGoals: number
}

export interface Matchday {
  round: number
  matches: Match[]
}
```
Et dans l'interface `SeasonResult`, ajoute le champ :
```ts
  matchdays: Matchday[]
```

- [ ] **Step 2: Écrire le test qui échoue**

Create `src/domain/game/matchday.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { playSeasonByMatchday, accumulateStandings, standingsAfter, TeamSeed } from './season'
import { createRng } from './rng'

const teams: TeamSeed[] = [
  { name: 'User', strength: 85, isUser: true },
  { name: 'B', strength: 70, isUser: false },
  { name: 'C', strength: 60, isUser: false },
  { name: 'D', strength: 75, isUser: false },
]

describe('playSeasonByMatchday', () => {
  const matchdays = playSeasonByMatchday(createRng(10), teams)

  it('produces 2*(N-1) numbered matchdays', () => {
    expect(matchdays).toHaveLength(6)
    expect(matchdays[0].round).toBe(1)
    expect(matchdays[5].round).toBe(6)
  })
  it('each matchday has N/2 matches naming real teams', () => {
    const names = new Set(teams.map((t) => t.name))
    for (const md of matchdays) {
      expect(md.matches).toHaveLength(2)
      for (const m of md.matches) {
        expect(names.has(m.home)).toBe(true)
        expect(names.has(m.away)).toBe(true)
        expect(m.homeGoals).toBeGreaterThanOrEqual(0)
      }
    }
  })
  it('is deterministic for a given seed', () => {
    expect(playSeasonByMatchday(createRng(10), teams)).toEqual(matchdays)
  })
})

describe('accumulateStandings', () => {
  const matchdays = playSeasonByMatchday(createRng(10), teams)
  const rows = accumulateStandings(matchdays, teams)

  it('gives each team 2*(N-1) games and league gf == ga', () => {
    for (const r of rows) expect(r.played).toBe(6)
    expect(rows.reduce((s, r) => s + r.gf, 0)).toBe(rows.reduce((s, r) => s + r.ga, 0))
  })
  it('points equal 3*won + drawn', () => {
    for (const r of rows) expect(r.points).toBe(3 * r.won + r.drawn)
  })
})

describe('standingsAfter', () => {
  const matchdays = playSeasonByMatchday(createRng(10), teams)
  it('after round 0, nobody has played', () => {
    const t = standingsAfter(matchdays, teams, 0)
    expect(t.every((r) => r.played === 0)).toBe(true)
  })
  it('after the last round, equals the full accumulated table size and is sorted with positions', () => {
    const t = standingsAfter(matchdays, teams, 6)
    expect(t).toHaveLength(4)
    expect(t[0].position).toBe(1)
    for (const r of t) expect(r.played).toBe(6)
  })
  it('played count is monotonic non-decreasing across rounds', () => {
    let prev = 0
    for (let n = 0; n <= 6; n++) {
      const total = standingsAfter(matchdays, teams, n).reduce((s, r) => s + r.played, 0)
      expect(total).toBeGreaterThanOrEqual(prev)
      prev = total
    }
  })
})
```

- [ ] **Step 3: Vérifier l'échec**

Run: `npx vitest run src/domain/game/matchday.test.ts`
Expected: FAIL ("playSeasonByMatchday is not exported").

- [ ] **Step 4: Implémenter dans season.ts**

Dans `src/domain/game/season.ts` :
- ajoute l'import en tête : `import { roundRobinSchedule } from './schedule'` et `import { Match, Matchday, TableRow } from './types'` (fusionne avec l'import de `TableRow` existant s'il y en a un).
- garde `emptyRow`, `applyResult` et `buildTable` existants.
- ajoute ces fonctions :
```ts
export function playSeasonByMatchday(rng: () => number, teams: TeamSeed[]): Matchday[] {
  const schedule = roundRobinSchedule(teams.length)
  return schedule.map((pairs, index) => ({
    round: index + 1,
    matches: pairs.map(([h, a]): Match => {
      const [homeGoals, awayGoals] = simulateMatch(rng, teams[h].strength, teams[a].strength)
      return { home: teams[h].name, away: teams[a].name, homeGoals, awayGoals }
    }),
  }))
}

export function accumulateStandings(matchdays: Matchday[], teams: TeamSeed[]): TableRow[] {
  const rows = teams.map(emptyRow)
  const byName = new Map(rows.map((r) => [r.name, r]))
  for (const md of matchdays) {
    for (const m of md.matches) {
      const home = byName.get(m.home)
      const away = byName.get(m.away)
      if (home) applyResult(home, m.homeGoals, m.awayGoals)
      if (away) applyResult(away, m.awayGoals, m.homeGoals)
    }
  }
  return rows
}

export function standingsAfter(matchdays: Matchday[], teams: TeamSeed[], uptoRound: number): TableRow[] {
  return buildTable(accumulateStandings(matchdays.filter((m) => m.round <= uptoRound), teams))
}
```
- **redéfinis** `playSeason` pour qu'il s'appuie sur les journées (signature inchangée) :
```ts
export function playSeason(rng: () => number, teams: TeamSeed[]): TableRow[] {
  return accumulateStandings(playSeasonByMatchday(rng, teams), teams)
}
```
(supprime l'ancienne double boucle de `playSeason` ; `simulateMatch` reste importé et utilisé par `playSeasonByMatchday`.)

- [ ] **Step 5: Vérifier le succès (nouveaux + anciens)**

Run: `npx vitest run src/domain/game/matchday.test.ts src/domain/game/season.test.ts`
Expected: PASS (les invariants de `season.test.ts` tiennent toujours : `played = 2*(N-1)`, `gf == ga`, `points = 3W+D`).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: matchday-based season simulation and running standings"
```

---

### Task 3: Brancher simulateSeason sur les journées

**Files:**
- Modify: `src/domain/game/simulate.ts`
- Modify: `src/domain/game/simulate.test.ts` (ajouter des assertions)

- [ ] **Step 1: Ajouter les assertions au test**

Dans `src/domain/game/simulate.test.ts`, dans le `describe('simulateSeason', ...)`, ajoute :
```ts
  it('exposes the full matchday schedule (2*(N-1) rounds) consistent with the final table', () => {
    expect(result.matchdays).toHaveLength(34)
    expect(result.matchdays[0].matches).toHaveLength(9)
    // le classement après la dernière journée doit correspondre au tableau final
    const last = result.matchdays[result.matchdays.length - 1].round
    expect(last).toBe(34)
  })
```
(Le `result` est déjà construit en tête du describe via `simulateSeason(makeTeam(82), { seed: 2024, teamName: 'User' })`.)

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/game/simulate.test.ts`
Expected: FAIL (`result.matchdays` undefined).

- [ ] **Step 3: Implémenter**

Dans `src/domain/game/simulate.ts`, remplace le corps qui faisait `playSeason`/`buildTable` par le chemin journées. Le fichier doit :
- importer `playSeasonByMatchday, accumulateStandings, buildTable` depuis `./season` (au lieu de `playSeason, buildTable`).
- construire les journées une seule fois et en dériver le tableau :
```ts
  const matchdays = playSeasonByMatchday(rng, seeds)
  const table = buildTable(accumulateStandings(matchdays, seeds))
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
    matchdays,
  }
```
(Garde tout le début identique : création du `rng`, `opponentCount`, `teamName`, `generateOpponents`, construction des `seeds`.)

- [ ] **Step 4: Vérifier le succès**

Run: `npx vitest run src/domain/game/simulate.test.ts`
Expected: PASS (y compris déterminisme et « équipe forte > faible »).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: simulateSeason exposes matchdays derived from the same simulation"
```

---

### Task 4: Barrel + intégration + checks

**Files:**
- Modify: `src/domain/game/index.ts` (exporter `./schedule`)
- Test: `src/domain/game/matchday.integration.test.ts`

- [ ] **Step 1: Étendre le barrel**

Dans `src/domain/game/index.ts`, ajoute `export * from './schedule'` (les types `Match`/`Matchday` et les fonctions de `season.ts` sont déjà ré-exportés via `./types` et `./season`).

- [ ] **Step 2: Test d'intégration**

Create `src/domain/game/matchday.integration.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { simulateSeason, standingsAfter, PoolPlayer } from './index'

function makeTeam(rating: number): PoolPlayer[] {
  const groups: PoolPlayer['positionGroup'][] = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'ATT', 'ATT', 'ATT']
  return groups.map((group, i) => ({
    playerId: `p${i}`, playerName: `Player ${i}`, clubName: 'User', season: '2018-19', competition: 'L1',
    positionGroup: group, rating, reliability: 4,
  }))
}

describe('matchday integration', () => {
  const result = simulateSeason(makeTeam(82), { seed: 2024, teamName: 'User' })

  it('the standings after the final matchday match the final table (order + points)', () => {
    const last = standingsAfter(result.matchdays, result.table.map((r) => ({ name: r.name, strength: 0, isUser: r.isUser })), 34)
    expect(last.map((r) => r.name)).toEqual(result.table.map((r) => r.name))
    expect(last.map((r) => r.points)).toEqual(result.table.map((r) => r.points))
  })
  it('the user total points only grows across the season', () => {
    let prev = -1
    for (let n = 0; n <= 34; n++) {
      const row = standingsAfter(result.matchdays, result.table.map((r) => ({ name: r.name, strength: 0, isUser: r.isUser })), n).find((r) => r.isUser)!
      expect(row.points).toBeGreaterThanOrEqual(prev)
      prev = row.points
    }
  })
})
```

> Note : `standingsAfter` ne se sert que des noms et du drapeau `isUser` des `TeamSeed` (la force n'intervient pas dans l'agrégation), d'où le `strength: 0` de remplissage dans le test.

- [ ] **Step 3: Lancer toute la suite + checks**

Run: `npm test && npm run lint && npm run build && npx tsc --noEmit`
Expected: tous les tests PASS (Plans 1-7 inchangés + nouveaux), lint OK, build OK, tsc OK.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: matchday barrel export and standings-progression integration"
```

---

## Couverture du spec (auto-revue)

- §12 défilement animé (prérequis) → `matchdays` exposés (Tasks 2-3) + `standingsAfter` pour le classement en direct (Task 2).
- §5 simulation cohérente → le tableau final dérive des mêmes journées que l'animation (Task 3), invariants conservés (Task 2).

**Additif :** `SeasonResult` gagne `matchdays` ; les consommateurs existants (UI Plans 5-6) ne l'utilisent pas encore → aucun impact. `playSeason` garde sa signature (redéfini via les journées) → `season.test.ts` passe toujours. **Hors de ce plan :** l'écran animé qui consomme `matchdays`/`standingsAfter` (Plan 9).
```
