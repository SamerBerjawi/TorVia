import { ApiError, getJson } from '@/api/transport'
import type { MainDataResponse } from '@/api/types'
import { backoffMs, transition, type ConnectionEvent, type ConnectionState } from './connection'
import { emptySyncState, reconcile, type SyncState } from './reconcile'

export interface EngineSnapshot {
  readonly data: SyncState
  readonly connection: ConnectionState
}

const ACTIVE_INTERVAL_MS = 2_000
const HIDDEN_INTERVAL_MS = 15_000

/**
 * Polls `sync/maindata` with a single in-flight request, schedules the next poll
 * only after the previous one settles, slows down in hidden tabs, backs off on
 * failure and stops on auth loss. Framework-agnostic: React reads it through
 * `subscribe` / `getSnapshot` (useSyncExternalStore).
 */
export class SyncEngine {
  private snapshot: EngineSnapshot = { data: emptySyncState, connection: { kind: 'connecting' } }
  private listeners = new Set<() => void>()
  private timer: ReturnType<typeof setTimeout> | undefined
  private abort: AbortController | undefined
  private running = false

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  readonly getSnapshot = (): EngineSnapshot => this.snapshot

  start(): void {
    if (this.running) return
    this.running = true
    document.addEventListener('visibilitychange', this.onVisibility)
    void this.tick()
  }

  stop(): void {
    this.running = false
    document.removeEventListener('visibilitychange', this.onVisibility)
    clearTimeout(this.timer)
    this.abort?.abort()
  }

  /** Poll now (e.g. after a user action) instead of waiting for the next interval. */
  refresh(): void {
    if (!this.running) return
    clearTimeout(this.timer)
    void this.tick()
  }

  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'visible') this.refresh()
  }

  private emit(next: Partial<EngineSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...next }
    for (const l of this.listeners) l()
  }

  private dispatch(event: ConnectionEvent): void {
    const connection = transition(this.snapshot.connection, event)
    if (connection !== this.snapshot.connection) this.emit({ connection })
  }

  private async tick(): Promise<void> {
    this.abort?.abort()
    const abort = (this.abort = new AbortController())
    try {
      const delta = await getJson<MainDataResponse>(`sync/maindata?rid=${this.snapshot.data.rid}`, abort.signal)
      const data = reconcile(this.snapshot.data, delta)
      this.dispatch({ type: 'sync-ok', at: Date.now() })
      if (data !== this.snapshot.data) this.emit({ data })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (e instanceof ApiError && (e.kind === 'unauthenticated' || e.kind === 'forbidden')) {
        this.dispatch({ type: 'auth-lost' })
        this.running = false
        return
      }
      this.dispatch({ type: 'sync-failed', at: Date.now() })
    }
    if (!this.running) return
    this.timer = setTimeout(() => void this.tick(), this.nextDelay())
  }

  private nextDelay(): number {
    const c = this.snapshot.connection
    if (c.kind === 'degraded') return backoffMs(c.failures)
    return document.visibilityState === 'hidden' ? HIDDEN_INTERVAL_MS : ACTIVE_INTERVAL_MS
  }
}
