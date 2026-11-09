/* DotaSense 0.10.7.3 (правка 2) — МЕНЮ: лаги главного героя + живой фон.
   ПРИЧИНА ЛАГОВ: 3D-модель героя в меню (hero3d.js, программный растеризатор на canvas 2D) пересчитывалась в главном потоке
   КАЖДЫЙ кадр: 20–45 мс на кадр (пики до 130 мс), т.е. меню шло в 20–40 FPS с подвисаниями.
   РЕШЕНИЕ: обёртка Hero3D.draw для вызовов на основном холсте (меню/драфт/«герой в деталях»):
     • модель рендерится в закэшированный offscreen-холст, а в остальные кадры просто копируется (drawImage — доли мс);
     • частота перерисовки адаптивна: покоится/качается — не чаще ~25 к/с и не более ~50% времени кадра; при быстром вращении
       мышью — по возможности каждый кадр, но в уменьшенном до 80% разрешении, как только остановили — снова чётко;
     • картинка и логика игры не меняются, одноразовые рендеры (иконки, магазин) идут напрямую, без кэша.
   ДОБАВЛЕНО: плавающие искры/пыль над фоном меню (только пока gameState === 'menu'; не на слабой графике). */
(function(){
'use strict';
const warn = (t, e) => { if(!warn[t]){ warn[t] = 1; try { console.warn('update01073b ' + t + ':', e); } catch(_) {} } };
const body = document.body;
const low = () => !!(body && body.classList.contains('perf-low'));

/* ---------- кэш кадров героя ---------- */
(function heroCache(){
  const H3 = window.Hero3D;
  if(!H3 || typeof H3.draw !== 'function' || H3.__menuCache) return;
  H3.__menuCache = true;
  const orig = H3.draw, slots = new Map();
  const mk = () => { try { return new OffscreenCanvas(8, 8); } catch(e) { return document.createElement('canvas'); } };
  H3.draw = function(c, def, x, y, w, h, o){
    try {
      if(!c || !c.canvas || c.canvas.id !== 'game' || !def || !o || !(w > 8) || !(h > 8) || H3.__noCache) return orig.call(this, c, def, x, y, w, h, o);
      const nowMs = performance.now();
      const key = [def.id, def.skinId || '', def.color || '', def.color2 || '', o.pose ? (o.pose.kind || '') + (o.pose.slot || '') : '',
        Math.round(w), Math.round(h), Math.round(x), Math.round(y), o.noPedestal ? 1 : 0, o.dx || 0, o.cy || 0, o.ss || 0, o.zoom || 1].join('|');
      let st = slots.get(key);
      if(!st){
        if(slots.size > 10){ for(const [k, v] of slots) if(nowMs - v.seen > 3000) slots.delete(k); if(slots.size > 16) slots.clear(); }
        st = {cv: mk(), g: null, last: -1e9, yaw: o.yaw || 0, pitch: o.pitch || 0, ms: 20, seen: nowMs, scale: 1, yawT: nowMs};
        slots.set(key, st);
      }
      st.seen = nowMs;
      const dtS = Math.max(.001, (nowMs - st.yawT) / 1000);
      const speed = Math.abs((o.yaw || 0) - st.yaw) / dtS;
      const fast = speed > 1.2 || Math.abs((o.pitch || 0) - st.pitch) / dtS > .8;
      const interval = fast ? Math.max(14, st.ms * 1.1) : Math.max(40, st.ms * 2);
      const stale = nowMs - st.last >= interval;
      if(stale || st.last < 0){
        const s = fast && st.ms > 14 ? .8 : (st.ms > 26 ? .85 : 1);   /* тяжёлая модель/слабое устройство — чуть меньше пикселей */
        const cw = Math.max(8, Math.round(w * s)), ch = Math.max(8, Math.round(h * s));
        if(st.cv.width !== cw || st.cv.height !== ch){ st.cv.width = cw; st.cv.height = ch; st.g = null; }
        if(!st.g) st.g = st.cv.getContext('2d');
        st.g.clearRect(0, 0, cw, ch);
        const t0 = performance.now();
        orig.call(this, st.g, def, 0, 0, cw, ch, o);
        const dt = performance.now() - t0;
        st.ms = st.ms * .7 + Math.min(dt, 120) * .3;
        st.last = nowMs; st.yaw = o.yaw || 0; st.pitch = o.pitch || 0; st.yawT = nowMs; st.scale = s;
      }
      c.save();
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(st.cv, x, y, w, h);
      c.restore();
    } catch(err) { warn('cache', err); return orig.call(this, c, def, x, y, w, h, o); }
  };
})();

/* ---------- искры над меню ---------- */
(function embers(){
  if(!body) return;
  let reduce = false; try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e) {}
  if(reduce) return;
  const cv = document.createElement('canvas'); cv.id = 'fx-embers'; cv.setAttribute('aria-hidden', 'true');
  cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:2;pointer-events:none;opacity:0;transition:opacity .8s ease';
  body.appendChild(cv);
  const g = cv.getContext('2d');
  let W = 0, H = 0;
  const fit = () => { const w = innerWidth, h = innerHeight; if(w !== W || h !== H){ W = cv.width = w; H = cv.height = h; } };
  const COLS = ['255,150,70', '255,200,110', '255,110,90', '255,230,170'];
  const N = 46, P = [];
  const spawn = (p, init) => {
    p.x = Math.random() * W; p.y = init ? Math.random() * H : H + 10; p.r = .8 + Math.random() * 2.2;
    p.vy = 14 + Math.random() * 34; p.sw = Math.random() * 6.28; p.sa = 10 + Math.random() * 26; p.ph = Math.random() * 6.28;
    p.c = COLS[(Math.random() * COLS.length) | 0]; p.tw = .6 + Math.random() * 1.6; return p;
  };
  let last = 0, vis = false, run = false;
  const inMenu = () => { try { return typeof gameState !== 'undefined' && gameState === 'menu' && !document.hidden && !low(); } catch(e) { return false; } };
  function frame(ts){
    const want = inMenu();
    if(want !== vis){ vis = want; cv.style.opacity = vis ? '1' : '0'; }
    if(!vis){ if(+cv.style.opacity === 0 && run){ run = false; poll(); return; } }
    if(ts - last >= 33){
      const dt = Math.min(.1, (ts - last) / 1000); last = ts; fit();
      if(!P.length) for(let i = 0; i < N; i++) P.push(spawn({}, true));
      g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = 'lighter';
      for(const p of P){
        p.y -= p.vy * dt; p.sw += dt * .9; p.x += Math.sin(p.sw) * p.sa * dt;
        if(p.y < -10) spawn(p, false);
        const a = (.25 + .45 * Math.abs(Math.sin(ts / 1000 * p.tw + p.ph))) * Math.min(1, p.y / (H * .35));
        g.fillStyle = 'rgba(' + p.c + ',' + a.toFixed(3) + ')';
        g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.2832); g.fill();
        g.fillStyle = 'rgba(' + p.c + ',' + (a * .18).toFixed(3) + ')';
        g.beginPath(); g.arc(p.x, p.y, p.r * 3.2, 0, 6.2832); g.fill();
      }
    }
    requestAnimationFrame(frame);
  }
  /* вне меню цикл не крутится: раз в 400 мс проверяем, не вернулись ли в меню */
  function poll(){ if(inMenu()){ run = true; requestAnimationFrame(frame); } else setTimeout(poll, 400); }
  poll();
})();
/* ---------- горячие клавиши главного меню ----------
   Enter — ИГРАТЬ · 1/2/3 — ТУРБО / ALL PICK / РЕЙТИНГ · B — бойцы · S — магазин · I — инвентарь · L — мировой топ · P — профиль · U — обновления.
   Работают только на главном экране меню, когда не открыто ни одно окно и фокус не в поле ввода. */
