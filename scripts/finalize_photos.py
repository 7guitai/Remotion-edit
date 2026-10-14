"""選んだ写真（話題ごとの候補番号）を大きいサイズで取ってきて public/photos/relax/ に保存し、
scripts/photo_picks.json（build_relax_sleep.py が使う）と、出典の一覧 scripts/photo_credits.tsv を作る。

使い方: python3 scripts/finalize_photos.py <選んだ番号の JSON> [photo_picks の出力] [credits の出力]
  JSON の形: {"t001": [5, 11, "t003:7"], ..., "calm": ["calm00:3", ...]}
  数字はその話題の候補番号、"tXXX:n" は別の話題の候補
"""

import io
import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / "openverse_cache"
OUT = ROOT / "public" / "photos" / "relax"
MAX_W = 1600


def full_url(url: str) -> str:
    # rawpixel は image_1300 などの大きいサイズにすかし（透かし）が入るので、Openverse の URL（editor_1024）のまま使う
    return url


def load(name: str) -> list[dict]:
    return json.loads((CACHE / f"{name}.json").read_text(encoding="utf-8"))


def resolve(topic: str, ref) -> dict:
    if isinstance(ref, str):
        name, k = ref.split(":")
        return load(name)[int(k)]
    return load(topic)[ref]


def download(item: dict) -> str:
    dest = OUT / f"{item['id']}.jpg"
    if not dest.exists():
        for url in [full_url(item["url"]), item["url"]]:
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                data = urllib.request.urlopen(req, timeout=60).read()
                im = Image.open(io.BytesIO(data)).convert("RGB")
                if im.width > MAX_W:
                    im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
                im.save(dest, quality=86)
                break
            except Exception as e:  # 大きいサイズがなければ元の URL で
                err = e
        else:
            raise RuntimeError(f"download failed {item['url']}: {err}")
    return f"relax/{dest.name}"


def main() -> None:
    picks = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = []
    for topic, refs in picks.items():
        for ref in refs:
            src = topic if topic != "calm" else None
            item = resolve(src, ref) if src else resolve("", ref)
            jobs.append((topic, item))
    with ThreadPoolExecutor(8) as ex:
        files = list(ex.map(lambda j: download(j[1]), jobs))
    result: dict = {"topics": {}, "calm": []}
    credits = ["file\ttitle\tcreator\tlicense\tsource\tpage"]
    seen = set()
    for (topic, item), f in zip(jobs, files):
        entry = {"file": f}
        if topic == "calm":
            result["calm"].append(entry)
        else:
            result["topics"].setdefault(str(int(topic.rsplit("t", 1)[1])), []).append(entry)
        if f not in seen:
            seen.add(f)
            credits.append("\t".join([f, item["title"], item["creator"], item["license"], item["source"], item["landing"]]))
    picks_out = sys.argv[2] if len(sys.argv) > 2 else "photo_picks.json"
    credits_out = sys.argv[3] if len(sys.argv) > 3 else "photo_credits.tsv"
    (ROOT / "scripts" / picks_out).write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    (ROOT / "scripts" / credits_out).write_text("\n".join(credits) + "\n", encoding="utf-8")
    print(f"{len(seen)} photos")


if __name__ == "__main__":
    main()
