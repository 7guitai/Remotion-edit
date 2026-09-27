"""src/script.json の illustrations に書かれた いらすとや の画像を public/illustrations/ に保存する。

いらすとやの素材は再配布禁止のため Git には含めていない。レンダリング前にこのスクリプトで取得する。
"""

import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "src" / "script.json"
OUT_DIR = ROOT / "public" / "illustrations"


def main() -> None:
    illustrations = json.loads(SCRIPT.read_text(encoding="utf-8"))["illustrations"]
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, info in illustrations.items():
        out = OUT_DIR / name
        if out.exists():
            print(f"  skip  {name}")
            continue
        url = info.get("url")
        if not url:
            print(f"  (URLなし) {name}  … いらすとやで「{info['irasutoya']}」を探して保存してください")
            continue
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as res:
            out.write_bytes(res.read())
        print(f"  saved {name}  {info['irasutoya']}")


if __name__ == "__main__":
    main()
