/* DotaSense 0.10.7.2 — ВКЛАДКА «ЗВАНИЯ» (рейтинг, награды за звёзды, расширенная лестница).
   • Лестница рейтинга: РЕКРУТ → СТРАЖ → РЫЦАРЬ → ГЕРОЙ → ГЕРОЛЬД → ЗАЩИТНИК → ЛЕГЕНДА → БОЖЕСТВО → ТИТАН → БЕССМЕРТНЫЙ.
     В каждом звании 5 звёзд по 100 MMR (названия — в js/ui/account-display.js, награды и проверки — в accounts.js).
   • Кнопка «ЗВАНИЯ» в верхней панели открывает окно: текущее звание, прогресс до следующей звезды, лестница с эмблемами,
     список всех наград (Сенсики и бесплатные скины со второй звезды РЕКРУТА) и объяснение, как всё работает.
   • Награды забираются кнопкой — один раз за каждую звезду; сервер проверяет рейтинг и выдаёт награду одним запросом (маршрут claimrank). */
(function(){
'use strict';
const nav = document.getElementById('game-tools');
if(!nav) return;
const SHARD = '<svg class="sk-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#sensik-shard"></use></svg>';
const FALLBACK_NAMES = ['РЕКРУТ', 'СТРАЖ', 'РЫЦАРЬ', 'ГЕРОЙ', 'ГЕРОЛЬД', 'ЗАЩИТНИК', 'ЛЕГЕНДА', 'БОЖЕСТВО', 'ТИТАН'];
const IMMORTAL = 'БЕССМЕРТНЫЙ';
const COLORS = ['#9aa4ad', '#6fcf8a', '#5aa0ff', '#ffcf4d', '#ff8a4c', '#e0584f', '#c07bff', '#4fe3d6', '#ff4fa3', '#fff1b0'];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', '★'];
const FLAVOR = [
  'Первые шаги на арене. Здесь рейтинг только растёт — отличное место, чтобы освоиться.',
  'Ты научился держать линию и прикрывать союзников.',
  'Уверенная игра и первые заметные победы.',
  'Новое звание 0.10.7.2: герои арены — те, кто выигрывает чаще, чем проигрывает.',
  'Тебя знают противники: слабых ошибок здесь не прощают.',
  'Опытный боец, на которого равняются союзники.',
  'О тебе рассказывают истории — это уже элита.',
  'Почти недосягаемая высота: матчи решаются мелочами.',
  'Вершина лестницы смертных. Награды здесь самые щедрые.',
  'Высшее звание. Только избранные удерживают рейтинг от 4500 MMR.'
];
const tab0 = 'ladder';
let tab = tab0, busy = false, flash = '', flashTimer = 0;

const fmt = n => String(Math.max(0, Math.floor(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
function el(tag, cls, text){ const e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }
const profileOf = () => window.__shadowAccountProfile || null;
const hexRgb = h => { const v = parseInt(String(h).replace('#', ''), 16) || 0; return ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255); };
function skinName(id){
  try { const s = (typeof SKIN_BY_ID !== 'undefined') ? SKIN_BY_ID[id] : null; if(s && s.name) return s.name; } catch(e) {}
  return id;
}
function cfgOf(p){
  const c = p && p.rankCfg;
  if(c && Array.isArray(c.names) && Array.isArray(c.rewards)) return c;
  return {names: FALLBACK_NAMES, rewards: [], steps: FALLBACK_NAMES.length * 5};
}
const tierName = (names, t) => t >= names.length ? IMMORTAL : names[t];
function stepLabel(names, k){ return k >= names.length * 5 ? IMMORTAL : names[Math.floor(k / 5)] + ' ' + (k % 5 + 1); }

/* ---------- эмблема звания (SVG) ---------- */
let embN = 0;
function emblem(tier, locked){
  const col = COLORS[Math.min(tier, 9)], id = 'rke' + (embN++);
  const wings = tier >= 3, crown = tier >= 6, glow = tier >= 8;
  let s = '<svg class="rk-emb" viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".25" stop-color="' + col + '"/><stop offset="1" stop-color="' + col + '" stop-opacity=".45"/></linearGradient></defs>';
  if(glow) s += '<circle cx="50" cy="54" r="40" fill="' + col + '" opacity=".18"/>';
  if(wings){
    const n = tier >= 7 ? 4 : (tier >= 5 ? 3 : 2);
    for(const sd of [-1, 1]) for(let k = 0; k < n; k++){
      const x0 = 50 + sd * 24, y0 = 40 + k * 7, x1 = 50 + sd * (46 - k * 2), y1 = 14 + k * 11;
      s += '<path d="M' + x0 + ' ' + y0 + ' Q' + (x0 + sd * 14) + ' ' + (y0 - 14) + ' ' + x1 + ' ' + y1 + ' Q' + (x1 - sd * 4) + ' ' + (y0 + 4) + ' ' + x0 + ' ' + (y0 + 8) + 'Z" fill="' + col + '" opacity="' + (0.7 - k * 0.12) + '"/>';
    }
  }
  s += '<path d="M50 12 L78 22 L76 56 Q74 78 50 90 Q26 78 24 56 L22 22 Z" fill="url(#' + id + ')" stroke="#fff6cf" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M50 19 L71 27 L69.5 55 Q67.5 72 50 82 Q32.5 72 30.5 55 L29 27 Z" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.6"/>' +
    '<text x="50" y="62" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="' + (ROMAN[tier].length > 3 ? 20 : 28) + '" fill="#1a1205" stroke="rgba(255,255,255,.45)" stroke-width=".6">' + ROMAN[tier] + '</text>';
  if(crown) s += '<path d="M33 17 L38 3 L45 12 L50 1 L55 12 L62 3 L67 17 Z" fill="#ffd568" stroke="#fff6cf" stroke-width="1.4" stroke-linejoin="round"/>';
  return s + '</svg>';
}
function emblemNode(tier, cls){ const w = el('span', cls || ''); w.style.display = 'contents'; w.innerHTML = emblem(tier); return w.firstChild; }

/* ---------- состояние рейтинга ---------- */
function stateOf(p){
  const cfg = cfgOf(p), rating = Math.max(0, Math.floor((p && p.rating) || 0));
  const steps = cfg.steps || cfg.names.length * 5, step = Math.min(steps, Math.floor(rating / 100));
  const claimed = new Set((p && Array.isArray(p.rankClaimed)) ? p.rankClaimed : []);
  const rewards = {}; for(const r of cfg.rewards) rewards[r.step] = r;
  const ready = []; for(let k = 1; k <= step; k++) if(rewards[k] && !claimed.has(k)) ready.push(k);
  return {cfg, rating, steps, step, tier: Math.min(9, Math.floor(step / 5)), claimed, rewards, ready};
}

/* ---------- кнопка в верхней панели ---------- */
const ICON = '<svg class="qb-ico" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="rb-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".55" stop-color="#f0b429"/><stop offset="1" stop-color="#9a5b0c"/></linearGradient></defs>' +
  '<path d="M12 2 L20 5 L19.4 13 Q18.6 19 12 22 Q5.4 19 4.6 13 L4 5 Z" fill="url(#rb-g)" stroke="#fff0c7" stroke-width="1"/><path d="M12 7 l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="#2a1a02"/></svg>';
const box = el('div'); box.id = 'ranks-box'; box.hidden = true;
box.innerHTML = '<button id="ranks-btn" type="button" aria-haspopup="dialog" aria-expanded="false" title="Звания рейтинга: что даёт каждое звание и награды за звёзды">' + ICON +
  '<span class="sk-col"><small>РЕЙТИНГ</small><span class="qb-name">Звания</span></span></button>';
const questsBox = document.getElementById('quests-box'), dsBox = document.getElementById('dsplus-box');
if(questsBox) nav.insertBefore(box, questsBox); else if(dsBox) nav.insertBefore(box, dsBox); else nav.appendChild(box);
const btn = box.querySelector('#ranks-btn');

/* ---------- окно ---------- */
const modal = el('section'); modal.id = 'ranks-modal'; modal.hidden = true;
modal.innerHTML = '<div class="rk-panel" role="dialog" aria-modal="true" aria-labelledby="rk-title"><button type="button" class="rk-x" aria-label="Закрыть">✕</button>' +
  '<div class="rk-hero" id="rk-hero"></div><div class="rk-tabs" role="tablist"></div><div class="rk-body" id="rk-body"></div></div>';
document.body.appendChild(modal);
const panel = modal.querySelector('.rk-panel'), heroEl = modal.querySelector('#rk-hero'), tabsEl = modal.querySelector('.rk-tabs'), bodyEl = modal.querySelector('#rk-body');
const isOpen = () => !modal.hidden;
function openModal(){ modal.hidden = false; btn.setAttribute('aria-expanded', 'true'); render(); }
function closeModal(){ modal.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
btn.addEventListener('click', () => { if(isOpen()) closeModal(); else openModal(); });
modal.querySelector('.rk-x').addEventListener('click', closeModal);
modal.addEventListener('pointerdown', e => { if(e.target === modal) closeModal(); });
document.addEventListener('keydown', e => { if(e.key === 'Escape' && isOpen()){ e.stopPropagation(); e.preventDefault(); closeModal(); } }, true);

/* ---------- блоки ---------- */
function rewardChips(r){
  const w = el('div', 'rk-chips');
  if(!r){ w.appendChild(el('span', 'rk-chip', 'без награды')); return w; }
  const c = el('span', 'rk-chip'); c.innerHTML = SHARD + '<b></b>'; c.lastChild.textContent = '+' + fmt(r.shards); w.appendChild(c);
  if(r.skin) w.appendChild(el('span', 'rk-chip skin', '✦ скин: ' + skinName(r.skin)));
  return w;
}
function heroBlock(st, logged){
  heroEl.textContent = '';
  const col = COLORS[st.tier]; panel.style.setProperty('--rk-col', col); panel.style.setProperty('--rk-rgb', hexRgb(col));
  heroEl.appendChild(emblemNode(st.tier));
  const info = el('div');
  info.appendChild(el('div', 'rk-eyebrow', logged ? 'ТВОЁ ЗВАНИЕ В РЕЙТИНГЕ' : 'ЗВАНИЯ РЕЙТИНГА · ВОЙДИ В АККАУНТ, ЧТОБЫ УВИДЕТЬ СВОЁ'));
  const nm = el('h2', 'rk-name', logged ? stepLabel(st.cfg.names, st.step) : 'ЛЕСТНИЦА ЗВАНИЙ'); nm.id = 'rk-title'; info.appendChild(nm);
  if(logged){
    info.appendChild(el('div', 'rk-mmr', fmt(st.rating) + ' MMR'));
    const bar = el('div', 'rk-bar'), fill = el('i');
    if(st.step >= st.steps){ fill.style.width = '100%'; } else { fill.style.width = Math.round((st.rating % 100)) + '%'; }
    bar.appendChild(fill); info.appendChild(bar);
    const nx = el('div', 'rk-next');
    if(st.step >= st.steps){ nx.innerHTML = '<b>Высшее звание достигнуто.</b> Держи рейтинг от 4500 MMR.'; }
    else {
      const k = st.step + 1, r = st.rewards[k], left = k * 100 - st.rating;
      nx.innerHTML = 'До <b></b> осталось <b></b> MMR' + (r ? ' · награда: <b></b>' : '') + '.';
      const bs = nx.querySelectorAll('b'); bs[0].textContent = stepLabel(st.cfg.names, k); bs[1].textContent = fmt(left);
      if(r && bs[2]) bs[2].textContent = '+' + fmt(r.shards) + ' Сенсиков' + (r.skin ? ' и скин «' + skinName(r.skin) + '»' : '');
    }
    info.appendChild(nx);
  } else {
    info.appendChild(el('div', 'rk-next', 'Играй рейтинговые матчи, поднимай звёзды и забирай Сенсики и бесплатные скины — начиная со второй звезды Рекрута.'));
  }
  heroEl.appendChild(info);
}
function ladderTab(st, logged){
  bodyEl.appendChild(el('p', 'rk-note', 'Каждое звание состоит из 5 звёзд, одна звезда = 100 MMR. Победа в рейтинге даёт +50 MMR, поражение отнимает 40. Ниже — что даёт каждое звание.'));
  const grid = el('div', 'rk-ladder');
  const names = st.cfg.names;
  for(let t = 0; t < 10; t++){
    const imm = t === 9, from = t * 500, col = COLORS[t];
    const card = el('div', 'rk-tier' + (logged && st.tier === t ? ' cur' : '') + (logged && st.tier < t ? ' locked' : ''));
    card.style.setProperty('--c', col); card.style.setProperty('--rgb', hexRgb(col));
    card.appendChild(emblemNode(t));
    const body = el('div');
    body.appendChild(el('h3', '', tierName(names, t)));
    body.appendChild(el('div', 'rk-rng', imm ? 'от ' + fmt(from) + ' MMR' : fmt(from) + ' – ' + fmt(from + 499) + ' MMR'));
    if(!imm){
      const stars = el('div', 'rk-stars');
      for(let s = 0; s < 5; s++){ const i = el('i'); if(logged && st.step >= t * 5 + s) i.className = 'on'; stars.appendChild(i); }
      body.appendChild(stars);
    }
    const list = imm ? [45] : [1, 2, 3, 4, 5].map(s => t * 5 + s - 1).filter(k => k >= 1);
    let sh = 0; const skins = [];
    for(const k of list){ const r = st.rewards[k]; if(r){ sh += r.shards; if(r.skin) skins.push(skinName(r.skin)); } }
    const perk = el('div', 'rk-perk');
    if(st.cfg.rewards.length){
      perk.innerHTML = 'Наград: <b></b> Сенсиков' + (skins.length ? ' · скины: <b></b>' : '') + (t === 0 ? ' · награды начинаются со 2-й звезды' : '');
      const bs = perk.querySelectorAll('b'); bs[0].textContent = fmt(sh); if(skins.length && bs[1]) bs[1].textContent = skins.join(', ');
    } else perk.textContent = FLAVOR[t];
    body.appendChild(perk);
    if(st.cfg.rewards.length){ const fl = el('div', 'rk-perk'); fl.style.opacity = '.75'; fl.textContent = FLAVOR[t]; body.appendChild(fl); }
    card.appendChild(body); grid.appendChild(card);
  }
  bodyEl.appendChild(grid);
}
function rewardsTab(st, logged){
  if(!st.cfg.rewards.length){ bodyEl.appendChild(el('div', 'rk-empty', 'Награды за звания пока недоступны. Обнови страницу и войди в аккаунт заново.')); return; }
  bodyEl.appendChild(el('p', 'rk-note', 'Каждая звезда даёт награду один раз. Первая звезда нового звания — двойная. Если скин у тебя уже есть, вместо него придёт половина его цены в Сенсиках. Награды за пройденные звёзды можно забрать в любой момент — даже если рейтинг потом упал.'));
  if(logged && st.ready.length){
    const all = el('button', 'rk-btn all', 'ЗАБРАТЬ ВСЁ (' + st.ready.length + ')'); all.type = 'button'; all.disabled = busy;
    all.addEventListener('click', () => claimMany(st.ready.slice()));
    bodyEl.appendChild(all);
  }
  for(let t = 0; t < 10; t++){
    const col = COLORS[t], sec = el('div', 'rk-sec'); sec.style.setProperty('--c', col);
    sec.appendChild(emblemNode(t)); sec.appendChild(el('span', '', tierName(st.cfg.names, t)));
    sec.appendChild(el('small', '', t === 9 ? 'от 4 500 MMR' : fmt(t * 500) + ' – ' + fmt(t * 500 + 499) + ' MMR'));
    bodyEl.appendChild(sec);
    const list = t === 9 ? [45] : [0, 1, 2, 3, 4].map(s => t * 5 + s).filter(k => k >= 1);
    if(t === 0){
      const first = el('div', 'rk-row done'), ft = el('div'); ft.appendChild(el('h4', '', 'РЕКРУТ 1')); ft.appendChild(el('p', '', '0 MMR · стартовое звание')); first.appendChild(ft);
      first.appendChild(rewardChips(null)); first.appendChild(el('span')); bodyEl.appendChild(first);
    }
    for(const k of list){
      const r = st.rewards[k], reached = logged && st.step >= k, claimed = st.claimed.has(k), ready = reached && !claimed && !!r;
      const row = el('div', 'rk-row' + (ready ? ' ready' : '') + (claimed ? ' done' : '') + (!reached ? ' locked' : ''));
      const tx = el('div'); tx.appendChild(el('h4', '', stepLabel(st.cfg.names, k))); tx.appendChild(el('p', '', fmt(k * 100) + ' MMR'));
      row.appendChild(tx); row.appendChild(rewardChips(r));
      const b = el('button', 'rk-btn', claimed ? 'ПОЛУЧЕНО ✓' : ready ? 'ЗАБРАТЬ' : (logged ? 'ЕЩЁ ' + fmt(k * 100 - st.rating) + ' MMR' : 'ВОЙДИ В АККАУНТ'));
      b.type = 'button'; b.disabled = !ready || busy; b.addEventListener('click', () => claimMany([k]));
      row.appendChild(b); bodyEl.appendChild(row);
    }
  }
}
function infoTab(st){
  const w = el('div', 'rk-info');
  const sec = (title, items, isList) => {
    const s = el('section'); s.appendChild(el('h3', '', title));
    if(isList){ const ul = el('ul'); items.forEach(t => ul.appendChild(el('li', '', t))); s.appendChild(ul); }
    else items.forEach(t => s.appendChild(el('p', '', t)));
    w.appendChild(s);
  };
  sec('КАК РАСТЁТ РЕЙТИНГ', [
    'Рейтинг (MMR) меняется только в рейтинговых матчах — режим «Рейтинг», All Pick 4 на 4 с ботами.',
    'Победа: +50 MMR. Поражение: −40 MMR. Рейтинг не опускается ниже нуля.',
    'Одна звезда = 100 MMR. Пять звёзд = одно звание. То есть после победы в среднем нужно две победы подряд на звезду.'
  ], true);
  sec('ЛЕСТНИЦА ЗВАНИЙ', [
    'РЕКРУТ → СТРАЖ → РЫЦАРЬ → ГЕРОЙ → ГЕРОЛЬД → ЗАЩИТНИК → ЛЕГЕНДА → БОЖЕСТВО → ТИТАН → БЕССМЕРТНЫЙ.',
    'У каждого звания, кроме БЕССМЕРТНОГО, 5 звёзд. Всего 9 званий по 500 MMR; БЕССМЕРТНЫЙ открывается с 4 500 MMR.',
    'В версии 0.10.7.2 после РЫЦАРЯ добавлено звание ГЕРОЙ — поэтому все следующие звания теперь начинаются на 500 MMR выше.'
  ], true);
  sec('НАГРАДЫ', [
    'Со второй звезды РЕКРУТА (100 MMR) и дальше за каждую новую звезду можно получить Сенсики.',
    'Первая звезда нового звания даёт двойную награду, а на некоторых звёздах вместе с Сенсиками выдаётся бесплатный скин: от «Призрачного» Снайпера до «Пустотного жнеца» у БЕССМЕРТНОГО.',
    'Награда выдаётся один раз за звезду. Забирай её во вкладке «Награды»: можно по одной или кнопкой «Забрать всё».',
    'Если нужный скин у тебя уже есть, вместо него начисляется половина его цены в Сенсиках.',
    'Уже полученные награды никуда не пропадают, даже если рейтинг упадёт.'
  ], true);
  sec('ГДЕ ПОТРАТИТЬ', ['Сенсики тратятся в магазине на скины, арканы и иммортал-предметы. Бесплатные скины сразу появляются в инвентаре.']);
  bodyEl.appendChild(w);
}

/* ---------- отрисовка ---------- */
function render(){
  const p = profileOf();
  box.hidden = !p;
  if(!p){ box.classList.remove('has-ready'); if(isOpen()) closeModal(); return; }
  const st = stateOf(p);
  box.classList.toggle('has-ready', st.ready.length > 0);
  if(!isOpen()) return;
  heroBlock(st, true);
  tabsEl.textContent = '';
  for(const [id, label] of [['ladder', 'Лестница'], ['rewards', 'Награды'], ['info', 'Как это работает']]){
    const t = el('button', 'rk-tab' + (tab === id ? ' on' : ''), label); t.type = 'button'; t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', String(tab === id));
    if(id === 'rewards' && st.ready.length) t.appendChild(el('span', 'rk-dot', String(st.ready.length)));
    t.addEventListener('click', () => { tab = id; render(); });
    tabsEl.appendChild(t);
  }
  const keep = bodyEl.scrollTop; bodyEl.textContent = '';
  if(flash) bodyEl.appendChild(el('p', 'rk-flash', flash));
  if(tab === 'ladder') ladderTab(st, true); else if(tab === 'rewards') rewardsTab(st, true); else infoTab(st);
  bodyEl.scrollTop = keep;
}

/* ---------- получение наград ---------- */
function setFlash(text, ms){ flash = text; clearTimeout(flashTimer); flashTimer = setTimeout(() => { flash = ''; render(); }, ms || 5000); }
async function claimMany(steps){
  if(busy || typeof account === 'undefined' || !account || !account.token) return;
  busy = true; render();
  let shards = 0; const skins = [];
  try {
    for(const step of steps){
      const data = await accountApi('claimrank', {token: account.token, step});
      account.profile = data.profile;
      accountStore(ACCOUNT_PROFILE_KEY, JSON.stringify(data.profile));
      if(data.claimed){ shards += data.reward || 0; if(data.skin) skins.push(skinName(data.skin)); }
    }
    if(typeof renderAccountModal === 'function') renderAccountModal();
    if(shards || skins.length) setFlash('НАГРАДА ПОЛУЧЕНА: +' + fmt(shards) + ' Сенсиков' + (skins.length ? ' · новые скины: ' + skins.join(', ') : ''), 7000);
  } catch(err) {
    if(err && err.status === 401 && typeof accountSet === 'function') accountSet(null, null);
    else setFlash('Не удалось получить награду. Попробуй ещё раз.', 4000);
  } finally { busy = false; render(); }
}

window.addEventListener('shadow:profile', render);
render();
setTimeout(render, 1600);   /* профиль мог подгрузиться позже скрипта */
window.__ranks0107 = {open: openModal, close: closeModal, state: () => stateOf(profileOf())};
})();
