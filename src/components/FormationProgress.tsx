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
