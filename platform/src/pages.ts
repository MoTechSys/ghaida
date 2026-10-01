// صفحات المنصة — HTML مولَّد من الخادم، بلا إطار، خفيف وسريع (< 40KB لكل صفحة)
// اللغة البصرية: «فخامة هادئة» — عاجي وردي + برقوقي + ذهبي رفيع (design-spec v0.2). لا كلمة «تطبيق» أبداً.

const esc = (s: any) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);

const BASE_CSS = `
:root{--ivory:#FFF7F9;--blush:#FCE4EC;--petal:#F4B6CA;--ink:#2E1F27;--muted:#6B4E5B;--rose:#A3154F;--plum:#5A1030;--plum2:#3d0a20;--gold:#C9A86A;--gold-ink:#8A6A2F;--champ:#E9D3A6;--line:#8E6577;--ok:#1E7A46;--ok-bg:#E6F4EC;--danger:#B3261E;--danger-bg:#FDECEC;--warn:#7A4A00;--warn-bg:#FFF3D6;--sh1:0 2px 12px rgba(90,16,48,.08);--sh2:0 18px 50px rgba(90,16,48,.22)}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--ivory);color:var(--ink);font:17px/1.8 'Noto Naskh Arabic','Geeza Pro','Segoe UI',Tahoma,sans-serif}
a{color:var(--rose)}button,input,select,textarea{font:inherit}
.wrap{max-width:1080px;margin:0 auto;padding:0 18px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:54px;padding:0 26px;border-radius:999px;border:0;cursor:pointer;font-weight:800;font-size:18px;text-decoration:none}
.btn.gold{background:linear-gradient(180deg,#f3e2bd,#d9bb81);color:var(--plum2);box-shadow:0 10px 24px rgba(61,10,32,.25)}
.btn.rose{background:var(--rose);color:#fff;box-shadow:0 8px 20px rgba(163,21,79,.25)}
.btn.ghost{background:#fff;color:var(--plum);border:1.5px solid var(--line)}
.btn.wa{background:#1F8F4E;color:#fff}
.btn:disabled{opacity:.5;cursor:not-allowed}
.card{background:#fff;border-radius:22px;box-shadow:var(--sh1);padding:22px}
.muted{color:var(--muted)}
.tag{display:inline-block;background:var(--blush);color:var(--rose);border-radius:999px;padding:2px 12px;font-size:13px;font-weight:700}
h1,h2,h3{font-family:'Amiri','Noto Naskh Arabic',serif;line-height:1.35;color:var(--plum)}
.top{position:sticky;top:0;z-index:20;background:rgba(255,247,249,.9);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid #f3dbe4}
.top .wrap{display:flex;align-items:center;justify-content:space-between;height:64px}
.logo{display:flex;align-items:center;gap:10px;font-weight:800;color:var(--plum);text-decoration:none;font-size:20px}
.logo i{width:38px;height:38px;border-radius:12px;background:linear-gradient(145deg,#7a1844,#3d0a20);display:flex;align-items:center;justify-content:center;font-style:normal;box-shadow:inset 0 0 0 1.5px var(--gold)}
footer{padding:40px 0 60px;color:var(--muted);font-size:14px;text-align:center}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;
const head = (title: string, extra = '') => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#5A1030"><title>${esc(title)}</title>
<meta name="description" content="كتاب بيتك التفاعلي بلغة عاملتك وبصوتها: قواعد بيتك، جدولها، السلامة، والضيافة — يعمل على أي جوال بدون إنترنت.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%235A1030'/%3E%3Ctext x='50' y='66' font-size='50' text-anchor='middle'%3E%F0%9F%8C%B8%3C/text%3E%3C/svg%3E">
<style>${BASE_CSS}${extra}</style></head><body>`;
const topbar = (cta = true) => `<header class="top"><div class="wrap"><a class="logo" href="/"><i>🌸</i>كتاب البيت</a>${cta ? '<a class="btn rose" style="min-height:44px;font-size:15px;padding:0 18px" href="/order">اطلبي كتابك</a>' : ''}</div></header>`;

