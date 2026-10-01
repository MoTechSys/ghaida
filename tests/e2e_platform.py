#!/usr/bin/env python3
"""e2e_platform.py — رحلة شراء كاملة ضد الخادم (محلي أو منشور):
   طلب ← جدول مخالف يُرفض ← إيصال صحيح (مولَّد) يُقرأ بالرؤية ← إيصال مزوّر المبلغ يُرفض آلياً ← اعتماد الإدارة ← فتح الكتاب ← تحميل الملف ← إيقاف الرابط ← تتبّع البصمة

   python3 tests/e2e_platform.py http://localhost:8787 <ADMIN_TOKEN>
"""
import sys, json, io, urllib.request, time, re, os
from PIL import Image, ImageDraw, ImageFont

BASE, ADMIN = sys.argv[1].rstrip("/"), sys.argv[2]
ok_n = fail_n = 0


def ok(name, cond, info=""):
    global ok_n, fail_n
    ok_n += cond; fail_n += (not cond)
    print(("  ✅ " if cond else "  ❌ ") + name + (f" — {info}" if info else ""), flush=True)


def req(method, path, body=None, headers=None, raw=False):
    h = dict(headers or {}); data = None
    if isinstance(body, dict): data = json.dumps(body).encode(); h["content-type"] = "application/json"
    elif body is not None: data = body
    r = urllib.request.Request(BASE + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(r, timeout=180) as res:
            b = res.read(); return res.status, (b if raw else (json.loads(b) if b[:1] in (b"{", b"[") else b.decode("utf-8", "replace"))), dict(res.headers)
    except urllib.error.HTTPError as e:
        b = e.read(); return e.code, (json.loads(b) if b[:1] == b"{" else b.decode("utf-8", "replace")), {}


def receipt(amount, order_id, iban_last="7519"):
    im = Image.new("RGB", (720, 520), "white"); d = ImageDraw.Draw(im)
    try: f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26)
    except Exception: f = None
    lines = ["Al Rajhi Bank", "Local Transfer - Successful", f"Amount: {amount:.2f} SAR", f"To IBAN: SA03 8000 0000 6080 1016 {iban_last}",
             "Beneficiary: GHAIDA", f"Date: {time.strftime('%Y-%m-%d %H:%M')}", f"Reference: FT{int(time.time()*1000)%10**10}", f"Note: {order_id}"]
    for i, t in enumerate(lines): d.text((30, 30 + i * 58), t, fill="black", font=f)
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()


def multipart(png):
    bd = "----ghaida" + str(int(time.time()))
    body = (f"--{bd}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"r.png\"\r\nContent-Type: image/png\r\n\r\n").encode() + png + f"\r\n--{bd}--\r\n".encode()
    return body, {"content-type": f"multipart/form-data; boundary={bd}"}


A = {"authorization": "Bearer " + ADMIN}
s, _, _ = req("GET", "/"); ok("landing 200", s == 200)
s, _, _ = req("GET", "/order"); ok("order wizard 200", s == 200)
s, _, _ = req("GET", "/samples/am.html"); ok("free sample served", s == 200)
s, j, _ = req("POST", "/api/schedule/check", {"start": "06:00", "end": "22:00", "breaks": [["12:00", "13:00"]]})
ok("illegal schedule flagged", s == 200 and j.get("ok") is False, j.get("error", "")[:60])
base_order = {"plan": "basic", "langs": ["am"], "workers": ["Almaz"], "book_name": "دليل بيت أم سارة", "icon": "🌷",
              "rules": ["k05", "c01", "p01", "d01", "r03"], "buyer_name": "أم سارة", "buyer_phone": "0551234567",
              "schedule": {"start": "07:00", "end": "20:30", "breaks": [["10:00", "10:30"], ["13:30", "16:00"], ["19:30", "20:00"]], "rest_day": 5}}
s, j, _ = req("POST", "/api/orders", dict(base_order, schedule={"start": "06:00", "end": "22:00", "breaks": []}))
ok("order with illegal schedule rejected", s == 400, j.get("error", "")[:50] if isinstance(j, dict) else "")
s, o, _ = req("POST", "/api/orders", base_order); ok("order created", s == 200 and o.get("id", "").startswith("GH-"), o.get("id"))
oid, key = o["id"], o["key"]
s, page, _ = req("GET", f"/o/{oid}?k={key}"); ok("status page w/ bank details", s == 200 and "SA03" in page)
s, _, _ = req("GET", f"/o/{oid}?k=WRONG"); ok("status page needs key", s == 404)

