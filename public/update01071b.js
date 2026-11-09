/* DotaSense 0.10.7.1 — НОВЫЙ ВИД ВКЛАДКИ «БОЙЦЫ».
   Положение и размеры карточек не менялись (клики, наведение и профиль героя работают как раньше) — меняется только оформление:
   • фон со светом под цвет героя, на которого наведён курсор, золотая пыль и затемнение шапки;
   • шапка: золотые линии с ромбами вокруг вкладки и плашки «БОЙЦОВ · БЛИЖНИХ · ДАЛЬНИХ · АРКАН · ЛЮБИМЫЙ»;
   • карточки со скошенными углами, плавным подъёмом и свечением цветом героя, бегущей рамкой и искрами при наведении;
   • на карточке: значок роли (меч / лук), номер, звёзды мастерства, значок арканы (горит, если надета), отметка любимого бойца,
     три полоски характеристик (здоровье, урон, скорость);
   • при наведении — ряд иконок навыков на портрете и нижняя панель с подробными характеристиками героя.
   Подключается после update0100b.js (оборачивает drawMenu и рисует поверх штатной сцены). */
(function(){
'use strict';
const G = window, TAU = Math.PI * 2;
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update01071b ' + tag + ':', err); } catch(e) {} } };
const c01 = v => v < 0 ? 0 : (v > 1 ? 1 : v);
const ease = v => 1 - Math.pow(1 - c01(v), 3);
const lowFx = () => (typeof perfLite === 'function' && perfLite()) || (typeof fxl === 'function' && fxl() >= 2);
const GOLD = '#d7b36a', GOLD2 = '#f2d58f';
const COL_HP = '#59d98a', COL_DMG = '#ff8a4c', COL_SPD = '#63d6ff', COL_RNG = '#c79bff';

let lastStage = '', enterAt = 0, lastMs = 0, hoverIdx = -1;
const HV = [];                                   /* плавное значение наведения для каждой карточки, 0..1 */
const tint = {r: 215, g: 179, b: 106, a: 0};     /* цвет подсветки фона */
let NORM = null;

function norm(){
  if(NORM && NORM.n === HERO_DEFS.length) return NORM;
  const m = {n: HERO_DEFS.length, hp: 1, dmg: 1, spd: 1, rng: 1};
  for(const d of HERO_DEFS){
    m.hp = Math.max(m.hp, d.baseHp || 0); m.dmg = Math.max(m.dmg, d.baseDmg || 0);
    m.spd = Math.max(m.spd, d.speed || 0); m.rng = Math.max(m.rng, d.atkRange || 0);
  }
  return NORM = m;
}
function rgbOf(hex){
  let h = String(hex || '#d7b36a').replace('#', '');
  if(h.length === 3) h = h.split('').map(c => c + c).join('');
  const v = parseInt(h.slice(0, 6), 16) || 0;
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
const rgba = (hex, a) => (typeof hexRgba === 'function' ? hexRgba(hex, a) : 'rgba(255,255,255,' + a + ')');
function chamfer(g, x, y, w, h, c, c2){
  c2 = c2 == null ? c * 0.35 : c2;
  g.beginPath();
  g.moveTo(x + c, y); g.lineTo(x + w - c2, y); g.lineTo(x + w, y + c2); g.lineTo(x + w, y + h - c);
  g.lineTo(x + w - c, y + h); g.lineTo(x + c2, y + h); g.lineTo(x, y + h - c2); g.lineTo(x, y + c); g.closePath();
}
function fit(g, text, maxW){
  let t = String(text);
  if(g.measureText(t).width <= maxW) return t;
  while(t.length > 3 && g.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}
const isRanged = d => (d.atkRange || 0) > 300;

/* ---------- мастерство (как в update0100b) ---------- */
function masteryLevel(id){
  const p = G.__shadowAccountProfile;
  if(!p || !p.masteryCfg || !p.masteryCfg.heroes.includes(id)) return -1;
  const w = (p.mastery && p.mastery[id] && p.mastery[id].wins) || 0;
  let l = 0; p.masteryCfg.wins.forEach((n, i) => { if(w >= n) l = i + 1; });
  return l;
}
function masteryInfo(id){
  const p = G.__shadowAccountProfile, l = masteryLevel(id);
  if(l < 0) return null;
  const c = p.masteryCfg, w = (p.mastery && p.mastery[id] && p.mastery[id].wins) || 0;
  const claimed = (p.mastery && p.mastery[id] && p.mastery[id].claimed) || 0;
  const max = c.wins.length, prev = l > 0 ? c.wins[l - 1] : 0;
  const frac = l >= max ? 1 : Math.max(0, Math.min(1, (w - prev) / (c.wins[l] - prev)));
  return {lvl: l, max, frac, ready: claimed < l};
}
/* ---------- аркана героя (первая найденная) ---------- */
const arcCache = {};
function arcanaOf(def){
  if(def.id in arcCache) return arcCache[def.id];
  let found = null;
  try { found = SKIN_DEFS.find(s => s && s.arcana && s.heroId === def.id) || null; } catch(e) {}
  if(found || (typeof SKIN_DEFS !== 'undefined' && SKIN_DEFS.length > 60)) arcCache[def.id] = found;
  return found;
}
function arcanaOn(def){
  const a = arcanaOf(def); if(!a) return false;
  try { return typeof activeSkinFor === 'function' && String(activeSkinFor(def.id) || '').split('+')[0] === a.id; } catch(e) { return false; }
}

/* ---------- значки: роль ---------- */
function roleIcon(g, cx, cy, s, ranged, col){
  g.save(); g.translate(cx, cy); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(1.3, s * 0.13); g.lineCap = 'round'; g.lineJoin = 'round';
  if(ranged){                                                    /* прицел */
    g.beginPath(); g.arc(0, 0, s * 0.42, 0, TAU); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.62, 0); g.lineTo(-s * 0.2, 0); g.moveTo(s * 0.2, 0); g.lineTo(s * 0.62, 0);
    g.moveTo(0, -s * 0.62); g.lineTo(0, -s * 0.2); g.moveTo(0, s * 0.2); g.lineTo(0, s * 0.62); g.stroke();
    g.beginPath(); g.arc(0, 0, s * 0.07, 0, TAU); g.fill();
  } else {                                                       /* меч */
    g.rotate(Math.PI / 4);
    g.beginPath(); g.moveTo(0, -s * 0.66); g.lineTo(0, s * 0.3); g.stroke();
    g.beginPath(); g.moveTo(-s * 0.26, s * 0.3); g.lineTo(s * 0.26, s * 0.3); g.stroke();
    g.beginPath(); g.moveTo(0, s * 0.3); g.lineTo(0, s * 0.58); g.stroke();
    g.beginPath(); g.moveTo(0, -s * 0.78); g.lineTo(-s * 0.1, -s * 0.58); g.lineTo(s * 0.1, -s * 0.58); g.closePath(); g.fill();
  }
  g.restore();
}
function gemIcon(g, cx, cy, s, col, glow){
  g.save(); g.translate(cx, cy);
  if(glow){ g.shadowColor = col; g.shadowBlur = 10; }
  g.fillStyle = col; g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.72, 0); g.lineTo(0, s); g.lineTo(-s * 0.72, 0); g.closePath(); g.fill();
  g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.65)'; g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.72, 0); g.lineTo(0, -s * 0.05); g.closePath(); g.fill();
  g.restore();
}

/* ---------- скиллы героя: иконка или буква ---------- */
function skillIcon(g, id, x, y, size){
  const sk = (typeof SKILLS !== 'undefined') ? SKILLS[id] : null;
  let ok = false;
  try { ok = !!(G.SkillIcons && sk && SkillIcons.draw(g, sk, x, y, size)); } catch(e) { ok = false; }
  if(!ok){
    g.fillStyle = 'rgba(20,22,32,.92)'; g.strokeStyle = 'rgba(215,179,106,.6)'; g.lineWidth = 1;
    g.beginPath(); g.roundRect(x, y, size, size, size * 0.2); g.fill(); g.stroke();
    g.fillStyle = '#f2e2bd'; g.font = 'bold ' + Math.round(size * 0.5) + 'px Segoe UI, Arial'; g.textAlign = 'center';
    g.fillText((sk && sk.short) || '?', x + size / 2, y + size * 0.68);
  } else {
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1; g.beginPath(); g.roundRect(x + 0.5, y + 0.5, size - 1, size - 1, size * 0.16); g.stroke();
  }
}

/* =========================================================
   ФОН: свет героя, пыль, затемнение шапки
   ========================================================= */
function backdropExtras(now){
  const g = ctx;
  g.save();
  const top = g.createLinearGradient(0, 0, 0, 170);                                       /* затемнение шапки */
  top.addColorStop(0, 'rgba(4,3,8,.72)'); top.addColorStop(1, 'rgba(4,3,8,0)');
  g.fillStyle = top; g.fillRect(0, 0, VW, 170);
  const bot = g.createLinearGradient(0, VH - 220, 0, VH);                                 /* золотое сияние пола */
  bot.addColorStop(0, 'rgba(215,179,106,0)'); bot.addColorStop(1, 'rgba(215,179,106,.11)');
  g.fillStyle = bot; g.fillRect(0, VH - 220, VW, 220);
  if(!lowFx()){
    if(tint.a > 0.01){                                                                    /* свет под цвет героя */
      g.globalCompositeOperation = 'lighter';
      const R = Math.max(VW, VH) * 0.68, cx = VW / 2, cy = VH * 0.56;
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, 'rgba(' + (tint.r | 0) + ',' + (tint.g | 0) + ',' + (tint.b | 0) + ',' + (tint.a * 0.3).toFixed(3) + ')');
      gr.addColorStop(1, 'rgba(' + (tint.r | 0) + ',' + (tint.g | 0) + ',' + (tint.b | 0) + ',0)');
      g.fillStyle = gr; g.fillRect(0, 0, VW, VH);
    }
    g.globalCompositeOperation = 'lighter';                                               /* золотая пыль */
    const hs = typeof dsHash === 'function' ? dsHash : (n => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); });
    for(let i = 0; i < 34; i++){
      const ph = (now * (0.012 + hs(i) * 0.02) + hs(i + 50)) % 1;
      const x = VW * hs(i + 3) + Math.sin(now * 0.5 + i) * 14, y = VH * (1.03 - ph * 1.1);
      g.globalAlpha = Math.sin(ph * Math.PI) * (0.35 + 0.4 * Math.sin(now * 2 + i * 1.7) ** 2);
      g.fillStyle = i % 4 === 0 ? '#fff1c1' : GOLD;
      g.beginPath(); g.arc(x, y, 0.8 + hs(i + 9) * 1.8, 0, TAU); g.fill();
    }
  }
  g.restore();
}

