/* DotaSense 0.9.7.4 — «ПСИХ»: новый герой, 3 особых предмета. Подключается поверх game.js. */
(function(){
'use strict';
const G = window, TAU = Math.PI * 2;
const lvlOf = (h, id) => { const s = h && h.skills && h.skills.find(k => k.id === id); return s ? (s.level || 0) : 0; };
const isPsih = h => !!(h && h.def && h.def.id === 'psih');
const foesOf = h => units.filter(u => !u.dead && u.team !== h.team && u.team !== 2 && !isBuilding(u) && !isStructure(u) && !u.invulnerable);

/* ---------- звуки ---------- */
Object.assign(SFX_PRESETS, {
  psihStab: {from:1100, to:50, duration:0.4, type:'sawtooth', volume:0.2, noise:1.0, layers:[[70,26,0,0.6,'sine',0.25],[2000,260,0,0.14,'square',0.09],[240,55,0.03,0.35,'sawtooth',0.12]]},
  psihHide: {from:700, to:120, duration:0.3, type:'sine', volume:0.04, layers:[[300,60,0,0.4,'triangle',0.04]]},
  psihLaugh: {from:500, to:900, duration:0.5, type:'square', volume:0.035, layers:[[620,320,0.1,0.4,'sawtooth',0.03],[800,400,0.25,0.4,'square',0.025]]},
  chrono: {from:900, to:90, duration:0.6, type:'sine', volume:0.07, noise:0.3, layers:[[1500,200,0,0.5,'triangle',0.05]]},
  reap: {from:400, to:70, duration:0.4, type:'sawtooth', volume:0.08, noise:0.8, layers:[[90,40,0,0.5,'sine',0.1]]},
  phoenix: {from:300, to:1400, duration:0.5, type:'triangle', volume:0.07, noise:0.5, layers:[[600,2000,0.1,0.5,'sine',0.05]]}
});
const snd = (k, v) => { try { playSynthSfx(k, {volume: v == null ? 1 : v}); } catch(e) {} };
const shakeScreen = (m, d) => { const F = G.__fx973; if(F){ F.shakeMag = Math.max(F.shakeMag, m); F.shakeT = F.shakeDur = d; } };

/* ---------- 3 особых предмета ---------- */
const NEW_ITEMS = {
  chronoHourglass: {name:'Часы Хроноса', icon:'⌛', cost:3300, color:'#8fe3ff', active:true, manaCost:120, cooldown:55, radius:450, stun:2.5, damage:250,
    desc:'Активный: останавливает время в радиусе 450 — все враги оглушены на 2,5 сек. и получают 250 магического урона, а герой получает +20% скорости на 5 сек. КД 55 сек.'},
  reaperScythe: {name:'Коса Жнеца', icon:'☽', cost:3800, color:'#b04cff', active:true, manaCost:100, cooldown:32, radius:500, pct:0.14, minDmg:200, heal:0.6, bonusDamage:160,
    desc:'Пассивно: +160 к урону атак. Активный «Жатва»: враги в радиусе 500 теряют 14% максимального здоровья (минимум 200 магического урона), а герой лечится на 60% нанесённого урона. КД 32 сек.'},
  phoenixFeather: {name:'Перо Феникса', icon:'✺', cost:3000, color:'#ff8a3d', active:true, manaCost:80, cooldown:75, hp:350, radius:350, damage:400, invulnTime:3, healPct:0.3,
    desc:'Пассивно: +350 к максимальному здоровью. Активный: на 3 сек. неуязвимость, лечение 30% максимального здоровья и огненная волна на 400 урона вокруг. КД 75 сек.'}
};
for(const id in NEW_ITEMS){
  SHOP_ITEMS[id] = NEW_ITEMS[id];
  if(!SHOP_ITEM_IDS.includes(id)) SHOP_ITEM_IDS.push(id);
  SHOP_CATEGORY_OF[id] = 4;
  SHOP_ITEM_VIEWS.push({...NEW_ITEMS[id], id});
  NULLIFY_BLOCKED_ITEMS.add(id);
}
shopViewById = null;

const ITEM_USE = {
  chronoHourglass(h, item){
    const c = SHOP_ITEMS.chronoHourglass; let n = 0;
    for(const u of foesOf(h)){
      if(Math.hypot(u.x - h.x, u.y - h.y) > c.radius) continue;
      u.stunTimer = Math.max(u.stunTimer || 0, c.stun);
      applyDamage(u, c.damage, {team:h.team, source:h, magic:true}); n++;
    }
    h.addBuff({type:'spd', id:'chronoSpd', val:0.2, t:5});
    item.cooldown = c.cooldown;
    fxRing(h.x, h.y, c.radius, '#8fe3ff', 0.8); fxRing(h.x, h.y, c.radius * 0.5, '#ffffff', 0.5);
    spawnParticles(h.x, h.y, '#8fe3ff', 40, 1.2);
    addText(h.x, h.y - 70, 'ВРЕМЯ ОСТАНОВЛЕНО' + (n ? ' ×' + n : ''), '#8fe3ff', 1.2, 17);
    snd('chrono'); return true;
  },
  reaperScythe(h, item){
    const c = SHOP_ITEMS.reaperScythe; let total = 0;
    for(const u of foesOf(h)){
      if(Math.hypot(u.x - h.x, u.y - h.y) > c.radius) continue;
      const d = Math.max(c.minDmg, u.maxHp * c.pct);
      applyDamage(u, d, {team:h.team, source:h, magic:true}); total += d;
    }
    if(total > 0) h.hp = Math.min(h.maxHp, h.hp + Math.min(1500, total * c.heal) * healAmpOf(h));
    item.cooldown = c.cooldown;
    fxRing(h.x, h.y, c.radius, '#b04cff', 0.7); spawnParticles(h.x, h.y, '#d9a0ff', 36, 1.1);
    addText(h.x, h.y - 70, 'ЖАТВА' + (total ? ': +' + Math.round(Math.min(1500, total * c.heal)) + ' HP' : ''), '#d9a0ff', 1.2, 17);
    snd('reap'); shakeScreen(5, 0.3); return true;
  },
  phoenixFeather(h, item){
    const c = SHOP_ITEMS.phoenixFeather;
    h.invulnerable = true; h._phxT = c.invulnTime;
    h.hp = Math.min(h.maxHp, h.hp + h.maxHp * c.healPct * healAmpOf(h));
    for(const u of foesOf(h)) if(Math.hypot(u.x - h.x, u.y - h.y) <= c.radius) applyDamage(u, c.damage, {team:h.team, source:h, magic:true});
    item.cooldown = c.cooldown;
    fxRing(h.x, h.y, c.radius, '#ff8a3d', 0.8); fxRing(h.x, h.y, c.radius * 0.6, '#ffd36a', 0.6);
    spawnParticles(h.x, h.y, '#ff8a3d', 46, 1.3);
    addText(h.x, h.y - 70, 'ВОЗРОЖДЕНИЕ В ОГНЕ', '#ffb35c', 1.3, 17);
    snd('phoenix'); return true;
  }
};
const _pia = performInventoryItemActivation;
performInventoryItemActivation = function(hero, index){
  const item = hero.inventory[index];
  if(item && ITEM_USE[item.id]){
    if(hero.nullifyTimer > 0){ flashMsg(hero, 'Нуллификатор: предмет заблокирован'); return false; }
    if(item.cooldown > 0){ flashMsg(hero, item.name + ' на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    return ITEM_USE[item.id](hero, item);
  }
  return _pia.apply(this, arguments);
};
const _ais = applyItemStats;
applyItemStats = function(hero, id){
  if(id === 'phoenixFeather'){ hero.maxHp += SHOP_ITEMS.phoenixFeather.hp; hero.hp += SHOP_ITEMS.phoenixFeather.hp; return; }
  return _ais.apply(this, arguments);
};
const _gd = Unit.prototype.getDamage;
Unit.prototype.getDamage = function(){
  let d = _gd.apply(this, arguments);
  if(this.inventory && this.inventory.some(i => i && i.id === 'reaperScythe')) d += SHOP_ITEMS.reaperScythe.bonusDamage;
  return d;
};

/* иконки предметов */
const _dii = drawItemIcon;
drawItemIcon = function(item, x, y, s){
  if(!item || !NEW_ITEMS[item.id]) return _dii.apply(this, arguments);
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.shadowColor = item.color; ctx.shadowBlur = 12;
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  if(item.id === 'chronoHourglass'){
    ctx.strokeStyle = '#e8fbff'; ctx.fillStyle = 'rgba(143,227,255,.55)';
    ctx.beginPath(); ctx.moveTo(-s*.28,-s*.42); ctx.lineTo(s*.28,-s*.42); ctx.lineTo(s*.04,0); ctx.lineTo(s*.28,s*.42); ctx.lineTo(-s*.28,s*.42); ctx.lineTo(-s*.04,0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-s*.16,s*.4); ctx.lineTo(s*.16,s*.4); ctx.lineTo(0,s*.15); ctx.fill();
  } else if(item.id === 'reaperScythe'){
    ctx.strokeStyle = '#5b3d27'; ctx.beginPath(); ctx.moveTo(-s*.25,s*.45); ctx.lineTo(s*.2,-s*.4); ctx.stroke();
    ctx.strokeStyle = '#e6d4ff'; ctx.fillStyle = '#b04cff'; ctx.beginPath(); ctx.moveTo(s*.2,-s*.4); ctx.quadraticCurveTo(-s*.35,-s*.55,-s*.38,-s*.05); ctx.quadraticCurveTo(-s*.2,-s*.3,s*.2,-s*.32); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else {
    const g = ctx.createLinearGradient(0,-s*.45,0,s*.45); g.addColorStop(0,'#fff1a8'); g.addColorStop(.5,'#ff8a3d'); g.addColorStop(1,'#c2301a');
    ctx.fillStyle = g; ctx.strokeStyle = '#ffe2a0';
    ctx.beginPath(); ctx.moveTo(s*.05,-s*.46); ctx.quadraticCurveTo(s*.38,-s*.1,s*.02,s*.38); ctx.quadraticCurveTo(-s*.05,s*.1,-s*.3,-s*.02); ctx.quadraticCurveTo(-s*.12,-s*.3,s*.05,-s*.46); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,s*.35); ctx.lineTo(-s*.1,s*.47); ctx.stroke();
  }
  ctx.restore();
};

/* ---------- ПСИХ ---------- */
const PSIH_AS = [0, 0.25, 0.35, 0.45, 0.55], PSIH_RED = [0, 0.08, 0.12, 0.16, 0.20];
Object.assign(SKILLS, {
  psihQ: {
    name:'Тишина в голове', short:'Q', type:'self', maxLevel:4,
    cd:[0,22,20,18,16], mana:[0,60,65,70,75],
    desc:'Активно: Псих становится невидимым на 7,5–12 сек. и бежит быстрее на 15%. Вражеские герои не видят его и не могут выбрать целью. Первая обычная атака раскрывает его.',
    cast(h, x, y, lvl){
      const dur = 6 + lvl * 1.5;
      h.invisible = true; h.undetectable = true; h.tribuInvisibilityTimer = dur;
      h.addBuff({type:'spd', id:'psihHideSpd', val:0.15, t:dur});
      fxRing(h.x, h.y, 90, '#7a4bc9', 0.6); spawnParticles(h.x, h.y, '#b6ff3a', 26, 0.9);
      addText(h.x, h.y - 72, 'ИСЧЕЗ', '#c9a0ff', 1.0, 16); snd('psihHide');
    }
  },
  psihW: {
    name:'Безумие', short:'W', type:'self', passive:true, maxLevel:4,
    cd:[0,0,0,0,0], mana:[0,0,0,0,0],
    desc:'Пассивно: +25/35/45/55% к скорости атаки и -8/12/16/20% получаемого урона. Боль только заводит Психа.',
    cast(){}
  },
  psihE: {
    name:'Привет сзади', short:'E', type:'self', maxLevel:4,
    cd:[0,14,13,12,11], mana:[0,90,100,110,120], range:900,
    desc:'Мгновенно появляется за спиной ближайшего врага (предпочитает героев, до 900) и наносит огромный урон под оглушительный звук. Из невидимости удар сильнее на 40%.',
    cast(h, x, y, lvl){
      const foes = foesOf(h).filter(u => Math.hypot(u.x - h.x, u.y - h.y) <= 900 && !isHiddenFrom(u, h.team));
      const hs = foes.filter(u => u.type === 'hero' && !u.isIllusion);
      const pool = hs.length ? hs : foes;
      let t = null, bd = 1e9;
      for(const u of pool){ const d = Math.hypot(u.x - h.x, u.y - h.y); if(d < bd){ bd = d; t = u; } }
      if(!t){ flashMsg(h, 'Рядом нет врагов'); return false; }
      const f = (t.facing != null && isFinite(t.facing)) ? t.facing : Math.atan2(t.y - h.y, t.x - h.x);
      const gap = t.radius + h.radius + 8;
      fxRing(h.x, h.y, 60, '#7a4bc9', 0.4); spawnParticles(h.x, h.y, '#b6ff3a', 18, 0.7);
      h.x = clamp(t.x - Math.cos(f) * gap, 60, WORLD - 60); h.y = clamp(t.y - Math.sin(f) * gap, 60, WORLD - 60);
      h.facing = Math.atan2(t.y - h.y, t.x - h.x); h.moveTarget = null; h.attackTarget = t;
      let dmg = 120 + lvl * 100 + h.getDamage() * 0.8;
      if(h.invisible && h.tribuInvisibilityTimer > 0){
        dmg *= 1.4; h.invisible = false; h.undetectable = false; h.tribuInvisibilityTimer = 0;
        h.buffs = h.buffs.filter(b => b.id !== 'psihHideSpd');
      }
      applyDamage(t, abilityDamage(h, dmg), h);
      fxRing(t.x, t.y, 120, '#ff3b5c', 0.5); fxBeam(h.x, h.y, t.x, t.y, '#ff3b5c', 0.3); spawnParticles(t.x, t.y, '#ff3b5c', 30, 1.1);
      addText(t.x, t.y - 60, 'ПРИВЕТ! -' + Math.round(dmg), '#ff5577', 1.2, 19);
      snd('psihStab', 1.4); snd('psihLaugh', 0.8); shakeScreen(9, 0.4);
    }
  },
  psihR: {
    name:'Мы — одно целое', short:'R', type:'self', maxLevel:3, ult:true,
    cd:[0,100,85,70], mana:[0,150,200,250],
    desc:'Призывает 6 копий Психа на 25 секунд. Копии бегут по всей карте за вражескими героями (каждая выбирает свою цель) и бьют их. Со скипетром Аганима — 8 копий.',
    cast(h, x, y, lvl){
      const n = hasScepter(h) ? 8 : 6, hp = 350 + lvl * 150, dmg = h.getDamage() * (0.4 + lvl * 0.1);
      for(let i = 0; i < n; i++){
        const a = i * TAU / n, c = new PsihClone(h, clamp(h.x + Math.cos(a) * 70, 60, WORLD - 60), clamp(h.y + Math.sin(a) * 70, 60, WORLD - 60), {
          kind:'illusion', life:25, hp, dmg, radius:h.radius, speed:h.getSpeed() * 1.12, atkRange:h.atkRange, atkTime:Math.max(0.6, h.getAttackTime()),
          armor:h.getArmor(), copyColor:h.def.color, copyDef:h.def, isIllusion:true, damageTakenMultiplier:1.5
        });
        c.level = h.level; c.cloneIndex = i; c.skinId = h.skinId; units.push(c);
        fxRing(c.x, c.y, 46, '#b6ff3a', 0.4);
      }
      addText(h.x, h.y - 90, 'МЫ — ОДНО ЦЕЛОЕ', '#b6ff3a', 1.5, 19);
      fxRing(h.x, h.y, 220, '#7a4bc9', 0.8); spawnParticles(h.x, h.y, '#b6ff3a', 40, 1.2); snd('psihLaugh', 1.2);
    }
  }
});

class PsihClone extends TimedSummon {
  updateAI(dt){
    this.life -= dt;
    if(this.life <= 0){ this.dead = true; fxRing(this.x, this.y, 50, '#7a4bc9', 0.4); return; }
    let t = this.attackTarget;
    if(t && (t.dead || isHiddenFrom(t, this.team))) t = this.attackTarget = null;
    this.rt = (this.rt || 0) - dt;
    if(!t || this.rt <= 0){
      this.rt = 0.8;
      const hs = heroes.filter(u => u.team !== this.team && u.team !== 2 && !u.dead && u.type === 'hero' && !u.isIllusion && !isHiddenFrom(u, this.team));
      let pick = hs.length ? hs[this.cloneIndex % hs.length] : null;
      if(!pick){
        let bd = 1e9;
        for(const u of units){
          if(u.dead || u.team === this.team || u.team === 2 || isHiddenFrom(u, this.team) || u.invulnerable) continue;
          const d = this.distTo(u); if(d < bd){ bd = d; pick = u; }
        }
      }
      this.attackTarget = pick;
    }
    this.moveTarget = this.attackTarget ? null : {x:this.owner.x, y:this.owner.y};
  }
}

/* пассивка W и урон */
const _ad = applyDamage;
applyDamage = function(target, amount, source){
  if(isPsih(target) && !target.dead){ const l = lvlOf(target, 'psihW'); if(l > 0) amount *= 1 - PSIH_RED[l]; }
  return _ad.call(this, target, amount, source);
};
const _t = fx973Tick;
fx973Tick = function(dt){
  _t.apply(this, arguments);
  for(const h of heroes){
    if(h._phxT > 0){ h._phxT -= dt; if(h._phxT <= 0){ h.invulnerable = false; h._phxT = 0; } }
    if(!isPsih(h) || h.dead) continue;
    const l = lvlOf(h, 'psihW'); if(l <= 0) continue;
    let b = h.buffs.find(k => k.id === 'psihMadness');
    if(!b){ b = {type:'as', id:'psihMadness', val:PSIH_AS[l], t:1}; h.addBuff(b); } else { b.val = PSIH_AS[l]; b.t = 1; }
  }
};

/* ---------- регистрация героя ---------- */
const def = {
  id:'psih', name:'Псих', title:'Безумный убийца', color:'#6b3fa0', color2:'#b6ff3a',
  baseHp:700, hpPerLvl:88, baseMp:280, mpPerLvl:36, baseDmg:66, dmgPerLvl:6.5, abilityDamageScale:1, damageScale:1, speed:200,
  atkRange:150, atkTime:0.95, baseArmor:3, armorPerLvl:0.5, vision:1000, hpRegen:2, mpRegen:2,
  skills:['psihQ','psihW','psihE','psihR'],
  weapon:{type:'dualBlades', color:'#e9eef5', size:1.0, followFacing:true}
};
HERO_STAT_BALANCE.psih = [700, 88, 66, 6.5, 1];
HERO_DEFS.push(def);
ATK_STYLE.psih = {m:'slash', w:0.9};
SCEPTER_UPGRADES.psih = 'Ульта призывает 8 копий вместо 6';
HERO_TALENTS.psih = [['+250 к здоровью', {maxHp:250, hp:250}], ['+30 к урону', {damage:30}], ['+15% к скорости', {speedPercent:0.15}], ['+15 к броне', {armor:15}], ['+20% к урону способностей', {spellAmp:0.20}]];
HERO_GUIDES.psih = {
  role:'Псих: ассасин, невидимость и охота на героев',
  style:'Исчезает, заходит за спину и убивает. Пассивное безумие делает его быстрым и трудным для убийства, а ульта отправляет копии охотиться по всей карте.',
  skills:[0,1,2],
  skillNote:'Тишина в голове (Q) — невидимость. Безумие (W) — пассивно скорость атаки и снижение урона. Привет сзади (E) — телепорт за спину и огромный урон. Мы — одно целое (R) — 6 копий на 25 секунд.',
  build:['pt','joelBoots','reaperScythe','satanic','phoenixFeather','bkb'],
  tips:['Активируй Q, подкрадись к герою и сразу жми E: из невидимости удар сильнее на 40%.','Ульту применяй в начале погони: копии сами найдут героев по всей карте.']
};
CREATOR_BUILDS.psih = {
  title:'Псих  /  Ассасин-охотник',
  categories:[
    {name:'СТАРТОВЫЙ ЗАКУП', items:[['tango','Лечение на старте.'],['joelBoots','Скорость для засад.']]},
    {name:'РАННЯЯ ИГРА', items:[['fangs','Урон в атаке и в ударе сзади.'],['evsyutin','+500 здоровья.']]},
    {name:'CORE', items:[['pt','ПТ — урон и скорость атаки.'],['reaperScythe','Коса Жнеца — урон и лечение.'],['satanic','Вампиризм и здоровье.']]},
    {name:'ПО СИТУАЦИИ / ЛЕЙТ', items:[['phoenixFeather','Неуязвимость и здоровье.'],['chronoHourglass','Стоп-время для добивания.'],['bkb','Защита от контроля.']]}
  ]
};
})();
