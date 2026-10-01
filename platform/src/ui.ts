// ui.ts — نظام التصميم المشترك لصفحات المنصة: «أسود دافئ + ذهب مطفي»، خطوط مستضافة ذاتياً، أيقونات خطية SVG (لا إيموجي).
// كل صفحة = HTML واحد بـCSS حرج مضمّن (لا طلبات حاجبة للعرض) + خطّان woff2 مُقتطعان ومحمّلان مسبقاً.
import { ASSET, ICONS, EMBLEMS } from './assets.gen';

export const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
export const A = (p: string) => ASSET[p] || p;
export const json = (o: any) => JSON.stringify(o).replace(/</g, '\\u003c');

/** جامع أيقونات لكل صفحة: يُضمَّن فقط ما استُخدم كـ<symbol> مرة واحدة، والاستدعاء <use> (HTML أصغر). */
export class Icons {
  used = new Set<string>();
  i(name: string, cls = '') {
    if (!ICONS[name]) name = 'sparkles';
    this.used.add(name);
    return `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  }
  emb(key: string, cls = 'emb') {
    const k = EMBLEMS[key] ? key : 'arch'; this.used.add('e:' + k);
    return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><use href="#e-${k}"/></svg>`;
  }
  sprite() {
    let s = '';
    for (const n of this.used) {
      if (n.startsWith('e:')) { const k = n.slice(2); s += `<symbol id="e-${k}" viewBox="0 0 24 24">${EMBLEMS[k].svg}</symbol>`; }
      else s += `<symbol id="i-${n}" viewBox="0 0 24 24">${ICONS[n]}</symbol>`;
    }
    return `<svg width="0" height="0" style="position:absolute" aria-hidden="true">${s}</svg>`;
  }
}

export const BRAND = { name: 'كتاب البيت', latin: 'GHAIDA · HOME BOOK', tagline: 'قواعد بيتك… بلغة عاملتك، وبصوت تسمعه' };

const FONTS = `@font-face{font-family:Amiri;src:url(${A('/fonts/amiri-700.woff2')}) format("woff2");font-weight:700;font-display:swap;unicode-range:U+0020-007E,U+00A0-00BB,U+0600-06FF,U+200C-200F,U+2013-2026,U+FD3E-FD3F}
@font-face{font-family:Naskh;src:url(${A('/fonts/naskh-var.woff2')}) format("woff2");font-weight:400 700;font-display:swap;unicode-range:U+0020-007E,U+00A0-00D7,U+0600-06FF,U+200C-200F,U+2013-2026,U+2190-2193,U+2713,U+FD3E-FD3F}
@font-face{font-family:Naskh-fb;src:local("Geeza Pro"),local("Segoe UI"),local("Tahoma"),local("Arial");size-adjust:104%;ascent-override:96%;descent-override:42%}`;

