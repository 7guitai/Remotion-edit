"""縦型ショート（src/shorts/<id>/script.json）の素材をダウンロードする。

- BGM（甘茶の音楽工房）→ public/bgm/

再配布が禁止されているので Git には含めない。レンダリング前に1回実行する。
（立ち絵は scripts/export_psd_parts.py で PSD から書き出す）
使い方: python3 scripts/download_short_assets.py ai-subscription
"""

import json
import sys
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent


def download(url: str, out: Path) -> None:
    if out.exists():
        print(f"  skip  {out.relative_to(ROOT)}")
        return
    out.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as res:
        out.write_bytes(res.read())
    print(f"  saved {out.relative_to(ROOT)}")


def main() -> None:
    short = sys.argv[1]
    script = json.loads((ROOT / "src" / "shorts" / short / "script.json").read_text(encoding="utf-8"))
    bgm = script["bgm"]
    download(bgm["url"], ROOT / "public" / "bgm" / bgm["file"])


if __name__ == "__main__":
    main()
