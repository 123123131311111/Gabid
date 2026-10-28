/* DotaSense 0.9.8.1 — 3D-демон главного меню: ЛОХМАТЫЙ УРОДЛИВЫЙ ДЕМОН.
   Собран из примитивов движка Hero3D (hero3d.js), регистрируется как модель 'menuDemon'.
   Горбатый, с шерстью по всему телу, кривыми рогами и клыками, свисающим брюхом.
   Каждые 14 секунд по кругу играет «юз»: 1) огненный шар, 2) рёв, 3) удар глефой по земле.
   Между ними — живой idle: дыхание, подёргивание головы, колышущаяся шерсть и огонь. */
(function(){
'use strict';
const G = (typeof window !== 'undefined') ? window : globalThis;
const H3 = G.Hero3D;
if(!H3 || !H3.models) return;

const SKIN = '#7a2a1c', SKIN2 = '#52190f', SKIN3 = '#94402a', ARM = '#2b1c22', GOLD = '#b98a3a', GOLD2 = '#ffd98a';
const FUR = '#3d140d', FUR2 = '#260a07', FUR3 = '#6b2a16', CLOTH = '#4a0f0b', CLOTH2 = '#6e1a10';
const BONE = '#d9c79c', BONE2 = '#a8946a', FIRE = '#ff8a2a', FIRE2 = '#ffd36a', EYE = '#ffe27a', WART = '#a86a3c';

const cl = x => Math.max(0, Math.min(1, x));
const sm = x => { x = cl(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sh = x => Math.sin(x);

H3.models.menuDemon = function(S, def, t){
  t = t || 0;
  /* ---------- расписание «юзов» (цикл 14 с) ---------- */
  const c = t % 14;
  const cu = (c >= 3 && c < 6.6) ? (c - 3) / 3.6 : -1;        /* огненный шар */
  const ru = (c >= 7.6 && c < 10.2) ? (c - 7.6) / 2.6 : -1;   /* рёв */
  const su = (c >= 11 && c < 13.6) ? (c - 11) / 2.6 : -1;     /* удар глефой */

  /* огненный шар: подъём руки / бросок */
  const cRaise = cu < 0 ? 0 : sm(cu / 0.3) * (1 - sm((cu - 0.72) / 0.28));
  const cThrow = cu < 0 ? 0 : sm((cu - 0.4) / 0.1) * (1 - sm((cu - 0.62) / 0.25));
  /* рёв */
  const roar = ru < 0 ? 0 : sm(ru / 0.22) * (1 - sm((ru - 0.78) / 0.22));
  const shake = roar * sh(t * 38) * 0.012;
  /* удар глефой */
  const sWind = su < 0 ? 0 : sm(su / 0.38) * (1 - sm((su - 0.46) / 0.05));
  const sHit = su < 0 ? 0 : sm((su - 0.42) / 0.07) * (1 - sm((su - 0.55) / 0.35));
  const sFree = su < 0 ? 0 : sm((su - 0.42) / 0.06) * (1 - sm((su - 0.7) / 0.3));   /* вытянутая вперёд поза */

  const br = sh(t * 1.5) * 0.02;                            /* дыхание */
  const sw = sh(t * 0.9);
  const twitch = Math.max(0, sh(t * 0.7 + 1.3)) ** 9 * sh(t * 17) * 0.05;  /* подёргивание головы */
  const sniff = Math.max(0, sh(t * 0.43 + 2)) ** 12;

  /* ---------- горб: наклон верхней части тела вперёд ---------- */
  const lean = 0.34 - roar * 0.5 + sHit * 0.32 - sWind * 0.18 + cRaise * 0.05 + br * 2;
  const cL = Math.cos(lean), sL = Math.sin(lean);
  const U = p => {                                          /* вращение вокруг таза */
    const y = p[1] - 1.1, z = p[2];
    return [p[0] + shake, 1.1 + y * cL - z * sL, z * cL + y * sL];
  };
  const uEll = (cc, r, col, o) => S.ell(U(cc), r, col, o);
  const uTube = (a, b, r0, r1, col, o) => S.tube(U(a), U(b), r0, r1, col, o);
  const uCone = (a, b, r, col, o) => S.cone(U(a), U(b), r, col, o);
  const uBox = (cc, sz, col, o) => S.box(U(cc), sz, col, o);

  /* шерстинка: основание, направление, длина; качается на ветру */
  let fi = 0;
  const tuft = (base, dir, len, r, col, up) => {
    fi++;
    const f = sh(t * 2.2 + fi * 1.7) * 0.05 * len;
    const b = up ? U(base) : base;
    len *= 1.35; const tip = [b[0] + dir[0] * len + f, b[1] + dir[1] * len + f * 0.5, b[2] + dir[2] * len];
    S.cone(b, tip, r, col, {seg: 4});
  };

  /* ---------- рваный плащ-лохмотья за спиной ---------- */
  for(let i = -3; i <= 3; i++){
    const k = Math.abs(i);
    const a = U([i * 0.24, 2.2 - k * 0.04, -0.4]);
    const b = [i * 0.38 + sw * 0.08 * (1 + k * 0.3), 0.1 + k * 0.18 + (i % 2 ? 0.2 : 0), -0.85 - sw * 0.05 * (k + 1) * 0.3];
    S.obox(a, b, 0.22, 0.05, k % 2 ? CLOTH : CLOTH2, {shine: 0.05});
    S.cone(add(b, [0, 0.12, 0]), add(b, [i * 0.03, -0.18, -0.04]), 0.1, FIRE, {seg: 5, glow: 1});
  }

  /* ---------- кривые ноги (колесом), шерстяные ---------- */
  for(const s of [-1, 1]){
    const bow = s > 0 ? 1 : 0.8;
    const hip = [s * 0.32, 1.1, 0], knee = [s * 0.5 * bow, 0.66, 0.2], ank = [s * 0.36, 0.16, 0.02];
    S.tube(hip, knee, 0.24, 0.18, SKIN2, {seg: 12});
    S.ell(knee, [0.2, 0.18, 0.2], SKIN2, {rings: 6, seg: 10});
    S.tube(knee, ank, 0.17, 0.12, SKIN2, {seg: 12});
    for(let k = 0; k < 6; k++){                                  /* шерсть на ногах */
      const y = 0.25 + k * 0.14, x = s * (0.34 + (k < 3 ? 0.04 : 0.14) * bow);
      tuft([x + s * 0.08, y, 0.12], [s * 0.5, -0.45, 0.3], 0.22, 0.05, k % 2 ? FUR : FUR2);
      tuft([x - s * 0.06, y, 0.2], [0, -0.5, 0.5], 0.2, 0.045, FUR3);
    }
    S.ell([s * 0.36, 0.1, 0.14], [0.2, 0.1, 0.3], ARM, {rings: 6, seg: 10, shine: 0.3});
    for(const k of [-1, 0, 1]) S.cone([s * 0.36 + k * 0.09, 0.1, 0.36], [s * 0.36 + k * 0.12, 0.04, 0.62], 0.05, BONE2, {seg: 5});   /* когти */
  }

  /* ---------- таз, рваная набедренная повязка ---------- */
  S.ell([0, 1.12, 0], [0.58, 0.24, 0.4], FUR2, {rings: 7, seg: 14});
  S.tube([0, 1.08, 0], [0, 1.2, 0], 0.6, 0.56, '#5a3b1a', {seg: 16, shine: 0.2});
  for(let i = 0; i < 9; i++){
    const a = i / 9 * Math.PI * 2, cs = Math.cos(a), sn = Math.sin(a);
    if(sn < -0.4) continue;
    S.cone([cs * 0.46, 1.08, sn * 0.32], [cs * 0.52 + sh(t * 1.3 + i) * 0.03, 0.45 + (i % 3) * 0.1, sn * 0.4], 0.11, i % 2 ? CLOTH : CLOTH2, {seg: 5});
  }
  S.ell([0.04, 1.14, 0.42], [0.09, 0.09, 0.04], BONE, {rings: 4, seg: 6});       /* череп-пряжка */

  /* ---------- торс: горб, отвисшее брюхо ---------- */
  uTube([0, 1.15, 0], [0, 1.75, 0], 0.5, 0.62, SKIN, {seg: 16});
  uEll([0, 1.42 + br * 0.5, 0.3], [0.62, 0.52, 0.52], SKIN, {rings: 9, seg: 16});        /* брюхо */
  uEll([0.14, 1.22, 0.5], [0.3, 0.2, 0.22], SKIN3, {rings: 6, seg: 10});                /* складка */
  uEll([0, 1.98 + br, 0.0], [0.8, 0.5 + br, 0.5], SKIN, {rings: 10, seg: 18});           /* грудь */
  uEll([0, 2.2, -0.4], [0.58, 0.46, 0.42], SKIN2, {rings: 8, seg: 14});                  /* горб */
  uEll([0.3, 2.45, -0.42], [0.2, 0.18, 0.2], WART, {rings: 4, seg: 8});                  /* бородавки */
  uEll([-0.5, 1.72, 0.55], [0.07, 0.07, 0.07], WART, {rings: 4, seg: 6});
  uEll([0.42, 1.28, 0.78], [0.06, 0.06, 0.06], WART, {rings: 4, seg: 6});
  uEll([-0.12, 1.58, 0.8], [0.05, 0.05, 0.05], WART, {rings: 4, seg: 6});
  /* шрамы */
  for(let k = 0; k < 3; k++) uBox([-0.3 + k * 0.05, 1.95 - k * 0.1, 0.5], [0.34, 0.022, 0.03], BONE2, {rot: [0, 0, 0.5]});
  /* грудь: пульсирующее ядро в дыре плоти */
  const pulse = 0.85 + 0.15 * sh(t * 2.6) + roar * 0.7;
  uEll([0, 1.98, 0.48], [0.2, 0.2, 0.06], '#1a0504', {rings: 5, seg: 10});
  uEll([0, 1.98, 0.5], [0.13 * pulse, 0.13 * pulse, 0.05], FIRE2, {rings: 5, seg: 10, glow: 1});
  S.ring(U([0, 1.98, 0.5]), 0.22, 0.03, FIRE, {n: 14, axis: 'z', glow: 1});

  /* шерсть по телу: грудь, брюхо, горб, спина */
  for(let i = 0; i < 16; i++){
    const a = i / 16 * Math.PI * 2, rx = Math.cos(a), rz = Math.sin(a);
    tuft([rx * 0.52, 1.45 + (i % 4) * 0.1, rz * 0.4 + 0.12], [rx * 0.6, -0.55, rz * 0.5 + 0.2], 0.3, 0.07, i % 2 ? FUR : FUR3, true);
  }
  for(let i = 0; i < 14; i++){
    const a = (i / 14 - 0.5) * 2.6;
    tuft([sh(a) * 0.6, 2.05 + Math.cos(a) * 0.3, 0.38], [sh(a) * 0.3, -0.35, 0.8], 0.28, 0.06, i % 2 ? FUR2 : FUR, true);
  }
  for(let i = 0; i < 12; i++){                                                             /* грива вдоль хребта */
    const y = 1.4 + i * 0.12, a = i % 2 ? 0.1 : -0.1;
    tuft([a, y, -0.38 - Math.max(0, 0.18 - Math.abs(i - 6) * 0.03)], [a * 2, 0.12, -0.9], 0.4 + (i % 3) * 0.08, 0.09, i % 3 ? FUR2 : FUR, true);
  }

  /* ---------- шея и голова ---------- */
  const hx = twitch, hy = roar * 0.18 + sniff * -0.05, hz = -roar * 0.18 + sniff * 0.1;
  const HD = p => add(U(add(p, [hx, hy, hz])), [0, 0, 0]);
  const hEll = (cc, r, col, o) => S.ell(HD(cc), r, col, o);
  const hCone = (a, b, r, col, o) => S.cone(HD(a), HD(b), r, col, o);
  uTube([0, 2.1, 0.0], [0, 2.5, 0.15], 0.28, 0.24, SKIN2, {seg: 12});
  S.ell(HD([0, 2.55, 0.28]), [0.32, 0.32, 0.36], SKIN, {rings: 10, seg: 18});                 /* череп вперёд (сутулость) */
  hEll([0, 2.62, 0.3], [0.36, 0.3, 0.38], SKIN, {rings: 8, seg: 16});
  hEll([0.06, 2.34 - roar * 0.12, 0.5], [0.34, 0.2, 0.28], SKIN2, {rings: 7, seg: 12});       /* тяжёлая челюсть */
  hEll([-0.12, 2.34 - roar * 0.2, 0.62], [0.12, 0.08, 0.1], '#a83a3a', {rings: 4, seg: 8});   /* свисающая губа */
  hEll([0, 2.66 - roar * 0.0, 0.62], [0.35, 0.08, 0.12], SKIN2, {rings: 5, seg: 12, rot: [0.3, 0, 0]});   /* нависающие брови */
  hEll([0, 2.5, 0.72], [0.1, 0.13, 0.1], SKIN3, {rings: 5, seg: 8});                          /* нос-картошка */
  hEll([-0.2, 2.74, 0.58], [0.05, 0.05, 0.05], WART, {rings: 3, seg: 6});
  hEll([0.17, 2.4, 0.66], [0.045, 0.045, 0.045], WART, {rings: 3, seg: 6});
  /* пасть */
  S.box(HD([0, 2.34 - roar * 0.05, 0.74]), [0.2 + roar * 0.06, 0.03 + roar * 0.14, 0.04], '#140302');
  /* клыки разной длины, кривые */
  const tuskL = [[-0.16, 0.34, 0.1], [0.17, 0.26, -0.04], [-0.06, 0.18, 0.03], [0.09, 0.16, 0.0]];
  tuskL.forEach((tk, i) => {
    const x = tk[0], bx = x * 0.9, by = 2.4 - roar * 0.1;
    hCone([bx, by, 0.68], [x * 1.25, by + (i < 2 ? 0.1 : -0.1) + tk[2] - (i < 2 ? 0 : 0.1), 0.78 + tk[2] * 0.5], 0.03 + (i < 2 ? 0.015 : 0), i % 2 ? BONE : BONE2, {seg: 5});
  });
  /* слюна */
  const dr = (t * 0.6) % 1;
  hEll([-0.12, 2.28 - dr * 0.4 - roar * 0.2, 0.7], [0.016, 0.03, 0.016], '#c9e4d0', {rings: 3, seg: 5});
  /* глаза: левый крупный и злой, правый маленький, косой */
  const eg = 0.85 + 0.15 * sh(t * 3.2);
  hEll([-0.14, 2.62, 0.62], [0.1 * eg, 0.055, 0.04], EYE, {rings: 4, seg: 8, glow: 1});
  hEll([-0.14, 2.62, 0.655], [0.035, 0.035, 0.02], '#ff2a10', {rings: 3, seg: 6, glow: 1});
  hEll([0.16, 2.6, 0.6], [0.06 * eg, 0.03, 0.03], EYE, {rings: 4, seg: 8, glow: 1, rot: [0, 0, 0.25]});
  hEll([0.16, 2.6, 0.63], [0.022, 0.022, 0.015], '#ff2a10', {rings: 3, seg: 6, glow: 1});
  S.box(HD([0.17, 2.66, 0.62]), [0.014, 0.12, 0.02], BONE2, {rot: [0, 0, 0.5]});                /* шрам через глаз */
  /* уши: рваные, острые, разной длины */
  hCone([-0.34, 2.62, 0.2], [-0.78, 2.78, 0.05], 0.08, SKIN2, {seg: 6});
  hCone([-0.6, 2.72, 0.1], [-0.72, 2.6, 0.08], 0.03, SKIN2, {seg: 4});
  hCone([0.34, 2.6, 0.2], [0.6, 2.62, 0.1], 0.07, SKIN2, {seg: 6});
  /* рога: левый длинный и кривой, правый обломан */
  const hpL = [[-0.22, 2.9, 0.2], [-0.45, 3.0, 0.08], [-0.66, 3.3, 0.06], [-0.55, 3.62, 0.18], [-0.36, 3.78, 0.34]];
  const hrL = [0.12, 0.1, 0.078, 0.05, 0.0];
  for(let i = 0; i < 4; i++) S.tube(HD(hpL[i]), HD(hpL[i + 1]), hrL[i], hrL[i + 1], i === 3 ? BONE : '#3a2420', {seg: 8, shine: 0.25});
  const hpR = [[0.22, 2.88, 0.2], [0.42, 2.98, 0.1], [0.5, 3.18, 0.1]];
  S.tube(HD(hpR[0]), HD(hpR[1]), 0.12, 0.1, '#3a2420', {seg: 8});
  S.tube(HD(hpR[1]), HD(hpR[2]), 0.1, 0.085, '#3a2420', {seg: 8});
  S.ell(HD(hpR[2]), [0.09, 0.05, 0.09], BONE2, {rings: 4, seg: 8});                              /* облом */
  S.cone(HD([0.5, 3.18, 0.1]), HD([0.56, 3.36, 0.0]), 0.03, BONE2, {seg: 4});                    /* щепа */
  S.ell(HD(hpL[0]), [0.13, 0.1, 0.13], GOLD, {rings: 4, seg: 8, shine: 0.4});
  /* лохматая грива и борода */
  for(let i = 0; i < 11; i++){
    const a = (i - 5) / 5 * 1.0, f = 0.14 * sh(t * 3 + i * 1.7) * (1 + roar * 2);
    const base = HD([sh(a) * 0.28, 2.9, -0.05]);
    S.cone(base, [base[0] + sh(a) * 0.4 + f, base[1] + 0.52 + Math.cos(a) * 0.24 + f + roar * 0.3, base[2] - 0.45 - Math.abs(a) * 0.2], 0.11, i % 2 ? FIRE : FIRE2, {seg: 6, glow: 1});
  }
  for(let i = 0; i < 9; i++){
    const a = (i - 4) / 4 * 0.9;
    hCone([sh(a) * 0.32, 2.5, 0.5 - Math.abs(a) * 0.1], [sh(a) * 0.38 + sh(t * 2.4 + i) * 0.04, 2.0 - (i % 3) * 0.12, 0.6 - Math.abs(a) * 0.12 + 0.1], 0.07, i % 2 ? FUR : FUR3, {seg: 4});
  }
  for(let i = 0; i < 6; i++) hCone([(i - 2.5) * 0.12, 2.9, 0.15], [(i - 2.5) * 0.16, 2.78 - (i % 2) * 0.08, 0.55], 0.06, FUR2, {seg: 4});   /* чёлка */

  /* ---------- плечи: меховые, с шипами ---------- */
  for(const s of [-1, 1]){
    const big = s > 0 ? 1.18 : 1;
    uEll([s * 0.86, 2.2, 0], [0.4 * big, 0.3 * big, 0.38 * big], FUR2, {rings: 8, seg: 14});
    uEll([s * 0.86, 2.28, 0.05], [0.34 * big, 0.2 * big, 0.3 * big], ARM, {rings: 6, seg: 12, shine: 0.3});
    for(let k = 0; k < 5; k++){
      const a = (k - 2) * 0.45;
      tuft([s * (0.86 + sh(a) * 0.22), 2.34, Math.cos(a) * 0.2], [s * 0.35, 0.6, (k - 2) * 0.15], 0.28 * big, 0.06, k % 2 ? FUR : FUR3, true);
    }
    for(let k = 0; k < 3; k++){
      const a = (k - 1) * 0.55;
      uCone([s * (0.86 + sh(a) * 0.15), 2.4, Math.cos(a) * 0.15 - 0.02], [s * (1.05 + k * 0.1), 2.95 - Math.abs(k - 1) * 0.18 + (s > 0 ? 0.12 : -0.1), (k - 1) * 0.22], 0.07 * (s > 0 ? 1.2 : 1), k === 1 ? BONE : BONE2, {seg: 6});
    }
  }

  /* ---------- длинные косматые руки ---------- */
  const arm = (sh0, hand, big, col) => {
    const mid = lerp(sh0, hand, 0.5);
    const el = add(mid, [Math.sign(sh0[0]) * 0.32, -0.22, -0.05]);
    uTube(sh0, el, 0.2 * big, 0.17 * big, col, {seg: 12});
    uEll(el, [0.17 * big, 0.17 * big, 0.17 * big], FUR2, {rings: 6, seg: 10});
    uTube(el, hand, 0.17 * big, 0.14 * big, col, {seg: 12});
    for(let k = 0; k < 6; k++){
      const p = lerp(sh0, hand, 0.15 + k * 0.14);
      const sd = k % 2 ? 1 : -1;
      uCone(add(p, [sd * 0.14, 0.03, 0]), add(p, [sd * 0.26 + sh(t * 2 + k) * 0.03, -0.3, 0.06]), 0.055, k % 2 ? FUR : FUR3, {seg: 4});
    }
    uEll(hand, [0.17 * big, 0.15 * big, 0.17 * big], SKIN2, {rings: 6, seg: 10});
    for(let k = -1; k <= 1; k++) uCone(add(hand, [k * 0.07, -0.05, 0.1]), add(hand, [k * 0.1, -0.18, 0.28]), 0.04, BONE2, {seg: 4});   /* когти */
  };

  /* правая рука с глефой */
  {
    const shR = [0.86, 2.06, 0];
    const rest = [1.04, 1.18, 0.6];
    const wind = [1.0, 3.0, 0.0];
    const hit = [1.0, 0.95, 1.2];
    let hand = lerp(rest, wind, sWind);
    hand = lerp(hand, hit, sFree);
    const ang = -0.55 * sWind + (1.15 + 0.2) * sFree - 0.0;           /* наклон древка: назад / вперёд */
    arm(shR, hand, 1.15, SKIN);
    const hU = U(hand);
    const d = [0, Math.cos(ang), Math.sin(ang)];
    const P = (lx, ly) => [hU[0] + lx, hU[1] + d[1] * ly - d[2] * 0 + 0, hU[2] + d[2] * ly];
    S.tube(P(0, -1.2), P(0, 2.5), 0.06, 0.06, '#2a1a14', {seg: 8, shine: 0.4});
    for(const y of [-0.6, 0.6, 1.2]) S.tube(P(0, y), P(0, y + 0.07), 0.08, 0.08, GOLD, {seg: 8, shine: 0.5});
    S.cone(P(0, 2.45), P(0, 3.4), 0.1, '#b9c0cc', {seg: 6, shine: 0.7});
    for(const s of [-1, 1]){
      let prev = P(0, 2.5);
      for(let i = 1; i <= 6; i++){
        const a = i / 6 * Math.PI * 0.55;
        const p = P(s * 0.78 * sh(a), 2.5 + 0.82 * (1 - Math.cos(a)) + 0.05 * i);
        S.obox(prev, p, 0.14 * (1 - i / 7) + 0.03, 0.04, i > 4 ? '#e6eaf2' : '#aab2c0', {shine: 0.8});
        S.obox(prev, p, 0.03, 0.05, FIRE2, {glow: 1, shine: 0.3});
        prev = p;
      }
    }
    S.ell(P(0, 2.5), [0.1, 0.1, 0.1], FIRE, {rings: 5, seg: 8, glow: 1});
    S.ell(P(0, -1.2), [0.07, 0.04, 0.07], BONE2, {rings: 4, seg: 8});
    /* ударная волна от земли */
    if(su >= 0 && su > 0.45){
      const q = cl((su - 0.45) / 0.45);
      const gx = 1.0, gz = 1.55;
      S.ring([gx, 0.02, gz], 0.25 + q * 1.6, 0.06 * (1 - q) + 0.015, FIRE2, {glow: 1, n: 30});
      S.ring([gx, 0.02, gz], 0.15 + q * 1.0, 0.05 * (1 - q) + 0.012, '#ffffff', {glow: 1, n: 24});
      for(let i = 0; i < 10; i++){
        const a = i / 10 * Math.PI * 2 + 0.4, r = 0.2 + q * 1.1;
        S.cone([gx + Math.cos(a) * r, 0.04, gz + Math.sin(a) * r * 0.6], [gx + Math.cos(a) * (r + 0.05), 0.04 + 0.5 * (1 - q) + 0.1, gz + Math.sin(a) * (r + 0.05) * 0.6], 0.05, FIRE, {seg: 4, glow: 1});
      }
    }
  }

  /* левая рука с шаром пламени */
  {
    const shL = [-0.86, 2.06, 0];
    const rest = [-0.88, 1.42, 0.78];
    const up = [-0.95, 2.75, 0.55];
    const thr = [-0.55, 2.15, 1.35];
    let hand = lerp(rest, up, cRaise);
    hand = lerp(hand, thr, cThrow);
    arm(shL, hand, 1, SKIN);
    const hU = U(hand);
    const idleR = 0.24 * pulse;
    let o, rad;
    if(cu >= 0 && cu < 0.5){                                   /* зарядка */
      const g = cu / 0.5;
      o = [hU[0], hU[1] + 0.32, hU[2] + 0.05];
      rad = 0.14 + 0.34 * sm(g) + 0.04 * sh(t * 14);
    } else if(cu >= 0.5){                                      /* полёт */
      const q = (cu - 0.5) / 0.5;
      const thrU = U(thr);
      o = [thrU[0] + q * 0.25, thrU[1] + 0.3 - q * 0.1, thrU[2] + 0.1 + q * 2.4];
      rad = 0.48 * (1 - sm((q - 0.55) / 0.45)) + 0.04 * sh(t * 14);
      /* огненный хвост */
      for(let i = 1; i <= 5; i++) S.ell([o[0], o[1], o[2] - i * 0.22 * (1 - q * 0.3)], [rad * (1 - i * 0.14), rad * (1 - i * 0.14), rad * 0.9], i % 2 ? FIRE : '#d8441a', {rings: 5, seg: 8, glow: 1});
    } else {
      o = [hU[0] + 0.03, hU[1] + 0.3 + sh(t * 2) * 0.03, hU[2] + 0.04];
      rad = idleR;
    }
    if(rad > 0.02){
      S.ell(o, [rad, rad, rad], FIRE, {rings: 8, seg: 12, glow: 1});
      S.ell(o, [rad * 0.58, rad * 0.58, rad * 0.58], '#fff1c0', {rings: 6, seg: 10, glow: 1});
      for(let i = 0; i < 6; i++){
        const a = i / 6 * Math.PI * 2 + t * 1.6, r = rad * 1.2;
        S.cone([o[0] + Math.cos(a) * r * 0.6, o[1] + 0.02, o[2] + Math.sin(a) * r * 0.6], [o[0] + Math.cos(a) * r * 0.9, o[1] + rad * 1.4 + 0.1 * sh(t * 4 + i), o[2] + Math.sin(a) * r * 0.9], 0.06 + rad * 0.08, i % 2 ? FIRE : FIRE2, {seg: 5, glow: 1});
      }
    }
    /* вспышка ладони при броске */
    if(cThrow > 0.05) S.ring(add(hU, [0, 0.2, 0.1]), 0.2 + cThrow * 0.5, 0.03, '#ffffff', {glow: 1, n: 16, axis: 'z'});
  }

  /* ---------- рёв: огненное дыхание из пасти и вспышка ---------- */
  if(roar > 0.05){
    const m = HD([0, 2.36, 0.82]);
    for(let i = 0; i < 9; i++){
      const a = (i / 9) * Math.PI * 2 + t * 6, k = (i % 3) * 0.2, L = 0.5 + roar * 0.9;
      S.cone(m, [m[0] + Math.cos(a) * (0.12 + k * 0.5), m[1] + 0.1 + Math.sin(a) * (0.1 + k * 0.4), m[2] + L], 0.05 + roar * 0.06, i % 2 ? FIRE : FIRE2, {seg: 5, glow: 1});
    }
    S.ring(U([0, 1.98, 0.5]), 0.25 + roar * 0.9, 0.03, FIRE2, {glow: 1, n: 24, axis: 'z'});
    S.ring([0, 0.02, 0.2], 0.5 + roar * 1.4, 0.04, FIRE, {glow: 1, n: 30});
    for(let i = 0; i < 8; i++){                                                    /* искры вверх */
      const a = i / 8 * Math.PI * 2;
      S.cone([Math.cos(a) * 0.7, 0.05, Math.sin(a) * 0.5], [Math.cos(a) * 0.8, 0.05 + roar * (0.6 + (i % 3) * 0.3), Math.sin(a) * 0.6], 0.05, FIRE, {seg: 4, glow: 1});
    }
  }
};
})();
