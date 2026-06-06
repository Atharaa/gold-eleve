import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { PrismaClient } from '@prisma/client'
import { parseSeasonCsv } from '../src/ingestion/csv'
import { toNormalizedRow } from '../src/ingestion/normalize'
import { rateAllSeasons } from '../src/ingestion/rate'
import { assignPrimeSeasons } from '../src/ingestion/prime'
import { buildUpsertPayload } from '../src/ingestion/payload'
import { loadRatedSeasons } from '../src/ingestion/load'

async function main() {
  const dir = join(process.cwd(), 'data', 'raw')
  if (!existsSync(dir)) {
    throw new Error(`Dossier introuvable: ${dir}. Dépose des CSV (voir le format dans le plan).`)
  }
  const files = readdirSync(dir).filter((f) => f.endsWith('.csv'))
  if (files.length === 0) throw new Error(`Aucun .csv dans ${dir}`)

  const rawRows = files.flatMap((f) => parseSeasonCsv(readFileSync(join(dir, f), 'utf8')))
  const normalized = rawRows.map(toNormalizedRow)
  const rated = rateAllSeasons(normalized)
  const prime = assignPrimeSeasons(rated)
  const payload = buildUpsertPayload(rated, prime)

  const prisma = new PrismaClient()
  try {
    await loadRatedSeasons(prisma, payload)
  } finally {
    await prisma.$disconnect()
  }

  console.log(
    `Ingéré: ${payload.playerSeasons.length} joueur-saisons, ` +
    `${payload.players.length} joueurs, ${payload.clubs.length} clubs (depuis ${files.length} fichier(s)).`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
