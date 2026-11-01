/* DotaSense 0.10.2 — АРКАНА ГРИШИ «БАГРОВЫЙ АРХИМАГ» (красно-чёрный стиль).
   Цена (1500) продублирована в accounts.js. Облик героя рисует hero3d.js (skinId 'grishaArcana').
   • Облик: чёрная мантия, кроваво-красные грани, адский венец из рогов, крылья из чёрного пламени, шипы на плечах,
     тёмные ядра в орбах, парящие кровавые руны, перевёрнутая пентаграмма у ног.
   • Вокруг героя: вращающаяся пентаграмма с языками тёмного пламени, орбитальные угли, искры и дым (аура + частицы).
   • Атака — «кровавый заряд»: чёрное ядро, красная корона, орбитальные угли и багровый шлейф.
   • Скиллы (изменены 9 из 10 заклинаний Призыва + все три орба + «Усиление стихий»; у арканы своя механика и названия):
       300 «Кровавый поцелуй»  — удар возвращает Грише 25% базового урона здоровьем.
       030 «Кровавая луна»     — через 3 с взрыв дополнительно замедляет врагов на 35% на 2 с.
       003 «Чёрное солнце»     — после основного удара вторая волна затмения (+20% урона) с задержкой.
       201 «Теневой шаг»       — в точках отправления и прибытия взрываются кровавые печати.
       120 «Багровый вихрь»    — вместо одного смерча — три (боковые слабее на 50%).
       021 «Кровавая ярость»   — к бодрости добавляется +50% к скорости атаки.
       102 «Метеор Бездны»     — по бокам падают два малых метеора (по 30% урона).
       012 «Клеймо палача»     — цель клеймится и замедляется на 40% на 3 с.
       111 «Кровавый обряд»    — враги стягиваются к центру взрыва до оглушения.
       210 «Ледяная стена»     — только красная перекраска эффектов.
   • Q/W/E — кровавые руны разных цветов (кровь / молния / уголь). Подключается после update01015.js. */
