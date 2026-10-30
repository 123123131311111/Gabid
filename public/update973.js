/* =========================================================
   DotaSense 0.9.7.3 — «ЗВУК И ОГОНЬ»
   1) главное меню: живой 3D-демон (модель demon3d.js на движке Hero3D), параллакс, огненный передний план;
   2) матч: ~25 новых звуков (удары, башни, лечение, баффы, руны, варды, левел-ап, сердцебиение…);
   3) матч: новые эффекты (искры ударов, руны под кастом, столбы света, трещины, монеты, души,
      тряска экрана, красная виньетка при низком HP, вспышки ульты/уровня, маркеры кликов).
   Всё подключается поверх game.js обёртками — старый код не затронут.
   ========================================================= */
(function(){
'use strict';
const G = window;
const TAU = Math.PI * 2;
const ease = k => 1 - Math.pow(1 - k, 3);
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const safe = fn => (...a) => { try { return fn(...a); } catch(err) { if(!safe.warned){ safe.warned = 1; console.warn('0.9.7.3 fx:', err); } } };

/* ---------------------------------------------------------
   ЗВУКИ: новые пресеты синтезатора (формат тот же, что у SFX_PRESETS)
   --------------------------------------------------------- */
Object.assign(SFX_PRESETS, {
  meleeHit:   {from:260, to:95,  duration:0.08, type:'triangle', volume:0.04,  noise:0.7,  layers:[[1700,700,0,0.05,'sine',0.012]]},
  heavyHit:   {from:140, to:44,  duration:0.22, type:'triangle', volume:0.075, noise:0.95, layers:[[62,30,0,0.28,'sine',0.1],[900,200,0.01,0.1,'sawtooth',0.02]]},
  towerHit:   {from:190, to:75,  duration:0.13, type:'triangle', volume:0.05,  noise:0.8,  layers:[[95,48,0,0.16,'sine',0.07],[2400,900,0,0.04,'square',0.008]]},
  towerShot:  {from:520, to:130, duration:0.2,  type:'sawtooth', volume:0.035, noise:0.5,  layers:[[220,100,0,0.22,'sine',0.05]]},
  projectile: {from:880, to:480, duration:0.12, type:'triangle', volume:0.018, noise:0.4},
  boom:       {from:150, to:32,  duration:0.65, type:'triangle', volume:0.1,   noise:1.0,  layers:[[68,26,0,0.8,'sine',0.11],[420,70,0.02,0.32,'sawtooth',0.03]]},
  shockwave:  {from:240, to:58,  duration:0.4,  type:'triangle', volume:0.06,  noise:0.7,  layers:[[92,38,0,0.45,'sine',0.085]]},
  fireCast:   {from:260, to:980, duration:0.3,  type:'sawtooth', volume:0.028, noise:0.9,  layers:[[130,70,0,0.3,'sine',0.05]]},
  iceCast:    {from:1500,to:2300,duration:0.22, type:'sine',     volume:0.02,  layers:[[1900,2900,0.04,0.22,'sine',0.02],[2500,3300,0.1,0.26,'sine',0.014]]},
  lightning:  {from:2600,to:180, duration:0.13, type:'sawtooth', volume:0.04,  noise:1.0,  layers:[[120,55,0,0.22,'square',0.03]]},
  heal:       {from:660, to:990, duration:0.24, type:'sine',     volume:0.032, layers:[[990,1320,0.07,0.26,'sine',0.026],[1480,1480,0.15,0.34,'sine',0.014]]},
  manaGain:   {from:880, to:1320,duration:0.2,  type:'triangle', volume:0.026, layers:[[1760,2200,0.06,0.24,'sine',0.014]]},
  shieldUp:   {from:300, to:900, duration:0.26, type:'triangle', volume:0.04,  noise:0.2,  layers:[[1200,1800,0.1,0.22,'sine',0.02]]},
  buffUp:     {from:392, to:784, duration:0.2,  type:'triangle', volume:0.034, layers:[[523,1047,0.08,0.22,'sine',0.03],[1047,1568,0.16,0.26,'sine',0.02]]},
  debuff:     {from:430, to:150, duration:0.26, type:'sawtooth', volume:0.028, noise:0.25, layers:[[300,110,0.05,0.22,'triangle',0.03]]},
  levelUp:    {from:523, to:523, duration:0.16, type:'triangle', volume:0.05,  layers:[[659,659,0.1,0.18,'triangle',0.05],[784,784,0.2,0.2,'triangle',0.05],[1047,1047,0.3,0.5,'sine',0.055],[1319,1319,0.4,0.6,'sine',0.04],[2093,2093,0.5,0.8,'sine',0.02]]},
  runePickup: {from:300, to:1200,duration:0.3,  type:'sine',     volume:0.04,  noise:0.2,  layers:[[600,1800,0.1,0.3,'sine',0.03],[2400,2400,0.25,0.4,'sine',0.02]]},
  runeSpawn:  {from:660, to:660, duration:0.18, type:'sine',     volume:0.03,  layers:[[880,880,0.14,0.2,'sine',0.028],[1320,1320,0.28,0.45,'sine',0.026]]},
  wardPlace:  {from:520, to:240, duration:0.13, type:'triangle', volume:0.04,  layers:[[900,1300,0.08,0.22,'sine',0.025]]},
  itemUse:    {from:600, to:900, duration:0.1,  type:'square',   volume:0.022, layers:[[900,1350,0.06,0.16,'sine',0.03]]},
  heartbeat:  {from:72,  to:46,  duration:0.13, type:'sine',     volume:0.11,  layers:[[62,40,0.17,0.15,'sine',0.085]]},
  step:       {from:150, to:90,  duration:0.045,type:'triangle', volume:0.012, noise:0.5},
  alarm:      {from:740, to:740, duration:0.12, type:'square',   volume:0.026, layers:[[560,560,0.14,0.12,'square',0.026],[740,740,0.28,0.12,'square',0.026]]},
  spawnPulse: {from:180, to:520, duration:0.3,  type:'sine',     volume:0.04,  layers:[[520,1040,0.12,0.3,'sine',0.03]]}
});
Object.assign(SFX_THROTTLE, {meleeHit:70, heavyHit:140, towerHit:110, towerShot:140, projectile:90, boom:140, shockwave:160, fireCast:90, iceCast:90, lightning:80, heal:200, manaGain:260, shieldUp:150, buffUp:160, debuff:160, levelUp:250, runePickup:200, runeSpawn:600, wardPlace:200, itemUse:100, heartbeat:400, step:130, alarm:1500, spawnPulse:300});
Object.assign(SFX_PRIORITY, {heavyHit:1, boom:1, levelUp:1, heartbeat:1, runePickup:1, alarm:1, shockwave:1});

/* громкость по расстоянию до героя игрока (или до камеры у зрителя) */
function listener(){ return (playerHero && !playerHero.dead) ? playerHero : cam; }
function dist(x, y){ const p = listener(); return Math.hypot(x - p.x, y - p.y); }
function vol(x, y, base){ const v = 1 - dist(x, y) / 1750; return v <= 0.06 ? 0 : Math.pow(v, 1.15) * (base == null ? 1 : base); }
function sfx(kind, x, y, base){ const v = (x == null) ? (base == null ? 1 : base) : vol(x, y, base); if(v > 0) playSynthSfx(kind, {volume: v}); }

/* ---------------------------------------------------------
   СИСТЕМА ЭФФЕКТОВ МИРА
   --------------------------------------------------------- */
const F = G.__fx973 = {sx: 0, sy: 0, list: [], shakeMag: 0, shakeT: 0, shakeDur: 1, lowHp: 0, dmgFlash: 0, flash: null, flashT: 0, flashDur: 1, heartT: 0, vig: null};
const fxLevel = () => (typeof fxl === 'function' ? fxl() : 0);          /* 0 — всё, 1 — без украшений, 2 — минимум, 3 — выкл */
const capFx = () => fxLevel() >= 2 ? 36 : (perfLevel >= 1 ? 90 : 170);
function addFx(o){
  if(fxLevel() >= 3) return;
  if(F.list.length >= capFx()) F.list.shift();
  o.t = 0; F.list.push(o);
}
function shake(mag, dur){
  if(fxLevel() >= 2) return;
  if(mag >= F.shakeMag * Math.pow(Math.max(0, F.shakeT) / F.shakeDur, 2)){ F.shakeMag = mag; F.shakeT = F.shakeDur = dur || 0.3; }
}
function flash(color, alpha, dur){ F.flash = color; F.flashA = alpha; F.flashT = F.flashDur = dur || 0.4; }
const col = u => (u && u.def && u.def.color2) || (u && u.def && u.def.color) || '#ffd27a';
function teamCol(team){ return (typeof TEAM_COL !== 'undefined' && TEAM_COL[team]) || '#ffd27a'; }

const sparkFx = (x, y, c, size, n) => addFx({k:'star', x, y, c, r:size, life:0.28, n:n || 6, a0:Math.random() * TAU});
const ringFx = (x, y, r, c, life, w) => addFx({k:'shock', x, y, r, c, life:life || 0.45, w:w || 5});

/* ---- отрисовка эффектов (мировые координаты, камера уже применена) ---- */
function drawOne(o){
  const k = o.t / o.life, a = 1 - k;
  const g = ctx;
  switch(o.k){
    case 'star': {
      const r = o.r * (0.45 + ease(k) * 0.9);
      g.globalAlpha = a; g.fillStyle = o.c;
      g.beginPath();
      g.moveTo(o.x, o.y - r); g.lineTo(o.x + r * 0.16, o.y - r * 0.16); g.lineTo(o.x + r, o.y); g.lineTo(o.x + r * 0.16, o.y + r * 0.16);
      g.lineTo(o.x, o.y + r); g.lineTo(o.x - r * 0.16, o.y + r * 0.16); g.lineTo(o.x - r, o.y); g.lineTo(o.x - r * 0.16, o.y - r * 0.16);
      g.closePath(); g.fill();
      g.fillStyle = '#fff'; g.globalAlpha = a * 0.9;
      g.beginPath(); g.arc(o.x, o.y, Math.max(0.5, r * 0.2 * (1 - k)), 0, TAU); g.fill();
      g.strokeStyle = o.c; g.lineWidth = 2; g.globalAlpha = a * 0.8; g.beginPath();
      for(let i = 0; i < o.n; i++){
        const ang = o.a0 + i * TAU / o.n, r1 = r * 0.5 + r * 0.9 * ease(k) * 0.6, r2 = r1 + r * 0.45 * (1 - k);
        g.moveTo(o.x + Math.cos(ang) * r1, o.y + Math.sin(ang) * r1 * 0.8); g.lineTo(o.x + Math.cos(ang) * r2, o.y + Math.sin(ang) * r2 * 0.8);
      }
      g.stroke(); break;
    }
    case 'shock': {
      const r = o.r * ease(k);
      g.strokeStyle = o.c; g.lineWidth = o.w * (1 - k) + 1; g.globalAlpha = a * 0.85;
      g.beginPath(); g.ellipse(o.x, o.y, r, r * 0.7, 0, 0, TAU); g.stroke();
      g.globalAlpha = a * 0.25; g.lineWidth = o.w * 2.4 * (1 - k) + 1;
      g.beginPath(); g.ellipse(o.x, o.y, r * 0.93, r * 0.93 * 0.7, 0, 0, TAU); g.stroke(); break;
    }
    case 'rune': {
      const grow = Math.min(1, k / 0.22), fade = k < 0.55 ? 1 : (1 - k) / 0.45, r = o.r * (0.35 + 0.65 * ease(grow));
      g.globalAlpha = fade * 0.9; g.strokeStyle = o.c; g.lineWidth = 2;
      g.setLineDash([9, 7]); g.lineDashOffset = -o.t * 60;
      g.beginPath(); g.ellipse(o.x, o.y, r, r * 0.6, 0, 0, TAU); g.stroke(); g.setLineDash([]);
      g.lineWidth = 1.2; g.globalAlpha = fade * 0.6;
      g.beginPath(); g.ellipse(o.x, o.y, r * 0.72, r * 0.72 * 0.6, 0, 0, TAU); g.stroke();
      g.fillStyle = o.c; g.globalAlpha = fade * 0.9;
      for(let i = 0; i < 8; i++){
        const ang = i / 8 * TAU + o.t * 1.6, px = o.x + Math.cos(ang) * r, py = o.y + Math.sin(ang) * r * 0.6;
        g.save(); g.translate(px, py); g.rotate(ang); g.fillRect(-1.5, -5, 3, 10); g.restore();
      }
      const gl = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
      gl.addColorStop(0, hexRgba(o.c, 0.28 * fade)); gl.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 1; g.fillStyle = gl; g.beginPath(); g.ellipse(o.x, o.y, r, r * 0.6, 0, 0, TAU); g.fill();
      /* искры, взлетающие от круга */
      g.fillStyle = '#fff';
      for(let i = 0; i < 9; i++){
        const h = hash(i + o.seed), ph = (k * 1.6 + h) % 1, ang = h * TAU;
        g.globalAlpha = Math.sin(ph * Math.PI) * fade * 0.9;
        g.fillRect(o.x + Math.cos(ang) * r * 0.8 * h, o.y + Math.sin(ang) * r * 0.5 - ph * 70, 2, 2);
      }
      break;
    }
    case 'pillar': {
      const fade = Math.sin(Math.min(1, k * 1.15) * Math.PI) , w = o.w * (1 - k * 0.4), h = o.h;
      const lg = g.createLinearGradient(0, o.y, 0, o.y - h);
      lg.addColorStop(0, hexRgba(o.c, 0.75 * fade)); lg.addColorStop(0.6, hexRgba(o.c, 0.28 * fade)); lg.addColorStop(1, hexRgba(o.c, 0));
      g.globalAlpha = 1; g.fillStyle = lg;
      g.beginPath(); g.moveTo(o.x - w, o.y); g.lineTo(o.x - w * 0.35, o.y - h); g.lineTo(o.x + w * 0.35, o.y - h); g.lineTo(o.x + w, o.y); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,' + (0.55 * fade) + ')'; g.fillRect(o.x - w * 0.14, o.y - h * 0.8, w * 0.28, h * 0.8);
      g.strokeStyle = o.c; g.globalAlpha = fade * 0.9; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(o.x, o.y, w * (1 + k * 0.7), w * (1 + k * 0.7) * 0.6, 0, 0, TAU); g.stroke();
      g.fillStyle = '#fff';
      for(let i = 0; i < 12; i++){
        const hh = hash(i + o.seed), ph = (k * 1.4 + hh) % 1;
        g.globalAlpha = Math.sin(ph * Math.PI) * fade;
        g.fillRect(o.x + (hh - 0.5) * w * 1.6, o.y - ph * h * 0.95, 2.2, 2.2 + hh * 3);
      }
      break;
    }
    case 'crack': {
      g.globalCompositeOperation = 'source-over';
      const fade = Math.min(1, a * 2.6), grow = Math.min(1, k / 0.12);
      g.strokeStyle = 'rgba(14,6,4,' + (0.85 * fade) + ')'; g.lineWidth = 4; g.lineJoin = 'round';
      for(const pl of o.cr){ g.beginPath(); for(let i = 0; i < pl.length * grow; i++){ const p = pl[i]; if(i) g.lineTo(o.x + p[0], o.y + p[1] * 0.7); else g.moveTo(o.x + p[0], o.y + p[1] * 0.7); } g.stroke(); }
      g.globalCompositeOperation = 'lighter';
      g.strokeStyle = hexRgba(o.c, 0.9 * Math.max(0, 1 - k * 2.2)); g.lineWidth = 1.5;
      for(const pl of o.cr){ g.beginPath(); for(let i = 0; i < pl.length * grow; i++){ const p = pl[i]; if(i) g.lineTo(o.x + p[0], o.y + p[1] * 0.7); else g.moveTo(o.x + p[0], o.y + p[1] * 0.7); } g.stroke(); }
      break;
    }
    case 'plus': {
      g.fillStyle = o.c;
      for(let i = 0; i < o.n; i++){
        const hh = hash(i + o.seed), ph = Math.min(1, Math.max(0, (k - i * 0.07) / 0.7));
        if(ph <= 0 || ph >= 1) continue;
        const px = o.x + (hh - 0.5) * 46, py = o.y - ph * 62 - i * 3, sz = 5 + hh * 3;
        g.globalAlpha = Math.sin(ph * Math.PI);
        g.fillRect(px - sz / 2, py - 1.5, sz, 3); g.fillRect(px - 1.5, py - sz / 2, 3, sz);
      }
      break;
    }
    case 'coin': {
      g.globalCompositeOperation = 'source-over';
      for(let i = 0; i < o.n; i++){
        const hh = hash(i + o.seed), vx = (hh - 0.5) * 120, vz = 150 + hash(i + 9 + o.seed) * 110, tt = o.t;
        const px = o.x + vx * tt, z = vz * tt - 330 * tt * tt;
        if(z < 0 && tt > 0.2) continue;
        const py = o.y - Math.max(0, z), sc = Math.abs(Math.cos(tt * 13 + i * 2));
        g.globalAlpha = Math.min(1, a * 3);
        g.fillStyle = '#ffd24a'; g.strokeStyle = '#a8731a'; g.lineWidth = 1.2;
        g.beginPath(); g.ellipse(px, py, 1.5 + 4 * sc, 5, 0, 0, TAU); g.fill(); g.stroke();
        g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,255,200,.8)'; g.fillRect(px - 1, py - 3, 2, 2); g.globalCompositeOperation = 'source-over';
      }
      break;
    }
    case 'soul': {
      g.fillStyle = o.c;
      for(let i = 0; i < 5; i++){
        const px = o.x + Math.sin(o.t * 3 + i * 1.3) * 12 + (i - 2) * 8, py = o.y - o.t * (54 + i * 10);
        for(let j = 0; j < 4; j++){
          g.globalAlpha = a * (1 - j * 0.22) * 0.8;
          g.beginPath(); g.arc(px - Math.sin(o.t * 3 + i * 1.3) * j * 2, py + j * 5, Math.max(0.5, (4 - j) * (1 - k * 0.5)), 0, TAU); g.fill();
        }
      }
      break;
    }
    case 'flash': {
      const r = o.r * (0.4 + ease(k) * 0.8), gl = g.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
      gl.addColorStop(0, hexRgba(o.c, 0.9 * a)); gl.addColorStop(1, hexRgba(o.c, 0));
      g.globalAlpha = 1; g.fillStyle = gl; g.fillRect(o.x - r, o.y - r, r * 2, r * 2); break;
    }
    case 'mark': {
      const r = o.r * (1.25 - 0.75 * ease(k));
      g.globalAlpha = a; g.strokeStyle = o.c; g.lineWidth = 2.2;
      g.beginPath(); g.ellipse(o.x, o.y, r, r * 0.65, 0, 0, TAU); g.stroke();
      g.fillStyle = o.c;
      for(let i = 0; i < 4; i++){
        const ang = i * TAU / 4 + Math.PI / 4, d = r + 6 * (1 - k);
        g.save(); g.translate(o.x + Math.cos(ang) * d, o.y + Math.sin(ang) * d * 0.65); g.rotate(ang + Math.PI);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(-6, -3.5); g.lineTo(-6, 3.5); g.closePath(); g.fill(); g.restore();
      }
      break;
    }
  }
}
F.drawWorld = safe(function(){
  if(!F.list.length || fxLevel() >= 3) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for(const o of F.list){
    if(!isWorldPointVisible(o.x, o.y, (o.r || 120) + (o.h || 0) + 120)) continue;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1; ctx.lineJoin = 'miter';
    drawOne(o);
  }
  ctx.restore();
});

