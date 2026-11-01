/* DotaSense 0.10.5.2 — ЕЩЁ ДЕСЯТЬ 3D-ИКОНОК ПРЕДМЕТОВ (по принципу update0105.js и update01051.js):
   Клыки Васьки, Топорик, Подушка тимура, Гур, Оторванный Глаз Мозгов, Мунуция, Рефрешер орб, Octarine Core, Око Бездны, Плащ Тихого Часа.
   • Клыки Васьки — два скрещённых клыка из слоновой кости в золотых оправах, острия светятся красным, в центре рубин.
   • Топорик — деревянное топорище с кожаной обмоткой и стальное лезвие с бликом по режущей кромке.
   • Подушка тимура — пухлая голубая подушка с золотыми кисточками по углам, швом, пуговицей и сонными «z».
   • Гур — пара ледяных крыльев вокруг голубого кристалла со стрелкой вверх.
   • Оторванный Глаз Мозгов — розовое глазное яблоко с жилками, радужкой, вертикальным зрачком и оторванным нервом.
   • Мунуция — золотая шестерня, перед ней веером три латунных патрона с медными пулями.
   • Рефрешер орб — бирюзовый шар с двумя круговыми стрелками в золотой оправе-когтях.
   • Octarine Core — фиолетово-бирюзовый октаэдр, вокруг него серебряное кольцо с рунами.
   • Око Бездны — чёрный шар с шипами и алым глазом со зрачком-щелью.
   • Плащ Тихого Часа — индиго-плащ с капюшоном, серебряной застёжкой, полумесяцем и звёздами.
   Рисуются один раз в скрытый canvas (кэш), поэтому на скорость игры не влияют. Подключается после update01051.js. */
