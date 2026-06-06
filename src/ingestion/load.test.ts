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

describe('loadRatedSeasons override safety', () => {
  it('never writes ratingOverride in the upsert create or update', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls: { playerSeasonUpsert: any[] } = { playerSeasonUpsert: [] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prisma: any = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      club: { upsert: async ({ create }: any) => ({ id: 'club-' + create.name, name: create.name }) },
      player: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upsert: async ({ create }: any) => ({ id: 'player-' + create.name, name: create.name }),
        update: async () => ({}),
      },
      playerSeason: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        upsert: async (args: any) => { calls.playerSeasonUpsert.push(args); return { id: 'ps-1' } },
        findUnique: async () => ({ id: 'ps-1' }),
      },
    }
    const payload: UpsertPayload = {
      clubs: ['C'],
      players: [{ name: 'P', primeSeason: '2018-19', primeCompetition: 'L1' }],
      playerSeasons: [{
        playerName: 'P', clubName: 'C', season: '2018-19', competition: 'L1',
        position: 'ST', tier: 'rich', minutes: 2700, matches: 30, goals: 20, assists: 5,
        ratingComputed: 85, reliability: 4,
      }],
    }
    await loadRatedSeasons(prisma, payload)
    expect(calls.playerSeasonUpsert).toHaveLength(1)
    const { update, create } = calls.playerSeasonUpsert[0]
    expect(Object.keys(update)).not.toContain('ratingOverride')
    expect(Object.keys(create)).not.toContain('ratingOverride')
  })
})
