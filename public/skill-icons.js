/* DotaSense 0.10.2.2 — иконки навыков «как в Доте» для 12 героев:
   Пиромант, Вождь, Гриша, Голли, Сасыч, Илья, Малит, Аркадий (33 навыка) + Псих, Выселки, Мэрин, Вирсуди (16 навыков).
   Каждая иконка рисуется кодом (векторно, в сетке 100×100) один раз в маленький холст и кэшируется.
   Рамка, виньетка и блик общие; золотая рамка — у ультимейтов, серебристая пунктирная — у пассивок.
   API: SkillIcons.draw(ctx, defOrId, x, y, size, {dim}) → true, если иконка есть; SkillIcons.has(defOrId). */
(function(){
'use strict';

const RES = 128;           /* размер кэш-холста */
const cache = new Map();   /* id → canvas */
let reverse = null;        /* def навыка → id */

/* ---------- вспомогательные фигуры (координаты 0..100) ---------- */
function flamePath(cx, by, h, w){
  return 'M'+cx+' '+by+
    ' C'+(cx-w)+' '+(by-h*.1)+' '+(cx-w)+' '+(by-h*.5)+' '+(cx-w*.15)+' '+(by-h*.62)+
    ' C'+(cx-w*.2)+' '+(by-h*.8)+' '+cx+' '+(by-h*.9)+' '+(cx+w*.1)+' '+(by-h)+
    ' C'+(cx+w*.15)+' '+(by-h*.75)+' '+(cx+w*1.1)+' '+(by-h*.55)+' '+(cx+w*.9)+' '+(by-h*.3)+
    ' C'+(cx+w*.8)+' '+(by-h*.08)+' '+(cx+w*.4)+' '+by+' '+cx+' '+by+' Z';
}
function starPath(x, y, r){
  return 'M'+x+' '+(y-r)+' Q'+x+' '+y+' '+(x+r)+' '+y+' Q'+x+' '+y+' '+x+' '+(y+r)+' Q'+x+' '+y+' '+(x-r)+' '+y+' Q'+x+' '+y+' '+x+' '+(y-r)+' Z';
}
function dropPath(x, y, s){      /* капля: остриё в (x, y), высота ≈ 2.4·s */
  return 'M'+x+' '+y+' C'+x+' '+y+' '+(x-s)+' '+(y+s*1.3)+' '+(x-s)+' '+(y+s*1.7)+' C'+(x-s)+' '+(y+s*2.4)+' '+(x-s*.5)+' '+(y+s*2.8)+' '+x+' '+(y+s*2.8)+
    ' C'+(x+s*.5)+' '+(y+s*2.8)+' '+(x+s)+' '+(y+s*2.4)+' '+(x+s)+' '+(y+s*1.7)+' C'+(x+s)+' '+(y+s*1.3)+' '+x+' '+y+' '+x+' '+y+' Z';
}
function crystalPath(w, h){      /* кристалл с основанием в (0,0), остриё вверху */
  return 'M0 '+(-h)+' L'+w+' '+(-h*.7)+' L'+(w*.8)+' 0 L'+(-w*.8)+' 0 L'+(-w)+' '+(-h*.7)+' Z';
}
function polyStar(cx, cy, R, r, n, rot){
  let d = '';
  for(let i = 0; i < n * 2; i++){
    const a = rot + i * Math.PI / n, rad = i % 2 ? r : R;
    d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rad).toFixed(2) + ' ' + (cy + Math.sin(a) * rad).toFixed(2) + ' ';
  }
  return d + 'Z';
}

/* ---------- контекст рисования с короткими помощниками ---------- */
function makeG(c){
  const g = {c};
  g.lg = (x0, y0, x1, y1, stops) => { const q = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => q.addColorStop(stops.length < 2 ? 0 : i / (stops.length - 1), s)); return q; };
  g.rg = (x, y, r, stops, fx, fy) => { const q = c.createRadialGradient(fx == null ? x : fx, fy == null ? y : fy, 0, x, y, r); stops.forEach((s, i) => q.addColorStop(stops.length < 2 ? 0 : i / (stops.length - 1), s)); return q; };
  g.fill = (d, f) => { c.fillStyle = f; c.fill(new Path2D(d)); };
  g.line = (d, s, w, cap) => { c.strokeStyle = s; c.lineWidth = w; c.lineCap = cap || 'round'; c.lineJoin = 'round'; c.stroke(new Path2D(d)); };
  g.both = (d, f, s, w) => { const p = new Path2D(d); c.fillStyle = f; c.fill(p); c.strokeStyle = s; c.lineWidth = w || 1.5; c.lineJoin = 'round'; c.stroke(p); };
  g.circ = (x, y, r, f, s, w) => { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); if(f){ c.fillStyle = f; c.fill(); } if(s){ c.strokeStyle = s; c.lineWidth = w || 1.5; c.stroke(); } };
  g.ell = (x, y, rx, ry, f, s, w) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); if(f){ c.fillStyle = f; c.fill(); } if(s){ c.strokeStyle = s; c.lineWidth = w || 1.5; c.stroke(); } };
  g.glow = (x, y, r, col, a) => { c.save(); c.globalAlpha = a == null ? .8 : a; c.fillStyle = g.rg(x, y, r, [col, 'rgba(0,0,0,0)']); c.fillRect(x - r, y - r, r * 2, r * 2); c.restore(); };
  g.at = (x, y, rot, fn) => { c.save(); c.translate(x, y); c.rotate(rot || 0); fn(); c.restore(); };
  g.orb = (x, y, r, c1, c2, c3) => {
    g.circ(x, y, r, g.rg(x, y, r * 1.05, [c1, c2, c3], x - r * .35, y - r * .4));
    g.circ(x, y, r, null, 'rgba(255,255,255,.35)', 1.2);
    g.ell(x - r * .32, y - r * .45, r * .3, r * .16, 'rgba(255,255,255,.55)');
  };
  g.flame = (x, y, h, w, cols) => {         /* слоёное пламя: внешний → внутренний слой */
    cols.forEach((col, i) => { const k = 1 - i * .24; g.fill(flamePath(x, y - i * h * .04, h * k, w * k), col); });
  };
  g.star = (x, y, r, col) => g.fill(starPath(x, y, r), col || '#fff');
  g.fireball = (x, y, r, rot) => {          /* огненный шар с шлейфом, летящим вверх-влево */
    g.glow(x, y, r * 2.1, 'rgba(255,120,30,.75)', .9);
    [-.5, 0, .5].forEach(a => g.at(x, y, -Math.PI / 4 + a * .9 + (rot || 0), () => g.flame(0, 0, r * 2.9 * (a ? .8 : 1.05), r * .78, ['#c4260a', '#ff6a10', '#ffc02e'])));
    g.orb(x, y, r, '#fffbd0', '#ffb02a', '#d02a06');
  };
  return g;
}

/* ---------- 33 иконки ----------
   bg — два цвета фона (сверху вниз), glow — цвет свечения за глифом, ult/passive — тип рамки */
const ICONS = {};