# إيصال مزوّر المبلغ
body, h = multipart(receipt(9.0, oid))
s, j, _ = req("POST", f"/api/orders/{oid}/receipt?k={key}", body, h)
ok("wrong-amount receipt NOT auto-delivered", s == 200 and j.get("status") == "review", (j.get("verify") or {}).get("reason", ""))
ok("vision read the amount check = false", ((j.get("verify") or {}).get("checks") or {}).get("amount") is False)

# إيصال صحيح
png = receipt(99.0, oid); body, h = multipart(png)
s, j, _ = req("POST", f"/api/orders/{oid}/receipt?k={key}", body, h)
chk = (j.get("verify") or {}).get("checks") or {}
ok("correct receipt read by vision", chk.get("amount") is True and chk.get("is_receipt") is True, json.dumps(chk))
ok("default = human review (AUTO_APPROVE off)", j.get("status") == "review")

# نفس الإيصال لطلب آخر = مكرر
s, o2, _ = req("POST", "/api/orders", base_order)
body, h = multipart(png)
s, j2, _ = req("POST", f"/api/orders/{o2['id']}/receipt?k={o2['key']}", body, h)
ok("duplicate receipt image detected", ((j2.get("verify") or {}).get("checks") or {}).get("image_unique") is False)

# الإدارة
s, _, _ = req("GET", "/api/admin/orders", headers={"authorization": "Bearer nope"}); ok("admin protected", s == 401)
s, lst, _ = req("GET", "/api/admin/orders?status=review", headers=A); ok("admin review queue", s == 200 and any(x["id"] == oid for x in lst))
t = time.time(); s, d, _ = req("POST", f"/api/admin/orders/{oid}/approve", {}, A)
ok("approve → delivered", s == 200 and d.get("status") == "delivered", f"{time.time()-t:.2f}s")
tok, code = d["delivered"]["token"], d["delivered"]["code"]
ok("book code issued", re.match(r"^[2-9A-Z]{4}-[2-9A-Z]{4}$", code or "") is not None, code)
s, html, hd = req("GET", f"/b/{tok}/am/", raw=True); ok("book link opens", s == 200 and b'id="payload"' in html, f"{len(html)/1024:.0f} KB (audio streamed per chapter)")
s, _, _ = req("GET", f"/b/{tok}/am/manifest.webmanifest"); ok("PWA manifest", s == 200)
s, sw, _ = req("GET", f"/b/{tok}/am/sw.js"); ok("service worker", s == 200 and "caches" in sw)
s, ab, hd = req("GET", f"/b/{tok}/am/a/ch02safety.bin", raw=True); ok("audio chunk (immutable cache)", s == 200 and len(ab) > 100000, f"{len(ab)/1024:.0f} KB")
s, ic, _ = req("GET", f"/b/{tok}/am/icon-180.png", raw=True); ok("home-screen icon", s == 200 and ic[:4] == b"\x89PNG")
s, f1, hd = req("GET", f"/dl/{tok}/am", raw=True); ok("single-file download", s == 200 and len(f1) > 5e6, f"{len(f1)/1048576:.1f} MB")
os.makedirs("dist", exist_ok=True); open("dist/platform-download.html", "wb").write(f1)
open("dist/platform-code.txt", "w").write(code)
# تتبّع: نفك الملف المحمّل بالرمز ونستخرج نصاً، ثم نطلب من الإدارة التتبع
sys.path.insert(0, "engine"); import ghcrypto as GC, base64
h_ = f1.decode(); meta = json.loads(re.search(r'<script id="meta" type="application/json">(.*?)</script>', h_, re.S).group(1).replace("<\\/", "</"))
pl = re.search(r'<script id="payload" type="text/plain">(.*?)</script>', h_, re.S).group(1); e = meta["enc"]
data = json.loads(GC.open_(GC.derive_keys(code, bytes.fromhex(e["salt"]), e["iter"]), bytes.fromhex(e["nonce"]), base64.b64decode(pl), bytes.fromhex(e["mac"])))
leaked = next(s["text"]["ar"] for c in data["chapters"] for s in c["sections"] if s.get("text") and "\u2063" in s["text"]["ar"])
s, tr, _ = req("POST", "/api/admin/trace", {"text": "نص منسوخ: " + leaked}, A); ok("leak trace → order id", tr.get("found") and tr["order"]["id"] == oid, tr.get("fingerprint"))
ok("rules personalised", sum(len(c["items"]) for c in data["rules"]) == 5)
ok("schedule personalised", data["schedule"]["workH"] == "10")
# إيقاف
s, _, _ = req("POST", f"/api/admin/orders/{oid}/revoke", {}, A)
s, _, _ = req("GET", f"/b/{tok}/am/"); ok("revoked link → 410", s == 410)
print(f"\nPASS {ok_n}  FAIL {fail_n}")
sys.exit(1 if fail_n else 0)
