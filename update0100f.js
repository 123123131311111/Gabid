/* DotaSense 0.10.0 (дополнение) — НОВЫЕ СКИНЫ.
   • Шадоу, ЛЕГЕНДАРНЫЙ «ПУСТОТНЫЙ ЖНЕЦ» (shadowVoid): атака — летящая душа с призрачным хвостом, аура из душ у ног.
     (Койлы и Реквием перекрашены прямо в game.js, облик героя рисует hero3d.js.)
   • Иллюзионист, РЕДКИЙ «РОЗОВЫЙ ФОКУСНИК» (illusionistPrism): атака — летящая карта с искрами, розовые цвета скиллов, звёздочки у ног.
   Только визуал: характеристики, урон, кулдауны и радиусы не меняются. Подключается после update0100e.js. */
(function(){
'use strict';
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update0100f ' + tag + ':', err); } catch(e) {} } };
function isVoidShadow(h){ return !!(h && h.def && h.def.id === 'shadow' && baseSkin(h.skinId) === 'shadowVoid'); }
function isPrism(h){ return !!(h && h.def && h.def.id === 'illusionist' && baseSkin(h.skinId) === 'illusionistPrism'); }
const VCOLS = ['#b06bff', '#7df3ff', '#ffffff', '#7a3cff'];
const PCOLS = ['#ff7ad9', '#ffd568', '#fff4ff', '#b58cff'];

/* ---------- атака ---------- */
const _sp = spawnProjectile;
spawnProjectile = function(x, y, target, dmg, source){
  const p = _sp.apply(this, arguments);
  try {
    const o = projectileOwner(p);
    if(p && isVoidShadow(o)){
      p.voidSoul = true; p.color = '#b06bff'; p.radius = Math.max(p.radius || 8, 11);
      const fx = x + Math.cos(o.facing || 0) * 44, fy = y + Math.sin(o.facing || 0) * 44;
      fxRing(fx, fy, 30, '#7df3ff', 0.22); spawnParticles(fx, fy, '#b06bff', 8, 0.8); spawnParticles(fx, fy, '#7df3ff', 5, 0.6);
    } else if(p && isPrism(o)){
      p.prismCard = true; p.color = '#ff7ad9'; p.radius = Math.max(p.radius || 7, 9);
      const fx = x + Math.cos(o.facing || 0) * 40, fy = y + Math.sin(o.facing || 0) * 40;
      fxRing(fx, fy, 24, '#ff7ad9', 0.2); spawnParticles(fx, fy, '#ffd568', 7, 0.7); spawnParticles(fx, fy, '#ff7ad9', 5, 0.6);
    }
  } catch(err) { warn('proj', err); }
  return p;
};

function drawSoul(p){
  const r = Math.max(8, p.radius || 11), a = projectileHeading(p), tm = gameTime * 12;
  if(Math.random() < 0.4) particles.push({x: p.x + rnd(-4, 4), y: p.y + rnd(-4, 4), vx: rnd(-20, 20), vy: rnd(-50, -15),
    color: VCOLS[(Math.random() * 3) | 0], size: rnd(2, 4), t: 0, life: rnd(0.35, 0.7), gravity: -20, drag: 0.96, spark: true});
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.globalAlpha = 0.24; ctx.fillStyle = '#7a3cff'; ctx.shadowColor = '#b06bff'; ctx.shadowBlur = 26;
  ctx.beginPath(); ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2); ctx.fill();
  for(let k = -1; k <= 1; k++){                      /* призрачный хвост из трёх лент */
    ctx.globalAlpha = k ? 0.5 : 0.75; ctx.strokeStyle = k ? '#b06bff' : '#7df3ff'; ctx.lineWidth = Math.max(2, r * (k ? 0.3 : 0.42));
    ctx.beginPath(); ctx.moveTo(-r * 0.5, k * r * 0.3);
    ctx.quadraticCurveTo(-r * 2.2, k * r * 1.0 + Math.sin(tm + k * 2.1) * r * 0.55, -r * 4.4, k * r * 1.7 + Math.sin(tm * 0.8 + k) * r * 0.8); ctx.stroke();
  }
  ctx.globalAlpha = 0.95; ctx.shadowBlur = 20; ctx.fillStyle = '#b06bff';
  ctx.beginPath(); ctx.ellipse(0, 0, r * 1.15, r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7df3ff'; ctx.beginPath(); ctx.ellipse(r * 0.2, 0, r * 0.7, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(r * 0.3, 0, r * 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function drawCard(p){
  const r = Math.max(8, p.radius || 9), a = projectileHeading(p), tm = gameTime * 10;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.globalAlpha = 0.2; ctx.fillStyle = '#ff7ad9'; ctx.shadowColor = '#ff7ad9'; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(0, 0, r * 2.3, 0, Math.PI * 2); ctx.fill();
  for(let k = 0; k < 4; k++){                        /* искры позади карты */
    ctx.globalAlpha = 0.7 - k * 0.14; ctx.fillStyle = PCOLS[k % 4];
    const sx = -r * (1.6 + k * 1.2), sy = Math.sin(tm + k * 1.7) * r * 0.9, s = r * (0.34 - k * 0.05);
    ctx.fillRect(sx - s, sy - s * 0.25, s * 2, s * 0.5); ctx.fillRect(sx - s * 0.25, sy - s, s * 0.5, s * 2);
  }
  ctx.rotate(tm * 0.6);                              /* вращающаяся карта */
  const w = r * 1.0, h = r * 1.45;
  ctx.globalAlpha = 0.95; ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffd568'; ctx.fillRect(-w - 1.5, -h - 1.5, (w + 1.5) * 2, (h + 1.5) * 2);
  ctx.fillStyle = '#fff4ff'; ctx.fillRect(-w, -h, w * 2, h * 2);
  ctx.fillStyle = '#ff7ad9'; ctx.beginPath(); ctx.moveTo(0, -h * 0.55); ctx.lineTo(w * 0.55, 0); ctx.lineTo(0, h * 0.55); ctx.lineTo(-w * 0.55, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
}
const _dtp = drawThemedProjectile;
drawThemedProjectile = function(p){
  if(p && !p.kind){
    try {
      if(p.voidSoul){ drawSoul(p); return true; }
      if(p.prismCard){ drawCard(p); return true; }
    } catch(err) { warn('draw', err); }
  }
  return _dtp.apply(this, arguments);
};

/* ---------- цвета скиллов Иллюзиониста ---------- */
const _sfc = skillFxColor;
skillFxColor = function(hero, skillId){
  if(isPrism(hero) && /illusion/i.test(String(skillId))) return '#ff7ad9';
  if(isVoidShadow(hero) && /shadow/i.test(String(skillId))) return '#b06bff';
  return _sfc.apply(this, arguments);
};

/* ---------- аура у ног ---------- */
window.drawNewSkinAura = function(u){
  try {
    const base = (u.radius || 28) + 6;
    if(isVoidShadow(u)){
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = '#7a3cff'; ctx.shadowBlur = 16;
      for(let i = 0; i < 9; i++){                    /* души-огоньки поднимаются вокруг */
        const a = i / 9 * Math.PI * 2 + gameTime * 0.7, ph = (gameTime * 0.6 + i * 0.37) % 1;
        const bx = Math.cos(a) * base, by = Math.sin(a) * base * 0.62 + 10 - ph * 34;
        ctx.globalAlpha = 0.7 * (1 - ph); ctx.fillStyle = VCOLS[i % 3];
        ctx.beginPath(); ctx.ellipse(bx, by, 3.2, 5.5 * (1 - ph * 0.4), 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.shadowBlur = 12; ctx.globalAlpha = 0.5; ctx.strokeStyle = '#7df3ff'; ctx.lineWidth = 1.6; ctx.lineJoin = 'round';
      { const R = base + 16, pts = []; for(let i = 0; i < 5; i++){ const a = gameTime * 0.5 + i * Math.PI * 2 / 5; pts.push([Math.cos(a) * R, Math.sin(a) * R * 0.62 + 8]); }
        ctx.beginPath(); for(let i = 0; i < 6; i++){ const q = pts[(i * 2) % 5]; if(i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); } ctx.stroke(); }
      ctx.shadowBlur = 10; ctx.globalAlpha = 0.7; ctx.lineCap = 'round'; ctx.lineWidth = 2.2;
      for(let i = 0; i < 3; i++){ const a0 = -gameTime * 1.3 + i * Math.PI * 2 / 3; ctx.strokeStyle = i % 2 ? '#7df3ff' : '#b06bff'; ctx.beginPath(); ctx.ellipse(0, 8, base + 10, (base + 10) * 0.62, 0, a0, a0 + 1.0); ctx.stroke(); }
      ctx.restore();
    } else if(isPrism(u)){
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.shadowColor = '#ff7ad9'; ctx.shadowBlur = 12;
      for(let i = 0; i < 6; i++){                    /* мерцающие звёздочки по кругу */
        const a = -i / 6 * Math.PI * 2 + gameTime * 0.9, tw = 0.5 + 0.5 * Math.sin(gameTime * 6 + i * 1.9);
        const bx = Math.cos(a) * (base + 8), by = Math.sin(a) * (base + 8) * 0.62 + 8, s = 2 + tw * 4;
        ctx.globalAlpha = 0.45 + tw * 0.4; ctx.fillStyle = PCOLS[i % 4];
        ctx.fillRect(bx - s, by - 0.9, s * 2, 1.8); ctx.fillRect(bx - 0.9, by - s, 1.8, s * 2);
      }
      ctx.globalAlpha = 0.55; ctx.strokeStyle = '#ff7ad9'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      for(let i = 0; i < 2; i++){ const a0 = gameTime * 1.1 + i * Math.PI; ctx.beginPath(); ctx.ellipse(0, 8, base + 6, (base + 6) * 0.62, 0, a0, a0 + 1.2); ctx.stroke(); }
      ctx.restore();
    }
  } catch(err) { warn('aura', err); }
};
})();
