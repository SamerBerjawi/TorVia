import { useSyncExternalStore } from 'react'
import { SyncEngine, type EngineSnapshot } from '@/sync/engine'

export const engine = new SyncEngine()

export function useEngine(): EngineSnapshot {
  return useSyncExternalStore(engine.subscribe, engine.getSnapshot)
}
