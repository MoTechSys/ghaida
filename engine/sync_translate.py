#!/usr/bin/env python3
"""
sync_translate.py — مترجم تزايدي دقيق: يترجم فقط الجمل الجديدة أو التي تغيّر نصها العربي.

يعمل على كل أنواع المحتوى (الفصول + مكتبة القواعد + نصوص الواجهة + ردود العاملة) عبر تسطيحها
إلى أزواج (مسار، نص). كل ملف ترجمة يحفظ في _meta.src بصمة (hash) النص العربي لكل مسار، فيعرف
بالضبط ما تغيّر. هذا يمنع إعادة ترجمة 380 جملة لتعديل جملة واحدة، ويمنع بقاء ترجمة قديمة لنص عُدِّل.

الاستخدام:
    python3 engine/sync_translate.py am            # ترجم الناقص/المتغيّر لكل الملفات
    python3 engine/sync_translate.py am --dry      # اعرض ما سيُترجم فقط
    python3 engine/sync_translate.py am --stamp    # (مرة واحدة) اعتبر الترجمات الحالية مطابقة للعربي الحالي
    python3 engine/sync_translate.py am --only library/rules.json

بعدها: python3 engine/qa_translate.py am --fix (للفصول) ثم engine/tts.py.
"""
import os, sys, json, copy
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, LANGS, h, jload, jsave, source_docs, set_path, get_path, chat_json, KEY

MODEL = os.environ.get("TRANSLATE_MODEL", "gpt-5")
BATCH = int(os.environ.get("SYNC_BATCH", "18"))

SYSTEM = """You translate training material for migrant domestic workers (housemaids) employed in Saudi Arabia, from Arabic into {lang}.
Input: JSON {{"items":[{{"k":<key>,"ar":"<arabic>"}}...], "context":"<what these strings are>"}}.
Output ONLY JSON: {{"items":[{{"k":<same key>,"tr":"<translation>"}}...]}} — same keys, same count, same order.
RULES:
- Simple, warm, respectful everyday spoken {lang} that a woman with basic education understands when READ ALOUD. Short sentences.
- Second person feminine / feminine imperative where the language marks it. Negative commands must be unambiguous.
- SAFETY CONTENT: never reverse polarity (do/don't), never change numbers, objects or who does what. Re-check every sentence.
- Saudi-specific words (دلة, فنجال, كبسة, عباية, ثوب, شماغ, بخور, مجلس) → transliterate INTO THE TARGET SCRIPT, never Latin letters inside non-Latin text.
- Brand names (Clorox, Dettol, Flash) and app names → written phonetically in the target script (keep "Musaned" recognisable).
- Digits, phone numbers (911, 19911, 920002866) and times stay as Western digits.
- UI strings (buttons) must be SHORT (1–3 words). Never use the word "app/application": this product is a "book".
- If context says "worker replies": the worker taps the translation to make the phone SPEAK THE ARABIC to her employer — translate as what SHE is saying, first person, natural.
"""

CONTEXT = {
    "chapter": "chapter of the housemaid guide book",
    "library": "house rules chosen by the employer; short imperative rules + optional reason",
    "ui": "user-interface strings and short spoken instructions in the book (buttons, install guide, cover)",
    "replies": "worker replies: things the worker wants to SAY to the lady of the house (first person)",
}


def empty_like(src, kind):
    """هيكل ترجمة فارغ بنفس بنية المصدر (القيم النصية تُملأ لاحقاً)."""
    d = copy.deepcopy(src)
    d.pop("note", None)
    return d


def plan(lang, only=None):
    jobs = []  # (rel, kind, src, tr, [(path, ar)])
    for rel, kind, fn in source_docs():
        if only and rel != only: continue
        sp = os.path.join(ROOT, "content", "ar", rel); tp = os.path.join(ROOT, "content", lang, rel)
        src = jload(sp); tr = jload(tp)
        if tr is None:
            tr = empty_like(src, kind); tr["_meta"] = {"src": {}}
        meta = tr.setdefault("_meta", {}); srcmap = meta.setdefault("src", {})
        # ضمان أن البنية الهيكلية (عدد العناصر) مطابقة؛ وإلا ابدأ من هيكل المصدر مع الإبقاء على ما يطابق
        todo = []
        for path, ar in fn(src):
            key = "/".join(map(str, path))
            try: cur = get_path(tr, path)
            except (KeyError, IndexError, TypeError): cur = None
            if cur is None or srcmap.get(key) != h(ar) or cur == ar and lang != "ar":
                todo.append((path, ar))
        jobs.append((rel, kind, src, tr, todo))
    return jobs


