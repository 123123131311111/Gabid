/* DotaSense 0.10.4.1 — АРКАНЫ И СКИНЫ СОХРАНЯЮТСЯ ПОСЛЕ ОБНОВЛЕНИЯ СТРАНИЦЫ.
   Причина бага: game.js читал надетые скины из localStorage в самом начале, когда скины арканов (Гриша, Иллюзионист, Псих,
   Мо3ги и др.) ещё не были зарегистрированы файлами update*.js, — такие записи отбрасывались и затем затирались при сохранении.
   Теперь после загрузки всех файлов надетые скины читаются заново. Менять или снимать скин может только сам игрок
   (через гардероб); при покупке/входе в аккаунт выбор не сбрасывается. Подключается самым последним. */
(function(){
'use strict';
try {
  const saved = JSON.parse(localStorage.getItem('shadowRampageCosmetics') || '{}');
  if(saved.skinEquip && typeof saved.skinEquip === 'object'){
    for(const slot of Object.keys(saved.skinEquip)){
      const sk = SKIN_BY_ID[saved.skinEquip[slot]];
      if(sk && !sk.kind && skinSlot(sk) === slot && skinEquip[slot] !== sk.id) skinEquip[slot] = sk.id;
    }
  }
  if(saved.accEquipped && typeof saved.accEquipped === 'object')
    for(const k of Object.keys(saved.accEquipped)) if(saved.accEquipped[k] === true && SKIN_BY_ID[k]) accEquipped[k] = true;
} catch(err) { try { console.warn('update01041:', err); } catch(e) {} }
})();
