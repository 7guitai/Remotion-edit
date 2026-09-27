"""src/episodes/*.json に書かれた素材をダウンロードする。

- いらすとや の画像 → public/illustrations/
- フリーBGM（甘茶の音楽工房）→ public/bgm/

どちらも素材の再配布が禁止されているため Git には含めていない。レンダリング前にこのスクリプトで取得する。
"""

import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EPISODES = ROOT / "src" / "episodes"


def download(url: str, out: Path, label: str) -> None:
    if out.exists():
        print(f"  skip  {out.relative_to(ROOT)}")
        return
    out.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as res:
        out.write_bytes(res.read())
    print(f"  saved {out.relative_to(ROOT)}  {label}")


def main() -> None:
    for path in sorted(EPISODES.glob("*.json")):
        episode = json.loads(path.read_text(encoding="utf-8"))
        print(f"[{episode['id']}]")

        bgm = episode["bgm"]
        download(bgm["url"], ROOT / "public" / "bgm" / bgm["file"], f"{bgm['title']}（{bgm['credit']}）")

        for name, info in episode["illustrations"].items():
            url = info.get("url")
            if not url:
                print(f"  (URLなし) {name}  … いらすとやで「{info['irasutoya']}」を探して保存してください")
                continue
            download(url, ROOT / "public" / "illustrations" / name, info["irasutoya"])


if __name__ == "__main__":
    main()