def align_structure(src, tr):
    """يضمن أن tr يحوي كل المفاتيح/العناصر الموجودة في src (لنصوص جديدة أُضيفت)."""
    if isinstance(src, dict):
        for k, v in src.items():
            if k in ("note",): continue
            if k not in tr: tr[k] = copy.deepcopy(v)
            else: align_structure(v, tr[k])
        for k in list(tr.keys()):
            if k not in src and k != "_meta": del tr[k]
    elif isinstance(src, list):
        while len(tr) < len(src): tr.append(copy.deepcopy(src[len(tr)]))
        del tr[len(src):]
        for a, b in zip(src, tr): align_structure(a, b)


def copy_non_text(src, tr, kind):
    """القيم غير النصية (id/icon/type/level/default/audio) دائماً من المصدر."""
    if isinstance(src, dict):
        for k, v in src.items():
            if k in ("id", "icon", "type", "level", "default", "audio", "order", "version"): tr[k] = v
            elif isinstance(v, (dict, list)) and k in tr: copy_non_text(v, tr[k], kind)
    elif isinstance(src, list):
        for a, b in zip(src, tr): copy_non_text(a, b, kind)


def translate_batch(lang, kind, pairs):
    sysmsg = SYSTEM.format(lang=LANGS[lang]["tts_lang"].split(" (")[0])
    items = [{"k": i, "ar": ar} for i, (_, ar) in enumerate(pairs)]
    for attempt in range(3):
        out = chat_json(MODEL, [{"role": "system", "content": sysmsg},
                                {"role": "user", "content": json.dumps({"context": CONTEXT[kind], "items": items}, ensure_ascii=False)}])
        got = {o.get("k"): (o.get("tr") or "").strip() for o in out.get("items", [])}
        if all(got.get(i) for i in range(len(items))):
            return [got[i] for i in range(len(items))]
        print(f"      batch incomplete, retry {attempt+1}", file=sys.stderr)
    raise RuntimeError("batch failed")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args: print(__doc__); sys.exit(1)
    lang = args[0]; dry = "--dry" in sys.argv; stamp = "--stamp" in sys.argv
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else None
    if only in args: args.remove(only)

    if stamp:
        for rel, kind, fn in source_docs():
            tp = os.path.join(ROOT, "content", lang, rel); tr = jload(tp)
            if tr is None: continue
            src = jload(os.path.join(ROOT, "content", "ar", rel))
            tr.setdefault("_meta", {})["src"] = {"/".join(map(str, p)): h(ar) for p, ar in fn(src)}
            jsave(tp, tr); print(f"stamped {tp}")
        return

    jobs = plan(lang, only)
    total = sum(len(j[4]) for j in jobs)
    for rel, kind, _, _, todo in jobs:
        print(f"  {rel:28s} {kind:8s} todo={len(todo)}")
    print(f"[{lang}] total strings to translate: {total}")
    if dry or total == 0: return
    if not KEY: print("OPENAI_API_KEY missing"); sys.exit(1)

    for rel, kind, src, tr, todo in jobs:
        if not todo: continue
        align_structure(src, tr)
        batches = [todo[i:i + BATCH] for i in range(0, len(todo), BATCH)]
        with ThreadPoolExecutor(max_workers=int(os.environ.get("SYNC_WORKERS", "4"))) as ex:
            results = list(ex.map(lambda b: translate_batch(lang, kind, b), batches))
        srcmap = tr.setdefault("_meta", {}).setdefault("src", {})
        for b, res in zip(batches, results):
            for (path, ar), t in zip(b, res):
                set_path(tr, path, t); srcmap["/".join(map(str, path))] = h(ar)
        copy_non_text(src, tr, kind)
        tr["_meta"].update({"lang": lang, "model": MODEL})
        jsave(os.path.join(ROOT, "content", lang, rel), tr)
        print(f"  ✓ {rel}: {len(todo)} strings")


if __name__ == "__main__":
    main()