/* ===== ПИРОМАНТ ===== */
ICONS.fireball = {bg:['#2a0a04', '#7a2108'], glow:'rgba(255,140,40,.55)', draw(g){
  g.fireball(58, 54, 21);
  g.star(26, 28, 6, '#ffe9a0'); g.star(80, 24, 4, '#ffd070'); g.star(84, 80, 4.5, '#ffb050');
}};
ICONS.flamewave = {bg:['#2d0905', '#78180a'], glow:'rgba(255,100,30,.6)', draw(g){
  g.circ(50, 52, 28, g.rg(50, 52, 30, ['rgba(255,190,70,.5)', 'rgba(255,60,10,.12)']), 'rgba(255,170,60,.7)', 2);
  for(let i = 0; i < 10; i++) g.at(50, 52, i * Math.PI / 5, () => { g.c.translate(0, -17); g.flame(0, 0, 30, 8.5, ['#c8280a', '#ff6a10', '#ffc02e']); });
  g.circ(50, 52, 15, g.rg(50, 52, 16, ['#fff4b8', '#ff9a24', '#a81c06']));
  g.circ(50, 52, 15, null, 'rgba(255,230,160,.8)', 1.4);
}};
ICONS.blink = {bg:['#0d0a2a', '#32207a'], glow:'rgba(150,120,255,.55)', draw(g){
  const c = g.c;
  g.ell(24, 52, 9, 27, g.rg(24, 52, 28, ['#d8ccff', '#7a52ff', '#25106e']), '#e8e0ff', 2);
  g.ell(76, 52, 9, 27, g.rg(76, 52, 28, ['#d8ccff', '#7a52ff', '#25106e']), '#e8e0ff', 2);
  for(let i = 0; i < 4; i++){
    const y = 38 + i * 9, w = 3.2 - Math.abs(i - 1.5) * .6;
    g.fill('M30 ' + y + ' L68 ' + (y + (i - 1.5) * 2) + ' L30 ' + (y + w) + ' Z', g.lg(30, 0, 70, 0, ['rgba(120,200,255,0)', '#bfe6ff', '#ffffff']));
  }
  g.glow(76, 52, 15, 'rgba(180,230,255,.9)'); g.star(76, 52, 16, '#fff'); g.star(76, 52, 8, '#aee4ff');
  c.save(); c.globalAlpha = .6; g.star(40, 22, 5, '#d8d0ff'); g.star(58, 84, 4, '#d8d0ff'); c.restore();
}};
ICONS.meteor = {bg:['#0a0710', '#3b1208'], glow:'rgba(255,100,20,.5)', ult:true, draw(g){
  g.at(40, 62, Math.PI / 4, () => {
    g.glow(0, 0, 40, 'rgba(255,110,20,.7)', .9);
    [-.34, 0, .34].forEach(a => g.at(0, 0, a, () => g.flame(0, 0, a ? 74 : 94, 17, ['#a81c06', '#ff5a0c', '#ffb02a'])));
  });
  const rock = 'M24 56 L32 44 L46 42 L56 52 L56 66 L46 78 L32 78 L22 70 Z';
  g.both(rock, g.rg(40, 60, 24, ['#8a5a3e', '#4a2c20', '#1f100c'], 34, 52), '#ffb060', 1.6);
  g.line('M30 52 L38 62 L34 72 M44 50 L46 62 L52 70 M36 62 L48 64', '#ff8c24', 1.8);
  g.line('M30 52 L38 62 L34 72 M44 50 L46 62 L52 70', 'rgba(255,230,140,.8)', .7);
  g.star(78, 82, 4, '#ffd070'); g.star(18, 20, 4, '#ffb050'); g.star(86, 54, 3, '#ffd070');
}};

/* ===== ВОЖДЬ ===== */
ICONS.cleave = {bg:['#06182a', '#144c76'], glow:'rgba(100,200,255,.5)', draw(g){
  g.fill('M8 82 C16 34 54 8 94 26 C58 30 28 52 8 82 Z', g.lg(8, 82, 94, 20, ['rgba(120,210,255,0)', '#9ae0ff', '#ffffff']));
  g.line('M10 80 C20 40 56 14 92 26', 'rgba(210,245,255,.9)', 1.4);
  g.both('M26 76 L78 16 L86 22 L34 82 Z', g.lg(30, 80, 82, 18, ['#8da0b4', '#f4fbff', '#8da0b4']), '#dff4ff', 1.2);
  g.line('M33 76 L80 20', 'rgba(255,255,255,.85)', 1);
  g.line('M18 66 L42 90', '#e6b84a', 6); g.line('M18 66 L42 90', '#fff0a0', 1.5);
  g.line('M30 82 L16 94', '#6a4024', 7);
  g.star(84, 74, 5, '#bfe9ff'); g.star(18, 30, 4, '#bfe9ff');
}};
ICONS.warcry = {bg:['#061a2a', '#0f5078'], glow:'rgba(90,200,255,.45)', draw(g){
  ['M12 40 Q4 52 12 64', 'M20 34 Q9 52 20 70'].forEach(d => { g.line(d, 'rgba(150,225,255,.85)', 2.4); });
  ['M88 40 Q96 52 88 64', 'M80 34 Q91 52 80 70'].forEach(d => { g.line(d, 'rgba(150,225,255,.85)', 2.4); });
  g.both('M50 12 L78 22 V48 C78 68 64 80 50 88 C36 80 22 68 22 48 V22 Z', g.lg(22, 12, 78, 88, ['#6fd0ff', '#2a74c4', '#103a78']), '#d6f2ff', 2);
  g.line('M50 18 L72 26 V48 C72 64 61 74 50 81', 'rgba(255,255,255,.35)', 1.4);
  g.both('M44 32 H56 V44 H68 V56 H56 V68 H44 V56 H32 V44 H44 Z', g.lg(0, 32, 0, 68, ['#ffffff', '#b8f0c8']), '#2a9a5a', 1.4);
}};
ICONS.charge = {bg:['#061a2a', '#124a70'], glow:'rgba(110,210,255,.45)', draw(g){
  [[6, 30, 36], [2, 44, 24], [8, 58, 34], [10, 72, 26]].forEach(l => g.fill('M' + l[0] + ' ' + l[1] + ' L' + (l[0] + l[2]) + ' ' + (l[1] - 1.4) + ' L' + (l[0] + l[2]) + ' ' + (l[1] + 1.4) + ' Z', g.lg(l[0], 0, l[0] + l[2], 0, ['rgba(150,225,255,0)', 'rgba(200,240,255,.9)'])));
  g.c.save(); g.c.globalAlpha = .35; g.both('M30 42 L80 50 L30 58 Z', '#7fc8ff', '#7fc8ff', 1); g.c.restore();
  g.both('M42 42 L92 50 L42 58 Z', g.lg(0, 42, 0, 58, ['#f4fbff', '#8ea6bc']), '#e0f6ff', 1.2);
  g.line('M46 50 L88 50', 'rgba(255,255,255,.7)', 1);
  g.line('M40 36 L40 64', '#e6b84a', 6); g.line('M40 36 L40 64', '#fff0a0', 1.4);
  g.line('M40 50 L22 50', '#6a4024', 7);
  [['M70 80 L82 74 L74 84', 1], ['M60 86 L72 80 L64 90', 1]].forEach(c => g.line(c[0], '#cfeaff', 2));
  g.ell(46, 86, 20, 4, 'rgba(180,220,255,.35)');
}};
ICONS.bladeStorm = {bg:['#041424', '#0e3d66'], glow:'rgba(120,220,255,.55)', ult:true, draw(g){
  g.glow(50, 50, 40, 'rgba(120,220,255,.7)');
  [[36, .2, '#9ae0ff'], [28, 1.4, '#cfeeff'], [20, 3.2, '#ffffff']].forEach(a => g.c.save() || (g.c.globalAlpha = .8, g.line('M' + (50 + a[0]) + ' 50 A' + a[0] + ' ' + a[0] + ' 0 1 1 ' + (50 + a[0] * Math.cos(a[1])) + ' ' + (50 - a[0] * Math.sin(a[1])), a[2], 2.2), g.c.restore()));
  for(let i = 0; i < 3; i++) g.at(50, 50, i * Math.PI * 2 / 3 - .3, () => {
    g.c.translate(0, -27);
    g.both('M-14 -3.4 L15 0 L-14 3.4 Z', g.lg(0, -3, 0, 3, ['#f4fbff', '#8ea6bc']), '#e0f6ff', 1);
    g.line('M-14 -6 L-14 6', '#e6b84a', 3.4); g.line('M-14 0 L-22 0', '#6a4024', 3.6);
  });
  g.circ(50, 50, 7, g.rg(50, 50, 8, ['#ffffff', '#7fd4ff', '#1c6aa8']));
}};

