/**
 * منصة «كتاب البيت» — Cloudflare Worker (Hono) + D1 + R2
 *
 * رحلة المشترية (≤ 4 خطوات):  اختيار لغة العاملة → تخصيص (اسم الكتاب/القواعد/الجدول) → تحويل + رفع الإيصال → استلام الكتاب
 * التحقق من الدفع (طبقات — لا فتح بصورة إيصال وحدها):
 *   1) نموذج رؤية يقرأ الإيصال: المبلغ/العملة/آخر 4 من الآيبان/التاريخ/المرجع/الملاحظة
 *   2) قواعد: المبلغ = سعر الطلب، الآيبان = آيباننا، التاريخ خلال 72 ساعة، المرجع غير مستخدم سابقاً، الصورة غير مكررة (SHA-256)
 *   3) AUTO_APPROVE=on + كل القواعد ✓ → تسليم فوري؛ غير ذلك → طابور مراجعة بشرية (لوحة الإدارة) — الافتراضي: مراجعة بشرية
 * التسليم: رابط خاص /b/<token>/ (يُثبَّت على الشاشة كـ«كتاب» باسمه وأيقونته، يعمل بلا إنترنت بعد أول فتح) + ملف HTML واحد للتحميل + رمز الكتاب.
 */
import { Hono } from 'hono';
import { assemble, buildSchedule, manifest, serviceWorker } from '../../book/core/assemble.js';
import GHC from '../../book/core/ghcrypto.mjs';
import { landingPage, orderPage, statusPage, adminPage } from './pages';

type Env = {
  DB: D1Database; R2: R2Bucket; ASSETS: Fetcher;
  ADMIN_TOKEN?: string; OPENAI_API_KEY?: string; OPENAI_BASE_URL?: string; VISION_MODEL?: string;
  PAY_IBAN?: string; PAY_NAME?: string; PAY_BANK?: string; WHATSAPP?: string; AUTO_APPROVE?: string;
  PRICE_BASIC?: string; PRICE_PLUS?: string; PACKS_BASE?: string;
};
const app = new Hono<{ Bindings: Env }>();

const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const ALPH = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const rid = (n: number) => Array.from(rand(n)).map((b) => ALPH[b % 31]).join('');
const now = () => new Date().toISOString();
const PLANS = (e: Env) => ({
  basic: { price: Number(e.PRICE_BASIC || 99), langs: 1, label: 'الكتاب الشخصي' },
  plus: { price: Number(e.PRICE_PLUS || 149), langs: 2, label: 'البيت الكبير — عاملتان' },
});
async function sha256hex(buf: ArrayBuffer) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((b) => b.toString(16).padStart(2, '0')).join(''); }

// ───────── حزم اللغات (من R2، مع كاش في الذاكرة لكل isolate) ─────────
const cache: Record<string, any> = {};
async function r2text(e: Env, key: string) {
  if (cache[key]) return cache[key];
  const o = await e.R2.get(key); if (!o) throw new Error('missing ' + key);
  const t = await o.text(); if (t.length < 4_000_000) cache[key] = t; return t;
}
async function loadPack(e: Env, lang: string) {
  const k = 'pack:' + lang; if (cache[k]) return cache[k];
  const v = { pack: JSON.parse(await r2text(e, `packs/${lang}/pack.json`)), fonts: JSON.parse(await r2text(e, `packs/${lang}/fonts.json`)), template: await r2text(e, 'packs/template.html') };
  cache[k] = v; return v;
}

