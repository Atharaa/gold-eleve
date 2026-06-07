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
