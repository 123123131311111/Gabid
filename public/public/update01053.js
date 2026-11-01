/* DotaSense 0.10.5.3 — ПРОРАБОТАННАЯ МИНИ-КАРТА С АВАТАРКАМИ ГЕРОЕВ.
   Заменяет drawMinimap() (game.js): размер и место мини-карты те же, поэтому HUD не сдвигается.
   • Вместо кружков союзники и враги показаны круглыми аватарками героев (настоящий портрет модели) с кольцом цвета команды,
     полоской здоровья и уровнем; ваш герой — золотое кольцо с пульсом. Аватарки не вылезают за край карты.
   • Рельеф как в игре: светлая и тёмная половины, река с песчаным берегом, лес из реальных деревьев, дороги линий,
     территории баз с комнатами возрождения и фонтанами, лагеря нейтралов, логово Рошана, точки рун.
   • Туман войны: неисследованное затемнено сильнее, исследованное — слабее, видимое — чистое (мягкие края).
   • Здания: башни — треугольники, казармы — квадраты, трон — золотой ромб. Увиденные вражеские здания остаются на карте.
   • Руны показаны ромбами с пульсом, варды — глазом с кольцом обзора, Рошан — оранжевым значком, крипы — точками.
   • Рамка с золотой каймой, виньетка, рамка камеры с уголками.
   • Клик и перетаскивание левой кнопкой по мини-карте перемещает камеру (возврат — прежней клавишей центрирования).
   Статичный слой (рельеф) рисуется в кэш и перерисовывается редко; вся мини-карта собирается на отдельном canvas
   и копируется в основной одним drawImage, так что ошибка в ней не портит остальной кадр. Подключается после update01052.js. */
