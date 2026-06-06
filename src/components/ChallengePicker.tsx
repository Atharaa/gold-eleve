'use client'

import { listChallenges } from '@/domain/challenges'

export function ChallengePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div>
      {listChallenges().map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className={value === c.id ? 'panel-gold' : 'panel'}
          style={{ display: 'block', width: '100%', textAlign: 'left', marginBottom: 8, cursor: 'pointer', color: '#fff' }}
        >
          <div style={{ fontWeight: 800, fontSize: 13 }} className={value === c.id ? 'txt-gold' : ''}>
            {c.name}
          </div>
          <div className="muted">{c.description}</div>
        </button>
      ))}
    </div>
  )
}