// ───────── قاعدة البيانات (ترحيل تلقائي كسول) ─────────
let migrated = false;
async function migrate(e: Env) {
  if (migrated) return;
  await e.DB.batch([
    e.DB.prepare(`CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, created_at TEXT, status TEXT, plan TEXT, price REAL, currency TEXT,
      buyer_name TEXT, buyer_phone TEXT, book_name TEXT, home_name TEXT, icon TEXT, langs TEXT, workers TEXT, rules TEXT, schedule TEXT,
      madam_phone TEXT, akey TEXT, receipt_key TEXT, receipt_hash TEXT, receipt_ref TEXT, verify TEXT, token TEXT, code TEXT, delivered_at TEXT, notes TEXT, revoked INTEGER DEFAULT 0, opens INTEGER DEFAULT 0)`),
    e.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_token ON orders(token)`),
    e.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_ref ON orders(receipt_ref)`),
    e.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_hash ON orders(receipt_hash)`),
    e.DB.prepare(`CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT, at TEXT, kind TEXT, data TEXT)`),
  ]);
  migrated = true;
}
async function ev(e: Env, oid: string, kind: string, data: any = {}) { await e.DB.prepare('INSERT INTO events(order_id,at,kind,data) VALUES(?,?,?,?)').bind(oid, now(), kind, JSON.stringify(data)).run(); }
app.use('*', async (c, next) => { await migrate(c.env); await next(); c.header('X-Content-Type-Options', 'nosniff'); c.header('Referrer-Policy', 'no-referrer'); });

// ───────── الصفحات ─────────
app.get('/', async (c) => c.html(landingPage({ plans: PLANS(c.env), wa: c.env.WHATSAPP || '' })));
app.get('/order', async (c) => {
  const cat = JSON.parse(await r2text(c.env, 'packs/catalog.json'));
  return c.html(orderPage({ catalog: cat, plans: PLANS(c.env) }));
});
app.get('/o/:id', async (c) => {
  const o = await getOrder(c.env, c.req.param('id'), c.req.query('k'));
  if (!o) return c.text('الطلب غير موجود', 404);
  return c.html(statusPage({ o: publicOrder(o), pay: { iban: c.env.PAY_IBAN || 'SA00 0000 0000 0000 0000 0000', name: c.env.PAY_NAME || '—', bank: c.env.PAY_BANK || '' }, wa: c.env.WHATSAPP || '', origin: new URL(c.req.url).origin }));
});
app.get('/admin', (c) => c.html(adminPage()));

// ───────── API: الكتالوج ─────────
app.get('/api/catalog', async (c) => c.json({ ...(JSON.parse(await r2text(c.env, 'packs/catalog.json'))), plans: PLANS(c.env) }));

// ───────── API: معاينة الجدول (تحقق نظامي فوري أثناء التعبئة) ─────────
app.post('/api/schedule/check', async (c) => {
  const b = await c.req.json<any>();
  try { const s = buildSchedule(b, { max_work_hours: 10, min_daily_rest_hours: 8, break_after_hours: 5 }); return c.json({ ok: true, ...s }); }
  catch (err: any) { return c.json({ ok: false, error: err.message }, 200); }
});

// ───────── API: إنشاء طلب ─────────
app.post('/api/orders', async (c) => {
  const b = await c.req.json<any>();
  const plans = PLANS(c.env) as any; const plan = plans[b.plan] ? b.plan : 'basic';
  const cat = JSON.parse(await r2text(c.env, 'packs/catalog.json'));
  const langs: string[] = (Array.isArray(b.langs) ? b.langs : [b.lang]).filter((l: string) => cat.languages[l]).slice(0, plans[plan].langs);
  if (!langs.length) return c.json({ error: 'اختاري لغة العاملة' }, 400);
  const bookName = String(b.book_name || '').trim().slice(0, 40);
  if (bookName.length < 2) return c.json({ error: 'اكتبي اسم الكتاب' }, 400);
  const phone = String(b.buyer_phone || '').replace(/[^\d+]/g, '');
  if (phone.length < 9) return c.json({ error: 'رقم الجوال غير صحيح' }, 400);
  if (b.schedule) { try { buildSchedule(b.schedule, { max_work_hours: 10, min_daily_rest_hours: 8, break_after_hours: 5 }); } catch (err: any) { return c.json({ error: err.message }, 400); } }
  const id = 'GH-' + rid(5), key = rid(16);
  await c.env.DB.prepare(`INSERT INTO orders(id,created_at,status,plan,price,currency,buyer_name,buyer_phone,book_name,home_name,icon,langs,workers,rules,schedule,madam_phone,akey,notes)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, now(), 'awaiting_payment', plan, plans[plan].price, 'SAR', String(b.buyer_name || '').slice(0, 60), phone,
    bookName, String(b.home_name || bookName).slice(0, 40), String(b.icon || '🌸').slice(0, 4), JSON.stringify(langs), JSON.stringify((b.workers || []).map((w: any) => String(w || '').slice(0, 30))),
    JSON.stringify((b.rules || []).slice(0, 80)), b.schedule ? JSON.stringify(b.schedule) : null, String(b.madam_phone || phone).replace(/[^\d+]/g, ''), key, '').run();
  await ev(c.env, id, 'created', { plan, langs });
  return c.json({ id, key, url: `/o/${id}?k=${key}`, price: plans[plan].price });
});

