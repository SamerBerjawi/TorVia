import { ApiError, getJson, post, postOrThrow } from './transport'

export interface SearchPlugin {
  name: string
  fullName: string
  enabled: boolean
  version?: string
  url?: string
  supportedCategories: { id: string; name: string }[]
}
export interface SearchResult {
  fileName: string
  fileUrl: string
  fileSize: number
  nbSeeders: number
  nbLeechers: number
  siteUrl?: string
  descrLink?: string
}
export interface SearchResults { results: SearchResult[]; status: 'Running' | 'Stopped'; total: number }

export const searchApi = {
  plugins: (signal?: AbortSignal) => getJson<SearchPlugin[]>('search/plugins', signal),
  /** Resolves to the new search job id. */
  async start(pattern: string, category: string, plugins: string): Promise<number> {
    const r = await post('search/start', { pattern, category, plugins })
    if (!r.ok) throw new ApiError(r.status === 409 ? 'bad-request' : 'server', r.status, (await r.text()).trim() || 'Search could not start')
    return ((await r.json()) as { id: number }).id
  },
  results: (id: number, signal?: AbortSignal) => getJson<SearchResults>(`search/results?id=${id}&limit=500&offset=0`, signal),
  /** Plugins are downloaded and then run by qBittorrent on the server: callers must have asked the user first. */
  installPlugins: (sources: readonly string[]) => postOrThrow('search/installPlugin', { sources: sources.join('|') }),
  uninstallPlugins: (names: readonly string[]) => postOrThrow('search/uninstallPlugin', { names: names.join('|') }),
  enablePlugins: (names: readonly string[], enable: boolean) => postOrThrow('search/enablePlugin', { names: names.join('|'), enable: String(enable) }),
  /** Asks qBittorrent to check for and fetch newer plugin versions; it finishes in the background. */
  updatePlugins: () => postOrThrow('search/updatePlugins', {}),
  stop: (id: number) => postOrThrow('search/stop', { id: String(id) }),
  remove: (id: number) => postOrThrow('search/delete', { id: String(id) }),
}
