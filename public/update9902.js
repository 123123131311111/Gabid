/* DotaSense 0.9.9.0.2 — «АЛЫЙ РЫВОК».
   • Псих сильнее на 7%: базовые здоровье и урон, рост за уровень и сила способностей.
   • Ригина получила четвёртый навык «Crimson Rush» (клавиша E): рывок сквозь врагов.
   • Боты команды игрока стали умнее: фарм по уровню вместо бесконечного леса, пуш линий и трона
     в середине и конце игры, помощь союзникам и защита башен, когда враг рядом.
   • Боты команды игрока получили скрипт покупок: новые предметы по роли героя, сборка рецептов,
     замена расходников и слабых вещей.
   Подключается поверх game.js и update9901.js, по образцу остальных update-файлов. */
(function(){
'use strict';
const TAU = Math.PI * 2;
const snd = (k, v) => { try { playSynthSfx(k, {volume: v == null ? 1 : v}); } catch(e) {} };
const warnOnce = (tag, err) => { if(!warnOnce[tag]){ warnOnce[tag] = 1; try { console.warn('update9902 ' + tag + ':', err); } catch(e) {} } };

/* ======================================================================
   1. ПСИХ СИЛЬНЕЕ НА 7%
   ====================================================================== */
const PSIH_BOOST = 1.07;
{
  const pd = HERO_DEFS.find(d => d.id === 'psih');
  if(pd && !pd.boost9902){
    pd.boost9902 = true;
    for(const k of ['baseHp', 'hpPerLvl', 'baseDmg', 'dmgPerLvl', 'abilityDamageScale']){
      if(typeof pd[k] === 'number') pd[k] *= PSIH_BOOST;
    }
    HERO_STAT_BALANCE.psih = [pd.baseHp, pd.hpPerLvl, pd.baseDmg, pd.dmgPerLvl, pd.abilityDamageScale];
  }
}

/* ======================================================================
   2. РИГИНА — ЧЕТВЁРТЫЙ НАВЫК «CRIMSON RUSH» (клавиша E)
   ====================================================================== */
Object.assign(SFX_PRESETS, {
  reginaRush: {from:180, to:760, duration:0.3, type:'sawtooth', volume:0.07, noise:0.4, layers:[[900,220,0,0.28,'triangle',0.04],[90,40,0.12,0.25,'sine',0.1]]}
});
const RUSH_RANGE = 640;
const RUSH_DMG = [0, 150, 225, 310, 410];
const RUSH_WIDTH = 105;

function distToSegment(px, py, ax, ay, bx, by){
  const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy;
  if(l2 < 1) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * vx + (py - ay) * vy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + vx * t), py - (ay + vy * t));
}

