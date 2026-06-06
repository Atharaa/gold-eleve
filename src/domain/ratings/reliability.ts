import { PlayerSeasonStats, Tier } from './types'

export function reliabilityFor(row: PlayerSeasonStats, tier: Tier): 1 | 2 | 3 | 4 {
  if (tier === 'rich') {
    const advanced = [row.xG, row.xA, row.tacklesInterceptions, row.progressivePasses, row.passCompletionPct]
    const present = advanced.filter((v) => v !== undefined && v !== null).length
    return present >= 4 ? 4 : 3
  }
  return row.marketValue != null ? 2 : 1
}
