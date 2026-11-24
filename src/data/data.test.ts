import { describe, expect, it } from 'vitest'
import data from './trail.json'
import geo from './geo.json'

const stops = data.stops
const trails = data.trails
const placed = geo.stops as Record<string, { lngLat: number[]; approx: boolean }>
const lines = geo.trails as Record<string, number[][][]>

// Greater downtown Delano.
const inTown = ([lng, lat]: number[]) => lng > -93.80 && lng < -93.78 && lat > 45.038 && lat < 45.05

describe('trail data', () => {
  it('has the printed list: 7 trails, 72 plaques', () => {
    expect(trails.map((t) => t.id)).toEqual(['green', 'red', 'lime', 'purple', 'yellow', 'blue', 'orange'])
    expect(stops).toHaveLength(72)
    const counts = Object.fromEntries(trails.map((t) => [t.id, stops.filter((s) => s.trail === t.id).length]))
    expect(counts).toEqual({ green: 10, red: 11, lime: 10, purple: 12, yellow: 10, blue: 9, orange: 10 })
  })
  it('numbers each trail 1..n with unique slugs', () => {
    expect(new Set(stops.map((s) => s.slug)).size).toBe(72)
    for (const t of trails) {
      const nums = stops.filter((s) => s.trail === t.id).map((s) => s.number)
      expect(nums).toEqual(nums.map((_, i) => i + 1))
    }
  })
  it('gives every plaque a title, a summary and a story', () => {
    for (const s of stops) {
      expect(s.title, s.slug).toBeTruthy()
      expect(s.summary.length, s.slug).toBeGreaterThan(100)
      expect(s.body.length, s.slug).toBeGreaterThan(0)
    }
  })
  it('contains only whitelisted markup in story text', () => {
    const allowed = /^(p|h2|h3|h4|strong|em|b|i|a|ul|ol|li|br|blockquote)$/
    for (const s of stops) {
      for (const b of s.body) {
        if (b.type !== 'text') continue
        for (const m of (b.html ?? '').matchAll(/<\/?([a-z0-9]+)([^>]*)>/gi)) {
          expect(m[1], s.slug).toMatch(allowed)
          if (m[2].trim()) expect(m[2].trim(), s.slug).toMatch(/^href="(https?:|mailto:)[^"]*"$/)
        }
      }
    }
  })
  it('places every plaque, and every trail line, in downtown Delano', () => {
    for (const s of stops) {
      expect(placed[s.slug], s.slug).toBeDefined()
      expect(inTown(placed[s.slug].lngLat), s.slug).toBe(true)
    }
    for (const t of trails) {
      expect(lines[t.id]?.length, t.id).toBeGreaterThan(0)
      for (const line of lines[t.id]) for (const p of line) expect(inTown(p), t.id).toBe(true)
    }
  })
})
