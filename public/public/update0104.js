/* DotaSense 0.10.4 — АРКАНА МО3ГИ «ДЕМОН РАЗУМА» (адский стиль) и «Еблет Евсютина» на 200 монет дешевле.
   Цена арканы (1500) продублирована в accounts.js. Облик героя и дрона рисует hero3d.js (skinId 'mo3giArcana').
   • Облик: тёмно-багровая броня, багровая кожа, рога на шлеме, горящие глаза, шипы на плечах, перепончатые крылья, хвост с огненным
     остриём, знак пентаграммы на груди. Мини-дрон у плеча — крошечный красный мозг. Под ногами горит пентаграмма с шипами.
   • Боевой дрон (Q и G) превращается в красный демонический мозг с рожками и жёлтым глазом; от героя к нему тянется нейронная молния.
   • Атака — «адский сгусток»: тёмное ядро в красно-оранжевом пламени с языками огня; при выстреле — вспышка, при попадании — взрыв искр.
   • Скиллы (механика не меняется, добавлены эффекты):
       Q «Боевой дрон»     — адский разлом, из которого вылетает мозг, пентаграмма у героя, нейронная связь; мозг оставляет угли и пульсирует;
                             при взрыве — пентаграмма на всю область, столбы адского огня, шипы, черепа и волна разума;
       W «Дар с небес»     — кровавый ритуал: жертвенная пентаграмма, красно-фиолетовые лучи ко всем союзникам и спирали душ над ними;
       E «Скрытые мины»    — мина становится пульсирующим демоническим знаком; при установке из земли вылезают шипы, при взрыве — адский фейерверк;
       R «Военный байк»    — адское воспламенение: пентаграмма, столб огня, огненные колёса, бак цвета крови и пылающий след на земле.
   • Аура у ног героя: вращающаяся пентаграмма, огненные языки и поднимающиеся угли. Подключается после update01039.js. */
