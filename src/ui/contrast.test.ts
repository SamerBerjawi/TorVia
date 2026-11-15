import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** WCAG 2.x contrast of the design tokens, per skin × mode. Guards every colour change. */
const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8')

function themeBlocks(): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>()
  for (const m of css.matchAll(/\[data-skin='(\w+)'\]\[data-mode='(\w+)'\]\s*\{([^}]*)\}/g)) {
    const vars = new Map<string, string>()
    for (const v of m[3]!.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) vars.set(v[1]!, v[2]!)
    out.set(`${m[1]}/${m[2]}`, vars)
  }
  return out
}

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const SURFACES = ['bg', 'surface', 'sidebar', 'raised', 'input', 'hover', 'selected', 'zebra', 'chip']
const BODY = ['text', 'text-2', 'text-3', 'text-4']
const STATUS = ['st-dl', 'st-seed', 'st-done', 'st-stop', 'st-queue', 'st-stall', 'st-check', 'st-err', 'st-meta']

describe('token contrast (WCAG AA, 4.5:1 for text)', () => {
  for (const [theme, vars] of themeBlocks()) {
    // Paper's inherited tokens (zebra etc.) live in the same block; skip pairs a theme doesn't define.
    const get = (k: string) => vars.get(k)
    // Paper paints selected rows solid blue with --on-selected text everywhere, so other tokens never sit on it.
    const surfaces = (list: string[]) => (theme.startsWith('paper') ? list.filter((x) => x !== 'selected') : list)
    const fails: string[] = []
    const check = (fg: string, bg: string, min = 4.5) => {
      const f = get(fg), b = get(bg)
      if (f && b && ratio(f, b) < min) fails.push(`${fg} on ${bg}: ${ratio(f, b).toFixed(2)} (< ${min})`)
    }
    it(theme, () => {
      for (const fg of BODY) for (const bg of surfaces(SURFACES)) {
        // Selected rows in dark skins only carry --on-selected; body text sits on it in the details/menus too.
        check(fg, bg)
      }
      for (const fg of STATUS) for (const bg of surfaces(['bg', 'surface', 'raised', 'hover', 'selected', 'sidebar'])) {
        const text = vars.has(`${fg}-text`) ? `${fg}-text` : fg
        check(text, bg)
      }
      for (const bg of ['bg', 'surface', 'raised', 'sidebar']) { check('accent-text', bg); check('danger', bg) }
      check('on-accent', 'accent')
      check('on-selected', 'selected')
      expect(fails).toEqual([])
    })
  }
})