(function(){
'use strict';
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update01053 ' + tag + ':', err); } catch(e) {} } };
if(typeof drawMinimap !== 'function' || typeof minimapSize !== 'function') return;
const _oldMinimap = drawMinimap;
const TAU = Math.PI * 2;
const PAD = 5;                     /* поля рамки вокруг карты (как в прежней версии) */

/* ---------- кэши ---------- */
let baseCv = null, baseKey = '', baseBuiltAt = 0;
let mmCv = null, mmG = null;
let fogCv = null, fogG = null, fogImg = null, fogT = 0;
const seenStructs = new WeakSet();

const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
};
function rrect(g, x, y, w, h, r){
  g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}

/* ---------- статичный слой: рельеф ---------- */
function buildBase(S){
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const g = cv.getContext('2d'), k = S / WORLD;
  g.lineCap = 'round'; g.lineJoin = 'round';
  /* земля: светлая половина (левый нижний угол) и тёмная (правый верхний) */
  let gr = g.createLinearGradient(0, S, S, 0);
  gr.addColorStop(0, '#34733f'); gr.addColorStop(.5, '#27573a'); gr.addColorStop(1, '#1c3f31');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.save(); g.beginPath(); g.moveTo(0, 0); g.lineTo(S, 0); g.lineTo(S, S); g.closePath(); g.clip();
  gr = g.createLinearGradient(S, 0, 0, S);
  gr.addColorStop(0, '#3d2038'); gr.addColorStop(.6, '#2a1830'); gr.addColorStop(1, '#1e1426');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  g.restore();
  /* пятна рельефа (детерминированно, без мерцания) */
  for(let x = 0; x < WORLD; x += 220){
    for(let y = 0; y < WORLD; y += 220){
      const r = (((x * 13 + y * 7) % 90) + 60) * k * 1.6, px = (x + ((x * 31 + y * 17) % 160)) * k, py = (y + ((y * 7 + y * 41) % 160)) * k;
      g.fillStyle = px > py ? 'rgba(120,50,90,.10)' : 'rgba(70,150,80,.10)';
      g.beginPath(); g.arc(px, py, r, 0, TAU); g.fill();
    }
  }
  /* территории баз */
  for(let team = 0; team < 2; team++){
    const corner = cornerOf(team), size = BASE_ART_SIZE;
    const ax = corner ? WORLD - size : 0, ay = corner ? 0 : WORLD - size;
    const cx = corner ? WORLD : 0, cy = corner ? 0 : WORLD, col = TEAM_COL[team];
    const bg = g.createRadialGradient(cx * k, cy * k, 0, cx * k, cy * k, size * 1.15 * k);
    bg.addColorStop(0, hexA(col, .42)); bg.addColorStop(.7, hexA(col, .14)); bg.addColorStop(1, hexA(col, 0));
    g.fillStyle = bg; g.fillRect(ax * k, ay * k, size * k, size * k);
  }
  /* река: тень, песок, кромка, вода, блики */
  g.beginPath(); g.moveTo(90 * k, 90 * k); g.lineTo((WORLD - 90) * k, (WORLD - 90) * k);
  g.strokeStyle = 'rgba(14,18,14,.40)'; g.lineWidth = 500 * k; g.stroke();
  g.strokeStyle = '#a58d5c'; g.lineWidth = 470 * k; g.stroke();
  g.strokeStyle = 'rgba(214,236,200,.40)'; g.lineWidth = 390 * k; g.stroke();
  gr = g.createLinearGradient(0, S, S, 0);
  gr.addColorStop(0, '#2f86a4'); gr.addColorStop(.5, '#3a9db8'); gr.addColorStop(1, '#2b7690');
  g.strokeStyle = gr; g.lineWidth = 330 * k; g.stroke();
  g.strokeStyle = 'rgba(150,224,236,.38)'; g.lineWidth = 170 * k; g.stroke();
  g.save(); g.setLineDash([S * .035, S * .05]); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = Math.max(1, S * .005);
  g.beginPath(); g.moveTo(90 * k, 90 * k - S * .018); g.lineTo((WORLD - 90) * k, (WORLD - 90) * k - S * .018); g.stroke(); g.restore();
  /* лес */
  try {
    const tr = Math.max(1.5, S * .0065);
    g.fillStyle = 'rgba(10,46,22,.95)';
    g.beginPath(); for(const t of trees){ if(t.x > t.y) continue; g.moveTo(t.x * k + tr, t.y * k); g.arc(t.x * k, t.y * k, tr, 0, TAU); } g.fill();
    g.fillStyle = 'rgba(12,5,18,.92)';
    g.beginPath(); for(const t of trees){ if(t.x <= t.y) continue; g.moveTo(t.x * k + tr, t.y * k); g.arc(t.x * k, t.y * k, tr, 0, TAU); } g.fill();
    g.fillStyle = 'rgba(120,200,120,.20)';
    g.beginPath(); for(const t of trees){ if(t.x > t.y) continue; g.moveTo(t.x * k - tr * .1 + tr * .45, t.y * k - tr * .35); g.arc(t.x * k - tr * .1, t.y * k - tr * .35, tr * .45, 0, TAU); } g.fill();
  } catch(err) { warn('trees', err); }
  /* дороги линий: тёмный ореол, полотно, светлая середина */
  for(const pass of [[210, 'rgba(18,14,8,.40)'], [128, '#b39d6c'], [70, 'rgba(240,222,170,.55)']]){
    g.lineWidth = Math.max(1, pass[0] * k); g.strokeStyle = pass[1];
    for(const lane of LANES){
      g.beginPath(); g.moveTo(lane[0].x * k, lane[0].y * k);
      for(let i = 1; i < lane.length; i++) g.lineTo(lane[i].x * k, lane[i].y * k);
      g.stroke();
    }
  }
  /* комнаты возрождения и фонтаны */
  for(let team = 0; team < 2; team++){
    const r = baseRoomRect(team), c = spawnRoomCenter(team), col = TEAM_COL[team];
    g.fillStyle = hexA(col, .22); rrect(g, r.x0 * k, r.y0 * k, (r.x1 - r.x0) * k, (r.y1 - r.y0) * k, 3); g.fill();
    g.strokeStyle = hexA(col, .85); g.lineWidth = 1.2; g.stroke();
    const fg = g.createRadialGradient(c.x * k, c.y * k, 0, c.x * k, c.y * k, 120 * k);
    fg.addColorStop(0, team ? 'rgba(255,200,130,.9)' : 'rgba(210,252,255,.9)'); fg.addColorStop(1, team ? 'rgba(255,90,30,0)' : 'rgba(80,200,240,0)');
    g.fillStyle = fg; g.beginPath(); g.arc(c.x * k, c.y * k, 120 * k, 0, TAU); g.fill();
  }
  /* лагеря нейтралов */
  try {
    for(const camp of NEUTRAL_CAMPS){
      const c = camp[0]; if(!c) continue;
      g.strokeStyle = 'rgba(224,182,84,.75)'; g.lineWidth = 1; g.fillStyle = 'rgba(40,26,8,.55)';
      g.beginPath(); g.arc(c.x * k, c.y * k, Math.max(3, 95 * k), 0, TAU); g.fill(); g.stroke();
    }
  } catch(err) { warn('camps', err); }
  /* логово Рошана */
  try {
    const L = getRoshanLair();
    g.fillStyle = 'rgba(24,8,4,.75)'; g.strokeStyle = 'rgba(255,150,70,.9)'; g.lineWidth = 1.3;
    g.beginPath(); g.arc(L.x * k, L.y * k, Math.max(5, 150 * k), 0, TAU); g.fill(); g.stroke();
  } catch(err) { warn('roshan', err); }
  /* точки рун */
  try {
    for(const spot of RUNE_SPOTS){
      const p = mapPoint(spot.x, spot.y), x = p.x * k, y = p.y * k, d = Math.max(3.5, S * .018);
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, y - d); g.lineTo(x + d, y); g.lineTo(x, y + d); g.lineTo(x - d, y); g.closePath(); g.stroke();
    }
  } catch(err) { warn('runes', err); }
  return cv;
}

