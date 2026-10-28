/* DotaSense 0.9.7.4 — «ПСИХ»: новый герой, 3 особых предмета. Подключается поверх game.js. (0.9.7.5: клоны ульты неуправляемы и ищут героев сами) */
(function(){
'use strict';
const G = window, TAU = Math.PI * 2;
const lvlOf = (h, id) => { const s = h && h.skills && h.skills.find(k => k.id === id); return s ? (s.level || 0) : 0; };
const isPsih = h => !!(h && h.def && h.def.id === 'psih');
const foesOf = h => units.filter(u => !u.dead && u.team !== h.team && u.team !== 2 && !isBuilding(u) && !isStructure(u) && !u.invulnerable);

/* ---------- звуки ---------- */
Object.assign(SFX_PRESETS, {
  psihStab: {from:1100, to:50, duration:0.4, type:'sawtooth', volume:0.2, noise:1.0, layers:[[70,26,0,0.6,'sine',0.25],[2000,260,0,0.14,'square',0.09],[240,55,0.03,0.35,'sawtooth',0.12]]},
  psihHide: {from:700, to:120, duration:0.3, type:'sine', volume:0.04, layers:[[300,60,0,0.4,'triangle',0.04]]},
  psihLaugh: {from:500, to:900, duration:0.5, type:'square', volume:0.035, layers:[[620,320,0.1,0.4,'sawtooth',0.03],[800,400,0.25,0.4,'square',0.025]]},
  psihGrave: {from:90, to:40, duration:0.7, type:'sawtooth', volume:0.07, noise:0.9, layers:[[55,30,0,0.8,'sine',0.18],[1800,300,0.02,0.12,'square',0.04],[400,90,0.1,0.35,'triangle',0.05]]},
  psihBurst: {from:220, to:40, duration:0.5, type:'sawtooth', volume:0.09, noise:1.0, layers:[[1200,200,0,0.2,'square',0.05],[60,28,0,0.7,'sine',0.18]]},
  psihUlt: {from:60, to:30, duration:1.4, type:'sawtooth', volume:0.1, noise:0.6, layers:[[30,18,0,1.4,'sine',0.22],[300,900,0.1,1.0,'triangle',0.05],[900,150,0.8,0.5,'square',0.04]]},
  psihRise: {from:120, to:520, duration:0.9, type:'triangle', volume:0.05, noise:0.25, layers:[[240,1040,0,0.9,'sine',0.04],[90,45,0.1,0.7,'sawtooth',0.05]]},
  psihVanish: {from:600, to:90, duration:0.45, type:'sine', volume:0.05, noise:0.5, layers:[[1000,200,0,0.4,'triangle',0.04]]},
  psihSlash: {from:2400, to:600, duration:0.18, type:'sawtooth', volume:0.06, noise:1.0, layers:[[3200,900,0.05,0.12,'square',0.035]]},
  chrono: {from:900, to:90, duration:0.6, type:'sine', volume:0.07, noise:0.3, layers:[[1500,200,0,0.5,'triangle',0.05]]},
  reap: {from:400, to:70, duration:0.4, type:'sawtooth', volume:0.08, noise:0.8, layers:[[90,40,0,0.5,'sine',0.1]]},
  phoenix: {from:300, to:1400, duration:0.5, type:'triangle', volume:0.07, noise:0.5, layers:[[600,2000,0.1,0.5,'sine',0.05]]}
});
const snd = (k, v) => { try { playSynthSfx(k, {volume: v == null ? 1 : v}); } catch(e) {} };
const shakeScreen = (m, d) => { const F = G.__fx973; if(F){ F.shakeMag = Math.max(F.shakeMag, m); F.shakeT = F.shakeDur = d; } };

/* ---------- 3 особых предмета ---------- */
const NEW_ITEMS = {
  chronoHourglass: {name:'Часы Хроноса', icon:'⌛', cost:3300, color:'#8fe3ff', active:true, manaCost:120, cooldown:55, radius:450, stun:2.5, damage:250,
    desc:'Активный: останавливает время в радиусе 450 — все враги оглушены на 2,5 сек. и получают 250 магического урона, а герой получает +20% скорости на 5 сек. КД 55 сек.'},
  reaperScythe: {name:'Коса Жнеца', icon:'☽', cost:3800, color:'#b04cff', active:true, manaCost:100, cooldown:32, radius:500, pct:0.14, minDmg:200, heal:0.6, bonusDamage:160,
    desc:'Пассивно: +160 к урону атак. Активный «Жатва»: враги в радиусе 500 теряют 14% максимального здоровья (минимум 200 магического урона), а герой лечится на 60% нанесённого урона. КД 32 сек.'},
  phoenixFeather: {name:'Перо Феникса', icon:'✺', cost:3000, color:'#ff8a3d', active:true, manaCost:80, cooldown:75, hp:350, radius:350, damage:400, invulnTime:3, healPct:0.3,
    desc:'Пассивно: +350 к максимальному здоровью. Активный: на 3 сек. неуязвимость, лечение 30% максимального здоровья и огненная волна на 400 урона вокруг. КД 75 сек.'}
};
for(const id in NEW_ITEMS){
  SHOP_ITEMS[id] = NEW_ITEMS[id];
  if(!SHOP_ITEM_IDS.includes(id)) SHOP_ITEM_IDS.push(id);
  SHOP_CATEGORY_OF[id] = 4;
  SHOP_ITEM_VIEWS.push({...NEW_ITEMS[id], id});
  NULLIFY_BLOCKED_ITEMS.add(id);
}
shopViewById = null;

const ITEM_USE = {
  chronoHourglass(h, item){
    const c = SHOP_ITEMS.chronoHourglass; let n = 0;
    for(const u of foesOf(h)){
      if(Math.hypot(u.x - h.x, u.y - h.y) > c.radius) continue;
      u.stunTimer = Math.max(u.stunTimer || 0, c.stun);
      applyDamage(u, c.damage, {team:h.team, source:h, magic:true}); n++;
    }
    h.addBuff({type:'spd', id:'chronoSpd', val:0.2, t:5});
    item.cooldown = c.cooldown;
    fxRing(h.x, h.y, c.radius, '#8fe3ff', 0.8); fxRing(h.x, h.y, c.radius * 0.5, '#ffffff', 0.5);
    spawnParticles(h.x, h.y, '#8fe3ff', 40, 1.2);
    addText(h.x, h.y - 70, 'ВРЕМЯ ОСТАНОВЛЕНО' + (n ? ' ×' + n : ''), '#8fe3ff', 1.2, 17);
    snd('chrono'); return true;
  },
  reaperScythe(h, item){
    const c = SHOP_ITEMS.reaperScythe; let total = 0;
    for(const u of foesOf(h)){
      if(Math.hypot(u.x - h.x, u.y - h.y) > c.radius) continue;
      const d = Math.max(c.minDmg, u.maxHp * c.pct);
      applyDamage(u, d, {team:h.team, source:h, magic:true}); total += d;
    }
    if(total > 0) h.hp = Math.min(h.maxHp, h.hp + Math.min(1500, total * c.heal) * healAmpOf(h));
    item.cooldown = c.cooldown;
    fxRing(h.x, h.y, c.radius, '#b04cff', 0.7); spawnParticles(h.x, h.y, '#d9a0ff', 36, 1.1);
    addText(h.x, h.y - 70, 'ЖАТВА' + (total ? ': +' + Math.round(Math.min(1500, total * c.heal)) + ' HP' : ''), '#d9a0ff', 1.2, 17);
    snd('reap'); shakeScreen(5, 0.3); return true;
  },
  phoenixFeather(h, item){
    const c = SHOP_ITEMS.phoenixFeather;
    h.invulnerable = true; h._phxT = c.invulnTime;
    h.hp = Math.min(h.maxHp, h.hp + h.maxHp * c.healPct * healAmpOf(h));
    for(const u of foesOf(h)) if(Math.hypot(u.x - h.x, u.y - h.y) <= c.radius) applyDamage(u, c.damage, {team:h.team, source:h, magic:true});
    item.cooldown = c.cooldown;
    fxRing(h.x, h.y, c.radius, '#ff8a3d', 0.8); fxRing(h.x, h.y, c.radius * 0.6, '#ffd36a', 0.6);
    spawnParticles(h.x, h.y, '#ff8a3d', 46, 1.3);
    addText(h.x, h.y - 70, 'ВОЗРОЖДЕНИЕ В ОГНЕ', '#ffb35c', 1.3, 17);
    snd('phoenix'); return true;
  }
};
const _pia = performInventoryItemActivation;
performInventoryItemActivation = function(hero, index){
  const item = hero.inventory[index];
  if(item && ITEM_USE[item.id]){
    if(hero.nullifyTimer > 0){ flashMsg(hero, 'Нуллификатор: предмет заблокирован'); return false; }
    if(item.cooldown > 0){ flashMsg(hero, item.name + ' на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    return ITEM_USE[item.id](hero, item);
  }
  return _pia.apply(this, arguments);
};
const _ais = applyItemStats;
applyItemStats = function(hero, id){
  if(id === 'phoenixFeather'){ hero.maxHp += SHOP_ITEMS.phoenixFeather.hp; hero.hp += SHOP_ITEMS.phoenixFeather.hp; return; }
  return _ais.apply(this, arguments);
};
const _gd = Unit.prototype.getDamage;
Unit.prototype.getDamage = function(){
  let d = _gd.apply(this, arguments);
  if(this.inventory && this.inventory.some(i => i && i.id === 'reaperScythe')) d += SHOP_ITEMS.reaperScythe.bonusDamage;
  return d;
};

/* иконки предметов */
const _dii = drawItemIcon;
drawItemIcon = function(item, x, y, s){
  if(!item || !NEW_ITEMS[item.id]) return _dii.apply(this, arguments);
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.shadowColor = item.color; ctx.shadowBlur = 12;
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  if(item.id === 'chronoHourglass'){
    ctx.strokeStyle = '#e8fbff'; ctx.fillStyle = 'rgba(143,227,255,.55)';
    ctx.beginPath(); ctx.moveTo(-s*.28,-s*.42); ctx.lineTo(s*.28,-s*.42); ctx.lineTo(s*.04,0); ctx.lineTo(s*.28,s*.42); ctx.lineTo(-s*.28,s*.42); ctx.lineTo(-s*.04,0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-s*.16,s*.4); ctx.lineTo(s*.16,s*.4); ctx.lineTo(0,s*.15); ctx.fill();
  } else if(item.id === 'reaperScythe'){
    ctx.strokeStyle = '#5b3d27'; ctx.beginPath(); ctx.moveTo(-s*.25,s*.45); ctx.lineTo(s*.2,-s*.4); ctx.stroke();
    ctx.strokeStyle = '#e6d4ff'; ctx.fillStyle = '#b04cff'; ctx.beginPath(); ctx.moveTo(s*.2,-s*.4); ctx.quadraticCurveTo(-s*.35,-s*.55,-s*.38,-s*.05); ctx.quadraticCurveTo(-s*.2,-s*.3,s*.2,-s*.32); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    const g = ctx.createLinearGradient(0,-s*.45,0,s*.45); g.addColorStop(0,'#fff1a8'); g.addColorStop(.5,'#ff8a3d'); g.addColorStop(1,'#c2301a');
    ctx.fillStyle = g; ctx.strokeStyle = '#ffe2a0';
    ctx.beginPath(); ctx.moveTo(s*.05,-s*.46); ctx.quadraticCurveTo(s*.38,-s*.1,s*.02,s*.38); ctx.quadraticCurveTo(-s*.05,s*.1,-s*.3,-s*.02); ctx.quadraticCurveTo(-s*.12,-s*.3,s*.05,-s*.46); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,s*.35); ctx.lineTo(-s*.1,s*.47); ctx.stroke();
  }
  ctx.restore();
};

/* ======================================================================
   ЭФФЕКТЫ ПСИХА (0.9.7.5b)
   Могилы, из которых вылезают копии из ульты, дымы, призрачные следы,
   порезы, «безумная» аура. Всё учитывает настройку эффектов (fxl / perfLite).
   ====================================================================== */
const PF = {list: [], clones: [], gt: 0};
const PF_RISE0 = 0.55;     /* через сколько секунд после раскрытия могилы копия начинает вылезать */
const PF_DUR = 1.35;       /* полное время «вылезания» (от начала могилы до конца подъёма) */
const fxLv = () => (typeof fxl === 'function' ? fxl() : 0);        /* 0 — всё, 1 — без украшений, 2 — минимум, 3 — выкл */
const isLite = () => (typeof perfLite === 'function' && perfLite());
const rr = (a, b) => a + Math.random() * (b - a);
const ease3 = k => 1 - Math.pow(1 - Math.max(0, Math.min(1, k)), 3);
const al = v => Math.max(0, Math.min(1, v)).toFixed(3);            /* безопасная прозрачность для rgba() */
const detail = () => isLite() ? 0.3 : (fxLv() >= 2 ? 0.45 : (fxLv() >= 1 ? 0.75 : 1));
const nOf = n => Math.max(1, Math.round(n * detail()));
const pfCap = () => isLite() ? 60 : (fxLv() >= 2 ? 100 : 320);
const flipOf = u => (Math.cos(u && u.facing != null ? u.facing : 0) >= 0 ? 1 : -1);
const myTeam = () => (typeof playerHero !== 'undefined' && playerHero) ? playerHero.team : 0;

function pfAdd(o){
  if(fxLv() >= 3) return null;
  if(PF.list.length >= pfCap()){
    let i = PF.list.findIndex(e => e.minor);
    if(i < 0){ if(o.minor) return null; i = 0; }
    PF.list.splice(i, 1);
  }
  o.t = -(o.delay || 0);
  PF.list.push(o);
  return o;
}
/* звук с затуханием по расстоянию до игрока */
function psnd(k, x, y, base){
  const p = (typeof playerHero !== 'undefined' && playerHero && !playerHero.dead) ? playerHero : cam;
  const v = 1 - Math.hypot(x - p.x, y - p.y) / 1750;
  if(v <= 0.06) return;
  snd(k, Math.pow(v, 1.15) * (base == null ? 1 : base));
}
const flashScreen = (c, a, d) => { const F = G.__fx973; if(F && fxLv() < 2){ F.flash = c; F.flashA = a; F.flashT = F.flashDur = d; } };
const pfShake = (m, d) => { if(fxLv() < 2) shakeScreen(m, d); };

/* ---------- генераторы мелких эффектов ---------- */
function pfBits(x, y, n, o){       /* комья земли / осколки */
  o = o || {}; n = nOf(n);
  for(let i = 0; i < n; i++){
    const a = Math.random() * TAU, sp = rr(o.s0 || 40, o.s1 || 150), sd = o.spread || 6;
    pfAdd({k:'bit', minor:true, x:x + Math.cos(a) * sd, y:y + Math.sin(a) * sd * 0.6, z:o.z0 == null ? 4 : o.z0,
      vx:Math.cos(a) * sp, vy:Math.sin(a) * sp * 0.5, vz:rr(o.v0 || 90, o.v1 || 230), g:o.g || 560,
      size:rr(o.sz0 || 2.5, o.sz1 || 6), col:o.cols ? o.cols[(Math.random() * o.cols.length) | 0] : '#2b1d16',
      rot:Math.random() * TAU, vr:rr(-9, 9), shard:!!o.shard, life:rr(0.7, 1.3)});
  }
}
function pfWisps(x, y, n, o){      /* души-огоньки, поднимающиеся вверх */
  o = o || {}; n = nOf(n);
  for(let i = 0; i < n; i++){
    pfAdd({k:'wisp', minor:true, x:x + rr(-(o.w || 16), o.w || 16), y:y + rr(-4, 6), z:rr(0, o.z || 20), vz:rr(o.v0 || 34, o.v1 || 70),
      sway:rr(5, 12), ph:Math.random() * TAU, size:rr(o.sz0 || 5, o.sz1 || 9), col:o.col || '182,255,58',
      life:rr(o.l0 || 1.0, o.l1 || 1.7), delay:o.delay ? rr(0, o.delay) : 0});
  }
}
function pfMist(x, y, o){          /* клубы дыма / тумана */
  pfAdd({k:'mist', minor:true, x, y, r0:o.r0 || 18, r1:o.r1 || 60, a:o.a || 0.35, col:o.col || '40,22,70',
    vx:o.vx == null ? rr(-12, 12) : o.vx, vy:o.vy == null ? rr(-8, 4) : o.vy, rise:o.rise || 18,
    life:o.life || 1.0, add:!!o.add, delay:o.delay || 0});
}

/* ---------- силуэт чумного доктора (для призрачных следов) ---------- */
function drawSil(g, x, y, s, flip, a, fill, rim){
  g.save(); g.translate(x, y); g.scale(s * flip, s);
  g.lineWidth = 2; g.strokeStyle = rim; g.fillStyle = fill;
  g.globalAlpha = a;
  g.beginPath();
  g.moveTo(-12, -62); g.quadraticCurveTo(-26, -30, -25, 0); g.lineTo(25, 0); g.quadraticCurveTo(26, -30, 12, -62);
  g.quadraticCurveTo(0, -68, -12, -62); g.closePath(); g.fill();
  g.globalAlpha = a * 0.8; g.stroke();
  g.globalAlpha = a;
  g.beginPath(); g.arc(0, -73, 9, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(5, -77); g.quadraticCurveTo(24, -74, 31, -62); g.quadraticCurveTo(15, -66, 5, -68); g.closePath(); g.fill();
  g.globalAlpha = a * 0.8; g.stroke();
  g.globalAlpha = a;
  g.beginPath(); g.ellipse(0, -81, 19, 4.5, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-8, -82); g.lineTo(-6, -95); g.lineTo(6, -95); g.lineTo(8, -82); g.closePath(); g.fill();
  g.globalAlpha = a * 0.8; g.stroke();
  g.globalAlpha = a; g.fillStyle = '#ffb52e'; g.beginPath(); g.arc(4, -74, 2.2, 0, TAU); g.fill();
  g.restore();
}

/* ---------- МОГИЛА (слой земли — рисуется ПОД юнитами) ---------- */
function makeGrave(x, y, delay){
  const cracks = [], nc = 7;
  for(let i = 0; i < nc; i++){
    const len = rr(34, 60), seg = [];
    for(let s = 0; s < 3; s++) seg.push({da:rr(-0.5, 0.5), l:len / 3});
    cracks.push({a:i / nc * TAU + rr(-0.3, 0.3), len, seg});
  }
  return pfAdd({k:'grave', x, y, delay, dur:PF_DUR, life:PF_DUR + 1.2, cracks, hx:rr(-12, 12),
    sx:Math.random() < 0.5 ? -1 : 1, tilt:rr(-0.18, 0.18), seed:Math.random() * 100,
    onStart:o => psnd('psihGrave', o.x, o.y, 0.8)});
}
function drawGrave(g, o){
  const t = o.t, D = o.dur;
  const open = ease3(t / 0.4);
  const gone = Math.max(0, Math.min(1, (t - D) / 1.2));
  const fade = 1 - gone; if(fade <= 0.01 || open <= 0.001) return;
  const burstK = Math.max(0, Math.min(1, (t - PF_RISE0) / 0.35));
  g.save(); g.translate(o.x, o.y);
  /* 1. тёмная проплешина */
  g.globalAlpha = 0.6 * fade * open;
  g.fillStyle = '#0b0710'; g.beginPath(); g.ellipse(0, 5, 40 * open + 1, 19 * open + 1, 0, 0, TAU); g.fill();
  /* 2. свечение из-под земли */
  const pulse = 0.65 + 0.35 * Math.sin(t * 12 + o.seed);
  const glow = fade * open * (t < PF_RISE0 ? 0.6 * pulse : 0.9 * (1 - burstK * 0.4));
  g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1;
  const gl = g.createRadialGradient(0, 2, 0, 0, 2, 52);
  gl.addColorStop(0, 'rgba(182,255,58,' + al(0.55 * glow) + ')');
  gl.addColorStop(0.5, 'rgba(122,75,201,' + al(0.32 * glow) + ')');
  gl.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gl; g.beginPath(); g.ellipse(0, 3, 52, 30, 0, 0, TAU); g.fill();
  g.globalCompositeOperation = 'source-over';
  /* 3. трещины */
  g.lineCap = 'round'; g.lineJoin = 'round';
  for(const c of o.cracks){
    g.beginPath(); g.moveTo(0, 2);
    let px = 0, py = 2;
    for(let i = 0; i < c.seg.length; i++){
      const sk = Math.max(0, Math.min(1, open * c.seg.length - i)); if(sk <= 0) break;
      const s = c.seg[i];
      px += Math.cos(c.a + s.da) * s.l * sk; py += Math.sin(c.a + s.da) * s.l * sk * 0.55;
      g.lineTo(px, py);
    }
    g.globalAlpha = fade; g.strokeStyle = '#050308'; g.lineWidth = 3; g.stroke();
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, glow); g.strokeStyle = '#b6ff3a'; g.lineWidth = 1.3; g.stroke();
    g.globalCompositeOperation = 'source-over';
  }
  /* 4. холмик: набухает, потом проваливается */
  const swell = ease3(t / 0.5) * (1 - Math.max(0, Math.min(1, (t - PF_RISE0) / 0.5)));
  if(swell > 0.02){
    g.globalAlpha = fade;
    const mg = g.createRadialGradient(-4, -6 * swell, 2, 0, 0, 26);
    mg.addColorStop(0, '#4a3326'); mg.addColorStop(1, '#1d1310');
    g.fillStyle = mg; g.beginPath(); g.ellipse(0, 2 - 4 * swell, 26 * swell + 4, 13 * swell + 2, 0, 0, TAU); g.fill();
  }
  /* 5. костлявая рука тянется из земли */
  const hk = ease3((t - 0.2) / 0.3) * (1 - ease3((t - 0.62) / 0.25));
  if(hk > 0.02){
    const ah = 38 * hk, tw = Math.sin(t * 9 + o.seed) * 2;
    g.save(); g.translate(o.hx, 2); g.globalAlpha = fade; g.lineCap = 'round';
    g.strokeStyle = '#7d7a63'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.lineTo(tw, -ah); g.stroke();
    g.strokeStyle = '#a9a68a'; g.lineWidth = 2.2;
    for(let i = 0; i < 4; i++){
      const fa = (i - 1.5) * 0.42 + Math.sin(t * 11 + i * 1.7) * 0.3;
      g.beginPath(); g.moveTo(tw, -ah); g.lineTo(tw + Math.sin(fa) * 13, -ah - Math.cos(fa) * 13 * Math.min(1, hk * 1.4)); g.stroke();
    }
    g.beginPath(); g.moveTo(tw, -ah + 3); g.lineTo(tw - 9, -ah - 3); g.stroke();
    g.restore();
  }
  /* 6. надгробие */
  const sk = ease3((t - 0.05) / 0.45);
  if(sk > 0.01){
    const w = 24, h = 40, sink = ease3(gone);
    g.save();
    g.beginPath(); g.rect(-120, -140, 240, 144); g.clip();
    g.translate(o.sx * 31, -3 + (1 - sk) * h * 0.95 + sink * h);
    const shk = t > PF_RISE0 ? Math.sin((t - PF_RISE0) * 40) * 0.03 * (1 - Math.min(1, (t - PF_RISE0) / 0.4)) : 0;
    g.rotate(o.tilt + shk + gone * 0.25 * o.sx);
    g.globalAlpha = fade;
    const sg = g.createLinearGradient(-w / 2, 0, w / 2, 0);
    sg.addColorStop(0, '#5a5967'); sg.addColorStop(1, '#2c2b36');
    g.fillStyle = sg; g.strokeStyle = '#15141b'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(-w / 2, 0); g.lineTo(-w / 2, -h * 0.62); g.quadraticCurveTo(-w / 2, -h, 0, -h);
    g.quadraticCurveTo(w / 2, -h, w / 2, -h * 0.62); g.lineTo(w / 2, 0); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = '#15141b'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, -h * 0.8); g.lineTo(0, -h * 0.42); g.moveTo(-6, -h * 0.66); g.lineTo(6, -h * 0.66); g.stroke();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = Math.min(1, fade * (0.5 + 0.5 * pulse)); g.strokeStyle = '#b6ff3a'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(0, -h * 0.8); g.lineTo(0, -h * 0.42); g.moveTo(-6, -h * 0.66); g.lineTo(6, -h * 0.66); g.stroke();
    if(t > PF_RISE0 - 0.05){            /* камень трескается, когда клон выбирается наружу */
      const ck = Math.min(1, (t - PF_RISE0 + 0.05) / 0.2);
      g.globalAlpha = Math.min(1, fade * ck); g.strokeStyle = '#b6ff3a'; g.lineWidth = 1.8;
      g.beginPath(); g.moveTo(-2, -h); g.lineTo(3, -h * 0.72); g.lineTo(-3, -h * 0.5); g.lineTo(2, -h * 0.25); g.lineTo(0, 0); g.stroke();
    }
    g.restore();
  }
  g.restore();
}

/* ---------- РИТУАЛЬНЫЙ КРУГ (ульта) ---------- */
function drawRune(g, o){
  const k = Math.max(0, Math.min(1, o.t / o.life));
  const grow = ease3(Math.min(1, k / 0.16)), fade = k < 0.55 ? 1 : (1 - k) / 0.45;
  if(fade <= 0.01) return;
  const r = o.r * (0.25 + 0.75 * grow), sq = 0.6;
  g.save(); g.translate(o.x, o.y); g.scale(1, sq);
  g.globalCompositeOperation = 'lighter';
  const gl = g.createRadialGradient(0, 0, 0, 0, 0, r);
  gl.addColorStop(0, 'rgba(182,255,58,' + al(0.24 * fade) + ')');
  gl.addColorStop(0.55, 'rgba(122,75,201,' + al(0.2 * fade) + ')');
  gl.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.globalAlpha = fade * 0.9; g.strokeStyle = '#a47bff'; g.lineWidth = 2.5;
  g.setLineDash([14, 9]); g.lineDashOffset = -o.t * 70;
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); g.setLineDash([]);
  g.lineWidth = 1.4; g.globalAlpha = fade * 0.7;
  g.beginPath(); g.arc(0, 0, r * 0.9, 0, TAU); g.stroke();
  const nt = 28; g.beginPath();
  for(let i = 0; i < nt; i++){
    const a = i / nt * TAU + o.t * 0.35;
    g.moveTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); g.lineTo(Math.cos(a) * r * 0.97, Math.sin(a) * r * 0.97);
  }
  g.stroke();
  g.strokeStyle = '#b6ff3a'; g.lineWidth = 2; g.globalAlpha = fade * 0.85;
  const rot = -o.t * 0.5 - Math.PI / 2, rs = r * 0.82;
  g.beginPath();
  for(let i = 0; i <= 7; i++){
    const a = ((i * 3) % 7) / 7 * TAU + rot;
    if(i === 0) g.moveTo(Math.cos(a) * rs, Math.sin(a) * rs); else g.lineTo(Math.cos(a) * rs, Math.sin(a) * rs);
  }
  g.stroke();
  g.fillStyle = '#b6ff3a'; g.globalAlpha = fade * 0.9;
  for(let i = 0; i < 7; i++){
    const a = i / 7 * TAU + rot; g.beginPath(); g.arc(Math.cos(a) * rs, Math.sin(a) * rs, 5, 0, TAU); g.fill();
  }
  g.strokeStyle = '#a47bff'; g.lineWidth = 1.6; g.globalAlpha = fade * 0.75;
  g.beginPath(); g.arc(0, 0, r * 0.38, 0, TAU); g.stroke();
  g.beginPath();
  for(let i = 0; i < 6; i++){
    const a = i / 6 * TAU + o.t * 0.9;
    g.moveTo(Math.cos(a) * r * 0.38, Math.sin(a) * r * 0.38); g.lineTo(Math.cos(a) * r * 0.26, Math.sin(a) * r * 0.26);
  }
  g.stroke();
  g.restore();
}

