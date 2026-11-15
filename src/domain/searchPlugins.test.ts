import { describe, expect, it } from 'vitest'
import { notInstalled, OFFICIAL_PLUGINS, officialUrl, sourcesParam, validatePluginUrl } from './searchPlugins'

describe('official plugins', () => {
  it('builds raw.githubusercontent URLs from the official repository only', () => {
    expect(officialUrl('piratebay')).toBe('https://raw.githubusercontent.com/qbittorrent/search-plugins/master/nova3/engines/piratebay.py')
    for (const p of OFFICIAL_PLUGINS) expect(officialUrl(p.id)).toMatch(/^https:\/\/raw\.githubusercontent\.com\/qbittorrent\/search-plugins\//)
  })
  it('has unique ids', () => {
    expect(new Set(OFFICIAL_PLUGINS.map((p) => p.id)).size).toBe(OFFICIAL_PLUGINS.length)
  })
  it('lists only the ones not installed yet, matching case-insensitively', () => {
    const left = notInstalled([{ name: 'piratebay' }, { name: 'EZTV' }]).map((p) => p.id)
    expect(left).not.toContain('piratebay')
    expect(left).not.toContain('eztv')
    expect(left).toContain('torlock')
    expect(notInstalled([])).toHaveLength(OFFICIAL_PLUGINS.length)
  })
})

describe('validatePluginUrl', () => {
  it('accepts https links to a .py file', () => {
    expect(validatePluginUrl('https://example.org/plugins/foo.py')).toBeNull()
    expect(validatePluginUrl('  https://example.org/a/B.PY ')).toBeNull()
  })
  it('rejects everything else', () => {
    for (const bad of ['', 'foo.py', 'http://example.org/foo.py', 'https://example.org/foo.zip', 'ftp://x/foo.py', 'javascript:alert(1).py', 'https://a/b.py|https://c/d.py', 'file:///etc/x.py'])
      expect(validatePluginUrl(bad), bad).not.toBeNull()
  })
})

describe('sourcesParam', () => {
  it('joins with the pipe qBittorrent splits on', () => {
    expect(sourcesParam(['a', 'b'])).toBe('a|b')
  })
})
