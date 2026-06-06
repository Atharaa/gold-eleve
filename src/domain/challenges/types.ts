import { PoolPlayer, SeasonResult, Constraint } from '../game'

export interface EvalContext {
  picked: PoolPlayer[]
  result: SeasonResult
  teamRating: number
}

export interface Objective {
  id: string
  label: string
  points: number
  check: (ctx: EvalContext) => boolean
}

export interface Challenge {
  id: string
  name: string
  description: string
  constraints: Constraint[]
  objectives: Objective[]
}

export interface ObjectiveResult {
  id: string
  label: string
  points: number
  completed: boolean
}

export interface ChallengeResult {
  objectives: ObjectiveResult[]
  totalPoints: number
  maxPoints: number
}
