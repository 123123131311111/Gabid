/* DotaSense 0.10.5.5 — 3D-ИКОНКИ ДЛЯ ВСЕХ ОСТАВШИХСЯ ПРЕДМЕТОВ МАГАЗИНА (по принципу update0105.js — update01054.js), 25 штук:
   Еблет Евсютина, Жирфсютин, Мозг Евсютина, Бошка Агнии, Волосы Ильи, Враги-302 школы, Оторванная рука мо3гов, Срака мо3гов,
   Трусы Дианы, Бошка Семёна, Кая и Санга, Диспёрсер, Валакинсенс, Торированная бошка, Киска дианы, Observer Ward, Замисть,
   Буревестник, Сердце Титана, Мантия Архимага, Супер-блинк, Палач Королей, Эгида Вечности, Корона Колдуна, Регалия Сумеречного Владыки.
   Рисуются один раз в скрытый canvas (кэш), на скорость игры не влияют. Подключается после update01054.js. */
(function(){
'use strict';
if(typeof window.__reg3d !== 'function' || !window.__3dh) return;
const {lin, glow, groundShadow, lw, TAU} = window.__3dh;
const GOLD = [[0, '#fff3b0'], [.4, '#e2a93a'], [.8, '#8a5a14'], [1, '#3b2508']];
const SILVER = [[0, '#ffffff'], [.4, '#c4d0e0'], [.8, '#68788f'], [1, '#2a3444']];
const OUT = 'rgba(30,18,6,.92)';
function rad(c, x, y, r0, r1, st){ const g = c.createRadialGradient(x, y, r0, x, y, r1); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; }
function poly(c, pts, s){ c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x*s, y*s) : c.moveTo(x*s, y*s)); c.closePath(); }
function sparkle(c, s, x, y, r, col, blur){
  c.save(); c.fillStyle = col; if(blur){ c.shadowColor = blur; c.shadowBlur = s * .05; }
  c.beginPath(); c.moveTo(x*s, (y-r*1.6)*s); c.lineTo((x+r*.4)*s, (y-r*.4)*s); c.lineTo((x+r*1.6)*s, y*s); c.lineTo((x+r*.4)*s, (y+r*.4)*s);
  c.lineTo(x*s, (y+r*1.6)*s); c.lineTo((x-r*.4)*s, (y+r*.4)*s); c.lineTo((x-r*1.6)*s, y*s); c.lineTo((x-r*.4)*s, (y-r*.4)*s); c.closePath(); c.fill(); c.restore();
}
function gemAt(c, s, x, y, r, a, b){
  c.save(); c.fillStyle = rad(c, (x-r*.3)*s, (y-r*.3)*s, 0, r*1.3*s, [[0, '#ffffff'], [.25, a], [1, b]]);
  c.strokeStyle = OUT; c.lineWidth = lw(s, .012); c.beginPath(); c.arc(x*s, y*s, r*s, 0, TAU); c.fill(); c.stroke(); c.restore();
}
function start(c, s, col, cy){ glow(c, s, col, cy || 0); groundShadow(c, s, 0, .47, .32); c.lineJoin = 'round'; c.lineCap = 'round'; }
function fillStroke(c, s, grad, line, k){ c.fillStyle = grad; c.fill(); c.strokeStyle = line || 'rgba(20,10,10,.95)'; c.lineWidth = lw(s, k || .024); c.stroke(); }
function heartPath(c, s, x, y, k){
  c.beginPath(); c.moveTo(x*s, (y+.30*k)*s);
  c.bezierCurveTo((x-.42*k)*s, (y+.04*k)*s, (x-.30*k)*s, (y-.30*k)*s, x*s, (y-.12*k)*s);
  c.bezierCurveTo((x+.30*k)*s, (y-.30*k)*s, (x+.42*k)*s, (y+.04*k)*s, x*s, (y+.30*k)*s); c.closePath();
}
function head(c, s, skin, hair, x, y, r){
  c.beginPath(); c.ellipse(x*s, y*s, r*s, r*1.12*s, 0, 0, TAU); fillStroke(c, s, rad(c, (x-r*.3)*s, (y-r*.4)*s, 0, r*1.4*s, [[0, skin[0]], [1, skin[1]]]), 'rgba(40,16,8,.95)', .022);
}
function wing(c, s, d, col){
  c.save(); c.scale(d, 1); c.fillStyle = col[0]; c.strokeStyle = col[1]; c.lineWidth = lw(s, .016);
  c.beginPath(); c.moveTo(.18*s, -.04*s); c.bezierCurveTo(.40*s, -.30*s, .56*s, -.22*s, .54*s, -.14*s); c.bezierCurveTo(.50*s, -.12*s, .54*s, -.04*s, .46*s, .0); c.bezierCurveTo(.44*s, .06*s, .38*s, .08*s, .34*s, .10*s); c.bezierCurveTo(.28*s, .12*s, .22*s, .08*s, .18*s, .06*s); c.closePath(); c.fill(); c.stroke(); c.restore();
}

