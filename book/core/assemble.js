/* assemble.js — يجمع «كتاب البيت» الشخصي من حزمة لغة جاهزة، داخل Cloudflare Worker (أو Node) خلال أجزاء من الثانية.
 * نفس صيغة engine/build_book2.py: حمولة مشفّرة بالرمز (PBKDF2 → ChaCha20 + HMAC) تحوي مفتاح صوت اللغة (ak)،
 * والصوت محفوظ مسبقاً مشفّراً بـ ak (لا إعادة تشفير لكل طلب = سريع). ui/sos مكشوفان (الغلاف والطوارئ قبل الرمز).
 *
 * assemble({pack, template, fonts, order, audio: {group: base64String} | null, pwa:boolean, rand}) → {html, code, meta}
 */
import GHC from './ghcrypto.mjs';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ZW = ['\u200b', '\u200c'];

function zwEncode(s) {
  const b = GHC.utf8(s); let bits = '';
  for (const x of b) bits += x.toString(2).padStart(8, '0');
  return '\u2063' + [...bits].map((c) => ZW[+c]).join('') + '\u2063';
}
export function zwDecode(t) {
  const m = /\u2063([\u200b\u200c]+)\u2063/.exec(t || ''); if (!m) return null;
  const bits = [...m[1]].map((c) => (c === '\u200b' ? '0' : '1')).join(''); const out = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return GHC.utf8dec(new Uint8Array(out));
}
const hm = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
// 24 ساعة (الساعة الإثيوبية مزاحة 6 ساعات، فصيغة 12 ساعة بلا ص/م مُلبسة) — الواجهة تضيف أيقونة شمس/قمر
const fmt12 = (t) => { const [h, m] = t.split(':').map(Number); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };
const hrs = (m) => (m % 60 === 0 ? String(m / 60) : (m / 60).toFixed(1));

/** يتحقق من الجدول مقابل حدود النظام (لائحة العمالة المنزلية م10). يرمي خطأ عربي واضح. */
export function buildSchedule(sc, L) {
  const start = hm(sc.start), end = hm(sc.end);
  if (!(end > start)) throw new Error('وقت انتهاء العمل يجب أن يكون بعد وقت البداية');
  const br = (sc.breaks || []).map(([a, b]) => [hm(a), hm(b)]).filter(([a, b]) => b > a && a >= start && b <= end).sort((x, y) => x[0] - y[0]);
  const work = end - start - br.reduce((s, [a, b]) => s + (b - a), 0);
  if (work > L.max_work_hours * 60) throw new Error(`الجدول فيه ${hrs(work)} ساعة عمل — النظام لا يسمح بأكثر من ${L.max_work_hours} ساعات. أضيفي استراحة أو قدّمي وقت الانتهاء.`);
  let seg = 0, prev = start; for (const [a, b] of br) { seg = Math.max(seg, a - prev); prev = b; } seg = Math.max(seg, end - prev);
  if (seg > L.break_after_hours * 60) throw new Error(`فيه ${hrs(seg)} ساعة عمل متواصلة بلا استراحة — النظام يوجب استراحة نصف ساعة بعد كل ${L.break_after_hours} ساعات.`);
  const rest = 24 * 60 - (end - start);
  if (rest < L.min_daily_rest_hours * 60) throw new Error(`الراحة الليلية ${hrs(rest)} ساعة — الحد الأدنى ${L.min_daily_rest_hours} ساعات متواصلة.`);
  const rows = [{ time: fmt12(sc.start), k: 'sched_start' }];
  for (const [a, b] of (sc.breaks || [])) rows.push({ time: `${fmt12(a)}\n${fmt12(b)}`, k: hm(b) - hm(a) >= 60 ? 'sched_meal' : 'sched_break', rest: true });
  rows.push({ time: fmt12(sc.end), k: 'sched_end' });
  return { rows, workH: hrs(work), restH: hrs(rest), restDay: Number(sc.rest_day ?? 5) };
}