// ── رموز التصميم ──
export const CSS = `${FONTS}
:root{color-scheme:light;
--bg:#FBF5F1;--bg2:#F5EAE5;--elev:#FFFFFF;--card:#FFFFFF;--card2:#FFFFFF;
--line:rgba(90,16,48,.09);--line2:rgba(90,16,48,.18);
--plum:#5A1030;--plum2:#3A0A1F;--plum3:#2B0716;--rose:#A3154F;--blush:#FBEAF0;
--gold:#B8924E;--gold-hi:#8A6527;--gold-deep:#C9A86A;--champ:#E9D3A6;--gold-grad:linear-gradient(135deg,#F5E6C4 0%,#E2C68E 50%,#C9A86A 100%);
--ink:#2B1720;--ink2:#4A3039;--muted:#6E5862;--dim:#9A8590;
--ok:#1E7A46;--ok-bg:#E7F4EC;--danger:#B3261E;--danger-bg:#FDEDEB;--warn:#7A4A00;--warn-bg:#FFF4DC;
--r1:10px;--r2:16px;--r3:22px;--r4:28px;
--sh1:0 1px 2px rgba(90,16,48,.05),0 8px 24px -14px rgba(90,16,48,.22);
--sh2:0 30px 70px -30px rgba(58,10,31,.5);
--glow:0 12px 30px -12px rgba(90,16,48,.55);
--fH:Amiri,"Naskh-fb",serif;--fB:Naskh,"Naskh-fb",system-ui,sans-serif;
--wrap:1160px;--gut:clamp(18px,4vw,32px);--sec:clamp(44px,5.5vw,72px);
--ease:cubic-bezier(.2,.7,.2,1)}
*,*:before,*:after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%;scroll-behavior:smooth;scroll-padding-top:84px}
body{margin:0;background:var(--bg);color:var(--ink);font:400 clamp(16px,.35vw + 15px,17.5px)/1.85 var(--fB);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overflow-x:hidden}
img,svg,video{display:block;max-width:100%}
a{color:var(--rose);text-decoration-thickness:1px;text-underline-offset:4px}
button,input,select,textarea{font:inherit;color:inherit}
h1,h2,h3,h4{font-family:var(--fH);font-weight:700;line-height:1.3;margin:0;letter-spacing:0;text-wrap:balance}
p{margin:0;text-wrap:pretty}
::selection{background:rgba(163,21,79,.18)}
:focus-visible{outline:2px solid var(--rose);outline-offset:3px;border-radius:6px}
.i{width:1.25em;height:1.25em;flex:none;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.emb{fill:none;stroke:currentColor;stroke-width:1.15;stroke-linecap:round;stroke-linejoin:round}
.wrap{max-width:var(--wrap);margin-inline:auto;padding-inline:var(--gut)}
.sr{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.skip{position:absolute;inset-inline-start:12px;top:-60px;z-index:100;background:var(--plum);color:#fff;padding:10px 16px;border-radius:10px;font-weight:700}
.skip:focus{top:12px}
.gold{background:var(--gold-grad);-webkit-background-clip:text;background-clip:text;color:transparent}
.muted{color:var(--muted)}
.eyebrow{display:inline-flex;align-items:center;gap:10px;color:var(--rose);font-size:.86rem;font-weight:600;letter-spacing:.02em}
.eyebrow:before,.eyebrow:after{content:"";width:24px;height:1px;background:linear-gradient(90deg,transparent,currentColor)}
.eyebrow:after{transform:scaleX(-1)}
.orn{display:flex;align-items:center;justify-content:center;gap:10px;color:var(--gold);margin:14px auto 0}
.orn:before,.orn:after{content:"";height:1px;width:min(80px,18vw);background:linear-gradient(90deg,transparent,var(--gold-deep))}
.orn:after{transform:scaleX(-1)}
.orn .i{width:14px;height:14px;stroke-width:1.4}

/* أزرار */
.btn{--h:54px;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:var(--h);padding:0 28px;border-radius:999px;border:1px solid transparent;cursor:pointer;font-weight:700;font-size:1.02rem;text-decoration:none;line-height:1;white-space:nowrap;transition:transform .2s var(--ease),box-shadow .25s var(--ease),background-color .2s,border-color .2s,color .2s;-webkit-tap-highlight-color:transparent}
.btn .i{width:1.15em;height:1.15em}
.btn:active{transform:translateY(1px) scale(.99)}
.btn-gold{background:var(--plum);color:#FFF6EC;box-shadow:var(--glow)}
.btn-gold:hover{background:#6B1439;transform:translateY(-1px)}
.btn-champ{background:var(--gold-grad);color:var(--plum2);box-shadow:0 12px 30px -12px rgba(0,0,0,.4)}
.btn-champ:hover{transform:translateY(-1px)}
.btn-line{background:#fff;color:var(--plum);border-color:var(--line2)}
.btn-line:hover{border-color:var(--plum)}
.btn-ghost-l{background:transparent;color:#F5E6C4;border-color:rgba(233,211,166,.5)}
.btn-ghost-l:hover{border-color:#F5E6C4;background:rgba(255,255,255,.05)}
.btn-wa{background:#1f9d55;color:#fff}
.btn-sm{--h:42px;padding:0 18px;font-size:.92rem}
.btn-block{width:100%}
.btn:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none}

/* بطاقة */
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r3);padding:clamp(20px,2.6vw,28px);box-shadow:var(--sh1)}
.chip{display:inline-flex;align-items:center;gap:8px;padding:6px 14px;border-radius:999px;border:1px solid var(--line);background:#fff;font-size:.9rem;color:var(--ink2)}
.chip.on{border-color:var(--plum);color:var(--plum);background:var(--blush)}
.chip.soon{color:var(--dim)}

/* الرأس */
.hdr{position:sticky;top:0;z-index:40;background:rgba(251,245,241,.86);-webkit-backdrop-filter:saturate(1.3) blur(14px);backdrop-filter:saturate(1.3) blur(14px);border-bottom:1px solid var(--line)}
.hdr .wrap{display:flex;align-items:center;gap:20px;height:66px}
.logo{display:flex;align-items:center;gap:12px;text-decoration:none;color:var(--ink);flex:none}
.logo .mk{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:#EBD3A0;background:linear-gradient(145deg,#7A1844,#3A0A1F);box-shadow:inset 0 0 0 1px rgba(233,211,166,.35)}
.logo .mk .emb{width:26px;height:26px}
.logo b{display:block;font:700 1.3rem/1.1 var(--fH);color:var(--plum)}
.logo small{display:block;font:600 .6rem/1 var(--fB);letter-spacing:.22em;color:var(--gold);margin-top:5px;direction:ltr;text-align:right}
.nav{display:flex;gap:4px;margin-inline-start:auto}
.nav a{color:var(--ink2);text-decoration:none;font-size:.95rem;padding:8px 14px;border-radius:999px;transition:color .2s,background .2s}
.nav a:hover{color:var(--plum);background:var(--blush)}
.hdr .btn{margin-inline-start:6px}
@media(max-width:900px){.nav{display:none}.hdr .btn{margin-inline-start:auto}}
@media(max-width:380px){.logo small{display:none}.hdr .btn{padding:0 14px}}

/* أقسام */
.sec{padding-block:var(--sec);position:relative}
.sec.alt{background:#fff}
.sec.alt:before{content:none}
.sh{text-align:center;max-width:740px;margin:0 auto clamp(24px,3.5vw,40px)}
.sh h2{font-size:clamp(1.8rem,3.4vw,2.6rem);margin-top:10px;color:var(--plum)}
.sh p{color:var(--muted);margin-top:12px;font-size:1.05rem}
.grid{display:grid;gap:clamp(14px,1.8vw,20px)}
.g2{grid-template-columns:repeat(2,minmax(0,1fr))}.g3{grid-template-columns:repeat(3,minmax(0,1fr))}.g4{grid-template-columns:repeat(4,minmax(0,1fr))}
@media(max-width:980px){.g4{grid-template-columns:repeat(2,minmax(0,1fr))}.g3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:640px){.g2,.g3,.g4{grid-template-columns:1fr}}

/* حقول */
.fld{display:block;margin-top:18px}
.fld>span{display:block;font-weight:600;font-size:.95rem;color:var(--ink2);margin-bottom:8px}
.in{width:100%;min-height:54px;border-radius:14px;border:1px solid var(--line2);background:#fff;padding:0 16px;font-size:1.02rem;color:var(--ink);transition:border-color .2s,box-shadow .2s}
.in::placeholder{color:var(--dim)}
.in:focus{outline:0;border-color:var(--rose);box-shadow:0 0 0 4px rgba(163,21,79,.12)}
select.in{appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--plum) 50%),linear-gradient(135deg,var(--plum) 50%,transparent 50%);background-position:18px 24px,24px 24px;background-size:6px 6px;background-repeat:no-repeat}
input[type=time].in{direction:ltr;text-align:center;font-variant-numeric:tabular-nums}
.note{font-size:.88rem;color:var(--muted);margin-top:8px}
.alert{display:flex;gap:10px;align-items:flex-start;border-radius:14px;padding:12px 14px;font-size:.95rem;border:1px solid}
.alert .i{margin-top:4px}
.alert.ok{background:var(--ok-bg);color:var(--ok);border-color:rgba(30,122,70,.2)}
.alert.bad{background:var(--danger-bg);color:var(--danger);border-color:rgba(179,38,30,.2)}
.alert.info{background:var(--blush);color:var(--ink2);border-color:var(--line)}

/* التذييل */
.ftr{padding:48px 0 calc(40px + env(safe-area-inset-bottom));color:#D9C2CC;font-size:.92rem;background:var(--plum3)}
.ftr .logo b{color:#fff}.ftr .logo small{color:var(--champ)}
.ftr .wrap{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:28px}
.ftr h4{font:600 .95rem var(--fB);color:#fff;margin-bottom:10px}
.ftr a{color:#D9C2CC;text-decoration:none;display:block;padding:3px 0}.ftr a:hover{color:var(--champ)}
.ftr .cp{grid-column:1/-1;border-top:1px solid rgba(233,211,166,.15);padding-top:18px;margin-top:6px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:.84rem;color:#B497A4}
@media(max-width:760px){.ftr .wrap{grid-template-columns:1fr 1fr}.ftr .about{grid-column:1/-1}}

/* حركة دخول خفيفة (بلا JS حاجب — IntersectionObserver اختياري) */
.rv{opacity:1}
@media (prefers-reduced-motion:no-preference){.js .rv{opacity:0;transform:translateY(14px);transition:opacity .7s var(--ease),transform .7s var(--ease)}.js .rv.shown{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;

export type HeadOpts = { title: string; desc: string; path: string; origin: string; index?: boolean; css?: string; jsonld?: any[]; preloadHero?: boolean; ogType?: string };

export function head(o: HeadOpts) {
  const url = o.origin + o.path;
  const og = o.origin + A('/brand/og.jpg');
  const ld = (o.jsonld || []).map((x) => `<script type="application/ld+json">${json(x)}</script>`).join('');
  const heroPre = o.preloadHero
    ? `<link rel="preload" as="image" type="image/avif" imagesrcset="${A('/img/cover-300.avif')} 300w,${A('/img/cover-600.avif')} 600w" imagesizes="(max-width:700px) 230px,290px" fetchpriority="high">`
    : '';
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<meta name="robots" content="${o.index === false ? 'noindex,nofollow' : 'index,follow,max-image-preview:large,max-snippet:-1'}">
<link rel="canonical" href="${esc(url)}">
<link rel="alternate" hreflang="ar-SA" href="${esc(url)}"><link rel="alternate" hreflang="x-default" href="${esc(url)}">
<meta name="theme-color" content="#FBF5F1"><meta name="color-scheme" content="light">
<meta name="format-detection" content="telephone=no">
<meta name="application-name" content="${BRAND.name}"><meta name="apple-mobile-web-app-title" content="${BRAND.name}">
<link rel="icon" href="${A('/favicon.ico')}" sizes="16x16 32x32 48x48"><link rel="icon" href="${A('/brand/icon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${A('/brand/apple-touch-icon.png')}" sizes="180x180"><link rel="manifest" href="/manifest.webmanifest">
<meta property="og:type" content="${o.ogType || 'website'}"><meta property="og:site_name" content="${BRAND.name}"><meta property="og:locale" content="ar_SA">
<meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.desc)}"><meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(og)}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:alt" content="${esc(BRAND.name + ' — ' + BRAND.tagline)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(o.title)}"><meta name="twitter:description" content="${esc(o.desc)}"><meta name="twitter:image" content="${esc(og)}">
<link rel="preload" href="${A('/fonts/amiri-700.woff2')}" as="font" type="font/woff2" crossorigin><link rel="preload" href="${A('/fonts/naskh-var.woff2')}" as="font" type="font/woff2" crossorigin>
${heroPre}<style>${CSS}${o.css || ''}</style>${ld}
<script>document.documentElement.classList.add('js')</script></head>`;
}

