"""ずんだもん＋四国めたんの縦型ショートを新しく作る（ひな形をコピーして登録する）。

使い方:
  python3 scripts/new_short.py <id>          例: python3 scripts/new_short.py notebooklm

- src/shorts/<id>/ にひな形（script.json・theme.ts・scenes.tsx・Short.tsx など）をコピー
- src/shorts/index.ts に登録（コンポジション ID は <id>-short）
- すぐに `npx remotion studio` でプレビューできる（音声は generate_short_voice.py で後から作る）

ひな形の場所: .claude/skills/zunda-metan-short/templates/short/
"""

import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / ".claude" / "skills" / "zunda-metan-short" / "templates" / "short"
INDEX = ROOT / "src" / "shorts" / "index.ts"


def main() -> None:
    if len(sys.argv) != 2 or not re.fullmatch(r"[a-z0-9][a-z0-9-]*", sys.argv[1]):
        raise SystemExit("使い方: python3 scripts/new_short.py <id>（英小文字・数字・ハイフン）")
    sid = sys.argv[1]
    dest = ROOT / "src" / "shorts" / sid
    if dest.exists():
        raise SystemExit(f"{dest.relative_to(ROOT)} はもうあります")
    component = "".join(p.capitalize() for p in sid.split("-")) + "Short"
    const = sid.upper().replace("-", "_") + "_TIMELINE"

    shutil.copytree(TEMPLATE, dest)
    for f in dest.iterdir():
        if f.suffix in {".ts", ".tsx", ".json", ".txt"}:
            f.write_text(f.read_text(encoding="utf-8").replace("__ID__", sid).replace("__Component__", component), encoding="utf-8")
    (ROOT / "public" / "shorts" / sid).mkdir(parents=True, exist_ok=True)

    index = INDEX.read_text(encoding="utf-8")
    index = index.replace(
        "// <new-short-imports>",
        f'import {{ {component} }} from "./{sid}/Short";\nimport {{ TIMELINE as {const} }} from "./{sid}/theme";\n// <new-short-imports>',
    )
    index = index.replace(
        "  // <new-short-entries>",
        f'  {{ id: "{sid}-short", component: {component}, durationInFrames: {const}.total }},\n  // <new-short-entries>',
    )
    INDEX.write_text(index, encoding="utf-8")
    print(f"作成: src/shorts/{sid}/（コンポジション ID: {sid}-short）")
    print("次: script.json を書く → python3 scripts/generate_short_voice.py", sid, "→ npx remotion studio")


if __name__ == "__main__":
    main()
