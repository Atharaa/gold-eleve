import { maxPlayerRating } from '../game'
import { Challenge } from './types'
import { champion, invincible, topScorer, scoreAtLeast, concedeAtMost } from './objectives'

const CHALLENGES: Challenge[] = [
  {
    id: 'libre',
    name: 'Partie libre',
    description: 'Aucune contrainte. Compose le meilleur XI possible.',
    constraints: [],
    objectives: [champion(50), invincible(120), topScorer(40), scoreAtLeast(70, 30)],
  },
  {
    id: 'gachette',
    name: 'La gâchette',
    description: "Mets l'accent sur l'attaque et plante des buts.",
    constraints: [],
    objectives: [topScorer(60), scoreAtLeast(80, 60), champion(40)],
  },
  {
    id: 'forteresse',
    name: 'La forteresse',
    description: 'Bâtis la défense la plus solide du championnat.',
    constraints: [],
    objectives: [concedeAtMost(25, 60), invincible(120), champion(40)],
  },
  {
    id: 'modeste',
    name: 'Équipe modeste',
    description: 'Uniquement des joueurs notés 85 ou moins. Gagne avec des outsiders.',
    constraints: [maxPlayerRating(85)],
    objectives: [champion(100), invincible(200), topScorer(50)],
  },
]

export function listChallenges(): Challenge[] {
  return CHALLENGES
}

export function getChallenge(id: string): Challenge {
  return CHALLENGES.find((c) => c.id === id) ?? CHALLENGES[0]
}
