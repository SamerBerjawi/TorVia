# 0003 — Pure reducers and one polling engine

**Context.** `sync/maindata` returns diffs keyed by a `rid`. UI code must never see half-applied state and must stay cheap with thousands of torrents.

**Decision.** `sync/reconcile.ts` (pure reducer with structural sharing) turns responses into state; `sync/connection.ts` is a pure state machine; `sync/engine.ts` is the only side-effecting piece (one in-flight poll, 2 s active / 15 s hidden, backoff, stop on 401/403). React reads it through `useSyncExternalStore`. Mutations never update state optimistically; they call `engine.refresh()` and let sync confirm.

**Consequences.** Logic is unit-testable without React or network. Failed mutations can never leave the UI lying. Each open tab polls independently (no leader election yet; acceptable at 2 s cadence).
