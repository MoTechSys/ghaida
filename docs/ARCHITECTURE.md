# ARCHITECTURE — كيف يعمل كل شيء من الداخل

> مرجع تقني كامل: تدفق البيانات، قاعدة البيانات، حالات الطلب، فحوص الإيصال، صيغة التشفير، صيغة الحزمة، بنية الكتاب، متغيرات البيئة، وخريطة **كل ملف** في المستودع (مصدر أم مولَّد، ومن يولّده).
> اقرأه بعد `AGENTS.md` و `HANDOFF.md`. آخر تحديث: 2026-10-01.

---

## 1. الصورة الكاملة
```
                 ┌──────────── وقت البناء (Python/Node، في الساندبوكس) ────────────┐
content/ar/*.json ─sync_translate─► content/<l>/*.json ─qa_translate --fix─┐
                                                                            ├─tts─► audio/<l>/<hash>.mp3 ─ffmpeg 20k─► audio/_ship/20k/
tools/emblems.mjs + book/icons/map.json ─tools/icons.mjs─► book/icons/{sprite,emblems}.json, emblems/*.png
                                                         + platform/public/{brand,emblems,favicon.ico} + platform/src/assets.gen.ts
book/templates/book2.html + book/core/app.js + ghcrypto.js ──┐
                                                             ├─ engine/build_book2.py ─► dist/book-<l>-*.html   (كتاب يدوي/معاينة)
                                                             └─ engine/export_pack.py ─► platform/packs/<l>/{pack.json,fonts.json,a/*.bin,a/*.b64}
                                                                                         + platform/packs/{template.html,catalog.json}
                                                                                         + platform/public/samples/<l>.html (--sample)
                 └────────────────────────────────────────────────────────────────┘
platform/seed.sh ─► R2 (packs/*)
                 ┌──────────── وقت التشغيل (Cloudflare Worker: platform/src/index.ts) ────────────┐
مشترية ─/order─► POST /api/orders ─► D1 orders(awaiting_payment)
       ─/o/:id─► POST /api/orders/:id/receipt ─► R2 receipts/ + رؤية (VISION_MODEL) + verify() ─► review | paid
مالكة  ─/admin─► POST /api/admin/orders/:id/approve ─► deliver(): assemble.js لكل لغة ─► R2 books/<token>/<l>/{index.html,manifest,sw.js} ─► delivered
عاملة  ─/b/<token>/<l>/ (PWA + a/*.bin من الحزمة)  ·  /dl/<token>/<l> (ملف واحد يُجمع عند الطلب بالصوت مضمّناً)
```

## 2. قاعدة البيانات (D1) — تُنشأ تلقائياً في `migrate()` داخل `index.ts`
**`orders`**: `id` (GH-xxxxx) · `created_at` · `status` · `plan` (basic|plus) · `price` · `currency` (SAR) · `buyer_name` · `buyer_phone` · `book_name` · `home_name` · `icon` (مفتاح شعار) · `langs` (JSON) · `workers` (JSON أسماء) · `rules` (JSON معرّفات) · `schedule` (JSON) · `madam_phone` · `akey` (مفتاح وصول صفحة الطلب `?k=`) · `receipt_key` (R2) · `receipt_hash` (SHA-256) · `receipt_ref` (رقم العملية) · `verify` (JSON نتيجة الفحوص + القراءة) · `token` (`t:<20>`) · `code` (رمز الكتاب) · `delivered_at` · `notes` (JSON: books/fp) · `revoked` (0/1) · `opens` (عدد فتح الكتاب).
فهارس: `token` (unique), `receipt_ref`, `receipt_hash`.
**`events`**: `order_id, at, kind, data` — الأنواع: `created`, `receipt`, `approved_by_admin`, `delivered`, `rejected`, `revoked`, `reissue`, `download`.

## 3. حالات الطلب
```
awaiting_payment ──رفع إيصال──► review (افتراضي)  ──approve──► delivered
                               └► paid (AUTO_APPROVE=on وكل الفحوص ✓) ──deliver() فوراً──► delivered
review ──reject──► rejected        delivered ──revoke──► (revoked=1، الرابط 410)  ──reissue──► delivered (token+code جديدان)
```
أسماؤها العربية في لوحة الإدارة (`ST` في `pages.ts`): بانتظار الدفع · بانتظار المراجعة · مدفوع · مسلَّم · مرفوض.

