/* =========================================================
   0.9.9.3: МАГАЗИН и ИНВЕНТАРЬ — полностью новый интерфейс.
   • Две отдельные вкладки меню: «МАГАЗИН» и «ИНВЕНТАРЬ» (переключаются и внутри окна).
   • Слева категории, в центре сетка карточек с прокруткой, справа крупный предпросмотр и кнопка действия.
   • Платные скины покупаются за Сенсики (осколки) через /api/buyskin; бесплатные — как раньше.
   • Нужно дважды нажать «КУПИТЬ», чтобы случайно не потратить осколки.
   Обычный скрипт (не ES-module); грузится ПЕРЕД game.js — на верхнем уровне не обращается к его переменным,
   только внутри функций. Зависит (на момент вызова) от game.js: ctx, VW, VH, mouse, SKIN_DEFS, skinsOwned, account,
   drawHeroTexture, skinPreviewDef, wrapMenuText, STORE_PHRASE_CARDS и др.
   ========================================================= */
/* STORE-UI:BEGIN */
let storeScreen = 'shop';                       /* 'shop' | 'inventory' */
const stCat = {shop:'all', inventory:'all'};     /* выбранная категория на каждом экране */
const stHero = {shop:'', inventory:''};          /* фильтр по герою ('' — все) */
const stSel = {shop:'', inventory:''};           /* id выбранной карточки */
let stScroll = 0, stScrollMax = 0;
let stHits = [];
let stGridRect = null;
let stMsg = {text:'', color:'#72e6a5', t:0};
let stConfirm = {id:'', t:0};
let stBuying = false;

const ST_RARITY = {
  free:      {name:'БЕСПЛАТНЫЙ',   col:'#8fdca8'},
  rare:      {name:'РЕДКИЙ',       col:'#5fb3ff'},
  epic:      {name:'ЭПИЧЕСКИЙ',    col:'#c08cff'},
  legendary: {name:'ЛЕГЕНДАРНЫЙ',  col:'#ffb347'},
  arcana:    {name:'АРКАНА',       col:'#ff7a2a'},
  immortal:  {name:'ИММОРТАЛ',     col:'#ffd568'},
  phrase:    {name:'ФРАЗА',        col:'#8be9fd'}
};
const ST_CATS = {
  shop:      [['all','ВСЁ'],['hero','СКИНЫ БОЙЦОВ'],['arcana','АРКАНЫ'],['immortal','ИММОРТАЛКИ'],['phrases','ФРАЗЫ']],
  inventory: [['all','ВСЁ'],['hero','СКИНЫ БОЙЦОВ'],['arcana','АРКАНЫ'],['immortal','ИММОРТАЛКИ']]
};

function storeOpenScreen(screen){
  storeScreen = screen === 'inventory' ? 'inventory' : 'shop';
  storeOpen = true; stScroll = 0; stConfirm.id = ''; stMsg.t = 0;
  playSynthSfx('open');
}
function storeClose(){ storeOpen = false; stConfirm.id = ''; playSynthSfx('close'); }
function stSetMsg(text, color){ stMsg = {text, color: color || '#72e6a5', t: performance.now()}; }

