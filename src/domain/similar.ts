/** Turns a release or file name into a search query for finding other torrents of the same content. Pure. */

// Technical tags that identify a particular encode, not the title. Everything from the first one onward is dropped.
const NOISE = new RegExp(
  '^(?:' + [
    '2160p', '1440p', '1080[pi]', '720p', '576p', '480p', '360p', '4k', 'uhd', 'hdr10\\+?', 'hdr', 'dv', 'sdr',
    'web-?dl', 'web-?rip', 'webrip', 'web', 'blu-?ray', 'bdrip', 'brrip', 'bdremux', 'remux', 'dvdrip', 'dvd', 'hdtv', 'hdrip', 'cam', 'ts',
    'x26[45]', 'h26[45]', 'hevc', 'avc', 'xvid', 'divx', 'av1', 'vp9', '10bits?', '8bits?',
    'aac\\d*', 'ac-?3', 'e-?ac-?3', 'ddp?\\d*', 'dts(?:-?hd)?', 'truehd', 'atmos', 'flac', 'mp3', 'opus', '\\d(?:\\.\\d)?ch',
    'proper', 'repack', 'internal', 'extended', 'unrated', 'remastered', 'multi', 'dual', 'subs?', 'subbed', 'dubbed', 'complete',
    'amzn', 'nf', 'dsnp', 'hmax', 'atvp', 'hulu', 'pcok', 'yify', 'yts', 'rarbg',
  ].join('|') + ')$',
  'i',
)
const EXTENSION = /\.(?:mkv|mp4|m4v|avi|mov|wmv|webm|ts|m2ts|iso|img|bin|rar|zip|7z|tar|gz|flac|mp3|m4a|m4b|ogg|opus|wav|epub|mobi|azw3?|pdf|cbz|cbr|srt|ass|sub|nfo|exe|msi|dmg|apk|deb|rpm)$/i
const MAX_WORDS = 8

/**
 * "Open.Movie.Sintel.2010.2160p.WEB-DL.x265-GROUP.mkv" → "Open Movie Sintel 2010".
 * Keeps the title, year and episode markers (S01E02); drops [bracket] tags, encode details and the release group.
 */
export function searchQueryFromName(name: string): string {
  let s = name.trim().replace(EXTENSION, '')
  s = s.replace(/\[[^\]]*\]/g, ' ')                                  // [GROUP][WEB-DL]
  s = s.replace(/\(([^)]*)\)/g, (_, inner: string) => (/^(?:19|20)\d{2}$/.test(inner.trim()) ? ` ${inner.trim()} ` : ' ')) // keep "(2010)", drop other (…)
  const tokens = s.split(/[\s._]+/).map((t) => t.replace(/^[-–—]+|[-–—]+$/g, '')).filter(Boolean)
  const cut = tokens.findIndex((t, i) => i > 0 && NOISE.test(t))
  const kept = (cut === -1 ? tokens : tokens.slice(0, cut)).filter((t) => !/^-+$/.test(t))
  // No encode tags to cut at: a trailing "-GROUP" on a dotted name is still the release group.
  if (cut === -1 && kept.length > 3) {
    const last = kept[kept.length - 1] ?? ''
    if (/^[A-Za-z0-9]+-[A-Za-z0-9]+$/.test(name.trim().split(/[.\s_]/).pop() ?? '') && !/^S\d+E\d+$/i.test(last)) kept[kept.length - 1] = last.split('-')[0] ?? last
  }
  return kept.slice(0, MAX_WORDS).join(' ').trim()
}

/** A hash-route to the Search page pre-filled with a query (and optionally the size, in bytes, to look for). */
export function searchHash(query: string, sizeBytes?: number): string {
  const p = new URLSearchParams({ q: query })
  if (sizeBytes !== undefined && Number.isFinite(sizeBytes) && sizeBytes > 0) p.set('size', String(Math.round(sizeBytes)))
  return `#/search?${p.toString()}`
}

/** Reads `q` and `size` back from a hash such as "#/search?q=a+b&size=12". Null when there is no usable query. */
export function parseSearchHash(hash: string): { query: string; size: number | null } | null {
  const m = /^#\/search\?(.*)$/.exec(hash)
  if (!m) return null
  const p = new URLSearchParams(m[1])
  const query = (p.get('q') ?? '').trim().slice(0, 200)
  if (!query) return null
  const size = Number(p.get('size'))
  return { query, size: Number.isInteger(size) && size > 0 ? size : null }
}

/** True when a search result is exactly as big as what we are looking for: a strong sign of identical content. */
export const isSameSize = (resultSize: number, wanted: number | null): boolean => wanted !== null && resultSize === wanted
