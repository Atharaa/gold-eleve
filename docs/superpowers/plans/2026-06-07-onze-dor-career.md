# Onze d'Or — Plan 10 : Mode Carrière (local-first)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de continuer avec son XI sur plusieurs saisons : un mode carrière qui rejoue la même équipe saison après saison, accumule un historique et un palmarès, persisté en local (localStorage).

**Architecture:** Un moteur de carrière pur (`src/domain/career/`) : `startCareer`, `playNextSeason` (rejoue `simulateSeason` avec une seed par saison et ajoute un `SeasonRecord`), `careerSummary` (palmarès). Une persistance via une interface `StorageLike` (localStorage côté navigateur), testable avec un faux storage. Côté UI : un bouton « Continuer en carrière » sur l'écran de fin écrit la carrière et navigue vers `/career` ; la page carrière affiche le XI (réutilise `Pitch`), l'historique des saisons et le palmarès, avec « Jouer la saison suivante » et « Nouvelle carrière ». Imports relatifs dans `src/domain/*`.

**Tech Stack:** TypeScript, Vitest, Next.js. **Node ≥ 20.9** (`nvm use 20`). Réutilise `src/domain/game` (simulateSeason, teamRating).

**Vérification :** moteur + persistance en TDD ; l'UI au build/tsc/lint + smoke runtime. Essai interactif = navigateur.

**Référence spec:** §6 (carrière multi-saisons). **Hors de ce plan (v1) :** recrutement entre saisons, vieillissement/évolution des notes, montée/descente — notés pour une itération ultérieure. Backend/comptes (le défi du jour et le classement communautaire restent hors-scope).

---

### Task 1: Moteur de carrière

**Files:**
- Create: `src/domain/career/types.ts`
- Create: `src/domain/career/career.ts`
- Test: `src/domain/career/career.test.ts`

- [ ] **Step 1: Types**

Create `src/domain/career/types.ts`:
```ts
import { PoolPlayer } from '../game'

export interface SeasonRecord {
  season: number
  position: number
  points: number
  won: number
  drawn: number
  lost: number
  gf: number
  ga: number
  invincible: boolean
  champion: boolean
}

export interface Career {
  team: PoolPlayer[]
  formation: string
  teamName: string
  baseSeed: number
  seasons: SeasonRecord[]
}

export interface CareerSummary {
  seasonsPlayed: number
  titles: number
  invincibleSeasons: number
  bestPosition: number | null
  worstPosition: number | null
  totalPoints: number
  lastPosition: number | null
}
```

- [ ] **Step 2: Écrire le test qui échoue**

Create `src/domain/career/career.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { startCareer, playNextSeason, careerSummary } from './career'
import { PoolPlayer } from '../game'

function team(rating: number): PoolPlayer[] {
  const groups: PoolPlayer['positionGroup'][] = ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'ATT', 'ATT', 'ATT']
  return groups.map((group, i) => ({
    playerId: `p${i}`, playerName: `Player ${i}`, clubName: 'User', season: '2018-19', competition: 'L1',
    positionGroup: group, rating, reliability: 4,
  }))
}

describe('startCareer', () => {
  it('starts with no seasons played', () => {
    const c = startCareer(team(82), '4-3-3', 100, 'Mon XI')
    expect(c.seasons).toHaveLength(0)
    expect(c.formation).toBe('4-3-3')
    expect(c.teamName).toBe('Mon XI')
  })
})

describe('playNextSeason', () => {
  it('appends one season record per call, numbered from 1', () => {
    let c = startCareer(team(82), '4-3-3', 100, 'Mon XI')
    c = playNextSeason(c)
    expect(c.seasons).toHaveLength(1)
    expect(c.seasons[0].season).toBe(1)
    c = playNextSeason(c)
    expect(c.seasons).toHaveLength(2)
    expect(c.seasons[1].season).toBe(2)
  })
  it('records a coherent season (position 1..18, points = 3w+d)', () => {
    const c = playNextSeason(startCareer(team(82), '4-3-3', 100, 'Mon XI'))
    const s = c.seasons[0]
    expect(s.position).toBeGreaterThanOrEqual(1)
    expect(s.position).toBeLessThanOrEqual(18)
    expect(s.points).toBe(3 * s.won + s.drawn)
    expect(s.champion).toBe(s.position === 1)
  })
  it('is deterministic (same career state -> same next season)', () => {
    const base = startCareer(team(82), '4-3-3', 100, 'Mon XI')
    expect(playNextSeason(base).seasons[0]).toEqual(playNextSeason(base).seasons[0])
  })
  it('produces varied results across seasons (different seeds)', () => {
    let c = startCareer(team(78), '4-3-3', 100, 'Mon XI')
    for (let i = 0; i < 5; i++) c = playNextSeason(c)
    const positions = new Set(c.seasons.map((s) => s.position))
    // au moins deux classements différents sur 5 saisons (sinon la seed ne varie pas)
    expect(positions.size).toBeGreaterThan(1)
  })
  it('does not mutate the input career', () => {
    const base = startCareer(team(82), '4-3-3', 100, 'Mon XI')
    playNextSeason(base)
    expect(base.seasons).toHaveLength(0)
  })
})

describe('careerSummary', () => {
  it('summarizes titles, invincible seasons, best/worst, totals', () => {
    let c = startCareer(team(99), '4-3-3', 100, 'Mon XI')
    for (let i = 0; i < 3; i++) c = playNextSeason(c)
    const sum = careerSummary(c)
    expect(sum.seasonsPlayed).toBe(3)
    expect(sum.titles).toBe(c.seasons.filter((s) => s.champion).length)
    expect(sum.bestPosition).toBe(Math.min(...c.seasons.map((s) => s.position)))
    expect(sum.totalPoints).toBe(c.seasons.reduce((a, s) => a + s.points, 0))
    expect(sum.lastPosition).toBe(c.seasons[c.seasons.length - 1].position)
  })
  it('handles an empty career', () => {
    const sum = careerSummary(startCareer(team(82), '4-3-3', 100, 'Mon XI'))
    expect(sum).toEqual({ seasonsPlayed: 0, titles: 0, invincibleSeasons: 0, bestPosition: null, worstPosition: null, totalPoints: 0, lastPosition: null })
  })
})
```

