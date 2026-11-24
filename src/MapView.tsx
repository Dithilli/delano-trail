import { useEffect, useRef } from 'react'
import { GeolocateControl, Map as MapLibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import 'maplibre-gl/dist/maplibre-gl.css'
import { mapStyle } from './mapStyle'
import { bounds } from './lib/geo'
import type { Geo, LngLat, Stop, Trail } from './types'

setWorkerUrl(workerUrl)

const DOWNTOWN: LngLat = [-93.7885, 45.0425]

interface Props {
  trails: Trail[]
  stops: Stop[]
  geo: Geo
  activeTrail: string | null
  activeStop: string | null
  editing: boolean
  onSelectStop: (slug: string) => void
  onLocate: (at: LngLat) => void
  onMoveStop: (slug: string, at: LngLat) => void
}

/** Panel covers the left on desktop and the bottom on phones; keep targets clear of it. */
function padding() {
  const wide = window.matchMedia('(min-width: 900px)').matches
  return wide ? { top: 90, right: 60, bottom: 60, left: 60 } : { top: 80, right: 40, bottom: 40, left: 40 }
}

export function MapView({ trails, stops, geo, activeTrail, activeStop, editing, onSelectStop, onLocate, onMoveStop }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markers = useRef(new Map<string, Marker>())
  const handlers = useRef({ onSelectStop, onLocate, onMoveStop })
  handlers.current = { onSelectStop, onLocate, onMoveStop }

  useEffect(() => {
    const map = new MapLibreMap({
      container: el.current!,
      style: mapStyle,
      center: DOWNTOWN,
      zoom: 15.2,
      minZoom: 11,
      maxZoom: 19,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    ;(window as unknown as { __map?: MapLibreMap }).__map = map
    map.addControl(new NavigationControl({ showCompass: false }), 'bottom-right')
    const locate = new GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true })
    locate.on('geolocate', (e) => handlers.current.onLocate([e.coords.longitude, e.coords.latitude]))
    map.addControl(locate, 'bottom-right')

    map.on('load', () => {
      map.addSource('trails', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: trails.flatMap((t) =>
            (geo.trails[t.id] ?? []).map((line) => ({
              type: 'Feature' as const,
              properties: { trail: t.id, color: t.color },
              geometry: { type: 'LineString' as const, coordinates: line },
            })),
          ),
        },
      })
      map.addLayer({
        id: 'trail-line', type: 'line', source: 'trails',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 13, 3, 16, 9, 19, 26],
          'line-opacity': 0.75,
        },
      }, 'road-label')
    })

    return () => {
      markers.current.clear()
      map.remove()
      mapRef.current = null
    }
    // Trails and geometry are static for the life of the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Markers: one numbered pin per stop.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const color = new Map(trails.map((t) => [t.id, t.color]))
    for (const stop of stops) {
      const at = geo.stops[stop.slug]
      if (!at) continue
      let marker = markers.current.get(stop.slug)
      if (!marker) {
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
        marker = new Marker({ element: pin, draggable: editing }).setLngLat(at.lngLat).addTo(map)
        marker.on('dragend', () => {
          const p = marker!.getLngLat()
          handlers.current.onMoveStop(stop.slug, [+p.lng.toFixed(6), +p.lat.toFixed(6)])
        })
        markers.current.set(stop.slug, marker)
      }
      marker.setDraggable(editing)
      marker.setLngLat(at.lngLat)
      const pin = marker.getElement()
      pin.classList.toggle('pin--dim', activeTrail !== null && stop.trail !== activeTrail)
      pin.classList.toggle('pin--active', stop.slug === activeStop)
      pin.classList.toggle('pin--approx', editing && at.approx)
    }
  }, [stops, trails, geo, activeTrail, activeStop, editing])

  // Trail emphasis.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => {
      if (!map.getLayer('trail-line')) return
      map.setPaintProperty('trail-line', 'line-opacity', activeTrail ? ['case', ['==', ['get', 'trail'], activeTrail], 0.9, 0.15] : 0.75)
    }
    if (map.isStyleLoaded() && map.getLayer('trail-line')) apply()
    else map.once('idle', apply)
  }, [activeTrail])

  // Camera follows the selection.
  useEffect(() => {
    const map = mapRef.current
    if (!map || editing) return
    if (activeStop && geo.stops[activeStop]) {
      map.easeTo({ center: geo.stops[activeStop].lngLat, zoom: Math.max(map.getZoom(), 17), padding: padding(), duration: 700 })
      return
    }
    const shown = stops.filter((s) => !activeTrail || s.trail === activeTrail)
    const pts = [
      ...shown.map((s) => geo.stops[s.slug]?.lngLat).filter((p): p is LngLat => !!p),
      ...Object.entries(geo.trails).filter(([id]) => !activeTrail || id === activeTrail).flatMap(([, lines]) => lines.flat()),
    ]
    const box = bounds(pts)
    if (box) map.fitBounds(box, { padding: padding(), maxZoom: 17.5, duration: 700 })
  }, [activeTrail, activeStop, stops, geo, editing])

  return <div ref={el} className="map" aria-label="Map of the Spirit of Community Trail" />
}
