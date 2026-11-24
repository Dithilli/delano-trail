import type { StyleSpecification } from 'maplibre-gl'

// A paper-and-ink basemap in the spirit of the printed trail map: cream ground,
// ink-outlined streets, quiet labels, so the coloured trails are the only colour.
const PAPER = '#f4f0e1'
const INK = '#3b382f'
const INK_SOFT = '#8d8774'
const STREET = '#fdfbf3'

const width = (z14: number, z18: number) =>
  ['interpolate', ['exponential', 1.6], ['zoom'], 12, z14 * 0.35, 14, z14, 18, z18] as unknown as number

const roadWidth = [
  'match', ['get', 'class'],
  ['motorway', 'trunk', 'primary'], 1.6,
  ['secondary', 'tertiary'], 1.25,
  ['minor'], 1,
  ['service', 'track'], 0.5,
  0.4,
]

export const mapStyle: StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
  },
  layers: [
    { id: 'paper', type: 'background', paint: { 'background-color': PAPER } },
    {
      id: 'green', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover',
      filter: ['in', ['get', 'class'], ['literal', ['grass', 'wood']]],
      paint: { 'fill-color': '#e7e8cd', 'fill-opacity': 0.7 },
    },
    {
      id: 'park', type: 'fill', source: 'openmaptiles', 'source-layer': 'park',
      paint: { 'fill-color': '#dfe5c2', 'fill-opacity': 0.8 },
    },
    {
      id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water',
      paint: { 'fill-color': '#cfdfdc', 'fill-outline-color': INK_SOFT },
    },
    {
      id: 'waterway', type: 'line', source: 'openmaptiles', 'source-layer': 'waterway',
      paint: { 'line-color': '#b9cfcc', 'line-width': width(1.5, 6) },
    },
    {
      id: 'building', type: 'fill', source: 'openmaptiles', 'source-layer': 'building', minzoom: 14,
      paint: { 'fill-color': '#ebe5cf', 'fill-outline-color': INK_SOFT, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 1] },
    },
    {
      // Buildings stand up once the camera tilts, like a paper model of downtown.
      id: 'building-3d', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 15,
      paint: {
        'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 5], 0, '#f2ecd8', 12, '#e2d7b8'],
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.6, ['coalesce', ['get', 'render_height'], 5]],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 0.92,
        'fill-extrusion-vertical-gradient': true,
      },
    },
    {
      id: 'path', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 14,
      filter: ['==', ['get', 'class'], 'path'],
      paint: { 'line-color': INK_SOFT, 'line-width': 1, 'line-dasharray': [2, 2] },
    },
    {
      id: 'road-casing', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation',
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['!', ['in', ['get', 'class'], ['literal', ['path', 'rail', 'transit', 'ferry']]]]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': INK,
        'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, ['*', 1.2, roadWidth], 14, ['*', 5, roadWidth], 18, ['*', 26, roadWidth]] as unknown as number,
      },
    },
    {
      id: 'road', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation',
      filter: ['all', ['==', ['geometry-type'], 'LineString'], ['!', ['in', ['get', 'class'], ['literal', ['path', 'rail', 'transit', 'ferry']]]]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': STREET,
        'line-width': ['interpolate', ['exponential', 1.6], ['zoom'], 12, ['*', 0.5, roadWidth], 14, ['*', 3.4, roadWidth], 18, ['*', 23, roadWidth]] as unknown as number,
      },
    },
    {
      id: 'rail', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation',
      filter: ['==', ['get', 'class'], 'rail'],
      paint: { 'line-color': INK, 'line-width': width(1.2, 3) },
    },
    {
      id: 'rail-ties', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 13,
      filter: ['==', ['get', 'class'], 'rail'],
      paint: { 'line-color': INK, 'line-width': width(5, 12), 'line-dasharray': [0.15, 1.2] },
    },
    {
      id: 'road-label', type: 'symbol', source: 'openmaptiles', 'source-layer': 'transportation_name', minzoom: 13.5,
      layout: {
        'symbol-placement': 'line',
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Italic'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 18, 15],
        'text-letter-spacing': 0.04,
      },
      paint: { 'text-color': INK, 'text-halo-color': STREET, 'text-halo-width': 1.6 },
    },
    {
      id: 'water-label', type: 'symbol', source: 'openmaptiles', 'source-layer': 'waterway', minzoom: 13,
      layout: {
        'symbol-placement': 'line',
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Italic'],
        'text-size': 13,
        'text-letter-spacing': 0.12,
      },
      paint: { 'text-color': '#5f8580', 'text-halo-color': PAPER, 'text-halo-width': 1.4 },
    },
    {
      id: 'place-label', type: 'symbol', source: 'openmaptiles', 'source-layer': 'place', maxzoom: 13.5,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Bold'],
        'text-size': 14,
        'text-transform': 'uppercase',
        'text-letter-spacing': 0.14,
      },
      paint: { 'text-color': INK, 'text-halo-color': PAPER, 'text-halo-width': 1.6 },
    },
  ],
}