function getBase(S, now){
  const key = [S, trees.length, BASES[0].x | 0, BASES[1].x | 0, LANES[0][0].x | 0, LANES[0][0].y | 0].join('|');
  if(!baseCv || (key !== baseKey && (now - baseBuiltAt > 1200 || !baseCv || baseCv.width !== S))){
    baseCv = buildBase(S); baseKey = key; baseBuiltAt = now;
  }
  return baseCv;
}

/* ---------- туман войны ---------- */
function updateFog(now){
  if(!fogCv){
    fogCv = document.createElement('canvas'); fogCv.width = fogCv.height = GRID;
    fogG = fogCv.getContext('2d'); fogImg = fogG.createImageData(GRID, GRID);
  }
  if(now - fogT < 140) return; fogT = now;
  const d = fogImg.data, n = GRID * GRID;
  for(let i = 0; i < n; i++){
    const o = i * 4;
    d[o] = 4; d[o + 1] = 7; d[o + 2] = 14;
    d[o + 3] = visGrid[i] ? 0 : (explored[i] ? 66 : 150);
  }
  fogG.putImageData(fogImg, 0, 0);
}

/* ---------- значки ---------- */
function drawTower(g, x, y, u, s, now){
  const c = TEAM_COL[u.team], w = 4.4 * s;
  const low = u.maxHp > 0 && u.hp / u.maxHp < .3;
  g.save(); if(low) g.globalAlpha = .65 + .35 * Math.sin(now / 160);
  g.fillStyle = 'rgba(6,9,12,.95)'; g.beginPath(); g.moveTo(x, y - w - 1.4); g.lineTo(x + w + 1.4, y + w * .8 + 1); g.lineTo(x - w - 1.4, y + w * .8 + 1); g.closePath(); g.fill();
  g.fillStyle = c; g.beginPath(); g.moveTo(x, y - w); g.lineTo(x + w, y + w * .8); g.lineTo(x - w, y + w * .8); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(x, y - w); g.lineTo(x + w * .35, y - w * .1); g.lineTo(x - w * .1, y); g.closePath(); g.fill();
  g.restore();
}
function drawBarracks(g, x, y, u, s){
  const w = 3.3 * s;
  g.fillStyle = 'rgba(6,9,12,.95)'; g.fillRect(x - w - 1, y - w - 1, w * 2 + 2, w * 2 + 2);
  g.fillStyle = TEAM_COL[u.team]; g.fillRect(x - w, y - w, w * 2, w * 2);
  g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x - w, y - w, w * 2, w * .7);
}
function drawThrone(g, x, y, u, s, now){
  const h = 8.2 * s, pulse = .5 + .5 * Math.sin(now / 420);
  g.save();
  g.shadowColor = TEAM_COL[u.team]; g.shadowBlur = 5 + pulse * 4;
  g.fillStyle = 'rgba(6,9,12,.95)'; g.beginPath(); g.moveTo(x, y - h - 1.5); g.lineTo(x + h + 1.5, y); g.lineTo(x, y + h + 1.5); g.lineTo(x - h - 1.5, y); g.closePath(); g.fill();
  g.shadowBlur = 0;
  g.fillStyle = TEAM_COL[u.team]; g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h, y); g.lineTo(x, y + h); g.lineTo(x - h, y); g.closePath(); g.fill();
  g.strokeStyle = '#ffd979'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = '#ffe9a8'; g.beginPath(); g.moveTo(x, y - h * .42); g.lineTo(x + h * .42, y); g.lineTo(x, y + h * .42); g.lineTo(x - h * .42, y); g.closePath(); g.fill();
  g.restore();
}
function drawRune(g, x, y, rune, s, now){
  const d = 4.2 * s, p = (now / 900) % 1;
  g.save();
  g.strokeStyle = hexA(rune.color || '#ffffff', (1 - p) * .8); g.lineWidth = 1.2;
  g.beginPath(); g.arc(x, y, d + p * 9 * s, 0, TAU); g.stroke();
  g.shadowColor = rune.color || '#ffffff'; g.shadowBlur = 6;
  g.fillStyle = rune.color || '#ffffff';
  g.beginPath(); g.moveTo(x, y - d); g.lineTo(x + d, y); g.lineTo(x, y + d); g.lineTo(x - d, y); g.closePath(); g.fill();
  g.shadowBlur = 0; g.strokeStyle = '#ffffff'; g.lineWidth = 1.2; g.stroke();
  g.restore();
}
function drawWardIcon(g, x, y, w, k, s){
  g.strokeStyle = 'rgba(123,233,255,.40)'; g.lineWidth = 1; g.fillStyle = 'rgba(123,233,255,.07)';
  g.beginPath(); g.arc(x, y, WARD_CFG.radius * k, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = '#0a1a20'; g.beginPath(); g.ellipse(x, y, 4.6 * s, 3.2 * s, 0, 0, TAU); g.fill();
  g.strokeStyle = '#7be9ff'; g.lineWidth = 1.2; g.stroke();
  g.fillStyle = '#7be9ff'; g.beginPath(); g.arc(x, y, 1.5 * s, 0, TAU); g.fill();
}
function drawRoshanIcon(g, x, y, s){
  g.save(); g.shadowColor = '#ff8a3d'; g.shadowBlur = 6;
  g.fillStyle = '#ff8a3d'; g.beginPath(); g.arc(x, y, 5.6 * s, 0, TAU); g.fill(); g.restore();
  g.strokeStyle = '#2a0f04'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, 5.6 * s, 0, TAU); g.stroke();
  g.fillStyle = '#2a0f04'; g.beginPath(); g.moveTo(x - 3.6 * s, y - 3.2 * s); g.lineTo(x - 5.6 * s, y - 6.6 * s); g.lineTo(x - 1.2 * s, y - 4.2 * s); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(x + 3.6 * s, y - 3.2 * s); g.lineTo(x + 5.6 * s, y - 6.6 * s); g.lineTo(x + 1.2 * s, y - 4.2 * s); g.closePath(); g.fill();
  g.fillStyle = '#fff2c8'; g.beginPath(); g.arc(x - 2 * s, y - .4 * s, 1.1 * s, 0, TAU); g.arc(x + 2 * s, y - .4 * s, 1.1 * s, 0, TAU); g.fill();
}

