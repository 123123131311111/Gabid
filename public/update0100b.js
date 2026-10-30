/* DotaSense 0.10.0 (дополнение) — «КРАСИВЫЙ РОСТЕР БОЙЦОВ».
   Вкладка «Бойцы»: новые карточки героев (портрет в цветной раме, плавное появление, подъём и блик при наведении,
   плашка роли, номер, звёзды мастерства, отметка любимого бойца). Дополнение: у всех героев на портрете видно мастерство (значок уровня, полоска прогресса, «!» при готовой награде). Положение и размеры карточек не менялись —
   клики и профиль героя работают как раньше. Подключается после update0100.js. */
(function(){
'use strict';
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update0100b ' + tag + ':', err); } catch(e) {} } };
let lastStage = '', enterAt = 0;

function masteryLevel(id){
  const p = window.__shadowAccountProfile;
  if(!p || !p.masteryCfg || !p.masteryCfg.heroes.includes(id)) return -1;
  const w = (p.mastery && p.mastery[id] && p.mastery[id].wins) || 0;
  let l = 0; p.masteryCfg.wins.forEach((n, i) => { if(w >= n) l = i + 1; });
  return l;
}
function masteryInfo(id){
  const p = window.__shadowAccountProfile;
  const l = masteryLevel(id);
  if(l < 0) return null;
  const c = p.masteryCfg, w = (p.mastery && p.mastery[id] && p.mastery[id].wins) || 0;
  const claimed = (p.mastery && p.mastery[id] && p.mastery[id].claimed) || 0;
  const max = c.wins.length, prev = l > 0 ? c.wins[l - 1] : 0;
  const frac = l >= max ? 1 : Math.max(0, Math.min(1, (w - prev) / (c.wins[l] - prev)));
  return {lvl: l, max, frac, ready: claimed < l};
}
function fit(text, maxW){
  let t = String(text);
  if(ctx.measureText(t).width <= maxW) return t;
  while(t.length > 3 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}
function ease(v){ v = Math.max(0, Math.min(1, v)); return 1 - Math.pow(1 - v, 3); }

function drawCard(def, i, r, hover, now, t){
  const a = ease((t - i * 0.03) / 0.45);
  if(a <= 0) return;
  const c1 = def.color || '#8899aa', c2 = def.color2 || c1;
  const lift = hover ? 5 : 0;
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(cx, cy + (1 - a) * 18 - lift);
  const sc = hover ? 1.035 : 1; ctx.scale(sc, sc);
  ctx.translate(-cx, -cy);

  /* тень и подложка */
  ctx.shadowColor = hover ? hexRgba(c2, .65) : 'rgba(0,0,0,.5)';
  ctx.shadowBlur = hover ? 26 : 12; ctx.shadowOffsetY = hover ? 6 : 3;
  const bg = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  bg.addColorStop(0, hover ? '#2a2420' : '#1d1b20');
  bg.addColorStop(1, '#0b0c11');
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 14); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  /* цветное свечение героя снизу */
  ctx.save();
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 14); ctx.clip();
  const glow = ctx.createRadialGradient(cx, r.y + r.h, 4, cx, r.y + r.h, r.w * .8);
  glow.addColorStop(0, hexRgba(c2, hover ? .34 : .18)); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(r.x, r.y, r.w, r.h);

  /* портрет */
  const pad = 6, strip = r.h >= 120 ? 46 : 38;
  const px = r.x + pad, py = r.y + pad, pw = r.w - pad * 2, ph = r.h - pad - strip;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.clip();
  ctx.fillStyle = hexRgba(c1, .22); ctx.fillRect(px, py, pw, ph);
  try { drawHeroTexture(def, px, py, pw, ph, now, false); } catch(err) { warn('tex', err); }
  const fade = ctx.createLinearGradient(0, py + ph * .55, 0, py + ph);
  fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(1, 'rgba(8,8,12,.82)');
  ctx.fillStyle = fade; ctx.fillRect(px, py, pw, ph);
  /* блик при наведении */
  if(hover){
    const sx = px + ((now * 0.9) % 1.6 - .3) * pw;
    const sh = ctx.createLinearGradient(sx - 26, 0, sx + 26, 0);
    sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(.5, 'rgba(255,255,255,.22)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sh; ctx.fillRect(px, py, pw, ph);
  }
  ctx.restore();
  /* рамка портрета */
  ctx.lineWidth = 1.5; ctx.strokeStyle = hexRgba(c2, hover ? .95 : .55);
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 10); ctx.stroke();

  /* цветная планка сверху */
  const rib = ctx.createLinearGradient(r.x, 0, r.x + r.w, 0);
  rib.addColorStop(0, 'rgba(0,0,0,0)'); rib.addColorStop(.5, hexRgba(c2, .95)); rib.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rib; ctx.fillRect(r.x, r.y, r.w, 3);
  ctx.restore();

  /* внешняя рамка */
  const bd = ctx.createLinearGradient(r.x, r.y, r.x, r.y + r.h);
  bd.addColorStop(0, hover ? '#f2d58f' : 'rgba(215,179,106,.6)'); bd.addColorStop(1, hexRgba(c2, hover ? .9 : .45));
  ctx.strokeStyle = bd; ctx.lineWidth = hover ? 2.5 : 1.5;
  ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 14); ctx.stroke();

  /* плашки на портрете */
  const small = r.w < 160;
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold ' + (small ? 9 : 10) + 'px Consolas, monospace';
  ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.fillText('№' + String(i + 1).padStart(2, '0'), px + pw - 6, py + 14);
  ctx.textAlign = 'left';
  const ranged = (def.atkRange || 0) > 300;
  const tag = ranged ? 'ДАЛЬНИЙ' : 'БЛИЖНИЙ';
  const tw = ctx.measureText(tag).width + 12;
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.beginPath(); ctx.roundRect(px + 5, py + 5, tw, 15, 7); ctx.fill();
  ctx.fillStyle = ranged ? '#8be9fd' : '#ffb27a';
  ctx.fillText(tag, px + 11, py + 16);
  if(typeof favoriteHeroId !== 'undefined' && favoriteHeroId === def.id){
    ctx.font = 'bold 15px Segoe UI, Arial'; ctx.fillStyle = '#ff6a7a'; ctx.textAlign = 'right';
    ctx.fillText('★', px + pw - 6, py + 31);
  }

  /* мастерство на портрете: значок уровня, полоска прогресса, «!» при готовой награде */
  const mi = masteryInfo(def.id);
  if(mi){
    const bh = small ? 16 : 18, bw2 = small ? 40 : 46, bx = px + 5, by = py + 25;
    ctx.shadowColor = mi.lvl >= mi.max ? 'rgba(255,213,104,.9)' : 'transparent'; ctx.shadowBlur = mi.lvl >= mi.max ? 10 : 0;
    const gb = ctx.createLinearGradient(0, by, 0, by + bh);
    gb.addColorStop(0, mi.lvl > 0 ? '#ffe39a' : '#4a4740'); gb.addColorStop(1, mi.lvl > 0 ? '#c58a2a' : '#2a2824');
    ctx.fillStyle = gb; ctx.beginPath(); ctx.roundRect(bx, by, bw2, bh, 9); ctx.fill(); ctx.shadowBlur = 0;
    ctx.lineWidth = 1; ctx.strokeStyle = mi.lvl > 0 ? 'rgba(58,40,8,.9)' : 'rgba(255,255,255,.25)'; ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = 'bold ' + (small ? 10 : 11) + 'px Segoe UI, Arial';
    ctx.fillStyle = mi.lvl > 0 ? '#2b1c05' : 'rgba(255,255,255,.65)';
    ctx.fillText('★ ' + mi.lvl + '/' + mi.max, bx + bw2 / 2, by + bh - 5);
    if(mi.ready){
      const pr = 1 + Math.sin(now * 5) * 0.12;
      ctx.save(); ctx.translate(bx + bw2 + 9, by + bh / 2); ctx.scale(pr, pr);
      ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fillStyle = '#ff4d5e'; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillText('!', 0, 4);
      ctx.restore();
    }
    /* полоска до следующего уровня внизу портрета */
    const barX = px + 8, barW = pw - 16, barY = py + ph - 7;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.beginPath(); ctx.roundRect(barX, barY, barW, 4, 2); ctx.fill();
    if(mi.frac > 0){
      ctx.fillStyle = mi.lvl >= mi.max ? '#ffd568' : hexRgba(c2, 1);
      ctx.beginPath(); ctx.roundRect(barX, barY, Math.max(4, barW * mi.frac), 4, 2); ctx.fill();
    }
  }

  /* имя и титул */
  const mx = r.x + r.w / 2, sy = r.y + r.h - strip;
  ctx.textAlign = 'center';
  ctx.font = 'bold ' + (small ? 14 : 17) + 'px Georgia, serif';
  ctx.shadowColor = hexRgba(c2, .7); ctx.shadowBlur = hover ? 10 : 4;
  ctx.fillStyle = hover ? '#fff3cf' : '#fff';
  ctx.fillText(fit(def.name, r.w - 16), mx, sy + 17);
  ctx.shadowBlur = 0;
  ctx.font = (small ? 9 : 11) + 'px Segoe UI, Arial'; ctx.fillStyle = hexRgba(c2, .95);
  const ml = masteryLevel(def.id);
  const titleMax = ml >= 0 ? r.w - 74 : r.w - 16;
  ctx.textAlign = ml >= 0 ? 'left' : 'center';
  ctx.fillText(fit(String(def.title).toUpperCase(), titleMax), ml >= 0 ? r.x + 10 : mx, sy + 33);

  /* звёзды мастерства */
  if(ml >= 0){
    ctx.textAlign = 'right'; ctx.font = (small ? 9 : 11) + 'px Segoe UI, Arial';
    for(let s = 4; s >= 0; s--){
      ctx.fillStyle = s < ml ? '#ffd568' : 'rgba(255,255,255,.2)';
      ctx.fillText('★', r.x + r.w - 10 - (4 - s) * (small ? 9 : 11), sy + 33);
    }
  }
  /* подсказка при наведении */
  if(hover && r.h >= 120){
    ctx.textAlign = 'center'; ctx.font = 'bold 10px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,255,255,.9)';
    ctx.fillText('ОТКРЫТЬ ПРОФИЛЬ  ›', px + pw / 2, py + ph - 15);
  }
  ctx.restore();
}

