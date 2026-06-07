# Onze d'Or — Plan 9 : UI v2 (formation, draft par effectif, saison animée)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brancher l'UI sur le moteur v2 : choix de la formation à l'accueil, écran de draft « une équipe par pick » (terrain cliquable, effectif tiré, reroll, verrou de poste), et déroulé de saison **animé journée par journée avec classement en direct**, puis retirer l'ancien draft.

**Architecture:** L'accueil ajoute un `FormationPicker` et passe `formation` à `/game`. La page `/game` utilise `squadDraftReducer` (Plan 7) : un `Pitch` affiche les slots de la formation (cliquables) ; un `SquadPanel` affiche l'effectif tiré avec reroll et n'active que les joueurs éligibles au slot sélectionné. Une fois l'XI complet, `simulateFromPicks` (avec `matchdays`, Plan 8) alimente un `SeasonAnimation` qui défile les journées via `standingsAfter`, avant d'afficher le résumé (classement, buteurs/passeurs/gardiens, objectifs/score). L'ancien `draftReducer` (Plan 4) est supprimé.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS. **Node ≥ 20.9** (`nvm use 20`). Réutilise `src/domain/{game,play,challenges}`.

**Vérification :** pas de tests unitaires UI ; chaque tâche vérifiée par `npm run build && npx tsc --noEmit && npm run lint`, + smoke runtime en fin. Essai interactif/visuel = `npm run dev` (étape utilisateur).

**Référence spec:** §4, §5, §12 (addendum v2). **Hors de ce plan :** scraping, admin, autres piliers de profondeur.

---

### Task 1: FormationPicker + accueil v2

**Files:**
- Create: `src/components/FormationPicker.tsx`
- Modify: `src/app/page.tsx` (ajouter le choix de formation + passer `formation`)

- [ ] **Step 1: Composant**

Create `src/components/FormationPicker.tsx`:
```tsx
'use client'

import { FORMATION_NAMES } from '@/domain/game'

export function FormationPicker({ value, onChange }: { value: string; onChange: (f: string) => void }) {
  return (
    <div className="toggle" style={{ flexWrap: 'wrap', gap: 4 }}>
      {FORMATION_NAMES.map((name) => (
        <button key={name} className={value === name ? 'active' : ''} onClick={() => onChange(name)}>
          {name}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Accueil**

Remplace tout le contenu de `src/app/page.tsx` par :
```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModeToggle, Mode } from '@/components/ModeToggle'
import { ChallengePicker } from '@/components/ChallengePicker'
import { FormationPicker } from '@/components/FormationPicker'

