import { Objective } from './types'

export function champion(points: number): Objective {
  return { id: 'champion', label: 'Terminer champion', points, check: (c) => c.result.userRow.position === 1 }
}

export function invincible(points: number): Objective {
  return { id: 'invincible', label: 'Saison invincible', points, check: (c) => c.result.invincible }
}

export function topScorer(points: number): Objective {
  return {
    id: 'top-scorer',
    label: 'Avoir le meilleur buteur',
    points,
    check: (c) => c.result.scorers.length > 0 && c.result.scorers[0].isUser,
  }
}

export function scoreAtLeast(goals: number, points: number): Objective {
  return { id: `goals-${goals}`, label: `Marquer ${goals} buts`, points, check: (c) => c.result.userRow.gf >= goals }
}

export function concedeAtMost(goals: number, points: number): Objective {
  return { id: `conceded-${goals}`, label: `Encaisser ${goals} buts maximum`, points, check: (c) => c.result.userRow.ga <= goals }
}

export function bestRatedIsUser(points: number): Objective {
  return { id: 'best-rated', label: 'Avoir la meilleure note du championnat', points, check: (c) => c.result.bestRated.isUser }
}