// ═══════════════════════ صفحة البيع ═══════════════════════
export function landingPage({ plans, wa }: any) {
  const css = `
.hero{background:radial-gradient(120% 100% at 80% 0%,#8a1a4a 0%,var(--plum) 45%,var(--plum2) 100%);color:var(--champ);padding:56px 0 70px;position:relative;overflow:hidden}
.hero:after{content:"";position:absolute;inset:14px;border:1px solid rgba(201,168,106,.35);border-radius:28px;pointer-events:none}
.hero .g{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center}
.hero h1{color:#fff;font-size:44px;margin:12px 0}
.hero p{font-size:19px;opacity:.95;margin:0 0 24px}
.hero .tag{background:rgba(233,211,166,.15);color:var(--champ)}
.trust{display:flex;gap:18px;flex-wrap:wrap;margin-top:22px;font-size:14.5px;opacity:.9}
.phone{width:290px;height:590px;margin:0 auto;border-radius:44px;background:#1b0b13;padding:12px;box-shadow:0 30px 80px rgba(0,0,0,.45);position:relative}
.phone iframe{width:100%;height:100%;border:0;border-radius:34px;background:#3d0a20}
.phone .badge{position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);background:var(--champ);color:var(--plum2);font-weight:800;font-size:13px;border-radius:999px;padding:6px 14px;white-space:nowrap}
section{padding:64px 0}
.sh{text-align:center;max-width:720px;margin:0 auto 34px}
.sh h2{font-size:34px;margin:8px 0}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.feat .ic{width:54px;height:54px;border-radius:16px;background:var(--blush);display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:10px}
.feat h3{margin:4px 0;font-size:21px}
.pain{display:grid;grid-template-columns:1fr 1fr;gap:18px}
.pain .card{border-inline-start:4px solid var(--gold)}
.pain b{color:var(--plum)}
.steps{counter-reset:s;display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.step{position:relative;padding-top:56px}
.step:before{counter-increment:s;content:counter(s);position:absolute;top:0;right:22px;width:44px;height:44px;border-radius:50%;background:var(--plum);color:var(--champ);font:800 20px/44px system-ui;text-align:center;box-shadow:0 0 0 4px var(--blush)}
.plans{display:grid;grid-template-columns:1fr 1fr;gap:20px;max-width:820px;margin:0 auto}
.plan{position:relative}
.plan.best{background:linear-gradient(160deg,var(--plum),#7a1844);color:var(--champ)}
.plan.best h3,.plan.best .price{color:#fff}
.plan .price{font:800 44px/1 system-ui;color:var(--plum);margin:10px 0}
.plan .price small{font-size:16px;font-weight:600}
.plan ul{padding:0 20px 0 0;margin:14px 0 20px}
.plan li{margin:6px 0}
.ribbon{position:absolute;top:-12px;left:22px;background:var(--champ);color:var(--plum2);font-weight:800;font-size:13px;border-radius:999px;padding:4px 14px}
.faq details{background:#fff;border-radius:16px;box-shadow:var(--sh1);padding:14px 18px;margin-bottom:10px}
.faq summary{cursor:pointer;font-weight:800;color:var(--plum)}
.langs{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:16px}
.langs span{background:#fff;border:1px solid #f1dbe4;border-radius:999px;padding:6px 14px;font-size:15px}
.langs span.soon{opacity:.55}
.ethic{background:linear-gradient(135deg,#fff,var(--ok-bg));border:1.5px solid #bfe3cd}
@media(max-width:860px){.hero .g{grid-template-columns:1fr}.hero h1{font-size:34px}.grid3,.steps{grid-template-columns:1fr 1fr}.pain,.plans{grid-template-columns:1fr}}
@media(max-width:520px){.grid3,.steps{grid-template-columns:1fr}.phone{width:260px;height:530px}}`;
  return head('كتاب البيت — قواعد بيتك بلغة عاملتك وبصوتها', css) + topbar() + `
<div class="hero"><div class="wrap g">
  <div>
    <span class="tag">✦ نسخة خاصة باسم بيتك</span>
    <h1>قواعد بيتك… بلغة عاملتك، وبصوت تسمعه</h1>
    <p>كتاب فاخر يُصنع لبيتك أنتِ: قواعدك، جدولك، أسماء بيتك — بلغتها الأم وبالعربي، وكل جملة لها صوت. تفتحه على جوالها ويشتغل حتى بدون إنترنت.</p>
    <div style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn gold" href="/order">اصنعي كتاب بيتك ←</a><a class="btn ghost" style="background:transparent;color:var(--champ);border-color:rgba(233,211,166,.6)" href="#sample">اسمعي عيّنة مجانية</a></div>
    <div class="trust"><span>📴 يعمل بدون إنترنت</span><span>📱 آيفون وأندرويد — حتى القديمة</span><span>🔐 محمي برمز خاص ببيتك</span></div>
  </div>
  <div id="sample"><div class="phone"><iframe src="/samples/am.html" title="عيّنة" loading="lazy"></iframe><span class="badge">جرّبيها الآن — فصل السلامة بالأمهرية 🔊</span></div></div>
</div></div>

<section><div class="wrap">
  <div class="sh"><span class="tag">لكل بيت فيه عاملة — جديدة أو من سنين</span><h2>تعرفين هذا الشعور؟</h2></div>
  <div class="pain">
    <div class="card"><b>«شرحت لها مية مرة…»</b><p class="muted" style="margin:6px 0 0">الكتاب يعيد الشرح عنكِ بلغتها وبالصوت، كل مرة تحتاجه — بدون تعب ولا نرفزة.</p></div>
    <div class="card"><b>«عاملتي عندي من سنين، بس فيه أشياء تتكرر غلط»</b><p class="muted" style="margin:6px 0 0">اختاري قواعد بيتك من مكتبة جاهزة (أكثر من 60 قاعدة مترجمة ومسجّلة)، وتصير مرجعاً ثابتاً بينكم.</p></div>
    <div class="card"><b>«أخاف على عيالي من المنظفات والغاز»</b><p class="muted" style="margin:6px 0 0">فصل السلامة: لا تخلطي الكلوركس، الزيت المشتعل، الأطفال قرب الماء — مع زر طوارئ يتصل بـ911 مباشرة.</p></div>
    <div class="card"><b>«ما نفهم على بعض»</b><p class="muted" style="margin:6px 0 0">«ردودي»: تضغط العاملة جملة بلغتها، فيسمعها جوالها بالعربي بصوت عالٍ: «المنظف خلص»، «الطفل يبكي»، «أنا مريضة».</p></div>
  </div>
</div></section>

<section style="background:#fff"><div class="wrap">
  <div class="sh"><span class="tag">ما يميّزه عن أي ملف PDF</span><h2>مصنوع لبيتك أنتِ — لا ملفاً عاماً</h2></div>
  <div class="grid3">
    <div class="card feat"><div class="ic">🏡</div><h3>باسم بيتك</h3><p class="muted">تختارين اسم الكتاب وأيقونته — يظهر على شاشة جوالها كأنه كتاب خاص، لا «تطبيق».</p></div>
    <div class="card feat"><div class="ic">🔊</div><h3>صوت لكل جملة</h3><p class="muted">بلغتها وبالعربي. كثير من العاملات قراءتهن ضعيفة — الصوت يحل هذا.</p></div>
    <div class="card feat"><div class="ic">🗓️</div><h3>جدولها اليومي</h3><p class="muted">تحددين المواعيد، ونتحقق تلقائياً أنها ضمن النظام (10 ساعات، راحة، يوم إجازة) — راحة بال قانونية لكِ.</p></div>
    <div class="card feat"><div class="ic">🗣️</div><h3>«قولي لعاملتك»</h3><p class="muted">تضغطين جملة بالعربي («نظفي هذا»، «شوي شوي») فتسمعها بلغتها فوراً.</p></div>
    <div class="card feat"><div class="ic">📴</div><h3>بدون إنترنت</h3><p class="muted">بعد أول فتح يعمل دائماً — خفيف جداً على الجوالات القديمة ولا يعلّق.</p></div>
    <div class="card feat"><div class="ic">🔐</div><h3>نسختك أنتِ</h3><p class="muted">مقفل برمز خاص، ويحمل بصمة باسم بيتك. الطوارئ تبقى مفتوحة دائماً.</p></div>
  </div>
  <div class="langs"><span>አማርኛ أمهري ✓</span><span class="soon">Tagalog فلبيني — قريباً</span><span class="soon">বাংলা بنغالي — قريباً</span><span class="soon">English — قريباً</span><span class="soon">Afaan Oromoo أورومو — قريباً</span><span class="soon">සිංහල سنهالي — قريباً</span><span class="soon">Indonesia — قريباً</span><span class="soon">اردو — قريباً</span></div>
</div></section>

<section><div class="wrap">
  <div class="sh"><h2>جاهز خلال دقائق</h2></div>
  <div class="steps">
    <div class="card step"><h3>اختاري لغتها</h3><p class="muted">وجنسيتها، واسم الكتاب.</p></div>
    <div class="card step"><h3>قواعد بيتك</h3><p class="muted">اختاري من المكتبة، وحددي جدولها ويوم راحتها.</p></div>
    <div class="card step"><h3>حوّلي وارفعي الإيصال</h3><p class="muted">نتحقق منه ونجهّز كتابك.</p></div>
    <div class="card step"><h3>أرسليه لها</h3><p class="muted">رابط + رمز على واتساب، أو ملف واحد يُفتح بلا إنترنت.</p></div>
  </div>
</div></section>

<section style="background:#fff" id="plans"><div class="wrap">
  <div class="sh"><h2>الباقات</h2><p class="muted">دفعة واحدة. بدون اشتراك.</p></div>
  <div class="plans">
    <div class="card plan"><h3>${esc(plans.basic.label)}</h3><div class="price">${plans.basic.price} <small>ر.س</small></div>
      <ul><li>كتاب كامل بلغة واحدة + العربية</li><li>8 فصول + قواعد بيتك + جدولها</li><li>صوت لكل جملة</li><li>«ردودي» و«قولي لعاملتك»</li><li>رابط + ملف بدون إنترنت</li></ul>
      <a class="btn ghost" style="width:100%" href="/order?plan=basic">اختاري</a></div>
    <div class="card plan best"><span class="ribbon">للبيوت الكبيرة</span><h3>${esc(plans.plus.label)}</h3><div class="price">${plans.plus.price} <small>ر.س</small></div>
      <ul><li>كتابان — لكل عاملة بلغتها واسمها</li><li>نفس قواعد البيت للجميع</li><li>كل مزايا الكتاب الشخصي</li><li>إعادة إصدار مجانية عند تغيير العاملة</li></ul>
      <a class="btn gold" style="width:100%" href="/order?plan=plus">اختاري</a></div>
  </div>
</div></section>

<section><div class="wrap">
  <div class="card ethic" style="max-width:820px;margin:0 auto"><h3 style="margin-top:0">🤝 كتاب يحترم الطرفين</h3>
    <p class="muted" style="margin:0">فيه حقوق العاملة من نظام العمالة المنزلية الرسمي (ساعات العمل، الراحة، يوم الإجازة، الجواز حقها) — لأن العاملة التي تشعر بالاحترام تلتزم أكثر. لا كاميرا، لا تتبع، لا مراقبة.</p></div>
</div></section>

<section class="faq"><div class="wrap" style="max-width:820px">
  <div class="sh"><h2>أسئلة شائعة</h2></div>
  <details><summary>هل يحتاج تحميل من المتجر؟</summary><p class="muted">لا. هو كتاب يُفتح من رابط أو ملف. وإذا حبّت، تضعه على شاشة جوالها بضغطتين (نوضح لها بالصوت بلغتها).</p></details>
  <details><summary>جوالها قديم، يشتغل؟</summary><p class="muted">مصمم ليكون خفيفاً جداً: يفتح في أقل من ثانيتين حتى على الجوالات البطيئة، والصوت يُحمَّل فصلاً فصلاً فلا يثقل الذاكرة. يدعم آيفون (iOS 12+) وأندرويد (كروم 70+).</p></details>
  <details><summary>عاملتي عندها من سنين، يفيدني؟</summary><p class="muted">نعم — أغلب عميلاتنا كذلك. «قواعد بيتك» و«ردودي» و«قولي لعاملتك» تُستخدم كل يوم، لا في الأسبوع الأول فقط.</p></details>
  <details><summary>غيّرت العاملة، أشتري من جديد؟</summary><p class="muted">باقة البيت الكبير تشمل إعادة إصدار مجانية بلغة العاملة الجديدة بنفس قواعد بيتك.</p></details>
  <details><summary>هل الترجمة دقيقة؟</summary><p class="muted">كل جملة مرّت بترجمة ثم مراجعة لغوية آلية ثانية تبحث عن قلب المعنى (خصوصاً فصل السلامة). نعمل على مراجعة بشرية من ناطقات أصليات لكل لغة.</p></details>
  <details><summary>كيف أدفع؟</summary><p class="muted">تحويل بنكي ثم ترفعين صورة الإيصال. نتحقق منه ونرسل كتابك. ${wa ? `للمساعدة: <a href="https://wa.me/${esc(wa)}">واتساب</a>.` : ''}</p></details>
</div></section>
<footer><div class="wrap">كتاب البيت · صُنع بعناية في السعودية 🌸<br><span style="font-size:12px">جميع الحقوق محفوظة. كل نسخة مرخصة لبيت واحد.</span></div></footer>
</body></html>`;
}

