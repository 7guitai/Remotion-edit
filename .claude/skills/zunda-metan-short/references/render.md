# 書き出し

```bash
npx tsc --noEmit                                             # 型チェック
npx remotion still <id>-short out/check.png --frame=300 --scale=0.4
npx remotion render <id>-short out/raw.mp4 --concurrency=4
# ショート向けに音量をそろえる（-14 LUFS）
ffmpeg -i out/raw.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -ar 48000 out/<id>-short.mp4
```

- 4 コアで 60 秒の動画が約 4〜5 分。
- 書き出した後、`ffmpeg -ss <秒> -i out/<id>-short.mp4 -frames:v 1` で数コマ取り出して最終確認する。
- `out/` は Git 対象外。動画はユーザーに直接渡す。
