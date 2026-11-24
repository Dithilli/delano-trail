export type Route = { view: 'home' } | { view: 'trail'; trail: string } | { view: 'stop'; slug: string }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  if (parts[0] === 'trail' && parts[1]) return { view: 'trail', trail: parts[1] }
  if (parts[0] === 'stop' && parts[1]) return { view: 'stop', slug: parts[1] }
  return { view: 'home' }
}

export function toHash(route: Route): string {
  if (route.view === 'trail') return `#/trail/${encodeURIComponent(route.trail)}`
  if (route.view === 'stop') return `#/stop/${encodeURIComponent(route.slug)}`
  return '#/'
}
