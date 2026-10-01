// صفحات المنصة — HTML من الخادم بلا إطار عمل. الهوية: «أسود دافئ + ذهب مطفي» (docs/DESIGN_SYSTEM.md).
// قواعد صارمة: لا إيموجي في الواجهة (أيقونات خطية SVG فقط) · CSS حرج مضمّن · خطوط مستضافة ذاتياً · كل صفحة < 60KB مضغوطة.
import { A, BRAND, Icons, esc, json, page } from './ui';
import { SHOTS, EMBLEMS, EMOJI } from './assets.gen';
import QR_LIB from './qrlib';

const DESC = 'كتاب تفاعلي فاخر يُصنع باسم بيتك: قواعد بيتك وجدول عاملتك وسلامة أطفالك وآداب الضيافة — بلغتها الأم وبالعربي، وبصوت لكل جملة. يعمل على أي جوال حتى بدون إنترنت.';
const LANGS_SOON = [['Tagalog', 'الفلبينية'], ['বাংলা', 'البنغالية'], ['English', 'الإنجليزية'], ['Afaan Oromoo', 'الأورومية'], ['සිංහල', 'السنهالية'], ['Indonesia', 'الإندونيسية'], ['اردو', 'الأردية']];

const FAQ: [string, string][] = [
  ['هل يحتاج تحميل تطبيق من المتجر؟', 'لا. هو كتاب يُفتح من رابط خاص أو ملف واحد، ويمكن وضعه على شاشة جوالها بضغطتين كأي تطبيق — والكتاب نفسه يشرح لها الطريقة بالصوت بلغتها.'],
  ['جوالها قديم، هل يعمل؟', 'نعم. صُمّم ليكون خفيفاً جداً: يفتح في أقل من ثانيتين على الجوالات البطيئة، والصوت يُحمَّل فصلاً فصلاً فلا يثقل الذاكرة. يدعم آيفون (iOS 12 فأحدث) وأندرويد (كروم 70 فأحدث).'],
  ['عاملتي عندي من سنين، هل يفيدني؟', 'نعم — أكثر من يستفيد منه البيوت التي فيها عاملة منذ مدة: «قواعد بيتك» و«ردودي» و«قولي لعاملتك» تُستخدم كل يوم، وتنهي تكرار الشرح وسوء الفهم.'],
  ['هل يعمل بدون إنترنت؟', 'نعم. بعد أول فتح يبقى محفوظاً على جوالها ويعمل دائماً بلا إنترنت، ومعه ملف واحد احتياطي يمكن إرساله على واتساب.'],
  ['هل يمكن أن تنسخه أو تبيعه لغيرها؟', 'كل نسخة مقفلة برمز خاص ببيتك ومشفّرة، وتحمل بصمة غير مرئية تكشف مصدرها إن نُشرت، ويمكن إيقاف الرابط في أي وقت. صفحة الطوارئ فقط تبقى مفتوحة دائماً لسلامتها.'],
  ['غيّرت العاملة، هل أشتري من جديد؟', 'باقة «البيت الكبير» تشمل إعادة إصدار مجانية بلغة العاملة الجديدة وبنفس قواعد بيتك. وفي الباقة الأساسية نعيد الإصدار بسعر رمزي.'],
  ['هل الترجمة دقيقة؟', 'كل جملة مرّت بترجمة متخصصة ثم مراجعة لغوية مستقلة تبحث تحديداً عن قلب المعنى، خاصة في فصل السلامة. ونعمل على مراجعة بشرية من ناطقات أصليات لكل لغة.'],
  ['كيف أدفع ومتى يصلني؟', 'تحويل بنكي ثم ترفعين صورة الإيصال في صفحة طلبك؛ يُقرأ آلياً ويُراجع، ثم يصلك رابط الكتاب ورمزه في نفس الصفحة.'],
];

