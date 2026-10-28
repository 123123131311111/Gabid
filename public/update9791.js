/* DotaSense 0.9.8.0 — «ДОТАСЕНС +»: контрпики и гайд по закупу.
   Подключается поверх game.js, читает HERO_DEFS / HERO_GUIDES / SHOP_ITEMS и состояние матча;
   игровую покупку выполняет сам магазин, помощник только открывает его по кнопке. */
(function(){
'use strict';
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
  return DS_IDS.map(id => {
    const def = defById(id); if(!def) return null;
    let score = 0; const good = [], bad = [];
    enemies.forEach(e => {
      let s = 0; tagsOf(e).forEach(t => { s += DS[id].w[t] || 0; });
      score += s;
      if(s >= 2) good.push(e.name); else if(s <= -2) bad.push(e.name);
    });
    const mine = tagsOf(def);
    const notes = [];
    if(allies.length && !allyTank && mine.includes('tank')) { score += 1.5; notes.push('в команде нет танка'); }
    if(allies.length && !allyRanged && def.atkRange > 250) { score += 1; notes.push('нужен дальний урон'); }
    return {id, def, score, good, bad, notes};
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
    return '<button type="button" class="dsp-hero-chip' + (selected.includes(id) ? ' on' : '') + '" data-kind="' + kind + '" data-id="' + id + '" aria-pressed="' + selected.includes(id) + '">' +
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
    let why = DS[c.id].tip;
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

function renderCounter(){
  let enemies, allies, auto = false;
  if(inDraft()){ const t = draftTeams(); enemies = t.enemies; allies = t.allies; auto = true; }
  else if(inMatch()){ enemies = heroes.filter(h => h.team !== playerHero.team).map(h => h.def.id); allies = heroes.filter(h => h.team === playerHero.team && h !== playerHero).map(h => h.def.id); auto = true; }
  else { enemies = manualEnemies; allies = []; }
  const enemyDefs = enemies.map(defById).filter(Boolean);
  let html = '<div class="dsp-context"><span>' + (inDraft() ? 'СТАДИЯ ВЫБОРА' : inMatch() ? 'СОСТАВ ПРОТИВНИКА' : 'РУЧНОЙ ВЫБОР') + '</span><small>' + enemyDefs.length + ' / 4 врага</small></div>' +
    '<p class="dsp-note">' + (inDraft() ? 'Состав считывается прямо из драфта и пересчитывается после каждого выбора.' : auto ? 'Составы команд обновляются автоматически.' : 'Отметь до четырёх вражеских героев — рейтинг обновится сразу.') + '</p>';
  if(!auto) html += heroChips(manualEnemies, null, 'enemy');
  else html += '<div class="dsp-enemy-strip">' + (enemyDefs.length ? enemyDefs.map(d =>
    '<div class="dsp-enemy-card"><span class="dsp-hero-mark" style="--hero-color:' + safeColor(d.color) + '">' + esc(initials(d.name)) + '</span><span>' + esc(d.name) + '</span><small>' + tagsOf(d).map(t => TAG_RU[t]).join(' · ') + '</small></div>'
  ).join('') : '<div class="dsp-draft-empty"><span>?</span><b>Ждём пик соперника</b><small>Подбор появится сразу после выбора героя</small></div>') + '</div>';
  if(!enemyDefs.length) return html + '<div class="dsp-empty-hint">Подсказки строятся по пикам соперника и выбранным союзникам.</div>';
  html += '<div class="dsp-section-heading"><span>ЛУЧШИЕ КОНТРПИКИ</span><small>ОЦЕНКА ПО СОСТАВУ</small></div>' +
    '<div class="dsp-pick-list">' + pickRows(counterPicks(enemyDefs.map(d => d.id), allies), auto ? 3 : 5) + '</div>';
  html += '<p class="dsp-foot">Оценка учитывает тип атаки, запас здоровья и баланс своей команды.</p>';
  return html;
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
  const affordable = nextItem && adv.coins !== null && adv.coins >= itemCost(next.id);
  let html = '<div class="dsp-battle-head"><div><div class="dsp-eyebrow">DOTA PLUS GUIDE</div><div class="dsp-battle-title">' + esc(adv.def.name) + ' · ' + esc(adv.guide ? adv.guide.role : adv.def.title) + '</div></div>' +
    '<div class="dsp-gold"><span>ЗОЛОТО</span><b>● ' + adv.coins + '</b></div></div>' +
    '<div class="dsp-build-layout"><section class="dsp-build-column"><div class="dsp-section-heading"><span>СТАРТОВЫЕ ПРЕДМЕТЫ</span></div>' +
    (startItems.length ? '<div class="dsp-item-grid start">' + startItems.map((item, i) => itemTile(item, i, playerHero, false)).join('') + '</div>' : '<p class="dsp-note">Стартовый закуп для героя не задан.</p>') +
    '<div class="dsp-section-heading"><span>СБОРКА ПО ПОРЯДКУ</span></div>' +
    (coreItems.length ? '<div class="dsp-item-grid">' + coreItems.map((item, i) => itemTile(item, i, playerHero, false)).join('') + '</div>' : '<p class="dsp-note">Сборка для героя пока не задана.</p>') +
    '</section><section class="dsp-purchase-column"><div class="dsp-section-heading"><span>КУПИТЬ СЛЕДУЮЩИМ</span><small>' + (next ? 'ПРИОРИТЕТ' : 'ГОТОВО') + '</small></div>';
  if(next && nextItem){
    html += '<div class="dsp-next-item"><span class="dsp-item-icon large" style="--item-color:' + safeColor(nextItem.color) + '">' + esc(nextItem.icon || '◇') + '</span>' +
      '<div class="dsp-next-info"><b>' + esc(nextItem.name) + '</b><span>● ' + itemCost(next.id) + ' монет</span><small>' + esc(next.why) + '</small></div>' +
      (affordable ? '<span class="dsp-afford">ХВАТАЕТ</span>' : '<span class="dsp-short">' + (adv.coins === null ? '' : '−' + (itemCost(next.id) - adv.coins)) + '</span>') + '</div>' +
      '<button type="button" class="dsp-shop-button" data-act="shop">ОТКРЫТЬ МАГАЗИН <span>↗</span></button>';
  } else html += '<div class="dsp-empty-hint">Все рекомендации по сборке уже куплены.</div>';
  const situational = adv.rows.slice(next ? 1 : 0);
  html += '<div class="dsp-section-heading situational"><span>ПО СИТУАЦИИ</span></div>' +
    (situational.length ? '<div class="dsp-situational-list">' + situational.map(row => {
      const item = SHOP_ITEMS[row.id];
      const enough = adv.coins !== null && adv.coins >= itemCost(row.id);
      return '<div class="dsp-situational-item"><span class="dsp-item-icon mini" style="--item-color:' + safeColor(item.color) + '">' + esc(item.icon || '◇') + '</span><div><b>' + esc(item.name) + '</b><small>' + esc(row.why) + '</small></div><i>' + itemCost(row.id) + (adv.coins !== null ? (enough ? ' ✓' : ' · мало золота') : '') + '</i></div>';
    }).join('') + '</div>' : '<p class="dsp-note">Пока нет ситуативных покупок.</p>') +
    '</section></div>';
  const alive = enemies.filter(h => !h.dead).sort((a, b) => (b.kills || 0) - (a.kills || 0));
  html += '<div class="dsp-title">ВРАГИ</div><div class="dsp-enemies">' + alive.map(h => '<span>' + esc(h.def.name) + ' · ур.' + h.level + (h.kills ? ' · ' + h.kills + ' уб.' : '') + '</span>').join('') + (enemies.length > alive.length ? '<span class="dead">мертвы: ' + (enemies.length - alive.length) + '</span>' : '') + '</div>';
  if(alive[0] && (alive[0].kills || 0) >= 4) html += '<p class="dsp-warn">⚠ ' + esc(alive[0].def.name) + ' набрал ' + alive[0].kills + ' убийств — сконцентрируйтесь на нём.</p>';
  const g = adv.guide; if(g && g.tips && g.tips.length) html += '<p class="dsp-foot">' + esc(g.tips[Math.floor(gameTime / 60) % g.tips.length]) + '</p>';
  if(DS[id]) html += '<p class="dsp-foot">' + esc(DS[id].tip) + '</p>';
  return html;
}

function renderHeroes(){
  const d = defById(pickedHero), g = (typeof HERO_GUIDES !== 'undefined' && HERO_GUIDES[pickedHero]) || null;
  let html = heroChips([pickedHero], DS_IDS, 'hero');
  if(!d) return html;
  html += '<div class="dsp-title">' + esc(d.name) + ' — ' + esc(g ? g.role : d.title) + '</div><p class="dsp-note">' + esc(DS[pickedHero].tip) + '</p>';
  if(g){
    html += '<div class="dsp-title">ЗАКУП ПО ПОРЯДКУ</div><div class="dsp-item-grid">' + g.build.map((id, i) => itemTile(id, i, null, false)).join('') + '</div>';
    html += '<p class="dsp-foot">' + esc(g.skillNote || '') + '</p>';
  }
  /* Против кого силён / слаб */
  const w = DS[pickedHero].w, strong = [], weak = [];
  Object.keys(w).forEach(t => { if(w[t] >= 1) strong.push(TAG_RU[t]); if(w[t] <= -1) weak.push(TAG_RU[t]); });
  html += '<p class="dsp-note"><span class="ok">Силён против: ' + (strong.join(', ') || '—') + '</span><br><span class="no">Слабее против: ' + (weak.join(', ') || '—') + '</span></p>';
  return html;
}

function render(force){
  if(panel.hidden) return;
  const match = inMatch();
  const sig = [tab, match, inDraft(), pickedHero, manualEnemies.join(','),
    inDraft() ? draftBotIndices.join(',') : '',
    match ? [Math.floor(playerHero.coins || 0), Math.floor((playerHero.hp || 0) / 40), playerHero.inventory.map(i => i && i.id).join(','), heroes.map(h => (h.dead ? 'd' : 'a') + (h.kills || 0) + 'l' + h.level).join(',')].join('|') : ''].join('#');
  if(!force && sig === lastSig) return;
  lastSig = sig;
  const scroll = panel.scrollTop;
  const tabs = [['counter', 'КОНТРПИК'], ['battle', 'В БОЮ'], ['heroes', 'ГЕРОИ']];
  panel.innerHTML = '<div class="dsp-head"><span>ДОТАСЕНС <b>+</b></span><button type="button" class="dsp-x" data-act="close" aria-label="Закрыть">×</button></div>' +
    '<div class="dsp-tabs">' + tabs.map(t => '<button type="button" data-tab="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>').join('') + '</div>' +
    '<div class="dsp-body">' + (tab === 'counter' ? renderCounter() : tab === 'battle' ? renderBattle() : renderHeroes()) + '</div>';
  panel.scrollTop = scroll;
}

/* ===== События ===== */
function setOpen(open){
  panel.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  if(open){
    /* Умный выбор вкладки: в бою — «В бою», в драфте — «Контрпик». */
    if(inMatch()) tab = 'battle'; else if(inDraft()) tab = 'counter';
    render(true);
  }
}
btn.addEventListener('click', () => setOpen(panel.hidden));
panel.addEventListener('click', e => {
  const t = e.target.closest('button'); if(!t) return;
  if(t.dataset.act === 'close') return setOpen(false);
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
  if(!panel.hidden && !inMatch() && !box.contains(e.target)) setOpen(false);   /* в бою панель не закрывается кликами по карте */
});
window.addEventListener('keydown', e => {
  if(e.key === 'F2'){ e.preventDefault(); setOpen(panel.hidden); }
  else if(e.key === 'Escape' && !panel.hidden && !inMatch()) setOpen(false);
});

/* Во время драфта помощник открывается один раз, сразу после появления первых пиков. */
let wasDraft = false;
setInterval(() => {
  const drafting = inDraft();
  if(drafting && !wasDraft){
    tab = 'counter';
    setOpen(true);
  } else if(!drafting && wasDraft){
    setOpen(false);
  }
  wasDraft = drafting;
  render(false);
}, 400);
})();
