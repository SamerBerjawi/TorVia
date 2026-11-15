import { useEffect, useSyncExternalStore } from 'react'
import { findCompleted } from '@/domain/completions'
import { notify } from './feedback/toast'
import { engine } from './store'

/** How to announce finished downloads. 'system' uses the browser's Notification API (HTTPS or localhost only). */
export type NotifyMode = 'off' | 'toast' | 'system'
const KEY = 'torvia.notify'

function read(): NotifyMode {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'toast' || v === 'system' ? v : 'off'
  } catch {
    return 'off'
  }
}
let mode = read()
const listeners = new Set<() => void>()

export const systemNotificationsAvailable = () => typeof Notification !== 'undefined' && window.isSecureContext

/** Switching to 'system' asks for permission (must run from a click); falls back to toasts if refused. */
export async function setNotifyMode(next: NotifyMode): Promise<NotifyMode> {
  let applied = next
  if (next === 'system') {
    if (!systemNotificationsAvailable()) applied = 'toast'
    else if (Notification.permission !== 'granted') applied = (await Notification.requestPermission()) === 'granted' ? 'system' : 'toast'
  }
  mode = applied
  try { localStorage.setItem(KEY, applied) } catch { /* session only */ }
  listeners.forEach((l) => l())
  return applied
}
export const useNotifyMode = () => useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l) }, () => mode)

/** Watches sync for finished downloads. Mount once, inside the signed-in app. */
export function useCompletionNotifications(): void {
  useEffect(() => {
    let prev = engine.getSnapshot().data.torrents
    return engine.subscribe(() => {
      const next = engine.getSnapshot().data.torrents
      if (next === prev) return
      const done = mode === 'off' ? [] : findCompleted(prev, next)
      prev = next
      if (done.length === 0) return
      const title = done.length === 1 ? 'Download complete' : `${done.length} downloads complete`
      const body = done.length === 1 ? done[0]! : done.slice(0, 3).join(', ') + (done.length > 3 ? '…' : '')
      if (mode === 'system' && Notification.permission === 'granted') {
        // `tag` collapses duplicates when several tabs are open.
        new Notification(title, { body, tag: `torvia-done-${done.join('|')}` })
      } else {
        notify(title, { description: body, tone: 'success' })
      }
    })
  }, [])
}
