# AGENTS.md — دليل الوكيل الجديد (ابدأ من هنا)

> إذا كنت وكيل ذكاء اصطناعي أو مطوّراً جديداً على هذا المستودع: اقرأ هذا الملف كاملاً، ثم `docs/HANDOFF.md`، ثم `docs/ARCHITECTURE.md` قبل تعديل أي كود.
> هذان الملفان يكفيان لتعرف **ما هو المنتج، ما الذي بُني، أين كل شيء، كيف تشغّله وتختبره، وما المتبقي**.
> آخر تحديث: 2026-10-01 (بعد PR #9). المرجع الأحدث دائماً: `git log --oneline | head`.

---

## 1. ما هذا المشروع؟
**«غيداء — كتاب البيت»**: منتج رقمي يُباع لربات البيوت في السعودية. كل طلب يُنتج **كتاباً شخصياً** لبيت واحد:
- قواعد البيت، جدول العاملة (مُتحقَّق من النظام السعودي)، السلامة، الضيافة، العبارات، الحقوق.
- **بلغة العاملة + العربية، وكل جملة بصوت** (للعاملات اللواتي لا يقرأن: كل عنصر = أيقونة + كلمة + صوت).
- **مشفّر** برمز (PBKDF2 → ChaCha20 + HMAC)، **ببصمة** للمشترية (تتبّع التسريب)، **يعمل بلا إنترنت**.
- يُسلَّم بطريقتين من مصدر واحد: **رابط PWA** يُثبَّت على الجوال، و**ملف HTML واحد** يُرسل واتساب.

ومعه **منصة بيع** (`platform/`): صفحة بيع + عيّنة حيّة ← معالج طلب 4 خطوات ← تحويل بنكي ← رفع إيصال ← قراءة آلية بالرؤية + 7 فحوص ← اعتماد من لوحة الإدارة ← تسليم الرابط والرمز والملف.

## 2. أصحاب المشروع
| الطرف | الدور |
|---|---|
| **م. معين العباسي** (من يوجّهك في المحادثة) | القرار التقني والتنفيذ — نحن نكتب المحتوى **ونبني كل شيء** |
| **غيداء** (جدة) | صاحبة الفكرة، التسويق، الوجه التجاري — لا تُطالَب بكتابة المحتوى |

أسلوب معين: عربي (لهجة)، مباشر، يريد **نتائج ملموسة + روابط**، ويطلب أن **تدمج الـPR بنفسك** دائماً.

## 3. القرارات السارية (لا تعيد فتحها دون طلب صريح) — التفاصيل في `docs/DECISIONS.md`
| القرار | الحالة | ADR |
|---|---|---|
| المنتج = كتاب بيت شخصي لكل طلب (لا كتاب لغة عام) | ساري | 009 |
| نسخة لكل لغة (عربي + لغة العاملة) | ساري | 002 |
| المصدر الوحيد للمحتوى = `content/ar/*.json`؛ الترجمات تُولَّد (تزايدياً ببصمة المصدر) | ساري | 003, 018 |
| الترجمة GPT-5(-mini) عبر proxy؛ الصوت ElevenLabs (اللغات) + Gemini TTS (العربي) عبر `gsk` | ساري | 004 |
| تشفير حقيقي + بصمة + ترخيص + إيقاف (استبدل «لا حماية» ADR-008) | ساري | 012 |
| صوت كسول بحاويات لكل فصل | ساري | 013 |
| هوية «كتاب» لا «تطبيق»؛ تسليم مزدوج (PWA + ملف) | ساري | 014, 015 |
| الدفع: تحويل + قراءة الإيصال آلياً + مراجعة بشرية افتراضياً (`AUTO_APPROVE=off`) | ساري | 016 |
| المنصة: Hono على Cloudflare Workers + D1 + R2 | ساري | 017 |
| الأسعار: 99 (الكتاب الشخصي) / 149 (البيت الكبير) — فرضية | ساري | 019 |
| **الهوية البصرية: عنّابي + عاجي + ذهب شمبانيا** (pink/pastel ألغي، الأسود/الذهب ألغي، القهوة ألغيت) | **ساري** | **021** (يلغي 020) |
| لا إيموجي؛ أيقونات Lucide + شعارات مرسومة مطبّعة رياضياً؛ تدقيق بكسلي إلزامي | ساري | 020 (جزء الأيقونات), 022 |
| شعار المنصة «كتاب داخل بيت»؛ واتساب الدعم **966555759803** | ساري | 023 |
| 8 لغات مستهدفة: am (جاهزة), tl, id, ur, en, sw, si, bn (+om مقترحة) | ساري | — |

## 4. هيكل المستودع (الحقيقي)
```
AGENTS.md  README.md
docs/
  HANDOFF.md          ← الحالة الآن + تاريخ الجلسات + المتبقي (حدّثه في نهاية كل جلسة!)
  DECISIONS.md        ← ADR-001..023
  RUNBOOK.md          ← كل الأوامر
  ARCHITECTURE.md     ← من الداخل: تدفق البيانات، D1، حالات الطلب، فحوص الإيصال، التشفير، الحزمة، متغيرات البيئة، خريطة كل ملف (مصدر/مولَّد)
  DESIGN_SYSTEM.md    ← الألوان/الخطوط/المسافات/قواعد التدقيق
  UI_AUDIT.md         ← منهجية وأرقام التدقيق البكسلي (§1–7)
  TESTING_GUIDE.md    ← دليل التجربة اليدوية لرحلة الطلب (للمالكة)
  PERFORMANCE_SEO.md  ← الأداء و SEO وترويسات الأمان
  RESEARCH_AUDIT.md   ← تدقيق مستودع البحث والأنظمة
_analysis/            ← النية الأصلية: transcripts_voice_notes.md, PROJECT_BRIEF.md, market_research.md
content/
  schema.json
  ar/  01-welcome … 08-rights.json, library/rules.json (61 قاعدة), _ui.json (نصوص الواجهة, audio:true = منطوقة), _replies.json (18 رداً)
  am/  نفس البنية مترجمة + _qa_report.json   (لا تعدّل يدوياً)
  country/sa.json     ← حدود النظام (ساعات العمل/الراحة) وأرقام الطوارئ
engine/               ← Python
  languages.json      ← اللغات (الاسم، الاتجاه، الخط، اسم TTS)
  translate.py / sync_translate.py (تزايدي لكل أنواع المحتوى) / qa_translate.py (بوابة جودة --fix)
  tts.py              ← نص → mp3 (كاش بالـhash في audio/<lang>/)
  build_book2.py      ← بناء الكتاب v2 (معاينة / مشفّر لطلب / --pwa)
  export_pack.py      ← حزمة لغة للمنصة → platform/packs/<lang>/ (+ --sample للعيّنة)
  ghcrypto.py, common.py
  build_book.py       ← v1 القديم (ملف واحد غير مشفّر) — لا تستخدمه للمنتج الحالي
book/
  core/app.js         ← محرك الكتاب (ES2015)  · ghcrypto.js/.mjs (تشفير JS خالص مطابق بايتياً لـPython)
  core/assemble.js    ← مجمّع الكتاب على الخادم · make-esm.mjs (ينسخ core للمنصة: npm run core)
  templates/book2.html← القالب (CSS + هيكل)   · book.html (v1 قديم)
  icons/sprite.json, emblems.json, emblems/  ← مولّدة من tools/icons.mjs
  fonts/              ← خطوط مضمّنة (subset، طريقة الاقتطاع في fonts/README.md)
  icons/map.json      ← إيموجي المصدر ← اسم أيقونة Lucide (مصدر)
platform/             ← منصة البيع
  src/index.ts        ← المسارات + API + D1 schema + التحقق من الإيصال + الإدارة
  src/pages.ts        ← كل الصفحات (الرئيسية، /order، /o/:id، /admin، الخصوصية، الشروط)
  src/ui.ts           ← التصميم المشترك (CSS tokens، الرأس/التذييل، Icons.mark())
  src/assets.gen.ts   ← مولّد (sprite + emblems) — لا تعدّله يدوياً
  src/qrlib.ts        ← QR (مولّد: npm run gen:qr ← scripts_gen.mjs)
  public/             ← brand/, emblems/, img/, fonts/, favicon.ico, _headers, samples/ (العيّنة؛ خارج git)
  packs/              ← حزم اللغات (خارج git؛ تولّدها export_pack.py)
  .keys/<lang>.ak     ← مفتاح صوت اللغة (خارج git، سرّي)
  .dev.vars           ← أسرار التطوير (خارج git): ADMIN_TOKEN, OPENAI_API_KEY, OPENAI_BASE_URL
  wrangler.jsonc      ← الإعداد + vars (الأسعار، PAY_*, WHATSAPP, AUTO_APPROVE)
  seed.sh             ← يرفع الحزم إلى R2 (--local | --remote)
tools/                ← أدوات بناء غير حيّة
  emblems.mjs         ← رسم الشعارات + التطبيع الرياضي + BRAND
  icons.mjs           ← sprite (182 أيقونة) + favicon + أيقونات PWA + OG → book/icons + platform
  src/fonts/*.ttf     ← خطوط رسم PNG/OG · src/shots/*.png ← لقطات (مولّدة)
  shots.py, images.py ← لقطات حقيقية من كتاب العرض → AVIF/WebP/PNG لصفحة البيع
  audit/run.py + audit.js + report.json ← التدقيق البكسلي
  test_receipts.py    ← إيصالات اختبار → test-assets/ (خارج git)
tests/                ← e2e_book, attack_test, e2e_platform, e2e_pwa_offline, e2e_journey (Playwright)
audio/ dist/ orders/ test-assets/  ← خارج git (الصوت في GitHub Releases)
```

## 5. خط الإنتاج باختصار (التفاصيل في RUNBOOK)
```bash
# محتوى ← ترجمة ← صوت ← حزمة ← منصة
python3 engine/sync_translate.py am && python3 engine/qa_translate.py am --fix
python3 engine/tts.py ar && python3 engine/tts.py am
python3 engine/export_pack.py am && python3 engine/export_pack.py am --sample
cd platform && npm i && npm run core && bash seed.sh --local && npm run dev    # :8787
# التصميم: أيقونات/شعارات ← لقطات ← صور
cd tools && npm i && node icons.mjs && cd .. && python3 engine/build_book2.py am && python3 tools/shots.py && python3 tools/images.py
```
كل الخطوات idempotent (كاش).

## 6. قواعد العمل الإلزامية
1. **سير git**: اعمل على `genspark_ai_developer` ← commit ← `git fetch origin main && git rebase origin/main` ← squash لكمِت واحد ← `git push -f` ← `gh pr create` ← **ادمجه أنت فوراً**:
   `gh pr merge <N> --squash --delete-branch=false` ← ثم `git fetch && git reset --hard origin/main && git push -f origin genspark_ai_developer`.
   (الصلاحيات تُضبط بـ `setup_github_environment`.) معين لا يدمج — **أنت تدمج**، ثم أعطه الرابط.
2. **لا تستخدم `pkill -f wrangler`** (أو أي `pkill -f`) — يقتل شِلّك أنت. استخدم: `ps -eo pid,args | grep "[w]rangler"` ثم `kill PID`.
3. لا ترفع إلى git: `audio/ dist/ orders/ platform/packs/ platform/.keys/ .dev.vars test-assets/ _analysis/chat` (انظر `.gitignore`).
4. الصوت الجديد ← أرشيف **Release جديد** (`audio-v0.N`) وحدّث رابطه في HANDOFF. آخر نسخة: **audio-v0.3**.
5. أي تعديل في الواجهة ← شغّل التدقيق `tools/audit/run.py` (مع `ADMIN_TOKEN`) ويجب أن يخرج **CLEAN**، ثم الاختبارات.
6. أي تعديل محتوى عربي ← `sync_translate` (تزايدي) ← `tts` (الجديد فقط) ← `export_pack` ← `seed.sh`.
7. لا إيموجي في الواجهة؛ الأيقونات من sprite فقط؛ ألوان من tokens في `ui.ts` / `book2.html` (DESIGN_SYSTEM).
8. لا تكسر الروابط القائمة: `/o/{id}?k={akey}`، `/b/{tok}/{lang}/`، `/dl/{tok}/{lang}`، `/admin`، `/api/*`.
9. **حدّث `docs/HANDOFF.md`** في نهاية كل جلسة (ما أُنجز، الحالة، المتبقي، المشاكل).
10. التقرير لمعين: عربي، قصير، نتائج + روابط (معاينة، PR).

## 7. بداية جلسة جديدة (Checklist)
- [ ] `cat AGENTS.md docs/HANDOFF.md docs/ARCHITECTURE.md` ← `git log --oneline | head` ← `git status` ← `gh pr list`
- [ ] استعادة الصوت (أول مرة في ساندبوكس جديد) — الأمر في HANDOFF §«أول أوامر».
- [ ] `python3 engine/tts.py ar --dry && python3 engine/tts.py am --dry` ← يجب `todo=0`
- [ ] شغّل المنصة (background) ← `GetServiceUrl 8787` ← أعطِ الرابط
- [ ] أكمل من «المتبقي» في HANDOFF.

## 8. المراجع الأصلية للنية (لا تخمّن — اقرأ)
- `_analysis/transcripts_voice_notes.md` — كلام غيداء بصوتها
- `_analysis/PROJECT_BRIEF.md` — المتطلبات
- `_analysis/market_research.md` — المنافسون والسوق
- مستودع البحث: https://github.com/MoTechSys/ghaida-research (مدقَّق في `docs/RESEARCH_AUDIT.md`)
