import { Tier } from '../domain/ratings'
import { seasonStartYear } from './seasons'

export function classifyTier(input: { competition: string; season: string }): Tier {
  if (input.competition === 'L1' && seasonStartYear(input.season) >= 2017) return 'rich'
  return 'basic'
}
