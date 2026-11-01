/* DotaSense 0.10.3.1 — БОТЫ: ВАРДЫ И КРУТЫЕ ПРЕДМЕТЫ С СЕРЕДИНЫ КАТКИ.
   • Варды: в каждой команде ботов есть «вардер» (маг/саппорт, иначе самый низкий уровень). Он покупает Observer Ward за 50 монет
     (запас хранится у бота и не занимает слот инвентаря), пока в команде меньше нужного числа вардов, и ставит их в нужных ситуациях:
       1) самый первый вард — на реке своей линии (защита от ганков);
       2) после 6-й минуты — перед вражеской башней линии, на которую идёт пуш;
       3) перед Рошаном (с ~2:30) — вард у ямы, чтобы видеть, кто лезет на босса;
       4) руны на реке и остальные речные точки, пока они не накрыты вардом команды.
     Вардер идёт к точке только когда рядом нет врагов и здоровья достаточно; увидел врага или упал HP — отменяет вылазку.
     Герои врага внутри зоны видимости варда своей команды становятся целью для ботов (как при обычном обзоре).
     Варды вражеских ботов игрок не видит. В онлайне (боты хоста) варды ботов отключены — сервер владеет вардами только людей.
   • Предметы: с 10-й минуты (середина матча) боты целятся в самые дорогие предметы по роли героя (Эгида Вечности, Палач Королей,
     Королевство, Сердце Титана, Корона Колдуна и т.д.). Бот копит золото на лучший недостающий предмет, не тратя его на дешёвое,
     докупает компоненты по частям, а если нет места — продаёт расходники и самые дешёвые вещи (возврат 50%).
   Подключается после update0103.js. */
