# HANDOFF — حالة العمل الحالية (حدّث هذا الملف في نهاية كل جلسة)

_آخر تحديث: 2026-10-01 — بعد دمج PR #9 + PR التوثيق الشامل. الوكيل: Claude عبر Genspark، بتوجيه م. معين._
_main الحالي: انظر `git log --oneline | head -1`. لا PRs مفتوحة._

## 🧭 المنتج في جملة
ربة البيت تدخل الموقع ← تختار لغة عاملتها وتسمّي «كتاب بيتها» وتختار قواعده وجدوله (يُرفض إن خالف النظام) ← تحوّل وترفع الإيصال ← يُقرأ آلياً ← تعتمده المالكة من `/admin` ← تستلم **رابطاً + رمزاً** (PWA باسم البيت، يعمل بلا إنترنت) **وملفاً واحداً** للواتساب — مشفّر، ببصمة، بصوت لكل جملة، وبواجهة «أيقونة + كلمة + صوت» لمن لا تقرأ.

## 📍 الحالة الآن (ما يعمل فعلاً)
| المكوّن | الحالة |
|---|---|
| المحتوى العربي: 8 فصول + 61 قاعدة/10 فئات + 18 رداً + نصوص الواجهة | ✅ كامل |
| الأمهرية: ترجمة + QA (43 تصحيحاً) + صوت كامل | ✅ `tts --dry` → todo=0 (ar 506 / am 507 جملة؛ 516/573 ملفاً) |
| بقية اللغات (tl, bn, en, om, si, id, ur, sw) | ⛔ لم تبدأ (الخط جاهز: ساعة تقريباً لكل لغة) |
| محرك الكتاب v2 (مشفّر، بصمة، صوت كسول، طوارئ مفتوحة، ثيم نهار/ليل، حجم خط) | ✅ |
| منصة البيع محلياً (Hono + D1 + R2) | ✅ كل الصفحات + API + الإدارة |
| الهوية: عنّابي/عاجي/شمبانيا + شعار «كتاب داخل بيت» + أيقونات Lucide + شعارات مطبّعة | ✅ |
| التدقيق البكسلي: 35 صفحة/عرض، 1183 صندوقاً | ✅ CLEAN |
| واتساب الدعم 966555759803 (زر عائم، صفحة الطلب، القسم الأخير) | ✅ |
| بيانات البنك الحقيقية | ⛔ **وهمية** (`PAY_IBAN` تجريبي، `PAY_BANK="—"`) |
| النشر العام | ⛔ لم يُنشر (يحتاج موافقة معين على Hosted Deploy) |

## 🗂️ تاريخ الجلسات و PRs (كلها مدموجة في main)
| PR | التاريخ | ما فيه |
|---|---|---|
| #1 | 09-30 | 8 فصول عربية + محرك ترجمة/صوت/بناء v1 (ملف HTML واحد) + توثيق |
| #2 | 09-30 | سياسة: الوكيل يدمج الـPR بنفسه |
| #3 | 09-30 | كتاب الأمهرية v0.1 كامل (صوت Release `audio-v0.1`) |
| #4 | 10-01 | **v2**: كتاب شخصي مشفّر + مكتبة قواعد + ردود + جدول نظامي + منصة البيع + الإدارة + الاختبارات (ADR-009..019) |
| #5 | 10-01 | هوية أسود+ذهب، إلغاء الإيموجي، خطوط subset، SEO/أمان/أداء، الخصوصية/الشروط (ADR-020) — **الألوان أُلغيت لاحقاً** |
| #6 | 10-01 | إلغاء هوية القهوة/الأسود ← استعادة العنّابي/العاجي/الشمبانيا، لقطات حقيقية في موكاب الجوال، ثيمات نهار/ليل (ADR-021) |
| #7 | 10-01 | تدقيق بكسلي مُقاس (350 ← 0 عيب)، شعارات موحّدة رياضياً، «أيقونة + كلمة + صوت» لغير القارئات، 13 نصاً واجهة أصبحت منطوقة (ADR-022) |
| #8 | 10-01 | شعار المنصة الرسمي «كتاب داخل بيت»، واتساب 966555759803، إيصالات اختبار، اختبار رحلة كاملة، دليل التجربة (ADR-023) |
| #9 | 10-01 | **لوحة الإدارة للجوال**: بطاقات بدل الجدول، حالات عربية، فلاتر KPI + بحث، رابط الطلب/الكتاب/الملف/الرمز لكل طلب، الإيصال داخل البطاقة، تنبيهات؛ إصلاحات صفحة الطلب؛ التدقيق يشمل الإدارة وصفحات الحالة |
| (هذا) | 10-01 | توثيق شامل: AGENTS / README / HANDOFF / RUNBOOK + Release الصوت `audio-v0.3` |

