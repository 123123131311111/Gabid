/* DotaSense 0.10.0 (дополнение) — АРКАНА ПИРОМАНТА «ЛАЗУРНЫЙ ФЕНИКС».
   Только визуал: характеристики, урон, кулдауны и радиусы не меняются.
   • Атака — плазменная комета с перьями вместо огненной стрелы.
   • Огненный шар, Волна пламени, Мигание, Метеор — лазурные эффекты (взрывы, кольца, шлейф, падающая комета).
   • Лазурное пламя у ног героя. Облик героя рисует hero3d.js (skinId 'pyroArcana').
   Подключается после update0100c.js. */
(function(){
'use strict';
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update0100d ' + tag + ':', err); } catch(e) {} } };
const COLS = ['#2f7bff', '#5ad0ff', '#bfeaff', '#ffffff'];
function isPyroArcana(h){ return !!(h && h.def && h.def.id === 'pyro' && baseSkin(h.skinId) === 'pyroArcana'); }

function azureBurst(x, y, r, life){
  const L = life || 0.5;
  fxRing(x, y, r, '#5ad0ff', L); fxRing(x, y, r * 0.7, '#bfeaff', L * 0.9); fxRing(x, y, r * 0.4, '#ffffff', L * 0.75);
  spawnParticles(x, y, '#5ad0ff', Math.ceil(r / 9), 1.2); spawnParticles(x, y, '#2f7bff', Math.ceil(r / 12), 1.0); spawnParticles(x, y, '#ffffff', Math.ceil(r / 20), 0.8);
}
function azureSparks(x, y, radius, n){
  for(let i = 0; i < n; i++){
    const ang = Math.random() * Math.PI * 2, rr = radius * Math.sqrt(Math.random());
    particles.push({x: x + Math.cos(ang) * rr, y: y + Math.sin(ang) * rr * 0.68, vx: rnd(-18, 18), vy: rnd(-100, -40),
      color: COLS[(Math.random() * 4) | 0], size: rnd(2, 5), t: 0, life: rnd(0.5, 1.0), gravity: -38, drag: 0.97, spark: true});
  }
}

/* отложенные эффекты по игровому времени (не срабатывают на паузе) */
const later = [];
(function loop(){
  try {
    if(later.length && typeof gameTime === 'number'){
      for(let i = later.length - 1; i >= 0; i--) if(gameTime >= later[i].at){ const f = later[i].fn; later.splice(i, 1); try { f(); } catch(e) { warn('later', e); } }
    }
  } catch(e) { warn('loop', e); }
  requestAnimationFrame(loop);
})();

/* ---------- скиллы ---------- */
const orig = {fireball: SKILLS.fireball.cast, flamewave: SKILLS.flamewave.cast, blink: SKILLS.blink.cast, meteor: SKILLS.meteor.cast};

SKILLS.fireball.cast = function(h, x, y, lvl){
  if(!isPyroArcana(h)) return orig.fireball.apply(this, arguments);
  const r = this.radius[lvl];
  spawnAoE(x, y, r, this.dmg[lvl], h, 0.28, '#5ad0ff');
  fxMark(x, y, r, '#5ad0ff', 0.28);
  fxBeam(h.x, h.y, x, y, '#bfeaff', 0.25);
  later.push({at: gameTime + 0.26, fn: () => { azureBurst(x, y, r * 0.8, 0.45); azureSparks(x, y, r * 0.7, 18); }});
};
SKILLS.flamewave.cast = function(h, x, y, lvl){
  if(!isPyroArcana(h)) return orig.flamewave.apply(this, arguments);
  const r = this.radius[lvl];
  spawnAoE(h.x, h.y, r, this.dmg[lvl], h, 0, '#9fe6ff');
  for(const u of units){
    if(u.team === h.team || u.dead) continue;
    if(Math.hypot(u.x - h.x, u.y - h.y) < r){ u.slow = this.slow[lvl]; u.slowT = this.dur; }
  }
  azureBurst(h.x, h.y, r, 0.55);
  fxRing(h.x, h.y, r * 0.55, '#2f7bff', 0.7);
  azureSparks(h.x, h.y, r * 0.8, 26);
};
SKILLS.blink.cast = function(h, x, y, lvl){
  if(!isPyroArcana(h)) return orig.blink.apply(this, arguments);
  const x0 = h.x, y0 = h.y;
  const res = orig.blink.apply(this, arguments);
  fxBeam(x0, y0, h.x, h.y, '#5ad0ff', 0.55); fxBeam(x0, y0, h.x, h.y, '#ffffff', 0.3);
  azureBurst(x0, y0, 90, 0.4); azureBurst(h.x, h.y, 110, 0.5); azureSparks(h.x, h.y, 60, 20);
  return res;
};
SKILLS.meteor.cast = function(h, x, y, lvl){
  if(!isPyroArcana(h)) return orig.meteor.apply(this, arguments);
  const r = this.radius[lvl];
  spawnAoE(x, y, r, this.dmg[lvl], h, 1.15, '#2f7bff');
  fxMark(x, y, r, '#5ad0ff', 1.15);
  azureBurst(h.x, h.y, 110, 0.5);
  fxBeam(x, y - 760, x, y, '#bfeaff', 0.9);
  later.push({at: gameTime + 0.55, fn: () => { fxBeam(x - 40, y - 420, x, y, '#5ad0ff', 0.6); azureSparks(x, y, r * 0.5, 14); }});
  later.push({at: gameTime + 1.12, fn: () => { azureBurst(x, y, r, 0.7); azureBurst(x, y, r * 0.6, 0.55); azureSparks(x, y, r * 0.9, 40); }});
};

const _sfc = skillFxColor;
skillFxColor = function(hero, skillId){
  if(isPyroArcana(hero) && /fire|flame|meteor|blink|pyro/i.test(skillId)) return '#5ad0ff';
  return _sfc.apply(this, arguments);
};

/* ---------- атака ---------- */
const _sp = spawnProjectile;
spawnProjectile = function(x, y, target, dmg, source){
  const p = _sp.apply(this, arguments);
  try {
    const o = projectileOwner(p);
    if(p && isPyroArcana(o)){
      p.pyroArc = true; p.color = '#5ad0ff'; p.radius = Math.max(p.radius || 6, 9);
      azureBurst(x + Math.cos(o.facing || 0) * 44, y + Math.sin(o.facing || 0) * 44, 26, 0.22);
    }
  } catch(err) { warn('proj', err); }
  return p;
};
function drawBolt(p){
  const r = Math.max(6, p.radius || 9), a = projectileHeading(p), tm = gameTime * 14;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.globalAlpha = 0.22; ctx.fillStyle = '#2f7bff'; ctx.shadowColor = '#5ad0ff'; ctx.shadowBlur = 26;
  ctx.beginPath(); ctx.arc(0, 0, r * 2.6, 0, Math.PI * 2); ctx.fill();
  for(let k = -1; k <= 1; k++){                    /* перья-хвост */
    ctx.globalAlpha = k ? 0.55 : 0.8; ctx.strokeStyle = k ? '#5ad0ff' : '#bfeaff'; ctx.lineWidth = Math.max(2, r * (k ? 0.32 : 0.45));
    ctx.beginPath(); ctx.moveTo(-r * 0.6, k * r * 0.25);
    ctx.quadraticCurveTo(-r * 2.4, k * r * 1.1 + Math.sin(tm + k * 2) * r * 0.5, -r * 4.6, k * r * 1.9 + Math.sin(tm * 0.8 + k) * r * 0.7); ctx.stroke();
  }
  ctx.globalAlpha = 0.95; ctx.shadowBlur = 20;
  ctx.fillStyle = '#5ad0ff'; ctx.beginPath(); ctx.moveTo(r * 2.2, 0); ctx.quadraticCurveTo(r * 0.5, -r * 1.2, -r * 1.3, -r * 0.5); ctx.quadraticCurveTo(-r * 0.5, 0, -r * 1.3, r * 0.5); ctx.quadraticCurveTo(r * 0.5, r * 1.2, r * 2.2, 0); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(r * 0.5, 0, r * 0.75, r * 0.32, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
const _dtp = drawThemedProjectile;
drawThemedProjectile = function(p){
  if(p && p.pyroArc && !p.kind){ try { drawBolt(p); return true; } catch(err) { warn('bolt', err); } }
  return _dtp.apply(this, arguments);
};

/* ---------- аура у ног ---------- */
window.drawPyroArcanaAura = function(u){
  try {
    if(!isPyroArcana(u)) return;
    const base = u.radius + 6, n = 10;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = '#2f7bff'; ctx.shadowBlur = 16;
    for(let i = 0; i < n; i++){
      const a = i / n * Math.PI * 2 + gameTime * 0.8, fl = 0.5 + 0.5 * Math.sin(gameTime * 9 + i * 1.9);
      const h = 18 * (0.55 + fl * 0.75), w = 4.8, bx = Math.cos(a) * base, by = Math.sin(a) * base * 0.62 + 8;
      ctx.globalAlpha = 0.6; ctx.fillStyle = COLS[i % 3];
      ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.quadraticCurveTo(bx - w * 0.3, by - h * 0.6, bx + Math.sin(gameTime * 6 + i) * 3, by - h); ctx.quadraticCurveTo(bx + w * 0.3, by - h * 0.6, bx + w, by); ctx.closePath(); ctx.fill();
    }
    ctx.shadowBlur = 10; ctx.globalAlpha = 0.7; ctx.strokeStyle = '#bfeaff'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for(let i = 0; i < 3; i++){ const a0 = -gameTime * 1.4 + i * Math.PI * 2 / 3; ctx.beginPath(); ctx.ellipse(0, 8, base + 10, (base + 10) * 0.62, 0, a0, a0 + 1.0); ctx.stroke(); }
    ctx.restore();
  } catch(err) { warn('aura', err); }
};
})();