/* ---------- слой земли: могилы и руны ---------- */
function pfDrawGround(){
  if(!PF.list.length) return;
  const g = ctx;
  g.save();
  for(const o of PF.list){
    if(o.t < 0 || (o.k !== 'grave' && o.k !== 'rune')) continue;
    if(!isWorldPointVisible(o.x, o.y, (o.r || 120) + 100)) continue;
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.lineCap = 'butt'; g.lineJoin = 'miter';
    if(o.k === 'grave') drawGrave(g, o); else drawRune(g, o);
  }
  g.restore();
}

/* ---------- верхний слой: дым, души, комья, порезы, следы ---------- */
function pfDrawTop(){
  if(!PF.list.length) return;
  const g = ctx;
  g.save();
  for(const o of PF.list){
    if(o.t < 0 || o.k === 'grave' || o.k === 'rune') continue;
    if(!isWorldPointVisible(o.x, o.y, (o.r || o.h || 160) + 100)) continue;
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.lineCap = 'butt'; g.lineJoin = 'miter';
    const k = Math.max(0, Math.min(1, o.t / o.life));
    switch(o.k){
      case 'bit': {
        const a = Math.min(1, (1 - k) * 3);
        g.globalAlpha = a; g.fillStyle = o.col;
        g.save(); g.translate(o.x, o.y - o.z); g.rotate(o.rot);
        if(o.shard){
          g.beginPath(); g.moveTo(-o.size, o.size * 0.5); g.lineTo(0, -o.size * 1.2); g.lineTo(o.size, o.size * 0.5); g.closePath(); g.fill();
          g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.5; g.strokeStyle = '#b6ff3a'; g.lineWidth = 1; g.stroke();
        } else g.fillRect(-o.size / 2, -o.size * 0.35, o.size, o.size * 0.7);
        g.restore();
        break;
      }
      case 'wisp': {
        const a = Math.sin(k * Math.PI) * 0.9;
        const px = o.x + Math.sin(o.ph + o.t * 3) * o.sway, py = o.y - o.z;
        const r = o.size * (1 + 0.25 * Math.sin(o.t * 9 + o.ph));
        g.globalCompositeOperation = 'lighter';
        for(let i = 3; i >= 1; i--){
          g.fillStyle = 'rgba(' + o.col + ',' + al(a * 0.16 * (4 - i) / 3) + ')';
          g.beginPath(); g.arc(o.x + Math.sin(o.ph + (o.t - i * 0.07) * 3) * o.sway, py + i * 7, Math.max(0.5, r * (1 - i * 0.2)), 0, TAU); g.fill();
        }
        g.fillStyle = 'rgba(' + o.col + ',' + al(a * 0.28) + ')'; g.beginPath(); g.arc(px, py, r * 2, 0, TAU); g.fill();
        g.fillStyle = 'rgba(255,255,255,' + al(a * 0.9) + ')'; g.beginPath(); g.arc(px, py, Math.max(0.5, r * 0.5), 0, TAU); g.fill();
        break;
      }
      case 'mist': {
        const a = Math.sin(k * Math.PI) * o.a;
        const r = Math.max(1, o.r0 + (o.r1 - o.r0) * ease3(k));
        const px = o.x + o.vx * o.t, py = o.y + o.vy * o.t - o.rise * ease3(k);
        g.globalCompositeOperation = o.add ? 'lighter' : 'source-over';
        const gr = g.createRadialGradient(px, py, 0, px, py, r);
        gr.addColorStop(0, 'rgba(' + o.col + ',' + al(a) + ')'); gr.addColorStop(1, 'rgba(' + o.col + ',0)');
        g.fillStyle = gr; g.beginPath(); g.ellipse(px, py, r, r * 0.7, 0, 0, TAU); g.fill();
        break;
      }
      case 'pillar': {
        const fade = Math.sin(Math.min(1, k * 1.1) * Math.PI), w = o.w * (1 - k * 0.35), h = o.h * (0.4 + 0.6 * ease3(k * 2));
        g.globalCompositeOperation = 'lighter';
        const lg = g.createLinearGradient(0, o.y, 0, o.y - h);
        lg.addColorStop(0, 'rgba(' + o.col + ',' + al(0.7 * fade) + ')'); lg.addColorStop(0.6, 'rgba(' + o.col + ',' + al(0.22 * fade) + ')'); lg.addColorStop(1, 'rgba(' + o.col + ',0)');
        g.fillStyle = lg; g.beginPath(); g.moveTo(o.x - w, o.y); g.lineTo(o.x - w * 0.35, o.y - h); g.lineTo(o.x + w * 0.35, o.y - h); g.lineTo(o.x + w, o.y); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,255,255,' + al(0.4 * fade) + ')'; g.fillRect(o.x - w * 0.12, o.y - h * 0.75, w * 0.24, h * 0.75);
        break;
      }
      case 'ghost': {
        const a = (1 - k) * (o.a0 == null ? 0.6 : o.a0);
        g.save();
        if(o.sink){ g.beginPath(); g.rect(o.x - 90, o.y - 240, 180, 246); g.clip(); }
        const sc = o.s * (o.sink ? (1 - 0.25 * ease3(k)) : (1 + 0.1 * k));
        drawSil(g, o.x + (o.dx || 0) * k, o.y + (o.sink ? ease3(k) * 50 : 0), sc, o.flip || 1, a, o.col || '#150c22', o.rim || '#b6ff3a');
        g.restore();
        break;
      }
      case 'slash': {
        g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
        for(const s of o.s){
          const ts = o.t - s.d; if(ts < 0) continue;
          const p = Math.min(1, ts / 0.12), a = ts < 0.12 ? 1 : Math.max(0, 1 - (ts - 0.12) / Math.max(0.05, o.life - s.d - 0.12));
          if(a <= 0.01) continue;
          const ca = Math.cos(s.a), sa = Math.sin(s.a);
          const x0 = o.x - ca * s.L / 2, y0 = o.y - sa * s.L / 2;
          const x1 = x0 + ca * s.L * p, y1 = y0 + sa * s.L * p;
          const cx = x0 + ca * s.L * p / 2 - sa * s.bend * p, cy = y0 + sa * s.L * p / 2 + ca * s.bend * p;
          g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(cx, cy, x1, y1);
          g.strokeStyle = o.c; g.globalAlpha = a * 0.4; g.lineWidth = s.w * 3.2; g.stroke();
          g.globalAlpha = a * 0.9; g.lineWidth = s.w; g.stroke();
          g.strokeStyle = '#ffffff'; g.globalAlpha = a; g.lineWidth = Math.max(1, s.w * 0.4); g.stroke();
        }
        break;
      }
      case 'streak': {
        const a = 1 - k;
        g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
        const gr = g.createLinearGradient(o.x1, o.y1, o.x2, o.y2);
        gr.addColorStop(0, 'rgba(122,75,201,0)'); gr.addColorStop(0.6, 'rgba(122,75,201,' + al(0.7 * a) + ')'); gr.addColorStop(1, 'rgba(182,255,58,' + al(0.95 * a) + ')');
        g.strokeStyle = gr; g.lineWidth = 22 * (1 - k) + 2; g.globalAlpha = 0.55;
        g.beginPath(); g.moveTo(o.x1, o.y1); g.lineTo(o.x2, o.y2); g.stroke();
        g.globalAlpha = 1; g.lineWidth = 8 * (1 - k) + 1; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,' + al(0.9 * a) + ')'; g.lineWidth = 3 * (1 - k) + 0.5;
        g.beginPath(); g.moveTo(o.x1, o.y1); g.lineTo(o.x2, o.y2); g.stroke();
        break;
      }
      case 'link': {
        const a = Math.sin(Math.min(1, k) * Math.PI);
        g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round';
        const dx = o.x2 - o.x1, dy = o.y2 - o.y1, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, fl = Math.floor(o.t * 28), N = 8;
        g.beginPath(); g.moveTo(o.x1, o.y1);
        for(let i = 1; i < N; i++){
          const f = i / N, off = Math.sin(o.seed * 13 + i * 7.1 + fl * 3.7) * 16 * Math.sin(f * Math.PI);
          g.lineTo(o.x1 + dx * f + nx * off, o.y1 + dy * f + ny * off);
        }
        g.lineTo(o.x2, o.y2);
        g.strokeStyle = 'rgba(164,123,255,' + al(0.5 * a) + ')'; g.lineWidth = 9; g.stroke();
        g.strokeStyle = 'rgba(182,255,58,' + al(0.9 * a) + ')'; g.lineWidth = 3.5; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,' + al(a) + ')'; g.lineWidth = 1.4; g.stroke();
        break;
      }
    }
  }
  g.restore();
}

