/* 0.10.8: адрес игрового сервера.
   • В браузере (игра открыта с сайта) — пусто: сервер тот же, что отдал страницу.
   • В скачанном приложении (DotaSense.exe и т.п.) адрес приходит из настроек приложения (?server=...)
     или из localStorage 'dota-sens-server'. Тогда онлайн, аккаунты и рейтинг идут на этот адрес. */
(function(){
  var desktop = location.protocol !== 'http:' && location.protocol !== 'https:';
  var fromQuery = '';
  try { fromQuery = new URLSearchParams(location.search).get('server') || ''; } catch(e){}
  var saved = '';
  try { saved = localStorage.getItem('dota-sens-server') || ''; } catch(e){}
  var server = (window.DOTASENSE_SERVER || fromQuery || (desktop ? saved : '') || '').replace(/\/+$/, '');
  window.DOTASENSE_DESKTOP = desktop;
  window.DOTASENSE_SERVER = server;
  window.dsApiUrl = function(path){ return (window.DOTASENSE_SERVER || '') + path; };
  window.dsSocket = function(){
    if(typeof io !== 'function') return null;
    var opts = {transports:['websocket', 'polling'], reconnectionDelayMax:8000};
    return window.DOTASENSE_SERVER ? io(window.DOTASENSE_SERVER, opts) : io(opts);
  };
  /* клиент socket.io: в приложении — локальная копия (vendor/), на сайте — с сервера */
  document.write('<script src="' + (desktop ? './vendor/socket.io.min.js' : '/socket.io/socket.io.js') + '"><\/script>');
})();