## 🌐 المنصة — الصفحات والـAPI (لا تغيّر المسارات)
| المسار | الغرض |
|---|---|
| `/` | صفحة البيع (عيّنة حيّة `/samples/am.html`، باقات، أسئلة، واتساب) |
| `/order` | معالج الطلب 4 خطوات: باقة+لغة ← اسم الكتاب+شعار ← قواعد+جدول ← بيانات المشترية |
| `/o/:id?k=<akey>` | صفحة الطلب: بيانات التحويل + نسخ + رفع الإيصال ← بعد الاعتماد: الرمز + QR + واتساب + الروابط |
| `/b/:token/:lang/` | الكتاب PWA (يُثبَّت) · `/dl/:token/:lang` الملف الواحد |
| `/admin` | لوحة الإدارة (رمز `ADMIN_TOKEN`) |
| `/privacy` `/terms` `/robots.txt` `/sitemap.xml` `/manifest.webmanifest` `/llms.txt` | ثابتة/SEO |
| `GET /api/catalog` · `POST /api/schedule/check` · `POST /api/orders` · `POST /api/orders/:id/receipt` | عامة |
| `/api/admin/*` (Bearer ADMIN_TOKEN): `GET orders` (يعيد `langs`, `order_url`, `books[{lang,url,dl}]`) · `GET receipt/:id` · `POST orders/:id/{approve,reject,revoke,reissue}` · `POST trace` · `GET stats` | إدارة |

**قاعدة البيانات D1**: جدولا `orders` و `events` (يُنشآن تلقائياً في `platform/src/index.ts`).
**R2**: `packs/template.html`, `packs/catalog.json`, `packs/<lang>/{pack.json,fonts.json,a/*}` + الإيصالات.
**vars** (`wrangler.jsonc`): `PRICE_BASIC=99`, `PRICE_PLUS=149`, `VISION_MODEL=gpt-5-mini`, `AUTO_APPROVE=off`, `PAY_NAME=غيداء`, `PAY_BANK=—`, `PAY_IBAN=<تجريبي>`, `WHATSAPP=966555759803`.
**أسرار** (`platform/.dev.vars` محلياً، `secret_put` في الإنتاج): `ADMIN_TOKEN`, `OPENAI_API_KEY`, `OPENAI_BASE_URL`.
رمز الإدارة للتطوير المحلي: موجود في `platform/.dev.vars` (`ADMIN_TOKEN=dev-admin-…`) — ليس سراً إنتاجياً؛ ولّد رمزاً جديداً قوياً للنشر.

## 🧪 آخر نتائج الاختبارات (كلها خضراء — Chromium headless)
| الاختبار | النتيجة |
|---|---|
| `tests/e2e_journey.py` الرحلة الكاملة في المتصفح (طلب ← إيصال ← اعتماد ← تسليم + فحوص الإدارة على الجوال) | **17/17** |
| `tests/e2e_platform.py` API الشراء (مبلغ خطأ يُرفض، مكرر يُكشف، صحيح 7/7) | **27/27** |
| `tests/e2e_pwa_offline.py` | إعادة التحميل والصوت يعملان **بلا إنترنت** |
| `tests/e2e_book.py` معاينة / مشفّر / عيّنة | **25/25 · 29/29 · 18/18** |
| `tests/attack_test.py` | الاستخراج بلا رمز محجوب؛ تلاعب بايت مكشوف؛ البصمة تُسترجع |
| `ADMIN_TOKEN=… tools/audit/run.py` | **CLEAN** — 35 صفحة/عرض (360/414/1366)، 1183 صندوقاً، 0 عيوب |
| الأداء | تفاعلي ≈1ث على CPU ×6 أبطأ؛ JS heap 2–5MB |

## 🔴 المتبقي (بالترتيب)
1. **بيانات البنك الحقيقية** من غيداء/معين: `PAY_IBAN`, `PAY_NAME`, `PAY_BANK` في `platform/wrangler.jsonc` (الآن وهمية). التحقق الآلي يطابق الآيبان، فلا تنشر قبلها.
2. **النشر العام** (Hosted — مهارة `gsk-hosted-deploy`، يحتاج موافقة معين في الواجهة):
   `export_pack.py am --sample` ← deploy ← `secret_put` لـ ADMIN_TOKEN (جديد قوي) و OPENAI_API_KEY و OPENAI_BASE_URL ← `bash platform/seed.sh --remote` (أو `gsk hosted r2_put`).
