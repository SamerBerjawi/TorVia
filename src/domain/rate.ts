/** Speed-limit input helpers. qBittorrent stores limits in bytes/s; 0 means unlimited. */
export const RATE_UNITS = ['KiB/s', 'MiB/s'] as const
export type RateUnit = (typeof RATE_UNITS)[number]
const FACTOR: Record<RateUnit, number> = { 'KiB/s': 1024, 'MiB/s': 1024 * 1024 }

/** Bytes/s for the text a user typed, 0 for empty (= unlimited), or null if invalid. */
export function parseRate(text: string, unit: RateUnit): number | null {
  const t = text.trim().replace(',', '.')
  if (t === '') return 0
  if (!/^\d+(\.\d+)?$/.test(t)) return null
  return Math.round(Number(t) * FACTOR[unit])
}

/** Chooses the largest unit that shows a whole number, so 5 MiB/s isn't shown as 5120 KiB/s. */
export function splitRate(bytes: number): { text: string; unit: RateUnit } {
  if (!(bytes > 0)) return { text: '', unit: 'KiB/s' }
  if (bytes % FACTOR['MiB/s'] === 0) return { text: String(bytes / FACTOR['MiB/s']), unit: 'MiB/s' }
  return { text: String(Math.round((bytes / 1024) * 1000) / 1000), unit: 'KiB/s' }
}
