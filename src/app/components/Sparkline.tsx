/** Tiny live line chart for transfer speed. Decorative: the numeric value is always shown next to it. */
export function Sparkline({ values, width = 64, height = 18, className }: { values: readonly number[]; width?: number; height?: number; className?: string }) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden="true" className={className} />
  const max = Math.max(...values, 1)
  const step = width / (values.length - 1)
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 1 - (v / max) * (height - 2)).toFixed(1)}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className={className}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
