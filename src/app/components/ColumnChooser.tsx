import { useEffect, useId, useRef, useState } from 'react'
import { moveColumn, setVisible, toPrefs, type ResolvedColumn } from '@/domain/columns'
import { DENSITIES, DENSITY_LABEL, layoutsFor, type Density } from '@/domain/layouts'
import type { Skin } from '@/ui/theme'
import { setColumnPrefs } from '../columnPrefs'
import { deleteLayout, saveLayout, setDensity, useDensity, useLayouts } from '../tablePrefs'
import { useUi } from '../uiStore'
import { ChevronDownIcon, ChevronUpIcon, ColumnsIcon, DeleteIcon } from '../icons'
import { notify } from '../feedback/toast'
import { Icon } from './Icon'

/** Table options: density, show/hide + reorder columns, and saved layouts. `labels` maps column id → header text. */
export function ColumnChooser({ skin, columns, labels }: { skin: Skin; columns: readonly ResolvedColumn[]; labels: ReadonlyMap<string, string> }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const ref = useRef<HTMLDivElement>(null)
  const density = useDensity()
  const sort = useUi((u) => u.sort)
  const [name, setName] = useState('')
  const layouts = layoutsFor(useLayouts(), skin)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  const save = (next: ResolvedColumn[]) => setColumnPrefs(skin, toPrefs(next))
  const list = columns.filter((c) => labels.has(c.id))
  return (
    <div className="colchooser menu" ref={ref}>
      <button type="button" className="iconbtn iconbtn--ghost" aria-label="Table options" aria-expanded={open} aria-controls={id} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPos({ top: r.bottom + 6, right: window.innerWidth - r.right }); setOpen((o) => !o) }}>
        <Icon icon={ColumnsIcon} size={16} />
      </button>
      {open && (
        <div className="colchooser__panel" id={id} role="dialog" aria-label="Table options" style={{ top: pos.top, right: pos.right, maxHeight: `calc(100vh - ${pos.top + 12}px)` }}>
          <fieldset className="colchooser__sec">
            <legend>Row density</legend>
            <div className="colchooser__seg">
              {DENSITIES.map((d: Density) => (
                <label key={d}><input type="radio" name={`${id}-density`} checked={density === d} onChange={() => setDensity(d)} />{DENSITY_LABEL[d]}</label>
              ))}
            </div>
          </fieldset>
          <h3 className="colchooser__h">Columns</h3>
          <ul>
            {list.map((c, i) => {
              const label = labels.get(c.id)!
              return (
                <li key={c.id}>
                  <label>
                    <input type="checkbox" checked={c.visible} disabled={c.locked} onChange={(e) => save(setVisible(columns, c.id, e.target.checked))} />
                    {label}
                  </label>
                  <button type="button" className="iconbtn iconbtn--sm" aria-label={`Move ${label} earlier`} disabled={i === 0} onClick={() => save(moveColumn(columns, c.id, -1))}><Icon icon={ChevronUpIcon} size={14} /></button>
                  <button type="button" className="iconbtn iconbtn--sm" aria-label={`Move ${label} later`} disabled={i === list.length - 1} onClick={() => save(moveColumn(columns, c.id, 1))}><Icon icon={ChevronDownIcon} size={14} /></button>
                </li>
              )
            })}
          </ul>
          <button type="button" className="btn" onClick={() => { setColumnPrefs(skin, undefined); setDensity('comfortable') }}>Reset to default</button>
          <h3 className="colchooser__h">Saved layouts</h3>
          {layouts.length === 0 && <p className="muted">None yet. A layout stores columns, sort order and density.</p>}
          <ul>
            {layouts.map((l) => (
              <li key={l.name} className="layoutrow">
                <button
                  type="button" className="btn" aria-label={`Apply layout ${l.name}`}
                  onClick={() => { setColumnPrefs(skin, l.columns); setDensity(l.density); useUi.getState().setSort(l.sort); notify(`Applied layout “${l.name}”`, { tone: 'success' }) }}
                >{l.name}</button>
                <button type="button" className="iconbtn iconbtn--sm" aria-label={`Delete layout ${l.name}`} onClick={() => deleteLayout(skin, l.name)}><Icon icon={DeleteIcon} size={14} /></button>
              </li>
            ))}
          </ul>
          <form
            className="layoutsave"
            onSubmit={(e) => {
              e.preventDefault()
              const n = name.trim()
              if (!n) return
              saveLayout({ name: n, skin, columns: toPrefs(columns), sort, density })
              notify(`Saved layout “${n}”`, { tone: 'success' })
              setName('')
            }}
          >
            <input aria-label="Layout name" placeholder="Save current as…" value={name} onChange={(e) => setName(e.target.value)} />
            <button type="submit" className="btn" disabled={name.trim() === ''}>Save</button>
          </form>
        </div>
      )}
    </div>
  )
}