// ═══════════════════════ معالج الطلب ═══════════════════════
export function orderPage({ catalog, plans }: any) {
  const css = `
.wiz{max-width:720px;margin:24px auto 80px}
.prog{display:flex;gap:6px;margin-bottom:18px}.prog i{flex:1;height:5px;border-radius:9px;background:#f1dbe4}.prog i.on{background:var(--rose)}
.pane{display:none}.pane.on{display:block;animation:f .25s}@keyframes f{from{opacity:0;transform:translateY(6px)}}
label{display:block;font-weight:800;margin:14px 0 6px;color:var(--plum)}
input[type=text],input[type=tel],input[type=time],select{width:100%;height:52px;border-radius:14px;border:1.5px solid var(--line);padding:0 14px;background:#fff;font-size:17px}
input:focus,select:focus{outline:3px solid var(--petal);border-color:var(--rose)}
.opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.opt{border:2px solid #f1dbe4;border-radius:16px;background:#fff;padding:12px;cursor:pointer;text-align:center;min-height:64px}
.opt.on{border-color:var(--rose);background:var(--blush)}
.opt.dis{opacity:.45;pointer-events:none}
.opt b{display:block;font-size:18px}
.icons{display:flex;flex-wrap:wrap;gap:8px}.icons button{width:52px;height:52px;border-radius:14px;border:2px solid #f1dbe4;background:#fff;font-size:26px;cursor:pointer}.icons button.on{border-color:var(--rose);background:var(--blush)}
.cover{background:radial-gradient(120% 90% at 50% 0%,#7a1844,var(--plum) 45%,var(--plum2));color:var(--champ);border-radius:22px;padding:26px;text-align:center;margin:16px 0;box-shadow:var(--sh2);outline:1px solid var(--gold);outline-offset:-10px}
.cover .n{font-family:Amiri,serif;font-size:30px;color:#fff}
.cat{margin:14px 0}.cat h4{margin:0 0 6px;color:var(--plum);font-size:17px}
.rule{display:flex;gap:10px;align-items:flex-start;background:#fff;border-radius:12px;padding:10px 12px;margin:6px 0;cursor:pointer;border:1.5px solid transparent}
.rule.on{border-color:var(--rose);background:#fff5f8}
.rule input{width:22px;height:22px;margin-top:4px;accent-color:var(--rose)}
.rule .lv{font-size:12px;font-weight:800;color:var(--danger)}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.brk{display:grid;grid-template-columns:1fr 1fr 44px;gap:8px;margin:6px 0}
.brk button{border:0;background:var(--danger-bg);color:var(--danger);border-radius:12px;font-size:20px;cursor:pointer}
.legal{border-radius:14px;padding:12px 14px;margin-top:12px;font-weight:700}
.legal.ok{background:var(--ok-bg);color:var(--ok)}.legal.bad{background:var(--danger-bg);color:var(--danger)}
.nav{display:flex;gap:10px;margin-top:22px}.nav .btn{flex:1}
.sum{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #f1dbe4}
.err{color:var(--danger);font-weight:700;min-height:28px;margin-top:8px}`;
  const langs = Object.entries<any>(catalog.languages);
  const lib = catalog.library || [];
  return head('اصنعي كتاب بيتك', css) + topbar(false) + `
<div class="wrap wiz">
  <div class="prog"><i class="on"></i><i></i><i></i><i></i></div>
  <form id="f" onsubmit="return false">
  <div class="pane on" data-p="0">
    <h2 style="margin:0">١. لمن الكتاب؟</h2>
    <label>الباقة</label>
    <div class="opts" id="plans">
      <div class="opt on" data-plan="basic"><b>${esc(plans.basic.label)}</b>${plans.basic.price} ر.س · عاملة واحدة</div>
      <div class="opt" data-plan="plus"><b>${esc(plans.plus.label)}</b>${plans.plus.price} ر.س · عاملتان</div>
    </div>
    <div id="workers"></div>
  </div>
  <div class="pane" data-p="1">
    <h2 style="margin:0">٢. سمّي كتابك</h2>
    <p class="muted">هذا الاسم يظهر على الغلاف وعلى شاشة جوالها.</p>
    <label for="bn">اسم الكتاب</label><input type="text" id="bn" maxlength="22" placeholder="دليل بيت أم سارة" value="دليل بيت ">
    <label>الأيقونة</label><div class="icons" id="icons">${['🌸', '🌷', '🌺', '🏡', '🌙', '⭐', '🕊️', '💎', '🌿', '☕'].map((i, n) => `<button type="button" class="${n ? '' : 'on'}" data-i="${i}">${i}</button>`).join('')}</div>
    <div class="cover"><div style="font-size:13px;opacity:.85">كتاب خاص ببيت</div><div class="n" id="cvn">دليل بيت</div><div style="font-size:40px" id="cvi">🌸</div></div>
  </div>
  <div class="pane" data-p="2">
    <h2 style="margin:0">٣. قواعد بيتك وجدولها</h2>
    <p class="muted">اخترنا لكِ الأساسيات. أضيفي أو احذفي ما تريدين — كل قاعدة مترجمة ومسجّلة بصوت.</p>
    <div id="lib">${lib.map((c: any) => `<div class="cat"><h4>${c.icon} ${esc(c.title)}</h4>${c.rules.map((r: any) => `<label class="rule ${r.default ? 'on' : ''}"><input type="checkbox" value="${r.id}" ${r.default ? 'checked' : ''}><span><span style="font-weight:600">${r.icon || ''} ${esc(r.text)}</span>${r.level === 'danger' ? ' <span class="lv">خطر</span>' : ''}</span></label>`).join('')}</div>`).join('')}</div>
    <h3>جدول يومها</h3>
    <div class="row2"><div><label>بداية العمل</label><input type="time" id="s_start" value="07:00"></div><div><label>نهاية العمل</label><input type="time" id="s_end" value="20:30"></div></div>
    <label>الاستراحات</label><div id="brks"></div><button type="button" class="btn ghost" id="addb" style="min-height:44px;font-size:15px">+ استراحة</button>
    <label>يوم راحتها الأسبوعي</label><select id="s_rest">${['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((d, i) => `<option value="${i}" ${i === 5 ? 'selected' : ''}>${d}</option>`).join('')}</select>
    <div class="legal" id="legal"></div>
  </div>
  <div class="pane" data-p="3">
    <h2 style="margin:0">٤. بياناتك</h2>
    <label for="nm">اسمك</label><input type="text" id="nm" placeholder="أم سارة">
    <label for="ph">جوالك (واتساب)</label><input type="tel" id="ph" placeholder="05xxxxxxxx" inputmode="tel" dir="ltr">
    <p class="muted" style="font-size:14px">رقمك يظهر في صفحة الطوارئ داخل الكتاب حتى تتصل بك العاملة بضغطة. لا نشاركه مع أحد.</p>
    <div class="card" style="margin-top:14px" id="summary"></div>
  </div>
  <div class="err" id="err"></div>
  <div class="nav"><button type="button" class="btn ghost" id="back">السابق</button><button type="button" class="btn rose" id="next">التالي</button></div>
  </form>
</div>
<script>
var CAT=${JSON.stringify({ languages: catalog.languages }).replace(/</g, '\\u003c')}, PLANS=${JSON.stringify(plans)};
var st={plan:new URLSearchParams(location.search).get('plan')==='plus'?'plus':'basic',p:0,icon:'🌸',langs:[],workers:[]};
function $(i){return document.getElementById(i)}
function q(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function renderWorkers(){var n=PLANS[st.plan].langs,h='';for(var w=0;w<n;w++){h+='<label>'+(n>1?'العاملة '+(w+1)+' — ':'')+'لغتها</label><div class="opts" data-w="'+w+'">';
 Object.keys(CAT.languages).forEach(function(k){var L=CAT.languages[k];h+='<div class="opt'+(st.langs[w]===k?' on':'')+(L.ready?'':' dis')+'" data-lang="'+k+'"><b>'+L.native+'</b>'+L.name+(L.ready?'':' · قريباً')+'</div>'});
 h+='</div><label>اسمها (اختياري — يظهر في ترحيب الكتاب)</label><input type="text" class="wn" data-w="'+w+'" maxlength="24" value="'+(st.workers[w]||'')+'" placeholder="مثال: Almaz">'}
 $('workers').innerHTML=h; q('#plans .opt').forEach(function(o){o.classList.toggle('on',o.dataset.plan===st.plan)})}
document.addEventListener('click',function(e){var o=e.target.closest('.opt');if(o){if(o.dataset.plan){st.plan=o.dataset.plan;st.langs=st.langs.slice(0,PLANS[st.plan].langs);renderWorkers()}
 else if(o.dataset.lang){var w=+o.parentNode.dataset.w;st.langs[w]=o.dataset.lang;renderWorkers()}}
 var ib=e.target.closest('#icons button');if(ib){st.icon=ib.dataset.i;q('#icons button').forEach(function(b){b.classList.toggle('on',b===ib)});$('cvi').textContent=st.icon}
 var r=e.target.closest('.rule');if(r){setTimeout(function(){r.classList.toggle('on',r.querySelector('input').checked)},0)}});
document.addEventListener('input',function(e){if(e.target.classList.contains('wn'))st.workers[+e.target.dataset.w]=e.target.value;if(e.target.id==='bn')$('cvn').textContent=e.target.value||'—';
 if(/^s_/.test(e.target.id)||e.target.closest('#brks'))checkSched()});
function brk(a,b){var d=document.createElement('div');d.className='brk';d.innerHTML='<input type="time" value="'+a+'"><input type="time" value="'+b+'"><button type="button" aria-label="حذف">×</button>';d.querySelector('button').onclick=function(){d.remove();checkSched()};$('brks').appendChild(d)}
[['10:00','10:30'],['13:30','16:00'],['19:30','20:00']].forEach(function(x){brk(x[0],x[1])});$('addb').onclick=function(){brk('17:00','17:30');checkSched()};
function sched(){return{start:$('s_start').value,end:$('s_end').value,breaks:q('#brks .brk').map(function(d){var i=d.querySelectorAll('input');return[i[0].value,i[1].value]}).filter(function(x){return x[0]&&x[1]}),rest_day:+$('s_rest').value}}
var legalOK=true,tmr;function checkSched(){clearTimeout(tmr);tmr=setTimeout(function(){fetch('/api/schedule/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(sched())}).then(function(r){return r.json()}).then(function(j){legalOK=j.ok;var L=$('legal');L.className='legal '+(j.ok?'ok':'bad');L.textContent=j.ok?('✓ مطابق للنظام: '+j.workH+' ساعات عمل · '+j.restH+' ساعة راحة ليلية متواصلة'):('⚠️ '+j.error)})},250)}
function go(d){var err='';if(d>0){if(st.p===0&&st.langs.filter(Boolean).length<PLANS[st.plan].langs)err='اختاري لغة '+(PLANS[st.plan].langs>1?'كل عاملة':'العاملة');
 if(st.p===1&&$('bn').value.trim().length<3)err='اكتبي اسم الكتاب';if(st.p===2&&!legalOK)err='عدّلي الجدول ليطابق النظام أولاً'}
 $('err').textContent=err;if(err)return;if(st.p===3&&d>0)return submit();
 st.p=Math.max(0,Math.min(3,st.p+d));q('.pane').forEach(function(p){p.classList.toggle('on',+p.dataset.p===st.p)});q('.prog i').forEach(function(i,n){i.classList.toggle('on',n<=st.p)});
 $('back').style.visibility=st.p?'visible':'hidden';$('next').textContent=st.p===3?'أكّدي الطلب — '+PLANS[st.plan].price+' ر.س':'التالي';if(st.p===3)summary();scrollTo(0,0)}
function rules(){return q('#lib input:checked').map(function(i){return i.value})}
function summary(){var s=sched();$('summary').innerHTML='<div class="sum"><span>الباقة</span><b>'+PLANS[st.plan].label+'</b></div><div class="sum"><span>الكتاب</span><b>'+st.icon+' '+$('bn').value+'</b></div><div class="sum"><span>اللغة</span><b>'+st.langs.map(function(l){return CAT.languages[l].native}).join(' + ')+'</b></div><div class="sum"><span>قواعد البيت</span><b>'+rules().length+' قاعدة</b></div><div class="sum"><span>الدوام</span><b dir="ltr">'+s.start+' – '+s.end+'</b></div><div class="sum" style="border:0"><span>المجموع</span><b style="font-size:22px;color:var(--rose)">'+PLANS[st.plan].price+' ر.س</b></div>'}
function submit(){var nb=$('next');nb.disabled=true;nb.textContent='لحظة…';
 fetch('/api/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({plan:st.plan,langs:st.langs,workers:st.workers,book_name:$('bn').value.trim(),home_name:$('bn').value.trim(),icon:st.icon,rules:rules(),schedule:sched(),buyer_name:$('nm').value,buyer_phone:$('ph').value})})
 .then(function(r){return r.json()}).then(function(j){if(j.error){$('err').textContent=j.error;nb.disabled=false;go(0);return}try{localStorage.setItem('gh.lastOrder',j.url)}catch(e){}location.href=j.url}).catch(function(){$('err').textContent='تعذّر الاتصال، حاولي مرة ثانية';nb.disabled=false})}
$('next').onclick=function(){go(1)};$('back').onclick=function(){go(-1)};$('back').style.visibility='hidden';renderWorkers();checkSched();
</script></body></html>`;
}

