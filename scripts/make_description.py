"""YouTube の概要欄テキストを out/<id>-description.txt に書き出す。

チャプターの時刻は public/voice/<id>/ の音声の長さから計算する（src/slides.ts と同じ計算）。
使い方: python3 scripts/make_description.py charger-power-split
"""

import argparse
import json
import math
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
LEAD_IN = 6
TAIL = 12


def slide_frames(voice: Path) -> int:
    with wave.open(str(voice)) as w:
        seconds = w.getnframes() / w.getframerate()
    return LEAD_IN + math.ceil(seconds * FPS) + TAIL


def timestamp(frames: int) -> str:
    s = frames // FPS
    return f"{s // 60}:{s % 60:02d}"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("episode")
    args = p.parse_args()

    ep = json.loads((ROOT / "src" / "episodes" / f"{args.episode}.json").read_text(encoding="utf-8"))
    voice_dir = ROOT / "public" / "voice" / ep["id"]

    chapters = []
    frame = 0
    for i, slide in enumerate(ep["slides"]):
        if slide.get("chapter"):
            chapters.append(f"{timestamp(frame)} {slide['chapter']}")
        frame += slide_frames(voice_dir / f"{i:03d}.wav")

    lines = []
    if ep.get("pr"):
        lines += ["【PR】この動画には広告（アフィリエイトリンク）が含まれます。", ""]
    if ep.get("description"):
        lines += [ep["description"], ""]
    if ep.get("sources"):
        lines += ["▼ 根拠・一次資料"]
        lines += [f"・{x['label']}\n  {x['url']}" for x in ep["sources"]]
        lines += [""]
    elif ep.get("source"):
        label = "参考資料" if ep.get("format") == "short" else "詳しい解説記事"
        lines += [f"▼ {label}（{ep['source']['name']}）", ep["source"]["url"], ""]
    links = [l for l in ep.get("links", [])]
    if links:
        lines += ["▼ 紹介した製品"]
        lines += [f"・{l['label']}\n  {l['url'] or '（リンクを入れる）'}" for l in links]
        lines += [""]
    if chapters:
        lines += ["▼ 目次", *chapters, ""]
    lines += [
        "▼ 使用素材",
        "音声：VOICEVOX:ずんだもん",
        f"BGM：{ep['bgm']['credit']}「{ep['bgm']['title']}」",
    ]
    if ep.get("character"):
        c = ep["character"]
        lines += [f"立ち絵：{c['credit']}（{c['page']}）"]
    if ep.get("soundCredit"):
        lines += [f"効果音：{ep['soundCredit']['name']}（{ep['soundCredit']['page']}）"]
    if ep.get("illustrations"):
        lines += ["イラスト：いらすとや"]
    lines += [""]
    if ep.get("hashtags"):
        lines += [" ".join(f"#{t}" for t in ep["hashtags"])]

    out = ROOT / "out" / f"{ep['id']}-description.txt"
    out.parent.mkdir(exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(out.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
