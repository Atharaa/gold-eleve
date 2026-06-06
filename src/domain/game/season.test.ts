import { describe, it, expect } from 'vitest'
import { playSeason, buildTable, TeamSeed } from './season'
import { createRng } from './rng'

const teams: TeamSeed[] = [
  { name: 'User', strength: 85, isUser: true },
  { name: 'B', strength: 70, isUser: false },
  { name: 'C', strength: 60, isUser: false },
  { name: 'D', strength: 75, isUser: false },
]

describe('playSeason', () => {
  const rows = playSeason(createRng(10), teams)

  it('returns one row per team', () => {
    expect(rows).toHaveLength(4)
  })
  it('each team plays 2*(N-1) matches', () => {
    for (const r of rows) expect(r.played).toBe(2 * (teams.length - 1))
  })
  it('points equal 3*won + drawn', () => {
    for (const r of rows) expect(r.points).toBe(3 * r.won + r.drawn)
  })
  it('won + drawn + lost equals played', () => {
    for (const r of rows) expect(r.won + r.drawn + r.lost).toBe(r.played)
  })
  it('total goals for equals total goals against across the league', () => {
    const gf = rows.reduce((s, r) => s + r.gf, 0)
    const ga = rows.reduce((s, r) => s + r.ga, 0)
    expect(gf).toBe(ga)
  })
  it('is deterministic for a given seed', () => {
    expect(playSeason(createRng(10), teams)).toEqual(rows)
  })
})

describe('buildTable', () => {
  it('sorts by points then goal difference and assigns positions', () => {
    const sorted = buildTable(playSeason(createRng(10), teams))
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]
      const cur = sorted[i]
      const prevGd = prev.gf - prev.ga
      const curGd = cur.gf - cur.ga
      expect(prev.points > cur.points || (prev.points === cur.points && prevGd >= curGd)).toBe(true)
    }
    expect(sorted[0].position).toBe(1)
    expect(sorted[sorted.length - 1].position).toBe(sorted.length)
  })
  it('does not mutate the input rows (no position written on originals)', () => {
    const rows = playSeason(createRng(10), teams)
    buildTable(rows)
    expect(rows.every((r) => r.position === undefined)).toBe(true)
  })
})
