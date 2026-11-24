/** Squarespace's CDN resizes on request: ?format=<width>w. */
export function sized(src: string, width: 100 | 300 | 500 | 750 | 1000 | 1500 | 2500): string {
  return src.includes('squarespace-cdn.com') ? `${src}?format=${width}w` : src
}

const CDN = 'https://images.squarespace-cdn.com/content/v1/55648dcee4b0b7fb3090f7e7'
export const PRINTED_MAP = `${CDN}/749ae777-2e96-462f-9241-241c138239d3/DSCT_Map+8.5x11_092926-72dpi.jpg`
