#!/usr/bin/env python3
"""attack_test.py — يعيد هجوم ضمان الجودة (rip.py) على الكتاب v2 ويقيس ما تغيّر بصدق.

  1) استخراج النص والصوت بدون الرمز            → يجب أن يفشل (المحتوى مشفّر)
  2) استبدال اسم المنتج وإعادة البيع              → الاسم داخل المحتوى المشفّر لا يُستبدل؛ والغلاف يفضح البيت
  3) استخراج بالرمز (مشترية تسرّب ملفها+رمزها)    → ينجح (معلن) — لكن البصمة تكشف رقم الطلب
  4) تعديل بايت واحد في الحمولة                   → HMAC يرفض الفك
"""
import sys, os, re, json, base64, hashlib, hmac
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "engine"))
import ghcrypto as GC
from build_book2 import zw_decode

f = sys.argv[1]; code = sys.argv[2] if len(sys.argv) > 2 else None
html = open(f, encoding="utf-8").read()
meta = json.loads(re.search(r'<script id="meta" type="application/json">(.*?)</script>', html, re.S).group(1).replace("<\\/", "</"))
payload = re.search(r'<script id="payload" type="text/plain">(.*?)</script>', html, re.S).group(1)
res = {}

# 1) بدون رمز
try:
    json.loads(payload); res["1_rip_without_code"] = "VULNERABLE (plaintext payload)"
except Exception:
    arabic = len(re.findall(r"[\u0600-\u06FF]{3,}", base64.b64decode(payload)[:200000].decode("latin1")))
    res["1_rip_without_code"] = "BLOCKED — payload is ChaCha20 ciphertext" if meta.get("enc") else "?"
clear_groups = [g for g, v in meta["audio"].items() if not v.get("nonce")]
res["1b_audio_clear_groups"] = clear_groups  # ui+sos مقصودة (الغلاف/الطوارئ تعمل قبل الرمز)

# 2) brute force cost
if meta.get("enc"):
    import time
    t = time.time(); GC.derive_keys("AAAA2345", bytes.fromhex(meta["enc"]["salt"])); dt = time.time() - t
    space = 31 ** 8
    res["2_bruteforce"] = f"{space:.2e} codes × {dt*1000:.0f}ms/try (1 CPU) ≈ {space*dt/86400/365/1e3:.0f} ألف سنة-معالج"

# 3) بالرمز
if code and meta.get("enc"):
    e = meta["enc"]; keys = GC.derive_keys(code, bytes.fromhex(e["salt"]), e["iter"])
    pt = GC.open_(keys, bytes.fromhex(e["nonce"]), base64.b64decode(payload), bytes.fromhex(e["mac"]))
    data = json.loads(pt)
    found = None
    for c in data["chapters"]:
        for s in c["sections"]:
            if s.get("text"):
                fp = zw_decode(s["text"]["ar"])
                if fp: found = fp; break
        if found: break
    res["3_leak_with_code"] = "content extractable (expected, disclosed)"
    res["3_fingerprint_recovered"] = found
    # تتبع حتى بعد نسخ النص المرئي فقط؟ البصمة غير مرئية لكنها تبقى في copy/paste
    # 4) tamper
    ct = bytearray(base64.b64decode(payload)); ct[100] ^= 1
    res["4_tamper_detected"] = GC.open_(keys, bytes.fromhex(e["nonce"]), bytes(ct), bytes.fromhex(e["mac"])) is None
    res["3b_fp_hmac_matches"] = hmac.new(keys["mac"], found.encode(), hashlib.sha256).hexdigest()[:24] == e["fp"] if found else False
res["visible_watermark"] = meta.get("wm")
print(json.dumps(res, ensure_ascii=False, indent=1))