/* ===== ГРИША ===== */
ICONS.quas = {bg:['#031428', '#0c4a88'], glow:'rgba(90,190,255,.6)', draw(g){
  g.glow(50, 50, 42, 'rgba(90,200,255,.7)');
  g.orb(50, 52, 29, '#e6fbff', '#35aaf0', '#0a3a8c');
  g.line('M50 24 L62 48 L50 80 L38 48 Z M38 48 L62 48 M26 56 L38 48 M74 56 L62 48', 'rgba(230,250,255,.75)', 1.3);
  [[22, 26, 12], [80, 30, 9], [20, 78, 8], [82, 76, 11]].forEach(s => g.at(s[0], s[1], .2, () => g.both(crystalPath(s[2] * .35, s[2]), '#bdf0ff', '#ffffff', .9)));
}};
ICONS.wex = {bg:['#12062a', '#4a1a8a'], glow:'rgba(190,120,255,.6)', draw(g){
  g.glow(50, 50, 42, 'rgba(190,120,255,.7)');
  g.orb(50, 52, 29, '#f4e6ff', '#a64cf0', '#38106e');
  g.both('M56 22 L36 54 L48 54 L42 82 L68 44 L54 44 Z', g.lg(0, 22, 0, 82, ['#ffffff', '#fff2a0', '#ffb000']), '#fff6c0', 1);
  g.line('M14 40 L26 46 L20 54 L30 58 M86 36 L74 44 L82 50 L72 56', '#e3ccff', 1.8);
  g.star(80, 78, 4, '#f0e0ff'); g.star(20, 24, 4, '#f0e0ff');
}};
ICONS.exort = {bg:['#2a0904', '#8a2208'], glow:'rgba(255,130,30,.6)', draw(g){
  g.glow(50, 50, 42, 'rgba(255,130,30,.7)');
  for(let i = 0; i < 7; i++) g.at(50, 52, -Math.PI + i * Math.PI / 6, () => { g.c.translate(0, -22); g.flame(0, 0, 26, 8, ['#b81c06', '#ff5a0c', '#ffb02a']); });
  g.orb(50, 56, 27, '#fff4c0', '#ff8a1c', '#a81c06');
  g.flame(50, 74, 34, 13, ['#c8280a', '#ff7a14', '#ffd23a', '#ffffff']);
}};
ICONS.invoke = {bg:['#100a22', '#3a2a58'], glow:'rgba(255,220,120,.5)', ult:true, draw(g){
  g.glow(50, 50, 44, 'rgba(255,225,130,.55)');
  g.line('M50 12 A38 38 0 1 1 20 30', 'rgba(255,230,160,.85)', 2.4); g.line('M50 22 A28 28 0 1 1 28 38', 'rgba(255,230,160,.5)', 1.6);
  g.fill(polyStar(50, 54, 20, 8, 4, -Math.PI / 2), g.lg(0, 30, 0, 80, ['#ffffff', '#ffd868', '#b87a10']));
  g.orb(50, 20, 12, '#e6fbff', '#35aaf0', '#0a3a8c');
  g.orb(22, 72, 12, '#f4e6ff', '#a64cf0', '#38106e');
  g.orb(78, 72, 12, '#fff4c0', '#ff8a1c', '#a81c06');
}};

/* ===== ГОЛЛИ ===== */
function iceCrystal(g, scale, red){
  const pal = red ? ['#ffe0e0', '#ff5a5a', '#8a0c1c'] : ['#e8fcff', '#6cd0ff', '#1458b0'];
  g.at(50, 90, 0, () => {
    g.c.scale(scale, scale);
    g.both('M0 -80 L20 -58 L15 -8 L0 0 L-15 -8 L-20 -58 Z', g.lg(-20, -80, 20, 0, pal), red ? '#ffd0d0' : '#f2fdff', 1.6);
    g.fill('M0 -80 L20 -58 L0 -50 L-20 -58 Z', 'rgba(255,255,255,.5)');
    g.fill('M0 -50 L20 -58 L15 -8 L0 0 Z', 'rgba(0,30,90,.28)');
    g.line('M0 -80 L0 0 M-20 -58 L0 -50 L20 -58', 'rgba(255,255,255,.7)', .9);
  });
}
ICONS.gollyCrystal = {bg:['#030e24', '#0e3c78'], glow:'rgba(110,210,255,.55)', draw(g){
  g.glow(50, 48, 40, 'rgba(110,210,255,.7)'); iceCrystal(g, .95, false);
  g.star(24, 34, 6, '#e6faff'); g.star(78, 28, 4.5, '#e6faff'); g.star(76, 74, 4, '#e6faff');
}};
ICONS.gollyStorm = {bg:['#031026', '#10407e'], glow:'rgba(110,210,255,.5)', draw(g){
  g.ell(50, 86, 40, 7, 'rgba(160,230,255,.35)');
  [[50, 88, .34, 70, -.02], [28, 90, .26, 52, -.45], [72, 90, .26, 52, .45], [12, 90, .2, 36, -.8], [88, 90, .2, 36, .8]].sort((a, b) => b[3] - a[3] || 0).reverse().forEach(c => {
    g.at(c[0], c[1], c[4], () => { g.c.scale(1, 1); const h = c[3], w = h * .26; g.both(crystalPath(w, h), g.lg(-w, -h, w, 0, ['#effdff', '#62c8ff', '#144e9e']), '#eefcff', 1.2); g.line('M0 ' + (-h) + ' L0 0', 'rgba(255,255,255,.55)', .8); });
  });
  g.star(22, 24, 4, '#e6faff'); g.star(84, 20, 5, '#e6faff');
}};
ICONS.gollyHeart = {bg:['#06122c', '#18408a'], glow:'rgba(130,220,255,.55)', draw(g){
  g.glow(50, 50, 42, 'rgba(120,215,255,.7)');
  const heart = 'M50 88 C12 62 8 32 28 24 C40 19 50 28 50 36 C50 28 60 19 72 24 C92 32 88 62 50 88 Z';
  g.both(heart, g.lg(14, 22, 80, 88, ['#f2feff', '#6ad0ff', '#1a58b8']), '#f2feff', 2);
  g.line('M50 36 L50 86 M28 24 L36 52 L50 66 M72 24 L64 52 L50 66 M18 46 L36 52 M82 46 L64 52', 'rgba(255,255,255,.55)', 1);
  g.fill('M26 30 C32 24 42 26 46 34 C40 32 32 32 26 40 Z', 'rgba(255,255,255,.5)');
  g.star(84, 18, 5, '#fff'); g.star(14, 78, 4, '#d6f6ff');
}};
ICONS.gollyGolems = {bg:['#06142a', '#143a6c'], glow:'rgba(110,210,255,.4)', ult:true, draw(g){
  g.at(26, 30, -.35, () => g.both(crystalPath(5, 22), '#bdf0ff', '#fff', 1));
  g.at(74, 30, .35, () => g.both(crystalPath(5, 22), '#bdf0ff', '#fff', 1));
  g.both('M26 26 H74 L82 38 V70 L70 86 H30 L18 70 V38 Z', g.lg(18, 26, 82, 86, ['#b9d2e8', '#6786a6', '#2c4262']), '#e2f2ff', 2);
  g.line('M30 28 L22 38 M70 28 L78 38', 'rgba(255,255,255,.5)', 1.4);
  g.both('M28 44 H44 L42 54 H30 Z', '#7ff0ff', '#e6ffff', 1); g.both('M72 44 H56 L58 54 H70 Z', '#7ff0ff', '#e6ffff', 1);
  g.glow(36, 49, 13, 'rgba(120,240,255,.9)'); g.glow(64, 49, 13, 'rgba(120,240,255,.9)');
  g.both('M36 68 H64 V78 H36 Z', '#274364', '#9cc2e0', 1.2); g.line('M42 68 V78 M50 68 V78 M58 68 V78', '#9cc2e0', 1.2);
  g.line('M50 34 L46 44 L52 52', 'rgba(20,40,70,.6)', 1.2);
}};
ICONS.gollyRed = {bg:['#2a0508', '#7a0e18'], glow:'rgba(255,70,70,.55)', draw(g){
  g.glow(50, 50, 44, 'rgba(255,60,60,.75)');
  [[18, 84, 34, 8], [82, 84, 34, 8], [34, 90, 26, 7], [66, 90, 26, 7]].forEach(f => g.flame(f[0], f[1], f[2], f[3], ['#a80c1c', '#ff3a3a']));
  iceCrystal(g, .92, true);
  g.star(22, 26, 5, '#ffd0d0'); g.star(80, 30, 4, '#ffd0d0');
}};

