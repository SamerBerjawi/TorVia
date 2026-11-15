import { useCallback, useEffect, useMemo, useState } from 'react'
import { rssApi, type RssRule } from '@/api/rss'
import { ApiError } from '@/api/transport'
import { articlesOf, downloadLink, flattenFeeds, flattenTree, parseRssTree, ruleDefinition, type RssNode } from '@/domain/rss'
import { validateRuleName } from '@/domain/labels'
import { run } from '../actions/run'
import { Icon } from '../components/Icon'
import { openDialog } from '../dialogs/dialogStore'
import { DeleteIcon, RefreshIcon, RssIcon } from '../icons'
import { useEngine } from '../store'

type Tab = 'feeds' | 'rules'

/** Polls `load` every `ms`; `reload()` forces an immediate fetch (used after every mutation). */
function usePolled<T>(load: (s: AbortSignal) => Promise<T>, ms: number) {
  const [state, setState] = useState<{ status: 'loading' } | { status: 'error'; message: string } | { status: 'ok'; data: T }>({ status: 'loading' })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const ctl = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const go = async () => {
      try {
        const data = await load(ctl.signal)
        if (!ctl.signal.aborted) setState({ status: 'ok', data })
      } catch (e) {
        if (!ctl.signal.aborted) setState({ status: 'error', message: e instanceof ApiError ? e.message : 'Could not load RSS data' })
      }
      if (!ctl.signal.aborted) timer = setTimeout(() => void go(), document.hidden ? ms * 4 : ms)
    }
    void go()
    return () => { ctl.abort(); if (timer) clearTimeout(timer) }
  }, [load, ms, tick])
  return { state, reload: useCallback(() => setTick((n) => n + 1), []) }
}

export default function RssView() {
  const [tab, setTab] = useState<Tab>('feeds')
  return (
    <div className="rss">
      <header className="settings__head">
        <h1>RSS</h1>
        <div className="tabs tabs--inline" role="tablist" aria-label="RSS sections">
          {(['feeds', 'rules'] as const).map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} aria-controls={`rss-${t}`} onClick={() => setTab(t)}>{t === 'feeds' ? 'Feeds & articles' : 'Download rules'}</button>
          ))}
        </div>
      </header>
      <div role="tabpanel" id={`rss-${tab}`} className="rss__body">
        {tab === 'feeds' ? <FeedsTab /> : <RulesTab />}
      </div>
    </div>
  )
}