// ═══════════════════════ صفحة البيع ═══════════════════════
export function landingPage({ plans, wa, origin }: any) {
  const ic = new Icons();
  // لقطة حقيقية من الكتاب داخل إطار جوال (AVIF → WebP → JPEG)
  const shot = (n: string, alt: string, eager = false) => `<picture><source type="image/avif" srcset="${A(`/img/${n}-300.avif`)} 300w,${A(`/img/${n}-600.avif`)} 600w" sizes="(max-width:700px) 230px,290px"><source type="image/webp" srcset="${A(`/img/${n}-300.webp`)} 300w,${A(`/img/${n}-600.webp`)} 600w" sizes="(max-width:700px) 230px,290px"><img src="${A(`/img/${n}-600.jpg`)}" width="${SHOTS[n]?.w || 600}" height="${SHOTS[n]?.h || 1300}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></picture>`;
  const device = (n: string, alt: string, cls = '', eager = false) => `<figure class="dev ${cls}"><span class="dev-scr">${shot(n, alt, eager)}</span></figure>`;
  const css = `
/* الواجهة: برقوقي عميق + لقطات حقيقية من الكتاب داخل جوالات */
.hero{position:relative;overflow:hidden;isolation:isolate;color:#F5E9EE;background:radial-gradient(90% 120% at 85% 0%,#8A1A4A 0%,#5A1030 45%,#2B0716 100%)}
.hero:before{content:"";position:absolute;inset:14px;border:1px solid rgba(233,211,166,.22);border-radius:28px;pointer-events:none;z-index:-1}
.hero .wrap{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(24px,5vw,64px);align-items:center;padding-block:clamp(44px,7vw,88px)}
.hero .eyebrow{color:var(--champ)}
.hero h1{font-size:clamp(2.15rem,4.6vw,3.6rem);line-height:1.25;margin-top:14px;color:#fff}
.hero h1 em{font-style:normal;color:var(--champ)}
.hero .lead{font-size:clamp(1.03rem,1.25vw,1.18rem);color:#EAD7DF;margin-top:18px;max-width:540px}
.hero .ctas{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}
.trust{display:flex;flex-wrap:wrap;gap:10px 22px;margin-top:26px;color:#E2CCD5;font-size:.93rem}
.trust span{display:inline-flex;align-items:center;gap:8px}.trust .i{color:var(--champ)}
.stage{position:relative;height:clamp(440px,46vw,580px)}
.dev{position:absolute;margin:0;width:clamp(200px,20vw,272px);aspect-ratio:375/812;border-radius:40px;padding:9px;background:linear-gradient(150deg,#3a1526,#14050b);box-shadow:0 40px 80px -30px rgba(0,0,0,.7),0 0 0 1px rgba(233,211,166,.25),inset 0 0 0 1px rgba(255,255,255,.06)}
.dev:before{content:"";position:absolute;top:16px;left:50%;width:30%;height:18px;transform:translateX(-50%);background:#0b0306;border-radius:12px;z-index:2}
.dev-scr{display:block;width:100%;height:100%;border-radius:32px;overflow:hidden;background:#5A1030}
.dev-scr img{width:100%;height:100%;object-fit:cover;object-position:top}
.stage .d1{inset-inline-start:4%;top:0;z-index:2}
.stage .d2{inset-inline-start:42%;top:9%;transform:rotate(-4deg);opacity:.96}
.badge{position:absolute;z-index:3;display:flex;align-items:center;gap:10px;background:#fff;color:var(--plum);border-radius:16px;padding:10px 14px;font-size:.88rem;font-weight:600;box-shadow:var(--sh2)}
.badge .i{color:var(--rose)}
.badge.b1{inset-inline-end:2%;bottom:16%}.badge.b2{inset-inline-start:0;bottom:4%}
@media(max-width:860px){.hero .wrap{grid-template-columns:1fr}.stage{height:420px;max-width:420px;margin-inline:auto;width:100%}.stage .d1{inset-inline-start:6%}.stage .d2{inset-inline-start:46%}}
@media(max-width:520px){.hero:before{inset:8px;border-radius:22px}.hero .wrap{padding-block:36px 8px;gap:18px}.stage{height:360px;max-width:360px}.stage .dev{width:172px}.stage .d1{inset-inline-start:calc(50% - 160px)}.stage .d2{inset-inline-start:calc(50% - 8px);top:6%}.hero .ctas .btn{flex:1 1 100%}.badge{font-size:.78rem;padding:7px 10px;border-radius:12px}.badge.b1{inset-inline-end:0;bottom:22%}.badge.b2{inset-inline-start:0;bottom:6%}.trust{gap:8px 16px;font-size:.88rem}}
.proof{background:#fff;border-bottom:1px solid var(--line)}
.proof .wrap{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;padding-block:22px}
.proof div{display:flex;align-items:center;gap:12px;justify-content:center}
.proof b{font:700 1.7rem/1 var(--fH);color:var(--plum)}.proof span{color:var(--muted);font-size:.9rem;line-height:1.35}
@media(max-width:700px){.proof .wrap{grid-template-columns:1fr 1fr}.proof div{justify-content:flex-start}}
/* الشاشات */
.screens{display:grid;grid-template-columns:repeat(4,1fr);gap:clamp(14px,2vw,24px)}
.scr{text-align:center}
.scr .dev{position:relative;width:100%;max-width:240px;margin:0 auto 14px;inset:auto;transform:none}
.scr h3{font-size:1.15rem;color:var(--plum)}.scr p{color:var(--muted);font-size:.92rem;margin-top:4px}
@media(max-width:900px){.screens{grid-template-columns:repeat(2,1fr)}}
@media(max-width:520px){.screens{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;margin-inline:calc(var(--gut) * -1);padding-inline:var(--gut);scrollbar-width:none}.screens::-webkit-scrollbar{display:none}.scr{flex:0 0 66%;scroll-snap-align:center}}
/* الألم */
.pain .card{position:relative;padding-inline-start:clamp(22px,2.6vw,30px)}
.pain .card:before{content:"";position:absolute;inset-block:22px;inset-inline-start:0;width:3px;border-radius:3px;background:var(--gold-grad)}
.pain q{display:block;font:700 1.2rem/1.55 var(--fH);color:var(--plum);quotes:"«" "»"}
.pain p{color:var(--muted);margin-top:8px}
/* المزايا */
.feat{display:flex;flex-direction:column;gap:10px;transition:border-color .3s,transform .3s var(--ease)}
.feat:hover{border-color:var(--line2);transform:translateY(-2px);box-shadow:var(--sh2)}
.feat .ib{width:52px;height:52px;border-radius:15px;display:grid;place-items:center;color:#EBD3A0;background:linear-gradient(145deg,#7A1844,#3A0A1F);box-shadow:inset 0 0 0 1px rgba(233,211,166,.3),0 10px 20px -12px rgba(58,10,31,.7)}
.feat .ib .i{width:24px;height:24px;stroke-width:1.4}
.feat h3{font-size:1.28rem;margin-top:6px;color:var(--plum)}
.feat p{color:var(--muted);font-size:.97rem}
@media(max-width:640px){#features .g3{grid-template-columns:1fr 1fr;gap:10px}.feat{padding:16px 14px;gap:6px}.feat .ib{width:42px;height:42px;border-radius:12px}.feat .ib .i{width:20px;height:20px}.feat h3{font-size:1.06rem;margin-top:2px}.feat p{font-size:.86rem;line-height:1.65}}
@media(max-width:640px){.pain .g2{gap:10px}.pain .card{padding:16px 18px}.pain q{font-size:1.08rem}.pain p{font-size:.94rem;margin-top:4px}}
.langs{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:36px}
.langs .chip b{font-weight:600}.langs .chip small{color:var(--dim);font-size:.82rem}
/* العيّنة */
.demo{display:grid;grid-template-columns:1fr minmax(280px,340px);gap:clamp(28px,6vw,80px);align-items:center}
.demo ul{list-style:none;padding:0;margin:26px 0 0;display:grid;gap:14px}
.demo li{display:flex;gap:14px;align-items:flex-start;color:var(--ink2)}
.demo li .i{color:var(--rose);margin-top:5px}
.phone{position:relative;width:100%;max-width:330px;aspect-ratio:9/19;margin-inline:auto;border-radius:46px;padding:10px;background:linear-gradient(150deg,#3a1526,#14050b);box-shadow:var(--sh2),0 0 0 1px rgba(90,16,48,.25)}
.phone:before{content:"";position:absolute;top:18px;left:50%;width:84px;height:20px;transform:translateX(-50%);background:#0b0306;border-radius:20px;z-index:2}
.phone .scr{position:relative;width:100%;height:100%;border-radius:36px;overflow:hidden;background:#5A1030}
.phone iframe{width:100%;height:100%;border:0;display:block}
.phone .ph{position:absolute;inset:0;display:block;padding:0;cursor:pointer;border:0;background:#5A1030}
.phone .ph img{width:100%;height:100%;object-fit:cover;object-position:top}
.phone .ph .play-ov{position:absolute;inset:auto 0 18%;display:flex;justify-content:center}
@media(max-width:860px){.demo{grid-template-columns:1fr}.demo .phone{order:-1;max-width:300px}}
/* الخطوات */
.steps{counter-reset:s}
.step{position:relative;padding-top:64px}
.step:before{counter-increment:s;content:counter(s);position:absolute;top:20px;inset-inline-start:clamp(20px,2.6vw,28px);width:40px;height:40px;border-radius:50%;display:grid;place-items:center;font:700 1.15rem/1 var(--fH);background:var(--plum);color:var(--champ);box-shadow:0 0 0 5px var(--blush)}
.step h3{font-size:1.2rem;color:var(--plum)}.step p{color:var(--muted);margin-top:6px;font-size:.96rem}
/* الباقات */
.plans{max-width:900px;margin-inline:auto;align-items:stretch}
.plan{display:flex;flex-direction:column;position:relative}
.plan h3{font-size:1.45rem;color:var(--plum)}
.plan .pr{display:flex;align-items:baseline;gap:8px;margin:14px 0 4px}
.plan .pr b{font:700 3.2rem/1 var(--fH);color:var(--plum)}
.plan .pr span{color:var(--muted)}
.plan ul{list-style:none;padding:0;margin:18px 0 26px;display:grid;gap:12px;flex:1}
.plan li{display:flex;gap:12px;align-items:flex-start;color:var(--ink2);font-size:.98rem}
.plan li .i{color:var(--rose);margin-top:5px;width:18px;height:18px}
.plan.best{border:0;background:radial-gradient(120% 100% at 100% 0%,#8A1A4A,#5A1030 55%,#3A0A1F);color:#EAD7DF;box-shadow:var(--sh2)}
.plan.best h3,.plan.best .pr b{color:#fff}.plan.best .muted,.plan.best .pr span{color:#E2CCD5}.plan.best li{color:#F5E9EE}.plan.best li .i{color:var(--champ)}
.ribbon{position:absolute;top:-13px;inset-inline-start:24px;background:var(--gold-grad);color:var(--plum2);font-weight:700;font-size:.82rem;border-radius:999px;padding:4px 14px}
/* الأخلاق */
.ethic{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:center;max-width:900px;margin-inline:auto}
.ethic .ib{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:var(--ok-bg);color:var(--ok)}
.ethic .ib .i{width:30px;height:30px;stroke-width:1.3}
.ethic h3{font-size:1.4rem;color:var(--plum)}.ethic p{color:var(--muted);margin-top:6px}
@media(max-width:560px){.ethic{grid-template-columns:1fr;text-align:center}.ethic .ib{margin-inline:auto}}
/* الأسئلة */
.faq{max-width:840px;margin-inline:auto;display:grid;gap:10px}
.faq details{border:1px solid var(--line);border-radius:var(--r2);background:#fff;transition:border-color .2s,box-shadow .2s}
.faq details[open]{border-color:var(--line2);box-shadow:var(--sh1)}
.faq summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 22px;font-weight:600;font-size:1.04rem}
.faq summary::-webkit-details-marker{display:none}
.faq summary .i{color:var(--rose);transition:transform .25s var(--ease)}
.faq details[open] summary .i{transform:rotate(180deg)}
.faq details p{padding:0 22px 20px;color:var(--muted)}
/* الختام */
.final{text-align:center;padding-block:clamp(64px,9vw,104px);color:#F5E9EE;background:radial-gradient(80% 120% at 50% 0%,#8A1A4A,#5A1030 55%,#3A0A1F)}
.final .eyebrow{color:var(--champ)}.final h2{font-size:clamp(2rem,4vw,3rem);color:#fff}.final h2 em{font-style:normal;color:var(--champ)}
.final p{color:#E2CCD5;margin:14px auto 30px;max-width:560px}`;

  const feats: [string, string, string][] = [
    ['house', 'باسم بيتك', 'تختارين اسم الكتاب وشعاره — يظهر على شاشة جوالها كأنه كتاب خاص ببيتكم.'],
    ['volume-2', 'صوت لكل جملة', 'بلغتها وبالعربي. كثير من العاملات قراءتهن محدودة — والصوت يحلّ ذلك بلمسة.'],
    ['calendar-days', 'جدول يومها النظامي', 'تحددين المواعيد ونتحقق تلقائياً أنها ضمن النظام: 10 ساعات، راحة، ويوم إجازة.'],
    ['message-circle', '«قولي لعاملتك»', 'تضغطين جملة بالعربي («نظّفي هذا»، «شوي شوي») فتسمعها بلغتها فوراً.'],
    ['messages-square', '«ردودي»', 'تضغط جملة بلغتها فيسمعها البيت بالعربي: «المنظف خلص»، «الطفل يبكي»، «أنا مريضة».'],
    ['wifi-off', 'يعمل بلا إنترنت', 'بعد أول فتح يبقى محفوظاً ويعمل دائماً — خفيف جداً على الجوالات القديمة.'],
    ['shield-check', 'السلامة أولاً', 'المنظفات الخطرة، الغاز، الزيت المشتعل، الأطفال قرب الماء — مع أرقام الطوارئ بضغطة.'],
    ['lock-keyhole', 'نسختك أنتِ', 'مقفل برمز خاص ومشفّر، ويحمل بصمة باسم بيتك. والطوارئ تبقى مفتوحة دائماً.'],
    ['scale', 'يحترم الطرفين', 'فيه حقوق العاملة وواجباتها من نظام العمالة المنزلية — احترام يصنع التزاماً.'],
  ];

  const body = `
<section class="hero" aria-labelledby="h1"><div class="wrap"><div class="tx">
  <span class="eyebrow">نسخة خاصة تُصنع باسم بيتك</span>
  <h1 id="h1">قواعد بيتك… <em>بلغة عاملتك</em>، وبصوت تسمعه</h1>
  <p class="lead">كتاب تفاعلي يُصنع لبيتك أنتِ: قواعدك، جدولها، السلامة، وآداب الضيافة — بلغتها الأم وبالعربي، ولكل جملة صوت. يفتح على جوالها ويعمل حتى بدون إنترنت.</p>
  <div class="ctas"><a class="btn btn-champ" href="/order">اصنعي كتاب بيتك ${ic.i('arrow-left')}</a><a class="btn btn-ghost-l" href="#sample">${ic.i('headphones')} جرّبي العيّنة مجاناً</a></div>
  <div class="trust"><span>${ic.i('wifi-off')}يعمل بلا إنترنت</span><span>${ic.i('monitor-smartphone')}آيفون وأندرويد — حتى القديمة</span><span>${ic.i('lock-keyhole')}مقفل برمز خاص ببيتك</span></div>
</div>
<div class="stage" aria-hidden="true">${device('cover', 'غلاف الكتاب باسم البيت', 'd1', true)}${device('chapter', 'فصل السلامة بالأمهرية والعربية مع أزرار الصوت', 'd2')}
  <span class="badge b1">${ic.i('volume-2')}صوت لكل جملة · بلغتين</span><span class="badge b2">${ic.i('calendar-days')}جدول مطابق للنظام</span></div>
</div></section>
<section class="proof" aria-label="بالأرقام"><div class="wrap"><div><b>8</b><span>فصول عملية<br>للبيت السعودي</span></div><div><b>+60</b><span>قاعدة بيت<br>جاهزة تختارينها</span></div><div><b>+900</b><span>جملة مسموعة<br>بلغتها وبالعربي</span></div><div><b>0</b><span>تطبيقات تُحمَّل<br>رابط واحد فقط</span></div></div></section>

<section class="sec" aria-labelledby="h-scr"><div class="wrap">
  <div class="sh rv"><span class="eyebrow">من داخل الكتاب</span><h2 id="h-scr">هذا ما ستراه عاملتك على جوالها</h2><p>لقطات حقيقية من الكتاب — بلا تجميل.</p></div>
  <div class="screens">
    <div class="scr rv">${device('home', 'الصفحة الرئيسية للكتاب')}<h3>صفحة بيتك</h3><p>تقدّمها، وكل ما تحتاجه بلمسة.</p></div>
    <div class="scr rv">${device('today', 'جدول اليوم بالساعات')}<h3>جدول يومها</h3><p>مواعيدك أنتِ، مطابقة للنظام.</p></div>
    <div class="scr rv">${device('replies', 'ردود جاهزة تُسمع بالعربي')}<h3>«ردودي»</h3><p>تضغط بلغتها، فتسمعين بالعربي.</p></div>
    <div class="scr rv">${device('sos', 'صفحة الطوارئ بأرقام السعودية')}<h3>الطوارئ</h3><p>911 ومساند بضغطة — مفتوحة دائماً.</p></div>
  </div>
</div></section>

<section class="sec alt pain" aria-labelledby="h-pain"><div class="wrap">
  <div class="sh rv"><span class="eyebrow">لكل بيت فيه عاملة — جديدة أو منذ سنين</span><h2 id="h-pain">تعرفين هذا الشعور؟</h2></div>
  <div class="grid g2">
    <div class="card rv"><q>شرحت لها مية مرة…</q><p>الكتاب يعيد الشرح عنكِ بلغتها وبالصوت، كلما احتاجته — بلا تعب ولا توتر.</p></div>
    <div class="card rv"><q>عاملتي عندي من سنين، بس أشياء تتكرر غلط</q><p>اختاري قواعد بيتك من مكتبة جاهزة (أكثر من 60 قاعدة مترجمة ومسجّلة) لتصير مرجعاً ثابتاً بينكما.</p></div>
    <div class="card rv"><q>أخاف على عيالي من المنظفات والغاز</q><p>فصل السلامة: لا تخلطي الكلوركس، الزيت المشتعل، الأطفال قرب الماء — مع زر طوارئ يتصل بـ911 مباشرة.</p></div>
    <div class="card rv"><q>ما نفهم على بعض</q><p>«ردودي»: تضغط العاملة جملة بلغتها فيسمعها البيت بالعربي بصوت واضح.</p></div>
  </div>
</div></section>

<section class="sec" id="features" aria-labelledby="h-feat"><div class="wrap">
  <div class="sh rv"><span class="eyebrow">ما يميّزه عن أي ملف أو تطبيق</span><h2 id="h-feat">مصنوع لبيتك أنتِ — لا ملفاً عاماً</h2></div>
  <div class="grid g3">${feats.map(([i, t, d]) => `<article class="card feat rv"><span class="ib">${ic.i(i)}</span><h3>${t}</h3><p>${d}</p></article>`).join('')}</div>
  <div class="langs rv" aria-label="اللغات"><span class="chip on">${ic.i('check')}<b>አማርኛ</b> <small>الأمهرية — متاحة</small></span>${LANGS_SOON.map(([n, a]) => `<span class="chip soon"><b>${n}</b> <small>${a} — قريباً</small></span>`).join('')}</div>
</div></section>

<section class="sec alt" id="sample" aria-labelledby="h-demo"><div class="wrap demo">
  <div class="rv"><span class="eyebrow">جرّبيها الآن — مجاناً</span><h2 id="h-demo" style="font-size:clamp(1.8rem,3.4vw,2.6rem);margin-top:10px;color:var(--plum)">افتحي العيّنة كما ستراها عاملتك</h2>
    <p class="muted" style="margin-top:14px">فصل السلامة كاملاً بالأمهرية والعربية مع الصوت، وصفحة الطوارئ. هذه نسخة حقيقية من الكتاب تعمل داخل الصفحة.</p>
    <ul><li>${ic.i('volume-2')}<span>اضغطي زر التشغيل بجانب أي جملة لتسمعيها بلغتين.</span></li><li>${ic.i('languages')}<span>بدّلي بين «اللغتين» و«لغتها فقط» و«العربي فقط».</span></li><li>${ic.i('siren')}<span>الطوارئ تعمل دائماً — حتى قبل إدخال رمز الكتاب.</span></li></ul>
    <div class="ctas" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:28px"><a class="btn btn-line" href="/samples/am.html" target="_blank" rel="noopener">${ic.i('external-link')} افتحيها في صفحة كاملة</a></div></div>
  <div class="phone rv"><div class="scr" id="demo"><button class="ph" type="button" id="demoBtn" aria-label="تشغيل العيّنة">${shot('cover', 'غلاف العيّنة')}<span class="play-ov"><span class="btn btn-champ btn-sm">${ic.i('play')} اضغطي لتجربتها هنا</span></span></button></div></div>
</div></section>

<section class="sec" id="how" aria-labelledby="h-how"><div class="wrap">
  <div class="sh rv"><span class="eyebrow">أربع خطوات</span><h2 id="h-how">جاهز خلال دقائق</h2></div>
  <div class="grid g4 steps">
    <div class="card step rv"><h3>اختاري لغتها</h3><p>واسم الكتاب وشعاره كما تحبين.</p></div>
    <div class="card step rv"><h3>قواعد بيتك وجدولها</h3><p>اختاري من المكتبة، وحددي مواعيدها ويوم راحتها.</p></div>
    <div class="card step rv"><h3>حوّلي وارفعي الإيصال</h3><p>يُقرأ آلياً ويُراجع، ثم يُجهَّز كتابك.</p></div>
    <div class="card step rv"><h3>أرسليه لها</h3><p>رابط ورمز على واتساب، وملف احتياطي يعمل بلا إنترنت.</p></div>
  </div>
</div></section>

<section class="sec alt" id="plans" aria-labelledby="h-plans"><div class="wrap">
  <div class="sh rv"><span class="eyebrow">دفعة واحدة — بلا اشتراك</span><h2 id="h-plans">الباقات</h2></div>
  <div class="grid g2 plans">
    <div class="card plan rv"><h3>${esc(plans.basic.label)}</h3><div class="pr"><b>${plans.basic.price}</b><span>ريال</span></div><p class="muted">لعاملة واحدة</p>
      <ul><li>${ic.i('check')}كتاب كامل بلغتها + العربية</li><li>${ic.i('check')}8 فصول + قواعد بيتك + جدولها</li><li>${ic.i('check')}صوت لكل جملة بلغتين</li><li>${ic.i('check')}«ردودي» و«قولي لعاملتك»</li><li>${ic.i('check')}رابط خاص + ملف يعمل بلا إنترنت</li></ul>
      <a class="btn btn-line btn-block" href="/order?plan=basic">اختاري هذه الباقة</a></div>
    <div class="card plan best rv"><span class="ribbon">الأنسب للبيوت الكبيرة</span><h3>${esc(plans.plus.label)}</h3><div class="pr"><b>${plans.plus.price}</b><span>ريال</span></div><p class="muted">لعاملتين — كلٌّ بلغتها</p>
      <ul><li>${ic.i('check')}كتابان — لكل عاملة بلغتها واسمها</li><li>${ic.i('check')}نفس قواعد البيت للجميع</li><li>${ic.i('check')}كل مزايا الكتاب الشخصي</li><li>${ic.i('check')}إعادة إصدار مجانية عند تغيير العاملة</li></ul>
      <a class="btn btn-gold btn-block" href="/order?plan=plus">اختاري هذه الباقة</a></div>
  </div>
</div></section>

<section class="sec" aria-label="مبدأ الكتاب"><div class="wrap"><div class="card ethic rv"><span class="ib">${ic.i('heart-handshake')}</span><div><h3>كتاب يحترم الطرفين</h3>
  <p>فيه حقوق العاملة من نظام العمالة المنزلية (ساعات العمل، الراحة، يوم الإجازة، وأن جوازها حقها) — لأن من تشعر بالاحترام تلتزم أكثر. لا كاميرا، ولا تتبّع، ولا مراقبة.</p></div></div></div></section>

<section class="sec alt" id="faq" aria-labelledby="h-faq"><div class="wrap">
  <div class="sh rv"><span class="eyebrow">قبل أن تطلبي</span><h2 id="h-faq">أسئلة شائعة</h2></div>
  <div class="faq">${FAQ.map(([q, a], i) => `<details class="rv"${i === 0 ? ' open' : ''}><summary>${q}${ic.i('chevron-down')}</summary><p>${a}</p></details>`).join('')}</div>
</div></section>

<section class="final"><div class="wrap rv"><span class="eyebrow">${BRAND.name}</span><h2 style="margin-top:12px">بيت مرتّب يبدأ من <em>تفاهم واضح</em></h2>
  <p>اصنعي كتاب بيتك الآن، ويصل لعاملتك بلغتها وبصوتها.</p>
  <a class="btn btn-champ" href="/order">اصنعي كتاب بيتك ${ic.i('arrow-left')}</a></div></section>`;

  const org = { '@context': 'https://schema.org', '@type': 'Organization', '@id': origin + '/#org', name: BRAND.name, alternateName: 'Ghaida Home Book', url: origin + '/', logo: origin + A('/brand/icon-512.png'), areaServed: 'SA' };
  const site = { '@context': 'https://schema.org', '@type': 'WebSite', '@id': origin + '/#site', name: BRAND.name, url: origin + '/', inLanguage: 'ar-SA', publisher: { '@id': origin + '/#org' } };
  const product = {
    '@context': 'https://schema.org', '@type': 'Product', name: BRAND.name + ' — كتاب تفاعلي مخصّص للعاملة المنزلية', description: DESC, brand: { '@id': origin + '/#org' }, image: [origin + A('/brand/og.jpg')], category: 'كتاب إلكتروني تفاعلي',
    offers: [plans.basic, plans.plus].map((p: any, i: number) => ({ '@type': 'Offer', name: p.label, price: String(p.price), priceCurrency: 'SAR', availability: 'https://schema.org/InStock', url: `${origin}/order?plan=${i ? 'plus' : 'basic'}`, seller: { '@id': origin + '/#org' } })),
  };
  const faq = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };

  const scripts = `(function(){var b=document.getElementById('demoBtn');if(!b)return;b.onclick=function(){var f=document.createElement('iframe');f.src='/samples/am.html';f.title='عيّنة كتاب البيت';f.setAttribute('loading','lazy');b.replaceWith(f)}})();`;
  return page({ title: `${BRAND.name} — قواعد بيتك بلغة عاملتك وبصوتها | كتاب تفاعلي للعاملة المنزلية`, desc: DESC, path: '/', origin, css, jsonld: [org, site, product, faq], preloadHero: true, body, ic, wa, scripts });
}

