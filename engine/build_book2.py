#!/usr/bin/env python3
"""
build_book2.py — يبني «كتاب البيت» الشخصي v2: ملف HTML واحد فاخر، مخصص لبيت واحد، مشفّر برمز، بصوت كسول.

    python3 engine/build_book2.py am                                  # نسخة معاينة (غير مشفرة، بيت تجريبي)
    python3 engine/build_book2.py am --order orders/GH-1234.json       # نسخة طلب حقيقي (مشفرة + بصمة)
    python3 engine/build_book2.py am --order o.json --pwa              # + مجلد PWA (index.html + sw.js + manifest + أيقونات)
    python3 engine/build_book2.py am --sample                          # عيّنة صفحة البيع: فصل السلامة + الطوارئ فقط، بلا تشفير

ملف الطلب (JSON):
    {"order_id":"GH-1234","book_name":"دليل بيت أم سارة","home_name":"بيت أم سارة","worker_name":"Almaz",
     "buyer":"أم سارة","icon":"🌸","rules":["t01","k05",...],"schedule":{"start":"07:00","end":"20:30",
     "breaks":[["10:00","10:30"],["13:30","16:00"],["19:30","20:00"]],"rest_day":5},"madam_phone":"05xxxxxxxx",
     "code":"ABCD2345" (اختياري — يُولَّد إن غاب), "country":"sa"}

ما يحدث:
  1. يجمع المحتوى (فصول + القواعد المختارة + الردود + الواجهة) بلغتين.
  2. الصوت: كل مجموعة (فصل/قواعد/ردود/واجهة) حاوية bytes واحدة مضغوطة (mp3 16kHz 20kbps)، تُشفّر وتوضع في
     <script type="text/plain"> مستقل → المتصفح لا يفك شيئاً حتى تضغط العاملة زر الصوت (الذاكرة: مجموعة/مجموعتان فقط).
  3. التشفير: PBKDF2(رمز الكتاب) → ChaCha20 + HMAC-SHA256. صفحة الطوارئ خارج التشفير دائماً (خط أخلاقي).
  4. البصمة: معرّف الطلب مخفي بأحرف عرض-صفري داخل النص + في رأس الترخيص + في الـHMAC → أي نسخة مسرّبة تُعرَف.
  5. JS مصغّر (esbuild) — ردع للهواة، لا يُعتبر حماية.
"""
import json, os, sys, glob, base64, hashlib, hmac, re, shutil, subprocess, time, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, LANGS, h, jload, flatten_chapter, chapter_files
import ghcrypto as GC

SHIP_BITRATE = os.environ.get("SHIP_BITRATE", "20k")
SHIP_RATE = "16000"
ESBUILD = shutil.which("esbuild") or "/usr/local/lib/node_modules/wrangler/node_modules/.bin/esbuild"
TPL = os.path.join(ROOT, "book/templates/book2.html")
FONT_STACK = {
    "am": "'Noto Sans Ethiopic','Abyssinica SIL','Nyala',system-ui,sans-serif",
    "ur": "'Noto Nastaliq Urdu','Jameel Noori Nastaleeq',system-ui,serif",
    "si": "'Noto Sans Sinhala','Iskoola Pota',system-ui,sans-serif",
    "bn": "'Noto Sans Bengali','Vrinda',system-ui,sans-serif",
    "hi": "'Noto Sans Devanagari','Mangal',system-ui,sans-serif",
}
DEFAULT_STACK = "system-ui,-apple-system,'Segoe UI',Roboto,'Noto Sans',sans-serif"
FONT_FILES = {"ar": ("Noto Naskh Arabic", "book/fonts/NotoNaskhArabic.woff2"), "am": ("Noto Sans Ethiopic", "book/fonts/NotoSansEthiopic.woff2")}
FLAG_SHORT = {"am": "አማ", "tl": "TL", "id": "ID", "ur": "اردو", "en": "EN", "sw": "SW", "si": "සිං", "bn": "বাং", "hi": "हि", "om": "OM"}

