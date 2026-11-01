/* DotaSense 0.10.3.9 — АНИМИРОВАННЫЕ АВАТАРКИ МАСТЕРСТВА И НОВЫЙ ПРОФИЛЬ.
   • На 10 уровне мастерства героя открывается его уникальная анимированная аватарка (id «m10_<герой>»). Это портрет героя
     с живым эффектом (один из 15: искры, молнии, снег, руны, глитч, звёзды, дым…) и анимированной рамкой (одна из 5:
     уголки, крылья, корона, шипы, нимб) в цвете героя; у всех — золотая рамка с бликом и медаль «10».
     Сочетание «эффект + рамка + палитра + портрет» у каждого из 30 героев своё. Сервер (accounts.js) выдаёт аватарку
     только при 55+ победах на этом герое.
   • Профиль: шапка с большой аватаркой, кольцом уровня и полосой опыта; плитки статистики; вкладки «Обзор», «Аватарки»,
     «Мастерство» (все герои и их уровни) и «Настройки». Старые элементы окна (карьера, выбор аватарки, смена ника) остаются
     и просто разложены по вкладкам. Подключается после update01035.js. */
(function(){
'use strict';
const warn = (t, e) => { if(!warn[t]){ warn[t] = 1; try { console.warn('update01039 ' + t + ':', e); } catch(_) {} } };

const PREFIX = 'm10_';
const ORDER = ['pyro','warlord','grisha','golly','sasych','ilya','malit','arcady','illusionist','shadow','electricGosha','mo3gi','tribupainer','mageHunter','regina','yosyp','dawnMaiden','exileKnight','juvsyut','chip','savely','juggernaut','earthshaker','sniper','vaspassir','virsudi','olex','psih','marin','vyselki'];
const isMasteryAvatar = id => typeof id === 'string' && id.startsWith(PREFIX);
const heroOf = id => id.slice(PREFIX.length);

/* обычная аватарка (портрет) есть у каждого героя */
try { for(const id of ORDER){ if(!AVATAR_DEFS.some(d => d.id === id)) AVATAR_DEFS.push({id}); } } catch(err) { warn('defs', err); }

/* ---------- профиль / мастерство: чтение данных ---------- */
const prof = () => window.__shadowAccountProfile || null;
function masteryCfg(){ const p = prof(); return p && p.masteryCfg && Array.isArray(p.masteryCfg.wins) ? p.masteryCfg : null; }
function heroWins(id){ const p = prof(); return (p && p.mastery && p.mastery[id] && p.mastery[id].wins) || 0; }
function heroLevel(id){ const c = masteryCfg(); if(!c) return 0; const w = heroWins(id); let l = 0; c.wins.forEach((n, i) => { if(w >= n) l = i + 1; }); return l; }
const maxLevel = () => { const c = masteryCfg(); return c ? c.wins.length : 10; };
const unlocked = id => { const c = masteryCfg(); return !!c && heroWins(id) >= c.wins[c.wins.length - 1]; };
function heroDef(id){
  const d = typeof HERO_DEFS !== 'undefined' ? HERO_DEFS.find(x => x.id === id) : null;
  return d || {id, name:id, title:'', color:'#6a7a8c', color2:'#d7b36a'};
}

/* ======================================================================
   1. РИСОВАНИЕ АНИМИРОВАННОЙ АВАТАРКИ
   ====================================================================== */
function alpha(hex, a){
  let h = String(hex || '#d7b36a').replace('#', '');
  if(h.length === 3) h = h.split('').map(x => x + x).join('');
  const n = parseInt(h, 16);
  if(!Number.isFinite(n) || h.length !== 6) return 'rgba(215,179,106,' + a + ')';
  return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
}
const rnd = (i, s) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const TAU = Math.PI * 2;
function star4(c, x, y, r){
  c.beginPath();
  for(let k = 0; k < 8; k++){ const rr = k % 2 ? r * 0.28 : r, an = -Math.PI / 2 + k * Math.PI / 4; c.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
  c.closePath(); c.fill();
}

/* 15 основных эффектов */
const FX = [
  /* 0 искры, поднимающиеся вверх */
  (c, S, t, a, b) => { for(let i = 0; i < 18; i++){ const ph = (t * 0.28 + rnd(i, 1)) % 1, x = rnd(i, 2) * S + Math.sin(t * 2 + i) * 4, y = S * (1.06 - ph * 1.12);
    c.globalAlpha = (1 - ph) * 0.95; c.fillStyle = b; c.shadowColor = b; c.shadowBlur = 6; c.beginPath(); c.arc(x, y, 1 + rnd(i, 3) * 2.2, 0, TAU); c.fill(); } },
  /* 1 три орбиты-шара */
  (c, S, t, a, b) => { for(let i = 0; i < 3; i++){ for(let k = 0; k < 6; k++){ const an = t * 1.9 + i * 2.094 - k * 0.12, x = S / 2 + Math.cos(an) * S * 0.4, y = S * 0.5 + Math.sin(an) * S * 0.17 * (i % 2 ? 1 : -1) + (i - 1) * S * 0.1;
    c.globalAlpha = (1 - k / 6) * 0.9; c.fillStyle = b; c.shadowColor = b; c.shadowBlur = 8; c.beginPath(); c.arc(x, y, 3.4 - k * 0.4, 0, TAU); c.fill(); } } },
  /* 2 молнии */
  (c, S, t, a, b) => { const ph = (t * 0.85) % 1, seed = Math.floor(t * 0.85); if(ph < 0.2){ c.globalAlpha = 1 - ph / 0.2; c.strokeStyle = '#fff'; c.shadowColor = b; c.shadowBlur = 12; c.lineWidth = 2;
    for(let b2 = 0; b2 < 2; b2++){ c.beginPath(); let x = rnd(seed + b2, 5) * S, y = 0; c.moveTo(x, y); for(let k = 1; k <= 6; k++){ x += (rnd(seed * 7 + b2 * 3 + k, 6) - 0.5) * S * 0.34; y = k * S / 6; c.lineTo(x, y); } c.stroke(); }
    c.globalAlpha = (1 - ph / 0.2) * 0.25; c.fillStyle = b; c.fillRect(0, 0, S, S); } },
  /* 3 снег */
  (c, S, t, a, b) => { c.fillStyle = '#fff'; for(let i = 0; i < 20; i++){ const ph = (t * 0.2 + rnd(i, 1)) % 1; c.globalAlpha = 0.85; c.beginPath(); c.arc(rnd(i, 2) * S + Math.sin(t * 1.4 + i) * 5, ph * S * 1.1 - 4, 0.9 + rnd(i, 3) * 1.8, 0, TAU); c.fill(); } },
  /* 4 вращающееся кольцо рун */
  (c, S, t, a, b) => { c.strokeStyle = b; c.shadowColor = b; c.shadowBlur = 6; for(let r = 0; r < 2; r++){ const R = S * (0.43 - r * 0.07); c.globalAlpha = 0.65 - r * 0.2; c.lineWidth = 1.4;
    for(let i = 0; i < 12; i++){ const an = (r ? -t : t) * 0.55 + i * TAU / 12, l = i % 3 === 0 ? S * 0.05 : S * 0.025; c.beginPath(); c.moveTo(S / 2 + Math.cos(an) * R, S / 2 + Math.sin(an) * R); c.lineTo(S / 2 + Math.cos(an) * (R - l), S / 2 + Math.sin(an) * (R - l)); c.stroke(); } } },
  /* 5 расходящиеся кольца */
  (c, S, t, a, b) => { c.strokeStyle = b; c.shadowColor = b; c.shadowBlur = 8; for(let i = 0; i < 3; i++){ const p = (t * 0.45 + i / 3) % 1; c.globalAlpha = (1 - p) * 0.8; c.lineWidth = 2.5 * (1 - p) + 0.5; c.beginPath(); c.arc(S / 2, S * 0.56, p * S * 0.72, 0, TAU); c.stroke(); } },
  /* 6 лепестки */
  (c, S, t, a, b) => { c.fillStyle = b; for(let i = 0; i < 12; i++){ const ph = (t * 0.17 + rnd(i, 1)) % 1, x = (rnd(i, 2) * S * 1.3 + ph * S * 0.5) % (S * 1.1), y = ph * S * 1.15 - 6;
    c.save(); c.translate(x, y); c.rotate(t * 1.2 + i); c.globalAlpha = 0.75 * (1 - Math.abs(ph - 0.5) * 1.2); c.beginPath(); c.ellipse(0, 0, 4, 2, 0, 0, TAU); c.fill(); c.restore(); } },
  /* 7 воронка пустоты */
  (c, S, t, a, b) => { c.lineWidth = 3; c.lineCap = 'round'; for(let i = 0; i < 3; i++){ c.strokeStyle = i === 1 ? alpha(b, 0.8) : 'rgba(30,10,50,.75)'; c.globalAlpha = 0.9; c.beginPath(); c.arc(S / 2, S / 2, S * (0.18 + i * 0.1), t * (1.1 - i * 0.3) + i * 2, t * (1.1 - i * 0.3) + i * 2 + 2.2); c.stroke(); } },
  /* 8 глитч */
  (c, S, t, a, b, img) => { const ph = (t * 0.7) % 1;
    if(ph < 0.14 && img){ for(let k = 0; k < 4; k++){ const y = rnd(Math.floor(t * 12) + k, 7) * S * 0.85, h = 4 + rnd(k, 8) * 12, dx = (rnd(Math.floor(t * 12) + k, 9) - 0.5) * 18;
      c.globalAlpha = 0.65; c.globalCompositeOperation = 'lighter'; c.drawImage(img, 0, y * img.height / S, img.width, h * img.height / S, dx, y, S, h); c.globalCompositeOperation = 'source-over'; } }
    c.globalAlpha = 0.09; c.fillStyle = '#000'; for(let y = 0; y < S; y += 4) c.fillRect(0, y, S, 1.5); },
  /* 9 кристальные осколки */
  (c, S, t, a, b) => { c.fillStyle = alpha(b, 0.55); c.strokeStyle = '#fff'; c.lineWidth = 0.8; for(let i = 0; i < 5; i++){ const an = t * 0.8 + i * TAU / 5, x = S / 2 + Math.cos(an) * S * 0.4, y = S / 2 + Math.sin(an) * S * 0.36;
    c.save(); c.translate(x, y); c.rotate(an * 2); c.globalAlpha = 0.85; c.beginPath(); c.moveTo(0, -7); c.lineTo(4, 5); c.lineTo(-4, 5); c.closePath(); c.fill(); c.stroke(); c.restore(); } },
  /* 10 пузыри */
  (c, S, t, a, b) => { c.strokeStyle = '#fff'; c.lineWidth = 1; for(let i = 0; i < 12; i++){ const ph = (t * 0.22 + rnd(i, 1)) % 1; c.globalAlpha = (1 - ph) * 0.8; c.beginPath(); c.arc(rnd(i, 2) * S + Math.sin(t * 2 + i) * 4, S * (1.05 - ph * 1.1), 2 + rnd(i, 3) * 5, 0, TAU); c.stroke(); } },
  /* 11 светлячки */
  (c, S, t, a, b) => { c.fillStyle = b; c.shadowColor = b; c.shadowBlur = 8; for(let i = 0; i < 10; i++){ const x = S * (0.5 + Math.sin(t * (0.5 + rnd(i, 1) * 0.6) + i) * 0.42), y = S * (0.5 + Math.cos(t * (0.4 + rnd(i, 2) * 0.6) + i * 2) * 0.42);
    c.globalAlpha = 0.25 + 0.75 * Math.max(0, Math.sin(t * 3 + i * 1.7)); c.beginPath(); c.arc(x, y, 2, 0, TAU); c.fill(); } },
  /* 12 мерцающие звёзды */
  (c, S, t, a, b) => { c.fillStyle = '#fff'; c.shadowColor = b; c.shadowBlur = 8; for(let i = 0; i < 8; i++){ const k = Math.max(0, Math.sin(t * 2.2 + i * 1.9)); c.globalAlpha = k; star4(c, rnd(i, 1) * S * 0.9 + S * 0.05, rnd(i, 2) * S * 0.9 + S * 0.05, 3 + k * 5); } },
  /* 13 дым */
  (c, S, t, a, b) => { for(let i = 0; i < 6; i++){ const ph = (t * 0.14 + i / 6) % 1, x = S * (0.15 + rnd(i, 1) * 0.7) + Math.sin(t + i) * 6, y = S * (1.1 - ph * 1.0), r = S * (0.12 + ph * 0.12);
    const g = c.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, alpha(b, 0.3)); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = (1 - ph) * 0.9; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); } },
  /* 14 вращающиеся лучи */
  (c, S, t, a, b) => { c.fillStyle = alpha(b, 0.16); for(let i = 0; i < 8; i++){ const an = t * 0.35 + i * TAU / 8; c.beginPath(); c.moveTo(S / 2, S / 2); c.arc(S / 2, S / 2, S * 0.75, an, an + 0.18); c.closePath(); c.fill(); } }
];

/* 5 анимированных рамок */
const FRAMES = [
  /* 0 уголки-скобки */
  (c, S, t, a, b) => { c.strokeStyle = b; c.lineWidth = 3; c.shadowColor = b; c.shadowBlur = 8; const l = S * (0.2 + Math.sin(t * 2.5) * 0.02), m = 4;
    for(const [x, y, dx, dy] of [[m, m, 1, 1], [S - m, m, -1, 1], [m, S - m, 1, -1], [S - m, S - m, -1, -1]]){ c.beginPath(); c.moveTo(x, y + dy * l); c.lineTo(x, y); c.lineTo(x + dx * l, y); c.stroke(); } },
  /* 1 крылья по бокам */
  (c, S, t, a, b) => { const f = 1 + Math.sin(t * 3) * 0.18; c.fillStyle = alpha(b, 0.6); c.strokeStyle = '#fff'; c.lineWidth = 0.8;
    for(const sd of [-1, 1]){ const x0 = sd < 0 ? 0 : S; c.beginPath(); c.moveTo(x0, S * 0.5); c.quadraticCurveTo(x0 - sd * S * 0.2 * f, S * 0.3, x0 - sd * S * 0.16 * f, S * 0.12);
      c.quadraticCurveTo(x0 - sd * S * 0.05, S * 0.3, x0, S * 0.36); c.moveTo(x0, S * 0.5); c.quadraticCurveTo(x0 - sd * S * 0.22 * f, S * 0.56, x0 - sd * S * 0.2 * f, S * 0.78); c.quadraticCurveTo(x0 - sd * S * 0.06, S * 0.66, x0, S * 0.62); c.fill(); c.stroke(); } },
  /* 2 корона */
  (c, S, t, a, b) => { const w = S * 0.4, x = S / 2 - w / 2, y = 2 + Math.sin(t * 2) * 1.5, h = S * 0.17; c.fillStyle = '#f3c24d'; c.strokeStyle = '#5a3c08'; c.lineWidth = 1.3; c.shadowColor = '#ffd568'; c.shadowBlur = 8;
    c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + h * 0.25); c.lineTo(x + w * 0.25, y + h * 0.6); c.lineTo(x + w * 0.5, y); c.lineTo(x + w * 0.75, y + h * 0.6); c.lineTo(x + w, y + h * 0.25); c.lineTo(x + w, y + h); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = b; c.beginPath(); c.arc(S / 2, y + h * 0.7, 2.6, 0, TAU); c.fill(); const k = Math.max(0, Math.sin(t * 4)); c.fillStyle = '#fff'; c.globalAlpha = k; star4(c, x + w * 0.5, y + 2, 4 + k * 3); },
  /* 3 шипы по верхнему и нижнему краю */
  (c, S, t, a, b) => { c.fillStyle = alpha(b, 0.75); const n = 8; for(let i = 0; i < n; i++){ const k = 0.6 + 0.4 * Math.sin(t * 3 + i), x = (i + 0.5) * S / n, h = S * 0.09 * k;
    c.beginPath(); c.moveTo(x - S / n * 0.3, 0); c.lineTo(x, h); c.lineTo(x + S / n * 0.3, 0); c.fill(); c.beginPath(); c.moveTo(x - S / n * 0.3, S); c.lineTo(x, S - h); c.lineTo(x + S / n * 0.3, S); c.fill(); } },
  /* 4 нимб */
  (c, S, t, a, b) => { c.strokeStyle = '#ffe9a6'; c.lineWidth = 3; c.shadowColor = '#ffd568'; c.shadowBlur = 12; c.globalAlpha = 0.8 + Math.sin(t * 3) * 0.2; const y = S * 0.1 + Math.sin(t * 2) * 1.5;
    c.beginPath(); c.ellipse(S / 2, y, S * 0.27, S * 0.07, 0, 0, TAU); c.stroke(); c.fillStyle = '#fff'; c.globalAlpha = 1;
    for(let i = 0; i < 2; i++){ const an = t * 2 + i * Math.PI; c.beginPath(); c.arc(S / 2 + Math.cos(an) * S * 0.27, y + Math.sin(an) * S * 0.07, 2, 0, TAU); c.fill(); } }
];

