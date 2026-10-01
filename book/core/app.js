/* app.js — محرك «كتاب البيت» (يُضمَّن داخل الملف عند البناء).
 * مبادئ: لا مكتبات · لا شبكة · DOM كسول (لا يُبنى إلا ما يُعرض) · كائن Audio واحد · الصوت يُفك فصلاً فصلاً عند الطلب
 * توافق: ES2015 فقط (لا ?. ولا ?? ولا async) → Safari/iOS 10+، Chrome 49+.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var META = JSON.parse($('meta').textContent);
  var D = null;            // المحتوى بعد الفك
  var KEYS = null;         // مفاتيح الفك (إن كان مشفراً)
  var LANG = META.lang, MODE = 'both';
  var store = (function () { // localStorage قد يرمي استثناء (وضع خاص / file:// في بعض المتصفحات)
    var mem = {};
    function ok() { try { var k = '__t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return true; } catch (e) { return false; } }
    var has = ok();
    return {
      get: function (k, d) { try { var v = has ? localStorage.getItem(k) : mem[k]; return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
      set: function (k, v) { var s = JSON.stringify(v); if (has) { try { localStorage.setItem(k, s); return; } catch (e) {} } mem[k] = s; }
    };
  })();
  var NS = 'gh2.' + META.id + '.';
  MODE = store.get(NS + 'mode', 'both');
  var done = store.get(NS + 'done', {});

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function S(k) { var u = (D && D.ui) || META.ui0 || {}; return u[k] ? u[k].l : k; }
  function SA(k) { var u = (D && D.ui) || META.ui0 || {}; return u[k] ? u[k].ar : ''; }
  function UIAU(k) { var u = (D && D.ui) || META.ui0 || {}; return u[k] ? u[k].au : null; }
  function toast(t) { var el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('on'); }, 2200); }

  // ═══════════════ الصوت: حاويات لكل مجموعة، تُفك عند أول تشغيل ═══════════════
  // META.audio = { group: {block:"au-x", src:"audio/x.bin"?, nonce:hex|null, size:n, clips:{id:[off,len]}} }
  var AK = null, AU = META.audio || {}, decoded = {}, decodedOrder = [], clipGroup = {};
  Object.keys(AU).forEach(function (g) { Object.keys(AU[g].clips).forEach(function (id) { clipGroup[id] = g; }); });
  var hasBlob = typeof Blob !== 'undefined' && window.URL && URL.createObjectURL;
  function groupBytes(g, cb) {
    if (decoded[g]) return cb(decoded[g]);
    var info = AU[g];
    function finish(raw) {
      var bytes = raw;
      if (info.nonce) {
        if (!D || !D.ak) return cb(null);
        if (!AK) AK = GHC.unhex(D.ak);
        bytes = GHC.chacha20(AK, GHC.unhex(info.nonce), 1, raw);
      }
      decoded[g] = { bytes: bytes, urls: {} };
      decodedOrder.push(g);
      while (decodedOrder.length > 2) { // لا نحتفظ بأكثر من مجموعتين مفكوكتين في الذاكرة
        var old = decodedOrder.shift(); var o = decoded[old];
        if (o) { Object.keys(o.urls).forEach(function (u) { try { URL.revokeObjectURL(o.urls[u]); } catch (e) {} }); }
        delete decoded[old];
      }
      cb(decoded[g]);
    }
    if (info.block) {
      var el = $(info.block); if (!el) return cb(null);
      setTimeout(function () { finish(GHC.b64dec(el.textContent)); }, 0);
    } else if (info.src) {
      var x = new XMLHttpRequest(); x.open('GET', info.src, true); x.responseType = 'arraybuffer';
      x.onload = function () { if (x.status === 200 || x.status === 0) finish(new Uint8Array(x.response)); else cb(null); };
      x.onerror = function () { cb(null); }; x.send();
    } else cb(null);
  }
  function clipURL(id, cb) {
    var g = clipGroup[id]; if (!g) return cb(null);
    groupBytes(g, function (G) {
      if (!G) return cb(null);
      if (G.urls[id]) return cb(G.urls[id]);
      var c = AU[g].clips[id], slice = G.bytes.subarray(c[0], c[0] + c[1]), u;
      if (hasBlob) u = URL.createObjectURL(new Blob([slice], { type: 'audio/mpeg' }));
      else u = 'data:audio/mpeg;base64,' + GHC.b64enc(slice);
      G.urls[id] = u; cb(u);
    });
  }
  var player = new Audio(); player.preload = 'auto';
  var curBtn = null, queue = [], qi = 0, playToken = 0;
  function stop() {
    var spk = document.getElementById('speak'); if (spk) spk.classList.remove('on');
    playToken++; queue = []; try { player.pause(); } catch (e) {}
    if (curBtn) curBtn.classList.remove('on'); curBtn = null;
    [].forEach.call(document.querySelectorAll('.rbtn.on'), function (b) { b.classList.remove('on'); });
  }
  function play(id, btn, onend) {
    var tok = ++playToken; try { player.pause(); } catch (e) {}
    if (curBtn) curBtn.classList.remove('on'); curBtn = btn || null; if (curBtn) curBtn.classList.add('on');
    clipURL(id, function (u) {
      if (tok !== playToken) return;
      if (!u) { if (curBtn) curBtn.classList.remove('on'); return onend && onend(); }
      player.src = u;
      player.onended = function () { if (tok !== playToken) return; if (curBtn) curBtn.classList.remove('on'); curBtn = null; if (onend) onend(); };
      var p = player.play(); if (p && p.catch) p.catch(function () { if (curBtn) curBtn.classList.remove('on'); });
    });
  }
  function playQueue(list) { stop(); var i = 0; (function nx() { if (i >= list.length) return; var q = list[i++]; play(q.id, q.btn, nx); })(); }
  var IC_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4a1 1 0 0 0 1 1h3l4 4V5L7 9H4a1 1 0 0 0-1 1zm13.5 2A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z"/></svg>';
  function pbtn(id, cls, label) { return '<button class="play ' + (cls || '') + (id && clipGroup[id] ? '' : ' na') + '" data-au="' + (id || '') + '" aria-label="' + esc(label || 'play') + '">' + IC_PLAY + '</button>'; }
  function pair(au) { // au = [idL, idAr]
    au = au || [];
    if (MODE === 'ar') return '<div class="pb">' + pbtn(au[1], 'ar', 'Arabic') + '</div>';
    if (MODE === 'l') return '<div class="pb">' + pbtn(au[0], '', LANG) + '</div>';
    return '<div class="pb">' + pbtn(au[0], '', LANG) + pbtn(au[1], 'ar', 'Arabic') + '</div>';
  }
  function bi(t) { // t = {l, ar}
    var a = MODE === 'ar' ? '' : '<div class="a L">' + esc(t.l) + '</div>';
    var b = MODE === 'l' ? '' : '<div class="' + (MODE === 'ar' ? 'a' : 'b') + ' ar">' + esc(t.ar) + '</div>';
    return a + b;
  }
  function pick(t) { return MODE === 'ar' ? t.ar : t.l; }

  // ═══════════════ التنقل ═══════════════
  var VIEWS = ['vHome', 'vBook', 'vChapter', 'vToday', 'vReplies', 'vMadam', 'vSOS'];
  var curView = 'vHome', curCh = -1, history_ = [];
  function show(v, push) {
    stop();
    if (push !== false && curView !== v) history_.push([curView, curCh]);
    VIEWS.forEach(function (x) { var el = $(x); if (x !== v) { el.classList.remove('on'); if (x !== 'vHome' && x !== 'vSOS') el.innerHTML = ''; } });
    curView = v; render(v); $(v).classList.add('on');
    [].forEach.call(document.querySelectorAll('.tabbar button'), function (b) { b.classList.toggle('on', b.getAttribute('data-v') === v || (v === 'vChapter' && b.getAttribute('data-v') === 'vBook')); });
    $('btnBack').textContent = v === 'vHome' ? (META.icon || '🏠') : '‹';
    window.scrollTo(0, 0);
  }
  function back() { if (!history_.length) return show('vHome', false); var h = history_.pop(); curCh = h[1]; show(h[0], false); }
  function setTop(t, s) { $('tT').textContent = t; $('tS').textContent = s || ''; }

  function render(v) {
    if (v === 'vHome') return renderHome();
    if (v === 'vBook') return renderBook();
    if (v === 'vChapter') return renderChapter(curCh);
    if (v === 'vToday') return renderToday();
    if (v === 'vReplies') return renderReplies();
    if (v === 'vMadam') return renderMadam();
    if (v === 'vSOS') return renderSOS();
  }

  // ═══════════════ الرئيسية ═══════════════
  function chapterStats(c) {
    var tot = 0, ok = 0;
    c.sections.forEach(function (s, si) { if (s.type === 'steps' || s.type === 'checklist') s.items.forEach(function (it, ii) { tot++; if (done[c.id + '/' + si + '/' + ii]) ok++; }); });
    var read = done['read/' + c.id] ? 1 : 0;
    return { tot: tot + 1, ok: ok + read };
  }
  function overall() { var t = 0, o = 0; D.chapters.forEach(function (c) { var s = chapterStats(c); t += s.tot; o += s.ok; }); return t ? Math.round(o * 100 / t) : 0; }
  function ring(p) {
    var r = 24, C = 2 * Math.PI * r, off = C * (1 - p / 100);
    return '<svg width="60" height="60" viewBox="0 0 60 60"><circle cx="30" cy="30" r="' + r + '" stroke="rgba(233,211,166,.25)" stroke-width="6" fill="none"/><circle cx="30" cy="30" r="' + r + '" stroke="#E9D3A6" stroke-width="6" fill="none" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 30 30)"/><text x="30" y="35" text-anchor="middle" font-size="14" font-weight="800" fill="#fff" font-family="system-ui">' + p + '%</text></svg>';
  }
  function tile(v, ic, k, extra, cls) {
    return '<button class="tile ' + (cls || '') + '" data-go="' + v + '"' + (extra || '') + '><span class="ic">' + ic + '</span><span class="tt L">' + esc(S(k)) + '</span><span class="ts L">' + esc(S(k + '_sub')) + '</span></button>';
  }
  function renderHome() {
    setTop(META.bookName, META.home ? (S('copy_of') + ' ' + META.home) : '');
    var el = $('vHome'), p = overall(), h = '';
    h += installCard();
    h += '<div class="hero"><p class="hn L">' + esc(S('hello_name')) + (META.worker ? '، ' + esc(META.worker) : '') + ' 👋</p>'
      + '<div class="hs ar">' + esc(META.bookName) + '</div>'
      + '<div class="ring">' + ring(p) + '<div class="pv L">' + esc(S('progress')) + ' ' + p + '%<br><span style="opacity:.8">' + D.chapters.length + ' ' + esc(S('chapters_count')) + '</span></div></div></div>';
    h += '<div class="tiles">';
    h += tile('vBook', '📖', 'book');
    h += tile('vToday', '🗓️', 'today');
    if (D.rules && D.rules.length) h += '<button class="tile" data-go="vChapter" data-ch="rules"><span class="ic">🏡</span><span class="tt L">' + esc(S('house_rules')) + '</span><span class="ts L">' + esc(S('house_rules_sub')) + '</span></button>';
    h += tile('vReplies', '💬', 'replies');
    h += tile('vSOS', '🆘', 'emergency', '', 'sos wide');
    h += '<button class="tile wide madam" data-go="vMadam"><span class="ic">🗣️</span><span><span class="tt ar" style="display:block">' + esc(SA('for_madam')) + '</span><span class="ts ar" style="display:block">' + esc(SA('for_madam_sub')) + '</span></span></button>';
    h += '</div>';
    h += '<div class="wmline ar">' + esc(META.wm) + '</div>';
    el.innerHTML = h;
  }

  // ═══════════════ قائمة الدروس ═══════════════
  function allChapters() { var list = D.chapters.slice(); if (D.rules && D.rules.length) list.splice(Math.min(3, list.length), 0, rulesChapter()); return list; }
  function rulesChapter() {
    return { id: 'rules', icon: '🏡', title: { l: S('house_rules'), ar: SA('house_rules') }, subtitle: { l: S('house_rules_sub'), ar: SA('house_rules_sub') }, titleAu: UIAU('house_rules'),
      sections: D.rules.map(function (cat) { return { type: 'rules', title: cat.title, titleAu: cat.au, items: cat.items }; }) };
  }
  function renderBook() {
    setTop(S('book'), S('book_sub'));
    var h = '<div class="chlist">';
    allChapters().forEach(function (c, i) {
      var st = c.id === 'rules' ? null : chapterStats(c);
      h += '<button class="chrow" data-ch="' + c.id + '"><span class="ic">' + c.icon + '</span><span class="tx"><span class="tt ' + (MODE === 'ar' ? 'ar' : 'L') + '" style="display:block">' + esc(pick(c.title)) + '</span>'
        + (MODE === 'both' ? '<span class="ts ar" style="display:block">' + esc(c.title.ar) + '</span>' : '')
        + (st ? '<span class="bar"><i style="width:' + Math.round(st.ok * 100 / st.tot) + '%"></i></span>' : '') + '</span><span class="num">' + (i + 1) + '</span></button>';
    });
    $('vBook').innerHTML = h + '</div>';
  }

  // ═══════════════ الفصل ═══════════════
  function findCh(id) { var l = allChapters(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return i; return -1; }
  function lvlTag(lv) { if (lv === 'danger') return '<span class="lvl">✕ ' + esc(S('danger_word')) + '</span>'; if (lv === 'warn') return '<span class="lvl">! ' + esc(S('warn_word')) + '</span>'; return ''; }
  function renderChapter(i) {
    var list = allChapters(), c = list[i]; if (!c) return show('vBook');
    setTop(pick(c.title), (i + 1) + ' / ' + list.length);
    var h = '<div class="chead"><div class="ic">' + c.icon + '</div><div style="flex:1"><h2 class="' + (MODE === 'ar' ? 'ar' : 'L') + '">' + esc(pick(c.title)) + '</h2>'
      + (c.subtitle ? '<div class="sub ' + (MODE === 'ar' ? 'ar' : 'L') + '">' + esc(pick(c.subtitle)) + '</div>' : '')
      + (MODE === 'both' ? '<div class="sub ar">' + esc(c.title.ar) + '</div>' : '') + '</div>' + pair(c.titleAu) + '</div>';
    c.sections.forEach(function (s, si) {
      h += '<div class="sec">';
      if (s.title) h += '<h3><span class="x"><span class="' + (MODE === 'ar' ? 'ar' : 'L') + '">' + esc(pick(s.title)) + '</span>' + (MODE === 'both' ? '<span class="b ar">' + esc(s.title.ar) + '</span>' : '') + '</span>' + pair(s.titleAu) + '</h3>';
      if (s.text) h += '<div class="para"><div class="x">' + bi(s.text) + '</div>' + pair(s.textAu) + '</div>';
      (s.items || []).forEach(function (it, ii) {
        var key = c.id + '/' + si + '/' + ii;
        var lv = it.level || (s.type === 'donts' ? 'danger' : '');
        var isStep = s.type === 'steps';
        var ic = isStep ? (ii + 1) : (it.icon || '•');
        var tel = it.tel ? '<a class="call" href="tel:' + it.tel + '">📞 <span style="direction:ltr">' + it.tel + '</span></a>' : '';
        var chk = (isStep || s.type === 'checklist') ? '<button class="chk' + (done[key] ? ' on' : '') + '" data-k="' + key + '" aria-label="done">✓</button>' : '';
        var why = it.why ? '<div class="why ' + (MODE === 'ar' ? 'ar' : 'L') + '">' + esc(pick(it.why)) + '</div>' : '';
        h += '<div class="it ' + (isStep ? 'step ' : '') + lv + '"><div class="ic">' + ic + '</div><div class="x">' + lvlTag(lv) + bi(it.text) + why + tel + '</div>' + chk + pair(it.au) + '</div>';
      });
      h += '</div>';
    });
    if (c.id !== 'rules') {
      done['read/' + c.id] = 1; store.set(NS + 'done', done);
      h += '<div class="donecard"><div class="big">🌸</div><div class="L" style="font-weight:800">' + esc(S('chapter_done')) + '</div>' + (MODE !== 'l' ? '<div class="ar" style="text-align:center;color:var(--muted)">' + esc(SA('chapter_done')) + '</div>' : '') + '</div>';
    }
    h += '<div class="nav2">' + (i > 0 ? '<button data-step="-1">‹ ' + esc(S('prev')) + '</button>' : '') + '<button data-readall="1">🔊 ' + esc(S('read_all')) + '</button>' + (i < list.length - 1 ? '<button class="pri" data-step="1">' + esc(S('next')) + ' ›</button>' : '') + '</div>';
    h += '<div class="wmline ar">' + esc(META.wm) + '</div>';
    $('vChapter').innerHTML = h;
  }
  function readAll() {
    var list = [];
    [].forEach.call(document.querySelectorAll('#vChapter .play:not(.na)'), function (b) { if (MODE === 'both' && b.classList.contains('ar')) return; list.push({ id: b.getAttribute('data-au'), btn: b }); });
    playQueue(list);
  }

  // ═══════════════ يومي ═══════════════
  function renderToday() {
    setTop(S('today'), S('today_sub'));
    var sc = D.schedule, h = '';
    if (sc) {
      h += '<div class="stats"><div class="stat"><b>' + sc.workH + '</b><span class="L">' + esc(S('work_hours')) + '</span></div><div class="stat"><b>' + sc.restH + '</b><span class="L">' + esc(S('rest_hours')) + '</span></div></div>';
      h += '<div class="sched">';
      sc.rows.forEach(function (r) {
        h += '<div class="srow ' + (r.rest ? 'rest' : '') + '"><div class="tm">' + esc(r.time) + '</div><div class="x"><div class="a L">' + esc(S(r.k)) + '</div>' + (MODE !== 'l' ? '<div class="b ar">' + esc(SA(r.k)) + '</div>' : '') + (r.note ? '<div class="b ar">' + esc(r.note) + '</div>' : '') + '</div>' + pair(UIAU(r.k)) + '</div>';
      });
      h += '</div><div class="hint"><span>ℹ️</span><span class="x L">' + esc(S('sched_note')) + '</span>' + pair(UIAU('sched_note')) + '</div>';
      h += '<div class="rest-day"><span class="L">' + esc(S('rest_day')) + ': ' + esc(S('day_' + sc.restDay)) + '</span><div class="ar" style="text-align:center;font-weight:600">' + esc(SA('rest_day')) + ': ' + esc(SA('day_' + sc.restDay)) + '</div></div>';
    }
    // مهام اليوم: خطوات الفصول كقائمة ✓ مختصرة
    $('vToday').innerHTML = h || '<p class="L">—</p>';
  }

  // ═══════════════ ردودي (العاملة → عربي مسموع) ═══════════════
  function renderReplies() {
    setTop(S('replies'), S('replies_sub'));
    var h = '<div class="hint"><span style="font-size:22px">💡</span><span class="x L">' + esc(S('replies_hint')) + '</span>' + pair([UIAU('replies_hint') ? UIAU('replies_hint')[0] : null, null]) + '</div><div class="rgrid">';
    D.replies.forEach(function (r, i) {
      h += '<button class="rbtn ' + (r.level || '') + '" data-reply="' + i + '"><span class="ic">' + r.icon + '</span><span class="a L">' + esc(r.text.l) + '</span><span class="b ar">' + esc(r.text.ar) + '</span></button>';
    });
    $('vReplies').innerHTML = h + '</div>';
  }
  function speakReply(i, btn) {
    var r = D.replies[i]; var sp = $('speak');
    stop(); btn.classList.add('on'); sp.className = 'speak ar on'; sp.textContent = r.text.ar;
    clearTimeout(speakReply._t); speakReply._t = setTimeout(function () { sp.classList.remove('on'); btn.classList.remove('on'); }, 6000);
    play(r.au[1], null, function () { btn.classList.remove('on'); clearTimeout(speakReply._t); speakReply._t = setTimeout(function () { sp.classList.remove('on'); }, 900); });
  }

  // ═══════════════ قولي لعاملتك (ربة البيت → لغة العاملة) ═══════════════
  function renderMadam() {
    setTop(SA('for_madam'), SA('for_madam_sub'));
    var h = '';
    (D.madam || []).forEach(function (grp) {
      h += '<div class="h2 ar">' + esc(grp.title.ar) + '</div><div class="rgrid">';
      grp.items.forEach(function (it) {
        h += '<button class="rbtn" data-au2="' + (it.au[0] || '') + '" data-txt="' + esc(it.text.l) + '"><span class="ic">' + (it.icon || '•') + '</span><span class="a ar">' + esc(it.text.ar) + '</span><span class="b L">' + esc(it.text.l) + '</span></button>';
      });
      h += '</div>';
    });
    $('vMadam').innerHTML = h;
  }

  // ═══════════════ الطوارئ (لا تُقفل أبداً — من META المكشوف) ═══════════════
  function renderSOS() {
    var s = META.sos, u = META.ui0;
    setTop(u.emergency.l, u.emergency.ar);
    var h = '';
    s.numbers.forEach(function (n, i) {
      h += '<a class="sosbig ' + (i === 1 ? 'alt' : i > 1 ? 'alt2' : '') + '" href="tel:' + n.tel + '"><span class="n">' + n.tel + '</span><span class="x"><b class="L" style="display:block">' + esc(n.l) + '</b><span class="ar" style="display:block;opacity:.9">' + esc(n.ar) + '</span></span></a>';
    });
    if (META.madamPhone) h += '<a class="sosbig alt" href="tel:' + esc(META.madamPhone) + '"><span class="n">📞</span><span class="x"><b class="L" style="display:block">' + esc(u.call_madam.l) + '</b><span class="ar" style="display:block">' + esc(u.call_madam.ar) + ' · <span style="direction:ltr;unicode-bidi:isolate">' + esc(META.madamPhone) + '</span></span></span></a>';
    s.sections.forEach(function (sec) {
      h += '<div class="sec"><h3><span class="x"><span class="L">' + esc(sec.title.l) + '</span><span class="b ar">' + esc(sec.title.ar) + '</span></span></h3>';
      sec.items.forEach(function (it) {
        h += '<div class="it ' + (it.level || '') + '"><div class="ic">' + (it.icon || '•') + '</div><div class="x"><div class="a L">' + esc(it.text.l) + '</div><div class="b ar">' + esc(it.text.ar) + '</div></div><div class="pb">' + pbtn(it.au[0], '', LANG) + pbtn(it.au[1], 'ar', 'Arabic') + '</div></div>';
      });
      h += '</div>';
    });
    $('vSOS').innerHTML = h;
  }

  // ═══════════════ إرشاد «ضعي الكتاب على شاشتك» ═══════════════
  function installCard() {
    if (!/^https?:/.test(location.protocol)) return '';                // الملف المحلي يعمل أصلاً بلا إنترنت
    var standalone = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
    if (standalone || store.get(NS + 'noinstall', 0)) return '';
    var ua = navigator.userAgent || '', ios = /iPhone|iPad|iPod/.test(ua) || (ua.indexOf('Mac') > -1 && 'ontouchend' in document);
    var inapp = /FBAN|FBAV|Instagram|Line\/|Snapchat|TikTok|; wv\)/.test(ua);
    var steps = ios ? ['ios_1', 'ios_2', 'ios_3'] : ['and_1', 'and_2', 'and_3'];
    var h = '<div class="install"><h4>📲 <span class="L">' + esc(S('install_title')) + '</span>' + pair(UIAU('install_title')) + '</h4>';
    if (inapp) h += '<div class="it warn"><div class="x"><div class="a L">' + esc(S('inapp_warn')) + '</div></div></div>';
    h += '<ol>' + steps.map(function (k) { return '<li><span class="L">' + esc(S(k)) + '</span> ' + (UIAU(k) ? pbtn(UIAU(k)[0], '', '') .replace('class="play', 'style="display:inline-flex;vertical-align:middle;min-width:38px;height:34px" class="play') : '') + '</li>'; }).join('') + '</ol>';
    h += '<div class="row">' + (window.__bip ? '<button data-install="1">＋ ' + esc(S('install_title')) + '</button>' : '') + '<button class="ghost" data-noinstall="1">✕</button></div></div>';
    return h;
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); window.__bip = e; if (curView === 'vHome' && D) renderHome(); });

  // ═══════════════ الأحداث ═══════════════
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : e.target.parentNode;
    function up(sel) { var n = e.target; while (n && n !== document) { if (n.matches ? n.matches(sel) : n.msMatchesSelector(sel)) return n; n = n.parentNode; } return null; }
    var b;
    if ((b = up('.play'))) { e.preventDefault(); e.stopPropagation(); if (b.classList.contains('on')) return stop(); queue = []; return play(b.getAttribute('data-au'), b); }
    if ((b = up('.chk'))) { var k = b.getAttribute('data-k'); if (done[k]) delete done[k]; else done[k] = 1; b.classList.toggle('on'); store.set(NS + 'done', done); return; }
    if ((b = up('[data-reply]'))) return speakReply(+b.getAttribute('data-reply'), b);
    if ((b = up('[data-au2]'))) { stop(); b.classList.add('on'); var sp = $('speak'); sp.className = 'speak L on'; sp.textContent = b.getAttribute('data-txt'); return play(b.getAttribute('data-au2'), null, function () { b.classList.remove('on'); setTimeout(function () { sp.classList.remove('on'); sp.className = 'speak ar'; }, 900); }); }
    if ((b = up('[data-ch]')) && D) { curCh = findCh(b.getAttribute('data-ch')); return show('vChapter'); }
    if ((b = up('[data-go]'))) return show(b.getAttribute('data-go'));
    if ((b = up('[data-step]'))) { curCh += +b.getAttribute('data-step'); return show('vChapter', false); }
    if ((b = up('[data-readall]'))) return readAll();
    if ((b = up('[data-mode]'))) { MODE = b.getAttribute('data-mode'); store.set(NS + 'mode', MODE); syncSeg(); return render(curView); }
    if ((b = up('[data-v]'))) { history_ = []; return show(b.getAttribute('data-v'), false); }
    if ((b = up('[data-noinstall]'))) { store.set(NS + 'noinstall', 1); return renderHome(); }
    if ((b = up('[data-install]'))) { if (window.__bip) { window.__bip.prompt(); window.__bip = null; } return; }
  });
  $('btnBack').onclick = function () { if (curView === 'vHome') return; back(); };
  function syncSeg() { [].forEach.call(document.querySelectorAll('.seg button'), function (x) { x.classList.toggle('on', x.getAttribute('data-mode') === MODE); }); }

  // ═══════════════ الإقلاع: قفل ← غلاف ← الرئيسية ═══════════════
  function applyStatic() {
    var u = META.ui0;
    $('mBoth').textContent = META.flagShort + '+ع'; $('mL').textContent = META.flagShort; syncSeg();
    [].forEach.call(document.querySelectorAll('[data-s]'), function (el) { var k = el.getAttribute('data-s'); el.textContent = u[k] ? u[k].l : k; });
    $('cvIcon').textContent = META.icon || '🏠';
    $('cvMade').textContent = u.made_for.l; $('cvName').textContent = META.bookName;
    $('cvHello').textContent = u.welcome.l + (META.worker ? ' ' + META.worker : '');
    $('cvSub').textContent = u.welcome_sub.l; $('cvAr').textContent = u.welcome.ar + ' ' + u.welcome_sub.ar;
    $('cvGoT').textContent = u.start.l; $('cvListenT').textContent = u.listen.l; $('cvWm').textContent = META.wm;
  }
  function enter() {
    $('cover').classList.add('gone'); setTimeout(function () { $('cover').classList.add('hidden'); }, 500);
    store.set(NS + 'seen', 1); show('vHome', false);
  }
  function decryptPayload(keys) {
    var e = META.enc, ct = GHC.b64dec($('payload').textContent);
    var pt = GHC.open(keys, GHC.unhex(e.nonce), ct, GHC.unhex(e.mac));
    return pt ? JSON.parse(GHC.utf8dec(pt)) : null;
  }
  function tryKeys(keys) {
    var chk = GHC.hex(GHC.hmac(keys.mac, GHC.utf8('ghaida-check'))).slice(0, 16);
    if (chk !== META.enc.check) return false;
    var d = decryptPayload(keys); if (!d) return false;
    KEYS = keys; D = d; return true;
  }
  function boot() {
    applyStatic();
    $('cvGo').onclick = enter;
    $('cvListen').onclick = function () { var a = META.ui0.welcome.au, b = META.ui0.welcome_sub.au; playQueue([{ id: a[0] }, { id: b[0] }, { id: a[1] }, { id: b[1] }]); };
    if (store.get(NS + 'seen', 0)) { $('cover').classList.add('hidden'); show('vHome', false); }
  }
  function start() {
    if (!META.enc) { D = JSON.parse($('payload').textContent); return boot(); }
    var saved = store.get(NS + 'k', null);
    if (saved) {
      var raw = GHC.unhex(saved);
      if (tryKeys({ enc: raw.subarray(0, 32), mac: raw.subarray(32, 64) })) return boot();
    }
    var u = META.ui0; $('lock').classList.remove('hidden'); $('cover').classList.add('hidden');
    $('lkT').textContent = u.unlock_title.l; $('lkTa').textContent = u.unlock_title.ar; $('lkH').textContent = u.unlock_hint.l;
    $('lkB').textContent = u.unlock_btn.l; $('lkL').querySelector('span').textContent = u.listen.l;
    $('lkL').onclick = function () { playQueue([{ id: u.unlock_title.au[0] }, { id: u.unlock_hint.au[0] }]); };
    var sosB = document.createElement('button'); sosB.className = 'cover-listen'; sosB.style.cssText = 'margin:10px auto 0;border-color:#ffb4b4;color:#ffd6d6';
    sosB.textContent = '🆘 ' + u.emergency.l; sosB.onclick = function () { $('lock').classList.add('hidden'); D = { chapters: [], replies: [], ui: META.ui0 }; show('vSOS', false); $('tabbar').classList.add('hidden'); };
    $('lkL').parentNode.appendChild(sosB);
    var inp = $('code');
    inp.oninput = function () { var v = GHC.normCode(inp.value).slice(0, 8); inp.value = v.length > 4 ? v.slice(0, 4) + '-' + v.slice(4) : v; $('lkE').textContent = ''; };
    $('lkB').onclick = function () {
      var c = GHC.normCode(inp.value); if (c.length !== 8) { $('lkE').textContent = u.wrong_code.l; return; }
      $('lkB').textContent = u.audio_loading.l; $('lkB').disabled = true;
      setTimeout(function () {
        var k = GHC.deriveKeys(c, GHC.unhex(META.enc.salt), META.enc.iter);
        if (tryKeys(k)) {
          store.set(NS + 'k', GHC.hex(k.raw)); $('lock').classList.add('hidden'); $('cover').classList.remove('hidden'); $('tabbar').classList.remove('hidden'); boot();
        } else { $('lkE').textContent = u.wrong_code.l; $('lkB').textContent = u.unlock_btn.l; $('lkB').disabled = false; }
      }, 30);
    };
    inp.onkeydown = function (e) { if (e.keyCode === 13) $('lkB').onclick(); };
  }
  try { start(); } catch (err) { document.body.insertAdjacentHTML('afterbegin', '<div style="padding:20px;background:#fdecec;color:#b3261e">⚠️ ' + esc(err && err.message) + '</div>'); }
  // Service Worker — للنسخة المستضافة فقط
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) && META.sw) { navigator.serviceWorker.register(META.sw).catch(function () {}); }
})();
