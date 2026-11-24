import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Lightbox, type Photo } from './Lightbox'
import { MEDALLION, PRINTED_MAP, sized } from './lib/image'
import type { Route } from './lib/route'
import { excerpt, plain } from './lib/text'
import type { Block, LngLat, Stop, Trail } from './types'

type Go = (r: Route) => void

const SITE = 'https://www.delanomnhistory.org'
const trailVar = (t: Trail) => ({ '--trail': t.color }) as CSSProperties

/** Fade each `.reveal` element up as it scrolls into view. */
function useReveal(key: string) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const items = root.current?.querySelectorAll('.reveal')
    if (!items?.length) return
    if (!('IntersectionObserver' in window)) {
      items.forEach((n) => n.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      }),
      { rootMargin: '0px 0px -6% 0px' },
    )
    items.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [key])
  return root
}

export function HomePanel({ trails, stops, go, onReplay }: { trails: Trail[]; stops: Stop[]; go: Go; onReplay: () => void }) {
  return (
    <div className="view home">
      <header className="masthead">
        <div className="medallion">
          <img src={MEDALLION} alt="" width={216} height={200} />
        </div>
        <p className="eyebrow">Delano, Minnesota</p>
        <h1>Spirit of Community Trail</h1>
        <p className="lede">
          Delano’s story is one of <em>creativity, resilience and community investment</em>. Follow the bronze plaques
          through downtown and discover the people and places behind it.
        </p>
      </header>

      <h2 className="section-title">Choose a trail</h2>
      <ul className="trail-cards">
        {trails.map((t, i) => {
          const own = stops.filter((s) => s.trail === t.id)
          return (
            <li key={t.id} style={{ '--n': i } as CSSProperties}>
              <button className="trail-card" style={trailVar(t)} onClick={() => go({ view: 'trail', trail: t.id })}>
                <span className="trail-card__bar" />
                <span className="trail-card__text">
                  <strong>{t.name}</strong>
                  <span>{t.area}</span>
                </span>
                <span className="trail-card__count">{own.length} stops</span>
              </button>
            </li>
          )
        })}
      </ul>

      <section className="how">
        <h2 className="section-title">How the trail works</h2>
        <p>
          The trail features 50+ historic sites, along with sites recognizing the nonprofit organizations that
          contribute to the community. At each location, look for a bronze commemorative plaque and QR code.
        </p>
        <p>
          Join the trail wherever you are, or create your own route, from the Heritage Center in historic downtown to
          the library, sculpture park or Central Park.
        </p>
        <a className="printed" href={sized(PRINTED_MAP, 1500)} target="_blank" rel="noreferrer">
          <img src={sized(PRINTED_MAP, 300)} alt="The printed Spirit of Community Trail map" loading="lazy" />
          <span>
            <strong>The printed map</strong>
            Available at the Heritage Center and City Hall.
          </span>
        </a>
      </section>

      <footer className="credits">
        Stories, photographs and research by the Spirit of Community Trail Committee of the{' '}
        <a href={`${SITE}/adventure-starts`} target="_blank" rel="noreferrer">
          Delano Franklin Township Area Historical Society
        </a>
        , in honor of Delano’s 150th anniversary.
        <button className="replay" onClick={onReplay}>Replay the opening</button>
      </footer>
    </div>
  )
}