(function(){
'use strict';
const G = window;
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update0104 ' + tag + ':', err); } catch(e) {} } };
const TAU = Math.PI * 2;
const RED = '#ff2a44', BLD = '#c4122a', DEEP = '#3a0610', EMB = '#ff7a2a', GLD = '#ffc14a', HOT = '#fff0d0', WHT = '#ffffff', VIO = '#9b3cff', PINK = '#ff6a7c';
const COLS = [RED, EMB, GLD, PINK];
const fxLv = () => (typeof fxl === 'function' ? fxl() : 0);
const rr = (a, b) => a + Math.random() * (b - a);
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = k => 1 - Math.pow(1 - k, 3);
const isMA = h => !!(h && h.def && h.def.id === 'mo3gi' && String(h.skinId || '').split('+')[0] === 'mo3giArcana');
const isMADrone = u => !!(u && u.isMo3giDrone && isMA(u.owner));

/* ---------- скин ---------- */
try {
  const def = {id:'mo3giArcana', arcana:true, name:'ДЕМОН РАЗУМА', heroId:'mo3gi', rarity:'arcana', price:1500, accent:'#ff2a44', border:'#7a0a1c',
    previewHero:'mo3gi', previewColor:'#1a0508', previewColor2:'#ff5a3a', weaponColor:'#ff3b4e',
    desc:'АРКАНА. Военный инженер продал разум преисподней и стал Демоном Разума: багровая броня, рога на шлеме, горящие глаза, перепончатые крылья и хвост с огненным остриём. Боевой дрон превращается в красный демонический мозг с рожками и глазом, под ногами горит пентаграмма. Атака — адский сгусток, а «Боевой дрон», «Дар с небес», «Скрытые мины» и «Военный байк» получают огненные эффекты. Не меняет характеристики.',
    hint:'Виден, когда выбран Мо3ги.'};
  if(!SKIN_BY_ID[def.id]){ SKIN_DEFS.push(def); SKIN_BY_ID[def.id] = def; }
} catch(err) { warn('skin', err); }

Object.assign(SFX_PRESETS, {
  mzRumble: {from:120, to:46, duration:0.6, type:'sawtooth', volume:0.06, noise:0.5, layers:[[240, 70, 0, 0.5, 'square', 0.035]]},
  mzWhisper: {from:340, to:130, duration:0.42, type:'triangle', volume:0.05, layers:[[680, 220, 0.04, 0.3, 'sine', 0.03]]},
  mzBoom: {from:200, to:36, duration:0.7, type:'sawtooth', volume:0.08, noise:1.0, layers:[[90, 30, 0, 0.8, 'sine', 0.12]]}
});
const gsnd = (k, x, y, v) => {
  try {
    const p = (typeof playerHero !== 'undefined' && playerHero && !playerHero.dead) ? playerHero : (typeof cam !== 'undefined' ? cam : {x, y});
    const f = 1 - Math.hypot(x - p.x, y - p.y) / 1750; if(f <= 0.06) return;
    snd(k, Math.pow(f, 1.15) * (v == null ? 1 : v));
  } catch(e) {}
};
const shake = (m, d) => { try { const F = G.__fx973; if(F && fxLv() < 2){ F.shakeMag = Math.max(F.shakeMag, m); F.shakeT = F.shakeDur = d; } } catch(e) {} };

/* ---------- частицы арканы ---------- */
const MZ = {list: [], q: [], proj: []};
MZ.add = function(o){
  if(fxLv() >= 3) return null;
  if(MZ.list.length >= (fxLv() >= 2 ? 90 : 240)){ const i = MZ.list.findIndex(e => e.minor); if(i < 0){ if(o.minor) return null; MZ.list.shift(); } else MZ.list.splice(i, 1); }
  o.t = -(o.delay || 0); MZ.list.push(o); return o;
};
MZ.later = (sec, fn) => { MZ.q.push({t: sec, fn}); };
MZ.embers = (x, y, n, o) => {                       /* угли и искры, летящие вверх */
  if(fxLv() >= 3) return; o = o || {}; n = Math.ceil(n * (fxLv() >= 2 ? 0.4 : fxLv() === 1 ? 0.7 : 1));
  for(let i = 0; i < n; i++){ const a = Math.random() * TAU, sp = rr(o.s0 || 20, o.s1 || 110);
    MZ.add({k:'spark', minor:true, x:x + Math.cos(a) * rr(0, o.spread || 8), y:y + Math.sin(a) * rr(0, (o.spread || 8) * 0.6), z:o.z0 == null ? 14 : o.z0,
      vx:Math.cos(a) * sp, vy:Math.sin(a) * sp * 0.5, vz:rr(o.v0 || 50, o.v1 || 190), g:o.g == null ? 170 : o.g, size:rr(o.sz0 || 2.5, o.sz1 || 6), col:COLS[i % 4], life:rr(0.6, 1.3), spin:rr(-3, 3)}); }
};
MZ.shards = (x, y, n, o) => {                       /* обсидиановые осколки */
  if(fxLv() >= 3) return; o = o || {}; n = Math.ceil(n * (fxLv() >= 2 ? 0.4 : 1));
  for(let i = 0; i < n; i++){ const a = Math.random() * TAU, sp = rr(o.s0 || 80, o.s1 || 260);
    MZ.add({k:'shard', minor:true, x, y, z:o.z0 == null ? 20 : o.z0, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp * 0.5, vz:rr(110, 320), g:560, size:rr(3, 7),
      col:i % 3 ? '#2a0810' : BLD, rot:Math.random() * TAU, vr:rr(-9, 9), life:rr(0.7, 1.2)}); }
};
MZ.skulls = (x, y, n, o) => {                       /* череп-призраки поднимаются вверх */
  if(fxLv() >= 2) return; o = o || {}; n = Math.ceil(n * (fxLv() === 1 ? 0.5 : 1));
  for(let i = 0; i < n; i++){ const a = Math.random() * TAU, sp = rr(10, o.s1 || 70);
    MZ.add({k:'skull', minor:true, x:x + Math.cos(a) * rr(0, o.spread || 20), y:y + Math.sin(a) * rr(0, (o.spread || 20) * 0.6), z:rr(6, 22), vx:Math.cos(a) * sp * 0.3, vy:Math.sin(a) * sp * 0.2,
      vz:rr(55, 120), g:-10, size:rr(7, 12), life:rr(0.9, 1.5), delay:rr(0, o.dly || 0.25)}); }
};
MZ.sigil = (x, y, r0, r1, life, o) => MZ.add(Object.assign({k:'sigil', x, y, r0, r1, life, spin:0.7}, o || {}));
MZ.pillar = (x, y, w, h, life, o) => MZ.add(Object.assign({k:'pillar', x, y, w, h, life}, o || {}));
MZ.portal = (x, y, life, o) => MZ.add(Object.assign({k:'portal', x, y, life, h:o && o.h || 78, w:o && o.w || 30}, o || {}));
MZ.spikes = (x, y, n, rad, o) => {
  if(fxLv() >= 3) return; n = Math.ceil(n * (fxLv() >= 2 ? 0.5 : 1)); o = o || {};
  for(let i = 0; i < n; i++){ const a = i / n * TAU + Math.random() * 0.3;
    MZ.add({k:'spike', minor:true, x:x + Math.cos(a) * rad, y:y + Math.sin(a) * rad * 0.62, h:rr(o.h0 || 40, o.h1 || 80), w:rr(7, 12), life:rr(0.6, 1.0), delay:rr(0, o.dly || 0.2), col:i % 3 === 0 ? BLD : '#2a0810'}); }
};
MZ.wisps = (cx, cy, n, o) => {                      /* спирали душ вокруг точки */
  if(fxLv() >= 2) return; o = o || {}; n = Math.ceil(n * (fxLv() === 1 ? 0.5 : 1));
  for(let i = 0; i < n; i++)
    MZ.add({k:'wisp', minor:true, cx, cy, a0:i / n * TAU, w:rr(3, 5) * (i % 2 ? 1 : -1), r0:o.r || 40, x:cx, y:cy, z:4, vz:rr(55, 100), life:rr(0.9, 1.4), col:o.col || (i % 2 ? VIO : PINK), delay:rr(0, 0.3)});
};
MZ.burst = (x, y, big) => { MZ.embers(x, y, big ? 18 : 8, {spread:big ? 16 : 6}); MZ.shards(x, y - 8, big ? 10 : 5, {s0:60, s1:big ? 280 : 180}); };
MZ.flame = (x, y, n, o) => {                        /* языки пламени у земли */
  if(fxLv() >= 3) return; o = o || {}; n = Math.ceil(n * (fxLv() >= 2 ? 0.4 : fxLv() === 1 ? 0.7 : 1));
  for(let i = 0; i < n; i++)
    MZ.add({k:'flame', minor:true, x:x + rr(-(o.spread || 10), o.spread || 10), y:y + rr(-4, 4), z:rr(0, 6), vx:rr(-18, 18), vy:rr(-6, 6), vz:rr(60, 140), size:rr(o.s0 || 7, o.s1 || 13), life:rr(0.35, 0.7)});
};

function mzTick(dt){
  if(!(dt > 0)) return;
  for(let i = MZ.q.length - 1; i >= 0; i--){ const e = MZ.q[i]; e.t -= dt; if(e.t <= 0){ MZ.q.splice(i, 1); try { e.fn(); } catch(err) { warn('later', err); } } }
  for(let i = MZ.list.length - 1; i >= 0; i--){
    const o = MZ.list[i]; o.t += dt;
    if(o.t < 0) continue;
    if(o.t >= o.life){ MZ.list.splice(i, 1); continue; }
    if(o.k === 'spark' || o.k === 'shard'){
      o.vz -= o.g * dt; o.z += o.vz * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= 0.985; o.vy *= 0.985;
      if(o.k === 'shard'){ o.rot += o.vr * dt; if(o.z < 0){ o.z = 0; o.vz = Math.abs(o.vz) * 0.3; o.vx *= 0.6; o.vy *= 0.6; } }
    } else if(o.k === 'skull' || o.k === 'flame'){
      o.z += o.vz * dt; o.x += (o.vx || 0) * dt; o.y += (o.vy || 0) * dt; if(o.k === 'flame') o.vz *= 0.97;
    } else if(o.k === 'wisp'){
      const r = o.r0 * (1 - 0.45 * o.t / o.life), a = o.a0 + o.t * o.w; o.x = o.cx + Math.cos(a) * r; o.y = o.cy + Math.sin(a) * r * 0.55; o.z += o.vz * dt;
    }
  }
  /* попадание адских сгустков */
  if(MZ.proj.length){
    let live = null; try { live = projectiles; } catch(e) {}
    for(let i = MZ.proj.length - 1; i >= 0; i--){
      const p = MZ.proj[i];
      if(live && live.indexOf(p) < 0){ MZ.proj.splice(i, 1); try { MZ.burst(p.x, p.y, false); MZ.flame(p.x, p.y, 4, {spread:8}); fxRing(p.x, p.y, 34, RED, 0.3); spawnParticles(p.x, p.y, EMB, 6, 0.7); gsnd('mzWhisper', p.x, p.y, 0.35); } catch(err) { warn('hit', err); } }
    }
    if(MZ.proj.length > 60) MZ.proj.splice(0, MZ.proj.length - 60);
  }
  if(typeof units === 'undefined') return;
  for(const u of units){
    if(!u || u.dead) continue;
    /* фоновые угли вокруг героя */
    if(u.type === 'hero' && isMA(u) && fxLv() < 2){
      if(u.team !== 0 && typeof isVisibleToPlayer === 'function' && !isVisibleToPlayer(u)) continue;
      u._mzE = (u._mzE || 0) + dt;
      if(u._mzE > (fxLv() === 1 ? 0.26 : 0.13)){ u._mzE = 0;
        MZ.add({k:'spark', minor:true, x:u.x + rr(-24, 24), y:u.y + rr(-6, 10), z:rr(4, 34), vx:rr(-12, 12), vy:rr(-8, 8), vz:rr(40, 100), g:-14, size:rr(2.2, 5), col:COLS[(Math.random() * 4) | 0], life:rr(0.9, 1.6), spin:rr(-2, 2)});
      }
      /* байк: пылающий след на земле */
      if(u.bikeTimer > 0 && u.moving){
        u._mzB = (u._mzB || 0) + dt;
        if(u._mzB > 0.04){ u._mzB = 0;
          const bx = u.x - Math.cos(u.facing || 0) * 34, by = u.y + (u.radius || 22) * 0.55;
          MZ.flame(bx, by, 2, {spread:14, s0:9, s1:17});
          if(Math.random() < 0.25) MZ.embers(bx, by, 1, {spread:10, v0:40, v1:120});
        }
      }
    }
    /* дрон-мозг: угли позади, пульсирующие волны разума */
    if(isMADrone(u) && fxLv() < 3){
      if(u.team !== 0 && typeof isVisibleToPlayer === 'function' && !isVisibleToPlayer(u)) continue;
      u._mzD = (u._mzD || 0) + dt; u._mzW = (u._mzW || 0) + dt;
      if(u._mzD > (fxLv() >= 2 ? 0.2 : 0.07)){ u._mzD = 0;
        MZ.add({k:'spark', minor:true, x:u.x - Math.cos(u.facing || 0) * 14 + rr(-8, 8), y:u.y + rr(-6, 6), z:rr(10, 26), vx:rr(-14, 14), vy:rr(-10, 10), vz:rr(10, 50), g:20, size:rr(2.5, 5.5), col:COLS[(Math.random() * 4) | 0], life:rr(0.5, 0.9), spin:rr(-3, 3)});
      }
      if(u._mzW > 0.75){ u._mzW = 0; try { fxRing(u.x, u.y, 44, '#ff3b4e', 0.45); } catch(e) {} }
    }
  }
}
const visible = (x, y, m) => (typeof isWorldPointVisible === 'function' ? isWorldPointVisible(x, y, m) : true);
function pentagram(g, R){
  g.beginPath();
  for(let i = 0; i <= 5; i++){ const a = ((i * 2) % 5) * TAU / 5 - Math.PI / 2, px = Math.cos(a) * R, py = Math.sin(a) * R; i ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.stroke();
}
function flameShape(g, x, y, s, a){                 /* капля пламени с горящим ядром */
  g.save(); g.translate(x, y);
  g.globalAlpha = a; g.fillStyle = EMB; g.beginPath(); g.moveTo(-s * 0.55, 0); g.quadraticCurveTo(-s * 0.6, -s * 0.9, 0, -s * 1.9); g.quadraticCurveTo(s * 0.6, -s * 0.9, s * 0.55, 0); g.closePath(); g.fill();
  g.globalAlpha = a * 0.9; g.fillStyle = GLD; g.beginPath(); g.moveTo(-s * 0.28, 0); g.quadraticCurveTo(-s * 0.3, -s * 0.5, 0, -s * 1.1); g.quadraticCurveTo(s * 0.3, -s * 0.5, s * 0.28, 0); g.closePath(); g.fill();
  g.restore();
}
function skullShape(g, x, y, s){
  g.beginPath(); g.arc(x, y - s * 0.1, s * 0.62, Math.PI, 0); g.lineTo(x + s * 0.5, y + s * 0.38); g.lineTo(x + s * 0.22, y + s * 0.38); g.lineTo(x + s * 0.22, y + s * 0.62); g.lineTo(x - s * 0.22, y + s * 0.62); g.lineTo(x - s * 0.22, y + s * 0.38); g.lineTo(x - s * 0.5, y + s * 0.38); g.closePath(); g.fill();
  g.globalCompositeOperation = 'source-over'; g.fillStyle = '#2a0408';
  g.beginPath(); g.arc(x - s * 0.24, y - s * 0.06, s * 0.15, 0, TAU); g.arc(x + s * 0.24, y - s * 0.06, s * 0.15, 0, TAU); g.fill();
}
function drawSigil(g, o){
  const k = clampN(o.t / o.life, 0, 1), r = o.r0 + (o.r1 - o.r0) * ease(k), a = (1 - k) * 0.95;
  g.save(); g.translate(o.x, o.y); g.scale(1, 0.62);
  if(o.glow){ const gr = g.createRadialGradient(0, 0, r * 0.1, 0, 0, r); gr.addColorStop(0, 'rgba(50,0,10,0.75)'); gr.addColorStop(0.7, 'rgba(196,18,42,0.38)'); gr.addColorStop(1, 'rgba(255,80,40,0)');
    g.globalAlpha = Math.min(1, a * 1.3); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); }
  g.rotate(o.t * (o.spin || 0.7)); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'miter';
  g.globalAlpha = a; g.strokeStyle = RED; g.lineWidth = 2.8 * (1 - k * 0.4); pentagram(g, r * 0.94);
  g.strokeStyle = EMB; g.lineWidth = 3.2; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  g.globalAlpha = a * 0.8; g.strokeStyle = GLD; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, r * 0.84, 0, TAU); g.stroke();
  g.globalAlpha = a; g.fillStyle = HOT;
  for(let i = 0; i < 10; i++){ const t = i / 10 * TAU; g.save(); g.translate(Math.cos(t) * r * 1.07, Math.sin(t) * r * 1.07); g.rotate(t); g.fillRect(-1.5, -5, 3, 10); g.restore(); }
  g.restore();
}
function drawPortal(g, o){                          /* адский разлом: вертикальная прорезь с огнём */
  const k = clampN(o.t / o.life, 0, 1), a = Math.sin(Math.min(1, k * 1.05) * Math.PI), w = o.w * (0.4 + 0.6 * Math.min(1, o.t / 0.2)), h = o.h * (0.6 + 0.4 * Math.min(1, o.t / 0.2));
  g.save(); g.translate(o.x, o.y - h * 0.55);
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(0, 0, 2, 0, 0, h); gr.addColorStop(0, 'rgba(255,240,208,0.95)'); gr.addColorStop(0.3, 'rgba(255,193,74,0.75)'); gr.addColorStop(0.65, 'rgba(196,18,42,0.6)'); gr.addColorStop(1, 'rgba(58,6,16,0)');
  g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, w, h * 0.55, 0, 0, TAU); g.fill();
  g.strokeStyle = EMB; g.lineWidth = 2.6; g.shadowColor = RED; g.shadowBlur = 14; g.globalAlpha = a * 0.9; g.beginPath(); g.ellipse(0, 0, w, h * 0.55, 0, 0, TAU); g.stroke();
  g.shadowBlur = 0;
  for(let i = 0; i < 5; i++){ const q = ((o.t * 1.1 + i / 5) % 1); flameShape(g, Math.sin(i * 2.3 + o.t * 3) * w * 0.55, h * 0.45 - q * h * 0.9, 4 + 5 * (1 - q), a * (1 - q)); }
  g.restore();
}
function mzDrawGround(){
  if(!MZ.list.length) return;
  const g = ctx; g.save();
  for(const o of MZ.list){
    if(o.t < 0 || o.k !== 'sigil') continue;
    if(!visible(o.x, o.y, (o.r1 || 120) + 100)) continue;
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; drawSigil(g, o);
  }
  g.restore();
}
function jagged(g, x1, y1, x2, y2, seed){            /* нейронная молния между героем и дроном */
  const n = 8, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
  g.beginPath(); g.moveTo(x1, y1);
  for(let i = 1; i < n; i++){ const f = i / n, j = Math.sin(seed * 12.9 + i * 78.2) * 11 * Math.sin(f * Math.PI); g.lineTo(x1 + dx * f + nx * j, y1 + dy * f + ny * j); }
  g.lineTo(x2, y2); g.stroke();
}
function mzDrawTop(){
  const g = ctx;
  /* связь героя с дроном */
  if(typeof units !== 'undefined' && fxLv() < 3){
    for(const u of units){
      if(!isMADrone(u) || u.dead || u.owner.dead) continue;
      if(!visible(u.x, u.y, 260) && !visible(u.owner.x, u.owner.y, 260)) continue;
      const seed = Math.floor((typeof gameTime === 'number' ? gameTime : 0) * 14);
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.shadowColor = RED; g.shadowBlur = 10;
      g.strokeStyle = RED; g.globalAlpha = 0.7; g.lineWidth = 2.2; jagged(g, u.owner.x, u.owner.y - 34, u.x, u.y - 12, seed);
      g.strokeStyle = HOT; g.globalAlpha = 0.55; g.lineWidth = 1; jagged(g, u.owner.x, u.owner.y - 34, u.x, u.y - 12, seed + 0.37);
      g.restore();
    }
  }
  if(!MZ.list.length) return;
  g.save();
  for(const o of MZ.list){
    if(o.t < 0 || o.k === 'sigil') continue;
    if(!visible(o.x, o.y, (o.h || 160) + 100)) continue;
    const k = clampN(o.t / o.life, 0, 1);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    switch(o.k){
      case 'spark': { const a = Math.min(1, (1 - k) * 2.2) * (0.6 + 0.4 * Math.sin(o.t * 12 + o.x)); g.globalCompositeOperation = 'lighter'; g.fillStyle = o.col;
        g.globalAlpha = a * 0.3; g.beginPath(); g.arc(o.x, o.y - o.z, o.size * 1.8, 0, TAU); g.fill();
        g.globalAlpha = a; g.beginPath(); g.arc(o.x, o.y - o.z, o.size * (1 - k * 0.5) * 0.8, 0, TAU); g.fill(); break; }
      case 'shard': { const a = Math.min(1, (1 - k) * 2.5), s = o.size; g.save(); g.translate(o.x, o.y - o.z); g.rotate(o.rot);
        g.globalAlpha = a; g.fillStyle = o.col; g.beginPath(); g.moveTo(0, -s * 1.5); g.lineTo(s * 0.7, 0); g.lineTo(0, s * 1.1); g.lineTo(-s * 0.7, 0); g.closePath(); g.fill();
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.7; g.strokeStyle = EMB; g.lineWidth = 1.2; g.stroke(); g.restore(); break; }
      case 'skull': { const a = Math.sin(Math.min(1, k * 1.1) * Math.PI) * 0.85; g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = RED; g.shadowBlur = 10; g.globalAlpha = a; g.fillStyle = '#ffd6c8';
        skullShape(g, o.x, o.y - o.z, o.size * (0.8 + 0.3 * k)); g.restore(); break; }
      case 'flame': { g.globalCompositeOperation = 'lighter'; flameShape(g, o.x, o.y - o.z, o.size * (1 - k * 0.45), (1 - k) * 0.9); break; }
      case 'wisp': { const a = Math.sin(k * Math.PI); g.globalCompositeOperation = 'lighter'; g.fillStyle = o.col; g.globalAlpha = a * 0.35; g.beginPath(); g.arc(o.x, o.y - o.z, 9, 0, TAU); g.fill();
        g.globalAlpha = a; g.fillStyle = HOT; g.beginPath(); g.arc(o.x, o.y - o.z, 3, 0, TAU); g.fill(); break; }
      case 'pillar': { const a = Math.sin(k * Math.PI), w = o.w * (0.6 + 0.4 * a), gr = g.createLinearGradient(0, o.y, 0, o.y - o.h);
        gr.addColorStop(0, 'rgba(255,193,74,0.9)'); gr.addColorStop(0.45, 'rgba(255,60,40,0.55)'); gr.addColorStop(1, 'rgba(58,6,16,0)');
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = gr; g.fillRect(o.x - w / 2, o.y - o.h, w, o.h);
        g.fillStyle = HOT; g.globalAlpha = a * 0.55; g.fillRect(o.x - w * 0.12, o.y - o.h * 0.9, w * 0.24, o.h * 0.9);
        for(let i = 0; i < 3; i++){ const q = ((o.t * 1.4 + i / 3) % 1); flameShape(g, o.x + Math.sin(i * 3 + o.t * 6) * w * 0.3, o.y - q * o.h * 0.55, 8, a * (1 - q)); }
        break; }
      case 'spike': { const a = Math.sin(Math.min(1, k * 1.15) * Math.PI), h = o.h * (0.3 + 0.9 * Math.sin(k * Math.PI)), w = o.w;
        g.globalAlpha = a * 0.95; g.fillStyle = o.col;
        g.beginPath(); g.moveTo(o.x - w, o.y); g.lineTo(o.x - w * 0.15, o.y - h); g.lineTo(o.x + w, o.y); g.closePath(); g.fill();
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.6; g.strokeStyle = RED; g.lineWidth = 1.6; g.beginPath(); g.moveTo(o.x - w, o.y); g.lineTo(o.x - w * 0.15, o.y - h); g.lineTo(o.x + w, o.y); g.stroke();
        g.fillStyle = EMB; g.globalAlpha = a * 0.7; g.beginPath(); g.arc(o.x - w * 0.15, o.y - h, 2.4, 0, TAU); g.fill(); break; }
      case 'portal': drawPortal(g, o); break;
    }
  }
  g.restore();
}

