'use client'

import { useEffect, useMemo, useState } from 'react'
import { SeasonResult, standingsAfter } from '@/domain/game'
import { StandingsTable } from './StandingsTable'

export function SeasonAnimation({ result, onFinish }: { result: SeasonResult; onFinish: () => void }) {
  const totalRounds = result.matchdays.length
  const teams = useMemo(() => result.table.map((r) => ({ name: r.name, strength: 0, isUser: r.isUser })), [result])
  const [round, setRound] = useState(1)

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
