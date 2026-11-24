import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import data from './data/trail.json'
import geoData from './data/geo.json'
import { Fireworks } from './Fireworks'
import { Intro } from './Intro'
import { MapView } from './MapView'
import { HomePanel, StopPanel, TourCard, TrailPanel } from './Panels'
import { formatDistance, nearest } from './lib/geo'
import { parseHash, toHash, type Route } from './lib/route'
import type { Geo, LngLat, Stop, Trail } from './types'

const trails = data.trails as Trail[]
const stops = data.stops as Stop[]
const query = new URLSearchParams(location.search)
const editing = query.has('edit')
const SEEN = 'soct-intro-seen'
const trailColors = trails.map((t) => t.color)

function useRoute(): [Route, (r: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  const go = useCallback((r: Route) => {
    location.hash = toHash(r)
  }, [])
  return [route, go]
}

export function App() {
  const [route, go] = useRoute()
  const [geo, setGeo] = useState<Geo>(geoData as unknown as Geo)
  const [near, setNear] = useState<{ stop: Stop; metres: number } | null>(null)
  // The opening plays once per visit, and never for someone arriving at a plaque's own link.
  const [intro, setIntro] = useState(
    () => route.view === 'home' && !editing && !query.has('nointro') && !sessionStorage.getItem(SEEN),
  )
  const [tour, setTour] = useState<{ playing: boolean } | null>(null)
  const [completed, setCompleted] = useState<string | null>(null)
  const [fireworks, setFireworks] = useState(0)
  const panel = useRef<HTMLElement>(null)

  const stop = route.view === 'stop' ? stops.find((s) => s.slug === route.slug) : undefined
  const trailId = route.view === 'trail' ? route.trail : stop?.trail ?? null
  const trail = trails.find((t) => t.id === trailId)
  const trailStops = useMemo(() => stops.filter((s) => s.trail === trailId), [trailId])
  const touring = !!tour && !!stop

  useEffect(() => {
    panel.current?.scrollTo({ top: 0 })
    document.title = `${stop?.title ?? trail?.name ?? 'Spirit of Community Trail'} · Delano, Minnesota`
  }, [stop, trail])

  // Leaving the stops ends a tour; leaving a finished trail clears its banner.
  useEffect(() => {
    if (route.view !== 'stop') setTour(null)
    if (completed && trailId !== completed) setCompleted(null)
  }, [route, trailId, completed])

  const onLocate = useCallback((at: LngLat) => {
    const hit = nearest(at, stops, (s) => geo.stops[s.slug]?.lngLat)
    // Only worth saying when the visitor is actually in town.
    setNear(hit && hit.metres < 3000 ? { stop: hit.item, metres: hit.metres } : null)
  }, [geo])

  const onMoveStop = useCallback((slug: string, lngLat: LngLat) => {
    setGeo((g) => ({ ...g, stops: { ...g.stops, [slug]: { lngLat, approx: false } } }))
  }, [])

  const exportGeo = () => {
    const blob = new Blob([JSON.stringify(geo, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'geo.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const begin = () => {
    sessionStorage.setItem(SEEN, '1')
    setIntro(false)
  }

  const startTour = () => {
    if (!trailStops.length) return
    setCompleted(null)
    setTour({ playing: true })
    go({ view: 'stop', slug: trailStops[0].slug })
  }

  const tourStep = (d: 1 | -1) => {
    if (!stop || !trail) return
    const next = trailStops[trailStops.findIndex((s) => s.slug === stop.slug) + d]
    if (next) return go({ view: 'stop', slug: next.slug })
    if (d === 1) {
      setTour(null)
      setCompleted(trail.id)
      setFireworks((n) => n + 1)
      go({ view: 'trail', trail: trail.id })
    }
  }

  return (
    <div className={`app ${intro ? 'app--intro' : ''}`}>
      <MapView
        trails={trails}
        stops={stops}
        geo={geo}
        activeTrail={trail?.id ?? null}
        activeStop={stop?.slug ?? null}
        intro={intro}
        orbit={touring}
        editing={editing}
        onSelectStop={(slug) => go({ view: 'stop', slug })}
        onLocate={onLocate}
        onMoveStop={onMoveStop}
      />

      <nav className="chips" aria-label="Trails">
        <button className={`chip ${!trail ? 'chip--on' : ''}`} onClick={() => go({ view: 'home' })}>All</button>
        {trails.map((t) => (
          <button
            key={t.id}
            className={`chip ${trail?.id === t.id ? 'chip--on' : ''}`}
            style={{ '--trail': t.color } as React.CSSProperties}
            onClick={() => go({ view: 'trail', trail: t.id })}
          >
            <i className="dot" />
            {t.name.replace(' Trail', '')}
          </button>
        ))}
      </nav>

      {near && !editing && (
        <button className="near" onClick={() => { go({ view: 'stop', slug: near.stop.slug }); setNear(null) }}>
          <span>Nearest plaque</span>
          <strong>{near.stop.name}</strong>
          <em>{formatDistance(near.metres)} away</em>
        </button>
      )}

      {editing && (
        <div className="editbar">
          <strong>Pin editor</strong>
          <span>Drag any pin to its real spot. Dashed pins are estimates.</span>
          <button onClick={exportGeo}>Download geo.json</button>
        </div>
      )}

      <aside className="panel" ref={panel}>
        {stop && trail && tour ? (
          <TourCard
            key={`tour-${stop.slug}`}
            stop={stop}
            trail={trail}
            total={trailStops.length}
            playing={tour.playing}
            onPlaying={(playing) => setTour({ playing })}
            onStep={tourStep}
            onDone={() => tourStep(1)}
            onRead={() => setTour(null)}
            onExit={() => go({ view: 'trail', trail: trail.id })}
          />
        ) : stop && trail ? (
          <StopPanel key={stop.slug} stop={stop} trail={trail} siblings={trailStops} placed={geo.stops[stop.slug]} go={go} />
        ) : trail ? (
          <TrailPanel
            key={trail.id}
            trail={trail}
            stops={trailStops}
            go={go}
            completed={completed === trail.id}
            nextTrail={trails[(trails.indexOf(trail) + 1) % trails.length]}
            onTour={startTour}
          />
        ) : (
          <HomePanel key="home" trails={trails} stops={stops} go={go} onReplay={() => setIntro(true)} />
        )}
      </aside>

      <Fireworks show={fireworks} bursts={10} colors={trailColors} />
      {intro && <Intro onBegin={begin} colors={trailColors} />}
    </div>
  )
}