/* ---- экранные эффекты: виньетка низкого HP, урон, вспышки ---- */
function vignette(){
  if(F.vig && F.vig.w === VW && F.vig.h === VH) return F.vig.cv;
  const cv = document.createElement('canvas'); cv.width = Math.max(2, Math.round(VW / 3)); cv.height = Math.max(2, Math.round(VH / 3));
  const g = cv.getContext('2d'), r = Math.hypot(cv.width, cv.height) / 2;
  const gr = g.createRadialGradient(cv.width / 2, cv.height / 2, r * 0.42, cv.width / 2, cv.height / 2, r);
  gr.addColorStop(0, 'rgba(180,0,0,0)'); gr.addColorStop(0.7, 'rgba(190,10,10,0.45)'); gr.addColorStop(1, 'rgba(120,0,0,0.9)');
  g.fillStyle = gr; g.fillRect(0, 0, cv.width, cv.height);
  F.vig = {w: VW, h: VH, cv};
  return cv;
}
F.drawPost = safe(function(){
  if(fxLevel() >= 3) return;
  const lo = F.lowHp, df = F.dmgFlash;
  if(lo > 0.01 || df > 0.01){
    const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 1000 * 5.2);
    const a = Math.min(0.9, lo * pulse * 0.85 + df * 0.7);
    ctx.save(); ctx.globalAlpha = a; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(vignette(), 0, 0, VW, VH); ctx.restore();
  }
  if(F.flashT > 0 && F.flash){
    const k = F.flashT / F.flashDur;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.15, VW / 2, VH / 2, Math.max(VW, VH) * 0.75);
    g.addColorStop(0, hexRgba(F.flash, 0)); g.addColorStop(1, hexRgba(F.flash, Math.min(0.5, F.flashA * k)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); ctx.restore();
  }
});

