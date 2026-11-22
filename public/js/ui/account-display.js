/* =========================================================
   Отображение аккаунта: ранги, подпись кнопки онлайна, вспомогательные узлы карьеры.
   Перенесено из game.js без изменений (рефакторинг, этап 5).
   Зависит (на момент вызова) от game.js: account, onlineEntryElement, HERO_DEFS.
   Обычный скрипт (не ES-module); грузится ПЕРЕД game.js — на верхнем уровне
   не обращается к переменным game.js, только внутри функций.
   ========================================================= */
/* ACCOUNT-DISPLAY:BEGIN */
const ACCOUNT_RANKS = [[0,'Новобранец'],[3,'Страж'],[6,'Рыцарь'],[10,'Герольд'],[15,'Защитник'],[25,'Легенда'],[40,'Божество'],[60,'Бессмертный']];
function accountRank(level){
  let name = ACCOUNT_RANKS[0][1];
  for(const [min, title] of ACCOUNT_RANKS) if(level >= min) name = title;
  return name;
}
const MMR_RANKS = ['РЕКРУТ','СТРАЖ','РЫЦАРЬ','ГЕРОЛЬД','ЗАЩИТНИК','ЛЕГЕНДА','БОЖЕСТВО','ТИТАН'];
/* 100 MMR = одна звезда, 5 звёзд = ранг (500 MMR). С 4000 MMR — БЕССМЕРТНЫЙ. */
function accountRatingRank(rating){
  rating = Math.max(0, Math.floor(rating || 0));
  const tier = Math.floor(rating / 500);
  if(tier >= MMR_RANKS.length) return 'БЕССМЕРТНЫЙ';
  return MMR_RANKS[tier] + ' ' + (Math.floor((rating % 500) / 100) + 1);
}
function refreshOnlineEntryLabel(){
  if(!onlineEntryElement) return;
  const profile=account.profile;
  if(!profile){ onlineEntryElement.textContent='ОНЛАЙН 3 НА 3 · ВОЙДИ ДЛЯ РЕЙТИНГА'; return; }
  const rating=Number.isFinite(profile.rating)?profile.rating:0;
  onlineEntryElement.textContent='ОНЛАЙН · '+accountRatingRank(rating)+' · '+rating+' MMR';
}
function careerHeroName(id){
  const hero = HERO_DEFS.find(def => def.id === id);
  return hero ? hero.name : (id || 'Неизвестный боец');
}
function careerNode(tag, className, text){
  const node = document.createElement(tag);
  if(className) node.className = className;
  if(text != null) node.textContent = text;
  return node;
}
/* ACCOUNT-DISPLAY:END */
