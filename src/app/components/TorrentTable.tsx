import { memo, useCallback, useEffect, useMemo, useRef, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Torrent } from '@/api/types'
import { formatBytes, formatSpeed } from '@/domain/format'
import type { SortKey } from '@/domain/sort'
import { ChevronDownIcon, ChevronUpIcon, EmptyIcon } from '../icons'
import { useUi } from '../uiStore'
import type { TableItem } from '../useTorrentView'
import { TorrentContextMenu } from '../actions/ActionMenus'
import type { ActionContext } from '../actions/catalogue'
import { resolveColumns } from '@/domain/columns'
import { useColumnPrefs } from '../columnPrefs'
import { useAppearance } from '../hooks'
import { ColumnChooser } from './ColumnChooser'
import { Icon } from './Icon'
import { statusStyle } from './Status'

export interface Column {
  id: string
  label: string
  /** CSS grid track, e.g. '120px' or 'minmax(240px, 1fr)'. */
  width: string
  sortKey?: SortKey
  align?: 'end'
  /** Hidden below 800px. */
  wide?: boolean
  /** Always shown (cannot be hidden in the chooser). */
  locked?: boolean
  /** Not listed in the chooser at all (decorative). */
  hideInChooser?: boolean
  /** Hidden until the user enables it. */
  defaultHidden?: boolean
  render: (t: Torrent) => ReactNode
}

interface Props {
  columns: readonly Column[]
  items: readonly TableItem[]
  order: readonly string[]
  rowHeight: number
  label: string
  emptyText: string
  narrow: boolean
  /** Actions for the right-click menu. */
  ctx: ActionContext
}

const CHOOSER_WIDTH = '28px'
const GROUP_HEIGHT = 44
const HEADER_HEIGHT = 32

const Row = memo(function Row(props: {
  hash: string; torrent: Torrent; columns: readonly Column[]; template: string; selected: boolean; focused: boolean
  index: number; top: number; height: number; onClick: (e: MouseEvent, hash: string) => void; onOpen: (hash: string) => void
  onContext: (hash: string) => void
}) {
  const { hash, torrent, columns, template, selected, focused, index, top, height } = props
  return (
    <div
      id={`row-${hash}`}
      role="row"
      aria-selected={selected}
      aria-rowindex={index + 2}
      className="trow"
      data-focused={focused || undefined}
      style={{ ...statusStyle(torrent.state), gridTemplateColumns: template, height, transform: `translateY(${top}px)` }}
      onClick={(e) => props.onClick(e, hash)}
      onDoubleClick={() => props.onOpen(hash)}
      onContextMenu={() => props.onContext(hash)}
    >
      {columns.map((c) => (
        <div key={c.id} role="gridcell" className={`tcell tcell--${c.id}${c.align === 'end' ? ' tcell--end' : ''}`}>
          {c.render(torrent)}
        </div>
      ))}
      <span aria-hidden="true" />
    </div>
  )
})

function GroupHeader({ item, top }: { item: Extract<TableItem, { type: 'group' }>; top: number }) {
  return (
    <div role="row" className="tgroup" style={{ height: GROUP_HEIGHT, transform: `translateY(${top}px)` }}>
      <div role="rowheader" className="tgroup__label">{item.label}</div>
      <div className="tgroup__meta">
        {item.count} {item.count === 1 ? 'torrent' : 'torrents'} · {formatBytes(item.size)}
        {item.dlspeed > 0 && <> · ↓ {formatSpeed(item.dlspeed)}</>}
      </div>
    </div>
  )
}

