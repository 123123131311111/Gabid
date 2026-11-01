/* DotaSense 0.9.9.4 — «КИСЛОТНЫЙ ПЛЕВОК».
   • Йосып получил четвёртый навык «Кислотный плевок» (клавиша E): снаряд яда в указанную точку.
   Подключается поверх game.js и update9902.js, по образцу остальных update-файлов. */
(function(){
'use strict';
const snd = (k, v) => { try { playSynthSfx(k, {volume: v == null ? 1 : v}); } catch(e) {} };

Object.assign(SFX_PRESETS, {
  yosypSpit: {from:520, to:140, duration:0.32, type:'sawtooth', volume:0.06, noise:0.55, layers:[[240,80,0.06,0.3,'sine',0.07],[1100,300,0,0.18,'triangle',0.03]]}
});

const SPIT_RANGE = 720;
const SPIT_DMG = [0, 105, 150, 195, 240];

Object.assign(SKILLS, {
  yosypAcid: {
    name:'Кислотный плевок', short:'E', type:'point', maxLevel:4, range:SPIT_RANGE,
    cd:[0, 14, 12, 10, 8], mana:[0, 80, 90, 100, 110],
    desc:'Йосып плюёт ядовитой кислотой в точку до 720: враги в облаке получают 105/150/195/240 урона, замедление и яд на 4 секунды. За каждого задетого вражеского героя Йосып восстанавливает здоровье (до трёх героев). Кислота остаётся на земле 3,5 секунды.',
    cast(h, x, y, lvl){
      const L = Math.max(1, Math.min(4, lvl || 1));
      let dx = x - h.x, dy = y - h.y, dist = Math.hypot(dx, dy);
      if(dist < 30){ const f = Number.isFinite(h.facing) ? h.facing : 0; dx = Math.cos(f); dy = Math.sin(f); dist = 1; }
      const len = Math.min(SPIT_RANGE, Math.max(120, dist));
      const px = clamp(h.x + dx / dist * len, 60, WORLD - 60);
      const py = clamp(h.y + dy / dist * len, 60, WORLD - 60);
      const radius = 135 + L * 12;
      const damage = abilityDamage(h, SPIT_DMG[L]);
      h.facing = Math.atan2(py - h.y, px - h.x);
      fxBeam(h.x, h.y, px, py, '#91ed62', 0.4);
      fxRing(px, py, radius, '#a7ff70', 0.7);
      spawnParticles(px, py, '#a7ff70', 26, 0.9);
      aoes.push({x:px, y:py, radius, dmg:0, manaDmg:0, team:h.team, source:h, delay:0, t:0, color:'#91ed62', applied:true, life:3.5, dead:false, visual:'yosypPuddle'});
      let heroHits = 0;
      for(const u of units){
        if(u.dead || u.team === h.team || u.team === 2 || isBuilding(u) || u.invulnerable) continue;
        if(Math.hypot(u.x - px, u.y - py) > radius + (u.radius || 0)) continue;
        applyDamage(u, damage, h);
        if(u.dead) continue;
        u.slow = Math.max(u.slowT > 0 ? u.slow : 0, 0.28 + L * 0.05);
        u.slowT = Math.max(u.slowT || 0, 2.2 + L * 0.3);
        u.buffs = u.buffs.filter(b => !(b.type === 'yosypPoison' && b.source === h));
        u.addBuff({type:'yosypPoison', damage:h.dmg * (0.10 + L * 0.03), tick:0, t:4, source:h});
        u.hitFlash = Math.max(u.hitFlash || 0, 0.25);
        spawnParticles(u.x, u.y, '#7edb4a', 10, 0.7);
        if(u.type === 'hero' && !u.isIllusion && heroHits < 3){
          heroHits++;
          h.hp = Math.min(h.maxHp, h.hp + 40 + L * 25);
        }
      }
      addText(h.x, h.y - 78, 'КИСЛОТНЫЙ ПЛЕВОК', '#baff89', 1.0, 16);
      if(heroHits > 0) addText(h.x, h.y - 98, '+' + (heroHits * (40 + L * 25)) + ' HP', '#8aff62', 0.9, 15);
      snd('yosypSpit', 0.9);
      return true;
    }
  }
});

{
  const yd = HERO_DEFS.find(d => d.id === 'yosyp');
  if(yd && !yd.skills.includes('yosypAcid')){
    /* порядок Q, W, E, R: плевок встаёт перед ультимейтом */
    const ultIdx = yd.skills.indexOf('yosypDrain');
    yd.skills.splice(ultIdx >= 0 ? ultIdx : yd.skills.length, 0, 'yosypAcid');
  }
  if(typeof HERO_GUIDES !== 'undefined' && HERO_GUIDES.yosyp){
    const gd = HERO_GUIDES.yosyp;
    gd.skills = [1, 2, 0];
    gd.skillNote += ' Кислотный плевок (E) — дальний бросок яда до 720: урон, замедление, отравление и лечение за каждого задетого героя.';
    gd.tips = (gd.tips || []).concat(['Плевком замедляйте убегающего героя — яд и лужи добьют его, а Йосып ещё и подлечится.']);
  }
}
})();
