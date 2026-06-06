// "2018-19" ou "2002-2003" -> année de début (2018, 2002).
export function seasonStartYear(season: string): number {
  const match = season.trim().match(/^(\d{4})/)
  if (!match) throw new Error(`Invalid season: ${season}`)
  return Number(match[1])
}