- [ ] **Step 3: Vérifier l'échec**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npx vitest run src/domain/career/career.test.ts`
Expected: FAIL ("Cannot find module './career'").

- [ ] **Step 4: Implémenter**

Create `src/domain/career/career.ts`:
```ts
import { PoolPlayer, simulateSeason } from '../game'
import { Career, CareerSummary, SeasonRecord } from './types'

export function startCareer(team: PoolPlayer[], formation: string, baseSeed: number, teamName: string): Career {
  return { team, formation, teamName, baseSeed, seasons: [] }
}

export function playNextSeason(career: Career): Career {
  const seasonNumber = career.seasons.length + 1
  const seed = career.baseSeed + seasonNumber * 7919
  const result = simulateSeason(career.team, { seed, teamName: career.teamName })
  const u = result.userRow
  const record: SeasonRecord = {
    season: seasonNumber,
    position: u.position ?? 0,
    points: u.points,
    won: u.won,
    drawn: u.drawn,
    lost: u.lost,
    gf: u.gf,
    ga: u.ga,
    invincible: result.invincible,
    champion: u.position === 1,
  }
  return { ...career, seasons: [...career.seasons, record] }
}

export function careerSummary(career: Career): CareerSummary {
  const seasons = career.seasons
  if (seasons.length === 0) {
    return { seasonsPlayed: 0, titles: 0, invincibleSeasons: 0, bestPosition: null, worstPosition: null, totalPoints: 0, lastPosition: null }
  }
  const positions = seasons.map((s) => s.position)
  return {
    seasonsPlayed: seasons.length,
    titles: seasons.filter((s) => s.champion).length,
    invincibleSeasons: seasons.filter((s) => s.invincible).length,
    bestPosition: Math.min(...positions),
    worstPosition: Math.max(...positions),
    totalPoints: seasons.reduce((a, s) => a + s.points, 0),
    lastPosition: seasons[seasons.length - 1].position,
  }
}
```

- [ ] **Step 5: Vérifier le succès**

Run: `npx vitest run src/domain/career/career.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: career engine (start, play next season, summary)"
```

---

### Task 2: Persistance locale

**Files:**
- Create: `src/domain/career/storage.ts`
- Create: `src/domain/career/index.ts`
- Test: `src/domain/career/storage.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Create `src/domain/career/storage.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { saveCareer, loadCareer, clearCareer, StorageLike } from './storage'
import { startCareer } from './career'
import { PoolPlayer } from '../game'

function fakeStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

function team(): PoolPlayer[] {
  return [{ playerId: 'p0', playerName: 'A', clubName: 'User', season: '2018-19', competition: 'L1', positionGroup: 'GK', rating: 80, reliability: 4 }]
}

describe('career storage', () => {
  it('saves and loads a career round-trip', () => {
    const s = fakeStorage()
    const career = startCareer(team(), '4-3-3', 42, 'Mon XI')
    saveCareer(career, s)
    expect(loadCareer(s)).toEqual(career)
  })
  it('returns null when nothing is stored', () => {
    expect(loadCareer(fakeStorage())).toBeNull()
  })
  it('returns null on corrupted data', () => {
    const s = fakeStorage()
    s.setItem('onze-dor-career', '{not json')
    expect(loadCareer(s)).toBeNull()
  })
  it('clears a stored career', () => {
    const s = fakeStorage()
    saveCareer(startCareer(team(), '4-3-3', 42, 'Mon XI'), s)
    clearCareer(s)
    expect(loadCareer(s)).toBeNull()
  })
})
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/domain/career/storage.test.ts`
Expected: FAIL ("Cannot find module './storage'").

- [ ] **Step 3: Implémenter + barrel**

Create `src/domain/career/storage.ts`:
```ts
import { Career } from './types'

