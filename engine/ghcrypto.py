#!/usr/bin/env python3
"""ghcrypto.py — النظير البايثوني لـ book/core/ghcrypto.js (نفس الصيغة بالبايت).

ChaCha20 (RFC 8439) عبر مكتبة cryptography إن وُجدت، وإلا تنفيذ بايثون خالص (أبطأ لكن صحيح).
PBKDF2-HMAC-SHA256 و HMAC من hashlib/hmac القياسية.
"""
import hashlib, hmac as _hmac, os, struct

ITER = 30000
ALPH = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

try:
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms

    def chacha20(key, nonce, counter, data):
        # cryptography تتوقع nonce بـ16 بايت: counter(4, little-endian) | nonce(12)
        c = Cipher(algorithms.ChaCha20(key, struct.pack("<I", counter) + nonce), mode=None).encryptor()
        return c.update(data) + c.finalize()
except Exception:  # pragma: no cover
    def _qr(s, a, b, c, d):
        M = 0xffffffff
        s[a] = (s[a] + s[b]) & M; s[d] ^= s[a]; s[d] = ((s[d] << 16) | (s[d] >> 16)) & M
        s[c] = (s[c] + s[d]) & M; s[b] ^= s[c]; s[b] = ((s[b] << 12) | (s[b] >> 20)) & M
        s[a] = (s[a] + s[b]) & M; s[d] ^= s[a]; s[d] = ((s[d] << 8) | (s[d] >> 24)) & M
        s[c] = (s[c] + s[d]) & M; s[b] ^= s[c]; s[b] = ((s[b] << 7) | (s[b] >> 25)) & M

    def chacha20(key, nonce, counter, data):
        const = [0x61707865, 0x3320646e, 0x79622d32, 0x6b206574]
        k = list(struct.unpack("<8I", key)); n = list(struct.unpack("<3I", nonce))
        out = bytearray()
        for blk in range(0, len(data), 64):
            st = const + k + [(counter + blk // 64) & 0xffffffff] + n
            w = st[:]
            for _ in range(10):
                _qr(w, 0, 4, 8, 12); _qr(w, 1, 5, 9, 13); _qr(w, 2, 6, 10, 14); _qr(w, 3, 7, 11, 15)
                _qr(w, 0, 5, 10, 15); _qr(w, 1, 6, 11, 12); _qr(w, 2, 7, 8, 13); _qr(w, 3, 4, 9, 14)
            ks = struct.pack("<16I", *[(w[i] + st[i]) & 0xffffffff for i in range(16)])
            chunk = data[blk:blk + 64]
            out += bytes(a ^ b for a, b in zip(chunk, ks))
        return bytes(out)


def norm_code(c):
    return "".join(ch for ch in str(c or "").upper() if ch.isalnum() and ch.isascii())


def fmt_code(c):
    c = norm_code(c); return c[:4] + "-" + c[4:]


def new_code():
    r = os.urandom(8)
    return "".join(ALPH[b % 31] for b in r)


def derive_keys(code, salt, iterations=ITER):
    k = hashlib.pbkdf2_hmac("sha256", norm_code(code).encode(), salt, iterations, 64)
    return {"enc": k[:32], "mac": k[32:], "raw": k}


def seal(keys, nonce, plain):
    ct = chacha20(keys["enc"], nonce, 1, plain)
    mac = _hmac.new(keys["mac"], nonce + ct, hashlib.sha256).digest()
    return ct, mac


def open_(keys, nonce, ct, mac):
    if not _hmac.compare_digest(_hmac.new(keys["mac"], nonce + ct, hashlib.sha256).digest(), mac):
        return None
    return chacha20(keys["enc"], nonce, 1, ct)


if __name__ == "__main__":
    # RFC 8439 §2.4.2 test vector
    key = bytes(range(32)); nonce = bytes.fromhex("000000000000004a00000000")
    pt = b"Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it."
    ct = chacha20(key, nonce, 1, pt)
    assert ct[:16].hex() == "6e2e359a2568f98041ba0728dd0d6981", ct[:16].hex()
    print("RFC8439 OK")
