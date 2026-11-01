/* DotaSense 0.10.6.3 — ЧЕТЫРЕ ОБЫЧНЫХ СКИНА ПО 500 СЕНСИКОВ.
   • Мэрин «Белый крёстный»       — белый костюм, золотые эполеты, монеты вокруг; пули-монеты, золотое кольцо у ног.
   • Пиромант «Фиолетовый жар»    — фиолетовая мантия, языки пламени вокруг; фиолетовый огненный шар, всплеск при попадании.
   • Трибупейнер «Ледяной дробовик» — ледяной облик, кристаллы вокруг; снаряды-осколки, морозное кольцо у ног.
   • Чип «Неоновый король»        — неон, светящиеся кольца и кубики; пиксельные заряды, неоновые кольца у ног.
   Модельки (перекраска + новые детали) лежат в hero3d.js (SKIN_TINTS и блок SKX). Здесь: карточки скинов, эффект атаки,
   эффект попадания и аура у ног. Цены (500) продублированы в accounts.js. Только визуал, характеристики не меняются.
   Подключается после update01062.js. */
(function(){
'use strict';
const G = window;
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update01063 ' + tag + ':', err); } catch(e) {} } };
const TAU = Math.PI * 2;
const fxLv = () => (typeof fxl === 'function' ? fxl() : 0);
const baseId = s => String(s || '').split('+')[0];

/* ---------- карточки скинов ---------- */
const THEMES = {
  marinWhite: {hero:'marin', shape:'coin', a:'#ffd34d', b:'#fff3b0'},
  pyroViolet: {hero:'pyro', shape:'flame', a:'#b05cff', b:'#f0d0ff'},
  tribuFrost: {hero:'tribupainer', shape:'shard', a:'#9fdcff', b:'#ffffff'},
  chipNeon:   {hero:'chip', shape:'pixel', a:'#00f5ff', b:'#ff2bd6'}
};
try {
  const defs = [
    {id:'marinWhite', name:'БЕЛЫЙ КРЁСТНЫЙ', heroId:'marin', rarity:'epic', price:500, accent:'#ffd34d', border:'#a8791a', previewHero:'marin', previewColor:'#2a2418', previewColor2:'#fff3b0', weaponColor:'#ffd34d',
     desc:'Мэрин в белоснежном костюме с золотыми эполетами и розой на лацкане. Вокруг вращаются золотые монеты, пули превращаются в монеты, а у ног сияет золотое кольцо. Не меняет характеристики.', hint:'Виден, когда выбран Мэрин.'},
    {id:'pyroViolet', name:'ФИОЛЕТОВЫЙ ЖАР', heroId:'pyro', rarity:'epic', price:500, accent:'#b05cff', border:'#5a1fa8', previewHero:'pyro', previewColor:'#1c0838', previewColor2:'#e0b8ff', weaponColor:'#b05cff',
     desc:'Пиромант в фиолетовой мантии: вокруг пляшут языки фиолетового пламени, на плечах — огненные шипы. Огненный шар летит фиолетовым с хвостом и вспыхивает при попадании. Не меняет характеристики.', hint:'Виден, когда выбран Пиромант.'},
    {id:'tribuFrost', name:'ЛЕДЯНОЙ ДРОБОВИК', heroId:'tribupainer', rarity:'epic', price:500, accent:'#9fdcff', border:'#3f8fb8', previewHero:'tribupainer', previewColor:'#0c2536', previewColor2:'#e8f8ff', weaponColor:'#bfeaff',
     desc:'Трибупейнер, скованный льдом: вокруг парят кристаллы, на плечах — ледяные шипы. Снаряды становятся вращающимися осколками, а у ног лежит морозное кольцо. Не меняет характеристики.', hint:'Виден, когда выбран Трибупейнер.'},
    {id:'chipNeon', name:'НЕОНОВЫЙ КОРОЛЬ', heroId:'chip', rarity:'epic', price:500, accent:'#00f5ff', border:'#ff2bd6', previewHero:'chip', previewColor:'#12062b', previewColor2:'#00f5ff', weaponColor:'#00f5ff',
     desc:'Чип в неоновых цветах: вокруг крутятся светящиеся кольца и кубики, атака летит пиксельными зарядами, а у ног вращаются неоновые кольца. Не меняет характеристики.', hint:'Виден, когда выбран Чип.'}
  ];
  for(const d of defs){ if(!SKIN_BY_ID[d.id]){ SKIN_DEFS.push(d); SKIN_BY_ID[d.id] = d; } }
} catch(err) { warn('skins', err); }

const themeOf = h => { const th = h && h.def && THEMES[baseId(h.skinId)]; return th && th.hero === h.def.id ? th : null; };

/* ---------- эффект атаки ---------- */
try {
  const _sp = spawnProjectile;
  G.spawnProjectile = spawnProjectile = function(x, y, target, dmg, source){
    const p = _sp.apply(this, arguments);
    try {
      const o = projectileOwner(p), th = o && o.type === 'hero' ? themeOf(o) : null;
      if(p && th && !p.isSpell && !p.kind && !p.vaspArc && !p.gaArc){ p.skFx = th; p.color = th.a; p.radius = Math.max(p.radius || 6, 8); }
    } catch(err) { warn('proj', err); }
    return p;
  };
} catch(err) { warn('projHook', err); }

function drawShot(p){
  const th = p.skFx, r = Math.max(7, p.radius || 8), tm = (typeof gameTime === 'number' ? gameTime : 0) * 12;
  const a = typeof projectileHeading === 'function' ? projectileHeading(p) : 0;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28; ctx.fillStyle = th.a; ctx.beginPath(); ctx.arc(0, 0, r * 2.4, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  if(th.shape === 'coin'){
    ctx.globalCompositeOperation = 'source-over'; ctx.rotate(-a);
    const w = Math.max(0.15, Math.abs(Math.cos(tm)));
    ctx.scale(w, 1); ctx.fillStyle = th.a; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#8a5a0a'; ctx.stroke();
    ctx.fillStyle = th.b; ctx.beginPath(); ctx.arc(0, 0, r * 0.55, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 1.4; ctx.stroke();
  } else if(th.shape === 'flame'){
    ctx.fillStyle = th.a; ctx.beginPath(); ctx.moveTo(-r * 3.4, 0); ctx.quadraticCurveTo(-r * 1.4, -r * 1.2 + Math.sin(tm) * r * 0.3, 0, -r); ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); ctx.quadraticCurveTo(-r * 1.4, r * 1.2 + Math.cos(tm) * r * 0.3, -r * 3.4, 0); ctx.fill();
    ctx.fillStyle = th.b; ctx.beginPath(); ctx.arc(r * 0.1, 0, r * 0.55, 0, TAU); ctx.fill();
  } else if(th.shape === 'shard'){
    ctx.globalCompositeOperation = 'source-over'; ctx.rotate(tm * 0.4);
    ctx.fillStyle = th.b; ctx.strokeStyle = th.a; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -r * 1.5); ctx.lineTo(r * 0.7, 0); ctx.lineTo(0, r * 1.5); ctx.lineTo(-r * 0.7, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.6; ctx.fillStyle = th.a; ctx.beginPath(); ctx.moveTo(0, -r * 1.5); ctx.lineTo(r * 0.7, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  } else {
    ctx.globalCompositeOperation = 'source-over'; ctx.rotate(tm * 0.3);
    ctx.fillStyle = th.a; ctx.fillRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
    ctx.fillStyle = th.b; ctx.fillRect(-r * 0.4 + r * 0.5, -r * 0.4 + r * 0.5, r * 0.8, r * 0.8);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.4; ctx.strokeRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
  }
  ctx.restore();
}
try {
  const _dtp = drawThemedProjectile;
  G.drawThemedProjectile = drawThemedProjectile = function(p){
    if(p && p.skFx && !p.kind){ try { drawShot(p); return true; } catch(err) { warn('shot', err); } }
    return _dtp.apply(this, arguments);
  };
} catch(err) { warn('shotHook', err); }
try {
  const _dat = drawAttackTrail;
  G.drawAttackTrail = drawAttackTrail = function(p){
    if(!(p && p.skFx)) return _dat.apply(this, arguments);
    try {
      if(fxLv() >= 3) return;
      const th = p.skFx, h = p.hist || (p.hist = []), last = h[h.length - 1];
      if(!last || Math.hypot(p.x - last[0], p.y - last[1]) > 5){ h.push([p.x, p.y]); const mx = (typeof ATK_TRAIL !== 'undefined' && ATK_TRAIL[fxLv()]) || 8; while(h.length > mx) h.shift(); }
      if(h.length < 2) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const n = h.length, rad = Math.max(4, p.radius || 8), tm = (typeof gameTime === 'number' ? gameTime : 0);
      for(let i = 1; i <= n; i++){
        const f = i / n, x1 = i < n ? h[i][0] : p.x, y1 = i < n ? h[i][1] : p.y;
        ctx.globalAlpha = f * 0.55; ctx.strokeStyle = th.a; ctx.lineWidth = Math.max(1.5, rad * 0.9 * f);
        ctx.beginPath(); ctx.moveTo(h[i - 1][0], h[i - 1][1]); ctx.lineTo(x1, y1); ctx.stroke();
        if(fxLv() < 2 && i % 2 === 0){
          ctx.globalAlpha = f * 0.85; ctx.fillStyle = i % 4 ? th.b : th.a;
          const ox = Math.sin(tm * 9 + i * 1.3) * rad * 0.8, oy = Math.cos(tm * 8 + i) * rad * 0.8, s = 1.4 + f * 1.8;
          if(th.shape === 'pixel') ctx.fillRect(h[i - 1][0] + ox - s, h[i - 1][1] + oy - s, s * 2, s * 2);
          else { ctx.beginPath(); ctx.arc(h[i - 1][0] + ox, h[i - 1][1] + oy, s, 0, TAU); ctx.fill(); }
        }
      }
      ctx.restore();
    } catch(err) { warn('trail', err); }
  };
} catch(err) { warn('trailHook', err); }

/* ---------- эффект попадания ---------- */
G.skinFxHit = function(p){
  const th = p.skFx, t = p.target; if(!th || !t) return;
  spawnParticles(t.x, t.y, th.a, th.shape === 'flame' ? 12 : 8, 0.55);
  spawnParticles(t.x, t.y, th.b, 4, 0.4);
  fxRing(t.x, t.y, th.shape === 'shard' ? 44 : 34, th.a, 0.3);
};

/* ---------- аура у ног ---------- */
G.drawSkinAura0663 = function(u){
  try {
    const th = themeOf(u); if(!th || u.dead) return;
    const R = u.radius + 22, tm = (typeof gameTime === 'number' ? gameTime : 0);
    ctx.save(); ctx.translate(0, 8); ctx.scale(1, 0.62); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    ctx.shadowColor = th.a; ctx.shadowBlur = 10;
    if(th.shape === 'coin'){
      ctx.strokeStyle = th.a; ctx.globalAlpha = 0.8; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
      ctx.setLineDash([8, 10]); ctx.lineDashOffset = -tm * 20; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, R + 9, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      for(let i = 0; i < 5; i++){ const a = i / 5 * TAU + tm * 0.9; ctx.globalAlpha = 0.9; ctx.fillStyle = i % 2 ? th.b : th.a; ctx.beginPath(); ctx.arc(Math.cos(a) * (R + 9), Math.sin(a) * (R + 9), 3.4, 0, TAU); ctx.fill(); }
    } else if(th.shape === 'flame'){
      ctx.strokeStyle = th.a; ctx.globalAlpha = 0.7; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
      for(let i = 0; i < 8; i++){
        const a = i / 8 * TAU + tm * 0.5, fl = 0.5 + 0.5 * Math.sin(tm * 8 + i * 2.1), hg = (16 + fl * 14) / 0.62, bx = Math.cos(a) * R, by = Math.sin(a) * R;
        ctx.globalAlpha = 0.6; ctx.fillStyle = i % 2 ? th.b : th.a;
        ctx.beginPath(); ctx.moveTo(bx - 5, by); ctx.quadraticCurveTo(bx - 1, by - hg * 0.6, bx + Math.sin(tm * 6 + i) * 3, by - hg); ctx.quadraticCurveTo(bx + 1, by - hg * 0.6, bx + 5, by); ctx.closePath(); ctx.fill();
      }
    } else if(th.shape === 'shard'){
      ctx.strokeStyle = th.a; ctx.globalAlpha = 0.75; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
      ctx.save(); ctx.rotate(tm * 0.4); ctx.strokeStyle = th.b; ctx.lineWidth = 1.6; ctx.globalAlpha = 0.7;
      for(let i = 0; i < 6; i++){ const a = i / 6 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (R - 12), Math.sin(a) * (R - 12)); ctx.lineTo(Math.cos(a) * (R + 12), Math.sin(a) * (R + 12)); ctx.stroke(); }
      ctx.restore();
    } else {
      ctx.lineWidth = 2.6; ctx.globalAlpha = 0.8; ctx.strokeStyle = th.a; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -tm * 26; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = th.b; ctx.lineDashOffset = tm * 26; ctx.beginPath(); ctx.arc(0, 0, R + 10, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      for(let i = 0; i < 4; i++){ const a = -i / 4 * TAU - tm * 1.1; ctx.globalAlpha = 0.9; ctx.fillStyle = i % 2 ? th.a : th.b; ctx.fillRect(Math.cos(a) * (R + 10) - 3, Math.sin(a) * (R + 10) - 3, 6, 6); }
    }
    ctx.restore();
  } catch(err) { warn('aura', err); }
};
})();