// ═══════════════════════ معالج الطلب ═══════════════════════
export function orderPage({ catalog, plans, origin }: any) {
  const ic = new Icons();
  const lib = catalog.library || [];
  const ruleIcon = (e: string) => ic.i(EMOJI[e] && !EMOJI[e].startsWith('#') ? EMOJI[e] : 'check');
  Object.keys(EMBLEMS).forEach((k) => ic.emb(k));
  const css = `
.wiz{max-width:760px;margin-inline:auto;padding-block:clamp(28px,5vw,56px) 120px}
.wz-h{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.wz-h h1{font-size:clamp(1.6rem,3vw,2.1rem);color:var(--plum)}
.wz-h .n{font:600 .9rem var(--fB);color:var(--rose)}
.prog{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:28px}
.prog i{height:4px;border-radius:4px;background:var(--line2)}.prog i.on{background:var(--plum)}
.pane{display:none}.pane.on{display:block;animation:f .35s var(--ease)}@keyframes f{from{opacity:0;transform:translateY(8px)}}
.pane h2{font-size:1.5rem;color:var(--plum)}.pane>.muted{margin-top:6px}
.opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px}
.opt{display:flex;flex-direction:column;gap:2px;text-align:start;border:1px solid var(--line2);border-radius:var(--r2);background:#fff;color:var(--ink);padding:16px 18px;cursor:pointer;transition:border-color .2s,background .2s;min-height:72px}
.opt:hover{border-color:var(--plum)}
.opt[aria-pressed=true]{border-color:var(--plum);background:var(--blush);box-shadow:0 0 0 1px var(--plum) inset}
.opt[aria-disabled=true]{opacity:.42;cursor:not-allowed}
.opt b{font-size:1.08rem;color:var(--plum)}.opt span{font-size:.88rem;color:var(--muted)}
.embs{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.embs button{aspect-ratio:1;border-radius:16px;border:1px solid var(--line2);background:#fff;color:var(--plum);display:grid;place-items:center;cursor:pointer;transition:.2s}
.embs button .emb{width:46%;height:46%}
.embs button[aria-pressed=true]{border-color:transparent;color:#EBD3A0;background:linear-gradient(145deg,#7A1844,#3A0A1F)}
.cover{margin:22px 0 0;border-radius:var(--r3);padding:34px 24px;text-align:center;background:radial-gradient(120% 90% at 50% 0%,#8A1A4A,#5A1030 50%,#3A0A1F);color:#F5E9EE;position:relative;box-shadow:var(--sh2)}
.cover:before{content:"";position:absolute;inset:10px;border:1px solid rgba(233,211,166,.35);border-radius:16px;pointer-events:none}
.cover .crest{width:86px;height:86px;margin:0 auto 14px;border-radius:50%;display:grid;place-items:center;color:var(--plum);background:linear-gradient(145deg,#F7E7C3,#D2AE6C);box-shadow:0 0 0 6px rgba(233,211,166,.14)}
.cover .crest .emb{width:48px;height:48px}
.cover small{color:var(--champ);font-size:.85rem}
.cover .nm{font:700 clamp(1.7rem,4vw,2.2rem)/1.3 var(--fH);margin-top:6px;color:#fff}
.cover .orn{color:var(--champ)}
.cat{margin-top:22px}
.cat h3{display:flex;align-items:center;gap:10px;font:700 1rem var(--fB);color:var(--plum);margin-bottom:8px}
.cat h3 .cnt{margin-inline-start:auto;color:var(--dim);font-size:.85rem;font-weight:400}
.rule{display:flex;gap:14px;align-items:flex-start;border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin:6px 0;cursor:pointer;background:var(--card);transition:border-color .2s,background .2s}
.rule:has(input:checked){border-color:rgba(90,16,48,.35);background:#FFF8FA}
.rule input{appearance:none;width:22px;height:22px;flex:none;border-radius:7px;border:1.5px solid var(--line2);margin-top:3px;display:grid;place-items:center;cursor:pointer;transition:.15s}
.rule input:checked{background:var(--plum);border-color:transparent}
.rule input:checked:after{content:"";width:6px;height:11px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg) translate(-1px,-1px)}
.rule .ri{color:var(--rose);margin-top:4px}
.rule .rt{flex:1}
.lv{display:inline-block;font-size:.75rem;font-weight:700;color:var(--danger);border:1px solid rgba(238,123,109,.35);border-radius:999px;padding:0 8px;margin-inline-start:6px}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.brk{display:grid;grid-template-columns:1fr 1fr 54px;gap:10px;margin-top:10px}
.brk .x{border:1px solid rgba(238,123,109,.3);background:var(--danger-bg);color:var(--danger);border-radius:14px;cursor:pointer;display:grid;place-items:center}
#legal{margin-top:16px}
.navb{position:sticky;bottom:0;z-index:20;display:flex;gap:10px;padding:14px 0 calc(14px + env(safe-area-inset-bottom));margin-top:28px;background:linear-gradient(0deg,var(--bg) 70%,transparent)}
.navb .btn{flex:1}
.sum{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid var(--line)}
.sum:last-child{border:0}.sum span{color:var(--muted)}
.sum .tot{font:700 1.6rem var(--fH);color:var(--plum)}
.err{color:var(--danger);font-weight:600;min-height:26px;margin-top:10px}
@media(max-width:520px){.embs{grid-template-columns:repeat(5,1fr);gap:8px}.row2{grid-template-columns:1fr 1fr}}`;
  const body = `<div class="wrap wiz">
  <div class="wz-h"><h1>اصنعي كتاب بيتك</h1><span class="n" id="stepn">الخطوة 1 من 4</span></div>
  <div class="prog" aria-hidden="true"><i class="on"></i><i></i><i></i><i></i></div>
  <form id="f" novalidate onsubmit="return false">
  <section class="pane on" data-p="0" aria-labelledby="p0"><h2 id="p0">لمن الكتاب؟</h2><p class="muted">اختاري الباقة ولغة العاملة.</p>
    <div class="fld"><span>الباقة</span><div class="opts" id="plans" role="group" aria-label="الباقة">
      <button type="button" class="opt" data-plan="basic" aria-pressed="false"><b>${esc(plans.basic.label)}</b><span>${plans.basic.price} ريال · عاملة واحدة</span></button>
      <button type="button" class="opt" data-plan="plus" aria-pressed="false"><b>${esc(plans.plus.label)}</b><span>${plans.plus.price} ريال · عاملتان</span></button></div></div>
    <div id="workers"></div></section>
  <section class="pane" data-p="1" aria-labelledby="p1"><h2 id="p1">سمّي كتابك</h2><p class="muted">الاسم والشعار يظهران على الغلاف وعلى شاشة جوالها.</p>
    <label class="fld"><span>اسم الكتاب</span><input class="in" type="text" id="bn" maxlength="22" placeholder="دليل بيت أم سارة" value="دليل بيت " autocomplete="off"></label>
    <div class="fld"><span>الشعار</span><div class="embs" id="embs" role="group" aria-label="الشعار">${Object.entries(EMBLEMS).map(([k, e], n) => `<button type="button" data-e="${k}" aria-pressed="${n ? 'false' : 'true'}" aria-label="${esc(e.ar)}" title="${esc(e.ar)}">${ic.emb(k)}</button>`).join('')}</div></div>
    <div class="cover" aria-label="معاينة الغلاف"><div class="crest" id="cvi">${ic.emb('arch')}</div><small>كتاب خاص ببيت</small><div class="nm" id="cvn">دليل بيت</div><div class="orn">${ic.i('star8')}</div></div></section>
  <section class="pane" data-p="2" aria-labelledby="p2"><h2 id="p2">قواعد بيتك وجدولها</h2><p class="muted">اخترنا لكِ الأساسيات — أضيفي أو احذفي ما تريدين. كل قاعدة مترجمة ومسجّلة بصوت.</p>
    <div id="lib">${lib.map((c: any) => `<div class="cat"><h3>${ruleIcon(c.icon)}${esc(c.title)}<span class="cnt">${c.rules.length}</span></h3>${c.rules.map((r: any) => `<label class="rule"><input type="checkbox" value="${esc(r.id)}" ${r.default ? 'checked' : ''}><span class="ri">${ruleIcon(r.icon)}</span><span class="rt">${esc(r.text)}${r.level === 'danger' ? '<span class="lv">خطر</span>' : ''}</span></label>`).join('')}</div>`).join('')}</div>
    <h3 style="font-size:1.3rem;margin-top:34px">جدول يومها</h3>
    <div class="row2"><label class="fld"><span>بداية العمل</span><input class="in" type="time" id="s_start" value="07:00"></label><label class="fld"><span>نهاية العمل</span><input class="in" type="time" id="s_end" value="20:30"></label></div>
    <div class="fld"><span>الاستراحات</span><div id="brks"></div><button type="button" class="btn btn-line btn-sm" id="addb" style="margin-top:12px">${ic.i('plus')} إضافة استراحة</button></div>
    <label class="fld"><span>يوم راحتها الأسبوعي</span><select class="in" id="s_rest">${['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((d, i) => `<option value="${i}" ${i === 5 ? 'selected' : ''}>${d}</option>`).join('')}</select></label>
    <div id="legal" aria-live="polite"></div></section>
  <section class="pane" data-p="3" aria-labelledby="p3"><h2 id="p3">بياناتك</h2><p class="muted">لنرسل لكِ الكتاب، ويظهر رقمك في صفحة الطوارئ لتتصل بك العاملة بضغطة.</p>
    <label class="fld"><span>اسمك</span><input class="in" type="text" id="nm" placeholder="أم سارة" autocomplete="name"></label>
    <label class="fld"><span>جوالك (واتساب)</span><input class="in" type="tel" id="ph" placeholder="05xxxxxxxx" inputmode="tel" dir="ltr" autocomplete="tel" style="text-align:right"></label>
    <p class="note">${ic.i('lock-keyhole')} لا نشارك رقمك مع أي جهة.</p>
    <div class="card" style="margin-top:20px" id="summary"></div></section>
  <div class="err" id="err" role="alert"></div>
  <div class="navb"><button type="button" class="btn btn-line" id="back">${ic.i('arrow-right')} السابق</button><button type="button" class="btn btn-gold" id="next">التالي ${ic.i('arrow-left')}</button></div>
  </form></div>`;
  ic.i('x'); ic.i('circle-check'); ic.i('triangle-alert');
  const scripts = `
var CAT=${json({ languages: catalog.languages })},PLANS=${json(plans)};
var st={plan:new URLSearchParams(location.search).get('plan')==='plus'?'plus':'basic',p:0,emb:'arch',langs:[],workers:[]};
function $(i){return document.getElementById(i)}function q(s,r){return[].slice.call((r||document).querySelectorAll(s))}
function I(n){return'<svg class="i" aria-hidden="true"><use href="#i-'+n+'"/></svg>'}
function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function renderWorkers(){var n=PLANS[st.plan].langs,h='';for(var w=0;w<n;w++){h+='<div class="fld"><span>'+(n>1?'العاملة '+(w+1)+' — ':'')+'لغتها</span><div class="opts" data-w="'+w+'" role="group">';
 Object.keys(CAT.languages).forEach(function(k){var L=CAT.languages[k];h+='<button type="button" class="opt" data-lang="'+k+'" aria-pressed="'+(st.langs[w]===k)+'"'+(L.ready?'':' aria-disabled="true"')+'><b>'+E(L.native)+'</b><span>'+E(L.name)+(L.ready?'':' · قريباً')+'</span></button>'});
 h+='</div></div><label class="fld"><span>اسمها <small class="muted">(اختياري — يظهر في ترحيب الكتاب)</small></span><input class="in wn" type="text" data-w="'+w+'" maxlength="24" value="'+E(st.workers[w]||'')+'" placeholder="مثال: Almaz" dir="auto"></label>'}
 $('workers').innerHTML=h;q('#plans .opt').forEach(function(o){o.setAttribute('aria-pressed',o.dataset.plan===st.plan)})}
document.addEventListener('click',function(e){var o=e.target.closest('.opt');if(o&&o.getAttribute('aria-disabled')!=='true'){if(o.dataset.plan){st.plan=o.dataset.plan;st.langs=st.langs.slice(0,PLANS[st.plan].langs);renderWorkers()}else if(o.dataset.lang){st.langs[+o.parentNode.dataset.w]=o.dataset.lang;renderWorkers()}}
 var eb=e.target.closest('#embs button');if(eb){st.emb=eb.dataset.e;q('#embs button').forEach(function(b){b.setAttribute('aria-pressed',b===eb)});$('cvi').innerHTML=eb.innerHTML}});
document.addEventListener('input',function(e){var t=e.target;if(t.classList.contains('wn'))st.workers[+t.dataset.w]=t.value;if(t.id==='bn')$('cvn').textContent=t.value.trim()||'—';if(/^s_/.test(t.id)||t.closest('#brks'))checkSched()});
function brk(a,b){var d=document.createElement('div');d.className='brk';d.innerHTML='<input class="in" type="time" value="'+a+'" aria-label="من"><input class="in" type="time" value="'+b+'" aria-label="إلى"><button type="button" class="x" aria-label="حذف الاستراحة">'+I('x')+'</button>';d.querySelector('button').onclick=function(){d.remove();checkSched()};$('brks').appendChild(d)}
[['10:00','10:30'],['13:30','16:00'],['19:30','20:00']].forEach(function(x){brk(x[0],x[1])});$('addb').onclick=function(){brk('17:00','17:30');checkSched()};
function sched(){return{start:$('s_start').value,end:$('s_end').value,breaks:q('#brks .brk').map(function(d){var i=d.querySelectorAll('input');return[i[0].value,i[1].value]}).filter(function(x){return x[0]&&x[1]}),rest_day:+$('s_rest').value}}
var legalOK=true,tmr;function checkSched(){clearTimeout(tmr);tmr=setTimeout(function(){fetch('/api/schedule/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(sched())}).then(function(r){return r.json()}).then(function(j){legalOK=j.ok;$('legal').innerHTML='<div class="alert '+(j.ok?'ok':'bad')+'">'+I(j.ok?'circle-check':'triangle-alert')+'<span>'+(j.ok?'مطابق للنظام: '+j.workH+' ساعات عمل · '+j.restH+' ساعة راحة متواصلة':E(j.error))+'</span></div>'})},250)}
function rules(){return q('#lib input:checked').map(function(i){return i.value})}
function go(d){var err='';if(d>0){if(st.p===0&&st.langs.filter(Boolean).length<PLANS[st.plan].langs)err='اختاري لغة '+(PLANS[st.plan].langs>1?'كل عاملة':'العاملة');if(st.p===1&&$('bn').value.trim().length<3)err='اكتبي اسم الكتاب';if(st.p===2&&!legalOK)err='عدّلي الجدول ليطابق النظام أولاً';if(st.p===3&&$('ph').value.replace(/\\D/g,'').length<9)err='اكتبي رقم جوال صحيح'}
 $('err').textContent=err;if(err)return;if(st.p===3&&d>0)return submit();
 st.p=Math.max(0,Math.min(3,st.p+d));q('.pane').forEach(function(p){p.classList.toggle('on',+p.dataset.p===st.p)});q('.prog i').forEach(function(i,n){i.classList.toggle('on',n<=st.p)});$('stepn').textContent='الخطوة '+(st.p+1)+' من 4';
 $('back').style.visibility=st.p?'visible':'hidden';$('next').innerHTML=st.p===3?'تأكيد الطلب — '+PLANS[st.plan].price+' ريال':'التالي '+I('arrow-left');if(st.p===3)summary();scrollTo({top:0,behavior:'smooth'})}
function summary(){var s=sched();$('summary').innerHTML='<div class="sum"><span>الباقة</span><b>'+E(PLANS[st.plan].label)+'</b></div><div class="sum"><span>الكتاب</span><b>'+E($('bn').value)+'</b></div><div class="sum"><span>اللغة</span><b>'+st.langs.map(function(l){return E(CAT.languages[l].native)}).join(' + ')+'</b></div><div class="sum"><span>قواعد البيت</span><b>'+rules().length+' قاعدة</b></div><div class="sum"><span>الدوام</span><b dir="ltr">'+s.start+' – '+s.end+'</b></div><div class="sum"><span>المجموع</span><b class="tot">'+PLANS[st.plan].price+' ريال</b></div>'}
function submit(){var nb=$('next');nb.disabled=true;nb.textContent='لحظة…';
 fetch('/api/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({plan:st.plan,langs:st.langs,workers:st.workers,book_name:$('bn').value.trim(),home_name:$('bn').value.trim(),icon:st.emb,rules:rules(),schedule:sched(),buyer_name:$('nm').value,buyer_phone:$('ph').value})})
 .then(function(r){return r.json()}).then(function(j){if(j.error){$('err').textContent=j.error;nb.disabled=false;go(0);return}try{localStorage.setItem('gh.lastOrder',j.url)}catch(e){}location.href=j.url}).catch(function(){$('err').textContent='تعذّر الاتصال، حاولي مرة ثانية';nb.disabled=false;go(0)})}
$('next').onclick=function(){go(1)};$('back').onclick=function(){go(-1)};$('back').style.visibility='hidden';renderWorkers();checkSched();`;
  return page({ title: `اصنعي كتاب بيتك — ${BRAND.name}`, desc: 'خطوات قليلة: اختاري لغة العاملة واسم الكتاب وقواعد بيتك وجدولها النظامي، ثم ادفعي بتحويل بنكي واستلمي الكتاب.', path: '/order', origin, css, body, ic, nav: false, cta: false, scripts, foot: false });
}

