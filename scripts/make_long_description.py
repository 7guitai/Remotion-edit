"""数学ロング動画の YouTube 用テキスト（タイトル・概要欄・目次・クレジット）を out/<id>-description.txt に書き出す。

目次の時刻は public/voice/<id>/ の音声の長さから計算する（src/math-long/timeline.ts と同じ計算）。
使い方: python3 scripts/make_long_description.py golden-ratio-long
"""

import argparse
import json
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEAD_IN = 1.0
GAP = 0.45
VOICE_NAMES = {13: "青山龍星", 84: "青山龍星", 3: "ずんだもん"}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("id")
    args = p.parse_args()

    ep = json.loads((ROOT / "src" / "math-long" / f"{args.id}.json").read_text(encoding="utf-8"))
    t = LEAD_IN
    chapters = []
    for i, line in enumerate(ep["slides"]):
        if line.get("chapter"):
            # 最初のチャプターは 0:00 から始める決まり
            s = 0 if not chapters else int(t)
            chapters.append(f"{s // 60}:{s % 60:02d} {line['chapter']}")
        with wave.open(str(ROOT / "public" / "voice" / ep["id"] / f"{i:03d}.wav")) as w:
            t += w.getnframes() / w.getframerate()
        t += line.get("pause", GAP)

    voice = VOICE_NAMES.get(ep.get("voice", {}).get("speaker", 13), "青山龍星")
    lines = [
        f"【タイトル】{ep['title']}",
        "",
        "【概要欄】",
        ep.get("description", ""),
        "",
        "▼ 目次",
        *chapters,
        "",
        " ".join(f"#{h}" for h in ep.get("hashtags", [])),
        "",
        "▼ 使用素材",
        f"音声：VOICEVOX:{voice}",
    ]
    if ep.get("bgm"):
        lines.append(f"BGM：{ep['bgm']['title']} / {ep['bgm']['credit']}（{ep['bgm']['page']}）")
    out = ROOT / "out" / f"{ep['id']}-description.txt"
    out.parent.mkdir(exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(out.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
