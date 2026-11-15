import { useEffect, useMemo, useRef, useState } from 'react'
import type { LogEntry, LogLevel } from '@/api/logs'
import { logsApi } from '@/api/logs'
import { ApiError } from '@/api/transport'
import { filterLog, levelName, logToText, mergeLog } from '@/domain/logs'

const LEVELS: { id: LogLevel; label: string }[] = [
  { id: 'critical', label: 'Critical' }, { id: 'warning', label: 'Warning' }, { id: 'info', label: 'Info' }, { id: 'normal', label: 'Normal' },
]

/** qBittorrent's execution log, polled incrementally with last_known_id. Read-only. */
export default function LogsView() {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [levels, setLevels] = useState<ReadonlySet<LogLevel>>(new Set(['critical', 'warning', 'info', 'normal']))
  const [query, setQuery] = useState('')
  const [follow, setFollow] = useState(true)
  const lastId = useRef(-1)
  const list = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const ctl = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async () => {
      try {
        const fresh = await logsApi.main(lastId.current, ctl.signal)
        if (ctl.signal.aborted) return
        if (fresh.length > 0) {
          lastId.current = Math.max(lastId.current, ...fresh.map((f) => f.id))
          setEntries((cur) => mergeLog(cur, fresh))
        }
        setError(null)
        setLoaded(true)
      } catch (e) {
        if (ctl.signal.aborted) return
        setError(e instanceof ApiError ? e.message : 'Could not load the log')
        setLoaded(true)
      }
      if (!ctl.signal.aborted) timer = setTimeout(() => void tick(), document.hidden ? 10_000 : 2_000)
    }
    void tick()
    return () => { ctl.abort(); if (timer) clearTimeout(timer) }
  }, [])

  const shown = useMemo(() => filterLog(entries, levels, query), [entries, levels, query])
  useEffect(() => {
    if (follow && list.current) list.current.scrollTop = list.current.scrollHeight
  }, [shown, follow])

  const toggle = (l: LogLevel) => setLevels((cur) => { const n = new Set(cur); if (n.has(l)) n.delete(l); else n.add(l); return n })
  const download = () => {
    const url = URL.createObjectURL(new Blob([logToText(shown)], { type: 'text/plain' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: 'qbittorrent-log.txt' })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="logs">
      <header className="settings__head">
        <h1>Logs</h1>
        <input type="search" className="settings__search" placeholder="Search log" aria-label="Search log" value={query} onChange={(e) => setQuery(e.target.value)} />
      </header>
      <div className="logs__bar">
        <fieldset className="logs__levels">
          <legend className="sr-only">Show levels</legend>
          {LEVELS.map((l) => (
            <label key={l.id} data-level={l.id}><input type="checkbox" checked={levels.has(l.id)} onChange={() => toggle(l.id)} />{l.label}</label>
          ))}
        </fieldset>
        <label className="logs__follow"><input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} />Follow new entries</label>
        <button type="button" className="btn" disabled={shown.length === 0} onClick={download}>Download .txt</button>
      </div>
      {error && <p className="panel__empty" role="alert">{error}</p>}
      {!loaded && <p className="panel__empty" role="status">Loading log…</p>}
      {loaded && !error && shown.length === 0 && <p className="panel__empty">{entries.length === 0 ? 'The log is empty.' : 'No entries match.'}</p>}
      <ol className="logs__list" ref={list} tabIndex={0} aria-label={`Log entries, ${shown.length} shown`}>
        {shown.map((e) => (
          <li key={e.id} data-level={levelName(e.type)}>
            <time dateTime={new Date(e.timestamp).toISOString()}>{new Date(e.timestamp).toLocaleTimeString()}</time>
            <span className="logs__lvl">{levelName(e.type)}</span>
            <span className="logs__msg">{e.message}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