async function getOrder(e: Env, id: string, k?: string | null) {
  const o: any = await e.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
  if (!o) return null;
  if (!k || o.akey !== k) return null;
  return o;
}
function publicOrder(o: any) {
  const v = o.verify ? JSON.parse(o.verify) : null;
  return { id: o.id, status: o.status, plan: o.plan, price: o.price, currency: o.currency, book_name: o.book_name, icon: o.icon, langs: JSON.parse(o.langs || '[]'),
    verify: v ? { checks: v.checks, reason: v.reason } : null, delivered: o.status === 'delivered' ? { token: o.token.slice(2), code: o.code } : null };
}

// ───────── API: رفع الإيصال + التحليل ─────────
app.post('/api/orders/:id/receipt', async (c) => {
  const id = c.req.param('id'); const k = c.req.query('k');
  const o: any = await getOrder(c.env, id, k); if (!o) return c.json({ error: 'not found' }, 404);
  if (o.status === 'delivered') return c.json(publicOrder(o));
  const form = await c.req.formData(); const f = form.get('file') as File | null;
  if (!f || !f.size) return c.json({ error: 'أرفقي صورة الإيصال' }, 400);
  if (f.size > 6_000_000) return c.json({ error: 'الصورة كبيرة جداً (الحد 6MB)' }, 400);
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type) && f.type !== 'application/pdf') return c.json({ error: 'صيغة غير مدعومة — صورة JPG/PNG' }, 400);
  const buf = await f.arrayBuffer(); const hash = await sha256hex(buf);
  const dup: any = await c.env.DB.prepare('SELECT id FROM orders WHERE receipt_hash=? AND id<>?').bind(hash, id).first();
  const rkey = `receipts/${id}/${Date.now()}`;
  await c.env.R2.put(rkey, buf, { httpMetadata: { contentType: f.type } });
  const ext = await readReceipt(c.env, buf, f.type);
  const v = verify(c.env, o, ext, !!dup);
  if (ext && ext.reference && !v.dupRef) {
    const r2: any = await c.env.DB.prepare('SELECT id FROM orders WHERE receipt_ref=? AND id<>?').bind(String(ext.reference), id).first();
    if (r2) { v.checks.ref_unique = false; v.ok = false; v.reason = 'رقم العملية مستخدم في طلب آخر'; }
  }
  const auto = c.env.AUTO_APPROVE === 'on' && v.ok;
  await c.env.DB.prepare('UPDATE orders SET receipt_key=?, receipt_hash=?, receipt_ref=?, verify=?, status=? WHERE id=?')
    .bind(rkey, hash, ext?.reference ? String(ext.reference) : null, JSON.stringify({ ...v, ext }), auto ? 'paid' : 'review', id).run();
  await ev(c.env, id, 'receipt', { ok: v.ok, auto });
  if (auto) await deliver(c.env, id);
  const fresh: any = await c.env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
  return c.json(publicOrder(fresh));
});

