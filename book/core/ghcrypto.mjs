// AUTO-GENERATED from ghcrypto.js by make-esm.mjs — do not edit
/*
 * ghcrypto.js — تشفير خفيف بلا أي مكتبة، يعمل في كل متصفح (حتى iOS 10 / Chrome 49) وفي Node وفي Cloudflare Workers.
 * لماذا ليس WebCrypto؟ لأن crypto.subtle غير متاح على file:// في بعض المتصفحات وعلى الأجهزة القديمة،
 * والكتاب يجب أن يفتح من ملف واتساب بلا إنترنت. لذلك: تنفيذ JS خالص، ES5، مطابق للمعايير ومختبر مقابل Python.
 *
 *   ChaCha20 (RFC 8439, 96-bit nonce, 32-bit counter) — تشفير
 *   SHA-256 / HMAC-SHA256 (FIPS 180-4 / RFC 2104)     — سلامة + التحقق من الرمز
 *   PBKDF2-HMAC-SHA256 (RFC 8018)                      — اشتقاق المفتاح من رمز الكتاب
 *
 * ملاحظة صادقة: هذا يمنع من حصل على الملف بدون الرمز من قراءته، ولا يمنع صاحب الملف+الرمز من استخراج المحتوى.
 * الحماية الحقيقية = التخصيص + البصمة + الترخيص (انظر docs/DECISIONS.md ADR-012).
 */