3. **أجهزة حقيقية + Lighthouse** بعد النشر: آيفون سفاري (فتح الرابط، إضافة للشاشة، فتح **الملف** من واتساب)، أندرويد 2GB. ورقة الفحص: `ghaida-research/team-results/qa-test-plan.md`.
4. **مراجعة ناطقة أمهرية** لفصلي السلامة والحقوق ومكتبة القواعد.
5. **مراجعة قانونية** لفصل الحقوق (8 مقابل 9 ساعات راحة — مسودة 2026).
6. **اللغات التالية** (≈ساعة لكل لغة): tl → bn → en → **om** (أضفها في `languages.json`) → si → id → ur → sw. الأوامر في RUNBOOK §«لغة جديدة». ثم Release صوت جديد.
7. خطوط Ethiopic مضمّنة؛ أضف Bengali/Sinhala/Urdu subset في `FONT_FILES` عند إضافة لغاتها.
8. بوابة دفع بـwebhook موقّع متى توفرت وثيقة العمل الحر (استبدل `verify()` فقط).
9. 20 عميلة تجريبية بسعرين (99/149 مقابل 79/129) لقياس رغبة الدفع.

## ⚠️ دروس / مشاكل معروفة
- **`pkill -f wrangler` يقتل شِل الوكيل** (حدث أكثر من مرة). استخدم `ps -eo pid,args | grep "[w]rangler"` ثم `kill PID`. شغّل الخادم بـ `run_in_background`.
- **ترتيب التوليد مهم**: `node tools/icons.mjs` **قبل** `build_book2.py`/`export_pack.py` — وإلا تظهر أيقونات فارغة (حدث مع أيقونات الإحصاءات).
- الحزم `platform/packs/` ومفاتيح الصوت `platform/.keys/<lang>.ak` **خارج git**. المفتاح ثابت لكل لغة؛ لو فُقد ← `export_pack.py` يولّد جديداً ← `seed.sh`. الملفات المسلّمة تحمل مفتاحها فتعمل؛ روابط PWA القديمة تحتاج «إعادة إصدار» من اللوحة.
- العيّنة `platform/public/samples/am.html` خارج git: `python3 engine/export_pack.py am --sample` قبل التشغيل/النشر.
- `audio/` خارج git ← استعده من Release (أدناه). صوت جديد ← Release جديد `audio-v0.4`…
- الإيصال الواحد يُقبل مرة واحدة (حماية): `tools/test_receipts.py` يولّد أرقاماً مرجعية جديدة كل مرة.
- Pillow لا يشكّل العربي ← الإيصالات تُرسم بـChromium.
- الجدول في الطلبات التجريبية يجب أن يحترم النظام (استراحة إلزامية؛ مثال 19:30–20:00) وإلا 400.
- gpt-5 يعطي 524 أحياناً: الأدوات تعيد المحاولة؛ `QA_BATCH`/`SYNC_BATCH` لتصغير الدفعات.
- `tools/audit/run.py` يتجاهل الوسائط التي تبدأ بـ`--`؛ استثناء موثّق وحيد: `card.plan` (شارة «الأنسب»).

## ▶️ أول أوامر في جلسة/ساندبوكس جديد
```bash
cd /home/user/webapp
# 1) الصوت (خارج git) — Release audio-v0.3 (ar 516 + am 573 ملفاً)
for a in ar am; do curl -sL https://github.com/MoTechSys/ghaida/releases/download/audio-v0.3/ghaida_audio_${a}_2026-10-01-v3.tar.gz | tar -xz; done
python3 engine/tts.py ar --dry && python3 engine/tts.py am --dry          # todo=0
# 2) أدوات الاختبار (مرة واحدة)
pip install playwright pillow && python3 -m playwright install --with-deps chromium
# 3) الأيقونات ← الكتاب ← الحزمة ← العيّنة
(cd tools && npm i && node icons.mjs)
python3 engine/build_book2.py am && python3 engine/export_pack.py am && python3 engine/export_pack.py am --sample
# 4) المنصة
cd platform && npm i && npm run core
printf "ADMIN_TOKEN=dev-admin-$(openssl rand -hex 6)\nOPENAI_API_KEY=$OPENAI_API_KEY\nOPENAI_BASE_URL=$OPENAI_BASE_URL\n" > .dev.vars   # إن لم يوجد
bash seed.sh --local && npm run dev        # (run_in_background) ثم GetServiceUrl 8787
```