/* ---------- подключение к циклу и отрисовке ---------- */
try { const _t = fx973Tick; fx973Tick = function(dt){ _t.apply(this, arguments); try { mzTick(dt); } catch(err) { warn('tick', err); } }; } catch(err) { warn('hookTick', err); }
try { const _dw = drawWards; drawWards = function(){ _dw.apply(this, arguments); try { mzDrawGround(); } catch(err) { warn('ground', err); } }; } catch(err) { warn('hookGround', err); }
try { const F = G.__fx973; if(F){ const _d0 = F.drawWorld; F.drawWorld = function(){ _d0.apply(this, arguments); try { mzDrawTop(); } catch(err) { warn('top', err); } }; } } catch(err) { warn('hookTop', err); }

/* ---------- цвет эффектов скиллов ---------- */
try { const _sfc = skillFxColor;
  G.skillFxColor = skillFxColor = function(hero, skillId){ if(isMA(hero) && /mo3gi|drone|mine|bike/i.test(String(skillId))) return '#ff3b4e'; return _sfc.apply(this, arguments); }; } catch(err) { warn('color', err); }

/* ---------- Q / G «Боевой дрон»: адский разлом, пентаграмма, нейронная связь ---------- */
try { const _sd = spawnMo3giDrone;
  G.spawnMo3giDrone = spawnMo3giDrone = function(hero){
    const old = (typeof mo3giDroneOf === 'function') ? mo3giDroneOf(hero) : null;
    const d = _sd.apply(this, arguments);
    try {
      if(d && isMA(hero) && d !== old && !d._mzBorn){
        d._mzBorn = true;
        MZ.sigil(hero.x, hero.y + 6, 18, 130, 0.9, {glow:true});
        MZ.portal(d.x, d.y + 8, 1.0, {h:100, w:36});
        MZ.pillar(d.x, d.y + 4, 30, 210, 0.6);
        MZ.embers(hero.x, hero.y - 10, 12, {spread:16}); MZ.embers(d.x, d.y - 10, 14, {spread:14});
        MZ.shards(d.x, d.y - 14, 8); MZ.skulls(d.x, d.y, 3, {spread:14});
        fxBeam(hero.x, hero.y - 34, d.x, d.y - 14, RED, 0.5); fxBeam(hero.x, hero.y - 34, d.x, d.y - 14, HOT, 0.25);
        fxRing(d.x, d.y, 84, RED, 0.55);
        addText(hero.x, hero.y - 90, 'ВЫПУСКАЮ МОЗГИ', RED, 1.2, 16); gsnd('mzRumble', hero.x, hero.y, 0.8);
      }
    } catch(err) { warn('Q', err); }
    return d;
  }; } catch(err) { warn('spawnDrone', err); }