// ═══════════════════════ صفحة الطلب: الدفع ← التحقق ← التسليم ═══════════════════════
export function statusPage({ o, pay, wa, origin }: any) {
  const ic = new Icons();
  ['copy', 'upload', 'receipt', 'hourglass', 'circle-check', 'circle-x', 'triangle-alert', 'whatsapp', 'external-link', 'file-down', 'link', 'smartphone', 'check', 'info', 'refresh-cw'].forEach((n) => ic.i(n));
  const css = `
.box{max-width:720px;margin-inline:auto;padding-block:clamp(28px,5vw,56px) 80px}
.stp{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:22px}
.stp span{display:flex;align-items:center;justify-content:center;gap:6px;font-size:.86rem;padding:10px 4px;border-radius:12px;border:1px solid var(--line);color:var(--dim);background:#fff}
.stp span.on{border-color:var(--plum);color:#fff;background:var(--plum)}
.stp span.dn{color:var(--ok);border-color:rgba(30,122,70,.25);background:var(--ok-bg)}
.stp .i{width:16px;height:16px}
.oh{display:flex;align-items:center;gap:16px}
.oh .crest{width:64px;height:64px;flex:none;border-radius:18px;display:grid;place-items:center;color:#EBD3A0;background:linear-gradient(145deg,#7A1844,#3A0A1F)}
.oh .crest .emb{width:36px;height:36px}
.oh h1{font-size:1.6rem;color:var(--plum)}.oh .m{color:var(--muted);font-size:.92rem}
.bank{margin-top:16px;border-radius:var(--r3);padding:22px;background:radial-gradient(120% 100% at 100% 0%,#8A1A4A,#5A1030 55%,#3A0A1F);color:#F5E9EE;box-shadow:var(--sh2)}
.bank .t{font-weight:700;margin-bottom:8px}.bank .t b{color:var(--champ);font:700 1.3rem var(--fH)}
.bank .r{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-top:1px solid rgba(233,211,166,.2)}
.bank .r>span{color:#E2CCD5;font-size:.92rem}
.bank .v{direction:ltr;font:600 1rem ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;color:#fff}
.bank .v.ar{direction:rtl;font-family:var(--fB);letter-spacing:0}
.cp{display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(233,211,166,.55);background:transparent;color:var(--champ);border-radius:10px;padding:0 12px;min-height:38px;font-size:.85rem;cursor:pointer}
.drop{display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:16px;border:2px dashed rgba(163,21,79,.35);border-radius:var(--r3);padding:32px 20px;text-align:center;background:#fff;cursor:pointer;transition:.2s}
.drop:hover,.drop.on{border-color:var(--rose);background:var(--blush)}
.drop .ib{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;background:var(--blush);color:var(--rose)}
.drop .ib .i{width:28px;height:28px;stroke-width:1.3}
.chk{display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)}.chk:last-child{border:0}
.chk .y{color:var(--ok)}.chk .n{color:var(--danger)}.chk .u{color:var(--dim)}
.code{font:700 2.1rem/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;color:var(--plum);border:0;background:var(--blush);border-radius:16px;padding:20px;text-align:center;direction:ltr;margin-top:14px}
.qr{display:flex;justify-content:center;margin:18px 0}.qr svg{width:180px;height:180px;background:#fff;padding:10px;border-radius:14px}
.bk{border-top:1px solid var(--line);padding-top:18px;margin-top:18px}
.bk h3{font:700 1.05rem var(--fB);color:var(--plum)}
.acts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
@media(max-width:480px){.acts{grid-template-columns:1fr}.stp span{font-size:.78rem}}`;
  const steps = ['الطلب', 'الدفع', 'التحقق', 'كتابك'];
  const idx = o.status === 'awaiting_payment' ? 1 : o.status === 'review' || o.status === 'paid' ? 2 : o.status === 'delivered' ? 3 : 1;
  const body = `<div class="wrap box">
  <div class="stp">${steps.map((s, i) => `<span class="${i < idx ? 'dn' : i === idx ? 'on' : ''}">${i < idx ? ic.i('check') : ''}${s}</span>`).join('')}</div>
  <div class="card oh"><span class="crest">${ic.emb(EMBLEMS[o.icon] ? o.icon : 'arch')}</span><div><h1>${esc(o.book_name)}</h1><div class="m">رقم الطلب <b dir="ltr">${esc(o.id)}</b> · ${o.price} ريال</div></div></div>
  <div id="app" style="margin-top:16px" aria-live="polite"></div></div>`;
  const scripts = `
var O=${json(o)},PAY=${json(pay)},WA=${json(wa)},ORIGIN=${json(origin)},K=new URLSearchParams(location.search).get('k');
function $(i){return document.getElementById(i)}function I(n){return'<svg class="i" aria-hidden="true"><use href="#i-'+n+'"/></svg>'}
function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function copy(t,b){var d=function(){b.innerHTML=I('check')+' نُسخ'};if(navigator.clipboard)navigator.clipboard.writeText(t).then(d,function(){prompt('انسخي:',t)});else prompt('انسخي:',t)}
var LBL={is_receipt:'إيصال تحويل حقيقي',amount:'المبلغ مطابق',iban:'الحساب المستلم مطابق',recent:'التاريخ حديث',image_unique:'الإيصال لم يُستخدم سابقاً',not_suspicious:'لا علامات تعديل',note_matches:'رقم الطلب في الملاحظة',ref_unique:'رقم العملية فريد',read:'قراءة الإيصال'};
function render(){var h='';
 if(O.status==='awaiting_payment'){h+='<div class="bank"><div class="t">حوّلي <b>'+O.price+' ريال</b> إلى الحساب التالي:</div>'+
  '<div class="r"><span>الآيبان</span><span class="v">'+E(PAY.iban)+'</span><button class="cp" data-c="iban">'+I('copy')+'نسخ</button></div>'+
  '<div class="r"><span>المستفيد</span><span class="v ar">'+E(PAY.name)+'</span></div>'+(PAY.bank&&PAY.bank!=='—'?'<div class="r"><span>البنك</span><span class="v ar">'+E(PAY.bank)+'</span></div>':'')+
  '<div class="r"><span>اكتبي في الملاحظة</span><span class="v">'+E(O.id)+'</span><button class="cp" data-c="id">'+I('copy')+'نسخ</button></div></div>'+
  '<label class="drop" id="drop"><input type="file" id="file" accept="image/*" hidden><span class="ib">'+I('upload')+'</span><b>ارفعي صورة إيصال التحويل</b><span class="muted" style="font-size:.9rem">لقطة شاشة من تطبيق البنك تكفي</span></label><div id="msg" class="note" style="min-height:26px"></div>'}
 else if(O.status==='review'||O.status==='paid'){h+='<div class="card"><div class="alert info">'+I('hourglass')+'<span><b>وصلنا إيصالك</b> — '+E(O.verify&&O.verify.reason||'نراجعه الآن')+'</span></div><div style="margin-top:12px">';
  if(O.verify&&O.verify.checks){Object.keys(O.verify.checks).forEach(function(k){var v=O.verify.checks[k];h+='<div class="chk"><span class="'+(v===true?'y':v===false?'n':'u')+'">'+I(v===true?'circle-check':v===false?'circle-x':'info')+'</span>'+(LBL[k]||k)+'</div>'})}
  h+='</div><p class="note">'+I('refresh-cw')+' هذه الصفحة تتحدّث تلقائياً — احفظي رابطها.</p>'+(WA?'<a class="btn btn-wa btn-block" style="margin-top:12px" href="https://wa.me/'+WA+'?text='+encodeURIComponent('طلبي '+O.id)+'">'+I('whatsapp')+' تواصلي معنا على واتساب</a>':'')+'</div>';setTimeout(poll,8000)}
 else if(O.status==='delivered'){var d=O.delivered;h+='<div class="card"><h2 style="font-size:1.6rem">كتابك جاهز</h2><p class="muted" style="margin-top:6px">أرسلي الرابط والرمز لعاملتك — تحتاج الرمز مرة واحدة فقط.</p><div class="code">'+E(d.code)+'</div>';
  O.langs.forEach(function(l){var url=ORIGIN+'/b/'+d.token+'/'+l+'/';var msg='كتابك\\n'+url+'\\nالرمز: '+d.code;
   h+='<div class="bk"><h3>'+l.toUpperCase()+'</h3><div class="qr" data-q="'+E(url)+'"></div><div class="acts"><a class="btn btn-wa" href="https://wa.me/?text='+encodeURIComponent(msg)+'">'+I('whatsapp')+' أرسليه واتساب</a><a class="btn btn-line" href="'+url+'" target="_blank" rel="noopener">'+I('external-link')+' افتحيه</a>'+
   '<a class="btn btn-line" href="/dl/'+d.token+'/'+l+'">'+I('file-down')+' ملف بلا إنترنت</a><button class="btn btn-line" data-u="'+E(url)+'">'+I('link')+' نسخ الرابط</button></div></div>'});
  h+='<div class="alert info" style="margin-top:18px">'+I('smartphone')+'<span>آيفون: افتحي الرابط في سفاري ← مشاركة ← «إضافة إلى الشاشة الرئيسية». أندرويد: كروم ← القائمة ← «إضافة إلى الشاشة». والكتاب يشرح لها ذلك بالصوت.</span></div></div>'}
 else h+='<div class="card"><div class="alert bad">'+I('triangle-alert')+'<span>تعذّر تأكيد الدفع — تواصلي معنا لحلّ المشكلة.</span></div>'+(WA?'<a class="btn btn-wa btn-block" style="margin-top:12px" href="https://wa.me/'+WA+'">'+I('whatsapp')+' واتساب</a>':'')+'</div>';
 $('app').innerHTML=h;var f=$('file');if(f)f.onchange=function(){upload(f.files[0])};
 [].forEach.call(document.querySelectorAll('[data-q]'),function(el){el.innerHTML=qr(el.dataset.q)});
 [].forEach.call(document.querySelectorAll('[data-c]'),function(b){b.onclick=function(){copy(b.dataset.c==='iban'?PAY.iban.replace(/\\s/g,''):O.id,b)}});
 [].forEach.call(document.querySelectorAll('[data-u]'),function(b){b.onclick=function(){copy(b.dataset.u,b)}})}
function upload(file){if(!file)return;var m=$('msg');m.textContent='جاري رفع الإيصال وفحصه… (حتى 30 ثانية)';$('drop').classList.add('on');
 var fd=new FormData();fd.append('file',file);fetch('/api/orders/'+O.id+'/receipt?k='+K,{method:'POST',body:fd}).then(function(r){return r.json()}).then(function(j){if(j.error){m.textContent=j.error;$('drop').classList.remove('on');return}O=j;render()}).catch(function(){m.textContent='تعذّر الرفع، حاولي مرة ثانية';$('drop').classList.remove('on')})}
function poll(){fetch(location.href,{headers:{accept:'text/html'}}).then(function(r){return r.text()}).then(function(t){var m=/var O=(\\{.*?\\}),PAY=/.exec(t);if(m){var n=JSON.parse(m[1]);if(n.status!==O.status){O=n;render()}else setTimeout(poll,10000)}})}
${QR_LIB}
function qr(t){try{var q=qrcode(0,'M');q.addData(t);q.make();return q.createSvgTag({cellSize:4,margin:2,scalable:true})}catch(e){return''}}
render();`;
  return page({ title: `طلب ${o.id} — ${BRAND.name}`, desc: 'صفحة طلبك الخاصة', path: `/o/${o.id}`, origin, index: false, css, body, ic, nav: false, cta: false, scripts, foot: false, wa });
}

