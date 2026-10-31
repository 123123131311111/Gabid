/* DotaSense 0.9.9.0.1 — «БОШКА ИЛЬИ».
   • Псих получил пятый навык «Бошка Ильи» (клавиша T): красная голова с глазами летит во врага, а на экране
     появляется кнопка телепорта к этой цели.
   • Два новых особых предмета: «Око Бездны» и «Плащ Тихого Часа».
   Баланс: Васпассир +12%, Олекс +14% — правки внесены прямо в game.js (VASP_BOOST / OLEX_BOOST).
   Подключается поверх game.js и update974.js (Псих), по образцу остальных update-файлов. */
(function(){
'use strict';
const G = window, TAU = Math.PI * 2;
const isPsih = h => !!(h && h.def && h.def.id === 'psih');
const foesOf = h => units.filter(u => !u.dead && u.team !== h.team && u.team !== 2 && !isBuilding(u) && !isStructure(u) && !u.invulnerable);
const snd = (k, v) => { try { playSynthSfx(k, {volume: v == null ? 1 : v}); } catch(e) {} };
const fxLv = () => (typeof fxl === 'function' ? fxl() : 0);
const al = v => Math.max(0, Math.min(1, v)).toFixed(3);

/* звуки новых предметов и головы */
Object.assign(SFX_PRESETS, {
  headThrow: {from:260, to:900, duration:0.35, type:'sawtooth', volume:0.07, noise:0.35, layers:[[130,420,0,0.3,'triangle',0.05]]},
  headHit:   {from:900, to:80, duration:0.35, type:'square', volume:0.08, noise:0.8, layers:[[60,30,0,0.4,'sine',0.14]]},
  abyssEye:  {from:140, to:40, duration:0.8, type:'sawtooth', volume:0.09, noise:0.6, layers:[[900,120,0,0.5,'triangle',0.05],[50,24,0,0.9,'sine',0.18]]},
  hushCloak: {from:700, to:140, duration:0.5, type:'sine', volume:0.05, noise:0.25, layers:[[1200,300,0,0.4,'triangle',0.04]]}
});

/* ======================================================================
   БОШКА ИЛЬИ — пятый навык Психа
   ====================================================================== */
const HEAD_RANGE = 1150;                     /* дальность поиска цели */
const HEAD_SPEED = 1300;                     /* скорость полёта */
const HEAD_RISE = 0.4;                       /* сколько голова взлетает вверх до броска */
const HEAD_DMG = [0, 120, 180, 240];
const HEAD_MARK = [0, 6, 7, 8];              /* сколько секунд после попадания можно телепортироваться */
const PH = {heads: []};
const headOf = h => PH.heads.find(k => k.owner === h && !k.dead) || null;
const skillOf = h => h && h.skills && h.skills.find(s => s.id === 'psihT');

function headEnd(hd, silent){
  if(hd.dead) return;
  hd.dead = true;
  const h = hd.owner, s = skillOf(h);
  /* настоящая перезарядка начинается, когда голова исчезла без телепорта */
  if(s && !hd.teleported) s.cd = Math.max(s.cd || 0, SKILLS.psihT.cd[Math.max(1, hd.lvl)] * (hd.cdMult || 1));
  if(!silent){
    spawnParticles(hd.x, hd.y - hd.z, '#ff4d5e', 16, 0.8);
    fxRing(hd.x, hd.y, 50, '#ff4d5e', 0.35);
  }
}

function pickHeadTarget(h, aimX, aimY){
  const dir = Math.atan2(aimY - h.y, aimX - h.x);
  const inRange = u => Math.hypot(u.x - h.x, u.y - h.y) <= HEAD_RANGE && !isHiddenFrom(u, h.team);
  const heroesIn = heroes.filter(u => !u.dead && u.type === 'hero' && !u.isIllusion && u.team !== h.team && u.team !== 2 && !u.invulnerable && inRange(u));
  const angDiff = u => { let d = Math.atan2(u.y - h.y, u.x - h.x) - dir; while(d > Math.PI) d -= TAU; while(d < -Math.PI) d += TAU; return Math.abs(d); };
  const nearAim = u => Math.hypot(u.x - aimX, u.y - aimY);
  /* 1) вражеский герой в той стороне, куда целился игрок (ближайший к курсору) */
  let best = null, bd = 1e9;
  for(const u of heroesIn){ if(angDiff(u) > 0.95 && nearAim(u) > 320) continue; const d = nearAim(u); if(d < bd){ bd = d; best = u; } }
  if(best) return best;
  /* 2) любой вражеский герой в зоне досягаемости */
  bd = 1e9;
  for(const u of heroesIn){ const d = Math.hypot(u.x - h.x, u.y - h.y); if(d < bd){ bd = d; best = u; } }
  if(best) return best;
  /* 3) ближайший враг-не герой рядом с курсором */
  bd = 1e9;
  for(const u of foesOf(h)){
    if(!inRange(u) || u.type === 'hero') continue;
    if(Math.hypot(u.x - h.x, u.y - h.y) > 760) continue;
    const d = nearAim(u); if(d < bd){ bd = d; best = u; }
  }
  return best;
}

function headTeleport(h, hd){
  const t = hd.target;
  if(!t || t.dead){ headEnd(hd, true); return false; }
  const f = (t.facing != null && isFinite(t.facing)) ? t.facing : Math.atan2(t.y - h.y, t.x - h.x);
  const gap = t.radius + h.radius + 8, ox = h.x, oy = h.y;
  fxRing(ox, oy, 70, '#ff4d5e', 0.45); spawnParticles(ox, oy, '#ff4d5e', 22, 0.9);
  fxBeam(ox, oy, t.x, t.y, '#ff7a88', 0.3);
  h.x = clamp(t.x - Math.cos(f) * gap, 60, WORLD - 60);
  h.y = clamp(t.y - Math.sin(f) * gap, 60, WORLD - 60);
  h.facing = Math.atan2(t.y - h.y, t.x - h.x);
  h.moveTarget = null; h.attackTarget = t;
  fxRing(h.x, h.y, 90, '#b6ff3a', 0.5); spawnParticles(h.x, h.y, '#b6ff3a', 22, 0.9);
  addText(h.x, h.y - 78, 'К ИЛЬЕ!', '#ff7a88', 1.0, 17);
  snd('psihStab', 1.0); snd('psihVanish', 0.8);
  hd.teleported = true;
  headEnd(hd, true);
  return true;
}

{
  const _he = headEnd, _ht = headTeleport;
  headEnd = function(hd){ const p = G.__psihArcOn; G.__psihArcOn = isArcH(hd && hd.owner); try { return _he.apply(this, arguments); } finally { G.__psihArcOn = p; } };
  headTeleport = function(h){ const p = G.__psihArcOn; G.__psihArcOn = isArcH(h); try { return _ht.apply(this, arguments); } finally { G.__psihArcOn = p; } };
}
Object.assign(SKILLS, {
  psihT: {
    name:'Бошка Ильи', short:'T', type:'point', maxLevel:3, range:HEAD_RANGE,
    cd:[0,26,22,18], mana:[0,90,100,110],
    /* повторное нажатие T, пока голова держит метку, бесплатно */
    freeWhen(h){ const hd = headOf(h); return !!(hd && hd.phase === 'marked'); },
    desc:'Псих подбрасывает вверх красную голову с глазами — она летит в ближайшего врага в выбранной стороне (сначала в героя) и бьёт: 120/180/240 магического урона. Пока голова сидит на цели (6/7/8 сек.), на экране горит кнопка телепорта: нажмите T ещё раз (или кликните по кнопке) — Псих мгновенно окажется за спиной этого врага. Повторное нажатие бесплатно, перезарядка начинается после телепорта или исчезновения головы.',
    afterCast(h, s, slot, cdMult){
      const hd = headOf(h);
      if(hd && !hd.teleported){ hd.cdMult = cdMult || 1; s.cd = 0.4; }
    },
    cast(h, x, y, lvl){
      const cur = headOf(h);
      if(cur){
        if(cur.phase === 'marked') return headTeleport(h, cur);
        flashMsg(h, 'Голова ещё летит');
        return false;
      }
      let dir = Math.atan2(y - h.y, x - h.x);
      if(!Number.isFinite(dir)) dir = h.facing || 0;
      h.facing = dir;
      PH.heads.push({owner:h, team:h.team, lvl, x:h.x, y:h.y, z:0, phase:'rise', t:0, dir, aimX:x, aimY:y, target:null,
        markT:0, markMax:HEAD_MARK[lvl] || 6, dead:false, teleported:false, cdMult:1, trail:[], travelled:0, seed:Math.random() * 10});
      fxRing(h.x, h.y, 60, '#ff4d5e', 0.4); spawnParticles(h.x, h.y, '#ff4d5e', 14, 0.7);
      addText(h.x, h.y - 78, 'БОШКА ИЛЬИ', '#ff7a88', 1.1, 17);
      snd('headThrow', 0.9); snd('psihLaugh', 0.5);
      return true;
    }
  }
});

function headTick(dt){
  for(const hd of PH.heads){
    if(hd.dead) continue;
    const h = hd.owner;
    G.__psihArcOn = isArcH(h);          /* 0.10.1.5: аркана — бриллиантовые эффекты головы */
    /* новый матч / герой исчез из игры */
    if(!heroes.includes(h)){ hd.dead = true; continue; }
    if(h.dead){ headEnd(hd, true); continue; }
    hd.t += dt;
    hd.spin = (hd.spin || 0) + dt * (hd.phase === 'fly' ? 14 : 5);
    if(hd.phase === 'rise'){
      /* голову подбрасывает вверх над героем */
      hd.x = h.x; hd.y = h.y;
      hd.z = Math.sin(Math.min(1, hd.t / HEAD_RISE) * Math.PI * 0.5) * 120;
      if(hd.t >= HEAD_RISE){
        hd.target = pickHeadTarget(h, hd.aimX, hd.aimY);
        hd.phase = 'fly';
        if(hd.target) addText(hd.x, hd.y - 120, '!', '#ff4d5e', 0.5, 20);
      }
    } else if(hd.phase === 'fly'){
      let tx, ty;
      const t = hd.target;
      if(t){
        if(t.dead || isHiddenFrom(t, h.team)){ headEnd(hd); continue; }
        tx = t.x; ty = t.y;
      } else {
        tx = hd.x + Math.cos(hd.dir) * 400; ty = hd.y + Math.sin(hd.dir) * 400;
      }
      const dx = tx - hd.x, dy = ty - hd.y, dist = Math.hypot(dx, dy) || 1;
      const step = HEAD_SPEED * dt;
      hd.z += ((t ? 70 : 40) - hd.z) * Math.min(1, dt * 6);
      if(t && dist <= step + t.radius){
        /* попадание: урон и метка */
        hd.x = t.x; hd.y = t.y;
        applyDamage(t, abilityDamage(h, HEAD_DMG[Math.max(1, hd.lvl)] || 120), h);
        fxRing(t.x, t.y, 90, '#ff4d5e', 0.45); fxHit(t.x, t.y, '#ff4d5e'); spawnParticles(t.x, t.y, '#ff4d5e', 24, 1.0);
        addText(t.x, t.y - t.radius - 46, 'ГОЛОВА!', '#ff7a88', 1.0, 17);
        snd('headHit', 1.0);
        if(t.dead){ headEnd(hd); continue; }
        hd.phase = 'marked'; hd.markT = 0;
        const s = skillOf(h); if(s) s.cd = 0.4;
        continue;
      }
      hd.x += dx / dist * step; hd.y += dy / dist * step;
      hd.travelled += step;
      if(!t && hd.travelled > HEAD_RANGE){ headEnd(hd); continue; }
      if(fxLv() < 3){ hd.trail.push({x:hd.x, y:hd.y - hd.z, t:0}); if(hd.trail.length > 10) hd.trail.shift(); }
    } else if(hd.phase === 'marked'){
      const t = hd.target;
      hd.markT += dt;
      if(!t || t.dead || hd.markT >= hd.markMax){ headEnd(hd); continue; }
      hd.x = t.x; hd.y = t.y; hd.z = t.radius * 2.2 + 26 + Math.sin(hd.markT * 5) * 6;
    }
    for(const p of hd.trail) p.t += dt;
  }
  G.__psihArcOn = false;
  PH.heads = PH.heads.filter(k => !k.dead);
}

/* ---------- 0.10.1.5: аркана Психа — голова превращается в бриллиант с тремя клювами ---------- */
const isArcH = h => !!(h && h.def && h.def.id === 'psih' && String(h.skinId || '').split('+')[0] === 'psihArcana');
function drawHeadArc(hd){
  const g = ctx, tm = gameTime, R = 22;
  g.save();
  g.fillStyle = 'rgba(0,10,40,' + al(0.3 - hd.z / 600) + ')';
  g.beginPath(); g.ellipse(hd.x, hd.y + 6, R * 0.9, R * 0.35, 0, 0, TAU); g.fill();
  if(hd.phase === 'fly'){
    g.globalCompositeOperation = 'lighter';
    for(let i = 0; i < hd.trail.length; i++){
      const p = hd.trail[i], k = (i + 1) / hd.trail.length, sz = R * 0.7 * k;
      g.fillStyle = (i % 2 ? 'rgba(232,248,255,' : 'rgba(143,232,255,') + al(0.4 * k * (1 - p.t * 2.5)) + ')';
      g.beginPath(); g.moveTo(p.x, p.y - sz); g.lineTo(p.x + sz * 0.6, p.y); g.lineTo(p.x, p.y + sz); g.lineTo(p.x - sz * 0.6, p.y); g.closePath(); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }
  g.translate(hd.x, hd.y - hd.z);
  g.rotate(hd.phase === 'marked' ? Math.sin(tm * 6) * 0.1 : Math.sin(hd.spin) * 0.3);
  g.shadowColor = '#5ad0ff'; g.shadowBlur = 24;
  /* три клюва веером */
  const fan = [[-0.75, 0.8], [0, 1], [0.75, 0.8]];
  for(const f of fan){
    const a = Math.PI / 2 + f[0] * 0.55 + 0.0, L = R * 1.35 * f[1], bw = R * 0.34 * f[1];
    g.save(); g.rotate(f[0] * 0.55); g.fillStyle = '#bfeaff'; g.strokeStyle = '#ffffff'; g.lineWidth = 1.4;
    g.beginPath(); g.moveTo(-bw, R * 0.55); g.lineTo(0, R * 0.55 + L); g.lineTo(bw, R * 0.55); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.moveTo(0, R * 0.55); g.lineTo(0, R * 0.55 + L); g.lineTo(bw, R * 0.55); g.closePath(); g.fill();
    g.restore();
  }
  /* огранённый бриллиант-череп */
  const gr = g.createLinearGradient(-R, -R * 1.2, R, R);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#8fe8ff'); gr.addColorStop(1, '#3a7ad8');
  g.fillStyle = gr; g.strokeStyle = '#ffffff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -R * 1.25); g.lineTo(R * 0.95, -R * 0.35); g.lineTo(R * 0.7, R * 0.7); g.lineTo(0, R * 0.95); g.lineTo(-R * 0.7, R * 0.7); g.lineTo(-R * 0.95, -R * 0.35); g.closePath(); g.fill(); g.stroke();
  g.shadowBlur = 0; g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(-R * 0.95, -R * 0.35); g.lineTo(R * 0.95, -R * 0.35); g.moveTo(0, -R * 1.25); g.lineTo(-R * 0.3, -R * 0.35); g.lineTo(0, R * 0.95); g.moveTo(0, -R * 1.25); g.lineTo(R * 0.3, -R * 0.35); g.lineTo(0, R * 0.95); g.stroke();
  /* глаза-огни, смотрят на цель */
  let lookX, lookY;
  if(hd.target && !hd.target.dead){ const a = Math.atan2(hd.target.y - hd.y, hd.target.x - hd.x); lookX = Math.cos(a) * 3; lookY = Math.sin(a) * 2; }
  else { lookX = Math.cos(hd.dir) * 3; lookY = Math.sin(hd.dir) * 2; }
  g.globalCompositeOperation = 'lighter';
  for(const ex of [-7.5, 7.5]){
    g.fillStyle = 'rgba(90,208,255,.55)'; g.beginPath(); g.arc(ex + lookX, 0 + lookY, 8, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex + lookX, 0 + lookY, 3.6, 0, TAU); g.fill();
  }
  g.restore();
}

/* ---------- отрисовка головы (мировые координаты) ---------- */
function drawHeadSprite(hd){
  if(isArcH(hd.owner)) return drawHeadArc(hd);
  const g = ctx, tm = gameTime, R = 22;
  const gx = hd.x, gy = hd.y;
  g.save();
  /* тень на земле */
  g.fillStyle = 'rgba(0,0,0,' + al(0.28 - hd.z / 600) + ')';
  g.beginPath(); g.ellipse(gx, gy + 6, R * 0.9, R * 0.35, 0, 0, TAU); g.fill();
  /* след */
  if(hd.phase === 'fly'){
    for(let i = 0; i < hd.trail.length; i++){
      const p = hd.trail[i], k = (i + 1) / hd.trail.length;
      g.fillStyle = 'rgba(255,60,80,' + al(0.35 * k * (1 - p.t * 2.5)) + ')';
      g.beginPath(); g.arc(p.x, p.y, R * 0.8 * k, 0, TAU); g.fill();
    }
  }
  g.translate(gx, gy - hd.z);
  const wob = hd.phase === 'marked' ? Math.sin(tm * 6) * 0.12 : Math.sin(hd.spin) * 0.35;
  g.rotate(wob);
  g.shadowColor = '#ff2a3d'; g.shadowBlur = 20;
  /* голова */
  const gr = g.createRadialGradient(-R * 0.3, -R * 0.35, 3, 0, 0, R * 1.2);
  gr.addColorStop(0, '#ff8a8a'); gr.addColorStop(0.55, '#e0202f'); gr.addColorStop(1, '#7a0a14');
  g.fillStyle = gr; g.strokeStyle = '#ffc2c8'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(0, 0, R * 0.95, R * 1.08, 0, 0, TAU); g.fill(); g.stroke();
  /* торчащие волосы */
  g.shadowBlur = 0; g.strokeStyle = '#ffd9dc'; g.lineWidth = 2.4; g.lineCap = 'round';
  for(let i = -3; i <= 3; i++){
    g.beginPath(); g.moveTo(i * 5, -R * 0.95);
    g.lineTo(i * 7 + Math.sin(tm * 9 + i) * 2, -R * 1.45 - Math.abs(i) * -2);
    g.stroke();
  }
  /* глаза: смотрят на цель */
  let lookX = 0, lookY = 0;
  if(hd.target && !hd.target.dead){ const a = Math.atan2(hd.target.y - hd.y, hd.target.x - hd.x); lookX = Math.cos(a) * 3.4; lookY = Math.sin(a) * 2.4; }
  else { lookX = Math.cos(hd.dir) * 3.4; lookY = Math.sin(hd.dir) * 2.4; }
  for(const ex of [-8.5, 8.5]){
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ex, -3, 7.2, 8.2, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(200,20,40,.75)'; g.lineWidth = 1;                       /* красные прожилки */
    for(let v = 0; v < 4; v++){ const a = v * 1.6 + ex; g.beginPath(); g.moveTo(ex + Math.cos(a) * 7, -3 + Math.sin(a) * 8); g.lineTo(ex + Math.cos(a) * 3.6, -3 + Math.sin(a) * 4); g.stroke(); }
    g.fillStyle = '#16050a'; g.beginPath(); g.arc(ex + lookX, -3 + lookY, 3.4, 0, TAU); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.arc(ex + lookX - 1, -4 + lookY, 1, 0, TAU); g.fill();
  }
  /* злая бровь и оскал */
  g.strokeStyle = '#3a0509'; g.lineWidth = 2.6;
  g.beginPath(); g.moveTo(-15, -13); g.lineTo(-3, -8); g.moveTo(15, -13); g.lineTo(3, -8); g.stroke();
  g.fillStyle = '#2a0308'; g.beginPath(); g.ellipse(0, 12, 10, 5.5, 0, 0, TAU); g.fill();
  g.fillStyle = '#fff'; for(let i = -2; i <= 2; i++){ g.fillRect(i * 3.6 - 1.2, 8.6, 2.4, 3.2); }
  g.restore();
}

function drawHeadsWorld(){
  for(const hd of PH.heads){
    if(hd.dead) continue;
    try {
      /* нить от Психа к голове, пока она сидит на цели */
      if(hd.phase === 'marked' && hd.owner && !hd.owner.dead){
        ctx.save(); ctx.strokeStyle = (isArcH(hd.owner) ? 'rgba(143,232,255,' : 'rgba(255,77,94,') + al(0.25 + 0.15 * Math.sin(gameTime * 8)) + ')'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -gameTime * 40;
        ctx.beginPath(); ctx.moveTo(hd.owner.x, hd.owner.y); ctx.lineTo(hd.x, hd.y); ctx.stroke(); ctx.restore();
        /* красное кольцо метки на цели */
        ctx.save(); ctx.strokeStyle = (isArcH(hd.owner) ? 'rgba(232,248,255,' : 'rgba(255,60,80,') + al(0.6 + 0.3 * Math.sin(gameTime * 7)) + ')'; ctx.lineWidth = 2.5;
        const rr = (hd.target ? hd.target.radius : 24) + 16 + Math.sin(gameTime * 5) * 3;
        ctx.beginPath(); ctx.ellipse(hd.x, hd.y + 4, rr, rr * 0.5, 0, 0, TAU); ctx.stroke(); ctx.restore();
      }
      drawHeadSprite(hd);
    } catch(err) { if(!drawHeadsWorld.warned){ drawHeadsWorld.warned = 1; console.warn('psih head fx:', err); } }
  }
}

/* ---------- экранная кнопка телепорта ---------- */
let tpBtn = null;
function activeMark(){
  if(typeof playerHero === 'undefined' || !playerHero || playerHero.dead || !isPsih(playerHero)) return null;
  const hd = headOf(playerHero);
  return (hd && hd.phase === 'marked' && hd.target && !hd.target.dead) ? hd : null;
}
function drawTeleportButton(){
  tpBtn = null;
  if(typeof gameState === 'undefined' || gameState !== 'playing') return;
  const hd = activeMark(); if(!hd) return;
  const r0 = (typeof skillBarRect === 'function') ? skillBarRect(0) : {x:VW / 2 - 200, y:VH - 100, w:60, h:60};
  const w = 300, h = 54, x = Math.max(8, Math.min(VW - w - 8, VW / 2 - w / 2)), y = Math.max(8, r0.y - h - 22);
  tpBtn = {x, y, w, h};
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 160);
  const left = Math.max(0, hd.markMax - hd.markT), k = left / hd.markMax;
  const name = (hd.target.def && hd.target.def.name) || 'цели';
  ctx.save();
  ctx.shadowColor = '#ff4d5e'; ctx.shadowBlur = 14 + pulse * 10;
  ctx.fillStyle = 'rgba(40,6,12,0.92)'; ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,' + Math.round(70 + pulse * 70) + ',90,1)'; ctx.lineWidth = 2.5; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  /* «клавиша» T */
  ctx.fillStyle = '#ff4d5e'; ctx.fillRect(x + 9, y + 9, 36, 36);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('T', x + 27, y + 28);
  ctx.textAlign = 'left'; ctx.fillStyle = '#ffe3e6'; ctx.font = 'bold 16px Segoe UI, Arial';
  ctx.fillText('ТЕЛЕПОРТ К ЦЕЛИ', x + 56, y + 20);
  ctx.fillStyle = '#ff9aa6'; ctx.font = '12px Segoe UI, Arial';
  ctx.fillText(name + '  •  ещё ' + left.toFixed(1) + ' с', x + 56, y + 38);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x + 6, y + h - 6, w - 12, 3);
  ctx.fillStyle = '#ff4d5e'; ctx.fillRect(x + 6, y + h - 6, (w - 12) * k, 3);
  ctx.restore();
}
function pressTeleportButton(){
  const hero = playerHero; if(!hero) return;
  const slot = hero.skills.findIndex(s => s.id === 'psihT');
  if(slot < 0) return;
  castSkill(hero, slot, hero.x, hero.y);
}
function overButton(clientX, clientY){
  if(!tpBtn || !activeMark()) return false;
  const r = canvas.getBoundingClientRect(), mx = clientX - r.left, my = clientY - r.top;
  return mx >= tpBtn.x && mx <= tpBtn.x + tpBtn.w && my >= tpBtn.y && my <= tpBtn.y + tpBtn.h;
}
window.addEventListener('mousedown', e => {
  if(e.button !== 0 || !overButton(e.clientX, e.clientY)) return;
  e.stopImmediatePropagation(); e.preventDefault(); pressTeleportButton();
}, true);
window.addEventListener('touchstart', e => {
  const t = e.touches && e.touches[0]; if(!t || !overButton(t.clientX, t.clientY)) return;
  e.stopImmediatePropagation(); e.preventDefault(); pressTeleportButton();
}, {capture:true, passive:false});

