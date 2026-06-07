// Calendrier double aller-retour (méthode du cercle). Renvoie les journées ;
// chaque journée est une liste de rencontres [domicile, extérieur] (indices d'équipe).
// Si le nombre d'équipes est impair, une équipe fictive ("bye") fait tourner les
// repos : ses rencontres sont retirées (l'équipe au repos ce tour-là ne joue pas).
export function roundRobinSchedule(teamCount: number): [number, number][][] {
  const odd = teamCount % 2 !== 0
  const n = odd ? teamCount + 1 : teamCount
  const bye = odd ? teamCount : -1 // index fictif
  const half = n / 2

  let order = Array.from({ length: n }, (_, i) => i)
  const firstHalf: [number, number][][] = []

  for (let round = 0; round < n - 1; round++) {
    const pairs: [number, number][] = []
    for (let i = 0; i < half; i++) {
      const a = order[i]
      const b = order[n - 1 - i]
      if (a !== bye && b !== bye) {
        // alterne domicile/extérieur selon la parité de la journée (équité)
        pairs.push(round % 2 === 0 ? [a, b] : [b, a])
      }
    }
    firstHalf.push(pairs)
    // rotation : on fixe order[0], on fait tourner le reste
    order = [order[0], order[n - 1], ...order.slice(1, n - 1)]
  }

  // retour : on inverse domicile/extérieur
  const secondHalf = firstHalf.map((round) => round.map(([a, b]) => [b, a] as [number, number]))
  return [...firstHalf, ...secondHalf]
}
