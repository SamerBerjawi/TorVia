import type { IconSvgElement } from '@hugeicons/react'
import type { ReactNode } from 'react'
import { STATUS_FILTER_LABEL, type StatusFilter } from '@/domain/filters'
import * as I from '../icons'
import { useUi } from '../uiStore'
import type { useTorrentView } from '../useTorrentView'
import { Icon } from './Icon'

export const STATUS_ICON: Record<StatusFilter, IconSvgElement> = {
  all: I.AllIcon, downloading: I.DownloadIcon, seeding: I.UploadIcon, completed: I.CompletedIcon, running: I.RunningIcon,
  stopped: I.StoppedIcon, active: I.ActiveIcon, stalled: I.StalledIcon, checking: I.CheckingIcon, errored: I.ErrorIcon,
}
const STATUS_TONE: Partial<Record<StatusFilter, string>> = {
  downloading: 'dl', seeding: 'seed', completed: 'done', stopped: 'stop', stalled: 'stall', checking: 'check', errored: 'err',
}

type View = ReturnType<typeof useTorrentView>

function Item({ active, onClick, icon, tone, label, count }: { active: boolean; onClick: () => void; icon: IconSvgElement; tone?: string | undefined; label: string; count?: number | undefined }) {
  return (
    <li>
      <button type="button" className="navitem" aria-current={active || undefined} onClick={onClick} style={tone ? ({ '--c': `var(--st-${tone})` } as React.CSSProperties) : undefined}>
        <Icon icon={icon} size={16} className={tone ? 'navitem__icon navitem__icon--tone' : 'navitem__icon'} />
        <span className="navitem__label">{label}</span>
        {count !== undefined && <span className="navitem__count">{count}</span>}
      </button>
    </li>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="navsection" aria-label={title}>
      <h2 className="navsection__title">{title}</h2>
      <ul>{children}</ul>
    </section>
  )
}

/** Library navigation. `showStatus` is off for Paper, which puts status views in its toolbar. */
export function Sidebar({ view, showStatus, header, footer }: { view: View; showStatus: boolean; header?: ReactNode; footer?: ReactNode }) {
  const { status, category, tag, setStatus, setCategory, setTag } = useUi()
  const statuses: StatusFilter[] = ['all', 'downloading', 'seeding', 'completed', 'running', 'stopped', 'active', 'stalled', 'errored']
  const uncategorised = view.categoryCounts.get('') ?? 0
  return (
    <nav className="sidebar" aria-label="Library">
      {header}
      <div className="sidebar__scroll">
        {showStatus && (
          <Section title="Views">
            {statuses.map((s) => (
              <Item key={s} active={status === s} onClick={() => setStatus(s)} icon={STATUS_ICON[s]} tone={STATUS_TONE[s]} label={STATUS_FILTER_LABEL[s]} count={view.counts[s]} />
            ))}
          </Section>
        )}
        <Section title="Categories">
          <Item active={category === null} onClick={() => setCategory(null)} icon={I.FolderIcon} label="All categories" count={view.total} />
          {view.categories.map((c) => (
            <Item key={c} active={category === c} onClick={() => setCategory(c)} icon={I.FolderIcon} label={c} count={view.categoryCounts.get(c) ?? 0} />
          ))}
          {uncategorised > 0 && <Item active={category === ''} onClick={() => setCategory('')} icon={I.FolderIcon} label="Uncategorised" count={uncategorised} />}
        </Section>
        {view.tags.length > 0 && (
          <Section title="Tags">
            <Item active={tag === null} onClick={() => setTag(null)} icon={I.TagIcon} label="All tags" />
            {view.tags.map((t) => (
              <Item key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)} icon={I.TagIcon} label={t} count={view.tagCounts.get(t) ?? 0} />
            ))}
          </Section>
        )}
      </div>
      {footer}
    </nav>
  )
}
