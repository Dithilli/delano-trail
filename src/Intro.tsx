import { useEffect, useRef, useState } from 'react'
import { Fireworks } from './Fireworks'
import { MEDALLION } from './lib/image'

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
        <div className="medallion medallion--large">
          <img src={MEDALLION} alt="Delano Spirit of Community Trail" width={216} height={200} />
        </div>
        <p className="intro__years">Delano, Minnesota · 1876 – 2026</p>
        <h1 className="intro__title">
          <span>Your Adventure</span> <span>Starts Here</span>
        </h1>
        <p className="intro__lede">Seven trails. Seventy-two bronze plaques. One hundred and fifty years of stories.</p>
        <button ref={button} className="bronze-button" onClick={begin}>
          Begin the adventure
        </button>
      </div>
    </div>
  )
}