/* ---------- взрыв дрона: пентаграмма на всю область, столбы огня, шипы, череп-призраки ---------- */
try { const _ed = explodeMo3giDrone;
  G.explodeMo3giDrone = explodeMo3giDrone = function(drone){
    const arc = !!(drone && !drone.dead && isMA(drone.owner));
    const x = drone && drone.x, y = drone && drone.y, lvl = (drone && drone.droneLevel) || 1;
    const res = _ed.apply(this, arguments);
    if(!arc) return res;
    try {
      const R = 160 + lvl * 20;
      MZ.sigil(x, y + 6, 20, R * 1.15, 1.3, {glow:true, spin:0.9}); MZ.sigil(x, y + 6, 14, R * 0.7, 0.9, {spin:-1.6});
      MZ.pillar(x, y + 4, 70, 480, 0.8);
      for(let i = 0; i < 6; i++){ const ang = i / 6 * TAU; MZ.pillar(x + Math.cos(ang) * R * 0.78, y + 4 + Math.sin(ang) * R * 0.78 * 0.62, 32, 340, 0.75, {delay:0.04 * i}); }
      MZ.spikes(x, y, 14, R * 0.95, {h0:55, h1:110, dly:0.3}); MZ.burst(x, y - 10, true); MZ.shards(x, y - 20, 16, {s0:100, s1:340});
      MZ.embers(x, y - 10, 24, {spread:30, v0:80, v1:260}); MZ.skulls(x, y, 7, {spread:R * 0.6, dly:0.4}); MZ.flame(x, y, 12, {spread:R * 0.5});
      fxRing(x, y, R * 1.25, EMB, 0.75); fxRing(x, y, R * 0.85, '#ff3b4e', 0.6);
      addText(x, y - 100, 'МОЗГОВОЙ ВЗРЫВ', EMB, 1.2, 18); gsnd('mzBoom', x, y, 1.0); shake(5, 0.45);
    } catch(err) { warn('boom', err); }
    return res;
  }; } catch(err) { warn('explodeDrone', err); }

