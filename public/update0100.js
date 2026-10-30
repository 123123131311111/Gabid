/* DotaSense 0.10.0 — «МАСТЕРСТВО ГЕРОЕВ».
   • 12 бойцов получили мастерство: 5 уровней, растут за победы на герое в любом режиме.
   • За каждый уровень — награда в Сенсиках (забирается вручную, по порядку).
   • Кнопка «МАСТЕРСТВО» в профиле героя (вкладка «Бойцы») открывает панель с уровнями и наградами.
   Баланс и прогресс хранит сервер (accounts.js); здесь только интерфейс. Подключается после update9907.js. */
(function(){
'use strict';
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update0100 ' + tag + ':', err); } catch(e) {} } };
let panelOpen = false, busy = false, msg = '', msgUntil = 0;

function cfg(){
  const p = window.__shadowAccountProfile;
  return p && p.masteryCfg && Array.isArray(p.masteryCfg.heroes) ? p.masteryCfg : null;
}
function stateOf(id){
  const p = window.__shadowAccountProfile, m = p && p.mastery && p.mastery[id];
  return {wins: (m && m.wins) || 0, claimed: (m && m.claimed) || 0};
}
function levelOf(id, c){ const w = stateOf(id).wins; let l = 0; c.wins.forEach((n, i) => { if(w >= n) l = i + 1; }); return l; }
function isMasteryHero(id){ const c = cfg(); return !!(c && c.heroes.includes(id)); }
function curDef(){ return (typeof HERO_DEFS !== 'undefined' && typeof selectedHeroIndex !== 'undefined') ? HERO_DEFS[selectedHeroIndex] : null; }

function btnRect(){
  const g = menuGuideBtnRect();
  return {x: g.x - 196, y: g.y, w: 190, h: g.h};
}
function panelRect(){
  const w = Math.min(520, VW - 30), h = Math.min(448, VH - 110);
  return {x: (VW - w) / 2, y: Math.max(70, (VH - h) / 2), w, h};
}
function closeRect(P){ return {x: P.x + P.w - 40, y: P.y + 10, w: 30, h: 30}; }
function rowRect(P, i){ const top = P.y + 128, rh = Math.floor((P.h - 128 - 16) / 5); return {x: P.x + 16, y: top + i * rh, w: P.w - 32, h: rh - 6}; }
function claimRect(R){ return {x: R.x + R.w - 118, y: R.y + (R.h - 30) / 2, w: 106, h: 30}; }
function inR(r, x, y){ return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
function rrect(x, y, w, h, r){
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}
function say(t){ msg = t; msgUntil = performance.now() + 2800; }

async function claim(id, level){
  if(busy || typeof account === 'undefined' || !account.token) return;
  busy = true;
  try {
    const data = await accountApi('claimmastery', {token: account.token, heroId: id, level});
    account.profile = data.profile;
    accountStore(ACCOUNT_PROFILE_KEY, JSON.stringify(data.profile));
    renderAccountModal();
    say(data.claimed ? '+' + data.reward + ' Сенсиков за уровень ' + level + '!' : 'Награда уже получена или уровень ещё не открыт');
  } catch(err) {
    if(err && err.status === 401 && typeof accountSet === 'function') accountSet(null, null);
    else say('Не удалось получить награду. Попробуй ещё раз.');
  } finally { busy = false; }
}

function drawPanel(def, c){
  const P = panelRect();
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.66)'; ctx.fillRect(0, 0, VW, VH);
  rrect(P.x, P.y, P.w, P.h, 14);
  const bg = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
  bg.addColorStop(0, '#1d1a14'); bg.addColorStop(1, '#0e0d0a');
  ctx.fillStyle = bg; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = def.color2 || '#d7b36a'; ctx.stroke();

  const st = stateOf(def.id), lvl = levelOf(def.id, c), max = c.wins.length;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = 'bold 12px Consolas, monospace'; ctx.fillStyle = '#d7b36a';
  ctx.fillText('МАСТЕРСТВО ГЕРОЯ', P.x + 20, P.y + 30);
  ctx.font = 'bold 28px Georgia, serif'; ctx.fillStyle = '#fff3cf';
  ctx.fillText(def.name, P.x + 20, P.y + 64);
  ctx.font = '13px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.fillText('Уровень ' + lvl + ' / ' + max + '  ·  побед на герое: ' + st.wins + '  ·  любой режим', P.x + 20, P.y + 88);

  /* общая полоса прогресса до следующего уровня */
  const next = lvl < max ? c.wins[lvl] : c.wins[max - 1];
  const prevN = lvl > 0 ? c.wins[lvl - 1] : 0;
  const frac = lvl >= max ? 1 : Math.max(0, Math.min(1, (st.wins - prevN) / (next - prevN)));
  const bx = P.x + 20, bw = P.w - 40;
  rrect(bx, P.y + 100, bw, 10, 5); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill();
  if(frac > 0){ rrect(bx, P.y + 100, Math.max(10, bw * frac), 10, 5); ctx.fillStyle = def.color2 || '#e8c984'; ctx.fill(); }

  const cl = closeRect(P);
  rrect(cl.x, cl.y, cl.w, cl.h, 7); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Segoe UI, Arial'; ctx.textAlign = 'center';
  ctx.fillText('✕', cl.x + cl.w / 2, cl.y + 21);

  for(let i = 0; i < max; i++){
    const R = rowRect(P, i), n = i + 1;
    const reached = st.wins >= c.wins[i], got = st.claimed >= n, ready = reached && !got && st.claimed === i;
    rrect(R.x, R.y, R.w, R.h, 9);
    ctx.fillStyle = got ? 'rgba(90,170,100,.16)' : ready ? 'rgba(232,201,132,.16)' : 'rgba(255,255,255,.05)'; ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = ready ? '#e8c984' : 'rgba(255,255,255,.12)'; ctx.stroke();
    ctx.textAlign = 'left'; ctx.fillStyle = reached ? '#fff3cf' : 'rgba(255,255,255,.45)';
    ctx.font = 'bold 17px Georgia, serif'; ctx.fillText('★'.repeat(n), R.x + 14, R.y + R.h / 2 - 2);
    ctx.font = '12px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillText('Уровень ' + n + '  ·  ' + c.wins[i] + ' ' + (c.wins[i] === 1 ? 'победа' : c.wins[i] < 5 ? 'победы' : 'побед') + '  ·  +' + c.rewards[i] + ' Сенсиков', R.x + 14, R.y + R.h / 2 + 16);
    const B = claimRect(R);
    drawMenuButton(B, got ? 'ПОЛУЧЕНО ✓' : ready ? 'ЗАБРАТЬ +' + c.rewards[i] : reached ? 'СНАЧАЛА ПРЕДЫДУЩИЙ' : (st.wins + ' / ' + c.wins[i]), {radius:7, fontSize:11, primary:ready, active:got});
  }

  if(performance.now() < msgUntil){
    ctx.textAlign = 'center'; ctx.font = 'bold 14px Segoe UI, Arial'; ctx.fillStyle = '#ffe08a';
    ctx.fillText(msg, P.x + P.w / 2, P.y + P.h - 4);
  }
  ctx.restore();
}

const _prevDetail = drawHeroDetail;
drawHeroDetail = function(def){
  _prevDetail.apply(this, arguments);
  try {
    const c = cfg();
    if(!c || !c.heroes.includes(def.id)){ panelOpen = false; return; }
    const lvl = levelOf(def.id, c), st = stateOf(def.id);
    const hasReady = st.claimed < lvl;
    drawMenuButton(btnRect(), (hasReady ? '❗ ' : '★ ') + 'МАСТЕРСТВО ' + lvl + '/' + c.wins.length, {radius:7, fontSize:13, active:panelOpen});
    if(panelOpen) drawPanel(def, c);
  } catch(err) { warn('draw', err); }
};

const _prevClick = handleMenuClick;
handleMenuClick = function(mx, my){
  try {
    if(menuStage === 'heroDetail'){
      const def = curDef(), c = cfg();
      if(def && c && c.heroes.includes(def.id)){
        if(panelOpen){
          const P = panelRect();
          if(inR(closeRect(P), mx, my) || !inR(P, mx, my)){ panelOpen = false; return; }
          const st = stateOf(def.id);
          for(let i = 0; i < c.wins.length; i++){
            const B = claimRect(rowRect(P, i));
            if(inR(B, mx, my)){
              if(st.claimed === i && st.wins >= c.wins[i]) claim(def.id, i + 1);
              return;
            }
          }
          return;
        }
        if(inR(btnRect(), mx, my)){ panelOpen = true; return; }
      } else if(inR(btnRect(), mx, my) && !cfg()){
        /* кнопка скрыта без аккаунта — клик по этому месту ничего не делает */
      }
    }
  } catch(err) { warn('click', err); }
  return _prevClick.apply(this, arguments);
};

window.addEventListener('keydown', e => { if(e.key === 'Escape' && panelOpen){ panelOpen = false; e.stopPropagation(); } }, true);
})();
