import { describe, it, expect } from 'vitest'
import { loadRatedSeasons } from './load'
import { UpsertPayload } from './payload'

const hasDb = !!process.env.DATABASE_URL

describe('loadRatedSeasons', () => {
  it('exports a function', () => {
    expect(typeof loadRatedSeasons).toBe('function')
  })

  it.skipIf(!hasDb)('upserts clubs, players, seasons and prime ids', async () => {
    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()
    const payload: UpsertPayload = {
      clubs: ['TestClub'],
      players: [{ name: 'TestPlayer', primeSeason: '2018-19', primeCompetition: 'L1' }],
      playerSeasons: [{
        playerName: 'TestPlayer', clubName: 'TestClub', season: '2018-19', competition: 'L1',
        position: 'ST', tier: 'rich', minutes: 2700, matches: 30, goals: 20, assists: 5,
        ratingComputed: 85, reliability: 4,
      }],
    }
    await loadRatedSeasons(prisma, payload)
    const player = await prisma.player.findUnique({ where: { name: 'TestPlayer' } })
    expect(player?.primeSeasonId).toBeTruthy()
    await prisma.$disconnect()
  })
})
