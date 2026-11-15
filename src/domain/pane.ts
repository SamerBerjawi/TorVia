/** Sizing rules for the resizable details panel: its height under the table (Paper) and its width beside it (Graphite, Signal). Pure. */
export const PANE_MIN = 160
export const PANE_DEFAULT = 300
export const SIDE_MIN = 280
export const SIDE_DEFAULT = 360

function clamp(size: number, container: number, reserve: number, min: number, fallback: number): number {
  const max = Math.max(min, container - reserve)
  if (!Number.isFinite(size)) return Math.min(fallback, max)
  return Math.round(Math.min(max, Math.max(min, size)))
}

/** Pane height: tall enough to be useful, leaving at least `reserve` px (the table header + a few rows) above it. */
export const clampPaneHeight = (height: number, containerHeight: number, reserve = 160, min = PANE_MIN): number =>
  clamp(height, containerHeight, reserve, min, PANE_DEFAULT)

/** Side pane width: never narrower than SIDE_MIN, and leaves `reserve` px for everything beside it (sidebar + table). */
export const clampSideWidth = (width: number, containerWidth: number, reserve = 480, min = SIDE_MIN): number =>
  clamp(width, containerWidth, reserve, min, SIDE_DEFAULT)

function parseStored(raw: string | null, min: number, fallback: number): number {
  const n = Number(raw)
  return raw !== null && Number.isFinite(n) && n >= min && n <= 4000 ? Math.round(n) : fallback
}
/** Parses a stored size; anything unusable gives the default. */
export const parseStoredHeight = (raw: string | null): number => parseStored(raw, PANE_MIN, PANE_DEFAULT)
export const parseStoredWidth = (raw: string | null): number => parseStored(raw, SIDE_MIN, SIDE_DEFAULT)
