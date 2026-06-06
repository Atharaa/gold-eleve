'use client'

export type Mode = 'prime' | 'season'

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="toggle">
      <button className={mode === 'prime' ? 'active' : ''} onClick={() => onChange('prime')}>
        PRIME
      </button>
      <button className={mode === 'season' ? 'active' : ''} onClick={() => onChange('season')}>
        SAISON
      </button>
    </div>
  )
}
