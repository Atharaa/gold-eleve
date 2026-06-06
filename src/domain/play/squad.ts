import { PositionGroup } from '../ratings'
import { PoolPlayer, randomInt } from '../game'

export interface Squad {
  club: string
  season: string
  competition: string
  players: PoolPlayer[]
}

export function eligibleGroups(player: PoolPlayer): PositionGroup[] {
  return player.eligiblePositions && player.eligiblePositions.length > 0
    ? player.eligiblePositions
    : [player.positionGroup]
}

export function buildSquads(pool: PoolPlayer[]): Squad[] {
  const byKey = new Map<string, Squad>()
  for (const player of pool) {
    const key = `${player.clubName}|${player.season}|${player.competition}`
    const squad = byKey.get(key)
    if (squad) {
      squad.players.push(player)
    } else {
      byKey.set(key, { club: player.clubName, season: player.season, competition: player.competition, players: [player] })
    }
  }
  return [...byKey.values()]
}

// Tire un effectif au hasard ; si `exclude` est fourni et qu'il existe une
// alternative, garantit un effectif différent.
export function drawSquad(squads: Squad[], rng: () => number, exclude?: Squad): Squad {
  if (squads.length === 0) throw new Error('drawSquad: no squads')
  const pick = squads[randomInt(rng, squads.length)]
  if (exclude && pick === exclude && squads.length > 1) {
    const others = squads.filter((s) => s !== exclude)
    return others[randomInt(rng, others.length)]
  }
  return pick
}