/* ---------- аватарка героя ---------- */
function portraitOf(def){
  try { const p = (typeof specPortrait === 'function') ? specPortrait(def) : null; return p || null; } catch(err) { warn('portrait', err); return null; }
}
function drawAvatar(g, u, x, y, r, me, S, now){
  const col = me ? '#ffe066' : TEAM_COL[u.team];
  const low = u.maxHp > 0 && u.hp / u.maxHp < .25;
  if(me){
    const p = (now / 1000) % 1;
    g.strokeStyle = 'rgba(255,224,102,' + ((1 - p) * .55) + ')'; g.lineWidth = 1.6;
    g.beginPath(); g.arc(x, y, r + 2 + p * 9, 0, TAU); g.stroke();
  }
  g.save();
  g.shadowColor = me ? '#ffe066' : 'rgba(0,0,0,.9)'; g.shadowBlur = me ? 9 : 4;
  g.fillStyle = '#080b10'; g.beginPath(); g.arc(x, y, r + 1.6, 0, TAU); g.fill();
  g.restore();
  g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
  const p = portraitOf(u.def);
  if(p){ g.drawImage(p, x - r, y - r, r * 2, r * 2); }
  else {
    const d = u.def || {};
    const bg = g.createLinearGradient(x - r, y - r, x + r, y + r); bg.addColorStop(0, d.color2 || '#7a8aa0'); bg.addColorStop(1, d.color || '#243044');
    g.fillStyle = bg; g.fillRect(x - r, y - r, r * 2, r * 2);
    g.fillStyle = 'rgba(255,255,255,.92)'; g.font = 'bold ' + Math.round(r * 1.15) + 'px Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(((d.name || '?').trim()[0] || '?').toUpperCase(), x, y + r * .05);
  }
  const gl = g.createLinearGradient(x, y - r, x, y + r); gl.addColorStop(0, 'rgba(255,255,255,.22)'); gl.addColorStop(.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,.25)');
  g.fillStyle = gl; g.fillRect(x - r, y - r, r * 2, r * 2);
  g.restore();
  g.strokeStyle = low ? 'rgba(255,60,60,' + (.6 + .4 * Math.sin(now / 120)) + ')' : col; g.lineWidth = me ? 2.6 : 2.1;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  /* полоска здоровья */
  if(u.maxHp > 0){
    const pc = Math.max(0, Math.min(1, u.hp / u.maxHp)), bw = r * 1.9, bh = Math.max(2.4, r * .26), bx = x - bw / 2, by = y + r + 2.2;
    g.fillStyle = 'rgba(0,0,0,.85)'; g.fillRect(bx - 1, by - 1, bw + 2, bh + 2);
    g.fillStyle = pc > .6 ? '#5fe070' : (pc > .3 ? '#f2d046' : '#ff5a4a'); g.fillRect(bx, by, bw * pc, bh);
  }
  /* уровень */
  if(Number.isFinite(u.level) && u.level > 0 && S >= 150){
    const lr = Math.max(3.6, r * .42), lx = x + r * .78, ly = y - r * .78;
    g.fillStyle = 'rgba(8,10,16,.95)'; g.beginPath(); g.arc(lx, ly, lr + .8, 0, TAU); g.fill();
    g.strokeStyle = '#d9b45a'; g.lineWidth = 1; g.stroke();
    g.fillStyle = '#fff3c4'; g.font = 'bold ' + Math.round(lr * 1.35) + 'px Segoe UI, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(Math.min(99, u.level | 0)), lx, ly + .3);
  }
}