/* =========================================================
   ШАПКА
   ========================================================= */
function drawHeader(now, t){
  const g = ctx, a = ease(t / 0.5);
  g.save(); g.globalAlpha = a;
  const midY = 91, tabX = VW / 2 - 92, tabW = 184;                                         /* вкладка «БОЙЦЫ» из game.js */
  const lx0 = Math.max(164, VW * 0.09), lx1 = tabX - 26, rx0 = tabX + tabW + 26, rx1 = Math.min(VW - 164, VW * 0.91);
  for(const [x0, x1, dir] of [[lx0, lx1, 1], [rx1, rx0, -1]]){
    if(Math.abs(x1 - x0) < 20) continue;
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    gr.addColorStop(0, 'rgba(215,179,106,0)'); gr.addColorStop(0.7, 'rgba(215,179,106,.65)'); gr.addColorStop(1, GOLD2);
    g.strokeStyle = gr; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x0, midY); g.lineTo(x1, midY); g.stroke();
    g.strokeStyle = 'rgba(215,179,106,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0 + dir * 30, midY + 5); g.lineTo(x1 - dir * 10, midY + 5); g.stroke();
    g.fillStyle = GOLD2; g.beginPath(); g.moveTo(x1, midY - 6); g.lineTo(x1 - dir * 6, midY); g.lineTo(x1, midY + 6); g.lineTo(x1 + dir * 4, midY); g.closePath(); g.fill();
    g.fillStyle = 'rgba(242,213,143,.6)'; g.beginPath(); g.arc(x1 - dir * 16, midY, 2, 0, TAU); g.fill();
  }
  /* плашки со сводкой */
  const total = HERO_DEFS.length, ranged = HERO_DEFS.filter(isRanged).length, melee = total - ranged;
  const arcs = HERO_DEFS.filter(d => arcanaOf(d)).length;
  const fav = (typeof favoriteHeroId !== 'undefined' && favoriteHeroId) ? HERO_DEFS.find(d => d.id === favoriteHeroId) : null;
  const chips = [['БОЙЦОВ', String(total), GOLD2], ['БЛИЖНИХ', String(melee), '#ffb27a'], ['ДАЛЬНИХ', String(ranged), '#8be9fd'], ['АРКАН', String(arcs), '#ff9bd5']];
  if(fav) chips.push(['ЛЮБИМЫЙ', fav.name, '#ff6a7a']);
  g.font = 'bold 9px Consolas, monospace';
  const widths = chips.map(c => { g.font = 'bold 9px Consolas, monospace'; const lw = g.measureText(c[0]).width; g.font = 'bold 13px Segoe UI, Arial'; return lw + g.measureText(c[1]).width + 30; });
  const gap = 8, totalW = widths.reduce((s, w) => s + w, 0) + gap * (chips.length - 1);
  let x = VW / 2 - totalW / 2; const y = 114, h = 22;
  chips.forEach((c, i) => {
    const w = widths[i];
    chamfer(g, x, y, w, h, 7, 3);
    const bg = g.createLinearGradient(0, y, 0, y + h); bg.addColorStop(0, 'rgba(255,255,255,.07)'); bg.addColorStop(1, 'rgba(255,255,255,.02)');
    g.fillStyle = bg; g.fill(); g.strokeStyle = rgba(c[2], 0.45); g.lineWidth = 1; g.stroke();
    g.fillStyle = c[2]; g.fillRect(x + 1, y + 5, 2, h - 10);
    g.textAlign = 'left'; g.font = 'bold 9px Consolas, monospace'; g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText(c[0], x + 10, y + 15);
    const lw = g.measureText(c[0]).width;
    g.font = 'bold 13px Segoe UI, Arial'; g.fillStyle = '#fff'; g.fillText(c[1], x + 16 + lw, y + 16);
    x += w + gap;
  });
  g.restore();
}