function b64(u8) { return GHC.b64enc(u8); }
const LEGACY = { '🌸': 'flower', '🌷': 'flower', '🌺': 'flower', '🏡': 'house', '🏠': 'house', '🌙': 'moon', '⭐': 'star8', '🕊️': 'feather', '💎': 'gem', '🌿': 'leaf' };
export const emblemKey = (P, k) => { k = LEGACY[k] || k; return P.emblems && P.emblems[k] ? k : 'arch'; };
function iconsIn(o, acc) { if (Array.isArray(o)) o.forEach((v) => iconsIn(v, acc)); else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (k === 'icon' && typeof v === 'string') acc.add(v); else iconsIn(v, acc); } return acc; }
const UI_ICONS = ['house', 'book-open', 'calendar-days', 'messages-square', 'siren', 'message-circle', 'volume-2', 'arrow-left', 'arrow-right', 'chevron-left', 'chevron-right', 'check', 'x', 'info', 'smartphone', 'lock-keyhole', 'sun', 'moon', 'sun-moon', 'a-arrow-up', 'phone', 'phone-call', 'triangle-alert', 'badge-check', 'lightbulb', 'moon-star', 'plus', 'play', 'star8', 'sparkles'];
function spriteSvg(P, data, emb) {
  const used = iconsIn([data, P.sos], new Set(UI_ICONS)); const S = P.sprite || {};
  let sy = [...used].sort().filter((n) => S[n]).map((n) => `<symbol id="i-${n}" viewBox="0 0 24 24">${S[n]}</symbol>`).join('');
  sy += `<symbol id="e-${emb}" viewBox="0 0 24 24">${(P.emblems || {})[emb] || ''}</symbol>`;
  return `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${sy}</svg>`;
}
function hex(u8) { return GHC.hex(u8); }

