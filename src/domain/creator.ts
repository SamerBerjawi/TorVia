import type { CreatorFormat } from '@/api/creator'

/** 0 lets qBittorrent choose. Values are bytes. */
export const PIECE_SIZES = [0, 16384, 32768, 65536, 131072, 262144, 524288, 1048576, 2097152, 4194304, 8388608, 16777216, 33554432] as const
export const FORMATS: { id: CreatorFormat; label: string }[] = [{ id: 'v1', label: 'v1 (widest support)' }, { id: 'hybrid', label: 'Hybrid (v1 + v2)' }, { id: 'v2', label: 'v2 only' }]

export const pieceLabel = (b: number) => (b === 0 ? 'Auto' : b >= 1048576 ? `${b / 1048576} MiB` : `${b / 1024} KiB`)

/** One URL per line (or `|`-separated), blanks dropped, duplicates removed. */
export function parseLines(text: string): string[] {
  return [...new Set(text.split(/[\n|]/).map((l) => l.trim()).filter(Boolean))]
}

const TRACKER = /^(https?|udp|wss?):\/\/\S+$/i
export function validateTrackers(lines: readonly string[]): string | null {
  const bad = lines.find((l) => !TRACKER.test(l))
  return bad ? `Not a tracker URL: ${bad}` : null
}
export function validateSeeds(lines: readonly string[]): string | null {
  const bad = lines.find((l) => !/^https?:\/\/\S+$/i.test(l))
  return bad ? `Web seeds must be http(s) URLs: ${bad}` : null
}

/** Source path is on the server, so we can only check it's absolute-looking and non-empty. */
export function validateSourcePath(p: string): string | null {
  const t = p.trim()
  if (t === '') return 'Enter the path of a file or folder on the qBittorrent machine'
  if (!/^(\/|[A-Za-z]:[\\/]|\\\\)/.test(t)) return 'Use an absolute path (starts with / or a drive letter)'
  return null
}

export const taskProgressPct = (t: { status: string; progress?: number }) => (t.status === 'Finished' ? 100 : Math.round((t.progress ?? 0) * (t.progress !== undefined && t.progress <= 1 ? 100 : 1)))