/* ---------------------------------------------------------
   ХУКИ: урон, смерть, кольца, касты, предметы, снаряды, варды
   --------------------------------------------------------- */
const classify = (id, def) => {
  const s = ((id || '') + ' ' + (def && def.name || '') + ' ' + (def && def.desc || '')).toLowerCase();
  if(/heal|лечен|исцел|восстанов|регенер/.test(s) && !/урон/.test(s.slice(0, 40))) return 'heal';
  if(/щит|shield|барьер|купол/.test(s)) return 'shieldUp';
  if(/лёд|лед|мороз|ice|frost|снеж|холод/.test(s)) return 'iceCast';
  if(/молни|lightning|разряд|электр|шок/.test(s)) return 'lightning';
  if(/огн|пламя|fire|flame|molotov|молотов|жар|горящ|ожог/.test(s)) return 'fireCast';
  if(/ярост|клич|аура|благослов|ускор|скорост/.test(s)) return 'buffUp';
  return null;
};

const _applyDamage = applyDamage;
applyDamage = function(target, amount, source){
  if(!target || target.dead) return _applyDamage.apply(this, arguments);
  const before = target.hp + (target.shieldHp || 0);
  const r = _applyDamage.apply(this, arguments);
  try {
    const dealt = before - (target.dead ? 0 : target.hp + (target.shieldHp || 0));
    if(dealt > 0.5) onDamage(target, dealt, source, before);
  } catch(err) {}
  return r;
};
const structAlert = new Map();
function onDamage(t, dealt, src, before){
  if(!isFinite(dealt) || perfLevel >= 3 && !(t === playerHero)) return;
  const atk = !!(src && src.attack), crit = !!(src && (src.crit || src.isCrit || src.critical));
  const big = dealt >= Math.max(280, (t.maxHp || 1000) * 0.2);
  const struct = isBuilding(t) || isStructure(t);
  const involvesPlayer = t === playerHero || (src && (src === playerHero || src.source === playerHero));
  const v = vol(t.x, t.y, 1);
  if(v <= 0 && !involvesPlayer) return;
  if(struct){
    if(atk){ playSynthSfx('towerHit', {volume: Math.max(0.2, v)}); if(fxLevel() < 2) sparkFx(t.x + rnd(-20, 20), t.y - (t.radius || 30) * 0.4, '#ffc27a', 22, 5); }
    /* предупреждение: наша башня/казарма под атакой */
    if(playerHero && src && src.team !== undefined && src.team !== t.team && t.team === playerHero.team){
      const now = performance.now(), last = structAlert.get(t) || 0;
      if(now - last > 9000){ structAlert.set(t, now); playSynthSfx('alarm'); addText(t.x, t.y - (t.radius || 40) - 50, 'ПОД АТАКОЙ!', '#ff7a6a', 1.4, 18); }
    }
    return;
  }
  if(big){
    playSynthSfx('heavyHit', {volume: Math.max(0.35, v)});
    if(involvesPlayer) shake(Math.min(9, 3 + dealt / 160), 0.28);
    sparkFx(t.x, t.y - (t.radius || 20) * 0.3, crit ? '#ffe060' : '#ff7a4a', 38, 8);
    if(fxLevel() < 1) ringFx(t.x, t.y, 52, '#ffb070', 0.32, 4);
  } else if(atk){
    playSynthSfx(crit ? 'crit' : 'meleeHit', {volume: Math.max(0.3, v) * (t.type === 'hero' ? 1 : 0.7)});
    if(fxLevel() < 2) sparkFx(t.x + rnd(-8, 8), t.y - (t.radius || 20) * 0.3, t.type === 'hero' ? '#ff9a7a' : '#ffe2a0', 16 + Math.min(10, dealt / 20), 5);
  } else if(!(src && src.heal)){
    if(dealt > 25) playSynthSfx('hitMagic', {volume: Math.max(0.25, v)});
    if(fxLevel() < 2 && dealt > 40) sparkFx(t.x, t.y - (t.radius || 20) * 0.3, (src && src.trueDamage) ? '#ffffff' : '#7ab8ff', 18, 5);
  }
  if(t === playerHero){
    F.dmgFlash = Math.min(0.6, F.dmgFlash + Math.min(0.4, dealt / Math.max(300, t.maxHp * 0.25)));
  }
}

