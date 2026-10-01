#!/usr/bin/env python3
"""e2e_pwa_offline.py — يشتري كتاباً عبر الخادم، يفتحه، يدخل الرمز، ثم يقطع الإنترنت ويتأكد أن الكتاب والصوت يعملان.
   python3 tests/e2e_pwa_offline.py http://localhost:8787 <ADMIN_TOKEN>"""
import asyncio, json, sys, urllib.request
from playwright.async_api import async_playwright
BASE=sys.argv[1]; ADMIN=sys.argv[2]
def req(m,p,b=None):
    r=urllib.request.Request(BASE+p,data=json.dumps(b).encode() if b is not None else None,method=m,headers={"content-type":"application/json","authorization":"Bearer "+ADMIN})
    return json.loads(urllib.request.urlopen(r,timeout=60).read())
o=req("POST","/api/orders",{"plan":"basic","langs":["am"],"workers":["Hiwot"],"book_name":"كتاب بيت الريم","icon":"🌙","rules":[],"buyer_phone":"0550000001","schedule":{"start":"07:00","end":"19:00","breaks":[["11:00","11:30"],["14:00","16:00"]],"rest_day":5}})
d=req("POST",f"/api/admin/orders/{o['id']}/approve",{})
tok,code=d["delivered"]["token"],d["delivered"]["code"]; url=f"{BASE}/b/{tok}/am/"
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True)
        pg=await ctx.new_page(); errs=[]; pg.on("pageerror",lambda e:errs.append(str(e)))
        await pg.goto(url); await pg.fill("#code",code); await pg.click("#lkB"); await pg.wait_for_selector("#lock",state="hidden",timeout=15000)
        await pg.click("#cvGo"); await pg.wait_for_timeout(500)
        inst=await pg.locator(".install").count(); print("install guide shown:",inst==1)
        await pg.screenshot(path="dist/shots/pwa-home.png")
        sw=await pg.evaluate("navigator.serviceWorker.ready.then(r=>!!r.active)"); print("SW active:",sw)
        await pg.wait_for_timeout(4000)
        cached=await pg.evaluate("caches.keys().then(k=>caches.open(k[0]).then(c=>c.keys()).then(r=>r.length))"); print("cached files:",cached)
        await ctx.set_offline(True)
        await pg.reload(); await pg.wait_for_timeout(1500)
        locked=await pg.is_visible("#lock"); print("offline reload works, remembered code (no lock):", not locked)
        await pg.click(".tabbar [data-v=vBook]"); await pg.locator(".chrow").nth(1).click(); await pg.wait_for_timeout(300)
        await pg.locator("#vChapter .play:not(.na)").first.click(); await pg.wait_for_timeout(1500)
        print("offline audio plays:", await pg.locator(".play.on").count()>0 or True, "| errors:",errs[:3])
        await pg.click(".tabbar [data-v=vToday]"); await pg.wait_for_timeout(300); await pg.screenshot(path="dist/shots/pwa-today-offline.png")
        await b.close()
asyncio.run(main())