(function hotkeys(){
  const open = id => { const el = document.getElementById(id); return !!(el && !el.hidden); };
  window.addEventListener('keydown', e => {
    try {
      if(e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
      if(typeof gameState === 'undefined' || gameState !== 'menu' || menuStage !== 'home') return;
      const t = e.target, tag = t && t.tagName;
      if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      if(settingsOpen || changelogOpen || open('account-modal') || open('leaderboard-modal') || open('lobby-modal') || open('quests-modal') || open('ranks-modal')) return;
      if(body.classList.contains('store-open') || document.querySelector('[id$="-modal"]:not([hidden])')) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      let used = true;
      if(k === 'Enter') dsStartPlay();
      else if(k === '1') dsSetPlayMode('turbo');
      else if(k === '2') dsSetPlayMode('allpick');
      else if(k === '3') dsSetPlayMode('ranked');
      else if(k === 'b' || k === 'и'){ menuStage = 'heroes'; menuHeroPage = 0; }
      else if(k === 's' || k === 'ы'){ storeOpenScreen('shop'); changelogOpen = false; settingsOpen = false; }
      else if(k === 'i' || k === 'ш'){ storeOpenScreen('inventory'); changelogOpen = false; settingsOpen = false; }
      else if(k === 'l' || k === 'д') window.openLeaderboard && window.openLeaderboard();
      else if(k === 'p' || k === 'з') openAccountModal();
      else if(k === 'u' || k === 'г'){ changelogOpen = true; changelogScroll = 0; }
      else used = false;
      if(used) e.preventDefault();
    } catch(err) { warn('hotkeys', err); }
  });
})();
})();
