"""台本（Markdown）から、Gemini にエピソード JSON（src/episodes/<id>.json）を組み立てさせる。

分担:
  - 台本の作成・レビュー … Claude（人）が drafts/<id>.md に書く
  - 動画制作（スライド構成・テロップ・読み上げ文・図表・イラスト選び・読み替え辞書）… Gemini

使い方:
  GEMINI_API_KEY=... python3 scripts/gemini_produce.py drafts/<id>.md --id <id>
  オプション: --model gemini-4-hydrogen（既定） / --title "動画タイトル" / --pr

Gemini の OpenAI 互換エンドポイントを使い、キーは Authorization: Bearer で送る。
（クラウド環境ではプロキシがキーを差し込むので、GEMINI_API_KEY は proxy-injected などの仮の値でよい）
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EPISODES = ROOT / "src" / "episodes"
INDEX = EPISODES / "index.ts"
ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

# 既存エピソードで使っている BGM（甘茶の音楽工房）から選ばせる
BGM_CHOICES = [
    {
        "file": "tenshinoyume.mp3",
        "title": "天使の夢",
        "credit": "甘茶の音楽工房",
        "page": "https://amachamusic.chagasi.com/music_tenshinoyume.html",
        "url": "https://amachamusic.chagasi.com/mp3/tenshinoyume.mp3",
        "mood": "やさしい・眠り・ゆったり",
    },
    {
        "file": "simplestyle.mp3",
        "title": "シンプルスタイル",
        "credit": "甘茶の音楽工房",
        "page": "https://amachamusic.chagasi.com/music_simplestyle.html",
        "url": "https://amachamusic.chagasi.com/mp3/simplestyle.mp3",
        "mood": "明るい・解説・ガジェット",
    },
]

SYSTEM = """あなたは「ずんだもん解説動画」（Remotion）の制作担当です。
渡された台本を、動画1本分のエピソード JSON に変換してください。出力は JSON オブジェクト1つだけ。

## 出力する JSON のキー
- "title": 動画タイトル（指定があればそれを使う）
- "pr": 真偽値（指定どおり）
- "source": 元記事があれば {"name", "url"}。なければ省略
- "bgm": BGM候補から雰囲気に合う1つを選び、"mood" 以外のキーをそのまま入れる
- "readings": 読み上げで誤読しそうな英字・記号・語の読み替え {"表記": "カタカナ読み"}。
  "65W"→「65ワット」、"130g"→「130グラム」は自動なので不要
- "illustrations": スライドで使う画像 {"ファイル名.png": {"emoji": "仮表示の絵文字1つ", "irasutoya": "いらすとやで探す画像名"}}。
  "url" は書かない（人が後で確認して入れる）。ファイル名は英小文字とアンダースコア
- "slides": スライドの配列（下記）
- "description": 概要欄の紹介文（2〜3文）
- "hashtags": ハッシュタグ3〜5個（# なし、"ずんだもん" を含める）

## スライド
全スライド共通: "text"（画面上部のテロップ。1行18文字前後、\\n で改行、最大2行）、
"speech"（読み上げ文。text と同じでよければ省略）、"chapter"（新しい章の最初のスライドにだけ付ける見出し）
- イラスト: {"text", "image": illustrations のファイル名}（"type" は省略）
- 箇条書き: {"type": "points", "text", "items": [{"label": 短い見出し, "body": 説明}]}（items は2〜4個）
- 比較表: {"type": "table", "text", "columns": [...], "rows": [[...]], "note": 注記}
- 横棒グラフ: {"type": "bars", "text", "bars": [{"label", "sub", "pc": 数値, "phone": 数値}], "note"}（2項目の配分の比較だけ）

