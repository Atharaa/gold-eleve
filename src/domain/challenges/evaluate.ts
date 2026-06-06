import { Challenge, ChallengeResult, EvalContext } from './types'

export function evaluateChallenge(challenge: Challenge, ctx: EvalContext): ChallengeResult {
  const objectives = challenge.objectives.map((o) => ({
    id: o.id,
    label: o.label,
    points: o.points,
    completed: o.check(ctx),
  }))
  const totalPoints = objectives.filter((o) => o.completed).reduce((sum, o) => sum + o.points, 0)
  const maxPoints = challenge.objectives.reduce((sum, o) => sum + o.points, 0)
  return { objectives, totalPoints, maxPoints }
}
