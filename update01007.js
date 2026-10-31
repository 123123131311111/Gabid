/* DotaSense 0.10.0.7 — КРАСНЫЙ ДЕМОН В МЕНЮ + ТРИ НОВЫХ СКИНА.
   • Демон меню всегда красный («Владыка Пепла»), а свет, руны, круг и искры за ним красные независимо от режима.
   • Скины: Голли «Золотой король» (rare), Джаггернаут «Нефритовый самурай» (epic), Ригина «Лунная жрица» (legendary).
   Цвета скинов лежат в hero3d.js (SKIN_TINTS), цены — в accounts.js. Только визуал. Подключается после update01005.js. */
(function(){
'use strict';
const G = (typeof window !== 'undefined') ? window : globalThis;

/* ---------- скины ---------- */
try {
  const defs = [
    {id:'gollyGold', name:'ЗОЛОТОЙ КОРОЛЬ', heroId:'golly', rarity:'rare', price:341, accent:'#ffd24a', border:'#a8791a', previewHero:'golly', previewColor:'#3a2606', previewColor2:'#ffe08a', weaponColor:'#ffd24a',
     desc:'Голли в золотой королевской броне с тёмной бронзой. Блестит ярче любой казны. Не меняет характеристики.', hint:'Виден, когда выбран Голли.'},
    {id:'juggernautJade', name:'НЕФРИТОВЫЙ САМУРАЙ', heroId:'juggernaut', rarity:'epic', price:569, accent:'#4de3a0', border:'#1f8a5e', previewHero:'juggernaut', previewColor:'#0c2e22', previewColor2:'#8dffc9', weaponColor:'#4de3a0',
     desc:'Джаггернаут в нефритово-зелёной броне воина-самурая. Клинок светится холодным зелёным светом. Не меняет характеристики.', hint:'Виден, когда выбран Джаггернаут.'},
    {id:'reginaMoon', name:'ЛУННАЯ ЖРИЦА', heroId:'regina', rarity:'legendary', price:910, accent:'#b9b4ff', border:'#5a52b8', previewHero:'regina', previewColor:'#171340', previewColor2:'#e6e2ff', weaponColor:'#b9b4ff',
     desc:'Легендарный образ Ригины: серебристо-лавандовое одеяние и холодные лунные блики. Не меняет характеристики.', hint:'Виден, когда выбрана Ригина.'}
  ];
  for(const d of defs){ if(!SKIN_BY_ID[d.id]){ SKIN_DEFS.push(d); SKIN_BY_ID[d.id] = d; } }
} catch(err) { console.warn('update01007 skins', err); }

/* ---------- красный демон ---------- */
try {
  const H3 = G.Hero3D, M = G.menuDemon0105;
  if(M && M.set) M.set(0);                       /* вариант 0 = «Владыка Пепла» (алый) */
  const RED = {glow:[255,48,40], accentLight:[255,96,70], hover:[255,70,50], ring:[255,60,44], spark1:[255,120,60], spark2:[255,70,50]};
  if(H3 && H3.models && H3.models.menuDemon){
    const prev = H3.models.menuDemon;
    H3.models.menuDemon = function(S, def, t){
      if(M && M.set) M.set(0);
      const d = Object.assign({}, def || {}, {color2: '#ff3a2a'});
      return prev.call(this, S, d, t);
    };
  }
  if(typeof dsDrawWarriorArt === 'function' && typeof dsC === 'function'){
    const prevArt = dsDrawWarriorArt;
    dsDrawWarriorArt = function(){
      const orig = dsC;
      dsC = function(key, a){ const c = RED[key]; if(!c) return orig(key, a);
        return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a === undefined ? 1 : a) + ')'; };
      try { return prevArt.apply(this, arguments); } finally { dsC = orig; }
    };
  }
} catch(err) { console.warn('update01007 demon', err); }
})();
