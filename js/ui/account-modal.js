/* =========================================================
   Окно аккаунта: ссылки на DOM (accountUi), сообщения, отрисовка профиля, открытие/закрытие.
   Перенесено из game.js без изменений (рефакторинг, этап 5).
   Авторизация (submit*, accountApi, accountSet, bindAccountUi), accountMode/accountBusy и setAccountMode остаются в game.js.
   Обычный скрипт (не ES-module); грузится ПЕРЕД game.js — на верхнем уровне
   не обращается к переменным game.js, только внутри функций.
   ========================================================= */
/* ACCOUNT-MODAL:BEGIN */
const accountUi = {
  modal: document.getElementById('account-modal'),
  guest: document.getElementById('acc-guest'),
  user: document.getElementById('acc-user'),
  title: document.getElementById('acc-title'),
  tabLogin: document.getElementById('acc-tab-login'),
  tabRegister: document.getElementById('acc-tab-register'),
  nick: document.getElementById('acc-nick'),
  pass: document.getElementById('acc-pass'),
  submit: document.getElementById('acc-submit'),
  error: document.getElementById('acc-error'),
  avatar: document.getElementById('acc-avatar'),
  name: document.getElementById('acc-name'),
  rank: document.getElementById('acc-rank'),
  stats: document.getElementById('acc-stats'),
  level: document.getElementById('acc-level'),
  newNick: document.getElementById('acc-newnick'),
  rename: document.getElementById('acc-rename'),
  logout: document.getElementById('acc-logout'),
  close: document.getElementById('acc-close')
};
function setAccountMessage(text, ok){
  accountUi.error.textContent = text || '';
  accountUi.error.classList.toggle('ok', !!ok);
}
function renderAccountModal(){
  const profile = account.profile;
  window.__shadowAccountProfile = profile;
  window.dispatchEvent(new CustomEvent('shadow:profile'));
  refreshOnlineEntryLabel();
  accountUi.guest.hidden = !!profile;
  accountUi.user.hidden = !profile;
  accountUi.title.textContent = profile ? 'Профиль' : 'Аккаунт';
  renderCareerPanel();
  if(profile){
    accountUi.user.dataset.frame = profile.frame || 'iron';
    const avatarItem = profile.avatar && avatarImages[profile.avatar];
    accountUi.avatar.textContent = avatarItem ? '' : profile.nick.charAt(0).toUpperCase();
    accountUi.avatar.style.backgroundImage = avatarItem ? 'url(' + avatarItem.url + ')' : '';
    accountUi.name.textContent = profile.nick;
    accountUi.rank.textContent = '✦ ' + (profile.title || accountRank(profile.level)) + ' · ' + accountRank(profile.level);
    const total = (profile.wins || 0) + (profile.losses || 0);
    const rate = total ? Math.round((profile.wins || 0) / total * 100) : 0;
    accountUi.stats.textContent = 'Побед: ' + (profile.wins || 0) + '  •  Поражений: ' + (profile.losses || 0) + '  •  Матчей: ' + total + (total ? '  •  ' + rate + '%' : '');
    accountUi.level.textContent = String(profile.level);
    renderAvatarPicker();
  }
}
function openAccountModal(){
  renderAccountModal();
  setAccountMessage('');
  accountUi.modal.hidden = false;
  setTimeout(() => (account.profile ? accountUi.newNick : accountUi.nick).focus(), 30);
}
function closeAccountModal(){
  accountUi.modal.hidden = true;
  canvas.focus();
}
/* ACCOUNT-MODAL:END */