/* ---------- логика эффектов ---------- */
function graveBurst(o){            /* момент, когда копия вырывается наружу */
  pfBits(o.x, o.y, 16, {s0:70, s1:210, v0:130, v1:300, cols:['#2b1d16', '#3d2a1e', '#1a1210', '#4a3326'], sz0:3, sz1:7});
  pfBits(o.x, o.y, 6, {s0:60, s1:160, v0:160, v1:320, cols:['#b6ff3a', '#7a4bc9'], sz0:2, sz1:4, shard:true});
  pfWisps(o.x, o.y, 6, {w:20, z:10, v0:50, v1:100, l0:1.1, l1:1.9});
  pfMist(o.x, o.y, {r0:14, r1:66, a:0.4, col:'30,18,52', life:1.3, rise:24});
  pfMist(o.x, o.y, {r0:10, r1:52, a:0.28, col:'150,255,60', life:0.9, rise:34, add:true});
  pfAdd({k:'pillar', x:o.x, y:o.y + 4, w:26, h:210, col:'182,255,58', life:0.75});
  fxRing(o.x, o.y, 78, '#b6ff3a', 0.45);
  pfShake(3.5, 0.22);
  psnd('psihBurst', o.x, o.y, 0.9);
}
function psihVanishFx(c, killed){  /* копия исчезает: распадается на души и уходит в землю */
  if(fxLv() >= 3 || !c._pfSeen) return;
  const gy = c.y + c.radius * 0.35, sc = (c.radius / 22) * 1.1;
  pfAdd({k:'ghost', x:c.x, y:gy, s:sc, flip:flipOf(c), life:0.85, a0:0.65, sink:true, col:'#150c22', rim:killed ? '#ff3b5c' : '#b6ff3a'});
  if(killed) pfBits(c.x, c.y - 20, 14, {s0:80, s1:230, v0:120, v1:280, z0:26, cols:['#b6ff3a', '#7a4bc9', '#150c22'], sz0:2.5, sz1:5.5, shard:true});
  else pfBits(c.x, gy, 6, {s0:30, s1:90, v0:60, v1:140, cols:['#2b1d16', '#3d2a1e']});
  pfWisps(c.x, gy, killed ? 6 : 4, {w:16, z:30, v0:50, v1:100, l0:1.0, l1:1.7});
  pfMist(c.x, gy, {r0:12, r1:48, a:0.38, col:'30,18,52', life:1.0, rise:22});
  fxRing(c.x, c.y, killed ? 66 : 50, killed ? '#ff3b5c' : '#7a4bc9', 0.4);
  psnd('psihVanish', c.x, c.y, 0.8);
}
function pfFinishEmerge(c){        /* клон полностью вылез */
  if(fxLv() >= 3) return;
  pfWisps(c.x, c.y, 3, {w:14, z:40, v0:40, v1:80});
  pfMist(c.x, c.y + c.radius * 0.3, {r0:10, r1:40, a:0.3, col:'150,255,60', life:0.7, rise:20, add:true});
  pfBits(c.x, c.y + c.radius * 0.3, 4, {s0:20, s1:70, v0:50, v1:120, cols:['#2b1d16', '#3d2a1e']});
}
function pfBlinkFx(ox, oy, h, t, ambush){   /* «Привет сзади»: рывок, призрачный след, порезы */
  const sc = (h.radius / 22) * 1.1, fl = flipOf(h);
  const bodyOff = 28;
  pfAdd({k:'streak', x:(ox + h.x) / 2, y:(oy + h.y) / 2, r:Math.hypot(h.x - ox, h.y - oy) / 2 + 80, x1:ox, y1:oy - bodyOff, x2:h.x, y2:h.y - bodyOff, life:0.38});
  pfAdd({k:'ghost', x:ox, y:oy + h.radius * 0.35, s:sc, flip:fl, life:0.75, a0:0.6, col:'#150c22', rim:'#a47bff'});
  for(let i = 1; i <= 2; i++){
    const f = i / 3;
    pfAdd({k:'ghost', x:ox + (h.x - ox) * f, y:oy + (h.y - oy) * f + h.radius * 0.35, s:sc, flip:fl, life:0.5, a0:0.4 - i * 0.1, col:'#150c22', rim:'#b6ff3a', delay:i * 0.04});
  }
  for(let i = 0; i < 4; i++) pfMist(ox + rr(-12, 12), oy + rr(-4, 10), {r0:12, r1:46, a:0.42, col:'30,18,52', life:rr(0.8, 1.2), rise:rr(14, 34)});
  pfWisps(ox, oy, 4, {w:16, col:'164,123,255'});
  pfBits(ox, oy + 6, 5, {s0:30, s1:90, v0:60, v1:130, cols:['#2b1d16', '#3d2a1e']});
  /* порезы на жертве */
  const L = ambush ? 128 : 100;
  pfAdd({k:'slash', x:t.x, y:t.y - 30, c:ambush ? '#ff9a3b' : '#ff3b5c', life:0.5, s:[
    {a:-0.75 + rr(-0.15, 0.15), L, w:5, bend:14, d:0.0}, {a:0.7 + rr(-0.15, 0.15), L:L * 0.95, w:5, bend:-14, d:0.07},
    {a:-0.05 + rr(-0.2, 0.2), L:L * 1.15, w:4, bend:8, d:0.13}]});
  pfBits(t.x, t.y - 20, ambush ? 20 : 14, {s0:60, s1:200, v0:90, v1:240, z0:24, cols:['#b0102a', '#ff3b5c', '#6d0a1a'], sz0:2, sz1:4.5});
  fxRing(t.x, t.y, ambush ? 96 : 76, '#ff3b5c', 0.4);
  psnd('psihSlash', t.x, t.y, 0.9);
  if(h === playerHero) flashScreen('#ff3b5c', ambush ? 0.24 : 0.16, 0.2);
}
function pfHideFx(h){              /* «Тишина в голове»: растворяется в дыму, оставляя призрака */
  pfAdd({k:'ghost', x:h.x, y:h.y + h.radius * 0.35, s:(h.radius / 22) * 1.1, flip:flipOf(h), life:0.9, a0:0.55, col:'#150c22', rim:'#a47bff'});
  for(let i = 0; i < 5; i++) pfMist(h.x + rr(-14, 14), h.y + rr(-4, 10), {r0:14, r1:54, a:0.46, col:'30,18,52', life:rr(0.8, 1.3), rise:rr(20, 40)});
  pfWisps(h.x, h.y, 6, {w:20, col:'164,123,255'});
}
function pfRevealFx(h){            /* Псих проявляется */
  pfBits(h.x, h.y - 24, 10, {s0:60, s1:170, v0:90, v1:220, z0:24, cols:['#a47bff', '#b6ff3a', '#150c22'], sz0:2, sz1:4.5, shard:true});
  pfWisps(h.x, h.y, 3, {w:14, col:'164,123,255'});
  pfMist(h.x, h.y, {r0:12, r1:50, a:0.34, col:'122,75,201', life:0.7, rise:16, add:true});
  fxRing(h.x, h.y, 64, '#a47bff', 0.35);
  psnd('psihVanish', h.x, h.y, 0.7);
}
function pfUltFx(h, graves){       /* «Мы — одно целое»: ритуальный круг, столб света, нити к могилам */
  const fast = fxLv() >= 3;
  pfAdd({k:'rune', x:h.x, y:h.y + h.radius * 0.3, r:290, life:3.0 + (fast ? 0 : graves.length * 0.15)});
  pfAdd({k:'pillar', x:h.x, y:h.y + 4, w:42, h:300, col:'164,123,255', life:1.2});
  pfWisps(h.x, h.y, 12, {w:40, z:30, col:'164,123,255', v0:60, v1:120, l0:1.2, l1:2.0});
  pfMist(h.x, h.y, {r0:30, r1:150, a:0.5, col:'30,18,52', life:1.8, rise:20});
  pfMist(h.x, h.y, {r0:20, r1:110, a:0.3, col:'122,75,201', life:1.2, rise:30, add:true});
  flashScreen('#7a4bc9', 0.3, 0.7); pfShake(6, 0.6);
  psnd('psihUlt', h.x, h.y, 1.3); psnd('psihRise', h.x, h.y, 1.0);
  for(const g of graves){
    pfAdd({k:'link', x:(h.x + g.x) / 2, y:(h.y + g.y) / 2, r:Math.hypot(g.x - h.x, g.y - h.y) / 2 + 60, x1:h.x, y1:h.y - 30, x2:g.x, y2:g.y,
      life:0.5, delay:Math.max(0, g.delay - 0.3), seed:Math.random() * 50});
  }
}