/* ---------- обёртка каста скилла только для героя с арканой ---------- */
function wrapCast(id, fn){
  const sk = SKILLS[id]; if(!sk || typeof sk.cast !== 'function') return;
  const orig = sk.cast;
  sk.cast = function(h){
    if(!isMA(h)) return orig.apply(this, arguments);
    return fn(orig, this, Array.prototype.slice.call(arguments));
  };
}
/* ---------- W «Дар с небес»: кровавый ритуал, лучи к союзникам, спирали душ ---------- */
wrapCast('mo3giGift', (orig, self, a) => {
  const h = a[0], res = orig.apply(self, a);
  try {
    MZ.sigil(h.x, h.y + 6, 16, 140, 0.9, {glow:true, spin:-1.1}); MZ.embers(h.x, h.y - 10, 10, {spread:14}); MZ.shards(h.x, h.y - 14, 5, {s0:40, s1:130});
    for(let i = 0; i < 6; i++) MZ.add({k:'spark', minor:true, x:h.x + rr(-14, 14), y:h.y + rr(-4, 8), z:rr(30, 60), vx:rr(-14, 14), vy:rr(-6, 6), vz:rr(-30, 20), g:260, size:rr(2.5, 4.5), col:BLD, life:rr(0.6, 1.0)});   /* капли крови — цена ритуала */
    addText(h.x, h.y - 96, 'КРОВАВЫЙ ДАР', RED, 1.1, 16);
    for(const ally of heroes){
      if(ally.team !== h.team || ally.dead) continue;
      if(ally !== h){ fxBeam(h.x, h.y - 30, ally.x, ally.y - 30, RED, 0.5); fxBeam(h.x, h.y - 30, ally.x, ally.y - 30, VIO, 0.3); }
      MZ.wisps(ally.x, ally.y, 7, {r:46}); MZ.sigil(ally.x, ally.y + 6, 12, 80, 0.7, {spin:1.4, minor:true}); MZ.pillar(ally.x, ally.y + 4, 26, 190, 0.6, {delay:0.05});
      fxRing(ally.x, ally.y, 90, VIO, 0.5);
    }
    gsnd('mzWhisper', h.x, h.y, 0.9);
  } catch(err) { warn('W', err); }
  return res;
});
/* ---------- E «Скрытые мины»: демонический знак, шипы из земли ---------- */
wrapCast('mo3giMines', (orig, self, a) => {
  const h = a[0], n0 = (typeof mo3giMines !== 'undefined') ? mo3giMines.length : 0, res = orig.apply(self, a);
  try {
    if(typeof mo3giMines !== 'undefined' && mo3giMines.length > n0){
      const m = mo3giMines[mo3giMines.length - 1];
      MZ.sigil(m.x, m.y, 8, 62, 0.7, {glow:true, spin:1.6}); MZ.spikes(m.x, m.y, 7, 26, {h0:22, h1:44, dly:0.12}); MZ.embers(m.x, m.y - 4, 6, {spread:8, v0:30, v1:110});
      gsnd('mzRumble', m.x, m.y, 0.4);
    }
  } catch(err) { warn('E', err); }
  return res;
});
try { const _em = explodeMo3giMine;
  G.explodeMo3giMine = explodeMo3giMine = function(mine){
    const arc = !!(mine && !mine.dead && isMA(mine.owner));
    const x = mine && mine.x, y = mine && mine.y, lvl = (mine && mine.level) || 1;
    const res = _em.apply(this, arguments);
    if(!arc) return res;
    try {
      const R = 150 + lvl * 16;
      MZ.sigil(x, y + 6, 14, R * 1.1, 1.0, {glow:true, spin:1.2}); MZ.pillar(x, y + 4, 56, 400, 0.7);
      for(let i = 0; i < 5; i++){ const ang = i / 5 * TAU + 0.3; MZ.pillar(x + Math.cos(ang) * R * 0.7, y + 4 + Math.sin(ang) * R * 0.7 * 0.62, 26, 260, 0.6, {delay:0.04 * i}); }
      MZ.spikes(x, y, 10, R * 0.85, {h0:45, h1:90, dly:0.25}); MZ.burst(x, y - 8, true); MZ.flame(x, y, 10, {spread:R * 0.45}); MZ.skulls(x, y, 4, {spread:R * 0.5});
      fxRing(x, y, R * 1.15, EMB, 0.6);
      gsnd('mzBoom', x, y, 0.8); shake(3, 0.3);
    } catch(err) { warn('mineBoom', err); }
    return res;
  }; } catch(err) { warn('explodeMine', err); }