/* =========================================================
   КАРТОЧКА
   ========================================================= */
function drawCard(def, i, r, hv, now, t){
  const a = ease((t - i * 0.028) / 0.5);
  if(a <= 0) return;
  const g = ctx, md = (typeof menuHeroDef === 'function') ? menuHeroDef(def) : def;
  const c1 = md.color || '#8899aa', c2 = md.color2 || c1;
  const small = r.w < 160, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  g.save();
  g.globalAlpha = a;
  g.translate(cx, cy + (1 - a) * 20 - 6 * hv);
  const sc = 1 + 0.045 * hv; g.scale(sc, sc);
  g.translate(-cx, -cy);

  /* тень и подложка */
  g.shadowColor = hv > 0.02 ? rgba(c2, 0.28 + 0.4 * hv) : 'rgba(0,0,0,.5)'; g.shadowBlur = 10 + 24 * hv; g.shadowOffsetY = 3 + 5 * hv;
  chamfer(g, r.x, r.y, r.w, r.h, 14, 5);
  const bg = g.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  bg.addColorStop(0, hv > 0.5 ? '#2a2328' : '#1c1a21'); bg.addColorStop(1, '#090a10');
  g.fillStyle = bg; g.fill();
  g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;

  g.save();
  chamfer(g, r.x, r.y, r.w, r.h, 14, 5); g.clip();
  const glow = g.createRadialGradient(cx, r.y + r.h, 4, cx, r.y + r.h, r.w * 0.85);              /* цветное свечение снизу */
  glow.addColorStop(0, rgba(c2, 0.16 + 0.26 * hv)); glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow; g.fillRect(r.x, r.y, r.w, r.h);

  /* портрет */
  const pad = 6, strip = r.h >= 130 ? 58 : (r.h >= 108 ? 52 : 40);
  const px = r.x + pad, py = r.y + pad, pw = r.w - pad * 2, ph = r.h - pad - strip;
  g.save();
  chamfer(g, px, py, pw, ph, 9, 4); g.clip();
  g.fillStyle = rgba(c1, 0.25); g.fillRect(px, py, pw, ph);
  try { drawHeroTexture(def, px, py, pw, ph, now, false); } catch(err) { warn('tex', err); }
  const fade = g.createLinearGradient(0, py + ph * 0.5, 0, py + ph);
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(8,8,12,.86)');
  g.fillStyle = fade; g.fillRect(px, py, pw, ph);
  if(hv > 0.05 && !lowFx()){                                                                      /* блик */
    const sx = px + ((now * 0.8) % 1.8 - 0.4) * pw;
    const sh = g.createLinearGradient(sx - 30, 0, sx + 30, 0);
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,' + (0.24 * hv).toFixed(3) + ')'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sh; g.fillRect(px, py, pw, ph);
  }
  g.restore();
  g.lineWidth = 1.4; g.strokeStyle = rgba(c2, 0.45 + 0.5 * hv); chamfer(g, px, py, pw, ph, 9, 4); g.stroke();

  /* планка сверху */
  const rib = g.createLinearGradient(r.x, 0, r.x + r.w, 0);
  rib.addColorStop(0, 'rgba(0,0,0,0)'); rib.addColorStop(0.5, rgba(c2, 0.95)); rib.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rib; g.fillRect(r.x, r.y, r.w, 3);

  /* нижняя плашка: цветной градиент */
  const sy = r.y + r.h - strip;
  const sg = g.createLinearGradient(0, sy, 0, r.y + r.h); sg.addColorStop(0, rgba(c1, 0.0)); sg.addColorStop(1, rgba(c1, 0.22));
  g.fillStyle = sg; g.fillRect(r.x, sy, r.w, strip);
  g.restore();

  /* внешняя рамка: золото → цвет героя; при наведении — бегущий блик */
  chamfer(g, r.x, r.y, r.w, r.h, 14, 5);
  const bd = g.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  bd.addColorStop(0, hv > 0.5 ? GOLD2 : 'rgba(215,179,106,.62)'); bd.addColorStop(1, rgba(c2, 0.4 + 0.5 * hv));
  g.strokeStyle = bd; g.lineWidth = 1.5 + 1.2 * hv; g.stroke();
  if(hv > 0.05 && !lowFx()){
    const off = (now * 0.9) % 1, bx = r.x + r.w * off * 2 - r.w * 0.5;
    const rg = g.createLinearGradient(bx - r.w * 0.35, r.y, bx + r.w * 0.35, r.y + r.h);
    rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.5, 'rgba(255,255,255,' + (0.95 * hv).toFixed(3) + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.save(); chamfer(g, r.x, r.y, r.w, r.h, 14, 5); g.strokeStyle = rg; g.lineWidth = 2.4; g.stroke(); g.restore();
  }
  /* уголки */
  g.strokeStyle = rgba(GOLD2, 0.55 + 0.4 * hv); g.lineWidth = 2;
  g.beginPath(); g.moveTo(r.x + 4, r.y + 20); g.lineTo(r.x + 4, r.y + 8); g.lineTo(r.x + 9, r.y + 4); g.stroke();
  g.beginPath(); g.moveTo(r.x + r.w - 4, r.y + r.h - 20); g.lineTo(r.x + r.w - 4, r.y + r.h - 8); g.lineTo(r.x + r.w - 9, r.y + r.h - 4); g.stroke();

  /* значки на портрете */
  g.textBaseline = 'alphabetic';
  const ranged = isRanged(def), roleCol = ranged ? '#8be9fd' : '#ffb27a';
  const rbW = small ? 22 : 66, rbH = 17;
  chamfer(g, px + 5, py + 5, rbW, rbH, 6, 2); g.fillStyle = 'rgba(0,0,0,.62)'; g.fill();
  g.strokeStyle = rgba(roleCol, 0.5); g.lineWidth = 1; g.stroke();
  roleIcon(g, px + 5 + 10, py + 5 + rbH / 2, 9, ranged, roleCol);
  if(!small){ g.font = 'bold 9px Consolas, monospace'; g.textAlign = 'left'; g.fillStyle = roleCol; g.fillText(ranged ? 'ДАЛЬНИЙ' : 'БЛИЖНИЙ', px + 5 + 21, py + 5 + 12); }
  g.textAlign = 'right'; g.font = 'bold ' + (small ? 9 : 10) + 'px Consolas, monospace'; g.fillStyle = 'rgba(255,255,255,.78)';
  g.fillText('№' + String(i + 1).padStart(2, '0'), px + pw - 6, py + 14);
  let ry = py + 24;
  if(typeof favoriteHeroId !== 'undefined' && favoriteHeroId === def.id){
    g.font = 'bold 15px Segoe UI, Arial'; g.fillStyle = '#ff6a7a'; g.shadowColor = '#ff2a44'; g.shadowBlur = 8; g.fillText('★', px + pw - 5, ry + 9); g.shadowBlur = 0; ry += 17;
  }
  const arc = arcanaOf(def);
  if(arc){
    const on = arcanaOn(def), col = arc.accent || '#ff9bd5', pulse = 0.65 + 0.35 * Math.sin(now * 3 + i);
    g.globalAlpha = a * (on ? 1 : 0.55 + 0.25 * pulse);
    gemIcon(g, px + pw - 11, ry + 6, 6.5, col, on);
    g.globalAlpha = a;
  }
  /* мастерство */
  const mi = masteryInfo(def.id);
  if(mi){
    const bh = small ? 16 : 18, bw2 = small ? 40 : 46, bx = px + 5, by = py + 5 + rbH + 5;
    g.shadowColor = mi.lvl >= mi.max ? 'rgba(255,213,104,.9)' : 'transparent'; g.shadowBlur = mi.lvl >= mi.max ? 10 : 0;
    const gb = g.createLinearGradient(0, by, 0, by + bh);
    gb.addColorStop(0, mi.lvl > 0 ? '#ffe39a' : '#4a4740'); gb.addColorStop(1, mi.lvl > 0 ? '#c58a2a' : '#2a2824');
    g.fillStyle = gb; g.beginPath(); g.roundRect(bx, by, bw2, bh, 9); g.fill(); g.shadowBlur = 0;
    g.lineWidth = 1; g.strokeStyle = mi.lvl > 0 ? 'rgba(58,40,8,.9)' : 'rgba(255,255,255,.25)'; g.stroke();
    g.textAlign = 'center'; g.font = 'bold ' + (small ? 10 : 11) + 'px Segoe UI, Arial'; g.fillStyle = mi.lvl > 0 ? '#2b1c05' : 'rgba(255,255,255,.65)';
    g.fillText('★ ' + mi.lvl + '/' + mi.max, bx + bw2 / 2, by + bh - 5);
    if(mi.ready){
      const pr = 1 + Math.sin(now * 5) * 0.12;
      g.save(); g.translate(bx + bw2 + 9, by + bh / 2); g.scale(pr, pr);
      g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.fillStyle = '#ff4d5e'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#fff'; g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 11px Segoe UI, Arial'; g.textAlign = 'center'; g.fillText('!', 0, 4);
      g.restore();
    }
    const barX = px + 8, barW = pw - 16, barY = py + ph - 7;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.roundRect(barX, barY, barW, 4, 2); g.fill();
    if(mi.frac > 0){ g.fillStyle = mi.lvl >= mi.max ? '#ffd568' : rgba(c2, 1); g.beginPath(); g.roundRect(barX, barY, Math.max(4, barW * mi.frac), 4, 2); g.fill(); }
  }

  /* ряд навыков при наведении */
  if(hv > 0.05 && Array.isArray(def.skills) && ph >= 54 && !small){
    const ids = def.skills.slice(0, 5), size = Math.max(18, Math.min(28, (pw - 16) / ids.length - 4)), gp = 4;
    const tw = ids.length * size + (ids.length - 1) * gp, sx0 = cx - tw / 2, sy0 = py + ph - size - (mi ? 14 : 8);
    g.save(); g.globalAlpha = a * hv;
    g.fillStyle = 'rgba(6,7,12,.7)'; g.beginPath(); g.roundRect(sx0 - 6, sy0 - 5, tw + 12, size + 10, 8); g.fill();
    g.strokeStyle = rgba(c2, 0.5); g.lineWidth = 1; g.stroke();
    ids.forEach((id, k) => skillIcon(g, id, sx0 + k * (size + gp), sy0, size));
    g.restore();
  }

  /* имя, титул, полоски характеристик */
  g.textAlign = 'center';
  g.font = 'bold ' + (small ? 14 : 17) + 'px Georgia, serif';
  g.shadowColor = rgba(c2, 0.75); g.shadowBlur = 4 + 8 * hv;
  g.fillStyle = hv > 0.5 ? '#fff3cf' : '#fff';
  g.fillText(fit(g, def.name, r.w - 16), cx, sy + 17);
  g.shadowBlur = 0;
  g.font = (small ? 9 : 10.5) + 'px Segoe UI, Arial'; g.fillStyle = rgba(c2, 0.95);
  const ml = masteryLevel(def.id), titleMax = ml >= 0 ? r.w - 74 : r.w - 16;
  g.textAlign = ml >= 0 ? 'left' : 'center';
  g.fillText(fit(g, String(def.title).toUpperCase(), titleMax), ml >= 0 ? r.x + 10 : cx, sy + 32);
  if(ml >= 0){
    g.textAlign = 'right'; g.font = (small ? 9 : 11) + 'px Segoe UI, Arial';
    for(let s = 4; s >= 0; s--){
      g.fillStyle = ml >= 2 * (s + 1) ? '#ffd568' : ml === 2 * s + 1 ? '#a5822f' : 'rgba(255,255,255,.2)';
      g.fillText('★', r.x + r.w - 10 - (4 - s) * (small ? 9 : 11), sy + 32);
    }
  }
  if(strip >= 50){
    const N = norm(), bw = (r.w - 20 - 8) / 3, by2 = r.y + r.h - 12;
    const vals = [[def.baseHp / N.hp, COL_HP], [def.baseDmg / N.dmg, COL_DMG], [def.speed / N.spd, COL_SPD]];
    vals.forEach((v, k) => {
      const bx = r.x + 10 + k * (bw + 4);
      g.fillStyle = 'rgba(0,0,0,.6)'; g.beginPath(); g.roundRect(bx, by2, bw, 4, 2); g.fill();
      g.fillStyle = v[1]; g.shadowColor = v[1]; g.shadowBlur = hv > 0.3 ? 6 : 0;
      g.beginPath(); g.roundRect(bx, by2, Math.max(3, bw * c01(v[0])), 4, 2); g.fill(); g.shadowBlur = 0;
    });
  }

  /* искры при наведении */
  if(hv > 0.05 && !lowFx()){
    g.save(); g.globalCompositeOperation = 'lighter';
    const hs = typeof dsHash === 'function' ? dsHash : Math.random;
    for(let j = 0; j < 9; j++){
      const ph2 = (now * 0.75 + j / 9 + hs(i * 13 + j) * 0.3) % 1;
      const x = r.x + r.w * (0.08 + 0.84 * hs(j + i * 9)), y = r.y + r.h - ph2 * r.h * 0.95;
      g.globalAlpha = Math.sin(ph2 * Math.PI) * 0.85 * hv; g.fillStyle = j % 3 === 0 ? '#fff' : c2;
      g.beginPath(); g.arc(x, y, 1 + hs(j + 31) * 1.6, 0, TAU); g.fill();
    }
    g.restore();
  }
  g.restore();
}