export function header(ic: Icons, { nav = true, cta = true } = {}) {
  return `<a class="skip" href="#main">تخطّي إلى المحتوى</a><header class="hdr"><div class="wrap">
<a class="logo" href="/" aria-label="${BRAND.name} — الرئيسية"><span class="mk">${ic.emb('arch')}</span><span><b>${BRAND.name}</b><small>${BRAND.latin}</small></span></a>
${nav ? `<nav class="nav" aria-label="القائمة"><a href="/#features">المزايا</a><a href="/#sample">العيّنة</a><a href="/#how">كيف يعمل</a><a href="/#plans">الباقات</a><a href="/#faq">الأسئلة</a></nav>` : '<span style="margin-inline-start:auto"></span>'}
${cta ? `<a class="btn btn-gold btn-sm" href="/order">اطلبي كتابك</a>` : ''}</div></header>`;
}

export function footer(ic: Icons, wa = '') {
  const y = new Date().getUTCFullYear();
  return `<footer class="ftr"><div class="wrap">
<div class="about"><a class="logo" href="/" style="margin-bottom:12px"><span class="mk">${ic.emb('arch')}</span><span><b>${BRAND.name}</b><small>${BRAND.latin}</small></span></a>
<p>كتاب تفاعلي فاخر يُصنع لكل بيت: قواعدكم وجدولكم بلغة عاملتكم وبصوتها — يعمل على أي جوال حتى بدون إنترنت.</p></div>
<div><h4>الكتاب</h4><a href="/#features">المزايا</a><a href="/#sample">عيّنة مجانية</a><a href="/#plans">الباقات</a><a href="/order">اطلبي كتابك</a></div>
<div><h4>المساعدة</h4><a href="/#faq">الأسئلة الشائعة</a><a href="/privacy">سياسة الخصوصية</a><a href="/terms">الشروط والترخيص</a>${wa ? `<a href="https://wa.me/${esc(wa)}" rel="noopener">واتساب</a>` : ''}</div>
<div class="cp"><span>© ${y} ${BRAND.name}. جميع الحقوق محفوظة — كل نسخة مرخّصة لبيت واحد.</span><span>صُنع بعناية في المملكة العربية السعودية</span></div>
</div></footer>`;
}

/** إظهار تدريجي خفيف (≈300 بايت) — لا يحجب العرض، ويتجاهل من يفضّل تقليل الحركة. */
export const REVEAL_JS = `(function(){var e=document.querySelectorAll('.rv');if(!('IntersectionObserver'in window)){e.forEach(function(x){x.classList.add('shown')});return}var o=new IntersectionObserver(function(a){a.forEach(function(x){if(x.isIntersecting){x.target.classList.add('shown');o.unobserve(x.target)}})},{rootMargin:'0px 0px -8% 0px'});e.forEach(function(x){o.observe(x)})})();`;

export function page(o: HeadOpts & { body: string; ic: Icons; wa?: string; nav?: boolean; cta?: boolean; scripts?: string; foot?: boolean }) {
  return head(o) + `<body>${header(o.ic, { nav: o.nav !== false, cta: o.cta !== false })}<main id="main">${o.body}</main>${o.foot === false ? '' : footer(o.ic, o.wa)}${o.ic.sprite()}<script>${REVEAL_JS}${o.scripts || ''}</script></body></html>`;
}