ZW = ["\u200b", "\u200c"]  # بت 0 / بت 1 — غير مرئيين


# ───────────────────────── الصوت ─────────────────────────
def shipped(lang, text):
    """mp3 مضغوط للشحن (كاش في audio/_ship/<rate>/) أو None."""
    src = os.path.join(ROOT, "audio", lang, h(text) + ".mp3")
    if not os.path.exists(src): return None
    d = os.path.join(ROOT, "audio", "_ship", SHIP_BITRATE); os.makedirs(d, exist_ok=True)
    out = os.path.join(d, f"{lang}_{h(text)}.mp3")
    if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(src):
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", src, "-ac", "1", "-ar", SHIP_RATE, "-b:a", SHIP_BITRATE,
                        "-map_metadata", "-1", "-id3v2_version", "0", out], check=True)
    return out


class AudioPack:
    """يجمع المقاطع في مجموعات. clip id = <lang>.<hash> (لا يكرر نفس المقطع)."""
    def __init__(self):
        self.groups = {}   # g -> {"buf": bytearray, "clips": {id:[off,len]}}
        self.where = {}    # clip id -> g
        self.missing = 0

    def add(self, group, lang, text):
        if not text or not text.strip(): return None
        cid = f"{lang}.{h(text)}"
        if cid in self.where: return cid
        p = shipped(lang, text)
        if not p: self.missing += 1; return None
        g = self.groups.setdefault(group, {"buf": bytearray(), "clips": {}})
        b = open(p, "rb").read()
        g["clips"][cid] = [len(g["buf"]), len(b)]; g["buf"] += b
        self.where[cid] = group
        return cid

    def pair(self, group, tl, ta):
        return [self.add(group, LANG_CUR, tl), self.add(group, "ar", ta)]


LANG_CUR = None


# ───────────────────────── المحتوى ─────────────────────────
def T(l, a): return {"l": l, "ar": a}


def tel_of(text):
    m = re.search(r"\b(911|19911|920002866|112|999|998|997)\b", text or "")
    return m.group(1) if m else None


def build_chapter(ar, tr, ap):
    g = "ch-" + ar["id"]
    c = {"id": ar["id"], "icon": ar["icon"], "title": T(tr["title"], ar["title"]), "titleAu": ap.pair(g, tr["title"], ar["title"]), "sections": []}
    if ar.get("subtitle"): c["subtitle"] = T(tr.get("subtitle", ""), ar["subtitle"])
    for sa, st in zip(ar["sections"], tr["sections"]):
        s = {"type": sa["type"], "items": []}
        if sa.get("title"): s["title"] = T(st["title"], sa["title"]); s["titleAu"] = ap.pair(g, st["title"], sa["title"])
        if sa.get("text"): s["text"] = T(st["text"], sa["text"]); s["textAu"] = ap.pair(g, st["text"], sa["text"])
        for ia, it in zip(sa.get("items", []), st.get("items", [])):
            o = {"text": T(it["text"], ia["text"]), "au": ap.pair(g, it["text"], ia["text"])}
            if ia.get("icon"): o["icon"] = ia["icon"]
            if ia.get("level"): o["level"] = ia["level"]
            if ia.get("why"): o["why"] = T(it.get("why", ""), ia["why"]); ap.pair(g, it.get("why", ""), ia["why"])
            tl = tel_of(ia["text"])
            if tl: o["tel"] = tl
            s["items"].append(o)
        c["sections"].append(s)
    return c


def build_ui(lang, ap, group="ui"):
    ua = jload(os.path.join(ROOT, "content/ar/_ui.json"))["strings"]
    ul = (jload(os.path.join(ROOT, f"content/{lang}/_ui.json")) or {"strings": {}})["strings"]
    out = {}
    for k, v in ua.items():
        l = ul.get(k, {}).get("t") or v["t"]
        e = {"l": l, "ar": v["t"]}
        if v.get("audio"): e["au"] = [ap.add(group, lang, l), ap.add(group, "ar", v["t"])]
        out[k] = e
    return out


