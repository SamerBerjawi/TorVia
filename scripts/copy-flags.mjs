// Copies country flags (flag-icons, MIT) into the app bundle: dist/torvia/private/flags/<cc>.svg.
// Only ISO two-letter countries (no regional/historic variants) to keep the archive small. Runs after `vite build --mode app`.
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const src = new URL('../node_modules/flag-icons/flags/4x3/', import.meta.url).pathname
const out = new URL('../dist/torvia/private/flags/', import.meta.url).pathname
mkdirSync(out, { recursive: true })
let n = 0
for (const f of readdirSync(src)) if (/^[a-z]{2}\.svg$/.test(f)) { copyFileSync(join(src, f), join(out, f)); n++ }
copyFileSync(new URL('../node_modules/flag-icons/LICENSE', import.meta.url), join(out, 'LICENSE.txt'))
console.log(`${n} flags copied`)
