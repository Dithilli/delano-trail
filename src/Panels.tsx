import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Lightbox, type Photo } from './Lightbox'
import { PRINTED_MAP, sized } from './lib/image'
import type { Route } from './lib/route'
import { excerpt, plain } from './lib/text'
import type { Block, Stop, Trail } from './types'

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
        <h1>
          <img className="banner" src="./delano-trail-banner.jpg" alt="Delano Spirit of Community Trail" width={1486} height={494} />
        </h1>
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

      <p className="lede">
        Delano’s story is one of <em>creativity, resilience and community investment</em>. Follow the bronze plaques
        through downtown and discover the people and places behind it.
      </p>

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
}: {
  trail: Trail
  stops: Stop[]
  go: Go
  /** The visitor has just finished this trail's guided tour. */
  completed?: boolean
  nextTrail?: Trail
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

/** Let a title break after a slash, which is punctuation, but never inside a word. */
const breakable = (text: string) => text.replace(/\//g, '/\u200b')

/**
 * A stop's title beside the audio player. Words are never split, so when the
 * longest word is wider than the room left of the player, the whole title is
 * set a little smaller until that word fits.
 */
function FitTitle({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useLayoutEffect(() => {
    const h = ref.current
    const box = h?.closest<HTMLElement>('.stop-top, .tour__head')
    if (!h || !box) return
    const fit = () => {
      h.style.fontSize = ''
      const player = box.querySelector<HTMLElement>('.dial')
      const room = box.clientWidth - (player ? player.offsetWidth + 16 : 0)
      const pen = document.createElement('canvas').getContext('2d')
      if (!pen || room <= 0) return
      const style = getComputedStyle(h)
      pen.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      const widest = Math.max(...text.split(/[\s/]+|(?<=-)/).map((w) => pen.measureText(w).width)) + 4
      if (widest > room) h.style.fontSize = `${Math.max(15, Math.floor((parseFloat(style.fontSize) * room) / widest))}px`
    }
    fit()
    const watch = new ResizeObserver(fit)
    watch.observe(box)
    document.fonts?.ready.then(fit)
    return () => watch.disconnect()
  }, [text])
  return <h1 ref={ref}>{breakable(text)}</h1>
}

/**
 * The audio player: one card in the top-right corner of a stop. Go back, play and
 * the faster speed in a row, a bar that fills as the story plays, and the story's name.
 */
function AudioDial({
  id,
  name,
  dark,
  playing,
  progress,
  timed,
  fast,
  onToggle,
  onBack,
  onFast,
  onTimedEnd,
}: {
  /** Changes with the stop, so the bar starts again. */
  id: string
  /** The story this plays. */
  name: string
  /** A pale trail colour (yellow): print in ink instead of white. */
  dark?: boolean
  playing: boolean
  /** 0..1 through a recording. */
  progress: number
  /** No recording: the bar fills on a timer instead. */
  timed?: boolean
  /** The story is playing at the faster speed. */
  fast?: boolean
  onToggle: () => void
  /** Step back a little in the story; absent when there is nothing to go back in. */
  onBack?: () => void
  /** Switch the faster speed on or off. */
  onFast: () => void
  onTimedEnd?: () => void
}) {
  const chevrons = (d: string) => (
    <svg viewBox="0 0 22 20" width="22" height="20" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
  )
  return (
    <div className={`dial${playing ? ' dial--playing' : ''}${dark ? ' dial--ink' : ''}`}>
      <div className="dial__buttons">
        <button className="dial__step" onClick={onBack} disabled={!onBack} aria-label="Go back 5 seconds" title="Go back 5 seconds">{chevrons('M10 2 L3 10 L10 18 M19 2 L12 10 L19 18')}</button>
        <button className="tour__play dial__play" onClick={onToggle} aria-label={playing ? 'Pause the story' : 'Play the story'}>
          {playing ? <span className="pause" aria-hidden="true" /> : <span className="play" aria-hidden="true" />}
        </button>
        <button className={`dial__step${fast ? ' dial__step--on' : ''}`} onClick={onFast} aria-pressed={!!fast} aria-label="Play faster" title={fast ? 'Back to the usual speed' : 'Play faster'}>{chevrons('M3 2 L10 10 L3 18 M12 2 L19 10 L12 18')}</button>
      </div>
      <div className="dial__bar" role="progressbar" aria-label="How far through this story">
        <i
          key={id}
          className="dial__progress"
          style={timed
            ? { animationDuration: `${TOUR_SECONDS / (fast ? FAST_PACE / PACE : 1)}s`, animationPlayState: playing ? 'running' : 'paused' }
            : { animation: 'none', transform: `scaleX(${progress})` }}
          onAnimationEnd={timed ? onTimedEnd : undefined}
        />
      </div>
      <p className="dial__name"><small>{playing ? (fast ? 'Now playing · Faster' : 'Now playing') : 'Listen'}</small>{breakable(name)}</p>
    </div>
  )
}

export function StopPanel({
  stop,
  trail,
  siblings,
  body,
  go,
  onTour,
}: {
  stop: Stop
  trail: Trail
  siblings: Stop[]
  /** Start this stop's story, at the faster speed if asked. */
  onTour: (fast?: boolean) => void
  /** undefined while the trail's stories are loading, null if they failed to load. */
  body: Block[] | null | undefined
  go: Go
}) {
  const root = useReveal(`${stop.slug}:${body ? 'ready' : 'waiting'}`)
  const [open, setOpen] = useState<number | null>(null)
  useEffect(() => setOpen(null), [stop.slug])

  const blocks = body ?? []
  const photos = useMemo<Photo[]>(() => {
    const fromBody = blocks.flatMap((b, i) => (b.type === 'image' ? [{ src: b.src, alt: b.alt, caption: captionFor(blocks, i) }] : []))
    return fromBody.length || !stop.hero ? fromBody : [{ src: stop.hero }]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop, body])
  const heroIndex = blocks.findIndex((b) => b.type === 'image')
  const i = siblings.findIndex((s) => s.slug === stop.slug)
  const prev = siblings[i - 1]
  const next = siblings[i + 1]
  let photoN = -1

  return (
    <article className="view stop" style={trailVar(trail)} ref={root}>
      <div className="stop-top">
        <AudioDial
          id={stop.slug}
          name={stop.name}
          dark={trail.id === 'yellow'}
          playing={false}
          progress={0}
          onToggle={() => onTour()}
          onFast={() => onTour(true)}
        />
        <button className="back" onClick={() => go({ view: 'trail', trail: trail.id })}>← {trail.name}</button>
        <header className="stop-head">
          <p className="badge">
            <span className="num">{stop.number}</span>
            {trail.name}
            {stop.nonprofit && <span className="tag">Nonprofit</span>}
          </p>
          <FitTitle text={stop.title} />
          {(stop.address || stop.subtitle) && (
            <p className="facts">{[stop.address, stop.subtitle].filter(Boolean).join(' · ')}</p>
          )}
        </header>
      </div>
      {stop.hero && (
        <button className="hero" onClick={() => setOpen(0)} aria-label="View photograph">
          <img key={stop.hero} src={sized(stop.hero, 1000)} alt="" />
          {stop.photos > 1 && <span className="hero__count">{stop.photos} photos</span>}
        </button>
      )}

      <div className="stop-body">
        {!body && (
          <>
            <div className="prose"><p>{stop.summary}</p></div>
            {body === undefined ? (
              <div className="loading" role="status">Loading the full story…</div>
            ) : (
              <p className="loading loading--failed">
                The rest of this story couldn’t be loaded. Check your signal, or{' '}
                <a href={stop.sourceUrl} target="_blank" rel="noreferrer">read it on the Historical Society’s site</a>.
              </p>
            )}
          </>
        )}
        {blocks.map((b, n) => {
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
            const isCaption = n > 0 && blocks[n - 1].type === 'image' && captionFor(blocks, n - 1) !== undefined
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

      {/* Portalled: the sheet is CSS-transformed, which would trap a fixed-position child inside it. */}
      {open !== null && createPortal(<Lightbox photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />, document.body)}
    </article>
  )
}

/** Every recording plays a little brisker than it was read; the right arrows make it faster still. */
const PACE = 1.2
const FAST_PACE = 1.5

export const TOUR_SECONDS = 16
/** How long each photograph holds during a story. */
const SLIDE_SECONDS = 6

/** Stops with a recording at public/narration/<slug>.mp3; the rest use the timed tour. */
const NARRATED_STOPS = new Set([
  'city-hall',
  'dcdc',
  'dftahs',
  'delano-united-way',
  'delano-schools',
  'funeral-services',
  'fire-department',
  'leiters-livery-and-auto',
  'sesquicentennial',
  'village-hall',
])

/** A stop's story being played: one plaque at a time; the visitor moves on when ready. */
export function TourCard({
  stop,
  trail,
  stops,
  body,
  playing,
  startFast,
  onPlaying,
  onDone,
  onRead,
  onExit,
}: {
  stop: Stop
  trail: Trail
  /** Every stop on this trail, in order. */
  stops: Stop[]
  /** The stop's story, once loaded: its photographs become the slide show. */
  body?: Block[] | null
  playing: boolean
  /** Begin at the faster speed. */
  startFast?: boolean
  onPlaying: (p: boolean) => void
  /** The story has finished: playback stops here and waits for the visitor. */
  onDone: () => void
  onRead: () => void
  onExit: () => void
}) {
  const audio = useRef<HTMLAudioElement>(null)
  const [progress, setProgress] = useState(0)
  const [failed, setFailed] = useState(false)
  const narrated = NARRATED_STOPS.has(stop.slug) && !failed
  // Each finished play-through starts a new round, which empties the progress bar.
  const [round, setRound] = useState(0)
  const [fast, setFast] = useState(!!startFast)
  // A timed story has no recording to wind back, so going back starts its bar again.
  const [again, setAgain] = useState(0)
  const back = () => {
    const player = audio.current
    if (!narrated || !player) setAgain((n) => n + 1)
    else {
      player.currentTime = Math.max(0, player.currentTime - 5)
      if (player.duration > 0) setProgress(player.currentTime / player.duration)
    }
    // Going back always carries on playing from there.
    if (!playing) onPlaying(true)
  }
  const finish = () => {
    setRound((r) => r + 1)
    setProgress(0)
    onDone()
  }

  // While the story plays, its photographs take turns.
  const slides = useMemo(() => {
    const fromStory = (body ?? []).flatMap((b) => (b.type === 'image' ? [b.src] : []))
    return fromStory.length ? fromStory : stop.hero ? [stop.hero] : []
  }, [body, stop.hero])
  const [slide, setSlide] = useState({ now: 0, before: -1 })
  useEffect(() => {
    if (!playing || slides.length < 2) return
    const timer = window.setInterval(() => setSlide((s) => ({ now: (s.now + 1) % slides.length, before: s.now })), SLIDE_SECONDS * 1000)
    return () => window.clearInterval(timer)
  }, [playing, slides.length])
  const shown = slide.now < slides.length ? slide.now : 0
  /** The viewer turns to another photograph by hand; allowed at any time. */
  const turn = (d: 1 | -1) => setSlide({ now: (shown + d + slides.length) % slides.length, before: shown })
  // Fetch the next photograph ahead of its turn, so the fade has something to fade to.
  useEffect(() => {
    const next = slides[(shown + 1) % slides.length]
    if (next && slides.length > 1) new Image().src = sized(next, 1000)
  }, [slides, shown])
  useEffect(() => {
    setProgress(0)
    setFailed(false)
  }, [stop.slug])
  useEffect(() => {
    const player = audio.current
    if (!player || !narrated) return
    let active = true
    if (playing) {
      player.play().catch(() => { if (active) onPlaying(false) })
    } else {
      player.pause()
    }
    return () => { active = false; player.pause() }
  }, [playing, narrated, onPlaying, stop.slug])
  useEffect(() => {
    const player = audio.current
    if (!player) return
    // Set both: starting playback resets the rate to the default.
    player.defaultPlaybackRate = fast ? FAST_PACE : PACE
    player.playbackRate = fast ? FAST_PACE : PACE
  }, [fast, narrated])

  return (
    <article className="view tour" style={trailVar(trail)}>
      {narrated && <audio key={stop.slug} ref={audio} src={`./narration/${stop.slug}.mp3`} onEnded={finish}
        onError={() => setFailed(true)}
        onTimeUpdate={(event) => {
          const player = event.currentTarget
          if (player.duration > 0) setProgress(player.currentTime / player.duration)
        }} />}
      <div className="tour__head">
        <AudioDial
          id={`${stop.slug}-${round}-${again}`}
          name={stop.name}
          dark={trail.id === 'yellow'}
          playing={playing}
          progress={progress}
          timed={!narrated}
          fast={fast}
          onToggle={() => {
            // Stopping a story also puts it back to the usual speed.
            if (playing) setFast(false)
            onPlaying(!playing)
          }}
          onBack={back}
          onFast={() => setFast((f) => !f)}
          onTimedEnd={finish}
        />
        <p className="tour__label">Guided tour · {trail.name}</p>
        <p className="badge">
          <span className="num">{stop.number}</span>
          Stop {stop.number} of {stops.length}
        </p>
        <FitTitle text={stop.title} />
        {(stop.address || stop.subtitle) && <p className="facts">{[stop.address, stop.subtitle].filter(Boolean).join(' · ')}</p>}
        <button className="tour__exit" onClick={onExit}>× End narrative</button>
      </div>
      {slides.length > 0 && (
        <div className={playing ? 'tour__photo' : 'tour__photo tour__photo--browse'}>
          {slide.before >= 0 && slide.before < slides.length && <img key={`was-${slide.before}`} src={sized(slides[slide.before], 1000)} alt="" />}
          <img key={shown} className="tour__slide" src={sized(slides[shown], 1000)} alt="" />
          {slides.length > 1 && (
            <>
              <button className="tour__nav tour__nav--prev" onClick={() => turn(-1)} aria-label="Previous photograph">‹</button>
              <button className="tour__nav tour__nav--next" onClick={() => turn(1)} aria-label="Next photograph">›</button>
              <span className="hero__count">{shown + 1} / {slides.length}</span>
            </>
          )}
        </div>
      )}
      {round > 0 && !playing && slides.length > 1 && (
        <p className="tour__more">The story has finished. Use the arrows to see all {slides.length} photographs.</p>
      )}
      <p className="tour__summary">{excerpt(stop.summary, 420)}</p>
      <button className="tour__read" onClick={onRead}>Read the full story →</button>
    </article>
  )
}
