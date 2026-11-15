import { describe, expect, it } from 'vitest'
import { backoffMs, transition, type ConnectionState } from './connection'

describe('connection machine', () => {
  const connecting: ConnectionState = { kind: 'connecting' }

  it('connecting -> online on success', () => {
    expect(transition(connecting, { type: 'sync-ok', at: 1 })).toEqual({ kind: 'online', lastSyncAt: 1 })
  })
  it('online -> degraded keeps last sync time, failures accumulate', () => {
    const d1 = transition({ kind: 'online', lastSyncAt: 5 }, { type: 'sync-failed', at: 10 })
    expect(d1).toEqual({ kind: 'degraded', since: 10, failures: 1, lastSyncAt: 5 })
    expect(transition(d1, { type: 'sync-failed', at: 20 })).toMatchObject({ failures: 2, since: 10 })
  })
  it('degraded -> online on recovery', () => {
    const d = transition(connecting, { type: 'sync-failed', at: 1 })
    expect(transition(d, { type: 'sync-ok', at: 2 }).kind).toBe('online')
  })
  it('unauthenticated is terminal', () => {
    const u = transition({ kind: 'online', lastSyncAt: 1 }, { type: 'auth-lost' })
    expect(transition(u, { type: 'sync-ok', at: 2 })).toBe(u)
    expect(transition(u, { type: 'sync-failed', at: 2 })).toBe(u)
  })
})

describe('backoffMs', () => {
  it('grows exponentially and caps at ~30s', () => {
    const mid = () => 0.5
    expect(backoffMs(1, mid)).toBe(1000)
    expect(backoffMs(3, mid)).toBe(4000)
    expect(backoffMs(20, mid)).toBe(30000)
  })
})
