export interface RatedSeason {
  seasonId: string
  ratingComputed: number
  ratingOverride?: number | null
}

export function effectiveRating(season: RatedSeason): number {
  return season.ratingOverride ?? season.ratingComputed
}

export function selectPrimeSeason(seasons: RatedSeason[]): string {
  if (seasons.length === 0) throw new Error('no seasons')
  return seasons.reduce((best, season) =>
    effectiveRating(season) > effectiveRating(best) ? season : best
  ).seasonId
}
