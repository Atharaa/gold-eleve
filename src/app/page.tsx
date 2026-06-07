'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModeToggle, Mode } from '@/components/ModeToggle'
import { ChallengePicker } from '@/components/ChallengePicker'
import { FormationPicker } from '@/components/FormationPicker'

export default function Home() {
  const [mode, setMode] = useState<Mode>('prime')
  const [challenge, setChallenge] = useState('libre')
  const [formation, setFormation] = useState('4-3-3')
  const router = useRouter()

  return (
    <main className="wrap">
      <h1 className="title">ONZE D&apos;OR</h1>
      <p className="subtitle">2000 – 2026 · Ligue 1 &amp; Ligue 2</p>

      <div style={{ margin: '18px 0 6px' }}>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>
      <p className="subtitle" style={{ marginBottom: 14 }}>
        {mode === 'prime' ? 'Prime = meilleure saison de chaque joueur' : 'Saison = note de la saison de la carte'}
      </p>

      <div className="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        Formation
      </div>
      <div style={{ marginBottom: 14 }}>
        <FormationPicker value={formation} onChange={setFormation} />
      </div>

      <div className="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
        Choisis ton défi
      </div>
      <ChallengePicker value={challenge} onChange={setChallenge} />

      <button
        className="btn btn-gold"
        style={{ marginTop: 8 }}
        onClick={() => router.push(`/game?mode=${mode}&challenge=${challenge}&formation=${formation}`)}
      >
        ▶ NOUVELLE PARTIE
      </button>
    </main>
  )
}