function FeedsTab() {
  const load = useCallback((s: AbortSignal) => rssApi.items(s), [])
  const { state, reload } = usePolled(load, 20_000)
  const tree = useMemo(() => (state.status === 'ok' ? parseRssTree(state.data) : []), [state])
  const nodes = useMemo(() => flattenTree(tree), [tree])
  const [selected, setSelected] = useState<string | null>(null)
  const node = nodes.find((n) => n.path === selected)
  const articles = useMemo(() => articlesOf(node, tree), [node, tree])
  const [url, setUrl] = useState('')
  const [folder, setFolder] = useState('')
  const [folderName, setFolderName] = useState('')

  const act = (fn: () => Promise<unknown>, success: string, failure: string) => run(fn, { success, failure }).then((ok) => { if (ok) reload(); return ok })

  const addFeed = (e: React.FormEvent) => {
    e.preventDefault()
    const u = url.trim()
    if (!/^https?:\/\//i.test(u)) return
    const name = u.replace(/^https?:\/\//i, '').split(/[/?#]/)[0] ?? u
    const path = folder.trim() ? `${folder.trim()}\\${name}` : name
    void act(() => rssApi.addFeed(u, path), `Added feed ${name}`, 'Could not add feed').then((ok) => { if (ok) setUrl('') })
  }
  const urlBad = url.trim() !== '' && !/^https?:\/\/\S+$/i.test(url.trim())

  if (state.status === 'loading') return <p className="panel__empty" role="status">Loading feeds…</p>
  if (state.status === 'error') return <p className="panel__empty" role="alert">{state.message}</p>

  return (
    <div className="rss__split">
      <div className="rss__tree">
        <form className="rss__add" onSubmit={addFeed}>
          <input aria-label="Feed URL" placeholder="https://example.org/feed.xml" value={url} aria-invalid={urlBad || undefined} onChange={(e) => setUrl(e.target.value)} />
          <input aria-label="Folder (optional)" placeholder="Folder (optional)" value={folder} onChange={(e) => setFolder(e.target.value)} />
          <button type="submit" className="btn btn--accent" disabled={url.trim() === '' || urlBad}>Add feed</button>
        </form>
        <form className="rss__add" onSubmit={(e) => { e.preventDefault(); const n = folderName.trim(); if (n) void act(() => rssApi.addFolder(n), `Created folder ${n}`, 'Could not create folder').then((ok) => ok && setFolderName('')) }}>
          <input aria-label="New folder name" placeholder="New folder" value={folderName} onChange={(e) => setFolderName(e.target.value)} />
          <button type="submit" className="btn" disabled={folderName.trim() === ''}>Add folder</button>
        </form>
        <ul className="rss__list" aria-label="Feeds">
          <li><button type="button" className="navitem" aria-current={selected === null || undefined} onClick={() => setSelected(null)}><Icon icon={RssIcon} size={16} /><span className="navitem__label">All articles</span><span className="navitem__count">{tree.reduce((n, t) => n + t.unread, 0)}</span></button></li>
          {nodes.map((n) => (
            <li key={n.path} style={{ paddingLeft: n.depth * 14 }}>
              <button type="button" className="navitem" aria-current={selected === n.path || undefined} onClick={() => setSelected(n.path)}>
                <Icon icon={RssIcon} size={16} /><span className="navitem__label">{n.name}</span><span className="navitem__count">{n.unread}</span>
              </button>
            </li>
          ))}
        </ul>
        {tree.length === 0 && <p className="muted">No feeds yet. Add an RSS or Atom URL above. qBittorrent must have RSS enabled in its own settings.</p>}
      </div>
      <section className="rss__articles" aria-label="Articles">
        <div className="rss__actions">
          <strong>{node?.name ?? 'All articles'}</strong>
          <span className="muted">{articles.length} articles</span>
          <span className="rss__spacer" />
          <button type="button" className="btn" disabled={!node && flattenFeeds(tree).length === 0} onClick={() => {
            const targets = node ? [node.path] : flattenFeeds(tree).map((f) => f.path)
            void act(() => Promise.all(targets.map((p) => rssApi.refreshItem(p))), 'Refreshing…', 'Could not refresh')
          }}><Icon icon={RefreshIcon} size={14} />Refresh</button>
          <button type="button" className="btn" disabled={!node || node.unread === 0} onClick={() => node && void act(() => rssApi.markAsRead(node.path), 'Marked as read', 'Could not mark as read')}>Mark all read</button>
          <button
            type="button" className="btn" disabled={!node}
            onClick={() => node && openDialog({
              kind: 'confirm', destructive: true, title: `Remove “${node.name}”?`, confirmLabel: node.kind === 'folder' ? 'Remove folder and feeds' : 'Remove feed',
              body: node.kind === 'folder' ? 'The folder and every feed inside it are removed. Torrents already added are not affected.' : 'Its articles are forgotten. Torrents already added are not affected.',
              onConfirm: async () => { if (await act(() => rssApi.removeItem(node.path), `Removed ${node.name}`, 'Could not remove')) setSelected(null) },
            })}
          ><Icon icon={DeleteIcon} size={14} />Remove</button>
        </div>
        {articles.length === 0 ? <p className="panel__empty">No articles yet.</p> : (
          <ul className="rss__articlelist">
            {articles.slice(0, 300).map((a) => {
              const link = downloadLink(a)
              return (
                <li key={`${a.feed.path}:${a.id}`} data-read={a.isRead || undefined}>
                  <div className="rss__title">{a.title}</div>
                  <div className="rss__meta muted">{a.feed.name}{a.date ? ` · ${new Date(a.date).toLocaleString()}` : ''}</div>
                  <div className="rss__row-actions">
                    <button type="button" className="btn" disabled={!link} title={link ? undefined : 'This article has no torrent or magnet link'} aria-label={`Download ${a.title}`} onClick={() => link && openDialog({ kind: 'add', links: link })}>Download</button>
                    {!a.isRead && <button type="button" className="btn btn--ghost" aria-label={`Mark ${a.title} as read`} onClick={() => void act(() => rssApi.markAsRead(a.feed.path, a.id), 'Marked as read', 'Could not mark as read')}>Mark read</button>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function RulesTab() {
  const load = useCallback((s: AbortSignal) => Promise.all([rssApi.rules(s), rssApi.items(s)]), [])
  const { state, reload } = usePolled(load, 30_000)
  const { data } = useEngine()
  const [open, setOpen] = useState<string | null>(null)
  const [name, setName] = useState('')
  if (state.status === 'loading') return <p className="panel__empty" role="status">Loading rules…</p>
  if (state.status === 'error') return <p className="panel__empty" role="alert">{state.message}</p>
  const [rules, items] = state.data
  const feeds = flattenFeeds(parseRssTree(items))
  const nameError = name === '' ? null : validateRuleName(name, Object.keys(rules))
  const empty: RssRule = { enabled: true, mustContain: '', mustNotContain: '', useRegex: false, episodeFilter: '', affectedFeeds: [], assignedCategory: '', savePath: '' }
  const save = (n: string, def: RssRule, msg: string) => run(() => rssApi.setRule(n, def), { success: msg, failure: 'Could not save rule' }).then((ok) => { if (ok) reload(); return ok })

  return (
    <div className="rss__rules">
      <form className="rss__add" onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (!n || nameError) return; void save(n, empty, `Created rule ${n}`).then((ok) => { if (ok) { setName(''); setOpen(n) } }) }}>
        <input aria-label="New rule name" placeholder="New rule name" value={name} aria-invalid={nameError ? true : undefined} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn btn--accent" disabled={name.trim() === '' || nameError !== null}>Add rule</button>
        {nameError && <span className="setting__error" role="alert">{nameError}</span>}
      </form>
      {Object.keys(rules).length === 0 && <p className="muted">No rules. A rule downloads new articles that match its filter automatically.</p>}
      <ul className="rss__rulelist">
        {Object.entries(rules).sort(([a], [b]) => a.localeCompare(b)).map(([n, r]) => (
          <li key={n}>
            <div className="rss__rulehead">
              <label><input type="checkbox" checked={r.enabled} aria-label={`Enable rule ${n}`} onChange={(e) => void save(n, ruleDefinition(r, { enabled: e.target.checked }), e.target.checked ? `Enabled ${n}` : `Disabled ${n}`)} /> <strong>{n}</strong></label>
              <span className="muted">{r.affectedFeeds.length} {r.affectedFeeds.length === 1 ? 'feed' : 'feeds'}{r.mustContain ? ` · matches “${r.mustContain}”` : ''}</span>
              <span className="rss__spacer" />
              <button type="button" className="btn" aria-expanded={open === n} onClick={() => setOpen(open === n ? null : n)}>{open === n ? 'Close' : 'Edit'}</button>
              <button type="button" className="iconbtn" aria-label={`Delete rule ${n}`} onClick={() => openDialog({ kind: 'confirm', destructive: true, title: `Delete rule “${n}”?`, confirmLabel: 'Delete rule', body: 'It stops downloading matching articles. Torrents already added stay.', onConfirm: async () => { if (await run(() => rssApi.removeRule(n), { success: `Deleted ${n}`, failure: 'Could not delete rule' })) reload() } })}><Icon icon={DeleteIcon} size={16} /></button>
            </div>
            {open === n && <RuleEditor name={n} rule={r} feeds={feeds} categories={[...data.categories.keys()]} onSave={(def) => save(n, def, `Saved ${n}`)} />}
          </li>
        ))}
      </ul>
    </div>
  )
}

function RuleEditor({ name, rule, feeds, categories, onSave }: { name: string; rule: RssRule; feeds: RssNode[]; categories: string[]; onSave: (def: RssRule) => Promise<boolean> }) {
  const [d, setD] = useState({ mustContain: rule.mustContain, mustNotContain: rule.mustNotContain, useRegex: rule.useRegex, episodeFilter: rule.episodeFilter, affectedFeeds: rule.affectedFeeds, assignedCategory: rule.assignedCategory, savePath: rule.savePath })
  const [busy, setBusy] = useState(false)
  const regexError = d.useRegex ? [d.mustContain, d.mustNotContain].map((p) => { try { new RegExp(p); return null } catch { return 'Not a valid regular expression' } }).find(Boolean) ?? null : null
  const toggleFeed = (url: string) => setD((c) => ({ ...c, affectedFeeds: c.affectedFeeds.includes(url) ? c.affectedFeeds.filter((u) => u !== url) : [...c.affectedFeeds, url] }))
  return (
    <form className="rss__editor" onSubmit={(e) => { e.preventDefault(); if (regexError) return; setBusy(true); void onSave(ruleDefinition(rule, d)).finally(() => setBusy(false)) }}>
      <label className="field"><span>Must contain</span><input value={d.mustContain} onChange={(e) => setD({ ...d, mustContain: e.target.value })} aria-label={`${name}: must contain`} /></label>
      <label className="field"><span>Must not contain</span><input value={d.mustNotContain} onChange={(e) => setD({ ...d, mustNotContain: e.target.value })} aria-label={`${name}: must not contain`} /></label>
      <label className="logs__follow"><input type="checkbox" checked={d.useRegex} onChange={(e) => setD({ ...d, useRegex: e.target.checked })} />Use regular expressions</label>
      {regexError && <small className="field__error" role="alert">{regexError}</small>}
      <label className="field"><span>Episode filter</span><input value={d.episodeFilter} placeholder="e.g. 1x01-;2x05-9;3x01,5,8-15" onChange={(e) => setD({ ...d, episodeFilter: e.target.value })} aria-label={`${name}: episode filter`} /></label>
      <label className="field"><span>Category</span>
        <select value={d.assignedCategory} onChange={(e) => setD({ ...d, assignedCategory: e.target.value })} aria-label={`${name}: category`}>
          <option value="">None</option>{categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <label className="field"><span>Save path</span><input value={d.savePath} placeholder="Default" onChange={(e) => setD({ ...d, savePath: e.target.value })} aria-label={`${name}: save path`} /></label>
      <fieldset className="rss__feedpick"><legend>Apply to feeds</legend>
        {feeds.length === 0 && <span className="muted">Add a feed first.</span>}
        {feeds.map((f) => <label key={f.path}><input type="checkbox" checked={d.affectedFeeds.includes(f.url ?? '')} onChange={() => toggleFeed(f.url ?? '')} />{f.name}</label>)}
      </fieldset>
      <button type="submit" className="btn btn--accent" disabled={busy || regexError !== null}>Save rule</button>
    </form>
  )
}