Object.assign(SKILLS, {
  reginaCrimson: {
    name:'Crimson Rush', short:'E', type:'point', maxLevel:4, range:RUSH_RANGE,
    cd:[0, 15, 13, 11, 9], mana:[0, 70, 80, 90, 100],
    desc:'Ригина стремительно рвётся вперёд до 640 и рубит всех врагов на пути: 150/225/310/410 урона и замедление. За каждого задетого вражеского героя Dispose и Rebound перезаряжаются на 1,5 сек. быстрее (до 3 сек.), а сама Ригина получает ускорение атаки на 3 сек. Во время Unleash рывок бьёт на 30% сильнее.',
    cast(h, x, y, lvl){
      const scepter = typeof hasScepter === 'function' && hasScepter(h);
      let dx = x - h.x, dy = y - h.y, dist = Math.hypot(dx, dy);
      if(dist < 40){ const f = Number.isFinite(h.facing) ? h.facing : 0; dx = Math.cos(f); dy = Math.sin(f); dist = 1; }
      const ux = dx / dist, uy = dy / dist;
      const maxLen = RUSH_RANGE + (scepter ? 80 : 0);
      const len = Math.min(maxLen, Math.max(260, dist));
      const sx = h.x, sy = h.y;
      const ex = clamp(sx + ux * len, 60, WORLD - 60), ey = clamp(sy + uy * len, 60, WORLD - 60);
      const unleash = h.buffs && h.buffs.some(b => b.type === 'reginaUnleash');
      const base = RUSH_DMG[Math.max(1, Math.min(4, lvl))] * (unleash ? 1.3 : 1) * (scepter ? 1.2 : 1);
      h.facing = Math.atan2(ey - sy, ex - sx);
      fxBeam(sx, sy, ex, ey, '#ff4d6d', 0.45);
      fxRing(sx, sy, 70, '#ffb0c5', 0.35);
      for(let i = 1; i <= 6; i++){ const k = i / 6; spawnParticles(sx + (ex - sx) * k, sy + (ey - sy) * k, '#ff7ca2', 5, 0.7); }
      addText(h.x, h.y - 78, 'CRIMSON RUSH', '#ff9fbd', 1.0, 17);
      snd('reginaRush', 0.9);
      startArcMotion(h, ex, ey, 0.26, () => {
        let heroHits = 0, hits = 0;
        for(const u of units){
          if(u.dead || u.team === h.team || isBuilding(u) || u.invulnerable) continue;
          if(distToSegment(u.x, u.y, sx, sy, ex, ey) > RUSH_WIDTH + (u.radius || 0)) continue;
          applyDamage(u, abilityDamage(h, base), h);
          u.slow = Math.max(u.slowT > 0 ? u.slow : 0, 0.3 + lvl * 0.05);
          u.slowT = Math.max(u.slowT || 0, 2);
          u.hitFlash = Math.max(u.hitFlash || 0, 0.25);
          spawnParticles(u.x, u.y, '#ff3b5c', 12, 0.8);
          hits++;
          if(u.type === 'hero' && !u.isIllusion) heroHits++;
        }
        fxRing(ex, ey, 150, '#ff6f91', 0.55);
        spawnParticles(ex, ey, '#ffd4e4', 22, 1.0);
        if(heroHits > 0){
          const cut = Math.min(3, heroHits * 1.5);
          for(const i of [0, 1]){ const s = h.skills[i]; if(s && s.cd > 0) s.cd = Math.max(0, s.cd - cut); }
          h.buffs = h.buffs.filter(b => b.id !== 'reginaRushAs');
          h.addBuff({type:'as', id:'reginaRushAs', val:0.5 + lvl * 0.1, t:3});
          addText(h.x, h.y - 96, 'РАЖ', '#ffb0c5', 0.9, 15);
        }
      }, 14, (sx + ex) / 2, (sy + ey) / 2);
      return true;
    }
  }
});

{
  const rd = HERO_DEFS.find(d => d.id === 'regina');
  if(rd && !rd.skills.includes('reginaCrimson')) rd.skills.push('reginaCrimson');
  if(typeof HERO_GUIDES !== 'undefined' && HERO_GUIDES.regina){
    const gd = HERO_GUIDES.regina;
    gd.skills = [1, 3, 0];
    gd.skillNote += ' Crimson Rush (E) — рывок до 640 сквозь врагов: урон, замедление и ускорение перезарядки Q/W за каждого задетого героя.';
    gd.tips = (gd.tips || []).concat(['Crimson Rush — быстрый вход в драку: рубите героев на пути, затем Rebound и Dispose будут готовы раньше.']);
  }
}

/* ======================================================================
   3. УМНЫЕ БОТЫ КОМАНДЫ ИГРОКА
   ====================================================================== */
const isAllyBot = h => !!(h && h.type === 'hero' && !h.dead && playerHero && h !== playerHero &&
  h.team === playerHero.team && !h.isDummy && !(h.isOnlineRemote && !h.isOnlineBot));
const aliveHeroes = team => heroes.filter(u => u.type === 'hero' && !u.isIllusion && !u.dead && u.team === team);

