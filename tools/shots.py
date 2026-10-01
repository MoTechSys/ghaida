#!/usr/bin/env python3
"""shots.py — يلتقط شاشات حقيقية من كتاب العرض (dist/book-am-demo.html) بدقة 2x لاستخدامها في صفحة البيع وصورة المشاركة.
التشغيل: python3 engine/build_book2.py am && python3 tools/shots.py
"""
import asyncio, os
from playwright.async_api import async_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, "src", "shots"); os.makedirs(OUT, exist_ok=True)
BOOK = "file://" + os.path.join(ROOT, "dist", "book-am-demo.html")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width": 375, "height": 812}, device_scale_factor=2, color_scheme="light")
        pg = await ctx.new_page(); await pg.goto(BOOK, wait_until="load"); await pg.wait_for_timeout(900)
        await pg.screenshot(path=os.path.join(OUT, "cover.png"))
        await pg.click("#cvGo"); await pg.wait_for_timeout(700)
        await pg.screenshot(path=os.path.join(OUT, "home.png"))
        await pg.click(".tabbar [data-v=vBook]"); await pg.locator(".chrow").nth(1).click(); await pg.wait_for_timeout(600)
        await pg.evaluate("scrollTo(0,0)"); await pg.screenshot(path=os.path.join(OUT, "chapter.png"))
        await pg.click(".tabbar [data-v=vToday]"); await pg.wait_for_timeout(500); await pg.screenshot(path=os.path.join(OUT, "today.png"))
        await pg.click(".tabbar [data-v=vReplies]"); await pg.wait_for_timeout(500); await pg.screenshot(path=os.path.join(OUT, "replies.png"))
        await pg.click(".tabbar [data-v=vSOS]"); await pg.wait_for_timeout(500); await pg.screenshot(path=os.path.join(OUT, "sos.png"))
        await b.close()
    print("shots →", OUT)
asyncio.run(main())
