import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import data from './data/trail.json'
import geoData from './data/geo.json'
import { MapView } from './MapView'
import { HomePanel, StopPanel, TrailPanel } from './Panels'
import { formatDistance, nearest } from './lib/geo'
import { parseHash, toHash, type Route } from './lib/route'
import type { Geo, LngLat, Stop, Trail } from './types'

const trails = data.trails as Trail[]
const stops = data.stops as Stop[]
const editing = new URLSearchParams(location.search).has('edit')

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
  const panel = useRef<HTMLElement>(null)

  const stop = route.view === 'stop' ? stops.find((s) => s.slug === route.slug) : undefined
  const trailId = route.view === 'trail' ? route.trail : stop?.trail ?? null
  const trail = trails.find((t) => t.id === trailId)
  const trailStops = useMemo(() => stops.filter((s) => s.trail === trailId), [trailId])

  useEffect(() => {
    panel.current?.scrollTo({ top: 0 })
    document.title = `${stop?.title ?? trail?.name ?? 'Spirit of Community Trail'} · Delano, Minnesota`
  }, [stop, trail])

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

  return (
    <div className="app">
      <MapView
        trails={trails}
        stops={stops}
        geo={geo}
        activeTrail={trail?.id ?? null}
        activeStop={stop?.slug ?? null}
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
        {stop && trail ? (
          <StopPanel stop={stop} trail={trail} siblings={trailStops} placed={geo.stops[stop.slug]} go={go} />
        ) : trail ? (
          <TrailPanel trail={trail} stops={trailStops} go={go} />
        ) : (
          <HomePanel trails={trails} stops={stops} go={go} />
        )}
      </aside>
    </div>
  )
}
