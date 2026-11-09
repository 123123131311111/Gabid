/* DotaSense 0.10.7.3 — ВИЗУАЛЬНЫЙ ПАТЧ: плавные анимации и эффекты интерфейса.
   Только DOM-слой поверх игры (ничего в игровой логике и канвасе не меняется). Работает в паре с ui-fx.css.
   • Клик по любому месту — кольцо, вспышка и искры; правый клик по карте — красные шевроны «идти сюда».
   • Кнопки: пружинистый отклик (пульс), вкладки «выскакивают», блик на кнопках верхней панели.
   • Окна: затемнение + пружинка панели, плавное закрытие; контент при смене вкладок появляется каскадом.
   • Сенсики: плавный счётчик, зелёная/красная вспышка при изменении, блеск осколка.
   • Покупка / «Забрать» / активация: салют из конфетти.
   • Низкое здоровье героя (<25%): пульсирующая красная виньетка по краям экрана. */
(function(){
'use strict';
const doc = document, body = doc.body;
if(!body) return;
const warn = (t, e) => { if(!warn[t]){ warn[t] = 1; try { console.warn('update01073 ' + t + ':', e); } catch(_) {} } };
const reduce = (() => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch(e) { return false; } })();
if(reduce) return;
const low = () => body.classList.contains('perf-low');
const rnd = (a, b) => a + Math.random() * (b - a);

/* ---------- слой эффектов ---------- */
const layer = doc.createElement('div');
layer.id = 'fx-layer';
layer.setAttribute('aria-hidden', 'true');
body.appendChild(layer);
const MAX_NODES = 90;
function node(cls, x, y, vars, life){
  if(layer.childElementCount > MAX_NODES) return null;
  const el = doc.createElement('i');
  el.className = cls;
  el.style.left = x + 'px'; el.style.top = y + 'px';
  if(vars) for(const k in vars) el.style.setProperty(k, vars[k]);
  layer.appendChild(el);
  setTimeout(() => el.remove(), life || 1100);
  return el;
}
const GOLD = '255,214,120', RED = '255,96,70', BLUE = '120,220,255';
function ring(x, y, c, big){ node('fx-ring' + (big ? ' fx-big' : ''), x, y, {'--fx-c': c}, 900); }
function flash(x, y, c){ if(!low()) node('fx-flash', x, y, {'--fx-c': c}, 500); }
function sparks(x, y, c, n, dist){
  if(low()) return;
  for(let i = 0; i < n; i++){
    const a = Math.random() * Math.PI * 2, d = rnd(dist * .5, dist);
    node('fx-spark', x, y, {'--fx-c': c, '--fx-dx': Math.cos(a) * d + 'px', '--fx-dy': Math.sin(a) * d + 'px', '--fx-t': rnd(.4, .7) + 's'}, 800);
  }
}
function confetti(x, y){
  if(low()) return;
  for(let i = 0; i < 26; i++){
    const a = -Math.PI / 2 + rnd(-1.1, 1.1), d = rnd(70, 190);
    node('fx-conf', x, y, {'--fx-h': Math.floor(rnd(0, 360)), '--fx-dx': Math.cos(a) * d + 'px', '--fx-dy': Math.sin(a) * d + rnd(40, 120) + 'px',
      '--fx-r': rnd(-540, 540) + 'deg', '--fx-t': rnd(.8, 1.3) + 's'}, 1500);
  }
}

/* ---------- клики ---------- */
const BTN = 'button, [role="button"], .qm-btn, a[href], summary, label[for], input[type="button"], input[type="submit"]';
const BUY = /купить|забрать|получить|активир|подтверд/i;
function onDown(e){
  try {
    if(e.button > 2) return;
    const x = e.clientX, y = e.clientY;
    if(!(x >= 0 && y >= 0)) return;
    const t = e.target;
    const btn = t && t.closest ? t.closest(BTN) : null;
    if(btn && !btn.disabled){
      ring(x, y, GOLD, false); sparks(x, y, GOLD, 5, 34);
      btn.classList.remove('fx-pulse'); void btn.offsetWidth; btn.classList.add('fx-pulse');
      setTimeout(() => btn.classList.remove('fx-pulse'), 480);
      if(btn.closest('[class*="tabs"], [role="tablist"], [class*="tab"]')){ btn.classList.remove('fx-tabpop'); void btn.offsetWidth; btn.classList.add('fx-tabpop'); setTimeout(() => btn.classList.remove('fx-tabpop'), 420); }
      if(BUY.test(btn.textContent || '') && e.button === 0) setTimeout(() => { if(!btn.disabled && btn.isConnected) confetti(x, y); }, 60);
      if(btn.id === 'sensiki-btn') btn.classList.add('fx-shine'), setTimeout(() => btn.classList.remove('fx-shine'), 850);
      return;
    }
    if(t && t.id === 'game'){
      if(e.button === 2){ node('fx-chevrons', x, y, {'--fx-red': RED}, 600); ring(x, y, RED, false); }
      else if(e.button === 0){ ring(x, y, GOLD, false); flash(x, y, GOLD); sparks(x, y, GOLD, 6, 40); }
      return;
    }
    if(e.button === 0){ ring(x, y, BLUE, false); }
  } catch(err) { warn('down', err); }
}
doc.addEventListener('pointerdown', onDown, {passive: true, capture: true});

/* ---------- окна: плавное закрытие и каскад контента ---------- */
const modals = new WeakSet();
function visibleNow(el){ return !el.hidden; }
const mo = new MutationObserver(list => {
  for(const m of list){
    const el = m.target;
    if(m.type !== 'attributes' || m.attributeName !== 'hidden' || !(el instanceof HTMLElement)) continue;
    if(!el.hidden && m.oldValue !== null){
      /* стало видимым → каскад (кроме корневых окон: у них свой ui-pop / fx-modal-in) */
      if(low() || el.id === 'fx-layer' || /-modal$/.test(el.id) || el.id === 'boot-loader') continue;
      if(el.children.length > 40) continue;
      let i = 0; for(const c of el.children){ if(i > 12) break; c.style.setProperty('--fx-i', i++); }
      el.classList.remove('fx-in'); void el.offsetWidth; el.classList.add('fx-in');
      setTimeout(() => el.classList.remove('fx-in'), 900);
    }
  }
});
mo.observe(body, {subtree: true, attributes: true, attributeFilter: ['hidden'], attributeOldValue: true});

/* плавное закрытие окон: перехватываем hidden=true у *-modal (закрытие по кнопке/фону/Esc) */
try {
  const desc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidden');
  if(desc && desc.set && !HTMLElement.prototype.__fxHidden){
    Object.defineProperty(HTMLElement.prototype, '__fxHidden', {value: true});
    Object.defineProperty(HTMLElement.prototype, 'hidden', {
      configurable: true, enumerable: desc.enumerable, get: desc.get,
      set(v){
        if(v && (this.id === 'account-modal' || this.id === 'leaderboard-modal') && !this.hidden && !low() && this.isConnected && !this.__fxClosing){
          const el = this; el.__fxClosing = true; el.classList.add('fx-closing');
          setTimeout(() => { el.classList.remove('fx-closing'); el.__fxClosing = false; desc.set.call(el, true); }, 180);
          return;
        }
        if(!v && this.__fxClosing){ this.__fxClosing = false; this.classList.remove('fx-closing'); }
        desc.set.call(this, v);
      }
    });
  }
} catch(err) { warn('hidden', err); }

/* кнопки с «бликом» должны быть позиционированными, но fixed/absolute мы не трогаем */
try { doc.querySelectorAll('#topbar button').forEach(b => { if(getComputedStyle(b).position === 'static') b.style.position = 'relative'; }); } catch(err) { warn('pos', err); }

/* ---------- Сенсики: плавный счётчик ---------- */
(function sensiki(){
  const el = doc.getElementById('sensiki-amount'); if(!el) return;
  const parse = s => parseInt(String(s).replace(/\D/g, ''), 10);
  const fmt = n => String(Math.max(0, Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  let shown = parse(el.textContent), raf = 0, writing = false;
  if(!Number.isFinite(shown)) shown = null;
  const write = s => { writing = true; el.textContent = s; writing = false; };
  new MutationObserver(() => {
    if(writing) return;
    const target = parse(el.textContent);
    if(!Number.isFinite(target)) return;
    if(shown === null || low() || target === shown){ shown = target; return; }
    const from = shown, delta = target - from, t0 = performance.now(), dur = Math.min(900, 350 + Math.abs(delta) * 0.5);
    el.classList.remove('fx-gain', 'fx-loss'); void el.offsetWidth; el.classList.add(delta > 0 ? 'fx-gain' : 'fx-loss');
    const btn = doc.getElementById('sensiki-btn');
    if(btn && delta > 0){ btn.classList.add('fx-shine'); setTimeout(() => btn.classList.remove('fx-shine'), 850); }
    cancelAnimationFrame(raf);
    write(fmt(from));
    const step = now => {
      const k = Math.min(1, (now - t0) / dur), v = from + delta * (1 - Math.pow(1 - k, 3));
      write(fmt(v)); shown = Math.round(v);
      if(k < 1) raf = requestAnimationFrame(step); else { shown = target; write(fmt(target)); }
    };
    raf = requestAnimationFrame(step);
  }).observe(el, {childList: true, characterData: true, subtree: true});
})();

/* ---------- низкое здоровье ---------- */
(function lowHp(){
  const v = doc.createElement('div'); v.id = 'fx-lowhp'; v.setAttribute('aria-hidden', 'true'); body.appendChild(v);
  let on = false;
  setInterval(() => {
    try {
      const inMatch = body.classList.contains('in-match') && typeof playerHero !== 'undefined' && playerHero && !playerHero.dead && playerHero.maxHp > 0;
      const want = !!inMatch && playerHero.hp / playerHero.maxHp < 0.25;
      if(want !== on){ on = want; v.classList.toggle('on', on); }
    } catch(e) { if(on){ on = false; v.classList.remove('on'); } }
  }, 250);
})();
})();
