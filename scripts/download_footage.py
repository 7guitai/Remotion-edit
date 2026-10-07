"""footage/catalog.json に載せたフリー素材（NASA の画像・映像など）を public/footage/ にダウンロードする。

使い方:
  python3 scripts/download_footage.py            # 全部
  python3 scripts/download_footage.py 月 地球     # タグで絞り込み

素材はファイルが大きいので Git には含めない（.gitignore で除外）。
長い動画は clips に書いた部分だけを短いクリップ（音なし）に切り出す。長い動画の後ろの方を
Remotion で直接読むと時間切れになることがあるため。
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


def cut(src: Path, clip: dict) -> None:
    """imageio-ffmpeg の ffmpeg で、start 秒から duration 秒を切り出す（キーフレームを細かく入れ直す）"""
    import subprocess

    import imageio_ffmpeg

    out = OUT / clip["file"]
    if out.exists():
        print(f"  skip  {clip['file']}")
        return
    subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-v", "error", "-y", "-ss", str(clip["start"]), "-i", str(src),
         "-t", str(clip["duration"]), "-an",
         # speed を指定するとスローにする（短い使える部分を長く見せる）
         "-vf", f"setpts=PTS/{clip.get('speed', 1)}",
         "-c:v", "libx264", "-crf", "18", "-g", "15",
         "-pix_fmt", "yuv420p", str(out)],
        check=True,
    )
    print(f"  cut   {clip['file']}  {clip['ja']}")


def main() -> None:
    tags = set(sys.argv[1:])
    OUT.mkdir(parents=True, exist_ok=True)
    for item in json.loads(CATALOG.read_text(encoding="utf-8"))["items"]:
        if tags and not tags & set(item["tags"]):
            continue
        out = OUT / item["file"]
        if out.exists():
            print(f"  skip  {item['file']}")
        else:
            fetch(item["url"], out)
            print(f"  saved {item['file']}  {out.stat().st_size / 1e6:.1f}MB  {item['ja']}")
        for clip in item.get("clips", []):
            cut(out, clip)


if __name__ == "__main__":
    main()
