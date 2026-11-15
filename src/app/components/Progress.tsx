import { formatPercent } from '@/domain/format'

/** Progress in the skin's style. Colour comes from the row's status (`--c`). */
export function Progress({ value, variant }: { value: number; variant: 'bar' | 'segments' }) {
  const pct = Math.max(0, Math.min(1, value))
  return (
    <span className="progress" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.floor(pct * 100)} aria-label="Progress">
      {variant === 'bar' ? (
        <span className="progress__bar" aria-hidden="true"><i style={{ width: `${pct * 100}%` }} /></span>
      ) : (
        <span className="progress__segments" aria-hidden="true">
          {Array.from({ length: 20 }, (_, i) => <i key={i} data-on={i < Math.round(pct * 20) || undefined} />)}
        </span>
      )}
      <span className="progress__pct">{formatPercent(pct)}</span>
    </span>
  )
}
