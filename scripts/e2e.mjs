// End-to-end walk through the app as a visitor would use it: on a phone first,
// then a shorter pass on a wide screen.
// Usage: node scripts/e2e.mjs <base-url> <screenshot-dir>
import { chromium } from 'playwright'
const [base, dir] = process.argv.slice(2)
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
const results = []
const errors = []
const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail !== '' ? ' — ' + detail : ''}`)
const watch = (page) => {
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + String(e).slice(0, 200)))
}
const cam = (page) => page.evaluate(() => ({ zoom: +window.__map.getZoom().toFixed(2), pitch: +window.__map.getPitch().toFixed(0) }))
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }

/** A real finger swipe, via the browser's touch input. */
async function swipe(page, x, fromY, toY, ms = 220) {
  const cdp = await page.context().newCDPSession(page)
  const steps = 10
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: fromY }] })
  for (let i = 1; i <= steps; i++) {
    await page.waitForTimeout(ms / steps)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: fromY + ((toY - fromY) * i) / steps }] })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(650)
}
const snapOf = (page) => page.evaluate(() => [...document.querySelector('.sheet').classList].find((c) => /sheet--(peek|half|full)/.test(c)))
/** Height of sheet actually on screen. */
const showing = (page) => page.evaluate(() => Math.round(window.innerHeight - document.querySelector('.sheet').getBoundingClientRect().top))
/** Is the element's centre on screen and not covered by something else? */
const tappable = (page, sel) => page.evaluate((sel) => {
  const el = document.querySelector(sel)
  if (!el) return false
  const r = el.getBoundingClientRect()
  const x = r.left + r.width / 2, y = r.top + r.height / 2
  if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false
  const hit = document.elementFromPoint(x, y)
  return !!hit && (hit === el || el.contains(hit))
}, sel)

// ---------------------------------------------------------------- phone
{
  const page = await (await browser.newContext(PHONE)).newPage()
  watch(page)
  await page.goto(base, { waitUntil: 'load' })
  await page.waitForSelector('.intro .bronze-button')
  await page.waitForTimeout(3600)
  check('phone: opening card shows', await page.locator('.intro__title').isVisible())
  check('phone: opening fits the screen', await page.evaluate(() => {
    const r = document.querySelector('.intro .bronze-button').getBoundingClientRect()
    return r.bottom < innerHeight && r.left >= 0 && r.right <= innerWidth
  }))
  await page.screenshot({ path: `${dir}/p1-intro.png` })
  await page.tap('.intro .bronze-button')
  await page.waitForTimeout(8800)
  const landed = await cam(page)
  check('phone: flight lands on downtown, tilted', landed.zoom > 13.5 && landed.pitch > 30, JSON.stringify(landed))
  check('phone: 72 pins revealed', await page.locator('.pin').count() === 72 && await page.locator('.map--veiled').count() === 0)
  check('phone: sheet opens half-raised', await snapOf(page) === 'sheet--half', `${await showing(page)}px showing`)
  check('phone: no sideways scroll', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await page.screenshot({ path: `${dir}/p2-home.png` })

  // The sheet follows the finger.
  await swipe(page, 195, 470, 150)
  check('phone: swipe up raises the sheet fully', await snapOf(page) === 'sheet--full', `${await showing(page)}px showing`)
  check('phone: chips stay reachable above a full sheet', await tappable(page, '.chip'))
  await page.screenshot({ path: `${dir}/p3-home-full.png` })
  await swipe(page, 195, 82, 760)
  check('phone: swipe down from the handle drops it to a peek', await snapOf(page) === 'sheet--peek', `${await showing(page)}px showing`)
  check('phone: peek still names the page', await tappable(page, '.masthead h1'))
  await page.tap('.sheet__handle')
  await page.waitForTimeout(600)
  check('phone: tapping the handle raises it', await snapOf(page) === 'sheet--half')

  await page.tap('.chip:has-text("Red")')
  await page.waitForTimeout(2800)
  check('phone: red trail lists 11 stops', await page.locator('.stop-row').count() === 11)
  check('phone: other trails dim on map', await page.locator('.pin-wrap:not(.pin-wrap--dim)').count() === 11)
  check('phone: tour button within thumb reach at half', await tappable(page, '.bronze-button--wide'))
  await page.screenshot({ path: `${dir}/p4-trail.png` })

  await swipe(page, 195, 600, 200)
  check('phone: list scrolls once the sheet is full', await snapOf(page) === 'sheet--full')
  await page.locator('.stop-row:has-text("Beck Building")').tap()
  await page.waitForTimeout(3400)
  check('phone: stop opens half-raised with its title', await snapOf(page) === 'sheet--half' && (await page.locator('.stop h1').textContent()) === 'Beck Building')
  check('phone: title, address and photo visible at half', await tappable(page, '.stop h1') && await tappable(page, '.facts') && await tappable(page, '.hero'))
  check('phone: full story arrived', await page.locator('.stop-body .prose').count() > 5, String(await page.locator('.stop-body .prose').count()))
  const pin = await page.evaluate(() => {
    const r = document.querySelector('.pin-wrap--active .pin').getBoundingClientRect()
    const sheetTop = document.querySelector('.sheet').getBoundingClientRect().top
    return { y: Math.round(r.top + r.height / 2), sheetTop: Math.round(sheetTop) }
  })
  check('phone: selected pin sits in the map above the sheet', pin.y > 70 && pin.y < pin.sheetTop - 20, JSON.stringify(pin))
  await page.screenshot({ path: `${dir}/p5-stop.png` })

  await page.tap('.hero')
  await page.waitForTimeout(900)
  const box = await page.evaluate(() => {
    const r = document.querySelector('.lightbox').getBoundingClientRect()
    return r.top === 0 && r.left === 0 && Math.round(r.height) === innerHeight
  })
  check('phone: photo viewer covers the whole screen', box)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 320, y: 400 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 120, y: 405 }] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(700)
  check('phone: swipe steps to the next photo', (await page.locator('.lightbox small').textContent())?.startsWith('2 of'), await page.locator('.lightbox small').textContent())
  await page.screenshot({ path: `${dir}/p6-lightbox.png` })
  await page.tap('.lightbox__close')
  check('phone: photo viewer closes', await page.locator('.lightbox').count() === 0)

  // Reading: raise the sheet, scroll the story.
  await swipe(page, 195, 560, 160)
  check('phone: swipe up on the story raises it', await snapOf(page) === 'sheet--full')
  await swipe(page, 195, 700, 250)
  const scrolled = await page.evaluate(() => document.querySelector('.sheet__body').scrollTop)
  check('phone: then the story scrolls', scrolled > 100 && await snapOf(page) === 'sheet--full', `scrollTop ${scrolled}`)
  await page.screenshot({ path: `${dir}/p7-reading.png` })

  // Guided tour.
  await page.goto(`${base}?nointro#/trail/blue`, { waitUntil: 'load' })
  await page.waitForTimeout(2500)
  await page.tap('.bronze-button--wide')
  await page.waitForTimeout(3600)
  check('phone: tour starts at stop 1', (await page.locator('.tour .badge').textContent())?.includes('Stop 1 of 9'))
  check('phone: tour controls reachable at half', await snapOf(page) === 'sheet--half' && await tappable(page, '.tour__play') && await tappable(page, '.tour__controls button[aria-label="Next stop"]'))
  await page.screenshot({ path: `${dir}/p8-tour.png` })
  const b1 = await page.evaluate(() => window.__map.getBearing())
  await page.waitForTimeout(1500)
  const b2 = await page.evaluate(() => window.__map.getBearing())
  check('phone: camera circles during tour', Math.abs(b2 - b1) > 1, `${b1.toFixed(1)} -> ${b2.toFixed(1)}`)
  for (let i = 0; i < 9; i++) { await page.tap('.tour__controls button[aria-label="Next stop"]'); await page.waitForTimeout(200) }
  await page.waitForTimeout(1500)
  check('phone: finishing the tour celebrates', await page.locator('.complete').isVisible())
  await page.screenshot({ path: `${dir}/p9-complete.png` })

  // A plaque's QR code: straight to the story.
  await page.goto('about:blank')
  await page.goto(`${base}#/stop/delano-creamery`, { waitUntil: 'load' })
  await page.waitForTimeout(4500)
  check('phone: deep link skips the opening', await page.locator('.intro').count() === 0)
  check('phone: deep link shows the story', (await page.locator('.stop h1').textContent()) === 'Delano Creamery')
  await page.close()
}

