#!/usr/bin/env python3
"""Geocode stop street addresses with Nominatim (cached). Usage: geocode.py <trail.json> <cache.json>"""
import json, os, re, sys, time, urllib.parse, urllib.request

ADDR = re.compile(r"\b(\d{2,3})\s+((?:N(?:orth)?\.?\s+|W(?:est)?\.?\s+|E(?:ast)?\.?\s+)?(?:River|Bridge|Rail ?road|Railroad|2nd|Second|3rd|Third|Elm|Babcock|Park|Maple|St\.? Peter)\s+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard)\b\.?(?:\s+(?:N(?:orth)?|S(?:outh)?|E(?:ast)?|W(?:est)?)\b\.?)?)", re.I)

def clean(a):
    a = re.sub(r"Rail Road", "Railroad", a, flags=re.I)
    a = re.sub(r"Bridge Street", "Bridge Avenue", a, flags=re.I)
    return re.sub(r"\s+", " ", a.replace(",", " ")).strip(" .")

def main():
    data = json.load(open(sys.argv[1], encoding="utf-8"))
    cache_path = sys.argv[2]
    cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}
    for s in data["stops"]:
        addr, src = s["address"], "header"
        if not addr or not re.match(r"^\d", addr):
            text = re.sub(r"<[^>]+>", " ", " ".join(b.get("html", "") for b in s["body"][:3]))
            m = ADDR.search((s.get("subtitle") or "") + " " + s["title"] + " " + text)
            addr, src = (f"{m.group(1)} {m.group(2)}", "text") if m else (None, None)
        if not addr:
            continue
        addr = clean(addr)
        if addr not in cache:
            q = urllib.parse.urlencode({"q": f"{addr}, Delano, MN 55328", "format": "jsonv2", "limit": 1, "addressdetails": 1,
                                        "viewbox": "-93.81,45.055,-93.77,45.03", "bounded": 1})
            req = urllib.request.Request("https://nominatim.openstreetmap.org/search?" + q, headers={"User-Agent": "trail-map-demo/0.1"})
            try:
                with urllib.request.urlopen(req, timeout=30) as r:
                    res = json.load(r)
            except Exception as e:
                print("ERR", addr, e); res = None
            time.sleep(1.1)
            if res is None:
                continue
            cache[addr] = res[0] if res else None
            json.dump(cache, open(cache_path, "w"), indent=1)
        hit = cache[addr]
        if hit:
            a = hit.get("address", {})
            print(f'{s["trail"]:>6} {s["number"]:>2} {s["slug"][:26]:<26} [{src}] {addr:<28} -> {float(hit["lat"]):.5f},{float(hit["lon"]):.5f} {hit.get("addresstype")}/{hit.get("type")} hn={a.get("house_number")} rd={a.get("road")}')
        else:
            print(f'{s["trail"]:>6} {s["number"]:>2} {s["slug"][:26]:<26} [{src}] {addr:<28} -> NOT FOUND')

main()
