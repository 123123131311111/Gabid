
"use strict";

const clamp = (v,a,b) => v<a?a:(v>b?b:v);
const rnd   = (a,b) => a + Math.random()*(b-a);

const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
const fogCanvas = document.createElement('canvas');
const fogCtx    = fogCanvas.getContext('2d');
/* Референсная модель Шадоу лежит рядом с этой HTML-игрой. */
const shadowModelImage = new Image();
shadowModelImage.decoding = 'async';
shadowModelImage.onerror = () => {
  /* Внешняя модель необязательна: Шадоу ниже всегда имеет процедурный fallback. */
  shadowModelImage.onerror = null;
  shadowModelImage.src = '';
};
shadowModelImage.src = './{3829EEC9-28FA-49A8-8DE2-D333BBD5B718}_1789393740984.png';
/* Джаггернаут нарисован прямо в HTML: отдельная картинка больше не нужна. */
const juggernautTexture = document.createElement('canvas');
juggernautTexture.width = 160;
juggernautTexture.height = 200;
const juggernautTextureCtx = juggernautTexture.getContext('2d');
function buildJuggernautTexture(){
  const g = juggernautTextureCtx;
  g.clearRect(0,0,160,200);
  g.save();
  g.translate(80,98);
  g.shadowColor = '#ffbd42';
  g.shadowBlur = 18;
  g.fillStyle = '#54121d';
  g.beginPath(); g.ellipse(0,26,52,76,0,0,Math.PI*2); g.fill();
  g.shadowBlur = 0;
  g.fillStyle = '#a92b35';
  g.beginPath(); g.moveTo(-48,70); g.lineTo(-35,-8); g.lineTo(-25,-49);
  g.lineTo(25,-49); g.lineTo(38,-8); g.lineTo(48,70); g.closePath(); g.fill();
  g.fillStyle = '#e0a33c';
  g.beginPath(); g.moveTo(-43,-5); g.lineTo(-24,-24); g.lineTo(-13,4);
  g.lineTo(0,-13); g.lineTo(13,4); g.lineTo(24,-24); g.lineTo(43,-5);
  g.lineTo(31,17); g.lineTo(0,7); g.lineTo(-31,17); g.closePath(); g.fill();
  g.fillStyle = '#24151b';
  g.beginPath(); g.ellipse(0,-53,31,36,0,0,Math.PI*2); g.fill();
  g.fillStyle = '#9b1f2c';
  g.beginPath(); g.moveTo(-34,-62); g.lineTo(-18,-91); g.lineTo(-4,-68);
  g.lineTo(4,-68); g.lineTo(18,-91); g.lineTo(34,-62);
  g.lineTo(27,-27); g.lineTo(0,-17); g.lineTo(-27,-27); g.closePath(); g.fill();
  g.fillStyle = '#e7b84f';
  g.fillRect(-27,-39,54,9);
  g.fillStyle = '#ffe9a0';
  g.fillRect(-18,-37,10,3); g.fillRect(8,-37,10,3);
  g.strokeStyle = '#ffdc72'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(-31,18); g.lineTo(-58,48); g.lineTo(-43,61); g.stroke();
  g.beginPath(); g.moveTo(31,18); g.lineTo(58,48); g.lineTo(43,61); g.stroke();
  g.fillStyle = '#ffcf62';
  g.beginPath(); g.arc(0,-77,7,0,Math.PI*2); g.fill();
  g.restore();
}
buildJuggernautTexture();
const sniperTexture = new Image();
sniperTexture.decoding = 'async';
sniperTexture.onerror = () => { sniperTexture.onerror = null; sniperTexture.src = ''; };
sniperTexture.src = './изображение_1790414627915.png';
const proceduralGrassCanvas = document.createElement('canvas');
proceduralGrassCanvas.width = proceduralGrassCanvas.height = 512;
const proceduralGrassCtx = proceduralGrassCanvas.getContext('2d');
function buildProceduralGrassTexture(){
  const g = proceduralGrassCtx.createLinearGradient(0,0,512,512);
  g.addColorStop(0,'#263a16');
  g.addColorStop(0.48,'#334b1d');
  g.addColorStop(1,'#1d3217');
  proceduralGrassCtx.fillStyle = g;
  proceduralGrassCtx.fillRect(0,0,512,512);

  /* Мягкие тональные пятна подложки — трава выглядит менее однородной ещё до стеблей. */
  for(let i=0;i<26;i++){
    const seed = Math.abs(Math.sin(i*91.3+7.1))%1;
    const x=(seed*512+i*53)%512, y=(Math.abs(Math.cos(i*33.7))*512)%512;
    const r=40+seed*90;
    const grad = proceduralGrassCtx.createRadialGradient(x,y,0,x,y,r);
    const lighter = seed>0.5;
    grad.addColorStop(0, lighter?'rgba(120,150,68,0.16)':'rgba(20,32,14,0.22)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    proceduralGrassCtx.fillStyle=grad;
    proceduralGrassCtx.beginPath(); proceduralGrassCtx.arc(x,y,r,0,Math.PI*2); proceduralGrassCtx.fill();
  }

  for(let x=12;x<512;x+=34){
    for(let y=12;y<512;y+=38){
      const seed = Math.abs(Math.sin(x*12.9898+y*78.233)*43758.5453)%1;
      const seed2 = Math.abs(Math.sin(x*45.1+y*19.7)*7841.3)%1;
      const px = x + (seed-0.5)*22;
      const py = y + (Math.abs(Math.sin(seed*91.7))*0.8-0.4)*22;
      const bladeColor = seed>0.6 ? '#5d8030' : (seed>0.34 ? '#456523' : (seed>0.14 ? '#6b8531' : '#3c5a1f'));

      /* Лёгкая тень у основания пучка — стебли не "висят в воздухе". */
      proceduralGrassCtx.fillStyle='rgba(10,16,8,0.16)';
      proceduralGrassCtx.beginPath(); proceduralGrassCtx.ellipse(px+2,py+6,10,4,0,0,Math.PI*2); proceduralGrassCtx.fill();

      const bladeCount = 4 + Math.floor(seed2*3);
      for(let blade=0;blade<bladeCount;blade++){
        const a = -1.15 + blade*(1.9/bladeCount) + seed*0.18;
        const len = 9 + ((seed*31 + blade*7)%14) + seed2*6;
        proceduralGrassCtx.strokeStyle = blade%2===0 ? bladeColor : (seed2>0.5?'#7a9a3e':bladeColor);
        proceduralGrassCtx.lineWidth = 1.4 + seed2*1.3;
        proceduralGrassCtx.beginPath();
        proceduralGrassCtx.moveTo(px+blade*2-4,py+5);
        proceduralGrassCtx.quadraticCurveTo(px+Math.cos(a)*len*0.4,py-len*0.35,px+Math.cos(a)*len,py-Math.sin(-a)*len);
        proceduralGrassCtx.stroke();
      }
      if(seed>0.83){
        const flowerColors=['#b98d55','#d4a9b0','#c4b65d','#e8e3c8'];
        proceduralGrassCtx.fillStyle=flowerColors[Math.floor(seed*100)%flowerColors.length];
        proceduralGrassCtx.beginPath(); proceduralGrassCtx.arc(px+8,py-4,3.5,0,Math.PI*2); proceduralGrassCtx.fill();
        proceduralGrassCtx.fillStyle='#6b4a2a';
        proceduralGrassCtx.beginPath(); proceduralGrassCtx.arc(px+8,py-4,1.2,0,Math.PI*2); proceduralGrassCtx.fill();
      } else if(seed>0.7 && seed2>0.5){
        /* Мелкий клевер вместо цветка для разнообразия. */
        proceduralGrassCtx.fillStyle='rgba(70,110,45,0.85)';
        for(const [ox,oy] of [[-3,0],[3,0],[0,-4]]){
          proceduralGrassCtx.beginPath(); proceduralGrassCtx.arc(px+ox,py-6+oy,2.4,0,Math.PI*2); proceduralGrassCtx.fill();
        }
      } else if(seed<0.06){
        /* Изредка мелкий камешек или веточка на земле. */
        proceduralGrassCtx.fillStyle='rgba(70,58,40,0.6)';
        proceduralGrassCtx.beginPath(); proceduralGrassCtx.ellipse(px,py+3,3.2,1.8,seed2*Math.PI,0,Math.PI*2); proceduralGrassCtx.fill();
      }
    }
  }
}
buildProceduralGrassTexture();
const grassTextureImage = new Image();
let grassTexturePattern = ctx.createPattern(proceduralGrassCanvas, 'repeat');
grassTextureImage.onload = () => {
  grassTexturePattern = ctx.createPattern(grassTextureImage, 'repeat');
};
grassTextureImage.src = './{69D0296D-9629-414F-AEB4-B15FF6B07E3D}_1789396600545.png';

const proceduralPathCanvas = document.createElement('canvas');
proceduralPathCanvas.width = proceduralPathCanvas.height = 256;
const proceduralPathCtx = proceduralPathCanvas.getContext('2d');
function buildProceduralPathTexture(){
  /* Красивая мощёная дорога: крупные каменные плиты со швами вместо просто грунта. */
  const p = proceduralPathCtx;
  const base = p.createLinearGradient(0,0,256,256);
  base.addColorStop(0,'#9a875f'); base.addColorStop(0.5,'#8a774f'); base.addColorStop(1,'#786643');
  p.fillStyle = base; p.fillRect(0,0,256,256);

  /* Тёмные швы между плитами рисуются первыми — они станут "затиркой". */
  p.fillStyle = '#453a26';
  p.fillRect(0,0,256,256);

  const seedAt = (i,j) => Math.abs(Math.sin(i*127.1+j*311.7)*43758.5453)%1;
  const TILE = 64, GAP = 5;
  const stoneShades = ['#b9a06d','#ad9560','#a68c56','#c2aa76','#9c8552'];
  for(let row=-1;row<=4;row++){
    /* Кладка вразбежку: каждая вторая строка смещена на половину плитки. */
    const offset = (row%2===0) ? 0 : TILE/2;
    for(let col=-1;col<=4;col++){
      const cx = col*TILE + offset;
      const cy = row*TILE;
      const s1 = seedAt(row,col);
      const s2 = seedAt(row+9,col+3);
      const w = TILE - GAP - s1*6;
      const h = TILE - GAP - s2*6;
      const x = cx + GAP/2 + s1*3;
      const y = cy + GAP/2 + s2*3;
      const shade = stoneShades[Math.floor(s1*97)%stoneShades.length];

      p.save();
      p.beginPath();
      const r = 6;
      p.moveTo(x+r,y);
      p.lineTo(x+w-r,y); p.quadraticCurveTo(x+w,y,x+w,y+r);
      p.lineTo(x+w,y+h-r); p.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      p.lineTo(x+r,y+h); p.quadraticCurveTo(x,y+h,x,y+h-r);
      p.lineTo(x,y+r); p.quadraticCurveTo(x,y,x+r,y);
      p.closePath();
      p.clip();

      p.fillStyle = shade;
      p.fillRect(x,y,w,h);

      /* Объёмная фаска: светлый блик сверху-слева, тень снизу-справа. */
      const bevel = p.createLinearGradient(x,y,x+w,y+h);
      bevel.addColorStop(0,'rgba(255,244,214,0.30)');
      bevel.addColorStop(0.18,'rgba(255,244,214,0.06)');
      bevel.addColorStop(0.82,'rgba(30,22,10,0.05)');
      bevel.addColorStop(1,'rgba(30,22,10,0.32)');
      p.fillStyle = bevel;
      p.fillRect(x,y,w,h);

      /* Мелкие крапинки и потёртости прямо на плите. */
      for(let k=0;k<5;k++){
        const ks = seedAt(row*7+k, col*5+k*3);
        const px = x + ks*w, py = y + Math.abs(Math.sin(ks*40))*h;
        p.fillStyle = ks>0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.14)';
        p.beginPath(); p.arc(px,py,1+ks*2,0,Math.PI*2); p.fill();
      }
      /* Тонкая трещинка через часть плит для живости камня. */
      if(s2>0.72){
        p.strokeStyle='rgba(35,26,14,0.28)'; p.lineWidth=1;
        p.beginPath();
        p.moveTo(x+w*0.2,y+h*0.15);
        p.lineTo(x+w*0.5,y+h*0.5);
        p.lineTo(x+w*0.35,y+h*0.85);
        p.stroke();
      }
      p.restore();
    }
  }

  /* Лёгкая общая виньетка, чтобы плитка не выглядела плоской при повторении. */
  p.fillStyle = 'rgba(255,255,255,0.04)';
  p.fillRect(0,0,256,4);
  p.fillStyle = 'rgba(0,0,0,0.05)';
  p.fillRect(0,252,256,4);
}
buildProceduralPathTexture();
const pathTexturePattern = ctx.createPattern(proceduralPathCanvas, 'repeat');

/* Две независимые процедурные текстуры воды: наложенные друг на друга и текущие
   с разной скоростью/направлением, они не дают реке выглядеть как один и тот же
   повторяющийся кусок — течение получается живым и не по одному шаблону. */
function buildWaterCausticTexture(seedOffset, warmth){
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const w = c.getContext('2d');
  w.clearRect(0,0,256,256);
  for(let i=0;i<46;i++){
    const seed = Math.abs(Math.sin((i+seedOffset)*17.23+3.1))%1;
    const x = (seed*256 + i*29) % 256;
    const y = (Math.abs(Math.cos((i+seedOffset)*11.7)) * 256) % 256;
    const r = 10 + seed*26;
    const grad = w.createRadialGradient(x,y,0,x,y,r);
    grad.addColorStop(0, warmth ? 'rgba(226,252,255,0.55)' : 'rgba(160,232,255,0.5)');
    grad.addColorStop(0.55, warmth ? 'rgba(226,252,255,0.16)' : 'rgba(160,232,255,0.14)');
    grad.addColorStop(1, 'rgba(226,252,255,0)');
    w.fillStyle = grad;
    w.beginPath();
    w.ellipse(x, y, r, r*0.42, seed*Math.PI, 0, Math.PI*2);
    w.fill();
  }
  /* Тонкие изогнутые нити ряби поверх бликов. */
  w.strokeStyle = warmth ? 'rgba(255,255,255,0.20)' : 'rgba(200,246,255,0.22)';
  w.lineWidth = 1.6;
  for(let i=0;i<14;i++){
    const seed = Math.abs(Math.sin((i+seedOffset)*54.7))%1;
    let x = (seed*256)%256, y = (i*37+seedOffset*13)%256;
    w.beginPath(); w.moveTo(x,y);
    for(let s=0;s<5;s++){
      x += 18 + seed*10;
      y += Math.sin(s+seed*6)*10;
      w.lineTo(x,y);
    }
    w.stroke();
  }
  return c;
}
const waterCausticCanvasA = buildWaterCausticTexture(0, true);
const waterCausticCanvasB = buildWaterCausticTexture(11, false);
const waterPatternA = ctx.createPattern(waterCausticCanvasA, 'repeat');
const waterPatternB = ctx.createPattern(waterCausticCanvasB, 'repeat');
let VW = 0, VH = 0;

const WORLD  = 5000;
const GRID   = 52;
const CELL   = WORLD / GRID;
const TEAM_COL = ['#4caf50', '#e53935', '#b58a55'];
const TEAM_NAME = ['Свет', 'Тьма'];
const LANE_NAMES = ['МИД', 'ВЕРХ', 'НИЗ'];
const MID_PUSH_TIME = 300;

const BASES = [ {x:480, y:3120}, {x:3120, y:480} ];
const BASE_HEAL_RADIUS = 420;
const BASE_HEAL_RATE   = 0.25;
const WAVE_INTERVAL = 30;

const LANES = [
  [{x:700,y:2900},{x:1800,y:1800},{x:2900,y:700}],
  [{x:520,y:2880},{x:400,y:900},{x:900,y:400},{x:2900,y:500}],
  [{x:720,y:3120},{x:3100,y:3120},{x:3220,y:2900},{x:3220,y:900},{x:2960,y:600}]
];

const TOWER_SPOTS = [
  /* lane 0 — мид, lane 1 — верх, lane 2 — низ.
     tier 1 — внешняя башня, tier 2 — внутренняя, ближе к трону. */
  {team:0,lane:0,tier:1,x:1550,y:2050},{team:0,lane:0,tier:2,x:1040,y:2560},
  {team:0,lane:1,tier:1,x:445,y:1600},{team:0,lane:1,tier:2,x:480,y:2350},
  {team:0,lane:2,tier:1,x:1600,y:3120},{team:0,lane:2,tier:2,x:1000,y:3120},
  {team:1,lane:0,tier:1,x:2000,y:1600},{team:1,lane:0,tier:2,x:2560,y:1040},
  {team:1,lane:1,tier:1,x:2600,y:485},{team:1,lane:1,tier:2,x:2940,y:498},
  {team:1,lane:2,tier:1,x:3110,y:3100},{team:1,lane:2,tier:2,x:3220,y:800}
];

let units = [], heroes = [], projectiles = [], aoes = [], walls = [], trees = [], fxs = [], particles = [], texts = [], runes = [], grassBends = [];
let mo3giMines = [];
let controlledUnit = null;
let cam = {x:WORLD/2, y:WORLD/2};
let playerHero = null, enemyHero = null;
let gameTime = 0, waveTimer = 8, waveCount = 0;
let visionTimer = 0;
let gameState = 'menu';
let menuStage = 'home';
let menuHeroPage = 0;
let selectedHeroIndex = 0;
let draftTime = 20;
let draftPlayerIndex = -1;
let draftBotIndices = [];
let draftCountdownSpoken = false;
let draftMusicTimer = null;
let rebindSlot = -1;
let inventoryBinds = ['z','x','c','v','b','n'];
/* Физическая клавиша на клавиатуре не зависит от раскладки (RU/EN),
   а e.key — зависит. Из-за этого на русской раскладке физическая Z
   присылала 'я', и inventoryBinds.indexOf('я') не находил предмет.
   Эта таблица переводит физический код клавиши в канонический
   латинский символ, чтобы предметы срабатывали при любой раскладке. */
const PHYSICAL_KEY_LETTER = {
  KeyQ:'q',KeyW:'w',KeyE:'e',KeyR:'r',KeyT:'t',KeyY:'y',KeyU:'u',KeyI:'i',KeyO:'o',KeyP:'p',
  KeyA:'a',KeyS:'s',KeyD:'d',KeyF:'f',KeyG:'g',KeyH:'h',KeyJ:'j',KeyK:'k',KeyL:'l',
  KeyZ:'z',KeyX:'x',KeyC:'c',KeyV:'v',KeyB:'b',KeyN:'n',KeyM:'m'
};
let testMode = false;
let testDummies = [];
let testDummySpawnAngle = 0;
let testHeroPickerOpen = false;
let storeOpen = false;
let storePhraseOwned = false;
let storeChipOwned = false;
let storeAudioOwned = false;
let storeFeedimidiOwned = false;
let storeNineteenOwned = false;
let storeAbuuuOwned = false;
let storePhraseIndex = 0;
let phraseWheelOpen = false;
let phraseWheelSelection = -1;
let storeAudio = null;
const EMBEDDED_STORE_AUDIO = '';
const STORE_AUDIO_FALLBACK = 'C:/Users/elski/Downloads/korolia-ne-ubit.mp3';
let portraitRenderMode = false;
let winner = null;
let visGrid    = new Uint8Array(GRID*GRID);
let explored   = new Uint8Array(GRID*GRID);
let mouse = {x:0, y:0, wx:0, wy:0};
let edgePan = {x:0, y:0};
let cameraKeys = {x:0, y:0};
let cameraDrag = {active:false, lastX:0, lastY:0};
let cameraManual = false;
let draggedInventoryIndex = -1;
let lastPressedKey = '';
let shopOpen = false;
let shopGuideOpen = false;
let selectedShopItem = null;
let pendingPurchaseId = null;
let shopScrollRow = 0;
let inspectUnit = null;
let pendingSellIndex = -1;
let changelogOpen = false;
let changelogScroll = 0;
let settingsOpen = false;
let scoreboardOpen = false;
let changelogPage = 0;
const CHANGELOG_PAGE_SIZE = 4;
const GAME_VERSION = '0.5.0';
const CHANGELOG = [
  'Обновление 0.5.0: последовательное разрушение построек по линиям — сначала внешняя башня, затем внутренняя башня, казармы и только после этого трон',
  'Обновление 0.4.2: ультимейт Рассветной девы переработан — метка у союзника создаёт пульсирующий световой круг (лечит союзников, жжёт врагов), затем героиня влетает в центр с мощным уроном и станом по площади',
  'Обновление 0.4.2: урон способностей и ультимейтов теперь растёт вместе с уровнем героя, как и урон от обычной атаки, у всех бойцов',
  'Обновление 0.4.1b: добавлена Ригина, новый герой с Dispose, Rebound и Unleash; обновлены портрет, боевые эффекты и баланс',
  'Обновление 0.4.1b: Трибупейнер усилен на 5%, дробовик выпускает три раздельные пули с характерным звуком дроби',
  'Обновление 0.4.1b: оружие Трибупейнера уменьшено в два раза, клинки Охотника на магов следуют направлению взгляда игрока',
  'Обновление 0.4.1b: магазин получил новые объемные иконки предметов, подсветку редкости и улучшенную читаемость слотов',
  'Обновление 0.4.1b: переработаны визуальные следы выстрелов, вспышки дробовика и эффекты ярости Ригины',
  'Обновление 0.4.1b: добавлены описания новых механик, дальность броска и визуальные подсказки для навыков Ригины',
  'Обновление 0.4.1b: Dispose переносит выбранную цель через героя к точке приземления и поражает область вокруг неё',
  'Обновление 0.4.1b: Rebound оглушает врагов при приземлении и ускоряет союзника на 4 секунды',
  'Обновление 0.4.1b: Unleash замедляет скорость атаки и передвижения врагов, а каждый третий удар создаёт пульсацию ярости',
  'Обновление 0.4.1b: Unleash даёт 5–7 зарядов ярости, ускоряет серию ударов и завершает её волной замедления',
  'Обновление 0.4.1b: оружие Охотника на магов всегда смотрит вслед за курсором даже без выбранной цели',
  'Обновление 0.4.1b: дробь Трибупейнера получила раздельные траектории, вспышку и характерный шумовой звук выстрела',
  'Обновление 0.4.1b: визуальный размер дробовика уменьшен без изменения дальности, урона и читаемости атаки',
  'Обновление 0.4.1b: иконки магазина получили градиентные материалы, блик, редкость, объёмную рамку и силуэт предмета',
  'Обновление 0.4.1b: портрет Ригины дополнен рыжим хвостом, сине-белой формой, зелёным плащом и походным снаряжением',
  'Обновление 0.4.1b: журнал обновлений расширен подробными заметками по герою, оружию и магазину',
  'Обновление 0.4.1a: новый боец Трибупейнер с дробовиком, поджигающими пулями, щитом, невидимостью и взрывной ультой; добавлен Aghanim Scepter за 2000 монет',
  'Обновление 0.4.0c: выбор сокращён до 20 секунд, цены магазина увеличены на 12%, добавлены магазин фраз, переназначение предметов, музыка выбора и голосовое предупреждение',
  'Обновление 0.4.0b: встроенный синтезатор звуков Web Audio API для атак, магии, оглушений, ультимейтов, покупок, золота и смерти; панель навыков героя в выборе',
  'Обновление 0.4.0a: выбор бойцов 3 на 3 за 35 секунд, портреты выбранных ботов, полный ростер без банов и прокручиваемый changelog',
  'Обновление 0.3.6: новый тёмно-синий магазин, иконка героя в HUD, звуки автоатак, +350 здоровья всем героям, ребаланс цен, фонтан базы и shard-навыки новых бойцов',
  'Обновление 0.3.5: казармы можно разрушать после двух башен линии, увеличена мини-карта и добавлены сборки создателя для новых бойцов',
  'Обновление 0.3.4: улучшены подсказки магазина, боевые эффекты и баланс поздней игры',
  'Обновление 0.3.3: ускорен и усилен Охотник, повышен обычный урон carry-героев, исправлен третий навык Рыцаря-изгнанника',
  'Обновление 0.3.2: скорость атаки Охотника, урон carry-героев и ответы ботов на сообщения в чате',
  'Обновление 0.3.1: скорость атаки Охотника, урон двух carry-героев и ответы ботов в чате',
  'Обновление 0.3.0: бафф Охотника на магов, Рыцаря-изгнанника и Рассветной девы',
  'Обновление 0.2.9: 100 новых реплик героев, насмешки за фейлы и подозрения в читерстве за сильную игру',
  'Обновление 0.2.8: ручное управление боевым дроном Мо3ги, контактный взрыв и детализированный военный силуэт',
  'Обновление 0.2.7: быстрый запуск Реквиема, медленные душевые снаряды, ближние койлы и урон по лесным нейтралам',
  'Обновление 0.2.6: настоящие Shadowraze-взрывы, радиальный Реквием, 2 души за крипа и красно-оранжевая палитра',
  'Обновление 0.2.5: авто-удары Шадоу, модель по референсу, усиленный Реквием и экранный RAMPAGE с голосом',
  'Обновление 0.2.4: подтверждение покупок, Dota-магазин, экранные серии убийств, звук убийства и усиленные эффекты боёвки',
  'Обновление 0.2.3: Электрический Гоша, чат, уровни над героями, звук покупок и обновлённые панели',
  'Обновление 0.2.2: усилен Шадоу, новый лес, улучшенный магазин и Аганим для Шадоу',
  'Обновление 0.2.1: новый боец Шадоу, фарм душ и ульт Реквием',
  'Обновление 0.2.0: атакующие клоны Иллюзиониста, Дагонская империя, Подушка тимура и более редкие леса',
  'Отдельный КД заклинаний',
  'Магазин и 6 слотов предметов',
  'Монеты за бой и пассивный доход',
  'Танго, Клыки Васьки и покупка предметов ботами',
  'Две команды по два героя и казармы трёх линий',
  'Деревья на карте и усиленный трон',
  'Снижен урон Гриши',
  'Новые предметы БКБ и ПТ, усложнена прокачка',
  'Нейтральные лагеря, Блинк и мега-крипы',
  'Голли, респавн нейтралов и Мантированная сталь',
  'Усиленный Голли и новый герой Сасыч',
  'Режим 3 на 3, Аганим шард и новые улучшения базы',
  'Голли: E — Ледяное сердце, R — Ледяные големы, F — Красный кристалл',
  'Аганим шард превращён в отдельный навык на панели',
  'Ядовитое поле Ильи запрещает врагам использовать способности',
  'Добавлен предмет Враги-302 школы с сокращением КД на 30%',
  'Ослаблены Сасыч и Супер сапог, БКБ стоит 2400 монет',
  'Тёмная территория врагов и обновлённое меню 3 на 3',
  'Обновление 0.1.5: Малит, Мунуция, Оторванная рука мо3гов, увеличенная карта и леса',
  'Обновление 0.1.6: баланс Малита, исправлены Голли и Аганим шард, новый Топорик и двойное здоровье построек',
  'КД способностей продолжается во время возрождения, опыт стал требовательнее, нейтралы дают 70 монет',
  'Обновление 0.1.7: помощь за урон, таланты, усилен Вождь, исправлена сборка ПТ',
  'Обновление 0.1.8.4: постоянное горение Молотова, Гур и исправления запуска',
  'Обновление 0.1.9: Иллюзионист, плотные леса и руны усилений'
];
const SHOP_ITEMS = {
  mango: {name:'Манго', icon:'◆', cost:70, desc:'Активный: восстанавливает 100 маны. Не расходуется — можно использовать повторно.', color:'#72e6a5', active:true},
  joelBoots: {name:'Сапог Джоэла', icon:'▲', cost:500, desc:'Пассивно: +45 к скорости передвижения.', color:'#e7c77a', speed:45, active:false},
  tango: {name:'Танго', icon:'♣', cost:90, desc:'Активный расходуемый предмет: съедает ближайшее дерево и восстанавливает 90 HP.', color:'#79d46c', active:true},
  fangs: {name:'Клыки Васьки', icon:'✦', cost:500, desc:'Пассивно: +105 к обычным атакам и к урону способностей.', color:'#ff8d8d', active:false},
  bkb: {name:'БКБ', icon:'✚', cost:2150, desc:'Активный: на 10 сек. снижает урон обычных атак на 60% и снимает оглушение. КД 50 сек.', color:'#f0c36a', active:true},
  pt: {name:'ПТ', icon:'◆', cost:200, totalCost:1200, desc:'Сборка: Сапог Джоэла + Клыки Васьки + 200 монет. Пассивно: +150 урона, +60 скорости передвижения и ускорение атак.', color:'#ff9e5d', active:false},
  blink: {name:'Блинк', icon:'◇', cost:1150, desc:'Активный: телепортирует героя к курсору на расстояние до 500 единиц, сбрасывая движение и атаку. КД 20 сек.', color:'#8fd8ff', active:true},
  evsyutin: {name:'Еблет Евсютина', icon:'♥', cost:1250, desc:'Пассивно: +500 к максимальному и текущему здоровью.', color:'#ff7898', hp:500, active:false},
  mantledSteel: {name:'Мантированная сталь', icon:'▣', cost:2100, desc:'Активный: создаёт 3 точные копии героя на 7 секунд. КД 14 сек.', color:'#b8c7d9', active:true},
  manaTome: {name:'Научилсяловить', icon:'✧', cost:550, desc:'Пассивно: увеличивает восстановление маны на 10%.', color:'#7ed6ff', manaRegen:0.10, active:false},
  manaHooves: {name:'Капыта-Дерезладия', icon:'♢', cost:1400, desc:'Пассивно: +800 к максимальной и текущей мане.', color:'#c59cff', maxMp:800, active:false},
  superBoots: {name:'Супер сапог', icon:'⬆', cost:2950, desc:'Пассивно: +70 к скорости передвижения. Активный: ещё +110 скорости на 6 сек. КД 24 сек.', color:'#ffd34f', speed:70, activeSpeed:110, activeDuration:6, cooldown:24, active:true},
  aghanimHead: {name:'Бошка Агнии', icon:'✹', cost:3000, desc:'Активный: на 10 сек. даёт +180 урона, +100 скорости передвижения и ускоряет атаки. КД 30 сек.', color:'#ff74d4', activeDuration:10, cooldown:30, active:true},
  ilyaHair: {name:'Волосы Ильи', icon:'☄', cost:2000, desc:'Пассивно: +10 скорости, +60 урона и -20% урона от обычных атак. Активный: оглушает выбранного врага на 4 сек. КД 25 сек.', color:'#e9f5ff', cooldown:25, active:true, speed:10, damage:60, attackResist:0.2, stunDuration:4},
  aghanimShard: {name:'Аганим шард', icon:'⬢', cost:1400, desc:'При покупке добавляет герою персональную способность G. Эффект зависит от выбранного героя и предмет не занимает слот инвентаря.', color:'#8be9fd', active:false, cooldown:35},
  enemy302: {name:'Враги-302 школы', icon:'⌛', cost:1350, desc:'Пассивно: сокращает перезарядку всех обычных способностей героя на 30%. На предметы не влияет.', color:'#f3b4ff', cooldownReduction:0.30, active:false},
  tornBrainHand: {name:'Оторванная рука мо3гов', icon:'☠', cost:1800, desc:'Активный: телепортирует героя к выбранному врагу и наносит ему 350 физического урона. КД 24 сек.', color:'#d7a879', cooldown:24, active:true},
  munition: {name:'Мунуция', icon:'⚙', cost:2000, desc:'Активный: на 3 сек. резко ускоряет атаки героя. КД 18 сек.', color:'#f5d36b', activeDuration:3, cooldown:18, attackSpeed:6, active:true},
  hatchet: {name:'Топорик', icon:'🪓', cost:125, desc:'Пассивно: +35 урона. Активный: срубает ближайшее дерево в радиусе 150. КД 10 сек.', color:'#c68b5b', cooldown:10, damage:35, active:true}
  ,satanic: {name:'Сатаник', icon:'♦', cost:2900, desc:'Пассивно: +660 к максимальному и текущему здоровью. Обычные атаки возвращают 25% нанесённого урона.', color:'#d83b55', hp:660, lifesteal:0.25, active:false}
  ,arcadiaScar: {name:'Шрам-Аркадия', icon:'✦', cost:1450, desc:'Активный: на 7 сек. даёт +250 урона и ускоряет атаки в 3 раза относительно базовой скорости. КД 24 сек.', color:'#ff7043', activeDuration:7, damage:250, attackSpeed:2, cooldown:24, active:true}
  ,kinglandia: {name:'Кингляндия', icon:'♛', cost:4450, desc:'Пассивно: +650 к урону обычных атак.', color:'#f4d35e', damage:650, active:false}
  ,gur: {name:'Гур', icon:'⬆', cost:1600, desc:'Активный: подбрасывает выбранного врага на 0,8 сек. и даёт герою на 12 сек. +150 урона, +100 скорости передвижения и ускорение атак. КД 28 сек.', color:'#d9f2ff', activeDuration:12, damage:150, attackSpeed:0.8, moveSpeed:100, cooldown:28, active:true}
  ,dagonEmpire: {name:'Дагонская империя', icon:'⚡', cost:1250, desc:'Активный: наносит выбранному вражескому бойцу 500 магического урона. КД 45 сек.', color:'#ff4f8b', cooldown:45, active:true}
  ,timurPillow: {name:'Подушка тимура', icon:'☁', cost:350, desc:'Активный расходуемый предмет: лечит 600 HP за 10 секунд. Любой урон врага сразу прерывает лечение.', color:'#9ed8ff', active:true}
  ,brainEye: {name:'Оторванный Глаз Мозгов', icon:'◉', cost:1900, desc:'Пассивно: +210 к дальности атаки героя.', color:'#ff8fd8', attackRange:210, active:false}
  ,aghanimScepter: {name:'Аганим Скептер', icon:'✹', cost:2000, desc:'Пассивно: улучшает уникальную механику героя — дополнительные снаряды, заряды, радиус или урон зависят от героя.', color:'#b992ff', active:false}
};
const SHOP_ITEM_IDS = [
  'mango','joelBoots','tango','fangs','bkb','pt','blink','evsyutin',
  'mantledSteel','manaTome','manaHooves','superBoots','aghanimHead',
  'ilyaHair','aghanimShard','enemy302','tornBrainHand','munition',
  'hatchet','satanic','arcadiaScar','kinglandia','gur','dagonEmpire',
  'timurPillow','brainEye','aghanimScepter'
];
for(const item of Object.values(SHOP_ITEMS)){
  if(typeof item.cost === 'number') item.cost = Math.ceil(item.cost * 1.12);
  if(typeof item.totalCost === 'number') item.totalCost = Math.ceil(item.totalCost * 1.12);
}
SHOP_ITEMS.aghanimScepter.cost = 2000;

const CREATOR_BUILDS = {
  shadow: {
    title:'Шадоу  /  Повелитель душ',
    categories:[
      {name:'СТАРТОВЫЙ ЗАКУП', items:[['mango','Мана для койлов. Шадоу хочет давить с первых волн, а не ждать идеальный момент.'],['tango','Дерево превращается в здоровье: держи дистанцию и фарми под постоянным восстановлением.']]},
      {name:'РАННЯЯ ИГРА', items:[['joelBoots','Скорость помогает держать дальнюю дистанцию и собирать души безопаснее.'],['fangs','Клыки усиливают и автоатаки, и койлы. Собери ПТ: Сапог Джоэла + Клыки Васьки + 200 монет.']]},
      {name:'CORE', items:[['pt','ПТ дает урон, скорость и темп атак. Это главный мост от фарма к Реквиему.'],['ilyaHair','Урон, скорость и стан на 4 секунды: враг не переживает твой залп душ.'],['enemy302','-30% к перезарядке превращает койлы в конвейер давления.']]},
      {name:'ПО СИТУАЦИИ / ЛЕЙТ', items:[['arcadiaScar','Когда нужен взрывной прокаст и добивание героя.'],['kinglandia','+650 урона превращает накопленные души в приговор.'],['aghanimShard','Отдельный навык усиливает план героя, не занимая слот инвентаря.']]}
    ]
  },
  ilya: {
    title:'Илья  /  Владыка ядовитой ауры',
    categories:[
      {name:'СТАРТОВЫЙ ЗАКУП', items:[['tango','Лечение через дерево держит толстяка на линии, пока аура выжигает врагов.'],['mango','Мана нужна для крюка и брюха: не превращай Илью в просто большой мишень.']]},
      {name:'РАННЯЯ ИГРА', items:[['joelBoots','Подтянись к цели и не отпускай. Скорость делает крюк надежнее.'],['fangs','Клыки усиливают каждый спелл и удар, затем собирай ПТ из двух компонентов и 200 монет.']]},
      {name:'CORE', items:[['pt','ПТ дает Илье урон и мобильность для ауры в центре драки.'],['satanic','+660 здоровья и вампиризм позволяют пережить фокус, пока враги стоят в яде.'],['ilyaHair','Пассивная стойкость к атакам и стан превращают вход в драку в ультиматум.']]},
      {name:'ПО СИТУАЦИИ / ЛЕЙТ', items:[['tornBrainHand','Притяни ключевую цель, нанеси 350 и начни пир толстяка с выгодной позиции.'],['gur','Подбрось врага и получи окно для ауры и ульта.'],['aghanimShard','Ядовитое поле запрещает способности внутри. Ставь его там, где враг хочет драться.']]}
    ]
  },
  golly: {
    title:'Голли  /  Повелитель льда',
    categories:[
      {name:'СТАРТОВЫЙ ЗАКУП', items:[['mango','Дополнительная мана для кристаллов и заморозки на первых уровнях.'],['tango','Дешевое лечение, пока Голли собирает пространство под ледяную атаку.']]},
      {name:'РАННЯЯ ИГРА', items:[['joelBoots','Скорость помогает держать врага в радиусе ледяной орды.'],['fangs','Урон спеллов растет сразу; затем собери ПТ из Сапога Джоэла, Клыков и 200 монет.']]},
      {name:'CORE', items:[['pt','Темп, урон и скорость: Голли быстрее добегает до позиции для големов.'],['superBoots','Активация дает нужный разгон для входа, выхода и повторного контроля.'],['aghanimShard','Ледяная броня усиливает выживаемость в центре драки.']]},
      {name:'ПО СИТУАЦИИ / ЛЕЙТ', items:[['mantledSteel','Три копии добавляют тел и целей, пока твои кристаллы контролируют поле.'],['bkb','Защищает каст големов от вражеского контроля.'],['aghanimShard','Отдельный навык усиливает Голли, не ломая шесть слотов инвентаря.']]}
    ]
  },
  arcady: {
    title:'Аркадий  /  Огненный стрелок',
    categories:[
      {name:'СТАРТОВЫЙ ЗАКУП', items:[['mango','Мана на огненные шары и Молотов. Дави линию, пока враг еще без защиты.'],['tango','Восстановление для дальнего героя, которому нельзя терять темп фарма.']]},
      {name:'РАННЯЯ ИГРА', items:[['joelBoots','Дальность не спасает от плохой позиции: скорость делает стрелка мобильным.'],['fangs','Усиливает шары и автоатаки; собери ПТ из Сапога Джоэла + Клыков + 200.']]},
      {name:'CORE', items:[['pt','Больше урона, скорости и скорострельности для постоянного огня.'],['munition','На 2 секунды превращает залп в пулемет. Используй перед взрывом.'],['arcadiaScar','+250 урона и скорострельность дают жесткое окно для Молотова и динамита.']]},
      {name:'ПО СИТУАЦИИ / ЛЕЙТ', items:[['dagonEmpire','500 магического урона закрывают бой с убегающим героем.'],['kinglandia','Максимальный физический урон, когда враг уже не может пережить дистанционный фокус.'],['aghanimShard','Отдельный навык добавляет еще один огненный аргумент без потери предмета.']]}
    ]
  },
  warlord: {
    title:'Вождь  /  Мастер клинка',
    categories:[
      {name:'СТАРТОВЫЙ ЗАКУП', items:[['tango','Тебе нужно дойти до врага живым: дерево и лечение делают размен выгодным.'],['mango','Дополнительная мана на Рассекание и Клич.']]},
      {name:'РАННЯЯ ИГРА', items:[['joelBoots','Скорость нужна, чтобы начать Рывок с правильной дистанции.'],['fangs','Урон усиливает клинок и автоатаки; собери ПТ из компонентов и 200 монет.']]},
      {name:'CORE', items:[['pt','ПТ закрывает главные потребности Вождя: удар, скорость и темп.'],['bkb','Безопасно прожимай Шторм клинков прямо в центре драки.'],['satanic','Вампиризм и здоровье позволяют пережить ответный фокус.']]},
      {name:'ПО СИТУАЦИИ / ЛЕЙТ', items:[['gur','Подбрось ключевую цель и начни комбо с Рывка.'],['blink','Моментально входи в драку, когда обычной скорости недостаточно.'],['aghanimShard','Отдельный бросок клинка добавляет контроль и добивание.']]}
    ]
  },
  grisha: {
    title:'Гриша  /  Маг трех стихий',
    categories:[
      {name:'СТАРТОВЫЙ ЗАКУП', items:[['mango','Запас маны для ранних орбов и Призыва. Гриша побеждает частотой кастов.'],['tango','Безопасный фарм до первых уровней стихий.']]},
      {name:'РАННЯЯ ИГРА', items:[['joelBoots','Скорость помогает держать дистанцию для Луча и ловить позицию под комбо.'],['fangs','Клыки компенсируют скромный базовый урон; затем собирай ПТ из двух частей и 200.']]},
      {name:'CORE', items:[['manaTome','+10% к восстановлению маны поддерживает бесконечный цикл орбов и Призыва.'],['enemy302','-30% КД особенно опасны на сильных комбинациях Инвокера.'],['pt','ПТ дает темп, чтобы кастовать и одновременно уходить из опасной зоны.']]},
      {name:'ПО СИТУАЦИИ / ЛЕЙТ', items:[['manaHooves','+800 маны расширяют ресурс для Ball Lightning-подобного темпа прокаста.'],['blink','Телепортируйся на идеальную точку для Метеора или Луча.'],['aghanimShard','Усиление стихий дает отдельный навык и мощное следующее заклинание.']]}
    ]
  },
  mageHunter: {
    title:'Охотник на магов  /  Ближний carry',
    categories:[
      {name:'СТАРТОВЫЙ ЗАКУП', items:[['joelBoots','Скорость помогает добраться до мага и не отпустить его после Мерцания.'],['fangs','Усиливает быстрые удары и превращает выжигание маны в угрозу.']]},
      {name:'CORE', items:[['pt','Темп атак и скорость для постоянного давления.'],['bkb','Защищает вход в драку от ответной магии.'],['brainEye','Дальность помогает начинать бой на своих условиях.']]},
      {name:'ПО СИТУАЦИИ / ЛЕЙТ', items:[['ilyaHair','Стан и сопротивление атакам помогают пережить ответный фокус.'],['aghanimShard','Антимагический клинок полностью обнуляет ману цели следующей атакой.'],['kinglandia','Максимальный физический урон для добивания героев без маны.']]}
    ]
  },
  dawnMaiden: {
    title:'Рассветная дева  /  Танк-инициатор',
    categories:[
      {name:'СТАРТОВЫЙ ЗАКУП', items:[['tango','Лечение позволяет выдерживать размены на передней линии.'],['mango','Мана нужна для молота и прыжка к союзнику.']]},
      {name:'CORE', items:[['pt','Скорость и урон помогают начинать драку первой.'],['satanic','Здоровье и вампиризм поддерживают героя под фокусом.'],['bkb','Надежно доводи ульт до союзника и переживай контроль.']]},
      {name:'ПО СИТУАЦИИ / ЛЕЙТ', items:[['aghanimHead','Временный прирост атаки усиливает окно после молота.'],['aghanimShard','Рассветный щит снижает урон и лечит союзников рядом.'],['blink','Мгновенно входи в центр драки.']]}
    ]
  },
  exileKnight: {
    title:'Рыцарь-изгнанник  /  Ближний carry',
    categories:[
      {name:'СТАРТОВЫЙ ЗАКУП', items:[['tango','Восстановление помогает пережить ранний размен клинками.'],['joelBoots','Скорость нужна, чтобы закрывать дистанцию до цели.']]},
      {name:'CORE', items:[['pt','Урон, скорость и темп атак раскрывают сплеш.'],['satanic','Большой запас здоровья и вампиризм дают вторую жизнь.'],['gur','Подброс создает окно для клича и Гнева бога.']]},
      {name:'ПО СИТУАЦИИ / ЛЕЙТ', items:[['bkb','Защищает силовой вход в командную драку.'],['aghanimShard','Клеймо изгнанника добавляет удар, метку и оглушение.'],['kinglandia','Поздний предмет для максимального физического давления.']]}
    ]
  },
  tribupainer: {
    title:'Трибупейнер  /  Огромный дробовик',
    categories:[
      {name:'СТАРТОВЫЙ ЗАКУП',items:[['mango','Мана для щита и поджигающих пуль.'],['tango','Лечение для безопасного давления на линии.']]},
      {name:'CORE',items:[['aghanimScepter','Усиляет поджигающие пули и взрывную ульту.'],['bkb','Защищает вход в упор и каст ульты.'],['joelBoots','Скорость помогает держать дистанцию для трёх пуль.']]},
      {name:'ПО СИТУАЦИИ',items:[['aghanimShard','Огненный барабан усиливает следующий залп.'],['blink','Быстрый вход в радиус взрыва.'],['satanic','Здоровье и вампиризм для ближнего дробовика.']]}
    ]
  },
  regina: {
    title:'Ригина  /  Серия яростных ударов',
    categories:[
      {name:'СТАРТОВЫЙ ЗАКУП',items:[['tango','Лечение помогает пережить первые размены в ближнем бою.'],['joelBoots','Скорость нужна, чтобы быстро добраться до цели и начать серию.']]},
      {name:'РАННЯЯ ИГРА',items:[['fangs','Клыки усиливают каждый быстрый удар и урон от Q/W.'],['pt','Собери ПТ из Сапога Джоэла, Клыков Васьки и 200 монет: это главный темп Ригины.']]},
      {name:'CORE',items:[['munition','Активация превращает заряды ярости в почти непрерывный шквал ударов.'],['arcadiaScar','Даёт большое окно урона и скорострельности для финального удара серии.'],['satanic','Здоровье и вампиризм помогают не прерывать серию под фокусом.']]},
      {name:'ПО СИТУАЦИИ / ЛЕЙТ',items:[['bkb','Защищает Ригину во время прыжка и всей яростной серии.'],['kinglandia','Максимально усиливает каждый удар и волну на последнем заряде.'],['aghanimScepter','Увеличивает запас зарядов и радиус финальной волны ульты.']]}
    ]
  }
};
const INVENTORY_KEYS = ['z','x','c','v','b','n'];
let barracksDestroyed = [0, 0];
let megaCreeps = [false, false];
function createStructureProgress(){
  return {lane:null,step:0,lanes:Array.from({length:LANES.length}, () => ({step:0}))};
}
let structureProgress = [createStructureProgress(), createStructureProgress()];
let recentKills = [];
let killStreakBanner = {text:'', color:'#ff3b30', t:0, scale:1};
let rampageBanner = {t:0, owner:null, streak:0};
let abilityAudioContext = null;
let menuAudioContext = null;
let menuMusicGain = null;
let menuMusicTimer = null;
let menuMusicStep = 0;
let musicEnabled = (() => {
  try { return localStorage.getItem('dota-sens-menu-music') !== 'off'; }
  catch(err) { return true; }
})();
let talentOpen = false;
let talentTreeOpen = false;
let talentChoices = [];
let talentHero = null;
let chatMessages = [];
let chatInputOpen = false;
const CHAT_MAX_MESSAGES = 7;
let lastTauntIndex = {weak:-1, strong:-1, generic:-1};
let pendingBotReplies = [];

/*
 * Реплики намеренно остаются игровым трэш-током: без оскорблений
 * защищённых групп и без угроз. Всего 100 фраз: 34 за слабую игру,
 * 33 за сильную игру и 33 универсальные.
 */
const HERO_TAUNTS = {
  weak: [
    'Ну ты и лоханулся.',
    'Игрок, ты вообще карту видел?',
    'Твоя позиция хуже, чем мой лаг.',
    'Бот бы нажал кнопку раньше.',
    'Ты специально промахиваешься?',
    'С таким фармом тебе только фонари охранять.',
    'Выйди из леса, потеряшка.',
    'Ты опять отдался бесплатно.',
    'Даже крип тебя переиграл.',
    'Реакция как у выключенного монитора.',
    'Ты играешь или грузишь меню?',
    'Еще одна такая драка — и мы назовем это кормлением.',
    'Ты подарил мне килл, спасибо.',
    'Твой план был плохим еще до начала.',
    'Не стой там, где тебя уже убивают.',
    'Саппорт из тебя как из крипа капитан.',
    'Ты нажал ульт после смерти? Красиво.',
    'Ты фармишь так, будто монеты кусаются.',
    'Не переживай, все видели этот фейл.',
    'Ты снова забыл, что у героя есть способности.',
    'Твоя миникарта явно в отпуске.',
    'Ты телепортируешься прямо в неприятности.',
    'Ну хоть врагам настроение поднял.',
    'Ты не ошибся кнопкой — ты ошибся игрой.',
    'С таким мувментом черепаха даст соло-килл.',
    'Твоя команда уже пишет заявление о пропаже игрока.',
    'Отличный прыжок… жаль, что в могилу.',
    'Думал, это тренировка для манекенов?',
    'Ты так долго целился, что бой закончился.',
    'Кажется, твой герой играет лучше тебя.',
    'У тебя талант находить самый опасный угол.',
    'Еще чуть-чуть — и ты начнешь помогать врагам.',
    'Лох — мягко сказано, ты сегодня целый учебник.',
    'Это был не фейл, это была демонстрация.'
  ],
  strong: [
    'Сбавь темп, читер, мы тоже хотим поиграть.',
    'У тебя что, второй монитор с будущим?',
    'Слишком чисто. Где прячешь читы?',
    'Это не скилл, это подозрительно.',
    'Алло, админы, тут герой с турбиной.',
    'Ты карту взломал или просто так наглый?',
    'Нормально ты читаешь мысли. Читер?',
    'С таким уроном даже башня нервничает.',
    'Это был игрок или киберспортивный робот?',
    'Ты точно один за клавиатурой?',
    'Подозрительно быстро. Бан за стиль.',
    'Хватит попадать, мы уже поняли, что ты сильный.',
    'Читер, дай нам хотя бы одну честную драку.',
    'Ты что, патчноуты заранее прочитал?',
    'Твои кнопки явно работают лучше моих.',
    'Кто выдал тебе режим бога?',
    'Момент идеальный. Слишком идеальный.',
    'Если это не читы, то нам всем пора учиться.',
    'Ты фармишь как калькулятор с амбициями.',
    'Такое чувство, что ты видишь сквозь туман.',
    'Сильная игра. Ненавижу, но уважаю.',
    'У тебя кулдауны короче, чем наши надежды.',
    'Я требую проверку реплея.',
    'Так быстро реагируют только читеры и коты.',
    'Ты случайно не финальный босс этой карты?',
    'Мы пришли драться, а попали на экзамен.',
    'Сними режим читера, пожалуйста.',
    'Твой микроконтроль выглядит незаконно.',
    'Даже смерть от тебя выглядит профессионально.',
    'Ладно, это уже не паблик, а показательное выступление.',
    'Ты так уверенно нас унижаешь, будто это работа.',
    'Читер, оставь нам хотя бы одну башню.',
    'С таким темпом ты сейчас начнешь убивать взглядом.'
  ],
  generic: [
    'Повезло, игрок.',
    'Это была случайность!',
    'Я еще вернусь.',
    'Слишком самоуверенно для новичка.',
    'Хорошая попытка, но нет.',
    'Ты правда думал, что это сработает?',
    'Моя бабушка лучше читает карту.',
    'Ты забыл, что враги тоже умеют бить.',
    'Не торопись, ты и так уже опоздал.',
    'Кажется, мы оба знаем, кто здесь лишний.',
    'Это твой лучший план? Соболезную.',
    'Ты пришел за победой или за поражением?',
    'У тебя талант выбирать неправильную цель.',
    'Красиво начал, смешно закончил.',
    'В следующий раз возьми героя попроще.',
    'Ты играешь на ощупь?',
    'Хотел удивить? Получилось только рассмешить.',
    'Не волнуйся, я никому не скажу про этот момент.',
    'Ты слишком громко проигрываешь.',
    'Враг найден. Мозг не найден.',
    'У тебя кнопки отдыхают?',
    'Смотри, я даже не напрягался.',
    'Хорошо, что чат есть — молча было бы неловко.',
    'Ты всегда так знакомишься с поражением?',
    'И это была твоя лучшая идея?',
    'Не расстраивайся, статистика забудет.',
    'Ты не слабый, ты просто очень убедительно проигрываешь.',
    'Будь осторожнее, карта не виновата.',
    'Ну хоть попытка была.',
    'Ты целишься в меня или в воспоминания?',
    'Еще один такой ход — и я поверю, что это намеренно.',
    'Спасибо за бесплатный урок.',
    'Пауза закончилась, можно снова проигрывать.'
  ]
};

const HERO_TALENTS = {
  pyro: [['+220 к здоровью', {maxHp:220, hp:220}], ['+20% к урону способностей', {spellAmp:0.20}], ['+30 к урону', {damage:30}], ['+15% к скорости', {speedPercent:0.15}], ['+500 к мане', {maxMp:500, mp:500}]],
  warlord: [['+300 к здоровью', {maxHp:300, hp:300}], ['+25 к урону и +15 к скорости', {damage:25, speed:15}], ['+20 брони', {armor:20}], ['+20% к урону способностей', {spellAmp:0.20}], ['+35 к урону', {damage:35}]],
  grisha: [['+250 к мане', {maxMp:250, mp:250}], ['+15% к урону способностей', {spellAmp:0.15}], ['+300 к здоровью', {maxHp:300, hp:300}], ['+25 к урону', {damage:25}], ['+20% к скорости', {speedPercent:0.20}]],
  golly: [['+250 к здоровью', {maxHp:250, hp:250}], ['+12 брони', {armor:12}], ['+20 к урону', {damage:20}], ['+15% к урону способностей', {spellAmp:0.15}], ['+350 к здоровью', {maxHp:350, hp:350}]],
  sasych: [['+18% к скорости', {speedPercent:0.18}], ['+250 к здоровью', {maxHp:250, hp:250}], ['+30 к урону', {damage:30}], ['+15% к урону способностей', {spellAmp:0.15}], ['+12 брони', {armor:12}]],
  ilya: [['+350 к здоровью', {maxHp:350, hp:350}], ['+25 к урону ауры', {auraDamage:25}], ['+30 к урону', {damage:30}], ['+15 брони', {armor:15}], ['+20% к урону способностей', {spellAmp:0.20}]],
  malit: [['+20 к броне', {armor:20}], ['+30 к урону и +12% к скорости', {damage:30, speedPercent:0.12}], ['+300 к здоровью', {maxHp:300, hp:300}], ['+20% к урону способностей', {spellAmp:0.20}], ['+40 к урону', {damage:40}]],
  arcady: [['+250 к здоровью', {maxHp:250, hp:250}], ['+25% к урону способностей', {spellAmp:0.25}], ['+35 к урону', {damage:35}], ['+20 к скорости', {speed:20}], ['+150 к урону', {damage:150}]],
  shadow: [['+250 к здоровью', {maxHp:250, hp:250}], ['+1 к душам за убийство крипов', {shadowSoulGain:1}], ['+15% к урону койлов', {spellAmp:0.15}], ['+20 к скорости', {speed:20}], ['+1 душа в залпе Реквиема', {ultimateSoulBonus:1}]],
  illusionist: [['+250 к здоровью', {maxHp:250, hp:250}], ['+10% к урону иллюзий', {illusionDamage:0.10}], ['+2 сек к жизни иллюзий', {illusionLife:2}], ['+20 к скорости', {speed:20}], ['+1 иллюзия в Гранд-финале', {ultimateIllusions:1}]],
  mo3gi: [['+300 к здоровью', {maxHp:300, hp:300}], ['+20% к урону дрона', {spellAmp:0.20}], ['+2 секунды дрону', {mo3giDroneLife:2}], ['+15 к скорости байка', {speed:15}], ['+1 мина', {mo3giMineBonus:1}]],
  juvsyut: [['+300 к здоровью', {maxHp:300, hp:300}], ['+20 к броне', {armor:20}], ['+25 к урону Жирного толчка', {damage:25}], ['+15% к скорости', {speedPercent:0.15}], ['+18% к урону способностей', {spellAmp:0.18}]],
  chip: [['+250 к здоровью', {maxHp:250, hp:250}], ['+20 к урону', {damage:20}], ['+15 к броне', {armor:15}], ['+15% к скорости', {speedPercent:0.15}], ['+18% к урону способностей', {spellAmp:0.18}]]
};

function playSynthSfx(kind){
  try {
    abilityAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const context = abilityAudioContext;
    context.resume();
    const now = context.currentTime;
    const presets = {
      attack: {from:150,to:70,duration:0.09,type:'square',volume:0.045,noise:true},
      cast: {from:420,to:760,duration:0.22,type:'sine',volume:0.045},
      blink: {from:720,to:1320,duration:0.18,type:'triangle',volume:0.05},
      stun: {from:110,to:48,duration:0.34,type:'sawtooth',volume:0.07,noise:true},
      ultimate: {from:72,to:38,duration:0.65,type:'sawtooth',volume:0.09,noise:true},
      purchase: {from:620,to:1180,duration:0.16,type:'square',volume:0.05},
      coin: {from:880,to:1480,duration:0.13,type:'sine',volume:0.055},
      death: {from:180,to:42,duration:0.52,type:'sawtooth',volume:0.075,noise:true},
      level: {from:520,to:900,duration:0.2,type:'triangle',volume:0.04}
    };
    const preset = presets[kind] || presets.cast;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = preset.type;
    oscillator.frequency.setValueAtTime(preset.from, now);
    oscillator.frequency.exponentialRampToValueAtTime(preset.to, now + preset.duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(preset.volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, now + preset.duration);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(now); oscillator.stop(now + preset.duration + 0.03);
    if(preset.noise){
      const buffer = context.createBuffer(1, Math.floor(context.sampleRate*0.12), context.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length);
      const noise = context.createBufferSource();
      const noiseGain = context.createGain();
      noise.buffer = buffer;
      noiseGain.gain.setValueAtTime(preset.volume*0.55, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now+0.12);
      noise.connect(noiseGain); noiseGain.connect(context.destination); noise.start(now);
    }
  } catch(err) {}
}

function playAbilitySound(kind){
  playSynthSfx(kind === 'purchase' ? 'purchase' : kind === 'coin' ? 'coin' : kind === 'level' ? 'level' : 'cast');
}

function playHeroSfx(kind){
  if(kind === 'attack_tribupainer'){ playSynthSfx('shotgun'); return; }
  if(kind === 'attack' || kind.startsWith('attack_')){ playSynthSfx('attack'); return; }
  if(kind === 'blink'){ playSynthSfx('blink'); return; }
  if(kind === 'stun'){ playSynthSfx('stun'); return; }
  if(kind === 'ultimate'){ playSynthSfx('ultimate'); return; }
  try {
    abilityAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const context = abilityAudioContext;
    const now = context.currentTime;
    const presets = {
      mana: [260, 520, 'triangle'], blink: [180, 760, 'sine'], shield: [130, 390, 'square'],
      hammer: [90, 210, 'sawtooth'], heal: [420, 820, 'sine'], jump: [110, 620, 'triangle'],
      gauntlet: [150, 300, 'square'], rage: [70, 180, 'sawtooth'], attack: [220, 460, 'triangle'],
      attack_pyro: [310, 640, 'sawtooth'], attack_warlord: [95, 240, 'square'], attack_grisha: [420, 760, 'triangle'],
      attack_golly: [180, 390, 'sine'], attack_sasych: [125, 280, 'sawtooth'], attack_ilya: [75, 170, 'square'],
      attack_malit: [100, 205, 'square'], attack_arcady: [260, 720, 'sawtooth'], attack_illusionist: [360, 680, 'sine'],
      attack_shadow: [120, 360, 'sawtooth'], attack_electricGosha: [520, 980, 'triangle'], attack_mo3gi: [150, 410, 'square'],
      attack_mageHunter: [190, 520, 'sawtooth'], attack_dawnMaiden: [85, 190, 'square'], attack_exileKnight: [110, 260, 'sawtooth'], shotgun: [75, 420, 'sawtooth']
    };
    const [from, to, type] = presets[kind] || presets.attack;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + 0.16);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(now); oscillator.stop(now + 0.22);
  } catch(err) {}
}

function heroBurst(hero, color, radius=90, count=22){
  if(!hero) return;
  fxRing(hero.x, hero.y, radius, color, 0.55);
  spawnParticles(hero.x, hero.y, color, count, Math.min(1.8, radius/80));
}

function spawnHammerTrail(x, y, color='#ffd36b'){
  spawnParticles(x, y, color, 8, 0.55);
  fxRing(x, y, 34, color, 0.22);
}

function playKillSound(){
  try {
    abilityAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const context = abilityAudioContext;
    const now = context.currentTime;
    [880, 1175, 1480].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 0 ? 'sawtooth' : 'square';
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.045);
      gain.gain.setValueAtTime(0.0001, now + index * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.07, now + index * 0.045 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.045 + 0.22);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(now + index * 0.045);
      oscillator.stop(now + index * 0.045 + 0.24);
    });
  } catch(err) {}
}

function playRampageVoice(){
  try {
    if('speechSynthesis' in window){
      window.speechSynthesis.cancel();
      const voice = new SpeechSynthesisUtterance('RAMPAGE');
      voice.lang = 'en-US';
      voice.rate = 0.72;
      voice.pitch = 0.48;
      voice.volume = 1;
      window.speechSynthesis.speak(voice);
    }
  } catch(err) {}
  try {
    abilityAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const context = abilityAudioContext;
    const now = context.currentTime;
    [92, 138, 184, 276].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index < 2 ? 'sawtooth' : 'square';
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.08);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.55, now + index * 0.08 + 0.24);
      gain.gain.setValueAtTime(0.0001, now + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.08 + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.46);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(now + index * 0.08);
      oscillator.stop(now + index * 0.08 + 0.5);
    });
  } catch(err) {}
}

function addChatMessage(name, text, color){
  chatMessages.push({name, text, color:color || '#ffffff', t:gameTime});
  if(chatMessages.length > CHAT_MAX_MESSAGES) chatMessages.shift();
  if(name === 'Вы' && gameState === 'playing') queueBotChatReply(text);
}

const BOT_CHAT_REPLY_GROUPS = {
  greeting: [
    'Привет. Надеюсь, ты пришёл не только поздороваться с фонтаном.',
    'Здорово. Теперь попробуй поздороваться с миникартой.',
    'Привет, игрок. Мы уже заметили тебя на линии.'
  ],
  boast: [
    'Громко сказано. Теперь покажи это в драке.',
    'Записал. Проверим после следующего замеса.',
    'Не спеши праздновать, мы еще не закончили.',
    'Слова быстрые, а кнопки у тебя тоже такие?'
  ],
  strategy: [
    'План услышал. Мы уже придумали, как его сломать.',
    'Иди первым, конечно. Мы посмотрим из безопасного места.',
    'Хорошая идея. Жаль, что мы тоже умеем читать чат.',
    'Пушьте сколько хотите — башня всё равно будет смеяться последней.'
  ],
  question: [
    'Ответ: нет. Но спасибо за интерес.',
    'Это ты сейчас спрашиваешь или заранее оправдываешься?',
    'Посмотри на счёт — там уже есть ответ.',
    'Спроси после респауна, если не забудешь.'
  ],
  general: [
    'Сообщение принято. Урон по твоей самооценке уже начислен.',
    'Чат работает, а вот твой план — пока нет.',
    'Продолжай писать, это отвлекает тебя от игры.',
    'Мы тоже умеем печатать. И попадать по кнопкам.',
    'Интересно. А теперь попробуй пережить следующую волну.',
    'Я бы ответил серьёзно, но ты уже всё сказал за себя.'
  ]
};

function chooseBotChatReply(text){
  const normalized = String(text || '').toLowerCase();
  let group = 'general';
  if(/привет|здаров|хай|hello|hi\b/.test(normalized)) group = 'greeting';
  else if(/[?？]/.test(normalized)) group = 'question';
  else if(/изи|легко|побед|топ|лучше|сильн|читер|gg|easy|бот|лох/.test(normalized)) group = 'boast';
  else if(/пуш|атак|ид[её]м|драка|мид|верх|низ|башн|план/.test(normalized)) group = 'strategy';
  const replies = BOT_CHAT_REPLY_GROUPS[group];
  return replies[Math.floor(Math.random() * replies.length)];
}

function queueBotChatReply(text){
  const responders = heroes.filter(hero => hero.team === 1 && hero.def);
  if(!responders.length) return;
  const hero = responders[Math.floor(Math.random() * responders.length)];
  pendingBotReplies.push({
    at: gameTime + 0.8 + Math.random() * 1.3,
    hero,
    text: chooseBotChatReply(text)
  });
  if(pendingBotReplies.length > 3) pendingBotReplies.shift();
}

function updateBotChatReplies(){
  while(pendingBotReplies.length && pendingBotReplies[0].at <= gameTime){
    const reply = pendingBotReplies.shift();
    if(reply.hero && reply.hero.def)
      addChatMessage(reply.hero.def.name, reply.text, '#ff8585');
  }
}

function getPlayerTauntMode(event){
  if(!playerHero) return 'generic';
  const projectedDeaths = playerHero.deaths + (event === 'playerDeath' ? 1 : 0);
  if(event === 'playerDeath' &&
     (projectedDeaths >= 2 || playerHero.kills <= projectedDeaths))
    return 'weak';
  if(event === 'playerKill' &&
     (playerHero.killStreak >= 2 ||
      playerHero.kills >= playerHero.deaths + 2 ||
      playerHero.kills >= 3))
    return 'strong';
  return 'generic';
}

function botTaunt(hero, event='generic'){
  if(!hero || !hero.def) return;
  const mode = getPlayerTauntMode(event);
  const taunts = HERO_TAUNTS[mode] || HERO_TAUNTS.generic;
  let index = Math.floor(Math.random() * taunts.length);
  if(taunts.length > 1 && index === lastTauntIndex[mode])
    index = (index + 1) % taunts.length;
  lastTauntIndex[mode] = index;
  addChatMessage(hero.def.name, taunts[index], '#ff8585');
}

/*
 * Оригинальная тихая фоновая тема меню на Web Audio API.
 * Она не использует чужой музыкальный файл и существует только пока
 * gameState === 'menu'. После первого клика браузер разрешает звук.
 */
const MENU_MUSIC_BASS = [110, 98, 123, 92, 110, 82, 98, 73];
const MENU_MUSIC_MELODY = [220, 0, 247, 0, 277, 0, 247, 0];

function playMenuNote(frequency, duration, volume, type='sine'){
  if(!menuAudioContext || !menuMusicGain || !frequency) return;
  const now = menuAudioContext.currentTime;
  const oscillator = menuAudioContext.createOscillator();
  const gain = menuAudioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.08);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(menuMusicGain);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.04);
}

function playMenuMusicStep(){
  if(!musicEnabled || !menuAudioContext || gameState !== 'menu') return;
  const step = menuMusicStep % MENU_MUSIC_BASS.length;
  playMenuNote(MENU_MUSIC_BASS[step], 1.35, 0.24, 'triangle');
  playMenuNote(MENU_MUSIC_BASS[step] * 1.5, 1.1, 0.055, 'sine');
  if(MENU_MUSIC_MELODY[step]){
    playMenuNote(MENU_MUSIC_MELODY[step], 0.72, 0.065, 'sine');
  }
  menuMusicStep++;
}

function playDraftMusicStep(){
  if(!musicEnabled || !menuAudioContext || gameState !== 'menu' || menuStage !== 'draft') return;
  const step = menuMusicStep++ % 8;
  const notes = [146.83,164.81,196,220,196,164.81,130.81,164.81];
  playMenuNote(notes[step], 0.78, 0.12, 'triangle');
  playMenuNote(notes[step] * 2, 0.34, 0.035, 'sine');
}

function startDraftMusic(){
  if(!musicEnabled || gameState !== 'menu') return;
  try {
    menuAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    menuAudioContext.resume();
    if(!menuMusicGain){
      menuMusicGain = menuAudioContext.createGain();
      menuMusicGain.gain.value = 0.0001;
      menuMusicGain.connect(menuAudioContext.destination);
    }
    menuMusicGain.gain.setTargetAtTime(0.13, menuAudioContext.currentTime, 0.2);
    if(!draftMusicTimer){
      menuMusicStep = 0;
      playDraftMusicStep();
      draftMusicTimer = window.setInterval(playDraftMusicStep, 760);
    }
  } catch(err) {}
}

function stopDraftMusic(){
  if(draftMusicTimer){ window.clearInterval(draftMusicTimer); draftMusicTimer=null; }
}

function speakDraftCountdown(){
  try {
    if(!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance('Осталось десять секунд');
    voice.lang='ru-RU'; voice.rate=0.88; voice.pitch=1.18; voice.volume=1;
    const female = window.speechSynthesis.getVoices().find(item => /female|жен|anna|milena|irina|samantha/i.test(item.name+' '+item.voiceURI));
    if(female) voice.voice=female;
    window.speechSynthesis.speak(voice);
  } catch(err) {}
}

function playStorePhrase(){
  const phrases = [];
  if(storePhraseOwned) phrases.push('legacy');
  if(storeChipOwned) phrases.push('chip');
  if(storeAudioOwned) phrases.push('pesik');
  if(storeFeedimidiOwned) phrases.push('feedimidi');
  if(storeNineteenOwned) phrases.push('nineteen');
  if(storeAbuuuOwned) phrases.push('abuuu');
  if(!phrases.length) return;
  const phrase = phrases[storePhraseIndex % phrases.length];
  storePhraseIndex++;
  speakStorePhrase(phrase);
}

const PHRASE_WHEEL_ITEMS = [
  {id:'chip', label:'ЧИП', text:'А Чип короооооооль!', color:'#ff9fbd'},
  {id:'legacy', label:'КОРОЛЯ', text:'Короля не убить!', color:'#ffd568'},
  {id:'pesik', label:'ПЁСИК', text:'Пёсик, пёсик! Ав-ав-ав!', color:'#8be9fd'},
  {id:'kisi', label:'КИСИ', text:'Киси-киси, мяу-мяу! Киси-киси, мяу-мяу-мяу!', color:'#d8a6ff'},
  {id:'feedimidi', label:'ФИДИ МИДИ', text:'Фиди миди', color:'#ffd568'},
  {id:'nineteen', label:'МНЕ 19 ЛЕТ', text:'Пацаны, мне 19 лет', color:'#bda8ff'},
  {id:'abuuu', label:'АБУУУУ РАРАРАР', text:'АБУУУУУУУУ! РА-РА-РА!', color:'#ff8278'}
];
const STORE_PHRASE_CARDS = [
  {id:'legacy',title:'КЛАССИКА',desc:'Короля не убить!',color:'#ffd568'},
  {id:'chip',title:'КОРОЛЬ-ЧИП',desc:'А Чип короооооооль!',color:'#ff9fbd'},
  {id:'pesik',title:'АНИМЕ-ФРАЗА',desc:'Пёсик, пёсик — ав-ав-ав!',color:'#8be9fd'},
  {id:'feedimidi',title:'ФИДИ МИДИ',desc:'Фиди миди',color:'#ffd568'},
  {id:'nineteen',title:'ПАЦАНЫ, МНЕ 19',desc:'Страшная реплика',color:'#bda8ff'},
  {id:'abuuu',title:'АБУУУУ РАРАРАР',desc:'Кричалка',color:'#ff8278'}
];

function isStorePhraseOwned(id){
  if(id==='legacy') return storePhraseOwned;
  if(id==='chip') return storeChipOwned;
  if(id==='pesik') return storeAudioOwned;
  if(id==='feedimidi') return storeFeedimidiOwned;
  if(id==='nineteen') return storeNineteenOwned;
  if(id==='abuuu') return storeAbuuuOwned;
  return false;
}

function unlockStorePhrase(id){
  if(id==='legacy') storePhraseOwned=true;
  if(id==='chip') storeChipOwned=true;
  if(id==='pesik') storeAudioOwned=true;
  if(id==='feedimidi') storeFeedimidiOwned=true;
  if(id==='nineteen') storeNineteenOwned=true;
  if(id==='abuuu') storeAbuuuOwned=true;
}

function updatePhraseWheelSelection(){
  if(!phraseWheelOpen) return;
  const dx = mouse.x - VW/2;
  const dy = mouse.y - VH/2;
  const distance = Math.hypot(dx, dy);
  if(distance < 58){
    phraseWheelSelection = -1;
    return;
  }
  let angle = Math.atan2(dy, dx) + Math.PI/2;
  if(angle < 0) angle += Math.PI*2;
  const slice = Math.PI*2/PHRASE_WHEEL_ITEMS.length;
  phraseWheelSelection = Math.floor((angle + slice/2) / slice) % PHRASE_WHEEL_ITEMS.length;
}

function choosePhraseFromWheel(){
  if(phraseWheelSelection < 0) phraseWheelSelection = 0;
  speakStorePhrase(PHRASE_WHEEL_ITEMS[phraseWheelSelection].id);
  phraseWheelOpen = false;
  phraseWheelSelection = -1;
}

function speakStorePhrase(variant='chip'){
  const isPesik = variant === 'pesik';
  const isLegacy = variant === 'legacy';
  const isKisi = variant === 'kisi';
  const settings = variant === 'feedimidi'
    ? {text:'Фиди миди', rate:0.78, pitch:0.42, pattern:/male|муж|dmitri|alex|pavel|deep|bass|baritone/i}
    : (variant === 'nineteen'
      ? {text:'Пацаны, мне 19 лет', rate:0.72, pitch:0.38, pattern:/male|муж|dmitri|alex|pavel|deep|bass|baritone/i}
      : (variant === 'abuuu'
        ? {text:'АБУУУУУУУУ! РА-РА-РА!', rate:1.22, pitch:1.62, pattern:/male|муж|dmitri|alex|pavel|deep|bass|baritone/i}
        : (isLegacy
    ? {text:'Короля... не убить!', rate:0.76, pitch:0.58, pattern:/male|муж|dmitri|alex|pavel|deep|bass|baritone/i}
    : (isPesik
      ? {text:'Пёсик, пёсик! Ав-ав-ав!', rate:1.16, pitch:1.58, pattern:/female|жен|anime|anna|milena|irina|girl|young/i}
      : (isKisi
        ? {text:'Киси-киси, мяу-мяу! Киси-киси, мяу-мяу-мяу!', rate:1.5, pitch:1.7, pattern:/female|жен|anime|anna|milena|irina|girl|young|cute/i}
        : {text:'А Чип короооооооль!', rate:0.78, pitch:0.48, pattern:/male|муж|dmitri|alex|pavel|deep|bass|baritone/i})))));

  const speak = attempt => {
    try {
      if(!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
      const synth = window.speechSynthesis;
      const voices = synth.getVoices();
      /* В Chrome список голосов появляется не сразу после загрузки страницы. */
      if(!voices.length && attempt === 0){
        window.setTimeout(() => speak(1), 120);
        return;
      }
      const voice = new SpeechSynthesisUtterance(settings.text);
      voice.lang = 'ru-RU';
      voice.rate = settings.rate;
      voice.pitch = settings.pitch;
      voice.volume = 1;
      const russianVoices = voices.filter(item => /^ru(?:-|_)/i.test(item.lang || ''));
      const preferred = russianVoices.find(item => settings.pattern.test(item.name+' '+item.voiceURI))
        || russianVoices[0]
        || voices.find(item => settings.pattern.test(item.name+' '+item.voiceURI));
      if(preferred) voice.voice = preferred;
      synth.cancel();
      synth.resume();
      /* Небольшая пауза после cancel исправляет пропуск первой реплики в Chrome. */
      window.setTimeout(() => {
        try {
          synth.resume();
          synth.speak(voice);
        } catch(err) {}
      }, 35);
    } catch(err) {
      console.warn('Не удалось включить озвучку фразы', err);
    }
  };
  speak(0);
}

function startMenuMusic(){
  if(!musicEnabled || gameState !== 'menu') return;
  if(menuStage === 'draft'){ startDraftMusic(); return; }
  try {
    menuAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    menuAudioContext.resume();
    if(!menuMusicGain){
      menuMusicGain = menuAudioContext.createGain();
      menuMusicGain.gain.value = 0.0001;
      menuMusicGain.connect(menuAudioContext.destination);
    }
    menuMusicGain.gain.cancelScheduledValues(menuAudioContext.currentTime);
    menuMusicGain.gain.setTargetAtTime(0.17, menuAudioContext.currentTime, 0.35);
    if(!menuMusicTimer){
      menuMusicStep = 0;
      playMenuMusicStep();
      menuMusicTimer = window.setInterval(playMenuMusicStep, 1100);
    }
  } catch(err) {}
}

function stopMenuMusic(){
  stopDraftMusic();
  if(menuMusicTimer){
    window.clearInterval(menuMusicTimer);
    menuMusicTimer = null;
  }
  if(menuMusicGain && menuAudioContext){
    menuMusicGain.gain.cancelScheduledValues(menuAudioContext.currentTime);
    menuMusicGain.gain.setTargetAtTime(0.0001, menuAudioContext.currentTime, 0.08);
  }
}

function setMusicEnabled(enabled){
  musicEnabled = enabled;
  try { localStorage.setItem('dota-sens-menu-music', enabled ? 'on' : 'off'); }
  catch(err) {}
  if(enabled) startMenuMusic();
  else stopMenuMusic();
}

/* =========================================================
   УРОН
   ========================================================= */
function armorMult(armor){
  if(armor >= 0) return 1 - (0.06*armor)/(1 + 0.06*armor);
  return 2 - Math.pow(0.94, -armor);
}

function isStructure(unit){
  return unit && (unit.type === 'tower' || unit.type === 'ancient');
}

function isBuilding(unit){
  return isStructure(unit) || (unit && unit.type === 'barracks');
}

/*
 * База проходится одной последовательностью: внешняя башня выбранной
 * линии -> внутренняя башня -> казармы этой линии -> трон. Пока цепочка
 * не завершена, остальные здания этой стороны не получают урон.
 */
function structureObjectiveLabel(team){
  const progress = structureProgress[team] || createStructureProgress();
  if(progress.lanes.some(line => line.step === 0)) return 'внешнюю башню';
  if(progress.lanes.some(line => line.step === 1)) return 'внутреннюю башню';
  if(progress.lanes.some(line => line.step === 2)) return 'казармы';
  return 'трон';
}

function structureBlockReason(target){
  const progress = structureProgress[target.team] || createStructureProgress();
  const line = progress.lanes[target.lane] || {step:0};
  if(target.type === 'tower'){
    if(line.step === 0) return target.tier === 1 ? '' : 'СНАЧАЛА СЛОМАЙТЕ ВНЕШНЮЮ БАШНЮ ЭТОЙ ЛИНИИ';
    if(line.step === 1) return target.tier === 2 ? '' : 'СНАЧАЛА СЛОМАЙТЕ ВНУТРЕННЮЮ БАШНЮ ЭТОЙ ЛИНИИ';
    return 'СНАЧАЛА СЛОМАЙТЕ КАЗАРМЫ ЭТОЙ ЛИНИИ';
  }
  if(target.type === 'barracks') return line.step === 2 ? '' : 'СНАЧАЛА СЛОМАЙТЕ ОБЕ БАШНИ ЭТОЙ ЛИНИИ';
  if(target.type === 'ancient') return progress.lanes.some(item => item.step >= 3) ? '' : 'СНАЧАЛА СЛОМАЙТЕ КАЗАРМЫ';
  return '';
}

function canDamageStructure(target, source=null, silent=false){
  if(!target || !isBuilding(target)) return true;
  const progress = structureProgress[target.team] || createStructureProgress();
  const line = progress.lanes[target.lane] || {step:0};
  let allowed = false;
  if(target.type === 'tower'){
    if(target.tier === 1 && line.step === 0){
      allowed = true;
    } else if(target.tier === 2 && line.step === 1){
      allowed = true;
    }
  } else if(target.type === 'barracks'){
    allowed = line.step === 2;
  } else if(target.type === 'ancient'){
    allowed = progress.lanes.some(item => item.step >= 3);
  }
  if(!allowed && !silent){
    const now = gameTime || 0;
    if((target.structureHintTime || 0) <= now){
      target.structureHintTime = now + 0.8;
      addText(target.x, target.y - target.radius - 28, structureBlockReason(target), '#ffcc70', 1.0, 14);
    }
  }
  return allowed;
}

function igniteUnit(target, source, duration=5, damagePerSecond=25){
  if(!target || target.dead) return;
  const existing=target.buffs && target.buffs.find(buff=>buff.type==='burning');
  if(existing){ existing.t=Math.max(existing.t,duration); existing.damage=Math.max(existing.damage,damagePerSecond); existing.source=source; }
  else if(target.addBuff) target.addBuff({type:'burning',t:duration,damage:damagePerSecond,source});
  addText(target.x,target.y-target.radius-28,'ПОДЖОГ','#ff8a3d',0.9,13);
  fxRing(target.x,target.y,34,'#ff5a24',0.28);
}

function hasScepter(hero){
  return !!(hero && hero.inventory && hero.inventory.some(item=>item && item.id==='aghanimScepter'));
}

function hasScepterSkillBoost(hero){
  return !!(hero && hero.scepterSkillBoost && hasScepter(hero));
}

const SCEPTER_UPGRADES = {
  pyro:'Огненный шар получает +180 урона, ульта +1 взрыв',
  warlord:'Рассекающий удар расширяется, ульта лечит сильнее',
  grisha:'Усиленные орбы, Призыв получает -20% КД',
  golly:'Кристалл замораживает дольше, ульта призывает +1 голема',
  sasych:'Кровавый обряд длится дольше, Rupture наносит +25%',
  ilya:'Аура шире, Пир толстяка даёт усиленный бафф',
  malit:'Подброс сильнее, Лазерный круг получает +1 оборот',
  arcady:'Огненные шары шире, Динамит получает дополнительный заряд',
  illusionist:'Двойник живёт дольше, Гранд-финал получает +1 иллюзию',
  shadow:'Койлы получают +20% урона, Реквием выпускает больше душ',
  electricGosha:'Static Remnant сильнее, Ball Lightning наносит больше урона',
  mo3gi:'Дрон живёт дольше, мины получают увеличенный радиус',
  mageHunter:'Мерцание получает заряд, Пустой резерв сжигает больше маны',
  dawnMaiden:'Молот оглушает дольше, Солнечный страж лечит сильнее',
  exileKnight:'Рывок шире, Гнев бога длится дольше',
  tribupainer:'Поджигающие пули сильнее, ульта получает второй импульс',
  regina:'Dispose бросает дальше, Rebound усиливает удар, Unleash даёт больше зарядов и расширяет финальную волну',
  earthshaker:'Enchant Totem превращается в прыжок с приземлением, наносящим урон и оглушение по области'
};

function applyDamage(target, amount, source){
  if(!target || target.dead) return;
  const sourceHero = source && source.coins !== undefined
    ? source
    : (source && source.source && source.source.coins !== undefined ? source.source : null);
  if(target.onlinePlayerId && sourceHero && sourceHero.isPlayer && sourceHero.team === target.team) return;
  if(isBuilding(target) && source && Number.isInteger(source.team) && source.team === target.team) return;
  if(target.invulnerable) return;
  /* Blade Fury блокирует заклинания, но не обычные физические атаки. */
  if(target.buffs && target.buffs.some(buff => buff.type === 'bladeFury') &&
     source && !source.attack) return;
  if(target.bikeShieldTimer > 0) amount *= 0.2;
  if(source && source.team !== undefined && source.team !== target.team && target.timurPillow > 0){
    target.timurPillow = 0;
    addText(target.x, target.y - 56, 'ЛЕЧЕНИЕ СБИТО', '#ff8080', 1.0, 14);
  }
  if(target.isIllusion && source && source.attack) amount *= target.damageTakenMultiplier || 1;
  if(isStructure(target) && !(source && source.attack)) return;
  if(isBuilding(target) && !canDamageStructure(target, source)) return;
  const attackResistance = target.inventory && target.inventory.some(i => i && i.id === 'ilyaHair') ? SHOP_ITEMS.ilyaHair.attackResist : 0;
  if(source && source.attack && attackResistance) amount *= 1 - attackResistance;
  const shardShield = target.buffs && target.buffs.some(buff => buff.type === 'shardShield');
  if(source && source.attack && shardShield) amount *= 0.65;
  const juvsyutGuard = target.buffs && target.buffs.find(buff => buff.type === 'juvsyutGuard');
  if(juvsyutGuard && source && source.team !== target.team) amount *= juvsyutGuard.multiplier || 0.72;
  const shardMark = target.buffs && target.buffs.find(buff => buff.type === 'shardMark');
  if(shardMark) amount *= 1 + shardMark.val;
  if(source && source.def && source.def.id === 'golly' && source.buffs && source.buffs.some(b => b.type === 'gollyRed')) amount *= 3;
  if(source && source.attack && target.bkbActive > 0){
    amount *= 0.4;
  }
  const tribuShield = target.buffs && target.buffs.find(buff=>buff.type==='tribuShield');
  if(tribuShield && source && source.team !== target.team) amount *= 0.70;
  if(source && source.attack && source.source && source.source.buffs){
    const shardBlade = source.source.buffs.find(buff => buff.type === 'shardBlade');
    if(shardBlade){
      amount += 180;
      target.mp = 0;
      source.source.buffs = source.source.buffs.filter(buff => buff !== shardBlade);
      fxRing(target.x, target.y, 58, '#caa5ff', 0.35);
    }
  }
  const dawnShardShield = target.buffs && target.buffs.find(buff => buff.type === 'dawnShardShield');
  if(dawnShardShield && source && source.team !== target.team) amount *= 1 - dawnShardShield.val;
  if(sourceHero && hasScepterSkillBoost(sourceHero) && !(source && source.attack)) amount *= 1.2;
  if(sourceHero && source && source.attack && sourceHero.def){
    if(sourceHero.def.id === 'mageHunter' && sourceHero.skills && sourceHero.skills[0] && sourceHero.skills[0].level > 0 && target.type === 'hero'){
      const burn = 16 + sourceHero.level * 5;
      target.mp = Math.max(0, (target.mp || 0) - burn);
      spawnParticles(target.x, target.y, '#c56cff', 7, 0.45);
      fxRing(target.x, target.y, 28, '#c56cff', 0.18);
    }
    if(sourceHero.def.id === 'dawnMaiden'){
      for(const ally of heroes){
        if(ally.team === sourceHero.team && !ally.dead && Math.hypot(ally.x-sourceHero.x, ally.y-sourceHero.y) < 260){
          ally.hp = Math.min(ally.maxHp, ally.hp + 15 + sourceHero.level * 2.5);
          spawnParticles(ally.x, ally.y, '#fff0a8', 5, 0.3);
        }
      }
    }
        if(sourceHero.def.id === 'exileKnight' && !sourceHero.splashing && target.type !== 'tower'){
      sourceHero.splashing = true;
      for(const nearby of units){
        if(nearby !== target && !nearby.dead && nearby.team !== sourceHero.team && nearby.team !== 2 &&
           Math.hypot(nearby.x-target.x, nearby.y-target.y) < 105)
           applyDamage(nearby, amount * 0.42, {team:sourceHero.team, source:sourceHero, attack:true});
      }
      sourceHero.splashing = false;
      fxBeam(sourceHero.x, sourceHero.y, target.x, target.y, '#ff707a', 0.16);
    }
  }
  if(sourceHero && sourceHero.def && !(source && source.attack)){
    amount *= sourceHero.def.balanceScale || 1;
  }
  const reflect = target.buffs && target.buffs.find(buff => buff.type === 'mageReflect');
  if(reflect && sourceHero && sourceHero.team !== target.team && source && !source.attack){
    applyDamage(sourceHero, amount * reflect.val, {team:target.team, source:target, magic:true});
    fxRing(target.x, target.y, 105, '#d58cff', 0.35);
  }
  if(sourceHero && sourceHero.castingSkillLevel > 1 && !(source && source.attack)){
    amount *= 1 + (sourceHero.castingSkillLevel - 1) * 0.08;
  }
  /* Урон способностей и ультимейтов растёт вместе с уровнем героя,
     как и урон от обычной атаки. */
  if(sourceHero && sourceHero.level > 1 && !(source && source.attack)){
    amount *= 1 + (sourceHero.level - 1) * 0.03;
  }
  const armor = target.getArmor ? target.getArmor() : (target.armor || 0);
  const structureBonus = target.type === 'tower' ? 1.2 : 1;
  const dmg = source && source.trueDamage
    ? Math.max(1, amount)
    : Math.max(1, amount * armorMult(armor) * structureBonus);
  const onlineSocket = window.__shadowOnlineSocket;
    if(onlineSocket && onlineSocket.connected && target.onlinePlayerId && sourceHero &&
      sourceHero.isPlayer && sourceHero.onlinePlayerId && sourceHero.onlinePlayerId !== target.onlinePlayerId &&
      sourceHero.team !== target.team){
    onlineSocket.emit('playerDamage',{targetId:target.onlinePlayerId,amount:dmg});
  }
  if(sourceHero && sourceHero.type === 'hero' && sourceHero.team !== target.team && target.type === 'hero'){
    target.damageContributors.set(sourceHero, (target.damageContributors.get(sourceHero) || 0) + dmg);
  }
  if(sourceHero && sourceHero.team !== target.team && sourceHero.inventory && sourceHero.inventory.some(i => i && i.id === 'satanic') && source && source.attack){
    sourceHero.hp = Math.min(sourceHero.maxHp, sourceHero.hp + dmg * SHOP_ITEMS.satanic.lifesteal);
  }
  target.hp -= dmg;
  target.hitFlash = 0.18;
  if(target.type === 'hero') target.combatTimer = 3.2;
  if(sourceHero && sourceHero.type === 'hero') sourceHero.combatTimer = 3.2;
  addText(target.x + rnd(-12,12), target.y - target.radius - 6,
          Math.round(dmg), target.type==='hero' ? '#ff5555' : '#ffd24a', 0.8, 15);
  if(target.hp <= 0) killUnit(target, source);
}

function canBreakBarracks(barracks){
  return !!barracks && barracks.type === 'barracks' && canDamageStructure(barracks, null, true);
}

const GRISHA_ABILITY_DAMAGE_MULT = 0.35;
function heroLevelSkillDamageMult(level){
  if(!level || level <= 1) return 1;
  const earlyLevels = Math.min(level, 15) - 1;      // уровни 2-15: небольшой рост
  const lateLevels = Math.max(0, level - 15);        // уровни 16-30: заметный, но не чрезмерный рост
  return 1 + earlyLevels * 0.025 + lateLevels * 0.09;
}
/* Небольшой прирост урона обычной атаки на 15-30 уровнях
   (используется в getDamage(), влияет и на криты/хедшоты, которые
   считаются от базового урона атаки). */
function attackLevelDamageMult(level){
  if(!level || level <= 15) return 1;
  return 1 + Math.min(level - 15, 15) * 0.025;
}
function abilityDamage(source, amount){
  const reduced = source && source.def && source.def.id === 'grisha'
    ? amount * GRISHA_ABILITY_DAMAGE_MULT
    : amount;
  const bloodrage = source && source.buffs && source.buffs.find(b => b.type === 'bloodrage');
  const empowered = bloodrage ? reduced * bloodrage.spellMult : reduced;
  const shard = source && source.buffs && source.buffs.find(buff => buff.type === 'shardSpell');
  const shardEmpowered = shard ? empowered * shard.val : empowered;
  const skillLevelBonus = source && source.castingSkillLevel > 1 ? 1 + (source.castingSkillLevel - 1) * 0.35 : 1;
  const heroLevelBonus = source && source.level ? heroLevelSkillDamageMult(source.level) : 1;
  const talentEmpowered = (source && source.spellAmp ? shardEmpowered * (1 + source.spellAmp) : shardEmpowered) * skillLevelBonus * heroLevelBonus;
  const scepterEmpowered = hasScepterSkillBoost(source) ? talentEmpowered * 1.2 : talentEmpowered;
  return source && source.inventory && source.inventory.some(i => i && i.id === 'fangs')
    ? scepterEmpowered + 105
    : scepterEmpowered;
}

function killUnit(u, source){
  if(u.dead) return;
  u.dead = true; u.hp = 0;
  const rewardHero = source && source.coins !== undefined
    ? source
    : (source && source.source && source.source.coins !== undefined ? source.source : null);
  if(u.type === 'neutral') u.respawnTimer = 30;
  if(rewardHero && rewardHero.team !== u.team){
    const reward = u.type === 'neutral' ? 70 : (u.type === 'creep' ? 60 : (u.type === 'hero' ? 200 : 0));
    if(reward){
      rewardHero.coins += reward;
      if(rewardHero === playerHero) addText(u.x, u.y - u.radius - 24, '+' + reward + ' монет', '#ffd54f', 1.1, 14);
      if(rewardHero === playerHero) playAbilitySound('coin');
    }
  }
  if(rewardHero && rewardHero.def && rewardHero.def.id === 'shadow' &&
     rewardHero.team !== u.team && (u.type === 'creep' || u.type === 'neutral')){
    rewardHero.shadowSouls = Math.min(30, (rewardHero.shadowSouls || 0) + 2 + (rewardHero.shadowSoulGain || 0));
    addText(rewardHero.x, rewardHero.y - 68, 'ДУШИ +2  (' + rewardHero.shadowSouls + ')', '#ff8a3d', 0.9, 13);
  }
  if(rewardHero && rewardHero.team !== u.team && u.type === 'hero'){
    rewardHero.kills++;
    if(rewardHero === playerHero) playKillSound();
     if(rewardHero === playerHero && u.team === 1) botTaunt(u, 'playerKill');
    for(const [helper, damage] of u.damageContributors){
      if(helper === rewardHero || helper.dead || helper.team !== rewardHero.team) continue;
      if(damage < u.maxHp * 0.2) continue;
      const assistReward = 50 + Math.floor(Math.random() * 51);
      helper.assists++;
      helper.coins += assistReward;
      addText(helper.x, helper.y - 72, 'ПОМОЩЬ +' + assistReward + ' монет', '#72e6a5', 1.4, 15);
    }
    const streakContinues = rewardHero.lastHeroKillTime > -Infinity &&
      gameTime - rewardHero.lastHeroKillTime <= 8;
    rewardHero.killStreak = streakContinues ? (rewardHero.killStreak || 0) + 1 : 1;
    rewardHero.lastHeroKillTime = gameTime;
    const streak = rewardHero.killStreak >= 3 ? 'RAMPAGE' :
      (rewardHero.killStreak >= 2 ? 'ДВОЙНОЕ УБИЙСТВО' : 'УБИЙСТВО');
    if(rewardHero.killStreak === 3){
      rampageBanner = {t:4.2, owner:rewardHero, streak:rewardHero.killStreak};
      playRampageVoice();
    }
    if(rewardHero === playerHero){
      killStreakBanner = {text:streak, color:rewardHero.killStreak >= 2 ? '#ff3b30' : '#ff8b78', t:2.6, scale:rewardHero.killStreak >= 2 ? 1.18 : 1};
      spawnParticles(playerHero.x, playerHero.y, '#ff3b30', rewardHero.killStreak >= 2 ? 42 : 24, rewardHero.killStreak >= 2 ? 1.5 : 1);
      fxRing(playerHero.x, playerHero.y, rewardHero.killStreak >= 2 ? 190 : 120, '#ff3b30', 0.75);
    }
    addText(rewardHero.x, rewardHero.y - 88, streak, rewardHero.killStreak >= 2 ? '#ff3b30' : '#ff7b7b', 1.8, rewardHero.killStreak >= 2 ? 26 : 20);
  }
  if(u.type === 'tower' || u.type === 'barracks'){
    addText(u.x, u.y - 70, u.type === 'tower' ? 'БАШНЯ РАЗРУШЕНА!' : 'КАЗАРМЫ РАЗРУШЕНЫ!', '#ffd54f', 1.8, 20);
  }
  if(u.type === 'tower'){
    const progress = structureProgress[u.team];
    if(progress && progress.lanes[u.lane]){
      progress.lane = u.lane;
      progress.lanes[u.lane].step = u.tier === 1 ? 1 : 2;
      progress.step = progress.lanes[u.lane].step;
    }
  }
  if(u.type === 'barracks'){
    if(structureProgress[u.team] && structureProgress[u.team].lanes[u.lane]){
      structureProgress[u.team].lanes[u.lane].step = 3;
      structureProgress[u.team].lane = u.lane;
      structureProgress[u.team].step = 3;
    }
    barracksDestroyed[u.team]++;
    if(barracksDestroyed[u.team] >= 3){
      megaCreeps[1-u.team] = true;
      addText(BASES[1-u.team].x, BASES[1-u.team].y - 100, 'МЕГА-КРИПЫ!', '#ff9f43', 2.0, 26);
    }
  }
  fxRing(u.x, u.y, u.radius*2.4, TEAM_COL[u.team], 0.5);
  for(const h of heroes){
    if(h.team === u.team || h.dead) continue;
    if(Math.hypot(h.x-u.x, h.y-u.y) < 1500) gainXp(h, u.xpValue || 40);
  }
  if(u.type === 'hero'){
      playSynthSfx('death');
     if(u === playerHero && rewardHero && rewardHero.team === 1)
       botTaunt(rewardHero, 'playerDeath');
    u.respawnTimer = 8 + u.level * 1.5;
    u.killStreak = 0;
    u.lastHeroKillTime = -Infinity;
    addText(u.x, u.y-60, 'УБИТ!', '#ff3b3b', 1.6, 26);
  }
  if(u.type === 'ancient'){
    winner = u.team === 0 ? 1 : 0;
    gameState = 'over';
  }
}

function addText(x,y,str,color,life,size){
  if(texts.length > 180) texts.splice(0, texts.length - 180);
  texts.push({x,y,str,color,life:life||0.9,t:0,size:size||14});
}
function spawnParticles(x,y,color,count=16,spread=1){
  if(particles.length > 900) particles.splice(0, particles.length - 900);
  for(let i=0;i<count;i++){
    const angle = Math.random()*Math.PI*2;
    const speed = rnd(55, 260)*spread;
    particles.push({
      x, y, vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed,
      color, size:rnd(2,6), t:0, life:rnd(0.35,0.9),
      gravity:rnd(12,70), drag:rnd(0.86,0.96), spark:Math.random()<0.42
    });
  }
}
function spawnFootstepDust(x,y,color){
  if(particles.length > 900) particles.splice(0, particles.length - 900);
  const n = 2+Math.floor(Math.random()*2);
  for(let i=0;i<n;i++){
    const angle = Math.random()*Math.PI*2;
    const speed = rnd(6,26);
    particles.push({
      x:x+rnd(-3,3), y:y+rnd(-2,2),
      vx:Math.cos(angle)*speed, vy:Math.sin(angle)*speed - rnd(4,12),
      color, size:rnd(1.6,3.4), t:0, life:rnd(0.28,0.5),
      gravity:rnd(26,55), drag:0.9, spark:false, dust:true
    });
  }
}
function spawnGrassBend(x,y,angle){
  if(grassBends.length > 260) grassBends.splice(0, grassBends.length - 260);
  grassBends.push({
    x, y, angle: angle + rnd(-0.3,0.3),
    t:0, life: rnd(0.8,1.2), spread: rnd(0.75,1.15)
  });
}
function spawnRadialBlades(x,y,r,color,count=24){
  if(particles.length > 900) particles.splice(0, particles.length - 900);
  for(let i=0;i<count;i++){
    const angle = i*Math.PI*2/count + rnd(-0.04,0.04);
    const distance = r*rnd(0.55,0.98);
    particles.push({
      x:x+Math.cos(angle)*distance, y:y+Math.sin(angle)*distance,
      vx:Math.cos(angle)*rnd(20,75), vy:Math.sin(angle)*rnd(20,75),
      color, size:rnd(9,19), t:0, life:rnd(0.32,0.68),
      gravity:0, drag:0.93, spark:true, blade:true, angle
    });
  }
}
function fxRing(x,y,r,color,life){
  if(fxs.length > 220) fxs.splice(0, fxs.length - 220);
  fxs.push({type:'ring',x,y,r,t:0,life:life||0.4,color});
  if(r >= 80){
    spawnRadialBlades(x,y,r,color,Math.min(30,Math.max(14,Math.round(r/12))));
    spawnParticles(x,y,color,Math.min(18,Math.round(r/12)),Math.min(1.5,r/150));
  }
}
function fxMark(x,y,r,color,delay){
  fxs.push({type:'mark',x,y,r,t:0,life:delay,color});
  spawnParticles(x,y,color,18,0.7);
}
function fxHit(x,y,color){
  const impactColor = color || '#ffffff';
  fxs.push({type:'hit',x,y,r:18,t:0,life:0.3,color:impactColor});
  spawnParticles(x,y,impactColor,16,0.7);
  spawnRadialBlades(x,y,28,impactColor,8);
}
function fxBeam(x1,y1,x2,y2,color,life){
  fxs.push({type:'beam',x1,y1,x2,y2,t:0,life:life||0.35,color});
  const length = Math.hypot(x2-x1,y2-y1)||1;
  spawnParticles(x2,y2,color,Math.min(14,Math.round(length/90)),0.55);
}
/* Выжженная растрескавшаяся земля: жёлто-огненные трещины, расходящиеся
   от центра, поверх тлеющего пятна выжженной земли. Используется для
   мощных ударных ультимейтов по земле (например Echo Slam у Шмедика). */
function spawnGroundCrack(x,y,radius,color,life){
  const rays = 9 + Math.round(radius/55);
  const cracks = [];
  for(let i=0;i<rays;i++){
    let ang = i*Math.PI*2/rays + rnd(-0.18,0.18);
    const segs = 4 + Math.floor(Math.random()*3);
    const segLen = radius/segs;
    let cx=0, cy=0;
    const pts=[];
    for(let s=0;s<segs;s++){
      ang += rnd(-0.4,0.4);
      cx += Math.cos(ang)*segLen*rnd(0.7,1.2);
      cy += Math.sin(ang)*segLen*rnd(0.7,1.2);
      pts.push({x:cx,y:cy});
    }
    cracks.push(pts);
  }
  fxs.push({type:'groundCrack', x, y, r:radius, t:0, life:life||1.9, color:color||'#ffd23f', cracks});
}

function startArcMotion(unit, endX, endY, duration, onLand, height=90, controlX=null, controlY=null){
  if(!unit || unit.dead) return;
  unit.moveTarget = null;
  unit.attackTarget = null;
  unit.knockbackTimer = 0;
  unit.arcMotion = {
    startX: unit.x, startY: unit.y,
    endX: clamp(endX, 60, WORLD-60), endY: clamp(endY, 60, WORLD-60),
    controlX, controlY, t: 0, duration: Math.max(0.2, duration), height, onLand
  };
}

function advanceArcMotion(unit, dt){
  const motion = unit && unit.arcMotion;
  if(!motion) return false;
  motion.t += dt;
  const progress = Math.min(1, motion.t / motion.duration);
  const eased = progress * progress * (3 - 2 * progress);
  if(Number.isFinite(motion.controlX) && Number.isFinite(motion.controlY)){
    const inverse = 1 - eased;
    unit.x = inverse*inverse*motion.startX + 2*inverse*eased*motion.controlX + eased*eased*motion.endX;
    unit.y = inverse*inverse*motion.startY + 2*inverse*eased*motion.controlY + eased*eased*motion.endY;
  } else {
    unit.x = motion.startX + (motion.endX - motion.startX) * eased;
    unit.y = motion.startY + (motion.endY - motion.startY) * eased;
  }
  unit.facing = Math.atan2(motion.endY - motion.startY, motion.endX - motion.startX);
  if(progress >= 1){
    unit.arcMotion = null;
    if(motion.onLand && !unit.dead) motion.onLand();
  }
  return true;
}

function spawnAoE(x,y,radius,dmg,source,delay,color,manaDmg){
  aoes.push({x,y,radius,dmg:abilityDamage(source,dmg),manaDmg:manaDmg||0,team:source.team,source,delay,t:0,color,
    applied:false,life:0.45,dead:false});
  spawnParticles(x,y,color,Math.min(24,Math.max(10,Math.round(radius/18))),Math.min(1.7,radius/170));
  if(radius >= 180) spawnRadialBlades(x,y,radius,color,Math.min(26,Math.round(radius/14)));
}
function spawnProjectile(x,y,target,dmg,source,speed,color,radius){
  const projectile={x,y,target,dmg,team:source.team,source,speed:speed||950,
    color:color||'#fff',radius:radius||6,dead:false,life:3,
    isSpell:!!(source && source.castingSkillLevel),trailTimer:0,prevX:x,prevY:y};
  projectiles.push(projectile);
  spawnParticles(x,y,projectile.color,projectile.isSpell ? 10 : 5,projectile.isSpell ? 0.45 : 0.25);
  return projectile;
}
function projectileOwner(projectile){
  const source = projectile && projectile.source;
  if(source && source.def && source.def.id) return source;
  if(source && source.source && source.source.def && source.source.def.id) return source.source;
  return null;
}
function projectileHeading(projectile){
  if(Number.isFinite(projectile.dirX)) return Math.atan2(projectile.dirY, projectile.dirX);
  if(projectile.target) return Math.atan2(projectile.target.y-projectile.y, projectile.target.x-projectile.x);
  return 0;
}
function drawThemedProjectile(projectile){
  const owner = projectileOwner(projectile);
  const id = owner && owner.def ? owner.def.id : '';
  if(!id) return false;
  const r = Math.max(4, projectile.radius || 6);
  const angle = projectileHeading(projectile);
  const primary = owner.def.color2 || projectile.color || '#ffffff';
  const secondary = owner.def.color || projectile.color || '#ffffff';
  ctx.save();
  ctx.translate(projectile.x, projectile.y);
  ctx.rotate(angle);
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = primary;
  ctx.shadowColor = primary;
  ctx.shadowBlur = 28;
  ctx.beginPath(); ctx.arc(0,0,r*2.4,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 22;
  ctx.shadowColor = primary;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if(id === 'pyro' || id === 'arcady'){
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.moveTo(r*2.2,0); ctx.quadraticCurveTo(r*0.7,-r*1.35,-r*1.45,-r*0.52);
    ctx.quadraticCurveTo(-r*0.55,0,-r*1.45,r*0.52);
    ctx.quadraticCurveTo(r*0.7,r*1.35,r*2.2,0); ctx.fill();
    ctx.fillStyle = primary;
    ctx.beginPath(); ctx.ellipse(r*0.38,0,r*1.0,r*0.43,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff5bd';
    ctx.beginPath(); ctx.ellipse(r*0.7,0,r*0.34,r*0.18,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#ff7a32'; ctx.lineWidth = Math.max(2,r*0.22);
    ctx.beginPath(); ctx.moveTo(-r*1.9,-r*0.35); ctx.lineTo(-r*3.4,-r*0.95); ctx.moveTo(-r*1.9,r*0.35); ctx.lineTo(-r*3.4,r*0.95); ctx.stroke();
  } else if(id === 'grisha'){
    ctx.rotate(gameTime*4.5);
    ctx.fillStyle = '#d7b5ff';
    ctx.beginPath(); ctx.moveTo(r*1.9,0); ctx.lineTo(0,-r*1.15); ctx.lineTo(-r*1.05,0); ctx.lineTo(0,r*1.15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff4ff'; ctx.beginPath(); ctx.arc(0,0,r*0.35,0,Math.PI*2); ctx.fill();
    for(let i=0;i<3;i++){
      const a = i*Math.PI*2/3 + gameTime*5;
      ctx.fillStyle = [ '#9eeaff','#fff1a8','#d99cff' ][i];
      ctx.beginPath(); ctx.arc(Math.cos(a)*r*1.55,Math.sin(a)*r*1.55,r*0.36,0,Math.PI*2); ctx.fill();
    }
  } else if(id === 'golly'){
    ctx.fillStyle = '#82dcff';
    ctx.beginPath(); ctx.moveTo(r*2.15,0); ctx.lineTo(r*0.5,-r*1.25); ctx.lineTo(-r*1.55,-r*0.58);
    ctx.lineTo(-r*1.05,0); ctx.lineTo(-r*1.55,r*0.58); ctx.lineTo(r*0.5,r*1.25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f0fdff';
    ctx.beginPath(); ctx.moveTo(r*1.3,0); ctx.lineTo(r*0.3,-r*0.55); ctx.lineTo(-r*0.8,0); ctx.lineTo(r*0.3,r*0.55); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#d7faff'; ctx.lineWidth = Math.max(1.5,r*0.16);
    ctx.beginPath(); ctx.moveTo(-r*2.4,-r*0.55); ctx.lineTo(-r*3.8,-r*1.15); ctx.moveTo(-r*2.4,r*0.55); ctx.lineTo(-r*3.8,r*1.15); ctx.stroke();
  } else if(id === 'electricGosha'){
    ctx.fillStyle = '#b9fbff'; ctx.beginPath(); ctx.arc(0,0,r*0.78,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#55ddff'; ctx.lineWidth = Math.max(2,r*0.24);
    for(let i=0;i<5;i++){
      const a = i*Math.PI*2/5 + gameTime*7;
      const len = r*(1.8 + (i%2)*0.55);
      ctx.beginPath(); ctx.moveTo(Math.cos(a)*r*0.45,Math.sin(a)*r*0.45);
      ctx.lineTo(Math.cos(a-0.18)*r*0.95,Math.sin(a-0.18)*r*0.95);
      ctx.lineTo(Math.cos(a+0.08)*len,Math.sin(a+0.08)*len); ctx.stroke();
    }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(r*0.25,-r*0.2,r*0.2,0,Math.PI*2); ctx.fill();
  } else if(id === 'sasych' || id === 'shadow'){
    ctx.fillStyle = id === 'shadow' ? '#ff3b1f' : '#ff5368';
    ctx.beginPath(); ctx.moveTo(r*2.2,0); ctx.bezierCurveTo(r*0.3,-r*1.2,-r*1.2,-r*0.8,-r*1.5,0);
    ctx.bezierCurveTo(-r*1.2,r*0.8,r*0.3,r*1.2,r*2.2,0); ctx.fill();
    ctx.fillStyle = id === 'shadow' ? '#14070a' : '#8f102a';
    ctx.beginPath(); ctx.arc(-r*0.25,0,r*0.65,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#ffb06d'; ctx.lineWidth = Math.max(1.5,r*0.16);
    ctx.beginPath(); ctx.moveTo(-r*2.1,-r*0.55); ctx.lineTo(-r*3.7,-r*0.95); ctx.moveTo(-r*2.1,r*0.55); ctx.lineTo(-r*3.7,r*0.95); ctx.stroke();
  } else if(id === 'mo3gi'){
    ctx.fillStyle = '#4e6b3b'; ctx.fillRect(-r*1.45,-r*0.62,r*2.5,r*1.24);
    ctx.fillStyle = '#9dff80'; ctx.fillRect(r*0.35,-r*0.34,r*0.75,r*0.68);
    ctx.strokeStyle = '#d8ffc5'; ctx.lineWidth = Math.max(1.5,r*0.15);
    ctx.beginPath(); ctx.moveTo(-r*1.45,-r*0.62); ctx.lineTo(-r*2.45,-r*1.1); ctx.moveTo(-r*1.45,r*0.62); ctx.lineTo(-r*2.45,r*1.1); ctx.stroke();
  } else if(id === 'tribupainer'){
    ctx.fillStyle = '#d99a52'; ctx.beginPath(); ctx.ellipse(0,0,r*1.65,r*0.7,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff0b0'; ctx.beginPath(); ctx.ellipse(r*0.7,0,r*0.45,r*0.28,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#ff8a3d'; ctx.lineWidth = Math.max(2,r*0.2);
    ctx.beginPath(); ctx.moveTo(-r*1.6,-r*0.28); ctx.lineTo(-r*3.8,-r*0.72); ctx.moveTo(-r*1.6,r*0.28); ctx.lineTo(-r*3.8,r*0.72); ctx.stroke();
  } else if(id === 'sniper'){
    ctx.fillStyle = '#fff0b0'; ctx.beginPath(); ctx.moveTo(r*2.8,0); ctx.lineTo(r*0.55,-r*0.38); ctx.lineTo(-r*2.1,-r*0.28); ctx.lineTo(-r*2.1,r*0.28); ctx.lineTo(r*0.55,r*0.38); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = Math.max(1.5,r*0.16);
    ctx.beginPath(); ctx.moveTo(-r*2.7,-r*0.7); ctx.lineTo(-r*4.4,-r*1.1); ctx.moveTo(-r*2.7,r*0.7); ctx.lineTo(-r*4.4,r*1.1); ctx.stroke();
  } else if(id === 'chip'){
    ctx.fillStyle = '#ffd568'; ctx.beginPath(); ctx.arc(0,0,r*1.15,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fff1a8'; ctx.lineWidth = Math.max(2,r*0.2); ctx.stroke();
    ctx.fillStyle = '#9b6cff'; ctx.beginPath(); ctx.arc(0,0,r*0.48,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fff7cf'; ctx.lineWidth = Math.max(1,r*0.12); ctx.beginPath(); ctx.arc(0,0,r*1.65,0,Math.PI*2); ctx.stroke();
  } else if(id === 'illusionist'){
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#eadbff';
    for(let i=0;i<3;i++){ ctx.save(); ctx.translate(-i*r*0.65,0); ctx.rotate(i*0.16); ctx.beginPath(); ctx.moveTo(r*1.5,0); ctx.lineTo(0,-r); ctx.lineTo(-r*1.1,0); ctx.lineTo(0,r); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5,r*0.18);
    ctx.beginPath(); ctx.moveTo(r*1.7,0); ctx.lineTo(0,-r*0.95); ctx.lineTo(-r*1.35,0); ctx.lineTo(0,r*0.95); ctx.closePath(); ctx.stroke();
  } else if(id === 'dawnMaiden' || id === 'warlord' || id === 'juggernaut' || id === 'mageHunter' || id === 'regina' || id === 'exileKnight'){
    ctx.strokeStyle = primary; ctx.lineWidth = Math.max(3,r*0.35);
    ctx.beginPath(); ctx.moveTo(-r*1.8,-r*0.85); ctx.lineTo(r*1.9,0); ctx.lineTo(-r*1.8,r*0.85); ctx.stroke();
    ctx.strokeStyle = '#fff5c2'; ctx.lineWidth = Math.max(1.5,r*0.14);
    ctx.beginPath(); ctx.moveTo(-r*1.4,-r*0.42); ctx.lineTo(r*1.45,0); ctx.lineTo(-r*1.4,r*0.42); ctx.stroke();
  } else if(id === 'ilya' || id === 'malit' || id === 'juvsyut'){
    ctx.fillStyle = secondary; ctx.beginPath(); ctx.arc(0,0,r*1.45,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = primary; ctx.beginPath(); ctx.arc(r*0.35,-r*0.25,r*0.55,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#ffe4b9'; ctx.lineWidth = Math.max(2,r*0.2);
    ctx.beginPath(); ctx.moveTo(-r*1.5,-r*0.55); ctx.lineTo(-r*3.1,-r*1.05); ctx.moveTo(-r*1.5,r*0.55); ctx.lineTo(-r*3.1,r*1.05); ctx.stroke();
  } else {
    ctx.fillStyle = primary; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(r*0.3,-r*0.25,r*0.3,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
  return true;
}
function spawnRollingSpell(x,y,tx,ty,dmg,source,color,radius,kind){
  const d = Math.hypot(tx-x,ty-y)||1;
  projectiles.push({x,y,tx,ty,dmg:abilityDamage(source,dmg),team:source.team,source,speed:520,color,radius,
    kind,dead:false,life:4,fall:kind==='meteor'?0.8:0,phase:'flight',rolled:false,
    isSpell:true,trailTimer:0,prevX:x,prevY:y,
    dirX:(tx-x)/d,dirY:(ty-y)/d});
  spawnParticles(x,y,color,18,0.7);
  spawnRadialBlades(x,y,Math.max(42,radius*2.5),color,16);
}
function spawnIceWall(x,y,tx,ty,source,lvl){
  walls.push({x,y,angle:Math.atan2(ty-y,tx-x)+Math.PI/2,length:360+35*lvl,
    width:34,team:source.team,source,dmg:abilityDamage(source,55+25*lvl),slow:0.82,life:7,t:0,hit:new Set()});
  spawnParticles(x,y,'#a0e0ff',24,0.8);
}

function spawnHealingWard(hero, level){
  const ward = new TimedSummon(hero, hero.x + 52, hero.y - 18, {
    kind:'healingWard', life:8 + level * 0.8, hp:190 + level * 45,
    dmg:0, radius:17, speed:0, atkRange:0, atkTime:1, armor:2
  });
  ward.atkRange = 0;
  ward.wardPulse = 0;
  ward.updateAI = function(dt){
    this.life -= dt;
    this.wardPulse += dt;
    if(this.life <= 0){ this.dead = true; return; }
    if(this.wardPulse < 0.8) return;
    this.wardPulse = 0;
    for(const ally of units){
      if(ally.dead || ally.team !== this.team || isBuilding(ally)) continue;
      if(Math.hypot(ally.x-this.x, ally.y-this.y) <= 250){
        const heal = ally.maxHp * (0.025 + level * 0.004);
        ally.hp = Math.min(ally.maxHp, ally.hp + heal);
        addText(ally.x, ally.y - 52, '+' + Math.round(heal), '#8dff9d', 0.55, 13);
        spawnParticles(ally.x, ally.y, '#8dff9d', 4, 0.28);
      }
    }
  };
  ward.updateCombat = function(){};
  units.push(ward);
  fxRing(ward.x, ward.y, 62, '#8dff9d', 0.45);
  addText(ward.x, ward.y - 48, 'HEALING WARD', '#a8ffad', 1.0, 14);
  return ward;
}

function findOmnislashTarget(hero, previous){
  const candidates = units.filter(unit =>
    !unit.dead && unit.team !== hero.team &&
    !isBuilding(unit) && unit !== previous &&
    (!hero.isPlayer || isVisibleToPlayer(unit)) &&
    Math.hypot(unit.x-hero.x, unit.y-hero.y) < 900
  );
  candidates.sort((a,b) =>
    Math.hypot(a.x-hero.x,a.y-hero.y)-Math.hypot(b.x-hero.x,b.y-hero.y)
  );
  return candidates[0] || null;
}

function omnislashStrike(hero, slash){
  let target;
  if(!slash.hasStruck){
    target = slash.target;
    slash.hasStruck = true;
  } else {
    const previous = slash.target;
    target = findOmnislashTarget(hero, previous);
    /* Если враг один, серия продолжает бить его, а не обрывается. */
    if(!target && previous && !previous.dead && previous.team !== hero.team)
      target = previous;
  }
  if(!target){
    slash.t = 0;
    hero.buffs = hero.buffs.filter(buff => buff !== slash);
    hero.invulnerable = false;
    hero.omnislashWasActive = false;
    return;
  }
  slash.target = target;
  const angle = Math.atan2(target.y-hero.y, target.x-hero.x);
  hero.x = clamp(target.x - Math.cos(angle) * 42, 60, WORLD-60);
  hero.y = clamp(target.y - Math.sin(angle) * 42, 60, WORLD-60);
  hero.facing = angle;
  const damage = hero.getDamage() * (1.18 + slash.level * 0.08);
  applyDamage(target, damage, {team:hero.team, source:hero, attack:true});
  fxBeam(hero.x, hero.y, target.x, target.y, '#fff2a8', 0.18);
  fxRing(target.x, target.y, 38, '#ffe066', 0.35);
  spawnParticles(target.x, target.y, '#fff7c7', 9, 0.42);
  slash.strikes--;
  if(slash.strikes <= 0) slash.t = 0;
}

function getInvokeCooldown(hero, key){
  return hero.spellCooldowns[key] || 0;
}

function useInventoryItem(hero, index){
  const item = hero.inventory[index];
  if(!item) return false;
  if(item.id === 'bkb'){
    if(item.cooldown > 0){ flashMsg(hero, 'БКБ на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    item.activeTimer = 10;
    item.cooldown = 50;
    hero.stunTimer = 0;
    hero.bkbActive = 10;
    addText(hero.x, hero.y - 56, 'БКБ АКТИВИРОВАН', '#f0c36a', 1.0, 16);
    fxRing(hero.x, hero.y, 100, '#f0c36a', 0.6);
    return true;
  }
  if(item.id === 'blink'){
    if(item.cooldown > 0){ flashMsg(hero, 'Блинк на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    const distance = Math.hypot(mouse.wx-hero.x, mouse.wy-hero.y) || 1;
    const range = Math.min(500, distance);
    let tx = hero.x + (mouse.wx-hero.x) / distance * range;
    let ty = hero.y + (mouse.wy-hero.y) / distance * range;
    if(!canMoveTo(tx, ty, hero.radius)){
      /* Точка под курсором перекрыта деревом — ищем ближайшее свободное место
         рядом, чтобы случайный клик в лес не просто "съедал" нажатие блинка. */
      let found = null;
      for(let r=20; r<=140 && !found; r+=20){
        for(let a=0; a<Math.PI*2 && !found; a+=Math.PI/8){
          const cx = tx+Math.cos(a)*r, cy = ty+Math.sin(a)*r;
          if(canMoveTo(cx, cy, hero.radius)) found = {x:cx,y:cy};
        }
      }
      if(!found) return false;
      tx = found.x; ty = found.y;
    }
    hero.x = clamp(tx, 60, WORLD-60); hero.y = clamp(ty, 60, WORLD-60);
    hero.moveTarget = null; hero.attackTarget = null; item.cooldown = 20;
    addText(hero.x, hero.y - 56, 'БЛИНК', '#8fd8ff', 1.0, 16);
    fxRing(hero.x, hero.y, 80, '#8fd8ff', 0.45);
    return true;
  }
  if(item.id === 'superBoots'){
    if(item.cooldown > 0){ flashMsg(hero, 'Супер сапог на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    item.cooldown = SHOP_ITEMS.superBoots.cooldown;
    item.activeTimer = SHOP_ITEMS.superBoots.activeDuration;
    addText(hero.x, hero.y - 56, 'СУПЕР СКОРОСТЬ', '#ffd34f', 1.0, 16);
    fxRing(hero.x, hero.y, 90, '#ffd34f', 0.55);
    return true;
  }
  if(item.id === 'aghanimHead'){
    if(item.cooldown > 0){ flashMsg(hero, 'Бошка Агнии на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    item.cooldown = SHOP_ITEMS.aghanimHead.cooldown;
    item.activeTimer = SHOP_ITEMS.aghanimHead.activeDuration;
    addText(hero.x, hero.y - 56, 'БОШКА АГНИИ', '#ff74d4', 1.0, 16);
    fxRing(hero.x, hero.y, 100, '#ff74d4', 0.55);
    return true;
  }
  if(item.id === 'ilyaHair'){
    if(item.cooldown > 0){ flashMsg(hero, 'Волосы Ильи на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    const target = pickUnitAt(mouse.wx, mouse.wy);
    if(!target || target.team === hero.team || target.dead || isStructure(target)){ flashMsg(hero, 'Наведите на вражеского бойца'); return false; }
    target.stunTimer = Math.max(target.stunTimer, SHOP_ITEMS.ilyaHair.stunDuration);
    item.cooldown = SHOP_ITEMS.ilyaHair.cooldown;
    addText(target.x, target.y - 56, 'ОГЛУШЕН НА 4 СЕК', '#e9f5ff', 1.2, 16);
    fxRing(target.x, target.y, 90, '#e9f5ff', 0.6);
    return true;
  }
  if(item.id === 'tornBrainHand'){
    if(item.cooldown > 0){ flashMsg(hero, 'Рука мо3гов на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    const target = pickUnitAt(mouse.wx, mouse.wy);
    if(!target || target.team === hero.team || target.dead || isBuilding(target)){ flashMsg(hero, 'Наведите на вражеского бойца'); return false; }
    const distance = Math.hypot(target.x-hero.x,target.y-hero.y) || 1;
    hero.x = clamp(target.x - (target.x-hero.x)/distance*85, 60, WORLD-60);
    hero.y = clamp(target.y - (target.y-hero.y)/distance*85, 60, WORLD-60);
    applyDamage(target, 350, {team:hero.team, source:hero, attack:true});
    item.cooldown = SHOP_ITEMS.tornBrainHand.cooldown;
    addText(hero.x, hero.y - 56, 'РУКА МО3ГОВ', '#d7a879', 1.1, 16);
    fxBeam(hero.x, hero.y, target.x, target.y, '#d7a879', 0.35);
    return true;
  }
  if(item.id === 'munition'){
    if(item.cooldown > 0){ flashMsg(hero, 'Мунуция на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    item.cooldown = SHOP_ITEMS.munition.cooldown;
    item.activeTimer = SHOP_ITEMS.munition.activeDuration;
    addText(hero.x, hero.y - 56, 'МУНУЦИЯ', '#f5d36b', 1.0, 16);
    fxRing(hero.x, hero.y, 80, '#f5d36b', 0.5);
    return true;
  }
  if(item.id === 'arcadiaScar'){
    if(item.cooldown > 0){ flashMsg(hero, 'Шрам-Аркадия на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    item.cooldown = SHOP_ITEMS.arcadiaScar.cooldown;
    item.activeTimer = SHOP_ITEMS.arcadiaScar.activeDuration;
    addText(hero.x, hero.y - 56, 'ШРАМ-АРКАДИЯ', '#ff7043', 1.0, 16);
    fxRing(hero.x, hero.y, 90, '#ff7043', 0.55);
    return true;
  }
  if(item.id === 'gur'){
    if(item.cooldown > 0){ flashMsg(hero, 'Гур на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    const target = pickUnitAt(mouse.wx, mouse.wy);
    if(!target || target.team === hero.team || target.dead || isBuilding(target)){ flashMsg(hero, 'Наведите на вражеского бойца'); return false; }
    target.stunTimer = Math.max(target.stunTimer, 1.2);
    target.liftTimer = 0.8;
    item.cooldown = SHOP_ITEMS.gur.cooldown;
    item.activeTimer = SHOP_ITEMS.gur.activeDuration;
    addText(target.x, target.y - 58, 'ГУР: ПОДБРОШЕН', '#d9f2ff', 1.1, 16);
    addText(hero.x, hero.y - 80, 'ГУР АКТИВИРОВАН', '#d9f2ff', 1.0, 15);
    fxRing(target.x, target.y, 85, '#d9f2ff', 0.6);
    return true;
  }
  if(item.id === 'dagonEmpire'){
    if(item.cooldown > 0){ flashMsg(hero, 'Дагонская империя на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    const target = pickUnitAt(mouse.wx, mouse.wy);
    if(!target || target.team === hero.team || target.dead || isBuilding(target)){
      flashMsg(hero, 'Наведите на вражеского бойца'); return false;
    }
    applyDamage(target, 500, {team:hero.team, source:hero, magic:true});
    item.cooldown = SHOP_ITEMS.dagonEmpire.cooldown;
    addText(target.x, target.y - 56, 'ДАГОН: -500', '#ff4f8b', 1.0, 16);
    fxBeam(hero.x, hero.y, target.x, target.y, '#ff4f8b', 0.4);
    return true;
  }
  if(item.id === 'timurPillow'){
    if(hero.hp >= hero.maxHp){ flashMsg(hero, 'Здоровье уже полностью восстановлено'); return false; }
    hero.timurPillow = 10;
    hero.inventory[index] = null;
    addText(hero.x, hero.y - 56, 'ПОДУШКА ТИМУРА: ЛЕЧЕНИЕ', '#9ed8ff', 1.0, 15);
    fxRing(hero.x, hero.y, 80, '#9ed8ff', 0.5);
    return true;
  }
  if(item.id === 'hatchet'){
    if(item.cooldown > 0){ flashMsg(hero, 'Топорик на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    let tree=null, best=150;
    for(const candidate of trees){
      const distance=Math.hypot(candidate.x-hero.x,candidate.y-hero.y);
      if(distance<best){ best=distance; tree=candidate; }
    }
    if(!tree){ flashMsg(hero, 'Подойдите к дереву'); return false; }
    trees.splice(trees.indexOf(tree),1);
    item.cooldown=SHOP_ITEMS.hatchet.cooldown;
    addText(hero.x,hero.y-56,'ДЕРЕВО СРУБЛЕНО','#c68b5b',1.0,15);
    fxRing(tree.x,tree.y,55,'#c68b5b',0.45);
    return true;
  }
  if(item.id === 'mantledSteel'){
    if(item.cooldown > 0){ flashMsg(hero, 'Мантированная сталь на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    item.cooldown = 14;
    spawnSteelCopies(hero);
    return true;
  }
  if(item.id === 'mango'){
    hero.mp = Math.min(hero.maxMp, hero.mp + 100);
    addText(hero.x, hero.y - 56, '+100 МАНЫ', '#72e6a5', 1.0, 16);
    fxRing(hero.x, hero.y, 72, '#72e6a5', 0.45);
    return true;
  }
  if(item.id === 'tango'){
    let tree = null, best = 105;
    for(const candidate of trees){
      const distance = Math.hypot(candidate.x-hero.x, candidate.y-hero.y);
      if(distance < best){ best = distance; tree = candidate; }
    }
    if(!tree){
      if(hero === playerHero) flashMsg(hero, 'Подойдите к дереву');
      return false;
    }
    hero.hp = Math.min(hero.maxHp, hero.hp + 90);
    trees.splice(trees.indexOf(tree), 1);
    hero.inventory[index] = null;
    addText(hero.x, hero.y - 56, '+90 HP', '#79d46c', 1.0, 16);
    fxRing(hero.x, hero.y, 72, '#79d46c', 0.45);
    return true;
  }
  return false;
}

function buyShopItem(id){
  if(!playerHero || playerHero.dead) return false;
  const item = SHOP_ITEMS[id];
  if(id === 'aghanimShard'){
    if(playerHero.shardSkill){ flashMsg(playerHero, 'Аганим шард уже изучен'); return false; }
    if(playerHero.coins < item.cost){ flashMsg(playerHero, 'Нужно ' + item.cost + ' монет'); return false; }
    playerHero.coins -= item.cost;
    const granted = grantShardSkill(playerHero);
    if(granted) playAbilitySound('purchase');
    return granted;
  }
  if(id === 'enemy302'){
    if(playerHero.inventory.some(i => i && i.id === id)){ flashMsg(playerHero, 'Предмет уже куплен'); return false; }
  }
  if(id === 'pt'){
    const bootsIndex = playerHero.inventory.findIndex(i => i && i.id === 'joelBoots');
    const fangsIndex = playerHero.inventory.findIndex(i => i && i.id === 'fangs');
    if(bootsIndex < 0 || fangsIndex < 0){ flashMsg(playerHero, 'Нужны Сапог Джоэла и Клыки Васьки'); return false; }
    if(playerHero.coins < item.cost){ flashMsg(playerHero, 'Нужно ' + item.cost + ' монет'); return false; }
    const slot = bootsIndex;
    playerHero.coins -= item.cost;
    playerHero.inventory[fangsIndex] = null;
    playerHero.inventory[slot] = createInventoryItem(id);
    applyItemStats(playerHero, id);
    playAbilitySound('purchase');
    addText(playerHero.x, playerHero.y - 70, item.name + ' собран', item.color, 1.2, 15);
    return true;
  }
  const slot = playerHero.inventory.findIndex(i => !i);
  if(!item || slot < 0){ flashMsg(playerHero, slot < 0 ? 'Нет свободного слота' : 'Нет такого предмета'); return false; }
  if(playerHero.coins < item.cost){ flashMsg(playerHero, 'Нужно ' + item.cost + ' монет'); return false; }
  playerHero.coins -= item.cost;
  playerHero.inventory[slot] = createInventoryItem(id);
  applyItemStats(playerHero, id);
  playAbilitySound('purchase');
  addText(playerHero.x, playerHero.y - 70, item.name + ' куплен', item.color, 1.2, 15);
  return true;
}

function confirmShopPurchase(id){
  pendingPurchaseId = id;
}

function buyBotItem(hero){
  const bootsIndex = hero.inventory.findIndex(i => i && i.id === 'joelBoots');
  const fangsIndex = hero.inventory.findIndex(i => i && i.id === 'fangs');
  const emptySlot = hero.inventory.findIndex(i => !i);
  if(bootsIndex >= 0 && fangsIndex >= 0 && hero.coins >= SHOP_ITEMS.pt.cost){
    hero.coins -= SHOP_ITEMS.pt.cost;
    hero.inventory[bootsIndex] = createInventoryItem('pt');
    hero.inventory[fangsIndex] = null;
    applyItemStats(hero, 'pt');
    return;
  }
  const lateChoices = ['bkb','blink','evsyutin','mantledSteel','manaHooves','superBoots','aghanimHead','ilyaHair','enemy302','tornBrainHand','munition','hatchet','satanic','arcadiaScar','kinglandia','gur','brainEye','aghanimScepter'];
  const earlyChoices = ['fangs','joelBoots','manaTome','enemy302'];
  const choices = gameTime > 90 ? lateChoices : earlyChoices;
  const availableChoices = choices.filter(id => {
    if(id === 'blink' && hero.inventory.some(item => item && item.id === 'blink')) return false;
    return !hero.inventory.some(item => item && item.id === id);
  });
  if(!availableChoices.length) return;
  const id = availableChoices[Math.floor(Math.random()*availableChoices.length)];
  const item = SHOP_ITEMS[id];
  if(id === 'aghanimShard'){
    if(hero.coins < item.cost) return;
    hero.coins -= item.cost;
    grantShardSkill(hero);
    return;
  }
  const slot = hero.inventory.findIndex(i => !i);
  if(!item || slot < 0 || hero.coins < item.cost) return;
  hero.coins -= item.cost;
  hero.inventory[slot] = createInventoryItem(id);
  applyItemStats(hero, id);
}

function createInventoryItem(id){
  const item = SHOP_ITEMS[id];
  if(!item) return null;
  return {
    id,
    name:item.name,
    color:item.color,
    icon:item.icon,
    desc:item.desc,
    active:!!item.active,
    cooldown:0,
    activeTimer:0
  };
}

function applyItemStats(hero, id){
  if(id === 'evsyutin'){
    hero.maxHp += SHOP_ITEMS.evsyutin.hp;
    hero.hp += SHOP_ITEMS.evsyutin.hp;
  }
  if(id === 'manaHooves'){
    hero.maxMp += SHOP_ITEMS.manaHooves.maxMp;
    hero.mp += SHOP_ITEMS.manaHooves.maxMp;
  }
  if(id === 'satanic'){
    hero.maxHp += SHOP_ITEMS.satanic.hp;
    hero.hp += SHOP_ITEMS.satanic.hp;
  }
}

/* =========================================================
   UNIT
   ========================================================= */
class Unit {
  constructor(o){
    this.x=o.x; this.y=o.y; this.team=o.team;
    this.radius=o.radius||18; this.speed=o.speed||110;
    this.maxHp=o.hp; this.hp=o.hp;
    this.dmg=o.dmg||10; this.atkRange=o.atkRange||100; this.atkTime=o.atkTime||1.2;
    this.armor=o.armor||0; this.vision=o.vision||800;
    this.type=o.type||'unit'; this.xpValue=o.xpValue||40;
    this.hpRegen=o.hpRegen||0; this.mpRegen=0;
    this.atkCd=0; this.dead=false; this.facing=0;
    this.moveTarget=null; this.attackTarget=null;
    this.stunTimer=0; this.slow=0; this.slowT=0; this.hitFlash=0;
    this.silenceTimer=0; this.ruptureState=null;
    this.knockbackX=0; this.knockbackY=0; this.knockbackTimer=0;
    this.buffs=[];
    this.damageContributors = new Map();
    this.hpRegenBoost=false;
    this.damageMultiplier=1;
    this.damageTakenMultiplier=1;
    this.isIllusion=false;
    this.owner=null;
    this.attackAnimProgress=0; this.isAttacking=false; this.attackAngle=0;
    this.walkPhase=Math.random()*10; this.moving=false; this.footstepTimer=0;
  }
  get alive(){ return !this.dead; }
  distTo(o){ return Math.hypot(this.x-o.x, this.y-o.y); }
  getArmor(){ let a=this.armor; for(const b of this.buffs) if(b.type==='armor' || b.type==='shardArmor') a+=b.val; return a; }
  getAttackRange(){
    let range=this.atkRange;
    if(this.inventory && this.inventory.some(i => i && i.id === 'brainEye')) range+=SHOP_ITEMS.brainEye.attackRange;
    if(this.def && this.def.id === 'sniper' && this.skills && this.skills[2] && this.skills[2].level > 0){
      const takeAimLevel=this.skills[2].level;
      range += 95 + takeAimLevel * 32;
      const takeAim=this.buffs.find(buff => buff.id === 'sniperTakeAim');
      if(takeAim) range += takeAim.rangeBonus || (125 + takeAimLevel * 28);
    }
    return range;
  }
  getDamage(){ let d=this.dmg; if(this.inventory && this.inventory.some(i => i && i.id === 'fangs')) d+=105; if(this.inventory && this.inventory.some(i => i && i.id === 'pt')) d+=150; if(this.inventory && this.inventory.some(i => i && i.id === 'ilyaHair')) d+=SHOP_ITEMS.ilyaHair.damage; if(this.inventory && this.inventory.some(i => i && i.id === 'hatchet')) d+=SHOP_ITEMS.hatchet.damage; if(this.inventory && this.inventory.some(i => i && i.id === 'kinglandia')) d+=SHOP_ITEMS.kinglandia.damage; const aghanimHead=this.inventory && this.inventory.find(i => i && i.id === 'aghanimHead'); if(aghanimHead && aghanimHead.activeTimer>0) d+=180; const arcadiaScar=this.inventory && this.inventory.find(i => i && i.id === 'arcadiaScar'); if(arcadiaScar && arcadiaScar.activeTimer>0) d+=SHOP_ITEMS.arcadiaScar.damage; const gur=this.inventory && this.inventory.find(i => i && i.id === 'gur'); if(gur && gur.activeTimer>0) d+=SHOP_ITEMS.gur.damage; for(const b of this.buffs) if(b.type === 'dmg') d+=b.val; if(this.buffs.some(b=>b.type==='doubleDamage')) d*=2; const exileRage=this.buffs.find(b=>b.type==='exileRage'); if(exileRage) d*=1+exileRage.val; return d*this.damageMultiplier*attackLevelDamageMult(this.level); }
  getAttackTime(){ let m=1; if(this.inventory && this.inventory.some(i => i && i.id === 'pt')) m+=0.6; const munition=this.inventory && this.inventory.find(i => i && i.id === 'munition'); if(munition && munition.activeTimer>0) m+=SHOP_ITEMS.munition.attackSpeed; const arcadiaScar=this.inventory && this.inventory.find(i => i && i.id === 'arcadiaScar'); if(arcadiaScar && arcadiaScar.activeTimer>0) m+=SHOP_ITEMS.arcadiaScar.attackSpeed; const gur=this.inventory && this.inventory.find(i => i && i.id === 'gur'); if(gur && gur.activeTimer>0) m+=SHOP_ITEMS.gur.attackSpeed; if(this.def && this.def.id === 'arcady' && this.skills && this.skills[2]) m+=this.skills[2].level*0.25; if(this.def && this.def.id === 'malit' && this.skills && this.skills[1] && this.skills[1].level>0) m+=0.18; const aghanimHead=this.inventory && this.inventory.find(i => i && i.id === 'aghanimHead'); if(aghanimHead && aghanimHead.activeTimer>0) m+=1.8; for(const b of this.buffs) if(b.type === 'as') m+=b.val; const bloodrage=this.buffs.find(b => b.type === 'bloodrage'); if(bloodrage) m+=bloodrage.val; return this.atkTime/m; }
  getSpeed(){ let s=this.speed; if(this.inventory && this.inventory.some(i => i && i.id === 'joelBoots')) s+=SHOP_ITEMS.joelBoots.speed; if(this.inventory && this.inventory.some(i => i && i.id === 'pt')) s+=60; if(this.inventory && this.inventory.some(i => i && i.id === 'ilyaHair')) s+=SHOP_ITEMS.ilyaHair.speed; if(this.def && this.def.id === 'arcady' && this.skills && this.skills[2]) s+=this.skills[2].level*27.5; const gur=this.inventory && this.inventory.find(i => i && i.id === 'gur'); if(gur && gur.activeTimer>0) s+=SHOP_ITEMS.gur.moveSpeed; if(this.buffs.some(b=>b.type==='haste')) s+=180; if(this.def && this.def.id === 'malit' && this.skills && this.skills[1] && this.skills[1].level>0) s*=1.18; const superBoots=this.inventory && this.inventory.find(i => i && i.id === 'superBoots'); if(superBoots){ s+=SHOP_ITEMS.superBoots.speed; if(superBoots.activeTimer>0) s+=SHOP_ITEMS.superBoots.activeSpeed; } const aghanimHead=this.inventory && this.inventory.find(i => i && i.id === 'aghanimHead'); if(aghanimHead && aghanimHead.activeTimer>0) s+=100; for(const b of this.buffs) if(b.type === 'spd') s*=(1+b.val); const thirst=this.def && this.def.id === 'sasych' ? heroes.filter(h => h.team !== this.team && !h.dead && h.type === 'hero').reduce((sum,h) => sum+(1-h.hp/h.maxHp)*0.4,0) : 0; s*=1+thirst; if(this.slowT>0) s*=(1-this.slow); return s; }
  addBuff(b){ this.buffs.push(b); }
  tickTimers(dt){
    if(this.atkCd>0) this.atkCd-=dt;
    if(this.attackSlowT>0) this.attackSlowT=Math.max(0,this.attackSlowT-dt);
    if(this.stunTimer>0) this.stunTimer-=dt;
    if(this.stunTimer>0 && !this.stunSoundActive){ playHeroSfx('stun'); this.stunSoundActive=true; }
    if(this.stunTimer<=0) this.stunSoundActive=false;
    if(this.tribuInvisibilityTimer>0){
      this.tribuInvisibilityTimer=Math.max(0,this.tribuInvisibilityTimer-dt);
      if(this.tribuInvisibilityTimer<=0) this.invisible=false;
    }
    if(this.slowT>0) this.slowT-=dt;
    if(this.hitFlash>0) this.hitFlash-=dt;
    if(this.silenceTimer>0) this.silenceTimer-=dt;
    if(this.liftTimer>0) this.liftTimer=Math.max(0,this.liftTimer-dt);
    if(this.isAttacking){
      this.attackAnimProgress += dt / Math.max(0.18, Math.min(0.55, this.getAttackTime()*0.45));
      if(this.attackAnimProgress >= 1){ this.attackAnimProgress=0; this.isAttacking=false; }
    }
    if(this.bkbActive>0) this.bkbActive-=dt;
    for(let i=this.buffs.length-1;i>=0;i--){
      this.buffs[i].t-=dt;
      if(this.buffs[i].t<=0) this.buffs.splice(i,1);
    }
  }
  updateMove(dt){
    if(this.knockbackTimer>0){
      this.x += this.knockbackX * dt;
      this.y += this.knockbackY * dt;
      this.knockbackTimer = Math.max(0, this.knockbackTimer-dt);
      this.moving=false;
      return;
    }
    if(this.stunTimer>0){ this.moving=false; return; }
    /* Игрока никогда не должно намертво заклинить в дереве или в узкой щели между
       деревьями (например, после случайного блинка) — если такое случилось,
       аккуратно выталкиваем его наружу прежде, чем считать обычное движение. */
    if(this.isPlayer === true) resolveTreeOverlap(this, dt);
    const preMoveX=this.x, preMoveY=this.y;
    let tx=null,ty=null;
    if(this.attackTarget && this.attackTarget.alive){
      const d=this.distTo(this.attackTarget);
      if(d>this.getAttackRange() + this.attackTarget.radius*0.6){
        tx=this.attackTarget.x; ty=this.attackTarget.y;
      }
    } else if(this.moveTarget){
      const d=Math.hypot(this.moveTarget.x-this.x, this.moveTarget.y-this.y);
      if(d>8){ tx=this.moveTarget.x; ty=this.moveTarget.y; }
      else this.moveTarget=null;
    }
    if(tx!==null){
      const dx=tx-this.x, dy=ty-this.y;
      const d=Math.hypot(dx,dy)||1;
      const sp=this.getSpeed();
      const nextX = this.x + dx/d*sp*dt;
      const nextY = this.y + dy/d*sp*dt;
      if(canMoveTo(nextX, nextY, this.radius, this.isPlayer !== true)){
        this.x = nextX; this.y = nextY;
      } else {
        /* Пробуем скользнуть мимо препятствия под несколькими углами (не только
           строго вбок), чтобы герой увереннее огибал деревья и не залипал у кромки. */
        const baseAngle = Math.atan2(dy,dx);
        const step = sp*dt;
        const ignoreTrees = this.isPlayer !== true;
        let sideStep = null;
        for(const offset of [0.5,-0.5,0.9,-0.9,1.3,-1.3]){
          const a = baseAngle + offset;
          const candidate = {x:this.x+Math.cos(a)*step, y:this.y+Math.sin(a)*step};
          if(canMoveTo(candidate.x, candidate.y, this.radius, ignoreTrees)){ sideStep = candidate; break; }
        }
        if(sideStep){ this.x = sideStep.x; this.y = sideStep.y; }
        else this.moveTarget = null;
      }
      this.facing = Math.atan2(dy,dx);
    }
    this.x = clamp(this.x, 40, WORLD-40);
    this.y = clamp(this.y, 40, WORLD-40);
    const movedDist = Math.hypot(this.x-preMoveX, this.y-preMoveY);
    this.moving = movedDist > 0.02;
    if(this.moving && this.type !== 'tower' && this.type !== 'barracks' && this.type !== 'ancient'){
      const strideSpeed = Math.max(28, this.getSpeed());
      this.walkPhase += (movedDist/dt) / (strideSpeed*0.62) * dt;
      this.footstepTimer -= dt;
      if(this.footstepTimer <= 0){
        this.footstepTimer = clamp(46/(strideSpeed*0.62), 0.14, 0.42);
        const footAngle = this.facing + Math.PI/2 * (Math.sin(this.walkPhase*Math.PI*2) > 0 ? 1 : -1);
        const fx = this.x + Math.cos(footAngle)*this.radius*0.42 - Math.cos(this.facing)*this.radius*0.3;
        const fy = this.y + Math.sin(footAngle)*this.radius*0.42 - Math.sin(this.facing)*this.radius*0.3 + this.radius*0.55;
        spawnFootstepDust(fx, fy, this.footstepColor || 'rgba(196,182,140,0.55)');
        spawnGrassBend(fx, fy, this.facing);
      }
    } else {
      this.footstepTimer = 0;
    }
  }
  updateCombat(dt){
    const t=this.attackTarget;
    if(!t||t.dead){ this.attackTarget=null; return; }
    if(this.stunTimer>0) return;
    if((this.type==='tower' || this.type==='creep') && hasTreeCover(this,t)) return;
    const d=Math.hypot(t.x-this.x, t.y-this.y);
    if(d <= this.getAttackRange() + t.radius){
      if(this.atkCd<=0){
        this.atkCd = this.getAttackTime() * (this.attackSlowT > 0 ? 1 + (this.attackSlow || 0.35) : 1);
        this.facing = Math.atan2(t.y-this.y, t.x-this.x);
        this.attackAngle = this.facing; this.attackAnimProgress = 0; this.isAttacking = true;
        if(this.invisible){ this.invisible=false; this.tribuInvisibilityTimer=0; }
        if(this.type === 'hero') playHeroSfx('attack_' + (this.def.id || 'default'));
        if(this.def && this.def.id === 'tribupainer' && this.getAttackRange()>220){
          const incendiary=!!(this.tribuIncendiaryTimer>0 || (this.buffs && this.buffs.some(buff=>buff.type==='tribuShardShot')));
          const bullets=hasScepter(this) ? 4 : 3;
          for(let pellet=0;pellet<bullets;pellet++){
            const spread=(pellet-(bullets-1)/2)*0.075;
            const projectile=spawnProjectile(this.x,this.y,t,30,{team:this.team,source:this,attack:true,incendiary},1100,'#ffb36b',8);
            projectile.spread=spread;
            projectile.incendiary=incendiary;
          }
          fxRing(this.x + Math.cos(this.facing)*62, this.y + Math.sin(this.facing)*62, 28, '#ffd08a', 0.18);
          spawnParticles(this.x + Math.cos(this.facing)*58, this.y + Math.sin(this.facing)*58, '#ffb36b', 12, 0.7);
          return;
        }
        if(this.getAttackRange()>220){
          const shotSource={team:this.team, source:this, attack:true};
          let shotDamage=this.getDamage();
          if(this.def && this.def.id === 'sniper' && this.skills && this.skills[1] && this.skills[1].level > 0){
            const headshotLevel=this.skills[1].level;
            if(Math.random() < Math.min(0.55, 0.20 + headshotLevel * 0.075)){
              shotDamage += 42 + headshotLevel * 28;
              shotSource.headshot = true;
              shotSource.headshotSlow = 0.24 + headshotLevel * 0.045;
              shotSource.headshotAttackSlow = 0.28 + headshotLevel * 0.055;
              shotSource.headshotSlowDuration = 0.8 + headshotLevel * 0.1;
              addText(t.x,t.y-t.radius-18,'HEADSHOT','#ffe6a3',0.65,13);
            }
          }
          const shotColor = this.def && this.def.id === 'arcady' ? '#ff6b35' :
            (this.def && this.def.id === 'sniper' ? '#ffe0a0' :
            (this.team===0 ? '#a8ffb0' : '#ffb0a8'));
          const projectile=spawnProjectile(this.x, this.y, t, shotDamage, shotSource, 1100,
            shotColor, this.def && this.def.id === 'sniper' ? 8 : (this.def && this.def.id === 'arcady' ? 10 : 7));
          projectile.headshot=!!shotSource.headshot;
          projectile.headshotSlow=shotSource.headshotSlow || 0;
          projectile.headshotAttackSlow=shotSource.headshotAttackSlow || 0;
          projectile.headshotSlowDuration=shotSource.headshotSlowDuration || 0;
        } else {
          const unleash = this.buffs && this.buffs.find(buff => buff.type === 'reginaUnleash');
          if(unleash && this.def && this.def.id === 'regina'){
            unleash.strikes = (unleash.strikes || 0) + 1;
            unleash.charges = Math.max(0, (unleash.charges === undefined ? 1 : unleash.charges) - 1);
            const finisher = unleash.charges === 0;
            t.slow = Math.max(t.slow || 0, 0.35);
            t.slowT = Math.max(t.slowT || 0, 2);
            t.attackSlow = 0.35;
            t.attackSlowT = Math.max(t.attackSlowT || 0, 2);
            applyDamage(t, this.getDamage() * (unleash.damageMultiplier || 1.15), {team: this.team, source: this, attack: true});
            if(finisher){
              const pulseRadius = unleash.pulseRadius || 150;
              for(const unit of units){
                if(unit.dead || unit.team === this.team || unit.team === 2 || isBuilding(unit)) continue;
                if(Math.hypot(unit.x-t.x, unit.y-t.y) <= pulseRadius + unit.radius){
                  applyDamage(unit, unleash.pulseDamage || 95, {team:this.team, source:this});
                  unit.slow = Math.max(unit.slow || 0, unleash.pulseSlow || 0.58);
                  unit.slowT = Math.max(unit.slowT || 0, unleash.pulseSlowDuration || 2.8);
                  unit.attackSlow = 0.5;
                  unit.attackSlowT = Math.max(unit.attackSlowT || 0, 2.8);
                }
              }
              fxRing(t.x,t.y,pulseRadius,'#ff6688',0.75);
              fxRing(t.x,t.y,pulseRadius*0.62,'#ffd1de',0.4);
              spawnRadialBlades(t.x,t.y,pulseRadius*1.08,'#ff8eb0',28);
              spawnParticles(t.x,t.y,'#ffd1de',34,1.25);
              addText(t.x,t.y-pulseRadius-24,'ФИНИШНАЯ ВОЛНА','#ffd1de',1.15,17);
              this.buffs = this.buffs.filter(buff => buff !== unleash && buff.id !== 'reginaRageSpeed');
            }
          } else {
            let attackDamage=this.getDamage();
            if(this.def && this.def.id === 'juggernaut' && this.skills && this.skills[2] &&
               this.skills[2].level > 0){
              const bladeDanceLevel=this.skills[2].level;
               const critChance=[0,0.20,0.30,0.40,0.50][bladeDanceLevel] || 0;
               if(Math.random() < critChance){
                 attackDamage *= [0,1.7,1.9,2.1,2.3][bladeDanceLevel] || 1.7;
                addText(t.x,t.y-t.radius-18,'КРИТ!','#fff0a8',0.7,14);
                fxRing(t.x,t.y,30,'#ffe066',0.22);
              }
            }
            if(this.def && this.def.id === 'earthshaker'){
              const totemBuff = this.buffs.find(buff => buff.type === 'enchantTotem');
              if(totemBuff){
                attackDamage += totemBuff.val;
                t.stunTimer = Math.max(t.stunTimer, totemBuff.stun || 0);
                addText(t.x,t.y-t.radius-18,'ENCHANT TOTEM','#8bd4ff',0.75,14);
                fxRing(t.x,t.y,34,'#8bd4ff',0.3);
                this.buffs = this.buffs.filter(buff => buff !== totemBuff);
              }
            }
            applyDamage(t, attackDamage, {team: this.team, source: this, attack: true});
          }
          if(this.def && this.def.id === 'electricGosha') applyElectricOverload(this, t);
          if(this.owner && this.owner.def && this.owner.def.id === 'illusionist' && this.owner.isPlayer && Math.random() < 0.15) spawnPassiveIllusion(this.owner, t);
          fxHit(t.x, t.y, '#ffdd88');
        }
      }
    }
  }
  update(dt){
    this.tickTimers(dt);
    const burning=this.buffs.find(buff=>buff.type==='burning');
    if(burning){
      burning.tick=(burning.tick||0)+dt;
      if(burning.tick>=1){ burning.tick-=1; applyDamage(this,burning.damage||25,burning.source||{team:1-this.team}); }
    }
    const aura = this.buffs.find(buff => buff.type === 'ilyaAura');
    if(aura){
      aura.auraTimer = (aura.auraTimer || 0) + dt;
      if(aura.auraTimer >= 1){
        aura.auraTimer -= 1;
        for(const unit of units){
          if(unit.team===this.team||unit.dead||isStructure(unit)) continue;
          if(Math.hypot(unit.x-this.x,unit.y-this.y)<aura.radius){
            applyDamage(unit,aura.damage + (this.auraDamageBonus || 0),this);
            unit.addBuff({type:'poison',val:aura.damage,t:3});
          }
        }
      }
    }
    if(this.ruptureState && !this.dead){
      const moved = Math.hypot(this.x-this.ruptureState.x,this.y-this.ruptureState.y);
      if(moved > 2) applyDamage(this, moved * this.ruptureState.damagePerDistance * dt, this.ruptureState.source);
      this.ruptureState.x=this.x; this.ruptureState.y=this.y;
      this.ruptureState.t-=dt;
      if(this.ruptureState.t<=0) this.ruptureState=null;
    }
    if(this.arcMotion){
      advanceArcMotion(this, dt);
      return;
    }
    this.updateAI(dt);
    this.updateMove(dt);
    this.updateCombat(dt);
    if(this.hpRegen) this.hp = Math.min(this.maxHp, this.hp + this.hpRegen*dt);
  }
  updateAI(dt){}
}

class Creep extends Unit {
  constructor(team, lane, kind, spawnOff){
    const ranged = kind==='ranged';
    super({
      x:BASES[team].x, y:BASES[team].y, team,
      radius: ranged?14:17, speed: ranged?115:105,
      hp:   ranged ? 110 : 170,
      dmg:  ranged ? 12  : 9,
      atkRange: ranged?420:95, atkTime: ranged?1.15:1.25,
      armor: ranged?0:3, vision:750,
      type:'creep', xpValue: ranged?90:70, hpRegen:2
    });
    this.ranged=ranged; this.lane=lane; this.path=LANES[lane];
    this.dir = team===0?1:-1;
    this.wpIdx = team===0?0:this.path.length-1;
    this.offX=spawnOff.x; this.offY=spawnOff.y;
    this.aggroRange=560;
    this.mega = megaCreeps[team];
    this.footstepColor = 'rgba(140,214,110,0.6)';
    if(this.mega){
      this.maxHp *= 3; this.hp = this.maxHp; this.dmg *= 3; this.armor += 6; this.radius += 4;
    }
    this.x+=this.offX; this.y+=this.offY;
  }
  updateAI(dt){
    if(!this.attackTarget || !this.attackTarget.alive || this.attackTarget.team === 2 ||
       this.distTo(this.attackTarget) > this.aggroRange+150){
      this.attackTarget = this.findTarget();
    }
    if(!this.attackTarget){
      const wp = this.path[this.wpIdx];
      if(wp){
        const tx=wp.x+this.offX*0.6, ty=wp.y+this.offY*0.6;
        if(Math.hypot(tx-this.x, ty-this.y) < 110){
          this.wpIdx += this.dir;
          this.wpIdx = clamp(this.wpIdx,0,this.path.length-1);
        }
        this.moveTarget = {x:tx, y:ty};
      } else {
        this.moveTarget = {x:BASES[1-this.team].x, y:BASES[1-this.team].y};
      }
    } else this.moveTarget=null;
  }
  findTarget(){
    let best=null, bd=this.aggroRange;
    for(const o of units){
      // Лайновые крипы не вмешиваются в нейтральные лагеря.
      if(o.team===this.team||o.team===2||o.dead) continue;
      if(hasTreeCover(this,o)) continue;
      const d = Math.hypot(o.x-this.x, o.y-this.y) - o.radius;
      if(d<bd){ bd=d; best=o; }
    }
    return best;
  }
}

class NeutralCreep extends Unit {
  constructor(x, y, kind){
    const big = kind === 'big';
    const wolf = kind === 'wolf';
    const satyr = kind === 'satyr';
    const stats = big ? {radius:24,speed:72,hp:900,dmg:42,range:110,armor:8,xp:180} :
      wolf ? {radius:16,speed:135,hp:300,dmg:34,range:95,armor:2,xp:120} :
      satyr ? {radius:21,speed:64,hp:650,dmg:28,range:520,armor:5,xp:160} :
      {radius:18,speed:88,hp:420,dmg:20,range:90,armor:3,xp:90};
    super({x, y, team:2, radius:stats.radius, speed:stats.speed, hp:stats.hp, dmg:stats.dmg, atkRange:stats.range, atkTime:wolf?0.9:1.5, armor:stats.armor, vision:520, type:'neutral', xpValue:stats.xp, hpRegen:2});
    this.homeX=x; this.homeY=y; this.aggroRange=420; this.kind=kind; this.respawnTimer=0;
  }
  updateAI(){
    if(this.attackTarget && (!this.attackTarget.alive || this.distTo(this.attackTarget) > this.aggroRange + 180)) this.attackTarget = null;
    if(!this.attackTarget){
      let best=null, bestDistance=this.aggroRange;
      for(const unit of heroes){
        if(unit.dead) continue;
        const distance=this.distTo(unit);
        if(distance<bestDistance){ bestDistance=distance; best=unit; }
      }
      this.attackTarget=best;
    }
    if(this.attackTarget) this.moveTarget=null;
    else if(this.distTo({x:this.homeX,y:this.homeY})>40) this.moveTarget={x:this.homeX,y:this.homeY};
  }
}

const NEUTRAL_CAMPS = [
  [{x:1100,y:1100},{x:1170,y:1170},{x:1030,y:1170},{x:1100,y:1240}],
  [{x:2500,y:2500},{x:2570,y:2570},{x:2430,y:2570},{x:2500,y:2640}],
  [{x:900,y:1500},{x:970,y:1570},{x:830,y:1570},{x:900,y:1640}],
  [{x:2700,y:2100},{x:2770,y:2170},{x:2630,y:2170},{x:2700,y:2240}],
  [{x:1200,y:1700},{x:1270,y:1770},{x:1130,y:1770},{x:1200,y:1840}],
  [{x:2400,y:1900},{x:2470,y:1970},{x:2330,y:1970},{x:2400,y:2040}]
];

const DECORATIVE_HOUSES = [
  {x:820,y:2380,s:1.0,roof:'#8e4d3e',wall:'#c28b58'},
  {x:1080,y:760,s:0.82,roof:'#456b72',wall:'#b7a16a'},
  {x:1580,y:560,s:0.9,roof:'#7b4f75',wall:'#c79568'},
  {x:2380,y:860,s:0.95,roof:'#6c5c39',wall:'#c7a765'},
  {x:2860,y:1740,s:1.1,roof:'#754a39',wall:'#b57e51'},
  {x:2960,y:2520,s:0.88,roof:'#3e6470',wall:'#b99463'},
  {x:2220,y:2980,s:1.0,roof:'#765b35',wall:'#c89b60'},
  {x:1420,y:2980,s:0.78,roof:'#684c78',wall:'#b68d69'}
];

const MAP_SCALE = 1.42;
let mapScaled = false;
function mapPoint(x, y){
  return {x:(x-1800)*MAP_SCALE + WORLD/2, y:(y-1800)*MAP_SCALE + WORLD/2};
}
function snapToLane(laneIndex, x, y){
  const path = LANES[laneIndex] || [];
  let best = {x, y, distance: Infinity};
  for(let i=1;i<path.length;i++){
    const a = path[i-1], b = path[i];
    const dx = b.x-a.x, dy = b.y-a.y;
    const t = clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
    const px = a.x + dx*t, py = a.y + dy*t;
    const distance = Math.hypot(x-px, y-py);
    if(distance < best.distance) best = {x:px, y:py, distance};
  }
  return {x:best.x, y:best.y};
}
function scaleMapData(){
  if(mapScaled) return;
  mapScaled = true;
  for(const base of BASES){ const p=mapPoint(base.x,base.y); base.x=p.x; base.y=p.y; }
  for(const lane of LANES) for(const point of lane){ const p=mapPoint(point.x,point.y); point.x=p.x; point.y=p.y; }
  for(const tower of TOWER_SPOTS){
    const p=mapPoint(tower.x,tower.y);
    const lanePoint=snapToLane(tower.lane,p.x,p.y);
    tower.x=lanePoint.x; tower.y=lanePoint.y;
  }
  for(const camp of NEUTRAL_CAMPS) for(const point of camp){ const p=mapPoint(point.x,point.y); point.x=p.x; point.y=p.y; }
}

function spawnNeutralCamps(){
  for(let campIndex=0;campIndex<NEUTRAL_CAMPS.length;campIndex++){
    const camp = NEUTRAL_CAMPS[campIndex];
    const center = camp[0];
    const farFromBases = BASES.every(base => Math.hypot(center.x-base.x, center.y-base.y) > 700);
    const farFromLanes = LANES.every(lane => {
      for(let i=1;i<lane.length;i++){
        if(pointSegmentDistance(center.x,center.y,lane[i-1].x,lane[i-1].y,lane[i].x,lane[i].y) < 360) return false;
      }
      return true;
    });
    if(!farFromBases || !farFromLanes) continue;
    for(let i=0;i<camp.length;i++){
      const kind = i === 0 ? 'big' : (i === 1 ? 'small' : (i === 2 ? 'wolf' : 'satyr'));
      const neutral = new NeutralCreep(camp[i].x, camp[i].y, kind);
      neutral.campIndex = campIndex;
      units.push(neutral);
    }
  }
}

function pointSegmentDistance(px, py, ax, ay, bx, by){
  const dx=bx-ax, dy=by-ay;
  const t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);
  return Math.hypot(px-(ax+dx*t), py-(ay+dy*t));
}

function canMoveTo(x, y, radius, ignoreTrees=false){
  if(ignoreTrees) return true;
  for(const tree of trees) if(Math.hypot(tree.x-x, tree.y-y) < tree.radius + radius + 4) return false;
  for(const wall of walls){
    if(!wall.blocking) continue;
    const ux=Math.cos(wall.angle), uy=Math.sin(wall.angle);
    const dx=x-wall.x, dy=y-wall.y;
    const along=dx*ux+dy*uy, across=Math.abs(dx*uy-dy*ux);
    if(Math.abs(along)<wall.length/2 && across<wall.width/2+radius) return false;
  }
  return true;
}

/* Если герой всё же оказался внутри дерева или в слишком тесном кармане между
   несколькими стволами (например, случайный блинк впритык к лесу), эта функция
   каждый кадр мягко выталкивает его прочь — суммой векторов "от каждого дерева",
   так что застрять навсегда уже не получится, даже в самой тесной щели. */
function resolveTreeOverlap(unit, dt){
  let pushX=0, pushY=0, overlapped=false;
  for(const tree of trees){
    const dx=unit.x-tree.x, dy=unit.y-tree.y;
    const dist=Math.hypot(dx,dy);
    const minDist=tree.radius+unit.radius+4;
    if(dist<minDist){
      overlapped=true;
      const depth=minDist-dist;
      if(dist>0.001){ pushX+=(dx/dist)*depth; pushY+=(dy/dist)*depth; }
      else { pushX+=(Math.random()-0.5)*depth; pushY+=(Math.random()-0.5)*depth; }
    }
  }
  if(!overlapped) return false;
  const speed = Math.max(220, unit.getSpeed ? unit.getSpeed()*1.4 : 220);
  const mag = Math.hypot(pushX,pushY) || 1;
  const step = Math.min(mag, speed*dt);
  unit.x += (pushX/mag)*step;
  unit.y += (pushY/mag)*step;
  unit.x = clamp(unit.x, 40, WORLD-40);
  unit.y = clamp(unit.y, 40, WORLD-40);
  return true;
}

function hasTreeCover(attacker, target){
  if(!attacker || !target) return false;
  for(const tree of trees){
    if(pointSegmentDistance(tree.x,tree.y,attacker.x,attacker.y,target.x,target.y) < tree.radius + 8) return true;
  }
  return false;
}

class TimedSummon extends Unit {
  constructor(owner, x, y, options){
    super({x,y,team:owner.team,radius:options.radius||20,speed:options.speed||110,hp:options.hp||320,dmg:options.dmg||35,atkRange:options.atkRange||420,atkTime:options.atkTime||1.1,armor:options.armor||2,vision:700,type:'summon',xpValue:0});
    this.owner = owner; this.life = options.life || 7; this.summonKind = options.kind || 'copy';
    this.copyColor = options.copyColor || null;
    this.copyDef = options.copyDef || null;
    this.owner = owner;
    this.isIllusion = !!options.isIllusion;
    this.damageMultiplier = options.damageMultiplier || 1;
    this.damageTakenMultiplier = options.damageTakenMultiplier || 1;
  }
  updateAI(dt){
    this.life -= dt;
    if(this.life <= 0){ this.dead = true; return; }
    if(!this.attackTarget || this.attackTarget.dead || this.distTo(this.attackTarget) > 850){
      let target=null, best=850;
      for(const unit of units){
        if(unit.dead || unit.team===this.team || unit.team===2) continue;
        const distance=this.distTo(unit);
        if(distance<best){ best=distance; target=unit; }
      }
      this.attackTarget=target;
    }
    if(!this.attackTarget) this.moveTarget={x:this.owner.x,y:this.owner.y};
    else this.moveTarget=null;
  }
}

function getControlledUnit(){
  return controlledUnit && controlledUnit.alive ? controlledUnit : playerHero;
}

function mo3giDroneOf(hero){
  return units.find(unit => unit.isMo3giDrone && unit.owner === hero && !unit.dead) || null;
}

function explodeMo3giDrone(drone){
  if(!drone || drone.dead) return;
  const hero = drone.owner;
  drone.dead = true;
  if(controlledUnit === drone) controlledUnit = hero;
  const level = drone.droneLevel || 1;
  const radius = 142 + level * 18;
  const damage = 250 + level * 90;
  fxRing(drone.x, drone.y, radius * 0.58, '#ffffff', 0.22);
  fxRing(drone.x, drone.y, radius, '#65ff9a', 0.8);
  spawnParticles(drone.x, drone.y, '#b9ffd0', 44 + level * 8, 1.5 + level * 0.08);
  addText(drone.x, drone.y - 70, 'ДРОН ВЗОРВАЛСЯ  •  УР. ' + level, '#8dffad', 1.25, 17);
  for(const unit of units){
    if(unit.dead || unit.team === drone.team || unit.team === 2) continue;
    if(Math.hypot(unit.x-drone.x, unit.y-drone.y) <= radius + unit.radius)
      applyDamage(unit, abilityDamage(hero, damage), {team:drone.team, source:hero, attack:true});
  }
}

function spawnMo3giDrone(hero, level, aghanim=false){
  const old = mo3giDroneOf(hero);
  if(old){
    if(aghanim){
      const orbitAngle = Math.atan2(old.y - hero.y, old.x - hero.x) || 0;
      const spawnX = hero.x + Math.cos(orbitAngle + Math.PI/2) * 140;
      const spawnY = hero.y + Math.sin(orbitAngle + Math.PI/2) * 140;
      old.x = clamp(spawnX, 60, WORLD-60);
      old.y = clamp(spawnY, 60, WORLD-60);
      old.moveTarget = {x:old.x + rnd(-30,30), y:old.y + rnd(-30,30)};
      old.attackTarget = null;
      fxRing(old.x,old.y,110,'#78ffad',0.7);
      addText(old.x,old.y-72,'ДРОН РЯДОМ С МО3ГИ','#9dffc0',1.2,16);
    }
    return old;
  }
  const orbitAngle = Math.random() * Math.PI * 2;
  const spawnX = hero.x + Math.cos(orbitAngle) * 150;
  const spawnY = hero.y + Math.sin(orbitAngle) * 150;
  const drone = new TimedSummon(hero, spawnX, spawnY, {
    kind:'mo3giDrone', life:15 + (level-1)*3 + (hero.mo3giDroneLife || 0),
    hp:260 + level*80, dmg:300, radius:22, speed:410,
    atkRange:620, atkTime:0.72, armor:4, copyColor:'#55ef9b'
  });
  drone.isMo3giDrone=true; drone.droneLevel=level; drone.vision=900; drone.dronePulse=0; drone.invulnerable=true;
  drone.ramTarget = null;
  drone.updateAI=function(dt){
    this.life-=dt; this.dronePulse+=dt;
    if(this.life<=0){ explodeMo3giDrone(this); return; }
    const impact = units.find(unit =>
      !unit.dead &&
      unit.team !== this.team &&
      unit.team !== 2 &&
      Math.hypot(unit.x-this.x, unit.y-this.y) <= this.radius + unit.radius + 6
    );
    if(impact){ explodeMo3giDrone(this); return; }
    if(controlledUnit === this){
      this.attackTarget = null;
      if(this.ramTarget && !this.ramTarget.dead){
        this.moveTarget = {x:this.ramTarget.x, y:this.ramTarget.y};
      }
      return;
    }
    const orbitRadius = 150 + (this.droneLevel * 18);
    const orbitX = hero.x + Math.cos(this.dronePulse * 0.9 + this.droneLevel) * orbitRadius;
    const orbitY = hero.y + Math.sin(this.dronePulse * 0.9 + this.droneLevel) * orbitRadius;
    this.moveTarget = {x:clamp(orbitX,60,WORLD-60), y:clamp(orbitY,60,WORLD-60)};
    this.attackTarget = null;
  };
  drone.updateCombat=function(){
    this.attackTarget = null;
  };
  units.push(drone);
  fxRing(drone.x,drone.y,82,'#65ff9a',0.65);
  spawnParticles(drone.x,drone.y,'#b9ffd0',28,1.1);
  addText(drone.x,drone.y-62,aghanim?'ДЕСАНТНЫЙ ДРОН':'БОЕВОЙ ДРОН','#8dffad',1.25,17);
  return drone;
}

function toggleMo3giDroneControl(hero,drone){
  if(!drone||drone.dead) return false;
  if(controlledUnit === drone){
    controlledUnit = hero;
    drone.ramTarget = null;
    drone.attackTarget = null;
    drone.moveTarget = {x:hero.x + rnd(-50,50), y:hero.y + rnd(-50,50)};
    addText(hero.x,hero.y-62,'МО3ГИ ВЕРНУЛ УПРАВЛЕНИЕ','#aaffbf',1.1,15);
  } else {
    controlledUnit = drone;
    hero.attackTarget = null;
    hero.moveTarget = null;
    drone.ramTarget = null;
    drone.attackTarget = null;
    drone.moveTarget = {x:hero.x + rnd(-50,50), y:hero.y + rnd(-50,50)};
    addText(drone.x,drone.y-62,'УПРАВЛЕНИЕ ДРОНОМ','#aaffbf',1.1,15);
  }
  return true;
}

function explodeMo3giMine(mine){
  if(!mine||mine.dead) return;
  mine.dead=true; const hero=mine.owner;
  const radius=125+mine.level*12, damage=220+mine.level*65;
  fxRing(mine.x,mine.y,radius,'#a5ff62',0.7); spawnParticles(mine.x,mine.y,'#d7ff9b',32,1.2);
  for(const unit of units){
    if(unit.dead||unit.team===mine.team||unit.team===2||isBuilding(unit)) continue;
    if(Math.hypot(unit.x-mine.x,unit.y-mine.y)<=radius+unit.radius)
      applyDamage(unit,abilityDamage(hero,damage),hero);
  }
}

function updateMo3giMines(dt){
  for(const mine of mo3giMines){
    mine.life-=dt;
    const triggered=units.some(unit=>!unit.dead&&unit.team!==mine.team&&unit.team!==2&&!isBuilding(unit)&&
      Math.hypot(unit.x-mine.x,unit.y-mine.y)<42+unit.radius);
    if(triggered||mine.life<=0) explodeMo3giMine(mine);
  }
  mo3giMines=mo3giMines.filter(mine=>!mine.dead);
  for(const hero of heroes){
    if(hero.def&&hero.def.id==='mo3gi'&&hero.mineLock&&!mo3giMines.some(mine=>mine.owner===hero))
      hero.mineLock=false;
  }
}

function spawnGollyGolems(hero){
  const spawned=[];
  for(let i=0;i<4;i++){
    const angle = i * Math.PI/2;
    const x=clamp(hero.x + Math.cos(angle)*70,60,WORLD-60);
    const y=clamp(hero.y + Math.sin(angle)*70,60,WORLD-60);
    const golem=new TimedSummon(hero, x, y, {
      kind:'iceGolem', life:10, hp:900, dmg:115, radius:25, speed:150, atkRange:170, atkTime:0.8, armor:10, copyColor:'#8eeaff'
    });
    golem.moveTarget={x:hero.x,y:hero.y};
    units.push(golem); spawned.push(golem);
  }
  fxRing(hero.x,hero.y,120,'#b9efff',0.8);
  addText(hero.x, hero.y-80, 'ЛЕДЯНЫЕ ГОЛЕМЫ x' + spawned.length, '#b9efff', 1.4, 18);
}

function spawnSteelCopies(hero){
  for(let i=0;i<3;i++){
    const angle = i * Math.PI*2/3;
    units.push(new TimedSummon(hero, hero.x + Math.cos(angle)*55, hero.y + Math.sin(angle)*55, {
      kind:'steelCopy', life:7, hp:hero.maxHp, dmg:hero.getDamage(), radius:hero.radius, speed:hero.getSpeed(), atkRange:hero.atkRange, atkTime:hero.getAttackTime(), armor:hero.getArmor(), copyColor:hero.def.color, copyDef:hero.def
    }));
  }
  addText(hero.x, hero.y-80, 'КОПИИ СТАЛИ', '#d9e6f5', 1.4, 18);
}

function spawnIllusion(hero, options={}){
  const angle = options.angle === undefined ? Math.random()*Math.PI*2 : options.angle;
  const life = (options.life || 12) + (hero.illusionLifeBonus || 0);
  const illusion = new TimedSummon(hero, clamp(hero.x+Math.cos(angle)*55,60,WORLD-60), clamp(hero.y+Math.sin(angle)*55,60,WORLD-60), {
    kind:'illusion', life, hp:hero.maxHp, dmg:hero.getDamage(), radius:hero.radius, speed:hero.getSpeed(), atkRange:hero.atkRange,
    atkTime:hero.getAttackTime(), armor:hero.getArmor(), copyColor:hero.def.color, copyDef:hero.def,
    isIllusion:true, damageMultiplier:(options.damageMultiplier || 0.3) + (hero.illusionDamageBonus || 0), damageTakenMultiplier:options.damageTakenMultiplier || 2
  });
  const target = units.find(unit => !unit.dead && unit.team !== hero.team && unit.team !== 2);
  if(target) illusion.attackTarget = target;
  units.push(illusion);
  return illusion;
}

function spawnPassiveIllusion(hero, target){
  const active = units.filter(unit => unit.isIllusion && unit.illusionKind === 'passive' && unit.owner === hero && !unit.dead);
  if(active.length >= 3 || !target || target.dead) return;
  const illusion = spawnIllusion(hero, {life:4, damageMultiplier:0.15, damageTakenMultiplier:3, angle:Math.atan2(target.y-hero.y,target.x-hero.x)});
  illusion.illusionKind = 'passive';
  illusion.x = target.x; illusion.y = target.y;
  illusion.attackTarget = target;
}

class Tower extends Unit {
  constructor(team, x, y, base, lane=null, tier=1){
    super({
      x, y, team,
      radius: base?46:(tier===1?19:22), speed:0,
      hp: base?14400:6000,
      dmg: base?220:82,
      atkRange: base?850:(tier===1?560:680),
      atkTime: base?0.8:1.05,
      armor: base?17:17,
      vision: base?1200:1050,
      type: base?'ancient':'tower',
      xpValue: base?0:320
    });
    this.isBase=!!base;
    this.lane=lane;
    this.tier=base?0:tier;
  }
  update(dt){
    this.tickTimers(dt);
    if(!this.attackTarget || !this.attackTarget.alive || this.attackTarget.team === 2 ||
       this.attackTarget.team === this.team || this.distTo(this.attackTarget) > this.atkRange){
      this.attackTarget = this.findTarget();
    }
    this.updateCombat(dt);
  }
  findTarget(){
    let best=null, bd=this.atkRange;
    for(const o of units){
      // Вышки атакуют только участников матча, но не нейтральных крипов.
      if(o.team===this.team||o.team===2||o.dead||o.type==='tower'||o.type==='ancient') continue;
      if(hasTreeCover(this,o)) continue;
      const d = Math.hypot(o.x-this.x, o.y-this.y);
      if(d<bd){
        if(best && best.type!=='creep' && o.type==='creep'){ bd=d; best=o; continue; }
        if(best && best.type==='creep' && o.type!=='creep') continue;
        bd=d; best=o;
      }
    }
    return best;
  }
}

class Barracks extends Unit {
  constructor(team, lane, x, y){
    super({x,y,team,radius:34,speed:0,hp:2800,dmg:0,atkRange:0,armor:14,vision:850,type:'barracks',xpValue:260});
    this.lane = lane;
    this.spawnTimer = 5 + lane*2;
  }
  update(dt){
    this.tickTimers(dt);
    if(this.dead) return;
    this.spawnTimer -= dt;
    if(this.spawnTimer <= 0){
      this.spawnTimer = 14;
      const off = {x:rnd(-30,30), y:rnd(-30,30)};
      const melee = new Creep(this.team, this.lane, 'melee', off);
      const ranged = new Creep(this.team, this.lane, 'ranged', {x:off.x+16,y:off.y+16});
      melee.x = this.x + off.x; melee.y = this.y + off.y;
      ranged.x = this.x + off.x + 16; ranged.y = this.y + off.y + 16;
      units.push(melee, ranged);
    }
  }
}

function createMapTrees(){
  trees = [];
  const barracks = [
    ...barracksSpots(0),
    ...barracksSpots(1)
  ];
  const canPlaceTree = (treeX, treeY, laneClearance=150) => {
    if(pointSegmentDistance(treeX,treeY,200,200,3400,3400) < 185) return false;
    if(barracks.some(spot => Math.hypot(spot.x-treeX, spot.y-treeY) < 210)) return false;
    for(const lane of LANES) for(let i=1;i<lane.length;i++){
      if(pointSegmentDistance(treeX,treeY,lane[i-1].x,lane[i-1].y,lane[i].x,lane[i].y)<laneClearance) return false;
    }
    return true;
  };
  const spots = [
    [760,2680],[980,2500],[1180,2200],[1460,2380],[1760,2740],[2080,2360],[2320,2020],
    [2600,1740],[2820,1460],[3060,1080],[620,2240],[420,1980],[340,1420],[820,1080],
    [1120,720],[1480,520],[2040,620],[2440,820],[2860,620],[3260,980],[3260,2460],
    [2920,2860],[2500,3180],[2040,3020],[1480,3260],[1040,3040]
  ];
  for(const [rawX,rawY] of spots){
    const {x,y}=mapPoint(rawX,rawY);
    const addTree = (treeX, treeY) => {
      if(canPlaceTree(treeX, treeY)) trees.push({x:treeX,y:treeY,radius:24,kind:['pine','broadleaf','crystal','birch','autumn'][Math.floor(Math.random()*5)]});
    };
    addTree(x,y); addTree(x+72,y-48); addTree(x-54,y+62);
  }
  for(let x=140; x<WORLD-140; x+=105){
    for(let y=140; y<WORLD-140; y+=130){
      if((x+y)%420 !== 0) continue;
      const nearBase = BASES.some(base => Math.hypot(base.x-x, base.y-y) < 520);
      if(!nearBase) {
        const treeX = x + ((x*y)%70) - 35;
        const treeY = y + ((x+y)%70) - 35;
        if(canPlaceTree(treeX, treeY)) trees.push({x:treeX,y:treeY,radius:24,kind:['pine','broadleaf','crystal','birch','autumn'][Math.floor(Math.random()*5)]});
      }
    }
  }
  for(let rawX=520; rawX<=3300; rawX+=360){
    for(let rawY=520; rawY<=3300; rawY+=360){
      const center=mapPoint(rawX,rawY);
      const nearBase=BASES.some(base=>Math.hypot(base.x-center.x,base.y-center.y)<500);
      const nearLane=LANES.some(lane=>lane.some(point=>Math.hypot(point.x-center.x,point.y-center.y)<210));
      if(nearBase || nearLane) continue;
      for(let i=0;i<6;i++){
        const angle=i*Math.PI*2/5;
        const treeX=center.x+Math.cos(angle)*85;
        const treeY=center.y+Math.sin(angle)*70;
        if(canPlaceTree(treeX, treeY, 95)) trees.push({x:treeX,y:treeY,radius:24,kind:['pine','broadleaf','crystal','birch','autumn'][Math.floor(Math.random()*5)]});
      }
    }
  }
  for(const camp of NEUTRAL_CAMPS){
    const center=camp[0];
    /* Раньше тут было плотное кольцо из 8 деревьев (шаг 45°) — зазор между соседними
       стволами был у́же радиуса героя, и, если блинкнуть внутрь, выбраться назад
       было физически невозможно. Теперь деревьев меньше и кольцо шире, так что
       между любыми двумя соседними стволами всегда остаётся проходимый зазор. */
    const RING_TREES = 5;
    const RING_RADIUS = 158;
    for(let i=0;i<RING_TREES;i++){
      const angle=i*(Math.PI*2/RING_TREES) + campIndexOf(camp)*0.35;
      const treeX=center.x+Math.cos(angle)*RING_RADIUS;
      const treeY=center.y+Math.sin(angle)*RING_RADIUS;
      const nearBase=BASES.some(base=>Math.hypot(base.x-treeX,base.y-treeY)<650);
      if(!nearBase && canPlaceTree(treeX, treeY, 120)) trees.push({x:treeX,y:treeY,radius:24,kind:['pine','broadleaf','crystal','birch','autumn'][Math.floor(Math.random()*5)]});
    }
  }
}
function campIndexOf(camp){
  const idx = NEUTRAL_CAMPS.indexOf(camp);
  return idx<0 ? 0 : idx;
}

const RUNE_TYPES = [
  {type:'doubleDamage', name:'ДВОЙНОЙ УРОН', color:'#ff5252', duration:25},
  {type:'haste', name:'УСКОРЕНИЕ', color:'#ffe066', duration:25},
  {type:'regen', name:'РЕГЕНЕРАЦИЯ', color:'#72e6a5', duration:25}
];
const RUNE_SPOTS = [{x:2140,y:1770},{x:2160,y:2530}];

function spawnRunes(){
  for(const spot of RUNE_SPOTS){
    const point=mapPoint(spot.x,spot.y);
    if(runes.some(rune=>Math.hypot(rune.x-point.x,rune.y-point.y)<20)) continue;
    const def=RUNE_TYPES[Math.floor(Math.random()*RUNE_TYPES.length)];
    runes.push({x:point.x,y:point.y,...def,pulse:0});
  }
}

function updateRunes(dt){
  for(const rune of runes){
    rune.pulse += dt;
    for(const hero of heroes){
      if(hero.dead || Math.hypot(hero.x-rune.x,hero.y-rune.y)>55) continue;
      hero.addBuff({type:rune.type,t:rune.duration,val:1,name:rune.name});
      if(rune.type==='regen') hero.hp=Math.min(hero.maxHp,hero.hp+hero.maxHp*0.25);
      addText(hero.x,hero.y-65,rune.name,rune.color,1.3,16);
      fxRing(hero.x,hero.y,80,rune.color,0.55);
      runes.splice(runes.indexOf(rune),1);
      break;
    }
  }
}

function barracksSpots(team){
  const spots = team===0
    ? [{x:720,y:2880,lane:0},{x:510,y:2700,lane:1},{x:900,y:3120,lane:2}]
    : [{x:2870,y:730,lane:0},{x:2860,y:498,lane:1},{x:2980,y:620,lane:2}];
  return spots.map(spot => {
    const p=mapPoint(spot.x,spot.y);
    const lanePoint=snapToLane(spot.lane,p.x,p.y);
    return {...lanePoint,lane:spot.lane};
  });
}

/* =========================================================
   ИНВОКЕР-СПЕЛЛЫ (для Гриши)
   ========================================================= */
function getOrbKey(orbs){
  let q=0, w=0, e=0;
  for(const o of orbs){ if(o==='Q') q++; else if(o==='W') w++; else e++; }
  return `${q}${w}${e}`;
}

function pushOrb(h, type){
  if(!h.orbs) h.orbs = ['Q','W','E'];
  h.orbs.shift();
  h.orbs.push(type);
  applyOrbBuffs(h);
  const col = type==='Q' ? '#7feaff' : (type==='W' ? '#c8b3ff' : '#ff9955');
  fxRing(h.x, h.y, 55, col, 0.3);
}

function applyOrbBuffs(h){
  h.buffs = h.buffs.filter(b => !b.isOrb);
  if(!h.orbs) return;
  let q=0, w=0, e=0;
  for(const o of h.orbs){
    if(o==='Q') q++;
    else if(o==='W') w++;
    else e++;
  }
  const qLvl = h.skills[0] ? h.skills[0].level : 0;
  const wLvl = h.skills[1] ? h.skills[1].level : 0;
  const eLvl = h.skills[2] ? h.skills[2].level : 0;

  if(q>0 && qLvl>0){
    h.addBuff({type:'hpregen', val: q*(1.5 + 1.5*qLvl), t:99999, isOrb:true});
  }
  if(w>0 && wLvl>0){
    h.addBuff({type:'spd', val: w*(0.04 + 0.02*wLvl), t:99999, isOrb:true});
    h.addBuff({type:'as',  val: w*(0.05 + 0.05*wLvl), t:99999, isOrb:true});
  }
  if(e>0 && eLvl>0){
    h.addBuff({type:'dmg', val: e*(4 + 3*eLvl), t:99999, isOrb:true});
  }
}

const INVOKE_SPELLS = {
  '300': {
    name:'Холодный удар',
    cast(h,x,y,lvl){
      let tgt=null, bd=250;
      for(const u of units){
        if(u.team===h.team||u.dead) continue;
        const d = Math.hypot(u.x-x, u.y-y);
        if(d < bd){ bd = d; tgt = u; }
      }
      if(tgt){
        applyDamage(tgt, abilityDamage(h,200 + 70*lvl), h);
        tgt.stunTimer = 1.2;
        fxRing(tgt.x, tgt.y, 90, '#7feaff', 0.7);
        addText(tgt.x, tgt.y-55, '❄ СТАН', '#7feaff', 1.3, 18);
      } else {
        flashMsg(h, 'Нет цели рядом');
      }
    }
  },
  '030': {
    name:'ЭМИ',
    cast(h,x,y,lvl){
      const r = 300 + 30*lvl;
      spawnAoE(x,y,r,220 + 100*lvl,h,3,'#a0f0ff',120 + 60*lvl);
      fxMark(x,y,r,'#a0f0ff',3);
    }
  },
  '003': {
    name:'Удар солнца',
    cast(h,x,y,lvl){
      const r = 180;
      spawnAoE(x,y,r, (500 + 320*lvl) * 2, h, 0.9, '#ffcc00');
      fxMark(x,y,r,'#ffcc00',0.9);
    }
  },
  '210': {
    name:'Ледяная стена',
    cast(h,x,y,lvl){
      const a = Math.atan2(y-h.y,x-h.x);
      spawnIceWall(x,y,x+Math.cos(a)*100,y+Math.sin(a)*100,h,lvl);
      fxBeam(x-180*Math.cos(a),y-180*Math.sin(a),x+180*Math.cos(a),y+180*Math.sin(a),'#a0e0ff',0.7);
    }
  },
  '201': {
    name:'Призрачная походка',
    cast(h,x,y,lvl){
      const d = Math.hypot(x-h.x, y-h.y);
      const maxD = 700;
      let tx = x, ty = y;
      if(d > maxD){ const k = maxD/d; tx = h.x + (x-h.x)*k; ty = h.y + (y-h.y)*k; }
      fxRing(h.x,h.y,80,'#c0f0ff',0.35);
      h.x = clamp(tx,60,WORLD-60);
      h.y = clamp(ty,60,WORLD-60);
      h.moveTarget = null;
      h.addBuff({type:'spd', val:0.4, t:4});
      h.hp = Math.min(h.maxHp, h.hp + 150 + 50*lvl);
      fxRing(h.x,h.y,80,'#c0f0ff',0.35);
    }
  },
  '120': {
    name:'Смерч',
    cast(h,x,y,lvl){
      spawnRollingSpell(h.x,h.y,x,y,200+110*lvl,h,'#d0e0ff',30,'tornado');
    }
  },
  '021': {
    name:'Бодрость',
    cast(h,x,y,lvl){
      h.addBuff({type:'dmg', val: abilityDamage(h,70 + 40*lvl), t: 9});
      h.addBuff({type:'as',  val: 0.8 + 0.25*lvl, t: 9});
      fxRing(h.x,h.y,130,'#ffe066',0.7);
      addText(h.x, h.y-60, 'БОДРОСТЬ', '#ffe066', 1.2, 18);
    }
  },
  '102': {
    name:'Хаос-метеор',
    cast(h,x,y,lvl){
      spawnRollingSpell(h.x,h.y,x,y,900+420*lvl,h,'#ff5a00',34,'meteor');
      fxMark(x,y,120,'#ff5a00',0.8);
    }
  },
  '012': {
    name:'Кузнечный дух',
    cast(h,x,y,lvl){
      let tgt=null, bd=600;
      for(const u of units){
        if(u.team===h.team||u.dead) continue;
        const d = Math.hypot(u.x-x, u.y-y);
        if(d < bd){ bd = d; tgt = u; }
      }
      if(tgt){
        applyDamage(tgt, abilityDamage(h,280 + 140*lvl), h);
        fxHit(tgt.x, tgt.y, '#ffcc00');
      }
      h.addBuff({type:'dmg', val: abilityDamage(h,40 + 25*lvl), t: 8});
    }
  },
  '111': {
    name:'Оглушающий взрыв',
    cast(h,x,y,lvl){
      const r = 320;
      spawnAoE(x,y,r, 260 + 130*lvl, h, 0.4, '#ff44ff');
      for(const u of units){
        if(u.team===h.team||u.dead) continue;
        if(Math.hypot(u.x-x,u.y-y) < r){
          u.slow = 0.5; u.slowT = 3;
          u.stunTimer = 0.6;
        }
      }
      fxRing(x,y,r,'#ff44ff',0.6);
    }
  }
};

/* =========================================================
   СКИЛЛЫ
   ========================================================= */
function castShadowCoil(hero, x, y, level, range, damage, speed, blastDistance){
  /*
   * Shadowraze-подобный койл: это не снаряд в выбранную точку.
   * Он всегда взрывается перед Шадоу, даже если врагов рядом нет.
   * Если рядом есть враг, направление автоматически разворачивается к нему.
   */
  const target = getShadowAutoTarget(hero, range);
  let angle = target
    ? Math.atan2(target.y - hero.y, target.x - hero.x)
    : (Number.isFinite(hero.facing) ? hero.facing : 0);
  hero.facing = angle;

  const distance = blastDistance || range * 0.58;
  const centerX = clamp(hero.x + Math.cos(angle) * distance, 60, WORLD - 60);
  const centerY = clamp(hero.y + Math.sin(angle) * distance, 60, WORLD - 60);
  const radius = distance < 350 ? 142 : (distance < 650 ? 158 : 178);
  const finalDamage = abilityDamage(hero, damage);
  const outer = '#ff3b1f';
  const inner = '#ff9a3d';
  const dark = '#8d1118';

  for(const unit of units){
    if(unit.dead || unit.team === hero.team || isBuilding(unit)) continue;
    if(Math.hypot(unit.x-centerX, unit.y-centerY) <= radius + unit.radius){
      applyDamage(unit, finalDamage, hero);
      unit.slow = 0.34;
      unit.slowT = 1.25;
      unit.hitFlash = Math.max(unit.hitFlash || 0, 0.22);
    }
  }

  fxBeam(hero.x, hero.y, centerX, centerY, outer, 0.28);
  fxRing(centerX, centerY, radius, dark, 0.58);
  fxRing(centerX, centerY, radius * 0.68, outer, 0.42);
  fxRing(centerX, centerY, radius * 0.32, inner, 0.28);
  spawnParticles(centerX, centerY, outer, 42, 1.45);
  spawnParticles(centerX, centerY, inner, 24, 0.9);
  spawnRadialBlades(centerX, centerY, radius * 1.12, outer, 30);
  addText(centerX, centerY - radius - 18, 'SHADOWRAZE', inner, 0.85, 14);
}

function getShadowAutoTarget(hero, range){
  const candidates = units.filter(unit => {
    if(unit.dead || unit.team === hero.team || isBuilding(unit)) return false;
    if(hero.isPlayer && !isVisibleToPlayer(unit)) return false;
    return Math.hypot(unit.x-hero.x, unit.y-hero.y) <= range + unit.radius;
  });
  if(!candidates.length) return null;
  if(hero.attackTarget && candidates.includes(hero.attackTarget)) return hero.attackTarget;
  candidates.sort((a,b) => {
    const aScore = Math.hypot(a.x-hero.x,a.y-hero.y) - (a.type === 'hero' ? 320 : 0);
    const bScore = Math.hypot(b.x-hero.x,b.y-hero.y) - (b.type === 'hero' ? 320 : 0);
    return aScore - bScore;
  });
  return candidates[0];
}

function spawnElectricRemnant(hero, x, y){
  const remnant = new TimedSummon(hero, hero.x, hero.y, {
    kind:'electricRemnant', life:12, hp:180, dmg:0, radius:26, speed:0,
    atkRange:0, atkTime:1, armor:0, copyColor:'#7feaff'
  });
  remnant.x = clamp(x,60,WORLD-60);
  remnant.y = clamp(y,60,WORLD-60);
  remnant.remnantPulse = 0;
  remnant.updateAI = function(dt){
    this.life -= dt;
    this.remnantPulse += dt;
    if(this.life <= 0){ this.dead=true; return; }
    for(const unit of units){
      if(unit.dead || unit.team===this.team || unit.team===2) continue;
      if(Math.hypot(unit.x-this.x,unit.y-this.y)<210){
        spawnAoE(this.x,this.y,220,220,this.owner,0,'#65eaff');
        addText(this.x,this.y-48,'РАЗРЫВ','#7feaff',1.0,15);
        this.dead=true;
        break;
      }
    }
  };
  units.push(remnant);
  fxRing(remnant.x,remnant.y,70,'#65eaff',0.45);
  addText(remnant.x,remnant.y-60,'STATIC REMNANT','#7feaff',1.0,15);
}

function applyElectricOverload(hero, target){
  const overload=hero.buffs.find(buff=>buff.type==='electricOverload');
  if(!overload || !target) return;
  hero.buffs=hero.buffs.filter(buff=>buff!==overload);
  fxRing(target.x,target.y,150,'#7feaff',0.55);
  for(const unit of units){
    if(unit.dead || unit.team===hero.team || unit.team===2) continue;
    if(Math.hypot(unit.x-target.x,unit.y-target.y)<150+unit.radius){
      applyDamage(unit,abilityDamage(hero,160),hero);
      unit.slow=0.45; unit.slowT=2.5;
    }
  }
}

function castBallLightning(hero, x, y){
  const requestedDistance=Math.min(1800,Math.hypot(x-hero.x,y-hero.y));
  const initial=25+hero.maxMp*0.075;
  if(hero.mp<initial){ flashMsg(hero,'Мало маны для Ball Lightning'); return; }
  const costPer100=10+hero.maxMp*0.0075;
  const affordableDistance=(hero.mp-initial)/costPer100*100;
  const distance=Math.min(requestedDistance,affordableDistance);
  const cost=initial+distance/100*costPer100;
  hero.mp-=cost;
  const startX=hero.x, startY=hero.y;
  const directionDistance=Math.hypot(x-startX,y-startY)||1;
  const targetX=startX+(x-startX)/directionDistance*distance;
  const targetY=startY+(y-startY)/directionDistance*distance;
  const steps=Math.max(1,Math.ceil(distance/55));
  for(let i=1;i<=steps;i++){
    const px=startX+(targetX-startX)*i/steps, py=startY+(targetY-startY)*i/steps;
    for(const unit of units){
      if(unit.dead||unit.team===hero.team||unit.team===2||isStructure(unit)) continue;
      if(Math.hypot(unit.x-px,unit.y-py)<85) applyDamage(unit,abilityDamage(hero,90),hero);
    }
    if(i%2===0) fxRing(px,py,48,'#7feaff',0.2);
  }
  hero.x=clamp(targetX,60,WORLD-60); hero.y=clamp(targetY,60,WORLD-60); hero.moveTarget=null;
  fxBeam(startX,startY,hero.x,hero.y,'#7feaff',0.4);
}

const SKILLS = {
  mageHunterManaBurn: {name:'Выжигание маны',short:'Q',type:'self',passive:true,maxLevel:4,cd:[0,0,0,0,0],mana:[0,0,0,0,0],desc:'Пассивно сжигает ману врага каждой атакой.',cast(){}},
  mageHunterBlink: {name:'Мерцание',short:'W',type:'point',maxLevel:4,cd:[0,12,10,8,6],mana:[0,60,70,80,90],range:780,desc:'Телепорт с фиолетовым следом. Увеличенная дальность и короткий КД.',cast(h,x,y){const ox=h.x,oy=h.y;h.x=clamp(x,60,WORLD-60);h.y=clamp(y,60,WORLD-60);h.moveTarget=null;fxBeam(ox,oy,h.x,h.y,'#d58cff',0.38);heroBurst(h,'#b65cff',80,30);playHeroSfx('blink');}},
  mageHunterReflect: {name:'Щит отражения',short:'E',type:'self',maxLevel:4,cd:[0,21,18,15,12],mana:[0,90,105,120,135],desc:'Усиленный купол отражает магический урон.',cast(h,x,y,lvl){h.addBuff({type:'mageReflect',val:0.40+lvl*0.06,t:7});heroBurst(h,'#b47cff',120,34);playHeroSfx('shield');}},
  mageHunterUlt: {name:'Пустой резерв',short:'R',type:'point',maxLevel:3,cd:[0,65,54,44],mana:[0,160,210,260],range:900,ult:true,desc:'Сжигает ману цели и наносит больше урона от её пустого резерва.',cast(h,x,y,lvl){const t=pickUnitAt(x,y);if(!t||t.team===h.team||t.dead||t.type!=='hero'){flashMsg(h,'Наведите на вражеского героя');return;}const missing=Math.max(0,t.maxMp-(t.mp||0));t.mp=0;applyDamage(t,missing*(0.34+lvl*0.08),h);fxRing(t.x,t.y,150,'#c56cff',0.8);spawnParticles(t.x,t.y,'#efb0ff',48,1.4);playHeroSfx('mana');}},
  dawnHammer: {name:'Разрушитель звёзд',short:'Q',type:'self',maxLevel:4,cd:[0,12,10,8,6],mana:[0,70,80,90,100],desc:'Размахивает усиленным солнечным молотом и оглушает врагов вокруг.',cast(h,x,y,lvl){const r=195+21*lvl;const damage=(155+82*lvl)*1.18;for(const u of units)if(!u.dead&&u.team!==h.team&&u.team!==2&&!isBuilding(u)&&Math.hypot(u.x-h.x,u.y-h.y)<=r+u.radius){applyDamage(u,damage,h);u.stunTimer=Math.max(u.stunTimer,0.65+lvl*0.13);}fxRing(h.x,h.y,r,'#ffd36b',0.65);spawnRadialBlades(h.x,h.y,r,'#fff0a8',24);playHeroSfx('hammer');}},
  dawnHammerThrow: {name:'Небесный молот',short:'W',type:'point',maxLevel:4,cd:[0,16,14,12,10],mana:[0,85,95,105,115],range:850,desc:'Запускает усиленный молот, оглушает цель и притягивает Рассветную деву к ней.',cast(h,x,y,lvl){const t=pickUnitAt(x,y);if(!t||t.team===h.team||t.dead||isBuilding(t)){flashMsg(h,'Наведите на врага');return;}fxBeam(h.x,h.y,t.x,t.y,'#ffd36b',0.35);spawnHammerTrail(t.x,t.y);t.stunTimer=Math.max(t.stunTimer,0.9+lvl*0.12);applyDamage(t,130+68*lvl,h);const d=Math.hypot(t.x-h.x,t.y-h.y)||1;h.x=clamp(t.x-(t.x-h.x)/d*95,60,WORLD-60);h.y=clamp(t.y-(t.y-h.y)/d*95,60,WORLD-60);playHeroSfx('hammer');}},
  dawnBlessing: {name:'Сияние',short:'E',type:'self',maxLevel:4,cd:[0,0,0,0,0],mana:[0,0,0,0,0],desc:'Пассивно немного сильнее лечит союзников после атак.',cast(){}},
  dawnGlobalJump: {name:'Солнечный страж',short:'R',type:'point',maxLevel:3,cd:[0,90,75,60],mana:[0,180,230,280],range:2600,ult:true,desc:'Отмечает область рядом с любым союзником на карте. Пару секунд там пульсирует световой круг — лечит союзников и жжёт врагов с каждым тиком, — а затем Рассветная дева влетает в его центр, оглушая и нанося мощный урон всем врагам внутри.',cast(h,x,y,lvl){const castRadius=520;let nearAlly=false;for(const u of heroes){if(u.team===h.team&&!u.dead&&Math.hypot(u.x-x,u.y-y)<=castRadius){nearAlly=true;break;}}if(!nearAlly){flashMsg(h,'Нужен союзник рядом с целью');return false;}const radius=235;const life=1.5+0.35*lvl;aoes.push({x,y,radius,dmg:0,manaDmg:0,team:h.team,source:h,delay:0,t:0,color:'#fff4af',applied:false,life,dead:false,dawnField:true,landed:false,tickInterval:0.5,healAmt:55+32*lvl,burnAmt:45+26*lvl,landDmg:200+96*lvl,ultLvl:lvl});fxMark(x,y,radius,'#fff4af',life);addText(x,y-radius-18,'РАССВЕТ ИДЁТ','#fff4af',1.0,15);playHeroSfx('jump');return true;}},
  exileGauntlet: {name:'Бросок рукавицы',short:'Q',type:'point',maxLevel:4,cd:[0,12,10,8,6],mana:[0,70,80,90,100],range:760,desc:'Усиленное AoE-оглушение в точке.',cast(h,x,y,lvl){const r=155+18*lvl;fxBeam(h.x,h.y,x,y,'#ff5a61',0.28);spawnParticles(x,y,'#ff7b68',32,1);for(const u of units)if(!u.dead&&u.team!==h.team&&u.team!==2&&!isBuilding(u)&&Math.hypot(u.x-x,u.y-y)<r+u.radius){applyDamage(u,190+85*lvl,h);u.stunTimer=Math.max(u.stunTimer,0.85+lvl*0.12);}fxRing(x,y,r,'#ff5a61',0.6);playHeroSfx('gauntlet');}},
  exileCleave: {name:'Раскол брони',short:'W',type:'self',maxLevel:4,cd:[0,0,0,0,0],mana:[0,0,0,0,0],desc:'Пассивный усиленный сплеш-урон.',cast(){}},
  exileBattleCry: {name:'Боевой клич',short:'E',type:'self',maxLevel:4,cd:[0,19,17,15,13],mana:[0,65,75,85,95],desc:'На 9 секунд даёт броню, скорость передвижения, скорость атаки и урон. Эффекты складываются в один надёжный бафф.',cast(h,x,y,lvl){const duration=9;h.buffs=h.buffs.filter(b=>!['exileBattleCryArmor','exileBattleCrySpeed','exileBattleCryAttack','exileBattleCryDamage'].includes(b.type));h.addBuff({type:'armor',id:'exileBattleCryArmor',val:8+4*lvl,t:duration});h.addBuff({type:'spd',id:'exileBattleCrySpeed',val:0.18+lvl*0.04,t:duration});h.addBuff({type:'as',id:'exileBattleCryAttack',val:0.18+lvl*0.05,t:duration});h.addBuff({type:'dmg',id:'exileBattleCryDamage',val:10+8*lvl,t:duration});heroBurst(h,'#8fc7ff',135,34);addText(h.x,h.y-70,'БОЕВОЙ КЛИЧ','#a8ddff',1.2,18);playHeroSfx('shield');}},
  exileGodRage: {name:'Гнев бога',short:'R',type:'self',maxLevel:3,cd:[0,70,58,46],mana:[0,150,190,230],ult:true,desc:'+150% к урону атак на 11 секунд.',cast(h){h.addBuff({type:'exileRage',val:1.50,t:11});heroBurst(h,'#ff3f50',145,44);addText(h.x,h.y-70,'ГНЕВ БОГА','#ff707a',1.3,19);playHeroSfx('rage');}},
  electricRemnant: {
    name:'Static Remnant', short:'Q', type:'point', maxLevel:4,
    cd:[0,12,10,8,6], mana:[0,80,90,100,110], range:1000,
    desc:'Ставит энергетическую копию в выбранную точку на 12 секунд. Она взрывается рядом с врагом.',
    cast(h,x,y){ spawnElectricRemnant(h,x,y); }
  },
  electricVortex: {
    name:'Electric Vortex', short:'W', type:'point', maxLevel:4,
    cd:[0,16,14,12,10], mana:[0,90,105,120,135], range:700,
    desc:'Затягивает врага к месту, где находится герой.',
    cast(h,x,y,lvl){
      const target=pickUnitAt(x,y);
      if(!target||target.team===h.team||target.dead||isBuilding(target)){ flashMsg(h,'Наведите вихрь на врага'); return; }
      const distance=Math.hypot(target.x-h.x,target.y-h.y)||1;
      target.x=clamp(h.x+(target.x-h.x)/distance*75,60,WORLD-60);
      target.y=clamp(h.y+(target.y-h.y)/distance*75,60,WORLD-60);
      target.stunTimer=Math.max(target.stunTimer,0.35+lvl*0.1);
      applyDamage(target,abilityDamage(h,100+70*lvl),h);
      fxBeam(target.x,target.y,h.x,h.y,'#65eaff',0.45);
    }
  },
  electricOverload: {
    name:'Overload', short:'E', type:'self', maxLevel:4,
    cd:[0,18,16,14,12], mana:[0,70,80,90,100],
    desc:'Заряжает следующую атаку: она поражает врагов вокруг цели и замедляет их.',
    cast(h){ h.buffs=h.buffs.filter(buff=>buff.type!=='electricOverload'); h.addBuff({type:'electricOverload',t:12}); addText(h.x,h.y-60,'OVERLOAD ГОТОВ','#7feaff',1.0,16); }
  },
  ballLightning: {
    name:'Ball Lightning', short:'R', type:'point', maxLevel:3,
    cd:[0,55,48,42], mana:[0,0,0,0], range:1800, ult:true,
    desc:'Несётся к цели, расходуя 25 + 7.5% маны и 10 + 0.75% маны за каждые 100 единиц пути.',
    cast(h,x,y){ castBallLightning(h,x,y); }
  },
  ilyaPull: {
    name:'Жирный крюк', short:'Q', type:'point', maxLevel:4,
    cd:[0,12,10,8,6], mana:[0,70,80,90,100], range:850,
    desc:'Притягивает ближайшего врага к Илье',
    cast(h,x,y,lvl){
      let target=null, best=90;
      for(const unit of units){
        if(unit.team===h.team||unit.dead||isBuilding(unit)) continue;
        const distance=Math.hypot(unit.x-x,unit.y-y);
        if(distance<best){ best=distance; target=unit; }
      }
      if(!target){ flashMsg(h,'Крюк не попал'); return; }
      const distance=Math.hypot(target.x-h.x,target.y-h.y)||1;
      target.x=clamp(h.x+(target.x-h.x)/distance*90,60,WORLD-60);
      target.y=clamp(h.y+(target.y-h.y)/distance*90,60,WORLD-60);
      target.stunTimer=Math.max(target.stunTimer,0.35);
      applyDamage(target,abilityDamage(h,100+70*lvl),h);
      fxBeam(h.x,h.y,target.x,target.y,'#f2c38b',0.35);
    }
  },
  ilyaAura: {
    name:'Ядовитая аура', short:'W', type:'self', maxLevel:4,
    cd:[0,18,16,14,12], mana:[0,90,100,110,120],
    desc:'Зелёная аура отравляет врагов рядом с Ильёй',
    cast(h,x,y,lvl){
      h.buffs=h.buffs.filter(buff=>buff.type!=='ilyaAura');
      h.addBuff({type:'ilyaAura',radius:190+15*lvl,damage:28+18*lvl,t:8,auraTimer:0});
      addText(h.x,h.y-60,'ЯДОВИТАЯ АУРА','#7dff82',1.2,18);
    }
  },
  ilyaBelly: {
    name:'Удар брюхом', short:'E', type:'self', maxLevel:4,
    cd:[0,16,14,12,10], mana:[0,70,80,90,100],
    desc:'Илья ударяет по земле, замедляя и оглушая врагов',
    cast(h,x,y,lvl){
      const radius=260+15*lvl;
      spawnAoE(h.x,h.y,radius,180+80*lvl,h,0,'#d49a62');
      for(const unit of units){
        if(unit.team===h.team||unit.dead||isStructure(unit)) continue;
        if(Math.hypot(unit.x-h.x,unit.y-h.y)<radius){ unit.slow=0.55; unit.slowT=3; unit.stunTimer=Math.max(unit.stunTimer,0.45); }
      }
      fxRing(h.x,h.y,radius,'#d49a62',0.55);
    }
  },
  ilyaFeast: {
    name:'Пир толстяка', short:'R', type:'self', maxLevel:3,
    cd:[0,65,55,45], mana:[0,170,210,250], ult:true,
    desc:'Поглощает силу врагов вокруг и временно усиливает Илью',
    cast(h,x,y,lvl){
      const radius=360;
      let count=0;
      for(const unit of units){
        if(unit.team===h.team||unit.dead||isStructure(unit)) continue;
        if(Math.hypot(unit.x-h.x,unit.y-h.y)<radius){
          applyDamage(unit,abilityDamage(h,300+180*lvl),h);
          unit.stunTimer=Math.max(unit.stunTimer,1.5);
          count++;
        }
      }
      h.hp=Math.min(h.maxHp,h.hp+count*(120+40*lvl));
      h.addBuff({type:'dmg',val:45+35*lvl,t:10});
      h.addBuff({type:'armor',val:8+3*lvl,t:10});
      fxRing(h.x,h.y,radius,'#ffcf70',0.8);
    }
  },
  fireball: {
    name:'Огненный шар', short:'Q', type:'point', maxLevel:4,
    cd:[0,7,6,5,4], mana:[0,80,90,100,110], range:900,
    desc:'Взрыв огня в указанной точке',
    dmg:[0,170,270,375,480], radius:[0,150,165,180,195],
    cast(h,x,y,lvl){
      spawnAoE(x,y,this.radius[lvl],this.dmg[lvl],h,0.28,'#ff7a2f');
      fxMark(x,y,this.radius[lvl],'#ff7a2f',0.28);
    }
  },
  flamewave: {
    name:'Волна пламени', short:'W', type:'self', maxLevel:4,
    cd:[0,11,10,9,8], mana:[0,70,80,90,100],
    desc:'Урон и замедление вокруг себя',
    dmg:[0,135,215,300,385], radius:[0,290,315,340,365],
    slow:[0,0.30,0.35,0.40,0.45], dur:2.5,
    cast(h,x,y,lvl){
      spawnAoE(h.x,h.y,this.radius[lvl],this.dmg[lvl],h,0,'#ffb347');
      for(const u of units){
        if(u.team===h.team||u.dead) continue;
        if(Math.hypot(u.x-h.x,u.y-h.y) < this.radius[lvl]){
          u.slow=this.slow[lvl]; u.slowT=this.dur;
        }
      }
      fxRing(h.x,h.y,this.radius[lvl],'#ffb347',0.45);
    }
  },
  blink: {
    name:'Мигание', short:'E', type:'point', maxLevel:4,
    cd:[0,17,15,13,11], mana:[0,50,50,50,50], range:700,
    desc:'Мгновенный телепорт в точку',
    cast(h,x,y,lvl){
      fxRing(h.x,h.y,70,'#7fd8ff',0.35);
      h.x = clamp(x,60,WORLD-60);
      h.y = clamp(y,60,WORLD-60);
      h.moveTarget=null;
      fxRing(h.x,h.y,70,'#7fd8ff',0.35);
    }
  },
  meteor: {
    name:'Метеор', short:'R', type:'point', maxLevel:3,
    cd:[0,40,40,40], mana:[0,180,220,260], range:1150, ult:true,
    desc:'Метеор с небес. Огромный урон по площади',
    dmg:[0,600,880,1160], radius:[0,340,380,420],
    cast(h,x,y,lvl){
      spawnAoE(x,y,this.radius[lvl],this.dmg[lvl],h,1.15,'#ff3d00');
      fxMark(x,y,this.radius[lvl],'#ff3d00',1.15);
    }
  },
  arcadyFireballs: {
    name:'Огненные шары', short:'Q', type:'point', maxLevel:4,
    cd:[0,12,11,10,9], mana:[0,100,115,130,145], range:1000,
    desc:'Запускает два огромных огненных шара. Каждый наносит до 500 урона на максимальном уровне.',
    cast(h,x,y,lvl){
      const target=pickUnitAt(x,y);
      if(!target || target.team===h.team || target.dead){ flashMsg(h,'Наведите на врага'); return; }
      const damage=[0,120,190,260,330][lvl];
      for(let i=0;i<2;i++) spawnProjectile(h.x + (i ? 10 : -10), h.y, target, abilityDamage(h,damage), h, 820, '#ff5a24', 18);
      fxRing(target.x,target.y,54,'#ff9b45',0.5);
    }
  },
  arcadyMolotov: {
    name:'Молотов', short:'W', type:'point', maxLevel:4,
    cd:[0,20,18,16,14], mana:[0,110,125,140,155], range:850,
    desc:'Поджигает область на 8 секунд: враги внутри горят каждые 0.3 сек. (до 100 урона за тик на максимуме), а выйдя из огня, ещё 5 секунд получают по 25 урона в секунду.',
    cast(h,x,y,lvl){
      const damage=[0,25,50,75,100][lvl];
      aoes.push({x,y,radius:220+15*lvl,dmg:abilityDamage(h,damage),manaDmg:0,team:h.team,source:h,delay:0,t:0,color:'#ff6b35',applied:false,life:8,dead:false,burnField:true,tickInterval:0.3,residualBurn:true});
      fxMark(x,y,220+15*lvl,'#ff6b35',8);
    }
  },
  arcadyFocus: {
    name:'Огненная стойка', short:'E', type:'self', maxLevel:4,
    cd:[0,0,0,0,0], mana:[0,0,0,0,0],
    desc:'Пассивно: каждый уровень повышает скорость атаки. Максимум: +100 к скорострельности и +110 к скорости ходьбы.',
    cast(){}
  },
  arcadyDynamite: {
    name:'Динамит', short:'R', type:'point', maxLevel:3,
    cd:[0,55,48,42], mana:[0,180,220,260], range:1100, ult:true,
    desc:'Запускает три динамита во врага. При попадании каждый взрывается и наносит до 500 урона.',
    cast(h,x,y,lvl){
      const target=pickUnitAt(x,y);
      if(!target || target.team===h.team || target.dead || isBuilding(target)){ flashMsg(h,'Наведите на врага'); return; }
      const distance=Math.hypot(target.x-h.x,target.y-h.y)||1;
      const dirX=(target.x-h.x)/distance, dirY=(target.y-h.y)/distance;
      const sideX=-dirY, sideY=dirX;
      const damage=[0,300,400,500][lvl];
      for(let i=0;i<3;i++){
        const offset=(i-1)*24;
        const projectile=spawnProjectile(h.x+sideX*offset,h.y+sideY*offset,target,abilityDamage(h,damage),h,620,'#ffbf5c',15);
        projectile.kind='dynamite'; projectile.dirX=dirX; projectile.dirY=dirY;
      }
      fxBeam(h.x,h.y,target.x,target.y,'#ff8a3d',0.35);
    }
  },
  illusionistDouble: {
    name:'Двойник', short:'Q', type:'self', maxLevel:4,
    cd:[0,18,16,14,12], mana:[0,80,90,100,110],
    desc:'Создаёт иллюзию рядом с Иллюзионистом на 12 секунд.',
    cast(h){ spawnIllusion(h,{life:12,damageMultiplier:0.3,damageTakenMultiplier:2}); fxRing(h.x,h.y,80,'#d8b4ff',0.55); }
  },
  illusionistSwap: {
    name:'Рокировка', short:'W', type:'point', maxLevel:4,
    cd:[0,20,18,16,14], mana:[0,70,80,90,100], range:900,
    desc:'Меняет координатами героя и ближайшей к курсору своей иллюзией.',
    cast(h,x,y){
      let target=null, best=160;
      for(const unit of units){
        if(!unit.isIllusion || unit.owner!==h || unit.dead) continue;
        const distance=Math.hypot(unit.x-x,unit.y-y);
        if(distance<best){best=distance;target=unit;}
      }
      if(!target){flashMsg(h,'Нет своей иллюзии рядом с курсором');return;}
      const oldX=h.x, oldY=h.y; h.x=target.x; h.y=target.y; target.x=oldX; target.y=oldY;
      h.attackTarget=null; target.attackTarget=null; fxRing(h.x,h.y,75,'#d8b4ff',0.45);
    }
  },
  illusionistPhantom: {
    name:'Фантом', short:'E', type:'self', maxLevel:4,
    cd:[0,0,0,0,0], mana:[0,0,0,0,0],
    desc:'Пассивно: автоатаки имеют 15% шанс создать слабую иллюзию у цели.',
    cast(){}
  },
  illusionistFinale: {
    name:'Гранд-финал', short:'R', type:'self', maxLevel:3,
    cd:[0,70,60,50], mana:[0,180,220,260], ult:true,
    desc:'Исчезает на 0.5 секунды, затем появляется с тремя сильными иллюзиями.',
    cast(h){
      h.invulnerable=true; h.invisible=true; h.attackTarget=null; h.moveTarget=null;
      window.setTimeout(()=>{
        if(h.dead) return;
        h.invulnerable=false; h.invisible=false;
        const count=3+(h.ultimateIllusions||0);
        for(let i=0;i<count;i++) spawnIllusion(h,{life:15,damageMultiplier:0.65,damageTakenMultiplier:1.5,angle:i*Math.PI*2/count});
        fxRing(h.x,h.y,145,'#d8b4ff',0.8); addText(h.x,h.y-80,'ГРАНД-ФИНАЛ','#d8b4ff',1.3,18);
      },500);
    }
  },
  cleave: {
    name:'Рассекающий удар', short:'Q', type:'point', maxLevel:4,
    cd:[0,9,8,7,6], mana:[0,60,70,80,90], range:260,
    desc:'Мощный удар по области',
    dmg:[0,180,285,395,510], radius:[0,235,260,285,310],
    cast(h,x,y,lvl){
      spawnAoE(x,y,this.radius[lvl],this.dmg[lvl],h,0.16,'#4fc3f7');
      fxMark(x,y,this.radius[lvl],'#4fc3f7',0.16);
    }
  },
  warcry: {
    name:'Боевой клич', short:'W', type:'self', maxLevel:4,
    cd:[0,19,17,15,13], mana:[0,60,70,80,90],
    desc:'Лечение и временная броня',
    heal:[0,200,300,400,510], armor:[0,6,9,12,15], dur:[0,6,7,8,9],
    cast(h,x,y,lvl){
      h.hp = Math.min(h.maxHp, h.hp + this.heal[lvl]);
      h.addBuff({type:'armor', val:this.armor[lvl], t:this.dur[lvl], name:'Клич'});
      addText(h.x, h.y-56, '+' + this.heal[lvl], '#7dff7d', 1.0, 17);
      fxRing(h.x,h.y,130,'#8bff8b',0.55);
    }
  },
  charge: {
    name:'Рывок', short:'E', type:'point', maxLevel:4,
    cd:[0,15,13,11,9], mana:[0,60,60,60,60], range:640,
    desc:'Рывок сквозь врагов, нанося урон',
    dmg:[0,150,240,335,440], width:95,
    cast(h,x,y,lvl){
      const d = Math.hypot(x-h.x, y-h.y);
      const ux = (x-h.x)/(d||1), uy = (y-h.y)/(d||1);
      const steps = Math.max(1, Math.ceil(d/35));
      const hit = new Set();
      for(let i=1;i<=steps;i++){
        const px = h.x + ux*(d*i/steps);
        const py = h.y + uy*(d*i/steps);
        fxRing(px,py,26,'#4fc3f7',0.25);
        for(const en of units){
          if(en.team===h.team||en.dead||hit.has(en)) continue;
          if(Math.hypot(en.x-px, en.y-py) < this.width/2 + en.radius){
            hit.add(en); applyDamage(en, abilityDamage(h,this.dmg[lvl]), h);
          }
        }
      }
      h.x = clamp(x,60,WORLD-60);
      h.y = clamp(y,60,WORLD-60);
      h.moveTarget = null;
      fxRing(h.x,h.y,80,'#4fc3f7',0.4);
    }
  },
  bladeStorm: {
    name:'Шторм клинков', short:'R', type:'self', maxLevel:3,
    cd:[0,75,65,55], mana:[0,150,180,210], ult:true,
    desc:'Три вращения вокруг Вождя: урон, лечение и замедление врагов',
    dmg:[0,260,390,540], radius:[0,280,310,340],
    cast(h,x,y,lvl){
      const radius=this.radius[lvl];
      for(let pulse=0;pulse<3;pulse++){
        for(const unit of units){
          if(unit.team===h.team||unit.dead||isStructure(unit)) continue;
          if(Math.hypot(unit.x-h.x,unit.y-h.y)<radius) applyDamage(unit,abilityDamage(h,this.dmg[lvl]),h);
        }
        fxRing(h.x,h.y,radius,'#ffd54f',0.45);
      }
      h.hp=Math.min(h.maxHp,h.hp+180+90*lvl);
      addText(h.x,h.y-72,'ШТОРМ КЛИНКОВ','#ffd54f',1.4,18);
    }
  },

  /* === ДЖАГГЕРНАУТ === */
  juggernautBladeFury: {
    name:'Blade Fury', short:'Q', type:'self', maxLevel:4,
    cd:[0,25,22,19,16], mana:[0,90,105,120,135],
    desc:'Вращается с катаной 5 секунд: наносит урон вокруг и не получает магический урон.',
    cast(h,x,y,lvl){
      const duration=5;
      h.buffs=h.buffs.filter(buff=>buff.type!=='bladeFury');
      h.addBuff({type:'bladeFury',t:duration,level:lvl,pulse:0});
      h.attackTarget=null;
      heroBurst(h,'#ffdf72',125,38);
      addText(h.x,h.y-74,'BLADE FURY','#fff0a8',1.35,19);
      return true;
    }
  },
  juggernautHealingWard: {
    name:'Healing Ward', short:'W', type:'self', maxLevel:4,
    cd:[0,28,25,22,19], mana:[0,90,105,120,135],
    desc:'Ставит тотем на поле: союзники рядом восстанавливают процент здоровья.',
    cast(h,x,y,lvl){
      const old=units.find(unit=>unit.summonKind==='healingWard'&&unit.owner===h&&!unit.dead);
      if(old) old.dead=true;
      spawnHealingWard(h,lvl);
      return true;
    }
  },
  juggernautBladeDance: {
    name:'Blade Dance', short:'E', type:'self', passive:true, maxLevel:4,
    cd:[0,0,0,0,0], mana:[0,0,0,0,0],
    desc:'Пассивно даёт шанс нанести критический урон катаной.',
    cast(){}
  },
  juggernautOmnislash: {
    name:'Omnislash', short:'R', type:'point', maxLevel:3,
    cd:[0,75,62,50], mana:[0,160,200,240], ult:true,
    range:900,
    desc:'Наведись на видимого врага: Джагернаут прыгает по ближайшим целям и остаётся неуязвимым.',
    cast(h,x,y,lvl){
      if(h.buffs.some(buff=>buff.type==='omnislash')) return false;
      const target=pickUnitAt(x,y) || findOmnislashTarget(h,null);
      if(!target || target.team===h.team || target.dead || isBuilding(target)){
        flashMsg(h,'Наведите ульт на врага'); return false;
      }
      h.buffs=h.buffs.filter(buff=>buff.type!=='omnislash');
      h.addBuff({type:'omnislash',t:2.35,level:lvl,strikes:6+lvl*2,next:0.01,target,hasStruck:false});
      h.invulnerable=true;
      h.attackTarget=null; h.moveTarget=null;
      addText(h.x,h.y-82,'OMNISLASH','#fff2a8',1.45,20);
      fxRing(h.x,h.y,150,'#ffe066',0.7);
      return true;
    }
  },

  /* === СНАЙПЕР === */
  sniperShrapnel: {
    name:'Shrapnel', short:'Q', type:'point', maxLevel:4,
    cd:[0,0,0,0,0], mana:[0,80,90,100,110], range:950,
    desc:'Выстреливает заряд в область: наносит урон и замедляет врагов. Одновременно доступны 2 заряда, каждый восстанавливается отдельно.',
    cast(h,x,y,lvl){
      if((h.shrapnelCharges||0)<=0){ flashMsg(h,'Shrapnel: нет зарядов'); return false; }
      const radius=210+lvl*16;
      h.shrapnelCharges--;
      const recharge=[0,14,13,12,11][lvl] || 14;
      h.shrapnelRechargeTimers.push(recharge);
      aoes.push({x,y,radius,dmg:abilityDamage(h,36+18*lvl),manaDmg:0,team:h.team,source:h,
        delay:0,t:0,color:'#ffd27a',applied:false,life:7.5,dead:false,
        shrapnel:true,slow:0.34+lvl*0.035,tickInterval:0.5,pulseTimer:0});
      fxMark(x,y,radius,'#ffd27a',7.5);
      addText(x,y-radius-20,'SHRAPNEL  •  ЗАРЯДЫ: '+h.shrapnelCharges,'#ffe2a0',1.0,15);
      return true;
    }
  },
  sniperHeadshot: {
    name:'Headshot', short:'W', type:'self', passive:true, maxLevel:4,
    cd:[0,0,0,0,0], mana:[0,0,0,0,0],
    desc:'Пассивный шанс при каждой атаке нанести дополнительный физический урон и ненадолго замедлить движение и скорость атаки цели.',
    cast(){}
  },
  sniperTakeAim: {
    name:'Take Aim', short:'E', type:'self', maxLevel:4,
    cd:[0,24,21,18,15], mana:[0,50,60,70,80],
    desc:'Пассивно увеличивает дальность атаки. При активации на 5 секунд даёт ещё дальность и повышает скорость атаки.',
    cast(h,x,y,lvl){
      h.buffs=h.buffs.filter(buff=>buff.id!=='sniperTakeAim');
      h.addBuff({type:'as',id:'sniperTakeAim',t:5,rangeBonus:125+lvl*28,val:0.42+lvl*0.08});
      addText(h.x,h.y-70,'TAKE AIM','#ffe4a3',1.15,17);
      fxRing(h.x,h.y,100,'#ffd27a',0.55);
    }
  },
  sniperAssassinate: {
    name:'Assassinate', short:'R', type:'point', maxLevel:3,
    cd:[0,70,58,46], mana:[0,150,190,230], range:1800, ult:true,
    desc:'После прицеливания выпускает большую пулю. Видимая цель получает 500 чистого урона.',
    cast(h,x,y,lvl){
      const target=pickUnitAt(x,y);
      if(!target || target.team===h.team || target.dead || isBuilding(target)){
        flashMsg(h,'Наведите Assassinate на врага'); return false;
      }
      h.assassinating=true;
      h.assassinateTarget=target;
      target.addBuff({type:'assassinateMark',t:1.25});
      addText(target.x,target.y-70,'ПРИЦЕЛ: ASSASSINATE','#ffe3a8',1.15,16);
      fxBeam(h.x,h.y,target.x,target.y,'#ffe0a0',0.28);
      fxRing(h.x,h.y,58,'#fff1b0',0.42);
      spawnParticles(h.x,h.y,'#fff4c2',24,0.8);
      window.setTimeout(()=>{
        h.assassinating=false;
        h.assassinateTarget=null;
        if(h.dead || target.dead) return;
        const projectile=spawnProjectile(h.x,h.y,target,500,
          {team:h.team,source:h,trueDamage:true},1450,'#fff0a8',18);
        projectile.assassinate=true;
        projectile.life=2.5;
        addText(h.x,h.y-82,'ASSASSINATE!','#fff0b0',0.8,18);
        fxBeam(h.x,h.y,target.x,target.y,'#fff4c2',0.22);
      },380);
      return true;
    }
  },

  /* === СКИЛЛЫ ГРИШИ === */
  quas: {
    name:'Квас', short:'Q', type:'self', maxLevel:3,
    cd:[0,0,0,0], mana:[0,0,0,0],
    desc:'Орб льда. Реген HP.',
    cast(h,x,y,lvl){ pushOrb(h, 'Q'); }
  },
  wex: {
    name:'Векс', short:'W', type:'self', maxLevel:3,
    cd:[0,0,0,0], mana:[0,0,0,0],
    desc:'Орб молнии. Скорость и атака.',
    cast(h,x,y,lvl){ pushOrb(h, 'W'); }
  },
  exort: {
    name:'Экзорт', short:'E', type:'self', maxLevel:3,
    cd:[0,0,0,0], mana:[0,0,0,0],
    desc:'Орб огня. Бонусный урон.',
    cast(h,x,y,lvl){ pushOrb(h, 'E'); }
  },
  invoke: {
    name:'Призыв', short:'R', type:'point', maxLevel:3,
    cd:[0,0,0,0], mana:[0,80,100,120], range:1200, ult:true,
    desc:'Заклинание по 3 орбам.',
    cast(h,x,y,lvl){
      const key = getOrbKey(h.orbs || ['Q','W','E']);

      const spell = INVOKE_SPELLS[key];
      if(spell){
        spell.cast(h, x, y, lvl);
        h.lastInvokeKey = key;
        addText(h.x, h.y-90, '→ ' + spell.name, '#ffe066', 1.5, 18);
      } else {
        h.mp = Math.min(h.maxMp, h.mp + this.mana[lvl]);
        flashMsg(h, 'Комбо не найдено');
      }
    }
  },
  beam: {
    name:'Луч', short:'F', type:'point', maxLevel:3,
    cd:[0,9,7,5], mana:[0,90,120,150], range:900,
    desc:'Лазерный луч, пробивающий всех врагов',
    dmg:[0,220,330,450], width:30,
    cast(h,x,y,lvl){
      let dx = x-h.x, dy = y-h.y;
      const d = Math.hypot(dx,dy) || 1;
      const ux = dx/d, uy = dy/d;
      const range = 900;
      const endX = h.x + ux*range;
      const endY = h.y + uy*range;

      const hit = new Set();
      const halfW = this.width;
      const steps = Math.ceil(range/25);
      for(let i=0;i<=steps;i++){
        const t = i/steps;
        const px = h.x + (endX-h.x)*t;
        const py = h.y + (endY-h.y)*t;
        for(const en of units){
          if(en.team===h.team||en.dead||hit.has(en)||isStructure(en)) continue;
          if(Math.hypot(en.x-px, en.y-py) < halfW + en.radius){
            hit.add(en);
            applyDamage(en, abilityDamage(h,this.dmg[lvl]), h);
          }
        }
      }

      fxBeam(h.x, h.y, endX, endY, '#ffe066', 0.35);
      fxBeam(h.x, h.y, endX, endY, '#ffffff', 0.22);
    }
  },
  gollyCrystal: {
    name:'Кристалл', short:'Q', type:'point', maxLevel:4,
    cd:[0,8,7,6,5], mana:[0,70,80,90,100], range:850,
    desc:'Кристалл замораживает врага на 0.3 секунды',
    cast(h,x,y,lvl){
      const radius=70;
      spawnAoE(x,y,radius,120+55*lvl,h,0.18,'#9eeaff');
      for(const unit of units){
        if(unit.team===h.team||unit.dead||unit.team===2||isStructure(unit)) continue;
        if(!isStructure(unit) && Math.hypot(unit.x-x,unit.y-y)<radius+unit.radius) unit.stunTimer=Math.max(unit.stunTimer,0.3);
      }
      fxMark(x,y,radius,'#9eeaff',0.18);
    }
  },
  gollyStorm: {
    name:'Орда кристаллов', short:'W', type:'point', maxLevel:4,
    cd:[0,14,12,10,8], mana:[0,100,115,130,145], range:700,
    desc:'Ледяные кристаллы наносят урон и отбрасывают врагов',
    cast(h,x,y,lvl){
      const radius=230, damage=220+90*lvl;
      spawnAoE(x,y,radius,damage,h,0.2,'#70cfff');
      for(const unit of units){
        if(unit.team===h.team||unit.dead||unit.team===2||isStructure(unit)) continue;
        const dx=unit.x-h.x, dy=unit.y-h.y, distance=Math.hypot(dx,dy)||1;
        if(distance<radius){
          const push=180;
          const tx=clamp(unit.x+dx/distance*push,60,WORLD-60);
          const ty=clamp(unit.y+dy/distance*push,60,WORLD-60);
          if(canMoveTo(tx,ty,unit.radius)){ unit.x=tx; unit.y=ty; }
        }
      }
      fxMark(x,y,radius,'#70cfff',0.2);
    }
  },
  gollyHeart: {
    name:'Ледяное сердце', short:'E', type:'self', maxLevel:4,
    cd:[0,18,16,14,12], mana:[0,70,80,90,100],
    desc:'Укрепляет Голли: броня, скорость и восстановление здоровья.',
    cast(h,x,y,lvl){
      h.addBuff({type:'armor', val:4+2*lvl, t:7});
      h.addBuff({type:'spd', val:0.12+0.03*lvl, t:7});
      h.hp=Math.min(h.maxHp,h.hp+80+40*lvl);
      addText(h.x,h.y-60,'ЛЕДЯНОЕ СЕРДЦЕ','#b9efff',1.1,16);
      fxRing(h.x,h.y,100,'#b9efff',0.55);
    }
  },
  gollyGolems: {
    name:'Ледяные големы', short:'R', type:'self', maxLevel:3,
    cd:[0,20,20,20], mana:[0,180,220,260], ult:true,
    desc:'Призывает 4 ледяных голема на 10 секунд',
    cast(h){ spawnGollyGolems(h); }
  },
  gollyRed: {
    name:'Красный кристалл', short:'F', type:'self', maxLevel:3,
    cd:[0,55,45,35], mana:[0,100,120,140],
    desc:'Красный режим: утроенный урон на 10 секунд',
    cast(h){
      h.buffs = h.buffs.filter(b => b.type !== 'gollyRed');
      h.addBuff({type:'gollyRed', val:3, t:10});
      addText(h.x,h.y-65,'КРАСНЫЙ РЕЖИМ', '#ff4f5e', 1.3, 18);
      fxRing(h.x,h.y,100,'#ff4f5e',0.7);
    }
  },
  bloodrage: {
    name:'Bloodrage', short:'Q', type:'self', maxLevel:4,
    cd:[0,18,16,14,12], mana:[0,70,80,90,100],
    desc:'Быстрее атакует и усиливает заклинания, теряя здоровье',
    cast(h,x,y,lvl){
      h.buffs = h.buffs.filter(b => b.type !== 'bloodrage');
      h.addBuff({type:'bloodrage', val:0.35+lvl*0.12, spellMult:1.3+lvl*0.15, hpDrain:10+lvl*8, t:10});
      addText(h.x,h.y-60,'BLOODRAGE','#ff5368',1.2,18); fxRing(h.x,h.y,90,'#a71936',0.5);
    }
  },
  bloodRite: {
    name:'Blood Rite', short:'W', type:'point', maxLevel:4,
    cd:[0,18,16,14,12], mana:[0,100,115,130,145], range:850,
    desc:'Через 2.9 секунды наносит урон и запрещает способности',
    cast(h,x,y,lvl){
      const radius=260;
      aoes.push({x,y,radius,dmg:abilityDamage(h,260+110*lvl),manaDmg:0,team:h.team,source:h,delay:2.9,t:0,color:'#b51f3e',applied:false,life:0.45,dead:false,silenceDuration:3});
      fxMark(x,y,radius,'#b51f3e',2.9);
    }
  },
  thirst: {
    name:'Thirst', short:'E', type:'self', maxLevel:4,
    cd:[0,0,0,0,0], mana:[0,0,0,0,0],
    desc:'Пассивно ускоряется от раненых вражеских героев',
    cast(){ }
  },
  rupture: {
    name:'Rupture', short:'R', type:'point', maxLevel:3,
    cd:[0,50,45,40], mana:[0,150,200,250], range:700, ult:true,
    desc:'Урон от текущего здоровья и пройденного расстояния',
    cast(h,x,y,lvl){
      let target=null, best=100;
      for(const unit of units){
        if(unit.team===h.team||unit.dead||unit.team===2) continue;
        const distance=Math.hypot(unit.x-x,unit.y-y);
        if(!isStructure(unit) && distance<best){best=distance;target=unit;}
      }
      if(!target){ flashMsg(h,'Нет цели для Rupture'); return; }
      applyDamage(target,target.maxHp*(0.12+lvl*0.04),h);
      target.ruptureState={x:target.x,y:target.y,t:8,damagePerDistance:0.7+lvl*0.25,source:h};
      addText(target.x,target.y-60,'РАЗРЫВ','#ff354f',1.5,18); fxRing(target.x,target.y,70,'#ff354f',0.6);
    }
  },
  shadowCoilQ: {
    name:'Ближний койл', short:'Q', type:'point', maxLevel:4,
    cd:[0,5,4,3.5,3], mana:[0,55,65,75,85], range:380,
    desc:'Взрыв перед Шадоу на ближней дистанции. Цель не нужна.',
    damage:[0,225,330,430,535],
    cast(h,x,y,lvl){ castShadowCoil(h,x,y,lvl,this.range,this.damage[lvl],900,190); }
  },
  shadowCoilW: {
    name:'Средний койл', short:'W', type:'point', maxLevel:4,
    cd:[0,7,6,5.5,5], mana:[0,75,85,95,105], range:700,
    desc:'Взрыв перед Шадоу на средней дистанции. Цель не нужна.',
    damage:[0,300,420,535,650],
    cast(h,x,y,lvl){ castShadowCoil(h,x,y,lvl,this.range,this.damage[lvl],1050,380); }
  },
  shadowCoilE: {
    name:'Дальний койл', short:'E', type:'point', maxLevel:4,
    cd:[0,10,8.5,7,5.5], mana:[0,95,110,125,140], range:1050,
    desc:'Взрыв перед Шадоу на дальней дистанции. Цель не нужна.',
    damage:[0,390,545,695,845],
    cast(h,x,y,lvl){ castShadowCoil(h,x,y,lvl,this.range,this.damage[lvl],1250,570); }
  },
  shadowRequiem: {
    name:'Реквием душ', short:'R', type:'self', maxLevel:3,
    cd:[0,70,60,50], mana:[0,150,190,230], ult:true,
    desc:'Через 0.8 секунды выпускает усиленный залп душ и взрывает область.',
    cast(h){
      if(h.shadowCasting){ flashMsg(h, 'Реквием уже готовится'); return; }
      const souls = h.shadowSouls || 0;
      h.shadowCasting = true;
      h.stunTimer = Math.max(h.stunTimer, 0.8);
      h.attackTarget = null; h.moveTarget = null;
       addText(h.x, h.y - 78, 'РЕКВИЕМ: ' + souls + ' ДУШ', '#ff8a3d', 1.5, 19);
       fxRing(h.x, h.y, 150, '#8d1118', 1.5);
       spawnParticles(h.x, h.y, '#ff3b1f', 36, 1.4);
      window.setTimeout(() => {
        h.shadowCasting = false;
        if(h.dead) return;
        const count = 12 + Math.floor(souls * 1.15) + (h.ultimateSoulBonus || 0);
        const damage = (200 + souls * 40) * 2.3;
        for(let i=0;i<count;i++){
          const angle = i * Math.PI * 2 / count;
          const soulRange = 620 + Math.min(420, souls * 12);
          const projectile = {
            x:h.x, y:h.y,
            tx:h.x + Math.cos(angle) * soulRange,
            ty:h.y + Math.sin(angle) * soulRange,
            dmg:abilityDamage(h, damage), team:h.team, source:h,
            speed:380, color:'#ff3b1f', radius:12, dead:false, life:4.5,
            kind:'shadowSoul', phase:'flight',
            dirX:Math.cos(angle), dirY:Math.sin(angle),
            soulAngle:angle, isSpell:true, trailTimer:0
          };
          projectiles.push(projectile);
        }
        h.shadowSouls = 0;
        addText(h.x, h.y - 78, 'ДУШИ ВЫПУЩЕНЫ: ' + count, '#ff8a3d', 1.2, 17);
        spawnAoE(h.x, h.y, 330 + souls * 3, 300 + souls * 26, h, 0, '#ff3b1f');
        fxRing(h.x, h.y, 380 + souls * 4, '#8d1118', 1.05);
        fxRing(h.x, h.y, 250 + souls * 3, '#ff3b1f', 0.75);
        spawnParticles(h.x, h.y, '#ff3b1f', 80 + souls, 2.2);
        spawnRadialBlades(h.x, h.y, 360 + souls * 4, '#ff8a3d', Math.min(64, count + 18));
      }, 800);
    }
  }
};

function reginaLandingImpact(h, x, y, damage, radius, stun, label, color='#ff8bb1'){
  const hitUnits = [];
  for(const unit of units){
    if(unit.dead || unit.team===h.team || isBuilding(unit)) continue;
    if(Math.hypot(unit.x-x, unit.y-y) <= radius + unit.radius){
      applyDamage(unit, damage, h);
      unit.stunTimer = Math.max(unit.stunTimer, stun);
      unit.hitFlash = Math.max(unit.hitFlash || 0, 0.25);
      hitUnits.push(unit);
    }
  }
  fxRing(x,y,radius,color,0.72);
  spawnParticles(x,y,'#ffd4e4',36,1.1);
  addText(x,y-radius-24,label,'#ffd1de',1.0,16);
  return hitUnits.length;
}

function isReginaTargetAllowed(hero, target, slot){
  if(!target || target.dead || isBuilding(target) || target === hero) return false;
  if(slot === 0) return target.team !== hero.team;
  return target.type === 'creep' || target.type === 'neutral' ||
    (target.type === 'hero' && target.team !== hero.team);
}

function findReginaTarget(hero, x, y, slot){
  const range = slot === 0 ? 700 : 850;
  const candidates = units.filter(unit =>
    isReginaTargetAllowed(hero, unit, slot) &&
    (unit.team === 0 || isVisibleToPlayer(unit)) &&
    Math.hypot(unit.x-hero.x, unit.y-hero.y) <= range + unit.radius
  );
  const hovered = candidates
    .map(unit => ({unit, distance:Math.hypot(unit.x-x,unit.y-y)-unit.radius}))
    .sort((a,b) => a.distance-b.distance)[0];
  if(hovered && hovered.distance <= 125) return hovered.unit;
  if(isReginaTargetAllowed(hero, hero.attackTarget, slot) &&
     Math.hypot(hero.attackTarget.x-hero.x,hero.attackTarget.y-hero.y) <= range + hero.attackTarget.radius){
    return hero.attackTarget;
  }
  return null;
}

const REGINA_SKILLS = {
  reginaDispose: {name:'Dispose',short:'Q',type:'point',maxLevel:4,cd:[0,14,12,10,8],mana:[0,70,80,90,100],range:700,desc:'Подбрасывает врага через Регину и бросает его на землю ниже неё. При приземлении враги и крипы получают 90–100 урона и замедление.',cast(h,x,y,lvl){
    const target=findReginaTarget(h,x,y,0);
    if(!target){ flashMsg(h,'Наведите Q на врага или крипа'); return false; }
    const startX=target.x, startY=target.y;
    const landing={x:clamp(h.x,60,WORLD-60),y:clamp(h.y+190,60,WORLD-60)};
    const radius=145+12*lvl;
    const impactDamage=[0,90,93,97,100][lvl] * (hasScepter(h) ? 1.2 : 1);
    h.facing=Math.atan2(startY-h.y,startX-h.x);
    startArcMotion(target,landing.x,landing.y,0.62,()=>{
      if(target.dead) return;
      reginaLandingImpact(h,landing.x,landing.y,impactDamage,radius,0.45+lvl*0.05,'DISPOSE');
      target.slow=0.35; target.slowT=2.5;
    },105,h.x,h.y-45);
    fxBeam(startX,startY,landing.x,landing.y,'#ff7ca2',0.45);
    fxRing(startX,startY,42,'#ffb0c5',0.35);
    addText(landing.x,landing.y-70,'БРОСОК ВНИЗ','#ffb0c5',1.0,16);
    return true;
  }},
  reginaRebound: {name:'Rebound',short:'W',type:'point',maxLevel:4,cd:[0,16,14,12,10],mana:[0,80,90,100,110],range:850,desc:'Перепрыгивает через выбранного врага или крипа с дуговой анимацией. При приземлении наносит 90–100 урона и оглушает врагов и крипов вокруг на 1 секунду.',cast(h,x,y,lvl){
    const jumpTarget=findReginaTarget(h,x,y,1);
    if(!jumpTarget){ flashMsg(h,'Наведите W на вражеского героя или крипа'); return false; }
    const dx=jumpTarget.x-h.x, dy=jumpTarget.y-h.y;
    const distance=Math.hypot(dx,dy)||1;
    const ux=dx/distance, uy=dy/distance;
    const leapBeyond=88+jumpTarget.radius;
    const landing={x:clamp(jumpTarget.x+ux*leapBeyond,60,WORLD-60),y:clamp(jumpTarget.y+uy*leapBeyond,60,WORLD-60)};
    const radius=165+15*lvl;
    const impactDamage=[0,90,93,97,100][lvl] * (hasScepter(h) ? 1.2 : 1);
    h.facing=Math.atan2(dy,dx);
    fxRing(jumpTarget.x,jumpTarget.y,48,'#ffd1de',0.35);
    fxBeam(h.x,h.y,landing.x,landing.y,'#ff9fbd',0.55);
    startArcMotion(h,landing.x,landing.y,0.78,()=>{
      reginaLandingImpact(h,h.x,h.y,impactDamage,radius,1.0+lvl*0.08,'REBOUND');
    },112,(h.x+landing.x)/2,Math.min(h.y,landing.y)-125);
    return true;
  }},
  reginaUnleash: {name:'Unleash',short:'R',type:'self',maxLevel:3,cd:[0,75,62,50],mana:[0,150,190,230],ult:true,desc:'Получает 5–7 зарядов ярости и огромную скорость атаки. Каждый заряд — быстрый удар; последний создаёт вокруг цели волну урона и сильного замедления.',cast(h,x,y,lvl){
    const scepter=hasScepter(h);
    const duration=scepter ? 15 : 12;
    const charges=5+lvl+(scepter?1:0);
    h.buffs=h.buffs.filter(buff=>buff.type!=='reginaUnleash'&&buff.id!=='reginaRageSpeed');
    h.addBuff({type:'reginaUnleash',t:duration,strikes:0,charges,totalCharges:charges,damageMultiplier:1.15+lvl*0.05+(scepter?0.08:0),pulseDamage:abilityDamage(h,95+lvl*18+(scepter?35:0)),pulseRadius:150+lvl*10+(scepter?25:0),pulseSlow:0.58+(scepter?0.08:0),pulseSlowDuration:2.8});
    h.addBuff({type:'as',id:'reginaRageSpeed',val:3.15+lvl*0.42+(scepter?0.35:0),t:duration});
    heroBurst(h,'#ff6688',145+(scepter?25:0),48);
    addText(h.x,h.y-75,'UNLEASH • ЯРОСТЬ x'+charges,'#ffb0c5',1.3,20);
  }}
};

const TRIBUPAINER_SKILLS = {
  tribuIncendiary: {name:'Поджигающие пули',short:'Q',type:'self',passive:false,maxLevel:4,cd:[0,14,12,10,8],mana:[0,45,55,65,75],desc:'На 10 секунд дробовик поджигает врагов на 5 секунд по 25 HP в секунду.',cast(h){ h.tribuIncendiaryTimer=10; addText(h.x,h.y-62,'ПОДЖИГАЮЩИЕ ПУЛИ','#ff8a3d',1.1,16); fxRing(h.x,h.y,78,'#ff5a24',0.45); }},
  tribuShield: {name:'Щит дробовика',short:'W',type:'self',maxLevel:4,cd:[0,3,3,3,3],mana:[0,45,50,55,60],desc:'Щит на 3 секунды блокирует 30% входящего урона.',cast(h,x,y,lvl){ h.buffs=h.buffs.filter(buff=>buff.type!=='tribuShield'); h.addBuff({type:'tribuShield',val:0.30,t:3}); addText(h.x,h.y-62,'ЩИТ: -30% УРОНА','#8be9fd',1.0,16); fxRing(h.x,h.y,88,'#8be9fd',0.5); }},
  tribuInvisibility: {name:'Тихий охотник',short:'E',type:'self',maxLevel:4,cd:[0,24,21,18,15],mana:[0,60,70,80,90],desc:'Становится невидимым на 10 секунд или до первого выстрела.',cast(h){ h.invisible=true; h.tribuInvisibilityTimer=10; addText(h.x,h.y-62,'НЕВИДИМОСТЬ','#d8b4ff',1.0,16); fxRing(h.x,h.y,82,'#d8b4ff',0.45); }},
  tribuExecution: {name:'Трибупейнерский взрыв',short:'R',type:'point',maxLevel:3,cd:[0,70,60,50],mana:[0,160,200,240],range:900,ult:true,desc:'Останавливает врага, наносит 1500 урона и отпускает его после взрыва.',cast(h,x,y,lvl){ const target=pickUnitAt(x,y); if(!target||target.team===h.team||target.dead||isBuilding(target)){ flashMsg(h,'Наведите на вражеского бойца'); return; } target.stunTimer=Math.max(target.stunTimer,1.2); applyDamage(target,1500,h); fxRing(target.x,target.y,185,'#ff7043',0.85); spawnParticles(target.x,target.y,'#ffd36b',70,1.8); addText(target.x,target.y-76,'ТРИБУПЕЙНЕРСКИЙ ВЗРЫВ','#ffd36b',1.3,17); }}
};

const MO3GI_SKILLS = {
  mo3giDrone: {
    name:'Боевой дрон', short:'Q', type:'point', maxLevel:4,
    cd:[0,20,20,20,20], mana:[0,90,105,120,135], range:900,
    desc:'Ставит рядом боевой дрон. Кликните по нему или нажмите T для управления: направьте вражеского бойца, и при контакте дрон взорвётся. Уровень увеличивает урон, радиус и время жизни.',
    cast(h,x,y,lvl){ spawnMo3giDrone(h,lvl); }
  },
  mo3giGift: {
    name:'Дар с небес', short:'W', type:'self', maxLevel:4,
    cd:[0,20,20,20,20], mana:[0,0,0,0,0], costType:'hp', hpCost:50,
    desc:'Тратит 50 HP и даёт себе и всем союзным героям +250 маны.',
    cast(h,x,y,lvl){
      const amount=250+(lvl-1)*50;
      for(const ally of heroes) if(ally.team===h.team&&!ally.dead){
        ally.mp=Math.min(ally.maxMp,ally.mp+amount);
        addText(ally.x,ally.y-55,'+'+amount+' МАНЫ','#8fc4ff',1.0,15);
        fxRing(ally.x,ally.y,70,'#8fc4ff',0.4);
      }
    }
  },
  mo3giMines: {
    name:'Скрытые мины', short:'E', type:'point', maxLevel:4,
    cd:[0,0,0,0,0], mana:[0,80,95,110,125], range:850, mineSkill:true,
    desc:'Ставит невидимую для врагов мину. Мина взрывается при наступании или через 60 секунд. Максимум: 3, на 4 уровне — 5.',
    cast(h,x,y,lvl){
      const maxMines=(lvl>=4?5:3)+(h.mo3giMineBonus||0);
      const active=mo3giMines.filter(mine=>mine.owner===h&&!mine.dead);
      if(h.mineLock||active.length>=maxMines){ h.mineLock=true; flashMsg(h,'Достигнут лимит мин'); return; }
      const maxPlacement = 220;
      const dx = x - h.x, dy = y - h.y;
      const dist = Math.hypot(dx,dy);
      let px = x, py = y;
      if(dist > maxPlacement){
        const k = maxPlacement / Math.max(dist, 1);
        px = h.x + dx * k;
        py = h.y + dy * k;
        flashMsg(h,'Мина только рядом с Мо3ги');
      }
      mo3giMines.push({x:clamp(px,60,WORLD-60),y:clamp(py,60,WORLD-60),team:h.team,owner:h,level:lvl,life:60,dead:false});
      if(active.length+1>=maxMines) h.mineLock=true;
      fxRing(px,py,38,'#a5ff62',0.35); addText(px,py-40,'МИНА УСТАНОВЛЕНА','#baff7b',0.9,13);
    }
  },
  mo3giBike: {
    name:'Зелёный байк', short:'R', type:'self', maxLevel:3,
    cd:[0,60,60,60], mana:[0,0,0,0], ult:true,
    desc:'15 секунд мчится на зелёном байке: давит врагов на 50 урона, получает щит и не может стрелять.',
    cast(h){
      if(h.bikeSpeedBoost) h.speed-=h.bikeSpeedBoost;
      h.bikeSpeedBoost=260; h.speed+=h.bikeSpeedBoost;
      h.bikeTimer=15; h.bikeHitTimer=0; h.bikeShieldTimer=15; h.attackTarget=null;
      addText(h.x,h.y-72,'ЗЕЛЁНЫЙ БАЙК — 15 СЕКУНД','#8dffad',1.3,18);
      fxRing(h.x,h.y,120,'#65ff9a',0.75); spawnParticles(h.x,h.y,'#b9ffd0',36,1.4);
    }
  }
};

const JUVSYUT_CHIP_SKILLS = {
  juvsyutShoulder: {
    name:'Жирный толчок', short:'Q', type:'point', maxLevel:4,
    cd:[0,13,11,9,7], mana:[0,65,75,85,95], range:360,
    desc:'Врезается в выбранную цель, наносит урон и ненадолго оглушает врагов рядом.',
    cast(h,x,y,lvl){
      const target=pickUnitAt(x,y);
      if(!target || target.team===h.team || target.dead || isBuilding(target)){
        flashMsg(h,'Наведите на врага'); return false;
      }
      const distance=Math.hypot(target.x-h.x,target.y-h.y)||1;
      const tx=clamp(target.x-(target.x-h.x)/distance*105,60,WORLD-60);
      const ty=clamp(target.y-(target.y-h.y)/distance*105,60,WORLD-60);
      if(canMoveTo(tx,ty,h.radius)) { h.x=tx; h.y=ty; }
      const radius=150+12*lvl;
      for(const unit of units){
        if(unit.dead||unit.team===h.team||unit.team===2||isBuilding(unit)) continue;
        if(Math.hypot(unit.x-target.x,unit.y-target.y)<=radius+unit.radius){
          applyDamage(unit,abilityDamage(h,145+62*lvl),h);
          unit.stunTimer=Math.max(unit.stunTimer,0.45+lvl*0.08);
        }
      }
      fxBeam(h.x,h.y,target.x,target.y,'#f2a36f',0.3);
      fxRing(target.x,target.y,radius,'#f2a36f',0.65);
      addText(target.x,target.y-68,'ЖИРНЫЙ ТОЛЧОК','#ffd0a8',1.1,16);
    }
  },
  juvsyutGuard: {
    name:'Сало-щит', short:'W', type:'self', maxLevel:4,
    cd:[0,20,18,16,14], mana:[0,75,85,95,105],
    desc:'Покрывается защитным слоем: снижает входящий урон, даёт броню и восстановление здоровья.',
    cast(h,x,y,lvl){
      h.buffs=h.buffs.filter(buff=>buff.type!=='juvsyutGuard');
      h.addBuff({type:'juvsyutGuard',multiplier:0.72-lvl*0.025,t:7+lvl,});
      h.addBuff({type:'armor',val:4+2*lvl,t:7+lvl});
      h.addBuff({type:'hpregen',val:8+4*lvl,t:7+lvl});
      h.hp=Math.min(h.maxHp,h.hp+70+35*lvl);
      heroBurst(h,'#ffd0a8',105,30);
      addText(h.x,h.y-66,'САЛО-ЩИТ','#ffd0a8',1.2,17);
    }
  },
  juvsyutRoll: {
    name:'Разбег', short:'E', type:'self', maxLevel:4,
    cd:[0,18,16,14,12], mana:[0,55,65,75,85],
    desc:'Разгоняется на 5 секунд: быстрее передвигается и получает бонус к следующей серии атак.',
    cast(h,x,y,lvl){
      h.buffs=h.buffs.filter(buff=>buff.type!=='juvsyutRoll'&&buff.id!=='juvsyutRollDamage');
      h.addBuff({type:'spd',id:'juvsyutRoll',val:0.20+lvl*0.04,t:5});
      h.addBuff({type:'as',id:'juvsyutRollAttack',val:0.24+lvl*0.05,t:5});
      h.addBuff({type:'dmg',id:'juvsyutRollDamage',val:24+18*lvl,t:5});
      fxRing(h.x,h.y,95,'#ffbd78',0.6);
      spawnParticles(h.x,h.y,'#ffd0a8',36,1.1);
      addText(h.x,h.y-66,'РАЗБЕГ','#ffbd78',1.2,17);
    }
  },
  juvsyutFeast: {
    name:'Большой обед', short:'R', type:'self', maxLevel:3,
    cd:[0,68,58,48], mana:[0,165,205,245], ult:true,
    desc:'Ударяет животом по большой области, оглушает врагов и лечится за каждого задетого противника.',
    cast(h,x,y,lvl){
      const radius=315+20*lvl;
      let count=0;
      for(const unit of units){
        if(unit.dead||unit.team===h.team||unit.team===2||isBuilding(unit)) continue;
        if(Math.hypot(unit.x-h.x,unit.y-h.y)<=radius+unit.radius){
          applyDamage(unit,abilityDamage(h,330+175*lvl),h);
          unit.stunTimer=Math.max(unit.stunTimer,1.05+lvl*0.12);
          unit.slow=0.45; unit.slowT=3;
          count++;
        }
      }
      h.hp=Math.min(h.maxHp,h.hp+count*(105+45*lvl));
      h.addBuff({type:'dmg',val:30+25*lvl,t:8});
      fxRing(h.x,h.y,radius,'#ff9d62',0.85);
      spawnParticles(h.x,h.y,'#ffe0bd',64,1.7);
      addText(h.x,h.y-82,'БОЛЬШОЙ ОБЕД  +' + count + ' ЦЕЛЕЙ','#ffd0a8',1.3,18);
    }
  },
  chipCommand: {
    name:'Королевский приказ', short:'Q', type:'point', maxLevel:4,
    cd:[0,12,10,8,6], mana:[0,70,80,90,100], range:820,
    desc:'Приказывает врагу преклонить колено: урон, замедление и короткое молчание.',
    cast(h,x,y,lvl){
      const target=pickUnitAt(x,y);
      if(!target || target.team===h.team || target.dead || isBuilding(target)){
        flashMsg(h,'Наведите приказ на врага'); return false;
      }
      applyDamage(target,abilityDamage(h,155+70*lvl),h);
      target.slow=0.45; target.slowT=2.5+lvl*0.2;
      target.silenceTimer=Math.max(target.silenceTimer,1.2+lvl*0.25);
      fxBeam(h.x,h.y,target.x,target.y,'#ffd568',0.4);
      fxRing(target.x,target.y,72,'#ffd568',0.65);
      addText(target.x,target.y-64,'ПРЕКЛОНИСЬ','#fff0a8',1.1,16);
    }
  },
  chipCrown: {
    name:'Корона власти', short:'W', type:'self', maxLevel:4,
    cd:[0,20,18,16,14], mana:[0,80,90,100,110],
    desc:'Корона усиливает Чипа: броня, скорость и постепенное восстановление здоровья.',
    cast(h,x,y,lvl){
      h.buffs=h.buffs.filter(buff=>buff.type!=='chipCrown');
      h.addBuff({type:'chipCrown',t:8+lvl});
      h.addBuff({type:'armor',val:5+2*lvl,t:8+lvl});
      h.addBuff({type:'spd',val:0.12+0.025*lvl,t:8+lvl});
      h.addBuff({type:'hpregen',val:10+5*lvl,t:8+lvl});
      fxRing(h.x,h.y,110,'#ffe39a',0.7);
      addText(h.x,h.y-68,'КОРОНА ВЛАСТИ','#ffe39a',1.2,17);
    }
  },
  chipCoin: {
    name:'Монета судьбы', short:'E', type:'point', maxLevel:4,
    cd:[0,15,13,11,9], mana:[0,60,70,80,90], range:900,
    desc:'Бросает королевскую монету в точку: враги получают урон и ненадолго теряют скорость атаки.',
    cast(h,x,y,lvl){
      const radius=125+10*lvl;
      spawnAoE(x,y,radius,120+58*lvl,h,0.12,'#ffd568');
      for(const unit of units){
        if(unit.dead||unit.team===h.team||unit.team===2||isBuilding(unit)) continue;
        if(Math.hypot(unit.x-x,unit.y-y)<=radius+unit.radius){
          unit.attackSlow=0.3+lvl*0.04; unit.attackSlowT=2.5;
          unit.slow=0.25; unit.slowT=2.5;
        }
      }
      fxBeam(h.x,h.y,x,y,'#ffd568',0.3);
      fxMark(x,y,radius,'#ffd568',0.5);
    }
  },
  chipThrone: {
    name:'Тронный переворот', short:'R', type:'point', maxLevel:3,
    cd:[0,70,60,50], mana:[0,170,210,250], range:760, ult:true,
    desc:'Телепортируется к месту удара, сбивает врагов вокруг и оставляет золотую волну.',
    cast(h,x,y,lvl){
      const distance=Math.hypot(x-h.x,y-h.y)||1;
      const tx=clamp(x,80,WORLD-80), ty=clamp(y,80,WORLD-80);
      if(distance>80 && canMoveTo(tx,ty,h.radius)){
        fxBeam(h.x,h.y,tx,ty,'#fff0a8',0.45);
        h.x=tx; h.y=ty; h.moveTarget=null;
      }
      const radius=250+25*lvl;
      for(const unit of units){
        if(unit.dead||unit.team===h.team||unit.team===2||isBuilding(unit)) continue;
        if(Math.hypot(unit.x-h.x,unit.y-h.y)<=radius+unit.radius){
          applyDamage(unit,abilityDamage(h,300+165*lvl),h);
          unit.stunTimer=Math.max(unit.stunTimer,0.85+lvl*0.12);
          unit.slow=0.5; unit.slowT=3;
        }
      }
      h.addBuff({type:'armor',val:8+3*lvl,t:6});
      fxRing(h.x,h.y,radius,'#ffd568',0.9);
      spawnParticles(h.x,h.y,'#fff0a8',70,1.8);
      addText(h.x,h.y-84,'ТРОННЫЙ ПЕРЕВОРОТ','#fff0a8',1.3,18);
    }
  }
};
Object.assign(SKILLS, MO3GI_SKILLS);
Object.assign(SKILLS, TRIBUPAINER_SKILLS);
Object.assign(SKILLS, REGINA_SKILLS);
Object.assign(SKILLS, JUVSYUT_CHIP_SKILLS);

const SHARD_SKILLS = {
  tribupainer: {name:'Огненный барабан', short:'G', type:'self', maxLevel:1, cd:[0,28], mana:[0,80], desc:'Следующий залп выпускает дополнительные огненные дробинки и расширяет поджог.', cast(h){ h.addBuff({type:'tribuShardShot',t:10}); addText(h.x,h.y-62,'ОГНЕННЫЙ БАРАБАН','#ff9d5c',1.1,15); fxRing(h.x,h.y,90,'#ff7043',0.5); }},
  mo3gi: {name:'Десантный дрон', short:'G', type:'self', maxLevel:1, cd:[0,0], mana:[0,0], range:0,
    desc:'Вызывает дрон на 15 секунд. Повторное нажатие телепортирует Мо3ги к дрону.',
    cast(h){ spawnMo3giDrone(h,Math.max(1,h.skills[0]?.level||1),true); }},
  mageHunter: {name:'Антимагический клинок', short:'G', type:'self', maxLevel:1, cd:[0,28], mana:[0,80], desc:'Следующая атака наносит дополнительный урон и полностью выжигает ману цели.', cast(h){ h.addBuff({type:'shardBlade',t:10}); addText(h.x,h.y-62,'АНТИМАГИЧЕСКИЙ КЛИНОК','#caa5ff',1.1,15); }},
  dawnMaiden: {name:'Рассветный щит', short:'G', type:'self', maxLevel:1, cd:[0,30], mana:[0,90], desc:'Снижает входящий урон и лечит союзников рядом 8 секунд.', cast(h){ h.addBuff({type:'dawnShardShield',val:0.30,t:8}); heroBurst(h,'#fff0a8',105,30); }},
  exileKnight: {name:'Клеймо изгнанника', short:'G', type:'point', maxLevel:1, cd:[0,26], mana:[0,75], range:700, desc:'Помечает врага и наносит ему мощный удар с оглушением.', cast(h,x,y){ const target=pickUnitAt(x,y); if(!target||target.team===h.team||target.dead||isBuilding(target)){ flashMsg(h,'Наведите на вражеского бойца'); return; } applyDamage(target,h.getDamage()*1.65,{team:h.team,source:h,attack:true}); target.addBuff({type:'shardMark',val:0.20,t:8}); target.stunTimer=Math.max(target.stunTimer,1.1); fxRing(target.x,target.y,78,'#ff7180',0.55); }},
  pyro: {name:'Огненный щит', short:'G', type:'self', maxLevel:1, cd:[0,28], mana:[0,80], desc:'Щит снижает урон атак на 35% на 8 секунд.', cast(h){ h.addBuff({type:'shardShield',val:0.35,t:8}); fxRing(h.x,h.y,90,'#ff9d5c',0.55); }},
  warlord: {name:'Бросок клинка', short:'G', type:'point', maxLevel:1, cd:[0,24], mana:[0,70], range:700, desc:'Наносит цели сильный удар и оглушает на 1.2 секунды.', cast(h,x,y){ const target=pickUnitAt(x,y); if(!target||target.team===h.team||target.dead||isBuilding(target)){ flashMsg(h,'Наведите на вражеского бойца'); return; } applyDamage(target,h.getDamage()*1.8,{team:h.team,source:h,attack:true}); target.stunTimer=Math.max(target.stunTimer,1.2); fxRing(target.x,target.y,70,'#8be9fd',0.5); }},
  grisha: {name:'Усиление стихий', short:'G', type:'self', maxLevel:1, cd:[0,30], mana:[0,90], desc:'Усиливает следующее заклинание Гриши на 50%.', cast(h){ h.addBuff({type:'shardSpell',val:1.5,t:12}); }},
  golly: {name:'Ледяная броня', short:'G', type:'self', maxLevel:1, cd:[0,30], mana:[0,90], desc:'Даёт 12 брони на 10 секунд.', cast(h){ h.addBuff({type:'shardArmor',val:12,t:10}); fxRing(h.x,h.y,100,'#8be9fd',0.55); }},
  sasych: {name:'Кровавая метка', short:'G', type:'point', maxLevel:1, cd:[0,28], mana:[0,70], range:700, desc:'Помечает врага: он получает на 25% больше урона 8 секунд.', cast(h,x,y){ const target=pickUnitAt(x,y); if(!target||target.team===h.team||target.dead||isBuilding(target)){ flashMsg(h,'Наведите на вражеского бойца'); return; } target.addBuff({type:'shardMark',val:0.25,t:8}); }},
  ilya: {name:'Ядовитое поле', short:'G', type:'point', maxLevel:1, cd:[0,32], mana:[0,100], range:650, desc:'Создаёт поле на 8 секунд. Враги внутри получают урон и не могут использовать способности.', cast(h,x,y){ aoes.push({x,y,radius:230,dmg:abilityDamage(h,70),manaDmg:0,team:h.team,source:h,delay:0,t:0,color:'#55e06f',applied:false,life:8,dead:false,silenceDuration:1.2,poisonField:true}); fxMark(x,y,230,'#55e06f',8); }},
  malit: {name:'Тяжёлый удар', short:'G', type:'point', maxLevel:1, cd:[0,28], mana:[0,80], range:650, desc:'Удар Малита наносит 220 урона и оглушает врага на 1 секунду.', cast(h,x,y){ const target=pickUnitAt(x,y); if(!target||target.team===h.team||target.dead||isBuilding(target)){ flashMsg(h,'Наведите на врага'); return; } applyDamage(target,220,h); target.stunTimer=Math.max(target.stunTimer,1); fxHit(target.x,target.y,'#f2c38b'); }},
  illusionist: {name:'Зеркальный зал', short:'G', type:'self', maxLevel:1, cd:[0,32], mana:[0,100], desc:'Создаёт две сильные иллюзии на 10 секунд.', cast(h){ spawnIllusion(h,{life:10,damageMultiplier:0.8,damageTakenMultiplier:1.5,angle:0}); spawnIllusion(h,{life:10,damageMultiplier:0.8,damageTakenMultiplier:1.5,angle:Math.PI}); fxRing(h.x,h.y,110,'#e8d4ff',0.65); }}
   ,shadow: {name:'Тёмный залп', short:'G', type:'point', maxLevel:1, cd:[0,28], mana:[0,90], range:700, desc:'Выпускает усиленный ближний койл, наносящий 910 урона.', cast(h,x,y){ castShadowCoil(h,x,y,1,700,910,1300,420); }}
};

const MALIT_SKILLS = {
  malitBackpack: {
    name:'Рюкзак', short:'Q', type:'point', maxLevel:4,
    cd:[0,14,12,10,8], mana:[0,70,80,90,100], range:850,
    desc:'Кидает рюкзак во врага и ненадолго оглушает его.',
    cast(h,x,y,lvl){
      const target=pickUnitAt(x,y);
      if(!target || target.team===h.team || target.dead || isBuilding(target)){ flashMsg(h,'Наведите на врага'); return; }
      target.stunTimer=Math.max(target.stunTimer,1.6);
      applyDamage(target,55+30*lvl,h);
      fxBeam(h.x,h.y,target.x,target.y,'#c79b6e',0.4);
      addText(target.x,target.y-58,'РЮКЗАК: СТАН 1.6 СЕК','#f2c38b',1.1,15);
    }
  },
  malitPassive: {
    name:'Тяжёлый разгон', short:'W', type:'self', maxLevel:1,
    cd:[0,0], mana:[0,0], desc:'Пассивно даёт +25% скорости и скорострельности.', cast(){}
  },
  malitLaunch: {
    name:'Подброс', short:'E', type:'point', maxLevel:4,
    cd:[0,18,16,14,12], mana:[0,90,100,110,120], range:700,
    desc:'Подкидывает врага и наносит умеренный урон.',
    cast(h,x,y,lvl){
      const target=pickUnitAt(x,y);
      if(!target || target.team===h.team || target.dead || isBuilding(target)){ flashMsg(h,'Наведите на врага'); return; }
      const damage = 360+70*lvl;
      applyDamage(target,damage,h); target.stunTimer=Math.max(target.stunTimer,1.2); target.liftTimer=0.65;
      addText(target.x,target.y-60,'ПОДБРОШЕН -'+damage+' HP','#ffd36b',1.1,16);
      fxRing(target.x,target.y,80,'#ffd36b',0.55);
    }
  },
  malitLaser: {
    name:'Лазерный круг', short:'R', type:'self', maxLevel:3,
    cd:[0,65,58,52], mana:[0,170,210,250], ult:true,
    desc:'Два оборота большого лазерного круга вокруг Малита.',
    cast(h,x,y,lvl){
      const radius=285;
      for(let turn=0;turn<2;turn++){
        for(const unit of units){
          if(unit.team===h.team || unit.dead || isBuilding(unit)) continue;
          if(Math.hypot(unit.x-h.x,unit.y-h.y)<radius) applyDamage(unit,105+35*lvl,h);
        }
        fxs.push({type:'malitLaser',x:h.x,y:h.y,r:radius,t:turn*0.35,life:0.75,color:'#9df5ff',phase:turn});
      }
      spawnRadialBlades(h.x,h.y,radius,'#ffc857',32);
      spawnParticles(h.x,h.y,'#9df5ff',42,1.8);
      fxRing(h.x,h.y,radius,'#9df5ff',0.8);
      addText(h.x,h.y-70,'ЛАЗЕРНЫЙ КРУГ x2','#9df5ff',1.2,17);
    }
  }
};
Object.assign(SKILLS, MALIT_SKILLS);

function triggerAftershockPulse(hero){
  const skill = hero.skills && hero.skills.find(sk => sk.id === 'earthshakerAftershock');
  if(!skill || skill.level <= 0) return;
  const lvl = skill.level;
  const radius = 235 + lvl*12;
  const dmg = abilityDamage(hero, 52 + lvl*27);
  const stunDuration = 0.32 + lvl*0.06;
  for(const unit of units){
    if(unit.dead || unit.team === hero.team || isBuilding(unit)) continue;
    if(Math.hypot(unit.x-hero.x, unit.y-hero.y) <= radius + unit.radius){
      applyDamage(unit, dmg, hero);
      unit.stunTimer = Math.max(unit.stunTimer, stunDuration);
    }
  }
  fxRing(hero.x, hero.y, radius, '#8bd4ff', 0.4);
  spawnRadialBlades(hero.x, hero.y, radius, '#c9a06b', 22);
  spawnParticles(hero.x, hero.y, '#a08660', 14, 1.1);
}

const EARTHSHAKER_SKILLS = {
  earthshakerFissure: {
    name:'Fissure', short:'Q', type:'point', maxLevel:4,
    cd:[0,17,15,13,11], mana:[0,110,120,130,140], range:820,
    desc:'Создаёт непроходимую каменную стену вдоль линии удара: наносит урон и оглушает врагов, временно перекрывая проход.',
    cast(h,x,y,lvl){
      const angle = Math.atan2(y-h.y, x-h.x);
      h.facing = angle;
      const dist = clamp(Math.hypot(x-h.x, y-h.y), 90, 820);
      const cx = clamp(h.x + Math.cos(angle)*dist, 60, WORLD-60);
      const cy = clamp(h.y + Math.sin(angle)*dist, 60, WORLD-60);
      const length = 380 + lvl*36;
      const dmg = abilityDamage(h, 130 + 57*lvl);
      const stunDuration = 1.1 + lvl*0.22;
      /* Как в Dota 2: разлом тянется вдоль направления удара (через героя
         к точке прицела), а не поперёк него. */
      walls.push({
        x:cx, y:cy, angle, length, width:32,
        team:h.team, source:h, dmg, slow:0.45, life:3.6 + lvl*0.3, t:0,
        hit:new Set(), stun:stunDuration, blocking:true, style:'fissure'
      });
      const halfLen = length/2;
      const startX = cx - Math.cos(angle)*halfLen, startY = cy - Math.sin(angle)*halfLen;
      const endX = cx + Math.cos(angle)*halfLen, endY = cy + Math.sin(angle)*halfLen;
      fxRing(cx, cy, halfLen, '#6b5842', 0.55);
      fxBeam(startX, startY, endX, endY, '#8a6b45', 0.6);
      /* Каскад из вздымающихся кусков камня и пыли вдоль всего разлома,
         как рябь от удара тотемом о землю, плюс ударная волна у героя. */
      const segments = Math.max(5, Math.round(length/55));
      for(let i=0;i<=segments;i++){
        const t = i/segments;
        const px = startX + (endX-startX)*t, py = startY + (endY-startY)*t;
        const delay = Math.abs(t-0.5)*0.16;
        setTimeout(()=>{
          spawnParticles(px, py, '#c9a878', 10, 0.85);
          spawnParticles(px, py, '#4a3a26', 6, 0.5);
          fxRing(px, py, 26, '#a68a5f', 0.3);
        }, delay*1000);
      }
      spawnParticles(cx, cy, '#a68a5f', 34, 1.25);
      spawnRadialBlades(h.x, h.y, 90, '#6b5842', 14);
      fxRing(h.x, h.y, 70, '#c9a06b', 0.4);
      addText(h.x, h.y-74, 'FISSURE', '#c9a06b', 1.25, 18);
      return true;
    }
  },
  earthshakerEnchantTotem: {
    name:'Enchant Totem', short:'W', type:'self', maxLevel:4,
    cd:[0,12,10,8,6], mana:[0,55,60,65,70],
    desc:'Усиливает следующую атаку бонусным уроном и оглушает цель при попадании. С Аганимом превращается в прыжок с приземлением, наносящим урон и стан по области.',
    cast(h,x,y,lvl){
      if(hasScepter(h)){
        if(h.arcMotion) return false;
        let tx, ty;
        if(h.isPlayer){ tx = mouse.wx; ty = mouse.wy; }
        else {
          const angle = Number.isFinite(h.facing) ? h.facing : 0;
          tx = h.x + Math.cos(angle)*420; ty = h.y + Math.sin(angle)*420;
        }
        const dist = clamp(Math.hypot(tx-h.x, ty-h.y), 0, 650);
        const angle = Math.atan2(ty-h.y, tx-h.x);
        const lx = clamp(h.x + Math.cos(angle)*dist, 60, WORLD-60);
        const ly = clamp(h.y + Math.sin(angle)*dist, 60, WORLD-60);
        const dmg = abilityDamage(h, 98 + 51*lvl);
        const stunDuration = 1.0 + lvl*0.15;
        startArcMotion(h, lx, ly, 0.5, () => {
          for(const unit of units){
            if(unit.dead || unit.team === h.team || isBuilding(unit)) continue;
            if(Math.hypot(unit.x-lx, unit.y-ly) <= 190){
              applyDamage(unit, dmg, h);
              unit.stunTimer = Math.max(unit.stunTimer, stunDuration);
            }
          }
          fxRing(lx, ly, 190, '#8bd4ff', 0.5);
          spawnRadialBlades(lx, ly, 190, '#c9a06b', 28);
          spawnParticles(lx, ly, '#8bd4ff', 26, 1.3);
          addText(lx, ly-70, 'ENCHANT TOTEM', '#8bd4ff', 1.2, 17);
        }, 120);
        heroBurst(h, '#8bd4ff', 90, 18);
        return true;
      }
      h.buffs = h.buffs.filter(buff => buff.type !== 'enchantTotem');
      h.addBuff({type:'enchantTotem', t:6, val:abilityDamage(h, 75 + 42*lvl), stun:0.55 + lvl*0.1});
      heroBurst(h, '#8bd4ff', 68, 16);
      addText(h.x, h.y-70, 'ENCHANT TOTEM', '#8bd4ff', 1.1, 16);
      return true;
    }
  },
  earthshakerAftershock: {
    name:'Aftershock', short:'E', type:'self', passive:true, maxLevel:4,
    cd:[0,0,0,0,0], mana:[0,0,0,0,0],
    desc:'Пассивно: при использовании любого заклинания создаёт волну урона и оглушения вокруг героя.',
    cast(){}
  },
  earthshakerEchoSlam: {
    name:'Echo Slam', short:'R', type:'self', maxLevel:3, ult:true,
    cd:[0,110,95,80], mana:[0,175,220,265],
    desc:'Ударная волна вокруг героя: наносит урон каждому врагу рядом и дополнительный урон за каждого другого врага возле него.',
    cast(h,x,y,lvl){
      const mainRadius = 480;
      const echoRadius = 280;
      const baseDamage = abilityDamage(h, 255 + 156*lvl);
      const echoDamage = abilityDamage(h, 150 + 96*lvl);
      const enemies = units.filter(u => !u.dead && u.team !== h.team && !isBuilding(u) &&
        Math.hypot(u.x-h.x, u.y-h.y) <= mainRadius + u.radius);
      for(const target of enemies){
        let nearby = 0;
        for(const other of enemies){
          if(other !== target && Math.hypot(other.x-target.x, other.y-target.y) <= echoRadius) nearby++;
        }
        const totalDamage = baseDamage + echoDamage*nearby;
        applyDamage(target, totalDamage, h);
        target.stunTimer = Math.max(target.stunTimer, 0.4);
        fxRing(target.x, target.y, 42, '#8bd4ff', 0.35);
        addText(target.x, target.y-target.radius-18, '-'+Math.round(totalDamage), '#8bd4ff', 0.9, 15);
      }
      heroBurst(h, '#8bd4ff', mainRadius, 50);
      fxRing(h.x, h.y, mainRadius, '#5a4632', 0.85);
      spawnGroundCrack(h.x, h.y, mainRadius, '#ffd23f', 2.1);
      spawnRadialBlades(h.x, h.y, mainRadius, '#c9a06b', 42);
      addText(h.x, h.y-92, 'ECHO SLAM', '#fff2c8', 1.5, 21);
      return true;
    }
  }
};
Object.assign(SKILLS, EARTHSHAKER_SKILLS);

function grantShardSkill(hero){
  if(!hero || hero.shardSkill) return false;
  const def=SHARD_SKILLS[hero.def.id] || {name:'Осколочный удар',short:'G',type:'point',maxLevel:1,cd:[0,30],mana:[0,80],range:650,desc:'Наносит 300 урона врагу.',cast(h,x,y){const target=pickUnitAt(x,y);if(target&&target.team!==h.team&&!target.dead&&!isBuilding(target))applyDamage(target,300,h);}};
  if(!def) return false;
  hero.shardSkill={id:'aghanimShard',name:def.name,color:'#8be9fd'};
  hero.skills.push({id:'aghanimShard',def,level:1,cd:0,free:true,isShard:true});
  addText(hero.x,hero.y-80,'ПОЛУЧЕН: '+def.name,'#8be9fd',1.4,18);
  return true;
}

const INVOKE_COOLDOWNS = {
  '300': 8, '030': 16, '003': 20, '210': 24, '201': 18,
  '120': 14, '021': 18, '102': 40, '012': 22, '111': 20
};

/* =========================================================
   ГЕРОИ
   ========================================================= */
const HERO_DEFS = [
  {
    id:'pyro', name:'Пиромант', title:'Маг огня',
    color:'#a52d18', color2:'#ffcf63',
    baseHp:640, hpPerLvl:92, baseMp:350, mpPerLvl:48,
    baseDmg:52, dmgPerLvl:6.5, speed:158,
    atkRange:520, atkTime:1.15,
    baseArmor:2, armorPerLvl:0.5, vision:1080,
    hpRegen:1.5, mpRegen:2.4,
    skills:['fireball','flamewave','blink','meteor']
  },
  {
    id:'warlord', name:'Вождь', title:'Мастер клинка',
    color:'#4fc3f7', color2:'#b3e5fc',
    baseHp:980, hpPerLvl:130, baseMp:300, mpPerLvl:40,
    baseDmg:86, dmgPerLvl:9, speed:170,
    atkRange:150, atkTime:1.0,
    baseArmor:7, armorPerLvl:0.9, vision:1020,
    hpRegen:3.2, mpRegen:2.0,
    skills:['cleave','warcry','charge','bladeStorm']
  },
  {
    id:'grisha', name:'Гриша', title:'Маг трёх стихий',
    color:'#b06fff', color2:'#e0c8ff',
    baseHp:600, hpPerLvl:85, baseMp:420, mpPerLvl:60,
    baseDmg:30, dmgPerLvl:3.5, speed:155,
    atkRange:520, atkTime:1.2,
    baseArmor:1, armorPerLvl:0.4, vision:1120,
    hpRegen:1.2, mpRegen:3.2,
    skills:['quas','wex','exort','invoke','beam']
  },
  {
    id:'golly', name:'Голли', title:'Повелитель льда',
    color:'#174d78', color2:'#bfefff',
    baseHp:740, hpPerLvl:105, baseMp:330, mpPerLvl:42,
    baseDmg:48, dmgPerLvl:6, speed:150,
    atkRange:430, atkTime:1.15,
    baseArmor:3, armorPerLvl:0.55, vision:1050,
    hpRegen:1.8, mpRegen:2.4,
    skills:['gollyCrystal','gollyStorm','gollyHeart','gollyGolems','gollyRed']
  },
  {
    id:'sasych', name:'Сасыч', title:'Кровавый охотник',
    color:'#9d1d35', color2:'#ff7180',
    baseHp:650, hpPerLvl:82, baseMp:240, mpPerLvl:30,
    baseDmg:48, dmgPerLvl:5, speed:145,
    atkRange:150, atkTime:1.0,
    baseArmor:2, armorPerLvl:0.35, vision:1000,
    hpRegen:1.2, mpRegen:1.4,
    skills:['bloodrage','bloodRite','thirst','rupture']
  },
  {
    id:'ilya', name:'Илья', title:'Жирный повелитель ауры',
    color:'#6c9b58', color2:'#c8ef8d',
    baseHp:1080, hpPerLvl:145, baseMp:280, mpPerLvl:34,
    baseDmg:72, dmgPerLvl:8, speed:132,
    atkRange:155, atkTime:1.15,
    baseArmor:7, armorPerLvl:0.8, vision:980,
    hpRegen:3.5, mpRegen:1.8,
    skills:['ilyaPull','ilyaAura','ilyaBelly','ilyaFeast']
  },
  {
    id:'malit', name:'Малит', title:'Тяжёлый ближник',
    color:'#b97952', color2:'#f0c69a',
    baseHp:980, hpPerLvl:132, baseMp:260, mpPerLvl:30,
    baseDmg:74, dmgPerLvl:8, speed:140,
    atkRange:145, atkTime:1.05,
    baseArmor:6, armorPerLvl:0.7, vision:980,
    hpRegen:2.8, mpRegen:1.7,
    skills:['malitBackpack','malitPassive','malitLaunch','malitLaser']
  },
  {
    id:'arcady', name:'Аркадий', title:'Огненный стрелок',
    color:'#ef5b32', color2:'#ffd08a',
    baseHp:690, hpPerLvl:88, baseMp:360, mpPerLvl:45,
    baseDmg:58, dmgPerLvl:6, speed:150,
    atkRange:560, atkTime:1.1,
    baseArmor:2, armorPerLvl:0.45, vision:1080,
    hpRegen:1.6, mpRegen:2.5,
    skills:['arcadyFireballs','arcadyMolotov','arcadyFocus','arcadyDynamite']
  },
  {
    id:'illusionist', name:'Иллюзионист', title:'Повелитель отражений',
    color:'#9b6cff', color2:'#eadbff',
    baseHp:720, hpPerLvl:95, baseMp:340, mpPerLvl:42,
    baseDmg:64, dmgPerLvl:6, speed:162,
    atkRange:500, atkTime:1.08,
    baseArmor:2, armorPerLvl:0.45, vision:1080,
    hpRegen:1.6, mpRegen:2.2,
    skills:['illusionistDouble','illusionistSwap','illusionistPhantom','illusionistFinale']
  },
  {
    id:'shadow', name:'Шадоу', title:'Повелитель душ',
    color:'#110507', color2:'#ff4b24',
    baseHp:910, hpPerLvl:114.4, baseMp:468, mpPerLvl:58.5,
    baseDmg:67.6, dmgPerLvl:7.15, speed:200.2,
    atkRange:221, atkTime:0.83,
    baseArmor:2.6, armorPerLvl:0.585, vision:1365,
    hpRegen:1.82, mpRegen:3.12,
    skills:['shadowCoilQ','shadowCoilW','shadowCoilE','shadowRequiem']
  },
  {
    id:'electricGosha', name:'Электрический Гоша', title:'Повелитель нестабильного электричества',
    color:'#237aa3', color2:'#7feaff',
    baseHp:760, hpPerLvl:98, baseMp:520, mpPerLvl:72,
    baseDmg:58, dmgPerLvl:6.5, speed:185,
    atkRange:180, atkTime:0.95,
    baseArmor:3, armorPerLvl:0.5, vision:1100,
    hpRegen:1.8, mpRegen:3.8,
    skills:['electricRemnant','electricVortex','electricOverload','ballLightning']
  },
  {
    id:'mo3gi', name:'Мо3ги', title:'Военный инженер-десантник',
    color:'#294638', color2:'#7dffb0',
    baseHp:820, hpPerLvl:108, baseMp:330, mpPerLvl:42,
    baseDmg:62, dmgPerLvl:6.8, speed:158,
    atkRange:500, atkTime:1.05,
    baseArmor:6, armorPerLvl:0.65, vision:1080,
    hpRegen:2.2, mpRegen:2.5,
    skills:['mo3giDrone','mo3giGift','mo3giMines','mo3giBike']
  },
  {
    id:'tribupainer', name:'Трибупейнер', title:'Повелитель огромного дробовика',
    color:'#4a3028', color2:'#ffb36b',
    balanceScale:1.05,
    baseHp:900, hpPerLvl:120, baseMp:300, mpPerLvl:38,
    baseDmg:30, dmgPerLvl:4, speed:145,
    atkRange:560, atkTime:1.15,
    baseArmor:5, armorPerLvl:0.6, vision:1040,
    hpRegen:2.2, mpRegen:2.0,
    skills:['tribuIncendiary','tribuShield','tribuInvisibility','tribuExecution'],
    weapon:{type:'shotgun',color:'#ffb36b',size:0.4125}
  },
  {
    id:'mageHunter', name:'Охотник на магов', title:'Ближний carry',
    balanceScale:0.85,
    color:'#24184d', color2:'#a980ff', baseHp:850, hpPerLvl:114,
    baseMp:290, mpPerLvl:36, baseDmg:92, dmgPerLvl:9, speed:220,
    atkRange:150, atkTime:0.72, baseArmor:5, armorPerLvl:0.7,
    vision:1020, hpRegen:2.4, mpRegen:1.8,
    skills:['mageHunterManaBurn','mageHunterBlink','mageHunterReflect','mageHunterUlt'], weapon:{type:'dualBlades',color:'#d58cff',size:1.25,followFacing:true}
  },
  {
    id:'regina', name:'Ригина', title:'Героиня яростного натиска',
      color:'#6e3048', color2:'#ff9fbd',
      baseHp:940, hpPerLvl:126, baseMp:290, mpPerLvl:36,
      baseDmg:86, dmgPerLvl:9.2, speed:196,
      atkRange:155, atkTime:0.82, baseArmor:6, armorPerLvl:0.72,
      vision:1000, hpRegen:2.6, mpRegen:1.8,
      skills:['reginaDispose','reginaRebound','reginaUnleash'], weapon:{type:'dualBlades',color:'#ff9fbd',size:1.05}
    },
  {
    id:'dawnMaiden', name:'Рассветная дева', title:'Танк / инициатор',
    balanceScale:0.78, damageScale:1,
    color:'#8a5424', color2:'#fff3b0', baseHp:1160, hpPerLvl:154,
    baseMp:330, mpPerLvl:39, baseDmg:150, dmgPerLvl:8.6, speed:150,
    atkRange:155, atkTime:0.99, baseArmor:9, armorPerLvl:0.95,
    vision:1000, hpRegen:3.8, mpRegen:2.0,
    skills:['dawnHammer','dawnHammerThrow','dawnBlessing','dawnGlobalJump'], weapon:{type:'hammer',color:'#ffe39a',size:1.55}
  },
  {
    id:'exileKnight', name:'Рыцарь-изгнанник', title:'Ближний carry',
    balanceScale:0.84, damageScale:1,
    color:'#18384f', color2:'#9bdfff', baseHp:980, hpPerLvl:132,
    baseMp:280, mpPerLvl:34, baseDmg:135, dmgPerLvl:11, speed:178,
    atkRange:145, atkTime:0.84, baseArmor:7, armorPerLvl:0.82,
    vision:1010, hpRegen:3.0, mpRegen:1.7,
    skills:['exileGauntlet','exileCleave','exileBattleCry','exileGodRage'], weapon:{type:'greatsword',color:'#ff707a',size:1.5}
  },
  {
    id:'juvsyut', name:'Джувсют', title:'Жирный громила',
    color:'#7b432d', color2:'#f2a36f',
    baseHp:980, hpPerLvl:132, baseMp:285, mpPerLvl:34,
    baseDmg:76, dmgPerLvl:7.8, speed:140,
    atkRange:150, atkTime:1.08, baseArmor:6, armorPerLvl:0.72,
    vision:990, hpRegen:3.1, mpRegen:1.8,
    skills:['juvsyutShoulder','juvsyutGuard','juvsyutRoll','juvsyutFeast'],
    weapon:{type:'club',color:'#d69a61',size:1.1}
  },
  {
    id:'chip', name:'Чип', title:'Король золотой арены',
    color:'#49376d', color2:'#ffd568',
    baseHp:820, hpPerLvl:108, baseMp:370, mpPerLvl:46,
    baseDmg:64, dmgPerLvl:6.5, speed:172,
    atkRange:480, atkTime:1.08, baseArmor:4, armorPerLvl:0.5,
    vision:1080, hpRegen:2.0, mpRegen:2.8,
    skills:['chipCommand','chipCrown','chipCoin','chipThrone'],
    weapon:{type:'scepter',color:'#ffd568',size:1.0}
  },
  {
    id:'juggernaut', name:'Джаггернаут', title:'Мастер катаны',
    color:'#8a241f', color2:'#ffe7a2',
    baseHp:1020, hpPerLvl:132, baseMp:280, mpPerLvl:34,
    baseDmg:108, dmgPerLvl:10, speed:190,
    atkRange:155, atkTime:0.9, baseArmor:7, armorPerLvl:0.78,
    vision:1000, hpRegen:3.0, mpRegen:1.8,
    skills:['juggernautBladeFury','juggernautHealingWard','juggernautBladeDance','juggernautOmnislash'],
    weapon:{type:'katana',color:'#fff0bd',size:1.12,followFacing:true}
  },
  {
    id:'earthshaker', name:'Шмедик', title:'Повелитель камня',
    color:'#5b4a36', color2:'#8bd4ff',
    baseHp:900, hpPerLvl:126, baseMp:300, mpPerLvl:38,
    baseDmg:92, dmgPerLvl:8.6, speed:150,
    atkRange:150, atkTime:1.65, baseArmor:5, armorPerLvl:0.62,
    vision:1000, hpRegen:2.6, mpRegen:2.0,
    skills:['earthshakerFissure','earthshakerEnchantTotem','earthshakerAftershock','earthshakerEchoSlam'],
    weapon:{type:'totem',color:'#8bd4ff',size:1.15,followFacing:true}
  },
  {
    id:'sniper', name:'Снайпер', title:'Меткий стрелок',
    color:'#7e3f24', color2:'#ffd27a',
    baseHp:720, hpPerLvl:88, baseMp:330, mpPerLvl:40,
    baseDmg:74, dmgPerLvl:7.5, speed:158,
    atkRange:690, atkTime:1.18, baseArmor:3, armorPerLvl:0.48,
    vision:1250, hpRegen:1.6, mpRegen:2.4,
    skills:['sniperShrapnel','sniperHeadshot','sniperTakeAim','sniperAssassinate'],
    weapon:{type:'sniperRifle',color:'#d9b079',size:1.0,followFacing:true}
  }
];

function offerTalent(hero){
  const talents = HERO_TALENTS[hero.def.id] || [];
  const tier = hero.talents.length;
  if(!talents.length || tier >= 5) return;
  const choices = [talents[tier], talents[(tier + 1) % talents.length]]
    .filter((talent, index, list) => talent && !hero.talents.includes(talent[0]) && list.findIndex(item => item && item[0] === talent[0]) === index);
  if(hero.isPlayer){
    talentHero = hero;
    talentChoices = choices;
    talentOpen = true;
  } else {
    hero.applyTalent(choices[Math.floor(Math.random() * choices.length)]);
  }
}

class Hero extends Unit {
  constructor(def, team){
    const balanceScale = def.balanceScale || 1;
    super({
      x:BASES[team].x, y:BASES[team].y, team,
      radius:24, speed:def.speed * balanceScale,
      hp:def.baseHp * balanceScale + 500 + 350, dmg:def.baseDmg * (def.damageScale || balanceScale),
      atkRange:def.atkRange, atkTime:def.atkTime,
      armor:def.baseArmor * balanceScale, vision:def.vision,
      type:'hero', xpValue:420
    });
    this.def = def;
    this.level = 1; this.xp = 0; this.skillPoints = 1;
    this.maxMp = def.baseMp * balanceScale; this.mp = this.maxMp;
    this.mpRegen = def.mpRegen * balanceScale; this.hpRegen = def.hpRegen * balanceScale;
    this.respawnTimer = 0; this.aiTimer = 0; this.isPlayer = false;
    this.skills = def.skills.map(id => ({id, def:SKILLS[id], level:0, cd:0}));
    this.kills = 0; this.assists = 0; this.deaths = 0;
    this.killStreak = 0; this.lastHeroKillTime = -Infinity;
    this.talents = [];
    this.coins = 600; this.coinTimer = 0;
    this.shopTimer = 6 + Math.random()*5;
    this.stuckTimer = 0; this.lastAiX = this.x; this.lastAiY = this.y;
    this.combatTimer = 0;
    this.assignedLane = 0;
    this.laneTimer = 0;
    this.jungleTimer = 0;
    this.laneState = 'lane';
    this.timurPillow = 0;
    this.shadowSouls = 0;
    this.shadowCasting = false;
    this.omnislashWasActive = false;
    this.shrapnelMaxCharges = def.id === 'sniper' ? 2 : 0;
    this.shrapnelCharges = this.shrapnelMaxCharges;
    this.shrapnelRechargeTimers = [];
    this.assassinating = false;
    this.inventory = Array(6).fill(null);
    this.spellCooldowns = {};
    this.lastInvokeKey = null;
    this.mineLock = false;
    this.bikeTimer = 0;
    this.bikeHitTimer = 0;
    this.bikeShieldTimer = 0;
    if(def.id === 'grisha'){
      this.orbs = ['Q','W','E'];
      this.skills[3].level = 1;
      this.skills[3].free = true;
    }
    if(def.id === 'malit'){
      this.skills[1].level = 1;
      this.skills[1].free = true;
    }
    if(def.id === 'golly'){
      this.skills[3].level = 1;
      this.skills[3].free = true;
    }
  }
  /* Уровни 1–6 сохраняют прежнюю стоимость.
     С 7-го опыт дешевле старой кривой на 35%.
     С 8-го по 30-й стоимость дополнительно снижается по мере роста уровня,
     чтобы левел легче фармился в поздней игре (иначе к 20-й минуте
     реально добраться максимум до 9-14 уровня). */
  xpForNext(){
    const original = 220 + (this.level-1)*260 + this.level*this.level*20;
    let mult;
    if(this.level < 7) mult = 1.5;
    else if(this.level < 8) mult = 0.65;
    else mult = Math.max(0.05, 0.30 * Math.pow(0.895, this.level - 8));
    return Math.round(original * mult);
  }
  gainXp(amount){
    if(this.level >= 30) return;
    this.xp += amount;
    while(this.level < 30 && this.xp >= this.xpForNext()){
      this.xp -= this.xpForNext();
      this.levelUp();
      if(talentOpen && this.isPlayer) break;
    }
  }
  levelUp(){
    this.level++; this.skillPoints++;
    const d = this.def;
    const balanceScale = d.balanceScale || 1;
    this.maxHp += d.hpPerLvl * balanceScale; this.hp = Math.min(this.maxHp, this.hp + d.hpPerLvl * balanceScale);
    this.maxMp += d.mpPerLvl * balanceScale; this.mp = Math.min(this.maxMp, this.mp + d.mpPerLvl * balanceScale);
    this.dmg += d.dmgPerLvl * (d.damageScale || balanceScale); this.armor += d.armorPerLvl * balanceScale;
    if(this.level >= 10 && this.level % 5 === 0) offerTalent(this);
    addText(this.x, this.y-70, 'УРОВЕНЬ ' + this.level, '#ffe066', 1.4, 20);
    fxRing(this.x, this.y, 110, '#ffe066', 0.7);
  }
  applyTalent(talent){
    const [name, bonus] = talent;
    this.talents.push(name);
    if(bonus.maxHp){ this.maxHp += bonus.maxHp; this.hp += bonus.hp || bonus.maxHp; }
    if(bonus.maxMp){ this.maxMp += bonus.maxMp; this.mp += bonus.mp || bonus.maxMp; }
    if(bonus.damage) this.dmg += bonus.damage;
    if(bonus.speed) this.speed += bonus.speed;
    if(bonus.speedPercent) this.speed *= 1 + bonus.speedPercent;
    if(bonus.armor) this.armor += bonus.armor;
    if(bonus.spellAmp) this.spellAmp = (this.spellAmp || 0) + bonus.spellAmp;
    if(bonus.auraDamage) this.auraDamageBonus = (this.auraDamageBonus || 0) + bonus.auraDamage;
    if(bonus.illusionDamage) this.illusionDamageBonus = (this.illusionDamageBonus || 0) + bonus.illusionDamage;
    if(bonus.illusionLife) this.illusionLifeBonus = (this.illusionLifeBonus || 0) + bonus.illusionLife;
    if(bonus.ultimateIllusions) this.ultimateIllusions = (this.ultimateIllusions || 0) + bonus.ultimateIllusions;
    if(bonus.shadowSoulGain) this.shadowSoulGain = (this.shadowSoulGain || 0) + bonus.shadowSoulGain;
    if(bonus.ultimateSoulBonus) this.ultimateSoulBonus = (this.ultimateSoulBonus || 0) + bonus.ultimateSoulBonus;
    if(bonus.mo3giDroneLife) this.mo3giDroneLife = (this.mo3giDroneLife || 0) + bonus.mo3giDroneLife;
    if(bonus.mo3giMineBonus) this.mo3giMineBonus = (this.mo3giMineBonus || 0) + bonus.mo3giMineBonus;
    addText(this.x, this.y - 86, 'ТАЛАНТ: ' + name, '#8be9fd', 1.6, 16);
    fxRing(this.x, this.y, 120, '#8be9fd', 0.7);
  }
  canLevelSkill(i){
    const s = this.skills[i];
    if(!s) return false;
    if(s.free) return false;
    if(this.skillPoints <= 0) return false;
    if(s.level >= s.def.maxLevel) return false;
    if(s.def.ult && this.level < 6) return false;
    return true;
  }
  levelSkill(i){
    if(!this.canLevelSkill(i)) return false;
    this.skills[i].level++;
    this.skillPoints--;
    playAbilitySound('level');
    fxRing(this.x, this.y, 70, '#9ad8ff', 0.4);
    addText(this.x, this.y-84,
      SKILLS[this.skills[i].id].name + ' ур.' + this.skills[i].level,
      '#9ad8ff', 1.0, 14);
    if(this.def.id === 'grisha') applyOrbBuffs(this);
    return true;
  }
  autoLevelSkills(){
    if(this.skillPoints <= 0) return;

    if(this.def.id === 'grisha'){
      /* 1) Орбы до 2 уровня каждый */
      for(let i=0;i<3;i++){
        if(this.skills[i].level < 2 && this.canLevelSkill(i)){
          this.levelSkill(i); return;
        }
      }
      /* 2) Луч до 2 уровня */
      if(this.skills[4] && this.skills[4].level < 2 && this.canLevelSkill(4)){
        this.levelSkill(4); return;
      }
      /* 3) Докачиваем всё остальное */
      for(let i=0;i<5;i++){
        if(this.canLevelSkill(i)){ this.levelSkill(i); return; }
      }
      return;
    }

    if(this.level >= 6 && this.canLevelSkill(3)){ this.levelSkill(3); return; }
    let bestI=-1, bestLvl=99;
    for(let i=0;i<3;i++){
      if(this.canLevelSkill(i) && this.skills[i].level < bestLvl){
        bestLvl = this.skills[i].level; bestI = i;
      }
    }
    if(bestI >= 0) this.levelSkill(bestI);
  }
  update(dt){
    if(this.dead){
      for(const s of this.skills) if(s.cd > 0) s.cd = Math.max(0, s.cd - dt);
      for(const key of Object.keys(this.spellCooldowns)) this.spellCooldowns[key] = Math.max(0, this.spellCooldowns[key] - dt);
      this.respawnTimer = Math.max(0,this.respawnTimer-dt);
      if(this.respawnTimer <= 0){
        this.dead = false;
        this.hp = this.maxHp; this.mp = this.maxMp;
        this.x = BASES[this.team].x; this.y = BASES[this.team].y;
        this.moveTarget = null; this.attackTarget = null;
        this.combatTimer = 0;
        this.buffs.length = 0;
        this.invulnerable = false;
        this.omnislashWasActive = false;
        this.lastInvokeKey = null;
        this.bikeTimer=0; this.bikeShieldTimer=0;
        if(this.bikeSpeedBoost){ this.speed-=this.bikeSpeedBoost; this.bikeSpeedBoost=0; }
        if(controlledUnit===this) controlledUnit=playerHero;
        if(this.def.id === 'grisha') applyOrbBuffs(this);
        this.deaths++;
        fxRing(this.x, this.y, 160, '#ffffff', 0.9);
      }
      return;
    }
    this.combatTimer = Math.max(0, (this.combatTimer || 0) - dt);
    this.tickTimers(dt);
    const bladeFury=this.buffs.find(buff=>buff.type==='bladeFury');
    const omnislash=this.buffs.find(buff=>buff.type==='omnislash');
    if(bladeFury){
      this.attackTarget=null;
      bladeFury.pulse=(bladeFury.pulse||0)+dt;
      if(bladeFury.pulse>=0.32){
        bladeFury.pulse=0;
        const radius=235+bladeFury.level*18;
        for(const unit of units){
          if(unit.dead||unit.team===this.team||isBuilding(unit)) continue;
          if(Math.hypot(unit.x-this.x,unit.y-this.y)<=radius+unit.radius){
            applyDamage(unit,abilityDamage(this,42+bladeFury.level*24),this);
            unit.slow=Math.max(unit.slow||0,0.18);
            unit.slowT=Math.max(unit.slowT||0,0.45);
          }
        }
        fxRing(this.x,this.y,radius,'#ffe066',0.28);
        spawnRadialBlades(this.x,this.y,radius*0.78,'#fff0a8',12);
      }
    }
    if(omnislash){
      this.invulnerable=true;
      omnislash.next=(omnislash.next||0)-dt;
      if(omnislash.next<=0){
        omnislash.next=0.22;
        omnislashStrike(this,omnislash);
      }
    } else if(this.invulnerable && this.omnislashWasActive){
      this.invulnerable=false;
    }
    this.omnislashWasActive=!!omnislash;
    if(this.arcMotion){
      advanceArcMotion(this, dt);
      return;
    }
    const bloodrage = this.buffs.find(b => b.type === 'bloodrage');
    if(bloodrage){
      bloodrage.drainTimer = (bloodrage.drainTimer || 0) + dt;
      if(bloodrage.drainTimer >= 1){
        bloodrage.drainTimer -= 1;
        applyDamage(this, bloodrage.hpDrain, {team:1-this.team});
      }
    }
    for(const s of this.skills) if(s.cd > 0) s.cd -= dt;
    for(const key of Object.keys(this.spellCooldowns)){
      this.spellCooldowns[key] = Math.max(0, this.spellCooldowns[key] - dt);
    }
    if(this.def.id === 'sniper' && this.skills[0].level > 0 && this.shrapnelRechargeTimers.length){
      for(let i=this.shrapnelRechargeTimers.length-1;i>=0;i--){
        this.shrapnelRechargeTimers[i] -= dt;
        if(this.shrapnelRechargeTimers[i] <= 0){
          this.shrapnelRechargeTimers.splice(i,1);
          this.shrapnelCharges=Math.min(this.shrapnelMaxCharges,(this.shrapnelCharges||0)+1);
          addText(this.x,this.y-58,'SHRAPNEL +1','#ffe2a0',0.7,13);
        }
      }
    }
    for(const item of this.inventory){
      if(!item) continue;
      if(item.cooldown > 0) item.cooldown = Math.max(0, item.cooldown - dt);
      if(item.activeTimer > 0) item.activeTimer = Math.max(0, item.activeTimer - dt);
    }
    if(this.timurPillow > 0){
      const heal = Math.min(this.maxHp - this.hp, 60 * dt);
      this.hp += heal;
      this.timurPillow = Math.max(0, this.timurPillow - dt);
    }
    const manaBoost = this.inventory.some(i => i && i.id === 'manaTome') ? 1.10 : 1;
    this.mp = Math.min(this.maxMp, this.mp + this.mpRegen * manaBoost * dt);

    let regen = this.hpRegen;
    for(const b of this.buffs) if(b.type === 'hpregen') regen += b.val;
    if(this.buffs.some(b=>b.type==='regen')) regen += this.maxHp*0.04;
    this.hp = Math.min(this.maxHp, this.hp + regen*dt);

    const base = BASES[this.team];
    const nearBase = Math.hypot(this.x-base.x, this.y-base.y) < BASE_HEAL_RADIUS;
    this.hpRegenBoost = nearBase;
    if(nearBase){
      if(this.hp < this.maxHp){
        const healAmt = Math.min(this.maxHp - this.hp, this.maxHp * BASE_HEAL_RATE * dt);
        this.hp += healAmt;
        if(Math.random() < dt*6){
          addText(this.x + rnd(-20,20), this.y - 30,
                  '+' + Math.max(1, Math.round(healAmt*10)), '#7dff7d', 0.9, 14);
        }
      }
      if(this.mp < this.maxMp){
        this.mp = Math.min(this.maxMp, this.mp + this.maxMp * BASE_HEAL_RATE * dt);
      }
    }
    if(!this.isPlayer) this.autoLevelSkills();
    this.updateAI(dt);
    this.updateMove(dt);
    if(this.bikeTimer>0){
      this.bikeTimer=Math.max(0,this.bikeTimer-dt);
      this.bikeShieldTimer=this.bikeTimer;
      this.bikeHitTimer-=dt;
      if(this.bikeHitTimer<=0){
        this.bikeHitTimer=0.42;
        for(const unit of units){
          if(unit.dead||unit.team===this.team||unit.team===2||isBuilding(unit)) continue;
          if(Math.hypot(unit.x-this.x,unit.y-this.y)<this.radius+unit.radius+72){
            applyDamage(unit,100,this); unit.stunTimer=Math.max(unit.stunTimer,0.5);
            fxHit(unit.x,unit.y,'#8dffad');
          }
        }
      }
      if(this.bikeTimer<=0&&this.bikeSpeedBoost){ this.speed-=this.bikeSpeedBoost; this.bikeSpeedBoost=0; }
    } else if(!bladeFury && !omnislash) {
      this.updateCombat(dt);
    }
  }
}

function gainXp(hero, amount){ if(hero && !hero.dead) hero.gainXp(amount); }

function skillFxColor(hero, skillId){
  if(/juggernaut|bladeFury|healingWard|bladeDance|omnislash/.test(skillId)) return '#ffe066';
  if(/sniper|shrapnel|headshot|takeAim|assassinate/.test(skillId)) return '#ffd27a';
  if(/mo3gi|drone|mine|bike/.test(skillId)) return '#7dffb0';
  if(/juvsyut|fat|belly|feast/.test(skillId)) return '#f2a36f';
  if(/chip|crown|coin|throne|royal/.test(skillId)) return '#ffd568';
  if(/fire|flame|meteor|molotov|dynamite|pyro|laser/.test(skillId)) return '#ff8a3d';
  if(/ice|crystal|storm|golly|quas|beam|blink|tornado/.test(skillId)) return '#9eeaff';
  if(/blood|rupture|rage|sasych/.test(skillId)) return '#ff5368';
  if(/illusion|phantom|invoke/.test(skillId)) return '#d8b4ff';
  if(/malit|backpack|launch/.test(skillId)) return '#f2c38b';
  return hero.def.color2 || hero.def.color;
}

function castSkillVisual(hero, skill, tx, ty){
  const color = skillFxColor(hero, skill.id);
  const isPoint = skill.def.type === 'point';
  const x = isPoint ? tx : hero.x;
  const y = isPoint ? ty : hero.y;
  spawnParticles(hero.x, hero.y, color, isPoint ? 12 : 20, isPoint ? 0.5 : 0.9);
  if(isPoint && Math.hypot(x-hero.x,y-hero.y) > 90){
    fxBeam(hero.x, hero.y, x, y, color, 0.18);
  }
  fxs.push({
    type:'skillBurst', x, y, t:0,
    life:skill.def.ult ? 0.82 : 0.48,
    r:isPoint ? 72 : 96,
    color, spokes:skill.def.ult ? 14 : 10,
    heroId:hero.def.id, skillId:skill.id
  });
  fxRing(x, y, isPoint ? 58 : 82, color, 0.32);
  spawnParticles(x, y, color, isPoint ? 18 : 26, isPoint ? 0.8 : 1.05);
  const intensity = skill.def.ult ? 2 : 1;
  for(let pulse=0; pulse<intensity; pulse++){
    fxRing(x, y, (isPoint ? 78 : 108) + pulse*34, color, 0.5 + pulse*0.12);
    spawnRadialBlades(x, y, (isPoint ? 58 : 82) + pulse*22, color, skill.def.ult ? 28 : 16);
  }
  if(skill.def.ult){
    spawnParticles(hero.x, hero.y, '#ffffff', 18, 1.4);
    fxBeam(hero.x, hero.y, x, y, '#ffffff', 0.12);
  }
}

function castSkill(hero, slot, tx, ty){
  const s = hero.skills[slot];
  if(!s){ flashMsg(hero, 'Нет такого скилла'); return false; }
  if(hero.silenceTimer > 0 && !s.def.passive){ flashMsg(hero, 'Вы не можете применять способности'); return false; }

  const def = s.def;
  const isReginaTraversal = hero.def.id === 'regina' && (slot === 0 || slot === 1);
  const reginaTargetIsValid = () => {
    return !!findReginaTarget(hero, tx, ty, slot);
  };
  if(isReginaTraversal && !reginaTargetIsValid()){
    flashMsg(hero, slot === 0 ? 'Наведите Q на врага или крипа' : 'Наведите W на вражеского героя или крипа');
    return false;
  }
  if(isReginaTraversal && s.level <= 0 && def.costType !== 'hp'){
    const firstLevelMana = def.mana[1] || 0;
    if(hero.mp < firstLevelMana){
      flashMsg(hero, 'Недостаточно маны — способность не изучена');
      return false;
    }
  }

  if(s.level <= 0){
    if(hero.canLevelSkill(slot)){
      hero.levelSkill(slot);
    } else {
      if(s.def.ult && hero.level < 6 && !s.free) flashMsg(hero, 'Ульт с 6 уровня');
      else if(hero.skillPoints <= 0 && !s.free)  flashMsg(hero, 'Нет очков навыков');
      else                            flashMsg(hero, 'Скилл недоступен');
      return false;
    }
  }

  if(def.passive) return s.level > 0;
  if(def.mineSkill && hero.mineLock){ flashMsg(hero,'Мины ещё активны'); return false; }
  const invokeSpellKey = hero.def.id === 'grisha' && slot === 3 ? getOrbKey(hero.orbs || ['Q','W','E']) : null;
  const spellCd = invokeSpellKey ? getInvokeCooldown(hero, invokeSpellKey) : 0;
  if(invokeSpellKey && spellCd > 0){ flashMsg(hero, 'Заклинание на КД ' + Math.ceil(spellCd) + 'с'); return false; }
  if(!invokeSpellKey && s.cd > 0){ flashMsg(hero, 'КД ' + Math.ceil(s.cd) + 'с'); return false; }
  const mana = def.mana[s.level];
  const hpCost = def.costType === 'hp' ? (def.hpCost || 0) : 0;
  if(def.costType === 'hp'){
    if(hero.hp <= hpCost){ flashMsg(hero,'Недостаточно здоровья'); return false; }
  } else if(hero.mp < mana){ flashMsg(hero, 'Мало маны (' + Math.ceil(mana) + ')'); return false; }

  if(hero.def.id === 'shadow' && slot >= 0 && slot <= 2){
     const target = getShadowAutoTarget(hero, def.range || 0);
     if(target){ tx = target.x; ty = target.y; }
     else {
       const direction = Number.isFinite(hero.facing) ? hero.facing : 0;
       tx = hero.x + Math.cos(direction) * (def.range || 500);
       ty = hero.y + Math.sin(direction) * (def.range || 500);
     }
   }
   if(def.type === 'point' && def.range){
    const d = Math.hypot(tx-hero.x, ty-hero.y);
    if(d > def.range){
      const k = def.range / d;
      tx = hero.x + (tx-hero.x)*k;
      ty = hero.y + (ty-hero.y)*k;
    }
  }
  if(isReginaTraversal && !reginaTargetIsValid()){
    flashMsg(hero, slot === 0 ? 'Враг должен быть в радиусе Q' : 'Цель должна быть в радиусе W');
    return false;
  }
  const cooldownMultiplier = 1 - (hero.inventory.some(i => i && i.id === 'enemy302') ? SHOP_ITEMS.enemy302.cooldownReduction : 0);
  hero.castingSkillLevel = s.level;
  hero.scepterSkillBoost = hasScepter(hero) && (slot === 0 || slot === 1 || def.ult);
  let castSucceeded = false;
  try {
    const result = def.cast(hero, tx, ty, s.level);
    castSucceeded = result !== false;
    if(castSucceeded){
      if(def.costType === 'hp') hero.hp = Math.max(1,hero.hp-hpCost);
      else hero.mp -= mana;
      if(def.ult) playHeroSfx('ultimate');
      else playAbilitySound('cast');
      if(invokeSpellKey) hero.spellCooldowns[invokeSpellKey] = (INVOKE_COOLDOWNS[invokeSpellKey] || 0) * cooldownMultiplier;
      else s.cd = def.cd[s.level] * cooldownMultiplier;
      const isShadowRaze = hero.def.id === 'shadow' && slot >= 0 && slot <= 2;
      if(isShadowRaze){
        spawnParticles(hero.x, hero.y, '#ff3b1f', 22, 0.75);
        fxRing(hero.x, hero.y, 58, '#8d1118', 0.25);
      } else {
        castSkillVisual(hero, s, tx, ty);
      }
      if(hero.def && hero.def.id === 'earthshaker' && !def.passive){
        triggerAftershockPulse(hero);
      }
    }
  }
  catch(err){ console.error('Ошибка каста:', err); }
  finally { hero.castingSkillLevel = 0; hero.scepterSkillBoost = false; }
  return castSucceeded;
}

function flashMsg(hero, msg){
  addText(hero.x, hero.y - 70, msg, '#ff8080', 1.2, 15);
}

function spawnWave(){
  waveCount++;
  for(const team of [0,1]){
    for(let lane=0; lane<3; lane++){
      const offsets = [
        {x:rnd(-40,40), y:rnd(-40,40)},
        {x:rnd(-40,40), y:rnd(-40,40)},
        {x:rnd(-40,40), y:rnd(-40,40)}
      ];
      for(let i=0;i<3;i++) units.push(new Creep(team, lane, 'melee', offsets[i]));
      units.push(new Creep(team, lane, 'ranged', {x:rnd(-50,50), y:rnd(-50,50)}));
    }
  }
}

function beginDraft(preselected=-1){
  menuStage='draft';
  draftTime=20;
  draftCountdownSpoken=false;
  draftPlayerIndex=preselected;
  selectedHeroIndex=preselected>=0 ? preselected : 0;
  const available=HERO_DEFS.map((_,index)=>index).filter(index=>index!==preselected);
  draftBotIndices=[];
  for(let i=0;i<5;i++){
    const pool=available.filter(index=>!draftBotIndices.includes(index));
    draftBotIndices.push(pool[Math.floor(Math.random()*pool.length)]);
  }
}

function updateDraft(dt){
  if(menuStage!=='draft') return;
  draftTime=Math.max(0,draftTime-dt);
  if(!draftCountdownSpoken && draftTime<=10){
    draftCountdownSpoken=true;
    speakDraftCountdown();
  }
  if(draftTime<=0){
    if(draftPlayerIndex<0){
      const available=HERO_DEFS.map((_,index)=>index).filter(index=>!draftBotIndices.includes(index));
      draftPlayerIndex=available[Math.floor(Math.random()*available.length)];
    }
    startGame(draftPlayerIndex,draftBotIndices);
  }
}

function startGame(playerIndex, draftPicks=null){
  stopMenuMusic();
  units=[]; heroes=[]; projectiles=[]; aoes=[]; walls=[]; trees=[]; fxs=[]; particles=[]; texts=[]; runes=[]; mo3giMines=[]; grassBends=[];
  controlledUnit=null;
  explored = new Uint8Array(GRID*GRID);
  gameTime=0; waveTimer=8; waveCount=0; winner=null; visionTimer=0;
   barracksDestroyed=[0,0]; megaCreeps=[false,false]; recentKills=[];
  structureProgress=[createStructureProgress(),createStructureProgress()];
   rampageBanner={t:0, owner:null, streak:0};
  shopOpen=false;
  shopGuideOpen=false;
  shopScrollRow=0;
  pendingPurchaseId=null;
  talentOpen=false; talentChoices=[]; talentHero=null;
  talentTreeOpen=false;
  selectedShopItem=null;
  chatMessages=[];
  chatInputOpen=false;
   lastTauntIndex={weak:-1, strong:-1, generic:-1};
   pendingBotReplies=[];
  changelogOpen=false;
  settingsOpen=false;
  cameraManual=false; cameraKeys.x=0; cameraKeys.y=0; cameraDrag.active=false;
  inspectUnit=null; pendingSellIndex=-1;
  scaleMapData();
  createMapTrees();

  const randomHero = excluded => {
    let index;
    do { index = Math.floor(Math.random() * HERO_DEFS.length); } while(excluded.includes(index));
    return index;
  };
  const picks=draftPicks && draftPicks.length>=5 ? draftPicks : [randomHero([playerIndex]),randomHero([playerIndex]),randomHero([playerIndex]),randomHero([playerIndex]),randomHero([playerIndex])];
  const [enemyIndex,allyIndex,allyIndex2,enemyAllyIndex,enemyAllyIndex2]=picks;

  playerHero = new Hero(HERO_DEFS[playerIndex], 0);
  playerHero.isPlayer = true;
  enemyHero  = new Hero(HERO_DEFS[enemyIndex], 1);
  const allyHero = new Hero(HERO_DEFS[allyIndex], 0);
  const allyHero2 = new Hero(HERO_DEFS[allyIndex2], 0);
  const enemyAllyHero = new Hero(HERO_DEFS[enemyAllyIndex], 1);
  const enemyAllyHero2 = new Hero(HERO_DEFS[enemyAllyIndex2], 1);
  const placeHeroOnLane = (hero, lane) => {
    hero.assignedLane = lane;
    const path = LANES[lane];
    const point = path[hero.team === 0 ? 0 : path.length - 1];
    hero.x = point.x + rnd(-42, 42);
    hero.y = point.y + rnd(-42, 42);
    hero.moveTarget = {x:point.x, y:point.y};
  };
  /* Игрок и центральный враг начинают на миду, союзники занимают верх/низ. */
  placeHeroOnLane(playerHero, 0);
  placeHeroOnLane(allyHero, 2);
  placeHeroOnLane(allyHero2, 1);
  placeHeroOnLane(enemyHero, 0);
  placeHeroOnLane(enemyAllyHero, 1);
  placeHeroOnLane(enemyAllyHero2, 2);

  playerHero.levelSkill(0);
  enemyHero.levelSkill(0);
  allyHero.levelSkill(0);
  allyHero2.levelSkill(0);
  enemyAllyHero.levelSkill(0);
  enemyAllyHero2.levelSkill(0);

  heroes.push(playerHero, allyHero, allyHero2, enemyHero, enemyAllyHero, enemyAllyHero2);
  units.push(playerHero, allyHero, allyHero2, enemyHero, enemyAllyHero, enemyAllyHero2);

  for(const t of TOWER_SPOTS) units.push(new Tower(t.team, t.x, t.y, false, t.lane, t.tier));
  units.push(new Tower(0, BASES[0].x, BASES[0].y, true));
  units.push(new Tower(1, BASES[1].x, BASES[1].y, true));
  for(const side of [0,1]){
    for(const spot of barracksSpots(side)) units.push(new Barracks(side, spot.lane, spot.x, spot.y));
  }
  spawnNeutralCamps();

  cam.x = playerHero.x;
  cam.y = playerHero.y;
  gameState = 'playing';
  canvas.focus();
}

function orientOnlineMapForTeam(globalTeam){
  if(globalTeam !== 1) return;
  [BASES[0],BASES[1]] = [BASES[1],BASES[0]];
  for(const lane of LANES) lane.reverse();
  for(const tower of TOWER_SPOTS) tower.team = 1-tower.team;
  for(const unit of units){
    if(unit.type === 'tower' || unit.type === 'ancient' || unit.type === 'barracks') unit.team = 1-unit.team;
  }
  barracksDestroyed = [barracksDestroyed[1],barracksDestroyed[0]];
  megaCreeps = [megaCreeps[1],megaCreeps[0]];
  structureProgress = [structureProgress[1],structureProgress[0]];
}

/* =========================================================
   ТЕСТ-РЕЖИМ: тренировка одного бойца без волн крипов,
   без вражеской команды и с бесконечными монетами. Можно
   заспавнить рядом любого бойца из игры как манекен,
   мгновенно повышать уровень и восстанавливать HP/ману/КД.
   ========================================================= */
function startTestMode(playerIndex){
  stopMenuMusic();
  units=[]; heroes=[]; projectiles=[]; aoes=[]; walls=[]; trees=[]; fxs=[]; particles=[]; texts=[]; runes=[]; mo3giMines=[]; grassBends=[];
  controlledUnit=null;
  explored = new Uint8Array(GRID*GRID);
  gameTime=0; waveTimer=8; waveCount=0; winner=null; visionTimer=0;
  barracksDestroyed=[0,0]; megaCreeps=[false,false]; recentKills=[];
  structureProgress=[createStructureProgress(),createStructureProgress()];
  rampageBanner={t:0, owner:null, streak:0};
  shopOpen=false; shopGuideOpen=false; shopScrollRow=0; pendingPurchaseId=null;
  talentOpen=false; talentChoices=[]; talentHero=null; talentTreeOpen=false;
  selectedShopItem=null; chatMessages=[]; chatInputOpen=false;
  lastTauntIndex={weak:-1, strong:-1, generic:-1}; pendingBotReplies=[];
  changelogOpen=false; settingsOpen=false;
  cameraManual=false; cameraKeys.x=0; cameraKeys.y=0; cameraDrag.active=false;
  inspectUnit=null; pendingSellIndex=-1;
  scaleMapData();
  createMapTrees();

  testMode = true;
  testDummies = [];
  testDummySpawnAngle = 0;
  testHeroPickerOpen = false;

  playerHero = new Hero(HERO_DEFS[playerIndex], 0);
  playerHero.isPlayer = true;
  enemyHero = null;
  playerHero.x = WORLD/2;
  playerHero.y = WORLD/2;
  playerHero.moveTarget = null;
  playerHero.coins = 99999;
  playerHero.levelSkill(0);

  heroes.push(playerHero);
  units.push(playerHero);
  spawnNeutralCamps();

  cam.x = playerHero.x;
  cam.y = playerHero.y;
  gameState = 'playing';
  canvas.focus();
}

function spawnTestDummy(index){
  const def = HERO_DEFS[index];
  if(!def || !playerHero) return;
  if(testDummies.length >= 10){
    addText(playerHero.x, playerHero.y-56, 'МАКСИМУМ МАНЕКЕНОВ: 10', '#ff8585', 1.0, 14);
    return;
  }
  const dummy = new Hero(def, 1);
  dummy.isPlayer = false;
  dummy.isDummy = true;
  testDummySpawnAngle += 0.85;
  const dist = 210 + (testDummies.length % 4) * 70;
  dummy.x = clamp(playerHero.x + Math.cos(testDummySpawnAngle)*dist, 80, WORLD-80);
  dummy.y = clamp(playerHero.y + Math.sin(testDummySpawnAngle)*dist, 80, WORLD-80);
  dummy.moveTarget = null; dummy.attackTarget = null;
  dummy.coins = 0;
  dummy.levelSkill(0);
  heroes.push(dummy);
  units.push(dummy);
  testDummies.push(dummy);
  addText(dummy.x, dummy.y-56, 'МАНЕКЕН: ' + def.name, '#8be9fd', 1.0, 14);
}

function clearTestDummies(){
  for(const dummy of testDummies){
    dummy.dead = true;
    const ui = units.indexOf(dummy); if(ui>=0) units.splice(ui,1);
    const hi = heroes.indexOf(dummy); if(hi>=0) heroes.splice(hi,1);
  }
  testDummies = [];
}

function testRestoreHero(hero){
  if(!hero) return;
  hero.dead = false;
  hero.hp = hero.maxHp;
  hero.mp = hero.maxMp;
  hero.stunTimer = 0; hero.silenceTimer = 0; hero.slowT = 0; hero.slow = 0;
  hero.attackSlowT = 0; hero.knockbackTimer = 0; hero.liftTimer = 0;
  hero.buffs.length = 0;
  for(const s of hero.skills) s.cd = 0;
  for(const key of Object.keys(hero.spellCooldowns)) hero.spellCooldowns[key] = 0;
  for(const item of hero.inventory){
    if(!item) continue;
    item.cooldown = 0;
    item.activeTimer = 0;
  }
  addText(hero.x, hero.y-56, 'ВОССТАНОВЛЕНО', '#8be9fd', 1.0, 14);
  fxRing(hero.x, hero.y, 90, '#8be9fd', 0.5);
}

function exitTestMode(){
  testMode = false;
  testDummies = [];
  testHeroPickerOpen = false;
  gameState = 'menu';
  menuStage = 'home';
}

function laneDistanceToPoint(x, y, lane){
  const path = LANES[lane] || LANES[0];
  let best = Infinity;
  for(let i=1;i<path.length;i++){
    best = Math.min(best, pointSegmentDistance(x,y,path[i-1].x,path[i-1].y,path[i].x,path[i].y));
  }
  return best;
}

function botLaneObjective(h){
  const lane = gameTime >= MID_PUSH_TIME ? 0 : (Number.isInteger(h.assignedLane) ? h.assignedLane : 0);
  const path = LANES[lane];
  if(gameTime >= MID_PUSH_TIME){
    return path[h.team === 0 ? path.length - 1 : 0];
  }
  /* До 5:00 герой держит свою линию, не телепортируясь сразу под чужую базу. */
  const safePoint = h.team === 0 ? path[Math.min(1, path.length - 1)] : path[Math.max(0, path.length - 2)];
  return safePoint || path[0];
}

function isUnitOnBotLane(unit, lane){
  if(unit.type === 'tower' || unit.type === 'barracks') return unit.lane === lane;
  if(unit.type === 'ancient') return true;
  return laneDistanceToPoint(unit.x, unit.y, lane) < 520;
}

function getBotStructureObjective(h, lane){
  const defendingTeam = 1 - h.team;
  const enemyBuildings = units.filter(unit =>
    !unit.dead && unit.team === defendingTeam && isBuilding(unit)
  );
  const candidates = enemyBuildings.filter(unit =>
    canDamageStructure(unit, null, true) &&
    (unit.type === 'ancient' || unit.lane === lane)
  );
  return candidates.sort((left,right) =>
    Math.hypot(left.x-h.x,left.y-h.y) - Math.hypot(right.x-h.x,right.y-h.y)
  )[0] || null;
}

function updateBotFarm(h){
  const lane = gameTime >= MID_PUSH_TIME ? 0 : (Number.isInteger(h.assignedLane) ? h.assignedLane : 0);
  let bestCamp=null, bestScore=Infinity;
  for(const camp of NEUTRAL_CAMPS){
    const center=camp[0];
    const campIndex = NEUTRAL_CAMPS.indexOf(camp);
    const living=units.some(unit => unit.type==='neutral' && unit.campIndex === campIndex && !unit.dead);
    if(!living) continue;
    const distance=Math.hypot(h.x-center.x,h.y-center.y);
    const laneOffset=laneDistanceToPoint(center.x,center.y,lane);
    const score=distance + laneOffset*0.45;
    if(score<bestScore){ bestScore=score; bestCamp=camp; }
  }
  if(!bestCamp) return false;
  const campIndex=NEUTRAL_CAMPS.indexOf(bestCamp);
  let target=units.find(unit => unit.type==='neutral' && unit.campIndex===campIndex && !unit.dead);
  if(!target) return false;
  h.laneState = 'jungle';
  h.attackTarget=target;
  if(Math.hypot(h.x-target.x,h.y-target.y) > h.getAttackRange()+target.radius){
    h.moveTarget={x:target.x,y:target.y};
  } else {
    h.moveTarget=null;
  }
  return true;
}

function recoverStuckBot(h){
  h.stuckTimer = 0;
  h.attackTarget = null;
  h.moveTarget = null;
  for(let attempt=0; attempt<10; attempt++){
    const angle=Math.random()*Math.PI*2;
    const distance=90+Math.random()*150;
    const x=clamp(h.x+Math.cos(angle)*distance,60,WORLD-60);
    const y=clamp(h.y+Math.sin(angle)*distance,60,WORLD-60);
    if(canMoveTo(x,y,h.radius)){
      h.x=x; h.y=y;
      break;
    }
  }
  const waypoint=botLaneObjective(h);
  h.moveTarget={x:waypoint.x+rnd(-180,180),y:waypoint.y+rnd(-180,180)};
}

function updateEnemyAI(h, dt){
  h.aiTimer -= dt;
  h.laneTimer = Math.max(0, (h.laneTimer || 0) - dt);
  h.jungleTimer = Math.max(0, (h.jungleTimer || 0) - dt);
  const moved=Math.hypot(h.x-h.lastAiX,h.y-h.lastAiY);
  const tryingToMove=!!h.moveTarget || (h.attackTarget && !h.attackTarget.dead && h.distTo(h.attackTarget)>h.getAttackRange()+h.attackTarget.radius);
  if(tryingToMove && moved<4) h.stuckTimer+=dt;
  else if(moved>=4) h.stuckTimer=0;
  h.lastAiX=h.x; h.lastAiY=h.y;
  if(h.stuckTimer>=20){ recoverStuckBot(h); return; }
  h.shopTimer -= dt;
  if(h.shopTimer <= 0){
    h.shopTimer = 10 + Math.random()*8;
    if(h.coins >= 70) buyBotItem(h);
  }
  if(h.hp < h.maxHp*0.55){
    const tangoIndex = h.inventory.findIndex(i => i && i.id === 'tango');
    if(tangoIndex >= 0) useInventoryItem(h, tangoIndex);
  }
  if(h.mp < h.maxMp*0.45){
    const mangoIndex = h.inventory.findIndex(i => i && i.id === 'mango');
    if(mangoIndex >= 0) useInventoryItem(h, mangoIndex);
  }
  const bkbIndex = h.inventory.findIndex(i => i && i.id === 'bkb');
  if(bkbIndex >= 0 && h.inventory[bkbIndex].cooldown <= 0 && (h.hp < h.maxHp*0.35 || h.stunTimer > 0)){
    useInventoryItem(h, bkbIndex);
  }
  const steelIndex = h.inventory.findIndex(i => i && i.id === 'mantledSteel');
  if(steelIndex >= 0 && h.inventory[steelIndex].cooldown <= 0 && h.attackTarget){
    useInventoryItem(h, steelIndex);
  }
  if(h.aiTimer > 0) return;
  h.aiTimer = 0.18;

  const base = BASES[h.team];
  const hpPct = h.hp / h.maxHp;
  const nearBase = Math.hypot(h.x-base.x, h.y-base.y) < BASE_HEAL_RADIUS * 1.2;

  /* Бот не бросает бой из-за низкого HP. На фонтан он уходит только
     когда рядом уже нет вражеского героя и закончился короткий combat timer. */
  const enemyHeroNearby = units.some(unit =>
    unit.type === 'hero' && unit.team !== h.team && !unit.dead &&
    Math.hypot(unit.x-h.x, unit.y-h.y) < 820
  );
  const beingTargeted = units.some(unit =>
    !unit.dead && unit.attackTarget === h &&
    Math.hypot(unit.x-h.x, unit.y-h.y) < 900
  );
  const inFight = (h.combatTimer || 0) > 0 || enemyHeroNearby || beingTargeted ||
    (h.attackTarget && h.attackTarget.type === 'hero' && !h.attackTarget.dead &&
     Math.hypot(h.attackTarget.x-h.x, h.attackTarget.y-h.y) < 950);
  if(hpPct < 0.65 && !inFight &&
     Math.hypot(h.x-base.x, h.y-base.y) > BASE_HEAL_RADIUS * 0.7){
    h.moveTarget = {x:base.x + rnd(-60,60), y:base.y + rnd(-60,60)};
    h.attackTarget = null;
    if(h.def.id==='pyro' && h.skills[2].level>0 && h.skills[2].cd<=0 && hpPct<0.2){
      castSkill(h, 2, base.x, base.y);
    }
    return;
  }
  if(hpPct < 0.65 && h.def.id === 'warlord' && h.skills[1].level > 0 && h.skills[1].cd <= 0){
    castSkill(h, 1, h.x, h.y);
  }

  const strategicLane = gameTime >= MID_PUSH_TIME ? 0 : (Number.isInteger(h.assignedLane) ? h.assignedLane : 0);
  if(gameTime >= MID_PUSH_TIME) h.assignedLane = 0;
  const laneEnemy = units
    .filter(unit => unit.team !== h.team && unit.team !== 2 && !unit.dead &&
      isUnitOnBotLane(unit, strategicLane) && Math.hypot(unit.x-h.x,unit.y-h.y) <= h.vision)
    .sort((left,right) => (right.type === 'hero') - (left.type === 'hero'))[0];
  /* В первые 5 минут бот может помочь соседней линии, если там уже
     началась драка рядом с союзником, а не продолжать слепо идти по своей. */
  const nearbyFight = units
    .filter(unit => unit.type === 'hero' && unit.team !== h.team && !unit.dead &&
      Math.hypot(unit.x-h.x,unit.y-h.y) <= Math.min(820,h.vision))
    .filter(unit => units.some(ally =>
      ally.type === 'hero' && ally.team === h.team && !ally.dead &&
      ally !== h && Math.hypot(ally.x-unit.x,ally.y-unit.y) < 520
    ))
    .sort((left,right) => Math.hypot(left.x-h.x,left.y-h.y) - Math.hypot(right.x-h.x,right.y-h.y))[0];
  const visibleEnemy = nearbyFight || laneEnemy;
  if(gameTime < MID_PUSH_TIME && visibleEnemy){
    h.laneState = 'lane';
    h.attackTarget=visibleEnemy;
    h.moveTarget=null;
  } else if(gameTime < MID_PUSH_TIME && !getBotStructureObjective(h, strategicLane) &&
            h.jungleTimer > 0 && updateBotFarm(h)){
    return;
  } else if(gameTime < MID_PUSH_TIME && !visibleEnemy &&
            !getBotStructureObjective(h, strategicLane) &&
            h.laneTimer <= 0 && updateBotFarm(h)){
    h.jungleTimer = 18;
    h.laneTimer = 24;
    return;
  } else if(gameTime >= MID_PUSH_TIME){
    h.laneState = 'mid-push';
  }

  const structureTarget = getBotStructureObjective(h, strategicLane);
  const urgentFight = nearbyFight &&
    Math.hypot(nearbyFight.x-h.x, nearbyFight.y-h.y) <= 760
      ? nearbyFight : null;
  const nearbyCreep = laneEnemy && laneEnemy.type !== 'hero' &&
    Math.hypot(laneEnemy.x-h.x, laneEnemy.y-h.y) <= 260
      ? laneEnemy : null;
  /*
   * Приоритет у бота теперь такой:
   * 1) отбиться от героя, который уже рядом;
   * 2) добить ближайших крипов перед собой;
   * 3) идти по цепочке зданий: T1 -> T2 -> казармы -> трон.
   */
  const target = urgentFight || nearbyCreep || structureTarget || laneEnemy || visibleEnemy || null;

  /* === САСЫЧ — АИ === */
  if(h.def.id === 'sasych'){
    if(target){
      const d = Math.hypot(target.x-h.x, target.y-h.y);
      h.attackTarget = target;
      h.moveTarget = null;
      if(h.skills[3].level > 0 && h.skills[3].cd <= 0 && target.type === 'hero' && d < 700) castSkill(h, 3, target.x, target.y);
      else if(h.skills[1].level > 0 && h.skills[1].cd <= 0 && d < 850) castSkill(h, 1, target.x, target.y);
      else if(h.skills[0].level > 0 && h.skills[0].cd <= 0 && h.hp / h.maxHp > 0.2) castSkill(h, 0, h.x, h.y);
    } else {
      h.attackTarget = null;
      const goal = botLaneObjective(h);
      h.moveTarget = {x:goal.x, y:goal.y};
    }
    return;
  }

  /* === ГОЛЛИ — АИ === */
  if(h.def.id === 'golly'){
    if(target){
      const d = Math.hypot(target.x-h.x, target.y-h.y);
      h.attackTarget = target;
      h.moveTarget = null;
      if(h.skills[3].level > 0 && h.skills[3].cd <= 0 && d < 500) castSkill(h, 3, h.x, h.y);
      else if(h.skills[2].level > 0 && h.skills[2].cd <= 0 && d < 500) castSkill(h, 2, h.x, h.y);
      else if(h.skills[1].level > 0 && h.skills[1].cd <= 0 && d < 700) castSkill(h, 1, target.x, target.y);
      else if(h.skills[0].level > 0 && h.skills[0].cd <= 0 && d < 850) castSkill(h, 0, target.x, target.y);
    } else {
      h.attackTarget = null;
      const goal = botLaneObjective(h);
      h.moveTarget = {x:goal.x, y:goal.y};
    }
    return;
  }

  /* === ГРИША — АИ === */
  if(h.def.id === 'grisha'){
    /* Крутим орбы раз в 1.5 сек */
    h.orbTimer = (h.orbTimer || 0) - 0.18;
    if(h.orbTimer <= 0){
      h.orbTimer = 1.5;
      const orb = ['Q','W','E'][Math.floor(Math.random()*3)];
      pushOrb(h, orb);
    }
    /* Раз в 2 секунды кастуем ульту */
    h.invokeTimer = (h.invokeTimer || 0) - 0.18;
    if(target){
      const d = Math.hypot(target.x-h.x, target.y-h.y);
      h.attackTarget = target;
      h.moveTarget = null;

      /* Ульта — раз в 2 сек */
      if(h.invokeTimer <= 0 && h.skills[3].level > 0 &&
         h.mp >= h.skills[3].def.mana[h.skills[3].level] && d < 1200){
        const ok = castSkill(h, 3, target.x, target.y);
        if(ok) h.invokeTimer = 2.0;
      }
      /* Луч — если готов и цель далеко */
      if(h.skills[4] && h.skills[4].level > 0 && h.skills[4].cd <= 0 &&
         h.mp >= h.skills[4].def.mana[h.skills[4].level] && d > 150 && d < 800){
        castSkill(h, 4, target.x, target.y);
      }
    } else {
      h.attackTarget = null;
      const goal = botLaneObjective(h);
      h.moveTarget = {x:goal.x + rnd(-120,120), y:goal.y + rnd(-120,120)};
    }
    return;
  }

  /* === ШАДОУ === */
  if(h.def.id === 'electricGosha'){
    if(target){
      const d=Math.hypot(target.x-h.x,target.y-h.y);
      h.attackTarget=target; h.moveTarget=null;
      if(h.skills[3].level>0 && h.skills[3].cd<=0 && d>280 && h.mp>120) castSkill(h,3,target.x,target.y);
      else if(h.skills[2].level>0 && h.skills[2].cd<=0 && d<260) castSkill(h,2,h.x,h.y);
      else if(h.skills[1].level>0 && h.skills[1].cd<=0 && d<700) castSkill(h,1,target.x,target.y);
      else if(h.skills[0].level>0 && h.skills[0].cd<=0 && d<900) castSkill(h,0,target.x,target.y);
    } else {
      h.attackTarget=null;
       const goal=botLaneObjective(h);
      h.moveTarget={x:goal.x+rnd(-120,120),y:goal.y+rnd(-120,120)};
    }
    return;
  }

  /* === ШАДОУ === */
  if(h.def.id === 'shadow'){
    if(target){
      const d = Math.hypot(target.x-h.x, target.y-h.y);
      h.attackTarget = target;
      h.moveTarget = null;
      if(h.skills[3].level > 0 && h.skills[3].cd <= 0 && !h.shadowCasting && h.shadowSouls >= 2 && d < 1200)
        castSkill(h, 3, h.x, h.y);
      else if(h.skills[2].level > 0 && h.skills[2].cd <= 0 && d < 1050)
        castSkill(h, 2, target.x, target.y);
      else if(h.skills[1].level > 0 && h.skills[1].cd <= 0 && d < 700)
        castSkill(h, 1, target.x, target.y);
      else if(h.skills[0].level > 0 && h.skills[0].cd <= 0 && d < 360)
        castSkill(h, 0, target.x, target.y);
    } else {
      h.attackTarget = null;
       const goal = botLaneObjective(h);
      h.moveTarget = {x:goal.x + rnd(-120,120), y:goal.y + rnd(-120,120)};
    }
    return;
  }

  /* === ДЖАГГЕРНАУТ === */
  if(h.def.id === 'juggernaut'){
    if(target){
      const d=Math.hypot(target.x-h.x,target.y-h.y);
      h.attackTarget=target; h.moveTarget=null;
      if(h.skills[3].level>0 && h.skills[3].cd<=0 && d<900)
        castSkill(h,3,target.x,target.y);
      else if(h.skills[0].level>0 && h.skills[0].cd<=0 && d<290)
        castSkill(h,0,h.x,h.y);
      else if(h.skills[1].level>0 && h.skills[1].cd<=0 && h.hp/h.maxHp<0.72)
        castSkill(h,1,h.x,h.y);
    } else {
      h.attackTarget=null;
      const goal=botLaneObjective(h);
      h.moveTarget={x:goal.x+rnd(-100,100),y:goal.y+rnd(-100,100)};
    }
    return;
  }

  /* === СНАЙПЕР === */
  if(h.def.id === 'sniper'){
    if(target){
      const d=Math.hypot(target.x-h.x,target.y-h.y);
      h.attackTarget=target; h.moveTarget=null;
      if(h.skills[3].level>0 && h.skills[3].cd<=0 && d<1750)
        castSkill(h,3,target.x,target.y);
      else if(h.skills[0].level>0 && h.skills[0].cd<=0 && d<1000 && (h.shrapnelCharges||0)>0)
        castSkill(h,0,target.x,target.y);
      else if(d<360){
        const away=Math.atan2(h.y-target.y,h.x-target.x);
        h.attackTarget=null;
        h.moveTarget={x:clamp(h.x+Math.cos(away)*260,80,WORLD-80),y:clamp(h.y+Math.sin(away)*260,80,WORLD-80)};
      }
    } else {
      h.attackTarget=null;
      const goal=botLaneObjective(h);
      h.moveTarget={x:goal.x+rnd(-140,140),y:goal.y+rnd(-140,140)};
    }
    return;
  }

  /* === ПИРОМАНТ / ВОЖДЬ === */
  if(target){
    const d = Math.hypot(target.x-h.x, target.y-h.y);
    h.attackTarget = target; h.moveTarget = null;
    const isHero = target.type==='hero';

    if(h.def.id==='pyro'){
      if(h.skills[0].level>0 && h.skills[0].cd<=0 && d<850)
        castSkill(h, 0, target.x, target.y);
      if(h.skills[1].level>0 && h.skills[1].cd<=0 && d<300)
        castSkill(h, 1, h.x, h.y);
      if(isHero && h.skills[3].level>0 && h.skills[3].cd<=0 && d<1000)
        castSkill(h, 3, target.x + rnd(-60,60), target.y + rnd(-60,60));
    } else if(h.def.id==='arcady'){
      if(h.skills[0].level>0 && h.skills[0].cd<=0 && d<1000) castSkill(h,0,target.x,target.y);
      if(h.skills[1].level>0 && h.skills[1].cd<=0 && d<850) castSkill(h,1,target.x,target.y);
      if(isHero && h.skills[3].level>0 && h.skills[3].cd<=0 && d<1100) castSkill(h,3,target.x,target.y);
    } else {
      if(h.skills[0].level>0 && h.skills[0].cd<=0 && d<260)
        castSkill(h, 0, target.x, target.y);
      if(h.skills[1].level>0 && h.skills[1].cd<=0 && hpPct<0.65)
        castSkill(h, 1, h.x, h.y);
      if(isHero && h.skills[2].level>0 && h.skills[2].cd<=0 && d>200 && d<620)
        castSkill(h, 2, target.x, target.y);
      if(isHero && h.skills[3].level>0 && h.skills[3].cd<=0 && d<400)
        castSkill(h, 3, h.x, h.y);
    }
  } else {
    h.attackTarget = null;
    const goal = botLaneObjective(h);
    h.moveTarget = {x:goal.x + rnd(-120,120), y:goal.y + rnd(-120,120)};
  }
}

function update(dt){
  if(gameState !== 'playing') return;
  if(talentOpen) return;
  gameTime += dt;
  updateBotChatReplies();
  if(killStreakBanner.t > 0) killStreakBanner.t = Math.max(0, killStreakBanner.t - dt);
  if(rampageBanner.t > 0) rampageBanner.t = Math.max(0, rampageBanner.t - dt);
  if(gameTime > 0 && Math.floor(gameTime/120) !== Math.floor((gameTime-dt)/120)) spawnRunes();
  updateRunes(dt);

  for(const hero of heroes){
    hero.coinTimer += dt;
    while(hero.coinTimer >= 1){ hero.coinTimer -= 1; hero.coins += 3; }
  }
  if(testMode && playerHero){ playerHero.coins = 99999; playerHero.coinTimer = 0; }

  waveTimer -= dt;
  if(waveTimer <= 0){ waveTimer = WAVE_INTERVAL; if(!testMode) spawnWave(); }

  for(const h of heroes){
    if(h.dead){ h.update(dt); continue; }
    if(h !== playerHero && !h.isDummy && (!h.isOnlineRemote || h.isOnlineBot)) updateEnemyAI(h, dt);
    h.update(dt);
  }
  updateMo3giMines(dt);
  for(const u of units){
    if(u.type === 'neutral' && u.dead){
      u.respawnTimer -= dt;
      if(u.respawnTimer <= 0){
        u.dead = false; u.hp = u.maxHp; u.x = u.homeX; u.y = u.homeY;
        u.attackTarget = null; u.moveTarget = null;
      }
    }
    if(u.type==='hero'||u.dead) continue;
    u.update(dt);
  }

  for(const p of projectiles){
    if(p.dead) continue;
    p.prevX = p.x;
    p.prevY = p.y;
    p.life -= dt;
    p.trailTimer -= dt;
    if(p.trailTimer <= 0){
      p.trailTimer = p.isSpell ? 0.045 : 0.075;
      spawnParticles(p.x,p.y,p.color,p.isSpell ? 2 : 1,p.isSpell ? 0.22 : 0.12);
    }
    if(p.kind){
      if(p.life<=0){ p.dead=true; continue; }
      if(p.phase==='flight'){
        const dx=p.tx-p.x, dy=p.ty-p.y, d=Math.hypot(dx,dy)||1, step=p.speed*dt;
        if(d<=step){
          p.x=p.tx; p.y=p.ty; p.phase=p.kind==='meteor'?'fall':'roll';
        } else {
          p.x+=dx/d*step; p.y+=dy/d*step;
        }
        continue;
      }
      if(p.fall>0){
        p.fall-=dt;
        if(p.fall<=0 && p.kind==='meteor' && !p.rolled){
          let target=null, best=950;
          for(const u of units){
            if(u.dead||u.team===p.team) continue;
            const distance=Math.hypot(u.x-p.x,u.y-p.y);
            if(distance<best){ best=distance; target=u; }
          }
          if(target){
            const distance=Math.hypot(target.x-p.x,target.y-p.y)||1;
            p.dirX=(target.x-p.x)/distance; p.dirY=(target.y-p.y)/distance;
          }
          p.rolled=true;
        }
        continue;
      }
      p.x += p.dirX*p.speed*dt; p.y += p.dirY*p.speed*dt;
      for(const u of units){
        if(u.dead||u.team===p.team) continue;
        if(Math.hypot(u.x-p.x,u.y-p.y)<p.radius+u.radius){
          if(p.kind==='tornado' && isStructure(u)){ p.dead=true; break; }
          applyDamage(u,p.dmg,p.source || {team:p.team});
          if(p.kind==='tornado'){
            const distance = Math.hypot(u.x-p.x,u.y-p.y) || 1;
            u.knockbackX = (u.x-p.x)/distance * 260;
            u.knockbackY = (u.y-p.y)/distance * 260;
            u.knockbackTimer = 0.65;
            u.stunTimer = 1.35;
            u.liftTimer = 0.65;
            addText(u.x,u.y-55,'ПОДКИНУТ','#d0e0ff',0.9,13);
          }
          p.dead=true; break;
        }
      }
      continue;
    }
    if(p.life<=0 || !p.target || p.target.dead){ p.dead = true; continue; }
    let dx = p.target.x - p.x, dy = p.target.y - p.y;
    if(p.spread){
      const targetAngle = Math.atan2(dy, dx) + p.spread;
      const targetDistance = Math.hypot(dx, dy);
      dx = Math.cos(targetAngle) * targetDistance;
      dy = Math.sin(targetAngle) * targetDistance;
    }
    const d = Math.hypot(dx,dy)||1;
    const step = p.speed*dt;
    if(d <= step + p.target.radius){
      const attackOwner=p.source && (p.source.source || p.source);
      const scepterOwner=attackOwner && attackOwner.def && attackOwner.def.id==='tribupainer' ? attackOwner : null;
      applyDamage(p.target, p.dmg * (scepterOwner && hasScepter(scepterOwner) ? 1.2 : 1), p.source || {team:p.team});
      if(p.headshot && !p.target.dead){
        const slowDuration=p.headshotSlowDuration || 0.85;
        p.target.slow=Math.max(p.target.slow||0,p.headshotSlow||0.25);
        p.target.slowT=Math.max(p.target.slowT||0,slowDuration);
        p.target.attackSlow=Math.max(p.target.attackSlow||0,p.headshotAttackSlow||0.30);
        p.target.attackSlowT=Math.max(p.target.attackSlowT||0,slowDuration);
        addText(p.target.x,p.target.y-p.target.radius-30,'ЗАМЕДЛЕНИЕ','#ffe0a0',0.55,12);
        fxRing(p.target.x,p.target.y,34,'#ffe0a0',0.28);
      }
      if(p.incendiary) igniteUnit(p.target,attackOwner,scepterOwner && hasScepter(scepterOwner) ? 7 : 5,scepterOwner && hasScepter(scepterOwner) ? 35 : 25);
      if(attackOwner && attackOwner.def && attackOwner.def.id === 'illusionist' && attackOwner.isPlayer && Math.random() < 0.15) spawnPassiveIllusion(attackOwner, p.target);
      if(p.kind === 'dynamite'){
        const explosionRadius = 125;
        fxRing(p.target.x, p.target.y, explosionRadius, '#ff7043', 0.55);
        for(const unit of units){
          if(unit === p.target || unit.dead || unit.team === p.team || isStructure(unit)) continue;
          if(Math.hypot(unit.x-p.target.x, unit.y-p.target.y) <= explosionRadius + unit.radius){
            applyDamage(unit, p.dmg, p.source || {team:p.team});
          }
        }
      }
      fxHit(p.target.x, p.target.y, p.color);
      p.dead = true;
    } else {
      p.x += dx/d*step; p.y += dy/d*step;
    }
  }
  projectiles = projectiles.filter(p => !p.dead);

  for(const a of aoes){
    if(a.dead) continue;
    a.t += dt;
    if(a.dawnField){
      /* Рассветный круг: пока он активен, каждый тик лечит союзников и жжёт
         врагов внутри. Когда время выходит, Рассветная дева влетает в центр
         и наносит мощный точечный урон со станом всем врагам в зоне. */
      a.pulseTimer = (a.pulseTimer || 0) + dt;
      while(a.pulseTimer >= (a.tickInterval || 0.5)){
        a.pulseTimer -= (a.tickInterval || 0.5);
        for(const u of units){
          if(u.dead) continue;
          if(Math.hypot(u.x-a.x, u.y-a.y) > a.radius + u.radius) continue;
          if(u.team === a.team){
            u.hp = Math.min(u.maxHp, u.hp + a.healAmt);
            addText(u.x, u.y-u.radius-14, '+'+Math.round(a.healAmt), '#9dffb0', 0.5, 13);
            spawnParticles(u.x, u.y, '#fff4af', 4, 0.3);
          } else if(!isBuilding(u)){
            applyDamage(u, a.burnAmt, {team:a.team, source:a.source});
          }
        }
        fxRing(a.x, a.y, a.radius*0.94, a.color, 0.18);
      }
      if(!a.landed && a.t >= a.life){
        a.landed = true; a.dead = true;
        const h = a.source;
        if(h && !h.dead){
          h.x = clamp(a.x, 60, WORLD-60); h.y = clamp(a.y, 60, WORLD-60);
          for(const u of units){
            if(u.dead || u.team === a.team || isBuilding(u)) continue;
            if(Math.hypot(u.x-a.x, u.y-a.y) <= a.radius + u.radius){
              applyDamage(u, a.landDmg, h);
              u.stunTimer = Math.max(u.stunTimer, 1.3 + 0.15*(a.ultLvl||1));
            }
          }
          heroBurst(h, '#fff4af', a.radius+40, 60);
          fxRing(a.x, a.y, a.radius, '#fffce0', 0.55);
          playHeroSfx('jump');
          addText(h.x, h.y-90, 'РАССВЕТ!', '#fff4af', 1.3, 20);
        }
      }
      continue;
    }
    if(a.shrapnel){
      /* Shrapnel — это постоянное поле: каждый тик проверяет всех врагов,
         которые сейчас находятся внутри, а не только тех, кто был там при касте. */
      if(!a.applied){
        a.applied = true;
        fxRing(a.x, a.y, a.radius, a.color, 0.5);
      }
      a.pulseTimer = (a.pulseTimer || 0) + dt;
      while(a.pulseTimer >= (a.tickInterval || 0.5)){
        a.pulseTimer -= (a.tickInterval || 0.5);
        for(const u of units){
          if(u.team===a.team || u.dead || isBuilding(u)) continue;
          if(Math.hypot(u.x-a.x, u.y-a.y) <= a.radius + u.radius){
            applyDamage(u, a.dmg, a.source || {team:a.team});
            u.slow = Math.max(u.slow || 0, a.slow || 0.35);
            u.slowT = Math.max(u.slowT || 0, (a.tickInterval || 0.5) + 0.2);
            u.hitFlash = Math.max(u.hitFlash || 0, 0.12);
          }
        }
        fxRing(a.x, a.y, a.radius * 0.92, a.color, 0.16);
      }
      if(a.t > a.life) a.dead = true;
      continue;
    }
    if(!a.applied && a.t >= a.delay){
      a.applied = true;
      fxRing(a.x, a.y, a.radius, a.color, 0.5);
      for(const u of units){
        if(u.team===a.team||u.dead) continue;
        if(Math.hypot(u.x-a.x, u.y-a.y) < a.radius + u.radius){
          applyDamage(u, a.dmg, a.source || {team:a.team});
          if(a.silenceDuration && !isStructure(u)) u.silenceTimer=Math.max(u.silenceTimer,a.silenceDuration);
          if(a.manaDmg && u.maxMp && !isStructure(u)){
            u.mp = Math.max(0,u.mp-a.manaDmg);
            addText(u.x,u.y-40,'-'+a.manaDmg+' MP','#8fc4ff',1.0,14);
          }
        }
      }
    if((a.poisonField || a.burnField) && a.applied){
      a.pulseTimer = (a.pulseTimer || 0) + dt;
      if(a.pulseTimer >= (a.tickInterval || 0.5)){
        a.pulseTimer = 0;
        for(const u of units){
          if(u.team===a.team||u.dead||isBuilding(u)) continue;
          if(Math.hypot(u.x-a.x,u.y-a.y) < a.radius+u.radius){
            applyDamage(u,a.dmg,a.source || {team:a.team});
            if(a.poisonField) u.silenceTimer=Math.max(u.silenceTimer,a.silenceDuration);
            if(a.burnField){
              u.buffs = u.buffs.filter(buff => buff.type !== 'burning');
              u.addBuff({type:'burning', val:a.dmg, t:(a.tickInterval || 1) + 0.15});
              addText(u.x,u.y-u.radius-14,'ГОРИТ','#ff9a45',0.55,12);
            }
          }
        }
      }
    }
    /* Дожигание Молотова Аркадия: после выхода из огня цель ещё 5 секунд
       горит остаточным пламенем (25 урона/сек), отдельно от прямых тиков
       в самом костре. Отслеживаем, кто был внутри в прошлом кадре, чтобы
       поймать момент выхода. */
    if(a.residualBurn && a.applied){
      a.insideSet = a.insideSet || new Set();
      const currentlyInside = new Set();
      for(const u of units){
        if(u.team===a.team||u.dead||isBuilding(u)) continue;
        if(Math.hypot(u.x-a.x,u.y-a.y) < a.radius+u.radius) currentlyInside.add(u);
      }
      for(const u of a.insideSet){
        if(!currentlyInside.has(u) && !u.dead){
          igniteUnit(u, a.source || {team:a.team}, 5, 25);
        }
      }
      a.insideSet = currentlyInside;
      if(a.t > a.delay + a.life){
        for(const u of a.insideSet){
          if(!u.dead) igniteUnit(u, a.source || {team:a.team}, 5, 25);
        }
      }
    }
    }
    if(a.t > a.delay + a.life) a.dead = true;
  }
  aoes = aoes.filter(a => !a.dead);

  for(const wall of walls){
    wall.t += dt;
    const ux=Math.cos(wall.angle), uy=Math.sin(wall.angle);
    for(const u of units){
      if(u.dead||u.team===wall.team||isStructure(u)) continue;
      const dx=u.x-wall.x, dy=u.y-wall.y;
      const along=dx*ux+dy*uy, across=Math.abs(dx*uy-dy*ux);
      if(Math.abs(along)<wall.length/2 && across<wall.width+u.radius){
        u.slow=wall.slow; u.slowT=0.25;
        if(!wall.hit.has(u)){
          wall.hit.add(u);
          applyDamage(u,wall.dmg,wall.source || {team:wall.team});
          if(wall.stun) u.stunTimer=Math.max(u.stunTimer,wall.stun);
        }
      }
    }
  }
  walls = walls.filter(w => w.t < w.life);

  for(const f of fxs) f.t += dt;
  fxs = fxs.filter(f => f.t < f.life);
  for(const p of particles){
    p.t += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(p.drag, dt*60);
    p.vy = p.vy * Math.pow(p.drag, dt*60) + p.gravity * dt;
  }
  particles = particles.filter(p => p.t < p.life);
  for(const gb of grassBends) gb.t += dt;
  grassBends = grassBends.filter(gb => gb.t < gb.life);
  for(const t of texts){ t.t += dt; t.y -= 28*dt; }
  texts = texts.filter(t => t.t < t.life);

  units = units.filter(u => !(u.dead && u.type !== 'hero' && u.type !== 'neutral'));

  if(playerHero){
    const focusUnit=getControlledUnit();
    const tx = focusUnit.x, ty = focusUnit.y;
    if(!cameraManual){
      cam.x += (tx-cam.x) * Math.min(1, dt*8);
      cam.y += (ty-cam.y) * Math.min(1, dt*8);
    }
    cam.x += (edgePan.x + cameraKeys.x) * 720 * dt;
    cam.y += (edgePan.y + cameraKeys.y) * 720 * dt;
    const hw = VW/2, hh = VH/2;
    cam.x = VW>=WORLD ? WORLD/2 : clamp(cam.x, hw, WORLD-hw);
    cam.y = VH>=WORLD ? WORLD/2 : clamp(cam.y, hh, WORLD-hh);
  }
  visionTimer -= dt;
  if(visionTimer <= 0){ visionTimer = 0.12; updateVision(); }
}

function updateVision(){
  visGrid.fill(0);
  for(const u of units){
    /*
       После смерти героя не убираем его обзор мгновенно. Иначе, если
       союзные крипы/башни уже уничтожены, drawFog() получает полностью
       непрозрачный слой и игрок видит только чёрный экран до респауна.
    */
    const keepsVisionAfterDeath = u === playerHero && u.dead && u.respawnTimer > 0;
    if(u.team!==0 || (u.dead && !keepsVisionAfterDeath)) continue;
    const cx = Math.floor(u.x/CELL), cy = Math.floor(u.y/CELL);
    const r = Math.ceil(u.vision/CELL);
    for(let j=-r;j<=r;j++){
      for(let i=-r;i<=r;i++){
        const gx = cx+i, gy = cy+j;
        if(gx<0||gy<0||gx>=GRID||gy>=GRID) continue;
        const dx = (gx+0.5)*CELL - u.x;
        const dy = (gy+0.5)*CELL - u.y;
        if(dx*dx+dy*dy <= u.vision*u.vision) visGrid[gy*GRID+gx] = 1;
      }
    }
  }
  for(let i=0;i<visGrid.length;i++) if(visGrid[i]) explored[i] = 1;
}

function isVisibleToPlayer(u){
  if(u.invisible && u.team !== 0) return false;
  if(u.team===0) return true;
  if(u.type==='hero' && u.hp/u.maxHp < 0.25 && heroes.some(hero => hero.team===0 && !hero.dead && hero.def.id==='sasych')) return true;
  for(const s of units){
    if(s.team!==0||s.dead) continue;
    if(Math.hypot(s.x-u.x, s.y-u.y) < s.vision) return true;
  }
  return false;
}

function drawFog(){
  if(fogCanvas.width !== VW || fogCanvas.height !== VH){
    fogCanvas.width = VW; fogCanvas.height = VH;
  }
  fogCtx.setTransform(1,0,0,1,0,0);
  fogCtx.globalCompositeOperation = 'source-over';
  fogCtx.clearRect(0,0,VW,VH);
  /*
     На смерти оставляем карту различимой под туманом. Полностью
     непрозрачная заливка здесь и была причиной визуального чёрного экрана,
     когда у команды игрока временно не оставалось живых источников обзора.
  */
  fogCtx.globalAlpha = 1;
  fogCtx.fillStyle = playerHero && playerHero.dead
    ? 'rgba(4,6,12,0.38)'
    : 'rgba(4,6,12,0.52)';
  fogCtx.fillRect(0,0,VW,VH);

  const ox = -cam.x + VW/2, oy = -cam.y + VH/2;
  fogCtx.globalCompositeOperation = 'destination-out';
  for(const u of units){
    if(u.team!==0||u.dead) continue;
    const sx = u.x+ox, sy = u.y+oy;
    const r = u.vision;
    if(sx<-r||sy<-r||sx>VW+r||sy>VH+r) continue;
    const g = fogCtx.createRadialGradient(sx, sy, r*0.55, sx, sy, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    fogCtx.fillStyle = g;
    fogCtx.beginPath(); fogCtx.arc(sx, sy, r, 0, Math.PI*2); fogCtx.fill();
  }

  const c0x = Math.max(0, Math.floor((cam.x - VW/2)/CELL));
  const c1x = Math.min(GRID-1, Math.floor((cam.x + VW/2)/CELL));
  const c0y = Math.max(0, Math.floor((cam.y - VH/2)/CELL));
  const c1y = Math.min(GRID-1, Math.floor((cam.y + VH/2)/CELL));
  fogCtx.fillStyle = 'rgba(0,0,0,0.62)';
  for(let gy=c0y; gy<=c1y; gy++){
    for(let gx=c0x; gx<=c1x; gx++){
      const i = gy*GRID+gx;
      if(explored[i] && !visGrid[i]){
        fogCtx.fillRect(gx*CELL + ox, gy*CELL + oy, CELL, CELL);
      }
    }
  }
  fogCtx.globalCompositeOperation = 'source-over';
  ctx.drawImage(fogCanvas, 0, 0);
}

function screenToWorld(sx, sy){
  return {x: sx - VW/2 + cam.x, y: sy - VH/2 + cam.y};
}

canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
  if(cameraDrag.active){
    cam.x -= mouse.x - cameraDrag.lastX;
    cam.y -= mouse.y - cameraDrag.lastY;
    cameraDrag.lastX = mouse.x;
    cameraDrag.lastY = mouse.y;
    cameraManual = true;
  }
  const w = screenToWorld(mouse.x, mouse.y);
  mouse.wx = w.x; mouse.wy = w.y;
  updatePhraseWheelSelection();
  const edge=42;
  edgePan.x = mouse.x < edge ? -1 : (mouse.x > VW-edge ? 1 : 0);
  edgePan.y = mouse.y < edge ? -1 : (mouse.y > VH-edge ? 1 : 0);
});

canvas.addEventListener('wheel', e => {
  if(gameState === 'menu' && changelogOpen){
    const panel={x:Math.max(18,VW/2-360),y:Math.max(22,VH/2-280),w:Math.min(720,VW-36),h:Math.min(560,VH-44)};
    if(e.clientX>=panel.x && e.clientX<=panel.x+panel.w && e.clientY>=panel.y+68 && e.clientY<=panel.y+panel.h-54){
      const contentHeight=CHANGELOG.length*62, viewportHeight=panel.h-142;
      changelogScroll=clamp(changelogScroll+e.deltaY,0,Math.max(0,contentHeight-viewportHeight));
      e.preventDefault();
    }
    return;
  }
  if(gameState !== 'playing' || !shopOpen) return;
  const {r, totalRows, visibleRows} = shopLayout();
  if(e.clientX < r.x || e.clientX > r.x+r.w || e.clientY < r.y || e.clientY > r.y+r.h) return;
  const maxScroll = Math.max(0, totalRows-visibleRows);
  shopScrollRow = clamp(shopScrollRow + (e.deltaY > 0 ? 1 : -1), 0, maxScroll);
  e.preventDefault();
}, {passive:false});

function mo3giControlRect(){ return {x:VW-292,y:24,w:268,h:82}; }
function handleMo3giControlClick(mx,my){
  const drone=playerHero&&mo3giDroneOf(playerHero);
  if(!drone) return false;
  const r=mo3giControlRect();
  if(mx>=r.x&&mx<=r.x+r.w&&my>=r.y&&my<=r.y+r.h){
    toggleMo3giDroneControl(playerHero,drone); return true;
  }
  return false;
}

canvas.addEventListener('mousedown', e => {
  const r = canvas.getBoundingClientRect();
  const mx = e.clientX - r.left, my = e.clientY - r.top;

  if(e.button === 1){
    cameraDrag.active = true;
    cameraDrag.lastX = mx;
    cameraDrag.lastY = my;
    cameraManual = true;
    e.preventDefault();
    return;
  }

  if(gameState === 'menu'){ handleMenuClick(mx, my); return; }
  if(gameState === 'over'){
    gameState = 'menu';
    menuStage = 'home';
    settingsOpen = false;
    changelogOpen = false;
    startMenuMusic();
    return;
  }
  if(phraseWheelOpen){
    if(e.button === 0) choosePhraseFromWheel();
    e.preventDefault();
    return;
  }
  const talentToggle=talentToggleRect();
  if(mx>=talentToggle.x&&mx<=talentToggle.x+talentToggle.w&&my>=talentToggle.y&&my<=talentToggle.y+talentToggle.h){
    talentTreeOpen=!talentTreeOpen;
    return;
  }
  if(talentOpen){ handleTalentClick(mx, my); return; }
  if(!playerHero || playerHero.dead) return;
  if(handleMo3giControlClick(mx,my)) return;

  if(pendingPurchaseId){
    const panel = {x:VW/2-230,y:VH/2-125,w:460,h:250};
    const confirm = {x:panel.x+35,y:panel.y+178,w:175,h:44};
    const cancel = {x:panel.x+250,y:panel.y+178,w:175,h:44};
    if(mx>=confirm.x && mx<=confirm.x+confirm.w && my>=confirm.y && my<=confirm.y+confirm.h){
      buyShopItem(pendingPurchaseId);
      pendingPurchaseId=null;
    } else if(mx>=cancel.x && mx<=cancel.x+cancel.w && my>=cancel.y && my<=cancel.y+cancel.h){
      pendingPurchaseId=null;
    }
    return;
  }

  if(pendingSellIndex >= 0){
    const confirm = {x:VW/2-170,y:VH/2-70,w:140,h:42};
    const cancel = {x:VW/2+30,y:VH/2-70,w:140,h:42};
    if(mx>=confirm.x && mx<=confirm.x+confirm.w && my>=confirm.y && my<=confirm.y+confirm.h){
      const item=playerHero.inventory[pendingSellIndex];
      if(item){ playerHero.coins += Math.floor((SHOP_ITEMS[item.id]?.cost || 0)*0.5); playerHero.inventory[pendingSellIndex]=null; }
      pendingSellIndex=-1;
    } else if(mx>=cancel.x && mx<=cancel.x+cancel.w && my>=cancel.y && my<=cancel.y+cancel.h){
      pendingSellIndex=-1;
    }
    return;
  }

  for(let i=0;i<6;i++){
    const slotRect=inventorySlotRect(i);
    if(mx>=slotRect.x && mx<=slotRect.x+slotRect.w && my>=slotRect.y && my<=slotRect.y+slotRect.h){
      if(e.button===2){
        if(playerHero.inventory[i]) pendingSellIndex=i;
      } else if(e.button===0 && playerHero.inventory[i]){
        const item = playerHero.inventory[i];
        /*
         * Активные предметы применяются только своей забиндованной клавишей.
         * Shift+клик по-прежнему используется для перестановки слотов.
         */
        if(e.shiftKey){
          draggedInventoryIndex=i;
        } else if(item.active){
          addText(playerHero.x, playerHero.y - 58,
            'НАЖМИТЕ ' + inventoryBinds[i].toUpperCase() + ' ДЛЯ ИСПОЛЬЗОВАНИЯ',
            item.color || '#b9c7d8', 0.9, 13);
        } else {
          addText(playerHero.x, playerHero.y - 58, 'ПАССИВНЫЙ ПРЕДМЕТ', item.color || '#b9c7d8', 0.8, 13);
        }
      }
      e.preventDefault();
      return;
    }
  }

  if(testMode && handleTestPanelClick(mx, my)) return;
  if(handleHudClick(mx, my)) return;
  if(handleSkillBarClick(mx, my)) return;

  const w = screenToWorld(mx, my);
  if(e.button === 0 || e.button === 2){
    const control=getControlledUnit();
    const tgt = pickUnitAt(w.x, w.y);
    if(tgt && tgt.isMo3giDrone && tgt.owner===playerHero){
      toggleMo3giDroneControl(playerHero,tgt); return;
    }
    if(tgt && tgt.team !== playerHero.team && !tgt.dead){
      inspectUnit = tgt;
      if(control && control.isMo3giDrone){
        control.ramTarget = tgt;
        control.attackTarget = null;
        control.moveTarget = {x:tgt.x, y:tgt.y};
        addText(control.x, control.y - 48, 'ЦЕЛЬ ЗАХВАЧЕНА','#b9ffd0',0.8,13);
      } else {
        control.attackTarget = tgt;
        control.moveTarget = null;
      }
      if(isBuilding(tgt) && !canDamageStructure(tgt, null, true)){
        addText(tgt.x, tgt.y - 58, structureBlockReason(tgt), '#ffcc70', 1.4, 14);
      }
    } else if(tgt && !tgt.dead){
      inspectUnit = tgt;
    } else {
      control.attackTarget = null;
      control.moveTarget = {x:w.x, y:w.y};
      fxRing(w.x, w.y, 26, '#7fffa0', 0.35);
    }
  }
});
canvas.addEventListener('mouseup', e => {
  if(e.button === 1){ cameraDrag.active = false; return; }
  if(draggedInventoryIndex < 0) return;
  const r=canvas.getBoundingClientRect();
  const mx=e.clientX-r.left, my=e.clientY-r.top;
  for(let i=0;i<6;i++){
    const slotRect=inventorySlotRect(i);
    if(mx>=slotRect.x && mx<=slotRect.x+slotRect.w && my>=slotRect.y && my<=slotRect.y+slotRect.h){
      const temp=playerHero.inventory[i];
      playerHero.inventory[i]=playerHero.inventory[draggedInventoryIndex];
      playerHero.inventory[draggedInventoryIndex]=temp;
      break;
    }
  }
  draggedInventoryIndex=-1;
});

window.addEventListener('keydown', e => {
  if(gameState === 'menu' && settingsOpen && rebindSlot >= 0){
    if(e.code === 'Escape'){ rebindSlot=-1; return; }
    /* Сохраняем канонический латинский символ физической клавиши,
       если это буква (независимо от текущей раскладки), иначе —
       то, что реально прислала клавиша. */
    const nextKey = PHYSICAL_KEY_LETTER[e.code] || (e.key || '').toLowerCase();
    if(nextKey && nextKey.length === 1 && !['tab','enter'].includes(nextKey)){
      inventoryBinds[rebindSlot]=nextKey;
      rebindSlot=-1;
    }
    e.preventDefault();
    return;
  }
  if(e.code === 'Tab'){
    scoreboardOpen = true;
    e.preventDefault();
    return;
  }
  if(e.code === 'Enter' && gameState === 'playing' && playerHero){
    const message=window.prompt('Сообщение в чат:');
    if(message && message.trim()) addChatMessage('Вы',message.trim(),'#a8ffb0');
    e.preventDefault();
    return;
  }
  if(gameState !== 'playing' || !playerHero) return;

  const code = e.code || '';
  const key  = (e.key || '').toLowerCase();
  lastPressedKey = code + (key && key !== code.toLowerCase() ? ' (' + e.key + ')' : '');

  if(code === 'ArrowLeft' || code === 'ArrowRight' || code === 'ArrowUp' || code === 'ArrowDown'){
    cameraManual = true;
    if(code === 'ArrowLeft') cameraKeys.x = -1;
    if(code === 'ArrowRight') cameraKeys.x = 1;
    if(code === 'ArrowUp') cameraKeys.y = -1;
    if(code === 'ArrowDown') cameraKeys.y = 1;
    e.preventDefault();
    return;
  }

  if(code === 'Digit1' || code === 'Numpad1' || key === '1'){ playerHero.levelSkill(0); e.preventDefault(); return; }
  if(code === 'Digit2' || code === 'Numpad2' || key === '2'){ playerHero.levelSkill(1); e.preventDefault(); return; }
  if(code === 'Digit3' || code === 'Numpad3' || key === '3'){ playerHero.levelSkill(2); e.preventDefault(); return; }
  if(code === 'Digit4' || code === 'Numpad4' || key === '4'){ playerHero.levelSkill(3); e.preventDefault(); return; }
  if(code === 'Digit5' || code === 'Numpad5' || key === '5'){ playerHero.levelSkill(4); e.preventDefault(); return; }

  if(playerHero.dead) return;

  if(code === 'KeyK' || key === 'k'){
    if(!phraseWheelOpen && !e.repeat){
      phraseWheelOpen = true;
      phraseWheelSelection = -1;
      updatePhraseWheelSelection();
    }
    e.preventDefault();
    return;
  }

  if(code === 'KeyT' || key === 't' || key === 'е'){
    const drone = mo3giDroneOf(playerHero);
    if(drone) toggleMo3giDroneControl(playerHero, drone);
    else flashMsg(playerHero, 'Сначала вызовите дрона');
    e.preventDefault();
    return;
  }

  /*
   * У Аганим шарда пятый слот, но сама способность подписана G.
   * Раньше G искал шестой слот и поэтому всегда был пустым.
   * Если шарда нет, G служит отдельной активацией купленного Скипетра.
   */
  let itemSlot = inventoryBinds.indexOf(key);
  if(itemSlot < 0){
    const physicalLetter = PHYSICAL_KEY_LETTER[code];
    if(physicalLetter) itemSlot = inventoryBinds.indexOf(physicalLetter);
  }
  if(itemSlot >= 0){
    useInventoryItem(playerHero, itemSlot);
    e.preventDefault();
    return;
  }

  let slot = -1;
  if(code === 'KeyQ' || key === 'q' || key === 'й') slot = 0;
  else if(code === 'KeyW' || key === 'w' || key === 'ц') slot = 1;
  else if(code === 'KeyE' || key === 'e' || key === 'у') slot = 2;
  else if(code === 'KeyR' || key === 'r' || key === 'к') slot = 3;
  else if(code === 'KeyF' || key === 'f' || key === 'а') slot = 4;
  else if(code === 'KeyG' || key === 'g' || key === 'п') slot = 5;

  if(slot < 0) return;
  e.preventDefault();

  const s = playerHero.skills[slot];
  if(!s) return;

  if(s.isShard && s.def.type === 'point'){
    castSkill(playerHero, slot, mouse.wx, mouse.wy);
    return;
  }

  if(s.def.type === 'self'){
    castSkill(playerHero, slot, playerHero.x, playerHero.y);
  } else {
    castSkill(playerHero, slot, mouse.wx, mouse.wy);
  }
});
window.addEventListener('keyup', e => {
  if(e.code === 'Tab') scoreboardOpen = false;
  if(e.code === 'ArrowLeft' || e.code === 'ArrowRight') cameraKeys.x = 0;
  if(e.code === 'ArrowUp' || e.code === 'ArrowDown') cameraKeys.y = 0;
  if((e.code === 'KeyK' || (e.key || '').toLowerCase() === 'k') && phraseWheelOpen){
    choosePhraseFromWheel();
    e.preventDefault();
  }
});

function pickUnitAt(x, y){
  let best=null, bd=70;
  for(const u of units){
    if(u.dead) continue;
    if(u.team !== 0 && !isVisibleToPlayer(u)) continue;
    const d = Math.hypot(u.x-x, u.y-y) - u.radius;
    if(d < bd){ bd=d; best=u; }
  }
  return best;
}

/* =========================================================
   ОТРИСОВКА
   ========================================================= */
/* Неровный переход дороги в траву: вместо ровной параллельной кромки — россыпь
   пятен травы, наступающей на дорогу, и пятен земли, выступающей в траву.
   Хэш от координат делает узор стабильным между кадрами (без мерцания). */
function edgeHash(a,b){ return Math.abs(Math.sin(a*12.9898+b*78.233)*43758.5453)%1; }
function drawRoadEdgeFringe(lane, laneIndex){
  ctx.save();
  const roadHalf = 66; // половина ширины утоптанного полотна (lineWidth 132 / 2)
  for(let i=1;i<lane.length;i++){
    const a=lane[i-1], b=lane[i];
    const dx=b.x-a.x, dy=b.y-a.y;
    const segLen=Math.hypot(dx,dy)||1;
    const ux=dx/segLen, uy=dy/segLen;
    const nx=-uy, ny=ux;
    const step = 46;
    const count = Math.max(1, Math.floor(segLen/step));
    for(let s=0;s<=count;s++){
      const t = s/count;
      const px = a.x + dx*t, py = a.y + dy*t;
      for(const side of [-1,1]){
        const h1 = edgeHash(laneIndex*7+i*3+s*1.7, side*2);
        const h2 = edgeHash(laneIndex*11+i*5.3+s*2.9, side*3+1);
        const jitter = (h1-0.5)*44; // насколько кромка гуляет туда-сюда
        const edgeX = px + nx*(roadHalf+jitter)*side;
        const edgeY = py + ny*(roadHalf+jitter)*side;
        const blobR = 14 + h2*20;
        if(h1>0.5){
          /* Трава наступает на край дороги. */
          ctx.fillStyle = h2>0.5 ? 'rgba(51,75,29,0.75)' : 'rgba(38,58,22,0.7)';
          ctx.beginPath();
          ctx.ellipse(edgeX, edgeY, blobR, blobR*0.62, Math.atan2(uy,ux)+side*0.3, 0, Math.PI*2);
          ctx.fill();
          /* Пара торчащих травинок поверх пятна для мохнатого края. */
          ctx.strokeStyle='rgba(90,120,50,0.6)'; ctx.lineWidth=1.6;
          for(let bl=0;bl<3;bl++){
            const ang = Math.atan2(ny,nx)*side + (bl-1)*0.35;
            ctx.beginPath();
            ctx.moveTo(edgeX,edgeY);
            ctx.lineTo(edgeX+Math.cos(ang)*10, edgeY+Math.sin(ang)*10-6);
            ctx.stroke();
          }
        } else {
          /* Земля дороги выступает клочком в траву. */
          ctx.fillStyle = pathTexturePattern || 'rgba(138,119,79,0.7)';
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.ellipse(edgeX, edgeY, blobR*0.8, blobR*0.5, Math.atan2(uy,ux)+side*0.2, 0, Math.PI*2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
  }
  ctx.restore();
}

function drawTerrain(){
  const terrainGradient = ctx.createLinearGradient(0, 0, WORLD, WORLD);
  terrainGradient.addColorStop(0, '#203d2b');
  terrainGradient.addColorStop(0.42, '#1d3022');
  terrainGradient.addColorStop(1, '#241d26');
  ctx.fillStyle = terrainGradient;
  ctx.fillRect(0,0,WORLD,WORLD);
  if(grassTexturePattern){
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = grassTexturePattern;
    ctx.fillRect(0,0,WORLD,WORLD);
    ctx.restore();
  }

  // Светлая и тёмная половины карты получают разные оттенки.
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.34)';
  ctx.beginPath();
  ctx.moveTo(0,0); ctx.lineTo(WORLD,0); ctx.lineTo(WORLD,WORLD); ctx.closePath();
  ctx.fill();
  ctx.fillStyle='rgba(58,150,92,0.14)';
  ctx.beginPath();
  ctx.moveTo(0,0); ctx.lineTo(0,WORLD); ctx.lineTo(WORLD,WORLD); ctx.closePath();
  ctx.fill();
  ctx.restore();

  /* Мягкая сетка и крупные пятна рельефа делают пустые поля живее. */
  ctx.save();
  ctx.strokeStyle='rgba(164,211,157,0.045)';
  ctx.lineWidth=2;
  for(let x=0;x<=WORLD;x+=220){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,WORLD); ctx.stroke(); }
  for(let y=0;y<=WORLD;y+=220){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(WORLD,y); ctx.stroke(); }
  ctx.restore();

  ctx.fillStyle = 'rgba(35,60,25,0.55)';
  for(let x=0; x<WORLD; x+=220){
    for(let y=0; y<WORLD; y+=220){
      const s = ((x*13 + y*7) % 90) + 60;
      ctx.beginPath();
      ctx.arc(x + ((x*31+y*17)%160), y + ((y*7+y*41)%160), s, 0, Math.PI*2);
      ctx.fill();
    }
  }

  ctx.fillStyle='rgba(92,126,58,0.28)';
  for(let x=90; x<WORLD; x+=180){
    for(let y=90; y<WORLD; y+=210){
      if((x*7+y*11)%5 > 1) continue;
      ctx.beginPath(); ctx.arc(x+((y*3)%50),y+((x*5)%46),22,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(218,190,74,0.55)';
      ctx.fillRect(x+((y*3)%50)-2,y+((x*5)%46)-2,4,4);
      ctx.fillStyle='rgba(92,126,58,0.28)';
    }
  }

  ctx.save();
  /* Песчаное дно лежит под полупрозрачной водой, поэтому через неё видно берег. */
  ctx.strokeStyle = '#b79a61';
  ctx.lineWidth = 470; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(90, 90); ctx.lineTo(WORLD-90, WORLD-90); ctx.stroke();
  /* Сама вода теперь заметно прозрачнее — дно и берега просвечивают сквозь неё. */
  ctx.strokeStyle = 'rgba(45,125,151,0.26)';
  ctx.lineWidth = 360; ctx.stroke();
  ctx.strokeStyle = 'rgba(112,198,211,0.10)';
  ctx.lineWidth = 250; ctx.stroke();

  /* Два независимых текущих слоя ряби/бликов поверх воды — разная скорость,
     направление и масштаб не дают реке казаться одним и тем же куском текстуры. */
  const canScrollPatterns = !!(waterPatternA && waterPatternA.setTransform);
  if(canScrollPatterns){
    const mA = new DOMMatrix();
    mA.translateSelf((gameTime*30)%256, (-gameTime*16)%256);
    waterPatternA.setTransform(mA);
    const mB = new DOMMatrix();
    mB.rotateSelf(21);
    mB.translateSelf((-gameTime*17)%256, (gameTime*24)%256);
    mB.scaleSelf(1.35,1.35);
    waterPatternB.setTransform(mB);
  }
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = waterPatternA || 'rgba(150,230,235,0.2)';
  ctx.lineWidth = 300; ctx.stroke();
  ctx.globalAlpha = 0.4;
  ctx.strokeStyle = waterPatternB || 'rgba(200,246,255,0.16)';
  ctx.lineWidth = 250; ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();

  for(let laneIndex=0; laneIndex<LANES.length; laneIndex++){
    const lane = LANES[laneIndex];
    ctx.save();
    /* Мягкая размытая тень по краям сливает дорогу с травой, как в Dota 2. */
    ctx.strokeStyle = 'rgba(20,18,10,0.30)';
    ctx.lineWidth = 196;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lane[0].x, lane[0].y);
    for(let i=1;i<lane.length;i++) ctx.lineTo(lane[i].x, lane[i].y);
    ctx.stroke();
    /* Плотная тёмная обочина. */
    ctx.strokeStyle = '#3f3928';
    ctx.lineWidth = 158;
    ctx.stroke();
    /* Утоптанное полотно дороги — процедурная текстура земли, камешков и трещин. */
    ctx.strokeStyle = pathTexturePattern || '#776543';
    ctx.lineWidth = 132;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,15,8,0.22)';
    ctx.lineWidth = 132; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,235,190,0.10)';
    ctx.lineWidth = 96; ctx.stroke();
    /* Мягкая протоптанная колея по центру. */
    ctx.strokeStyle = 'rgba(60,46,28,0.35)';
    ctx.lineWidth = 40; ctx.stroke();
    ctx.restore();

    drawRoadEdgeFringe(lane, laneIndex);

    const marker = lane[Math.min(1, lane.length-1)];
    ctx.save();
    ctx.textAlign='center';
    ctx.font='900 30px Segoe UI, Arial';
    ctx.fillStyle='rgba(24,18,16,0.65)';
    ctx.fillText(LANE_NAMES[laneIndex], marker.x+3, marker.y-24+3);
    ctx.fillStyle='rgba(255,231,170,0.82)';
    ctx.fillText(LANE_NAMES[laneIndex], marker.x, marker.y-24);
    ctx.restore();
  }

  /* Песчаные берега, водоросли и камни по краям русла. */
  ctx.save();
  ctx.lineCap='round';
  for(let i=0;i<26;i++){
    const t=(i+0.5)/26;
    const x=90+(WORLD-180)*t;
    const y=90+(WORLD-180)*t;
    const side=i%2===0?-1:1;
    const offset=218+(i%4)*10;
    ctx.fillStyle=i%3===0?'#d0ae69':'#987e4d';
    ctx.beginPath(); ctx.ellipse(x+side*offset,y-side*offset*0.12,15,9,0.2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(54,116,83,0.75)'; ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(x+side*(offset-8),y-side*offset*0.12+5);
    ctx.quadraticCurveTo(x+side*(offset-5),y-side*offset*0.12-18,x+side*(offset+2),y-side*offset*0.12-28);
    ctx.moveTo(x+side*(offset+5),y-side*offset*0.12+5);
    ctx.quadraticCurveTo(x+side*(offset+12),y-side*offset*0.12-15,x+side*(offset+15),y-side*offset*0.12-22);
    ctx.stroke();
  }
  ctx.restore();

  /* Декор воды: блики и маленькие волны без травы под ними — плавно текут вдоль русла. */
  ctx.save();
  ctx.lineCap='round';
  const flowT = (gameTime*0.045) % 1;
  for(let i=0;i<30;i++){
    const t=((i+1)/31 + flowT) % 1;
    const x=90+(WORLD-180)*t;
    const y=90+(WORLD-180)*t;
    const wave=18+((i*17)%32)+Math.sin(gameTime*2+i)*3;
    const fade = Math.sin(t*Math.PI);
    ctx.globalAlpha = Math.max(0, fade);
    ctx.strokeStyle=i%3===0?'rgba(207,250,255,0.46)':'rgba(116,211,239,0.28)';
    ctx.lineWidth=i%3===0?4:2;
    ctx.beginPath();
    ctx.moveTo(x-wave,y+wave*0.18);
    ctx.quadraticCurveTo(x,y-wave*0.38,x+wave,y-wave*0.08);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  /* Камни, фонари и небольшие клумбы вдоль дорог делают маршруты заметнее. */
  for(let laneIndex=0; laneIndex<LANES.length; laneIndex++){
    const lane=LANES[laneIndex];
    for(let i=1;i<lane.length;i++){
      const a=lane[i-1], b=lane[i];
      const dx=b.x-a.x, dy=b.y-a.y, length=Math.hypot(dx,dy)||1;
      const nx=-dy/length, ny=dx/length;
      for(const side of [-1,1]){
        const t=0.38+(i%2)*0.24;
        const px=a.x+dx*t+nx*side*92;
        const py=a.y+dy*t+ny*side*92;
        ctx.save();
        ctx.translate(px,py);
        ctx.fillStyle='#5b5140';
        ctx.beginPath(); ctx.ellipse(0,0,13,8,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='rgba(212,191,139,0.55)'; ctx.lineWidth=2; ctx.stroke();
        if((i+laneIndex+side)>0){
          ctx.fillStyle='rgba(255,202,91,0.72)';
          ctx.shadowColor='#ffd36a'; ctx.shadowBlur=12;
          ctx.beginPath(); ctx.arc(0,-13,5,0,Math.PI*2); ctx.fill();
          ctx.shadowBlur=0;
          ctx.strokeStyle='#704c2b'; ctx.lineWidth=3;
          ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(0,11); ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  /* Маленькие домики на свободных островках карты. */
  for(const house of DECORATIVE_HOUSES){
    const p=mapPoint(house.x,house.y);
    const nearLane=LANES.some((lane,index)=>laneDistanceToPoint(p.x,p.y,index)<260);
    const nearRiver=pointSegmentDistance(p.x,p.y,90,90,WORLD-90,WORLD-90)<330;
    if(nearLane || nearRiver) continue;
    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.scale(house.s,house.s);
    ctx.fillStyle='rgba(10,15,12,0.38)';
    ctx.beginPath(); ctx.ellipse(0,35,72,23,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=house.wall;
    ctx.strokeStyle='rgba(53,34,25,0.9)'; ctx.lineWidth=4;
    ctx.fillRect(-48,-8,96,62); ctx.strokeRect(-48,-8,96,62);
    ctx.fillStyle=house.roof;
    ctx.beginPath(); ctx.moveTo(-64,-8); ctx.lineTo(0,-58); ctx.lineTo(64,-8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#5b382a'; ctx.fillRect(-13,25,26,29);
    ctx.fillStyle='rgba(255,215,118,0.9)';
    ctx.shadowColor='#ffd36a'; ctx.shadowBlur=12;
    ctx.fillRect(-36,7,19,18); ctx.fillRect(17,7,19,18);
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,240,177,0.7)'; ctx.lineWidth=2;
    ctx.strokeRect(-36,7,19,18); ctx.strokeRect(17,7,19,18);
    ctx.fillStyle='#3e3026'; ctx.fillRect(31,-45,10,25);
    ctx.fillStyle='rgba(221,232,207,0.24)';
    ctx.beginPath(); ctx.arc(36,-58,12,0,Math.PI*2); ctx.arc(43,-72,9,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  for(const camp of NEUTRAL_CAMPS){
    const center = camp[0];
    ctx.save();
    ctx.strokeStyle = 'rgba(218,170,94,0.28)';
    ctx.lineWidth = 5;
    ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.arc(center.x, center.y, 115, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(218,170,94,0.08)';
    ctx.beginPath(); ctx.arc(center.x, center.y, 105, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  for(const tree of trees){
    if(tree.x < cam.x-VW/2-60 || tree.x > cam.x+VW/2+60 || tree.y < cam.y-VH/2-60 || tree.y > cam.y+VH/2+60) continue;
    ctx.save(); ctx.translate(tree.x,tree.y);
    if(tree.kind==='pine'){
      ctx.fillStyle='#4b2c1f'; ctx.fillRect(-5,2,10,38);
      ctx.fillStyle='#1a543e'; ctx.beginPath(); ctx.moveTo(0,-38); ctx.lineTo(-23,10); ctx.lineTo(23,10); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#2d8a5c'; ctx.beginPath(); ctx.moveTo(0,-28); ctx.lineTo(-18,5); ctx.lineTo(18,5); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#7bd878'; ctx.beginPath(); ctx.arc(-5,-25,4,0,Math.PI*2); ctx.fill();
    } else if(tree.kind==='birch'){
      ctx.fillStyle='#d7c89d'; ctx.fillRect(-5,0,10,40);
      ctx.fillStyle='#6d5135'; ctx.fillRect(-5,7,10,4); ctx.fillRect(-5,20,10,4);
      ctx.fillStyle='#8fbd63'; ctx.beginPath(); ctx.arc(-15,-7,17,0,Math.PI*2); ctx.arc(12,-9,19,0,Math.PI*2); ctx.arc(0,-25,18,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(212,243,145,0.7)'; ctx.beginPath(); ctx.arc(-7,-28,5,0,Math.PI*2); ctx.arc(14,-10,4,0,Math.PI*2); ctx.fill();
    } else if(tree.kind==='autumn'){
      ctx.fillStyle='#4a2d21'; ctx.fillRect(-5,0,10,40);
      ctx.strokeStyle='#5b3823'; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(0,10); ctx.lineTo(-20,-10); ctx.moveTo(0,8); ctx.lineTo(20,-13); ctx.stroke();
      const autumnColors=['#c66b38','#d39a3f','#9f4936'];
      for(let i=0;i<7;i++){
        ctx.fillStyle=autumnColors[i%autumnColors.length];
        ctx.beginPath(); ctx.arc(-17+(i%3)*15,-18-Math.floor(i/3)*9,10,0,Math.PI*2); ctx.fill();
      }
    } else if(tree.kind==='crystal'){
      ctx.fillStyle='#29405c'; ctx.fillRect(-4,8,8,28);
      ctx.fillStyle='#5ccfe0'; ctx.strokeStyle='#b7fbff'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(0,-34); ctx.lineTo(13,-12); ctx.lineTo(8,10); ctx.lineTo(-9,8); ctx.lineTo(-15,-12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='rgba(220,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(-2,-28); ctx.lineTo(3,-14); ctx.lineTo(-3,-5); ctx.closePath(); ctx.fill();
    } else {
      ctx.fillStyle='#3d251c'; ctx.fillRect(-5,5,10,34);
      ctx.fillStyle='#70452d'; ctx.fillRect(-3,7,4,28);
      ctx.fillStyle='#1b5a46'; ctx.beginPath(); ctx.arc(-14,1,16,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#27845a'; ctx.beginPath(); ctx.arc(11,-3,20,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#46b96b'; ctx.beginPath(); ctx.arc(0,-18,15,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(169,236,126,0.65)'; ctx.beginPath(); ctx.arc(-7,-23,5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(11,55,43,0.7)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-21,5); ctx.lineTo(-7,-5); ctx.moveTo(4,4); ctx.lineTo(19,-8); ctx.stroke();
    }
    ctx.restore();
  }

  for(let t=0;t<2;t++){
    const b = BASES[t];
    const g = ctx.createRadialGradient(b.x,b.y,20,b.x,b.y,420);
    g.addColorStop(0, t===0 ? 'rgba(80,200,90,0.35)' : 'rgba(220,70,70,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(b.x,b.y,420,0,Math.PI*2); ctx.fill();
    ctx.save();
    ctx.strokeStyle = t===0 ? 'rgba(120,255,140,0.5)' : 'rgba(255,120,120,0.5)';
    ctx.lineWidth = 4; ctx.setLineDash([18, 14]);
    ctx.beginPath(); ctx.arc(b.x, b.y, BASE_HEAL_RADIUS, 0, Math.PI*2); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(b.x,b.y);
    ctx.strokeStyle=t===0 ? '#b5ff9b' : '#ff9c9c';
    ctx.fillStyle=t===0 ? 'rgba(91,255,126,0.2)' : 'rgba(255,91,91,0.2)';
    ctx.lineWidth=6;
    ctx.beginPath(); ctx.arc(0,0,92+Math.sin(gameTime*2)*5,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-62,48); ctx.lineTo(0,-66); ctx.lineTo(62,48); ctx.closePath(); ctx.stroke();
    ctx.fillStyle=t===0 ? '#d7ff9b' : '#ffb0a0';
    ctx.beginPath(); ctx.arc(0,-66,12+Math.sin(gameTime*4)*3,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 20;
  ctx.strokeRect(0,0,WORLD,WORLD);
}

function getWeaponConfig(unit){
  if(unit.def && unit.def.weapon) return unit.def.weapon;
  if(unit.type === 'creep'){
    return unit.ranged
      ? {type:'forestBow', color:unit.team===0?'#a8ffce':'#ffd0a8', size:0.5}
      : {type:'forestBlade', color:unit.team===0?'#7dffb0':'#ffb07d', size:0.38};
  }
  if(unit.type !== 'hero' || unit.atkRange > 220) return null;
  const id=unit.def && unit.def.id;
  if(id==='ilya' || id==='golly') return {type:'hammer',color:unit.def.color2 || '#d9f7ff',size:0.95};
  if(id==='malit') return {type:'club',color:'#f0c69a',size:1.05};
  if(id==='sasych') return {type:'sword',color:'#ff7180',size:1.0};
  return {type:'sword',color:unit.def && unit.def.color2 || '#d7e6ef',size:0.95};
}

function drawReferenceTexture(image, accent){
  if(!image || !(image.naturalWidth || image.width)) return false;
  const isSniperTexture = image === sniperTexture;
  const w=isSniperTexture ? 76 : 72;
  const h=isSniperTexture ? 82 : 88;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0,-4,34,49,0,0,Math.PI*2);
  ctx.clip();
  ctx.globalAlpha=0.98;
  ctx.drawImage(image,-w/2,-h+18,w,h);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle=accent || '#ffffff';
  ctx.globalAlpha=0.65;
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.ellipse(0,-4,34,49,0,0,Math.PI*2); ctx.stroke();
  ctx.restore();
  return true;
}

function drawUnitWeapon(unit){
  const weapon=getWeaponConfig(unit);
  if(!weapon) return;
  const target=unit.attackTarget && unit.attackTarget.alive ? unit.attackTarget : null;
  const direction=weapon.followFacing && unit.isPlayer
    ? Math.atan2(mouse.wy-unit.y, mouse.wx-unit.x)
    : (target ? Math.atan2(target.y-unit.y,target.x-unit.x) : (unit.attackAngle || unit.facing || 0));
  const progress=unit.isAttacking ? Math.min(1,unit.attackAnimProgress) : 0;
  const swing=unit.isAttacking ? (-Math.PI/3 + progress*Math.PI*2/3) : 0.12 + Math.sin(gameTime*2.4+unit.x)*0.035;
  const scale=weapon.size || 1;
  const color=weapon.color || '#e8edf2';
  ctx.save();
  ctx.rotate(direction+swing);
  ctx.translate(unit.radius*0.48,0);
  ctx.scale(scale,scale);
  ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.shadowColor=color; ctx.shadowBlur=weapon.type==='dualBlades' ? 14 : 8;
  ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=3;
  if(weapon.type==='katana'){
    /* Длинная светящаяся катана Джаггернаута с красной рукоятью. */
    ctx.strokeStyle='#4c1d1d'; ctx.lineWidth=6;
    ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(16,0); ctx.stroke();
    ctx.strokeStyle='#e4a33a'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(2,-10); ctx.lineTo(2,10); ctx.stroke();
    const blade=ctx.createLinearGradient(16,-8,92,8);
    blade.addColorStop(0,'#fff9dd'); blade.addColorStop(0.38,color); blade.addColorStop(1,'#b7d6e6');
    ctx.fillStyle=blade; ctx.strokeStyle='#6a8494'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(13,-7); ctx.lineTo(82,-5); ctx.lineTo(104,0);
    ctx.lineTo(82,5); ctx.lineTo(13,7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#ffffff'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(24,-2); ctx.lineTo(87,0); ctx.stroke();
    ctx.fillStyle='#d74646'; ctx.beginPath(); ctx.arc(-3,0,5,0,Math.PI*2); ctx.fill();
  } else if(weapon.type==='sniperRifle'){
    /* Более короткая винтовка: силуэт остаётся читаемым, но не перекрывает бойца. */
    ctx.fillStyle='#4a2d20'; ctx.strokeStyle='#171217'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(-10,-9); ctx.lineTo(22,-11); ctx.lineTo(40,-6);
    ctx.lineTo(40,7); ctx.lineTo(20,10); ctx.lineTo(4,5); ctx.lineTo(-13,12);
    ctx.lineTo(-22,8); ctx.lineTo(-18,0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#9b7044'; ctx.strokeStyle='#352216'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(8,-10,35,20,3); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#2b3038'; ctx.strokeStyle='#11151b'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(38,-5,58,10,3); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#161b22'; ctx.strokeStyle='#8b6b48'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(23,-19,28,9,3); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#ffd27a'; ctx.shadowColor='#ffd27a'; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.arc(88,0,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.strokeStyle='#d9b079'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(16,-8); ctx.lineTo(30,-23); ctx.lineTo(43,-23); ctx.stroke();
  } else if(weapon.type==='dualBlades'){
    for(const side of [-1,1]){
      ctx.save(); ctx.translate(0,side*10); ctx.rotate(side*0.18);
      ctx.strokeStyle=color; ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.quadraticCurveTo(14,side*5,29,side*3); ctx.quadraticCurveTo(43,side*1,48,side*15); ctx.stroke();
      ctx.strokeStyle='#fff4ff'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(8,side*1); ctx.quadraticCurveTo(28,side*2,43,side*11); ctx.stroke();
      ctx.restore();
    }
  } else if(weapon.type==='hammer' && unit.def && unit.def.id==='dawnMaiden'){
    // Молот Dawnbreaker: тяжёлая золотая головка с солнечной вставкой.
    ctx.strokeStyle='#6b4430'; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(47,0); ctx.stroke();
    ctx.fillStyle='#d18b2e'; ctx.strokeStyle='#6a4323'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.roundRect(34,-18,30,36,5); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#ffe8a7'; ctx.strokeStyle='#fff7d1'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(49,0,10,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fffdf0'; ctx.shadowColor='#fff0a8'; ctx.shadowBlur=15;
    ctx.beginPath(); ctx.arc(49,0,4+Math.sin(gameTime*8)*1.2,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle='#fff0a8'; ctx.lineWidth=2;
    for(let i=0;i<8;i++){ const a=i*Math.PI/4; ctx.beginPath(); ctx.moveTo(49+Math.cos(a)*11,Math.sin(a)*11); ctx.lineTo(49+Math.cos(a)*16,Math.sin(a)*16); ctx.stroke(); }
  } else if(weapon.type==='shotgun'){
    ctx.fillStyle='#6d3912'; ctx.strokeStyle='#1c120d'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(5,-10); ctx.lineTo(35,-13); ctx.lineTo(72,-12); ctx.lineTo(72,11); ctx.lineTo(40,12); ctx.lineTo(19,7); ctx.lineTo(7,16); ctx.lineTo(-7,13); ctx.lineTo(-1,1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#a95d19'; ctx.strokeStyle='#4b260f'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(5,-8); ctx.lineTo(36,-10); ctx.lineTo(67,-9); ctx.lineTo(67,6); ctx.lineTo(39,7); ctx.lineTo(20,3); ctx.lineTo(8,12); ctx.lineTo(-2,10); ctx.lineTo(4,0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#11151b'; ctx.strokeStyle='#05070a'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(67,-10,58,20,3); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#2d3946'; ctx.strokeStyle='#111821'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(34,-18,28,36,5); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#1474c4'; ctx.strokeStyle='#0a3159'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.roundRect(39,-12,18,8,2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#55bfff'; ctx.fillRect(42,-10,12,3);
    ctx.strokeStyle='#0b0d10'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(4,5); ctx.quadraticCurveTo(19,28,39,8); ctx.stroke();
    ctx.fillStyle='#8a4814'; ctx.strokeStyle='#3d200d'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(-3,-7); ctx.lineTo(13,-11); ctx.lineTo(5,-1); ctx.lineTo(-6,14); ctx.lineTo(-17,17); ctx.lineTo(-21,11); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#63c8ff'; ctx.beginPath(); ctx.arc(47,-21,3,0,Math.PI*2); ctx.fill();
  } else if(weapon.type==='hammer'){
    ctx.strokeStyle='#6b4a3d'; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(43,0); ctx.stroke();
    ctx.fillStyle=color; ctx.strokeStyle='#5a4c52'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.roundRect(35,-15,22,30,4); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.fillRect(39,-10,4,20);
  } else if(weapon.type==='greatsword'){
    ctx.strokeStyle='#63323a'; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(16,0); ctx.stroke();
    ctx.fillStyle=color; ctx.strokeStyle='#4a2630'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(12,-7); ctx.lineTo(67,-11); ctx.lineTo(86,0); ctx.lineTo(67,11); ctx.lineTo(12,7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#fff0f2'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(24,-2,); ctx.lineTo(73,0); ctx.stroke();
    ctx.strokeStyle='#d6a35b'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(8,-14); ctx.lineTo(8,14); ctx.stroke();
  } else if(weapon.type==='totem'){
    /* Каменный тотем Землетряса: грубое древко и рунический навершие,
       которое ярче светится, пока заряжен Enchant Totem. */
    const charged = unit.buffs && unit.buffs.some(buff => buff.type === 'enchantTotem');
    ctx.strokeStyle='#4a3a26'; ctx.lineWidth=7;
    ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(46,0); ctx.stroke();
    ctx.strokeStyle='#2a2013'; ctx.lineWidth=2;
    for(let i=0;i<4;i++){ const px=-2+i*12; ctx.beginPath(); ctx.moveTo(px,-4); ctx.lineTo(px+6,4); ctx.stroke(); }
    ctx.fillStyle='#6b5738'; ctx.strokeStyle='#2a2013'; ctx.lineWidth=2.5;
    ctx.beginPath();
    ctx.moveTo(38,-16); ctx.lineTo(54,-20); ctx.lineTo(62,-4);
    ctx.lineTo(56,14); ctx.lineTo(40,18); ctx.lineTo(34,2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    const glow = charged ? (0.85+Math.sin(gameTime*14)*0.15) : (0.35+Math.sin(gameTime*3)*0.1);
    ctx.fillStyle='#8bd4ff'; ctx.shadowColor='#8bd4ff'; ctx.shadowBlur = charged ? 20 : 9;
    ctx.globalAlpha = glow;
    ctx.beginPath(); ctx.arc(48,-1,charged ? 9 : 6,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1; ctx.shadowBlur=0;
  } else if(weapon.type==='club'){
    ctx.strokeStyle='#6d432f'; ctx.lineWidth=7; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(45,0); ctx.stroke();
    ctx.fillStyle=color; ctx.beginPath(); ctx.arc(49,0,10,0,Math.PI*2); ctx.fill();
  } else if(weapon.type==='forestBlade'){
    /* Клинок лесного крипа: рукоять из тёмной коры и светящееся зелёное лезвие. */
    ctx.strokeStyle='#3a2a18'; ctx.lineWidth=6; ctx.beginPath(); ctx.moveTo(-6,0); ctx.lineTo(10,0); ctx.stroke();
    ctx.strokeStyle='#caa25c'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(9,-6); ctx.lineTo(9,6); ctx.stroke();
    const bladeGrad=ctx.createLinearGradient(10,-6,64,6);
    bladeGrad.addColorStop(0,'#eafff0'); bladeGrad.addColorStop(0.4,color); bladeGrad.addColorStop(1,'#1f6b3f');
    ctx.fillStyle=bladeGrad; ctx.strokeStyle=color; ctx.shadowColor=color; ctx.shadowBlur=12; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.moveTo(9,-6); ctx.lineTo(52,-4); ctx.lineTo(66,0); ctx.lineTo(52,4); ctx.lineTo(9,6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1.2; ctx.shadowBlur=0;
    ctx.beginPath(); ctx.moveTo(16,-1); ctx.lineTo(56,0); ctx.stroke();
  } else if(weapon.type==='forestBow'){
    /* Изогнутый живой лук из лозы с зелёным светящимся семенем-снарядом. */
    ctx.strokeStyle='#4a3820'; ctx.lineWidth=3.5;
    ctx.beginPath(); ctx.moveTo(4,-20); ctx.quadraticCurveTo(20,0,4,20); ctx.stroke();
    ctx.strokeStyle='rgba(220,255,200,0.55)'; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(4,-20); ctx.lineTo(4,20); ctx.stroke();
    ctx.fillStyle=color; ctx.shadowColor=color; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(4,0,4+Math.sin(gameTime*6)*1,0,Math.PI*2); ctx.fill();
  } else {
    ctx.strokeStyle='#9d7138'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(14,0); ctx.stroke();
    ctx.fillStyle=color; ctx.strokeStyle='#39434d'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(10,-5); ctx.lineTo(58,-7); ctx.lineTo(72,0); ctx.lineTo(58,7); ctx.lineTo(10,5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#ffffff'; ctx.lineWidth=1.4; ctx.beginPath(); ctx.moveTo(22,-1); ctx.lineTo(61,0); ctx.stroke();
  }
  ctx.shadowBlur=0; ctx.restore();
}
const drawUnitErrors = new Set();
function drawUnitSafely(u){
  ctx.save();
  try {
    drawUnit(u);
  } catch(err) {
    const key = u && u.def ? u.def.id : (u && u.type) || 'unknown';
    if(!drawUnitErrors.has(key)){
      drawUnitErrors.add(key);
      console.error('Ошибка отрисовки бойца ' + key, err);
    }
  } finally {
    ctx.restore();
  }
}

function drawForestCreepBody(u, col){
  /* Лесной страж — лайновый крип: кора+листва, светящаяся маска-прорезь глаз,
     белые клыки-рожки и мускулистые зелёные руки, как на референсе. */
  const s = u.radius/17;
  const teamGlow = u.team===0 ? '#9dffb0' : '#ffb09d';
  ctx.save();
  ctx.scale(s,s);
  if(u.mega){ ctx.shadowColor='#ffcf5a'; ctx.shadowBlur=14; }

  // Корневидные ноги.
  ctx.fillStyle='#4a3016';
  ctx.beginPath(); ctx.ellipse(-6,15,5,9,0.18,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6,15,5,9,-0.18,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#3a2410';
  ctx.beginPath(); ctx.ellipse(-6,20,4,3,0,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(6,20,4,3,0,0,Math.PI*2); ctx.fill();

  // Торс — потрескавшаяся кора.
  const torsoGrad=ctx.createLinearGradient(-14,-12,14,18);
  torsoGrad.addColorStop(0,'#8a5a34'); torsoGrad.addColorStop(0.55,'#6a4526'); torsoGrad.addColorStop(1,'#4a3018');
  ctx.fillStyle=torsoGrad;
  ctx.beginPath();
  ctx.moveTo(-12,-6); ctx.quadraticCurveTo(-15,8,-10,16); ctx.lineTo(10,16); ctx.quadraticCurveTo(15,8,12,-6);
  ctx.quadraticCurveTo(7,-13,0,-13); ctx.quadraticCurveTo(-7,-13,-12,-6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='rgba(20,10,4,0.4)'; ctx.lineWidth=1.1;
  ctx.beginPath(); ctx.moveTo(-6,-8); ctx.lineTo(-4,10); ctx.moveTo(1,-11); ctx.lineTo(2,13); ctx.moveTo(6,-8); ctx.lineTo(8,11); ctx.stroke();

  // Пояс-обвязка с самоцветом (как на референсе).
  ctx.fillStyle='#454a68';
  ctx.beginPath(); ctx.moveTo(-12,10); ctx.lineTo(12,10); ctx.lineTo(10,19); ctx.lineTo(-10,19); ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#2f3350'; ctx.lineWidth=1; ctx.stroke();
  ctx.fillStyle='#6fb8ff'; ctx.shadowColor='#6fb8ff'; ctx.shadowBlur=8;
  ctx.beginPath(); ctx.arc(0,14,2.6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

  // Мощные зелёные руки.
  ctx.fillStyle='#5fae3a';
  ctx.beginPath(); ctx.ellipse(-14,3,5.4,10,0.32,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(14,3,5.4,10,-0.32,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#3d7a26'; ctx.lineWidth=1.6;
  for(const side of [-1,1]){
    ctx.beginPath();
    for(let i=-1;i<=1;i++){ ctx.moveTo(side*14,11); ctx.lineTo(side*14+i*3.2,17); }
    ctx.stroke();
  }

  // Голова — листва с белыми клыками-рожками и тёмной прорезью глаз.
  ctx.fillStyle='#4f9a34';
  ctx.beginPath(); ctx.ellipse(0,-19,8.6,7.6,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#68c94a';
  const spikeAngles=[-1.15,-0.65,-0.18,0.28,0.75];
  for(const a of spikeAngles){
    const bx=Math.cos(a)*7, by=-19+Math.sin(a)*6.5;
    const tx=Math.cos(a)*15.5, ty=-19+Math.sin(a)*15-3;
    const cx=Math.cos(a+0.22)*7.6, cy=-19+Math.sin(a+0.22)*6.8;
    ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(tx,ty); ctx.lineTo(cx,cy); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle='#eef2e6';
  ctx.beginPath(); ctx.moveTo(-6.5,-21); ctx.lineTo(-10.5,-28); ctx.lineTo(-4.5,-23); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6.5,-21); ctx.lineTo(10.5,-28); ctx.lineTo(4.5,-23); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#0c1a10';
  ctx.beginPath(); ctx.moveTo(-6.5,-20); ctx.lineTo(6.5,-20); ctx.lineTo(3.6,-14); ctx.lineTo(-3.6,-14); ctx.closePath(); ctx.fill();
  ctx.fillStyle=teamGlow; ctx.shadowColor=teamGlow; ctx.shadowBlur=6;
  ctx.beginPath(); ctx.arc(-2.8,-17,1.3,0,Math.PI*2); ctx.arc(2.8,-17,1.3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

  if(u.mega){
    ctx.fillStyle='#ffe066'; ctx.font='bold 7px Segoe UI, Arial'; ctx.textAlign='center';
    ctx.fillText('МЕГА',0,-33);
  }
  ctx.restore();

  ctx.strokeStyle=col; ctx.lineWidth=2; ctx.globalAlpha=0.55;
  ctx.beginPath(); ctx.arc(0,0,u.radius+3,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1;
}
function drawUnit(u){
  if(u.dead) return;
  if(u.invisible) return;
  const isEnemy = u.team !== 0;
  if(isEnemy && !isVisibleToPlayer(u) && !u.arcMotion) return;

  const col = TEAM_COL[u.team];
  const arcProgress = u.arcMotion ? clamp(u.arcMotion.t/u.arcMotion.duration,0,1) : 0;
  const arcLift = u.arcMotion ? Math.sin(arcProgress*Math.PI) * u.arcMotion.height : 0;
  const visualLift = arcLift || (u.liftTimer > 0 ? Math.sin((0.65-u.liftTimer)/0.65*Math.PI)*45 : 0);
  const walkableUnit = u.type !== 'tower' && u.type !== 'barracks' && u.type !== 'ancient';
  const strideAmt = walkableUnit ? Math.sin(u.walkPhase*Math.PI*2) : 0;
  const walkBob = walkableUnit ? Math.abs(strideAmt) * Math.min(5, u.radius*0.2) * (u.moving?1:0) : 0;
  ctx.save();
  ctx.translate(u.x, u.y - visualLift - walkBob);

  const aura = u.buffs && u.buffs.find(buff => buff.type === 'ilyaAura');
  if(aura){
    ctx.fillStyle='rgba(93,255,115,0.16)';
    ctx.strokeStyle='rgba(125,255,130,0.85)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,aura.radius,0,Math.PI*2); ctx.fill(); ctx.stroke();
  }
  if(u.type === 'hero' && u.def.id === 'mageHunter' && u.buffs.some(buff => buff.type === 'mageReflect')){
    ctx.globalAlpha=0.42+Math.sin(gameTime*7)*0.08; ctx.strokeStyle='#d58cff'; ctx.shadowColor='#b65cff'; ctx.shadowBlur=22; ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(0,0,u.radius+22+Math.sin(gameTime*4)*3,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0; ctx.globalAlpha=1;
  }
  if(u.type === 'hero' && u.def.id === 'exileKnight' && u.buffs.some(buff => buff.type === 'exileRage')){
    ctx.globalAlpha=0.5; ctx.strokeStyle='#ff4d5b'; ctx.shadowColor='#ff2538'; ctx.shadowBlur=24; ctx.lineWidth=5;
    ctx.beginPath(); ctx.arc(0,0,u.radius+12+Math.sin(gameTime*10)*4,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0; ctx.globalAlpha=1;
  }
  if(u.type === 'hero' && u.buffs.some(buff => buff.type === 'bladeFury')){
    ctx.globalAlpha=0.55; ctx.strokeStyle='#ffe066'; ctx.shadowColor='#fff0a8'; ctx.shadowBlur=22; ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(0,0,u.radius+18+Math.sin(gameTime*12)*4,gameTime*5,gameTime*5+Math.PI*1.55); ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,u.radius+26,gameTime*5+Math.PI,gameTime*5+Math.PI*2.4); ctx.stroke();
    ctx.shadowBlur=0; ctx.globalAlpha=1;
  }
  if(u.type === 'hero' && u.buffs.some(buff => buff.type === 'omnislash')){
    ctx.globalAlpha=0.6; ctx.strokeStyle='#fff2a8'; ctx.shadowColor='#ffe066'; ctx.shadowBlur=25; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,0,u.radius+20+Math.sin(gameTime*15)*5,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=0; ctx.globalAlpha=1;
  }
  if(u.buffs && u.buffs.some(buff => buff.type === 'assassinateMark')){
    ctx.globalAlpha=0.8; ctx.strokeStyle='#ffe0a0'; ctx.shadowColor='#ffd27a'; ctx.shadowBlur=15; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(0,0,u.radius+12,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-u.radius-6,0); ctx.lineTo(u.radius+6,0); ctx.moveTo(0,-u.radius-6); ctx.lineTo(0,u.radius+6); ctx.stroke();
    ctx.shadowBlur=0; ctx.globalAlpha=1;
  }
  if(u.type === 'hero' && u.def.id === 'sniper' && u.assassinating && u.assassinateTarget){
    const aim = Math.atan2(u.assassinateTarget.y-u.y, u.assassinateTarget.x-u.x);
    ctx.save();
    ctx.rotate(aim);
    ctx.globalAlpha=0.85;
    ctx.strokeStyle='#fff4c2'; ctx.shadowColor='#fff0a8'; ctx.shadowBlur=18; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(88,0); ctx.stroke();
    ctx.fillStyle='#ffffff';
    ctx.beginPath(); ctx.arc(24,0,7+Math.sin(gameTime*28)*2,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  if(u.type === 'hero'){
    const heroAccent = u.def.color2 || col;
    const pulse = 1 + Math.sin(gameTime*5 + u.x*0.01)*0.06;
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = heroAccent;
    ctx.shadowColor = heroAccent;
    ctx.shadowBlur = 18;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, (u.radius + 8) * pulse, gameTime*0.8, gameTime*0.8 + Math.PI*1.35);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    if(hasScepter(u)){
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = '#d8b4ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, u.radius + 14 + Math.sin(gameTime*6)*2, -gameTime*1.8, -gameTime*1.8 + Math.PI*1.1);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, u.radius*0.75, u.radius*0.95, u.radius*0.45, 0, 0, Math.PI*2);
  ctx.fill();

  if(walkableUnit && u.moving){
    const facing = u.facing || 0;
    const perp = facing + Math.PI/2;
    const strideLen = u.radius*0.55;
    const footSide = u.radius*0.34;
    const footAx = Math.cos(facing)*strideAmt*strideLen + Math.cos(perp)*footSide;
    const footAy = Math.sin(facing)*strideAmt*strideLen + Math.sin(perp)*footSide + u.radius*0.7;
    const footBx = -Math.cos(facing)*strideAmt*strideLen - Math.cos(perp)*footSide;
    const footBy = -Math.sin(facing)*strideAmt*strideLen - Math.sin(perp)*footSide + u.radius*0.7;
    ctx.save();
    ctx.fillStyle='rgba(15,12,8,0.4)';
    ctx.beginPath(); ctx.ellipse(footAx, footAy, u.radius*0.24, u.radius*0.14, facing, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(footBx, footBy, u.radius*0.24, u.radius*0.14, facing, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  if(u.type === 'tower' || u.type === 'ancient'){
    const sz = u.radius;
    ctx.fillStyle = u.isBase ? '#3a3a55' : '#4a4a68';
    ctx.strokeStyle = col; ctx.lineWidth = 5;
    ctx.beginPath();
    if(u.isBase){
      ctx.moveTo(0,-sz); ctx.lineTo(sz,0); ctx.lineTo(0,sz); ctx.lineTo(-sz,0);
      ctx.closePath();
    } else {
      ctx.rect(-sz*0.75, -sz, sz*1.5, sz*2);
    }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, u.isBase ? 0 : -sz*1.15, u.isBase ? 18 : 13, 0, Math.PI*2);
    ctx.fill();
  } else if(u.type === 'barracks'){
    const barracksGradient=ctx.createLinearGradient(-u.radius,-u.radius,u.radius,u.radius);
    barracksGradient.addColorStop(0,u.team===0?'#8fb8c4':'#a65e68');
    barracksGradient.addColorStop(1,u.team===0?'#25405b':'#4a202f');
    ctx.fillStyle=barracksGradient; ctx.strokeStyle=col; ctx.lineWidth=4;
    ctx.fillRect(-u.radius,-u.radius*0.7,u.radius*2,u.radius*1.4); ctx.strokeRect(-u.radius,-u.radius*0.7,u.radius*2,u.radius*1.4);
    ctx.fillStyle=u.team===0?'#8be9fd':'#ff8a9b'; ctx.beginPath(); ctx.moveTo(-u.radius-5,-u.radius*0.7); ctx.lineTo(0,-u.radius*1.35); ctx.lineTo(u.radius+5,-u.radius*0.7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.16)'; ctx.fillRect(-u.radius+4,-u.radius*0.55,u.radius*2-8,5);
    ctx.strokeStyle='rgba(255,255,255,0.45)'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-u.radius+5,0); ctx.lineTo(u.radius-5,0); ctx.moveTo(-u.radius+5,10); ctx.lineTo(u.radius-5,10); ctx.stroke();
    ctx.fillStyle=u.team===0?'#b7f7ff':'#ffd0d9'; ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.arc(0,-u.radius*0.18,5+Math.sin(gameTime*5)*1.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='#2a1b18'; ctx.fillRect(-9,2,18,16);
    ctx.fillStyle='rgba(255,220,150,0.8)'; ctx.fillRect(-6,5,4,5); ctx.fillRect(2,5,4,5);
  } else if(u.type === 'hero'){
    const isReferenceModel = ['juggernaut','sniper'].includes(u.def.id);
    const isDetailedModel = ['sasych','ilya','malit','arcady','juvsyut','chip','earthshaker'].includes(u.def.id) || isReferenceModel;
    if(!isDetailedModel){
    const pulse = 1 + Math.sin(gameTime*3)*0.06;
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0,0,u.radius*1.75*pulse,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha = 1;

    const grad = ctx.createRadialGradient(-6,-8,4,0,0,u.radius);
    grad.addColorStop(0, u.def.color2);
    grad.addColorStop(1, u.def.color);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0,0,u.radius,0,Math.PI*2); ctx.fill();

    ctx.strokeStyle = col; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(0,0,u.radius+2,0,Math.PI*2); ctx.stroke();

    // Разные силуэты, броня и оружие помогают отличать героев на поле.
    ctx.fillStyle='rgba(12,16,24,0.42)';
    ctx.beginPath(); ctx.ellipse(0,8,u.radius*0.72,u.radius*0.38,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=u.def.color2; ctx.beginPath(); ctx.arc(-3,-8,u.radius*0.42,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.48)'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#17202b';
    ctx.beginPath(); ctx.arc(-8,-10,2.5,0,Math.PI*2); ctx.arc(2,-10,2.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.moveTo(-u.radius*0.8,8); ctx.lineTo(-u.radius*0.45,22); ctx.lineTo(0,26); ctx.lineTo(u.radius*0.45,22); ctx.lineTo(u.radius*0.8,8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.35)'; ctx.lineWidth=2; ctx.stroke();
    }
    if(u.def.id==='juggernaut'){
      const used=drawReferenceTexture(juggernautTexture,'#ffe066');
      if(!used){
        const grad=ctx.createRadialGradient(-5,-12,2,0,0,32);
        grad.addColorStop(0,'#ffdd87'); grad.addColorStop(1,'#681c28');
        ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(0,0,u.radius+5,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#ffe066'; ctx.lineWidth=3; ctx.stroke();
        ctx.fillStyle='#261c25'; ctx.fillRect(-18,-25,36,34);
        ctx.fillStyle='#fff0a8'; ctx.fillRect(-11,-12,22,3);
      }
    } else if(u.def.id==='sniper'){
      const used=drawReferenceTexture(sniperTexture,'#ffd27a');
      if(!used){
        const grad=ctx.createRadialGradient(-5,-12,2,0,0,32);
        grad.addColorStop(0,'#c99455'); grad.addColorStop(1,'#3a2922');
        ctx.fillStyle=grad; ctx.beginPath(); ctx.arc(0,0,u.radius+5,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#ffd27a'; ctx.lineWidth=3; ctx.stroke();
        ctx.fillStyle='#33231c'; ctx.fillRect(-16,-27,32,39);
        ctx.fillStyle='#f5d79a'; ctx.fillRect(-9,-10,18,3);
      }
    } else if(u.def.id==='earthshaker'){
      /* Землетряс — каменный великан: потрескавшаяся серо-бурая кожа,
         светящиеся синие руны-трещины и грубая наскальная броня. */
      const s = u.radius/24;
      ctx.save();
      ctx.scale(s,s);
      const auraPulse = 1 + Math.sin(gameTime*3.4)*0.05;
      ctx.globalAlpha=0.3;
      ctx.fillStyle='rgba(90,70,48,0.35)';
      ctx.beginPath(); ctx.ellipse(0,14,36*auraPulse,44*auraPulse,0,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;

      // Массивный торс из потрескавшегося камня.
      const bodyGrad = ctx.createLinearGradient(-26,-30,26,40);
      bodyGrad.addColorStop(0,'#7d6749'); bodyGrad.addColorStop(0.55,'#5b4630'); bodyGrad.addColorStop(1,'#362a1c');
      ctx.fillStyle=bodyGrad; ctx.strokeStyle='#241b11'; ctx.lineWidth=2.5;
      ctx.beginPath();
      ctx.moveTo(-24,-2); ctx.lineTo(-30,32); ctx.lineTo(-14,40);
      ctx.lineTo(0,44); ctx.lineTo(14,40); ctx.lineTo(30,32); ctx.lineTo(24,-2);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Массивные плечи-валуны.
      for(const side of [-1,1]){
        ctx.fillStyle='#6b5738'; ctx.strokeStyle='#2a2013'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.ellipse(side*26,0,14,12,side*0.3,0,Math.PI*2); ctx.fill(); ctx.stroke();
      }

      // Голова: грубый каменный лик с трещинами.
      ctx.fillStyle='#6f5b3d'; ctx.strokeStyle='#241b11'; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(-15,-14); ctx.quadraticCurveTo(-18,-38,0,-44);
      ctx.quadraticCurveTo(18,-38,15,-14); ctx.lineTo(10,4); ctx.lineTo(-10,4);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Светящиеся синие глаза-трещины (руны Aftershock).
      ctx.fillStyle='#8bd4ff'; ctx.shadowColor='#8bd4ff'; ctx.shadowBlur=14+Math.sin(gameTime*6)*3;
      ctx.beginPath(); ctx.ellipse(-6,-20,3.4,2.2,-0.1,0,Math.PI*2); ctx.ellipse(6,-20,3.4,2.2,0.1,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;

      // Трещины на теле, светящиеся тем же синим.
      ctx.strokeStyle='#8bd4ff'; ctx.globalAlpha=0.55+Math.sin(gameTime*4)*0.15; ctx.lineWidth=1.6; ctx.lineCap='round';
      ctx.beginPath();
      ctx.moveTo(-4,-10); ctx.lineTo(-9,6); ctx.lineTo(-4,20); ctx.lineTo(-10,34);
      ctx.moveTo(6,-8); ctx.lineTo(11,8); ctx.lineTo(5,22); ctx.lineTo(11,36);
      ctx.stroke();
      ctx.globalAlpha=1;

      // Грубая набедренная каменная юбка-броня.
      ctx.fillStyle='#4a3a26'; ctx.strokeStyle='#241b11'; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(-22,30); ctx.lineTo(-12,50); ctx.lineTo(0,44); ctx.lineTo(12,50); ctx.lineTo(22,30);
      ctx.lineTo(14,38); ctx.lineTo(0,32); ctx.lineTo(-14,38); ctx.closePath();
      ctx.fill(); ctx.stroke();

      ctx.restore();
    } else if(u.def.id==='mageHunter'){
      /* Охотник на магов — фиолетовый арканный убийца:
         капюшон, закрытая маска, тяжёлые наплечники и голубая магия. */
      const s = u.radius/24;
      ctx.save();
      ctx.scale(s,s);
      ctx.shadowColor='#7d5cff'; ctx.shadowBlur=25;
      ctx.fillStyle='rgba(74,51,164,0.28)';
      ctx.beginPath(); ctx.ellipse(0,12,34,42,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;

      // Тёмный плащ и фиолетовая броня.
      const cloak=ctx.createLinearGradient(-25,0,25,39);
      cloak.addColorStop(0,'#3c2b77'); cloak.addColorStop(0.5,'#21183f'); cloak.addColorStop(1,'#0d1027');
      ctx.fillStyle=cloak; ctx.strokeStyle='#7257c9'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-20,-5); ctx.lineTo(-30,35); ctx.lineTo(-11,29);
      ctx.lineTo(0,42); ctx.lineTo(11,29); ctx.lineTo(30,35); ctx.lineTo(20,-5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#6951bd'; ctx.strokeStyle='#b29cff'; ctx.lineWidth=1.6;
      ctx.beginPath(); ctx.ellipse(-23,2,14,10,-0.28,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(23,2,14,10,0.28,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#15142d'; ctx.strokeStyle='#8b6dff'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-13,1); ctx.lineTo(13,1); ctx.lineTo(16,28);
      ctx.quadraticCurveTo(0,36,-16,28); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#92d9ff'; ctx.shadowColor='#6ed9ff'; ctx.shadowBlur=14;
      ctx.beginPath(); ctx.arc(0,17,5+Math.sin(gameTime*7)*1.2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

      // Капюшон и безликая маска.
      ctx.fillStyle='#241946'; ctx.strokeStyle='#a98cff'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-18,-12); ctx.quadraticCurveTo(-22,-39,0,-48);
      ctx.quadraticCurveTo(22,-39,18,-12); ctx.lineTo(11,15); ctx.lineTo(-11,15); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#080b1b'; ctx.strokeStyle='#563da5'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-14,-18); ctx.quadraticCurveTo(0,-29,14,-18);
      ctx.lineTo(12,8); ctx.lineTo(0,18); ctx.lineTo(-12,8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#8fe6ff'; ctx.shadowColor='#83cfff'; ctx.shadowBlur=16;
      ctx.beginPath(); ctx.ellipse(-7,-8,5,2.6,-0.12,0,Math.PI*2); ctx.ellipse(7,-8,5,2.6,0.12,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.strokeStyle='#aa8cff'; ctx.lineWidth=1.8; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-7,4); ctx.lineTo(0,9); ctx.lineTo(7,4); ctx.stroke();

      // Арканные рукавицы и сфера на поясе.
      for(const side of [-1,1]){
        ctx.fillStyle='#2e2460'; ctx.strokeStyle='#8d75e8'; ctx.lineWidth=1.7;
        ctx.beginPath(); ctx.roundRect(side*25-7,8,14,22,4); ctx.fill(); ctx.stroke();
        ctx.fillStyle='#8fe6ff'; ctx.shadowColor='#69cfff'; ctx.shadowBlur=13;
        ctx.beginPath(); ctx.arc(side*31,20,3.5+Math.sin(gameTime*6+side)*0.7,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      }
      ctx.fillStyle='#ad8cff'; ctx.strokeStyle='#f0e8ff'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.arc(0,28,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if(u.def.id==='pyro'){
      /* Пиромант — живое пламя в броне: огненный плащ, раскалённая маска,
         корона из языков огня и две рунические жаровни вместо рук. */
      const s = u.radius/24;
      ctx.save();
      ctx.scale(s,s);
      ctx.shadowColor='#ff5a1f'; ctx.shadowBlur=26;
      ctx.fillStyle='rgba(255,91,28,0.28)';
      ctx.beginPath(); ctx.ellipse(0,10,35,42,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;

      // Пламенный силуэт плаща.
      const robe=ctx.createLinearGradient(0,-5,0,37);
      robe.addColorStop(0,'#ff9d2e'); robe.addColorStop(0.5,'#d33a18'); robe.addColorStop(1,'#54131d');
      ctx.fillStyle=robe; ctx.strokeStyle='#ffb735'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-20,-4); ctx.lineTo(-31,28); ctx.lineTo(-20,23);
      ctx.lineTo(-12,38); ctx.lineTo(0,28); ctx.lineTo(12,38); ctx.lineTo(20,23);
      ctx.lineTo(31,28); ctx.lineTo(20,-4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(255,224,119,0.75)'; ctx.lineWidth=1.4;
      for(let i=0;i<5;i++){
        ctx.beginPath(); ctx.moveTo(-15+i*7,2); ctx.quadraticCurveTo(-11+i*5,16,(-8+i*4),28); ctx.stroke();
      }

      // Наплечники и раскалённое ядро на груди.
      ctx.fillStyle='#8e2519'; ctx.strokeStyle='#ff9e31'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(-23,2,13,9,-0.3,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(23,2,13,9,0.3,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#ffe37d'; ctx.strokeStyle='#ff6b20'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(0,5); ctx.lineTo(9,15); ctx.lineTo(0,25); ctx.lineTo(-9,15); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff8c7'; ctx.shadowColor='#ffd24d'; ctx.shadowBlur=18;
      ctx.beginPath(); ctx.arc(0,15,4+Math.sin(gameTime*9)*1.1,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

      // Тёмная огненная маска и светящиеся глаза.
      const mask=ctx.createRadialGradient(-6,-16,2,0,-7,25);
      mask.addColorStop(0,'#633127'); mask.addColorStop(0.6,'#2b1820'); mask.addColorStop(1,'#100d16');
      ctx.fillStyle=mask; ctx.strokeStyle='#ff6a22'; ctx.lineWidth=1.8;
      ctx.beginPath(); ctx.moveTo(-16,-19); ctx.quadraticCurveTo(0,-30,16,-19);
      ctx.lineTo(13,8); ctx.lineTo(0,21); ctx.lineTo(-13,8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff0a0'; ctx.shadowColor='#ff6a20'; ctx.shadowBlur=16;
      ctx.beginPath(); ctx.ellipse(-7,-10,5,2.5,0,0,Math.PI*2); ctx.ellipse(7,-10,5,2.5,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.strokeStyle='#ff9d2e'; ctx.lineWidth=2; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-7,3); ctx.lineTo(0,7); ctx.lineTo(7,3); ctx.stroke();

      // Корона из высоких языков огня.
      ctx.fillStyle='#ffbd38'; ctx.strokeStyle='#ff5a1f'; ctx.lineWidth=1.8;
      ctx.beginPath(); ctx.moveTo(-19,-19); ctx.lineTo(-16,-39); ctx.lineTo(-8,-28);
      ctx.lineTo(-2,-48); ctx.lineTo(4,-29); ctx.lineTo(14,-42); ctx.lineTo(18,-18);
      ctx.lineTo(9,-23); ctx.lineTo(0,-19); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff3a1'; ctx.shadowColor='#ffb52e'; ctx.shadowBlur=20;
      ctx.beginPath(); ctx.arc(0,-44,4+Math.sin(gameTime*10)*1.2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

      // Огненные ладони.
      for(const side of [-1,1]){
        ctx.fillStyle='#ff7b22'; ctx.shadowColor='#ff5a1f'; ctx.shadowBlur=16;
        ctx.beginPath(); ctx.arc(side*31,12,7+Math.sin(gameTime*8+side)*1.5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ffd25e';
        for(let i=0;i<4;i++){
          const a=-Math.PI/2+(i-1.5)*0.34;
          ctx.beginPath(); ctx.moveTo(side*31+Math.cos(a)*5,12+Math.sin(a)*5);
          ctx.lineTo(side*31+Math.cos(a)*13,12+Math.sin(a)*13); ctx.stroke();
        }
        ctx.shadowBlur=0;
      }
      ctx.restore();
    } else if(u.def.id==='warlord'){
      /* Вождь — 2D-воин в стиле референса: шлем, борода,
         красный плащ, кольчуга, копьё и большой круглый щит. */
      const s = u.radius/24;
      ctx.save();
      ctx.scale(s,s);

      // Красный плащ за плечами.
      ctx.fillStyle='#8f2730'; ctx.strokeStyle='#4d1822'; ctx.lineWidth=2.2;
      ctx.beginPath();
      ctx.moveTo(-23,-5); ctx.quadraticCurveTo(-37,7,-30,29);
      ctx.lineTo(-13,25); ctx.lineTo(0,31); ctx.lineTo(15,25);
      ctx.lineTo(31,29); ctx.quadraticCurveTo(37,7,22,-5); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle='#c14343'; ctx.globalAlpha=0.7;
      ctx.beginPath(); ctx.moveTo(-20,1); ctx.quadraticCurveTo(-27,12,-22,22);
      ctx.lineTo(-13,18); ctx.lineTo(-11,-1); ctx.closePath(); ctx.fill();
      ctx.globalAlpha=1;

      // Кольчужный корпус.
      ctx.fillStyle='#89939a'; ctx.strokeStyle='#28343d'; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(-18,-1); ctx.lineTo(-24,25); ctx.quadraticCurveTo(0,35,24,25);
      ctx.lineTo(17,-1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(225,235,235,0.62)'; ctx.lineWidth=1;
      for(let row=-1;row<5;row++){
        for(let col=-3;col<4;col++){
          const mx=col*6+(row%2)*3, my=4+row*5;
          ctx.beginPath(); ctx.arc(mx,my,2.2,0,Math.PI*2); ctx.stroke();
        }
      }
      ctx.strokeStyle='#c44e4f'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-20,20); ctx.lineTo(20,20); ctx.stroke();

      // Шлем с носовой защитой.
      const helmet = ctx.createLinearGradient(-16,-33,16,-15);
      helmet.addColorStop(0,'#e4e7df'); helmet.addColorStop(0.45,'#89939a'); helmet.addColorStop(1,'#3a4750');
      ctx.fillStyle=helmet; ctx.strokeStyle='#202a31'; ctx.lineWidth=2.2;
      ctx.beginPath();
      ctx.moveTo(-17,-15); ctx.quadraticCurveTo(-19,-29,0,-36);
      ctx.quadraticCurveTo(19,-29,17,-15); ctx.lineTo(10,-10);
      ctx.lineTo(-11,-10); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#52616b';
      ctx.beginPath(); ctx.moveTo(-3,-35); ctx.lineTo(3,-35); ctx.lineTo(5,-15); ctx.lineTo(-5,-15); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#e4e7df'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-13,-25); ctx.quadraticCurveTo(0,-31,13,-25); ctx.stroke();

      // Лицо и рыжеватая борода под шлемом.
      ctx.fillStyle='#a87554'; ctx.strokeStyle='#52382d'; ctx.lineWidth=1.7;
      ctx.beginPath(); ctx.ellipse(0,-10,13,13,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#6d392d';
      ctx.beginPath();
      ctx.moveTo(-13,-10); ctx.quadraticCurveTo(-11,-2,-6,3);
      ctx.lineTo(0,9); ctx.lineTo(7,3); ctx.quadraticCurveTo(13,-2,13,-10);
      ctx.lineTo(8,-5); ctx.lineTo(0,-2); ctx.lineTo(-8,-5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#2e2522'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-8,-11); ctx.lineTo(-3,-12); ctx.moveTo(3,-12); ctx.lineTo(8,-11);
      ctx.moveTo(-2,-8); ctx.lineTo(3,-8); ctx.stroke();
      ctx.fillStyle='#f1d39b';
      ctx.beginPath(); ctx.arc(-7,-8,1.8,0,Math.PI*2); ctx.arc(7,-8,1.8,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#d4a17c'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-11,-17); ctx.lineTo(-18,-9); ctx.moveTo(11,-17); ctx.lineTo(18,-9); ctx.stroke();

      // Большой круглый щит справа.
      ctx.fillStyle='#9d6b22'; ctx.strokeStyle='#3b261b'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.ellipse(31,14,18,23,-0.1,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#d49b2c'; ctx.strokeStyle='#f0c45c'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.ellipse(31,14,14,19,-0.1,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#5b341f'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(31,14,10,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(31,-5); ctx.lineTo(31,33); ctx.moveTo(18,14); ctx.lineTo(44,14); ctx.stroke();
      ctx.fillStyle='#d8d7c7'; ctx.strokeStyle='#5b5550'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(31,14,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#34251c';
      ctx.beginPath(); ctx.moveTo(24,5); ctx.lineTo(30,9); ctx.lineTo(27,18);
      ctx.lineTo(22,14); ctx.closePath(); ctx.moveTo(37,8); ctx.lineTo(42,3);
      ctx.lineTo(43,14); ctx.lineTo(36,18); ctx.closePath(); ctx.fill();

      // Рука, удерживающая щит.
      ctx.strokeStyle='#b47f5b'; ctx.lineWidth=6; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(17,7); ctx.lineTo(27,13); ctx.stroke();
      ctx.fillStyle='#c18a62'; ctx.beginPath(); ctx.arc(18,6,4,0,Math.PI*2); ctx.fill();
      ctx.lineCap='butt';
      ctx.restore();
    } else if(u.def.id==='dawnMaiden'){
      /* Рассветная дева — силуэт Dawnbreaker:
         бело-золотая броня, солнечная корона, светлые волосы и сияющие глаза. */
      const s = u.radius/24;
      ctx.save();
      ctx.scale(s,s);

      // Солнечная аура и веер золотых прядей за головой.
      ctx.shadowColor='#ffe79a'; ctx.shadowBlur=24;
      ctx.strokeStyle='rgba(255,224,120,0.82)'; ctx.lineWidth=2.2;
      for(let i=0;i<16;i++){
        const a=i*Math.PI*2/16 + Math.sin(gameTime*0.9)*0.025;
        const inner=25, outer=39 + Math.sin(gameTime*2.5+i)*2;
        ctx.beginPath(); ctx.moveTo(Math.cos(a)*inner,Math.sin(a)*inner-8);
        ctx.lineTo(Math.cos(a)*outer,Math.sin(a)*outer-8); ctx.stroke();
      }
      ctx.shadowBlur=0;
      ctx.fillStyle='#e7a735'; ctx.strokeStyle='#78461f'; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(-33,-17); ctx.quadraticCurveTo(-39,4,-30,30);
      ctx.lineTo(-16,23); ctx.lineTo(-9,-9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(33,-17); ctx.quadraticCurveTo(39,4,30,30);
      ctx.lineTo(16,23); ctx.lineTo(9,-9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#ffd96f'; ctx.strokeStyle='#a86b22'; ctx.lineWidth=1.4;
      for(const side of [-1,1]){
        ctx.beginPath(); ctx.moveTo(side*27,-20); ctx.lineTo(side*42,-7); ctx.lineTo(side*29,3); ctx.lineTo(side*18,-10); ctx.closePath(); ctx.fill(); ctx.stroke();
      }

      // Бело-золотая кираса и широкие наплечники.
      const armor=ctx.createLinearGradient(-25,0,25,34);
      armor.addColorStop(0,'#fff8d8'); armor.addColorStop(0.45,'#e7c46d'); armor.addColorStop(1,'#a66b23');
      ctx.fillStyle=armor; ctx.strokeStyle='#70451f'; ctx.lineWidth=2.2;
      ctx.beginPath(); ctx.moveTo(-18,-3); ctx.lineTo(-27,26); ctx.quadraticCurveTo(0,39,27,26);
      ctx.lineTo(18,-3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#d59a33'; ctx.strokeStyle='#ffe7a0'; ctx.lineWidth=1.6;
      ctx.beginPath(); ctx.ellipse(-24,3,13,9,-0.22,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(24,3,13,9,0.22,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff2a8'; ctx.strokeStyle='#a86722'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(0,14,9,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fffdf0'; ctx.shadowColor='#fff0a8'; ctx.shadowBlur=13;
      ctx.beginPath(); ctx.arc(0,14,4.5+Math.sin(gameTime*7)*0.8,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

      // Светлое лицо с характерными сияющими глазами.
      const skin=ctx.createRadialGradient(-7,-18,2,0,-7,24);
      skin.addColorStop(0,'#fff8e8'); skin.addColorStop(0.65,'#e7d9c1'); skin.addColorStop(1,'#ad8c6e');
      ctx.fillStyle=skin; ctx.strokeStyle='#704c35'; ctx.lineWidth=1.7;
      ctx.beginPath(); ctx.moveTo(-15,-18); ctx.quadraticCurveTo(0,-28,15,-18);
      ctx.lineTo(13,4); ctx.quadraticCurveTo(9,17,0,21);
      ctx.quadraticCurveTo(-9,17,-13,4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fffdf4'; ctx.shadowColor='#fff5a9'; ctx.shadowBlur=14;
      ctx.beginPath(); ctx.ellipse(-7,-9,4.6,2.8,0,0,Math.PI*2); ctx.ellipse(7,-9,4.6,2.8,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.strokeStyle='#8b623e'; ctx.lineWidth=1.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-11,3); ctx.quadraticCurveTo(0,9,11,3); ctx.stroke();

      // Золотая корона и светлые пряди вокруг лица.
      ctx.fillStyle='#f8d678'; ctx.strokeStyle='#9a5f20'; ctx.lineWidth=1.8;
      ctx.beginPath(); ctx.moveTo(-18,-18); ctx.lineTo(-14,-37); ctx.lineTo(-5,-27);
      ctx.lineTo(0,-43); ctx.lineTo(6,-27); ctx.lineTo(16,-37); ctx.lineTo(19,-17);
      ctx.lineTo(9,-22); ctx.lineTo(0,-18); ctx.lineTo(-9,-22); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff2b0'; ctx.strokeStyle='#ba7c2b'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(-17,-13); ctx.quadraticCurveTo(-28,0,-20,21); ctx.lineTo(-11,16); ctx.lineTo(-11,-9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(17,-13); ctx.quadraticCurveTo(28,0,20,21); ctx.lineTo(11,16); ctx.lineTo(11,-9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#fff8cf'; ctx.shadowColor='#ffe58a'; ctx.shadowBlur=16;
      ctx.beginPath(); ctx.arc(0,-42,4+Math.sin(gameTime*6)*1,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.restore();
    } else if(u.def.id==='exileKnight'){
      /* Рыцарь-изгнанник — тяжёлый техно-рыцарь:
         стальная маска, широкая плита плеча и синий плащ. */
      const s = u.radius/24;
      ctx.save();
      ctx.scale(s,s);
      ctx.shadowColor='#47cfff'; ctx.shadowBlur=18;
      ctx.fillStyle='rgba(22,104,145,0.24)';
      ctx.beginPath(); ctx.ellipse(0,14,38,38,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;

      // Синий плащ и массивный корпус.
      ctx.fillStyle='#17405f'; ctx.strokeStyle='#5ebce0'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-23,-3); ctx.lineTo(-35,34); ctx.lineTo(-12,28);
      ctx.lineTo(0,42); ctx.lineTo(18,30); ctx.lineTo(35,34); ctx.lineTo(22,-3); ctx.closePath(); ctx.fill(); ctx.stroke();
      const armor=ctx.createLinearGradient(-24,0,25,32);
      armor.addColorStop(0,'#d5e4e5'); armor.addColorStop(0.45,'#718b96'); armor.addColorStop(1,'#293943');
      ctx.fillStyle=armor; ctx.strokeStyle='#17242d'; ctx.lineWidth=2.4;
      ctx.beginPath(); ctx.moveTo(-18,-2); ctx.lineTo(-25,29); ctx.quadraticCurveTo(0,39,25,29);
      ctx.lineTo(18,-2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#b4e7f5'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(-14,4); ctx.lineTo(-10,27); ctx.moveTo(0,3); ctx.lineTo(0,32); ctx.moveTo(14,4); ctx.lineTo(10,27); ctx.stroke();

      // Огромная механическая плита на плече.
      ctx.fillStyle='#526a74'; ctx.strokeStyle='#a8d8e2'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(13,-3); ctx.lineTo(39,-13); ctx.lineTo(48,3);
      ctx.lineTo(36,18); ctx.lineTo(17,14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#263944'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(22,0); ctx.lineTo(40,-7); ctx.moveTo(24,6); ctx.lineTo(42,0); ctx.stroke();

      // Угловатая металлическая голова и голубой визор.
      ctx.fillStyle='#7f969b'; ctx.strokeStyle='#1a2932'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-18,-18); ctx.lineTo(-8,-31); ctx.lineTo(15,-29);
      ctx.lineTo(25,-15); ctx.lineTo(13,4); ctx.lineTo(-13,5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#182832'; ctx.strokeStyle='#b9f2ff'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-14,-15); ctx.lineTo(15,-19); ctx.lineTo(18,-8);
      ctx.lineTo(-12,-4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#9ef3ff'; ctx.shadowColor='#4ddcff'; ctx.shadowBlur=13;
      ctx.fillRect(-8,-12,17,3); ctx.shadowBlur=0;
      ctx.fillStyle='#dce9e4'; ctx.strokeStyle='#5d747c'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-11,-29); ctx.lineTo(-4,-42); ctx.lineTo(4,-30);
      ctx.lineTo(13,-38); ctx.lineTo(16,-27); ctx.closePath(); ctx.fill(); ctx.stroke();

      // Голубой реактор на груди.
      ctx.fillStyle='#2b738f'; ctx.strokeStyle='#b9f5ff'; ctx.lineWidth=1.6;
      ctx.beginPath(); ctx.moveTo(0,5); ctx.lineTo(9,14); ctx.lineTo(0,25); ctx.lineTo(-9,14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#d9ffff'; ctx.shadowColor='#6de7ff'; ctx.shadowBlur=14;
      ctx.beginPath(); ctx.arc(0,15,3.5+Math.sin(gameTime*7)*0.7,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.restore();
    } else if(u.def.id==='golly'){
      /* Голли — ледяной владыка по референсу: широкое синее лицо,
         длинная морозная борода, ледяная корона и холодное свечение глаз. */
      const s = u.radius/24;
      ctx.save();
      ctx.scale(s,s);
      ctx.shadowColor='#65dfff'; ctx.shadowBlur=25;
      ctx.fillStyle='rgba(71,189,255,0.22)';
      ctx.beginPath(); ctx.ellipse(0,10,36,42,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;

      // Ледяной плащ и острые наплечники.
      const cloak=ctx.createLinearGradient(-28,0,28,38);
      cloak.addColorStop(0,'#bff5ff'); cloak.addColorStop(0.45,'#397da9'); cloak.addColorStop(1,'#102d56');
      ctx.fillStyle=cloak; ctx.strokeStyle='#8ee9ff'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-19,-2); ctx.lineTo(-30,31); ctx.lineTo(0,39);
      ctx.lineTo(30,31); ctx.lineTo(19,-2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#69c8eb'; ctx.strokeStyle='#c8fbff'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-17,2); ctx.lineTo(-39,-10); ctx.lineTo(-29,13); ctx.lineTo(-13,10); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(17,2); ctx.lineTo(39,-10); ctx.lineTo(29,13); ctx.lineTo(13,10); ctx.closePath(); ctx.fill(); ctx.stroke();

      // Синее лицо.
      const iceSkin=ctx.createRadialGradient(-8,-17,2,0,-7,27);
      iceSkin.addColorStop(0,'#b9f3ff'); iceSkin.addColorStop(0.5,'#569fc5'); iceSkin.addColorStop(1,'#183c70');
      ctx.fillStyle=iceSkin; ctx.strokeStyle='#b7f4ff'; ctx.lineWidth=1.8;
      ctx.beginPath(); ctx.moveTo(-17,-18); ctx.quadraticCurveTo(0,-29,17,-18);
      ctx.lineTo(15,7); ctx.quadraticCurveTo(10,19,0,23);
      ctx.quadraticCurveTo(-10,19,-15,7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#ffe9a7'; ctx.shadowColor='#fff4c0'; ctx.shadowBlur=13;
      ctx.beginPath(); ctx.ellipse(-7,-9,4.5,2.7,0,0,Math.PI*2); ctx.ellipse(7,-9,4.5,2.7,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.strokeStyle='#16335d'; ctx.lineWidth=2.2; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-12,-14); ctx.lineTo(-3,-17); ctx.moveTo(3,-17); ctx.lineTo(12,-14);
      ctx.moveTo(-2,-4); ctx.lineTo(0,4); ctx.lineTo(4,5); ctx.stroke();

      // Большая морозная борода и усы.
      const beard=ctx.createLinearGradient(0,1,0,37);
      beard.addColorStop(0,'#d9fbff'); beard.addColorStop(0.55,'#79cbe5'); beard.addColorStop(1,'#28628d');
      ctx.fillStyle=beard; ctx.strokeStyle='#c3f6ff'; ctx.lineWidth=1.6;
      ctx.beginPath(); ctx.moveTo(-14,2); ctx.quadraticCurveTo(-11,15,-20,20);
      ctx.lineTo(-10,22); ctx.lineTo(-14,34); ctx.lineTo(0,43); ctx.lineTo(14,34);
      ctx.lineTo(10,22); ctx.lineTo(20,20); ctx.quadraticCurveTo(11,15,14,2);
      ctx.quadraticCurveTo(6,8,0,7); ctx.quadraticCurveTo(-6,8,-14,2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(224,253,255,0.75)'; ctx.lineWidth=1;
      for(let i=-2;i<=2;i++){
        ctx.beginPath(); ctx.moveTo(i*5,10); ctx.lineTo(i*4,34); ctx.stroke();
      }
      ctx.fillStyle='#efffff'; ctx.strokeStyle='#8ddcef'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-13,2); ctx.quadraticCurveTo(-4,5,0,11);
      ctx.quadraticCurveTo(4,5,13,2); ctx.quadraticCurveTo(7,15,0,16);
      ctx.quadraticCurveTo(-7,15,-13,2); ctx.closePath(); ctx.fill(); ctx.stroke();

      // Корона из кристаллов.
      ctx.fillStyle='#96e8ff'; ctx.strokeStyle='#dbfbff'; ctx.lineWidth=1.6;
      ctx.beginPath(); ctx.moveTo(-20,-17); ctx.lineTo(-18,-39); ctx.lineTo(-9,-27);
      ctx.lineTo(-4,-54); ctx.lineTo(2,-29); ctx.lineTo(12,-45); ctx.lineTo(18,-18);
      ctx.lineTo(8,-23); ctx.lineTo(0,-20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#eaffff'; ctx.shadowColor='#7de8ff'; ctx.shadowBlur=19;
      ctx.beginPath(); ctx.arc(0,-47,3.5+Math.sin(gameTime*5)*0.8,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.restore();
    } else if(u.def.id==='sasych'){
      /* Сасыч — компактный кровавый охотник, а не круглый инопланетянин:
         капюшон, костяная маска, красные руны и асимметричная броня. */
      const s = u.radius/24;
      ctx.save();
      ctx.scale(s,s);
      ctx.shadowColor='#e51f52'; ctx.shadowBlur=20;
      ctx.fillStyle='rgba(114,11,42,0.28)';
      ctx.beginPath(); ctx.ellipse(0,12,32,35,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      const coat=ctx.createLinearGradient(-24,0,25,36);
      coat.addColorStop(0,'#5c172d'); coat.addColorStop(0.55,'#2a1228'); coat.addColorStop(1,'#100d1e');
      ctx.fillStyle=coat; ctx.strokeStyle='#9e294b'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-18,-3); ctx.lineTo(-27,32); ctx.lineTo(-10,27);
      ctx.lineTo(0,39); ctx.lineTo(15,29); ctx.lineTo(27,32); ctx.lineTo(19,-3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#55233c'; ctx.strokeStyle='#d74f69'; ctx.lineWidth=1.8;
      ctx.beginPath(); ctx.ellipse(-23,1,12,8,-0.25,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(22,7,9,12,0.4,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#241526'; ctx.strokeStyle='#b9305b'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-16,-9); ctx.quadraticCurveTo(-19,-34,0,-43);
      ctx.quadraticCurveTo(19,-34,16,-9); ctx.lineTo(11,16); ctx.lineTo(-11,16); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#d6a5a1'; ctx.strokeStyle='#63283a'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-13,-14); ctx.quadraticCurveTo(0,-23,13,-14);
      ctx.lineTo(10,6); ctx.lineTo(0,16); ctx.lineTo(-10,6); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#311526'; ctx.beginPath(); ctx.moveTo(-13,-13); ctx.lineTo(-2,-19); ctx.lineTo(0,-12);
      ctx.lineTo(12,-17); ctx.lineTo(10,-8); ctx.lineTo(-10,-7); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#ff5376'; ctx.shadowColor='#ff1f52'; ctx.shadowBlur=14;
      ctx.beginPath(); ctx.ellipse(-6,-6,4,2,0,0,Math.PI*2); ctx.ellipse(6,-6,4,2,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.strokeStyle='#6f203a'; ctx.lineWidth=2; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-8,5); ctx.lineTo(0,10); ctx.lineTo(8,5); ctx.stroke();
      ctx.strokeStyle='#ff5376'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.moveTo(-7,21); ctx.lineTo(0,27); ctx.lineTo(7,21); ctx.moveTo(-5,26); ctx.lineTo(0,32); ctx.lineTo(5,26); ctx.stroke();
      ctx.restore();
    } else if(u.def.id==='malit'){
      /* Малит — короткий тяжёлый громила в каменной броне:
         широкая спина, шлем, квадратная челюсть и медные детали. */
      const s = u.radius/24;
      ctx.save(); ctx.scale(s,s);
      ctx.fillStyle='rgba(25,20,19,0.4)';
      ctx.beginPath(); ctx.ellipse(0,16,36,28,0,0,Math.PI*2); ctx.fill();
      const plate=ctx.createLinearGradient(-28,0,27,38);
      plate.addColorStop(0,'#8f7460'); plate.addColorStop(0.5,'#4e403d'); plate.addColorStop(1,'#211f28');
      ctx.fillStyle=plate; ctx.strokeStyle='#b89472'; ctx.lineWidth=2.4;
      ctx.beginPath(); ctx.moveTo(-27,-1); ctx.lineTo(-34,30); ctx.quadraticCurveTo(0,44,34,30);
      ctx.lineTo(27,-1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#a65c37'; ctx.strokeStyle='#e1a36d'; ctx.lineWidth=1.8;
      ctx.beginPath(); ctx.ellipse(-26,0,14,10,-0.25,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(26,0,14,10,0.25,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#6d5749'; ctx.strokeStyle='#2a252a'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-20,-5); ctx.lineTo(-17,-28); ctx.quadraticCurveTo(0,-42,17,-28);
      ctx.lineTo(20,-5); ctx.lineTo(11,12); ctx.lineTo(-11,12); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#c28d63'; ctx.strokeStyle='#573b32'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-14,-10); ctx.quadraticCurveTo(0,-20,14,-10);
      ctx.lineTo(12,8); ctx.lineTo(0,16); ctx.lineTo(-12,8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#352329'; ctx.strokeStyle='#221923'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-14,-13); ctx.lineTo(0,-24); ctx.lineTo(14,-13);
      ctx.lineTo(10,-4); ctx.lineTo(-10,-4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#ffe7b0'; ctx.shadowColor='#ffb95d'; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.ellipse(-6,-5,3.5,2.2,0,0,Math.PI*2); ctx.ellipse(6,-5,3.5,2.2,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle='#6b2b2b'; ctx.beginPath(); ctx.arc(0,8,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#d6b28a'; ctx.strokeStyle='#704a37'; ctx.lineWidth=1;
      for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(i*5-2,11); ctx.lineTo(i*5,16); ctx.lineTo(i*5+2,11); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle='#d88944'; ctx.beginPath(); ctx.arc(0,25,5+Math.sin(gameTime*5),0,Math.PI*2); ctx.fill();
      ctx.restore();
    } else if(u.def.id==='arcady'){
      /* Аркадий — огненный стрелок: кожаный плащ, широкополая шляпа,
         очки-линзы и раскалённый механический ружейный модуль. */
      const s = u.radius/24;
      ctx.save(); ctx.scale(s,s);
      ctx.shadowColor='#ff5a24'; ctx.shadowBlur=18;
      ctx.fillStyle='rgba(207,55,28,0.25)';
      ctx.beginPath(); ctx.ellipse(0,14,33,37,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle='#71352d'; ctx.strokeStyle='#d77b45'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-20,-4); ctx.lineTo(-29,35); ctx.lineTo(0,40); ctx.lineTo(29,35);
      ctx.lineTo(20,-4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#b84c2b'; ctx.strokeStyle='#f1a15c'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.ellipse(-23,1,12,8,-0.25,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(23,1,12,8,0.25,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#d88a58'; ctx.strokeStyle='#5d2e2b'; ctx.lineWidth=1.7;
      ctx.beginPath(); ctx.ellipse(0,-10,15,19,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#291d25'; ctx.strokeStyle='#e5a05d'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(0,-27,24,7,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#4b2725'; ctx.beginPath(); ctx.moveTo(-14,-28); ctx.quadraticCurveTo(-11,-44,0,-47);
      ctx.quadraticCurveTo(13,-43,15,-28); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#ffcb70'; ctx.shadowColor='#ff7433'; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.arc(-6,-10,4,0,Math.PI*2); ctx.arc(6,-10,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.strokeStyle='#5a2c28'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-6,1); ctx.lineTo(0,5); ctx.lineTo(6,1); ctx.stroke();
      ctx.fillStyle='#f58a2e'; ctx.strokeStyle='#ffd27a'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.arc(0,18,6+Math.sin(gameTime*8)*1.2,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.restore();
    } else if(u.def.id==='shadow'){
       const s = u.radius/24;
       ctx.save();
       ctx.scale(s,s);
       ctx.shadowColor='#ff174f'; ctx.shadowBlur=24;
       ctx.fillStyle='rgba(105,9,35,0.44)';
       ctx.beginPath(); ctx.ellipse(0,10,34,39,0,0,Math.PI*2); ctx.fill();
       ctx.shadowBlur=0;
       if(shadowModelImage.complete && shadowModelImage.naturalWidth){
         ctx.save();
         ctx.beginPath();
         ctx.moveTo(-31,26); ctx.lineTo(-27,-24); ctx.lineTo(-8,-39); ctx.lineTo(0,-32);
         ctx.lineTo(10,-40); ctx.lineTo(31,-22); ctx.lineTo(29,27); ctx.closePath();
         ctx.clip();
         ctx.drawImage(shadowModelImage,-34,-42,68,80);
         ctx.restore();
         ctx.strokeStyle='#b5164e'; ctx.lineWidth=2.2;
         ctx.beginPath(); ctx.moveTo(-31,26); ctx.lineTo(-27,-24); ctx.lineTo(-8,-39); ctx.lineTo(0,-32);
         ctx.lineTo(10,-40); ctx.lineTo(31,-22); ctx.lineTo(29,27); ctx.lineTo(0,39); ctx.closePath(); ctx.stroke();
       } else {
         ctx.fillStyle='rgba(9,4,18,0.92)'; ctx.strokeStyle='#8d1118'; ctx.lineWidth=2.5;
         ctx.beginPath(); ctx.moveTo(-25,8); ctx.lineTo(-18,-18); ctx.lineTo(-8,-30); ctx.lineTo(0,-20); ctx.lineTo(10,-32); ctx.lineTo(23,-14); ctx.lineTo(28,10); ctx.lineTo(0,34); ctx.closePath(); ctx.fill(); ctx.stroke();
         ctx.fillStyle='#d22d55'; ctx.shadowColor='#ff315d'; ctx.shadowBlur=10;
         ctx.beginPath(); ctx.arc(-8,-7,3.5,0,Math.PI*2); ctx.arc(8,-7,3.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
       }
       ctx.fillStyle='#ff2e5c'; ctx.shadowColor='#ff174f'; ctx.shadowBlur=12;
       ctx.beginPath(); ctx.arc(-9,-9,2.8+Math.sin(gameTime*8)*0.8,0,Math.PI*2); ctx.arc(9,-9,2.8+Math.sin(gameTime*8)*0.8,0,Math.PI*2); ctx.fill();
       ctx.shadowBlur=0;
        ctx.strokeStyle='#ff9a3d'; ctx.lineWidth=2.2; ctx.beginPath(); ctx.arc(0,7,12,0.2,Math.PI-0.2); ctx.stroke();
      if((u.shadowSouls || 0) > 0){
          ctx.strokeStyle='rgba(255,154,61,0.9)'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.arc(0,0,33 + Math.sin(gameTime*5)*3,0,Math.PI*2); ctx.stroke();
      }
       ctx.restore();
    } else if(u.def.id==='electricGosha'){
      const s = u.radius/24;
      ctx.save();
      ctx.scale(s,s);
      ctx.shadowColor='#2bdcff'; ctx.shadowBlur=16;

      ctx.fillStyle='#173d6b'; ctx.strokeStyle='#6ec8ff'; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(-29,-3); ctx.lineTo(-38,30); ctx.lineTo(-22,25); ctx.lineTo(-10,36);
      ctx.lineTo(0,29); ctx.lineTo(10,36); ctx.lineTo(22,25); ctx.lineTo(38,30);
      ctx.lineTo(29,-3); ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.fillStyle='#244f82'; ctx.strokeStyle='#94ddff'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-21,-5); ctx.lineTo(-17,29); ctx.lineTo(0,35); ctx.lineTo(17,29); ctx.lineTo(21,-5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#1b2e50'; ctx.strokeStyle='#78b9e9'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-13,0); ctx.lineTo(13,0); ctx.lineTo(18,25); ctx.lineTo(0,31); ctx.lineTo(-18,25); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(180,235,255,0.55)'; ctx.lineWidth=1;
      for(let row=0;row<4;row++){
        ctx.beginPath(); ctx.moveTo(-14+row*2,5+row*5); ctx.lineTo(14-row*2,5+row*5); ctx.stroke();
      }

      ctx.fillStyle='#203c66'; ctx.strokeStyle='#7cdcff'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-25,-5); ctx.lineTo(-39,-16); ctx.lineTo(-29,10); ctx.lineTo(-18,8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(25,-5); ctx.lineTo(39,-16); ctx.lineTo(29,10); ctx.lineTo(18,8); ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.fillStyle='#42d9d9'; ctx.strokeStyle='#b7ffff'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.ellipse(0,-12,17,19,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#1b5f83'; ctx.beginPath(); ctx.ellipse(0,-9,13,14,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#dfffff'; ctx.shadowColor='#bfffff'; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.ellipse(-6,-11,4,2.5,0,0,Math.PI*2); ctx.ellipse(6,-11,4,2.5,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='#11294b'; ctx.strokeStyle='#7edbff'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-27,-18); ctx.quadraticCurveTo(-20,-39,0,-45); ctx.quadraticCurveTo(20,-39,27,-18);
      ctx.lineTo(15,-23); ctx.lineTo(0,-28); ctx.lineTo(-15,-23); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#48eaff'; ctx.beginPath(); ctx.moveTo(-5,-43); ctx.lineTo(0,-57); ctx.lineTo(5,-43); ctx.closePath(); ctx.fill();

      ctx.fillStyle='#7b2736'; ctx.strokeStyle='#d85e6d'; ctx.lineWidth=2;
      ctx.fillRect(-27,7,54,9); ctx.strokeRect(-27,7,54,9);
      ctx.fillStyle='#bd394c'; ctx.beginPath(); ctx.arc(0,12,10,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#39e4dc'; ctx.shadowColor='#39e4dc'; ctx.shadowBlur=18;
      ctx.beginPath(); ctx.arc(-32,19,9+Math.sin(gameTime*8)*2,0,Math.PI*2); ctx.arc(32,19,9+Math.sin(gameTime*8)*2,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.strokeStyle='#b9f9ff'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-38,20); ctx.lineTo(-48,12); ctx.lineTo(-41,7); ctx.moveTo(38,20); ctx.lineTo(48,12); ctx.lineTo(41,7); ctx.stroke();
      ctx.restore();
    } else if(u.def.id==='mo3gi'){
      /* Мо3ги — военный инженер: шлем с ПНВ, плитоноска,
         подсумки, рация и рюкзак читаются даже на масштабе карты. */
      const s = u.radius/24;
      ctx.save();
      ctx.scale(s,s);

      // Рюкзак и боковые ремни.
      ctx.fillStyle='#17261f'; ctx.strokeStyle='#0b1511'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.roundRect(-31,2,62,35,7); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#334d3c'; ctx.strokeStyle='#6d9275'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.roundRect(-27,5,16,23,4); ctx.roundRect(11,5,16,23,4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#8eaa82'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-22,-1); ctx.lineTo(-16,29); ctx.moveTo(22,-1); ctx.lineTo(16,29); ctx.stroke();

      // Бронежилет с камуфляжными вставками.
      const vest = ctx.createLinearGradient(-24,0,24,35);
      vest.addColorStop(0,'#60735a'); vest.addColorStop(0.45,'#344b3b'); vest.addColorStop(1,'#1c2d24');
      ctx.fillStyle=vest; ctx.strokeStyle='#101b16'; ctx.lineWidth=2.4;
      ctx.beginPath(); ctx.moveTo(-23,-1); ctx.lineTo(-29,28); ctx.quadraticCurveTo(0,42,29,28);
      ctx.lineTo(23,-1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='rgba(135,163,106,0.42)';
      ctx.beginPath(); ctx.moveTo(-18,5); ctx.lineTo(-8,2); ctx.lineTo(-11,31); ctx.lineTo(-23,27); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(7,3); ctx.lineTo(19,5); ctx.lineTo(23,27); ctx.lineTo(11,31); ctx.closePath(); ctx.fill();

      // Центральная плита и ремни.
      ctx.fillStyle='#263c31'; ctx.strokeStyle='#94b18e'; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.moveTo(-13,1); ctx.lineTo(13,1); ctx.lineTo(17,27);
      ctx.quadraticCurveTo(0,34,-17,27); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#b8cba3'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-11,-1); ctx.lineTo(-7,28); ctx.moveTo(11,-1); ctx.lineTo(7,28); ctx.stroke();
      ctx.fillStyle='#d7b967'; ctx.fillRect(-4,8,8,4);
      ctx.fillStyle='#111a15'; ctx.fillRect(-4,10,8,2);

      // Подсумки и граната на груди.
      ctx.fillStyle='#536a52'; ctx.strokeStyle='#162219'; ctx.lineWidth=1.5;
      for(let i=-1;i<=1;i++){
        ctx.beginPath(); ctx.roundRect(i*11-5,20,10,10,2); ctx.fill(); ctx.stroke();
        ctx.fillStyle='rgba(194,211,148,0.32)'; ctx.fillRect(i*11-3,22,6,2); ctx.fillStyle='#536a52';
      }
      ctx.fillStyle='#8ea65e'; ctx.strokeStyle='#1b281c';
      ctx.beginPath(); ctx.arc(20,14,5,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#d0d99b'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(17,10); ctx.lineTo(23,10); ctx.stroke();

      // Плечи, перчатки и руки.
      ctx.fillStyle='#4a624b'; ctx.strokeStyle='#17271d'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(-25,5,10,8,-0.4,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(25,5,10,8,0.4,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#283c2e'; ctx.beginPath(); ctx.arc(-30,13,5,0,Math.PI*2); ctx.arc(30,13,5,0,Math.PI*2); ctx.fill(); ctx.stroke();

      // Голова и защитная маска.
      const face = ctx.createRadialGradient(-7,-16,2,0,-8,23);
      face.addColorStop(0,'#c99768'); face.addColorStop(0.7,'#946445'); face.addColorStop(1,'#4f372b');
      ctx.fillStyle=face; ctx.strokeStyle='#35261f'; ctx.lineWidth=1.8;
      ctx.beginPath(); ctx.ellipse(0,-9,19,23,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#27362c'; ctx.strokeStyle='#111c16'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.roundRect(-20,-19,40,13,4); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#8dffb0'; ctx.shadowColor='#65ff9a'; ctx.shadowBlur=9;
      ctx.fillRect(-14,-16,10,5); ctx.fillRect(4,-16,10,5); ctx.shadowBlur=0;
      ctx.strokeStyle='#b4d4ad'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-4,-14); ctx.lineTo(4,-14); ctx.stroke();
      ctx.fillStyle='#483126'; ctx.beginPath(); ctx.arc(0,-1,4,0,Math.PI*2); ctx.fill();

      // Шлем, ремешок и ПНВ-модуль.
      const helmet = ctx.createLinearGradient(-20,-38,20,-18);
      helmet.addColorStop(0,'#75896e'); helmet.addColorStop(0.6,'#3b5543'); helmet.addColorStop(1,'#1b2b22');
      ctx.fillStyle=helmet; ctx.strokeStyle='#142119'; ctx.lineWidth=2.3;
      ctx.beginPath(); ctx.moveTo(-21,-17); ctx.quadraticCurveTo(-20,-35,0,-40);
      ctx.quadraticCurveTo(20,-35,21,-17); ctx.lineTo(13,-20); ctx.lineTo(-13,-20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#a4bd91'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-18,-27); ctx.quadraticCurveTo(0,-34,18,-27); ctx.stroke();
      ctx.fillStyle='#1a2a20'; ctx.strokeStyle='#9de3a5'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.roundRect(-5,-43,10,10,2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#73ff9d'; ctx.shadowColor='#73ff9d'; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(0,-38,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

      // Антенна и нашивка Мо3ги.
      ctx.strokeStyle='#8ead92'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(16,-29); ctx.lineTo(24,-48); ctx.stroke();
      ctx.fillStyle='#7dffb0'; ctx.beginPath(); ctx.arc(24,-49,2.2,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#d5e8bf'; ctx.font='bold 5px Segoe UI, Arial'; ctx.textAlign='center';
      ctx.fillText('M3',0,27);
      ctx.restore();
    } else if(u.def.id==='tribupainer'){
      // Рыжий инженер с большими круглыми очками и меховым воротником.
      const s = u.radius/24;
      ctx.save();
      ctx.scale(s,s);
      ctx.shadowColor='#ff9d4d'; ctx.shadowBlur=18;
      ctx.fillStyle='rgba(255,128,55,0.22)';
      ctx.beginPath(); ctx.ellipse(0,12,35,39,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='#6b321c'; ctx.strokeStyle='#2a1711'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-22,-5); ctx.lineTo(-31,31); ctx.lineTo(0,40); ctx.lineTo(31,31); ctx.lineTo(22,-5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#b85b2e'; ctx.strokeStyle='#542617';
      ctx.beginPath(); ctx.moveTo(-18,-10); ctx.lineTo(-24,27); ctx.quadraticCurveTo(0,37,24,27); ctx.lineTo(18,-10); ctx.closePath(); ctx.fill(); ctx.stroke();

      // Большие линзы, ремешок и выступающие уши по второму референсу.
      ctx.strokeStyle='#8b531e'; ctx.lineWidth=5;
      ctx.beginPath(); ctx.moveTo(-20,-15); ctx.lineTo(20,-15); ctx.stroke();
      ctx.fillStyle='rgba(184,225,235,0.78)'; ctx.strokeStyle='#613b1d'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(-13,-15,12,0,Math.PI*2); ctx.arc(13,-15,12,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(-17,-19,4,0,Math.PI*2); ctx.arc(9,-19,4,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#3c2416'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(-2,-15); ctx.lineTo(2,-15); ctx.stroke();
      ctx.fillStyle='#b85b2e'; ctx.strokeStyle='#542617'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(-27,-8,8,13,-0.35,0,Math.PI*2); ctx.ellipse(27,-8,8,13,0.35,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#402016'; ctx.beginPath(); ctx.arc(-29,-7,4,0,Math.PI*2); ctx.arc(29,-7,4,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#5c2115'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.moveTo(-12,5); ctx.quadraticCurveTo(0,14,12,5); ctx.stroke();
      ctx.fillStyle='#f2d2a5'; ctx.beginPath(); ctx.arc(0,7,3,0,Math.PI*2); ctx.fill();

      ctx.fillStyle='#d7b88e'; ctx.strokeStyle='#6d4b31'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-24,13); ctx.lineTo(-34,24); ctx.lineTo(-18,29); ctx.lineTo(0,22); ctx.lineTo(18,29); ctx.lineTo(34,24); ctx.lineTo(24,13); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#293643'; ctx.strokeStyle='#111820';
      ctx.beginPath(); ctx.roundRect(-10,18,20,17,4); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#1b83c9'; ctx.fillRect(-5,21,10,4);
       ctx.restore();
     } else if(u.def.id==='juvsyut'){
       /* Джувсют — отдельный силуэт: широкий живот, клетчатая рубаха,
          фартук и огромная деревянная ложка вместо стандартного шара. */
       const s=u.radius/24;
       ctx.save(); ctx.scale(s,s);
       ctx.fillStyle='rgba(72,31,24,0.42)';
       ctx.beginPath(); ctx.ellipse(0,17,43,34,0,0,Math.PI*2); ctx.fill();
       ctx.fillStyle='#6f3d32'; ctx.strokeStyle='#2d1b20'; ctx.lineWidth=2.5;
       ctx.beginPath(); ctx.moveTo(-31,-1); ctx.lineTo(-42,32); ctx.quadraticCurveTo(0,52,42,32);
       ctx.lineTo(31,-1); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#d69b67'; ctx.strokeStyle='#74452e'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.ellipse(0,20,31,27,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.strokeStyle='rgba(105,52,39,0.65)'; ctx.lineWidth=2;
       for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(i*12-5,0); ctx.lineTo(i*12,40); ctx.stroke(); }
       ctx.fillStyle='#eee0bc'; ctx.strokeStyle='#8c6f4f'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.moveTo(-23,1); ctx.lineTo(-27,38); ctx.quadraticCurveTo(0,47,27,38);
       ctx.lineTo(23,1); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#b84c4c'; ctx.beginPath(); ctx.arc(-13,20,3,0,Math.PI*2); ctx.arc(11,31,2.5,0,Math.PI*2); ctx.fill();
       ctx.fillStyle='#c1815e'; ctx.strokeStyle='#54362e'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.ellipse(-27,-9,9,13,-0.2,0,Math.PI*2); ctx.ellipse(27,-9,9,13,0.2,0,Math.PI*2); ctx.fill(); ctx.stroke();
       const jHead=ctx.createRadialGradient(-8,-20,2,0,-9,29);
       jHead.addColorStop(0,'#f1bb87'); jHead.addColorStop(0.62,'#c87f5f'); jHead.addColorStop(1,'#6e3f37');
       ctx.fillStyle=jHead; ctx.beginPath(); ctx.ellipse(0,-10,26,29,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#4a2b2c'; ctx.beginPath(); ctx.arc(0,-30,20,Math.PI,Math.PI*2); ctx.fill();
       ctx.fillStyle='#f8e9c7'; ctx.shadowColor='#ffd0a8'; ctx.shadowBlur=10;
       ctx.beginPath(); ctx.ellipse(-9,-10,4,3,0,0,Math.PI*2); ctx.ellipse(9,-10,4,3,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
       ctx.fillStyle='#3a2027'; ctx.beginPath(); ctx.ellipse(0,10,13,8,0,0,Math.PI*2); ctx.fill();
       ctx.fillStyle='#fff0cf'; for(let i=-2;i<=2;i++) ctx.fillRect(i*5-2,5,4,4);
       ctx.fillStyle='#d7a56a'; ctx.strokeStyle='#70462f'; ctx.lineWidth=2.5;
       ctx.beginPath(); ctx.moveTo(16,4); ctx.lineTo(46,-29); ctx.lineTo(51,-25); ctx.lineTo(22,10); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#f1ca88'; ctx.beginPath(); ctx.ellipse(49,-28,8,5,-0.6,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.restore();
     } else if(u.def.id==='chip'){
       /* Чип — королевский силуэт: плащ, медальон и корона с тремя зубцами. */
       const s=u.radius/24;
       ctx.save(); ctx.scale(s,s);
       ctx.shadowColor='#ffd568'; ctx.shadowBlur=18;
       ctx.fillStyle='rgba(104,65,168,0.28)';
       ctx.beginPath(); ctx.ellipse(0,14,37,40,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
       ctx.fillStyle='#3c285f'; ctx.strokeStyle='#9c75d8'; ctx.lineWidth=2.5;
       ctx.beginPath(); ctx.moveTo(-25,-2); ctx.lineTo(-37,36); ctx.lineTo(0,45); ctx.lineTo(37,36);
       ctx.lineTo(25,-2); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#6c49a2'; ctx.strokeStyle='#d0aaff'; ctx.lineWidth=1.5;
       ctx.beginPath(); ctx.moveTo(-18,1); ctx.lineTo(-12,35); ctx.lineTo(0,39); ctx.lineTo(12,35);
       ctx.lineTo(18,1); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.strokeStyle='#ffd568'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.moveTo(-15,3); ctx.lineTo(0,35); ctx.lineTo(15,3); ctx.stroke();
       ctx.fillStyle='#d69b70'; ctx.strokeStyle='#5f3c38'; ctx.lineWidth=1.8;
       ctx.beginPath(); ctx.ellipse(0,-11,21,25,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#3d2857'; ctx.beginPath(); ctx.arc(0,-26,20,Math.PI,Math.PI*2); ctx.fill();
       ctx.fillStyle='#fff0b0'; ctx.shadowColor='#fff0a8'; ctx.shadowBlur=10;
       ctx.beginPath(); ctx.ellipse(-8,-12,4,2.8,0,0,Math.PI*2); ctx.ellipse(8,-12,4,2.8,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
       ctx.strokeStyle='#6a3f4a'; ctx.lineWidth=1.8; ctx.beginPath(); ctx.arc(0,-1,7,0.15,Math.PI-0.15); ctx.stroke();
       ctx.fillStyle='#f3c94f'; ctx.strokeStyle='#8e5b20'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.moveTo(-21,-24); ctx.lineTo(-17,-48); ctx.lineTo(-5,-33);
       ctx.lineTo(0,-56); ctx.lineTo(7,-33); ctx.lineTo(19,-48); ctx.lineTo(22,-23);
       ctx.lineTo(10,-28); ctx.lineTo(0,-25); ctx.lineTo(-10,-28); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#fff0a8'; ctx.beginPath(); ctx.arc(0,-53,4,0,Math.PI*2); ctx.fill();
       ctx.fillStyle='#ffd568'; ctx.strokeStyle='#875b24'; ctx.lineWidth=1.5;
       ctx.beginPath(); ctx.arc(0,18,8,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#fff0a8'; ctx.font='bold 9px Segoe UI, Arial'; ctx.textAlign='center'; ctx.fillText('C',0,21);
       ctx.restore();
     } else if(u.def.id==='regina'){
       // Ригина повторяет референс: рыжий высокий хвост, синяя форма,
       // светлая кираса, зелёный плащ и походный рюкзак.
       const s = u.radius/24;
       ctx.save();
       ctx.scale(s,s);
       ctx.fillStyle='rgba(29,54,83,0.34)'; ctx.shadowColor='#ff6f91'; ctx.shadowBlur=18;
       ctx.beginPath(); ctx.ellipse(0,15,33,39,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
       ctx.fillStyle='#31557f'; ctx.strokeStyle='#172d49'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.moveTo(-22,-4); ctx.lineTo(-31,31); ctx.lineTo(0,41); ctx.lineTo(31,31); ctx.lineTo(22,-4); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#d9e4ea'; ctx.strokeStyle='#a7bfd0'; ctx.lineWidth=1.5;
       ctx.beginPath(); ctx.moveTo(-15,-2); ctx.lineTo(15,-2); ctx.lineTo(18,28); ctx.quadraticCurveTo(0,36,-18,28); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#3f78b1'; ctx.fillRect(-5,0,4,24); ctx.fillRect(3,0,4,24);
       ctx.fillStyle='#9a6844'; ctx.strokeStyle='#4b3025'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.roundRect(-29,0,9,28,3); ctx.roundRect(20,0,9,28,3); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#243b3c'; ctx.strokeStyle='#6c8a80';
       ctx.beginPath(); ctx.moveTo(-28,-4); ctx.lineTo(-38,-18); ctx.lineTo(-30,-30); ctx.lineTo(-18,-12); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.beginPath(); ctx.moveTo(28,-4); ctx.lineTo(38,-18); ctx.lineTo(30,-30); ctx.lineTo(18,-12); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#e0a276'; ctx.strokeStyle='#6d4434'; ctx.lineWidth=1.5;
       ctx.beginPath(); ctx.ellipse(0,-13,18,21,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#a84f2d'; ctx.strokeStyle='#5c2e22'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.moveTo(-19,-17); ctx.quadraticCurveTo(-15,-39,4,-37); ctx.quadraticCurveTo(20,-35,22,-18); ctx.lineTo(15,-25); ctx.quadraticCurveTo(2,-33,-10,-24); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#c96535'; ctx.beginPath(); ctx.arc(25,-34,13,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.strokeStyle='#e8a06c'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-12,-25); ctx.lineTo(-19,-7); ctx.moveTo(7,-29); ctx.lineTo(16,-12); ctx.stroke();
       ctx.fillStyle='#6f352b'; ctx.beginPath(); ctx.arc(-7,-12,2.4,0,Math.PI*2); ctx.arc(7,-12,2.4,0,Math.PI*2); ctx.fill();
       ctx.fillStyle='#ffeff2'; ctx.beginPath(); ctx.arc(-7,-13,1,0,Math.PI*2); ctx.arc(7,-13,1,0,Math.PI*2); ctx.fill();
       ctx.strokeStyle='#7e3d3d'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(-7,-3); ctx.quadraticCurveTo(0,1,7,-3); ctx.stroke();
       ctx.restore();
     } else if(u.def.id==='grisha'){
      /* Гриша — беловолосый арканист в духе референса: длинные волосы,
         бледное лицо, светящиеся глаза, третий глаз и высокий воротник. */
      const s = u.radius/24;
      ctx.save();
      ctx.scale(s,s);

      // Пурпурная мантия и широкие плечи.
      ctx.fillStyle='rgba(116,28,132,0.38)';
      ctx.shadowColor='#b66dff'; ctx.shadowBlur=18;
      ctx.beginPath(); ctx.ellipse(0,13,31,23,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='#171526';
      ctx.strokeStyle='#604a77'; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(-25,5); ctx.lineTo(-34,30); ctx.lineTo(-16,26);
      ctx.lineTo(0,31); ctx.lineTo(16,26); ctx.lineTo(34,30);
      ctx.lineTo(25,5); ctx.closePath(); ctx.fill(); ctx.stroke();

      // Длинные светлые волосы, уходящие за плечи.
      ctx.fillStyle='#d8d7df';
      ctx.strokeStyle='#8d879d'; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(-21,-17); ctx.quadraticCurveTo(-29,0,-23,25);
      ctx.lineTo(-12,29); ctx.lineTo(-14,3); ctx.lineTo(0,-21);
      ctx.lineTo(14,3); ctx.lineTo(13,29); ctx.lineTo(24,25);
      ctx.quadraticCurveTo(30,0,20,-17); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,0.65)'; ctx.lineWidth=1.5;
      for(let i=-2;i<=2;i++){
        ctx.beginPath(); ctx.moveTo(i*6-15,-15); ctx.quadraticCurveTo(i*7-18,5,i*7-14,24); ctx.stroke();
      }

      // Высокий тёмный воротник с золотой окантовкой.
      ctx.fillStyle='#101321'; ctx.strokeStyle='#e3b85d'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(-23,4); ctx.lineTo(-34,-8); ctx.lineTo(-27,22);
      ctx.lineTo(-11,16); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(23,4); ctx.lineTo(34,-8); ctx.lineTo(27,22);
      ctx.lineTo(11,16); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(255,224,145,0.75)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-30,-5); ctx.lineTo(-23,18); ctx.moveTo(30,-5); ctx.lineTo(23,18); ctx.stroke();

      // Бледное вытянутое лицо.
      const face = ctx.createRadialGradient(-5,-10,2,0,-4,22);
      face.addColorStop(0,'#fffaf2'); face.addColorStop(0.68,'#e8dfd8'); face.addColorStop(1,'#9c8990');
      ctx.fillStyle=face; ctx.strokeStyle='#b8a5a5'; ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(-15,-18); ctx.quadraticCurveTo(-5,-25,8,-19);
      ctx.quadraticCurveTo(17,-10,13,4); ctx.quadraticCurveTo(10,17,0,21);
      ctx.quadraticCurveTo(-11,17,-15,5); ctx.quadraticCurveTo(-19,-7,-15,-18);
      ctx.closePath(); ctx.fill(); ctx.stroke();

      // Тяжёлая прядь и боковые пряди.
      ctx.fillStyle='#f5f3f1'; ctx.strokeStyle='#bcb7c3'; ctx.lineWidth=1.4;
      ctx.beginPath();
      ctx.moveTo(-19,-15); ctx.quadraticCurveTo(-9,-29,8,-23);
      ctx.quadraticCurveTo(18,-20,20,-10); ctx.lineTo(10,-12);
      ctx.lineTo(3,-7); ctx.lineTo(1,-19); ctx.lineTo(-7,-11);
      ctx.lineTo(-16,-8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#d3d0d9';
      ctx.beginPath(); ctx.moveTo(-17,-11); ctx.quadraticCurveTo(-24,3,-17,15);
      ctx.lineTo(-11,18); ctx.lineTo(-12,-5); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(12,-13); ctx.quadraticCurveTo(24,2,16,18);
      ctx.lineTo(10,20); ctx.lineTo(10,-5); ctx.closePath(); ctx.fill();

      // Тонкие черты лица.
      ctx.strokeStyle='rgba(92,70,76,0.68)'; ctx.lineWidth=1.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-11,-3); ctx.quadraticCurveTo(-7,-6,-3,-3);
      ctx.moveTo(3,-3); ctx.quadraticCurveTo(8,-6,12,-2);
      ctx.moveTo(-1,-1); ctx.lineTo(-3,7); ctx.lineTo(2,8);
      ctx.moveTo(-8,13); ctx.quadraticCurveTo(0,17,8,12); ctx.stroke();

      // Светящиеся глаза и третий глаз на лбу.
      ctx.shadowColor='#ffffff'; ctx.shadowBlur=11; ctx.fillStyle='#ffffff';
      ctx.beginPath(); ctx.ellipse(-8,-2,4.5,2.2,-0.12,0,Math.PI*2);
      ctx.ellipse(7,-2,4.5,2.2,0.12,0,Math.PI*2); ctx.fill();
      ctx.shadowColor='#c58cff'; ctx.shadowBlur=14; ctx.fillStyle='#f7eaff';
      ctx.beginPath(); ctx.ellipse(0,-14,3,5,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;

      // Магический знак на груди.
      ctx.strokeStyle='#d6a5ff'; ctx.lineWidth=1.5; ctx.globalAlpha=0.85;
      ctx.beginPath(); ctx.arc(0,16,6+Math.sin(gameTime*4)*1.2,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5,16); ctx.lineTo(0,10); ctx.lineTo(5,16); ctx.lineTo(0,22); ctx.closePath(); ctx.stroke();
      ctx.globalAlpha=1;
      ctx.restore();
    } else if(u.def.id==='ilya'){
      /* Илья — большой зелёный мясник по мотивам референса:
         раздутый силуэт, грубое лицо, белые пряди и пасть с зубами. */
      const s = u.radius/24;
      ctx.save();
      ctx.scale(s,s);

      // Тяжёлая спина, плечи и большой живот.
      ctx.fillStyle='rgba(54,34,28,0.5)';
      ctx.beginPath(); ctx.ellipse(0,15,35,29,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#6f8b45'; ctx.strokeStyle='#2d3d2b'; ctx.lineWidth=2.5;
      ctx.beginPath();
      ctx.moveTo(-28,-2); ctx.quadraticCurveTo(-36,13,-29,34);
      ctx.quadraticCurveTo(-14,42,0,42); ctx.quadraticCurveTo(16,42,29,34);
      ctx.quadraticCurveTo(36,13,27,-2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#a9b66a';
      ctx.beginPath(); ctx.ellipse(0,20,23,21,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(45,61,38,0.65)'; ctx.lineWidth=1.4;
      ctx.beginPath(); ctx.arc(-8,18,3,0,Math.PI*2); ctx.arc(11,29,2.5,0,Math.PI*2); ctx.stroke();

      // Рваный фартук/жилет с пятнами крови.
      ctx.fillStyle='#d1c29a'; ctx.strokeStyle='#6e4f42'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-19,3); ctx.lineTo(-25,36); ctx.lineTo(0,42);
      ctx.lineTo(25,36); ctx.lineTo(18,3); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#7e2e32';
      ctx.beginPath(); ctx.arc(-12,17,3,0,Math.PI*2); ctx.arc(10,27,2.5,0,Math.PI*2); ctx.arc(5,9,2,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#8d7660'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-16,5); ctx.lineTo(-12,33); ctx.moveTo(15,5); ctx.lineTo(13,35); ctx.stroke();

      // Большая зелёная голова и уши.
      ctx.fillStyle='#b87d60'; ctx.strokeStyle='#4e342d'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(-20,-9,8,12,-0.25,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(20,-9,8,12,0.25,0,Math.PI*2); ctx.fill(); ctx.stroke();
      const head = ctx.createRadialGradient(-8,-18,3,0,-7,29);
      head.addColorStop(0,'#f0c18e'); head.addColorStop(0.6,'#c58062'); head.addColorStop(1,'#704535');
      ctx.fillStyle=head;
      ctx.beginPath(); ctx.ellipse(0,-8,25,29,0,0,Math.PI*2); ctx.fill(); ctx.stroke();

      // Белые/серые пряди по бокам головы.
      ctx.fillStyle='#cbd3a1'; ctx.strokeStyle='#6c7d4e'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-23,-20); ctx.quadraticCurveTo(-31,-2,-25,18);
      ctx.lineTo(-18,24); ctx.lineTo(-16,-9); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(21,-21); ctx.quadraticCurveTo(31,-2,24,19);
      ctx.lineTo(17,24); ctx.lineTo(16,-9); ctx.closePath(); ctx.fill(); ctx.stroke();
      // Яркий зелёный ирокез, как на референсе.
      ctx.fillStyle='#6e9b35'; ctx.strokeStyle='#345226'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-17,-28); ctx.lineTo(-11,-43); ctx.lineTo(-4,-31);
      ctx.lineTo(2,-48); ctx.lineTo(7,-31); ctx.lineTo(16,-42); ctx.lineTo(18,-25);
      ctx.lineTo(8,-20); ctx.lineTo(-7,-21); ctx.closePath(); ctx.fill(); ctx.stroke();

      // Тяжёлые брови, нос и светящиеся глаза.
      ctx.fillStyle='#3e432c';
      ctx.beginPath(); ctx.ellipse(-9,-12,8,4,-0.18,0,Math.PI*2); ctx.ellipse(9,-12,8,4,0.18,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#485134'; ctx.lineWidth=3; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-3,-7); ctx.lineTo(-6,2); ctx.lineTo(3,3); ctx.stroke();
      ctx.shadowColor='#ecfff0'; ctx.shadowBlur=12; ctx.fillStyle='#efffe9';
      ctx.beginPath(); ctx.ellipse(-9,-8,4.2,3.2,0,0,Math.PI*2); ctx.ellipse(9,-8,4.2,3.2,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;

      // Огромная пасть с клыками.
      ctx.fillStyle='#2a1718'; ctx.strokeStyle='#472522'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(0,10,16,11,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#eee2b6'; ctx.strokeStyle='#8a6e52'; ctx.lineWidth=1;
      for(let i=-2;i<=2;i++){
        ctx.beginPath();
        ctx.moveTo(i*6-3,3); ctx.lineTo(i*6,9); ctx.lineTo(i*6+3,3); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i*6-3,17); ctx.lineTo(i*6,12); ctx.lineTo(i*6+3,17); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle='#8f3b37';
      ctx.beginPath(); ctx.ellipse(0,14,7,3,0,0,Math.PI*2); ctx.fill();
      ctx.lineCap='butt';
      ctx.restore();
    } else if(u.def.id==='illusionist'){
      /* Иллюзионист — холодный эльф-маг: синяя кожа,
         белые волосы и борода, острые уши и сияющие глаза. */
      const s = u.radius/24;
      ctx.save();
      ctx.scale(s,s);

      // Тёмная мантия и ледяно-фиолетовая аура.
      ctx.fillStyle='rgba(118,83,190,0.32)';
      ctx.shadowColor='#a96dff'; ctx.shadowBlur=18;
      ctx.beginPath(); ctx.ellipse(0,14,32,24,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='#1e2c49'; ctx.strokeStyle='#435b82'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-25,2); ctx.lineTo(-31,31); ctx.lineTo(0,38);
      ctx.lineTo(31,31); ctx.lineTo(25,2); ctx.closePath(); ctx.fill(); ctx.stroke();

      // Серебряные наплечники.
      ctx.fillStyle='#899bb2'; ctx.strokeStyle='#273c5d'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(-22,6,12,8,-0.35,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(22,6,12,8,0.35,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#d5e8ff'; ctx.lineWidth=1.2;
      ctx.beginPath(); ctx.arc(-22,6,7,0,Math.PI*2); ctx.arc(22,6,7,0,Math.PI*2); ctx.stroke();

      // Острые эльфийские уши.
      ctx.fillStyle='#5595b1'; ctx.strokeStyle='#244a65'; ctx.lineWidth=1.6;
      ctx.beginPath(); ctx.moveTo(-14,-12); ctx.lineTo(-34,-22); ctx.lineTo(-20,-2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(14,-12); ctx.lineTo(34,-22); ctx.lineTo(20,-2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(179,232,255,0.7)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-18,-12); ctx.lineTo(-28,-18); ctx.moveTo(18,-12); ctx.lineTo(28,-18); ctx.stroke();

      // Синее лицо с острыми скулами.
      const skin = ctx.createRadialGradient(-7,-17,2,0,-6,27);
      skin.addColorStop(0,'#a8e7f0'); skin.addColorStop(0.55,'#5caac2'); skin.addColorStop(1,'#285478');
      ctx.fillStyle=skin; ctx.strokeStyle='#193b5d'; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(-16,-19); ctx.quadraticCurveTo(0,-29,16,-19);
      ctx.lineTo(15,5); ctx.quadraticCurveTo(11,19,0,23);
      ctx.quadraticCurveTo(-11,19,-15,5); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='rgba(221,250,255,0.24)';
      ctx.beginPath(); ctx.moveTo(-13,-5); ctx.lineTo(-5,0); ctx.lineTo(-12,11); ctx.closePath(); ctx.fill();

      // Белые колючие волосы.
      ctx.fillStyle='#f0f4ee'; ctx.strokeStyle='#99aabb'; ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(-19,-16); ctx.lineTo(-25,-28); ctx.lineTo(-13,-25);
      ctx.lineTo(-11,-38); ctx.lineTo(-3,-28); ctx.lineTo(4,-41);
      ctx.lineTo(9,-28); ctx.lineTo(20,-34); ctx.lineTo(17,-19);
      ctx.lineTo(9,-12); ctx.lineTo(0,-20); ctx.lineTo(-9,-12); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle='#cad6d5';
      ctx.beginPath(); ctx.moveTo(-18,-12); ctx.quadraticCurveTo(-28,3,-19,19);
      ctx.lineTo(-12,23); ctx.lineTo(-12,-7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(18,-12); ctx.quadraticCurveTo(28,3,19,19);
      ctx.lineTo(12,23); ctx.lineTo(12,-7); ctx.closePath(); ctx.fill();

      // Брови, нос и длинная белая борода.
      ctx.strokeStyle='#24445e'; ctx.lineWidth=2.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-12,-10); ctx.lineTo(-3,-13); ctx.moveTo(3,-13); ctx.lineTo(12,-10);
      ctx.moveTo(0,-6); ctx.lineTo(-3,5); ctx.lineTo(3,6); ctx.stroke();
      ctx.fillStyle='#e9f2ec'; ctx.strokeStyle='#8c9ca5'; ctx.lineWidth=1.2;
      ctx.beginPath();
      ctx.moveTo(-12,4); ctx.quadraticCurveTo(-8,18,0,30);
      ctx.quadraticCurveTo(8,18,12,4); ctx.quadraticCurveTo(7,9,0,12);
      ctx.quadraticCurveTo(-7,9,-12,4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(102,124,139,0.75)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-7,9); ctx.lineTo(-3,24); ctx.moveTo(0,11); ctx.lineTo(0,28); ctx.moveTo(7,9); ctx.lineTo(3,24); ctx.stroke();

      // Сияющие глаза.
      ctx.shadowColor='#d9ffff'; ctx.shadowBlur=14; ctx.fillStyle='#efffff';
      ctx.beginPath(); ctx.ellipse(-8,-6,4,2.4,-0.12,0,Math.PI*2);
      ctx.ellipse(8,-6,4,2.4,0.12,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;

      // Кристалл на груди.
      ctx.fillStyle='#b875ff'; ctx.strokeStyle='#f0d7ff'; ctx.lineWidth=1.5;
      ctx.shadowColor='#b875ff'; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.moveTo(0,10); ctx.lineTo(6,18); ctx.lineTo(0,27);
      ctx.lineTo(-6,18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.shadowBlur=0; ctx.lineCap='butt';
      ctx.restore();
    }
    ctx.strokeStyle=u.def.color2; ctx.lineWidth=3; ctx.lineCap='round';
    if(u.def.id==='warlord'){
      // Длинное копьё, читающееся даже на маленьком масштабе.
      ctx.strokeStyle='#5a3827'; ctx.lineWidth=4;
      ctx.beginPath(); ctx.moveTo(-13,22); ctx.lineTo(24,-35); ctx.stroke();
      ctx.strokeStyle='#d9dde0'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(24,-35); ctx.lineTo(20,-25); ctx.lineTo(27,-28); ctx.closePath(); ctx.stroke();
    } else if(u.def.id==='malit'){
      ctx.beginPath(); ctx.moveTo(5,-4); ctx.lineTo(u.radius*1.65,-u.radius*1.35); ctx.stroke();
      ctx.strokeStyle='#f6e5b0'; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(u.radius*1.45,-u.radius*1.15); ctx.lineTo(u.radius*1.85,-u.radius*1.55); ctx.stroke();
    } else if(u.def.id==='pyro' || u.def.id==='golly' || u.def.id==='grisha'){
      ctx.strokeStyle=u.def.color2; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(7,5); ctx.lineTo(7+u.radius*1.25,5-u.radius*1.45); ctx.stroke();
      ctx.fillStyle=u.def.color2; ctx.beginPath(); ctx.arc(7+u.radius*1.25,5-u.radius*1.45,5,0,Math.PI*2); ctx.fill();
    } else if(u.def.id==='ilya'){
      ctx.strokeStyle='#5a3b2b'; ctx.lineWidth=5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(7,7); ctx.lineTo(u.radius*1.55,-u.radius*1.15); ctx.stroke();
      ctx.strokeStyle='#d9d0ae'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(u.radius*1.62,-u.radius*1.38,10,-0.25,Math.PI*0.95); ctx.stroke();
      ctx.fillStyle='#d56a55'; ctx.beginPath(); ctx.arc(u.radius*1.62,-u.radius*1.38,3,0,Math.PI*2); ctx.fill();
    } else if(u.def.id==='illusionist'){
      ctx.strokeStyle='#6d4b9f'; ctx.lineWidth=4; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(7,7); ctx.lineTo(u.radius*1.45,-u.radius*1.35); ctx.stroke();
      ctx.strokeStyle='#e5d5ff'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(u.radius*1.5,-u.radius*1.45,7,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='#b875ff'; ctx.shadowColor='#b875ff'; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.arc(u.radius*1.5,-u.radius*1.45,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    } else if(u.def.id==='shadow'){
       ctx.strokeStyle='#ff3b1f'; ctx.lineWidth=4; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(7,7); ctx.lineTo(u.radius*1.45,-u.radius*1.35); ctx.stroke();
       ctx.fillStyle='#ff9a3d'; ctx.shadowColor='#ff3b1f'; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.arc(u.radius*1.5,-u.radius*1.45,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    } else if(u.def.id==='electricGosha'){
      ctx.strokeStyle='#263b60'; ctx.lineWidth=4; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(8,8); ctx.lineTo(u.radius*1.35,-u.radius*1.65); ctx.stroke();
      ctx.strokeStyle='#72f5ff'; ctx.lineWidth=2; ctx.shadowColor='#72f5ff'; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.moveTo(u.radius*1.35,-u.radius*1.65); ctx.lineTo(u.radius*1.2,-u.radius*1.95); ctx.lineTo(u.radius*1.55,-u.radius*2.08); ctx.stroke(); ctx.shadowBlur=0;
    } else if(u.def.id==='mo3gi'){
      // Компактный карабин и зелёный лазерный целеуказатель.
      ctx.strokeStyle='#151d18'; ctx.lineWidth=6; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(7,8); ctx.lineTo(u.radius*1.1,-u.radius*0.55); ctx.stroke();
      ctx.strokeStyle='#778b73'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(u.radius*0.95,-u.radius*0.62); ctx.lineTo(u.radius*1.85,-u.radius*1.22); ctx.stroke();
      ctx.fillStyle='#7dffb0'; ctx.shadowColor='#7dffb0'; ctx.shadowBlur=9;
      ctx.beginPath(); ctx.arc(u.radius*1.9,-u.radius*1.26,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.strokeStyle='#b3c9a6'; ctx.lineWidth=2; ctx.beginPath();
      ctx.moveTo(u.radius*0.5,0); ctx.lineTo(u.radius*0.9,8); ctx.stroke();
    } else if(u.def.id==='arcady'){
      // Компактный огненный карабин Аркадия.
      ctx.strokeStyle='#3a2223'; ctx.lineWidth=6; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(5,6); ctx.lineTo(u.radius*1.15,-u.radius*0.4); ctx.stroke();
      ctx.strokeStyle='#d98648'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(u.radius*0.95,-u.radius*0.45); ctx.lineTo(u.radius*1.95,-u.radius*1.05); ctx.stroke();
      ctx.fillStyle='#ffb34d'; ctx.shadowColor='#ff5a24'; ctx.shadowBlur=13;
      ctx.beginPath(); ctx.arc(u.radius*2,-u.radius*1.08,4+Math.sin(gameTime*10)*1.2,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    } else if(u.def.id==='sasych'){
      ctx.strokeStyle='#d9a0aa'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(5,3); ctx.lineTo(u.radius*1.55,10); ctx.stroke();
      ctx.fillStyle='#d9a0aa'; ctx.beginPath(); ctx.moveTo(u.radius*1.55,10); ctx.lineTo(u.radius*1.95,5); ctx.lineTo(u.radius*1.8,16); ctx.closePath(); ctx.fill();
    } else if(u.def.id==='juvsyut'){
      ctx.strokeStyle='#70462f'; ctx.lineWidth=7; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(7,7); ctx.lineTo(u.radius*1.75,-u.radius*1.2); ctx.stroke();
      ctx.fillStyle='#d7a56a'; ctx.strokeStyle='#f1ca88'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(u.radius*1.84,-u.radius*1.3,13,7,-0.7,0,Math.PI*2); ctx.fill(); ctx.stroke();
    } else if(u.def.id==='chip'){
      ctx.strokeStyle='#704f29'; ctx.lineWidth=4; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(8,6); ctx.lineTo(u.radius*1.55,-u.radius*1.35); ctx.stroke();
      ctx.strokeStyle='#ffd568'; ctx.lineWidth=3; ctx.shadowColor='#ffd568'; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.arc(u.radius*1.58,-u.radius*1.42,8,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0;
      ctx.fillStyle='#fff0a8'; ctx.beginPath(); ctx.arc(u.radius*1.58,-u.radius*1.42,3,0,Math.PI*2); ctx.fill();
    } else if(u.def.id!=='arcady') {
      ctx.strokeStyle=u.def.color2; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(7,4); ctx.lineTo(u.radius*1.45,-u.radius*0.5); ctx.stroke();
    }
    ctx.lineCap='butt';

    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(u.facing)*u.radius*0.4, Math.sin(u.facing)*u.radius*0.4);
    ctx.lineTo(Math.cos(u.facing)*u.radius*1.35, Math.sin(u.facing)*u.radius*1.35);
    ctx.stroke();

    if(u.def.id === 'grisha' && u.orbs){
      for(let i=0;i<3;i++){
        const a = -Math.PI/2 + (i-1)*0.6;
        const ox = Math.cos(a)*u.radius*1.6;
        const oy = Math.sin(a)*u.radius*1.6;
        const orb = u.orbs[i];
        const ocol = orb==='Q' ? '#7feaff' : orb==='W' ? '#c8b3ff' : '#ff9955';
        ctx.fillStyle = ocol;
        ctx.beginPath(); ctx.arc(ox, oy, 6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }

    if(u.isPlayer){
      ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0,0,u.radius+9 + Math.sin(gameTime*4)*2,0,Math.PI*2);
      ctx.stroke();
    }
    if(u.hpRegenBoost && (u.hp < u.maxHp || u.mp < u.maxMp)){
      ctx.strokeStyle = 'rgba(120,255,140,0.8)';
      ctx.lineWidth = 2; ctx.setLineDash([6,4]);
      ctx.beginPath(); ctx.arc(0,0,u.radius+16,0,Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
    }
    if(u.def.id==='mo3gi'){
      ctx.save();
      const s=u.radius/24;
      ctx.scale(s,s);
      ctx.fillStyle='#183026'; ctx.strokeStyle='#7dffb0'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.ellipse(0,15,29,25,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#536b57'; ctx.strokeStyle='#b4d3b8'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-24,-2); ctx.lineTo(-29,15); ctx.lineTo(-18,21); ctx.lineTo(18,21);
      ctx.lineTo(29,15); ctx.lineTo(24,-2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#384d40'; ctx.fillRect(-16,2,32,5);
      ctx.fillStyle='#cfaa7a'; ctx.strokeStyle='#26362c'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(0,-13,14,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#33483b'; ctx.beginPath(); ctx.arc(0,-20,18,Math.PI,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#7dffb0'; ctx.shadowColor='#7dffb0'; ctx.shadowBlur=9;
      ctx.beginPath(); ctx.arc(-6,-14,3,0,Math.PI*2); ctx.arc(6,-14,3,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      ctx.strokeStyle='#b9d3ba'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(8,5); ctx.lineTo(29,-12); ctx.stroke();
      ctx.strokeStyle='#7dffb0'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(28,-13); ctx.lineTo(38,-20); ctx.stroke();
      if(u.bikeTimer>0){
        ctx.strokeStyle='#65ff9a'; ctx.shadowColor='#65ff9a'; ctx.shadowBlur=18; ctx.lineWidth=4;
        ctx.beginPath(); ctx.arc(0,10,39+Math.sin(gameTime*9)*3,0,Math.PI*2); ctx.stroke(); ctx.shadowBlur=0;
        ctx.strokeStyle='#b9ffd0'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(-18,32,10,0,Math.PI*2); ctx.arc(18,32,10,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
    }
  } else if(u.type === 'summon') {
    if(u.summonKind === 'mo3giDrone'){
      const pulse=1+Math.sin((u.dronePulse||0)*8)*0.08;
      ctx.rotate(u.facing||0);
      ctx.shadowColor='#65ff9a'; ctx.shadowBlur=24;
      ctx.fillStyle='#284e3a'; ctx.strokeStyle='#b9ffd0'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(-24,0); ctx.lineTo(-10,-13); ctx.lineTo(17,-13);
      ctx.lineTo(27,0); ctx.lineTo(17,13); ctx.lineTo(-10,13); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#75ffae'; ctx.beginPath(); ctx.arc(4,0,7*pulse,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#baffd0'; ctx.fillRect(-31,-4,7,8); ctx.fillRect(24,-4,7,8);
      ctx.strokeStyle='#65ff9a'; ctx.lineWidth=2; ctx.beginPath();
      ctx.moveTo(-10,-13); ctx.lineTo(-15,-24); ctx.moveTo(12,-13); ctx.lineTo(17,-24);
      ctx.moveTo(-10,13); ctx.lineTo(-15,24); ctx.moveTo(12,13); ctx.lineTo(17,24); ctx.stroke();
      ctx.shadowBlur=0;
    } else if(u.summonKind === 'electricRemnant'){
      const pulse=1+Math.sin((u.remnantPulse||0)*6)*0.12;
      ctx.shadowColor='#65eaff'; ctx.shadowBlur=22;
      ctx.fillStyle='rgba(20,116,176,0.78)'; ctx.strokeStyle='#c4fbff'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.arc(0,0,u.radius*pulse,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#dfffff'; ctx.beginPath(); ctx.arc(-5,-5,5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#65eaff'; ctx.lineWidth=2; ctx.beginPath();
      ctx.moveTo(-u.radius-8,0); ctx.lineTo(-u.radius-18,-8); ctx.lineTo(-u.radius-12,-16);
      ctx.moveTo(u.radius+8,0); ctx.lineTo(u.radius+18,8); ctx.lineTo(u.radius+12,16); ctx.stroke();
      ctx.shadowBlur=0;
    } else if(u.summonKind === 'steelCopy' && u.copyDef){
      const copyGrad=ctx.createRadialGradient(-6,-8,4,0,0,u.radius);
      copyGrad.addColorStop(0,u.copyDef.color2); copyGrad.addColorStop(1,u.copyDef.color);
      ctx.fillStyle=copyGrad;
    } else ctx.fillStyle = u.copyColor || (u.summonKind === 'iceGolem' ? '#8eeaff' : (u.summonKind === 'healingWard' ? '#58bd72' : '#d9e6f5'));
    ctx.strokeStyle = u.summonKind === 'iceGolem' ? '#d9fbff' : (u.summonKind === 'healingWard' ? '#b9ffc0' : '#ffffff');
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0,0,u.radius,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(-u.radius*0.28,-u.radius*0.25,u.radius*0.22,0,Math.PI*2); ctx.fill();
    if(u.summonKind === 'healingWard'){
      ctx.save();
      ctx.strokeStyle='#8dff9d'; ctx.shadowColor='#8dff9d'; ctx.shadowBlur=18; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(0,-u.radius); ctx.lineTo(0,-u.radius-35); ctx.stroke();
      ctx.fillStyle='#b9ffc0'; ctx.strokeStyle='#4f9b62'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(0,-u.radius-49); ctx.lineTo(12,-u.radius-36);
      ctx.lineTo(0,-u.radius-23); ctx.lineTo(-12,-u.radius-36); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#eaffdc'; ctx.beginPath(); ctx.arc(0,-u.radius-36,4+Math.sin(gameTime*7),0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0; ctx.restore();
    }
  } else if(u.type === 'creep'){
    drawForestCreepBody(u, col);
  } else {
    ctx.fillStyle = u.type === 'neutral'
      ? (u.kind === 'wolf' ? '#b9c7d8' : (u.kind === 'satyr' ? '#b57a4b' : '#6d4c41'))
      : (u.ranged ? '#8d6e63' : '#6d4c41');
    ctx.beginPath(); ctx.arc(0,0,u.radius,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(0,0,u.radius*0.42,0,Math.PI*2); ctx.fill();
  }

  drawUnitWeapon(u);
  if(u.hitFlash > 0){
    ctx.globalAlpha = u.hitFlash*4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(0,0,u.radius+3,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if(u.slowT > 0 && u.type === 'hero'){
    ctx.strokeStyle = 'rgba(120,200,255,0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0,0,u.radius+6,0,Math.PI*2); ctx.stroke();
  }
  if(u.buffs && u.buffs.some(buff => buff.type === 'burning')){
    ctx.strokeStyle = 'rgba(255,104,45,0.9)'; ctx.lineWidth = 3;
    ctx.shadowColor = '#ff5a24'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(0,0,u.radius+8+Math.sin(gameTime*12)*2,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
  if(u.bkbActive > 0){
    ctx.save();
    ctx.strokeStyle = '#ffe34d';
    ctx.shadowColor = '#ffd21f';
    ctx.shadowBlur = 22;
    ctx.globalAlpha = 0.75 + Math.sin(gameTime*10)*0.2;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(u.x,u.y,u.radius+18+Math.sin(gameTime*7)*3,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  if(!portraitRenderMode) drawHealthBar(u);
  if(u.type === 'hero' && !portraitRenderMode){
    ctx.save();
    ctx.textAlign='center'; ctx.font='bold 12px Segoe UI, Arial';
    ctx.fillStyle=u.team===0 ? '#a8ffb0' : '#ffb0a8';
    ctx.strokeStyle='rgba(0,0,0,0.85)'; ctx.lineWidth=3;
    ctx.strokeText('Ур. ' + u.level, u.x, u.y - u.radius - 38);
    ctx.fillText('Ур. ' + u.level, u.x, u.y - u.radius - 38);
    ctx.font='bold 10px Segoe UI, Arial';
    ctx.fillStyle='rgba(255,239,184,0.9)';
    const roleLabel = gameTime >= MID_PUSH_TIME ? 'МИД • PUSH' : LANE_NAMES[u.assignedLane || 0];
    ctx.strokeText(roleLabel, u.x, u.y - u.radius - 50);
    ctx.fillText(roleLabel, u.x, u.y - u.radius - 50);
    ctx.restore();
  }
}

function drawHealthBar(u){
  const w = u.type==='hero' ? 68 : (u.type==='ancient' ? 130 : 46);
  const h = u.type==='hero' ? 8 : 6;
  const x = u.x - w/2;
  const y = u.y - u.radius - (u.type==='hero' ? 26 : 18);

  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(x-2, y-2, w+4, h+4);
  const pct = clamp(u.hp/u.maxHp, 0, 1);
  ctx.fillStyle = u.team===0 ? '#3ddc60' : '#e2483f';
  ctx.fillRect(x, y, w*pct, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x-2, y-2, w+4, h+4);

  if(u.type === 'hero'){
    const mpct = clamp(u.mp/u.maxMp, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(x-2, y+h+1, w+4, 7);
    ctx.fillStyle = '#3d8bff';
    ctx.fillRect(x, y+h+3, w*mpct, 3);
  }
}

function drawWorldObjects(){
  for(const gb of grassBends){
    const k = gb.t/gb.life;
    const pressAmt = k < 0.15 ? k/0.15 : Math.max(0, 1 - (k-0.15)/0.85);
    if(pressAmt <= 0.01) continue;
    ctx.save();
    ctx.translate(gb.x, gb.y);
    ctx.rotate(gb.angle);
    ctx.globalAlpha = 0.5*pressAmt;
    ctx.strokeStyle = '#3f6b34';
    ctx.lineWidth = 1.6;
    for(let i=-1;i<=1;i++){
      const off = i*4*gb.spread;
      const lean = 7*pressAmt*gb.spread;
      ctx.beginPath();
      ctx.moveTo(off, 3);
      ctx.quadraticCurveTo(off+lean*0.6, 0, off+lean, -2+i*0.6);
      ctx.stroke();
    }
    ctx.restore();
  }
  for(const rune of runes){
    ctx.save();
    ctx.globalAlpha=0.8+Math.sin(rune.pulse*5)*0.2;
    ctx.fillStyle=rune.color; ctx.shadowColor=rune.color; ctx.shadowBlur=22;
    ctx.beginPath(); ctx.arc(rune.x,rune.y,18+Math.sin(rune.pulse*4)*3,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#ffffff'; ctx.font='bold 10px Segoe UI, Arial'; ctx.textAlign='center'; ctx.fillText('R',rune.x,rune.y+4);
    ctx.restore();
  }
  for(const mine of mo3giMines){
    if(mine.owner.team!==0) continue;
    ctx.save(); ctx.translate(mine.x,mine.y);
    ctx.globalAlpha=0.72+Math.sin(gameTime*7+mine.x)*0.18;
    ctx.fillStyle='#87d957'; ctx.shadowColor='#a5ff62'; ctx.shadowBlur=14;
    ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#e1ffb0'; ctx.lineWidth=2; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14,0); ctx.lineTo(14,0); ctx.moveTo(0,-14); ctx.lineTo(0,14); ctx.stroke();
    ctx.restore();
  }
  for(const wall of walls){
    ctx.save(); ctx.translate(wall.x,wall.y); ctx.rotate(wall.angle);
    if(wall.style === 'fissure'){
      const fade = Math.min(1, (wall.life - wall.t) / 0.6);
      ctx.globalAlpha = Math.max(0.35, fade);
      const rockGrad = ctx.createLinearGradient(0,-wall.width/2,0,wall.width/2);
      rockGrad.addColorStop(0,'#8a6f4d'); rockGrad.addColorStop(0.5,'#5b4630'); rockGrad.addColorStop(1,'#3c2f1f');
      ctx.fillStyle = rockGrad; ctx.shadowBlur=16; ctx.shadowColor='#3c2f1f';
      ctx.fillRect(-wall.length/2,-wall.width/2,wall.length,wall.width);
      ctx.shadowBlur=0;
      ctx.strokeStyle='#2a2015'; ctx.lineWidth=3; ctx.strokeRect(-wall.length/2,-wall.width/2,wall.length,wall.width);
      ctx.strokeStyle='#8bd4ff'; ctx.globalAlpha=Math.max(0.25,fade*0.6); ctx.lineWidth=2;
      const cracks = Math.max(4, Math.round(wall.length/60));
      for(let i=0;i<cracks;i++){
        const cx = -wall.length/2 + (i+0.5)*(wall.length/cracks);
        ctx.beginPath();
        ctx.moveTo(cx, -wall.width/2);
        ctx.lineTo(cx + (i%2?6:-6), 0);
        ctx.lineTo(cx, wall.width/2);
        ctx.stroke();
      }
      ctx.globalAlpha=1;
    } else {
      ctx.fillStyle='rgba(160,224,255,0.82)'; ctx.shadowBlur=18; ctx.shadowColor='#a0e0ff';
      ctx.fillRect(-wall.length/2,-wall.width/2,wall.length,wall.width);
      ctx.strokeStyle='#e8fbff'; ctx.lineWidth=3; ctx.strokeRect(-wall.length/2,-wall.width/2,wall.length,wall.width);
    }
    ctx.restore();
  }
  const list = units.slice().sort((a,b) => a.y-b.y);
  for(const u of list) drawUnitSafely(u);

  for(const p of projectiles){
    ctx.save();
    ctx.shadowBlur = 14; ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    const projectileAngle = Number.isFinite(p.dirX)
      ? Math.atan2(p.dirY,p.dirX)
      : (p.target ? Math.atan2(p.target.y-p.y,p.target.x-p.x) : 0);
    const trailLength = Math.max(18, p.radius * (p.isSpell ? 4.8 : 3.4));
    const trailStartX = Number.isFinite(p.prevX) ? p.prevX : p.x - Math.cos(projectileAngle)*trailLength;
    const trailStartY = Number.isFinite(p.prevY) ? p.prevY : p.y - Math.sin(projectileAngle)*trailLength;
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(2, p.radius * (p.isSpell ? 1.15 : 0.8));
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(trailStartX, trailStartY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.color;
    if(p.assassinate){
      const angle = p.target ? Math.atan2(p.target.y-p.y,p.target.x-p.x) : 0;
      ctx.translate(p.x,p.y);
      ctx.rotate(angle);
      ctx.shadowBlur = 28;
      ctx.shadowColor = '#fff0a8';
      ctx.fillStyle = '#fff8cf';
      ctx.beginPath();
      ctx.moveTo(28,0); ctx.lineTo(4,-13); ctx.lineTo(-32,-9);
      ctx.lineTo(-46,0); ctx.lineTo(-32,9); ctx.lineTo(4,13); ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd35e';
      ctx.beginPath(); ctx.ellipse(-12,0,17,7,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-55,0); ctx.lineTo(-25,0); ctx.stroke();
    } else if(p.kind==='tornado'){
      ctx.beginPath(); ctx.moveTo(p.x,p.y-p.radius*1.8); ctx.lineTo(p.x-p.radius,p.y+p.radius); ctx.lineTo(p.x+p.radius,p.y+p.radius); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#f2fbff'; ctx.lineWidth=3; ctx.stroke();
    } else if(p.kind==='meteor'){
      ctx.beginPath(); ctx.arc(p.x,p.y,p.radius,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ffd08a'; ctx.beginPath(); ctx.arc(p.x-p.radius*0.3,p.y-p.radius*0.3,p.radius*0.28,0,Math.PI*2); ctx.fill();
    } else if(p.kind==='shadowSoul'){
      ctx.translate(p.x,p.y);
      ctx.rotate((p.soulAngle || 0) + gameTime*5);
      ctx.fillStyle='#ff3b1f';
      ctx.beginPath(); ctx.moveTo(0,-p.radius*1.8); ctx.lineTo(p.radius,p.radius); ctx.lineTo(0,p.radius*0.45); ctx.lineTo(-p.radius,p.radius); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#ffcf79'; ctx.beginPath(); ctx.arc(0,0,p.radius*0.35,0,Math.PI*2); ctx.fill();
    } else if(p.kind==='dynamite'){
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(Math.atan2(p.dirY,p.dirX));
      ctx.fillStyle='#c84b32'; ctx.fillRect(-18,-7,36,14);
      ctx.fillStyle='#ffd08a'; ctx.fillRect(-12,-4,4,8); ctx.fillRect(4,-4,4,8);
      ctx.strokeStyle='#fff0a8'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(26,-8); ctx.stroke();
      ctx.restore();
    } else if(drawThemedProjectile(p)){
      /* Тематическая модель снаряда уже отрисована */
    } else {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  for(const f of fxs){
    const k = f.t/f.life;
    ctx.save();
    if(f.type === 'ring'){
      ctx.globalAlpha = 1-k;
      ctx.strokeStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 8*(1-k)+1;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r*(0.4+k*0.9), 0, Math.PI*2); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = (1-k)*0.65;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r*(0.58+k*0.72), -gameTime*3, Math.PI*0.75-gameTime*3); ctx.stroke();
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r*(0.58+k*0.72), Math.PI+0.2-gameTime*3, Math.PI*1.55-gameTime*3); ctx.stroke();
      if(f.r >= 120){
        ctx.globalAlpha = (1-k)*0.16;
        ctx.fillStyle = f.color;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r*(0.2+k*0.72), 0, Math.PI*2); ctx.fill();
      }
    } else if(f.type === 'skillBurst'){
      ctx.globalAlpha = (1-k) * 0.9;
      ctx.translate(f.x,f.y);
      ctx.rotate(gameTime*3.5);
      ctx.strokeStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 24;
      ctx.lineWidth = 4*(1-k) + 1;
      ctx.beginPath();
      ctx.arc(0,0,f.r*(0.45+k*0.72),-0.65,0.65);
      ctx.stroke();
      ctx.rotate(Math.PI);
      ctx.beginPath();
      ctx.arc(0,0,f.r*(0.45+k*0.72),-0.65,0.65);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      for(let i=0;i<f.spokes;i++){
        const a = i*Math.PI*2/f.spokes;
        const inner = f.r*(0.52+k*0.28);
        const outer = f.r*(0.72+k*0.5);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*inner,Math.sin(a)*inner);
        ctx.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);
        ctx.stroke();
      }
      const glyphRadius = f.r*(0.18 + (1-k)*0.2);
      ctx.globalAlpha = (1-k)*0.95;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 18;
      if(f.heroId === 'pyro' || f.heroId === 'arcady'){
        ctx.fillStyle = '#fff1a8';
        for(let i=0;i<5;i++){
          const a = i*Math.PI*2/5 + gameTime*3;
          ctx.save(); ctx.rotate(a);
          ctx.beginPath(); ctx.moveTo(glyphRadius*2.8,0); ctx.quadraticCurveTo(glyphRadius*0.5,-glyphRadius*1.8,-glyphRadius*1.6,0); ctx.quadraticCurveTo(glyphRadius*0.5,glyphRadius*1.8,glyphRadius*2.8,0); ctx.fill(); ctx.restore();
        }
      } else if(f.heroId === 'golly'){
        ctx.fillStyle = '#dffaff';
        ctx.beginPath(); ctx.moveTo(glyphRadius*2.6,0); ctx.lineTo(0,-glyphRadius*1.7); ctx.lineTo(-glyphRadius*1.5,0); ctx.lineTo(0,glyphRadius*1.7); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      } else if(f.heroId === 'electricGosha'){
        ctx.strokeStyle = '#e8ffff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-glyphRadius*2.8,0); ctx.lineTo(-glyphRadius*1.1,-glyphRadius*1.3); ctx.lineTo(-glyphRadius*0.2,glyphRadius*0.6); ctx.lineTo(glyphRadius*1.1,-glyphRadius*1.5); ctx.lineTo(glyphRadius*2.8,0); ctx.stroke();
      } else if(f.heroId === 'shadow' || f.heroId === 'sasych'){
        ctx.fillStyle = f.heroId === 'shadow' ? '#ff3b1f' : '#ff6680';
        ctx.beginPath(); ctx.moveTo(glyphRadius*2.6,0); ctx.bezierCurveTo(glyphRadius*0.5,-glyphRadius*1.8,-glyphRadius*1.7,-glyphRadius*1.1,-glyphRadius*1.6,0); ctx.bezierCurveTo(-glyphRadius*1.7,glyphRadius*1.1,glyphRadius*0.5,glyphRadius*1.8,glyphRadius*2.6,0); ctx.fill();
      } else if(f.heroId === 'illusionist'){
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2;
        for(let i=0;i<3;i++){ ctx.save(); ctx.rotate(i*Math.PI/3 + gameTime*2); ctx.strokeRect(-glyphRadius*1.4,-glyphRadius*1.4,glyphRadius*2.8,glyphRadius*2.8); ctx.restore(); }
      } else if(f.heroId === 'sniper'){
        ctx.strokeStyle = '#fff4c2'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0,0,glyphRadius*1.6,0,Math.PI*2); ctx.moveTo(-glyphRadius*2.5,0); ctx.lineTo(glyphRadius*2.5,0); ctx.moveTo(0,-glyphRadius*2.5); ctx.lineTo(0,glyphRadius*2.5); ctx.stroke();
      } else if(f.heroId === 'chip'){
        ctx.fillStyle = '#fff1a8';
        ctx.beginPath(); ctx.moveTo(-glyphRadius*2.2,glyphRadius*0.8); ctx.lineTo(-glyphRadius*1.1,-glyphRadius*1.6); ctx.lineTo(0,-glyphRadius*0.7); ctx.lineTo(glyphRadius*1.1,-glyphRadius*1.6); ctx.lineTo(glyphRadius*2.2,glyphRadius*0.8); ctx.closePath(); ctx.fill();
      } else if(['warlord','juggernaut','mageHunter','regina','exileKnight'].includes(f.heroId)){
        ctx.strokeStyle = '#fff4cf'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0,0,glyphRadius*2.2,-1.05,0.45); ctx.stroke();
        ctx.beginPath(); ctx.arc(0,0,glyphRadius*2.2,Math.PI-0.45,Math.PI+1.05); ctx.stroke();
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0,0,glyphRadius*0.95,0,Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    } else if(f.type === 'mark'){
      ctx.globalAlpha = 0.22 + Math.sin(f.t*22)*0.12;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = f.color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 0.7;
      ctx.setLineDash([18, 12]);
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r*(1-f.t/f.life), -gameTime*2, Math.PI*2-gameTime*2); ctx.stroke();
      ctx.setLineDash([]);
    } else if(f.type === 'beam'){
      /* ЛУЧ */
      ctx.globalAlpha = 1-k;
      ctx.shadowBlur = 30;
      ctx.shadowColor = f.color;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 18*(1-k*0.6);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(f.x1, f.y1);
      ctx.lineTo(f.x2, f.y2);
      ctx.stroke();

      /* Яркая сердцевина */
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6*(1-k*0.6);
      ctx.beginPath();
      ctx.moveTo(f.x1, f.y1);
      ctx.lineTo(f.x2, f.y2);
      ctx.stroke();
    } else if(f.type === 'malitLaser'){
      ctx.globalAlpha = 1-k;
      ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(f.t*18 + f.phase*Math.PI);
      ctx.shadowBlur=30; ctx.shadowColor=f.color; ctx.strokeStyle=f.color; ctx.lineWidth=16;
      ctx.beginPath(); ctx.arc(0,0,f.r*(0.9+k*0.16),0,Math.PI*2); ctx.stroke();
      ctx.shadowBlur=0;
      ctx.strokeStyle='#fff7cf'; ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(0,0,f.r*(0.9+k*0.16),0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha *= 0.85;
      ctx.strokeStyle='#ffc857'; ctx.lineWidth=3;
      for(let i=0;i<18;i++){
        const a=i*Math.PI*2/18;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a)*f.r*0.58,Math.sin(a)*f.r*0.58);
        ctx.lineTo(Math.cos(a)*f.r*(0.86+0.1*Math.sin(f.t*20+i)),Math.sin(a)*f.r*(0.86+0.1*Math.sin(f.t*20+i)));
        ctx.stroke();
      }
      ctx.restore();
    } else if(f.type === 'hit'){
      ctx.globalAlpha = 1-k;
      const pulse = f.r*(0.45+k*1.9);
      ctx.strokeStyle = f.color;
      ctx.shadowColor = f.color;
      ctx.shadowBlur = 20;
      ctx.lineWidth = 5*(1-k)+1;
      ctx.beginPath();
      ctx.arc(f.x,f.y,pulse,0,Math.PI*2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff8df';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(f.x,f.y,pulse*0.55,-gameTime*8,Math.PI*1.2-gameTime*8);
      ctx.stroke();
      for(let i=0;i<6;i++){
        const a = i*Math.PI/3 + gameTime*4;
        const inner = pulse*0.7;
        const outer = pulse*(1.35 + (i%2)*0.22);
        ctx.beginPath();
        ctx.moveTo(f.x+Math.cos(a)*inner,f.y+Math.sin(a)*inner);
        ctx.lineTo(f.x+Math.cos(a)*outer,f.y+Math.sin(a)*outer);
        ctx.stroke();
      }
    } else if(f.type === 'groundCrack'){
      ctx.translate(f.x,f.y);
      const fadeIn = Math.min(1, f.t/0.12);
      const fadeOut = 1 - Math.max(0, (f.t - f.life*0.5)/(f.life*0.5));
      const alpha = Math.max(0, Math.min(fadeIn, fadeOut));
      /* Тлеющее выжженное пятно земли */
      ctx.globalAlpha = alpha*0.6;
      const scorchGrad = ctx.createRadialGradient(0,0,0,0,0,f.r);
      scorchGrad.addColorStop(0,'rgba(255,214,64,0.9)');
      scorchGrad.addColorStop(0.45,'rgba(255,150,20,0.45)');
      scorchGrad.addColorStop(0.8,'rgba(90,40,10,0.22)');
      scorchGrad.addColorStop(1,'rgba(40,20,5,0)');
      ctx.fillStyle = scorchGrad;
      ctx.beginPath(); ctx.arc(0,0,f.r,0,Math.PI*2); ctx.fill();
      /* Светящиеся трещины расходятся от центра */
      ctx.globalAlpha = alpha;
      ctx.shadowColor = f.color; ctx.shadowBlur = 16;
      ctx.strokeStyle = f.color; ctx.lineWidth = 5;
      ctx.lineJoin = 'round';
      for(const crack of f.cracks){
        ctx.beginPath(); ctx.moveTo(0,0);
        for(const p of crack) ctx.lineTo(p.x,p.y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff3b0'; ctx.lineWidth = 1.8;
      for(const crack of f.cracks){
        ctx.beginPath(); ctx.moveTo(0,0);
        for(const p of crack) ctx.lineTo(p.x,p.y);
        ctx.stroke();
      }
    } else {
      ctx.globalAlpha = 1-k;
      ctx.fillStyle = f.color;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r*(1-k*0.5), 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  for(const p of particles){
    const k = p.t/p.life;
    ctx.save();
    ctx.globalAlpha = (1-k)*0.9;
    ctx.fillStyle = p.color;
    ctx.strokeStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = p.spark ? 12 : 5;
    if(p.blade){
      ctx.translate(p.x,p.y);
      ctx.rotate(p.angle + Math.PI/2);
      ctx.beginPath();
      ctx.moveTo(0,-p.size*1.8);
      ctx.lineTo(p.size*0.55,p.size);
      ctx.lineTo(-p.size*0.55,p.size);
      ctx.closePath();
      ctx.fill();
    } else if(p.spark){
      ctx.lineWidth = Math.max(1,p.size*0.55);
      ctx.beginPath();
      ctx.moveTo(p.x-p.vx*0.025,p.y-p.vy*0.025);
      ctx.lineTo(p.x+p.vx*0.01,p.y+p.vy*0.01);
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size*(1-k*0.5),0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  for(const t of texts){
    const a = 1-t.t/t.life;
    ctx.save();
    ctx.globalAlpha = clamp(a,0,1);
    ctx.font = 'bold ' + t.size + 'px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText(t.str, t.x, t.y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.str, t.x, t.y);
    ctx.restore();
  }
}

function drawMinimap(){
  const S = Math.round(190 * 1.12), pad = 14;
  const x0 = VW-S-pad, y0 = VH-S-pad;
  const k = S/WORLD;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#0a1206';
  ctx.fillRect(x0, y0, S, S);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2; ctx.strokeRect(x0, y0, S, S);
  ctx.strokeStyle = 'rgba(160,140,90,0.45)';
  ctx.lineWidth = 4;
  for(const lane of LANES){
    ctx.beginPath();
    ctx.moveTo(x0+lane[0].x*k, y0+lane[0].y*k);
    for(let i=1;i<lane.length;i++) ctx.lineTo(x0+lane[i].x*k, y0+lane[i].y*k);
    ctx.stroke();
  }
  for(const u of units){
    if(u.dead) continue;
    if(u.team !== 0 && !isVisibleToPlayer(u)) continue;
    const px = x0+u.x*k, py = y0+u.y*k;
    if(u.type === 'hero'){
      ctx.fillStyle = u.isPlayer ? '#ffe066' : TEAM_COL[u.team];
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    } else if(u.type === 'ancient'){
      ctx.fillStyle = TEAM_COL[u.team];
      ctx.fillRect(px-5, py-5, 10, 10);
    } else if(u.type === 'tower'){
      ctx.fillStyle = TEAM_COL[u.team];
      ctx.fillRect(px-3, py-3, 6, 6);
    } else {
      ctx.fillStyle = TEAM_COL[u.team];
      ctx.fillRect(px-1.5, py-1.5, 3, 3);
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x0 + (cam.x-VW/2)*k, y0 + (cam.y-VH/2)*k, VW*k, VH*k);
  ctx.restore();
}

const SKILL_BAR = { w: 76, h: 76, gap: 12 };

function combatHudLayout(){
  const margin = 14;
  const bottom = 14;
  const panelH = 140;
  const compact = VW < 980;
  const statsW = compact ? 190 : 250;
  const itemSize = compact ? 44 : 50;
  const itemGap = compact ? 5 : 8;
  const skillSize = compact ? 60 : SKILL_BAR.w;
  const skillGap = compact ? 7 : SKILL_BAR.gap;
  const skillCount = (playerHero && playerHero.skills.length) || 4;
  const skillsW = skillCount * skillSize + (skillCount - 1) * skillGap;
  const itemsW = 6 * itemSize + 5 * itemGap;
  const totalW = statsW + skillsW + itemsW + 36;
  const x = Math.max(margin, (VW - totalW) / 2);
  return {
    panel: {x, y: VH - panelH - bottom, w: Math.min(totalW, VW - margin * 2), h: panelH},
    stats: {x: x + 78, y: VH - panelH - bottom, w: statsW - 78},
    skills: {x: x + statsW + 12, y: VH - 106, w: skillSize, h: skillSize, gap: skillGap},
    items: {x: x + statsW + skillsW + 24, y: VH - 102, w: itemSize, h: itemSize, gap: itemGap}
  };
}

function skillBarRect(i){
  const layout = combatHudLayout();
  const skills = layout.skills;
  return {x:skills.x + i*(skills.w + skills.gap), y:skills.y, w:skills.w, h:skills.h};
}

function handleSkillBarClick(mx, my){
  const n = (playerHero && playerHero.skills.length) || 4;
  for(let i=0;i<n;i++){
    const r = skillBarRect(i);
    if(mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h){
      const skill=playerHero.skills[i];
      if(skill && skill.isShard){
        castSkill(playerHero, i, playerHero.x, playerHero.y);
        return true;
      }
      if(skill && skill.level <= 0){
        playerHero.levelSkill(i);
      }
      return true;
    }
  }
  return false;
}

function shopRect(){ return {x:VW-274, y:116, w:250, h:154}; }
function shopButtonRect(){
  const w = Math.round(190 * 1.12);
  const h = Math.round(40 * 1.12);
  return {x:VW-14-w, y:VH-264, w, h};
}
function shopGuideButtonRect(){
  const {r} = shopLayout();
  return {x:r.x+r.w-196, y:r.y+13, w:178, h:30};
}
function shopLayout(){
  const h = Math.min(640, Math.max(420, VH-72));
  const r = {x:Math.max(12,VW/2-560),y:Math.max(36,(VH-h)/2),w:Math.min(1120,VW-24),h};
  const detailsW = VW >= 980 ? 282 : 0;
  const columns = VW >= 980 ? 5 : (VW < 620 ? 3 : 4);
  const gap = 8;
  const visibleRows = Math.max(1, Math.floor((r.h-70)/78));
  const totalRows = Math.ceil(SHOP_ITEM_IDS.length/columns);
  return {r, detailsW, columns, gap, visibleRows, totalRows};
}
function drawCreatorGuide(){
  const hero = playerHero;
  const build = hero && CREATOR_BUILDS[hero.def.id];
  if(!build) return;
  const {r} = shopLayout();
  const contentX = r.x + 22;
  const contentW = r.w - 44;
  ctx.save();
  ctx.fillStyle='rgba(5,10,18,0.98)';
  ctx.fillRect(r.x+8,r.y+54,r.w-16,r.h-62);
  ctx.strokeStyle='rgba(139,233,253,0.45)'; ctx.lineWidth=1; ctx.strokeRect(r.x+8,r.y+54,r.w-16,r.h-62);
  ctx.textAlign='left';
  ctx.fillStyle='#ffd568'; ctx.font='bold 18px Georgia, serif';
  ctx.fillText('ОТ СОЗДАТЕЛЕЙ',contentX,r.y+84);
  ctx.fillStyle='#d9ecff'; ctx.font='bold 14px Segoe UI, Arial';
  ctx.fillText(build.title,contentX,r.y+106);
  ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='11px Segoe UI, Arial';
  ctx.fillText('Сборка не просит разрешения. Она объясняет, почему ты победил.',contentX,r.y+126);

  const columns = r.w >= 880 ? 2 : 1;
  const gap = 14;
  const cardW = (contentW-gap*(columns-1))/columns;
  const cardH = Math.max(112, Math.min(164, (r.h-164)/2));
  build.categories.forEach((category,index)=>{
    const column=index%columns, row=Math.floor(index/columns);
    const x=contentX+column*(cardW+gap), y=r.y+144+row*(cardH+gap);
    ctx.fillStyle='rgba(24,31,48,0.9)'; ctx.fillRect(x,y,cardW,cardH);
    ctx.strokeStyle=index===2 ? '#d7b36a' : '#4b7894'; ctx.lineWidth=1.5; ctx.strokeRect(x,y,cardW,cardH);
    ctx.fillStyle=index===2 ? '#ffd568' : '#8be9fd'; ctx.font='bold 12px Segoe UI, Arial';
    ctx.fillText(category.name,x+12,y+20);
    category.items.forEach((entry,itemIndex)=>{
      const item=SHOP_ITEMS[entry[0]];
      const itemY=y+42+itemIndex*34;
      if(!item) return;
      ctx.fillStyle=item.color; ctx.font='bold 12px Segoe UI, Arial';
      ctx.fillText(item.name + '  •  ' + item.cost + ' монет',x+12,itemY);
      ctx.fillStyle='rgba(255,255,255,0.68)'; ctx.font='10px Segoe UI, Arial';
      drawWrappedText(entry[1],x+12,itemY+14,cardW-24,12,'rgba(255,255,255,0.68)','10px Segoe UI, Arial');
    });
  });
  ctx.restore();
}
function shopItemRect(i){
  const {r,detailsW,columns,gap} = shopLayout();
  const itemW=(r.w-detailsW-40-gap*(columns-1))/columns;
  return {x:r.x+20+(i%columns)*(itemW+gap), y:r.y+62+(Math.floor(i/columns)-shopScrollRow)*78, w:itemW, h:70};
}
function inventorySlotRect(i){
  const items = combatHudLayout().items;
  return {x:items.x+i*(items.w+items.gap), y:items.y, w:items.w, h:items.h};
}
function handleHudClick(mx, my){
  const button = shopButtonRect();
  if(mx>=button.x && mx<=button.x+button.w && my>=button.y && my<=button.y+button.h){
    shopOpen = !shopOpen;
    if(shopOpen) shopScrollRow = 0;
    return true;
  }
  if(shopOpen){
    const guideButton=shopGuideButtonRect();
    if(mx>=guideButton.x && mx<=guideButton.x+guideButton.w && my>=guideButton.y && my<=guideButton.y+guideButton.h){
      shopGuideOpen=!shopGuideOpen;
      shopScrollRow=0;
      return true;
    }
    if(shopGuideOpen) return true;
    for(let i=0;i<SHOP_ITEM_IDS.length;i++){
      const r = shopItemRect(i);
      if(mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h){
        selectedShopItem = SHOP_ITEM_IDS[i];
        confirmShopPurchase(SHOP_ITEM_IDS[i]);
        return true;
      }
    }
    return true;
  }
  for(let i=0;i<6;i++){
    const r = inventorySlotRect(i);
    if(mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h){
      return true;
    }
  }
  return false;
}

/* =========================================================
   ПАНЕЛЬ ТЕСТ-РЕЖИМА
   ========================================================= */
function testFighterList(){
  const rows = [];
  if(playerHero) rows.push(playerHero);
  for(const dummy of testDummies) rows.push(dummy);
  return rows;
}
function testPanelWidth(){ return 268; }
function testFighterRowRect(i){
  const x = 14, y0 = 46, rowH = 36, gap = 6;
  return {x, y:y0+i*(rowH+gap), w:testPanelWidth(), h:rowH};
}
function testFighterLevelButtonRects(i){
  const r = testFighterRowRect(i);
  const gap = 6, w1 = 40, w30 = 48;
  const plus30 = {x:r.x+r.w-10-w30, y:r.y+4, w:w30, h:r.h-8};
  const plus1  = {x:plus30.x-gap-w1, y:r.y+4, w:w1, h:r.h-8};
  return {plus1, plus30};
}
function testPanelActionRects(){
  const rows = testFighterList();
  const x = 14, w = testPanelWidth(), h = 34, gap = 8;
  const y = 46 + rows.length*(36+6) + 6;
  return {
    restore: {x, y:y+0*(h+gap), w, h},
    spawn:   {x, y:y+1*(h+gap), w, h},
    clear:   {x, y:y+2*(h+gap), w, h},
    exit:    {x, y:y+3*(h+gap), w, h}
  };
}
function setHeroLevelDelta(hero, delta){
  if(!hero) return;
  for(let i=0;i<delta;i++){
    if(hero.level>=30) break;
    hero.gainXp(hero.xpForNext());
    if(hero.isPlayer && talentOpen) break;
  }
  addText(hero.x, hero.y-56, '+' + delta + ' УР. → ' + hero.level, '#ffe066', 1.0, 14);
}
function testPickerCardRect(i){
  const columns = 5;
  const gap = 8, w = 108, h = 96;
  const panel = testPickerPanelRect();
  const row = Math.floor(i/columns), col = i%columns;
  return {x:panel.x+18+col*(w+gap), y:panel.y+56+row*(h+gap), w, h};
}
function testPickerPanelRect(){
  const columns = 5;
  const rows = Math.ceil(HERO_DEFS.length/columns);
  const w = 18*2 + columns*108 + (columns-1)*8;
  const h = 56 + rows*96 + (rows-1)*8 + 18;
  return {x:VW/2-w/2, y:Math.max(20,VH/2-h/2), w, h};
}
function testPickerCloseRect(){
  const panel = testPickerPanelRect();
  return {x:panel.x+panel.w-116, y:panel.y+12, w:96, h:32};
}
function drawTestPanel(){
  if(!testMode || !playerHero) return;
  const rows = testFighterList();
  const actions = testPanelActionRects();
  const panelX = 14, panelW = testPanelWidth();
  const panelTop = 14, panelBottom = actions.exit.y+actions.exit.h+10;
  ctx.save();
  ctx.fillStyle = 'rgba(8,11,18,0.85)';
  ctx.beginPath();
  ctx.roundRect(panelX-10, panelTop, panelW+20, panelBottom-panelTop, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(139,233,253,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = '#8be9fd'; ctx.font = 'bold 13px Segoe UI, Arial';
  ctx.fillText('⚙ ТЕСТ-РЕЖИМ', panelX, panelTop+20);
  ctx.restore();

  rows.forEach((hero, i)=>{
    const r = testFighterRowRect(i);
    const btns = testFighterLevelButtonRects(i);
    ctx.save();
    ctx.fillStyle = 'rgba(20,26,38,0.9)';
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 6); ctx.fill();
    ctx.strokeStyle = hero===playerHero ? 'rgba(255,224,102,0.6)' : 'rgba(215,179,106,0.35)';
    ctx.lineWidth = 1; ctx.stroke();
    ctx.textAlign = 'left'; ctx.font = 'bold 12px Segoe UI, Arial';
    ctx.fillStyle = hero===playerHero ? '#ffe066' : '#e8c984';
    const label = (hero===playerHero ? 'ВЫ: ' : '') + hero.def.name + '  ур.' + hero.level;
    ctx.fillText(label, r.x+10, r.y+r.h/2+4, btns.plus1.x-r.x-16);
    ctx.restore();
    drawMenuButton(btns.plus1, '+1', {radius:5});
    drawMenuButton(btns.plus30, '+30', {radius:5});
  });

  drawMenuButton(actions.restore, 'Восстановить HP/МП/КД', {radius:6});
  drawMenuButton(actions.spawn, testHeroPickerOpen ? 'Закрыть список' : 'Заспавнить бойца', {radius:6, active:testHeroPickerOpen});
  drawMenuButton(actions.clear, 'Убрать манекенов (' + testDummies.length + ')', {radius:6});
  drawMenuButton(actions.exit, '✕ Выйти в меню', {radius:6});

  if(testHeroPickerOpen) drawTestHeroPicker();
}
function drawTestHeroPicker(){
  const panel = testPickerPanelRect();
  const now = performance.now()/1000;
  ctx.save();
  ctx.fillStyle = 'rgba(6,9,15,0.96)';
  ctx.beginPath(); ctx.roundRect(panel.x, panel.y, panel.w, panel.h, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(139,233,253,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = '#f2e2bd'; ctx.font = 'bold 16px Georgia, serif';
  ctx.fillText('ВЫБЕРИ БОЙЦА ДЛЯ МАНЕКЕНА', panel.x+18, panel.y+32);
  ctx.restore();
  drawMenuButton(testPickerCloseRect(), 'Закрыть', {radius:6});
  for(let i=0;i<HERO_DEFS.length;i++){
    const def = HERO_DEFS[i];
    const r = testPickerCardRect(i);
    ctx.save();
    ctx.fillStyle = 'rgba(20,26,38,0.92)';
    ctx.beginPath(); ctx.roundRect(r.x, r.y, r.w, r.h, 8); ctx.fill();
    ctx.strokeStyle = 'rgba(215,179,106,0.4)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    drawHeroTexture(def, r.x+10, r.y+6, r.w-20, r.h-34, now);
    ctx.textAlign = 'center'; ctx.fillStyle = '#e8c984'; ctx.font = 'bold 10px Segoe UI, Arial';
    ctx.fillText(def.name, r.x+r.w/2, r.y+r.h-10);
  }
}
function handleTestPanelClick(mx, my){
  if(!testMode || !playerHero) return false;
  if(testHeroPickerOpen){
    const close = testPickerCloseRect();
    if(mx>=close.x && mx<=close.x+close.w && my>=close.y && my<=close.y+close.h){
      testHeroPickerOpen = false;
      return true;
    }
    for(let i=0;i<HERO_DEFS.length;i++){
      const r = testPickerCardRect(i);
      if(mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h){
        spawnTestDummy(i);
        return true;
      }
    }
    const panel = testPickerPanelRect();
    if(mx>=panel.x && mx<=panel.x+panel.w && my>=panel.y && my<=panel.y+panel.h) return true;
    testHeroPickerOpen = false;
    return true;
  }
  const rows = testFighterList();
  for(let i=0;i<rows.length;i++){
    const btns = testFighterLevelButtonRects(i);
    if(mx>=btns.plus1.x && mx<=btns.plus1.x+btns.plus1.w && my>=btns.plus1.y && my<=btns.plus1.y+btns.plus1.h){
      setHeroLevelDelta(rows[i], 1);
      return true;
    }
    if(mx>=btns.plus30.x && mx<=btns.plus30.x+btns.plus30.w && my>=btns.plus30.y && my<=btns.plus30.y+btns.plus30.h){
      setHeroLevelDelta(rows[i], 30);
      return true;
    }
  }
  const actions = testPanelActionRects();
  if(mx>=actions.restore.x && mx<=actions.restore.x+actions.restore.w && my>=actions.restore.y && my<=actions.restore.y+actions.restore.h){
    testRestoreHero(playerHero);
    for(const dummy of testDummies) testRestoreHero(dummy);
    return true;
  }
  if(mx>=actions.spawn.x && mx<=actions.spawn.x+actions.spawn.w && my>=actions.spawn.y && my<=actions.spawn.y+actions.spawn.h){
    testHeroPickerOpen = !testHeroPickerOpen;
    return true;
  }
  if(mx>=actions.clear.x && mx<=actions.clear.x+actions.clear.w && my>=actions.clear.y && my<=actions.clear.y+actions.clear.h){
    clearTestDummies();
    return true;
  }
  if(mx>=actions.exit.x && mx<=actions.exit.x+actions.exit.w && my>=actions.exit.y && my<=actions.exit.y+actions.exit.h){
    exitTestMode();
    return true;
  }
  return false;
}

function drawWrappedText(text, x, y, maxWidth, lineHeight, color, font){
  ctx.fillStyle = color;
  ctx.font = font;
  const words = text.split(' ');
  let line = '';
  for(const word of words){
    const candidate = line ? line + ' ' + word : word;
    if(ctx.measureText(candidate).width > maxWidth && line){
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = word;
    } else line = candidate;
  }
  if(line) ctx.fillText(line, x, y);
}

const SKILL_STAT_LABELS = {
  dmg:'Урон',
  heal:'Лечение',
  radius:'Радиус',
  slow:'Замедление',
  armor:'Броня',
  dur:'Длительность',
  cd:'КД',
  mana:'Мана'
};

function formatSkillStat(key, value){
  if(key === 'slow') return Math.round(value*100) + '%';
  if(key === 'cd' || key === 'dur') return value ? value + 'с' : '—';
  if(key === 'mana') return value ? String(value) : '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function drawSkillTooltip(hero, skillIndex){
  if(!hero || skillIndex < 0 || !hero.skills[skillIndex]) return;
  const skill = hero.skills[skillIndex];
  const def = skill.def;
  const maxLevel = def.maxLevel || 1;
  const statKeys = Object.keys(SKILL_STAT_LABELS).filter(key =>
    Array.isArray(def[key]) && def[key].some(value => value !== 0)
  );
  const staticDetails = [];
  if(def.range) staticDetails.push('Дальность: ' + def.range);
  if(def.width) staticDetails.push('Ширина: ' + def.width);
  if(typeof def.dur === 'number' && !Array.isArray(def.dur)){
    staticDetails.push('Длительность: ' + formatSkillStat('dur',def.dur));
  }

  const rows = [];
  for(let level=1; level<=maxLevel; level++){
    const values = statKeys.map(key =>
      SKILL_STAT_LABELS[key] + ' ' + formatSkillStat(key,def[key][level])
    );
    if(values.length) rows.push({level, text:values.join('  •  ')});
  }

  const r = skillBarRect(skillIndex);
  const width = Math.min(430, VW-24);
  const height = 106 + Math.max(rows.length,1)*23 + (staticDetails.length ? 20 : 0);
  let x = clamp(r.x + r.w/2 - width/2, 12, VW-width-12);
  let y = r.y - height - 14;
  if(y < 12) y = r.y + r.h + 14;
  if(y + height > VH-8) y = Math.max(8, r.y-height-14);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(7,10,17,0.98)';
  ctx.beginPath(); ctx.roundRect(x,y,width,height,9); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = def.ult ? '#e2a84e' : '#79bde8';
  ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x+6,y+6,width-12,height-12,5); ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = def.ult ? '#ffd568' : '#d9ecff';
  ctx.font = 'bold 16px Segoe UI, Arial';
  ctx.fillText(def.name + '  [' + def.short + ']',x+16,y+25);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe066';
  ctx.font = 'bold 12px Segoe UI, Arial';
  ctx.fillText('Ур. ' + skill.level + ' / ' + maxLevel,x+width-16,y+24);

  ctx.textAlign = 'left';
  drawWrappedText(def.desc || 'Описание способности отсутствует.',x+16,y+47,width-32,15,'rgba(255,255,255,0.72)','12px Segoe UI, Arial');
  let lineY = y+73;
  if(staticDetails.length){
    ctx.fillStyle = 'rgba(255,213,104,0.78)';
    ctx.font = '11px Segoe UI, Arial';
    ctx.fillText(staticDetails.join('  •  '),x+16,lineY);
    lineY += 19;
  }
  if(rows.length){
    rows.forEach(row=>{
      const isCurrent = row.level === skill.level;
      const isNext = row.level === skill.level + 1;
      ctx.fillStyle = isNext ? 'rgba(92,177,113,0.22)' : (isCurrent ? 'rgba(255,213,104,0.14)' : 'rgba(255,255,255,0.035)');
      ctx.beginPath(); ctx.roundRect(x+12,lineY-13,width-24,20,3); ctx.fill();
      ctx.fillStyle = isNext ? '#9ff0af' : (isCurrent ? '#ffe066' : 'rgba(255,255,255,0.62)');
      ctx.font = 'bold 10px Segoe UI, Arial';
      ctx.fillText(isNext ? '→ СЛЕДУЮЩИЙ' : (isCurrent ? 'ТЕКУЩИЙ' : 'УР. '+row.level),x+18,lineY);
      ctx.fillStyle = isNext ? '#dfffe3' : 'rgba(255,255,255,0.78)';
      ctx.font = '10px Segoe UI, Arial';
      ctx.fillText(row.text,x+104,lineY);
      lineY += 23;
    });
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.58)';
    ctx.font = '11px Segoe UI, Arial';
    ctx.fillText(skill.level >= maxLevel ? 'Максимальный уровень способности' : 'Улучшение описано в тексте способности',x+16,lineY);
  }
  ctx.restore();
}

function drawItemIcon(item, x, y, size){
  if(!item) return;
  const radius = size * 0.5;
  const rarity = item.id === 'aghanimScepter' || item.id === 'kinglandia' ? '#f4d35e' :
    (item.id === 'satanic' || item.id === 'arcadiaScar' ? '#ff7043' : item.color || '#8be9fd');
  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = rarity;
  ctx.shadowBlur = 16;
  const gradient = ctx.createRadialGradient(-size*.2,-size*.25,2,0,0,size);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.18, rarity);
  gradient.addColorStop(1, 'rgba(4,8,16,0.95)');
  ctx.fillStyle = gradient;
  ctx.strokeStyle = rarity;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-radius, -radius, size, size, Math.max(4, size*.18));
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.34)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-radius+3, -radius+3, size-6, size-6, Math.max(3, size*.12));
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.beginPath();
  ctx.ellipse(-size*.22, -size*.24, size*.18, size*.08, -0.35, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#08111d';
  ctx.font = 'bold ' + Math.max(11, Math.round(size*.44)) + 'px Segoe UI, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(item.icon || '?', 0, 1);
  ctx.fillStyle = rarity;
  ctx.beginPath();
  ctx.arc(size*.34, size*.34, Math.max(2, size*.055), 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function getShopItemDescription(item, hero){
  if(!item) return '';
  let description = item.desc;
  if(item.id === 'aghanimShard' && hero && hero.def){
    const shard = SHARD_SKILLS[hero.def.id];
    if(shard) description += ' Сейчас для ' + hero.def.name + ': ' + shard.name + ' — ' + shard.desc;
  }
  if(item.id === 'aghanimScepter' && hero && hero.def && SCEPTER_UPGRADES[hero.def.id]){
    description += ' Улучшение этого героя: ' + SCEPTER_UPGRADES[hero.def.id] + '.';
  }
  return description;
}

function drawShop(){
  const h = playerHero;
  if(!h) return;
  const button = shopButtonRect();
  ctx.save();
  const buttonGradient=ctx.createLinearGradient(button.x,button.y,button.x+button.w,button.y+button.h);
  buttonGradient.addColorStop(0,shopOpen?'#8be9fd':'#18324b'); buttonGradient.addColorStop(1,shopOpen?'#d7b36a':'#101522');
  ctx.fillStyle=buttonGradient; ctx.fillRect(button.x,button.y,button.w,button.h);
  ctx.strokeStyle='#ffd568'; ctx.lineWidth=2; ctx.strokeRect(button.x,button.y,button.w,button.h);
  ctx.fillStyle=shopOpen ? '#141a24' : '#ffd568'; ctx.font='bold 15px Segoe UI, Arial'; ctx.textAlign='center';
  ctx.fillText(shopOpen ? 'ЗАКРЫТЬ' : 'МАГАЗИН',button.x+button.w/2,button.y+26);
  if(!shopOpen){ ctx.restore(); return; }
  const {r, detailsW, columns, visibleRows, totalRows} = shopLayout();
  const shopGradient=ctx.createLinearGradient(r.x,r.y,r.x+r.w,r.y+r.h);
  shopGradient.addColorStop(0,'rgba(8,28,52,0.99)'); shopGradient.addColorStop(0.55,'rgba(12,39,68,0.99)'); shopGradient.addColorStop(1,'rgba(5,18,37,0.99)');
  ctx.fillStyle=shopGradient; ctx.fillRect(r.x,r.y,r.w,r.h);
  ctx.strokeStyle='#8be9fd'; ctx.lineWidth=3; ctx.strokeRect(r.x,r.y,r.w,r.h);
  ctx.strokeStyle='rgba(255,255,255,0.24)'; ctx.lineWidth=1; ctx.strokeRect(r.x+6,r.y+6,r.w-12,r.h-12);
  const headerGradient=ctx.createLinearGradient(r.x,r.y,r.x+r.w,r.y+44);
  headerGradient.addColorStop(0,'rgba(101,234,255,0.28)'); headerGradient.addColorStop(0.5,'rgba(215,179,106,0.22)'); headerGradient.addColorStop(1,'rgba(255,116,212,0.2)');
  ctx.fillStyle=headerGradient; ctx.fillRect(r.x+8,r.y+8,r.w-16,38);
  ctx.strokeStyle='rgba(139,233,253,0.6)'; ctx.lineWidth=1; ctx.strokeRect(r.x+8,r.y+8,r.w-16,38);
  ctx.fillStyle='#8be9fd'; ctx.shadowColor='#8be9fd'; ctx.shadowBlur=12;
  ctx.beginPath(); ctx.arc(r.x+28,r.y+27,8+Math.sin(gameTime*4)*1.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(255,213,104,0.08)'; ctx.fillRect(r.x+8,r.y+50,r.w-16,r.h-58);
  ctx.textAlign='left'; ctx.fillStyle='#ffd568'; ctx.font='bold 20px Segoe UI, Arial';
  ctx.fillText('МАГАЗИН',r.x+20,r.y+32);
  ctx.textAlign='right'; ctx.fillStyle='#ffe9a6'; ctx.font='bold 16px Segoe UI, Arial';
  ctx.fillText(h.coins + ' монет',r.x+r.w-214,r.y+32);
  const guideButton=shopGuideButtonRect();
  ctx.fillStyle=shopGuideOpen ? '#d7b36a' : 'rgba(139,233,253,0.18)';
  ctx.fillRect(guideButton.x,guideButton.y,guideButton.w,guideButton.h);
  ctx.strokeStyle=shopGuideOpen ? '#fff0c7' : '#8be9fd'; ctx.lineWidth=1.2; ctx.strokeRect(guideButton.x,guideButton.y,guideButton.w,guideButton.h);
  ctx.fillStyle=shopGuideOpen ? '#111821' : '#d9ecff'; ctx.font='bold 11px Segoe UI, Arial'; ctx.textAlign='center';
  ctx.fillText('✦  ОТ СОЗДАТЕЛЕЙ',guideButton.x+guideButton.w/2,guideButton.y+19);
  if(shopGuideOpen){
    drawCreatorGuide();
    ctx.restore();
    return;
  }
  const entries=SHOP_ITEM_IDS.map(id=>SHOP_ITEMS[id]);
  let hoveredShopItem = null;
  for(let i=0;i<entries.length;i++){
    const itemRow = Math.floor(i/columns);
    if(itemRow < shopScrollRow || itemRow >= shopScrollRow + visibleRows) continue;
    const item=entries[i], ir=shopItemRect(i);
    const hovered=mouse.x>=ir.x&&mouse.x<=ir.x+ir.w&&mouse.y>=ir.y&&mouse.y<=ir.y+ir.h;
    if(hovered) hoveredShopItem = SHOP_ITEM_IDS[i];
    const itemGradient=ctx.createLinearGradient(ir.x,ir.y,ir.x,ir.y+ir.h);
    itemGradient.addColorStop(0,hovered?'rgba(101,234,255,0.42)':'rgba(81,52,101,0.72)'); itemGradient.addColorStop(1,hovered?'rgba(46,34,83,0.96)':'rgba(11,29,48,0.9)');
    ctx.fillStyle=itemGradient; ctx.fillRect(ir.x,ir.y,ir.w,ir.h);
    ctx.strokeStyle=item.color; ctx.lineWidth=hovered?2:1; ctx.strokeRect(ir.x,ir.y,ir.w,ir.h);
    if(hovered){
      ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1; ctx.strokeRect(ir.x+3,ir.y+3,ir.w-6,ir.h-6);
    }
    ctx.fillStyle='rgba(255,255,255,0.035)'; ctx.fillRect(ir.x+4,ir.y+4,ir.w-8,3);
    drawItemIcon(item,ir.x+25,ir.y+34,34);
    ctx.textAlign='left'; ctx.fillStyle='#fff'; ctx.font='bold 12px Segoe UI, Arial'; ctx.fillText(item.name,ir.x+46,ir.y+18);
     ctx.fillStyle='rgba(255,255,255,0.62)'; ctx.font='10px Segoe UI, Arial'; ctx.fillText(item.active ? 'АКТИВНЫЙ' : 'ПАССИВНЫЙ',ir.x+46,ir.y+36);
    ctx.fillStyle='#ffd568'; ctx.font='bold 12px Segoe UI, Arial'; ctx.fillText(item.cost+' монет',ir.x+46,ir.y+58);
  }
  if(totalRows > visibleRows){
    const trackX = r.x + r.w - detailsW - 12;
    const trackY = r.y + 62;
    const trackH = visibleRows * 78 - 8;
    const thumbH = Math.max(34, trackH * visibleRows / totalRows);
    const thumbY = trackY + (trackH-thumbH) * shopScrollRow / (totalRows-visibleRows);
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(trackX,trackY,5,trackH);
    ctx.fillStyle='#8be9fd'; ctx.fillRect(trackX,thumbY,5,thumbH);
  }
  const selected = SHOP_ITEMS[hoveredShopItem || selectedShopItem];
  if(selected){
    const panelX = detailsW ? r.x + r.w - detailsW - 10 : r.x;
    const panelY = detailsW ? r.y + 54 : r.y + r.h - 62;
    const panelW = detailsW ? detailsW : r.w;
    const panelH = detailsW ? 420 : 54;
    ctx.fillStyle='rgba(8,14,24,0.98)'; ctx.fillRect(panelX,panelY,panelW,panelH);
    ctx.strokeStyle=selected.color; ctx.lineWidth=2; ctx.strokeRect(panelX,panelY,panelW,panelH);
    ctx.textAlign='left'; ctx.fillStyle=selected.color; ctx.font='bold 15px Segoe UI, Arial';
    ctx.fillText(selected.name + '  •  ' + selected.cost + ' монет',panelX+16,panelY+28);
     drawWrappedText(getShopItemDescription(selected, h), panelX+16, panelY+58, panelW-32, 18, '#fff', '13px Segoe UI, Arial');
    if(detailsW){
      ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='11px Segoe UI, Arial';
       ctx.fillText(selected.active ? 'Используйте ЛКМ по слоту или его клавишу.' : 'Действует постоянно.',panelX+16,panelY+350);
    }
  }
  ctx.restore();
}

function drawPurchaseConfirm(){
  if(!pendingPurchaseId || !SHOP_ITEMS[pendingPurchaseId]) return;
  const item = SHOP_ITEMS[pendingPurchaseId];
  const panel = {x:VW/2-230,y:VH/2-125,w:460,h:250};
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(0,0,VW,VH);
  ctx.fillStyle='rgba(8,14,24,0.98)'; ctx.fillRect(panel.x,panel.y,panel.w,panel.h);
  ctx.strokeStyle=item.color; ctx.lineWidth=3; ctx.strokeRect(panel.x,panel.y,panel.w,panel.h);
  ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.font='bold 19px Segoe UI, Arial';
  ctx.fillText('Купить ' + item.name + '?',VW/2,panel.y+42);
  drawWrappedText(getShopItemDescription(item, playerHero),VW/2-190,panel.y+75,380,18,'rgba(255,255,255,0.72)','13px Segoe UI, Arial');
  ctx.fillStyle='#ffd568'; ctx.font='bold 16px Segoe UI, Arial'; ctx.fillText(item.cost + ' монет',VW/2,panel.y+155);
  const confirm={x:panel.x+35,y:panel.y+178,w:175,h:44}, cancel={x:panel.x+250,y:panel.y+178,w:175,h:44};
  ctx.fillStyle='#3dba73'; ctx.fillRect(confirm.x,confirm.y,confirm.w,confirm.h);
  ctx.fillStyle='#b94b4b'; ctx.fillRect(cancel.x,cancel.y,cancel.w,cancel.h);
  ctx.fillStyle='#071016'; ctx.font='bold 13px Segoe UI, Arial';
  ctx.fillText('КУПИТЬ',confirm.x+confirm.w/2,confirm.y+27); ctx.fillText('ОТМЕНА',cancel.x+cancel.w/2,cancel.y+27);
  ctx.restore();
}

function drawKillStreakBanner(){
  if(killStreakBanner.t > 0){
    const fade = Math.min(1, killStreakBanner.t / 0.45);
    const scale = killStreakBanner.scale * (1 + Math.max(0, 0.25 - killStreakBanner.t) * 0.8);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textAlign='center'; ctx.font='bold ' + Math.round(30*scale) + 'px Segoe UI, Arial';
    ctx.strokeStyle='rgba(0,0,0,0.9)'; ctx.lineWidth=8; ctx.strokeText(killStreakBanner.text,VW/2,VH*0.28);
    ctx.fillStyle=killStreakBanner.color; ctx.fillText(killStreakBanner.text,VW/2,VH*0.28);
    ctx.restore();
  }
  if(rampageBanner.t <= 0) return;
  const fade = Math.min(1, rampageBanner.t / 0.55);
  const pulse = 1 + Math.sin(gameTime*14)*0.035;
  ctx.save();
  ctx.globalAlpha = fade * 0.88;
  const wash = ctx.createLinearGradient(0,0,VW,VH);
  wash.addColorStop(0,'rgba(62,0,22,0.08)');
  wash.addColorStop(0.5,'rgba(255,20,77,0.24)');
  wash.addColorStop(1,'rgba(65,0,36,0.12)');
  ctx.fillStyle = wash; ctx.fillRect(0,0,VW,VH);
  ctx.globalAlpha = fade;
  ctx.textAlign='center';
  ctx.font='900 ' + Math.round(Math.min(132,VW/7.2)*pulse) + 'px Segoe UI, Arial Black, sans-serif';
  ctx.strokeStyle='rgba(12,0,8,0.96)'; ctx.lineWidth=16;
  ctx.strokeText('RAMPAGE',VW/2,VH*0.42);
  ctx.fillStyle='#ff234f'; ctx.fillText('RAMPAGE',VW/2,VH*0.42);
  ctx.font='bold 18px Segoe UI, Arial';
  ctx.fillStyle='#ffd8e0';
  ctx.fillText((rampageBanner.owner && rampageBanner.owner.def ? rampageBanner.owner.def.name : 'Шадоу') +
    '  •  серия ' + rampageBanner.streak, VW/2, VH*0.42+38);
  ctx.restore();
}

function drawInventory(){
  if(!playerHero) return;
  const items = combatHudLayout().items;
  ctx.save();
  ctx.textAlign='left'; ctx.font='bold 12px Segoe UI, Arial'; ctx.fillStyle='rgba(255,255,255,0.7)';
  ctx.fillText('ПРЕДМЕТЫ',items.x,items.y-10);
  for(let i=0;i<6;i++){
    const r=inventorySlotRect(i), item=playerHero.inventory[i];
    ctx.fillStyle='rgba(5,8,14,0.9)'; ctx.fillRect(r.x,r.y,r.w,r.h);
    ctx.strokeStyle=item ? item.color : 'rgba(255,255,255,0.25)'; ctx.lineWidth=2; ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.textAlign='center'; ctx.font='bold 20px Segoe UI, Arial'; ctx.fillStyle=item ? item.color : 'rgba(255,255,255,0.25)';
    const icon = item ? (item.id==='mango' ? '◆' : item.id==='tango' ? '♣' : item.id==='fangs' ? '✦' : item.id==='bkb' ? '✚' : item.id==='pt' ? '◆' : item.id==='blink' ? '◇' : item.id==='evsyutin' ? '♥' : item.id==='mantledSteel' ? '▣' : item.id==='manaTome' ? '✧' : item.id==='manaHooves' ? '♢' : item.id==='superBoots' ? '⬆' : item.id==='aghanimHead' ? '✹' : item.id==='ilyaHair' ? '☄' : item.id==='aghanimShard' ? '⬢' : item.id==='aghanimScepter' ? '✹' : item.id==='enemy302' ? '⌛' : item.id==='tornBrainHand' ? '☠' : item.id==='munition' ? '⚙' : item.id==='hatchet' ? '🪓' : item.id==='satanic' ? '♦' : item.id==='arcadiaScar' ? '✦' : item.id==='kinglandia' ? '♛' : item.id==='gur' ? '⬆' : item.id==='brainEye' ? '◉' : '▲') : '-';
    drawItemIcon(item,r.x+r.w/2,r.y+22,Math.min(34,r.w-10));
    ctx.font='10px Segoe UI, Arial'; ctx.fillStyle='rgba(255,255,255,0.65)'; ctx.fillText(inventoryBinds[i].toUpperCase(),r.x+r.w/2,r.y+44);
  }
  ctx.restore();
}

function drawInspectPanel(){
  if(!inspectUnit || inspectUnit.dead) return;
  const panel={x:VW-330,y:150,w:300,h:230};
  ctx.save();
  ctx.fillStyle='rgba(5,9,16,0.95)'; ctx.fillRect(panel.x,panel.y,panel.w,panel.h);
  ctx.strokeStyle=inspectUnit.team===0 ? '#72e6a5' : '#ff8585'; ctx.lineWidth=2; ctx.strokeRect(panel.x,panel.y,panel.w,panel.h);
  ctx.textAlign='left'; ctx.fillStyle='#fff'; ctx.font='bold 17px Segoe UI, Arial';
  ctx.fillText(inspectUnit.def ? inspectUnit.def.name : (inspectUnit.type === 'hero' ? 'Герой' : inspectUnit.type), panel.x+16,panel.y+28);
  ctx.fillStyle='#ffe066'; ctx.font='13px Segoe UI, Arial';
  ctx.fillText('Уровень: ' + (inspectUnit.level || '-'), panel.x+16,panel.y+50);
  ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.font='12px Segoe UI, Arial';
  ctx.fillText('Закупка:', panel.x+16,panel.y+76);
  const inventory=inspectUnit.inventory || [];
  const items=inventory.filter(Boolean);
  if(!items.length){
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.fillText('Нет предметов', panel.x+16,panel.y+98);
  } else {
    items.forEach((item,index)=>{
      const row=Math.floor(index/2), col=index%2;
      ctx.fillStyle=item.color || '#fff'; ctx.fillText((index+1)+'. '+item.name, panel.x+16+col*138, panel.y+99+row*25);
    });
  }
  ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.fillText('Нажмите на другого бойца для просмотра',panel.x+16,panel.y+205);
  ctx.restore();
}

function drawSellConfirm(){
  if(pendingSellIndex < 0 || !playerHero || !playerHero.inventory[pendingSellIndex]) return;
  const item=playerHero.inventory[pendingSellIndex];
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(0,0,VW,VH);
  ctx.fillStyle='rgba(8,14,24,0.98)'; ctx.fillRect(VW/2-220,VH/2-120,440,190);
  ctx.strokeStyle='#ffd568'; ctx.lineWidth=3; ctx.strokeRect(VW/2-220,VH/2-120,440,190);
  ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.font='bold 18px Segoe UI, Arial';
  ctx.fillText('Продать ' + item.name + '?',VW/2,VH/2-78);
  ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='13px Segoe UI, Arial';
  ctx.fillText('Вы получите ' + Math.floor((SHOP_ITEMS[item.id]?.cost || 0)*0.5) + ' монет.',VW/2,VH/2-50);
  const confirm={x:VW/2-170,y:VH/2-70,w:140,h:42}, cancel={x:VW/2+30,y:VH/2-70,w:140,h:42};
  ctx.fillStyle='#d85b5b'; ctx.fillRect(confirm.x,confirm.y,confirm.w,confirm.h);
  ctx.fillStyle='#72e6a5'; ctx.fillRect(cancel.x,cancel.y,cancel.w,cancel.h);
  ctx.fillStyle='#071016'; ctx.font='bold 13px Segoe UI, Arial';
  ctx.fillText('ПРОДАТЬ',confirm.x+confirm.w/2,confirm.y+26); ctx.fillText('ОТМЕНА',cancel.x+cancel.w/2,cancel.y+26);
  ctx.restore();
}

function talentCardRect(index){
  const skillLeft = skillBarRect(0).x;
  const w = Math.min(240, Math.max(150, skillLeft - 36));
  return {x:Math.max(12, skillLeft - w - 18), y:VH-250+index*82, w, h:70};
}

function talentToggleRect(){
  const treeX=Math.max(12,skillBarRect(0).x-156);
  return {x:treeX,y:VH-42,w:144,h:28};
}

function handleTalentClick(mx, my){
  for(let i=0;i<talentChoices.length;i++){
    const r=talentCardRect(i);
    if(mx>=r.x&&mx<=r.x+r.w&&my>=r.y&&my<=r.y+r.h){
      talentHero.applyTalent(talentChoices[i]);
      talentOpen=false; talentChoices=[]; talentHero=null;
      return;
    }
  }
}

function drawTalentPanel(){
  if(!playerHero) return;
  ctx.save();
  const treeX=Math.max(12,skillBarRect(0).x-156);
  const toggle=talentToggleRect();
  const toggleGradient=ctx.createLinearGradient(toggle.x,toggle.y,toggle.x+toggle.w,toggle.y+toggle.h);
  toggleGradient.addColorStop(0,talentTreeOpen?'#d7b36a':'#24385b'); toggleGradient.addColorStop(1,talentTreeOpen?'#8be9fd':'#16192d');
  ctx.fillStyle=toggleGradient; ctx.fillRect(toggle.x,toggle.y,toggle.w,toggle.h);
  ctx.strokeStyle='#8be9fd'; ctx.lineWidth=1.5; ctx.strokeRect(toggle.x,toggle.y,toggle.w,toggle.h);
  ctx.textAlign='center'; ctx.fillStyle=talentTreeOpen?'#10141c':'#d7b36a'; ctx.font='bold 11px Segoe UI, Arial';
  ctx.fillText(talentTreeOpen?'СКРЫТЬ ТАЛАНТЫ':'ТАЛАНТЫ',toggle.x+toggle.w/2,toggle.y+18);
  if(!talentTreeOpen && !talentOpen){ ctx.restore(); return; }
  const talents=HERO_TALENTS[playerHero.def.id] || [];
  const treeY=VH-210;
  ctx.textAlign='left'; ctx.fillStyle='#d7b36a'; ctx.font='bold 12px Segoe UI, Arial';
  ctx.fillText('ДРЕВО ТАЛАНТОВ',treeX,treeY-12);
  talents.forEach((talent,index)=>{
    const y=treeY+index*38;
    const taken=index<playerHero.talents.length;
    const available=talentOpen && talentHero===playerHero && index===playerHero.talents.length;
    const talentGradient=ctx.createLinearGradient(treeX,y,treeX+144,y+28);
    talentGradient.addColorStop(0,taken?'#3f9d78':available?'#b97845':'#202b48');
    talentGradient.addColorStop(1,taken?'#183f58':available?'#5d2b62':'#101526');
    ctx.fillStyle=talentGradient;
    ctx.fillRect(treeX,y,144,28);
    ctx.strokeStyle=taken?'#9ff0af':available?'#ffd568':'rgba(215,179,106,0.42)'; ctx.lineWidth=available?2:1; ctx.strokeRect(treeX,y,144,28);
    ctx.fillStyle=taken?'#dfffe3':available?'#fff0c7':'rgba(255,255,255,0.45)'; ctx.font='11px Segoe UI, Arial';
    ctx.fillText((index+1)*5+5+'. '+(taken?playerHero.talents[index]:'Талант'),treeX+7,y+18);
  });
  if(talentOpen && talentHero===playerHero){
    ctx.fillStyle='rgba(5,9,16,0.98)';
    const first=talentCardRect(0), second=talentCardRect(1);
    const panelX=Math.max(8,first.x-8), panelY=first.y-28, panelW=first.w+16, panelH=second.y+second.h-panelY+8;
    ctx.fillRect(panelX,panelY,panelW,panelH); ctx.strokeStyle='#ffd568'; ctx.lineWidth=2; ctx.strokeRect(panelX,panelY,panelW,panelH);
    ctx.textAlign='center'; ctx.fillStyle='#fff4d0'; ctx.font='bold 13px Segoe UI, Arial'; ctx.fillText('ВЫБЕРИТЕ ТАЛАНТ',panelX+panelW/2,panelY+19);
    talentChoices.forEach((talent,index)=>{
      const r=talentCardRect(index);
      const choiceGradient=ctx.createLinearGradient(r.x,r.y,r.x+r.w,r.y+r.h);
      choiceGradient.addColorStop(0,index===0?'#6a4b6f':'#245f72'); choiceGradient.addColorStop(1,'#10182e');
      ctx.fillStyle=choiceGradient; ctx.fillRect(r.x,r.y,r.w,r.h);
      ctx.strokeStyle=index===0?'#ffd568':'#8be9fd'; ctx.lineWidth=2; ctx.strokeRect(r.x,r.y,r.w,r.h);
      ctx.fillStyle=index===0?'#ffd568':'#8be9fd'; ctx.font='bold 13px Segoe UI, Arial'; ctx.fillText(talent[0],r.x+r.w/2,r.y+30);
      ctx.fillStyle='rgba(255,255,255,0.65)'; ctx.font='11px Segoe UI, Arial'; ctx.fillText('Нажмите для выбора',r.x+r.w/2,r.y+51);
    });
  }
  ctx.restore();
}

function drawChat(){
  if(!chatMessages.length && !chatInputOpen) return;
  const x=18, y=VH-292, w=Math.min(390,VW*0.34), h=chatMessages.length*22+48;
  ctx.save();
  const panel=ctx.createLinearGradient(x,y,x+w,y+h);
  panel.addColorStop(0,'rgba(19,40,57,0.94)'); panel.addColorStop(1,'rgba(8,12,24,0.96)');
  ctx.fillStyle=panel; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='#65eaff'; ctx.lineWidth=1.5; ctx.strokeRect(x,y,w,h);
  ctx.fillStyle='#b8f5ff'; ctx.font='bold 12px Segoe UI, Arial'; ctx.textAlign='left';
  ctx.fillText('ЧАТ  •  ENTER — написать',x+12,y+19);
  chatMessages.forEach((message,index)=>{
    ctx.fillStyle=message.color; ctx.font='bold 11px Segoe UI, Arial';
    ctx.fillText(message.name + ':',x+12,y+40+index*22);
    ctx.fillStyle='#ffffff'; ctx.font='11px Segoe UI, Arial';
    ctx.fillText(message.text,x+82,y+40+index*22);
  });
  ctx.restore();
}

function drawBottomHeroPanel(hero){
  if(!hero) return;
  const layout = combatHudLayout();
  const panel = layout.panel;
  const stats = layout.stats;
  ctx.save();
  ctx.fillStyle='rgba(5,9,16,0.94)'; ctx.fillRect(panel.x,panel.y,panel.w,panel.h);
  ctx.strokeStyle=hero.def.color2; ctx.lineWidth=2; ctx.strokeRect(panel.x,panel.y,panel.w,panel.h);
  drawHeroTexture(hero.def, panel.x + 8, panel.y + 28, 64, 92, performance.now()/1000, false);
  const barX = stats.x + 12, barW = stats.w - 24, barH = 16;
  ctx.textAlign='left'; ctx.fillStyle='#f2e2bd'; ctx.font='bold 15px Segoe UI, Arial';
  ctx.fillText(hero.def.name + '  •  Ур. ' + hero.level, barX, panel.y + 26);
  ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='11px Segoe UI, Arial';
  ctx.fillText('ЗДОРОВЬЕ', barX, panel.y + 47);
  ctx.fillText('МАНА', barX, panel.y + 82);
  ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(barX, panel.y + 53, barW, barH);
  ctx.fillStyle='#35c85a'; ctx.fillRect(barX, panel.y + 53, barW * clamp(hero.hp / hero.maxHp, 0, 1), barH);
  ctx.fillStyle='#fff'; ctx.font='bold 11px Consolas, monospace';
  ctx.fillText(Math.ceil(hero.hp) + ' / ' + Math.ceil(hero.maxHp), barX + 8, panel.y + 65);
  ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(barX, panel.y + 88, barW, barH);
  ctx.fillStyle='#3988e8'; ctx.fillRect(barX, panel.y + 88, barW * clamp(hero.mp / hero.maxMp, 0, 1), barH);
  ctx.fillStyle='#fff'; ctx.fillText(Math.ceil(hero.mp) + ' / ' + Math.ceil(hero.maxMp), barX + 8, panel.y + 100);
  ctx.fillStyle='rgba(255,255,255,0.52)'; ctx.font='11px Segoe UI, Arial';
  ctx.fillText('АТАКА ' + Math.round(hero.getDamage()) + '  •  БРОНЯ ' + Math.round(hero.getArmor()), barX, panel.y + 121);
  ctx.restore();
}

function drawHUD(){
  if(!playerHero) return;
  const h = playerHero;

  ctx.textAlign = 'right';
  ctx.font = 'bold 15px Segoe UI, Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('Убийств: ' + h.kills + '   Смертей: ' + h.deaths + '   Помощь: ' + h.assists, VW-24, 34);

  const mins = Math.floor(gameTime/60), secs = Math.floor(gameTime%60);
  ctx.font = 'bold 20px Segoe UI, Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText(mins + ':' + (secs<10?'0':'') + secs, VW-24, 62);

  ctx.font = 'bold 13px Segoe UI, Arial';
  ctx.fillStyle = 'rgba(200,220,255,0.85)';
  ctx.fillText('Волна через: ' + Math.ceil(waveTimer) + 'с', VW-24, 84);

  ctx.fillStyle = '#ffd568';
  ctx.font = 'bold 16px Segoe UI, Arial';
  ctx.fillText('Монеты: ' + h.coins, VW-24, 108);
  ctx.fillStyle = gameTime < MID_PUSH_TIME ? '#8be9fd' : '#ffd568';
  ctx.font = 'bold 14px Segoe UI, Arial';
  ctx.fillText(gameTime < MID_PUSH_TIME ? 'Фаза: линии + лес' : 'Фаза: общий пуш мида', VW-24, 178);
  if(h.def.id === 'shadow'){
    ctx.fillStyle = '#ff8a3d';
    ctx.font = 'bold 16px Segoe UI, Arial';
    ctx.fillText('Души: ' + (h.shadowSouls || 0) + ' / 30', VW-24, 132);
    ctx.fillStyle = 'rgba(255,180,91,0.9)';
    ctx.font = '12px Segoe UI, Arial';
    ctx.fillText('Q ближний  •  W средний  •  E дальний  •  авто-цель', VW-24, 151);
  }

  if(lastPressedKey){
    ctx.font = 'bold 12px Consolas, monospace';
    ctx.fillStyle = 'rgba(120,200,255,0.7)';
    ctx.fillText('клавиша: ' + lastPressedKey, VW-24, 104);
  }

  const base = BASES[0];
  if(Math.hypot(h.x-base.x, h.y-base.y) < BASE_HEAL_RADIUS){
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px Segoe UI, Arial';
    ctx.fillStyle = '#7dff7d';
    ctx.fillText('♥ Восстановление у базы', VW/2, 100);
  }

  /* === ПАНЕЛЬ ОРБОВ ДЛЯ ГРИШИ === */
  if(h.def.id === 'grisha' && h.orbs){
    const orbY = VH - SKILL_BAR.h - 90;
    const cx0 = VW/2 - 100;
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Segoe UI, Arial';
    ctx.fillStyle = '#e0c8ff';
    ctx.fillText('Стихии:', VW/2 - 155, orbY + 34);

    for(let i=0;i<3;i++){
      const orb = h.orbs[i];
      const ox = cx0 + i*56;
      const oy = orbY;
      const ocol = orb==='Q' ? '#7feaff' : orb==='W' ? '#c8b3ff' : '#ff9955';
      const oname = orb==='Q' ? '❄' : orb==='W' ? '⚡' : '🔥';

      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(ox, oy, 44, 44);
      ctx.strokeStyle = ocol; ctx.lineWidth = 3;
      ctx.strokeRect(ox, oy, 44, 44);

      const grad = ctx.createRadialGradient(ox+22, oy+22, 4, ox+22, oy+22, 22);
      grad.addColorStop(0, ocol);
      grad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(ox+22, oy+22, 18, 0, Math.PI*2); ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px Segoe UI, Arial';
      ctx.fillText(oname, ox+22, oy+30);
    }

    const key = getOrbKey(h.orbs);
    const spell = INVOKE_SPELLS[key];
    if(spell){
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px Segoe UI, Arial';
      ctx.fillStyle = '#ffe066';
      ctx.fillText('R → ' + spell.name + '  • доступно', VW/2, orbY - 10);
    }
  }

  let hoveredSkill = -1;
  drawBottomHeroPanel(h);
  for(let i=0;i<h.skills.length;i++){
    const r = skillBarRect(i);
    const s = h.skills[i];
    const def = s.def;
    if(mouse.x>=r.x && mouse.x<=r.x+r.w && mouse.y>=r.y && mouse.y<=r.y+r.h){
      hoveredSkill = i;
    }
    const manaVal = def.mana[s.level] || 0;
    const invokeKey = h.def.id === 'grisha' && i === 3 ? getOrbKey(h.orbs || ['Q','W','E']) : null;
    const activeCd = invokeKey ? getInvokeCooldown(h, invokeKey) : s.cd;
    const maxCd = invokeKey ? (INVOKE_COOLDOWNS[invokeKey] || 0) : (def.cd[s.level] || 0);
    const ready = s.level>0 && activeCd<=0 && h.mp>=manaVal && !(def.mineSkill && h.mineLock);
    const canLevel = h.canLevelSkill(i);

    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(r.x, r.y, r.w, r.h);

    if(s.level>0){
      ctx.fillStyle = ready ? 'rgba(70,130,200,0.55)' : 'rgba(60,60,70,0.6)';
      ctx.fillRect(r.x+3, r.y+3, r.w-6, r.h-6);
    } else {
      ctx.fillStyle = 'rgba(35,35,40,0.7)';
      ctx.fillRect(r.x+3, r.y+3, r.w-6, r.h-6);
    }

    if(h.def.id === 'grisha' && i<3){
      const ocol = i===0 ? '#7feaff' : i===1 ? '#c8b3ff' : '#ff9955';
      ctx.fillStyle = ocol;
      ctx.globalAlpha = 0.55;
      ctx.fillRect(r.x+3, r.y+3, r.w-6, r.h-6);
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = s.level>0 ? '#fff' : 'rgba(255,255,255,0.35)';
    ctx.font = 'bold 30px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(def.short, r.x + r.w/2, r.y + r.h/2 + 10);

    ctx.font = '11px Segoe UI, Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(def.name, r.x + r.w/2, r.y - 6);

    if(s.level > 0 && manaVal > 0){
      ctx.font = 'bold 12px Segoe UI, Arial';
      ctx.fillStyle = h.mp >= manaVal ? '#8fc4ff' : '#ff7070';
      ctx.fillText(manaVal, r.x + r.w - 8, r.y + r.h - 6);
    }

    if(activeCd > 0 && maxCd > 0){
      const pct = activeCd / maxCd;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(r.x+3, r.y+3 + (r.h-6)*(1-pct), r.w-6, (r.h-6)*pct);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px Segoe UI, Arial';
      ctx.fillText(Math.ceil(activeCd), r.x + r.w/2, r.y + r.h/2 + 8);
    }

    for(let l=0; l<def.maxLevel; l++){
      const px = r.x + 8 + l*13;
      const py = r.y + r.h - 14;
      ctx.fillStyle = l < s.level ? '#ffe066' : 'rgba(255,255,255,0.2)';
      ctx.fillRect(px, py, 10, 5);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    if(canLevel){
      ctx.fillStyle = '#ffd54f';
      ctx.beginPath();
      ctx.arc(r.x + r.w - 10, r.y + 10, 8, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px Segoe UI, Arial';
      ctx.textAlign = 'center';
      ctx.fillText('+', r.x + r.w - 10, r.y + 15);
    }
  }

  drawSkillTooltip(h, hoveredSkill);

  if(h.skillPoints > 0){
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Segoe UI, Arial';
    ctx.fillStyle = '#ffd54f';
    const maxKey = h.skills.length;
    ctx.fillText('Очки навыков: ' + h.skillPoints + '  (1-' + maxKey + ' — прокачать скилл)', VW/2, VH - SKILL_BAR.h - 34);
  }
  drawInventory();
  drawShop();
  drawInspectPanel();
  drawPurchaseConfirm();
  drawSellConfirm();
  drawTalentPanel();
  drawChat();

  if(h.dead){
    ctx.fillStyle = 'rgba(120,0,0,0.35)';
    ctx.fillRect(0,0,VW,VH);
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px Segoe UI, Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText('ВОЗРОЖДЕНИЕ ЧЕРЕЗ ' + Math.ceil(h.respawnTimer), VW/2, VH/2);
  }
  if(killStreakBanner.t > 0){
    const fade = Math.min(1, killStreakBanner.t / 0.45);
    const scale = killStreakBanner.scale * (1 + Math.max(0, 0.25 - killStreakBanner.t) * 0.8);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.textAlign='center'; ctx.font='bold ' + Math.round(30*scale) + 'px Segoe UI, Arial';
    ctx.strokeStyle='rgba(0,0,0,0.9)'; ctx.lineWidth=8; ctx.strokeText(killStreakBanner.text,VW/2,VH*0.28);
    ctx.fillStyle=killStreakBanner.color; ctx.fillText(killStreakBanner.text,VW/2,VH*0.28);
    ctx.restore();
  }
  drawPhraseWheel();
  ctx.restore();
}

function drawPhraseWheel(){
  if(!phraseWheelOpen) return;
  const cx = VW/2, cy = VH/2;
  const radius = Math.min(174, Math.max(128, Math.min(VW,VH)*0.24));
  const innerRadius = Math.min(62, radius*0.38);
  const slice = Math.PI*2/PHRASE_WHEEL_ITEMS.length;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.fillRect(0,0,VW,VH);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for(let i=0;i<PHRASE_WHEEL_ITEMS.length;i++){
    const item = PHRASE_WHEEL_ITEMS[i];
    const start = -Math.PI/2 - slice/2 + i*slice + 0.035;
    const end = -Math.PI/2 - slice/2 + (i+1)*slice - 0.035;
    const selected = i === phraseWheelSelection;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,radius,start,end);
    ctx.closePath();
    ctx.fillStyle = selected ? item.color : 'rgba(18,27,42,0.94)';
    ctx.globalAlpha = selected ? 0.96 : 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = selected ? '#fff' : item.color;
    ctx.lineWidth = selected ? 4 : 1.5;
    ctx.stroke();

    const labelAngle = -Math.PI/2 + i*slice;
    const labelRadius = radius*0.67;
    const lx = cx + Math.cos(labelAngle)*labelRadius;
    const ly = cy + Math.sin(labelAngle)*labelRadius;
    ctx.fillStyle = selected ? '#10131b' : '#fff';
    ctx.font = 'bold 11px Segoe UI, Arial';
    ctx.fillText(item.label, lx, ly);
  }

  ctx.beginPath();
  ctx.arc(cx,cy,innerRadius,0,Math.PI*2);
  ctx.fillStyle = 'rgba(5,9,16,0.98)';
  ctx.fill();
  ctx.strokeStyle = '#f2e2bd';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#f2e2bd';
  ctx.font = 'bold 18px Segoe UI, Arial';
  ctx.fillText('ФРАЗА',cx,cy-9);
  ctx.font = '12px Segoe UI, Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('отпусти K',cx,cy+12);

  ctx.font = 'bold 18px Segoe UI, Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText('Удерживай K и наведи мышь на фразу',cx,VH-42);
  ctx.font = '13px Segoe UI, Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText('Клик по выбранной фразе тоже сработает',cx,VH-20);
  ctx.restore();
}

function drawScoreboard(){
  if(!scoreboardOpen) return;
  ctx.save();
  const w=620, h=360, x=VW/2-w/2, y=VH/2-h/2;
  ctx.fillStyle='rgba(5,9,16,0.94)'; ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='#ffd568'; ctx.lineWidth=3; ctx.strokeRect(x,y,w,h);
  ctx.textAlign='center'; ctx.fillStyle='#ffd568'; ctx.font='bold 24px Segoe UI, Arial'; ctx.fillText('СЧЁТ',VW/2,y+38);
  ctx.font='bold 16px Segoe UI, Arial'; ctx.fillStyle='#72e6a5'; ctx.fillText('СОЮЗНИКИ',x+155,y+75); ctx.fillStyle='#ff8585'; ctx.fillText('ВРАГИ',x+465,y+75);
  const allies=heroes.filter(h=>h.team===0), enemies=heroes.filter(h=>h.team===1);
  ctx.font='14px Segoe UI, Arial';
  for(let i=0;i<Math.max(allies.length,enemies.length);i++){
    const yy=y+112+i*52;
    const left=allies[i], right=enemies[i];
    if(left){ ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.fillText(left.def.name+'  ур.'+left.level,x+45,yy); ctx.fillText('У/С/П: '+left.kills+'/'+left.deaths+'/'+left.assists+'  '+Math.floor(left.coins)+' монет',x+45,yy+20); }
    if(right){ ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.fillText(right.def.name+'  ур.'+right.level,x+355,yy); ctx.fillText('У/С/П: '+right.kills+'/'+right.deaths+'/'+right.assists+'  '+Math.floor(right.coins)+' монет',x+355,yy+20); }
  }
  ctx.restore();
}

let menuHover = -1;
function menuPlayRect(){ return {x:VW/2-150,y:VH/2-28,w:300,h:72}; }
function menuChangelogRect(){ return {x:VW/2-155,y:VH/2+178,w:310,h:48}; }
function menuSettingsRect(){ return {x:VW-174,y:22,w:150,h:42}; }
function menuSettingsPanel(){ return {x:VW/2-280,y:VH/2-260,w:560,h:520}; }
function menuStoreRect(){ return {x:VW/2-155,y:VH/2+292,w:310,h:48}; }

function drawMenuButton(rect, label, options={}){
  const hover = mouse.x>=rect.x && mouse.x<=rect.x+rect.w &&
                mouse.y>=rect.y && mouse.y<=rect.y+rect.h;
  const primary = options.primary === true;
  const active = options.active === true;
  const radius = options.radius || 8;
  ctx.save();
  ctx.shadowColor = hover || active
    ? (primary ? 'rgba(211,74,43,0.65)' : 'rgba(215,179,106,0.35)')
    : 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = hover || active ? 18 : 8;
  const fill = ctx.createLinearGradient(rect.x,rect.y,rect.x,rect.y+rect.h);
  if(primary){
    fill.addColorStop(0, hover ? '#d96847' : '#b94835');
    fill.addColorStop(1, hover ? '#8d2c28' : '#70201f');
  } else {
    fill.addColorStop(0, hover || active ? 'rgba(119,42,34,0.95)' : 'rgba(28,24,27,0.96)');
    fill.addColorStop(1, hover || active ? 'rgba(68,27,27,0.98)' : 'rgba(10,11,16,0.96)');
  }
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(rect.x,rect.y,rect.w,rect.h,radius); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = primary ? '#f5d99c' : (hover || active ? '#e3bd70' : 'rgba(215,179,106,0.72)');
  ctx.lineWidth = primary ? 2 : 1.5;
  ctx.stroke();
  ctx.strokeStyle = primary ? 'rgba(255,237,188,0.48)' : 'rgba(185,67,49,0.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(rect.x+4,rect.y+4,rect.w-8,rect.h-8,Math.max(3,radius-3));
  ctx.stroke();
  ctx.fillStyle = primary ? '#fff0c7' : '#e8c984';
  ctx.font = options.large ? 'bold 21px Segoe UI, Arial' : 'bold 12px Segoe UI, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label,rect.x+rect.w/2,rect.y+rect.h/2+1);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
  return hover;
}

function handleMenuClick(mx, my){
  startMenuMusic();
  const settingsButton = menuSettingsRect();
  if(mx>=settingsButton.x && mx<=settingsButton.x+settingsButton.w && my>=settingsButton.y && my<=settingsButton.y+settingsButton.h){
    settingsOpen = !settingsOpen;
    changelogOpen = false;
    return;
  }
  if(settingsOpen){
    const panel = menuSettingsPanel();
    const musicToggle = {x:panel.x+36,y:panel.y+142,w:244,h:48};
    const close = {x:panel.x+190,y:panel.y+452,w:180,h:44};
    if(mx>=musicToggle.x && mx<=musicToggle.x+musicToggle.w && my>=musicToggle.y && my<=musicToggle.y+musicToggle.h){
      setMusicEnabled(!musicEnabled);
    } else {
      for(let index=0;index<6;index++){
        const row={x:panel.x+36+(index%3)*164,y:panel.y+262+Math.floor(index/3)*64,w:148,h:46};
        if(mx>=row.x&&mx<=row.x+row.w&&my>=row.y&&my<=row.y+row.h){ rebindSlot=index; return; }
      }
      if(mx>=close.x && mx<=close.x+close.w && my>=close.y && my<=close.y+close.h){
        settingsOpen = false; rebindSlot=-1;
      }
    }
    return;
  }
  const storeButton=menuStoreRect();
  if(mx>=storeButton.x && mx<=storeButton.x+storeButton.w && my>=storeButton.y && my<=storeButton.y+storeButton.h){
    storeOpen=!storeOpen; changelogOpen=false; settingsOpen=false; return;
  }
  if(storeOpen){
    const panel={x:VW/2-330,y:VH/2-250,w:660,h:500};
    const close={x:panel.x+230,y:panel.y+426,w:200,h:44};
    if(mx>=close.x&&mx<=close.x+close.w&&my>=close.y&&my<=close.y+close.h){storeOpen=false;return;}
    for(let index=0;index<STORE_PHRASE_CARDS.length;index++){
      const card={x:panel.x+18+(index%3)*216,y:panel.y+150+Math.floor(index/3)*116,w:194,h:100};
      if(mx>=card.x&&mx<=card.x+card.w&&my>=card.y&&my<=card.y+card.h){unlockStorePhrase(STORE_PHRASE_CARDS[index].id);return;}
    }
    return;
  }
  const changelogButton = menuChangelogRect();
  if(mx>=changelogButton.x && mx<=changelogButton.x+changelogButton.w && my>=changelogButton.y && my<=changelogButton.y+changelogButton.h){
    changelogOpen = !changelogOpen;
    if(changelogOpen) changelogScroll = 0;
    return;
  }
  if(changelogOpen){
    const panel={x:Math.max(18,VW/2-360),y:Math.max(22,VH/2-280),w:Math.min(720,VW-36),h:Math.min(560,VH-44)};
    const close={x:panel.x+panel.w-142,y:panel.y+18,w:116,h:34};
    if(mx>=close.x && mx<=close.x+close.w && my>=close.y && my<=close.y+close.h){ changelogOpen=false; return; }
    return;
  }
  if(menuStage === 'home'){
    const play = menuPlayRect();
    if(mx>=play.x && mx<=play.x+play.w && my>=play.y && my<=play.y+play.h){
      beginDraft();
      return;
    }
    const fighters = menuFightersRect();
    if(mx>=fighters.x && mx<=fighters.x+fighters.w && my>=fighters.y && my<=fighters.y+fighters.h){
      menuStage = 'heroes';
      menuHeroPage = 0;
    }
    return;
  }
  if(menuStage === 'heroDetail'){
    const detailBack = menuDetailBackRect();
    const detailStart = menuDetailStartRect();
    if(mx>=detailBack.x && mx<=detailBack.x+detailBack.w && my>=detailBack.y && my<=detailBack.y+detailBack.h){
      menuStage = 'heroes';
      return;
    }
    if(mx>=detailStart.x && mx<=detailStart.x+detailStart.w && my>=detailStart.y && my<=detailStart.y+detailStart.h){
      beginDraft(selectedHeroIndex);
      return;
    }
    const detailTest = menuDetailTestRect();
    if(mx>=detailTest.x && mx<=detailTest.x+detailTest.w && my>=detailTest.y && my<=detailTest.y+detailTest.h){
      startTestMode(selectedHeroIndex);
      return;
    }
    return;
  }
  if(menuStage === 'draft'){
    const back={x:24,y:78,w:120,h:38};
    if(mx>=back.x && mx<=back.x+back.w && my>=back.y && my<=back.y+back.h){ stopMenuMusic(); menuStage='home'; return; }
    for(let i=0;i<HERO_DEFS.length;i++){
      const r=menuCardRect(i);
      if(mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h){ draftPlayerIndex=i; selectedHeroIndex=i; return; }
    }
    return;
  }
  const back = {x:24,y:78,w:120,h:38};
  if(mx>=back.x && mx<=back.x+back.w && my>=back.y && my<=back.y+back.h){
    menuStage = 'home';
    return;
  }
  const pageStart = 0;
  const pageEnd = HERO_DEFS.length;
  for(let i=pageStart;i<pageEnd;i++){
    const r = menuCardRect(i-pageStart);
    if(mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h){
      selectedHeroIndex = i;
      menuStage = 'heroDetail';
      return;
    }
  }
}
const HERO_PAGE_SIZE = HERO_DEFS.length;
function menuPageCount(){ return Math.max(1, Math.ceil(HERO_DEFS.length/HERO_PAGE_SIZE)); }
function menuCardRect(i){
  const gap = VW < 720 ? 9 : 12;
  const columns = VW < 480 ? 2 : (VW < 900 ? 4 : (VW < 1320 ? 5 : 6));
  const rows = Math.ceil(HERO_DEFS.length/columns);
  const draftWidth = Math.max(420, VW-360);
  const availableWidth = menuStage === 'draft' ? draftWidth : VW-38;
  const w = Math.max(112, Math.min(248, (availableWidth-gap*(columns-1))/columns));
  const h = Math.max(90, Math.min(156, (VH-226-gap*(rows-1))/rows));
  const total = w*columns + gap*(columns-1);
  const row = Math.floor(i/columns), column = i%columns;
  const x = menuStage === 'draft' ? 18 + column*(w+gap) : VW/2 - total/2 + column*(w+gap);
  const gridHeight = h*rows + gap*(rows-1);
  const draftOffset = menuStage === 'draft' ? 118 : 0;
  const y = Math.max(140, VH/2 - gridHeight/2 - 4) + row*(h+gap) + draftOffset;
  return {x, y, w, h};
}
function menuPreviousRect(){ return {x:VW/2-230,y:VH-68,w:92,h:38}; }
function menuNextRect(){ return {x:VW/2+138,y:VH-68,w:92,h:38}; }
function menuFightersRect(){ return {x:VW/2-155,y:VH/2+62,w:310,h:54}; }
function menuDetailBackRect(){ return {x:24,y:78,w:132,h:42}; }
function menuDetailStartRect(){ return {x:VW-300,y:VH-76,w:260,h:50}; }
function menuDetailTestRect(){ return {x:VW-300-276,y:VH-76,w:260,h:50}; }

function wrapMenuText(text, maxWidth, font){
  ctx.save();
  ctx.font = font;
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';
  for(const word of words){
    const next = line ? line + ' ' + word : word;
    if(ctx.measureText(next).width > maxWidth && line){
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if(line) lines.push(line);
  ctx.restore();
  return lines;
}

function drawHeroTexture(def, x, y, w, h, now, large=false){
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x,y,w,h,large ? 18 : 12); ctx.clip();
  const bg = ctx.createLinearGradient(x,y,x+w,y+h);
  bg.addColorStop(0, '#101a2a');
  bg.addColorStop(0.5, def.color);
  bg.addColorStop(1, '#070a12');
  ctx.fillStyle = bg; ctx.fillRect(x,y,w,h);

  const glow = ctx.createRadialGradient(x+w*.50,y+h*.42,4,x+w*.50,y+h*.42,w*.72);
  glow.addColorStop(0, def.color2 + 'bb');
  glow.addColorStop(0.4, def.color + '55');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(x,y,w,h);

  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = def.color2; ctx.lineWidth = large ? 2 : 1;
  for(let i=0;i<7;i++){
    const yy = y + h*(0.16+i*0.13) + Math.sin(now*.6+i)*10;
    ctx.beginPath(); ctx.moveTo(x-20,yy); ctx.lineTo(x+w+20,yy-55); ctx.stroke();
  }
  ctx.globalAlpha = 0.42;
  for(let i=0;i<(large ? 18 : 8);i++){
    const px = x + ((i*47 + Math.sin(now*.4+i)*18) % Math.max(1,w));
    const py = y + ((i*83 + Math.cos(now*.5+i)*22) % Math.max(1,h));
    ctx.fillStyle = i%2 ? def.color2 : '#fff1c1';
    ctx.beginPath(); ctx.arc(px,py,large ? 2.2 : 1.3,0,Math.PI*2); ctx.fill();
  }

  // Детальный 2D-портрет: у каждого бойца свои броня, лицо, оружие
  // и эффект. Это не абстрактная иконка, а маленькая игровая текстура.
  const cx=x+w*.50, base=y+h*.86;
  const scale=Math.min(w/(large ? 270 : 155),h/(large ? 255 : 132));
  if(false){
  ctx.globalAlpha=1;
  ctx.save(); ctx.translate(cx,base); ctx.scale(scale,scale);
  ctx.fillStyle='rgba(4,7,13,0.75)';
  ctx.beginPath(); ctx.ellipse(0,10,72,27,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=def.color; ctx.strokeStyle=def.color2; ctx.lineWidth=3;
  if(['warlord','sasych','ilya','malit'].includes(def.id)){
    ctx.beginPath(); ctx.moveTo(-61,8); ctx.lineTo(-47,-67); ctx.lineTo(0,-84); ctx.lineTo(47,-67); ctx.lineTo(61,8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.14)'; ctx.fillRect(-43,-42,86,12);
  } else {
    ctx.beginPath(); ctx.moveTo(-50,8); ctx.lineTo(-40,-68); ctx.lineTo(0,-90); ctx.lineTo(40,-68); ctx.lineTo(50,8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.19)';
    ctx.beginPath(); ctx.moveTo(-40,-57); ctx.lineTo(-77,-20); ctx.lineTo(-59,8); ctx.lineTo(-31,-31); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(40,-57); ctx.lineTo(77,-20); ctx.lineTo(59,8); ctx.lineTo(31,-31); ctx.closePath(); ctx.fill();
  }
  // Голова и тень лица.
  ctx.fillStyle=def.color2;
  ctx.beginPath(); ctx.arc(0,-105,32,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(18,22,32,.72)';
  ctx.beginPath(); ctx.arc(0,-97,29,0,Math.PI); ctx.fill();
  ctx.fillStyle='#080d18';
  ctx.beginPath(); ctx.arc(-11,-105,4,0,Math.PI*2); ctx.arc(11,-105,4,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.68)'; ctx.lineWidth=2.5;
  ctx.beginPath(); ctx.moveTo(-12,-91); ctx.quadraticCurveTo(0,-86,12,-91); ctx.stroke();

  if(def.id==='pyro'){
    ctx.fillStyle='#ffca55'; ctx.shadowColor='#ff762f'; ctx.shadowBlur=18;
    ctx.beginPath(); ctx.moveTo(-28,-126); ctx.lineTo(0,-160); ctx.lineTo(27,-126); ctx.lineTo(15,-136); ctx.lineTo(0,-127); ctx.lineTo(-15,-136); ctx.closePath(); ctx.fill();
    ctx.shadowBlur=0; ctx.strokeStyle='#ffe5a5'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(58,8); ctx.lineTo(85,-95); ctx.stroke();
    ctx.fillStyle='#ffc857'; ctx.beginPath(); ctx.arc(87,-101,12,0,Math.PI*2); ctx.fill();
  } else if(def.id==='warlord'){
    ctx.fillStyle='#b9d8e7'; ctx.strokeStyle='#31566d'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(0,-116,38,Math.PI,Math.PI*2); ctx.lineTo(30,-104); ctx.lineTo(-30,-104); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#8f2730'; ctx.beginPath(); ctx.moveTo(-42,-62); ctx.lineTo(-75,-15); ctx.lineTo(-50,15); ctx.closePath(); ctx.fill();
    ctx.strokeStyle='#e7c98b'; ctx.lineWidth=8; ctx.beginPath(); ctx.moveTo(62,-35); ctx.lineTo(104,-87); ctx.stroke();
    ctx.fillStyle='#d7b36a'; ctx.beginPath(); ctx.arc(104,-87,10,0,Math.PI*2); ctx.fill();
  } else if(def.id==='grisha'){
    ctx.fillStyle='#27184e'; ctx.strokeStyle='#d8bdff'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(-40,-104); ctx.lineTo(0,-156); ctx.lineTo(40,-104); ctx.lineTo(28,-73); ctx.lineTo(-28,-73); ctx.closePath(); ctx.fill(); ctx.stroke();
    ['#75d8ff','#e58bff','#ffcf65'].forEach((color,index)=>{ ctx.fillStyle=color; ctx.shadowColor=color; ctx.shadowBlur=12; ctx.beginPath(); ctx.arc(-42+index*42,-45-Math.sin(now*2+index)*8,9,0,Math.PI*2); ctx.fill(); }); ctx.shadowBlur=0;
  } else if(def.id==='golly'){
    ctx.fillStyle='#d9f7ff'; ctx.strokeStyle='#5eb9d8'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(-42,-122); ctx.lineTo(-25,-151); ctx.lineTo(-7,-128); ctx.lineTo(10,-151); ctx.lineTo(39,-120); ctx.lineTo(30,-91); ctx.lineTo(-31,-91); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#b8f6ff'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(0,-45,79+Math.sin(now*2)*4,Math.PI*1.05,Math.PI*1.95); ctx.stroke();
  } else if(def.id==='sasych'){
    ctx.fillStyle='#310d1b'; ctx.strokeStyle='#ff7180'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(-38,-103); ctx.lineTo(0,-151); ctx.lineTo(38,-103); ctx.lineTo(27,-75); ctx.lineTo(-27,-75); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#ff5368'; ctx.beginPath(); ctx.arc(-12,-105,5,0,Math.PI*2); ctx.arc(12,-105,5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#e9bfd0'; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(-61,-20); ctx.lineTo(-93,-70); ctx.moveTo(61,-20); ctx.lineTo(93,-70); ctx.stroke();
  } else if(def.id==='ilya'){
    ctx.fillStyle='#c8ef8d'; ctx.strokeStyle='#557f48'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.arc(0,-137,26,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#6c9b58'; ctx.beginPath(); ctx.arc(0,-102,39,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#8dff79'; ctx.lineWidth=3; ctx.globalAlpha=.8; ctx.beginPath(); ctx.arc(0,-50,89+Math.sin(now*2)*5,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1;
  } else if(def.id==='malit'){
    ctx.fillStyle='#4f2b26'; ctx.strokeStyle='#f0c69a'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(-42,-119); ctx.lineTo(-28,-151); ctx.lineTo(0,-158); ctx.lineTo(28,-151); ctx.lineTo(42,-119); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#e4b16f'; ctx.lineWidth=12; ctx.beginPath(); ctx.moveTo(67,-20); ctx.lineTo(105,-91); ctx.stroke();
    ctx.fillStyle='#e7c27e'; ctx.fillRect(90,-105,28,20);
  } else if(def.id==='arcady'){
    ctx.fillStyle='#ef5b32'; ctx.shadowColor='#ffb45b'; ctx.shadowBlur=18;
    ctx.beginPath(); ctx.moveTo(0,-157); ctx.lineTo(23,-113); ctx.lineTo(0,-125); ctx.lineTo(-23,-113); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle='#17202b'; ctx.strokeStyle='#ffd08a'; ctx.lineWidth=4; ctx.fillRect(-34,-117,27,16); ctx.fillRect(7,-117,27,16); ctx.strokeRect(-34,-117,27,16); ctx.strokeRect(7,-117,27,16);
    ctx.strokeStyle='#ff8a5e'; ctx.lineWidth=8; ctx.beginPath(); ctx.moveTo(53,-10); ctx.lineTo(108,-70); ctx.stroke();
  } else if(def.id==='illusionist'){
    ctx.fillStyle='#eadbff'; ctx.strokeStyle='#9b6cff'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(-39,-113); ctx.lineTo(0,-149); ctx.lineTo(39,-113); ctx.lineTo(26,-78); ctx.lineTo(-26,-78); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#fff'; ctx.globalAlpha=.75; ctx.beginPath(); ctx.moveTo(-82,-47); ctx.lineTo(-55,-75); ctx.lineTo(-44,-33); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(82,-47); ctx.lineTo(55,-75); ctx.lineTo(44,-33); ctx.closePath(); ctx.fill(); ctx.globalAlpha=1;
  } else if(def.id==='shadow'){
    ctx.fillStyle='#08030b'; ctx.strokeStyle='#ff4b24'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(-43,-105); ctx.lineTo(0,-165); ctx.lineTo(43,-105); ctx.lineTo(29,-68); ctx.lineTo(-29,-68); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#ff4b24'; ctx.shadowColor='#ff4b24'; ctx.shadowBlur=16; ctx.beginPath(); ctx.arc(-12,-104,6,0,Math.PI*2); ctx.arc(12,-104,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.strokeStyle='#ff7043'; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(64,-22); ctx.lineTo(104,-94); ctx.stroke();
  } else if(def.id==='regina'){
    ctx.fillStyle='#e9b39e'; ctx.strokeStyle='#59243c'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,-112,34,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#5a2940'; ctx.beginPath(); ctx.arc(0,-130,42,Math.PI,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#ff9fbd'; ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(-58,-34); ctx.lineTo(-92,-91); ctx.moveTo(58,-34); ctx.lineTo(92,-91); ctx.stroke();
    ctx.fillStyle='#fff0f5'; ctx.beginPath(); ctx.arc(-12,-112,4,0,Math.PI*2); ctx.arc(12,-112,4,0,Math.PI*2); ctx.fill();
  } else if(def.id==='electricGosha'){
    ctx.fillStyle='#7feaff'; ctx.strokeStyle='#237aa3'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(-40,-119); ctx.lineTo(-22,-158); ctx.lineTo(-6,-132); ctx.lineTo(9,-164); ctx.lineTo(24,-132); ctx.lineTo(43,-151); ctx.lineTo(39,-99); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#b9f8ff'; ctx.lineWidth=4; ctx.shadowColor='#7feaff'; ctx.shadowBlur=14;
    ctx.beginPath(); ctx.moveTo(-72,-36); ctx.lineTo(-39,-61); ctx.lineTo(-53,-80); ctx.moveTo(72,-36); ctx.lineTo(39,-61); ctx.lineTo(53,-80); ctx.stroke(); ctx.shadowBlur=0;
  }
  ctx.restore();
  }
  // Используем ту же модель, что и на карте боя: портреты в меню
  // теперь совпадают с реальными силуэтами героев в игре.
  const portraitUnit = {
    x:0, y:0, team:0, type:'hero', radius:24, atkRange:def.atkRange, def,
    dead:false, invisible:false, liftTimer:0, buffs:[],
    hitFlash:0, slowT:0, bkbActive:0, hpRegenBoost:false,
    hp:100, maxHp:100, mp:100, maxMp:100, level:1,
    facing:-Math.PI/2, isPlayer:false, shadowSouls:0,
    orbs:['Q','W','E']
  };
  ctx.save();
  const phase=def.id.length*0.73;
  const bob=Math.sin(now*1.65+phase)*3.2;
  const sway=Math.sin(now*1.05+phase)*2.5;
  ctx.translate(cx+sway,y+h*.84+bob);
  const portraitScale=Math.min(w/100,h/100);
  ctx.scale(portraitScale,portraitScale);
  ctx.rotate(Math.sin(now*1.15+phase)*0.018);
  portraitRenderMode=true;
  const savedGameTime=gameTime;
  gameTime=now;
  drawUnitSafely(portraitUnit);
  gameTime=savedGameTime;
  portraitRenderMode=false;
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle='rgba(255,225,168,.55)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(x,y,w,h,large ? 18 : 12); ctx.stroke();
  ctx.restore();
}

function drawHeroDetail(def){
  const now=performance.now()/1000;
  const background=ctx.createLinearGradient(0,0,VW,VH);
  background.addColorStop(0,'#070b14'); background.addColorStop(.55,'#14151e'); background.addColorStop(1,'#241015');
  ctx.fillStyle=background; ctx.fillRect(0,0,VW,VH);
  ctx.fillStyle='rgba(255,255,255,.035)';
  for(let i=-VH;i<VW;i+=54){ ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i+VH,VH); ctx.lineTo(i+VH+2,VH); ctx.lineTo(i+2,0); ctx.fill(); }

  const compact=VW<920;
  const leftX=compact?28:64, top=150, portraitW=compact?VW*.34:VW*.34, portraitH=Math.min(430,VH-258);
  drawHeroTexture(def,leftX,top,portraitW,portraitH,now,true);
  ctx.textAlign='left';
  ctx.fillStyle='#d7b36a'; ctx.font='bold 12px Consolas, monospace';
  ctx.fillText('ПРОФИЛЬ БОЙЦА  /  ' + String(def.id).toUpperCase(),leftX,top-18);
  ctx.fillStyle='#f6e6be'; ctx.font='bold '+(compact?'28':'38')+'px Georgia, serif';
  ctx.fillText(def.name,leftX,top+portraitH+44);
  ctx.fillStyle=def.color2; ctx.font='bold 14px Segoe UI, Arial';
  ctx.fillText(def.title.toUpperCase(),leftX,top+portraitH+68);

  const rightX=compact ? leftX+portraitW+22 : VW*.43;
  const rightW=VW-rightX-54;
  ctx.fillStyle='#f2e2bd'; ctx.font='bold 24px Georgia, serif';
  ctx.fillText('СПОСОБНОСТИ',rightX,top+6);
  ctx.fillStyle='rgba(215,179,106,.6)'; ctx.fillRect(rightX,top+19,rightW,2);
  const skills=def.skills.map(id=>SKILLS[id]).filter(Boolean);
  const skillGap=compact?8:10, skillH=compact?54:72;
  skills.forEach((sk,index)=>{
    const sy=top+34+index*(skillH+skillGap);
    if(sy+skillH>VH-112) return;
    const sw=rightW;
    ctx.fillStyle='rgba(12,17,27,.92)'; ctx.beginPath(); ctx.roundRect(rightX,sy,sw,skillH,9); ctx.fill();
    ctx.strokeStyle=sk.ult?'#ffd05c':'rgba(215,179,106,.35)'; ctx.lineWidth=sk.ult?2:1; ctx.stroke();
    const iconX=rightX+31, iconY=sy+skillH/2;
    ctx.fillStyle=sk.ult? '#70552a' : def.color;
    ctx.beginPath(); ctx.arc(iconX,iconY,21,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=sk.ult?'#ffe69a':def.color2; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#fff4d0'; ctx.textAlign='center'; ctx.font='bold 14px Segoe UI, Arial'; ctx.fillText(sk.short,iconX,iconY+5);
    ctx.textAlign='left'; ctx.fillStyle=sk.ult?'#ffd568':'#e8c984'; ctx.font='bold 14px Segoe UI, Arial';
    ctx.fillText(sk.name + (sk.ult?'  •  УЛЬТА':''),rightX+66,sy+24);
    ctx.fillStyle='rgba(255,255,255,.66)'; ctx.font='12px Segoe UI, Arial';
    const lines=wrapMenuText(sk.desc,sw-82,'12px Segoe UI, Arial');
    lines.slice(0,2).forEach((line,lineIndex)=>ctx.fillText(line,rightX+66,sy+43+lineIndex*15));
  });

  const statsY=compact?VH-86:top+portraitH+124;
  ctx.textAlign='left'; ctx.fillStyle='#f2e2bd'; ctx.font='bold 16px Segoe UI, Arial'; ctx.fillText('ХАРАКТЕРИСТИКИ',rightX,statsY);
  const stats=[
    ['ЗДОРОВЬЕ',Math.round(def.baseHp),'#ff7180'],
    ['МАНА',Math.round(def.baseMp),'#72caff'],
    ['АТАКА',Math.round(def.baseDmg),'#ffd568'],
    ['СКОРОСТЬ',Math.round(def.speed),'#72e6a5']
  ];
  stats.forEach((stat,index)=>{
    const sx=rightX+(index%2)*Math.max(140,rightW*.5), sy=statsY+26+Math.floor(index/2)*26;
    ctx.fillStyle='rgba(255,255,255,.48)'; ctx.font='10px Segoe UI, Arial'; ctx.fillText(stat[0],sx,sy);
    ctx.fillStyle=stat[2]; ctx.font='bold 14px Consolas, monospace'; ctx.fillText(String(stat[1]),sx+82,sy);
  });

  drawMenuButton(menuDetailBackRect(),'‹  К СПИСКУ',{radius:7});
  drawMenuButton(menuDetailTestRect(),'⚙  ТЕСТ-РЕЖИМ',{radius:8});
  drawMenuButton(menuDetailStartRect(),'✓  ВЫБРАТЬ И ИГРАТЬ',{primary:true,large:true,radius:8});
  ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,.46)'; ctx.font='12px Segoe UI, Arial';
  ctx.fillText('Нажми на способность, чтобы изучить героя перед боем',VW/2,VH-18);
}

function drawDraftSkillPanel(now){
  const heroIndex = draftPlayerIndex >= 0 ? draftPlayerIndex : selectedHeroIndex;
  const def = HERO_DEFS[heroIndex] || HERO_DEFS[0];
  const panel = {x:VW-330,y:270,w:300,h:VH-294};
  ctx.save();
  ctx.fillStyle='rgba(5,9,16,0.96)'; ctx.fillRect(panel.x,panel.y,panel.w,panel.h);
  ctx.strokeStyle=def.color2; ctx.lineWidth=2; ctx.strokeRect(panel.x,panel.y,panel.w,panel.h);
  ctx.textAlign='left'; ctx.fillStyle='#d7b36a'; ctx.font='bold 11px Consolas, monospace';
  ctx.fillText('ПРОСМОТР БОЙЦА',panel.x+16,panel.y+22);
  drawHeroTexture(def,panel.x+16,panel.y+34,panel.w-32,92,now);
  ctx.fillStyle='#f6e6be'; ctx.font='bold 18px Georgia, serif'; ctx.fillText(def.name,panel.x+16,panel.y+150);
  ctx.fillStyle=def.color2; ctx.font='12px Segoe UI, Arial'; ctx.fillText(def.title,panel.x+16,panel.y+169);
  ctx.fillStyle='#d7b36a'; ctx.font='bold 13px Segoe UI, Arial'; ctx.fillText('НАВЫКИ',panel.x+16,panel.y+194);
  const skills=def.skills.map(id=>SKILLS[id]).filter(Boolean);
  skills.forEach((skill,index)=>{
    const y=panel.y+207+index*67;
    if(y+58>panel.y+panel.h) return;
    ctx.fillStyle='rgba(24,31,48,0.9)'; ctx.fillRect(panel.x+12,y,panel.w-24,56);
    ctx.strokeStyle=skill.ult?'#ffd568':'rgba(139,233,253,0.42)'; ctx.lineWidth=skill.ult?2:1; ctx.strokeRect(panel.x+12,y,panel.w-24,56);
    ctx.fillStyle=skill.ult?'#ffd568':def.color2; ctx.font='bold 16px Segoe UI, Arial'; ctx.textAlign='center'; ctx.fillText(skill.short,panel.x+34,y+23);
    ctx.textAlign='left'; ctx.fillStyle='#fff0c7'; ctx.font='bold 11px Segoe UI, Arial'; ctx.fillText(skill.name,panel.x+56,y+18);
    ctx.fillStyle='rgba(255,255,255,0.62)'; ctx.font='10px Segoe UI, Arial';
    wrapMenuText(skill.desc || 'Описание отсутствует.',panel.w-78,'10px Segoe UI, Arial').slice(0,2).forEach((line,lineIndex)=>ctx.fillText(line,panel.x+56,y+34+lineIndex*12));
  });
  ctx.restore();
}

function drawStorePanel(){
  const panel={x:VW/2-330,y:VH/2-250,w:660,h:500};
  ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,VW,VH);
  ctx.save();
  ctx.fillStyle='rgba(7,12,22,0.98)'; ctx.fillRect(panel.x,panel.y,panel.w,panel.h);
  ctx.strokeStyle='#8be9fd'; ctx.lineWidth=2.5; ctx.strokeRect(panel.x,panel.y,panel.w,panel.h);
  ctx.textAlign='center'; ctx.fillStyle='#f2e2bd'; ctx.font='bold 28px Georgia, serif'; ctx.fillText('МАГАЗИН ФРАЗ',VW/2,panel.y+54);
  ctx.fillStyle='rgba(255,255,255,0.6)'; ctx.font='13px Segoe UI, Arial'; ctx.fillText('Откройте фразу и используйте её в катке клавишей K',VW/2,panel.y+82);
  STORE_PHRASE_CARDS.forEach((card,index)=>{
    const x=panel.x+18+(index%3)*216;
    const y=panel.y+150+Math.floor(index/3)*116;
    const owned=isStorePhraseOwned(card.id);
    ctx.fillStyle='rgba(24,31,48,0.95)'; ctx.fillRect(x,y,194,100);
    ctx.strokeStyle=owned?'#72e6a5':card.color; ctx.lineWidth=2; ctx.strokeRect(x,y,194,100);
    ctx.textAlign='left'; ctx.fillStyle=card.color; ctx.font='bold 12px Segoe UI, Arial'; ctx.fillText(card.title,x+12,y+24);
    ctx.fillStyle='#fff'; ctx.font='bold '+(card.desc.length>20?'11':'14')+'px Segoe UI, Arial'; ctx.fillText(card.desc,x+12,y+50);
    ctx.fillStyle=owned?'#72e6a5':'#ffd568'; ctx.font='bold 11px Segoe UI, Arial'; ctx.fillText(owned?'ПОЛУЧЕНО':'ПОЛУЧИТЬ БЕСПЛАТНО',x+12,y+76);
  });
  const close={x:panel.x+230,y:panel.y+426,w:200,h:44}; drawMenuButton(close,'ЗАКРЫТЬ',{active:true});
  ctx.restore();
}

function drawMenu(){
  const now = performance.now()/1000;
  const g = ctx.createLinearGradient(0,0,VW,VH);
  g.addColorStop(0, '#090b12');
  g.addColorStop(0.42, '#15121a');
  g.addColorStop(1, '#2a0e13');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,VW,VH);

  // Медленно движущиеся туманные пятна создают глубину без картинок и загрузок.
  ctx.save();
  for(let i=0;i<7;i++){
    const px = VW*(0.08 + i*0.15) + Math.sin(now*0.16+i*1.7)*70;
    const py = VH*(0.18 + (i%3)*0.32) + Math.cos(now*0.13+i)*40;
    const glow = ctx.createRadialGradient(px,py,0,px,py,Math.min(VW,VH)*0.32);
    glow.addColorStop(0, i%2 ? 'rgba(172,42,30,0.13)' : 'rgba(210,154,63,0.10)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(px-Math.min(VW,VH)*0.32,py-Math.min(VW,VH)*0.32,Math.min(VW,VH)*0.64,Math.min(VW,VH)*0.64);
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.strokeStyle = '#d5ad69';
  ctx.lineWidth = 1;
  for(let x=-VH; x<VW+VH; x+=58){
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x+VH,VH); ctx.stroke();
  }
  for(let y=0; y<VH; y+=58){
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(VW,y); ctx.stroke();
  }
  ctx.restore();

  // Декоративное кольцо и руны вокруг центрального блока.
  ctx.save();
  ctx.translate(VW/2, VH/2-30);
  ctx.rotate(now*0.025);
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle='#d6a85c'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,0,Math.min(VW,VH)*0.39,0,Math.PI*2); ctx.stroke();
  ctx.globalAlpha = 0.13;
  ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(0,0,Math.min(VW,VH)*0.45,0,Math.PI*2); ctx.stroke();
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6, r=Math.min(VW,VH)*0.39;
    ctx.fillStyle=i%3===0 ? '#d6a85c' : '#7e2927';
    ctx.fillRect(Math.cos(a)*r-2,Math.sin(a)*r-2,4,4);
  }
  ctx.restore();

  // Затемнение по краям, чтобы заголовок и кнопки читались как игровой интерфейс.
  const vignette = ctx.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*0.2,VW/2,VH/2,Math.max(VW,VH)*0.72);
  vignette.addColorStop(0,'rgba(0,0,0,0)');
  vignette.addColorStop(1,'rgba(0,0,0,0.70)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0,0,VW,VH);

  ctx.textAlign = 'center';
  ctx.font = 'bold 14px Segoe UI, Arial';
  ctx.fillStyle = '#d7b36a';
  ctx.fillText('АРЕНА ТРЁХ СИЛ  •  ONLINE', VW/2, 42);
  if(menuStage === 'home'){
    ctx.font = 'bold 58px Georgia, serif';
    ctx.fillStyle = '#f2e2bd';
    ctx.shadowColor = 'rgba(204,63,36,0.6)';
    ctx.shadowBlur = 18;
    ctx.fillText('DOTA SENS', VW/2, 102);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(188,48,36,0.9)';
    ctx.fillRect(VW/2-120, 119, 240, 3);
    ctx.fillStyle = 'rgba(255,225,168,0.55)';
    ctx.fillRect(VW/2-48, 119, 96, 3);
  }

  const settingsButton = menuSettingsRect();
  drawMenuButton(settingsButton,'⚙  НАСТРОЙКИ',{active:settingsOpen});

  if(settingsOpen){
    const panel = menuSettingsPanel();
    ctx.save();
    ctx.fillStyle='rgba(8,9,14,0.98)';
    ctx.fillRect(panel.x,panel.y,panel.w,panel.h);
    ctx.strokeStyle='#d7b36a'; ctx.lineWidth=2; ctx.strokeRect(panel.x,panel.y,panel.w,panel.h);
    ctx.strokeStyle='rgba(185,48,36,0.8)'; ctx.lineWidth=1; ctx.strokeRect(panel.x+10,panel.y+10,panel.w-20,panel.h-20);
    ctx.textAlign='center';
    ctx.fillStyle='#f2e2bd'; ctx.font='bold 28px Georgia, serif';
    ctx.fillText('НАСТРОЙКИ',VW/2,panel.y+58);
    ctx.fillStyle='rgba(215,179,106,0.8)'; ctx.fillRect(panel.x+165,panel.y+74,230,2);
    ctx.textAlign='left';
    ctx.fillStyle='#fff1d0'; ctx.font='bold 16px Segoe UI, Arial';
    ctx.fillText('Звук меню',panel.x+36,panel.y+96);
    ctx.fillStyle='rgba(255,255,255,0.52)'; ctx.font='13px Segoe UI, Arial';
    ctx.fillText('Атмосферная тема играет только на главном экране.',panel.x+36,panel.y+120);

    const musicToggle = {x:panel.x+36,y:panel.y+142,w:244,h:48};
    const musicHover = mouse.x>=musicToggle.x && mouse.x<=musicToggle.x+musicToggle.w &&
                       mouse.y>=musicToggle.y && mouse.y<=musicToggle.y+musicToggle.h;
    ctx.fillStyle=musicEnabled || musicHover ? 'rgba(139,44,35,0.44)' : 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.roundRect(musicToggle.x,musicToggle.y,musicToggle.w,musicToggle.h,7); ctx.fill();
    ctx.strokeStyle=musicEnabled || musicHover ? '#d7b36a' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth=1.5; ctx.stroke();
    ctx.textAlign='left'; ctx.fillStyle='#fff'; ctx.font='bold 14px Segoe UI, Arial';
    ctx.fillText('МУЗЫКА МЕНЮ',musicToggle.x+16,musicToggle.y+21);
    ctx.fillStyle=musicEnabled ? '#e2b866' : 'rgba(255,255,255,0.45)';
    ctx.font='12px Segoe UI, Arial';
    ctx.fillText(musicEnabled ? 'ВКЛЮЧЕНА' : 'ВЫКЛЮЧЕНА',musicToggle.x+16,musicToggle.y+38);
    const switchX=musicToggle.x+musicToggle.w-48, switchY=musicToggle.y+13;
    ctx.fillStyle=musicEnabled ? '#c94d35' : '#3d424b';
    ctx.beginPath(); ctx.roundRect(switchX,switchY,32,20,10); ctx.fill();
    ctx.fillStyle='#f9e6bd';
    ctx.beginPath(); ctx.arc(switchX+(musicEnabled?22:10),switchY+10,7,0,Math.PI*2); ctx.fill();

    ctx.textAlign='left'; ctx.fillStyle='#fff1d0'; ctx.font='bold 15px Segoe UI, Arial';
    ctx.fillText('БИНДЫ ПРЕДМЕТОВ',panel.x+36,panel.y+226);
    ctx.fillStyle='rgba(255,255,255,0.52)'; ctx.font='12px Segoe UI, Arial';
    ctx.fillText('Нажмите слот, затем нужную клавишу.',panel.x+36,panel.y+246);
    for(let index=0;index<6;index++){
      const row={x:panel.x+36+(index%3)*164,y:panel.y+262+Math.floor(index/3)*64,w:148,h:46};
      const active=rebindSlot===index;
      ctx.fillStyle=active?'rgba(215,179,106,0.35)':'rgba(255,255,255,0.06)'; ctx.fillRect(row.x,row.y,row.w,row.h);
      ctx.strokeStyle=active?'#ffd568':'rgba(255,255,255,0.25)'; ctx.lineWidth=active?2:1; ctx.strokeRect(row.x,row.y,row.w,row.h);
      ctx.fillStyle='#fff'; ctx.font='bold 12px Segoe UI, Arial'; ctx.fillText('СЛОТ '+(index+1),row.x+10,row.y+18);
      ctx.fillStyle=active?'#ffd568':'#8be9fd'; ctx.font='bold 18px Consolas, monospace'; ctx.fillText(active?'...':inventoryBinds[index].toUpperCase(),row.x+108,row.y+29);
    }
    const close = {x:panel.x+190,y:panel.y+452,w:180,h:44};
    drawMenuButton(close,'ГОТОВО',{});
    ctx.restore();
    return;
  }

  if(storeOpen){ drawStorePanel(); return; }

  if(changelogOpen){
    const panel={x:Math.max(18,VW/2-360),y:Math.max(22,VH/2-280),w:Math.min(720,VW-36),h:Math.min(560,VH-44)};
    ctx.fillStyle='rgba(0,0,0,0.52)'; ctx.fillRect(0,0,VW,VH);
    ctx.save();
    ctx.fillStyle='rgba(9,10,15,0.98)';
    ctx.beginPath(); ctx.roundRect(panel.x,panel.y,panel.w,panel.h,12); ctx.fill();
    ctx.strokeStyle='#d7b36a'; ctx.lineWidth=2.5; ctx.stroke();
    ctx.strokeStyle='rgba(185,48,36,0.8)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(panel.x+9,panel.y+9,panel.w-18,panel.h-18,7); ctx.stroke();
    ctx.fillStyle='rgba(185,48,36,0.16)';
    ctx.fillRect(panel.x+1,panel.y+62,panel.w-2,1);
    ctx.textAlign='left'; ctx.fillStyle='#d7b36a'; ctx.font='bold 24px Georgia, serif';
    ctx.fillText('ЖУРНАЛ ОБНОВЛЕНИЙ',panel.x+28,panel.y+40);
    ctx.fillStyle='rgba(255,238,194,0.55)'; ctx.font='12px Consolas, monospace';
    ctx.fillText('DOTA SENS  /  VERSION ' + GAME_VERSION,panel.x+30,panel.y+57);
    const close={x:panel.x+panel.w-142,y:panel.y+18,w:116,h:34};
    drawMenuButton(close,'X  ЗАКРЫТЬ',{active:true});
    const viewport={x:panel.x+24,y:panel.y+78,w:panel.w-48,h:panel.h-142};
    ctx.save(); ctx.beginPath(); ctx.rect(viewport.x,viewport.y,viewport.w,viewport.h); ctx.clip();
    ctx.font='14px Segoe UI, Arial';
    CHANGELOG.forEach((entry,index)=>{
      const rowY=viewport.y+26+index*62-changelogScroll;
      ctx.fillStyle=index%2 ? 'rgba(255,255,255,0.025)' : 'rgba(37,105,160,0.16)';
      ctx.beginPath(); ctx.roundRect(viewport.x,rowY-22,viewport.w-12,52,4); ctx.fill();
      ctx.fillStyle='#c8543d'; ctx.beginPath(); ctx.arc(viewport.x+16,rowY-4,3,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(235,246,255,0.9)';
      wrapMenuText(entry,viewport.w-54,'14px Segoe UI, Arial').slice(0,2).forEach((line,lineIndex)=>ctx.fillText(line,viewport.x+30,rowY+lineIndex*17));
    });
    ctx.restore();
    const contentHeight=CHANGELOG.length*62, viewportHeight=viewport.h;
    const thumbH=Math.max(28,viewportHeight*Math.min(1,viewportHeight/contentHeight));
    const thumbY=viewport.y+(viewportHeight-thumbH)*(changelogScroll/Math.max(1,contentHeight-viewportHeight));
    ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.fillRect(viewport.x+viewport.w-8,viewport.y,5,viewportHeight);
    ctx.fillStyle='#d7b36a'; ctx.fillRect(viewport.x+viewport.w-8,thumbY,5,thumbH);
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='12px Segoe UI, Arial'; ctx.textAlign='left';
    ctx.fillText('Прокрутите список колесом мыши',panel.x+30,panel.y+panel.h-30);
    ctx.restore();
    return;
  }

  if(menuStage === 'home'){
    ctx.textAlign = 'center';
    ctx.font = '20px Segoe UI, Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.fillText('Сражение героев, предметов и древних сил', VW/2, VH/2-92);
    const play = menuPlayRect();
    drawMenuButton(play,'ИГРАТЬ',{primary:true,large:true,radius:10});
    const fightersButton = menuFightersRect();
    drawMenuButton(fightersButton,'⚔  БОЙЦЫ',{active:true,radius:8});
    const changelog = {x:VW/2-155,y:VH/2+178,w:310,h:48};
    drawMenuButton(changelog,'▣  CHANGELOG',{radius:8});
    const storeButton=menuStoreRect();
    drawMenuButton(storeButton,'♫  МАГАЗИН ФРАЗ',{radius:8});
    ctx.font = '14px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText('Нажми «БОЙЦЫ», чтобы открыть профиль и способности героя', VW/2, changelog.y+72);
    return;
  }

  if(menuStage === 'heroDetail'){
    drawHeroDetail(HERO_DEFS[selectedHeroIndex] || HERO_DEFS[0]);
    return;
  }

  if(menuStage === 'draft'){
    const now=performance.now()/1000, remaining=Math.ceil(draftTime);
    ctx.textAlign='center'; ctx.fillStyle='#f6e6be'; ctx.font='bold 27px Georgia, serif';
    ctx.fillText('ВЫБОР БОЙЦОВ  •  3 НА 3',VW/2,72);
    ctx.fillStyle=remaining<=10?'#ff7568':'#d7b36a'; ctx.font='bold 30px Consolas, monospace'; ctx.fillText(remaining+' СЕК',VW/2,108);
    ctx.font='13px Segoe UI, Arial'; ctx.fillStyle='rgba(255,255,255,.68)'; ctx.fillText(draftPlayerIndex<0?'Выберите бойца для своей команды':'Боец выбран. Боты уже определились.',VW/2,132);
    const slots=[{label:'ВЫ',index:draftPlayerIndex,team:'#72e6a5'},...draftBotIndices.map((index,i)=>({label:'БОТ '+(i+1),index,team:i<2?'#72e6a5':'#ff8585'}))];
    slots.forEach((slot,index)=>{ const x=18+index*((VW-36)/6), w=(VW-54)/6; ctx.fillStyle='rgba(5,9,16,.82)'; ctx.fillRect(x,138,w,106); ctx.strokeStyle=slot.team; ctx.lineWidth=2; ctx.strokeRect(x,138,w,106); ctx.fillStyle=slot.team; ctx.font='bold 11px Segoe UI, Arial'; ctx.fillText(slot.label,x+w/2,156); if(slot.index>=0) drawHeroTexture(HERO_DEFS[slot.index],x+8,164,w-16,68,now); else { ctx.fillStyle='rgba(255,255,255,.45)'; ctx.font='12px Segoe UI, Arial'; ctx.fillText('ОЖИДАНИЕ',x+w/2,202); } });
    drawDraftSkillPanel(now);
    const back={x:24,y:78,w:120,h:38}; drawMenuButton(back,'‹  НАЗАД',{radius:7});
    for(let i=0;i<HERO_DEFS.length;i++){ const r=menuCardRect(i), selected=i===draftPlayerIndex; drawHeroTexture(HERO_DEFS[i],r.x,r.y,r.w,r.h,now); if(selected){ ctx.strokeStyle='#ffd568'; ctx.lineWidth=4; ctx.strokeRect(r.x-2,r.y-2,r.w+4,r.h+4); } ctx.fillStyle='rgba(4,7,12,.76)'; ctx.fillRect(r.x,r.y+r.h-24,r.w,24); ctx.fillStyle='#fff'; ctx.font='bold 12px Segoe UI, Arial'; ctx.fillText(HERO_DEFS[i].name,r.x+r.w/2,r.y+r.h-8); }
    return;
  }

  const back = {x:24,y:78,w:120,h:38};
  drawMenuButton(back,'‹  НАЗАД',{radius:7});
  const fightersTab = {x:VW/2-92,y:72,w:184,h:38};
  drawMenuButton(fightersTab,'⚔  БОЙЦЫ',{active:true,radius:7});

  ctx.font = '18px Segoe UI, Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.textAlign = 'center';
  ctx.fillText('Все бойцы в одном ростере  •  нажми на карточку для подробностей', VW/2, 128);
  ctx.textAlign = 'right';
  ctx.font = 'bold 14px Consolas, monospace';
  ctx.fillStyle = '#ffd568';
  ctx.fillText(GAME_VERSION, VW-24, 30);

  const pageStart = 0;
  const pageEnd = HERO_DEFS.length;
  for(let i=pageStart;i<pageEnd;i++){
    const def = HERO_DEFS[i];
    const r = menuCardRect(i-pageStart);
    const hover = (mouse.x>=r.x && mouse.x<=r.x+r.w && mouse.y>=r.y && mouse.y<=r.y+r.h);

    ctx.save();
    const card = ctx.createLinearGradient(r.x,r.y,r.x,r.y+r.h);
    card.addColorStop(0, hover ? 'rgba(91,39,35,0.98)' : 'rgba(30,25,29,0.97)');
    card.addColorStop(1, hover ? 'rgba(36,23,27,0.99)' : 'rgba(10,11,16,0.98)');
    ctx.fillStyle = card;
    ctx.shadowColor = hover ? 'rgba(197,70,47,0.52)' : 'rgba(0,0,0,0.42)';
    ctx.shadowBlur = hover ? 22 : 10;
    ctx.beginPath(); ctx.roundRect(r.x,r.y,r.w,r.h,14); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = hover ? '#dfb86f' : 'rgba(215,179,106,0.42)';
    ctx.lineWidth = hover ? 3 : 1.5;
    ctx.stroke();
    ctx.strokeStyle = hover ? 'rgba(229,91,61,0.78)' : 'rgba(185,48,36,0.42)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(r.x+7,r.y+7,r.w-14,r.h-14,9); ctx.stroke();
    ctx.fillStyle = def.color;
    ctx.globalAlpha = hover ? 0.18 : 0.09;
    ctx.fillRect(r.x, r.y, r.w, 6);
    ctx.globalAlpha = 1;

     const portraitH=Math.min(76,Math.max(52,r.h*.46));
     drawHeroTexture(def,r.x+10,r.y+10,r.w-20,portraitH,now,false);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
     const cx = r.x + r.w/2;
     ctx.font = 'bold '+(r.w<200?'15':'18')+'px Georgia, serif';
     let cardName=def.name;
     while(cardName.length>5 && ctx.measureText(cardName).width>r.w-16) cardName=cardName.slice(0,-1);
     if(cardName!==def.name) cardName+='…';
     ctx.fillText(cardName, cx, r.y+portraitH+28);
     ctx.font = (r.w<200?'9':'11')+'px Segoe UI, Arial';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
     let cardTitle=def.title;
     while(cardTitle.length>8 && ctx.measureText(cardTitle).width>r.w-16) cardTitle=cardTitle.slice(0,-1);
     if(cardTitle!==def.title) cardTitle+='…';
     ctx.fillText(cardTitle, cx, r.y+portraitH+45);

     ctx.textAlign = 'left';
     ctx.fillStyle='rgba(255,255,255,.38)'; ctx.font='10px Segoe UI, Arial';
     ctx.fillText('Открыть профиль →',r.x+17,r.y+r.h-14);
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.font = '13px Segoe UI, Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('ЛКМ по карточке — профиль героя  •  Q W E R F — скиллы в бою  •  ПКМ — движение',
               VW/2, VH - 16);
}

function drawOver(){
  const won = winner === 0;
  const accent = won ? '#69f08a' : '#ff6672';
  const now = performance.now() / 1000;
  const glow = ctx.createRadialGradient(VW/2,VH*.38,20,VW/2,VH*.38,Math.max(VW,VH)*.72);
  glow.addColorStop(0, won ? 'rgba(45,150,92,.28)' : 'rgba(170,35,52,.28)');
  glow.addColorStop(1, 'rgba(3,7,15,.98)');
  ctx.fillStyle = glow; ctx.fillRect(0,0,VW,VH);
  ctx.save();
  ctx.globalAlpha = .22;
  ctx.strokeStyle = accent; ctx.lineWidth = 2;
  for(let i=0;i<18;i++){
    const angle = i*Math.PI/9 + now*.08;
    const radius = Math.min(VW,VH)*(.18 + (i%3)*.04);
    ctx.beginPath(); ctx.moveTo(VW/2,VH*.38);
    ctx.lineTo(VW/2+Math.cos(angle)*radius,VH*.38+Math.sin(angle)*radius); ctx.stroke();
  }
  ctx.restore();

  const panel={x:Math.max(18,VW/2-310),y:Math.max(92,VH/2-235),w:Math.min(620,VW-36),h:470};
  ctx.fillStyle='rgba(5,12,24,.94)'; ctx.fillRect(panel.x,panel.y,panel.w,panel.h);
  ctx.strokeStyle=accent; ctx.lineWidth=2.5; ctx.strokeRect(panel.x,panel.y,panel.w,panel.h);
  ctx.strokeStyle='rgba(255,255,255,.16)'; ctx.lineWidth=1; ctx.strokeRect(panel.x+10,panel.y+10,panel.w-20,panel.h-20);
  ctx.textAlign='center';
  ctx.font='bold 15px Consolas, monospace'; ctx.fillStyle='rgba(255,255,255,.6)';
  ctx.fillText('АРЕНА ТРЁХ СИЛ  /  МАТЧ ЗАВЕРШЁН',VW/2,panel.y+42);
  ctx.font='900 '+Math.round(Math.min(72,VW/8))+'px Segoe UI, Arial Black, sans-serif';
  ctx.fillStyle=accent; ctx.shadowColor=accent; ctx.shadowBlur=22;
  ctx.fillText(won ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ',VW/2,panel.y+128); ctx.shadowBlur=0;
  ctx.font='bold 17px Segoe UI, Arial'; ctx.fillStyle='#e7f0ff';
  ctx.fillText(won ? 'Древний врага пал. Поле боя твоё.' : 'Твой древний пал. В следующий бой.',VW/2,panel.y+165);

  if(playerHero){
    const statsY=panel.y+220;
    ctx.textAlign='left'; ctx.font='bold 13px Segoe UI, Arial'; ctx.fillStyle='rgba(255,255,255,.55)';
    ctx.fillText('ГЕРОЙ',panel.x+54,statsY); ctx.fillText('У/С/П',panel.x+54,statsY+38); ctx.fillText('МОНЕТЫ',panel.x+54,statsY+76);
    ctx.textAlign='right'; ctx.font='bold 16px Segoe UI, Arial'; ctx.fillStyle='#fff';
    ctx.fillText(playerHero.def.name,panel.x+panel.w-54,statsY); ctx.fillText(playerHero.kills+' / '+playerHero.deaths+' / '+playerHero.assists,panel.x+panel.w-54,statsY+38); ctx.fillText(Math.floor(playerHero.coins),panel.x+panel.w-54,statsY+76);
  }
  const button={x:VW/2-150,y:panel.y+350,w:300,h:52};
  ctx.fillStyle=won ? '#245d42' : '#6a2934'; ctx.fillRect(button.x,button.y,button.w,button.h);
  ctx.strokeStyle=accent; ctx.lineWidth=2; ctx.strokeRect(button.x,button.y,button.w,button.h);
  ctx.font='bold 16px Segoe UI, Arial'; ctx.fillStyle='#fff'; ctx.textAlign='center';
  ctx.fillText('ВЕРНУТЬСЯ В МЕНЮ',VW/2,button.y+32);
  ctx.font='12px Segoe UI, Arial'; ctx.fillStyle='rgba(255,255,255,.5)';
  ctx.fillText('Нажми в любом месте или на кнопку выше',VW/2,panel.y+430);
}

let lastTime = performance.now();
function loop(now){
  try {
    let dt = (now - lastTime)/1000;
    lastTime = now;
    if(dt > 0.1) dt = 0.1;

    ctx.setTransform(1,0,0,1,0,0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.clearRect(0,0,VW,VH);

    if(gameState === 'menu'){
      startMenuMusic();
      updateDraft(dt);
      updateMenuHover();
      drawMenu();
    } else {
      stopMenuMusic();
      update(dt);
      if(!Number.isFinite(cam.x) || !Number.isFinite(cam.y)){
        cam.x = playerHero && Number.isFinite(playerHero.x) ? playerHero.x : WORLD/2;
        cam.y = playerHero && Number.isFinite(playerHero.y) ? playerHero.y : WORLD/2;
        cameraManual = false;
      }
      ctx.save();
      ctx.translate(-cam.x + VW/2, -cam.y + VH/2);
      drawTerrain();
      drawWorldObjects();
      ctx.restore();
      drawFog();
      drawMinimap();
      drawHUD();
      if(testMode) drawTestPanel();
      drawKillStreakBanner();
      drawScoreboard();
      if(gameState === 'over') drawOver();
    }
  } catch(err) {
    /* Один повреждённый эффект/ассет не должен отменять следующий кадр. */
    console.error('Ошибка игрового кадра:', err);
    ctx.setTransform(1,0,0,1,0,0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    ctx.fillStyle = '#080b12';
    ctx.fillRect(0,0,VW,VH);
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ctx.font = 'bold 16px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Восстановление игрового кадра…', VW/2, VH/2);
  } finally {
    requestAnimationFrame(loop);
  }
}

function updateMenuHover(){
  menuHover = -1;
  const pageStart = menuHeroPage * HERO_PAGE_SIZE;
  const pageEnd = Math.min(HERO_DEFS.length, pageStart + HERO_PAGE_SIZE);
  for(let i=pageStart;i<pageEnd;i++){
    const r = menuCardRect(i-pageStart);
    if(mouse.x>=r.x && mouse.x<=r.x+r.w && mouse.y>=r.y && mouse.y<=r.y+r.h) menuHover = i;
  }
}

function resize(){
  VW = canvas.width  = window.innerWidth;
  VH = canvas.height = window.innerHeight;
  fogCanvas.width  = VW;
  fogCanvas.height = VH;
}
window.addEventListener('resize', resize);
resize();

requestAnimationFrame(loop);

/* Authoritative online adapter: the server is the only simulation source. */
(() => {
  let socket = null;
  let onlineId = null;
  let onlineRoster = null;
  let rosterSignature = '';
  let serverGameState = null;
  let serverDamageVersion = -1;
  let statsSequence = 0;
  let authoritativeMode = false;
  const remoteHeroes = new Map();
  const remoteBulletIds = new Set();

  function attachAuthoritativeSocket(){
    const candidate = window.__shadowOnlineSocket;
    if(!candidate || candidate === socket) return;
    socket = candidate;
    socket.on('match:begin', beginAuthoritativeMatch);
    socket.on('gameState', state => {
      serverGameState = state;
      syncRosterFromState(state);
    });
    socket.on('playerVitals', applyLocalVitals);
    socket.on('match:player-left', data => {
      addText(playerHero ? playerHero.x : WORLD/2, playerHero ? playerHero.y : WORLD/2, data.message, '#ffd568', 2, 16);
    });
    if(window.__shadowOnlineMatch) beginAuthoritativeMatch(window.__shadowOnlineMatch);
  }

  function beginAuthoritativeMatch(payload){
    if(onlineId) return;
    if(!payload || !Array.isArray(payload.roster) || payload.roster.length < 2 || payload.roster.length > 6){
      showMatchStartError('Для матча нужны от 2 до 6 игроков.');
      return;
    }
    const local = payload.roster.find(member => member.id === payload.id);
    if(!local){
      showMatchStartError('Ваш герой не найден в составе матча.');
      return;
    }
    const bySlot = (left,right) => left.slot-right.slot;
    const own = payload.roster.filter(member => member.team === local.team).sort(bySlot);
    const enemy = payload.roster.filter(member => member.team !== local.team).sort(bySlot);
    if(!own.length || !enemy.length || own.length > 3 || enemy.length > 3 || Math.abs(own.length-enemy.length)>1){
      showMatchStartError('Нужно от 1 до 3 игроков в каждой команде.');
      return;
    }
    const heroIdOf = member => member.hero || member.heroId;
    const heroIndex = HERO_DEFS.findIndex(hero => hero.id === heroIdOf(local));
    const heroIndexOf = member => HERO_DEFS.findIndex(hero => hero.id === heroIdOf(member));
    const ownOthers = own.filter(member => member.id !== local.id);
    const fallback = heroIndex;
    const picks = [enemy[0] ? heroIndexOf(enemy[0]) : fallback,
      ownOthers[0] ? heroIndexOf(ownOthers[0]) : fallback,
      ownOthers[1] ? heroIndexOf(ownOthers[1]) : fallback,
      enemy[1] ? heroIndexOf(enemy[1]) : fallback,
      enemy[2] ? heroIndexOf(enemy[2]) : fallback];
    if(heroIndex < 0 || picks.some(index => index < 0)){
      showMatchStartError('Сервер прислал неизвестного героя.');
      return;
    }
    try {
      onlineId = payload.id;
      onlineRoster = payload.roster;
      rosterSignature = onlineRoster.map(member => `${member.id}:${member.slot}:${member.team}:${heroIdOf(member)}`).join('|');
      originalStartGame(heroIndex, picks);
      orientOnlineMapForTeam(local.team);
      authoritativeMode = true;
      bindRosterHeroes();
      serverGameState = payload.state || null;
      const localState = serverGameState && serverGameState.players.find(player => player.id === onlineId);
      if(localState && playerHero){
        localState.hp = playerHero.hp;
        localState.maxHp = playerHero.maxHp;
        localState.gold = playerHero.coins;
        serverDamageVersion = Number.isInteger(localState.damageVersion) ? localState.damageVersion : 0;
      }
      applyAuthoritativeState();
      sendPlayerStats();
      document.getElementById('mode-picker')?.setAttribute('hidden','');
    } catch(error) {
      onlineId = null;
      onlineRoster = null;
      authoritativeMode = false;
      gameState = 'menu';
      menuStage = 'home';
      console.error('Не удалось запустить матч:', error);
      showMatchStartError(error.message || 'Неизвестная ошибка.');
    }
  }

  function showMatchStartError(message){
    const picker = document.getElementById('mode-picker');
    const status = document.getElementById('match-status');
    if(picker) picker.hidden = false;
    if(status) status.textContent = 'Не удалось запустить матч: ' + message;
  }

  function bindRosterHeroes(){
    if(!onlineRoster || !heroes.length) return;
    const local = onlineRoster.find(member => member.id === onlineId);
    if(!local) return;
    const bySlot = (left,right) => left.slot-right.slot;
    const own = onlineRoster.filter(member => member.team === local.team).sort(bySlot);
    const enemy = onlineRoster.filter(member => member.team !== local.team).sort(bySlot);
    const ownOthers = own.filter(member => member.id !== local.id);
    const slots = [
      {member:local,hero:playerHero},
      {member:ownOthers[0],hero:heroes[1]},
      {member:ownOthers[1],hero:heroes[2]},
      {member:enemy[0],hero:heroes[3]},
      {member:enemy[1],hero:heroes[4]},
      {member:enemy[2],hero:heroes[5]}
    ].filter(slot => slot.member && slot.hero);
    const currentIds = new Set(slots.map(slot => slot.member.id));
    for(const [id,hero] of remoteHeroes){
      if(currentIds.has(id)) continue;
      remoteHeroes.delete(id);
      units = units.filter(unit => unit !== hero);
      heroes = heroes.filter(unit => unit !== hero);
    }
    for(const {member,hero} of slots){
      if(remoteHeroes.has(member.id)) continue;
      remoteHeroes.set(member.id,hero);
    }
    const localTeam = local ? local.team : 0;
    for(const {member} of slots){
      const hero = remoteHeroes.get(member.id);
      if(!hero) continue;
      hero.team = member.team === localTeam ? 0 : 1;
      hero.isOnlineRemote = member.id !== onlineId;
      hero.isPlayer = member.id === onlineId;
      hero.onlinePlayerId = member.id;
      if(hero.isOnlineRemote){
        hero.updateAI = function(){};
        hero.updateCombat = function(){};
      } else {
        delete hero.updateAI;
        delete hero.updateCombat;
      }
    }
    const activeHeroes = new Set(remoteHeroes.values());
    units = units.filter(unit => unit.type !== 'hero' || activeHeroes.has(unit));
    heroes = heroes.filter(hero => activeHeroes.has(hero));
    playerHero = remoteHeroes.get(onlineId) || playerHero;
  }

  function syncRosterFromState(state){
    if(!authoritativeMode || !state || !Array.isArray(state.players)) return;
    const nextRoster = state.players.map(player => ({
      id:player.id, slot:player.slot, team:player.team, bot:false,
      hero:player.heroId, heroId:player.heroId
    }));
    if(!nextRoster.some(member => member.id === onlineId)) return;
    const signature = nextRoster.map(member => `${member.id}:${member.slot}:${member.team}:${member.heroId}`).join('|');
    if(signature === rosterSignature) return;
    rosterSignature = signature;
    onlineRoster = nextRoster;
    bindRosterHeroes();
  }

  function applyAuthoritativeState(){
    if(!authoritativeMode || !serverGameState || !Array.isArray(serverGameState.players)) return;
    for(const remote of serverGameState.players){
      const hero = remoteHeroes.get(remote.id);
      if(!hero) continue;
      hero.x = remote.x; hero.y = remote.y; hero.facing = remote.angle;
      if(remote.id === onlineId){
        if(Number.isInteger(remote.damageVersion) && remote.damageVersion >= serverDamageVersion &&
           (!remote.alive || hero.dead || remote.damageVersion > serverDamageVersion)) applyLocalVitals(remote);
      } else {
        hero.hp = remote.hp;
        hero.maxHp = remote.maxHp;
        hero.dead = !remote.alive;
        hero.respawnTimer = Math.max(0,Number(remote.respawnTimer)||0);
        if(Number.isFinite(remote.gold)) hero.coins = remote.gold;
      }
    }
    for(const bullet of serverGameState.bullets || []){
      if(remoteBulletIds.has(bullet.id)) continue;
      remoteBulletIds.add(bullet.id);
      fxRing(bullet.x, bullet.y, 16, bullet.team === 0 ? '#8be9fd' : '#ff8a3d', .12);
    }
    if(remoteBulletIds.size > 1000) remoteBulletIds.clear();
  }

  const originalStartGame = startGame;
  const originalUpdate = update;
  update = function(){
    originalUpdate.apply(this, arguments);
    if(authoritativeMode) applyAuthoritativeState();
  };

  function sendInput(action){
    if(!socket || !socket.connected) return;
    socket.emit('playerInput', action);
  }
  function sendPlayerStats(){
    if(!socket || !socket.connected || !authoritativeMode || !playerHero) return;
    socket.emit('playerStats',{
      hp:playerHero.hp,maxHp:playerHero.maxHp,gold:playerHero.coins,
      alive:!playerHero.dead,respawnTimer:Math.max(0,playerHero.respawnTimer||0),
      damageVersion:serverDamageVersion,sequence:++statsSequence
    });
  }
  function applyLocalVitals(vitals){
    if(!vitals || vitals.id !== onlineId || !playerHero) return;
    if(Number.isInteger(vitals.damageVersion) && vitals.damageVersion < serverDamageVersion) return;
    if(Number.isInteger(vitals.damageVersion)) serverDamageVersion = vitals.damageVersion;
    if(Number.isFinite(vitals.maxHp)) playerHero.maxHp = vitals.maxHp;
    if(vitals.alive === false){
      if(!playerHero.dead){
        playerHero.dead = true;
        playerHero.deaths++;
        playerHero.killStreak = 0;
        playerHero.lastHeroKillTime = -Infinity;
      }
      playerHero.hp = 0;
      playerHero.respawnTimer = Math.max(0,Number(vitals.respawnTimer)||0);
      return;
    }
    if(vitals.alive === true && playerHero.dead){
      playerHero.respawnTimer = 0;
      playerHero.update(0);
    }
    if(Number.isFinite(vitals.hp)) playerHero.hp = vitals.hp;
    if(Number.isFinite(vitals.respawnTimer)) playerHero.respawnTimer = Math.max(0,vitals.respawnTimer);
  }
  function onlineKeyFromEvent(event){
    return PHYSICAL_KEY_LETTER[event.code] || (event.key || '').toLowerCase();
  }
  window.addEventListener('keydown', event => {
    if(!authoritativeMode) return;
    sendInput({type:'key', key:onlineKeyFromEvent(event), down:true, angle:playerHero ? playerHero.facing : 0});
  }, true);
  window.addEventListener('keyup', event => {
    if(!authoritativeMode) return;
    sendInput({type:'key', key:onlineKeyFromEvent(event), down:false});
  }, true);
  canvas.addEventListener('mousemove', () => {
    if(authoritativeMode && playerHero) sendInput({angle:playerHero.facing});
  }, true);
  canvas.addEventListener('mousedown', event => {
    if(!authoritativeMode || !playerHero) return;
    if(event.button === 2) sendInput({type:'move', moveTarget:{x:mouse.wx,y:mouse.wy}, angle:playerHero.facing});
    if(event.button === 0) sendInput({type:'shoot', angle:playerHero.facing});
  }, true);
  setInterval(() => {
    attachAuthoritativeSocket();
    if(authoritativeMode && playerHero) sendInput({type:'aim', angle:playerHero.facing});
    if(authoritativeMode) sendPlayerStats();
    const entry = document.getElementById('online-entry');
    if(entry) entry.style.display = gameState === 'menu' && menuStage === 'home' ? 'block' : 'none';
  }, 50);
})();
