/* DotaSense 0.10.0 (дополнение) — ГАРДЕРОБ БОЙЦА в профиле героя (меню «Бойцы»).
   • В окне 3D-модели появилась кнопка «ГАРДЕРОБ». Она открывает панель со всеми скинами и имморталками этого героя.
   • Скины и имморталки, которые у тебя есть, можно надеть и снять прямо в профиле. Не купленные видно с замком и ценой:
     их можно посмотреть на модели, но надеть нельзя.
   • Любой скин или иммортал можно примерить: модель сразу меняет облик. Если у героя есть иммортал (например, «Королевский ара»),
     его можно включать поверх любого скина отдельной карточкой.
   • «Показать анимацию»: Авто, Покой, Ходьба, Атака и каждый скилл (Q W E R) крутятся на модели по кругу.
     Скины и арканы подсвечивают атаку и скиллы своим цветом (вспышки, кольца, искры).
   • Исправление: в профиле героя теперь показывается надетый скин (раньше новый экран профиля рисовал стандартный облик).
   Только визуал: характеристики, урон и механики не меняются. Подключается после update0100d.js. */
(function(){
'use strict';
const TAU = Math.PI * 2;
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update0100e ' + tag + ':', err); } catch(e) {} } };
const inR = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const rgba = (hex, a) => hexRgba(hex, a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const snd = k => { try { playSynthSfx(k); } catch(e) {} };

const RARITY = {rare: ['РЕДКИЙ', '#5aa0ff'], epic: ['ЭПИЧЕСКИЙ', '#c07bff'], legendary: ['ЛЕГЕНДАРНЫЙ', '#ffb02e'], arcana: ['АРКАНА', '#5ad0ff']};
const wd = {open: false, heroId: null, base: null, acc: {}, sel: 'std', anim: null, t0: 0, msg: '', msgAt: 0, openAt: 0};

const heroSkins = def => SKIN_DEFS.filter(s => !s.kind && (!s.heroId || s.heroId === def.id));
const heroAccs = def => SKIN_DEFS.filter(s => s.kind === 'acc' && s.heroId === def.id);
const curDef = () => (typeof HERO_DEFS !== 'undefined' && typeof selectedHeroIndex !== 'undefined') ? HERO_DEFS[selectedHeroIndex] : null;
const overlayBusy = () => !!((window.__dsMasteryOpen && window.__dsMasteryOpen()) || (window.__dsEditorOpen && window.__dsEditorOpen()));

function openWardrobe(def){
  try { syncPaidSkins(); } catch(e) {}
  wd.open = true; wd.heroId = def.id; wd.openAt = performance.now();
  const cur = activeSkinFor(def.id);
  wd.base = baseSkin(cur);
  wd.acc = {};
  for(const a of heroAccs(def)) wd.acc[a.id] = !!(skinsOwned[a.id] && accEquipped[a.id]);
  wd.sel = wd.base || 'std'; wd.anim = null; wd.msg = '';
  heroGuideOpen = false;
}
function closeWardrobe(){ wd.open = false; }

/* какой скин показывать на модели */
function previewSkinId(def){
  let id = wd.base || '';
  for(const a of heroAccs(def)) if(wd.acc[a.id]) id += (a.previewSkin || '');
  return id || null;
}
function equippedSkinId(def){ try { return activeSkinFor(def.id); } catch(e) { return null; } }

/* ---------- раскладка панели ---------- */
function btnRect(){
  const vr = heroDetailPortraitRect();
  return {x: vr.x + vr.w - 158, y: vr.y + 12, w: 146, h: 30};
}
function layout(def){
  const compact = VW < 920, leftX = compact ? 28 : 64, top = 150;
  const vr = heroDetailPortraitRect();
  const rightX = compact ? leftX + vr.w + 22 : VW * .43, rightW = VW - rightX - 54;
  const P = {x: rightX, y: top - 30, w: rightW, h: Math.max(320, VH - 88 - (top - 30))};
  const pad = 16, gap = 8, animH = 32, actH = 62;
  const skins = heroSkins(def), accs = heroAccs(def), skills = def.skills.map(id => SKILLS[id]).filter(Boolean);
  const L = {P, pad, cards: [], anims: [], close: {x: P.x + P.w - 46, y: P.y + 10, w: 34, h: 30}, accLabelY: 0};
  L.act = {x: P.x + pad, y: P.y + P.h - pad - actH, w: P.w - pad * 2, h: actH};
  L.animY = L.act.y - 10 - animH;
  const y0 = P.y + 46, cardsTop = y0 + 22;
  const rowsS = Math.ceil((1 + skins.length) / 2), rowsA = Math.ceil(accs.length / 2);
  const avail = (L.animY - 24) - cardsTop - (accs.length ? 26 : 0);
  const ch = clamp(Math.floor(avail / Math.max(1, rowsS + rowsA)) - gap, 36, 66);
  const cw = (P.w - pad * 2 - 10) / 2;
  const place = (list, startY) => list.forEach((it, i) => {
    it.rect = {x: P.x + pad + (i % 2) * (cw + 10), y: startY + Math.floor(i / 2) * (ch + gap), w: cw, h: ch};
    L.cards.push(it);
  });
  place([{type: 'std', id: 'std'}].concat(skins.map(s => ({type: 'skin', id: s.id, sk: s}))), cardsTop);
  if(accs.length){
    L.accLabelY = cardsTop + rowsS * (ch + gap) + 14;
    place(accs.map(s => ({type: 'acc', id: s.id, sk: s})), L.accLabelY + 8);
  }
  const list = [['АВТО', null], ['ПОКОЙ', 'idle'], ['ХОДЬБА', 'walk'], ['АТАКА', 'attack']];
  skills.forEach((sk, i) => list.push([sk.short || String(i + 1), 'c' + i, sk]));
  const bw = Math.min(100, (P.w - pad * 2 - (list.length - 1) * 6) / list.length);
  list.forEach((a, i) => L.anims.push({label: a[0], key: a[1], sk: a[2], rect: {x: P.x + pad + i * (bw + 6), y: L.animY, w: bw, h: animH}}));
  L.btn = {x: L.act.x + L.act.w - 214, y: L.act.y + 11, w: 204, h: 40};
  return L;
}

/* ---------- состояние выбранного пункта ---------- */
function selInfo(def){
  syncPaidSkins();
  const id = wd.sel;
  if(id === 'std'){
    const cur = skinEquip[def.id] || skinEquip['*'];
    return {name: 'СТАНДАРТНЫЙ ОБЛИК', desc: 'Обычный внешний вид героя без скина. Характеристики те же.', owned: true, equipped: !cur, kind: 'std'};
  }
  const sk = SKIN_BY_ID[id]; if(!sk) return {name: '', desc: '', owned: false, equipped: false, kind: 'skin'};
  const owned = !!skinsOwned[id];
  return {name: sk.name, desc: sk.desc || '', owned, equipped: owned && isCosmeticEquipped(sk), kind: sk.kind === 'acc' ? 'acc' : 'skin', sk};
}
function doAction(def){
  const info = selInfo(def), now = performance.now();
  if(info.kind === 'std'){
    if(info.equipped) return;
    for(const slot of [def.id, '*']) if(skinEquip[slot]){ const s = SKIN_BY_ID[skinEquip[slot]]; if(!s || !s.kind) delete skinEquip[slot]; }
    saveSkinState(); wd.msg = 'Скин снят'; wd.msgAt = now; snd('click'); return;
  }
  if(!info.owned) return;
  const on = !info.equipped;
  setSkinEquipped(wd.sel, on);
  if(info.kind === 'acc') wd.acc[wd.sel] = on; else if(on) wd.base = wd.sel;
  wd.msg = (on ? 'Надето: ' : 'Снято: ') + info.name; wd.msgAt = now; snd('click');
}

/* ---------- отрисовка панели ---------- */
function chipText(text, x, y, color, align){
  ctx.save(); ctx.font = 'bold 10px Segoe UI, Arial'; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
}
function drawCard(def, c, now){
  const R = c.rect, hover = inR(R, mouse.x, mouse.y);
  const sk = c.sk, isStd = c.type === 'std';
  const owned = isStd || !!skinsOwned[c.id];
  const equipped = isStd ? !(skinEquip[def.id] || skinEquip['*']) : (owned && isCosmeticEquipped(sk));
  const selected = wd.sel === c.id;
  const c1 = isStd ? def.color : (sk.previewColor || def.color), c2 = isStd ? def.color2 : (sk.previewColor2 || sk.accent || def.color2);
  const rar = isStd ? ['БАЗОВЫЙ', '#9aa7b8'] : (sk.immortal ? ['ИММОРТАЛ', '#ffd568'] : (RARITY[sk.rarity] || ['СКИН', '#e8c984']));
  ctx.save();
  const bg = ctx.createLinearGradient(R.x, R.y, R.x + R.w, R.y);
  bg.addColorStop(0, selected ? rgba(c2, .22) : 'rgba(20,28,44,.96)'); bg.addColorStop(1, 'rgba(8,12,20,.96)');
  rr(R.x, R.y, R.w, R.h, 10); ctx.fillStyle = bg; ctx.fill();
  ctx.strokeStyle = selected ? c2 : (hover ? rgba(c2, .7) : 'rgba(215,179,106,.28)'); ctx.lineWidth = selected ? 2 : 1;
  if(selected){ ctx.shadowColor = c2; ctx.shadowBlur = 12; }
  ctx.stroke(); ctx.shadowBlur = 0;
  /* значок: круг в цветах скина */
  const rad = Math.min(R.h * .34, 22), ix = R.x + 14 + rad, iy = R.y + R.h / 2;
  const g = ctx.createRadialGradient(ix - rad * .3, iy - rad * .3, 2, ix, iy, rad);
  g.addColorStop(0, c2); g.addColorStop(1, c1);
  ctx.globalAlpha = owned || isStd ? 1 : .55;
  ctx.beginPath(); ctx.arc(ix, iy, rad, 0, TAU); ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = sk && sk.border ? sk.border : 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.stroke();
  if(c.type === 'acc'){ ctx.fillStyle = '#fff'; ctx.font = 'bold ' + Math.round(rad * .9) + 'px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', ix, iy + 1); }
  ctx.globalAlpha = 1;
  /* текст */
  const tx = R.x + 14 + rad * 2 + 12, maxW = R.w - (tx - R.x) - 12;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 13px Segoe UI, Arial'; ctx.fillStyle = owned ? '#f6e6be' : 'rgba(246,230,190,.6)';
  let name = isStd ? 'СТАНДАРТ' : sk.name;
  while(name.length > 4 && ctx.measureText(name).width > maxW) name = name.slice(0, -2) + '…';
  ctx.fillText(name, tx, R.y + R.h / 2 - 2);
  chipText(rar[0], tx, R.y + R.h / 2 + 13, rar[1], 'left');
  /* статус справа */
  let st, col;
  if(equipped){ st = '✓ НАДЕТ'; col = '#7dffa8'; }
  else if(owned && !isStd){ st = 'ЕСТЬ'; col = '#ffd568'; }
  else if(!owned){ st = '🔒 ' + (sk.price || '?'); col = '#ff8f8f'; }
  if(st) chipText(st, R.x + R.w - 12, R.y + R.h / 2 + 13, col, 'right');
  if(c.type === 'acc' && wd.acc[c.id]) chipText('● НА МОДЕЛИ', R.x + R.w - 12, R.y + R.h / 2 - 4, '#8be9fd', 'right');
  else if(selected && c.type !== 'acc') chipText('● НА МОДЕЛИ', R.x + R.w - 12, R.y + R.h / 2 - 4, '#8be9fd', 'right');
  ctx.restore();
}
function drawPanel(def, now){
  try { syncPaidSkins(); } catch(e) {}
  const L = layout(def), P = L.P;
  const e = clamp((performance.now() - wd.openAt) / 220, 0, 1), ease = 1 - Math.pow(1 - e, 3);
  ctx.save();
  ctx.globalAlpha = ease; ctx.translate((1 - ease) * 24, 0);
  const bg = ctx.createLinearGradient(P.x, P.y, P.x, P.y + P.h);
  bg.addColorStop(0, 'rgba(14,19,32,.985)'); bg.addColorStop(1, 'rgba(6,9,16,.99)');
  rr(P.x, P.y, P.w, P.h, 16); ctx.fillStyle = bg; ctx.fill();
  ctx.strokeStyle = 'rgba(232,201,132,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  /* шапка */
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 22px Georgia, serif'; ctx.fillStyle = '#f2e2bd';
  ctx.fillText('ГАРДЕРОБ', P.x + L.pad, P.y + 34);
  ctx.font = '12px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,255,255,.55)';
  const hw = ctx.measureText('ГАРДЕРОБ').width;
  ctx.font = 'bold 22px Georgia, serif'; const tw = ctx.measureText('ГАРДЕРОБ').width;
  ctx.font = '12px Segoe UI, Arial'; ctx.fillText('•  ' + def.name, P.x + L.pad + tw + 10, P.y + 33);
  /* закрыть */
  const cl = L.close, ch = inR(cl, mouse.x, mouse.y);
  rr(cl.x, cl.y, cl.w, cl.h, 8); ctx.fillStyle = ch ? 'rgba(160,40,50,.9)' : 'rgba(255,255,255,.07)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✕', cl.x + cl.w / 2, cl.y + cl.h / 2 + 1);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  /* сообщение */
  if(wd.msg && now * 1000 - wd.msgAt < 2200){
    ctx.textAlign = 'right'; ctx.font = 'bold 12px Segoe UI, Arial'; ctx.fillStyle = '#7dffa8';
    ctx.fillText(wd.msg, cl.x - 12, P.y + 33); ctx.textAlign = 'left';
  }
  /* секции */
  ctx.font = 'bold 11px Consolas, monospace'; ctx.fillStyle = '#d7b36a';
  ctx.fillText('СКИНЫ', P.x + L.pad, P.y + 62);
  if(L.accLabelY) ctx.fillText('ИММОРТАЛКИ', P.x + L.pad, L.accLabelY);
  for(const c of L.cards) drawCard(def, c, now);
  ctx.fillStyle = '#d7b36a'; ctx.font = 'bold 11px Consolas, monospace';
  ctx.fillText('ПОКАЗАТЬ АНИМАЦИЮ', P.x + L.pad, L.animY - 8);
  for(const a of L.anims){
    const R = a.rect, on = (wd.anim || null) === a.key, hv = inR(R, mouse.x, mouse.y), ult = a.sk && a.sk.ult;
    rr(R.x, R.y, R.w, R.h, 8);
    ctx.fillStyle = on ? (ult ? 'rgba(120,88,20,.95)' : 'rgba(119,42,34,.95)') : (hv ? 'rgba(60,44,40,.95)' : 'rgba(20,24,34,.95)'); ctx.fill();
    ctx.strokeStyle = on ? '#ffe69a' : (ult ? 'rgba(255,208,92,.6)' : 'rgba(215,179,106,.4)'); ctx.lineWidth = on ? 2 : 1; ctx.stroke();
    ctx.fillStyle = on ? '#fff4d0' : (ult ? '#ffd568' : '#e8c984'); ctx.font = 'bold 12px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(a.label, R.x + R.w / 2, R.y + R.h / 2 + 1);
  }
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  /* нижняя панель: описание + кнопка */
  const A = L.act, info = selInfo(def);
  rr(A.x, A.y, A.w, A.h, 10); ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fill();
  ctx.strokeStyle = 'rgba(215,179,106,.3)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = 'bold 13px Segoe UI, Arial'; ctx.fillStyle = '#f2e2bd'; ctx.fillText(info.name, A.x + 14, A.y + 22);
  ctx.font = '11px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,255,255,.62)';
  const lines = wrapMenuText(info.desc, A.w - 244, '11px Segoe UI, Arial').slice(0, 3);
  lines.forEach((ln, i) => ctx.fillText(ln, A.x + 14, A.y + 38 + i * 13));
  let label, can = true;
  if(info.kind === 'std'){ label = info.equipped ? '✓  СТАНДАРТ НАДЕТ' : 'СНЯТЬ СКИН'; can = !info.equipped; }
  else if(!info.owned){ label = '🔒  НЕ КУПЛЕН  ·  ' + ((info.sk && info.sk.price) || '?'); can = false; }
  else label = info.equipped ? 'СНЯТЬ' : 'НАДЕТЬ';
  ctx.save(); ctx.globalAlpha = can ? 1 : .5;
  drawMenuButton(L.btn, label, {primary: can && !info.equipped, radius: 8, fontSize: 13});
  ctx.restore();
  if(!info.owned && info.kind !== 'std'){ ctx.font = '10px Segoe UI, Arial'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,143,143,.8)'; ctx.fillText('Купить можно в магазине', L.btn.x + L.btn.w, L.btn.y + L.btn.h + 11); }
  ctx.restore();
}

/* ---------- эффекты на сцене при показе атаки и скиллов ---------- */
function poseNow(now){
  const a = wd.anim; if(!a) return null;
  const ph = Math.max(0, now - wd.t0);
  if(a === 'idle') return {kind: 'idle', p: 0};
  if(a === 'walk') return {kind: 'walk', p: ph * 1.25};
  if(a === 'attack') return {kind: 'attack', p: (ph / 0.9) % 1};
  const slot = parseInt(a.slice(1), 10) || 0;
  return {kind: 'cast', slot, p: (ph / 1.6) % 1};
}
function drawStageFx(def, now){
  const pose = poseNow(now); if(!pose || (pose.kind !== 'attack' && pose.kind !== 'cast')) return;
  const vr = heroDetailPortraitRect(), p = pose.p;
  const sk = SKIN_BY_ID[wd.base];
  const col = (sk && (sk.previewColor2 || sk.accent)) || def.color2 || '#ffffff';
  const arcana = !!(sk && sk.arcana);
  const skill = pose.kind === 'cast' ? SKILLS[def.skills[pose.slot]] : null, ult = !!(skill && skill.ult);
  const cx = vr.x + vr.w / 2, fy = vr.y + vr.h * .82;
  ctx.save(); rr(vr.x, vr.y, vr.w, vr.h, 22); ctx.clip();
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  if(pose.kind === 'attack'){
    const u = clamp((p - .22) / .38, 0, 1);
    if(u > 0 && u < 1){
      const a0 = -2.2 + u * 2.4;
      ctx.shadowColor = col; ctx.shadowBlur = 18;
      ctx.strokeStyle = rgba(col, (1 - u) * .95); ctx.lineWidth = 9 * (1 - u) + 2;
      ctx.beginPath(); ctx.arc(cx, vr.y + vr.h * .5, vr.w * .24, a0, a0 + 1.0); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,' + ((1 - u) * .9) + ')'; ctx.lineWidth = 2.5 * (1 - u) + 1;
      ctx.beginPath(); ctx.arc(cx, vr.y + vr.h * .5, vr.w * .24, a0 + .1, a0 + .9); ctx.stroke();
    }
  } else {
    const k = clamp(p / .75, 0, 1), big = ult ? 1.25 : 1;
    ctx.save(); ctx.translate(cx, fy); ctx.scale(1, .2); ctx.shadowColor = col; ctx.shadowBlur = 16;
    for(let r = 0; r < (ult ? 3 : 2); r++){
      const kk = clamp(k - r * .14, 0, 1); if(kk <= 0 || kk >= 1) continue;
      ctx.strokeStyle = rgba(r ? '#ffffff' : col, (1 - kk) * .9); ctx.lineWidth = 6 * (1 - kk) + 1.5;
      ctx.beginPath(); ctx.arc(0, 0, vr.w * (.07 + .32 * kk) * big, 0, TAU); ctx.stroke();
    }
    ctx.restore();
    const colA = Math.sin(Math.PI * k) * (ult ? .5 : .34), cw = vr.w * (ult ? .2 : .13);
    const cg = ctx.createLinearGradient(0, fy, 0, vr.y);
    cg.addColorStop(0, rgba(col, colA)); cg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = cg; ctx.fillRect(cx - cw / 2, vr.y, cw, fy - vr.y);
    const n = arcana ? 34 : 18;
    for(let i = 0; i < n; i++){
      const ang = i * 2.399, rad = (.05 + ((i * 37) % 17) / 17 * .26) * vr.w * big;
      const rise = ((k * 1.2 + i * .07) % 1);
      const sx = cx + Math.cos(ang) * rad * (.4 + k), sy = fy - rise * vr.h * .5 + Math.sin(ang) * rad * .12;
      ctx.fillStyle = rgba(i % 3 ? col : '#ffffff', (1 - rise) * .85 * Math.sin(Math.PI * clamp(k + .1, 0, 1)));
      ctx.beginPath(); ctx.arc(sx, sy, 1.4 + (i % 3), 0, TAU); ctx.fill();
    }
    if(ult && p < .22){ ctx.fillStyle = 'rgba(255,255,255,' + ((.22 - p) / .22 * .28) + ')'; ctx.fillRect(vr.x, vr.y, vr.w, vr.h); }
  }
  ctx.restore();
}