/* ---------- сборка мини-карты ---------- */
function render(S, now){
  const W = S + PAD * 2;
  if(!mmCv){ mmCv = document.createElement('canvas'); }
  if(mmCv.width !== W || mmCv.height !== W){ mmCv.width = mmCv.height = W; }
  else { mmCv.width = W; }                                     /* сброс состояния контекста */
  mmG = mmCv.getContext('2d');
  const g = mmG, k = S / WORLD, s = S / 230, ox = PAD, oy = PAD;
  const mx = x => ox + x * k, my = y => oy + y * k;

  /* подложка */
  g.fillStyle = 'rgba(5,7,10,.97)'; rrect(g, 0, 0, W, W, 7); g.fill();
  g.save(); rrect(g, ox, oy, S, S, 4); g.clip();
  g.drawImage(getBase(S, now), ox, oy);

  /* туман */
  updateFog(now);
  g.imageSmoothingEnabled = true; g.drawImage(fogCv, ox, oy, S, S);

  /* здания (увиденные вражеские остаются на карте) */
  const heroesList = [], towers = [], creeps = [], neutrals = [];
  for(const u of units){
    if(!u || u.dead || u.isRoshan) continue;
    if(!Number.isFinite(u.x) || !Number.isFinite(u.y)) continue;
    const vis = u.team === 0 || isVisibleToPlayer(u);
    if(u.type === 'ancient' || u.type === 'tower' || u.type === 'barracks'){
      if(vis) seenStructs.add(u);
      if(seenStructs.has(u)) towers.push(u);
      continue;
    }
    if(!vis) continue;
    if(u.type === 'hero' && !u.isIllusion) heroesList.push(u);
    else if(u.team === 2) neutrals.push(u);
    else creeps.push(u);
  }
  towers.sort((a, b) => (a.type === 'ancient') - (b.type === 'ancient'));
  for(const u of towers){
    const x = mx(u.x), y = my(u.y);
    if(u.type === 'ancient') drawThrone(g, x, y, u, s, now);
    else if(u.type === 'tower') drawTower(g, x, y, u, s, now);
    else drawBarracks(g, x, y, u, s);
  }

  /* крипы и нейтралы */
  for(const u of creeps){
    g.fillStyle = TEAM_COL[u.team] || '#bbb';
    g.beginPath(); g.arc(mx(u.x), my(u.y), u.type === 'summon' || u.type === 'hero' ? 2.1 * s : 1.5 * s, 0, TAU); g.fill();
  }
  g.fillStyle = '#e6c56a';
  for(const u of neutrals){ g.beginPath(); g.arc(mx(u.x), my(u.y), 1.9 * s, 0, TAU); g.fill(); }

  /* варды */
  for(const w of wards){ if(w.team !== 0 || w.life <= 0) continue; drawWardIcon(g, mx(w.x), my(w.y), w, k, s); }
  /* руны */
  for(const rn of runes){ if(rn && Number.isFinite(rn.x)) drawRune(g, mx(rn.x), my(rn.y), rn, s, now); }
  /* Рошан */
  if(roshanUnit && !roshanUnit.dead) drawRoshanIcon(g, mx(roshanUnit.x), my(roshanUnit.y), s);

  /* герои: сначала враги, затем союзники, ваш герой сверху */
  const r0 = Math.max(8, S * .047), lim = r0 + 3;
  const order = heroesList.slice().sort((a, b) => ((a.isPlayer ? 2 : (a.team === 0 ? 1 : 0)) - (b.isPlayer ? 2 : (b.team === 0 ? 1 : 0))));
  for(const u of order){
    const me = !!u.isPlayer || u === playerHero;
    const r = me ? r0 * 1.18 : r0;
    const x = Math.max(ox + lim, Math.min(ox + S - lim, mx(u.x))), y = Math.max(oy + lim, Math.min(oy + S - lim - 3, my(u.y)));
    drawAvatar(g, u, x, y, r, me, S, now);
  }

  /* рамка камеры с уголками */
  const vx = mx(cam.x - VW / 2), vy = my(cam.y - VH / 2), vw = VW * k, vh = VH * k;
  g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(vx, vy, vw, vh);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1; g.strokeRect(vx, vy, vw, vh);
  const cl = Math.min(8, vw / 3, vh / 3);
  g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath();
  for(const [cx, cy, dx, dy] of [[vx, vy, 1, 1], [vx + vw, vy, -1, 1], [vx, vy + vh, 1, -1], [vx + vw, vy + vh, -1, -1]]){
    g.moveTo(cx + dx * cl, cy); g.lineTo(cx, cy); g.lineTo(cx, cy + dy * cl);
  }
  g.stroke();

  /* виньетка */
  const vg = g.createRadialGradient(ox + S / 2, oy + S / 2, S * .46, ox + S / 2, oy + S / 2, S * .78);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.42)');
  g.fillStyle = vg; g.fillRect(ox, oy, S, S);
  g.restore();

  /* золотая рамка с уголками-ромбами */
  const fr = g.createLinearGradient(0, 0, W, W);
  fr.addColorStop(0, '#f0d68a'); fr.addColorStop(.35, '#a8832f'); fr.addColorStop(.7, '#6b4e17'); fr.addColorStop(1, '#d7b25a');
  g.strokeStyle = fr; g.lineWidth = 2.4; rrect(g, 1.2, 1.2, W - 2.4, W - 2.4, 6); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1.2; rrect(g, ox - 1, oy - 1, S + 2, S + 2, 4); g.stroke();
  g.fillStyle = '#ffe9a8'; g.strokeStyle = '#4a3410'; g.lineWidth = 1;
  for(const [cx, cy] of [[2, 2], [W - 2, 2], [2, W - 2], [W - 2, W - 2]]){
    g.beginPath(); g.moveTo(cx, cy - 3.6); g.lineTo(cx + 3.6, cy); g.lineTo(cx, cy + 3.6); g.lineTo(cx - 3.6, cy); g.closePath(); g.fill(); g.stroke();
  }
  return mmCv;
}

