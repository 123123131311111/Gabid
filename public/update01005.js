/* DotaSense 0.10.0.5 — «ПОВЕЛИТЕЛЬ ТЬМЫ»: красивый демон в центре главного меню.
   • Старый лохматый демон заменён статным рогатым владыкой: броня, наплечники, огненная глефа-меч, крылья, хвост, нимб из рун.
   • Облик случайный при каждом запуске игры: «Владыка Пепла» (алый), «Принц Бездны» (фиолетовый), «Ледяной Палач» (голубой).
     Это не любимый герой игрока, а отдельный страж меню.
   • Свет, руны, круг под ногами и искры теперь окрашены в цвет выбранного режима (ТУРБО / ALL PICK / РЕЙТИНГ),
     поэтому демон вписывается в меню, а не торчит оранжевым пятном.
   Только визуал: геймплей и характеристики не затронуты. Подключается после update0100f.js. */
(function(){
'use strict';
const G = (typeof window !== 'undefined') ? window : globalThis;
const H3 = G.Hero3D;
if(!H3 || !H3.models) return;

/* ---------- облики ---------- */
const VARIANTS = [
  {id: 'ash',  name: 'Владыка Пепла',
   skin: '#c4574a', skin2: '#963a36', skin3: '#dd7a63', armor: '#18111a', armor2: '#2c1c28',
   trim: '#e8b64a', trimHi: '#fff0b0', cloth: '#6a1220', cloth2: '#3a0a14',
   hairBase: '#1a1016', hair: ['#b8310f', '#ff7a2a', '#ffd36a'], eye: '#ffe27a', bone: '#2a1a20', horn: '#2b1a1c',
   mem: ['#4a0e1c', '#6a1628', '#86203a'], glow: '#ff7a3a'},
  {id: 'void', name: 'Принц Бездны',
   skin: '#7a66c4', skin2: '#53428f', skin3: '#9b88e2', armor: '#100d1e', armor2: '#221a3a',
   trim: '#c5cfee', trimHi: '#ffffff', cloth: '#34186c', cloth2: '#1c0e40',
   hairBase: '#120d24', hair: ['#5a2bc4', '#a45bff', '#ead0ff'], eye: '#f2dcff', bone: '#1a1230', horn: '#241a3a',
   mem: ['#1c0e38', '#2e1858', '#45247e'], glow: '#b36bff'},
  {id: 'frost', name: 'Ледяной Палач',
   skin: '#8db4dc', skin2: '#5e88b8', skin3: '#b6d8f4', armor: '#0d1822', armor2: '#1a2d40',
   trim: '#bfe9ff', trimHi: '#ffffff', cloth: '#12476c', cloth2: '#0a2c48',
   hairBase: '#0c1722', hair: ['#1f78c8', '#5ad0ff', '#e6faff'], eye: '#eaffff', bone: '#10202e', horn: '#1c2e40',
   mem: ['#0a2642', '#113a5e', '#1a5582'], glow: '#55c8ff'}
];
let VAR = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
G.menuDemon0105 = {variants: VARIANTS, current: () => VAR, set: i => { VAR = VARIANTS[((i % 3) + 3) % 3]; }};

const cl = x => Math.max(0, Math.min(1, x));
const sm = x => { x = cl(x); return x * x * (3 - 2 * x); };
const sh = Math.sin;
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const STEEL = '#b9c4d6', STEEL2 = '#e8eef8';

H3.models.menuDemon = function(S, def, t){
  t = t || 0;
  const V = VAR, TH = (def && def.color2) || V.glow;
  const br = sh(t * 1.35) * 0.014;                                   /* дыхание */
  const c = t % 13;
  const flare = c >= 8.6 ? sm((c - 8.6) / 0.8) * (1 - sm((c - 11.4) / 1.4)) : 0;   /* раз в 13 с: вспышка, крылья шире */
  const sp = 0.62 + 0.06 * sh(t * 0.5) + 0.3 * flare;                /* раскрытие крыльев */
  const flap = sh(t * 0.95) * 0.05 + flare * sh(t * 9) * 0.025;
  const gp = 0.8 + 0.2 * sh(t * 2.4) + flare * 0.6;                  /* пульс свечения */
  const sway = sh(t * 0.8);
  const U = p => [p[0], p[1] + br * Math.max(0, p[1] - 1.2), p[2]];
  const hy = 0.17 * sh(t * 0.45) - flare * 0.0, hc = Math.cos(hy), hs = Math.sin(hy);
  const HD = p => { const x = p[0], z = p[2] - 0.02; return U([x * hc + z * hs, p[1] + flare * 0.05, -x * hs + z * hc + 0.02]); };

  /* ---------- нимб из рун за головой ---------- */
  { const hc0 = HD([0, 3.1, -0.5]);
    S.ring(hc0, 0.7, 0.024, V.trim, {n: 36, axis: 'z', glow: 1});
    S.ring(hc0, 0.56, 0.016, TH, {n: 30, axis: 'z', glow: 1});
    for(let i = 0; i < 10; i++){
      const a = t * 0.3 + i / 10 * Math.PI * 2, r = 0.63;
      S.box([hc0[0] + Math.cos(a) * r, hc0[1] + Math.sin(a) * r, hc0[2]], [0.026, 0.1 * (0.7 + 0.3 * sh(t * 2 + i)), 0.02], i % 2 ? V.trimHi : TH, {glow: 1, rot: [0, 0, a]});
    }
  }

  /* ---------- КРЫЛЬЯ ---------- */
  const HN = [0, 0.22, 1];
  const fan = (A, B, C, col) => {
    const N = 10, wd = dist(B, C) / N * 1.6 + 0.04;
    for(let j = 0; j <= N; j++){
      const u = j / N;
      const P = lerp(lerp(B, C, u), A, 0.12 * sh(u * Math.PI));        /* вогнутый край */
      S.obox(A, P, wd, 0.016, col, {hint: HN, shine: 0.1});
    }
  };
  for(const s of [-1, 1]){
    const k = 0.55 + 0.45 * sp, fl = flap * (s > 0 ? 1 : 0.9);
    const Sh = [s * 0.26, 2.52, -0.28];
    const E = [s * (0.76 + 0.24 * sp), 3.15 + 0.38 * sp + fl, -0.55 - 0.08 * sp];
    const Wr = [s * (1.12 + 0.5 * sp), 3.55 + 0.5 * sp + fl * 1.6, -0.68 - 0.12 * sp];
    const T = [[0.78, 0.34, -0.04], [0.66, -0.78, -0.1], [0.34, -1.55, -0.14], [-0.18, -2.02, -0.14]]
      .map(o => [Wr[0] + s * o[0] * k * 0.86, Wr[1] + o[1] * k + (o[1] < 0 ? fl * 0.6 : 0), Wr[2] + o[2]]);
    const B = [s * 0.2, 1.6, -0.38];
    const M = V.mem;
    fan(Wr, T[0], T[1], M[2]); fan(Wr, T[1], T[2], M[1]); fan(Wr, T[2], T[3], M[0]);
    fan(Wr, T[3], B, M[1]); fan(Wr, B, Sh, M[2]); fan(Wr, Sh, E, M[0]);
    S.tube(Sh, E, 0.06, 0.045, V.armor2, {seg: 8, shine: 0.4});
    S.tube(E, Wr, 0.048, 0.035, V.armor2, {seg: 8, shine: 0.4});
    for(let i = 0; i < 4; i++){
      S.tube(Wr, T[i], 0.03, 0.01, V.armor2, {seg: 6, shine: 0.4});
      S.ell(T[i], [0.034, 0.034, 0.034], V.glow, {rings: 4, seg: 6, glow: 1});
    }
    S.tube(T[3], B, 0.03, 0.016, V.bone, {seg: 6});
    S.ell(E, [0.09, 0.09, 0.09], V.trim, {rings: 5, seg: 8, shine: 0.85});
    S.ell(Wr, [0.08, 0.08, 0.08], V.trim, {rings: 5, seg: 8, shine: 0.85});
    S.cone(E, add(E, [s * 0.12, 0.36, -0.05]), 0.06, V.trim, {seg: 5, shine: 0.8});
    S.cone(Wr, add(Wr, [s * 0.22 * k, 0.3 * k, 0.02]), 0.05, V.trim, {seg: 5, shine: 0.8});
  }

  /* ---------- ХВОСТ ---------- */
  { let prev = [0.02, 1.28, -0.22], last = prev, dir = [0, 0, -1];
    for(let k = 1; k <= 10; k++){
      const q = k / 10;
      const p = [-0.13 * k - 0.06 * sh(t * 1.2 - k * 0.55) * k * 0.4, 1.22 - 0.06 * k + 1.5 * q * q + 0.06 * sh(t * 1.2 - k * 0.5), -0.2 - 0.17 * k];
      S.tube(prev, p, 0.11 * (1 - q * 0.75) + 0.02, 0.11 * (1 - (k + 1) / 10 * 0.75) + 0.02, V.skin2, {seg: 8});
      if(k % 3 === 0) S.ell(p, [0.07 * (1 - q * 0.6), 0.07 * (1 - q * 0.6), 0.07 * (1 - q * 0.6)], V.trim, {rings: 4, seg: 8, shine: 0.8});
      dir = sub(p, prev); last = p; prev = p;
    }
    const dl = Math.hypot(dir[0], dir[1], dir[2]) || 1, d = mul(dir, 1 / dl), mid = add(last, mul(d, 0.12));
    S.cone(mid, add(mid, mul(d, 0.3)), 0.11, V.glow, {seg: 4, glow: 1});
    S.cone(mid, sub(mid, mul(d, 0.12)), 0.11, V.trim, {seg: 4, shine: 0.8});
  }

  /* ---------- НОГИ ---------- */
  for(const s of [-1, 1]){
    const hip = [s * 0.27, 1.32, 0], knee = [s * 0.3, 0.76, 0.12], ank = [s * 0.27, 0.22, 0.0];
    S.tube(hip, knee, 0.2, 0.15, V.armor2, {seg: 12, shine: 0.3});
    S.ell(add(knee, [0, 0, 0.1]), [0.15, 0.15, 0.12], V.trim, {rings: 6, seg: 10, shine: 0.85});
    S.cone(add(knee, [0, 0.02, 0.2]), add(knee, [0, 0.1, 0.46]), 0.06, V.trim, {seg: 6, shine: 0.85});
    S.tube(knee, ank, 0.15, 0.1, V.armor, {seg: 12, shine: 0.35});
    S.obox([s * 0.3, 0.68, 0.2], [s * 0.27, 0.26, 0.12], 0.15, 0.04, V.armor2, {hint: [0, 0, 1], shine: 0.5});
    S.obox([s * 0.3, 0.68, 0.225], [s * 0.27, 0.26, 0.145], 0.04, 0.02, V.trim, {hint: [0, 0, 1], shine: 0.8});
    S.ell([s * 0.27, 0.1, 0.14], [0.15, 0.1, 0.3], V.armor, {rings: 6, seg: 10, shine: 0.4});
    S.cone([s * 0.27, 0.1, 0.34], [s * 0.27, 0.05, 0.64], 0.09, V.armor2, {seg: 6, shine: 0.5});
    S.cone([s * 0.27, 0.14, -0.1], [s * 0.27, 0.26, -0.3], 0.05, V.trim, {seg: 5, shine: 0.8});
  }

  /* ---------- ТАЗ, ПОЯС, НАБЕДРЕННАЯ ТКАНЬ ---------- */
  S.ell([0, 1.32, 0], [0.46, 0.2, 0.32], V.armor, {rings: 6, seg: 14, shine: 0.3});
  S.ring([0, 1.42, 0], 0.42, 0.04, V.trim, {n: 24});
  S.ell([0, 1.42, 0.4], [0.14, 0.11, 0.045], V.trim, {rings: 5, seg: 10, shine: 0.9});
  S.ell([0, 1.42, 0.44], [0.05, 0.05, 0.025], V.glow, {rings: 4, seg: 8, glow: 1});
  { const a = [0, 1.4, 0.36], b = [sway * 0.05, 0.3, 0.5 + 0.03 * sh(t * 1.7)];
    S.obox(a, b, 0.26, 0.03, V.cloth, {hint: [0, 0, 1]});
    S.obox(add(a, [0, 0, 0.012]), add(b, [0, 0, 0.012]), 0.05, 0.03, V.trim, {hint: [0, 0, 1], shine: 0.7});
    S.cone(add(b, [0, 0.0, 0.0]), add(b, [sway * 0.03, -0.14, 0.01]), 0.09, V.glow, {seg: 4, glow: 1}); }
  for(const s of [-1, 1]){
    const a = [s * 0.42, 1.4, 0.04], b = [s * (0.52 + sway * 0.02), 0.82, 0.08];
    S.obox(a, b, 0.2, 0.04, V.armor2, {hint: [1, 0, 0], shine: 0.45});
    S.obox(add(a, [s * 0.02, 0, 0]), add(b, [s * 0.02, 0, 0]), 0.04, 0.045, V.trim, {hint: [1, 0, 0], shine: 0.8});
    const a2 = [s * 0.2, 1.38, -0.34], b2 = [s * (0.28 + sway * 0.05), 0.4, -0.46 - 0.04 * sh(t * 1.5 + s)];
    S.obox(a2, b2, 0.22, 0.03, V.cloth2, {hint: [0, 0, 1]});
  }

  /* ---------- ТОРС ---------- */
  S.tube(U([0, 1.4, 0]), U([0, 2.0, 0]), 0.3, 0.37, V.skin, {seg: 14});
  for(const s of [-1, 1]) for(let r = 0; r < 3; r++) S.ell(U([s * 0.1, 1.55 + r * 0.15, 0.3 - r * 0.01]), [0.1, 0.065, 0.05], V.skin3, {rings: 4, seg: 8, shine: 0.25});
  S.ring(U([0, 1.98, 0.0]), 0.38, 0.05, V.trim, {n: 22});
  S.ell(U([0, 2.28, 0.04]), [0.5, 0.36, 0.3], V.armor, {rings: 8, seg: 16, shine: 0.55});                    /* нагрудник */
  S.ell(U([0, 2.5, 0.0]), [0.42, 0.14, 0.26], V.armor2, {rings: 5, seg: 14, shine: 0.5});
  S.obox(U([0, 2.56, 0.26]), U([0, 2.0, 0.3]), 0.07, 0.035, V.trim, {hint: [0, 0, 1], shine: 0.85});
  for(const s of [-1, 1]){
    S.obox(U([s * 0.12, 2.5, 0.26]), U([s * 0.34, 2.16, 0.2]), 0.05, 0.03, V.trim, {hint: [0, 0, 1], shine: 0.85});
    S.obox(U([s * 0.1, 2.12, 0.33]), U([s * 0.3, 2.0, 0.24]), 0.05, 0.03, V.trim, {hint: [0, 0, 1], shine: 0.85});
  }
  S.ell(U([0, 2.22, 0.33]), [0.115, 0.14, 0.05], V.trim, {rings: 6, seg: 10, shine: 0.9});
  S.ell(U([0, 2.22, 0.37]), [0.07, 0.09, 0.035], V.glow, {rings: 5, seg: 8, glow: 1});
  S.tube(U([0, 2.52, 0]), U([0, 2.8, 0.03]), 0.15, 0.14, V.skin, {seg: 10});
  S.ring(U([0, 2.58, 0.02]), 0.27, 0.05, V.trim, {n: 20});
  S.ring(U([0, 2.64, 0.02]), 0.23, 0.03, V.trimHi, {n: 18});

  /* ---------- НАПЛЕЧНИКИ ---------- */
  for(const s of [-1, 1]){
    const big = s > 0 ? 1.08 : 1;
    S.ell(U([s * 0.76, 2.4, 0]), [0.26 * big, 0.14, 0.26 * big], V.armor2, {rings: 5, seg: 12, shine: 0.5});
    S.ell(U([s * 0.76, 2.58, 0]), [0.32 * big, 0.17, 0.3 * big], V.armor, {rings: 6, seg: 14, shine: 0.55});
    S.ring(U([s * 0.76, 2.6, 0]), 0.3 * big, 0.03, V.trim, {n: 18});
    for(let k = 0; k < 3; k++){
      const z = (k - 1) * 0.15;
      S.cone(U([s * (0.74 + 0.04 * k), 2.64, z]), U([s * (0.9 + 0.12 * (k === 1 ? 1 : 0.5)), 3.0 - 0.14 * Math.abs(k - 1) + (k === 1 ? 0.1 : 0), z * 1.5 - 0.08]), 0.075, V.trim, {seg: 6, shine: 0.85});
    }
    S.ell(U([s * 0.76, 2.72, 0.2]), [0.055, 0.055, 0.055], V.glow, {rings: 4, seg: 8, glow: 1});
  }

  /* ---------- РУКИ: правая держит меч, левая — огненный шар ---------- */
  const SX = 1.0, SZ = 0.42;                                          /* где воткнут меч */
  for(const s of [-1, 1]){
    const sho = U([s * 0.74, 2.44, 0.0]);
    const elb = s > 0 ? U([0.92, 1.96, 0.1]) : U([-0.86, 1.96, 0.16]);
    const hand = s > 0 ? [SX, 2.04, SZ] : [-0.58, 1.9 + 0.03 * sh(t * 1.6), 0.58];
    S.tube(sho, elb, 0.155, 0.12, V.skin, {seg: 12});
    S.ell(elb, [0.12, 0.12, 0.12], V.armor2, {rings: 5, seg: 10, shine: 0.5});
    S.tube(elb, hand, 0.125, 0.085, V.skin, {seg: 12});
    S.tube(lerp(elb, hand, 0.18), lerp(elb, hand, 0.8), 0.145, 0.105, V.armor, {seg: 12, shine: 0.5});
    S.ring(lerp(elb, hand, 0.3), 0.15, 0.025, V.trim, {n: 12, axis: 'z'});
    S.ell(hand, [0.1, 0.09, 0.1], V.armor2, {rings: 5, seg: 10, shine: 0.45});
  }
  { const o = [-0.58, 2.28 + 0.04 * sh(t * 1.6), 0.6], pr = 0.15 * (1 + 0.08 * sh(t * 6) + flare * 0.4);
    S.ell(o, [pr * 1.5, pr * 1.5, pr * 1.5], V.hair[0], {rings: 6, seg: 10, glow: 1});
    S.ell(o, [pr, pr, pr], V.hair[1], {rings: 6, seg: 10, glow: 1});
    S.ell(o, [pr * 0.5, pr * 0.5, pr * 0.5], V.hair[2], {rings: 5, seg: 8, glow: 1});
    for(let i = 0; i < 5; i++){
      const a = t * 2.2 + i * 1.26;
      S.ell([o[0] + Math.cos(a) * 0.3, o[1] + Math.sin(a * 1.3) * 0.12, o[2] + Math.sin(a) * 0.3], [0.03, 0.03, 0.03], i % 2 ? TH : V.hair[2], {rings: 3, seg: 5, glow: 1}); }
  }

  /* ---------- МЕЧ ---------- */
  { const X = SX, Z = SZ;
    S.obox([X, 0.12, Z], [X, 1.76, Z], 0.2, 0.045, STEEL, {hint: [0, 0, 1], shine: 0.9});
    S.obox([X, 0.2, Z + 0.03], [X, 1.7, Z + 0.03], 0.05, 0.02, V.glow, {hint: [0, 0, 1], glow: 1});
    S.cone([X, 0.22, Z], [X, -0.02, Z], 0.1, STEEL2, {seg: 4, shine: 0.9});
    S.box([X, 1.82, Z], [0.78, 0.08, 0.12], V.trim, {shine: 0.85});
    for(const s of [-1, 1]){
      S.cone([X + s * 0.38, 1.82, Z], [X + s * 0.58, 1.6, Z], 0.05, V.trim, {seg: 5, shine: 0.85});
      S.cone([X + s * 0.38, 1.82, Z], [X + s * 0.5, 2.0, Z], 0.045, V.trimHi, {seg: 5, shine: 0.85});
    }
    S.ell([X, 1.84, Z + 0.07], [0.065, 0.065, 0.03], V.glow, {rings: 4, seg: 8, glow: 1});
    S.tube([X, 1.8, Z], [X, 2.34, Z], 0.045, 0.045, '#2a1a20', {seg: 8});
    S.ell([X, 2.39, Z], [0.075, 0.075, 0.075], V.trim, {rings: 5, seg: 8, shine: 0.9});
    S.ell([X, 2.39, Z + 0.06], [0.03, 0.03, 0.02], V.glow, {rings: 3, seg: 6, glow: 1});
    for(let i = 0; i < 7; i++){                                        /* пламя вдоль клинка */
      const f = sh(t * 5 + i * 1.7), y0 = 0.3 + i * 0.21, x0 = (i % 2 ? 0.08 : -0.08);
      S.cone([X + x0, y0, Z - 0.02], [X + x0 * 1.5 + f * 0.03, y0 + 0.26 + 0.1 * f * f, Z - 0.02], 0.04, V.hair[1], {seg: 5, glow: 1});
    }
  }

  /* ---------- ГОЛОВА ---------- */
  S.ell(HD([0, 3.0, 0.04]), [0.25, 0.3, 0.27], V.skin, {rings: 9, seg: 16});
  S.ell(HD([0, 2.84, 0.12]), [0.19, 0.15, 0.2], V.skin, {rings: 6, seg: 12});
  S.cone(HD([0, 2.82, 0.2]), HD([0, 2.7, 0.27]), 0.07, V.skin2, {seg: 6});                     /* подбородок */
  for(const s of [-1, 1]){
    S.ell(HD([s * 0.15, 2.95, 0.19]), [0.075, 0.055, 0.07], V.skin, {rings: 4, seg: 8, shine: 0.2});
    S.box(HD([s * 0.1, 3.08, 0.285]), [0.18, 0.04, 0.06], V.skin2, {rot: [0, 0, -s * 0.3]});     /* бровь */
    S.box(HD([s * 0.105, 3.0, 0.298]), [0.115, 0.03 * gp, 0.03], V.eye, {glow: 1, rot: [0, 0, -s * 0.22]});
    S.ell(HD([s * 0.105, 3.0, 0.31]), [0.03, 0.016, 0.01], '#ffffff', {rings: 3, seg: 6, glow: 1});
    S.cone(HD([s * 0.24, 3.0, 0.0]), HD([s * 0.54, 3.14, -0.14]), 0.062, V.skin2, {seg: 6});    /* уши */
    S.cone(HD([s * 0.2, 2.88, 0.1]), HD([s * 0.4, 2.78, -0.06]), 0.04, V.trim, {seg: 5, shine: 0.8});   /* шипы скул */
    S.cone(HD([s * 0.04, 2.8, 0.285]), HD([s * 0.04, 2.73, 0.292]), 0.014, '#f4efe6', {seg: 4});     /* клыки */
  }
  S.box(HD([0, 2.98, 0.29]), [0.04, 0.11, 0.04], V.skin, {shine: 0.2});
  S.ell(HD([0, 2.92, 0.315]), [0.036, 0.04, 0.036], V.skin2, {rings: 4, seg: 8});
  S.box(HD([0, 2.81, 0.285]), [0.1, 0.012, 0.03], '#2b0d14');
  S.ell(HD([0, 3.22, 0.25]), [0.032, 0.045, 0.02], V.glow, {rings: 4, seg: 8, glow: 1});     /* метка на лбу */

  /* рога: изящно загнуты назад и вверх, золотые кольца */
  for(const s of [-1, 1]){
    let prev = null;
    for(let i = 0; i <= 8; i++){
      const u = i / 8;
      const p = HD([s * (0.18 + 0.5 * sh(u * Math.PI * 0.62)), 3.2 + 0.95 * u, 0.04 - 0.7 * u + 0.38 * u * u * u]);
      const r = 0.08 * (1 - u) + 0.012;
      if(prev) S.tube(prev, p, prev.r, r, V.horn, {seg: 8, shine: 0.45});
      if(i === 2 || i === 4) S.ell(p, [r * 1.45, r * 1.45, r * 1.45], V.trim, {rings: 4, seg: 8, shine: 0.85});
      if(i === 8) S.ell(p, [0.03, 0.03, 0.03], V.glow, {rings: 3, seg: 6, glow: 1});
      prev = p; prev.r = r;
    }
    S.cone(HD([s * 0.2, 3.22, 0.16]), HD([s * 0.4, 3.56, 0.18]), 0.045, V.horn, {seg: 6, shine: 0.45});
  }

  /* волосы: тёмные пряди с огненными кончиками */
  for(const s of [-1, 1]){
    const a = HD([s * 0.2, 3.18, 0.06]), b = HD([s * 0.3, 2.78, 0.0]), e = U([s * 0.36 + sway * 0.03, 2.34, 0.04]);
    S.tube(a, b, 0.058, 0.042, V.hairBase, {seg: 8});
    S.tube(b, e, 0.042, 0.012, V.hairBase, {seg: 8});
    S.cone(e, add(e, [s * 0.02, -0.22, 0]), 0.022, V.hair[1], {seg: 5, glow: 1});
    S.cone(HD([s * 0.1, 3.3, 0.2]), HD([s * 0.2, 3.05, 0.31]), 0.05, V.hairBase, {seg: 6});
  }
  S.cone(HD([0, 3.3, 0.22]), HD([0.03, 3.08, 0.33]), 0.055, V.hairBase, {seg: 6});
  for(let i = 0; i < 10; i++){
    const lane = (i - 4.5) / 4.5, w = sh(t * 1.5 + i * 0.9), al = Math.abs(lane);
    const b = HD([lane * 0.2, 3.2 - al * 0.07, -0.12]);
    const m = U([lane * 0.3 + w * 0.04, 2.72, -0.4]);
    const e = U([lane * 0.42 + w * 0.1, 2.0 + al * 0.4, -0.55 - 0.08 * w]);
    S.tube(b, m, 0.06, 0.05, V.hairBase, {seg: 6});
    S.tube(m, e, 0.05, 0.012, V.hairBase, {seg: 6});
    S.cone(e, add(e, [lane * 0.03, -0.18 - 0.08 * (i % 3), -0.02]), 0.024, i % 3 ? V.hair[1] : V.hair[2], {seg: 5, glow: 1});
  }

  /* ---------- КРУГ ПОД НОГАМИ (цвет режима) и парящие руны ---------- */
  S.ring([0, 0.025, 0.1], 1.75, 0.028, TH, {n: 48, glow: 1});
  S.ring([0, 0.03, 0.1], 1.38, 0.02, V.trim, {n: 40, glow: 1});
  const spin = t * 0.5;
  for(let i = 0; i < 8; i++){
    const a = i / 8 * Math.PI * 2 + spin;
    S.cone([Math.cos(a) * 1.4, 0.03, 0.1 + Math.sin(a) * 1.4], [Math.cos(a) * 1.74, 0.07, 0.1 + Math.sin(a) * 1.74], 0.035, i % 2 ? TH : V.hair[2], {seg: 4, glow: 1});
  }
  for(let i = 0; i < 6; i++){
    const a = t * 0.45 + i / 6 * Math.PI * 2, r = 1.5 + 0.08 * sh(t + i);
    S.ell([Math.cos(a) * r, 1.1 + i * 0.34 + 0.08 * sh(t * 1.3 + i), 0.1 + Math.sin(a) * r], [0.05, 0.13, 0.05], i % 2 ? TH : V.hair[2], {rings: 2, seg: 4, glow: 1, rot: [0, a * 2, 0]});
  }
  for(let i = 0; i < 16; i++){                                         /* поднимающиеся искры */
    const ph = (t * 0.13 + i / 16) % 1, a = i * 2.399 + t * 0.35;
    S.ell([Math.cos(a) * (0.7 + 0.8 * ((i * 7) % 5) / 5), 0.15 + ph * 4.2, 0.1 + Math.sin(a) * (0.5 + 0.5 * ((i * 3) % 4) / 4)], [0.028, 0.028, 0.028], i % 3 ? V.hair[1] : TH, {rings: 3, seg: 5, glow: 1});
  }
};

/* ---------- сцена меню: свет и руны в цвет режима вместо оранжевого пятна ---------- */
try {
  if(typeof dsDrawWarriorArt !== 'function' || typeof dsC !== 'function' || !G.menuDemon973) return;
  const prevArt = dsDrawWarriorArt;
  const hash = typeof dsHash === 'function' ? dsHash : (n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); });
  let bad = 0;

  function stageBack(now, cx, gy, u){
    const hx = cx, hy = gy - u * 90, pul = 0.9 + 0.1 * Math.sin(now * 1.6);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    /* большое мягкое сияние за фигурой + яркое ядро за головой */
    let g = ctx.createRadialGradient(hx, hy, u * 4, hx, hy, u * 130 * pul);
    g.addColorStop(0, dsC('glow', 0.5)); g.addColorStop(0.35, dsC('glow', 0.2)); g.addColorStop(1, dsC('glow', 0));
    ctx.fillStyle = g; ctx.fillRect(hx - u * 140, hy - u * 140, u * 280, u * 280);
    g = ctx.createRadialGradient(hx, hy - u * 8, 0, hx, hy - u * 8, u * 34);
    g.addColorStop(0, dsC('accentLight', 0.38 * pul)); g.addColorStop(1, dsC('accentLight', 0));
    ctx.fillStyle = g; ctx.fillRect(hx - u * 40, hy - u * 50, u * 80, u * 80);
    /* лучи, медленно вращающиеся вокруг головы */
    if(perfLevel < 2){
      for(let i = 0; i < 14; i++){
        const a = i / 14 * Math.PI * 2 + now * 0.04, wd = 0.028 + hash(i) * 0.03;
        const rg = ctx.createRadialGradient(hx, hy, 0, hx, hy, u * 150);
        rg.addColorStop(0, dsC('hover', 0.07)); rg.addColorStop(1, dsC('hover', 0));
        ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(hx, hy);
        ctx.lineTo(hx + Math.cos(a - wd) * u * 150, hy + Math.sin(a - wd) * u * 150);
        ctx.lineTo(hx + Math.cos(a + wd) * u * 150, hy + Math.sin(a + wd) * u * 150); ctx.closePath(); ctx.fill();
      }
    }
    /* большое тонкое рунное кольцо за демоном */
    for(let r = 0; r < 2; r++){
      const rad = u * (r ? 70 : 82), dir = r ? -1 : 1;
      ctx.strokeStyle = dsC('ring', r ? 0.22 : 0.34); ctx.lineWidth = Math.max(1, u * 0.2);
      ctx.setLineDash([u * 5, u * 3]); ctx.lineDashOffset = -now * u * 4 * dir;
      ctx.beginPath(); ctx.arc(hx, hy, rad, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      for(let k = 0; k < 16; k++){
        const a = k / 16 * Math.PI * 2 + now * 0.12 * dir, rx = hx + Math.cos(a) * rad, ry = hy + Math.sin(a) * rad;
        ctx.fillStyle = dsC('spark2', 0.35 + 0.35 * Math.sin(now * 2 + k));
        ctx.save(); ctx.translate(rx, ry); ctx.rotate(a + Math.PI / 2); ctx.fillRect(-u * 0.25, -u * 1.5, u * 0.5, u * 3); ctx.fillRect(-u * 1, -u * 0.25, u * 2, u * 0.5); ctx.restore();
      }
    }
    ctx.restore();
  }

  function stageFloor(now, cx, gy, u){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    /* магический круг на полу: вытянутый эллипс, пентаграмма и руны */
    ctx.translate(cx, gy + u * 1.5); ctx.scale(1, 0.15);
    const R = u * 66, rot = now * 0.18;
    const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.25);
    gl.addColorStop(0, dsC('glow', 0.45)); gl.addColorStop(0.7, dsC('glow', 0.14)); gl.addColorStop(1, dsC('glow', 0));
    ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, R * 1.25, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(1.2, u * 0.34);
    ctx.strokeStyle = dsC('accentLight', 0.7); ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = dsC('ring', 0.5); ctx.setLineDash([u * 3, u * 2.5]); ctx.lineDashOffset = -now * u * 5;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.86, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = dsC('spark2', 0.55); ctx.lineWidth = Math.max(1, u * 0.26);
    ctx.beginPath();
    for(let k = 0; k < 6; k++){ const a = rot + (k * 2 % 5) / 5 * Math.PI * 2 - Math.PI / 2, px = Math.cos(a) * R * 0.84, py = Math.sin(a) * R * 0.84; if(k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke();
    for(let k = 0; k < 24; k++){
      const a = -rot * 0.7 + k / 24 * Math.PI * 2, rr = R * 0.96;
      ctx.fillStyle = dsC('spark2', 0.3 + 0.4 * Math.max(0, Math.sin(now * 2.2 + k)));
      ctx.save(); ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr); ctx.rotate(a); ctx.fillRect(-u * 0.9, -u * 0.25, u * 1.8, u * 0.5); ctx.restore();
    }
    ctx.restore();
  }

  function stageFront(now, cx, gy, u){
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    /* языки света у ног и поднимающийся дымок цвета режима */
    if(perfLevel < 3){
      const n = perfLevel >= 2 ? 10 : 22;
      for(let i = 0; i < n; i++){
        const ph = (now * (0.07 + hash(i + 3) * 0.06) + hash(i + 9)) % 1, ang = i * 2.1 + now * 0.4;
        const rad = u * (14 + hash(i + 5) * 44) * (1 - ph * 0.3);
        ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.85;
        ctx.fillStyle = i % 3 ? dsC('spark1') : dsC('spark2');
        const sz = 1.2 + hash(i + 11) * 2.4;
        ctx.fillRect(cx + Math.cos(ang) * rad, gy - ph * u * 150 + Math.sin(ang) * rad * 0.2, sz, sz);
      }
      ctx.globalAlpha = 1;
    }
    /* низкий туман по полу */
    for(let i = 0; i < 3; i++){
      const fx = VW * (0.46 + i * 0.2) + Math.sin(now * 0.2 + i * 2.1) * VW * 0.05, fy = gy - u * 2;
      const fg = ctx.createRadialGradient(fx, fy, 0, fx, fy, u * 70);
      fg.addColorStop(0, dsC('glow', 0.11)); fg.addColorStop(1, dsC('glow', 0));
      ctx.save(); ctx.translate(0, fy); ctx.scale(1, 0.22); ctx.translate(0, -fy);
      ctx.fillStyle = fg; ctx.fillRect(fx - u * 70, fy - u * 70, u * 140, u * 140); ctx.restore();
    }
    ctx.restore();
    /* пол уходит в темноту */
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    const gr = ctx.createLinearGradient(0, gy - u * 2, 0, VH);
    gr.addColorStop(0, 'rgba(5,1,2,0)'); gr.addColorStop(0.45, 'rgba(5,1,2,.92)'); gr.addColorStop(1, '#030102');
    ctx.fillStyle = gr; ctx.fillRect(0, gy - u * 2, VW, VH - (gy - u * 2));
    ctx.restore();
  }

  dsDrawWarriorArt = function(now){
    if(bad >= 3 || perfLevel >= 3) return prevArt.apply(this, arguments);
    const s = (typeof menuScale === 'function') ? menuScale() : 1;
    const leftEdge = 396 * s, rightEdge = VW - 386 * s, freeW = Math.max(300, rightEdge - leftEdge);
    const scale = Math.max(0.5, Math.min(0.88, freeW * 1.06 / (VH * 0.96 * 1.05)));
    const cx = Math.max(VW * 0.4, Math.min(VW * 0.62, (leftEdge + rightEdge) / 2)), gy = VH * 0.95, u = VH * 0.0062 * scale;
    G.menuDemonScale = scale;
    try {
      stageBack(now, cx, gy, u);
      stageFloor(now, cx, gy, u);
      if(!menuDemon973.draw(cx, gy, u, now)){ prevArt.apply(this, arguments); return; }   /* запасной вариант — прежний 2D-арт */
      stageFront(now, cx, gy, u);
      bad = 0;
    } catch(err) { bad++; try { ctx.restore(); } catch(e2) {} console.warn('update01005 stage', err); }
  };
} catch(err) { console.warn('update01005', err); }
})();
