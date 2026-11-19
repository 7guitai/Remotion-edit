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


SYSTEM_SHORT = """あなたは「ずんだもん解説ショート」（縦型 1080×1920・60秒以内・Remotion）の制作担当です。
渡された台本を、ショート1本分のエピソード JSON に変換してください。出力は JSON オブジェクト1つだけ。

## 出力する JSON のキー
- "title": 動画タイトル（指定があればそれを使う）
- "series": 画面上部のシリーズ名（台本にあればそれ）
- "headline": 画面上部に常に出す短い見出し（全角14文字以内）
- "pr": 真偽値（指定どおり）
- "source": 引用資料 {"name", "url"}
- "bgm": BGM候補から雰囲気に合う1つを選び、"mood" 以外のキーをそのまま入れる
- "readings": 読み上げで誤読しそうな英字・記号・モデル名の読み替え {"表記": "カタカナ読み"}（例: "o4-mini": "オーフォーミニ"）
- "illustrations": {}（ショートでは使わない）
- "slides": スライドの配列（下記）
- "description": 概要欄の紹介文（2文）
- "hashtags": ハッシュタグ3〜5個（# なし、"ずんだもん" を含める）

## スライド（台本の見出し1つ＝1スライド）
全スライド共通:
- "text": 画面下部のずんだもんの字幕。読み上げ文を短く言い切った形で、全角32文字以内、改行 \\n は1つまで
- "speech": 読み上げ文（台本の「ずんだもん:」をそのまま。字幕にも出るので、モデル名などは英語表記のまま書き、読みは readings で指定）
- "expression": 台本の「表情:」（normal / question / happy / alert / wink）
- "se": 台本の「効果音:」（impact_soft / slide_in / chime_up / alert_soft / outro_chime）
- "cite": 資料の内容やデータを扱うスライドにだけ付ける短い出典表記（例: "OpenAI「Why language models hallucinate」(2025)"）
- "chapter": 不要
図解の種類（"type"）:
- "hook": {"headline": 大きな問い（\\n で2〜3行、強調したい語を【】で囲む）, "sub"?: 小見出し}
- "source": {"org", "date", "title": 原題, "titleJa": 日本語訳, "summary": 一言の補足}
- "versus": {"left": {"label", "value"?, "lines"?: [...], "metrics"?: [{"label", "value"}], "tone": "good|bad|neutral"}, "right": {同じ}, "note"?, "lead"?: 見出し, "leadNote"?: 1行の補足, "leadTone"?: "bad" など}（項目ごとの数値は metrics で並べる）
- "flow": {"steps": [{"label", "sub"?, "emoji"?, "tone"?}]}（3〜4段。最後の段が結論）
- "stacked": {"series": [{"label", "tone"}], "rows": [{"label", "values": [数値...]}], "note"}（values は series と同じ順・合計100）
- "ranking": {"title"?: 指標名, "rows": [{"label", "sub"?: 設定など, "value": 数値, "highlight"?: true}], "unit"?: "点", "note"?}（スコアの高い順。主役の行だけ highlight）
- "emphasis": {"big": 大きな一言（\\n 可、強調は【】）, "sub"?: 補足}
- "points": {"items": [{"label", "body"}]}（チェックリスト、2〜3個）
- "table": {"columns": [...], "rows": [[...]], "note"?, "highlightRow"?: 強調する行の番号（0始まり）}（一覧表。1列目は名前）

## ルール
- 語尾はずんだもん口調（「〜のだ」「〜なのだ」）
- 台本の内容・数値・事実を変えない。足さない。台本にない数値を入れない
- 台本の「画面:」の指示に合う type を選ぶ
- 字幕 text は1行16文字以内・2行まで
- 台本の「出典:」はそのスライドの cite にする（"出典：" の語は付けない）
- good=望ましい（緑）、bad=問題（赤）、neutral=どちらでもない（灰）
"""


USAGE_LOG = ROOT / "logs" / "gemini_usage.jsonl"