(function(){
'use strict';
const warnOnce = (tag, err) => { if(!warnOnce[tag]){ warnOnce[tag] = 1; try { console.warn('update01031 ' + tag + ':', err); } catch(e) {} } };

const ELITE_TIME = 600;                 /* середина катки (матч ~20 минут) */
const ELITE_SAVE_FRACTION = 0.35;       /* когда накоплено столько от цены — не тратим золото на дешёвое */

const isBotHero = h => !!(h && h.type === 'hero' && !h.isIllusion && !h.isDummy && h !== playerHero &&
  !(h.isOnlineRemote && !h.isOnlineBot));
const roleOf = h => {
  const d = (h && h.def) || {};
  if((d.baseDmg || 60) <= 56) return 'caster';
  if((d.baseHp || 700) >= 880 && (d.baseDmg || 60) < 80) return 'tank';
  return 'carry';
};
const hasItem = (h, id) => h.inventory.some(i => i && i.id === id);
const freeSlots = h => h.inventory.filter(i => !i).length;
const teamHeroes = team => heroes.filter(u => u.type === 'hero' && !u.isIllusion && u.team === team);

/* ======================================================================
   1. КРУТЫЕ ПРЕДМЕТЫ С СЕРЕДИНЫ КАТКИ
   ====================================================================== */
const ELITE_POOL = {
  carry:  ['kingSlayer', 'kinglandia', 'munition', 'eternalAegis', 'dianaPants', 'girfsyutin', 'titanHeart', 'satanic', 'aghanimHead', 'mantledSteel', 'galeBoots', 'bkb'],
  tank:   ['eternalAegis', 'titanHeart', 'girfsyutin', 'dianaPants', 'kingSlayer', 'satanic', 'munition', 'mantledSteel', 'galeBoots', 'bkb'],
  caster: ['sorcererCrown', 'archmageRobe', 'eternalAegis', 'titanHeart', 'dianaPants', 'girfsyutin', 'aghanimHead', 'galeBoots', 'satanic', 'bkb']
};
const JUNK = ['tango', 'mango', 'hatchet', 'timurPillow', 'windWaker'];
const ALWAYS_KEEP = ['pt', 'joelBoots', 'fangs', 'bkb'];

function itemValue(id){
  const r = RECIPES[id];
  if(r) return r.parts.reduce((s, p) => s + itemValue(p), 0) + (r.fee || 0);
  const it = SHOP_ITEMS[id];
  return it ? (it.totalCost || it.cost || 0) : 0;
}
function eliteGoals(h){
  const out = [];
  for(const id of (ELITE_POOL[roleOf(h)] || ELITE_POOL.carry)){
    if(!SHOP_ITEMS[id] || hasItem(h, id)) continue;
    let consumed = false;                 /* предмет уже вошёл в собранный рецепт (например, Сатаник внутри Сердца Титана) */
    for(const rid in RECIPES){ if(hasItem(h, rid) && RECIPES[rid].parts.includes(id)){ consumed = true; break; } }
    if(consumed) continue;
    out.push({id, value: itemValue(id)});
  }
  out.sort((a, b) => b.value - a.value);
  return out;
}
function costToComplete(h, id){
  if(RECIPES[id]) return recipeStatus(h, id).need;
  return (SHOP_ITEMS[id] && SHOP_ITEMS[id].cost) || 0;
}
function protectSet(h, goals){
  const set = new Set(ALWAYS_KEEP);
  for(const id of (ELITE_POOL[roleOf(h)] || [])) set.add(id);
  for(const g of goals.slice(0, 2)){ const r = RECIPES[g.id]; if(r) for(const p of r.parts) set.add(p); set.add(g.id); }
  return set;
}
/* Освобождаем слот: сначала расходники, потом самая дешёвая вещь (не из защищённых), возврат 50%. */
function makeRoom(h, protect, targetValue){
  if(freeSlots(h) > 0) return true;
  for(let i = 0; i < h.inventory.length; i++){
    const it = h.inventory[i];
    if(it && JUNK.includes(it.id) && !protect.has(it.id)){ h.inventory[i] = null; return true; }
  }
  let worst = -1, wv = Infinity;
  for(let i = 0; i < h.inventory.length; i++){
    const it = h.inventory[i]; if(!it || protect.has(it.id) || RECIPES[it.id]) continue;
    const v = itemValue(it.id);
    if(v < wv){ wv = v; worst = i; }
  }
  if(worst >= 0 && wv < targetValue * 0.5){
    const it = h.inventory[worst];
    revertItemStats(h, it.id);
    h.coins += Math.floor(((SHOP_ITEMS[it.id] && SHOP_ITEMS[it.id].cost) || 0) * 0.5);
    h.inventory[worst] = null;
    return true;
  }
  return false;
}
/* Купить обычный предмет (или компонент). */
function buyPlain(h, id, protect, targetValue){
  const item = SHOP_ITEMS[id];
  if(!item || h.coins < item.cost) return false;
  const completes = recipeCompletedBy(h, id);
  if(!completes && !makeRoom(h, protect, targetValue)) return false;
  if(completes) return craftRecipeItem(h, completes, true);
  const ok = botBuyItemById(h, id);
  if(ok) recipeAutoCraft(h);
  return ok;
}
/* Шаг к цели: купить предмет целиком, собрать рецепт или докупить самый дорогой доступный компонент. */
function advanceGoal(h, goal, protect){
  const id = goal.id;
  if(!RECIPES[id]) return buyPlain(h, id, protect, goal.value);
  const st = recipeStatus(h, id);
  if(st.owned) return false;
  if(h.coins >= st.need){
    if(!st.have.length && !makeRoom(h, protect, goal.value)) return false;
    return craftRecipeItem(h, id, true);
  }
  if(!st.missing.length) return false;                 /* все части есть, ждём золото на сборку */
  const parts = st.missing.slice().sort((a, b) => itemValue(b) - itemValue(a));
  for(const pid of parts){
    if(RECIPES[pid]) continue;
    if(h.coins >= (SHOP_ITEMS[pid] ? SHOP_ITEMS[pid].cost : Infinity) && buyPlain(h, pid, protect, goal.value)) return true;
  }
  return false;
}
function eliteStep(h){
  h.eliteSaving = 0;
  const goals = eliteGoals(h);
  if(!goals.length) return;
  const protect = protectSet(h, goals);
  const best = goals[0], need = costToComplete(h, best.id);
  if(advanceGoal(h, best, protect)) return;
  if(h.coins >= need * ELITE_SAVE_FRACTION){ h.eliteSaving = Math.min(h.coins, need); return; }
  for(let i = 1; i < goals.length; i++){ if(advanceGoal(h, goals[i], protect)) return; }
}

/* ======================================================================
   2. ВАРДЫ БОТОВ
   ====================================================================== */
let botWardSeq = 1;
const BOT_WARD_MAX_STOCK = 1;
const wardTeamCount = team => wards.filter(w => w.team === team && w.life > 0).length;
const teamStock = team => heroes.reduce((n, u) => n + (u.team === team && u.botWards ? u.botWards : 0), 0);
const desiredWards = () => Math.min(WARD_CFG.maxPerTeam - 1, gameTime < 240 ? 1 : (gameTime < 600 ? 2 : 3));

/* Вардер команды: живой бот, предпочтительно маг, затем самый низкий уровень. */
function warderOf(team){
  let best = null, bs = Infinity;
  for(const u of heroes){
    if(!isBotHero(u) || u.dead || u.team !== team) continue;
    const s = (roleOf(u) === 'caster' ? 0 : 1000) + (u.level || 1) * 10 + (u.coins || 0) / 1000;
    if(s < bs){ bs = s; best = u; }
  }
  return best;
}

/* --- геометрия: точки на реке и перед вражеской башней --- */
function riverCross(lane){
  const p = LANES[lane] || LANES[0];
  let best = null, bd = Infinity;
  for(let i = 0; i < p.length - 1; i++){
    const a = p[i], b = p[i + 1];
    for(let k = 0; k <= 20; k++){
      const t = k / 20, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t, d = Math.abs(x - y);
      if(d < bd){ bd = d; const len = Math.hypot(b.x - a.x, b.y - a.y) || 1; best = {x, y, fx: (b.x - a.x) / len, fy: (b.y - a.y) / len}; }
    }
  }
  return best;
}
function riverSpot(team, lane){
  const c = riverCross(lane), s = team === 0 ? 1 : -1;     /* путь линии идёт от базы команды 0 к базе команды 1 */
  return {x: c.x - c.fx * 180 * s, y: c.y - c.fy * 180 * s, why: 'river'};
}
function pushSpot(team, lane){
  const tw = TOWER_SPOTS.find(t => t.team === 1 - team && t.lane === lane && t.tier === 1);
  if(!tw) return null;
  const base = BASES[team], dx = base.x - tw.x, dy = base.y - tw.y, len = Math.hypot(dx, dy) || 1;
  return {x: tw.x + dx / len * 520, y: tw.y + dy / len * 520, why: 'push'};
}
function roshanSpot(team){
  const lair = getRoshanLair(), base = BASES[team], dx = base.x - lair.x, dy = base.y - lair.y, len = Math.hypot(dx, dy) || 1;
  return {x: lair.x + dx / len * 300, y: lair.y + dy / len * 300, why: 'roshan'};
}
function runeSpot(team){
  const spots = RUNE_SPOTS.slice().sort((a, b) => Math.hypot(a.x - BASES[team].x, a.y - BASES[team].y) - Math.hypot(b.x - BASES[team].x, b.y - BASES[team].y));
  return {x: spots[0].x, y: spots[0].y, why: 'rune'};
}
function candidateSpots(h){
  const team = h.team, lane = Number.isInteger(h.assignedLane) ? h.assignedLane : 0;
  const pushLane = (gameTime >= MID_PUSH_TIME && h.midPushAssignment) ? 0 : lane;
  const list = [];
  if(wardTeamCount(team) === 0) list.push(riverSpot(team, lane));
  if(gameTime >= 360){ const p = pushSpot(team, pushLane); if(p) list.push(p); }
  if(gameTime >= 150) list.push(roshanSpot(team));
  list.push(runeSpot(team), riverSpot(team, lane), riverSpot(team, 0), riverSpot(team, 1), riverSpot(team, 2));
  return list.filter(s => Number.isFinite(s.x) && Number.isFinite(s.y));
}
const covered = (team, s) => wards.some(w => w.team === team && w.life > 0 && Math.hypot(w.x - s.x, w.y - s.y) < 620);

/* Ставим вард рядом с точкой (ищем свободное место без деревьев/зданий). */
function placeBotWard(h, x, y){
  if(wardCount(h.team) >= WARD_CFG.maxPerTeam) return false;
  for(const r of [0, 70, 140, 210]){
    for(let k = 0; k < (r ? 8 : 1); k++){
      const a = k / 8 * Math.PI * 2, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      const chk = wardPlacementCheck(px, py, h);
      if(!chk.ok) continue;
      const d = {id: 'bw' + (botWardSeq++), team: h.team, x: px, y: py, life: WARD_CFG.duration};
      if(playerHero && h.team === playerHero.team) wardAdd(d);                /* союзные варды видны игроку */
      else wards.push({id: d.id, team: d.team, x: d.x, y: d.y, life: d.life, maxLife: d.life, born: performance.now() / 1000});   /* вражеские — без эффектов */
      h.botWards = Math.max(0, (h.botWards || 0) - 1);
      return true;
    }
  }
  return false;
}
function enemyNear(h, range){
  return heroes.some(u => u.type === 'hero' && !u.isIllusion && !u.dead && u.team !== h.team && u.team !== 2 &&
    !isHiddenFrom(u, h.team) && Math.hypot(u.x - h.x, u.y - h.y) <= range);
}
function errandOk(h, e){
  return !h.dead && (h.botWards || 0) > 0 && gameTime < e.until && (h.hp / h.maxHp) > 0.5 && !(h.stunTimer > 0) &&
    !enemyNear(h, 1100) && !covered(h.team, e);
}
function wardTick(h, dt){
  if(onlineMatchActive || !isBotHero(h) || h.dead || gameTime < 40){ h.wardErrand = null; return; }
  if(teamHeroes(h.team).length < 2) return;                      /* в дуэли 1 на 1 бот вардами не отвлекается */
  const e = h.wardErrand;
  if(e){
    if(!errandOk(h, e)){ h.wardErrand = null; h.wardCd = gameTime + 12; return; }
    if(Math.hypot(e.x - h.x, e.y - h.y) <= WARD_CFG.castRange - 170){
      if(placeBotWard(h, e.x, e.y)) h.wardCd = gameTime + 20; else h.wardCd = gameTime + 8;
      h.wardErrand = null;
    }
    return;
  }
  h.wardT = (h.wardT || 0) - dt;
  if(h.wardT > 0) return;
  h.wardT = 1.0;
  if(warderOf(h.team) !== h) return;
  /* покупка: в команде меньше нужного числа вардов (с учётом запаса) */
  if((h.botWards || 0) < BOT_WARD_MAX_STOCK && wardTeamCount(h.team) + teamStock(h.team) < desiredWards() &&
     h.coins >= WARD_CFG.cost + 30){
    h.coins -= WARD_CFG.cost;
    h.botWards = (h.botWards || 0) + 1;
    if(playerHero && h.team === playerHero.team) addText(h.x, h.y - 70, 'Observer Ward куплен', '#7be9ff', 1.0, 13);
  }
  if((h.botWards || 0) <= 0 || gameTime < (h.wardCd || 0)) return;
  if((h.hp / h.maxHp) < 0.6 || enemyNear(h, 1300)) return;
  for(const s of candidateSpots(h)){
    if(covered(h.team, s)) continue;
    const d = Math.hypot(s.x - h.x, s.y - h.y);
    if(d > 2400) continue;
    if(d <= WARD_CFG.castRange - 120){
      if(placeBotWard(h, s.x, s.y)){ h.wardCd = gameTime + 20; return; }
      continue;
    }
    h.wardErrand = {x: s.x, y: s.y, until: gameTime + 14, why: s.why};
    return;
  }
}

/* Идём к точке вылазки (после обычного AI, который каждый тик задаёт свою цель). */
function wardSteer(h){
  const e = h.wardErrand;
  if(!e || h.dead || onlineMatchActive) return;
  h.attackTarget = null; h.moveTarget = {x: e.x, y: e.y};
}

/* Герои врага в зоне обзора варда своей команды — видимая цель для бота. */
if(typeof botPickVisibleEnemy === 'function'){
  const _bpe = botPickVisibleEnemy;
  botPickVisibleEnemy = function(h){
    const own = _bpe.apply(this, arguments);
    if(own) return own;
    try {
      if(!isBotHero(h) || h.dead || gameTime < 120 || !wards.length || (h.hp / h.maxHp) < 0.55) return own;
      const mine = wards.filter(w => w.team === h.team && w.life > 0);
      if(!mine.length) return own;
      let best = null, bd = 1500;
      for(const u of heroes){
        if(u.type !== 'hero' || u.isIllusion || u.dead || u.team === h.team || u.team === 2 || u.invulnerable || isHiddenFrom(u, h.team)) continue;
        const d = Math.hypot(u.x - h.x, u.y - h.y);
        if(d >= bd) continue;
        if(mine.some(w => Math.hypot(w.x - u.x, w.y - u.y) <= WARD_CFG.radius)){ best = u; bd = d; }
      }
      return best || own;
    } catch(err){ warnOnce('pick', err); return own; }
  };
}

/* ======================================================================
   3. ТИК БОТА
   ====================================================================== */
const _uea = updateEnemyAI;
updateEnemyAI = function(h, dt){
  let hold = 0;
  try {
    if(isBotHero(h) && !h.dead && gameTime >= ELITE_TIME){
      h.eliteT = (h.eliteT || 0) - dt;
      if(h.eliteT <= 0){ h.eliteT = 1.2 + Math.random() * 0.6; eliteStep(h); }
      if(h.eliteSaving > 0) hold = Math.min(h.coins, h.eliteSaving);   /* копим: обычные покупки видят меньше золота */
    }
  } catch(err){ warnOnce('elite', err); hold = 0; }
  try { wardTick(h, dt); } catch(err){ warnOnce('ward', err); }   /* до обычных покупок: вард (50 монет) в приоритете */
  hold = Math.min(hold, Math.max(0, h.coins));
  if(hold > 0) h.coins -= hold;
  let r;
  try { r = _uea.apply(this, arguments); }
  finally { if(hold > 0) h.coins += hold; }
  try { wardSteer(h); } catch(err){ warnOnce('steer', err); }
  return r;
};
})();
