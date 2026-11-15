import { StrictMode, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { login, type LoginResult } from '@/api/auth'
import { MODES, MODE_LABEL, SKINS, SKIN_LABEL, getAppearance, initAppearance, setAppearance, type Mode, type Skin } from '@/ui/theme'
import '@/ui/tokens.css'
import '@/ui/login.css'

const MESSAGES: Record<Exclude<LoginResult, 'ok'>, string> = {
  'invalid-credentials': 'Incorrect username or password.',
  banned: 'Too many failed attempts. Your IP address is temporarily banned by qBittorrent.',
  error: 'Cannot reach qBittorrent. Check that it is running.',
}

function Login() {
  const [look, setLook] = useState(getAppearance())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    const result = await login(String(data.get('username') ?? ''), String(data.get('password') ?? ''))
    if (result === 'ok') {
      // The server now has a session cookie: "/" resolves to private/index.html.
      location.reload()
      return
    }
    setError(MESSAGES[result])
    setBusy(false)
  }

  return (
    <main className="login">
      <form className="card" onSubmit={(e) => void submit(e)}>
        <div className="brand">
          <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="var(--accent)" /><path d="M6.5 7.5h11M12 7.5v10" fill="none" stroke="var(--on-accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <h1>Torvia</h1>
        </div>
        <p className="sub">Sign in to qBittorrent</p>
        <label>
          Username
          <input name="username" autoComplete="username" autoFocus required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      <div className="style-row">
        <label>Style
          <select value={look.skin} onChange={(e) => { setAppearance({ skin: e.target.value as Skin }); setLook(getAppearance()) }}>
            {SKINS.map((s) => <option key={s} value={s}>{SKIN_LABEL[s]}</option>)}
          </select>
        </label>
        <label>Mode
          <select value={look.mode} onChange={(e) => { setAppearance({ mode: e.target.value as Mode }); setLook(getAppearance()) }}>
            {MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
          </select>
        </label>
      </div>
    </main>
  )
}

initAppearance()
createRoot(document.getElementById('root')!).render(<StrictMode><Login /></StrictMode>)
