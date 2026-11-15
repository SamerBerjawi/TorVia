import { ApiError, post } from './transport'

export type LoginResult = 'ok' | 'invalid-credentials' | 'banned' | 'error'

/**
 * Interprets auth/login across versions (verified against a live qBittorrent 5.3.0):
 *   success: 200 "Ok." (older) or 204 with an empty body (5.x)
 *   bad credentials: 200 "Fails." (< WebAPI 2.14) or 401 (≥ 2.14)
 *   403: client IP banned after too many failures
 */
export function interpretLogin(status: number, body: string): LoginResult {
  const text = body.trim()
  if (status === 401) return 'invalid-credentials'
  if (status === 403) return 'banned'
  if (status >= 200 && status < 300) return text === 'Fails.' ? 'invalid-credentials' : text === '' || text === 'Ok.' ? 'ok' : 'error'
  return 'error'
}

export async function login(username: string, password: string): Promise<LoginResult> {
  try {
    const res = await post('auth/login', { username, password })
    return interpretLogin(res.status, await res.text())
  } catch (e) {
    return e instanceof ApiError ? interpretLogin(e.status, '') : 'error'
  }
}

export async function logout(): Promise<void> {
  await post('auth/logout', {})
}
