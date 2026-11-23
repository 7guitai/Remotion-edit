"""坂本アヒルさんの立ち絵 PSD（ずんだもん／四国めたん）から、ショートで使うパーツだけを書き出す。

src/shorts/common/characters.json の <キャラ>.psd に書いたレイヤー（体・腕・口・目・眉など）を、
パーツ共通の切り抜き範囲の PNG として public/shorts/common/chars/<キャラ>/ に保存し、
Remotion 側で重ねて口パク・まばたき・表情切り替えをする。

使い方:
  pip install psd-tools
  python3 scripts/export_psd_parts.py <ずんだもん立ち絵素材2.3.zip または .psd> <四国めたん立ち絵素材2.1.zip または .psd>

立ち絵素材は Git に含めない（public/shorts/common/chars/ は .gitignore 済み）。
"""

import io
import json
import sys
import zipfile
from pathlib import Path

from PIL import Image
from psd_tools import PSDImage

ROOT = Path(__file__).resolve().parent.parent


def open_psd(path: Path) -> PSDImage:
    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as zf:
            for info in zf.infolist():
                if info.filename.lower().endswith(".psd"):
                    return PSDImage.open(io.BytesIO(zf.read(info)))
        raise SystemExit(f"{path} に PSD がありません")
    return PSDImage.open(path)


def find_layers(psd: PSDImage) -> dict:
    out = {}

    def walk(group, prefix):
        for layer in group:
            path = f"{prefix}{layer.name}"
            if layer.is_group():
                walk(layer, path + "/")
            else:
                out[path] = layer

    walk(psd, "")
    return out


def used_paths(spec: dict) -> list[str]:
    paths = list(spec["base"]) + list(spec["under"]) + list(spec["top"]) + list(spec["blink"])
    paths += list(spec["mouth"].values())
    for face in spec["faces"].values():
        paths += face["arms"] + face["eyes"] + [face["brow"]]
    return list(dict.fromkeys(paths))


def export(char_id: str, spec: dict, psd_path: Path, out_dir: Path) -> dict:
    psd = open_psd(psd_path)
    layers = find_layers(psd)
    W, H = psd.size
    out_dir.mkdir(parents=True, exist_ok=True)
    images = {}
    for p in used_paths(spec):
        if p not in layers:
            raise SystemExit(f"[{char_id}] レイヤーが見つかりません: {p}")
        layer = layers[p]
        canvas = Image.new("RGBA", (W, H))
        im = layer.topil().convert("RGBA")
        canvas.alpha_composite(im, (max(layer.left, 0), max(layer.top, 0)))
        images[p] = canvas
    # 全パーツを含む範囲で切り抜き（全パーツ同じサイズ・位置にそろえる）
    boxes = [im.getbbox() for im in images.values() if im.getbbox()]
    box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    files = {}
    for i, (p, im) in enumerate(images.items()):
        name = f"{i:02d}.png"
        im.crop(box).save(out_dir / name, optimize=True)
        files[p] = name
    # 頭のてっぺん（体レイヤーの不透明部分の一番上）と目の中心
    eyes = images[spec["faces"]["normal"]["eyes"][-1]].getbbox()
    meta = {
        "width": box[2] - box[0],
        "height": box[3] - box[1],
        "eyeX": (eyes[0] + eyes[2]) / 2 - box[0],
        "eyeY": (eyes[1] + eyes[3]) / 2 - box[1],
        "files": files,
    }
    print(f"[{char_id}] {len(files)} parts, {meta['width']}x{meta['height']}")
    return meta


def main() -> None:
    zunda, metan = Path(sys.argv[1]), Path(sys.argv[2])
    src = ROOT / "src" / "shorts" / "common"
    characters = json.loads((src / "characters.json").read_text(encoding="utf-8"))
    out = ROOT / "public" / "shorts" / "common" / "chars"
    parts = {}
    for cid, path in [("zundamon", zunda), ("metan", metan)]:
        parts[cid] = export(cid, characters[cid]["psd"], path, out / cid)
    (src / "parts.json").write_text(json.dumps(parts, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
