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
python3 - "$OUT" "$@" <<'PY'
import sys
from PIL import Image
out, frames = sys.argv[1], sys.argv[2:]
ims = [Image.open(f"{out}/f{f}.png").resize((270, 480)) for f in frames]
cols = 7
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (280 * cols, 490 * rows), "#333")
for i, im in enumerate(ims):
    sheet.paste(im, ((i % cols) * 280, (i // cols) * 490))
sheet.save(f"{out}/sheet.png")
print(f"{out}/sheet.png")
PY
