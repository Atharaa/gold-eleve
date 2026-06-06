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
