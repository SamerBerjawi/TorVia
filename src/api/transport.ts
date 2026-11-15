/** Typed fetch wrapper for qBittorrent's WebAPI. Same-origin, relative URLs only. */

export type ApiErrorKind = 'unauthenticated' | 'forbidden' | 'banned' | 'network' | 'server' | 'bad-request'

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const BASE = 'api/v2/'

function classify(status: number): ApiErrorKind {
  if (status === 401) return 'unauthenticated'
  if (status === 403) return 'forbidden' // qBittorrent: no session OR IP banned
  if (status >= 500) return 'server'
  return 'bad-request'
}

export async function request(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: URLSearchParams; signal?: AbortSignal } = {},
): Promise<Response> {
  let res: Response
  try {
    res = await fetch(BASE + path, {
      method: init.method ?? 'GET',
      body: init.body ?? null,
      signal: init.signal ?? null,
      credentials: 'same-origin',
      cache: 'no-store',
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    throw new ApiError('network', 0, 'Cannot reach qBittorrent')
  }
  if (!res.ok) throw new ApiError(classify(res.status), res.status, `${res.status} ${res.statusText}`)
  return res
}

export async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await request(path, signal ? { signal } : {})
  return (await res.json()) as T
}

export async function getText(path: string): Promise<string> {
  return (await request(path)).text()
}

export async function post(path: string, form: Record<string, string>): Promise<Response> {
  return request(path, { method: 'POST', body: new URLSearchParams(form) })
}