// ═══════════════════════ صفحة الطلب: الدفع ← التحقق ← التسليم ═══════════════════════
export function statusPage({ o, pay, wa, origin }: any) {
  const css = `
.box{max-width:680px;margin:24px auto 80px}
.st{display:flex;gap:8px;margin:10px 0 18px}.st span{flex:1;text-align:center;font-size:13px;padding:8px 4px;border-radius:12px;background:#f6e6ec;color:var(--muted);font-weight:700}.st span.on{background:var(--rose);color:#fff}.st span.dn{background:var(--ok);color:#fff}
.bank{background:linear-gradient(135deg,var(--plum),#7a1844);color:var(--champ);border-radius:22px;padding:20px}
.bank .r{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(233,211,166,.2)}
.bank .r:last-child{border:0}.bank b{color:#fff;direction:ltr;font-family:ui-monospace,Menlo,monospace;letter-spacing:.5px}
.copy{border:1px solid rgba(233,211,166,.6);background:transparent;color:var(--champ);border-radius:10px;padding:4px 10px;cursor:pointer;font-size:13px;min-height:36px}
.drop{border:2.5px dashed var(--petal);border-radius:22px;padding:28px;text-align:center;background:#fff;cursor:pointer;margin-top:16px}
.drop.on{border-color:var(--rose);background:var(--blush)}
.chk{display:flex;gap:8px;align-items:center;padding:6px 0}.chk .y{color:var(--ok)}.chk .n{color:var(--danger)}.chk .u{color:var(--muted)}
.code{font:800 34px/1 ui-monospace,Menlo,monospace;letter-spacing:4px;color:var(--plum);background:var(--blush);border-radius:16px;padding:16px;text-align:center;direction:ltr}
.qr{display:flex;justify-content:center;margin:14px 0}.qr svg{width:180px;height:180px;background:#fff;padding:8px;border-radius:14px;box-shadow:var(--sh1)}
.bk{border-top:1px dashed #f1dbe4;padding-top:14px;margin-top:14px}
.acts{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}`;
  const steps = ['الطلب', 'الدفع', 'التحقق', 'كتابك'];
  const idx = o.status === 'awaiting_payment' ? 1 : o.status === 'review' || o.status === 'paid' ? 2 : o.status === 'delivered' ? 3 : 1;
  return head(`طلب ${o.id}`, css) + topbar(false) + `<div class="wrap box">
  <div class="st">${steps.map((s, i) => `<span class="${i < idx ? 'dn' : i === idx ? 'on' : ''}">${i < idx ? '✓ ' : ''}${s}</span>`).join('')}</div>
  <div class="card"><div style="display:flex;align-items:center;gap:12px"><span style="font-size:40px">${esc(o.icon)}</span><div><h2 style="margin:0">${esc(o.book_name)}</h2><span class="muted">رقم الطلب <b dir="ltr">${o.id}</b> · ${o.price} ر.س</span></div></div></div>
  <div id="app" style="margin-top:16px"></div>
</div>
<script>
var O=${JSON.stringify(o).replace(/</g, '\\u003c')},PAY=${JSON.stringify(pay)},WA=${JSON.stringify(wa)},ORIGIN=${JSON.stringify(origin)},K=new URLSearchParams(location.search).get('k');
function $(i){return document.getElementById(i)}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function copy(t,b){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){b.textContent='✓ نُسخ'},function(){prompt('انسخي:',t)})}
var LBL={is_receipt:'إيصال تحويل حقيقي',amount:'المبلغ مطابق',iban:'الحساب المستلم مطابق',recent:'التاريخ حديث',image_unique:'الإيصال لم يُستخدم سابقاً',not_suspicious:'لا علامات تعديل',note_matches:'رقم الطلب في الملاحظة',ref_unique:'رقم العملية فريد',read:'قراءة الإيصال'};
function render(){var h='';
 if(O.status==='awaiting_payment'){h+='<div class="bank"><div style="font-weight:800;margin-bottom:6px">حوّلي '+O.price+' ر.س إلى:</div>'+
  '<div class="r"><span>الآيبان</span><b>'+esc(PAY.iban)+'</b><button class="copy" onclick="copy(PAY.iban.replace(/\\\\s/g,\\'\\'),this)">نسخ</button></div>'+
  '<div class="r"><span>المستفيد</span><b style="font-family:inherit">'+esc(PAY.name)+'</b></div>'+(PAY.bank?'<div class="r"><span>البنك</span><b style="font-family:inherit">'+esc(PAY.bank)+'</b></div>':'')+
  '<div class="r"><span>اكتبي في الملاحظة</span><b>'+O.id+'</b><button class="copy" onclick="copy(O.id,this)">نسخ</button></div></div>'+
  '<label class="drop" id="drop"><input type="file" id="file" accept="image/*" hidden><div style="font-size:40px">🧾</div><b>ارفعي صورة إيصال التحويل</b><div class="muted" style="font-size:14px">لقطة شاشة من تطبيق البنك تكفي</div></label><div id="msg" class="muted" style="margin-top:10px;min-height:24px"></div>'}
 else if(O.status==='review'||O.status==='paid'){h+='<div class="card"><h3 style="margin-top:0">⏳ وصلنا إيصالك</h3><p>'+esc(O.verify&&O.verify.reason||'نراجعه الآن')+'</p>';
  if(O.verify&&O.verify.checks){Object.keys(O.verify.checks).forEach(function(k){var v=O.verify.checks[k];h+='<div class="chk"><span class="'+(v===true?'y':v===false?'n':'u')+'">'+(v===true?'✓':v===false?'✕':'•')+'</span>'+(LBL[k]||k)+'</div>'})}
  h+='<p class="muted" style="font-size:14px">هذه الصفحة تتحدّث تلقائياً. احفظي رابطها.</p>'+(WA?'<a class="btn wa" href="https://wa.me/'+WA+'?text='+encodeURIComponent('طلبي '+O.id)+'">تواصلي معنا على واتساب</a>':'')+'</div>';setTimeout(poll,8000)}
 else if(O.status==='delivered'){var d=O.delivered;h+='<div class="card"><h2 style="margin-top:0">🌸 كتابك جاهز</h2><p class="muted">أرسلي الرابط والرمز لعاملتك. تحتاج الرمز مرة واحدة فقط.</p><div class="code">'+esc(d.code)+'</div>';
  O.langs.forEach(function(l){var url=ORIGIN+'/b/'+d.token+'/'+l+'/';var msg='كتابك 📖\\n'+url+'\\nالرمز: '+d.code;
   h+='<div class="bk"><b>'+l.toUpperCase()+'</b><div class="qr" data-q="'+esc(url)+'"></div><div class="acts"><a class="btn wa" href="https://wa.me/?text='+encodeURIComponent(msg)+'">أرسليه واتساب</a><a class="btn ghost" href="'+url+'" target="_blank">افتحيه</a>'+
   '<a class="btn ghost" href="/dl/'+d.token+'/'+l+'">ملف بدون إنترنت ⬇</a><button class="btn ghost" onclick="copy(\\''+url+'\\',this)">نسخ الرابط</button></div></div>'});
  h+='<p class="muted" style="font-size:14px;margin-bottom:0">💡 آيفون: افتحي الرابط في سفاري ← مشاركة ← «إضافة إلى الشاشة الرئيسية». أندرويد: كروم ← ⋮ ← «إضافة إلى الشاشة». الكتاب نفسه يشرح لها هذا بالصوت.</p></div>'}
 else h+='<div class="card"><h3>تعذّر تأكيد الدفع</h3><p>تواصلي معنا لحل المشكلة.</p>'+(WA?'<a class="btn wa" href="https://wa.me/'+WA+'">واتساب</a>':'')+'</div>';
 $('app').innerHTML=h;var f=$('file');if(f)f.onchange=function(){upload(f.files[0])};
 [].forEach.call(document.querySelectorAll('[data-q]'),function(el){el.innerHTML=qr(el.dataset.q)})}
function upload(file){if(!file)return;var m=$('msg');m.textContent='جاري رفع الإيصال وفحصه… (حتى 30 ثانية)';$('drop').classList.add('on');
 var fd=new FormData();fd.append('file',file);fetch('/api/orders/'+O.id+'/receipt?k='+K,{method:'POST',body:fd}).then(function(r){return r.json()}).then(function(j){if(j.error){m.textContent='⚠️ '+j.error;$('drop').classList.remove('on');return}O=j;render()}).catch(function(){m.textContent='تعذّر الرفع، حاولي مرة ثانية'})}
function poll(){fetch(location.href,{headers:{accept:'text/html'}}).then(function(r){return r.text()}).then(function(t){var m=/var O=(\\{.*?\\}),PAY=/.exec(t);if(m){var n=JSON.parse(m[1]);if(n.status!==O.status){O=n;render()}else setTimeout(poll,10000)}})}
${QR_JS}
render();
</script></body></html>`;
}