function pfTick(dt){
  if(typeof gameState !== 'undefined' && gameState !== 'playing') return;
  if(dt > 0.25) dt = 0.25;
  if(typeof gameTime !== 'undefined'){
    if(gameTime < PF.gt - 0.5){ PF.list.length = 0; PF.clones.length = 0; }       /* новый матч */
    PF.gt = gameTime;
  }
  const lvl = fxLv();
  /* копии: слежение за исчезновением и видимостью */
  for(let i = PF.clones.length - 1; i >= 0; i--){
    const c = PF.clones[i];
    if(c.dead){ PF.clones.splice(i, 1); if(!c._pfGone){ c._pfGone = true; psihVanishFx(c, !c.expired); } continue; }
    c._pfSeen = auraShown(c);
    if(lvl >= 2 || !c._pfSeen || c.emerge) continue;
    c._pfA = (c._pfA || 0) - dt;
    if(c._pfA <= 0){ c._pfA = rr(0.5, 0.9); pfWisps(c.x, c.y + c.radius * 0.4, 1, {w:12, z:6, v0:24, v1:44, sz0:3.5, sz1:6, l0:0.8, l1:1.2}); }
    c._pfM = (c._pfM || 0) - dt;
    if(c.moving && c._pfM <= 0){ c._pfM = 0.2; pfMist(c.x, c.y + c.radius * 0.5, {r0:8, r1:26, a:0.2, col:'122,255,60', life:0.6, rise:6, vx:0, vy:0, add:true}); }
  }
  /* список эффектов */
  let w = 0;
  for(const o of PF.list){
    o.t += dt;
    if(o.t >= 0){
      if(!o.started){ o.started = true; if(o.onStart) o.onStart(o); }
      if(o.k === 'bit'){
        o.x += o.vx * dt; o.y += o.vy * dt; o.z += o.vz * dt; o.vz -= o.g * dt; o.rot += o.vr * dt;
        if(o.z < 0){ o.z = 0; o.vz = Math.abs(o.vz) > 40 ? -o.vz * 0.28 : 0; o.vx *= 0.55; o.vy *= 0.55; o.vr *= 0.5; }
      } else if(o.k === 'wisp'){
        o.z += o.vz * dt;
      } else if(o.k === 'grave'){
        if(!o.burst && o.t >= PF_RISE0){ o.burst = true; graveBurst(o); }
        if(o.t > PF_RISE0 && o.t < o.dur){
          o.trk = (o.trk || 0) - dt;
          if(o.trk <= 0){ o.trk = 0.07; pfBits(o.x + rr(-10, 10), o.y + rr(-6, 4), 1, {s0:4, s1:22, v0:10, v1:50, z0:rr(28, 80), sz0:2, sz1:3.5, cols:['#2b1d16', '#3d2a1e']}); }
        }
      }
    }
    if(o.t < o.life) PF.list[w++] = o;
  }
  PF.list.length = w;
  if(lvl >= 2) return;
  /* Псих: проявление из невидимости, дымок, огоньки вокруг */
  for(const h of heroes){
    if(!h || h.dead || !isPsih(h)) continue;
    const seen = auraShown(h), nowInv = !!(h.invisible && h.undetectable), wasInv = !!h._pfInv;
    h._pfInv = nowInv;
    if(!seen) continue;
    if(wasInv && !nowInv) pfRevealFx(h);
    const hpK = 1 - Math.max(0, Math.min(1, h.hp / Math.max(1, h.maxHp)));
    if(nowInv){
      h._pfS = (h._pfS || 0) - dt;
      if(h._pfS <= 0){ h._pfS = 0.14; pfMist(h.x + rr(-10, 10), h.y + rr(0, 8), {r0:10, r1:34, a:0.32, col:'40,22,70', life:0.9, rise:30}); }
      continue;
    }
    h._pfA = (h._pfA || 0) - dt;
    if(h._pfA <= 0){ h._pfA = (0.32 + Math.random() * 0.3) / (1 + hpK * 1.6); pfWisps(h.x, h.y + h.radius * 0.4, 1, {w:14, z:6, v0:26, v1:48, sz0:4, sz1:7, l0:0.9, l1:1.4}); }
    h._pfM = (h._pfM || 0) - dt;
    if(h.moving && h._pfM <= 0){ h._pfM = 0.22; pfMist(h.x, h.y + h.radius * 0.5, {r0:8, r1:26, a:0.22, col:'30,18,52', life:0.7, rise:8, vx:0, vy:0}); }
  }
}

