'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModeToggle, Mode } from '@/components/ModeToggle'

export default function Home() {
  const [mode, setMode] = useState<Mode>('prime')
  const router = useRouter()

  return (
    <main className="wrap">
      <h1 className="title">ONZE D&apos;OR</h1>
      <p className="subtitle">2000 – 2026 · Ligue 1 &amp; Ligue 2</p>

      <div style={{ margin: '18px 0 6px' }}>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>
      <p className="subtitle" style={{ marginBottom: 18 }}>
        {mode === 'prime' ? 'Prime = meilleure saison de chaque joueur' : 'Saison = note de la saison de la carte'}
      </p>

      <button className="btn btn-gold" onClick={() => router.push(`/game?mode=${mode}`)}>
        ▶ NOUVELLE PARTIE
      </button>
    </main>
  )
}
