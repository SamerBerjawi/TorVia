import type { Preferences } from '@/api/preferences'

/**
 * Which qBittorrent preferences Torvia exposes, and how.
 * Fields whose key the server does not report (older/newer versions) are hidden, never faked.
 * Web UI port, credentials, certificates and host validation are deliberately absent: a wrong value
 * there locks the user out of the very UI they are editing with.
 */
export type FieldType = 'bool' | 'int' | 'float' | 'text' | 'select' | 'rate' | 'timeout'

export interface Field {
  key: string
  section: SectionId
  label: string
  help?: string
  type: FieldType
  /** int/float/rate bounds. */
  min?: number
  max?: number
  unit?: string
  options?: readonly { value: string | number; label: string }[]
  /** Boolean preference that must be on for this field to apply. */
  enabledBy?: string
  /** Extra search words. */
  keywords?: string
}

export const SECTIONS = [
  { id: 'downloads', label: 'Downloads' },
  { id: 'speed', label: 'Speed' },
  { id: 'connection', label: 'Connection' },
  { id: 'queueing', label: 'Queueing' },
  { id: 'seeding', label: 'BitTorrent & seeding' },
  { id: 'signin', label: 'Sign-in' },
  { id: 'advanced', label: 'Advanced' },
] as const
export type SectionId = (typeof SECTIONS)[number]['id']

export const FIELDS: readonly Field[] = [
  { key: 'save_path', section: 'downloads', label: 'Default save path', type: 'text', keywords: 'folder directory location' },
  { key: 'temp_path_enabled', section: 'downloads', label: 'Keep incomplete torrents in another folder', type: 'bool' },
  { key: 'temp_path', section: 'downloads', label: 'Incomplete torrents folder', type: 'text', enabledBy: 'temp_path_enabled' },
  { key: 'auto_tmm_enabled', section: 'downloads', label: 'Automatic torrent management by default', help: 'New torrents follow their category’s save path.', type: 'bool', keywords: 'atm tmm' },
  { key: 'torrent_content_layout', section: 'downloads', label: 'Content layout', type: 'select', options: [{ value: 'Original', label: 'Original' }, { value: 'Subfolder', label: 'Create subfolder' }, { value: 'NoSubfolder', label: 'Don’t create subfolder' }] },
  { key: 'add_stopped_enabled', section: 'downloads', label: 'Add new torrents stopped', type: 'bool', keywords: 'paused' },
  { key: 'start_paused_enabled', section: 'downloads', label: 'Add new torrents paused', type: 'bool', keywords: 'stopped' },
  { key: 'torrent_stop_condition', section: 'downloads', label: 'Stop torrent when', type: 'select', options: [{ value: 'None', label: 'Never' }, { value: 'MetadataReceived', label: 'Metadata received' }, { value: 'FilesChecked', label: 'Files checked' }] },
  { key: 'preallocate_all', section: 'downloads', label: 'Pre-allocate disk space for all files', type: 'bool' },
  { key: 'incomplete_files_ext', section: 'downloads', label: 'Add .!qB extension to incomplete files', type: 'bool' },

  { key: 'dl_limit', section: 'speed', label: 'Download limit', help: '0 means unlimited.', type: 'rate', min: 0, unit: 'KiB/s', keywords: 'bandwidth' },
  { key: 'up_limit', section: 'speed', label: 'Upload limit', help: '0 means unlimited.', type: 'rate', min: 0, unit: 'KiB/s', keywords: 'bandwidth' },
  { key: 'alt_dl_limit', section: 'speed', label: 'Alternative download limit', type: 'rate', min: 0, unit: 'KiB/s', keywords: 'turtle' },
  { key: 'alt_up_limit', section: 'speed', label: 'Alternative upload limit', type: 'rate', min: 0, unit: 'KiB/s', keywords: 'turtle' },
  { key: 'scheduler_enabled', section: 'speed', label: 'Schedule alternative limits', type: 'bool' },
  { key: 'limit_utp_rate', section: 'speed', label: 'Apply limits to µTP', type: 'bool' },
  { key: 'limit_tcp_overhead', section: 'speed', label: 'Apply limits to transport overhead', type: 'bool' },
  { key: 'limit_lan_peers', section: 'speed', label: 'Apply limits to peers on the LAN', type: 'bool' },

  { key: 'listen_port', section: 'connection', label: 'Listening port', type: 'int', min: 0, max: 65535 },
  { key: 'upnp', section: 'connection', label: 'UPnP / NAT-PMP port forwarding', type: 'bool' },
  { key: 'random_port', section: 'connection', label: 'Random port on each start', type: 'bool' },
  { key: 'max_connec', section: 'connection', label: 'Max connections (global)', help: '-1 means unlimited.', type: 'int', min: -1 },
  { key: 'max_connec_per_torrent', section: 'connection', label: 'Max connections per torrent', type: 'int', min: -1 },
  { key: 'max_uploads', section: 'connection', label: 'Max upload slots (global)', type: 'int', min: -1 },
  { key: 'max_uploads_per_torrent', section: 'connection', label: 'Max upload slots per torrent', type: 'int', min: -1 },

  { key: 'queueing_enabled', section: 'queueing', label: 'Enable torrent queueing', type: 'bool' },
  { key: 'max_active_downloads', section: 'queueing', label: 'Max active downloads', type: 'int', min: -1, enabledBy: 'queueing_enabled' },
  { key: 'max_active_uploads', section: 'queueing', label: 'Max active uploads', type: 'int', min: -1, enabledBy: 'queueing_enabled' },
  { key: 'max_active_torrents', section: 'queueing', label: 'Max active torrents', type: 'int', min: -1, enabledBy: 'queueing_enabled' },
  { key: 'dont_count_slow_torrents', section: 'queueing', label: 'Don’t count slow torrents in these limits', type: 'bool', enabledBy: 'queueing_enabled' },

  { key: 'dht', section: 'seeding', label: 'Enable DHT', type: 'bool', keywords: 'peer discovery' },
  { key: 'pex', section: 'seeding', label: 'Enable peer exchange (PeX)', type: 'bool' },
  { key: 'lsd', section: 'seeding', label: 'Enable local peer discovery', type: 'bool' },
  { key: 'encryption', section: 'seeding', label: 'Encryption mode', type: 'select', options: [{ value: 0, label: 'Prefer encryption' }, { value: 1, label: 'Require encryption' }, { value: 2, label: 'Disable encryption' }] },
  { key: 'anonymous_mode', section: 'seeding', label: 'Anonymous mode', type: 'bool', keywords: 'privacy' },
  { key: 'max_ratio_enabled', section: 'seeding', label: 'Limit share ratio', type: 'bool' },
  { key: 'max_ratio', section: 'seeding', label: 'Share ratio limit', type: 'float', min: 0, enabledBy: 'max_ratio_enabled' },
  { key: 'max_seeding_time_enabled', section: 'seeding', label: 'Limit seeding time', type: 'bool' },
  { key: 'max_seeding_time', section: 'seeding', label: 'Seeding time limit', type: 'int', min: 0, unit: 'minutes', enabledBy: 'max_seeding_time_enabled' },

  {
    key: 'web_ui_session_timeout', section: 'signin', label: 'Sign out after being idle', type: 'timeout',
    help: 'How long a sign-in lasts without any activity. Torvia keeps the session alive while it is open, so this mostly applies after you close the tab or your device sleeps. “Never” keeps you signed in until you sign out: use it only on devices you trust.',
    keywords: 'session logout log out sign out idle inactivity expire timeout cookie stay signed in',
  },
  { key: 'announce_to_all_trackers', section: 'advanced', label: 'Announce to all trackers in a tier', type: 'bool' },
  { key: 'announce_to_all_tiers', section: 'advanced', label: 'Announce to all tiers', type: 'bool' },
  { key: 'recheck_completed_torrents', section: 'advanced', label: 'Recheck torrents on completion', type: 'bool' },
  { key: 'resolve_peer_countries', section: 'advanced', label: 'Resolve peer countries', type: 'bool' },
  { key: 'save_resume_data_interval', section: 'advanced', label: 'Save resume data every', type: 'int', min: 0, unit: 'minutes' },
]

