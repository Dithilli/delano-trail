#!/usr/bin/env python3
"""Place a street-name label every STEP metres along each named street.

Usage: build_street_labels.py <osm.json> <out streets.json>

The basemap's own along-the-line labels become very sparse when zoomed in
close, which is exactly when someone on foot wants them. These points are drawn
as rotated text lying on the street, so a name is always on screen.

Output: {"names": [...], "points": [[lng, lat, rotation, nameIndex], ...]}
"""
import json, math, sys

STEP = 18.0
M_LAT = 111_320.0
M_LON = 111_320.0 * math.cos(math.radians(45.042))
TOWN = (-93.81, 45.03, -93.77, 45.056)  # west, south, east, north
SKIP = {"footway", "steps", "cycleway", "path", "track", "service", "proposed", "construction"}


def main():
    osm = json.load(open(sys.argv[1]))["elements"]
    names, points = [], []
    for e in osm:
        t = e.get("tags", {})
        if e["type"] != "way" or "name" not in t or t.get("highway") in SKIP or "highway" not in t or "geometry" not in e:
            continue
        if t["name"] not in names:
            names.append(t["name"])
        idx = names.index(t["name"])
        line = [(p["lon"], p["lat"]) for p in e["geometry"]]
        travelled, next_at = 0.0, STEP / 2
        for a, b in zip(line, line[1:]):
            dx, dy = (b[0] - a[0]) * M_LON, (b[1] - a[1]) * M_LAT
            seg = math.hypot(dx, dy)
            if seg == 0:
                continue
            # text-rotate is clockwise from "reading left to right"; keep text upright
            rot = math.degrees(math.atan2(dx, dy)) - 90
            while rot <= -90: rot += 180
            while rot > 90: rot -= 180
            while next_at <= travelled + seg:
                f = (next_at - travelled) / seg
                lng, lat = a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f
                if TOWN[0] < lng < TOWN[2] and TOWN[1] < lat < TOWN[3]:  # highways run on for miles
                    points.append([round(lng, 6), round(lat, 6), round(rot), idx])
                next_at += STEP
            travelled += seg
    json.dump({"names": names, "points": points}, open(sys.argv[2], "w"), separators=(",", ":"))
    print(len(names), "streets,", len(points), "label points")


main()
