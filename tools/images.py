#!/usr/bin/env python3
"""images.py — يحوّل صورة الواجهة المصدر (tools/src/hero.png) إلى AVIF/WebP/JPEG بعدة عروض للـ srcset،
ويستخرج اللون السائد ومعاينة ضبابية صغيرة جداً (LQIP base64) تُضمَّن داخل HTML لتفادي أي وميض/CLS.
"""
import os, json, base64, io
from PIL import Image, ImageFilter, ImageEnhance

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "platform", "public", "img")
os.makedirs(OUT, exist_ok=True)

src = Image.open(os.path.join(HERE, "src", "hero.png")).convert("RGB")
# نقلب أفقياً: في RTL النص على اليمين، فالمشهد يجب أن يكون على اليسار (الصورة الأصلية: المشهد يسار) — نُبقيها كما هي.
W0, H0 = src.size
meta = {"w": W0, "h": H0, "sizes": []}
for w in (640, 960, 1440, 1920):
    h = round(H0 * w / W0)
    im = src.resize((w, h), Image.LANCZOS)
    im.save(os.path.join(OUT, f"hero-{w}.avif"), quality=52, speed=4)
    im.save(os.path.join(OUT, f"hero-{w}.webp"), quality=74, method=6)
    im.save(os.path.join(OUT, f"hero-{w}.jpg"), quality=78, optimize=True, progressive=True)
    meta["sizes"].append({"w": w, "h": h, **{ext: os.path.getsize(os.path.join(OUT, f"hero-{w}.{ext}")) for ext in ("avif", "webp", "jpg")}})

# صورة الجوال: قص شبه مربّع يركّز على الدلّة والفنجان وطرف الكتاب (تُعرض كلوحة أعلى النص، لا خلفه)
cx0 = int(W0 * 0.10); crop = src.crop((cx0, int(H0 * 0.04), cx0 + int(H0 * 1.0), H0))
for w in (480, 828):
    h = round(crop.size[1] * w / crop.size[0])
    im = crop.resize((w, h), Image.LANCZOS)
    im.save(os.path.join(OUT, f"hero-m-{w}.avif"), quality=50, speed=4)
    im.save(os.path.join(OUT, f"hero-m-{w}.webp"), quality=72, method=6)
    im.save(os.path.join(OUT, f"hero-m-{w}.jpg"), quality=76, optimize=True, progressive=True)
meta["mobile"] = {"w": 828, "h": round(crop.size[1] * 828 / crop.size[0])}

tiny = src.resize((24, 13), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1))
b = io.BytesIO(); tiny.save(b, "WEBP", quality=40); meta["lqip"] = "data:image/webp;base64," + base64.b64encode(b.getvalue()).decode()
json.dump(meta, open(os.path.join(OUT, "hero.json"), "w"), indent=1)
print("hero:", ", ".join(f"{s['w']}w avif {s['avif']//1024}KB webp {s['webp']//1024}KB" for s in meta["sizes"]))
