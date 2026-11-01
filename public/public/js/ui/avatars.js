/* =========================================================
   Данные аватаров (AVATAR_DEFS), хранилище готовых изображений avatarImages и выбор аватара в окне профиля.
   Перенесено из game.js без изменений (рефакторинг, этап 5).
   Рисование на canvas (drawThemeAvatar, buildAvatarCache, drawAvatarImage), флаг avatarCacheBuilt и сетевая accountSetAvatar остаются в game.js.
   Обычный скрипт (не ES-module); грузится ПЕРЕД game.js — на верхнем уровне
   не обращается к переменным game.js, только внутри функций.
   ========================================================= */
/* AVATARS:BEGIN */
const AVATAR_DEFS = [
  {id:'pyro'},{id:'warlord'},{id:'grisha'},{id:'golly'},{id:'sasych'},
  {id:'ilya'},{id:'malit'},{id:'arcady'},{id:'illusionist'},{id:'shadow'},
  {id:'mo3gi'},{id:'regina'},{id:'juggernaut'},{id:'sniper'},{id:'vaspassir'},{id:'olex'},{id:'chip'},{id:'savely'},
  {id:'shovel', name:'Лопата', c1:'#3a2415', c2:'#d7b36a'},
  {id:'tower',  name:'Башня',  c1:'#102a4a', c2:'#8be9fd'},
  {id:'ancient',name:'Древний',c1:'#3c1010', c2:'#ff6b57'},
  {id:'rune',   name:'Руна',   c1:'#241046', c2:'#c79bff'},
  {id:'creep',  name:'Крип',   c1:'#12301a', c2:'#7dff9a'}
];
const avatarImages = Object.create(null);
function renderAvatarPicker(){
  const box = document.getElementById('acc-avatars');
  if(!box) return;
  const current = account.profile ? account.profile.avatar : '';
  if(box.childElementCount !== AVATAR_DEFS.length || box.dataset.ready !== String(avatarCacheBuilt)){
    box.innerHTML = '';
    for(const def of AVATAR_DEFS){
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'acc-avatar-opt'; button.dataset.id = def.id;
      const item = avatarImages[def.id];
      if(item){ button.style.backgroundImage = 'url(' + item.url + ')'; button.title = item.name; button.setAttribute('aria-label', item.name); }
      button.addEventListener('click', () => accountSetAvatar(def.id));
      button.addEventListener('pointerenter', () => playSynthSfx('hover'));
      box.appendChild(button);
    }
    box.dataset.ready = String(avatarCacheBuilt);
  }
  for(const button of box.children) button.classList.toggle('selected', button.dataset.id === current);
}
/* AVATARS:END */
