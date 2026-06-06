// Percentile rang : pour chaque valeur, fraction des valeurs strictement
// inférieures, divisée par (n - 1). min -> 0, max -> 1, ties -> même rang.
export function toPercentiles(values: number[]): number[] {
  const n = values.length
  if (n === 0) return []
  if (n === 1) return [0.5]
  return values.map((v) => {
    const below = values.filter((x) => x < v).length
    return below / (n - 1)
  })
}