const _killUnit = killUnit;
killUnit = function(u, source){
  const was = u && u.dead;
  const r = _killUnit.apply(this, arguments);
  try { if(u && !was && u.dead) onKill(u, source); } catch(err) {}
  return r;
};
function onKill(u, src){
  const x = u.x, y = u.y, v = vol(x, y, 1);
  const killer = src && (src.coins !== undefined ? src : (src.source && src.source.coins !== undefined ? src.source : null));
  if(u.type === 'hero'){
    if(v > 0) setTimeout(() => sfx('shockwave', x, y, 0.8), 40);
    if(fxLevel() < 3){
      ringFx(x, y, 120, teamCol(u.team), 0.6, 7);
      addFx({k:'soul', x, y, c: teamCol(u.team), life: 1.5});
      addFx({k:'flash', x, y: y - 20, c: '#ffffff', r: 90, life: 0.3});
    }
    if(v > 0.25 || u === playerHero) shake(u === playerHero ? 10 : 5, 0.4);
    if(killer === playerHero) flash('#ffd27a', 0.35, 0.45);
  } else if(u.type === 'tower' || u.type === 'barracks' || u.type === 'ancient' || isBuilding(u)){
    if(v > 0) setTimeout(() => sfx('boom', x, y, 1), 30);
    shake(Math.min(14, 4 + v * 10), 0.7);
    if(fxLevel() < 3){
      const cr = []; for(let i = 0; i < 10; i++){ const ang = i / 10 * TAU + Math.random() * 0.4, pl = []; let px = 0, py = 0; for(let s = 0; s < 6; s++){ px += Math.cos(ang + rnd(-0.4, 0.4)) * rnd(14, 26); py += Math.sin(ang + rnd(-0.4, 0.4)) * rnd(14, 26); pl.push([px, py]); } cr.push(pl); }
      addFx({k:'crack', x, y, c:'#ff7a30', life:2.4, cr, r: 200});
      ringFx(x, y, 220, '#ffd9a0', 0.8, 9); ringFx(x, y, 140, '#ff8040', 0.6, 6);
      addFx({k:'flash', x, y, c:'#ffb060', r:240, life:0.5});
    }
    spawnParticles(x, y, '#ffb070', 36, 1.5); spawnParticles(x, y, '#7a6a5a', 22, 1.1);
  } else if(u.isRoshan){
    if(v > 0) sfx('boom', x, y, 1); shake(8, 0.6); ringFx(x, y, 200, '#ffd54f', 0.8, 8);
  } else if((u.type === 'creep' || u.type === 'neutral') && killer && fxLevel() < 1 && v > 0.15){
    addFx({k:'coin', x, y: y - 6, life: 0.9, n: killer === playerHero ? 5 : 3, seed: Math.random() * 100});
  }
}

