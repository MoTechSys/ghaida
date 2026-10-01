#!/usr/bin/env python3
"""
qa_translate.py — بوابة جودة إلزامية للترجمة: مراجعة لغوية خبيرة لكل فصل مترجم.

الاستخدام:
    python3 engine/qa_translate.py am                # كل الفصول
    python3 engine/qa_translate.py am --chapter 02   # فصل واحد
    python3 engine/qa_translate.py am --fix          # يطبّق التصحيحات المقترحة تلقائياً على content/am/

المنطق:
- يرسل أزواج (عربي، مترجم) لنموذج قوي (gpt-5) بدور "لغوي أصلي" ليقيّم: الدقة، الطبيعية، وقلب المعنى.
- يعيد JSON: لكل جملة {ok: bool, fixed: "..."} + حكم عام.
- --fix يستبدل الجمل غير المقبولة بالتصحيح ويحفظ.
- يكتب تقريراً في content/<lang>/_qa_report.json.

القاعدة: لا يُبنى كتاب للنشر إلا وحالة QA = PASS لكل فصوله (خصوصاً 02-safety).
"""
import json, os, sys, glob, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = json.load(open(os.path.join(ROOT, "engine/languages.json"), encoding="utf-8"))
BASE = os.environ.get("OPENAI_BASE_URL", "https://www.genspark.ai/api/llm_proxy/v1").rstrip("/")
KEY = os.environ.get("OPENAI_API_KEY")
MODEL = os.environ.get("QA_MODEL", "gpt-5")

SYSTEM = """You are a strict bilingual reviewer: native speaker of {lang} AND fluent in Arabic. You review a training guide read aloud to housemaids in Saudi Arabia who have basic literacy.
For each pair (ar = source, tr = translation) judge the translation:
- meaning: identical to Arabic? Especially polarity (do/don't), objects, numbers, who does what.
- naturalness: everyday spoken {lang}, feminine imperative where applicable, no Latin letters/English words inside non-Latin script (brand names must be in {lang} script), no awkward literal calques.
Return ONLY JSON: {{"items":[{{"i":<index>,"ok":true|false,"issue":"<short, in Arabic>","fixed":"<corrected {lang} sentence or empty if ok>"}}...],"verdict":"PASS"|"FAIL","summary":"<2 lines in Arabic>"}}
Mark ok=false for ANY meaning error, however small. Mark ok=false for unnatural phrasing only if a native would stumble when reading aloud."""


def chat(messages):
    body = json.dumps({"model": MODEL, "messages": messages, "response_format": {"type": "json_object"}}).encode()
    req = urllib.request.Request(f"{BASE}/chat/completions", data=body,
                                 headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    for i in range(3):
        try:
            with urllib.request.urlopen(req, timeout=400) as r:
                return json.loads(json.loads(r.read())["choices"][0]["message"]["content"])
        except Exception as e:
            print(f"   retry {i+1}: {e}", file=sys.stderr); time.sleep(5)
    raise RuntimeError("QA LLM failed")


def flatten(d):
    """قائمة مراجع (path, text) لكل جملة قابلة للترجمة في فصل."""
    refs = [(("title",), d["title"])]
    if d.get("subtitle"): refs.append((("subtitle",), d["subtitle"]))
    for si, s in enumerate(d["sections"]):
        if s.get("title"): refs.append((("sections", si, "title"), s["title"]))
        if s.get("text"): refs.append((("sections", si, "text"), s["text"]))
        for ii, it in enumerate(s.get("items", [])):
            refs.append((("sections", si, "items", ii, "text"), it["text"]))
            if it.get("why"): refs.append((("sections", si, "items", ii, "why"), it["why"]))
    return refs


def set_path(d, path, value):
    o = d
    for k in path[:-1]: o = o[k]
    o[path[-1]] = value


def qa_chapter(lang, ar_path, fix=False):
    tr_path = os.path.join(ROOT, "content", lang, os.path.basename(ar_path))
    if not os.path.exists(tr_path):
        return None
    ar = json.load(open(ar_path, encoding="utf-8")); tr = json.load(open(tr_path, encoding="utf-8"))
    ra, rt = flatten(ar), flatten(tr)
    if len(ra) != len(rt):
        return {"chapter": ar["id"], "verdict": "FAIL", "summary": f"عدد الجمل مختلف {len(ra)} vs {len(rt)}", "bad": len(ra)}
    pairs = [{"i": i, "ar": a[1], "tr": t[1]} for i, (a, t) in enumerate(zip(ra, rt))]
    sysmsg = SYSTEM.format(lang=LANGS[lang]["tts_lang"].split(" (")[0])
    # دفعات صغيرة (QA_BATCH، افتراضي 20) — 40 كانت تعطي 524 على الفصول الكبيرة
    results, bad = [], 0
    B = int(os.environ.get("QA_BATCH", "20"))
    for k in range(0, len(pairs), B):
        res = chat([{"role": "system", "content": sysmsg}, {"role": "user", "content": json.dumps(pairs[k:k + B], ensure_ascii=False)}])
        results += res.get("items", [])
    for r in results:
        if not r.get("ok", True):
            bad += 1
            if fix and r.get("fixed"):
                set_path(tr, rt[r["i"]][0], r["fixed"].strip())
    if fix and bad:
        tr.setdefault("_meta", {})["qa_fixed"] = bad
        json.dump(tr, open(tr_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    verdict = "PASS" if bad == 0 else ("FIXED" if fix else "FAIL")
    return {"chapter": ar["id"], "verdict": verdict, "total": len(pairs), "bad": bad,
            "issues": [{"i": r["i"], "ar": pairs[r["i"]]["ar"], "tr": pairs[r["i"]]["tr"], "issue": r.get("issue"), "fixed": r.get("fixed")} for r in results if not r.get("ok", True)]}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args: print(__doc__); sys.exit(1)
    lang = args[0]; fix = "--fix" in sys.argv
    chapter = sys.argv[sys.argv.index("--chapter") + 1] if "--chapter" in sys.argv else None
    report = []
    for ar_path in sorted(glob.glob(os.path.join(ROOT, "content/ar/[0-9]*.json"))):
        if chapter and not os.path.basename(ar_path).startswith(chapter): continue
        print(f"QA {os.path.basename(ar_path)} -> {lang} ...", flush=True)
        r = qa_chapter(lang, ar_path, fix)
        if r is None: print("   (no translation yet)"); continue
        report.append(r)
        print(f"   {r['verdict']}  bad={r['bad']}/{r.get('total','?')}")
        for iss in r.get("issues", [])[:8]:
            print(f"     • {iss['ar'][:45]} | {iss['issue']}")
    rp = os.path.join(ROOT, "content", lang, "_qa_report.json")
    # دمج لا استبدال: تقرير كل فصل يبقى حتى يُعاد فحص ذلك الفصل نفسه (كان التقرير يُمسح في كل تشغيل جزئي)
    old = {}
    if os.path.exists(rp):
        try: old = {c["chapter"]: c for c in json.load(open(rp, encoding="utf-8")).get("chapters", [])}
        except Exception: old = {}
    stamp = time.strftime("%Y-%m-%d %H:%M")
    for r in report: r["date"] = stamp; old[r["chapter"]] = r
    merged = [old[k] for k in sorted(old)]
    json.dump({"lang": lang, "model": MODEL, "date": stamp, "chapters": merged}, open(rp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"report -> {rp}")
    if any(r["verdict"] == "FAIL" for r in report): sys.exit(2)


if __name__ == "__main__":
    main()
