"""src/episodes/*.json に書かれた素材をダウンロードする。

- いらすとや の画像 → public/illustrations/
- フリーBGM（甘茶の音楽工房 / OpenTracks（旧DOVA-SYNDROME））→ public/bgm/

どちらも素材の再配布が禁止されているため Git には含めていない。レンダリング前にこのスクリプトで取得する。
"""

import http.cookiejar
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EPISODES = ROOT / "src" / "episodes"


def download(url: str | None, out: Path, label: str) -> None:
    if out.exists():
        print(f"  skip  {out.relative_to(ROOT)}")
        return
    out.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    # 配信サーバー（jsDelivr など）が一時的にエラーを返すことがあるので、少し待って取り直す
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req) as res:
                out.write_bytes(res.read())
            break
        except urllib.error.HTTPError:
            if attempt == 3:
                raise
            time.sleep(2 * (attempt + 1))
    print(f"  saved {out.relative_to(ROOT)}  {label}")


def opentracks_url(track_id: int) -> str:
    """OpenTracks はダウンロードページのフォームを送ると、期限付きの MP3 の URL にリダイレクトされる"""
    page = f"https://opentracks.com/bgm/detail/{track_id}/download"
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())
    )
    opener.addheaders = [("User-Agent", "Mozilla/5.0")]
    with opener.open(page) as res:
        token = re.search(r'name="csrfmiddlewaretoken" value="([^"]+)"', res.read().decode()).group(1)
    data = urllib.parse.urlencode({"csrfmiddlewaretoken": token, "track": 1}).encode()
    req = urllib.request.Request(page, data=data, headers={"Referer": page})
    with opener.open(req) as res:
        return res.geturl()


def main() -> None:
    for path in sorted(EPISODES.glob("*.json")):
        episode = json.loads(path.read_text(encoding="utf-8"))
        print(f"[{episode['id']}]")

        bgm = episode.get("bgm")
        if bgm:
            out = ROOT / "public" / "bgm" / bgm["file"]
            url = bgm.get("url") or (None if out.exists() else opentracks_url(bgm["opentracks"]))
            download(url, ROOT / "public" / "bgm" / bgm["file"], f"{bgm['title']}（{bgm['credit']}）")

        for name, info in episode["illustrations"].items():
            url = info.get("url")
            if not url:
                print(f"  (URLなし) {name}  … いらすとやで「{info['irasutoya']}」を探して保存してください")
                continue
            download(url, ROOT / "public" / "illustrations" / name, info["irasutoya"])


if __name__ == "__main__":
    main()