async function readReceipt(e: Env, buf: ArrayBuffer, type: string): Promise<any> {
  if (!e.OPENAI_API_KEY) return null;
  const b64 = GHC.b64enc(new Uint8Array(buf));
  const prompt = `You read Saudi/GCC bank transfer receipts (Arabic or English, Arabic-Indic or Western digits). Return ONLY JSON:
{"is_receipt":bool,"amount":number|null,"currency":"SAR|AED|KWD|QAR|BHD|OMR"|null,"to_iban_last4":"dddd"|null,"to_name":string|null,"date":"YYYY-MM-DD"|null,"reference":string|null,"note":string|null,"bank":string|null,"suspicious":bool,"why_suspicious":string|null}
Convert Arabic-Indic digits to Western. KWD/BHD/OMR have 3 decimals. Mark suspicious if edited, cropped oddly, inconsistent fonts, or not a real transfer confirmation.`;
  try {
    const r = await fetch((e.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '') + '/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${e.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: e.VISION_MODEL || 'gpt-5-mini', response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:${type};base64,${b64}` } }] }] }),
    });
    if (!r.ok) return { error: 'vision ' + r.status };
    const j: any = await r.json(); return JSON.parse(j.choices[0].message.content);
  } catch (err: any) { return { error: String(err && err.message) }; }
}

function verify(e: Env, o: any, x: any, dupImage: boolean) {
  const checks: Record<string, boolean | null> = {};
  const iban = (e.PAY_IBAN || '').replace(/\s/g, '');
  if (!x || x.error) return { ok: false, checks: { read: false }, reason: 'تعذّر قراءة الإيصال آلياً — سيراجعه فريقنا', dupRef: false };
  checks.is_receipt = !!x.is_receipt;
  checks.amount = typeof x.amount === 'number' && Math.abs(x.amount - o.price) < 0.01 && (!x.currency || x.currency === o.currency);
  checks.iban = iban ? (x.to_iban_last4 ? iban.endsWith(String(x.to_iban_last4)) : null) : null;
  if (x.date) { const d = Date.parse(x.date); checks.recent = !isNaN(d) && Date.now() - d < 72 * 3600e3 && d - Date.now() < 24 * 3600e3; } else checks.recent = null;
  checks.image_unique = !dupImage;
  checks.not_suspicious = !x.suspicious;
  checks.note_matches = x.note ? String(x.note).toUpperCase().includes(o.id.slice(3)) : null;
  const hard = ['is_receipt', 'amount', 'image_unique', 'not_suspicious'];
  const ok = hard.every((k) => checks[k] === true) && checks.iban !== false && checks.recent !== false && x.reference;
  const reason = ok ? 'مطابق' : !checks.amount ? `المبلغ في الإيصال (${x.amount ?? '؟'}) لا يطابق سعر الطلب (${o.price})` : !checks.image_unique ? 'هذا الإيصال مستخدم سابقاً' :
    checks.iban === false ? 'الحساب المستلم غير مطابق' : checks.recent === false ? 'تاريخ التحويل قديم' : x.suspicious ? 'الإيصال يحتاج مراجعة بشرية' : 'سيراجعه فريقنا خلال وقت قصير';
  return { ok: !!ok, checks, reason, dupRef: false };
}

// ───────── التسليم: بناء كتاب لكل لغة/عاملة ─────────
async function deliver(e: Env, id: string) {
  const o: any = await e.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first();
  const langs: string[] = JSON.parse(o.langs), workers: string[] = JSON.parse(o.workers || '[]');
  const token = rid(20), code = GHC.newCode(rand);
  const books: any[] = [];
  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i]; const { pack, fonts, template } = await loadPack(e, lang);
    const order = { order_id: o.id, book_name: o.book_name, home_name: o.home_name, worker_name: workers[i] || '', icon: o.icon,
      rules: JSON.parse(o.rules || '[]'), schedule: o.schedule ? JSON.parse(o.schedule) : null, madam_phone: o.madam_phone, code };
    const r = assemble({ pack, template, fonts, order, audio: null, pwa: true, rand });
    const base = `/b/${token}/${lang}/`;
    await e.R2.put(`books/${token}/${lang}/index.html`, r.html, { httpMetadata: { contentType: 'text/html; charset=utf-8' } });
    await e.R2.put(`books/${token}/${lang}/manifest.webmanifest`, JSON.stringify(manifest(order, base)), { httpMetadata: { contentType: 'application/manifest+json' } });
    const files = ['./index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png', ...Object.values<any>(pack.groups).map((g) => `./a/${g.file}.bin`)];
    await e.R2.put(`books/${token}/${lang}/sw.js`, serviceWorker(id + '-' + Date.now().toString(36), files), { httpMetadata: { contentType: 'text/javascript' } });
    books.push({ lang, fp: r.fingerprint, worker: workers[i] || '' });
  }
  await e.DB.prepare(`UPDATE orders SET status='delivered', token=?, code=?, delivered_at=?, notes=? WHERE id=?`)
    .bind('t:' + token, GHC.fmtCode(code), now(), JSON.stringify({ books }), id).run();
  await ev(e, id, 'delivered', { langs });
}