/* знак мины, видимый владельцу (вызывается из game.js вместо зелёной мины) */
G.drawMo3giArcanaMine = function(mine){
  try {
    const tm = (typeof gameTime === 'number' ? gameTime : 0), pul = 0.5 + 0.5 * Math.sin(tm * 6 + mine.x);
    ctx.save(); ctx.translate(mine.x, mine.y); ctx.scale(1, 0.62); ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = RED; ctx.shadowBlur = 14; ctx.globalAlpha = 0.5 + pul * 0.4;
    ctx.fillStyle = 'rgba(120,10,25,0.5)'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.fill();
    ctx.rotate(tm * 0.8); ctx.strokeStyle = RED; ctx.lineWidth = 2; pentagram(ctx, 15);
    ctx.strokeStyle = EMB; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 17, 0, TAU); ctx.stroke();
    ctx.restore();
  } catch(err) { warn('mine', err); }
};
/* ---------- R «Военный байк»: адское воспламенение ---------- */
wrapCast('mo3giBike', (orig, self, a) => {
  const h = a[0], res = orig.apply(self, a);
  try {
    MZ.sigil(h.x, h.y + 6, 18, 150, 1.0, {glow:true, spin:1.4}); MZ.sigil(h.x, h.y + 6, 12, 100, 0.7, {spin:-2.2});
    MZ.pillar(h.x, h.y + 4, 64, 420, 0.8);
    for(let i = 0; i < 6; i++){ const ang = i / 6 * TAU; MZ.pillar(h.x + Math.cos(ang) * 105, h.y + 4 + Math.sin(ang) * 105 * 0.62, 26, 250, 0.6, {delay:0.05 * i}); }
    MZ.spikes(h.x, h.y, 12, 125, {h0:40, h1:85, dly:0.25}); MZ.flame(h.x, h.y, 14, {spread:50}); MZ.burst(h.x, h.y - 10, true); MZ.skulls(h.x, h.y, 4, {spread:70});
    fxRing(h.x, h.y, 190, EMB, 0.7); fxRing(h.x, h.y, 120, RED, 0.5);
    addText(h.x, h.y - 100, 'АДСКИЙ БАЙК', EMB, 1.3, 18); gsnd('mzBoom', h.x, h.y, 0.9); shake(4, 0.4);
  } catch(err) { warn('R', err); }
  return res;
});
/* огненные колёса и кровавый бак на самом байке */
try { const _bike = drawMilitaryBike;
  G.drawMilitaryBike = drawMilitaryBike = function(u, footY){
    const dir = _bike.apply(this, arguments);
    try {
      if(!isMA(u) || fxLv() >= 3) return dir;
      const sc = u.radius / 22, bob = u.moving ? Math.sin(gameTime * 28) * 0.8 : 0, tm = gameTime, d = dir || 1;
      ctx.save(); ctx.translate(0, footY + bob * sc); ctx.scale(d * sc, sc); ctx.globalCompositeOperation = 'lighter';
      for(const cx of [-37, 38]){
        const gr = ctx.createRadialGradient(cx, -17, 4, cx, -17, 30); gr.addColorStop(0, 'rgba(255,193,74,0.0)'); gr.addColorStop(0.55, 'rgba(255,90,40,0.38)'); gr.addColorStop(1, 'rgba(196,18,42,0)');
        ctx.globalAlpha = 0.9; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, -17, 30, 0, TAU); ctx.fill();
        ctx.strokeStyle = EMB; ctx.shadowColor = RED; ctx.shadowBlur = 10; ctx.lineWidth = 2.4; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(cx, -17, 18, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
        for(let i = 0; i < 7; i++){ const an = tm * 7 + i / 7 * TAU, fx = cx + Math.cos(an) * 20, fy = -17 + Math.sin(an) * 20;
          ctx.save(); ctx.translate(fx, fy); ctx.rotate(an + Math.PI / 2); flameShape(ctx, 0, 0, 5.5, 0.85); ctx.restore(); }
      }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.72;                 /* бак и заднее оперение цвета крови */
      ctx.fillStyle = '#7a0a1c'; ctx.beginPath(); ctx.moveTo(-8, -31); ctx.quadraticCurveTo(10, -42, 30, -36); ctx.quadraticCurveTo(36, -30, 32, -22); ctx.quadraticCurveTo(24, -12, 10, -12); ctx.quadraticCurveTo(-6, -14, -8, -24); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-50, -26); ctx.lineTo(-12, -22); ctx.lineTo(-10, -11); ctx.lineTo(-20, -9); ctx.lineTo(-42, -17); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(24, -30); ctx.quadraticCurveTo(46, -36, 56, -22); ctx.lineTo(54, -20); ctx.quadraticCurveTo(44, -29, 28, -27); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9; ctx.strokeStyle = RED; ctx.shadowColor = RED; ctx.shadowBlur = 8; ctx.lineWidth = 1.4;   /* пентаграмма на баке */
      ctx.save(); ctx.translate(14, -24); pentagram(ctx, 6.5); ctx.restore();
      ctx.shadowBlur = 0; ctx.fillStyle = HOT; ctx.globalAlpha = 0.9; ctx.fillRect(34, -37, 3, 3);   /* фара горит белым */
      ctx.restore();
    } catch(err) { warn('bike', err); }
    return dir;
  }; } catch(err) { warn('drawBike', err); }

