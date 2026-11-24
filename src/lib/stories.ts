import { useEffect, useState } from 'react'
import type { Stories } from '../types'

// One file per trail, fetched the first time that trail is opened.
const loaders = import.meta.glob<{ default: Stories }>('../data/stories/*.json')
const cache = new Map<string, Promise<Stories>>()

export function loadStories(trail: string): Promise<Stories> {
  let hit = cache.get(trail)
  if (!hit) {
    const load = loaders[`../data/stories/${trail}.json`]
    hit = load ? load().then((m) => m.default) : Promise.resolve({})
    hit.catch(() => cache.delete(trail)) // let a failed fetch (bad signal) be retried
    cache.set(trail, hit)
  }
  return hit
}

/** The stories for a trail: undefined while loading, null if they could not be fetched. */
export function useStories(trail: string | null): Stories | null | undefined {
  const [state, setState] = useState<{ trail: string; stories: Stories | null } | null>(null)
  useEffect(() => {
    if (!trail) return
    let live = true
    loadStories(trail).then(
      (stories) => live && setState({ trail, stories }),
      () => live && setState({ trail, stories: null }),
    )
    return () => {
      live = false
    }
  }, [trail])
  return state && state.trail === trail ? state.stories : undefined
}
