#!/usr/bin/env python3
"""
build_book.py — يبني الكتاب الإلكتروني المستقل (ملف HTML واحد فيه كل شيء: النص بلغتين + كل الصوت).

الاستخدام:
    python3 engine/build_book.py am                # dist/ghaida-book-am.html
    python3 engine/build_book.py am --no-audio     # نسخة بدون صوت (للمعاينة السريعة)
    python3 engine/build_book.py am --pwa          # + dist/am/ (index.html + sw.js + manifest) للنشر كموقع يعمل أوفلاين

الناتج ملف واحد يُرسل على واتساب أو يُفتح بأي متصفح، ولا يحتاج إنترنت أبداً.
الصوت مضمّن base64 (mp3 32kbps mono). حجم متوقع: 8–14 MB للكتاب الكامل بلغتين.
"""
import json, os, sys, glob, base64, hashlib, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = json.load(open(os.path.join(ROOT, "engine/languages.json"), encoding="utf-8"))
TPL = open(os.path.join(ROOT, "book/templates/book.html"), encoding="utf-8").read()

UI = {  # نصوص الواجهة بلغة العاملة (تُترجم يدوياً هنا — قليلة)
    "am": {"read_all": "ሁሉንም አንብብ", "footer": "ገይዳ — የቤት ሠራተኞች መመሪያ"},
    "tl": {"read_all": "Basahin lahat", "footer": "Ghaida — Gabay para sa kasambahay"},
    "id": {"read_all": "Baca semua", "footer": "Ghaida — Panduan pekerja rumah tangga"},
    "ur": {"read_all": "سب پڑھیں", "footer": "غیداء — گھریلو ملازمہ کی رہنما کتاب"},
    "en": {"read_all": "Read all", "footer": "Ghaida — Household helper guide"},
    "sw": {"read_all": "Soma yote", "footer": "Ghaida — Mwongozo wa mfanyakazi wa nyumbani"},
    "si": {"read_all": "සියල්ල කියවන්න", "footer": "Ghaida — ගෙදර සේවිකා මාර්ගෝපදේශය"},
    "bn": {"read_all": "সব পড়ুন", "footer": "Ghaida — গৃহকর্মী গাইড"},
    "hi": {"read_all": "सब पढ़ें", "footer": "Ghaida — घरेलू सहायिका गाइड"},
}
FONT_STACK = {
    "am": "'Noto Sans Ethiopic','Abyssinica SIL',system-ui,sans-serif",
    "ur": "'Noto Nastaliq Urdu','Jameel Noori Nastaleeq',system-ui,serif",
    "si": "'Noto Sans Sinhala','Iskoola Pota',system-ui,sans-serif",
    "bn": "'Noto Sans Bengali','Vrinda',system-ui,sans-serif",
    "hi": "'Noto Sans Devanagari','Mangal',system-ui,sans-serif",
}
ICON_SVG = "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%23f8c8d8'/%3E%3Ctext x='50' y='66' font-size='52' text-anchor='middle'%3E%F0%9F%8F%A0%3C/text%3E%3C/svg%3E"


def h(text): return hashlib.sha1(text.strip().encode("utf-8")).hexdigest()[:16]


def load_chapters(lang):
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, "content/ar/*.json"))):
        ar = json.load(open(f, encoding="utf-8"))
        lf = os.path.join(ROOT, "content", lang, os.path.basename(f))
        if not os.path.exists(lf):
            print(f"!! missing translation {lf} — run engine/translate.py {lang}"); sys.exit(1)
        l = json.load(open(lf, encoding="utf-8"))
        out.append({"id": ar["id"], "icon": ar["icon"], "ar": ar, "l": l})
    return out


def all_texts(ch):
    t = []
    for c in ch:
        for d in (c["ar"], c["l"]):
            t += [d["title"], d.get("subtitle", "")]
            for s in d["sections"]:
                t += [s.get("title", ""), s.get("text", "")]
                for it in s.get("items", []): t += [it["text"], it.get("why", "")]
    return [x.strip() for x in t if x and x.strip()]


