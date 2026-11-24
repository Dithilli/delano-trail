import type { LngLat } from '../types'

const R = 6371000

/** Great-circle distance in metres. */
export function distance(a: LngLat, b: LngLat): number {
  const rad = Math.PI / 180
  const dLat = (b[1] - a[1]) * rad
  const dLng = (b[0] - a[0]) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function nearest<T>(from: LngLat, items: T[], at: (item: T) => LngLat | undefined): { item: T; metres: number } | null {
  let best: { item: T; metres: number } | null = null
  for (const item of items) {
    const p = at(item)
    if (!p) continue
    const metres = distance(from, p)
    if (!best || metres < best.metres) best = { item, metres }
  }
  return best
}

export function bounds(points: LngLat[]): [LngLat, LngLat] | null {
  if (!points.length) return null
  let [w, s] = points[0]
  let [e, n] = points[0]
  for (const [x, y] of points) {
    w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y)
  }
  return [[w, s], [e, n]]
}

/** Walking-scale distance: feet under a quarter mile, miles beyond. */
export function formatDistance(metres: number): string {
  const feet = metres * 3.28084
  if (feet < 1320) return `${Math.round(feet / 10) * 10} ft`
  return `${(feet / 5280).toFixed(1)} mi`
}
