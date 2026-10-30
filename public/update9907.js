/* DotaSense 0.9.9.7 — «СУМЕРЕЧНАЯ РЕГАЛИЯ».
   • Скины: все цены урезаны в 4 раза (на сервере accounts.js и здесь — значения совпадают).
   • Три новых задания на Сенсики: «Марафонец», «Каратель», «Триумфатор» (серверная часть — accounts.js).
   • Вкладка «Бойцы» → профиль героя полностью переработан: живая сцена, руны, частицы, карточки навыков,
     шкалы характеристик, плашки роли. Стрелки ← → листают бойцов. Кнопки и хитбоксы остались на своих местах.
   • Ригина, Вирсуди и Рыцарь-изгнанник усилены на 8%.
   • Новый особый предмет «Регалия Сумеречного Владыки» — собирается из Ока Бездны и Плаща Тихого Часа (один экземпляр).
   Подключается поверх game.js и update9905.js, по образцу остальных update-файлов. */
(function(){
'use strict';
const TAU = Math.PI * 2;
const snd = (k, v) => { try { playSynthSfx(k, {volume: v == null ? 1 : v}); } catch(e) {} };
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update9907 ' + tag + ':', err); } catch(e) {} } };

/* ======================================================================
   1. БАФФ +8%: РИГИНА, ВИРСУДИ, РЫЦАРЬ-ИЗГНАННИК
   ====================================================================== */
const HERO_BUFF = 1.08;
for(const id of ['regina', 'virsudi', 'exileKnight']){
  const d = HERO_DEFS.find(x => x.id === id);
  if(!d || d.boost9907) continue;
  d.boost9907 = true;
  for(const k of ['baseHp', 'hpPerLvl', 'baseDmg', 'dmgPerLvl', 'abilityDamageScale']){
    if(typeof d[k] === 'number') d[k] *= HERO_BUFF;
  }
  HERO_STAT_BALANCE[id] = [d.baseHp, d.hpPerLvl, d.baseDmg, d.dmgPerLvl, d.abilityDamageScale];
}

/* ======================================================================
   2. НОВЫЙ ОСОБЫЙ ПРЕДМЕТ — «РЕГАЛИЯ СУМЕРЕЧНОГО ВЛАДЫКИ»
      Рецепт: Око Бездны + Плащ Тихого Часа + доплата. Собирается один раз (повторно собрать нельзя).
   ====================================================================== */
const REGALIA = 'duskRegalia';
Object.assign(SFX_PRESETS, {
  duskRegalia: {from:70, to:520, duration:0.85, type:'sawtooth', volume:0.1, noise:0.5, layers:[[45,160,0,0.8,'sine',0.14],[620,1200,0.15,0.5,'triangle',0.05],[320,300,0.25,0.5,'square',0.04]]}
});
if(!RECIPES[REGALIA] && SHOP_ITEMS.abyssEye && SHOP_ITEMS.hushCloak){
  RECIPES[REGALIA] = {parts:['abyssEye', 'hushCloak'], fee:1500};
  const d = {
    name:'Регалия Сумеречного Владыки', icon:'♜', color:'#b07bff', active:true,
    manaCost:110, cooldown:30,
    damage:200, attackSpeedBonus:0.30, hp:900, maxMp:400, speed:40, hpRegen:14, attackResist:0.15,
    radius:600, blastDamage:500, stunTime:1.2, haste:0.35, hasteTime:4,
    stats:'Пассивно: +200 к урону атак, +30% к скорости атаки, +900 к здоровью, +400 к мане, +40 к скорости передвижения, +14 к восстановлению здоровья в секунду и −15% к урону от обычных атак. Активный «Затмение Владыки»: враги в радиусе 600 получают 500 магического урона и оглушаются на 1,2 сек., а Владыка снимает с себя оглушение и замедление и ускоряется на 35% на 4 сек. КД 30 сек.'
  };
  const r = RECIPES[REGALIA];
  const total = r.parts.reduce((s, pid) => s + recipePartCost(pid), 0) + r.fee;
  SHOP_ITEMS[REGALIA] = {
    name:d.name, icon:d.icon, color:d.color, active:d.active, cost:total, totalCost:total,
    desc:'Рецепт: ' + r.parts.map(recipePartName).join(' + ') + ' + ' + r.fee + ' монет. ' + d.stats,
    recipe:{parts:r.parts.slice(), fee:r.fee},
    ...Object.fromEntries(Object.entries(d).filter(([k]) => !['name', 'icon', 'color', 'active', 'stats'].includes(k)))
  };
  if(!SHOP_ITEM_IDS.includes(REGALIA)) SHOP_ITEM_IDS.push(REGALIA);
  SHOP_CATEGORY_OF[REGALIA] = 4;
  SHOP_ITEM_VIEWS.push({...SHOP_ITEMS[REGALIA], id:REGALIA});
  NULLIFY_BLOCKED_ITEMS.add(REGALIA);
  if(!NEW_RECIPE_ITEM_IDS.includes(REGALIA)) NEW_RECIPE_ITEM_IDS.push(REGALIA);
  shopViewById = null;

  const _pia = performInventoryItemActivation;
  performInventoryItemActivation = function(hero, index){
    const item = hero.inventory[index];
    if(item && item.id === REGALIA){
      if(hero.nullifyTimer > 0){ flashMsg(hero, 'Нуллификатор: предмет заблокирован'); return false; }
      if(item.cooldown > 0){ flashMsg(hero, item.name + ' на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
      const c = SHOP_ITEMS[REGALIA]; let n = 0;
      for(const u of units){
        if(u.dead || u.team === hero.team || u.team === 2 || isBuilding(u) || isStructure(u) || u.invulnerable) continue;
        if(Math.hypot(u.x - hero.x, u.y - hero.y) > c.radius + (u.radius || 0)) continue;
        applyDamage(u, c.blastDamage, {team:hero.team, source:hero, magic:true}); n++;
        if(!u.dead){ u.stunTimer = Math.max(u.stunTimer || 0, c.stunTime); u.hitFlash = Math.max(u.hitFlash || 0, 0.3); }
        fxHit(u.x, u.y, '#b07bff');
      }
      hero.stunTimer = 0; hero.slowT = 0; hero.slow = 0;
      hero.buffs = hero.buffs.filter(b => b.id !== 'regaliaHaste');
      hero.addBuff({type:'spd', id:'regaliaHaste', val:c.haste, t:c.hasteTime});
      item.cooldown = c.cooldown;
      fxRing(hero.x, hero.y, c.radius, '#b07bff', 0.9); fxRing(hero.x, hero.y, c.radius * 0.6, '#e7d4ff', 0.55); fxRing(hero.x, hero.y, c.radius * 0.28, '#ffffff', 0.35);
      spawnParticles(hero.x, hero.y, '#b07bff', 44, 1.3); spawnParticles(hero.x, hero.y, '#f3e8ff', 18, 0.9);
      addText(hero.x, hero.y - 74, 'ЗАТМЕНИЕ ВЛАДЫКИ' + (n ? ' ×' + n : ''), '#d9bcff', 1.3, 18);
      snd('duskRegalia'); return true;
    }
    return _pia.apply(this, arguments);
  };

  const _dii = drawItemIcon;
  drawItemIcon = function(item, x, y, s){
    if(!item || item.id !== REGALIA) return _dii.apply(this, arguments);
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = '#b07bff'; ctx.shadowBlur = 14; ctx.lineWidth = Math.max(1.5, s * 0.055);
    /* корона-регалия: тёмный фиолетовый обод, пять зубцов и сияющий камень */
    const g = ctx.createLinearGradient(0, -s * .46, 0, s * .4);
    g.addColorStop(0, '#e7d4ff'); g.addColorStop(.45, '#8a52e0'); g.addColorStop(1, '#2a1260');
    ctx.fillStyle = g; ctx.strokeStyle = '#f3e8ff';
    ctx.beginPath();
    ctx.moveTo(-s * .44, s * .3); ctx.lineTo(-s * .5, -s * .22); ctx.lineTo(-s * .26, -s * .02);
    ctx.lineTo(-s * .13, -s * .44); ctx.lineTo(0, -s * .1); ctx.lineTo(s * .13, -s * .44);
    ctx.lineTo(s * .26, -s * .02); ctx.lineTo(s * .5, -s * .22); ctx.lineTo(s * .44, s * .3);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1b0b40'; ctx.fillRect(-s * .44, s * .16, s * .88, s * .14);
    ctx.shadowBlur = 0;
    const gem = ctx.createRadialGradient(0, s * .02, 1, 0, s * .02, s * .13);
    gem.addColorStop(0, '#ffffff'); gem.addColorStop(.4, '#ff7ad9'); gem.addColorStop(1, '#6a1a80');
    ctx.fillStyle = gem; ctx.beginPath(); ctx.arc(0, s * .03, s * .1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f3e8ff';
    for(const px of [-.5, .5]){ ctx.beginPath(); ctx.arc(s * px, -s * .24, s * .045, 0, TAU); ctx.fill(); }
    for(const px of [-.13, .13]){ ctx.beginPath(); ctx.arc(s * px, -s * .46, s * .04, 0, TAU); ctx.fill(); }
    ctx.restore();
  };
}

/* ======================================================================
   3. ВКЛАДКА «БОЙЦЫ» → ПРОФИЛЬ ГЕРОЯ: НОВЫЙ ВИД
      Раскладка (хитбоксы) прежняя: 3D-окно слева, навыки справа, кнопки внизу.
   ====================================================================== */
const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const clamp01 = v => Math.max(0, Math.min(1, v));
const easeOut = t => 1 - Math.pow(1 - clamp01(t), 3);
const rgba = (hex, a) => (typeof hexRgba === 'function' ? hexRgba(hex, a) : 'rgba(255,255,255,' + a + ')');
const lighten = (hex, k) => {
  let h = String(hex || '#ffffff').replace('#', '');
  if(h.length === 3) h = h.split('').map(c => c + c).join('');
  const v = parseInt(h.slice(0, 6), 16) || 0xffffff;
  const f = c => Math.round(c + (255 - c) * k);
  return 'rgb(' + f((v >> 16) & 255) + ',' + f((v >> 8) & 255) + ',' + f(v & 255) + ')';
};
const anim = {id:null, t0:0};
let statMax = null;
function getStatMax(){
  if(statMax) return statMax;
  statMax = {baseHp:1, baseMp:1, baseDmg:1, speed:1, baseArmor:1, atkRange:1};
  for(const d of HERO_DEFS) for(const k in statMax) if((d[k] || 0) > statMax[k]) statMax[k] = d[k];
  return statMax;
}
const STAT_ROWS = [
  ['ЗДОРОВЬЕ', 'baseHp', '#ff6b7d'], ['МАНА', 'baseMp', '#5cc4ff'],
  ['АТАКА', 'baseDmg', '#ffd05c'], ['СКОРОСТЬ', 'speed', '#62e6a0'],
  ['БРОНЯ', 'baseArmor', '#b8c7d9'], ['ДАЛЬНОСТЬ', 'atkRange', '#c59cff']
];

function drawBackdrop(def, now, vr){
  const bg = ctx.createLinearGradient(0, 0, VW, VH);
  bg.addColorStop(0, '#05070d'); bg.addColorStop(.5, '#0d0f19'); bg.addColorStop(1, '#190b11');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, VW, VH);
  /* цветная аура героя за 3D-окном */
  const cx = vr.x + vr.w / 2, cy = vr.y + vr.h * .55;
  const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(VW, VH) * .62);
  glow.addColorStop(0, rgba(def.color2, .26)); glow.addColorStop(.45, rgba(def.color, .30)); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, VW, VH);
  /* гигантское имя-водяной знак */
  ctx.save();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const wm = String(def.name).toUpperCase();
  let fs = Math.min(VH * .36, VW * .17);
  ctx.font = 'bold ' + fs + 'px Georgia, serif';
  const maxW = VW * .92; const mw = ctx.measureText(wm).width;
  if(mw > maxW) { fs *= maxW / mw; ctx.font = 'bold ' + fs + 'px Georgia, serif'; }
  ctx.fillStyle = rgba(def.color2, .05);
  ctx.fillText(wm, VW * .56, VH * .56);
  ctx.restore();
  /* косые лучи */
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  for(let i = 0; i < 5; i++){
    const bx = VW * (.1 + i * .22) + Math.sin(now * .15 + i) * 30;
    const g = ctx.createLinearGradient(bx, 0, bx + 220, VH);
    g.addColorStop(0, rgba(def.color2, .07)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 70, 0); ctx.lineTo(bx + 330, VH); ctx.lineTo(bx + 150, VH); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  /* всплывающие искры */
  ctx.save();
  const N = (typeof perfLite === 'function' && perfLite()) ? 14 : 34;
  for(let i = 0; i < N; i++){
    const sp = 14 + (i * 37 % 26);
    const py = VH + 20 - ((now * sp + i * 71) % (VH + 40));
    const px = ((i * 197.3) % VW) + Math.sin(now * .6 + i * 1.7) * 18;
    const a = .18 + .5 * Math.abs(Math.sin(now * .9 + i));
    ctx.fillStyle = rgba(i % 3 === 0 ? '#ffe9a6' : def.color2, a * .55);
    ctx.beginPath(); ctx.arc(px, py, .8 + (i % 4) * .55, 0, TAU); ctx.fill();
  }
  ctx.restore();
  /* виньетка */
  const vg = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * .35, VW / 2, VH / 2, Math.max(VW, VH) * .75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.62)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
}

function drawScene(def, r, now){
  if(heroView.id !== def.id){ heroView.id = def.id; heroViewReset(); }
  const dt = 1 / 60;
  if(!heroView.drag){
    heroView.idle += dt;
    if(Math.abs(heroView.vel) > 0.02){ heroView.yaw += heroView.vel * dt; heroView.vel *= 0.94; }
    else if(heroView.idle > 2.5) heroView.yaw += 0.35 * dt;
  }
  const {x, y, w, h} = r, cx = x + w / 2;
  ctx.save();
  rr(x, y, w, h, 22); ctx.clip();
  const sc = ctx.createRadialGradient(cx, y + h * .46, 10, cx, y + h * .5, Math.max(w, h) * .78);
  sc.addColorStop(0, rgba(def.color, .85)); sc.addColorStop(.45, '#0d1322'); sc.addColorStop(1, '#03050a');
  ctx.fillStyle = sc; ctx.fillRect(x, y, w, h);
  /* столп света сверху */
  const beam = ctx.createLinearGradient(0, y, 0, y + h * .85);
  beam.addColorStop(0, rgba(def.color2, .24)); beam.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = beam;
  ctx.beginPath(); ctx.moveTo(cx - w * .08, y); ctx.lineTo(cx + w * .08, y); ctx.lineTo(cx + w * .36, y + h * .85); ctx.lineTo(cx - w * .36, y + h * .85); ctx.closePath(); ctx.fill();
  /* постамент: свечение и вращающиеся руны */
  const fy = y + h * .82;
  const fg = ctx.createRadialGradient(cx, fy, 4, cx, fy, w * .42);
  fg.addColorStop(0, rgba(def.color2, .55)); fg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.translate(cx, fy); ctx.scale(1, .2); ctx.translate(-cx, -fy);
  ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, fy, w * .42, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(cx, fy); ctx.scale(1, .2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = rgba(def.color2, .85); ctx.setLineDash([14, 12]); ctx.lineDashOffset = -now * 40;
  ctx.beginPath(); ctx.arc(0, 0, w * .30, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(232,201,132,.7)'; ctx.setLineDash([4, 9]); ctx.lineDashOffset = now * 55;
  ctx.beginPath(); ctx.arc(0, 0, w * .37, 0, TAU); ctx.stroke();
  ctx.setLineDash([]); ctx.strokeStyle = rgba(def.color2, .5); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, w * .22, 0, TAU); ctx.stroke();
  ctx.restore();
  if(window.Hero3D){
    Hero3D.draw(ctx, def, x, y, w, h, {yaw:heroView.yaw, pitch:heroView.pitch, zoom:heroView.zoom, t:now, ss:heroView.drag ? 1 : 1.25});
  }
  /* затемнение низа под подписями */
  const bt = ctx.createLinearGradient(0, y + h - 54, 0, y + h);
  bt.addColorStop(0, 'rgba(0,0,0,0)'); bt.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = bt; ctx.fillRect(x, y + h - 54, w, 54);
  ctx.restore();
  /* рамка: неоновая + золотая + уголки */
  ctx.save();
  ctx.shadowColor = rgba(def.color2, .8); ctx.shadowBlur = 20;
  ctx.strokeStyle = rgba(def.color2, .75); ctx.lineWidth = 2;
  rr(x, y, w, h, 22); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = 'rgba(232,201,132,.45)'; ctx.lineWidth = 1;
  rr(x + 6, y + 6, w - 12, h - 12, 17); ctx.stroke();
  ctx.strokeStyle = '#e8c984'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  const L = 24, o = 10;
  for(const [px, py, sx, sy] of [[x + o, y + o, 1, 1], [x + w - o, y + o, -1, 1], [x + o, y + h - o, 1, -1], [x + w - o, y + h - o, -1, -1]]){
    ctx.beginPath(); ctx.moveTo(px, py + sy * L); ctx.lineTo(px, py); ctx.lineTo(px + sx * L, py); ctx.stroke();
  }
  ctx.lineCap = 'butt';
  const deg = Math.round(((heroView.yaw * 180 / Math.PI) % 360 + 360) % 360);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left'; ctx.font = 'bold 11px Consolas, monospace'; ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.fillText('↻ ' + deg + '°   ×' + heroView.zoom.toFixed(2), x + 18, y + h - 18);
  ctx.textAlign = 'right'; ctx.font = '11px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.fillText('тяни — крутить  •  колесо — масштаб  •  2×клик — сброс', x + w - 18, y + h - 18);
}

function pill(text, x, y, color, filled){
  ctx.save();
  ctx.font = 'bold 10px Segoe UI, Arial';
  const w = Math.ceil(ctx.measureText(text).width) + 20, h = 20;
  rr(x, y, w, h, 10);
  ctx.fillStyle = filled ? rgba(color, .28) : 'rgba(255,255,255,.05)'; ctx.fill();
  ctx.strokeStyle = rgba(color, .8); ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = lighten(color, .35); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + 10, y + h / 2 + .5);
  ctx.restore();
  return w;
}

function chip(text, rightX, y, color){
  ctx.save();
  ctx.font = 'bold 10px Consolas, monospace';
  const w = Math.ceil(ctx.measureText(text).width) + 14, h = 18, x = rightX - w;
  rr(x, y, w, h, 6); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
  ctx.strokeStyle = rgba(color, .55); ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + .5);
  ctx.restore();
  return w;
}

function drawSkillCard(def, sk, x, y, w, h, t){
  const ult = !!sk.ult;
  const hov = mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
  const slide = easeOut(t);
  ctx.save();
  ctx.globalAlpha = slide;
  ctx.translate((1 - slide) * 26, 0);
  ctx.shadowColor = ult ? 'rgba(255,208,92,.35)' : (hov ? rgba(def.color2, .4) : 'rgba(0,0,0,.5)');
  ctx.shadowBlur = hov || ult ? 16 : 8;
  const bg = ctx.createLinearGradient(x, y, x + w, y);
  bg.addColorStop(0, ult ? 'rgba(38,28,12,.96)' : 'rgba(17,24,38,.96)'); bg.addColorStop(1, 'rgba(8,12,20,.96)');
  rr(x, y, w, h, 12); ctx.fillStyle = bg; ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = ult ? 'rgba(255,208,92,.85)' : (hov ? rgba(def.color2, .85) : 'rgba(215,179,106,.3)');
  ctx.lineWidth = ult ? 2 : 1; ctx.stroke();
  /* цветная полоса слева */
  ctx.save(); rr(x, y, w, h, 12); ctx.clip();
  const st = ctx.createLinearGradient(x, y, x, y + h);
  st.addColorStop(0, ult ? '#ffe69a' : lighten(def.color2, .15)); st.addColorStop(1, ult ? '#b4801f' : def.color);
  ctx.fillStyle = st; ctx.fillRect(x, y, 4, h);
  ctx.restore();
  /* клавиша */
  const ks = Math.min(44, h - 16), kx = x + 16, ky = y + (h - ks) / 2;
  ctx.save();
  ctx.shadowColor = ult ? 'rgba(255,208,92,.8)' : rgba(def.color2, .7); ctx.shadowBlur = 12;
  const kg = ctx.createLinearGradient(kx, ky, kx, ky + ks);
  kg.addColorStop(0, ult ? '#a87a22' : lighten(def.color, .22)); kg.addColorStop(1, ult ? '#3e2a08' : def.color);
  rr(kx, ky, ks, ks, 11); ctx.fillStyle = kg; ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = ult ? '#ffe69a' : def.color2; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.14)'; rr(kx + 3, ky + 3, ks - 6, ks * .4, 8); ctx.fill();
  ctx.fillStyle = '#fff6d8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold ' + Math.round(ks * .46) + 'px Segoe UI, Arial';
  ctx.fillText(sk.short || '?', kx + ks / 2, ky + ks / 2 + 1);
  ctx.restore();
  /* текст */
  const tx = kx + ks + 14, rightEdge = x + w - 12;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 15px Segoe UI, Arial'; ctx.fillStyle = ult ? '#ffd568' : '#f2e2bd';
  const nameY = y + 22;
  ctx.fillText(sk.name, tx, nameY);
  let nameW = ctx.measureText(sk.name).width;
  if(ult){ pill('УЛЬТА', tx + nameW + 10, nameY - 14, '#ffd05c', true); }
  /* чипы КД / мана / дальность (значения 1-го уровня) */
  let cxr = rightEdge;
  const cd = sk.cd && sk.cd[1], mp = sk.mana && sk.mana[1];
  if(mp > 0) cxr -= chip('МП ' + mp, cxr, y + 8, '#72caff') + 6;
  if(cd > 0) cxr -= chip('КД ' + cd + 'с', cxr, y + 8, '#8be9fd') + 6;
  else if(!(cd > 0) && !(mp > 0)) cxr -= chip('ПАССИВНО', cxr, y + 8, '#a7ff70') + 6;
  /* описание */
  const lineCap = h >= 82 ? 3 : (h >= 62 ? 2 : 1);
  const font = '12px Segoe UI, Arial';
  const maxW = Math.max(60, w - (tx - x) - 14);
  let lines = wrapMenuText(sk.desc || 'Описание отсутствует.', maxW, font);
  if(lines.length > lineCap){
    lines = lines.slice(0, lineCap);
    let last = lines[lineCap - 1];
    while(last.length > 3 && (ctx.font = font, ctx.measureText(last + '…').width > maxW)) last = last.slice(0, -1);
    lines[lineCap - 1] = last.replace(/[\s.,;:]+$/, '') + '…';
  }
  ctx.font = font; ctx.fillStyle = 'rgba(255,255,255,.7)';
  lines.forEach((line, i) => ctx.fillText(line, tx, y + 42 + i * 15));
  ctx.restore();
}

