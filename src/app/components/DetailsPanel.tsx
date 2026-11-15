import { lazy, Suspense, useState } from 'react'
import type { Torrent } from '@/api/types'
import { formatBytes, formatEta, formatPercent, formatRatio, formatSpeed } from '@/domain/format'
import { STATUS_LABEL, toStatus } from '@/domain/status'
import { CloseIcon, CopyIcon } from '../icons'
import { useUi } from '../uiStore'
import { FileIcon } from './FileIcon'
import { Icon } from './Icon'
import { Progress } from './Progress'
import { statusStyle } from './Status'

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text) // needs a secure context (HTTPS or localhost)
    return true
  } catch {
    return false
  }
}

function Copyable({ label, value }: { label: string; value: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  return (
    <div className="details__field details__field--wide">
      <div className="details__fieldhead">
        <span>{label}</span>
        <button type="button" className="linkbtn" onClick={() => void copyText(value).then((ok) => setState(ok ? 'copied' : 'failed'))}>
          <Icon icon={CopyIcon} size={12} />
          {state === 'copied' ? 'Copied' : state === 'failed' ? 'Select & copy manually' : 'Copy'}
        </button>
      </div>
      <code className="details__code">{value || '—'}</code>
    </div>
  )
}

const TorrentStats = lazy(() => import('../charts/TorrentStats'))

const date = (s: number) => (s > 0 ? new Date(s * 1000).toLocaleString() : '—')

/** Overview of one torrent from sync data. Files/Trackers/Peers tabs come with their endpoints. */
export function DetailsPanel({ hash, torrent, orientation }: { hash: string; torrent: Torrent; orientation: 'side' | 'bottom' }) {
  const close = useUi((s) => s.closeDetails)
  const [tab, setTab] = useState<'overview' | 'statistics'>('overview')
  const s = toStatus(torrent.state)
  return (
    <aside className={`details details--${orientation}`} aria-label="Torrent details" style={statusStyle(torrent.state)}>
      <header className="details__head">
        <div className="details__titlerow">
          <FileIcon name={torrent.name} size={18} />
          <h2 className="details__title">{torrent.name}</h2>
          <button type="button" className="iconbtn" aria-label="Close details" onClick={close}><Icon icon={CloseIcon} /></button>
        </div>
        <div className="details__status"><i aria-hidden="true" />{STATUS_LABEL[s]} · {formatPercent(torrent.progress)}</div>
        <Progress value={torrent.progress} variant="bar" />
      </header>
      <div className="tabs" role="tablist" aria-label="Detail sections">
        {(['overview', 'statistics'] as const).map((t) => (
          <button key={t} type="button" role="tab" id={`dtab-${t}`} aria-selected={tab === t} aria-controls={`dpanel-${t}`} onClick={() => setTab(t)}>
            {t === 'overview' ? 'Overview' : 'Statistics'}
          </button>
        ))}
      </div>
      {tab === 'statistics' ? (
        <div role="tabpanel" id="dpanel-statistics" aria-labelledby="dtab-statistics" className="details__body">
          <Suspense fallback={<p className="panel__empty">Loading charts…</p>}>
            <TorrentStats hash={hash} torrent={torrent} />
          </Suspense>
        </div>
      ) : (
      <div role="tabpanel" id="dpanel-overview" aria-labelledby="dtab-overview" className="details__body">
      <dl className="details__grid">
        <div className="details__field"><dt>Download</dt><dd>{formatSpeed(torrent.dlspeed)}</dd></div>
        <div className="details__field"><dt>Upload</dt><dd>{formatSpeed(torrent.upspeed)}</dd></div>
        <div className="details__field"><dt>Remaining</dt><dd>{formatBytes(torrent.amount_left ?? 0)}{torrent.progress < 1 && ` · ${formatEta(torrent.eta)}`}</dd></div>
        <div className="details__field"><dt>Ratio</dt><dd>{formatRatio(torrent.ratio)}</dd></div>
        <div className="details__field"><dt>Downloaded</dt><dd>{formatBytes(torrent.downloaded ?? 0)}</dd></div>
        <div className="details__field"><dt>Uploaded</dt><dd>{formatBytes(torrent.uploaded ?? 0)}</dd></div>
        <div className="details__field"><dt>Seeds</dt><dd>{torrent.num_seeds ?? 0} <span className="muted">({torrent.num_complete ?? 0})</span></dd></div>
        <div className="details__field"><dt>Peers</dt><dd>{torrent.num_leechs ?? 0} <span className="muted">({torrent.num_incomplete ?? 0})</span></dd></div>
        <div className="details__field"><dt>Size</dt><dd>{formatBytes(torrent.size)}</dd></div>
        <div className="details__field"><dt>Category</dt><dd>{torrent.category || '—'}</dd></div>
        <div className="details__field"><dt>Added</dt><dd>{date(torrent.added_on)}</dd></div>
        <div className="details__field"><dt>Completed</dt><dd>{date(torrent.completion_on ?? 0)}</dd></div>
      </dl>
      <div className="details__extra">
        <Copyable label="Save path" value={torrent.save_path ?? ''} />
        <Copyable label="Info hash" value={hash} />
      </div>
      </div>
      )}
    </aside>
  )
}