export function assemble({ pack, template, fonts, order, audio, pwa = false, rand }) {
  const P = JSON.parse(JSON.stringify(pack)); // نسخة عميقة (نُعدّل النصوص بالبصمة)
  const ui = P.ui, oid = order.order_id;
  const want = new Set(order.rules && order.rules.length ? order.rules : P.ruleDefaults);
  const rules = P.rules.map((c) => ({ ...c, items: c.items.filter((r) => want.has(r.id)) })).filter((c) => c.items.length);
  const sched = order.schedule ? buildSchedule(order.schedule, P.limits) : null;
  const data = { chapters: P.chapters, rules, replies: P.replies, schedule: sched, ui, madam: P.madam, ak: P.ak };
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const fp = `${oid}|${P.lang}|${today}`;
  const z = zwEncode(fp);
  for (const c of data.chapters) for (const s of c.sections.slice(0, 2)) if (s.text) { const t = s.text.ar, i = t.indexOf(' '); if (i > 0) s.text.ar = t.slice(0, i) + z + t.slice(i); }
  const home = order.home_name || '';
  const wm = `${ui.copy_of.ar} ${home} · ${oid} · ${ui.license.ar}`;
  const code = GHC.normCode(order.code || GHC.newCode(rand));
  const salt = rand(16), nonce = rand(12);
  const keys = GHC.deriveKeys(code, salt, GHC.ITER);
  const plain = GHC.utf8(JSON.stringify(data));
  const sealed = GHC.seal(keys, nonce, plain);
  const check = hex(GHC.hmac(keys.mac, GHC.utf8('ghaida-check'))).slice(0, 16);
  const meta = {
    id: `${oid}-${P.lang}`.toLowerCase(), lang: P.lang, dir: P.dir, flagShort: P.flagShort,
    bookName: order.book_name || 'كتاب البيت', home, worker: order.worker_name || '', icon: emblemKey(P, order.icon), wm,
    madamPhone: order.madam_phone || '',
    ui0: Object.fromEntries(['welcome', 'welcome_sub', 'start', 'listen', 'made_for', 'unlock_title', 'unlock_hint', 'unlock_btn', 'wrong_code', 'emergency', 'audio_loading', 'call_madam', 'home', 'book', 'today', 'replies'].map((k) => [k, ui[k]])),
    sw: pwa ? 'sw.js' : null, audio: {}, sos: P.sos,
    enc: { salt: hex(salt), iter: GHC.ITER, nonce: hex(nonce), mac: hex(sealed.mac), check, fp: hex(GHC.hmac(keys.mac, GHC.utf8(fp))).slice(0, 24) },
  };
  const blocks = [];
  for (const [g, info] of Object.entries(P.groups)) {
    const m = { nonce: info.nonce, clips: info.clips, size: info.size };
    if (pwa) m.src = `a/${info.file}.bin`;
    else { m.block = 'au-' + info.file; if (audio && audio[g]) blocks.push(`<script id="au-${info.file}" type="text/plain">${audio[g]}</script>`); }
    meta.audio[g] = m;
  }
  const lic = `© غيداء — كتاب البيت. نسخة مرخّصة شخصياً: ${home} · رقم الطلب ${oid}. يُمنع بيع هذه النسخة أو نشرها أو تعديلها أو إعادة توزيعها. كل نسخة تحمل بصمة فريدة تكشف مصدرها. LICENSE: personal, non-transferable. Redistribution, resale or derivative works are prohibited.`;
  const iconSvg = 'data:image/svg+xml;base64,' + b64(GHC.utf8(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='#0E0C09'/><rect x='7' y='7' width='86' height='86' rx='17' fill='none' stroke='#C9A45C' stroke-width='2'/><g transform='translate(26 26) scale(2)' fill='none' stroke='#D9B873' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'>${(P.emblems || {})[meta.icon] || ''}</g></svg>`));
  const rep = {
    '{{LANG}}': P.lang, '{{DIR}}': P.dir, '{{BOOK_NAME}}': esc(meta.bookName), '{{BOOK_NAME_ATTR}}': esc(meta.bookName.slice(0, 22)),
    '{{LICENSE_HEADER}}': lic.replace(/--/g, '—'), '{{CV_MADE}}': esc(ui.made_for.l), '{{EMBLEM}}': `<svg class="emb" viewBox="0 0 24 24" aria-hidden="true"><use href="#e-${meta.icon}"/></svg>`, '{{SPRITE}}': spriteSvg(P, data, meta.icon), '{{FONT_STACK}}': P.fontStack,
    '{{FONT_FACES}}': (fonts.ar || '') + (fonts[P.lang] || ''), '{{ICON_DATA}}': iconSvg, '{{ICON_PNG}}': pwa ? 'icon-180.png' : iconSvg,
    '{{MANIFEST_LINK}}': pwa ? '<link rel="manifest" href="manifest.webmanifest">' : '',
    '{{META_JSON}}': JSON.stringify(meta).replace(/<\//g, '<\\/'), '{{PAYLOAD}}': b64(sealed.ct), '{{AUDIO_BLOCKS}}': blocks.join('\n'),
  };
  let html = template;
  for (const [k, v] of Object.entries(rep)) html = html.split(k).join(v);
  return { html, code: GHC.fmtCode(code), fingerprint: fp, meta };
}

export function manifest(order, base) {
  const name = order.book_name || 'كتاب البيت';
  return { name, short_name: name.slice(0, 12), start_url: base + 'index.html', scope: base, display: 'standalone', background_color: '#FBF5F1', theme_color: '#5A1030', dir: 'rtl', lang: 'ar',
    icons: [{ src: 'icon-180.png', sizes: '180x180', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
}

export function serviceWorker(ver, files) {
  return `const C='book-${ver}',F=${JSON.stringify(['./', ...files])};
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const q=e.request;if(q.method!=='GET')return;const nav=q.mode==='navigate';e.respondWith(caches.open(C).then(c=>c.match(q,{ignoreSearch:true}).then(r=>r||(nav?c.match('./index.html'):null)).then(r=>r||fetch(q).then(res=>{if(res.ok&&new URL(q.url).origin===location.origin)c.put(q,res.clone());return res}).catch(()=>nav?c.match('./index.html'):Response.error()))))});`;
}
