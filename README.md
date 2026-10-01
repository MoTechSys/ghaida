# غيداء — «كتاب البيت»

> كتاب فاخر يُصنع لكل بيت: **قواعد البيت، جدول العاملة، السلامة، الضيافة، العبارات، وحقوقها** — بلغتها الأم وبالعربي، **وكل جملة بصوت** (أيقونة + كلمة + صوت لمن لا تقرأ). يُثبَّت على جوالها ككتاب باسم البيت، ويعمل **بدون إنترنت**، ومحمي برمز وبصمة.

**الحالة (2026-10-01)**: المحرك v2 + منصة البيع + لوحة الإدارة (للجوال) جاهزة ومختبرة آلياً — رحلة كاملة 17/17، API 27/27، الكتاب 25+29+18، بلا إنترنت ✓، هجوم ✓، تدقيق بكسلي 35 صفحة **CLEAN**. الأمهرية كاملة. التالي: بيانات البنك الحقيقية ← النشر ← أجهزة حقيقية ← لغات إضافية.

**وكيل/مطوّر جديد؟** ابدأ بـ [`AGENTS.md`](AGENTS.md) ثم [`docs/HANDOFF.md`](docs/HANDOFF.md).

## كيف يعمل
```
ربة البيت ──► الموقع: الباقة + لغة العاملة · اسم الكتاب + شعار · قواعد البيت + الجدول (يُرفض إن خالف النظام) · بياناتها
           ──► تحويل + رفع الإيصال ──► قراءة آلية (رؤية) + 7 فحوص ──► اعتماد من /admin (أو آلي)
           ──► رابط خاص + رمز + QR (PWA يعمل offline) + ملف HTML واحد للواتساب
العاملة   ──► تفتح بلغتها · تسمع كل جملة · «ردودي» تنطق العربي لربة البيت · الطوارئ مفتوحة دائماً
الدعم     ──► واتساب 966555759803
```

## هيكل المستودع
```
content/ar/            المصدر الوحيد: 8 فصول + library/rules.json (61 قاعدة) + _ui.json + _replies.json
content/<lang>/        ترجمات مولَّدة (تزايدية ببصمة المصدر) — am جاهزة
content/country/sa.json حدود النظام وأرقام الطوارئ
engine/                sync_translate · qa_translate · tts · build_book2 · export_pack · ghcrypto
book/core/             app.js (محرك الكتاب) · ghcrypto.js (تشفير JS خالص) · assemble.js (مجمّع الخادم)
book/templates/        book2.html (القالب) · book/icons (sprite + شعارات مولّدة)
platform/              منصة البيع: Hono + Cloudflare Workers + D1 + R2 (src/index.ts · pages.ts · ui.ts)
tools/                 emblems.mjs · icons.mjs · shots.py · images.py · audit/ · test_receipts.py
tests/                 e2e_journey · e2e_platform · e2e_pwa_offline · e2e_book · attack_test
docs/                  HANDOFF · DECISIONS (ADR-001..023) · RUNBOOK · DESIGN_SYSTEM · UI_AUDIT · TESTING_GUIDE · PERFORMANCE_SEO · RESEARCH_AUDIT
_analysis/             النية الأصلية والبحث
```
الصوت خارج git: GitHub Release [`audio-v0.3`](https://github.com/MoTechSys/ghaida/releases/tag/audio-v0.3).

## تشغيل سريع
انظر [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — باختصار:
```bash
for a in ar am; do curl -sL https://github.com/MoTechSys/ghaida/releases/download/audio-v0.3/ghaida_audio_${a}_2026-10-01-v3.tar.gz | tar -xz; done
(cd tools && npm i && node icons.mjs) && python3 engine/export_pack.py am && python3 engine/export_pack.py am --sample
cd platform && npm i && npm run core && bash seed.sh --local && npm run dev   # :8787
```

## الشركاء
- **غيداء** (جدة) — صاحبة الفكرة، التسويق المحلي
- **م. معين العباسي** — التنفيذ التقني والتصميم والبنية

البحث المرجعي: [MoTechSys/ghaida-research](https://github.com/MoTechSys/ghaida-research)