/* ---------- аура «безумия» вокруг Психа и его копий ---------- */
const isPsihBody = u => !!u && (isPsih(u) || u instanceof PsihClone);
function auraShown(u){
  if(!u || u.dead || (typeof portraitRenderMode !== 'undefined' && portraitRenderMode)) return false;
  if(u.invisible && u !== playerHero) return false;
  if(u.team !== 0 && typeof isVisibleToPlayer === 'function' && !isVisibleToPlayer(u)) return false;
  return true;
}
function drawAuraBack(g, u){
  const tm = gameTime, mad = 1 - Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp)));
  const rg = u.radius + 12 + Math.sin(tm * 4 + u.x * 0.02) * 2;
  const red = mad > 0.55, c1 = red ? '255,59,92' : '122,75,201', c2 = red ? '255,120,80' : '182,255,58';
  g.save(); g.translate(u.x, u.y + u.radius * 0.35);
  g.globalCompositeOperation = 'lighter';
  const gr = g.createRadialGradient(0, 0, rg * 0.3, 0, 0, rg * 1.35);
  gr.addColorStop(0, 'rgba(' + c1 + ',0)'); gr.addColorStop(0.7, 'rgba(' + c1 + ',' + al(0.16 + mad * 0.1) + ')'); gr.addColorStop(1, 'rgba(' + c1 + ',0)');
  g.fillStyle = gr; g.beginPath(); g.ellipse(0, 0, rg * 1.35, rg * 0.7, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(' + c2 + ',' + al(0.28 + 0.12 * Math.sin(tm * 6)) + ')'; g.lineWidth = 1.6;
  g.setLineDash([7, 9]); g.lineDashOffset = -tm * (30 + mad * 60);
  g.beginPath(); g.ellipse(0, 0, rg, rg * 0.5, 0, 0, TAU); g.stroke(); g.setLineDash([]);
  g.restore();
}
function drawAuraFront(g, u){
  const tm = gameTime, mad = 1 - Math.max(0, Math.min(1, u.hp / Math.max(1, u.maxHp))), sp = 1.8 + mad * 2.4, n = 4;
  g.save(); g.globalCompositeOperation = 'lighter';
  for(let i = 0; i < n; i++){
    const a = tm * sp + i * TAU / n + u.x * 0.01, rad = u.radius + 16 + Math.sin(tm * 2 + i) * 4;
    const px = u.x + Math.cos(a) * rad, py = u.y - 26 - 22 * Math.sin(tm * 1.7 + i * 1.9) + Math.sin(a) * rad * 0.45;
    const a0 = Math.sin(a) > 0 ? 0.85 : 0.4, col = (i % 2) ? '182,255,58' : '164,123,255';
    const a2 = a - 0.4, qx = u.x + Math.cos(a2) * rad, qy = py + (Math.sin(a2) - Math.sin(a)) * rad * 0.45;
    g.fillStyle = 'rgba(' + col + ',' + al(a0 * 0.22) + ')'; g.beginPath(); g.arc(qx, qy, 4, 0, TAU); g.fill();
    g.fillStyle = 'rgba(' + col + ',' + al(a0 * 0.28) + ')'; g.beginPath(); g.arc(px, py, 7, 0, TAU); g.fill();
    g.fillStyle = 'rgba(' + col + ',' + al(a0) + ')'; g.beginPath(); g.arc(px, py, 2.6, 0, TAU); g.fill();
  }
  g.restore();
}
/* копия вылезает из земли: сдвиг вниз + обрезка по линии земли */
function drawRising(self, args, u){
  const e = u.emerge;
  if(e.t < e.wait + PF_RISE0) return;
  const k = Math.max(0, Math.min(1, (e.t - e.wait - PF_RISE0) / Math.max(0.01, e.dur - PF_RISE0)));
  const H = u.radius * 4.6, gy = u.radius * 0.45, g = ctx;
  g.save();
  g.beginPath(); g.rect(u.x - 300, u.y - 600, 600, 600 + gy); g.clip();
  g.translate(Math.sin(e.t * 55) * (1 - k) * 2.2, (1 - ease3(k)) * H);
  g.globalAlpha = 0.55 + 0.45 * k;
  try { _dus.apply(self, args); } finally { g.restore(); }
}