/* ===== САСЫЧ ===== */
ICONS.bloodrage = {bg:['#1a0306', '#5c0a14'], glow:'rgba(255,40,50,.55)', draw(g){
  g.glow(50, 54, 44, 'rgba(255,40,50,.7)');
  [[26, 70, 22, 7, -.5], [74, 70, 22, 7, .5], [50, 84, 18, 6, 0]].forEach(f => g.at(f[0], f[1], f[4], () => g.flame(0, 0, f[2] + 10, f[3], ['#6a0610', '#d4141f'])));
  const body = dropPath(50, 10, 27);
  g.both(body, g.rg(50, 54, 36, ['#ff6a72', '#d4141f', '#6a0610'], 40, 40), '#ffb0b4', 1.8);
  g.fill('M34 54 L47 62 L45 69 L33 63 Z', '#ffffff'); g.fill('M66 54 L53 62 L55 69 L67 63 Z', '#ffffff');
  g.circ(42, 64, 2.6, '#1a0306'); g.circ(58, 64, 2.6, '#1a0306');
  g.line('M40 78 Q50 72 60 78', '#1a0306', 2.4);
  g.fill('M46 78 L48 83 L50 78 Z M50 78 L52 83 L54 78 Z', '#fff');
  g.fill('M36 30 C38 24 44 22 46 18 C42 28 40 34 38 40 Z', 'rgba(255,255,255,.45)');
}};
ICONS.bloodRite = {bg:['#16030a', '#52081c'], glow:'rgba(255,40,70,.5)', draw(g){
  g.glow(50, 50, 44, 'rgba(255,40,70,.6)');
  g.circ(50, 50, 38, g.rg(50, 50, 38, ['rgba(160,10,30,.55)', 'rgba(60,0,10,.55)']), '#ff5a6c', 2.2);
  g.circ(50, 50, 31, null, 'rgba(255,150,160,.7)', 1);
  for(let i = 0; i < 12; i++) g.at(50, 50, i * Math.PI / 6, () => g.line('M0 -38 L0 -33', '#ffb0b8', 1.6));
  g.both(polyStar(50, 50, 29, 11.5, 5, -Math.PI / 2), 'rgba(200,16,40,.5)', '#ff8a98', 1.6);
  g.fill(dropPath(50, 38, 8), g.lg(0, 38, 0, 62, ['#ff6a72', '#8c0816']));
  g.fill(dropPath(20, 8, 3.4), '#e0182c'); g.fill(dropPath(82, 12, 3), '#e0182c'); g.fill(dropPath(86, 74, 3.4), '#e0182c');
}};
ICONS.thirst = {bg:['#14050a', '#4c0e1c'], glow:'rgba(255,60,80,.45)', passive:true, draw(g){
  g.glow(50, 40, 40, 'rgba(255,60,80,.5)');
  g.both('M10 22 Q50 2 90 22 L90 36 Q50 22 10 36 Z', g.lg(0, 10, 0, 36, ['#d4202e', '#6a0612']), '#ff8a94', 1.5);
  g.fill('M18 32 L26 32 L22 44 Z M62 28 L74 28 L68 40 Z M34 29 L42 28 L38 40 Z M46 28 L54 28 L50 38 Z', '#f6ecd6');
  g.both('M26 32 L45 32 L37 76 Z', g.lg(26, 32, 45, 76, ['#ffffff', '#e8dcc0', '#9a8a70']), '#fff6e0', 1.2);
  g.both('M74 32 L55 32 L63 76 Z', g.lg(74, 32, 55, 76, ['#ffffff', '#e8dcc0', '#9a8a70']), '#fff6e0', 1.2);
  g.fill(dropPath(37, 78, 4.4), g.lg(0, 78, 0, 92, ['#ff6a72', '#a0101c']));
  g.fill(dropPath(63, 80, 3.4), g.lg(0, 80, 0, 92, ['#ff6a72', '#a0101c']));
}};
ICONS.rupture = {bg:['#100208', '#4a0614'], glow:'rgba(255,30,60,.55)', ult:true, draw(g){
  g.glow(50, 50, 44, 'rgba(255,40,60,.65)');
  const tear = 'M84 10 L62 34 L72 38 L50 56 L58 60 L34 80 L16 92 L26 70 L18 66 L38 46 L30 40 L54 22 L48 16 Z';
  g.both(tear, g.lg(84, 10, 16, 92, ['#ff4a5a', '#6a0614', '#1a0208']), '#ff9aa4', 1.8);
  g.line('M70 24 L58 38 L66 40 L44 58', 'rgba(255,200,205,.55)', 1);
  g.fill(dropPath(80, 56, 4), '#e0182c'); g.fill(dropPath(22, 24, 3.4), '#e0182c'); g.fill(dropPath(86, 36, 2.6), '#e0182c'); g.fill(dropPath(60, 78, 3), '#e0182c');
  g.star(12, 52, 4, '#ffb0b8'); g.star(90, 82, 4, '#ffb0b8');
}};

/* ===== ИЛЬЯ ===== */
ICONS.ilyaPull = {bg:['#06160a', '#1e5a28'], glow:'rgba(120,230,100,.45)', draw(g){
  g.glow(50, 54, 40, 'rgba(120,230,100,.5)');
  [[62, 8], [62, 18], [62, 28]].forEach((l, i) => g.ell(l[0], l[1] + 4, i % 2 ? 7 : 4, i % 2 ? 4 : 7, null, g.lg(0, l[1], 0, l[1] + 10, ['#f0f4f2', '#7a8a86']), 3));
  g.line('M62 34 L62 58 C62 80 36 84 36 62', g.lg(30, 34, 70, 84, ['#f4f8f6', '#8a9c96', '#4a5a56']), 9);
  g.line('M62 34 L62 58 C62 80 36 84 36 62', 'rgba(255,255,255,.55)', 2);
  g.both('M28 62 L36 44 L44 62 Z', g.lg(0, 44, 0, 62, ['#ffffff', '#9aaca6']), '#e0f0ea', 1.2);
  g.star(84, 24, 4, '#d6ffc0'); g.star(16, 28, 4, '#d6ffc0'); g.star(80, 82, 3.6, '#d6ffc0');
}};
ICONS.ilyaAura = {bg:['#0a1604', '#3a6618'], glow:'rgba(160,230,60,.5)', draw(g){
  g.glow(50, 60, 40, 'rgba(160,230,60,.5)');
  ['M28 54 Q22 44 30 36 Q36 28 28 18', 'M50 50 Q44 40 52 30 Q58 22 50 10', 'M72 54 Q66 44 74 36 Q80 28 72 18'].forEach((d, i) => g.line(d, i === 1 ? '#e8ffa0' : '#c4f070', 3));
  [[28, 72, 17], [50, 66, 22], [72, 72, 17], [38, 80, 16], [62, 80, 16]].forEach(c => g.circ(c[0], c[1], c[2], g.rg(c[0], c[1], c[2], ['#b8ee58', '#6ab81c', '#2c6a0c'], c[0] - 5, c[1] - 6)));
  g.fill('M46 62 H54 V68 H46 Z M43 70 H57 V77 H43 Z', 'rgba(20,50,5,.7)');
  g.circ(46.5, 64, 2, '#c4f070'); g.circ(53.5, 64, 2, '#c4f070'); g.fill('M49 70 L51 70 L50 73 Z', '#c4f070');
  g.circ(20, 40, 3, null, '#d8ffa0', 1.4); g.circ(80, 44, 4, null, '#d8ffa0', 1.4); g.circ(84, 26, 2.4, null, '#d8ffa0', 1.4);
}};
ICONS.ilyaBelly = {bg:['#0a1606', '#2c5e1e'], glow:'rgba(150,230,90,.45)', draw(g){
  g.ell(50, 84, 42, 9, null, 'rgba(210,255,170,.8)', 2.4); g.ell(50, 84, 30, 6, null, 'rgba(210,255,170,.45)', 1.6);
  g.line('M50 84 L14 76 M50 84 L86 76 M50 84 L26 94 M50 84 L74 94 M50 84 L50 96', '#0a1606', 2.4);
  g.circ(50, 46, 29, g.rg(50, 46, 32, ['#c8f08a', '#7cc040', '#356a1a'], 40, 34), '#d8ffb0', 1.8);
  g.ell(50, 52, 5, 3.4, '#2a5412'); g.line('M30 60 Q50 76 70 60', 'rgba(30,70,10,.5)', 2);
  g.fill('M34 28 C40 22 48 22 54 24 C46 28 40 34 36 40 Z', 'rgba(255,255,255,.4)');
  g.line('M10 40 L20 44 M90 40 L80 44 M14 56 L22 56 M86 56 L78 56', '#e8ffc8', 2.2);
  g.star(50, 84, 8, '#ffffff');
}};
ICONS.ilyaFeast = {bg:['#1a0508', '#5a1018'], glow:'rgba(150,230,60,.4)', ult:true, draw(g){
  g.glow(50, 50, 42, 'rgba(255,80,60,.45)');
  g.ell(50, 54, 34, 28, g.rg(50, 54, 32, ['#8a0c1c', '#4a0610', '#1a0206']), '#ffb0a8', 2);
  g.both('M44 70 C44 58 56 58 56 70 C56 82 44 82 44 70 Z', g.lg(0, 58, 0, 80, ['#ff6a8a', '#a8142e']), '#ffc0c8', 1);
  for(let i = 0; i < 6; i++){ const t = (i + .5) / 6, a = Math.PI + t * Math.PI, x = 50 + Math.cos(a) * 31, y = 54 + Math.sin(a) * 25;
    g.at(x, y, a - Math.PI / 2, () => g.fill('M-5 0 L5 0 L0 11 Z', '#fff8e6')); }
  for(let i = 0; i < 5; i++){ const t = (i + .5) / 5, a = t * Math.PI, x = 50 + Math.cos(a) * 28, y = 54 + Math.sin(a) * 22;
    g.at(x, y, a + Math.PI / 2, () => g.fill('M-4 0 L4 0 L0 -9 Z', '#fff8e6')); }
  [[10, 12, 34, 34], [90, 12, 66, 34], [8, 88, 32, 72], [92, 88, 68, 72]].forEach(s => { g.line('M' + s[0] + ' ' + s[1] + ' L' + s[2] + ' ' + s[3], g.lg(s[0], s[1], s[2], s[3], ['rgba(170,255,100,0)', '#c4f070']), 3.4); g.circ(s[0] + (s[2] - s[0]) * .35, s[1] + (s[3] - s[1]) * .35, 2.4, '#e8ffa0'); });
}};

