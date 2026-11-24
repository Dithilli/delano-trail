/** Squarespace's CDN resizes on request: ?format=<width>w. */
export function sized(src: string, width: 100 | 300 | 500 | 750 | 1000 | 1500 | 2500): string {
  return src.includes('squarespace-cdn.com') ? `${src}?format=${width}w` : src
}

const CDN = 'https://images.squarespace-cdn.com/content/v1/55648dcee4b0b7fb3090f7e7'
/** The trail's bronze medallion, from the Historical Society's site. */
export const MEDALLION = `${CDN}/1f052903-f7c6-4e36-aa46-2a8f8f1ec786/DSCT_medallion+for+web..png?format=500w`
export const PRINTED_MAP = `${CDN}/749ae777-2e96-462f-9241-241c138239d3/DSCT_Map+8.5x11_092926-72dpi.jpg`
