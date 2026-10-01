#!/usr/bin/env python3
"""common.py — أدوات مشتركة لكل المحرك: المسارات، الـhash، تسطيح المحتوى، استدعاء LLM.

المحتوى ثلاثة أنواع (كلها مصدرها العربي في content/ar/):
  1) الفصول          content/ar/NN-*.json           (بنية schema.json)
  2) مكتبة القواعد    content/ar/library/rules.json  (قواعد جاهزة تختار منها ربة البيت)
  3) نصوص الواجهة     content/ar/_ui.json            (أزرار، إرشاد التثبيت، الغلاف…)
  4) ردود العاملة     content/ar/_replies.json       (تضغطها العاملة فتسمع ربة البيت العربي)
"""
import json, os, glob, hashlib, time, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = json.load(open(os.path.join(ROOT, "engine/languages.json"), encoding="utf-8"))


def h(text):
    """نفس الـhash المستخدم في tts.py و build_book.py (لا تغيّره — الكاش مبني عليه)."""
    return hashlib.sha1(text.strip().encode("utf-8")).hexdigest()[:16]


def jload(p, default=None):
    if not os.path.exists(p):
        return default
    return json.load(open(p, encoding="utf-8"))


def jsave(p, d, indent=2):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=indent)


def chapter_files(lang="ar"):
    return sorted(glob.glob(os.path.join(ROOT, "content", lang, "[0-9]*.json")))


# ---------- تسطيح: قائمة (path, text) لكل جملة قابلة للترجمة ----------
def flatten_chapter(d):
    refs = [(("title",), d["title"])]
    if d.get("subtitle"): refs.append((("subtitle",), d["subtitle"]))
    for si, s in enumerate(d["sections"]):
        if s.get("title"): refs.append((("sections", si, "title"), s["title"]))
        if s.get("text"): refs.append((("sections", si, "text"), s["text"]))
        for ii, it in enumerate(s.get("items", [])):
            refs.append((("sections", si, "items", ii, "text"), it["text"]))
            if it.get("why"): refs.append((("sections", si, "items", ii, "why"), it["why"]))
    return refs


def flatten_library(d):
    refs = []
    for ci, c in enumerate(d["categories"]):
        refs.append((("categories", ci, "title"), c["title"]))
        for ri, r in enumerate(c["rules"]):
            refs.append((("categories", ci, "rules", ri, "text"), r["text"]))
            if r.get("why"): refs.append((("categories", ci, "rules", ri, "why"), r["why"]))
    return refs


def flatten_ui(d):
    return [(("strings", k, "t"), v["t"]) for k, v in d["strings"].items()]


def flatten_replies(d):
    return [(("replies", i, "text"), r["text"]) for i, r in enumerate(d["replies"])]


def set_path(d, path, value):
    o = d
    for k in path[:-1]: o = o[k]
    o[path[-1]] = value


def get_path(d, path):
    o = d
    for k in path: o = o[k]
    return o


# ---------- كل ملفات المصدر ونوعها ----------
def source_docs():
    """[(relpath, kind, flatten_fn)] لكل ملف عربي مصدر."""
    out = [(os.path.relpath(f, os.path.join(ROOT, "content", "ar")), "chapter", flatten_chapter) for f in chapter_files("ar")]
    for rel, kind, fn in (("library/rules.json", "library", flatten_library), ("_ui.json", "ui", flatten_ui), ("_replies.json", "replies", flatten_replies)):
        if os.path.exists(os.path.join(ROOT, "content", "ar", rel)):
            out.append((rel, kind, fn))
    return out


def audio_texts(lang):
    """كل الجمل التي تحتاج صوتاً بلغة ما (فصول + مكتبة + ردود + نصوص الواجهة المعلَّمة audio)."""
    out = []
    for rel, kind, fn in source_docs():
        d = jload(os.path.join(ROOT, "content", lang, rel))
        if d is None: continue
        if kind == "ui":
            src = jload(os.path.join(ROOT, "content", "ar", rel))
            out += [d["strings"][k]["t"] for k, v in src["strings"].items() if v.get("audio") and k in d["strings"]]
        else:
            out += [t for _, t in fn(d)]
    seen, uniq = set(), []
    for t in out:
        t = (t or "").strip()
        if t and t not in seen:
            seen.add(t); uniq.append(t)
    return uniq


# ---------- LLM (OpenAI-compatible proxy) ----------
BASE = os.environ.get("OPENAI_BASE_URL", "https://www.genspark.ai/api/llm_proxy/v1").rstrip("/")
KEY = os.environ.get("OPENAI_API_KEY")


def chat_json(model, messages, retries=4, timeout=400):
    body = json.dumps({"model": model, "messages": messages, "response_format": {"type": "json_object"}}).encode()
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(f"{BASE}/chat/completions", data=body,
                                         headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                c = json.loads(r.read())["choices"][0]["message"]["content"].strip()
            if c.startswith("```"):
                c = c.split("\n", 1)[1].rsplit("```", 1)[0]
            a, b = c.find("{"), c.rfind("}")
            return json.loads(c[a:b + 1])
        except Exception as e:
            last = e
            print(f"   llm retry {i+1}: {e}", file=sys.stderr)
            time.sleep(4 * (i + 1))
    raise RuntimeError(f"LLM failed: {last}")
