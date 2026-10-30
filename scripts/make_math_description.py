"""数学ショートの YouTube 用テキスト（タイトル・概要欄・ハッシュタグ）を out/<id>-description.txt に書き出す。

使い方: python3 scripts/make_math_description.py birthday-paradox
"""

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("id")
    args = p.parse_args()

    ep = json.loads((ROOT / "src" / "math-shorts" / f"{args.id}.json").read_text(encoding="utf-8"))
    voice_name = {13: "青山龍星", 84: "青山龍星", 3: "ずんだもん"}.get(ep.get("voice", {}).get("speaker", 13), "青山龍星")
    tags = " ".join(f"#{t}" for t in ep.get("hashtags", []))

    lines = [
        f"【タイトル】{ep['title']}",
        "",
        "【概要欄】",
        ep.get("description", ""),
        "",
        tags,
        "",
        "▼ 使用素材",
        f"音声：VOICEVOX:{voice_name}",
    ]
    if ep.get("bgm"):
        lines.append(f"BGM：{ep['bgm']['title']} / {ep['bgm']['credit']}（{ep['bgm']['page']}）")

    out = ROOT / "out" / f"{ep['id']}-description.txt"
    out.parent.mkdir(exist_ok=True)
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(out.read_text(encoding="utf-8"))


if __name__ == "__main__":
    main()
