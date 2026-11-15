import type { CSSProperties } from 'react'
import { STATUS_LABEL, toStatus, type TorrentStatus } from '@/domain/status'

export const STATUS_TOKEN: Record<TorrentStatus, string> = {
  downloading: 'dl', seeding: 'seed', completed: 'done', stopped: 'stop', queued: 'queue', stalled: 'stall',
  checking: 'check', metadata: 'meta', moving: 'check', error: 'err', unknown: 'done',
}

export function statusStyle(raw: string): CSSProperties {
  const tok = STATUS_TOKEN[toStatus(raw)]
  return { '--c': `var(--st-${tok})`, '--ct': `var(--st-${tok}-text, var(--st-${tok}))` } as CSSProperties
}

/** One component, three presentations chosen by skin: dot + label, pill, or mono text. */
export function Status({ state, variant }: { state: string; variant: 'dot' | 'pill' | 'mono' }) {
  const s = toStatus(state)
  return (
    <span className={`status status--${variant}`} style={statusStyle(state)}>
      {variant === 'dot' && <i aria-hidden="true" />}
      {variant === 'mono' ? STATUS_LABEL[s].toLowerCase() : STATUS_LABEL[s]}
    </span>
  )
}
