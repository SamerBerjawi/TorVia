import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { preferencesApi, type Preferences } from '@/api/preferences'
import { ApiError } from '@/api/transport'
import { diffPrefs, fromDisplay, isActive, SECTIONS, toDisplay, validateField, visibleFields, type Field } from '@/domain/settingsSchema'
import { MODE_LABEL, MODES, SKIN_LABEL, SKINS, setAppearance } from '@/ui/theme'
import { run } from '../actions/run'
import { useAppearance } from '../hooks'

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; prefs: Preferences }

function FieldRow({ field, value, disabled, error, onChange }: { field: Field; value: string | number | boolean | undefined; disabled: boolean; error: string | null; onChange: (v: string | number | boolean) => void }) {
  const id = useId()
  const hint = `${id}-hint`
  const describedBy = error ? `${hint} ${id}-err` : field.help ? hint : undefined
  let control: React.ReactNode
  if (field.type === 'bool') {
    control = <input id={id} type="checkbox" className="switch" role="switch" checked={value === true} disabled={disabled} aria-describedby={describedBy} onChange={(e) => onChange(e.target.checked)} />
  } else if (field.type === 'select') {
    control = (
      <select id={id} value={String(value ?? '')} disabled={disabled} aria-describedby={describedBy} onChange={(e) => onChange(typeof field.options?.[0]?.value === 'number' ? Number(e.target.value) : e.target.value)}>
        {field.options?.map((o) => <option key={o.value} value={String(o.value)}>{o.label}</option>)}
      </select>
    )
  } else if (field.type === 'text') {
    control = <input id={id} type="text" value={String(value ?? '')} disabled={disabled} aria-invalid={error ? true : undefined} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)} />
  } else {
    const shown = typeof value === 'number' && Number.isFinite(value) ? toDisplay(field, value) : ''
    control = (
      <span className="setting__num">
        <input
          id={id} type="number" inputMode="decimal" value={shown} disabled={disabled} step={field.type === 'float' ? 0.1 : 1}
          aria-invalid={error ? true : undefined} aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value === '' ? Number.NaN : fromDisplay(field, e.target.valueAsNumber))}
        />
        {field.unit && <span className="muted">{field.unit}</span>}
      </span>
    )
  }
  return (
    <div className="setting" data-disabled={disabled || undefined}>
      <label className="setting__label" htmlFor={id}>
        {field.label}
        {field.help && <span id={hint} className="setting__help">{field.help}</span>}
      </label>
      <div className="setting__control">
        {control}
        {error && <span id={`${id}-err`} className="setting__error" role="alert">{error}</span>}
      </div>
    </div>
  )
}

function AppearanceSection() {
  const a = useAppearance()
  return (
    <section className="settings__section" aria-labelledby="sec-appearance" data-section="appearance">
      <h2 id="sec-appearance">Torvia appearance</h2>
      <p className="settings__note">Saved in this browser only.</p>
      <div className="setting">
        <label className="setting__label" htmlFor="set-skin">Skin</label>
        <div className="setting__control">
          <select id="set-skin" value={a.skin} onChange={(e) => setAppearance({ skin: e.target.value as typeof a.skin })}>
            {SKINS.map((s) => <option key={s} value={s}>{SKIN_LABEL[s]}</option>)}
          </select>
        </div>
      </div>
      <div className="setting">
        <label className="setting__label" htmlFor="set-mode">Mode</label>
        <div className="setting__control">
          <select id="set-mode" value={a.mode} onChange={(e) => setAppearance({ mode: e.target.value as typeof a.mode })}>
            {MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
          </select>
        </div>
      </div>
    </section>
  )
}

/** qBittorrent preferences, driven by domain/settingsSchema.ts. Only keys the server reports are shown. */
export default function SettingsView() {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [draft, setDraft] = useState<Preferences>({})
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchPrefs = useCallback(async (signal?: AbortSignal) => {
    try {
      const prefs = await preferencesApi.get(signal)
      if (signal?.aborted) return
      setLoad({ status: 'ready', prefs })
      setDraft(prefs)
    } catch (e) {
      if (signal?.aborted) return
      setLoad({ status: 'error', message: e instanceof ApiError ? e.message : 'Could not load settings' })
    }
  }, [])
  useEffect(() => {
    const ctl = new AbortController()
    void fetchPrefs(ctl.signal)
    return () => ctl.abort()
  }, [fetchPrefs])

  const prefs = load.status === 'ready' ? load.prefs : null
  const fields = useMemo(() => (prefs ? visibleFields(prefs, query) : []), [prefs, query])
  const changes = prefs ? diffPrefs(prefs, draft) : {}
  const changed = Object.keys(changes)
  const errors = new Map<string, string>()
  for (const f of fields) {
    if (!(f.key in changes)) continue
    const e = validateField(f, draft[f.key])
    if (e) errors.set(f.key, e)
  }

  if (load.status === 'loading') return <div className="fullscreen" role="status">Loading settings…</div>
  if (load.status === 'error') {
    return (
      <div className="fullscreen" role="alert">
        <p>{load.message}</p>
        <button type="button" className="btn" onClick={() => { setLoad({ status: 'loading' }); void fetchPrefs() }}>Try again</button>
      </div>
    )
  }

  const save = async () => {
    setSaving(true)
    const ok = await run(() => preferencesApi.set(changes), { success: `Saved ${changed.length} ${changed.length === 1 ? 'setting' : 'settings'}`, failure: 'Could not save settings' })
    if (ok) await fetchPrefs()
    setSaving(false)
  }

  return (
    <div className="settings">
      <header className="settings__head">
        <h1>Settings</h1>
        <input type="search" className="settings__search" placeholder="Search settings" aria-label="Search settings" value={query} onChange={(e) => setQuery(e.target.value)} />
      </header>
      <nav className="settings__nav" aria-label="Settings sections">
        {SECTIONS.filter((s) => fields.some((f) => f.section === s.id)).map((s) => <a key={s.id} href={`#/settings/${s.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(`sec-${s.id}`)?.scrollIntoView({ block: 'start' }) }}>{s.label}</a>)}
      </nav>
      <div className="settings__body">
        {SECTIONS.map((s) => {
          const list = fields.filter((f) => f.section === s.id)
          if (list.length === 0) return null
          return (
            <section key={s.id} className="settings__section" aria-labelledby={`sec-${s.id}`} data-section={s.id}>
              <h2 id={`sec-${s.id}`}>{s.label}</h2>
              {list.map((f) => (
                <FieldRow key={f.key} field={f} value={draft[f.key]} disabled={saving || !isActive(f, draft)} error={errors.get(f.key) ?? null} onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))} />
              ))}
            </section>
          )
        })}
        {query.trim() === '' && <AppearanceSection />}
        {fields.length === 0 && <p className="panel__empty">No settings match “{query}”.</p>}
        <p className="settings__note">Web UI port, credentials and certificates are not editable here, so a typo can’t lock you out. Change them in qBittorrent itself.</p>
      </div>
      {changed.length > 0 && (
        <div className="settings__bar" role="region" aria-label="Unsaved changes">
          <span>{changed.length} unsaved {changed.length === 1 ? 'change' : 'changes'}{errors.size > 0 && ` · ${errors.size} to fix`}</span>
          <button type="button" className="btn" disabled={saving} onClick={() => setDraft(prefs ?? {})}>Discard</button>
          <button type="button" className="btn btn--accent" disabled={saving || errors.size > 0} onClick={() => void save()}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      )}
    </div>
  )
}