(function(){
'use strict';
const G = window;
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update0102 ' + tag + ':', err); } catch(e) {} } };
const TAU = Math.PI * 2;
const RED = '#ff2438', BLD = '#d4122e', ROSE = '#ff3d6e', EMB = '#ff9a1f', DRK = '#12040a', PALE = '#ffd6dc', WHT = '#ffffff';
const COLS = [RED, BLD, EMB, ROSE];
const fxLv = () => (typeof fxl === 'function' ? fxl() : 0);
const rr = (a, b) => a + Math.random() * (b - a);
const isGA = u => { const d = u && (u.def || u.copyDef); return !!(d && d.id === 'grisha' && String(u.skinId || '').split('+')[0] === 'grishaArcana'); };
const ease = k => 1 - Math.pow(1 - k, 3);
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
const isFoe = (h, u) => u && !u.dead && u.team !== h.team && u.team !== 2 && !(typeof isStructure === 'function' && isStructure(u));

/* ---------- скин ---------- */
try {
  const def = {id:'grishaArcana', arcana:true, name:'БАГРОВЫЙ АРХИМАГ', heroId:'grisha', rarity:'arcana', price:1500, accent:'#ff2438', border:'#7a0a18',
    previewHero:'grisha', previewColor:'#120206', previewColor2:'#ff2438', weaponColor:'#ff2438',
    desc:'АРКАНА. Маг трёх стихий сбрасывает радужную мантию и становится Багровым Архимагом: чёрная ткань, кроваво-красные грани, адский венец из рогов, крылья из чёрного пламени, шипы на плечах и тёмные ядра в орбах. Вокруг него парят кровавые руны и алые искры, а под ногами горит перевёрнутая пентаграмма. Атака превращается в кровавый заряд, орбы вспыхивают рунами крови, молнии и угля, а заклинания Призыва получают свои названия и свою механику: «Кровавый поцелуй» лечит, «Кровавая луна» замедляет, «Чёрное солнце» бьёт второй волной, «Теневой шаг» оставляет печати, «Багровый вихрь» запускает три смерча, «Метеор Бездны» роняет ещё два малых метеора, «Кровавый обряд» стягивает врагов в центр.',
    hint:'Виден, когда выбран Гриша.'};
  if(!SKIN_BY_ID[def.id]){ SKIN_DEFS.push(def); SKIN_BY_ID[def.id] = def; }
} catch(err) { warn('skin', err); }

Object.assign(SFX_PRESETS, {
  gaBlood: {from:220, to:90, duration:0.28, type:'sawtooth', volume:0.05, layers:[[1400, 700, 0.02, 0.2, 'triangle', 0.02]]},
  gaBloodBig: {from:140, to:55, duration:0.8, type:'sawtooth', volume:0.08, layers:[[600, 180, 0.04, 0.6, 'square', 0.03], [60, 40, 0, 0.7, 'sine', 0.12]]}
});
const gsnd = (k, x, y, v) => {
  try {
    const p = (typeof playerHero !== 'undefined' && playerHero && !playerHero.dead) ? playerHero : (typeof cam !== 'undefined' ? cam : {x, y});
    const f = 1 - Math.hypot(x - p.x, y - p.y) / 1750; if(f <= 0.06) return;
    snd(k, Math.pow(f, 1.15) * (v == null ? 1 : v));
  } catch(e) {}
};

/* ---------- красная перекраска (пока идёт каст героя с арканой) ---------- */
function recol(c){
  if(typeof c !== 'string') return c;
  const m = /^#([0-9a-f]{6})$/i.exec(c.trim()); if(!m) return c;
  const n = parseInt(m[1], 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
  if(mx !== mn){ const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : (mx === g ? (b - r) / d + 2 : (r - g) / d + 4); h *= 60; }
  if(l > 0.9) return c;
  const hsl = (H, S, L) => { H = ((H % 360) + 360) % 360 / 360; const q = L < 0.5 ? L * (1 + S) : L + S - L * S, p = 2 * L - q;
    const f = t => { t = (t + 1) % 1; return t < 1/6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2/3 ? p + (q - p) * (2/3 - t) * 6 : p; };
    return '#' + [f(H + 1/3), f(H), f(H - 1/3)].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join(''); };
  if(h >= 255 && h < 345) return hsl(342, 0.95, clampN(l, 0.5, 0.66));
  if(h >= 70 && h < 255) return hsl(354, 0.9, clampN(l, 0.42, 0.62));
  if(h >= 45 && h < 70) return hsl(28, 1, clampN(l, 0.5, 0.62));
  return c;
}
function wrapColor(name, idx){
  const orig = G[name]; if(typeof orig !== 'function') return;
  G[name] = function(){
    if(G.__gaOn && typeof arguments[idx] === 'string'){ const a = Array.prototype.slice.call(arguments); a[idx] = recol(a[idx]); return orig.apply(this, a); }
    return orig.apply(this, arguments);
  };
}
try { wrapColor('fxRing', 3); wrapColor('fxBeam', 4); wrapColor('fxHit', 2); wrapColor('spawnParticles', 2); wrapColor('fxMark', 3); wrapColor('fxArcaneBurst', 3);
  wrapColor('spawnAoE', 6); wrapColor('spawnRollingSpell', 6); } catch(err) { warn('recolor', err); }

/* названия заклинаний арканы (для текста при касте и для панели призыва) */
const NAME_MAP = {'Холодный удар':'Кровавый поцелуй', 'ЭМИ':'Кровавая луна', 'Удар солнца':'Чёрное солнце', 'Призрачная походка':'Теневой шаг',
  'Смерч':'Багровый вихрь', 'Бодрость':'Кровавая ярость', 'Хаос-метеор':'Метеор Бездны', 'Кузнечный дух':'Клеймо палача', 'Оглушающий взрыв':'Кровавый обряд'};
G.__gaSpellName = (h, name) => (isGA(h) && NAME_MAP[name]) || name;
try {
  const _at = addText;
  G.addText = function(x, y, str, color){
    if(G.__gaOn){
      const a = Array.prototype.slice.call(arguments);
      if(typeof a[3] === 'string') a[3] = recol(a[3]);
      if(typeof str === 'string' && str.indexOf('→ ') === 0 && NAME_MAP[str.slice(2)]) a[2] = '→ ' + NAME_MAP[str.slice(2)];
      return _at.apply(this, a);
    }
    return _at.apply(this, arguments);
  };
} catch(err) { warn('addText', err); }

/* ---------- частицы арканы: земля (печати, луны, волны) и верхний слой (угли, осколки, столбы, пламя) ---------- */
const GA = {list: [], q: []};
GA.add = function(o){
  if(fxLv() >= 3) return null;
  if(GA.list.length >= (fxLv() >= 2 ? 90 : 220)){ const i = GA.list.findIndex(e => e.minor); if(i < 0){ if(o.minor) return null; GA.list.shift(); } else GA.list.splice(i, 1); }
  o.t = -(o.delay || 0); GA.list.push(o); return o;
};
GA.later = (sec, fn) => { GA.q.push({t: sec, fn}); };
GA.embers = (x, y, n, o) => {
  if(fxLv() >= 3) return; o = o || {}; n = Math.ceil(n * (fxLv() >= 2 ? 0.4 : fxLv() === 1 ? 0.7 : 1));
  for(let i = 0; i < n; i++){ const a = Math.random() * TAU, sp = rr(o.s0 || 30, o.s1 || 140);
    GA.add({k:'ember', minor:true, x:x + Math.cos(a) * rr(0, o.spread || 8), y:y + Math.sin(a) * rr(0, (o.spread || 8) * 0.6), z:o.z0 == null ? 14 : o.z0,
      vx:Math.cos(a) * sp, vy:Math.sin(a) * sp * 0.5, vz:rr(o.v0 || 60, o.v1 || 220), g:o.g == null ? 260 : o.g, size:rr(o.sz0 || 2, o.sz1 || 5), col:COLS[i % 4], life:rr(0.6, 1.3)}); }
};
GA.shards = (x, y, n, o) => {
  if(fxLv() >= 3) return; o = o || {}; n = Math.ceil(n * (fxLv() >= 2 ? 0.4 : 1));
  for(let i = 0; i < n; i++){ const a = Math.random() * TAU, sp = rr(o.s0 || 80, o.s1 || 280);
    GA.add({k:'shard', minor:true, x, y, z:o.z0 == null ? 20 : o.z0, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp * 0.5, vz:rr(110, 330), g:560, size:rr(3.5, 8),
      col:i % 3 ? BLD : '#7a0a18', rot:Math.random() * TAU, vr:rr(-9, 9), life:rr(0.7, 1.2)}); }
};
GA.sigil = (x, y, r0, r1, life, o) => GA.add(Object.assign({k:'sigil', x, y, r0, r1, life, spin:0.7}, o || {}));
GA.pillar = (x, y, w, h, life, o) => GA.add(Object.assign({k:'pillar', x, y, w, h, life}, o || {}));
GA.flames = (x, y, n, rad, o) => {
  if(fxLv() >= 3) return; n = Math.ceil(n * (fxLv() >= 2 ? 0.5 : 1)); o = o || {};
  for(let i = 0; i < n; i++){ const a = i / n * TAU + Math.random() * 0.4;
    GA.add({k:'flame', minor:true, x:x + Math.cos(a) * rad, y:y + Math.sin(a) * rad * 0.62, h:rr(o.h0 || 40, o.h1 || 80), w:rr(7, 13), life:rr(0.5, 0.9), delay:rr(0, o.dly || 0.2), col:i % 3 === 0 ? EMB : RED}); }
};
/* отложенные действия и смена времени */
function gaTick(dt){
  if(!(dt > 0)) return;
  for(let i = GA.q.length - 1; i >= 0; i--){ const e = GA.q[i]; e.t -= dt; if(e.t <= 0){ GA.q.splice(i, 1); try { e.fn(); } catch(err) { warn('later', err); } } }
  for(let i = GA.list.length - 1; i >= 0; i--){
    const o = GA.list[i]; o.t += dt;
    if(o.t < 0) continue;
    if(o.t >= o.life){ GA.list.splice(i, 1); continue; }
    if(o.k === 'ember' || o.k === 'shard'){
      o.vz -= o.g * dt; o.z += o.vz * dt; o.x += o.vx * dt; o.y += o.vy * dt; o.vx *= 0.985; o.vy *= 0.985;
      if(o.k === 'shard') o.rot += o.vr * dt; if(o.z < 0){ o.z = 0; o.vz = Math.abs(o.vz) * 0.3; o.vx *= 0.6; o.vy *= 0.6; }
    }
  }
  /* фоновые угли вокруг героев с арканой */
  if(fxLv() < 2 && typeof heroes !== 'undefined'){
    for(const h of heroes){
      if(!isGA(h) || h.dead) continue;
      if(h.team !== 0 && typeof isVisibleToPlayer === 'function' && !isVisibleToPlayer(h)) continue;
      h._gaE = (h._gaE || 0) + dt;
      if(h._gaE > (fxLv() === 1 ? 0.22 : 0.11)){ h._gaE = 0;
        GA.add({k:'ember', minor:true, x:h.x + rr(-22, 22), y:h.y + rr(-6, 10), z:rr(4, 30), vx:rr(-14, 14), vy:rr(-8, 8), vz:rr(50, 110), g:-18, size:rr(1.8, 4), col:COLS[(Math.random() * 4) | 0], life:rr(0.9, 1.6)});
      }
    }
  }
}
const visible = (x, y, m) => (typeof isWorldPointVisible === 'function' ? isWorldPointVisible(x, y, m) : true);
function pentagram(g, R){ g.beginPath(); for(let i = 0; i <= 5; i++){ const a = (i * 2 % 5) * TAU / 5 + Math.PI / 2; const px = Math.cos(a) * R, py = Math.sin(a) * R; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
function drawSigil(g, o){
  const k = clampN(o.t / o.life, 0, 1), r = o.r0 + (o.r1 - o.r0) * (o.moon ? Math.min(1, o.t / 0.5) : ease(k));
  const a = o.moon ? Math.min(1, o.t / 0.4) * (0.75 + 0.25 * Math.sin(o.t * 9)) * (k > 0.93 ? (1 - k) / 0.07 : 1) : (1 - k) * 0.95;
  g.save(); g.translate(o.x, o.y); g.scale(1, 0.62);
  if(o.moon){ const gr = g.createRadialGradient(0, 0, r * 0.1, 0, 0, r); gr.addColorStop(0, 'rgba(8,0,3,0.8)'); gr.addColorStop(0.7, 'rgba(120,6,22,0.45)'); gr.addColorStop(1, 'rgba(255,36,56,0)');
    g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); }
  g.rotate(o.t * (o.spin || 0.7)); g.globalCompositeOperation = 'lighter'; g.lineJoin = 'miter';
  g.globalAlpha = a; g.strokeStyle = RED; g.lineWidth = 2.6 * (1 - k * 0.4); pentagram(g, r * 0.92);
  g.strokeStyle = BLD; g.lineWidth = 3.2; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  g.globalAlpha = a * 0.8; g.strokeStyle = EMB; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, r * 0.82, 0, TAU); g.stroke();
  g.globalAlpha = a; g.fillStyle = PALE;
  for(let i = 0; i < 10; i++){ const t = i / 10 * TAU; g.save(); g.translate(Math.cos(t) * r * 1.07, Math.sin(t) * r * 1.07); g.rotate(t); g.fillRect(-1.5, -5, 3, 10); g.restore(); }
  g.restore();
}
function gaDrawGround(){
  if(!GA.list.length) return;
  const g = ctx; g.save();
  for(const o of GA.list){
    if(o.t < 0 || o.k !== 'sigil') continue;
    if(!visible(o.x, o.y, (o.r1 || 120) + 100)) continue;
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; drawSigil(g, o);
  }
  g.restore();
}
function gaDrawTop(){
  if(!GA.list.length) return;
  const g = ctx; g.save();
  for(const o of GA.list){
    if(o.t < 0 || o.k === 'sigil') continue;
    if(!visible(o.x, o.y, (o.h || 160) + 100)) continue;
    const k = clampN(o.t / o.life, 0, 1);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    switch(o.k){
      case 'ember': { const a = Math.min(1, (1 - k) * 2.2); g.globalCompositeOperation = 'lighter'; g.fillStyle = o.col;
        g.globalAlpha = a * 0.3; g.beginPath(); g.arc(o.x, o.y - o.z, o.size * 2.2, 0, TAU); g.fill();
        g.globalAlpha = a; g.beginPath(); g.arc(o.x, o.y - o.z, o.size * (1 - k * 0.5), 0, TAU); g.fill(); break; }
      case 'shard': { const a = Math.min(1, (1 - k) * 2.5), s = o.size; g.save(); g.translate(o.x, o.y - o.z); g.rotate(o.rot);
        g.globalAlpha = a; g.fillStyle = o.col; g.beginPath(); g.moveTo(0, -s * 1.5); g.lineTo(s * 0.7, s * 0.6); g.lineTo(-s * 0.7, s * 0.6); g.closePath(); g.fill();
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.7; g.strokeStyle = RED; g.lineWidth = 1.2; g.stroke(); g.restore(); break; }
      case 'pillar': { const a = Math.sin(k * Math.PI), w = o.w * (0.6 + 0.4 * a), gr = g.createLinearGradient(0, o.y, 0, o.y - o.h);
        gr.addColorStop(0, 'rgba(255,36,56,0.9)'); gr.addColorStop(0.5, 'rgba(160,8,28,0.5)'); gr.addColorStop(1, 'rgba(18,4,10,0)');
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = gr; g.fillRect(o.x - w / 2, o.y - o.h, w, o.h);
        g.fillStyle = PALE; g.globalAlpha = a * 0.6; g.fillRect(o.x - w * 0.12, o.y - o.h * 0.9, w * 0.24, o.h * 0.9); break; }
      case 'flame': { const a = Math.sin(Math.min(1, k * 1.15) * Math.PI) , h = o.h * (0.4 + 0.8 * Math.sin(k * Math.PI)), w = o.w, sw = Math.sin(o.t * 12 + o.x) * 3;
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.85; g.fillStyle = o.col;
        g.beginPath(); g.moveTo(o.x - w, o.y); g.quadraticCurveTo(o.x - w * 0.3, o.y - h * 0.6, o.x + sw, o.y - h); g.quadraticCurveTo(o.x + w * 0.3, o.y - h * 0.6, o.x + w, o.y); g.closePath(); g.fill();
        g.globalCompositeOperation = 'source-over'; g.globalAlpha = a * 0.7; g.fillStyle = DRK;
        g.beginPath(); g.moveTo(o.x - w * 0.45, o.y); g.quadraticCurveTo(o.x - w * 0.1, o.y - h * 0.5, o.x + sw * 0.7, o.y - h * 0.62); g.quadraticCurveTo(o.x + w * 0.1, o.y - h * 0.5, o.x + w * 0.45, o.y); g.closePath(); g.fill(); break; }
    }
  }
  g.restore();
}

/* ---------- подключение к циклу и отрисовке ---------- */
try { const _t = fx973Tick; fx973Tick = function(dt){ _t.apply(this, arguments); try { gaTick(dt); } catch(err) { warn('tick', err); } }; } catch(err) { warn('hookTick', err); }
try { const _dw = drawWards; drawWards = function(){ _dw.apply(this, arguments); try { gaDrawGround(); } catch(err) { warn('ground', err); } }; } catch(err) { warn('hookGround', err); }
try { const F = G.__fx973; if(F){ const _d0 = F.drawWorld; F.drawWorld = function(){ _d0.apply(this, arguments); try { gaDrawTop(); } catch(err) { warn('top', err); } }; } } catch(err) { warn('hookTop', err); }

/* ---------- заклинания ---------- */
function runArc(impl, orig, self, list){
  const prev = G.__gaOn; G.__gaOn = true; let called = false;
  const o = function(){ called = true; return orig.apply(self, arguments.length ? arguments : list); };
  try { if(impl) impl.apply(null, list.concat([o])); else o(); }
  catch(err) { warn('spell', err); if(!called){ try { orig.apply(self, list); } catch(e) {} } }
  finally { G.__gaOn = prev; }
}
function arcSpell(key, impl){
  const sp = INVOKE_SPELLS[key]; if(!sp || typeof sp.cast !== 'function') return;
  const orig = sp.cast;
  sp.cast = function(h, x, y, lvl){
    if(!isGA(h)) return orig.apply(this, arguments);
    return runArc(impl, orig, this, [h, x, y, lvl]);
  };
}
const nearest = (h, x, y, maxD, filt) => { let t = null, bd = maxD; for(const u of units){ if(!filt(u)) continue; const d = Math.hypot(u.x - x, u.y - y); if(d < bd){ bd = d; t = u; } } return t; };
const slowUnit = (u, k, t) => { u.slow = Math.max(u.slow || 0, k); u.slowT = Math.max(u.slowT || 0, t); };

arcSpell('300', (h, x, y, lvl, o) => {                 /* Кровавый поцелуй */
  const tgt = nearest(h, x, y, 250, u => u.team !== h.team && !u.dead);
  o(h, x, y, lvl);
  if(!tgt) return;
  const heal = (200 + 70 * lvl) * 0.25; h.hp = Math.min(h.maxHp, h.hp + heal);
  fxBeam(tgt.x, tgt.y, h.x, h.y, BLD, 0.55); fxBeam(tgt.x, tgt.y - 20, h.x, h.y - 20, RED, 0.35);
  GA.pillar(tgt.x, tgt.y + 4, 26, 220, 0.6); GA.sigil(tgt.x, tgt.y + 4, 20, 120, 0.7); GA.shards(tgt.x, tgt.y - 20, 12); GA.embers(h.x, h.y - 10, 10, {spread:14});
  addText(h.x, h.y - 70, '🩸 +' + Math.round(heal), '#ff6a7a', 1.1, 16); gsnd('gaBloodBig', tgt.x, tgt.y, 0.9);
});
arcSpell('030', (h, x, y, lvl, o) => {                 /* Кровавая луна */
  const r = 300 + 30 * lvl;
  o(h, x, y, lvl);
  GA.add({k:'sigil', x, y, r0:r * 0.25, r1:r, life:3.05, moon:true, spin:0.35});
  GA.sigil(x, y, r * 0.3, r * 1.2, 0.8, {delay:3, spin:-1}); GA.pillar(x, y + 4, 60, 420, 0.8, {delay:3});
  for(let i = 0; i < 3; i++) GA.later(i * 1.0 + 0.1, () => { GA.embers(x, y, 12, {spread:r * 0.7, v0:80, v1:200}); });
  GA.later(3.0, () => {
    GA.shards(x, y, 22, {s0:100, s1:380}); gsnd('gaBloodBig', x, y, 1.1);
    for(const u of units) if(isFoe(h, u) && Math.hypot(u.x - x, u.y - y) < r + u.radius) slowUnit(u, 0.35, 2);
  });
});
arcSpell('003', (h, x, y, lvl, o) => {                 /* Чёрное солнце */
  const r = 180, dmg = (500 + 320 * lvl) * 2;
  o(h, x, y, lvl);
  spawnAoE(x, y, r * 0.85, dmg * 0.2, h, 1.7, BLD); fxMark(x, y, r * 0.85, BLD, 1.7);
  GA.add({k:'sigil', x, y, r0:r * 0.4, r1:r * 1.1, life:1.8, moon:true, spin:-0.6});
  GA.pillar(x, y + 4, 70, 520, 0.7, {delay:0.9}); GA.sigil(x, y, r * 0.5, r * 1.8, 0.7, {delay:0.9}); GA.sigil(x, y, r * 0.4, r * 1.5, 0.6, {delay:1.7, spin:1});
  GA.later(0.9, () => { GA.shards(x, y, 20, {s0:90, s1:320}); GA.embers(x, y, 18, {spread:r * 0.6}); gsnd('gaBloodBig', x, y, 1.0); });
  GA.later(1.7, () => { GA.shards(x, y, 12); gsnd('gaBlood', x, y, 0.8); });
});
arcSpell('201', (h, x, y, lvl, o) => {                 /* Теневой шаг */
  const px = h.x, py = h.y;
  o(h, x, y, lvl);
  spawnAoE(px, py, 140, 100 + 40 * lvl, h, 0.5, BLD); fxMark(px, py, 140, BLD, 0.5);
  spawnAoE(h.x, h.y, 110, 60 + 30 * lvl, h, 0.2, RED);
  GA.sigil(px, py + 4, 20, 150, 0.9); GA.flames(px, py, 8, 40); GA.sigil(h.x, h.y + 4, 20, 110, 0.7, {spin:-1});
  const n = 10; for(let i = 0; i <= n; i++){ const f = i / n; GA.embers(px + (h.x - px) * f, py + (h.y - py) * f, 2, {spread:10, v0:40, v1:120}); }
  fxBeam(px, py, h.x, h.y, DRK, 0.5); gsnd('gaBlood', px, py, 0.9);
});
arcSpell('120', (h, x, y, lvl) => {                    /* Багровый вихрь */
  const d = Math.max(60, Math.hypot(x - h.x, y - h.y)), a = Math.atan2(y - h.y, x - h.x), dmg = 200 + 110 * lvl;
  spawnRollingSpell(h.x, h.y, x, y, dmg, h, RED, 30, 'tornado');
  for(const s of [-1, 1]){ const b = a + s * 0.42; spawnRollingSpell(h.x, h.y, h.x + Math.cos(b) * d, h.y + Math.sin(b) * d, dmg * 0.5, h, BLD, 24, 'tornado'); }
  fxArcaneBurst(h.x, h.y, 110, RED, 0.6); GA.sigil(h.x, h.y + 6, 16, 110, 0.6); GA.flames(h.x, h.y, 6, 30); gsnd('gaBlood', h.x, h.y, 0.9);
});
arcSpell('021', (h, x, y, lvl, o) => {                 /* Кровавая ярость */
  o(h, x, y, lvl);
  h.buffs = h.buffs.filter(b => b.id !== 'gaFury'); h.addBuff({type:'as', id:'gaFury', val:0.5, t:6});
  GA.sigil(h.x, h.y + 6, 24, 150, 0.8); GA.flames(h.x, h.y, 12, 44, {h0:60, h1:110}); GA.embers(h.x, h.y - 10, 22, {spread:20, v0:80, v1:260});
  GA.pillar(h.x, h.y + 4, 36, 260, 0.7); addText(h.x, h.y - 82, 'АТАКА +50%', '#ff6a7a', 1.1, 16); gsnd('gaBloodBig', h.x, h.y, 0.9);
});
arcSpell('102', (h, x, y, lvl, o) => {                 /* Метеор Бездны */
  const a = Math.atan2(y - h.y, x - h.x), nx = -Math.sin(a), ny = Math.cos(a);
  o(h, x, y, lvl);
  for(const s of [-1, 1]){ const tx = x + nx * 150 * s, ty = y + ny * 150 * s; spawnRollingSpell(h.x, h.y, tx, ty, (900 + 420 * lvl) * 0.3, h, RED, 22, 'meteor'); fxMark(tx, ty, 90, BLD, 0.8); GA.sigil(tx, ty, 14, 90, 1.0, {spin:-0.9}); }
  GA.sigil(x, y, 20, 150, 1.1); GA.pillar(x, y + 4, 50, 480, 0.9, {delay:0.6}); GA.later(0.85, () => { GA.shards(x, y, 18, {s0:100, s1:340}); gsnd('gaBloodBig', x, y, 1.0); });
});
arcSpell('012', (h, x, y, lvl, o) => {                 /* Клеймо палача */
  const tgt = nearest(h, h.x, h.y, 800, u => u.team !== h.team && !u.dead && u.team !== 2 && !(typeof isStructure === 'function' && isStructure(u)));
  o(h, x, y, lvl);
  if(tgt && !tgt.dead){ slowUnit(tgt, 0.4, 3); GA.sigil(tgt.x, tgt.y + 4, 14, 80, 3, {spin:1.2, minor:true}); GA.pillar(tgt.x, tgt.y + 4, 22, 180, 0.5); GA.shards(tgt.x, tgt.y - 20, 8); addText(tgt.x, tgt.y - 60, 'КЛЕЙМО', '#ff6a7a', 1.2, 16); }
  GA.sigil(h.x, h.y + 6, 20, 120, 0.7); GA.flames(h.x, h.y, 8, 34);
});
arcSpell('111', (h, x, y, lvl, o) => {                 /* Кровавый обряд */
  const r = 320;
  for(const u of units){ if(!isFoe(h, u)) continue; const d = Math.hypot(u.x - x, u.y - y); if(d >= r || d < 8) continue;
    const mv = Math.min(90, d * 0.5); u.x = clampN(u.x + (x - u.x) / d * mv, 40, WORLD - 40); u.y = clampN(u.y + (y - u.y) / d * mv, 40, WORLD - 40); u.moveTarget = null; GA.embers(u.x, u.y, 4, {spread:6}); }
  o(h, x, y, lvl);
  GA.add({k:'sigil', x, y, r0:r * 0.2, r1:r, life:1.3, moon:true, spin:0.9}); GA.sigil(x, y, r * 0.3, r * 1.15, 0.7, {delay:0.4, spin:-1.2});
  GA.pillar(x, y + 4, 80, 460, 0.8, {delay:0.35}); GA.shards(x, y, 22, {s0:90, s1:340}); GA.later(0.4, () => { GA.embers(x, y, 20, {spread:r * 0.6}); gsnd('gaBloodBig', x, y, 1.1); });
});
/* Ледяная стена — только красные эффекты */
arcSpell('210', null);

/* ---------- орбы Q/W/E и «Усиление стихий» ---------- */
function orbFx(h, type){
  const c = type === 'Q' ? BLD : (type === 'W' ? ROSE : EMB);
  GA.sigil(h.x, h.y + 8, 14, 78, 0.55, {spin:type === 'W' ? -1.4 : 0.9});
  if(type === 'Q') GA.embers(h.x, h.y - 14, 10, {spread:14, v0:40, v1:140});
  else if(type === 'W'){ for(let i = 0; i < 3; i++){ const a = Math.random() * TAU; fxBeam(h.x, h.y - 20, h.x + Math.cos(a) * 80, h.y - 20 + Math.sin(a) * 50, c, 0.2); } GA.shards(h.x, h.y - 20, 5, {s0:60, s1:200}); }
  else GA.flames(h.x, h.y, 5, 26, {h0:30, h1:60});
  gsnd('gaBlood', h.x, h.y, 0.45);
}
for(const [id, type] of [['quas', 'Q'], ['wex', 'W'], ['exort', 'E']]){
  const sk = SKILLS[id]; if(!sk || typeof sk.cast !== 'function') continue;
  const orig = sk.cast;
  sk.cast = function(h){
    if(!isGA(h)) return orig.apply(this, arguments);
    const prev = G.__gaOn; G.__gaOn = true; let res;
    try { res = orig.apply(this, arguments); } finally { G.__gaOn = prev; }
    try { orbFx(h, type); } catch(err) { warn('orb', err); }
    return res;
  };
}
if(SKILLS.grisha && typeof SKILLS.grisha.cast === 'function'){
  const orig = SKILLS.grisha.cast;
  SKILLS.grisha.cast = function(h){
    const res = orig.apply(this, arguments);
    try { if(isGA(h)){ GA.sigil(h.x, h.y + 8, 24, 140, 0.8); GA.pillar(h.x, h.y + 4, 32, 240, 0.7); GA.embers(h.x, h.y - 10, 16, {spread:18}); GA.flames(h.x, h.y, 8, 36); gsnd('gaBloodBig', h.x, h.y, 0.8); } } catch(err) { warn('shard', err); }
    return res;
  };
}
{ const _sfc = skillFxColor;
  G.skillFxColor = skillFxColor = function(hero, skillId){ if(isGA(hero) && /quas|wex|exort|invoke|grisha/.test(skillId)) return RED; return _sfc.apply(this, arguments); }; }

/* ---------- атака: кровавый заряд ---------- */
{ const _sp = spawnProjectile;
  G.spawnProjectile = spawnProjectile = function(x, y, target, dmg, source){
    const p = _sp.apply(this, arguments);
    try {
      const o = projectileOwner(p);
      if(p && !p.isSpell && isGA(o)){ p.gaArc = true; p.color = RED; p.radius = Math.max(p.radius || 6, 9); GA.embers(x, y, 5, {spread:6, v0:40, v1:120}); }
    } catch(err) { warn('proj', err); }
    return p;
  }; }
function drawBolt(p){
  const r = Math.max(7, p.radius || 9), a = typeof projectileHeading === 'function' ? projectileHeading(p) : 0, tm = gameTime * 12;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  ctx.globalAlpha = 0.22; ctx.fillStyle = BLD; ctx.beginPath(); ctx.arc(0, 0, r * 2.8, 0, TAU); ctx.fill();
  for(let k = -1; k <= 1; k++){ ctx.globalAlpha = k ? 0.5 : 0.75; ctx.strokeStyle = k ? BLD : RED; ctx.lineWidth = Math.max(2, r * (k ? 0.3 : 0.42));
    ctx.beginPath(); ctx.moveTo(-r * 0.6, k * r * 0.2); ctx.quadraticCurveTo(-r * 2.4, k * r * 1.0 + Math.sin(tm + k * 2) * r * 0.5, -r * 4.8, k * r * 1.8 + Math.sin(tm * 0.8 + k) * r * 0.7); ctx.stroke(); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#0a0206'; ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, TAU); ctx.fill();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.9; ctx.strokeStyle = RED; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.95, 0, TAU); ctx.stroke();
  for(let i = 0; i < 3; i++){ const q = tm * 1.4 + i * 2.094; ctx.globalAlpha = 0.9; ctx.fillStyle = i === 1 ? EMB : PALE; ctx.beginPath(); ctx.arc(Math.cos(q) * r * 1.5, Math.sin(q) * r * 1.5, 1.8, 0, TAU); ctx.fill(); }
  ctx.restore();
}
{ const _dtp = drawThemedProjectile;
  G.drawThemedProjectile = drawThemedProjectile = function(p){
    if(p && p.gaArc && !p.kind){ try { drawBolt(p); return true; } catch(err) { warn('bolt', err); } }
    return _dtp.apply(this, arguments);
  }; }
{ const _dat = drawAttackTrail;
  G.drawAttackTrail = drawAttackTrail = function(p){
    if(!(p && p.gaArc)) return _dat.apply(this, arguments);
    try {
      if(fxLv() >= 3) return;
      const h = p.hist || (p.hist = []), last = h[h.length - 1];
      if(!last || Math.hypot(p.x - last[0], p.y - last[1]) > 5){ h.push([p.x, p.y]); const mx = (typeof ATK_TRAIL !== 'undefined' && ATK_TRAIL[fxLv()]) || 8; while(h.length > mx) h.shift(); }
      if(h.length < 2) return;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const n = h.length, rad = Math.max(4, p.radius || 9);
      for(let i = 1; i <= n; i++){ const f = i / n, x1 = i < n ? h[i][0] : p.x, y1 = i < n ? h[i][1] : p.y, w = Math.sin(gameTime * 13 + i * 1.7) * rad * 0.16 * (1 - f);
        ctx.globalAlpha = f * 0.6; ctx.strokeStyle = f > 0.6 ? RED : BLD; ctx.lineWidth = Math.max(1.5, rad * 1.1 * f); ctx.beginPath(); ctx.moveTo(h[i - 1][0], h[i - 1][1] + w); ctx.lineTo(x1, y1 + w); ctx.stroke();
        if(fxLv() < 2 && i % 3 === 0){ ctx.globalAlpha = f * 0.8; ctx.fillStyle = i % 2 ? EMB : PALE; ctx.beginPath(); ctx.arc(h[i - 1][0] + Math.sin(gameTime * 9 + i) * rad * 0.9, h[i - 1][1] + Math.cos(gameTime * 8 + i) * rad * 0.9, 1.2 + f * 1.3, 0, TAU); ctx.fill(); } }
      ctx.restore();
    } catch(err) { warn('trail', err); }
  }; }

/* ---------- аура у ног (вызывается из game.js вместе с аурами других арканов) ---------- */
G.drawGrishaArcanaAura = function(u){
  try {
    if(!isGA(u) || u.dead) return;
    const base = u.radius + 8, tm = (typeof gameTime === 'number' ? gameTime : 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'miter'; ctx.translate(0, 8); ctx.scale(1, 0.62);
    ctx.save(); ctx.rotate(tm * 0.6);                           /* перевёрнутая пентаграмма */
    ctx.strokeStyle = RED; ctx.shadowColor = BLD; ctx.shadowBlur = 14; ctx.globalAlpha = 0.8; ctx.lineWidth = 2.2; pentagram(ctx, base + 16);
    ctx.restore();
    ctx.shadowBlur = 10; ctx.strokeStyle = BLD; ctx.lineWidth = 2.6; ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.arc(0, 0, base + 16, 0, TAU); ctx.stroke();
    ctx.strokeStyle = EMB; ctx.lineWidth = 1.4; ctx.globalAlpha = 0.55; ctx.setLineDash([6, 8]); ctx.lineDashOffset = -tm * 18; ctx.beginPath(); ctx.arc(0, 0, base + 26, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.shadowBlur = 8;
    for(let i = 0; i < 9; i++){                                 /* языки тёмного пламени */
      const a = i / 9 * TAU + tm * 0.5, fl = 0.5 + 0.5 * Math.sin(tm * 8 + i * 2.1), hgt = (20 + fl * 18) / 0.62, w = 5.5, bx = Math.cos(a) * (base + 10), by = Math.sin(a) * (base + 10);
      ctx.globalAlpha = 0.65; ctx.fillStyle = i % 3 === 0 ? EMB : RED;
      ctx.beginPath(); ctx.moveTo(bx - w, by); ctx.quadraticCurveTo(bx - w * 0.3, by - hgt * 0.6, bx + Math.sin(tm * 6 + i) * 3, by - hgt); ctx.quadraticCurveTo(bx + w * 0.3, by - hgt * 0.6, bx + w, by); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.6; ctx.fillStyle = DRK;
      ctx.beginPath(); ctx.moveTo(bx - w * 0.4, by); ctx.quadraticCurveTo(bx, by - hgt * 0.45, bx + Math.sin(tm * 6 + i) * 2, by - hgt * 0.6); ctx.quadraticCurveTo(bx, by - hgt * 0.4, bx + w * 0.4, by); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'lighter';
    }
    for(let i = 0; i < 6; i++){                                 /* орбитальные угли */
      const a = -i / 6 * TAU - tm * 1.3, fl = 0.5 + 0.5 * Math.sin(tm * 7 + i * 1.7), px = Math.cos(a) * (base + 32), py = Math.sin(a) * (base + 32), s = 2.6 + fl * 2.2;
      ctx.globalAlpha = 0.5 + fl * 0.5; ctx.fillStyle = i % 2 ? PALE : RED; ctx.beginPath(); ctx.arc(px, py, s, 0, TAU); ctx.fill();
    }
    ctx.restore();
  } catch(err) { warn('aura', err); }
};
})();
