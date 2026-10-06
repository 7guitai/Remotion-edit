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
COUNTDOWN = 3 * FPS  # クイズ出題のあとの考える時間
ANSWER_PAUSE = 30  # 1ページ1雑学：振りのあと答えを出すまで
ANSWER_TAIL = 24
EXPLAIN_PAUSE = 12  # 答えのあと解説を読むまで


def seconds(voice: Path) -> float:
    with wave.open(str(voice)) as w:
        return w.getnframes() / w.getframerate()


REPLY_GAP = 10  # 2ch風：見出しとレス、レスとレスの間


def slide_frames(
    voice: Path, slide: dict, gap: int = TAIL, fps: int = FPS, pause: int = ANSWER_PAUSE
) -> int:
    if slide.get("type") == "thread":
        cursor = LEAD_IN + math.ceil(seconds(voice) * FPS)
        for k in range(len(slide.get("replies", []))):
            reply = voice.with_name(f"{voice.stem}-r{k}.wav")
            cursor += REPLY_GAP + math.ceil(seconds(reply) * FPS)
        return cursor + ANSWER_TAIL
    if slide.get("type") == "trivia" and slide.get("answer"):
        answer = voice.with_name(voice.stem + "-answer.wav")
        start = LEAD_IN + math.ceil(seconds(voice) * FPS) + pause
        end = start + math.ceil(seconds(answer) * FPS)
        if slide.get("explain"):
            explain = voice.with_name(voice.stem + "-explain.wav")
            end += EXPLAIN_PAUSE + math.ceil(seconds(explain) * FPS)
        return end + ANSWER_TAIL
    question = slide.get("type") == "quiz" and "answer" not in slide
    return LEAD_IN + math.ceil(seconds(voice) * fps) + gap + (COUNTDOWN if question else 0)


def timestamp(frames: int, fps: int = FPS) -> str:
    s = frames // fps
    if s >= 3600:
        return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}"
    return f"{s // 60}:{s % 60:02d}"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("episode")
    args = p.parse_args()

    ep = json.loads((ROOT / "src" / "episodes" / f"{args.episode}.json").read_text(encoding="utf-8"))
    voice_dir = ROOT / "public" / "voice" / ep["id"]

    fps = ep.get("fps", FPS)
    gap = ep.get("slideGap", TAIL)
    chapters = []
    frame = 0
    for i, slide in enumerate(ep["slides"]):
        if slide.get("chapter"):
            chapters.append(f"{timestamp(frame, fps)} {slide['chapter']}")
        frame += slide_frames(voice_dir / f"{i:03d}.wav", slide, gap, fps, ep.get("answerPause", ANSWER_PAUSE))

    lines = []
    if ep.get("pr"):
        lines += ["【PR】この動画には広告（アフィリエイトリンク）が含まれます。", ""]
    if ep.get("description"):
        lines += [ep["description"], ""]
    if ep.get("source"):
        lines += [f"▼ 詳しい解説記事（{ep['source']['name']}）", ep["source"]["url"], ""]
    links = [l for l in ep.get("links", [])]
    if links:
        lines += ["▼ 紹介した製品"]
        lines += [f"・{l['label']}\n  {l['url'] or '（リンクを入れる）'}" for l in links]
        lines += [""]
    # ショートにはチャプターが付かないので目次は出さない
    if chapters and ep.get("format") != "short":
        lines += ["▼ 目次", *chapters, ""]
    lines += [
        "▼ 使用素材",
        "音声：" + "、".join(
            f"VOICEVOX:{n}"
            for n in dict.fromkeys(
                [ep.get("voice", {}).get("name", "ずんだもん")]
                + [v["name"] for v in ep.get("replyVoices", [])]
            )
        ),
        *([f"BGM：{ep['bgm']['credit']}「{ep['bgm']['title']}」"] if ep.get("bgm") else []),
        *([f"環境音：{ep['ambient']['name']}"] if ep.get("ambient") else []),
        "イラスト：" + "、".join(dict.fromkeys(i.get("credit", "いらすとや") for i in ep["illustrations"].values())),
        "",
    ]
    if ep.get("hashtags"):
        lines += [" ".join(f"#{t}" for t in ep["hashtags"])]

    out = ROOT / "out" / f"{ep['id']}-description.txt"
    out.parent.mkdir(exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(out.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
