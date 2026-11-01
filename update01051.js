/* DotaSense 0.10.5.1 — ЕЩЁ ПЯТЬ 3D-ИКОНОК ПРЕДМЕТОВ (по принципу update0105.js): Блинк, Сатаник, Дагонская империя, Шрам-Аркадия, Аганим Скептер.
   • Блинк — гранёный кристалл с шестью гранями разной яркости, белыми рёбрами и искрами.
   • Сатаник — рогатый багровый щит с золотой каймой и демоническим глазом с вертикальным зрачком.
   • Дагонская империя — жезл с золотыми кольцами и розовым шаром в когтях-держателях, вокруг шара пробегают молнии.
   • Шрам-Аркадия — клинок под углом со светящимся огненным шрамом-трещиной, золотой гардой с рубином и искрами.
   • Аганим Скептер — золотой скипетр с фиолетовым кристаллом в крылатой оправе.
   Рисуются один раз в скрытый canvas (кэш), поэтому на скорость игры не влияют. Подключается после update0105.js. */
(function(){
'use strict';
if(typeof window.__reg3d !== 'function' || !window.__3dh) return;
const {lin, glow, groundShadow, lw, TAU} = window.__3dh;
const GOLD = [[0, '#fff3b0'], [.4, '#e2a93a'], [.8, '#8a5a14'], [1, '#3b2508']];
const OUT = 'rgba(30,18,6,.92)';

function poly(c, pts, s){ c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x*s, y*s) : c.moveTo(x*s, y*s)); c.closePath(); }

/* ================= БЛИНК ================= */
function paintBlink(c, s){
  glow(c, s, '#8fd8ff', 0);
  groundShadow(c, s, 0, .46, .26);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.rotate(-0.22);
  const T = [0, -.47], UL = [-.29, -.17], UR = [.29, -.17], LL = [-.21, .21], LR = [.21, .21], B = [0, .47], C = [.03, .02];
  const facets = [
    [[T, UL, C], '#f2ffff', '#8fe6ff'],
    [[T, C, UR], '#b8f1ff', '#3aa7e8'],
    [[UL, LL, C], '#7fd6ff', '#1f7fd0'],
    [[UR, C, LR], '#4aa8f0', '#1a4fa8'],
    [[LL, B, C], '#3a8fe0', '#16398c'],
    [[LR, C, B], '#1f5cc0', '#0f2260']
  ];
  /* тёмная стенка для объёма */
  c.save(); c.translate(-.05*s, .035*s); poly(c, [T, UR, LR, B, LL, UL], s); c.fillStyle = '#10265e'; c.fill(); c.restore();
  for(const [pts, a, b] of facets){
    poly(c, pts, s);
    c.fillStyle = lin(c, pts[0][0]*s, pts[0][1]*s, pts[2][0]*s, pts[2][1]*s, [[0, a], [1, b]]); c.fill();
    c.strokeStyle = 'rgba(235,252,255,.85)'; c.lineWidth = lw(s, .014); c.stroke();
  }
  poly(c, [T, UR, LR, B, LL, UL], s); c.strokeStyle = 'rgba(10,25,70,.9)'; c.lineWidth = lw(s, .026); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-.10*s, -.22*s, .035*s, .10*s, .55, 0, TAU); c.fill();
  /* искры */
  c.fillStyle = '#ffffff'; c.shadowColor = '#8fe6ff'; c.shadowBlur = s * .05;
  for(const [x, y, r] of [[.38, -.34, .05], [-.40, .22, .035], [.34, .30, .03]]){
    c.beginPath(); c.moveTo(x*s, (y-r*1.6)*s); c.lineTo((x+r*.4)*s, (y-r*.4)*s); c.lineTo((x+r*1.6)*s, y*s); c.lineTo((x+r*.4)*s, (y+r*.4)*s);
    c.lineTo(x*s, (y+r*1.6)*s); c.lineTo((x-r*.4)*s, (y+r*.4)*s); c.lineTo((x-r*1.6)*s, y*s); c.lineTo((x-r*.4)*s, (y-r*.4)*s); c.closePath(); c.fill();
  }
  c.restore();
}