drawMinimap = function(){
  try {
    const S = minimapSize(), cv = render(S, performance.now());
    ctx.drawImage(cv, 8 - PAD, VH - S - 8 - PAD);
  } catch(err) {
    warn('draw', err);
    return _oldMinimap.apply(this, arguments);
  }
};

/* ---------- клик и перетаскивание по мини-карте двигают камеру ---------- */
let dragging = false;
function mmGeom(){ const S = minimapSize(); return {x: 8, y: VH - S - 8, S}; }
function mmJump(mx, my){
  const m = mmGeom();
  cam.x = Math.max(0, Math.min(WORLD, (mx - m.x) / m.S * WORLD));
  cam.y = Math.max(0, Math.min(WORLD, (my - m.y) / m.S * WORLD));
  cameraManual = true;
}
try {
  canvas.addEventListener('mousedown', e => {
    if(e.button !== 0 || gameState !== 'playing') return;
    const rc = canvas.getBoundingClientRect(), mx = e.clientX - rc.left, my = e.clientY - rc.top, m = mmGeom();
    if(mx < m.x - PAD || mx > m.x + m.S + PAD || my < m.y - PAD || my > m.y + m.S + PAD) return;
    dragging = true; mmJump(mx, my);
    e.stopImmediatePropagation(); e.preventDefault();
  }, true);
  window.addEventListener('mousemove', e => {
    if(!dragging) return;
    const rc = canvas.getBoundingClientRect(); mmJump(e.clientX - rc.left, e.clientY - rc.top);
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('blur', () => { dragging = false; });
} catch(err) { warn('input', err); }

/* для проверки: отрисовка мини-карты на произвольном canvas */
try { window.__renderMinimapTest = (S) => render(S || minimapSize(), performance.now()); } catch(e) {}
})();
