"""src/episodes/*.json に書かれた素材をダウンロードする。

- いらすとや の画像 → public/illustrations/
- フリーBGM（甘茶の音楽工房）→ public/bgm/
- 立ち絵（東北ずん子・ずんだもんプロジェクト公式イラスト）→ public/characters/（余白を切り取り、高さ1400pxに縮小）
- 効果音（効果音ラボ）→ public/se/

どちらも素材の再配布が禁止されているため Git には含めていない。レンダリング前にこのスクリプトで取得する。
"""

import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EPISODES = ROOT / "src" / "episodes"


def download(url: str, out: Path, label: str, referer: str | None = None) -> bool:
    if out.exists():
        print(f"  skip  {out.relative_to(ROOT)}")
        return False
    out.parent.mkdir(parents=True, exist_ok=True)
    headers = {"User-Agent": "Mozilla/5.0"}
    if referer:
        headers["Referer"] = referer
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as res:
            out.write_bytes(res.read())
    except Exception as e:  # 1つ失敗しても残りの素材は取得する
        print(f"  FAIL  {out.relative_to(ROOT)}  {label}: {e}")
        return False
    print(f"  saved {out.relative_to(ROOT)}  {label}")
    return True


def fit_character(path: Path, height: int = 1400) -> None:
    """立ち絵の透明な余白を切り取り、扱いやすい大きさに縮小する（配布画像は高さ7000px以上ある）"""
    from PIL import Image

    im = Image.open(path).convert("RGBA")
    im = im.crop(im.getbbox())
    width = round(im.width * height / im.height)
    im.resize((width, height), Image.LANCZOS).save(path, optimize=True)


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

        character = episode.get("character")
        if character:
            for expression, info in character["images"].items():
                out = ROOT / "public" / info["file"]
                if not info.get("url"):
                    if not out.exists():
                        print(f"  (URLなし) {out.relative_to(ROOT)}  … {character.get('howto', '配布元から取得してください')}")
                    continue
                if download(info["url"], out, f"{character['name']}（{expression}）"):
                    fit_character(out)

        for key, info in episode.get("sounds", {}).items():
            # 効果音ラボは直リンク禁止のため、配布ページを Referer にして取得する
            page = info["url"].rsplit("/mp3/", 1)[0] + "/"
            download(info["url"], ROOT / "public" / info["file"], f"{info['title']}（{key}）", referer=page)


if __name__ == "__main__":
    main()