/* ================= САТАНИК ================= */
function shieldPath(c, s){
  c.beginPath();
  c.moveTo(-.36*s, -.20*s); c.quadraticCurveTo(0, -.32*s, .36*s, -.20*s);
  c.lineTo(.34*s, .10*s); c.quadraticCurveTo(.24*s, .32*s, 0, .45*s);
  c.quadraticCurveTo(-.24*s, .32*s, -.34*s, .10*s); c.closePath();
}
function horn(c, s, sx){
  c.beginPath();
  c.moveTo(sx*.12*s, -.27*s); c.quadraticCurveTo(sx*.30*s, -.30*s, sx*.36*s, -.34*s);
  c.quadraticCurveTo(sx*.50*s, -.40*s, sx*.47*s, -.49*s);
  c.quadraticCurveTo(sx*.40*s, -.42*s, sx*.30*s, -.43*s);
  c.quadraticCurveTo(sx*.26*s, -.36*s, sx*.08*s, -.34*s); c.closePath();
}
function paintSatanic(c, s){
  glow(c, s, '#ff4a62', 0);
  groundShadow(c, s, 0, .44, .30);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.rotate(-0.12);
  /* рога */
  for(const sx of [-1, 1]){
    horn(c, s, sx); c.fillStyle = lin(c, sx*.1*s, -.3*s, sx*.5*s, -.5*s, [[0, '#4a1a22'], [.5, '#e8d6c0'], [1, '#fff6e6']]); c.fill();
    c.strokeStyle = 'rgba(30,8,10,.9)'; c.lineWidth = lw(s, .02); c.stroke();
  }
  /* стенка + щит */
  c.save(); c.translate(-.045*s, .04*s); shieldPath(c, s); c.fillStyle = '#2a0610'; c.fill(); c.restore();
  c.save(); shieldPath(c, s); c.clip();
  c.fillStyle = lin(c, -.4*s, -.3*s, .4*s, .45*s, [[0, '#ff8ea0'], [.3, '#d4284a'], [.7, '#8a1230'], [1, '#32050f']]); c.fillRect(-.6*s, -.5*s, 1.2*s, 1.1*s);
  c.fillStyle = lin(c, -.36*s, 0, .36*s, 0, [[0, 'rgba(0,0,0,.3)'], [.3, 'rgba(255,255,255,.2)'], [.55, 'rgba(255,255,255,0)'], [1, 'rgba(0,0,0,.4)']]); c.fillRect(-.5*s, -.4*s, 1*s, .9*s);
  c.restore();
  /* золотая кайма */
  c.save(); c.translate(0, .01*s); c.scale(.86, .86); shieldPath(c, s); c.strokeStyle = lin(c, -.3*s, -.3*s, .3*s, .4*s, GOLD); c.lineWidth = lw(s, .03); c.stroke(); c.restore();
  shieldPath(c, s); c.strokeStyle = 'rgba(30,6,10,.95)'; c.lineWidth = lw(s, .028); c.stroke();
  /* демонический глаз */
  c.fillStyle = lin(c, 0, -.12*s, 0, .1*s, [[0, '#fff3b0'], [.5, '#ffb43a'], [1, '#c4561a']]); c.strokeStyle = OUT; c.lineWidth = lw(s, .018);
  c.beginPath(); c.moveTo(-.22*s, -.01*s); c.quadraticCurveTo(0, -.2*s, .22*s, -.01*s); c.quadraticCurveTo(0, .17*s, -.22*s, -.01*s); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#14040a'; c.beginPath(); c.ellipse(0, -.01*s, .035*s, .095*s, 0, 0, TAU); c.fill();
  c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(-.05*s, -.06*s, .016*s, 0, TAU); c.fill();
  /* заклёпки */
  for(const [x, y] of [[-.27,-.17],[.27,-.17],[0,.30]]){
    const r = c.createRadialGradient((x-.008)*s, (y-.008)*s, 0, x*s, y*s, .028*s); r.addColorStop(0, '#fff3b0'); r.addColorStop(1, '#8a5a14');
    c.fillStyle = r; c.beginPath(); c.arc(x*s, y*s, .024*s, 0, TAU); c.fill();
  }
  c.restore();
}

