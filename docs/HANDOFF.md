# HANDOFF — حالة العمل الحالية (حدّث هذا الملف في نهاية كل جلسة)

_آخر تحديث: 2026-09-30 — الجلسة 2 (اكتمل الكتاب الأمهري الأول) (الوكيل: Claude عبر Genspark، بتوجيه م. معين)_

## ✅ ما أُنجز
| البند | الحالة | ملاحظات |
|---|---|---|
| تحليل محادثة واتساب (نص + 22 صوت + وسائط) | ✅ | `_analysis/transcripts_voice_notes.md` |
| بحث السوق والمنافسين | ✅ | `_analysis/market_research.md` — السوق: PDF 30 ريال بلا صوت |
| قرار المنتج: ملف HTML واحد أوفلاين، نسخة/لغة | ✅ | `docs/DECISIONS.md` ADR-001..008 |
| المحتوى العربي (8 فصول، 319 جملة) | ✅ v1 | `content/ar/` — يحتاج مراجعة غيداء/معين لاحقاً (لهجة، تفاصيل بيت) |
| محرك الترجمة | ✅ | `engine/translate.py` — gpt-5، تقسيم بالأقسام، تحقق بنية |
| بوابة جودة الترجمة | ✅ | `engine/qa_translate.py` — **إلزامية قبل النشر** |
| محرك الصوت | ✅ | `engine/tts.py` — كاش، ضغط 32kbps، ~4KB/ث |
| باني الكتاب | ✅ | `engine/build_book.py` — ملف واحد + خيار PWA |
| قالب الواجهة pink | ✅ v1 (7/10) | `book/templates/book.html` |
| صوت عربي (380 جملة) | ✅ 380/380 | 9.1MB مصدر @32k. **أرشيف**: https://github.com/MoTechSys/ghaida/releases/tag/audio-v0.1 |
| ترجمة أمهرية (gpt-5) | ✅ 8/8 فصول | `content/am/` مرفوعة في git |
| QA أمهري | ✅ مع --fix | 3–4 تصحيحات/فصل في الفصول 1–3 (تقرير: `content/am/_qa_report.json`). الفصول 4–8 QA جارٍ عند إغلاق الجلسة — أعد `qa_translate.py am --fix` ثم `tts.py am` ثم build |
| صوت أمهري | ✅ 380/380 | 7.9MB مصدر |
| **الكتاب الأمهري الكامل** | ✅ **v0.1 مبني** | `dist/ghaida-book-am.html` **11.7MB** (صوت مشحون @20k). تقييم بصري 7/10، "جاهز لإرسال للعميلة" |
| خطوط مضمّنة (Ethiopic + Naskh) | ✅ | `book/fonts/*.woff2` تُضمَّن تلقائياً |

## 🔴 المتبقي (بالترتيب)
0. **أول أمر في الجلسة القادمة** (ساندبوكس جديد = `audio/` فارغ):
   ```bash
   cd /home/user/webapp && curl -sL https://github.com/MoTechSys/ghaida/releases/download/audio-v0.1/ghaida_audio_ar_2026-09-30.tar.gz | tar -xz && curl -sL https://github.com/MoTechSys/ghaida/releases/download/audio-v0.1/ghaida_audio_am_2026-09-30.tar.gz | tar -xz
   python3 engine/qa_translate.py am --fix && python3 engine/tts.py am && python3 engine/build_book.py am --pwa
   ```
   (AI Drive `/mnt/aidrive` كان للقراءة فقط → نستخدم GitHub Releases للأرشيف.)
1. **إكمال QA الفصول 4–8 أمهري** ثم إعادة الصوت للجمل المصححة والبناء (الأمر أعلاه).
2. **مراجعة سمعية**: مقطع أمهري عشوائي فُرِّغ عكسياً بتطابق ≈98% ✅. كرّر على 5 مقاطع من الفصول 6–7.
3. **معاينة لغيداء**: أرسل `dist/ghaida-book-am.html` (≈12MB) على واتساب + رابط PWA. اجمع ملاحظاتها على: الألوان، سهولة الاستخدام، المحتوى الناقص من واقع بيوت جدة.
4. **تحسين التصميم إلى 9/10**: تضمين خط Ethiopic WOFF2 (~200KB) للأجهزة القديمة؛ أيقونات "افعل/لا تفعل" مرسومة بدل الإيموجي (توليد بـ nano-banana، حزمة SVG موحّدة)؛ صفحة غلاف (Cover) فيها اسم البيت (تخصيص بسيط: `?home=بيت أم سارة`).
5. **بقية اللغات**: tl → bn → id → si → ur → sw → en. كل لغة: translate → qa → tts → build (≈1 ساعة/لغة معظمها انتظار).
6. **صفحة بيع (Landing)** بسيطة pink: اختيار الجنسية → زر واتساب لغيداء → بعد التحويل تُرسل الملف. (Cloudflare Pages، مجاناً).
7. **PDF مطبوع** مولَّد من نفس المحتوى (اختياري — بعض العميلات يطبعن ويغلّفن حرارياً كما في السوق).
8. تحديث التسعير مع غيداء (49/79 مقترح).

## ⚠️ مشاكل معروفة / دروس
- `gpt-5-mini` **غير مقبول للترجمة** (أخطاء معنى خطيرة في الأمهرية). استخدم gpt-5 دائماً + QA.
- الفصل 04 (56 عنصراً) يفشل كـJSON واحد → التقسيم بالأقسام يعمل.
- Playwright المحلي لا يعمل (مكتبات نظام ناقصة) → استخدم `gsk screenshot <url>` للقطات.
- `audio/` و `dist/` خارج git (حجم). احفظ أرشيف الصوت في AI Drive: `tar -czf ghaida_audio_YYYY-MM-DD.tar.gz audio/ && cp ... /mnt/aidrive/`.
- gpt-5 أبطأ ويعطي 524 أحياناً على الفصول الكبيرة → `TRANSLATE_WHOLE_MAX=12` يجعل معظم الفصول تُترجم قسماً بقسم (موثوق). لا تشغّل نسختين من translate.py معاً (تكتبان نفس الملفات).
- `pkill -f translate.py` يقتل شِل الوكيل نفسه (النمط يطابق أمر الشِل) → استخدم `ps -eo pid,args | grep "[e]ngine/translate"` ثم kill بالـ PID.
- `tts.py`/`build_book.py` تقرأ `content/<lang>/[0-9]*.json` فقط (تجاهل `_qa_report.json`).
- الصوت يُشحن داخل الكتاب @20kbps/16kHz (تفريغ عكسي 100% ✅) — المصدر يبقى @32k في `audio/`. تغيير: `SHIP_BITRATE=24k python3 engine/build_book.py am`.
- الصوت العربي MSA لا خليجي — مقبول ومفهوم (تقييم 9/10)؛ إن أراد معين لهجة خليجية أقوى، جرّب صوت Gemini آخر أو ElevenLabs مع نص مشكول.

## 🔗 روابط مهمة
- GitHub: https://github.com/MoTechSys/ghaida (branch العمل: `genspark_ai_developer`)
- معاينة الساندبوكس (مؤقتة): يُعاد إنشاؤها بـ `cd dist && python3 -m http.server 8080` + GetServiceUrl.

## 📊 أرقام مرجعية
- جمل عربية فريدة: 380 → صوت ≈ 5.5MB
- جمل أمهرية: ≈380 → صوت ≈ 6MB
- الكتاب الكامل بلغتين: ≈ 12MB (هدف < 15MB)
- تكلفة توليد لغة واحدة (ترجمة + QA + صوت): منخفضة جداً (بضعة دولارات credits)
