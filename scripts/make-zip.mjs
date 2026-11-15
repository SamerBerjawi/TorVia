// Creates dist/torvia-<version>.zip containing the `torvia/` folder (needs the `zip` CLI).
import { execFileSync } from 'node:child_process'
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
writeFileSync(new URL('../dist/torvia/version.json', import.meta.url), JSON.stringify({ version }) + '\n')
copyFileSync(new URL('../LICENSE', import.meta.url), new URL('../dist/torvia/LICENSE', import.meta.url))
execFileSync('zip', ['-qr', `torvia-${version}.zip`, 'torvia'], { cwd: new URL('../dist', import.meta.url).pathname, stdio: 'inherit' })
console.log(`dist/torvia-${version}.zip`)
