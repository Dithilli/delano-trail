// Count street-name labels on screen at a few zooms, on a phone. Usage: node scripts/labels.mjs <base-url> [shot.png]
import { chromium } from 'playwright'
const [base, shot] = process.argv.slice(2)
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage()
await page.goto(`${base}?nointro#/stop/beck-building`, { waitUntil: 'load' })
await page.waitForTimeout(5000)
const out = {}
for (const zoom of [16, 17, 18, 19]) {
  // 2nd St N at Bridge Ave: two named streets cross mid-screen
  await page.evaluate((z) => window.__map.jumpTo({ center: [-93.78784, 45.041945], zoom: z, pitch: 50, bearing: 20 }), zoom)
  await page.waitForFunction(() => window.__map.areTilesLoaded() && !window.__map.isMoving(), null, { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(1500)
  out[`z${zoom}`] = await page.evaluate(() => {
    // labels in the strip of map above the sheet
    const top = document.querySelector('.sheet').getBoundingClientRect().top
    return window.__map.queryRenderedFeatures([[0, 0], [innerWidth, top]], { layers: ['street-name'] }).length
  })
  if (shot) await page.screenshot({ path: shot.replace('.png', `-z${zoom}.png`) })
}
console.log(JSON.stringify(out))
await browser.close()