/* ---------- подключение к тику и отрисовке ---------- */
const _tick = fx973Tick;
fx973Tick = function(dt){
  _tick.apply(this, arguments);
  try { headTick(dt); } catch(err) { if(!headTick.warned){ headTick.warned = 1; console.warn('psih head:', err); } }
};
{ const F = G.__fx973;
  if(F){ const _dw = F.drawWorld; F.drawWorld = function(){ _dw.apply(this, arguments); drawHeadsWorld(); }; }
  else { const _dwd = drawWards; drawWards = function(){ _dwd.apply(this, arguments); drawHeadsWorld(); }; } }
const _hud = drawHUD;
drawHUD = function(){
  const r = _hud.apply(this, arguments);
  try { drawTeleportButton(); } catch(err) { if(!drawTeleportButton.warned){ drawTeleportButton.warned = 1; console.warn('psih tp button:', err); } }
  return r;
};

/* ---------- Псих получает пятый навык ---------- */
const psihDef = HERO_DEFS.find(d => d.id === 'psih');
if(psihDef && !psihDef.skills.includes('psihT')) psihDef.skills.push('psihT');
if(typeof HERO_GUIDES !== 'undefined' && HERO_GUIDES.psih){
  const gd = HERO_GUIDES.psih;
  gd.skills = [0, 1, 2, 4];
  gd.skillNote += ' Бошка Ильи (T) — красная голова летит во врага и бьёт, а на экране появляется кнопка: нажми T ещё раз, и Псих телепортируется к этой цели.';
  gd.tips = (gd.tips || []).concat(['Бошка Ильи: после попадания у тебя есть 6–8 секунд, чтобы нажать T и оказаться за спиной цели — сочетай с Q и E.']);
}

