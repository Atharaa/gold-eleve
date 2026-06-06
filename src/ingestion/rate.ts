import { computeSeasonRatings, toPositionGroup } from '../domain/ratings'
import { classifyTier } from './tier'
import { NormalizedRow, RatedRow } from './types'

export function rateAllSeasons(rows: NormalizedRow[]): RatedRow[] {
  const groups = new Map<string, NormalizedRow[]>()
  for (const row of rows) {
    const group = toPositionGroup(row.stats.position)
    const key = `${group}|${row.season}|${row.competition}`
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }

  const out: RatedRow[] = []
  for (const list of groups.values()) {
    const { season, competition } = list[0]
    const tier = classifyTier({ competition, season })
    const results = computeSeasonRatings(list.map((r) => r.stats), tier)
    list.forEach((row, index) => {
      out.push({ ...row, tier, ratingComputed: results[index].ratingComputed, reliability: results[index].reliability })
    })
  }
  return out
}
