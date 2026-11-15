/** Version comparison and GitHub-release parsing for the update notice. Pure. */
export interface Semver { major: number; minor: number; patch: number; pre: string[] }

export function parseVersion(raw: string): Semver | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(raw.trim())
  if (!m) return null
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), pre: m[4] ? m[4].split('.') : [] }
}

/** Semver precedence: negative if a < b. A pre-release is lower than its release (0.2.0-rc.1 < 0.2.0). */
export function compareVersions(a: Semver, b: Semver): number {
  for (const k of ['major', 'minor', 'patch'] as const) if (a[k] !== b[k]) return a[k] < b[k] ? -1 : 1
  if (a.pre.length === 0 || b.pre.length === 0) return a.pre.length === b.pre.length ? 0 : a.pre.length === 0 ? 1 : -1
  for (let i = 0; i < Math.max(a.pre.length, b.pre.length); i++) {
    const x = a.pre[i], y = b.pre[i]
    if (x === undefined) return -1
    if (y === undefined) return 1
    const nx = /^\d+$/.test(x), ny = /^\d+$/.test(y)
    if (nx && ny) { if (Number(x) !== Number(y)) return Number(x) < Number(y) ? -1 : 1 }
    else if (nx !== ny) return nx ? -1 : 1
    else if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

export const isNewer = (candidate: string, current: string): boolean => {
  const c = parseVersion(candidate), cur = parseVersion(current)
  return c !== null && cur !== null && compareVersions(c, cur) > 0
}

export interface LatestRelease { version: string; url: string }

/**
 * Validates GitHub's `releases/latest` JSON. Drafts and pre-releases are ignored, and the link must be a
 * github.com page (never follow an arbitrary URL from a network response).
 */
export function latestFromApi(json: unknown): LatestRelease | null {
  if (typeof json !== 'object' || json === null) return null
  const r = json as Record<string, unknown>
  if (r['draft'] === true || r['prerelease'] === true) return null
  const tag = r['tag_name'], url = r['html_url']
  if (typeof tag !== 'string' || typeof url !== 'string' || parseVersion(tag) === null) return null
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' || u.hostname !== 'github.com') return null
  } catch {
    return null
  }
  return { version: tag.replace(/^v/, ''), url }
}
