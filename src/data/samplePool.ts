import { PoolPlayer } from '../domain/game'

function p(
  id: string,
  name: string,
  club: string,
  group: PoolPlayer['positionGroup'],
  rating: number,
  reliability: 1 | 2 | 3 | 4 = 4,
): PoolPlayer {
  return { playerId: id, playerName: name, clubName: club, season: '2018-19', competition: 'L1', positionGroup: group, rating, reliability }
}

// Pool d'exemple (joueurs marquants de Ligue 1) pour jouer hors base de données.
export const samplePool: PoolPlayer[] = [
  // Gardiens
  p('gk1', 'Steve Mandanda', 'Marseille', 'GK', 84),
  p('gk2', 'Alphonse Areola', 'PSG', 'GK', 82),
  p('gk3', 'Benoit Costil', 'Bordeaux', 'GK', 78),
  p('gk4', 'Walter Benitez', 'Nice', 'GK', 80),
  p('gk5', 'Anthony Lopes', 'Lyon', 'GK', 81),
  p('gk6', 'Mike Maignan', 'Lille', 'GK', 83),
  p('gk7', 'Paul Bernardoni', 'Angers', 'GK', 76),
  // Defenseurs
  p('df1', 'Marquinhos', 'PSG', 'DEF', 87),
  p('df2', 'Presnel Kimpembe', 'PSG', 'DEF', 82),
  p('df3', 'Dante', 'Nice', 'DEF', 80),
  p('df4', 'Nicolas Pallois', 'Nantes', 'DEF', 77),
  p('df5', 'Gabriel Magalhaes', 'Lille', 'DEF', 81),
  p('df6', 'Benjamin Pavard', 'Lille', 'DEF', 83),
  p('df7', 'Ferland Mendy', 'Lyon', 'DEF', 82),
  p('df8', 'Leo Dubois', 'Lyon', 'DEF', 79),
  p('df9', 'Mehdi Zerkane', 'Bordeaux', 'DEF', 74),
  // Milieux
  p('mf1', 'Marco Verratti', 'PSG', 'MID', 87),
  p('mf2', 'Marquinhos Cipriano', 'Saint-Etienne', 'MID', 75),
  p('mf3', 'Houssem Aouar', 'Lyon', 'MID', 83),
  p('mf4', 'Boubacar Kamara', 'Marseille', 'MID', 80),
  p('mf5', 'Dimitri Payet', 'Marseille', 'MID', 84),
  p('mf6', 'Benjamin Andre', 'Lille', 'MID', 80),
  p('mf7', 'Thiago Mendes', 'Lyon', 'MID', 79),
  p('mf8', 'Morgan Sanson', 'Marseille', 'MID', 81),
  p('mf9', 'Jonathan Bamba', 'Lille', 'MID', 79),
  // Attaquants
  p('at1', 'Kylian Mbappe', 'PSG', 'ATT', 92),
  p('at2', 'Neymar', 'PSG', 'ATT', 91),
  p('at3', 'Wissam Ben Yedder', 'Monaco', 'ATT', 85),
  p('at4', 'Memphis Depay', 'Lyon', 'ATT', 86),
  p('at5', 'Nicolas Pepe', 'Lille', 'ATT', 84),
  p('at6', 'Moussa Dembele', 'Lyon', 'ATT', 82),
  p('at7', 'Florian Thauvin', 'Marseille', 'ATT', 83),
  p('at8', 'Islam Slimani', 'Monaco', 'ATT', 79),
]
