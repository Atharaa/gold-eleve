import { describe, it, expect } from 'vitest'
import { champion, invincible, topScorer, scoreAtLeast, concedeAtMost, bestRatedIsUser } from './objectives'
import { EvalContext } from './types'
import { SeasonResult, TableRow, RankRow } from '../game'

function userRow(over: Partial<TableRow> = {}): TableRow {
  return { name: 'Mon XI', isUser: true, played: 34, won: 20, drawn: 8, lost: 6, gf: 60, ga: 30, points: 68, cleanSheets: 10, position: 3, ...over }
}
function rank(isUser: boolean): RankRow {
  return { playerName: 'X', club: 'Mon XI', value: 20, isUser }
}
function result(over: Partial<SeasonResult> = {}): SeasonResult {
  const u = over.userRow ?? userRow()
  return {
    table: over.table ?? [u],
    userRow: u,
    invincible: over.invincible ?? false,
    scorers: over.scorers ?? [rank(false)],
    assisters: over.assisters ?? [rank(false)],
    keepers: over.keepers ?? [rank(false)],
    bestRated: over.bestRated ?? rank(false),
  }
}
function ctx(over: Partial<SeasonResult> = {}): EvalContext {
  return { picked: [], result: result(over), teamRating: 80 }
}

describe('objective factories', () => {
  it('champion checks position 1', () => {
    expect(champion(50).check(ctx({ userRow: userRow({ position: 1 }) }))).toBe(true)
    expect(champion(50).check(ctx({ userRow: userRow({ position: 2 }) }))).toBe(false)
  })
  it('invincible checks the invincible flag', () => {
    expect(invincible(100).check(ctx({ invincible: true }))).toBe(true)
    expect(invincible(100).check(ctx({ invincible: false }))).toBe(false)
  })
  it('topScorer checks the leading scorer is the user', () => {
    expect(topScorer(40).check(ctx({ scorers: [rank(true)] }))).toBe(true)
    expect(topScorer(40).check(ctx({ scorers: [rank(false)] }))).toBe(false)
    expect(topScorer(40).check(ctx({ scorers: [] }))).toBe(false)
  })
  it('scoreAtLeast checks goals for', () => {
    expect(scoreAtLeast(70, 30).check(ctx({ userRow: userRow({ gf: 75 }) }))).toBe(true)
    expect(scoreAtLeast(70, 30).check(ctx({ userRow: userRow({ gf: 60 }) }))).toBe(false)
  })
  it('concedeAtMost checks goals against', () => {
    expect(concedeAtMost(25, 60).check(ctx({ userRow: userRow({ ga: 20 }) }))).toBe(true)
    expect(concedeAtMost(25, 60).check(ctx({ userRow: userRow({ ga: 30 }) }))).toBe(false)
  })
  it('bestRatedIsUser checks the best-rated flag', () => {
    expect(bestRatedIsUser(50).check(ctx({ bestRated: rank(true) }))).toBe(true)
    expect(bestRatedIsUser(50).check(ctx({ bestRated: rank(false) }))).toBe(false)
  })
  it('carries its points value', () => {
    expect(champion(50).points).toBe(50)
  })
})
