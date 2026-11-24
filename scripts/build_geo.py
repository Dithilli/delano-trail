#!/usr/bin/env python3
"""Seed src/data/geo.json: trail lines and a first position for every stop.

Usage: build_geo.py <trail.json> <osm.json> <nominatim-cache.json> <out geo.json>

This is a one-time seed. Once pins have been corrected in the pin editor
(?edit), geo.json is the source of truth and this should not be re-run over it.

approx=False: from a street address or a mapped landmark (right block, give or
take a building). approx=True: spaced along the trail line as a placeholder.
"""
import json, math, re, sys

M_LAT = 111_320.0
M_LON = 111_320.0 * math.cos(math.radians(45.042))

# Intersections, from OpenStreetMap node coordinates.
RB = (-93.789318, 45.041946)   # River St N x Bridge Ave
RR = (-93.789325, 45.040701)   # River St N x Railroad Ave
RE = (-93.789325, 45.043218)   # River St N x Elm Ave E
B2 = (-93.787840, 45.041945)   # 2nd St N x Bridge Ave E
E2 = (-93.787840, 45.043218)   # 2nd St N x Elm Ave E
E3 = (-93.786380, 45.043209)   # 3rd St N x Elm Ave E
R4 = (-93.784896, 45.040689)   # 4th St N x Railroad Ave
B12 = (-93.791745, 45.041969)  # Bridge Ave W x US 12 / Babcock Blvd W


def dist(a, b):
    return math.hypot((a[0] - b[0]) * M_LON, (a[1] - b[1]) * M_LAT)


def along(line, frac):
    """Point at fraction 0..1 of a polyline's length, plus the unit normal there."""
    segs = [(line[i], line[i + 1], dist(line[i], line[i + 1])) for i in range(len(line) - 1)]
    target = frac * sum(s[2] for s in segs)
    for a, b, d in segs:
        if target <= d or (a, b, d) == segs[-1]:
            t = min(1, target / d) if d else 0
            p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            dx, dy = (b[0] - a[0]) * M_LON, (b[1] - a[1]) * M_LAT
            n = math.hypot(dx, dy) or 1
            return p, (-dy / n, dx / n)
        target -= d


def offset(p, normal, metres):
    return (p[0] + normal[0] * metres / M_LON, p[1] + normal[1] * metres / M_LAT)


def smooth(pts, steps=10):
    """Catmull-Rom through hand-placed control points."""
    out = []
    ext = [pts[0]] + pts + [pts[-1]]
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for s in range(steps):
            t = s / steps
            out.append(tuple(
                0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t ** 3)
                for k in (0, 1)))
    return out + [pts[-1]]