function drawAnim(c, S, t, hid, locked){
  const def = heroDef(hid), a = def.color || '#6a7a8c', b = def.color2 || '#d7b36a';
  const idx = Math.max(0, ORDER.indexOf(hid)), prim = idx % FX.length, sec = (idx + (idx >= 15 ? 2 : 0)) % FRAMES.length;
  const img = typeof avatarImages !== 'undefined' && avatarImages[hid] ? avatarImages[hid].canvas : null;
  c.save();
  c.clearRect(0, 0, S, S);
  c.beginPath(); c.rect(0, 0, S, S); c.clip();
  const g = c.createLinearGradient(0, 0, S, S); g.addColorStop(0, '#07090f'); g.addColorStop(0.55, alpha(a, 0.9)); g.addColorStop(1, '#04060b'); c.fillStyle = g; c.fillRect(0, 0, S, S);
  c.save(); const k = 1.05 + Math.sin(t * 1.6) * 0.015; c.translate(S / 2, S / 2); c.scale(k, k); c.translate(-S / 2, -S / 2);
  if(img) c.drawImage(img, 0, 0, S, S);
  else { c.fillStyle = alpha(b, 0.9); c.font = 'bold ' + Math.round(S * 0.5) + 'px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(def.name || hid).charAt(0), S / 2, S / 2); }
  c.restore();
  const gl = c.createRadialGradient(S / 2, S * 0.4, 2, S / 2, S * 0.4, S * 0.7); gl.addColorStop(0, alpha(b, 0.22 + Math.sin(t * 2) * 0.08)); gl.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gl; c.fillRect(0, 0, S, S);
  const layer = fn => { c.save(); try { fn(); } catch(err) { warn('fx', err); } c.restore(); };
  layer(() => FX[prim](c, S, t, a, b, img));
  layer(() => FRAMES[sec](c, S, t, a, b));
  /* золотая рамка и блик */
  layer(() => {
    const bw = Math.max(2, S * 0.045), gr = c.createLinearGradient(0, 0, S, S); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#d19a2c'); gr.addColorStop(1, '#fff0a0');
    c.strokeStyle = gr; c.lineWidth = bw; c.strokeRect(bw / 2, bw / 2, S - bw, S - bw);
    const p = (t * 0.4) % 1.6 - 0.3, sh = c.createLinearGradient(S * (p - 0.15), 0, S * (p + 0.15), S * 0.4); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,.28)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = sh; c.fillRect(0, 0, S, S);
  });
  /* медаль «10» */
  layer(() => {
    const r = S * 0.15, x = S - r - 3, y = S - r - 3; const mg = c.createLinearGradient(0, y - r, 0, y + r); mg.addColorStop(0, '#ffe39a'); mg.addColorStop(1, '#c58a2a');
    c.shadowColor = '#000'; c.shadowBlur = 4; c.fillStyle = mg; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.shadowBlur = 0; c.lineWidth = 1.5; c.strokeStyle = '#3a2808'; c.stroke();
    c.fillStyle = '#2b1c05'; c.font = 'bold ' + Math.round(r * 1.05) + 'px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('10', x, y + 1);
  });
  if(locked){
    c.fillStyle = 'rgba(4,5,9,.66)'; c.fillRect(0, 0, S, S);
    c.fillStyle = '#e6d9b8'; c.strokeStyle = '#e6d9b8'; c.lineWidth = Math.max(2, S * 0.05);
    const w = S * 0.26, h = S * 0.2, x = S / 2 - w / 2, y = S * 0.47;
    c.beginPath(); c.arc(S / 2, y, w * 0.34, Math.PI, 0); c.stroke();
    c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, 3) : c.rect(x, y, w, h); c.fill();
  }
  c.restore();
}

