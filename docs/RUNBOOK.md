# RUNBOOK — كل أوامر التشغيل (v2 الحالية)

> كل الأوامر من جذر المستودع `/home/user/webapp` ما لم يُذكر غير ذلك. في ساندبوكس Genspark ابدأ كل أمر بـ `cd /home/user/webapp && …`.

## 1. المتطلبات
| الأداة | لماذا |
|---|---|
| Python 3.10+ | المحرّك `engine/*`، الاختبارات، الأدوات |
| `pip install playwright pillow` + `python3 -m playwright install --with-deps chromium` | الاختبارات، التدقيق، اللقطات، إيصالات الاختبار، `images.py` |
| Node 18+ / npm | المنصة (`platform/`: hono, wrangler) والأدوات (`tools/`: lucide-static, simple-icons, @resvg/resvg-js) |
| `ffmpeg` + `ffprobe` | ضغط الصوت للشحن (`audio/_ship/20k`) |
| `gsk` CLI مصادَق | الصوت (TTS) — تلقائي في ساندبوكس Genspark |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL` | الترجمة، QA، قراءة الإيصال بالرؤية |
| `gh` CLI | PRs و Releases (بعد `setup_github_environment`) |

## 2. استعادة الصوت (خارج git)
```bash
for a in ar am; do curl -sL https://github.com/MoTechSys/ghaida/releases/download/audio-v0.3/ghaida_audio_${a}_2026-10-01-v3.tar.gz | tar -xz; done
# اختياري (يُعاد توليده تلقائياً): كاش الشحن المضغوط
curl -sL https://github.com/MoTechSys/ghaida/releases/download/audio-v0.3/ghaida_audio_ship20k_2026-10-01.tar.gz | tar -xz
python3 engine/tts.py ar --dry && python3 engine/tts.py am --dry      # todo=0
```
**نسخ احتياطي لصوت جديد** (إلزامي بعد أي توليد):
```bash
for a in ar am; do tar -czf /tmp/ghaida_audio_${a}_$(date +%F).tar.gz audio/$a; done
gh release create audio-v0.4 /tmp/ghaida_audio_*_$(date +%F).tar.gz --prerelease --title "Audio assets v0.4"
```
ثم حدّث الرابط في HANDOFF و RUNBOOK.

## 3. المحتوى
- المصدر الوحيد: `content/ar/` (فصول `NN-name.json` حسب `content/schema.json`، `library/rules.json`، `_ui.json`، `_replies.json`).
- في `_ui.json`: `"audio": true` = النص يُنطق (لغير القارئات).
- حدود النظام وأرقام الطوارئ: `content/country/sa.json`.
- **لا تعدّل `content/<lang>/` يدوياً.**

بعد أي تعديل عربي:
```bash
python3 engine/sync_translate.py am          # تزايدي: يترجم المتغيّر فقط (ببصمة المصدر)
python3 engine/qa_translate.py am --fix      # بوابة الجودة
python3 engine/tts.py ar && python3 engine/tts.py am   # الجديد فقط
python3 engine/export_pack.py am && python3 engine/export_pack.py am --sample
cd platform && bash seed.sh --local
```

## 4. لغة جديدة (مثال tl)
1. تأكد منها في `engine/languages.json` (أضف `om` إن لزم: الاسم، الاتجاه، الخط، `tts_lang`).
2. الخط: إن لم يكن لاتينياً أضف subset في `FONT_FILES` (`engine/build_book2.py`).
3. ```bash
   python3 engine/sync_translate.py tl && python3 engine/qa_translate.py tl --fix
   python3 engine/tts.py ar && python3 engine/tts.py tl
   python3 engine/export_pack.py tl && (cd platform && bash seed.sh --local)
   ```
4. `platform/packs/catalog.json` يجعلها `ready:true` تلقائياً إن اكتمل صوتها.
5. اختبر النطق: فرّغ جملاً عكسياً (`audio_transcribe`) ← تطابق ≥95%.
6. Release صوت جديد (§2).

## 5. الكتاب يدوياً (بلا منصة)
`orders/` خارج git — أعد إنشاء طلب الاختبار إن لم يوجد:
```bash
mkdir -p orders && cat > orders/GH-TEST.json <<'EOF'
{"order_id":"GH-TEST","book_name":"كتاب بيت آل نور","home_name":"بيت آل نور","worker_name":"Almaz","buyer":"أم نور",
 "icon":"🌷","rules":["t01","t02","k01","k05","c01","c02","c05","g01","g03","l02","l03","r01","r03","p01","p02","d01","d02","s01"],
 "schedule":{"start":"06:30","end":"20:00","breaks":[["09:30","10:00"],["13:00","15:30"],["18:00","18:30"]],"rest_day":5},
 "madam_phone":"0500000000","code":"ABCD2345","country":"sa"}