def build_rules(lang, ids, ap):
    la = jload(os.path.join(ROOT, "content/ar/library/rules.json"))
    ll = jload(os.path.join(ROOT, f"content/{lang}/library/rules.json"))
    if not ll: return []
    want = set(ids) if ids is not None else {r["id"] for c in la["categories"] for r in c["rules"] if r.get("default")}
    out = []
    for ca, cl in zip(la["categories"], ll["categories"]):
        items = []
        for ra, rl in zip(ca["rules"], cl["rules"]):
            if ra["id"] not in want: continue
            o = {"id": ra["id"], "icon": ra.get("icon"), "text": T(rl["text"], ra["text"]), "au": ap.pair("rules", rl["text"], ra["text"])}
            if ra.get("level"): o["level"] = ra["level"]
            if ra.get("why"): o["why"] = T(rl.get("why", ""), ra["why"]); ap.pair("rules", rl.get("why", ""), ra["why"])
            items.append(o)
        if items:
            out.append({"id": ca["id"], "icon": ca["icon"], "title": T(cl["title"], ca["title"]), "au": ap.pair("rules", cl["title"], ca["title"]), "items": items})
    return out


def build_replies(lang, ap):
    ra = jload(os.path.join(ROOT, "content/ar/_replies.json"))["replies"]
    rl = (jload(os.path.join(ROOT, f"content/{lang}/_replies.json")) or {"replies": ra})["replies"]
    return [{"id": a["id"], "icon": a["icon"], "level": a.get("level", ""), "text": T(l["text"], a["text"]),
             "au": [ap.add("replies", lang, l["text"]), ap.add("replies", "ar", a["text"])]} for a, l in zip(ra, rl)]


def build_madam(chapters):
    """«قولي لعاملتك»: أقسام القاموس الموجهة من ربة البيت (طلبات، أشياء، أرقام) — تعيد استخدام صوت فصل القاموس."""
    ph = next((c for c in chapters if c["id"] == "07-phrasebook"), None)
    if not ph: return []
    keep = []
    for s in ph["sections"]:
        if s["type"] == "phrases" and s.get("items") and s.get("title"):
            keep.append({"title": s["title"], "items": s["items"]})
    return keep[:4]


def hm(t):
    hh, mm = [int(x) for x in t.split(":")]; return hh * 60 + mm


def fmt12(t):
    hh, mm = [int(x) for x in t.split(":")]; return f"{'☀️' if 6 <= hh < 18 else '🌙'} {hh:02d}:{mm:02d}"


def build_schedule(sc, limits):
    start, end = hm(sc["start"]), hm(sc["end"])
    br = [(hm(a), hm(b)) for a, b in sc.get("breaks", [])]
    work = (end - start) - sum(b - a for a, b in br)
    if work > limits["max_work_hours"] * 60:
        raise SystemExit(f"!! الجدول {work/60:.1f} ساعة عمل > الحد النظامي {limits['max_work_hours']} — عدّلي الأوقات")
    # أطول فترة عمل متواصلة
    seg, prev = 0, start
    for a, b in sorted(br):
        seg = max(seg, a - prev); prev = b
    seg = max(seg, end - prev)
    if seg > limits["break_after_hours"] * 60:
        raise SystemExit(f"!! فترة عمل متواصلة {seg/60:.1f} ساعة > {limits['break_after_hours']} بلا استراحة")
    rest = 24 * 60 - (end - start)
    if rest < limits["min_daily_rest_hours"] * 60:
        raise SystemExit("!! الراحة اليومية المتواصلة أقل من الحد النظامي")
    rows = [{"time": fmt12(sc["start"]), "k": "sched_start"}]
    for i, (a, b) in enumerate(sc.get("breaks", [])):
        k = "sched_meal" if hm(b) - hm(a) >= 60 else "sched_break"
        rows.append({"time": f"{fmt12(a)}\n{fmt12(b)[-5:]}", "k": k, "rest": True})
    rows.append({"time": fmt12(sc["end"]), "k": "sched_end"})
    def hrs(m): return (f"{m // 60}" if m % 60 == 0 else f"{m / 60:.1f}")
    return {"rows": rows, "workH": hrs(work), "restH": hrs(rest), "restDay": int(sc.get("rest_day", 5))}