const _fxRing = fxRing;
fxRing = function(x, y, r, color, life){
  _fxRing.apply(this, arguments);
  try {
    if(r >= 90){
      const v = vol(x, y, Math.min(1, 0.45 + r / 400));
      if(v > 0.08) playSynthSfx(r >= 200 ? 'boom' : 'shockwave', {volume: v * (r >= 200 ? 0.7 : 1)});
      if(r >= 170 && v > 0.3) shake(Math.min(6, r / 60), 0.25);
      if(fxLevel() < 2) ringFx(x, y, r * 1.12, '#ffffff', 0.35, 3);
    }
  } catch(err) {}
};

const _castSkill = castSkill;
castSkill = function(hero, slot, tx, ty){
  const ok = _castSkill.apply(this, arguments);
  try { if(ok) onCast(hero, slot); } catch(err) {}
  return ok;
};
function onCast(hero, slot){
  const s = hero.skills && hero.skills[slot]; if(!s) return;
  const def = SKILLS[s.id] || {}, ult = !!def.ult, c = col(hero);
  const kind = classify(s.id, def);
  if(kind) sfx(kind, hero.x, hero.y, ult ? 1 : 0.85);
  if(fxLevel() < 3) addFx({k:'rune', x: hero.x, y: hero.y + (hero.radius || 20) * 0.5, c, r: ult ? 130 : 74, life: ult ? 1.1 : 0.7, seed: Math.random() * 100});
  if(ult){
    ringFx(hero.x, hero.y, 170, c, 0.7, 7);
    addFx({k:'flash', x: hero.x, y: hero.y - 20, c, r: 160, life: 0.45});
    if(hero === playerHero){ flash(c, 0.4, 0.5); shake(4, 0.3); }
  }
}

