/* DotaSense 0.10.4.2 — ПАНЕЛЬ ПРЕДМЕТА ПРИ НАВЕДЕНИИ В МАГАЗИНЕ (как в Доте) + Танго и Манго дешевле на 30 монет.
   • Наводишь курсор на предмет в магазине (сетка, рекомендации слева или инвентарь внизу) — рядом с ним появляется панель:
     название, цена, тип, характеристики (зелёные бонусы), активная способность с КД/маной, рецепт и блок «ИЗМЕНЕНИЯ».
   • «ИЗМЕНЕНИЯ» — история правок предмета по версиям (цена, статы, механика). Предметы, изменённые в последнем обновлении,
     помечены золотой плашкой «ИЗМ.» прямо на карточке.
   • Цены Танго (54) и Манго (35) заданы в game.js рядом с остальными правками цен.
   Подключается после update01041.js. Данные о правках — в таблице ITEM_CHANGES ниже: чтобы пометить будущую правку,
   добавь запись {v:'версия', t:'что изменилось'} первой в массив нужного предмета и поменяй LATEST. */
(function(){
'use strict';
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update01042 ' + tag + ':', err); } catch(e) {} } };
if(typeof drawShop !== 'function' || typeof SHOP_ITEMS === 'undefined') return;

const LATEST = '0.10.4.2';
/* Самые свежие правки — первыми. Только то, что реально есть в журнале обновлений. */
const ITEM_CHANGES = {
  tango:        [{v:'0.10.4.2', t:'Цена снижена на 30 монет: 84 → 54.'}],
  mango:        [{v:'0.10.4.2', t:'Цена снижена на 30 монет: 65 → 35.'}],
  evsyutin:     [{v:'0.10.4', t:'Цена снижена на 200 монет: 1163 → 963.'}],
  titanHeart:   [{v:'0.10.4', t:'Подешевел на 200 монет вместе с Еблетом Евсютина (входит в рецепт).'}, {v:'0.9.5.2', t:'Новый предмет: Сатаник + Еблет Евсютина + 1000 монет.'}],
  pt:           [{v:'0.10.3', t:'Рецепт подешевел: 150 → 100 монет (сборка целиком на 50 дешевле).'},
                 {v:'0.9.8.9', t:'Ослаблен: рецепт 186 → 150, урон +180 → +40, скорость передвижения +60 → +15, скорость атаки +60% → +15%.'}],
  stormbringer: [{v:'0.10.0', t:'Ослаблен: урон +320 → +150, скорость атаки +90% → +80%. Скорость передвижения (+95) не менялась.'},
                 {v:'0.9.5.2', t:'Новый предмет: ПТ + Бошка Семёна + 600 монет.'}],
  manaTome:     [{v:'0.9.8.9', t:'Цена снижена: 512 → 200 монет.'}],
  superBoots:   [{v:'0.9.8.9', t:'Цена снижена: 2744 → 1350 монет.'}],
  archmageRobe: [{v:'0.9.5.2', t:'Новый предмет: рецепт из Капыт-Дерезладии, Научилсяловить и Врагов-302 школы.'}],
  evsyutinBrain:[{v:'0.10.3.5', t:'Новый предмет: −20% к перезарядке способностей, +100 к дальности атаки, +30% к скорости атаки.'}],
  duskRegalia:  [{v:'0.9.9.7', t:'Новый особый предмет: Око Бездны + Плащ Тихого Часа + 1500 монет (один экземпляр).'}],
  abyssEye:     [{v:'0.9.9.0.1', t:'Новый особый предмет.'}],
  hushCloak:    [{v:'0.9.9.0.1', t:'Новый особый предмет.'}],
  chronoHourglass:[{v:'0.9.7.4', t:'Новый особый предмет.'}],
  reaperScythe: [{v:'0.9.7.4', t:'Новый особый предмет.'}],
  phoenixFeather:[{v:'0.9.7.4', t:'Новый особый предмет.'}],
  superBlink:   [{v:'0.9.7', t:'Новый предмет: Блинк + Дагонская империя + 1400 монет.'}],
  kingSlayer:   [{v:'0.9.7', t:'Новый предмет: Кингляндия + Бошка Семёна + 1500 монет.'}],
  eternalAegis: [{v:'0.9.7', t:'Новый предмет: Жирфсютин + БКБ + 1500 монет.'}],
  sorcererCrown:[{v:'0.9.7', t:'Новый предмет: Octarine Core + Кая и Санга + 1500 монет.'}],
  galeBoots:    [{v:'0.9.7', t:'Новый предмет: Супер сапог + Яйцо-голли + 1000 монет.'}],
  observerWard: [{v:'0.9.6', t:'Новый предмет: вард для контроля обзора.'}]
};

const F = 'Segoe UI, Arial';
const GREEN = '#7dffb0', GOLD = '#ffd568', MUTED = 'rgba(255,255,255,0.55)', TXT = '#f2f5f7', RED = '#ff8a80';
const PW = 340, PAD = 14;

/* ---------- разбор описания на секции ---------- */
function parseDesc(full){
  const out = {passive: [], active: [], text: [], cd: null, mana: null, dur: null};
  const sentences = String(full || '').split(/(?<=[.!?])\s+(?=[А-ЯЁA-Z«])/);
  let sec = 'text';
  for(let s of sentences){
    s = s.trim(); if(!s) continue;
    let m;
    if((m = s.match(/^КД\s*([\d.,]+)\s*сек/i))){ out.cd = m[1]; continue; }
    if((m = s.match(/^Активация расходует\s*([\d.,]+)\s*мана?/i)) || (m = s.match(/^Активация расходует\s*([\d.,]+)\s*ман/i))){ out.mana = m[1]; continue; }
    if(/^Рецепт\s*:/i.test(s)) continue;            /* рецепт рисуется отдельным блоком */
    if(/^Пассивно\s*:/i.test(s)){ sec = 'passive'; s = s.replace(/^Пассивно\s*:\s*/i, ''); }
    else if(/^Активн\S*(\s+расходуемый\s+предмет)?\s*:/i.test(s)){ sec = 'active'; s = s.replace(/^Активн\S*(\s+расходуемый\s+предмет)?\s*:\s*/i, ''); }
    else if(/^Активн/i.test(s)){ sec = 'active'; }
    else if(/^Сборка\s*:/i.test(s)){ sec = 'text'; }
    /* КД, вписанное в конец предложения: «… КД 25 сек.» */
    s = s.replace(/\s*КД\s*([\d.,]+)\s*сек\.?\s*$/i, (mm, d) => { if(out.cd == null) out.cd = d; return ''; }).trim();
    if(!s) continue;
    s = s.charAt(0).toUpperCase() + s.slice(1);
    out[sec].push(s);
  }
  return out;
}
/* «+45 к скорости передвижения» → {num:'+45', label:'к скорости передвижения'} */
function statRows(sentences){
  const rows = [];
  for(const s of sentences){
    const pieces = s.replace(/\.$/, '').split(/,\s+(?=[+−-]\s?\d)|\s+и\s+(?=[+−-]\s?\d)|,\s+(?=обычные атаки)/);
    for(const pc of pieces){
      const m = pc.match(/^([+−-]\s?[\d.,]+\s?%?)\s*(.*)$/);
      if(m) rows.push({num: m[1].replace(/\s/g, ''), label: m[2] || ''});
      else rows.push({text: pc.charAt(0).toUpperCase() + pc.slice(1) + (pieces.length === 1 ? '.' : '')});
    }
  }
  return rows;
}

/* ---------- перенос текста ---------- */
function wrap(text, maxW, font){
  ctx.font = font;
  const words = String(text).split(' '), lines = [];
  let line = '';
  for(const w of words){
    const cand = line ? line + ' ' + w : w;
    if(ctx.measureText(cand).width > maxW && line){ lines.push(line); line = w; } else line = cand;
  }
  if(line) lines.push(line);
  return lines;
}

/* ---------- построение блоков панели (сначала считаем высоту, потом рисуем) ---------- */
function build(id, h){
  const item = shopView(id); if(!item) return null;
  const innerW = PW - PAD * 2;
  const blocks = [];
  const full = getShopItemDescription(item, h, id);
  const d = parseDesc(full);
  const bf = '13px ' + F, bb = 'bold 13px ' + F;

  const add = (kind, o) => blocks.push(Object.assign({kind}, o));

  const stats = statRows(d.passive);
  if(stats.length){
    add('head', {text: 'ХАРАКТЕРИСТИКИ', h: 22});
    for(const r of stats){
      if(r.num){
        ctx.font = 'bold 14px ' + F; const nw = ctx.measureText(r.num).width + 8;
        const ls = wrap(r.label, innerW - nw, bf);
        add('stat', {num: r.num, lines: ls.length ? ls : [''], h: Math.max(1, ls.length) * 17 + 3});
      } else {
        const ls = wrap(r.text, innerW, bf);
        add('plain', {lines: ls, h: ls.length * 17 + 3, color: TXT});
      }
    }
  }
  if(d.active.length || d.cd != null || d.mana != null){
    add('head', {text: item.active ? 'АКТИВНАЯ СПОСОБНОСТЬ' : 'ЭФФЕКТ', h: 24, gap: stats.length ? 6 : 0});
    for(const s of d.active){ const ls = wrap(s, innerW, bf); add('plain', {lines: ls, h: ls.length * 17 + 3, color: TXT}); }
    const chips = [];
    if(d.cd != null) chips.push(['КД', d.cd + ' с', '#8be9fd']);
    if(d.mana != null) chips.push(['МАНА', d.mana, '#7ea8ff']);
    if(chips.length) add('chips', {chips, h: 24});
  }
  if(d.text.length){
    if(stats.length || d.active.length) add('head', {text: 'ОПИСАНИЕ', h: 24, gap: 6}); else add('head', {text: 'ОПИСАНИЕ', h: 22});
    for(const s of d.text){ const ls = wrap(s, innerW, bf); add('plain', {lines: ls, h: ls.length * 17 + 3, color: TXT}); }
  }
  if(typeof RECIPES !== 'undefined' && RECIPES[id]){
    const r = RECIPES[id];
    add('head', {text: 'РЕЦЕПТ', h: 24, gap: 6});
    const txt = r.parts.map(p => recipePartName(p)).join(' + ') + ' + ' + r.fee + ' монет';
    const ls = wrap(txt, innerW, bb); add('plain', {lines: ls, h: ls.length * 17 + 3, color: GOLD, bold: true});
  }
  const ch = ITEM_CHANGES[id];
  if(ch && ch.length){
    add('head', {text: 'ИЗМЕНЕНИЯ', h: 24, gap: 8, color: GOLD});
    for(const c of ch.slice(0, 4)){
      const ls = wrap(c.t, innerW - 56, '12px ' + F);
      add('change', {v: c.v, lines: ls, h: Math.max(18, ls.length * 16 + 4), fresh: c.v === LATEST});
    }
  }
  return {item, blocks};
}

/* ---------- отрисовка ---------- */
function drawPanel(id, anchor, h){
  const b = build(id, h); if(!b) return;
  const item = b.item;
  const headH = 78;
  let bodyH = 10;
  for(const k of b.blocks) bodyH += (k.gap || 0) + k.h;
  const ph = headH + bodyH + 8;
  /* позиция: справа от карточки, если места нет — слева; по высоте прижимаем к экрану */
  let px = anchor.x + anchor.w + 10;
  if(px + PW > VW - 8) px = anchor.x - PW - 10;
  px = Math.max(8, Math.min(px, VW - PW - 8));
  let py = anchor.y;
  py = Math.max(8, Math.min(py, VH - ph - 8));

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
  ctx.fillStyle = 'rgba(9,12,16,0.985)'; ctx.fillRect(px, py, PW, ph);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  /* шапка */
  const hg = ctx.createLinearGradient(px, py, px + PW, py);
  hg.addColorStop(0, 'rgba(70,52,40,0.95)'); hg.addColorStop(1, 'rgba(26,34,44,0.95)');
  ctx.fillStyle = hg; ctx.fillRect(px, py, PW, headH);
  ctx.fillStyle = item.color || '#8be9fd'; ctx.fillRect(px, py, 3, headH);
  ctx.strokeStyle = '#b58a55'; ctx.lineWidth = 2; ctx.strokeRect(px, py, PW, ph);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px, py + headH); ctx.lineTo(px + PW, py + headH); ctx.stroke();

  drawItemIcon(item, px + PAD + 26, py + headH / 2, 52);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = item.color || '#fff'; ctx.font = 'bold 17px Georgia, serif';
  const nameLines = wrap(item.name, PW - PAD * 2 - 66, ctx.font).slice(0, 2);
  ctx.font = 'bold 17px Georgia, serif';
  nameLines.forEach((ln, i) => ctx.fillText(ln, px + PAD + 64, py + 26 + i * 19));
  const cy = py + 26 + nameLines.length * 19 + 4;
  const hero = h || playerHero;
  const afford = hero && hero.coins >= item.cost;
  shopCoinDot(px + PAD + 70, cy - 5, 6);
  ctx.fillStyle = afford ? GOLD : RED; ctx.font = 'bold 15px ' + F; ctx.textAlign = 'left';
  ctx.fillText(String(item.cost), px + PAD + 82, cy);
  ctx.fillStyle = MUTED; ctx.font = 'bold 10px ' + F; ctx.textAlign = 'right';
  ctx.fillText((item.active ? 'АКТИВНЫЙ' : 'ПАССИВНЫЙ') + ' • ' + SHOP_TABS[shopItemCategory(id)], px + PW - PAD, py + headH - 8);
  /* плашка «изменён в последнем обновлении» */
  const chs = ITEM_CHANGES[id];
  if(chs && chs[0] && chs[0].v === LATEST){
    const label = 'ИЗМЕНЁН В ' + LATEST;
    ctx.font = 'bold 10px ' + F; const lw = ctx.measureText(label).width + 12;
    ctx.fillStyle = 'rgba(214,170,70,0.95)'; ctx.fillRect(px + PW - PAD - lw, py + 10, lw, 17);
    ctx.fillStyle = '#1a1405'; ctx.textAlign = 'center'; ctx.fillText(label, px + PW - PAD - lw / 2, py + 22);
  }

  /* тело */
  let y = py + headH + 10;
  ctx.textAlign = 'left';
  for(const k of b.blocks){
    y += k.gap || 0;
    if(k.kind === 'head'){
      ctx.fillStyle = k.color || '#8be9fd'; ctx.font = 'bold 11px ' + F; ctx.textAlign = 'left';
      ctx.fillText(k.text, px + PAD, y + 13);
      ctx.fillStyle = k.color ? 'rgba(255,213,104,0.28)' : 'rgba(139,233,253,0.2)';
      ctx.fillRect(px + PAD + ctx.measureText(k.text).width + 8, y + 9, PW - PAD * 2 - ctx.measureText(k.text).width - 8, 1);
    } else if(k.kind === 'stat'){
      ctx.font = 'bold 14px ' + F; ctx.fillStyle = GREEN; ctx.textAlign = 'left';
      ctx.fillText(k.num, px + PAD, y + 14);
      const nw = ctx.measureText(k.num).width + 8;
      ctx.font = '13px ' + F; ctx.fillStyle = TXT;
      k.lines.forEach((ln, i) => ctx.fillText(ln, px + PAD + nw, y + 14 + i * 17));
    } else if(k.kind === 'plain'){
      ctx.font = (k.bold ? 'bold ' : '') + '13px ' + F; ctx.fillStyle = k.color; ctx.textAlign = 'left';
      k.lines.forEach((ln, i) => ctx.fillText(ln, px + PAD, y + 14 + i * 17));
    } else if(k.kind === 'chips'){
      let cx = px + PAD;
      for(const [lab, val, col] of k.chips){
        ctx.font = 'bold 11px ' + F; const lw = ctx.measureText(lab).width;
        ctx.font = 'bold 12px ' + F; const vw = ctx.measureText(val).width;
        const w = lw + vw + 20;
        ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fillRect(cx, y + 3, w, 19);
        ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(cx + 0.5, y + 3.5, w - 1, 18);
        ctx.fillStyle = col; ctx.font = 'bold 11px ' + F; ctx.textAlign = 'left'; ctx.fillText(lab, cx + 7, y + 16);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px ' + F; ctx.fillText(val, cx + 13 + lw, y + 16);
        cx += w + 8;
      }
    } else if(k.kind === 'change'){
      ctx.font = 'bold 10px ' + F; const tw = 50;
      ctx.fillStyle = k.fresh ? 'rgba(214,170,70,0.95)' : 'rgba(255,255,255,0.1)'; ctx.fillRect(px + PAD, y + 2, tw, 15);
      ctx.fillStyle = k.fresh ? '#1a1405' : 'rgba(255,255,255,0.75)'; ctx.textAlign = 'center';
      ctx.fillText(k.v, px + PAD + tw / 2, y + 13);
      ctx.textAlign = 'left'; ctx.font = '12px ' + F; ctx.fillStyle = k.fresh ? '#fff3cf' : 'rgba(255,255,255,0.72)';
      k.lines.forEach((ln, i) => ctx.fillText(ln, px + PAD + tw + 6, y + 13 + i * 16));
    }
    y += k.h;
  }
  /* подсказка покупки */
  ctx.restore();
}

/* ---------- что под курсором ---------- */
function hoverTarget(L){
  if(!shopOpen || shopGuideOpen || !L) return null;
  const inside = r => mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h;
  const ids = shopFilteredIds();
  for(let i = 0; i < ids.length; i++){
    const row = Math.floor(i / L.columns);
    if(row < shopScrollRow || row >= shopScrollRow + L.visibleRows) continue;
    const r = shopItemRect(i, L);
    if(inside(r) && mouse.y >= L.gy - 2 && mouse.y <= L.gy + L.gh + 2) return {id: ids[i], rect: r};
  }
  for(const slot of shopGuideSlots(L)) if(inside(slot.rect)) return {id: slot.id, rect: slot.rect};
  if(L.wide && playerHero){                       /* инвентарь в нижней панели магазина */
    const fx = L.gx, fy = L.gy + L.gh + 8;
    for(let i = 0; i < 6; i++){
      const it = playerHero.inventory[i]; if(!it || !SHOP_ITEMS[it.id]) continue;
      const r = {x: fx + 12 + i * 50, y: fy + 24, w: 44, h: 44};
      if(inside(r)) return {id: it.id, rect: r};
    }
  }
  return null;
}

/* ---------- плашка «ИЗМ.» на карточках ---------- */
function drawChangedTags(L){
  const ids = shopFilteredIds();
  for(let i = 0; i < ids.length; i++){
    const row = Math.floor(i / L.columns);
    if(row < shopScrollRow || row >= shopScrollRow + L.visibleRows) continue;
    const c = ITEM_CHANGES[ids[i]];
    if(!(c && c[0] && c[0].v === LATEST)) continue;
    const r = shopItemRect(i, L);
    if(r.y < L.gy - 2 || r.y + r.h > L.gy + L.gh + 2) continue;
    ctx.save();
    ctx.font = 'bold 9px ' + F; const w = ctx.measureText('ИЗМ.').width + 8;
    ctx.fillStyle = 'rgba(214,170,70,0.96)'; ctx.fillRect(r.x + r.w - w - 4, r.y + r.h - 20, w, 14);
    ctx.fillStyle = '#1a1405'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('ИЗМ.', r.x + r.w - w / 2 - 4, r.y + r.h - 10);
    ctx.restore();
  }
}

const _drawShop = drawShop;
drawShop = function(){
  _drawShop.apply(this, arguments);
  try {
    if(!shopOpen || !playerHero) return;
    const L = shopLayout();
    if(shopGuideOpen) return;
    drawChangedTags(L);
    if(L.compact) return;
    const t = hoverTarget(L);
    if(t) drawPanel(t.id, t.rect, playerHero);
  } catch(err) { warn('draw', err); }
};

try { window.__itemChanges = ITEM_CHANGES; } catch(e) {}
})();
