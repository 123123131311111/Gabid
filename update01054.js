/* DotaSense 0.10.5.4 — ЕЩЁ ДВЕНАДЦАТЬ 3D-ИКОНОК ПРЕДМЕТОВ (по принципу update0105.js, update01051.js и update01052.js):
   Манго, Танго, Научилсяловить, Капыта-Дерезладия, Аганим шард, Часы Хроноса, Коса Жнеца, Перо Феникса,
   Вейкер Ветра, Святой медальон, Нуллификатор, Яйцо-голли.
   • Манго — спелый плод с красно-жёлтым бочком, коричневым черенком, зелёным листом и бликом, рядом синие искры маны.
   • Танго — пучок зелёных листьев с прожилками на коричневой ветке, перевязанный верёвочкой, красная ягодка.
   • Научилсяловить — синяя книга с золотыми уголками и корешком, страницы сбоку, на обложке руна-звезда и камень, красная закладка.
   • Капыта-Дерезладия — пара фиолетовых копыт в золотых манжетах с расщелиной и голубым кристаллом маны.
   • Аганим шард — крупный бирюзовый кристалл с гранями и два маленьких осколка, внутри свечение.
   • Часы Хроноса — песочные часы в золотой оправе с тремя стойками, бирюзовый песок, струйка и лучи времени.
   • Коса Жнеца — тёмное древко и серповидное серебристо-фиолетовое лезвие, фиолетовый камень у крепления, дымка.
   • Перо Феникса — огненное перо с градиентом от алого к жёлтому, бородки, искры и язычки пламени.
   • Вейкер Ветра — бирюзовый шар в серебряном кольце с вихрем внутри и завитками ветра по бокам.
   • Святой медальон — золотой овальный медальон с цепочкой, цветком из лепестков и жемчужинами, мягкое сияние.
   • Нуллификатор — чёрный шар пустоты с фиолетовым кольцом и перечёркнутым знаком, вокруг осколки и руны.
   • Яйцо-голли — ледяное яйцо с трещиной и светом изнутри, кристаллы инея и крапинки.
   Рисуются один раз в скрытый canvas (кэш), поэтому на скорость игры не влияют. Подключается после update01053.js. */
