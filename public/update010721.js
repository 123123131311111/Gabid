/* DotaSense 0.10.7.2.1 — АРКАНА СЕНСИРОВАННОЙ «КОРОЛЕВА КУХНИ» (skinId 'sensedChef').
   Цена (1500 Сенсиков) продублирована в accounts.js. Модель героини и робота рисует hero3d.js. Характеристики героини НЕ меняются.
   • Облик — шеф-повар: белый китель с золотыми пуговицами, высокий колпак, красный платок, розовый фартук, пояс со специями,
     сковорода с огнём вместо пулемёта, половник за спиной, над сковородой поднимается пар, вокруг летают томат, перец и яйцо.
   • Атака — еда вместо пуль: томат (замедляет 0,8 с), блин, острый перчик (поджигает на 2 с). Каждое 5-е попадание по одной цели
     «подаёт блюдо» (ПОДАНО!): магический урон 40 + 6 за уровень героини.
   • Q «Кулинарный азарт» — тот же бонус дальности и скорости атаки, в атаке летит еда и поднимается пар.
   • W «Горячая кастрюля» — вместо гранаты летит кастрюля (те же 380 урона), на месте попадания остаётся лужа кипящего бульона
     на 3,5 с: враги внутри замедлены на 25%.
   • E «Кухонный комбайн» — робот в колпаке и фартуке; лезвия вокруг него замедляют врагов поблизости на 20%.
   • R «Адская кухня» — тот же ×3 к скорости атаки; вокруг героини зажигаются конфорки, атаки летят огненными котлетами и поджигают цель на 2 с.
   Подключается после update01072.js. */
