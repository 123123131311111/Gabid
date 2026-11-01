/* DotaSense 0.10.3 — АРКАНА ИЛЛЮЗИОНИСТА «АМЕТИСТОВЫЙ МИРАЖ» (аметистовый стиль).
   Цена (1500) продублирована в accounts.js. Облик героя рисует hero3d.js (skinId 'illusionistArcana').
   • Облик: глубокий аметистовый плащ, светло-лиловое серебро вместо золота, венец из кристаллов на шляпе, огромный парящий аметист
     с кольцами, кристаллические крылья и наплечники, вращающиеся зеркальные самоцветы, гексаграмма с шипами под ногами.
     Иллюзии (копии) выглядят так же, как сам герой.
   • Атака — «аметистовый осколок»: вращающийся кристалл с искристым шлейфом; при выстреле — вспышка, при попадании — взрыв осколков.
   • Скиллы (механика не меняется, добавлены эффекты):
       Q «Двойник»     — зеркальный портал, из которого выходит копия, луч света от героя к копии и осколки;
       W «Рокировка»   — два зеркальных портала в точках обмена, скрещённые лучи, искры вдоль пути и всплеск лечения;
       E «Фантом»      — каждая призрачная копия появляется во вспышке аметистовых искр;
       R «Гранд-финал» — герой схлопывается в кристалл, затем взрывается гексаграммой, столбами света и кольцом шипов, а копии выходят из зеркал.
   • Аура у ног героя и его копий: вращающаяся гексаграмма, орбитальные самоцветы и поднимающиеся искры. Подключается после update0102.js. */
