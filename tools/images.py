#!/usr/bin/env python3
"""images.py — لقطات حقيقية من الكتاب (tools/src/shots/*.png، تولّدها tools/shots.py) ← AVIF/WebP/PNG بمقاسين للـ srcset.
لا صور مخزون ولا صور مولّدة: ما تراه المشترية في الصفحة هو الكتاب نفسه.
"""
import os, json, glob, shutil
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "platform", "public", "img")
shutil.rmtree(OUT, ignore_errors=True); os.makedirs(OUT)
meta = {}
for f in sorted(glob.glob(os.path.join(HERE, "src", "shots", "*.png"))):
    n = os.path.splitext(os.path.basename(f))[0]; src = Image.open(f).convert("RGB")
    for w in (300, 600):
        h = round(src.size[1] * w / src.size[0]); im = src.resize((w, h), Image.LANCZOS)
        im.save(os.path.join(OUT, f"{n}-{w}.avif"), quality=60, speed=4)
        im.save(os.path.join(OUT, f"{n}-{w}.webp"), quality=82, method=6)
        im.save(os.path.join(OUT, f"{n}-{w}.jpg"), quality=84, optimize=True, progressive=True)
    meta[n] = {"w": 600, "h": round(src.size[1] * 600 / src.size[0])}
json.dump(meta, open(os.path.join(OUT, "shots.json"), "w"), indent=1)
print("shots:", ", ".join(f"{k} {os.path.getsize(os.path.join(OUT, k + '-600.avif'))//1024}KB" for k in meta))
