import { Toast } from '@base-ui/react/toast'
import { ApiError } from '@/api/transport'

/** Global toast manager: callable from anywhere (actions, async handlers), rendered by <Toaster/>. */
export const toastManager = Toast.createToastManager()

export type ToastTone = 'success' | 'error' | 'info'

export function notify(title: string, opts: { description?: string; tone?: ToastTone } = {}): void {
  toastManager.add({ title, description: opts.description, type: opts.tone ?? 'info', timeout: opts.tone === 'error' ? 8000 : 4000 })
}

/** Human message for any failure; never silently swallowed. */
export function describeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.kind === 'network') return 'Cannot reach qBittorrent.'
    if (e.kind === 'unauthenticated' || e.kind === 'forbidden') return 'Your session has expired. Sign in again.'
    return e.message
  }
  return e instanceof Error ? e.message : String(e)
}

export function notifyError(title: string, e: unknown): void {
  notify(title, { description: describeError(e), tone: 'error' })
}
