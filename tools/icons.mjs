// tools/icons.mjs — يولّد كل الأصول البصرية من مصدر واحد (لا إيموجي في أي واجهة):
//   book/icons/sprite.json     ← اسم → مسارات SVG (Lucide ISC + أيقونات مخصّصة) — يُضمَّن منها فقط ما يُستخدم
//   book/icons/emblems.json    ← شعارات الكتاب التي تختارها المشترية (key → {ar, svg})
//   platform/packs/emblems/*.png ← أيقونات الشاشة الرئيسية (180/512، قابلة للقص maskable) لكل شعار
//   platform/public/brand/*    ← شعار الموقع، favicon، apple-touch-icon، أيقونات PWA، صورة المشاركة OG
//   platform/public/img/*      ← صورة الواجهة بصيغ AVIF/WebP/JPEG وبعدة مقاسات (srcset)
// التشغيل: cd tools && npm i && node icons.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { execFileSync } from 'node:child_process';
import { buildEmblems } from './emblems.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const LUCIDE = path.join(HERE, 'node_modules/lucide-static/icons');
const SIMPLE = path.join(HERE, 'node_modules/simple-icons/icons');
const w = (p, d) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, d); };

// ── 1) أيقونات خطية ──
const inner = (svg) => svg.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s*\n\s*/g, '').replace(/\s+\/>/g, '/>').trim();
const CUSTOM = {
  // قوس نجدي (باب البيت) — شعار العلامة
  arch: '<path d="M5.5 21V10.6C5.5 6.9 8.4 4.3 12 2.6c3.6 1.7 6.5 4.3 6.5 8V21"/><path d="M9.2 21v-6.9c0-1.7 1.2-3 2.8-3.9 1.6.9 2.8 2.2 2.8 3.9V21"/><path d="M3.5 21h17"/>',
  // نجمة ثمانية (هندسة عربية)
  star8: '<path d="M12 3.2l2.6 2.7h3.5v3.5l2.7 2.6-2.7 2.6v3.5h-3.5L12 20.8l-2.6-2.7H5.9v-3.5L3.2 12l2.7-2.6V5.9h3.5z"/><circle cx="12" cy="12" r="2.4"/>',
  // سماعة/تشغيل
  play: '<path d="M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.3-7.2a.8.8 0 0 0 0-1.4L8.2 4.1A.8.8 0 0 0 7 4.8z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor" stroke="none"/>',
  // واتساب (Simple Icons CC0 — مسار مملوء)
  whatsapp: null,
};
const UI = ['house', 'book-open', 'calendar-days', 'messages-square', 'siren', 'message-circle', 'volume-2', 'arrow-left', 'arrow-right', 'chevron-left', 'chevron-right', 'chevron-down',
  'check', 'x', 'info', 'smartphone', 'lock-keyhole', 'sun', 'moon', 'sun-moon', 'a-arrow-up', 'a-arrow-down', 'phone', 'phone-call', 'download', 'copy', 'share-2', 'qr-code', 'shield-check',
  'wifi-off', 'languages', 'circle-check', 'circle-x', 'triangle-alert', 'octagon-alert', 'badge-check', 'receipt', 'upload', 'clock', 'hourglass', 'sparkles', 'users-round', 'user-round',
  'heart-handshake', 'scale', 'list-checks', 'plus', 'minus', 'trash-2', 'search', 'link', 'external-link', 'file-down', 'eye', 'ban', 'refresh-cw', 'log-in', 'mic', 'headphones', 'gem', 'crown',
  'feather', 'leaf', 'flower-2', 'tree-palm', 'moon-star', 'star', 'hand', 'shield', 'zap', 'gauge', 'monitor-smartphone', 'printer', 'mail', 'map-pin', 'banknote', 'landmark', 'party-popper', 'award', 'quote', 'briefcase-business', 'bed'];
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'book/icons/map.json'), 'utf8'));
const names = new Set([...UI, ...Object.entries(MAP).filter(([k, v]) => !k.startsWith('_') && !v.startsWith('#')).map(([, v]) => v)]);
const sprite = {};
for (const n of [...names].sort()) {
  const f = path.join(LUCIDE, n + '.svg'); if (!fs.existsSync(f)) throw new Error('lucide icon missing: ' + n);
  sprite[n] = inner(fs.readFileSync(f, 'utf8'));
}
for (const [k, v] of Object.entries(CUSTOM)) if (v) sprite[k] = v;
const wa = fs.readFileSync(path.join(SIMPLE, 'whatsapp.svg'), 'utf8').match(/<path d="([^"]+)"/)[1];
sprite.whatsapp = `<path d="${wa}" fill="currentColor" stroke="none"/>`;
w(path.join(ROOT, 'book/icons/sprite.json'), JSON.stringify(sprite));
console.log('sprite:', Object.keys(sprite).length, 'icons', (JSON.stringify(sprite).length / 1024).toFixed(1) + 'KB');

