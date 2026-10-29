/* DotaSense 0.9.8.1.1 — «ДОТАСЕНС +»: контрпики и гайд по закупу (0.9.8.1.1: живые подсказки в драфте, все герои, красивое меню).
   Подключается поверх game.js, читает HERO_DEFS / HERO_GUIDES / SHOP_ITEMS и состояние матча;
   игровую покупку выполняет сам магазин, помощник только открывает его по кнопке. */
(function(){
'use strict';
/* 0.9.8.6: активация за 1000 Сенсиков (навсегда, хранится на сервере). Клиент только показывает состояние. */
const DSPLUS_PRICE = 1000;
const profileNow = () => window.__shadowAccountProfile || null;
const owned = () => { const p = profileNow(); return !!(p && p.dsPlus === true); };
const fmtN = n => String(Math.max(0, Math.floor(n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
const SHARD = '<svg class="sk-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#sensik-shard"></use></svg>';
let buying = false, buyError = '';
const mmss = sec => { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); };
const box = document.getElementById('dsplus-box');
if(!box) return;
const btn = document.getElementById('dsplus-btn');
const panel = document.getElementById('dsplus-panel');

/* ===== ДАННЫЕ: 10 героев, которых знает Дотасенс + =====
   w = как герой играет против типа врага (−2…+2): ближний / дальний / танк / хрупкий.
   Это экспертные оценки — их можно спокойно править. */
const DS = {
  pyro:       {w:{melee:1, ranged:-1, tank:1,  squishy:1},  tip:'Магия игнорирует броню, Волна пламени отгоняет ближников. Держи дистанцию.'},
  warlord:    {w:{melee:0, ranged:2,  tank:-1, squishy:1},  tip:'Рывок сокращает дистанцию до стрелков. Против брони урона не хватает.'},
  grisha:     {w:{melee:1, ranged:0,  tank:1,  squishy:0},  tip:'Универсал: подбирай заклинание под врага. Хрупок — не лезь первым.'},
  golly:      {w:{melee:2, ranged:-1, tank:0,  squishy:1},  tip:'Заморозка и отброс не дают ближникам добежать. Дальних лучше держать под контролем.'},
  sasych:     {w:{melee:0, ranged:1,  tank:-1, squishy:2},  tip:'Убийца хрупких: Разрыв не даёт убежать. Против брони и танков слаб.'},
  ilya:       {w:{melee:1, ranged:2,  tank:0,  squishy:0},  tip:'Крюк притягивает стрелков, аура давит ближников. Медленный — вовремя бери сапоги.'},
  malit:      {w:{melee:1, ranged:1,  tank:1,  squishy:0},  tip:'Оглушение и подброс решают драку. Лазерный круг силён в тесноте.'},
  arcady:     {w:{melee:1, ranged:-1, tank:0,  squishy:2},  tip:'Стреляет издалека и кайтит ближних. Ближайшего ассасина нужно отгонять.'},
  sniper:     {w:{melee:1, ranged:-2, tank:0,  squishy:2},  tip:'Дальность и урон, но очень мало HP. Не выходи вперёд команды.'},
  juggernaut: {w:{melee:1, ranged:1,  tank:2,  squishy:-1}, tip:'Blade Fury даёт иммунитет к магии, Omnislash добивает. Силён против танков.'}
};
const DS_IDS = Object.keys(DS);
const autoCache = {};
/* Герои без ручной оценки получают профиль по типу атаки и запасу здоровья. */
function dsOf(id){
  if(DS[id]) return DS[id];
  if(autoCache[id]) return autoCache[id];
  const d = defById(id) || {}, tg = tagsOf(d), ranged = tg.includes('ranged'), tank = tg.includes('tank'), sq = tg.includes('squishy');
  const w = {melee:0, ranged:0, tank:0, squishy:0};
  if(ranged){ w.melee += 1; w.squishy += 1; }
  else { w.tank += 1; w.squishy += 1; }
  if(tank){ w.melee += 1; w.ranged += 1; w.squishy -= 1; }
  if(sq){ w.melee -= 1; w.ranged += ranged ? 0 : -1; }
  const tip = (d.title ? d.title + '. ' : '') + (ranged ? 'Дальний боец: держи дистанцию и бей из-за спин.' : 'Ближний боец: ищи вход в драку и не отрывайся от команды.') +
    (tank ? ' Много здоровья — можно начинать бой.' : sq ? ' Мало здоровья — береги себя от фокуса.' : '');
  return (autoCache[id] = {w, tip});
}
const allIds = () => (typeof HERO_DEFS !== 'undefined' ? HERO_DEFS.map(d => d.id) : DS_IDS);

/* ===== Вспомогательное ===== */
const TAG_RU = {melee:'ближний', ranged:'дальний', tank:'танк', squishy:'хрупкий'};
const defById = id => (typeof HERO_DEFS !== 'undefined' ? HERO_DEFS.find(d => d.id === id) : null);
const itemName = id => (typeof SHOP_ITEMS !== 'undefined' && SHOP_ITEMS[id] && SHOP_ITEMS[id].name) || id;
const itemCost = id => { const it = typeof SHOP_ITEMS !== 'undefined' ? SHOP_ITEMS[id] : null; return it ? (it.totalCost || it.cost || 0) : 0; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const safeColor = color => /^#[0-9a-f]{3,8}$/i.test(String(color || '')) ? color : '#c6a35b';
const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
const creatorBuildOf = id => typeof CREATOR_BUILDS !== 'undefined' ? CREATOR_BUILDS[id] || null : null;
function tagsOf(def){
  if(!def) return [];
  const t = [def.atkRange > 250 ? 'ranged' : 'melee'];
  if(def.baseHp >= 950) t.push('tank');
  if(def.baseHp <= 700) t.push('squishy');
  return t;
}
function inMatch(){ return typeof gameState !== 'undefined' && gameState === 'playing' && typeof playerHero !== 'undefined' && !!playerHero; }
function inDraft(){ return typeof menuStage !== 'undefined' && menuStage === 'draft' && typeof draftBotIndices !== 'undefined' && !inMatch(); }

/* Враги/союзники из драфта: порядок слотов задан в startGame(). */
function draftTeams(){
  const e = [0,3,4,6].map(i => draftBotIndices[i]).filter(i => i >= 0).map(i => HERO_DEFS[i] && HERO_DEFS[i].id).filter(Boolean);
  const a = [1,2,5].map(i => draftBotIndices[i]).filter(i => i >= 0).map(i => HERO_DEFS[i] && HERO_DEFS[i].id).filter(Boolean);
  return {enemies:e, allies:a};
}

/* ===== Контрпик ===== */
function counterPicks(enemyIds, allyIds){
  const enemies = enemyIds.map(defById).filter(Boolean);
  const allies = (allyIds || []).map(defById).filter(Boolean);
  const allyTank = allies.some(d => tagsOf(d).includes('tank'));
  const allyRanged = allies.some(d => d.atkRange > 250);
  const drafting = inDraft();
  return allIds().map(id => {
    const def = defById(id); if(!def) return null;
    const hi = HERO_DEFS.indexOf(def);
    if(drafting && hi !== draftPlayerIndex && typeof draftPlayerBlocked === 'function' && draftPlayerBlocked(hi)) return null;   /* уже занят */
    const prof = dsOf(id);
    let score = 0; const good = [], bad = [];
    enemies.forEach(e => {
      let s = 0; tagsOf(e).forEach(t => { s += prof.w[t] || 0; });
      score += s;
      if(s >= 2) good.push(e.name); else if(s <= -2) bad.push(e.name);
    });
    const mine = tagsOf(def);
    const notes = [];
    if(allies.length && !allyTank && mine.includes('tank')) { score += 1.5; notes.push('в команде нет танка'); }
    if(allies.length && !allyRanged && def.atkRange > 250) { score += 1; notes.push('нужен дальний урон'); }
    if(allies.some(a => a.id === id)) { score -= 1; notes.push('такой герой уже есть у союзников'); }
    return {id, def, score, good, bad, notes, hi};
  }).filter(Boolean).sort((a, b) => b.score - a.score);
}

/* ===== Совет по предметам ===== */
function itemAdvice(heroId, enemyIds, live){
  const def = defById(heroId);
  const guide = (typeof HERO_GUIDES !== 'undefined' && HERO_GUIDES[heroId]) || null;
  const hero = live ? playerHero : null;
  const owned = id => !!(hero && typeof heroHasItem === 'function' && heroHasItem(hero, id));
  const coins = hero ? Math.floor(hero.coins || 0) : null;
  const enemies = enemyIds.map(defById).filter(Boolean);
  const cnt = {melee:0, ranged:0, tank:0, squishy:0};
  enemies.forEach(e => tagsOf(e).forEach(t => cnt[t]++));
  const me = tagsOf(def);
  const rows = [];
  const push = (id, why) => { if(!rows.some(r => r.id === id) && !owned(id) && typeof SHOP_ITEMS !== 'undefined' && SHOP_ITEMS[id]) rows.push({id, why}); };

  /* 1. Срочное по состоянию героя */
  if(hero && !hero.dead){
    if(hero.hp / hero.maxHp < 0.4) push('timurPillow', 'Мало здоровья — отойди и подлечись (урон прерывает лечение).');
    if(hero.maxMp && hero.mp / hero.maxMp < 0.25) push('mango', 'Мало маны — манго вернёт 100.');
  }
  /* 2. Следующий предмет по гайду */
  const next = guide ? guide.build.find(id => !owned(id) && typeof SHOP_ITEMS !== 'undefined' && SHOP_ITEMS[id]) : null;
  if(next) push(next, 'Следующий предмет по сборке героя.');
  /* 3. Ситуативное под состав врагов */
  if(enemies.length){
    if(cnt.melee >= 3 && me.includes('squishy')) push('bkb', 'Много ближних бойцов: БКБ режет урон атак на 60% и снимает оглушение.');
    if(cnt.ranged >= 3) push('evsyutin', 'Много дальних бойцов: +500 здоровья помогает пережить фокус.');
    if(cnt.tank >= 2) push('dagonEmpire', 'Несколько танков: магический урон 1200 игнорирует броню.');
    if(cnt.squishy >= 2 && me.includes('melee')) push('tornBrainHand', 'Хрупкие враги: телепорт к цели и 350 урона добивают их.');
    if(cnt.squishy >= 2 && !me.includes('melee')) push('brainEye', 'Хрупкие враги: +210 дальности — бей раньше, чем они подойдут.');
    if(enemies.length >= 3) push('satanic', 'Затяжные драки: +660 HP и вампиризм.');
    push('ilyaHair', 'Оглушение выбранного врага на 4 сек. — выключай главную угрозу.');
  }
  /* 4. Ранняя игра */
  if(live && typeof gameTime !== 'undefined' && gameTime < 240) push('tango', 'Ранняя игра: танго лечит и экономит золото.');

  return {rows: rows.slice(0, 5), coins, guide, def};
}

/* ===== Отрисовка ===== */
let tab = 'counter';          // counter | battle | heroes
let manualEnemies = [];       // для режима вне драфта
let pickedHero = DS_IDS[0];   // выбранный герой во вкладке «Герои»
let lastSig = '';

function heroChips(selected, onlyIds, kind){
  const ids = onlyIds || (typeof HERO_DEFS !== 'undefined' ? HERO_DEFS.map(d => d.id) : []);
  return '<div class="dsp-hero-grid">' + ids.map(id => {
    const d = defById(id); if(!d) return '';
    return '<button type="button" class="dsp-hero-chip' + (selected.includes(id) ? ' on' : (kind === 'enemy' && selected.length >= 4 ? ' full' : '')) + '" data-kind="' + kind + '" data-id="' + id + '" aria-pressed="' + selected.includes(id) + '">' +
      '<span class="dsp-hero-mark" style="--hero-color:' + safeColor(d.color) + '">' + esc(initials(d.name)) + '</span><span>' + esc(d.name) + '</span></button>';
  }).join('') + '</div>';
}
function itemTile(id, index, hero, compact){
  const item = typeof SHOP_ITEMS !== 'undefined' ? SHOP_ITEMS[id] : null;
  if(!item) return '';
  const owned = hero && typeof heroHasItem === 'function' && heroHasItem(hero, id);
  const cost = itemCost(id);
  return '<div class="dsp-item-tile' + (owned ? ' owned' : '') + (compact ? ' compact' : '') + '" title="' + esc(item.desc || item.name) + '">' +
    '<span class="dsp-item-step">' + (index + 1) + '</span>' +
    '<span class="dsp-item-icon" style="--item-color:' + safeColor(item.color) + '">' + esc(item.icon || '◇') + '</span>' +
    '<span class="dsp-item-name">' + esc(item.name) + '</span>' +
    '<span class="dsp-item-cost"><i aria-hidden="true">●</i> ' + (cost ? cost : '—') + '</span>' +
    (owned ? '<span class="dsp-item-owned">ЕСТЬ</span>' : '') + '</div>';
}
function pickRows(list, n){
  return list.slice(0, n).map((c, i) => {
    let why = dsOf(c.id).tip;
    const extra = [];
    if(c.good.length) extra.push('<span class="ok">контрит: ' + esc(c.good.join(', ')) + '</span>');
    if(c.bad.length) extra.push('<span class="no">осторожно: ' + esc(c.bad.join(', ')) + '</span>');
    if(c.notes.length) extra.push('<span class="info">' + esc(c.notes.join(', ')) + '</span>');
    const rank = Math.max(6, Math.min(100, 52 + c.score * 7));
    return '<article class="dsp-pick-card' + (i === 0 ? ' top' : '') + '">' +
      '<div class="dsp-pick-portrait" style="--hero-color:' + safeColor(c.def.color) + '"><span>' + esc(initials(c.def.name)) + '</span><small>' + (i + 1) + '</small></div>' +
      '<div class="dsp-pick-info"><div class="dsp-pick-heading"><b>' + esc(c.def.name) + '</b><span class="dsp-pick-score">' + (c.score > 0 ? '+' : '') + c.score.toFixed(1) + '</span></div>' +
      '<span class="dsp-pick-subtitle">' + esc(c.def.title) + '</span><div class="dsp-pick-meter"><i style="width:' + rank + '%"></i></div>' +
      (extra.length ? '<div class="dsp-tags">' + extra.join(' ') + '</div>' : '') + '<small>' + esc(why) + '</small></div></article>';
  }).join('');
}

/* ===== Живой драфт ===== */
function liveBar(){
  const t = typeof draftTime === 'number' ? Math.max(0, Math.ceil(draftTime)) : 0;
  const pct = Math.max(0, Math.min(100, t / 30 * 100));
  return '<div class="dsp-live"><span class="dsp-live-dot"></span><b>LIVE</b><span>идёт выбор героев</span><em>' + t + ' с</em><i style="width:' + pct + '%"></i></div>';
}
function myPickCard(ranked){
  if(typeof draftPlayerIndex === 'undefined' || draftPlayerIndex < 0) return '<div class="dsp-mine"><span class="dsp-eyebrow">ВАШ ВЫБОР</span><b>Герой ещё не выбран</b><small>Берите героя из списка ниже — оценка появится сразу.</small></div>';
  const d = HERO_DEFS[draftPlayerIndex]; if(!d) return '';
  const pos = ranked.findIndex(c => c.id === d.id), me = ranked[pos], best = ranked[0];
  const verdict = pos < 0 ? 'нет данных' : pos === 0 ? 'лучший контрпик!' : pos < 3 ? 'хороший выбор' : pos < Math.ceil(ranked.length / 2) ? 'нормально' : 'рискованно';
  const cls = pos === 0 ? 'great' : pos < 3 ? 'good' : pos < Math.ceil(ranked.length / 2) ? 'mid' : 'bad';
  let why = '';
  if(me){ if(me.good.length) why += 'контрит: ' + me.good.join(', ') + '. '; if(me.bad.length) why += 'осторожно: ' + me.bad.join(', ') + '. '; }
  if(best && best.id !== d.id) why += 'Лучше взять: ' + best.def.name + ' (' + (best.score > 0 ? '+' : '') + best.score.toFixed(1) + ').';
  return '<div class="dsp-mine ' + cls + '"><span class="dsp-eyebrow">ВАШ ВЫБОР</span><div class="dsp-mine-row"><span class="dsp-hero-mark" style="--hero-color:' + safeColor(d.color) + '">' + esc(initials(d.name)) + '</span><b>' + esc(d.name) + '</b><em>' + verdict + '</em></div>' + (why ? '<small>' + esc(why) + '</small>' : '') + '</div>';
}
function answersBlock(enemyDefs, allies){
  if(!enemyDefs.length) return '';
  const rows = enemyDefs.map(e => {
    const top = counterPicks([e.id], allies)[0]; if(!top) return '';
    return '<div class="dsp-answer"><span class="dsp-hero-mark" style="--hero-color:' + safeColor(e.color) + '">' + esc(initials(e.name)) + '</span><span class="dsp-answer-vs">' + esc(e.name) + '</span><i>→</i><span class="dsp-hero-mark" style="--hero-color:' + safeColor(top.def.color) + '">' + esc(initials(top.def.name)) + '</span><b>' + esc(top.def.name) + '</b></div>';
  }).join('');
  return '<div class="dsp-section-heading"><span>ОТВЕТ НА КАЖДОГО ВРАГА</span></div><div class="dsp-answers">' + rows + '</div>';
}

function renderCounter(){
  let enemies, allies, auto = false;
  if(inDraft()){ const t = draftTeams(); enemies = t.enemies; allies = t.allies; auto = true; }
  else if(inMatch()){ enemies = heroes.filter(h => h.team !== playerHero.team).map(h => h.def.id); allies = heroes.filter(h => h.team === playerHero.team && h !== playerHero).map(h => h.def.id); auto = true; }
  else { enemies = manualEnemies; allies = []; }
  const enemyDefs = enemies.map(defById).filter(Boolean);
  const drafting = inDraft();
  let html = (drafting ? liveBar() : '') + '<div class="dsp-context"><span>' + (inDraft() ? 'СТАДИЯ ВЫБОРА' : inMatch() ? 'СОСТАВ ПРОТИВНИКА' : 'РУЧНОЙ ВЫБОР') + '</span><small>' + enemyDefs.length + ' / 4 врага</small></div>' +
    '<p class="dsp-note">' + (inDraft() ? 'Состав считывается прямо из драфта и пересчитывается после каждого выбора.' : auto ? 'Составы команд обновляются автоматически.' : 'Отметь до четырёх вражеских героев — рейтинг обновится сразу.') + '</p>';
  if(!auto){
    html += '<div class="dsp-slots">' + [0,1,2,3].map(i => {
      const d = defById(manualEnemies[i]);
      return d ? '<button type="button" class="dsp-slot" data-kind="enemy" data-id="' + d.id + '" title="Убрать"><span class="dsp-hero-mark" style="--hero-color:' + safeColor(d.color) + '">' + esc(initials(d.name)) + '</span><span>' + esc(d.name) + '</span></button>'
               : '<div class="dsp-slot"><span>Слот ' + (i + 1) + '</span></div>';
    }).join('') + '</div>' +
    '<div class="dsp-section-heading"><span>ВРАЖЕСКИЕ ГЕРОИ</span>' + (manualEnemies.length ? '<button type="button" class="dsp-reset" data-act="reset">СБРОСИТЬ</button>' : '<small>ВЫБЕРИ ДО 4</small>') + '</div>' +
    heroChips(manualEnemies, null, 'enemy');
  }
  else html += '<div class="dsp-enemy-strip">' + (enemyDefs.length ? enemyDefs.map(d =>
    '<div class="dsp-enemy-card"><span class="dsp-hero-mark" style="--hero-color:' + safeColor(d.color) + '">' + esc(initials(d.name)) + '</span><span>' + esc(d.name) + '</span><small>' + tagsOf(d).map(t => TAG_RU[t]).join(' · ') + '</small></div>'
  ).join('') : '<div class="dsp-draft-empty"><span>?</span><b>Ждём пик соперника</b><small>Подбор появится сразу после выбора героя</small></div>') + '</div>';
  if(!enemyDefs.length) return html + '<div class="dsp-empty-hint">Подсказки строятся по пикам соперника и выбранным союзникам.</div>';
  const ranked = counterPicks(enemyDefs.map(d => d.id), allies);
  if(drafting) html += myPickCard(ranked) + answersBlock(enemyDefs, allies);
  html += '<div class="dsp-section-heading"><span>ЛУЧШИЕ КОНТРПИКИ</span><small>' + (drafting ? 'ОБНОВЛЯЕТСЯ LIVE' : 'ОЦЕНКА ПО СОСТАВУ') + '</small></div>' +
    '<div class="dsp-pick-list">' + pickRows(ranked, drafting ? 4 : auto ? 3 : 5) + '</div>';
  html += '<p class="dsp-foot">Оценка учитывает тип атаки, запас здоровья и баланс своей команды.</p>';
  return html;
}

/* ===== Экран активации ===== */
function renderLocked(){
  const p = profileNow(), shards = p ? Math.max(0, Math.floor(p.shards || 0)) : 0, need = Math.max(0, DSPLUS_PRICE - shards);
  const perks = ['Контрпики LIVE во время выбора героев', 'Гайд по закупу и покупка предметов одной кнопкой', 'Таймеры Рошана и рун на карте', 'Сборки и советы по всем героям'];
  let html = '<div class="dsp-lock"><div class="dsp-lock-seal" aria-hidden="true">+</div>' +
    '<div class="dsp-eyebrow">РАЗОВАЯ АКТИВАЦИЯ · НАВСЕГДА</div><h3>Дотасенс <b>+</b></h3>' +
    '<ul class="dsp-perks">' + perks.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' +
    '<div class="dsp-price"><span>СТОИМОСТЬ</span><b>' + SHARD + fmtN(DSPLUS_PRICE) + '</b></div>';
  if(!p) html += '<p class="dsp-note">Покупка привязывается к аккаунту. Войди, чтобы активировать помощника.</p><button type="button" class="dsp-buy wide" data-act="login">ВОЙТИ В АККАУНТ</button>';
  else {
    html += '<div class="dsp-balance"><span>ТВОЙ БАЛАНС</span><b>' + SHARD + fmtN(shards) + '</b></div>' +
      (need > 0 ? '<p class="dsp-note">Не хватает ' + fmtN(need) + ' Сенсиков. Каждая победа в матче приносит +500.</p>' : '<p class="dsp-note">Баланс позволяет активировать помощника прямо сейчас.</p>') +
      '<button type="button" class="dsp-buy wide" data-act="activate"' + (need > 0 || buying ? ' disabled' : '') + '>' + (buying ? 'АКТИВАЦИЯ…' : 'АКТИВИРОВАТЬ ЗА ' + fmtN(DSPLUS_PRICE)) + '</button>';
  }
  if(buyError) html += '<div class="dsp-msg bad" role="alert">' + esc(buyError) + '</div>';
  return html + '</div>';
}
async function activate(){
  if(buying || owned() || typeof account === 'undefined' || !account.token) return;
  buying = true; buyError = ''; render(true);
  try {
    const data = await accountApi('buyplus', {token: account.token});
    account.profile = data.profile;
    accountStore(ACCOUNT_PROFILE_KEY, JSON.stringify(data.profile));
    renderAccountModal();
  } catch(err) {
    if(err && err.status === 401 && typeof accountSet === 'function') accountSet(null, null);
    else {
      buyError = (err && err.message) || 'Не удалось активировать. Попробуй ещё раз.';
      try {   /* баланс мог измениться на сервере — подтянем актуальный профиль */
        const me = await accountApi('me', {token: account.token});
        account.profile = me.profile; accountStore(ACCOUNT_PROFILE_KEY, JSON.stringify(me.profile)); renderAccountModal();
      } catch(e2) {}
    }
  } finally { buying = false; render(true); updateHint(); }
}

/* ===== Таймеры карты: Рошан и руны ===== */
function mapTimers(){
  const t = typeof gameTime === 'number' ? gameTime : 0;
  const runeIn = (Math.floor(t / 120) + 1) * 120 - t;
  const runeNow = typeof runes !== 'undefined' ? runes.length : 0;
  let rosh = {state:'none', left:0, pct:0, text:'—'};
  if(typeof roshanUnit !== 'undefined' && roshanUnit){
    if(roshanUnit.dead){ const left = Math.max(0, roshanUnit.respawnTimer || 0); rosh = {state:'dead', left, pct:100 - left / ROSHAN_RESPAWN * 100, text:'Возродится через ' + mmss(left)}; }
    else rosh = {state:'alive', left:0, pct:100, text:'Жив · ' + Math.round(roshanUnit.hp / roshanUnit.maxHp * 100) + '% здоровья'};
  } else if(t < ROSHAN_SPAWN_TIME){ const left = ROSHAN_SPAWN_TIME - t; rosh = {state:'wait', left, pct:t / ROSHAN_SPAWN_TIME * 100, text:'Появится через ' + mmss(left)}; }
  return {t, runeIn, runeNow, rosh};
}
function renderTimers(){
  if(!inMatch()) return '<p class="dsp-note">Таймеры появляются в матче: когда придёт следующая руна и когда Рошан появится или возродится. Открой помощника во время боя (F2).</p>';
  const m = mapTimers(), r = m.rosh, runePct = (120 - m.runeIn) / 120 * 100;
  const runeSoon = m.runeIn <= 15;
  let html = '<div class="dsp-timer' + (runeSoon ? ' soon' : '') + '"><div class="dsp-timer-top"><span class="dsp-eyebrow">РУНЫ</span><b>' + (m.runeNow ? 'на карте: ' + m.runeNow : mmss(m.runeIn)) + '</b></div>' +
    '<div class="dsp-progress"><i style="width:' + Math.max(2, Math.min(100, runePct)) + '%"></i></div>' +
    '<small>' + (m.runeNow ? 'Руны ждут героя. Следующая волна через ' + mmss(m.runeIn) + '.' : 'Следующая волна рун через ' + mmss(m.runeIn) + ' · каждые 2 минуты.') + '</small></div>';
  html += '<div class="dsp-timer ' + r.state + (r.state === 'dead' && r.left <= 20 ? ' soon' : '') + '"><div class="dsp-timer-top"><span class="dsp-eyebrow">РОШАН</span><b>' + (r.state === 'alive' ? 'НА КАРТЕ' : r.state === 'none' ? '—' : mmss(r.left)) + '</b></div>' +
    '<div class="dsp-progress"><i style="width:' + Math.max(2, Math.min(100, r.pct)) + '%"></i></div><small>' + esc(r.text) + (r.state === 'alive' ? '. Победа над ним даёт ' + ROSHAN_REWARD + ' золота и Аегис.' : '') + '</small></div>';
  html += '<p class="dsp-foot">Время матча ' + mmss(m.t) + '. Когда до события остаётся мало секунд, подпись на кнопке помощника предупредит заранее.</p>';
  return html;
}

let buyMsg = null;   // {text, bad}
function canBuy(id, coins){
  const it = SHOP_ITEMS[id]; if(!it || coins === null) return false;
  if(typeof RECIPES !== 'undefined' && RECIPES[id]) return true;
  return coins >= (it.cost || 0);
}
function doBuy(id){
  if(!inMatch() || playerHero.dead || typeof buyShopItem !== 'function') return;
  const it = SHOP_ITEMS[id]; if(!it) return;
  const before = Math.floor(playerHero.coins || 0);
  let ok = false;
  try { ok = !!buyShopItem(id); } catch(err) { ok = false; }
  if(ok) buyMsg = {text:'Куплено: ' + it.name, bad:false};
  else buyMsg = {text: before < (it.cost || 0) ? 'Не хватает ' + ((it.cost || 0) - before) + ' золота' : 'Покупка не удалась — проверь слоты инвентаря', bad:true};
  clearTimeout(doBuy.t); doBuy.t = setTimeout(() => { buyMsg = null; render(true); }, 2600);
  render(true);
}
function stepTile(id, i, hero, nextId, coins){
  const item = SHOP_ITEMS[id]; if(!item) return '';
  const owned = hero && typeof heroHasItem === 'function' && heroHasItem(hero, id);
  const can = !owned && canBuy(id, coins);
  const cost = itemCost(id);
  const inner = '<span class="dsp-item-step">' + (owned ? '✓' : i + 1) + '</span>' +
    '<span class="dsp-item-icon" style="--item-color:' + safeColor(item.color) + '">' + esc(item.icon || '◇') + '</span>' +
    '<span class="dsp-item-name">' + esc(item.name) + '</span>' +
    '<span class="dsp-item-cost"><i aria-hidden="true">●</i> ' + (cost || '—') + '</span>';
  const cls = 'dsp-step' + (owned ? ' owned' : '') + (id === nextId ? ' next' : '') + (can ? ' can' : '');
  if(owned || !hero) return '<li><div class="' + cls + '" title="' + esc(item.desc || item.name) + '">' + inner + '</div></li>';
  return '<li><button type="button" class="' + cls + '" data-buy="' + id + '" title="' + esc((item.desc || item.name) + ' — нажми, чтобы купить') + '">' + inner + '</button></li>';
}

function renderBattle(){
  if(!inMatch()){
    return '<p class="dsp-note">Советы по закупу появляются прямо в бою. Начни матч — и открой Дотасенс + кнопкой или клавишей F2. Пока можно посмотреть сборки героев на вкладке «Герои».</p>';
  }
  const id = playerHero.def.id;
  const enemies = heroes.filter(h => h.team !== playerHero.team);
  const adv = itemAdvice(id, enemies.map(h => h.def.id), true);
  const creator = creatorBuildOf(id);
  const startCategory = creator && creator.categories && creator.categories.find(cat => /СТАРТ/i.test(cat.name));
  const startItems = startCategory ? startCategory.items.map(entry => entry[0]).filter(item => SHOP_ITEMS[item]) : [];
  const coreItems = adv.guide ? adv.guide.build.filter(item => SHOP_ITEMS[item]) : [];
  const next = adv.rows[0] || null;
  const nextItem = next && SHOP_ITEMS[next.id];
  const coins = adv.coins;
  let html = '<div class="dsp-battle-head"><div><div class="dsp-eyebrow">DOTA PLUS GUIDE</div><div class="dsp-battle-title">' + esc(adv.def.name) + ' · ' + esc(adv.guide ? adv.guide.role : adv.def.title) + '</div></div>' +
    '<div class="dsp-gold"><span>ЗОЛОТО</span><b><i class="dsp-coin"></i>' + coins + '</b></div></div>';
  if(buyMsg) html += '<div class="dsp-msg' + (buyMsg.bad ? ' bad' : '') + '" role="status">' + esc(buyMsg.text) + '</div>';

  if(next && nextItem){
    const cost = itemCost(next.id), ready = canBuy(next.id, coins), pct = cost ? Math.max(0, Math.min(100, coins / cost * 100)) : 100;
    const isRecipe = typeof RECIPES !== 'undefined' && RECIPES[next.id];
    html += '<section class="dsp-next' + (ready ? ' ready' : '') + '"><span class="dsp-item-icon large" style="--item-color:' + safeColor(nextItem.color) + '">' + esc(nextItem.icon || '◇') + '</span>' +
      '<div class="dsp-next-body"><span class="dsp-eyebrow">КУПИТЬ СЛЕДУЮЩИМ</span><b>' + esc(nextItem.name) + '</b>' +
      (nextItem.desc ? '<span class="dsp-next-desc">' + esc(nextItem.desc) + '</span>' : '') +
      '<span class="dsp-next-why">' + esc(next.why) + '</span>' +
      '<div class="dsp-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + cost + '" aria-valuenow="' + Math.min(coins, cost) + '"><i style="width:' + pct + '%"></i></div>' +
      '<span class="dsp-progress-label">' + (ready ? 'Золота хватает' : 'Не хватает ' + Math.max(0, cost - coins)) + ' · цена ' + cost + '</span></div>' +
      '<button type="button" class="dsp-buy" data-buy="' + next.id + '"' + (ready ? '' : ' disabled') + '>' + (isRecipe ? 'СОБРАТЬ' : 'КУПИТЬ') + '<small>● ' + cost + '</small></button></section>';
  } else html += '<div class="dsp-empty-hint">Все рекомендации по сборке уже куплены.</div>';

  html += '<div class="dsp-section-heading"><span>ПУТЬ СБОРКИ</span><small>НАЖМИ НА ПРЕДМЕТ, ЧТОБЫ КУПИТЬ</small></div>' +
    (coreItems.length ? '<ol class="dsp-path">' + coreItems.map((item, i) => stepTile(item, i, playerHero, next && next.id, coins)).join('') + '</ol>' : '<p class="dsp-note">Сборка для героя пока не задана.</p>');
  if(startItems.length) html += '<div class="dsp-section-heading"><span>СТАРТОВЫЕ ПРЕДМЕТЫ</span></div><ol class="dsp-path">' + startItems.map((item, i) => stepTile(item, i, playerHero, null, coins)).join('') + '</ol>';

  const situational = adv.rows.slice(next ? 1 : 0);
  html += '<div class="dsp-section-heading"><span>ПО СИТУАЦИИ</span></div>' +
    (situational.length ? '<div class="dsp-situational-list">' + situational.map(row => {
      const item = SHOP_ITEMS[row.id], c = itemCost(row.id), can = canBuy(row.id, coins);
      return '<div class="dsp-situational-item"><span class="dsp-item-icon mini" style="--item-color:' + safeColor(item.color) + '">' + esc(item.icon || '◇') + '</span><div><b>' + esc(item.name) + '</b><small>' + esc(row.why) + '</small></div>' +
        '<div class="dsp-sit-side"><i>● ' + c + '</i><button type="button" class="dsp-buy mini" data-buy="' + row.id + '"' + (can ? '' : ' disabled') + '>КУПИТЬ</button></div></div>';
    }).join('') + '</div>' : '<p class="dsp-note">Пока нет ситуативных покупок.</p>');

  const alive = enemies.filter(h => !h.dead).sort((a, b) => (b.kills || 0) - (a.kills || 0));
  html += '<div class="dsp-title">ВРАГИ</div><div class="dsp-enemies">' + alive.map(h => '<span>' + esc(h.def.name) + ' · ур.' + h.level + (h.kills ? ' · ' + h.kills + ' уб.' : '') + '</span>').join('') + (enemies.length > alive.length ? '<span class="dead">мертвы: ' + (enemies.length - alive.length) + '</span>' : '') + '</div>';
  if(alive[0] && (alive[0].kills || 0) >= 4) html += '<p class="dsp-warn">⚠ ' + esc(alive[0].def.name) + ' набрал ' + alive[0].kills + ' убийств — сконцентрируйтесь на нём.</p>';
  const g = adv.guide; if(g && g.tips && g.tips.length) html += '<p class="dsp-foot">' + esc(g.tips[Math.floor(gameTime / 60) % g.tips.length]) + '</p>';
  html += '<p class="dsp-foot">' + esc(dsOf(id).tip) + '</p>';
  return html;
}

function renderHeroes(){
  const d = defById(pickedHero), g = (typeof HERO_GUIDES !== 'undefined' && HERO_GUIDES[pickedHero]) || null;
  let html = heroChips([pickedHero], allIds(), 'hero');
  if(!d) return html;
  html += '<div class="dsp-title">' + esc(d.name) + ' — ' + esc(g ? g.role : d.title) + '</div><p class="dsp-note">' + esc(dsOf(pickedHero).tip) + '</p>';
  if(g){
    html += '<div class="dsp-section-heading"><span>ЗАКУП ПО ПОРЯДКУ</span></div><ol class="dsp-path">' + g.build.map((id, i) => stepTile(id, i, null, null, null)).join('') + '</ol>';
    html += '<p class="dsp-foot">' + esc(g.skillNote || '') + '</p>';
  }
  /* Против кого силён / слаб */
  const w = dsOf(pickedHero).w, strong = [], weak = [];
  Object.keys(w).forEach(t => { if(w[t] >= 1) strong.push(TAG_RU[t]); if(w[t] <= -1) weak.push(TAG_RU[t]); });
  html += '<p class="dsp-note"><span class="ok">Силён против: ' + (strong.join(', ') || '—') + '</span><br><span class="no">Слабее против: ' + (weak.join(', ') || '—') + '</span></p>';
  return html;
}

function render(force){
  if(panel.hidden) return;
  const match = inMatch();
  const sig = [owned(), buying, buyError, profileNow() ? Math.floor(profileNow().shards || 0) : -1, tab, match, inDraft(), pickedHero, manualEnemies.join(','),
    inDraft() ? draftBotIndices.join(',') + '|' + draftPlayerIndex + '|' + Math.ceil(draftTime) : '',
    match ? [Math.ceil(typeof gameTime === 'number' ? gameTime : 0), Math.floor(playerHero.coins || 0), Math.floor((playerHero.hp || 0) / 40), playerHero.inventory.map(i => i && i.id).join(','), heroes.map(h => (h.dead ? 'd' : 'a') + (h.kills || 0) + 'l' + h.level).join(',')].join('|') : ''].join('#');
  if(!force && sig === lastSig) return;
  lastSig = sig;
  const scroll = panel.scrollTop;
  if(!owned()){
    panel.innerHTML = '<div class="dsp-head"><span>ДОТАСЕНС <b>+</b></span><button type="button" class="dsp-x" data-act="close" aria-label="Закрыть">×</button></div><div class="dsp-body">' + renderLocked() + '</div>';
    panel.scrollTop = scroll; return;
  }
  const tabs = [['counter', 'КОНТРПИК'], ['battle', 'В БОЮ'], ['timers', 'ТАЙМЕРЫ'], ['heroes', 'ГЕРОИ']];
  panel.innerHTML = '<div class="dsp-head"><span>ДОТАСЕНС <b>+</b></span><button type="button" class="dsp-x" data-act="close" aria-label="Закрыть">×</button></div>' +
    '<div class="dsp-tabs">' + tabs.map(t => '<button type="button" data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>' +
    '<div class="dsp-body">' + (tab === 'counter' ? renderCounter() : tab === 'battle' ? renderBattle() : tab === 'timers' ? renderTimers() : renderHeroes()) + '</div>';
  panel.scrollTop = scroll;
}

/* ===== События ===== */
function setOpen(open){
  panel.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  if(open){
    /* Умный выбор вкладки: в бою — «В бою», в драфте — «Контрпик». */
    if(owned()){ if(inMatch()) tab = 'battle'; else if(inDraft()) tab = 'counter'; }
    render(true);
  }
}
btn.addEventListener('click', () => setOpen(panel.hidden));
panel.addEventListener('click', e => {
  const t = e.target.closest('button'); if(!t) return;
  if(t.dataset.act === 'close') return setOpen(false);
  if(t.dataset.act === 'activate') return activate();
  if(t.dataset.act === 'login'){ setOpen(false); if(typeof openAccountModal === 'function') openAccountModal(); return; }
  if(!owned()) return;
  if(t.dataset.act === 'reset'){ manualEnemies = []; return render(true); }
  if(t.dataset.buy){ if(!t.disabled) doBuy(t.dataset.buy); return; }
  if(t.dataset.act === 'shop'){
    if(inMatch() && typeof shopOpen !== 'undefined'){
      shopOpen = true;
      shopGuideOpen = false;
      shopScrollRow = 0;
      setOpen(false);
      const canvas = document.getElementById('game');
      if(canvas) canvas.focus();
    }
    return;
  }
  if(t.dataset.tab){ tab = t.dataset.tab; return render(true); }
  if(t.dataset.kind === 'enemy'){
    const id = t.dataset.id, i = manualEnemies.indexOf(id);
    if(i >= 0) manualEnemies.splice(i, 1); else if(manualEnemies.length < 4) manualEnemies.push(id);
    return render(true);
  }
  if(t.dataset.kind === 'hero'){ pickedHero = t.dataset.id; render(true); }
});
document.addEventListener('pointerdown', e => {
  if(!panel.hidden && (!owned() || (!inMatch() && !inDraft())) && !box.contains(e.target)) setOpen(false);   /* в бою и в драфте панель не закрывается кликами по игре */
});
window.addEventListener('keydown', e => {
  if(e.key === 'F2'){ e.preventDefault(); setOpen(panel.hidden); }
  else if(e.key === 'Escape' && !panel.hidden && (!inMatch() || !owned())){ setOpen(false); btn.focus(); }
});

/* Положение кнопок: в верхней панели главного меню, справа внизу в выборе героя, сверху в матче. */
const tools = document.getElementById('game-tools');
const caption = document.getElementById('dsplus-caption');
function menuOther(){ return typeof gameState !== 'undefined' && gameState === 'menu' && typeof menuStage !== 'undefined' && menuStage !== 'home' && window.innerWidth >= 900 && window.innerHeight >= 560; }
function syncDock(){
  document.body.classList.toggle('ds-dock-bottom', menuOther());
  window.dsToolsReserve = (tools && document.body.classList.contains('ds-home')) ? tools.offsetWidth : 0;
}
if(tools && typeof ResizeObserver === 'function') new ResizeObserver(syncDock).observe(tools);
setInterval(syncDock, 120);

/* Подсказка на кнопке: лучший контрпик в драфте, «можно купить» в бою. */
let wasDraft = false, hintSig = '';
function updateHint(){
  let hint = false, text = 'ПОМОЩНИК';
  box.classList.toggle('locked', !owned());
  if(!owned()){
    const sig0 = 'locked' + (profileNow() ? 1 : 0);
    if(sig0 === hintSig) return; hintSig = sig0;
    btn.classList.remove('has-hint');
    if(caption) caption.textContent = 'ОТКРЫТЬ · ' + fmtN(DSPLUS_PRICE) + ' СЕНС.';
    return;
  }
  try {
    if(inDraft()){
      const t = draftTeams();
      if(t.enemies.length){ const top = counterPicks(t.enemies, t.allies)[0]; if(top){ hint = true; text = 'КОНТРПИК: ' + top.def.name.toUpperCase(); } }
    } else if(inMatch()){
      const adv = itemAdvice(playerHero.def.id, heroes.filter(h => h.team !== playerHero.team).map(h => h.def.id), true);
      const n = adv.rows[0];
      if(n && !playerHero.dead && canBuy(n.id, adv.coins)){ hint = true; text = 'МОЖНО КУПИТЬ'; }
      else { const m = mapTimers();
        if(m.runeNow === 0 && m.runeIn <= 10){ hint = true; text = 'РУНЫ ЧЕРЕЗ ' + Math.ceil(m.runeIn) + ' С'; }
        else if(m.rosh.state === 'dead' && m.rosh.left <= 15){ hint = true; text = 'РОШАН ЧЕРЕЗ ' + Math.ceil(m.rosh.left) + ' С'; }
        else if(m.rosh.state === 'wait' && m.rosh.left <= 15){ hint = true; text = 'РОШАН ЧЕРЕЗ ' + Math.ceil(m.rosh.left) + ' С'; } }
    }
  } catch(err) {}
  const sig = hint + text; if(sig === hintSig) return; hintSig = sig;
  btn.classList.toggle('has-hint', hint);
  if(caption) caption.textContent = text;
}
/* Всплывающая подсказка у кнопки и метки ★ на карточках героев при новых пиках врага. */
const toast = document.createElement('div');
toast.id = 'dsplus-toast'; toast.hidden = true; box.appendChild(toast);
let toastTimer = 0, seenEnemies = '', autoOpened = false;
function showToast(html){
  if(!panel.hidden) return;   /* панель открыта — она и так обновляется вживую */
  toast.innerHTML = html; toast.hidden = false;
  toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 6000);
}
function liveDraft(){
  const t = draftTeams();
  const sig = t.enemies.join(',');
  if(!t.enemies.length){ window.dsDraftRank = null; seenEnemies = sig; return; }
  const ranked = counterPicks(t.enemies, t.allies);
  const rank = {}; ranked.slice(0, 3).forEach((c, i) => { rank[c.hi] = i + 1; });
  window.dsDraftRank = rank;
  if(sig !== seenEnemies){
    const before = seenEnemies ? seenEnemies.split(',') : [];
    const added = t.enemies.filter((id, i) => before[i] !== id);
    seenEnemies = sig;
    const top = ranked[0];
    if(top){
      const names = added.map(id => (defById(id) || {}).name).filter(Boolean);
      showToast('<small>' + (names.length === 1 ? 'Враг выбрал: ' + esc(names[0]) : 'Состав врагов обновлён') + '</small><b>Контрпик: ' + esc(top.def.name) + '</b>' + (top.good.length ? '<span>контрит ' + esc(top.good.join(', ')) + '</span>' : ''));
    }
  }
  if(!autoOpened){ autoOpened = true; setOpen(true); }
}
setInterval(() => {
  const drafting = inDraft();
  if(!drafting && wasDraft){ setOpen(false); window.dsDraftRank = null; toast.hidden = true; seenEnemies = ''; autoOpened = false; }
  if(drafting && !wasDraft){ seenEnemies = ''; autoOpened = false; }
  wasDraft = drafting;
  if(owned()){ try { if(drafting) liveDraft(); } catch(err) {} } else window.dsDraftRank = null;
  updateHint();
  render(false);
}, 400);
window.addEventListener('shadow:profile', () => { hintSig = ''; updateHint(); render(true); });
})();
