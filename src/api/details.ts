import { getJson, postOrThrow } from './transport'

export interface TorrentFile {
  index: number
  name: string
  size: number
  progress: number
  /** 0 = skip, 1 = normal, 6 = high, 7 = maximal */
  priority: number
  availability?: number
}
export interface Tracker {
  url: string
  /** 0 disabled, 1 not contacted, 2 working, 3 updating, 4 not working */
  status: number
  tier: number
  num_peers: number
  num_seeds: number
  num_leeches: number
  num_downloaded: number
  msg: string
}
export interface Peer {
  ip: string
  port: number
  client?: string
  connection?: string
  country_code?: string
  /** Display name, e.g. "Belgium". */
  country?: string
  dl_speed: number
  up_speed: number
  downloaded: number
  uploaded: number
  progress: number
  flags?: string
}
export type FilePriority = 0 | 1 | 6 | 7

const q = (hash: string) => `hash=${encodeURIComponent(hash)}`

export const detailsApi = {
  renameFile: (hash: string, oldPath: string, newPath: string) => postOrThrow('torrents/renameFile', { hash, oldPath, newPath }),
  renameFolder: (hash: string, oldPath: string, newPath: string) => postOrThrow('torrents/renameFolder', { hash, oldPath, newPath }),
  files: (hash: string, signal?: AbortSignal) => getJson<TorrentFile[]>(`torrents/files?${q(hash)}`, signal),
  trackers: (hash: string, signal?: AbortSignal) => getJson<Tracker[]>(`torrents/trackers?${q(hash)}`, signal),
  /** Full peer list every call (rid=0); torrents rarely have more than a few hundred peers. */
  async peers(hash: string, signal?: AbortSignal): Promise<Peer[]> {
    const r = await getJson<{ peers?: Record<string, Omit<Peer, 'ip' | 'port'> & { ip?: string; port?: number }> }>(`sync/torrentPeers?${q(hash)}&rid=0`, signal)
    return Object.entries(r.peers ?? {}).map(([key, p]) => {
      const i = key.lastIndexOf(':')
      return { ...p, ip: p.ip ?? key.slice(0, i), port: p.port ?? Number(key.slice(i + 1)) } as Peer
    })
  },
  setFilePriority: (hash: string, ids: readonly number[], priority: FilePriority) =>
    postOrThrow('torrents/filePrio', { hash, id: ids.join('|'), priority: String(priority) }),
}
