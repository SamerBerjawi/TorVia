import { describe, expect, it } from 'vitest'
import { isNewer, latestFromApi, parseVersion } from './version'

describe('versions', () => {
  it('parses with or without a leading v and rejects junk', () => {
    expect(parseVersion('v1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, pre: [] })
    expect(parseVersion('0.2.0-rc.1')?.pre).toEqual(['rc', '1'])
    expect(parseVersion('1.2')).toBeNull()
    expect(parseVersion('latest')).toBeNull()
  })
  it('orders by semver precedence', () => {
    expect(isNewer('0.2.0', '0.1.0')).toBe(true)
    expect(isNewer('0.10.0', '0.9.9')).toBe(true) // numeric, not lexical
    expect(isNewer('0.1.0', '0.1.0')).toBe(false)
    expect(isNewer('0.0.9', '0.1.0')).toBe(false)
    expect(isNewer('1.0.0', '1.0.0-rc.1')).toBe(true)
    expect(isNewer('1.0.0-rc.1', '1.0.0')).toBe(false)
    expect(isNewer('1.0.0-rc.2', '1.0.0-rc.1')).toBe(true)
    expect(isNewer('1.0.0-rc.10', '1.0.0-rc.9')).toBe(true)
  })
  it('never calls an unparsable version newer', () => {
    expect(isNewer('garbage', '0.1.0')).toBe(false)
    expect(isNewer('0.2.0', 'dev')).toBe(false)
  })
})

describe('latestFromApi', () => {
  const ok = { tag_name: 'v0.2.0', html_url: 'https://github.com/SamerBerjawi/torvia/releases/tag/v0.2.0', draft: false, prerelease: false }
  it('accepts a normal release', () => {
    expect(latestFromApi(ok)).toEqual({ version: '0.2.0', url: ok.html_url })
  })
  it('ignores drafts and pre-releases', () => {
    expect(latestFromApi({ ...ok, prerelease: true })).toBeNull()
    expect(latestFromApi({ ...ok, draft: true })).toBeNull()
  })
  it('rejects malformed data and links that are not github.com', () => {
    expect(latestFromApi(null)).toBeNull()
    expect(latestFromApi({ ...ok, tag_name: 'nightly' })).toBeNull()
    expect(latestFromApi({ ...ok, html_url: 'https://evil.example/x' })).toBeNull()
    expect(latestFromApi({ ...ok, html_url: 'javascript:alert(1)' })).toBeNull()
    expect(latestFromApi({ ...ok, html_url: 'http://github.com/x' })).toBeNull()
  })
})