/* ---------------- данные ---------------- */
function stHeroName(id){ const d = (typeof HERO_DEFS !== 'undefined') && HERO_DEFS.find(h => h.id === id); return d ? d.name : id; }
function stRarityKey(sk){ return sk.kind === 'acc' ? 'immortal' : (sk.rarity || 'free'); }
function stBalance(){ return (account && account.token && account.profile) ? Math.max(0, Math.floor(account.profile.shards || 0)) : null; }
function stFmt(n){ return String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

function stCategoryOf(sk){ return sk.kind === 'acc' ? 'immortal' : (sk.rarity === 'arcana' ? 'arcana' : (sk.heroId ? 'hero' : 'universal')); }
function stAllItems(screen){
  syncPaidSkins();
  const out = [];
  for(const sk of SKIN_DEFS){
    if(screen === 'inventory' && !skinsOwned[sk.id]) continue;
    out.push({type:'skin', id:sk.id, sk, cat:stCategoryOf(sk), heroId:sk.heroId || '', order:(sk.price || 0)});
  }
  if(screen === 'shop'){
    for(const card of STORE_PHRASE_CARDS) out.push({type:'phrase', id:'ph:' + card.id, card, cat:'phrases', heroId:'', order:0});
  }
  const catOrder = {hero:0, universal:1, arcana:2, immortal:3, phrases:4};
  out.sort((a, b) => (catOrder[a.cat] - catOrder[b.cat]) || (a.heroId < b.heroId ? -1 : a.heroId > b.heroId ? 1 : 0) || (a.order - b.order));
  return out;
}
function stVisibleItems(){
  const scr = storeScreen, cat = stCat[scr];
  let list = stAllItems(scr);
  if(cat !== 'all') list = list.filter(it => it.cat === cat);
  const hf = stHero[scr];
  if(hf && (cat === 'all' || cat === 'hero' || cat === 'arcana')) list = list.filter(it => it.heroId === hf);
  return list;
}
function stHeroChips(){
  const ids = [];
  for(const it of stAllItems(storeScreen)) if(it.heroId && ids.indexOf(it.heroId) < 0) ids.push(it.heroId);
  return ids;
}
function stItemInfo(it){
  if(it.type === 'phrase'){
    const owned = isStorePhraseOwned(it.card.id);
    return {name:it.card.title, accent:it.card.color, border:it.card.color, rarity:'phrase', price:0, owned, equipped:false,
            desc:'Голосовая фраза для боя: «' + it.card.desc + '». Заберите её здесь — она появится в колесе фраз.', who:'Голосовая фраза', kind:'phrase'};
  }
  const sk = it.sk, owned = !!skinsOwned[sk.id];
  let who = sk.kind === 'acc' ? 'Предмет для героя: ' + stHeroName(sk.heroId) : (sk.heroId ? 'Скин для героя: ' + stHeroName(sk.heroId) : 'Скин для всех бойцов');
  return {name:sk.name, accent:sk.accent, border:sk.border, rarity:stRarityKey(sk), price:sk.price || 0, owned,
          equipped: owned && isCosmeticEquipped(sk), desc:sk.desc, who, kind:'skin', sk};
}

/* ---------------- примитивы ---------------- */
function stRR(x, y, w, h, r){ ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function stText(str, x, y, font, color, align){
  ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillText(str, x, y);
}
function stFit(str, maxW, font){
  ctx.font = font; str = String(str);
  if(ctx.measureText(str).width <= maxW) return str;
  while(str.length > 2 && ctx.measureText(str + '…').width > maxW) str = str.slice(0, -1);
  return str + '…';
}
function stInside(r, x, y){ return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function stHit(r, key, fn, inGrid){
  stHits.push({x:r.x, y:r.y, w:r.w, h:r.h, fn, grid:!!inGrid});
  if(typeof menuButtonHitboxes !== 'undefined' && !inGrid) menuButtonHitboxes.push({x:r.x, y:r.y, w:r.w, h:r.h, key:'st:' + key});
}
/* осколок Сенсики (как значок в верхней панели) */
function stShard(cx, cy, size){
  const k = size / 24;
  ctx.save(); ctx.translate(cx - 12 * k, cy - 12 * k); ctx.scale(k, k);
  const poly = (pts, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for(let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); ctx.fill(); };
  poly([12,1,5,9,12,12], '#c9f8ff'); poly([12,1,19,9,12,12], '#6fd6f5'); poly([5,9,12,12,10,23], '#3a8fd0'); poly([19,9,14,23,10,23,12,12], '#6a5fe0');
  ctx.strokeStyle = '#e9fcff'; ctx.lineWidth = 0.9; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(12,1); ctx.lineTo(19,9); ctx.lineTo(14,23); ctx.lineTo(10,23); ctx.lineTo(5,9); ctx.closePath(); ctx.stroke();
  ctx.restore();
}
function stPill(x, y, w, h, text, col, fill, font){
  ctx.fillStyle = fill; stRR(x, y, w, h, h / 2); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.stroke();
  stText(text, x + w / 2, y + h / 2 + 4, font || 'bold 10px Segoe UI, Arial', col, 'center');
}
/* кнопка: kind 'primary' (золото) | 'ghost' | 'danger' | 'disabled' */
function stButton(r, label, kind, key, fn){
  const hov = fn && kind !== 'disabled' && stInside(r, mouse.x, mouse.y);
  ctx.save();
  if(kind === 'primary'){
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, hov ? '#ffe39a' : '#f6c85a'); g.addColorStop(1, hov ? '#e0982a' : '#c47a1c');
    ctx.shadowColor = 'rgba(255,190,70,' + (hov ? .7 : .4) + ')'; ctx.shadowBlur = hov ? 18 : 10;
    ctx.fillStyle = g; stRR(r.x, r.y, r.w, r.h, 10); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff1c4'; ctx.lineWidth = 1.5; ctx.stroke();
  } else if(kind === 'disabled'){
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; stRR(r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1.2; ctx.stroke();
  } else {
    ctx.fillStyle = hov ? 'rgba(255,213,104,0.20)' : 'rgba(255,255,255,0.07)'; stRR(r.x, r.y, r.w, r.h, 10); ctx.fill();
    ctx.strokeStyle = hov ? '#ffd568' : 'rgba(215,179,106,0.6)'; ctx.lineWidth = 1.4; ctx.stroke();
  }
  const col = kind === 'primary' ? '#3a2306' : (kind === 'disabled' ? 'rgba(255,255,255,0.45)' : '#f2e2bd');
  stText(stFit(label, r.w - 14, 'bold 13px Segoe UI, Arial'), r.x + r.w / 2, r.y + r.h / 2 + 4.5, 'bold 13px Segoe UI, Arial', col, 'center');
  ctx.restore();
  if(fn && kind !== 'disabled') stHit(r, key, fn);
}

/* ---------------- раскладка ---------------- */
function stLayout(){
  const W = Math.max(280, Math.min(1120, VW - 20)), H = Math.max(260, Math.min(700, VH - 20));
  const P = {x:(VW - W) / 2, y:(VH - H) / 2, w:W, h:H};
  const compact = W < 860, tiny = H < 470;
  const pad = compact ? 12 : 20;
  const headH = tiny ? 46 : (compact ? 54 : 66);
  const bodyY = P.y + headH, bodyH = H - headH - pad;
  const L = {P, compact, tiny, pad, headH};
  L.close = {x:P.x + W - pad - 38, y:P.y + (headH - 38) / 2, w:38, h:38};
  const tabW = compact ? 104 : 150, tabH = compact ? 34 : 40;
  L.tabs = {
    shop:{x:P.x + pad, y:P.y + (headH - tabH) / 2, w:tabW, h:tabH},
    inventory:{x:P.x + pad + tabW + 8, y:P.y + (headH - tabH) / 2, w:tabW, h:tabH}
  };
  const detailW = Math.round(Math.max(compact ? 200 : 290, Math.min(340, (W - 2 * pad) * (compact ? 0.40 : 0.30))));
  const sideW = compact ? 0 : 176;
  let x = P.x + pad, y = bodyY, h = bodyH;
  if(!compact){ L.side = {x, y, w:sideW, h}; x += sideW + 14; }
  else { L.chips = {x, y, w:W - 2 * pad, h:30}; y += 38; h -= 38; }
  L.detail = {x:P.x + W - pad - detailW, y, w:detailW, h};
  const gridW = L.detail.x - x - 14;
  L.filter = {x, y, w:gridW, h:30};
  L.grid = {x, y:y + 38, w:gridW, h:h - 38};
  return L;
}

/* ---------------- отрисовка ---------------- */
function stDrawBackdrop(L, now){
  const P = L.P;
  ctx.fillStyle = 'rgba(2,4,12,0.80)'; ctx.fillRect(0, 0, VW, VH);
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, 40, VW / 2, VH / 2, Math.max(VW, VH) * 0.7);
  vg.addColorStop(0, 'rgba(90,55,130,0.22)'); vg.addColorStop(1, 'rgba(0,0,0,0.4)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  ctx.save();
  ctx.shadowColor = 'rgba(255,170,60,0.38)'; ctx.shadowBlur = 36;
  const pg = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
  pg.addColorStop(0, '#1d1840'); pg.addColorStop(.4, '#0f1228'); pg.addColorStop(1, '#070916');
  ctx.fillStyle = pg; stRR(P.x, P.y, P.w, P.h, 18); ctx.fill(); ctx.shadowBlur = 0;
  ctx.save(); stRR(P.x, P.y, P.w, P.h, 18); ctx.clip();
  const top = ctx.createRadialGradient(P.x + P.w / 2, P.y, 10, P.x + P.w / 2, P.y, P.w * 0.55);
  top.addColorStop(0, 'rgba(255,200,100,0.20)'); top.addColorStop(1, 'rgba(255,200,100,0)'); ctx.fillStyle = top; ctx.fillRect(P.x, P.y, P.w, P.h);
  for(let i = 0; i < 22; i++){
    const sx = P.x + ((i * 0.618 + 0.07) % 1) * P.w, sy = P.y + ((i * 0.381 + 0.11) % 1) * P.h, tw = Math.pow(0.5 + 0.5 * Math.sin(now * 1.5 + i * 1.9), 3);
    ctx.globalAlpha = 0.5 * tw; ctx.fillStyle = '#ffe9a6'; const r = 1 + tw * 2;
    ctx.fillRect(sx - r, sy - 0.5, r * 2, 1); ctx.fillRect(sx - 0.5, sy - r, 1, r * 2);
  }
  ctx.globalAlpha = 1;
  /* линия под шапкой */
  const hl = ctx.createLinearGradient(P.x, 0, P.x + P.w, 0);
  hl.addColorStop(0, 'rgba(255,213,104,0)'); hl.addColorStop(.5, 'rgba(255,213,104,0.65)'); hl.addColorStop(1, 'rgba(255,213,104,0)');
  ctx.fillStyle = hl; ctx.fillRect(P.x, P.y + L.headH - 1, P.w, 1.5);
  ctx.restore();
  const fg = ctx.createLinearGradient(P.x, P.y, P.x + P.w, P.y + P.h);
  fg.addColorStop(0, '#ffe9a6'); fg.addColorStop(.5, '#c9872b'); fg.addColorStop(1, '#ffd568');
  ctx.strokeStyle = fg; ctx.lineWidth = 2.6; stRR(P.x, P.y, P.w, P.h, 18); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,213,104,0.24)'; ctx.lineWidth = 1; stRR(P.x + 6, P.y + 6, P.w - 12, P.h - 12, 13); ctx.stroke();
  ctx.restore();
}

function stDrawHeader(L){
  const P = L.P;
  for(const scr of ['shop', 'inventory']){
    const r = L.tabs[scr], on = storeScreen === scr, hov = stInside(r, mouse.x, mouse.y);
    ctx.save();
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    if(on){ g.addColorStop(0, '#f6c85a'); g.addColorStop(1, '#b8731a'); } else { g.addColorStop(0, hov ? 'rgba(255,213,104,0.22)' : 'rgba(255,255,255,0.07)'); g.addColorStop(1, 'rgba(255,255,255,0.03)'); }
    if(on){ ctx.shadowColor = 'rgba(255,190,70,0.5)'; ctx.shadowBlur = 14; }
    ctx.fillStyle = g; stRR(r.x, r.y, r.w, r.h, 10); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = on ? '#fff1c4' : (hov ? '#ffd568' : 'rgba(215,179,106,0.5)'); ctx.lineWidth = on ? 1.8 : 1.3; ctx.stroke();
    const label = scr === 'shop' ? 'МАГАЗИН' : 'ИНВЕНТАРЬ', fs = L.compact ? 12 : 15;
    stText(label, r.x + r.w / 2, r.y + r.h / 2 + fs * 0.36, 'bold ' + fs + 'px Georgia, serif', on ? '#3a2306' : '#f2e2bd', 'center');
    ctx.restore();
    stHit(r, 'tab' + scr, () => { if(storeScreen !== scr){ storeScreen = scr; stScroll = 0; stConfirm.id = ''; playSynthSfx('select'); } });
  }
  /* закрыть */
  const c = L.close, ch = stInside(c, mouse.x, mouse.y);
  ctx.save(); ctx.fillStyle = ch ? 'rgba(235,60,70,0.55)' : 'rgba(255,255,255,0.07)'; stRR(c.x, c.y, c.w, c.h, 10); ctx.fill();
  ctx.strokeStyle = ch ? '#ff8a92' : 'rgba(215,179,106,0.6)'; ctx.lineWidth = 1.4; ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2; ctx.beginPath();
  ctx.moveTo(c.x + 12, c.y + 12); ctx.lineTo(c.x + c.w - 12, c.y + c.h - 12); ctx.moveTo(c.x + c.w - 12, c.y + 12); ctx.lineTo(c.x + 12, c.y + c.h - 12); ctx.stroke();
  ctx.restore();
  stHit(c, 'close', storeClose);
  /* баланс */
  const bal = stBalance(), bh = L.compact ? 30 : 36;
  const text = bal == null ? 'ВОЙТИ В АККАУНТ' : stFmt(bal);
  const font = 'bold ' + (L.compact ? 13 : 16) + 'px Segoe UI, Arial';
  ctx.font = font;
  const bw = Math.ceil(ctx.measureText(text).width) + (bal == null ? 26 : 56);
  const b = {x:c.x - 12 - bw, y:P.y + (L.headH - bh) / 2, w:bw, h:bh};
  const bhov = bal == null && stInside(b, mouse.x, mouse.y);
  ctx.save();
  const bg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
  bg.addColorStop(0, 'rgba(60,110,150,0.55)'); bg.addColorStop(1, 'rgba(20,40,70,0.7)');
  ctx.fillStyle = bg; stRR(b.x, b.y, b.w, b.h, b.h / 2); ctx.fill();
  ctx.strokeStyle = bhov ? '#d6f6ff' : '#8be9fd'; ctx.lineWidth = 1.4; ctx.stroke();
  if(bal != null){ stShard(b.x + 22, b.y + b.h / 2, b.h * 0.6); stText(text, b.x + 40, b.y + b.h / 2 + 5.5, font, '#e9fcff', 'left'); }
  else stText(text, b.x + b.w / 2, b.y + b.h / 2 + 4.5, 'bold 12px Segoe UI, Arial', '#e9fcff', 'center');
  ctx.restore();
  if(bal == null) stHit(b, 'login', () => { if(typeof openAccountModal === 'function') openAccountModal(); });
  if(!L.compact && P.w > 760){
    const lbl = storeScreen === 'shop' ? 'Скины, иммортальные предметы и фразы' : 'Твои скины и предметы — надевай и снимай';
    stText(stFit(lbl, Math.max(60, b.x - (L.tabs.inventory.x + L.tabs.inventory.w) - 40), '12px Segoe UI, Arial'), L.tabs.inventory.x + L.tabs.inventory.w + 24, P.y + L.headH / 2 + 4, '12px Segoe UI, Arial', 'rgba(255,236,200,0.55)', 'left');
  }
}

function stSelectCat(cat){
  if(stCat[storeScreen] !== cat){ stCat[storeScreen] = cat; stScroll = 0; stConfirm.id = ''; playSynthSfx('select'); }
  if(cat !== 'all' && cat !== 'hero') stHero[storeScreen] = '';
}
function stDrawSide(L){
  const s = L.side, cats = ST_CATS[storeScreen], all = stAllItems(storeScreen);
  const bh = 40, gap = 6;
  stText(storeScreen === 'shop' ? 'КАТЕГОРИИ' : 'КОЛЛЕКЦИЯ', s.x + 4, s.y + 12, 'bold 11px Segoe UI, Arial', 'rgba(255,213,104,0.7)', 'left');
  cats.forEach(([id, label], i) => {
    const r = {x:s.x, y:s.y + 22 + i * (bh + gap), w:s.w, h:bh};
    const on = stCat[storeScreen] === id, hov = stInside(r, mouse.x, mouse.y);
    const count = id === 'all' ? all.length : all.filter(it => it.cat === id).length;
    ctx.save();
    const g = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
    g.addColorStop(0, on ? 'rgba(255,200,90,0.32)' : (hov ? 'rgba(255,213,104,0.14)' : 'rgba(255,255,255,0.05)')); g.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = g; stRR(r.x, r.y, r.w, r.h, 9); ctx.fill();
    ctx.strokeStyle = on ? '#ffd568' : (hov ? 'rgba(255,213,104,0.7)' : 'rgba(215,179,106,0.28)'); ctx.lineWidth = on ? 1.8 : 1.1; ctx.stroke();
    if(on){ ctx.fillStyle = '#ffd568'; stRR(r.x, r.y + 8, 3.5, r.h - 16, 2); ctx.fill(); }
    stText(label, r.x + 14, r.y + r.h / 2 + 4, 'bold 12px Segoe UI, Arial', on ? '#fff2cf' : '#d8cbb0', 'left');
    stText(String(count), r.x + r.w - 12, r.y + r.h / 2 + 4, 'bold 11px Consolas, monospace', on ? '#ffd568' : 'rgba(255,255,255,0.45)', 'right');
    ctx.restore();
    stHit(r, 'cat' + id, () => stSelectCat(id));
  });
  /* нижняя справка */
  const by = s.y + 22 + cats.length * (bh + gap) + 6, bhh = s.y + s.h - by;
  if(bhh > 70){
    ctx.save(); ctx.fillStyle = 'rgba(139,233,253,0.07)'; stRR(s.x, by, s.w, Math.min(bhh, 150), 10); ctx.fill();
    ctx.strokeStyle = 'rgba(139,233,253,0.3)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    stShard(s.x + 20, by + 22, 20);
    stText(storeScreen === 'shop' ? 'СЕНСИКИ' : 'КОЛЛЕКЦИЯ', s.x + 38, by + 26, 'bold 12px Segoe UI, Arial', '#8be9fd', 'left');
    let ty = by + 46;
    const lines = storeScreen === 'shop'
      ? ['+500 за каждую победу', 'и награды за задания.', 'Скины — навсегда.']
      : (function(){ const eq = SKIN_DEFS.filter(sk => skinsOwned[sk.id] && isCosmeticEquipped(sk)).length; return ['Предметов: ' + all.length, 'Надето: ' + eq, 'Свой скин на героя']; })();
    for(const ln of lines){ stText(stFit(ln, s.w - 22, '11px Segoe UI, Arial'), s.x + 12, ty, '11px Segoe UI, Arial', 'rgba(220,240,255,0.75)', 'left'); ty += 16; }
  }
}
function stDrawChips(L){
  const cats = ST_CATS[storeScreen], r = L.chips, n = cats.length, gap = 6, w = (r.w - gap * (n - 1)) / n;
  cats.forEach(([id, label], i) => {
    const c = {x:r.x + i * (w + gap), y:r.y, w, h:r.h}, on = stCat[storeScreen] === id, hov = stInside(c, mouse.x, mouse.y);
    ctx.save();
    ctx.fillStyle = on ? 'rgba(255,200,90,0.34)' : (hov ? 'rgba(255,213,104,0.14)' : 'rgba(255,255,255,0.06)'); stRR(c.x, c.y, c.w, c.h, 8); ctx.fill();
    ctx.strokeStyle = on ? '#ffd568' : 'rgba(215,179,106,0.4)'; ctx.lineWidth = on ? 1.6 : 1; ctx.stroke();
    stText(stFit(label, c.w - 6, 'bold 10px Segoe UI, Arial'), c.x + c.w / 2, c.y + c.h / 2 + 3.5, 'bold 10px Segoe UI, Arial', on ? '#fff2cf' : '#cfc3a8', 'center');
    ctx.restore();
    stHit(c, 'chipcat' + id, () => stSelectCat(id));
  });
}
function stDrawFilter(L){
  const r = L.filter, cat = stCat[storeScreen];
  if(cat !== 'all' && cat !== 'hero'){
    const names = {universal:'Скины, подходящие любому бойцу', immortal:'Иммортальные предметы для героев', phrases:'Фразы для колеса реплик'};
    stText(names[cat] || '', r.x + 2, r.y + 20, '12px Segoe UI, Arial', 'rgba(255,236,200,0.55)', 'left');
    return;
  }
  const ids = [''].concat(stHeroChips());
  let x = r.x;
  for(const id of ids){
    const label = id ? stHeroName(id) : 'ВСЕ БОЙЦЫ';
    ctx.font = 'bold 11px Segoe UI, Arial';
    const w = Math.ceil(ctx.measureText(label).width) + 22;
    if(x + w > r.x + r.w) break;
    const c = {x, y:r.y, w, h:r.h}, on = stHero[storeScreen] === id, hov = stInside(c, mouse.x, mouse.y);
    ctx.save();
    ctx.fillStyle = on ? 'rgba(143,111,255,0.38)' : (hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'); stRR(c.x, c.y, c.w, c.h, 15); ctx.fill();
    ctx.strokeStyle = on ? '#b79cff' : 'rgba(255,255,255,0.22)'; ctx.lineWidth = on ? 1.6 : 1; ctx.stroke();
    stText(label, c.x + c.w / 2, c.y + c.h / 2 + 4, 'bold 11px Segoe UI, Arial', on ? '#fff' : '#cfc7e8', 'center');
    ctx.restore();
    stHit(c, 'hero' + id, () => { stHero[storeScreen] = id; stScroll = 0; playSynthSfx('select'); });
    x += w + 6;
  }
}

function stDrawCardArt(it, info, x, y, w, h, now, large){
  if(it.type === 'phrase'){
    ctx.save(); stRR(x, y, w, h, large ? 14 : 10); ctx.clip();
    const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#1a2140'); g.addColorStop(1, '#0a0d1e'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    const rg = ctx.createRadialGradient(x + w / 2, y + h * .45, 4, x + w / 2, y + h * .45, w * .7); rg.addColorStop(0, info.accent + '66'); rg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = rg; ctx.fillRect(x, y, w, h);
    stText('“', x + w / 2, y + h * .72, 'bold ' + Math.round(Math.min(w, h) * .95) + 'px Georgia, serif', info.accent, 'center');
    ctx.restore();
    return;
  }
  const sk = it.sk;
  ctx.save(); stRR(x, y, w, h, large ? 14 : 10); ctx.clip();
  const hg = ctx.createRadialGradient(x + w / 2, y + h * .55, 4, x + w / 2, y + h * .55, Math.max(w, h) * .8);
  hg.addColorStop(0, sk.accent + '66'); hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = '#0b0e1e'; ctx.fillRect(x, y, w, h); ctx.fillStyle = hg; ctx.fillRect(x, y, w, h);
  drawHeroTexture(skinPreviewDef(sk), x, y, w, h, now, !!large);
  ctx.restore();
}

function stDrawCard(it, info, r, selected, now){
  const rar = ST_RARITY[info.rarity] || ST_RARITY.free, hov = stInside(r, mouse.x, mouse.y) && stInside(stGridRect, mouse.x, mouse.y);
  const legendary = info.rarity === 'legendary' || info.rarity === 'immortal' || info.rarity === 'arcana';
  ctx.save();
  if(selected || hov || legendary){ ctx.shadowColor = selected ? info.accent : rar.col; ctx.shadowBlur = selected ? 22 : (hov ? 16 : 10); }
  const g = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
  g.addColorStop(0, legendary ? 'rgba(70,40,14,0.97)' : 'rgba(36,28,62,0.97)'); g.addColorStop(1, 'rgba(11,10,24,0.98)');
  ctx.fillStyle = g; stRR(r.x, r.y, r.w, r.h, 13); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = info.equipped ? '#72e6a5' : (selected ? info.accent : (hov ? rar.col : info.border)); ctx.lineWidth = selected ? 2.8 : (hov ? 2 : 1.4); ctx.stroke();
  const artH = Math.round(r.h * 0.66);
  stDrawCardArt(it, info, r.x + 6, r.y + 6, r.w - 12, artH - 6, now, false);
  /* значок статуса поверх картинки */
  if(info.equipped) stPill(r.x + 12, r.y + 12, 74, 18, '● НАДЕТО', '#72e6a5', 'rgba(20,70,45,0.85)', 'bold 9px Segoe UI, Arial');
  else if(info.owned && it.type === 'skin') stPill(r.x + 12, r.y + 12, 74, 18, '✓ ЕСТЬ', '#9fe3b8', 'rgba(20,60,40,0.8)', 'bold 9px Segoe UI, Arial');
  else if(info.owned) stPill(r.x + 12, r.y + 12, 74, 18, '✓ ЕСТЬ', '#9fe3b8', 'rgba(20,60,40,0.8)', 'bold 9px Segoe UI, Arial');
  /* блик для легендарных */
  if(legendary){
    ctx.save(); stRR(r.x, r.y, r.w, r.h, 13); ctx.clip();
    const sx = r.x + (((now * 0.32) % 1.8) - 0.4) * r.w, sg = ctx.createLinearGradient(sx - 40, 0, sx + 40, 0);
    sg.addColorStop(0, 'rgba(255,220,120,0)'); sg.addColorStop(.5, 'rgba(255,220,120,0.16)'); sg.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = sg; ctx.fillRect(r.x, r.y, r.w, r.h); ctx.restore();
  }
  const ty = r.y + artH + 14;
  stText(rar.name, r.x + 10, ty, 'bold 9px Segoe UI, Arial', rar.col, 'left');
  stText(stFit(info.name, r.w - 20, 'bold 13px Georgia, serif'), r.x + 10, ty + 17, 'bold 13px Georgia, serif', info.accent, 'left');
  const py = r.y + r.h - 12;
  if(info.owned){
    stText(info.equipped ? 'надето сейчас' : 'в инвентаре', r.x + 10, py, '11px Segoe UI, Arial', info.equipped ? '#72e6a5' : 'rgba(255,255,255,0.55)', 'left');
  } else if(info.price > 0){
    stShard(r.x + 18, py - 4, 15);
    const bal = stBalance(), can = bal != null && bal >= info.price;
    stText(stFmt(info.price), r.x + 30, py, 'bold 13px Segoe UI, Arial', can ? '#e9fcff' : '#ff9aa4', 'left');
  } else {
    stText('БЕСПЛАТНО', r.x + 10, py, 'bold 11px Segoe UI, Arial', '#ffd568', 'left');
  }
  ctx.restore();
}

function stDrawGrid(L, list, now){
  const G = L.grid, gap = L.compact ? 10 : 14;
  stGridRect = G;
  const cols = G.w >= 470 ? 3 : (G.w >= 230 ? 2 : 1);
  const cw = Math.floor((G.w - gap * (cols - 1) - 8) / cols);
  const ch = Math.round(Math.min(cw * 1.14 + 8, Math.max(150, G.h * 0.7)));
  const rows = Math.ceil(list.length / cols);
  const total = rows * ch + Math.max(0, rows - 1) * gap;
  stScrollMax = Math.max(0, total - G.h + 6);
  stScroll = Math.max(0, Math.min(stScroll, stScrollMax));
  const sel = stSel[storeScreen];
  ctx.save();
  ctx.beginPath(); ctx.rect(G.x - 4, G.y - 2, G.w + 8, G.h + 4); ctx.clip();
  list.forEach((it, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const r = {x:G.x + 2 + col * (cw + gap), y:G.y + 4 + row * (ch + gap) - stScroll, w:cw, h:ch};
    if(r.y + r.h < G.y - 4 || r.y > G.y + G.h + 4) return;
    const info = stItemInfo(it);
    stDrawCard(it, info, r, sel === it.id, now);
    stHit(r, 'card' + it.id, () => { if(stSel[storeScreen] !== it.id){ stSel[storeScreen] = it.id; stConfirm.id = ''; playSynthSfx('select'); } }, true);
  });
  ctx.restore();
  /* полоса прокрутки */
  if(stScrollMax > 0){
    const tr = {x:G.x + G.w + 3, y:G.y, w:5, h:G.h}, thH = Math.max(30, tr.h * (G.h / (G.h + stScrollMax)));
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; stRR(tr.x, tr.y, tr.w, tr.h, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,213,104,0.7)'; stRR(tr.x, tr.y + (tr.h - thH) * (stScroll / stScrollMax), tr.w, thH, 3); ctx.fill();
    /* стрелки для устройств без колеса */
    const up = {x:G.x + G.w - 30, y:G.y + 4, w:26, h:22}, dn = {x:G.x + G.w - 30, y:G.y + G.h - 26, w:26, h:22};
    for(const [b, dir] of [[up, -1], [dn, 1]]){
      if((dir < 0 && stScroll <= 0) || (dir > 0 && stScroll >= stScrollMax)) continue;
      ctx.save(); ctx.fillStyle = 'rgba(10,12,28,0.85)'; stRR(b.x, b.y, b.w, b.h, 6); ctx.fill(); ctx.strokeStyle = 'rgba(255,213,104,0.7)'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.fillStyle = '#ffd568'; ctx.beginPath(); const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      if(dir < 0){ ctx.moveTo(cx - 5, cy + 3); ctx.lineTo(cx + 5, cy + 3); ctx.lineTo(cx, cy - 4); } else { ctx.moveTo(cx - 5, cy - 3); ctx.lineTo(cx + 5, cy - 3); ctx.lineTo(cx, cy + 4); }
      ctx.closePath(); ctx.fill(); ctx.restore();
      stHit(b, 'scroll' + dir, () => { stScroll = Math.max(0, Math.min(stScrollMax, stScroll + dir * (ch + gap) * 0.9)); }, false);
    }
  }
}

/* что делает главная кнопка выбранной карточки */
function stActionFor(it, info){
  if(it.type === 'phrase'){
    return info.owned ? {label:'✓ ПОЛУЧЕНО', kind:'disabled'} : {label:'ЗАБРАТЬ БЕСПЛАТНО', kind:'primary', fn:() => { unlockStorePhrase(it.card.id); stSetMsg('Фраза «' + it.card.title + '» получена', '#72e6a5'); playSynthSfx('coin'); }};
  }
  const sk = it.sk;
  if(info.owned){
    const acc = sk.kind === 'acc';
    return info.equipped
      ? {label:acc ? 'СНЯТЬ ПРЕДМЕТ' : 'СНЯТЬ СКИН', kind:'ghost', fn:() => { setSkinEquipped(sk.id, false); stSetMsg('Снято: ' + sk.name, '#cfc7e8'); playSynthSfx('select'); }}
      : {label:acc ? 'НАДЕТЬ ПРЕДМЕТ' : 'НАДЕТЬ СКИН', kind:'primary', fn:() => { setSkinEquipped(sk.id, true); stSetMsg('Надето: ' + sk.name, '#72e6a5'); playSynthSfx('select'); }};
  }
  if(!(sk.price > 0)){
    return {label:'ЗАБРАТЬ БЕСПЛАТНО', kind:'primary', fn:() => { skinsOwned[sk.id] = true; saveSkinState(); stSetMsg('Получено: ' + sk.name + ' — теперь оно в инвентаре', '#72e6a5'); playSynthSfx('coin'); }};
  }
  if(!account.token) return {label:'ВОЙТИ, ЧТОБЫ КУПИТЬ', kind:'primary', fn:() => { if(typeof openAccountModal === 'function') openAccountModal(); }};
  if(stBuying) return {label:'ПОКУПКА…', kind:'disabled'};
  const bal = stBalance() || 0;
  if(bal < sk.price) return {label:'НЕ ХВАТАЕТ ' + stFmt(sk.price - bal) + ' СЕНСИКОВ', kind:'disabled'};
  if(stConfirm.id === sk.id && performance.now() - stConfirm.t < 4000) return {label:'ПОДТВЕРДИТЬ: −' + stFmt(sk.price), kind:'primary', fn:() => stBuy(sk)};
  return {label:'КУПИТЬ ЗА ' + stFmt(sk.price), kind:'primary', priceIcon:true, fn:() => { stConfirm = {id:sk.id, t:performance.now()}; playSynthSfx('click'); }};
}
async function stBuy(sk){
  if(stBuying) return;
  stBuying = true; stConfirm.id = '';
  try {
    const data = await accountApi('buyskin', {token:account.token, skinId:sk.id});
    if(data && data.profile){ account.profile = data.profile; accountStore(ACCOUNT_PROFILE_KEY, JSON.stringify(data.profile)); }
    syncPaidSkins();
    if(data && data.bought){ setSkinEquipped(sk.id, true); stSetMsg('Куплено и надето: ' + sk.name, '#72e6a5'); playSynthSfx('coin'); }
    else stSetMsg('Этот скин уже есть в твоём инвентаре', '#cfc7e8');
  } catch(err){
    if(err && err.status === 401){ stSetMsg('Сессия истекла — войди в аккаунт заново', '#ff9aa4'); }
    else stSetMsg((err && err.message) || 'Не удалось купить скин', '#ff9aa4');
  } finally { stBuying = false; }
}

function stDrawDetail(L, it, now){
  const D = L.detail;
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.045)'; stRR(D.x, D.y, D.w, D.h, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(215,179,106,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.restore();
  if(!it){
    stText('Выбери предмет', D.x + D.w / 2, D.y + D.h / 2, 'bold 14px Segoe UI, Arial', 'rgba(255,255,255,0.45)', 'center');
    return;
  }
  const info = stItemInfo(it), rar = ST_RARITY[info.rarity] || ST_RARITY.free;
  const pad = 12;
  const btnH = L.tiny ? 36 : 44;
  const pvH = Math.round(Math.max(L.tiny ? 80 : 110, Math.min(D.w - 2 * pad, D.h * (L.tiny ? 0.42 : 0.46))));
  ctx.save();
  ctx.shadowColor = info.accent; ctx.shadowBlur = 22; ctx.fillStyle = 'rgba(0,0,0,0.01)'; stRR(D.x + pad, D.y + pad, D.w - 2 * pad, pvH, 14); ctx.fill(); ctx.shadowBlur = 0;
  ctx.restore();
  stDrawCardArt(it, info, D.x + pad, D.y + pad, D.w - 2 * pad, pvH, now, true);
  ctx.save(); ctx.strokeStyle = info.border; ctx.lineWidth = 1.6; stRR(D.x + pad, D.y + pad, D.w - 2 * pad, pvH, 14); ctx.stroke(); ctx.restore();
  let y = D.y + pad + pvH + 20;
  stPill(D.x + pad, y - 12, Math.min(D.w - 2 * pad, 112), 18, rar.name, rar.col, 'rgba(0,0,0,0.35)', 'bold 9px Segoe UI, Arial');
  y += 20;
  const nameFont = 'bold ' + (L.tiny ? 16 : 19) + 'px Georgia, serif';
  stText(stFit(info.name, D.w - 2 * pad, nameFont), D.x + pad, y, nameFont, info.accent, 'left');
  y += 17;
  stText(stFit(info.who, D.w - 2 * pad, '11px Segoe UI, Arial'), D.x + pad, y, '11px Segoe UI, Arial', 'rgba(190,175,255,0.85)', 'left');
  y += 8;
  const act = stActionFor(it, info);
  const priceRow = (!info.owned && info.price > 0) ? 24 : 0;
  const btnY = D.y + D.h - pad - btnH;
  const descBottom = btnY - 8 - priceRow;
  const lineH = 15, maxLines = Math.max(0, Math.floor((descBottom - y) / lineH));
  if(maxLines > 0){
    const lines = wrapMenuText(info.desc, D.w - 2 * pad, '12px Segoe UI, Arial');
    const shown = lines.slice(0, maxLines);
    if(lines.length > maxLines && shown.length) shown[shown.length - 1] = stFit(shown[shown.length - 1] + ' …', D.w - 2 * pad, '12px Segoe UI, Arial');
    shown.forEach((ln, i) => stText(ln, D.x + pad, y + 12 + i * lineH, '12px Segoe UI, Arial', 'rgba(255,240,235,0.78)', 'left'));
  }
  if(priceRow){
    const bal = stBalance(), can = bal != null && bal >= info.price, py = btnY - 10;
    stShard(D.x + pad + 10, py - 5, 20);
    stText(stFmt(info.price), D.x + pad + 26, py, 'bold 18px Segoe UI, Arial', can ? '#e9fcff' : '#ff9aa4', 'left');
    stText(bal == null ? 'нужен аккаунт' : 'у тебя: ' + stFmt(bal), D.x + D.w - pad, py - 1, '11px Segoe UI, Arial', 'rgba(255,255,255,0.5)', 'right');
  }
  stButton({x:D.x + pad, y:btnY, w:D.w - 2 * pad, h:btnH}, act.label, act.kind, 'action', act.fn);
}

function stDrawEmpty(L){
  const G = L.grid;
  const cx = G.x + G.w / 2, cy = G.y + G.h * 0.38;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,213,104,0.5)'; ctx.lineWidth = 2.5; ctx.beginPath();
  ctx.roundRect(cx - 34, cy - 30, 68, 56, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 34, cy - 12); ctx.lineTo(cx + 34, cy - 12); ctx.stroke(); ctx.restore();
  stText(storeScreen === 'inventory' ? 'ЗДЕСЬ ПОКА ПУСТО' : 'В ЭТОЙ КАТЕГОРИИ НИЧЕГО НЕТ', cx, cy + 56, 'bold 16px Segoe UI, Arial', '#dce5ef', 'center');
  if(storeScreen === 'inventory'){
    stText('Забери бесплатный скин или купи новый за Сенсики.', cx, cy + 78, '12px Segoe UI, Arial', 'rgba(255,255,255,0.55)', 'center');
    stButton({x:cx - 100, y:cy + 94, w:200, h:42}, 'ОТКРЫТЬ МАГАЗИН', 'primary', 'toshop', () => { storeScreen = 'shop'; stScroll = 0; playSynthSfx('select'); });
  }
}

function drawStorePanel(){
  const now = performance.now() / 1000;
  stHits = [];
  const L = stLayout();
  stDrawBackdrop(L, now);
  stDrawHeader(L);
  if(L.compact) stDrawChips(L); else stDrawSide(L);
  stDrawFilter(L);
  const list = stVisibleItems();
  let sel = list.find(it => it.id === stSel[storeScreen]);
  if(!sel && list.length){ sel = list[0]; stSel[storeScreen] = sel.id; }
  stGridRect = L.grid;
  if(list.length) stDrawGrid(L, list, now); else stDrawEmpty(L);
  stDrawDetail(L, list.length ? sel : null, now);
  /* всплывающее сообщение */
  const age = performance.now() - stMsg.t;
  if(stMsg.text && age < 3200){
    const a = Math.min(1, Math.max(0, Math.min(age / 150, (3200 - age) / 400)));
    ctx.save(); ctx.globalAlpha = a;
    const font = 'bold 13px Segoe UI, Arial'; ctx.font = font;
    const tw = Math.min(L.P.w - 40, Math.ceil(ctx.measureText(stMsg.text).width) + 36), mx = L.grid.x + L.grid.w / 2 - tw / 2, my = L.P.y + L.P.h - 56;
    ctx.fillStyle = 'rgba(8,12,26,0.95)'; stRR(mx, my, tw, 34, 17); ctx.fill();
    ctx.strokeStyle = stMsg.color; ctx.lineWidth = 1.5; ctx.stroke();
    stText(stFit(stMsg.text, tw - 20, font), mx + tw / 2, my + 22, font, stMsg.color, 'center');
    ctx.restore();
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}

/* ---------------- ввод ---------------- */
function storeHandleClick(mx, my){
  const L = stLayout();
  if(!stInside(L.P, mx, my)){ storeClose(); return; }
  for(let i = stHits.length - 1; i >= 0; i--){
    const h = stHits[i];
    if(!stInside(h, mx, my)) continue;
    if(h.grid && stGridRect && !stInside(stGridRect, mx, my)) continue;
    if(h.fn) h.fn();
    return;
  }
}
function storeWheel(e){
  if(!stGridRect || stScrollMax <= 0) return;
  const cr = canvas.getBoundingClientRect(), wx = (e.clientX - cr.left) * (VW / cr.width), wy = (e.clientY - cr.top) * (VH / cr.height);
  const L = stLayout();
  if(!stInside(L.P, wx, wy)) return;
  const prev = stScroll;
  stScroll = Math.max(0, Math.min(stScrollMax, stScroll + e.deltaY));
  if(stScroll !== prev) playSynthSfx('scroll');
}
window.addEventListener('keydown', e => {
  if(e.key === 'Escape' && typeof storeOpen !== 'undefined' && storeOpen && gameState === 'menu'){ storeClose(); e.preventDefault(); }
});
/* STORE-UI:END */