var GHC = (function () {
  'use strict';
  // ---------------- UTF-8 ----------------
  function utf8(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    var s = unescape(encodeURIComponent(str)), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  function utf8dec(bytes) {
    if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(bytes);
    var s = '', CH = 8192;
    for (var i = 0; i < bytes.length; i += CH) s += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    return decodeURIComponent(escape(s));
  }
  // ---------------- Base64 (يعمل بلا atob أيضاً: Workers/Node/متصفح) ----------------
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  var B64R = new Uint8Array(256); for (var bi = 0; bi < 64; bi++) B64R[B64.charCodeAt(bi)] = bi;
  function b64enc(u8) {
    var out = [], i, n = u8.length, chunk = '';
    for (i = 0; i + 2 < n; i += 3) {
      var v = (u8[i] << 16) | (u8[i + 1] << 8) | u8[i + 2];
      chunk += B64[v >> 18] + B64[(v >> 12) & 63] + B64[(v >> 6) & 63] + B64[v & 63];
      if (chunk.length > 16380) { out.push(chunk); chunk = ''; }
    }
    if (i < n) {
      var v2 = u8[i] << 16 | ((i + 1 < n ? u8[i + 1] : 0) << 8);
      chunk += B64[v2 >> 18] + B64[(v2 >> 12) & 63] + (i + 1 < n ? B64[(v2 >> 6) & 63] : '=') + '=';
    }
    out.push(chunk); return out.join('');
  }
  function b64dec(s) {
    s = s.replace(/[^A-Za-z0-9+/]/g, '');
    var n = s.length, outLen = (n * 3) >> 2, out = new Uint8Array(outLen), o = 0, i;
    for (i = 0; i + 3 < n; i += 4) {
      var v = (B64R[s.charCodeAt(i)] << 18) | (B64R[s.charCodeAt(i + 1)] << 12) | (B64R[s.charCodeAt(i + 2)] << 6) | B64R[s.charCodeAt(i + 3)];
      out[o++] = v >> 16; out[o++] = (v >> 8) & 255; out[o++] = v & 255;
    }
    var rem = n - i;
    if (rem >= 2) {
      var w = (B64R[s.charCodeAt(i)] << 18) | (B64R[s.charCodeAt(i + 1)] << 12) | (rem > 2 ? B64R[s.charCodeAt(i + 2)] << 6 : 0);
      out[o++] = w >> 16; if (rem > 2) out[o++] = (w >> 8) & 255;
    }
    return o === outLen ? out : out.subarray(0, o);
  }
  function hex(u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += (u8[i] < 16 ? '0' : '') + u8[i].toString(16); return s; }
  function unhex(s) { var o = new Uint8Array(s.length >> 1); for (var i = 0; i < o.length; i++) o[i] = parseInt(s.substr(i * 2, 2), 16); return o; }

  // ---------------- ChaCha20 ----------------
  function chacha20(key, nonce, counter, data) {
    // key: 32 bytes, nonce: 12 bytes, data: Uint8Array → new Uint8Array (XOR keystream)
    var st = new Uint32Array(16), x = new Uint32Array(16), ks = new Uint8Array(64);
    st[0] = 0x61707865; st[1] = 0x3320646e; st[2] = 0x79622d32; st[3] = 0x6b206574;
    for (var i = 0; i < 8; i++) st[4 + i] = key[i * 4] | (key[i * 4 + 1] << 8) | (key[i * 4 + 2] << 16) | (key[i * 4 + 3] << 24);
    st[12] = counter >>> 0;
    for (i = 0; i < 3; i++) st[13 + i] = nonce[i * 4] | (nonce[i * 4 + 1] << 8) | (nonce[i * 4 + 2] << 16) | (nonce[i * 4 + 3] << 24);
    var out = new Uint8Array(data.length), pos = 0, n = data.length;
    while (pos < n) {
      var x0 = st[0], x1 = st[1], x2 = st[2], x3 = st[3], x4 = st[4], x5 = st[5], x6 = st[6], x7 = st[7],
        x8 = st[8], x9 = st[9], x10 = st[10], x11 = st[11], x12 = st[12], x13 = st[13], x14 = st[14], x15 = st[15], t;
      for (var r = 0; r < 10; r++) {
        x0 = x0 + x4 | 0; t = x12 ^ x0; x12 = t << 16 | t >>> 16; x8 = x8 + x12 | 0; t = x4 ^ x8; x4 = t << 12 | t >>> 20;
        x0 = x0 + x4 | 0; t = x12 ^ x0; x12 = t << 8 | t >>> 24; x8 = x8 + x12 | 0; t = x4 ^ x8; x4 = t << 7 | t >>> 25;
        x1 = x1 + x5 | 0; t = x13 ^ x1; x13 = t << 16 | t >>> 16; x9 = x9 + x13 | 0; t = x5 ^ x9; x5 = t << 12 | t >>> 20;
        x1 = x1 + x5 | 0; t = x13 ^ x1; x13 = t << 8 | t >>> 24; x9 = x9 + x13 | 0; t = x5 ^ x9; x5 = t << 7 | t >>> 25;
        x2 = x2 + x6 | 0; t = x14 ^ x2; x14 = t << 16 | t >>> 16; x10 = x10 + x14 | 0; t = x6 ^ x10; x6 = t << 12 | t >>> 20;
        x2 = x2 + x6 | 0; t = x14 ^ x2; x14 = t << 8 | t >>> 24; x10 = x10 + x14 | 0; t = x6 ^ x10; x6 = t << 7 | t >>> 25;
        x3 = x3 + x7 | 0; t = x15 ^ x3; x15 = t << 16 | t >>> 16; x11 = x11 + x15 | 0; t = x7 ^ x11; x7 = t << 12 | t >>> 20;
        x3 = x3 + x7 | 0; t = x15 ^ x3; x15 = t << 8 | t >>> 24; x11 = x11 + x15 | 0; t = x7 ^ x11; x7 = t << 7 | t >>> 25;
        x0 = x0 + x5 | 0; t = x15 ^ x0; x15 = t << 16 | t >>> 16; x10 = x10 + x15 | 0; t = x5 ^ x10; x5 = t << 12 | t >>> 20;
        x0 = x0 + x5 | 0; t = x15 ^ x0; x15 = t << 8 | t >>> 24; x10 = x10 + x15 | 0; t = x5 ^ x10; x5 = t << 7 | t >>> 25;
        x1 = x1 + x6 | 0; t = x12 ^ x1; x12 = t << 16 | t >>> 16; x11 = x11 + x12 | 0; t = x6 ^ x11; x6 = t << 12 | t >>> 20;
        x1 = x1 + x6 | 0; t = x12 ^ x1; x12 = t << 8 | t >>> 24; x11 = x11 + x12 | 0; t = x6 ^ x11; x6 = t << 7 | t >>> 25;
        x2 = x2 + x7 | 0; t = x13 ^ x2; x13 = t << 16 | t >>> 16; x8 = x8 + x13 | 0; t = x7 ^ x8; x7 = t << 12 | t >>> 20;
        x2 = x2 + x7 | 0; t = x13 ^ x2; x13 = t << 8 | t >>> 24; x8 = x8 + x13 | 0; t = x7 ^ x8; x7 = t << 7 | t >>> 25;
        x3 = x3 + x4 | 0; t = x14 ^ x3; x14 = t << 16 | t >>> 16; x9 = x9 + x14 | 0; t = x4 ^ x9; x4 = t << 12 | t >>> 20;
        x3 = x3 + x4 | 0; t = x14 ^ x3; x14 = t << 8 | t >>> 24; x9 = x9 + x14 | 0; t = x4 ^ x9; x4 = t << 7 | t >>> 25;
      }
      x[0] = x0 + st[0]; x[1] = x1 + st[1]; x[2] = x2 + st[2]; x[3] = x3 + st[3]; x[4] = x4 + st[4]; x[5] = x5 + st[5];
      x[6] = x6 + st[6]; x[7] = x7 + st[7]; x[8] = x8 + st[8]; x[9] = x9 + st[9]; x[10] = x10 + st[10]; x[11] = x11 + st[11];
      x[12] = x12 + st[12]; x[13] = x13 + st[13]; x[14] = x14 + st[14]; x[15] = x15 + st[15];
      for (i = 0; i < 16; i++) { var w = x[i]; ks[i * 4] = w; ks[i * 4 + 1] = w >>> 8; ks[i * 4 + 2] = w >>> 16; ks[i * 4 + 3] = w >>> 24; }
      var lim = Math.min(64, n - pos);
      for (i = 0; i < lim; i++) out[pos + i] = data[pos + i] ^ ks[i];
      pos += lim; st[12] = (st[12] + 1) >>> 0;
    }
    return out;
  }

  // ---------------- SHA-256 ----------------
  var K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  var W = new Uint32Array(64);
  function compress(H, b, off) { // H: Uint32Array(8), b: Uint8Array, off: block offset
    var i, t1, t2;
    for (i = 0; i < 16; i++) W[i] = (b[off + i * 4] << 24) | (b[off + i * 4 + 1] << 16) | (b[off + i * 4 + 2] << 8) | b[off + i * 4 + 3];
    for (i = 16; i < 64; i++) {
      var w15 = W[i - 15], w2 = W[i - 2];
      var s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
      var s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
    }
    var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (i = 0; i < 64; i++) {
      t1 = (h + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
      t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
    }
    H[0] += a; H[1] += bb; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  var IV = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  function sha256(msg, prefixState, prefixLen) {
    // prefixState: حالة بعد كتلة 64 بايت سابقة (لتسريع HMAC) — اختياري
    var H = new Uint32Array(prefixState || IV), n = msg.length, total = n + (prefixLen || 0);
    var full = n - (n % 64), i;
    for (i = 0; i < full; i += 64) compress(H, msg, i);
    var rest = n - full, pad = new Uint8Array(rest < 56 ? 64 : 128);
    pad.set(msg.subarray(full)); pad[rest] = 0x80;
    var bits = total * 8, hi = Math.floor(bits / 4294967296), lo = bits >>> 0, L = pad.length;
    pad[L - 8] = hi >>> 24; pad[L - 7] = hi >>> 16; pad[L - 6] = hi >>> 8; pad[L - 5] = hi;
    pad[L - 4] = lo >>> 24; pad[L - 3] = lo >>> 16; pad[L - 2] = lo >>> 8; pad[L - 1] = lo;
    for (i = 0; i < L; i += 64) compress(H, pad, i);
    var out = new Uint8Array(32);
    for (i = 0; i < 8; i++) { out[i * 4] = H[i] >>> 24; out[i * 4 + 1] = H[i] >>> 16; out[i * 4 + 2] = H[i] >>> 8; out[i * 4 + 3] = H[i]; }
    return out;
  }
  function hmacInit(key) {
    if (key.length > 64) key = sha256(key);
    var ip = new Uint8Array(64), op = new Uint8Array(64);
    for (var i = 0; i < 64; i++) { var k = i < key.length ? key[i] : 0; ip[i] = k ^ 0x36; op[i] = k ^ 0x5c; }
    var Hi = new Uint32Array(IV), Ho = new Uint32Array(IV); compress(Hi, ip, 0); compress(Ho, op, 0);
    return { i: Hi, o: Ho };
  }
  function hmacWith(st, msg) { return sha256(sha256(msg, st.i, 64), st.o, 64); }
  function hmac(key, msg) { return hmacWith(hmacInit(key), msg); }
  function pbkdf2(password, salt, iter, len) {
    var st = hmacInit(password), out = new Uint8Array(len), blocks = Math.ceil(len / 32);
    for (var b = 1; b <= blocks; b++) {
      var s = new Uint8Array(salt.length + 4); s.set(salt);
      s[salt.length] = b >>> 24; s[salt.length + 1] = b >>> 16; s[salt.length + 2] = b >>> 8; s[salt.length + 3] = b;
      var u = hmacWith(st, s), t = new Uint8Array(u);
      for (var i = 1; i < iter; i++) { u = hmacWith(st, u); for (var j = 0; j < 32; j++) t[j] ^= u[j]; }
      out.set(t.subarray(0, Math.min(32, len - (b - 1) * 32)), (b - 1) * 32);
    }
    return out;
  }
  function eq(a, b) { if (a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; }

  // ---------------- رمز الكتاب ----------------
  var ALPH = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // بلا 0/O/1/I/L — لا التباس عند الكتابة
  function normCode(c) { return String(c || '').toUpperCase().replace(/[^0-9A-Z]/g, ''); }
  function fmtCode(c) { c = normCode(c); return c.slice(0, 4) + '-' + c.slice(4); }
  function newCode(rand) { var r = rand(8), s = ''; for (var i = 0; i < 8; i++) s += ALPH[r[i] % 31]; return s; }

  // ---------------- غلاف التشفير ----------------
  // keys = PBKDF2(code, salt, iter, 64) → enc(32) | mac(32). mac = HMAC(mac, nonce|ct)
  function deriveKeys(code, salt, iter) { var k = pbkdf2(utf8(normCode(code)), salt, iter, 64); return { enc: k.subarray(0, 32), mac: k.subarray(32, 64), raw: k }; }
  function seal(keys, nonce, plain) {
    var ct = chacha20(keys.enc, nonce, 1, plain), m = new Uint8Array(12 + ct.length); m.set(nonce); m.set(ct, 12);
    return { ct: ct, mac: hmac(keys.mac, m) };
  }
  function open(keys, nonce, ct, mac) {
    var m = new Uint8Array(12 + ct.length); m.set(nonce); m.set(ct, 12);
    if (!eq(hmac(keys.mac, m), mac)) return null;
    return chacha20(keys.enc, nonce, 1, ct);
  }

  return {
    utf8: utf8, utf8dec: utf8dec, b64enc: b64enc, b64dec: b64dec, hex: hex, unhex: unhex,
    chacha20: chacha20, sha256: sha256, hmac: hmac, pbkdf2: pbkdf2, eq: eq,
    normCode: normCode, fmtCode: fmtCode, newCode: newCode, deriveKeys: deriveKeys, seal: seal, open: open, ITER: 30000
  };
})();


export default GHC;
