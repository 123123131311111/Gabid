/* DotaSense 0.10.2.2 — иконки скиллов «как в Доте» для первых 8 героев:
   Пиромант, Вождь, Гриша, Голли, Сасыч, Илья, Малит, Аркадий (33 скилла).
   Картинки лежат в public/img/skills/<id скилла>.png. Скрипт цепляет их к SKILLS[id].iconImg
   и даёт общую функцию drawSkillIcon(), которой пользуются панель скиллов, меню героя и подсказки.
   Если картинка ещё не загрузилась или у скилла её нет — функция возвращает false, и рисуется прежняя буква. */
(function(){
'use strict';
const ICON_IDS = ['fireball','flamewave','blink','meteor','cleave','warcry','charge','bladeStorm','quas','wex','exort','invoke','gollyCrystal','gollyStorm','gollyHeart','gollyGolems','gollyRed','bloodrage','bloodRite','thirst','rupture','ilyaPull','ilyaAura','ilyaBelly','ilyaFeast','malitBackpack','malitPassive','malitLaunch','malitLaser','arcadyFireballs','arcadyMolotov','arcadyFocus','arcadyDynamite'];
const VER = '0.10.2.2';
function attach(){
  if(typeof SKILLS === 'undefined') return;
  for(const id of ICON_IDS){
    const def = SKILLS[id];
    if(!def || def.iconImg) continue;
    const img = new Image();
    img.src = './img/skills/' + id + '.png?v=' + VER;
    def.iconImg = img;
  }
}
attach();
/* ctx, def скилла, прямоугольник x/y/w/h, радиус скругления, active=false затемняет (скилл не изучен) */
window.drawSkillIcon = function(ctx, def, x, y, w, h, radius, active){
  const im = def && def.iconImg;
  if(!im || !im.complete || !im.naturalWidth) return false;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radius || 0); ctx.clip();
  ctx.drawImage(im, x, y, w, h);
  if(active === false){ ctx.fillStyle = 'rgba(6,10,18,.62)'; ctx.fillRect(x, y, w, h); }
  /* лёгкая виньетка по краям, как у иконок Доты */
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(.18, 'rgba(255,255,255,0)');
  g.addColorStop(.8, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.30)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.restore();
  return true;
};
})();
