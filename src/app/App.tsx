import { useEffect } from 'react'
import { Icon } from './components/Icon'
import { useAppearance, useMediaQuery, useServerVersion } from './hooks'
import { DisconnectedIcon } from './icons'
import { GraphiteLayout } from './layouts/GraphiteLayout'
import { PaperLayout } from './layouts/PaperLayout'
import { SignalLayout } from './layouts/SignalLayout'
import { engine, useEngine } from './store'
import { useTorrentView } from './useTorrentView'

const isTyping = (el: Element | null) => el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el instanceof HTMLElement && el.isContentEditable)

export function App() {
  useEffect(() => {
    engine.start()
    return () => engine.stop()
  }, [])

  // "/" or Ctrl/⌘+K focuses the search/query field of whichever skin is active.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === '/' && !isTyping(document.activeElement)) || (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey))) {
        const el = document.querySelector<HTMLInputElement>('[data-search]')
        if (el) {
          e.preventDefault()
          el.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const { connection } = useEngine()
  const { skin } = useAppearance()
  const narrow = useMediaQuery('(max-width: 800px)')
  const version = useServerVersion()
  const view = useTorrentView()

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

  const props = { view, narrow, version }
  return skin === 'paper' ? <PaperLayout {...props} /> : skin === 'signal' ? <SignalLayout {...props} /> : <GraphiteLayout {...props} />
}