/* ===== МАЛИТ ===== */
ICONS.malitBackpack = {bg:['#1c0e06', '#6a3a14'], glow:'rgba(255,170,70,.45)', draw(g){
  g.line('M6 40 L20 40 M2 54 L16 54 M8 68 L20 68', 'rgba(255,225,170,.8)', 2.4);
  g.at(54, 58, -.22, () => {
    g.both('M-22 -26 Q-22 -42 0 -42 Q22 -42 22 -26 V28 Q22 40 10 40 H-10 Q-22 40 -22 28 Z', g.lg(-22, -42, 22, 40, ['#d89a58', '#9a5c26', '#5a3010']), '#ffd8a0', 1.8);
    g.both('M-22 -22 Q0 -4 22 -22 V-12 Q0 6 -22 -12 Z', g.lg(0, -22, 0, 6, ['#b87a40', '#6e4018']), '#ffd8a0', 1.2);
    g.both('M-14 8 H14 V30 H-14 Z', g.lg(0, 8, 0, 30, ['#8a4e20', '#5a3010']), '#ffd8a0', 1.2);
    g.both('M-4 12 H4 V19 H-4 Z', '#f0c850', '#fff2b0', 1);
    g.line('M-22 -4 L-30 8 L-30 28 M22 -4 L30 8 L30 28', '#3a2008', 3.4);
  });
  g.star(74, 18, 6, '#fff0a0'); g.star(86, 32, 4, '#fff0a0'); g.star(60, 12, 3.4, '#fff0a0');
}};
ICONS.malitPassive = {bg:['#1c0f06', '#5c3412'], glow:'rgba(255,160,60,.4)', passive:true, draw(g){
  let gear = '';
  for(let i = 0; i < 8; i++){ const a = i * Math.PI / 4, b = a + Math.PI / 8;
    gear += (i ? 'L' : 'M') + (40 + Math.cos(a - .16) * 26).toFixed(1) + ' ' + (52 + Math.sin(a - .16) * 26).toFixed(1) + ' L' + (40 + Math.cos(a - .1) * 33).toFixed(1) + ' ' + (52 + Math.sin(a - .1) * 33).toFixed(1) + ' L' + (40 + Math.cos(a + .26) * 33).toFixed(1) + ' ' + (52 + Math.sin(a + .26) * 33).toFixed(1) + ' L' + (40 + Math.cos(a + .32) * 26).toFixed(1) + ' ' + (52 + Math.sin(a + .32) * 26).toFixed(1) + ' '; }
  g.both(gear + 'Z', g.lg(10, 20, 70, 84, ['#e6c898', '#a07848', '#4e3418']), '#ffe6b8', 1.6);
  g.circ(40, 52, 14, g.rg(40, 52, 14, ['#2a1808', '#6a4420']), '#ffe6b8', 1.4);
  g.circ(40, 52, 5, '#e6c898');
  g.line('M66 34 L80 50 L66 66', '#ffd45a', 6); g.line('M80 34 L94 50 L80 66', '#ffb02a', 6);
  g.line('M66 34 L80 50 L66 66', '#fff2b0', 1.5);
}};
ICONS.malitLaunch = {bg:['#1c0e06', '#68360f'], glow:'rgba(255,180,70,.5)', draw(g){
  g.glow(50, 46, 38, 'rgba(255,190,80,.6)');
  g.line('M20 40 L20 60 M80 40 L80 60 M12 50 L12 66 M88 50 L88 66', 'rgba(255,230,170,.7)', 2.4);
  g.both('M50 8 L76 38 H60 V64 H40 V38 H24 Z', g.lg(0, 8, 0, 64, ['#fff2b0', '#ffb62a', '#c86a0c']), '#fff2c8', 1.8);
  g.line('M50 14 L50 56', 'rgba(255,255,255,.5)', 2);
  [[26, 80, 13], [46, 84, 15], [66, 80, 13], [82, 86, 9], [14, 88, 9]].forEach(c => g.circ(c[0], c[1], c[2], g.rg(c[0], c[1], c[2], ['#c6a070', '#8a6a44', '#4e3a22'], c[0] - 4, c[1] - 5)));
  g.star(86, 22, 4.4, '#fff0a0'); g.star(14, 24, 4.4, '#fff0a0');
}};
ICONS.malitLaser = {bg:['#1a0606', '#62100c'], glow:'rgba(255,60,40,.55)', ult:true, draw(g){
  g.glow(50, 50, 44, 'rgba(255,60,40,.65)');
  g.circ(50, 50, 34, 'rgba(255,80,50,.14)', '#ff6a50', 6); g.circ(50, 50, 34, null, '#ffd8c0', 1.8);
  g.circ(50, 50, 24, null, 'rgba(255,170,140,.55)', 1.2);
  for(let i = 0; i < 4; i++) g.at(50, 50, i * Math.PI / 2 + .35, () => { g.fill('M0 -4 L-3 -34 L3 -34 Z', 'rgba(255,230,210,.95)'); g.line('M0 0 L0 -34', '#ff5a3c', 2.4); });
  g.line('M50 16 A34 34 0 0 1 84 50', '#ffffff', 2.6);
  g.circ(50, 50, 10, g.rg(50, 50, 10, ['#ffffff', '#ffb090', '#d02a14']));
  g.star(50, 50, 16, 'rgba(255,255,255,.9)');
}};

/* ===== АРКАДИЙ ===== */
ICONS.arcadyFireballs = {bg:['#2c0c04', '#80280a'], glow:'rgba(255,150,40,.55)', draw(g){
  g.fireball(36, 38, 14); g.fireball(62, 64, 19);
  g.star(84, 22, 4.4, '#ffe9a0'); g.star(16, 78, 4, '#ffd070');
}};
ICONS.arcadyMolotov = {bg:['#220a04', '#6a200a'], glow:'rgba(255,130,30,.55)', draw(g){
  g.glow(50, 28, 30, 'rgba(255,150,40,.7)');
  g.flame(50, 28, 34, 11, ['#c4260a', '#ff6a10', '#ffd23a', '#ffffff']);
  g.both('M43 26 H57 V42 H43 Z', g.lg(43, 0, 57, 0, ['#7ac07a', '#bff0c0', '#4a8a52']), '#d8ffd8', 1.2);
  g.both('M43 42 H57 L67 56 V84 Q67 91 60 91 H40 Q33 91 33 84 V56 Z', g.lg(33, 40, 67, 91, ['rgba(190,240,200,.85)', 'rgba(90,160,110,.85)']), '#d8ffd8', 1.6);
  g.both('M34 68 H66 V84 Q66 90 60 90 H40 Q34 90 34 84 Z', g.lg(0, 66, 0, 90, ['#ffd23a', '#ff6a10', '#b81c06']), 'rgba(0,0,0,0)', 0);
  g.fill('M38 52 L42 50 L40 76 L37 76 Z', 'rgba(255,255,255,.55)');
  g.line('M40 28 L36 34 M60 28 L64 34', '#d8c090', 2.4);
  g.flame(16, 94, 24, 8, ['#c4260a', '#ff7a14', '#ffd23a']); g.flame(84, 94, 24, 8, ['#c4260a', '#ff7a14', '#ffd23a']);
}};
ICONS.arcadyFocus = {bg:['#240c06', '#6c2410'], glow:'rgba(255,140,50,.5)', passive:true, draw(g){
  g.glow(50, 50, 40, 'rgba(255,140,50,.5)');
  g.circ(50, 50, 34, 'rgba(255,100,30,.12)', '#ffb050', 3.4); g.circ(50, 50, 20, null, '#ff7a24', 2.6);
  g.line('M50 8 V30 M50 70 V92 M8 50 H30 M70 50 H92', '#ffe0a0', 3.4);
  g.glow(50, 50, 18, 'rgba(255,200,90,.9)');
  g.flame(50, 62, 28, 9.5, ['#c4260a', '#ff6a10', '#ffd23a', '#ffffff']);
  g.circ(50, 50, 34, null, 'rgba(255,255,255,.35)', .8);
}};
ICONS.arcadyDynamite = {bg:['#1c0a06', '#5c1a10'], glow:'rgba(255,100,40,.5)', ult:true, draw(g){
  g.glow(52, 22, 28, 'rgba(255,190,60,.75)');
  [[26, -.12], [46, 0], [66, .12]].forEach((s, i) => g.at(s[0] + 8, 86, s[1], () => {
    g.both('M-8 0 V-46 Q-8 -50 -4 -50 H4 Q8 -50 8 -46 V0 Q8 4 4 4 H-4 Q-8 4 -8 0 Z', g.lg(-8, 0, 8, 0, ['#8c1010', '#e0302c', '#a81818']), '#ffb0a0', 1.4);
    g.fill('M-8 -34 H8 V-20 H-8 Z', '#f2e6c8'); g.line('M-8 -27 H8', '#a09070', 1);
    g.fill('M-2 -49 H2 V-54 H-2 Z', '#2a1a10');
    g.line('M0 -54 Q' + (i - 1) * 6 + ' -64 ' + (i - 1) * 10 + ' -68', '#d8c090', 2);
  }));
  g.fill(starPath(36, 22, 9), '#fff2b0'); g.fill(starPath(56, 16, 11), '#ffffff'); g.fill(starPath(74, 22, 9), '#fff2b0');
  g.c.save(); g.c.globalAlpha = .85;
  [[36, 22], [56, 16], [74, 22]].forEach(p => g.glow(p[0], p[1], 10, '#ffb02a'));
  g.c.restore();
}};