/* ---------- атака: адский сгусток ---------- */
try { const _sp = spawnProjectile;
  G.spawnProjectile = spawnProjectile = function(x, y, target, dmg, source){
    const p = _sp.apply(this, arguments);
    try {
      const o = projectileOwner(p);
      if(p && !p.isSpell && !p.kind && isMA(o)){
        p.mzBolt = true; p.color = EMB; p.radius = Math.max(p.radius || 7, 8);
        const fx = x + Math.cos(o.facing || 0) * 40, fy = y + Math.sin(o.facing || 0) * 40;
        fxRing(fx, fy, 26, RED, 0.2); MZ.embers(fx, fy - 6, 5, {spread:5, v0:30, v1:110}); MZ.flame(fx, fy, 2, {spread:4}); spawnParticles(fx, fy, GLD, 4, 0.6);
        MZ.proj.push(p); gsnd('mzWhisper', x, y, 0.25);
      }
    } catch(err) { warn('proj', err); }
    return p;
  }; } catch(err) { warn('spawnProjectile', err); }
function drawBolt(p){
  const r = Math.max(8, p.radius || 8), a = typeof projectileHeading === 'function' ? projectileHeading(p) : 0, tm = gameTime * 12;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = RED; ctx.shadowBlur = 20; ctx.globalAlpha = 0.25; ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(0, 0, r * 2.6, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
  for(let k = 0; k < 3; k++){                          /* языки пламени позади */
    ctx.save(); ctx.translate(-r * (1.1 + k * 0.9), Math.sin(tm + k * 1.9) * r * 0.5); ctx.rotate(-Math.PI / 2);
    flameShape(ctx, 0, 0, r * (0.62 - k * 0.12), 0.85 - k * 0.2); ctx.restore();
  }
  const gr = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 1.2); gr.addColorStop(0, '#fff0d0'); gr.addColorStop(0.35, GLD); gr.addColorStop(0.75, EMB); gr.addColorStop(1, 'rgba(196,18,42,0)');
  ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r * 1.2, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#240308'; ctx.beginPath(); ctx.arc(r * 0.1, 0, r * 0.45, 0, TAU); ctx.fill();   /* тёмное ядро */
  ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = RED; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(r * 0.18, 0, r * 0.18, 0, TAU); ctx.fill();
  ctx.restore();
}
try { const _dtp = drawThemedProjectile;
  G.drawThemedProjectile = drawThemedProjectile = function(p){
    if(p && p.mzBolt && !p.kind){ try { drawBolt(p); return true; } catch(err) { warn('bolt', err); } }
    return _dtp.apply(this, arguments);
  }; } catch(err) { warn('drawProj', err); }