def main():
    trail_path, osm_path, nom_path, out_path = sys.argv[1:5]
    data = json.load(open(trail_path, encoding="utf-8"))
    osm = json.load(open(osm_path))["elements"]
    nom = json.load(open(nom_path))

    def feature(name):
        for e in osm:
            if e.get("tags", {}).get("name") == name:
                if "center" in e:
                    return (e["center"]["lon"], e["center"]["lat"])
                if "lat" in e:
                    return (e["lon"], e["lat"])
                g = e["geometry"]
                return (sum(p["lon"] for p in g) / len(g), sum(p["lat"] for p in g) / len(g))
        raise KeyError(name)

    # Babcock Blvd W south from Bridge Ave to just past the railroad (the Drive-In).
    babcock = []
    for e in osm:
        t = e.get("tags", {})
        if e["type"] == "way" and t.get("name") == "Babcock Boulevard West" and t.get("highway"):
            babcock += [(p["lon"], p["lat"]) for p in e["geometry"] if p["lat"] >= 45.0396]
    babcock = sorted(set(babcock), key=lambda p: -p[1])

    trails = {
        "green": [[E3, E2, B2], [B2, (-93.78700, 45.041945)]],
        "red": [[RB, B2]],
        "lime": [[RB, RE, (-93.789325, 45.04375)]],
        "purple": [[RB, RR]],
        "yellow": [[RR, R4, (-93.78420, 45.040689)]],
        "blue": [[(-93.79530, 45.04198), B12, RB], babcock],
        # Central Park has no mapped trail path; this follows the printed map's S-curve.
        "orange": [smooth([(-93.78885, 45.04688), (-93.78800, 45.04684), (-93.78715, 45.04692), (-93.78655, 45.04725),
                           (-93.78650, 45.04775), (-93.78690, 45.04815), (-93.78760, 45.04835), (-93.78820, 45.04822)])],
    }

    landmarks = {
        "city-hall": "Delano City Hall",
        "post-office": "Delano Post Office",
        "delano-municipal-utilities": "Delano Municipal Utilities",
        "rieder-homestead": "Rieder Homestead",
        "central-park": "Central Park",
        "delano-municipal-baseball-park": "Delano Municipal Baseball Park",
    }
    manual = {  # reasoned from the address grid; still estimates
        "hildebrandt-bldg": (-93.78965, 45.04203),      # 10 W Bridge: first lot west of River St
        "lundsten-lumber": (-93.78590, 45.04077),       # 318 Railroad Ave: just east of 300
        "delano-granite-works": feature("Granite Works"),
    }
    distrust = {"leiter-oil-company"}  # geocoder put 220 and 115 Babcock on the same spot

    placed, source = {}, {}
    for s in data["stops"]:
        slug = s["slug"]
        if slug in landmarks:
            placed[slug], source[slug] = feature(landmarks[slug]), "landmark"
            continue
        if slug in manual:
            placed[slug], source[slug] = manual[slug], "estimate"
            continue
        if slug in distrust:
            continue
        addr = s["address"] if s["address"] and re.match(r"^\d", s["address"]) else None
        hit = None
        for key, val in nom.items():
            if val and val.get("address", {}).get("house_number") and addr and re.sub(r"\W", "", key.lower()).startswith(re.sub(r"\W", "", addr.lower())[:8]):
                hit = val
        if hit is None and not addr:  # address found in the story text
            text = re.sub(r"<[^>]+>", " ", " ".join(b.get("html", "") for b in s["body"][:3])) + " " + s["title"]
            for key, val in nom.items():
                num, street = key.split(" ", 1)
                if val and val.get("address", {}).get("house_number") and re.search(rf"\b{num}\s+{re.escape(street.split()[0])}", text, re.I):
                    hit = val
        if hit:
            placed[slug], source[slug] = (float(hit["lon"]), float(hit["lat"])), "address"

    # Everything else: spread along its trail, in list order, in the gaps.
    for tid, lines in trails.items():
        line = max(lines, key=lambda l: sum(dist(l[i], l[i + 1]) for i in range(len(l) - 1)))
        todo = [s for s in data["stops"] if s["trail"] == tid and s["slug"] not in placed]
        for i, s in enumerate(todo):
            p, n = along(line, (i + 0.5) / len(todo))
            placed[s["slug"]], source[s["slug"]] = offset(p, n, 9 if i % 2 else -9), "estimate"

    # Keep pins from sitting exactly on top of each other.
    slugs = list(placed)
    for _ in range(40):
        for i, a in enumerate(slugs):
            for b in slugs[i + 1:]:
                d = dist(placed[a], placed[b])
                if d < 7:
                    ang = math.atan2((placed[b][1] - placed[a][1]) * M_LAT, (placed[b][0] - placed[a][0]) * M_LON) if d > 0.01 else (hash(a + b) % 628) / 100
                    push = (7 - d) / 2 + 0.2
                    for slug, sign in ((a, -1), (b, 1)):
                        if source[slug] == "estimate" or source[a] == source[b]:
                            placed[slug] = (placed[slug][0] + sign * math.cos(ang) * push / M_LON, placed[slug][1] + sign * math.sin(ang) * push / M_LAT)

    geo = {
        "stops": {k: {"lngLat": [round(v[0], 6), round(v[1], 6)], "approx": source[k] == "estimate"} for k, v in placed.items()},
        "trails": {k: [[[round(p[0], 6), round(p[1], 6)] for p in line] for line in lines] for k, lines in trails.items()},
    }
    json.dump(geo, open(out_path, "w"), indent=1)
    from collections import Counter
    print(len(placed), "stops placed:", dict(Counter(source.values())))
    print("missing:", [s["slug"] for s in data["stops"] if s["slug"] not in placed])
    print("address:", sorted(k for k, v in source.items() if v == "address"))
    print("babcock pts:", len(babcock))


main()