const _useInv = useInventoryItem;
useInventoryItem = function(hero, index){
  const ok = _useInv.apply(this, arguments);
  try { if(ok && hero){ sfx('itemUse', hero.x, hero.y, 0.9); if(fxLevel() < 2) ringFx(hero.x, hero.y, 54, '#9fe8ff', 0.4, 3); } } catch(err) {}
  return ok;
};

const _spawnProjectile = spawnProjectile;
spawnProjectile = function(x, y, target, dmg, source, speed, color, radius){
  const r = _spawnProjectile.apply(this, arguments);
  try {
    const st = source && (source.type || (source.source && source.source.type));
    const v = vol(x, y, 1);
    if(v > 0.1){
      if(st === 'tower'){ playSynthSfx('towerShot', {volume: v}); if(fxLevel() < 2) addFx({k:'flash', x, y: y - 30, c: color || '#ffcf80', r: 40, life: 0.18}); }
      else if(st !== 'hero') playSynthSfx('projectile', {volume: v * 0.6});
    }
  } catch(err) {}
  return r;
};

const _wardAdd = wardAdd;
wardAdd = function(d){
  const r = _wardAdd.apply(this, arguments);
  try { if(d){ sfx('wardPlace', d.x, d.y, 1); if(fxLevel() < 2){ ringFx(d.x, d.y, 70, '#7ffff0', 0.6, 4); addFx({k:'pillar', x: d.x, y: d.y, c:'#7ffff0', w: 18, h: 110, life: 0.8, seed: Math.random() * 100}); } } } catch(err) {}
  return r;
};

/* ---------------------------------------------------------
   ТИК: слежение за героями (лечение, мана, уровень, баффы, возрождение, руны, шаги, клики)
   --------------------------------------------------------- */
