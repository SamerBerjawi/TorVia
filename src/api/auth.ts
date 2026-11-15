import { ApiError, post } from './transport'

export type LoginResult = 'ok' | 'invalid-credentials' | 'banned' | 'error'

/**
 * Handles both server behaviours: qBittorrent < WebAPI 2.14 answers 200 with
 * body "Fails." on bad credentials; 2.14+ answers 401. 403 means the client IP is banned.
 */
export async function login(username: string, password: string): Promise<LoginResult> {
  try {
    const res = await post('auth/login', { username, password })
    const body = (await res.text()).trim()
    return body === 'Ok.' ? 'ok' : 'invalid-credentials'
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) return 'invalid-credentials'
      if (e.status === 403) return 'banned'
    }
    return 'error'
  }
}

export async function logout(): Promise<void> {
  await post('auth/logout', {})
}