// ── 2) شعارات الكتاب ──
const EMB = { arch: 'قوس البيت', star8: 'نجمة', palm: 'نخلة', moon: 'هلال', flower: 'زهرة', gem: 'جوهرة', feather: 'ريشة', crown: 'تاج', leaf: 'غصن', house: 'بيت' };
// مجموعة موحّدة مرسومة ومطبَّعة رقمياً (tools/emblems.mjs): نفس الشبكة والحجم البصري والمركز وسماكة الخط
const EM = buildEmblems();
console.table(EM.report);
const emblems = {};
for (const [k, ar] of Object.entries(EMB)) emblems[k] = { ar, svg: EM.svgs[k] };
CUSTOM.arch = EM.svgs.arch; sprite.arch = EM.svgs.arch;
// شعار المنصة الرسمي (منفصل عن شعارات الكتب التي تختارها المشترية)
const MARK = EM.svgs.brand; sprite.brand = MARK;
w(path.join(ROOT, 'book/icons/sprite.json'), JSON.stringify(sprite));
w(path.join(ROOT, 'book/icons/emblems.json'), JSON.stringify(emblems, null, 1));

// ── 3) رسم PNG ──
const FONTS = ['Amiri-Bold.ttf', 'Amiri-Regular.ttf', 'NotoNaskhArabic-VF.ttf'].map((f) => path.join(HERE, 'src/fonts', f));
const png = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width }, font: { fontFiles: FONTS, loadSystemFonts: false, defaultFontFamily: 'Amiri' } }).render().asPng();
// هوية غيداء: برقوقي عميق + ذهب شمباني
const GOLD = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F7E9C8"/><stop offset=".5" stop-color="#E2C68E"/><stop offset="1" stop-color="#C29A55"/></linearGradient>`;
const BG = `<radialGradient id="b" cx=".5" cy=".18" r=".95"><stop offset="0" stop-color="#8A1A4A"/><stop offset=".55" stop-color="#5A1030"/><stop offset="1" stop-color="#2E0818"/></radialGradient>`;
function appIcon(svgInner, { maskable = true } = {}) {
  // 512×512: خلفية سوداء دافئة + إطار ذهبي مزدوج + الشعار (داخل منطقة الأمان 80% للأيقونات القابلة للقص)
  const s = maskable ? 0.5 : 0.56, off = (512 - 24 * (512 * s / 24)) / 2, sc = (512 * s) / 24;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs>${GOLD}${BG}</defs>
<rect width="512" height="512" fill="url(#b)"/>
<rect x="${maskable ? 70 : 34}" y="${maskable ? 70 : 34}" width="${maskable ? 372 : 444}" height="${maskable ? 372 : 444}" rx="${maskable ? 64 : 84}" fill="none" stroke="url(#g)" stroke-width="5"/>
<rect x="${maskable ? 84 : 48}" y="${maskable ? 84 : 48}" width="${maskable ? 344 : 416}" height="${maskable ? 344 : 416}" rx="${maskable ? 54 : 72}" fill="none" stroke="url(#g)" stroke-opacity=".45" stroke-width="2"/>
<g transform="translate(${off} ${off}) scale(${sc})" fill="none" stroke="url(#g)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${svgInner}</g></svg>`;
}
for (const [k, e] of Object.entries(emblems)) {
  const svg = appIcon(e.svg);
  w(path.join(ROOT, `book/icons/emblems/${k}-512.png`), png(svg, 512));
  w(path.join(ROOT, `book/icons/emblems/${k}-180.png`), png(appIcon(e.svg, { maskable: false }), 180));
  w(path.join(ROOT, `book/icons/emblems/${k}.svg`), svg);
}
console.log('emblems:', Object.keys(emblems).join(' '));