EOF
```
```bash
python3 engine/build_book2.py am                                     # معاينة مكشوفة → dist/book-am-demo.html
python3 engine/build_book2.py am --order orders/GH-TEST.json         # مشفّر لطلب → يطبع الرمز (GH-TEST: ABCD-2345)
python3 engine/build_book2.py am --order orders/GH-TEST.json --pwa   # + مجلد PWA
```

## 6. التصميم: الأيقونات، الشعارات، اللقطات
```bash
cd tools && npm i && node icons.mjs && cd ..      # sprite 182 + emblems + brand + favicon + أيقونات PWA + OG
python3 engine/build_book2.py am                   # (بعد icons دائماً)
python3 tools/shots.py                             # لقطات حقيقية من كتاب العرض → tools/src/shots/
python3 tools/images.py                            # → platform/public/img/*.{avif,webp,jpg} (300/600)
```
- الشعارات: `tools/emblems.mjs` (GEO=17.4، MAXD=19.6، مركز 12,12؛ سمك 1.4 في الصفحات، 1.5 في الأيقونات). الشعار الرسمي `BRAND` → `#i-brand` → `ic.mark()` في `platform/src/ui.ts`.
- الألوان/المسافات/الخطوط: `docs/DESIGN_SYSTEM.md`.

## 7. المنصة محلياً
```bash
cd platform && npm i && npm run core            # core: ينسخ book/core إلى المنصة كـ ESM
[ -f .dev.vars ] || printf "ADMIN_TOKEN=dev-admin-$(openssl rand -hex 6)\nOPENAI_API_KEY=$OPENAI_API_KEY\nOPENAI_BASE_URL=$OPENAI_BASE_URL\n" > .dev.vars
bash seed.sh --local
npm run dev            # run_in_background → http://localhost:8787 ثم GetServiceUrl 8787
```
الصفحات: `/` · `/order` · `/o/<id>?k=<akey>` · `/admin` (الرمز من `.dev.vars`).
إيقاف الخادم: `ps -eo pid,args | grep "[w]rangler"` ثم `kill PID` — **ليس `pkill -f`**.

## 8. الاختبارات (الخادم يعمل على 8787، T = ADMIN_TOKEN)
```bash
T=$(grep ADMIN_TOKEN platform/.dev.vars | cut -d= -f2)
python3 tests/e2e_journey.py http://localhost:8787 $T            # الرحلة الكاملة 17/17
python3 tests/e2e_platform.py http://localhost:8787 $T           # API 27/27
python3 tests/e2e_pwa_offline.py http://localhost:8787 $T        # بلا إنترنت
python3 tests/e2e_book.py dist/book-am-demo.html --shots dist/shots          # 25/25
python3 tests/e2e_book.py dist/book-am-GH-TEST.html --code ABCD-2345         # 29/29
python3 tests/e2e_book.py platform/public/samples/am.html --sample           # 18/18
python3 tests/attack_test.py dist/book-am-GH-TEST.html ABCD2345
ADMIN_TOKEN=$T python3 tools/audit/run.py > tools/audit/report.json         # يجب CLEAN
python3 tools/test_receipts.py                                   # إيصالات يدوية → test-assets/
```
دليل التجربة اليدوية للمالكة: `docs/TESTING_GUIDE.md`. منهجية التدقيق: `docs/UI_AUDIT.md`.

