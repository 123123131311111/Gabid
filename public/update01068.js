/* DotaSense 0.10.6.8 — ДВА НОВЫХ ПРЕДМЕТА И ЗОЛОТОЙ СКИН СЕНСИРОВАННОЙ.
   • «Палец мозгов» (1000 монет): +400 к максимальному и текущему здоровью и +45% к скорости атаки. Пассивный, лежит во вкладке «Характеристики».
   • «Шмолли» (2300 монет): +600 к максимальному и текущему здоровью. Активный: оглушает ВРАЖЕСКИХ ГЕРОЕВ в радиусе 450 на 2 сек. КД 25 сек.
   • Скин Сенсированной «Золотая Сенсированная» (500 Сенсиков): модель целиком из золота (SKIN_TINTS.sensedGold в hero3d.js),
     вокруг героини золотое свечение, золотое кольцо у ног и искры. Только визуал, характеристики не меняются.
   Цена скина (500) продублирована в accounts.js. Подключается после update01064.js. */
(function(){
'use strict';
const G = window, TAU = Math.PI * 2;
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update01068 ' + tag + ':', err); } catch(e) {} } };
const baseId = s => String(s || '').split('+')[0];

/* ---------- предметы ---------- */
const NEW = {
  fingerBrain: {
    name:'Палец мозгов', icon:'☝', cost:1000, color:'#ff9ac8', active:false,
    hp:400, attackSpeedBonus:0.45,
    desc:'Пассивно: +400 к максимальному и текущему здоровью и +45% к скорости атаки.'
  },
  smolly: {
    name:'Шмолли', icon:'✷', cost:2300, color:'#ffd35c', active:true,
    hp:600, radius:450, stun:2, cooldown:25,
    desc:'Пассивно: +600 к максимальному и текущему здоровью. Активный: оглушает всех вражеских героев в радиусе 450 на 2 сек. КД 25 сек.'
  }
};
try {
  for(const id in NEW){
    if(SHOP_ITEMS[id]) continue;
    SHOP_ITEMS[id] = NEW[id];
    if(!SHOP_ITEM_IDS.includes(id)) SHOP_ITEM_IDS.push(id);
    SHOP_ITEM_VIEWS.push({...NEW[id], id});
  }
  SHOP_CATEGORY_OF.fingerBrain = 2;   /* ХАРАКТЕРИСТИКИ */
  SHOP_CATEGORY_OF.smolly = 3;        /* АКТИВНЫЕ */
  if(!NEW_RECIPE_ITEM_IDS.includes('fingerBrain')) NEW_RECIPE_ITEM_IDS.push('fingerBrain');   /* newItemStat: скорость атаки */
  if(typeof NULLIFY_BLOCKED_ITEMS !== 'undefined') NULLIFY_BLOCKED_ITEMS.add('smolly');
  shopViewById = null;
} catch(err) { warn('items', err); }

/* Здоровье: прибавляем при покупке (снимает при продаже общий revertItemStats по полю hp). */
try {
  const _ais = applyItemStats;
  G.applyItemStats = applyItemStats = function(hero, id){
    if(id === 'fingerBrain' || id === 'smolly'){
      const hp = SHOP_ITEMS[id].hp;
      hero.maxHp += hp; hero.hp += hp;
      return;
    }
    return _ais.apply(this, arguments);
  };
} catch(err) { warn('stats', err); }

/* Активный эффект Шмолли. */
function useSmolly(h, item){
  const c = SHOP_ITEMS.smolly; let n = 0;
  for(const u of units){
    if(!u || u.dead || u.team === h.team || u.team === 2 || u.type !== 'hero' || u.isIllusion || u.invulnerable || u.windTimer > 0) continue;
    if(Math.hypot(u.x - h.x, u.y - h.y) > c.radius + (u.radius || 0)) continue;
    u.stunTimer = Math.max(u.stunTimer || 0, c.stun);
    addText(u.x, u.y - 56, 'ОГЛУШЕН НА 2 СЕК', '#ffd35c', 1.1, 15);
    fxRing(u.x, u.y, 70, '#ffd35c', 0.5);
    n++;
  }
  item.cooldown = c.cooldown;
  fxRing(h.x, h.y, c.radius, '#ffd35c', 0.8);
  fxRing(h.x, h.y, c.radius * 0.55, '#fff3b0', 0.55);
  spawnParticles(h.x, h.y, '#ffd35c', 34, 1.2);
  addText(h.x, h.y - 70, 'ШМОЛЛИ' + (n ? ': ОГЛУШЕНО ×' + n : ''), '#ffd35c', 1.2, 17);
  try { playSynthSfx('cast'); } catch(e) {}
  return true;
}
try {
  const _pia = performInventoryItemActivation;
  G.performInventoryItemActivation = performInventoryItemActivation = function(hero, index){
    const item = hero.inventory[index];
    if(item && item.id === 'smolly'){
      if(hero.nullifyTimer > 0){ flashMsg(hero, 'Нуллификатор: предмет заблокирован'); return false; }
      if(item.cooldown > 0){ flashMsg(hero, item.name + ' на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
      return useSmolly(hero, item);
    }
    return _pia.apply(this, arguments);
  };
} catch(err) { warn('use', err); }

/* Иконки. */
try {
  const _dii = drawItemIcon;
  G.drawItemIcon = drawItemIcon = function(item, x, y, s){
    if(!item || (item.id !== 'fingerBrain' && item.id !== 'smolly')) return _dii.apply(this, arguments);
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = item.color; ctx.shadowBlur = 12; ctx.lineWidth = Math.max(1.5, s * 0.06);
    if(item.id === 'fingerBrain'){
      /* палец, указывающий вверх, с «мозгом» на кончике */
      ctx.fillStyle = '#f2c4a6'; ctx.strokeStyle = '#8a5a44';
      ctx.beginPath(); ctx.roundRect(-s*.1, -s*.16, s*.2, s*.58, s*.09); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(-s*.26, s*.12, s*.52, s*.32, s*.1); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ff9ac8'; ctx.strokeStyle = '#ffe0f0';
      ctx.beginPath(); ctx.ellipse(0, -s*.3, s*.22, s*.17, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#c4487f'; ctx.beginPath(); ctx.moveTo(0, -s*.46); ctx.quadraticCurveTo(-s*.08, -s*.3, 0, -s*.16);
      ctx.moveTo(-s*.12, -s*.34); ctx.quadraticCurveTo(0, -s*.28, s*.12, -s*.34); ctx.stroke();
    } else {
      /* золотой кристалл-«шмолли» с лучами */
      const g = ctx.createLinearGradient(0, -s*.45, 0, s*.45); g.addColorStop(0, '#fff3b0'); g.addColorStop(.5, '#ffd35c'); g.addColorStop(1, '#b8791a');
      ctx.fillStyle = g; ctx.strokeStyle = '#fff6cf';
      ctx.beginPath(); ctx.moveTo(0, -s*.44); ctx.lineTo(s*.3, -s*.08); ctx.lineTo(s*.18, s*.4); ctx.lineTo(-s*.18, s*.4); ctx.lineTo(-s*.3, -s*.08); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-s*.3, -s*.08); ctx.lineTo(s*.3, -s*.08); ctx.moveTo(0, -s*.44); ctx.lineTo(-s*.12, -s*.08); ctx.lineTo(-s*.18, s*.4); ctx.moveTo(0, -s*.44); ctx.lineTo(s*.12, -s*.08); ctx.lineTo(s*.18, s*.4); ctx.stroke();
      ctx.strokeStyle = '#ffe9a0';
      for(let i = 0; i < 4; i++){ const a = -Math.PI/2 + (i - 1.5) * 0.9; ctx.beginPath(); ctx.moveTo(Math.cos(a)*s*.5, Math.sin(a)*s*.5); ctx.lineTo(Math.cos(a)*s*.62, Math.sin(a)*s*.62); ctx.stroke(); }
    }
    ctx.restore();
  };
} catch(err) { warn('icons', err); }

/* ---------- скин «Золотая Сенсированная» ---------- */
try {
  const d = {id:'sensedGold', name:'ЗОЛОТАЯ СЕНСИРОВАННАЯ', heroId:'sensed', rarity:'epic', price:500, accent:'#ffd24a', border:'#a8791a',
    previewHero:'sensed', previewColor:'#8a5a0a', previewColor2:'#fff0a0', weaponColor:'#ffd24a',
    desc:'Сенсированная целиком отлита из золота: броня, пулемёт, волосы и берет сияют металлом. Вокруг героини — золотое свечение, золотое кольцо у ног и летящие искры. Не меняет характеристики.',
    hint:'Виден, когда выбрана Сенсированная.'};
  if(!SKIN_BY_ID[d.id]){ SKIN_DEFS.push(d); SKIN_BY_ID[d.id] = d; }
} catch(err) { warn('skin', err); }

const isGold = u => !!(u && u.def && u.def.id === 'sensed' && baseId(u.skinId) === 'sensedGold');

/* Золотое свечение + кольцо у ног + искры (рисуется там же, где аура остальных скинов; ctx уже в координатах героя). */
try {
  const _a = G.drawSkinAura0663;
  G.drawSkinAura0663 = function(u){
    if(_a) _a.apply(this, arguments);
    try {
      if(!isGold(u) || u.dead) return;
      const tm = (typeof gameTime === 'number' ? gameTime : 0), R = u.radius + 26, pulse = 0.5 + 0.5 * Math.sin(tm * 3);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      /* мягкое сияние вокруг тела */
      const gr = ctx.createRadialGradient(0, -8, 4, 0, -8, R * 2.1);
      gr.addColorStop(0, 'rgba(255,225,110,' + (0.42 + pulse * 0.16) + ')');
      gr.addColorStop(0.5, 'rgba(255,190,50,' + (0.2 + pulse * 0.08) + ')');
      gr.addColorStop(1, 'rgba(255,170,30,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, -8, R * 2.1, 0, TAU); ctx.fill();
      /* кольцо у ног */
      ctx.save(); ctx.translate(0, 8); ctx.scale(1, 0.62); ctx.lineCap = 'round';
      ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = 12;
      ctx.strokeStyle = '#ffd24a'; ctx.globalAlpha = 0.85; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
      ctx.setLineDash([8, 10]); ctx.lineDashOffset = -tm * 22; ctx.strokeStyle = '#fff3b0'; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.arc(0, 0, R + 9, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      /* искры, поднимающиеся вверх */
      ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = 8; ctx.fillStyle = '#fff0a0';
      for(let i = 0; i < 7; i++){
        const ph = (tm * 0.55 + i / 7) % 1, a = i * 2.4 + tm * 0.6;
        const sx = Math.cos(a) * (R * 0.8) * (0.6 + 0.4 * Math.sin(i * 3.1)), sy = 8 - ph * (u.radius * 2.6 + 30);
        ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.95;
        ctx.beginPath(); ctx.arc(sx, sy, 1.6 + (1 - ph) * 1.6, 0, TAU); ctx.fill();
      }
      ctx.restore();
    } catch(err) { warn('aura', err); }
  };
} catch(err) { warn('auraHook', err); }
})();
