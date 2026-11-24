// Usage: node scripts/shot.mjs <url> <out.png> [width] [height] — screenshot plus console errors.
import { chromium } from 'playwright'
const [url, out, w = '1360', h = '860'] = process.argv.slice(2)
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 })
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)))
page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 300)))
page.on('requestfailed', (r) => errors.push('FAILED ' + r.url().slice(0, 120)))
await page.goto(url, { waitUntil: 'load' })
await page.waitForFunction(() => window.__map?.loaded?.() && window.__map.areTilesLoaded(), null, { timeout: 25000 }).catch(() => errors.push('map never finished loading'))
await page.waitForTimeout(1200)
await page.screenshot({ path: out })
console.log(JSON.stringify({ pins: await page.locator('.pin').count(), errors: [...new Set(errors)].slice(0, 8) }))
await browser.close()