export interface StorageLike {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const KEY = 'onze-dor-career'

export function saveCareer(career: Career, storage: StorageLike): void {
  storage.setItem(KEY, JSON.stringify(career))
}

export function loadCareer(storage: StorageLike): Career | null {
  const raw = storage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Career
  } catch {
    return null
  }
}

export function clearCareer(storage: StorageLike): void {
  storage.removeItem(KEY)
}
```

Create `src/domain/career/index.ts`:
```ts
export * from './types'
export * from './career'
export * from './storage'
```

- [ ] **Step 4: Vérifier le succès + suite**

Run: `npx vitest run src/domain/career/storage.test.ts && npm test`
Expected: PASS (carrière + tous les tests existants).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: career localStorage persistence"
```

---

### Task 3: Entrée « Continuer en carrière » sur l'écran de fin

**Files:**
- Modify: `src/app/game/page.tsx` (dans `SeasonEnd`, ajouter le bouton qui crée la carrière et navigue)

- [ ] **Step 1: Ajouter le bouton**

Dans `src/app/game/page.tsx` :
- ajoute aux imports : `import { useRouter } from 'next/navigation'`, `import { startCareer, saveCareer } from '@/domain/career'`.
- dans le composant `SeasonEnd`, juste avant le `return (` du résumé (la branche affichée quand `showAnimation` est faux), ajoute :
```tsx
  const router = useRouter()
  const startCareerMode = () => {
    const career = startCareer(picked, /* formation */ '4-3-3', seed, 'Mon XI')
    saveCareer(career, window.localStorage)
    router.push('/career')
  }
```
> La formation n'est pas disponible dans `SeasonEnd` (seul `picked` l'est). Pour transmettre la vraie formation : ajoute une prop `formation: string` à `SeasonEnd` et au composant `Game` qui le rend (`Game` connaît `formation`). Passe `formation` de `Game` → `SeasonEnd`, et utilise-la dans `startCareer(picked, formation, seed, 'Mon XI')`. Adapte la signature de `SeasonEnd` en conséquence.
- dans le JSX du résumé, ajoute le bouton AVANT le bouton « Rejouer » :
```tsx
      <button className="btn btn-gold" onClick={startCareerMode} style={{ marginBottom: 8 }}>
        🏆 Continuer en carrière avec ce XI
      </button>
```

- [ ] **Step 2: Vérifier**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npx tsc --noEmit && npm run build`
Expected: tsc OK, build OK.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: start a career from the season end screen"
```

---

### Task 4: Page Carrière

**Files:**
- Create: `src/app/career/page.tsx`

- [ ] **Step 1: Implémenter la page**

