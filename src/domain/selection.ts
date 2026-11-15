import type { Torrent } from '@/api/types'
import { splitTags } from './filters'

const STOPPED = new Set(['stoppedDL', 'stoppedUP', 'pausedDL', 'pausedUP'])

/** What the current selection allows; drives which actions are enabled and how toggles read. */
export interface SelectionFacts {
  count: number
  anyRunning: boolean
  anyStopped: boolean
  allComplete: boolean
  allForced: boolean
  allSequential: boolean
  allFirstLast: boolean
  allSuperSeeding: boolean
  allAutoTMM: boolean
  /** Category shared by every selected torrent, '' if all uncategorised, null if mixed. */
  commonCategory: string | null
  /** Tag → number of selected torrents carrying it. */
  tagCounts: ReadonlyMap<string, number>
  /** Shared save path, or null if they differ. */
  commonSavePath: string | null
}

export function selectionFacts(torrents: readonly Torrent[]): SelectionFacts {
  const tagCounts = new Map<string, number>()
  let category: string | null | undefined
  let savePath: string | null | undefined
  const all = (p: (t: Torrent) => boolean) => torrents.length > 0 && torrents.every(p)
  for (const t of torrents) {
    for (const tag of splitTags(t.tags ?? '')) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    const c = t.category ?? ''
    category = category === undefined ? c : category === c ? category : null
    const sp = t.save_path ?? ''
    savePath = savePath === undefined ? sp : savePath === sp ? savePath : null
  }
  return {
    count: torrents.length,
    anyRunning: torrents.some((t) => !STOPPED.has(t.state)),
    anyStopped: torrents.some((t) => STOPPED.has(t.state)),
    allComplete: all((t) => t.progress >= 1),
    allForced: all((t) => !!t.force_start),
    allSequential: all((t) => !!t.seq_dl),
    allFirstLast: all((t) => !!t.f_l_piece_prio),
    allSuperSeeding: all((t) => !!t.super_seeding),
    allAutoTMM: all((t) => !!t.auto_tmm),
    commonCategory: category === undefined ? null : category,
    tagCounts,
    commonSavePath: savePath === undefined ? null : savePath,
  }
}

/** Parses comma/newline separated magnet links and URLs; drops blanks and duplicates. */
export function parseLinks(text: string): string[] {
  const out: string[] = []
  for (const raw of text.split(/[\n,]+/)) {
    const s = raw.trim()
    if (s && /^(magnet:\?|https?:\/\/|bc:\/\/bt\/|[a-f0-9]{40}$|[a-z2-7]{32}$)/i.test(s) && !out.includes(s)) out.push(s)
  }
  return out
}

/** Text the user pasted that contains at least one torrent link. */
export const looksLikeTorrentLink = (text: string) => parseLinks(text).length > 0
