import { useEffect, useRef } from 'react'

interface Spark { x: number; y: number; vx: number; vy: number; life: number; ttl: number; color: string; size: number }


/**
 * A few seconds of fireworks, as on the printed map's Central Park.
 * `show` changes to launch a new display; `bursts` is how many shells go up.
 */
export function Fireworks({ show, bursts = 9, colors }: { show: number; bursts?: number; colors: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !show || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const size = () => {
      canvas.width = canvas.clientWidth * dpr
      canvas.height = canvas.clientHeight * dpr
    }
    size()
    window.addEventListener('resize', size)

    const sparks: Spark[] = []
    const palette = colors
    const burst = () => {
      const x = canvas.width * (0.12 + Math.random() * 0.76)
      const y = canvas.height * (0.1 + Math.random() * 0.4)
      const color = palette[Math.floor(Math.random() * palette.length)]
      const count = 70 + Math.floor(Math.random() * 50)
      const power = (2.2 + Math.random() * 2.4) * dpr
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + Math.random() * 0.2
        const v = power * (0.45 + Math.random() * 0.75)
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, ttl: 70 + Math.random() * 50, color: Math.random() < 0.2 ? '#ffffff' : color, size: (1.2 + Math.random() * 1.8) * dpr })
      }
    }

    const timers: number[] = []
    for (let i = 0; i < bursts; i++) timers.push(window.setTimeout(burst, i * 420 + Math.random() * 260))

    let frame = 0
    const started = performance.now()
    const tick = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = 'source-over'
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.life++
        if (s.life > s.ttl) { sparks.splice(i, 1); continue }
        s.vx *= 0.975
        s.vy = s.vy * 0.975 + 0.035 * dpr
        s.x += s.vx
        s.y += s.vy
        const fade = 1 - s.life / s.ttl
        ctx.globalAlpha = fade
        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size * (0.5 + fade * 0.5), 0, Math.PI * 2)
        ctx.fill()
        // a short tail
        ctx.globalAlpha = fade * 0.35
        ctx.beginPath()
        ctx.arc(s.x - s.vx * 2, s.y - s.vy * 2, s.size * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      if (sparks.length || now - started < bursts * 700) frame = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    frame = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(frame)
      timers.forEach(clearTimeout)
      window.removeEventListener('resize', size)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show])

  return <canvas ref={ref} className="fireworks" aria-hidden="true" />
}
