import { RatedRow } from './types'

export interface PrimeRef {
  season: string
  competition: string
}

export function assignPrimeSeasons(rated: RatedRow[]): Map<string, PrimeRef> {
  const byPlayer = new Map<string, RatedRow[]>()
  for (const row of rated) {
    const list = byPlayer.get(row.playerName) ?? []
    list.push(row)
    byPlayer.set(row.playerName, list)
  }

  const prime = new Map<string, PrimeRef>()
  for (const [playerName, list] of byPlayer) {
    const best = list.reduce((b, r) => (r.ratingComputed > b.ratingComputed ? r : b))
    prime.set(playerName, { season: best.season, competition: best.competition })
  }
  return prime
}