function drawStatsPanel(def, p, rows, t){
  ctx.save();
  const bg = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  bg.addColorStop(0, 'rgba(16,22,36,.94)'); bg.addColorStop(1, 'rgba(7,10,18,.96)');
  rr(p.x, p.y, p.w, p.h, 14); ctx.fillStyle = bg; ctx.fill();
  ctx.strokeStyle = 'rgba(215,179,106,.35)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f2e2bd'; ctx.font = 'bold 13px Segoe UI, Arial';
  ctx.fillText('ХАРАКТЕРИСТИКИ', p.x + 18, p.y + 24);
  ctx.fillStyle = 'rgba(215,179,106,.5)'; ctx.fillRect(p.x + 18 + 130, p.y + 20, p.w - 36 - 130, 1);
  const mx = getStatMax();
  const gap = 22, cw = (p.w - 36 - gap) / 2;
  const list = STAT_ROWS.slice(0, rows * 2);
  list.forEach((s, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const sx = p.x + 18 + col * (cw + gap), sy = p.y + 42 + row * 32;
    const val = def[s[1]] || 0;
    const frac = Math.max(.05, Math.min(1, val / (mx[s[1]] || 1))) * easeOut(t - i * .06);
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = 'bold 10px Segoe UI, Arial'; ctx.textAlign = 'left';
    ctx.fillText(s[0], sx, sy + 8);
    ctx.fillStyle = s[2]; ctx.font = 'bold 13px Consolas, monospace'; ctx.textAlign = 'right';
    ctx.fillText(String(s[1] === 'baseArmor' ? Math.round(val * 10) / 10 : Math.round(val)), sx + cw, sy + 9);
    rr(sx, sy + 14, cw, 7, 3.5); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill();
    const fg = ctx.createLinearGradient(sx, 0, sx + cw, 0);
    fg.addColorStop(0, rgba(s[2], .55)); fg.addColorStop(1, lighten(s[2], .3));
    ctx.save(); ctx.shadowColor = s[2]; ctx.shadowBlur = 8;
    rr(sx, sy + 14, Math.max(7, cw * frac), 7, 3.5); ctx.fillStyle = fg; ctx.fill();
    ctx.restore();
  });
  ctx.restore();
}