(function(){
'use strict';
if(typeof window.__reg3d !== 'function' || !window.__3dh) return;
const {lin, glow, groundShadow, lw, TAU} = window.__3dh;
const GOLD = [[0, '#fff3b0'], [.4, '#e2a93a'], [.8, '#8a5a14'], [1, '#3b2508']];
const SILVER = [[0, '#ffffff'], [.4, '#c4d0e0'], [.8, '#68788f'], [1, '#2a3444']];
const OUT = 'rgba(30,18,6,.92)';

function poly(c, pts, s){ c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x*s, y*s) : c.moveTo(x*s, y*s)); c.closePath(); }
function rad(c, x, y, r0, r1, stops){ const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
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

/* ================= КЛЫКИ ВАСЬКИ ================= */
function paintFangs(c, s){
  glow(c, s, '#ff6a6a', 0);
  groundShadow(c, s, 0, .46, .30);
  c.lineJoin = 'round'; c.lineCap = 'round';
  function fang(rot){
    c.save(); c.rotate(rot); c.translate(0, .02*s);
    const body = () => {
      c.beginPath(); c.moveTo(-.12*s, -.42*s);
      c.bezierCurveTo(-.15*s, -.10*s, -.08*s, .20*s, .05*s, .47*s);
      c.bezierCurveTo(.10*s, .16*s, .14*s, -.12*s, .12*s, -.42*s); c.closePath();
    };
    c.save(); c.translate(-.03*s, .025*s); body(); c.fillStyle = '#4a3a28'; c.fill(); c.restore();
    body(); c.fillStyle = lin(c, -.14*s, 0, .14*s, 0, [[0, '#7c6a52'], [.35, '#fffaf0'], [.7, '#e6d9bf'], [1, '#8a7a62']]); c.fill();
    c.save(); body(); c.clip();
    c.fillStyle = lin(c, 0, .08*s, 0, .47*s, [[0, 'rgba(255,60,60,0)'], [1, 'rgba(255,40,50,.75)']]); c.fillRect(-.3*s, .08*s, .6*s, .45*s);
    c.restore();
    body(); c.strokeStyle = 'rgba(50,35,20,.9)'; c.lineWidth = lw(s, .02); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = lw(s, .016);
    c.beginPath(); c.moveTo(-.05*s, -.28*s); c.quadraticCurveTo(-.08*s, -.02*s, -.01*s, .20*s); c.stroke();
    /* золотая оправа у основания */
    c.fillStyle = lin(c, 0, -.46*s, 0, -.32*s, GOLD); c.strokeStyle = OUT; c.lineWidth = lw(s, .016);
    c.beginPath(); c.moveTo(-.14*s, -.34*s); c.lineTo(-.13*s, -.46*s); c.lineTo(.13*s, -.46*s); c.lineTo(.14*s, -.34*s);
    c.quadraticCurveTo(0, -.30*s, -.14*s, -.34*s); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  c.save(); c.scale(.92, .92);
  fang(.42); fang(-.42);
  c.restore();
  gemAt(c, s, 0, -.04, .075, '#ff6a7e', '#6a0a18');
  c.strokeStyle = lin(c, -.1*s, -.1*s, .1*s, .06*s, GOLD); c.lineWidth = lw(s, .02);
  c.beginPath(); c.arc(0, -.04*s, .088*s, 0, TAU); c.stroke();
  sparkle(c, s, .30, .34, .04, '#ffffff', '#ff6a6a');
  sparkle(c, s, -.34, .30, .03, '#ffe0e0', '#ff6a6a');
}

/* ================= ТОПОРИК ================= */
function paintHatchet(c, s){
  glow(c, s, '#e0a060', 0);
  groundShadow(c, s, 0, .46, .26);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.rotate(-.48); c.translate(-.02*s, .0);
  /* рукоять */
  c.save(); c.translate(-.025*s, .02*s); c.fillStyle = '#2a170a'; c.fillRect(-.05*s, -.36*s, .10*s, .84*s); c.restore();
  c.fillStyle = lin(c, -.05*s, 0, .05*s, 0, [[0, '#7a4a22'], [.4, '#d9a066'], [1, '#5a3314']]);
  c.strokeStyle = OUT; c.lineWidth = lw(s, .018);
  c.beginPath(); c.rect(-.05*s, -.36*s, .10*s, .84*s); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(60,30,10,.45)'; c.lineWidth = lw(s, .008);
  for(const x of [-.02, .015]){ c.beginPath(); c.moveTo(x*s, -.30*s); c.quadraticCurveTo((x+.01)*s, 0, x*s, .30*s); c.stroke(); }
  /* кожаная обмотка */
  c.fillStyle = lin(c, -.05*s, 0, .05*s, 0, [[0, '#3a2012'], [.4, '#8a5232'], [1, '#2a160c']]);
  c.beginPath(); c.rect(-.055*s, .20*s, .11*s, .22*s); c.fill(); c.strokeStyle = OUT; c.lineWidth = lw(s, .014); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = lw(s, .01);
  for(let y = .24; y < .42; y += .045){ c.beginPath(); c.moveTo(-.055*s, y*s); c.lineTo(.055*s, (y+.03)*s); c.stroke(); }
  /* навершие */
  c.fillStyle = lin(c, -.07*s, 0, .07*s, 0, GOLD); c.beginPath(); c.ellipse(0, .46*s, .068*s, .04*s, 0, 0, TAU); c.fill(); c.strokeStyle = OUT; c.stroke();
  /* обух */
  c.fillStyle = lin(c, -.14*s, 0, -.04*s, 0, [[0, '#6a7a92'], [.5, '#d4dfee'], [1, '#56667e']]);
  c.beginPath(); c.rect(-.14*s, -.40*s, .12*s, .24*s); c.fill(); c.strokeStyle = 'rgba(15,22,35,.95)'; c.lineWidth = lw(s, .02); c.stroke();
  /* лезвие */
  const blade = () => { c.beginPath(); c.moveTo(-.04*s, -.42*s); c.lineTo(.08*s, -.42*s); c.lineTo(.30*s, -.48*s);
    c.quadraticCurveTo(.50*s, -.28*s, .32*s, -.04*s); c.lineTo(.08*s, -.14*s); c.lineTo(-.04*s, -.14*s); c.closePath(); };
  c.save(); c.translate(-.025*s, .025*s); blade(); c.fillStyle = '#1c2636'; c.fill(); c.restore();
  blade(); c.fillStyle = lin(c, .0, -.46*s, .44*s, -.06*s, [[0, '#f8fbff'], [.35, '#b4c4d8'], [.75, '#6a7c96'], [1, '#34425a']]); c.fill();
  c.strokeStyle = 'rgba(15,22,35,.95)'; c.lineWidth = lw(s, .024); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = lw(s, .02);
  c.beginPath(); c.moveTo(.31*s, -.47*s); c.quadraticCurveTo(.47*s, -.28*s, .31*s, -.05*s); c.stroke();
  c.strokeStyle = 'rgba(40,55,80,.6)'; c.lineWidth = lw(s, .012);
  c.beginPath(); c.moveTo(.08*s, -.38*s); c.quadraticCurveTo(.20*s, -.30*s, .22*s, -.14*s); c.stroke();
  c.fillStyle = '#e2a93a'; for(const y of [-.36, -.22]){ c.beginPath(); c.arc(-.08*s, y*s, .016*s, 0, TAU); c.fill(); }
  c.restore();
  sparkle(c, s, .36, -.34, .045, '#ffffff', '#cfe6ff');
}

/* ================= ПОДУШКА ТИМУРА ================= */
function paintPillow(c, s){
  glow(c, s, '#9ed8ff', 0);
  groundShadow(c, s, 0, .44, .36);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.rotate(-.12);
  const body = (k) => { k = k || 1; c.beginPath(); c.moveTo(-.34*s*k, -.28*s*k);
    c.quadraticCurveTo(0, -.46*s*k, .34*s*k, -.28*s*k); c.quadraticCurveTo(.48*s*k, 0, .34*s*k, .28*s*k);
    c.quadraticCurveTo(0, .46*s*k, -.34*s*k, .28*s*k); c.quadraticCurveTo(-.48*s*k, 0, -.34*s*k, -.28*s*k); c.closePath(); };
  /* тёмная нижняя сторона для объёма */
  c.save(); c.translate(-.03*s, .05*s); body(); c.fillStyle = '#35609a'; c.fill(); c.restore();
  /* кисточки */
  for(const [x, y, a] of [[-.34, -.28, -2.4], [.34, -.28, -.74], [.34, .28, .74], [-.34, .28, 2.4]]){
    c.save(); c.translate(x*s, y*s); c.rotate(a + Math.PI/2 * 0);
    c.fillStyle = lin(c, 0, 0, 0, .12*s, GOLD); c.strokeStyle = OUT; c.lineWidth = lw(s, .012);
    c.beginPath(); c.arc(.0, -.0, .03*s, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-.025*s, .02*s); c.lineTo(-.045*s, .13*s); c.lineTo(.045*s, .13*s); c.lineTo(.025*s, .02*s); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(80,45,10,.7)'; c.lineWidth = lw(s, .008);
    for(const dx of [-.02, 0, .02]){ c.beginPath(); c.moveTo(dx*s, .05*s); c.lineTo(dx*1.5*s, .13*s); c.stroke(); }
    c.restore();
  }
  body(); c.fillStyle = rad(c, -.14*s, -.18*s, 0, .62*s, [[0, '#ffffff'], [.35, '#cfeaff'], [.75, '#7fbcf0'], [1, '#3a72b8']]); c.fill();
  c.strokeStyle = 'rgba(20,45,90,.9)'; c.lineWidth = lw(s, .026); c.stroke();
  /* шов */
  c.save(); c.setLineDash([s*.035, s*.03]); c.strokeStyle = 'rgba(40,80,140,.65)'; c.lineWidth = lw(s, .012); body(.82); c.stroke(); c.restore();
  /* складки */
  c.strokeStyle = 'rgba(40,80,140,.35)'; c.lineWidth = lw(s, .016);
  for(const [x0, y0, x1, y1] of [[-.30, -.24, -.10, -.04], [.30, -.24, .10, -.04], [.30, .24, .10, .04], [-.30, .24, -.10, .04]]){
    c.beginPath(); c.moveTo(x0*s, y0*s); c.quadraticCurveTo((x0+x1)/2*s, (y0+y1)/2*s - .03*s, x1*s, y1*s); c.stroke();
  }
  /* пуговица */
  c.fillStyle = lin(c, -.04*s, -.04*s, .04*s, .04*s, GOLD); c.strokeStyle = OUT; c.lineWidth = lw(s, .012);
  c.beginPath(); c.arc(0, 0, .042*s, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-.1*s, -.2*s, .09*s, .04*s, -.5, 0, TAU); c.fill();
  c.restore();
  /* сонные z */
  c.strokeStyle = '#ffffff'; c.lineWidth = lw(s, .028); c.shadowColor = '#7fcfff'; c.shadowBlur = s * .05;
  for(const [x, y, r] of [[.30, -.40, .05], [.40, -.30, .035]]){
    c.beginPath(); c.moveTo((x-r)*s, (y-r)*s); c.lineTo((x+r)*s, (y-r)*s); c.lineTo((x-r)*s, (y+r)*s); c.lineTo((x+r)*s, (y+r)*s); c.stroke();
  }
  c.shadowBlur = 0;
}

/* ================= ГУР ================= */
function paintGur(c, s){
  glow(c, s, '#bfeaff', 0);
  groundShadow(c, s, 0, .46, .32);
  c.lineJoin = 'round'; c.lineCap = 'round';
  for(const sx of [-1, 1]){
    for(let i = 3; i >= 0; i--){
      const tx = sx * (.46 - i*.045), ty = -.30 + i*.15, bx = sx*.07, by = .02 + i*.045;
      c.beginPath(); c.moveTo(bx*s, by*s);
      c.quadraticCurveTo(sx*.30*s, (ty - .20)*s, tx*s, ty*s);
      c.quadraticCurveTo(sx*(.26 - i*.02)*s, (ty + .14)*s, bx*s, (by + .09)*s); c.closePath();
      c.fillStyle = lin(c, bx*s, by*s, tx*s, ty*s, [[0, '#d9f2ff'], [.55, '#f4fcff'], [1, '#8fd0f5']]); c.fill();
      c.strokeStyle = 'rgba(30,80,140,.8)'; c.lineWidth = lw(s, .016); c.stroke();
      c.strokeStyle = 'rgba(120,190,240,.7)'; c.lineWidth = lw(s, .008);
      c.beginPath(); c.moveTo(bx*s, (by + .035)*s); c.quadraticCurveTo(sx*.28*s, (ty - .06)*s, (tx - sx*.03)*s, (ty + .01)*s); c.stroke();
    }
  }
  /* кристалл */
  const T = [0, -.28], R = [.15, -.04], B = [0, .30], L = [-.15, -.04], M = [0, -.04];
  c.save(); c.shadowColor = '#9fe0ff'; c.shadowBlur = s * .07; poly(c, [T, R, B, L], s); c.fillStyle = '#2a6ab0'; c.fill(); c.restore();
  const fac = [[[T, R, M], '#ffffff', '#9fe0ff'], [[R, B, M], '#6fc0f5', '#2a78c8'], [[B, L, M], '#4fa0e8', '#1a4fa0'], [[L, T, M], '#d9f4ff', '#6fc0f5']];
  for(const [pts, a, b] of fac){ poly(c, pts, s); c.fillStyle = lin(c, pts[0][0]*s, pts[0][1]*s, pts[1][0]*s, pts[1][1]*s, [[0, a], [1, b]]); c.fill(); c.strokeStyle = 'rgba(235,252,255,.85)'; c.lineWidth = lw(s, .012); c.stroke(); }
  poly(c, [T, R, B, L], s); c.strokeStyle = 'rgba(10,30,80,.95)'; c.lineWidth = lw(s, .022); c.stroke();
  /* стрелка вверх */
  c.save(); c.shadowColor = '#9fe0ff'; c.shadowBlur = s * .06; c.strokeStyle = '#ffffff'; c.lineWidth = lw(s, .045);
  c.beginPath(); c.moveTo(-.12*s, -.36*s); c.lineTo(0, -.47*s); c.lineTo(.12*s, -.36*s); c.stroke(); c.restore();
  sparkle(c, s, .40, .30, .035, '#ffffff', '#9fe0ff');
  sparkle(c, s, -.38, -.40, .03, '#ffffff', '#9fe0ff');
}

/* ================= ОТОРВАННЫЙ ГЛАЗ МОЗГОВ ================= */
function paintBrainEye(c, s){
  glow(c, s, '#ff8fd8', 0);
  groundShadow(c, s, 0, .46, .28);
  c.lineJoin = 'round'; c.lineCap = 'round';
  /* оторванный нерв */
  c.strokeStyle = '#4a0a24'; c.lineWidth = lw(s, .11);
  c.beginPath(); c.moveTo(.18*s, .20*s); c.bezierCurveTo(.36*s, .34*s, .10*s, .42*s, .22*s, .48*s); c.stroke();
  c.strokeStyle = lin(c, .1*s, .2*s, .3*s, .5*s, [[0, '#ff8aa6'], [1, '#c43868']]); c.lineWidth = lw(s, .08);
  c.beginPath(); c.moveTo(.18*s, .20*s); c.bezierCurveTo(.36*s, .34*s, .10*s, .42*s, .22*s, .48*s); c.stroke();
  c.fillStyle = '#c4103a'; c.beginPath(); c.arc(.22*s, .48*s, .04*s, 0, TAU); c.fill();
  /* глазное яблоко */
  const cx = -.03*s, cy = -.06*s, R = .34*s;
  c.save(); c.translate(-.03*s, .035*s); c.fillStyle = '#6a1a40'; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill(); c.restore();
  c.fillStyle = rad(c, cx - R*.35, cy - R*.4, 0, R*1.25, [[0, '#ffffff'], [.5, '#ffdce8'], [1, '#d4608a']]);
  c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
  c.save(); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.clip();
  c.strokeStyle = 'rgba(200,20,60,.65)'; c.lineWidth = lw(s, .008);
  for(let i = 0; i < 12; i++){ const a = i / 12 * TAU + .2, a2 = a + .35;
    c.beginPath(); c.moveTo(cx + Math.cos(a)*R*1.02, cy + Math.sin(a)*R*1.02);
    c.quadraticCurveTo(cx + Math.cos(a2)*R*.75, cy + Math.sin(a2)*R*.75, cx + Math.cos(a)*R*.50, cy + Math.sin(a)*R*.50); c.stroke(); }
  c.restore();
  c.strokeStyle = 'rgba(70,10,40,.95)'; c.lineWidth = lw(s, .024); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
  /* радужка */
  c.save(); c.shadowColor = '#ff5ac8'; c.shadowBlur = s * .05;
  c.fillStyle = rad(c, cx, cy, 0, R*.55, [[0, '#ffd0f4'], [.45, '#ff5ac8'], [1, '#6a1090']]);
  c.beginPath(); c.arc(cx, cy, R*.52, 0, TAU); c.fill(); c.restore();
  c.strokeStyle = 'rgba(60,5,60,.9)'; c.lineWidth = lw(s, .014); c.beginPath(); c.arc(cx, cy, R*.52, 0, TAU); c.stroke();
  c.fillStyle = '#12020e'; c.beginPath(); c.ellipse(cx, cy, R*.12, R*.40, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.95)'; c.beginPath(); c.arc(cx - R*.22, cy - R*.24, R*.09, 0, TAU); c.fill();
  c.beginPath(); c.arc(cx + R*.18, cy + R*.2, R*.04, 0, TAU); c.fill();
}

/* ================= МУНУЦИЯ ================= */
function gearPath(c, cx, cy, ro, ri, n){
  c.beginPath();
  for(let i = 0; i < n; i++){
    const a = i / n * TAU, w = TAU / n, q = w * .22;
    const pts = [[a - q*1.6, ri], [a - q, ro], [a + q, ro], [a + q*1.6, ri]];
    pts.forEach(([ang, r], j) => { const x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r; (i === 0 && j === 0) ? c.moveTo(x, y) : c.lineTo(x, y); });
  }
  c.closePath();
}
function paintMunition(c, s){
  glow(c, s, '#ffd36b', 0);
  groundShadow(c, s, 0, .46, .34);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const gx = 0, gy = -.08*s;
  c.save(); c.translate(-.03*s, .035*s); gearPath(c, gx, gy, .40*s, .31*s, 12); c.fillStyle = '#3b2508'; c.fill(); c.restore();
  gearPath(c, gx, gy, .40*s, .31*s, 12); c.fillStyle = lin(c, -.4*s, -.45*s, .4*s, .3*s, GOLD); c.fill();
  c.strokeStyle = OUT; c.lineWidth = lw(s, .022); c.stroke();
  c.fillStyle = 'rgba(40,24,6,.55)'; c.beginPath(); c.arc(gx, gy, .24*s, 0, TAU); c.fill();
  c.strokeStyle = lin(c, -.25*s, -.3*s, .25*s, .2*s, GOLD); c.lineWidth = lw(s, .03); c.beginPath(); c.arc(gx, gy, .24*s, 0, TAU); c.stroke();
  /* патроны веером */
  function shell(rot){
    c.save(); c.translate(0, .44*s); c.rotate(rot);
    c.fillStyle = lin(c, -.06*s, 0, .06*s, 0, [[0, '#8a5a14'], [.4, '#ffe9a0'], [1, '#7a4c10']]); c.strokeStyle = OUT; c.lineWidth = lw(s, .016);
    c.beginPath(); c.rect(-.055*s, -.30*s, .11*s, .30*s); c.fill(); c.stroke();
    c.fillStyle = lin(c, -.05*s, 0, .05*s, 0, [[0, '#7a3a16'], [.4, '#ffb070'], [1, '#6a3010']]);
    c.beginPath(); c.moveTo(-.055*s, -.30*s); c.lineTo(-.055*s, -.40*s); c.quadraticCurveTo(-.04*s, -.52*s, 0, -.55*s);
    c.quadraticCurveTo(.04*s, -.52*s, .055*s, -.40*s); c.lineTo(.055*s, -.30*s); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = lin(c, -.075*s, 0, .075*s, 0, [[0, '#6a4410'], [.5, '#e8c060'], [1, '#5a3808']]);
    c.beginPath(); c.rect(-.075*s, -.03*s, .15*s, .035*s); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.7)'; c.fillRect(-.03*s, -.27*s, .015*s, .2*s);
    c.restore();
  }
  shell(-.55); shell(.55); shell(0);
  sparkle(c, s, .36, -.36, .04, '#fff7c0', '#ffd36b');
}

/* ================= РЕФРЕШЕР ОРБ ================= */
function arcArrow(c, s, cx, cy, r, a0, a1){
  c.beginPath(); c.arc(cx*s, cy*s, r*s, a0, a1); c.stroke();
  const ex = cx + Math.cos(a1)*r, ey = cy + Math.sin(a1)*r, tx = -Math.sin(a1), ty = Math.cos(a1), nx = Math.cos(a1), ny = Math.sin(a1);
  c.beginPath(); c.moveTo((ex + tx*.08)*s, (ey + ty*.08)*s); c.lineTo((ex + nx*.06)*s, (ey + ny*.06)*s); c.lineTo((ex - nx*.06)*s, (ey - ny*.06)*s); c.closePath(); c.fill();
}
function paintRefresher(c, s){
  glow(c, s, '#7fe9ff', -.06);
  groundShadow(c, s, 0, .47, .26);
  c.lineJoin = 'round'; c.lineCap = 'round';
  /* оправа-когти за шаром */
  c.strokeStyle = lin(c, -.3*s, 0, .3*s, 0, GOLD); c.lineWidth = lw(s, .05);
  for(const sx of [-1, 1]){ c.beginPath(); c.moveTo(sx*.17*s, .36*s); c.quadraticCurveTo(sx*.38*s, .16*s, sx*.30*s, -.02*s); c.stroke(); }
  /* шар */
  const cx = 0, cy = -.08*s, R = .31*s;
  c.save(); c.shadowColor = '#7fe9ff'; c.shadowBlur = s * .07;
  c.fillStyle = rad(c, cx - R*.35, cy - R*.4, 0, R*1.3, [[0, '#f4ffff'], [.35, '#6fe0ff'], [.8, '#1a78c8'], [1, '#0c3a80']]);
  c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill(); c.restore();
  c.strokeStyle = 'rgba(10,40,100,.9)'; c.lineWidth = lw(s, .022); c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.stroke();
  c.save(); c.strokeStyle = '#ffffff'; c.fillStyle = '#ffffff'; c.lineWidth = lw(s, .034); c.shadowColor = '#bff4ff'; c.shadowBlur = s * .04;
  arcArrow(c, s, 0, -.08, .17, .5, 2.7);
  arcArrow(c, s, 0, -.08, .17, 3.64, 5.84);
  c.restore();
  c.fillStyle = 'rgba(255,255,255,.65)'; c.beginPath(); c.ellipse(-.12*s, -.22*s, .06*s, .035*s, -.7, 0, TAU); c.fill();
  /* чаша-основание */
  c.fillStyle = lin(c, -.22*s, 0, .22*s, 0, [[0, '#8a5a14'], [.35, '#fff0a0'], [.7, '#e2a93a'], [1, '#6b4310']]); c.strokeStyle = OUT; c.lineWidth = lw(s, .018);
  c.beginPath(); c.moveTo(-.24*s, .30*s); c.quadraticCurveTo(0, .36*s, .24*s, .30*s); c.lineTo(.14*s, .46*s); c.lineTo(-.14*s, .46*s); c.closePath(); c.fill(); c.stroke();
  gemAt(c, s, 0, .38, .028, '#7fe9ff', '#1a4fa8');
  sparkle(c, s, .36, -.34, .04, '#ffffff', '#7fe9ff');
}

/* ================= OCTARINE CORE ================= */
function paintOctarine(c, s){
  glow(c, s, '#a98cff', 0);
  groundShadow(c, s, 0, .47, .30);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.rotate(-.18);
  const ring = (a0, a1) => { c.beginPath(); c.ellipse(0, .02*s, .47*s, .12*s, 0, a0, a1); };
  c.strokeStyle = 'rgba(20,12,50,.9)'; c.lineWidth = lw(s, .05); ring(Math.PI, TAU); c.stroke();
  c.strokeStyle = lin(c, -.4*s, 0, .4*s, 0, SILVER); c.lineWidth = lw(s, .034); ring(Math.PI, TAU); c.stroke();
  const T = [0, -.46], B = [0, .46], L = [-.30, -.01], R = [.30, -.01], F = [.04, .07];
  c.save(); c.shadowColor = '#b99cff'; c.shadowBlur = s * .08; poly(c, [T, R, B, L], s); c.fillStyle = '#3a1590'; c.fill(); c.restore();
  const fac = [[[T, L, F], '#f2ffff', '#7fe0ff'], [[T, F, R], '#b8f0ff', '#4a9ff0'], [[B, L, F], '#d0a0ff', '#7a30d8'], [[B, F, R], '#9a60f0', '#3a1590']];
  for(const [pts, a, b] of fac){
    poly(c, pts, s); c.fillStyle = lin(c, pts[0][0]*s, pts[0][1]*s, pts[2][0]*s, pts[2][1]*s, [[0, a], [1, b]]); c.fill();
    c.strokeStyle = 'rgba(240,235,255,.85)'; c.lineWidth = lw(s, .014); c.stroke();
  }
  poly(c, [T, R, B, L], s); c.strokeStyle = 'rgba(25,10,70,.95)'; c.lineWidth = lw(s, .026); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(-.08*s, -.22*s, .025*s, .09*s, .45, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(20,12,50,.9)'; c.lineWidth = lw(s, .05); ring(0, Math.PI); c.stroke();
  c.strokeStyle = lin(c, -.4*s, 0, .4*s, 0, SILVER); c.lineWidth = lw(s, .034); ring(0, Math.PI); c.stroke();
  /* руны на кольце */
  c.fillStyle = '#9fe8ff'; c.shadowColor = '#7fd6ff'; c.shadowBlur = s * .03;
  for(const a of [.35, .85, 1.45, 2.05, 2.7]){ c.beginPath(); c.arc(Math.cos(a)*.47*s, (.02 + Math.sin(a)*.12)*s, .014*s, 0, TAU); c.fill(); }
  c.restore();
  sparkle(c, s, .38, -.36, .04, '#ffffff', '#b99cff');
  sparkle(c, s, -.40, .30, .03, '#e8ddff', '#7fd6ff');
}

/* ================= ОКО БЕЗДНЫ ================= */
function paintAbyss(c, s){
  glow(c, s, '#ff4d6d', 0);
  groundShadow(c, s, 0, .47, .30);
  c.lineJoin = 'round'; c.lineCap = 'round';
  /* шипы вокруг */
  const cy = -.02*s;
  for(let i = 0; i < 10; i++){
    const a = i / 10 * TAU + .15, w = .17;
    c.beginPath();
    c.moveTo(Math.cos(a - w)*.36*s, cy + Math.sin(a - w)*.36*s); c.lineTo(Math.cos(a)*(i % 2 ? .47 : .52)*s, cy + Math.sin(a)*(i % 2 ? .47 : .52)*s); c.lineTo(Math.cos(a + w)*.36*s, cy + Math.sin(a + w)*.36*s); c.closePath();
    c.fillStyle = lin(c, 0, cy - .5*s, 0, cy + .5*s, [[0, '#5a1840'], [1, '#14041a']]); c.fill(); c.strokeStyle = 'rgba(255,77,109,.7)'; c.lineWidth = lw(s, .012); c.stroke();
  }
  /* шар */
  c.save(); c.shadowColor = '#ff4d6d'; c.shadowBlur = s * .06;
  c.fillStyle = rad(c, -.1*s, cy - .12*s, 0, .5*s, [[0, '#4a1a40'], [.6, '#1a0618'], [1, '#05010a']]);
  c.beginPath(); c.arc(0, cy, .37*s, 0, TAU); c.fill(); c.restore();
  c.strokeStyle = 'rgba(255,77,109,.9)'; c.lineWidth = lw(s, .02); c.beginPath(); c.arc(0, cy, .37*s, 0, TAU); c.stroke();
  /* глаз */
  const eye = () => { c.beginPath(); c.moveTo(-.30*s, cy); c.quadraticCurveTo(0, cy - .34*s, .30*s, cy); c.quadraticCurveTo(0, cy + .34*s, -.30*s, cy); c.closePath(); };
  c.save(); c.shadowColor = '#ff2a50'; c.shadowBlur = s * .05; eye();
  c.fillStyle = rad(c, 0, cy, 0, .32*s, [[0, '#ffe0c8'], [.35, '#ff5a50'], [1, '#7a0a2a']]); c.fill(); c.restore();
  c.strokeStyle = 'rgba(30,0,10,.95)'; c.lineWidth = lw(s, .022); eye(); c.stroke();
  c.save(); eye(); c.clip();
  c.fillStyle = rad(c, 0, cy, 0, .15*s, [[0, '#ff9a60'], [.6, '#c01030'], [1, '#400010']]); c.beginPath(); c.arc(0, cy, .15*s, 0, TAU); c.fill();
  c.fillStyle = '#05000a'; c.beginPath(); c.ellipse(0, cy, .035*s, .15*s, 0, 0, TAU); c.fill();
  c.restore();
  c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.arc(-.07*s, cy - .06*s, .026*s, 0, TAU); c.fill();
  /* щупальца-завитки снизу */
  c.strokeStyle = 'rgba(255,77,109,.55)'; c.lineWidth = lw(s, .014);
  for(const sx of [-1, 1]){ c.beginPath(); c.moveTo(sx*.10*s, cy + .36*s); c.quadraticCurveTo(sx*.16*s, cy + .46*s, sx*.06*s, cy + .50*s); c.stroke(); }
}

/* ================= ПЛАЩ ТИХОГО ЧАСА ================= */
function paintCloak(c, s){
  glow(c, s, '#8aa7ff', 0);
  groundShadow(c, s, 0, .48, .36);
  c.lineJoin = 'round'; c.lineCap = 'round';
  const body = () => {
    c.beginPath(); c.moveTo(0, -.46*s);
    c.bezierCurveTo(.16*s, -.46*s, .22*s, -.30*s, .22*s, -.20*s);
    c.bezierCurveTo(.40*s, -.08*s, .46*s, .20*s, .44*s, .42*s);
    c.quadraticCurveTo(.33*s, .53*s, .22*s, .45*s); c.quadraticCurveTo(.11*s, .37*s, 0, .45*s);
    c.quadraticCurveTo(-.11*s, .53*s, -.22*s, .45*s); c.quadraticCurveTo(-.33*s, .37*s, -.44*s, .42*s);
    c.bezierCurveTo(-.46*s, .20*s, -.40*s, -.08*s, -.22*s, -.20*s);
    c.bezierCurveTo(-.22*s, -.30*s, -.16*s, -.46*s, 0, -.46*s); c.closePath();
  };
  c.save(); c.translate(-.03*s, .03*s); body(); c.fillStyle = '#0e1038'; c.fill(); c.restore();
  body(); c.fillStyle = lin(c, -.4*s, -.4*s, .4*s, .5*s, [[0, '#9aa8ff'], [.35, '#5560d0'], [.75, '#2a2e88'], [1, '#14165a']]); c.fill();
  c.save(); body(); c.clip();
  c.strokeStyle = 'rgba(10,12,60,.55)'; c.lineWidth = lw(s, .03);
  for(const [x0, x1] of [[-.10, -.28], [.10, .26], [0, 0]]){ c.beginPath(); c.moveTo(x0*s, -.12*s); c.quadraticCurveTo((x0+x1)/2*s, .15*s, x1*s, .50*s); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.14)'; c.beginPath(); c.ellipse(-.20*s, .0, .05*s, .26*s, .15, 0, TAU); c.fill();
  c.restore();
  body(); c.strokeStyle = 'rgba(8,8,40,.95)'; c.lineWidth = lw(s, .026); c.stroke();
  /* серебряная кайма подола */
  c.strokeStyle = 'rgba(210,225,255,.85)'; c.lineWidth = lw(s, .014);
  c.beginPath(); c.moveTo(.44*s, .40*s); c.quadraticCurveTo(.33*s, .51*s, .22*s, .43*s); c.quadraticCurveTo(.11*s, .35*s, 0, .43*s);
  c.quadraticCurveTo(-.11*s, .51*s, -.22*s, .43*s); c.quadraticCurveTo(-.33*s, .35*s, -.44*s, .40*s); c.stroke();
  /* капюшон-отверстие */
  c.fillStyle = rad(c, 0, -.28*s, 0, .14*s, [[0, '#000000'], [1, '#0a0c30']]);
  c.beginPath(); c.ellipse(0, -.27*s, .11*s, .14*s, 0, 0, TAU); c.fill(); c.strokeStyle = 'rgba(200,215,255,.7)'; c.lineWidth = lw(s, .014); c.stroke();
  c.fillStyle = '#bfd0ff'; c.shadowColor = '#8aa7ff'; c.shadowBlur = s * .03;
  for(const sx of [-1, 1]){ c.beginPath(); c.ellipse(sx*.04*s, -.28*s, .016*s, .008*s, 0, 0, TAU); c.fill(); }
  c.shadowBlur = 0;
  /* застёжка */
  gemAt(c, s, 0, -.10, .045, '#bfd0ff', '#2a3a90');
  c.strokeStyle = lin(c, -.06*s, -.14*s, .06*s, -.04*s, SILVER); c.lineWidth = lw(s, .016); c.beginPath(); c.arc(0, -.10*s, .052*s, 0, TAU); c.stroke();
  /* полумесяц */
  c.save(); c.shadowColor = '#cfe0ff'; c.shadowBlur = s * .04; c.fillStyle = lin(c, -.1*s, .08*s, .1*s, .24*s, SILVER);
  c.beginPath(); c.arc(0, .17*s, .10*s, 0, TAU); c.arc(.04*s, .15*s, .08*s, 0, TAU, true); c.fill('evenodd'); c.restore();
  sparkle(c, s, -.20, .02, .025, '#ffffff', '#8aa7ff');
  sparkle(c, s, .22, .08, .03, '#ffffff', '#8aa7ff');
  sparkle(c, s, .16, .34, .022, '#dfe8ff', '#8aa7ff');
  sparkle(c, s, -.22, .30, .02, '#dfe8ff', '#8aa7ff');
}

window.__reg3d('fangs', paintFangs, 1.2);
window.__reg3d('hatchet', paintHatchet, 1.22);
window.__reg3d('timurPillow', paintPillow, 1.2);
window.__reg3d('gur', paintGur, 1.22);
window.__reg3d('brainEye', paintBrainEye, 1.2);
window.__reg3d('munition', paintMunition, 1.2);
window.__reg3d('refresherOrb', paintRefresher, 1.22);
window.__reg3d('octarineCore', paintOctarine, 1.22);
window.__reg3d('abyssEye', paintAbyss, 1.2);
window.__reg3d('hushCloak', paintCloak, 1.2);
})();
