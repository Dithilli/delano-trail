import { useEffect, useRef, type ReactNode, type Ref } from 'react'
import { settle, sheetVisible, SHEET_TOP } from './lib/viewport'
import type { Snap } from './types'

/**
 * On a phone, the story lives in a sheet pulled up over the map: peek, half or
 * full. On a wide screen the same element is simply the side panel.
 */
export function Sheet({
  wide,
  height,
  snap,
  onSnap,
  scroller,
  children,
}: {
  wide: boolean
  height: number
  snap: Snap
  onSnap: (s: Snap) => void
  scroller: Ref<HTMLDivElement>
  children: ReactNode
}) {
  const el = useRef<HTMLElement>(null)
  const body = useRef<HTMLDivElement | null>(null)
  const state = useRef({ snap, height, onSnap })
  state.current = { snap, height, onSnap }

  const full = height - SHEET_TOP
  const offset = wide ? 0 : full - sheetVisible(snap, height)

  // Finger-dragging. Native listeners because touchmove must be non-passive to
  // stop the page scrolling while the sheet itself is being moved.
  useEffect(() => {
    const sheet = el.current
    if (!sheet || wide) return
    let startY = 0
    let startOffset = 0
    let lastY = 0
    let lastT = 0
    let velocity = 0
    let mode: 'idle' | 'pending' | 'drag' | 'scroll' = 'idle'

    const start = (e: TouchEvent) => {
      const { snap, height } = state.current
      startY = lastY = e.touches[0].clientY
      lastT = e.timeStamp
      velocity = 0
      startOffset = height - SHEET_TOP - sheetVisible(snap, height)
      mode = 'pending'
    }
    const move = (e: TouchEvent) => {
      if (mode === 'idle' || mode === 'scroll') return
      const y = e.touches[0].clientY
      const dy = y - startY
      if (mode === 'pending') {
        if (Math.abs(dy) < 6) return
        const onHandle = (e.target as HTMLElement).closest('.sheet__handle')
        const scrolled = (body.current?.scrollTop ?? 0) > 0
        // A fully raised sheet scrolls its story; it only moves when pulled down from the top.
        if (state.current.snap === 'full' && !onHandle && (scrolled || dy < 0)) {
          mode = 'scroll'
          return
        }
        mode = 'drag'
        sheet.classList.add('sheet--dragging')
      }
      e.preventDefault()
      const max = state.current.height - SHEET_TOP - 96
      const next = Math.max(0, Math.min(max, startOffset + dy))
      sheet.style.transform = `translateY(${next}px)`
      const dt = e.timeStamp - lastT
      if (dt > 0) velocity = 0.7 * velocity + 0.3 * ((lastY - y) / dt)
      lastY = y
      lastT = e.timeStamp
    }
    const end = () => {
      if (mode === 'drag') {
        const { height, onSnap } = state.current
        const moved = lastY - startY
        const visible = height - SHEET_TOP - Math.max(0, startOffset + moved)
        sheet.classList.remove('sheet--dragging')
        const next = settle(visible, velocity, height)
        // Put the transform back in React's hands at the released position.
        sheet.style.transform = `translateY(${height - SHEET_TOP - sheetVisible(next, height)}px)`
        onSnap(next)
      }
      mode = 'idle'
    }
    sheet.addEventListener('touchstart', start, { passive: true })
    sheet.addEventListener('touchmove', move, { passive: false })
    sheet.addEventListener('touchend', end)
    sheet.addEventListener('touchcancel', end)
    return () => {
      sheet.removeEventListener('touchstart', start)
      sheet.removeEventListener('touchmove', move)
      sheet.removeEventListener('touchend', end)
      sheet.removeEventListener('touchcancel', end)
    }
  }, [wide])

  // Anything but full height starts from the top of the story.
  useEffect(() => {
    if (!wide && snap !== 'full') body.current?.scrollTo({ top: 0 })
  }, [snap, wide])

  const cycle = () => onSnap(snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'half')

  return (
    <aside
      ref={el}
      className={`sheet sheet--${snap}`}
      style={wide ? undefined : { height: full, transform: `translateY(${offset}px)` }}
    >
      {!wide && (
        <button
          className="sheet__handle"
          onClick={cycle}
          aria-label={snap === 'full' ? 'Lower the panel to show the map' : 'Raise the panel'}
        >
          <i />
        </button>
      )}
      <div
        className="sheet__body"
        ref={(node) => {
          body.current = node
          if (typeof scroller === 'function') scroller(node)
          else if (scroller) (scroller as { current: HTMLDivElement | null }).current = node
        }}
      >
        {children}
      </div>
    </aside>
  )
}