const _origDetail = drawHeroDetail;
drawHeroDetail = function(def){
  try {
    const now = performance.now() / 1000;
    if(anim.id !== def.id){ anim.id = def.id; anim.t0 = now; }
    const t = (now - anim.t0) / 0.75;
    const compact = VW < 920;
    const leftX = compact ? 28 : 64, top = 150;
    const vr = heroDetailPortraitRect();
    const portraitH = vr.h;
    drawBackdrop(def, now, vr);

    /* шапка */
    const idx = HERO_DEFS.indexOf(def) + 1;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left'; ctx.font = 'bold 12px Consolas, monospace'; ctx.fillStyle = '#d7b36a';
    ctx.fillText('БОЙЦЫ   ›   ПРОФИЛЬ   ›   ' + String(def.name).toUpperCase(), 176, 104);
    ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillText('№ ' + String(idx).padStart(2, '0') + ' / ' + String(HERO_DEFS.length).padStart(2, '0'), VW - 54, 104);

    drawScene(def, vr, now);

    /* имя и плашки */
    const nameY = top + portraitH + 46;
    ctx.save();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold ' + (compact ? 30 : 42) + 'px Georgia, serif';
    ctx.shadowColor = rgba(def.color2, .75); ctx.shadowBlur = 18;
    const nw = Math.max(80, ctx.measureText(def.name).width);
    const ng = ctx.createLinearGradient(leftX, 0, leftX + nw, 0);
    ng.addColorStop(0, '#fff3cf'); ng.addColorStop(1, lighten(def.color2, .35));
    ctx.fillStyle = ng; ctx.fillText(def.name, leftX, nameY);
    ctx.restore();
    let px = leftX; const py = top + portraitH + 56;
    px += pill(String(def.title).toUpperCase(), px, py, def.color2, true) + 6;
    px += pill((def.atkRange || 0) > 300 ? 'ДАЛЬНИЙ БОЙ' : 'БЛИЖНИЙ БОЙ', px, py, '#e8c984', false) + 6;
    if(typeof favoriteHeroId !== 'undefined' && favoriteHeroId === def.id) pill('★ ЛЮБИМЫЙ', px, py, '#ff6a7a', true);

    /* правая колонка */
    const rightX = compact ? leftX + vr.w + 22 : VW * .43;
    const rightW = VW - rightX - 54;
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 24px Georgia, serif'; ctx.fillStyle = '#f2e2bd';
    ctx.fillText('СПОСОБНОСТИ', rightX, top + 6);
    const hg = ctx.createLinearGradient(rightX, 0, rightX + rightW, 0);
    hg.addColorStop(0, 'rgba(232,201,132,.9)'); hg.addColorStop(1, 'rgba(232,201,132,0)');
    ctx.fillStyle = hg; ctx.fillRect(rightX, top + 17, rightW, 2);

    const rows = VH >= 800 ? 3 : 2;
    const statsH = 44 + rows * 32;
    const sp = {x:rightX, y:VH - 92 - statsH, w:rightW, h:statsH};
    const skills = def.skills.map(id => SKILLS[id]).filter(Boolean);
    const y0 = top + 34, gap = 10;
    const avail = sp.y - 12 - y0;
    const cardH = Math.max(46, Math.min(88, (avail - gap * (skills.length - 1)) / Math.max(1, skills.length)));
    skills.forEach((sk, i) => {
      const sy = y0 + i * (cardH + gap);
      if(sy + cardH > sp.y - 8) return;
      drawSkillCard(def, sk, rightX, sy, rightW, cardH, t - i * .12);
    });
    drawStatsPanel(def, sp, rows, t);

    /* гайд и кнопки — как раньше */
    if(heroGuideHeroId !== def.id){ heroGuideHeroId = def.id; heroGuideOpen = false; }
    if(heroGuideOpen) drawHeroGuidePanel(def);
    if(HERO_GUIDES[def.id]) drawMenuButton(menuGuideBtnRect(), heroGuideOpen ? '✕  ЗАКРЫТЬ ГАЙД' : '📖  ГАЙД БОЙЦА', {radius:7, active:heroGuideOpen, fontSize:13});
    drawMenuButton(menuDetailBackRect(), '‹  К СПИСКУ', {radius:7});
    drawMenuButton(menuDetailTestRect(), '⚙  ТЕСТ-РЕЖИМ', {radius:8});
    drawMenuButton(menuDetailStartRect(), '✓  ВЫБРАТЬ И ИГРАТЬ', {primary:true, large:true, radius:8});
    { const isFav = favoriteHeroId === def.id;
      drawMenuButton(menuDetailFavRect(), isFav ? '★  ЛЮБИМЫЙ БОЕЦ  (УБРАТЬ)' : '☆  ПОСТАВИТЬ В ЦЕНТР МЕНЮ', {radius:8, active:isFav, redBlack:true, fontSize:13}); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '12px Segoe UI, Arial';
    ctx.fillText('Тяни мышью — крути 3D-модель  •  клавиши ←  → — листать бойцов', VW / 2, VH - 18);
  } catch(err) {
    warn('detail', err);
    ctx.textBaseline = 'alphabetic';
    return _origDetail.apply(this, arguments);
  }
};

/* ← → листают бойцов прямо в профиле */
window.addEventListener('keydown', e => {
  try {
    if(typeof gameState === 'undefined' || gameState !== 'menu' || menuStage !== 'heroDetail') return;
    const tag = document.activeElement && document.activeElement.tagName;
    if(tag === 'INPUT' || tag === 'TEXTAREA') return;
    if(e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const n = HERO_DEFS.length;
    selectedHeroIndex = (selectedHeroIndex + (e.key === 'ArrowRight' ? 1 : n - 1)) % n;
    snd('click', 0.6);
    e.preventDefault();
  } catch(err) { warn('keys', err); }
});
})();