/* кадр для канваса игры (меню, панель мастерства) — один общий холст на размер */
const frameCache = new Map();
function frameCanvas(hid, S, locked){
  const key = hid + ':' + S + ':' + (locked ? 1 : 0);
  let o = frameCache.get(key);
  if(!o){ const cv = document.createElement('canvas'); cv.width = cv.height = S; o = {cv, cx: cv.getContext('2d'), at: -1}; frameCache.set(key, o); }
  const now = performance.now();
  if(now - o.at > 33){ o.at = now; drawAnim(o.cx, S, now / 1000, hid, locked); }
  return o.cv;
}
window.__dsAnimAvatarFrame = (hid, S, locked) => { try { return frameCanvas(hid, S || 96, !!locked); } catch(err) { warn('frame', err); return null; } };

/* игровой холст: аватарка в меню */
try {
  const _dai = drawAvatarImage;
  drawAvatarImage = function(id, x, y, size){
    if(isMasteryAvatar(id)){ ctx.drawImage(frameCanvas(heroOf(id), 96, false), x, y, size, size); return true; }
    return _dai.apply(this, arguments);
  };
} catch(err) { warn('drawAvatarImage', err); }

/* ---------- DOM-холсты с анимацией ---------- */
const mounts = new Set();
let looping = false;
const modal = () => document.getElementById('account-modal');
function mount(parent, hid, size, locked){
  const cv = document.createElement('canvas'); cv.width = cv.height = size; cv.className = 'pf-anim';
  const m = {cv, hid, locked: !!locked, drawn: false}; mounts.add(m); parent.appendChild(cv);
  ensureLoop(); return cv;
}
function tick(){
  const md = modal();
  if(!md || md.hidden){ looping = false; return; }
  const t = performance.now() / 1000;
  for(const m of mounts){
    if(!m.cv.isConnected){ mounts.delete(m); continue; }
    if(m.cv.offsetParent === null) continue;
    if(m.locked && m.drawn) continue;
    try { drawAnim(m.cv.getContext('2d'), m.cv.width, t, m.hid, m.locked); m.drawn = true; } catch(err) { warn('draw', err); }
  }
  requestAnimationFrame(tick);
}
function ensureLoop(){ if(looping) return; const md = modal(); if(!md || md.hidden) return; looping = true; requestAnimationFrame(tick); }
try { new MutationObserver(ensureLoop).observe(modal(), {attributes: true, attributeFilter: ['hidden']}); } catch(err) { warn('observer', err); }

