import { StrictMode, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { login, type LoginResult } from '@/api/auth'
import '@/ui/tokens.css'
import '@/ui/login.css'

const MESSAGES: Record<Exclude<LoginResult, 'ok'>, string> = {
  'invalid-credentials': 'Incorrect username or password.',
  banned: 'Too many failed attempts. Your IP address is temporarily banned by qBittorrent.',
  error: 'Cannot reach qBittorrent. Check that it is running.',
}

function Login() {
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
        <h1>Nuvora</h1>
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
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Login /></StrictMode>)
