/* DotaSense 0.10.6.4 — КРАСИВАЯ КНОПКА МАГАЗИНА И БЫСТРАЯ ПОКУПКА.
   • Кнопка магазина в матче стала больше и нагляднее: золотая рамка, монета с бликом, золото крупным шрифтом,
     подсветка при наведении, пульсация и счётчик-значок, когда на быструю покупку хватает золота.
   • Над кнопкой — панель «БЫСТРАЯ ПОКУПКА»: два ближайших непокупленных предмета из сборки героя (раздел «От создателей»).
     Клик по предмету покупает его, не открывая магазин (рецепты докупают недостающие части сами). При наведении — подсказка, зачем предмет в сборке.
     Купил предмет — на его место приходит следующий из сборки. Пока открыт магазин, панель скрыта.
   • Ещё два ежедневных задания для Сенсиков (accounts.js): «Победа дня» и «Мастер поддержки» — клиент рисует их сам из профиля.
   Отрисовка вызывается из drawShop() в game.js через window.drawShopButton0664. Подключается после update01063.js. */
(function(){
'use strict';
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update01064 ' + tag + ':', err); } catch(e) {} } };
const F = 'Segoe UI, Arial';
const GOLD = '#ffd568', GOLD_D = '#8a6a2a', GOLD_L = '#f3d08f', MUTED = 'rgba(255,255,255,0.58)', RED = '#ff8a80', GREEN = '#7dffb0';
const TAU = Math.PI * 2;
const inR = (r, x, y) => !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const mob = () => VW < 720;

/* ---------- геометрия кнопки: крупнее прежней, прежние правила размещения над панелью героя ---------- */
try {
  shopButtonRect = function(){
    const w = mob() ? 150 : 198, h = mob() ? 44 : 56;
    const rect = {x: VW - 10 - w, y: VH - 10 - h, w, h};
    const panel = combatHudLayout().panel;
    if(mob()) rect.y = panel.y - h - 6;
    else if(rect.x < panel.x + panel.w + 6) rect.y = panel.y - h - 8;
    return rect;
  };
} catch(err) { warn('rect', err); }

/* ---------- выбор двух ближайших предметов сборки ---------- */
function buildList(h){
  const out = [], seen = new Set();
  const push = (id, why) => { if(id && !seen.has(id) && SHOP_ITEMS[id] && id !== 'observerWard'){ seen.add(id); out.push({id, why: why || ''}); } };
  const b = typeof CREATOR_BUILDS !== 'undefined' && h && h.def ? CREATOR_BUILDS[h.def.id] : null;
  if(b && Array.isArray(b.categories)){
    for(const c of b.categories) for(const it of (c.items || [])) push(it[0], it[1]);
  }
  if(!out.length && typeof HERO_GUIDES !== 'undefined' && h && h.def && HERO_GUIDES[h.def.id] && Array.isArray(HERO_GUIDES[h.def.id].build)){
    for(const id of HERO_GUIDES[h.def.id].build) push(id, '');
  }
  return out;
}
/* что уже «есть» у героя: предметы в инвентаре, их компоненты (они сгорели в сборке), шард и купленные расходники */
function haveSet(h){
  const set = new Set();
  const add = id => {
    if(!id || set.has(id)) return;
    set.add(id);
    if(id === 'pt'){ add('joelBoots'); add('fangs'); }
    const r = typeof RECIPES !== 'undefined' ? RECIPES[id] : null;
    if(r) r.parts.forEach(add);
  };
  for(const it of (h.inventory || [])) if(it) add(it.id);
  if(h.shardSkill) set.add('aghanimShard');
  if(h.__qb0664) h.__qb0664.forEach(id => set.add(id));
  return set;
}
function costOf(h, id){
  try {
    if(typeof RECIPES !== 'undefined' && RECIPES[id]) return recipeStatus(h, id).need;
    if(id === 'pt') return ptPrice(h);
  } catch(err) { warn('cost', err); }
  const it = SHOP_ITEMS[id];
  return it ? (it.cost || 0) : 0;
}
function slotOk(h, id){
  if(id === 'aghanimShard') return true;
  if((h.inventory || []).some(i => !i)) return true;
  try {
    if(id === 'pt') return (h.inventory || []).some(i => i && (i.id === 'joelBoots' || i.id === 'fangs'));
    if(typeof RECIPES !== 'undefined' && RECIPES[id]) return recipeStatus(h, id).have.length > 0;
    return !!recipeCompletedBy(h, id);
  } catch(err) { return false; }
}
function pick(h){
  if(!h || !h.inventory) return [];
  const have = haveSet(h), out = [];
  for(const e of buildList(h)){
    if(have.has(e.id)) continue;
    const cost = costOf(h, e.id), coins = Math.floor(h.coins || 0);
    out.push({id: e.id, why: e.why, cost, can: coins >= cost, room: slotOk(h, e.id)});
    if(out.length >= 2) break;
  }
  return out;
}

window.quickBuyPick0664 = pick;   /* открыт для проверок и других обновлений */

/* ---------- раскладка панели над кнопкой ---------- */
const iconCache = {};
function iconOf(id){
  if(!iconCache[id]){
    try { iconCache[id] = createInventoryItem(id); }
    catch(err) { const c = SHOP_ITEMS[id] || {}; iconCache[id] = {id, color: c.color || '#8be9fd', icon: c.icon, name: c.name}; }
  }
  return iconCache[id];
}
function layout(btn, n){
  const m = mob(), pad = m ? 5 : 7, gap = m ? 5 : 6, headH = m ? 13 : 17, slotH = m ? 56 : 68;
  const w = btn.w, ph = pad + headH + slotH + pad;
  const panel = {x: btn.x, y: btn.y - 7 - ph, w, h: ph};
  const sw = Math.floor((w - pad * 2 - gap * (2 - 1)) / 2);
  const slots = [];
  for(let i = 0; i < n; i++) slots.push({x: panel.x + pad + i * (sw + gap), y: panel.y + pad + headH, w: sw, h: slotH});
  return {panel, slots, pad, headH, m};
}

/* ---------- примитивы ---------- */
function rr(x, y, w, h, r){
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function fit(t, w){
  t = String(t);
  if(ctx.measureText(t).width <= w) return t;
  while(t.length > 1 && ctx.measureText(t + '…').width > w) t = t.slice(0, -1);
  return t + '…';
}
function wrap(t, w, maxLines){
  const words = String(t).split(/\s+/), lines = [];
  let cur = '';
  for(const word of words){
    const test = cur ? cur + ' ' + word : word;
    if(ctx.measureText(test).width > w && cur){ lines.push(cur); cur = word; if(lines.length >= maxLines) break; }
    else cur = test;
  }
  if(lines.length < maxLines && cur) lines.push(cur);
  if(lines.length === maxLines && words.join(' ').length > lines.join(' ').length) lines[maxLines - 1] = fit(lines[maxLines - 1] + '…', w);
  return lines;
}
function coin(cx, cy, r, t){
  ctx.save();
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#fff3b0'); g.addColorStop(0.55, '#e8b93c'); g.addColorStop(1, '#a8761a');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#6b4a0c'; ctx.lineWidth = Math.max(1.5, r * 0.14); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,248,200,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r * 0.68, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#6b4a0c'; ctx.font = 'bold ' + Math.round(r * 1.05) + 'px Consolas, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('$', cx, cy + 0.5);
  /* блик пробегает по монете раз в несколько секунд */
  const ph = (t % 4.2) / 0.9;
  if(ph < 1){
    ctx.beginPath(); ctx.arc(cx, cy, r - 1, 0, TAU); ctx.clip();
    ctx.globalAlpha = 0.65 * Math.sin(ph * Math.PI);
    ctx.fillStyle = '#ffffff'; ctx.translate(cx + (ph - 0.5) * r * 3, cy); ctx.rotate(0.6); ctx.fillRect(-r * 0.12, -r * 1.6, r * 0.28, r * 3.2);
  }
  ctx.restore();
}
const press = {};   /* id → время клика, для короткой анимации нажатия */
const S = {drawnAt: 0, slots: [], panel: null, hover: -1};

/* ---------- кнопка магазина ---------- */
window.drawShopButton0664 = function(btn, h, open){
  const now = performance.now(), t = now / 1000, m = mob();
  const hov = inR(btn, mouse.x, mouse.y);
  const items = open ? [] : pick(h);
  const ready = items.filter(i => i.can && i.room).length;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
  const lift = hov && !open ? -1 : 0;
  const x = btn.x, y = btn.y + lift, w = btn.w, hh = btn.h, rad = m ? 9 : 11;

  ctx.save();
  /* свечение: золотое при готовой покупке, мягкое при наведении */
  if(!open && (ready || hov)){
    ctx.shadowColor = ready ? 'rgba(255,213,104,' + (0.35 + 0.35 * pulse) + ')' : 'rgba(255,213,104,0.35)';
    ctx.shadowBlur = ready ? 14 + 8 * pulse : 12;
  } else { ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
  const bg = ctx.createLinearGradient(x, y, x, y + hh);
  if(open){ bg.addColorStop(0, 'rgba(98,76,38,0.98)'); bg.addColorStop(1, 'rgba(40,30,14,0.99)'); }
  else if(hov){ bg.addColorStop(0, 'rgba(58,50,36,0.98)'); bg.addColorStop(1, 'rgba(20,18,14,0.99)'); }
  else { bg.addColorStop(0, 'rgba(36,36,38,0.97)'); bg.addColorStop(1, 'rgba(12,13,16,0.99)'); }
  ctx.fillStyle = bg; rr(x, y, w, hh, rad); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  /* золотая двойная рамка */
  const bd = ctx.createLinearGradient(x, y, x + w, y + hh);
  bd.addColorStop(0, GOLD_L); bd.addColorStop(0.5, open ? '#e2c07a' : '#b8903f'); bd.addColorStop(1, GOLD_D);
  ctx.strokeStyle = bd; ctx.lineWidth = 2; rr(x + 1, y + 1, w - 2, hh - 2, rad); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,236,180,0.18)'; ctx.lineWidth = 1; rr(x + 4, y + 4, w - 8, hh - 8, Math.max(4, rad - 3)); ctx.stroke();
  /* верхний блик */
  const gl = ctx.createLinearGradient(x, y, x, y + hh * 0.5);
  gl.addColorStop(0, 'rgba(255,255,255,0.10)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gl; rr(x + 3, y + 3, w - 6, hh * 0.46, Math.max(4, rad - 3)); ctx.fill();

  /* монета и золото */
  const cr = m ? 11 : 14, cx = x + (m ? 20 : 24), cy = y + hh / 2;
  coin(cx, cy, cr, t);
  const gx = cx + cr + (m ? 7 : 9);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = GOLD; ctx.font = 'bold ' + (m ? 16 : 21) + 'px ' + F;
  ctx.fillText(String(shownGold(h)), gx, cy + (m ? 2 : 3));
  ctx.fillStyle = MUTED; ctx.font = 'bold ' + (m ? 8 : 9) + 'px ' + F;
  ctx.fillText('ЗОЛОТО', gx, cy + (m ? 13 : 17));

  /* подпись справа + шеврон */
  ctx.textAlign = 'right';
  ctx.fillStyle = open ? '#fff3c4' : (hov ? '#ffffff' : 'rgba(255,255,255,0.86)'); ctx.font = 'bold ' + (m ? 10 : 12) + 'px ' + F;
  ctx.fillText(open ? 'ЗАКРЫТЬ' : 'МАГАЗИН', x + w - (m ? 22 : 26), cy + (m ? 4 : 5));
  const chx = x + w - (m ? 12 : 14), chy = cy, d = m ? 3.5 : 4.5;
  ctx.strokeStyle = open ? '#fff3c4' : GOLD; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  if(open){ ctx.moveTo(chx - d, chy - d * 0.5); ctx.lineTo(chx, chy + d * 0.6); ctx.lineTo(chx + d, chy - d * 0.5); }
  else { ctx.moveTo(chx - d, chy + d * 0.6); ctx.lineTo(chx, chy - d * 0.5); ctx.lineTo(chx + d, chy + d * 0.6); }
  ctx.stroke();

  /* значок «можно купить из сборки» */
  if(!open && ready){
    const bx = x + w - 10, by = y + 2, br = m ? 8 : 9.5;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(bx, by + 1, br + 1.5, 0, TAU); ctx.fill();
    const bgr = ctx.createRadialGradient(bx - 2, by - 2, 1, bx, by, br);
    bgr.addColorStop(0, '#9dffc4'); bgr.addColorStop(1, '#27a65a');
    ctx.fillStyle = bgr; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#0f5a2e'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#04210f'; ctx.font = 'bold ' + (m ? 10 : 12) + 'px ' + F; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(ready), bx, by + 0.5);
  }
  ctx.restore();

  /* панель быстрой покупки */
  S.drawnAt = 0; S.slots = []; S.panel = null; S.hover = -1;
  if(!open && items.length){
    try { drawQuick(btn, h, items, now, t); } catch(err) { warn('quick', err); }
  }
  return true;
};

/* ---------- панель быстрой покупки ---------- */
function drawQuick(btn, h, items, now, t){
  const L = layout(btn, items.length), P = L.panel, m = L.m;
  ctx.save();
  /* корпус */
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  const bg = ctx.createLinearGradient(P.x, P.y, P.x, P.y + P.h);
  bg.addColorStop(0, 'rgba(26,30,38,0.96)'); bg.addColorStop(1, 'rgba(9,11,16,0.98)');
  ctx.fillStyle = bg; rr(P.x, P.y, P.w, P.h, 10); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.strokeStyle = 'rgba(199,169,107,0.75)'; ctx.lineWidth = 1.5; rr(P.x + 0.75, P.y + 0.75, P.w - 1.5, P.h - 1.5, 10); ctx.stroke();
  /* заголовок */
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillStyle = GOLD; ctx.font = 'bold ' + (m ? 8 : 9.5) + 'px ' + F;
  ctx.fillText('⚡ БЫСТРАЯ ПОКУПКА', P.x + L.pad + 2, P.y + L.pad + (m ? 9 : 11));
  ctx.textAlign = 'right'; ctx.fillStyle = MUTED; ctx.font = (m ? 8 : 9) + 'px ' + F;
  ctx.fillText('из сборки', P.x + P.w - L.pad - 2, P.y + L.pad + (m ? 9 : 11));

  let hover = -1;
  items.forEach((e, i) => {
    const r = L.slots[i], item = SHOP_ITEMS[e.id];
    const hov = inR(r, mouse.x, mouse.y); if(hov) hover = i;
    const ok = e.can && e.room, col = item.color || '#8be9fd';
    const pr = press[e.id] ? Math.max(0, 1 - (now - press[e.id]) / 180) : 0;
    const sh = pr * 2;   /* «вдавливание» при клике */
    const rx = r.x + sh, ry = r.y + sh, rw = r.w - sh * 2, rh = r.h - sh * 2;
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.6 + i);
    ctx.save();
    if(ok){ ctx.shadowColor = col; ctx.shadowBlur = hov ? 14 : 5 + 5 * pulse; }
    const sg = ctx.createLinearGradient(rx, ry, rx, ry + rh);
    sg.addColorStop(0, ok ? (hov ? 'rgba(66,84,104,0.98)' : 'rgba(44,58,74,0.97)') : 'rgba(26,30,36,0.96)');
    sg.addColorStop(1, 'rgba(8,12,18,0.98)');
    ctx.fillStyle = sg; rr(rx, ry, rw, rh, 8); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
    ctx.strokeStyle = ok ? col : 'rgba(255,255,255,0.22)'; ctx.lineWidth = ok ? 2 : 1.5; rr(rx + 1, ry + 1, rw - 2, rh - 2, 8); ctx.stroke();
    if(hov && ok){ ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1; rr(rx + 3.5, ry + 3.5, rw - 7, rh - 7, 6); ctx.stroke(); }
    /* иконка */
    ctx.globalAlpha = ok ? 1 : 0.55;
    const isz = m ? 24 : 30;
    try { drawItemIcon(iconOf(e.id), rx + rw / 2, ry + (m ? 17 : 21), isz); } catch(err) { warn('icon', err); }
    ctx.globalAlpha = 1;
    /* название */
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold ' + (m ? 8.5 : 10) + 'px ' + F; ctx.fillStyle = ok ? '#f2f5f7' : 'rgba(255,255,255,0.5)';
    ctx.fillText(fit(item.name, rw - 8), rx + rw / 2, ry + (m ? 38 : 47));
    /* цена или причина */
    ctx.font = 'bold ' + (m ? 10 : 12) + 'px ' + F;
    if(!e.room){ ctx.fillStyle = RED; ctx.fillText('НЕТ СЛОТА', rx + rw / 2, ry + rh - (m ? 5 : 6)); }
    else {
      const txt = String(e.cost), tw = ctx.measureText(txt).width, dot = m ? 3.5 : 4.5;
      const cx0 = rx + rw / 2 - (tw + dot * 2 + 4) / 2;
      ctx.fillStyle = '#e8b93c'; ctx.beginPath(); ctx.arc(cx0 + dot, ry + rh - (m ? 8.5 : 10), dot, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#8a6414'; ctx.lineWidth = 1; ctx.stroke();
      ctx.textAlign = 'left'; ctx.fillStyle = e.can ? GREEN : RED;
      ctx.fillText(txt, cx0 + dot * 2 + 4, ry + rh - (m ? 5 : 6));
    }
    ctx.restore();
    S.slots.push({rect: r, id: e.id});
  });
  ctx.restore();
  S.panel = P; S.hover = hover; S.drawnAt = now;

  /* подсказка при наведении */
  if(hover >= 0 && !m) drawTip(items[hover], L.slots[hover], P);
}
function drawTip(e, r, P){
  const item = SHOP_ITEMS[e.id]; if(!item) return;
  const W = 262, pad = 12;
  ctx.save();
  ctx.font = '11px ' + F;
  const lines = e.why ? wrap(e.why, W - pad * 2, 4) : [];
  const status = !e.room ? 'Нет свободного слота' : (e.can ? 'Нажми, чтобы купить' : 'Не хватает ' + (e.cost - Math.floor(playerHero.coins || 0)) + ' монет');
  const Hh = pad + 18 + 16 + (lines.length ? lines.length * 14 + 6 : 0) + 18 + pad - 4;
  let x = Math.min(VW - W - 8, Math.max(8, P.x + P.w - W)), y = P.y - Hh - 8;
  if(y < 8) y = 8;
  const bg = ctx.createLinearGradient(x, y, x, y + Hh);
  bg.addColorStop(0, 'rgba(22,28,38,0.98)'); bg.addColorStop(1, 'rgba(8,10,15,0.99)');
  ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 12;
  ctx.fillStyle = bg; rr(x, y, W, Hh, 10); ctx.fill(); ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.strokeStyle = item.color || GOLD; ctx.lineWidth = 2; rr(x + 1, y + 1, W - 2, Hh - 2, 10); ctx.stroke();
  let ty = y + pad + 12;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = GOLD; ctx.font = 'bold 14px ' + F; ctx.fillText(fit(item.name, W - pad * 2 - 64), x + pad, ty);
  ctx.textAlign = 'right'; ctx.fillStyle = e.can ? GREEN : RED; ctx.fillText(String(e.cost), x + W - pad, ty);
  ty += 18;
  ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(139,233,253,0.9)'; ctx.font = 'bold 10px ' + F; ctx.fillText('ИЗ СБОРКИ ОТ СОЗДАТЕЛЕЙ', x + pad, ty);
  ty += 6;
  ctx.fillStyle = 'rgba(255,255,255,0.78)'; ctx.font = '11px ' + F;
  lines.forEach(l => { ty += 14; ctx.fillText(l, x + pad, ty); });
  ty += lines.length ? 22 : 18;
  ctx.fillStyle = !e.room ? RED : (e.can ? GREEN : '#ffb0a8'); ctx.font = 'bold 11px ' + F; ctx.fillText(status, x + pad, ty);
  ctx.restore();
}

/* ---------- клики ---------- */
try {
  const _hud = handleHudClick;
  handleHudClick = function(mx, my){
    try {
      if(!shopOpen && playerHero && performance.now() - S.drawnAt < 250 && S.panel){
        for(const s of S.slots){
          if(!inR(s.rect, mx, my)) continue;
          press[s.id] = performance.now();
          try { playSynthSfx('click'); } catch(e) {}
          buyShopItem(s.id);   /* сообщения об ошибках покажет сам магазин */
          return true;
        }
        if(inR(S.panel, mx, my)) return true;   /* клик по рамке панели не уходит на карту */
      }
    } catch(err) { warn('click', err); }
    return _hud.apply(this, arguments);
  };
} catch(err) { warn('clickHook', err); }

/* ---------- запоминаем купленные расходники (Танго, Манго…), чтобы панель не предлагала их снова ---------- */
try {
  const _buy = buyShopItem;
  buyShopItem = function(id){
    const ok = _buy.apply(this, arguments);
    try {
      if(ok && playerHero && typeof shopItemCategory === 'function' && shopItemCategory(id) === 1){
        if(!playerHero.__qb0664) playerHero.__qb0664 = new Set();
        playerHero.__qb0664.add(id);
      }
    } catch(err) { warn('buy', err); }
    return ok;
  };
} catch(err) { warn('buyHook', err); }
})();
