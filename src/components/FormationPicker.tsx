'use client'

import { FORMATION_NAMES } from '@/domain/game'

export function FormationPicker({ value, onChange }: { value: string; onChange: (f: string) => void }) {
  return (
    <div className="toggle" style={{ flexWrap: 'wrap', gap: 4 }}>
      {FORMATION_NAMES.map((name) => (
        <button key={name} className={value === name ? 'active' : ''} onClick={() => onChange(name)}>
          {name}
        </button>
      ))}
    </div>
  )
}
