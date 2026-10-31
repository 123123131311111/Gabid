/* DotaSense 0.10.1.5 — АРКАНА ПСИХА «БРИЛЛИАНТОВЫЙ КОШМАР».
   Только визуал: характеристики, урон, кулдауны и радиусы не меняются. Цена (1500) продублирована в accounts.js.
   • Облик (hero3d.js, skinId 'psihArcana'): три клюва веером, сапфировая ткань, ледяные грани, бриллиантовая корона,
     кристальные крылья, вращающиеся алмазы и светящиеся кольца у ног.
   • Атака — огранённые порезы, летящие бриллианты и алмазные блики.
   • Q «Тишина в голове», E «Привет сзади», R «Мы — одно целое» и T «Бошка Ильи» — все эффекты (могилы, дым, порезы, ритуальный круг,
     душа-голова) перекрашиваются в бриллиантовую палитру и дополняются ромбовидными волнами, звёздами и осколками
     (перекраска эффектов — в update974.js и update9901.js через флаг __psihArcOn).
   • Бриллиантовая аура у ног Психа и его копий. Подключается после update0101.js. */
(function(){
'use strict';
const G = window;
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update01015 ' + tag + ':', err); } catch(e) {} } };
const FX = () => G.__psihFx;
const fxLv = () => (typeof fxl === 'function' ? fxl() : 0);
const isArc = u => { const F = FX(); return !!(F && F.isArcana(u)); };
const rr = (a, b) => a + Math.random() * (b - a);
const GEMS = ['#ffffff', '#8fe8ff', '#e8f8ff', '#c9b8ff'];

/* ---------- скин ---------- */
try {
  const def = {id:'psihArcana', arcana:true, name:'БРИЛЛИАНТОВЫЙ КОШМАР', heroId:'psih', rarity:'arcana', price:1500, accent:'#8fe8ff', border:'#c9b8ff',
    previewHero:'psih', previewColor:'#0b1a4a', previewColor2:'#e8f8ff', weaponColor:'#bfeaff',
    desc:'АРКАНА. Чумной доктор превращается в живой бриллиант: у него вырастают три клюва, ткань становится сапфировой, а клинки, корона над шляпой, кристальные крылья и вращающиеся алмазы сверкают ледяными гранями. Атака режет огранёнными порезами и сыплет бриллиантами, «Тишина в голове» растворяет Психа в алмазной дымке, «Привет сзади» оставляет кристальный след, «Бошка Ильи» превращается в бриллиантовую голову с тремя клювами, а могилы и круг из «Мы — одно целое» сияют лазурью. Не меняет характеристики.',
    hint:'Виден, когда выбран Псих.'};
  if(!SKIN_BY_ID[def.id]){ SKIN_DEFS.push(def); SKIN_BY_ID[def.id] = def; }
} catch(err) { warn('skin', err); }

Object.assign(SFX_PRESETS, {
  psihCrystal: {from:2400, to:3600, duration:0.2, type:'sine', volume:0.035, layers:[[3600, 5200, 0.03, 0.22, 'triangle', 0.025], [1200, 900, 0, 0.12, 'square', 0.015]]},
  psihCrystalBig: {from:1400, to:3000, duration:0.7, type:'sine', volume:0.06, layers:[[2800, 5600, 0.05, 0.6, 'triangle', 0.04], [180, 90, 0, 0.5, 'sine', 0.1]]}
});
const csnd = (k, x, y, v) => { try { const F = FX(); if(F) F.psnd(k, x, y, v); } catch(e) {} };

/* ---------- перекраска простых эффектов (кольца, лучи, частицы, текст), пока идёт каст героя с арканой ---------- */
function wrapColor(name, idx){
  const orig = G[name]; if(typeof orig !== 'function') return;
  G[name] = function(){
    if(G.__psihArcOn && FX() && typeof arguments[idx] === 'string'){
      const a = Array.prototype.slice.call(arguments); a[idx] = FX().recol(a[idx]); return orig.apply(this, a);
    }
    return orig.apply(this, arguments);
  };
}
try { wrapColor('fxRing', 3); wrapColor('fxBeam', 4); wrapColor('fxHit', 2); wrapColor('spawnParticles', 2); wrapColor('addText', 3); wrapColor('fxMark', 3); } catch(err) { warn('recolor', err); }

/* ---------- мелкие бриллиантовые эффекты ---------- */
function gems(x, y, n, o){
  const F = FX(); if(!F || fxLv() >= 3) return; o = o || {}; n = F.nOf(n);
  for(let i = 0; i < n; i++){
    const a = Math.random() * Math.PI * 2, sp = rr(o.s0 || 60, o.s1 || 200);
    F.pfAdd({k:'gem', minor:true, x:x + Math.cos(a) * 6, y:y + Math.sin(a) * 4, z:o.z0 == null ? 20 : o.z0, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp * 0.5,
      vz:rr(o.v0 || 100, o.v1 || 260), g:o.g || 520, size:rr(o.sz0 || 3, o.sz1 || 6.5), col:GEMS[i % GEMS.length], rot:Math.random() * 6.28, vr:rr(-8, 8), life:rr(0.7, 1.2)});
  }
}
function stars(x, y, n, spread, size){
  const F = FX(); if(!F || fxLv() >= 3) return;
  for(let i = 0; i < F.nOf(n); i++)
    F.pfAdd({k:'star', minor:true, x:x + rr(-spread, spread), y:y + rr(-spread * 0.5, spread * 0.5), z:rr(10, 60), size:rr(size * 0.6, size), col:i % 2 ? '#ffffff' : '#8fe8ff', life:rr(0.35, 0.7), delay:rr(0, 0.25)});
}
function prism(x, y, r0, r1, life, o){
  const F = FX(); if(!F) return;
  F.pfAdd(Object.assign({k:'prism', x, y, r0, r1, life, spin:0.6}, o || {}));
}

/* ---------- скиллы ---------- */
function arcCast(id, extra){
  const sk = SKILLS[id]; if(!sk || typeof sk.cast !== 'function') return;
  const orig = sk.cast;
  sk.cast = function(h, x, y, lvl){
    if(!isArc(h)) return orig.apply(this, arguments);
    const pre = {x:h.x, y:h.y}, prev = G.__psihArcOn; let res;
    G.__psihArcOn = true;
    try { res = orig.apply(this, arguments); } finally { G.__psihArcOn = prev; }
    if(res !== false){ try { extra(h, pre, lvl); } catch(err) { warn(id, err); } }
    return res;
  };
}
arcCast('psihQ', (h, pre) => {                       /* Тишина в голове: алмазная дымка */
  prism(h.x, h.y + 6, 24, 120, 0.7); gems(h.x, h.y - 20, 12, {s0:40, s1:150}); stars(h.x, h.y - 30, 6, 40, 16);
  csnd('psihCrystalBig', h.x, h.y, 0.8);
});
arcCast('psihE', (h, pre) => {                       /* Привет сзади: кристальный след и ромбовидная волна у жертвы */
  const t = h.attackTarget;
  prism(pre.x, pre.y + 4, 20, 90, 0.5); gems(pre.x, pre.y - 20, 8, {s0:40, s1:130});
  if(t){
    prism(t.x, t.y + 4, 30, 150, 0.6, {spin:-0.9}); prism(t.x, t.y + 4, 14, 90, 0.45, {delay:0.08});
    gems(t.x, t.y - 24, 18, {s0:80, s1:280, v0:120, v1:320}); stars(t.x, t.y - 36, 8, 46, 20);
    const F = FX(); if(F) F.pfAdd({k:'pillar', x:t.x, y:t.y + 4, w:22, h:200, col:'200,240,255', life:0.55});
  }
  csnd('psihCrystalBig', h.x, h.y, 1.0);
});
arcCast('psihR', (h) => {                            /* Мы — одно целое: бриллиантовый круг и дождь осколков */
  prism(h.x, h.y + 8, 40, 290, 1.1); prism(h.x, h.y + 8, 20, 200, 0.9, {delay:0.15, spin:-0.7});
  gems(h.x, h.y - 30, 36, {s0:80, s1:360, v0:140, v1:360, sz0:3.5, sz1:8}); stars(h.x, h.y - 40, 14, 120, 24);
  csnd('psihCrystalBig', h.x, h.y, 1.3);
});
arcCast('psihT', (h) => {                            /* Бошка Ильи: бриллиантовая голова вылетает */
  prism(h.x, h.y + 4, 18, 80, 0.5); gems(h.x, h.y - 40, 10, {s0:40, s1:140, v0:150, v1:300}); stars(h.x, h.y - 50, 5, 30, 14);
  csnd('psihCrystal', h.x, h.y, 1.0);
});

/* ---------- атака ---------- */
if(typeof atkMeleeSwing === 'function'){
  const _sw = atkMeleeSwing;
  atkMeleeSwing = function(owner, target){
    const r = _sw.apply(this, arguments);
    try {
      if(!target || fxLv() >= 3 || !isArc(owner)) return r;
      const now = typeof gameTime === 'number' ? gameTime : 0;
      if(owner.__psArcT != null && now - owner.__psArcT < 0.12) return r;
      owner.__psArcT = now;
      if(owner.team !== 0 && typeof isVisibleToPlayer === 'function' && !isVisibleToPlayer(owner)) return r;
      const F = FX(), a = Math.atan2(target.y - owner.y, target.x - owner.x), lite = fxLv() >= 2 || (typeof perfLite === 'function' && perfLite());
      F.pfAdd({k:'slash', minor:true, x:target.x, y:target.y - 26, c:'#e8f8ff', life:0.36, s:[
        {a:a + 1.1 + rr(-0.15, 0.15), L:84, w:4, bend:12, d:0}, {a:a - 1.1 + rr(-0.15, 0.15), L:76, w:4, bend:-12, d:0.06}]});
      if(!lite){ gems(target.x, target.y - 22, 4, {s0:40, s1:150, v0:80, v1:200}); stars(target.x, target.y - 30, 1, 10, 16); }
      fxRing(target.x, target.y, 34, '#8fe8ff', 0.25);
      if(!owner.__psArcS || now - owner.__psArcS > 0.35){ owner.__psArcS = now; csnd('psihCrystal', target.x, target.y, 0.7); }
    } catch(err) { warn('attack', err); }
    return r;
  };
}

/* ---------- аура у ног (вызывается из game.js вместе с аурами других арканах) ---------- */
G.drawPsihArcanaAura = function(u){
  try {
    if(!isArc(u) || u.dead) return;
    const base = u.radius + 8, tm = (typeof gameTime === 'number' ? gameTime : 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'miter';
    ctx.translate(0, 8); ctx.scale(1, 0.62);
    for(let k = 0; k < 2; k++){                          /* два встречно вращающихся ромба-контура */
      const r = (base + 6 + k * 9) / 1.414, dir = k ? -1 : 1;
      ctx.save(); ctx.rotate(Math.PI / 4 + tm * 0.7 * dir);
      ctx.strokeStyle = k ? '#e8f8ff' : '#8fe8ff'; ctx.shadowColor = '#5ad0ff'; ctx.shadowBlur = 14;
      ctx.globalAlpha = 0.75; ctx.lineWidth = 2.4; ctx.strokeRect(-r, -r, r * 2, r * 2);
      ctx.restore();
    }
    ctx.shadowBlur = 10;
    for(let i = 0; i < 7; i++){                          /* орбитальные бриллианты */
      const a = i / 7 * Math.PI * 2 - tm * 1.1, fl = 0.5 + 0.5 * Math.sin(tm * 7 + i * 1.7), rad = base + 16;
      const px = Math.cos(a) * rad, py = Math.sin(a) * rad, s = 3.2 + fl * 2.6;
      ctx.globalAlpha = 0.5 + fl * 0.5; ctx.fillStyle = i % 3 === 2 ? '#c9b8ff' : (i % 2 ? '#ffffff' : '#8fe8ff'); ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath(); ctx.moveTo(px, py - s * 1.5); ctx.lineTo(px + s, py); ctx.lineTo(px, py + s * 1.5); ctx.lineTo(px - s, py); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  } catch(err) { warn('aura', err); }
};
})();
