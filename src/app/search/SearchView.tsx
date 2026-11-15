import { useEffect, useMemo, useRef, useState } from 'react'
import { searchApi, type SearchPlugin, type SearchResult } from '@/api/search'
import { ApiError } from '@/api/transport'
import { formatBytes } from '@/domain/format'
import { commonCategories, displayCount, displaySize, filterResults, sortResults, type ResultSort, type SearchSort } from '@/domain/search'
import { isSameSize, parseSearchHash } from '@/domain/similar'
import { notifyError } from '../feedback/toast'
import { openDialog } from '../dialogs/dialogStore'
import { useHash } from '../router'

type Phase = { kind: 'idle' } | { kind: 'running' | 'done'; id: number }

/** qBittorrent's built-in search plugins (needs Python on the server). Results poll while a search runs. */
export default function SearchView() {
  const [plugins, setPlugins] = useState<SearchPlugin[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [pattern, setPattern] = useState('')
  const [category, setCategory] = useState('all')
  const [which, setWhich] = useState('enabled')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [results, setResults] = useState<SearchResult[]>([])
  const [text, setText] = useState('')
  const [minSeeds, setMinSeeds] = useState(0)
  const [sort, setSort] = useState<ResultSort>({ key: 'seeders', dir: 'desc' })
  const current = useRef<number | null>(null)
  const hash = useHash()
  const [wanted, setWanted] = useState<number | null>(null) // size (bytes) we hope to match, from "Search for similar"

  useEffect(() => {
    const ctl = new AbortController()
    searchApi.plugins(ctl.signal).then(setPlugins).catch((e) => !ctl.signal.aborted && setLoadError(e instanceof ApiError ? e.message : 'Could not load search plugins'))
    return () => ctl.abort()
  }, [])

  // Poll while running; clean up the server-side job when leaving.
  useEffect(() => {
    if (phase.kind !== 'running') return
    const ctl = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = async () => {
      try {
        const r = await searchApi.results(phase.id, ctl.signal)
        if (ctl.signal.aborted) return
        setResults(r.results)
        if (r.status === 'Stopped') { setPhase({ kind: 'done', id: phase.id }); return }
      } catch (e) {
        if (ctl.signal.aborted) return
        notifyError('Search failed', e)
        setPhase({ kind: 'done', id: phase.id })
        return
      }
      timer = setTimeout(() => void tick(), 1500)
    }
    void tick()
    return () => { ctl.abort(); if (timer) clearTimeout(timer) }
  }, [phase])
  useEffect(() => () => { if (current.current !== null) void searchApi.stop(current.current).then(() => searchApi.remove(current.current!)).catch(() => undefined) }, [])

  const enabled = useMemo(() => (plugins ?? []).filter((p) => p.enabled), [plugins])
  const chosen = which === 'enabled' || which === 'all' ? enabled : enabled.filter((p) => p.name === which)
  const categories = useMemo(() => commonCategories(chosen), [chosen])
  const shown = useMemo(() => sortResults(filterResults(results, text, minSeeds), sort), [results, text, minSeeds, sort])

  const begin = async (text: string, category0 = category, which0 = which) => {
    const q = text.trim()
    if (!q) return
    if (current.current !== null) { const old = current.current; void searchApi.stop(old).then(() => searchApi.remove(old)).catch(() => undefined) }
    try {
      const cats = commonCategories(which0 === 'enabled' || which0 === 'all' ? enabled : enabled.filter((p) => p.name === which0))
      const id = await searchApi.start(q, cats.some((c) => c.id === category0) ? category0 : 'all', which0)
      current.current = id
      setResults([])
      setPhase({ kind: 'running', id })
    } catch (err) {
      notifyError('Could not start the search', err)
    }
  }
  const start = (e: React.FormEvent) => { e.preventDefault(); setWanted(null); void begin(pattern) }

  // Arriving from "Search for similar torrents" / "Search for this file": prefill, remember the size, run once.
  useEffect(() => {
    const req = parseSearchHash(hash)
    if (!req || !plugins) return
    history.replaceState(null, '', '#/search') // consume the request so a reload or back/forward doesn't repeat it
    setPattern(req.query); setWanted(req.size); setText(''); setMinSeeds(0)
    if (enabled.length > 0) void begin(req.query, 'all', 'enabled')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, plugins])

  const sortBy = (key: SearchSort) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }))
  const aria = (key: SearchSort) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined)

  if (loadError) return <div className="searchpage"><h1>Search</h1><p className="panel__empty" role="alert">{loadError}</p></div>
  if (!plugins) return <p className="panel__empty" role="status">Loading search…</p>

  return (
    <div className="searchpage">
      <header className="settings__head"><h1>Search</h1></header>
      {enabled.length === 0 ? (
        <p className="panel__empty">
          No search plugins are enabled. qBittorrent’s search needs Python on the server and at least one plugin, installed in its own “Search engine” window.
        </p>
      ) : (
        <>
          <form className="searchpage__form" onSubmit={start}>
            <input type="search" aria-label="Search for torrents" placeholder="Search for torrents" value={pattern} onChange={(e) => setPattern(e.target.value)} />
            <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select aria-label="Plugins" value={which} onChange={(e) => setWhich(e.target.value)}>
              <option value="enabled">All enabled plugins</option>
              {enabled.map((p) => <option key={p.name} value={p.name}>{p.fullName}</option>)}
            </select>
            {phase.kind === 'running'
              ? <button type="button" className="btn" onClick={() => void searchApi.stop(phase.id).finally(() => setPhase({ kind: 'done', id: phase.id }))}>Stop</button>
              : <button type="submit" className="btn btn--accent" disabled={!pattern.trim()}>Search</button>}
          </form>
          {wanted !== null && <p className="searchpage__wanted">Looking for something exactly <strong>{formatBytes(wanted)}</strong> ({wanted.toLocaleString()} bytes). Results that size are marked, and a match is a strong sign the content is identical.</p>}
          {phase.kind !== 'idle' && (
            <div className="searchpage__bar" role="status">
              {phase.kind === 'running' ? 'Searching…' : 'Finished.'} {results.length} results{shown.length !== results.length ? `, ${shown.length} shown` : ''}
              <span className="rss__spacer" />
              <input aria-label="Filter results" placeholder="Filter results" value={text} onChange={(e) => setText(e.target.value)} />
              <label>Min seeders <input type="number" min={0} value={minSeeds} onChange={(e) => setMinSeeds(Math.max(0, Number(e.target.value) || 0))} className="searchpage__num" /></label>
            </div>
          )}
          {phase.kind !== 'idle' && (
            <div className="searchpage__results">
              <table className="dtable">
                <thead>
                  <tr>
                    <th aria-sort={aria('name')}><button type="button" className="thsort" onClick={() => sortBy('name')}>Name</button></th>
                    <th aria-sort={aria('size')}><button type="button" className="thsort" onClick={() => sortBy('size')}>Size</button></th>
                    <th aria-sort={aria('seeders')}><button type="button" className="thsort" onClick={() => sortBy('seeders')}>Seeders</button></th>
                    <th aria-sort={aria('leechers')}><button type="button" className="thsort" onClick={() => sortBy('leechers')}>Leechers</button></th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.slice(0, 500).map((r, i) => (
                    <tr key={`${r.fileUrl}:${i}`}>
                      <td className="dtable__name"><span title={r.fileName}>{r.fileName}</span>{isSameSize(r.fileSize, wanted) && <span className="searchpage__badge">Same size</span>}</td>
                      <td className="num">{displaySize(r.fileSize, formatBytes)}</td>
                      <td className="num">{displayCount(r.nbSeeders)}</td>
                      <td className="num">{displayCount(r.nbLeechers)}</td>
                      <td><button type="button" className="btn" aria-label={`Download ${r.fileName}`} onClick={() => openDialog({ kind: 'add', links: r.fileUrl })}>Download</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {shown.length === 0 && <p className="panel__empty">{phase.kind === 'running' ? 'Waiting for results…' : 'No results.'}</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}