/* =========================================================
   НИЖНЯЯ ПАНЕЛЬ: характеристики героя под курсором
   ========================================================= */
function statBlock(g, x, y, w, label, text, frac, col){
  g.textAlign = 'left'; g.font = 'bold 9px Consolas, monospace'; g.fillStyle = 'rgba(255,255,255,.5)'; g.fillText(label, x, y);
  g.textAlign = 'right'; g.font = 'bold 13px Segoe UI, Arial'; g.fillStyle = '#fff'; g.fillText(text, x + w, y + 1);
  g.fillStyle = 'rgba(255,255,255,.1)'; g.beginPath(); g.roundRect(x, y + 6, w, 5, 2.5); g.fill();
  g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 6; g.beginPath(); g.roundRect(x, y + 6, Math.max(4, w * c01(frac)), 5, 2.5); g.fill(); g.shadowBlur = 0;
}
function drawInfoPanel(now, t){
  const g = ctx, lastRect = menuCardRect(HERO_DEFS.length - 1), gridBottom = lastRect.y + lastRect.h;
  const ph = 50, py = VH - ph - 12;
  if(py < gridBottom + 8){                                                  /* места мало — только короткая подсказка */
    if(VH - 14 > gridBottom + 8){
      g.save(); g.textAlign = 'center'; g.font = '12px Segoe UI, Arial'; g.fillStyle = 'rgba(255,255,255,.5)';
      g.fillText('ЛКМ по карточке — профиль героя  •  Q W E R F — скиллы в бою  •  ПКМ — движение', VW / 2, VH - 14); g.restore();
    }
    return;
  }
  const W = Math.min(VW - 48, 860), x = VW / 2 - W / 2, a = ease((t - 0.25) / 0.5);
  g.save(); g.globalAlpha = a;
  const def = hoverIdx >= 0 ? HERO_DEFS[hoverIdx] : null, md = def ? ((typeof menuHeroDef === 'function') ? menuHeroDef(def) : def) : null;
  const acc = md ? (md.color2 || GOLD) : GOLD;
  chamfer(g, x, py, W, ph, 12, 4);
  const bg = g.createLinearGradient(0, py, 0, py + ph); bg.addColorStop(0, 'rgba(24,21,28,.94)'); bg.addColorStop(1, 'rgba(8,9,14,.96)');
  g.fillStyle = bg; g.shadowColor = md ? rgba(acc, 0.3) : 'rgba(0,0,0,.5)'; g.shadowBlur = 16; g.fill(); g.shadowBlur = 0;
  g.strokeStyle = md ? rgba(acc, 0.7) : 'rgba(215,179,106,.4)'; g.lineWidth = 1.5; g.stroke();
  g.fillStyle = acc; g.fillRect(x + 1, py + 8, 3, ph - 16);
  if(!def){
    g.textAlign = 'center'; g.font = '13px Segoe UI, Arial'; g.fillStyle = 'rgba(255,255,255,.62)';
    g.fillText('Наведи курсор на бойца — увидишь характеристики и навыки  •  ЛКМ — профиль героя', VW / 2, py + 22);
    g.font = 'bold 10px Consolas, monospace'; g.fillStyle = 'rgba(255,255,255,.4)';
    g.fillText('Q W E R F — навыки в бою  •  ПКМ — движение', VW / 2, py + 38);
    g.restore(); return;
  }
  const small = W < 640;
  g.textAlign = 'left'; g.font = 'bold 19px Georgia, serif'; g.fillStyle = '#fff'; g.shadowColor = rgba(acc, 0.6); g.shadowBlur = 8;
  g.fillText(fit(g, def.name, small ? 150 : 190), x + 18, py + 24); g.shadowBlur = 0;
  g.font = 'bold 10px Segoe UI, Arial'; g.fillStyle = acc; g.fillText(fit(g, String(def.title).toUpperCase(), small ? 150 : 190), x + 18, py + 40);
  const N = norm(), bx0 = x + (small ? 190 : 230), right = x + W - (small ? 14 : 160), n = 4, gp = 16, bw = Math.max(60, (right - bx0 - gp * (n - 1)) / n);
  const blocks = [['ЗДОРОВЬЕ', String(def.baseHp), def.baseHp / N.hp, COL_HP], ['УРОН', String(def.baseDmg), def.baseDmg / N.dmg, COL_DMG],
    ['СКОРОСТЬ', String(def.speed), def.speed / N.spd, COL_SPD], ['ДАЛЬНОСТЬ', String(def.atkRange), def.atkRange / N.rng, COL_RNG]];
  blocks.forEach((b, k) => statBlock(g, bx0 + k * (bw + gp), py + 21, bw, b[0], b[1], b[2], b[3]));
  if(!small){
    g.textAlign = 'right'; g.font = 'bold 11px Segoe UI, Arial'; g.fillStyle = GOLD2;
    g.fillText('ЛКМ — ПРОФИЛЬ  ›', x + W - 16, py + 28);
    g.font = '9px Consolas, monospace'; g.fillStyle = 'rgba(255,255,255,.45)'; g.fillText(isRanged(def) ? 'ДАЛЬНИЙ БОЕЦ' : 'БЛИЖНИЙ БОЕЦ', x + W - 16, py + 42);
  }
  g.restore();
}

