import { memo, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { Torrent } from '@/api/types'
import { formatBytes, formatEta, formatPercent, formatRatio, formatSpeed } from '@/domain/format'
import { STATUS_LABEL, toStatus } from '@/domain/status'

const ROW_HEIGHT = 36

const Row = memo(function Row({ t, top }: { t: Torrent; top: number }) {
  const status = toStatus(t.state)
  return (
    <div className="row" role="row" style={{ transform: `translateY(${top}px)`, ['--dot' as string]: `var(--status-${status === 'unknown' ? 'completed' : status})` }}>
      <div className="name" role="gridcell" title={t.name}>{t.name}</div>
      <div className="status hide-sm" role="gridcell"><span className="dot" aria-hidden />{STATUS_LABEL[status]}</div>
      <div className="progress" role="gridcell">
        <span className="bar" aria-hidden><i style={{ width: `${Math.round(t.progress * 100)}%` }} /></span>
        <span>{formatPercent(t.progress)}</span>
      </div>
      <div className="num hide-sm" role="gridcell">{formatBytes(t.size)}</div>
      <div className="num hide-sm" role="gridcell">{formatSpeed(t.dlspeed)}</div>
      <div className="num hide-sm" role="gridcell">{formatSpeed(t.upspeed)}</div>
      <div className="num hide-sm" role="gridcell">{formatEta(t.eta)}</div>
      <div className="num hide-sm" role="gridcell">{formatRatio(t.ratio)}</div>
    </div>
  )
})

export function TorrentTable({ torrents }: { torrents: ReadonlyMap<string, Torrent> }) {
  const rows = useMemo(() => [...torrents.entries()].sort((a, b) => b[1].added_on - a[1].added_on), [torrents])
  const scroller = useRef<HTMLDivElement>(null)
  const virt = useVirtualizer({ count: rows.length, getScrollElement: () => scroller.current, estimateSize: () => ROW_HEIGHT, overscan: 12 })

  if (rows.length === 0) return <div className="empty">No torrents yet.</div>
  return (
    <div className="table" role="grid" aria-rowcount={rows.length + 1}>
      <div className="thead" role="row">
        <div>Name</div><div>Status</div><div>Progress</div>
        <div className="num">Size</div><div className="num">Down</div><div className="num">Up</div><div className="num">ETA</div><div className="num">Ratio</div>
      </div>
      <div className="scroller" ref={scroller}>
        <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
          {virt.getVirtualItems().map((v) => {
            const entry = rows[v.index]
            return entry ? <Row key={entry[0]} t={entry[1]} top={v.start} /> : null
          })}
        </div>
      </div>
    </div>
  )
}
