import { LOG_LEVEL, type LogEntry, type LogLevel } from '@/api/logs'

export const LOG_CAP = 2000

/** Appends new entries, ignoring ones already held, and keeps only the newest `cap`. Pure. */
export function mergeLog(existing: readonly LogEntry[], incoming: readonly LogEntry[], cap = LOG_CAP): LogEntry[] {
  const last = existing.at(-1)?.id ?? -1
  const fresh = incoming.filter((e) => e.id > last)
  if (fresh.length === 0) return existing as LogEntry[]
  const all = [...existing, ...fresh]
  return all.length > cap ? all.slice(all.length - cap) : all
}

export const levelName = (type: number): LogLevel => (type === LOG_LEVEL.critical ? 'critical' : type === LOG_LEVEL.warning ? 'warning' : type === LOG_LEVEL.info ? 'info' : 'normal')

export function filterLog(entries: readonly LogEntry[], levels: ReadonlySet<LogLevel>, query: string): LogEntry[] {
  const q = query.trim().toLowerCase()
  return entries.filter((e) => levels.has(levelName(e.type)) && (q === '' || e.message.toLowerCase().includes(q)))
}

/** Plain-text export, one line per entry, oldest first. */
export const logToText = (entries: readonly LogEntry[]): string =>
  entries.map((e) => `${new Date(e.timestamp).toISOString()} [${levelName(e.type)}] ${e.message}`).join('\n')
