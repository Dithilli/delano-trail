export type Block =
  | { type: 'text'; html: string }
  | { type: 'image'; src: string; w?: number; h?: number; alt?: string; href?: string }
  | { type: 'link'; href: string; label: string }
  | { type: 'video'; src: string }

export interface Stop {
  slug: string
  /** Title as written on the stop's own page. */
  title: string
  /** Short name as printed on the plaque list. */
  name: string
  address: string | null
  subtitle: string | null
  summary: string
  hero: string | null
  /** How many photographs the story has (the story itself loads per trail). */
  photos: number
  sourceUrl: string
  trail: string
  number: number
  nonprofit: boolean
}

export interface Trail {
  id: string
  name: string
  area: string
  color: string
}

export type LngLat = [number, number]

export interface Geo {
  /** approx = placed by estimate rather than from a street address; needs local review. */
  stops: Record<string, { lngLat: LngLat; approx: boolean }>
  trails: Record<string, LngLat[][]>
}

/** Story bodies for one trail, keyed by stop slug. */
export type Stories = Record<string, Block[]>

/** How much of the pull-up sheet is showing on a phone. */
export type Snap = 'peek' | 'half' | 'full'
