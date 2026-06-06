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
