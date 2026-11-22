/* =========================================================
   DotaSense 0.10.8 — «СВЕТ И УДАР»
   Подключается последним, поверх game.js и update*.js, обёртками (старый код не тронут).
   1) Динамическое освещение: мягкий световой слой в 1/4 разрешения — тёплые пятна света вокруг героев,
      цветной свет от снарядов, заклинаний, башен и рун; остальная сцена чуть приглушается и уходит
      в прохладный оттенок. Даёт объём и «киношную» картинку почти бесплатно (2 растяжения маленького canvas).
   2) Следы ударов ближнего боя: светящийся полумесяц по дуге замаха.
   3) Реакция на попадание: короткое «сжатие» и белая вспышка у получившего урон.
   4) Лёгкое «дыхание» героев в покое.
   0.10.8.1: тени облаков, светящиеся следы снарядов, выжженная земля после заклинаний, свет команды под героями.
   Всё зависит от уровня графики: освещение — «Высокая»/«Средняя», удары и вспышки — до «Низкой»,
   на «Супер низкой» модуль выключается полностью.
   ========================================================= */
(function(){
'use strict';
const G = window;
const TAU = Math.PI * 2;
const now = () => performance.now();
const safe = fn => function(){ try { return fn.apply(this, arguments); } catch(err){ if(!safe.w){ safe.w = 1; console.warn('visual-boost:', err); } } };

const VB = G.__visualBoost = {on: true, slashes: [], lightScale: 0.25, lights: 0};
function level(){ return typeof perfLevel === 'number' ? perfLevel : 0; }
function lightingOn(){ return VB.on && level() <= 1 && (typeof GFX === 'undefined' || GFX.decor !== 0); }
function strikesOn(){ return VB.on && level() <= 2; }

/* ---------- кэш цветных «пятен света» ---------- */
const glowCache = new Map();
function glowSprite(color){
  let c = glowCache.get(color);
  if(c) return c;
  if(glowCache.size > 96) glowCache.clear();
  const R = 64;
  c = document.createElement('canvas'); c.width = c.height = R * 2;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(R, R, 0, R, R, R);
  try {
    gr.addColorStop(0, color); gr.addColorStop(0.35, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  } catch(err){ gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, 'rgba(0,0,0,0)'); }
  g.fillStyle = gr; g.fillRect(0, 0, R * 2, R * 2);
  /* мягкий спад к краю: пятно гаснет без видимой границы */
  g.globalCompositeOperation = 'destination-in';
  const fall = g.createRadialGradient(R, R, R * 0.1, R, R, R);
  fall.addColorStop(0, 'rgba(0,0,0,1)'); fall.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = fall; g.fillRect(0, 0, R * 2, R * 2);
  glowCache.set(color, c);
  return c;
}

/* ---------- 1. освещение ---------- */
const light = {cv: document.createElement('canvas'), ctx: null, mix: document.createElement('canvas'), mctx: null};
light.ctx = light.cv.getContext('2d');
light.mctx = light.mix.getContext('2d');
const AMBIENT = 'rgb(206,206,222)';
const CLOUDS = [];
(function(){ let z = 9127; const r = () => (z = (z * 1664525 + 1013904223) >>> 0) / 4294967296;
  for(let i = 0; i < 9; i++) CLOUDS.push({x: r() * 9000, y: r() * 9000, r: 520 + r() * 620, a: 0.16 + r() * 0.12}); })();          /* приглушение сцены вне света: −14…19%, холодный оттенок */
const HERO_LIGHT = 'rgba(255,236,200,0.95)';
const TEAM_LIGHT = ['rgba(150,215,255,0.8)', 'rgba(255,150,120,0.8)'];
function onScreen(x, y, r){
  const sx = x - cam.x + VW / 2, sy = y - cam.y + VH / 2;
  return sx > -r && sy > -r && sx < VW + r && sy < VH + r;
}
function visible(u){
  try { return typeof isVisibleToPlayer === 'function' ? isVisibleToPlayer(u) : true; } catch(err){ return true; }
}
function drawLighting(){
  const s = VB.lightScale;
  const w = Math.max(8, Math.ceil(VW * s)), h = Math.max(8, Math.ceil(VH * s));
  const L = light.ctx, cv = light.cv;
  if(cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  L.setTransform(1, 0, 0, 1, 0, 0);
  L.globalCompositeOperation = 'source-over';
  L.globalAlpha = 1;
  L.fillStyle = '#000';
  L.fillRect(0, 0, w, h);
  L.globalCompositeOperation = 'lighter';
  const ox = -cam.x + VW / 2, oy = -cam.y + VH / 2;
  let n = 0;
  const put = (x, y, r, color, a) => {
    if(n >= 90 || !(r > 0) || !onScreen(x, y, r)) return;
    n++;
    L.globalAlpha = a;
    const d = r * 2 * s;
    L.drawImage(glowSprite(color), (x + ox - r) * s, (y + oy - r) * s, d, d);
  };
  /* герои: тёплый свет; свои — чуть сильнее */
  for(const hh of heroes){
    if(!hh || hh.dead || hh.isIllusion || !visible(hh)) continue;
    put(hh.x, hh.y, hh === playerHero ? 320 : 240, HERO_LIGHT, hh.team === 0 ? 0.42 : 0.3);
  }
  /* башни и трон — свет своей команды */
  for(const u of units){
    if(u.dead || (u.type !== 'tower' && u.type !== 'ancient') || u.alive === false) continue;
    put(u.x, u.y, u.type === 'ancient' ? 420 : 300, TEAM_LIGHT[u.team === 0 ? 0 : 1], 0.45);
  }
  for(const p of projectiles){ if(!p.dead) put(p.x, p.y, Math.max(70, (p.radius || 6) * 12), p.color || '#ffffff', p.isSpell ? 0.75 : 0.45); }
  for(const a of aoes){ if(!a.dead) put(a.x, a.y, (a.radius || 100) * 1.25, a.color || '#ffcc66', 0.55 * Math.max(0, 1 - (a.t || 0) / ((a.delay || 0) + (a.life || 0.45) + 0.001))); }
  for(const f of fxs){
    if(f.type !== 'ring' && f.type !== 'hit') continue;
    const k = 1 - (f.t || 0) / (f.life || 0.4);
    if(k > 0) put(f.x, f.y, Math.max(80, (f.r || 40) * 1.4), f.color || '#ffffff', 0.5 * k);
  }
  if(typeof runes !== 'undefined' && runes) for(const r of runes){ if(r && !r.taken && !r.dead && Number.isFinite(r.x)) put(r.x, r.y, 160, r.color || '#b48cff', 0.5); }
  for(const sl of VB.slashes) put(sl.x, sl.y, sl.r * 1.6, sl.color, 0.5 * (1 - sl.t / sl.life));
  VB.lights = n;
  L.globalAlpha = 1;
  L.globalCompositeOperation = 'source-over';

  /* карта освещённости = приглушённый фон + пятна света */
  const M = light.mctx, mx = light.mix;
  if(mx.width !== w || mx.height !== h){ mx.width = w; mx.height = h; }
  M.globalCompositeOperation = 'source-over';
  M.fillStyle = AMBIENT; M.fillRect(0, 0, w, h);
  /* тени облаков: большие мягкие пятна медленно плывут по карте (считаются в 1/4 разрешения — почти бесплатно) */
  if(level() === 0){
    const tt = now() / 1000, dark = glowSprite('rgba(0,0,0,1)');
    for(let i = 0; i < CLOUDS.length; i++){
      const c = CLOUDS[i];
      const span = WORLD + 2400;
      const wx = ((c.x + tt * 26) % span + span) % span - 1200, wy = ((c.y + tt * 11) % span + span) % span - 1200;
      const sx = (wx + ox) * s, sy = (wy + oy) * s, rr = c.r * s;
      if(sx < -rr || sy < -rr || sx > w + rr || sy > h + rr) continue;
      M.globalAlpha = c.a;
      M.drawImage(dark, sx - rr, sy - rr * 0.7, rr * 2, rr * 1.4);
    }
    M.globalAlpha = 1;
  }
  M.globalCompositeOperation = 'lighter';
  M.drawImage(cv, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(mx, 0, 0, VW, VH);
  /* «излучающий» проход: только сами пятна света слегка подсвечивают картинку (фон не засвечивается) */
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = level() === 0 ? 0.16 : 0.11;
  ctx.drawImage(cv, 0, 0, VW, VH);
  ctx.restore();
}

/* ---------- 2. следы ударов ближнего боя ---------- */
function isMelee(hh){ return hh && hh.def && (hh.def.atkRange || 999) <= 250; }
function trackSwings(){
  for(const hh of heroes){
    if(!hh || hh.dead || !isMelee(hh)){ if(hh) hh._vbSwing = false; continue; }
    const swinging = !!hh.isAttacking;
    if(swinging && !hh._vbSwing && onScreen(hh.x, hh.y, 200) && visible(hh)){
      const ang = Number.isFinite(hh.attackAngle) ? hh.attackAngle : (hh.facing || 0);
      const reach = (hh.radius || 22) + Math.min(110, (hh.getAttackRange ? hh.getAttackRange() : hh.def.atkRange) * 0.55);
      if(VB.slashes.length > 24) VB.slashes.shift();
      VB.slashes.push({x: hh.x, y: hh.y, a: ang, r: reach, t: 0, life: 0.2, dir: (hh._vbFlip = !hh._vbFlip) ? 1 : -1,
        color: hh.def.color || '#ffe0a0', owner: hh});
    }
    hh._vbSwing = swinging;
  }
}
function drawSlashes(dt){
  if(!VB.slashes.length) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  let w = 0;
  for(let i = 0; i < VB.slashes.length; i++){
    const sl = VB.slashes[i];
    sl.t += dt;
    if(sl.t >= sl.life) continue;
    VB.slashes[w++] = sl;
    if(sl.owner && !sl.owner.dead){ sl.x = sl.owner.x; sl.y = sl.owner.y; }   /* дуга следует за бойцом */
    const k = sl.t / sl.life, fade = 1 - k;
    const span = 1.9, head = -span / 2 + span * Math.min(1, k * 1.6);   /* быстрый взмах, затем угасание */
    const tail = Math.max(-span / 2, head - 1.25);
    const a0 = sl.a + sl.dir * tail, a1 = sl.a + sl.dir * head;
    const ccw = sl.dir < 0;
    for(const [lw, alpha, col] of [[16, 0.22, sl.color], [8, 0.45, sl.color], [3, 0.9, '#ffffff']]){
      ctx.globalAlpha = alpha * fade;
      ctx.strokeStyle = col;
      ctx.lineWidth = lw * (0.6 + 0.4 * fade);
      ctx.beginPath();
      ctx.arc(sl.x, sl.y, sl.r, a0, a1, ccw);
      ctx.stroke();
    }
  }
  VB.slashes.length = w;
  ctx.restore();
}

/* ---------- 3. реакция на попадание ---------- */
if(typeof applyDamage === 'function'){
  const origApplyDamage = applyDamage;
  applyDamage = function(target, amount, source){
    const r = origApplyDamage.apply(this, arguments);
    if(target && amount > 0 && !target.dead && (target.type === 'hero' || target.type === 'creep' || target.type === 'neutral')){
      target._vbHitT = now();
      target._vbHitK = Math.min(1, 0.45 + amount / Math.max(60, (target.maxHp || 300) * 0.12));
    }
    return r;
  };
}

/* ---------- 4. обёртка отрисовки бойца: сжатие от удара + дыхание ---------- */
if(typeof drawUnitSafely === 'function'){
  const origDraw = drawUnitSafely;
  drawUnitSafely = function(u){
    if(!VB.on || !u || level() >= 3 || u.type === 'tower' || u.type === 'ancient' || gameState === 'menu'){ return origDraw(u); }
    const t = now();
    const hitAge = u._vbHitT ? (t - u._vbHitT) / 140 : 9;
    let sx = 1, sy = 1;
    if(hitAge < 1){
      const k = (1 - hitAge) * (u._vbHitK || 0.6);
      sx = 1 + 0.07 * k; sy = 1 - 0.06 * k;
    } else if(u.type === 'hero' && !u.dead && !u.moving && !u.isAttacking){
      const b = Math.sin(t * 0.0026 + (u.x * 0.013)) * 0.018;
      sx = 1 - b * 0.5; sy = 1 + b;
    }
    /* мягкий свет команды под ногами героя — бойцы лучше читаются на любой земле */
    if(u.type === 'hero' && !u.dead && level() <= 1 && !u.isIllusion){
      const rr = (u.radius || 22) * 2.4;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = u === playerHero ? 0.3 : 0.2;
      ctx.drawImage(glowSprite(u.team === 0 ? 'rgba(120,220,255,1)' : 'rgba(255,110,90,1)'), u.x - rr, u.y + (u.radius || 22) * 0.55 - rr * 0.42, rr * 2, rr * 0.84);
      ctx.restore();
    }
    if(sx === 1 && sy === 1) return origDraw(u);
    ctx.save();
    /* опорная точка — «ноги» бойца, чтобы он не отрывался от земли */
    const fy = u.y + (u.radius || 18) * 0.6;
    ctx.translate(u.x, fy); ctx.scale(sx, sy); ctx.translate(-u.x, -fy);
    try { origDraw(u); } finally { ctx.restore(); }
    if(hitAge < 1 && strikesOn() && !u.dead){
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.2 * (1 - hitAge) * (u._vbHitK || 0.6);
      const r = (u.radius || 18) * 1.15;
      ctx.drawImage(glowSprite('rgba(255,240,220,1)'), u.x - r, u.y - r * 1.1, r * 2, r * 2);
      ctx.restore();
    }
  };
}

/* ---------- 5. следы снарядов ---------- */
function drawTrails(){
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for(const p of projectiles){
    if(p.dead || !Number.isFinite(p.x) || !onScreen(p.x, p.y, 140)){ if(p._vbTr) p._vbTr.length = 0; continue; }
    const tr = p._vbTr || (p._vbTr = []);
    tr.push(p.x, p.y);
    if(tr.length > 16) tr.splice(0, tr.length - 16);
    const n = tr.length >> 1;
    if(n < 2) continue;
    const wBase = Math.min(9, Math.max(3, (p.radius || 6) * (p.isSpell ? 1.1 : 0.8)));
    ctx.strokeStyle = p.color || '#ffffff';
    for(let i = 1; i < n; i++){
      const k = i / (n - 1);
      ctx.globalAlpha = 0.5 * k;
      ctx.lineWidth = wBase * (0.25 + 0.75 * k);
      ctx.beginPath(); ctx.moveTo(tr[(i - 1) * 2], tr[(i - 1) * 2 + 1]); ctx.lineTo(tr[i * 2], tr[i * 2 + 1]); ctx.stroke();
    }
    /* яркое ядро снаряда */
    ctx.globalAlpha = p.isSpell ? 0.32 : 0.22;
    const gr = Math.min(22, wBase * 1.8);
    ctx.drawImage(glowSprite(p.color || '#ffffff'), p.x - gr, p.y - gr, gr * 2, gr * 2);
  }
  ctx.restore();
}

/* ---------- 6. выжженная земля после заклинаний ---------- */
const DECALS = [];
function addDecal(x, y, r, color){
  if(!Number.isFinite(x) || !Number.isFinite(y) || !(r > 30)) return;
  if(DECALS.length > 28) DECALS.shift();
  DECALS.push({x, y, r: Math.min(r, 420), color: color || '#ff8a3d', t: 0, life: 5.5, rot: Math.random() * TAU});
}
let decalLast = 0;
function drawDecals(){
  const t = now(), dt = decalLast ? Math.min(0.1, (t - decalLast) / 1000) : 0; decalLast = t;
  if(!DECALS.length) return;
  const dark = glowSprite('rgba(18,10,6,1)');
  ctx.save();
  let w = 0;
  for(let i = 0; i < DECALS.length; i++){
    const d = DECALS[i]; d.t += dt;
    if(d.t >= d.life) continue;
    DECALS[w++] = d;
    if(!onScreen(d.x, d.y, d.r)) continue;
    const k = d.t / d.life, fade = k < 0.08 ? k / 0.08 : 1 - Math.pow((k - 0.08) / 0.92, 2);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.42 * fade;
    ctx.drawImage(dark, d.x - d.r, d.y - d.r * 0.82, d.r * 2, d.r * 1.64);
    /* тлеющий край — быстро гаснет */
    const ember = Math.max(0, 1 - d.t / 1.6);
    if(ember > 0){
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 * ember;
      ctx.strokeStyle = d.color; ctx.lineWidth = 3 + 5 * ember;
      ctx.beginPath(); ctx.ellipse(d.x, d.y, d.r * 0.78, d.r * 0.64, d.rot, 0, TAU); ctx.stroke();
    }
  }
  DECALS.length = w;
  ctx.restore();
}
if(typeof spawnAoE === 'function'){
  const origAoE = spawnAoE;
  spawnAoE = function(x, y, radius, dmg, source, delay, color){
    const r = origAoE.apply(this, arguments);
    try { if(strikesOn() && radius >= 90) addDecal(x, y, radius, color); } catch(err) {}
    return r;
  };
}
if(typeof drawItemRangePreview === 'function'){
  const origPrev = drawItemRangePreview;
  drawItemRangePreview = function(){
    try { if(gameState !== 'menu' && strikesOn()) drawDecals(); else DECALS.length = 0; } catch(err) {}
    return origPrev.apply(this, arguments);
  };
}

/* ---------- подключение к кадру ---------- */
let lastT = 0;
if(typeof fx973World === 'function'){
  const origWorld = fx973World;
  fx973World = safe(function(){
    origWorld();
    if(gameState === 'menu') return;
    const t = now(), dt = lastT ? Math.min(0.1, (t - lastT) / 1000) : 0; lastT = t;
    if(!strikesOn()){ VB.slashes.length = 0; return; }
    trackSwings();
    if(level() <= 1) drawTrails();
    drawSlashes(dt);
  });
}
if(typeof fx973Post === 'function'){
  const origPost = fx973Post;
  fx973Post = safe(function(){
    if(gameState !== 'menu' && lightingOn()) drawLighting();
    origPost();
  });
}
/* F7 — включить/выключить новые эффекты (для сравнения «до/после») */
G.addEventListener('keydown', e => {
  if(e.key === 'F7'){ e.preventDefault(); VB.on = !VB.on;
    try { perfNoticeText = 'Новые эффекты (свет, удары): ' + (VB.on ? 'ВКЛ' : 'ВЫКЛ') + ' — F7'; perfNoticeUntil = now() + 2500; } catch(err){} }
});
})();
