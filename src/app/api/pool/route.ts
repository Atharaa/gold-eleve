import { NextResponse } from 'next/server'
import { getPool, PoolMode } from '../../../server/pool'

export async function GET(request: Request) {
  const modeParam = new URL(request.url).searchParams.get('mode')
  const mode: PoolMode = modeParam === 'season' ? 'season' : 'prime'
  const pool = await getPool(mode)
  return NextResponse.json(pool)
}