/* ======================================================================
   2. НОВЫЙ ПРОФИЛЬ
   ====================================================================== */
const $ = id => document.getElementById(id);
const fmt = n => Number(n || 0).toLocaleString('ru-RU');
const TABS = [['overview', 'Обзор'], ['avatars', 'Аватарки'], ['mastery', 'Мастерство'], ['settings', 'Настройки']];
let curTab = 'overview', built = false;
const els = {};

function el(tag, cls, text){ const e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }

function build(){
  const user = $('acc-user'); if(!user || built) return; built = true;
  const card = user.querySelector('.acc-card'), career = $('career-panel');
  const avTitle = user.querySelector('.acc-avatars-title'), avBox = $('acc-avatars');
  const nickLabel = $('acc-newnick') && $('acc-newnick').closest('label'), row = user.querySelector('.acc-row');
  if(!card || !career || !avBox) return;
  card.classList.add('pf-hero');
  const info = card.querySelector('.acc-info');
  els.xp = el('div', 'pf-xp'); els.xp.innerHTML = '<div class="pf-xp-bar"><i></i></div><span></span>'; info.appendChild(els.xp);
  els.tiles = el('div', 'pf-tiles'); card.after(els.tiles);
  els.tabs = el('div', 'pf-tabs'); els.tiles.after(els.tabs);
  els.panes = {};
  let anchor = els.tabs;
  for(const [id, label] of TABS){
    const b = el('button', 'pf-tab', label); b.type = 'button'; b.dataset.tab = id;
    b.addEventListener('click', () => { curTab = id; showTab(); });
    els.tabs.appendChild(b);
    const pane = el('div', 'pf-pane'); pane.dataset.pane = id; anchor.after(pane); anchor = pane; els.panes[id] = pane;
  }
  els.panes.overview.appendChild(career);
  if(avTitle){ avTitle.textContent = 'Обычные аватарки'; els.panes.avatars.appendChild(avTitle); }
  els.panes.avatars.appendChild(avBox);
  els.mHead = el('div', 'acc-avatars-title', 'Мастерство · анимированные аватарки (10 уровень героя)'); els.mGrid = el('div', 'pf-mgrid');
  els.panes.avatars.append(els.mHead, els.mGrid);
  els.mList = el('div', 'pf-mlist'); els.mSum = el('div', 'pf-msum'); els.panes.mastery.append(els.mSum, els.mList);
  if(nickLabel) els.panes.settings.appendChild(nickLabel);
  if(row) els.panes.settings.appendChild(row);
  showTab();
}
function showTab(){
  if(!built) return;
  for(const b of els.tabs.children) b.classList.toggle('on', b.dataset.tab === curTab);
  for(const id in els.panes) els.panes[id].hidden = id !== curTab;
}

