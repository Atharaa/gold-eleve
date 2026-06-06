import { describe, it, expect } from 'vitest'
import { getPool } from './pool'
import { samplePool } from '../data/samplePool'

const hasDb = !!process.env.DATABASE_URL

describe('getPool', () => {
  it.skipIf(hasDb)('falls back to the sample pool when no database is configured', async () => {
    const prime = await getPool('prime')
    expect(prime).toEqual(samplePool)
    const season = await getPool('season')
    expect(season).toEqual(samplePool)
  })

  it.skipIf(!hasDb)('returns a non-empty pool from the database', async () => {
    const pool = await getPool('prime')
    expect(Array.isArray(pool)).toBe(true)
  })
})
