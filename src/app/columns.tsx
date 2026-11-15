import { formatBytes, formatEta, formatRatio, formatSpeed } from '@/domain/format'
import { FileIcon } from './components/FileIcon'
import { Progress } from './components/Progress'
import { Status } from './components/Status'
import type { Column } from './components/TorrentTable'

/** Column sets per skin. Module-level constants so memoised rows stay stable. */

const size: Column = { id: 'size', label: 'Size', width: '88px', sortKey: 'size', align: 'end', wide: true, render: (t) => formatBytes(t.size) }
const down: Column = { id: 'down', label: 'Down', width: '96px', sortKey: 'dlspeed', align: 'end', wide: true, render: (t) => formatSpeed(t.dlspeed) }
const up: Column = { id: 'up', label: 'Up', width: '92px', sortKey: 'upspeed', align: 'end', wide: true, render: (t) => formatSpeed(t.upspeed) }
const eta: Column = { id: 'eta', label: 'ETA', width: '76px', sortKey: 'eta', align: 'end', wide: true, render: (t) => (t.progress >= 1 ? '—' : formatEta(t.eta)) }
const day = (s: number) => (s > 0 ? new Date(s * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—')
const EXTRA: Column[] = [
  { id: 'added', label: 'Added', width: '110px', sortKey: 'added_on', wide: true, defaultHidden: true, render: (t) => day(t.added_on) },
  { id: 'category', label: 'Category', width: '120px', sortKey: 'category', wide: true, defaultHidden: true, render: (t) => t.category || '—' },
  { id: 'tags', label: 'Tags', width: '130px', wide: true, defaultHidden: true, render: (t) => t.tags || '—' },
  { id: 'seeds', label: 'Seeds', width: '84px', sortKey: 'num_seeds', align: 'end', wide: true, defaultHidden: true, render: (t) => `${t.num_seeds ?? 0} (${t.num_complete ?? 0})` },
  { id: 'peers', label: 'Peers', width: '84px', sortKey: 'num_leechs', align: 'end', wide: true, defaultHidden: true, render: (t) => `${t.num_leechs ?? 0} (${t.num_incomplete ?? 0})` },
  { id: 'downloaded', label: 'Downloaded', width: '100px', sortKey: 'downloaded', align: 'end', wide: true, defaultHidden: true, render: (t) => formatBytes(t.downloaded ?? 0) },
  { id: 'uploaded', label: 'Uploaded', width: '96px', sortKey: 'uploaded', align: 'end', wide: true, defaultHidden: true, render: (t) => formatBytes(t.uploaded ?? 0) },
  { id: 'activity', label: 'Last active', width: '110px', sortKey: 'last_activity', wide: true, defaultHidden: true, render: (t) => day(t.last_activity) },
]
const ratio: Column = { id: 'ratio', label: 'Ratio', width: '60px', sortKey: 'ratio', align: 'end', wide: true, render: (t) => formatRatio(t.ratio) }

export const GRAPHITE_COLUMNS: readonly Column[] = [
  {
    id: 'name', locked: true, label: 'Name', width: 'minmax(220px, 1fr)', sortKey: 'name',
    render: (t) => (
      <span className="namecell">
        <FileIcon name={t.name} />
        <span className="namecell__text">
          <span className="namecell__name" title={t.name}>{t.name}</span>
          <span className="namecell__sub">{t.category || 'Uncategorised'}{t.tags ? ` · ${t.tags}` : ''}</span>
        </span>
      </span>
    ),
  },
  { id: 'status', label: 'Status', width: '108px', sortKey: 'state', wide: true, render: (t) => <Status state={t.state} variant="dot" /> },
  { id: 'progress', label: 'Progress', width: '140px', sortKey: 'progress', render: (t) => <Progress value={t.progress} variant="bar" /> },
  size, down, up, eta, ratio, ...EXTRA,
]

export const PAPER_COLUMNS: readonly Column[] = [
  {
    id: 'name', locked: true, label: 'Name', width: 'minmax(220px, 1fr)', sortKey: 'name',
    render: (t) => (
      <span className="namecell">
        <FileIcon name={t.name} />
        <span className="namecell__name" title={t.name}>{t.name}</span>
      </span>
    ),
  },
  { id: 'status', label: 'Status', width: '124px', sortKey: 'state', wide: true, render: (t) => <Status state={t.state} variant="pill" /> },
  { id: 'progress', label: 'Progress', width: '160px', sortKey: 'progress', render: (t) => <Progress value={t.progress} variant="bar" /> },
  size, down, up, eta, ratio, ...EXTRA,
]

export const SIGNAL_COLUMNS: readonly Column[] = [
  { id: 'strip', locked: true, hideInChooser: true, label: '', width: '4px', render: () => <span className="strip" aria-hidden="true" /> },
  {
    id: 'name', locked: true, label: 'Name', width: 'minmax(220px, 1fr)', sortKey: 'name',
    render: (t) => (
      <span className="namecell">
        <FileIcon name={t.name} />
        <span className="namecell__name" title={t.name}>{t.name}</span>
      </span>
    ),
  },
  { id: 'status', label: 'State', width: '104px', sortKey: 'state', wide: true, render: (t) => <Status state={t.state} variant="mono" /> },
  { id: 'progress', label: 'Progress', width: '170px', sortKey: 'progress', render: (t) => <Progress value={t.progress} variant="segments" /> },
  size, down, up, eta, ratio, ...EXTRA,
]
