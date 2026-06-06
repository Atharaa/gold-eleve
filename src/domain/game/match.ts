import { poisson } from './rng'

export interface Opponent {
  name: string
  strength: number
}

export function generateOpponents(rng: () => number, count: number): Opponent[] {
  const opponents: Opponent[] = []
  for (let i = 0; i < count; i++) {
    const raw = 55 + rng() * 37 // 55..92
    opponents.push({ name: `Club ${i + 1}`, strength: Math.round(Math.min(92, Math.max(50, raw))) })
  }
  return opponents
}

// Buts attendus d'une attaque face à une défense. Base 1.35, modulée par l'écart de force.
export function expectedGoals(attack: number, defense: number): number {
  return 1.35 * Math.pow(2, (attack - defense) / 18)
}

export function simulateMatch(rng: () => number, strengthA: number, strengthB: number): [number, number] {
  return [poisson(rng, expectedGoals(strengthA, strengthB)), poisson(rng, expectedGoals(strengthB, strengthA))]
}
