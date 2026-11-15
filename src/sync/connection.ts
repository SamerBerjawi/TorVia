/** Connection state machine. Pure transition function; engine owns the side effects. */

export type ConnectionState =
  | { kind: 'connecting' }
  | { kind: 'online'; lastSyncAt: number }
  | { kind: 'degraded'; since: number; failures: number; lastSyncAt: number | null }
  | { kind: 'unauthenticated' }

export type ConnectionEvent =
  | { type: 'sync-ok'; at: number }
  | { type: 'sync-failed'; at: number }
  | { type: 'auth-lost' }

export function transition(state: ConnectionState, event: ConnectionEvent): ConnectionState {
  switch (event.type) {
    case 'auth-lost':
      return { kind: 'unauthenticated' }
    case 'sync-ok':
      return state.kind === 'unauthenticated' ? state : { kind: 'online', lastSyncAt: event.at }
    case 'sync-failed':
      switch (state.kind) {
        case 'unauthenticated':
          return state
        case 'degraded':
          return { ...state, failures: state.failures + 1 }
        case 'online':
          return { kind: 'degraded', since: event.at, failures: 1, lastSyncAt: state.lastSyncAt }
        case 'connecting':
          return { kind: 'degraded', since: event.at, failures: 1, lastSyncAt: null }
      }
  }
}

/** Exponential backoff with cap; jitter is injected for testability. */
export function backoffMs(failures: number, random: () => number = Math.random): number {
  const base = Math.min(30_000, 1_000 * 2 ** Math.max(0, failures - 1))
  return Math.round(base * (0.8 + random() * 0.4))
}