/* ================= ДАГОНСКАЯ ИМПЕРИЯ ================= */
function paintDagon(c, s){
  glow(c, s, '#ff4f8b', -.12);
  groundShadow(c, s, 0, .45, .22);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.rotate(.42);
  /* древко */
  c.fillStyle = lin(c, -.04*s, 0, .04*s, 0, [[0, '#6a3b24'], [.4, '#c88a5a'], [1, '#2a140c']]);
  c.strokeStyle = OUT; c.lineWidth = lw(s, .018);
  c.beginPath(); c.rect(-.04*s, -.06*s, .08*s, .50*s); c.fill(); c.stroke();
  for(const y of [.0, .14, .28, .40]){
    c.fillStyle = lin(c, -.06*s, 0, .06*s, 0, [[0, '#8a5a14'], [.4, '#fff0a0'], [1, '#6b4310']]);
    c.beginPath(); c.rect(-.058*s, y*s, .116*s, .035*s); c.fill(); c.stroke();
  }
  c.fillStyle = lin(c, 0, .40*s, 0, .48*s, GOLD); c.beginPath(); c.moveTo(-.05*s, .43*s); c.lineTo(0, .5*s); c.lineTo(.05*s, .43*s); c.closePath(); c.fill(); c.stroke();
  /* дальние когти */
  const claw = (sx, back) => {
    c.fillStyle = lin(c, sx*.04*s, -.1*s, sx*.2*s, -.45*s, back ? [[0, '#7a5214'], [1, '#3b2508']] : GOLD);
    c.strokeStyle = OUT; c.lineWidth = lw(s, .016);
    c.beginPath(); c.moveTo(sx*.03*s, -.04*s); c.quadraticCurveTo(sx*.26*s, -.10*s, sx*.22*s, -.30*s);
    c.quadraticCurveTo(sx*.21*s, -.40*s, sx*.13*s, -.44*s); c.quadraticCurveTo(sx*.19*s, -.30*s, sx*.12*s, -.18*s);
    c.quadraticCurveTo(sx*.07*s, -.12*s, sx*.0*s, -.08*s); c.closePath(); c.fill(); c.stroke();
  };
  claw(-1, true); claw(1, true);
  /* шар */
  const orb = c.createRadialGradient(-.05*s, -.30*s, 0, 0, -.24*s, .17*s);
  orb.addColorStop(0, '#ffffff'); orb.addColorStop(.25, '#ffb3d4'); orb.addColorStop(.6, '#ff2f86'); orb.addColorStop(1, '#6a0a3a');
  c.shadowColor = '#ff4f8b'; c.shadowBlur = s * .08;
  c.fillStyle = orb; c.beginPath(); c.arc(0, -.24*s, .165*s, 0, TAU); c.fill(); c.shadowBlur = 0;
  c.strokeStyle = 'rgba(80,6,40,.85)'; c.lineWidth = lw(s, .016); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.75)'; c.beginPath(); c.ellipse(-.06*s, -.31*s, .04*s, .06*s, .6, 0, TAU); c.fill();
  /* передние когти */
  claw(-1, false); claw(1, false);
  /* молнии */
  c.strokeStyle = '#fff0f8'; c.lineWidth = lw(s, .016); c.shadowColor = '#ff8ac4'; c.shadowBlur = s * .04;
  for(const [x0, y0, x1, y1] of [[.17, -.30, .36, -.40], [-.17, -.18, -.36, -.26], [.05, -.42, .12, -.54]]){
    c.beginPath(); c.moveTo(x0*s, y0*s); c.lineTo(((x0+x1)/2 + .03)*s, ((y0+y1)/2 - .03)*s); c.lineTo(((x0+x1)/2 - .02)*s, ((y0+y1)/2 + .03)*s); c.lineTo(x1*s, y1*s); c.stroke();
  }
  c.restore();
}