/* ---------- ПСИХ ---------- */
const PSIH_AS = [0, 0.25, 0.35, 0.45, 0.55], PSIH_RED = [0, 0.08, 0.12, 0.16, 0.20];
Object.assign(SKILLS, {
  psihQ: {
    name:'Тишина в голове', short:'Q', type:'self', maxLevel:4,
    cd:[0,22,20,18,16], mana:[0,60,65,70,75],
    desc:'Активно: Псих становится невидимым на 7,5–12 сек. и бежит быстрее на 15%. Вражеские герои не видят его и не могут выбрать целью. Первая обычная атака раскрывает его.',
    cast(h, x, y, lvl){
      const dur = 6 + lvl * 1.5;
      h.invisible = true; h.undetectable = true; h.tribuInvisibilityTimer = dur;
      h.addBuff({type:'spd', id:'psihHideSpd', val:0.15, t:dur});
      fxRing(h.x, h.y, 90, '#7a4bc9', 0.6); spawnParticles(h.x, h.y, '#b6ff3a', 26, 0.9);
      addText(h.x, h.y - 72, 'ИСЧЕЗ', '#c9a0ff', 1.0, 16); snd('psihHide'); pfHideFx(h);
    }
  },
  psihW: {
    name:'Безумие', short:'W', type:'self', passive:true, maxLevel:4,
    cd:[0,0,0,0,0], mana:[0,0,0,0,0],
    desc:'Пассивно: +25/35/45/55% к скорости атаки и -8/12/16/20% получаемого урона. Боль только заводит Психа.',
    cast(){}
  },
  psihE: {
    name:'Привет сзади', short:'E', type:'self', maxLevel:4,
    cd:[0,14,13,12,11], mana:[0,90,100,110,120], range:900,
    desc:'Мгновенно появляется за спиной ближайшего врага (предпочитает героев, до 900) и наносит огромный урон под оглушительный звук. Из невидимости удар сильнее на 40%.',
    cast(h, x, y, lvl){
      const foes = foesOf(h).filter(u => Math.hypot(u.x - h.x, u.y - h.y) <= 900 && !isHiddenFrom(u, h.team));
      const hs = foes.filter(u => u.type === 'hero' && !u.isIllusion);
      const pool = hs.length ? hs : foes;
      let t = null, bd = 1e9;
      for(const u of pool){ const d = Math.hypot(u.x - h.x, u.y - h.y); if(d < bd){ bd = d; t = u; } }
      if(!t){ flashMsg(h, 'Рядом нет врагов'); return false; }
      const f = (t.facing != null && isFinite(t.facing)) ? t.facing : Math.atan2(t.y - h.y, t.x - h.x);
      const gap = t.radius + h.radius + 8;
      const ox = h.x, oy = h.y; let ambush = false;
      fxRing(h.x, h.y, 60, '#7a4bc9', 0.4); spawnParticles(h.x, h.y, '#b6ff3a', 18, 0.7);
      h.x = clamp(t.x - Math.cos(f) * gap, 60, WORLD - 60); h.y = clamp(t.y - Math.sin(f) * gap, 60, WORLD - 60);
      h.facing = Math.atan2(t.y - h.y, t.x - h.x); h.moveTarget = null; h.attackTarget = t;
      let dmg = 120 + lvl * 100 + h.getDamage() * 0.8;
      if(h.invisible && h.tribuInvisibilityTimer > 0){
        dmg *= 1.4; ambush = true; h.invisible = false; h.undetectable = false; h.tribuInvisibilityTimer = 0;
        h.buffs = h.buffs.filter(b => b.id !== 'psihHideSpd');
      }
      applyDamage(t, abilityDamage(h, dmg), h);
      fxRing(t.x, t.y, 120, '#ff3b5c', 0.5); fxBeam(h.x, h.y, t.x, t.y, '#ff3b5c', 0.3); spawnParticles(t.x, t.y, '#ff3b5c', 30, 1.1);
      addText(t.x, t.y - 60, 'ПРИВЕТ! -' + Math.round(dmg), '#ff5577', 1.2, 19);
      snd('psihStab', 1.4); snd('psihLaugh', 0.8); shakeScreen(9, 0.4); pfBlinkFx(ox, oy, h, t, ambush);
    }
  },
  psihR: {
    name:'Мы — одно целое', short:'R', type:'self', maxLevel:3, ult:true,
    cd:[0,100,85,70], mana:[0,150,200,250],
    desc:'Вокруг Психа раскрываются могилы, и из них одна за другой вылезают 6 копий на 25 секунд. Копиями нельзя управлять: они сами рыщут по карте, ищут вражеских героев (каждая выбирает свою цель) и нападают на них. Со скипетром Аганима — 8 копий.',
    cast(h, x, y, lvl){
      const n = hasScepter(h) ? 8 : 6, hp = 350 + lvl * 150, dmg = h.getDamage() * (0.4 + lvl * 0.1);
      const fast = fxLv() >= 3, base = Math.random() * TAU, graves = [];
      for(let i = 0; i < n; i++){
        /* могилы стоят по овалу вокруг Психа — копии вылезают из них по очереди */
        const a = base + i * TAU / n, rx = 150 + Math.random() * 40;
        const gx = clamp(h.x + Math.cos(a) * rx, 60, WORLD - 60), gy = clamp(h.y + Math.sin(a) * rx * 0.62, 60, WORLD - 60);
        const wait = fast ? 0 : 0.45 + i * 0.17, dur = fast ? 0.05 : PF_DUR;
        const c = new PsihClone(h, gx, gy, {
          kind:'illusion', life:25, hp, dmg, radius:h.radius, speed:h.getSpeed() * 1.12, atkRange:h.atkRange, atkTime:Math.max(0.6, h.getAttackTime()),
          armor:h.getArmor(), copyColor:h.def.color, copyDef:h.def, isIllusion:true, damageTakenMultiplier:1.5
        });
        c.level = h.level; c.cloneIndex = i; c.skinId = h.skinId; c.noPlayerControl = true; c.playerControlled = false; c.psihCloneCount = n;
        c.emerge = {t:0, wait, dur}; c.invulnerable = true; c.stunTimer = wait + dur;
        units.push(c); PF.clones.push(c);
        if(!fast) makeGrave(gx, gy, wait);
        graves.push({x:gx, y:gy, delay:wait});
      }
      addText(h.x, h.y - 90, 'МЫ — ОДНО ЦЕЛОЕ', '#b6ff3a', 1.5, 19);
      fxRing(h.x, h.y, 220, '#7a4bc9', 0.8); spawnParticles(h.x, h.y, '#b6ff3a', 40, 1.2); snd('psihLaugh', 1.2);
      pfUltFx(h, graves);
    }
  }
});