// ═══════════════════════ صفحات قانونية ═══════════════════════
export function legalPage(kind: 'privacy' | 'terms', { origin }: any) {
  const ic = new Icons();
  const P = kind === 'privacy'
    ? { t: 'سياسة الخصوصية', s: [
      ['ما نجمعه', 'اسمك ورقم جوالك (لتسليم الكتاب ووضعه في صفحة الطوارئ داخل الكتاب)، واسم العاملة إن كتبتِه، واختياراتك في الكتاب، وصورة إيصال التحويل للتحقق من الدفع.'],
      ['كيف نستخدمه', 'فقط لإنشاء كتابك وتسليمه والتحقق من الدفع ودعمك. لا نبيع بياناتك ولا نشاركها لأغراض إعلانية.'],
      ['قراءة الإيصال', 'تُقرأ صورة الإيصال آلياً لاستخراج المبلغ والتاريخ ورقم العملية، ثم تُحفظ بشكل خاص لا يصل إليه إلا فريق المراجعة.'],
      ['داخل الكتاب', 'الكتاب لا يتتبّع العاملة ولا يستخدم الكاميرا أو الموقع، ولا يرسل أي بيانات. يحفظ تقدّمها في القراءة على جوالها فقط.'],
      ['البصمة', 'كل نسخة تحمل رقم الطلب كبصمة غير مرئية لحماية حقوق النشر — لا تحتوي أي بيانات شخصية.'],
      ['حقوقك', 'يمكنك طلب حذف بياناتك في أي وقت عبر التواصل معنا، مع الاحتفاظ بما يلزم نظاماً لإثبات عملية الشراء.'],
    ] }
    : { t: 'الشروط والترخيص', s: [
      ['الترخيص', 'كل كتاب مرخّص لبيت واحد للاستخدام الشخصي. يجوز تثبيته على أجهزة العاملات في نفس البيت ضمن الباقة.'],
      ['ما لا يجوز', 'بيع النسخة أو نشرها أو مشاركتها خارج البيت أو تعديلها أو إعادة توزيعها أو استخراج محتواها أو صوتها. كل نسخة تحمل بصمة تكشف مصدرها، ويحق لنا إيقاف الرابط عند المخالفة.'],
      ['المحتوى', 'الكتاب إرشادي تعليمي ولا يغني عن الأنظمة الرسمية أو الاستشارة القانونية أو الطبية. أرقام الطوارئ للمملكة العربية السعودية.'],
      ['الدفع والتسليم', 'الدفع بتحويل بنكي. يُسلَّم الكتاب بعد التحقق من الإيصال. في حال تعذّر التحقق نتواصل معك.'],
      ['الاسترجاع', 'لأن كل كتاب يُصنع خصيصاً لبيتك، لا يُسترجع المبلغ بعد التسليم، ونصلح أي خلل تقني مجاناً.'],
    ] };
  const body = `<div class="wrap" style="max-width:820px;padding-block:clamp(36px,6vw,72px)"><span class="eyebrow">${BRAND.name}</span><h1 style="font-size:clamp(2rem,4vw,2.6rem);margin:12px 0 28px">${P.t}</h1>
${P.s.map(([h, p]) => `<section class="card" style="margin-bottom:12px"><h2 style="font-size:1.25rem">${h}</h2><p class="muted" style="margin-top:6px">${p}</p></section>`).join('')}</div>`;
  return page({ title: `${P.t} — ${BRAND.name}`, desc: `${P.t} لخدمة ${BRAND.name}.`, path: '/' + kind, origin, body, ic });
}

