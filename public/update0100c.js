/* DotaSense 0.10.0 (дополнение) — «РУКОВОДСТВА СБОРОК».
   • Меню → «Бойцы» → профиль героя → кнопка «СБОРКИ»: редактор. Три этапа (начало, середина, конец), до 6 предметов в каждом.
     Иконки перетаскиваются из каталога в этапы, между слотами и этапами; вытащил за пределы этапа или тапнул по слоту — предмет убран.
   • Сборки общие (хранит сервер, accounts.js): в катке в магазине (левая колонка) переключатель «РЕКОМЕНДАЦИЯ / ИГРОКИ»
     даёт выбрать сборку игрока для своего героя, купить предмет кликом, целый этап или всю сборку.
   Подключается после update0100b.js. */
(function(){
'use strict';
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update0100c ' + tag + ':', err); } catch(e) {} } };
const STAGES = [{k:'start', name:'НАЧАЛО'}, {k:'mid', name:'СЕРЕДИНА'}, {k:'end', name:'КОНЕЦ'}];
const MAXI = 6, MAX_OWN = 5;
const TAB_NAMES = ['ВСЕ','РАСХОД.','ХАРАКТ.','АКТИВ.','ОСОБЫЕ'];
function rgba(hex, a){ try { return hexRgba(hex, a); } catch(e) { return 'rgba(215,179,106,' + a + ')'; } }
function inR(r, x, y){ return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function rr(x, y, w, h, r){ ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
function fitText(t, maxW){ t = String(t); if(ctx.measureText(t).width <= maxW) return t; while(t.length > 2 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1); return t + '…'; }
function valid(id){ return typeof SHOP_ITEMS !== 'undefined' && !!SHOP_ITEMS[id]; }
function costOf(ids){ return ids.reduce((s, id) => s + (valid(id) ? SHOP_ITEMS[id].cost : 0), 0); }
function tok(){ return (typeof account !== 'undefined' && account.token) || null; }

/* ---------- кеш сборок с сервера ---------- */
const cache = {};   /* heroId -> {list, loading, at, err} */
function loadGuides(heroId, force){
  const c = cache[heroId] || (cache[heroId] = {list: null, loading: false, at: 0, err: ''});
  if(c.loading) return c;
  if(!force && c.list && Date.now() - c.at < 120000) return c;
  c.loading = true;
  accountApi('listguides', {heroId, token: tok() || undefined})
    .then(d => { c.list = Array.isArray(d.guides) ? d.guides : []; c.err = ''; })
    .catch(e => { c.err = (e && e.message) || 'Не удалось загрузить сборки'; if(!c.list) c.list = []; })
    .finally(() => { c.loading = false; c.at = Date.now(); });
  return c;
}
function guidesOf(heroId){ const c = cache[heroId]; return c && c.list ? c.list.filter(g => ['start','mid','end'].some(k => (g[k] || []).some(valid))) : []; }

/* =====================================================================
   РЕДАКТОР В МЕНЮ
   ===================================================================== */
const ed = {open: false, heroId: null, own: [], sel: 0, draft: null, stage: 'start', tab: 0, scroll: 0, drag: null, msg: '', msgAt: 0, busy: false};
function say(t){ ed.msg = t; ed.msgAt = performance.now(); }
function newDraft(){ return {id: '', title: 'Моя сборка', start: [], mid: [], end: []}; }
function copyDraft(g){ return {id: g.id || '', title: g.title || 'Моя сборка', start: (g.start || []).filter(valid), mid: (g.mid || []).filter(valid), end: (g.end || []).filter(valid)}; }
function curDef(){ return (typeof HERO_DEFS !== 'undefined') ? HERO_DEFS[selectedHeroIndex] : null; }
function refreshOwn(){
  const c = cache[ed.heroId];
  ed.own = c && c.list ? c.list.filter(g => g.mine) : [];
}
function openEditor(def){
  ed.open = true; ed.heroId = def.id; ed.stage = 'start'; ed.tab = 0; ed.scroll = 0; ed.drag = null; ed.msg = '';
  ed.openAt = performance.now();
  ed.own = []; ed.sel = 0; ed.draft = newDraft();
  const c = loadGuides(def.id, true);
  const wait = setInterval(() => {
    if(!ed.open || ed.heroId !== def.id){ clearInterval(wait); return; }
    if(!c.loading){ clearInterval(wait); refreshOwn(); if(ed.own.length){ ed.sel = 0; ed.draft = copyDraft(ed.own[0]); } }
  }, 120);
}
function closeEditor(){ ed.open = false; ed.drag = null; }

function PR(){ const w = Math.min(1000, VW - 24), h = Math.min(640, VH - 24); return {x: Math.round((VW - w) / 2), y: Math.round((VH - h) / 2), w, h}; }
function layout(){
  const P = PR(), top = P.y + 108, foot = 58, bodyH = P.h - 108 - foot;
  const leftW = Math.floor(P.w * 0.54) - 24, lx = P.x + 16;
  const px = lx + leftW + 16, pw = P.x + P.w - 16 - px;
  const gap = 6, titleH = 32;
  const zh = Math.floor((bodyH - titleH - 10) / 3);
  const s = Math.max(28, Math.min(56, Math.floor((leftW - 24 - gap * 5) / 6), zh - 40));
  const zones = STAGES.map((st, i) => ({k: st.k, name: st.name, x: lx, y: top + titleH + 10 + i * zh, w: leftW, h: zh - 8}));
  const slot = (z, i) => ({x: z.x + 12 + i * (s + gap), y: z.y + 28, w: s, h: s});
  const cell = 48, cg = 6, cols = Math.max(2, Math.floor((pw - 16 + cg) / (cell + cg)));
  const gridY = top + 36, gridH = bodyH - 36 - 34;
  const rows = Math.max(1, Math.floor((gridH + cg) / (cell + cg)));
  return {P, top, bodyH, leftW, lx, px, pw, gap, titleH, s, zones, slot, cell, cg, cols, gridY, rows,
    titleR: {x: lx, y: top, w: leftW, h: titleH},
    palR: {x: px, y: top, w: pw, h: bodyH},
    close: {x: P.x + P.w - 44, y: P.y + 12, w: 32, h: 32},
    save: {x: P.x + P.w - 16 - 170, y: P.y + P.h - foot + 10, w: 170, h: 36},
    del: {x: P.x + P.w - 16 - 170 - 12 - 130, y: P.y + P.h - foot + 10, w: 130, h: 36}};
}
function paletteIds(){
  return SHOP_ITEM_IDS.filter(id => valid(id) && (!ed.tab || shopItemCategory(id) === ed.tab)).sort((a, b) => SHOP_ITEMS[a].cost - SHOP_ITEMS[b].cost);
}
function tabRects(Lo){
  const n = TAB_NAMES.length, gap = 4, w = Math.floor((Lo.pw - gap * (n - 1)) / n);
  return TAB_NAMES.map((t, i) => ({x: Lo.px + i * (w + gap), y: Lo.top, w, h: 26}));
}
function guideTabRects(Lo){
  const out = [], P = Lo.P; let x = P.x + 16; const y = P.y + 64, h = 30, w = Math.min(150, Math.floor((P.w - 32 - 140) / MAX_OWN) - 6);
  for(let i = 0; i < ed.own.length; i++){ out.push({x, y, w, h, i}); x += w + 6; }
  if(ed.own.length < MAX_OWN) out.push({x, y, w: 124, h, i: -1});
  return out;
}

async function saveDraft(){
  if(ed.busy) return;
  if(!tok()){ say('Войди в аккаунт, чтобы сохранять сборки'); return; }
  const d = ed.draft;
  if(!d.start.length && !d.mid.length && !d.end.length){ say('Добавь в сборку хотя бы один предмет'); return; }
  ed.busy = true;
  try {
    const data = await accountApi('saveguide', {token: tok(), heroId: ed.heroId, id: d.id || undefined, title: d.title, start: d.start, mid: d.mid, end: d.end});
    const c = loadGuides(ed.heroId, true);
    await new Promise(res => { const t = setInterval(() => { if(!c.loading){ clearInterval(t); res(); } }, 80); });
    refreshOwn();
    const idx = ed.own.findIndex(g => g.id === data.guide.id);
    ed.sel = idx >= 0 ? idx : 0; ed.draft = copyDraft(data.guide);
    say('Сборка сохранена — её увидят все игроки');
  } catch(err) {
    if(err && err.status === 401 && typeof accountSet === 'function') accountSet(null, null);
    say((err && err.message) || 'Не удалось сохранить');
  } finally { ed.busy = false; }
}
async function deleteDraft(){
  const d = ed.draft;
  if(ed.busy || !d || !d.id || !tok()) return;
  if(!window.confirm('Удалить сборку «' + d.title + '»?')) return;
  ed.busy = true;
  try {
    await accountApi('deleteguide', {token: tok(), id: d.id});
    const c = loadGuides(ed.heroId, true);
    await new Promise(res => { const t = setInterval(() => { if(!c.loading){ clearInterval(t); res(); } }, 80); });
    refreshOwn(); ed.sel = 0; ed.draft = ed.own.length ? copyDraft(ed.own[0]) : newDraft();
    say('Сборка удалена');
  } catch(err) { say((err && err.message) || 'Не удалось удалить'); }
  finally { ed.busy = false; }
}

function slotAt(Lo, x, y){
  for(const z of Lo.zones){
    const arr = ed.draft[z.k];
    for(let i = 0; i < arr.length; i++) if(inR(Lo.slot(z, i), x, y)) return {k: z.k, i};
  }
  return null;
}
function zoneAt(Lo, x, y){ return Lo.zones.find(z => inR(z, x, y)) || null; }
function paletteItemAt(Lo, x, y){
  const ids = paletteIds();
  for(let n = 0; n < Lo.cols * Lo.rows; n++){
    const i = ed.scroll * Lo.cols + n; if(i >= ids.length) break;
    const r = {x: Lo.px + 8 + (n % Lo.cols) * (Lo.cell + Lo.cg), y: Lo.gridY + Math.floor(n / Lo.cols) * (Lo.cell + Lo.cg), w: Lo.cell, h: Lo.cell};
    if(inR(r, x, y)) return ids[i];
  }
  return null;
}

function edDown(mx, my){
  const Lo = layout();
  if(inR(Lo.close, mx, my) || !inR(Lo.P, mx, my)){ closeEditor(); return; }
  if(inR(Lo.save, mx, my)){ saveDraft(); return; }
  if(ed.draft.id && inR(Lo.del, mx, my)){ deleteDraft(); return; }
  for(const r of guideTabRects(Lo)) if(inR(r, mx, my)){
    if(r.i < 0){ ed.sel = -1; ed.draft = newDraft(); }
    else { ed.sel = r.i; ed.draft = copyDraft(ed.own[r.i]); }
    return;
  }
  if(inR(Lo.titleR, mx, my)){
    const v = window.prompt('Название сборки (до 28 символов):', ed.draft.title);
    if(v !== null) ed.draft.title = v.replace(/\s+/g, ' ').trim().slice(0, 28) || 'Моя сборка';
    return;
  }
  const tr = tabRects(Lo);
  for(let i = 0; i < tr.length; i++) if(inR(tr[i], mx, my)){ ed.tab = i; ed.scroll = 0; return; }
  const sl = slotAt(Lo, mx, my);
  if(sl){ ed.drag = {id: ed.draft[sl.k][sl.i], from: sl, sx: mx, sy: my, moved: false}; ed.stage = sl.k; return; }
  const pid = paletteItemAt(Lo, mx, my);
  if(pid){ ed.drag = {id: pid, from: null, sx: mx, sy: my, moved: false}; return; }
  const z = zoneAt(Lo, mx, my); if(z) ed.stage = z.k;
}
function edUp(){
  const dr = ed.drag; if(!dr) return;
  ed.drag = null;
  const Lo = layout(), mx = mouse.x, my = mouse.y, d = ed.draft;
  if(!dr.moved){
    if(dr.from){ d[dr.from.k].splice(dr.from.i, 1); }                 /* тап по слоту — убрать */
    else if(d[ed.stage].length < MAXI) d[ed.stage].push(dr.id);        /* тап по каталогу — в выбранный этап */
    else say('В этапе уже ' + MAXI + ' предметов');
    return;
  }
  const z = zoneAt(Lo, mx, my);
  if(dr.from) d[dr.from.k].splice(dr.from.i, 1);
  if(!z) return;                                                        /* вытащил за этап — предмет убран */
  const arr = d[z.k];
  if(arr.length >= MAXI){ if(dr.from) d[dr.from.k].splice(Math.min(dr.from.i, d[dr.from.k].length), 0, dr.id); say('В этапе уже ' + MAXI + ' предметов'); return; }
  let idx = Math.floor((mx - (z.x + 12)) / (Lo.s + Lo.gap) + 0.5);
  idx = Math.max(0, Math.min(arr.length, idx));
  arr.splice(idx, 0, dr.id); ed.stage = z.k;
}
window.addEventListener('mouseup', () => { if(ed.open) { try { edUp(); } catch(err) { warn('up', err); ed.drag = null; } } });
window.addEventListener('mousemove', () => {
  const dr = ed.drag; if(!ed.open || !dr) return;
  if(!dr.moved && Math.hypot(mouse.x - dr.sx, mouse.y - dr.sy) > 6) dr.moved = true;
});
window.addEventListener('keydown', e => { if(e.key === 'Escape' && ed.open){ closeEditor(); e.stopPropagation(); } }, true);
canvas.addEventListener('wheel', e => {
  if(!ed.open) return;
  e.stopImmediatePropagation(); e.preventDefault();
  const Lo = layout(), maxRow = Math.max(0, Math.ceil(paletteIds().length / Lo.cols) - Lo.rows);
  ed.scroll = Math.max(0, Math.min(maxRow, ed.scroll + (e.deltaY > 0 ? 1 : -1)));
}, {capture: true, passive: false});

function drawIcon(id, cx, cy, size){ try { drawItemIcon(shopView(id), cx, cy, size); } catch(err) { warn('icon', err); } }

function drawEditor(def){
  const Lo = layout(), P = Lo.P, now = performance.now() / 1000;
  const t = Math.min(1, (performance.now() - ed.openAt) / 240), e = 1 - Math.pow(1 - t, 3);
  const c1 = def.color || '#8899aa', c2 = def.color2 || '#d7b36a', d = ed.draft;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,' + (0.74 * e) + ')'; ctx.fillRect(0, 0, VW, VH);
  ctx.translate(0, (1 - e) * 22); ctx.globalAlpha = e;
  ctx.shadowColor = rgba(c2, .5); ctx.shadowBlur = 34;
  rr(P.x, P.y, P.w, P.h, 18);
  const bg = ctx.createLinearGradient(0, P.y, 0, P.y + P.h); bg.addColorStop(0, '#25201a'); bg.addColorStop(.5, '#13110e'); bg.addColorStop(1, '#0a0908');
  ctx.fillStyle = bg; ctx.fill(); ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.save(); rr(P.x, P.y, P.w, P.h, 18); ctx.clip();
  const gl = ctx.createRadialGradient(P.x + 90, P.y + 40, 6, P.x + 90, P.y + 40, P.w * .6); gl.addColorStop(0, rgba(c2, .28)); gl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gl; ctx.fillRect(P.x, P.y, P.w, 160);
  const rib = ctx.createLinearGradient(P.x, 0, P.x + P.w, 0); rib.addColorStop(0, 'rgba(0,0,0,0)'); rib.addColorStop(.5, rgba(c2, 1)); rib.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rib; ctx.fillRect(P.x, P.y, P.w, 4); ctx.restore();
  const bd = ctx.createLinearGradient(P.x, P.y, P.x, P.y + P.h); bd.addColorStop(0, '#f2d58f'); bd.addColorStop(1, rgba(c2, .5));
  rr(P.x, P.y, P.w, P.h, 18); ctx.lineWidth = 2; ctx.strokeStyle = bd; ctx.stroke();

  /* шапка */
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = 'bold 11px Consolas, monospace'; ctx.fillStyle = '#d7b36a'; ctx.fillText('РУКОВОДСТВА СБОРОК', P.x + 20, P.y + 26);
  ctx.font = 'bold 26px Georgia, serif'; ctx.fillStyle = '#fff3cf'; ctx.shadowColor = rgba(c2, .8); ctx.shadowBlur = 8;
  ctx.fillText(def.name, P.x + 20, P.y + 54); ctx.shadowBlur = 0;
  ctx.font = '12px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.textAlign = 'right';
  ctx.fillText('Перетащи предметы в этапы. Эти сборки смогут выбрать все игроки в катке.', P.x + P.w - 56, P.y + 30);
  ctx.fillText(tok() ? 'Сборок героя: ' + ed.own.length + ' / ' + MAX_OWN : 'Без входа в аккаунт сборки не сохраняются', P.x + P.w - 56, P.y + 48);
  const cl = Lo.close; rr(cl.x, cl.y, cl.w, cl.h, 8); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillText('✕', cl.x + cl.w / 2, cl.y + 22);

  /* вкладки сборок */
  for(const r of guideTabRects(Lo)){
    const act = r.i === ed.sel, add = r.i < 0;
    rr(r.x, r.y, r.w, r.h, 8);
    ctx.fillStyle = act ? rgba(c2, .30) : 'rgba(255,255,255,.06)'; ctx.fill();
    ctx.lineWidth = act ? 1.8 : 1; ctx.strokeStyle = act ? '#e8c984' : 'rgba(255,255,255,.18)'; ctx.stroke();
    ctx.font = 'bold 12px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillStyle = act ? '#fff3cf' : 'rgba(255,255,255,.75)';
    ctx.fillText(add ? '＋ НОВАЯ' : fitText(ed.own[r.i].title, r.w - 14), r.x + r.w / 2, r.y + 20);
  }
  if(ed.sel < 0 || !ed.own.length){
    /* новая сборка — отдельной подсказки не нужно, вкладка «НОВАЯ» уже подсвечена, если она есть */
  }

  /* название */
  const tR = Lo.titleR;
  rr(tR.x, tR.y, tR.w, tR.h, 8); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(215,179,106,.5)'; ctx.stroke();
  ctx.textAlign = 'left'; ctx.font = 'bold 15px Georgia, serif'; ctx.fillStyle = '#fff3cf';
  ctx.fillText('✎ ' + fitText(d.title, tR.w - 24), tR.x + 12, tR.y + 21);

  /* этапы */
  const dragId = ed.drag && ed.drag.moved ? ed.drag.id : null;
  const hoverZone = dragId ? zoneAt(Lo, mouse.x, mouse.y) : null;
  Lo.zones.forEach((z, zi) => {
    const act = ed.stage === z.k, arr = d[z.k];
    rr(z.x, z.y, z.w, z.h, 12);
    const zg = ctx.createLinearGradient(z.x, z.y, z.x, z.y + z.h);
    zg.addColorStop(0, (hoverZone && hoverZone.k === z.k) ? rgba(c2, .24) : act ? rgba(c2, .13) : 'rgba(255,255,255,.05)'); zg.addColorStop(1, 'rgba(255,255,255,.02)');
    ctx.fillStyle = zg; ctx.fill();
    ctx.lineWidth = act ? 1.6 : 1; ctx.strokeStyle = (hoverZone && hoverZone.k === z.k) ? '#ffe39a' : act ? rgba(c2, .9) : 'rgba(255,255,255,.14)'; ctx.stroke();
    ctx.textAlign = 'left'; ctx.font = 'bold 12px Consolas, monospace'; ctx.fillStyle = act ? '#ffe39a' : '#d7b36a';
    ctx.fillText((zi + 1) + '. ' + z.name, z.x + 12, z.y + 20);
    ctx.textAlign = 'right'; ctx.font = 'bold 12px Segoe UI, Arial'; ctx.fillStyle = '#ffd568';
    ctx.fillText(costOf(arr) + ' монет  ·  ' + arr.length + '/' + MAXI, z.x + z.w - 12, z.y + 20);
    for(let i = 0; i < MAXI; i++){
      const r = Lo.slot(z, i), has = i < arr.length;
      rr(r.x, r.y, r.w, r.h, 8);
      ctx.fillStyle = has ? 'rgba(30,40,52,.95)' : 'rgba(0,0,0,.28)'; ctx.fill();
      ctx.lineWidth = 1.2;
      if(has){ const it = shopView(arr[i]); ctx.strokeStyle = (it && it.color) || '#8be9fd'; ctx.setLineDash([]); }
      else { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.setLineDash([4, 4]); }
      ctx.stroke(); ctx.setLineDash([]);
      if(has){
        const isDragged = ed.drag && ed.drag.moved && ed.drag.from && ed.drag.from.k === z.k && ed.drag.from.i === i;
        ctx.globalAlpha = (isDragged ? .25 : 1) * e;
        drawIcon(arr[i], r.x + r.w / 2, r.y + r.h / 2, r.w - 8);
        ctx.globalAlpha = e;
      }
    }
    if(!arr.length){ ctx.textAlign = 'left'; ctx.font = '11px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillText('— перетащи сюда предметы', z.x + 12 + ctx.measureText((zi + 1) + '. ' + z.name).width + 22, z.y + 20); }
  });

  /* каталог */
  const pr = Lo.palR;
  rr(pr.x, pr.y, pr.w, pr.h, 12); ctx.fillStyle = 'rgba(8,11,13,.7)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(139,233,253,.28)'; ctx.stroke();
  tabRects(Lo).forEach((r, i) => {
    const act = ed.tab === i;
    rr(r.x, r.y, r.w, r.h, 7); ctx.fillStyle = act ? 'rgba(199,160,92,.95)' : 'rgba(255,255,255,.07)'; ctx.fill();
    ctx.font = 'bold 10px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillStyle = act ? '#141a22' : '#e9dcc0';
    ctx.fillText(TAB_NAMES[i], r.x + r.w / 2, r.y + 17);
  });
  const ids = paletteIds(); let hov = null;
  ctx.save(); rr(pr.x, Lo.gridY - 2, pr.w, Lo.rows * (Lo.cell + Lo.cg) + 4, 6); ctx.clip();
  for(let n = 0; n < Lo.cols * Lo.rows; n++){
    const i = ed.scroll * Lo.cols + n; if(i >= ids.length) break;
    const id = ids[i], r = {x: pr.x + 8 + (n % Lo.cols) * (Lo.cell + Lo.cg), y: Lo.gridY + Math.floor(n / Lo.cols) * (Lo.cell + Lo.cg), w: Lo.cell, h: Lo.cell};
    const h = inR(r, mouse.x, mouse.y); if(h) hov = id;
    rr(r.x, r.y, r.w, r.h, 8); ctx.fillStyle = h ? 'rgba(111,145,160,.55)' : 'rgba(30,40,52,.92)'; ctx.fill();
    ctx.lineWidth = h ? 2 : 1; ctx.strokeStyle = h ? '#fff0c7' : (SHOP_ITEMS[id].color || '#8be9fd'); ctx.stroke();
    drawIcon(id, r.x + r.w / 2, r.y + r.h / 2, r.w - 8);
  }
  ctx.restore();
  const totalRows = Math.ceil(ids.length / Lo.cols);
  if(totalRows > Lo.rows){
    const th = Lo.rows * (Lo.cell + Lo.cg), kh = Math.max(24, th * Lo.rows / totalRows), ky = Lo.gridY + (th - kh) * (ed.scroll / (totalRows - Lo.rows));
    rr(pr.x + pr.w - 6, ky, 3, kh, 2); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
  }
  ctx.textAlign = 'left'; ctx.font = 'bold 12px Segoe UI, Arial'; ctx.fillStyle = '#fff3cf';
  if(hov) ctx.fillText(fitText(SHOP_ITEMS[hov].name + '  ·  ' + SHOP_ITEMS[hov].cost + ' монет', pr.w - 20), pr.x + 10, pr.y + pr.h - 12);
  else { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '11px Segoe UI, Arial'; ctx.fillText('Тап — добавить в выбранный этап. Колёсико — прокрутка.', pr.x + 10, pr.y + pr.h - 12); }
  /* подсказка по слоту */
  const hs = slotAt(Lo, mouse.x, mouse.y);
  if(hs && !dragId){ ctx.fillStyle = '#fff3cf'; ctx.font = 'bold 12px Segoe UI, Arial'; ctx.fillText(fitText(SHOP_ITEMS[ed.draft[hs.k][hs.i]].name + ' — тап: убрать', pr.w - 20), pr.x + 10, pr.y + pr.h - 12); }

  /* кнопки и сообщение */
  if(d.id) drawMenuButton(Lo.del, 'УДАЛИТЬ', {radius: 8, fontSize: 12, redBlack: true});
  drawMenuButton(Lo.save, ed.busy ? 'СОХРАНЕНИЕ…' : (d.id ? 'СОХРАНИТЬ' : 'ОПУБЛИКОВАТЬ'), {radius: 8, fontSize: 13, primary: true});
  if(ed.msg && performance.now() - ed.msgAt < 3500){
    ctx.textAlign = 'left'; ctx.font = 'bold 13px Segoe UI, Arial'; ctx.fillStyle = '#ffe08a';
    ctx.fillText(fitText(ed.msg, Lo.del.x - P.x - 40), P.x + 20, P.y + P.h - 22);
  }

  /* перетаскиваемая иконка */
  if(ed.drag && ed.drag.moved){
    ctx.globalAlpha = .95; ctx.shadowColor = 'rgba(0,0,0,.7)'; ctx.shadowBlur = 14;
    drawIcon(ed.drag.id, mouse.x, mouse.y, 54);
  }
  ctx.restore();
}

/* ---------- кнопка в профиле героя и перехват ввода ---------- */
function btnRect(){
  const g = menuGuideBtnRect();
  const r = {x: g.x - 392, y: g.y, w: 190, h: g.h};
  if(r.x < 12) return {x: g.x - 196, y: g.y + g.h + 8, w: 190, h: g.h};
  return r;
}
const _prevDetail = drawHeroDetail;
drawHeroDetail = function(def){
  _prevDetail.apply(this, arguments);
  try {
    if(!(window.__dsMasteryOpen && window.__dsMasteryOpen())) drawMenuButton(btnRect(), '⚒ СБОРКИ', {radius: 7, fontSize: 13, active: ed.open});
    if(ed.open) drawEditor(def);
  } catch(err) { warn('draw', err); }
};
const _prevClick = handleMenuClick;
handleMenuClick = function(mx, my){
  try {
    if(menuStage === 'heroDetail'){
      if(ed.open){ edDown(mx, my); return; }
      const def = curDef();
      if(def && !(window.__dsMasteryOpen && window.__dsMasteryOpen()) && inR(btnRect(), mx, my)){ openEditor(def); return; }
    } else if(ed.open) closeEditor();
  } catch(err) { warn('click', err); }
  return _prevClick.apply(this, arguments);
};
const _hvDown = heroViewPointerDown;
heroViewPointerDown = function(){ if(ed.open) return false; return _hvDown.apply(this, arguments); };
if(typeof heroViewWheel === 'function'){ const _hvW = heroViewWheel; heroViewWheel = function(){ if(ed.open) return false; return _hvW.apply(this, arguments); }; }

/* =====================================================================
   МАГАЗИН В КАТКЕ: сборки игроков
   ===================================================================== */
const sh = {mode: 'rec', idx: 0, heroId: '', msg: '', msgAt: 0};
function shHero(){ return (typeof playerHero !== 'undefined' && playerHero && playerHero.def) ? playerHero.def.id : null; }
function shGuide(){ const id = shHero(); if(!id) return null; const l = guidesOf(id); return l.length ? l[Math.max(0, Math.min(l.length - 1, sh.idx))] : null; }
function colRect(L){ return {x: L.r.x + 14, y: L.gy, w: L.guideW, h: L.gh + L.footerH + 4}; }
function shBtns(L){
  const c = colRect(L), by = c.y + c.h - 32;
  return {
    recTab: {x: c.x + 8, y: by, w: 112, h: 26}, plTab: {x: c.x + 126, y: by, w: 116, h: 26},
    prev: {x: c.x + 8, y: c.y + 38, w: 28, h: 28}, next: {x: c.x + c.w - 36, y: c.y + 38, w: 28, h: 28},
    buyAll: {x: c.x + 8, y: by - 36, w: c.w - 16, h: 30}
  };
}
function stageSlots(L){
  const c = colRect(L), out = [], s = 33, gap = 4;
  STAGES.forEach((st, si) => {
    const y = c.y + 100 + si * 74;
    out.push({stage: st, y, buy: {x: c.x + c.w - 8 - 118, y: y - 1, w: 118, h: 18}});
  });
  return out.map(o => ({...o, s, gap, x0: c.x + 12}));
}
function mySlots(L){
  const g = shGuide(), out = [];
  if(!g || sh.mode !== 'players') return out;
  stageSlots(L).forEach(b => {
    (g[b.stage.k] || []).filter(valid).slice(0, MAXI).forEach((id, i) => out.push({id, cat: b.stage.name, heading: b.y, rect: {x: b.x0 + i * (b.s + b.gap), y: b.y + 22, w: b.s, h: b.s}}));
  });
  return out;
}
const _slots = shopGuideSlots;
shopGuideSlots = function(L){ return sh.mode === 'players' && L && L.wide ? mySlots(L) : _slots.apply(this, arguments); };

function owned(id){ return shopOwnedCount(id) > 0 && shopItemCategory(id) !== 1; }
function buyList(ids){
  let bought = 0;
  for(const id of ids){
    if(!valid(id) || owned(id)) continue;
    if(!buyShopItem(id)) break;
    bought++;
  }
  return bought;
}
function shSay(t){ sh.msg = t; sh.msgAt = performance.now(); }

const _drawShop = drawShop;
drawShop = function(){
  _drawShop.apply(this, arguments);
  try {
    if(!shopOpen || shopGuideOpen) return;
    const L = shopLayout(); if(!L.wide) return;
    const hid = shHero(); if(!hid) return;
    if(sh.heroId !== hid){ sh.heroId = hid; sh.idx = 0; }
    loadGuides(hid, false);
    const list = guidesOf(hid), hasRec = !!CREATOR_BUILDS[hid];
    if(!sh.picked && !hasRec && list.length) sh.mode = 'players';
    const c = colRect(L), B = shBtns(L), h = playerHero, hovId = shopHoveredId(L);
    ctx.save();
    if(sh.mode === 'players'){
      ctx.fillStyle = 'rgba(8,13,20,0.97)'; ctx.fillRect(c.x, c.y, c.w, c.h);
      ctx.strokeStyle = 'rgba(139,233,253,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(c.x, c.y, c.w, c.h);
      ctx.textAlign = 'left'; ctx.fillStyle = '#ffd568'; ctx.font = 'bold 14px Georgia, serif'; ctx.fillText('СБОРКИ ИГРОКОВ', c.x + 12, c.y + 24);
      const cc = cache[hid], g = shGuide();
      if(!g){
        ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '13px Segoe UI, Arial'; ctx.textAlign = 'left';
        const lines = (cc && cc.loading && !cc.list) ? ['Загрузка…'] : ['Игроки пока не создали сборок', 'для этого героя.', '', 'Создай свою: меню → Бойцы →', 'профиль героя → «СБОРКИ».'];
        lines.forEach((t, i) => ctx.fillText(t, c.x + 12, c.y + 60 + i * 18));
      } else {
        const arrow = (r, t) => { const hv = inR(r, mouse.x, mouse.y); rr(r.x, r.y, r.w, r.h, 7); ctx.fillStyle = hv ? 'rgba(199,160,92,.9)' : 'rgba(255,255,255,.1)'; ctx.fill(); ctx.fillStyle = hv ? '#141a22' : '#fff'; ctx.font = 'bold 16px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillText(t, r.x + r.w / 2, r.y + 20); };
        arrow(B.prev, '‹'); arrow(B.next, '›');
        ctx.textAlign = 'center'; ctx.fillStyle = '#fff3cf'; ctx.font = 'bold 14px Georgia, serif'; ctx.fillText(fitText(g.title, c.w - 92), c.x + c.w / 2, c.y + 56);
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '11px Segoe UI, Arial';
        ctx.fillText('автор: ' + fitText(g.author || '—', 110) + '  ·  ' + (Math.max(0, Math.min(list.length - 1, sh.idx)) + 1) + ' / ' + list.length, c.x + c.w / 2, c.y + 84);
        stageSlots(L).forEach(b => {
          const ids = (g[b.stage.k] || []).filter(valid).slice(0, MAXI), todo = ids.filter(id => !owned(id));
          ctx.textAlign = 'left'; ctx.fillStyle = '#8be9fd'; ctx.font = 'bold 11px Segoe UI, Arial'; ctx.fillText(b.stage.name, c.x + 12, b.y + 12);
          if(ids.length){
            const bb = b.buy, hv = inR(bb, mouse.x, mouse.y), cost = costOf(todo);
            rr(bb.x, bb.y, bb.w, bb.h, 6); ctx.fillStyle = !todo.length ? 'rgba(46,160,90,.35)' : hv ? 'rgba(199,160,92,.95)' : 'rgba(199,160,92,.3)'; ctx.fill();
            ctx.textAlign = 'center'; ctx.font = 'bold 10px Segoe UI, Arial'; ctx.fillStyle = !todo.length ? '#9be8ae' : hv ? '#141a22' : '#ffe9ad';
            ctx.fillText(!todo.length ? 'КУПЛЕНО ✓' : 'КУПИТЬ ' + cost, bb.x + bb.w / 2, bb.y + 13);
          }
          ids.forEach((id, i) => {
            const rc = {x: b.x0 + i * (b.s + b.gap), y: b.y + 22, w: b.s, h: b.s}, hv = hovId === id, it = shopView(id), ok = h.coins >= it.cost;
            ctx.fillStyle = hv ? 'rgba(111,145,160,0.55)' : 'rgba(30,40,52,0.95)'; ctx.fillRect(rc.x, rc.y, rc.w, rc.h);
            ctx.strokeStyle = owned(id) ? '#7be39a' : ok ? it.color : 'rgba(255,255,255,0.22)'; ctx.lineWidth = hv ? 2 : 1; ctx.strokeRect(rc.x, rc.y, rc.w, rc.h);
            ctx.globalAlpha = ok || owned(id) ? 1 : 0.5; drawItemIcon(it, rc.x + rc.w / 2, rc.y + rc.h / 2, rc.w - 6); ctx.globalAlpha = 1;
            if(owned(id)){ ctx.fillStyle = '#7be39a'; ctx.font = 'bold 11px Segoe UI, Arial'; ctx.textAlign = 'right'; ctx.fillText('✓', rc.x + rc.w - 2, rc.y + 11); }
          });
        });
        const all = ['start', 'mid', 'end'].flatMap(k => (g[k] || []).filter(valid).slice(0, MAXI)).filter(id => !owned(id));
        const hv = inR(B.buyAll, mouse.x, mouse.y);
        rr(B.buyAll.x, B.buyAll.y, B.buyAll.w, B.buyAll.h, 8); ctx.fillStyle = !all.length ? 'rgba(46,160,90,.35)' : hv ? '#d96847' : '#b94835'; ctx.fill();
        ctx.textAlign = 'center'; ctx.font = 'bold 12px Segoe UI, Arial'; ctx.fillStyle = '#fff';
        ctx.fillText(!all.length ? 'СБОРКА КУПЛЕНА ✓' : 'КУПИТЬ ВСЮ СБОРКУ · ' + costOf(all), B.buyAll.x + B.buyAll.w / 2, B.buyAll.y + 20);
        if(performance.now() - sh.msgAt < 2500){ ctx.fillStyle = '#ffe08a'; ctx.font = 'bold 11px Segoe UI, Arial'; ctx.fillText(sh.msg, c.x + c.w / 2, B.buyAll.y - 6); }
      }
    }
    /* переключатель режима внизу колонки (в обоих режимах) */
    const tab = (r, t, act) => { rr(r.x, r.y, r.w, r.h, 7); ctx.fillStyle = act ? 'rgba(199,160,92,.95)' : 'rgba(255,255,255,.08)'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = act ? '#fff0c7' : 'rgba(255,255,255,.2)'; ctx.stroke(); ctx.font = 'bold 10px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillStyle = act ? '#141a22' : '#e9dcc0'; ctx.fillText(t, r.x + r.w / 2, r.y + 17); };
    tab(B.recTab, 'РЕКОМЕНДАЦИЯ', sh.mode === 'rec'); tab(B.plTab, 'ИГРОКИ (' + list.length + ')', sh.mode === 'players');
    ctx.restore();
  } catch(err) { warn('shop', err); }
};

const _hud = handleHudClick;
handleHudClick = function(mx, my){
  try {
    if(shopOpen && !shopGuideOpen){
      const L = shopLayout(), hid = shHero();
      if(L.wide && hid){
        const B = shBtns(L);
        if(inR(B.recTab, mx, my)){ sh.mode = 'rec'; sh.picked = true; return true; }
        if(inR(B.plTab, mx, my)){ sh.mode = 'players'; sh.picked = true; loadGuides(hid, true); return true; }
        if(sh.mode === 'players'){
          const list = guidesOf(hid), g = shGuide();
          if(list.length && inR(B.prev, mx, my)){ sh.idx = (sh.idx - 1 + list.length) % list.length; return true; }
          if(list.length && inR(B.next, mx, my)){ sh.idx = (sh.idx + 1) % list.length; return true; }
          if(g){
            if(inR(B.buyAll, mx, my)){
              const n = buyList(['start', 'mid', 'end'].flatMap(k => g[k] || []));
              shSay(n ? 'Куплено предметов: ' + n : 'Ничего не куплено'); return true;
            }
            for(const b of stageSlots(L)) if(inR(b.buy, mx, my)){
              const n = buyList(g[b.stage.k] || []); shSay(n ? 'Куплено предметов: ' + n : 'Ничего не куплено'); return true;
            }
          }
        }
      }
    }
  } catch(err) { warn('hud', err); }
  return _hud.apply(this, arguments);
};
})();
