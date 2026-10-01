// tools/emblems.mjs — مجموعة شعارات موحّدة مرسومة على شبكة واحدة 24×24 (لا خلط مصادر).
// كل الإحداثيات مطلقة (M/L/C/Z + circle) فتُطبَّع رقمياً: يُقاس الصندوق المحيط الفعلي بالرسم (resvg)،
// ثم يُكبَّر/يُصغَّر كل شعار ليطابق «الحجم البصري» نفسه ويُوسَّط في (12,12) بدقة — دون تغيير سماكة الخط.
import { Resvg } from '@resvg/resvg-js';

const f = (n) => +n.toFixed(2);
// ── أدوات هندسية ──
const P = (...segs) => ({ t: 'p', segs });
const C = (cx, cy, r) => ({ t: 'c', cx, cy, r });
const mapSeg = (s, fn) => { const o = [s[0]]; for (let i = 1; i < s.length; i += 2) { const [x, y] = fn(s[i], s[i + 1]); o.push(x, y); } return o; };
const mapShape = (sh, fn, sc = 1) => sh.t === 'p' ? P(...sh.segs.map((s) => mapSeg(s, fn))) : (() => { const [x, y] = fn(sh.cx, sh.cy); return C(x, y, sh.r * sc); })();
const mirror = (sh) => mapShape(sh, (x, y) => [24 - x, y]);
const rot = (sh, deg, cx = 12, cy = 12) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return mapShape(sh, (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
const poly = (pts, close = true) => P(['M', ...pts[0]], ...pts.slice(1).map((p) => ['L', ...p]), ...(close ? [['Z']] : []));
// قوس دائري بمنحنيات بيزييه (≤90° لكل مقطع)
function arc(cx, cy, r, a0, a1) {
  const out = [], n = Math.ceil(Math.abs(a1 - a0) / (Math.PI / 2)), da = (a1 - a0) / n, k = 4 / 3 * Math.tan(da / 4);
  for (let i = 0; i < n; i++) {
    const t0 = a0 + i * da, t1 = t0 + da;
    const p0 = [cx + r * Math.cos(t0), cy + r * Math.sin(t0)], p3 = [cx + r * Math.cos(t1), cy + r * Math.sin(t1)];
    out.push(['C', p0[0] - k * r * Math.sin(t0), p0[1] + k * r * Math.cos(t0), p3[0] + k * r * Math.sin(t1), p3[1] - k * r * Math.cos(t1), ...p3]);
  }
  return out;
}

// ── التعريفات ──
const D = {};
// 1) قوس البيت النجدي — شعار العلامة
D.arch = [
  P(['M', 5.5, 21], ['L', 5.5, 10.6], ['C', 5.5, 6.9, 8.4, 4.3, 12, 2.6], ['C', 15.6, 4.3, 18.5, 6.9, 18.5, 10.6], ['L', 18.5, 21]),
  P(['M', 9.2, 21], ['L', 9.2, 14.1], ['C', 9.2, 12.4, 10.4, 11.1, 12, 10.2], ['C', 13.6, 11.1, 14.8, 12.4, 14.8, 14.1], ['L', 14.8, 21]),
  P(['M', 3.5, 21], ['L', 20.5, 21]),
];
// 2) نجمة ثمانية (ربع الحزب): اتحاد مربعين — رؤوس داخلية على نصف القطر R·cos45/cos22.5
{
  const R = 9.4, r = R * Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8), pts = [];
  for (let k = 0; k < 16; k++) { const a = -Math.PI / 2 + k * Math.PI / 8, rr = k % 2 ? r : R; pts.push([12 + rr * Math.cos(a), 12 + rr * Math.sin(a)]); }
  D.star8 = [poly(pts), C(12, 12, 2.6)];
}
// 3) نخلة: جذع منحنٍ قليلاً + ثلاثة أزواج سعف متناظرة + أرض
{
  const fr = [P(['M', 12, 9.6], ['C', 10.2, 7.1, 7.2, 6.3, 4.2, 7.3]), P(['M', 12, 9.6], ['C', 9.4, 9.3, 6.7, 10.7, 5.5, 13.5]), P(['M', 12, 9.6], ['C', 11.5, 7.1, 10, 5.1, 7.9, 4.1])];
  D.palm = [P(['M', 12, 21], ['C', 12.6, 17.6, 12.7, 13.6, 12, 9.6]), ...fr, ...fr.map(mirror), P(['M', 8.6, 21], ['L', 15.4, 21])];
}
// 4) هلال ونجمة: تقاطع دائرتين (القضمة أعلى اليمين) + نجمة رباعية داخل القضمة
{
  const c1 = [12, 12], r1 = 8.6, c2 = [15.6, 8.9], r2 = 6.6;
  const dx = c2[0] - c1[0], dy = c2[1] - c1[1], d = Math.hypot(dx, dy), a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(r1 * r1 - a * a);
  const xm = c1[0] + a * dx / d, ym = c1[1] + a * dy / d;
  const pA = [xm + h * dy / d, ym - h * dx / d], pB = [xm - h * dy / d, ym + h * dx / d];
  const ang = (c, p) => Math.atan2(p[1] - c[1], p[0] - c[0]);
  let a0 = ang(c1, pA), a1 = ang(c1, pB); // القوس الخارجي من A إلى B عبر الجهة البعيدة عن c2
  const mid = (x, y) => { const m = (x + y) / 2; return [c1[0] + r1 * Math.cos(m), c1[1] + r1 * Math.sin(m)]; };
  if (Math.hypot(mid(a0, a1)[0] - c2[0], mid(a0, a1)[1] - c2[1]) < r2) a1 += a1 < a0 ? 2 * Math.PI : -2 * Math.PI;
  let b0 = ang(c2, pB), b1 = ang(c2, pA); // القوس الداخلي من B إلى A داخل الدائرة الأولى
  const mid2 = (x, y) => { const m = (x + y) / 2; return [c2[0] + r2 * Math.cos(m), c2[1] + r2 * Math.sin(m)]; };
  if (Math.hypot(mid2(b0, b1)[0] - c1[0], mid2(b0, b1)[1] - c1[1]) > r1) b1 += b1 < b0 ? 2 * Math.PI : -2 * Math.PI;
  const cres = P(['M', ...pA], ...arc(c1[0], c1[1], r1, a0, a1), ...arc(c2[0], c2[1], r2, b0, b1), ['Z']);
  const sp = []; for (let k = 0; k < 8; k++) { const t = -Math.PI / 2 + k * Math.PI / 4, rr = k % 2 ? 0.75 : 2.3; sp.push([16.4 + rr * Math.cos(t), 8.3 + rr * Math.sin(t)]); }
  D.moon = [cres, poly(sp)];
}
// 5) وردة ثمانية البتلات حول قلب دائري
{
  const petal = P(['M', 12, 9.3], ['C', 9.7, 7.9, 9.6, 4.4, 12, 2.6], ['C', 14.4, 4.4, 14.3, 7.9, 12, 9.3], ['Z']);
  D.flower = [...Array.from({ length: 6 }, (_, k) => rot(petal, k * 60)), C(12, 12, 1.9)];
}
// 6) جوهرة مقطوعة
D.gem = [poly([[6.6, 4], [17.4, 4], [21, 9.2], [12, 20.6], [3, 9.2]]), P(['M', 3, 9.2], ['L', 21, 9.2]), P(['M', 9.6, 4], ['L', 8.2, 9.2], ['L', 12, 20.6], ['L', 15.8, 9.2], ['L', 14.4, 4])];
// 7) ريشة: نصل متناظر + قصبة + شُعيرات، مائلة 32°
{
  const blade = P(['M', 12, 2.6], ['C', 8.4, 5.3, 6.8, 9.2, 7.4, 13.4], ['C', 7.8, 16.1, 9.5, 18.2, 12, 19.4], ['C', 14.5, 18.2, 16.2, 16.1, 16.6, 13.4], ['C', 17.2, 9.2, 15.6, 5.3, 12, 2.6], ['Z']);
  const parts = [blade, P(['M', 12, 6.4], ['L', 12, 22]), P(['M', 12, 10.4], ['L', 14.7, 8.7]), P(['M', 12, 13.6], ['L', 9.3, 11.9]), P(['M', 12, 16.6], ['L', 15, 14.7])];
  D.feather = parts.map((s) => rot(s, 32));
}
// 8) تاج
D.crown = [poly([[4.2, 17.4], [3, 7.6], [8.1, 11.6], [12, 5.4], [15.9, 11.6], [21, 7.6], [19.8, 17.4]]), P(['M', 4.6, 20.6], ['L', 19.4, 20.6])];
// 9) غصن: ساق + ثلاثة أزواج أوراق متناظرة تكبر نحو الأسفل
{
  const L1 = P(['M', 12, 8.2], ['C', 9.5, 8, 7.9, 6.6, 7.5, 4.3], ['C', 10, 4.4, 11.7, 5.8, 12, 8.2], ['Z']);
  const L2 = P(['M', 12, 13.6], ['C', 9.1, 13.4, 7.2, 11.6, 6.8, 8.9], ['C', 9.7, 9, 11.6, 10.8, 12, 13.6], ['Z']);
  const L3 = P(['M', 12, 19.1], ['C', 8.9, 18.9, 6.8, 17, 6.3, 14.1], ['C', 9.4, 14.2, 11.5, 16.1, 12, 19.1], ['Z']);
  D.leaf = [P(['M', 12, 21.6], ['L', 12, 3.4]), L1, L2, L3, mirror(L1), mirror(L2), mirror(L3)];
}
// 10) بيت
D.house = [P(['M', 4, 10.6], ['L', 12, 4], ['L', 20, 10.6], ['L', 20, 20], ['C', 20, 20.6, 19.6, 21, 19, 21], ['L', 14.5, 21], ['L', 14.5, 15.2], ['L', 9.5, 15.2], ['L', 9.5, 21], ['L', 5, 21], ['C', 4.4, 21, 4, 20.6, 4, 20], ['Z'])];

// ── التسلسل والقياس ──
const ser = (shapes) => shapes.map((sh) => sh.t === 'c' ? `<circle cx="${f(sh.cx)}" cy="${f(sh.cy)}" r="${f(sh.r)}"/>` : `<path d="${sh.segs.map((s) => s[0] + s.slice(1).map(f).join(' ')).join('')}"/>`).join('');
const SW = 1.5, RES = 480;
function measure(inner) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${RES}" height="${RES}" viewBox="0 0 24 24"><g fill="none" stroke="#000" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round">${inner}</g></svg>`;
  const px = new Resvg(svg).render().pixels; let x0 = RES, y0 = RES, x1 = 0, y1 = 0, ink = 0;
  for (let y = 0; y < RES; y++) for (let x = 0; x < RES; x++) if (px[(y * RES + x) * 4 + 3] > 96) { ink++; if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  const u = 24 / RES; return { x0: x0 * u, y0: y0 * u, x1: (x1 + 1) * u, y1: (y1 + 1) * u, w: (x1 - x0 + 1) * u, h: (y1 - y0 + 1) * u, ink: ink / (RES * RES) };
}
// الحجم البصري: أطول ضلع ≤ MAXD، والمتوسط الهندسي للضلعين = GEO (فالأشكال المربعة لا تبدو أكبر من النحيلة)
const MAXD = 19.6, GEO = 17.4;
export function buildEmblems() {
  const out = {}, report = {};
  for (const [k, shapes] of Object.entries(D)) {
    const m = measure(ser(shapes));
    const s = Math.min(MAXD / Math.max(m.w, m.h), GEO / Math.sqrt(m.w * m.h));
    const cx = (m.x0 + m.x1) / 2, cy = (m.y0 + m.y1) / 2;
    // التحجيم حول مركز الصندوق المرسوم (يشمل سماكة الخط) ثم النقل إلى (12,12)؛ نصف القطر يتحجّم والخط ثابت
    const norm = shapes.map((sh) => mapShape(sh, (x, y) => [12 + (x - cx) * s, 12 + (y - cy) * s], s));
    const svg = ser(norm), m2 = measure(svg);
    out[k] = svg;
    report[k] = { scale: f(s), w: f(m2.w), h: f(m2.h), cx: f((m2.x0 + m2.x1) / 2), cy: f((m2.y0 + m2.y1) / 2), ink: +(m2.ink * 100).toFixed(1) };
  }
  return { svgs: out, report };
}
