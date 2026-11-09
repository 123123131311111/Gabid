/* DotaSense 0.10.7.1 — АРКАНЫ СНАЙПЕРА И ПСИХА: БОЛЬШЕ ЭФФЕКТОВ И КРАСОТЫ.
   Только визуал: урон, радиусы, перезарядки и механики не меняются.
   Снайпер «Пламенный стрелок»:
     • атака — длинная вспышка из дула, огненный шлейф пули, взрыв с выжженным пятном, искрами и дымом;
     • Shrapnel — выжженная зона с вращающимися рунами, лавовыми трещинами, пульсирующими волнами и языками пламени по краю;
     • Take Aim — вращающийся огненный прицел под героем и столб пламени при активации;
     • Assassinate — лазерный луч до цели, сжимающееся перекрестие, огненная комета с длинным хвостом и огромный взрыв
       (ударные кольца, столб огня, вспышка экрана, тряска);
     • у ног героя — лавовое пятно и тлеющие угли.
   Псих «Бриллиантовый кошмар»:
     • атака — радужные лучи, осколки и ударное кольцо;
     • Q / E / R / T — кристальные шипы из земли, ромбовидная решётка на земле, ударные волны, световые столбы и лучи;
     • у ног героя и его копий — сияющая восьмиконечная звезда, радужные лучи и кристаллическая корона.
   Подключается после update01069.js (использует слои update0102/update974: fx973Tick, drawWards, __fx973.drawWorld). */
