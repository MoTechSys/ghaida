#!/usr/bin/env python3
"""يولّد إيصالات تحويل بنكي «تجريبية» لاختبار مسار الدفع كاملاً (رفع ← قراءة آلية ← تحقق ← اعتماد ← تسليم).
تُرسم بـ Chromium (تشكيل عربي سليم) بحجم لقطة جوال 1080×1920. مكتوب عليها بوضوح «نموذج اختبار».
التشغيل: python3 tools/test_receipts.py   → test-assets/receipt-*.png
"""
import os, asyncio, datetime, random, html
from playwright.async_api import async_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'test-assets'); os.makedirs(OUT, exist_ok=True)
FONT = 'file://' + os.path.join(ROOT, 'tools/src/fonts/NotoNaskhArabic-VF.ttf')
IBAN = os.environ.get('PAY_IBAN', 'SA03 8000 0000 6080 1016 7519')

def page(amount, ref, note, when, bank, color):
    rows = [('نوع العملية', 'تحويل إلى حساب محلي'), ('من حساب', 'SA44 0500 •••• •••• 2210'), ('اسم المستفيد', 'غيداء'),
            ('إلى حساب', IBAN), ('التاريخ', when.strftime('%Y-%m-%d')), ('الوقت', when.strftime('%I:%M %p')), ('الرقم المرجعي', ref), ('ملاحظة', note), ('الرسوم', '0.00 SAR')]
    tr = ''.join(f'<div class="r"><span>{html.escape(k)}</span><b dir="auto">{html.escape(v)}</b></div>' for k, v in rows)
    return f"""<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><style>
@font-face{{font-family:N;src:url({FONT})}}
*{{box-sizing:border-box;margin:0}}body{{width:1080px;height:1920px;font-family:N,'DejaVu Sans',sans-serif;background:#EEF1F4;color:#14181F}}
.sb{{height:72px;background:{color};color:#fff;display:flex;justify-content:space-between;align-items:center;padding:0 48px;font:600 30px 'DejaVu Sans'}}
.hd{{background:{color};color:#fff;padding:30px 56px 120px}}.hd h1{{font-size:52px;font-weight:700}}.hd p{{font-size:32px;opacity:.85;margin-top:6px}}
.cd{{margin:-80px 44px 0;background:#fff;border-radius:40px;padding:60px 56px 40px;box-shadow:0 20px 50px -20px rgba(0,0,0,.25)}}
.ok{{width:140px;height:140px;border-radius:50%;background:#1E9D6B;margin:0 auto 26px;display:grid;place-items:center}}
.ok svg{{width:80px;height:80px}}h2{{text-align:center;font-size:44px}}
.am{{text-align:center;margin:26px 0 8px;font:700 120px/1 'DejaVu Sans';color:{color};direction:ltr}}.am small{{font-size:44px;margin-inline-start:12px}}
.r{{display:flex;justify-content:space-between;gap:30px;padding:28px 0;border-top:2px solid #F0F2F5;font-size:34px}}.r span{{color:#6B7280}}.r b{{font-weight:600;text-align:left}}
.tag{{margin:44px 44px 0;text-align:center;color:#B3261E;font-size:32px;font-weight:700;border:3px dashed #E7A39D;border-radius:24px;padding:22px}}
.btns{{display:flex;gap:24px;margin:40px 44px}}.btns div{{flex:1;text-align:center;padding:30px;border-radius:24px;font-size:34px;font-weight:700;background:#fff;color:{color};border:2px solid {color}}}.btns div+div{{background:{color};color:#fff}}
</style><div class="sb"><span>9:41</span><span>●●● 5G ▮</span></div>
<div class="hd"><h1>{html.escape(bank)}</h1><p>إيصال التحويل</p></div>
<div class="cd"><div class="ok"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17 19 7"/></svg></div>
<h2>تمت عملية التحويل بنجاح</h2><div class="am">{amount:.2f}<small>SAR</small></div>{tr}</div>
<div class="btns"><div>مشاركة</div><div>تم</div></div>
<div class="tag">نموذج اختبار — ليس إيصالاً حقيقياً · TEST SAMPLE</div></html>"""

async def main():
    now = datetime.datetime.now().replace(second=0, microsecond=0); r = random.SystemRandom()  # رقم مرجعي جديد كل تشغيل (كل إيصال يُقبل مرة واحدة فقط)
    specs = [
        ('receipt-ok-99.png', 99, 'كتاب البيت', 12, 'مصرف الإنماء', '#0B5E55'),
        ('receipt-ok-99-b.png', 99, 'كتاب البيت', 5, 'مصرف الراجحي', '#1B3F94'),
        ('receipt-ok-149.png', 149, 'كتاب البيت', 25, 'البنك الأهلي السعودي', '#00684A'),
        ('receipt-wrong-amount-50.png', 50, 'كتاب البيت', 8, 'بنك الرياض', '#4B2A7B'),
    ]
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1080, 'height': 1920})
        for name, amt, note, mins, bank, col in specs:
            await pg.set_content(page(amt, f'FT{r.randint(10**11, 10**12)}', note, now - datetime.timedelta(minutes=mins), bank, col)); await pg.wait_for_timeout(250)
            out = os.path.join(OUT, name); await pg.screenshot(path=out); print(out)
        await b.close()
asyncio.run(main())
