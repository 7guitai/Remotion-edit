"""PSDTool 形式の立ち絵 PSD から、表情ごとの PNG を書き出す。

坂本アヒル「ずんだもん立ち絵素材 2.3」（pixiv の配布ページからダウンロード）向けのプリセット入り。
素材は再配布できないため Git には含めない。各自ダウンロードして PSD のパスを渡す。

使い方:
  pip install psd-tools
  python3 scripts/build_character.py ~/Downloads/ずんだもん立ち絵素材2.3.psd

public/characters/zundamon-ahiru/<表情>.png（口を閉じた絵）と <表情>_talk.png（口を開けた絵）を書き出す。
全表情を同じ範囲で切り抜くので、表情を切り替えても位置がずれない。
"""

import argparse
from pathlib import Path

from psd_tools import PSDImage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "characters" / "zundamon-ahiru"

# 各グループで表示するレイヤー（PSDTool の「*」は同じグループ内で1つだけ）
BASE = {
    "服装1": "いつもの服",
    "顔色": "ほっぺ",
    "枝豆": "枝豆通常",
    "眉": "普通眉",
    "目": "目セット",
    "目セット": "普通白目",
    "黒目": "カメラ目線",
    "右腕": "基本",
    "左腕": "基本",
}

# 表情: 上書きするレイヤーと、口（閉じ / 開け）
EXPRESSIONS = {
    "normal": ({}, ("むふ", "ほあ")),
    "question": ({"左腕": "考える", "眉": "困り眉1", "黒目": "目逸らし"}, ("むー", "ほー")),
    "happy": ({"目": "にっこり", "右腕": "手を挙げる", "左腕": "腰", "顔色": "ほっぺ2"}, ("むふ", "ほあー")),
    "alert": ({"右腕": "指差し", "左腕": "腰", "眉": "上がり眉", "汗": True}, ("んー", "ほあ")),
    "wink": ({"目": "にっこり2", "右腕": "手を挙げる", "顔色": "ほっぺ2"}, ("むふ", "ほあー")),
}

# 「記号など」グループで表示するもの
SYMBOLS = {"汗": "汗1"}


def strip(name: str) -> str:
    return name.lstrip("*!")


def apply(psd: PSDImage, choice: dict[str, str], mouth: str, symbols: set[str]) -> None:
    def walk(group, inside_hidden_outfit=False):
        for layer in group:
            name = strip(layer.name)
            parent = strip(group.name) if hasattr(group, "name") and group is not psd else ""
            if parent in choice and layer.name.startswith("*"):
                layer.visible = name == choice[parent]
            elif parent == "口" and layer.name.startswith("*"):
                layer.visible = name == mouth
            elif parent == "記号など":
                layer.visible = name in symbols
            if layer.is_group():
                walk(layer)

    walk(psd)
    # 服装は「服装1（いつもの服）」だけを表示する
    for layer in psd:
        if strip(layer.name) == "服装2":
            layer.visible = False
        if strip(layer.name) == "服装1":
            layer.visible = True
        if strip(layer.name) == "パーカー裏地":
            layer.visible = False


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("psd", type=Path)
    p.add_argument("--height", type=int, default=1100, help="書き出す高さ（px）")
    args = p.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    images = {}
    for key, (override, mouths) in EXPRESSIONS.items():
        choice = {**BASE, **{k: v for k, v in override.items() if isinstance(v, str)}}
        symbols = {SYMBOLS[k] for k, v in override.items() if v is True}
        for suffix, mouth in (("", mouths[0]), ("_talk", mouths[1])):
            psd = PSDImage.open(args.psd)
            apply(psd, choice, mouth, symbols)
            images[key + suffix] = psd.composite(force=True)

    # 全表情の外接矩形で切り抜く（表情を切り替えても位置がずれない）
    boxes = [im.getbbox() for im in images.values()]
    box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    for name, im in images.items():
        im = im.crop(box)
        w = round(im.width * args.height / im.height)
        im.resize((w, args.height)).save(OUT / f"{name}.png", optimize=True)
        print(f"  {OUT.relative_to(ROOT)}/{name}.png")


if __name__ == "__main__":
    main()
