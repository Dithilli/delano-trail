/** Squarespace's CDN resizes on request: ?format=<width>w. */
export function sized(src: string, width: 100 | 300 | 500 | 750 | 1000 | 1500 | 2500): string {
  return src.includes('squarespace-cdn.com') ? `${src}?format=${width}w` : src
}
