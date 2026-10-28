/* DotaSense 0.9.7.3 — 3D-модель главного героя меню («Владыка Пламени»).
   Собрана из примитивов движка Hero3D (hero3d.js) и регистрируется как модель 'menuDemon'.
   Рисуется в меню вживую: плавный разворот за мышью, дыхание, колышущийся плащ и огонь. */
(function(){
'use strict';
const G = (typeof window !== 'undefined') ? window : globalThis;
const H3 = G.Hero3D;
if(!H3 || !H3.models) return;

const SKIN = '#7d1d18', SKIN2 = '#5a1411', ARM = '#2b1c22', ARM2 = '#3b2730', GOLD = '#e0a84a', GOLD2 = '#ffd98a';
const CLOTH = '#7a1410', CLOTH2 = '#a82a16', BONE = '#e9d8b4', FIRE = '#ff8a2a', FIRE2 = '#ffd36a', EYE = '#ffe27a';

H3.models.menuDemon = function(S, def, t){
  t = t || 0;
  const br = Math.sin(t * 1.6) * 0.012;            /* дыхание */
  const sw = Math.sin(t * 0.9);                    /* покачивание плаща */
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

  /* ----- плащ (за спиной) ----- */
  for(let i = -3; i <= 3; i++){
    const k = Math.abs(i);
    const a = [i * 0.21, 2.3 - k * 0.03, -0.42];
    const b = [i * 0.36 + sw * 0.07 * (1 + k * 0.3), 0.18 + k * 0.1, -0.95 - sw * 0.05 * (k + 1) * 0.3];
    S.obox(a, b, 0.24, 0.05, k % 2 ? CLOTH : CLOTH2, {shine: 0.1});
    S.cone(add(b, [0, 0.12, 0]), add(b, [i * 0.03, -0.12, -0.04]), 0.11, FIRE, {seg: 5, glow: 1});
  }

  /* ----- ноги ----- */
  for(const s of [-1, 1]){
    const hip = [s * 0.3, 1.1, 0], knee = [s * 0.36, 0.64, 0.14], ank = [s * 0.34, 0.16, -0.02];
    S.tube(hip, knee, 0.22, 0.17, SKIN2, {seg: 14});
    S.ell(knee, [0.19, 0.17, 0.19], SKIN2, {rings: 6, seg: 10});
    S.tube(knee, ank, 0.16, 0.11, SKIN2, {seg: 14});
    S.tube([s * 0.36, 0.6, 0.14], [s * 0.34, 0.2, 0.02], 0.2, 0.15, ARM, {seg: 12, shine: 0.5});   /* наголенник */
    S.tube([s * 0.36, 0.62, 0.14], [s * 0.36, 0.67, 0.14], 0.215, 0.215, GOLD, {seg: 12, shine: 0.6});
    S.ell([s * 0.36, 0.7, 0.3], [0.13, 0.12, 0.08], GOLD, {rings: 5, seg: 8, shine: 0.6});          /* наколенник */
    S.ell([s * 0.34, 0.1, 0.12], [0.18, 0.1, 0.3], ARM, {rings: 6, seg: 10, shine: 0.4});
    for(const k of [-1, 0, 1]) S.cone([s * 0.34 + k * 0.08, 0.1, 0.34], [s * 0.34 + k * 0.1, 0.06, 0.56], 0.045, BONE, {seg: 5});
  }

  /* ----- таз и набедренная повязка ----- */
  S.ell([0, 1.12, 0], [0.56, 0.22, 0.36], ARM, {rings: 7, seg: 14, shine: 0.4});
  S.tube([0, 1.08, 0], [0, 1.22, 0], 0.58, 0.55, GOLD, {seg: 20, shine: 0.6});
  for(let i = 0; i < 8; i++){
    const a = i / 8 * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
    if(sn < -0.45) continue;
    S.cone([c * 0.44, 1.08, sn * 0.3], [c * 0.5 + Math.sin(t * 1.3 + i) * 0.02, 0.5, sn * 0.36], 0.1, i % 2 ? CLOTH : CLOTH2, {seg: 5});
  }
  S.box([0, 1.15, 0.38], [0.22, 0.2, 0.06], GOLD, {shine: 0.7});
  S.ell([0, 1.15, 0.42], [0.06, 0.06, 0.03], FIRE, {rings: 4, seg: 6, glow: 1});

  /* ----- торс ----- */
  S.tube([0, 1.15, 0], [0, 1.8, 0], 0.42, 0.6, SKIN, {seg: 18});
  S.ell([0, 1.92 + br, 0.02], [0.74, 0.5 + br, 0.46], SKIN, {rings: 10, seg: 18});
  S.ell([0, 1.9 + br, 0.2], [0.6, 0.42, 0.3], ARM2, {rings: 8, seg: 16, shine: 0.55});
  S.box([0, 1.9, 0.5], [0.05, 0.62, 0.04], GOLD, {shine: 0.7});
  for(const s of [-1, 1]){
    S.ell([s * 0.28, 2.0, 0.44], [0.2, 0.15, 0.08], ARM, {rings: 5, seg: 10, shine: 0.5});
    for(let k = 0; k < 3; k++) S.box([s * 0.36, 1.62 + k * 0.1 - 0.02, 0.44 - k * 0.02], [0.3, 0.025, 0.04], GOLD, {shine: 0.6, rot: [0, 0, s * 0.12]});
  }
  const pulse = 0.85 + 0.15 * Math.sin(t * 2.6);
  S.ell([0, 1.9, 0.52], [0.13 * pulse, 0.13 * pulse, 0.05], FIRE2, {rings: 5, seg: 10, glow: 1});
  S.ring([0, 1.9, 0.5], 0.2, 0.03, FIRE, {n: 14, axis: 'z', glow: 1});

  /* ----- шея и голова ----- */
  S.tube([0, 2.1, 0], [0, 2.45, 0.02], 0.2, 0.17, SKIN2, {seg: 12});
  S.ell([0, 2.66, 0.04], [0.31, 0.35, 0.33], SKIN, {rings: 10, seg: 18});
  S.ell([0, 2.5, 0.16], [0.22, 0.16, 0.22], SKIN, {rings: 6, seg: 12});                       /* челюсть */
  S.ell([0, 2.76, 0.26], [0.29, 0.07, 0.1], SKIN2, {rings: 5, seg: 12, rot: [0.25, 0, 0]});   /* надбровная дуга */
  for(const s of [-1, 1]){
    const eg = 0.8 + 0.2 * Math.sin(t * 3 + s);
    S.ell([s * 0.125, 2.7, 0.33], [0.075 * eg, 0.035, 0.03], EYE, {rings: 4, seg: 8, glow: 1});
    S.ell([s * 0.125, 2.7, 0.335], [0.03, 0.03, 0.02], '#ffffff', {rings: 3, seg: 6, glow: 1});
    S.cone([s * 0.07, 2.52, 0.3], [s * 0.08, 2.66, 0.36], 0.026, BONE, {seg: 5});            /* клыки */
    S.ell([s * 0.04, 2.6, 0.37], [0.018, 0.026, 0.014], '#1a0504', {rings: 3, seg: 5});     /* ноздри */
    S.cone([s * 0.31, 2.7, 0], [s * 0.52, 2.78, -0.1], 0.06, SKIN2, {seg: 6});               /* острые уши */
    /* рога: изогнутая цепочка трубок */
    const hp = [[s * 0.2, 2.9, 0.02], [s * 0.4, 3.05, -0.05], [s * 0.56, 3.3, -0.02], [s * 0.5, 3.6, 0.1]];
    const hr = [0.1, 0.085, 0.06, 0.0];
    for(let i = 0; i < 3; i++) S.tube(hp[i], hp[i + 1], hr[i], hr[i + 1], i === 2 ? BONE : '#3a2420', {seg: 9, shine: 0.35});
    S.ell(hp[0], [0.12, 0.1, 0.12], GOLD, {rings: 4, seg: 8, shine: 0.6});
  }
  S.box([0, 2.45, 0.34], [0.14, 0.022, 0.03], '#1a0504');                                    /* рот */
  /* огненная грива */
  for(let i = 0; i < 9; i++){
    const a = (i - 4) / 4 * 0.9, f = 0.12 * Math.sin(t * 3 + i * 1.7);
    const base = [Math.sin(a) * 0.2, 2.85, -0.2];
    S.cone(base, [Math.sin(a) * 0.55 + f, 3.35 + Math.cos(a) * 0.35 + f, -0.4 - Math.abs(a) * 0.2], 0.11, i % 2 ? FIRE : FIRE2, {seg: 6, glow: 1});
  }

  /* ----- плечи и шипы ----- */
  for(const s of [-1, 1]){
    S.ell([s * 0.82, 2.14, 0], [0.38, 0.28, 0.36], ARM, {rings: 8, seg: 14, shine: 0.55});
    S.tube([s * 0.82, 2.0, 0], [s * 0.84, 1.9, 0], 0.4, 0.38, GOLD, {seg: 14, shine: 0.65});
    for(let k = 0; k < 3; k++){
      const a = (k - 1) * 0.5;
      S.cone([s * (0.82 + Math.sin(a) * 0.14), 2.3, Math.cos(a) * 0.14 - 0.02], [s * (1.0 + k * 0.1), 2.85 - Math.abs(k - 1) * 0.15, (k - 1) * 0.2], 0.075, BONE, {seg: 6, shine: 0.3});
    }
  }

  /* ----- правая рука с глефой ----- */
  {
    const sh = [0.82, 2.0, 0], el = [1.12, 1.55, 0.18], hand = [1.02, 1.2, 0.5];
    S.tube(sh, el, 0.17, 0.14, SKIN, {seg: 12});
    S.ell(el, [0.15, 0.15, 0.15], ARM, {rings: 6, seg: 10, shine: 0.5});
    S.tube(el, hand, 0.14, 0.11, SKIN, {seg: 12});
    S.tube(lerp3(el, hand, 0.35), lerp3(el, hand, 0.9), 0.155, 0.13, ARM, {seg: 10, shine: 0.5});
    S.ell(hand, [0.13, 0.13, 0.13], SKIN2, {rings: 6, seg: 10});
    /* древко */
    const bot = [1.02, -0.05, 0.5], top = [1.02, 3.55, 0.5];
    S.tube(bot, top, 0.055, 0.055, '#2a1a14', {seg: 8, shine: 0.45});
    for(const y of [0.45, 1.65, 2.2]) S.tube([1.02, y, 0.5], [1.02, y + 0.07, 0.5], 0.075, 0.075, GOLD, {seg: 8, shine: 0.7});
    /* лезвие: два загнутых полумесяца и центральное остриё */
    S.cone([1.02, 3.5, 0.5], [1.02, 4.45, 0.5], 0.1, '#cfd6e2', {seg: 6, shine: 0.85});
    for(const s of [-1, 1]){
      let prev = [1.02, 3.55, 0.5];
      for(let i = 1; i <= 6; i++){
        const a = i / 6 * Math.PI * 0.55, p = [1.02 + s * 0.78 * Math.sin(a), 3.55 + 0.82 * (1 - Math.cos(a)) + 0.05 * i, 0.5];
        S.obox(prev, p, 0.14 * (1 - i / 7) + 0.03, 0.04, i > 4 ? '#f6f8ff' : '#dfe6f2', {shine: 0.9});
        S.obox(prev, p, 0.03, 0.05, FIRE2, {glow: 1, shine: 0.3});
        prev = p;
      }
    }
    S.ell([1.02, 3.55, 0.5], [0.09, 0.09, 0.09], FIRE, {rings: 5, seg: 8, glow: 1});
    S.ell([1.02, -0.02, 0.5], [0.07, 0.04, 0.07], GOLD, {rings: 4, seg: 8, shine: 0.6});
  }

  /* ----- левая рука с шаром пламени ----- */
  {
    const sh = [-0.82, 2.0, 0], el = [-1.1, 1.65, 0.3], hand = [-0.85, 1.55, 0.78];
    S.tube(sh, el, 0.17, 0.14, SKIN, {seg: 12});
    S.ell(el, [0.15, 0.15, 0.15], ARM, {rings: 6, seg: 10, shine: 0.5});
    S.tube(el, hand, 0.14, 0.11, SKIN, {seg: 12});
    S.tube(lerp3(el, hand, 0.35), lerp3(el, hand, 0.9), 0.155, 0.13, ARM, {seg: 10, shine: 0.5});
    S.ell(hand, [0.13, 0.13, 0.13], SKIN2, {rings: 6, seg: 10});
    const o = [-0.82, 1.82 + Math.sin(t * 2) * 0.03, 0.82];
    S.ell(o, [0.26 * pulse, 0.26 * pulse, 0.26 * pulse], FIRE, {rings: 8, seg: 12, glow: 1});
    S.ell(o, [0.15, 0.15, 0.15], '#fff1c0', {rings: 6, seg: 10, glow: 1});
    for(let i = 0; i < 6; i++){
      const a = i / 6 * Math.PI * 2 + t * 1.4, r = 0.3;
      S.cone([o[0] + Math.cos(a) * r * 0.6, o[1] + 0.05, o[2] + Math.sin(a) * r * 0.6], [o[0] + Math.cos(a) * r * 0.9, o[1] + 0.38 + 0.1 * Math.sin(t * 4 + i), o[2] + Math.sin(a) * r * 0.9], 0.07, i % 2 ? FIRE : FIRE2, {seg: 5, glow: 1});
    }
  }
};

function lerp3(a, b, k){ return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
})();