/* ================= ШРАМ-АРКАДИЯ ================= */
function paintArcadia(c, s){
  glow(c, s, '#ff7043', -.05);
  groundShadow(c, s, 0, .46, .24);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.rotate(.55);
  /* клинок: тёмная грань + светлая грань = объём */
  const blade = [[-.085, .13], [-.085, -.34], [0, -.50], [.085, -.34], [.085, .13]];
  poly(c, blade, s); c.fillStyle = lin(c, -.09*s, 0, .09*s, 0, [[0, '#e9eef5'], [.5, '#9aa6b6'], [.5, '#5a6578'], [1, '#2a3040']]); c.fill();
  c.strokeStyle = OUT; c.lineWidth = lw(s, .022); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = lw(s, .012); c.beginPath(); c.moveTo(-.065*s, .10*s); c.lineTo(-.065*s, -.33*s); c.stroke();
  /* огненный шрам-трещина */
  c.shadowColor = '#ff7a2a'; c.shadowBlur = s * .06; c.strokeStyle = '#ffb03a'; c.lineWidth = lw(s, .028);
  c.beginPath(); c.moveTo(-.08*s, -.24*s); c.lineTo(.0*s, -.17*s); c.lineTo(-.05*s, -.08*s); c.lineTo(.04*s, -.02*s); c.lineTo(-.03*s, .06*s); c.lineTo(.07*s, .12*s); c.stroke();
  c.strokeStyle = '#fff3c0'; c.lineWidth = lw(s, .012); c.stroke(); c.shadowBlur = 0;
  /* искры от шрама */
  c.fillStyle = '#ffd27a'; c.shadowColor = '#ff7a2a'; c.shadowBlur = s * .04;
  for(const [x, y, r] of [[.17, -.12, .016], [.15, -.26, .012], [-.17, -.02, .013]]){ c.beginPath(); c.arc(x*s, y*s, r*s, 0, TAU); c.fill(); }
  c.shadowBlur = 0;
  /* гарда */
  c.fillStyle = lin(c, 0, .12*s, 0, .22*s, GOLD); c.strokeStyle = OUT; c.lineWidth = lw(s, .02);
  c.beginPath(); c.moveTo(-.24*s, .13*s); c.quadraticCurveTo(-.30*s, .22*s, -.20*s, .25*s); c.lineTo(-.05*s, .21*s); c.lineTo(.05*s, .21*s);
  c.lineTo(.20*s, .25*s); c.quadraticCurveTo(.30*s, .22*s, .24*s, .13*s); c.quadraticCurveTo(0, .17*s, -.24*s, .13*s); c.closePath(); c.fill(); c.stroke();
  const rub = c.createRadialGradient(-.01*s, .17*s, 0, 0, .19*s, .05*s); rub.addColorStop(0, '#ffe3e3'); rub.addColorStop(.4, '#ff3b2e'); rub.addColorStop(1, '#6a0a08');
  c.fillStyle = rub; c.beginPath(); c.arc(0, .19*s, .04*s, 0, TAU); c.fill(); c.stroke();
  /* рукоять и навершие */
  c.fillStyle = lin(c, -.04*s, 0, .04*s, 0, [[0, '#6a3b24'], [.4, '#a8623a'], [1, '#2a140c']]);
  c.beginPath(); c.rect(-.04*s, .22*s, .08*s, .17*s); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(255,200,120,.55)'; c.lineWidth = lw(s, .012);
  for(const y of [.26, .30, .34]){ c.beginPath(); c.moveTo(-.04*s, y*s); c.lineTo(.04*s, (y+.02)*s); c.stroke(); }
  const pom = c.createRadialGradient(-.015*s, .405*s, 0, 0, .42*s, .06*s); pom.addColorStop(0, '#fff3b0'); pom.addColorStop(.5, '#e2a93a'); pom.addColorStop(1, '#6b4310');
  c.fillStyle = pom; c.strokeStyle = OUT; c.lineWidth = lw(s, .016); c.beginPath(); c.arc(0, .42*s, .055*s, 0, TAU); c.fill(); c.stroke();
  c.restore();
}

