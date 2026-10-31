"use strict";
/* Настройки графики: данные и сохранение (вынесено из game.js, этап 4). Обычный скрипт, грузится ПЕРЕД game.js.
   Здесь только независимые данные. perfLevel, загрузка из localStorage, setPerfLevel и лимиты (particleCap и т.п.) остались в game.js. */
const GFX_PRESETS = [   /* индекс = perfLevel: 0 высокое, 1 среднее, 2 низкое */
  {particles:2, glow:2, extras:0, shadows:1, decor:1},
  {particles:1, glow:1, extras:1, shadows:1, decor:1},
  {particles:0, glow:0, extras:2, shadows:0, decor:1}
];
const GFX = {particles:2, glow:2, extras:0, shadows:1, decor:1, fps:0};
const GFX_PARTICLE_MUL = [0.3, 0.58, 1];
const PERF_NAMES = ['Высокая', 'Средняя', 'Низкая', 'Супер низкая'];
function gfxSave(){ try { localStorage.setItem('dota-sens-gfx', JSON.stringify(GFX)); } catch(err) {} }
