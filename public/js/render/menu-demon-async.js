/* 0.10.8.1: 3D-демон меню считается в отдельном потоке (js/render/demon-worker.js).
   Меню больше не ждёт растеризатор: показывается последний готовый кадр, следующий уже считается.
   Если поток недоступен (старый браузер, file://) — остаётся прежний синхронный вариант из update973.js. */
(function(){
'use strict';
const G = window;
if(!G.menuDemon973 || typeof Worker === 'undefined' || location.protocol === 'file:') return;
const syncDraw = G.menuDemon973.draw;
const TAU = Math.PI * 2;
const W = {wk: null, ok: true, busy: false, id: 0, cv: null, g: null, gc: null, sm: null, Wpx: 0, Hpx: 0, ready: false,
           yaw: 0, q: 1.35, ms: 30, born: 0, lastReq: 0, f: 0, ox: 0, def: {id: 'menuDemon', color: '#8a1a14', color2: '#ff9a50'}};
function themeColor(){
  try { const c = DST.cur && DST.cur.hover; if(c) return '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join(''); } catch(err) {}
  return '#ff9a50';
}
function ensureCanvases(Wpx, Hpx, now){
  if(W.cv && W.Wpx === Wpx && W.Hpx === Hpx) return;
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  W.cv = mk(Wpx, Hpx); W.g = W.cv.getContext('2d');
  W.gc = mk(Wpx, Hpx);
  W.sm = [3, 7].map(d => mk(Math.max(2, Math.round(Wpx / d)), Math.max(2, Math.round(Hpx / d))));
  W.Wpx = Wpx; W.Hpx = Hpx;
  if(!W.ready) W.born = now;
}
function onMsg(e){
  const d = e.data; W.busy = false;
  if(!d || d.t !== 'demon'){ if(d && d.t === 'error'){ console.warn('demon worker', d.msg); W.ok = false; } return; }
  W.ms = W.ms * 0.7 + d.ms * 0.3;
  /* качество подстраивается под скорость потока: цель — ~30 кадров анимации в секунду */
  if(d.ms > 45) W.q = Math.max(0.8, W.q * 0.92); else if(d.ms < 22) W.q = Math.min(1.7, W.q * 1.04);
  if(!W.cv || d.W !== W.Wpx || d.H !== W.Hpx) return;      /* размер поменялся, пока считали — кадр устарел */
  const n = d.W * d.H * 4, g = W.g;
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  g.putImageData(new ImageData(new Uint8ClampedArray(d.data, 0, n), d.W, d.H), 0, 0);
  if(d.glow){
    W.gc.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(d.glow, 0, n), d.W, d.H), 0, 0);
    g.save(); g.globalCompositeOperation = 'lighter'; g.imageSmoothingEnabled = true;
    [[3, 0.6], [7, 0.55]].forEach(([dd, al], i) => { const sm = W.sm[i], sg = sm.getContext('2d'); sg.clearRect(0, 0, sm.width, sm.height); sg.drawImage(W.gc, 0, 0, sm.width, sm.height); g.globalAlpha = al; g.drawImage(sm, 0, 0, d.W, d.H); });
    g.restore();
  }
  W.ready = true;
}
function worker(){
  if(W.wk || !W.ok) return W.wk;
  try {
    W.wk = new Worker('./js/render/demon-worker.js?v=0.10.8.1');
    W.wk.onmessage = onMsg;
    W.wk.onerror = err => { console.warn('demon worker failed', err && err.message); W.ok = false; W.busy = false; try { W.wk.terminate(); } catch(e) {} W.wk = null; };
  } catch(err) { W.ok = false; W.wk = null; }
  return W.wk;
}
G.menuDemon973.draw = function(cx, gy, u, now){
  if(perfLevel >= 3 || !worker()) return syncDraw.apply(this, arguments);
  try {
    const dispH = VH * 0.96 * (G.menuDemonScale || 1);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const qCap = perfLevel >= 2 ? 360 : (perfLevel >= 1 ? 560 : 1180);
    const qMul = perfLevel >= 2 ? 0.5 : (perfLevel >= 1 ? 0.72 : W.q * (0.75 + 0.25 * dpr));
    const Hpx = Math.round(Math.min(qCap, dispH * qMul) / 4) * 4, Wpx = Math.round(Hpx * 1.1 / 4) * 4;
    const D = 9, f = 0.9 * Hpx * D / 4.8, ox = 0.25 * f / D;
    ensureCanvases(Wpx, Hpx, now);
    const want = Math.max(-0.55, Math.min(0.55, (mouse.x - cx) / VW * 1.5)) + Math.sin(now * 0.42) * 0.16;
    W.yaw += (want - W.yaw) * 0.06;
    if(!W.busy && now - W.lastReq > 0.033){
      W.busy = true; W.lastReq = now;
      W.def.color2 = themeColor();
      W.wk.postMessage({t: 'demon', id: ++W.id, def: W.def,
        o: {W: Wpx, H: Hpx, yaw: W.yaw, pitch: 0.12, t: now, f, cx: Wpx / 2 - ox, cy: Hpx / 2 + 0.95 * f / D, pedestal: false, pose: {kind: 'show'}}});
    }
    if(!W.ready) return true;                                 /* первый кадр ещё считается — пусто, без лагов */
    const k = dispH / Hpx, a = Math.min(1, (now - W.born) / 0.7);
    const left = cx - (Wpx / 2 - ox) * k, top = gy - 0.92 * dispH + dispH * 0.01;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    const sh = ctx.createRadialGradient(cx, gy, 0, cx, gy, u * 34);
    sh.addColorStop(0, 'rgba(0,0,0,.7)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.translate(0, gy); ctx.scale(1, 0.22); ctx.translate(0, -gy); ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(cx, gy, u * 34, 0, TAU); ctx.fill(); ctx.restore();
    ctx.globalAlpha = a; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(W.cv, left, top, Wpx * k, Hpx * k);
    if(perfLevel < 2){
      ctx.globalCompositeOperation = 'lighter';
      for(let i = 0; i < 22; i++){
        const ph = (now * (0.1 + (i % 5) * 0.025) + i * 0.137) % 1, ang = i * 2.399 + now * 0.2;
        const ex = cx + Math.cos(ang) * dispH * (0.12 + (i % 7) * 0.035) + Math.sin(now * 0.8 + i) * 8;
        const ey = gy - ph * dispH * 0.85, al = Math.sin(ph * Math.PI) * 0.8;
        ctx.fillStyle = (i % 3 ? 'rgba(255,150,70,' : 'rgba(255,220,130,') + al.toFixed(3) + ')';
        const rr = (1.2 + (i % 4) * 0.5) * (1 - ph * 0.5) * Math.max(1, u * 0.06);
        ctx.beginPath(); ctx.arc(ex, ey, rr, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
    return true;
  } catch(err) { console.warn('menu demon async', err); return syncDraw.apply(this, arguments); }
};
/* в матче поток не нужен — освобождаем память; при возврате в меню создастся заново */
setInterval(() => {
  if(W.wk && typeof gameState !== 'undefined' && gameState !== 'menu'){ try { W.wk.terminate(); } catch(e) {} W.wk = null; W.busy = false; W.ready = false; }
}, 3000);
})();