/* Сводка по команде: прогресс пуша, лучшая линия, «игра завершается». Обновляется 2 раза в секунду. */
const INTEL = {t: -1, lastGT: 0, maxB: [0, 0], cache: [null, null]};
function intel(team){
  if(gameTime < INTEL.lastGT - 1){ INTEL.maxB = [0, 0]; INTEL.cache = [null, null]; INTEL.t = -1; }   /* новый матч */
  INTEL.lastGT = gameTime;
  const c = INTEL.cache[team];
  if(c && gameTime - c.at < 0.5) return c;
  const foe = 1 - team;
  const blds = units.filter(u => !u.dead && u.team === foe && isBuilding(u));
  INTEL.maxB[foe] = Math.max(INTEL.maxB[foe], blds.length);
  const ratio = INTEL.maxB[foe] ? blds.length / INTEL.maxB[foe] : 1;
  const anc = blds.find(u => u.type === 'ancient') || null;
  const ancRatio = anc ? anc.hp / Math.max(1, anc.maxHp) : 1;
  const left = [0, 0, 0];
  for(const b of blds){ if(b.type !== 'ancient' && Number.isInteger(b.lane)) left[b.lane]++; }
  const mates = aliveHeroes(team);
  /* где наши герои: выбираем линию, на которой осталось меньше всего вражеских зданий, и куда уже дошли свои */
  let pushLane = 0, bestScore = Infinity;
  for(let lane = 0; lane < 3; lane++){
    const here = mates.filter(m => laneDistanceToPoint(m.x, m.y, lane) < 600).length;
    const score = left[lane] * 10 - here * 2 + (lane === 0 ? -1 : 0);
    if(score < bestScore){ bestScore = score; pushLane = lane; }
  }
  const endgame = ratio <= 0.55 || ancRatio < 0.75 || gameTime >= 1200;
  const res = {at: gameTime, ratio, anc, ancRatio, left, pushLane, endgame, mates: mates.length};
  INTEL.cache[team] = res;
  return res;
}

/* Уровень, ниже которого герою ещё полезно подфармить (но только когда рядом нет угрозы). */
const farmLevelGoal = () => Math.min(16, 4 + gameTime / 150);
const pushStartTime = () => Math.max(300, (typeof MID_PUSH_TIME === 'number' ? MID_PUSH_TIME : 300) + 60);

/* --- 3a. директива: фармим по уровню, потом идём ломать --- */
const _bsd = botScenarioDirective;
botScenarioDirective = function(h){
  const d = _bsd.apply(this, arguments);
  try {
    if(!isAllyBot(h) || gameTime < pushStartTime()) return d;
    const I = intel(h.team);
    const scenario = d ? d.scenario : null;
    h.smartPush = true;
    const needFarm = !I.endgame && h.level < farmLevelGoal() && (h.hp / h.maxHp) > 0.4;
    if(needFarm) return {lane: I.pushLane, jungle: true, passive: false, rune: false, scenario};
    return {lane: I.pushLane, jungle: false, passive: false, rune: false, scenario};
  } catch(err){ warnOnce('directive', err); return d; }
};

/* --- 3b. если здание для удара недоступно или далеко, идём в сторону вражеской базы, а не стоим дома --- */
const _blo = botLaneObjective;
botLaneObjective = function(h){
  try {
    if(isAllyBot(h) && gameTime >= pushStartTime()){
      const I = intel(h.team);
      if(I.endgame && I.anc) return {x: I.anc.x, y: I.anc.y};
      const path = LANES[I.pushLane] || LANES[0];
      return path[h.team === 0 ? path.length - 1 : 0];
    }
  } catch(err){ warnOnce('objective', err); }
  return _blo.apply(this, arguments);
};

/* --- 3c. «враг близко»: помогаем союзникам в драке и защищаем свои башни даже вне своего поля зрения --- */
const _bpe = botPickVisibleEnemy;
botPickVisibleEnemy = function(h){
  const own = _bpe.apply(this, arguments);
  if(own || !isAllyBot(h)) return own;
  try {
    const foes = heroes.filter(u => u.type === 'hero' && !u.isIllusion && !u.dead && u.team !== h.team && u.team !== 2 &&
      !u.invulnerable && !isHiddenFrom(u, h.team) && Math.hypot(u.x - h.x, u.y - h.y) <= 2300);
    if(!foes.length) return null;
    const mates = heroes.filter(u => u.type === 'hero' && !u.isIllusion && !u.dead && u.team === h.team && u !== h);
    const towers = units.filter(u => !u.dead && u.team === h.team && isBuilding(u));
    let best = null, bs = Infinity;
    for(const f of foes){
      const helpMate = mates.some(m => Math.hypot(m.x - f.x, m.y - f.y) < 650);
      const atTower = towers.some(t => Math.hypot(t.x - f.x, t.y - f.y) < (t.atkRange || 600) + 450);
      if(!helpMate && !atTower) continue;
      const score = Math.hypot(f.x - h.x, f.y - h.y) + (f.hp / Math.max(1, f.maxHp)) * 250;
      if(score < bs){ bs = score; best = f; }
    }
    return best;
  } catch(err){ warnOnce('pick', err); return null; }
};

