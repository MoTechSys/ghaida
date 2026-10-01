#!/usr/bin/env python3
"""
export_pack.py — يصدّر «حزمة لغة» جاهزة يجمع منها الخادم كتاباً شخصياً لكل طلب خلال ثوانٍ (بلا Python/ffmpeg على الخادم).

    python3 engine/export_pack.py am            # → platform/packs/am/{pack.json, a/*.bin} + platform/packs/template.html
    python3 engine/export_pack.py am --sample   # + platform/public/samples/am.html (عيّنة صفحة البيع: السلامة + الطوارئ)

الحزمة = كل الفصول + كل قواعد المكتبة (بمعرّفاتها) + الردود + الواجهة + الطوارئ، مع جداول مواضع الصوت.
الصوت = حاوية bytes خام (mp3) لكل مجموعة. الخادم (book/core/assemble.js) يختار القواعد، يبني الجدول، يضع البصمة،
ويشفّر الحمولة والصوت بالرمز — نفس صيغة build_book2.py بالبايت (مختبر في tests/parity).
"""
import os, sys, json, re, shutil, base64, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_book2 as B
import ghcrypto as GC
from common import ROOT, LANGS, jload, chapter_files

OUT = os.path.join(ROOT, "platform", "packs")


def icons_in(o, acc=None):
    acc = set() if acc is None else acc
    if isinstance(o, dict):
        for k, v in o.items():
            if k == "icon" and isinstance(v, str): acc.add(v)
            else: icons_in(v, acc)
    elif isinstance(o, list):
        for v in o: icons_in(v, acc)
    return acc


