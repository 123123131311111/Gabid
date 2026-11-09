/* DotaSense 0.10.7.5 — КРАСОТА КАРТЫ И УСИЛЕНИЕ ПРОКА.
   • Прок усилен на 35%: здоровье, рост здоровья за уровень, урон атаки, рост урона и сила способностей (×1.35).
   • Карта стала живее: на полях — пучки травы, цветы, камешки и мягкие пятна света/тени (на землях Света — зелень и полевые цветы,
     на землях Тьмы — тёмная трава и багровые цветы); над картой парят светлячки (у Тьмы — тлеющие угольки),
     на реке мерцают блики. На слабой графике (perf-low) эффекты упрощаются.
   Геймплей карты, проходимость и коллизии не менялись. Подключается после update01074.js. */
(function(){
'use strict';
const warn = (t, e) => { if(!warn[t]){ warn[t] = 1; try { console.warn('update01075 ' + t + ':', e); } catch(_) {} } };

/* ======================================================================
   1. ПРОК +35%
   ====================================================================== */
try {
  const PROK_BUFF = 1.35;
  const d = (typeof HERO_DEFS !== 'undefined') ? HERO_DEFS.find(x => x.id === 'prok') : null;
  if(d && !d.boost01075){
    d.boost01075 = true;
    for(const k of ['baseHp', 'hpPerLvl', 'baseDmg', 'dmgPerLvl', 'abilityDamageScale']){
      if(typeof d[k] === 'number') d[k] *= PROK_BUFF;
    }
    HERO_STAT_BALANCE.prok = [d.baseHp, d.hpPerLvl, d.baseDmg, d.dmgPerLvl, d.abilityDamageScale];
  }
} catch(err){ warn('prok', err); }

/* ======================================================================
   2. КАРТА
   ====================================================================== */
if(typeof WORLD === 'undefined' || typeof drawTerrain !== 'function' || typeof drawWorldObjects !== 'function') return;

const TAU = Math.PI * 2, SQ = Math.SQRT1_2;
const lite = () => { try { return typeof perfLite === 'function' && perfLite(); } catch(_) { return false; } };

/* детерминированный хэш → [0,1): декор всегда одинаков и не дрожит при перерисовке кэша рельефа */
function hash(ix, iy, s){
  let h = (Math.imul(ix | 0, 374761393) + Math.imul(iy | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/* расстояние от точки до дорог (по текущим, уже масштабированным LANES) */
function laneDist(x, y){
  let best = 1e9;
  if(typeof LANES === 'undefined') return best;
  for(const lane of LANES){
    for(let i = 0; i < lane.length - 1; i++){
      const a = lane[i], b = lane[i + 1], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
      let t = ((x - a.x) * dx + (y - a.y) * dy) / l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const d = Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t));
      if(d < best) best = d;
    }
  }
  return best;
}
const riverDist = (x, y) => Math.abs(x - y) * SQ;             /* река идёт по диагонали карты */
const isDark = (x, y) => x > y;                                /* земли Тьмы — верхний правый треугольник */

/* центры плато из 0.10.7.4 (пересчитываем те же координаты, чтобы не рисовать на камне) */
const PLATEAU_POS = [[420, -620], [420, 620], [-420, -620], [-420, 620]].map(([r, s]) => ({x: WORLD / 2 + (-r + s) * SQ, y: WORLD / 2 + (r + s) * SQ}));
function blocked(x, y){
  if(riverDist(x, y) < 285) return true;
  if(typeof BASES !== 'undefined') for(const b of BASES){ if(Math.hypot(x - b.x, y - b.y) < 520) return true; }
  for(const p of PLATEAU_POS){ if(Math.hypot(x - p.x, (y - p.y) / 0.84) < 300) return true; }
  return laneDist(x, y) < 112;
}

/* ---------- статический декор: рисуется в кэш-слой рельефа ---------- */
const GRASS_L = ['#5fae52', '#7cc85f', '#4a9446', '#8fd070'], GRASS_D = ['#3c3a3f', '#5a2f35', '#2d2a30', '#6c3a3c'];
const FLOW_L = ['#ffffff', '#ffe27a', '#9ad2ff', '#ffb0d0'], FLOW_D = ['#ff5a4a', '#c85aff', '#ff9a5a', '#e8344a'];

function drawGroundDecor(){
  const lt = lite(), CELL = lt ? 190 : 120;
  const x0 = Math.max(0, cam.x - VW / 2 - TERRAIN_MARGIN - CELL), x1 = Math.min(WORLD, cam.x + VW / 2 + TERRAIN_MARGIN + CELL);
  const y0 = Math.max(0, cam.y - VH / 2 - TERRAIN_MARGIN - CELL), y1 = Math.min(WORLD, cam.y + VH / 2 + TERRAIN_MARGIN + CELL);

  /* 1) большие мягкие пятна света и тени — убирают «плоскую» заливку полей */
  const BIG = 460;
  ctx.save();
  for(let gx = Math.floor(x0 / BIG); gx <= Math.floor(x1 / BIG); gx++){
    for(let gy = Math.floor(y0 / BIG); gy <= Math.floor(y1 / BIG); gy++){
      const r = hash(gx, gy, 7); if(r > 0.62) continue;
      const x = (gx + hash(gx, gy, 8)) * BIG, y = (gy + hash(gx, gy, 9)) * BIG;
      if(riverDist(x, y) < 230) continue;
      const rad = 170 + hash(gx, gy, 10) * 190, light = hash(gx, gy, 11) > 0.45, dk = isDark(x, y);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const c = light ? (dk ? '120,70,80' : '190,235,150') : (dk ? '8,4,10' : '10,40,22');
      const a = light ? 0.085 : 0.12;
      g.addColorStop(0, 'rgba(' + c + ',' + a + ')'); g.addColorStop(1, 'rgba(' + c + ',0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();

  /* 2) пучки травы, цветы, камешки */
  ctx.save();
  ctx.lineCap = 'round';
  for(let gx = Math.floor(x0 / CELL); gx <= Math.floor(x1 / CELL); gx++){
    for(let gy = Math.floor(y0 / CELL); gy <= Math.floor(y1 / CELL); gy++){
      const r = hash(gx, gy, 1); if(r > 0.7) continue;
      const x = (gx + hash(gx, gy, 2)) * CELL, y = (gy + hash(gx, gy, 3)) * CELL;
      if(x < 0 || y < 0 || x > WORLD || y > WORLD || blocked(x, y)) continue;
      const dk = isDark(x, y), kind = hash(gx, gy, 4);
      if(kind < 0.55){
        /* пучок травы */
        const pal = dk ? GRASS_D : GRASS_L, n = 4 + ((hash(gx, gy, 5) * 3) | 0);
        for(let i = 0; i < n; i++){
          const a = -Math.PI / 2 + (i - n / 2) * 0.32 + (hash(gx, gy, 20 + i) - 0.5) * 0.3, len = 11 + hash(gx, gy, 30 + i) * 13;
          ctx.strokeStyle = pal[(i + gx + gy) & 3]; ctx.globalAlpha = 0.55; ctx.lineWidth = 2.2;
          ctx.beginPath(); ctx.moveTo(x + (i - n / 2) * 2.4, y);
          ctx.quadraticCurveTo(x + (i - n / 2) * 2.4 + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5, x + (i - n / 2) * 2.4 + Math.cos(a) * len * 0.8 + 3, y + Math.sin(a) * len);
          ctx.stroke();
        }
      } else if(kind < 0.82){
        /* цветочки на тонких стебельках */
        const pal = dk ? FLOW_D : FLOW_L, n = 3 + ((hash(gx, gy, 6) * 3) | 0);
        for(let i = 0; i < n; i++){
          const fx = x + (hash(gx, gy, 40 + i) - 0.5) * 34, fy = y + (hash(gx, gy, 50 + i) - 0.5) * 22;
          ctx.globalAlpha = 0.5; ctx.strokeStyle = dk ? '#3a2a32' : '#3d7d3c'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(fx, fy + 7); ctx.lineTo(fx, fy); ctx.stroke();
          ctx.globalAlpha = 0.92; ctx.fillStyle = pal[(i + gx) & 3];
          ctx.beginPath(); ctx.arc(fx, fy - 1, 2.8, 0, TAU); ctx.fill();
          ctx.fillStyle = dk ? '#2a0f16' : '#ffd24a'; ctx.beginPath(); ctx.arc(fx, fy - 1, 1.1, 0, TAU); ctx.fill();
        }
      } else {
        /* камешки с тенью */
        const n = 2 + ((hash(gx, gy, 7) * 3) | 0);
        for(let i = 0; i < n; i++){
          const px = x + (hash(gx, gy, 60 + i) - 0.5) * 36, py = y + (hash(gx, gy, 70 + i) - 0.5) * 20, rr = 3 + hash(gx, gy, 80 + i) * 4;
          ctx.globalAlpha = 0.28; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(px + 1.5, py + 2, rr, rr * 0.55, 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = 0.9; ctx.fillStyle = dk ? '#4c4046' : '#8b8d84'; ctx.beginPath(); ctx.ellipse(px, py, rr, rr * 0.7, 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = 0.5; ctx.fillStyle = dk ? '#7a6a70' : '#c5c8bb'; ctx.beginPath(); ctx.ellipse(px - rr * 0.25, py - rr * 0.25, rr * 0.45, rr * 0.28, 0, 0, TAU); ctx.fill();
        }
      }
    }
  }
  ctx.restore();
}

{
  const orig = drawTerrain;
  window.drawTerrain = function(){
    const r = orig.apply(this, arguments);
    try { drawGroundDecor(); } catch(err){ warn('decor', err); }
    return r;
  };
}

/* ---------- анимированный слой: светлячки и блики на реке ---------- */
function drawMapFx(){
  const t = (typeof gameTime === 'number' && isFinite(gameTime)) ? gameTime : performance.now() / 1000;
  const lt = lite();
  const x0 = cam.x - VW / 2 - 40, x1 = cam.x + VW / 2 + 40, y0 = cam.y - VH / 2 - 40, y1 = cam.y + VH / 2 + 40;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  /* светлячки (Свет) и угольки (Тьма) — привязаны к клеткам мира, поэтому не «прыгают» при движении камеры */
  if(!lt){
    const CELL = 260;
    for(let gx = Math.floor(x0 / CELL); gx <= Math.floor(x1 / CELL); gx++){
      for(let gy = Math.floor(y0 / CELL); gy <= Math.floor(y1 / CELL); gy++){
        if(hash(gx, gy, 90) > 0.5) continue;
        const ph = hash(gx, gy, 91) * TAU, sp = 0.35 + hash(gx, gy, 92) * 0.5;
        const bx = (gx + hash(gx, gy, 93)) * CELL, by = (gy + hash(gx, gy, 94)) * CELL;
        const x = bx + Math.sin(t * sp + ph) * 38 + Math.sin(t * sp * 2.3 + ph) * 9;
        const y = by + Math.cos(t * sp * 0.8 + ph) * 26 - 12 - Math.sin(t * 0.6 + ph) * 8;
        if(x < 0 || y < 0 || x > WORLD || y > WORLD || riverDist(x, y) < 230) continue;
        const dk = isDark(x, y), tw = 0.5 + 0.5 * Math.sin(t * (1.6 + sp) + ph);
        const col = dk ? '255,120,60,' : '210,255,150,';
        const g = ctx.createRadialGradient(x, y, 0, x, y, 15);
        g.addColorStop(0, 'rgba(' + col + (0.55 * tw + 0.1) + ')'); g.addColorStop(1, 'rgba(' + col + '0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 15, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,235,' + (0.5 + 0.4 * tw) + ')'; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill();
      }
    }
  }

  /* блики на реке: маленькие мерцающие «звёздочки» вдоль диагонали */
  const STEP = lt ? 150 : 80;
  const u0 = Math.max(0, Math.floor(((x0 + y0) * SQ) / STEP) - 1), u1 = Math.floor(((x1 + y1) * SQ) / STEP) + 1;
  for(let k = u0; k <= u1; k++){
    for(let j = 0; j < 2; j++){
      if(hash(k, j, 100) > 0.6) continue;
      const along = (k + hash(k, j, 101)) * STEP, off = (hash(k, j, 102) - 0.5) * 300;
      const x = along * SQ + off * SQ, y = along * SQ - off * SQ;        /* вдоль диагонали + поперёк */
      if(x < x0 || x > x1 || y < y0 || y > y1) continue;
      const tw = Math.max(0, Math.sin(t * (1.2 + hash(k, j, 103)) + hash(k, j, 104) * TAU));
      if(tw < 0.08) continue;
      const s = 3 + tw * 5;
      ctx.strokeStyle = 'rgba(220,250,255,' + (0.75 * tw) + ')'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s * 0.7); ctx.lineTo(x, y + s * 0.7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.8 * tw) + ')'; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}

{
  const orig = drawWorldObjects;
  window.drawWorldObjects = function(){
    try { drawMapFx(); } catch(err){ warn('fx', err); }
    return orig.apply(this, arguments);
  };
}
})();
