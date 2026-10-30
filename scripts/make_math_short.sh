#!/usr/bin/env bash
# 数学ショートを1本、音声→書き出し→音量調整→概要欄まで作る。
# 使い方: bash scripts/make_math_short.sh <id>          （src/math-shorts/<id>.json と登録済みのコンポジションが必要）
#        bash scripts/make_math_short.sh <id> --no-voice （音声を作り直さない）
set -euo pipefail
cd "$(dirname "$0")/.."

ID="$1"
JSON="src/math-shorts/$ID.json"
[ -f "$JSON" ] || { echo "見つかりません: $JSON"; exit 1; }
[ -d node_modules ] || npm ci

# BGM（再配布禁止のため Git 管理外。配布元から取得）
BGM_FILE=$(python3 -c "import json;print(json.load(open('$JSON'))['bgm']['file'])")
BGM_URL=$(python3 -c "import json;print(json.load(open('$JSON'))['bgm']['url'])")
mkdir -p public/bgm
[ -f "public/bgm/$BGM_FILE" ] || curl -sSL -A "Mozilla/5.0" -o "public/bgm/$BGM_FILE" "$BGM_URL"

if [ "${2:-}" != "--no-voice" ]; then
  # VOICEVOX エンジン（Docker。Docker Hub は回数制限があるので Google のミラーから）
  if ! curl -s http://127.0.0.1:50021/version >/dev/null; then
    docker info >/dev/null 2>&1 || { (dockerd >/tmp/dockerd.log 2>&1 &); for i in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done; }
    docker rm -f vv >/dev/null 2>&1 || true
    docker run -d --rm --name vv -p 127.0.0.1:50021:50021 mirror.gcr.io/voicevox/voicevox_engine:cpu-latest >/dev/null
    for i in $(seq 1 90); do curl -s http://127.0.0.1:50021/version >/dev/null && break; sleep 2; done
  fi
  SPEAKER=$(python3 -c "import json;print(json.load(open('$JSON')).get('voice',{}).get('speaker',13))")
  SPEED=$(python3 -c "import json;print(json.load(open('$JSON')).get('voice',{}).get('speed',1.05))")
  python3 scripts/generate_voice.py "$ID" --engine voicevox --speaker "$SPEAKER" --speed "$SPEED"
fi

npx tsc --noEmit
mkdir -p out
npx remotion render "$ID" "out/$ID-raw.mp4" --log=error
# YouTube の基準の音量（-14 LUFS）にそろえる
ffmpeg -hide_banner -loglevel error -y -i "out/$ID-raw.mp4" -c:v copy \
  -af loudnorm=I=-14:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k "out/$ID.mp4"
rm "out/$ID-raw.mp4"
python3 scripts/make_math_description.py "$ID"
ffprobe -v error -show_entries format=duration -of csv=p=0 "out/$ID.mp4" | xargs printf "長さ: %.1f 秒\n"
