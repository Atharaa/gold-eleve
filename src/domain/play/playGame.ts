import { PoolPlayer, SeasonResult, simulateSeason } from '../game'

export interface PlayOptions {
  seed: number
  teamName?: string
}

export function simulateFromPicks(picked: PoolPlayer[], options: PlayOptions): SeasonResult {
  if (picked.length === 0) throw new Error('simulateFromPicks: no players picked')
  return simulateSeason(picked, { seed: options.seed, teamName: options.teamName })
}
