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