// Tour advances by itself (shortened clock).
{
  const page = await (await browser.newContext(PHONE)).newPage()
  watch(page)
  await page.goto(`${base}?nointro#/trail/blue`, { waitUntil: 'load' })
  await page.addStyleTag({ content: '.tour__bar i { animation-duration: 1.2s !important; }' })
  await page.waitForTimeout(1500)
  await page.tap('.bronze-button--wide')
  await page.waitForTimeout(2300)
  check('phone: tour advances on its own', !(await page.locator('.tour .badge').textContent())?.includes('Stop 1 of'), await page.locator('.tour .badge').textContent())
  await page.close()
}

// First-load weight, as a phone on a cold cache sees it.
{
  const page = await (await browser.newContext(PHONE)).newPage()
  let bytes = 0
  const stories = []
  page.on('response', async (r) => {
    const url = r.url()
    if (!url.startsWith(base.replace(/\/$/, ''))) return
    const len = +(r.headers()['content-length'] ?? 0)
    bytes += len
    if (/stories|blue|red|green|lime|purple|yellow|orange/.test(url.split('/').pop() ?? '') && /\.js(on)?(\?|$)/.test(url)) stories.push(url.split('/').pop())
  })
  await page.goto(`${base}?nointro`, { waitUntil: 'load' })
  await page.waitForTimeout(5000)
  check('phone: no story files fetched before a trail is opened', stories.length === 0, stories.join(',') || `${Math.round(bytes / 1024)} KB of app files on the wire`)
  await page.close()
}

