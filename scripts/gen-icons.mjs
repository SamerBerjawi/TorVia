// Renders public-assets/favicon.svg to the PNG icons the web app manifest needs. Re-run after changing the logo:
//   node scripts/gen-icons.mjs   (uses the Playwright Chromium already installed for E2E)
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync } from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const svg = readFileSync(new URL('../public-assets/favicon.svg', import.meta.url), 'utf8')
const browser = await chromium.launch()
for (const [size, name, pad] of [[192, 'icon-192.png', 0], [512, 'icon-512.png', 0], [512, 'icon-maskable-512.png', 0.14], [180, 'apple-touch-icon.png', 0]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  // Maskable icons need the artwork inside the central safe zone, on a full-bleed background.
  const inner = Math.round(size * (1 - pad * 2))
  await page.setContent(`<body style="margin:0;background:${pad ? '#5b5bd6' : 'transparent'};display:grid;place-items:center;width:${size}px;height:${size}px"><img width="${inner}" height="${inner}" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></body>`)
  writeFileSync(new URL(`../public-assets/${name}`, import.meta.url), await page.screenshot({ omitBackground: !pad }))
  await page.close()
}
await browser.close()
