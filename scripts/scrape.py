#!/usr/bin/env python3
"""Extract the Spirit of Community Trail stops from delanomnhistory.org.

Usage: python3 -I scripts/scrape.py <cache_dir> <out_json>

Pages are fetched once into <cache_dir> and parsed from there. Trail
membership and numbering come from scripts/trails.json (the printed plaque
list), not from the website's trail pages.
"""
import html
import json
import os
import re
import sys
import time
import urllib.request
from html.parser import HTMLParser

BASE = "https://www.delanomnhistory.org"
HERE = os.path.dirname(os.path.abspath(__file__))

ALLOWED = {"p", "h2", "h3", "h4", "strong", "em", "b", "i", "a", "ul", "ol", "li", "br", "blockquote"}
BOILERPLATE = (
    "The Spirit of Community in Delano is defined by",
    "Creativity, Resilience, and Community Investment of its people",
    "Continue to Explore the Spirit of Community Trail",
    "The content of this page is brought to you by",
)


def fetch(slug, cache_dir):
    path = os.path.join(cache_dir, slug + ".html")
    if not os.path.exists(path):
        req = urllib.request.Request(f"{BASE}/{slug}", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        with open(path, "wb") as f:
            f.write(data)
        time.sleep(0.4)
    with open(path, encoding="utf-8", errors="replace") as f:
        return f.read()


class Sanitizer(HTMLParser):
    """Keep a small whitelist of tags, drop every attribute except a[href]."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []

    def handle_starttag(self, tag, attrs):
        if tag not in ALLOWED:
            return
        if tag == "a":
            href = dict(attrs).get("href") or ""
            if href.startswith("/"):
                href = BASE + href
            if not re.match(r"^(https?:|mailto:)", href):
                return
            self.out.append(f'<a href="{html.escape(href, quote=True)}">')
        elif tag == "br":
            self.out.append("<br>")
        else:
            self.out.append(f"<{tag}>")

    def handle_endtag(self, tag):
        if tag in ALLOWED and tag != "br":
            self.out.append(f"</{tag}>")

    def handle_data(self, data):
        self.out.append(html.escape(data, quote=False))


def sanitize(fragment):
    s = Sanitizer()
    s.feed(fragment)
    out = "".join(s.out)
    out = re.sub(r"<a [^>]*>\s*</a>", "", out)
    out = re.sub(r"<(p|h2|h3|h4|strong|em|li)>(\s|&nbsp;|​|<br>)*</\1>", "", out)
    out = re.sub(r"</a>(?!<a )(?=[^<]*</a>)", "", out)  # anchors dropped above leave stray closers
    return out.strip()


def plain(fragment):
    t = html.unescape(re.sub(r"<[^>]+>", " ", fragment))
    return re.sub(r"\s+", " ", t.replace("​", "")).strip()


def parse_blocks(page):
    """Return a list of sections, each a list of blocks in mobile reading order."""
    m = re.search(r"<main.*?</main>", page, re.S)
    main = m.group(0) if m else page
    sections = []
    for sec in re.split(r"(?=<section\b)", main)[1:]:
        order = {}
        for bid, r, c in re.findall(r"\.fe-block-([\w-]+)\s*\{\s*grid-area:\s*(\d+)\s*/\s*(\d+)", sec):
            order.setdefault(bid, (int(r), int(c)))  # first rule is the mobile layout
        blocks = []
        chunks = re.split(r'(?=<div class="fe-block fe-block-)', sec)[1:]
        for n, ch in enumerate(chunks):
            bid = re.match(r'<div class="fe-block fe-block-([\w-]+)', ch).group(1)
            key = order.get(bid, (9999, n))
            kinds = [k for k in re.findall(r"sqs-block-([a-z0-9-]+)", ch[:1500]) if k not in ("website-component", "content")]
            kind = kinds[0] if kinds else "unknown"
            blk = None
            if kind == "html":
                inner = re.search(r'<div class="sqs-html-content"[^>]*>(.*?)</div>', ch, re.S)
                if inner:
                    blk = {"type": "text", "html": sanitize(inner.group(1)), "_raw": inner.group(1)}
            elif kind == "image":
                img = re.search(r"<img\b[^>]*>", ch)
                if img:
                    tag = img.group(0)
                    src = re.search(r'data-src="([^"]+)"', tag) or re.search(r'\bsrc="([^"]+)"', tag)
                    dim = re.search(r'data-image-dimensions="(\d+)x(\d+)"', tag)
                    alt = re.search(r'\balt="([^"]+)"', tag)
                    link = re.search(r'<a[^>]*class="[^"]*sqs-block-image-link[^"]*"[^>]*href="([^"]+)"', ch)
                    if src:
                        blk = {"type": "image", "src": html.unescape(src.group(1))}
                        if dim:
                            blk["w"], blk["h"] = int(dim.group(1)), int(dim.group(2))
                        if alt:
                            blk["alt"] = html.unescape(alt.group(1))
                        if link:
                            blk["href"] = html.unescape(link.group(1))
            elif kind == "button":
                a = re.search(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', ch, re.S)
                if a:
                    href = html.unescape(a.group(1))
                    if href.startswith("/"):
                        href = BASE + href
                    blk = {"type": "link", "href": href, "label": plain(a.group(2))}
            elif kind in ("video", "embed"):
                src = re.search(r"(https?:)?//(?:www\.)?(youtube\.com/embed/[\w-]+|player\.vimeo\.com/video/\d+)", html.unescape(html.unescape(ch)))
                if src:
                    blk = {"type": "video", "src": "https://www." + src.group(2).replace("www.", "")}
                else:
                    blk = {"type": "other", "kind": kind}
            else:
                blk = {"type": "other", "kind": kind}
            if blk:
                blocks.append((key, n, blk))
        blocks.sort(key=lambda b: (b[0], b[1]))
        sections.append([b[2] for b in blocks])
    return sections


def is_boilerplate(blk):
    if blk["type"] == "text":
        t = plain(blk["html"])
        return not t or any(b in t for b in BOILERPLATE)
    if blk["type"] == "image":
        return bool(re.search(r"Masthead|medallion", blk["src"], re.I))
    if blk["type"] == "link":
        return blk["href"].rstrip("/").endswith("/adventure-starts")
    return False


def parse_stop(slug, page):
    sections = parse_blocks(page)
    flat = []
    other = []
    for si, sec in enumerate(sections):
        for blk in sec:
            if blk["type"] == "other":
                other.append(blk["kind"])
            elif not is_boilerplate(blk):
                flat.append((si, blk))
    title = address = subtitle = None
    ti = None
    for i, (si, blk) in enumerate(flat):
        h = re.search(r"<h[12][^>]*>(.*?)</h[12]>", blk.get("_raw", ""), re.S)
        if h:
            ti, title = i, plain(h.group(1))
            rest = plain(blk["_raw"].replace(h.group(0), ""))
            if rest and len(rest) < 80:
                subtitle = rest
            break

    def short_text(i):
        if 0 <= i < len(flat) and flat[i][0] == flat[ti][0] and flat[i][1]["type"] == "text":
            t = plain(flat[i][1]["_raw"])
            if 0 < len(t) < 80:
                return t
        return None

    drop = set()
    if ti is not None:
        drop.add(ti)
        facts = [subtitle] if subtitle else []
        for i in (ti - 1, ti + 1, ti + 2, ti + 3):
            t = short_text(i)
            if t is None:
                if i > ti:
                    break
                continue
            facts.append(t)
            drop.add(i)
        subtitle = None
        rest = []
        for t in facts:
            m = re.match(r"^(\d+ [\w .]*?(?:St(?:reet)?|Ave(?:nue)?|Blvd|Road)\b[\w .]*?)(?:\s+((?:Built|Est|Founded).*))?$", t, re.I)
            if m and address is None:
                address = m.group(1).strip()
                if m.group(2):
                    rest.append(m.group(2))
            elif "corner of" in t and address is None:
                address = t
            else:
                rest.append(t)
        subtitle = " · ".join(rest) or None
    body = [blk for i, (si, blk) in enumerate(flat) if i not in drop]
    for blk in body:
        blk.pop("_raw", None)
    summary = next((plain(b["html"]) for b in body if b["type"] == "text" and len(plain(b["html"])) > 120), "")
    hero = next((b for b in body if b["type"] == "image"), None)
    return {
        "slug": slug,
        "title": title,
        "address": address,
        "subtitle": subtitle,
        "summary": summary,
        "hero": hero["src"] if hero else None,
        "body": body,
        "sourceUrl": f"{BASE}/{slug}",
        "_other": other,
    }


def main():
    cache_dir, out_path = sys.argv[1], sys.argv[2]
    os.makedirs(cache_dir, exist_ok=True)
    with open(os.path.join(HERE, "trails.json"), encoding="utf-8") as f:
        trails = json.load(f)
    stops = []
    for trail in trails:
        for n, entry in enumerate(trail["stops"], 1):
            page = fetch(entry["slug"], cache_dir)
            stop = parse_stop(entry["slug"], page)
            stop.update(trail=trail["id"], number=n, name=entry["name"], nonprofit=bool(entry.get("nonprofit")))
            stops.append(stop)
    report = []
    for s in stops:
        imgs = sum(1 for b in s["body"] if b["type"] == "image")
        flags = []
        if not s["title"]:
            flags.append("NO-TITLE")
        if not s["summary"]:
            flags.append("NO-SUMMARY")
        if s["_other"]:
            flags.append("other:" + ",".join(sorted(set(s["_other"]))))
        report.append(f'{s["trail"]:>6} {s["number"]:>2} {s["slug"][:34]:<34} blocks={len(s["body"]):>3} img={imgs:>2} addr={s["address"]!r} sub={s["subtitle"]!r} title={s["title"]!r} {" ".join(flags)}')
        del s["_other"]
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"trails": [{k: v for k, v in t.items() if k != "stops"} for t in trails], "stops": stops}, f, ensure_ascii=False, indent=1)
    print("\n".join(report))
    print(f"{len(stops)} stops -> {out_path} ({os.path.getsize(out_path)//1024} KB)")


if __name__ == "__main__":
    main()
