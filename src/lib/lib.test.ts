import { describe, expect, it } from 'vitest'
import { bounds, distance, formatDistance, nearest } from './geo'
import { sized } from './image'
import { parseHash, toHash, type Route } from './route'
import { excerpt, plain } from './text'

describe('route', () => {
  it('round-trips every view', () => {
    const routes: Route[] = [{ view: 'home' }, { view: 'trail', trail: 'lime' }, { view: 'stop', slug: '1st-national-bank' }]
    for (const r of routes) expect(parseHash(toHash(r))).toEqual(r)
  })
  it('falls back to home for anything unrecognised', () => {
    for (const h of ['', '#', '#/', '#/nope/x', '#/stop', '#/trail/']) expect(parseHash(h)).toEqual({ view: 'home' })
  })
})

describe('geo', () => {
  const riverAndBridge: [number, number] = [-93.789318, 45.041946]
  const secondAndBridge: [number, number] = [-93.78784, 45.041945]
  it('measures a downtown block', () => {
    // River St to 2nd St along Bridge Ave is one block, a little over 115 m.
    expect(distance(riverAndBridge, secondAndBridge)).toBeGreaterThan(110)
    expect(distance(riverAndBridge, secondAndBridge)).toBeLessThan(122)
    expect(distance(riverAndBridge, riverAndBridge)).toBe(0)
  })
  it('finds the nearest placed item and skips unplaced ones', () => {
    const items = [{ id: 'far', at: [-93.77, 45.05] as [number, number] }, { id: 'near', at: secondAndBridge }, { id: 'none', at: undefined }]
    expect(nearest(riverAndBridge, items, (i) => i.at)?.item.id).toBe('near')
    expect(nearest(riverAndBridge, [], () => undefined)).toBeNull()
  })
  it('boxes points', () => {
    expect(bounds([])).toBeNull()
    expect(bounds([[1, 5], [3, 2], [2, 9]])).toEqual([[1, 2], [3, 9]])
  })
  it('formats walking distances', () => {
    expect(formatDistance(30)).toBe('100 ft')
    expect(formatDistance(1609.34)).toBe('1.0 mi')
  })
})

describe('text and images', () => {
  it('strips markup and entities', () => {
    expect(plain('<p>Leiter&#x27;s  <strong>Livery</strong> &amp; Auto</p>')).toBe("Leiter's Livery & Auto")
  })
  it('cuts excerpts at a sentence when it can', () => {
    const t = 'Built in 1912. It housed a music store and later a bakery that everyone remembers fondly.'
    expect(excerpt(t, 200)).toBe(t)
    expect(excerpt(t, 20)).toBe('Built in 1912.')
    expect(excerpt('Supercalifragilistic words keep going without a stop', 30)).toBe('Supercalifragilistic words…')
    expect(excerpt('One sentence here is long enough. Two sentences follow it right after.', 45)).toBe('One sentence here is long enough.')
  })
  it('asks the CDN for a size, and leaves other hosts alone', () => {
    expect(sized('https://images.squarespace-cdn.com/a/b.jpg', 750)).toBe('https://images.squarespace-cdn.com/a/b.jpg?format=750w')
    expect(sized('https://example.org/b.jpg', 750)).toBe('https://example.org/b.jpg')
  })
})
