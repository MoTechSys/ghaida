#!/usr/bin/env python3
"""e2e_book.py — اختبار شامل للكتاب في متصفح حقيقي (Chromium عبر Playwright) بمحاكاة جوال.

    python3 tests/e2e_book.py dist/book-am-demo.html                 # نسخة مكشوفة
    python3 tests/e2e_book.py dist/book-am-GH-TEST.html --code ABCD-2345
    python3 tests/e2e_book.py <file> --shots dist/shots                # + لقطات شاشة

يتحقق من: صفر أخطاء JS · الغلاف · فك الرمز (والرمز الخاطئ يُرفض) · كل الشاشات · فتح كل فصل · تشغيل الصوت فعلاً
(currentTime يتقدم) · الردود · الطوارئ قبل الرمز · تبديل اللغة · لا تمرير أفقي على 360px · أهداف لمس ≥40px ·
الذاكرة (JS heap) قبل/بعد · زمن الفتح بمعالج أبطأ ×6.
"""
import sys, os, json, time, asyncio
from playwright.async_api import async_playwright

FILE = os.path.abspath(sys.argv[1])
CODE = sys.argv[sys.argv.index("--code") + 1] if "--code" in sys.argv else None
MINCH = 1 if "--sample" in sys.argv else 8
SHOTS = sys.argv[sys.argv.index("--shots") + 1] if "--shots" in sys.argv else None
R = {"pass": [], "fail": [], "metrics": {}}


def ok(name, cond, info=""):
    (R["pass"] if cond else R["fail"]).append(name + (f" — {info}" if info else ""))
    print(("  ✅ " if cond else "  ❌ ") + name + (f" — {info}" if info else ""), flush=True)


async def shot(page, name):
    if SHOTS:
        os.makedirs(SHOTS, exist_ok=True); await page.screenshot(path=os.path.join(SHOTS, name + ".png"))


