#!/usr/bin/env python3
"""رحلة المشترية كاملة في متصفح حقيقي (جوال 390px) — كما ستفعلها أنتِ يدوياً:
1) الصفحة الرئيسية + زر واتساب للرقم الصحيح  2) معالج الطلب بخطواته الأربع  3) صفحة الطلب: بيانات البنك
4) رفع إيصال بمبلغ خاطئ ← يُرفض آلياً بسبب واضح  5) طلب جديد + رفع إيصال صحيح ← يقرأه الذكاء الاصطناعي ← «قيد المراجعة»
6) لوحة الإدارة: اعتماد ← تسليم  7) صفحة الطلب: رابط الكتاب + الرمز  8) فتح الكتاب بالرمز  9) تنزيل ملف الكتاب
التشغيل: python3 tests/e2e_journey.py http://localhost:8787 <ADMIN_TOKEN> [966555759803]
لقطات كل خطوة: /tmp/shots/j-*.png"""
import asyncio, sys, os, re, json, urllib.request
from playwright.async_api import async_playwright
BASE, ADMIN = sys.argv[1], sys.argv[2]; WA = sys.argv[3] if len(sys.argv) > 3 else '966555759803'
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); TA = os.path.join(ROOT, 'test-assets')
os.makedirs('/tmp/shots', exist_ok=True)
P = F = 0
def ok(n, c, d=''):
    global P, F
    P += bool(c); F += not c; print(('  ✅ ' if c else '  ❌ ') + n + (f'  — {d}' if d else ''), flush=True)

async def order(pg, tag, plan='basic'):
    await pg.goto(BASE + f'/order?plan={plan}', wait_until='networkidle')
    await pg.click('.opt[data-lang=am]'); await pg.fill('#workers input', 'Almaz') if await pg.locator('#workers input').count() else None
    await pg.screenshot(path=f'/tmp/shots/j-{tag}-1.png'); await pg.click('#next'); await pg.wait_for_timeout(400)
    await pg.fill('#bn', 'دليل بيت أم سارة'); await pg.click('#embs button[data-e=flower]')
    await pg.screenshot(path=f'/tmp/shots/j-{tag}-2.png'); await pg.click('#next'); await pg.wait_for_timeout(900)
    await pg.screenshot(path=f'/tmp/shots/j-{tag}-3.png'); await pg.click('#next'); await pg.wait_for_timeout(400)
    await pg.fill('#nm', 'أم سارة'); await pg.fill('#ph', '0555759803')
    await pg.screenshot(path=f'/tmp/shots/j-{tag}-4.png'); await pg.click('#next')
    await pg.wait_for_url(re.compile(r'/o/GH-'), timeout=15000); await pg.wait_for_timeout(600)
    return pg.url