/* ===== ПСИХ / ВЫСЕЛКИ / МЭРИН / ВИРСУДИ (0.10.2.2b) ===== */
function dogHead(g, x, y, s, c1, c2){
  g.at(x, y, 0, () => {
    g.c.scale(s, s);
    g.both('M-22 -6 L-26 -34 L-8 -20 Z', c2, '#1a0a06', 1.2); g.both('M22 -6 L26 -34 L8 -20 Z', c2, '#1a0a06', 1.2);
    g.both('M-24 -4 Q-24 -24 0 -24 Q24 -24 24 -4 Q24 10 12 14 L12 24 Q0 30 -12 24 L-12 14 Q-24 10 -24 -4 Z', g.lg(-24, -24, 24, 28, [c1, c2]), '#1a0a06', 1.4);
    g.fill('M-9 8 H9 L7 20 Q0 24 -7 20 Z', 'rgba(0,0,0,.35)'); g.circ(0, 9, 3, '#1a0a06');
    g.fill('M-14 -8 L-5 -4 L-6 0 L-15 -3 Z M14 -8 L5 -4 L6 0 L15 -3 Z', '#ffe36a');
    g.fill('M-8 19 L-5 19 L-6.5 26 Z M8 19 L5 19 L6.5 26 Z', '#fff');
  });
}
function carG(g, x, y, s, c1, c2, rot){
  g.at(x, y, rot || 0, () => {
    g.c.scale(s, s);
    g.both('M-34 0 V-9 Q-32 -13 -22 -14 L-13 -24 Q-9 -27 0 -27 H12 Q19 -27 23 -21 L29 -14 Q36 -12 36 -6 V0 Z', g.lg(0, -27, 0, 0, [c1, c2]), '#0a0a10', 1.6);
    g.both('M-11 -15 L-5 -23 H10 L16 -15 Z', g.lg(0, -23, 0, -15, ['#bfe8ff', '#4a6a88']), '#0a0a10', 1);
    g.line('M3 -23 V-15', '#0a0a10', 1.2);
    g.circ(-21, 0, 7, '#14141c', '#8a8a96', 1.6); g.circ(23, 0, 7, '#14141c', '#8a8a96', 1.6); g.circ(-21, 0, 3, '#c0c0cc'); g.circ(23, 0, 3, '#c0c0cc');
    g.fill('M32 -9 H37 V-5 H32 Z', '#fff6a0');
  });
}

/* --- Вирсуди --- */
ICONS.virsudiQ = {bg:['#0a0614', '#2e1448'], glow:'rgba(170,90,255,.5)', draw(g){
  [34, 24, 14].forEach((r, i) => g.line('M' + (50 - r) + ' 36 A' + r + ' ' + r + ' 0 0 1 ' + (50 + r) + ' 36', 'rgba(190,120,255,' + (.95 - i * .2) + ')', 3.4 - i * .5));
  [[50, 16, 34], [50, 16, 26]].forEach(() => 0);
  g.line('M16 70 Q50 30 84 70', 'rgba(150,80,230,.5)', 2); g.line('M26 82 Q50 52 74 82', 'rgba(150,80,230,.45)', 2);
  g.glow(50, 62, 22, 'rgba(255,60,90,.7)');
  g.fill(dropPath(50, 44, 10), g.lg(0, 44, 0, 74, ['#ff6a8a', '#8c0824'])); g.line(dropPath(50, 44, 10), '#ffc0cc', 1.2);
  g.star(18, 24, 4, '#e0c8ff'); g.star(84, 22, 4, '#e0c8ff');
}};
ICONS.virsudiW = {bg:['#080614', '#241846'], glow:'rgba(160,110,255,.5)', draw(g){
  g.line('M12 78 Q40 6 80 66', 'rgba(210,190,255,.9)', 2.6); g.c.save(); g.c.setLineDash([2, 6]); g.line('M12 78 Q40 6 80 66', '#fff', 1.4); g.c.restore();
  g.ell(80, 82, 18, 5, 'rgba(180,120,255,.5)', '#d8c0ff', 1.6); g.ell(80, 82, 28, 8, null, 'rgba(180,120,255,.5)', 1.4);
  g.at(46, 24, .5, () => {
    g.both('M-9 -12 Q0 -22 9 -12 L12 10 L0 16 L-12 10 Z', g.lg(0, -20, 0, 16, ['#50408a', '#180e30']), '#c8b0ff', 1.4);
    g.fill('M-6 -8 L-1 -6 L-2 -3 L-7 -5 Z M6 -8 L1 -6 L2 -3 L7 -5 Z', '#ff4a6a');
    g.line('M-8 12 L-16 24 M8 12 L16 20', '#8a70d0', 3);
  });
  g.star(16, 40, 4, '#d8c8ff'); g.star(88, 30, 3.6, '#d8c8ff');
}};
ICONS.virsudiE = {bg:['#0a0612', '#341050'], glow:'rgba(255,200,80,.4)', passive:true, draw(g){
  g.glow(50, 46, 36, 'rgba(255,200,80,.5)');
  g.both('M18 74 L14 34 L32 52 L50 24 L68 52 L86 34 L82 74 Z', g.lg(0, 24, 0, 74, ['#fff0a0', '#e0a43a', '#6a4010']), '#fff4c0', 1.6);
  g.rect = 0; g.both('M18 74 H82 V84 H18 Z', g.lg(0, 74, 0, 84, ['#c88a2a', '#5a3a10']), '#fff4c0', 1.2);
  [[14, 34], [50, 24], [86, 34]].forEach(p => g.circ(p[0], p[1], 4.4, g.rg(p[0], p[1], 5, ['#ffffff', '#e04a6a', '#6a0a24'])));
  g.circ(50, 62, 5, '#a828c8', '#f0d0ff', 1);
  g.line('M86 12 V26 M79 19 H93', '#ffe9a0', 3); g.line('M10 14 V24 M5 19 H15', '#ffe9a0', 2.4);
}};
ICONS.virsudiR = {bg:['#06040e', '#20143c'], glow:'rgba(150,120,255,.45)', ult:true, draw(g){
  g.glow(50, 52, 40, 'rgba(150,120,255,.55)');
  g.c.save(); g.c.setLineDash([5, 4]);
  g.both('M26 90 L26 44 Q26 14 50 14 Q74 14 74 44 L74 90 L62 80 L50 90 L38 80 Z', 'rgba(130,100,220,.16)', 'rgba(220,200,255,.9)', 2.2);
  g.c.restore();
  g.fill('M36 40 Q50 30 64 40 Q60 58 50 60 Q40 58 36 40 Z', 'rgba(8,4,20,.65)');
  g.ell(43, 46, 4.4, 2.8, '#ff4a6a'); g.ell(57, 46, 4.4, 2.8, '#ff4a6a');
  g.line('M12 24 L22 28 M88 24 L78 28 M10 60 L20 58 M90 60 L80 58', 'rgba(220,200,255,.55)', 2);
  g.star(20, 84, 4, '#e0d0ff'); g.star(82, 86, 4, '#e0d0ff');
}};

