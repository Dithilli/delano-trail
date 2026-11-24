import { useRef, useState } from 'react'
import type { Stop, Trail } from './types'
import './stopSearch.css'

function searchable(text: string) {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

export function StopSearch({ stops, trails, onSelect, onToggle }: {
  stops: Stop[]
  trails: Trail[]
  onSelect: (slug: string) => void
  onToggle: (open: boolean) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const resultsList = useRef<HTMLUListElement>(null)
  const [query, setQuery] = useState('')
  const words = searchable(query).split(' ').filter(Boolean)
  const results = stops.filter((stop) => {
    const text = searchable([stop.name, stop.title, stop.address].join(' '))
    return words.every((word) => text.includes(word))
  }).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <button className="chip" aria-haspopup="dialog" aria-label="Search buildings and stops" onClick={() => {
        setQuery('')
        dialog.current?.showModal()
        resultsList.current?.scrollTo(0, 0)
        onToggle(true)
      }}>
        Search
      </button>
      <dialog className="stop-search" ref={dialog} aria-labelledby="stop-search-title" onClose={() => onToggle(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            dialog.current?.close()
          }
        }}>
        <div className="stop-search__header">
          <h2 id="stop-search-title">Find a building</h2>
          <button aria-label="Close search" onClick={() => dialog.current?.close()}>×</button>
        </div>
        <input type="search" autoFocus aria-label="Building name or address" placeholder="Building name or address" value={query}
          onChange={(event) => { setQuery(event.target.value); resultsList.current?.scrollTo(0, 0) }} />
        <p className="stop-search__count" role="status">
          {results.length === 0 ? 'No matching stops. Try another name or address.' : `${results.length} ${results.length === 1 ? 'stop' : 'stops'}`}
        </p>
        <ul ref={resultsList}>
          {results.map((stop) => {
            const trail = trails.find((t) => t.id === stop.trail)
            return (
              <li key={stop.slug}>
                <button onClick={() => { dialog.current?.close(); onSelect(stop.slug) }}>
                  <strong>{stop.name}</strong>
                  <span>{[trail?.name, stop.address].filter(Boolean).join(' · ')}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </dialog>
    </>
  )
}