// ───────── تقديم الكتاب ─────────
// الصوت والأيقونات مشتركة بين كل كتب اللغة (مشفّرة بمفتاح اللغة داخل الحمولة المقفلة) — تُقدَّم من الحزمة مباشرة
app.get('/b/:token/:lang/*', async (c) => {
  const { token, lang } = c.req.param(); const rest = c.req.path.split(`/b/${token}/${lang}/`)[1] || 'index.html';
  const o: any = await c.env.DB.prepare('SELECT id, revoked, status FROM orders WHERE token=?').bind('t:' + token).first();
  if (!o || o.status !== 'delivered') return c.text('الكتاب غير موجود', 404);
  if (o.revoked) return c.html('<meta charset=utf-8><body style="font:18px sans-serif;padding:30px;text-align:center">تم إيقاف هذا الرابط. تواصلي مع البائعة.</body>', 410);
  let key: string, type = 'application/octet-stream', cacheCtl = 'private, max-age=300';
  if (/^a\/[a-z0-9]+\.bin$/.test(rest)) { key = `packs/${lang}/${rest}`; cacheCtl = 'public, max-age=31536000, immutable'; }
  else if (/^icon-(180|512)\.png$/.test(rest)) { key = `packs/${lang}/${rest}`; type = 'image/png'; cacheCtl = 'public, max-age=86400'; }
  else if (['index.html', 'manifest.webmanifest', 'sw.js'].includes(rest)) { key = `books/${token}/${lang}/${rest}`; }
  else return c.text('not found', 404);
  const obj = await c.env.R2.get(key); if (!obj) return c.text('not found', 404);
  if (rest === 'index.html') { c.executionCtx.waitUntil(c.env.DB.prepare('UPDATE orders SET opens=opens+1 WHERE id=?').bind(o.id).run()); }
  return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || type, 'Cache-Control': cacheCtl, 'X-Robots-Tag': 'noindex' } });
});
app.get('/b/:token/:lang', (c) => c.redirect(`/b/${c.req.param('token')}/${c.req.param('lang')}/`, 301));