/* ======================================================================
   ДВА НОВЫХ ОСОБЫХ ПРЕДМЕТА (вкладка «ОСОБЫЕ»)
   Пассивные бонусы берутся через общий механизм newItemStat (NEW_RECIPE_ITEM_IDS):
   урон, скорость атаки, скорость передвижения, регенерация и снижение урона атак.
   ====================================================================== */
const NEW_ITEMS = {
  abyssEye: {name:'Око Бездны', icon:'◉', cost:3400, color:'#ff4d6d', active:true, manaCost:90, cooldown:26,
    damage:160, attackSpeedBonus:0.25, radius:520, blastDamage:300, slow:0.5, slowTime:3,
    desc:'Пассивно: +160 к урону атак и +25% к скорости атаки. Активный «Взгляд Бездны»: враги в радиусе 520 получают 300 магического урона и замедляются на 50% на 3 сек. КД 26 сек.'},
  hushCloak: {name:'Плащ Тихого Часа', icon:'☾', cost:2900, color:'#8aa7ff', active:true, manaCost:70, cooldown:34,
    hp:700, speed:50, hpRegen:10, attackResist:0.12, invisTime:5, haste:0.30,
    desc:'Пассивно: +700 к здоровью, +50 к скорости передвижения, +10 к восстановлению здоровья в секунду и −12% к урону от обычных атак. Активный «Тихий час»: снимает оглушение и замедление, на 5 сек. делает героя невидимым (первая атака раскрывает) и ускоряет его на 30%. КД 34 сек.'}
};
for(const id in NEW_ITEMS){
  SHOP_ITEMS[id] = NEW_ITEMS[id];
  if(!SHOP_ITEM_IDS.includes(id)) SHOP_ITEM_IDS.push(id);
  SHOP_CATEGORY_OF[id] = 4;
  SHOP_ITEM_VIEWS.push({...NEW_ITEMS[id], id});
  NULLIFY_BLOCKED_ITEMS.add(id);
  if(!NEW_RECIPE_ITEM_IDS.includes(id)) NEW_RECIPE_ITEM_IDS.push(id);
}
shopViewById = null;

