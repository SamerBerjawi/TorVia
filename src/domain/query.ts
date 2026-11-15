import type { Torrent } from '@/api/types'
import { matchesStatus, splitTags, STATUS_FILTERS, type StatusFilter } from './filters'

/**
 * Small query language shared by every search box:
 *   free text           name contains (case-insensitive)
 *   state:seeding       any status view (see filters.ts)
 *   cat:linux           category (exact, case-insensitive); `cat:` alone = uncategorised
 *   tag:4k              has tag
 *   size:>1GB  ratio:<1  progress:>=50
 *   -cat:films          negation; "quoted values" allowed
 */
export type Clause =
  | { kind: 'text'; value: string; negate: boolean }
  | { kind: 'state'; value: StatusFilter; negate: boolean }
  | { kind: 'cat' | 'tag'; value: string; negate: boolean }
  | { kind: 'size' | 'ratio' | 'progress'; op: Op; value: number; negate: boolean }
  | { kind: 'invalid'; raw: string; reason: string }

type Op = '>' | '<' | '>=' | '<=' | '='

const UNITS: Record<string, number> = {
  B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KIB: 1024, MIB: 1024 ** 2, GIB: 1024 ** 3, TIB: 1024 ** 4,
}

export function tokenize(input: string): string[] {
  const out: string[] = []
  const re = /(-?[a-z]+:)?"([^"]*)"?|\S+/gi
  for (const m of input.matchAll(re)) out.push(m[2] !== undefined ? (m[1] ?? '') + m[2] : m[0])
  return out.filter(Boolean)
}

function parseNumber(kind: 'size' | 'ratio' | 'progress', raw: string): { op: Op; value: number } | null {
  const m = /^(>=|<=|>|<|=)?\s*([\d.]+)\s*([a-z]*)$/i.exec(raw)
  if (!m || m[2] === undefined) return null
  const op = (m[1] ?? '=') as Op
  let value = Number(m[2])
  if (!Number.isFinite(value)) return null
  const unit = (m[3] ?? '').toUpperCase()
  if (kind === 'size') {
    const mult = UNITS[unit || 'B']
    if (mult === undefined) return null
    value *= mult
  } else if (kind === 'progress') {
    if (unit && unit !== '%') return null
    value /= 100
  } else if (unit) return null
  return { op, value }
}

export function parseClause(token: string): Clause {
  const negate = token.startsWith('-') && token.length > 1
  const body = negate ? token.slice(1) : token
  const colon = body.indexOf(':')
  if (colon <= 0) return { kind: 'text', value: body.toLowerCase(), negate }
  const field = body.slice(0, colon).toLowerCase()
  const value = body.slice(colon + 1)
  switch (field) {
    case 'state':
    case 'is': {
      const v = value.toLowerCase() as StatusFilter
      return STATUS_FILTERS.includes(v) ? { kind: 'state', value: v, negate } : { kind: 'invalid', raw: token, reason: `Unknown state "${value}"` }
    }
    case 'cat':
    case 'category':
      return { kind: 'cat', value: value.toLowerCase(), negate }
    case 'tag':
      return { kind: 'tag', value: value.toLowerCase(), negate }
    case 'size':
    case 'ratio':
    case 'progress': {
      const n = parseNumber(field, value)
      return n ? { kind: field, ...n, negate } : { kind: 'invalid', raw: token, reason: `Can't read "${value}"` }
    }
    default:
      return { kind: 'text', value: body.toLowerCase(), negate }
  }
}

export function parseQuery(input: string): Clause[] {
  return tokenize(input).map(parseClause)
}

function compare(a: number, op: Op, b: number): boolean {
  switch (op) {
    case '>': return a > b
    case '<': return a < b
    case '>=': return a >= b
    case '<=': return a <= b
    case '=': return a === b
  }
}

function test(c: Exclude<Clause, { kind: 'invalid' }>, t: Torrent): boolean {
  switch (c.kind) {
    case 'text': return t.name.toLowerCase().includes(c.value)
    case 'state': return matchesStatus(c.value, t)
    case 'cat': return (t.category ?? '').toLowerCase() === c.value
    case 'tag': return splitTags(t.tags ?? '').some((x) => x.toLowerCase() === c.value)
    case 'size': return compare(t.size, c.op, c.value)
    case 'ratio': return compare(t.ratio, c.op, c.value)
    case 'progress': return compare(t.progress, c.op, c.value)
  }
}

/** All valid clauses must match (AND). Invalid clauses are ignored here and surfaced by the UI. */
export function compileQuery(clauses: readonly Clause[]): (t: Torrent) => boolean {
  const valid = clauses.filter((c): c is Exclude<Clause, { kind: 'invalid' }> => c.kind !== 'invalid')
  if (valid.length === 0) return () => true
  return (t) => valid.every((c) => test(c, t) !== c.negate)
}

export function clauseLabel(c: Clause): string {
  const neg = 'negate' in c && c.negate ? '-' : ''
  switch (c.kind) {
    case 'text': return neg + c.value
    case 'invalid': return c.raw
    case 'size': case 'ratio': case 'progress': return `${neg}${c.kind}:${c.op === '=' ? '' : c.op}${c.kind === 'progress' ? `${c.value * 100}%` : c.kind === 'size' ? humanSize(c.value) : c.value}`
    default: return `${neg}${c.kind}:${c.value}`
  }
}

function humanSize(bytes: number): string {
  for (const [u, m] of [['TB', 1e12], ['GB', 1e9], ['MB', 1e6], ['KB', 1e3]] as const) if (bytes >= m) return `${+(bytes / m).toFixed(2)}${u}`
  return `${bytes}B`
}