class PsihClone extends TimedSummon {
  /* копия живёт сама по себе: игрок не может ей управлять — она ищет и бьёт вражеских героев */
  nextSearchPoint(){
    const M = 500;
    this.legs = (this.legs || 0) + 1;
    if(this.legs === 1){
      /* первый заход — разбегаются веером от центра карты */
      const n = this.psihCloneCount || 6;
      const a = this.cloneIndex * TAU / n + Math.random() * 0.3, r = 1400 + Math.random() * 1700;
      return {x:clamp(WORLD / 2 + Math.cos(a) * r, M, WORLD - M), y:clamp(WORLD / 2 + Math.sin(a) * r, M, WORLD - M)};
    }
    const anc = units.find(u => u.type === 'ancient' && u.team !== this.team && !u.dead);
    if(anc && Math.random() < 0.3){
      return {x:clamp(anc.x + (Math.random() - 0.5) * 1400, M, WORLD - M), y:clamp(anc.y + (Math.random() - 0.5) * 1400, M, WORLD - M)};
    }
    return {x:M + Math.random() * (WORLD - 2 * M), y:M + Math.random() * (WORLD - 2 * M)};
  }
  updateAI(dt){
    if(this.emerge){
      /* копия ещё выбирается из могилы: стоит, неуязвима, срок жизни не тикает */
      const e = this.emerge; e.t += dt;
      this.invulnerable = true; this.stunTimer = Math.max(this.stunTimer || 0, 0.3); this.moveTarget = null; this.attackTarget = null;
      if(e.t >= e.wait + e.dur){
        this.emerge = null; this.invulnerable = false; this.stunTimer = 0;
        fxRing(this.x, this.y, 46, '#b6ff3a', 0.4); pfFinishEmerge(this);
      }
      return;
    }
    this.life -= dt;
    if(this.life <= 0){ this.dead = true; this.expired = true; return; }
    this.noPlayerControl = true; this.playerControlled = false;
    const SENSE = 1700;
    let t = this.attackTarget;
    if(t && (t.dead || isHiddenFrom(t, this.team) || this.distTo(t) > SENSE * 1.5)) t = this.attackTarget = null;
    this.rt = (this.rt || 0) - dt;
    if(!t || this.rt <= 0){
      this.rt = 0.6;
      const hs = heroes.filter(u => u.team !== this.team && u.team !== 2 && !u.dead && u.type === 'hero' && !u.isIllusion && !isHiddenFrom(u, this.team) && this.distTo(u) <= SENSE);
      let pick = null;
      if(hs.length){
        if(this.cloneIndex % 3 === 0){
          let bd = 1e9; for(const u of hs){ const d = this.distTo(u); if(d < bd){ bd = d; pick = u; } }
        } else pick = hs[this.cloneIndex % hs.length];
      } else {
        /* героев не видно — бьют всё, что попалось по пути */
        let bd = this.atkRange + 260;
        for(const u of units){
          if(u.dead || u.team === this.team || u.team === 2 || isHiddenFrom(u, this.team) || u.invulnerable) continue;
          const d = this.distTo(u); if(d < bd){ bd = d; pick = u; }
        }
      }
      this.attackTarget = pick;
    }
    if(this.attackTarget){ this.moveTarget = null; this.patrol = null; return; }
    /* поиск: идут к точкам патруля по карте */
    let w = this.patrol;
    this.patrolT = (this.patrolT || 0) + dt;
    if(!w || Math.hypot(this.x - w.x, this.y - w.y) < 160 || this.patrolT > 14){ w = this.patrol = this.nextSearchPoint(); this.patrolT = 0; }
    this.moveTarget = {x:w.x, y:w.y};
  }
}

