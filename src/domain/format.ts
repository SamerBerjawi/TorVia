const UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'] as const

export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  let i = 0
  let v = bytes
  while (v >= 1024 && i < UNITS.length - 1) {
    v /= 1024
    i++
  }
  return `${i === 0 ? v : v.toFixed(digits)} ${UNITS[i]}`
}

export function formatSpeed(bytesPerSecond: number): string {
  return bytesPerSecond > 0 ? `${formatBytes(bytesPerSecond)}/s` : '—'
}

/** qBittorrent reports 8640000 s (100 days) as "infinity". */
export function formatEta(seconds: number): string {
  if (seconds < 0 || seconds >= 8_640_000) return '∞'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m ${seconds % 60}s`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ${m % 60}m`
  return `${Math.floor(h / 24)}d ${h % 24}h`
}

export function formatPercent(fraction: number): string {
  return `${Math.floor(fraction * 1000) / 10}%`
}

export function formatRatio(ratio: number): string {
  return ratio < 0 ? '—' : ratio.toFixed(2)
}
