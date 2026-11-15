import type { Capabilities } from './capabilities'
import { ApiError, getText, postOrThrow, request } from './transport'

/** Typed torrent/transfer mutations. `hashes` may be ['all'] where qBittorrent allows it. */
const h = (hashes: readonly string[]) => hashes.join('|')

export const torrentsApi = {
  start: (hashes: readonly string[]) => postOrThrow('torrents/start', { hashes: h(hashes) }),
  stop: (hashes: readonly string[]) => postOrThrow('torrents/stop', { hashes: h(hashes) }),
  setForceStart: (hashes: readonly string[], value: boolean) => postOrThrow('torrents/setForceStart', { hashes: h(hashes), value: String(value) }),
  recheck: (hashes: readonly string[]) => postOrThrow('torrents/recheck', { hashes: h(hashes) }),
  reannounce: (hashes: readonly string[]) => postOrThrow('torrents/reannounce', { hashes: h(hashes) }),
  delete: (hashes: readonly string[], deleteFiles: boolean) => postOrThrow('torrents/delete', { hashes: h(hashes), deleteFiles: String(deleteFiles) }),
  setLocation: (hashes: readonly string[], location: string) => postOrThrow('torrents/setLocation', { hashes: h(hashes), location }),
  rename: (hash: string, name: string) => postOrThrow('torrents/rename', { hash, name }),
  setCategory: (hashes: readonly string[], category: string) => postOrThrow('torrents/setCategory', { hashes: h(hashes), category }),
  addTags: (hashes: readonly string[], tags: readonly string[]) => postOrThrow('torrents/addTags', { hashes: h(hashes), tags: tags.join(',') }),
  removeTags: (hashes: readonly string[], tags: readonly string[]) => postOrThrow('torrents/removeTags', { hashes: h(hashes), tags: tags.join(',') }),
  createCategory: (category: string, savePath: string) => postOrThrow('torrents/createCategory', { category, savePath }),
  editCategory: (category: string, savePath: string) => postOrThrow('torrents/editCategory', { category, savePath }),
  removeCategories: (categories: readonly string[]) => postOrThrow('torrents/removeCategories', { categories: categories.join('\n') }),
  createTags: (tags: readonly string[]) => postOrThrow('torrents/createTags', { tags: tags.join(',') }),
  deleteTags: (tags: readonly string[]) => postOrThrow('torrents/deleteTags', { tags: tags.join(',') }),
  queue: (hashes: readonly string[], move: 'topPrio' | 'increasePrio' | 'decreasePrio' | 'bottomPrio') => postOrThrow(`torrents/${move}`, { hashes: h(hashes) }),
  /** Bytes per second; 0 = unlimited. */
  setDownloadLimit: (hashes: readonly string[], limit: number) => postOrThrow('torrents/setDownloadLimit', { hashes: h(hashes), limit: String(Math.max(0, Math.round(limit))) }),
  setUploadLimit: (hashes: readonly string[], limit: number) => postOrThrow('torrents/setUploadLimit', { hashes: h(hashes), limit: String(Math.max(0, Math.round(limit))) }),
  toggleSequentialDownload: (hashes: readonly string[]) => postOrThrow('torrents/toggleSequentialDownload', { hashes: h(hashes) }),
  toggleFirstLastPiecePrio: (hashes: readonly string[]) => postOrThrow('torrents/toggleFirstLastPiecePrio', { hashes: h(hashes) }),
  setSuperSeeding: (hashes: readonly string[], value: boolean) => postOrThrow('torrents/setSuperSeeding', { hashes: h(hashes), value: String(value) }),
  setAutoManagement: (hashes: readonly string[], enable: boolean) => postOrThrow('torrents/setAutoManagement', { hashes: h(hashes), enable: String(enable) }),
}

export const transferApi = {
  toggleSpeedLimitsMode: () => postOrThrow('transfer/toggleSpeedLimitsMode', {}),
  pauseSession: () => postOrThrow('transfer/pauseSession', {}),
  resumeSession: () => postOrThrow('transfer/resumeSession', {}),
}

export const appApi = {
  webapiVersion: () => getText('app/webapiVersion'),
  version: () => getText('app/version'),
  defaultSavePath: () => getText('app/defaultSavePath'),
}

export interface AddOptions {
  urls: readonly string[]
  files: readonly File[]
  savepath: string
  category: string
  tags: readonly string[]
  start: boolean
  skipChecking: boolean
  sequential: boolean
  firstLastPiece: boolean
  addToTop: boolean
  contentLayout: 'Original' | 'Subfolder' | 'NoSubfolder'
  /** undefined = follow the server's default Automatic Torrent Management setting. */
  autoTMM: boolean | undefined
}

/** Builds the multipart body for torrents/add, honouring version differences. Pure. */
export function buildAddForm(o: AddOptions, caps: Pick<Capabilities, 'seedMode'>): FormData {
  const f = new FormData()
  if (o.urls.length) f.append('urls', o.urls.join('\n'))
  for (const file of o.files) f.append('torrents', file, file.name)
  if (o.savepath.trim()) f.append('savepath', o.savepath.trim())
  if (o.category) f.append('category', o.category)
  if (o.tags.length) f.append('tags', o.tags.join(','))
  // 5.x reads `stopped`; 5.0-era servers documented `paused`. Unknown params are ignored, so send both.
  f.append('stopped', String(!o.start))
  f.append('paused', String(!o.start))
  if (o.skipChecking) f.append(caps.seedMode ? 'seedMode' : 'skip_checking', 'true')
  if (o.sequential) f.append('sequentialDownload', 'true')
  if (o.firstLastPiece) f.append('firstLastPiecePrio', 'true')
  if (o.addToTop) f.append('addToTopOfQueue', 'true')
  if (o.contentLayout !== 'Original') f.append('contentLayout', o.contentLayout)
  if (o.autoTMM !== undefined) f.append('autoTMM', String(o.autoTMM))
  return f
}

export interface AddResult { added: number; pending: number; failed: number }

/** Interprets torrents/add for both response styles (text "Ok."/"Fails." or JSON counts). */
export async function addTorrents(o: AddOptions, caps: Capabilities): Promise<AddResult> {
  const total = o.urls.length + o.files.length
  let res: Response
  try {
    res = await fetch('api/v2/torrents/add', { method: 'POST', body: buildAddForm(o, caps), credentials: 'same-origin', cache: 'no-store' })
  } catch {
    throw new ApiError('network', 0, 'Cannot reach qBittorrent')
  }
  const text = (await res.text().catch(() => '')).trim()
  return parseAddResponse(res.status, text, total)
}

export function parseAddResponse(status: number, body: string, total: number): AddResult {
  if (status === 401 || status === 403) throw new ApiError(status === 401 ? 'unauthenticated' : 'forbidden', status, 'Not signed in')
  if (body.startsWith('{')) {
    try {
      const j = JSON.parse(body) as { success_count?: number; pending_count?: number; failure_count?: number }
      return { added: j.success_count ?? 0, pending: j.pending_count ?? 0, failed: j.failure_count ?? 0 }
    } catch {
      // fall through to status handling
    }
  }
  if (status >= 200 && status < 300) return body === 'Fails.' ? { added: 0, pending: 0, failed: total } : { added: total, pending: 0, failed: 0 }
  if (status === 409) return { added: 0, pending: 0, failed: total }
  throw new ApiError(status >= 500 ? 'server' : 'bad-request', status, body || `HTTP ${status}`)
}

/** Request helper re-export for callers that need raw responses. */
export { request }
