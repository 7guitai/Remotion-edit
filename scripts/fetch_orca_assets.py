"""Orca 解説ショート用に、Orca 公式リポジトリ（stablyai/orca・MIT License）の画面素材を取ってくる。

- アプリのアイコン、README のヒーロー画像
- 機能紹介のアニメーション（animated WebP）→ Remotion で再生できる mp4 に変換

保存先: public/shorts/orca/media/（Git には含めない）
使い方: python3 scripts/fetch_orca_assets.py [既存の clone のパス]
"""

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "shorts" / "orca" / "media"
FEATURES = ["parallel-worktrees", "orchestration", "mobile-companion", "annotate-ai-diffs", "git-integration", "chat-or-terminal", "bots"]


def webp_to_mp4(src: Path, dst: Path) -> None:
    """animated WebP を一定フレームレートの mp4 にする（各フレームの表示時間を守る）"""
    im = Image.open(src)
    with tempfile.TemporaryDirectory() as tmp:
        lines = []
        for i in range(im.n_frames):
            im.seek(i)
            frame = im.convert("RGB")
            # 偶数サイズにそろえる（H.264 の制約）
            w, h = frame.size
            frame = frame.crop((0, 0, w - w % 2, h - h % 2))
            path = Path(tmp) / f"{i:05d}.png"
            frame.save(path)
            dur = (im.info.get("duration") or 40) / 1000
            lines.append(f"file '{path}'\nduration {dur:.3f}")
        lines.append(f"file '{path}'")
        listfile = Path(tmp) / "list.txt"
        listfile.write_text("\n".join(lines))
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(listfile),
             "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "18", "-movflags", "+faststart", str(dst)],
            check=True,
        )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = None
    if len(sys.argv) > 1:
        repo = Path(sys.argv[1])
    else:
        tmp = tempfile.mkdtemp()
        repo = Path(tmp) / "orca"
        subprocess.run(["git", "clone", "-q", "--depth", "1", "https://github.com/stablyai/orca", str(repo)], check=True)
    shutil.copy(repo / "resources" / "build" / "icon.png", OUT / "icon.png")
    shutil.copy(repo / "docs" / "assets" / "readme-hero.jpg", OUT / "hero.jpg")
    for name in FEATURES:
        src = repo / "docs" / "assets" / "readme-features" / f"{name}.webp"
        shutil.copy(repo / "docs" / "assets" / "readme-features" / f"{name}.poster.jpg", OUT / f"{name}.jpg")
        webp_to_mp4(src, OUT / f"{name}.mp4")
        print("saved", name)
    if tmp:
        shutil.rmtree(tmp)


if __name__ == "__main__":
    main()
