import type { Torrent } from '@/api/types'

/** Sidebar / segmented-control status views. Mirrors qBittorrent's own filter semantics where they exist. */
export const STATUS_FILTERS = [
  'all', 'downloading', 'seeding', 'completed', 'running', 'stopped', 'active', 'stalled', 'checking', 'errored',
] as const
export type StatusFilter = (typeof STATUS_FILTERS)[number]

export const STATUS_FILTER_LABEL: Record<StatusFilter, string> = {
  all: 'All', downloading: 'Downloading', seeding: 'Seeding', completed: 'Completed', running: 'Running',
  stopped: 'Stopped', active: 'Active', stalled: 'Stalled', checking: 'Checking', errored: 'Errored',
}

const DOWNLOADING = new Set(['downloading', 'forcedDL', 'stalledDL', 'metaDL', 'forcedMetaDL', 'queuedDL', 'checkingDL'])
const SEEDING = new Set(['uploading', 'forcedUP', 'stalledUP', 'queuedUP', 'checkingUP'])
const STOPPED = new Set(['stoppedDL', 'stoppedUP', 'pausedDL', 'pausedUP'])
const STALLED = new Set(['stalledDL', 'stalledUP'])
const CHECKING = new Set(['checkingDL', 'checkingUP', 'checkingResumeData'])
const ERRORED = new Set(['error', 'missingFiles'])

export function matchesStatus(filter: StatusFilter, t: Pick<Torrent, 'state' | 'progress' | 'dlspeed' | 'upspeed'>): boolean {
  switch (filter) {
    case 'all': return true
    case 'downloading': return DOWNLOADING.has(t.state)
    case 'seeding': return SEEDING.has(t.state)
    case 'completed': return t.progress >= 1
    case 'running': return !STOPPED.has(t.state)
    case 'stopped': return STOPPED.has(t.state)
    case 'active': return t.dlspeed > 0 || t.upspeed > 0
    case 'stalled': return STALLED.has(t.state)
    case 'checking': return CHECKING.has(t.state)
    case 'errored': return ERRORED.has(t.state)
  }
}

export function countByStatus(torrents: Iterable<Torrent>): Record<StatusFilter, number> {
  const counts = Object.fromEntries(STATUS_FILTERS.map((f) => [f, 0])) as Record<StatusFilter, number>
  for (const t of torrents) for (const f of STATUS_FILTERS) if (matchesStatus(f, t)) counts[f]++
  return counts
}

export function splitTags(tags: string): string[] {
  return tags ? tags.split(',').map((s) => s.trim()).filter(Boolean) : []
}

export function countByKey(torrents: Iterable<Torrent>, key: (t: Torrent) => readonly string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const t of torrents) for (const k of key(t)) counts.set(k, (counts.get(k) ?? 0) + 1)
  return counts
}