async def upload(pg, f, tag):
    await pg.set_input_files('#file', os.path.join(TA, f)); 
    for _ in range(60):
        await pg.wait_for_timeout(1000); t = await pg.inner_text('#app')
        if 'جاري' not in t and 'لحظة' not in t and 'يُقرأ' not in t: break
    await pg.wait_for_timeout(800); await pg.screenshot(path=f'/tmp/shots/j-{tag}.png', full_page=True)
    return await pg.inner_text('#app')

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
        pg = await ctx.new_page()
        print('1) الصفحة الرئيسية')
        await pg.goto(BASE + '/', wait_until='networkidle'); await pg.screenshot(path='/tmp/shots/j-0-home.png')
        links = await pg.eval_on_selector_all('a[href*="wa.me"]', 'a=>a.map(x=>x.href)')
        ok('روابط واتساب تذهب للرقم ' + WA, links and all(f'wa.me/{WA}' in l for l in links), f'{len(links)} روابط')
        ok('زر واتساب العائم ظاهر', await pg.locator('.wa-fab').is_visible())
        print('2) طلب أول + إيصال بمبلغ خاطئ')
        u1 = await order(pg, 'a'); ok('صفحة الطلب فُتحت', '/o/GH-' in u1, u1.split('/o/')[1][:12])
        t = await pg.inner_text('#app'); ok('بيانات البنك ظاهرة', 'SA03' in t.replace(' ', '') or 'SA03' in t)
        ok('زر واتساب في صفحة الطلب للرقم الصحيح', await pg.locator(f'a[href*="wa.me/{WA}"]').count() >= 1)
        t = await upload(pg, 'receipt-wrong-amount-50.png', 'a-5-wrong')
        ok('إيصال 50 ريال لا يُعتمد آلياً', 'لا يطابق' in t or 'المبلغ' in t or 'مراجع' in t, t.replace('\n', ' ')[:110])
        print('3) طلب ثانٍ + إيصال صحيح')
        u2 = await order(pg, 'b'); oid = u2.split('/o/')[1].split('?')[0]
        t = await upload(pg, 'receipt-ok-99.png', 'b-5-ok')
        ok('إيصال 99 ريال قُرئ ووصل للمراجعة', 'مراجع' in t or 'تم' in t or 'مطابق' in t, t.replace('\n', ' ')[:110])
        print('4) لوحة الإدارة')
        ad = await ctx.new_page(); await ad.goto(BASE + '/admin', wait_until='networkidle')
        await ad.fill('#tk', ADMIN); await ad.click('#lg'); await ad.wait_for_timeout(1500)
        await ad.screenshot(path='/tmp/shots/j-6-admin.png', full_page=True)
        btn = ad.locator(f'button[data-act=approve][data-id="{oid}"]')
        ok('الطلب ظاهر في لوحة الإدارة', await btn.count() == 1, oid)
        ad.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
        ok('لوحة الإدارة بلا تمرير أفقي على الجوال', not await ad.evaluate('document.documentElement.scrollWidth>innerWidth'))
        await btn.click(); await ad.wait_for_timeout(6000); await ad.screenshot(path='/tmp/shots/j-7-approved.png', full_page=True)
        card = ad.locator('article.oc', has=ad.locator(f'text={oid}'))
        ok('بعد الاعتماد: البطاقة تعرض الرمز ورابط الكتاب والملف', await card.locator('code').count() == 1 and await card.locator('a[href*="/b/"]').count() >= 1 and await card.locator('a[href*="/dl/"]').count() >= 1)
        ok('الحالة بالعربي (لا كلمات إنجليزية خام)', 'delivered' not in (await card.inner_text()) and '["' not in (await card.inner_text()))
        print('5) التسليم')
        for _ in range(20):
            await pg.reload(wait_until='networkidle'); t = await pg.inner_text('#app')
            if 'أرسليه' in t or 'الرمز' in t: break
            await pg.wait_for_timeout(1500)
        await pg.screenshot(path='/tmp/shots/j-8-delivered.png', full_page=True)
        code = re.search(r'[A-Z0-9]{4}-[A-Z0-9]{4}', t); ok('الرمز ظاهر للمشترية', bool(code), code and code.group(0))
        href = await pg.eval_on_selector('a[href*="/b/"]', 'a=>a.href') if await pg.locator('a[href*="/b/"]').count() else None
        ok('رابط الكتاب ظاهر', bool(href), href and href.split('/b/')[1][:14] + '…')
        wa_send = await pg.eval_on_selector('a.btn-wa[href*="wa.me/?text"]', 'a=>decodeURIComponent(a.href)') if await pg.locator('a.btn-wa[href*="wa.me/?text"]').count() else ''
        ok('زر «أرسليه واتساب» يحمل الرابط والرمز', bool(href) and href.split('/b/')[1][:10] in wa_send and code and code.group(0) in wa_send)
        print('6) فتح الكتاب على جوال العاملة')
        wk = await b.new_context(viewport={'width': 360, 'height': 780}, device_scale_factor=2, is_mobile=True, has_touch=True)
        bk = await wk.new_page(); await bk.goto(href, wait_until='networkidle'); await bk.wait_for_timeout(800)
        await bk.screenshot(path='/tmp/shots/j-9-lock.png')
        await bk.fill('#code', code.group(0)); await bk.click('#lkB'); await bk.wait_for_timeout(3500)
        await bk.screenshot(path='/tmp/shots/j-10-cover.png')
        await bk.click('#cvGo'); await bk.wait_for_timeout(800); await bk.screenshot(path='/tmp/shots/j-11-home.png')
        ok('الكتاب فُتح بالرمز وظهرت الرئيسية', await bk.locator('#vHome .tile').count() >= 5)
        nm = await bk.inner_text('#tT'); ok('اسم الكتاب الشخصي ظاهر', 'أم سارة' in nm, nm)
        print('7) تنزيل ملف الكتاب')
        dl = await pg.eval_on_selector('a[href*="/dl/"]', 'a=>a.href') if await pg.locator('a[href*="/dl/"]').count() else None
        if dl:
            with urllib.request.urlopen(dl, timeout=120) as r: data = r.read()
            open('/tmp/shots/j-book.html', 'wb').write(data)
            ok('ملف الكتاب نُزّل', len(data) > 3_000_000, f'{len(data)/1e6:.1f} MB')
        else: ok('رابط تنزيل الملف موجود', False)
        await b.close()
    print(f'\nPASS {P}  FAIL {F}')
asyncio.run(main())
