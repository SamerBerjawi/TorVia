import type { RssArticle, RssItemsResponse } from '@/api/rss'

export interface RssNode {
  kind: 'feed' | 'folder'
  name: string
  /** Slash-joined path as qBittorrent addresses it. */
  path: string
  depth: number
  url?: string
  articles: RssArticle[]
  unread: number
  children: RssNode[]
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

function toArticle(a: unknown): RssArticle | null {
  if (!isObject(a)) return null
  const id = typeof a['id'] === 'string' ? a['id'] : undefined
  const title = typeof a['title'] === 'string' ? a['title'] : undefined
  if (id === undefined || title === undefined) return null
  const str = (k: string) => (typeof a[k] === 'string' && a[k] !== '' ? (a[k] as string) : undefined)
  const out: RssArticle = { id, title, isRead: a['isRead'] === true }
  for (const k of ['description', 'date', 'link', 'torrentURL'] as const) { const v = str(k); if (v !== undefined) out[k] = v }
  return out
}

/** Turns `rss/items?withData=true` into a sorted tree. Anything unexpected is skipped, never thrown. */
export function parseRssTree(raw: RssItemsResponse, parent = '', depth = 0): RssNode[] {
  const nodes: RssNode[] = []
  for (const [name, value] of Object.entries(raw)) {
    if (!isObject(value)) continue
    const path = parent ? `${parent}\\${name}` : name
    if (typeof value['url'] === 'string') {
      const articles = (Array.isArray(value['articles']) ? value['articles'] : []).map(toArticle).filter((a): a is RssArticle => a !== null)
      articles.sort((a, b) => (Date.parse(b.date ?? '') || 0) - (Date.parse(a.date ?? '') || 0))
      nodes.push({ kind: 'feed', name, path, depth, url: value['url'], articles, unread: articles.filter((a) => !a.isRead).length, children: [] })
    } else {
      const children = parseRssTree(value as RssItemsResponse, path, depth + 1)
      nodes.push({ kind: 'folder', name, path, depth, articles: [], unread: children.reduce((n, c) => n + c.unread, 0), children })
    }
  }
  return nodes.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, undefined, { numeric: true }) : a.kind === 'folder' ? -1 : 1))
}

export const flattenFeeds = (nodes: readonly RssNode[]): RssNode[] => nodes.flatMap((n) => (n.kind === 'feed' ? [n] : flattenFeeds(n.children)))
export const flattenTree = (nodes: readonly RssNode[]): RssNode[] => nodes.flatMap((n) => [n, ...flattenTree(n.children)])

/** Articles under a node (a feed's own, or every feed below a folder), newest first. */
export function articlesOf(node: RssNode | undefined, all: readonly RssNode[]): (RssArticle & { feed: RssNode })[] {
  const feeds = node ? (node.kind === 'feed' ? [node] : flattenFeeds(node.children)) : flattenFeeds(all)
  return feeds.flatMap((f) => f.articles.map((a) => ({ ...a, feed: f }))).sort((a, b) => (Date.parse(b.date ?? '') || 0) - (Date.parse(a.date ?? '') || 0))
}

/** What to hand torrents/add for an article, or null when it has no usable link. */
export const downloadLink = (a: Pick<RssArticle, 'torrentURL' | 'link'>): string | null => a.torrentURL || (a.link && /^(magnet:|https?:)/i.test(a.link) ? a.link : null) || null

/** Rule edits: trims text, keeps unknown keys from the server's definition. */
export function ruleDefinition<T extends Record<string, unknown>>(base: T, patch: Partial<Record<string, unknown>>): T {
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(patch)) clean[k] = typeof v === 'string' ? v.trim() : v
  return { ...base, ...clean }
}
