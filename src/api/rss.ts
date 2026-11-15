import { getJson, postOrThrow } from './transport'

export interface RssArticle {
  id: string
  title: string
  description?: string
  date?: string
  link?: string
  torrentURL?: string
  isRead?: boolean
}
/** Feeds carry `url`; folders are plain objects of children. Unknown keys are preserved. */
export type RssItemsResponse = Record<string, unknown>

export interface RssRule {
  enabled: boolean
  mustContain: string
  mustNotContain: string
  useRegex: boolean
  episodeFilter: string
  affectedFeeds: string[]
  assignedCategory: string
  savePath: string
  [key: string]: unknown
}

export const rssApi = {
  items: (signal?: AbortSignal) => getJson<RssItemsResponse>('rss/items?withData=true', signal),
  addFeed: (url: string, path: string) => postOrThrow('rss/addFeed', { url, path }),
  addFolder: (path: string) => postOrThrow('rss/addFolder', { path }),
  removeItem: (path: string) => postOrThrow('rss/removeItem', { path }),
  refreshItem: (itemPath: string) => postOrThrow('rss/refreshItem', { itemPath }),
  markAsRead: (itemPath: string, articleId?: string) => postOrThrow('rss/markAsRead', articleId === undefined ? { itemPath } : { itemPath, articleId }),
  rules: (signal?: AbortSignal) => getJson<Record<string, RssRule>>('rss/rules', signal),
  setRule: (ruleName: string, def: RssRule) => postOrThrow('rss/setRule', { ruleName, ruleDef: JSON.stringify(def) }),
  removeRule: (ruleName: string) => postOrThrow('rss/removeRule', { ruleName }),
}
