import type { SearchPlugin } from '@/api/search'

/**
 * qBittorrent's own search-plugin repository. Plugins are Python scripts that qBittorrent downloads and then RUNS on
 * the server, so Torvia only offers this fixed list with one click; anything else needs an explicit URL and a warning.
 */
export const OFFICIAL_REPO = 'https://raw.githubusercontent.com/qbittorrent/search-plugins/master/nova3/engines'

export interface OfficialPlugin { id: string; label: string; note: string }
export const OFFICIAL_PLUGINS: readonly OfficialPlugin[] = [
  { id: 'piratebay', label: 'The Pirate Bay', note: 'General purpose' },
  { id: 'eztv', label: 'EZTV', note: 'TV shows' },
  { id: 'limetorrents', label: 'LimeTorrents', note: 'General purpose' },
  { id: 'solidtorrents', label: 'SolidTorrents', note: 'General purpose' },
  { id: 'torlock', label: 'Torlock', note: 'General purpose' },
  { id: 'torrentproject', label: 'TorrentProject', note: 'General purpose' },
  { id: 'torrentscsv', label: 'Torrents-CSV', note: 'General purpose, open database' },
  { id: 'jackett', label: 'Jackett', note: 'Needs a Jackett server and its API key set up in the plugin file' },
]

export const officialUrl = (id: string): string => `${OFFICIAL_REPO}/${id}.py`

/** Official plugins that are not installed yet (installed plugins are matched by their short name). */
export const notInstalled = (installed: readonly Pick<SearchPlugin, 'name'>[]): OfficialPlugin[] => {
  const have = new Set(installed.map((p) => p.name.toLowerCase()))
  return OFFICIAL_PLUGINS.filter((o) => !have.has(o.id))
}

/** A custom plugin must be a plain https link to a .py file. Returns an error message, or null when acceptable. */
export function validatePluginUrl(text: string): string | null {
  const t = text.trim()
  if (t === '') return 'Enter the address of a plugin (.py file)'
  let u: URL
  try { u = new URL(t) } catch { return 'That is not a web address' }
  if (u.protocol !== 'https:') return 'Only https:// addresses are accepted'
  if (!/\.py$/i.test(u.pathname)) return 'A search plugin is a .py file'
  if (t.includes('|')) return 'Install one plugin at a time'
  return null
}

/** qBittorrent splits `sources` on "|". */
export const sourcesParam = (urls: readonly string[]): string => urls.join('|')
