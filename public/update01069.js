/* DotaSense 0.10.6.9 — НОВЫЙ ГЕРОЙ «ПРОК».
   Тяжёлый стрелок: дальняя, но медленная атака с огромным уроном за выстрел (медленный снаряд, см. game.js — ветка 'prok').
     Q «Стальной панцирь» — 85% сопротивления урону на несколько секунд.
     W «Кровавый азарт»   — на 8 секунд здоровье −30%, урон атак +40%.
     E «Контузия»         — ударная волна вокруг героя: урон и оглушение.
     R «Контрольный»      — наносит ближайшему врагу 50% его текущего здоровья.
   Подключается после update01068.js. Модель — hero3d.js, иконки — skill-icons.js. */
(function(){
'use strict';
const warn = (t, e) => { if(!warn[t]){ warn[t] = 1; try { console.warn('update01069 ' + t + ':', e); } catch(_) {} } };
const snd = (k, v) => { try { playSynthSfx(k, {volume: v == null ? 1 : v}); } catch(e) {} };
const isProk = h => !!(h && h.def && h.def.id === 'prok');

const SHIELD_RESIST = 0.85, SHIELD_DUR = [0, 3, 3.5, 4, 4.5];
const RAGE_DUR = 8, RAGE_HP = 0.30, RAGE_DMG = 0.40;
const SHOCK_R = 300, SHOCK_DMG = [0, 90, 140, 190, 240], SHOCK_STUN = [0, 1.0, 1.2, 1.4, 1.6];
const ULT_PCT = 0.50, ULT_RANGE = 800;

const enemyOk = (t, team) => t && !t.dead && t.team !== team && t.team !== 2 && !isBuilding(t) && !isStructure(t) && !t.invulnerable && !isHiddenFrom(t, team);

Object.assign(SFX_PRESETS, {
  prokShield: {from:140, to:320, duration:0.5, type:'sawtooth', volume:0.09, noise:0.4, layers:[[600,900,0.05,0.3,'triangle',0.03]]},
  prokRage:   {from:90, to:200, duration:0.55, type:'sawtooth', volume:0.1, noise:0.55, layers:[[300,120,0,0.4,'square',0.06]]},
  prokBlast:  {from:220, to:50, duration:0.4, type:'square', volume:0.12, noise:0.8, layers:[[80,40,0,0.4,'sine',0.12]]}
});

Object.assign(SKILLS, {
  prokShield: {
    name:'Стальной панцирь', short:'Q', type:'self', maxLevel:4,
    cd:[0, 32, 30, 28, 26], mana:[0, 70, 80, 90, 100],
    desc:'Прок прячется за бронёй: +85% сопротивления урону на 3/3,5/4/4,5 секунды (со скипетром Аганима +2 секунды). Весь входящий урон снижается на 85%.',
    cast(h, x, y, lvl){
      const L = Math.max(1, Math.min(4, lvl || 1));
      const dur = SHIELD_DUR[L] + (hasScepter(h) ? 2 : 0);
      h.prokShield = {t:dur, dur:dur};
      fxRing(h.x, h.y, 110, '#9fb4c8', 0.5); fxRing(h.x, h.y, 180, '#ffb13b', 0.7);
      spawnParticles(h.x, h.y, '#c8d4e0', 16, 1.1);
      addText(h.x, h.y - 82, 'ПАНЦИРЬ +85%', '#bcd0e4', 1.3, 18);
      snd('prokShield', 1);
      return true;
    }
  },
  prokRage: {
    name:'Кровавый азарт', short:'W', type:'self', maxLevel:4,
    cd:[0, 26, 24, 22, 20], mana:[0, 60, 65, 70, 75],
    desc:'На 8 секунд максимальное здоровье Прока уменьшается на 30%, а урон атак увеличивается на 40%. Когда эффект кончается, здоровье возвращается (потерянные очки здоровья не лечатся).',
    cast(h){
      if(h.prokRage){ h.prokRage.t = RAGE_DUR; }
      else {
        const lost = Math.round(h.maxHp * RAGE_HP);
        h.maxHp = Math.max(1, h.maxHp - lost);
        h.hp = Math.max(1, Math.min(h.hp, h.maxHp));
        h.prokRage = {t:RAGE_DUR, lost:lost};
      }
      fxRing(h.x, h.y, 130, '#ff3a2a', 0.6);
      spawnParticles(h.x, h.y, '#ff5a3a', 22, 1.2);
      addText(h.x, h.y - 82, 'АЗАРТ: УРОН +40%', '#ff6a4a', 1.3, 18);
      snd('prokRage', 1);
      return true;
    }
  },
  prokShock: {
    name:'Контузия', short:'E', type:'self', maxLevel:4,
    cd:[0, 18, 16, 14, 12], mana:[0, 90, 100, 110, 120],
    desc:'Ударная волна вокруг героя (радиус 300): враги получают 90/140/190/240 урона и оглушаются на 1/1,2/1,4/1,6 секунды. Спасает, когда враг подбежал вплотную.',
    cast(h, x, y, lvl){
      const L = Math.max(1, Math.min(4, lvl || 1));
      for(const u of units){
        if(!enemyOk(u, h.team)) continue;
        if(Math.hypot(u.x - h.x, u.y - h.y) > SHOCK_R + (u.radius || 0)) continue;
        applyDamage(u, abilityDamage(h, SHOCK_DMG[L]), h);
        if(!u.dead) u.stunTimer = Math.max(u.stunTimer || 0, SHOCK_STUN[L] * (1 - (typeof statusResistOf === 'function' ? statusResistOf(u) : 0)));
      }
      fxRing(h.x, h.y, SHOCK_R, '#ffb13b', 0.6); fxRing(h.x, h.y, SHOCK_R * 0.6, '#fff2b0', 0.45);
      spawnParticles(h.x, h.y, '#ffd27a', 26, 1.5);
      addText(h.x, h.y - 82, 'КОНТУЗИЯ!', '#ffb13b', 1.2, 18);
      snd('prokBlast', 1);
      return true;
    }
  },
  prokUlt: {
    name:'Контрольный', short:'R', type:'self', maxLevel:3, ult:true,
    cd:[0, 70, 58, 46], mana:[0, 180, 220, 260],
    desc:'Прок бьёт в ближайшего врага (радиус 800, вражеские герои в приоритете) и отнимает 50% его текущего здоровья. Урон чистый — броня и усиления способностей его не меняют. Со скипетром Аганима — 60%.',
    cast(h, x, y, lvl){
      let best = null, bd = 1e12, bestHero = null, bhd = 1e12;
      for(const u of units){
        if(!enemyOk(u, h.team)) continue;
        const d = Math.hypot(u.x - h.x, u.y - h.y);
        if(d > ULT_RANGE) continue;
        if(d < bd){ bd = d; best = u; }
        if(u.type === 'hero' && d < bhd){ bhd = d; bestHero = u; }
      }
      const t = bestHero || best;
      if(!t){ flashMsg(h, 'Нет врагов рядом'); return false; }
      const pct = ULT_PCT + (hasScepter(h) ? 0.10 : 0);
      const dmg = Math.max(1, t.hp * pct);
      h.facing = Math.atan2(t.y - h.y, t.x - h.x);
      fxBeam(h.x, h.y, t.x, t.y, '#ffb13b', 0.35);
      fxRing(t.x, t.y, 120, '#ff3a2a', 0.7);
      spawnParticles(t.x, t.y, '#ffd27a', 40, 1.6);
      applyDamage(t, dmg, {team:h.team, source:h, trueDamage:true, skipAbilityScaling:true});
      addText(t.x, t.y - 70, 'КОНТРОЛЬНЫЙ −' + Math.round(pct * 100) + '%', '#ff6a4a', 1.4, 20);
      snd('prokBlast', 1);
      return true;
    }
  }
});

/* сопротивление урону (Q) */
{
  const _ad = applyDamage;
  applyDamage = function(target, amount, source){
    if(target && target.prokShield && target.prokShield.t > 0 && amount > 0) amount *= (1 - SHIELD_RESIST);
    return _ad.call(this, target, amount, source);
  };
}
/* +40% урона атак (W) */
{
  const _gd = Unit.prototype.getDamage;
  Unit.prototype.getDamage = function(){
    const d = _gd.apply(this, arguments);
    return (this.prokRage && this.prokRage.t > 0) ? d * (1 + RAGE_DMG) : d;
  };
}
function endRage(h){
  const r = h.prokRage; if(!r) return;
  h.maxHp += r.lost;           /* здоровье возвращается, текущее не лечится */
  h.prokRage = null;
}

const _t = fx973Tick;
fx973Tick = function(dt){
  _t.apply(this, arguments);
  try {
    if(typeof gameState !== 'undefined' && gameState !== 'playing') return;
    if(dt > 0.25) dt = 0.25;
    for(const h of heroes){
      if(h.prokShield){ if(h.dead){ h.prokShield = null; } else { h.prokShield.t -= dt; if(h.prokShield.t <= 0) h.prokShield = null; } }
      if(h.prokRage){ if(h.dead){ endRage(h); } else { h.prokRage.t -= dt; if(h.prokRage.t <= 0) endRage(h); } }
    }
  } catch(err){ warn('tick', err); }
};

/* ---------- регистрация героя ---------- */
{
  if(!HERO_DEFS.some(d => d.id === 'prok')){
    const def = {
      id:'prok', name:'Прок', title:'Тяжёлый стрелок', color:'#4a3a32', color2:'#ffb13b',
      baseHp:720, hpPerLvl:84, baseMp:300, mpPerLvl:38, baseDmg:128, dmgPerLvl:10, abilityDamageScale:1, damageScale:1, speed:150,
      atkRange:600, atkTime:2.0, baseArmor:4, armorPerLvl:0.55, vision:1200, hpRegen:1.8, mpRegen:2.2,
      skills:['prokShield','prokRage','prokShock','prokUlt']
    };
    HERO_STAT_BALANCE.prok = [def.baseHp, def.hpPerLvl, def.baseDmg, def.dmgPerLvl, def.abilityDamageScale];
    HERO_DEFS.push(def);
  }
  ATK_STYLE.prok = {r:'bullet', long:true};
  SCEPTER_UPGRADES.prok = 'Панцирь держится на 2 секунды дольше, Контрольный забирает 60% здоровья';
  HERO_TALENTS.prok = [['+300 к здоровью', {maxHp:300, hp:300}], ['+40 к урону', {damage:40}], ['+15% к скорости', {speedPercent:0.15}], ['+8 к броне', {armor:8}], ['+50 к урону', {damage:50}]];
  if(typeof HERO_GUIDES !== 'undefined'){
    HERO_GUIDES.prok = {
      role:'Прок: тяжёлый стрелок, медленные, но огромные выстрелы',
      style:'Бьёт издалека редко, но очень больно: снаряд летит медленно, поэтому цельтесь вперёд. Панцирь превращает его в стену, Азарт даёт взрывной урон ценой здоровья, Контузия отбрасывает тех, кто подбежал, а ульта забирает половину здоровья ближайшего врага.',
      skills:[0, 1, 2, 3],
      skillNote:'Стальной панцирь (Q) — +85% сопротивления урону на несколько секунд. Кровавый азарт (W) — на 8 секунд здоровье −30%, урон +40%. Контузия (E) — урон и оглушение вокруг. Контрольный (R) — 50% текущего здоровья ближайшего врага.',
      build:['joelBoots', 'brainEye', 'pt', 'semenHead', 'kingSlayer', 'bkb'],
      tips:['Включайте Панцирь, когда по вам фокусят, а не заранее — он короткий.', 'Азарт делает вас хрупким: жмите его только когда враги не могут быстро добить.', 'Ульта лучше всего работает по врагу с полным здоровьем — берегите её для самого опасного героя.']
    };
  }
}
})();
