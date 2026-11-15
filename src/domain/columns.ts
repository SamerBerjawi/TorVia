/** Which table columns are shown, and in what order. Pure; persistence lives in app/columnPrefs.ts. */
export interface ColumnSpec {
  id: string
  /** Cannot be hidden (the name column). */
  locked?: boolean
  /** Hidden until the user turns it on. */
  defaultHidden?: boolean
}
export interface ColumnPrefs {
  /** Column ids in the user's order (may omit columns added in later versions). */
  order: string[]
  /** Ids the user has left visible. Ids absent from `order` fall back to their default. */
  visible: string[]
}
export interface ResolvedColumn { id: string; visible: boolean; locked: boolean }

/** Full ordered list with visibility. Unknown stored ids are dropped; new columns appear after known ones. */
export function resolveColumns(specs: readonly ColumnSpec[], prefs: ColumnPrefs | undefined): ResolvedColumn[] {
  const byId = new Map(specs.map((s) => [s.id, s]))
  const known = new Set(prefs?.order ?? [])
  const shown = new Set(prefs?.visible ?? [])
  const ordered = [
    ...(prefs?.order ?? []).filter((id) => byId.has(id)),
    ...specs.map((s) => s.id).filter((id) => !known.has(id)),
  ]
  return ordered.map((id) => {
    const s = byId.get(id)!
    const visible = s.locked ? true : known.has(id) ? shown.has(id) : !s.defaultHidden
    return { id, visible, locked: s.locked === true }
  })
}

export const toPrefs = (cols: readonly ResolvedColumn[]): ColumnPrefs => ({
  order: cols.map((c) => c.id),
  visible: cols.filter((c) => c.visible).map((c) => c.id),
})

export function setVisible(cols: readonly ResolvedColumn[], id: string, visible: boolean): ResolvedColumn[] {
  return cols.map((c) => (c.id === id && !c.locked ? { ...c, visible } : c))
}

/** Moves a column by `delta` positions among all columns (clamped). */
export function moveColumn(cols: readonly ResolvedColumn[], id: string, delta: number): ResolvedColumn[] {
  const from = cols.findIndex((c) => c.id === id)
  if (from < 0) return [...cols]
  const to = Math.max(0, Math.min(cols.length - 1, from + delta))
  const out = [...cols]
  const [item] = out.splice(from, 1)
  out.splice(to, 0, item!)
  return out
}