function renderHeader(p){
  const lvlEl = $('acc-level');
  if(lvlEl){ const xp = ((p.xp || 0) % 500) / 500; lvlEl.parentElement.style.setProperty('--xp', String(Math.round(xp * 100))); }
  if(els.xp){ els.xp.querySelector('i').style.width = Math.round(((p.xp || 0) % 500) / 5) + '%'; els.xp.querySelector('span').textContent = fmt((p.xp || 0) % 500) + ' / 500 XP до следующего уровня'; }
  /* аватарка-анимация поверх обычной */
  const av = $('acc-avatar');
  if(av){
    const old = av.querySelector('canvas');
    if(isMasteryAvatar(p.avatar)){
      if(!old || old.dataset.hid !== heroOf(p.avatar)){ if(old) old.remove(); const cv = mount(av, heroOf(p.avatar), 128, false); cv.dataset.hid = heroOf(p.avatar); }
      av.classList.add('pf-av-mastery');
    } else { if(old) old.remove(); av.classList.remove('pf-av-mastery'); }
  }
  const total = p.matches != null ? p.matches : (p.wins || 0) + (p.losses || 0);
  const rate = total ? Math.round((p.wins || 0) / total * 100) : 0;
  const kd = (p.deaths || 0) ? ((p.kills || 0) / p.deaths).toFixed(2) : String(p.kills || 0);
  const tiles = [['МАТЧИ', fmt(total)], ['ПОБЕДЫ', fmt(p.wins)], ['ВИНРЕЙТ', total ? rate + '%' : '—'], ['У/С', kd], ['MMR', fmt(p.rating)], ['СЕНСИКИ', fmt(p.shards)]];
  els.tiles.textContent = '';
  for(const [l, v] of tiles){ const t = el('div', 'pf-tile'); t.append(el('b', '', v), el('span', '', l)); els.tiles.appendChild(t); }
  const wb = els.tiles.children[2]; if(wb && total){ wb.style.setProperty('--r', rate + '%'); wb.classList.add('rate'); }
}

