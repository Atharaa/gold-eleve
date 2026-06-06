export function ReliabilityDots({ level }: { level: 1 | 2 | 3 | 4 }) {
  const label = level >= 3 ? 'fiable' : 'estimée'
  const cls = level >= 3 ? 'txt-green' : 'txt-amber'
  return (
    <span className={cls} style={{ fontSize: 9 }}>
      {'●'.repeat(level)}
      {'○'.repeat(4 - level)} {label}
    </span>
  )
}