export function TorrentTable({ columns: allColumns, items, order, rowHeight, label, emptyText, narrow, ctx }: Props) {
  const { skin } = useAppearance()
  const prefs = useColumnPrefs(skin)
  const resolved = useMemo(() => resolveColumns(allColumns, prefs), [allColumns, prefs])
  const labels = useMemo(() => new Map(allColumns.filter((c) => !c.hideInChooser && c.label).map((c) => [c.id, c.label])), [allColumns])
  // The user's choice first; then phones drop secondary columns and relax the name column's minimum so nothing scrolls sideways.
  const columns = useMemo(() => {
    const byId = new Map(allColumns.map((c) => [c.id, c]))
    const chosen = resolved.filter((r) => r.visible).map((r) => byId.get(r.id)!)
    return narrow ? chosen.filter((c) => !c.wide).map((c) => ({ ...c, width: c.width.replace('minmax(220px', 'minmax(120px').replace(/^1[5-7]0px$/, '110px') })) : chosen
  }, [allColumns, resolved, narrow])
  const template = useMemo(() => [...columns.map((c) => c.width), CHOOSER_WIDTH].join(' '), [columns])
  // Narrowest width at which every column still fits; below it the table scrolls horizontally.
  const minWidth = useMemo(
    () => columns.reduce((sum, c) => sum + (Number(/(\d+)px/.exec(c.width)?.[1]) || 0), 0) + columns.length * 12 + 48 + 36,
    [columns],
  )
  const { selected, focused, sort, select, selectAll, clearSelection, focus, openDetails, closeDetails, detailsOpen, sortBy } = useUi()
  const scroller = useRef<HTMLDivElement>(null)

  const indexOfHash = useMemo(() => {
    const m = new Map<string, number>()
    items.forEach((it, i) => it.type === 'row' && m.set(it.hash, i))
    return m
  }, [items])

  const virt = useVirtualizer({
    count: items.length,
    getScrollElement: () => scroller.current,
    scrollMargin: 0,
    paddingStart: HEADER_HEIGHT,
    scrollPaddingStart: HEADER_HEIGHT,
    estimateSize: (i) => (items[i]?.type === 'group' ? GROUP_HEIGHT : rowHeight),
    overscan: 12,
  })
  useEffect(() => virt.measure(), [rowHeight, items, virt])

  const onClick = useCallback(
    (e: MouseEvent, hash: string) => select(hash, e.shiftKey ? 'range' : e.metaKey || e.ctrlKey ? 'toggle' : 'single', order),
    [select, order],
  )

  // Right-clicking an unselected row acts on that row alone (desktop convention).
  const onContext = useCallback(
    (hash: string) => { if (!useUi.getState().selected.has(hash)) select(hash, 'single', order) },
    [select, order],
  )

  function move(delta: number) {
    if (order.length === 0) return
    const i = focused ? order.indexOf(focused) : -1
    const next = order[Math.max(0, Math.min(order.length - 1, i < 0 ? 0 : i + delta))]
    if (!next) return
    focus(next)
    const idx = indexOfHash.get(next)
    if (idx !== undefined) virt.scrollToIndex(idx, { align: 'auto' })
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const mod = e.metaKey || e.ctrlKey
    switch (e.key) {
      case 'ArrowDown': case 'j': e.preventDefault(); move(1); break
      case 'ArrowUp': case 'k': e.preventDefault(); move(-1); break
      case 'PageDown': e.preventDefault(); move(10); break
      case 'PageUp': e.preventDefault(); move(-10); break
      case 'Home': e.preventDefault(); move(-order.length); break
      case 'End': e.preventDefault(); move(order.length); break
      case ' ': if (focused) { e.preventDefault(); select(focused, 'toggle', order) } break
      case 'Enter': if (focused) { e.preventDefault(); openDetails(focused) } break
      case 'Escape': if (detailsOpen) closeDetails(); else clearSelection(); break
      case 'a': if (mod) { e.preventDefault(); selectAll(order) } break
    }
  }

  return (
    <div className="ttable" role="grid" aria-label={label} aria-rowcount={order.length + 1} aria-multiselectable="true">
      <TorrentContextMenu ctx={ctx}>
      <div
        ref={scroller}
        className="tscroll"
        tabIndex={0}
        aria-activedescendant={focused && indexOfHash.has(focused) ? `row-${focused}` : undefined}
        onKeyDown={onKeyDown}
        onFocus={() => !focused && order[0] && focus(order[0])}
      >
      <div role="row" className="thead" style={{ gridTemplateColumns: template, minWidth } as CSSProperties}>
          {columns.map((c) => {
            const active = c.sortKey && sort.key === c.sortKey
            return (
              <div key={c.id} role="columnheader" className={`thcell${c.align === 'end' ? ' tcell--end' : ''}`} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                {c.sortKey ? (
                  <button type="button" className="thsort" onClick={() => sortBy(c.sortKey!)}>
                    {c.label}
                    {active && <Icon icon={sort.dir === 'asc' ? ChevronUpIcon : ChevronDownIcon} size={12} />}
                  </button>
                ) : (
                  <span>{c.label}</span>
                )}
              </div>
            )
          })}
          <div role="columnheader" className="thcell thcell--chooser" aria-label="Column options">
            <ColumnChooser skin={skin} columns={resolved} labels={labels} />
          </div>
        </div>
        {items.length === 0 ? (
          <div className="tempty"><Icon icon={EmptyIcon} size={28} /><p>{emptyText}</p></div>
        ) : (
          <div style={{ height: virt.getTotalSize(), position: 'relative', minWidth }}>
            {virt.getVirtualItems().map((v) => {
              const it = items[v.index]
              if (!it) return null
              if (it.type === 'group') return <GroupHeader key={`g:${it.key}`} item={it} top={v.start} />
              return (
                <Row
                  key={it.hash} hash={it.hash} torrent={it.torrent} columns={columns} template={template}
                  selected={selected.has(it.hash)} focused={focused === it.hash} index={v.index}
                  top={v.start} height={rowHeight} onClick={onClick} onOpen={openDetails} onContext={onContext}
                />
              )
            })}
          </div>
        )}
      </div>
      </TorrentContextMenu>
    </div>
  )
}
