/* DotaSense 0.10.3.5 — предмет «Мозг Евсютина» и упрощённое постоянное мега-задание.
   • «Мозг Евсютина» (1260 монет, без рецепта): пассивно −20% к перезарядке способностей (на предметы не влияет),
     +100 к дальности атаки и +30% к скорости атаки. Бонусы считает общая система новых предметов (newItemStat / newItemMax),
     дальность добавляется здесь. Предмет можно иметь только один. Лежит в категории «Улучшения» рядом с Оторванным Глазом Мозгов.
   • Мега-задание «Легенда арены» теперь лежит во вкладке «Постоянные» (см. update01021.js), цели в 3 раза проще (см. accounts.js).
   Подключается после update01031.js. */
(function(){
'use strict';
const ID = 'evsyutinBrain';
const warn = (t, e) => { try { console.warn('update01035 ' + t + ':', e); } catch(_) {} };
if(typeof SHOP_ITEMS === 'undefined' || SHOP_ITEMS[ID]) return;

const cfg = {
  name:'Мозг Евсютина', icon:'❖', color:'#ff9ac8', cost:1260, active:false,
  cooldownReduction:0.20, attackRange:100, attackSpeedBonus:0.30,
  desc:'Пассивно: −20% к перезарядке способностей (на предметы не влияет), +100 к дальности атаки и +30% к скорости атаки.'
};
SHOP_ITEMS[ID] = cfg;
if(!SHOP_ITEM_IDS.includes(ID)) SHOP_ITEM_IDS.push(ID);
SHOP_CATEGORY_OF[ID] = 2;
SHOP_ITEM_VIEWS.push({...cfg, id:ID});
if(!NEW_RECIPE_ITEM_IDS.includes(ID)) NEW_RECIPE_ITEM_IDS.push(ID);   /* newItemStat/newItemMax: скорость атаки и перезарядка */
shopViewById = null;

/* Дальность атаки: Unit.getAttackRange знает только про Оторванный Глаз — добавляем бонус Мозга. */
try {
  const _gar = Unit.prototype.getAttackRange;
  Unit.prototype.getAttackRange = function(){
    let r = _gar.apply(this, arguments);
    if(this.inventory && this.inventory.some(i => i && i.id === ID)) r += SHOP_ITEMS[ID].attackRange;
    return r;
  };
} catch(err){ warn('range', err); }

/* Только один Мозг на героя (иначе бонусы сложились бы). */
try {
  const _bsi = buyShopItem;
  buyShopItem = function(id){
    if(id === ID && playerHero && heroHasItem(playerHero, ID)){ flashMsg(playerHero, 'Предмет уже куплен'); return false; }
    return _bsi.apply(this, arguments);
  };
} catch(err){ warn('buy', err); }
})();
