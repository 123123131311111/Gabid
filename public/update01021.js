/* DotaSense 0.10.2.1 — вкладка «ЗАДАНИЯ», мега-задание и иммортал-предметы.
   • Кнопка «ЗАДАНИЯ» в верхней панели (рядом с «Сенсики» и «Дотасенс +») открывает окно с тремя вкладками:
       ЕЖЕДНЕВНЫЕ    — шесть заданий, которые обновляются каждый день в 00:00 по Киеву (серверные поля profile.daily и profile.quests);
       ПОСТОЯННЫЕ    — восемь заданий, которые выполняются один раз за всё время по общей статистике аккаунта (profile.life);
       МЕГА-ЗАДАНИЕ  — «Легенда арены»: четыре условия сразу, награда 1100 Сенсиков (profile.life, запись с mega: true).
   • Все числа (цели, награды, прогресс) считает и хранит сервер (accounts.js); здесь только интерфейс.
   • Иммортал-предметы «Клинки полуночной стражи» (Вождь) и «Тотем предков» (Илья) объявлены в game.js, модели рисует hero3d.js. */
(function(){
'use strict';
const nav = document.getElementById('game-tools');
if(!nav) return;
const SHARD = '<svg class="sk-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#sensik-shard"></use></svg>';
const QUEST_ICON = '<svg class="qb-ico" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="qb-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".55" stop-color="#f0b429"/><stop offset="1" stop-color="#b9770e"/></linearGradient></defs>' +
  '<path d="M6 3h11a2 2 0 0 1 2 2v13a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V4a1 1 0 0 1 1-1z" fill="url(#qb-g)" stroke="#fff0c7" stroke-width="1"/>' +
  '<path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" stroke="#2a1a02" stroke-width="1.6" stroke-linecap="round"/></svg>';

const TABS = [['daily', 'Ежедневные'], ['life', 'Постоянные'], ['mega', 'Мега-задание']];
let tab = 'daily';
let busy = false;
let flash = '';
let flashTimer = 0;

/* Сутки считаются по Киеву — так же, как на сервере. */
function dayKey(){
  try { return new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Kyiv', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date()); }
  catch(err){ return new Date().toISOString().slice(0, 10); }
}
function fmt(n){ return String(Math.max(0, Math.floor(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); }
function el(tag, cls, text){ const e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }

/* ---------- кнопка в верхней панели ---------- */
const box = el('div'); box.id = 'quests-box'; box.hidden = true;
box.innerHTML = '<button id="quests-btn" type="button" aria-haspopup="dialog" aria-expanded="false" title="Задания: награды в Сенсиках">' + QUEST_ICON +
  '<span class="sk-col"><small>НАГРАДЫ</small><span class="qb-name">Задания</span></span></button>';
const dsBox = document.getElementById('dsplus-box');
if(dsBox) nav.insertBefore(box, dsBox); else nav.appendChild(box);
const btn = box.querySelector('#quests-btn');

/* ---------- окно ---------- */
const modal = el('section'); modal.id = 'quests-modal'; modal.hidden = true;
modal.innerHTML = '<div class="qm-panel" role="dialog" aria-modal="true" aria-labelledby="qm-title">' +
  '<button type="button" class="qm-x" aria-label="Закрыть">✕</button>' +
  '<div class="qm-head"><h2 id="qm-title">ЗАДАНИЯ</h2><span class="qm-bal">' + SHARD + '<b id="qm-bal">0</b></span></div>' +
  '<p class="qm-sub">Выполняй задания и получай Сенсики — на них покупаются скины, арканы и иммортал-предметы.</p>' +
  '<div class="qm-tabs" role="tablist"></div><div class="qm-body" id="qm-body"></div></div>';
document.body.appendChild(modal);
const tabsEl = modal.querySelector('.qm-tabs');
const bodyEl = modal.querySelector('#qm-body');
const balEl = modal.querySelector('#qm-bal');

function isOpen(){ return !modal.hidden; }
function openModal(){ modal.hidden = false; btn.setAttribute('aria-expanded', 'true'); render(); }
function closeModal(){ modal.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
btn.addEventListener('click', () => { if(isOpen()) closeModal(); else openModal(); });
modal.querySelector('.qm-x').addEventListener('click', closeModal);
modal.addEventListener('pointerdown', e => { if(e.target === modal) closeModal(); });
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && isOpen()){ e.stopPropagation(); e.preventDefault(); closeModal(); }
}, true);

/* ---------- данные профиля ---------- */
const profileOf = () => window.__shadowAccountProfile || null;

function dailyItems(p){
  const today = dayKey(), items = [];
  const d = p.daily;
  if(d){
    const fresh = d.day === today, target = d.target || 1;
    const progress = fresh ? Math.min(target, d.progress || 0) : 0, claimed = fresh && !!d.claimed;
    items.push({kind:'daily', id:d.id, title:d.title, desc:d.desc, reward:d.reward || 0, progress, target, claimed, ready:!claimed && progress >= target});
  }
  for(const q of (Array.isArray(p.quests) ? p.quests : [])){
    const fresh = q.day === today, target = q.target || 1;
    const progress = fresh ? Math.min(target, q.progress || 0) : 0, claimed = fresh && !!q.claimed;
    items.push({kind:'extra', id:q.id, title:q.title, desc:q.desc, reward:q.reward || 0, progress, target, claimed, ready:!claimed && progress >= target});
  }
  return items;
}
const lifeItems = p => (Array.isArray(p.life) ? p.life : []);
const readyCount = items => items.filter(i => i.ready).length;

/* ---------- отрисовка ---------- */
function rewardChip(n){ const r = el('span', 'qm-reward'); r.innerHTML = SHARD + '<b></b>'; r.lastChild.textContent = '+' + fmt(n); return r; }
function claimLabel(it){ return it.claimed ? 'ПОЛУЧЕНО ✓' : it.ready ? 'ЗАБРАТЬ +' + fmt(it.reward) : 'В ПРОЦЕССЕ'; }

function simpleCard(it){
  const card = el('div', 'qm-card' + (it.ready ? ' ready' : '') + (it.claimed ? ' done' : ''));
  const txt = el('div'); txt.appendChild(el('h3', '', it.title)); txt.appendChild(el('p', '', it.desc));
  card.appendChild(txt); card.appendChild(rewardChip(it.reward));
  const prog = el('div', 'qm-prog'), bar = el('div', 'qm-bar'), fill = el('i');
  fill.style.width = Math.round(Math.min(1, it.progress / it.target) * 100) + '%'; bar.appendChild(fill);
  prog.appendChild(bar); prog.appendChild(el('span', 'qm-cnt', fmt(it.progress) + ' / ' + fmt(it.target)));
  card.appendChild(prog);
  const b = el('button', 'qm-btn', claimLabel(it)); b.type = 'button'; b.disabled = !it.ready || busy;
  b.addEventListener('click', () => claim(it));
  card.appendChild(b);
  return card;
}

function megaCard(q){
  const card = el('div', 'qm-card qm-mega' + (q.ready ? ' ready' : '') + (q.claimed ? ' done' : ''));
  const txt = el('div'); txt.appendChild(el('div', 'qm-eyebrow', 'МЕГА-ЗАДАНИЕ · ОДИН РАЗ ЗА ВСЁ ВРЕМЯ'));
  txt.appendChild(el('h3', '', q.title)); txt.appendChild(el('p', '', q.desc));
  card.appendChild(txt); card.appendChild(rewardChip(q.reward));
  let sum = 0, tot = 0;
  for(const part of q.parts){
    sum += Math.min(part.target, part.progress); tot += part.target;
    const row = el('div', 'qm-prog');
    const lab = el('div', 'qm-part-l'); lab.appendChild(el('span', '', part.label));
    lab.appendChild(el('b', '', fmt(part.progress) + ' / ' + fmt(part.target) + (part.progress >= part.target ? ' ✓' : '')));
    lab.style.gridColumn = '1 / -1'; row.appendChild(lab);
    const bar = el('div', 'qm-bar'), fill = el('i'); fill.style.width = Math.round(Math.min(1, part.progress / part.target) * 100) + '%'; bar.appendChild(fill);
    bar.style.gridColumn = '1 / -1'; row.appendChild(bar);
    card.appendChild(row);
  }
  const total = el('p', '', 'Общий прогресс: ' + Math.round(sum / tot * 100) + '%'); total.style.gridColumn = '1 / -1'; card.appendChild(total);
  const b = el('button', 'qm-btn', q.claimed ? 'ПОЛУЧЕНО ✓' : q.ready ? 'ЗАБРАТЬ +' + fmt(q.reward) + ' СЕНСИКОВ' : 'В ПРОЦЕССЕ'); b.type = 'button'; b.disabled = !q.ready || busy;
  b.addEventListener('click', () => claim({kind:'life', id:q.id, reward:q.reward, mega:true}));
  card.appendChild(b);
  return card;
}

function render(){
  const p = profileOf();
  box.hidden = !p;
  if(!p){ box.classList.remove('has-ready'); if(isOpen()) closeModal(); return; }
  const daily = dailyItems(p), life = lifeItems(p);
  const normal = life.filter(q => !q.mega), mega = life.find(q => q.mega) || null;
  const counts = {daily: readyCount(daily), life: readyCount(normal), mega: mega && mega.ready ? 1 : 0};
  box.classList.toggle('has-ready', counts.daily + counts.life + counts.mega > 0);
  if(!isOpen()) return;

  balEl.textContent = fmt(p.shards);
  tabsEl.textContent = '';
  for(const [id, label] of TABS){
    const t = el('button', 'qm-tab' + (tab === id ? ' on' : '') + (id === 'mega' ? ' mega' : ''), label);
    t.type = 'button'; t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', String(tab === id));
    if(counts[id]) t.appendChild(el('span', 'qm-dot', String(counts[id])));
    t.addEventListener('click', () => { tab = id; render(); });
    tabsEl.appendChild(t);
  }
  const keep = bodyEl.scrollTop;
  bodyEl.textContent = '';
  if(flash) bodyEl.appendChild(el('p', 'qm-flash', flash));
  if(tab === 'daily'){
    bodyEl.appendChild(el('p', 'qm-note', 'Обновляются каждый день в 00:00 по Киеву. Прогресс считается по итогам матчей.'));
    if(daily.length) daily.forEach(it => bodyEl.appendChild(simpleCard(it)));
    else bodyEl.appendChild(el('div', 'qm-empty', 'Нет данных о заданиях. Перезайди в аккаунт.'));
  } else if(tab === 'life'){
    bodyEl.appendChild(el('p', 'qm-note', 'Каждое задание выполняется один раз за всё время. Прогресс идёт по всей твоей статистике — победы и убийства, которые у тебя уже есть, тоже считаются.'));
    if(normal.length) normal.forEach(it => bodyEl.appendChild(simpleCard({kind:'life', id:it.id, title:it.title, desc:it.desc, reward:it.reward, progress:it.parts[0].progress, target:it.parts[0].target, claimed:it.claimed, ready:it.ready})));
    else bodyEl.appendChild(el('div', 'qm-empty', 'Постоянные задания пока недоступны. Обнови страницу и войди в аккаунт заново.'));
  } else {
    if(mega) bodyEl.appendChild(megaCard(mega));
    else bodyEl.appendChild(el('div', 'qm-empty', 'Мега-задание пока недоступно. Обнови страницу и войди в аккаунт заново.'));
  }
  bodyEl.scrollTop = keep;
}

/* ---------- получение награды ---------- */
async function claim(it){
  if(busy || typeof account === 'undefined' || !account || !account.token) return;
  busy = true; render();
  try {
    const payload = {token: account.token};
    let name = 'claimlife';
    if(it.kind === 'daily') name = 'claimdaily';
    else if(it.kind === 'extra'){ name = 'claimquest'; payload.questId = it.id; }
    else payload.questId = it.id;
    const data = await accountApi(name, payload);
    account.profile = data.profile;
    accountStore(ACCOUNT_PROFILE_KEY, JSON.stringify(data.profile));
    renderAccountModal();            /* разошлёт shadow:profile: обновится счётчик Сенсиков и этот экран */
    if(data.claimed && it.mega){
      flash = 'МЕГА-ЗАДАНИЕ ВЫПОЛНЕНО! +' + fmt(it.reward) + ' СЕНСИКОВ';
      clearTimeout(flashTimer); flashTimer = setTimeout(() => { flash = ''; render(); }, 6000);
    }
  } catch(err) {
    if(err && err.status === 401 && typeof accountSet === 'function') accountSet(null, null);
    else { flash = 'Не удалось получить награду. Попробуй ещё раз.'; clearTimeout(flashTimer); flashTimer = setTimeout(() => { flash = ''; render(); }, 4000); }
  } finally {
    busy = false; render();
  }
}

/* ---------- ссылка из панели «Сенсики» ---------- */
function addLink(){
  const panel = document.getElementById('sensiki-panel');
  if(!panel || panel.querySelector('.qm-link') || !panel.querySelector('.sk-reset')) return;
  const b = el('button', 'qm-link', 'ВСЕ ЗАДАНИЯ И МЕГА-ЗАДАНИЕ →'); b.type = 'button';
  b.addEventListener('click', () => { panel.hidden = true; const sb = document.getElementById('sensiki-btn'); if(sb) sb.setAttribute('aria-expanded', 'false'); openModal(); });
  panel.querySelector('.sk-reset').before(b);
}

window.addEventListener('shadow:profile', () => { render(); addLink(); });
render(); addLink();
setTimeout(() => { render(); addLink(); }, 1600);   /* на случай, если профиль подгрузился позже скрипта */
})();
