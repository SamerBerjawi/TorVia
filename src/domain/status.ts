/**
 * Maps qBittorrent's raw torrent state strings to a stable UI status.
 * 5.x renamed paused* -> stopped*; both spellings are accepted.
 */
export type TorrentStatus =
  | 'downloading' | 'seeding' | 'completed' | 'stopped' | 'queued'
  | 'stalled' | 'checking' | 'metadata' | 'moving' | 'error' | 'unknown'

export function toStatus(raw: string): TorrentStatus {
  switch (raw) {
    case 'downloading': case 'forcedDL': return 'downloading'
    case 'uploading': case 'forcedUP': return 'seeding'
    case 'stalledUP': return 'seeding'
    case 'stalledDL': return 'stalled'
    case 'stoppedUP': case 'pausedUP': return 'completed'
    case 'stoppedDL': case 'pausedDL': return 'stopped'
    case 'queuedDL': case 'queuedUP': return 'queued'
    case 'checkingDL': case 'checkingUP': case 'checkingResumeData': return 'checking'
    case 'metaDL': case 'forcedMetaDL': return 'metadata'
    case 'moving': return 'moving'
    case 'error': case 'missingFiles': return 'error'
    default: return 'unknown'
  }
}

export const STATUS_LABEL: Record<TorrentStatus, string> = {
  downloading: 'Downloading', seeding: 'Seeding', completed: 'Completed', stopped: 'Stopped',
  queued: 'Queued', stalled: 'Stalled', checking: 'Checking', metadata: 'Metadata',
  moving: 'Moving', error: 'Error', unknown: 'Unknown',
}