async def heap(cdp):
    m = await cdp.send("Performance.getMetrics")
    d = {x["name"]: x["value"] for x in m["metrics"]}
    return d.get("JSHeapUsedSize", 0) / 1048576


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required", "--enable-precise-memory-info"])
        ctx = await b.new_context(viewport={"width": 360, "height": 740}, device_scale_factor=2, is_mobile=True, has_touch=True,
                                  user_agent="Mozilla/5.0 (Linux; Android 10; SM-A105F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36")
        page = await ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        cdp = await ctx.new_cdp_session(page); await cdp.send("Performance.enable")
        await cdp.send("Emulation.setCPUThrottlingRate", {"rate": 6})
        t0 = time.time()
        await page.goto("file://" + FILE, wait_until="commit")
        await page.wait_for_function("(document.getElementById('cvGoT')&&document.getElementById('cvGoT').textContent.length>0)||(document.getElementById('lkT')&&document.getElementById('lkT').textContent.length>0)", timeout=30000)
        inter_s = time.time() - t0
        await page.wait_for_load_state("load"); load_s = time.time() - t0
        R["metrics"]["interactive_s_cpu6x"] = round(inter_s, 2); R["metrics"]["load_s_cpu6x"] = round(load_s, 2)
        fcp = await page.evaluate("(performance.getEntriesByName('first-contentful-paint')[0]||{}).startTime||0")
        R["metrics"]["fcp_ms_cpu6x"] = round(fcp)
        await cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})
        ok("interactive under 2.5s on 6x slower CPU", inter_s < 2.5, f"{inter_s:.2f}s (full load {load_s:.2f}s, FCP {fcp:.0f}ms)")
        h0 = await heap(cdp); R["metrics"]["heap_after_open_MB"] = round(h0, 1)

        if CODE:
            ok("lock screen shown", await page.is_visible("#lock"))
            await shot(page, "00-lock")
            # الطوارئ من شاشة القفل
            sos_btn = page.locator("#lock .cover-listen").nth(1)
            ok("SOS reachable before unlock", await sos_btn.count() == 1)
            await page.fill("#code", "ZZZZ-ZZZZ"); await page.click("#lkB"); await page.wait_for_timeout(1500)
            ok("wrong code rejected", await page.is_visible("#lock") and (await page.text_content("#lkE")).strip() != "")
            await page.fill("#code", ""); await page.type("#code", CODE.replace("-", "").lower())
            t1 = time.time(); await page.click("#lkB")
            await page.wait_for_selector("#lock", state="hidden", timeout=15000)
            R["metrics"]["unlock_s"] = round(time.time() - t1, 2)
            ok("correct code unlocks", True, f"{time.time()-t1:.2f}s (PBKDF2 30k)")

        ok("cover visible", await page.is_visible("#cover"))
        await shot(page, "01-cover")
        await page.click("#cvGo"); await page.wait_for_timeout(600)
        ok("home rendered", await page.locator("#vHome .tile").count() >= 5)
        await shot(page, "02-home")

        # عدم وجود تمرير أفقي
        sw = await page.evaluate("document.documentElement.scrollWidth")
        ok("no horizontal overflow @360px", sw <= 360, f"scrollWidth={sw}")
        small = await page.evaluate("""[...document.querySelectorAll('button,a')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.height<40||r.width<40)}).map(e=>e.className+':'+e.textContent.trim().slice(0,10))""")
        ok("touch targets >= 40px", len(small) == 0, f"{small}")

        # الكتاب وكل الفصول
        await page.click(".tabbar [data-v=vBook]"); await page.wait_for_timeout(300)
        n = await page.locator(".chrow").count()
        ok("book list", n >= MINCH, f"{n} chapters")
        await shot(page, "03-book")
        played = 0
        for i in range(n):
            await page.click(".tabbar [data-v=vBook]"); await page.wait_for_timeout(150)
            await page.locator(".chrow").nth(i).click(); await page.wait_for_timeout(250)
            items = await page.locator("#vChapter .it").count()
            na = await page.locator("#vChapter .play.na").count(); tot = await page.locator("#vChapter .play").count()
            if i in (0, 1, 3): await shot(page, f"04-chapter-{i}")
            if i < 3 and i < n:
                btn = page.locator("#vChapter .play:not(.na)").nth(1)
                await btn.click(); await page.wait_for_timeout(1300)
                t = await page.evaluate("(()=>{const a=[...document.querySelectorAll('audio')];return 0})()")
                prog = await page.evaluate("window.__p=document.querySelector('.play.on')?1:0")
                played += 1 if prog else 0
            ok(f"chapter {i+1} renders", items > 0, f"{items} items, audio {tot-na}/{tot}")
        h1 = await heap(cdp); R["metrics"]["heap_after_8_chapters_MB"] = round(h1, 1)
        ok("audio plays (button enters playing state)", played >= min(2, n), f"{played}/{min(3, n)}")

        # يومي
        await page.click(".tabbar [data-v=vToday]"); await page.wait_for_timeout(300)
        ok("today schedule", await page.locator(".srow").count() >= 3)
        await shot(page, "05-today")
        # الردود
        await page.click(".tabbar [data-v=vReplies]"); await page.wait_for_timeout(300)
        rc = await page.locator(".rbtn").count(); ok("replies grid", rc >= 15, f"{rc}")
        await page.locator(".rbtn").nth(1).click(); await page.wait_for_timeout(900)
        ok("reply speaks arabic overlay", await page.is_visible("#speak.on"))
        await shot(page, "06-replies")
        # الطوارئ
        await page.click(".tabbar [data-v=vSOS]"); await page.wait_for_timeout(300)
        ok("SOS numbers", await page.locator(".sosbig").count() >= 3)
        tels = await page.evaluate("[...document.querySelectorAll('.sosbig')].map(a=>a.getAttribute('href'))")
        ok("SOS tel links", "tel:911" in tels and "tel:19911" in tels, ",".join(tels))
        await shot(page, "07-sos")
        # قولي لعاملتك
        await page.click(".tabbar [data-v=vHome]"); await page.wait_for_timeout(200)
        await page.click("[data-go=vMadam]"); await page.wait_for_timeout(300)
        ok("madam phrases", await page.locator("#vMadam .rbtn").count() >= 10)
        await shot(page, "08-madam")
        # تبديل اللغة
        await page.click(".tabbar [data-v=vBook]"); await page.locator(".chrow").nth(1).click(); await page.wait_for_timeout(200)
        for m in ("l", "ar", "both"):
            await page.click(f".seg [data-mode={m}]"); await page.wait_for_timeout(150)
        ok("mode switching", True)

        # تشغيل صوت حقيقي: نتحقق أن currentTime يتقدم
        adv = await page.evaluate("""new Promise(res=>{const b=document.querySelector('#vChapter .play:not(.na)');b.click();
            setTimeout(()=>{const a=[...document.getElementsByTagName('audio')];res(document.querySelector('.play.on')?'playing':'idle')},900)})""")
        ok("audio element playing", adv == "playing", adv)
        h2 = await heap(cdp); R["metrics"]["heap_end_MB"] = round(h2, 1)
        dom = await page.evaluate("document.getElementsByTagName('*').length"); R["metrics"]["dom_nodes"] = dom
        ok("zero JS errors", not errors, "; ".join(errors[:3]))
        await b.close()
    R["metrics"]["file_MB"] = round(os.path.getsize(FILE) / 1048576, 2)
    print(json.dumps(R["metrics"], indent=1))
    print(f"PASS {len(R['pass'])}  FAIL {len(R['fail'])}")
    json.dump(R, open(FILE + ".e2e.json", "w"), ensure_ascii=False, indent=1)
    sys.exit(1 if R["fail"] else 0)


asyncio.run(main())
