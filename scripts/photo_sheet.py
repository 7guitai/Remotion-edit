"""Openverse の写真候補を小さく取ってきて、話題ごとに一覧シートにする（写真選び用）。

使い方: python3 scripts/photo_sheet.py <出力フォルダ> t000 t001 ...
シートは <出力フォルダ>/sheet_<最初の話題>.jpg。各写真の左上の番号が候補の番号
"""

import io
import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / "openverse_cache"
TW, TH = 240, 160


def preview_url(url: str) -> str:
    if "images.rawpixel.com/editor_1024/" in url:
        return url.replace("editor_1024", "image_400")
    return url


def fetch(url: str, dest: Path) -> Image.Image | None:
    if dest.exists():
        return Image.open(dest)
    try:
        req = urllib.request.Request(preview_url(url), headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=30).read()
        im = Image.open(io.BytesIO(data)).convert("RGB")
        im.thumbnail((TW * 2, TH * 2))
        im.save(dest, quality=80)
        return im
    except Exception:
        return None


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    names = sys.argv[2:]
    rows = []
    for name in names:
        items = json.loads((CACHE / f"{name}.json").read_text(encoding="utf-8"))
        with ThreadPoolExecutor(8) as ex:
            ims = list(ex.map(lambda kv: fetch(kv[1]["url"], out / f"{name}_{kv[0]:02d}.jpg"), enumerate(items)))
        rows.append((name, ims, items))
    cols = 8
    height = sum(((len(ims) + cols - 1) // cols) * (TH + 4) + 30 for _, ims, _ in rows)
    sheet = Image.new("RGB", (cols * (TW + 4), max(height, 10)), "white")
    d = ImageDraw.Draw(sheet)
    y = 0
    for name, ims, items in rows:
        d.text((4, y + 8), f"{name}  {items[0]['query'] if items else ''}", fill="black")
        y += 30
        for k, im in enumerate(ims):
            x = (k % cols) * (TW + 4)
            yy = y + (k // cols) * (TH + 4)
            if im is not None:
                t = im.copy()
                t.thumbnail((TW, TH))
                sheet.paste(t, (x, yy))
            d.rectangle([x, yy, x + 26, yy + 16], fill="yellow")
            d.text((x + 3, yy + 2), str(k), fill="black")
        y += ((len(ims) + cols - 1) // cols) * (TH + 4)
    sheet.save(out / f"sheet_{names[0]}.jpg", quality=82)
    print(out / f"sheet_{names[0]}.jpg")


if __name__ == "__main__":
    main()