def log_usage(model: str, usage: dict, attempt: int, error: int | None = None) -> None:
    """1リクエストごとの使用トークン数（失敗ならステータスコード）を logs/gemini_usage.jsonl に追記する"""
    USAGE_LOG.parent.mkdir(exist_ok=True)
    row = {
        "time": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "model": model,
        "attempt": attempt + 1,
        "status": error or 200,
        "prompt_tokens": usage.get("prompt_tokens"),
        "completion_tokens": usage.get("completion_tokens"),
        "total_tokens": usage.get("total_tokens"),
    }
    with USAGE_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row) + "\n")
    if not error:
        print(
            f"  使用トークン: 入力 {row['prompt_tokens']} / 出力 {row['completion_tokens']} / 合計 {row['total_tokens']}",
            file=sys.stderr,
        )


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
            log_usage(model, data.get("usage") or {}, attempt)
            return data["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")[:300]
            # 混雑（503）とレート制限（429）だけ待って再試行する
            log_usage(model, {}, attempt, error=e.code)
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
        elif t == "hook":
            if not s.get("headline"):
                errors.append(f"slides[{i}] (hook) に headline がありません")
        elif t == "source":
            for k in ("org", "date", "title"):
                if not s.get(k):
                    errors.append(f"slides[{i}] (source) に {k} がありません")
        elif t == "versus":
            if not (s.get("left") and s.get("right")):
                errors.append(f"slides[{i}] (versus) に left / right がありません")
        elif t == "flow":
            if not s.get("steps"):
                errors.append(f"slides[{i}] (flow) に steps がありません")
        elif t == "stacked":
            n = len(s.get("series", []))
            if not n or any(len(r.get("values", [])) != n for r in s.get("rows", [])):
                errors.append(f"slides[{i}] (stacked) の series と values の数が合いません")
        elif t == "ranking":
            if not s.get("rows") or any("value" not in r for r in s["rows"]):
                errors.append(f"slides[{i}] (ranking) の rows に value がありません")
        elif t == "emphasis":
            if not s.get("big"):
                errors.append(f"slides[{i}] (emphasis) に big がありません")
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
    src = re.sub(r"(export const EPISODES: Episode\[\] = \[\n(?:  .+\n)*)", rf"\1  {var} as Episode,\n", src, count=1)
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
    p.add_argument("--format", choices=["wide", "short"], default="wide", help="short は縦型ショート")
    args = p.parse_args()

    out = EPISODES / f"{args.id}.json"
    if out.exists() and not args.force:
        sys.exit(f"{out.relative_to(ROOT)} は既にあります（上書きするなら --force）")

    draft = args.draft.read_text(encoding="utf-8")
    sample = json.loads((EPISODES / "charger-power-split.json").read_text(encoding="utf-8"))
    sample_slides = [] if args.format == "short" else sample["slides"][:6]
    user = (
        f"## 指定\n- title: {args.title or '（台本から考える）'}\n- pr: {str(args.pr).lower()}\n\n"
        f"## BGM候補\n{json.dumps(BGM_CHOICES, ensure_ascii=False, indent=1)}\n\n"
        f"## 既存動画のスライド例（書き方の参考）\n{json.dumps(sample_slides, ensure_ascii=False, indent=1)}\n\n"
        f"## 台本\n{draft}"
    )
    system = SYSTEM_SHORT if args.format == "short" else SYSTEM
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]

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

    episode = {"id": args.id, "format": args.format, **{k: v for k, v in episode.items() if k not in ("id", "format")}}
    episode.setdefault("illustrations", {})
    if args.title:
        episode["title"] = args.title
    episode["pr"] = args.pr
    episode.get("bgm", {}).pop("mood", None)

    out.write_text(json.dumps(episode, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"  {out.relative_to(ROOT)} を書き出しました（スライド {len(episode['slides'])} 枚）")
    register(args.id)


if __name__ == "__main__":
    main()
