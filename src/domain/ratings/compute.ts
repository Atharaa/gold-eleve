import { toPositionGroup } from './positions'
import { toPercentiles } from './percentile'
import { metricValue } from './metrics'
import { reliabilityFor } from './reliability'
import { RICH_WEIGHTS, BASIC_WEIGHTS, Metric } from './weights'
import { PlayerSeasonStats, RatingResult, Tier } from './types'

const FLOOR = 40
const SPAN = 59

export function computeSeasonRatings(cohort: PlayerSeasonStats[], tier: Tier): RatingResult[] {
  if (cohort.length === 0) return []

  const group = toPositionGroup(cohort[0].position)
  for (const row of cohort) {
    if (toPositionGroup(row.position) !== group) {
      throw new Error('computeSeasonRatings: cohort mixes position groups')
    }
  }
  const weights = tier === 'rich' ? RICH_WEIGHTS[group] : BASIC_WEIGHTS[group]
  const metrics = Object.keys(weights) as Metric[]

  const percentilesByMetric: Record<string, number[]> = {}
  for (const metric of metrics) {
    const values = cohort.map((row) => metricValue(row, metric))
    percentilesByMetric[metric] = toPercentiles(values)
  }

  return cohort.map((row, index) => {
    let weighted = 0
    let totalWeight = 0
    for (const metric of metrics) {
      const weight = weights[metric]!
      weighted += weight * percentilesByMetric[metric][index]
      totalWeight += weight
    }
    const normalized = totalWeight > 0 ? weighted / totalWeight : 0
    return {
      playerId: row.playerId,
      seasonId: row.seasonId,
      ratingComputed: Math.round(FLOOR + normalized * SPAN),
      tier,
      reliability: reliabilityFor(row, tier),
    }
  })
}