try { const _dat = drawAttackTrail;
  G.drawAttackTrail = drawAttackTrail = function(p){
    if(!(p && p.mzBolt)) return _dat.apply(this, arguments);
    try {
      if(fxLv() >= 3) return;
      const h = p.hist || (p.hist = []), last = h[h.length - 1];
      if(!last || Math.hypot(p.x - last[0], p.y - last[1]) > 5){ h.push([p.x, p.y]); const mx = (typeof ATK_TRAIL !== 'undefined' && ATK_TRAIL[fxLv()]) || 8; while(h.length > mx) h.shift(); }
      if(h.length < 2) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const n = h.length, rad = Math.max(4, p.radius || 8);
      for(let i = 1; i <= n; i++){ const f = i / n, x1 = i < n ? h[i][0] : p.x, y1 = i < n ? h[i][1] : p.y, w = Math.sin(gameTime * 13 + i * 1.7) * rad * 0.2 * (1 - f);
        ctx.globalAlpha = f * 0.6; ctx.strokeStyle = f > 0.6 ? GLD : RED; ctx.lineWidth = Math.max(1.5, rad * 1.0 * f);
        ctx.beginPath(); ctx.moveTo(h[i - 1][0], h[i - 1][1] + w); ctx.lineTo(x1, y1 + w); ctx.stroke();
        if(fxLv() < 2 && i % 3 === 0){ ctx.save(); ctx.translate(h[i - 1][0] + Math.sin(gameTime * 9 + i) * rad * 0.8, h[i - 1][1]); flameShape(ctx, 0, 0, 2 + f * 3, f * 0.9); ctx.restore(); }
      }
      ctx.restore();
    } catch(err) { warn('trail', err); }
  }; } catch(err) { warn('trail', err); }

/* ---------- аура у ног героя (вызывается из game.js вместе с аурами других арканов) ---------- */
G.drawMo3giArcanaAura = function(u){
  try {
    if(!isMA(u) || u.dead) return;
    const base = (u.radius || 28) + 8, tm = (typeof gameTime === 'number' ? gameTime : 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'miter'; ctx.translate(0, 8); ctx.scale(1, 0.62);
    ctx.save(); ctx.rotate(-tm * 0.45);                          /* пентаграмма */
    ctx.strokeStyle = RED; ctx.shadowColor = RED; ctx.shadowBlur = 14; ctx.globalAlpha = 0.85; ctx.lineWidth = 2.2; pentagram(ctx, base + 16);
    ctx.restore();
    ctx.shadowBlur = 10; ctx.strokeStyle = EMB; ctx.lineWidth = 2.6; ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.arc(0, 0, base + 16, 0, TAU); ctx.stroke();
    ctx.strokeStyle = GLD; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.5; ctx.setLineDash([6, 8]); ctx.lineDashOffset = tm * 18; ctx.beginPath(); ctx.arc(0, 0, base + 26, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.shadowBlur = 8;
    for(let i = 0; i < 8; i++){                                  /* шипы-рога по кругу */
      const a = i / 8 * TAU - tm * 0.3, fl = 0.5 + 0.5 * Math.sin(tm * 3 + i * 2.1), hgt = (16 + fl * 12) / 0.62, w = 4.5, bx = Math.cos(a) * (base + 12), by = Math.sin(a) * (base + 12);
      ctx.globalAlpha = 0.75; ctx.fillStyle = i % 2 ? BLD : '#7a0a1c';
      ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.lineTo(bx - w * 0.1, by - hgt); ctx.lineTo(bx + w, by); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.5; ctx.fillStyle = EMB; ctx.beginPath(); ctx.arc(bx - w * 0.1, by - hgt, 2, 0, TAU); ctx.fill();
    }
    for(let i = 0; i < 6; i++){                                  /* огненные языки по орбите */
      const a = i / 6 * TAU + tm * 1.1, fl = 0.5 + 0.5 * Math.sin(tm * 8 + i * 1.7), px = Math.cos(a) * (base + 32), py = Math.sin(a) * (base + 32);
      ctx.save(); ctx.translate(px, py); ctx.scale(1, 1 / 0.62); flameShape(ctx, 0, 0, 4 + fl * 2.6, 0.6 + fl * 0.4); ctx.restore();
    }
    ctx.restore();
  } catch(err) { warn('aura', err); }
};
})();