// ── 4) هوية الموقع ──
const PUB = path.join(ROOT, 'platform/public');
const brandSvg = appIcon(MARK, { maskable: false });
w(path.join(PUB, 'brand/icon.svg'), brandSvg);
w(path.join(PUB, 'brand/apple-touch-icon.png'), png(brandSvg, 180));
w(path.join(PUB, 'brand/icon-192.png'), png(brandSvg, 192));
w(path.join(PUB, 'brand/icon-512.png'), png(brandSvg, 512));
w(path.join(PUB, 'brand/icon-maskable-512.png'), png(appIcon(MARK), 512));
// favicon صغير: بلا إطار، شعار أكبر وخط أثقل ليُقرأ بوضوح على 16–48px
const favSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs>${GOLD}${BG}</defs><rect width="64" height="64" rx="14" fill="url(#b)"/><g transform="translate(6.4 6.4) scale(2.133)" fill="none" stroke="url(#g)" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${MARK}</g></svg>`;
w(path.join(PUB, 'brand/favicon.svg'), favSvg);
w(path.join(PUB, 'brand/favicon-32.png'), png(favSvg, 32));
w(path.join(PUB, 'brand/favicon-48.png'), png(favSvg, 48));
// favicon.ico (PNG داخل ICO — مدعوم في كل المتصفحات الحديثة)
{
  const imgs = [16, 32, 48].map((s) => png(favSvg, s));
  const head = Buffer.alloc(6 + 16 * imgs.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(imgs.length, 4);
  let off = head.length;
  imgs.forEach((b, i) => { const s = [16, 32, 48][i]; const o = 6 + 16 * i; head[o] = s; head[o + 1] = s; head[o + 2] = 0; head[o + 3] = 0; head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6); head.writeUInt32LE(b.length, o + 8); head.writeUInt32LE(off, o + 12); off += b.length; });
  w(path.join(PUB, 'favicon.ico'), Buffer.concat([head, ...imgs]));
}
// شعار نصّي (للهيدر يُرسم بـCSS؛ هذا للمشاركة/الوثائق)
const markInline = `<g fill="none" stroke="url(#g)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${MARK}</g>`;
w(path.join(PUB, 'brand/logo.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><defs>${GOLD}</defs>${markInline}</svg>`);

// ── 5) صورة الواجهة: AVIF/WebP/JPEG بعدة مقاسات (Python/Pillow — أسرع وأجود من أدوات node هنا) ──
execFileSync('python3', [path.join(HERE, 'images.py')], { stdio: 'inherit' });

// ── 6) صورة المشاركة OG 1200×630: برقوقي + لقطة حقيقية للكتاب داخل جوال + العنوان بخط أميري ──
const shot = fs.readFileSync(path.join(HERE, 'src/shots/cover.png')).toString('base64');
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs>${GOLD}
<radialGradient id="ob" cx=".78" cy=".1" r="1.1"><stop offset="0" stop-color="#8A1A4A"/><stop offset=".5" stop-color="#5A1030"/><stop offset="1" stop-color="#2B0716"/></radialGradient>
<clipPath id="sc"><rect x="118" y="58" width="246" height="532" rx="34"/></clipPath><filter id="sh" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="24" stdDeviation="26" flood-color="#000" flood-opacity=".45"/></filter></defs>
<rect width="1200" height="630" fill="url(#ob)"/>
<rect x="18" y="18" width="1164" height="594" rx="18" fill="none" stroke="url(#g)" stroke-opacity=".5" stroke-width="2"/>
<g filter="url(#sh)"><rect x="106" y="46" width="270" height="556" rx="44" fill="#1A0710"/></g>
<image href="data:image/png;base64,${shot}" x="118" y="58" width="246" height="532" preserveAspectRatio="xMidYMin slice" clip-path="url(#sc)"/>
<g transform="translate(1046 86) scale(2.9)" fill="none" stroke="url(#g)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${MARK}</g>
<text x="1110" y="300" text-anchor="end" direction="rtl" font-family="Amiri" font-weight="700" font-size="100" fill="#FFFFFF">كتاب البيت</text>
<text x="1110" y="372" text-anchor="end" direction="rtl" font-family="Amiri" font-size="40" fill="#F3E2BD">قواعد بيتك… بلغة عاملتك، وبصوت تسمعه</text>
<text x="1110" y="430" text-anchor="end" direction="rtl" font-family="Noto Naskh Arabic" font-size="27" fill="#E9D3A6" fill-opacity=".85">نسخة باسم بيتك · تعمل بلا إنترنت · آيفون وأندرويد</text>
<text x="1110" y="548" text-anchor="end" font-family="Amiri" font-size="22" letter-spacing="6" fill="#E2C68E">GHAIDA · HOME BOOK</text></svg>`;
const ogPng = png(og, 1200);
w(path.join(ROOT, 'tools/out/og.png'), ogPng);
execFileSync('python3', ['-c', `from PIL import Image;im=Image.open('${path.join(ROOT, 'tools/out/og.png')}').convert('RGB');im.save('${path.join(PUB, 'brand/og.jpg')}',quality=86,optimize=True,progressive=True)`]);
console.log('brand + og done');

// ── 7) بصمات المحتوى (cache-busting) + وحدة TS للمنصة ──
// كل أصل ثابت يُخدم باسم ثابت + ?v=<hash> وترويسة immutable سنة كاملة (platform/public/_headers)
import crypto from 'node:crypto';
const hash = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 10);
const files = {};
for (const dir of ['fonts', 'img', 'brand']) for (const f of fs.readdirSync(path.join(PUB, dir))) if (!/\.(json|txt)$/.test(f)) files[`/${dir}/${f}`] = `/${dir}/${f}?v=${hash(path.join(PUB, dir, f))}`;
files['/favicon.ico'] = '/favicon.ico?v=' + hash(path.join(PUB, 'favicon.ico'));
const hero = JSON.parse(fs.readFileSync(path.join(PUB, 'img/shots.json'), 'utf8'));
const usedUI = sprite;
w(path.join(ROOT, 'platform/src/assets.gen.ts'), `// مولَّد بواسطة tools/icons.mjs — لا تعدّله يدوياً\nexport const ASSET: Record<string, string> = ${JSON.stringify(files, null, 1)};\nexport const SHOTS: Record<string, { w: number; h: number }> = ${JSON.stringify(hero)};\nexport const ICONS: Record<string, string> = ${JSON.stringify(usedUI)};\nexport const EMBLEMS: Record<string, { ar: string; svg: string }> = ${JSON.stringify(emblems)};\n`);
console.log('assets.gen.ts:', Object.keys(files).length, 'files');
// خريطة الإيموجي → أيقونة متاحة أيضاً للمنصة (كتالوج القواعد في معالج الطلب)
fs.appendFileSync(path.join(ROOT, 'platform/src/assets.gen.ts'), `export const EMOJI: Record<string, string> = ${JSON.stringify(Object.fromEntries(Object.entries(MAP).filter(([k]) => !k.startsWith('_'))))};\n`);
// أيقونات الشعارات تُخدم ثابتة للكتب المستضافة (/b/<token>/<lang>/icon-*.png → /emblems/<k>-*.png)
for (const k of Object.keys(emblems)) for (const s of [180, 512]) fs.copyFileSync(path.join(ROOT, `book/icons/emblems/${k}-${s}.png`), (fs.mkdirSync(path.join(PUB, 'emblems'), { recursive: true }), path.join(PUB, `emblems/${k}-${s}.png`)));
