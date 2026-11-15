/**
 * qBittorrent reports a peer's country as a lower-case ISO 3166-1 alpha-2 code plus a display name, both empty when
 * GeoIP is off or the address is private. The code ends up in an image URL, so only exactly two ASCII letters pass.
 */
export function countryCode(raw: unknown): string | null {
  return typeof raw === 'string' && /^[A-Za-z]{2}$/.test(raw) ? raw.toLowerCase() : null
}

export interface PeerCountry { code: string; name: string }

export function peerCountry(p: { country_code?: unknown; country?: unknown }): PeerCountry | null {
  const code = countryCode(p.country_code)
  if (!code) return null
  const name = typeof p.country === 'string' && p.country.trim() !== '' ? p.country.trim() : code.toUpperCase()
  return { code, name }
}

/** True when peers exist but none has a country: GeoIP lookups are probably switched off in qBittorrent. */
export const countriesUnavailable = (peers: readonly { country_code?: unknown }[]): boolean =>
  peers.length > 0 && peers.every((p) => countryCode(p.country_code) === null)
