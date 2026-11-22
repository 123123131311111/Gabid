/* 0.10.8.1: отдельный поток для 3D-демона главного меню.
   Демон рисуется программным растеризатором Hero3D; раньше это происходило в основном потоке
   и съедало 20–100 мс на кадр — отсюда лаги меню. Теперь кадры считаются здесь, а меню только
   показывает готовую картинку. Модель собирается теми же файлами, что и в основном потоке. */
/* заглушки для части update01007.js, которая в потоке не нужна (скины магазина) */
self.SKIN_DEFS = []; self.SKIN_BY_ID = {};
importScripts('../../hero3d.js?v=0.10.8.1', '../../demon3d.js?v=0.10.0', '../../update01005.js?v=0.10.8.1', '../../update01007.js?v=0.10.0.7');
self.onmessage = function(e){
  const d = e.data;
  if(!d || d.t !== 'demon') return;
  try {
    const t0 = Date.now();
    const res = self.Hero3D.render(d.def, d.o);
    const n = d.o.W * d.o.H * 4;
    const data = res.data.slice(0, n), glow = res.glow ? res.glow.slice(0, n) : null;
    const tr = [data.buffer]; if(glow) tr.push(glow.buffer);
    self.postMessage({t: 'demon', id: d.id, W: d.o.W, H: d.o.H, ms: Date.now() - t0, data: data.buffer, glow: glow ? glow.buffer : null}, tr);
  } catch(err) {
    self.postMessage({t: 'error', id: d.id, msg: String(err && err.message || err)});
  }
};
