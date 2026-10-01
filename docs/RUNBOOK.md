# RUNBOOK — أوامر التشغيل

## المتطلبات
- Python 3.10+ (بدون حزم خارجية — مكتبة قياسية فقط)
- `ffmpeg` + `ffprobe`
- `gsk` CLI مصادَق (موجود في ساندبوكس Genspark تلقائياً) — للصوت
- متغيرات البيئة: `OPENAI_API_KEY`, `OPENAI_BASE_URL` — للترجمة

## التحقق السريع
```bash
cd /home/user/webapp
python3 -c "import json,glob;[json.load(open(f)) for f in glob.glob('content/*/*.json')];print('json ok')"
python3 engine/tts.py ar --dry      # كم جملة عربية مولَّدة/متبقية
python3 engine/tts.py am --dry
ls -la dist/
```

## إضافة/تعديل محتوى
1. عدّل أو أضف فصلاً في `content/ar/NN-name.json` (اتبع `content/schema.json`، جمل قصيرة، أيقونة لكل عنصر، `why` للقواعد المهمة، `level` للخطر).
2. أعد الترجمة للفصل: `python3 engine/translate.py am --force` (يعيد كل الفصول؛ أو احذف الملف المستهدف من `content/am/` ثم شغّل بدون `--force`).
3. صوت: `python3 engine/tts.py ar && python3 engine/tts.py am` (الجمل الجديدة فقط تُولَّد).
4. بناء: `python3 engine/build_book.py am --pwa`.
5. commit + push + PR.

## إضافة لغة جديدة
1. أضفها في `engine/languages.json` (الكود، الاسم، الاتجاه، العلم، اسم TTS).
2. أضف نصوص الواجهة في `engine/build_book.py: UI` وخطاً في `FONT_STACK` إن لزم.
3. `translate.py <lang>` → `tts.py <lang>` → `build_book.py <lang> --pwa`.
4. اختبر النطق: ولّد جملة واحدة وفرّغها عكسياً (`audio_transcribe`) — يجب تطابق ≥95%.

## تبديل صوت TTS
عدّل `engine/tts.py: VOICE`. ثم `rm -rf audio/<lang>` وأعد التوليد.

## المعاينة محلياً
```bash
cd dist && python3 -m http.server 8080   # ثم GetServiceUrl على المنفذ 8080
```
افتح `ghaida-book-am.html` مباشرة أو `am/index.html` (نسخة PWA).

## النشر (اختياري — النسخة المستضافة)
- **Cloudflare Pages** عبر `wrangler pages deploy dist/` أو مهارة `gsk-hosted-deploy`.
- الملف المستقل لا يحتاج نشراً؛ يُرسل مباشرة.

## حفظ الصوت المولَّد (لأنه خارج git)
```bash
tar -czf ghaida_audio_$(date +%F).tar.gz audio/ && cp ghaida_audio_*.tar.gz /mnt/aidrive/
```
أو ارفعه كـ GitHub Release asset.

## أخطاء شائعة
| العرض | السبب | الحل |
|---|---|---|
| `structure mismatch` في الترجمة | النموذج غيّر عدد العناصر | يعاد تلقائياً مرة؛ إن فشل، قسّم الفصل أو استخدم `TRANSLATE_MODEL=gpt-5` |
| `TTS failed` | حد معدل أو نص طويل | السكربت يعيد 3 مرات؛ شغّله مجدداً لاحقاً (الكاش يحفظ التقدم) |
| صوت `na` (باهت) في الكتاب | الجملة بلا mp3 | شغّل `tts.py` للغة وأعد البناء |
| خط غريب للأمهرية | جهاز بلا خط Ethiopic | أندرويد/iOS الحديثة تحوي Noto؛ خيار مستقبلي: تضمين خط WOFF2 (~200KB) |


---
# v2 — الكتاب الشخصي والمنصة (الجلسة 3)

## خط إنتاج لغة جديدة (كامل)
```bash
python3 engine/sync_translate.py tl            # يترجم الفصول + المكتبة + الواجهة + الردود (التزايدي)
python3 engine/qa_translate.py tl --fix        # بوابة الجودة (الفصول)
python3 engine/tts.py ar && python3 engine/tts.py tl
python3 engine/export_pack.py tl               # → platform/packs/tl/
cd platform && bash seed.sh --local            # أو --remote للإنتاج
```
ثم في `platform/packs/catalog.json` تصبح اللغة `ready:true` تلقائياً إن لم ينقصها صوت.

## كتاب لطلب يدوي (بدون المنصة)
```bash
python3 engine/build_book2.py am --order orders/GH-1234.json          # ملف واحد مشفّر — يطبع الرمز
python3 engine/build_book2.py am --order orders/GH-1234.json --pwa    # + مجلد PWA
python3 engine/build_book2.py am                                       # معاينة مكشوفة (بيت تجريبي)
```

## المنصة محلياً
```bash
cd platform && npm i && npm run core
printf "ADMIN_TOKEN=...\nOPENAI_API_KEY=$OPENAI_API_KEY\nOPENAI_BASE_URL=$OPENAI_BASE_URL\n" > .dev.vars
bash seed.sh --local && npm run dev        # http://localhost:8787  ·  /order  ·  /admin
```

## الاختبارات
```bash
python3 tests/e2e_book.py dist/book-am-demo.html --shots dist/shots
python3 tests/e2e_book.py dist/book-am-GH-TEST.html --code ABCD-2345
python3 tests/attack_test.py dist/book-am-GH-TEST.html ABCD2345
python3 tests/e2e_platform.py http://localhost:8787 <ADMIN_TOKEN>
python3 tests/e2e_pwa_offline.py http://localhost:8787 <ADMIN_TOKEN>
```
(مرة واحدة: `pip install playwright && python3 -m playwright install --with-deps chromium`)

## النشر (Hosted — حساب Genspark)
1. اضبط في `platform/wrangler.jsonc → vars`: `PAY_IBAN`, `PAY_NAME`, `PAY_BANK`, `WHATSAPP` (بصيغة 9665xxxxxxxx), الأسعار.
2. `gsk hosted deploy` (موافقة) ← `gsk hosted secret_put --name ADMIN_TOKEN --value "$T"` (+ OPENAI_API_KEY, OPENAI_BASE_URL).
3. ارفع الحزم: `bash seed.sh --remote` أو `gsk hosted r2_put` لكل ملف (≤5MB لكل ملف — الحزم مقسّمة فصولاً فتناسب).
4. `AUTO_APPROVE=on` فقط بعد ثقة كافية بالتحقق الآلي.

## تتبّع نسخة مسرّبة
لوحة الإدارة ← «تتبّع نسخة مسرّبة» ← الصق أي فقرة منسوخة من الكتاب المنتشر → رقم الطلب والمشترية.
