#!/usr/bin/env bash
# 確認用の静止画を書き出して1枚のシートにまとめる。
# 使い方: bash scripts/render_math_stills.sh <id> <出力フォルダ> <フレーム> [<フレーム> ...]
set -euo pipefail
cd "$(dirname "$0")/.."
ID="$1"; OUT="$2"; shift 2
mkdir -p "$OUT"
for f in "$@"; do
  npx remotion still "$ID" "$OUT/f$f.png" --frame="$f" --log=error
done
# 1枚のシートに並べる（7列。Pillow がない環境でも動くよう ffmpeg の xstack を使う）
python3 - "$OUT" "$@" <<'PY'
import subprocess, sys
out, frames = sys.argv[1], sys.argv[2:]
cols = 7
args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
for f in frames:
    args += ["-i", f"{out}/f{f}.png"]
n = len(frames)
scale = "".join(f"[{i}:v]scale=270:480,pad=280:490:0:0:#333333[v{i}];" for i in range(n))
layout = "|".join(f"{(i % cols) * 280}_{(i // cols) * 490}" for i in range(n))
inputs = "".join(f"[v{i}]" for i in range(n))
graph = scale + (f"{inputs}xstack=inputs={n}:layout={layout}:fill=#333333" if n > 1 else "[v0]copy")
subprocess.run(args + ["-filter_complex", graph, "-frames:v", "1", f"{out}/sheet.png"], check=True)
print(f"{out}/sheet.png")
PY
