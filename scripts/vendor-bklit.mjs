// Copies the Bklit UI chart components we use (MIT, https://github.com/bklit/bklit-ui)
// from a local checkout into src/vendor/bklit, resolving registry dependencies.
// Usage: node scripts/vendor-bklit.mjs <path-to-bklit-ui-checkout>
// Never vendor packages/studio (proprietary licence).
import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const WANT = ['live-line-chart', 'ring-chart', 'pie-chart', 'bar-chart', 'legend']
const src = process.argv[2]
if (!src) throw new Error('Usage: node scripts/vendor-bklit.mjs <path-to-bklit-ui-checkout>')
const ui = join(src, 'packages/ui')
const out = new URL('../src/vendor/bklit/', import.meta.url).pathname
const commit = execFileSync('git', ['-C', src, 'rev-parse', '--short', 'HEAD']).toString().trim()

const registry = JSON.parse(readFileSync(join(ui, 'registry.json'), 'utf8'))
const byName = Object.fromEntries(registry.items.map((i) => [i.name, i]))
const seen = new Set()
const walk = (n) => {
  n = n.replace('@bklit/', '')
  if (seen.has(n) || !byName[n]) return
  seen.add(n)
  for (const d of byName[n].registryDependencies ?? []) walk(d)
}
WANT.forEach(walk)
const files = [...new Set([...seen].flatMap((n) => byName[n].files.map((f) => f.path)))]

// The registry's file lists are not always complete: follow relative imports transitively.
const resolveRel = (from, spec) => {
  const base = join(dirname(from), spec)
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(join(ui, cand)) && /\.(ts|tsx)$/.test(cand)) return cand
  }
  return null
}
for (let i = 0; i < files.length; i++) {
  const text = readFileSync(join(ui, files[i]), 'utf8')
  for (const m of text.matchAll(/from ['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const r = resolveRel(files[i], m[1])
    if (!r) throw new Error(`Unresolved import ${m[1]} in ${files[i]}`)
    if (!files.includes(r)) files.push(r)
  }
}

rmSync(out, { recursive: true, force: true })
for (const f of files) {
  const rel = f.replace(/^src\//, '')
  const dest = join(out, rel)
  mkdirSync(dirname(dest), { recursive: true })
  let text = readFileSync(join(ui, f), 'utf8')
  const utils = relative(dirname(dest), join(out, 'lib/utils')).replace(/\\/g, '/')
  text = text.replace(/(['"])@\/lib\/utils\1/g, `'${utils.startsWith('.') ? utils : './' + utils}'`)
  // Vendored third-party code: not held to our stricter compiler flags.
  writeFileSync(dest, `// @ts-nocheck\n// Vendored from bklit-ui@${commit} (MIT). Do not edit; re-run scripts/vendor-bklit.mjs.\n${text}`)
}
copyFileSync(join(src, 'LICENSE'), join(out, 'LICENSE'))
writeFileSync(join(out, 'README.md'), `# Vendored: Bklit UI charts\n\nSource: https://github.com/bklit/bklit-ui @ ${commit} (MIT, see LICENSE).\nItems: ${[...seen].join(', ')}.\nRegenerate with \`node scripts/vendor-bklit.mjs <checkout>\`. Do not edit files here by hand.\n`)
console.log(`Vendored ${files.length} files (${[...seen].length} registry items) from bklit-ui@${commit}`)
