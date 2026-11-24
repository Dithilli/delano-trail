import { useId } from 'react'

export function TrailMark() {
  const ink = useId()
  return (
    <svg className="trail-mark" viewBox="100 13 382 481" role="img" aria-label="Delano Spirit of Community Trail">
      <defs>
        <filter id={ink} colorInterpolationFilters="sRGB">
          {/* Isolate the original artwork from the gold background using the red channel. */}
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2 0 0 0 1.35" />
        </filter>
      </defs>
      <image href="./delano-trail-header.jpg" width="1466" height="526" filter={`url(#${ink})`} />
    </svg>
  )
}
