import { PrismaClient } from '@prisma/client'
import { PoolPlayer } from '../domain/game'
import { rowsToPool } from '../domain/pool/map'
import { DbSeasonRow } from '../domain/pool/types'
import { samplePool } from '../data/samplePool'

export type PoolMode = 'prime' | 'season'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
function db(): PrismaClient {
  return (globalForPrisma.prisma ??= new PrismaClient())
}

async function primeRows(): Promise<DbSeasonRow[]> {
  const players = await db().player.findMany({
    where: { primeSeasonId: { not: null } },
    include: { primeSeason: { include: { club: true } } },
  })
  return players
    .filter((p) => p.primeSeason)
    .map((p) => ({
      playerId: p.id,
      playerName: p.name,
      clubName: p.primeSeason!.club.name,
      season: p.primeSeason!.season,
      competition: p.primeSeason!.competition,
      position: p.primeSeason!.position,
      ratingComputed: p.primeSeason!.ratingComputed,
      ratingOverride: p.primeSeason!.ratingOverride,
      reliability: p.primeSeason!.reliability,
      marketValue: p.primeSeason!.marketValue,
    }))
}

async function seasonRows(): Promise<DbSeasonRow[]> {
  const seasons = await db().playerSeason.findMany({ include: { player: true, club: true } })
  return seasons.map((s) => ({
    playerId: s.playerId,
    playerName: s.player.name,
    clubName: s.club.name,
    season: s.season,
    competition: s.competition,
    position: s.position,
    ratingComputed: s.ratingComputed,
    ratingOverride: s.ratingOverride,
    reliability: s.reliability,
    marketValue: s.marketValue,
  }))
}

export async function getPool(mode: PoolMode): Promise<PoolPlayer[]> {
  if (!process.env.DATABASE_URL) return samplePool
  const rows = mode === 'prime' ? await primeRows() : await seasonRows()
  const pool = rowsToPool(rows)
  return pool.length > 0 ? pool : samplePool
}
