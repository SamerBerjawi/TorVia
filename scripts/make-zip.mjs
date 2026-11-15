// Packages dist/torvia into the release archives (needs the `zip` CLI):
//   dist/torvia-<version>.zip   versioned, for humans and checksums
//   dist/torvia.zip             same bytes under a stable name, so
//                               https://github.com/<repo>/releases/latest/download/torvia.zip always works
// Each archive holds ONE folder, `torvia/`, containing public/, private/, INSTALL.txt, LICENSE and version.json.
// That folder is exactly what qBittorrent's "Root Folder" setting must point at.
import { execFileSync } from 'node:child_process'
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
const root = new URL('../', import.meta.url)
const { version } = JSON.parse(readFileSync(new URL('package.json', root), 'utf8'))
const repo = process.env['GITHUB_REPOSITORY'] ?? 'SamerBerjawi/torvia'
const dist = new URL('dist/', root)

writeFileSync(new URL('torvia/version.json', dist), JSON.stringify({ version }) + '\n')
copyFileSync(new URL('LICENSE', root), new URL('torvia/LICENSE', dist))
writeFileSync(
  new URL('torvia/INSTALL.txt', dist),
  readFileSync(new URL('packaging/INSTALL.txt', root), 'utf8').replaceAll('{{VERSION}}', version).replaceAll('{{REPO}}', repo),
)

const zip = (name) => execFileSync('zip', ['-qrX', name, 'torvia'], { cwd: dist.pathname, stdio: 'inherit' })
zip(`torvia-${version}.zip`)
copyFileSync(new URL(`torvia-${version}.zip`, dist), new URL('torvia.zip', dist))
console.log(`dist/torvia-${version}.zip  dist/torvia.zip`)
