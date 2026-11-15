import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { looksLikeTorrentLink } from '@/domain/selection'
import { ACTIONS, isEnabled } from './actions/catalogue'
import { useActionContext } from './actions/useActionContext'
import { DialogHost } from './dialogs/DialogHost'
import { openDialog, useDialogs } from './dialogs/dialogStore'
import { Toaster } from './feedback/Toaster'
import { loadServerInfo, useServerInfo } from './serverInfo'
import { Icon } from './components/Icon'
import { useAppearance, useMediaQuery } from './hooks'
import { AlertIcon, AttachIcon, DisconnectedIcon } from './icons'
import { GraphiteLayout } from './layouts/GraphiteLayout'
import { PaperLayout } from './layouts/PaperLayout'
import { SignalLayout } from './layouts/SignalLayout'
import { useRoute } from './router'
import { UpdateBanner } from './components/UpdateBanner'
import { useCompletionNotifications } from './notifications'
import { checkForUpdates } from './updates'
import { engine, useEngine } from './store'
import { useTorrentView } from './useTorrentView'

const StatisticsView = lazy(() => import('./charts/StatisticsView'))
const SettingsView = lazy(() => import('./settings/SettingsView'))
const LogsView = lazy(() => import('./logs/LogsView'))
const RssView = lazy(() => import('./rss/RssView'))
const SearchView = lazy(() => import('./search/SearchView'))
const CreatorView = lazy(() => import('./creator/CreatorView'))

const isTyping = (el: Element | null) => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el instanceof HTMLElement && el.isContentEditable)

export function App() {
  useEffect(() => {
    engine.start()
    return () => engine.stop()
  }, [])

  useCompletionNotifications()
  useEffect(() => { void checkForUpdates() }, [])
  const { connection } = useEngine()
  const { skin } = useAppearance()
  const narrow = useMediaQuery('(max-width: 800px)')
  const server = useServerInfo()
  const version = server.appVersion
  const view = useTorrentView()
  const route = useRoute()
  const ctx = useActionContext(view.order)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const [dropping, setDropping] = useState(false)

  useEffect(() => {
    if (connection.kind === 'online') loadServerInfo()
  }, [connection.kind])

  // Global keyboard: ⌘/Ctrl+K palette, "/" search, single-key action shortcuts (see actions/catalogue.ts).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useDialogs.getState().current) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        openDialog({ kind: 'palette' })
        return
      }
      const el = document.activeElement
      if (isTyping(el) || el?.closest('[role="menu"]')) return
      if (e.key === '/') {
        const search = document.querySelector<HTMLInputElement>('[data-search]')
        if (search) { e.preventDefault(); search.focus() }
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const key = e.key === 'Backspace' ? 'Delete' : e.key.length === 1 ? e.key.toLowerCase() : e.key
      const action = ACTIONS.find((a) => a.shortcut === key || (key === '?' && a.shortcut === '?'))
      if (action && isEnabled(action, ctxRef.current)) {
        e.preventDefault()
        void action.run(ctxRef.current)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Drop .torrent files anywhere, or paste a magnet link, to add.
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files')
    const onEnter = (e: DragEvent) => { if (hasFiles(e) && !useDialogs.getState().current) { depth++; setDropping(true) } }
    const onLeave = () => { depth = Math.max(0, depth - 1); if (depth === 0) setDropping(false) }
    const onOver = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault() }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e) || useDialogs.getState().current) return
      e.preventDefault()
      depth = 0
      setDropping(false)
      openDialog({ kind: 'add', files: [...(e.dataTransfer?.files ?? [])] })
    }
    const onPaste = (e: ClipboardEvent) => {
      if (useDialogs.getState().current || isTyping(document.activeElement)) return
      const text = e.clipboardData?.getData('text') ?? ''
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.name.endsWith('.torrent'))
      if (files.length || looksLikeTorrentLink(text)) {
        e.preventDefault()
        openDialog({ kind: 'add', links: text, files })
      }
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('dragover', onOver)
    window.addEventListener('drop', onDrop)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('drop', onDrop)
      window.removeEventListener('paste', onPaste)
    }
  }, [])

  if (connection.kind === 'unauthenticated') {
    return (
      <div className="fullscreen" role="alert">
        <Icon icon={DisconnectedIcon} size={28} />
        <p>Your session has ended.</p>
        <button type="button" className="btn btn--accent" onClick={() => location.reload()}>Sign in again</button>
      </div>
    )
  }
  if (connection.kind === 'connecting') return <div className="fullscreen" role="status">Connecting to qBittorrent…</div>

  const PAGES: Partial<Record<typeof route, React.LazyExoticComponent<() => React.JSX.Element>>> = {
    statistics: StatisticsView, settings: SettingsView, logs: LogsView, rss: RssView, search: SearchView, create: CreatorView,
  }
  const Page = PAGES[route]
  const page = Page ? (
    <Suspense fallback={<div className="fullscreen" role="status">Loading…</div>}>
      <Page />
    </Suspense>
  ) : null
  const props = { view, narrow, version, route, page, ctx }
  return (
    <>
      {server.status === 'ready' && !server.caps.supported && (
        <div className="compatbar" role="alert">
          <Icon icon={AlertIcon} size={14} />
          qBittorrent {server.appVersion} (WebAPI {server.apiVersion}) is older than Torvia supports. Torvia needs qBittorrent 5.0 or newer; some actions will fail.
        </div>
      )}
      <UpdateBanner />
      {skin === 'paper' ? <PaperLayout {...props} /> : skin === 'signal' ? <SignalLayout {...props} /> : <GraphiteLayout {...props} />}
      <DialogHost ctx={ctx} />
      <Toaster />
      {dropping && <div className="dropoverlay" aria-hidden="true"><Icon icon={AttachIcon} size={28} /><p>Drop .torrent files to add them</p></div>}
    </>
  )
}
