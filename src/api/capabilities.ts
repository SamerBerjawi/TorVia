/**
 * WebAPI version → feature flags. Every version-dependent behaviour in the app reads a flag here;
 * never compare version numbers anywhere else. Sources: qBittorrent WebAPI_Changelog.md.
 */
export type ApiVersion = readonly [number, number, number]

export function parseApiVersion(raw: string): ApiVersion | null {
  const m = /^v?(\d+)\.(\d+)(?:\.(\d+))?/.exec(raw.trim())
  return m ? [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)] : null
}

export function atLeast(v: ApiVersion, min: ApiVersion): boolean {
  for (let i = 0; i < 3; i++) {
    const a = v[i] ?? 0
    const b = min[i] ?? 0
    if (a !== b) return a > b
  }
  return true
}

/** qBittorrent 5.0 (WebAPI 2.11.0): start/stop endpoints, `stopped*` states. */
export const MIN_SUPPORTED: ApiVersion = [2, 11, 0]

export interface Capabilities {
  version: ApiVersion | null
  supported: boolean
  /** torrents/fetchMetadata, parseMetadata — preview files before adding. */
  metadataPreview: boolean
  /** torrents/add returns JSON counts (200/202/409) instead of "Ok."/"Fails.". */
  addReturnsCounts: boolean
  /** torrents/add takes `seedMode` instead of `skip_checking`. */
  seedMode: boolean
  /** setShareLimits requires shareLimitAction (2.12.0) / shareLimitsMode (2.15.3). */
  shareLimitAction: boolean
  shareLimitsMode: boolean
  /** transfer/pauseSession, resumeSession and server_state.session_state. */
  sessionPause: boolean
  /** transfer/getSpeedLimits + setSpeedLimits. */
  batchSpeedLimits: boolean
  /** clientdata/load|store server-side UI storage. */
  clientData: boolean
  /** torrents/setComment. */
  setComment: boolean
  /** torrents/downloadFile. */
  downloadFile: boolean
}

export function capabilitiesFor(version: ApiVersion | null): Capabilities {
  const v = version
  const has = (min: ApiVersion) => (v ? atLeast(v, min) : false)
  return {
    version: v,
    supported: v ? atLeast(v, MIN_SUPPORTED) : false,
    metadataPreview: has([2, 11, 9]),
    addReturnsCounts: has([2, 14, 0]),
    seedMode: has([2, 16, 0]),
    shareLimitAction: has([2, 12, 0]),
    shareLimitsMode: has([2, 15, 3]),
    sessionPause: has([2, 16, 2]),
    batchSpeedLimits: has([2, 16, 0]),
    clientData: has([2, 13, 1]),
    setComment: has([2, 12, 1]),
    downloadFile: has([2, 16, 0]),
  }
}
