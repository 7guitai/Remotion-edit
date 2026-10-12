"""長い動画の音声を Remotion を使わずに作る（Remotion の音声処理は一時ファイルでディスクを大量に使うため）。

Video.tsx / slides.ts と同じタイミングで、読み上げ（voice/<id>/NNN.wav）と BGM プレイリストを重ね、
ffmpeg で AAC（m4a）に書き出す。映像（--muted で書き出したもの）とは後で ffmpeg でつなぐ。
対応：style が relax / sleep など、読み上げが1スライド1ファイルの回
使い方: python3 scripts/mix_audio.py <エピソードID> <出力.m4a>
"""

import json
import math
import subprocess
import sys
import wave
from pathlib import Path

import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
LEAD_IN = 6
XF = 45  # BGM のクロスフェード（フレーム）


def load(path: Path) -> np.ndarray:
    """ffmpeg で 48kHz ステレオ float32 に読み込む"""
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    raw = subprocess.run([ff, "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)


def main() -> None:
    ep_id, out = sys.argv[1], sys.argv[2]
    ep = json.loads((ROOT / "src" / "episodes" / f"{ep_id}.json").read_text(encoding="utf-8"))
    fps = ep.get("fps", 30)
    gap = ep.get("slideGap", 12)
    starts, voices = [], []
    frame = 0
    for i, _ in enumerate(ep["slides"]):
        p = ROOT / "public" / "voice" / ep_id / f"{i:03d}.wav"
        with wave.open(str(p)) as w:
            sec = w.getnframes() / w.getframerate()
        starts.append(frame)
        voices.append(p)
        frame += LEAD_IN + math.ceil(sec * fps) + gap
    total = frame
    n = round(total / fps * SR)
    mix = np.zeros((n, 2), dtype=np.float32)
    f2s = lambda f: round(f / fps * SR)

    # 読み上げ
    for st, p in zip(starts, voices):
        a = load(p)
        s = f2s(st + LEAD_IN)
        e = min(n, s + len(a))
        mix[s:e] += a[: e - s]

    # BGM（ループ・フェード・クロスフェード）
    level = ep.get("bgmVolume", 0.1)
    tracks = ep.get("bgmPlaylist") or [dict(ep["bgm"], fromSlide=0)]
    for k, t in enumerate(tracks):
        f_from = 0 if k == 0 else starts[t["fromSlide"]] - XF
        f_to = total if k == len(tracks) - 1 else starts[tracks[k + 1]["fromSlide"]]
        length = f_to - f_from
        src = load(ROOT / "public" / "bgm" / t["file"])
        reps = math.ceil(f2s(length) / len(src)) + 1
        seg = np.tile(src, (reps, 1))[: f2s(length)]
        fi = 15 if k == 0 else XF
        fo = 45 if k == len(tracks) - 1 else XF
        fr = np.arange(len(seg)) / SR * fps
        env = np.clip(np.minimum(fr / fi, (length - fr) / fo), 0, 1) * level * t.get("volume", 1)
        s = f2s(f_from)
        mix[s : s + len(seg)] += seg * env[:, None].astype(np.float32)

    peak = float(np.abs(mix).max())
    if peak > 0.99:
        mix *= 0.99 / peak
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    subprocess.run(
        [ff, "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", "-c:a", "aac", "-b:a", "128k", out],
        input=mix.tobytes(),
        check=True,
    )
    print(f"{out}: {total / fps / 60:.2f} min, peak {peak:.2f}")


if __name__ == "__main__":
    main()
