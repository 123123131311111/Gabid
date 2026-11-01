"use strict";
/* ============================================================================
   js/core/engine.js — ядро производительности (обычный скрипт, грузится ПЕРЕД game.js).
   Не зависит ни от одного глобала игры. Экспортирует единственный объект `Engine`.

   Содержит:
     Engine.compact(arr, keepFn, onRemove)   — удаление «мёртвых» элементов на месте, без new Array (filter)
     Engine.Pool                              — пул объектов (частицы и т.п.), без нагрузки на GC
     Engine.SpatialHash                       — равномерная сетка для запросов «кто рядом» вместо O(N) обхода
     Engine.Clock                             — dt-часы: сброс при потере фокуса, дробление больших шагов
     Engine.Display                           — масштаб рендера с учётом devicePixelRatio и тиров качества
     Engine.Bloom                             — дешёвый bloom (даунсэмпл + blur + additive) для тира «Ultra»
   ========================================================================== */
const Engine = (() => {

  /* ---------- 1. In-place фильтрация массива ---------- */
  function compact(arr, keep, onRemove){
    let w = 0;
    for(let r = 0, n = arr.length; r < n; r++){
      const it = arr[r];
      if(keep(it)){ if(w !== r) arr[w] = it; w++; }
      else if(onRemove) onRemove(it);
    }
    arr.length = w;
    return arr;
  }

  /* ---------- 2. Пул объектов ---------- */
  class Pool {
    /* create() — фабрика пустого объекта, reset(o) — приводит к начальному состоянию, max — предел хранения */
    constructor(create, reset, max){
      this.create = create; this.reset = reset; this.max = max || 2048; this.free = [];
    }
    acquire(){
      const o = this.free.length ? this.free.pop() : this.create();
      if(this.reset) this.reset(o);
      return o;
    }
    release(o){ if(this.free.length < this.max) this.free.push(o); }
    get size(){ return this.free.length; }
  }

  /* ---------- 3. Пространственный хеш ---------- */
  class SpatialHash {
    constructor(cell){
      this.cell = cell || 256; this.inv = 1 / this.cell;
      this.map = new Map();        /* key -> массив; массивы переиспользуются между кадрами */
      this.used = [];              /* ключи, заполненные в этом кадре */
      this.spare = [];             /* пул пустых массивов */
      this.stamp = 0;
    }
    key(cx, cy){ return (cx + 4096) * 8192 + (cy + 4096); }
    clear(){
      for(let i = 0; i < this.used.length; i++){
        const a = this.map.get(this.used[i]);
        if(a){ a.length = 0; this.spare.push(a); }
        this.map.delete(this.used[i]);
      }
      this.used.length = 0;
    }
    insert(o, x, y){
      const k = this.key(Math.floor(x * this.inv), Math.floor(y * this.inv));
      let a = this.map.get(k);
      if(!a){ a = this.spare.pop() || []; this.map.set(k, a); this.used.push(k); }
      a.push(o);
    }
    /* вызывает fn(o) для всех объектов в ячейках, пересекающих круг (x,y,r). Точную дистанцию проверяет вызывающий. */
    query(x, y, r, fn){
      const inv = this.inv;
      const x0 = Math.floor((x - r) * inv), x1 = Math.floor((x + r) * inv);
      const y0 = Math.floor((y - r) * inv), y1 = Math.floor((y + r) * inv);
      for(let cx = x0; cx <= x1; cx++){
        for(let cy = y0; cy <= y1; cy++){
          const a = this.map.get(this.key(cx, cy));
          if(a) for(let i = 0; i < a.length; i++) fn(a[i]);
        }
      }
    }
  }

  /* ---------- 4. Часы кадра ---------- */
  const Clock = {
    last: 0, maxStep: 1 / 30, maxFrame: 0.1, lost: true,
    /* Возвращает полный dt кадра (с потолком maxFrame). После потери фокуса/возврата вкладки первый dt = 0. */
    tick(now){
      if(this.lost || !this.last){ this.last = now; this.lost = false; return 0; }
      let dt = (now - this.last) / 1000; this.last = now;
      if(dt < 0) dt = 0;
      return dt > this.maxFrame ? this.maxFrame : dt;
    },
    /* Дробит dt на равные подшаги ≤ maxStep: физика остаётся стабильной при просадке FPS и не «пролетает» цели. */
    steps(dt){ return dt <= this.maxStep ? 1 : Math.ceil(dt / this.maxStep); }
  };
  const markLost = () => { Clock.lost = true; };
  document.addEventListener('visibilitychange', markLost);
  window.addEventListener('blur', markLost);
  window.addEventListener('focus', markLost);

  /* ---------- 5. Масштаб рендера (DPR + тиры качества) ---------- */
  const Display = {
    dpr(){ return Math.min(window.devicePixelRatio || 1, 2); },
    /* level: 0 высокое/Ultra, 1 среднее, 2 низкое, 3 супер низкое. inMatch — в меню текст всегда рисуем резко. */
    scale(level, inMatch){
      const d = this.dpr();
      if(level >= 3 && inMatch) return d >= 2 ? 1 : 0.5;    /* кратно целому → пиксели без «каши» */
      if(level === 0) return d;
      if(level === 1) return Math.min(d, 1.5);
      return 1;
    },
    /* Режим масштабирования CSS: при масштабе <1 — чёткие пиксели вместо размытия. */
    applyCss(canvas, scale){
      canvas.style.imageRendering = scale < 1 ? 'pixelated' : 'auto';
    }
  };

  /* ---------- 6. Bloom (только Ultra) ---------- */
  const Bloom = {
    small: null, sctx: null, w: 0, h: 0, supportsFilter: null,
    /* Рисует размытую светящуюся копию кадра поверх него (режим 'lighter'). Вызывать ДО отрисовки HUD. */
    apply(ctx, canvas, strength){
      if(this.supportsFilter === null) this.supportsFilter = ('filter' in ctx);
      const w = Math.max(16, canvas.width >> 2), h = Math.max(16, canvas.height >> 2);
      if(!this.small){ this.small = document.createElement('canvas'); this.sctx = this.small.getContext('2d'); }
      if(this.w !== w || this.h !== h){ this.small.width = this.w = w; this.small.height = this.h = h; }
      const s = this.sctx;
      s.globalCompositeOperation = 'source-over';
      s.imageSmoothingEnabled = true;
      /* яркостная выжимка: контраст вверх, затемнение — оставляем только ярко светящиеся пиксели */
      s.filter = this.supportsFilter ? 'brightness(0.9) contrast(1.6) saturate(1.3) blur(3px)' : 'none';
      s.clearRect(0, 0, w, h);
      s.drawImage(canvas, 0, 0, w, h);
      s.filter = 'none';
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = strength;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(this.small, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  };

  return {compact, Pool, SpatialHash, Clock, Display, Bloom};
})();
