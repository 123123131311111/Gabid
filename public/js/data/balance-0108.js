/* =========================================================
   DotaSense 0.10.8 — БАЛАНС: «БЛИЖНИЙ БОЙ»
   Подключается после всех update*.js — правит итоговые значения HERO_DEFS (после всех прошлых патчей).
   Ближники (дальность атаки ≤ 250):
     • здоровье +8%, прирост здоровья +6%, броня +1, урон +6%, скорость +10, реген +0.6
     • атака на 5% быстрее
     • «Закалка»: −15% урона от крипов и башен (стоять на линии и заходить под башню легче)
   Дальники (дальность ≥ 400):
     • здоровье −3%, прирост здоровья −3% (чуть уязвимее, если до них добрались)
   Синхронно: server.js — та же «Закалка» против выстрелов башен в онлайне (MELEE_TOWER_MUL).
   ========================================================= */
(function(){
'use strict';
if(typeof HERO_DEFS === 'undefined' || !Array.isArray(HERO_DEFS)) return;
const MELEE_MAX_RANGE = 250, RANGED_MIN_RANGE = 400;
const r2 = v => Math.round(v * 100) / 100;
const BAL = window.__balance0108 = {melee: [], ranged: [], creepTowerMul: 0.85};
for(const d of HERO_DEFS){
  if(!d || d.__bal0108) continue;
  d.__bal0108 = true;
  const range = d.atkRange || 0;
  if(range > 0 && range <= MELEE_MAX_RANGE){
    d.baseHp = Math.round(d.baseHp * 1.08);
    d.hpPerLvl = r2(d.hpPerLvl * 1.06);
    d.baseArmor = r2((d.baseArmor || 0) + 1);
    d.baseDmg = r2(d.baseDmg * 1.06);
    d.speed = Math.round((d.speed || 150) + 10);
    d.hpRegen = r2((d.hpRegen || 0) + 0.6);
    if(d.atkTime) d.atkTime = r2(d.atkTime * 0.95);
    d.meleeBonus0108 = true;
    BAL.melee.push(d.id);
  } else if(range >= RANGED_MIN_RANGE){
    d.baseHp = Math.round(d.baseHp * 0.97);
    d.hpPerLvl = r2(d.hpPerLvl * 0.97);
    BAL.ranged.push(d.id);
  }
}
/* «Закалка» ближников: меньше урона от крипов и башен */
if(typeof applyDamage === 'function'){
  const orig = applyDamage;
  applyDamage = function(target, amount, source){
    if(target && source && amount > 0 && target.type === 'hero' && target.def && target.def.meleeBonus0108 &&
       (source.type === 'creep' || source.type === 'tower' || source.type === 'ancient')){
      arguments[1] = amount * BAL.creepTowerMul;
    }
    return orig.apply(this, arguments);
  };
}
})();