def audio_map(lang, texts):
    d = os.path.join(ROOT, "audio", lang)
    m, missing, size = {}, 0, 0
    for t in texts:
        p = os.path.join(d, h(t) + ".mp3")
        if os.path.exists(p):
            b = open(p, "rb").read(); size += len(b)
            m[h(t)] = "data:audio/mpeg;base64," + base64.b64encode(b).decode()
        else:
            missing += 1
    return m, missing, size


def build(lang, with_audio=True, pwa=False):
    ch = load_chapters(lang)
    texts = all_texts(ch)
    hashes = {t: h(t) for t in texts}
    audio = {}
    report = {}
    if with_audio:
        for lg in ("ar", lang):
            m, miss, size = audio_map(lg, texts)
            audio[lg] = m; report[lg] = (len(m), miss, size)
    data = {
        "id": f"ghaida-{lang}", "lang": lang, "hash": hashes, "audio": audio,
        "ui": UI.get(lang, UI["en"]),
        "chapters": [{"id": c["id"], "icon": c["icon"],
                      "ar": {k: c["ar"][k] for k in ("title", "subtitle", "sections") if k in c["ar"]},
                      "l": {k: c["l"][k] for k in ("title", "subtitle", "sections") if k in c["l"]}} for c in ch],
    }
    L = LANGS[lang]
    html = TPL
    rep = {
        "{{LANG}}": lang, "{{DIR}}": L["dir"], "{{START}}": "right" if L["dir"] == "rtl" else "left",
        "{{TITLE}}": ch[0]["l"]["title"] if False else "Ghaida · " + L["native"],
        "{{SUBTITLE}}": "دليل العاملة المنزلية · " + L["name"],
        "{{ICON}}": "🏠", "{{ICON_SVG}}": ICON_SVG,
        "{{FLAG_L}}": L["flag"], "{{NATIVE_L}}": L["native"],
        "{{READ_ALL}}": UI.get(lang, UI["en"])["read_all"], "{{FOOTER}}": UI.get(lang, UI["en"])["footer"] + " · غيداء",
        "{{FONT_STACK}}": FONT_STACK.get(lang, "system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans Arabic','Noto Naskh Arabic',sans-serif"),
        "{{DATA_JSON}}": json.dumps(data, ensure_ascii=False).replace("</", "<\\/"),
    }
    for k, v in rep.items(): html = html.replace(k, v)
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
    out = os.path.join(ROOT, "dist", f"ghaida-book-{lang}{'' if with_audio else '-noaudio'}.html")
    open(out, "w", encoding="utf-8").write(html)
    size = os.path.getsize(out) / 1024 / 1024
    print(f"built {out}  {size:.2f} MB")
    for lg, (n, miss, sz) in report.items():
        print(f"   audio[{lg}]: {n} clips ({sz/1024/1024:.2f} MB), missing {miss}")
    if pwa:
        d = os.path.join(ROOT, "dist", lang); os.makedirs(d, exist_ok=True)
        shutil.copy(out, os.path.join(d, "index.html"))
        open(os.path.join(d, "manifest.webmanifest"), "w", encoding="utf-8").write(json.dumps({
            "name": f"Ghaida · {L['native']}", "short_name": "Ghaida", "start_url": "./index.html", "display": "standalone",
            "background_color": "#fff8fa", "theme_color": "#f8c8d8", "dir": L["dir"], "lang": lang,
            "icons": [{"src": "data:image/svg+xml," + ICON_SVG, "sizes": "any", "type": "image/svg+xml"}]}, ensure_ascii=False))
        open(os.path.join(d, "sw.js"), "w").write(
            "const C='ghaida-%s-v1';self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./index.html','./manifest.webmanifest'])))});"
            "self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});" % lang)
        # ربط manifest في index.html
        p = os.path.join(d, "index.html"); s = open(p, encoding="utf-8").read().replace("<title>", '<link rel="manifest" href="manifest.webmanifest"><title>', 1)
        open(p, "w", encoding="utf-8").write(s)
        print(f"   PWA folder: {d}/ (index.html, sw.js, manifest.webmanifest)")
    return out


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args: print(__doc__); sys.exit(1)
    build(args[0], with_audio="--no-audio" not in sys.argv, pwa="--pwa" in sys.argv)
