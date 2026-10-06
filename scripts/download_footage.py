"""footage/catalog.json に載せたフリー素材（NASA の画像・映像など）を public/footage/ にダウンロードする。

使い方:
  python3 scripts/download_footage.py            # 全部
  python3 scripts/download_footage.py 月 地球     # タグで絞り込み

素材はファイルが大きいので Git には含めない（.gitignore で除外）。
"""

import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "footage" / "catalog.json"
OUT = ROOT / "public" / "footage"


def fetch(url: str, out: Path) -> None:
    req = urllib.request.Request(url.replace("http://", "https://"), headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req) as res, open(out, "wb") as f:
                while chunk := res.read(1 << 20):
                    f.write(chunk)
            return
        except urllib.error.URLError:
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))


def main() -> None:
    tags = set(sys.argv[1:])
    OUT.mkdir(parents=True, exist_ok=True)
    for item in json.loads(CATALOG.read_text(encoding="utf-8"))["items"]:
        if tags and not tags & set(item["tags"]):
            continue
        out = OUT / item["file"]
        if out.exists():
            print(f"  skip  {item['file']}")
            continue
        fetch(item["url"], out)
        print(f"  saved {item['file']}  {out.stat().st_size / 1e6:.1f}MB  {item['ja']}")


if __name__ == "__main__":
    main()
