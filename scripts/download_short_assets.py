"""縦型ショート（src/shorts/<id>/script.json）の素材をダウンロードする。

- キャラクター立ち絵（東北ずん子・ずんだもんプロジェクト公式 https://zunko.jp/con_illust.html）
  → public/shorts/<id>/chars/
- BGM（甘茶の音楽工房）→ public/bgm/

どちらも再配布が禁止されているので Git には含めない。レンダリング前に1回実行する。
使い方: python3 scripts/download_short_assets.py ai-subscription
"""

import json
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
# script.json のキャラクター ID → zunko.jp の素材フォルダ
FOLDERS = {"zundamon": "zundamon", "metan": "methane"}


def download(url: str, out: Path) -> None:
    if out.exists():
        print(f"  skip  {out.relative_to(ROOT)}")
        return
    out.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as res:
        out.write_bytes(res.read())
    print(f"  saved {out.relative_to(ROOT)}")


def shrink(path: Path, height: int = 2400) -> None:
    """原寸（7000px 級）は重いので、余白を切って高さ 2400px に縮める"""
    im = Image.open(path).convert("RGBA")
    if im.height <= height:
        return
    im = im.crop(im.getbbox())
    im = im.resize((round(im.width * height / im.height), height), Image.LANCZOS)
    im.save(path, optimize=True)


def main() -> None:
    short = sys.argv[1]
    script = json.loads((ROOT / "src" / "shorts" / short / "script.json").read_text(encoding="utf-8"))
    for cid, ch in script["characters"].items():
        folder = FOLDERS[cid]
        for name in ch["images"].values():
            out = ROOT / "public" / "shorts" / short / "chars" / f"{name}.png"
            download(f"https://zunko.jp/sozai/{folder}/{name}.png", out)
            shrink(out)
    bgm = script["bgm"]
    download(bgm["url"], ROOT / "public" / "bgm" / bgm["file"])


if __name__ == "__main__":
    main()