/* ======================================================================
   4. СКРИПТ ПОКУПОК ДЛЯ БОТОВ КОМАНДЫ ИГРОКА
   ====================================================================== */
const GOALS = {
  carry:  ['pt', 'bkb', 'abyssEye', 'kingSlayer', 'satanic', 'galeBoots', 'stormbringer'],
  tank:   ['pt', 'hushCloak', 'bkb', 'eternalAegis', 'titanHeart', 'galeBoots', 'abyssEye'],
  caster: ['joelBoots', 'bkb', 'archmageRobe', 'sorcererCrown', 'superBlink', 'hushCloak', 'abyssEye']
};
const JUNK = ['tango', 'mango', 'hatchet'];
const botRole = h => {
  const d = h.def || {};
  if((d.baseDmg || 60) <= 56) return 'caster';
  if((d.baseHp || 700) >= 880 && (d.baseDmg || 60) < 80) return 'tank';
  return 'carry';
};
const hasItem = (h, id) => h.inventory.some(i => i && i.id === id);
const freeSlots = h => h.inventory.filter(i => !i).length;

function botGoalList(h){
  const guide = (typeof HERO_GUIDES !== 'undefined' && h.def && HERO_GUIDES[h.def.id]) ? HERO_GUIDES[h.def.id].build : [];
  const core = guide.slice(0, 3), rest = guide.slice(3);
  const seen = new Set(), out = [];
  for(const id of [...core, ...GOALS[botRole(h)], ...rest]){
    if(seen.has(id) || !SHOP_ITEMS[id]) continue;
    seen.add(id); out.push(id);
  }
  return out;
}

/* Освобождаем слот: сначала расходники, затем самая дешёвая вещь, не нужная по плану (возврат 50%). */
function botMakeRoom(h, goals, goalCost){
  if(freeSlots(h) > 0) return true;
  const protect = new Set(goals.slice(0, 6));
  for(let i = 0; i < h.inventory.length; i++){
    const it = h.inventory[i];
    if(it && JUNK.includes(it.id) && !protect.has(it.id)){ h.inventory[i] = null; return true; }
  }
  let worst = -1, wc = Infinity;
  for(let i = 0; i < h.inventory.length; i++){
    const it = h.inventory[i]; if(!it) continue;
    const c = (SHOP_ITEMS[it.id] && (SHOP_ITEMS[it.id].totalCost || SHOP_ITEMS[it.id].cost)) || 0;
    if(protect.has(it.id) || RECIPES[it.id]) continue;
    if(c < wc){ wc = c; worst = i; }
  }
  if(worst >= 0 && wc < goalCost * 0.5){
    const it = h.inventory[worst];
    revertItemStats(h, it.id);
    h.coins += Math.floor(((SHOP_ITEMS[it.id] && SHOP_ITEMS[it.id].cost) || 0) * 0.5);
    h.inventory[worst] = null;
    return true;
  }
  return false;
}

