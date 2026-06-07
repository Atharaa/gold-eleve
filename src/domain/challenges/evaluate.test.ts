import { describe, it, expect } from 'vitest'
import { evaluateChallenge } from './evaluate'
import { champion, invincible } from './objectives'
import { Challenge, EvalContext } from './types'
import { SeasonResult, TableRow, RankRow } from '../game'

function userRow(over: Partial<TableRow> = {}): TableRow {
  return { name: 'Mon XI', isUser: true, played: 34, won: 30, drawn: 4, lost: 0, gf: 90, ga: 15, points: 94, cleanSheets: 20, position: 1, ...over }
}
function rank(): RankRow {
  return { playerName: 'X', club: 'Mon XI', value: 20, isUser: false }
}
function ctx(invinc: boolean, position: number): EvalContext {
  const u = userRow({ position, lost: invinc ? 0 : 5 })
  const result: SeasonResult = {
    table: [u], userRow: u, invincible: invinc,
    scorers: [rank()], assisters: [rank()], keepers: [rank()], bestRated: rank(),
    matchdays: [],
  }
  return { picked: [], result, teamRating: 88 }
}

const challenge: Challenge = {
  id: 'test', name: 'Test', description: '', constraints: [],
  objectives: [champion(50), invincible(120)],
}

describe('evaluateChallenge', () => {
  it('marks each objective completed or not and sums completed points', () => {
    const res = evaluateChallenge(challenge, ctx(true, 1))
    expect(res.objectives).toHaveLength(2)
    expect(res.objectives.every((o) => o.completed)).toBe(true)
    expect(res.totalPoints).toBe(170)
    expect(res.maxPoints).toBe(170)
  })
  it('counts only completed objectives toward total', () => {
    const res = evaluateChallenge(challenge, ctx(false, 2))
    expect(res.totalPoints).toBe(0)
    expect(res.maxPoints).toBe(170)
    expect(res.objectives.find((o) => o.id === 'champion')?.completed).toBe(false)
  })
  it('partial completion sums only the met objectives', () => {
    // champion oui (pos 1), invincible non
    const res = evaluateChallenge(challenge, ctx(false, 1))
    expect(res.totalPoints).toBe(50)
  })
})
