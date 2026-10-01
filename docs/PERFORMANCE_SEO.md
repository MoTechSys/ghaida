# الأداء والفهرسة والأمان — ما طُبِّق وكيف يُقاس

## الأداء
- **CSS حرج داخل الصفحة:** لا ملفات CSS أو JS خارجية تحجب العرض. حجم صفحة البيع نحو 50KB غير مضغوطة.
- **صورة الواجهة:** `<picture>` بصيغ AVIF ثم WebP ثم JPEG، وبمقاسات `srcset` من 640 إلى 1920، مع قصّ خاص بالجوال (480 و828).
  - تُحمَّل مسبقاً `preload` حسب حجم الشاشة، مع `fetchpriority=high`.
  - معاينة ضبابية LQIP مضمّنة. صورة 960w بصيغة AVIF حجمها 19KB.
- **الخطوط:** خطّان woff2 مقتطعان (65KB معاً) ومحمّلان مسبقاً.
- **التخزين المؤقت:** الأصول تُخدم بعنوان فيه بصمة المحتوى `?v=hash` مع `Cache-Control: immutable` لسنة كاملة (`public/_headers`).
  - صفحات HTML: `s-maxage=300, stale-while-revalidate`.
  - صفحات الطلب والإدارة: `no-store`.
- **العيّنة:** إطار iframe لا يُحمَّل إلا عند الضغط (نمط الواجهة البديلة facade)، فلا تثقل صفحة البيع بـ4MB.
- **الكتاب:** sprite لا يحوي إلا الأيقونات المستخدمة (نحو 60). الصوت يُفك فصلاً فصلاً، ولا تبقى في الذاكرة أكثر من مجموعتين.
- **الضغط:** Cloudflare يضغط بـ Brotli أو gzip تلقائياً.

## الفهرسة (SEO)
- `title` و`description` فريدان لكل صفحة.
- `canonical` و`hreflang=ar-SA`، و`robots` فيه `max-image-preview:large`.
- وسوم OpenGraph وTwitter مع صورة 1200×630 مرسومة بخط أميري (`/brand/og.jpg`).
- بيانات منظمة JSON-LD من الأنواع: `Organization` و`WebSite` و`Product` (مع عرضين `Offer` بالريال) و`FAQPage` (8 أسئلة).
- `/robots.txt` يمنع الفهرسة عن `/api` و`/admin` و`/o` و`/b` و`/dl`، و`/sitemap.xml` يشمل صورة الواجهة، و`/manifest.webmanifest`، و`/llms.txt` لمحركات البحث بالذكاء الاصطناعي.
- الكتب وصفحات الطلبات عليها `noindex`.
- ترتيب العناوين سليم: H1 واحد في كل صفحة، وH2 لكل قسم، ومعالم دلالية `header/nav/main/footer` ورابط «تخطّي إلى المحتوى».

## الأمان (ترويسات)
CSP (`default-src 'self'`، `object-src 'none'`، `frame-ancestors 'self'`)، وHSTS مع preload، و`X-Frame-Options: SAMEORIGIN`، و`nosniff`، و`Referrer-Policy: strict-origin-when-cross-origin`، و`Permissions-Policy` يمنع الكاميرا والميكروفون والموقع، و`COOP same-origin`.

## القياس
```bash
python3 tests/e2e_book.py dist/book-am-demo.html          # 25/25
python3 tests/e2e_book.py dist/book-am-GH-TEST.html --code ABCD-2345   # 29/29
python3 tests/e2e_book.py platform/public/samples/am.html --sample    # 18/18
python3 tests/e2e_platform.py http://localhost:8787 $ADMIN_TOKEN      # 27/27
python3 tests/e2e_pwa_offline.py http://localhost:8787 $ADMIN_TOKEN   # offline ✓
npx lighthouse <URL> --preset=desktop   # لم يُشغَّل بعد — يُشغَّل بعد النشر على النطاق الحقيقي
```
**مُعلّق:** قياس Lighthouse وPageSpeed على الرابط المنشور، وتسجيل الموقع في Google Search Console وإرسال sitemap بعد ربط النطاق.