(function(){
'use strict';
if(typeof window.__reg3d !== 'function' || !window.__3dh) return;
const {lin, glow, groundShadow, lw, TAU} = window.__3dh;
const GOLD = [[0, '#fff3b0'], [.4, '#e2a93a'], [.8, '#8a5a14'], [1, '#3b2508']];
const SILVER = [[0, '#ffffff'], [.4, '#c4d0e0'], [.8, '#68788f'], [1, '#2a3444']];
const OUT = 'rgba(30,18,6,.92)';

function rad(c, x, y, r0, r1, stops){ const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function poly(c, pts, s){ c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x*s, y*s) : c.moveTo(x*s, y*s)); c.closePath(); }
function sparkle(c, s, x, y, r, col, blur){
  c.save(); c.fillStyle = col; if(blur){ c.shadowColor = blur; c.shadowBlur = s * .05; }
  c.beginPath(); c.moveTo(x*s, (y-r*1.6)*s); c.lineTo((x+r*.4)*s, (y-r*.4)*s); c.lineTo((x+r*1.6)*s, y*s); c.lineTo((x+r*.4)*s, (y+r*.4)*s);
  c.lineTo(x*s, (y+r*1.6)*s); c.lineTo((x-r*.4)*s, (y+r*.4)*s); c.lineTo((x-r*1.6)*s, y*s); c.lineTo((x-r*.4)*s, (y-r*.4)*s); c.closePath(); c.fill(); c.restore();
}
function gemAt(c, s, x, y, r, a, b){
  c.save(); c.fillStyle = rad(c, (x-r*.3)*s, (y-r*.3)*s, 0, r*1.3*s, [[0, '#ffffff'], [.25, a], [1, b]]);
  c.strokeStyle = OUT; c.lineWidth = lw(s, .012);
  c.beginPath(); c.arc(x*s, y*s, r*s, 0, TAU); c.fill(); c.stroke(); c.restore();
}

/* ================= МАНГО ================= */
function paintMango(c, s){
  glow(c, s, '#ffb340', 0);
  groundShadow(c, s, 0, .46, .30);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.rotate(-.32);
  const body = () => {
    c.beginPath(); c.moveTo(-.02*s, -.34*s);
    c.bezierCurveTo(.26*s, -.40*s, .42*s, -.12*s, .35*s, .14*s);
    c.bezierCurveTo(.29*s, .38*s, .06*s, .47*s, -.12*s, .41*s);
    c.bezierCurveTo(-.34*s, .33*s, -.41*s, .0, -.33*s, -.18*s);
    c.bezierCurveTo(-.27*s, -.31*s, -.14*s, -.34*s, -.02*s, -.34*s); c.closePath();
  };
  body(); c.fillStyle = lin(c, -.34*s, -.3*s, .36*s, .44*s, [[0, '#fff08a'], [.32, '#ffbf33'], [.68, '#ff7a2c'], [1, '#c4262c']]); c.fill();
  c.save(); body(); c.clip();
  c.fillStyle = 'rgba(120,10,20,.28)'; c.beginPath(); c.ellipse(.32*s, .22*s, .22*s, .34*s, .3, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-.17*s, -.10*s, .07*s, .20*s, .35, 0, TAU); c.fill();
  c.fillStyle = 'rgba(120,60,0,.35)';
  for(const [x, y] of [[.05, .05], [.18, -.12], [-.05, .25], [.2, .3], [-.18, .15]]){ c.beginPath(); c.arc(x*s, y*s, .008*s, 0, TAU); c.fill(); }
  c.restore();
  body(); c.strokeStyle = 'rgba(90,25,10,.95)'; c.lineWidth = lw(s, .026); c.stroke();
  /* черенок */
  c.fillStyle = lin(c, -.04*s, 0, .04*s, 0, [[0, '#a8794a'], [1, '#4a2e16']]); c.strokeStyle = 'rgba(40,20,8,.95)'; c.lineWidth = lw(s, .016);
  c.beginPath(); c.moveTo(-.04*s, -.33*s); c.lineTo(-.03*s, -.43*s); c.lineTo(.03*s, -.43*s); c.lineTo(.03*s, -.34*s); c.closePath(); c.fill(); c.stroke();
  /* лист */
  c.fillStyle = lin(c, 0, -.5*s, .3*s, -.35*s, [[0, '#b9f27a'], [.5, '#4fb544'], [1, '#1f6a2c']]); c.strokeStyle = 'rgba(15,50,20,.95)'; c.lineWidth = lw(s, .016);
  c.beginPath(); c.moveTo(.03*s, -.41*s); c.bezierCurveTo(.12*s, -.54*s, .30*s, -.52*s, .36*s, -.42*s); c.bezierCurveTo(.26*s, -.34*s, .10*s, -.34*s, .03*s, -.41*s); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(220,255,200,.7)'; c.lineWidth = lw(s, .01); c.beginPath(); c.moveTo(.05*s, -.41*s); c.quadraticCurveTo(.2*s, -.45*s, .33*s, -.42*s); c.stroke();
  c.restore();
  sparkle(c, s, .38, -.22, .028, '#bfeaff', '#4fb8ff');
  sparkle(c, s, -.40, .22, .022, '#bfeaff', '#4fb8ff');
  sparkle(c, s, .36, .34, .018, '#ffffff', '#4fb8ff');
}

/* ================= ТАНГО ================= */
function paintTango(c, s){
  glow(c, s, '#79d46c', 0);
  groundShadow(c, s, 0, .46, .32);
  c.lineJoin = 'round'; c.lineCap = 'round';
  /* ветка */
  c.save(); c.rotate(.18);
  c.strokeStyle = 'rgba(30,16,6,.95)'; c.lineWidth = lw(s, .075); c.beginPath(); c.moveTo(0, .44*s); c.quadraticCurveTo(.03*s, .1*s, 0, -.12*s); c.stroke();
  c.strokeStyle = lin(c, -.04*s, 0, .04*s, 0, [[0, '#b98652'], [.5, '#7a4d2a'], [1, '#4a2c16']]); c.lineWidth = lw(s, .055);
  c.beginPath(); c.moveTo(0, .44*s); c.quadraticCurveTo(.03*s, .1*s, 0, -.12*s); c.stroke();
  /* листья */
  function leaf(x, y, rot, len, wd, a, b){
    c.save(); c.translate(x*s, y*s); c.rotate(rot);
    c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(wd*s, -len*.25*s, wd*.8*s, -len*.75*s, 0, -len*s); c.bezierCurveTo(-wd*.8*s, -len*.75*s, -wd*s, -len*.25*s, 0, 0); c.closePath();
    c.fillStyle = lin(c, -wd*s, 0, wd*s, -len*s, [[0, a], [1, b]]); c.fill();
    c.strokeStyle = 'rgba(12,50,18,.95)'; c.lineWidth = lw(s, .016); c.stroke();
    c.strokeStyle = 'rgba(225,255,205,.75)'; c.lineWidth = lw(s, .011); c.beginPath(); c.moveTo(0, -.01*s); c.lineTo(0, -len*.9*s); c.stroke();
    c.strokeStyle = 'rgba(225,255,205,.38)'; c.lineWidth = lw(s, .008);
    for(const k of [.3, .5, .7]){ for(const d of [-1, 1]){ c.beginPath(); c.moveTo(0, -len*k*s); c.lineTo(d*wd*.5*s, -len*(k+.1)*s); c.stroke(); } }
    c.restore();
  }
  leaf(0, -.10, -1.15, .30, .10, '#8be06a', '#2a8a3a');
  leaf(0, -.10, 1.15, .30, .10, '#8be06a', '#2a8a3a');
  leaf(0, -.02, -.62, .38, .12, '#a8ee78', '#2f9a40');
  leaf(0, -.02, .62, .38, .12, '#a8ee78', '#2f9a40');
  leaf(0, -.10, 0, .40, .13, '#c4f78a', '#35a846');
  /* верёвочка */
  c.strokeStyle = '#e8d3a0'; c.lineWidth = lw(s, .02);
  for(const y of [.24, .29]){ c.beginPath(); c.moveTo(-.04*s, (y-.015)*s); c.lineTo(.045*s, (y+.015)*s); c.stroke(); }
  /* ягодка */
  gemAt(c, s, .09, -.02, .035, '#ff8a8a', '#a8141c');
  c.restore();
  sparkle(c, s, -.34, -.30, .022, '#e8ffd0', '#79d46c');
  sparkle(c, s, .36, -.10, .02, '#e8ffd0', '#79d46c');
}

/* ================= НАУЧИЛСЯЛОВИТЬ (книга) ================= */
function paintTome(c, s){
  glow(c, s, '#7ed6ff', 0);
  groundShadow(c, s, 0, .46, .36);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.rotate(-.12);
  /* страницы (боковая стенка снизу и справа) */
  c.fillStyle = lin(c, 0, .30*s, 0, .42*s, [[0, '#fff6dc'], [1, '#c9b88a']]); c.strokeStyle = 'rgba(40,28,10,.95)'; c.lineWidth = lw(s, .018);
  c.beginPath(); c.moveTo(-.28*s, .34*s); c.lineTo(.34*s, .34*s); c.lineTo(.34*s, .43*s); c.lineTo(-.28*s, .43*s); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(140,120,80,.6)'; c.lineWidth = lw(s, .006);
  for(const y of [.37, .395, .415]){ c.beginPath(); c.moveTo(-.26*s, y*s); c.lineTo(.33*s, y*s); c.stroke(); }
  /* обложка */
  const cover = () => { c.beginPath(); c.moveTo(-.34*s, -.40*s); c.lineTo(.30*s, -.40*s); c.quadraticCurveTo(.38*s, -.40*s, .38*s, -.32*s); c.lineTo(.38*s, .32*s); c.quadraticCurveTo(.38*s, .38*s, .30*s, .38*s); c.lineTo(-.34*s, .38*s); c.closePath(); };
  cover(); c.fillStyle = lin(c, -.34*s, -.4*s, .38*s, .4*s, [[0, '#7fc4ff'], [.4, '#3a78d8'], [.8, '#22449a'], [1, '#14275c']]); c.fill();
  c.save(); cover(); c.clip();
  c.fillStyle = 'rgba(255,255,255,.14)'; c.beginPath(); c.ellipse(.0, -.28*s, .3*s, .08*s, 0, 0, TAU); c.fill();
  c.restore();
  cover(); c.strokeStyle = 'rgba(8,16,50,.95)'; c.lineWidth = lw(s, .026); c.stroke();
  /* корешок */
  c.fillStyle = lin(c, -.4*s, 0, -.24*s, 0, [[0, '#142a68'], [1, '#2c58b8']]); c.strokeStyle = 'rgba(8,16,50,.95)'; c.lineWidth = lw(s, .02);
  c.beginPath(); c.moveTo(-.34*s, -.40*s); c.lineTo(-.22*s, -.40*s); c.lineTo(-.22*s, .38*s); c.lineTo(-.34*s, .38*s); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = lin(c, 0, -.4*s, 0, .4*s, GOLD); c.lineWidth = lw(s, .016);
  for(const y of [-.28, -.08, .12, .28]){ c.beginPath(); c.moveTo(-.34*s, y*s); c.lineTo(-.22*s, y*s); c.stroke(); }
  /* золотая рамка и уголки */
  c.strokeStyle = lin(c, -.2*s, -.3*s, .3*s, .3*s, GOLD); c.lineWidth = lw(s, .02);
  c.strokeRect(-.17*s, -.33*s, .50*s, .64*s);
  c.fillStyle = lin(c, -.2*s, -.3*s, .3*s, .3*s, GOLD); c.strokeStyle = OUT; c.lineWidth = lw(s, .01);
  for(const [x, y, sx, sy] of [[.30, -.33, -1, 1], [.30, .31, -1, -1], [-.17, .31, 1, -1], [-.17, -.33, 1, 1]]){
    c.beginPath(); c.moveTo(x*s, y*s); c.lineTo((x + sx*.10)*s, y*s); c.lineTo(x*s, (y + sy*.10)*s); c.closePath(); c.fill(); c.stroke();
  }
  /* руна-звезда и камень */
  c.save(); c.shadowColor = '#bff0ff'; c.shadowBlur = s * .05; c.strokeStyle = '#d8f6ff'; c.lineWidth = lw(s, .016);
  c.beginPath(); c.arc(.08*s, -.02*s, .15*s, 0, TAU); c.stroke();
  c.beginPath(); for(let i = 0; i < 5; i++){ const a = -Math.PI/2 + i*TAU*2/5; const x = .08*s + Math.cos(a)*.13*s, y = -.02*s + Math.sin(a)*.13*s; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.closePath(); c.stroke();
  c.restore();
  gemAt(c, s, .08, -.02, .04, '#d8f6ff', '#2a8ad8');
  /* закладка */
  c.fillStyle = '#e0364a'; c.strokeStyle = 'rgba(70,6,16,.95)'; c.lineWidth = lw(s, .012);
  c.beginPath(); c.moveTo(.20*s, .38*s); c.lineTo(.20*s, .52*s); c.lineTo(.235*s, .48*s); c.lineTo(.27*s, .52*s); c.lineTo(.27*s, .38*s); c.closePath(); c.fill(); c.stroke();
  c.restore();
  sparkle(c, s, .40, -.36, .026, '#e8fbff', '#7ed6ff');
  sparkle(c, s, -.40, .06, .02, '#e8fbff', '#7ed6ff');
}

/* ================= КАПЫТА-ДЕРЕЗЛАДИЯ ================= */
function paintHooves(c, s){
  glow(c, s, '#c59cff', 0);
  groundShadow(c, s, 0, .46, .40);
  c.lineJoin = 'round'; c.lineCap = 'round';
  function hoof(x, y, k, rot){
    c.save(); c.translate(x*s, y*s); c.rotate(rot); c.scale(k, k);
    /* голень и манжета */
    c.fillStyle = lin(c, -.12*s, 0, .12*s, 0, [[0, '#7a5a9a'], [.5, '#4a3070'], [1, '#2a1a44']]); c.strokeStyle = 'rgba(20,8,36,.95)'; c.lineWidth = lw(s, .02);
    c.beginPath(); c.moveTo(-.11*s, -.38*s); c.lineTo(.11*s, -.38*s); c.lineTo(.12*s, -.04*s); c.lineTo(-.12*s, -.04*s); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = lin(c, -.14*s, -.4*s, .14*s, -.3*s, GOLD); c.strokeStyle = OUT; c.lineWidth = lw(s, .014);
    c.beginPath(); c.moveTo(-.14*s, -.41*s); c.lineTo(.14*s, -.41*s); c.lineTo(.14*s, -.31*s); c.lineTo(-.14*s, -.31*s); c.closePath(); c.fill(); c.stroke();
    /* копыто */
    const h = () => { c.beginPath(); c.moveTo(-.13*s, -.06*s); c.lineTo(.13*s, -.06*s); c.bezierCurveTo(.22*s, -.02*s, .26*s, .14*s, .24*s, .30*s); c.lineTo(.04*s, .30*s); c.lineTo(.0, .22*s); c.lineTo(-.04*s, .30*s);
      c.lineTo(-.24*s, .30*s); c.bezierCurveTo(-.26*s, .14*s, -.22*s, -.02*s, -.13*s, -.06*s); c.closePath(); };
    h(); c.fillStyle = lin(c, -.25*s, -.06*s, .25*s, .3*s, [[0, '#d8b8ff'], [.35, '#9a64e0'], [.75, '#5a2ea0'], [1, '#2c1260']]); c.fill();
    c.save(); h(); c.clip(); c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-.11*s, .06*s, .04*s, .12*s, .2, 0, TAU); c.fill();
    c.strokeStyle = 'rgba(30,10,60,.5)'; c.lineWidth = lw(s, .012); c.beginPath(); c.moveTo(-.2*s, .12*s); c.lineTo(.2*s, .12*s); c.stroke(); c.restore();
    h(); c.strokeStyle = 'rgba(20,6,44,.95)'; c.lineWidth = lw(s, .024); c.stroke();
    /* подошва */
    c.fillStyle = '#1c1030'; c.strokeStyle = 'rgba(8,2,20,.95)'; c.lineWidth = lw(s, .012);
    c.beginPath(); c.moveTo(-.24*s, .30*s); c.lineTo(-.04*s, .30*s); c.lineTo(-.04*s, .34*s); c.lineTo(-.25*s, .34*s); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(.24*s, .30*s); c.lineTo(.04*s, .30*s); c.lineTo(.04*s, .34*s); c.lineTo(.25*s, .34*s); c.closePath(); c.fill(); c.stroke();
    /* кристалл маны */
    c.save(); c.shadowColor = '#7ed6ff'; c.shadowBlur = s * .05;
    c.fillStyle = lin(c, 0, -.2*s, 0, -.05*s, [[0, '#f2fcff'], [.5, '#6cc8ff'], [1, '#1a5ab0']]); c.strokeStyle = 'rgba(8,24,70,.95)'; c.lineWidth = lw(s, .012);
    c.beginPath(); c.moveTo(0, -.25*s); c.lineTo(.045*s, -.17*s); c.lineTo(0, -.07*s); c.lineTo(-.045*s, -.17*s); c.closePath(); c.fill(); c.stroke(); c.restore();
    c.restore();
  }
  hoof(.14, .00, .82, .10);
  hoof(-.16, .06, 1.0, -.08);
  sparkle(c, s, .36, -.30, .026, '#e6d4ff', '#c59cff');
  sparkle(c, s, -.38, -.22, .02, '#e6d4ff', '#c59cff');
}

/* ================= АГАНИМ ШАРД ================= */
function paintShard(c, s){
  glow(c, s, '#8be9fd', 0);
  groundShadow(c, s, 0, .46, .30);
  c.lineJoin = 'round'; c.lineCap = 'round';
  function crystal(x, y, k, rot, a, b, c2){
    c.save(); c.translate(x*s, y*s); c.rotate(rot); c.scale(k, k);
    const L = [[-.13, -.12], [0, -.30], [.13, -.12], [.13, .22], [0, .36], [-.13, .22]];
    /* левая грань */
    c.fillStyle = lin(c, -.13*s, 0, 0, 0, [[0, a], [1, b]]); poly(c, [[0, -.30], [-.13, -.12], [-.13, .22], [0, .36]], s); c.fill();
    /* правая грань */
    c.fillStyle = lin(c, 0, 0, .13*s, 0, [[0, b], [1, c2]]); poly(c, [[0, -.30], [.13, -.12], [.13, .22], [0, .36]], s); c.fill();
    /* верхние грани */
    c.fillStyle = 'rgba(255,255,255,.55)'; poly(c, [[0, -.30], [-.13, -.12], [0, -.04]], s); c.fill();
    c.fillStyle = 'rgba(255,255,255,.22)'; poly(c, [[0, -.30], [.13, -.12], [0, -.04]], s); c.fill();
    c.strokeStyle = 'rgba(6,40,70,.95)'; c.lineWidth = lw(s, .02); poly(c, L, s); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = lw(s, .01);
    c.beginPath(); c.moveTo(0, -.04*s); c.lineTo(0, .36*s); c.moveTo(-.13*s, -.12*s); c.lineTo(0, -.04*s); c.lineTo(.13*s, -.12*s); c.stroke();
    c.restore();
  }
  crystal(-.26, .14, .62, -.45, '#c8f8ff', '#46c4ec', '#1a6aa8');
  crystal(.27, .18, .54, .5, '#c8f8ff', '#46c4ec', '#1a6aa8');
  crystal(0, -.04, 1.0, .0, '#d6fbff', '#4fd0f4', '#1c72b4');
  c.save(); c.shadowColor = '#bff8ff'; c.shadowBlur = s * .08; c.fillStyle = 'rgba(255,255,255,.65)';
  c.beginPath(); c.ellipse(0, .04*s, .03*s, .12*s, 0, 0, TAU); c.fill(); c.restore();
  sparkle(c, s, -.12, -.30, .03, '#ffffff', '#8be9fd');
  sparkle(c, s, .30, -.12, .022, '#ffffff', '#8be9fd');
  sparkle(c, s, -.36, -.02, .018, '#e0fcff', '#8be9fd');
  sparkle(c, s, .12, .40, .02, '#e0fcff', '#8be9fd');
}

/* ================= ЧАСЫ ХРОНОСА ================= */
function paintHourglass(c, s){
  glow(c, s, '#8fe3ff', 0);
  groundShadow(c, s, 0, .47, .32);
  c.lineJoin = 'round'; c.lineCap = 'round';
  /* стойки сзади */
  for(const x of [-.22, .22]){
    c.fillStyle = lin(c, (x-.02)*s, 0, (x+.02)*s, 0, GOLD); c.strokeStyle = OUT; c.lineWidth = lw(s, .012);
    c.beginPath(); c.rect((x-.018)*s, -.38*s, .036*s, .76*s); c.fill(); c.stroke();
  }
  /* стекло */
  const glass = () => { c.beginPath(); c.moveTo(-.22*s, -.36*s); c.lineTo(.22*s, -.36*s); c.bezierCurveTo(.22*s, -.18*s, .05*s, -.10*s, .03*s, 0);
    c.bezierCurveTo(.05*s, .10*s, .22*s, .18*s, .22*s, .36*s); c.lineTo(-.22*s, .36*s); c.bezierCurveTo(-.22*s, .18*s, -.05*s, .10*s, -.03*s, 0);
    c.bezierCurveTo(-.05*s, -.10*s, -.22*s, -.18*s, -.22*s, -.36*s); c.closePath(); };
  glass(); c.fillStyle = 'rgba(190,240,255,.28)'; c.fill();
  c.save(); glass(); c.clip();
  /* песок сверху */
  c.fillStyle = lin(c, 0, -.3*s, 0, 0, [[0, '#d8fbff'], [1, '#4fc8f0']]);
  c.beginPath(); c.moveTo(-.2*s, -.16*s); c.quadraticCurveTo(0, -.10*s, .2*s, -.16*s); c.lineTo(.2*s, -.10*s); c.bezierCurveTo(.2*s, -.06*s, .05*s, -.04*s, .02*s, 0); c.lineTo(-.02*s, 0); c.bezierCurveTo(-.05*s, -.04*s, -.2*s, -.06*s, -.2*s, -.10*s); c.closePath(); c.fill();
  /* струйка */
  c.strokeStyle = '#9ff0ff'; c.lineWidth = lw(s, .01); c.beginPath(); c.moveTo(0, -.02*s); c.lineTo(0, .20*s); c.stroke();
  /* песок снизу */
  c.fillStyle = lin(c, 0, .12*s, 0, .36*s, [[0, '#d8fbff'], [1, '#2aa4d8']]);
  c.beginPath(); c.moveTo(-.22*s, .36*s); c.quadraticCurveTo(-.1*s, .22*s, 0, .18*s); c.quadraticCurveTo(.1*s, .22*s, .22*s, .36*s); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-.14*s, -.22*s, .025*s, .10*s, .2, 0, TAU); c.fill();
  c.restore();
  glass(); c.strokeStyle = 'rgba(30,70,100,.9)'; c.lineWidth = lw(s, .02); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = lw(s, .01); c.beginPath(); c.moveTo(-.17*s, -.32*s); c.bezierCurveTo(-.17*s, -.2*s, -.05*s, -.12*s, -.03*s, -.04*s); c.stroke();
  /* золотые плиты */
  for(const y of [-.40, .36]){
    c.fillStyle = lin(c, 0, (y-.01)*s, 0, (y+.07)*s, GOLD); c.strokeStyle = OUT; c.lineWidth = lw(s, .016);
    c.beginPath(); c.moveTo(-.30*s, y*s); c.lineTo(.30*s, y*s); c.lineTo(.30*s, (y+.06)*s); c.lineTo(-.30*s, (y+.06)*s); c.closePath(); c.fill(); c.stroke();
  }
  gemAt(c, s, 0, -.37, .028, '#e8fcff', '#2a8ad8');
  gemAt(c, s, 0, .39, .028, '#e8fcff', '#2a8ad8');
  /* кольцо времени */
  c.save(); c.strokeStyle = 'rgba(160,240,255,.55)'; c.lineWidth = lw(s, .012); c.setLineDash([s * .03, s * .025]);
  c.beginPath(); c.ellipse(0, 0, .40*s, .12*s, -.2, 0, TAU); c.stroke(); c.restore();
  sparkle(c, s, .36, -.28, .024, '#ffffff', '#8fe3ff');
  sparkle(c, s, -.36, .22, .02, '#ffffff', '#8fe3ff');
}