export default function Home() {
  const [mode, setMode] = useState<Mode>('prime')
  const [challenge, setChallenge] = useState('libre')
  const [formation, setFormation] = useState('4-3-3')
  const router = useRouter()

  return (
    <main className="wrap">
      <h1 className="title">ONZE D&apos;OR</h1>
      <p className="subtitle">2000 – 2026 · Ligue 1 &amp; Ligue 2</p>

      <div style={{ margin: '18px 0 6px' }}>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>
      <p className="subtitle" style={{ marginBottom: 14 }}>
        {mode === 'prime' ? 'Prime = meilleure saison de chaque joueur' : 'Saison = note de la saison de la carte'}
      </p>

      <div className="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        Formation
      </div>
      <div style={{ marginBottom: 14 }}>
        <FormationPicker value={formation} onChange={setFormation} />
      </div>

      <div className="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Choisis ton défi
      </div>
      <ChallengePicker value={challenge} onChange={setChallenge} />

      <button
        className="btn btn-gold"
        style={{ marginTop: 8 }}
        onClick={() => router.push(`/game?mode=${mode}&challenge=${challenge}&formation=${formation}`)}
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
git commit -m "feat: formation picker on the home screen (v2)"
```

---

### Task 2: Composants Pitch + SquadPanel

**Files:**
- Create: `src/components/Pitch.tsx`
- Create: `src/components/SquadPanel.tsx`

- [ ] **Step 1: Pitch (terrain cliquable)**

Create `src/components/Pitch.tsx`:
```tsx
import { PoolPlayer } from '@/domain/game'
import { PositionGroup } from '@/domain/ratings'

const LABELS: Record<PositionGroup, string> = { GK: 'G', DEF: 'DEF', MID: 'MIL', ATT: 'ATT' }

function surname(name: string): string {
  const parts = name.split(' ')
  return parts[parts.length - 1]
}

function buildLines(formation: PositionGroup[]): { group: PositionGroup; indices: number[] }[] {
  const lines: { group: PositionGroup; indices: number[] }[] = []
  formation.forEach((group, i) => {
    const last = lines[lines.length - 1]
    if (last && last.group === group) last.indices.push(i)
    else lines.push({ group, indices: [i] })
  })
  return lines
}

export function Pitch({
  formation,
  slots,
  selectedSlot,
  onSelectSlot,
}: {
  formation: PositionGroup[]
  slots: (PoolPlayer | null)[]
  selectedSlot: number | null
  onSelectSlot: (index: number) => void
}) {
  // attaque en haut : on inverse l'ordre des lignes
  const lines = buildLines(formation).reverse()
  return (
    <div
      style={{
        background: 'linear-gradient(180deg,#0e1a12,#0b140d)',
        border: '1px solid var(--line)',
        borderRadius: 12,
        padding: '14px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {line.indices.map((index) => {
            const player = slots[index]
            const selected = selectedSlot === index
            return (
              <button
                key={index}
                onClick={() => onSelectSlot(index)}
                style={{
                  width: 64,
                  minHeight: 52,
                  borderRadius: 9,
                  border: selected ? '2px solid var(--gold)' : '1px solid var(--line)',
                  background: player ? 'var(--panel-2)' : 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  cursor: 'pointer',
                  padding: 4,
                  fontSize: 10,
                }}
              >
                {player ? (
                  <>
                    <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--gold)' }}>{player.rating}</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{surname(player.playerName)}</div>
                  </>
                ) : (
                  <>
                    <div className="muted" style={{ fontWeight: 800 }}>{LABELS[line.group]}</div>
                    <div className="muted" style={{ fontSize: 16 }}>+</div>
                  </>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: SquadPanel (effectif tiré)**

Create `src/components/SquadPanel.tsx`:
```tsx
import { PoolPlayer } from '@/domain/game'
import { ReliabilityDots } from './ReliabilityDots'

export function SquadPanel({
  club,
  season,
  players,
  pickableIds,
  rerollsLeft,
  onReroll,
  onPick,
}: {
  club: string
  season: string
  players: PoolPlayer[]
  pickableIds: Set<string>
  rerollsLeft: number
  onReroll: () => void
  onPick: (player: PoolPlayer) => void
}) {
  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>
          {club} <span className="muted">{season}</span>
        </div>
        <button
          className="btn"
          style={{ width: 'auto', padding: '6px 12px', fontSize: 12, opacity: rerollsLeft > 0 ? 1 : 0.4 }}
          onClick={onReroll}
          disabled={rerollsLeft <= 0}
        >
          ↻ Reroll ({rerollsLeft})
        </button>
      </div>
      {players.map((player) => {
        const pickable = pickableIds.has(player.playerId)
        return (
          <button
            key={player.playerId}
            onClick={() => onPick(player)}
            disabled={!pickable}
            className="card"
            style={{
              padding: '8px 10px',
              borderRadius: 9,
              border: '1px solid var(--line)',
              background: pickable ? 'var(--panel-2)' : 'transparent',
              color: '#fff',
              opacity: pickable ? 1 : 0.35,
              cursor: pickable ? 'pointer' : 'default',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{player.playerName}</div>
              <div className="muted">{player.eligiblePositions?.join(' / ') ?? player.positionGroup}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="rating" style={{ fontSize: 20 }}>{player.rating}</div>
              <ReliabilityDots level={player.reliability} />
            </div>
          </button>
        )
      })}
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
git commit -m "feat: clickable pitch and drawn-squad panel components"
```

---

### Task 3: SeasonAnimation (défilement + classement en direct)

**Files:**
- Create: `src/components/SeasonAnimation.tsx`

- [ ] **Step 1: Composant**

Create `src/components/SeasonAnimation.tsx`:
```tsx
'use client'

import { useEffect, useState } from 'react'
import { SeasonResult, standingsAfter } from '@/domain/game'
import { StandingsTable } from './StandingsTable'

export function SeasonAnimation({ result, onFinish }: { result: SeasonResult; onFinish: () => void }) {
  const totalRounds = result.matchdays.length
  const teams = result.table.map((r) => ({ name: r.name, strength: 0, isUser: r.isUser }))
  const [round, setRound] = useState(0)

  useEffect(() => {
    if (round >= totalRounds) return
    const id = setTimeout(() => setRound((r) => r + 1), 550)
    return () => clearTimeout(id)
  }, [round, totalRounds])

  const table = standingsAfter(result.matchdays, teams, round)
  const current = result.matchdays.find((m) => m.round === round)
  const done = round >= totalRounds

  return (
    <main className="wrap">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 800 }}>Journée {Math.min(round, totalRounds)} / {totalRounds}</div>
        {!done ? (
          <button className="btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 12 }} onClick={() => setRound(totalRounds)}>
            Passer ⏭
          </button>
        ) : (
          <button className="btn btn-gold" style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }} onClick={onFinish}>
            Voir le résumé →
          </button>
        )}
      </div>

      {current && (
        <div className="panel" style={{ marginBottom: 10 }}>
          {current.matches.map((m, i) => {
            const userMatch = teams.find((t) => (t.name === m.home || t.name === m.away) && t.isUser)
            return (
              <div
                key={i}
                className={userMatch ? 'txt-gold' : ''}
                style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '2px 0' }}
              >
                <span>{m.home}</span>
                <span style={{ fontWeight: 800 }}>{m.homeGoals} - {m.awayGoals}</span>
                <span style={{ textAlign: 'right', flex: 1 }}>{m.away}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="panel">
        <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>Classement en direct</div>
        <StandingsTable table={table} />
      </div>
    </main>
  )
}
```

> Le composant s'arrête à `totalRounds` et affiche alors « Voir le résumé ». `standingsAfter` recalcule le classement à chaque journée (peu coûteux pour ~18 équipes).

- [ ] **Step 2: Vérifier**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npx tsc --noEmit && npm run build`
Expected: tsc OK, build OK.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: animated season playback with live standings"
```

---

### Task 4: Page de jeu v2 (draft par effectif → saison animée → résumé)

**Files:**
- Modify: `src/app/game/page.tsx` (réécriture complète sur le moteur v2)

- [ ] **Step 1: Réécrire la page de jeu**

Remplace tout le contenu de `src/app/game/page.tsx` par :
```tsx
'use client'

import { Suspense, useMemo, useReducer, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { PoolPlayer, teamRating, FORMATION_NAMES } from '@/domain/game'
import { initSquadDraft, squadDraftReducer, eligibleSlots, pickedPlayers, simulateFromPicks } from '@/domain/play'
import { getChallenge, evaluateChallenge, Challenge } from '@/domain/challenges'
import { Pitch } from '@/components/Pitch'
import { SquadPanel } from '@/components/SquadPanel'
import { SeasonAnimation } from '@/components/SeasonAnimation'
import { StandingsTable } from '@/components/StandingsTable'
import { RankingList } from '@/components/RankingList'

function Loading() {
  return <main className="wrap"><p className="subtitle">Chargement…</p></main>
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
  const formationParam = params.get('formation') ?? '4-3-3'
  const formation = FORMATION_NAMES.includes(formationParam) ? formationParam : '4-3-3'

  const [pool, setPool] = useState<PoolPlayer[] | null>(null)
  const [round, setRound] = useState(0)
  const [baseSeed] = useState(() => Date.now() % 1_000_000)

  useEffect(() => {
    let active = true
    fetch(`/api/pool?mode=${mode}`)
      .then((r) => r.json())
      .then((data: PoolPlayer[]) => active && setPool(data))
      .catch(() => active && setPool([]))
    return () => {
      active = false
    }
  }, [mode])

  if (!pool) return <Loading />
  if (pool.length === 0) {
    return (
      <main className="wrap">
        <p className="subtitle">Aucun joueur disponible.</p>
        <Link className="btn" href="/">Retour</Link>
      </main>
    )
  }

  return (
    <Game
      key={round}
      pool={pool}
      formation={formation}
      challenge={challenge}
      seed={baseSeed + round}
      onReplay={() => setRound((r) => r + 1)}
    />
  )
}

function Game({ pool, formation, challenge, seed, onReplay }: { pool: PoolPlayer[]; formation: string; challenge: Challenge; seed: number; onReplay: () => void }) {
  const [state, dispatch] = useReducer(squadDraftReducer, undefined, () =>
    initSquadDraft(pool, formation, seed, { constraints: challenge.constraints }),
  )
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)

  if (state.phase !== 'done') {
    const pickableIds = new Set(
      state.currentSquad.players
        .filter((p) => {
          const slots = eligibleSlots(state, p)
          return selectedSlot === null ? slots.length > 0 : slots.includes(selectedSlot)
        })
        .map((p) => p.playerId),
    )

    const onPick = (player: PoolPlayer) => {
      const slots = eligibleSlots(state, player)
      const target = selectedSlot !== null && slots.includes(selectedSlot) ? selectedSlot : slots[0]
      if (target === undefined) return
      dispatch({ type: 'PICK', slotIndex: target, player })
      setSelectedSlot(null)
    }

    return (
      <main className="wrap">
        <h1 className="title" style={{ fontSize: 18 }}>ONZE D&apos;OR</h1>
        <p className="subtitle txt-gold" style={{ fontWeight: 700 }}>{challenge.name} · {formation}</p>
        <p className="subtitle" style={{ marginBottom: 10 }}>
          {pickedPlayers(state).length} / {state.formation.length} joueurs ·{' '}
          {selectedSlot === null ? 'choisis un poste ou un joueur' : 'choisis un joueur pour ce poste'}
        </p>

        <Pitch formation={state.formation} slots={state.slots} selectedSlot={selectedSlot} onSelectSlot={(i) => setSelectedSlot((s) => (s === i ? null : i))} />

        <SquadPanel
          club={state.currentSquad.club}
          season={state.currentSquad.season}
          players={state.currentSquad.players}
          pickableIds={pickableIds}
          rerollsLeft={state.rerollsLeft}
          onReroll={() => dispatch({ type: 'REROLL' })}
          onPick={onPick}
        />

        <Link className="btn" href="/" style={{ marginTop: 10 }}>Abandonner</Link>
      </main>
    )
  }

  return <SeasonEnd picked={pickedPlayers(state)} challenge={challenge} seed={seed} onReplay={onReplay} />
}

function SeasonEnd({ picked, challenge, seed, onReplay }: { picked: PoolPlayer[]; challenge: Challenge; seed: number; onReplay: () => void }) {
  const result = useMemo(() => simulateFromPicks(picked, { seed, teamName: 'Mon XI' }), [picked, seed])
  const rating = teamRating(picked)
  const evaluation = useMemo(() => evaluateChallenge(challenge, { picked, result, teamRating: rating }), [challenge, picked, result, rating])
  const [showAnimation, setShowAnimation] = useState(true)
  const u = result.userRow

  if (showAnimation) {
    return <SeasonAnimation result={result} onFinish={() => setShowAnimation(false)} />
  }

  return (
    <main className="wrap">
      <p className="subtitle">TON ONZE D&apos;OR · {challenge.name.toUpperCase()}</p>
      <div style={{ textAlign: 'center', margin: '6px 0 12px' }}>
        <div className="rating" style={{ fontSize: 42 }}>{rating}</div>
        <div className="muted">note moyenne de l&apos;équipe</div>
      </div>

      <div className={result.invincible ? 'panel-gold' : 'panel'} style={{ textAlign: 'center', marginBottom: 12 }}>
        {result.invincible ? (
          <div className="txt-green" style={{ fontWeight: 900 }}>SAISON INVINCIBLE 🏆</div>
        ) : (
          <div style={{ fontWeight: 800 }}>{u.position}e de Ligue 1</div>
        )}
        <div className="muted">{u.won} V · {u.drawn} N · {u.lost} D · {u.gf} buts</div>
      </div>

      <div className="panel-gold" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13 }}>
          <span>Objectifs</span>
          <span className="txt-gold">{evaluation.totalPoints} / {evaluation.maxPoints} pts</span>
        </div>
        {evaluation.objectives.map((o) => (
          <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
            <span className={o.completed ? 'txt-green' : 'muted'}>{o.completed ? '✓ ' : '○ '}{o.label}</span>
            <span className={o.completed ? 'txt-gold' : 'muted'} style={{ fontWeight: 700 }}>+{o.points}</span>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>Classement final</div>
        <StandingsTable table={result.table} />
      </div>

      <RankingList title="Meilleurs buteurs" rows={result.scorers} unit="buts" />
      <RankingList title="Meilleurs passeurs" rows={result.assisters} unit="passes" />
      <RankingList title="Meilleurs gardiens" rows={result.keepers} unit="clean sheets" />

      <button className="btn btn-gold" onClick={onReplay} style={{ marginBottom: 8 }}>↻ Rejouer</button>
      <Link className="btn" href="/">Accueil</Link>
    </main>
  )
}
```

- [ ] **Step 2: Vérifier**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && npx tsc --noEmit && npm run build`
Expected: tsc OK, build OK ; route `/game` présente.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: v2 game screen (squad draft on a pitch, animated season, summary)"
```

---

### Task 5: Retrait de l'ancien draft + vérification finale

**Files:**
- Delete: `src/domain/play/draftReducer.ts`, `src/domain/play/draftReducer.test.ts`, `src/domain/play/integration.test.ts`
- Modify: `src/domain/play/index.ts` (retirer l'export de `./draftReducer`)
- Delete (si plus utilisés) : `src/components/FormationProgress.tsx`, `src/components/PlayerCard.tsx`

- [ ] **Step 1: Vérifier les usages restants de l'ancien draft**

Run: `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && grep -rn "draftReducer\|initDraft\|currentGroup\|FormationProgress\|PlayerCard" src/ || echo "aucun usage"`
Expected : seuls `draftReducer.ts`/`.test.ts`/`integration.test.ts` et `src/domain/play/index.ts` référencent l'ancien réducteur ; `FormationProgress`/`PlayerCard` ne sont plus importés que par eux-mêmes. (Si `PlayerCard`/`FormationProgress` sont encore importés ailleurs, NE PAS les supprimer — ajuste l'étape 3.)

- [ ] **Step 2: Supprimer l'ancien réducteur et ses tests**

```bash
git rm src/domain/play/draftReducer.ts src/domain/play/draftReducer.test.ts src/domain/play/integration.test.ts
```
Dans `src/domain/play/index.ts`, retire la ligne `export * from './draftReducer'` (garde `./playGame`, `./squad`, `./squadDraft`).

- [ ] **Step 3: Supprimer les composants v1 inutilisés**

Seulement s'ils ne sont plus importés (cf. étape 1) :
```bash
git rm src/components/FormationProgress.tsx src/components/PlayerCard.tsx
```
(Si l'un est encore référencé, le garder.)

- [ ] **Step 4: Vérification finale complète**

Run: `npm test && npm run lint && npm run build && npx tsc --noEmit`
Expected : tous les tests PASS (les tests de l'ancien réducteur supprimés ; `squadDraft` + reste intacts), lint OK, build OK (routes `/`, `/game`, `/api/pool`, `/manifest.webmanifest`), tsc OK.

- [ ] **Step 5: Smoke runtime**

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use 20 && (PORT=3199 npm run start >/tmp/onze9.log 2>&1 &) && sleep 6 && curl -s -o /dev/null -w "home=%{http_code}\n" "http://localhost:3199/" && curl -s -o /dev/null -w "game=%{http_code}\n" "http://localhost:3199/game?mode=prime&challenge=libre&formation=4-2-3-1" && curl -s "http://localhost:3199/api/pool?mode=prime" | head -c 60 && pkill -f "next start"; pkill -f "next-server"
```
Expected : `home=200`, `game=200`, l'API renvoie un tableau JSON de joueurs.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove v1 draft reducer and unused v1 components"
```

---

## Couverture du spec (auto-revue §12)

- Choix de la formation avant la partie → Task 1 (`FormationPicker`, param `formation`).
- Draft « une équipe par pick » + reroll → Task 4 (`SquadPanel` + `squadDraftReducer`, bouton reroll avec compteur).
- Sélection manuelle du poste (cliquer le slot) → Tasks 2 (`Pitch` cliquable) + 4 (`selectedSlot`, filtrage des joueurs éligibles).
- Verrou de poste → Task 4 (`pickableIds` via `eligibleSlots`, le réducteur rejette de toute façon un slot incompatible).
- Saison animée + classement en direct → Tasks 3 (`SeasonAnimation` + `standingsAfter`) + 4 (affichée avant le résumé).
- Bascule sur le moteur v2 + retrait de l'ancien draft → Task 5.

**Vérification interactive (étape utilisateur) :** `npm run dev` → choisir formation/mode/défi, drafter en cliquant les postes et l'effectif (reroll si besoin), regarder la saison défiler avec le classement en direct, voir le résumé + objectifs. **Hors de ce plan :** scraping, admin, autres piliers de profondeur.
```