(function(){
'use strict';
const G = window, TAU = Math.PI * 2;
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update01071 ' + tag + ':', err); } catch(e) {} } };
const rr = (a, b) => a + Math.random() * (b - a);
const c01 = v => v < 0 ? 0 : (v > 1 ? 1 : v);
const ease3 = k => 1 - Math.pow(1 - c01(k), 3);
const fxLv = () => (typeof fxl === 'function' ? fxl() : 0);          /* 0 — всё, 1 — без украшений, 2 — минимум, 3 — выкл */
const isLite = () => (typeof perfLite === 'function' && perfLite());
const detail = () => isLite() ? 0.3 : (fxLv() >= 2 ? 0.45 : (fxLv() >= 1 ? 0.75 : 1));
const nOf = n => Math.max(1, Math.round(n * detail()));
const gt = () => (typeof gameTime === 'number' ? gameTime : 0);
const vis = (x, y, p) => { try { return typeof isWorldPointVisible === 'function' ? isWorldPointVisible(x, y, p || 160) : true; } catch(e) { return true; } };
const bs = id => id ? String(id).split('+')[0] : null;
const isSn = u => !!(u && u.def && u.def.id === 'sniper' && bs(u.skinId) === 'sniperInferno');
const isPs = u => { try { const F = G.__psihFx; return !!(F && F.isArcana(u)); } catch(e) { return false; } };
const FIRE = ['#ff3d12', '#ff7a1c', '#ffb02e', '#ffe27a'];
const GEM = ['#ffffff', '#8fe8ff', '#e8f8ff', '#c9b8ff'];
const RAINBOW = ['rgba(143,232,255,', 'rgba(232,248,255,', 'rgba(201,184,255,', 'rgba(255,209,240,'];
const hiddenFromPlayer = u => !!(u && u.team !== 0 && typeof isVisibleToPlayer === 'function' && !isVisibleToPlayer(u));

/* ---------- звуки ---------- */
try {
  if(typeof SFX_PRESETS !== 'undefined') Object.assign(SFX_PRESETS, {
    sniperBoom: {from:240, to:36, duration:0.95, type:'sawtooth', volume:0.075, noise:0.9, layers:[[90, 30, 0, 0.85, 'sine', 0.13], [1500, 220, 0, 0.22, 'square', 0.02]]},
    sniperWhoosh: {from:1000, to:240, duration:0.22, type:'sawtooth', volume:0.028, noise:0.8, layers:[[2200, 600, 0, 0.14, 'triangle', 0.015]]}
  });
} catch(err) { warn('presets', err); }
const sfx = (k, x, y, v) => {
  try {
    const p = (typeof playerHero !== 'undefined' && playerHero && !playerHero.dead) ? playerHero : (typeof cam !== 'undefined' ? cam : null);
    let vol = v == null ? 1 : v;
    if(p){ const d = 1 - Math.hypot(x - p.x, y - p.y) / 1700; if(d <= 0.06) return; vol *= Math.pow(d, 1.1); }
    playSynthSfx(k, {volume: vol});
  } catch(e) {}
};
const shake = (m, d) => { const F = G.__fx973; if(F && fxLv() < 2){ F.shakeMag = Math.max(F.shakeMag, m); F.shakeT = F.shakeDur = d; } };
const flash = (c, a, d) => { const F = G.__fx973; if(F && fxLv() < 2){ F.flash = c; F.flashA = a; F.flashT = F.flashDur = d; } };
const nearView = (x, y, R) => { const p = (typeof cam !== 'undefined' && cam) ? cam : null; return p ? Math.hypot(x - p.x, y - p.y) < R : true; };

/* ---------- слои частиц: g — земля (до юнитов), t — верх (после юнитов) ---------- */
const FX = {g: [], t: [], last: 0};
const cap = () => isLite() ? 70 : (fxLv() >= 2 ? 140 : 420);
function add(layer, o){
  if(fxLv() >= 3) return null;
  const L = FX[layer];
  if(L.length >= cap()){
    const i = L.findIndex(e => e.minor);
    if(i < 0){ if(o.minor) return null; L.shift(); } else L.splice(i, 1);
  }
  o.t = -(o.delay || 0);
  if(o.ph == null) o.ph = Math.random() * TAU;
  if(o.rot == null) o.rot = Math.random() * TAU;
  L.push(o); return o;
}
function stepList(L, dt){
  let w = 0;
  for(let i = 0; i < L.length; i++){
    const o = L[i];
    o.t += dt;
    if(o.t >= 0 && o.vz !== undefined){
      o.vz -= (o.g || 0) * dt; o.z += o.vz * dt;
      const dr = o.drag ? Math.pow(o.drag, dt * 60) : 1;
      if(o.vx){ o.x += o.vx * dt; o.vx *= dr; }
      if(o.vy){ o.y += o.vy * dt; o.vy *= dr; }
      if(o.vr) o.rot += o.vr * dt;
      if(o.z < 0){ if(o.bounce){ o.z = 0; o.vz = Math.abs(o.vz) * 0.3; o.vx *= 0.6; o.vy *= 0.6; } else o.z = 0; }
    }
    if(o.t < o.life) L[w++] = o;
  }
  L.length = w;
}

/* ---------- отрисовка частиц ---------- */
function ringStroke(g, o, k){
  const r = o.r0 + (o.r1 - o.r0) * ease3(k), a = (1 - k) * (o.a == null ? 0.9 : o.a);
  g.globalCompositeOperation = 'lighter';
  g.globalAlpha = a * 0.16; g.fillStyle = o.col; g.beginPath(); g.arc(o.x, o.y, r, 0, TAU); g.fill();
  g.globalAlpha = a; g.strokeStyle = o.col; g.lineWidth = o.th * (1 - k) + 0.8; g.beginPath(); g.arc(o.x, o.y, r, 0, TAU); g.stroke();
  g.globalAlpha = a * 0.7; g.strokeStyle = '#ffffff'; g.lineWidth = Math.max(0.6, (o.th * (1 - k) + 0.8) * 0.35); g.stroke();
}
const GND = {
  wave: ringStroke,
  scorch(g, o, k){                                         /* выжженное пятно */
    const a = (1 - k * k) * (o.a == null ? 0.55 : o.a), r = o.r;
    let gr = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
    gr.addColorStop(0, 'rgba(16,7,4,' + a.toFixed(3) + ')'); gr.addColorStop(0.55, 'rgba(32,13,7,' + (a * 0.7).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(32,13,7,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(o.x, o.y, r, r * 0.82, 0, 0, TAU); g.fill();
    const em = c01(1 - o.t / 2.2) * 0.5;
    if(em > 0.02){
      g.globalCompositeOperation = 'lighter';
      gr = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, r * 0.8);
      gr.addColorStop(0, 'rgba(255,120,34,' + em.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,60,10,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(o.x, o.y, r * 0.8, r * 0.66, 0, 0, TAU); g.fill();
    }
  },
  lattice(g, o, k){                                         /* ромбовидная бриллиантовая решётка */
    const rk = ease3(o.t / (o.grow || 0.45)), r = o.r * rk, a = Math.min(1, (1 - k) * 2.2) * (o.a == null ? 0.85 : o.a);
    if(r < 2 || a <= 0.01) return;
    g.save(); g.translate(o.x, o.y); g.scale(1, 0.7); g.rotate(o.t * (o.spin || 0.35) + Math.PI / 4);
    g.globalCompositeOperation = 'lighter'; g.lineJoin = 'miter';
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, 'rgba(232,248,255,' + (a * 0.22).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(143,232,255,' + (a * 0.04).toFixed(3) + ')');
    g.fillStyle = gr; g.fillRect(-r / 1.414, -r / 1.414, r * 1.414, r * 1.414);
    const cols = ['#8fe8ff', '#e8f8ff', '#c9b8ff'];
    for(let i = 0; i < 3; i++){
      const q = r * (1 - i * 0.17) / 1.414;
      g.globalAlpha = a * (i === 1 ? 0.95 : 0.65); g.strokeStyle = cols[i]; g.lineWidth = i === 1 ? 2 : 3;
      g.strokeRect(-q, -q, q * 2, q * 2);
    }
    g.globalAlpha = a * 0.5; g.strokeStyle = '#ffffff'; g.lineWidth = 1;
    g.beginPath();
    for(let i = 0; i < 8; i++){ const an = i * Math.PI / 4; g.moveTo(0, 0); g.lineTo(Math.cos(an) * r * 0.98, Math.sin(an) * r * 0.98); }
    g.stroke();
    g.restore();
  },
  glow(g, o, k){                                            /* мягкое свечение на земле */
    const a = Math.sin(c01(k) * Math.PI) * (o.a == null ? 0.5 : o.a), r = o.r0 + (o.r1 - o.r0) * ease3(k);
    g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
    gr.addColorStop(0, 'rgba(' + o.col + ',' + a.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + o.col + ',0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(o.x, o.y, r, r * 0.8, 0, 0, TAU); g.fill();
  }
};
const TOP = {
  wave: ringStroke,
  ember(g, o, k){
    const a = c01((1 - k) * 2.2), s = o.size * (1 - k * 0.45), y = o.y - o.z;
    g.globalCompositeOperation = 'lighter'; g.fillStyle = o.col;
    g.globalAlpha = a * 0.28; g.beginPath(); g.arc(o.x, y, s * 2.6, 0, TAU); g.fill();
    g.globalAlpha = a; g.beginPath(); g.arc(o.x, y, s, 0, TAU); g.fill();
    g.fillStyle = '#fff6d6'; g.globalAlpha = a * 0.8; g.beginPath(); g.arc(o.x, y, s * 0.4, 0, TAU); g.fill();
  },
  spark(g, o, k){
    const a = 1 - k, dx = -(o.vx || 0) * 0.05, dy = -((o.vy || 0) - (o.vz || 0)) * 0.05, y = o.y - o.z;
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    g.strokeStyle = o.col; g.globalAlpha = a; g.lineWidth = o.w || 2;
    g.beginPath(); g.moveTo(o.x, y); g.lineTo(o.x + dx, y + dy); g.stroke();
    g.strokeStyle = '#ffffff'; g.globalAlpha = a * 0.7; g.lineWidth = (o.w || 2) * 0.4; g.stroke();
  },
  flame(g, o, k){
    const a = c01((1 - k) * 1.6) * (o.a || 0.85), h = o.h * (1 - k * 0.55) * (0.8 + 0.2 * Math.sin(o.t * 22 + o.ph)), w = o.w * (1 - k * 0.4);
    const x = o.x + Math.sin(o.t * 9 + o.ph) * o.w * 0.18, y = o.y - o.z, sw = Math.sin(o.t * 14 + o.ph) * w * 0.4;
    g.globalCompositeOperation = 'lighter';
    const tongue = (ww, hh, col, al) => {
      g.globalAlpha = al; g.fillStyle = col; g.beginPath(); g.moveTo(x - ww, y);
      g.quadraticCurveTo(x - ww * 0.9, y - hh * 0.55, x + sw * (ww / w), y - hh);
      g.quadraticCurveTo(x + ww * 0.9, y - hh * 0.55, x + ww, y); g.closePath(); g.fill();
    };
    tongue(w, h, o.col, a * 0.75); tongue(w * 0.6, h * 0.72, '#ffb02e', a * 0.8); tongue(w * 0.28, h * 0.45, '#fff3c4', a * 0.9);
  },
  smoke(g, o, k){
    const a = Math.sin(c01(k) * Math.PI) * (o.a || 0.35), r = o.r0 + (o.r1 - o.r0) * ease3(k), y = o.y - o.z;
    const gr = g.createRadialGradient(o.x, y, 0, o.x, y, r);
    gr.addColorStop(0, 'rgba(' + o.col + ',' + a.toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + o.col + ',0)');
    g.fillStyle = gr; g.beginPath(); g.arc(o.x, y, r, 0, TAU); g.fill();
  },
  flare(g, o, k){                                           /* вспышка из дула */
    const a = Math.pow(1 - k, 1.4), L = o.L * (0.5 + 0.5 * ease3(k * 3));
    g.save(); g.translate(o.x, o.y - (o.z || 0)); g.rotate(o.a); g.globalCompositeOperation = 'lighter';
    g.globalAlpha = a * 0.9;
    const gr = g.createLinearGradient(0, 0, L, 0);
    gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(0.4, 'rgba(255,150,40,.8)'); gr.addColorStop(1, 'rgba(255,60,10,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-6, 0); g.lineTo(L * 0.35, -o.w); g.lineTo(L, 0); g.lineTo(L * 0.35, o.w); g.closePath(); g.fill();
    g.strokeStyle = '#fff3c4'; g.lineWidth = 2; g.globalAlpha = a;
    for(let i = -2; i <= 2; i++){ g.beginPath(); g.moveTo(0, 0); g.lineTo(L * (0.9 - Math.abs(i) * 0.15), i * o.w * 0.42); g.stroke(); }
    g.globalAlpha = a * 0.7; g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(0, 0, o.w * 0.55 * (1 - k * 0.4), 0, TAU); g.fill();
    g.restore();
  },
  disc(g, o, k){                                            /* вспышка-ядро */
    const r = o.r0 + (o.r1 - o.r0) * ease3(k), a = Math.pow(1 - k, 1.6) * (o.a == null ? 1 : o.a), y = o.y - (o.z || 0);
    g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(o.x, y, 0, o.x, y, r);
    gr.addColorStop(0, 'rgba(' + o.col + ',' + a.toFixed(3) + ')'); gr.addColorStop(0.5, 'rgba(' + o.col + ',' + (a * 0.4).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + o.col + ',0)');
    g.fillStyle = gr; g.beginPath(); g.arc(o.x, y, r, 0, TAU); g.fill();
  },
  pillar(g, o, k){
    const fade = Math.sin(Math.min(1, k * 1.1) * Math.PI), w = o.w * (1 - k * 0.35) * (0.92 + 0.08 * Math.sin(o.t * 30)), h = o.h * (0.4 + 0.6 * ease3(k * 2));
    g.globalCompositeOperation = 'lighter';
    const lg = g.createLinearGradient(0, o.y, 0, o.y - h);
    lg.addColorStop(0, 'rgba(' + o.col + ',' + (0.75 * fade).toFixed(3) + ')'); lg.addColorStop(0.6, 'rgba(' + o.col + ',' + (0.24 * fade).toFixed(3) + ')'); lg.addColorStop(1, 'rgba(' + o.col + ',0)');
    g.fillStyle = lg; g.beginPath(); g.moveTo(o.x - w, o.y); g.lineTo(o.x - w * 0.35, o.y - h); g.lineTo(o.x + w * 0.35, o.y - h); g.lineTo(o.x + w, o.y); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,' + (0.4 * fade).toFixed(3) + ')'; g.fillRect(o.x - w * 0.12, o.y - h * 0.75, w * 0.24, h * 0.75);
  },
  star(g, o, k){
    const a = Math.sin(k * Math.PI), r = o.size * (0.5 + 0.5 * a);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = o.col || '#ffffff';
    g.save(); g.translate(o.x, o.y - (o.z || 0)); g.rotate(o.t * 1.2);
    g.beginPath(); g.moveTo(0, -r); g.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0); g.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
    g.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0); g.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r); g.fill();
    g.restore();
  },
  gem(g, o, k){                                             /* огранённый бриллиант */
    const a = Math.min(1, (1 - k) * 2.5), sz = o.size;
    g.save(); g.translate(o.x, o.y - o.z); g.rotate(o.rot);
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.35; g.fillStyle = o.col;
    g.beginPath(); g.arc(0, 0, sz * 1.8, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = a; g.fillStyle = o.col;
    g.beginPath(); g.moveTo(0, -sz * 1.3); g.lineTo(sz * 0.8, 0); g.lineTo(0, sz * 1.3); g.lineTo(-sz * 0.8, 0); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,' + (a * 0.85).toFixed(3) + ')'; g.beginPath(); g.moveTo(0, -sz * 1.3); g.lineTo(sz * 0.8, 0); g.lineTo(0, -sz * 0.1); g.closePath(); g.fill();
    g.restore();
  },
  spike(g, o, k){                                           /* кристаллический шип, растущий из земли */
    const grow = ease3(o.t / (o.gr || 0.2)), out = k > 0.65 ? 1 - (k - 0.65) / 0.35 : 1;
    const h = o.h * grow * out, w = o.w * (0.6 + 0.4 * grow) * (k > 0.65 ? out : 1);
    if(h < 1.5) return;
    const x = o.x, y = o.y, tx = x + (o.lean || 0) * h, ty = y - h;
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35 * out; g.fillStyle = o.col;
    g.beginPath(); g.ellipse(x, y, w * 1.7, w * 0.7, 0, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.96 * out;
    g.fillStyle = o.dark || '#4a86c8'; g.beginPath(); g.moveTo(x - w, y); g.lineTo(tx, ty); g.lineTo(x + w * 0.05, y + w * 0.2); g.closePath(); g.fill();
    g.fillStyle = o.col; g.beginPath(); g.moveTo(x + w, y); g.lineTo(tx, ty); g.lineTo(x + w * 0.05, y + w * 0.2); g.closePath(); g.fill();
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = '#ffffff'; g.globalAlpha = 0.65 * out; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(x - w, y); g.lineTo(tx, ty); g.lineTo(x + w, y); g.stroke();
  },
  ray(g, o, k){                                             /* радужный луч */
    const a = Math.sin(c01(k) * Math.PI) * (o.a || 0.9);
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    const gr = g.createLinearGradient(o.x1, o.y1, o.x2, o.y2), af = a.toFixed(3);
    gr.addColorStop(0, RAINBOW[0] + af + ')'); gr.addColorStop(0.35, RAINBOW[1] + af + ')'); gr.addColorStop(0.65, RAINBOW[2] + af + ')'); gr.addColorStop(1, RAINBOW[3] + '0)');
    g.strokeStyle = gr; g.globalAlpha = 0.45; g.lineWidth = o.w * 3; g.beginPath(); g.moveTo(o.x1, o.y1); g.lineTo(o.x2, o.y2); g.stroke();
    g.globalAlpha = 1; g.lineWidth = o.w; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,' + (a * 0.9).toFixed(3) + ')'; g.lineWidth = Math.max(0.8, o.w * 0.35); g.stroke();
  }
};
function drawLayer(g, L, table){
  if(!L.length) return;
  g.save();
  for(const o of L){
    if(o.t < 0) continue;
    const fn = table[o.k]; if(!fn) continue;
    if(!vis(o.x != null ? o.x : o.x1, o.y != null ? o.y : o.y1, (o.r1 || o.h || o.L || o.r || 120) + 140)) continue;
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.lineCap = 'butt'; g.lineJoin = 'miter';
    fn(g, o, c01(o.t / o.life));
  }
  g.restore();
}

/* ---------- генераторы эффектов ---------- */
const wave = (layer, x, y, r0, r1, life, th, col, o) => add(layer, Object.assign({k: 'wave', x, y, r0, r1, life, th, col}, o || {}));
function embers(x, y, n, o){
  if(fxLv() >= 3) return; o = o || {}; n = nOf(n);
  for(let i = 0; i < n; i++){
    const a = Math.random() * TAU, sp = rr(o.s0 || 40, o.s1 || 180);
    add('t', {k: 'ember', minor: true, x: x + Math.cos(a) * rr(0, o.spread || 8), y: y + Math.sin(a) * rr(0, (o.spread || 8) * 0.6), z: o.z0 == null ? 8 : o.z0,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, vz: rr(o.v0 || 70, o.v1 || 260), g: o.g == null ? 380 : o.g, drag: 0.985,
      size: rr(o.sz0 || 2, o.sz1 || 4.5), col: FIRE[(Math.random() * 4) | 0], life: rr(0.6, 1.4)});
  }
}
function sparks(x, y, n, o){
  if(fxLv() >= 3) return; o = o || {}; n = nOf(n);
  for(let i = 0; i < n; i++){
    const a = Math.random() * TAU, sp = rr(o.s0 || 180, o.s1 || 480);
    add('t', {k: 'spark', minor: true, x, y, z: o.z0 == null ? 10 : o.z0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, vz: rr(40, 220), g: 520, drag: 0.98,
      w: rr(1.6, 3), col: FIRE[2 + (i & 1)], life: rr(0.25, 0.55)});
  }
}
function flames(x, y, n, R, o){
  if(fxLv() >= 3) return; o = o || {}; n = nOf(n);
  for(let i = 0; i < n; i++){
    const a = i / n * TAU + Math.random() * 0.5, rad = R * rr(0.85, 1.1);
    add('t', {k: 'flame', minor: true, x: x + Math.cos(a) * rad, y: y + Math.sin(a) * rad * (o.sq == null ? 0.62 : o.sq), z: 0, vz: rr(o.v0 || 30, o.v1 || 90),
      h: rr(o.h0 || 30, o.h1 || 70), w: rr(o.w0 || 8, o.w1 || 15), life: rr(0.45, 0.9), delay: rr(0, o.dly || 0.2), col: FIRE[(Math.random() * 3) | 0]});
  }
}
function smokes(x, y, n, R){
  if(fxLv() >= 2) return; n = nOf(n);
  for(let i = 0; i < n; i++){
    const a = Math.random() * TAU, d = rr(0, R);
    add('t', {k: 'smoke', minor: true, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.6, z: rr(8, 30), vz: rr(18, 50), vx: rr(-10, 10), r0: 14, r1: rr(40, 70), a: 0.34, col: '52,34,26', life: rr(0.9, 1.5)});
  }
}
function gems(x, y, n, o){
  if(fxLv() >= 3) return; o = o || {}; n = nOf(n);
  for(let i = 0; i < n; i++){
    const a = Math.random() * TAU, sp = rr(o.s0 || 60, o.s1 || 220);
    add('t', {k: 'gem', minor: true, x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 4, z: o.z0 == null ? 20 : o.z0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5,
      vz: rr(o.v0 || 100, o.v1 || 280), g: 540, drag: 0.99, bounce: 1, rot: Math.random() * TAU, vr: rr(-8, 8), size: rr(o.sz0 || 3, o.sz1 || 6.5), col: GEM[i % 4], life: rr(0.8, 1.3)});
  }
}
function glints(x, y, n, spread, size){
  if(fxLv() >= 3) return;
  for(let i = 0; i < nOf(n); i++)
    add('t', {k: 'star', minor: true, x: x + rr(-spread, spread), y: y + rr(-spread * 0.5, spread * 0.5), z: rr(10, 60), size: rr(size * 0.6, size), col: i % 2 ? '#ffffff' : '#8fe8ff', life: rr(0.35, 0.7), delay: rr(0, 0.25)});
}
function ringSpikes(x, y, n, R, o){
  if(fxLv() >= 3) return; o = o || {};
  n = Math.max(3, Math.round(n * (fxLv() >= 2 || isLite() ? 0.5 : (fxLv() >= 1 ? 0.8 : 1))));
  for(let i = 0; i < n; i++){
    const a = i / n * TAU + (o.off || 0);
    add('t', {k: 'spike', x: x + Math.cos(a) * R, y: y + Math.sin(a) * R * 0.62, w: rr(o.w0 || 7, o.w1 || 11), h: rr(o.h0 || 40, o.h1 || 75), gr: 0.18, life: o.life || 0.9,
      delay: (o.delay || 0) + i * (o.stag || 0.02), col: i % 2 ? '#e8f8ff' : '#8fe8ff', dark: i % 2 ? '#9fd8ff' : '#4a86c8', lean: rr(-0.15, 0.15)});
  }
}

/* =========================================================
   СНАЙПЕР: ВЗРЫВЫ
   infernoBurst из game.js вызывается из всех мест арканы: по размеру радиуса понимаем, что именно произошло.
   ≤45 — вспышка из дула или попадание обычной пули · ≤100 — Headshot / прицел Assassinate ·
   ≤150 — Take Aim · ≤210 — удар Assassinate · больше — Shrapnel.
   ========================================================= */
function muzzleOwner(x, y){
  if(typeof heroes === 'undefined') return null;
  for(const h of heroes){
    if(!h || h.dead || !isSn(h)) continue;
    if(Math.hypot(x - (h.x + Math.cos(h.facing || 0) * 52), y - (h.y + Math.sin(h.facing || 0) * 52)) < 8) return h;
  }
  return null;
}
function fireBlast(x, y, s){
  const mn = s < 0.8;                                          /* мелкие взрывы обычных пуль можно вытеснять при нехватке места */
  add('t', {k: 'disc', x, y, z: 14 * s, r0: 10 * s, r1: 78 * s, life: 0.3, col: '255,226,150', minor: mn});
  wave('g', x, y, 8 * s, 120 * s, 0.5, 6 * s * 0.55, '#ff7a1c', {minor: mn});
  wave('g', x, y, 6 * s, 84 * s, 0.4, 4 * s * 0.55, '#ffe27a', {delay: 0.06, minor: mn});
  add('g', {k: 'scorch', x, y, r: 36 * s, life: 4.5 + 2.2 * s, minor: mn});
  embers(x, y, 9 * s, {s0: 40, s1: 120 + 80 * s, v0: 70, v1: 160 + 110 * s});
  flames(x, y, 4 * s, 16 * s, {h0: 26 * Math.sqrt(s), h1: 56 * Math.sqrt(s)});
  sparks(x, y, 7 * s);
  smokes(x, y, 2.5 * s, 18 * s);
}
function megaBlast(x, y, R){
  const s = R / 100;
  flash('#ffb066', 0.38, 0.4); shake(11, 0.55);
  add('t', {k: 'disc', x, y, z: 30, r0: 20, r1: R * 1.5, life: 0.4, col: '255,236,180'});
  add('t', {k: 'disc', x, y, z: 10, r0: 30, r1: R * 2.2, life: 0.65, col: '255,120,40', a: 0.7});
  wave('g', x, y, 16, R * 1.15, 0.6, 14, '#ff6a1a');
  wave('g', x, y, 12, R * 1.5, 0.75, 10, '#ffb02e', {delay: 0.07});
  wave('g', x, y, 10, R * 1.85, 0.9, 6, '#ffe27a', {delay: 0.16});
  add('g', {k: 'scorch', x, y, r: R * 0.78, life: 9, a: 0.62});
  add('g', {k: 'glow', x, y, r0: 30, r1: R * 1.1, life: 1.2, col: '255,110,30', a: 0.55});
  add('t', {k: 'pillar', x, y, w: 62, h: 440, life: 0.85, col: '255,150,50'});
  add('t', {k: 'pillar', x, y, w: 30, h: 560, life: 0.65, col: '255,236,180', delay: 0.04});
  add('t', {k: 'star', x, y, z: 60, size: 96, col: '#fff3c4', life: 0.5});
  embers(x, y, 56, {s0: 60, s1: 420, v0: 120, v1: 520, sz1: 6, spread: 24});
  sparks(x, y, 38, {s0: 240, s1: 640});
  flames(x, y, 24, R * 0.55, {h0: 50, h1: 130, w0: 10, w1: 20, dly: 0.3, sq: 0.75});
  smokes(x, y, 9, R * 0.7);
  if(fxLv() < 2) for(let i = 0; i < nOf(18); i++){
    const a = Math.random() * TAU, sp = rr(140, 380);
    add('t', {k: 'gem', minor: true, x, y, z: 24, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, vz: rr(180, 420), g: 560, drag: 0.99, bounce: 1, rot: Math.random() * TAU, vr: rr(-9, 9),
      size: rr(3.5, 7), col: FIRE[(Math.random() * 4) | 0], life: rr(0.8, 1.4)});
  }
  sfx('sniperBoom', x, y, 1.1);
}
function sniperBurst(x, y, r){
  if(fxLv() >= 3 || !vis(x, y, 360)) return;
  if(r <= 45){
    const h = muzzleOwner(x, y);
    if(h){                                                         /* дульная вспышка */
      const hs = !!(h.__a71hs);
      add('t', {k: 'flare', x, y, z: 22, a: h.facing || 0, L: hs ? 150 : 112, w: hs ? 34 : 26, life: 0.17});
      add('t', {k: 'disc', x, y, z: 22, r0: 8, r1: 44, life: 0.16, col: '255,200,110'});
      const fa = h.facing || 0;
      for(let i = 0; i < nOf(7); i++){
        const a = fa + rr(-0.35, 0.35), sp = rr(240, 520);
        add('t', {k: 'spark', minor: true, x, y, z: 22, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.6, vz: rr(-20, 60), g: 120, drag: 0.97, w: rr(1.6, 2.8), col: FIRE[2 + (i & 1)], life: rr(0.18, 0.34)});
      }
      smokes(x, y, 1, 8);
      sfx('sniperWhoosh', x, y, 0.8);
    } else {                                                        /* попадание обычной пули */
      fireBlast(x, y, 0.55);
    }
  } else if(r <= 100){
    fireBlast(x, y, r / 85);
  } else if(r <= 150){                                              /* Take Aim: столб пламени вокруг героя */
    add('t', {k: 'pillar', x, y, w: 46, h: 300, life: 0.8, col: '255,140,40'});
    add('t', {k: 'disc', x, y, z: 30, r0: 14, r1: 120, life: 0.35, col: '255,210,130'});
    wave('g', x, y, 10, 150, 0.55, 8, '#ff7a1c'); wave('g', x, y, 8, 100, 0.45, 5, '#ffe27a', {delay: 0.08});
    add('g', {k: 'glow', x, y, r0: 20, r1: 110, life: 1.0, col: '255,110,30', a: 0.5});
    flames(x, y, 18, 50, {h0: 50, h1: 110, w0: 9, w1: 16, v0: 40, v1: 100, dly: 0.35});
    embers(x, y, 30, {spread: 30, s0: 20, s1: 110, v0: 120, v1: 330});
    sfx('sniperWhoosh', x, y, 1);
  } else if(r <= 210){                                              /* Assassinate: огромный взрыв */
    megaBlast(x, y, r);
  } else {                                                          /* Shrapnel: падение заряда */
    add('t', {k: 'disc', x, y, z: 10, r0: 20, r1: r * 0.9, life: 0.4, col: '255,150,60', a: 0.8});
    wave('g', x, y, 20, r * 1.02, 0.7, 10, '#ff6a1a'); wave('g', x, y, 14, r * 0.7, 0.55, 6, '#ffe27a', {delay: 0.1});
    add('g', {k: 'scorch', x, y, r: r * 0.7, life: 8, a: 0.6});
    flames(x, y, 22, r * 0.96, {h0: 34, h1: 80, w0: 8, w1: 14, dly: 0.5, sq: 0.9});
    embers(x, y, 34, {spread: r * 0.5, s0: 30, s1: 160, v0: 100, v1: 320});
    sparks(x, y, 18, {s0: 140, s1: 380});
    shake(4, 0.3);
    sfx('sniperBoom', x, y, 0.6);
  }
}
try {
  if(typeof infernoBurst === 'function'){
    const _ib = infernoBurst;
    infernoBurst = function(x, y, r){
      const res = _ib.apply(this, arguments);
      try { sniperBurst(x, y, r); } catch(err) { warn('burst', err); }
      return res;
    };
  }
} catch(err) { warn('hookBurst', err); }

/* =========================================================
   СНАЙПЕР: ПОСТОЯННЫЕ ЭФФЕКТЫ (рисуются каждый кадр)
   ========================================================= */
const hasAim = h => !!(h.buffs && h.buffs.some(b => b.id === 'sniperTakeAim'));
function drawShrapnelZone(g, a){
  const R = a.radius, tt = a.t || 0, life = a.life || 7.5;
  const A = Math.min(ease3(tt / 0.35), c01((life - tt) / 0.8));
  if(A <= 0.01) return;
  const hs = i => { const s = Math.sin(i * 127.1 + a.x * 0.013 + a.y * 0.017) * 43758.5453; return s - Math.floor(s); };
  g.save(); g.translate(a.x, a.y);
  let gr = g.createRadialGradient(0, 0, R * 0.1, 0, 0, R);                                /* выжженная земля */
  gr.addColorStop(0, 'rgba(34,12,6,' + (0.5 * A).toFixed(3) + ')'); gr.addColorStop(0.7, 'rgba(34,12,6,' + (0.28 * A).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(34,12,6,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  g.globalCompositeOperation = 'lighter';
  gr = g.createRadialGradient(0, 0, 0, 0, 0, R);                                          /* жар */
  const heat = (0.2 + 0.05 * Math.sin(tt * 5)) * A;
  gr.addColorStop(0, 'rgba(255,120,36,' + heat.toFixed(3) + ')'); gr.addColorStop(0.8, 'rgba(255,70,14,' + (heat * 0.4).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,60,10,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(255,170,60,' + (0.85 * A).toFixed(3) + ')'; g.lineWidth = 3; g.shadowColor = '#ff5a1c'; g.shadowBlur = 12;
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();                                      /* кромка */
  g.shadowBlur = 0; g.strokeStyle = 'rgba(255,226,122,' + (0.5 * A).toFixed(3) + ')'; g.lineWidth = 1.2;
  g.beginPath(); g.arc(0, 0, R * 0.955, 0, TAU); g.stroke();
  g.save(); g.rotate(tt * 0.45);                                                          /* рунное кольцо */
  g.strokeStyle = 'rgba(255,150,50,' + (0.7 * A).toFixed(3) + ')'; g.lineWidth = 1.6;
  g.setLineDash([R * 0.05, R * 0.04]); g.beginPath(); g.arc(0, 0, R * 0.84, 0, TAU); g.stroke(); g.setLineDash([]);
  for(let i = 0; i < 14; i++){
    const an = i / 14 * TAU, rx = Math.cos(an) * R * 0.84, ry = Math.sin(an) * R * 0.84, s = R * 0.032;
    g.save(); g.translate(rx, ry); g.rotate(an + Math.PI / 2);
    g.fillStyle = 'rgba(255,210,110,' + ((0.45 + 0.4 * Math.sin(tt * 4 + i)) * A).toFixed(3) + ')';
    g.beginPath(); g.moveTo(0, -s * 1.6); g.lineTo(s, s); g.lineTo(-s, s); g.closePath(); g.fill();
    g.restore();
  }
  g.restore();
  g.save(); g.rotate(-tt * 0.6);                                                          /* гексаграмма */
  g.strokeStyle = 'rgba(255,190,80,' + (0.65 * A).toFixed(3) + ')'; g.lineWidth = 1.8;
  for(let t2 = 0; t2 < 2; t2++){
    g.beginPath();
    for(let i = 0; i < 3; i++){ const an = i / 3 * TAU + t2 * Math.PI / 3 - Math.PI / 2, px = Math.cos(an) * R * 0.56, py = Math.sin(an) * R * 0.56; if(i) g.lineTo(px, py); else g.moveTo(px, py); }
    g.closePath(); g.stroke();
  }
  g.restore();
  g.strokeStyle = 'rgba(255,110,30,' + (0.7 * A).toFixed(3) + ')'; g.lineWidth = 2;           /* лавовые трещины */
  for(let i = 0; i < 9; i++){
    const base = i / 9 * TAU + hs(i) * 0.5; let px = 0, py = 0;
    g.beginPath(); g.moveTo(0, 0);
    for(let sgm = 1; sgm <= 5; sgm++){
      const rad = R * 0.9 * sgm / 5, an = base + (hs(i * 7 + sgm) - 0.5) * 0.55;
      px = Math.cos(an) * rad; py = Math.sin(an) * rad; g.lineTo(px, py);
    }
    g.stroke();
  }
  const ph = (tt % 0.5) / 0.5;                                                            /* пульсирующая волна */
  g.strokeStyle = 'rgba(255,226,140,' + (0.55 * (1 - ph) * A).toFixed(3) + ')'; g.lineWidth = 4 * (1 - ph) + 1;
  g.beginPath(); g.arc(0, 0, R * (0.15 + 0.8 * ph), 0, TAU); g.stroke();
  g.restore();
}
function drawSniperGround(g, h){
  const tm = gt(), aim = hasAim(h), R0 = h.radius + 6;
  g.save(); g.translate(h.x, h.y + 8); g.scale(1, 0.62); g.globalCompositeOperation = 'lighter';
  const pulse = 0.85 + 0.15 * Math.sin(tm * 6);
  let gr = g.createRadialGradient(0, 0, R0 * 0.3, 0, 0, R0 + (aim ? 64 : 46));            /* лавовое пятно */
  gr.addColorStop(0, 'rgba(255,110,30,' + ((aim ? 0.42 : 0.28) * pulse).toFixed(3) + ')'); gr.addColorStop(0.6, 'rgba(255,70,14,' + ((aim ? 0.2 : 0.12) * pulse).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(255,60,10,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R0 + (aim ? 64 : 46), 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,170,60,0.55)'; g.lineWidth = 1.6; g.setLineDash([7, 6]); g.lineDashOffset = -tm * 14;
  g.beginPath(); g.arc(0, 0, R0 + 18, 0, TAU); g.stroke(); g.setLineDash([]);
  if(aim){                                                                                /* огненный прицел */
    const b = h.buffs.find(x => x.id === 'sniperTakeAim'), fadeA = b ? c01(b.t / 0.6) : 1, R = R0 + 34;
    g.save(); g.rotate(tm * 1.6); g.globalAlpha = fadeA;
    g.strokeStyle = '#ff8a2a'; g.shadowColor = '#ff4a12'; g.shadowBlur = 14; g.lineWidth = 2.6;
    g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
    g.lineWidth = 3.4; g.strokeStyle = '#ffe27a';
    for(let i = 0; i < 4; i++){
      const an = i * Math.PI / 2;
      g.beginPath(); g.moveTo(Math.cos(an) * (R - 12), Math.sin(an) * (R - 12)); g.lineTo(Math.cos(an) * (R + 20), Math.sin(an) * (R + 20)); g.stroke();
    }
    g.rotate(-tm * 3.4); g.lineWidth = 1.8; g.strokeStyle = '#ffb02e';
    g.beginPath(); g.arc(0, 0, R - 18, 0.2, 1.3); g.stroke(); g.beginPath(); g.arc(0, 0, R - 18, Math.PI + 0.2, Math.PI + 1.3); g.stroke();
    g.restore();
  }
  g.restore();
}
function drawGround(g){
  if(fxLv() >= 3) return;
  drawLayer(g, FX.g, GND);
  if(typeof aoes !== 'undefined'){
    for(const a of aoes){
      if(!a || a.dead || !a.shrapnel || !a.inferno || !vis(a.x, a.y, a.radius + 80)) continue;
      try { drawShrapnelZone(g, a); } catch(err) { warn('shrapnel', err); }
    }
  }
  if(typeof heroes !== 'undefined' && !isLite()){
    for(const h of heroes){
      if(!h || h.dead || !vis(h.x, h.y, 200)) continue;
      try {
        if(isSn(h)) drawSniperGround(g, h);
        else if(isPs(h) && !h.invisible) drawPsihGround(g, h);
      } catch(err) { warn('heroGround', err); }
    }
    const PF = G.__psihFx && G.__psihFx.PF;
    if(PF && PF.clones) for(const c of PF.clones){
      if(!c || c.dead || c.emerge || !vis(c.x, c.y, 200)) continue;
      try { if(isPs(c)) drawPsihGround(g, c, 0.7); } catch(err) { warn('cloneGround', err); }
    }
  }
}

/* лазер и перекрестие Assassinate, ореолы пуль */
function drawAim(g, h){
  const T = h.assassinateTarget; if(!T || T.dead) return;
  if(!h.__a71aim) h.__a71aim = gt();
  const tm = gt(), k = c01((tm - h.__a71aim) / 1.25), fa = Math.atan2(T.y - h.y, T.x - h.x);
  const sx = h.x + Math.cos(fa) * 26, sy = h.y - 22 + Math.sin(fa) * 10, ex = T.x, ey = T.y - 14;
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  const flick = 0.75 + 0.25 * Math.sin(tm * 40);
  g.strokeStyle = 'rgba(255,80,20,' + (0.2 + 0.2 * k).toFixed(3) + ')'; g.lineWidth = 16 * flick; g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
  g.strokeStyle = 'rgba(255,150,40,' + (0.55 + 0.3 * k).toFixed(3) + ')'; g.lineWidth = 5; g.stroke();
  g.strokeStyle = 'rgba(255,245,200,0.95)'; g.lineWidth = 1.6; g.stroke();
  const len = Math.hypot(ex - sx, ey - sy);
  for(let i = 0; i < 7; i++){
    const f = ((tm * 1.9 + i / 7) % 1), px = sx + (ex - sx) * f, py = sy + (ey - sy) * f;
    g.fillStyle = i % 2 ? '#ffe27a' : '#ff9a3c'; g.globalAlpha = 0.9 * Math.sin(f * Math.PI);
    g.beginPath(); g.arc(px, py + Math.sin(tm * 20 + i) * 3, 3.2 + (len > 0 ? 0 : 0), 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  g.save(); g.translate(T.x, T.y); g.scale(1, 0.8);                                      /* перекрестие на цели */
  const R = (T.radius || 20) + 26 + 78 * (1 - ease3(k)), rot = tm * 2.2 * (1 + k);
  g.rotate(rot); g.strokeStyle = '#ff7a1c'; g.shadowColor = '#ff3d12'; g.shadowBlur = 14; g.lineWidth = 2.6;
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
  g.strokeStyle = '#ffe27a'; g.lineWidth = 3.4;
  for(let i = 0; i < 4; i++){
    const an = i * Math.PI / 2;
    g.beginPath(); g.moveTo(Math.cos(an) * (R - 16), Math.sin(an) * (R - 16)); g.lineTo(Math.cos(an) * (R + 12), Math.sin(an) * (R + 12)); g.stroke();
  }
  g.rotate(-rot * 2.3); g.lineWidth = 1.8; g.strokeStyle = '#ff4a12';
  g.beginPath(); g.arc(0, 0, R * 0.62, 0.3, 1.9); g.stroke(); g.beginPath(); g.arc(0, 0, R * 0.62, Math.PI + 0.3, Math.PI + 1.9); g.stroke();
  g.restore();
  g.fillStyle = 'rgba(255,240,190,' + (0.5 + 0.5 * k).toFixed(3) + ')'; g.beginPath(); g.arc(T.x, T.y - 14, 4 + 2 * Math.sin(tm * 30), 0, TAU); g.fill();
  g.restore();
}
function drawBullets(g){
  if(typeof projectiles === 'undefined') return;
  for(const p of projectiles){
    if(!p || p.dead || !p.inferno || !vis(p.x, p.y, 160)) continue;
    const big = !!p.assassinate, hs = !!p.headshot;
    let ang = Math.atan2((p.y - (p.prevY == null ? p.y : p.prevY)), (p.x - (p.prevX == null ? p.x : p.prevX)));
    if(!(Math.abs(p.x - (p.prevX == null ? p.x : p.prevX)) + Math.abs(p.y - (p.prevY == null ? p.y : p.prevY)) > 0.01) && p.target) ang = Math.atan2(p.target.y - p.y, p.target.x - p.x);
    const R = big ? 74 : (hs ? 38 : 26), tail = big ? 300 : (hs ? 120 : 80);
    g.save(); g.globalCompositeOperation = 'lighter';
    const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
    gr.addColorStop(0, 'rgba(255,230,160,' + (big ? 0.85 : 0.6) + ')'); gr.addColorStop(0.45, 'rgba(255,120,30,' + (big ? 0.4 : 0.26) + ')'); gr.addColorStop(1, 'rgba(255,60,10,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, R, 0, TAU); g.fill();
    g.lineCap = 'round';
    const tx = p.x - Math.cos(ang) * tail, ty = p.y - Math.sin(ang) * tail;
    const lg = g.createLinearGradient(p.x, p.y, tx, ty);
    lg.addColorStop(0, 'rgba(255,200,100,' + (big ? 0.9 : 0.7) + ')'); lg.addColorStop(1, 'rgba(255,70,15,0)');
    g.strokeStyle = lg; g.lineWidth = big ? 22 : (hs ? 10 : 6); g.globalAlpha = 0.55; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(tx, ty); g.stroke();
    g.globalAlpha = 1; g.lineWidth = big ? 8 : (hs ? 4 : 2.4); g.stroke();
    g.restore();
  }
}
function drawTop(g){
  if(fxLv() >= 3) return;
  drawLayer(g, FX.t, TOP);
  if(isLite()) return;
  if(typeof heroes !== 'undefined') for(const h of heroes){
    if(!h || h.dead || !isSn(h)){ if(h && h.__a71aim) h.__a71aim = 0; continue; }
    if(h.assassinating && h.assassinateTarget){ try { drawAim(g, h); } catch(err) { warn('aim', err); } }
    else if(h.__a71aim) h.__a71aim = 0;
  }
  try { drawBullets(g); } catch(err) { warn('bullets', err); }
}

/* =========================================================
   ПСИХ: ПОСТОЯННАЯ АУРА У НОГ (звезда, лучи, кристаллическая корона)
   ========================================================= */
function drawPsihGround(g, u, sc){
  const tm = gt(), R = (u.radius || 20) + 10, S = sc || 1;
  g.save(); g.translate(u.x, u.y + 8); g.scale(1, 0.62); g.globalCompositeOperation = 'lighter'; g.globalAlpha = S;
  const gr = g.createRadialGradient(0, 0, R * 0.2, 0, 0, R + 46);
  gr.addColorStop(0, 'rgba(143,232,255,0)'); gr.addColorStop(0.55, 'rgba(143,232,255,0.17)'); gr.addColorStop(1, 'rgba(143,232,255,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R + 46, 0, TAU); g.fill();
  g.save(); g.rotate(tm * 0.5); g.lineJoin = 'miter';                                     /* восьмиконечная звезда */
  g.beginPath();
  for(let i = 0; i < 16; i++){ const an = i / 16 * TAU, rad = i % 2 ? R + 12 : R + 36; if(i) g.lineTo(Math.cos(an) * rad, Math.sin(an) * rad); else g.moveTo(Math.cos(an) * rad, Math.sin(an) * rad); }
  g.closePath(); g.fillStyle = 'rgba(143,232,255,0.08)'; g.fill();
  g.strokeStyle = 'rgba(232,248,255,0.6)'; g.lineWidth = 1.6; g.stroke();
  g.restore();
  g.save(); g.rotate(-tm * 0.8); g.lineCap = 'round'; g.lineWidth = 2.2;                  /* радужные лучи */
  for(let i = 0; i < 12; i++){
    const an = i / 12 * TAU, fl = 0.55 + 0.45 * Math.sin(tm * 4 + i * 1.3);
    g.strokeStyle = RAINBOW[i % 4] + (0.28 + 0.4 * fl).toFixed(3) + ')';
    g.beginPath(); g.moveTo(Math.cos(an) * (R + 14), Math.sin(an) * (R + 14)); g.lineTo(Math.cos(an) * (R + 24 + 14 * fl), Math.sin(an) * (R + 24 + 14 * fl)); g.stroke();
  }
  g.restore();
  g.restore();
  g.save(); g.globalAlpha = S;                                                            /* корона из шипов (в экранных координатах) */
  for(let i = 0; i < 8; i++){
    const an = i / 8 * TAU + tm * 0.25, px = u.x + Math.cos(an) * (R + 26), py = u.y + 8 + Math.sin(an) * (R + 26) * 0.62;
    const hgt = 14 + 7 * (0.5 + 0.5 * Math.sin(tm * 3 + i * 1.7)), w = 4.4;
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(143,232,255,0.3)'; g.beginPath(); g.ellipse(px, py, w * 1.8, w * 0.7, 0, 0, TAU); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#4a86c8'; g.beginPath(); g.moveTo(px - w, py); g.lineTo(px, py - hgt); g.lineTo(px, py + 1.5); g.closePath(); g.fill();
    g.fillStyle = i % 2 ? '#e8f8ff' : '#8fe8ff'; g.beginPath(); g.moveTo(px + w, py); g.lineTo(px, py - hgt); g.lineTo(px, py + 1.5); g.closePath(); g.fill();
  }
  g.restore();
}

/* =========================================================
   ТИК: фоновые частицы героев, шлейфы пуль, пламя зон
   ========================================================= */
function sniperAmbient(h, dt){
  const aim = hasAim(h), d = detail();
  h.__a71e = (h.__a71e || 0) - dt;
  if(h.__a71e <= 0){
    h.__a71e = (aim ? 0.05 : 0.11) / d;
    add('t', {k: 'ember', minor: true, x: h.x + rr(-16, 16), y: h.y + rr(-2, 10), z: rr(6, 40), vx: rr(-14, 14), vy: rr(-6, 6), vz: rr(50, 120), g: -20, drag: 0.99,
      size: rr(1.6, 3.4), col: FIRE[(Math.random() * 4) | 0], life: rr(0.7, 1.4)});
  }
  h.__a71f = (h.__a71f || 0) - dt;
  if(h.__a71f <= 0){
    h.__a71f = (aim ? 0.12 : 0.3) / d;
    const a = Math.random() * TAU, rad = (h.radius || 20) + 10;
    add('t', {k: 'flame', minor: true, x: h.x + Math.cos(a) * rad, y: h.y + 8 + Math.sin(a) * rad * 0.62, z: 0, vz: rr(30, 60), h: aim ? rr(34, 56) : rr(22, 38), w: rr(5, 9), life: rr(0.4, 0.7), col: FIRE[(Math.random() * 3) | 0]});
  }
  if(aim){
    h.__a71s = (h.__a71s || 0) - dt;
    if(h.__a71s <= 0){ h.__a71s = 0.3; add('t', {k: 'smoke', minor: true, x: h.x + rr(-12, 12), y: h.y, z: 30, vz: 36, r0: 12, r1: 42, a: 0.22, col: '60,38,28', life: 1.0}); }
  }
  if(h.assassinating && h.assassinateTarget && !h.assassinateTarget.dead){
    const T = h.assassinateTarget;
    h.__a71a = (h.__a71a || 0) - dt;
    if(h.__a71a <= 0){
      h.__a71a = 0.04 / d;
      const a = Math.random() * TAU, rad = (T.radius || 20) + rr(20, 70);
      add('t', {k: 'flame', minor: true, x: T.x + Math.cos(a) * rad, y: T.y + Math.sin(a) * rad * 0.7, z: 0, vz: rr(40, 90), h: rr(30, 60), w: rr(6, 11), life: rr(0.3, 0.6), col: FIRE[(Math.random() * 3) | 0]});
      add('t', {k: 'ember', minor: true, x: h.x + Math.cos(h.facing || 0) * 50, y: h.y, z: 24, vx: rr(-40, 40), vy: rr(-40, 40), vz: rr(20, 100), g: 120, drag: 0.98, size: rr(2, 4), col: FIRE[(Math.random() * 4) | 0], life: rr(0.4, 0.8)});
    }
  }
}
function psihAmbient(h, dt){
  const d = detail();
  h.__a71g = (h.__a71g || 0) - dt;
  if(h.__a71g <= 0){
    h.__a71g = rr(0.12, 0.22) / d;
    const a = Math.random() * TAU, rad = rr(14, 38);
    add('t', {k: 'gem', minor: true, x: h.x + Math.cos(a) * rad, y: h.y + 6 + Math.sin(a) * rad * 0.6, z: rr(4, 20), vx: rr(-8, 8), vy: rr(-4, 4), vz: rr(30, 70), g: -14, drag: 0.99,
      rot: Math.random() * TAU, vr: rr(-3, 3), size: rr(2, 3.8), col: GEM[(Math.random() * 4) | 0], life: rr(0.9, 1.5)});
  }
  h.__a71h = (h.__a71h || 0) - dt;
  if(h.__a71h <= 0){
    h.__a71h = rr(0.35, 0.7) / d;
    add('t', {k: 'star', minor: true, x: h.x + rr(-34, 34), y: h.y + rr(-20, 20), z: rr(10, 60), size: rr(10, 18), col: Math.random() < 0.5 ? '#ffffff' : '#8fe8ff', life: rr(0.4, 0.7)});
  }
}
function tick(dt){
  if(!(dt > 0)) return; if(dt > 0.1) dt = 0.1;
  const now = gt();
  if(now < FX.last - 0.5){ FX.g.length = 0; FX.t.length = 0; }
  FX.last = now;
  if(fxLv() >= 3) return;
  stepList(FX.g, dt); stepList(FX.t, dt);
  if(isLite() || typeof heroes === 'undefined') return;
  const d = detail();
  for(const h of heroes){
    if(!h || h.dead || h.invisible && h.team !== 0 || !vis(h.x, h.y, 220)) continue;
    try {
      if(isSn(h)){ if(!hiddenFromPlayer(h)) sniperAmbient(h, dt); }
      else if(isPs(h) && !h.invisible && !hiddenFromPlayer(h)) psihAmbient(h, dt);
    } catch(err) { warn('ambient', err); }
  }
  const PF = G.__psihFx && G.__psihFx.PF;
  if(PF && PF.clones) for(const c of PF.clones){
    try { if(c && !c.dead && !c.emerge && vis(c.x, c.y, 200) && isPs(c)) psihAmbient(c, dt * 1.6); } catch(err) { warn('cloneAmbient', err); }
  }
  if(typeof aoes !== 'undefined') for(const a of aoes){                                     /* пламя зон Shrapnel */
    if(!a || a.dead || !a.shrapnel || !a.inferno || !vis(a.x, a.y, a.radius + 80)) continue;
    if((a.life || 7.5) - (a.t || 0) < 0.5) continue;
    a.__a71 = (a.__a71 || 0) - dt;
    if(a.__a71 > 0) continue;
    a.__a71 = 0.07 / d;
    const an = Math.random() * TAU, rd = a.radius * (Math.random() < 0.7 ? rr(0.9, 0.99) : Math.sqrt(Math.random()) * 0.9);
    add('t', {k: 'flame', minor: true, x: a.x + Math.cos(an) * rd, y: a.y + Math.sin(an) * rd, z: 0, vz: rr(30, 80), h: rr(30, 62), w: rr(7, 13), life: rr(0.45, 0.85), col: FIRE[(Math.random() * 3) | 0]});
    if(Math.random() < 0.35) add('t', {k: 'ember', minor: true, x: a.x + Math.cos(an) * rd, y: a.y + Math.sin(an) * rd, z: 4, vx: rr(-16, 16), vy: rr(-10, 10), vz: rr(70, 150), g: 40, drag: 0.99, size: rr(1.8, 3.6), col: FIRE[(Math.random() * 4) | 0], life: rr(0.8, 1.4)});
  }
  if(typeof projectiles !== 'undefined') for(const p of projectiles){                         /* огненные шлейфы пуль */
    if(!p || p.dead || !p.inferno || !vis(p.x, p.y, 120)) continue;
    p.__a71 = (p.__a71 || 0) - dt;
    if(p.__a71 > 0) continue;
    const big = !!p.assassinate;
    p.__a71 = (big ? 0.016 : (p.headshot ? 0.03 : 0.05)) / Math.max(0.5, d);
    add('t', {k: 'flame', minor: true, x: p.x + rr(-3, 3), y: p.y + rr(-3, 3), z: big ? 8 : 2, vz: big ? rr(10, 40) : rr(5, 20), h: big ? rr(40, 80) : rr(14, 26), w: big ? rr(10, 16) : rr(4, 7),
      life: big ? rr(0.35, 0.6) : rr(0.2, 0.35), col: FIRE[(Math.random() * 3) | 0]});
    if(big){
      add('t', {k: 'ember', minor: true, x: p.x, y: p.y, z: 8, vx: rr(-60, 60), vy: rr(-60, 60), vz: rr(20, 120), g: 200, drag: 0.98, size: rr(2, 5), col: FIRE[(Math.random() * 4) | 0], life: rr(0.5, 1.0)});
      if(Math.random() < 0.35) add('t', {k: 'smoke', minor: true, x: p.x, y: p.y, z: 6, vz: 20, r0: 10, r1: 40, a: 0.3, col: '60,38,28', life: 0.9});
    }
  }
}

/* =========================================================
   ПСИХ: КАСТЫ И АТАКА
   ========================================================= */
function wrapSkill(id, extra){
  const sk = (typeof SKILLS !== 'undefined') && SKILLS[id];
  if(!sk || typeof sk.cast !== 'function') return;
  const orig = sk.cast;
  sk.cast = function(h, x, y, lvl){
    const pre = {x: h.x, y: h.y};
    const res = orig.apply(this, arguments);
    if(res !== false && isPs(h)){ try { extra(h, pre, lvl, x, y); } catch(err) { warn(id, err); } }
    return res;
  };
}
function psihRays(x, y, n, Lmin, Lmax, w, o){
  o = o || {};
  for(let i = 0; i < nOf(n); i++){
    const a = o.off != null ? o.off + i / n * TAU : Math.random() * TAU, L = rr(Lmin, Lmax);
    add('t', {k: 'ray', minor: !!o.minor, x1: x, y1: y - (o.z || 20), x2: x + Math.cos(a) * L, y2: y - (o.z || 20) + Math.sin(a) * L * 0.6, w, life: o.life || 0.5, delay: o.delay || 0});
  }
}
function shatter(x, y, R){
  add('t', {k: 'disc', x, y, z: 28, r0: 10, r1: R, life: 0.32, col: '200,240,255'});
  glints(x, y - 10, 6, R * 0.35, 22);
}
wrapSkill('psihQ', (h) => {                                      /* Тишина в голове: кристаллическая вспышка */
  const x = h.x, y = h.y;
  add('g', {k: 'lattice', x, y, r: 110, life: 1.3, spin: 0.5});
  wave('g', x, y, 10, 150, 0.55, 6, '#8fe8ff'); wave('g', x, y, 10, 96, 0.45, 4, '#e8f8ff', {delay: 0.07});
  ringSpikes(x, y, 8, 62, {h0: 36, h1: 64, life: 0.85});
  psihRays(x, y, 6, 110, 180, 3, {life: 0.5});
  shatter(x, y, 100); gems(x, y - 24, 10, {s0: 40, s1: 170});
});
wrapSkill('psihE', (h, pre) => {                                 /* Привет сзади: кристальный след и взрыв у жертвы */
  const t = h.attackTarget;
  add('t', {k: 'ray', x1: pre.x, y1: pre.y - 20, x2: h.x, y2: h.y - 20, w: 5, life: 0.45});
  wave('g', pre.x, pre.y, 8, 90, 0.4, 4, '#8fe8ff'); ringSpikes(pre.x, pre.y, 5, 34, {h0: 24, h1: 40, life: 0.6});
  if(t){
    add('g', {k: 'lattice', x: t.x, y: t.y, r: 165, life: 1.6, spin: -0.5});
    wave('g', t.x, t.y, 10, 210, 0.6, 8, '#8fe8ff'); wave('g', t.x, t.y, 8, 130, 0.5, 5, '#e8f8ff', {delay: 0.08});
    ringSpikes(t.x, t.y, 11, 72, {h0: 48, h1: 96, life: 0.95, stag: 0.015});
    add('t', {k: 'pillar', x: t.x, y: t.y + 4, w: 30, h: 280, life: 0.7, col: '200,240,255'});
    psihRays(t.x, t.y, 8, 90, 170, 3.4, {life: 0.55});
    shatter(t.x, t.y, 150); gems(t.x, t.y - 26, 18, {s0: 80, s1: 300, v0: 120, v1: 340});
    if(nearView(t.x, t.y, 900)) flash('#bfeaff', 0.26, 0.3);
  }
  sfx('psihCrystalBig', h.x, h.y, 0.9);
});
wrapSkill('psihR', (h) => {                                      /* Мы — одно целое: гигантская решётка и кристальный круг */
  const x = h.x, y = h.y;
  add('g', {k: 'lattice', x, y, r: 300, life: 4.2, spin: 0.28, grow: 0.7});
  add('g', {k: 'lattice', x, y, r: 190, life: 3.4, spin: -0.4, grow: 0.9, delay: 0.1, a: 0.7});
  add('g', {k: 'glow', x, y, r0: 40, r1: 300, life: 1.6, col: '143,232,255', a: 0.5});
  wave('g', x, y, 14, 300, 0.8, 9, '#8fe8ff'); wave('g', x, y, 12, 380, 0.95, 6, '#e8f8ff', {delay: 0.12}); wave('g', x, y, 10, 450, 1.1, 4, '#c9b8ff', {delay: 0.26});
  ringSpikes(x, y, 16, 170, {h0: 60, h1: 120, w0: 9, w1: 14, life: 1.5, stag: 0.025});
  ringSpikes(x, y, 10, 100, {h0: 36, h1: 70, life: 1.3, delay: 0.3, stag: 0.03, off: 0.3});
  for(let i = 0; i < 3; i++) add('t', {k: 'pillar', x: x + (i - 1) * 40, y: y + 6, w: 26 + (i === 1 ? 14 : 0), h: 340 + (i === 1 ? 160 : 0), life: 0.9, col: '200,240,255', delay: i * 0.06});
  psihRays(x, y, 12, 160, 300, 3.8, {life: 0.7, off: 0});
  shatter(x, y, 240); glints(x, y - 20, 14, 130, 28); gems(x, y - 30, 30, {s0: 80, s1: 380, v0: 140, v1: 380, sz0: 3.5, sz1: 8});
  if(nearView(x, y, 900)){ flash('#c9e8ff', 0.34, 0.45); shake(6, 0.45); }
  sfx('psihCrystalBig', x, y, 1.2);
});
wrapSkill('psihT', (h) => {                                      /* Бошка Ильи */
  const x = h.x, y = h.y;
  wave('g', x, y, 8, 100, 0.45, 4, '#8fe8ff'); ringSpikes(x, y, 6, 40, {h0: 28, h1: 46, life: 0.6});
  psihRays(x, y, 5, 80, 130, 2.8, {life: 0.45}); shatter(x, y, 70);
});
if(typeof atkMeleeSwing === 'function'){
  const _sw = atkMeleeSwing;
  atkMeleeSwing = function(owner, target){
    const r = _sw.apply(this, arguments);
    try {
      if(!target || fxLv() >= 2 || !isPs(owner)) return r;
      const now = gt();
      if(owner.__a71t != null && now - owner.__a71t < 0.12) return r;
      owner.__a71t = now;
      if(hiddenFromPlayer(owner)) return r;
      const x = target.x, y = target.y, lite = isLite();
      wave('g', x, y, 6, 58, 0.3, 4, '#e8f8ff', {minor: true});
      psihRays(x, y, 3, 46, 84, 2.2, {life: 0.32, minor: true, z: 26});
      add('t', {k: 'star', minor: true, x, y, z: 30, size: rr(18, 30), col: '#ffffff', life: 0.35});
      if(!lite){ gems(x, y - 22, 4, {s0: 50, s1: 170}); ringSpikes(x, y, 5, 24, {h0: 18, h1: 32, w0: 4, w1: 6, life: 0.45, stag: 0.01}); }
    } catch(err) { warn('psihAttack', err); }
    return r;
  };
}

/* ---------- подключение к слоям отрисовки ---------- */
try { const _t = fx973Tick; fx973Tick = function(dt){ _t.apply(this, arguments); try { tick(dt); } catch(err) { warn('tick', err); } }; } catch(err) { warn('hookTick', err); }
try { const _dw = drawWards; drawWards = function(){ _dw.apply(this, arguments); try { drawGround(ctx); } catch(err) { warn('ground', err); } }; } catch(err) { warn('hookGround', err); }
try { const F = G.__fx973; if(F){ const _d0 = F.drawWorld; F.drawWorld = function(){ _d0.apply(this, arguments); try { drawTop(ctx); } catch(err) { warn('top', err); } }; } } catch(err) { warn('hookTop', err); }

G.__arcana71 = {FX, add, sniperBurst, megaBlast, fireBlast, ringSpikes, version: '0.10.7.1'};
})();
