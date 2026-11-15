// Release guards for the qBittorrent alternative-WebUI layout. Fails the build on violations.
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = new URL('../dist/torvia/', import.meta.url).pathname
const MAX_FILE = 2 * 1024 * 1024 // qBittorrent hard limit is 10 MiB; we stay far below
// qBittorrent rewrites these tokens in every text file it serves (webapplication.cpp translateDocument)
const FORBIDDEN_TOKENS = ['${LANG}', '${CACHEID}', 'QBT_TR(']
const TEXT = /\.(html|js|css|json|svg|txt|webmanifest)$/
const errors = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = lstatSync(p)
    const rel = relative(root, p)
    if (st.isSymbolicLink()) errors.push(`${rel}: symlinks are forbidden by qBittorrent`)
    else if (st.isDirectory()) walk(p)
    else {
      if (st.size > MAX_FILE) errors.push(`${rel}: ${st.size} bytes exceeds ${MAX_FILE}`)
      if (TEXT.test(name)) {
        const text = readFileSync(p, 'utf8')
        for (const t of FORBIDDEN_TOKENS) if (text.includes(t)) errors.push(`${rel}: contains server-substituted token ${t}`)
        if (/(src|href)="\//.test(text) && name.endsWith('.html')) errors.push(`${rel}: absolute URL breaks sub-path hosting`)
      }
    }
  }
}

for (const entry of ['public', 'private']) {
  try {
    lstatSync(join(root, entry, 'index.html'))
  } catch {
    errors.push(`${entry}/index.html is missing (qbittorrent-nox disables the alternative UI without it)`)
  }
}
walk(root)

if (errors.length) {
  console.error('Package guard failed:\n' + errors.map((e) => ` - ${e}`).join('\n'))
  process.exit(1)
}
console.log('Package guard passed.')
