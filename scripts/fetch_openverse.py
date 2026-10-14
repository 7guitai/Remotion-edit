"""寝落ち雑学の台本（relax_sleep_script.txt）の話題ごとに、Openverse でフリー写真の候補を集める。

- ライセンスは CC0 とパブリックドメイン（PDM）だけ。横長・大きめの写真に限る
- 結果は scripts/openverse_cache/<話題番号>.json に保存（2回目からは API を呼ばない）
- 匿名利用は 1分20回・1日200回までなので、間を空けて呼ぶ
使い方: python3 scripts/fetch_openverse.py [台本.txt] [名前の頭（2本目以降: s2_ など）]
"""

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / "openverse_cache"
API = "https://api.openverse.org/v1/images/"
CALM = [
    "cozy bedroom",
    "bed pillow morning light",
    "cup of tea window",
    "candle night",
    "calm lake",
    "night sky stars",
    "moon clouds",
    "sleeping cat",
    "quiet forest",
    "sunset sea",
    "reading book cozy",
    "rain window",
]
# 2本目以降で増やした「落ち着いた写真」（前の回と同じ写真ばかりにならないように）
CALM_MORE = [
    "lantern night",
    "ocean waves night",
    "misty mountains morning",
    "snowy night",
    "fireplace cozy",
    "lavender field",
    "starry sky milky way",
    "quiet beach dusk",
]


def search(q: str) -> list[dict]:
    params = {
        "q": q,
        "license": "cc0,pdm",
        "category": "photograph",
        "aspect_ratio": "wide",
        "size": "large",
        "page_size": 20,
        "mature": "false",
    }
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers={"User-Agent": "remotion-edit/1.0"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                data = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code in (403, 429):
                time.sleep(30 * (attempt + 1))
                continue
            raise
        except (urllib.error.URLError, ConnectionError, TimeoutError, OSError):
            # 接続が切れたときも少し待って取り直す
            time.sleep(15 * (attempt + 1))
            continue
    else:
        return []
    out = []
    for x in data.get("results", []):
        out.append(
            {
                "id": x["id"],
                "title": x.get("title") or "",
                "url": x["url"],
                "thumb": x.get("thumbnail"),
                "w": x.get("width"),
                "h": x.get("height"),
                "license": x.get("license"),
                "creator": x.get("creator") or "",
                "source": x.get("source") or x.get("provider") or "",
                "landing": x.get("foreign_landing_url") or "",
            }
        )
    return out


def topics(script: str) -> list[list[str]]:
    qs = []
    for line in (ROOT / "scripts" / script).read_text(encoding="utf-8").splitlines():
        if line.startswith("@"):
            qs.append([q.strip() for q in line[1:].split(";") if q.strip()])
    return qs


def cached(name: str, queries: list[str]) -> None:
    path = CACHE / f"{name}.json"
    if path.exists():
        return
    results: list[dict] = []
    seen = set()
    for q in queries:
        for x in search(q):
            if x["id"] not in seen:
                seen.add(x["id"])
                x["query"] = q
                results.append(x)
        time.sleep(3.5)
        if len(results) >= 14:
            break
    path.write_text(json.dumps(results, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{name}: {len(results)}  {queries}", flush=True)


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    script = sys.argv[1] if len(sys.argv) > 1 else "relax_sleep_script.txt"
    prefix = sys.argv[2] if len(sys.argv) > 2 else ""
    for i, qs in enumerate(topics(script)):
        cached(f"{prefix}t{i:03d}", qs)
    for i, q in enumerate(CALM + (CALM_MORE if prefix else [])):
        cached(f"calm{i:02d}", [q])


if __name__ == "__main__":
    main()
