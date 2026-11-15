import { useEffect, useId, useRef, useState } from 'react'
import { moveColumn, setVisible, toPrefs, type ResolvedColumn } from '@/domain/columns'
import type { Skin } from '@/ui/theme'
import { setColumnPrefs } from '../columnPrefs'
import { ChevronDownIcon, ChevronUpIcon, ColumnsIcon } from '../icons'
import { Icon } from './Icon'

/** Show/hide and reorder table columns. `labels` maps column id → header text. */
export function ColumnChooser({ skin, columns, labels }: { skin: Skin; columns: readonly ResolvedColumn[]; labels: ReadonlyMap<string, string> }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 })
  const ref = useRef<HTMLDivElement>(null)
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
      <button type="button" className="iconbtn iconbtn--ghost" aria-label="Choose columns" aria-expanded={open} aria-controls={id} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setPos({ top: r.bottom + 6, right: window.innerWidth - r.right }); setOpen((o) => !o) }}>
        <Icon icon={ColumnsIcon} size={16} />
      </button>
      {open && (
        <div className="colchooser__panel" id={id} role="dialog" aria-label="Columns" style={{ top: pos.top, right: pos.right }}>
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
          <button type="button" className="btn" onClick={() => setColumnPrefs(skin, undefined)}>Reset to default</button>
        </div>
      )}
    </div>
  )
}
