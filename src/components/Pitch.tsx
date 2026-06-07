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