const _drawMenu = drawMenu;
drawMenu = function(){
  const active = typeof menuStage !== 'undefined' && menuStage === 'heroes' && !settingsOpen && !storeOpen && !changelogOpen;
  if(!active){ lastStage = typeof menuStage !== 'undefined' ? menuStage : ''; return _drawMenu.apply(this, arguments); }
  /* штатный рисунок карточек уводим за экран, рисуем свои на тех же местах */
  const realRect = menuCardRect;
  menuCardRect = function(i){ const r = realRect(i); return {x: -5000, y: r.y, w: r.w, h: r.h}; };
  try { _drawMenu.apply(this, arguments); } finally { menuCardRect = realRect; }
  try {
    const now = performance.now() / 1000;
    if(lastStage !== 'heroes') enterAt = now;
    lastStage = 'heroes';
    const t = now - enterAt;
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    const p = window.__shadowAccountProfile;
    const withM = p && p.masteryCfg ? p.masteryCfg.heroes.length : 0;
    ctx.textAlign = 'right'; ctx.font = 'bold 12px Consolas, monospace'; ctx.fillStyle = '#d7b36a';
    ctx.fillText('БОЙЦОВ: ' + HERO_DEFS.length + (withM ? '   ·   МАСТЕРСТВО НА КАЖДОМ' : ''), VW - 24, 128);
    let hoverIdx = -1;
    for(let i = 0; i < HERO_DEFS.length; i++){
      const r = realRect(i);
      if(mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h) hoverIdx = i;
    }
    for(let i = 0; i < HERO_DEFS.length; i++){ if(i !== hoverIdx) drawCard(HERO_DEFS[i], i, realRect(i), false, now, t); }
    if(hoverIdx >= 0) drawCard(HERO_DEFS[hoverIdx], hoverIdx, realRect(hoverIdx), true, now, t);   /* наведённая — поверх остальных */
    ctx.restore();
  } catch(err) { warn('cards', err); }
};
})();