/* --- Выселки --- */
ICONS.vyPack = {bg:['#2a0a08', '#6e1c10'], glow:'rgba(255,120,50,.4)', draw(g){
  dogHead(g, 24, 56, .56, '#a8a8b4', '#5a5a68'); dogHead(g, 76, 56, .56, '#a8a8b4', '#5a5a68'); dogHead(g, 50, 52, .9, '#d8d8e4', '#70707e');
  g.star(16, 18, 4, '#ffd23a'); g.star(86, 20, 4, '#ffd23a');
}};
ICONS.vyHeads = {bg:['#220a08', '#5c1810'], glow:'rgba(255,90,40,.5)', draw(g){
  [[8, 30, 40], [4, 48, 30], [10, 66, 40]].forEach(l => g.fill('M' + l[0] + ' ' + l[1] + ' L' + (l[0] + l[2]) + ' ' + (l[1] - 2) + ' L' + (l[0] + l[2]) + ' ' + (l[1] + 2) + ' Z', g.lg(l[0], 0, l[0] + l[2], 0, ['rgba(255,150,60,0)', '#ffb04a'])));
  g.glow(62, 48, 32, 'rgba(255,100,40,.6)');
  g.at(62, 48, .25, () => {
    g.both('M-24 -8 Q-24 -28 0 -28 Q24 -28 24 -8 Q24 12 12 20 H-12 Q-24 12 -24 -8 Z', g.lg(-24, -28, 24, 20, ['#9ad04a', '#5a8a1c', '#2a4a0a']), '#e6ffb0', 1.6);
    g.fill('M-16 -8 L-5 -3 L-6 3 L-17 -2 Z M16 -8 L5 -3 L6 3 L17 -2 Z', '#ffe36a'); g.circ(-10, -1, 1.6, '#1a0a06'); g.circ(10, -1, 1.6, '#1a0a06');
    g.fill('M-12 12 L-14 26 L-6 14 Z M12 12 L14 26 L6 14 Z', '#fff8e0');
    g.line('M-8 14 H8', '#1a0a06', 2.4);
  });
  g.star(86, 20, 4, '#ffd23a');
}};
ICONS.vyGuard = {bg:['#20120c', '#5c3a22'], glow:'rgba(255,190,110,.35)', draw(g){
  g.both('M50 10 L84 24 V52 C84 72 66 84 50 92 C34 84 16 72 16 52 V24 Z', g.lg(16, 10, 84, 92, ['#b0a898', '#7a7266', '#3e3a34']), '#e6dcc8', 2.2);
  g.line('M34 28 L44 44 L36 58 L48 74 M66 30 L58 46 L68 60 M50 14 L52 30 L46 42', 'rgba(20,16,12,.7)', 2);
  g.line('M30 34 L38 26 M60 70 L70 62', 'rgba(255,255,255,.35)', 2);
  g.both('M38 44 H62 V60 H38 Z', g.lg(0, 44, 0, 60, ['#d4382a', '#7a1410']), '#ffd23a', 1.4);
  g.star(50, 52, 8, '#ffe9a0');
}};
ICONS.vyUlt = {bg:['#2a0806', '#6a140c'], glow:'rgba(255,170,50,.5)', ult:true, draw(g){
  g.glow(50, 50, 42, 'rgba(255,170,50,.55)');
  [[22, 24], [78, 24], [20, 76], [80, 76]].forEach(p => dogHead(g, p[0], p[1], .38, '#d8d8e4', '#70707e'));
  g.line('M30 34 L40 42 M70 34 L60 42 M30 68 L40 60 M70 68 L60 60', 'rgba(255,210,90,.8)', 2);
  g.at(50, 52, 0, () => {
    g.both('M-22 -8 Q-22 -28 0 -28 Q22 -28 22 -8 Q22 12 11 20 H-11 Q-22 12 -22 -8 Z', g.lg(-22, -28, 22, 20, ['#e05a3a', '#a01c10', '#4a0806']), '#ffd23a', 1.8);
    g.fill('M-15 -8 L-5 -3 L-6 3 L-16 -2 Z M15 -8 L5 -3 L6 3 L16 -2 Z', '#ffe36a'); g.fill('M-10 12 L-12 24 L-5 14 Z M10 12 L12 24 L5 14 Z', '#fff8e0');
    g.line('M-8 -30 L-12 -40 M8 -30 L12 -40', '#ffd23a', 3);
  });
}};

/* --- Псих --- */
ICONS.psihQ = {bg:['#0e0618', '#34165a'], glow:'rgba(150,255,60,.35)', draw(g){
  g.c.save(); g.c.setLineDash([4, 4]);
  g.both('M24 88 L24 46 Q24 14 50 14 Q76 14 76 46 L76 88 L64 78 L50 88 L36 78 Z', 'rgba(110,70,170,.22)', 'rgba(200,170,255,.85)', 2); g.c.restore();
  g.ell(40, 44, 6, 3.2, '#b6ff3a'); g.ell(60, 44, 6, 3.2, '#b6ff3a'); g.glow(40, 44, 10, 'rgba(182,255,58,.7)'); g.glow(60, 44, 10, 'rgba(182,255,58,.7)');
  g.line('M42 62 Q50 68 58 62', '#b6ff3a', 2);
  g.line('M8 30 L16 32 M92 30 L84 32 M8 66 L16 64 M92 66 L84 64', 'rgba(200,170,255,.5)', 2);
}};
ICONS.psihW = {bg:['#100620', '#401c70'], glow:'rgba(182,255,58,.4)', passive:true, draw(g){
  g.glow(50, 50, 40, 'rgba(182,255,58,.4)');
  let d = 'M50 50'; for(let a = 0; a < 17; a += .25){ const r = 2.2 * a; d += ' L' + (50 + Math.cos(a) * r).toFixed(1) + ' ' + (50 + Math.sin(a) * r).toFixed(1); }
  g.line(d, '#b6ff3a', 3.4); g.line(d, 'rgba(255,255,255,.55)', 1);
  g.both('M78 8 L66 28 L74 28 L68 44 L84 22 L76 22 Z', '#fff6a0', '#fff', 1);
  g.both('M18 62 L28 56 L24 68 L34 62', 'rgba(0,0,0,0)', '#d8b0ff', 2);
  g.star(14, 18, 4, '#d8f8a0'); g.star(86, 84, 4, '#d8f8a0');
}};
ICONS.psihE = {bg:['#0c0618', '#3a1860'], glow:'rgba(182,255,58,.35)', draw(g){
  g.ell(70, 28, 12, 20, g.rg(70, 28, 20, ['#e8d0ff', '#8a40e0', '#2a0c5a']), '#e8d8ff', 2);
  g.line('M20 86 L44 54', 'rgba(182,255,58,.5)', 1.6); g.line('M10 76 L36 48', 'rgba(182,255,58,.35)', 1.4);
  g.at(46, 56, -2.3, () => {
    g.both('M-4 0 L0 -40 L4 0 Z', g.lg(-4, 0, 4, 0, ['#f4fbff', '#8ea6bc', '#f4fbff']), '#e6ffb0', 1.2);
    g.line('M-10 2 H10', '#b6ff3a', 4); g.line('M0 2 V16', '#3a2a18', 5);
  });
  g.glow(26, 76, 14, 'rgba(182,255,58,.6)'); g.star(26, 76, 9, '#f4ffd0'); g.star(86, 70, 4, '#d8f8a0'); g.star(20, 20, 4, '#e0c8ff');
}};
ICONS.psihR = {bg:['#080612', '#1e1438'], glow:'rgba(182,255,58,.45)', ult:true, draw(g){
  g.glow(50, 70, 42, 'rgba(182,255,58,.55)');
  [[22, 62, .8], [78, 62, .8], [50, 54, 1.1]].forEach(s => g.at(s[0], s[1], 0, () => {
    g.c.scale(s[2], s[2]);
    g.line('M-8 30 V-4 M8 30 V-4', 'rgba(182,255,58,.0)', 1);
    g.both('M-14 28 V-6 Q-14 -26 0 -26 Q14 -26 14 -6 V28 Z', g.lg(0, -26, 0, 28, ['#c4c0d0', '#6e6a80', '#34304a']), '#e0dcf0', 1.4);
    g.line('M-6 -10 H6 M0 -16 V-4', 'rgba(20,16,40,.7)', 2.4);
  }));
  g.ell(50, 88, 38, 6, 'rgba(182,255,58,.45)');
  g.line('M14 88 Q10 76 16 70 M88 88 Q90 76 84 70', '#b6ff3a', 3.2);
  g.line('M34 88 Q38 78 34 70 M66 88 Q62 78 66 70', '#b6ff3a', 3.2);
  g.star(50, 16, 5, '#e0f8a0'); g.star(14, 30, 4, '#e0f8a0'); g.star(88, 28, 4, '#e0f8a0');
}};

