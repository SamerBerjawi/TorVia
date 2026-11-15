import { useCallback, useState } from 'react'
import { detailsApi, type FilePriority, type Peer } from '@/api/details'
import { countriesUnavailable, peerCountry } from '@/domain/country'
import { buildFileTree, nodeProgress, visibleNodes, type FileNode } from '@/domain/files'
import { formatBytes, formatPercent, formatSpeed } from '@/domain/format'
import { ChevronDownIcon, ChevronRightIcon, RenameIcon } from '../icons'
import { Icon } from './Icon'
import { run } from '../actions/run'
import { useDetailData, type Loaded } from '../useDetailData'
import { FileIcon } from './FileIcon'
import { Progress } from './Progress'

function Async<T>({ state, empty, children }: { state: Loaded<T>; empty: (d: T) => boolean; children: (d: T) => React.ReactNode }) {
  if (state.status === 'loading') return <p className="panel__empty">Loading…</p>
  if (state.status === 'error') return <p className="panel__empty" role="alert">{state.message}</p>
  if (empty(state.data)) return <p className="panel__empty">Nothing to show.</p>
  return <>{children(state.data)}</>
}

const PRIORITIES: { value: FilePriority; label: string }[] = [
  { value: 0, label: 'Skip' },
  { value: 1, label: 'Normal' },
  { value: 6, label: 'High' },
  { value: 7, label: 'Maximal' },
]