export function TrailPanel({
  trail,
  stops,
  go,
  completed,
  nextTrail,
  onTour,
}: {
  trail: Trail
  stops: Stop[]
  go: Go
  /** The visitor has just finished this trail's guided tour. */
  completed: boolean
  nextTrail?: Trail
  onTour: () => void
}) {
  return (
    <div className="view trail" style={trailVar(trail)}>
      <button className="back" onClick={() => go({ view: 'home' })}>← All trails</button>
      {completed && (
        <div className="complete">
          <strong>{trail.name} complete!</strong>
          <span>You visited all {stops.length} plaques.</span>
          {nextTrail && (
            <button onClick={() => go({ view: 'trail', trail: nextTrail.id })} style={trailVar(nextTrail)}>
              Next: {nextTrail.name} →
            </button>
          )}
        </div>
      )}
      <header className="trail-head">
        <span className="trail-head__bar" />
        <div>
          <h1>{trail.name}</h1>
          <p>{trail.area} · {stops.length} stops</p>
        </div>
      </header>
      <button className="bronze-button bronze-button--wide" onClick={onTour}>
        <span className="play" aria-hidden="true" /> Play the guided tour
      </button>
      <ol className="stop-list">
        {stops.map((s, i) => (
          <li key={s.slug} style={{ '--n': i } as CSSProperties}>
            <button className="stop-row" onClick={() => go({ view: 'stop', slug: s.slug })}>
              <span className="num">{s.number}</span>
              <span className="stop-row__text">
                <strong>{s.name}</strong>
                <span>{[s.address, s.subtitle].filter(Boolean).join(' · ') || (s.nonprofit ? 'Community nonprofit' : '')}</span>
              </span>
              {s.hero && <img src={sized(s.hero, 100)} alt="" loading="lazy" />}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** A short text block straight after a photo is its caption on the original site. */
function captionFor(body: Block[], i: number): string | undefined {
  const next = body[i + 1]
  if (next?.type !== 'text') return undefined
  const text = plain(next.html)
  return text.length > 0 && text.length < 280 ? text : undefined
}

export function StopPanel({
  stop,
  trail,
  siblings,
  placed,
  go,
}: {
  stop: Stop
  trail: Trail
  siblings: Stop[]
  placed?: { lngLat: LngLat; approx: boolean }
  go: Go
}) {
  const root = useReveal(stop.slug)
  const [open, setOpen] = useState<number | null>(null)
  useEffect(() => setOpen(null), [stop.slug])

  const photos = useMemo<Photo[]>(
    () => stop.body.flatMap((b, i) => (b.type === 'image' ? [{ src: b.src, alt: b.alt, caption: captionFor(stop.body, i) }] : [])),
    [stop],
  )
  const heroIndex = stop.body.findIndex((b) => b.type === 'image')
  const i = siblings.findIndex((s) => s.slug === stop.slug)
  const prev = siblings[i - 1]
  const next = siblings[i + 1]
  let photoN = -1

  return (
    <article className="view stop" style={trailVar(trail)} ref={root}>
      {stop.hero && (
        <button className="hero" onClick={() => setOpen(0)} aria-label="View photograph">
          <img key={stop.hero} src={sized(stop.hero, 1000)} alt="" />
        </button>
      )}
      <button className="back" onClick={() => go({ view: 'trail', trail: trail.id })}>← {trail.name}</button>
      <header className="stop-head">
        <p className="badge">
          <span className="num">{stop.number}</span>
          {trail.name}
          {stop.nonprofit && <span className="tag">Nonprofit</span>}
        </p>
        <h1>{stop.title}</h1>
        {(stop.address || stop.subtitle) && (
          <p className="facts">{[stop.address, stop.subtitle].filter(Boolean).join(' · ')}</p>
        )}
        {placed && (
          <a
            className="directions"
            href={`https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${placed.lngLat[1]},${placed.lngLat[0]}`}
            target="_blank"
            rel="noreferrer"
          >
            Walking directions
          </a>
        )}
      </header>

      <div className="stop-body">
        {stop.body.map((b, n) => {
          if (b.type === 'image') {
            const mine = ++photoN
            if (n === heroIndex) return null // already shown as the hero
            return (
              <figure key={n} className="photo reveal">
                <button onClick={() => setOpen(mine)} aria-label="Enlarge photograph">
                  <img src={sized(b.src, 750)} alt={b.alt ?? ''} loading="lazy" width={b.w} height={b.h} />
                </button>
              </figure>
            )
          }
          if (b.type === 'text') {
            const isCaption = n > 0 && stop.body[n - 1].type === 'image' && captionFor(stop.body, n - 1) !== undefined
            return <div key={n} className={`prose reveal ${isCaption ? 'prose--caption' : ''}`} dangerouslySetInnerHTML={{ __html: b.html }} />
          }
          if (b.type === 'link') {
            return (
              <a key={n} className="more reveal" href={b.href} target="_blank" rel="noreferrer">
                {b.label} →
              </a>
            )
          }
          return (
            <div key={n} className="video reveal">
              <iframe src={b.src} title="Video" allowFullScreen loading="lazy" />
            </div>
          )
        })}
      </div>

      <nav className="pager">
        {prev ? (
          <button onClick={() => go({ view: 'stop', slug: prev.slug })}>
            <span>← Stop {prev.number}</span>
            <strong>{prev.name}</strong>
          </button>
        ) : <span />}
        {next ? (
          <button className="pager__next" onClick={() => go({ view: 'stop', slug: next.slug })}>
            <span>Stop {next.number} →</span>
            <strong>{next.name}</strong>
          </button>
        ) : <span />}
      </nav>
      <p className="source">
        From the Historical Society’s page for this plaque:{' '}
        <a href={stop.sourceUrl} target="_blank" rel="noreferrer">view the original</a>
      </p>

      {open !== null && <Lightbox photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </article>
  )
}

export const TOUR_SECONDS = 16

/** Guided tour: one plaque at a time, advancing on its own. */
export function TourCard({
  stop,
  trail,
  total,
  playing,
  onPlaying,
  onStep,
  onDone,
  onRead,
  onExit,
}: {
  stop: Stop
  trail: Trail
  total: number
  playing: boolean
  onPlaying: (p: boolean) => void
  onStep: (d: 1 | -1) => void
  onDone: () => void
  onRead: () => void
  onExit: () => void
}) {
  return (
    <article className="view tour" style={trailVar(trail)}>
      <div className="tour__top">
        <span className="tour__label">Guided tour · {trail.name}</span>
        <button className="tour__exit" onClick={onExit}>End tour ×</button>
      </div>
      <div className="tour__bar" role="progressbar" aria-label="Time until the next stop">
        <i
          key={stop.slug}
          style={{ animationDuration: `${TOUR_SECONDS}s`, animationPlayState: playing ? 'running' : 'paused' }}
          onAnimationEnd={onDone}
        />
      </div>
      {stop.hero && (
        <div className="tour__photo">
          <img key={stop.hero} src={sized(stop.hero, 1000)} alt="" />
        </div>
      )}
      <p className="badge">
        <span className="num">{stop.number}</span>
        Stop {stop.number} of {total}
        {stop.nonprofit && <span className="tag">Nonprofit</span>}
      </p>
      <h1>{stop.title}</h1>
      {(stop.address || stop.subtitle) && <p className="facts">{[stop.address, stop.subtitle].filter(Boolean).join(' · ')}</p>}
      <p className="tour__summary">{excerpt(stop.summary, 420)}</p>
      <button className="tour__read" onClick={onRead}>Read the full story →</button>

      <div className="tour__controls">
        <button onClick={() => onStep(-1)} disabled={stop.number === 1} aria-label="Previous stop">‹</button>
        <button className="tour__play" onClick={() => onPlaying(!playing)} aria-label={playing ? 'Pause the tour' : 'Resume the tour'}>
          {playing ? <span className="pause" aria-hidden="true" /> : <span className="play" aria-hidden="true" />}
        </button>
        <button onClick={() => onStep(1)} aria-label="Next stop">›</button>
      </div>
    </article>
  )
}