/* ЕБЛЕТ ЕВСЮТИНА — красное сердце с золотым ободом */
function paintEvsyutin(c, s){
  start(c, s, '#ff7898'); heartPath(c, s, 0, .02, 1.3);
  fillStroke(c, s, lin(c, -.4*s, -.3*s, .4*s, .4*s, [[0, '#ffc0d0'], [.4, '#f0405e'], [1, '#7a0a24']]), 'rgba(60,4,16,.95)', .03);
  c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(-.2*s, -.12*s, .06*s, .12*s, .6, 0, TAU); c.fill();
  c.strokeStyle = lin(c, -.3*s, 0, .3*s, 0, GOLD); c.lineWidth = lw(s, .02); c.beginPath(); c.moveTo(-.30*s, .02*s); c.quadraticCurveTo(0, .16*s, .30*s, .02*s); c.stroke();
  c.fillStyle = '#fff'; c.font = 'bold ' + Math.round(s*.18) + 'px sans-serif'; c.textAlign = 'center'; c.fillText('+500', 0, .10*s);
  sparkle(c, s, .36, -.30, .025, '#ffe0e8', '#ff7898'); sparkle(c, s, -.38, .10, .02, '#ffe0e8', '#ff7898');
}
/* ЖИРФСЮТИН — огромное оранжевое сердце с жирком и короной */
function paintGirf(c, s){
  start(c, s, '#ff9a5c'); heartPath(c, s, 0, .06, 1.5);
  fillStroke(c, s, lin(c, -.5*s, -.3*s, .5*s, .5*s, [[0, '#ffe0a8'], [.35, '#ff9a4c'], [.75, '#c0481c'], [1, '#601408']]), 'rgba(60,16,4,.95)', .032);
  c.strokeStyle = 'rgba(120,40,10,.5)'; c.lineWidth = lw(s, .016);
  for(const y of [.04, .16, .28]){ c.beginPath(); c.moveTo(-.34*s + y*.4*s, y*s); c.quadraticCurveTo(0, (y+.07)*s, (.34 - y*.4)*s, y*s); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-.25*s, -.14*s, .07*s, .14*s, .6, 0, TAU); c.fill();
  c.fillStyle = lin(c, 0, -.46*s, 0, -.30*s, GOLD); c.strokeStyle = OUT; c.lineWidth = lw(s, .014);
  poly(c, [[-.14, -.28], [-.14, -.42], [-.07, -.34], [0, -.46], [.07, -.34], [.14, -.42], [.14, -.28]], s); c.fill(); c.stroke();
  sparkle(c, s, .38, -.24, .025, '#ffe8c8', '#ff9a5c');
}
/* МОЗГ ЕВСЮТИНА — розовый мозг с извилинами и золотым обручем */
function paintEvBrain(c, s){
  start(c, s, '#ff9ac8');
  c.beginPath(); c.moveTo(-.38*s, .08*s); c.bezierCurveTo(-.46*s, -.14*s, -.30*s, -.38*s, -.08*s, -.34*s); c.bezierCurveTo(.04*s, -.44*s, .30*s, -.40*s, .36*s, -.18*s);
  c.bezierCurveTo(.48*s, -.04*s, .40*s, .22*s, .22*s, .26*s); c.bezierCurveTo(.12*s, .38*s, -.20*s, .34*s, -.26*s, .24*s); c.bezierCurveTo(-.36*s, .24*s, -.40*s, .16*s, -.38*s, .08*s); c.closePath();
  fillStroke(c, s, lin(c, -.4*s, -.4*s, .4*s, .4*s, [[0, '#ffd6e8'], [.45, '#ff7eb0'], [1, '#b02a68']]), 'rgba(80,8,40,.95)', .026);
  c.strokeStyle = 'rgba(150,30,90,.8)'; c.lineWidth = lw(s, .018);
  for(const p of [[-.28, -.06, -.1, -.2, .04, -.1], [-.2, .12, 0, .02, .2, .08], [.04, -.28, .12, -.16, .28, -.2], [-.12, .26, .04, .16, .16, .24], [.26, 0, .32, .1, .34, -.04]]){
    c.beginPath(); c.moveTo(p[0]*s, p[1]*s); c.quadraticCurveTo(p[2]*s, p[3]*s, p[4]*s, p[5]*s); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-.18*s, -.22*s, .08*s, .04*s, -.5, 0, TAU); c.fill();
  c.strokeStyle = lin(c, -.4*s, 0, .4*s, 0, GOLD); c.lineWidth = lw(s, .02); c.beginPath(); c.arc(0, .0, .44*s, 3.5, 5.9); c.stroke();
  gemAt(c, s, 0, -.44, .035, '#ffe0f0', '#d02a80'); sparkle(c, s, .40, .3, .022, '#ffe0f0', '#ff9ac8');
}
/* БОШКА АГНИИ — розовая голова с огненным нимбом и ушами */
function paintAgnia(c, s){
  start(c, s, '#ff74d4');
  c.save(); c.shadowColor = '#ff74d4'; c.shadowBlur = s*.08; c.strokeStyle = '#ff9be4'; c.lineWidth = lw(s, .03); c.beginPath(); c.arc(0, 0, .40*s, 0, TAU); c.stroke(); c.restore();
  for(let i = 0; i < 10; i++){ c.save(); c.rotate(i*TAU/10); c.fillStyle = i%2 ? '#ffd0f0' : '#ff74d4'; c.beginPath(); c.moveTo(-.03*s, -.40*s); c.lineTo(0, -.52*s); c.lineTo(.03*s, -.40*s); c.fill(); c.restore(); }
  head(c, s, ['#ffe0d0', '#d09080'], 0, 0, .02, .27);
  c.fillStyle = lin(c, 0, -.3*s, 0, -.1*s, [[0, '#ff9be4'], [1, '#a82a88']]); c.strokeStyle = 'rgba(60,4,40,.95)'; c.lineWidth = lw(s, .018);
  c.beginPath(); c.moveTo(-.27*s, -.06*s); c.bezierCurveTo(-.30*s, -.38*s, .30*s, -.38*s, .27*s, -.06*s); c.quadraticCurveTo(0, -.22*s, -.27*s, -.06*s); c.fill(); c.stroke();
  c.fillStyle = '#2a0a28'; for(const x of [-.09, .09]){ c.beginPath(); c.ellipse(x*s, .02*s, .035*s, .05*s, 0, 0, TAU); c.fill(); c.fillStyle = '#ff9be4'; c.beginPath(); c.arc((x-.01)*s, .0, .012*s, 0, TAU); c.fill(); c.fillStyle = '#2a0a28'; }
  c.strokeStyle = '#7a2a50'; c.lineWidth = lw(s, .014); c.beginPath(); c.arc(0, .10*s, .07*s, .3, Math.PI-.3); c.stroke();
  sparkle(c, s, .38, -.3, .024, '#ffe0f6', '#ff74d4');
}
/* ВОЛОСЫ ИЛЬИ — белая-голубая шевелюра с остриём */
function paintIlyaHair(c, s){
  start(c, s, '#bfe0ff');
  c.fillStyle = 'rgba(0,0,0,0)';
  const tuft = (x, a, h, w) => { c.save(); c.translate(x*s, .30*s); c.rotate(a); c.beginPath(); c.moveTo(-w*s, 0); c.bezierCurveTo(-w*s, -h*.5*s, -w*.3*s, -h*.8*s, 0, -h*s); c.bezierCurveTo(w*.3*s, -h*.8*s, w*s, -h*.5*s, w*s, 0); c.closePath();
    fillStroke(c, s, lin(c, 0, -h*s, 0, 0, [[0, '#ffffff'], [.5, '#cfe6ff'], [1, '#6a8ac8']]), 'rgba(30,50,100,.95)', .018); c.restore(); };
  tuft(-.28, -.7, .50, .09); tuft(.28, .7, .50, .09); tuft(-.14, -.3, .66, .10); tuft(.14, .3, .66, .10); tuft(0, 0, .78, .11);
  c.fillStyle = lin(c, 0, .26*s, 0, .40*s, [[0, '#a8782c'], [1, '#3a2408']]); c.strokeStyle = OUT; c.lineWidth = lw(s, .016);
  c.beginPath(); c.moveTo(-.30*s, .28*s); c.lineTo(.30*s, .28*s); c.lineTo(.26*s, .40*s); c.lineTo(-.26*s, .40*s); c.closePath(); c.fill(); c.stroke();
  gemAt(c, s, 0, .34, .035, '#e0f0ff', '#2a6ad8');
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = lw(s, .01); for(const x of [-.06, .06]){ c.beginPath(); c.moveTo(x*s, .22*s); c.lineTo((x*1.4)*s, -.28*s); c.stroke(); }
  sparkle(c, s, .36, -.28, .025, '#ffffff', '#bfe0ff'); sparkle(c, s, -.38, .0, .02, '#ffffff', '#bfe0ff');
}
/* ВРАГИ-302 ШКОЛЫ — настенные часы-циферблат с плащом из 302 */
function paintEnemy302(c, s){
  start(c, s, '#f3b4ff');
  c.beginPath(); c.arc(0, 0, .38*s, 0, TAU); fillStroke(c, s, lin(c, -.3*s, -.3*s, .3*s, .3*s, GOLD), OUT, .026);
  c.beginPath(); c.arc(0, 0, .31*s, 0, TAU); fillStroke(c, s, rad(c, -.08*s, -.1*s, 0, .34*s, [[0, '#fff6ff'], [1, '#d8a8f0']]), 'rgba(70,20,100,.9)', .014);
  c.strokeStyle = '#5a2a78'; c.lineWidth = lw(s, .012); for(let i = 0; i < 12; i++){ const a = i*TAU/12; c.beginPath(); c.moveTo(Math.cos(a)*.26*s, Math.sin(a)*.26*s); c.lineTo(Math.cos(a)*.30*s, Math.sin(a)*.30*s); c.stroke(); }
  c.fillStyle = 'rgba(90,40,130,.9)'; c.font = 'bold ' + Math.round(s*.17) + 'px sans-serif'; c.textAlign = 'center'; c.fillText('302', 0, -.07*s);
  c.strokeStyle = '#3a1058'; c.lineWidth = lw(s, .028); c.beginPath(); c.moveTo(0, 0); c.lineTo(.12*s, -.12*s); c.moveTo(0, 0); c.lineTo(-.06*s, .20*s); c.stroke();
  c.strokeStyle = '#d02a40'; c.lineWidth = lw(s, .012); c.beginPath(); c.moveTo(0, 0); c.lineTo(.20*s, .12*s); c.stroke(); gemAt(c, s, 0, 0, .025, '#fff', '#a02ad0');
  c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = lw(s, .012); c.beginPath(); c.arc(0, 0, .22*s, 3.7, 4.6); c.stroke();
  sparkle(c, s, .40, -.32, .024, '#fbe8ff', '#f3b4ff');
}
/* ОТОРВАННАЯ РУКА МО3ГОВ — кисть с обрубком */
function paintTornHand(c, s){
  start(c, s, '#d7a879'); c.save(); c.rotate(-.3);
  c.beginPath(); c.moveTo(-.12*s, .18*s); c.lineTo(-.14*s, .46*s); c.lineTo(.14*s, .46*s); c.lineTo(.12*s, .18*s); c.closePath(); fillStroke(c, s, lin(c, -.14*s, 0, .14*s, 0, [[0, '#d09a6a'], [1, '#8a5a38']]), 'rgba(50,24,10,.95)', .022);
  c.fillStyle = '#b02030'; c.beginPath(); c.ellipse(0, .46*s, .14*s, .035*s, 0, 0, TAU); c.fill(); c.fillStyle = '#f0e0d0'; c.beginPath(); c.arc(0, .46*s, .04*s, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(-.18*s, .22*s); c.bezierCurveTo(-.24*s, .0, -.22*s, -.04*s, -.20*s, -.06*s); c.lineTo(.20*s, -.06*s); c.bezierCurveTo(.22*s, -.04*s, .24*s, .0, .18*s, .22*s); c.closePath();
  fillStroke(c, s, lin(c, -.2*s, -.1*s, .2*s, .2*s, [[0, '#f0c898'], [1, '#b87c50']]), 'rgba(50,24,10,.95)', .024);
  for(const [x, w, h] of [[-.16, .06, .22], [-.055, .06, .30], [.055, .06, .27], [.16, .055, .20]]){
    c.beginPath(); c.roundRect((x-w/2)*s, (-.06-h)*s, w*s, (h+.02)*s, w*s*.5); fillStroke(c, s, lin(c, (x-w)*s, 0, (x+w)*s, 0, [[0, '#f4d4a8'], [1, '#c08858']]), 'rgba(50,24,10,.95)', .02); }
  c.save(); c.translate(.20*s, .02*s); c.rotate(.9); c.beginPath(); c.roundRect(-.03*s, -.17*s, .06*s, .20*s, .03*s); fillStroke(c, s, '#e8b888', 'rgba(50,24,10,.95)', .02); c.restore();
  c.restore(); sparkle(c, s, .36, -.30, .024, '#ffe8d0', '#d7a879');
}
/* СРАКА МО3ГОВ — розовый пухлый зад с молнией скорости */
function paintBrainAss(c, s){
  start(c, s, '#ff638d');
  for(const d of [-1, 1]){ c.beginPath(); c.ellipse(d*.17*s, .0, .22*s, .30*s, d*.12, 0, TAU);
    fillStroke(c, s, rad(c, (d*.17-.07)*s, -.1*s, 0, .36*s, [[0, '#ffd0dc'], [.5, '#ff6a92'], [1, '#a8204c']]), 'rgba(70,6,28,.95)', .028); }
  c.strokeStyle = 'rgba(110,10,40,.8)'; c.lineWidth = lw(s, .02); c.beginPath(); c.moveTo(0, -.24*s); c.quadraticCurveTo(-.03*s, .0, 0, .26*s); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-.26*s, -.12*s, .05*s, .1*s, .3, 0, TAU); c.fill();
  c.save(); c.shadowColor = '#ffe070'; c.shadowBlur = s*.06; c.fillStyle = '#ffe45a'; c.strokeStyle = '#8a5a00'; c.lineWidth = lw(s, .012);
  poly(c, [[.06, -.50], [-.06, -.30], [.02, -.30], [-.04, -.14], [.12, -.36], [.04, -.36]], s); c.fill(); c.stroke(); c.restore();
  sparkle(c, s, -.40, -.30, .022, '#ffe0e8', '#ff638d'); sparkle(c, s, .40, .26, .02, '#ffe0e8', '#ff638d');
}
/* ТРУСЫ ДИАНЫ — розовые трусики с сердечком и аурой */
function paintPants(c, s){
  start(c, s, '#ff6fb0'); c.save(); c.strokeStyle = 'rgba(255,111,176,.45)'; c.lineWidth = lw(s, .014); c.setLineDash([s*.03, s*.03]); c.beginPath(); c.arc(0, 0, .46*s, 0, TAU); c.stroke(); c.restore();
  c.beginPath(); c.moveTo(-.38*s, -.24*s); c.lineTo(.38*s, -.24*s); c.bezierCurveTo(.40*s, -.04*s, .24*s, .06*s, .14*s, .14*s); c.lineTo(.12*s, .36*s); c.quadraticCurveTo(0, .30*s, -.12*s, .36*s); c.lineTo(-.14*s, .14*s); c.bezierCurveTo(-.24*s, .06*s, -.40*s, -.04*s, -.38*s, -.24*s); c.closePath();
  fillStroke(c, s, lin(c, -.4*s, -.3*s, .4*s, .4*s, [[0, '#ffc4de'], [.45, '#ff6fb0'], [1, '#a82468']]), 'rgba(80,6,44,.95)', .026);
  c.fillStyle = '#fff'; c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = lw(s, .016); c.beginPath(); c.moveTo(-.38*s, -.20*s); c.lineTo(.38*s, -.20*s); c.stroke();
  heartPath(c, s, 0, -.02, .5); c.fillStyle = '#fff0f8'; c.fill(); c.strokeStyle = '#a82468'; c.lineWidth = lw(s, .012); c.stroke();
  sparkle(c, s, .36, .20, .024, '#ffe0f0', '#ff6fb0'); sparkle(c, s, -.38, .16, .02, '#ffe0f0', '#ff6fb0');
}
/* БОШКА СЕМЁНА — голова с бородой и мечом-уроном */
function paintSemen(c, s){
  start(c, s, '#e8b98a');
  c.beginPath(); c.moveTo(-.28*s, .0); c.bezierCurveTo(-.30*s, .36*s, -.1*s, .44*s, 0, .44*s); c.bezierCurveTo(.1*s, .44*s, .30*s, .36*s, .28*s, .0); c.closePath(); fillStroke(c, s, lin(c, 0, 0, 0, .4*s, [[0, '#6a3a1c'], [1, '#2a1408']]), 'rgba(20,8,2,.95)', .02);
  head(c, s, ['#ffe0c0', '#c89060'], 0, 0, -.04, .27);
  c.fillStyle = lin(c, 0, -.4*s, 0, -.2*s, [[0, '#8a5a2c'], [1, '#3a2008']]); c.strokeStyle = 'rgba(20,8,2,.95)'; c.lineWidth = lw(s, .018);
  c.beginPath(); c.moveTo(-.28*s, -.08*s); c.bezierCurveTo(-.34*s, -.42*s, .34*s, -.42*s, .28*s, -.08*s); c.quadraticCurveTo(0, -.24*s, -.28*s, -.08*s); c.fill(); c.stroke();
  c.fillStyle = '#2a1408'; for(const x of [-.09, .09]){ c.beginPath(); c.ellipse(x*s, -.04*s, .03*s, .04*s, 0, 0, TAU); c.fill(); }
  c.strokeStyle = '#2a1408'; c.lineWidth = lw(s, .018); c.beginPath(); c.moveTo(-.14*s, -.11*s); c.lineTo(-.04*s, -.08*s); c.moveTo(.14*s, -.11*s); c.lineTo(.04*s, -.08*s); c.stroke();
  c.fillStyle = '#d02a2a'; c.beginPath(); c.arc(0, .05*s, .01*s, 0, TAU); c.fill();
  c.fillStyle = '#ff5a3a'; c.font = 'bold ' + Math.round(s*.13) + 'px sans-serif'; c.textAlign = 'center'; c.fillText('+100', .30*s, -.34*s);
  sparkle(c, s, -.38, -.30, .022, '#fff0d8', '#e8b98a');
}
/* КАЯ И САНГА — два скрещённых клинка, синий и красный */
function paintKayaSange(c, s){
  start(c, s, '#7fb8ff');
  function blade(rot, a, b){ c.save(); c.rotate(rot);
    poly(c, [[-.05, -.40], [0, -.50], [.05, -.40], [.05, .10], [-.05, .10]], s); fillStroke(c, s, lin(c, -.05*s, 0, .05*s, 0, [[0, '#ffffff'], [.5, a], [1, b]]), 'rgba(14,20,50,.95)', .02);
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = lw(s, .008); c.beginPath(); c.moveTo(0, -.46*s); c.lineTo(0, .08*s); c.stroke();
    poly(c, [[-.14, .10], [.14, .10], [.12, .15], [-.12, .15]], s); fillStroke(c, s, lin(c, 0, .1*s, 0, .15*s, GOLD), OUT, .014);
    c.beginPath(); c.roundRect(-.03*s, .15*s, .06*s, .22*s, .02*s); fillStroke(c, s, lin(c, -.03*s, 0, .03*s, 0, [[0, '#6a4a2a'], [1, '#2a1808']]), OUT, .014); gemAt(c, s, 0, .40, .035, '#fff', a); c.restore(); }
  blade(.55, '#6ab0ff', '#1a4a9a'); blade(-.55, '#ff7a6a', '#a01a1a');
  sparkle(c, s, 0, -.46, .03, '#ffffff', '#b8d8ff'); sparkle(c, s, .38, .34, .02, '#e0f0ff', '#7fb8ff');
}
/* ДИСПЁРСЕР — голубой шар с рассеивающимися кольцами и крыльями */
function paintDisperser(c, s){
  start(c, s, '#6fe0ff');
  wing(c, s, 1, ['#d8f8ff', 'rgba(20,70,110,.9)']); wing(c, s, -1, ['#d8f8ff', 'rgba(20,70,110,.9)']);
  c.beginPath(); c.arc(0, 0, .24*s, 0, TAU); fillStroke(c, s, rad(c, -.07*s, -.08*s, 0, .28*s, [[0, '#ffffff'], [.35, '#6fe0ff'], [1, '#1a5aa8']]), 'rgba(8,30,70,.95)', .024);
  c.strokeStyle = 'rgba(180,245,255,.7)'; c.lineWidth = lw(s, .014); for(const r of [.32, .40]){ c.beginPath(); c.arc(0, 0, r*s, .4, 2.6); c.stroke(); c.beginPath(); c.arc(0, 0, r*s, 3.5, 5.7); c.stroke(); }
  c.strokeStyle = lin(c, -.3*s, 0, .3*s, 0, SILVER); c.lineWidth = lw(s, .026); c.beginPath(); c.arc(0, 0, .27*s, 0, TAU); c.stroke();
  sparkle(c, s, .02, -.42, .026, '#ffffff', '#6fe0ff'); sparkle(c, s, -.40, .28, .02, '#e0fbff', '#6fe0ff');
}
/* ВАЛАКИНСЕНС — зелёный крест-ампула с листьями */
function paintValak(c, s){
  start(c, s, '#5fe0a0');
  poly(c, [[-.10, -.40], [.10, -.40], [.10, -.10], [.40, -.10], [.40, .10], [.10, .10], [.10, .40], [-.10, .40], [-.10, .10], [-.40, .10], [-.40, -.10], [-.10, -.10]], s);
  fillStroke(c, s, lin(c, -.4*s, -.4*s, .4*s, .4*s, [[0, '#d8ffec'], [.4, '#38c880'], [1, '#0e5a3a']]), 'rgba(4,40,24,.95)', .028);
  c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = lw(s, .012); c.beginPath(); c.moveTo(-.07*s, -.34*s); c.lineTo(-.07*s, -.05*s); c.lineTo(-.34*s, -.05*s); c.stroke();
  gemAt(c, s, 0, 0, .06, '#ffffff', '#1aa868');
  for(const d of [-1, 1]){ c.save(); c.translate(d*.28*s, .30*s); c.rotate(d*.7); c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(.08*s, -.05*s, .08*s, -.16*s, 0, -.2*s); c.bezierCurveTo(-.08*s, -.16*s, -.08*s, -.05*s, 0, 0);
    fillStroke(c, s, lin(c, 0, 0, 0, -.2*s, [[0, '#2a9a44'], [1, '#b8f27a']]), 'rgba(10,50,20,.95)', .014); c.restore(); }
  sparkle(c, s, .38, -.32, .024, '#e0fff0', '#5fe0a0');
}
/* ТОРИРОВАННАЯ БОШКА — огненный череп */
function paintThored(c, s){
  start(c, s, '#ff9a4d'); c.save(); c.shadowColor = '#ff7a1e'; c.shadowBlur = s*.08; c.fillStyle = '#ff9a2e';
  for(const [x, h, w] of [[-.22, .20, .07], [-.08, .30, .08], [.08, .26, .08], [.22, .18, .07]]){ c.beginPath(); c.moveTo((x-w)*s, -.16*s); c.quadraticCurveTo((x-w*.2)*s, (-.16-h*.6)*s, x*s, (-.16-h)*s); c.quadraticCurveTo((x+w*1.2)*s, (-.16-h*.5)*s, (x+w)*s, -.16*s); c.fill(); } c.restore();
  c.beginPath(); c.moveTo(-.30*s, -.02*s); c.bezierCurveTo(-.34*s, -.34*s, .34*s, -.34*s, .30*s, -.02*s); c.bezierCurveTo(.30*s, .10*s, .20*s, .16*s, .18*s, .18*s); c.lineTo(.18*s, .32*s); c.lineTo(-.18*s, .32*s); c.lineTo(-.18*s, .18*s); c.bezierCurveTo(-.20*s, .16*s, -.30*s, .10*s, -.30*s, -.02*s);
  fillStroke(c, s, lin(c, -.3*s, -.3*s, .3*s, .3*s, [[0, '#fff6e0'], [.5, '#e8c898'], [1, '#8a6038']]), 'rgba(50,20,6,.95)', .026);
  c.fillStyle = '#2a0a02'; for(const x of [-.12, .12]){ c.beginPath(); c.ellipse(x*s, -.02*s, .07*s, .08*s, 0, 0, TAU); c.fill(); c.fillStyle = '#ff7a1e'; c.beginPath(); c.arc(x*s, -.02*s, .025*s, 0, TAU); c.fill(); c.fillStyle = '#2a0a02'; }
  poly(c, [[0, .08], [-.035, .14], [.035, .14]], s); c.fill();
  c.strokeStyle = '#2a0a02'; c.lineWidth = lw(s, .012); for(const x of [-.1, -.033, .033, .1]){ c.beginPath(); c.moveTo(x*s, .22*s); c.lineTo(x*s, .32*s); c.stroke(); }
  sparkle(c, s, .38, -.34, .024, '#ffd8a8', '#ff9a4d');
}
/* КИСКА ДИАНЫ — розовая кошачья мордочка с ушками */
function paintKitty(c, s){
  start(c, s, '#ff8fcf');
  for(const d of [-1, 1]){ poly(c, [[d*.12, -.20], [d*.36, -.44], [d*.38, -.08]], s); fillStroke(c, s, lin(c, 0, -.4*s, 0, -.1*s, [[0, '#ff8fcf'], [1, '#c0307a']]), 'rgba(70,6,40,.95)', .022);
    poly(c, [[d*.17, -.17], [d*.31, -.35], [d*.32, -.11]], s); c.fillStyle = '#ffd0e8'; c.fill(); }
  c.beginPath(); c.ellipse(0, .04*s, .38*s, .32*s, 0, 0, TAU); fillStroke(c, s, rad(c, -.1*s, -.12*s, 0, .46*s, [[0, '#ffe0f2'], [.5, '#ff8fcf'], [1, '#b02a74']]), 'rgba(70,6,40,.95)', .028);
  c.fillStyle = '#3a0a28'; for(const x of [-.15, .15]){ c.beginPath(); c.ellipse(x*s, -.02*s, .045*s, .065*s, 0, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc((x-.012)*s, -.04*s, .014*s, 0, TAU); c.fill(); c.fillStyle = '#3a0a28'; }
  poly(c, [[0, .08], [-.04, .04], [.04, .04]], s); c.fillStyle = '#ff5a9a'; c.fill();
  c.strokeStyle = '#3a0a28'; c.lineWidth = lw(s, .012); c.beginPath(); c.moveTo(0, .08*s); c.lineTo(0, .12*s); c.moveTo(0, .12*s); c.quadraticCurveTo(-.05*s, .17*s, -.09*s, .12*s); c.moveTo(0, .12*s); c.quadraticCurveTo(.05*s, .17*s, .09*s, .12*s); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.8)'; for(const d of [-1, 1]) for(const y of [.06, .12]){ c.beginPath(); c.moveTo(d*.22*s, (y)*s); c.lineTo(d*.46*s, (y-.03+ (y-.09))*s); c.stroke(); }
  sparkle(c, s, .40, -.24, .024, '#ffe0f4', '#ff8fcf');
}
/* OBSERVER WARD — жёлтый глаз на колышке */
function paintWard(c, s){
  start(c, s, '#ffe070');
  c.beginPath(); c.moveTo(-.04*s, .10*s); c.lineTo(0, .46*s); c.lineTo(.04*s, .10*s); c.closePath(); fillStroke(c, s, lin(c, -.04*s, 0, .04*s, 0, [[0, '#8a6a3a'], [1, '#3a2810']]), OUT, .016);
  c.beginPath(); c.arc(0, -.08*s, .30*s, 0, TAU); fillStroke(c, s, rad(c, -.08*s, -.18*s, 0, .36*s, [[0, '#fffbe0'], [.5, '#f0c030'], [1, '#8a5a08']]), 'rgba(60,36,4,.95)', .028);
  c.beginPath(); c.ellipse(0, -.08*s, .22*s, .13*s, 0, 0, TAU); fillStroke(c, s, '#fffdf0', 'rgba(60,36,4,.9)', .014);
  c.beginPath(); c.arc(0, -.08*s, .09*s, 0, TAU); c.fillStyle = rad(c, 0, -.08*s, 0, .09*s, [[0, '#2a6a30'], [1, '#0a2a10']]); c.fill();
  c.fillStyle = '#000'; c.beginPath(); c.ellipse(0, -.08*s, .02*s, .07*s, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.arc(-.03*s, -.12*s, .014*s, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(255,224,112,.55)'; c.lineWidth = lw(s, .012); c.setLineDash([s*.03, s*.025]); c.beginPath(); c.ellipse(0, .44*s, .34*s, .08*s, 0, 0, TAU); c.stroke(); c.setLineDash([]);
  sparkle(c, s, .36, -.34, .024, '#fff8d0', '#ffe070');
}
/* ЗАМИСТЬ — красно-золотой щит с вихрем */
function paintZamist(c, s){
  start(c, s, '#ed3d4e');
  c.beginPath(); c.moveTo(-.34*s, -.36*s); c.lineTo(.34*s, -.36*s); c.lineTo(.34*s, .0); c.bezierCurveTo(.34*s, .24*s, .14*s, .38*s, 0, .46*s); c.bezierCurveTo(-.14*s, .38*s, -.34*s, .24*s, -.34*s, .0); c.closePath();
  fillStroke(c, s, lin(c, -.34*s, -.36*s, .34*s, .46*s, GOLD), OUT, .03);
  c.beginPath(); c.moveTo(-.27*s, -.29*s); c.lineTo(.27*s, -.29*s); c.lineTo(.27*s, -.01*s); c.bezierCurveTo(.27*s, .19*s, .11*s, .30*s, 0, .37*s); c.bezierCurveTo(-.11*s, .30*s, -.27*s, .19*s, -.27*s, -.01*s); c.closePath();
  fillStroke(c, s, lin(c, -.27*s, -.29*s, .27*s, .37*s, [[0, '#ff8a92'], [.45, '#ed3d4e'], [1, '#6a0a1a']]), 'rgba(60,4,12,.95)', .016);
  c.strokeStyle = 'rgba(255,230,200,.9)'; c.lineWidth = lw(s, .026);
  c.beginPath(); for(let i = 0; i <= 50; i++){ const t = i/50, a = t*TAU*1.6, r = (.03 + .16*t)*s; const x = Math.cos(a)*r, y = .0 + Math.sin(a)*r; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
  c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-.17*s, -.14*s, .04*s, .12*s, .1, 0, TAU); c.fill();
  sparkle(c, s, .40, -.30, .024, '#ffe0d8', '#ed3d4e');
}
/* БУРЕВЕСТНИК — золотая молния в кольце с крыльями */
function paintStorm(c, s){
  start(c, s, '#ffb347'); wing(c, s, 1, ['#fff0c0', 'rgba(110,60,0,.9)']); wing(c, s, -1, ['#fff0c0', 'rgba(110,60,0,.9)']);
  c.beginPath(); c.arc(0, 0, .26*s, 0, TAU); fillStroke(c, s, rad(c, -.07*s, -.08*s, 0, .3*s, [[0, '#6a5a90'], [1, '#14102c']]), OUT, .022);
  c.save(); c.shadowColor = '#ffd060'; c.shadowBlur = s*.07; poly(c, [[.06, -.22], [-.10, .02], [-.01, .02], [-.07, .22], [.11, -.04], [.02, -.04]], s); fillStroke(c, s, lin(c, 0, -.2*s, 0, .2*s, [[0, '#ffffff'], [.5, '#ffd24a'], [1, '#e07a10']]), '#7a4400', .014); c.restore();
  c.strokeStyle = lin(c, -.3*s, 0, .3*s, 0, GOLD); c.lineWidth = lw(s, .024); c.beginPath(); c.arc(0, 0, .29*s, 0, TAU); c.stroke();
  sparkle(c, s, .02, -.42, .026, '#fff6d0', '#ffb347'); sparkle(c, s, -.40, .30, .02, '#fff6d0', '#ffb347');
}
/* СЕРДЦЕ ТИТАНА — тёмно-красное сердце в золотых цепях */
function paintTitan(c, s){
  start(c, s, '#ff5a6e'); heartPath(c, s, 0, .0, 1.35);
  fillStroke(c, s, lin(c, -.4*s, -.3*s, .4*s, .4*s, [[0, '#ff9aa8'], [.35, '#d02a40'], [1, '#400410']]), 'rgba(40,2,8,.95)', .032);
  c.strokeStyle = 'rgba(255,150,160,.35)'; c.lineWidth = lw(s, .014); c.beginPath(); c.moveTo(-.18*s, -.12*s); c.lineTo(-.02*s, .02*s); c.lineTo(-.14*s, .10*s); c.moveTo(.18*s, -.06*s); c.lineTo(.04*s, .08*s); c.stroke();
  c.strokeStyle = lin(c, -.4*s, -.3*s, .4*s, .4*s, GOLD); c.lineWidth = lw(s, .04); c.beginPath(); c.moveTo(-.38*s, -.20*s); c.quadraticCurveTo(0, .12*s, .38*s, -.20*s); c.stroke();
  c.beginPath(); c.moveTo(-.30*s, .12*s); c.quadraticCurveTo(0, .30*s, .30*s, .12*s); c.stroke();
  c.fillStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.ellipse(-.22*s, -.22*s, .05*s, .1*s, .6, 0, TAU); c.fill();
  gemAt(c, s, 0, .0, .05, '#ffd8a0', '#e07a10'); sparkle(c, s, .40, -.34, .024, '#ffd8e0', '#ff5a6e');
}
/* МАНТИЯ АРХИМАГА — синий плащ с воротником и звёздами */
function paintRobe(c, s){
  start(c, s, '#8fa8ff');
  c.beginPath(); c.moveTo(-.16*s, -.40*s); c.lineTo(.16*s, -.40*s); c.lineTo(.40*s, -.20*s); c.lineTo(.48*s, .44*s); c.quadraticCurveTo(0, .52*s, -.48*s, .44*s); c.lineTo(-.40*s, -.20*s); c.closePath();
  fillStroke(c, s, lin(c, -.4*s, -.4*s, .4*s, .5*s, [[0, '#a8b8ff'], [.4, '#4a5ad8'], [1, '#14185a']]), 'rgba(8,10,50,.95)', .028);
  c.strokeStyle = 'rgba(10,12,70,.5)'; c.lineWidth = lw(s, .024); for(const x of [-.20, 0, .20]){ c.beginPath(); c.moveTo(x*.4*s, -.2*s); c.quadraticCurveTo(x*s*1.1, .15*s, x*1.9*s, .46*s); c.stroke(); }
  c.beginPath(); c.moveTo(-.16*s, -.40*s); c.lineTo(0, -.12*s); c.lineTo(.16*s, -.40*s); c.quadraticCurveTo(0, -.30*s, -.16*s, -.40*s); fillStroke(c, s, lin(c, 0, -.4*s, 0, -.1*s, GOLD), OUT, .018);
  c.strokeStyle = lin(c, -.4*s, 0, .4*s, 0, GOLD); c.lineWidth = lw(s, .018); c.beginPath(); c.moveTo(-.46*s, .40*s); c.quadraticCurveTo(0, .48*s, .46*s, .40*s); c.stroke();
  gemAt(c, s, 0, -.10, .04, '#e0e8ff', '#3a4ae0');
  for(const [x, y] of [[-.24, .08], [.22, .16], [-.1, .30], [.12, -.02]]) sparkle(c, s, x, y, .02, '#ffffff', '#8fa8ff');
}
/* СУПЕР-БЛИНК — двойной голубой ромб с призраками */
function paintSuperBlink(c, s){
  start(c, s, '#6fd0ff');
  for(const [dx, a] of [[-.14, .3], [.14, .5]]){ c.save(); c.globalAlpha = a; poly(c, [[dx, -.40], [dx + .22, 0], [dx, .40], [dx - .22, 0]], s); c.fillStyle = '#6fd0ff'; c.fill(); c.restore(); }
  poly(c, [[0, -.44], [.30, 0], [0, .44], [-.30, 0]], s); fillStroke(c, s, lin(c, -.3*s, -.4*s, .3*s, .4*s, [[0, '#e8fbff'], [.4, '#4cc0f4'], [1, '#14509a']]), 'rgba(6,30,70,.95)', .03);
  poly(c, [[0, -.44], [.30, 0], [0, 0]], s); c.fillStyle = 'rgba(255,255,255,.4)'; c.fill(); poly(c, [[0, 0], [-.30, 0], [0, .44]], s); c.fillStyle = 'rgba(10,50,110,.3)'; c.fill();
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = lw(s, .012); c.beginPath(); c.moveTo(-.30*s, 0); c.lineTo(.30*s, 0); c.moveTo(0, -.44*s); c.lineTo(0, .44*s); c.stroke();
  c.save(); c.fillStyle = '#fff'; c.shadowColor = '#6fd0ff'; c.shadowBlur = s*.05; for(const d of [-1, 1]){ poly(c, [[d*.40, -.04], [d*.50, 0], [d*.40, .04]], s); c.fill(); } c.restore();
  sparkle(c, s, .34, -.34, .026, '#ffffff', '#6fd0ff'); sparkle(c, s, -.36, .30, .02, '#e0fbff', '#6fd0ff');
}
/* ПАЛАЧ КОРОЛЕЙ — чёрный топор с короной над ним */
function paintKingSlayer(c, s){
  start(c, s, '#ff7a45'); c.save(); c.rotate(.28);
  c.strokeStyle = 'rgba(20,8,2,.95)'; c.lineWidth = lw(s, .06); c.beginPath(); c.moveTo(0, .50*s); c.lineTo(0, -.30*s); c.stroke();
  c.strokeStyle = lin(c, -.03*s, 0, .03*s, 0, [[0, '#8a5a30'], [1, '#3a2008']]); c.lineWidth = lw(s, .04); c.beginPath(); c.moveTo(0, .50*s); c.lineTo(0, -.30*s); c.stroke();
  c.beginPath(); c.moveTo(.02*s, -.34*s); c.bezierCurveTo(.20*s, -.50*s, .44*s, -.44*s, .50*s, -.28*s); c.bezierCurveTo(.40*s, -.20*s, .44*s, -.04*s, .50*s, .06*s); c.bezierCurveTo(.30*s, .06*s, .12*s, -.04*s, .02*s, -.06*s); c.closePath();
  fillStroke(c, s, lin(c, 0, -.4*s, .5*s, .0, [[0, '#f0e8e0'], [.4, '#8a8a98'], [1, '#2a2a38']]), 'rgba(10,6,14,.95)', .026);
  c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = lw(s, .01); c.beginPath(); c.moveTo(.10*s, -.34*s); c.bezierCurveTo(.26*s, -.44*s, .40*s, -.38*s, .46*s, -.26*s); c.stroke();
  c.restore();
  c.fillStyle = lin(c, 0, -.5*s, 0, -.36*s, GOLD); c.strokeStyle = OUT; c.lineWidth = lw(s, .012);
  poly(c, [[-.24, -.34], [-.24, -.48], [-.16, -.41], [-.08, -.52], [0, -.41], [.08, -.52]], s); c.globalAlpha = 0; c.fill(); c.globalAlpha = 1;
  c.save(); c.translate(-.28*s, -.12*s); poly(c, [[-.12, .0], [-.12, -.14], [-.06, -.07], [0, -.18], [.06, -.07], [.12, -.14], [.12, .0]], s); fillStroke(c, s, lin(c, 0, -.18*s, 0, 0, GOLD), OUT, .014); gemAt(c, s, 0, -.04, .02, '#ffd0c0', '#d02a10'); c.restore();
  sparkle(c, s, .40, .30, .022, '#ffd8c0', '#ff7a45');
}
/* ЭГИДА ВЕЧНОСТИ — золотой щит с крыльями и бесконечностью */
function paintAegis(c, s){
  start(c, s, '#ffd35c'); wing(c, s, 1, ['#fff3c0', 'rgba(110,70,0,.9)']); wing(c, s, -1, ['#fff3c0', 'rgba(110,70,0,.9)']);
  c.beginPath(); c.moveTo(-.28*s, -.34*s); c.lineTo(.28*s, -.34*s); c.lineTo(.28*s, .0); c.bezierCurveTo(.28*s, .22*s, .12*s, .34*s, 0, .44*s); c.bezierCurveTo(-.12*s, .34*s, -.28*s, .22*s, -.28*s, .0); c.closePath();
  fillStroke(c, s, lin(c, -.3*s, -.3*s, .3*s, .4*s, GOLD), OUT, .03);
  c.beginPath(); c.moveTo(-.21*s, -.27*s); c.lineTo(.21*s, -.27*s); c.lineTo(.21*s, -.01*s); c.bezierCurveTo(.21*s, .16*s, .09*s, .25*s, 0, .33*s); c.bezierCurveTo(-.09*s, .25*s, -.21*s, .16*s, -.21*s, -.01*s); c.closePath();
  fillStroke(c, s, lin(c, 0, -.27*s, 0, .33*s, [[0, '#7ab0ff'], [1, '#14307a']]), 'rgba(6,14,50,.95)', .014);
  c.save(); c.shadowColor = '#fff0a0'; c.shadowBlur = s*.05; c.strokeStyle = '#fff0b0'; c.lineWidth = lw(s, .028); c.beginPath();
  c.moveTo(0, .02*s); c.bezierCurveTo(.06*s, -.10*s, .17*s, -.10*s, .17*s, .02*s); c.bezierCurveTo(.17*s, .12*s, .06*s, .12*s, 0, .02*s); c.bezierCurveTo(-.06*s, -.10*s, -.17*s, -.10*s, -.17*s, .02*s); c.bezierCurveTo(-.17*s, .12*s, -.06*s, .12*s, 0, .02*s); c.stroke(); c.restore();
  sparkle(c, s, .38, -.32, .026, '#fff8d0', '#ffd35c');
}
/* КОРОНА КОЛДУНА — фиолетовая корона с остриями-кристаллами */
function paintSorcCrown(c, s){
  start(c, s, '#b57cff', .04);
  c.beginPath(); c.moveTo(-.38*s, .26*s); c.lineTo(-.40*s, -.20*s); c.lineTo(-.20*s, -.02*s); c.lineTo(-.10*s, -.34*s); c.lineTo(0, -.06*s); c.lineTo(.10*s, -.34*s); c.lineTo(.20*s, -.02*s); c.lineTo(.40*s, -.20*s); c.lineTo(.38*s, .26*s); c.closePath();
  fillStroke(c, s, lin(c, -.4*s, -.3*s, .4*s, .3*s, [[0, '#e0c8ff'], [.4, '#8a4ae0'], [1, '#2a0e6a']]), 'rgba(20,6,50,.95)', .028);
  c.beginPath(); c.roundRect(-.40*s, .18*s, .80*s, .12*s, .03*s); fillStroke(c, s, lin(c, 0, .18*s, 0, .3*s, GOLD), OUT, .018);
  for(const [x, y] of [[-.40, -.20], [-.10, -.34], [.10, -.34], [.40, -.20]]) gemAt(c, s, x, y - .03, .03, '#ffffff', '#8a2ae0');
  gemAt(c, s, 0, .04, .055, '#f0e0ff', '#7a1ad8'); for(const x of [-.26, .26]) gemAt(c, s, x, .24, .022, '#ffffff', '#7a1ad8');
  c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-.26*s, .06*s, .04*s, .1*s, .2, 0, TAU); c.fill();
  sparkle(c, s, .36, -.34, .026, '#f4e8ff', '#b57cff'); sparkle(c, s, -.40, -.34, .02, '#f4e8ff', '#b57cff');
}
/* РЕГАЛИЯ СУМЕРЕЧНОГО ВЛАДЫКИ — тёмная башня-ладья с глазом и короной */
function paintRegalia(c, s){
  start(c, s, '#b07bff');
  c.beginPath(); c.moveTo(-.30*s, .44*s); c.lineTo(-.24*s, .14*s); c.lineTo(-.20*s, -.18*s); c.lineTo(-.30*s, -.20*s); c.lineTo(-.30*s, -.40*s); c.lineTo(-.18*s, -.40*s); c.lineTo(-.18*s, -.32*s); c.lineTo(-.06*s, -.32*s); c.lineTo(-.06*s, -.40*s); c.lineTo(.06*s, -.40*s); c.lineTo(.06*s, -.32*s); c.lineTo(.18*s, -.32*s); c.lineTo(.18*s, -.40*s); c.lineTo(.30*s, -.40*s); c.lineTo(.30*s, -.20*s); c.lineTo(.20*s, -.18*s); c.lineTo(.24*s, .14*s); c.lineTo(.30*s, .44*s); c.closePath();
  fillStroke(c, s, lin(c, -.3*s, -.4*s, .3*s, .44*s, [[0, '#a890e0'], [.4, '#4a2a98'], [1, '#12082e']]), 'rgba(10,4,26,.95)', .028);
  c.strokeStyle = lin(c, -.3*s, 0, .3*s, 0, GOLD); c.lineWidth = lw(s, .022); c.beginPath(); c.moveTo(-.30*s, -.20*s); c.lineTo(.30*s, -.20*s); c.moveTo(-.28*s, .38*s); c.lineTo(.28*s, .38*s); c.stroke();
  c.beginPath(); c.ellipse(0, .08*s, .13*s, .08*s, 0, 0, TAU); fillStroke(c, s, '#e8d0ff', 'rgba(20,6,50,.95)', .014); c.fillStyle = '#d02a60'; c.beginPath(); c.arc(0, .08*s, .05*s, 0, TAU); c.fill(); c.fillStyle = '#000'; c.beginPath(); c.ellipse(0, .08*s, .012*s, .045*s, 0, 0, TAU); c.fill();
  c.save(); c.translate(0, -.48*s); poly(c, [[-.12, .0], [-.12, -.10], [-.06, -.05], [0, -.13], [.06, -.05], [.12, -.10], [.12, .0]], s); fillStroke(c, s, lin(c, 0, -.13*s, 0, 0, GOLD), OUT, .012); c.restore();
  c.fillStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.ellipse(-.20*s, .0, .03*s, .16*s, .05, 0, TAU); c.fill();
  sparkle(c, s, .38, -.30, .026, '#eadcff', '#b07bff'); sparkle(c, s, -.40, .20, .02, '#eadcff', '#b07bff');
}

const REG = {evsyutin: [paintEvsyutin, 1.2], girfsyutin: [paintGirf, 1.22], evsyutinBrain: [paintEvBrain, 1.2], aghanimHead: [paintAgnia, 1.22], ilyaHair: [paintIlyaHair, 1.22],
  enemy302: [paintEnemy302, 1.2], tornBrainHand: [paintTornHand, 1.22], brainAss: [paintBrainAss, 1.2], dianaPants: [paintPants, 1.2], semenHead: [paintSemen, 1.2],
  kayaSange: [paintKayaSange, 1.22], disperser: [paintDisperser, 1.22], valakinsens: [paintValak, 1.2], thoredHead: [paintThored, 1.22], dianaKitty: [paintKitty, 1.2],
  observerWard: [paintWard, 1.2], zamist: [paintZamist, 1.2], stormbringer: [paintStorm, 1.22], titanHeart: [paintTitan, 1.22], archmageRobe: [paintRobe, 1.2],
  superBlink: [paintSuperBlink, 1.22], kingSlayer: [paintKingSlayer, 1.24], eternalAegis: [paintAegis, 1.22], sorcererCrown: [paintSorcCrown, 1.2], duskRegalia: [paintRegalia, 1.22]};
Object.keys(REG).forEach(id => window.__reg3d(id, REG[id][0], REG[id][1]));
try { window.__paint3dIds = (window.__paint3dIds || []).concat(Object.keys(REG)); } catch(e) {}
})();
