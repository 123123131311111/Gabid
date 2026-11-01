/* DotaSense 0.10.6.2 — ВАСПАССИР: новый скилл «Ядовитый рывок» (F) и АРКАНА «ЧЁРНО-БЕЛЫЙ ГАМБИТ».
   Цена арканы (1500) продублирована в accounts.js. Облик героя и копий рисует hero3d.js (skinId 'vaspassirArcana').
   • Новый скилл (для всех скинов) — «Ядовитый рывок» (F, 3 уровня): рывок на 170–380 в указанную сторону, сбрасывает замедления
     с Васпассира и оставляет на 5 с ядовитый след: враги в нём замедлены на 30% и отравлены. Боты применяют его для отхода при низком HP.
   • Аркана — шахматный монохром: чёрно-белый гоблин с короной из «фигур», нимбом и крыльями из чёрных/белых перьев.
       Атака      — чередуются чёрный и белый шары-«инь-ян». Две разные цели подряд по одному врагу за 3 с = «ШАХ!»
                    (дополнительный магический урон 36 + 5 за уровень героя и короткое замедление).
       Гранаты    — «Пешки в ход!»: гранаты чередуются чёрными и белыми. Чёрные дополнительно замедляют бег на 35%, белые — атаку на 35% (3 с).
       Двойники   — «Инь и Ян»: одна копия чёрная, другая белая; между ними натянута нить — враги, пересекающие её, получают урон и замедляются.
       Шабаш      — «Шах и мат»: копии становятся чёрно-белыми парами (между каждой парой своя нить), а под героем раскладывается
                    шахматная доска радиусом 430 на 6 с — враги на ней замедлены на 30%.
       Рывок      — след из чёрно-белых клеток.
     Механики арканы дополняют обычные, характеристики героя не меняются. Подключается после update01055.js. */
