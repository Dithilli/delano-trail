import { useEffect, useRef } from 'react'
import { sized } from './lib/image'

export interface Photo { src: string; alt?: string; caption?: string }

export function Lightbox({ photos, index, onIndex, onClose }: { photos: Photo[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const photo = photos[index]
  const step = (d: number) => onIndex((index + d + photos.length) % photos.length)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchEnd = (e: React.TouchEvent) => {
    const from = touch.current
    touch.current = null
    if (!from) return
    const dx = e.changedTouches[0].clientX - from.x
    const dy = e.changedTouches[0].clientY - from.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && photos.length > 1) step(dx < 0 ? 1 : -1)
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.5) onClose()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!photo) return null
  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photograph"
      onClick={onClose}
      onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
      onTouchEnd={onTouchEnd}
    >
      <button className="lightbox__close" onClick={onClose} aria-label="Close">×</button>
      {photos.length > 1 && (
        <>
          <button className="lightbox__nav lightbox__nav--prev" onClick={(e) => { e.stopPropagation(); step(-1) }} aria-label="Previous photograph">‹</button>
          <button className="lightbox__nav lightbox__nav--next" onClick={(e) => { e.stopPropagation(); step(1) }} aria-label="Next photograph">›</button>
        </>
      )}
      <figure key={photo.src} className="lightbox__figure" onClick={(e) => e.stopPropagation()}>
        <img src={sized(photo.src, 1500)} alt={photo.alt ?? ''} />
        <figcaption>
          {photo.caption && <span>{photo.caption}</span>}
          <small>{index + 1} of {photos.length}</small>
        </figcaption>
      </figure>
    </div>
  )
}