/* =========================================================
   ГЛАВНАЯ ОТРИСОВКА
   ========================================================= */
function drawRoster(now, t, dt){
  const g = ctx;
  g.save(); g.textBaseline = 'alphabetic';
  drawHeader(now, t);
  /* сглаживание наведения */
  for(let i = 0; i < HERO_DEFS.length; i++){
    const target = i === hoverIdx ? 1 : 0, cur = HV[i] || 0;
    HV[i] = cur + (target - cur) * Math.min(1, dt * 14);
    if(Math.abs(HV[i] - target) < 0.004) HV[i] = target;
  }
  for(let i = 0; i < HERO_DEFS.length; i++){ if(i !== hoverIdx) drawCard(HERO_DEFS[i], i, menuCardRect(i), HV[i], now, t); }
  if(hoverIdx >= 0) drawCard(HERO_DEFS[hoverIdx], hoverIdx, menuCardRect(hoverIdx), HV[hoverIdx], now, t);   /* наведённая — поверх остальных */
  drawInfoPanel(now, t);
  g.restore();
}

const _prev = drawMenu;
drawMenu = function(){
  const active = typeof menuStage !== 'undefined' && menuStage === 'heroes' && !settingsOpen && !storeOpen && !changelogOpen;
  if(!active){ lastStage = typeof menuStage !== 'undefined' ? menuStage : ''; return _prev.apply(this, arguments); }
  const nowMs = performance.now(), now = nowMs / 1000, dt = Math.min(0.05, Math.max(0, (nowMs - (lastMs || nowMs)) / 1000));
  lastMs = nowMs;
  if(lastStage !== 'heroes'){ enterAt = now; HV.length = 0; tint.a = 0; }
  lastStage = 'heroes';
  const t = now - enterAt;
  hoverIdx = -1;
  for(let i = 0; i < HERO_DEFS.length; i++){
    const r = menuCardRect(i);
    if(mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h) hoverIdx = i;
  }
  if(hoverIdx >= 0){                                                        /* цель подсветки фона */
    const [r, g, b] = rgbOf((HERO_DEFS[hoverIdx].color2 || HERO_DEFS[hoverIdx].color));
    const k = Math.min(1, dt * 7); tint.r += (r - tint.r) * k; tint.g += (g - tint.g) * k; tint.b += (b - tint.b) * k;
  }
  tint.a += ((hoverIdx >= 0 ? 1 : 0) - tint.a) * Math.min(1, dt * 6);
  G.__rosterV2 = true;
  const origBackdrop = drawMenuGenericBackdrop;
  drawMenuGenericBackdrop = function(n){
    origBackdrop.apply(this, arguments);
    try { backdropExtras(n); } catch(err) { warn('backdrop', err); }
  };
  try { _prev.apply(this, arguments); }
  finally { drawMenuGenericBackdrop = origBackdrop; G.__rosterV2 = false; }
  try { drawRoster(now, t, dt); } catch(err) { warn('roster', err); }
};
})();
