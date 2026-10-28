/* DotaSense 0.9.7.9 — «СЕНСИКИ»: валюта-осколки (+500 за победу), счётчик справа сверху и ежедневное задание.
   Подключается поверх game.js. Баланс и прогресс хранит сервер (accounts.js); здесь только интерфейс. */
(function(){
'use strict';
const SHARD_ICON = '<svg class="sk-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#sensik-shard"></use></svg>';
const box = document.getElementById('sensiki-box');
if(!box) return;
const btn = document.getElementById('sensiki-btn');
const panel = document.getElementById('sensiki-panel');
const amountEl = document.getElementById('sensiki-amount');
let lastShards = null;
let busy = false;

/* Сутки считаются по Киеву — так же, как на сервере. */
function dayKey(){
  try { return new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Kyiv', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date()); }
  catch(err){ return new Date().toISOString().slice(0, 10); }
}
function fmt(n){ return String(Math.max(0, Math.floor(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0'); }

function questOf(profile){
  const d = (profile && profile.daily) || null;
  if(!d) return null;
  const fresh = d.day === dayKey();
  const target = d.target || 10;
  const progress = fresh ? Math.min(target, d.progress || 0) : 0;
  const claimed = fresh && !!d.claimed;
  return {title:d.title, desc:d.desc, target, reward:d.reward || 0, progress, claimed, ready:!claimed && progress >= target};
}

function toast(text){
  const t = document.createElement('div');
  t.className = 'sensiki-toast';
  t.innerHTML = SHARD_ICON + '<span></span>';
  t.lastChild.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3200);
}

function renderPanel(profile, q){
  const claimLabel = q.claimed ? 'ПОЛУЧЕНО ✓' : q.ready ? 'ЗАБРАТЬ +' + q.reward : 'В ПРОЦЕССЕ';
  const pct = Math.round(q.progress / q.target * 100);
  panel.innerHTML =
    '<div class="sk-head"><span>СЕНСИКИ</span><b>' + SHARD_ICON + fmt(profile.shards) + '</b></div>' +
    '<p class="sk-note">Осколки силы. За каждую победу в матче — <b>+500</b>.</p>' +
    '<div class="sk-quest' + (q.ready ? ' ready' : '') + (q.claimed ? ' done' : '') + '">' +
      '<div class="sk-quest-title"><span>ЕЖЕДНЕВНОЕ ЗАДАНИЕ</span><em>' + SHARD_ICON + '+' + q.reward + '</em></div>' +
      '<strong></strong><small></small>' +
      '<div class="sk-bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="sk-count">' + q.progress + ' / ' + q.target + '</div>' +
      '<button type="button" id="sensiki-claim"' + (q.ready ? '' : ' disabled') + '>' + claimLabel + '</button>' +
    '</div>' +
    '<p class="sk-reset">Задание обновляется каждый день в 00:00 по Киеву.</p>';
  panel.querySelector('.sk-quest strong').textContent = q.title;
  panel.querySelector('.sk-quest small').textContent = q.desc;
  const claim = document.getElementById('sensiki-claim');
  claim.addEventListener('click', claimReward);
}

function render(){
  const profile = window.__shadowAccountProfile;
  if(!profile){ box.hidden = true; panel.hidden = true; lastShards = null; return; }
  box.hidden = false;
  const shards = Math.max(0, Math.floor(profile.shards || 0));
  amountEl.textContent = fmt(shards);
  if(lastShards !== null && shards > lastShards){
    toast('+' + fmt(shards - lastShards) + ' Сенсиков');
    box.classList.remove('gain'); void box.offsetWidth; box.classList.add('gain');
  }
  lastShards = shards;
  const q = questOf(profile);
  box.classList.toggle('has-ready', !!(q && q.ready));
  if(q) renderPanel(profile, q);
}

async function claimReward(){
  if(busy || typeof account === 'undefined' || !account.token) return;
  busy = true;
  const claim = document.getElementById('sensiki-claim');
  if(claim) claim.disabled = true;
  try {
    const data = await accountApi('claimdaily', {token: account.token});
    account.profile = data.profile;
    accountStore(ACCOUNT_PROFILE_KEY, JSON.stringify(data.profile));
    renderAccountModal();            /* разошлёт shadow:profile и обновит наш виджет */
  } catch(err) {
    if(err && err.status === 401 && typeof accountSet === 'function') accountSet(null, null);
    else toast('Не удалось получить награду. Попробуй ещё раз.');
  } finally {
    busy = false;
    render();
  }
}

btn.addEventListener('click', () => {
  panel.hidden = !panel.hidden;
  btn.setAttribute('aria-expanded', String(!panel.hidden));
});
document.addEventListener('pointerdown', e => {
  if(!panel.hidden && !box.contains(e.target)){ panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
});
document.addEventListener('keydown', e => {
  if(e.key === 'Escape' && !panel.hidden){ panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
});

/* Баланс в карточке профиля */
function renderProfileLine(){
  const info = document.querySelector('#acc-user .acc-info');
  if(!info) return;
  let line = document.getElementById('acc-shards');
  if(!line){ line = document.createElement('span'); line.id = 'acc-shards'; line.className = 'acc-shards'; info.appendChild(line); }
  const profile = window.__shadowAccountProfile;
  line.innerHTML = SHARD_ICON + '<b></b>';
  line.lastChild.textContent = 'Сенсики: ' + fmt(profile && profile.shards);
}

window.addEventListener('shadow:profile', () => { render(); renderProfileLine(); });
render(); renderProfileLine();
/* Если профиль подгрузился раньше нашего скрипта или после — подстрахуемся. */
setTimeout(() => { render(); renderProfileLine(); }, 1500);
})();
