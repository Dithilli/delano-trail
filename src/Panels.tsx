import type { CSSProperties } from 'react'
import { sized } from './lib/image'
import type { Route } from './lib/route'
import type { Block, LngLat, Stop, Trail } from './types'

type Go = (r: Route) => void

const SITE = 'https://www.delanomnhistory.org'
const PRINTED_MAP =
  'https://images.squarespace-cdn.com/content/v1/55648dcee4b0b7fb3090f7e7/749ae777-2e96-462f-9241-241c138239d3/DSCT_Map+8.5x11_092926-72dpi.jpg'

const trailVar = (t: Trail) => ({ '--trail': t.color }) as CSSProperties

export function HomePanel({ trails, stops, go }: { trails: Trail[]; stops: Stop[]; go: Go }) {
  return (
    <div className="home">
      <header className="masthead">
        <p className="eyebrow">Delano, Minnesota</p>
        <h1>Spirit of Community Trail</h1>
        <p className="lede">
          Delano’s story is one of <em>creativity, resilience and community investment</em>. Follow the bronze plaques
          through downtown and discover the people and places behind it.
        </p>
      </header>

      <h2 className="section-title">Choose a trail</h2>
      <ul className="trail-cards">
        {trails.map((t) => {
          const own = stops.filter((s) => s.trail === t.id)
          return (
            <li key={t.id}>
              <button className="trail-card" style={trailVar(t)} onClick={() => go({ view: 'trail', trail: t.id })}>
                <span className="trail-card__bar" />
                <span className="trail-card__text">
                  <strong>{t.name}</strong>
                  <span>{t.area}</span>
                </span>
                <span className="trail-card__count">{own.length} stops</span>
              </button>
            </li>
          )
        })}
      </ul>

      <section className="how">
        <h2 className="section-title">How the trail works</h2>
        <p>
          The trail features 50+ historic sites, along with sites recognizing the nonprofit organizations that
          contribute to the community. At each location, look for a bronze commemorative plaque and QR code.
        </p>
        <p>
          Join the trail wherever you are, or create your own route, from the Heritage Center in historic downtown to
          the library, sculpture park or Central Park.
        </p>
        <a className="printed" href={sized(PRINTED_MAP, 1500)} target="_blank" rel="noreferrer">
          <img src={sized(PRINTED_MAP, 300)} alt="The printed Spirit of Community Trail map" loading="lazy" />
          <span>
            <strong>The printed map</strong>
            Available at the Heritage Center and City Hall.
          </span>
        </a>
      </section>

      <footer className="credits">
        Stories, photographs and research by the Spirit of Community Trail Committee of the{' '}
        <a href={`${SITE}/adventure-starts`} target="_blank" rel="noreferrer">
          Delano Franklin Township Area Historical Society
        </a>
        , in honor of Delano’s 150th anniversary.
      </footer>
    </div>
  )
}

export function TrailPanel({ trail, stops, go }: { trail: Trail; stops: Stop[]; go: Go }) {
  return (
    <div className="trail" style={trailVar(trail)}>
      <button className="back" onClick={() => go({ view: 'home' })}>← All trails</button>
      <header className="trail-head">
        <span className="trail-head__bar" />
        <div>
          <h1>{trail.name}</h1>
          <p>{trail.area} · {stops.length} stops</p>
        </div>
      </header>
      <ol className="stop-list">
        {stops.map((s) => (
          <li key={s.slug}>
            <button className="stop-row" onClick={() => go({ view: 'stop', slug: s.slug })}>
              <span className="num">{s.number}</span>
              <span className="stop-row__text">
                <strong>{s.name}</strong>
                <span>{[s.address, s.subtitle].filter(Boolean).join(' · ') || (s.nonprofit ? 'Community nonprofit' : '')}</span>
              </span>
              {s.hero && <img src={sized(s.hero, 100)} alt="" loading="lazy" />}
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
}

function BodyBlock({ block }: { block: Block }) {
  if (block.type === 'text') return <div className="prose" dangerouslySetInnerHTML={{ __html: block.html }} />
  if (block.type === 'image') {
    return (
      <figure className="photo">
        <a href={sized(block.src, 2500)} target="_blank" rel="noreferrer">
          <img
            src={sized(block.src, 750)}
            alt={block.alt ?? ''}
            loading="lazy"
            width={block.w}
            height={block.h}
          />
        </a>
      </figure>
    )
  }
  if (block.type === 'link') {
    return (
      <a className="more" href={block.href} target="_blank" rel="noreferrer">
        {block.label} →
      </a>
    )
  }
  return (
    <div className="video">
      <iframe src={block.src} title="Video" allowFullScreen loading="lazy" />
    </div>
  )
}

export function StopPanel({
  stop,
  trail,
  siblings,
  placed,
  go,
}: {
  stop: Stop
  trail: Trail
  siblings: Stop[]
  placed?: { lngLat: LngLat; approx: boolean }
  go: Go
}) {
  const i = siblings.findIndex((s) => s.slug === stop.slug)
  const prev = siblings[i - 1]
  const next = siblings[i + 1]
  return (
    <article className="stop" style={trailVar(trail)}>
      <button className="back" onClick={() => go({ view: 'trail', trail: trail.id })}>← {trail.name}</button>
      <header className="stop-head">
        <p className="badge">
          <span className="num">{stop.number}</span>
          {trail.name}
          {stop.nonprofit && <span className="tag">Nonprofit</span>}
        </p>
        <h1>{stop.title}</h1>
        {(stop.address || stop.subtitle) && (
          <p className="facts">{[stop.address, stop.subtitle].filter(Boolean).join(' · ')}</p>
        )}
        {placed && (
          <a
            className="directions"
            href={`https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=${placed.lngLat[1]},${placed.lngLat[0]}`}
            target="_blank"
            rel="noreferrer"
          >
            Walking directions
          </a>
        )}
      </header>

      <div className="stop-body">
        {stop.body.map((b, n) => (
          <BodyBlock key={n} block={b} />
        ))}
      </div>

      <nav className="pager">
        {prev ? (
          <button onClick={() => go({ view: 'stop', slug: prev.slug })}>
            <span>← Stop {prev.number}</span>
            <strong>{prev.name}</strong>
          </button>
        ) : <span />}
        {next ? (
          <button className="pager__next" onClick={() => go({ view: 'stop', slug: next.slug })}>
            <span>Stop {next.number} →</span>
            <strong>{next.name}</strong>
          </button>
        ) : <span />}
      </nav>
      <p className="source">
        From the Historical Society’s page for this plaque:{' '}
        <a href={stop.sourceUrl} target="_blank" rel="noreferrer">view the original</a>
      </p>
    </article>
  )
}