def export(lang):
    B.LANG_CUR = lang
    ap = B.AudioPack()
    ui = B.build_ui(lang, ap)
    chapters = []
    for f in chapter_files("ar"):
        ar = jload(f); tr = jload(os.path.join(ROOT, "content", lang, os.path.basename(f)))
        chapters.append(B.build_chapter(ar, tr, ap))
    la = jload(os.path.join(ROOT, "content/ar/library/rules.json"))
    rules_all = B.build_rules(lang, [r["id"] for c in la["categories"] for r in c["rules"]], ap)
    defaults = [r["id"] for c in la["categories"] for r in c["rules"] if r.get("default")]
    replies = B.build_replies(lang, ap)
    country = jload(os.path.join(ROOT, "content/country/sa.json"))
    sos = B.sos_block(lang, chapters, ui, country)
    B.iconize(chapters); B.iconize(rules_all); B.iconize(replies); B.iconize(sos)
    d = os.path.join(OUT, lang); shutil.rmtree(d, ignore_errors=True); os.makedirs(os.path.join(d, "a"))
    # مجموعة الطوارئ المكشوفة (نسخة من مقاطع الطوارئ) — تعمل قبل إدخال الرمز
    sos_ids = sorted({x for sec in sos["sections"] for it in sec["items"] for x in it["au"] if x})
    sos_g = {"buf": bytearray(), "clips": {}}
    for cid in sos_ids:
        g = ap.groups[ap.where[cid]]; off, ln = g["clips"][cid]
        sos_g["clips"][cid] = [len(sos_g["buf"]), ln]; sos_g["buf"] += g["buf"][off:off + ln]
    all_groups = dict(ap.groups); all_groups["sos"] = sos_g
    ak_p = os.path.join(ROOT, "platform", ".keys", f"{lang}.ak")   # مفتاح صوت اللغة ثابت عبر عمليات التصدير (لا يُرفع لـgit)
    os.makedirs(os.path.dirname(ak_p), exist_ok=True)
    if not os.path.exists(ak_p): open(ak_p, "w").write(os.urandom(32).hex())
    ak = bytes.fromhex(open(ak_p).read().strip())
    groups = {}
    for g, v in all_groups.items():
        fn = re.sub(r"[^a-z0-9]", "", g.lower())
        buf = bytes(v["buf"]); nonce = None
        if g not in ("ui", "sos"):
            n = os.urandom(12); buf = GC.chacha20(ak, n, 1, buf); nonce = n.hex()
        clips = v["clips"] if g == "sos" else {k: x for k, x in v["clips"].items() if k not in sos_ids}
        open(os.path.join(d, "a", fn + ".bin"), "wb").write(buf)
        open(os.path.join(d, "a", fn + ".b64"), "w").write(base64.b64encode(buf).decode())
        groups[g] = {"file": fn, "nonce": nonce, "clips": clips, "size": len(buf)}
    L = LANGS[lang]
    pack = {"lang": lang, "dir": L["dir"], "native": L["native"], "name": L["name"], "flagShort": B.FLAG_SHORT.get(lang, lang.upper()),
            "fontStack": B.FONT_STACK.get(lang, B.DEFAULT_STACK), "ui": ui, "chapters": chapters, "rules": rules_all,
            "ruleDefaults": defaults, "replies": replies, "sos": sos, "madam": B.build_madam(chapters), "groups": groups,
            "missing": ap.missing, "ak": ak.hex(), "limits": country["limits"], "emergency": country["emergency"],
            "built": time.strftime("%Y-%m-%d %H:%M"),
            # للخادم: رموز SVG لكل الأيقونات المستخدمة في الحزمة + الشعارات (assemble.js يبني sprite الكتاب منها)
            "sprite": {n: B.SPRITE[n] for n in sorted(set(B.UI_ICONS) | icons_in([chapters, rules_all, replies, sos])) if n in B.SPRITE},
            "emblems": {k: v["svg"] for k, v in B.EMBLEMS.items()}}
    json.dump(pack, open(os.path.join(d, "pack.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    # القالب المشترك: CSS+JS+خطوط مدمجة مسبقاً؛ يبقى فقط ما يخص الطلب
    tpl = open(B.TPL, encoding="utf-8").read()
    tpl = tpl.replace("{{CRYPTO_JS}}", B.minify(os.path.join(ROOT, "book/core/ghcrypto.js"))).replace("{{APP_JS}}", B.minify(os.path.join(ROOT, "book/core/app.js")))
    open(os.path.join(OUT, "template.html"), "w", encoding="utf-8").write(tpl)
    fonts = {lg: B.font_faces([lg]) for lg in ("ar", lang)}
    json.dump(fonts, open(os.path.join(d, "fonts.json"), "w"), ensure_ascii=False)
    size = sum(v["size"] for v in groups.values())
    print(f"pack {lang}: {len(chapters)} chapters, {sum(len(c['items']) for c in rules_all)} rules, {len(groups)} audio groups ({size/1048576:.2f} MB), missing {ap.missing}")
    # الكتالوج العام (لصفحة البيع)
    cat_p = os.path.join(OUT, "catalog.json"); cat = jload(cat_p, {"languages": {}})
    cat["languages"][lang] = {"native": L["native"], "name": L["name"], "dir": L["dir"], "ready": ap.missing == 0}
    cat["library"] = [{"id": c["id"], "icon": c["icon"], "title": c["title"], "rules": [{"id": r["id"], "icon": r.get("icon"), "text": r["text"], "level": r.get("level", ""), "default": bool(r.get("default"))} for r in c["rules"]]} for c in la["categories"]]
    json.dump(cat, open(cat_p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    for lg in args: export(lg)
    if "--sample" in sys.argv:
        for lg in args:
            r = B.build(lg, dict(B.DEMO_ORDER, order_id="SAMPLE", book_name="عيّنة مجانية", home_name="بيتك"), sample=True,
                        out_dir=os.path.join(ROOT, "platform", "public", "samples"))
            os.replace(r["file"], os.path.join(ROOT, "platform", "public", "samples", f"{lg}.html"))
            print("sample →", f"platform/public/samples/{lg}.html")
