import { getJson, postOrThrow } from './transport'

/** qBittorrent `app/preferences`: a flat JSON object. Values are primitives. */
export type Preferences = Record<string, string | number | boolean>

export const preferencesApi = {
  get: (signal?: AbortSignal) => getJson<Preferences>('app/preferences', signal),
  /** Sends only the changed keys. qBittorrent applies them atomically. */
  set: (patch: Preferences) => postOrThrow('app/setPreferences', { json: JSON.stringify(patch) }),
}
