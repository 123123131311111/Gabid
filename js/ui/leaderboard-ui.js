/* =========================================================
   Интерфейс мирового рейтинга: список, карточка игрока, открытие/закрытие окна.
   Перенесено из game.js без изменений (рефакторинг, этап 5).
   Состояние (leaderboardLoading, leaderboardError, selectedLeaderboardProfile, accountCareer) и сетевая loadLeaderboard остаются в game.js.
   Обычный скрипт (не ES-module); грузится ПЕРЕД game.js — на верхнем уровне
   не обращается к переменным game.js, только внутри функций.
   ========================================================= */
/* LEADERBOARD-UI:BEGIN */
function renderLeaderboardPanel(){
  const list=document.getElementById('world-leaderboard-list');
  const status=document.getElementById('leaderboard-status');
  if(!list||!status) return;
  list.replaceChildren();
  status.textContent=leaderboardLoading?'Загрузка мирового рейтинга…':leaderboardError;
  if(!accountCareer.leaders.length){
    if(!leaderboardLoading) status.textContent=leaderboardError || 'Таблица пока пуста.';
    return;
  }
  const currentNick=account.profile&&account.profile.nick;
  accountCareer.leaders.forEach(player=>{
    const row=careerNode('li',player.nick===currentNick?'me':'');
    row.appendChild(careerNode('span','leaderboard-place','#'+player.rank));
    const identity=careerNode('button','leaderboard-player leaderboard-profile-link');
    identity.type='button';
    identity.append(careerNode('strong','',player.nick),careerNode('small','',`${player.title||'Новобранец'} · MMR ${player.rating||0}`));
    identity.addEventListener('click',()=>showLeaderboardProfile(player));
    row.append(identity,careerNode('span','leaderboard-wins',String(player.wins||0)));
    list.appendChild(row);
  });
}
function showLeaderboardProfile(profile){
  selectedLeaderboardProfile=profile;
  document.getElementById('leaderboard-list-view').hidden=true;
  document.getElementById('leaderboard-player-profile').hidden=false;
  document.getElementById('leaderboard-profile-avatar').textContent=(profile.nick||'?').slice(0,1).toUpperCase();
  document.getElementById('leaderboard-profile-name').textContent=profile.nick||'Игрок';
  document.getElementById('leaderboard-profile-title').textContent=(profile.title||'Новобранец')+' · '+accountRank(profile.level||0);
  const stats=document.getElementById('leaderboard-profile-stats');
  stats.replaceChildren();
  [['ПОБЕДЫ',profile.wins],['ПОРАЖЕНИЯ',profile.losses],['МАТЧИ',profile.matches],['УБИЙСТВА',profile.kills],['СМЕРТИ',profile.deaths],['РЕЙТИНГ',profile.rating]]
    .forEach(([label,value])=>{
      const cell=careerNode('div','leaderboard-profile-stat');
      cell.append(careerNode('b','',String(value||0)),careerNode('span','',label));
      stats.appendChild(cell);
    });
  const favorites=document.getElementById('leaderboard-profile-favorites');
  favorites.replaceChildren();
  const heroes=profile.favoriteHeroes||[];
  if(heroes.length) heroes.forEach(hero=>favorites.appendChild(careerNode('span','',careerHeroName(hero.heroId)+' · '+hero.games)));
  else favorites.appendChild(careerNode('span','','Пока нет сыгранных матчей'));
}
document.getElementById('leaderboard-profile-back').addEventListener('click',()=>{
  selectedLeaderboardProfile=null;
  document.getElementById('leaderboard-player-profile').hidden=true;
  document.getElementById('leaderboard-list-view').hidden=false;
});
window.openLeaderboard=function(){
  selectedLeaderboardProfile=null;
  document.getElementById('leaderboard-player-profile').hidden=true;
  document.getElementById('leaderboard-list-view').hidden=false;
  document.getElementById('leaderboard-modal').hidden=false;
  loadLeaderboard();
};
window.closeLeaderboard=function(){ document.getElementById('leaderboard-modal').hidden=true; };
/* LEADERBOARD-UI:END */
