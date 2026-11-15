import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { STATUS_FILTERS } from '@/domain/filters'
import { clauseLabel, parseClause, tokenize } from '@/domain/query'
import { CloseIcon, SavedViewIcon } from '../icons'
import { saveView } from '../savedViews'
import { useUi } from '../uiStore'
import type { useTorrentView } from '../useTorrentView'
import { Icon } from './Icon'

type View = ReturnType<typeof useTorrentView>
interface Suggestion { insert: string; label: string; detail: string }

const quote = (v: string) => (/\s/.test(v) ? `"${v}"` : v)

/** Token query bar with autocomplete for state:, cat:, tag: (Signal). Writes the combined query to the UI store. */
export function QueryBar({ view }: { view: View }) {
  const { query, setQuery } = useUi()
  const [tokens, setTokens] = useState<string[]>(() => tokenize(query))
  const [draft, setDraft] = useState('')
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)

  const written = useRef(query)

  // External changes (saved view click, another skin's search box) re-seed the chips.
  useEffect(() => {
    if (query !== written.current) {
      written.current = query
      setTokens(tokenize(query))
      setDraft('')
    }
  }, [query])

  const commit = (nextTokens: string[], nextDraft: string) => {
    setTokens(nextTokens)
    setDraft(nextDraft)
    setActive(0)
  }

  const suggestions = useMemo((): Suggestion[] => {
    const m = /^(-?)(state|is|cat|category|tag):(.*)$/i.exec(draft)
    if (!m) return []
    const [, neg = '', rawField = '', partial = ''] = m
    const field = rawField.toLowerCase()
    const p = partial.toLowerCase()
    let pool: [string, number][]
    if (field === 'state' || field === 'is') pool = STATUS_FILTERS.map((s) => [s, view.counts[s]])
    else if (field === 'tag') pool = view.tags.map((t) => [t, view.tagCounts.get(t) ?? 0])
    else pool = view.categories.map((c) => [c, view.categoryCounts.get(c) ?? 0])
    const key = field === 'is' ? 'state' : field === 'category' ? 'cat' : field
    return pool
      .filter(([v]) => v.toLowerCase().startsWith(p))
      .slice(0, 8)
      .map(([v, n]) => ({ insert: `${neg}${key}:${quote(v)}`, label: v, detail: `${n} torrent${n === 1 ? '' : 's'}` }))
  }, [draft, view])

  // A half-typed `cat:li` would match nothing; apply the draft only once it is complete.
  const draftField = /^-?(state|is|cat|category|tag):(.*)$/i.exec(draft)
  const draftApplies = !draftField || suggestions.length === 0 || suggestions.some((s) => s.label.toLowerCase() === (draftField[2] ?? '').toLowerCase())
  const effective = [...tokens, draftApplies ? draft : ''].filter(Boolean).join(' ')
  useEffect(() => {
    if (effective !== written.current) {
      written.current = effective
      setQuery(effective)
    }
  }, [effective, setQuery])

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length)
    } else if ((e.key === 'Enter' || e.key === 'Tab') && suggestions[active]) {
      e.preventDefault()
      commit([...tokens, suggestions[active].insert], '')
    } else if ((e.key === 'Enter' || e.key === ' ') && draft.trim() && !draft.startsWith('"')) {
      e.preventDefault()
      commit([...tokens, draft.trim()], '')
    } else if (e.key === 'Backspace' && !draft && tokens.length) {
      e.preventDefault()
      commit(tokens.slice(0, -1), '')
    } else if (e.key === 'Escape' && (draft || tokens.length)) {
      e.stopPropagation()
      commit([], '')
    }
  }

  const listId = 'query-suggestions'
  return (
    <div className="querybar">
      <div className="querybar__field" onClick={() => input.current?.focus()}>
        <span className="querybar__prompt" aria-hidden="true">›</span>
        {tokens.map((tok, i) => {
          const c = parseClause(tok)
          const label = clauseLabel(c)
          const colon = label.indexOf(':')
          return (
            <span key={`${tok}-${i}`} className="chip" data-invalid={c.kind === 'invalid' || undefined} title={c.kind === 'invalid' ? c.reason : undefined}>
              {colon > 0 ? <><span className="chip__key">{label.slice(0, colon + 1)}</span>{label.slice(colon + 1)}</> : label}
              <button type="button" aria-label={`Remove ${label}`} onClick={() => commit(tokens.filter((_, j) => j !== i), draft)}>
                <Icon icon={CloseIcon} size={12} />
              </button>
            </span>
          )
        })}
        <input
          ref={input}
          data-search
          className="querybar__input"
          value={draft}
          placeholder={tokens.length ? '' : 'Filter: state:downloading cat:linux size:>1GB ratio:<1 …'}
          aria-label="Query torrents"
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={suggestions.length ? `${listId}-${active}` : undefined}
          onChange={(e) => {
            setDraft(e.target.value)
            setActive(0)
          }}
          onKeyDown={onKeyDown}
        />
        <kbd className="kbd">/</kbd>
        <button type="button" className="btn btn--accent" disabled={!query.trim()} onClick={() => saveView(query)}>
          <Icon icon={SavedViewIcon} size={14} />Save view
        </button>
      </div>
      {suggestions.length > 0 && (
        <ul className="suggest" id={listId} role="listbox" aria-label="Suggestions">
          {suggestions.map((s, i) => (
            <li key={s.insert} id={`${listId}-${i}`} role="option" aria-selected={i === active} onMouseDown={(e) => { e.preventDefault(); commit([...tokens, s.insert], '') }}>
              <span>{s.label}</span><span className="suggest__detail">{s.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