## 9. git (إلزامي)
```bash
git checkout genspark_ai_developer && git add -A && git commit -m "type(scope): …"
git fetch origin main && git rebase origin/main
git reset --soft origin/main && git commit -m "رسالة شاملة"     # squash
git push -f origin genspark_ai_developer
gh pr create --base main --head genspark_ai_developer --title "…" --body "…"
gh pr merge <N> --squash                                          # الوكيل يدمج بنفسه
git fetch origin && git reset --hard origin/main && git push -f origin genspark_ai_developer
```

## 10. النشر (Hosted — حساب Genspark، مهارة `gsk-hosted-deploy`)
1. في `platform/wrangler.jsonc → vars`: `PAY_IBAN`, `PAY_NAME`, `PAY_BANK` **حقيقية**، `WHATSAPP=966555759803`، الأسعار.
2. `python3 engine/export_pack.py am --sample` (العيّنة خارج git).
3. `gsk hosted deploy` (موافقة معين) ← `gsk hosted secret_put` لـ `ADMIN_TOKEN` (قوي جديد) + `OPENAI_API_KEY` + `OPENAI_BASE_URL`.
4. الحزم: `bash platform/seed.sh --remote` أو `gsk hosted r2_put` لكل ملف (≤5MB؛ الحزم مقسّمة فصولاً).
5. `AUTO_APPROVE=on` فقط بعد ثقة كافية بالتحقق الآلي.
6. بعد النشر: Lighthouse + أجهزة حقيقية (HANDOFF §المتبقي).

## 11. تشغيل يومي
- **تتبّع نسخة مسرّبة**: `/admin` ← «تتبّع نسخة مسرّبة» ← الصق فقرة من الكتاب المنتشر ← رقم الطلب والمشترية.
- **إيقاف كتاب** (`revoke`) أو **إعادة إصدار** (`reissue`: رابط/رمز جديد) من بطاقة الطلب.
- رفض إيصال: «رفض» مع السبب يظهر للمشترية في صفحة طلبها.

## 12. أخطاء شائعة
| العرض | السبب | الحل |
|---|---|---|
| انقطع شِل الوكيل فجأة | `pkill -f …` طابق الشِل | `ps` + `kill PID` |
| أيقونات فارغة في الكتاب | sprite وُلّد بعد البناء | `node tools/icons.mjs` ثم أعد البناء |
| `400` عند إنشاء طلب تجريبي | الجدول يخالف النظام | أضف استراحة (مثلاً 19:30–20:00) وحدود الساعات |
| «رقم العملية مستخدم» | الإيصال نفسه أُعيد | `tools/test_receipts.py` يولّد أرقاماً جديدة |
| العيّنة 404 في `/` | `public/samples/` خارج git | `export_pack.py am --sample` |
| `structure mismatch` في الترجمة | النموذج غيّر البنية | يعاد تلقائياً؛ صغّر `SYNC_BATCH`/`QA_BATCH` |
| `524` من gpt-5 | مهلة البروكسي | إعادة تلقائية؛ أعد التشغيل (الكاش يحفظ) |
| صوت باهت (na) | جملة بلا mp3 | `tts.py <lang>` ثم أعد البناء/الحزمة |

## ملحق: v1 القديم (للمرجع فقط)
`engine/build_book.py am --pwa` + `book/templates/book.html` = كتاب لغة عام غير مشفّر (ملف واحد). استُبدل بـ v2 (ADR-009) ولا يُستخدم للمنتج.