/* Возвращает 'bought' / 'wait' / 'skip'. 'wait' — копим монеты на эту цель, дальше по списку не идём. */
function botAcquire(h, id, goals){
  const item = SHOP_ITEMS[id];
  if(!item || hasItem(h, id)) return 'skip';
  if(id === 'aghanimShard' || id === 'observerWard') return 'skip';
  /* компонент уже сгорел в собранном предмете (например, Сатаник и Еблет внутри Сердца Титана) — повторно не покупаем */
  for(const rid in RECIPES){ if(hasItem(h, rid) && RECIPES[rid].parts.includes(id) && !(RECIPES[id])) return 'skip'; }
  if(id === 'pt'){
    const boots = h.inventory.findIndex(i => i && i.id === 'joelBoots');
    const fangs = h.inventory.findIndex(i => i && i.id === 'fangs');
    if(boots >= 0 && fangs >= 0){
      if(h.coins < SHOP_ITEMS.pt.cost) return 'wait';
      h.coins -= SHOP_ITEMS.pt.cost;
      h.inventory[boots] = createInventoryItem('pt'); h.inventory[fangs] = null;
      applyItemStats(h, 'pt'); recipeAutoCraft(h);
      return 'bought';
    }
    const need = boots < 0 ? 'joelBoots' : 'fangs';
    if(h.coins < SHOP_ITEMS[need].cost) return 'wait';
    if(!botMakeRoom(h, goals, SHOP_ITEMS[need].cost)) return 'skip';
    return botBuyItemById(h, need) ? 'bought' : 'wait';
  }
  if(RECIPES[id]){
    const st = recipeStatus(h, id);
    if(st.missing.some(pid => !recipePartBuyable(pid))){
      const r = botAcquire(h, 'pt', goals); return r === 'skip' ? 'skip' : r;
    }
    if(!st.have.length && !botMakeRoom(h, goals, st.need)) return 'skip';
    if(h.coins < st.need) return 'wait';
    return craftRecipeItem(h, id, true) ? 'bought' : 'skip';
  }
  if(h.coins < item.cost) return 'wait';
  const completes = recipeCompletedBy(h, id);
  if(!completes && !botMakeRoom(h, goals, item.cost)) return 'skip';
  if(completes) return craftRecipeItem(h, completes, true) ? 'bought' : 'skip';
  const ok = botBuyItemById(h, id);
  if(ok) recipeAutoCraft(h);
  return ok ? 'bought' : 'wait';
}

function smartBotBuy(h){
  /* расходники на старте и пока есть место: Танго, а магам ещё Манго */
  if(gameTime < 900 && !hasItem(h, 'tango') && h.coins >= SHOP_ITEMS.tango.cost && freeSlots(h) > 1) botBuyItemById(h, 'tango');
  if(botRole(h) === 'caster' && gameTime < 900 && !hasItem(h, 'mango') && h.coins >= SHOP_ITEMS.mango.cost && freeSlots(h) > 2) botBuyItemById(h, 'mango');
  const goals = botGoalList(h);
  let bought = 0;
  for(const id of goals){
    const r = botAcquire(h, id, goals);
    if(r === 'bought'){ bought++; if(bought >= 2) break; continue; }
    if(r === 'wait') break;
  }
  return bought > 0;
}

const _bbi = buyBotItem;
buyBotItem = function(h){
  if(!isAllyBot(h)) return _bbi.apply(this, arguments);
  try { return smartBotBuy(h); } catch(err){ warnOnce('shop', err); return _bbi.apply(this, arguments); }
};

/* ======================================================================
   5. ТИК БОТА: быстрые покупки, Crimson Rush у ботов-Ригин, лечебные расходники
   ====================================================================== */
const _uea = updateEnemyAI;
updateEnemyAI = function(h, dt){
  const r = _uea.apply(this, arguments);
  try {
    if(!isAllyBot(h)) return r;
    /* покупки каждые ~3 секунды, а не раз в 10–18 */
    h.smartShopT = (h.smartShopT || 0) - dt;
    if(h.smartShopT <= 0){
      h.smartShopT = 2.5 + Math.random();
      if(h.coins >= 70) smartBotBuy(h);
    }
    /* Ригина-бот: Crimson Rush как вход в драку или добивание */
    if(h.def && h.def.id === 'regina' && h.skills[3] && h.skills[3].level > 0 && h.skills[3].cd <= 0){
      const t = h.attackTarget;
      if(t && !t.dead && t.team !== h.team && t.type === 'hero' && !isBuilding(t)){
        const d = Math.hypot(t.x - h.x, t.y - h.y);
        if(d > 260 && d < 600 && h.mp >= (SKILLS.reginaCrimson.mana[h.skills[3].level] || 0)) castSkill(h, 3, t.x, t.y);
      }
    }
  } catch(err){ warnOnce('tick', err); }
  return r;
};

})();