Create `src/app/career/page.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { teamRating } from '@/domain/game'
import { Career, loadCareer, saveCareer, clearCareer, playNextSeason, careerSummary } from '@/domain/career'
import { Pitch } from '@/components/Pitch'

export default function CareerPage() {
  const [career, setCareer] = useState<Career | null | undefined>(undefined)

  useEffect(() => {
    setCareer(loadCareer(window.localStorage))
  }, [])

  if (career === undefined) {
    return <main className="wrap"><p className="subtitle">Chargement…</p></main>
  }
  if (career === null) {
    return (
      <main className="wrap">
        <h1 className="title" style={{ fontSize: 18 }}>Carrière</h1>
        <p className="subtitle">Aucune carrière en cours. Lance une partie et choisis « Continuer en carrière ».</p>
        <Link className="btn btn-gold" href="/">Nouvelle partie</Link>
      </main>
    )
  }

  const summary = careerSummary(career)

  const next = () => {
    const updated = playNextSeason(career)
    saveCareer(updated, window.localStorage)
    setCareer(updated)
  }
  const reset = () => {
    clearCareer(window.localStorage)
    setCareer(null)
  }

  return (
    <main className="wrap">
      <h1 className="title" style={{ fontSize: 18 }}>CARRIÈRE · {career.teamName.toUpperCase()}</h1>
      <p className="subtitle">Note d&apos;équipe {teamRating(career.team)} · {career.formation}</p>

      <div className="panel-gold" style={{ margin: '12px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13 }}>
          <span>Palmarès</span>
          <span className="txt-gold">{summary.titles} titre{summary.titles > 1 ? 's' : ''}</span>
        </div>
        <div className="muted" style={{ marginTop: 4 }}>
          {summary.seasonsPlayed} saison{summary.seasonsPlayed > 1 ? 's' : ''} · {summary.invincibleSeasons} invincible(s) ·
          {' '}meilleure place {summary.bestPosition ?? '—'} · {summary.totalPoints} pts cumulés
        </div>
      </div>

      <Pitch formation={[]} slots={career.team} selectedSlot={null} onSelectSlot={() => {}} />

      <div className="panel" style={{ margin: '12px 0' }}>
        <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>Historique</div>
        {career.seasons.length === 0 ? (
          <p className="muted">Aucune saison jouée. Lance ta première saison !</p>
        ) : (
          <table className="tbl">
            <thead>
              <tr><th>S</th><th style={{ textAlign: 'center' }}>Place</th><th style={{ textAlign: 'center' }}>Pts</th><th style={{ textAlign: 'center' }}>Bilan</th><th></th></tr>
            </thead>
            <tbody>
              {career.seasons.map((s) => (
                <tr key={s.season}>
                  <td>{s.season}</td>
                  <td className={s.position === 1 ? 'txt-green' : ''} style={{ textAlign: 'center', fontWeight: s.position === 1 ? 800 : 400 }}>{s.position}e</td>
                  <td style={{ textAlign: 'center' }}>{s.points}</td>
                  <td style={{ textAlign: 'center' }} className="muted">{s.won}-{s.drawn}-{s.lost}</td>
                  <td className="txt-gold" style={{ textAlign: 'right' }}>{s.invincible ? 'Invincible' : s.champion ? 'Champion' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button className="btn btn-gold" onClick={next} style={{ marginBottom: 8 }}>▶ Jouer la saison suivante</button>
      <button className="btn" onClick={reset} style={{ marginBottom: 8 }}>Nouvelle carrière</button>
      <Link className="btn" href="/">Accueil</Link>
    </main>
  )
}
```
> Note : `Pitch` accepte `formation` pour disposer les slots ; ici on passe `formation: []` et `slots: career.team` — il faut que `Pitch` se base sur la longueur de `slots` quand `formation` est vide, OU on reconstruit la formation. **Plus simple et correct :** passe la vraie formation. Reconstruis-la via `formationSlots(career.formation)` importé de `@/domain/game` : `import { teamRating, formationSlots } from '@/domain/game'` puis `<Pitch formation={formationSlots(career.formation)} slots={career.team} ... />`. Remplace le `formation={[]}` par ça.

- [ ] **Step 2: Vérifier**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npx tsc --noEmit && npm run build`
Expected: tsc OK, build OK ; route `/career` présente.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: career screen (XI, season history, palmares, play next)"
```

---

### Task 5: Lien d'accès + vérification finale

**Files:**
- Modify: `src/app/page.tsx` (ajouter un lien discret « Reprendre ma carrière »)

- [ ] **Step 1: Lien depuis l'accueil**

Dans `src/app/page.tsx`, ajoute juste après le bouton « NOUVELLE PARTIE » (avant la fermeture de `<main>`) :
```tsx
      <Link className="btn" href="/career" style={{ marginTop: 8 }}>🏆 Ma carrière</Link>
```
et ajoute l'import en tête : `import Link from 'next/link'`.

- [ ] **Step 2: Vérification finale complète**

Run: `npm test && npm run lint && npm run build && npx tsc --noEmit`
Expected: tous les tests PASS, lint OK, build OK (routes `/`, `/game`, `/career`, `/api/pool`, `/manifest.webmanifest`), tsc OK.

- [ ] **Step 3: Smoke runtime**

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && (PORT=3202 npm run start >/tmp/onze10.log 2>&1 &) && sleep 6 && curl -s -o /dev/null -w "home=%{http_code} " "http://localhost:3202/" && curl -s -o /dev/null -w "career=%{http_code}\n" "http://localhost:3202/career" && pkill -f "next start"; pkill -f "next-server"
```
Expected : `home=200`, `career=200`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: career entry link on home + final checks"
```

---

## Couverture du spec (auto-revue §6)

- Carrière multi-saisons (garder son XI, enchaîner les saisons) → Tasks 1 (`playNextSeason`), 3-4 (UI).
- Historique + palmarès (titres, invincibles, meilleure place, points) → Tasks 1 (`careerSummary`), 4 (affichage).
- Persistance (survit au rechargement) → Task 2 (localStorage), 4 (load/save).
- Accès → Tasks 3 (depuis la fin de partie) + 5 (depuis l'accueil).

**Hors de ce plan (itérations futures) :** recrutement entre saisons, vieillissement/évolution des notes des joueurs, montée/descente, et le côté social (défi du jour, classement communautaire) qui exige un backend. La carrière v1 rejoue le même XI ; les résultats varient via une seed par saison.
```
