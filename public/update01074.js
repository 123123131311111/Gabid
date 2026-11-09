/* DotaSense 0.10.7.4 — ХАЙГРАУНД: каменные плато рядом с мидом и по два новых лесных кемпа у каждой команды.
   • На карте появилось 4 плато (по 2 у Света и у Тьмы), ближе к центральной линии. Это широкие каменные холмы со ступенчатыми
     лестницами, мерцающей руной по краю, кристаллами и огоньками на жаровнях.
   • На плато можно спокойно ходить: когда боец поднимается по склону, он плавно «приподнимается» над землёй (вместе с полоской
     здоровья), а при спуске так же плавно опускается. Коллизии и проходимость не менялись — боты и герои ходят как раньше.
   • На каждом плато стоит свой лагерь нейтралов (итого +4 кемпа, по 2 у каждой стороны), они учитываются ботами, миникартой и логовом Рошана.
   Всё живёт в отдельном файле: игровая логика game.js не правилась, патч оборачивает scaleMapData / createMapTrees / spawnNeutralCamps,
   drawTerrain (спрайт плато в кэш-слое рельефа), drawWorldObjects (анимированный слой) и drawUnit (подъём бойцов). */
(function(){
'use strict';
const warn = (t, e) => { if(!warn[t]){ warn[t] = 1; try { console.warn('update01074 ' + t + ':', e); } catch(_) {} } };
if(typeof WORLD === 'undefined' || typeof NEUTRAL_CAMPS === 'undefined' || typeof drawTerrain !== 'function') return;

const SQ = Math.SQRT1_2, TAU = Math.PI * 2;
const R = 255;          /* радиус основания плато */
const YS = 0.84;        /* вертикальное сжатие (вид сверху под углом) */
const TOPK = 0.74;      /* радиус верхней площадки относительно основания */
const H = 46;           /* высота плато в пикселях экрана */
const BASE_CAMP = 12;   /* индексы новых кемпов в NEUTRAL_CAMPS: 12..15 */
const FACT = [{a:0.06, k:3, p:0.4}, {a:0.04, k:5, p:1.9}];

/* координаты в осях карты: r — вдоль мида (к базе Света), s — поперёк (минус — к верхней линии) */
const wp = (r, s) => ({x: WORLD / 2 + (-r + s) * SQ, y: WORLD / 2 + (r + s) * SQ});
const SPEC = [
  {team:0, r: 420, s:-620, seed: 11, kinds:['alpha','wolf','wolf','small']},
  {team:0, r: 420, s: 620, seed: 23, kinds:['big','shaman','satyr','slime']},
  {team:1, r:-420, s:-620, seed: 37, kinds:['alpha','wolf','wolf','small']},
  {team:1, r:-420, s: 620, seed: 41, kinds:['big','shaman','satyr','slime']}
];
const PAL = [
  /* Свет: холодный серо-зелёный камень, бирюзовая руна */
  {slope0:'#34383a', slope1:'#6c7468', top0:'#a9b896', top1:'#6d7d5f', dirt:'#4b4a38', rim:'#7ff0cf', rim2:'rgba(127,240,207,', crystal:'#8ffff0', crystal2:'#2fb7b0', moss:'#7fae5a'},
  /* Тьма: тёмный багровый камень, огненная руна */
  {slope0:'#2c2325', slope1:'#6b5655', top0:'#9a7c70', top1:'#5a4640', dirt:'#3c2a26', rim:'#ff8450', rim2:'rgba(255,132,80,', crystal:'#ff9a6a', crystal2:'#c8381f', moss:'#8e6a3a'}
];

function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const fOf = (p, a) => 1 + FACT[0].a * Math.sin(FACT[0].k * a + FACT[0].p + p.seed) + FACT[1].a * Math.sin(FACT[1].k * a + FACT[1].p + p.seed * 0.7);
const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

let plateaus = null, campsAdded = false;
function initPlateaus(){
  if(plateaus) return plateaus;
  plateaus = SPEC.map((s, i) => { const c = wp(s.r, s.s); return {i, team:s.team, x:c.x, y:c.y, seed:s.seed, kinds:s.kinds, campIndex:BASE_CAMP + i, sprite:null, ox:0, oy:0}; });
  return plateaus;
}

/* нормализованное расстояние до центра плато: 1 — кромка основания, TOPK — край верхней площадки */
function dNorm(p, x, y){
  const dx = x - p.x, dy = (y - p.y) / YS;
  return Math.hypot(dx, dy) / (R * fOf(p, Math.atan2(dy, dx)));
}
/* высота (0..1) в точке мира */
function elevAt(x, y){
  if(!plateaus) return 0;
  let best = 0;
  for(let i = 0; i < plateaus.length; i++){
    const p = plateaus[i];
    const ax = x - p.x; if(ax > R * 1.2 || ax < -R * 1.2) continue;
    const ay = y - p.y; if(ay > R * 1.2 || ay < -R * 1.2) continue;
    const e = smooth((1 - dNorm(p, x, y)) / (1 - TOPK));
    if(e > best) best = e;
  }
  return best;
}
window.PlateauElev = elevAt;

/* ---------- кэшируемый спрайт плато ---------- */
function blobPath(g, p, cx, cy, k){
  g.beginPath();
  const N = 72;
  for(let i = 0; i <= N; i++){
    const a = i / N * TAU, rr = R * fOf(p, a) * k;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * YS;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}
function surfPoint(p, a, t, cx, cy){
  const rr = R * fOf(p, a) * lerp(1, TOPK, t);
  return {x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * YS - H * t};
}

function buildSprite(p){
  const pal = PAL[p.team], rand = rng(p.seed * 977 + 13);
  const pad = 46, W = Math.ceil((R * 1.12 + pad) * 2), Hh = Math.ceil(R * 1.12 * YS * 2 + H + pad * 2 + 20);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
  const g = cv.getContext('2d');
  const cx = W / 2, cy = Hh - (R * 1.12 * YS + pad);
  p.ox = cx; p.oy = cy;

  /* 1. тень и каменная россыпь у подножия */
  g.save();
  g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = 38; g.shadowOffsetY = 16;
  g.fillStyle = 'rgba(0,0,0,.55)'; blobPath(g, p, cx, cy + 6, 1.04); g.fill();
  g.restore();
  for(let i = 0; i < 90; i++){
    const a = rand() * TAU, rr = R * fOf(p, a) * (1.0 + rand() * 0.14), s = 2 + rand() * 5;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * YS + 4;
    g.fillStyle = `rgba(${70 + rand() * 50 | 0},${68 + rand() * 40 | 0},${64 + rand() * 40 | 0},.85)`;
    g.beginPath(); g.ellipse(x, y, s, s * 0.7, rand() * 3, 0, TAU); g.fill();
  }

  /* 2. склон: стопка слоёв от тёмного основания к светлой кромке */
  const LAY = 22;
  for(let i = 0; i <= LAY; i++){
    const t = i / LAY, k = lerp(1, TOPK, t);
    const c0 = pal.slope0, c1 = pal.slope1;
    g.fillStyle = mix(c0, c1, Math.pow(t, 0.8));
    blobPath(g, p, cx, cy - H * t, k); g.fill();
  }
  /* прожилки и трещины на склоне */
  for(let i = 0; i < 520; i++){
    const a = rand() * TAU; if(Math.sin(a) < -0.35 && rand() < 0.85) continue;
    const t = 0.04 + rand() * 0.92, q = surfPoint(p, a, t, cx, cy);
    const len = 5 + rand() * 15, lean = (rand() - 0.5) * 4;
    g.strokeStyle = rand() < 0.62 ? 'rgba(10,8,10,.30)' : 'rgba(255,255,240,.10)';
    g.lineWidth = 1 + rand() * 1.4;
    g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(q.x + lean, q.y + len); g.stroke();
  }
  /* горизонтальные пласты породы */
  for(let li = 1; li <= 5; li++){
    const t = li / 6;
    g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1.5;
    g.beginPath();
    for(let i = 0; i <= 72; i++){ const q = surfPoint(p, i / 72 * TAU, t, cx, cy); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }
    g.closePath(); g.stroke();
  }
  /* валуны-выступы на склоне */
  for(let i = 0; i < 26; i++){
    const a = rand() * TAU; if(Math.sin(a) < -0.2) continue;
    const t = 0.1 + rand() * 0.7, q = surfPoint(p, a, t, cx, cy), s = 6 + rand() * 12;
    const gr = g.createRadialGradient(q.x - s * 0.3, q.y - s * 0.4, 1, q.x, q.y, s);
    gr.addColorStop(0, mix(pal.slope1, '#ffffff', 0.25)); gr.addColorStop(1, pal.slope0);
    g.fillStyle = gr; g.beginPath(); g.ellipse(q.x, q.y, s, s * 0.72, 0, 0, TAU); g.fill();
  }

  /* 3. каменные лестницы (две спереди) */
  for(const al of [0.93, 2.21]) drawStairs(g, p, pal, al, cx, cy);

  /* 4. верхняя площадка */
  const topCy = cy - H;
  const tg = g.createRadialGradient(cx - R * 0.15, topCy - R * 0.2, 10, cx, topCy, R * TOPK * 1.1);
  tg.addColorStop(0, pal.top0); tg.addColorStop(1, pal.top1);
  g.fillStyle = tg; blobPath(g, p, cx, topCy, TOPK); g.fill();
  g.save(); blobPath(g, p, cx, topCy, TOPK); g.clip();
  /* плиты и пятна травы */
  for(let i = 0; i < 160; i++){
    const a = rand() * TAU, rr = Math.sqrt(rand()) * R * TOPK, x = cx + Math.cos(a) * rr, y = topCy + Math.sin(a) * rr * YS, s = 5 + rand() * 16;
    g.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.08)';
    g.beginPath(); g.ellipse(x, y, s, s * 0.6, rand() * 3, 0, TAU); g.fill();
  }
  for(let i = 0; i < 70; i++){
    const a = rand() * TAU, rr = (0.55 + rand() * 0.45) * R * TOPK, x = cx + Math.cos(a) * rr, y = topCy + Math.sin(a) * rr * YS;
    g.fillStyle = mix(pal.moss, '#ffffff', rand() * 0.2); g.globalAlpha = 0.35 + rand() * 0.3;
    g.beginPath(); g.ellipse(x, y, 4 + rand() * 9, 2.5 + rand() * 4, 0, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
  /* площадка лагеря: тёмная утоптанная земля */
  const dg = g.createRadialGradient(cx, topCy, 12, cx, topCy, 150);
  dg.addColorStop(0, pal.dirt); dg.addColorStop(0.75, 'rgba(60,50,38,.75)'); dg.addColorStop(1, 'rgba(60,50,38,0)');
  g.fillStyle = dg; g.beginPath(); g.ellipse(cx, topCy, 150, 150 * YS, 0, 0, TAU); g.fill();
  for(let i = 0; i < 40; i++){
    const a = rand() * TAU, rr = Math.sqrt(rand()) * 135, x = cx + Math.cos(a) * rr, y = topCy + Math.sin(a) * rr * YS, s = 1.5 + rand() * 3.5;
    g.fillStyle = `rgba(${90 + rand() * 40 | 0},${80 + rand() * 30 | 0},${66 + rand() * 30 | 0},.8)`;
    g.beginPath(); g.ellipse(x, y, s, s * 0.7, 0, 0, TAU); g.fill();
  }
  /* руническое кольцо: внешнее и внутреннее + засечки */
  g.strokeStyle = pal.rim2 + '.28)'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(cx, topCy, R * TOPK * 0.78, R * TOPK * 0.78 * YS, 0, 0, TAU); g.stroke();
  g.lineWidth = 1.2; g.setLineDash([5, 7]);
  g.beginPath(); g.ellipse(cx, topCy, 168, 168 * YS, 0, 0, TAU); g.stroke(); g.setLineDash([]);
  g.lineWidth = 2;
  for(let i = 0; i < 24; i++){
    const a = i / 24 * TAU, r1 = R * TOPK * 0.78, r2 = r1 - (i % 3 === 0 ? 14 : 7);
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, topCy + Math.sin(a) * r1 * YS); g.lineTo(cx + Math.cos(a) * r2, topCy + Math.sin(a) * r2 * YS); g.stroke();
  }
  g.restore();

  /* 5. верхняя кромка: светлая губа камня + мох */
  g.strokeStyle = 'rgba(255,255,245,.38)'; g.lineWidth = 3.2; blobPath(g, p, cx, topCy, TOPK); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; blobPath(g, p, cx, topCy + 3, TOPK); g.stroke();
  for(let i = 0; i < 110; i++){
    const a = rand() * TAU, q = surfPoint(p, a, 0.98 + rand() * 0.06, cx, cy), s = 2 + rand() * 4;
    g.fillStyle = mix(pal.moss, '#1c2a14', rand() * 0.5); g.globalAlpha = 0.8;
    g.beginPath(); g.ellipse(q.x, q.y + 1, s, s * 0.7, 0, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;

  /* 6. кристаллы по краю площадки (по два «куста») */
  const sp = [0.2, 1.5, 2.7, 3.9, 5.1];
  for(const a0 of sp){ const q = surfPoint(p, a0 + (rand() - 0.5) * 0.2, 0.9, cx, cy); crystal(g, q.x, q.y, 1 + rand() * 0.5, pal, rand); }
  /* пьедесталы жаровен на вершинах лестниц */
  for(const al of [0.93, 2.21]){ const q = surfPoint(p, al, 1.0, cx, cy); brazierBase(g, q.x, q.y); }
  return cv;
}

function drawStairs(g, p, pal, al, cx, cy){
  const N = 11;
  for(let i = 0; i < N; i++){
    const t0 = i / N, t1 = (i + 1) / N;
    const a = surfPoint(p, al, t0, cx, cy), b = surfPoint(p, al, t1, cx, cy);
    const w = lerp(40, 30, t0), yTop = Math.min(a.y, b.y), hgt = Math.max(5, Math.abs(a.y - b.y) + 2);
    const mx = (a.x + b.x) / 2;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(mx - w - 6, yTop + 2, w * 2 + 12, hgt + 3);
    const gr = g.createLinearGradient(0, yTop, 0, yTop + hgt);
    gr.addColorStop(0, mix(pal.top0, '#ffffff', 0.25)); gr.addColorStop(1, mix(pal.slope1, pal.top0, 0.5));
    g.fillStyle = gr; g.fillRect(mx - w, yTop, w * 2, hgt);
    g.fillStyle = 'rgba(255,255,255,.28)'; g.fillRect(mx - w, yTop, w * 2, 1.6);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(mx - w, yTop + hgt - 1.6, w * 2, 1.6);
  }
  /* бортики лестницы */
  for(const sd of [-1, 1]){
    const a = surfPoint(p, al, 0, cx, cy), b = surfPoint(p, al, 1, cx, cy);
    g.strokeStyle = mix(pal.slope1, '#ffffff', 0.18); g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(a.x + sd * 46, a.y + 2); g.lineTo(b.x + sd * 36, b.y); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; g.stroke();
    g.lineCap = 'butt';
  }
}
function brazierBase(g, x, y){
  g.fillStyle = 'rgba(0,0,0,.4)'; g.beginPath(); g.ellipse(x, y + 5, 15, 6, 0, 0, TAU); g.fill();
  const gr = g.createLinearGradient(x - 11, y, x + 11, y);
  gr.addColorStop(0, '#3a3a40'); gr.addColorStop(0.5, '#8d8f99'); gr.addColorStop(1, '#3a3a40');
  g.fillStyle = gr; g.beginPath(); g.moveTo(x - 9, y - 12); g.lineTo(x + 9, y - 12); g.lineTo(x + 6, y + 4); g.lineTo(x - 6, y + 4); g.closePath(); g.fill();
  g.fillStyle = '#222228'; g.beginPath(); g.ellipse(x, y - 12, 12, 4.5, 0, 0, TAU); g.fill();
}
function crystal(g, x, y, sc, pal, rand){
  g.save(); g.translate(x, y); g.scale(sc, sc);
  g.shadowColor = pal.crystal; g.shadowBlur = 14;
  for(let i = -1; i <= 1; i++){
    const h = (i === 0 ? 34 : 20) + rand() * 6, w = i === 0 ? 8 : 6, ox = i * 11;
    const gr = g.createLinearGradient(ox - w, 0, ox + w, 0);
    gr.addColorStop(0, pal.crystal2); gr.addColorStop(0.5, pal.crystal); gr.addColorStop(1, pal.crystal2);
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(ox - w, 2); g.lineTo(ox - w * 0.6, -h * 0.7); g.lineTo(ox + i * 2, -h); g.lineTo(ox + w * 0.6, -h * 0.7); g.lineTo(ox + w, 2); g.closePath(); g.fill();
  }
  g.restore();
}
function mix(a, b, t){
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const r = lerp(pa >> 16, pb >> 16, t) | 0, gg = lerp((pa >> 8) & 255, (pb >> 8) & 255, t) | 0, bl = lerp(pa & 255, pb & 255, t) | 0;
  return `rgb(${r},${gg},${bl})`;
}
function spriteOf(p){
  if(!p.sprite){ try { p.sprite = buildSprite(p); } catch(err){ warn('sprite', err); p.sprite = document.createElement('canvas'); } }
  return p.sprite;
}

/* ---------- кемпы ---------- */
function ensureCamps(){
  if(campsAdded) return;
  campsAdded = true;
  initPlateaus();
  const offs = [[0,-26],[96,34],[-96,34],[0,104]];
  for(const p of plateaus){
    const camp = offs.map(o => ({x: p.x + o[0], y: p.y + o[1]}));
    camp[0].baseY = camp[0].y;
    NEUTRAL_CAMPS.push(camp);
    if(typeof NEUTRAL_CAMP_KINDS !== 'undefined') NEUTRAL_CAMP_KINDS[p.campIndex] = p.kinds;
  }
}
const ownCamps = () => plateaus ? plateaus.map(p => NEUTRAL_CAMPS[p.campIndex]).filter(Boolean) : [];

/* scaleMapData вызывается ровно один раз за игру: после неё в NEUTRAL_CAMPS мировые координаты */
{
  const orig = scaleMapData;
  window.scaleMapData = function(){ const r = orig.apply(this, arguments); ensureCamps(); return r; };
}
/* кольцо «лагерь» и миникарта берут camp[0] — после спавна поднимаем его на высоту плато, перед спавном возвращаем */
{
  const orig = spawnNeutralCamps;
  window.spawnNeutralCamps = function(){
    ensureCamps();
    for(const c of ownCamps()) if(c[0].baseY != null) c[0].y = c[0].baseY;
    const r = orig.apply(this, arguments);
    for(const c of ownCamps()) if(c[0].baseY != null) c[0].y = c[0].baseY - H;
    return r;
  };
}
/* убираем деревья, выросшие на плато или на подходе к лестницам */
{
  const orig = createMapTrees;
  window.createMapTrees = function(){
    const r = orig.apply(this, arguments);
    try {
      initPlateaus();
      trees = trees.filter(t => { for(const p of plateaus) if(dNorm(p, t.x, t.y) < 1.22) return false; return true; });
    } catch(err){ warn('trees', err); }
    return r;
  };
}

/* ---------- рельеф: спрайты плато в кэш-слое ---------- */
{
  const orig = drawTerrain;
  window.drawTerrain = function(){
    const r = orig.apply(this, arguments);
    try {
      if(!plateaus) return r;
      const mx = VW / 2 + TERRAIN_MARGIN + R * 1.3 + 80, my = VH / 2 + TERRAIN_MARGIN + R * 1.3 + 80;
      for(const p of plateaus){
        if(Math.abs(p.x - cam.x) > mx || Math.abs(p.y - cam.y) > my) continue;
        const sp = spriteOf(p);
        if(sp.width > 1) ctx.drawImage(sp, p.x - p.ox, p.y - p.oy);
      }
    } catch(err){ warn('terrain', err); }
    return r;
  };
}

/* ---------- анимированный слой: пульс руны, бегущие искры, огонь жаровен, мотыльки ---------- */
function flame(x, y, t, sc, col){
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(x, y - 10, 2, x, y - 10, 46 * sc);
  gl.addColorStop(0, col + '.55)'); gl.addColorStop(1, col + '0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x, y - 10, 46 * sc, 0, TAU); ctx.fill();
  for(let i = 0; i < 3; i++){
    const ph = t * (7 + i * 1.7) + i * 2.1, h = (15 + Math.sin(ph) * 5 + i * 2) * sc, w = (6 - i * 1.3) * sc;
    ctx.fillStyle = i === 0 ? 'rgba(255,120,40,.85)' : i === 1 ? 'rgba(255,190,80,.9)' : 'rgba(255,245,200,.95)';
    ctx.beginPath(); ctx.moveTo(x - w, y - 12); ctx.quadraticCurveTo(x - w * 0.6 + Math.sin(ph) * 2, y - 12 - h * 0.6, x + Math.sin(ph * 1.3) * 2, y - 12 - h);
    ctx.quadraticCurveTo(x + w * 0.6 + Math.sin(ph) * 2, y - 12 - h * 0.6, x + w, y - 12); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function drawPlateauFx(){
  if(!plateaus) return;
  const t = (typeof gameTime === 'number' && isFinite(gameTime)) ? gameTime : performance.now() / 1000;
  const lite = typeof perfLite === 'function' && perfLite();
  const mx = VW / 2 + R * 1.2 + 120, my = VH / 2 + R * 1.2 + 120;
  for(const p of plateaus){
    if(Math.abs(p.x - cam.x) > mx || Math.abs(p.y - cam.y) > my) continue;
    const pal = PAL[p.team], topCy = p.y - H;
    ctx.save();
    /* пульсирующий светящийся ободок + бегущие искры */
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + p.i);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = pal.rim2 + (0.14 + 0.2 * pulse) + ')'; ctx.lineWidth = 3;
    if(!lite){ ctx.shadowColor = pal.rim; ctx.shadowBlur = 7; }
    blobPath(ctx, p, p.x, topCy, TOPK * 0.995); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.setLineDash([8, 64]); ctx.lineDashOffset = -t * 46; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.4;
    blobPath(ctx, p, p.x, topCy, TOPK * 0.995); ctx.stroke(); ctx.setLineDash([]);
    /* вращающееся рунное кольцо вокруг лагеря */
    ctx.strokeStyle = pal.rim2 + (0.18 + 0.16 * pulse) + ')'; ctx.lineWidth = 2; ctx.setLineDash([14, 18]); ctx.lineDashOffset = t * 22;
    ctx.beginPath(); ctx.ellipse(p.x, topCy, 118, 118 * YS, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    /* жаровни на вершинах лестниц */
    for(const al of [0.93, 2.21]){
      const q = surfPoint(p, al, 1.0, p.x, p.y);
      flame(q.x, q.y - 12, t + al * 3, lite ? 0.8 : 1, pal === PAL[0] ? 'rgba(120,240,210,' : 'rgba(255,130,60,');
    }
    /* парящие огоньки над площадкой */
    if(!lite){
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for(let i = 0; i < 9; i++){
        const ph = t * (0.35 + (i % 3) * 0.12) + i * 1.7, a = i * 2.4 + t * 0.15, rr = (0.25 + 0.6 * ((i * 0.37) % 1)) * R * TOPK;
        const x = p.x + Math.cos(a) * rr, y = topCy + Math.sin(a) * rr * YS - ((ph % 1) * 60) - 6, al2 = Math.sin((ph % 1) * Math.PI);
        ctx.fillStyle = pal.rim2 + (0.65 * al2) + ')';
        ctx.beginPath(); ctx.arc(x, y, 2 + (i % 3) * 0.6, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
  }
}
{
  const orig = drawWorldObjects;
  window.drawWorldObjects = function(){
    try { drawPlateauFx(); } catch(err){ warn('fx', err); }
    return orig.apply(this, arguments);
  };
}

/* ---------- подъём бойцов на плато ---------- */
{
  const orig = drawUnit;
  window.drawUnit = function(u){
    if(!plateaus || !u || (typeof portraitRenderMode !== 'undefined' && portraitRenderMode)) return orig.apply(this, arguments);
    const e = elevAt(u.x, u.y);
    if(e < 0.002) return orig.apply(this, arguments);
    ctx.save();
    /* мягкая тень на земле остаётся на месте, сам боец приподнимается */
    ctx.translate(0, -H * e);
    try { return orig.apply(this, arguments); } finally { ctx.restore(); }
  };
}

/* на стороне экрана клик по поднятому бойцу попадает в него (юнит выше на H*e) */
if(typeof pickUnitAt === 'function'){
  const orig = pickUnitAt;
  window.pickUnitAt = function(x, y){
    const u = orig.apply(this, arguments);
    if(u) return u;
    const e = elevAt(x, y + H);
    return e > 0.5 ? orig.call(this, x, y + H * e) : u;
  };
}

try { initPlateaus(); } catch(err){ warn('init', err); }
})();