// ═══════════════════════ لوحة الإدارة ═══════════════════════
export function adminPage({ origin }: any) {
  const ic = new Icons();
  ['circle-check', 'ban', 'refresh-cw', 'search', 'receipt', 'log-in', 'eye'].forEach((n) => ic.i(n));
  const css = `.a{max-width:1180px;margin-inline:auto;padding-block:28px 60px}
.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:0 0 16px}.kpi .card{padding:16px;text-align:center}.kpi b{display:block;font:700 2rem/1.2 var(--fH);color:var(--plum)}
.tbl{width:100%;border-collapse:separate;border-spacing:0;font-size:.92rem;background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden}
.tbl th,.tbl td{padding:12px;border-bottom:1px solid var(--line);text-align:right;vertical-align:top}.tbl th{color:var(--plum);font-weight:700;background:var(--blush)}
.pill{display:inline-block;border-radius:999px;padding:1px 10px;font-size:.78rem;font-weight:700;border:1px solid var(--line2);color:var(--muted)}
.pill.review{color:var(--warn);border-color:rgba(233,178,92,.4)}.pill.delivered{color:var(--ok);border-color:rgba(108,196,149,.4)}.pill.rejected{color:var(--danger);border-color:rgba(238,123,109,.4)}
.rc img{max-width:220px;border-radius:10px;cursor:zoom-in;margin-top:6px}
.tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
textarea.in{min-height:100px;padding:12px}
@media(max-width:760px){.kpi{grid-template-columns:1fr 1fr}.tbl{display:block;overflow-x:auto}}`;
  const body = `<div class="wrap a">
<div id="login" class="card" style="max-width:440px;margin:40px auto"><h1 style="font-size:1.6rem">دخول الإدارة</h1><label class="fld"><span>رمز الإدارة</span><input class="in" id="tk" type="password" autocomplete="current-password"></label><button class="btn btn-gold btn-block" style="margin-top:16px" id="lg">دخول</button></div>
<div id="dash" hidden><div class="kpi" id="kpi"></div>
<div class="tabs"><button class="btn btn-line btn-sm" data-s="review">بانتظار المراجعة</button><button class="btn btn-line btn-sm" data-s="">الكل</button><button class="btn btn-line btn-sm" data-s="delivered">المسلّمة</button></div>
<table class="tbl"><thead><tr><th>الطلب</th><th>العميلة</th><th>الكتاب</th><th>الإيصال والفحص</th><th>إجراء</th></tr></thead><tbody id="rows"></tbody></table>
<div class="card" style="margin-top:20px"><h2 style="font-size:1.3rem">تتبّع نسخة مسرّبة</h2><p class="muted" style="margin-top:4px">الصقي نصاً منسوخاً من أي نسخة منتشرة — نستخرج رقم الطلب من البصمة غير المرئية.</p><textarea class="in" id="tr" style="margin-top:10px"></textarea><button class="btn btn-gold btn-sm" style="margin-top:10px" id="trb">تتبّع</button><pre id="trr" style="white-space:pre-wrap;color:var(--ink2)"></pre></div></div></div>`;
  const scripts = `
var T=sessionStorage.getItem('gh.admin')||'';function $(i){return document.getElementById(i)}function I(n){return'<svg class="i" aria-hidden="true"><use href="#i-'+n+'"/></svg>'}
function api(p,o){o=o||{};o.headers=Object.assign({authorization:'Bearer '+T,'content-type':'application/json'},o.headers||{});return fetch('/api/admin'+p,o).then(function(r){if(r.status===401){sessionStorage.removeItem('gh.admin');location.reload()}return r.json()})}
function E(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
$('lg').onclick=function(){T=$('tk').value;sessionStorage.setItem('gh.admin',T);start()};$('tk').onkeydown=function(e){if(e.key==='Enter')$('lg').onclick()};
document.addEventListener('click',function(e){var b=e.target.closest('[data-s]');if(b)load(b.dataset.s);var a=e.target.closest('[data-act]');if(a)act(a.dataset.id,a.dataset.act);var r=e.target.closest('[data-rc]');if(r){e.preventDefault();rc(r.dataset.rc)}});
function start(){$('login').hidden=true;$('dash').hidden=false;load('review');api('/stats').then(function(s){var m={};s.forEach(function(x){m[x.status]=x});$('kpi').innerHTML=[['review','بانتظار المراجعة'],['delivered','مسلّمة'],['awaiting_payment','بانتظار الدفع'],['rejected','مرفوضة']].map(function(k){var x=m[k[0]]||{n:0,s:0};return'<div class="card"><b>'+x.n+'</b>'+k[1]+(k[0]==='delivered'?'<div class="muted">'+(x.s||0)+' ريال</div>':'')+'</div>'}).join('')})}
function load(s){api('/orders'+(s?'?status='+s:'')).then(function(list){$('rows').innerHTML=list.map(function(o){var v=o.verify||{},x=v.ext||{};
 return'<tr><td><b dir="ltr">'+E(o.id)+'</b><br><span class="pill '+E(o.status)+'">'+E(o.status)+'</span><br><small class="muted">'+E(o.created_at.slice(0,16).replace('T',' '))+'</small></td><td>'+E(o.buyer_name)+'<br><a dir="ltr" href="https://wa.me/'+E((o.buyer_phone||'').replace(/^0/,'966'))+'">'+E(o.buyer_phone)+'</a></td><td>'+E(o.book_name)+'<br><small class="muted">'+E(o.langs)+' · '+o.price+' ريال · فُتح '+o.opens+' مرة</small></td>'+
 '<td class="rc">'+(o.receipt_key?'<a href="#" data-rc="'+E(o.id)+'">'+I('receipt')+' عرض الإيصال</a><div id="rc-'+E(o.id)+'"></div>':'—')+(x.amount!=null?'<small class="muted">المبلغ '+E(x.amount)+' '+E(x.currency||'')+' · آيبان …'+E(x.to_iban_last4||'?')+' · '+E(x.date||'')+' · مرجع '+E(x.reference||'')+'</small><br>':'')+'<small>'+E(v.reason||'')+'</small></td>'+
 '<td>'+(o.status==='review'||o.status==='awaiting_payment'?'<button class="btn btn-gold btn-sm" data-act="approve" data-id="'+E(o.id)+'">'+I('circle-check')+' اعتماد وتسليم</button> <button class="btn btn-line btn-sm" data-act="reject" data-id="'+E(o.id)+'">رفض</button>':'')+(o.status==='delivered'?'<code>'+E(o.code)+'</code><br><button class="btn btn-line btn-sm" data-act="reissue" data-id="'+E(o.id)+'">'+I('refresh-cw')+' إعادة إصدار</button> <button class="btn btn-line btn-sm" data-act="revoke" data-id="'+E(o.id)+'">'+I('ban')+' إيقاف</button>':'')+'</td></tr>'}).join('')||'<tr><td colspan=5 class="muted">لا شيء</td></tr>'})}
function rc(id){fetch('/api/admin/receipt/'+id,{headers:{authorization:'Bearer '+T}}).then(function(r){return r.blob()}).then(function(b){$('rc-'+id).innerHTML='<img alt="إيصال" src="'+URL.createObjectURL(b)+'">'})}
function act(id,a){if(a!=='approve'&&!confirm(a+' '+id+'؟'))return;api('/orders/'+id+'/'+a,{method:'POST',body:'{}'}).then(function(){load('')})}
$('trb').onclick=function(){api('/trace',{method:'POST',body:JSON.stringify({text:$('tr').value})}).then(function(r){$('trr').textContent=JSON.stringify(r,null,1)})};
if(T)start();`;
  return page({ title: 'لوحة الإدارة', desc: 'لوحة الإدارة', path: '/admin', origin, index: false, css, body, ic, nav: false, cta: false, scripts, foot: false });
}
