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
