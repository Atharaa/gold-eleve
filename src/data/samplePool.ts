import { PoolPlayer } from '../domain/game'
import { PositionGroup } from '../domain/ratings'

interface Seed {
  name: string
  group: PositionGroup
  rating: number
  elig?: PositionGroup[]
}

function squad(club: string, season: string, seeds: Seed[]): PoolPlayer[] {
  return seeds.map((s, i) => ({
    playerId: `${club}-${season}-${i}`.replace(/\s+/g, '').toLowerCase(),
    playerName: s.name,
    clubName: club,
    season,
    competition: 'L1',
    positionGroup: s.group,
    rating: s.rating,
    reliability: 4,
    eligiblePositions: s.elig ?? [s.group],
  }))
}

// Effectifs d'exemple (joueurs L1 plausibles) pour jouer hors base.
// Chaque effectif couvre tous les groupes de postes.
export const sampleSquads: PoolPlayer[][] = [
  squad('PSG', '2018-19', [
    { name: 'Alphonse Areola', group: 'GK', rating: 80 },
    { name: 'Gianluigi Buffon', group: 'GK', rating: 82 },
    { name: 'Thilo Kehrer', group: 'DEF', rating: 79, elig: ['DEF', 'MID'] },
    { name: 'Presnel Kimpembe', group: 'DEF', rating: 82 },
    { name: 'Thiago Silva', group: 'DEF', rating: 86 },
    { name: 'Juan Bernat', group: 'DEF', rating: 80, elig: ['DEF', 'MID'] },
    { name: 'Marco Verratti', group: 'MID', rating: 87 },
    { name: 'Marquinhos', group: 'MID', rating: 85, elig: ['MID', 'DEF'] },
    { name: 'Julian Draxler', group: 'MID', rating: 81, elig: ['MID', 'ATT'] },
    { name: 'Angel Di Maria', group: 'ATT', rating: 85, elig: ['ATT', 'MID'] },
    { name: 'Neymar', group: 'ATT', rating: 91, elig: ['ATT', 'MID'] },
    { name: 'Kylian Mbappe', group: 'ATT', rating: 90 },
    { name: 'Edinson Cavani', group: 'ATT', rating: 86 },
  ]),
  squad('Lyon', '2014-15', [
    { name: 'Anthony Lopes', group: 'GK', rating: 80 },
    { name: 'Christophe Jallet', group: 'DEF', rating: 76, elig: ['DEF', 'MID'] },
    { name: 'Samuel Umtiti', group: 'DEF', rating: 80 },
    { name: 'Milan Bisevac', group: 'DEF', rating: 74 },
    { name: 'Henri Bedimo', group: 'DEF', rating: 75, elig: ['DEF', 'MID'] },
    { name: 'Maxime Gonalons', group: 'MID', rating: 79, elig: ['MID', 'DEF'] },
    { name: 'Corentin Tolisso', group: 'MID', rating: 81 },
    { name: 'Clement Grenier', group: 'MID', rating: 78, elig: ['MID', 'ATT'] },
    { name: 'Nabil Fekir', group: 'ATT', rating: 84, elig: ['ATT', 'MID'] },
    { name: 'Alexandre Lacazette', group: 'ATT', rating: 85 },
    { name: 'Jordan Ferri', group: 'MID', rating: 73 },
    { name: 'Rachid Ghezzal', group: 'ATT', rating: 76, elig: ['ATT', 'MID'] },
  ]),
  squad('Marseille', '2017-18', [
    { name: 'Steve Mandanda', group: 'GK', rating: 83 },
    { name: 'Bouna Sarr', group: 'DEF', rating: 75, elig: ['DEF', 'MID'] },
    { name: 'Adil Rami', group: 'DEF', rating: 78 },
    { name: 'Rolando', group: 'DEF', rating: 76 },
    { name: 'Jordan Amavi', group: 'DEF', rating: 76, elig: ['DEF', 'MID'] },
    { name: 'Luiz Gustavo', group: 'MID', rating: 81, elig: ['MID', 'DEF'] },
    { name: 'Morgan Sanson', group: 'MID', rating: 80 },
    { name: 'Florian Thauvin', group: 'ATT', rating: 84, elig: ['ATT', 'MID'] },
    { name: 'Dimitri Payet', group: 'MID', rating: 84, elig: ['MID', 'ATT'] },
    { name: 'Valere Germain', group: 'ATT', rating: 77 },
    { name: 'Kostas Mitroglou', group: 'ATT', rating: 76 },
    { name: 'Clinton Njie', group: 'ATT', rating: 74, elig: ['ATT', 'MID'] },
  ]),
  squad('Monaco', '2016-17', [
    { name: 'Danijel Subasic', group: 'GK', rating: 80 },
    { name: 'Djibril Sidibe', group: 'DEF', rating: 80, elig: ['DEF', 'MID'] },
    { name: 'Kamil Glik', group: 'DEF', rating: 81 },
    { name: 'Jemerson', group: 'DEF', rating: 78 },
    { name: 'Benjamin Mendy', group: 'DEF', rating: 81, elig: ['DEF', 'MID'] },
    { name: 'Fabinho', group: 'MID', rating: 83, elig: ['MID', 'DEF'] },
    { name: 'Tiemoue Bakayoko', group: 'MID', rating: 82 },
    { name: 'Bernardo Silva', group: 'MID', rating: 84, elig: ['MID', 'ATT'] },
    { name: 'Thomas Lemar', group: 'MID', rating: 82, elig: ['MID', 'ATT'] },
    { name: 'Radamel Falcao', group: 'ATT', rating: 84 },
    { name: 'Kylian Mbappe', group: 'ATT', rating: 83 },
    { name: 'Valere Germain', group: 'ATT', rating: 77 },
  ]),
  squad('Lille', '2018-19', [
    { name: 'Mike Maignan', group: 'GK', rating: 82 },
    { name: 'Mehmet Celik', group: 'DEF', rating: 74, elig: ['DEF', 'MID'] },
    { name: 'Gabriel Magalhaes', group: 'DEF', rating: 80 },
    { name: 'Jose Fonte', group: 'DEF', rating: 79 },
    { name: 'Domagoj Bradaric', group: 'DEF', rating: 74, elig: ['DEF', 'MID'] },
    { name: 'Benjamin Andre', group: 'MID', rating: 80, elig: ['MID', 'DEF'] },
    { name: 'Thiago Mendes', group: 'MID', rating: 80 },
    { name: 'Jonathan Ikone', group: 'ATT', rating: 79, elig: ['ATT', 'MID'] },
    { name: 'Jonathan Bamba', group: 'ATT', rating: 79, elig: ['ATT', 'MID'] },
    { name: 'Nicolas Pepe', group: 'ATT', rating: 85, elig: ['ATT', 'MID'] },
    { name: 'Loic Remy', group: 'ATT', rating: 76 },
    { name: 'Xeka', group: 'MID', rating: 75 },
  ]),
]

export const samplePool: PoolPlayer[] = sampleSquads.flat()