const runeSnap = {list: [], init: false};
const BAD_BUFF = /slow|sil|fear|root|hex|curse|poison|mark|burn|blind|disarm|ensnare|freeze|frost|debuff|taunt|doom|leash/i;
F.tick = safe(function(dt){
  if(gameState !== 'playing') return;
  /* затухание */
  if(F.list.length){ let w = 0; for(const o of F.list){ o.t += dt; if(o.t < o.life) F.list[w++] = o; } F.list.length = w; }
  if(F.shakeT > 0){
    F.shakeT = Math.max(0, F.shakeT - dt);
    const m = F.shakeMag * Math.pow(F.shakeT / F.shakeDur, 2);
    F.sx = (Math.random() * 2 - 1) * m; F.sy = (Math.random() * 2 - 1) * m;
  } else { F.sx = F.sy = 0; }
  if(F.flashT > 0) F.flashT = Math.max(0, F.flashT - dt);
  F.dmgFlash = Math.max(0, F.dmgFlash - dt * 1.3);

  for(const h of heroes){
    if(!h) continue;
    const st = h._f973 || (h._f973 = {hp: h.hp, mp: h.mp, level: h.level, dead: !!h.dead, nb: 0, x: h.x, y: h.y, acc: 0, mt: null, at: null, tm: 0});
    if(h.dead){ st.dead = true; continue; }
    if(st.dead){                                   /* возрождение */
      st.dead = false; st.hp = h.hp; st.mp = h.mp; st.level = h.level; st.x = h.x; st.y = h.y;
      addFx({k:'pillar', x: h.x, y: h.y, c: teamCol(h.team), w: 34, h: 240, life: 1.0, seed: Math.random() * 100});
      ringFx(h.x, h.y, 100, teamCol(h.team), 0.7, 5);
      sfx('spawnPulse', h.x, h.y, 0.9);
      if(h === playerHero) flash(teamCol(h.team), 0.28, 0.5);
      continue;
    }
    if(h.level > st.level){                        /* новый уровень */
      st.level = h.level; st.hp = h.hp; st.mp = h.mp;
      addFx({k:'pillar', x: h.x, y: h.y, c: '#ffe066', w: 30, h: 260, life: 1.2, seed: Math.random() * 100});
      ringFx(h.x, h.y, 120, '#ffe066', 0.8, 6);
      sfx('levelUp', h.x, h.y, h === playerHero ? 1 : 0.55);
      if(h === playerHero) flash('#ffd24a', 0.3, 0.55);
      continue;
    }
    const dh = h.hp - st.hp;                       /* лечение */
    if(dt < 0.1 && dh > Math.max(45, h.maxHp * 0.04)){
      addFx({k:'plus', x: h.x, y: h.y - (h.radius || 20), c:'#6dff8a', life: 1.0, n: 6, seed: Math.random() * 100});
      spawnParticles(h.x, h.y, '#9dffb0', 8, 0.4);
      sfx('heal', h.x, h.y, 0.9);
    }
    st.hp = h.hp;
    if(h.maxMp > 0){
      const dm = h.mp - st.mp;
      if(dt < 0.1 && dm > Math.max(60, h.maxMp * 0.08)){
        addFx({k:'plus', x: h.x, y: h.y - (h.radius || 20), c:'#7ab8ff', life: 0.9, n: 4, seed: Math.random() * 100});
        if(h === playerHero) playSynthSfx('manaGain');
      }
      st.mp = h.mp;
    }
    if(h.buffs){                                   /* новые баффы / дебаффы */
      let n = 0, last = null; for(const b of h.buffs){ if(b && !b.isOrb){ n++; last = b; } }
      if(n > st.nb && last && st.nb >= 0){
        const bad = BAD_BUFF.test(String(last.type || '') + ' ' + String(last.name || ''));
        const v = vol(h.x, h.y, h === playerHero ? 1 : 0.6);
        if(v > 0.1 && h.type === 'hero') playSynthSfx(bad ? 'debuff' : 'buffUp', {volume: v});
        if(fxLevel() < 2 && h.type === 'hero') ringFx(h.x, h.y, 46, bad ? '#c070ff' : '#fff2a0', 0.45, 3);
      }
      st.nb = n;
    }
  }

  const p = playerHero;
  if(p && !p.dead){
    const st = p._f973;
    if(st){
      const moved = Math.hypot(p.x - st.x, p.y - st.y);                    /* шаги */
      if(moved > 0.5 && moved < 80 && !p.invisible){ st.acc += moved; if(st.acc > 82){ st.acc = 0; playSynthSfx('step', {volume: 0.8 + Math.random() * 0.4}); } }
      st.x = p.x; st.y = p.y;
      st.tm -= dt;                                                       /* маркеры кликов */
      const mt = p.moveTarget;
      if(mt && mt !== st.mt && st.tm <= 0 && Math.hypot(mt.x - p.x, mt.y - p.y) > 40){ st.tm = 0.18; addFx({k:'mark', x: mt.x, y: mt.y, c:'#7dff9a', r: 26, life: 0.45}); }
      st.mt = mt || null;
      const at = p.attackTarget;
      if(at && at !== st.at && !at.dead){ addFx({k:'mark', x: at.x, y: at.y, c:'#ff6a5a', r: (at.radius || 20) + 14, life: 0.5}); }
      st.at = at || null;
    }
    const ratio = p.hp / Math.max(1, p.maxHp);                           /* низкое здоровье */
    const target = ratio < 0.3 ? Math.min(1, (0.3 - ratio) / 0.3 + 0.25) : 0;
    F.lowHp += (target - F.lowHp) * Math.min(1, dt * 4);
    if(target > 0){ F.heartT -= dt; if(F.heartT <= 0){ F.heartT = 1.15 - target * 0.45; playSynthSfx('heartbeat', {volume: 0.6 + target * 0.6}); } }
  } else F.lowHp += (0 - F.lowHp) * Math.min(1, dt * 4);

  /* руны: подбор и появление */
  if(Array.isArray(runes)){
    if(runeSnap.init){
      for(const s of runeSnap.list) if(!runes.includes(s.ref)){
        addFx({k:'pillar', x: s.x, y: s.y, c: s.c, w: 36, h: 280, life: 1.1, seed: Math.random() * 100});
        ringFx(s.x, s.y, 130, s.c, 0.7, 6);
        sfx('runePickup', s.x, s.y, 1);
      }
      for(const r of runes) if(!runeSnap.list.some(s => s.ref === r)){
        addFx({k:'pillar', x: r.x, y: r.y, c: r.color || '#9ad8ff', w: 22, h: 200, life: 1.4, seed: Math.random() * 100});
        sfx('runeSpawn', null, null, 0.8);
      }
    }
    runeSnap.list = runes.map(r => ({ref: r, x: r.x, y: r.y, c: r.color || '#9ad8ff'})); runeSnap.init = true;
  }
});

/* ---------------------------------------------------------
   3D-ДЕМОН В ГЛАВНОМ МЕНЮ
   --------------------------------------------------------- */
const MD = {cv: null, g: null, W: 0, H: 0, yaw: 0, last: -1, ms: 20, born: 0, bad: 0, key: '', glow: null,
            def: {id: 'menuDemon', color: '#8a1a14', color2: '#ff9a50'}};
