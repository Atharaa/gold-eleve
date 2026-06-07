import { describe, it, expect } from 'vitest'
import { playSeasonByMatchday, accumulateStandings, standingsAfter, TeamSeed } from './season'
import { createRng } from './rng'

const teams: TeamSeed[] = [
  { name: 'User', strength: 85, isUser: true },
  { name: 'B', strength: 70, isUser: false },
  { name: 'C', strength: 60, isUser: false },
  { name: 'D', strength: 75, isUser: false },
]

describe('playSeasonByMatchday', () => {
  const matchdays = playSeasonByMatchday(createRng(10), teams)

  it('produces 2*(N-1) numbered matchdays', () => {
    expect(matchdays).toHaveLength(6)
    expect(matchdays[0].round).toBe(1)
    expect(matchdays[5].round).toBe(6)
  })
  it('each matchday has N/2 matches naming real teams', () => {
    const names = new Set(teams.map((t) => t.name))
    for (const md of matchdays) {
      expect(md.matches).toHaveLength(2)
      for (const m of md.matches) {
        expect(names.has(m.home)).toBe(true)
        expect(names.has(m.away)).toBe(true)
        expect(m.homeGoals).toBeGreaterThanOrEqual(0)
      }
    }
  })
  it('is deterministic for a given seed', () => {
    expect(playSeasonByMatchday(createRng(10), teams)).toEqual(matchdays)
  })
})

describe('accumulateStandings', () => {
  const matchdays = playSeasonByMatchday(createRng(10), teams)
  const rows = accumulateStandings(matchdays, teams)

  it('gives each team 2*(N-1) games and league gf == ga', () => {
    for (const r of rows) expect(r.played).toBe(6)
    expect(rows.reduce((s, r) => s + r.gf, 0)).toBe(rows.reduce((s, r) => s + r.ga, 0))
  })
  it('points equal 3*won + drawn', () => {
    for (const r of rows) expect(r.points).toBe(3 * r.won + r.drawn)
  })
})

describe('standingsAfter', () => {
  const matchdays = playSeasonByMatchday(createRng(10), teams)
  it('after round 0, nobody has played', () => {
    const t = standingsAfter(matchdays, teams, 0)
    expect(t.every((r) => r.played === 0)).toBe(true)
  })
  it('after the last round, equals the full accumulated table size and is sorted with positions', () => {
    const t = standingsAfter(matchdays, teams, 6)
    expect(t).toHaveLength(4)
    expect(t[0].position).toBe(1)
    for (const r of t) expect(r.played).toBe(6)
  })
  it('played count is monotonic non-decreasing across rounds', () => {
    let prev = 0
    for (let n = 0; n <= 6; n++) {
      const total = standingsAfter(matchdays, teams, n).reduce((s, r) => s + r.played, 0)
      expect(total).toBeGreaterThanOrEqual(prev)
      prev = total
    }
  })
})