def sos_block(lang, chapters, ui, country):
    """صفحة الطوارئ: مكشوفة دائماً (حتى لو الكتاب مقفل) — الأرقام + أهم قواعد الخطر من فصل السلامة."""
    safety = next((c for c in chapters if c["id"] == "02-safety"), None)
    secs = []
    if safety:
        for s in safety["sections"]:
            items = [it for it in s["items"] if it.get("level") == "danger" or s["type"] == "phrases"]
            if items and s.get("title"): secs.append({"title": s["title"], "items": items})
    nums = [{"tel": e["tel"], "l": ui[e["key"]]["l"], "ar": ui[e["key"]]["ar"]} for e in country["emergency"]]
    return {"numbers": nums, "sections": secs}


# ───────────────────────── البصمة والعلامة المائية ─────────────────────────
def zw_encode(s):
    bits = "".join(f"{b:08b}" for b in s.encode())
    return "\u2063" + "".join(ZW[int(x)] for x in bits) + "\u2063"


def zw_decode(text):
    m = re.search("\u2063([\u200b\u200c]+)\u2063", text)
    if not m: return None
    bits = "".join("0" if c == "\u200b" else "1" for c in m.group(1))
    return bytes(int(bits[i:i + 8], 2) for i in range(0, len(bits) - len(bits) % 8, 8)).decode(errors="replace")


def stamp_fingerprint(data, fp):
    """يضع البصمة غير المرئية في عدة جمل (بعد أول كلمة) — تبقى حتى لو نُسخ النص يدوياً من الشاشة."""
    z = zw_encode(fp); n = 0
    for c in data["chapters"]:
        for s in c["sections"][:2]:
            if s.get("text"):
                t = s["text"]["ar"]; i = t.find(" ")
                if i > 0: s["text"]["ar"] = t[:i] + z + t[i:]; n += 1
    return n


