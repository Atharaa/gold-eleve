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
