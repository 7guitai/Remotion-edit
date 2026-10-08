"""NASA の Blue Marble（地形・海底地形つき, 7月）から、「海がなくなった地球」の地図画像を作る。

海の部分の青い濃淡（＝海の深さ）を、深いほど暗い茶色・浅いほど明るい砂色に置きかえる。
海底の山脈や海溝の凹凸は、もとの画像の細かい明暗から少し強調して残す。

使い方: python3 scripts/make_dry_earth.py public/footage/earth_topo_bathy_jul.jpg public/footage/earth_dry_seabed.jpg
"""
import sys, numpy as np
from PIL import Image, ImageFilter
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB").resize((4096, 2048), Image.LANCZOS)
a = np.asarray(im).astype(np.float32)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = 0.2 * r + 0.3 * g + 0.5 * b
# 海：青みが強い画素（雪や雲の影の明るい青白さは除く）＋とても暗い青い画素（深海）
ocean = (((b > r + 18) & (b > g + 4) & (lum < 160)) | ((lum < 80) & (b >= r) & (b >= g - 2)))
ocean = np.asarray(Image.fromarray((ocean * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5))) > 127
m = np.asarray(Image.fromarray((ocean * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))).astype(np.float32)[..., None] / 255
lo, hi = np.percentile(lum[ocean], [1, 99.5])
t = np.clip((lum - lo) / (hi - lo), 0, 1) ** 0.75
deep = np.array([58, 44, 36], np.float32)
mid = np.array([138, 106, 78], np.float32)
shallow = np.array([218, 190, 146], np.float32)
t3 = t[..., None]
col = np.where(t3 < 0.55, deep + (mid - deep) * (t3 / 0.55), mid + (shallow - mid) * ((t3 - 0.55) / 0.45))
detail = lum - np.asarray(Image.fromarray(lum.astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)
col = col + detail[..., None] * 2.0
res = np.clip(a * (1 - m) + col * m, 0, 255).astype(np.uint8)
Image.fromarray(res).save(out, quality=92)
Image.fromarray(res).resize((1600, 800)).save(out.replace(".jpg", "_preview.jpg"), quality=85)