/* ================= КОСА ЖНЕЦА ================= */
function paintScythe(c, s){
  glow(c, s, '#b04cff', -.05);
  groundShadow(c, s, 0, .48, .28);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.rotate(-.32);
  /* древко */
  c.strokeStyle = 'rgba(10,4,20,.95)'; c.lineWidth = lw(s, .06); c.beginPath(); c.moveTo(0, .50*s); c.lineTo(0, -.36*s); c.stroke();
  c.strokeStyle = lin(c, -.03*s, 0, .03*s, 0, [[0, '#6a5a7a'], [.5, '#3a2a4a'], [1, '#150c22']]); c.lineWidth = lw(s, .042); c.beginPath(); c.moveTo(0, .50*s); c.lineTo(0, -.36*s); c.stroke();
  c.strokeStyle = 'rgba(190,150,255,.5)'; c.lineWidth = lw(s, .008); c.beginPath(); c.moveTo(-.01*s, .46*s); c.lineTo(-.01*s, -.30*s); c.stroke();
  /* обмотки */
  c.strokeStyle = '#7a5a2a'; c.lineWidth = lw(s, .018);
  for(const y of [.22, .26, .30, .34, .38]){ c.beginPath(); c.moveTo(-.026*s, y*s); c.lineTo(.026*s, (y+.012)*s); c.stroke(); }
  /* лезвие */
  const blade = () => { c.beginPath(); c.moveTo(-.02*s, -.36*s);
    c.bezierCurveTo(.16*s, -.50*s, .46*s, -.42*s, .54*s, -.08*s);
    c.bezierCurveTo(.40*s, -.26*s, .22*s, -.28*s, .02*s, -.28*s); c.closePath(); };
  c.save(); c.shadowColor = '#b04cff'; c.shadowBlur = s * .08;
  blade(); c.fillStyle = lin(c, 0, -.5*s, .5*s, -.1*s, [[0, '#f4ecff'], [.35, '#c8a6ff'], [.7, '#7a3fc8'], [1, '#2c1260']]); c.fill(); c.restore();
  blade(); c.strokeStyle = 'rgba(20,6,44,.95)'; c.lineWidth = lw(s, .024); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = lw(s, .01); c.beginPath(); c.moveTo(.04*s, -.36*s); c.bezierCurveTo(.2*s, -.45*s, .42*s, -.38*s, .50*s, -.12*s); c.stroke();
  /* крепление */
  c.fillStyle = lin(c, -.07*s, 0, .07*s, 0, SILVER); c.strokeStyle = 'rgba(14,10,30,.95)'; c.lineWidth = lw(s, .014);
  c.beginPath(); c.rect(-.06*s, -.40*s, .12*s, .09*s); c.fill(); c.stroke();
  gemAt(c, s, 0, -.355, .03, '#e8ccff', '#7a22d0');
  c.restore();
  /* дымка */
  c.fillStyle = 'rgba(176,76,255,.18)';
  for(const [x, y, r] of [[-.30, .36, .08], [.30, .30, .06], [-.18, .24, .05]]){ c.beginPath(); c.arc(x*s, y*s, r*s, 0, TAU); c.fill(); }
  sparkle(c, s, .38, -.36, .026, '#f0e0ff', '#b04cff');
  sparkle(c, s, -.34, -.16, .02, '#f0e0ff', '#b04cff');
}

