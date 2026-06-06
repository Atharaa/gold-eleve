# Onze d'Or — Plan 5 : UI jouable

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le jeu jouable de bout en bout dans le navigateur : accueil (choix du mode) → draft (cartes candidates, progression) → fin (note d'équipe, classement, buteurs/passeurs/gardiens, invincibilité), dans la direction visuelle gaming/dorée, installable en PWA.

**Architecture:** Next.js App Router. Un thème CSS sombre/doré (classes sémantiques dans `globals.css`). Des composants présentiels purs sous `src/components/`. Deux pages client : `/` (toggle de mode + lancement) et `/game` (récupère `/api/pool`, pilote le draft via `useReducer(draftReducer)` de Plan 4, puis affiche la fin via `simulateFromPicks`). Le code app utilise l'alias `@/` (configuré par create-next-app). Manifest PWA.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, CSS. **Node ≥ 20.9** (`nvm use 20`). Réutilise `src/domain/game` et `src/domain/play` (Plans 3 & 4).

**Vérification :** ces tâches n'ont pas de tests unitaires (UI présentielle). Chaque tâche est vérifiée par `npm run build && npx tsc --noEmit && npm run lint`. La vérification interactive/visuelle se fait via `npm run dev` dans le navigateur (étape utilisateur).

**Référence spec:** `docs/superpowers/specs/2026-06-06-onze-dor-design.md` (§4 boucle, maquettes direction A). **Hors de ce plan :** profondeur (carrière, défi du jour, objectifs, collection), admin notes, scraping.

---

### Task 1: Thème sombre/doré + métadonnées

**Files:**
- Modify: `src/app/globals.css` (remplacer le contenu en conservant l'import Tailwind)
- Modify: `src/app/layout.tsx` (métadonnées + viewport)

- [ ] **Step 1: Remplacer le thème global**

Remplace tout le contenu de `src/app/globals.css` par (la première ligne doit rester l'import Tailwind présent dans le projet) :
```css
@import "tailwindcss";

:root {
  --gold: #f5c451;
  --bg: #0b1020;
  --panel: #101830;
  --panel-2: #1c2747;
  --line: rgba(255, 255, 255, 0.09);
  --muted: #9aa3b8;
  --green: #6ee7a0;
  --red: #f87171;
  --amber: #fbbf24;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--bg);
  color: #fff;
  font-family: system-ui, -apple-system, sans-serif;
}

.wrap { max-width: 540px; margin: 0 auto; padding: 16px 16px 48px; }
.title { text-align: center; font-weight: 900; letter-spacing: 2px; color: var(--gold); font-size: 24px; margin: 8px 0 2px; }
.subtitle { text-align: center; color: var(--muted); font-size: 12px; margin: 2px 0; }
.muted { color: var(--muted); font-size: 11px; }

.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 12px; padding: 12px; }
.panel-gold { background: linear-gradient(160deg, var(--panel-2), var(--panel)); border: 1px solid rgba(245, 196, 81, 0.33); border-radius: 12px; padding: 12px; }

.btn { display: block; width: 100%; text-align: center; padding: 14px; border-radius: 11px; font-weight: 800; border: 1px solid var(--line); background: var(--panel); color: #fff; cursor: pointer; font-size: 15px; text-decoration: none; }
.btn-gold { background: var(--gold); color: var(--bg); border: none; }

.toggle { display: flex; background: var(--panel-2); border-radius: 10px; padding: 4px; }
.toggle button { flex: 1; padding: 8px; border: none; border-radius: 7px; background: transparent; color: var(--muted); font-weight: 700; cursor: pointer; font-size: 13px; }
.toggle button.active { background: var(--gold); color: var(--bg); font-weight: 800; }

.card { display: flex; justify-content: space-between; align-items: center; width: 100%; text-align: left; cursor: pointer; margin-bottom: 8px; }
.rating { font-size: 26px; font-weight: 900; color: var(--gold); line-height: 1; }

table.tbl { width: 100%; border-collapse: collapse; font-size: 12px; }
table.tbl th { color: var(--muted); font-size: 9px; text-align: left; padding: 2px; }
table.tbl td { padding: 5px 2px; border-top: 1px solid var(--line); }
.row-user { background: rgba(245, 196, 81, 0.13); }

.txt-gold { color: var(--gold); }
.txt-green { color: var(--green); }
.txt-red { color: var(--red); }
.txt-amber { color: var(--amber); }
```

- [ ] **Step 2: Métadonnées + couleur de thème**

Dans `src/app/layout.tsx`, remplace l'export `metadata` existant par :
```ts
export const metadata = {
  title: "Onze d'Or",
  description: "Compose ton onze de rêve de Ligue 1 & Ligue 2 et simule ta saison.",
}

export const viewport = {
  themeColor: '#0b1020',
}
```
(Conserve le reste du fichier — l'import de `globals.css`, le composant `RootLayout` et les éventuelles polices. Si une police rend le fond clair, ne touche pas à la structure, le thème CSS gère déjà les couleurs.)

- [ ] **Step 3: Vérifier**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npm run build && npx tsc --noEmit`
Expected: build OK, tsc OK.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: dark/gold theme and app metadata"
```

---

### Task 2: Composants de draft

**Files:**
- Create: `src/components/ReliabilityDots.tsx`
- Create: `src/components/PlayerCard.tsx`
- Create: `src/components/ModeToggle.tsx`
- Create: `src/components/FormationProgress.tsx`

- [ ] **Step 1: ReliabilityDots**

Create `src/components/ReliabilityDots.tsx`:
```tsx
export function ReliabilityDots({ level }: { level: 1 | 2 | 3 | 4 }) {
  const label = level >= 3 ? 'fiable' : 'estimée'
  const cls = level >= 3 ? 'txt-green' : 'txt-amber'
  return (
    <span className={cls} style={{ fontSize: 9 }}>
      {'●'.repeat(level)}
      {'○'.repeat(4 - level)} {label}
    </span>
  )
}
```

- [ ] **Step 2: PlayerCard**

Create `src/components/PlayerCard.tsx`:
```tsx
import { PoolPlayer } from '@/domain/game'
import { ReliabilityDots } from './ReliabilityDots'

export function PlayerCard({ player, onPick }: { player: PoolPlayer; onPick?: () => void }) {
  const content = (
    <>
      <div>
        <div style={{ fontWeight: 800, fontSize: 14 }}>{player.playerName}</div>
        <div className="muted">
          {player.clubName} · {player.season}
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div className="rating">{player.rating}</div>
        <ReliabilityDots level={player.reliability} />
      </div>
    </>
  )
  if (onPick) {
    return (
      <button className="panel-gold card" onClick={onPick}>
        {content}
      </button>
    )
  }
  return <div className="panel card" style={{ cursor: 'default' }}>{content}</div>
}
```

- [ ] **Step 3: ModeToggle**

Create `src/components/ModeToggle.tsx`:
```tsx
'use client'

export type Mode = 'prime' | 'season'

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="toggle">
      <button className={mode === 'prime' ? 'active' : ''} onClick={() => onChange('prime')}>
        PRIME
      </button>
      <button className={mode === 'season' ? 'active' : ''} onClick={() => onChange('season')}>
        SAISON
      </button>
    </div>
  )
}
```

- [ ] **Step 4: FormationProgress**

Create `src/components/FormationProgress.tsx`:
```tsx
import { PositionGroup } from '@/domain/ratings'

const LABELS: Record<PositionGroup, string> = { GK: 'Gardien', DEF: 'Défenseur', MID: 'Milieu', ATT: 'Attaquant' }

export function FormationProgress({ total, done, group }: { total: number; done: number; group: PositionGroup | null }) {
  return (
    <div>
      <div className="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Joueur {Math.min(done + 1, total)} / {total}
        {group ? ` — ${LABELS[group]}` : ''}
      </div>
      <div style={{ display: 'flex', gap: 3, marginTop: 5 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{ flex: 1, height: 5, borderRadius: 3, background: i < done ? 'var(--gold)' : 'var(--panel-2)' }}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Vérifier**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npx tsc --noEmit && npm run build`
Expected: tsc OK, build OK.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: draft UI components (player card, mode toggle, progress, reliability)"
```

---

### Task 3: Composants de résultats

**Files:**
- Create: `src/components/StandingsTable.tsx`
- Create: `src/components/RankingList.tsx`

- [ ] **Step 1: StandingsTable**

Create `src/components/StandingsTable.tsx`:
```tsx
import { TableRow } from '@/domain/game'

export function StandingsTable({ table }: { table: TableRow[] }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th>#</th>
          <th>Équipe</th>
          <th style={{ textAlign: 'center' }}>J</th>
          <th style={{ textAlign: 'center' }}>Diff</th>
          <th style={{ textAlign: 'center' }}>Pts</th>
        </tr>
      </thead>
      <tbody>
        {table.map((r) => {
          const position = r.position ?? 0
          const isReleg = position > table.length - 2
          const diff = r.gf - r.ga
          const posClass = position === 1 ? 'txt-green' : isReleg ? 'txt-red' : ''
          return (
            <tr key={r.name} className={r.isUser ? 'row-user' : ''}>
              <td className={posClass}>{position}</td>
              <td className={r.isUser ? 'txt-gold' : ''} style={{ fontWeight: r.isUser ? 800 : 400 }}>
                {r.isUser ? '★ ' : ''}
                {r.name}
              </td>
              <td style={{ textAlign: 'center' }}>{r.played}</td>
              <td style={{ textAlign: 'center' }}>
                {diff > 0 ? '+' : ''}
                {diff}
              </td>
              <td style={{ textAlign: 'center', fontWeight: 800 }}>{r.points}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 2: RankingList**

Create `src/components/RankingList.tsx`:
```tsx
import { RankRow } from '@/domain/game'

export function RankingList({ title, rows, unit }: { title: string; rows: RankRow[]; unit: string }) {
  return (
    <div className="panel" style={{ marginBottom: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>{title}</div>
      {rows.map((r, i) => (
        <div
          key={`${r.playerName}-${i}`}
          className={r.isUser ? 'txt-gold' : ''}
          style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}
        >
          <span>
            {i + 1}. {r.isUser ? '★ ' : ''}
            {r.playerName} <span className="muted">{r.club}</span>
          </span>
          <span style={{ fontWeight: 800 }}>
            {r.value} {unit}
          </span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Vérifier**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npx tsc --noEmit && npm run build`
Expected: tsc OK, build OK.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: results UI components (standings table, ranking list)"
```

---

### Task 4: Page d'accueil

**Files:**
- Modify: `src/app/page.tsx` (remplacer entièrement le contenu par défaut)

- [ ] **Step 1: Implémenter l'accueil**

Remplace tout le contenu de `src/app/page.tsx` par :
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModeToggle, Mode } from '@/components/ModeToggle'

export default function Home() {
  const [mode, setMode] = useState<Mode>('prime')
  const router = useRouter()

  return (
    <main className="wrap">
      <h1 className="title">ONZE D&apos;OR</h1>
      <p className="subtitle">2000 – 2026 · Ligue 1 &amp; Ligue 2</p>

      <div style={{ margin: '18px 0 6px' }}>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>
      <p className="subtitle" style={{ marginBottom: 18 }}>
        {mode === 'prime' ? 'Prime = meilleure saison de chaque joueur' : 'Saison = note de la saison de la carte'}
      </p>

      <button className="btn btn-gold" onClick={() => router.push(`/game?mode=${mode}`)}>
        ▶ NOUVELLE PARTIE
      </button>
    </main>
  )
}
```

- [ ] **Step 2: Vérifier**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npx tsc --noEmit && npm run build`
Expected: tsc OK, build OK.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: home screen with Prime/Saison mode toggle"
```

---

### Task 5: Page de jeu (draft + fin)

**Files:**
- Create: `src/app/game/page.tsx`

- [ ] **Step 1: Implémenter la page de jeu**

Create `src/app/game/page.tsx`:
```tsx
'use client'

import { Suspense, useEffect, useMemo, useReducer, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PoolPlayer, teamRating } from '@/domain/game'
import { initDraft, draftReducer, currentGroup, simulateFromPicks } from '@/domain/play'
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

  return <Game key={round} pool={pool} seed={baseSeed + round} onReplay={() => setRound((r) => r + 1)} />
}

function Game({ pool, seed, onReplay }: { pool: PoolPlayer[]; seed: number; onReplay: () => void }) {
  const [state, dispatch] = useReducer(draftReducer, undefined, () => initDraft(pool, FORMATION, seed))

  if (state.phase === 'drafting') {
    return (
      <main className="wrap">
        <h1 className="title" style={{ fontSize: 18 }}>
          ONZE D&apos;OR
        </h1>
        <div style={{ margin: '12px 0' }}>
          <FormationProgress total={state.formation.length} done={state.picked.length} group={currentGroup(state)} />
        </div>
        {state.candidates.length === 0 ? (
          <p className="subtitle">Plus de candidats disponibles pour ce poste.</p>
        ) : (
          state.candidates.map((c) => (
            <PlayerCard key={c.playerId} player={c} onPick={() => dispatch({ type: 'PICK', player: c })} />
          ))
        )}
      </main>
    )
  }

  return <End picked={state.picked} seed={seed} onReplay={onReplay} />
}

function End({ picked, seed, onReplay }: { picked: PoolPlayer[]; seed: number; onReplay: () => void }) {
  const result = useMemo(() => simulateFromPicks(picked, { seed, teamName: 'Mon XI' }), [picked, seed])
  const rating = teamRating(picked)
  const u = result.userRow

  return (
    <main className="wrap">
      <p className="subtitle">TON ONZE D&apos;OR</p>
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

      <div className="panel" style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>Classement</div>
        <StandingsTable table={result.table} />
      </div>

      <RankingList title="Meilleurs buteurs" rows={result.scorers} unit="buts" />
      <RankingList title="Meilleurs passeurs" rows={result.assisters} unit="passes" />
      <RankingList title="Meilleurs gardiens" rows={result.keepers} unit="clean sheets" />

      <div className="panel" style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 12 }}>Meilleure note du championnat</div>
        <div className={result.bestRated.isUser ? 'txt-gold' : ''} style={{ fontSize: 12, marginTop: 4 }}>
          {result.bestRated.isUser ? '★ ' : ''}
          {result.bestRated.playerName} <span className="muted">{result.bestRated.club}</span> — {result.bestRated.value}
        </div>
      </div>

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

- [ ] **Step 2: Vérifier**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npx tsc --noEmit && npm run build`
Expected: tsc OK, build OK ; la route `/game` apparaît dans la sortie de build.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: game screen (draft flow then season result)"
```

---

### Task 6: Manifest PWA + vérification finale

**Files:**
- Create: `src/app/manifest.ts`

- [ ] **Step 1: Manifest**

Create `src/app/manifest.ts`:
```ts
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Onze d'Or",
    short_name: "Onze d'Or",
    description: 'Compose ton onze de rêve de Ligue 1 & Ligue 2 et simule ta saison.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0b1020',
    theme_color: '#0b1020',
    icons: [],
  }
}
```

> Icônes laissées vides pour l'instant (ajout ultérieur de `icon.png`/`apple-icon.png` pour l'installabilité complète). L'app reste utilisable et le manifest valide.

- [ ] **Step 2: Vérification finale complète**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npm test && npm run lint && npm run build && npx tsc --noEmit`
Expected: tous les tests existants PASS (la logique des Plans 1-4, inchangée), lint OK, build OK avec les routes `/`, `/game`, `/api/pool` et `/manifest.webmanifest`, tsc OK.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: PWA manifest"
```

---

## Couverture du spec (auto-revue)

- §4 accueil + choix Prime/Saison → Task 4 (`ModeToggle`).
- §4 draft par poste avec cartes candidates + progression → Tasks 2, 5.
- §4/§5 écran de fin : note d'équipe, classement championnat (équipe surlignée), buteurs/passeurs/gardiens, meilleure note, invincibilité → Tasks 3, 5.
- §2.3 indicateur de fiabilité affiché sur chaque carte → Task 2 (`ReliabilityDots`).
- PWA installable → Tasks 1 (theme-color) + 6 (manifest).
- Jouable mobile + desktop → layout `.wrap` responsive (max-width centré), repli pool d'exemple (Plan 4) → `npm run dev` jouable.

**Vérification interactive (étape utilisateur) :** `npm run dev` puis ouvrir `http://localhost:3000` — choisir un mode, drafter 11 joueurs, voir la simulation. **Hors de ce plan :** profondeur (carrière, défi du jour, objectifs, collection), back-office admin, scraping des sources, icônes PWA, choix de la formation (fixée à 4-3-3 ici).
```