// ملف HTML واحد للتحميل (يعمل بلا إنترنت ويُرسل على واتساب) — يُجمع عند الطلب مع الصوت مضمّناً
app.get('/dl/:token/:lang', async (c) => {
  const { token, lang } = c.req.param();
  const o: any = await c.env.DB.prepare('SELECT * FROM orders WHERE token=?').bind('t:' + token).first();
  if (!o || o.revoked || o.status !== 'delivered') return c.text('غير متاح', 404);
  const { pack, fonts, template } = await loadPack(c.env, lang);
  const audio: Record<string, string> = {};
  for (const [g, info] of Object.entries<any>(pack.groups)) audio[g] = await r2text(c.env, `packs/${lang}/a/${info.file}.b64`);
  const langs = JSON.parse(o.langs), i = langs.indexOf(lang); if (i < 0) return c.text('غير متاح', 404);
  const r = assemble({ pack, template, fonts, audio, pwa: false, rand,
    order: { order_id: o.id, book_name: o.book_name, home_name: o.home_name, worker_name: JSON.parse(o.workers || '[]')[i] || '', icon: o.icon,
      rules: JSON.parse(o.rules || '[]'), schedule: o.schedule ? JSON.parse(o.schedule) : null, madam_phone: o.madam_phone, code: o.code } });
  await ev(c.env, o.id, 'download', { lang });
  const fname = encodeURIComponent(`${o.book_name}.html`);
  return new Response(r.html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Disposition': `attachment; filename*=UTF-8''${fname}`, 'Cache-Control': 'private, no-store' } });
});

// ───────── الإدارة ─────────
const admin = new Hono<{ Bindings: Env }>();
admin.use('*', async (c, next) => {
  const t = c.req.header('authorization')?.replace(/^Bearer /, '') || '';
  if (!c.env.ADMIN_TOKEN || t !== c.env.ADMIN_TOKEN) return c.json({ error: 'unauthorized' }, 401);
  await next();
});
admin.get('/orders', async (c) => {
  const st = c.req.query('status');
  const q = st ? c.env.DB.prepare('SELECT * FROM orders WHERE status=? ORDER BY created_at DESC LIMIT 200').bind(st) : c.env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200');
  const { results } = await q.all();
  return c.json(results.map((o: any) => ({ ...o, akey: undefined, verify: o.verify ? JSON.parse(o.verify) : null })));
});
admin.get('/receipt/:id', async (c) => {
  const o: any = await c.env.DB.prepare('SELECT receipt_key FROM orders WHERE id=?').bind(c.req.param('id')).first();
  const obj = o?.receipt_key && (await c.env.R2.get(o.receipt_key)); if (!obj) return c.text('none', 404);
  return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType || 'image/jpeg', 'Cache-Control': 'no-store' } });
});
admin.post('/orders/:id/approve', async (c) => { const id = c.req.param('id'); await ev(c.env, id, 'approved_by_admin'); await deliver(c.env, id); return c.json(publicOrder(await c.env.DB.prepare('SELECT * FROM orders WHERE id=?').bind(id).first())); });
admin.post('/orders/:id/reject', async (c) => { const id = c.req.param('id'); const b = await c.req.json<any>().catch(() => ({})); await c.env.DB.prepare(`UPDATE orders SET status='rejected' WHERE id=?`).bind(id).run(); await ev(c.env, id, 'rejected', b); return c.json({ ok: true }); });
admin.post('/orders/:id/revoke', async (c) => { const id = c.req.param('id'); await c.env.DB.prepare('UPDATE orders SET revoked=1 WHERE id=?').bind(id).run(); await ev(c.env, id, 'revoked'); return c.json({ ok: true }); });
admin.post('/orders/:id/reissue', async (c) => { const id = c.req.param('id'); await ev(c.env, id, 'reissue'); await c.env.DB.prepare('UPDATE orders SET revoked=0 WHERE id=?').bind(id).run(); await deliver(c.env, id); return c.json({ ok: true }); });
// تتبّع تسريب: الصق نصاً منسوخاً من نسخة مسرّبة → يستخرج رقم الطلب من البصمة غير المرئية
admin.post('/trace', async (c) => {
  const { text } = await c.req.json<any>(); const { zwDecode } = await import('../../book/core/assemble.js');
  const fp = zwDecode(text || ''); if (!fp) return c.json({ found: false });
  const oid = fp.split('|')[0]; const o: any = await c.env.DB.prepare('SELECT id,buyer_name,buyer_phone,book_name,delivered_at FROM orders WHERE id=?').bind(oid).first();
  return c.json({ found: true, fingerprint: fp, order: o });
});
admin.get('/stats', async (c) => {
  const r: any = await c.env.DB.prepare(`SELECT status, COUNT(*) n, SUM(price) s FROM orders GROUP BY status`).all();
  return c.json(r.results);
});
app.route('/api/admin', admin);

app.notFound((c) => c.env.ASSETS ? c.env.ASSETS.fetch(c.req.raw) : c.text('404', 404));
export default app;
