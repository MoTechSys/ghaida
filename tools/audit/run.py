#!/usr/bin/env python3
"""تدقيق بكسلي آلي للواجهات: يقيس الفراغ داخل كل صندوق، الحشوات، القصّ، الفائض، الخطوط الصغيرة، أهداف اللمس.
التشغيل: python3 tools/audit/run.py [base_url] [book_html] > tools/audit/report.json
المعايير: fill<0.30 لصندوق ارتفاعه ≥90px = فراغ مهدور؛ حشوة سفلية > 2× العلوية +16px = عدم توازن عمودي."""
import asyncio, json, sys, os
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
JS = open(os.path.join(HERE, 'audit.js')).read()
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
BASE = ARGS[0] if len(ARGS) > 0 else 'http://localhost:8787'
BOOK = ARGS[1] if len(ARGS) > 1 else os.path.join(HERE, '../../dist/book-am-demo.html')
VPS = {'m': (360, 780), 'M': (414, 896), 'd': (1366, 800)}

# استثناءات مقصودة وموثّقة (docs/UI_AUDIT.md): شارة «الأنسب» تبرز فوق حافة بطاقة الباقة فتظهر حشوة علوية سالبة
ALLOW = ('card.plan',)

def judge(it):
    if it['k'] != 'box': return it['k']
    if any(a in it['sel'] for a in ALLOW) and it['pad']['t'] < 0: return None
    p = it['pad']
    if it['h'] >= 90 and it['fill'] < 0.30: return 'empty'
    if p['b'] > 2 * p['t'] + 16 and it['h'] >= 70: return 'unbalanced'
    return None

async def audit(pg, name, shots):
    await pg.evaluate("document.querySelectorAll('.rv').forEach(e=>e.classList.add('shown'))")
    await pg.wait_for_timeout(250)
    r = await pg.evaluate(JS)
    issues = []
    for it in r['items']:
        j = judge(it)
        if j: it['issue'] = j; issues.append(it)
    if shots: await pg.screenshot(path=f'/tmp/shots/audit-{name}.png', full_page=True)
    return {'page': name, 'issues': issues, 'fontSizes': r['fontSizes'], 'iconSizes': r['iconSizes'], 'boxes': sum(1 for i in r['items'] if i['k'] == 'box')}

async def main():
    out = []; shots = '--shots' in sys.argv
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for vk, (w, h) in VPS.items():
            pg = await b.new_page(viewport={'width': w, 'height': h})
            for path, tag in [('/', 'land'), ('/order', 'order'), ('/privacy', 'priv')]:
                await pg.goto(BASE + path, wait_until='networkidle'); out.append(await audit(pg, f'{tag}-{vk}', shots))
            if vk == 'd': continue
            ctx = await b.new_context(viewport={'width': w, 'height': h})
            bp = await ctx.new_page(); await bp.goto('file://' + os.path.abspath(BOOK)); await bp.wait_for_timeout(700)
            out.append(await audit(bp, f'book-cover-{vk}', shots))
            await bp.click('#cvGo'); await bp.wait_for_timeout(500)
            out.append(await audit(bp, f'book-home-{vk}', shots))
            for v in ['vBook', 'vToday', 'vReplies', 'vSOS']:
                await bp.click(f'.tabbar [data-v={v}]'); await bp.wait_for_timeout(400); out.append(await audit(bp, f'book-{v}-{vk}', shots))
            await bp.click('.tabbar [data-v=vBook]'); await bp.wait_for_timeout(300); await bp.click('.chrow'); await bp.wait_for_timeout(400)
            out.append(await audit(bp, f'book-chapter-{vk}', shots))
            await ctx.close()
        await b.close()
    tot = {}
    for o in out:
        for i in o['issues']: tot[i['issue']] = tot.get(i['issue'], 0) + 1
    print(json.dumps({'summary': tot, 'pages': out}, ensure_ascii=False, indent=1))
asyncio.run(main())