/* ================= АГАНИМ СКЕПТР ================= */
function paintScepter(c, s){
  glow(c, s, '#b992ff', -.18);
  groundShadow(c, s, 0, .46, .22);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.save(); c.rotate(-.42);
  /* древко */
  c.fillStyle = lin(c, -.04*s, 0, .04*s, 0, [[0, '#fff0a0'], [.4, '#d99a2b'], [1, '#5a3a0c']]);
  c.strokeStyle = OUT; c.lineWidth = lw(s, .018);
  c.beginPath(); c.rect(-.04*s, -.06*s, .08*s, .46*s); c.fill(); c.stroke();
  for(const y of [.04, .17, .30]){
    c.fillStyle = lin(c, -.06*s, 0, .06*s, 0, [[0, '#4a2a9a'], [.4, '#b992ff'], [1, '#2a1260']]);
    c.beginPath(); c.rect(-.06*s, y*s, .12*s, .04*s); c.fill(); c.stroke();
  }
  c.fillStyle = lin(c, 0, .38*s, 0, .5*s, GOLD); c.beginPath(); c.moveTo(-.05*s, .40*s); c.lineTo(0, .50*s); c.lineTo(.05*s, .40*s); c.closePath(); c.fill(); c.stroke();
  /* крылья-оправа */
  for(const sx of [-1, 1]){
    c.fillStyle = lin(c, sx*.04*s, -.04*s, sx*.30*s, -.40*s, GOLD); c.strokeStyle = OUT; c.lineWidth = lw(s, .016);
    c.beginPath(); c.moveTo(sx*.04*s, -.04*s); c.quadraticCurveTo(sx*.30*s, -.02*s, sx*.28*s, -.28*s);
    c.quadraticCurveTo(sx*.27*s, -.40*s, sx*.20*s, -.44*s); c.quadraticCurveTo(sx*.22*s, -.28*s, sx*.14*s, -.20*s);
    c.quadraticCurveTo(sx*.08*s, -.14*s, sx*.04*s, -.14*s); c.closePath(); c.fill(); c.stroke();
  }
  /* воротник */
  c.fillStyle = lin(c, -.08*s, 0, .08*s, 0, [[0, '#8a5a14'], [.4, '#fff0a0'], [1, '#6b4310']]);
  c.beginPath(); c.ellipse(0, -.06*s, .08*s, .035*s, 0, 0, TAU); c.fill(); c.stroke();
  /* кристалл */
  c.shadowColor = '#c9a8ff'; c.shadowBlur = s * .07;
  const T = [0, -.52], R = [.13, -.31], B = [0, -.10], L = [-.13, -.31];
  poly(c, [T, R, B, L], s); c.fillStyle = '#4a2a9a'; c.fill(); c.shadowBlur = 0;
  const fac = [[[T, R, [0, -.31]], '#f2e6ff', '#b992ff'], [[R, B, [0, -.31]], '#8a5ae0', '#4a2a9a'], [[B, L, [0, -.31]], '#6a3ac8', '#2a1260'], [[L, T, [0, -.31]], '#d9c0ff', '#8a5ae0']];
  for(const [pts, a, b] of fac){ poly(c, pts, s); c.fillStyle = lin(c, pts[0][0]*s, pts[0][1]*s, pts[1][0]*s, pts[1][1]*s, [[0, a], [1, b]]); c.fill(); c.strokeStyle = 'rgba(245,235,255,.8)'; c.lineWidth = lw(s, .012); c.stroke(); }
  poly(c, [T, R, B, L], s); c.strokeStyle = 'rgba(30,10,70,.95)'; c.lineWidth = lw(s, .022); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(-.04*s, -.38*s, .016*s, .05*s, .35, 0, TAU); c.fill();
  c.restore();
}

window.__reg3d('blink', paintBlink, 1.2);
window.__reg3d('satanic', paintSatanic, 1.2);
window.__reg3d('dagonEmpire', paintDagon, 1.22);
window.__reg3d('arcadiaScar', paintArcadia, 1.22);
window.__reg3d('aghanimScepter', paintScepter, 1.22);
})();
