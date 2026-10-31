/* DotaSense 0.10.0 — «МАСТЕРСТВО ГЕРОЕВ».
   • все бойцы получили мастерство: 5 уровней, растут за победы на герое в любом режиме.
   • За каждый уровень — награда в Сенсиках (забирается вручную, по порядку).
   • Кнопка «МАСТЕРСТВО» в профиле героя (вкладка «Бойцы») открывает панель с уровнями и наградами.
   Дополнение: мастерство у ВСЕХ героев, красивая панель (портрет, значок уровня, шкала с отметками, анимация).
   Баланс и прогресс хранит сервер (accounts.js); здесь только интерфейс. Подключается после update9907.js. */
(function(){
'use strict';
const warn = (tag, err) => { if(!warn[tag]){ warn[tag] = 1; try { console.warn('update0100 ' + tag + ':', err); } catch(e) {} } };
let panelOpen = false, busy = false, msg = '', msgUntil = 0;

window.__dsMasteryOpen = () => panelOpen;
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
  const w = Math.min(580, VW - 30), h = Math.min(580, VH - 40);
  return {x: (VW - w) / 2, y: Math.max(20, (VH - h) / 2), w, h};
}
const HEAD_H = 172;
function closeRect(P){ return {x: P.x + P.w - 42, y: P.y + 12, w: 30, h: 30}; }
function rowRect(P, i){ const top = P.y + HEAD_H, rh = Math.floor((P.h - HEAD_H - 14) / 5); return {x: P.x + 16, y: top + i * rh, w: P.w - 32, h: rh - 7}; }
function claimRect(R){ return {x: R.x + R.w - 128, y: R.y + (R.h - 32) / 2, w: 116, h: 32}; }
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

let openAt = 0;
function rgba(hex, a){ try { return hexRgba(hex, a); } catch(e) { return 'rgba(215,179,106,' + a + ')'; } }
function star(x, y, r, fill, stroke){
  ctx.beginPath();
  for(let k = 0; k < 10; k++){
    const rr = k % 2 ? r * 0.45 : r, an = -Math.PI / 2 + k * Math.PI / 5;
    ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr);
  }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if(stroke){ ctx.lineWidth = 1; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function winsWord(n){ return n === 1 ? 'победа' : (n % 10 >= 2 && n % 10 <= 4 && (n < 10 || n > 20)) ? 'победы' : 'побед'; }

function drawPanel(def, c){
  const P = panelRect(), now = performance.now() / 1000;
  const t = Math.min(1, (performance.now() - openAt) / 260), e = 1 - Math.pow(1 - t, 3);
  const c1 = def.color || '#8899aa', c2 = def.color2 || '#d7b36a';
  const st = stateOf(def.id), lvl = levelOf(def.id, c), max = c.wins.length;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,' + (0.72 * e) + ')'; ctx.fillRect(0, 0, VW, VH);
  ctx.translate(0, (1 - e) * 24); ctx.globalAlpha = e;

  /* корпус панели */
  ctx.shadowColor = rgba(c2, .55); ctx.shadowBlur = 36;
  rrect(P.x, P.y, P.w, P.h, 18);
  const bg = ctx.createLinearGradient(0, P.y, 0, P.y + P.h);
  bg.addColorStop(0, '#26211a'); bg.addColorStop(.45, '#14120f'); bg.addColorStop(1, '#0a0908');
  ctx.fillStyle = bg; ctx.fill();
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.save();
  rrect(P.x, P.y, P.w, P.h, 18); ctx.clip();
  const glow = ctx.createRadialGradient(P.x + 100, P.y + 70, 8, P.x + 100, P.y + 70, P.w * .75);
  glow.addColorStop(0, rgba(c2, .30)); glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(P.x, P.y, P.w, HEAD_H + 40);
  const rib = ctx.createLinearGradient(P.x, 0, P.x + P.w, 0);
  rib.addColorStop(0, 'rgba(0,0,0,0)'); rib.addColorStop(.5, rgba(c2, 1)); rib.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rib; ctx.fillRect(P.x, P.y, P.w, 4);
  ctx.restore();
  const bd = ctx.createLinearGradient(P.x, P.y, P.x, P.y + P.h);
  bd.addColorStop(0, '#f2d58f'); bd.addColorStop(1, rgba(c2, .5));
  rrect(P.x, P.y, P.w, P.h, 18); ctx.lineWidth = 2; ctx.strokeStyle = bd; ctx.stroke();

  /* портрет героя */
  const pS = 104, px = P.x + 20, py = P.y + 24;
  ctx.save();
  rrect(px, py, pS, pS, 14); ctx.clip();
  ctx.fillStyle = rgba(c1, .28); ctx.fillRect(px, py, pS, pS);
  try { drawHeroTexture(def, px, py, pS, pS, now, false); } catch(err) { warn('tex', err); }
  const fd = ctx.createLinearGradient(0, py + pS * .6, 0, py + pS);
  fd.addColorStop(0, 'rgba(0,0,0,0)'); fd.addColorStop(1, 'rgba(8,8,12,.7)');
  ctx.fillStyle = fd; ctx.fillRect(px, py, pS, pS);
  ctx.restore();
  rrect(px, py, pS, pS, 14); ctx.lineWidth = 2.5; ctx.strokeStyle = rgba(c2, .95); ctx.stroke();

  /* значок уровня на портрете */
  const bx0 = px + pS - 6, by0 = py + pS - 6, pulse = 1 + Math.sin(now * 3) * 0.04;
  ctx.save(); ctx.translate(bx0, by0); ctx.scale(pulse, pulse);
  ctx.shadowColor = rgba('#ffd568', .8); ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2);
  const gb = ctx.createLinearGradient(0, -21, 0, 21); gb.addColorStop(0, '#ffe39a'); gb.addColorStop(1, '#c58a2a');
  ctx.fillStyle = gb; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = 2; ctx.strokeStyle = '#3a2808'; ctx.stroke();
  ctx.fillStyle = '#2b1c05'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px Georgia, serif'; ctx.fillText(String(lvl), 0, 1);
  ctx.restore();

  /* тексты */
  const tx = px + pS + 22;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = 'bold 11px Consolas, monospace'; ctx.fillStyle = '#d7b36a';
  ctx.fillText('МАСТЕРСТВО ГЕРОЯ', tx, py + 14);
  ctx.font = 'bold ' + (P.w < 460 ? 24 : 32) + 'px Georgia, serif';
  ctx.shadowColor = rgba(c2, .8); ctx.shadowBlur = 10; ctx.fillStyle = '#fff3cf';
  ctx.fillText(def.name, tx, py + 52); ctx.shadowBlur = 0;
  ctx.font = '12px Segoe UI, Arial'; ctx.fillStyle = rgba(c2, 1);
  ctx.fillText(String(def.title || '').toUpperCase(), tx, py + 72);
  ctx.font = '13px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.fillText('Уровень ' + lvl + ' из ' + max + '  ·  побед на герое: ' + st.wins, tx, py + 96);

  /* шкала прогресса с отметками уровней */
  const sx = P.x + 28, sw = P.w - 56, sy = P.y + 150;
  const total = c.wins[max - 1], fillW = sw * Math.min(1, st.wins / total);
  rrect(sx, sy - 5, sw, 10, 5); ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fill();
  if(fillW > 0){
    const pg = ctx.createLinearGradient(sx, 0, sx + sw, 0); pg.addColorStop(0, rgba(c2, .7)); pg.addColorStop(1, '#ffe39a');
    rrect(sx, sy - 5, Math.max(10, fillW), 10, 5); ctx.fillStyle = pg; ctx.fill();
  }
  for(let i = 0; i < max; i++){
    const nx = sx + sw * (c.wins[i] / total), done = st.wins >= c.wins[i];
    star(nx, sy, done ? 10 : 8, done ? '#ffd568' : '#2a2824', done ? '#fff3cf' : 'rgba(255,255,255,.3)');
    ctx.font = '10px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.fillStyle = done ? '#ffe9ad' : 'rgba(255,255,255,.4)';
    ctx.fillText(String(c.wins[i]), nx, sy + 22);
  }

  /* кнопка закрытия */
  const cl = closeRect(P);
  rrect(cl.x, cl.y, cl.w, cl.h, 8); ctx.fillStyle = 'rgba(255,255,255,.10)'; ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px Segoe UI, Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('✕', cl.x + cl.w / 2, cl.y + 21);

  /* строки наград */
  for(let i = 0; i < max; i++){
    const R = rowRect(P, i), n = i + 1;
    const reached = st.wins >= c.wins[i], got = st.claimed >= n, ready = reached && !got && st.claimed === i;
    const slide = Math.max(0, Math.min(1, (performance.now() - openAt) / 1000 * 3 - i * 0.18));
    ctx.save(); ctx.globalAlpha = ctx.globalAlpha * slide; ctx.translate((1 - slide) * 30, 0);
    if(ready){ ctx.shadowColor = rgba('#ffd568', .45 + Math.sin(now * 4) * .15); ctx.shadowBlur = 16; }
    rrect(R.x, R.y, R.w, R.h, 11);
    const rg = ctx.createLinearGradient(R.x, 0, R.x + R.w, 0);
    if(got){ rg.addColorStop(0, 'rgba(90,170,100,.22)'); rg.addColorStop(1, 'rgba(90,170,100,.06)'); }
    else if(ready){ rg.addColorStop(0, 'rgba(232,201,132,.28)'); rg.addColorStop(1, 'rgba(232,201,132,.07)'); }
    else { rg.addColorStop(0, 'rgba(255,255,255,.07)'); rg.addColorStop(1, 'rgba(255,255,255,.02)'); }
    ctx.fillStyle = rg; ctx.fill(); ctx.shadowBlur = 0;
    ctx.lineWidth = ready ? 1.6 : 1; ctx.strokeStyle = got ? 'rgba(110,200,120,.5)' : ready ? '#e8c984' : 'rgba(255,255,255,.12)'; ctx.stroke();

    /* медальон уровня */
    const mr = Math.min(20, R.h / 2 - 5), mx = R.x + 14 + mr, my = R.y + R.h / 2;
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.fillStyle = got ? '#3f8a4b' : reached ? '#c58a2a' : '#26241f'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = got ? '#8fe39c' : reached ? '#ffe39a' : 'rgba(255,255,255,.2)'; ctx.stroke();
    ctx.fillStyle = reached ? '#fff' : 'rgba(255,255,255,.4)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold ' + Math.round(mr * 0.95) + 'px Georgia, serif'; ctx.fillText(got ? '✓' : String(n), mx, my + 1);

    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const lx = mx + mr + 14;
    ctx.font = 'bold 15px Georgia, serif'; ctx.fillStyle = reached ? '#fff3cf' : 'rgba(255,255,255,.5)';
    ctx.fillText('Уровень ' + n, lx, R.y + R.h / 2 - 3);
    ctx.font = '12px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillText(c.wins[i] + ' ' + winsWord(c.wins[i]) + '  ·  ', lx, R.y + R.h / 2 + 15);
    const w1 = ctx.measureText(c.wins[i] + ' ' + winsWord(c.wins[i]) + '  ·  ').width;
    ctx.fillStyle = reached ? '#ffd568' : 'rgba(255,213,104,.5)'; ctx.font = 'bold 12px Segoe UI, Arial';
    ctx.fillText('+' + c.rewards[i] + ' Сенсиков', lx + w1, R.y + R.h / 2 + 15);

    const B = claimRect(R);
    drawMenuButton(B, got ? 'ПОЛУЧЕНО ✓' : ready ? 'ЗАБРАТЬ +' + c.rewards[i] : reached ? 'СНАЧАЛА ПРЕДЫДУЩИЙ' : (st.wins + ' / ' + c.wins[i]), {radius:8, fontSize:11, primary:ready, active:got});
    ctx.restore();
  }

  if(performance.now() < msgUntil){
    ctx.textAlign = 'center'; ctx.font = 'bold 14px Segoe UI, Arial'; ctx.fillStyle = '#ffe08a';
    ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
    ctx.fillText(msg, P.x + P.w / 2, P.y + P.h - 3);
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
        if(inR(btnRect(), mx, my)){ panelOpen = true; openAt = performance.now(); return; }
      } else if(inR(btnRect(), mx, my) && !cfg()){
        /* кнопка скрыта без аккаунта — клик по этому месту ничего не делает */
      }
    }
  } catch(err) { warn('click', err); }
  return _prevClick.apply(this, arguments);
};

window.addEventListener('keydown', e => { if(e.key === 'Escape' && panelOpen){ panelOpen = false; e.stopPropagation(); } }, true);
})();