function PriorityCell({ node, hash, onChanged }: { node: FileNode; hash: string; onChanged: () => void }) {
  return (
    <select
      className="select--sm"
      aria-label={`Priority for ${node.name}`}
      value={node.priority ?? 'mixed'}
      onChange={(e) => {
        const p = Number(e.target.value) as FilePriority
        void run(() => detailsApi.setFilePriority(hash, node.indices, p), {
          success: node.kind === 'folder' ? `Priority set for ${node.indices.length} files` : `Priority set for ${node.name}`,
          failure: 'Could not change priority',
        }).then(onChanged)
      }}
    >
      {node.priority === null && <option value="mixed" disabled>Mixed</option>}
      {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
    </select>
  )
}

function NameCell({ node, hash, collapsed, toggle, onChanged }: { node: FileNode; hash: string; collapsed: boolean; toggle: () => void; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.name)
  const commit = () => {
    setEditing(false)
    const name = draft.trim()
    if (!name || name === node.name || name.includes('/')) return
    const slash = node.path.lastIndexOf('/')
    const newPath = (slash >= 0 ? node.path.slice(0, slash + 1) : '') + name
    const call = node.kind === 'folder' ? detailsApi.renameFolder : detailsApi.renameFile
    void run(() => call(hash, node.path, newPath), { success: `Renamed to ${name}`, failure: 'Could not rename' }).then(onChanged)
  }
  return (
    <div className="ftree__name" style={{ paddingLeft: node.depth * 12 }}>
      {node.kind === 'folder' ? (
        <button type="button" className="iconbtn iconbtn--sm" aria-expanded={!collapsed} aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${node.name}`} onClick={toggle}>
          <Icon icon={collapsed ? ChevronRightIcon : ChevronDownIcon} size={14} />
        </button>
      ) : <span className="ftree__spacer" />}
      <FileIcon name={node.name} isDirectory={node.kind === 'folder'} size={16} />
      {editing ? (
        <input
          className="ftree__edit"
          aria-label={`New name for ${node.name}`}
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(node.name); setEditing(false) } }}
        />
      ) : (
        <>
          <span className="ftree__label" title={node.path}><bdi>{node.name}</bdi></span>
          <button type="button" className="iconbtn iconbtn--sm ftree__rename" aria-label={`Rename ${node.name}`} title="Rename" onClick={() => { setDraft(node.name); setEditing(true) }}><Icon icon={RenameIcon} size={13} /></button>
        </>
      )}
    </div>
  )
}

export function FilesTab({ hash }: { hash: string }) {
  const load = useCallback((s: AbortSignal) => detailsApi.files(hash, s), [hash])
  const state = useDetailData(`files:${hash}`, load)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const reload = () => state.status === 'ok' && state.reload()
  return (
    <Async state={state} empty={(d) => d.length === 0}>
      {(files) => {
        const rows = visibleNodes(buildFileTree(files), collapsed)
        return (
          <table className="dtable dtable--files">
            <colgroup><col /><col className="c-size" /><col className="c-progress" /><col className="c-prio" /></colgroup>
            <thead><tr><th>Name</th><th>Size</th><th>Progress</th><th>Priority</th></tr></thead>
            <tbody>
              {rows.map((n) => (
                <tr key={n.path} data-skipped={n.priority === 0 || undefined}>
                  <td className="dtable__name">
                    <NameCell
                      node={n} hash={hash} collapsed={collapsed.has(n.path)} onChanged={reload}
                      toggle={() => setCollapsed((c) => { const x = new Set(c); if (x.has(n.path)) x.delete(n.path); else x.add(n.path); return x })}
                    />
                  </td>
                  <td className="num">{formatBytes(n.size)}</td>
                  <td><Progress value={nodeProgress(n)} variant="bar" /></td>
                  <td><PriorityCell node={n} hash={hash} onChanged={reload} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }}
    </Async>
  )
}

const TRACKER_STATUS: Record<number, string> = { 0: 'Disabled', 1: 'Not contacted', 2: 'Working', 3: 'Updating', 4: 'Not working' }

export function TrackersTab({ hash }: { hash: string }) {
  const load = useCallback((s: AbortSignal) => detailsApi.trackers(hash, s), [hash])
  const state = useDetailData(`trackers:${hash}`, load, 5000)
  return (
    <Async state={state} empty={(d) => d.length === 0}>
      {(rows) => (
        <table className="dtable">
          <thead><tr><th>URL</th><th>Status</th><th>Seeds</th><th>Peers</th><th>Message</th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.url}>
                <td className="dtable__name" title={t.url}><span>{t.url}</span></td>
                <td>{TRACKER_STATUS[t.status] ?? String(t.status)}</td>
                <td className="num">{t.num_seeds >= 0 ? t.num_seeds : '—'}</td>
                <td className="num">{t.num_peers >= 0 ? t.num_peers : '—'}</td>
                <td className="muted">{t.msg || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Async>
  )
}

/** Flag + code for a peer; the full country name is the tooltip and the accessible name. Empty for private/unknown addresses. */
function PeerFlag({ peer }: { peer: Peer }) {
  const [broken, setBroken] = useState(false)
  const c = peerCountry(peer)
  if (!c) return <span className="muted" aria-label="Unknown country">—</span>
  return (
    <span className="peerflag" title={c.name}>
      {!broken && <img src={`flags/${c.code}.svg`} alt="" width={20} height={15} loading="lazy" onError={() => setBroken(true)} />}
      <span className="sr-only">{c.name}</span>
      <span aria-hidden="true">{c.code.toUpperCase()}</span>
    </span>
  )
}

export function PeersTab({ hash }: { hash: string }) {
  const load = useCallback((s: AbortSignal) => detailsApi.peers(hash, s), [hash])
  const state = useDetailData(`peers:${hash}`, load, 3000)
  return (
    <Async state={state} empty={(d) => d.length === 0}>
      {(rows) => (
        <>
          <table className="dtable">
            <thead><tr><th>Country</th><th>Address</th><th>Client</th><th>Progress</th><th>Down</th><th>Up</th><th>Flags</th></tr></thead>
            <tbody>
              {[...rows].sort((a, b) => b.dl_speed + b.up_speed - (a.dl_speed + a.up_speed)).map((p) => (
                <tr key={`${p.ip}:${p.port}`}>
                  <td><PeerFlag peer={p} /></td>
                  <td className="num">{p.ip}:{p.port}</td>
                  <td className="muted">{p.client || '—'}</td>
                  <td className="num">{formatPercent(p.progress)}</td>
                  <td className="num">{formatSpeed(p.dl_speed)}</td>
                  <td className="num">{formatSpeed(p.up_speed)}</td>
                  <td className="muted">{p.flags || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {countriesUnavailable(rows) && (
            <p className="muted peerflag__hint">No countries reported. Turn on <strong>Resolve peer countries</strong> in <a href="#/settings">Settings → Advanced</a> (private addresses never have one).</p>
          )}
        </>
      )}
    </Async>
  )
}
