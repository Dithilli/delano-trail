# Delano Spirit of Community Trail — interactive map

A single-page, map-first version of the [Spirit of Community Trail](https://www.delanomnhistory.org/adventure-starts)
from the Delano Franklin Township Area Historical Society. Demo / work in progress.

All stories, photographs and research belong to the Historical Society and the
Spirit of Community Trail Committee; this project only re-presents them.

- `scripts/scrape.py` extracts the 72 stops from the live site into `src/data/trail.json`
- `scripts/trails.json` holds trail membership and numbering (from the printed plaque list)

## Running it

    npm install
    npm run dev        # http://localhost:5183/
    npm test           # unit + data checks
    npm run e2e        # browser walkthrough (needs the dev server running)
    npm run build      # static site in dist/, relative paths, ready for GitHub Pages

- `?edit` opens the pin editor: drag pins to their real spots, then "Download geo.json" and replace `src/data/geo.json`.
  Pins marked `approx: true` are placeholders spaced along their trail, not real plaque locations.
- `?nointro` skips the opening; a link to a stop (`#/stop/beck-building`) always skips it.
- `scripts/build_geo.py` seeded `geo.json` once from OpenStreetMap and Nominatim. Don't re-run it over hand-corrected pins.
