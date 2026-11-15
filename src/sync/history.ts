/** Rolling transfer-speed samples for sparklines. Pure; capped length. */

export interface SpeedHistory {
  readonly dl: readonly number[]
  readonly up: readonly number[]
}

export const HISTORY_LENGTH = 60

export const emptyHistory: SpeedHistory = { dl: [], up: [] }

export function pushSample(h: SpeedHistory, dl: number, up: number, max = HISTORY_LENGTH): SpeedHistory {
  const cut = (xs: readonly number[], v: number) => (xs.length >= max ? [...xs.slice(xs.length - max + 1), v] : [...xs, v])
  return { dl: cut(h.dl, dl), up: cut(h.up, up) }
}
