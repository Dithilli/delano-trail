import { useEffect, useRef, useState } from 'react'
import type { ExpressionSpecification } from 'maplibre-gl'
import { AttributionControl, GeolocateControl, Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { mapStyle } from './mapStyle'
import { bounds, distance } from './lib/geo'
import type { Geo, LngLat, Stop, Trail } from './types'

setWorkerUrl(workerUrl)

const DOWNTOWN: LngLat = [-93.7885, 45.0425]
const CLEAR = 'rgba(0,0,0,0)'
const INK = '#2b2923'
/** Below this zoom, stops shrink to dots and the trail lines carry the map. */
const FAR_ZOOM = 15.7
const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

interface Props {
  trails: Trail[]
  stops: Stop[]
  geo: Geo
  activeTrail: string | null
  activeStop: string | null
  /** The opening card is up: hold the camera high above Minnesota. */
  intro: boolean
  /** Slowly circle the selected stop (guided tour). */
  orbit: boolean
  editing: boolean
  /** Side-panel layout (desktop) rather than the phone's pull-up sheet. */
  wide: boolean
  /** Pixels at the bottom of the map hidden by the sheet. */
  bottomInset: number
  onMapTap: () => void
  onSelectTrail: (id: string) => void
  onSelectStop: (slug: string) => void
  onLocate: (at: LngLat) => void
  onMoveStop: (slug: string, at: LngLat) => void
}

/** Keep targets clear of the chips on top and, on a phone, the sheet below. */
function paddingFor(wide: boolean, bottomInset: number) {
  return wide ? { top: 100, right: 70, bottom: 70, left: 70 } : { top: 76, right: 34, bottom: bottomInset + 28, left: 34 }
}

export function MapView(props: Props) {
  const { trails, stops, geo, activeTrail, activeStop, intro, orbit, editing, wide, bottomInset } = props
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markers = useRef(new Map<string, Marker>())
  const handlers = useRef(props)
  handlers.current = props
  const padding = () => paddingFor(handlers.current.wide, handlers.current.bottomInset)
  // The camera move in progress, so a sheet that settles mid-flight can carry it on instead of cutting it short.
  const flight = useRef<{ target: object; until: number; curve: number } | null>(null)
  const fly = (target: object, duration: number, curve: number) => {
    flight.current = { target, until: performance.now() + duration, curve }
    mapRef.current?.flyTo({ ...target, padding: padding(), duration, curve, essential: true })
  }
  const [loaded, setLoaded] = useState(false)
  // Pins and trails stay hidden until the opening flight lands.
  const [revealed, setRevealed] = useState(!intro)
  // Zoomed out, the map reads as a transit diagram: bold lines, stops as small dots.
  const [far, setFar] = useState(true)
  const wasIntro = useRef(intro)
  const anims = useRef(new Map<string, number>())

  useEffect(() => {
    const map = new MapLibreMap({
      container: el.current!,
      style: mapStyle,
      center: DOWNTOWN,
      zoom: intro ? 5.2 : 15.2,
      pitch: intro ? 0 : 45,
      bearing: intro ? 0 : -12,
      minZoom: 4,
      maxZoom: 19.5,
      maxPitch: 70,
      attributionControl: false,
    })
    mapRef.current = map
    ;(window as unknown as { __map?: MapLibreMap }).__map = map
    // On a phone the bottom of the map is under the sheet, so controls sit up top.
    const corner = wide ? 'bottom-right' : 'top-right'
    const locate = new GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true })
    locate.on('geolocate', (e) => handlers.current.onLocate([e.coords.longitude, e.coords.latitude]))
    if (wide) map.addControl(new NavigationControl({ visualizePitch: true }), corner)
    map.addControl(locate, corner)
    if (!wide) map.addControl(new NavigationControl({ visualizePitch: true, showZoom: false }), corner)
    map.addControl(new AttributionControl({ compact: true }), wide ? 'bottom-right' : 'top-left')
    map.on('click', (e) => {
      if ((e.originalEvent.target as HTMLElement | null)?.closest?.('.pin-wrap')) return
      // A tap on (or near) a coloured line picks that trail.
      const r = 12
      const layers = trails.map((t) => `trail-line-${t.id}`).filter((id) => map.getLayer(id))
      const hit = map.queryRenderedFeatures([[e.point.x - r, e.point.y - r], [e.point.x + r, e.point.y + r]], { layers })[0]
      if (hit) handlers.current.onSelectTrail(hit.layer.id.replace('trail-line-', ''))
      else handlers.current.onMapTap()
    })
    const onZoom = () => setFar(map.getZoom() < FAR_ZOOM)
    map.on('zoom', onZoom)
    onZoom()

    map.on('load', () => {
      for (const t of trails) {
        map.addSource(`trail-${t.id}`, {
          type: 'geojson',
          lineMetrics: true, // needed for line-gradient, which is how a trail "draws itself"
          data: {
            type: 'FeatureCollection',
            features: (geo.trails[t.id] ?? []).map((line) => ({
              type: 'Feature' as const,
              properties: {},
              geometry: { type: 'LineString' as const, coordinates: line },
            })),
          },
        })
        // Drawn like lines on a transit map: thick, ink-edged, above the buildings
        // so nothing hides them, with the trail's name running alongside.
        const width = (extra: number) => ['interpolate', ['exponential', 1.6], ['zoom'], 13, 4 + extra, 16, 13 + extra, 19, 38 + extra] as unknown as number
        const hidden: ExpressionSpecification = ['step', ['line-progress'], CLEAR, 0, CLEAR]
        map.addLayer({
          id: `trail-glow-${t.id}`, type: 'line', source: `trail-${t.id}`,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': t.color, 'line-width': width(22), 'line-blur': 16, 'line-opacity': 0 },
        }, 'street-name')
        map.addLayer({
          id: `trail-case-${t.id}`, type: 'line', source: `trail-${t.id}`,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': INK, 'line-width': width(3.5), 'line-gradient': hidden },
        }, 'street-name')
        map.addLayer({
          id: `trail-line-${t.id}`, type: 'line', source: `trail-${t.id}`,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': t.color, 'line-width': width(0), 'line-gradient': hidden },
        }, 'street-name')
        map.addLayer({
          id: `trail-name-${t.id}`, type: 'symbol', source: `trail-${t.id}`, maxzoom: 18,
          layout: {
            visibility: 'none',
            'symbol-placement': 'line',
            'symbol-spacing': 220,
            'text-field': t.name.toUpperCase(),
            'text-font': ['Noto Sans Bold'],
            'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 17, 14],
            'text-letter-spacing': 0.14,
            'text-offset': [0, 1.9],
          },
          paint: { 'text-color': INK, 'text-halo-color': '#f4f0e1', 'text-halo-width': 2 },
        })
      }
      setLoaded(true)
    })

    return () => {
      for (const id of anims.current.values()) cancelAnimationFrame(id)
      markers.current.clear()
      map.remove()
      mapRef.current = null
    }
    // Trails and base geometry are static for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Animate a trail line growing from its start. */
  function draw(trail: Trail, duration: number, delay = 0) {
    const map = mapRef.current
    if (!map) return
    const layer = `trail-line-${trail.id}`
    const paint = (t: number) => {
      for (const [id, color] of [[`trail-case-${trail.id}`, INK], [layer, trail.color]] as const) {
        if (!map.getLayer(id)) continue
        map.setPaintProperty(id, 'line-gradient', t >= 1
          ? ['interpolate', ['linear'], ['line-progress'], 0, color, 1, color]
          : t <= 0.001 ? ['step', ['line-progress'], CLEAR, 0, CLEAR] : ['step', ['line-progress'], color, t, CLEAR])
      }
      if (t >= 1 && map.getLayer(`trail-name-${trail.id}`)) map.setLayoutProperty(`trail-name-${trail.id}`, 'visibility', 'visible')
    }
    cancelAnimationFrame(anims.current.get(layer) ?? 0)
    if (calm() || duration === 0) return void paint(1)
    paint(0)
    const start = performance.now() + delay
    const tick = (now: number) => {
      if (!mapRef.current?.getLayer(layer)) return
      const t = Math.min(1, Math.max(0, (now - start) / duration))
      if (t >= 1) return void paint(1)
      paint(1 - (1 - t) ** 3)
      anims.current.set(layer, requestAnimationFrame(tick))
    }
    anims.current.set(layer, requestAnimationFrame(tick))
  }

  /** Replay the drop-in for a set of pins, staggered. */
  function drop(slugs: string[], step = 55) {
    slugs.forEach((slug, i) => {
      const pin = markers.current.get(slug)?.getElement().firstElementChild as HTMLElement | null
      if (!pin) return
      pin.classList.remove('pin--drop')
      void pin.offsetWidth
      pin.style.animationDelay = `${i * step}ms`
      pin.classList.add('pin--drop')
    })
  }

  // Markers: one numbered pin per stop.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded) return
    const color = new Map(trails.map((t) => [t.id, t.color]))
    for (const stop of stops) {
      const at = geo.stops[stop.slug]
      if (!at) continue
      let marker = markers.current.get(stop.slug)
      if (!marker) {
        const wrap = document.createElement('div')
        wrap.className = 'pin-wrap'
        const pin = document.createElement('button')
        pin.type = 'button'
        pin.className = 'pin'
        pin.textContent = String(stop.number)
        pin.style.setProperty('--trail', color.get(stop.trail) ?? '#666')
        pin.setAttribute('aria-label', `${stop.name}, ${stop.trail} trail stop ${stop.number}`)
        pin.title = stop.name
        pin.addEventListener('click', (e) => {
          e.stopPropagation()
          handlers.current.onSelectStop(stop.slug)
        })
        wrap.append(pin)
        const m = new Marker({ element: wrap, draggable: editing }).setLngLat(at.lngLat).addTo(map)
        m.on('dragend', () => {
          const p = m.getLngLat()
          handlers.current.onMoveStop(stop.slug, [+p.lng.toFixed(6), +p.lat.toFixed(6)])
        })
        markers.current.set(stop.slug, m)
        marker = m
      }
      marker.setLngLat(at.lngLat)
      const wrap = marker.getElement()
      wrap.classList.toggle('pin-wrap--dim', activeTrail !== null && stop.trail !== activeTrail)
      wrap.classList.toggle('pin-wrap--lit', stop.trail === activeTrail)
      wrap.classList.toggle('pin-wrap--active', stop.slug === activeStop)
      wrap.classList.toggle('pin-wrap--approx', editing && at.approx)
    }
  }, [loaded, stops, trails, geo, activeTrail, activeStop, editing])

  // The reveal: every trail draws, pins fall outward from downtown.
  useEffect(() => {
    if (!loaded || !revealed) return
    trails.forEach((t, i) => draw(t, 1600, i * 140))
    const byDistance = stops
      .filter((s) => geo.stops[s.slug])
      .sort((a, b) => distance(DOWNTOWN, geo.stops[a.slug].lngLat) - distance(DOWNTOWN, geo.stops[b.slug].lngLat))
    drop(byDistance.map((s) => s.slug), 22)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, revealed])

  // Choosing a trail: it redraws and glows, its pins drop again, the rest fade back.
  const firstTrailRun = useRef(true)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded) return
    for (const t of trails) {
      const on = activeTrail === t.id
      const fade = activeTrail && !on ? 0.22 : 1
      map.setPaintProperty(`trail-line-${t.id}`, 'line-opacity', fade)
      map.setPaintProperty(`trail-case-${t.id}`, 'line-opacity', fade)
      map.setPaintProperty(`trail-name-${t.id}`, 'text-opacity', fade)
      map.setPaintProperty(`trail-glow-${t.id}`, 'line-opacity', on ? 0.45 : 0)
    }
    if (firstTrailRun.current) {
      firstTrailRun.current = false
      return
    }
    const trail = trails.find((t) => t.id === activeTrail)
    if (trail && revealed && !activeStop) {
      draw(trail, 1300)
      drop(stops.filter((s) => s.trail === trail.id).map((s) => s.slug), 70)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, activeTrail])

  // Replaying the opening: back up into the sky, pins and trails away.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded || !intro || wasIntro.current) return
    wasIntro.current = true
    setRevealed(false)
    map.stop()
    map.jumpTo({ center: DOWNTOWN, zoom: 5.2, pitch: 0, bearing: 0 })
    for (const t of trails) {
      cancelAnimationFrame(anims.current.get(`trail-line-${t.id}`) ?? 0)
      for (const id of [`trail-line-${t.id}`, `trail-case-${t.id}`]) map.setPaintProperty(id, 'line-gradient', ['step', ['line-progress'], CLEAR, 0, CLEAR])
      map.setLayoutProperty(`trail-name-${t.id}`, 'visibility', 'none')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, intro])

  // Camera follows the selection.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded || editing || intro) return
    const opening = wasIntro.current
    wasIntro.current = false
    const still = calm()
    const land = () => setRevealed(true)

    const stop = activeStop ? stops.find((s) => s.slug === activeStop) : undefined
    if (stop && geo.stops[stop.slug]) {
      // Come in from the angle the map is already at, so picking a stop reads as
      // a zoom rather than a swing; between neighbouring stops it is a plain glide.
      const at = geo.stops[stop.slug].lngLat
      const target = { center: at, zoom: 17.9, pitch: 62, bearing: opening ? -12 : map.getBearing(), padding: padding() }
      const close = map.getZoom() > 16.5 && distance([map.getCenter().lng, map.getCenter().lat], at) < 450
      if (still) map.jumpTo(target)
      else if (close) map.easeTo({ ...target, duration: 1500, essential: true })
      else fly(target, opening ? 6000 : 2200, 1.1)
      land()
      return
    }

    const shown = stops.filter((s) => !activeTrail || s.trail === activeTrail)
    const pts = [
      ...shown.map((s) => geo.stops[s.slug]?.lngLat).filter((p): p is LngLat => !!p),
      ...Object.entries(geo.trails).filter(([id]) => !activeTrail || id === activeTrail).flatMap(([, lines]) => lines.flat()),
    ]
    const box = bounds(pts)
    if (!box) return
    // cameraForBounds adds its padding to the map's own, so set the map's padding
    // and ask with none; passing it again would count the sheet twice.
    map.setPadding(padding())
    const cam = map.cameraForBounds(box, { maxZoom: 17.6 })
    if (!cam) return
    const target = { center: cam.center, zoom: (cam.zoom ?? 15) - 0.25, pitch: activeTrail ? 50 : 42, bearing: activeTrail ? 14 : -12 }
    if (still) {
      map.jumpTo(target)
      land()
    } else if (opening) {
      // The opening shot: fall out of the sky onto downtown.
      fly(target, 6500, 1.6)
      window.setTimeout(land, 4300)
    } else {
      fly(target, 1800, 1.2)
    }
  }, [loaded, activeTrail, activeStop, stops, geo, editing, intro])

  // Guided tour: circle the stop until something else happens.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded || !orbit || !activeStop || calm()) return
    let frame = 0
    let last = 0
    let running = false
    const spin = (now: number) => {
      if (last) map.setBearing(map.getBearing() + ((now - last) / 1000) * 5)
      last = now
      frame = requestAnimationFrame(spin)
    }
    const start = () => {
      if (running) return
      running = true
      frame = requestAnimationFrame(spin)
    }
    const timer = window.setTimeout(start, 2600) // after the fly-in
    const halt = () => cancelAnimationFrame(frame)
    map.on('dragstart', halt)
    map.on('wheel', halt)
    return () => {
      window.clearTimeout(timer)
      cancelAnimationFrame(frame)
      map.off('dragstart', halt)
      map.off('wheel', halt)
    }
  }, [loaded, orbit, activeStop])

  useEffect(() => {
    for (const m of markers.current.values()) m.setDraggable(editing)
  }, [editing, loaded])

  // The sheet moved: slide the map's centre of attention to the part still showing.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded || intro || wide) return
    const left = (flight.current?.until ?? 0) - performance.now()
    if (flight.current && left > 350) map.flyTo({ ...flight.current.target, padding: padding(), duration: left, curve: flight.current.curve, essential: true })
    else map.easeTo({ padding: padding(), duration: 350 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bottomInset, wide, loaded])

  // MapLibre owns the inner element's class list, so our own classes live on a wrapper.
  return (
    <div className={`map ${revealed ? '' : 'map--veiled'} ${far && !editing ? 'map--far' : ''}`}>
      <div ref={el} className="map__canvas" aria-label="Map of the Spirit of Community Trail" />
    </div>
  )
}