export type Draft = Preferences

/** Fields the connected server actually supports, optionally narrowed by a search query. */
export function visibleFields(prefs: Preferences, query = ''): Field[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return FIELDS.filter((f) => {
    if (!(f.key in prefs)) return false
    if (words.length === 0) return true
    const hay = `${f.label} ${f.help ?? ''} ${f.keywords ?? ''} ${f.key} ${SECTIONS.find((s) => s.id === f.section)?.label ?? ''}`.toLowerCase()
    return words.every((w) => hay.includes(w))
  })
}

/** Keys whose draft value differs from what the server reported. */
export function diffPrefs(original: Preferences, draft: Draft): Preferences {
  const out: Preferences = {}
  for (const [k, v] of Object.entries(draft)) if (original[k] !== v) out[k] = v
  return out
}

/** Returns an error message, or null when the value is acceptable. */
export function validateField(f: Field, value: string | number | boolean | undefined): string | null {
  if (f.type === 'bool' || f.type === 'select') return null
  if (f.type === 'timeout') {
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'Enter a number of minutes'
    if (value <= 0) return null // 0 = never sign out
    if (value < IDLE_MIN_SECONDS) return 'At least 1 minute'
    if (value > IDLE_MAX_SECONDS) return 'At most 1 year (525,600 minutes)'
    return null
  }
  if (f.type === 'text') return typeof value === 'string' && value.trim() === '' && f.key !== 'temp_path' ? 'Required' : null
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Enter a number'
  if (f.type !== 'float' && f.type !== 'rate' && !Number.isInteger(value)) return 'Enter a whole number'
  if (f.min !== undefined && value < f.min) return `At least ${f.min}`
  if (f.max !== undefined && value > f.max) return `At most ${f.max}`
  return null
}

/** Idle sign-out is seconds on the wire and minutes on screen; 0 (or less) means the session never expires. */
export const IDLE_MIN_SECONDS = 60
export const IDLE_MAX_SECONDS = 365 * 24 * 3600
export const IDLE_DEFAULT_SECONDS = 3600
/** Minutes for display (up to two decimals), or null when sessions never expire. */
export const idleMinutes = (seconds: number): number | null => (seconds <= 0 ? null : Math.round((seconds / 60) * 100) / 100)
export const idleSeconds = (minutes: number): number => Math.round(minutes * 60)

/** `rate` fields are bytes/s on the wire and KiB/s on screen. */
export const toDisplay = (f: Field, v: number) => (f.type === 'rate' ? Math.round(v / 1024) : v)
export const fromDisplay = (f: Field, v: number) => (f.type === 'rate' ? Math.round(v * 1024) : v)

/** A dependent field is inactive while its controlling toggle is off in the draft. */
export const isActive = (f: Field, draft: Draft): boolean => f.enabledBy === undefined || draft[f.enabledBy] === true