function mdThemeColor(){
  try { const c = DST.cur && DST.cur.hover; if(c) return '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join(''); } catch(err) {}
  return '#ff9a50';
}
G.menuDemon973 = {
  draw(cx, gy, u, now){
    if(MD.bad >= 3 && now - (MD.badAt || 0) > 5) MD.bad = 0;
    if(MD.bad >= 3 || perfLevel >= 3 || !G.Hero3D || !Hero3D.models || !Hero3D.models.menuDemon || !Hero3D.render) return false;
    try {
      const dispH = VH * 0.96 * (G.menuDemonScale || 1);   /* 0.10.0.5: update01005.js подгоняет размер демона под свободное место меню */
      const Hpx = Math.round(Math.min(perfLevel >= 2 ? 300 : (perfLevel >= 1 ? 400 : 580), dispH * (perfLevel >= 2 ? 0.42 : (perfLevel >= 1 ? 0.55 : 0.8))) / 4) * 4, Wpx = Math.round(Hpx * 1.1 / 4) * 4;
      const D = 9, f = 0.9 * Hpx * D / 4.8, ox = 0.25 * f / D;
      if(!MD.cv || MD.W !== Wpx || MD.H !== Hpx){
        MD.cv = document.createElement('canvas'); MD.cv.width = Wpx; MD.cv.height = Hpx; MD.g = MD.cv.getContext('2d');
        MD.gc = document.createElement('canvas'); MD.gc.width = Wpx; MD.gc.height = Hpx;
        MD.sm = [3, 7].map(d => { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(Wpx / d)); c.height = Math.max(2, Math.round(Hpx / d)); return c; });
        MD.W = Wpx; MD.H = Hpx; MD.last = -1; MD.born = now;
      }
      /* плавный разворот: за мышью + лёгкое покачивание */
      const want = Math.max(-0.55, Math.min(0.55, (mouse.x - cx) / VW * 1.5)) + Math.sin(now * 0.42) * 0.16;
      MD.yaw += (want - MD.yaw) * 0.06;
      if(now - MD.last > Math.max(0.05, MD.ms * 2.4 / 1000)){
        MD.last = now;
        const t0 = performance.now();
        MD.def.color2 = mdThemeColor();
        const res = Hero3D.render(MD.def, {W: Wpx, H: Hpx, yaw: MD.yaw, pitch: 0.12, t: now, f, cx: Wpx / 2 - ox, cy: Hpx / 2 + 0.95 * f / D, pedestal: false, pose: {kind: 'show'}});
        const n = Wpx * Hpx * 4, g = MD.g;
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.putImageData(new ImageData(res.data.subarray(0, n), Wpx, Hpx), 0, 0);
        if(res.glow){                                  /* мягкое свечение огня и глаз */
          MD.gc.getContext('2d').putImageData(new ImageData(res.glow.subarray(0, n), Wpx, Hpx), 0, 0);
          g.save(); g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true;
          [[3, 0.6], [7, 0.55]].forEach(([d, al], i) => { const sm = MD.sm[i], sg = sm.getContext('2d'); sg.clearRect(0, 0, sm.width, sm.height); sg.drawImage(MD.gc, 0, 0, sm.width, sm.height); g.globalAlpha = al; g.drawImage(sm, 0, 0, Wpx, Hpx); });
          g.restore();
        }
        MD.ms = MD.ms * 0.8 + (performance.now() - t0) * 0.2;
      }
      const k = dispH / Hpx, a = Math.min(1, (now - MD.born) / 0.7);
      const left = cx - (Wpx / 2 - ox) * k, top = gy - 0.92 * dispH + dispH * 0.01;
      ctx.save();
      /* тень и жар под ногами */
      ctx.globalCompositeOperation = 'source-over';
      const sh = ctx.createRadialGradient(cx, gy, 0, cx, gy, u * 34);
      sh.addColorStop(0, 'rgba(0,0,0,.7)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save(); ctx.translate(0, gy); ctx.scale(1, 0.22); ctx.translate(0, -gy); ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(cx, gy, u * 34, 0, TAU); ctx.fill(); ctx.restore();
      ctx.globalAlpha = a; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(MD.cv, left, top, Wpx * k, Hpx * k);
      ctx.restore();
      MD.bad = 0;
      return true;
    } catch(err) { MD.bad++; MD.badAt = now; console.warn('menuDemon3D', err); return false; }
  }
};

/* передний план меню: боке-угольки с параллаксом, лучи, огонёк под курсором, низкий туман */
const _warriorArt = dsDrawWarriorArt;
dsDrawWarriorArt = function(now){
  _warriorArt.apply(this, arguments);
  if(perfLevel >= 2) return;
  try {
    const mx = (mouse.x - VW / 2) / VW, my = (mouse.y - VH / 2) / VH;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    /* косые лучи света на героя */
    for(let i = 0; i < 4; i++){
      const x0 = VW * (0.42 + i * 0.13) + Math.sin(now * 0.25 + i * 2) * 26 + mx * 30, w = VW * 0.035;
      const lg = ctx.createLinearGradient(x0, 0, x0 + VW * 0.1, VH * 0.95);
      lg.addColorStop(0, dsC('hover', 0.1 + 0.04 * Math.sin(now * 0.7 + i))); lg.addColorStop(1, dsC('hover', 0));
      ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + w, 0); ctx.lineTo(x0 + VW * 0.1 + w * 3, VH * 0.95); ctx.lineTo(x0 + VW * 0.1 - w, VH * 0.95); ctx.closePath(); ctx.fill();
    }
    /* огонёк под курсором */
    const sg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 120);
    sg.addColorStop(0, dsC('hover', 0.1)); sg.addColorStop(1, dsC('hover', 0));
    ctx.fillStyle = sg; ctx.fillRect(mouse.x - 120, mouse.y - 120, 240, 240);
    /* боке-угольки ближнего плана (двигаются сильнее фона — глубина) */
    const n = perfLevel >= 1 ? 14 : 26;
    for(let i = 0; i < n; i++){
      const h = hash(i + 700), ph = (now * (0.03 + h * 0.05) + hash(i + 740)) % 1;
      const x = VW * hash(i + 780) + Math.sin(now * 0.5 + i) * 22 - mx * (40 + h * 90), y = VH * (1.1 - ph * 1.25) - my * (20 + h * 40);
      const r = 2 + h * 9, al = Math.sin(ph * Math.PI) * (0.18 + 0.4 * h);
      const bg = ctx.createRadialGradient(x, y, 0, x, y, r);
      bg.addColorStop(0, (i % 3 ? dsC('spark1', al) : dsC('spark2', al))); bg.addColorStop(1, dsC('spark1', 0));
      ctx.fillStyle = bg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    /* низкий светящийся туман вдоль пола */
    for(let i = 0; i < 3; i++){
      const fx = VW * (0.3 + i * 0.28) + Math.sin(now * 0.2 + i * 2.1) * VW * 0.08, fy = VH * 0.97;
      const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, VW * 0.22);
      fg.addColorStop(0, dsC('glow', 0.12)); fg.addColorStop(1, dsC('glow', 0));
      ctx.save(); ctx.translate(0, fy); ctx.scale(1, 0.28); ctx.translate(0, -fy); ctx.fillStyle = fg; ctx.fillRect(fx - VW * 0.25, fy - VW * 0.25, VW * 0.5, VW * 0.5); ctx.restore();
    }
    ctx.restore();
  } catch(err) {}
};
})();