function renderMasteryAvatars(p){
  const c = masteryCfg(), cur = p.avatar || '';
  const sig = cur + '|' + (c ? ORDER.map(h => heroWins(h) >= c.wins[c.wins.length - 1] ? 1 : 0).join('') : 'x') + '|' + ORDER.map(heroWins).join(',');
  if(els.mGrid.dataset.sig === sig) return;
  els.mGrid.dataset.sig = sig;
  for(const m of Array.from(mounts)){ if(els.mGrid.contains(m.cv)) mounts.delete(m); }
  els.mGrid.textContent = '';
  const need = c ? c.wins[c.wins.length - 1] : 55;
  let open = 0;
  const ids = ORDER.slice().sort((x, y) => (unlocked(y) - unlocked(x)) || heroWins(y) - heroWins(x));
  for(const hid of ids){
    const un = unlocked(hid); if(un) open++;
    const d = heroDef(hid), b = el('button', 'pf-mtile' + (un ? ' open' : ' locked') + (cur === PREFIX + hid ? ' selected' : '')); b.type = 'button';
    b.title = un ? d.name + ' — выбрать анимированную аватарку' : d.name + ': ещё ' + Math.max(0, need - heroWins(hid)) + ' побед до 10 уровня';
    const box = el('div', 'pf-mbox'); mount(box, hid, 96, !un);
    b.append(box, el('strong', '', d.name), el('small', '', cur === PREFIX + hid ? 'ВЫБРАНА' : un ? 'ОТКРЫТА' : Math.min(heroWins(hid), need) + ' / ' + need));
    if(un) b.addEventListener('click', () => { if(typeof accountSetAvatar === 'function') accountSetAvatar(PREFIX + hid); });
    els.mGrid.appendChild(b);
  }
  els.mHead.textContent = 'Мастерство · анимированные аватарки · открыто ' + open + ' из ' + ORDER.length;
}

