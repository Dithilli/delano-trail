import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import data from './data/trail.json'
import geoData from './data/geo.json'
import { Intro } from './Intro'
import { MapView } from './MapView'
import { HomePanel, StopPanel, TourCard, TrailPanel } from './Panels'
import { Sheet } from './Sheet'
import { StopSearch } from './StopSearch'
import { formatDistance, nearest } from './lib/geo'
import { parseHash, toHash, type Route } from './lib/route'
import { useStories } from './lib/stories'
import { sheetVisible, useViewport } from './lib/viewport'
import type { Geo, LngLat, Snap, Stop, Trail } from './types'

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
  const [tour, setTour] = useState<{ playing: boolean; fast?: boolean } | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const { wide, height } = useViewport()
  const [searchOpen, setSearchOpen] = useState(false)
  const [snap, setSnap] = useState<Snap>('half')

  const stop = route.view === 'stop' ? stops.find((s) => s.slug === route.slug) : undefined
  const trailId = route.view === 'trail' ? route.trail : stop?.trail ?? null
  const trail = trails.find((t) => t.id === trailId)
  const trailStops = useMemo(() => stops.filter((s) => s.trail === trailId), [trailId])
  const stories = useStories(trailId)
  const body = stop ? (stories ? stories[stop.slug] ?? [] : stories) : undefined
  // The map keeps its subject in the strip above the sheet; a full sheet counts as half.
  const visible = wide ? 0 : sheetVisible(snap, height)
  const bottomInset = wide ? 0 : sheetVisible(snap === 'full' ? 'half' : snap, height)

  useEffect(() => {
    panel.current?.scrollTo({ top: 0 })
    // Every new view opens with the map and the story sharing the screen; while a
    // story is being narrated the panel stays up, so its photographs can be seen.
    setSnap(stop && tour?.playing ? 'full' : 'half')
    document.title = `${stop?.title ?? trail?.name ?? 'Spirit of Community Trail'} · Delano, Minnesota`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop, trail])

  // Leaving the stops ends a story.
  useEffect(() => {
    if (route.view !== 'stop') setTour(null)
  }, [route])

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

  const changePlayback = useCallback((playing: boolean) => {
    setTour({ playing })
    if (playing) setSnap('full')
  }, [])

  return (
    <div className={`app ${intro ? 'app--intro' : ''}`} style={{ '--sheet': `${visible}px` } as React.CSSProperties}>
      <MapView
        trails={trails}
        stops={stops}
        geo={geo}
        activeTrail={trail?.id ?? null}
        activeStop={stop?.slug ?? null}
        intro={intro}
        editing={editing}
        wide={wide}
        bottomInset={bottomInset}
        onMapTap={() => setSnap((s) => (s === 'full' ? s : 'peek'))}
        onSelectTrail={(id) => go({ view: 'trail', trail: id })}
        onSelectStop={(slug) => { setSnap('half'); go({ view: 'stop', slug }) }}
        onLocate={onLocate}
        onMoveStop={onMoveStop}
      />

      <nav className="chips" aria-label="Trails">
        <StopSearch stops={stops} trails={trails} onToggle={setSearchOpen} onSelect={(slug) => {
          setTour(null)
          setSnap('half')
          go({ view: 'stop', slug })
        }} />
        {route.view !== 'home' && <button className="chip chip--solid" onClick={() => go({ view: 'home' })}>All trails</button>}
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

      <Sheet wide={wide} height={height} snap={snap} onSnap={setSnap} scroller={panel}>
        {stop && trail && tour ? (
          <TourCard
            key={`tour-${stop.slug}`}
            stop={stop}
            trail={trail}
            stops={trailStops}
            body={body}
            playing={tour.playing && !searchOpen}
            startFast={tour.fast}
            onPlaying={changePlayback}
            onDone={() => setTour({ playing: false })}
            onRead={() => { setTour(null); setSnap('full') }}
            onExit={() => go({ view: 'trail', trail: trail.id })}
          />
        ) : stop && trail ? (
          <StopPanel key={stop.slug} stop={stop} trail={trail} siblings={trailStops} body={body} go={go}
            onTour={(fast) => { setTour({ playing: true, fast }); setSnap('full'); panel.current?.scrollTo({ top: 0 }) }} />
        ) : trail ? (
          <TrailPanel
            key={trail.id}
            trail={trail}
            stops={trailStops}
            go={go}
            nextTrail={trails[(trails.indexOf(trail) + 1) % trails.length]}
          />
        ) : (
          <HomePanel key="home" trails={trails} stops={stops} go={go} onReplay={() => setIntro(true)} />
        )}
      </Sheet>

      {intro && <Intro onBegin={begin} colors={trailColors} />}
    </div>
  )
}
