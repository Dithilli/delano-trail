import { useEffect, useState } from 'react'
import type { Snap } from '../types'

export const WIDE = '(min-width: 900px)'
/** Gap left above a fully raised sheet, so the trail chips stay reachable. */
export const SHEET_TOP = 68

export function useViewport() {
  const read = () => ({ wide: window.matchMedia(WIDE).matches, height: window.innerHeight })
  const [v, setV] = useState(read)
  useEffect(() => {
    const on = () => setV(read())
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
    }
  }, [])
  return v
}

/** Pixels of sheet showing at each snap point. */
export function sheetVisible(snap: Snap, height: number): number {
  const full = height - SHEET_TOP
  if (snap === 'full') return full
  // About half an inch above the midpoint, so the home header and the first trails both show.
  if (snap === 'half') return Math.min(full, Math.round(height * 0.47) + 48)
  return Math.min(full, 148)
}

/** Where a released drag should settle: the nearest snap, biased by a flick. */
export function settle(visibleAtRelease: number, velocity: number, height: number): Snap {
  const snaps: Snap[] = ['peek', 'half', 'full']
  // velocity is px/ms, positive when the finger moves up (sheet growing)
  const projected = visibleAtRelease + velocity * 180
  let best: Snap = 'half'
  let gap = Infinity
  for (const s of snaps) {
    const d = Math.abs(sheetVisible(s, height) - projected)
    if (d < gap) { gap = d; best = s }
  }
  return best
}
