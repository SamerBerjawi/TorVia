// Prints the GitHub release notes for a version: install steps + that version's section from CHANGELOG.md.
// Fails (non-zero) when the section is missing or empty, so a release cannot ship without a changelog entry.
//   node scripts/release-notes.mjs 0.1.0 > dist/NOTES.md
import { readFileSync } from 'node:fs'

export function changelogSection(markdown, version) {
  const lines = markdown.split('\n')
  const start = lines.findIndex((l) => l.startsWith(`## [${version}]`))
  if (start === -1) return null
  const end = lines.findIndex((l, i) => i > start && (l.startsWith('## [') || /^\[[^\]]+\]:\s/.test(l)))
  const body = lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim()
  return body === '' ? null : body
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const version = process.argv[2]
  if (!version) throw new Error('Usage: node scripts/release-notes.mjs <version>')
  const section = changelogSection(readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8'), version)
  if (!section) { console.error(`CHANGELOG.md has no (non-empty) section "## [${version}]". Add one before releasing.`); process.exit(1) }
  console.log(`## Install
1. Download **torvia.zip** below and extract it. You get one folder, \`torvia\`, containing \`public\` and \`private\`.
2. Put that folder inside your qBittorrent folder (Docker/NAS: into the folder you mount as \`/config\`).
3. In qBittorrent: **Tools → Options → Web UI → Use alternative WebUI**, set **Files location** to the \`torvia\` folder (inside a container: \`/config/torvia\`), Apply, then reload the page.

Full steps, Docker/Portainer and updating: see \`INSTALL.txt\` inside the archive, or the README. Requires qBittorrent 5.0 or newer. Verify downloads with \`SHA256SUMS.txt\`.

## What's new in ${version}
${section}`)
}