/* ---------- подключение к профилю героя ---------- */
const _prevDetail = drawHeroDetail;
drawHeroDetail = function(def){
  if(wd.heroId !== def.id && wd.open) closeWardrobe();
  /* на время отрисовки профиля героя надеваем на него нужный облик: надетый скин или примерка из гардероба */
  let had = null;
  try {
    const sid = wd.open && wd.heroId === def.id ? previewSkinId(def) : equippedSkinId(def);
    if(sid && !def.skinId){
      const sk = SKIN_BY_ID[baseSkin(sid)];
      had = {skinId: def.skinId, color: def.color, color2: def.color2};
      def.skinId = sid;
      if(sk && sk.previewColor){ def.color = sk.previewColor; def.color2 = sk.previewColor2 || had.color2; }
    }
  } catch(err) { warn('skin', err); }
  try { _prevDetail.apply(this, arguments); }
  finally { if(had){ if(had.skinId === undefined) delete def.skinId; else def.skinId = had.skinId; def.color = had.color; def.color2 = had.color2; } }
  try {
    const now = performance.now() / 1000;
    if(wd.open && wd.heroId === def.id) drawStageFx(def, now);
    if(!overlayBusy()) drawMenuButton(btnRect(), wd.open ? '✕  ЗАКРЫТЬ' : '👕  ГАРДЕРОБ', {radius: 8, fontSize: 13, active: wd.open});
    if(wd.open && wd.heroId === def.id && !overlayBusy()) drawPanel(def, now);
  } catch(err) { warn('draw', err); }
};

