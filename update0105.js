/* DotaSense 0.10.5 — 3D-ИКОНКИ ПРЕДМЕТОВ (по принципу сапог из 0.10.4.5): Мантированная сталь, БКБ, Кингляндия.
   • Мантированная сталь — стальной нагрудник с наплечниками, пластинами-ламелями, заклёпками, синим камнем и двумя полупрозрачными
     «копиями» за спиной (предмет создаёт 3 копии героя).
   • БКБ — Чёрный Королевский Брус: тёмный цилиндрический стержень под углом с золотыми кольцами, коронованным навершием и
     рубином, вокруг — золотое кольцо иммунитета.
   • Кингляндия — золотая корона с пятью зубцами, жемчужинами на кончиках, рубином и сапфирами; боковая стенка даёт объём.
   Каждая иконка рисуется один раз в скрытый canvas и затем копируется. Новые 3D-иконки добавляются в таблицу PAINTERS.
   Подключается после update01045.js. */
(function(){
'use strict';
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update0105 ' + tag + ':', err); } catch(e) {} } };
if(typeof drawItemIcon !== 'function') return;
const TAU = Math.PI * 2;

const lin = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
const glow = (c, s, col, cy) => {
  const g = c.createRadialGradient(0, (cy || 0) * s, 0, 0, (cy || 0) * s, .62 * s);
  g.addColorStop(0, col + '66'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(-.75 * s, -.75 * s, 1.5 * s, 1.5 * s);
};
const groundShadow = (c, s, x, y, rx) => {
  c.save(); c.fillStyle = 'rgba(0,0,0,.45)'; try { c.filter = 'blur(' + Math.round(s * .025) + 'px)'; } catch(e) {}
  c.beginPath(); c.ellipse(x * s, y * s, rx * s, .06 * s, 0, 0, TAU); c.fill(); c.restore();
};
const lw = (s, k) => Math.max(1.2, s * k);

/* ================= МАНТИРОВАННАЯ СТАЛЬ ================= */
function chestPath(c, s){
  c.beginPath();
  c.moveTo(-.13*s, -.38*s); c.lineTo(.13*s, -.38*s);
  c.lineTo(.29*s, -.31*s);
  c.quadraticCurveTo(.50*s, -.28*s, .48*s, -.10*s);
  c.quadraticCurveTo(.47*s, .02*s, .35*s, .10*s);
  c.lineTo(.31*s, .38*s);
  c.quadraticCurveTo(0, .47*s, -.31*s, .38*s);
  c.lineTo(-.35*s, .10*s);
  c.quadraticCurveTo(-.47*s, .02*s, -.48*s, -.10*s);
  c.quadraticCurveTo(-.50*s, -.28*s, -.29*s, -.31*s);
  c.closePath();
}
function paintMantled(c, s){
  glow(c, s, '#9fc4ff', 0);
  groundShadow(c, s, 0, .44, .36);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.rotate(-0.16);
  /* две «копии» за спиной */
  for(const dx of [-1, 1]){
    c.save(); c.translate(dx * .19 * s, -.05 * s); c.scale(.72, .72); c.globalAlpha = .38;
    chestPath(c, s); c.fillStyle = lin(c, -.4*s, -.4*s, .4*s, .4*s, [[0, '#cfe6ff'], [1, '#3d63a8']]); c.fill();
    c.strokeStyle = '#bcdcff'; c.lineWidth = lw(s, .022); c.stroke(); c.restore();
  }
  /* объём: тёмная стенка со сдвигом */
  c.save(); c.translate(-.045*s, .04*s); chestPath(c, s); c.fillStyle = '#232c3a'; c.fill();
  c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = lw(s, .03); c.stroke(); c.restore();
  /* основной корпус */
  c.save(); chestPath(c, s); c.clip();
  c.fillStyle = lin(c, -.45*s, -.4*s, .45*s, .42*s, [[0, '#f6fbff'], [.35, '#a9bccf'], [.7, '#5c6e84'], [1, '#2a3444']]);
  c.fillRect(-.6*s, -.6*s, 1.2*s, 1.2*s);
  /* вертикальный выпуклый гребень */
  c.fillStyle = lin(c, -.06*s, 0, .06*s, 0, [[0, 'rgba(0,0,0,.25)'], [.5, 'rgba(255,255,255,.55)'], [1, 'rgba(0,0,0,.3)']]);
  c.fillRect(-.06*s, -.38*s, .12*s, .85*s);
  /* ламели (горизонтальные пластины) */
  for(let i = 0; i < 3; i++){
    const y = .06*s + i*.11*s;
    c.strokeStyle = 'rgba(15,22,34,.7)'; c.lineWidth = lw(s, .02);
    c.beginPath(); c.moveTo(-.36*s, y); c.quadraticCurveTo(0, y + .06*s, .36*s, y); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = lw(s, .012);
    c.beginPath(); c.moveTo(-.36*s, y + .016*s); c.quadraticCurveTo(0, y + .076*s, .36*s, y + .016*s); c.stroke();
  }
  /* наплечники: тёмная кромка и блик */
  for(const sx of [-1, 1]){
    c.strokeStyle = 'rgba(15,22,34,.55)'; c.lineWidth = lw(s, .02);
    c.beginPath(); c.moveTo(sx*.31*s, -.30*s); c.quadraticCurveTo(sx*.40*s, -.10*s, sx*.35*s, .09*s); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(sx*.40*s, -.2*s, .03*s, .07*s, sx*.4, 0, TAU); c.fill();
  }
  c.restore();
  /* контур */
  chestPath(c, s); c.strokeStyle = 'rgba(14,20,30,.9)'; c.lineWidth = lw(s, .028); c.stroke();
  /* горловина */
  c.fillStyle = '#10161f'; c.strokeStyle = '#8da3bb'; c.lineWidth = lw(s, .02);
  c.beginPath(); c.ellipse(0, -.38*s, .14*s, .045*s, 0, 0, TAU); c.fill(); c.stroke();
  /* заклёпки */
  for(const [x, y] of [[-.27,-.22],[.27,-.22],[-.30,.28],[.30,.28]]){
    const r = c.createRadialGradient((x-.01)*s, (y-.01)*s, 0, x*s, y*s, .03*s); r.addColorStop(0, '#ffffff'); r.addColorStop(1, '#5d6e84');
    c.fillStyle = r; c.beginPath(); c.arc(x*s, y*s, .026*s, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = lw(s, .006); c.stroke();
  }
  /* синий камень в оправе */
  c.fillStyle = '#d9b34f'; c.strokeStyle = '#5a431a'; c.lineWidth = lw(s, .014);
  c.beginPath(); c.arc(0, -.12*s, .075*s, 0, TAU); c.fill(); c.stroke();
  const gem = c.createRadialGradient(-.015*s, -.14*s, 0, 0, -.12*s, .06*s);
  gem.addColorStop(0, '#ffffff'); gem.addColorStop(.35, '#7cc4ff'); gem.addColorStop(1, '#1d4fa8');
  c.fillStyle = gem; c.beginPath(); c.arc(0, -.12*s, .056*s, 0, TAU); c.fill();
  c.restore();
}

/* ================= БКБ ================= */
function paintBkb(c, s){
  glow(c, s, '#f0c36a', 0);
  c.lineJoin = 'round'; c.lineCap = 'round';
  /* кольцо иммунитета */
  c.save(); c.translate(0, .02*s); c.scale(1, .42);
  c.strokeStyle = 'rgba(255,214,110,.75)'; c.lineWidth = lw(s, .028);
  c.shadowColor = '#ffd36e'; c.shadowBlur = s * .06;
  c.beginPath(); c.arc(0, 0, .47*s, 0, TAU); c.stroke(); c.restore();
  groundShadow(c, s, .02, .40, .40);

  c.save(); c.rotate(-0.62);
  const L = .46*s, H = .075*s;
  /* стержень: цилиндр с вертикальным градиентом */
  c.fillStyle = lin(c, 0, -H, 0, H, [[0, '#6b717f'], [.28, '#2c303a'], [.6, '#14161c'], [1, '#050608']]);
  c.strokeStyle = 'rgba(0,0,0,.9)'; c.lineWidth = lw(s, .02);
  c.beginPath(); c.rect(-L, -H, 2*L, 2*H); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-L*.96, -H*.72, 1.92*L, H*.2);       /* блик */
  /* золотые кольца */
  for(const x of [-.30, -.12, .12, .30]){
    const g = lin(c, 0, -H*1.35, 0, H*1.35, [[0, '#fff3b0'], [.35, '#e2a93a'], [.75, '#8a5a14'], [1, '#3b2508']]);
    c.fillStyle = g; c.strokeStyle = 'rgba(40,24,6,.9)'; c.lineWidth = lw(s, .014);
    c.beginPath(); c.rect(x*s - .026*s, -H*1.3, .052*s, H*2.6); c.fill(); c.stroke();
  }
  /* центральный рубин в золотой оправе */
  c.fillStyle = lin(c, 0, -H*1.8, 0, H*1.8, [[0, '#fff3b0'], [.5, '#d99a2b'], [1, '#6b4310']]);
  c.strokeStyle = 'rgba(40,24,6,.9)'; c.lineWidth = lw(s, .016);
  c.beginPath(); c.ellipse(0, 0, .085*s, H*1.7, 0, 0, TAU); c.fill(); c.stroke();
  const rub = c.createRadialGradient(-.018*s, -H*.5, 0, 0, 0, .075*s);
  rub.addColorStop(0, '#ffe3e3'); rub.addColorStop(.35, '#ff3b4e'); rub.addColorStop(1, '#6a0a18');
  c.fillStyle = rub; c.beginPath(); c.ellipse(0, 0, .06*s, H*1.25, 0, 0, TAU); c.fill();
  /* навершия-короны на концах */
  for(const sx of [-1, 1]){
    c.save(); c.translate(sx*L, 0); c.scale(sx, 1);
    c.fillStyle = lin(c, 0, -.15*s, 0, .15*s, [[0, '#fff3b0'], [.4, '#e2a93a'], [1, '#6b4310']]);
    c.strokeStyle = 'rgba(40,24,6,.9)'; c.lineWidth = lw(s, .018);
    c.beginPath();
    c.moveTo(-.02*s, -H*1.5); c.lineTo(.07*s, -.15*s); c.lineTo(.10*s, -H*.8); c.lineTo(.17*s, -.12*s);
    c.lineTo(.20*s, 0); c.lineTo(.17*s, .12*s); c.lineTo(.10*s, H*.8); c.lineTo(.07*s, .15*s); c.lineTo(-.02*s, H*1.5);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(.08*s, -.07*s, .018*s, .045*s, .3, 0, TAU); c.fill();
    c.restore();
  }
  c.restore();
}

/* ================= КИНГЛЯНДИЯ ================= */
function crownPath(c, s){
  c.beginPath();
  c.moveTo(-.36*s, .10*s);
  c.lineTo(-.40*s, -.26*s); c.lineTo(-.285*s, -.07*s);
  c.lineTo(-.19*s, -.35*s); c.lineTo(-.095*s, -.09*s);
  c.lineTo(0, -.42*s);      c.lineTo(.095*s, -.09*s);
  c.lineTo(.19*s, -.35*s);  c.lineTo(.285*s, -.07*s);
  c.lineTo(.40*s, -.26*s);  c.lineTo(.36*s, .10*s);
  c.quadraticCurveTo(0, .22*s, -.36*s, .10*s);
  c.closePath();
}
function gemAt(c, s, x, y, r, a, b){
  c.fillStyle = '#e8b84a'; c.strokeStyle = 'rgba(60,36,6,.9)'; c.lineWidth = lw(s, .012);
  c.beginPath(); c.arc(x*s, y*s, (r+.014)*s, 0, TAU); c.fill(); c.stroke();
  const g = c.createRadialGradient((x-r*.35)*s, (y-r*.4)*s, 0, x*s, y*s, r*s);
  g.addColorStop(0, '#ffffff'); g.addColorStop(.35, a); g.addColorStop(1, b);
  c.fillStyle = g; c.beginPath(); c.arc(x*s, y*s, r*s, 0, TAU); c.fill();
}
function paintCrown(c, s){
  glow(c, s, '#f4d35e', -.05);
  groundShadow(c, s, 0, .36, .38);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.rotate(-0.16);
  /* объём: тёмная стенка */
  c.save(); c.translate(-.05*s, .045*s); crownPath(c, s); c.fillStyle = '#6b4310'; c.fill();
  c.strokeStyle = 'rgba(40,24,6,.8)'; c.lineWidth = lw(s, .028); c.stroke(); c.restore();
  /* основная корона */
  c.save(); crownPath(c, s); c.clip();
  c.fillStyle = lin(c, -.4*s, -.4*s, .42*s, .22*s, [[0, '#fff7c4'], [.3, '#f4d35e'], [.65, '#c48a24'], [1, '#6b4310']]);
  c.fillRect(-.6*s, -.6*s, 1.2*s, 1.1*s);
  /* цилиндрическая тень по краям */
  c.fillStyle = lin(c, -.4*s, 0, .4*s, 0, [[0, 'rgba(0,0,0,.30)'], [.25, 'rgba(255,255,255,.18)'], [.5, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.38)']]);
  c.fillRect(-.45*s, -.45*s, .9*s, .7*s);
  /* ободок-обруч */
  c.fillStyle = lin(c, 0, -.02*s, 0, .2*s, [[0, '#fff0a0'], [.35, '#d99a2b'], [1, '#6b4310']]);
  c.beginPath(); c.moveTo(-.40*s, -.01*s); c.quadraticCurveTo(0, .11*s, .40*s, -.01*s); c.lineTo(.40*s, .26*s); c.quadraticCurveTo(0, .38*s, -.40*s, .26*s); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(60,36,6,.7)'; c.lineWidth = lw(s, .016);
  c.beginPath(); c.moveTo(-.40*s, -.01*s); c.quadraticCurveTo(0, .11*s, .40*s, -.01*s); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = lw(s, .012);
  c.beginPath(); c.moveTo(-.38*s, .015*s); c.quadraticCurveTo(0, .13*s, .38*s, .015*s); c.stroke();
  /* узор на ободке */
  c.fillStyle = 'rgba(80,46,8,.55)';
  for(let i = -4; i <= 4; i++){ if(i === 0) continue; const x = i * .085; c.beginPath(); c.moveTo(x*s, (.10 + .05*(1 - Math.abs(i)/4.5)*0)*s); c.lineTo((x+.02)*s, .15*s); c.lineTo((x-.02)*s, .15*s); c.closePath(); c.fill(); }
  c.restore();
  crownPath(c, s); c.strokeStyle = 'rgba(40,24,6,.92)'; c.lineWidth = lw(s, .028); c.stroke();
  /* жемчужины на кончиках */
  for(const [x, y] of [[-.40,-.26],[-.19,-.35],[0,-.42],[.19,-.35],[.40,-.26]]){
    const g = c.createRadialGradient((x-.012)*s, (y-.016)*s, 0, x*s, y*s, .045*s);
    g.addColorStop(0, '#ffffff'); g.addColorStop(.6, '#f3ecff'); g.addColorStop(1, '#a89cc4');
    c.fillStyle = g; c.strokeStyle = 'rgba(60,36,6,.8)'; c.lineWidth = lw(s, .01);
    c.beginPath(); c.arc(x*s, (y-.02)*s, .042*s, 0, TAU); c.fill(); c.stroke();
  }
  /* драгоценности на ободке */
  gemAt(c, s, 0, .115, .062, '#ff5a6e', '#6a0a18');
  gemAt(c, s, -.22, .10, .042, '#7cc4ff', '#1d4fa8');
  gemAt(c, s, .22, .10, .042, '#7cc4ff', '#1d4fa8');
  c.restore();
}

const PAINTERS = {
  mantledSteel: {paint: paintMantled, scale: 1.18},
  bkb:          {paint: paintBkb,     scale: 1.22},
  kinglandia:   {paint: paintCrown,   scale: 1.22}
};

const cache = {};
function iconCanvas(id){
  if(cache[id]) return cache[id];
  const N = 192, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d'); c.translate(N / 2, N / 2);
  PAINTERS[id].paint(c, N * 0.86);
  return (cache[id] = cv);
}

const _dii = drawItemIcon;
drawItemIcon = function(item, x, y, s){
  if(item && PAINTERS[item.id]){
    try {
      const d = s * PAINTERS[item.id].scale;
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(iconCanvas(item.id), x - d / 2, y - d / 2 - d * .02, d, d);
      ctx.restore();
      return;
    } catch(err) { warn('draw', err); }
  }
  return _dii.apply(this, arguments);
};

/* реестр для следующих файлов с 3D-иконками (update01051.js и далее) */
try {
  window.__reg3d = (id, paint, scale) => { PAINTERS[id] = {paint, scale: scale || 1.2}; delete cache[id]; };
  window.__3dh = {lin, glow, groundShadow, lw, TAU};
} catch(e) {}
try { window.__paint3d = (c, s, id) => PAINTERS[id].paint(c, s); window.__paint3dIds = Object.keys(PAINTERS); } catch(e) {}
})();