/* --- Мэрин --- */
ICONS.marinCar = {bg:['#06080f', '#1c2a46'], glow:'rgba(255,179,71,.4)', draw(g){
  [[4, 40, 24], [0, 54, 18], [6, 68, 26]].forEach(l => g.fill('M' + l[0] + ' ' + l[1] + ' L' + (l[0] + l[2]) + ' ' + (l[1] - 1.4) + ' L' + (l[0] + l[2]) + ' ' + (l[1] + 1.4) + ' Z', g.lg(l[0], 0, l[0] + l[2], 0, ['rgba(255,200,120,0)', '#ffd090'])));
  g.glow(86, 60, 20, 'rgba(255,240,170,.7)');
  carG(g, 56, 64, 1.1, '#ffc060', '#c06a10');
  g.ell(52, 84, 34, 4, 'rgba(0,0,0,.4)'); g.star(84, 20, 4, '#ffe0a0'); g.star(20, 20, 4, '#ffe0a0');
}};
ICONS.marinFlow = {bg:['#080a14', '#202c4a'], glow:'rgba(255,179,71,.4)', passive:true, draw(g){
  g.ell(50, 62, 36, 9, g.lg(0, 54, 0, 72, ['#5a4a38', '#241a10']), '#c89a60', 1.4);
  g.both('M26 60 Q24 28 50 28 Q76 28 74 60 Q50 68 26 60 Z', g.lg(0, 28, 0, 66, ['#4a4a5a', '#1a1a24']), '#a8a8c0', 1.6);
  g.both('M27 52 Q50 60 73 52 V58 Q50 66 27 58 Z', '#ffb347', '#ffe0a0', 1);
  g.line('M30 74 Q50 98 70 74', '#f0c850', 3.4); g.line('M36 84 L40 90 M64 84 L60 90', '#f0c850', 3);
  g.line('M82 30 L92 40 L82 50', '#ffb347', 4);
  g.line('M8 30 L18 40 L8 50', '#ffd45a', 4);
}};
ICONS.marinHeat = {bg:['#1c0a06', '#6a2410'], glow:'rgba(255,100,40,.55)', draw(g){
  g.glow(50, 46, 44, 'rgba(255,110,40,.7)');
  for(let i = 0; i < 12; i++) g.at(50, 46, i * Math.PI / 6, () => g.fill('M-3 -24 L0 -40 L3 -24 Z', '#ffcf6a'));
  g.circ(50, 46, 22, g.rg(50, 46, 22, ['#fff6c0', '#ffb02a', '#e0501a'], 42, 38), '#ffe9a0', 1.6);
  ['M8 76 Q18 68 28 76 T48 76 T68 76 T88 76', 'M8 86 Q18 78 28 86 T48 86 T68 86 T88 86'].forEach((d, i) => g.line(d, 'rgba(255,230,170,' + (.9 - i * .3) + ')', 2.6));
}};
ICONS.marinFleet = {bg:['#06080f', '#1a2848'], glow:'rgba(255,179,71,.45)', ult:true, draw(g){
  g.glow(50, 50, 42, 'rgba(255,179,71,.5)');
  carG(g, 30, 36, .6, '#6ab0ff', '#1c4a9a'); carG(g, 72, 34, .6, '#ff7a6a', '#a02a1c');
  carG(g, 24, 64, .66, '#8aea8a', '#2a7a3a'); carG(g, 76, 66, .66, '#e0b0ff', '#6a2a9a');
  carG(g, 50, 84, .78, '#ffc060', '#c06a10');
  g.line('M8 20 L14 20 M86 18 L92 18', 'rgba(255,224,160,.7)', 2); g.star(50, 20, 5, '#ffe9a0');
}};

/* ---------- кэш и рамка ---------- */
function frame(c, spec){
  const R = 14;
  const rr = (x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); };
  /* внутренняя виньетка */
  c.save(); rr(2, 2, 96, 96, R); c.clip();
  const vg = c.createRadialGradient(50, 50, 28, 50, 50, 72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
  c.fillStyle = vg; c.fillRect(0, 0, 100, 100);
  const gl = c.createLinearGradient(0, 0, 0, 46); gl.addColorStop(0, 'rgba(255,255,255,.22)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gl; c.fillRect(0, 0, 100, 46);
  c.restore();
  /* рамка */
  rr(1.5, 1.5, 97, 97, R); c.lineWidth = 3; c.strokeStyle = '#0a0806'; c.stroke();
  const edge = c.createLinearGradient(0, 0, 100, 100);
  if(spec.ult){ edge.addColorStop(0, '#fff0b0'); edge.addColorStop(.5, '#e0a43a'); edge.addColorStop(1, '#8a5a14'); }
  else if(spec.passive){ edge.addColorStop(0, '#e8f0f4'); edge.addColorStop(.5, '#8a9aa6'); edge.addColorStop(1, '#4a5864'); }
  else { edge.addColorStop(0, '#d8c08a'); edge.addColorStop(.5, '#8a7048'); edge.addColorStop(1, '#4a3a22'); }
  rr(3, 3, 94, 94, R - 2); c.lineWidth = 2.4; c.strokeStyle = edge;
  if(spec.passive) c.setLineDash([7, 3.5]);
  c.stroke(); c.setLineDash([]);
  rr(5.2, 5.2, 89.6, 89.6, R - 4); c.lineWidth = 1; c.strokeStyle = 'rgba(255,255,255,.14)'; c.stroke();
}
function render(id){
  const spec = ICONS[id]; if(!spec) return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = RES;
  const c = cv.getContext('2d'); c.scale(RES / 100, RES / 100);
  c.save(); c.beginPath(); c.roundRect(2, 2, 96, 96, 14); c.clip();
  const bg = c.createLinearGradient(0, 0, 0, 100); bg.addColorStop(0, spec.bg[0]); bg.addColorStop(1, spec.bg[1]);
  c.fillStyle = bg; c.fillRect(0, 0, 100, 100);
  const g = makeG(c);
  g.glow(50, 52, 46, spec.glow, .55);
  try { spec.draw(g); } catch(err){ /* одна кривая иконка не должна ронять игру */ }
  c.restore();
  frame(c, spec);
  return cv;
}
function resolveId(v){
  if(!v) return null;
  if(typeof v === 'string') return ICONS[v] ? v : null;
  if(!reverse){
    reverse = new Map();
    try { if(typeof SKILLS !== 'undefined') for(const k in SKILLS) reverse.set(SKILLS[k], k); } catch(err){}
  }
  let id = reverse.get(v);
  if(!id){   /* навыки частью героев добавляются позже (update-файлы) — пересобираем карту при промахе */
    try { if(typeof SKILLS !== 'undefined' && Object.keys(SKILLS).length !== reverse.size) for(const k in SKILLS) reverse.set(SKILLS[k], k); } catch(err){}
    id = reverse.get(v);
  }
  return id && ICONS[id] ? id : null;
}
function get(v){
  const id = resolveId(v); if(!id) return null;
  let cv = cache.get(id);
  if(!cv){ cv = render(id); cache.set(id, cv); }
  return cv;
}
function draw(ctx, v, x, y, size, opt){
  const cv = get(v); if(!cv) return false;
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if(opt && opt.dim) ctx.globalAlpha *= Math.max(0, 1 - opt.dim);
  ctx.drawImage(cv, x, y, size, size);
  if(opt && opt.gray){ ctx.globalAlpha = opt.gray; ctx.fillStyle = '#05080e'; ctx.beginPath(); ctx.roundRect(x + size * .02, y + size * .02, size * .96, size * .96, size * .14); ctx.fill(); }
  ctx.restore();
  return true;
}

window.SkillIcons = {draw, get, has: v => !!resolveId(v), ids: () => Object.keys(ICONS), version: '0.10.2.2'};
})();
