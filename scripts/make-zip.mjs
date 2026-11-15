// Creates dist/nuvora-<version>.zip containing the `nuvora/` folder (needs the `zip` CLI).
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
writeFileSync(new URL('../dist/nuvora/version.json', import.meta.url), JSON.stringify({ version }) + '\n')
execFileSync('zip', ['-qr', `nuvora-${version}.zip`, 'nuvora'], { cwd: new URL('../dist', import.meta.url).pathname, stdio: 'inherit' })
console.log(`dist/nuvora-${version}.zip`)
