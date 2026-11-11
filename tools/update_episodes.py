"""Rebuild docs/data/episodes.json from the podcast feed.

Run from the project folder:  python3 tools/update_episodes.py
It keeps any hand-written "note" you added to an episode, numbers episodes in release order (the feed has no
numbers), and pulls the guest out of "feat. ..." in the title. Newest episode first.
To add one by hand instead, copy the first entry in docs/data/episodes.json and change its fields.
"""
import html, json, re, sys, urllib.request, xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from pathlib import Path

FEED = "https://media.rss.com/yellow-notebook-podcast/feed.xml"
OUT = Path(__file__).resolve().parent.parent / "docs" / "data" / "episodes.json"
NS = {"itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd"}


def clean(desc):
    t = re.sub(r"</p>\s*<p>", "\n\n", desc or "")
    t = re.sub(r"<br\s*/?>", "\n", t)
    t = html.unescape(re.sub(r"<[^>]+>", "", t)).strip()
    return re.sub(r"\n{3,}", "\n\n", t)


def guest(title):
    m = re.search(r"feat\.\s*(.+?)(\s*-\s*pt\.?\s*\d+)?$", title)
    return m.group(1).strip() if m else ""


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else FEED
    data = open(src, "rb").read() if Path(src).exists() else urllib.request.urlopen(src, timeout=30).read()
    items = ET.fromstring(data).find("channel").findall("item")
    old = {}
    if OUT.exists():
        old = {e["guid"]: e for e in json.loads(OUT.read_text())["episodes"]}
    eps = []
    for it in items:
        title = it.findtext("title").strip()
        when = parsedate_to_datetime(it.findtext("pubDate"))
        e = {
            "title": title,
            "guest": guest(title),
            "date": when.strftime("%Y-%m-%d"),
            "seconds": int(it.findtext("itunes:duration", namespaces=NS) or 0),
            "description": clean(it.findtext("description")),
            "audio": it.find("enclosure").get("url"),
            "page": it.findtext("link"),
            "guid": it.findtext("guid"),
        }
        if old.get(e["guid"], {}).get("note"):
            e["note"] = old[e["guid"]]["note"]
        eps.append(e)
    eps.sort(key=lambda e: (e["date"], e["title"]))
    for n, e in enumerate(eps, 1):
        e["n"] = n
    eps.reverse()
    eps = [{"n": e.pop("n"), **e} for e in eps]
    OUT.write_text(json.dumps({"updated": eps[0]["date"], "episodes": eps}, indent=1, ensure_ascii=False) + "\n")
    print(f"wrote {len(eps)} episodes to {OUT}")


if __name__ == "__main__":
    main()
