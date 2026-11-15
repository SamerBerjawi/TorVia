import { useEffect, useState } from 'react'
import { preferencesApi, type Preferences } from '@/api/preferences'
import { ApiError } from '@/api/transport'
import { parseRate, RATE_UNITS, splitRate, type RateUnit } from '@/domain/rate'
import { run } from '../actions/run'
import { useEngine } from '../store'
import { CancelButton, Modal } from './Modal'
import { useSubmit } from './TorrentDialogs'

const KEYS = { dl: 'dl_limit', up: 'up_limit', altDl: 'alt_dl_limit', altUp: 'alt_up_limit' } as const
type Slot = keyof typeof KEYS
interface Entry { text: string; unit: RateUnit }

function RateField({ label, value, onChange, autoFocus }: { label: string; value: Entry; onChange: (e: Entry) => void; autoFocus?: boolean }) {
  const bad = parseRate(value.text, value.unit) === null
  return (
    <label className="field">
      <span>{label}</span>
      <span className="ratefield">
        <input inputMode="decimal" aria-label={label} value={value.text} placeholder="Unlimited" aria-invalid={bad || undefined} autoFocus={autoFocus} onChange={(e) => onChange({ ...value, text: e.target.value })} />
        <select aria-label={`${label} unit`} value={value.unit} onChange={(e) => onChange({ ...value, unit: e.target.value as RateUnit })}>
          {RATE_UNITS.map((u) => <option key={u}>{u}</option>)}
        </select>
      </span>
    </label>
  )
}

/** Global (whole-client) speed limits: the normal pair and the alternative ("turtle") pair. */
export function GlobalSpeedDialog() {
  const alt = useEngine().data.serverState.use_alt_speed_limits === true
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<Slot, Entry> | null>(null)
  const { busy, submit } = useSubmit()

  useEffect(() => {
    const ctl = new AbortController()
    preferencesApi.get(ctl.signal).then((p) => {
      setPrefs(p)
      const f = (k: string) => splitRate(typeof p[k] === 'number' ? p[k] : 0)
      setFields({ dl: f(KEYS.dl), up: f(KEYS.up), altDl: f(KEYS.altDl), altUp: f(KEYS.altUp) })
    }).catch((e) => !ctl.signal.aborted && setError(e instanceof ApiError ? e.message : 'Could not load current limits'))
    return () => ctl.abort()
  }, [])

  const parsed = fields && (Object.keys(KEYS) as Slot[]).map((s) => [s, parseRate(fields[s].text, fields[s].unit)] as const)
  const valid = parsed?.every(([, v]) => v !== null) ?? false
  const patch: Preferences = {}
  if (prefs && parsed) for (const [s, v] of parsed) if (v !== null && prefs[KEYS[s]] !== v) patch[KEYS[s]] = v
  const changed = Object.keys(patch).length > 0
  const set = (s: Slot) => (e: Entry) => setFields((f) => (f ? { ...f, [s]: e } : f))

  return (
    <Modal
      title="Global speed limits"
      description={`Applies to all torrents together. Leave empty or 0 for unlimited. ${alt ? 'Alternative limits are active right now.' : 'Normal limits are active right now.'}`}
      onSubmit={() => valid && changed && submit(() => run(() => preferencesApi.set(patch), { success: 'Speed limits saved', failure: 'Could not save speed limits' }))}
      footer={<><CancelButton /><button type="submit" className="btn btn--accent" disabled={busy || !valid || !changed}>Save</button></>}
    >
      {error && <p className="field__error" role="alert">{error}</p>}
      {!fields && !error && <p className="hint" role="status">Loading current limits…</p>}
      {fields && (
        <>
          <fieldset className="limitgroup" data-active={!alt || undefined}>
            <legend>Normal{!alt && ' · active'}</legend>
            <div className="fieldrow">
              <RateField label="Download" value={fields.dl} onChange={set('dl')} autoFocus />
              <RateField label="Upload" value={fields.up} onChange={set('up')} />
            </div>
          </fieldset>
          <fieldset className="limitgroup" data-active={alt || undefined}>
            <legend>Alternative{alt && ' · active'}</legend>
            <div className="fieldrow">
              <RateField label="Alt download" value={fields.altDl} onChange={set('altDl')} />
              <RateField label="Alt upload" value={fields.altUp} onChange={set('altUp')} />
            </div>
          </fieldset>
          {!valid && <small className="field__error">Enter a positive number or leave empty.</small>}
        </>
      )}
    </Modal>
  )
}