/* ================= ПЕРО ФЕНИКСА ================= */
function paintPhoenix(c, s){
  glow(c, s, '#ff8a3d', 0);
  groundShadow(c, s, 0, .48, .26);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.rotate(.36);
  const vane = () => { c.beginPath(); c.moveTo(0, .30*s);
    c.bezierCurveTo(.22*s, .20*s, .32*s, -.12*s, .10*s, -.46*s);
    c.bezierCurveTo(.06*s, -.50*s, .02*s, -.52*s, 0, -.52*s);
    c.bezierCurveTo(-.02*s, -.52*s, -.06*s, -.50*s, -.10*s, -.46*s);
    c.bezierCurveTo(-.32*s, -.12*s, -.22*s, .20*s, 0, .30*s); c.closePath(); };
  c.save(); c.shadowColor = '#ff7a2a'; c.shadowBlur = s * .08;
  vane(); c.fillStyle = lin(c, 0, .3*s, 0, -.52*s, [[0, '#a8101c'], [.3, '#ff3a22'], [.62, '#ff9a2e'], [1, '#fff2a0']]); c.fill(); c.restore();
  c.save(); vane(); c.clip();
  /* бородки */
  c.strokeStyle = 'rgba(255,230,150,.45)'; c.lineWidth = lw(s, .008);
  for(let i = 0; i < 16; i++){ const y = .24 - i*.045; for(const d of [-1, 1]){ c.beginPath(); c.moveTo(0, y*s); c.lineTo(d*.26*s, (y - .09)*s); c.stroke(); } }
  /* тёмный нижний край */
  c.fillStyle = 'rgba(80,0,10,.25)'; c.beginPath(); c.ellipse(.16*s, .02*s, .12*s, .34*s, 0, 0, TAU); c.fill();
  c.restore();
  vane(); c.strokeStyle = 'rgba(80,12,6,.95)'; c.lineWidth = lw(s, .022); c.stroke();
  /* стержень */
  c.strokeStyle = 'rgba(90,40,10,.95)'; c.lineWidth = lw(s, .03); c.beginPath(); c.moveTo(0, .50*s); c.lineTo(0, -.44*s); c.stroke();
  c.strokeStyle = lin(c, 0, .5*s, 0, -.44*s, [[0, '#8a5a2a'], [.4, '#ffd070'], [1, '#fff6c0']]); c.lineWidth = lw(s, .016); c.beginPath(); c.moveTo(0, .50*s); c.lineTo(0, -.44*s); c.stroke();
  /* язычки пламени у кончика */
  c.fillStyle = 'rgba(255,200,80,.85)';
  for(const [x, y, r] of [[.0, -.58, .03], [-.10, -.52, .022], [.10, -.52, .022]]){ c.beginPath(); c.moveTo((x-r)*s, (y+r)*s); c.quadraticCurveTo(x*s, (y-r*3)*s, (x+r)*s, (y+r)*s); c.closePath(); c.fill(); }
  c.restore();
  sparkle(c, s, .30, -.34, .024, '#fff0b0', '#ff9a2e');
  sparkle(c, s, -.34, .06, .02, '#fff0b0', '#ff9a2e');
  sparkle(c, s, .34, .22, .018, '#ffd070', '#ff6a1e');
}

