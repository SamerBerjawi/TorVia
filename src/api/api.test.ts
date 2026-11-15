import { describe, expect, it } from 'vitest'
import { atLeast, capabilitiesFor, parseApiVersion } from './capabilities'
import { buildAddForm, parseAddResponse, type AddOptions } from './torrents'

describe('capabilities', () => {
  it('parses versions', () => {
    expect(parseApiVersion('2.16.2')).toEqual([2, 16, 2])
    expect(parseApiVersion('v2.11')).toEqual([2, 11, 0])
    expect(parseApiVersion('garbage')).toBeNull()
  })
  it('compares', () => {
    expect(atLeast([2, 16, 0], [2, 15, 3])).toBe(true)
    expect(atLeast([2, 15, 2], [2, 15, 3])).toBe(false)
    expect(atLeast([3, 0, 0], [2, 99, 99])).toBe(true)
  })
  it('derives flags', () => {
    const old = capabilitiesFor([2, 11, 2])
    expect(old.supported).toBe(true)
    expect(old.seedMode).toBe(false)
    expect(old.metadataPreview).toBe(false)
    const v53 = capabilitiesFor([2, 16, 2])
    expect(v53).toMatchObject({ seedMode: true, sessionPause: true, addReturnsCounts: true, shareLimitsMode: true })
    expect(capabilitiesFor([2, 8, 0]).supported).toBe(false)
    expect(capabilitiesFor(null).supported).toBe(false)
  })
})

const base: AddOptions = {
  urls: [], files: [], savepath: '', category: '', tags: [], start: true, skipChecking: false,
  sequential: false, firstLastPiece: false, addToTop: false, contentLayout: 'Original', autoTMM: undefined,
}

describe('buildAddForm', () => {
  it('joins urls by newline and sends both stopped and paused', () => {
    const f = buildAddForm({ ...base, urls: ['magnet:?xt=a', 'https://x/t.torrent'], start: false }, { seedMode: true })
    expect(f.get('urls')).toBe('magnet:?xt=a\nhttps://x/t.torrent')
    expect(f.get('stopped')).toBe('true')
    expect(f.get('paused')).toBe('true')
    expect(f.has('savepath')).toBe(false)
  })
  it('uses seedMode or skip_checking by version', () => {
    expect(buildAddForm({ ...base, skipChecking: true }, { seedMode: true }).get('seedMode')).toBe('true')
    expect(buildAddForm({ ...base, skipChecking: true }, { seedMode: false }).get('skip_checking')).toBe('true')
  })
  it('includes options only when set', () => {
    const f = buildAddForm({ ...base, category: 'linux', tags: ['a', 'b'], contentLayout: 'Subfolder', autoTMM: false, savepath: ' /d ' }, { seedMode: true })
    expect([f.get('category'), f.get('tags'), f.get('contentLayout'), f.get('autoTMM'), f.get('savepath')]).toEqual(['linux', 'a,b', 'Subfolder', 'false', '/d'])
  })
})

describe('parseAddResponse', () => {
  it('reads JSON counts (2.14+), including 202 and 409', () => {
    expect(parseAddResponse(200, '{"success_count":2,"pending_count":0,"failure_count":0}', 2)).toEqual({ added: 2, pending: 0, failed: 0 })
    expect(parseAddResponse(202, '{"success_count":0,"pending_count":1,"failure_count":0}', 1)).toEqual({ added: 0, pending: 1, failed: 0 })
    expect(parseAddResponse(409, '{"success_count":0,"pending_count":0,"failure_count":3}', 3)).toEqual({ added: 0, pending: 0, failed: 3 })
  })
  it('reads legacy text', () => {
    expect(parseAddResponse(200, 'Ok.', 2)).toEqual({ added: 2, pending: 0, failed: 0 })
    expect(parseAddResponse(200, 'Fails.', 2)).toEqual({ added: 0, pending: 0, failed: 2 })
  })
  it('throws on auth and server errors', () => {
    expect(() => parseAddResponse(403, '', 1)).toThrow()
    expect(() => parseAddResponse(500, 'boom', 1)).toThrow()
  })
})

import { interpretLogin } from './auth'

describe('interpretLogin', () => {
  it('accepts 204 empty (5.x) and 200 "Ok." (older)', () => {
    expect(interpretLogin(204, '')).toBe('ok')
    expect(interpretLogin(200, 'Ok.')).toBe('ok')
  })
  it('rejects bad credentials in both styles', () => {
    expect(interpretLogin(200, 'Fails.')).toBe('invalid-credentials')
    expect(interpretLogin(401, '')).toBe('invalid-credentials')
  })
  it('reports bans and unexpected answers', () => {
    expect(interpretLogin(403, '')).toBe('banned')
    expect(interpretLogin(200, '<html>proxy page</html>')).toBe('error')
    expect(interpretLogin(500, '')).toBe('error')
  })
})