## 4. فحص الإيصال (`readReceipt()` + `verify()` في `index.ts`)
1. حدود الرفع: ≤6MB، JPG/PNG/WEBP/HEIC أو PDF.
2. نموذج الرؤية (`VISION_MODEL`، عبر `OPENAI_BASE_URL`) يعيد JSON: `is_receipt, amount, currency, to_iban_last4, to_name, date, reference, note, bank, suspicious`.
3. الفحوص: `is_receipt` · `amount` (= سعر الطلب والعملة) · `iban` (آخر 4 = `PAY_IBAN`) · `recent` (خلال 72 ساعة) · `image_unique` (SHA-256 غير مكرر) · `not_suspicious` · `note_matches` (الملاحظة تحوي رقم الطلب — اختياري) · `ref_unique` (رقم العملية غير مستخدم).
4. **إلزامية**: is_receipt, amount, image_unique, not_suspicious + وجود reference + iban≠false + recent≠false.
5. السبب العربي يظهر للمشترية (مثل: «المبلغ في الإيصال (50) لا يطابق سعر الطلب (99)»، «رقم العملية مستخدم في طلب آخر»).

## 5. التشفير والحماية (ADR-012) — `book/core/ghcrypto.js` = `engine/ghcrypto.py` بايتياً
- الرمز: 8 خانات من `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (بلا 0/O/1/I/L)، يُعرض `ABCD-2345`.
- `keys = PBKDF2-HMAC-SHA256(code, salt16, ITER, 64)` → `enc(32) | mac(32)`؛ `ct = ChaCha20(enc, nonce12)`؛ `mac = HMAC(mac, nonce|ct)`؛ `check = HMAC(mac,"ghaida-check")[:16]` لرفض الرمز الخاطئ بسرعة.
- الحمولة المشفّرة = `{chapters, rules (المختارة فقط), replies, schedule, ui, madam, ak}`. **`ak`** = مفتاح صوت اللغة؛ الصوت مشفّر مسبقاً به في الحزمة (لا إعادة تشفير لكل طلب).
- **مكشوف عمداً** قبل الرمز: الغلاف + `ui0` + صفحة الطوارئ (`sos`).
- **البصمة**: `orderId|lang|yyyymmdd` بأحرف عرض-صفري (`U+2063` + `U+200B/U+200C`) بعد أول كلمة في أول قسمين من كل فصل + `enc.fp` (HMAC) في الميتا + علامة مائية + رأس ترخيص. `/api/admin/trace` يفك البصمة من أي نص منسوخ.
- `ghcrypto.mjs` **مولَّد** من `ghcrypto.js` بـ `npm run core` (`book/core/make-esm.mjs`) — لا تعدّله.

## 6. حزمة اللغة (`platform/packs/<l>/` — ينتجها `export_pack.py`)
`pack.json`: `lang, dir, native, name, flagShort, fontStack, ui, chapters, rules, ruleDefaults, replies, sos, madam, groups, missing, ak, limits, emergency, built, sprite, emblems`.
- `groups`: مجموعة صوت لكل فصل + `ui` + `rules` + `replies` + `sos`، لكل منها `{file, nonce, clips (مواضع البايت), size}`؛ الملفات `a/<file>.bin` (للـPWA) و `a/<file>.b64` (للملف الواحد).
- `fonts.json`: `{ar, <l>}` = `@font-face` بخطوط base64.
- `catalog.json` (مشترك): اللغات (`ready` إن `missing=0`) + مكتبة القواعد للمعالج.
- `template.html`: `book2.html` بعد الحقن (app.js + ghcrypto مصغّرين). العناصر النائبة: `{{LANG}} {{DIR}} {{BOOK_NAME}} {{LICENSE_HEADER}} {{EMBLEM}} {{SPRITE}} {{FONT_FACES}} {{ICON_DATA}} {{ICON_PNG}} {{MANIFEST_LINK}} {{META_JSON}} {{PAYLOAD}} {{AUDIO_BLOCKS}}`.
- **R2**: `packs/…` (من seed.sh) · `receipts/<id>/<ts>` · `books/<token>/<l>/{index.html, manifest.webmanifest, sw.js}`.

## 7. الكتاب (`book/core/app.js` + `book/templates/book2.html`)
- ES2015 فقط (Safari/iOS 10+)، بلا مكتبات ولا شبكة، DOM كسول، كائن Audio واحد، الصوت يُفك مجموعةً مجموعة عند أول ضغطة.
- الشاشات (`<section class="view">`): `vHome` (الرئيسية: بلاطات `tile()` + إحصاءات `stat()` + حلقة تقدّم) · `vBook` (الفصول `.chrow`) · `vChapter` · `vToday` (الجدول) · `vReplies` («ردودي» تنطق العربي) · `vMadam` («قولي لعاملتك») · `vSOS` (الطوارئ، مفتوحة دائماً). شريط سفلي `data-v`.
- لغير القارئات: كل عنصر = أيقونة + كلمة + زر صوت (`pbtn`، `data-say`)؛ نصوص `_ui.json` ذات `audio:true` منطوقة.
- التخزين: `localStorage` بأمان (fallback للذاكرة): التقدّم، `gh2.theme` (نهار/ليل)، `gh2.zoom` (حجم الخط)، إخفاء بطاقة التثبيت.
- PWA: `manifest.webmanifest` + `sw.js` (من `assemble.js: manifest(), serviceWorker()`) يكاش index + الأيقونات + كل `a/*.bin` ⇒ يعمل بلا إنترنت.
- الجدول: `buildSchedule()` (JS) = `build_schedule()` (Python) — يفرض: ≤10 ساعات عمل، استراحة بعد ≤5 ساعات متواصلة، ≥8 ساعات راحة ليلية (`content/country/sa.json → limits`). عرض 24 ساعة (الساعة الإثيوبية مزاحة 6 ساعات).

## 8. المنصة (`platform/src/`)
| ملف | المحتوى |
|---|---|
| `index.ts` | Hono app: المسارات، `migrate()`، `PLANS` (basic=99/لغة واحدة، plus=149/لغتان)، `readReceipt/verify`، `deliver()`، تقديم `/b` و `/dl`، `admin` (Bearer)، `trace`, `stats` |
| `pages.ts` | `landingPage, orderPage, statusPage, adminPage, legalPage` (الخصوصية والشروط) — HTML + CSS + JS مضمّن. الإدارة: بطاقات `.oc`، فلاتر `.kpi`، بحث `#q`، `card() draw() rc() act()` |
| `ui.ts` | tokens التصميم، `layout()`، الرأس/التذييل، `Icons` (`ic.mark()` = شعار «كتاب داخل بيت») |
| `assets.gen.ts` | **مولَّد** (icons.mjs): `ASSET` (روابط ببصمة `?v=`)، `EMOJI`، sprite |
| `qrlib.ts` | **مولَّد** (`npm run gen:qr` ← `scripts_gen.mjs` من qrcode-generator MIT) |

## 9. متغيرات البيئة
| المتغير | أين | الافتراضي/الغرض |
|---|---|---|
| `PRICE_BASIC`, `PRICE_PLUS` | wrangler vars | 99, 149 |
| `VISION_MODEL` | vars | gpt-5-mini (قراءة الإيصال) |
| `AUTO_APPROVE` | vars | off |
| `PAY_NAME`, `PAY_BANK`, `PAY_IBAN` | vars | **وهمية حالياً** |
| `WHATSAPP` | vars | 966555759803 |
| `ADMIN_TOKEN`, `OPENAI_API_KEY`, `OPENAI_BASE_URL` | أسرار (`.dev.vars` / `secret_put`) | — |
| `OPENAI_API_KEY`, `OPENAI_BASE_URL` | Python | الترجمة/QA (الافتراضي proxy Genspark) |
| `TRANSLATE_MODEL` / `QA_MODEL` | Python | gpt-5 |
| `SYNC_BATCH` (18), `QA_BATCH` (20), `SYNC_WORKERS` (4), `TRANSLATE_WORKERS` (3), `TTS_WORKERS` (4), `TRANSLATE_WHOLE_MAX` (12) | Python | الدفعات والتوازي |
| `SHIP_BITRATE` | Python | 20k (صوت الشحن) |
| `NO_MINIFY=1` | build_book2 / export_pack | لتصحيح الأخطاء: لا تصغير JS (esbuild) |
| الصوت: `engine/tts.py → VOICE` | — | اللغات: ElevenLabs v4 «Samara»؛ العربي: Gemini TTS «Kore» |

## 10. خريطة كل ملف (S = مصدر تعدّله، G = مولَّد لا تعدّله، X = خارج git)
| المسار | النوع | المولِّد / الملاحظة |
|---|---|---|
| `content/ar/**` | S | المصدر الوحيد للنص |
| `content/am/**` | G | `sync_translate.py` + `qa_translate.py` (`_qa_report.json` تقرير QA) |
| `content/country/sa.json`, `content/schema.json` | S | حدود النظام · بنية الفصل |
| `engine/*.py`, `engine/languages.json` | S | `build_book.py` + `translate.py` = v1 قديمان (للمرجع) |
| `book/core/app.js, ghcrypto.js, assemble.js, make-esm.mjs` | S | |
| `book/core/ghcrypto.mjs` | G | `npm run core` |
| `book/templates/book2.html` | S | `book.html` = v1 |
| `book/icons/map.json` | S | إيموجي المصدر ← اسم أيقونة Lucide |
| `book/icons/sprite.json, emblems.json, emblems/*` | G | `node tools/icons.mjs` |
| `book/fonts/*.woff2` + `OFL-Amiri.txt` | S (مُقتطعة) | طريقة الاقتطاع (`pyftsubset`) في `book/fonts/README.md`؛ رخصة OFL |
| `tools/emblems.mjs, icons.mjs, shots.py, images.py, test_receipts.py, audit/*` | S | `audit/report.json` = G (آخر نتيجة) |
| `tools/src/fonts/` (Amiri-Bold.ttf, Amiri-Regular.ttf, NotoNaskhArabic-VF.ttf, NotoNaskhArabic-latin-VF.ttf, OFL-Amiri.txt) | S | خطوط رسم أيقونات PNG وصورة OG (resvg) — رخصة OFL |
| `tools/src/shots/` (cover, home, chapter, today, replies, sos .png) | G | `tools/shots.py` (مدخل `images.py`) |
| `tools/out/og.png` | G X | icons.mjs (← `platform/public/brand/og.jpg`) |
| `platform/package.json` (سكربتات: core, dev, seed:local/remote, gen:qr, test) · `tools/package.json` (icons) | S | + lock files |
| `platform/src/index.ts, pages.ts, ui.ts`, `wrangler.jsonc`, `seed.sh`, `scripts_gen.mjs`, `public/_headers` | S | |
| `platform/src/assets.gen.ts, qrlib.ts` | G | icons.mjs · gen:qr |
| `platform/public/brand/*, emblems/*, favicon.ico` | G | icons.mjs |
| `platform/public/img/*` | G | images.py |
| `platform/public/fonts/*` | S | خطوط موقع البيع (naskh-var, amiri-700) |
| `platform/public/samples/` | G X | `export_pack.py am --sample` |
| `platform/packs/`, `platform/.keys/<l>.ak` | G X | `export_pack.py` (المفتاح سرّي وثابت لكل لغة) |
| `platform/.dev.vars` | X | أسرار التطوير |
| `audio/<l>/`, `audio/_ship/` | G X | `tts.py` · build — نسخة في Release `audio-v0.3` |
| `dist/`, `orders/`, `test-assets/` | G X | build_book2 · طلبات يدوية · test_receipts |
| `tests/*.py` | S | انظر RUNBOOK §8 |
| `_analysis/*.md`, `_analysis/tiktok/` | S | النية الأصلية والبحث (الخاص منه في .gitignore) |

## 11. فهرس التوثيق
`AGENTS.md` (ابدأ هنا) · `docs/HANDOFF.md` (الحالة والمتبقي) · `docs/RUNBOOK.md` (الأوامر) · **`docs/ARCHITECTURE.md`** (هذا) · `docs/DECISIONS.md` (ADR-001..023) · `docs/DESIGN_SYSTEM.md` · `docs/UI_AUDIT.md` · `docs/TESTING_GUIDE.md` · `docs/PERFORMANCE_SEO.md` · `docs/RESEARCH_AUDIT.md` · `book/fonts/README.md`.
