import { describe, it, expect } from 'vitest'
import { parseSeasonCsv } from './csv'

const csv = `player,club,season,competition,position,minutes,matches,goals,assists
Star Player,PSG,2018-19,L1,ST,2700,29,33,7
Other Guy,Lyon,2018-19,L1,CM,2500,30,5,8`

describe('parseSeasonCsv', () => {
  it('parses rows keyed by header', () => {
    const rows = parseSeasonCsv(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0].player).toBe('Star Player')
    expect(rows[0].goals).toBe('33')
    expect(rows[1].club).toBe('Lyon')
  })
  it('skips empty lines', () => { expect(parseSeasonCsv(csv + '\n\n')).toHaveLength(2) })
})