/* ================= ВЕЙКЕР ВЕТРА ================= */
function paintWindWaker(c, s){
  glow(c, s, '#7fe9d4', 0);
  groundShadow(c, s, 0, .46, .32);
  c.lineJoin = 'round'; c.lineCap = 'round';
  /* завитки ветра по бокам */
  c.strokeStyle = 'rgba(190,255,240,.75)'; c.lineWidth = lw(s, .022);
  for(const d of [-1, 1]){
    c.beginPath(); c.moveTo(d*.30*s, -.18*s); c.bezierCurveTo(d*.50*s, -.26*s, d*.54*s, -.04*s, d*.40*s, -.04*s); c.stroke();
    c.beginPath(); c.moveTo(d*.32*s, .16*s); c.bezierCurveTo(d*.52*s, .08*s, d*.54*s, .30*s, d*.42*s, .30*s); c.stroke();
  }
  /* серебряное кольцо */
  c.fillStyle = lin(c, -.34*s, -.34*s, .34*s, .34*s, SILVER); c.strokeStyle = 'rgba(14,24,40,.95)'; c.lineWidth = lw(s, .018);
  c.beginPath(); c.arc(0, 0, .34*s, 0, TAU); c.fill(); c.stroke();
  /* шар */
  c.beginPath(); c.arc(0, 0, .28*s, 0, TAU);
  c.fillStyle = rad(c, -.08*s, -.10*s, 0, .30*s, [[0, '#e8fff8'], [.35, '#6ae8cc'], [.8, '#12806e'], [1, '#08463e']]); c.fill();
  c.strokeStyle = 'rgba(6,50,44,.95)'; c.lineWidth = lw(s, .016); c.stroke();
  /* вихрь */
  c.save(); c.beginPath(); c.arc(0, 0, .28*s, 0, TAU); c.clip();
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = lw(s, .028);
  c.beginPath(); for(let i = 0; i <= 60; i++){ const t = i/60, a = t*TAU*1.9, r = (.03 + .22*t)*s; const x = Math.cos(a)*r, y = Math.sin(a)*r; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
  c.strokeStyle = 'rgba(190,255,240,.5)'; c.lineWidth = lw(s, .016);
  c.beginPath(); for(let i = 0; i <= 60; i++){ const t = i/60, a = t*TAU*1.9 + Math.PI, r = (.03 + .22*t)*s; const x = Math.cos(a)*r, y = Math.sin(a)*r; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-.10*s, -.16*s, .08*s, .04*s, -.5, 0, TAU); c.fill();
  c.restore();
  /* заклёпки кольца */
  for(let i = 0; i < 6; i++){ const a = i*TAU/6 + .3; gemAt(c, s, Math.cos(a)*.31, Math.sin(a)*.31, .018, '#ffffff', '#4a6aa0'); }
  sparkle(c, s, .02, -.44, .024, '#ffffff', '#7fe9d4');
  sparkle(c, s, -.44, .02, .02, '#e0fff8', '#7fe9d4');
}

/* ================= СВЯТОЙ МЕДАЛЬОН ================= */
function paintLocket(c, s){
  glow(c, s, '#ffd978', 0.03);
  groundShadow(c, s, 0, .48, .30);
  c.lineJoin = 'round'; c.lineCap = 'round';
  /* цепочка */
  c.strokeStyle = 'rgba(40,24,6,.95)'; c.lineWidth = lw(s, .03);
  c.beginPath(); c.moveTo(-.04*s, -.18*s); c.bezierCurveTo(-.36*s, -.30*s, -.30*s, -.52*s, 0, -.52*s); c.bezierCurveTo(.30*s, -.52*s, .36*s, -.30*s, .04*s, -.18*s); c.stroke();
  c.strokeStyle = lin(c, -.3*s, -.5*s, .3*s, -.2*s, GOLD); c.lineWidth = lw(s, .018); c.setLineDash([s * .025, s * .012]);
  c.beginPath(); c.moveTo(-.04*s, -.18*s); c.bezierCurveTo(-.36*s, -.30*s, -.30*s, -.52*s, 0, -.52*s); c.bezierCurveTo(.30*s, -.52*s, .36*s, -.30*s, .04*s, -.18*s); c.stroke(); c.setLineDash([]);
  /* ушко */
  c.fillStyle = lin(c, -.05*s, 0, .05*s, 0, GOLD); c.strokeStyle = OUT; c.lineWidth = lw(s, .014);
  c.beginPath(); c.ellipse(0, -.17*s, .045*s, .035*s, 0, 0, TAU); c.fill(); c.stroke();
  /* корпус */
  const body = () => { c.beginPath(); c.moveTo(0, -.14*s); c.bezierCurveTo(.28*s, -.14*s, .36*s, .10*s, .30*s, .26*s); c.bezierCurveTo(.24*s, .44*s, .08*s, .48*s, 0, .48*s);
    c.bezierCurveTo(-.08*s, .48*s, -.24*s, .44*s, -.30*s, .26*s); c.bezierCurveTo(-.36*s, .10*s, -.28*s, -.14*s, 0, -.14*s); c.closePath(); };
  body(); c.fillStyle = lin(c, -.3*s, -.1*s, .3*s, .46*s, GOLD); c.fill(); c.strokeStyle = OUT; c.lineWidth = lw(s, .026); c.stroke();
  /* вставка */
  c.save(); c.translate(0, .17*s); c.scale(.80, .80); c.translate(0, -.17*s);
  body(); c.fillStyle = rad(c, -.06*s, .06*s, 0, .36*s, [[0, '#fffbe8'], [.5, '#fbe49a'], [1, '#d9a23c']]); c.fill(); c.strokeStyle = 'rgba(120,76,10,.9)'; c.lineWidth = lw(s, .014); c.stroke(); c.restore();
  /* цветок */
  c.save(); c.translate(0, .17*s);
  for(let i = 0; i < 6; i++){
    c.save(); c.rotate(i*TAU/6); c.fillStyle = lin(c, 0, -.04*s, 0, -.17*s, [[0, '#ffe7a6'], [1, '#e8a43a']]); c.strokeStyle = 'rgba(120,70,8,.9)'; c.lineWidth = lw(s, .01);
    c.beginPath(); c.moveTo(0, -.03*s); c.bezierCurveTo(.07*s, -.08*s, .06*s, -.17*s, 0, -.19*s); c.bezierCurveTo(-.06*s, -.17*s, -.07*s, -.08*s, 0, -.03*s); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  c.restore();
  gemAt(c, s, 0, .17, .04, '#ffffff', '#f0c050');
  /* жемчужины по краю */
  for(const [x, y] of [[-.27, .20], [.27, .20], [-.20, .38], [.20, .38], [0, .46]]) gemAt(c, s, x, y, .02, '#ffffff', '#c8d0e0');
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-.20*s, .04*s, .03*s, .10*s, .3, 0, TAU); c.fill();
  sparkle(c, s, .36, -.06, .026, '#fff6c8', '#ffd978');
  sparkle(c, s, -.38, .34, .02, '#fff6c8', '#ffd978');
}

/* ================= НУЛЛИФИКАТОР ================= */
function paintNullifier(c, s){
  glow(c, s, '#b07cff', 0);
  groundShadow(c, s, 0, .48, .30);
  c.lineJoin = 'round'; c.lineCap = 'round';
  /* шипы-осколки вокруг */
  for(let i = 0; i < 8; i++){
    c.save(); c.rotate(i*TAU/8 + .2);
    c.fillStyle = lin(c, 0, -.30*s, 0, -.46*s, [[0, '#6a2ec0'], [1, '#e0c8ff']]); c.strokeStyle = 'rgba(20,6,44,.95)'; c.lineWidth = lw(s, .012);
    c.beginPath(); c.moveTo(-.035*s, -.30*s); c.lineTo(0, -.46*s); c.lineTo(.035*s, -.30*s); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  /* шар */
  c.beginPath(); c.arc(0, 0, .31*s, 0, TAU);
  c.fillStyle = rad(c, -.08*s, -.10*s, 0, .34*s, [[0, '#6a3aa8'], [.45, '#2a1250'], [1, '#070210']]); c.fill();
  c.strokeStyle = 'rgba(14,4,32,.98)'; c.lineWidth = lw(s, .024); c.stroke();
  c.save(); c.beginPath(); c.arc(0, 0, .31*s, 0, TAU); c.clip();
  c.strokeStyle = 'rgba(176,124,255,.22)'; c.lineWidth = lw(s, .02);
  for(let k = 0; k < 3; k++){ c.beginPath(); c.arc(-.1*s + k*.05*s, .12*s, (.16 + k*.09)*s, 3.6, 5.4); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-.14*s, -.18*s, .09*s, .04*s, -.6, 0, TAU); c.fill();
  c.restore();
  /* знак пустоты */
  c.save(); c.shadowColor = '#c89cff'; c.shadowBlur = s * .06;
  c.strokeStyle = lin(c, -.2*s, -.2*s, .2*s, .2*s, [[0, '#f4e8ff'], [.5, '#b07cff'], [1, '#6a2ec0']]); c.lineWidth = lw(s, .036);
  c.beginPath(); c.arc(0, 0, .17*s, 0, TAU); c.stroke();
  c.beginPath(); c.moveTo(-.12*s, .12*s); c.lineTo(.12*s, -.12*s); c.stroke(); c.restore();
  /* руны-риски */
  c.strokeStyle = 'rgba(224,200,255,.8)'; c.lineWidth = lw(s, .012);
  for(let i = 0; i < 12; i++){ const a = i*TAU/12; c.beginPath(); c.moveTo(Math.cos(a)*.24*s, Math.sin(a)*.24*s); c.lineTo(Math.cos(a)*.27*s, Math.sin(a)*.27*s); c.stroke(); }
  sparkle(c, s, .38, -.30, .026, '#f0e0ff', '#b07cff');
  sparkle(c, s, -.40, .24, .02, '#f0e0ff', '#b07cff');
  sparkle(c, s, .34, .34, .016, '#f0e0ff', '#b07cff');
}

/* ================= ЯЙЦО-ГОЛЛИ ================= */
function paintEgg(c, s){
  glow(c, s, '#8be9fd', 0.02);
  groundShadow(c, s, 0, .47, .30);
  c.lineJoin = 'round'; c.lineCap = 'round';
  /* кристаллы инея у основания */
  for(const [x, rot, k] of [[-.26, -.5, .8], [.27, .55, .75], [-.12, -.2, .55], [.14, .22, .6]]){
    c.save(); c.translate(x*s, .40*s); c.rotate(rot); c.scale(k, k);
    c.fillStyle = lin(c, 0, 0, 0, -.2*s, [[0, '#3aa6dc'], [1, '#dffbff']]); c.strokeStyle = 'rgba(10,50,90,.95)'; c.lineWidth = lw(s, .014);
    c.beginPath(); c.moveTo(-.04*s, 0); c.lineTo(0, -.20*s); c.lineTo(.04*s, 0); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  const egg = () => { c.beginPath(); c.moveTo(0, -.46*s); c.bezierCurveTo(.26*s, -.46*s, .36*s, -.06*s, .34*s, .16*s); c.bezierCurveTo(.32*s, .38*s, .16*s, .46*s, 0, .46*s);
    c.bezierCurveTo(-.16*s, .46*s, -.32*s, .38*s, -.34*s, .16*s); c.bezierCurveTo(-.36*s, -.06*s, -.26*s, -.46*s, 0, -.46*s); c.closePath(); };
  egg(); c.fillStyle = lin(c, -.34*s, -.4*s, .34*s, .46*s, [[0, '#f2fdff'], [.3, '#a8e8fa'], [.7, '#4aa8e0'], [1, '#1c4c98']]); c.fill();
  c.save(); egg(); c.clip();
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(-.16*s, -.14*s, .06*s, .20*s, .25, 0, TAU); c.fill();
  c.fillStyle = 'rgba(20,60,130,.3)'; c.beginPath(); c.ellipse(.30*s, .16*s, .18*s, .34*s, .1, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.55)';
  for(const [x, y, r] of [[.10, -.30, .012], [-.05, -.18, .01], [.22, -.06, .012], [-.22, .12, .012], [.05, .30, .01], [.18, .22, .01], [-.12, .32, .012]]){ c.beginPath(); c.arc(x*s, y*s, r*s, 0, TAU); c.fill(); }
  /* свет изнутри трещины */
  c.save(); c.shadowColor = '#ffffff'; c.shadowBlur = s * .05; c.strokeStyle = '#ffffff'; c.lineWidth = lw(s, .028);
  c.beginPath(); c.moveTo(-.10*s, -.04*s); c.lineTo(-.02*s, .04*s); c.lineTo(-.08*s, .12*s); c.lineTo(.04*s, .18*s); c.lineTo(-.02*s, .27*s); c.stroke(); c.restore();
  c.restore();
  egg(); c.strokeStyle = 'rgba(8,30,80,.95)'; c.lineWidth = lw(s, .026); c.stroke();
  c.strokeStyle = 'rgba(8,30,80,.9)'; c.lineWidth = lw(s, .012);
  c.beginPath(); c.moveTo(-.10*s, -.04*s); c.lineTo(-.02*s, .04*s); c.lineTo(-.08*s, .12*s); c.lineTo(.04*s, .18*s); c.lineTo(-.02*s, .27*s); c.stroke();
  sparkle(c, s, .30, -.30, .026, '#ffffff', '#8be9fd');
  sparkle(c, s, -.38, -.02, .02, '#e0fcff', '#8be9fd');
}

window.__reg3d('mango', paintMango, 1.2);
window.__reg3d('tango', paintTango, 1.2);
window.__reg3d('manaTome', paintTome, 1.2);
window.__reg3d('manaHooves', paintHooves, 1.22);
window.__reg3d('aghanimShard', paintShard, 1.2);
window.__reg3d('chronoHourglass', paintHourglass, 1.22);
window.__reg3d('reaperScythe', paintScythe, 1.24);
window.__reg3d('phoenixFeather', paintPhoenix, 1.24);
window.__reg3d('windWaker', paintWindWaker, 1.22);
window.__reg3d('holyLocket', paintLocket, 1.2);
window.__reg3d('nullifier', paintNullifier, 1.22);
window.__reg3d('eggGolly', paintEgg, 1.2);
try { window.__paint3dIds = (window.__paint3dIds || []).concat(['mango', 'tango', 'manaTome', 'manaHooves', 'aghanimShard', 'chronoHourglass', 'reaperScythe', 'phoenixFeather', 'windWaker', 'holyLocket', 'nullifier', 'eggGolly']); } catch(e) {}
})();