// ---------------------------------------------------------------- wide screen
{
  const page = await browser.newPage({ viewport: { width: 1360, height: 860 } })
  watch(page)
  await page.goto(base, { waitUntil: 'load' })
  await page.waitForSelector('.intro .bronze-button')
  await page.waitForTimeout(3200)
  await page.screenshot({ path: `${dir}/d1-intro.png` })
  await page.click('.intro .bronze-button')
  await page.waitForTimeout(8800)
  const layout = await page.evaluate(() => {
    const s = document.querySelector('.sheet').getBoundingClientRect()
    const m = document.querySelector('.map').getBoundingClientRect()
    return { panel: [Math.round(s.left), Math.round(s.width), Math.round(s.height)], map: [Math.round(m.left), Math.round(m.width)] }
  })
  check('wide: side panel beside the map, no overlap', layout.panel[0] === 0 && layout.panel[1] === 440 && layout.map[0] === 440 && layout.map[1] === 920 && layout.panel[2] === 860, JSON.stringify(layout))
  check('wide: no drag handle', await page.locator('.sheet__handle').count() === 0)
  check('wide: 72 pins revealed', await page.locator('.pin').count() === 72 && await page.locator('.map--veiled').count() === 0)
  await page.click('.chip:has-text("Red")')
  await page.waitForTimeout(2600)
  await page.click('.stop-row:has-text("Beck Building")')
  await page.waitForTimeout(3200)
  check('wide: stop story opens', (await page.locator('.stop h1').textContent()) === 'Beck Building')
  check('wide: camera swooped in', (await cam(page)).zoom > 17, JSON.stringify(await cam(page)))
  await page.screenshot({ path: `${dir}/d2-stop.png` })
  await page.click('.hero')
  await page.waitForTimeout(800)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(500)
  check('wide: photo viewer steps with the keyboard', (await page.locator('.lightbox small').textContent())?.startsWith('2 of'))
  await page.keyboard.press('Escape')
  await page.click('.back')
  await page.waitForTimeout(400)
  await page.click('.bronze-button--wide')
  await page.waitForTimeout(3200)
  check('wide: tour starts', (await page.locator('.tour .badge').textContent())?.includes('Stop 1 of 11'))
  await page.screenshot({ path: `${dir}/d3-tour.png` })
  await page.close()

  const edit = await browser.newPage({ viewport: { width: 1200, height: 800 } })
  watch(edit)
  await edit.goto(`${base}?edit`, { waitUntil: 'load' })
  await edit.waitForTimeout(3000)
  check('pin editor shows estimates dashed', await edit.locator('.pin-wrap--approx').count() === 44, String(await edit.locator('.pin-wrap--approx').count()))
  await edit.close()
}

await browser.close()
console.log(results.join('\n'))
console.log('console errors:', JSON.stringify([...new Set(errors)].slice(0, 6)))
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0)
