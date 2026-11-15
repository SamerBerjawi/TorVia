import { useCallback } from 'react'
import { detailsApi, type FilePriority } from '@/api/details'
import { formatBytes, formatPercent, formatSpeed } from '@/domain/format'
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

export function FilesTab({ hash }: { hash: string }) {
  const load = useCallback((s: AbortSignal) => detailsApi.files(hash, s), [hash])
  const state = useDetailData(`files:${hash}`, load)
  return (
    <Async state={state} empty={(d) => d.length === 0}>
      {(files) => (
        <table className="dtable">
          <thead><tr><th>Name</th><th>Size</th><th>Progress</th><th>Priority</th></tr></thead>
          <tbody>
            {files.map((f) => {
              const slash = f.name.lastIndexOf('/')
              const dir = slash >= 0 ? f.name.slice(0, slash + 1) : ''
              const base = f.name.slice(slash + 1)
              return (
                <tr key={f.index} data-skipped={f.priority === 0 || undefined}>
                  <td className="dtable__name" title={f.name}>
                    <FileIcon name={base} size={16} />
                    <span>{dir && <span className="muted">{dir}</span>}{base}</span>
                  </td>
                  <td className="num">{formatBytes(f.size)}</td>
                  <td><Progress value={f.progress} variant="bar" /></td>
                  <td>
                    <select
                      className="select select--sm"
                      aria-label={`Priority for ${base}`}
                      value={f.priority}
                      onChange={(e) => {
                        const p = Number(e.target.value) as FilePriority
                        void run(() => detailsApi.setFilePriority(hash, [f.index], p), { success: `Priority set for ${base}`, failure: 'Could not change priority' }).then(() => state.status === 'ok' && state.reload())
                      }}
                    >
                      {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
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

export function PeersTab({ hash }: { hash: string }) {
  const load = useCallback((s: AbortSignal) => detailsApi.peers(hash, s), [hash])
  const state = useDetailData(`peers:${hash}`, load, 3000)
  return (
    <Async state={state} empty={(d) => d.length === 0}>
      {(rows) => (
        <table className="dtable">
          <thead><tr><th>Address</th><th>Client</th><th>Progress</th><th>Down</th><th>Up</th><th>Flags</th></tr></thead>
          <tbody>
            {[...rows].sort((a, b) => b.dl_speed + b.up_speed - (a.dl_speed + a.up_speed)).map((p) => (
              <tr key={`${p.ip}:${p.port}`}>
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
      )}
    </Async>
  )
}
