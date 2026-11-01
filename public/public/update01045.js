/* DotaSense 0.10.4.5 — УКРАШЕННЫЕ ИКОНКИ ПРЕДМЕТОВ И 3D-САПОГИ.
   • Сапоги (Сапог Джоэла, ПТ, Супер сапог, Сапоги Урагана) нарисованы заново как объёмные 3D-сапоги, стоящие под углом:
     кожаное голенище-цилиндр с тёмным отворотом, шнуровка с люверсами, носок с бликом, толстая подошва с протектором и боковой гранью,
     тень на земле и мягкое свечение. У каждого свой характер: простой кожаный Джоэла, зелёные полосы и шипы ПТ,
     золотой Супер сапог с крылом, бирюзовые Сапоги Урагана с крылом и вихрями.
   • Все остальные иконки получили подложку: цветное свечение по цвету предмета, мягкую тень на земле и глянцевый блик.
   Сапоги рисуются один раз в скрытый canvas и затем копируются — на скорость игры это не влияет.
   Подключается после update01042.js. */
(function(){
'use strict';
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update01045 ' + tag + ':', err); } catch(e) {} } };
if(typeof drawItemIcon !== 'function') return;
const TAU = Math.PI * 2;

/* ---------- палитры сапог ---------- */
const BOOTS = {
  joelBoots:  {L:['#e6bb85','#a06a3d','#3c261a'], trim:'#75e6a7', sole:['#6e4d37','#2b1d16'], lace:'#f4e7c8', metal:'#d8c9a3', glow:'#e7c77a', cuff:'#5a3a26'},
  pt:         {L:['#f4c277','#a85d31','#3d2129'], trim:'#62d38a', sole:['#7a4a33','#2a1a1e'], lace:'#ffe9b8', metal:'#e8d7a0', glow:'#ff9e5d', cuff:'#4a2a28', stripes:true, studs:true},
  superBoots: {L:['#ffe48a','#c58a2c','#40260f'], trim:'#fff1a8', sole:['#8a6224','#2c1c0c'], lace:'#fff6d0', metal:'#ffd34f', glow:'#ffd34f', cuff:'#6b4516', plates:true, wing:['#fffbe6','#ffe08a','#d99a2b']},
  galeBoots:  {L:['#a8f7e0','#2a9c82','#0b3a36'], trim:'#e8fff6', sole:['#2f7f78','#0d2a2a'], lace:'#eafff8', metal:'#bff6ea', glow:'#7fffd0', cuff:'#14504b', swirl:true, wing:['#ffffff','#bff6ea','#4cc9ad']}
};

/* ---------- рисование одного сапога (размер s, начало координат в центре) ---------- */
function bootBody(c, s){
  c.beginPath();
  c.moveTo(-.19*s,-.40*s);
  c.lineTo( .11*s,-.40*s);
  c.lineTo( .13*s,-.04*s);
  c.quadraticCurveTo(.18*s, .05*s, .30*s, .09*s);
  c.bezierCurveTo(.40*s, .095*s, .515*s, .11*s, .50*s, .25*s);
  c.quadraticCurveTo(.495*s,.345*s, .40*s, .345*s);
  c.lineTo(-.33*s,.345*s);
  c.quadraticCurveTo(-.40*s,.34*s,-.39*s,.22*s);
  c.quadraticCurveTo(-.36*s,.04*s,-.28*s,-.12*s);
  c.closePath();
}
function wing(c, s, pal){
  c.save();
  c.translate(-.31*s, -.06*s);
  c.rotate(0.05);
  for(let i = 0; i < 4; i++){
    const a = 0.10 + i * 0.30, len = (.44 - i * .05) * s;
    c.save(); c.rotate(a);
    const g = c.createLinearGradient(0, 0, -len, 0);
    g.addColorStop(0, pal[0]); g.addColorStop(.5, pal[1]); g.addColorStop(1, pal[2]);
    c.fillStyle = g; c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = Math.max(1, s * .012);
    c.beginPath(); c.moveTo(0, 0);
    c.quadraticCurveTo(-len * .5, -s * .075, -len, -s * .01);
    c.quadraticCurveTo(-len * .55,  s * .045, 0, s * .02);
    c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
  c.restore();
}
function paintBoot(c, s, P){
  c.lineJoin = 'round'; c.lineCap = 'round';
  /* тень на земле и свечение */
  const gl = c.createRadialGradient(0, .05*s, 0, 0, .05*s, .6*s);
  gl.addColorStop(0, P.glow + '66'); gl.addColorStop(1, P.glow + '00');
  c.fillStyle = gl; c.fillRect(-.7*s, -.7*s, 1.4*s, 1.4*s);
  c.save(); c.fillStyle = 'rgba(0,0,0,.45)'; c.filter = 'blur(' + Math.round(s*.025) + 'px)';
  c.beginPath(); c.ellipse(.08*s, .43*s, .46*s, .075*s, 0, 0, TAU); c.fill(); c.restore();

  /* поворот: сапог стоит под углом, чуть «развёрнут» к зрителю */
  c.save();
  c.rotate(-0.30);
  c.transform(1, 0, -0.10, 1, 0, 0);

  if(P.wing) wing(c, s, P.wing);

  /* глубина: тёмная копия силуэта со сдвигом = дальняя боковая стенка */
  c.save(); c.translate(-.055*s, .035*s); bootBody(c, s); c.fillStyle = P.L[2]; c.fill();
  c.lineWidth = Math.max(1, s*.03); c.strokeStyle = 'rgba(0,0,0,.55)'; c.stroke(); c.restore();

  /* основное тело */
  c.save(); bootBody(c, s); c.clip();
  let g = c.createLinearGradient(-.4*s, -.4*s, .45*s, .35*s);
  g.addColorStop(0, P.L[0]); g.addColorStop(.45, P.L[1]); g.addColorStop(1, P.L[2]);
  c.fillStyle = g; c.fillRect(-.6*s, -.6*s, 1.2*s, 1.2*s);
  /* цилиндрический объём голенища: светлая полоса и тёмный край */
  g = c.createLinearGradient(-.28*s, 0, .13*s, 0);
  g.addColorStop(0, 'rgba(0,0,0,.30)'); g.addColorStop(.28, 'rgba(255,255,255,.28)'); g.addColorStop(.55, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.42)');
  c.fillStyle = g; c.fillRect(-.4*s, -.42*s, .55*s, .56*s);
  /* складки на сгибе стопы */
  c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = Math.max(1, s*.016);
  for(let i = 0; i < 3; i++){ c.beginPath(); c.moveTo(-.18*s + i*.05*s, .10*s - i*.012*s); c.quadraticCurveTo(-.03*s + i*.05*s, .02*s, .05*s + i*.05*s, .07*s); c.stroke(); }
  /* носок: накладка и блик */
  c.save();
  c.beginPath(); c.moveTo(.20*s,.06*s); c.quadraticCurveTo(.50*s,.07*s,.50*s,.26*s); c.lineTo(.26*s,.30*s); c.quadraticCurveTo(.24*s,.18*s,.20*s,.06*s); c.closePath();
  const tg = c.createLinearGradient(.2*s, .04*s, .45*s, .3*s); tg.addColorStop(0, 'rgba(255,255,255,.30)'); tg.addColorStop(1, 'rgba(255,255,255,.03)');
  c.fillStyle = tg; c.fill(); c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = Math.max(1, s*.014); c.stroke(); c.restore();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(.36*s, .125*s, .075*s, .028*s, .35, 0, TAU); c.fill();
  /* цветные полосы / пластины */
  if(P.stripes){
    c.strokeStyle = P.trim; c.lineWidth = Math.max(2, s*.05);
    for(let i = -1; i <= 1; i++){ c.beginPath(); c.moveTo(-.30*s, i*.075*s + .02*s); c.lineTo(.06*s, i*.075*s - .015*s); c.stroke(); }
  }
  if(P.plates){
    const pg = c.createLinearGradient(-.3*s, -.3*s, .1*s, .1*s); pg.addColorStop(0, '#fff6c2'); pg.addColorStop(.5, '#ffd34f'); pg.addColorStop(1, '#a8741c');
    c.fillStyle = pg; c.strokeStyle = 'rgba(70,40,5,.8)'; c.lineWidth = Math.max(1, s*.016);
    for(let i = 0; i < 3; i++){ c.beginPath(); c.moveTo(-.30*s, -.34*s + i*.085*s); c.lineTo(.10*s, -.34*s + i*.085*s); c.lineTo(.10*s, -.28*s + i*.085*s); c.lineTo(-.30*s, -.28*s + i*.085*s); c.closePath(); c.fill(); c.stroke(); }
  }
  if(P.swirl){
    c.strokeStyle = 'rgba(232,255,246,.85)'; c.lineWidth = Math.max(1.4, s*.026);
    for(let i = 0; i < 3; i++){ c.beginPath(); c.moveTo(-.12*s, -.22*s + i*.10*s); c.bezierCurveTo(-.02*s, -.30*s + i*.10*s, .10*s, -.12*s + i*.10*s, .0*s, -.12*s + i*.10*s); c.stroke(); }
  }
  /* подошва: боковая грань + верхний край + протектор */
  const sg = c.createLinearGradient(0, .24*s, 0, .36*s); sg.addColorStop(0, P.sole[0]); sg.addColorStop(1, P.sole[1]);
  c.fillStyle = sg; c.fillRect(-.5*s, .24*s, 1.1*s, .14*s);
  c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(-.5*s, .24*s, 1.1*s, .018*s);
  c.fillStyle = 'rgba(0,0,0,.45)';
  for(let i = 0; i < 9; i++) c.fillRect(-.30*s + i*.085*s, .325*s, .04*s, .03*s);
  /* каблук */
  c.fillStyle = P.sole[1]; c.fillRect(-.40*s, .27*s, .20*s, .08*s);
  c.fillStyle = 'rgba(255,255,255,.14)'; c.fillRect(-.40*s, .27*s, .20*s, .012*s);
  c.restore();   /* конец clip */

  /* контур */
  bootBody(c, s); c.strokeStyle = 'rgba(25,14,10,.85)'; c.lineWidth = Math.max(1.5, s*.026); c.stroke();
  c.save(); bootBody(c, s); c.clip(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = Math.max(1, s*.012);
  c.beginPath(); c.moveTo(-.17*s, -.37*s); c.lineTo(-.30*s, -.10*s); c.stroke(); c.restore();

  /* шнуровка и люверсы */
  for(let i = 0; i < 4; i++){
    const y = -.20*s + i*.07*s;
    c.strokeStyle = P.lace; c.lineWidth = Math.max(1.2, s*.02);
    c.beginPath(); c.moveTo(-.06*s, y); c.lineTo(.11*s, y + .035*s); c.moveTo(.11*s, y); c.lineTo(-.06*s, y + .035*s); c.stroke();
    c.fillStyle = P.metal; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = Math.max(.8, s*.008);
    for(const ex of [-.07, .115]){ c.beginPath(); c.arc(ex*s, y + .005*s, s*.016, 0, TAU); c.fill(); c.stroke(); }
  }
  /* шипы ПТ */
  if(P.studs){
    c.fillStyle = P.metal; c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = Math.max(.8, s*.01);
    for(let i = 0; i < 3; i++){ const x = .30*s + i*.055*s, y = .115*s + i*.045*s;
      c.beginPath(); c.moveTo(x - .02*s, y + .02*s); c.lineTo(x, y - .035*s); c.lineTo(x + .02*s, y + .02*s); c.closePath(); c.fill(); c.stroke(); }
  }
  /* отворот голенища: эллипс-горловина с мехом/кантом */
  const cuffG = c.createLinearGradient(-.2*s, -.46*s, .14*s, -.34*s); cuffG.addColorStop(0, P.trim); cuffG.addColorStop(1, P.cuff);
  c.fillStyle = P.cuff; c.strokeStyle = 'rgba(20,10,6,.9)'; c.lineWidth = Math.max(1.4, s*.03);
  c.beginPath(); c.ellipse(-.04*s, -.40*s, .165*s, .052*s, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = 'rgba(0,0,0,.72)'; c.beginPath(); c.ellipse(-.04*s, -.402*s, .125*s, .033*s, 0, 0, TAU); c.fill();
  c.strokeStyle = cuffG; c.lineWidth = Math.max(1.2, s*.022);
  c.beginPath(); c.ellipse(-.04*s, -.40*s, .165*s, .052*s, 0, Math.PI*1.02, Math.PI*1.98); c.stroke();
  /* контурный блик по верху подошвы и общий глянец */
  c.fillStyle = 'rgba(255,255,255,.22)'; c.beginPath(); c.ellipse(-.20*s, -.16*s, .035*s, .13*s, .22, 0, TAU); c.fill();
  c.restore();
}

const cache = {};
function bootCanvas(id){
  if(cache[id]) return cache[id];
  const N = 192, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const c = cv.getContext('2d'); c.translate(N/2, N/2 - 4);
  paintBoot(c, N * 0.86, BOOTS[id]);
  return (cache[id] = cv);
}

/* ---------- подложка для всех иконок ---------- */
function backdrop(item, x, y, s){
  const col = item.color || '#8be9fd';
  ctx.save(); ctx.translate(x, y);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, s * .62);
  g.addColorStop(0, col + '40'); g.addColorStop(.6, col + '14'); g.addColorStop(1, col + '00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, s * .62, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(0, s * .44, s * .30, s * .05, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function gloss(item, x, y, s){
  ctx.save(); ctx.translate(x, y);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .16;
  const g = ctx.createLinearGradient(-s * .4, -s * .45, s * .1, s * .1);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(-s * .12, -s * .2, s * .3, s * .14, -.6, 0, TAU); ctx.fill();
  ctx.restore();
}

const _dii = drawItemIcon;
drawItemIcon = function(item, x, y, s){
  if(!item) return;
  try {
    if(BOOTS[item.id]){
      const cv = bootCanvas(item.id), d = s * 1.16;
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(cv, x - d / 2 - d * .035, y - d / 2 - d * .02, d, d);
      ctx.restore();
      return;
    }
    backdrop(item, x, y, s);
  } catch(err) { warn('boots', err); }
  _dii.apply(this, arguments);
  try { gloss(item, x, y, s); } catch(err) { warn('gloss', err); }
};

/* для проверки: отрисовка сапога на произвольном canvas */
try { window.__paintBoot = (c, s, id) => paintBoot(c, s, BOOTS[id]); window.__bootIds = Object.keys(BOOTS); } catch(e) {}
})();
