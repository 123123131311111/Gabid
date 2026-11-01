/* =========================================================
   Панель карьеры в окне профиля (статистика, любимые герои, история матчей и подробный отчёт).
   Перенесено из game.js без изменений (рефакторинг, этап 5).
   Зависит (на момент вызова) от game.js: account, accountCareer, SHOP_ITEMS; из account-display.js: careerNode, careerHeroName.
   Обычный скрипт (не ES-module); грузится ПЕРЕД game.js — на верхнем уровне
   не обращается к переменным game.js, только внутри функций.
   ========================================================= */
/* CAREER-PANEL:BEGIN */
function renderCareerPanel(){
  const panel = document.getElementById('career-panel');
  if(!panel) return;
  panel.hidden = !account.profile;
  if(!account.profile) return;

  const profile = account.profile;
  const summary = document.getElementById('career-summary');
  const favorites = document.getElementById('career-favorites');
  const history = document.getElementById('career-history');
  const xp = document.getElementById('career-xp');
  summary.replaceChildren(); favorites.replaceChildren(); history.replaceChildren();
  history.appendChild(careerNode('p','career-local-note','Подробности новых матчей сохраняются в этом браузере.'));
  xp.textContent = (profile.xp || 0) % 500 + ' / 500 XP';

  [
    ['МАТЧИ',profile.matches || 0],['ПОБЕДЫ',profile.wins || 0],['ПОРАЖЕНИЯ',profile.losses || 0],
    ['УБИЙСТВА',profile.kills || 0],['СМЕРТИ',profile.deaths || 0],['MMR',profile.rating || 0]
  ].forEach(([label,value])=>{
    const cell=careerNode('div','career-stat');
    cell.append(careerNode('b','',String(value)),careerNode('span','',label));
    summary.appendChild(cell);
  });

  const favoritesList = profile.favoriteHeroes || [];
  if(!favoritesList.length) favorites.appendChild(careerNode('span','career-empty','Сыграй первый матч'));
  else favoritesList.forEach(hero=>favorites.appendChild(careerNode('span','career-favorite',careerHeroName(hero.heroId)+' · '+hero.games)));

  if(!accountCareer.history.length){
    history.appendChild(careerNode('div','career-empty','История появится после первой завершённой игры.'));
  } else accountCareer.history.forEach(match=>{
    const details=careerNode('details','career-match'+(match.won?'':' loss'));
    const summaryNode=careerNode('summary');
    const playedAt=Number(match.playedAt);
    const date=Number.isFinite(playedAt) && playedAt > 0 ? new Date(playedAt).toLocaleDateString('ru-RU') : 'Дата не указана';
    const participants=Array.isArray(match.participants) ? match.participants : [];
    const matchWorth=match.netWorth != null && match.netWorth !== '' && Number.isFinite(Number(match.netWorth))
      ? Number(match.netWorth).toLocaleString('ru-RU')+' зол.' : '—';
    summaryNode.append(
      careerNode('span','career-match-title',careerHeroName(match.heroId)+' · '+date),
      careerNode('span','career-match-score',`${match.kills ?? '—'}/${match.deaths ?? '—'}/${match.assists ?? '—'} · ${matchWorth}`)
    );
    details.appendChild(summaryNode);
    const body=careerNode('div','career-match-body');
    const report=careerNode('div','career-report');
    const initialParticipant=participants.find(player=>player && player.heroId===match.heroId) || participants[0] || null;
    let selectedParticipant=initialParticipant;
    const teamLabel=team=>team===0?'СИЛЫ СВЕТА':team===1?'СИЛЫ ТЬМЫ':team==null?'КОМАНДА':'КОМАНДА '+String(team);
    const hasValue=value=>value != null && value !== '' && Number.isFinite(Number(value));
    const displayNumber=value=>hasValue(value) ? Number(value).toLocaleString('ru-RU') : '—';
    const hasLegacyData=!hasValue(match.duration) ||
      participants.some(player=>player && (!hasValue(player.level) || !Array.isArray(player.items)));

    const main=careerNode('section','career-report-main');
    const identity=careerNode('div','career-report-identity');
    const portrait=careerNode('canvas','career-report-portrait');
    portrait.width=240; portrait.height=240;
    portrait.setAttribute('aria-label','Портрет бойца');
    const identityText=careerNode('div','career-report-name');
    const heroTitle=careerNode('strong','career-report-hero');
    const nickTitle=careerNode('span','career-report-nick');
    identityText.append(heroTitle,nickTitle);
    const levelBadge=careerNode('span','career-level-badge');
    identity.append(portrait,levelBadge,identityText);
    const stats=careerNode('div','career-report-stats');
    const itemsHeading=careerNode('div','career-report-items-heading','КУПЛЕННЫЕ ПРЕДМЕТЫ');
    const items=careerNode('div','career-report-items');
    const detailMeta=careerNode('div','career-report-meta');
    const legacy=careerNode('p','career-legacy-note');
    legacy.textContent='Архивный матч: в старой записи часть игровых данных не сохранялась.';
    legacy.hidden=!hasLegacyData;
    const perfHeading=careerNode('div','career-report-items-heading','ДЕЙСТВИЯ ИГРОКА В ЭТОМ МАТЧЕ');
    const perf=careerNode('div','career-perf');
    const avgBox=careerNode('div','career-avg');
    main.append(identity,stats,itemsHeading,items,perfHeading,perf,avgBox,detailMeta,legacy);
    report.appendChild(main);

    const roster=careerNode('section','career-report-roster');
    const rosterHeading=careerNode('div','career-report-roster-heading','СОСТАВЫ МАТЧА');
    const rosterTeams=careerNode('div','career-report-teams');
    const teamBuckets=new Map();
    participants.forEach(player=>{
      if(!player) return;
      const key=String(player.team == null ? 'unknown' : player.team);
      if(!teamBuckets.has(key)) teamBuckets.set(key,{team:player.team,players:[]});
      teamBuckets.get(key).players.push(player);
    });
    if(match.winnerTeam != null && !teamBuckets.has(String(match.winnerTeam))) teamBuckets.set(String(match.winnerTeam),{team:match.winnerTeam,players:[]});
    const orderedTeams=Array.from(teamBuckets.values()).sort((a,b)=>{
      const aa=Number(a.team), bb=Number(b.team);
      return Number.isFinite(aa)&&Number.isFinite(bb)?aa-bb:String(a.team).localeCompare(String(b.team));
    });
    orderedTeams.forEach(bucket=>{
      const team=careerNode('div','career-roster-team'+(bucket.team===match.winnerTeam?' winner':''));
      const label=careerNode('div','career-team-label');
      label.append(careerNode('strong','',teamLabel(bucket.team)),bucket.team===match.winnerTeam?careerNode('small','','ПОБЕДИТЕЛЬ'):careerNode('small','',''));
      team.appendChild(label);
      bucket.players.forEach(player=>{
        const row=careerNode('button','career-participant'+(player===selectedParticipant?' selected':'')+(player.team===match.winnerTeam?' winner':''));
        row.type='button';
        row.setAttribute('aria-pressed',player===selectedParticipant?'true':'false');
        const miniPortrait=careerNode('canvas','career-participant-portrait');
        miniPortrait.width=52; miniPortrait.height=52;
        if(typeof window.__renderHeroPortrait==='function') window.__renderHeroPortrait(miniPortrait,player.heroId);
        const playerText=careerNode('span','career-participant-name');
        playerText.append(careerNode('strong','',player.nick || careerHeroName(player.heroId)),careerNode('small','',careerHeroName(player.heroId)));
        const playerScore=careerNode('span','career-participant-kda',`${player.kills ?? '—'}/${player.deaths ?? '—'}/${player.assists ?? '—'}`);
        row.append(miniPortrait,playerText,playerScore);
        row.addEventListener('click',event=>{
          event.preventDefault();
          selectedParticipant=player;
          renderSelected();
          rosterTeams.querySelectorAll('.career-participant').forEach(button=>{
            const active=button===row;
            button.classList.toggle('selected',active);
            button.setAttribute('aria-pressed',active?'true':'false');
          });
        });
        team.appendChild(row);
      });
      rosterTeams.appendChild(team);
    });
    if(!participants.length) rosterTeams.appendChild(careerNode('div','career-empty','Состав матча не сохранён.'));
    roster.append(rosterHeading,rosterTeams);
    report.appendChild(roster);

    function renderSelected(){
      const player=selectedParticipant;
      const heroId=player ? player.heroId : match.heroId;
      heroTitle.textContent=careerHeroName(heroId);
      nickTitle.textContent=player ? (player.nick || 'Игрок')+' · '+teamLabel(player.team) : 'Боец матча';
      if(typeof window.__renderHeroPortrait==='function') window.__renderHeroPortrait(portrait,heroId);
      stats.replaceChildren();
      const k=player ? player.kills : match.kills, d=player ? player.deaths : match.deaths, a=player ? player.assists : match.assists;
      [
        ['УБИЙСТВА',k ?? '—','career-stat-kills'],
        ['СМЕРТИ',d ?? '—','career-stat-deaths'],
        ['ПОМОЩЬ',a ?? '—','career-stat-assists'],
        ['УРОВЕНЬ',player && player.level != null ? player.level : '—',''],
        ['ЗОЛОТО',player && player.gold != null ? displayNumber(player.gold) : '—',''],
        ['ЦЕННОСТЬ',displayNumber(player && player.netWorth != null ? player.netWorth : match.netWorth),'']
      ].forEach(([label,value,className])=>{
        const stat=careerNode('div','career-report-stat '+className);
        stat.append(careerNode('b','',String(value)),careerNode('span','',label));
        stats.appendChild(stat);
      });
      items.replaceChildren();
      levelBadge.textContent=player && player.level != null ? String(player.level) : '—';
      const slots=player && Array.isArray(player.items) ? player.items.slice(0,6) : [];
      for(let i=0;i<6;i++){
        const item=slots[i];
        const itemDef=item ? SHOP_ITEMS[item] : null;
        const slot=careerNode('div','career-item-slot'+(item?' filled':''));
        slot.title=itemDef ? itemDef.name : item ? String(item) : 'Пустой слот';
        if(itemDef){
          slot.style.setProperty('--item-color',itemDef.color || '#d6c49a');
          const icon=careerNode('canvas','career-item-icon');
          icon.width=96; icon.height=96;
          icon.setAttribute('aria-label',itemDef.name);
          const drawn=typeof window.__renderItemIcon==='function' && window.__renderItemIcon(icon,item);
          if(drawn) slot.appendChild(icon);
          else {
            const glyph=careerNode('span','career-item-glyph',itemDef.icon || '◇');
            glyph.style.color=itemDef.color || '#d6c49a';
            slot.appendChild(glyph);
          }
          slot.appendChild(careerNode('span','career-item-name',itemDef.name || String(item)));
        } else if(item) slot.appendChild(careerNode('span','career-item-name',String(item)));
        items.appendChild(slot);
      }
      /* Шкалы 0–10: насколько игрок выделялся среди всех участников матча */
      perf.replaceChildren();
      const bestOf=key=>Math.max(1,...participants.map(p=>Number(p && p[key]) || 0));
      const netValue=player && player.netWorth != null ? player.netWorth : match.netWorth;
      [['УБИЙСТВА','kills',k,'kills'],['СМЕРТИ','deaths',d,'deaths'],['ПОМОЩЬ','assists',a,'assists'],['БОГАТСТВО','netWorth',netValue,'gold']].forEach(([label,key,value,cls])=>{
        const num=Number(value) || 0;
        const ratio=Math.max(0,Math.min(1,num/bestOf(key)));
        const row=careerNode('div','career-perf-row '+cls);
        const track=careerNode('div','career-perf-track');
        const fill=careerNode('i','career-perf-fill');
        fill.style.width=Math.max(3,Math.round(ratio*100))+'%';
        track.appendChild(fill);
        row.append(careerNode('span','career-perf-label',label),track,careerNode('b','career-perf-value',(ratio*10).toFixed(1)));
        perf.appendChild(row);
      });
      /* Сравнение со средними результатами на этом герое (только для самого владельца аккаунта) */
      avgBox.replaceChildren();
      const sameHero=accountCareer.history.filter(m=>m && m !== match && m.heroId===heroId && m.kills != null);
      const isOwner=player && player===initialParticipant && heroId===match.heroId;
      avgBox.hidden=!(isOwner && sameHero.length);
      if(!avgBox.hidden){
        const mean=key=>sameHero.reduce((sum,m)=>sum+(Number(m[key])||0),0)/sameHero.length;
        avgBox.appendChild(careerNode('div','career-avg-title','ВАШИ СРЕДНИЕ ПОКАЗАТЕЛИ НА ЭТОМ ГЕРОЕ · '+sameHero.length+' МАТЧ.'));
        const grid=careerNode('div','career-avg-grid');
        [['УБИЙСТВ','kills',k,false],['СМЕРТЕЙ','deaths',d,true],['ПОМОЩИ','assists',a,false],['ЦЕННОСТЬ','netWorth',netValue,false]].forEach(([label,key,value,inverse])=>{
          const average=mean(key);
          const diff=(Number(value)||0)-average;
          const good=inverse ? diff<=0 : diff>=0;
          const cell=careerNode('div','career-avg-cell');
          const shown=Math.abs(average)>=100 ? Math.round(average).toLocaleString('ru-RU') : (Math.round(average*10)/10).toString();
          const delta=Math.abs(diff)>=100 ? Math.round(diff).toLocaleString('ru-RU') : (Math.round(diff*10)/10).toString();
          cell.append(
            careerNode('span','career-avg-label',label),
            careerNode('b','',shown),
            careerNode('em',good?'up':'down',(diff>=0?'+':'')+delta)
          );
          grid.appendChild(cell);
        });
        avgBox.appendChild(grid);
      }
      const duration=Number(match.duration);
      const durationText=hasValue(match.duration) && duration>0
        ? Math.floor(duration/60)+':'+String(Math.floor(duration%60)).padStart(2,'0')
        : 'Не сохранена';
      detailMeta.replaceChildren(
        careerNode('span','','ДЛИТЕЛЬНОСТЬ'),
        careerNode('strong','',durationText),
        careerNode('span','','ЧИСТАЯ ЦЕННОСТЬ'),
        careerNode('strong','',displayNumber(player && player.netWorth != null ? player.netWorth : match.netWorth)+' зол.')
      );
      const selectedHasLegacy=!player || !hasValue(player.level) || !Array.isArray(player.items) || !hasValue(match.duration);
      legacy.hidden=!(hasLegacyData || selectedHasLegacy);
    }
    renderSelected();
    body.appendChild(report);
    details.appendChild(body);
    history.appendChild(details);
  });
}
/* CAREER-PANEL:END */
