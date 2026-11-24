import { useEffect, useRef, useState } from 'react'
import { Fireworks } from './Fireworks'
import { TrailMark } from './TrailMark'

/** The opening card. The map waits high above Minnesota until the visitor begins. */
export function Intro({ onBegin, colors }: { onBegin: () => void; colors: string[] }) {
  const [leaving, setLeaving] = useState(false)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    button.current?.focus({ preventScroll: true })
  }, [])

  const begin = () => {
    if (leaving) return
    setLeaving(true)
    window.setTimeout(onBegin, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900)
  }

  return (
    <div className={`intro ${leaving ? 'intro--leaving' : ''}`} role="dialog" aria-modal="true" aria-label="Welcome to the Spirit of Community Trail">
      <Fireworks show={1} bursts={16} colors={colors} />
      <div className="intro__card">
        <h1 className="intro__title"><TrailMark /></h1>
        <p className="intro__years">Delano, Minnesota · 1876 – 2026</p>
        <p className="intro__lede">Seven trails. Seventy-two bronze plaques. One hundred and fifty years of stories.</p>
        <button ref={button} className="primary-button" onClick={begin}>
          Begin the adventure
        </button>
      </div>
    </div>
  )
}
