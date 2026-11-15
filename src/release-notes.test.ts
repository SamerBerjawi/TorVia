import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error plain .mjs script without types
import { changelogSection } from '../scripts/release-notes.mjs'

const md = `# Changelog\n\n## [Unreleased]\n\n## [0.2.0] - 2027-01-01\n### Added\n- B\n\n## [0.1.0] - 2026-11-15\n### Added\n- A\n\n[Unreleased]: https://x/compare\n[0.1.0]: https://x/0.1.0\n`

describe('release notes from CHANGELOG.md', () => {
  it('extracts one version’s section only', () => {
    expect(changelogSection(md, '0.2.0')).toBe('### Added\n- B')
    expect(changelogSection(md, '0.1.0')).toBe('### Added\n- A')
  })
  it('returns null for missing or empty sections', () => {
    expect(changelogSection(md, '9.9.9')).toBeNull()
    expect(changelogSection(md, 'Unreleased')).toBeNull()
  })
  it('the real changelog has a section for the current package version', () => {
    const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
    expect(changelogSection(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'), version), `add "## [${version}]" to CHANGELOG.md`).not.toBeNull()
  })
})
