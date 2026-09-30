#!/usr/bin/env python3
"""
translate.py — يترجم فصول content/ar/*.json إلى content/<lang>/*.json بنفس البنية.

الاستخدام:
    python3 engine/translate.py am            # لغة واحدة
    python3 engine/translate.py am tl bn      # عدة لغات
    python3 engine/translate.py --all         # كل اللغات في engine/languages.json (عدا ar)
    python3 engine/translate.py am --force    # إعادة الترجمة حتى لو الملف موجود

المنطق:
- يستخدم OpenAI-compatible proxy (OPENAI_BASE_URL / OPENAI_API_KEY من البيئة).
- يرسل كل فصل كـ JSON كامل ويطلب إرجاع نفس البنية مترجمة (المفاتيح ثابتة، الأيقونات ثابتة).
- يتحقق أن عدد الأقسام/العناصر متطابق قبل الحفظ (حماية من التلف).
- الترجمة بأسلوب بسيط دافئ مناسب لسيدة بالغة تعليمها محدود.
- الكلمات السعودية الخاصة (دلة، فنجال، كبسة، عباية، ثوب، شماغ، بخور، مجلس) تُنقل صوتياً + شرح بين قوسين أول مرة.
"""
import json, os, sys, glob, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = json.load(open(os.path.join(ROOT, "engine/languages.json"), encoding="utf-8"))
BASE = os.environ.get("OPENAI_BASE_URL", "https://www.genspark.ai/api/llm_proxy/v1").rstrip("/")
KEY = os.environ.get("OPENAI_API_KEY")
MODEL = os.environ.get("TRANSLATE_MODEL", "gpt-5-mini")

SYSTEM = """You are an expert translator producing training material for migrant domestic workers (housemaids) employed in Saudi Arabia.
Translate every Arabic string value in the JSON into {lang_name}.
RULES:
1. Return ONLY valid JSON with EXACTLY the same structure, keys, array lengths and order. Do not add or remove items.
2. Do NOT translate or change: "id", "order", "icon", "type", "level" values.
3. Translate: "title", "subtitle", "text", and every item's "text" and "why".
4. Register: simple, warm, respectful, everyday spoken language a woman with basic education understands when read aloud. Short sentences. Second person feminine where the language marks it.
5. Saudi-specific words (دلة dallah, فنجال finjal, كبسة kabsa, عباية abaya, ثوب thobe, شماغ shemagh, بخور bakhoor, مجلس majlis, مبخرة, تميس, دقوس, لومي) → transliterate them in the target script and add a very short gloss in parentheses the first time in each chapter.
6. Brand/product names (Clorox, Dettol, Flash) → keep the brand name in Latin script, add local generic word if helpful (e.g. bleach).
7. Numbers, phone numbers (911, 19911) and times stay as digits.
8. In the phrasebook chapter (id 07-phrasebook) the Arabic phrase itself must be preserved: write the translation as: "<meaning in target language> — <original Arabic phrase>". The worker needs to see what she will hear.
"""


def chat(messages, retries=3):
    body = json.dumps({"model": MODEL, "messages": messages, "response_format": {"type": "json_object"}}).encode()
    req = urllib.request.Request(f"{BASE}/chat/completions", data=body, headers={
        "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    for i in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                d = json.loads(r.read())
                return d["choices"][0]["message"]["content"], d.get("usage", {})
        except Exception as e:
            print(f"   retry {i+1}: {e}", file=sys.stderr)
            time.sleep(3 * (i + 1))
    raise RuntimeError("LLM failed")


def shape(d):
    """توقيع بنية الفصل للتحقق من تطابق الترجمة."""
    return [(s["id"], s["type"], len(s.get("items", []))) for s in d["sections"]]


def translate_chapter(src_path, lang, force=False):
    out_dir = os.path.join(ROOT, "content", lang)
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, os.path.basename(src_path))
    src = json.load(open(src_path, encoding="utf-8"))
    if os.path.exists(out_path) and not force:
        existing = json.load(open(out_path, encoding="utf-8"))
        if shape(existing) == shape(src):
            print(f"   skip (exists) {out_path}")
            return
    print(f"   translating {os.path.basename(src_path)} -> {lang} ...", flush=True)
    sysmsg = SYSTEM.format(lang_name=LANGS[lang]["tts_lang"].split(" (")[0])
    content, usage = chat([{"role": "system", "content": sysmsg},
                           {"role": "user", "content": json.dumps(src, ensure_ascii=False)}])
    out = json.loads(content)
    if shape(out) != shape(src):
        # محاولة ثانية بتذكير صارم
        content, usage = chat([{"role": "system", "content": sysmsg},
                               {"role": "user", "content": json.dumps(src, ensure_ascii=False)},
                               {"role": "assistant", "content": content},
                               {"role": "user", "content": "Structure mismatch. Return the JSON again with EXACTLY the same sections, ids, types and item counts as the source."}])
        out = json.loads(content)
        if shape(out) != shape(src):
            raise RuntimeError(f"structure mismatch for {src_path} -> {lang}")
    # إعادة القيم غير القابلة للترجمة من المصدر (أمان)
    out["id"], out["order"], out["icon"] = src["id"], src["order"], src["icon"]
    for s_out, s_src in zip(out["sections"], src["sections"]):
        s_out["id"], s_out["type"] = s_src["id"], s_src["type"]
        for i_out, i_src in zip(s_out.get("items", []), s_src.get("items", [])):
            if "icon" in i_src: i_out["icon"] = i_src["icon"]
            if "level" in i_src: i_out["level"] = i_src["level"]
    out["_meta"] = {"source": "content/ar/" + os.path.basename(src_path), "lang": lang, "model": MODEL,
                    "tokens": usage.get("total_tokens"), "generated": time.strftime("%Y-%m-%d")}
    json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"   saved {out_path} ({usage.get('total_tokens')} tokens)")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    langs = [l for l in LANGS if l != "ar"] if "--all" in sys.argv else args
    if not langs:
        print(__doc__); sys.exit(1)
    if not KEY:
        print("OPENAI_API_KEY missing"); sys.exit(1)
    chapters = sorted(glob.glob(os.path.join(ROOT, "content/ar/*.json")))
    for lang in langs:
        if lang not in LANGS:
            print(f"unknown lang {lang}"); continue
        print(f"== {lang} ({LANGS[lang]['name']})")
        for ch in chapters:
            translate_chapter(ch, lang, force)


if __name__ == "__main__":
    main()