## ルール
- 語尾はずんだもん口調（「〜のだ」「〜なのだ」）
- 台本の内容・数値・事実を変えない。足さない。台本にない数値をグラフや表に入れない
- 台本のひとまとまりの話ごとに1スライド。1スライドの speech は60文字程度まで
- 比較や結論は points / table を使い、それ以外はイラスト
- 最初のスライドに chapter "はじめに"、最後は締めのあいさつ
"""


def call_gemini(model: str, messages: list, retries: int = 8) -> str:
    key = os.environ.get("GEMINI_API_KEY", "proxy-injected")
    body = json.dumps(
        {
            "model": model,
            "messages": messages,
            "response_format": {"type": "json_object"},
        }
    ).encode()
    for attempt in range(retries):
        req = urllib.request.Request(
            ENDPOINT,
            data=body,
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"},
        )
        try:
            with urllib.request.urlopen(req, timeout=300) as res:
                data = json.load(res)
            return data["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")[:300]
            # 混雑（503）とレート制限（429）だけ待って再試行する
            if e.code in (429, 500, 503) and attempt < retries - 1:
                wait = min(20 * (attempt + 1), 120)
                print(f"  {e.code}: 混雑中。{wait}秒後に再試行します（{attempt + 1}/{retries}）", file=sys.stderr)
                time.sleep(wait)
                continue
            sys.exit(f"Gemini API エラー {e.code}: {detail}")
    sys.exit("Gemini API が応答しませんでした")


def parse_json(text: str) -> dict:
    text = text.strip()
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0) if m else text)


def validate(ep: dict) -> list[str]:
    """Remotion 側の型（src/episodes/index.ts）に合わない点を列挙する。"""
    errors = []
    for key in ("title", "bgm", "illustrations", "slides"):
        if key not in ep:
            errors.append(f"{key} がありません")
    for i, s in enumerate(ep.get("slides", [])):
        t = s.get("type", "illust")
        if "text" not in s:
            errors.append(f"slides[{i}] に text がありません")
        if t == "illust":
            if s.get("image") not in ep.get("illustrations", {}):
                errors.append(f"slides[{i}] の image '{s.get('image')}' が illustrations にありません")
        elif t == "points":
            if not s.get("items"):
                errors.append(f"slides[{i}] (points) に items がありません")
        elif t == "table":
            cols = s.get("columns", [])
            if any(len(r) != len(cols) for r in s.get("rows", [])):
                errors.append(f"slides[{i}] (table) の行と列の数が合いません")
        elif t == "bars":
            if not s.get("bars"):
                errors.append(f"slides[{i}] (bars) に bars がありません")
        else:
            errors.append(f"slides[{i}] の type '{t}' は使えません")
    return errors


def register(episode_id: str) -> None:
    """src/episodes/index.ts の EPISODES に追加する（未登録のときだけ）。"""
    src = INDEX.read_text(encoding="utf-8")
    if f'"./{episode_id}.json"' in src:
        return
    var = re.sub(r"[-_](\w)", lambda m: m.group(1).upper(), episode_id)
    var = re.sub(r"\W", "", var)
    if var[0].isdigit():
        var = "ep" + var
    imports = re.findall(r'^import .+ from "\./.+\.json";\n', src, re.M)
    last = imports[-1]
    src = src.replace(last, last + f'import {var} from "./{episode_id}.json";\n', 1)
    # 既存の並びの最後に追加する
    src = re.sub(r"(export const EPISODES: Episode\[\] = \[\n(?:  .+\n)*)", rf"\1  {var} as Episode,\n", src, 1)
    INDEX.write_text(src, encoding="utf-8")
    print(f"  {INDEX.relative_to(ROOT)} に登録しました")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("draft", type=Path, help="台本の Markdown")
    p.add_argument("--id", required=True, help="エピソード ID（コンポジション ID）")
    p.add_argument("--model", default="gemini-4-hydrogen")
    p.add_argument("--title")
    p.add_argument("--pr", action="store_true", help="アフィリエイトなどを含む（画面に PR 表示）")
    p.add_argument("--force", action="store_true", help="既存の JSON を上書きする")
    args = p.parse_args()

    out = EPISODES / f"{args.id}.json"
    if out.exists() and not args.force:
        sys.exit(f"{out.relative_to(ROOT)} は既にあります（上書きするなら --force）")

    draft = args.draft.read_text(encoding="utf-8")
    sample = json.loads((EPISODES / "charger-power-split.json").read_text(encoding="utf-8"))
    sample_slides = sample["slides"][:6]
    user = (
        f"## 指定\n- title: {args.title or '（台本から考える）'}\n- pr: {str(args.pr).lower()}\n\n"
        f"## BGM候補\n{json.dumps(BGM_CHOICES, ensure_ascii=False, indent=1)}\n\n"
        f"## 既存動画のスライド例（書き方の参考）\n{json.dumps(sample_slides, ensure_ascii=False, indent=1)}\n\n"
        f"## 台本\n{draft}"
    )
    messages = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}]

    print(f"Gemini（{args.model}）に制作を依頼しています…", file=sys.stderr)
    episode = parse_json(call_gemini(args.model, messages))

    errors = validate(episode)
    if errors:
        # 1回だけ直させる
        print("  形式の誤りを直させます:\n   - " + "\n   - ".join(errors), file=sys.stderr)
        messages += [
            {"role": "assistant", "content": json.dumps(episode, ensure_ascii=False)},
            {"role": "user", "content": "次の誤りを直した JSON 全体を出力してください:\n" + "\n".join(errors)},
        ]
        episode = parse_json(call_gemini(args.model, messages))
        errors = validate(episode)
        if errors:
            sys.exit("形式の誤りが残りました:\n - " + "\n - ".join(errors))

    episode = {"id": args.id, **{k: v for k, v in episode.items() if k != "id"}}
    if args.title:
        episode["title"] = args.title
    episode["pr"] = args.pr
    episode.get("bgm", {}).pop("mood", None)

    out.write_text(json.dumps(episode, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"  {out.relative_to(ROOT)} を書き出しました（スライド {len(episode['slides'])} 枚）")
    register(args.id)


if __name__ == "__main__":
    main()
