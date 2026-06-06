import type { PrismaClient } from '@prisma/client'
import { UpsertPayload, PlayerSeasonPayload } from './payload'

function seasonData(ps: PlayerSeasonPayload) {
  return {
    position: ps.position,
    tier: ps.tier,
    minutes: ps.minutes,
    matches: ps.matches,
    goals: ps.goals,
    assists: ps.assists,
    xG: ps.xG ?? null,
    xA: ps.xA ?? null,
    tacklesInterceptions: ps.tacklesInterceptions ?? null,
    progressivePasses: ps.progressivePasses ?? null,
    passCompletionPct: ps.passCompletionPct ?? null,
    savePct: ps.savePct ?? null,
    cleanSheets: ps.cleanSheets ?? null,
    goalsConcededPer90: ps.goalsConcededPer90 ?? null,
    marketValue: ps.marketValue ?? null,
    ratingComputed: ps.ratingComputed,
    reliability: ps.reliability,
  }
}

export async function loadRatedSeasons(prisma: PrismaClient, payload: UpsertPayload): Promise<void> {
  const clubIdByName = new Map<string, string>()
  for (const name of payload.clubs) {
    const club = await prisma.club.upsert({ where: { name }, update: {}, create: { name } })
    clubIdByName.set(name, club.id)
  }

  const playerIdByName = new Map<string, string>()
  for (const p of payload.players) {
    const player = await prisma.player.upsert({ where: { name: p.name }, update: {}, create: { name: p.name } })
    playerIdByName.set(p.name, player.id)
  }

  for (const ps of payload.playerSeasons) {
    const playerId = playerIdByName.get(ps.playerName)!
    const clubId = clubIdByName.get(ps.clubName)!
    const data = seasonData(ps)
    await prisma.playerSeason.upsert({
      where: { playerId_season_competition: { playerId, season: ps.season, competition: ps.competition } },
      update: { clubId, ...data },
      create: { playerId, clubId, season: ps.season, competition: ps.competition, ...data },
    })
  }

  for (const p of payload.players) {
    const playerId = playerIdByName.get(p.name)!
    const season = await prisma.playerSeason.findUnique({
      where: { playerId_season_competition: { playerId, season: p.primeSeason, competition: p.primeCompetition } },
    })
    if (season) {
      await prisma.player.update({ where: { id: playerId }, data: { primeSeasonId: season.id } })
    }
  }
}