(function(){
'use strict';
const G = window;
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update01062 ' + tag + ':', err); } catch(e) {} } };
const TAU = Math.PI * 2;
const WHT = '#ffffff', BLK = '#0a0a0a', PALE = '#f2f2f2';
const ARC = 'vaspassirArcana', INK = 'vaspassirArcanaInk', IVO = 'vaspassirArcanaIvory';
const fxLv = () => (typeof fxl === 'function' ? fxl() : 0);
const rr = (a, b) => a + Math.random() * (b - a);
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const baseId = s => String(s || '').split('+')[0];
const isVA = h => !!(h && h.def && h.def.id === 'vaspassir' && baseId(h.skinId) === ARC);
const ownerOf = u => (u && u.summonKind === 'vaspCopy' ? u.owner : u);
const isFoe = (h, u) => u && !u.dead && u.team !== h.team && u.team !== 2 && !(typeof isStructure === 'function' && isStructure(u));
const visible = (x, y, m) => (typeof isWorldPointVisible === 'function' ? isWorldPointVisible(x, y, m) : true);

/* ---------- скин-аркана ---------- */
try {
  const def = {id:ARC, arcana:true, name:'ЧЁРНО-БЕЛЫЙ ГАМБИТ', heroId:'vaspassir', rarity:'arcana', price:1500, accent:'#ffffff', border:'#1a1a1a',
    previewHero:'vaspassir', previewColor:'#0a0a0a', previewColor2:'#f2f2f2', weaponColor:'#ffffff',
    desc:'АРКАНА. Гоблин-ядовар садится за шахматную доску: чёрно-белая кожа и одежда, корона из фигур, нимб и крылья из чёрных и белых перьев, шахматное кольцо у ног. Атака чередует чёрные и белые шары — два разных шара подряд по одной цели дают «ШАХ!». Гранаты становятся чёрными и белыми пешками (замедляют бег или атаку), Двойники — парой «Инь и Ян» с режущей нитью между ними, а Шабаш превращается в «Шах и мат» с шахматной доской под ногами. Не меняет характеристики.',
    hint:'Виден, когда выбран Васпассир.'};
  if(!SKIN_BY_ID[def.id]){ SKIN_DEFS.push(def); SKIN_BY_ID[def.id] = def; }
} catch(err) { warn('skin', err); }

try {
  Object.assign(SFX_PRESETS, {
    vaChime: {from:880, to:1320, duration:0.22, type:'triangle', volume:0.05, layers:[[1760, 1320, 0.02, 0.2, 'sine', 0.025]]},
    vaCheck: {from:520, to:260, duration:0.4, type:'square', volume:0.05, layers:[[1040, 520, 0.03, 0.3, 'triangle', 0.03], [90, 55, 0, 0.45, 'sine', 0.1]]},
    vaDash:  {from:300, to:900, duration:0.2, type:'sawtooth', volume:0.04, layers:[[1200, 300, 0.02, 0.18, 'triangle', 0.02]]}
  });
} catch(err) { warn('sfx', err); }
const vsnd = (k, x, y, v) => {
  try {
    const p = (typeof playerHero !== 'undefined' && playerHero && !playerHero.dead) ? playerHero : {x, y};
    const f = 1 - Math.hypot(x - p.x, y - p.y) / 1750; if(f <= 0.06) return;
    snd(k, Math.pow(f, 1.15) * (v == null ? 1 : v));
  } catch(e) {}
};

/* ---------- чёрно-белая перекраска эффектов во время каста героя с арканой ---------- */
function mono(c){
  if(typeof c !== 'string') return c;
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim()); if(!m) return c;
  const n = parseInt(m[1], 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
  const v = Math.round(Math.min(255, (0.299 * r + 0.587 * g + 0.114 * b) * 1.1 + 28)).toString(16).padStart(2, '0');
  return '#' + v + v + v;
}
function wrapColor(name, idx){
  const orig = G[name]; if(typeof orig !== 'function') return;
  G[name] = function(){
    if(G.__vaOn && typeof arguments[idx] === 'string'){ const a = Array.prototype.slice.call(arguments); a[idx] = mono(a[idx]); return orig.apply(this, a); }
    return orig.apply(this, arguments);
  };
}
try { wrapColor('fxRing', 3); wrapColor('fxBeam', 4); wrapColor('fxHit', 2); wrapColor('spawnParticles', 2); wrapColor('fxMark', 3); } catch(err) { warn('recolor', err); }
const NAME_MAP = {'ГРАНАТЫ!':'ПЕШКИ В ХОД!', 'ДВОЙНИКИ':'ИНЬ И ЯНЬ', 'ШАБАШ ВАСПАССИРОВ':'ШАХ И МАТ'};
try {
  const _at = addText;
  G.addText = function(x, y, str, color){
    if(G.__vaOn){
      const a = Array.prototype.slice.call(arguments);
      if(typeof a[3] === 'string') a[3] = mono(a[3]);
      if(typeof str === 'string' && NAME_MAP[str]) a[2] = NAME_MAP[str];
      return _at.apply(this, a);
    }
    return _at.apply(this, arguments);
  };
} catch(err) { warn('addText', err); }

/* ---------- состояние эффектов ---------- */
const VA = {fx: [], trail: [], fields: [], pairs: [], copyN: 0, thr: 0, trAcc: 0};
VA.add = o => { o.t = 0; if(VA.fx.length < 260) VA.fx.push(o); return o; };
VA.tile = (x, y, r, life, o) => VA.add(Object.assign({k:'tile', x, y, r, life, rot:rr(0, TAU), n:6, alpha:0.85}, o || {}));
VA.sparks = (x, y, n, o) => {
  if(fxLv() >= 3) return; o = o || {}; n = fxLv() === 2 ? Math.ceil(n / 2) : n;
  for(let i = 0; i < n; i++) VA.add({k:'spark', x:x + rr(-(o.spread || 14), o.spread || 14), y:y + rr(-6, 8), z:rr(2, 18), vz:rr(o.v0 || 30, o.v1 || 110), vx:rr(-24, 24), vy:rr(-10, 10),
    size:rr(2.2, 4.4), rot:rr(0, TAU), vr:rr(-5, 5), col:Math.random() < 0.5 ? 0 : 1, life:rr(0.7, 1.3)});
};

function vaTick(dt){
  if(!(dt > 0)) return;
  /* эффекты */
  for(let i = VA.fx.length - 1; i >= 0; i--){
    const o = VA.fx[i]; o.t += dt;
    if(o.t >= o.life){ VA.fx.splice(i, 1); continue; }
    if(o.k === 'spark'){ o.z += o.vz * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.rot += o.vr * dt; o.vz *= 0.985; }
  }
  /* ядовитый след рывка */
  for(let i = VA.trail.length - 1; i >= 0; i--){ VA.trail[i].life -= dt; if(VA.trail[i].life <= 0) VA.trail.splice(i, 1); }
  VA.trAcc += dt;
  if(VA.trAcc >= 0.25 && VA.trail.length){
    VA.trAcc = 0;
    try {
      for(const u of units){
        if(u.dead || u.team === 2 || (typeof isStructure === 'function' && isStructure(u))) continue;
        let tr = null;
        for(const p of VA.trail){ if(u.team !== p.team && Math.hypot(u.x - p.x, u.y - p.y) < p.r + u.radius){ tr = p; break; } }
        if(!tr) continue;
        u.slow = Math.max(u.slowT > 0 ? u.slow : 0, 0.30); u.slowT = Math.max(u.slowT || 0, 0.6);
        if(!(u.buffs && u.buffs.some(b => b.type === 'vaspPoison' && b.t > 1.4))) vaspApplyPoison(u, tr.owner, (10 + 6 * tr.lvl) * VASP_BOOST, 2.5);
      }
    } catch(err) { warn('trail', err); }
  }
  /* шахматная доска ульты */
  for(let i = VA.fields.length - 1; i >= 0; i--){
    const f = VA.fields[i]; f.life -= dt;
    if(f.life <= 0){ VA.fields.splice(i, 1); continue; }
    f.acc = (f.acc || 0) + dt;
    if(f.acc >= 0.3){ f.acc = 0;
      for(const u of units){ if(!isFoe({team:f.team}, u)) continue;
        if(Math.hypot(u.x - f.x, u.y - f.y) < f.r + u.radius){ u.slow = Math.max(u.slowT > 0 ? u.slow : 0, 0.30); u.slowT = Math.max(u.slowT || 0, 0.5); } }
    }
  }
  /* нити «Инь и Ян» между чёрной и белой копиями */
  VA.pairs.length = 0;
  if(typeof heroes !== 'undefined'){
    for(const h of heroes){
      if(!isVA(h) || h.dead) continue;
      const ink = [], ivo = [];
      for(const u of units){ if(u.dead || u.summonKind !== 'vaspCopy' || u.owner !== h) continue; (u.vaspArcSide ? ivo : ink).push(u); }
      const n = Math.min(ink.length, ivo.length);
      for(let i = 0; i < n; i++) VA.pairs.push({a:ink[i], b:ivo[i], h});
      h._vaThr = (h._vaThr || 0) + dt;
      if(h._vaThr >= 0.5){ h._vaThr = 0;
        const dmg = 14 + h.level * 2.5;
        for(const pr of VA.pairs){ if(pr.h !== h) continue;
          const ax = pr.a.x, ay = pr.a.y, bx = pr.b.x, by = pr.b.y, vx = bx - ax, vy = by - ay, L2 = vx * vx + vy * vy || 1;
          if(L2 > 900 * 900) continue;
          for(const u of units){ if(!isFoe(h, u)) continue;
            const k = clampN(((u.x - ax) * vx + (u.y - ay) * vy) / L2, 0, 1), d = Math.hypot(u.x - (ax + vx * k), u.y - (ay + vy * k));
            if(d < 42 + u.radius){
              applyDamage(u, dmg, {team:h.team, source:h, magic:true});
              u.slow = Math.max(u.slowT > 0 ? u.slow : 0, 0.25); u.slowT = Math.max(u.slowT || 0, 0.8);
              spawnParticles(u.x, u.y, Math.random() < 0.5 ? '#ffffff' : '#222222', 4, 0.4);
            }
          }
        }
      }
    }
    /* фоновые «фигуры» вокруг героев с арканой */
    if(fxLv() < 2){
      for(const h of heroes){
        if(!isVA(h) || h.dead) continue;
        if(h.team !== 0 && typeof isVisibleToPlayer === 'function' && !isVisibleToPlayer(h)) continue;
        h._vaS = (h._vaS || 0) + dt;
        if(h._vaS > (fxLv() === 1 ? 0.3 : 0.15)){ h._vaS = 0; VA.sparks(h.x, h.y, 1, {spread:24, v0:26, v1:80}); }
      }
    }
  }
}

/* ---------- отрисовка: земля ---------- */
function drawTile(g, o){
  const k = clampN(o.t / o.life, 0, 1), a = (o.steady ? Math.min(1, k / 0.05, (1 - k) / 0.1) : (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85)) * (o.alpha || 0.85);
  if(a <= 0.01) return;
  g.save(); g.translate(o.x, o.y); g.scale(1, 0.62); g.rotate(o.rot + o.t * (o.spin == null ? 0.6 : o.spin)); g.globalAlpha = a;
  g.beginPath(); g.arc(0, 0, o.r, 0, TAU); g.clip();
  const n = o.n || 6, cs = o.r * 2 / n;
  for(let i = 0; i < n; i++) for(let j = 0; j < n; j++){ g.fillStyle = (i + j) % 2 ? PALE : '#0c0c0c'; g.fillRect(-o.r + i * cs, -o.r + j * cs, cs + 0.6, cs + 0.6); }
  g.restore();
  g.save(); g.translate(o.x, o.y); g.scale(1, 0.62); g.globalAlpha = a; g.lineWidth = 3; g.strokeStyle = WHT; g.beginPath(); g.arc(0, 0, o.r, 0, TAU); g.stroke();
  g.lineWidth = 2; g.strokeStyle = BLK; g.beginPath(); g.arc(0, 0, o.r - 3, 0, TAU); g.stroke(); g.restore();
}
function vaDrawGround(){
  if(!VA.fx.length && !VA.trail.length && !VA.fields.length) return;
  const g = ctx; g.save(); g.globalCompositeOperation = 'source-over';
  for(const o of VA.fx){ if(o.k !== 'tile' || !visible(o.x, o.y, o.r + 80)) continue; drawTile(g, o); }
  for(const f of VA.fields){ if(!visible(f.x, f.y, f.r + 80)) continue;
    drawTile(g, {x:f.x, y:f.y, r:f.r, n:10, rot:0.4, spin:0.05, alpha:0.5, steady:true, t:f.max - f.life, life:f.max}); }
  for(const p of VA.trail){
    if(!visible(p.x, p.y, 100)) continue;
    const a = clampN(p.life / p.max, 0, 1);
    if(p.arc){
      g.save(); g.translate(p.x, p.y); g.scale(1, 0.62); g.rotate(p.rot); g.globalAlpha = Math.min(0.9, a * 1.4);
      g.fillStyle = p.side ? PALE : '#0c0c0c'; g.strokeStyle = p.side ? BLK : WHT; g.lineWidth = 2; g.fillRect(-20, -20, 40, 40); g.strokeRect(-20, -20, 40, 40); g.restore();
    } else {
      const gr = g.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
      gr.addColorStop(0, 'rgba(150,255,90,0.5)'); gr.addColorStop(1, 'rgba(60,160,30,0)');
      g.globalAlpha = a * 0.9; g.fillStyle = gr; g.beginPath(); g.ellipse(p.x, p.y, p.r, p.r * 0.62, 0, 0, TAU); g.fill();
    }
  }
  g.restore();
}
/* ---------- отрисовка: верхний слой ---------- */
function vaDrawTop(){
  if(!VA.fx.length && !VA.pairs.length) return;
  const g = ctx; g.save(); g.globalCompositeOperation = 'source-over';
  for(const o of VA.fx){
    if(o.k !== 'spark' || !visible(o.x, o.y, 140)) continue;
    const k = clampN(o.t / o.life, 0, 1), a = Math.min(1, (1 - k) * 2.2), s = o.size;
    g.save(); g.translate(o.x, o.y - o.z); g.rotate(o.rot); g.globalAlpha = a;
    g.fillStyle = o.col ? PALE : '#0c0c0c'; g.strokeStyle = o.col ? BLK : WHT; g.lineWidth = 1.2; g.fillRect(-s, -s, s * 2, s * 2); g.strokeRect(-s, -s, s * 2, s * 2); g.restore();
  }
  for(const pr of VA.pairs){
    const a = pr.a, b = pr.b; if(a.dead || b.dead) continue;
    if(!visible((a.x + b.x) / 2, (a.y + b.y) / 2, 500)) continue;
    const ay = a.y - 22, by = b.y - 22, tm = (typeof gameTime === 'number' ? gameTime : 0);
    g.lineCap = 'round'; g.globalAlpha = 0.9;
    g.strokeStyle = WHT; g.lineWidth = 4; g.setLineDash([]); g.beginPath(); g.moveTo(a.x, ay); g.lineTo(b.x, by); g.stroke();
    g.strokeStyle = BLK; g.lineWidth = 3; g.setLineDash([12, 12]); g.lineDashOffset = -tm * 40; g.beginPath(); g.moveTo(a.x, ay); g.lineTo(b.x, by); g.stroke(); g.setLineDash([]);
    const mx = (a.x + b.x) / 2, my = (ay + by) / 2, q = 7 + Math.sin(tm * 6) * 1.5;
    g.save(); g.translate(mx, my); g.rotate(tm * 1.5); g.fillStyle = WHT; g.strokeStyle = BLK; g.lineWidth = 2;
    g.beginPath(); g.arc(0, 0, q, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = BLK; g.beginPath(); g.arc(0, 0, q, -Math.PI / 2, Math.PI / 2); g.fill(); g.restore();
  }
  g.restore();
}
try { const _t = fx973Tick; fx973Tick = function(dt){ _t.apply(this, arguments); try { vaTick(dt); } catch(err) { warn('tick', err); } }; } catch(err) { warn('hookTick', err); }
try { const _dw = drawWards; drawWards = function(){ _dw.apply(this, arguments); try { vaDrawGround(); } catch(err) { warn('ground', err); } }; } catch(err) { warn('hookGround', err); }
try { const F = G.__fx973; if(F){ const _d0 = F.drawWorld; F.drawWorld = function(){ _d0.apply(this, arguments); try { vaDrawTop(); } catch(err) { warn('top', err); } }; } } catch(err) { warn('hookTop', err); }

/* ---------- «Ядовитый рывок» (F) — новый скилл Васпассира ---------- */
SKILLS.vaspDash = {
  name:'Ядовитый рывок', short:'F', type:'point', maxLevel:3, range:380,
  cd:[0,20,18,16], mana:[0,80,90,100],
  desc:'Рывок на 170–380 в указанную сторону. Снимает замедление с Васпассира и оставляет на 5 секунд ядовитый след: враги в нём замедлены на 30% и отравлены. У арканы след из чёрно-белых клеток.',
  cast(h, x, y, lvl){
    const arc = isVA(h);
    let dir = Math.atan2(y - h.y, x - h.x); if(!Number.isFinite(dir)) dir = h.facing || 0;
    const want = Math.hypot(x - h.x, y - h.y), dist = clampN(want, 170, 380);
    const nx = clamp(h.x + Math.cos(dir) * dist, 60, WORLD - 60), ny = clamp(h.y + Math.sin(dir) * dist, 60, WORLD - 60);
    const steps = Math.max(3, Math.round(Math.hypot(nx - h.x, ny - h.y) / 55));
    for(let i = 0; i <= steps; i++){
      const k = i / steps;
      VA.trail.push({x:h.x + (nx - h.x) * k, y:h.y + (ny - h.y) * k, life:5, max:5, r:62, owner:h, lvl, team:h.team, arc, side:i % 2, rot:rr(-0.4, 0.4)});
    }
    if(VA.trail.length > 80) VA.trail.splice(0, VA.trail.length - 80);
    const prev = G.__vaOn; G.__vaOn = arc;
    try {
      fxBeam(h.x, h.y - 10, nx, ny, arc ? WHT : '#9dff6a', 0.4);
      spawnParticles(h.x, h.y, '#8dff5a', 14, 0.6);
      h.x = nx; h.y = ny; h.facing = dir;
      spawnParticles(nx, ny, '#8dff5a', 14, 0.6); fxRing(nx, ny, 60, '#8dff5a', 0.35);
      addText(h.x, h.y - 84, arc ? 'ХОД КОНЁМ' : 'РЫВОК', arc ? WHT : '#9dff6a', 0.9, 14);
    } finally { G.__vaOn = prev; }
    h.slow = 0; h.slowT = 0;
    if(arc) VA.sparks(nx, ny, 8, {spread:30});
    vsnd('vaDash', nx, ny, 0.8);
    return true;
  }
};
try {
  const vd = HERO_DEFS.find(d => d.id === 'vaspassir');
  if(vd && !vd.skills.includes('vaspDash')) vd.skills.push('vaspDash');
} catch(err) { warn('heroDef', err); }
try {
  if(typeof HERO_GUIDES !== 'undefined' && HERO_GUIDES.vaspassir){
    const gd = HERO_GUIDES.vaspassir;
    gd.skills = [1, 0, 2, 4];
    if(String(gd.skillNote || '').indexOf('Ядовитый рывок') < 0) gd.skillNote = (gd.skillNote || '') + ' Ядовитый рывок (F) — отскок и ядовитый след на 5 с: враги в нём замедлены и отравлены.';
    gd.tips = (gd.tips || []).concat(['Ядовитый рывок снимает замедление — используйте его, чтобы вырваться, и оставьте след в узком проходе, чтобы враги не догнали.']);
  }
} catch(err) { warn('guide', err); }

/* ---------- скиллы арканы ---------- */
function wrapCast(id, post){
  const sk = SKILLS[id]; if(!sk || typeof sk.cast !== 'function') return;
  const orig = sk.cast;
  sk.cast = function(h){
    if(!isVA(h)) return orig.apply(this, arguments);
    const n0 = aoes.length, prev = G.__vaOn; G.__vaOn = true; let res;
    try { res = orig.apply(this, arguments); } finally { G.__vaOn = prev; }
    if(res !== false){ try { post(h, n0); } catch(err) { warn(id, err); } }
    return res;
  };
}
/* W — «Пешки в ход!»: чёрные и белые гранаты */
wrapCast('vaspGrenades', (h, n0) => {
  let i = 0;
  for(let k = n0; k < aoes.length; k++){
    const a = aoes[k]; if(!a || !a.vaspGrenade) continue;
    const ink = (i++ % 2) === 0; a.vaspArcKind = ink ? 'ink' : 'ivory'; a.color = ink ? '#9a9a9a' : WHT;
    VA.tile(a.x, a.y, a.radius, 1.5, {n:4, alpha:0.8, spin:ink ? -1.2 : 1.2});
  }
  VA.sparks(h.x, h.y, 10, {spread:40, v0:50, v1:140}); vsnd('vaChime', h.x, h.y, 0.8);
});
G.vaspArcGrenadeHit = function(a, u){
  if(!a._vaB){ a._vaB = 1; VA.tile(a.x, a.y, a.radius * 1.1, 0.8, {n:4, alpha:0.9}); VA.sparks(a.x, a.y, 8, {spread:a.radius * 0.6, v0:60, v1:160}); }
  if(!u || u.dead) return;
  const ink = a.vaspArcKind === 'ink';
  if(ink){ u.slow = Math.max(u.slowT > 0 ? u.slow : 0, 0.35); u.slowT = Math.max(u.slowT || 0, 3); }
  else { u.attackSlow = Math.max(u.attackSlow || 0, 0.35); u.attackSlowT = Math.max(u.attackSlowT || 0, 3); }
  addText(u.x, u.y - u.radius - 56, ink ? 'ТЬМА' : 'СВЕТ', ink ? '#9a9a9a' : WHT, 0.7, 12);
};
/* E — «Инь и Ян» */
wrapCast('vaspCopies', h => { VA.tile(h.x, h.y, 150, 1.2, {n:6}); VA.sparks(h.x, h.y, 12, {spread:30}); vsnd('vaChime', h.x, h.y, 0.9); });
/* R — «Шах и мат» */
wrapCast('vaspUltimate', h => {
  VA.fields.push({x:h.x, y:h.y, r:430, life:6, max:6, team:h.team, owner:h});
  VA.tile(h.x, h.y, 260, 1.0, {n:8, alpha:0.9});
  VA.sparks(h.x, h.y, 26, {spread:80, v0:60, v1:180});
  vsnd('vaCheck', h.x, h.y, 1);
});
/* копии: чёрные и белые попеременно */
try {
  const _vc = vaspSpawnCopy;
  G.vaspSpawnCopy = vaspSpawnCopy = function(hero, variantId, o){
    const c = _vc.apply(this, arguments);
    try {
      if(c && isVA(hero)){
        const side = (VA.copyN++) % 2; c.vaspArcSide = side;
        c.copyDef = Object.assign({}, c.copyDef, {skinId: side ? IVO : INK});
        VA.tile(c.x, c.y, 60, 0.9, {n:4}); VA.sparks(c.x, c.y, 5, {spread:14});
      }
    } catch(err) { warn('copy', err); }
    return c;
  };
} catch(err) { warn('copyHook', err); }

/* ---------- атака: чёрный и белый шары, «ШАХ!» ---------- */
try {
  const _sp = spawnProjectile;
  G.spawnProjectile = spawnProjectile = function(x, y, target, dmg, source){
    const p = _sp.apply(this, arguments);
    try {
      const o = ownerOf(projectileOwner(p));
      if(p && !p.isSpell && isVA(o)){
        const side = (o._vaAtk = (o._vaAtk || 0) + 1) % 2;
        p.vaspArc = side + 1; p.color = side ? WHT : '#161616'; p.radius = Math.max(p.radius || 6, 9);
        if(fxLv() < 2) VA.sparks(x, y, 1, {spread:6});
      }
    } catch(err) { warn('proj', err); }
    return p;
  };
} catch(err) { warn('projHook', err); }
G.vaspArcHit = function(p){
  const t = p.target, o = ownerOf(projectileOwner(p));
  if(!t || t.dead || !isVA(o) || (typeof isStructure === 'function' && isStructure(t))) return;
  const now = (typeof gameTime === 'number' ? gameTime : 0), m = t._vaMark, side = p.vaspArc;
  spawnParticles(t.x, t.y, side === 2 ? WHT : '#555555', 4, 0.35);
  if(m && m.until > now && m.side !== side){
    t._vaMark = null;
    applyDamage(t, 36 + o.level * 5, {team:o.team, source:o, magic:true});
    if(t.dead) return;
    t.slow = Math.max(t.slowT > 0 ? t.slow : 0, 0.25); t.slowT = Math.max(t.slowT || 0, 1);
    fxRing(t.x, t.y, 62, WHT, 0.35); fxRing(t.x, t.y, 42, '#222222', 0.35);
    VA.tile(t.x, t.y, 56, 0.6, {n:4, alpha:0.9}); VA.sparks(t.x, t.y, 6, {spread:16, v0:50, v1:140});
    addText(t.x, t.y - t.radius - 44, 'ШАХ!', WHT, 0.9, 16);
    vsnd('vaCheck', t.x, t.y, 0.7);
  } else {
    t._vaMark = {side, until:now + 3};
  }
};
function drawBolt(p){
  const r = Math.max(7, p.radius || 9), tm = (typeof gameTime === 'number' ? gameTime : 0) * 10, white = p.vaspArc === 2;
  const A = white ? PALE : '#101010', B = white ? '#101010' : PALE;
  ctx.save(); ctx.translate(p.x, p.y); ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.28; ctx.fillStyle = white ? WHT : '#000000'; ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1; ctx.rotate(tm);
  ctx.fillStyle = A; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.fillStyle = B; ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -r / 2, r / 2, 0, TAU); ctx.fill();
  ctx.fillStyle = A; ctx.beginPath(); ctx.arc(0, r / 2, r / 2, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(0, -r / 2, r * 0.16, 0, TAU); ctx.fill();
  ctx.fillStyle = B; ctx.beginPath(); ctx.arc(0, r / 2, r * 0.16, 0, TAU); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = white ? '#000000' : WHT; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.restore();
}
try {
  const _dtp = drawThemedProjectile;
  G.drawThemedProjectile = drawThemedProjectile = function(p){
    if(p && p.vaspArc && !p.kind){ try { drawBolt(p); return true; } catch(err) { warn('bolt', err); } }
    return _dtp.apply(this, arguments);
  };
} catch(err) { warn('boltHook', err); }
try {
  const _dat = drawAttackTrail;
  G.drawAttackTrail = drawAttackTrail = function(p){
    if(!(p && p.vaspArc)) return _dat.apply(this, arguments);
    try {
      if(fxLv() >= 3) return;
      const h = p.hist || (p.hist = []), last = h[h.length - 1];
      if(!last || Math.hypot(p.x - last[0], p.y - last[1]) > 5){ h.push([p.x, p.y]); const mx = (typeof ATK_TRAIL !== 'undefined' && ATK_TRAIL[fxLv()]) || 8; while(h.length > mx) h.shift(); }
      if(h.length < 2) return;
      ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'source-over';
      const n = h.length, rad = Math.max(4, p.radius || 9);
      for(let i = 1; i <= n; i++){
        const f = i / n, x1 = i < n ? h[i][0] : p.x, y1 = i < n ? h[i][1] : p.y;
        ctx.globalAlpha = f * 0.55; ctx.strokeStyle = p.vaspArc === 2 ? WHT : '#050505'; ctx.lineWidth = Math.max(2, rad * 1.1 * f);
        ctx.beginPath(); ctx.moveTo(h[i - 1][0], h[i - 1][1]); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.globalAlpha = f * 0.6; ctx.strokeStyle = p.vaspArc === 2 ? '#000000' : WHT; ctx.lineWidth = Math.max(1, rad * 0.25 * f);
        ctx.beginPath(); ctx.moveTo(h[i - 1][0], h[i - 1][1]); ctx.lineTo(x1, y1); ctx.stroke();
      }
      ctx.restore();
    } catch(err) { warn('trail', err); }
  };
} catch(err) { warn('trailHook', err); }

/* ---------- аура у ног: шахматное кольцо (вызывается из game.js вместе с аурами других арканов) ---------- */
G.drawVaspArcanaAura = function(u){
  try {
    const o = ownerOf(u);
    if(!isVA(o) || u.dead) return;
    const copy = u.summonKind === 'vaspCopy', side = copy ? (u.vaspArcSide || 0) : 0;
    const R = u.radius + 24, tm = (typeof gameTime === 'number' ? gameTime : 0), N = 20, dir = copy ? -1 : 1;
    ctx.save(); ctx.translate(0, 8); ctx.scale(1, 0.62); ctx.globalCompositeOperation = 'source-over'; ctx.lineCap = 'butt';
    ctx.globalAlpha = 0.25; ctx.fillStyle = side ? '#ffffff' : '#000000'; ctx.beginPath(); ctx.arc(0, 0, R + 6, 0, TAU); ctx.fill();
    ctx.lineWidth = 8;
    for(let i = 0; i < N; i++){
      const a0 = i / N * TAU + tm * 0.5 * dir;
      ctx.globalAlpha = 0.92; ctx.strokeStyle = (i + side) % 2 ? PALE : '#0a0a0a';
      ctx.beginPath(); ctx.arc(0, 0, R, a0, a0 + TAU / N + 0.012); ctx.stroke();
    }
    ctx.lineWidth = 1.8; ctx.globalAlpha = 0.85; ctx.strokeStyle = WHT; ctx.beginPath(); ctx.arc(0, 0, R + 5, 0, TAU); ctx.stroke();
    ctx.strokeStyle = '#000000'; ctx.beginPath(); ctx.arc(0, 0, R - 5, 0, TAU); ctx.stroke();
    ctx.setLineDash([5, 9]); ctx.lineDashOffset = -tm * 14 * dir; ctx.strokeStyle = WHT; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, 0, R + 16, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    for(let i = 0; i < 4; i++){                                /* орбитальные «фигуры» */
      const a = -i / 4 * TAU * dir - tm * 1.2 * dir, px = Math.cos(a) * (R + 26), py = Math.sin(a) * (R + 26);
      ctx.save(); ctx.translate(px, py); ctx.rotate(tm * 1.5 + i); ctx.globalAlpha = 0.95;
      ctx.fillStyle = (i + side) % 2 ? PALE : '#0a0a0a'; ctx.strokeStyle = (i + side) % 2 ? '#000000' : WHT; ctx.lineWidth = 1.6;
      ctx.fillRect(-5, -5, 10, 10); ctx.strokeRect(-5, -5, 10, 10); ctx.restore();
    }
    ctx.restore();
  } catch(err) { warn('aura', err); }
};
})();