/* пассивка W и урон */
const _ad = applyDamage;
applyDamage = function(target, amount, source){
  if(isPsih(target) && !target.dead){ const l = lvlOf(target, 'psihW'); if(l > 0) amount *= 1 - PSIH_RED[l]; }
  return _ad.call(this, target, amount, source);
};
const _t = fx973Tick;
fx973Tick = function(dt){
  _t.apply(this, arguments);
  try { pfTick(dt); } catch(err) { if(!pfTick.warned){ pfTick.warned = 1; console.warn('psih fx:', err); } }
  for(const h of heroes){
    if(h._phxT > 0){ h._phxT -= dt; if(h._phxT <= 0){ h.invulnerable = false; h._phxT = 0; } }
    if(!isPsih(h) || h.dead) continue;
    const l = lvlOf(h, 'psihW'); if(l <= 0) continue;
    let b = h.buffs.find(k => k.id === 'psihMadness');
    if(!b){ b = {type:'as', id:'psihMadness', val:PSIH_AS[l], t:1}; h.addBuff(b); } else { b.val = PSIH_AS[l]; b.t = 1; }
  }
};

/* ---------- подключение эффектов Психа к отрисовке ---------- */
const _dwd = drawWards;                       /* слой земли: рисуется до юнитов */
drawWards = function(){ _dwd.apply(this, arguments); try { pfDrawGround(); } catch(err) { if(!pfDrawGround.warned){ pfDrawGround.warned = 1; console.warn('psih ground fx:', err); } } };
{ const F = G.__fx973;                         /* верхний слой: после юнитов */
  if(F){ const _dw0 = F.drawWorld; F.drawWorld = function(){ _dw0.apply(this, arguments); try { pfDrawTop(); } catch(err) { if(!pfDrawTop.warned){ pfDrawTop.warned = 1; console.warn('psih top fx:', err); } } }; } }
const _dus = drawUnitSafely;                  /* вылезание копий из земли + аура безумия */
drawUnitSafely = function(u){
  if(u && u.emerge && !u.dead) return drawRising(this, arguments, u);
  let aura = false;
  try { aura = !!u && isPsihBody(u) && fxLv() < 2 && !isLite() && auraShown(u); } catch(err) {}
  if(aura){ ctx.save(); try { drawAuraBack(ctx, u); } catch(err) {} ctx.restore(); }
  const r = _dus.apply(this, arguments);
  if(aura){ ctx.save(); try { drawAuraFront(ctx, u); } catch(err) {} ctx.restore(); }
  return r;
};

/* ---------- регистрация героя ---------- */
const def = {
  id:'psih', name:'Псих', title:'Безумный убийца', color:'#6b3fa0', color2:'#b6ff3a',
  baseHp:700, hpPerLvl:88, baseMp:280, mpPerLvl:36, baseDmg:66, dmgPerLvl:6.5, abilityDamageScale:1, damageScale:1, speed:200,
  atkRange:150, atkTime:0.95, baseArmor:3, armorPerLvl:0.5, vision:1000, hpRegen:2, mpRegen:2,
  skills:['psihQ','psihW','psihE','psihR'],
  weapon:{type:'dualBlades', color:'#e9eef5', size:1.0, followFacing:true}
};
HERO_STAT_BALANCE.psih = [700, 88, 66, 6.5, 1];
HERO_DEFS.push(def);
ATK_STYLE.psih = {m:'slash', w:0.9};
SCEPTER_UPGRADES.psih = 'Ульта призывает 8 копий вместо 6';
HERO_TALENTS.psih = [['+250 к здоровью', {maxHp:250, hp:250}], ['+30 к урону', {damage:30}], ['+15% к скорости', {speedPercent:0.15}], ['+15 к броне', {armor:15}], ['+20% к урону способностей', {spellAmp:0.20}]];
HERO_GUIDES.psih = {
  role:'Псих: ассасин, невидимость и охота на героев',
  style:'Исчезает, заходит за спину и убивает. Пассивное безумие делает его быстрым и трудным для убийства, а ульта отправляет копии охотиться по всей карте.',
  skills:[0,1,2],
  skillNote:'Тишина в голове (Q) — невидимость. Безумие (W) — пассивно скорость атаки и снижение урона. Привет сзади (E) — телепорт за спину и огромный урон. Мы — одно целое (R) — 6 копий на 25 секунд; ими нельзя управлять, они сами ищут и бьют героев.',
  build:['pt','joelBoots','reaperScythe','satanic','phoenixFeather','bkb'],
  tips:['Активируй Q, подкрадись к герою и сразу жми E: из невидимости удар сильнее на 40%.','Копии из ульты живут сами по себе: управлять ими нельзя, они рыщут по карте и охотятся на героев — применяй ульту заранее, пока враги разбросаны.']
};
CREATOR_BUILDS.psih = {
  title:'Псих  /  Ассасин-охотник',
  categories:[
    {name:'СТАРТОВЫЙ ЗАКУП', items:[['tango','Лечение на старте.'],['joelBoots','Скорость для засад.']]},
    {name:'РАННЯЯ ИГРА', items:[['fangs','Урон в атаке и в ударе сзади.'],['evsyutin','+500 здоровья.']]},
    {name:'CORE', items:[['pt','ПТ — урон и скорость атаки.'],['reaperScythe','Коса Жнеца — урон и лечение.'],['satanic','Вампиризм и здоровье.']]},
    {name:'ПО СИТУАЦИИ / ЛЕЙТ', items:[['phoenixFeather','Неуязвимость и здоровье.'],['chronoHourglass','Стоп-время для добивания.'],['bkb','Защита от контроля.']]}
  ]
};
})();
