/* DotaSense 0.9.9.5 — «МЭРИН».
   • Новый герой Мэрин — гангстер с автоматом (дальний бой), 4 навыка:
       Q «Тачка на дело»  — машина едет в случайного вражеского героя и не отстаёт, пока не врежется.
       W «Гангста-стиль»  — пассивно: +50 к скорости атаки и +120 к скорости ходьбы.
       E «Адская жара»    — огромный радиус: враги сильно замедлены и горят, по 90 урона каждые 0,5 сек.
       R «Автопарк»       — десятки машин появляются по всей карте; рядом герой — едут на него, рядом только крипы — на крипов.
   • Йосып усилен на 25% (здоровье, урон, рост за уровень, сила способностей).
   Подключается поверх game.js и update9904.js, по образцу остальных update-файлов. */
(function(){
'use strict';
const G = window, TAU = Math.PI * 2;
const snd = (k, v) => { try { playSynthSfx(k, {volume: v == null ? 1 : v}); } catch(e) {} };
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update9905 ' + tag + ':', err); } catch(e) {} } };
const fxLv = () => (typeof fxl === 'function' ? fxl() : 0);
const isLite = () => (typeof perfLite === 'function' && perfLite());
const al = v => Math.max(0, Math.min(1, v)).toFixed(3);
const isMarin = h => !!(h && h.def && h.def.id === 'marin');
const lvlOf = (h, id) => { const s = h && h.skills && h.skills.find(k => k.id === id); return s ? (s.level || 0) : 0; };
const shake = (m, d) => { const F = G.__fx973; if(F && fxLv() < 2){ F.shakeMag = Math.max(F.shakeMag, m); F.shakeT = F.shakeDur = d; } };
const angDiff = (a, b) => { let d = (b - a) % TAU; if(d > Math.PI) d -= TAU; if(d < -Math.PI) d += TAU; return d; };

/* ======================================================================
   1. ЙОСЫП СИЛЬНЕЕ НА 25%
   ====================================================================== */
const YOSYP_BOOST = 1.25;
{
  const yd = HERO_DEFS.find(d => d.id === 'yosyp');
  if(yd && !yd.boost9905){
    yd.boost9905 = true;
    for(const k of ['baseHp', 'hpPerLvl', 'baseDmg', 'dmgPerLvl', 'abilityDamageScale']){
      if(typeof yd[k] === 'number') yd[k] *= YOSYP_BOOST;
    }
    HERO_STAT_BALANCE.yosyp = [yd.baseHp, yd.hpPerLvl, yd.baseDmg, yd.dmgPerLvl, yd.abilityDamageScale];
  }
}
/* «Зелёный отсос» (75 HP/сек) считается без масштабирования способностей — усиливаем его отдельно: +25% урона и лечения */
{
  const _tye = tickYosypEffects;
  tickYosypEffects = function(unit, dt){
    const drain = unit.buffs && unit.buffs.find(b => b.type === 'yosypDrain');
    const before = drain ? drain.tick : 0;
    _tye.apply(this, arguments);
    if(drain && drain.source && !unit.dead && drain.tick < before){        /* тик отсоса только что сработал */
      applyDamage(unit, 75 * (YOSYP_BOOST - 1), {team:drain.source.team, source:drain.source, magic:true, trueDamage:true, skipAbilityScaling:true});
      if(!drain.source.dead) drain.source.hp = Math.min(drain.source.maxHp, drain.source.hp + 75 * (YOSYP_BOOST - 1));
    }
  };
}
/* Кислотный плевок: сила способностей уже растёт через abilityDamageScale; усиливаем фиксированное лечение */
{
  const ysp = SKILLS.yosypAcid;
  if(ysp && !ysp._b9905){
    ysp._b9905 = true;
    const _c = ysp.cast;
    ysp.cast = function(h, x, y, lvl){
      const hp0 = h.hp;
      const r = _c.apply(this, arguments);
      if(r && h.hp > hp0) h.hp = Math.min(h.maxHp, hp0 + (h.hp - hp0) * YOSYP_BOOST);
      return r;
    };
  }
}

/* ======================================================================
   2. ЗВУКИ
   ====================================================================== */
Object.assign(SFX_PRESETS, {
  marinEngine: {from:90, to:260, duration:0.55, type:'sawtooth', volume:0.07, noise:0.4, layers:[[60,140,0,0.5,'square',0.05],[420,900,0.1,0.35,'triangle',0.03]]},
  marinHorn:   {from:420, to:410, duration:0.38, type:'square', volume:0.05, layers:[[520,515,0,0.36,'square',0.04]]},
  marinBoom:   {from:150, to:30, duration:0.55, type:'sawtooth', volume:0.16, noise:1.0, layers:[[60,25,0,0.6,'sine',0.2],[900,120,0,0.25,'square',0.07]]},
  marinHeat:   {from:200, to:700, duration:0.7, type:'sawtooth', volume:0.07, noise:0.8, layers:[[90,50,0,0.7,'sine',0.12],[1200,300,0.05,0.4,'triangle',0.04]]},
  marinUlt:    {from:80, to:400, duration:0.9, type:'sawtooth', volume:0.1, noise:0.6, layers:[[50,150,0,0.9,'square',0.08],[600,1100,0.2,0.5,'triangle',0.04],[420,410,0.3,0.4,'square',0.04]]}
});

/* ======================================================================
   3. МАШИНЫ
   ====================================================================== */
const MC = {cars: [], puffs: [], gt: 0, heat: []};
const CAR_MAX = 90;
const CAR_COLORS = ['#c21f33', '#2b6fd6', '#e0a526', '#2fa36b', '#8d4fd6', '#e8e8ee'];

const enemyOk = (t, team) => t && !t.dead && t.team !== team && t.team !== 2 && !isBuilding(t) && !isStructure(t) && !t.invulnerable && !isHiddenFrom(t, team);
const enemyHeroes = team => heroes.filter(h => enemyOk(h, team) && h.type === 'hero' && !h.isIllusion);
function nearestEnemy(x, y, team){
  let best = null, bd = 1e12;
  for(const u of units){
    if(!enemyOk(u, team)) continue;
    const d = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
    if(d < bd){ bd = d; best = u; }
  }
  return best;
}
/* 0.9.9.8: ульта (R) — машины выбирают цель по близости: герой/бот рядом → едут на него; иначе, если рядом только крипы → таранят крипов;
   если рядом никого нет — как раньше, едут на ближайшего вражеского героя по всей карте. */
const R_NEAR = 900;
function nearbyTarget(car, heroOnly){
  let best = null, bd = R_NEAR * R_NEAR;
  for(const u of units){
    if(!enemyOk(u, car.team)) continue;
    const isHero = u.type === 'hero' && !u.isIllusion;
    if(heroOnly ? !isHero : (u.type === 'hero')) continue;
    const d = (u.x - car.x) * (u.x - car.x) + (u.y - car.y) * (u.y - car.y);
    if(d < bd){ bd = d; best = u; }
  }
  return best;
}
function pickTarget(car){
  const hs = enemyHeroes(car.team);
  if(car.kind === 'q' && hs.length) return hs[Math.floor(Math.random() * hs.length)];   /* Q — случайный герой */
  if(car.kind === 'r'){
    const nh = nearbyTarget(car, true);
    if(nh) return nh;                       /* рядом герой/бот — он в приоритете */
    const nc = nearbyTarget(car, false);
    if(nc) return nc;                       /* рядом только крипы — едем на них */
  }
  let best = null, bd = 1e12;
  for(const u of hs){ const d = (u.x - car.x) * (u.x - car.x) + (u.y - car.y) * (u.y - car.y); if(d < bd){ bd = d; best = u; } }
  return best || nearestEnemy(car.x, car.y, car.team);
}

function spawnCar(src, x, y, ang, o){
  if(MC.cars.length >= CAR_MAX) MC.cars.shift();
  const car = Object.assign({
    x, y, ang, speed: 0, maxSpeed: 640, src, team: src.team, kind: 'q', dmg: 150, blast: 150, hitR: 30,
    age: 0, life: 22, target: null, retarget: 0, color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
    arrive: 0, arriveMax: 0, puffT: 0, honk: false, dead: false, stun: 0.5
  }, o || {});
  car.target = pickTarget(car);
  MC.cars.push(car);
  return car;
}

function carExplode(car, hitUnit){
  if(car.dead) return;
  car.dead = true;
  const src = car.src, x = car.x, y = car.y;
  fxRing(x, y, car.blast, '#ffb347', 0.5);
  fxRing(x, y, car.blast * 0.55, '#fff2b0', 0.35);
  spawnParticles(x, y, '#ff7a1a', isLite() ? 10 : 28, 1.3);
  spawnParticles(x, y, '#ffd36b', isLite() ? 6 : 14, 1.0);
  spawnParticles(x, y, '#3a3a3a', isLite() ? 4 : 10, 0.9);
  MC.puffs.push({x, y, t: 0, life: 0.55, r: car.blast, kind: 'boom'});
  shake(car.kind === 'r' ? 4 : 7, 0.22);
  snd('marinBoom', car.kind === 'r' ? 0.55 : 0.9);
  for(const u of units){
    if(u.dead || u.team === car.team || u.team === 2 || isBuilding(u) || isStructure(u) || u.invulnerable) continue;
    if(Math.hypot(u.x - x, u.y - y) > car.blast + (u.radius || 0)) continue;
    applyDamage(u, abilityDamage(src, car.dmg), src);
    if(u.dead) continue;
    u.stunTimer = Math.max(u.stunTimer || 0, car.stun);
    u.hitFlash = Math.max(u.hitFlash || 0, 0.25);
  }
}

function carTick(car, dt){
  car.age += dt;
  if(car.arrive > 0){                      /* машина «падает» на карту (ульта) */
    car.arrive -= dt;
    if(car.arrive <= 0){ spawnParticles(car.x, car.y, '#cfcfcf', 6, 0.7); }
    return;
  }
  if(car.age > car.life){ car.dead = true; MC.puffs.push({x: car.x, y: car.y, t: 0, life: 0.4, r: 60, kind: 'smoke'}); return; }
  car.retarget -= dt;
  if(car.retarget <= 0 && (!enemyOk(car.target, car.team) || car.kind === 'r')){
    car.retarget = car.kind === 'r' ? 0.25 : 0.2;     /* ульта-машины перепроверяют цель: герой рядом важнее крипов */
    car.target = pickTarget(car);
  }
  const t = car.target;
  let desired = car.ang;
  if(enemyOk(t, car.team)){
    desired = Math.atan2(t.y - car.y, t.x - car.x);
    if(!car.honk && Math.hypot(t.x - car.x, t.y - car.y) < 520){ car.honk = true; snd('marinHorn', 0.5); }
  } else {
    desired = car.ang + Math.sin(car.age * 2) * 0.4;     /* целей нет — просто колесит */
  }
  const turn = Math.min(10, 3.4 + car.age * 1.4);
  const d = angDiff(car.ang, desired);
  car.ang += Math.max(-turn * dt, Math.min(turn * dt, d));
  car.speed = Math.min(car.maxSpeed, car.speed + 1100 * dt);
  car.x += Math.cos(car.ang) * car.speed * dt;
  car.y += Math.sin(car.ang) * car.speed * dt;
  car.x = clamp(car.x, 30, WORLD - 30); car.y = clamp(car.y, 30, WORLD - 30);
  car.puffT -= dt;
  if(car.puffT <= 0 && !isLite()){
    car.puffT = fxLv() >= 2 ? 0.2 : 0.07;
    MC.puffs.push({x: car.x - Math.cos(car.ang) * 26, y: car.y - Math.sin(car.ang) * 26, t: 0, life: 0.45, r: 14, kind: 'dust'});
  }
  /* столкновение: цель или любой вражеский герой на пути */
  if(enemyOk(t, car.team) && Math.hypot(t.x - car.x, t.y - car.y) <= car.hitR + (t.radius || 20)){ carExplode(car, t); return; }
  for(const h of heroes){
    if(!enemyOk(h, car.team) || h.type !== 'hero') continue;
    if(Math.hypot(h.x - car.x, h.y - car.y) <= car.hitR + (h.radius || 20)){ carExplode(car, h); return; }
  }
}

/* ======================================================================
   4. НАВЫКИ
   ====================================================================== */
const Q_DMG = [0, 150, 225, 300, 380];
const R_COUNT = [0, 12, 16, 20];
const R_DMG = [0, 190, 280, 380];
const HEAT_DUR = [0, 5, 6, 7, 8], HEAT_SLOW = [0, 0.55, 0.62, 0.68, 0.75];
const HEAT_RADIUS = 1150, HEAT_DMG = 90, HEAT_TICK = 0.5;
const PASSIVE_AS = 0.5, PASSIVE_MS = 120;     /* +50 к скорости атаки, +120 к скорости ходьбы */

Object.assign(SKILLS, {
  marinCar: {
    name:'Тачка на дело', short:'Q', type:'self', maxLevel:4,
    cd:[0, 12, 11, 10, 9], mana:[0, 70, 80, 90, 100],
    desc:'Мэрин вызывает машину: она мчится в случайного вражеского героя и не отстаёт, пока не врежется. Взрыв: 150/225/300/380 урона в радиусе 150 и оглушение на 0,5 сек.',
    cast(h, x, y, lvl){
      const L = Math.max(1, Math.min(4, lvl || 1));
      const foes = enemyHeroes(h.team);
      if(!foes.length && !nearestEnemy(h.x, h.y, h.team)){ try { flashMsg(h, 'Нет целей для машины'); } catch(e) {} return false; }
      const f = Number.isFinite(h.facing) ? h.facing : 0;
      const car = spawnCar(h, h.x + Math.cos(f) * 60, h.y + Math.sin(f) * 60, f, {kind:'q', dmg:Q_DMG[L], blast:150, life:20, color:'#c21f33'});
      MC.puffs.push({x: car.x, y: car.y, t: 0, life: 0.5, r: 70, kind: 'smoke'});
      addText(h.x, h.y - 78, 'ТАЧКА НА ДЕЛО', '#ffcf6b', 1.0, 16);
      snd('marinEngine', 0.8);
      return true;
    }
  },
  marinFlow: {
    name:'Гангста-стиль', short:'W', type:'self', passive:true, maxLevel:4,
    cd:[0, 0, 0, 0, 0], mana:[0, 0, 0, 0, 0],
    desc:'Пассивно: +50 к скорости атаки и +120 к скорости ходьбы.',
    cast(){ }
  },
  marinHeat: {
    name:'Адская жара', short:'E', type:'self', maxLevel:4,
    cd:[0, 38, 35, 32, 29], mana:[0, 140, 160, 180, 200],
    desc:'В огромном радиусе 1150 враги очень сильно замедлены (55/62/68/75%) и горят: каждые 0,5 сек. находящиеся в зоне получают по 90 урона. Длится 5/6/7/8 сек.',
    cast(h, x, y, lvl){
      const L = Math.max(1, Math.min(4, lvl || 1));
      h.marinHeat = {t: HEAT_DUR[L], dur: HEAT_DUR[L], tick: 0, slow: HEAT_SLOW[L], lvl: L};
      fxRing(h.x, h.y, 400, '#ff7a1a', 0.8);
      fxRing(h.x, h.y, 800, '#ffb347', 0.9);
      fxRing(h.x, h.y, HEAT_RADIUS, '#ff4a12', 1.0);
      spawnParticles(h.x, h.y, '#ff7a1a', isLite() ? 14 : 36, 1.6);
      shake(5, 0.35);
      addText(h.x, h.y - 78, 'АДСКАЯ ЖАРА', '#ff9a4a', 1.2, 18);
      snd('marinHeat', 1.0);
      return true;
    }
  },
  marinFleet: {
    name:'Автопарк', short:'R', type:'self', maxLevel:3, ult:true,
    cd:[0, 100, 90, 80], mana:[0, 200, 250, 300],
    desc:'По всей карте появляется 12/16/20 машин (на 6 больше со скипетром Аганима): каждая едет на ближайшего рядом героя, а если рядом одни крипы — таранит крипов (если никого рядом нет — ищет ближайшего героя). Взрыв машины: 190/280/380 урона и оглушение.',
    cast(h, x, y, lvl){
      const L = Math.max(1, Math.min(3, lvl || 1));
      const n = R_COUNT[L] + (typeof hasScepter === 'function' && hasScepter(h) ? 6 : 0);
      const foes = enemyHeroes(h.team);
      for(let i = 0; i < n; i++){
        /* часть машин падает вокруг врагов, остальные — по всей карте */
        let px, py;
        if(foes.length && i % 3 === 0){
          const e = foes[Math.floor(Math.random() * foes.length)], a = Math.random() * TAU, r = 700 + Math.random() * 900;
          px = e.x + Math.cos(a) * r; py = e.y + Math.sin(a) * r;
        } else {
          px = 300 + Math.random() * (WORLD - 600); py = 300 + Math.random() * (WORLD - 600);
        }
        px = clamp(px, 120, WORLD - 120); py = clamp(py, 120, WORLD - 120);
        const arrive = 0.35 + Math.random() * 0.9;
        const c = spawnCar(h, px, py, Math.random() * TAU, {kind:'r', dmg:R_DMG[L], blast:130, life:24, maxSpeed:600, arrive, arriveMax:arrive});
        c.stun = 0.6;
      }
      fxRing(h.x, h.y, 260, '#ffcf6b', 0.7);
      spawnParticles(h.x, h.y, '#ffcf6b', isLite() ? 12 : 30, 1.5);
      shake(4, 0.4);
      addText(h.x, h.y - 82, 'АВТОПАРК!', '#ffcf6b', 1.4, 22);
      snd('marinUlt', 1.0);
      return true;
    }
  }
});

/* ---------- пассивка W: скорость атаки и скорость ходьбы ---------- */
{
  const _gat = Unit.prototype.getAttackTime;
  Unit.prototype.getAttackTime = function(){
    const base = _gat.apply(this, arguments);
    if(this.def && this.def.id === 'marin' && lvlOf(this, 'marinFlow') > 0){
      const m = this.atkTime / Math.max(0.05, base);                 /* текущий множитель скорости атаки */
      return this.atkTime / Math.max(0.2, m + PASSIVE_AS);
    }
    return base;
  };
  const _gs = Unit.prototype.getSpeed;
  Unit.prototype.getSpeed = function(){
    const base = _gs.apply(this, arguments);
    if(this.def && this.def.id === 'marin' && lvlOf(this, 'marinFlow') > 0){
      return base + PASSIVE_MS * (this.slowT > 0 ? Math.max(0, 1 - this.slow) : 1);
    }
    return base;
  };
}

/* ---------- тик: машины, «Адская жара» ---------- */
function marinHeatTick(h, dt){
  const H = h.marinHeat;
  if(!H) return;
  if(h.dead){ h.marinHeat = null; return; }
  H.t -= dt; H.tick += dt;
  const dmgNow = H.tick >= HEAT_TICK;
  if(dmgNow) H.tick -= HEAT_TICK;
  for(const u of units){
    if(u.dead || u.team === h.team || u.team === 2 || isBuilding(u) || isStructure(u) || u.invulnerable) continue;
    if(Math.hypot(u.x - h.x, u.y - h.y) > HEAT_RADIUS + (u.radius || 0)) continue;
    u.slow = Math.max(u.slowT > 0 ? u.slow : 0, H.slow);
    u.slowT = Math.max(u.slowT || 0, 0.3);
    let b = u.buffs && u.buffs.find(k => k.type === 'burning' && k.marin);
    if(!b){ b = {type:'burning', marin:true, t:0.6, damage:0.001, source:h}; u.addBuff(b); } else { b.t = 0.6; }
    if(dmgNow){
      applyDamage(u, HEAT_DMG, {team:h.team, source:h, magic:true, skipAbilityScaling:true});
      if(!u.dead && fxLv() < 2 && !isLite()) spawnParticles(u.x, u.y, '#ff7a1a', 4, 0.6);
    }
  }
  if(H.t <= 0) h.marinHeat = null;
}

const _t = fx973Tick;
fx973Tick = function(dt){
  _t.apply(this, arguments);
  try {
    if(typeof gameState !== 'undefined' && gameState !== 'playing') return;
    if(dt > 0.25) dt = 0.25;
    if(typeof gameTime !== 'undefined'){
      if(gameTime < MC.gt - 0.5){ MC.cars.length = 0; MC.puffs.length = 0; }       /* новый матч */
      MC.gt = gameTime;
    }
    for(const c of MC.cars) carTick(c, dt);
    for(let i = MC.cars.length - 1; i >= 0; i--) if(MC.cars[i].dead) MC.cars.splice(i, 1);
    for(const p of MC.puffs) p.t += dt;
    for(let i = MC.puffs.length - 1; i >= 0; i--) if(MC.puffs[i].t >= MC.puffs[i].life) MC.puffs.splice(i, 1);
    if(MC.puffs.length > 260) MC.puffs.splice(0, MC.puffs.length - 260);
    for(const h of heroes) if(h.marinHeat) marinHeatTick(h, dt);
  } catch(err){ warn('tick', err); }
};

/* ======================================================================
   5. ОТРИСОВКА
   ====================================================================== */
const seen = (x, y, team) => {
  if(team === 0) return true;
  try { const gx = clamp(Math.floor(x / CELL), 0, GRID - 1), gy = clamp(Math.floor(y / CELL), 0, GRID - 1); return !!visGrid[gy * GRID + gx]; } catch(e) { return true; }
};

function drawCar(g, c){
  const s = 1.0;
  g.save();
  g.translate(c.x, c.y);
  let lift = 0, a = 1;
  if(c.arrive > 0){ const k = c.arrive / (c.arriveMax || 1); lift = k * 260; a = 1 - k * 0.6; }
  /* тень на земле */
  g.fillStyle = 'rgba(0,0,0,' + al(0.32 * (1 - lift / 300)) + ')';
  g.beginPath(); g.ellipse(0, 6, 34, 15, c.ang, 0, TAU); g.fill();
  if(c.arrive > 0){                          /* метка падения */
    g.strokeStyle = 'rgba(255,207,107,' + al(0.8 * (1 - c.arrive / (c.arriveMax || 1))) + ')';
    g.lineWidth = 3; g.beginPath(); g.ellipse(0, 6, 36 + lift * 0.1, 18 + lift * 0.05, 0, 0, TAU); g.stroke();
  }
  g.translate(0, -lift);
  g.globalAlpha = a;
  g.rotate(c.ang);
  /* кузов (вид сверху-сбоку, нос по +x) */
  g.fillStyle = '#101216'; g.fillRect(-26, -17, 52, 34);                     /* колёса-основа */
  for(const sx of [-16, 16]) for(const sy of [-19, 19]){ g.fillStyle = '#0a0a0c'; g.fillRect(sx - 7, sy - 3.5, 14, 7); }
  g.fillStyle = c.color; g.beginPath();
  g.moveTo(-28, -14); g.lineTo(22, -14); g.quadraticCurveTo(34, -12, 36, 0); g.quadraticCurveTo(34, 12, 22, 14); g.lineTo(-28, 14);
  g.quadraticCurveTo(-32, 0, -28, -14); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-26, -13, 50, 4);          /* блик */
  g.fillStyle = '#1b2433'; g.fillRect(-8, -10, 20, 20);                      /* салон/крыша */
  g.fillStyle = '#7fb2e0'; g.fillRect(12, -9, 6, 18); g.fillRect(-12, -9, 3, 18);   /* стёкла */
  g.fillStyle = c.color; g.fillRect(-6, -8, 16, 16);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(-6, -1, 16, 2);
  /* фары и стоп-сигналы */
  g.fillStyle = '#fff6c4'; g.shadowBlur = 14; g.shadowColor = '#fff6c4';
  g.beginPath(); g.arc(35, -8, 3, 0, TAU); g.arc(35, 8, 3, 0, TAU); g.fill();
  g.shadowBlur = 0; g.fillStyle = '#ff2a2a'; g.fillRect(-30, -12, 3, 5); g.fillRect(-30, 7, 3, 5);
  /* мигалка-«гангстерская» пометка и свет вперёд */
  if(c.arrive <= 0){
    g.globalAlpha = a * 0.16; const gr = g.createLinearGradient(36, 0, 190, 0);
    gr.addColorStop(0, '#fff6c4'); gr.addColorStop(1, 'rgba(255,246,196,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(36, -6); g.lineTo(190, -52); g.lineTo(190, 52); g.lineTo(36, 6); g.fill();
  }
  g.restore();
}

function drawPuffs(g, top){
  const lite = isLite() || fxLv() >= 2;
  for(const p of MC.puffs){
    if(!isWorldPointVisible(p.x, p.y, 200)) continue;
    const k = p.t / p.life, ik = 1 - k;
    if(p.kind === 'boom'){
      if(!top) continue;
      g.save(); g.globalAlpha = Math.max(0, ik) * 0.9;
      const R = p.r * (0.4 + k * 0.9), gr = g.createRadialGradient(p.x, p.y, 2, p.x, p.y, R);
      gr.addColorStop(0, 'rgba(255,248,200,0.95)'); gr.addColorStop(0.35, 'rgba(255,160,50,0.8)'); gr.addColorStop(1, 'rgba(120,30,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, R, 0, TAU); g.fill(); g.restore();
    } else {
      if(top || lite && p.kind === 'dust') continue;
      g.save(); g.globalAlpha = ik * (p.kind === 'smoke' ? 0.45 : 0.3);
      g.fillStyle = p.kind === 'smoke' ? '#8a8a8a' : '#b9a98a';
      g.beginPath(); g.arc(p.x, p.y, p.r * (0.6 + k * 1.2), 0, TAU); g.fill(); g.restore();
    }
  }
}

function drawHeat(g){
  const t = (typeof gameTime !== 'undefined') ? gameTime : 0;
  for(const h of heroes){
    const H = h.marinHeat;
    if(!H || h.dead) continue;
    const fadeIn = Math.min(1, (H.dur - H.t) / 0.5 + 0.15), fadeOut = Math.min(1, H.t / 0.6), k = Math.min(fadeIn, fadeOut);
    g.save();
    const gr = g.createRadialGradient(h.x, h.y, HEAT_RADIUS * 0.55, h.x, h.y, HEAT_RADIUS);
    gr.addColorStop(0, 'rgba(255,90,20,0)');
    gr.addColorStop(0.8, 'rgba(255,90,20,' + al(0.10 * k) + ')');
    gr.addColorStop(1, 'rgba(255,60,10,' + al(0.22 * k) + ')');
    g.fillStyle = gr; g.beginPath(); g.arc(h.x, h.y, HEAT_RADIUS, 0, TAU); g.fill();
    g.lineWidth = 6; g.shadowBlur = 24; g.shadowColor = '#ff5a14';
    g.strokeStyle = 'rgba(255,140,40,' + al(0.75 * k) + ')';
    g.setLineDash([46, 22]); g.lineDashOffset = -t * 60;
    g.beginPath(); g.arc(h.x, h.y, HEAT_RADIUS - 4, 0, TAU); g.stroke();
    g.setLineDash([]); g.shadowBlur = 0;
    /* языки пламени по кромке */
    if(!isLite() && fxLv() < 2){
      const n = fxLv() >= 1 ? 18 : 36;
      for(let i = 0; i < n; i++){
        const a = (i / n) * TAU + t * 0.4, fl = 26 + Math.sin(t * 7 + i * 1.7) * 14;
        const bx = h.x + Math.cos(a) * (HEAT_RADIUS - 6), by = h.y + Math.sin(a) * (HEAT_RADIUS - 6);
        g.fillStyle = 'rgba(255,' + (110 + (i % 3) * 40) + ',30,' + al(0.55 * k) + ')';
        g.beginPath(); g.moveTo(bx - 9, by); g.quadraticCurveTo(bx, by - fl * 1.6, bx + 9, by); g.fill();
      }
    }
    g.restore();
  }
}

{
  const _dwd = drawWards;                      /* нижний слой: жара, дым и пыль */
  drawWards = function(){
    _dwd.apply(this, arguments);
    try { if(MC.puffs.length || heroes.some(h => h.marinHeat)){ ctx.save(); drawHeat(ctx); drawPuffs(ctx, false); ctx.restore(); } } catch(err){ warn('ground', err); }
  };
  const F = G.__fx973;                         /* верхний слой: машины и взрывы */
  if(F){
    const _dw0 = F.drawWorld;
    F.drawWorld = function(){
      _dw0.apply(this, arguments);
      try {
        if(MC.cars.length || MC.puffs.length){
          ctx.save();
          for(const c of MC.cars){
            if(!isWorldPointVisible(c.x, c.y, 120) || !seen(c.x, c.y, c.team)) continue;
            drawCar(ctx, c);
          }
          drawPuffs(ctx, true);
          ctx.restore();
        }
      } catch(err){ warn('top', err); }
    };
  }
}

/* ======================================================================
   6. РЕГИСТРАЦИЯ ГЕРОЯ
   ====================================================================== */
{
  if(!HERO_DEFS.some(d => d.id === 'marin')){
    const def = {
      id:'marin', name:'Мэрин', title:'Гангстер-автоугонщик', color:'#1a2030', color2:'#ffb347',
      baseHp:680, hpPerLvl:84, baseMp:300, mpPerLvl:38, baseDmg:70, dmgPerLvl:6.2, abilityDamageScale:1, damageScale:1, speed:185,
      atkRange:540, atkTime:1.0, baseArmor:2, armorPerLvl:0.45, vision:1050, hpRegen:2, mpRegen:2.1,
      skills:['marinCar','marinFlow','marinHeat','marinFleet'],
      weapon:{type:'club', color:'#ffb347', size:1.0}
    };
    HERO_STAT_BALANCE.marin = [def.baseHp, def.hpPerLvl, def.baseDmg, def.dmgPerLvl, def.abilityDamageScale];
    HERO_DEFS.push(def);
  }
  ATK_STYLE.marin = {r:'bullet'};
  SCEPTER_UPGRADES.marin = 'Автопарк вызывает на 6 машин больше';
  HERO_TALENTS.marin = [['+250 к здоровью', {maxHp:250, hp:250}], ['+25 к урону', {damage:25}], ['+20 к скорости передвижения', {speed:20}], ['+10 к броне', {armor:10}], ['+20% к урону способностей', {spellAmp:0.20}]];
  if(typeof HERO_GUIDES !== 'undefined'){
    HERO_GUIDES.marin = {
      role:'Мэрин: дальний гангстер, таран машинами и контроль зоны',
      style:'Быстрый стрелок с автоматом: пассивно бьёт и бегает быстрее остальных. Машины сами догоняют героев, а «Адская жара» накрывает всю драку огнём и замедлением.',
      skills:[0, 1, 2],
      skillNote:'Тачка на дело (Q) — машина едет в случайного вражеского героя и взрывается при ударе. Гангста-стиль (W) — пассивно +50 к скорости атаки и +120 к скорости ходьбы. Адская жара (E) — огромная зона: сильное замедление и по 90 урона каждые 0,5 сек. Автопарк (R) — десятки машин по всей карте, каждая ищет цель.',
      build:['joelBoots', 'pt', 'stormbringer', 'satanic', 'bkb', 'phoenixFeather'],
      tips:['Входи в драку с Адской жарой: враги в радиусе почти не могут убежать, а ты быстрый и стреляешь издалека.', 'Ульту лучше жать, когда враги разбросаны: машины падают по всей карте и сами находят героев.', 'Машина из Q выбирает цель случайно — используй её, когда рядом нет прикрытия у союзников врага.']
    };
  }
}
})();