# ───────────────────────── أيقونة ─────────────────────────
def icon_png(emoji, size=180):
    """أيقونة PNG للشاشة الرئيسية (iOS لا يقبل SVG في apple-touch-icon): خلفية برقوقية + إطار ذهبي + الحرف الأول."""
    try:
        from PIL import Image, ImageDraw
    except Exception:
        return None
    im = Image.new("RGB", (size, size), (90, 16, 48)); d = ImageDraw.Draw(im)
    for i in range(size):  # تدرّج
        c = (int(90 + 32 * i / size), int(16 + 10 * i / size), int(48 + 26 * i / size)); d.line([(0, i), (size, i)], fill=c)
    m = size * 0.09; d.rounded_rectangle([m, m, size - m, size - m], radius=size * 0.16, outline=(201, 168, 106), width=max(2, size // 60))
    r = size * 0.24; cx = cy = size / 2
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(233, 211, 166))
    d.ellipse([cx - r * 0.55, cy - r * 0.55, cx + r * 0.55, cy + r * 0.55], fill=(90, 16, 48))
    b = io.BytesIO(); im.save(b, "PNG", optimize=True); return b.getvalue()


def icon_svg(emoji):
    s = ("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>"
         "<stop offset='0' stop-color='#7a1844'/><stop offset='1' stop-color='#3d0a20'/></linearGradient></defs>"
         "<rect width='100' height='100' rx='22' fill='url(#g)'/><rect x='8' y='8' width='84' height='84' rx='17' fill='none' stroke='#C9A86A' stroke-width='2'/>"
         f"<text x='50' y='64' font-size='44' text-anchor='middle'>{emoji}</text></svg>")
    return "data:image/svg+xml;base64," + base64.b64encode(s.encode()).decode()


# ───────────────────────── JS ─────────────────────────
def minify(path):
    src = open(path, encoding="utf-8").read()
    if os.path.exists(ESBUILD) and os.environ.get("NO_MINIFY") != "1":
        r = subprocess.run([ESBUILD, "--minify", "--target=es2015,safari10,chrome49", "--charset=utf8", "--log-level=error"],
                           input=src, capture_output=True, text=True)
        if r.returncode == 0: return r.stdout.strip()
        print("   (esbuild failed — shipping unminified)", r.stderr[:300])
    return src


def font_faces(langs):
    css = ""
    for lg in langs:
        if lg in FONT_FILES:
            fam, p = FONT_FILES[lg]; fp = os.path.join(ROOT, p)
            if os.path.exists(fp):
                css += "@font-face{font-family:'%s';src:url(data:font/woff2;base64,%s) format('woff2');font-display:swap}\n" % (fam, base64.b64encode(open(fp, "rb").read()).decode())
    return css


# ───────────────────────── البناء ─────────────────────────
DEMO_ORDER = {"order_id": "DEMO", "book_name": "دليل بيت أم سارة", "home_name": "بيت أم سارة", "worker_name": "",
              "buyer": "نسخة معاينة", "icon": "🌸", "rules": None,
              "schedule": {"start": "07:00", "end": "20:30", "breaks": [["10:00", "10:30"], ["13:30", "16:00"], ["19:30", "20:00"]], "rest_day": 5},
              "country": "sa", "encrypt": False}


def build(lang, order, pwa=False, sample=False, out_dir=None):
    global LANG_CUR
    LANG_CUR = lang
    L = LANGS[lang]
    country = jload(os.path.join(ROOT, "content/country", (order.get("country") or "sa") + ".json"))
    ap = AudioPack()
    ui = build_ui(lang, ap)
    chapters = []
    for f in chapter_files("ar"):
        ar = jload(f); tr = jload(os.path.join(ROOT, "content", lang, os.path.basename(f)))
        if not tr: print(f"!! missing {lang}/{os.path.basename(f)}"); sys.exit(1)
        if sample and ar["id"] not in ("02-safety", "07-phrasebook"): continue
        chapters.append(build_chapter(ar, tr, ap))
    rules = [] if sample else build_rules(lang, order.get("rules"), ap)
    replies = build_replies(lang, ap)
    sched = build_schedule(order["schedule"], country["limits"]) if order.get("schedule") else None
    data = {"chapters": chapters, "rules": rules, "replies": replies, "schedule": sched, "ui": ui, "madam": build_madam(chapters)}
    oid = order.get("order_id", "DEMO")
    fp = f"{oid}|{lang}|{time.strftime('%Y%m%d')}"
    if oid != "DEMO": stamp_fingerprint(data, fp)
    wm = f"{ui['copy_of']['ar']} {order.get('home_name', '')} · {oid}" + ("" if sample else f" · {ui['license']['ar']}")

    encrypt = order.get("encrypt", True) and not sample
    code = GC.norm_code(order.get("code") or GC.new_code()) if encrypt else None
    meta = {"id": f"{oid}-{lang}".lower(), "lang": lang, "dir": L["dir"], "flagShort": FLAG_SHORT.get(lang, lang.upper()),
            "bookName": order.get("book_name") or "كتاب البيت", "home": order.get("home_name", ""), "worker": order.get("worker_name", ""),
            "icon": order.get("icon") or "🏠", "wm": wm, "madamPhone": order.get("madam_phone", ""),
            "ui0": {k: ui[k] for k in ("welcome", "welcome_sub", "start", "listen", "made_for", "unlock_title", "unlock_hint", "unlock_btn",
                                        "wrong_code", "emergency", "audio_loading", "call_madam", "home", "book", "today", "replies")},
            "sw": "sw.js" if pwa else None, "audio": {}, "enc": None}
    meta["sos"] = sos_block(lang, chapters, ui, country)

    # ─ التشفير ─ مفتاح صوت عشوائي (ak) داخل الحمولة المشفرة بالرمز؛ الصوت يُشفَّر بـ ak
    keys = None
    ak = os.urandom(32) if encrypt else None
    if ak: data["ak"] = ak.hex()
    payload_plain = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode()
    if encrypt:
        salt = os.urandom(16); keys = GC.derive_keys(code, salt)
        nonce = os.urandom(12); ct, mac = GC.seal(keys, nonce, payload_plain)
        check = hmac.new(keys["mac"], b"ghaida-check", hashlib.sha256).hexdigest()[:16]
        meta["enc"] = {"salt": salt.hex(), "iter": GC.ITER, "nonce": nonce.hex(), "mac": mac.hex(), "check": check,
                       "fp": hmac.new(keys["mac"], fp.encode(), hashlib.sha256).hexdigest()[:24]}
        payload = base64.b64encode(ct).decode()
    else:
        payload = payload_plain.decode().replace("</", "<\\/")

    # ─ الصوت: حاوية لكل مجموعة. مجموعة ui و sos مكشوفة (الغلاف/القفل/الطوارئ تعمل قبل الرمز) ─
    blocks = []; total_audio = 0
    sos_ids = set()
    for s in meta["sos"]["sections"]:
        for it in s["items"]: sos_ids.update(x for x in it["au"] if x)
    # انسخ مقاطع الطوارئ إلى مجموعة مكشوفة مستقلة
    sos_g = {"buf": bytearray(), "clips": {}}
    for cid in sorted(sos_ids):
        g = ap.groups[ap.where[cid]]; off, ln = g["clips"][cid]
        sos_g["clips"][cid] = [len(sos_g["buf"]), ln]; sos_g["buf"] += g["buf"][off:off + ln]
    groups = dict(ap.groups); groups["sos"] = sos_g
    pwa_files = {}
    for gname, g in groups.items():
        if not g["clips"]: continue
        buf = bytes(g["buf"]); clear = gname in ("ui", "sos") or not encrypt
        nonce_hex = None
        if not clear:
            n = os.urandom(12); buf = GC.chacha20(ak, n, 1, buf); nonce_hex = n.hex()
        bid = "au-" + re.sub(r"[^a-z0-9]", "", gname.lower())
        clips = g["clips"]
        if gname != "sos":  # مقاطع الطوارئ تُقرأ من مجموعة sos المكشوفة (حتى قبل الرمز)
            clips = {k: v for k, v in clips.items() if k not in sos_ids}
        meta["audio"][gname] = {"nonce": nonce_hex, "clips": clips, "size": len(buf)}
        if pwa:
            fn = f"a/{bid}.bin"; pwa_files[fn] = buf; meta["audio"][gname]["src"] = fn
        else:
            meta["audio"][gname]["block"] = bid
            blocks.append(f'<script id="{bid}" type="text/plain">{base64.b64encode(buf).decode()}</script>')
        total_audio += len(buf)

    # ─ القالب ─
    lic = (f"© غيداء — كتاب البيت. نسخة مرخّصة شخصياً: {order.get('home_name','')} · رقم الطلب {oid}. "
           "يُمنع بيع هذه النسخة أو نشرها أو تعديلها أو إعادة توزيعها. كل نسخة تحمل بصمة فريدة تكشف مصدرها. "
           "LICENSE: personal, non-transferable. Redistribution, resale or derivative works are prohibited.")
    icon_p = icon_png(meta["icon"])
    rep = {
        "{{LANG}}": lang, "{{DIR}}": L["dir"], "{{BOOK_NAME}}": html_esc(meta["bookName"]), "{{BOOK_NAME_ATTR}}": html_esc(meta["bookName"][:22]),
        "{{LICENSE_HEADER}}": lic, "{{CV_MADE}}": html_esc(ui["made_for"]["l"]), "{{ICON}}": meta["icon"], "{{FONT_STACK}}": FONT_STACK.get(lang, DEFAULT_STACK), "{{FONT_FACES}}": font_faces(["ar", lang]),
        "{{ICON_DATA}}": icon_svg(meta["icon"]),
        "{{ICON_PNG}}": ("icon-180.png" if pwa else ("data:image/png;base64," + base64.b64encode(icon_p).decode() if icon_p else icon_svg(meta["icon"]))),
        "{{MANIFEST_LINK}}": '<link rel="manifest" href="manifest.webmanifest">' if pwa else "",
        "{{META_JSON}}": json.dumps(meta, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"),
        "{{PAYLOAD}}": payload, "{{AUDIO_BLOCKS}}": "\n".join(blocks),
        "{{CRYPTO_JS}}": minify(os.path.join(ROOT, "book/core/ghcrypto.js")), "{{APP_JS}}": minify(os.path.join(ROOT, "book/core/app.js")),
    }
    html = open(TPL, encoding="utf-8").read()
    for k, v in rep.items(): html = html.replace(k, v)

    out_dir = out_dir or os.path.join(ROOT, "dist")
    os.makedirs(out_dir, exist_ok=True)
    tag = "sample" if sample else ("demo" if oid == "DEMO" else oid)
    out = os.path.join(out_dir, f"book-{lang}-{tag}.html")
    open(out, "w", encoding="utf-8").write(html)
    print(f"built {os.path.relpath(out, ROOT)}  {os.path.getsize(out)/1048576:.2f} MB  (audio {total_audio/1048576:.2f} MB in {len(meta['audio'])} groups, missing {ap.missing})")
    if encrypt: print(f"   🔐 code: {GC.fmt_code(code)}")
    result = {"file": out, "code": GC.fmt_code(code) if code else None, "fingerprint": fp, "size": os.path.getsize(out), "missing_audio": ap.missing}

    if pwa:
        d = os.path.join(out_dir, f"pwa-{lang}-{tag}"); os.makedirs(os.path.join(d, "a"), exist_ok=True)
        open(os.path.join(d, "index.html"), "w", encoding="utf-8").write(html)
        for fn, b in pwa_files.items(): open(os.path.join(d, fn), "wb").write(b)
        if icon_p:
            open(os.path.join(d, "icon-180.png"), "wb").write(icon_p)
            open(os.path.join(d, "icon-512.png"), "wb").write(icon_png(meta["icon"], 512))
        man = {"name": meta["bookName"], "short_name": meta["bookName"][:12], "start_url": "./index.html", "scope": "./", "display": "standalone",
               "background_color": "#3d0a20", "theme_color": "#5A1030", "dir": "rtl", "lang": "ar",
               "icons": [{"src": "icon-180.png", "sizes": "180x180", "type": "image/png"}, {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]}
        open(os.path.join(d, "manifest.webmanifest"), "w", encoding="utf-8").write(json.dumps(man, ensure_ascii=False))
        files = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png"] + ["./" + f for f in pwa_files]
        ver = hashlib.sha1(html.encode()).hexdigest()[:10]
        open(os.path.join(d, "sw.js"), "w").write(SW_TMPL.replace("__VER__", ver).replace("__FILES__", json.dumps(files)))
        print(f"   PWA: {os.path.relpath(d, ROOT)}/  ({len(files)} files, cache v{ver})")
        result["pwa_dir"] = d
    return result


SW_TMPL = """const C='book-__VER__',F=__FILES__;
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const q=e.request;if(q.method!=='GET')return;const nav=q.mode==='navigate';e.respondWith(caches.open(C).then(c=>c.match(q,{ignoreSearch:true}).then(r=>r||(nav?c.match('./index.html'):null)).then(r=>r||fetch(q).then(res=>{if(res.ok&&new URL(q.url).origin===location.origin)c.put(q,res.clone());return res}).catch(()=>nav?c.match('./index.html'):Response.error()))))});
"""


def html_esc(s): return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args: print(__doc__); sys.exit(1)
    lang = args[0]
    order = dict(DEMO_ORDER)
    if "--order" in sys.argv:
        o = jload(sys.argv[sys.argv.index("--order") + 1])
        order.update(o); order["encrypt"] = o.get("encrypt", True)   # الطلبات الحقيقية مشفرة افتراضياً
    if "--encrypt" in sys.argv: order["encrypt"] = True
    r = build(lang, order, pwa="--pwa" in sys.argv, sample="--sample" in sys.argv)
    print(json.dumps({k: v for k, v in r.items() if k != "file"}, ensure_ascii=False))
