import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseSeasonCsv } from './csv'
import { toNormalizedRow } from './normalize'
import { rateAllSeasons } from './rate'
import { assignPrimeSeasons } from './prime'
import { buildUpsertPayload } from './payload'

describe('ingestion pipeline (pure, on sample fixture)', () => {
  const csv = readFileSync(join(__dirname, '__fixtures__', 'sample-seasons.csv'), 'utf8')
  const rated = rateAllSeasons(parseSeasonCsv(csv).map(toNormalizedRow))
  const payload = buildUpsertPayload(rated, assignPrimeSeasons(rated))

  it('produces one player-season per CSV row', () => {
    expect(payload.playerSeasons).toHaveLength(5)
  })
  it('rates the prolific striker above the bit-part striker in the same cohort', () => {
    const byKey = Object.fromEntries(payload.playerSeasons.map((p) => [p.playerName, p]))
    expect(byKey['Kylian Mbappe'].ratingComputed).toBeGreaterThan(byKey['Sloppy Sub'].ratingComputed)
  })
  it('tags L1 2018-19 as rich and L2 2014-15 as basic', () => {
    const byKey = Object.fromEntries(payload.playerSeasons.map((p) => [p.playerName, p]))
    expect(byKey['Kylian Mbappe'].tier).toBe('rich')
    expect(byKey['Pape Souare'].tier).toBe('basic')
  })
  it('keeps every rating within 40..99', () => {
    for (const ps of payload.playerSeasons) {
      expect(ps.ratingComputed).toBeGreaterThanOrEqual(40)
      expect(ps.ratingComputed).toBeLessThanOrEqual(99)
    }
  })
})