// مولّد QR صغير (حزمة qrcode-generator مضمّنة وقت البناء عبر esbuild)
const QR_JS = `function qr(t){try{var q=qrcode(0,'M');q.addData(t);q.make();return q.createSvgTag({cellSize:4,margin:2,scalable:true})}catch(e){return ''}}`;

// ═══════════════════════ لوحة الإدارة ═══════════════════════
export function adminPage() {
  const css = `.a{max-width:1100px;margin:20px auto 60px}table{width:100%;border-collapse:collapse;background:#fff;border-radius:16px;overflow:hidden;box-shadow:var(--sh1);font-size:14.5px}
th,td{padding:10px;border-bottom:1px solid #f3e3ea;text-align:right;vertical-align:top}th{background:var(--blush);color:var(--plum)}
.pill{border-radius:999px;padding:2px 10px;font-size:12px;font-weight:800}.awaiting_payment{background:#eee}.review{background:var(--warn-bg);color:var(--warn)}.delivered{background:var(--ok-bg);color:var(--ok)}.rejected{background:var(--danger-bg);color:var(--danger)}
.btn.s{min-height:36px;font-size:13px;padding:0 12px}.rc img{max-width:220px;border-radius:10px;cursor:zoom-in}
.kpi{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:14px 0}.kpi .card{padding:14px;text-align:center}.kpi b{display:block;font:800 26px system-ui;color:var(--plum)}
textarea{width:100%;min-height:90px;border-radius:12px;border:1.5px solid var(--line);padding:10px}`;
  return head('لوحة الإدارة', css) + topbar(false) + `<div class="wrap a">
<div id="login" class="card" style="max-width:420px;margin:40px auto"><h3>دخول الإدارة</h3><input id="tk" type="password" placeholder="ADMIN_TOKEN" style="width:100%;height:50px;border-radius:12px;border:1.5px solid var(--line);padding:0 12px"><button class="btn rose" style="width:100%;margin-top:10px" onclick="login()">دخول</button></div>
<div id="dash" style="display:none"><div class="kpi" id="kpi"></div>
<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px"><button class="btn ghost s" onclick="load('review')">بانتظار المراجعة</button><button class="btn ghost s" onclick="load('')">الكل</button><button class="btn ghost s" onclick="load('delivered')">المسلّمة</button></div>
<table><thead><tr><th>الطلب</th><th>العميلة</th><th>الكتاب</th><th>الإيصال والفحص</th><th>إجراء</th></tr></thead><tbody id="rows"></tbody></table>
<div class="card" style="margin-top:20px"><h3 style="margin-top:0">🔎 تتبّع نسخة مسرّبة</h3><p class="muted">الصقي نصاً منسوخاً من أي نسخة منتشرة (فقرة من الكتاب) — نستخرج رقم الطلب من البصمة غير المرئية.</p><textarea id="tr"></textarea><button class="btn rose s" onclick="trace()">تتبّع</button><pre id="trr"></pre></div></div></div>
<script>
var T=sessionStorage.getItem('gh.admin')||'';function $(i){return document.getElementById(i)}
function api(p,o){o=o||{};o.headers=Object.assign({authorization:'Bearer '+T,'content-type':'application/json'},o.headers||{});return fetch('/api/admin'+p,o).then(function(r){if(r.status===401){sessionStorage.removeItem('gh.admin');location.reload()}return r.json()})}
function login(){T=$('tk').value;sessionStorage.setItem('gh.admin',T);start()}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function start(){$('login').style.display='none';$('dash').style.display='block';load('review');api('/stats').then(function(s){var m={};s.forEach(function(x){m[x.status]=x});$('kpi').innerHTML=[['review','بانتظار المراجعة'],['delivered','مسلّمة'],['awaiting_payment','بانتظار الدفع'],['rejected','مرفوضة']].map(function(k){var x=m[k[0]]||{n:0,s:0};return'<div class="card"><b>'+x.n+'</b>'+k[1]+(k[0]==='delivered'?'<br><span class="muted">'+(x.s||0)+' ر.س</span>':'')+'</div>'}).join('')})}
function load(s){api('/orders'+(s?'?status='+s:'')).then(function(list){$('rows').innerHTML=list.map(function(o){var v=o.verify||{},x=v.ext||{};
 return'<tr><td><b dir="ltr">'+o.id+'</b><br><span class="pill '+o.status+'">'+o.status+'</span><br><small>'+o.created_at.slice(0,16).replace('T',' ')+'</small></td><td>'+esc(o.buyer_name)+'<br><a dir="ltr" href="https://wa.me/'+esc((o.buyer_phone||'').replace(/^0/,'966'))+'">'+esc(o.buyer_phone)+'</a></td><td>'+esc(o.icon)+' '+esc(o.book_name)+'<br><small>'+esc(o.langs)+' · '+o.price+' ر.س · فُتح '+o.opens+'×</small></td>'+
 '<td class="rc">'+(o.receipt_key?'<a href="#" onclick="rc(\\''+o.id+'\\');return false">عرض الإيصال</a><div id="rc-'+o.id+'"></div>':'—')+(x.amount!=null?'<small>المبلغ '+x.amount+' '+(x.currency||'')+' · آيبان …'+(x.to_iban_last4||'?')+' · '+(x.date||'')+' · مرجع '+esc(x.reference||'')+'</small><br>':'')+'<small>'+esc(v.reason||'')+'</small></td>'+
 '<td>'+(o.status==='review'||o.status==='awaiting_payment'?'<button class="btn rose s" onclick="act(\\''+o.id+'\\',\\'approve\\')">✓ اعتماد وتسليم</button> <button class="btn ghost s" onclick="act(\\''+o.id+'\\',\\'reject\\')">رفض</button>':'')+(o.status==='delivered'?'<code>'+esc(o.code)+'</code><br><button class="btn ghost s" onclick="act(\\''+o.id+'\\',\\'reissue\\')">إعادة إصدار</button> <button class="btn ghost s" onclick="act(\\''+o.id+'\\',\\'revoke\\')">إيقاف</button>':'')+'</td></tr>'}).join('')||'<tr><td colspan=5 class="muted">لا شيء</td></tr>'})}
function rc(id){fetch('/api/admin/receipt/'+id,{headers:{authorization:'Bearer '+T}}).then(function(r){return r.blob()}).then(function(b){$('rc-'+id).innerHTML='<img src="'+URL.createObjectURL(b)+'" onclick="window.open(this.src)">'})}
function act(id,a){if(a!=='approve'&&!confirm(a+' '+id+'؟'))return;api('/orders/'+id+'/'+a,{method:'POST',body:'{}'}).then(function(){load('')})}
function trace(){api('/trace',{method:'POST',body:JSON.stringify({text:$('tr').value})}).then(function(r){$('trr').textContent=JSON.stringify(r,null,1)})}
if(T)start();
</script></body></html>`;
}
