#!/usr/bin/env python3
"""
tts.py — يولّد ملف صوت لكل جملة في فصول لغة معينة، مع كاش حسب hash النص.

الاستخدام:
    python3 engine/tts.py ar                 # صوت عربي لكل الجمل
    python3 engine/tts.py am                 # صوت أمهري
    python3 engine/tts.py am --chapter 02    # فصل واحد
    python3 engine/tts.py am --limit 20      # أول 20 جملة فقط (للتجربة)
    python3 engine/tts.py am --dry           # إحصاء فقط بدون توليد

المخرجات:
    audio/<lang>/<sha1(text)[:16]>.mp3   (mono 24kHz ~32kbps — صغير جداً)
    audio/<lang>/index.json              { hash: {text, duration_s, bytes} }

المتطلبات: gsk CLI (مصادق تلقائياً في الساندبوكس) + ffmpeg.
كل جملة = استدعاء واحد. الكاش يمنع إعادة التوليد. آمن للتشغيل المتكرر.
"""
import json, os, sys, glob, hashlib, subprocess, tempfile, time, threading
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = json.load(open(os.path.join(ROOT, "engine/languages.json"), encoding="utf-8"))

# اختيار النموذج/الصوت لكل لغة. ElevenLabs v4 متعدد اللغات ويقرأ الخط الأصلي (أمهري/بنغالي/سنهالا...).
# Gemini TTS بديل ممتاز للعربية بلهجة طبيعية. غيّر هنا فقط عند تبديل الأصوات.
VOICE = {
    "default": {"model": "elevenlabs/v4-tts", "params": {"speaker": "Samara", "stability": 0.6, "similarity_boost": 0.8, "style": 0.1, "output_format": "mp3_22050_32", "tier": "standard"}},
    "ar":      {"model": "google/gemini-3.1-flash-tts-preview", "params": {"speakers": [{"speaker": "Speaker1", "voice_name": "Kore"}], "instructions": "Warm, calm, clear female Saudi Arabic voice. Speak slowly and gently like a kind teacher explaining to a new housemaid. Standard Arabic with soft Gulf pronunciation."}},
}


def sentences_of(lang, chapter_filter=None):
    """كل الجمل القابلة للنطق في فصول لغة: title, subtitle, section title/text, item text/why."""
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, "content", lang, "*.json"))):
        if chapter_filter and not os.path.basename(f).startswith(chapter_filter):
            continue
        d = json.load(open(f, encoding="utf-8"))
        out += [d["title"]]
        if d.get("subtitle"): out.append(d["subtitle"])
        for s in d["sections"]:
            if s.get("title"): out.append(s["title"])
            if s.get("text"): out.append(s["text"])
            for it in s.get("items", []):
                out.append(it["text"])
                if it.get("why"): out.append(it["why"])
    # إزالة التكرار مع حفظ الترتيب
    seen, uniq = set(), []
    for t in out:
        t = t.strip()
        if t and t not in seen:
            seen.add(t); uniq.append(t)
    return uniq


def h(text):
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


def gen_one(text, lang, out_mp3):
    cfg = VOICE.get(lang, VOICE["default"])
    params = dict(cfg["params"])
    prompt = text
    if cfg["model"].startswith("google/"):
        prompt = f"Speaker1: {text}"
    else:
        # ElevenLabs: تلميح اللغة يحسّن النطق للغات غير اللاتينية
        params.setdefault("language_hint", LANGS[lang]["tts_lang"])
        params.pop("language_hint")  # غير مدعوم في schema — نعتمد على الخط الأصلي
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as tf:
        json.dump({"prompt": prompt, "model": cfg["model"], "params": params, "file_name": h(text)}, tf, ensure_ascii=False)
        args_file = tf.name
    raw = out_mp3 + ".raw.mp3"
    for attempt in range(3):
        r = subprocess.run(["gsk", "audio", "--args-file", args_file, "-o", raw, "--output", "json"],
                           capture_output=True, text=True, timeout=300)
        if r.returncode == 0 and os.path.exists(raw) and os.path.getsize(raw) > 1000:
            break
        time.sleep(2 + attempt * 3)
    else:
        os.unlink(args_file)
        raise RuntimeError(f"TTS failed: {r.stderr[-400:]} {r.stdout[-400:]}")
    os.unlink(args_file)
    # ضغط قوي: mono, 24kHz, 32kbps — كافٍ للكلام، حجم ≈ 4KB/ثانية
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-ac", "1", "-ar", "24000", "-b:a", "32k",
                    "-af", "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,apad=pad_dur=0.15",
                    out_mp3], check=True)
    os.unlink(raw)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out_mp3],
                               capture_output=True, text=True).stdout.strip() or 0)
    return dur


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args: print(__doc__); sys.exit(1)
    lang = args[0]
    chapter = sys.argv[sys.argv.index("--chapter") + 1] if "--chapter" in sys.argv else None
    limit = int(sys.argv[sys.argv.index("--limit") + 1]) if "--limit" in sys.argv else None
    dry = "--dry" in sys.argv

    out_dir = os.path.join(ROOT, "audio", lang)
    os.makedirs(out_dir, exist_ok=True)
    idx_path = os.path.join(out_dir, "index.json")
    index = json.load(open(idx_path, encoding="utf-8")) if os.path.exists(idx_path) else {}

    sents = sentences_of(lang, chapter)
    todo = [t for t in sents if h(t) not in index or not os.path.exists(os.path.join(out_dir, h(t) + ".mp3"))]
    if limit: todo = todo[:limit]
    print(f"[{lang}] sentences={len(sents)} cached={len(sents)-len(todo)} todo={len(todo)}")
    if dry: return
    total_bytes = sum(v["bytes"] for v in index.values())
    lock = threading.Lock(); done_n = [0]
    workers = int(os.environ.get("TTS_WORKERS", "4"))

    def work(t):
        out_mp3 = os.path.join(out_dir, h(t) + ".mp3")
        dur = gen_one(t, lang, out_mp3)
        return t, out_mp3, dur

    with ThreadPoolExecutor(max_workers=workers) as ex:
        futs = [ex.submit(work, t) for t in todo]
        for f in as_completed(futs):
            try:
                t, out_mp3, dur = f.result()
            except Exception as e:
                print(f"  !! FAILED :: {str(e)[:120]}", flush=True); continue
            b = os.path.getsize(out_mp3)
            with lock:
                total_bytes += b; done_n[0] += 1
                index[h(t)] = {"text": t, "duration_s": round(dur, 2), "bytes": b}
                json.dump(index, open(idx_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
                print(f"  ok {done_n[0]}/{len(todo)} {dur:.1f}s {b//1024}KB | {t[:60]}", flush=True)
    print(f"[{lang}] done. total audio = {total_bytes/1024/1024:.2f} MB for {len(index)} clips")


if __name__ == "__main__":
    main()