function renderMasteryList(p){
  const c = masteryCfg();
  els.mList.textContent = '';
  if(!c){ els.mList.appendChild(el('div', 'pf-empty', 'Данные мастерства появятся после входа в аккаунт.')); els.mSum.textContent = ''; return; }
  let total = 0, claimable = 0;
  const rows = ORDER.map(h => ({h, w: heroWins(h), l: heroLevel(h), claimed: (p.mastery && p.mastery[h] && p.mastery[h].claimed) || 0})).sort((x, y) => y.w - x.w);
  for(const r of rows){ total += r.l; if(r.claimed < r.l) claimable++; }
  els.mSum.innerHTML = '';
  for(const [v, l] of [[total + ' / ' + (ORDER.length * c.wins.length), 'УРОВНЕЙ ВСЕГО'], [String(rows.filter(r => r.l >= c.wins.length).length), 'АНИМ. АВАТАРОК'], [String(claimable), 'НАГРАД К ПОЛУЧЕНИЮ']]){ const t = el('div', 'pf-tile'); t.append(el('b', '', v), el('span', '', l)); els.mSum.appendChild(t); }
  for(const r of rows){
    const d = heroDef(r.h), max = c.wins.length, prev = r.l > 0 ? c.wins[r.l - 1] : 0;
    const frac = r.l >= max ? 1 : Math.max(0, Math.min(1, (r.w - prev) / (c.wins[r.l] - prev)));
    const row = el('div', 'pf-mrow' + (r.l >= max ? ' max' : ''));
    const pic = el('canvas', 'pf-mpic'); pic.width = pic.height = 44;
    try { const img = avatarImages[r.h]; if(img) pic.getContext('2d').drawImage(img.canvas, 0, 0, 44, 44); } catch(err) { warn('pic', err); }
    const mid = el('div', 'pf-mmid'); mid.append(el('strong', '', d.name), el('small', '', r.l >= max ? 'МАКС. УРОВЕНЬ · ' + fmt(r.w) + ' побед' : fmt(r.w) + ' побед · до ' + (r.l + 1) + ' ур.: ' + (c.wins[r.l] - r.w)));
    const bar = el('div', 'pf-mbar'); const f = el('i'); f.style.width = Math.round(frac * 100) + '%'; bar.appendChild(f); mid.appendChild(bar);
    const lv = el('div', 'pf-mlv'); lv.append(el('b', '', String(r.l)), el('span', '', 'из ' + max));
    row.append(pic, mid, lv);
    if(r.claimed < r.l) row.appendChild(el('em', 'pf-mdot', '!'));
    els.mList.appendChild(row);
  }
}

function sync(){
  try {
    const p = prof(); if(!p){ return; }
    build(); if(!built) return;
    renderHeader(p); renderMasteryAvatars(p); renderMasteryList(p);
    showTab();
  } catch(err) { warn('sync', err); }
}
window.addEventListener('shadow:profile', () => queueMicrotask(sync));   /* после renderAccountModal, который сбрасывает аватарку */
document.addEventListener('DOMContentLoaded', () => sync());
sync();
})();
