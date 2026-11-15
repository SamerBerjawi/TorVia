/** Sizing rules for a resizable pane (the details panel in Paper). Pure. */
export const PANE_MIN = 160
export const PANE_DEFAULT = 300

/** Keeps the pane tall enough to be useful and leaves at least `reserve` px (the table header + a few rows) above it. */
export function clampPaneHeight(height: number, containerHeight: number, reserve = 160, min = PANE_MIN): number {
  const max = Math.max(min, containerHeight - reserve)
  if (!Number.isFinite(height)) return Math.min(PANE_DEFAULT, max)
  return Math.round(Math.min(max, Math.max(min, height)))
}

/** Parses a stored height; anything unusable gives the default. */
export function parseStoredHeight(raw: string | null): number {
  const n = Number(raw)
  return raw !== null && Number.isFinite(n) && n >= PANE_MIN && n <= 4000 ? Math.round(n) : PANE_DEFAULT
}
