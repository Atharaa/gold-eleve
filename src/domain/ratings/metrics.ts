import { Metric } from './weights'
import { PlayerSeasonStats } from './types'

function per90(value: number | undefined, minutes: number): number {
  if (!value || minutes <= 0) return 0
  return (value * 90) / minutes
}

export function metricValue(row: PlayerSeasonStats, metric: Metric): number {
  switch (metric) {
    case 'goals': return per90(row.goals, row.minutes)
    case 'assists': return per90(row.assists, row.minutes)
    case 'xG': return per90(row.xG, row.minutes)
    case 'xA': return per90(row.xA, row.minutes)
    case 'tacklesInterceptions': return per90(row.tacklesInterceptions, row.minutes)
    case 'progressivePasses': return per90(row.progressivePasses, row.minutes)
    case 'passCompletionPct': return row.passCompletionPct ?? 0
    case 'savePct': return row.savePct ?? 0
    case 'cleanSheets': return row.cleanSheets ?? 0
    case 'goalsConcededInv': return -(row.goalsConcededPer90 ?? 99)
    case 'minutes': return row.minutes
    case 'marketValue': return row.marketValue ?? 0
  }
}
