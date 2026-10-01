// يُحقن في الصفحة: يقيس كل "صندوق" (بطاقة/زر/صف) — نسبة الفراغ، الحشوات، القصّ، أحجام الخط واللمس.
(() => {
  const R = [], vw = innerWidth;
  const vis = (e) => { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const isBox = (e) => { const s = getComputedStyle(e), r = e.getBoundingClientRect();
    if (r.width < 70 || r.height < 44 || r.width > vw * 0.98) return false;
    const bg = s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.backgroundImage !== 'none';
    const bd = parseFloat(s.borderTopWidth) > 0 || s.boxShadow !== 'none';
    return (bg || bd) && parseFloat(s.borderTopLeftRadius) >= 8; };
  const contentBox = (e) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
    const add = (r) => { if (r.width < 1 || r.height < 1) return; x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); n++; };
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let nd; while ((nd = w.nextNode())) {
      if (nd.nodeType === 3) { if (!nd.textContent.trim()) continue; const p = nd.parentElement; if (!vis(p)) continue; const rg = document.createRange(); rg.selectNodeContents(nd); for (const r of rg.getClientRects()) add(r); }
      else if (/^(svg|img|picture|canvas|input|select|textarea)$/i.test(nd.tagName) && vis(nd)) add(nd.getBoundingClientRect());
    }
    return n ? { x0, y0, x1, y1 } : null; };
  const path = (e) => { const a = []; for (let i = 0; e && i < 3 && e !== document.body; i++, e = e.parentElement) a.unshift(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.classList.length ? '.' + [...e.classList].slice(0, 2).join('.') : '')); return a.join(' > '); };
  const all = [...document.querySelectorAll('body *')].filter((e) => vis(e) && !e.closest('[aria-hidden="true"]:not(svg)'));
  for (const e of all) {
    if (!isBox(e)) continue;
    const r = e.getBoundingClientRect(), c = contentBox(e); if (!c) continue;
    const fill = ((c.x1 - c.x0) * (c.y1 - c.y0)) / (r.width * r.height);
    const pad = { t: Math.round(c.y0 - r.top), b: Math.round(r.bottom - c.y1), l: Math.round(c.x0 - r.left), r: Math.round(r.right - c.x1) };
    R.push({ k: 'box', sel: path(e), w: Math.round(r.width), h: Math.round(r.height), fill: +fill.toFixed(2), pad, y: Math.round(r.top + scrollY) });
  }
  // قصّ النص / فائض
  for (const e of all) { const s = getComputedStyle(e);
    if ((s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none' && s.webkitLineClamp) && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)) R.push({ k: 'trunc', sel: path(e), text: e.textContent.trim().slice(0, 60) });
    const r = e.getBoundingClientRect(); if (r.right > vw + 1 && s.position !== 'fixed' && !e.closest('.scroller,.shots,[data-scroll]')) R.push({ k: 'overflow', sel: path(e), right: Math.round(r.right) });
  }
  // أحجام الخط الصغيرة
  const fs = {}; for (const e of all) { if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue; const px = Math.round(parseFloat(getComputedStyle(e).fontSize)); fs[px] = (fs[px] || 0) + 1; if (px < 12) R.push({ k: 'small', sel: path(e), px, text: e.textContent.trim().slice(0, 40) }); }
  // أهداف اللمس
  for (const e of document.querySelectorAll('a,button,[role=button],input,select,label[for]')) { if (!vis(e)) continue; const r = e.getBoundingClientRect(); if ((r.width < 40 || r.height < 40) && !e.closest('p,li:not([class])')) R.push({ k: 'touch', sel: path(e), w: Math.round(r.width), h: Math.round(r.height), text: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30) }); }
  // أحجام الأيقونات
  const ic = {}; for (const s of document.querySelectorAll('svg')) { if (!vis(s)) continue; const r = s.getBoundingClientRect(); const k = Math.round(r.width) + 'x' + Math.round(r.height); ic[k] = (ic[k] || 0) + 1; }
  return { items: R, fontSizes: fs, iconSizes: ic };
})()
