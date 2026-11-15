import { getJson } from './transport'

/** qBittorrent log severities (bit flags on the wire). */
export const LOG_LEVEL = { normal: 1, info: 2, warning: 4, critical: 8 } as const
export type LogLevel = keyof typeof LOG_LEVEL
export interface LogEntry { id: number; message: string; timestamp: number; type: number }

export const logsApi = {
  /** Entries newer than `lastKnownId` (-1 = all retained entries). */
  main: (lastKnownId: number, signal?: AbortSignal) => getJson<LogEntry[]>(`log/main?last_known_id=${lastKnownId}`, signal),
}