/* анимация модели: передаём выбранную позу в 3D-отрисовку */
if(window.Hero3D && Hero3D.draw){
  const _h3 = Hero3D.draw;
  Hero3D.draw = function(c, def, x, y, w, h, o){
    try {
      if(wd.open && wd.anim && typeof menuStage !== 'undefined' && menuStage === 'heroDetail' && def && def.id === wd.heroId){
        const pose = poseNow(o && o.t != null ? o.t : performance.now() / 1000);
        if(pose) o = Object.assign({}, o, {pose});
      }
    } catch(err) { warn('pose', err); }
    return _h3.call(this, c, def, x, y, w, h, o);
  };
}

/* ввод */
const _prevClick = handleMenuClick;
handleMenuClick = function(mx, my){
  try {
    if(menuStage !== 'heroDetail'){ if(wd.open) closeWardrobe(); }
    else if(!overlayBusy()){
      const def = curDef();
      if(def){
        if(inR(btnRect(), mx, my)){ if(wd.open) closeWardrobe(); else openWardrobe(def); return; }
        if(wd.open && wd.heroId === def.id){
          const L = layout(def);
          if(inR(L.P, mx, my)){
            if(inR(L.close, mx, my)){ closeWardrobe(); return; }
            for(const c of L.cards) if(inR(c.rect, mx, my)){
              if(c.type === 'std'){ wd.base = null; wd.sel = 'std'; }
              else if(c.type === 'skin'){ wd.base = c.id; wd.sel = c.id; }
              else { wd.acc[c.id] = !wd.acc[c.id]; wd.sel = c.id; }
              snd('click'); return;
            }
            for(const a of L.anims) if(inR(a.rect, mx, my)){ wd.anim = a.key; wd.t0 = performance.now() / 1000; snd('click'); return; }
            if(inR(L.btn, mx, my)){ doAction(def); return; }
            return;
          }
        }
      }
    }
  } catch(err) { warn('click', err); }
  return _prevClick.apply(this, arguments);
};
/* кнопка лежит внутри окна модели: пропускаем клик по ней мимо вращения */
const _hvDown = heroViewPointerDown;
heroViewPointerDown = function(mx, my){
  try { if(menuStage === 'heroDetail' && !overlayBusy() && inR(btnRect(), mx, my)) return false; } catch(err) {}
  return _hvDown.apply(this, arguments);
};
window.addEventListener('keydown', e => { if(e.key === 'Escape' && wd.open){ closeWardrobe(); e.stopPropagation(); } }, true);
})();
