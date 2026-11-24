import { describe, expect, it } from 'vitest'
import data from './trail.json'
import geo from './geo.json'
import streets from './streets.json'
import type { Block } from '../types'

const storyFiles = import.meta.glob<{ default: Record<string, Block[]> }>('./stories/*.json', { eager: true })
const stories: Record<string, Block[]> = Object.assign({}, ...Object.values(storyFiles).map((m) => m.default))

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
  it('keeps one story file per trail, holding exactly that trail\'s plaques', () => {
    expect(Object.keys(storyFiles).sort()).toEqual(trails.map((t) => `./stories/${t.id}.json`).sort())
    for (const t of trails) {
      const own = stops.filter((s) => s.trail === t.id).map((s) => s.slug).sort()
      expect(Object.keys(storyFiles[`./stories/${t.id}.json`].default).sort()).toEqual(own)
    }
  })
  it('gives every plaque a title, a summary and a story', () => {
    for (const s of stops) {
      expect(s.title, s.slug).toBeTruthy()
      expect(s.summary.length, s.slug).toBeGreaterThan(100)
      expect(stories[s.slug]?.length, s.slug).toBeGreaterThan(0)
      expect(stories[s.slug].filter((b) => b.type === 'image').length, s.slug).toBe(s.photos)
    }
  })
  it('contains only whitelisted markup in story text', () => {
    const allowed = /^(p|h2|h3|h4|strong|em|b|i|a|ul|ol|li|br|blockquote)$/
    for (const s of stops) {
      for (const b of stories[s.slug]) {
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
  it('labels the downtown streets every few metres', () => {
    for (const name of ['Bridge Avenue East', 'River Street North', 'Railroad Avenue', '2nd Street North']) {
      const i = streets.names.indexOf(name)
      expect(i, name).toBeGreaterThanOrEqual(0)
      expect(streets.points.filter((p) => p[3] === i).length, name).toBeGreaterThan(5)
    }
    for (const [lng, lat, rotation, name] of streets.points) {
      expect(lng > -93.81 && lng < -93.77 && lat > 45.03 && lat < 45.056).toBe(true)
      expect(rotation).toBeGreaterThan(-91) // kept upright
      expect(rotation).toBeLessThan(91)
      expect(streets.names[name]).toBeTruthy()
    }
  })
})