(function(){
'use strict';
const G = window;
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update0103 ' + tag + ':', err); } catch(e) {} } };
const TAU = Math.PI * 2;
const AM = '#b05cff', AM2 = '#8a3ce0', DEEP = '#3a1470', LIL = '#e4c8ff', MAG = '#ff7ae8', WHT = '#ffffff', VIO = '#c77dff';
const COLS = [AM, LIL, VIO, MAG];
const fxLv = () => (typeof fxl === 'function' ? fxl() : 0);
const rr = (a, b) => a + Math.random() * (b - a);
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = k => 1 - Math.pow(1 - k, 3);
const isIA = u => { const d = u && (u.def || u.copyDef); return !!(d && d.id === 'illusionist' && String(u.skinId || '').split('+')[0] === 'illusionistArcana'); };

/* ---------- скин ---------- */
try {
  const def = {id:'illusionistArcana', arcana:true, name:'АМЕТИСТОВЫЙ МИРАЖ', heroId:'illusionist', rarity:'arcana', price:1500, accent:'#b05cff', border:'#5a1fa0',
    previewHero:'illusionist', previewColor:'#1a0836', previewColor2:'#c77dff', weaponColor:'#c77dff',
    desc:'АРКАНА. Повелитель отражений надевает аметистовый плащ и превращается в Аметистовый Мираж: глубокая фиолетовая ткань, лиловое серебро вместо золота, венец из кристаллов на шляпе и огромный аметист, парящий над ней в кольцах света. За спиной раскрываются крылья из кристаллов, на плечах растут друзы, а вокруг вращаются зеркальные самоцветы. Под ногами горит гексаграмма с кристаллическими шипами — такая же аура у всех его иллюзий. Атака превращается в аметистовый осколок с искристым шлейфом и взрывом при попадании. «Двойник» открывает зеркальный портал, «Рокировка» скрещивает лучи между двумя порталами, «Фантом» рождает копии во вспышке искр, а «Гранд-финал» схлопывает героя в кристалл и взрывается гексаграммой со столбами света.',
    hint:'Виден, когда выбран Иллюзионист.'};
  if(!SKIN_BY_ID[def.id]){ SKIN_DEFS.push(def); SKIN_BY_ID[def.id] = def; }
} catch(err) { warn('skin', err); }

Object.assign(SFX_PRESETS, {
  iaChime: {from:880, to:1760, duration:0.3, type:'sine', volume:0.045, layers:[[1320, 2640, 0.03, 0.22, 'triangle', 0.02]]},
  iaCrystal: {from:520, to:1040, duration:0.7, type:'triangle', volume:0.07, layers:[[1560, 3120, 0.05, 0.5, 'sine', 0.03], [260, 130, 0, 0.6, 'sine', 0.08]]}
});
const gsnd = (k, x, y, v) => {
  try {
    const p = (typeof playerHero !== 'undefined' && playerHero && !playerHero.dead) ? playerHero : (typeof cam !== 'undefined' ? cam : {x, y});
    const f = 1 - Math.hypot(x - p.x, y - p.y) / 1750; if(f <= 0.06) return;
    snd(k, Math.pow(f, 1.15) * (v == null ? 1 : v));
  } catch(e) {}
};

/* ---------- частицы арканы ---------- */
const IA = {list: [], q: [], proj: []};
IA.add = function(o){
  if(fxLv() >= 3) return null;
  if(IA.list.length >= (fxLv() >= 2 ? 90 : 220)){ const i = IA.list.findIndex(e => e.minor); if(i < 0){ if(o.minor) return null; IA.list.shift(); } else IA.list.splice(i, 1); }
  o.t = -(o.delay || 0); IA.list.push(o); return o;
};
IA.later = (sec, fn) => { IA.q.push({t: sec, fn}); };
IA.sparks = (x, y, n, o) => {
  if(fxLv() >= 3) return; o = o || {}; n = Math.ceil(n * (fxLv() >= 2 ? 0.4 : fxLv() === 1 ? 0.7 : 1));
  for(let i = 0; i < n; i++){ const a = Math.random() * TAU, sp = rr(o.s0 || 20, o.s1 || 110);
    IA.add({k:'spark', minor:true, x:x + Math.cos(a) * rr(0, o.spread || 8), y:y + Math.sin(a) * rr(0, (o.spread || 8) * 0.6), z:o.z0 == null ? 16 : o.z0,
      vx:Math.cos(a) * sp, vy:Math.sin(a) * sp * 0.5, vz:rr(o.v0 || 40, o.v1 || 170), g:o.g == null ? 180 : o.g, size:rr(o.sz0 || 3, o.sz1 || 7), col:COLS[i % 4], life:rr(0.6, 1.3), spin:rr(-3, 3)}); }
};
IA.shards = (x, y, n, o) => {
  if(fxLv() >= 3) return; o = o || {}; n = Math.ceil(n * (fxLv() >= 2 ? 0.4 : 1));
  for(let i = 0; i < n; i++){ const a = Math.random() * TAU, sp = rr(o.s0 || 80, o.s1 || 260);
    IA.add({k:'shard', minor:true, x, y, z:o.z0 == null ? 22 : o.z0, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp * 0.5, vz:rr(110, 320), g:560, size:rr(3.5, 8),
      col:i % 3 ? AM : LIL, rot:Math.random() * TAU, vr:rr(-9, 9), life:rr(0.7, 1.2)}); }
};
IA.sigil = (x, y, r0, r1, life, o) => IA.add(Object.assign({k:'sigil', x, y, r0, r1, life, spin:0.7}, o || {}));
IA.pillar = (x, y, w, h, life, o) => IA.add(Object.assign({k:'pillar', x, y, w, h, life}, o || {}));
IA.portal = (x, y, life, o) => IA.add(Object.assign({k:'portal', x, y, life, h:o && o.h || 78, w:o && o.w || 30}, o || {}));
IA.spikes = (x, y, n, rad, o) => {
  if(fxLv() >= 3) return; n = Math.ceil(n * (fxLv() >= 2 ? 0.5 : 1)); o = o || {};
  for(let i = 0; i < n; i++){ const a = i / n * TAU + Math.random() * 0.3;
    IA.add({k:'spike', minor:true, x:x + Math.cos(a) * rad, y:y + Math.sin(a) * rad * 0.62, h:rr(o.h0 || 40, o.h1 || 80), w:rr(7, 12), life:rr(0.6, 1.0), delay:rr(0, o.dly || 0.2), col:i % 3 === 0 ? LIL : AM}); }
};
IA.burst = (x, y, big) => {                         /* универсальный взрыв осколков и искр */
  IA.sparks(x, y, big ? 16 : 8, {spread:big ? 14 : 6}); IA.shards(x, y - 8, big ? 10 : 5, {s0:60, s1:big ? 280 : 180});
};

function iaTick(dt){
  if(!(dt > 0)) return;
  for(let i = IA.q.length - 1; i >= 0; i--){ const e = IA.q[i]; e.t -= dt; if(e.t <= 0){ IA.q.splice(i, 1); try { e.fn(); } catch(err) { warn('later', err); } } }
  for(let i = IA.list.length - 1; i >= 0; i--){
    const o = IA.list[i]; o.t += dt;
    if(o.t < 0) continue;
    if(o.t >= o.life){ IA.list.splice(i, 1); continue; }
    if(o.k === 'spark' || o.k === 'shard'){
      o.vz -= o.g * dt; o.z += o.vz * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= 0.985; o.vy *= 0.985;
      if(o.k === 'shard'){ o.rot += o.vr * dt; if(o.z < 0){ o.z = 0; o.vz = Math.abs(o.vz) * 0.3; o.vx *= 0.6; o.vy *= 0.6; } }
    }
  }
  /* попадание осколков атаки */
  if(IA.proj.length){
    let live = null; try { live = projectiles; } catch(e) {}
    for(let i = IA.proj.length - 1; i >= 0; i--){
      const p = IA.proj[i];
      if(live && live.indexOf(p) < 0){ IA.proj.splice(i, 1); try { IA.burst(p.x, p.y, false); fxRing(p.x, p.y, 34, VIO, 0.3); spawnParticles(p.x, p.y, LIL, 6, 0.7); gsnd('iaChime', p.x, p.y, 0.5); } catch(err) { warn('hit', err); } }
    }
    if(IA.proj.length > 60) IA.proj.splice(0, IA.proj.length - 60);
  }
  /* фоновые искры вокруг героев с арканой и их иллюзий */
  if(fxLv() < 2 && typeof units !== 'undefined'){
    for(const h of units){
      if(!h || h.dead || !isIA(h)) continue;
      if(h.team !== 0 && typeof isVisibleToPlayer === 'function' && !isVisibleToPlayer(h)) continue;
      h._iaE = (h._iaE || 0) + dt;
      if(h._iaE > (fxLv() === 1 ? 0.26 : 0.13)){ h._iaE = 0;
        IA.add({k:'spark', minor:true, x:h.x + rr(-24, 24), y:h.y + rr(-6, 10), z:rr(4, 34), vx:rr(-12, 12), vy:rr(-8, 8), vz:rr(40, 100), g:-14, size:rr(2.5, 6), col:COLS[(Math.random() * 4) | 0], life:rr(0.9, 1.6), spin:rr(-2, 2)});
      }
    }
  }
}
const visible = (x, y, m) => (typeof isWorldPointVisible === 'function' ? isWorldPointVisible(x, y, m) : true);
function hexagram(g, R){
  for(let s = 0; s < 2; s++){ g.beginPath(); for(let i = 0; i <= 3; i++){ const a = i * TAU / 3 + s * Math.PI / 3 - Math.PI / 2, px = Math.cos(a) * R, py = Math.sin(a) * R; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
}
function star4(g, x, y, s){ g.beginPath(); g.moveTo(x, y - s); g.quadraticCurveTo(x, y, x + s, y); g.quadraticCurveTo(x, y, x, y + s); g.quadraticCurveTo(x, y, x - s, y); g.quadraticCurveTo(x, y, x, y - s); g.fill(); }
function drawSigil(g, o){
  const k = clampN(o.t / o.life, 0, 1), r = o.r0 + (o.r1 - o.r0) * ease(k), a = (1 - k) * 0.95;
  g.save(); g.translate(o.x, o.y); g.scale(1, 0.62);
  if(o.glow){ const gr = g.createRadialGradient(0, 0, r * 0.1, 0, 0, r); gr.addColorStop(0, 'rgba(40,10,80,0.7)'); gr.addColorStop(0.7, 'rgba(138,60,224,0.35)'); gr.addColorStop(1, 'rgba(199,125,255,0)');
    g.globalAlpha = Math.min(1, a * 1.3); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); }
  g.rotate(o.t * (o.spin || 0.7)); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'miter';
  g.globalAlpha = a; g.strokeStyle = VIO; g.lineWidth = 2.6 * (1 - k * 0.4); hexagram(g, r * 0.92);
  g.strokeStyle = AM; g.lineWidth = 3.2; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  g.globalAlpha = a * 0.8; g.strokeStyle = LIL; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, r * 0.82, 0, TAU); g.stroke();
  g.globalAlpha = a; g.fillStyle = WHT;
  for(let i = 0; i < 12; i++){ const t = i / 12 * TAU; g.save(); g.translate(Math.cos(t) * r * 1.07, Math.sin(t) * r * 1.07); g.rotate(t); g.fillRect(-1.5, -5, 3, 10); g.restore(); }
  g.restore();
}
function drawPortal(g, o){
  const k = clampN(o.t / o.life, 0, 1), a = Math.sin(Math.min(1, k * 1.05) * Math.PI), w = o.w * (0.4 + 0.6 * Math.min(1, o.t / 0.2)), h = o.h * (0.6 + 0.4 * Math.min(1, o.t / 0.2));
  g.save(); g.translate(o.x, o.y - h * 0.55);
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(0, 0, 2, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.35, 'rgba(228,200,255,0.75)'); gr.addColorStop(0.7, 'rgba(138,60,224,0.55)'); gr.addColorStop(1, 'rgba(58,20,112,0)');
  g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, w, h * 0.55, 0, 0, TAU); g.fill();
  g.strokeStyle = LIL; g.lineWidth = 2.4; g.shadowColor = AM; g.shadowBlur = 14; g.globalAlpha = a * 0.9; g.beginPath(); g.ellipse(0, 0, w, h * 0.55, 0, 0, TAU); g.stroke();
  g.shadowBlur = 0; g.strokeStyle = VIO; g.lineWidth = 1.2; g.globalAlpha = a * 0.6; g.beginPath(); g.ellipse(0, 0, w * 0.7, h * 0.4, 0, 0, TAU); g.stroke();
  g.fillStyle = WHT; for(let i = 0; i < 4; i++){ const q = ((o.t * 0.9 + i / 4) % 1); g.globalAlpha = a * (1 - q); star4(g, Math.sin(i * 2.3 + o.t * 3) * w * 0.55, (q - 0.5) * h * 0.9, 3 + 3 * (1 - q)); }
  g.restore();
}
function iaDrawGround(){
  if(!IA.list.length) return;
  const g = ctx; g.save();
  for(const o of IA.list){
    if(o.t < 0 || o.k !== 'sigil') continue;
    if(!visible(o.x, o.y, (o.r1 || 120) + 100)) continue;
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; drawSigil(g, o);
  }
  g.restore();
}
function iaDrawTop(){
  if(!IA.list.length) return;
  const g = ctx; g.save();
  for(const o of IA.list){
    if(o.t < 0 || o.k === 'sigil') continue;
    if(!visible(o.x, o.y, (o.h || 160) + 100)) continue;
    const k = clampN(o.t / o.life, 0, 1);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    switch(o.k){
      case 'spark': { const a = Math.min(1, (1 - k) * 2.2) * (0.6 + 0.4 * Math.sin(o.t * 12 + o.x)); g.globalCompositeOperation = 'lighter'; g.fillStyle = o.col;
        g.globalAlpha = a * 0.3; g.beginPath(); g.arc(o.x, o.y - o.z, o.size * 1.8, 0, TAU); g.fill();
        g.globalAlpha = a; g.save(); g.translate(o.x, o.y - o.z); g.rotate(o.t * (o.spin || 0)); star4(g, 0, 0, o.size * (1 - k * 0.4)); g.restore(); break; }
      case 'shard': { const a = Math.min(1, (1 - k) * 2.5), s = o.size; g.save(); g.translate(o.x, o.y - o.z); g.rotate(o.rot);
        g.globalAlpha = a; g.fillStyle = o.col; g.beginPath(); g.moveTo(0, -s * 1.5); g.lineTo(s * 0.7, 0); g.lineTo(0, s * 1.1); g.lineTo(-s * 0.7, 0); g.closePath(); g.fill();
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.7; g.strokeStyle = LIL; g.lineWidth = 1.2; g.stroke(); g.restore(); break; }
      case 'pillar': { const a = Math.sin(k * Math.PI), w = o.w * (0.6 + 0.4 * a), gr = g.createLinearGradient(0, o.y, 0, o.y - o.h);
        gr.addColorStop(0, 'rgba(199,125,255,0.9)'); gr.addColorStop(0.5, 'rgba(138,60,224,0.5)'); gr.addColorStop(1, 'rgba(58,20,112,0)');
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = gr; g.fillRect(o.x - w / 2, o.y - o.h, w, o.h);
        g.fillStyle = LIL; g.globalAlpha = a * 0.6; g.fillRect(o.x - w * 0.12, o.y - o.h * 0.9, w * 0.24, o.h * 0.9); break; }
      case 'spike': { const a = Math.sin(Math.min(1, k * 1.15) * Math.PI), h = o.h * (0.3 + 0.9 * Math.sin(k * Math.PI)), w = o.w;
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = a * 0.95; g.fillStyle = o.col;
        g.beginPath(); g.moveTo(o.x - w, o.y); g.lineTo(o.x - w * 0.15, o.y - h); g.lineTo(o.x + w, o.y); g.closePath(); g.fill();
        g.fillStyle = WHT; g.globalAlpha = a * 0.5; g.beginPath(); g.moveTo(o.x - w * 0.5, o.y); g.lineTo(o.x - w * 0.15, o.y - h); g.lineTo(o.x + w * 0.15, o.y); g.closePath(); g.fill();
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.5; g.strokeStyle = VIO; g.lineWidth = 1.4; g.beginPath(); g.moveTo(o.x - w, o.y); g.lineTo(o.x - w * 0.15, o.y - h); g.lineTo(o.x + w, o.y); g.stroke(); break; }
      case 'portal': drawPortal(g, o); break;
    }
  }
  g.restore();
}

/* ---------- подключение к циклу и отрисовке ---------- */
try { const _t = fx973Tick; fx973Tick = function(dt){ _t.apply(this, arguments); try { iaTick(dt); } catch(err) { warn('tick', err); } }; } catch(err) { warn('hookTick', err); }
try { const _dw = drawWards; drawWards = function(){ _dw.apply(this, arguments); try { iaDrawGround(); } catch(err) { warn('ground', err); } }; } catch(err) { warn('hookGround', err); }
try { const F = G.__fx973; if(F){ const _d0 = F.drawWorld; F.drawWorld = function(){ _d0.apply(this, arguments); try { iaDrawTop(); } catch(err) { warn('top', err); } }; } } catch(err) { warn('hookTop', err); }

/* ---------- цвет эффектов скиллов ---------- */
try { const _sfc = skillFxColor;
  G.skillFxColor = skillFxColor = function(hero, skillId){ if(isIA(hero) && /illusion/i.test(String(skillId))) return VIO; return _sfc.apply(this, arguments); }; } catch(err) { warn('color', err); }

/* ---------- копии: вспышка при появлении любой иллюзии героя с арканой (Q, E и R) ---------- */
function spawnFx(il, big){
  const x = il.x, y = il.y;
  fxRing(x, y, big ? 70 : 46, VIO, 0.45); IA.portal(x, y + 6, big ? 0.9 : 0.6, {h:big ? 92 : 70, w:big ? 34 : 26});
  IA.sparks(x, y - 10, big ? 14 : 9, {spread:12}); IA.sigil(x, y + 6, 14, big ? 86 : 60, 0.7, {spin:-1.2, minor:true});
  gsnd('iaChime', x, y, big ? 0.8 : 0.5);
}
try { const _si = spawnIllusion;
  G.spawnIllusion = spawnIllusion = function(hero){
    const il = _si.apply(this, arguments);
    try { if(il && isIA(hero)){ il._iaBorn = true; spawnFx(il, false); } } catch(err) { warn('spawnIl', err); }
    return il;
  }; } catch(err) { warn('spawnIllusion', err); }

/* ---------- Q «Двойник»: зеркальный портал, луч и осколки ---------- */
function wrapCast(id, fn){
  const sk = SKILLS[id]; if(!sk || typeof sk.cast !== 'function') return;
  const orig = sk.cast;
  sk.cast = function(h){
    if(!isIA(h)) return orig.apply(this, arguments);
    return fn(orig, this, Array.prototype.slice.call(arguments));
  };
}
wrapCast('illusionistDouble', (orig, self, a) => {
  const h = a[0], n0 = units.length, res = orig.apply(self, a);
  try {
    let il = null; for(let i = n0; i < units.length; i++) if(units[i].isIllusion && units[i].owner === h) il = units[i];
    IA.sigil(h.x, h.y + 6, 18, 120, 0.8, {glow:true}); IA.sparks(h.x, h.y - 10, 12, {spread:16});
    if(il){ fxBeam(h.x, h.y - 24, il.x, il.y - 24, LIL, 0.45); fxBeam(h.x, h.y - 24, il.x, il.y - 24, VIO, 0.25); IA.portal(il.x, il.y + 6, 1.0, {h:96, w:36}); IA.shards(il.x, il.y - 14, 10); IA.pillar(il.x, il.y + 4, 30, 200, 0.6); }
    addText(h.x, h.y - 84, 'ОТРАЖЕНИЕ', VIO, 1.1, 16); gsnd('iaCrystal', h.x, h.y, 0.8);
  } catch(err) { warn('Q', err); }
  return res;
});
/* ---------- W «Рокировка»: два портала, скрещённые лучи, искры вдоль пути ---------- */
wrapCast('illusionistSwap', (orig, self, a) => {
  const h = a[0], x = a[1], y = a[2];
  let tgt = null, best = Infinity;
  for(const u of units){ if(!u.isIllusion || u.owner !== h || u.dead) continue; const d = Math.hypot(u.x - x, u.y - y); if(d < best){ best = d; tgt = u; } }
  const px = h.x, py = h.y, tx = tgt ? tgt.x : px, ty = tgt ? tgt.y : py;
  const res = orig.apply(self, a);
  if(res === false || !tgt) return res;
  try {
    for(const p of [[px, py], [tx, ty]]){ IA.portal(p[0], p[1] + 6, 0.9, {h:92, w:34}); IA.sigil(p[0], p[1] + 6, 16, 110, 0.8, {glow:true, spin:p[0] === px ? 1 : -1}); IA.sparks(p[0], p[1] - 12, 12, {spread:14}); IA.shards(p[0], p[1] - 14, 7); }
    fxBeam(px, py - 24, tx, ty - 24, LIL, 0.5); fxBeam(px, py - 10, tx, ty - 10, VIO, 0.4); fxBeam(px, py - 38, tx, ty - 38, MAG, 0.3);
    const n = 12; for(let i = 0; i <= n; i++){ const f = i / n; IA.sparks(px + (tx - px) * f, py + (ty - py) * f, 1, {spread:8, v0:30, v1:110}); }
    addText(h.x, h.y - 100, '⇄', VIO, 1.0, 22); gsnd('iaCrystal', h.x, h.y, 0.9);
  } catch(err) { warn('W', err); }
  return res;
});
/* ---------- R «Гранд-финал»: схлопывание в кристалл, затем взрыв гексаграммы ---------- */
wrapCast('illusionistFinale', (orig, self, a) => {
  const h = a[0], x0 = h.x, y0 = h.y;
  const res = orig.apply(self, a);
  try {
    IA.sigil(x0, y0 + 6, 220, 30, 0.5, {glow:true, spin:-2.4}); IA.pillar(x0, y0 + 4, 40, 320, 0.5); fxRing(x0, y0, 160, VIO, 0.5);
    for(let i = 0; i < 10; i++){ const ang = i / 10 * TAU; IA.add({k:'shard', minor:true, x:x0 + Math.cos(ang) * 150, y:y0 + Math.sin(ang) * 90, z:24, vx:-Math.cos(ang) * 300, vy:-Math.sin(ang) * 180, vz:40, g:0, size:6, col:i % 2 ? AM : LIL, rot:ang, vr:6, life:0.5}); }
    gsnd('iaCrystal', x0, y0, 1.0);
    IA.later(0.52, () => {
      const cx = h.x, cy = h.y, R = 150;
      IA.sigil(cx, cy + 6, 40, 280, 1.4, {glow:true, spin:0.9}); IA.sigil(cx, cy + 6, 30, 190, 1.0, {spin:-1.6});
      IA.pillar(cx, cy + 4, 70, 520, 0.9);
      for(let i = 0; i < 6; i++){ const ang = i / 6 * TAU; IA.pillar(cx + Math.cos(ang) * R, cy + 4 + Math.sin(ang) * R * 0.62, 34, 360, 0.8, {delay:0.05 * i}); }
      IA.spikes(cx, cy, 14, R + 30, {h0:60, h1:120, dly:0.35}); IA.burst(cx, cy - 10, true); IA.shards(cx, cy - 20, 16, {s0:100, s1:340}); IA.sparks(cx, cy - 10, 22, {spread:30, v0:80, v1:260});
      fxRing(cx, cy, 220, LIL, 0.7); fxRing(cx, cy, 150, MAG, 0.5);
      for(const u of units){ if(u.isIllusion && u.owner === h && !u.dead) spawnFx(u, true); }
      gsnd('iaCrystal', cx, cy, 1.1);
    });
  } catch(err) { warn('R', err); }
  return res;
});

/* ---------- атака: аметистовый осколок ---------- */
try { const _sp = spawnProjectile;
  G.spawnProjectile = spawnProjectile = function(x, y, target, dmg, source){
    const p = _sp.apply(this, arguments);
    try {
      const o = projectileOwner(p);
      if(p && !p.isSpell && !p.kind && isIA(o)){
        p.iaGem = true; p.color = VIO; p.radius = Math.max(p.radius || 7, 9);
        const fx = x + Math.cos(o.facing || 0) * 40, fy = y + Math.sin(o.facing || 0) * 40;
        fxRing(fx, fy, 26, VIO, 0.22); IA.sparks(fx, fy - 6, 5, {spread:5, v0:30, v1:110}); spawnParticles(fx, fy, LIL, 4, 0.6);
        IA.proj.push(p); gsnd('iaChime', x, y, 0.35);
      }
    } catch(err) { warn('proj', err); }
    return p;
  }; } catch(err) { warn('spawnProjectile', err); }
function drawGem(p){
  const r = Math.max(8, p.radius || 9), a = typeof projectileHeading === 'function' ? projectileHeading(p) : 0, tm = gameTime * 11;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.shadowColor = AM; ctx.shadowBlur = 20; ctx.globalAlpha = 0.22; ctx.fillStyle = AM; ctx.beginPath(); ctx.arc(0, 0, r * 2.6, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
  for(let k = 0; k < 4; k++){                          /* искры позади */
    ctx.globalAlpha = 0.75 - k * 0.15; ctx.fillStyle = COLS[k];
    const sx = -r * (1.6 + k * 1.1), sy = Math.sin(tm + k * 1.7) * r * 0.9; ctx.save(); ctx.translate(sx, sy); ctx.rotate(tm * 0.4 + k); star4(ctx, 0, 0, r * (0.42 - k * 0.07)); ctx.restore();
  }
  ctx.rotate(tm * 0.35);                                /* вращающийся кристалл */
  const sq = 0.55 + 0.45 * Math.abs(Math.cos(tm * 0.7)), w = r * 0.85 * sq, hh = r * 1.5;
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const gr = ctx.createLinearGradient(-w, -hh, w, hh); gr.addColorStop(0, LIL); gr.addColorStop(0.5, AM); gr.addColorStop(1, DEEP);
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(w, -hh * 0.25); ctx.lineTo(w * 0.8, hh * 0.6); ctx.lineTo(0, hh); ctx.lineTo(-w * 0.8, hh * 0.6); ctx.lineTo(-w, -hh * 0.25); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(w, -hh * 0.25); ctx.lineTo(0, hh * 0.05); ctx.lineTo(-w, -hh * 0.25); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = WHT; ctx.globalAlpha = 0.8; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, -hh); ctx.lineTo(0, hh); ctx.moveTo(-w, -hh * 0.25); ctx.lineTo(w, -hh * 0.25); ctx.stroke();
  ctx.restore();
}
try { const _dtp = drawThemedProjectile;
  G.drawThemedProjectile = drawThemedProjectile = function(p){
    if(p && p.iaGem && !p.kind){ try { drawGem(p); return true; } catch(err) { warn('gem', err); } }
    return _dtp.apply(this, arguments);
  }; } catch(err) { warn('drawProj', err); }
try { const _dat = drawAttackTrail;
  G.drawAttackTrail = drawAttackTrail = function(p){
    if(!(p && p.iaGem)) return _dat.apply(this, arguments);
    try {
      if(fxLv() >= 3) return;
      const h = p.hist || (p.hist = []), last = h[h.length - 1];
      if(!last || Math.hypot(p.x - last[0], p.y - last[1]) > 5){ h.push([p.x, p.y]); const mx = (typeof ATK_TRAIL !== 'undefined' && ATK_TRAIL[fxLv()]) || 8; while(h.length > mx) h.shift(); }
      if(h.length < 2) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const n = h.length, rad = Math.max(4, p.radius || 9);
      for(let i = 1; i <= n; i++){ const f = i / n, x1 = i < n ? h[i][0] : p.x, y1 = i < n ? h[i][1] : p.y, w = Math.sin(gameTime * 13 + i * 1.7) * rad * 0.16 * (1 - f);
        ctx.globalAlpha = f * 0.6; ctx.strokeStyle = f > 0.6 ? VIO : AM; ctx.lineWidth = Math.max(1.5, rad * 1.0 * f);
        ctx.beginPath(); ctx.moveTo(h[i - 1][0], h[i - 1][1] + w); ctx.lineTo(x1, y1 + w); ctx.stroke();
        if(fxLv() < 2 && i % 3 === 0){ ctx.globalAlpha = f * 0.9; ctx.fillStyle = i % 2 ? LIL : MAG; star4(ctx, h[i - 1][0] + Math.sin(gameTime * 9 + i) * rad * 0.9, h[i - 1][1] + Math.cos(gameTime * 8 + i) * rad * 0.7, 2 + f * 2.4); }
      }
      ctx.restore();
    } catch(err) { warn('trail', err); }
  }; } catch(err) { warn('trail', err); }

/* ---------- аура у ног героя и его копий (вызывается из game.js вместе с аурами других арканов) ---------- */
G.drawIllusionistArcanaAura = function(u){
  try {
    if(!isIA(u) || u.dead) return;
    const base = (u.radius || 28) + 8, tm = (typeof gameTime === 'number' ? gameTime : 0), ghost = !!u.isIllusion;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'miter'; ctx.translate(0, 8); ctx.scale(1, 0.62);
    ctx.save(); ctx.rotate(tm * 0.5);                          /* гексаграмма */
    ctx.strokeStyle = VIO; ctx.shadowColor = AM; ctx.shadowBlur = 14; ctx.globalAlpha = ghost ? 0.55 : 0.8; ctx.lineWidth = 2.2; hexagram(ctx, base + 16);
    ctx.restore();
    ctx.shadowBlur = 10; ctx.strokeStyle = AM; ctx.lineWidth = 2.6; ctx.globalAlpha = ghost ? 0.5 : 0.75; ctx.beginPath(); ctx.arc(0, 0, base + 16, 0, TAU); ctx.stroke();
    ctx.strokeStyle = LIL; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.5; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -tm * 18; ctx.beginPath(); ctx.arc(0, 0, base + 26, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.shadowBlur = 8;
    for(let i = 0; i < 8; i++){                                 /* кристаллические шипы по кругу */
      const a = i / 8 * TAU + tm * 0.35, fl = 0.5 + 0.5 * Math.sin(tm * 3 + i * 2.1), hgt = (18 + fl * 14) / 0.62, w = 5, bx = Math.cos(a) * (base + 12), by = Math.sin(a) * (base + 12);
      ctx.globalAlpha = ghost ? 0.5 : 0.7; ctx.fillStyle = i % 3 === 0 ? LIL : AM;
      ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.lineTo(bx - w * 0.1, by - hgt); ctx.lineTo(bx + w, by); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = ghost ? 0.3 : 0.45; ctx.fillStyle = WHT; ctx.beginPath(); ctx.moveTo(bx - w * 0.5, by); ctx.lineTo(bx - w * 0.1, by - hgt); ctx.lineTo(bx + w * 0.15, by); ctx.closePath(); ctx.fill();
    }
    for(let i = 0; i < 6; i++){                                 /* орбитальные самоцветы */
      const a = -i / 6 * TAU - tm * 1.2, fl = 0.5 + 0.5 * Math.sin(tm * 6 + i * 1.7), px = Math.cos(a) * (base + 34), py = Math.sin(a) * (base + 34), s = 3 + fl * 2.6;
      ctx.globalAlpha = 0.5 + fl * 0.5; ctx.fillStyle = i % 2 ? WHT : MAG; ctx.save(); ctx.translate(px, py); ctx.scale(1, 1 / 0.62); star4(ctx, 0, 0, s * 1.6); ctx.restore();
    }
    ctx.restore();
  } catch(err) { warn('aura', err); }
};
})();
