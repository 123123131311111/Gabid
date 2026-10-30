/* DotaSense 0.10.1 — НОВЫЙ ГЕРОЙ «ВЫСЕЛКИ».
   Двухголовый красный орк, ближний бой, 4 навыка:
     Q «Свора»          — призывает 3 пса. Псы нападают на врагов только в пределах радиуса вокруг героя, иначе держатся рядом.
     W «Град голов»     — Выселки отрывает одну из голов и 8 раз с бешеной скоростью швыряет её во врага.
     E «Каменная шкура» — +80% сопротивления урону на 6 секунд.
     R «Стая и головы»  — вызывает 4 крепких пса и бросает вокруг героя 12 голов: они разлетаются, быстро кружат и возвращаются.
   Подключается после update01007.js. Модели (орк и пёс) лежат в hero3d.js, отрисовка псов — в game.js. */
(function(){
'use strict';
const G = window, TAU = Math.PI * 2;
const snd = (k, v) => { try { playSynthSfx(k, {volume: v == null ? 1 : v}); } catch(e) {} };
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update0101 ' + tag + ':', err); } catch(e) {} } };
const fxLv = () => (typeof fxl === 'function' ? fxl() : 0);
const isLite = () => (typeof perfLite === 'function' && perfLite());
const al = v => Math.max(0, Math.min(1, v)).toFixed(3);
const isVy = h => !!(h && h.def && h.def.id === 'vyselki');
const shake = (m, d) => { const F = G.__fx973; if(F && fxLv() < 2){ F.shakeMag = Math.max(F.shakeMag, m); F.shakeT = F.shakeDur = d; } };

/* ---------- числа ---------- */
const DOG_HP   = [0, 260, 340, 430, 520];
const DOG_DMG  = [0, 38, 50, 62, 76];
const DOG_LEASH = 700;                                   /* радиус вокруг героя, в котором псы Q нападают на врагов */
const HEAD_DMG = [0, 55, 80, 105, 135];                  /* урон каждой из 8 голов W */
const HEAD_N = 8, HEAD_INTERVAL = 0.1, HEAD_SPEED = 2600, W_RANGE = 900;
const GUARD_DUR = 6, GUARD_RESIST = 0.80;                /* E: +80% к сопротивлению урону на 6 с */
const R_DOGS = 4, R_HEADS = 12;
const R_DOG_HP = [0, 560, 700, 860], R_DOG_DMG = [0, 70, 90, 112], R_LEASH = 950;
const R_HEAD_DMG = [0, 170, 250, 340];

/* ---------- звуки ---------- */
Object.assign(SFX_PRESETS, {
  vyBark:  {from:520, to:210, duration:0.22, type:'sawtooth', volume:0.08, noise:0.35, layers:[[300,120,0,0.2,'square',0.05]]},
  vyThrow: {from:900, to:240, duration:0.12, type:'triangle', volume:0.05, noise:0.5, layers:[[1500,500,0,0.08,'square',0.025]]},
  vyHit:   {from:260, to:70, duration:0.16, type:'square', volume:0.07, noise:0.7, layers:[[110,45,0,0.15,'sine',0.1]]},
  vyGuard: {from:120, to:260, duration:0.6, type:'sawtooth', volume:0.09, noise:0.5, layers:[[70,150,0,0.6,'square',0.07],[500,900,0.1,0.3,'triangle',0.03]]},
  vyRoar:  {from:110, to:60, duration:1.0, type:'sawtooth', volume:0.13, noise:0.7, layers:[[70,40,0,1.0,'square',0.1],[300,150,0.05,0.7,'sawtooth',0.05],[600,200,0.1,0.4,'triangle',0.03]]}
});

/* ---------- состояние ---------- */
const VC = {heads: [], volleys: [], gt: 0};
const HEAD_MAX = 80;

const enemyOk = (t, team) => t && !t.dead && t.team !== team && t.team !== 2 && !isBuilding(t) && !isStructure(t) && !t.invulnerable && !isHiddenFrom(t, team);
function nearestEnemyTo(x, y, team, maxD){
  let best = null, bd = (maxD || 1e9) * (maxD || 1e9);
  for(const u of units){
    if(!enemyOk(u, team)) continue;
    const d = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
    if(d < bd){ bd = d; best = u; }
  }
  return best;
}

/* ======================================================================
   ПСЫ
   ====================================================================== */
function spawnDog(h, x, y, o){
  x = clamp(x, 60, WORLD - 60); y = clamp(y, 60, WORLD - 60);
  const dog = new TimedSummon(h, x, y, {
    kind:'vyDog', life:o.life, hp:o.hp, dmg:o.dmg, radius:o.big ? 26 : 22, speed:o.big ? 380 : 340,
    atkRange:96, atkTime:o.big ? 0.62 : 0.72, armor:o.big ? 5 : 3, copyColor:'#8a2a1e'
  });
  dog.vyLeash = o.leash;
  dog.vySlot = o.slot || 0;
  dog.updateAI = function(dt){
    this.life -= dt;
    if(this.life <= 0 || !this.owner){ this.dead = true; return; }
    const ow = this.owner;
    let tg = this.attackTarget;
    /* цель теряется, если умерла или ушла за радиус вокруг героя */
    if(tg && (!enemyOk(tg, this.team) || Math.hypot(tg.x - ow.x, tg.y - ow.y) > this.vyLeash + 140)) tg = null;
    if(!tg){
      let best = null, bd = 1e12;
      for(const u of units){
        if(!enemyOk(u, this.team)) continue;
        if(Math.hypot(u.x - ow.x, u.y - ow.y) > this.vyLeash) continue;
        const d = (u.x - this.x) * (u.x - this.x) + (u.y - this.y) * (u.y - this.y) + (u.type === 'hero' ? 0 : 160000);   /* герои в приоритете */
        if(d < bd){ bd = d; best = u; }
      }
      tg = best;
    }
    this.attackTarget = tg;
    if(tg){ this.moveTarget = null; return; }
    /* врагов в радиусе нет — держимся рядом с героем */
    const a = this.vySlot * 2.1 + gameTime * 0.4, ox = ow.x + Math.cos(a) * 110, oy = ow.y + Math.sin(a) * 110;
    this.moveTarget = Math.hypot(this.x - ow.x, this.y - ow.y) > 170 ? {x: ox, y: oy} : null;
  };
  units.push(dog);
  fxRing(x, y, 60, '#ff5a3a', 0.45);
  spawnParticles(x, y, '#ff7a4a', isLite() ? 4 : 10, 0.9);
  return dog;
}

/* ======================================================================
   ГОЛОВЫ
   kind 't' — бросок W: летит в цель на огромной скорости.
   kind 'r' — ульта: вылет по кругу, быстрое кружение вокруг героя и возврат.
   ====================================================================== */
function pushHead(o){
  if(VC.heads.length >= HEAD_MAX) VC.heads.shift();
  const hd = Object.assign({x:0, y:0, rot:Math.random() * TAU, spin:(Math.random() < 0.5 ? -1 : 1) * (14 + Math.random() * 8), dead:false,
    age:0, trail:[], scale:1}, o);
  VC.heads.push(hd);
  return hd;
}
function headHit(hd, u, dmg){
  applyDamage(u, abilityDamage(hd.src, dmg), hd.src);
  if(u.dead) { snd('vyHit', 0.5); return; }
  u.hitFlash = Math.max(u.hitFlash || 0, 0.2);
  if(!isLite() && fxLv() < 2){ spawnParticles(u.x, u.y, '#ff4a3a', 4, 0.7); }
  snd('vyHit', 0.35);
}

function volleyTick(v, dt){
  const h = v.src;
  if(!h || h.dead){ v.done = true; return; }
  v.timer -= dt;
  while(v.timer <= 0 && v.fired < HEAD_N){
    v.timer += HEAD_INTERVAL;
    /* цель могла умереть — берём ближайшего врага рядом с героем */
    if(!enemyOk(v.target, h.team) || Math.hypot(v.target.x - h.x, v.target.y - h.y) > W_RANGE + 400){
      v.target = nearestEnemyTo(h.x, h.y, h.team, W_RANGE);
      if(!v.target){ v.done = true; return; }
    }
    const side = v.fired % 2 ? 1 : -1, f = Number.isFinite(h.facing) ? h.facing : 0;
    const sa = f + side * Math.PI / 2;
    pushHead({kind:'t', src:h, team:h.team, target:v.target, dmg:v.dmg, x:h.x + Math.cos(sa) * 34 + Math.cos(f) * 20, y:h.y + Math.sin(sa) * 34 + Math.sin(f) * 20 - 6,
      speed:HEAD_SPEED, life:1.2, hitR:34, scale:0.95});
    snd('vyThrow', 0.4);
    v.fired++;
  }
  if(v.fired >= HEAD_N) v.done = true;
}

function headTick(hd, dt){
  hd.age += dt; hd.rot += hd.spin * dt;
  hd.trail.push(hd.x, hd.y); if(hd.trail.length > 12) hd.trail.splice(0, 2);
  const src = hd.src;
  if(hd.kind === 't'){
    if(hd.age > hd.life){ hd.dead = true; return; }
    let tx, ty;
    if(enemyOk(hd.target, hd.team)){ tx = hd.target.x; ty = hd.target.y; }
    else {
      const n = nearestEnemyTo(hd.x, hd.y, hd.team, 600);
      if(n){ hd.target = n; tx = n.x; ty = n.y; } else { hd.dead = true; return; }
    }
    const dx = tx - hd.x, dy = ty - hd.y, dist = Math.hypot(dx, dy) || 1;
    const hr = hd.hitR + ((hd.target && hd.target.radius) || 20);
    if(dist <= hr){ headHit(hd, hd.target, hd.dmg); hd.dead = true; fxRing(hd.x, hd.y, 50, '#ff4a3a', 0.2); return; }
    const step = Math.min(dist, hd.speed * dt);
    hd.x += dx / dist * step; hd.y += dy / dist * step;
    return;
  }
  /* kind 'r' */
  if(!src || src.dead){ hd.dead = true; return; }
  hd.ph += dt;
  if(hd.phase === 0){                                    /* вылет: из центра по лучу */
    hd.r += hd.speed * dt;
    if(hd.r >= hd.rOrbit){ hd.r = hd.rOrbit; hd.phase = 1; hd.ph = 0; }
  } else if(hd.phase === 1){                             /* быстрое кружение вокруг героя */
    hd.ang += hd.w * dt;
    if(hd.ph >= hd.orbitT){ hd.phase = 2; hd.ph = 0; }
  } else {                                               /* возвращение */
    hd.r -= hd.speed * dt * 1.1;
    hd.ang += hd.w * dt * 0.5;
    if(hd.r <= 30){ hd.dead = true; return; }
  }
  hd.x = src.x + Math.cos(hd.ang) * hd.r; hd.y = src.y + Math.sin(hd.ang) * hd.r;
  hd.hitCd -= dt;
  /* удары: при вылете и возврате — один раз по каждому врагу, при кружении — через общий тик */
  for(const u of units){
    if(!enemyOk(u, hd.team)) continue;
    if(Math.hypot(u.x - hd.x, u.y - hd.y) > hd.hitR + (u.radius || 20)) continue;
    const rec = hd.pool.get(u);
    if(hd.phase === 1){
      if(rec && rec > gameTime) continue;
      hd.pool.set(u, gameTime + 0.4);
      headHit(hd, u, hd.dmg * 0.35);
    } else {
      const key = hd.phase === 0 ? 'o' : 'b';
      if(hd.once[key].has(u)) continue;
      hd.once[key].add(u);
      headHit(hd, u, hd.dmg);
      u.slow = Math.max(u.slowT > 0 ? u.slow : 0, 0.3); u.slowT = Math.max(u.slowT || 0, 0.6);
    }
  }
}

/* ======================================================================
   НАВЫКИ
   ====================================================================== */
Object.assign(SKILLS, {
  vyPack: {
    name:'Свора', short:'Q', type:'self', maxLevel:4,
    cd:[0, 26, 24, 22, 20], mana:[0, 90, 100, 110, 120],
    desc:'Призывает 3 пса на 20 секунд (здоровье 260/340/430/520, урон 38/50/62/76). Псы нападают на врагов, пока те в радиусе 700 вокруг Выселок; если врагов в радиусе нет — держатся рядом с героем.',
    cast(h, x, y, lvl){
      const L = Math.max(1, Math.min(4, lvl || 1));
      const f = Number.isFinite(h.facing) ? h.facing : 0;
      for(let i = 0; i < 3; i++){
        const a = f + (i - 1) * 0.9;
        spawnDog(h, h.x + Math.cos(a) * 90, h.y + Math.sin(a) * 90, {life:20, hp:DOG_HP[L], dmg:DOG_DMG[L], leash:DOG_LEASH, slot:i});
      }
      fxRing(h.x, h.y, 150, '#ff5a3a', 0.6);
      addText(h.x, h.y - 82, 'СВОРА!', '#ff7a4a', 1.2, 18);
      snd('vyBark', 0.8); snd('vyBark', 0.5);
      return true;
    }
  },
  vyHeads: {
    name:'Град голов', short:'W', type:'point', maxLevel:4, range:W_RANGE,
    cd:[0, 16, 14, 12, 10], mana:[0, 100, 110, 120, 130],
    desc:'Выселки отрывает одну из голов и швыряет её во врага 8 раз подряд с бешеной скоростью. Каждая голова наносит 55/80/105/135 урона. Дальность 900.',
    cast(h, x, y, lvl){
      const L = Math.max(1, Math.min(4, lvl || 1));
      let tg = nearestEnemyTo(x, y, h.team, 260);
      if(!tg || Math.hypot(tg.x - h.x, tg.y - h.y) > W_RANGE + 100) tg = nearestEnemyTo(h.x, h.y, h.team, W_RANGE);
      if(!tg){ try { flashMsg(h, 'Нет цели для голов'); } catch(e) {} return false; }
      VC.volleys.push({src:h, target:tg, fired:0, timer:0, dmg:HEAD_DMG[L], done:false});
      h.facing = Math.atan2(tg.y - h.y, tg.x - h.x);
      addText(h.x, h.y - 82, 'ГРАД ГОЛОВ!', '#ff5a3a', 1.1, 18);
      return true;
    }
  },
  vyGuard: {
    name:'Каменная шкура', short:'E', type:'self', maxLevel:4,
    cd:[0, 40, 36, 32, 28], mana:[0, 80, 90, 100, 110],
    desc:'Выселки каменеют: +80% сопротивления урону на 6 секунд. Весь входящий урон снижается на 80%.',
    cast(h){
      h.vyGuard = {t:GUARD_DUR, dur:GUARD_DUR};
      fxRing(h.x, h.y, 120, '#ffb347', 0.5);
      fxRing(h.x, h.y, 200, '#ff5a3a', 0.7);
      spawnParticles(h.x, h.y, '#c8b99a', isLite() ? 8 : 20, 1.2);
      shake(3, 0.3);
      addText(h.x, h.y - 82, 'КАМЕННАЯ ШКУРА +80%', '#ffb347', 1.4, 18);
      snd('vyGuard', 1.0);
      return true;
    }
  },
  vyUlt: {
    name:'Стая и головы', short:'R', type:'self', maxLevel:3, ult:true,
    cd:[0, 100, 90, 80], mana:[0, 220, 270, 320],
    desc:'Вызывает стаю из 4 крепких псов (на 2 больше со скипетром Аганима) и бросает вокруг героя 12 голов: они разлетаются, быстро кружат вокруг Выселок и возвращаются. Каждая голова бьёт на 170/250/340 при вылете и возврате, а при кружении задевает врагов постоянно.',
    cast(h, x, y, lvl){
      const L = Math.max(1, Math.min(3, lvl || 1));
      const nd = R_DOGS + (typeof hasScepter === 'function' && hasScepter(h) ? 2 : 0);
      for(let i = 0; i < nd; i++){
        const a = i / nd * TAU + 0.4;
        spawnDog(h, h.x + Math.cos(a) * 110, h.y + Math.sin(a) * 110, {life:24, hp:R_DOG_HP[L], dmg:R_DOG_DMG[L], leash:R_LEASH, big:true, slot:i});
      }
      for(let i = 0; i < R_HEADS; i++){
        const a = i / R_HEADS * TAU, ring = i % 2;
        pushHead({kind:'r', src:h, team:h.team, dmg:R_HEAD_DMG[L], ang:a, r:40, rOrbit:ring ? 330 : 560, speed:2200, w:(ring ? -1 : 1) * 4.2,
          phase:0, ph:0, orbitT:1.5, hitR:38, scale:1.15, hitCd:0, pool:new Map(), once:{o:new Set(), b:new Set()},
          x:h.x + Math.cos(a) * 40, y:h.y + Math.sin(a) * 40});
      }
      fxRing(h.x, h.y, 260, '#ff3a2a', 0.8);
      fxRing(h.x, h.y, 560, '#ff7a4a', 0.9);
      spawnParticles(h.x, h.y, '#ff4a3a', isLite() ? 12 : 32, 1.5);
      shake(5, 0.45);
      addText(h.x, h.y - 88, 'СТАЯ И ГОЛОВЫ!', '#ff4a3a', 1.5, 22);
      snd('vyRoar', 1.0); snd('vyBark', 0.7);
      return true;
    }
  }
});

/* ---------- сопротивление урону (E) ---------- */
{
  const _ad = applyDamage;
  applyDamage = function(target, amount, source){
    if(target && target.vyGuard && target.vyGuard.t > 0 && amount > 0) amount *= (1 - GUARD_RESIST);
    return _ad.call(this, target, amount, source);
  };
}

/* ======================================================================
   ТИК
   ====================================================================== */
const _t = fx973Tick;
fx973Tick = function(dt){
  _t.apply(this, arguments);
  try {
    if(typeof gameState !== 'undefined' && gameState !== 'playing') return;
    if(dt > 0.25) dt = 0.25;
    if(typeof gameTime !== 'undefined'){
      if(gameTime < VC.gt - 0.5){ VC.heads.length = 0; VC.volleys.length = 0; }       /* новый матч */
      VC.gt = gameTime;
    }
    for(const v of VC.volleys) volleyTick(v, dt);
    for(let i = VC.volleys.length - 1; i >= 0; i--) if(VC.volleys[i].done) VC.volleys.splice(i, 1);
    for(const hd of VC.heads) headTick(hd, dt);
    for(let i = VC.heads.length - 1; i >= 0; i--) if(VC.heads[i].dead) VC.heads.splice(i, 1);
    for(const h of heroes){
      const g = h.vyGuard;
      if(!g) continue;
      if(h.dead){ h.vyGuard = null; continue; }
      g.t -= dt;
      if(g.t <= 0) h.vyGuard = null;
    }
  } catch(err){ warn('tick', err); }
};

/* ======================================================================
   ОТРИСОВКА
   ====================================================================== */
const seen = (x, y, team) => {
  if(team === 0) return true;
  try { const gx = clamp(Math.floor(x / CELL), 0, GRID - 1), gy = clamp(Math.floor(y / CELL), 0, GRID - 1); return !!visGrid[gy * GRID + gx]; } catch(e) { return true; }
};

function drawOrcHead(g, hd){
  const sc = hd.scale || 1;
  g.save();
  g.translate(hd.x, hd.y);
  /* тень на земле */
  g.fillStyle = 'rgba(0,0,0,0.28)';
  g.beginPath(); g.ellipse(0, 18, 18 * sc, 7 * sc, 0, 0, TAU); g.fill();
  g.rotate(hd.rot); g.scale(sc, sc);
  g.shadowColor = '#ff2a1a'; g.shadowBlur = 14;
  /* череп */
  g.fillStyle = '#c0302a'; g.strokeStyle = '#4a0f0d'; g.lineWidth = 2.5;
  g.beginPath(); g.ellipse(0, 0, 17, 16, 0, 0, TAU); g.fill(); g.stroke();
  g.shadowBlur = 0;
  /* ирокез */
  g.fillStyle = '#2b2a30';
  for(let i = -2; i <= 2; i++){ g.beginPath(); g.moveTo(i * 4 - 3, -13); g.lineTo(i * 4, -24 + Math.abs(i) * 2); g.lineTo(i * 4 + 3, -13); g.closePath(); g.fill(); }
  /* глаза и брови */
  g.fillStyle = '#ffd23a';
  g.beginPath(); g.ellipse(-6, -3, 3.6, 2.6, 0, 0, TAU); g.ellipse(6, -3, 3.6, 2.6, 0, 0, TAU); g.fill();
  g.strokeStyle = '#3a0b0a'; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(-11, -9); g.lineTo(-3, -5); g.moveTo(11, -9); g.lineTo(3, -5); g.stroke();
  /* пасть и клыки */
  g.fillStyle = '#3a0b0a';
  g.beginPath(); g.ellipse(0, 8, 9, 5, 0, 0, TAU); g.fill();
  g.fillStyle = '#efe3c2';
  g.beginPath(); g.moveTo(-7, 9); g.lineTo(-5, -1); g.lineTo(-3, 9); g.closePath(); g.moveTo(7, 9); g.lineTo(5, -1); g.lineTo(3, 9); g.closePath(); g.fill();
  /* уши */
  g.fillStyle = '#8c1d19';
  g.beginPath(); g.moveTo(-16, -3); g.lineTo(-26, -9); g.lineTo(-16, 4); g.closePath(); g.moveTo(16, -3); g.lineTo(26, -9); g.lineTo(16, 4); g.closePath(); g.fill();
  g.restore();
}

function drawHeads(g){
  const lite = isLite() || fxLv() >= 2;
  for(const hd of VC.heads){
    if(!isWorldPointVisible(hd.x, hd.y, 120) || !seen(hd.x, hd.y, hd.team)) continue;
    /* огненный след из предыдущих позиций */
    if(!lite && hd.trail.length >= 4){
      g.save(); g.lineCap = 'round';
      for(let i = 2; i < hd.trail.length; i += 2){
        const k = i / hd.trail.length;
        g.strokeStyle = 'rgba(255,' + (60 + Math.floor(k * 90)) + ',30,' + al(k * 0.6) + ')';
        g.lineWidth = 3 + k * 14 * (hd.scale || 1);
        g.beginPath(); g.moveTo(hd.trail[i - 2], hd.trail[i - 1]); g.lineTo(hd.trail[i], hd.trail[i + 1]); g.stroke();
      }
      g.restore();
    }
    drawOrcHead(g, hd);
  }
}

function drawGuards(g){
  const t = (typeof gameTime !== 'undefined') ? gameTime : 0;
  for(const h of heroes){
    const G0 = h.vyGuard;
    if(!G0 || h.dead || !isWorldPointVisible(h.x, h.y, 200) || !seen(h.x, h.y, h.team)) continue;
    const k = Math.min(1, G0.t / 0.5, (G0.dur - G0.t) / 0.25 + 0.2);
    g.save();
    g.translate(h.x, h.y + 6); g.scale(1, 0.55);
    const gr = g.createRadialGradient(0, 0, 10, 0, 0, 95);
    gr.addColorStop(0, 'rgba(200,150,80,' + al(0.0) + ')');
    gr.addColorStop(0.7, 'rgba(255,170,70,' + al(0.22 * k) + ')');
    gr.addColorStop(1, 'rgba(255,90,40,' + al(0.4 * k) + ')');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 95, 0, TAU); g.fill();
    g.lineWidth = 4; g.strokeStyle = 'rgba(255,200,110,' + al(0.8 * k) + ')'; g.shadowColor = '#ff8a2a'; g.shadowBlur = 16;
    g.setLineDash([22, 14]); g.lineDashOffset = -t * 40;
    g.beginPath(); g.arc(0, 0, 88, 0, TAU); g.stroke();
    g.restore();
  }
}

{
  const _dwd = drawWards;                        /* нижний слой: аура шкуры */
  drawWards = function(){
    _dwd.apply(this, arguments);
    try { if(heroes.some(h => h.vyGuard)){ ctx.save(); drawGuards(ctx); ctx.restore(); } } catch(err){ warn('ground', err); }
  };
  const F = G.__fx973;                           /* верхний слой: летящие головы */
  if(F){
    const _dw0 = F.drawWorld;
    F.drawWorld = function(){
      _dw0.apply(this, arguments);
      try { if(VC.heads.length){ ctx.save(); drawHeads(ctx); ctx.restore(); } } catch(err){ warn('top', err); }
    };
  }
}

/* ======================================================================
   РЕГИСТРАЦИЯ ГЕРОЯ
   ====================================================================== */
{
  if(!HERO_DEFS.some(d => d.id === 'vyselki')){
    const def = {
      id:'vyselki', name:'Выселки', title:'Двухголовый орк-вожак', color:'#b3261e', color2:'#ffd23a',
      baseHp:1000, hpPerLvl:128, baseMp:300, mpPerLvl:36, baseDmg:98, dmgPerLvl:9, abilityDamageScale:1, damageScale:1, speed:172,
      atkRange:155, atkTime:1.0, baseArmor:6, armorPerLvl:0.7, vision:1000, hpRegen:3.0, mpRegen:1.9,
      skills:['vyPack','vyHeads','vyGuard','vyUlt'],
      weapon:{type:'club', color:'#8a5a30', size:1.15}
    };
    HERO_STAT_BALANCE.vyselki = [def.baseHp, def.hpPerLvl, def.baseDmg, def.dmgPerLvl, def.abilityDamageScale];
    HERO_DEFS.push(def);
  }
  ATK_STYLE.vyselki = {m:'blunt'};
  SCEPTER_UPGRADES.vyselki = 'Ульта призывает на 2 пса больше';
  HERO_TALENTS.vyselki = [['+250 к здоровью', {maxHp:250, hp:250}], ['+25 к урону', {damage:25}], ['+20 к скорости передвижения', {speed:20}], ['+10 к броне', {armor:10}], ['+20% к урону способностей', {spellAmp:0.20}]];
  if(typeof HERO_GUIDES !== 'undefined'){
    HERO_GUIDES.vyselki = {
      role:'Выселки: двухголовый орк, танк-вожак со сворой псов',
      style:'Живучий боец ближнего боя. Псы давят врагов вокруг него, головы летят во врага с бешеной скоростью, а каменная шкура превращает его в стену. Ульта накрывает всю драку вихрем голов и стаей псов.',
      skills:[0, 1, 2],
      skillNote:'Свора (Q) — 3 пса, которые нападают на врагов в радиусе 700 вокруг героя. Град голов (W) — 8 бросков головы с бешеной скоростью. Каменная шкура (E) — +80% сопротивления урону на 6 секунд. Стая и головы (R) — 4 пса и 12 летающих голов, быстро кружащих вокруг героя.',
      build:['joelBoots', 'pt', 'bkb', 'satanic', 'stormbringer', 'phoenixFeather'],
      tips:['Жми Каменную шкуру перед тем, как врываться в драку: за 6 секунд враги почти не смогут тебя убить.', 'Псы нападают только в радиусе вокруг героя — держись рядом с врагами, чтобы они работали.', 'Ульту лучше применять в центре драки: головы бьют и при вылете, и при кружении, и при возврате.']
    };
  }
}
})();