const ITEM_USE = {
  abyssEye(h, item){
    const c = SHOP_ITEMS.abyssEye; let n = 0;
    for(const u of foesOf(h)){
      if(Math.hypot(u.x - h.x, u.y - h.y) > c.radius + (u.radius || 0)) continue;
      applyDamage(u, c.blastDamage, {team:h.team, source:h, magic:true}); n++;
      if(!u.dead){ u.slow = Math.max(u.slowT > 0 ? u.slow : 0, c.slow); u.slowT = Math.max(u.slowT || 0, c.slowTime); }
      fxHit(u.x, u.y, '#ff4d6d');
    }
    item.cooldown = c.cooldown;
    fxRing(h.x, h.y, c.radius, '#ff4d6d', 0.8); fxRing(h.x, h.y, c.radius * 0.55, '#ffd0d8', 0.5);
    spawnParticles(h.x, h.y, '#ff4d6d', 36, 1.2);
    addText(h.x, h.y - 70, 'ВЗГЛЯД БЕЗДНЫ' + (n ? ' ×' + n : ''), '#ff7a90', 1.2, 17);
    snd('abyssEye'); return true;
  },
  hushCloak(h, item){
    const c = SHOP_ITEMS.hushCloak;
    h.stunTimer = 0; h.slowT = 0; h.slow = 0;
    h.invisible = true; h.undetectable = true; h.tribuInvisibilityTimer = c.invisTime;
    h.buffs = h.buffs.filter(b => b.id !== 'hushSpd');
    h.addBuff({type:'spd', id:'hushSpd', val:c.haste, t:c.invisTime});
    item.cooldown = c.cooldown;
    fxRing(h.x, h.y, 90, '#8aa7ff', 0.6); spawnParticles(h.x, h.y, '#c9d6ff', 26, 0.9);
    addText(h.x, h.y - 70, 'ТИХИЙ ЧАС', '#b6c8ff', 1.1, 17);
    snd('hushCloak'); return true;
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
  if(id === 'hushCloak'){ const hp = SHOP_ITEMS.hushCloak.hp; hero.maxHp += hp; hero.hp += hp; return; }
  return _ais.apply(this, arguments);
};

/* иконки предметов */
const _dii = drawItemIcon;
drawItemIcon = function(item, x, y, s){
  if(!item || !NEW_ITEMS[item.id]) return _dii.apply(this, arguments);
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.shadowColor = item.color; ctx.shadowBlur = 12;
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  if(item.id === 'abyssEye'){
    ctx.fillStyle = '#2a0610'; ctx.strokeStyle = '#ffb3c1';
    ctx.beginPath(); ctx.moveTo(-s*.46, 0); ctx.quadraticCurveTo(0, -s*.46, s*.46, 0); ctx.quadraticCurveTo(0, s*.46, -s*.46, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, s*.24); g.addColorStop(0, '#ffffff'); g.addColorStop(.35, '#ff4d6d'); g.addColorStop(1, '#7a0a1c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s*.24, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0a0204'; ctx.beginPath(); ctx.ellipse(0, 0, s*.06, s*.18, 0, 0, TAU); ctx.fill();
  } else {
    const g = ctx.createLinearGradient(0, -s*.45, 0, s*.45); g.addColorStop(0, '#c9d6ff'); g.addColorStop(.6, '#5b74d8'); g.addColorStop(1, '#2a3580');
    ctx.fillStyle = g; ctx.strokeStyle = '#e6ecff';
    ctx.beginPath(); ctx.moveTo(-s*.18, -s*.42); ctx.quadraticCurveTo(0, -s*.52, s*.18, -s*.42); ctx.lineTo(s*.44, s*.4); ctx.quadraticCurveTo(0, s*.28, -s*.44, s*.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffe9a6'; ctx.beginPath(); ctx.arc(s*.1, -s*.08, s*.1, 0, TAU); ctx.fill();
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s*.16, -s*.1, s*.09, 0, TAU); ctx.fill();
  }
  ctx.restore();
};
})();
