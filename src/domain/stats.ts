import type { Torrent } from '@/api/types'
import { toStatus, type TorrentStatus } from './status'

/** Aggregations for the Statistics view. Pure; inputs are sync data. */

export const STATUS_ORDER: readonly TorrentStatus[] = [
  'downloading', 'seeding', 'completed', 'stalled', 'queued', 'checking', 'metadata', 'moving', 'stopped', 'error', 'unknown',
]

/** Every torrent counted exactly once, by its display status. Zero buckets are omitted. */
export function statusBreakdown(torrents: Iterable<Torrent>): { status: TorrentStatus; count: number }[] {
  const counts = new Map<TorrentStatus, number>()
  for (const t of torrents) {
    const s = toStatus(t.state)
    counts.set(s, (counts.get(s) ?? 0) + 1)
  }
  return STATUS_ORDER.filter((s) => counts.has(s)).map((status) => ({ status, count: counts.get(status) ?? 0 }))
}

export interface CategoryStat { category: string; count: number; size: number; uploaded: number }

/** Library size per category, largest first. '' = uncategorised. */
export function categoryStats(torrents: Iterable<Torrent>): CategoryStat[] {
  const m = new Map<string, CategoryStat>()
  for (const t of torrents) {
    const k = t.category ?? ''
    const s = m.get(k) ?? { category: k, count: 0, size: 0, uploaded: 0 }
    s.count++
    s.size += t.size
    s.uploaded += t.uploaded ?? 0
    m.set(k, s)
  }
  return [...m.values()].sort((a, b) => b.size - a.size || a.category.localeCompare(b.category))
}

export const RATIO_BUCKETS = [
  { label: '< 0.5', min: 0, max: 0.5 },
  { label: '0.5–1', min: 0.5, max: 1 },
  { label: '1–2', min: 1, max: 2 },
  { label: '2–5', min: 2, max: 5 },
  { label: '≥ 5', min: 5, max: Number.POSITIVE_INFINITY },
] as const

/** Share-ratio distribution over torrents that have finished downloading. */
export function ratioDistribution(torrents: Iterable<Torrent>): { label: string; count: number }[] {
  const counts = RATIO_BUCKETS.map(() => 0)
  for (const t of torrents) {
    if (t.progress < 1) continue
    const r = Math.max(0, t.ratio)
    const i = RATIO_BUCKETS.findIndex((b) => r >= b.min && r < b.max)
    if (i >= 0) counts[i] = (counts[i] ?? 0) + 1
  }
  return RATIO_BUCKETS.map((b, i) => ({ label: b.label, count: counts[i] ?? 0 }))
}

/** Top `n` torrents by a numeric field, excluding zeros. */
export function topBy(torrents: Iterable<[string, Torrent]>, key: 'upspeed' | 'dlspeed' | 'uploaded' | 'size', n: number): [string, Torrent][] {
  return [...torrents].filter(([, t]) => (t[key] ?? 0) > 0).sort((a, b) => (b[1][key] ?? 0) - (a[1][key] ?? 0)).slice(0, n)
}

export function libraryTotals(torrents: Iterable<Torrent>) {
  let size = 0, done = 0, left = 0, uploaded = 0, count = 0
  for (const t of torrents) {
    count++
    size += t.size
    left += t.amount_left ?? 0
    uploaded += t.uploaded ?? 0
    if (t.progress >= 1) done++
  }
  return { count, size, completed: done, remaining: left, uploaded }
}

/** Human duration for stats ("3d 4h", "12m"). */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${Math.max(1, m)}m`
}