(function(){
'use strict';
const G = window, TAU = Math.PI * 2;
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update010721 ' + tag + ':', err); } catch(e) {} } };
const ARC = 'sensedChef';
const baseId = s => String(s || '').split('+')[0];
const fxLv = () => (typeof fxl === 'function' ? fxl() : 0);
const rr = (a, b) => a + Math.random() * (b - a);
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const isChef = h => !!(h && h.def && h.def.id === 'sensed' && baseId(h.skinId) === ARC);
const ownerOf = u => (u && u.summonKind === 'senseRobot' ? u.owner : u);
const isFoe = (team, u) => u && !u.dead && u.team !== team && u.team !== 2 && !(typeof isStructure === 'function' && isStructure(u));
const visible = (x, y, m) => (typeof isWorldPointVisible === 'function' ? isWorldPointVisible(x, y, m) : true);
const now = () => (typeof gameTime === 'number' ? gameTime : 0);
const hasUlt = h => !!(h && h.buffs && h.buffs.some(b => b.id === 'senseUlt'));

/* ---------- скин-аркана ---------- */
try {
  const def = {id:ARC, arcana:true, name:'КОРОЛЕВА КУХНИ', heroId:'sensed', rarity:'arcana', price:1500, accent:'#ff7aa8', border:'#c0396b',
    previewHero:'sensed', previewColor:'#fff3e6', previewColor2:'#ff7aa8', weaponColor:'#ffb347',
    desc:'АРКАНА. Сенсированная — шеф-повар: белый китель с золотыми пуговицами, высокий колпак, красный платок, розовый фартук и пояс со специями. Пулемёт заменила пылающая сковорода, а над ней поднимается пар. Атака стреляет едой: томат замедляет, перчик поджигает, а каждое 5-е попадание «подаёт блюдо» с бонусным уроном. Граната становится горячей кастрюлей с лужей бульона, робот — кухонным комбайном с лезвиями, а ульта — «Адской кухней» с конфорками вокруг героини. Характеристики не меняются.',
    hint:'Виден, когда выбрана Сенсированная.'};
  if(!SKIN_BY_ID[def.id]){ SKIN_DEFS.push(def); SKIN_BY_ID[def.id] = def; }
} catch(err) { warn('skin', err); }

try {
  Object.assign(SFX_PRESETS, {
    chefDing:   {from:1320, to:1760, duration:0.25, type:'sine', volume:0.05, layers:[[2640, 2640, 0.02, 0.2, 'triangle', 0.02]]},
    chefClang:  {from:420, to:210, duration:0.22, type:'square', volume:0.05, layers:[[840, 500, 0, 0.18, 'triangle', 0.03]]},
    chefSizzle: {from:2400, to:900, duration:0.3, type:'sawtooth', volume:0.03, layers:[[3100, 1200, 0, 0.28, 'square', 0.012]]}
  });
} catch(err) { warn('sfx', err); }
const csnd = (k, x, y, v) => {
  try {
    const p = (typeof playerHero !== 'undefined' && playerHero && !playerHero.dead) ? playerHero : {x, y};
    const f = 1 - Math.hypot(x - p.x, y - p.y) / 1750; if(f <= 0.06) return;
    snd(k, Math.pow(f, 1.15) * (v == null ? 1 : v));
  } catch(e) {}
};

/* ---------- названия и описания навыков (видны, когда играешь за Королеву кухни) ---------- */
const chefUI = () => { try { return typeof playerHero !== 'undefined' && isChef(playerHero); } catch(e) { return false; } };
function dyn(id, name, desc){
  const sk = SKILLS[id]; if(!sk) return;
  let n0 = sk.name, d0 = sk.desc;
  Object.defineProperty(sk, 'name', {configurable:true, enumerable:true, get(){ return chefUI() ? name : n0; }, set(v){ n0 = v; }});
  Object.defineProperty(sk, 'desc', {configurable:true, enumerable:true, get(){ return chefUI() ? desc : d0; }, set(v){ d0 = v; }});
}
try {
  dyn('sensePassive', 'Кулинарный азарт', 'Пассивно: +85 к дальности атаки и +155 к скорости атаки. Атака стреляет едой: томат замедляет цель, перчик поджигает. Каждое 5-е попадание по одной цели подаёт блюдо: ПОДАНО! — магический урон 40 + 6 за уровень героини.');
  dyn('senseGrenade', 'Горячая кастрюля', 'Бросает во врага кастрюлю: цель получает 380 урона. На месте попадания остаётся лужа кипящего бульона на 3,5 с — враги внутри замедлены на 25%.');
  dyn('senseRobot', 'Кухонный комбайн', 'Призывает кухонный комбайн в колпаке и фартуке. Он выбирает ближайшего вражеского героя, неотступно преследует и бьёт. Лезвия вокруг комбайна замедляют врагов поблизости на 20%. Живёт 10/12/14/16 секунд (с Аганимом +4).');
  dyn('senseUlt', 'Адская кухня', 'На 10 секунд скорость атаки увеличивается в 3 раза (с Аганимом 15 секунд). Вокруг героини зажигаются конфорки, атаки летят огненными котлетами и поджигают цель на 2 секунды.');
} catch(err) { warn('names', err); }

/* ---------- перекраска эффектов каста: зелёная граната → тёплая кастрюля, названия по-кухонному ---------- */
const WARM = {'#9dff6a':'#ff9a4a', '#c8ff9a':'#ffd7a8'};
const warm = c => (typeof c === 'string' && WARM[c.toLowerCase()]) || c;
function wrapColor(name, idx){
  const orig = G[name]; if(typeof orig !== 'function') return;
  G[name] = function(){
    if(G.__cfOn && typeof arguments[idx] === 'string'){ const a = Array.prototype.slice.call(arguments); a[idx] = warm(a[idx]); return orig.apply(this, a); }
    return orig.apply(this, arguments);
  };
}
try { wrapColor('fxRing', 3); wrapColor('fxBeam', 4); wrapColor('spawnParticles', 2); } catch(err) { warn('recolor', err); }
const NAME_MAP = {'ГРАНАТА!':'ГОРЯЧО ПОДАЮ!', 'РОБОТ!':'КОМБАЙН!', 'ОГНЕННЫЙ ШКВАЛ':'АДСКАЯ КУХНЯ!'};
try {
  const _at = addText;
  G.addText = addText = function(x, y, str, color){
    if(G.__cfOn){
      const a = Array.prototype.slice.call(arguments);
      if(typeof a[3] === 'string') a[3] = warm(a[3]);
      if(typeof str === 'string' && NAME_MAP[str]) a[2] = NAME_MAP[str];
      return _at.apply(this, a);
    }
    return _at.apply(this, arguments);
  };
} catch(err) { warn('addText', err); }

/* ---------- состояние эффектов ---------- */
const CF = {fx: [], puddles: [], robots: [], acc: 0, blendAcc: 0};
CF.add = o => { o.t = 0; if(CF.fx.length < 260) CF.fx.push(o); return o; };
CF.bits = (x, y, n, pal, o) => {
  if(fxLv() >= 3) return; o = o || {}; n = fxLv() === 2 ? Math.ceil(n / 2) : n;
  for(let i = 0; i < n; i++) CF.add({k:'bit', x:x + rr(-(o.spread || 8), o.spread || 8), y:y + rr(-4, 4), z:rr(4, 18), vz:rr(o.v0 || 60, o.v1 || 160), vx:rr(-70, 70), vy:rr(-30, 30),
    size:rr(2, 4.2), rot:rr(0, TAU), vr:rr(-8, 8), col:pal[(Math.random() * pal.length) | 0], shape:Math.random() < 0.5 ? 0 : 1, life:rr(0.5, 0.95)});
};
CF.puffs = (x, y, n, o) => {
  if(fxLv() >= 3) return; o = o || {}; n = fxLv() === 2 ? Math.ceil(n / 2) : n;
  for(let i = 0; i < n; i++) CF.add({k:o.ember ? 'ember' : 'puff', x:x + rr(-(o.spread || 8), o.spread || 8), y:y + rr(-4, 4), z:rr(o.z0 == null ? 8 : o.z0, (o.z0 == null ? 8 : o.z0) + 12),
    vz:rr(o.v0 || 26, o.v1 || 60), vx:rr(-12, 12), vy:rr(-6, 6), size:rr(o.s0 || 6, o.s1 || 12), life:rr(0.8, 1.4)});
};
CF.stove = (x, y, r, life) => CF.add({k:'stove', x, y, r, life});

const FOOD = {tomato:['#e5392e', '#ff6a55', '#7fc94a'], pancake:['#f2b84a', '#ffd98a', '#fff1c4'], pepper:['#e5321e', '#ff7a2a', '#7fc94a'], fire:['#ff7a2a', '#ffd27a', '#ff4a1a'], pot:['#c9ced6', '#ffffff', '#ff9a4a']};

function chefTick(dt){
  if(!(dt > 0)) return;
  /* частицы */
  for(let i = CF.fx.length - 1; i >= 0; i--){
    const o = CF.fx[i]; o.t += dt;
    if(o.t >= o.life){ CF.fx.splice(i, 1); continue; }
    if(o.k === 'bit'){ o.vz -= 360 * dt; o.z += o.vz * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; if(o.z < 0){ o.z = 0; o.vz *= -0.25; o.vx *= 0.5; o.vy *= 0.5; } }
    else if(o.k === 'puff' || o.k === 'ember'){ o.z += o.vz * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.vz *= 0.99; }
  }
  /* лужи бульона */
  for(let i = CF.puddles.length - 1; i >= 0; i--){
    const f = CF.puddles[i]; f.life -= dt;
    if(f.life <= 0){ CF.puddles.splice(i, 1); continue; }
    f.acc = (f.acc || 0) + dt;
    if(f.acc >= 0.3){ f.acc = 0;
      for(const u of units){ if(!isFoe(f.team, u)) continue;
        if(Math.hypot(u.x - f.x, u.y - f.y) < f.r + u.radius){ u.slow = Math.max(u.slowT > 0 ? u.slow : 0, 0.25); u.slowT = Math.max(u.slowT || 0, 0.5); } }
      if(fxLv() < 2 && visible(f.x, f.y, f.r)) CF.puffs(f.x + rr(-f.r * 0.6, f.r * 0.6), f.y + rr(-f.r * 0.4, f.r * 0.4), 1, {spread:2, v0:20, v1:44, s0:5, s1:9});
    }
  }
  /* кухонные комбайны: лезвия замедляют врагов рядом */
  CF.robots.length = 0;
  for(const u of units){ if(u && !u.dead && u.senseChef && u.summonKind === 'senseRobot') CF.robots.push(u); }
  CF.blendAcc += dt;
  if(CF.blendAcc >= 0.3){ CF.blendAcc = 0;
    for(const rb of CF.robots){
      for(const u of units){ if(!isFoe(rb.team, u)) continue;
        if(Math.hypot(u.x - rb.x, u.y - rb.y) < 150 + u.radius){ u.slow = Math.max(u.slowT > 0 ? u.slow : 0, 0.20); u.slowT = Math.max(u.slowT || 0, 0.5); } }
      if(fxLv() < 2 && visible(rb.x, rb.y, 200)) CF.bits(rb.x, rb.y, 1, FOOD.tomato.concat(FOOD.pancake), {spread:60, v0:40, v1:90});
    }
  }
  /* пар над героиней и огонь конфорок в ульте */
  if(typeof heroes !== 'undefined' && fxLv() < 3){
    for(const h of heroes){
      if(!isChef(h) || h.dead) continue;
      if(h.team !== 0 && typeof isVisibleToPlayer === 'function' && !isVisibleToPlayer(h)) continue;
      const ult = hasUlt(h);
      h._cfS = (h._cfS || 0) + dt;
      if(h._cfS > (ult ? 0.07 : (fxLv() === 1 ? 0.45 : 0.28))){
        h._cfS = 0;
        const a = (h.facing || 0);
        CF.puffs(h.x + Math.cos(a) * 36, h.y + Math.sin(a) * 36, 1, {spread:6, z0:22, v0:24, v1:52, s0:5, s1:9});
        if(ult){ const ang = rr(0, TAU); CF.puffs(h.x + Math.cos(ang) * (h.radius + 22), h.y + Math.sin(ang) * (h.radius + 22) * 0.62, 1, {ember:true, spread:2, v0:40, v1:90, s0:4, s1:8}); }
      }
    }
  }
}

/* ---------- отрисовка: земля ---------- */
function drawPuddle(g, f){
  const tm = now(), k = clampN(f.life / f.max, 0, 1), a = Math.min(1, k * 4) * 0.9;
  g.save(); g.translate(f.x, f.y); g.scale(1, 0.62); g.globalAlpha = a;
  const gr = g.createRadialGradient(0, 0, f.r * 0.1, 0, 0, f.r);
  gr.addColorStop(0, 'rgba(255,170,70,0.75)'); gr.addColorStop(0.7, 'rgba(200,90,30,0.55)'); gr.addColorStop(1, 'rgba(140,50,20,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, f.r, 0, TAU); g.fill();
  g.lineWidth = 2; g.strokeStyle = 'rgba(255,225,160,0.7)'; g.beginPath(); g.arc(0, 0, f.r * (0.72 + 0.04 * Math.sin(tm * 4)), 0, TAU); g.stroke();
  g.fillStyle = 'rgba(255,240,200,0.85)';
  for(let i = 0; i < 7; i++){               /* пузыри бульона */
    const ph = (tm * 0.9 + i * 0.37) % 1, ang = i * 2.4 + f.x * 0.01, rad = f.r * (0.2 + ((i * 53) % 60) / 100);
    g.globalAlpha = a * (1 - ph) * 0.9; g.beginPath(); g.arc(Math.cos(ang) * rad, Math.sin(ang) * rad * 0.9, 3 + ph * 5, 0, TAU); g.fill();
  }
  g.restore();
}
function drawStove(g, o){
  const k = clampN(o.t / o.life, 0, 1), a = Math.min(1, k / 0.1, (1 - k) / 0.3); if(a <= 0.01) return;
  g.save(); g.translate(o.x, o.y); g.scale(1, 0.62); g.globalAlpha = a;
  g.lineWidth = 12; g.strokeStyle = '#26262c'; g.beginPath(); g.arc(0, 0, o.r, 0, TAU); g.stroke();
  g.lineWidth = 3; g.strokeStyle = '#ff7aa8'; g.beginPath(); g.arc(0, 0, o.r + 8, 0, TAU); g.stroke();
  for(let i = 0; i < 6; i++){
    const an = i / 6 * TAU + o.t * 0.5, px = Math.cos(an) * o.r, py = Math.sin(an) * o.r;
    g.fillStyle = '#15151a'; g.beginPath(); g.arc(px, py, 18, 0, TAU); g.fill();
    g.globalCompositeOperation = 'lighter'; g.strokeStyle = 'rgba(255,150,40,0.95)'; g.lineWidth = 4;
    g.beginPath(); g.arc(px, py, 11 + Math.sin(o.t * 12 + i) * 1.5, 0, TAU); g.stroke(); g.globalCompositeOperation = 'source-over';
  }
  g.restore();
}
function drawBlades(g, rb){
  const tm = now(), R = 140;
  g.save(); g.translate(rb.x, rb.y + 10); g.scale(1, 0.62); g.globalAlpha = 0.85;
  g.lineWidth = 3; g.strokeStyle = 'rgba(201,206,214,0.8)'; g.setLineDash([14, 10]); g.lineDashOffset = -tm * 60; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#e8ecf2'; g.strokeStyle = '#5a6070'; g.lineWidth = 1.5;
  for(let i = 0; i < 4; i++){ g.save(); g.rotate(i / 4 * TAU + tm * 4); g.translate(R, 0); g.beginPath(); g.moveTo(-4, -16); g.lineTo(8, 0); g.lineTo(-4, 16); g.closePath(); g.fill(); g.stroke(); g.restore(); }
  g.restore();
}
function chefDrawGround(){
  if(!CF.fx.length && !CF.puddles.length && !CF.robots.length) return;
  const g = ctx; g.save(); g.globalCompositeOperation = 'source-over';
  for(const f of CF.puddles){ if(visible(f.x, f.y, f.r + 60)) drawPuddle(g, f); }
  for(const o of CF.fx){ if(o.k === 'stove' && visible(o.x, o.y, o.r + 60)) drawStove(g, o); }
  for(const rb of CF.robots){ if(visible(rb.x, rb.y, 200)) drawBlades(g, rb); }
  g.restore();
}
/* ---------- отрисовка: верхний слой (пар, кусочки еды, искры) ---------- */
function chefDrawTop(){
  if(!CF.fx.length) return;
  const g = ctx; g.save();
  for(const o of CF.fx){
    if(o.k === 'stove' || !visible(o.x, o.y, 140)) continue;
    const k = clampN(o.t / o.life, 0, 1);
    if(o.k === 'puff'){
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 0.5 * (1 - k); g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(o.x, o.y - o.z, o.size * (1 + k * 1.4), 0, TAU); g.fill();
    } else if(o.k === 'ember'){
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.85 * (1 - k); g.fillStyle = k < 0.5 ? '#ffd27a' : '#ff6a22';
      g.beginPath(); g.arc(o.x, o.y - o.z, o.size * (1 - k * 0.6), 0, TAU); g.fill();
    } else if(o.k === 'bit'){
      const s = o.size; g.globalCompositeOperation = 'source-over'; g.globalAlpha = Math.min(1, (1 - k) * 2.2);
      g.save(); g.translate(o.x, o.y - o.z); g.rotate(o.rot); g.fillStyle = o.col;
      if(o.shape) g.fillRect(-s, -s * 0.7, s * 2, s * 1.4); else { g.beginPath(); g.arc(0, 0, s, 0, TAU); g.fill(); }
      g.restore();
    }
  }
  g.restore();
}
try { const _t = fx973Tick; fx973Tick = function(dt){ _t.apply(this, arguments); try { chefTick(dt); } catch(err) { warn('tick', err); } }; } catch(err) { warn('hookTick', err); }
try { const _dw = drawWards; drawWards = function(){ _dw.apply(this, arguments); try { chefDrawGround(); } catch(err) { warn('ground', err); } }; } catch(err) { warn('hookGround', err); }
try { const F = G.__fx973; if(F){ const _d0 = F.drawWorld; F.drawWorld = function(){ _d0.apply(this, arguments); try { chefDrawTop(); } catch(err) { warn('top', err); } }; } } catch(err) { warn('hookTop', err); }

/* ---------- скиллы ---------- */
function wrapCast(id, nade, post){
  const sk = SKILLS[id]; if(!sk || typeof sk.cast !== 'function') return;
  const orig = sk.cast;
  sk.cast = function(h){
    if(!isChef(h)) return orig.apply(this, arguments);
    const pOn = G.__cfOn, pN = G.__cfNade; G.__cfOn = true; if(nade) G.__cfNade = true;
    let res;
    try { res = orig.apply(this, arguments); } finally { G.__cfOn = pOn; G.__cfNade = pN; }
    if(res !== false){ try { post(h); } catch(err) { warn(id, err); } }
    return res;
  };
}
/* W — «Горячая кастрюля» */
wrapCast('senseGrenade', true, h => { CF.puffs(h.x, h.y, 5, {spread:14, z0:20, v0:30, v1:70}); CF.bits(h.x, h.y, 8, FOOD.pot.concat(FOOD.tomato), {spread:16}); csnd('chefClang', h.x, h.y, 0.8); });
/* E — «Кухонный комбайн» */
wrapCast('senseRobot', false, h => { CF.puffs(h.x, h.y, 8, {spread:50, v0:30, v1:80, s0:8, s1:14}); CF.bits(h.x, h.y, 10, FOOD.pancake.concat(FOOD.pepper), {spread:40}); csnd('chefDing', h.x, h.y, 0.9); });
/* R — «Адская кухня» */
wrapCast('senseUlt', false, h => {
  CF.stove(h.x, h.y, 150, 1.4);
  CF.puffs(h.x, h.y, 10, {ember:true, spread:90, v0:50, v1:130, s0:5, s1:10});
  CF.puffs(h.x, h.y, 6, {spread:70, v0:30, v1:70, s0:9, s1:16});
  CF.bits(h.x, h.y, 16, FOOD.fire.concat(FOOD.tomato), {spread:60, v0:80, v1:200});
  csnd('chefSizzle', h.x, h.y, 1); csnd('chefDing', h.x, h.y, 0.8);
});
/* робот — помечаем как кухонный комбайн (3D-модель с колпаком берёт флаг из game.js) */
try {
  const _ssr = spawnSenseRobot;
  G.spawnSenseRobot = spawnSenseRobot = function(hero, lvl){
    const r = _ssr.apply(this, arguments);
    try { if(r && isChef(hero)){ r.senseChef = true; } } catch(err) { warn('robot', err); }
    return r;
  };
} catch(err) { warn('robotHook', err); }

/* ---------- атака: еда вместо пуль ---------- */
const KINDS = ['tomato', 'pancake', 'pepper'];
try {
  const _sp = spawnProjectile;
  G.spawnProjectile = spawnProjectile = function(x, y, target, dmg, source){
    const p = _sp.apply(this, arguments);
    try {
      const o = ownerOf(projectileOwner(p));
      if(p && isChef(o) && !p.vaspArc){
        if(G.__cfNade){
          p.senseChef = {k:'pot'}; p.senseGrenade = false; p.color = '#ffb066'; p.radius = Math.max(p.radius || 6, 15);
        } else if(!p.isSpell){
          const ult = hasUlt(o), k = ult ? 'fire' : KINDS[(o._cfAtk = (o._cfAtk || 0) + 1) % 3];
          p.senseChef = {k, ult}; p.color = FOOD[k][0]; p.radius = Math.max(p.radius || 6, 10);
          if(fxLv() < 2) CF.puffs(x, y, 1, {spread:4, z0:22, v0:20, v1:44, s0:4, s1:7});
        }
      }
    } catch(err) { warn('proj', err); }
    return p;
  };
} catch(err) { warn('projHook', err); }

/* попадание: вызывается из game.js вместе с остальными эффектами снаряда */
G.senseChefHit = function(p){
  const t = p.target, c = p.senseChef, o = ownerOf(projectileOwner(p)); if(!t || !c || !isChef(o)) return;
  if(c.k === 'pot'){
    CF.puddles.push({x:t.x, y:t.y, r:130, life:3.5, max:3.5, team:o.team, owner:o});
    if(CF.puddles.length > 12) CF.puddles.shift();
    fxRing(t.x, t.y, 130, '#ff9a4a', 0.5); fxRing(t.x, t.y, 70, '#ffe2b0', 0.4);
    spawnParticles(t.x, t.y, '#ffd7a8', 18, 0.9);
    addText(t.x, t.y - 70, '380', '#ffb066', 1.0, 20);
    CF.puffs(t.x, t.y, 6, {spread:40, v0:30, v1:80, s0:8, s1:14}); CF.bits(t.x, t.y, 12, FOOD.pot.concat(FOOD.tomato, FOOD.pancake), {spread:30, v0:80, v1:200});
    csnd('chefClang', t.x, t.y, 0.9);
    return;
  }
  const k = c.k;
  CF.bits(t.x, t.y, 4, FOOD[k] || FOOD.tomato, {spread:10});
  if(t.dead || (typeof isStructure === 'function' && isStructure(t))) return;
  if(k === 'tomato'){ t.slow = Math.max(t.slowT > 0 ? t.slow : 0, 0.15); t.slowT = Math.max(t.slowT || 0, 0.8); }
  else if(k === 'pepper'){ if(typeof igniteUnit === 'function') igniteUnit(t, o, 2, 10); }
  else if(k === 'fire'){ if(typeof igniteUnit === 'function') igniteUnit(t, o, 2, 14); CF.puffs(t.x, t.y, 1, {ember:true, spread:8, v0:40, v1:90, s0:4, s1:7}); }
  /* «приправа»: 5 попаданий за 4 с — подаём блюдо */
  const tm = now(), s = t._cfSeason;
  if(!s || s.until < tm){ t._cfSeason = {n:1, until:tm + 4}; return; }
  s.n++; s.until = tm + 4;
  if(s.n >= 5){
    t._cfSeason = null;
    applyDamage(t, 40 + 6 * (o.level || 1), {team:o.team, source:o, magic:true});
    fxRing(t.x, t.y, 64, '#ffe2b0', 0.4); fxRing(t.x, t.y, 40, '#ff7aa8', 0.4);
    CF.bits(t.x, t.y, 10, FOOD.tomato.concat(FOOD.pancake, FOOD.pepper), {spread:16, v0:90, v1:220}); CF.puffs(t.x, t.y, 3, {spread:14, v0:30, v1:70});
    addText(t.x, t.y - t.radius - 44, 'ПОДАНО!', '#ffe2b0', 0.9, 16);
    csnd('chefDing', t.x, t.y, 0.8);
  }
};

function drawFood(p){
  const c = p.senseChef, r = Math.max(8, p.radius || 10), tm = now() * 10;
  const a = typeof projectileHeading === 'function' ? projectileHeading(p) : 0;
  ctx.save(); ctx.translate(p.x, p.y); ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.25; ctx.fillStyle = (FOOD[c.k] || FOOD.tomato)[1]; ctx.beginPath(); ctx.arc(0, 0, r * 2, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  if(c.k === 'tomato'){
    ctx.rotate(tm * 0.3);
    ctx.fillStyle = '#e5392e'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.35, r * 0.28, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5faa3a'; ctx.beginPath(); for(let i = 0; i < 5; i++){ const an = i / 5 * TAU - Math.PI / 2; ctx.lineTo(Math.cos(an) * r * 0.62, Math.sin(an) * r * 0.62 - r * 0.7); ctx.lineTo(Math.cos(an + 0.6) * r * 0.2, Math.sin(an + 0.6) * r * 0.2 - r * 0.7); } ctx.closePath(); ctx.fill();
  } else if(c.k === 'pancake'){
    const w = Math.max(0.3, Math.abs(Math.cos(tm * 0.35)));
    ctx.scale(1, w);
    ctx.fillStyle = '#c98a2a'; ctx.beginPath(); ctx.arc(0, r * 0.18, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f2b84a'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffe9a6'; ctx.fillRect(-r * 0.3, -r * 0.3, r * 0.6, r * 0.6);
  } else if(c.k === 'pepper'){
    ctx.rotate(a);
    ctx.fillStyle = '#e5321e'; ctx.beginPath(); ctx.moveTo(-r * 1.4, -r * 0.1); ctx.quadraticCurveTo(0, -r * 1.1, r * 1.1, -r * 0.2); ctx.quadraticCurveTo(r * 0.2, r * 0.7, -r * 1.4, -r * 0.1); ctx.fill();
    ctx.fillStyle = '#5faa3a'; ctx.fillRect(r * 0.9, -r * 0.5, r * 0.5, r * 0.34);
  } else if(c.k === 'fire'){
    ctx.rotate(a); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#ff5a1a'; ctx.beginPath(); ctx.moveTo(-r * 3.2, 0); ctx.quadraticCurveTo(-r * 1.4, -r * 1.2 + Math.sin(tm) * r * 0.3, 0, -r); ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); ctx.quadraticCurveTo(-r * 1.4, r * 1.2 + Math.cos(tm) * r * 0.3, -r * 3.2, 0); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#7a3a1a'; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 0.65, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd27a'; ctx.beginPath(); ctx.arc(r * 0.2, -r * 0.1, r * 0.3, 0, TAU); ctx.fill();
  } else {                                   /* кастрюля */
    ctx.rotate(tm * 0.25);
    ctx.fillStyle = '#4a4e58'; ctx.fillRect(-r * 1.5, -r * 0.2, r * 3, r * 0.4);
    ctx.fillStyle = '#c9ced6'; ctx.strokeStyle = '#6a707c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#eef1f5'; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff9a4a'; ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 0.14, 0, TAU); ctx.fill();
  }
  ctx.restore();
}
try {
  const _dtp = drawThemedProjectile;
  G.drawThemedProjectile = drawThemedProjectile = function(p){
    if(p && p.senseChef && !p.kind){ try { drawFood(p); return true; } catch(err) { warn('food', err); } }
    return _dtp.apply(this, arguments);
  };
} catch(err) { warn('foodHook', err); }
try {
  const _dat = drawAttackTrail;
  G.drawAttackTrail = drawAttackTrail = function(p){
    if(!(p && p.senseChef)) return _dat.apply(this, arguments);
    try {
      if(fxLv() >= 3) return;
      const h = p.hist || (p.hist = []), last = h[h.length - 1];
      if(!last || Math.hypot(p.x - last[0], p.y - last[1]) > 5){ h.push([p.x, p.y]); const mx = (typeof ATK_TRAIL !== 'undefined' && ATK_TRAIL[fxLv()]) || 8; while(h.length > mx) h.shift(); }
      if(h.length < 2) return;
      const col = p.senseChef.k === 'pot' ? '#ffffff' : (FOOD[p.senseChef.k] || FOOD.tomato)[0], rad = Math.max(4, p.radius || 9);
      ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = p.senseChef.k === 'fire' ? 'lighter' : 'source-over';
      const n = h.length;
      for(let i = 1; i <= n; i++){
        const f = i / n, x1 = i < n ? h[i][0] : p.x, y1 = i < n ? h[i][1] : p.y;
        ctx.globalAlpha = f * 0.45; ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, rad * 0.9 * f);
        ctx.beginPath(); ctx.moveTo(h[i - 1][0], h[i - 1][1]); ctx.lineTo(x1, y1); ctx.stroke();
      }
      ctx.restore();
    } catch(err) { warn('trail', err); }
  };
} catch(err) { warn('trailHook', err); }

/* ---------- аура у ног: розовое кольцо с вращающейся едой, в ульте — конфорки с огнём ---------- */
try {
  const _a = G.drawSkinAura0663;
  G.drawSkinAura0663 = function(u){
    if(_a) _a.apply(this, arguments);
    try {
      if(!isChef(u) || u.dead) return;
      const tm = now(), R = u.radius + 24, ult = hasUlt(u), pal = ['#e5392e', '#f2b84a', '#e5321e', '#7fc94a'];
      ctx.save(); ctx.translate(0, 8); ctx.scale(1, 0.62); ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 0.25; ctx.fillStyle = ult ? '#ff7a2a' : '#ff7aa8'; ctx.beginPath(); ctx.arc(0, 0, R + 6, 0, TAU); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.lineWidth = 5; ctx.strokeStyle = '#fbf7f0'; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = '#ff7aa8'; ctx.beginPath(); ctx.arc(0, 0, R + 4, 0, TAU); ctx.stroke();
      ctx.setLineDash([5, 9]); ctx.lineDashOffset = -tm * 14; ctx.lineWidth = 1.6; ctx.strokeStyle = '#ffcf6a'; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(0, 0, R + 14, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      for(let i = 0; i < 4; i++){                         /* орбитальные томат, блин, перчик, зелень */
        const an = tm * 1.1 + i / 4 * TAU, px = Math.cos(an) * (R + 24), py = Math.sin(an) * (R + 24);
        ctx.globalAlpha = 0.95; ctx.fillStyle = pal[i]; ctx.beginPath(); ctx.arc(px, py, 5.5, 0, TAU); ctx.fill();
        ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.stroke();
      }
      ctx.restore();
      if(ult){                                             /* конфорки с огоньками по кольцу */
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for(let i = 0; i < 6; i++){
          const an = i / 6 * TAU + tm * 0.6, px = Math.cos(an) * (R + 6), py = 8 + Math.sin(an) * (R + 6) * 0.62, fh = 16 + Math.sin(tm * 12 + i * 1.7) * 4;
          ctx.fillStyle = 'rgba(255,110,30,0.85)'; ctx.beginPath(); ctx.moveTo(px - 5, py); ctx.quadraticCurveTo(px - 3, py - fh * 0.6, px, py - fh); ctx.quadraticCurveTo(px + 3, py - fh * 0.6, px + 5, py); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,220,120,0.9)'; ctx.beginPath(); ctx.moveTo(px - 2.5, py); ctx.quadraticCurveTo(px, py - fh * 0.7, px + 2.5, py); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    } catch(err) { warn('aura', err); }
  };
} catch(err) { warn('auraHook', err); }
})();
