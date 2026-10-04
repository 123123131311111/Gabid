
"use strict";

const clamp = (v,a,b) => v<a?a:(v>b?b:v);
const rnd   = (a,b) => a + Math.random()*(b-a);

const canvas = document.getElementById('game');
let ctx    = canvas.getContext('2d');
const onlineEntryElement = document.getElementById('online-entry');
const terrainFrameCanvas = document.createElement('canvas');
const terrainFrameCtx = terrainFrameCanvas.getContext('2d');
let terrainFrameValid = false;
let terrainFrameIndex = 0;
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
/* ===== ТЕКСТУРЫ КАРТЫ 0.7.6: зелёный лес Света, чёрный лес Тьмы, вода и песок ===== */
function mulberry32(seed){
  let a = seed|0;
  return function(){
    a = (a + 0x6D2B79F5)|0;
    let t = Math.imul(a ^ (a>>>15), 1|a);
    t = (t + Math.imul(t ^ (t>>>7), 61|t)) ^ t;
    return ((t ^ (t>>>14))>>>0) / 4294967296;
  };
}
/* Рисует элемент во всех нужных смещениях, чтобы плитка стыковалась без швов. */
function texWrap(S,x,y,r,fn){
  for(const ox of [-S,0,S]) for(const oy of [-S,0,S]){
    const px=x+ox, py=y+oy;
    if(px+r<0 || px-r>S || py+r<0 || py-r>S) continue;
    fn(px,py);
  }
}
function shadeOf(hex){
  const n=parseInt(hex.slice(1),16);
  const r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  const hi=`rgb(${Math.min(255,Math.round(r*1.28+26))},${Math.min(255,Math.round(g*1.28+26))},${Math.min(255,Math.round(b*1.28+26))})`;
  const lo=`rgb(${Math.round(r*0.5)},${Math.round(g*0.5)},${Math.round(b*0.5)})`;
  return {hi, mid:hex, lo};
}
function drawStoneShape(g,px,py,rx,ry,rot,shade,mossColor,mossAmt){
  g.save(); g.translate(px,py); g.rotate(rot);
  g.fillStyle='rgba(0,0,0,0.30)';
  g.beginPath(); g.ellipse(rx*0.18+1.5,ry*0.45+2,rx*1.05,ry*0.92,0,0,Math.PI*2); g.fill();
  const gr=g.createRadialGradient(-rx*0.35,-ry*0.45,0,0,0,Math.max(rx,ry)*1.15);
  gr.addColorStop(0,shade.hi); gr.addColorStop(0.55,shade.mid); gr.addColorStop(1,shade.lo);
  g.fillStyle=gr; g.beginPath(); g.ellipse(0,0,rx,ry,0,0,Math.PI*2); g.fill();
  g.strokeStyle='rgba(0,0,0,0.38)'; g.lineWidth=1; g.stroke();
  g.strokeStyle='rgba(255,255,255,0.34)'; g.lineWidth=Math.max(0.8,rx*0.12);
  g.beginPath(); g.ellipse(0,0,rx*0.78,ry*0.78,0,Math.PI*1.12,Math.PI*1.55); g.stroke();
  if(mossAmt>0){
    g.fillStyle=mossColor; g.globalAlpha=mossAmt;
    g.beginPath(); g.ellipse(-rx*0.2,-ry*0.5,rx*0.7,ry*0.38,0.2,0,Math.PI*2); g.fill();
    g.globalAlpha=1;
  }
  g.restore();
}

const GRASS_PALETTES = {
  light:{
    base:'#335a1e', blobL:'rgba(150,196,74,0.20)', blobD:'rgba(12,34,10,0.32)',
    blades:['#4f7d27','#5f9030','#74a63a','#3b6420','#8bbd47'], tip:'#b0d95e',
    stones:['#cfc8b4','#b9b19c','#a59d88','#dcd5c0','#8f8876'], moss:'rgba(88,132,50,0.8)',
    flowers:['#f6f2de','#f3d45c','#eaa8c2','#ffffff'], flowerCore:'#d99a2b', stem:'#3f6d22', flowerN:20,
    dirt:'rgba(98,76,46,0.55)', dirtPatches:6, glow:false
  },
  dark:{
    base:'#141a17', blobL:'rgba(72,98,80,0.20)', blobD:'rgba(0,0,0,0.42)',
    blades:['#27392c','#1b2a20','#35523b','#0f1612','#48644c'], tip:'#648768',
    stones:['#4b5254','#3c4244','#5b6265','#2f3437','#6a7172'], moss:'rgba(42,92,64,0.75)',
    flowers:['#c2334f','#e0566f','#a82440','#e98aa0'], flowerCore:'#3a0f18', stem:'#1f3a28', flowerN:30,
    dirt:'rgba(8,6,7,0.62)', dirtPatches:7, glow:true
  }
};

function buildGrassTile(pal,seed){
  const S=768, k=(S/512)*(S/512);
  const c=document.createElement('canvas'); c.width=c.height=S;
  const g=c.getContext('2d'); const R=mulberry32(seed);
  g.fillStyle=pal.base; g.fillRect(0,0,S,S);

  for(let i=0;i<Math.round(38*k);i++){
    const x=R()*S,y=R()*S,r=50+R()*130,light=R()>0.5;
    texWrap(S,x,y,r,(px,py)=>{
      const gr=g.createRadialGradient(px,py,0,px,py,r);
      gr.addColorStop(0,light?pal.blobL:pal.blobD); gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr; g.fillRect(px-r,py-r,r*2,r*2);
    });
  }
  for(let i=0;i<Math.round(pal.dirtPatches*k);i++){
    const x=R()*S,y=R()*S,rx=22+R()*36,ry=rx*(0.5+R()*0.4),rot=R()*3;
    texWrap(S,x,y,rx,(px,py)=>{
      g.save(); g.translate(px,py); g.rotate(rot);
      const gr=g.createRadialGradient(0,0,0,0,0,rx);
      gr.addColorStop(0,pal.dirt); gr.addColorStop(0.65,pal.dirt); gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr; g.beginPath(); g.ellipse(0,0,rx,ry,0,0,Math.PI*2); g.fill(); g.restore();
    });
  }
  for(let i=0;i<Math.round(2200*k);i++){
    const x=R()*S,y=R()*S,len=4+R()*9,a=-Math.PI/2+(R()-0.5)*1.2;
    const col=pal.blades[(R()*pal.blades.length)|0],al=0.45+R()*0.45,lw=0.9+R()*1.1;
    texWrap(S,x,y,len,(px,py)=>{
      g.globalAlpha=al; g.strokeStyle=col; g.lineWidth=lw;
      g.beginPath(); g.moveTo(px,py); g.lineTo(px+Math.cos(a)*len,py+Math.sin(a)*len); g.stroke();
    });
  }
  g.globalAlpha=1; g.lineCap='round';

  const tufts=(count,scale)=>{
    for(let i=0;i<count;i++){
      const x=R()*S,y=R()*S,n=6+((R()*5)|0),bl=[];
      for(let b=0;b<n;b++) bl.push({
        a:-Math.PI/2+(b/(n-1)-0.5)*1.7+(R()-0.5)*0.25, len:(12+R()*18)*scale, bend:(R()-0.5)*10*scale,
        col:R()<0.35?pal.tip:pal.blades[(R()*pal.blades.length)|0], lw:(1.2+R()*1.3)*Math.max(0.7,scale)
      });
      texWrap(S,x,y,36,(px,py)=>{
        g.fillStyle='rgba(0,0,0,0.20)';
        g.beginPath(); g.ellipse(px+2,py+3,11*scale,4*scale,0,0,Math.PI*2); g.fill();
        for(const b of bl){
          g.strokeStyle=b.col; g.lineWidth=b.lw;
          g.beginPath(); g.moveTo(px+(b.a+1.57)*4,py);
          g.quadraticCurveTo(px+Math.cos(b.a)*b.len*0.5+b.bend*0.4,py+Math.sin(b.a)*b.len*0.55,
                             px+Math.cos(b.a)*b.len+b.bend,py+Math.sin(b.a)*b.len);
          g.stroke();
        }
      });
    }
  };
  tufts(Math.round(170*k),1);

  const shades=pal.stones.map(shadeOf);
  const placeStone=(x,y,rx,ry)=>{
    const rot=R()*Math.PI, sh=shades[(R()*shades.length)|0], moss=R()<0.35?0.55+R()*0.3:0;
    texWrap(S,x,y,rx+4,(px,py)=>drawStoneShape(g,px,py,rx,ry,rot,sh,pal.moss,moss));
  };
  for(let i=0;i<Math.round(20*k);i++){
    const x=R()*S,y=R()*S,rx=4+R()*7;
    placeStone(x,y,rx,rx*(0.6+R()*0.3));
    if(R()<0.5){
      const m=2+((R()*3)|0);
      for(let q=0;q<m;q++){ const s=2+R()*3.2; placeStone(x+(R()-0.5)*28,y+(R()-0.5)*18,s,s*0.7); }
    }
  }
  for(let i=0;i<Math.round(3*k);i++){ const rx=14+R()*7; placeStone(R()*S,R()*S,rx,rx*(0.62+R()*0.2)); }
  tufts(Math.round(46*k),0.7);

  for(let i=0;i<Math.round(pal.flowerN*k);i++){
    const x=R()*S,y=R()*S,col=pal.flowers[(R()*pal.flowers.length)|0],sz=1.7+R()*1.5;
    texWrap(S,x,y,10,(px,py)=>{
      g.strokeStyle=pal.stem; g.lineWidth=1; g.beginPath(); g.moveTo(px,py+7); g.lineTo(px,py); g.stroke();
      g.fillStyle=col;
      for(let p=0;p<5;p++){ const a=p*Math.PI*2/5; g.beginPath(); g.arc(px+Math.cos(a)*sz*1.1,py+Math.sin(a)*sz*1.1,sz,0,Math.PI*2); g.fill(); }
      g.fillStyle=pal.flowerCore; g.beginPath(); g.arc(px,py,sz*0.7,0,Math.PI*2); g.fill();
    });
  }
  if(pal.glow){
    for(let i=0;i<Math.round(7*k);i++){
      let x=R()*S,y=R()*S; const sx=x,sy=y,pts=[[0,0]]; let a=R()*6.28,ax=0,ay=0;
      for(let s=0;s<5;s++){ a+=(R()-0.5)*1.2; ax+=Math.cos(a)*(14+R()*18); ay+=Math.sin(a)*(14+R()*18); pts.push([ax,ay]); }
      texWrap(S,sx,sy,170,(px,py)=>{
        for(const [w,col] of [[5,'rgba(255,40,30,0.08)'],[2,'rgba(255,90,50,0.26)'],[0.8,'rgba(255,170,110,0.55)']]){
          g.strokeStyle=col; g.lineWidth=w; g.beginPath(); g.moveTo(px,py);
          for(const p of pts) g.lineTo(px+p[0],py+p[1]);
          g.stroke();
        }
      });
    }
  }
  return c;
}

function buildDirtTile(pal,seed){
  const S=256, c=document.createElement('canvas'); c.width=c.height=S;
  const g=c.getContext('2d'); const R=mulberry32(seed);
  g.fillStyle=pal.base; g.fillRect(0,0,S,S);
  for(let i=0;i<16;i++){
    const x=R()*S,y=R()*S,r=30+R()*60,light=R()>0.5;
    texWrap(S,x,y,r,(px,py)=>{
      const gr=g.createRadialGradient(px,py,0,px,py,r);
      gr.addColorStop(0,light?pal.hi:pal.lo); gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr; g.fillRect(px-r,py-r,r*2,r*2);
    });
  }
  for(let i=0;i<1100;i++){
    const x=R()*S,y=R()*S,r=0.5+R()*1.5,col=R()>0.5?pal.hi:pal.lo,al=0.25+R()*0.4;
    texWrap(S,x,y,r,(px,py)=>{ g.globalAlpha=al; g.fillStyle=col; g.beginPath(); g.arc(px,py,r,0,Math.PI*2); g.fill(); });
  }
  g.globalAlpha=1;
  const shades=pal.stones.map(shadeOf);
  for(let i=0;i<24;i++){
    const x=R()*S,y=R()*S,rx=2+R()*4.5,ry=rx*(0.6+R()*0.3),rot=R()*3,sh=shades[(R()*shades.length)|0];
    texWrap(S,x,y,rx+4,(px,py)=>drawStoneShape(g,px,py,rx,ry,rot,sh,'rgba(0,0,0,0)',0));
  }
  for(let i=0;i<5;i++){
    let x=R()*S,y=R()*S,a=R()*6.28; const sx=x,sy=y,pts=[[0,0]]; let ax=0,ay=0;
    for(let s=0;s<4;s++){ a+=(R()-0.5)*1.4; ax+=Math.cos(a)*(10+R()*16); ay+=Math.sin(a)*(10+R()*16); pts.push([ax,ay]); }
    texWrap(S,sx,sy,90,(px,py)=>{
      g.strokeStyle='rgba(0,0,0,0.38)'; g.lineWidth=1.3; g.beginPath(); g.moveTo(px,py);
      for(const p of pts) g.lineTo(px+p[0],py+p[1]);
      g.stroke();
      if(pal.glow){
        g.strokeStyle='rgba(255,100,60,0.45)'; g.lineWidth=0.8; g.beginPath(); g.moveTo(px,py);
        for(const p of pts) g.lineTo(px+p[0],py+p[1]);
        g.stroke();
      }
    });
  }
  return c;
}
const DIRT_PALETTES = {
  light:{base:'#7b5d3a', hi:'rgba(190,150,98,0.28)', lo:'rgba(40,26,12,0.32)', stones:['#a99a82','#8f826c','#bdae94','#766a58'], glow:false},
  dark:{base:'#241e1f', hi:'rgba(120,96,92,0.20)', lo:'rgba(0,0,0,0.45)', stones:['#4a4647','#3a3637','#5a5555','#2c292a'], glow:true}
};

function buildRoadTile(pal,seed){
  const S=256, TILE=64, GAP=5;
  const c=document.createElement('canvas'); c.width=c.height=S;
  const p=c.getContext('2d'); const R=mulberry32(seed);
  p.fillStyle=pal.grout; p.fillRect(0,0,S,S);
  const seedAt=(i,j)=>{ const v=Math.sin(((i+4)%4)*127.1+((j+4)%4)*311.7+seed*0.37)*43758.5453; return v-Math.floor(v); };
  const shades=pal.stones;
  for(let row=-1;row<=4;row++){
    const offset=(((row%2)+2)%2===0)?0:TILE/2;
    for(let col=-1;col<=4;col++){
      const cx=col*TILE+offset, cy=row*TILE;
      const s1=seedAt(row,col), s2=seedAt(row+9,col+3);
      const w=TILE-GAP-s1*6, h=TILE-GAP-s2*6;
      const x=cx+GAP/2+s1*3, y=cy+GAP/2+s2*3;
      const shade=shades[Math.floor(s1*97)%shades.length];
      p.save(); p.beginPath();
      const r=9;
      p.moveTo(x+r,y); p.lineTo(x+w-r,y); p.quadraticCurveTo(x+w,y,x+w,y+r);
      p.lineTo(x+w,y+h-r); p.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
      p.lineTo(x+r,y+h); p.quadraticCurveTo(x,y+h,x,y+h-r);
      p.lineTo(x,y+r); p.quadraticCurveTo(x,y,x+r,y); p.closePath(); p.clip();
      p.fillStyle=shade; p.fillRect(x,y,w,h);
      const dome=p.createRadialGradient(x+w*0.38,y+h*0.32,2,x+w*0.5,y+h*0.5,Math.max(w,h)*0.75);
      dome.addColorStop(0,'rgba(255,248,226,0.13)'); dome.addColorStop(0.5,'rgba(255,248,226,0)'); dome.addColorStop(1,'rgba(10,6,2,0.46)');
      p.fillStyle=dome; p.fillRect(x,y,w,h);
      for(let q=0;q<22;q++){
        const qs=seedAt(row*7+q,col*5+q*3), qt=seedAt(row*3+q*2,col*11+q);
        p.globalAlpha=0.06+qt*0.12; p.fillStyle=qs>0.5?'#ffffff':'#000000';
        p.beginPath(); p.arc(x+qs*w,y+qt*h,0.6+qt*1.7,0,Math.PI*2); p.fill();
      }
      p.globalAlpha=1;
      if(s2>0.7){
        p.strokeStyle='rgba(20,14,8,0.34)'; p.lineWidth=1;
        p.beginPath(); p.moveTo(x+w*0.2,y+h*0.15); p.lineTo(x+w*0.5,y+h*0.5); p.lineTo(x+w*0.36,y+h*0.86); p.stroke();
      }
      p.strokeStyle='rgba(0,0,0,0.42)'; p.lineWidth=3; p.stroke();
      p.restore();
    }
  }
  for(let i=0;i<16;i++){
    const x=R()*S,y=R()*S,rr=5+R()*8;
    texWrap(S,x,y,rr,(px,py)=>{
      const gr=p.createRadialGradient(px,py,0,px,py,rr);
      gr.addColorStop(0,pal.moss); gr.addColorStop(1,'rgba(0,0,0,0)');
      p.fillStyle=gr; p.fillRect(px-rr,py-rr,rr*2,rr*2);
    });
  }
  const ps=pal.pebbles.map(shadeOf);
  for(let i=0;i<12;i++){
    const x=R()*S,y=R()*S,rx=1.6+R()*2.2,rot=R()*3,sh=ps[(R()*ps.length)|0];
    texWrap(S,x,y,rx+3,(px,py)=>drawStoneShape(p,px,py,rx,rx*0.72,rot,sh,'rgba(0,0,0,0)',0));
  }
  if(pal.glints){
    for(let i=0;i<7;i++){
      const x=R()*S,y=R()*S,len=6+R()*12,a=R()*3.14;
      texWrap(S,x,y,len,(px,py)=>{
        p.strokeStyle='rgba(255,80,50,0.35)'; p.lineWidth=1.2;
        p.beginPath(); p.moveTo(px,py); p.lineTo(px+Math.cos(a)*len,py+Math.sin(a)*len); p.stroke();
      });
    }
  }
  return c;
}
const ROAD_PALETTES = {
  light:{grout:'#3b3020', stones:['#a08a5c','#94804f','#8a7348','#ac9766','#7f6a3f'], moss:'rgba(84,126,48,0.55)', pebbles:['#b8ad98','#9a9078','#cbbfa6'], glints:false},
  dark:{grout:'#120d0e', stones:['#302c2e','#282426','#3a3536','#2f2a32','#1f1c1e'], moss:'rgba(40,86,60,0.45)', pebbles:['#5b5658','#47434a','#6a6465'], glints:true}
};

const grassTileLight = buildGrassTile(GRASS_PALETTES.light, 1337);
const grassTileDark  = buildGrassTile(GRASS_PALETTES.dark, 7331);
let grassTexturePattern = ctx.createPattern(grassTileLight, 'repeat');
const darkGrassTexturePattern = ctx.createPattern(grassTileDark, 'repeat');
const dirtPatternLight = ctx.createPattern(buildDirtTile(DIRT_PALETTES.light, 101), 'repeat');
const dirtPatternDark  = ctx.createPattern(buildDirtTile(DIRT_PALETTES.dark, 202), 'repeat');
const pathTexturePattern = ctx.createPattern(buildRoadTile(ROAD_PALETTES.light, 11), 'repeat');
const darkPathTexturePattern = ctx.createPattern(buildRoadTile(ROAD_PALETTES.dark, 29), 'repeat');
function buildSandTile(){
  const size=192, tile=document.createElement('canvas');
  tile.width=tile.height=size;
  const g=tile.getContext('2d'), random=mulberry32(71077);
  g.fillStyle='#b79a61'; g.fillRect(0,0,size,size);
  for(let i=0;i<42;i++){
    const x=random()*size, y=random()*size, radius=8+random()*22, light=random()<0.55;
    texWrap(size,x,y,radius,(px,py)=>{
      const patch=g.createRadialGradient(px,py,0,px,py,radius);
      patch.addColorStop(0,light?'rgba(255,231,173,0.17)':'rgba(92,65,34,0.13)');
      patch.addColorStop(1,'rgba(183,154,97,0)');
      g.fillStyle=patch; g.fillRect(px-radius,py-radius,radius*2,radius*2);
    });
  }
  for(let i=0;i<620;i++){
    const x=random()*size, y=random()*size, radius=0.35+random()*1.2;
    const color=random()<0.54?'rgba(255,238,188,0.34)':'rgba(79,57,31,0.28)';
    const angle=random()*Math.PI;
    texWrap(size,x,y,radius*2,(px,py)=>{
      g.fillStyle=color; g.beginPath(); g.ellipse(px,py,radius*1.7,radius,angle,0,Math.PI*2); g.fill();
    });
  }
  for(let i=0;i<18;i++){
    const x=random()*size, y=random()*size, length=5+random()*12;
    g.strokeStyle='rgba(93,70,39,0.2)'; g.lineWidth=0.7+random()*0.6;
    g.beginPath(); g.moveTo(x,y); g.quadraticCurveTo(x+length*0.45,y-2,x+length,y+1); g.stroke();
  }
  return tile;
}
const sandTexturePattern=ctx.createPattern(buildSandTile(),'repeat');
const DECOR_STONE_SHADES = {
  light:GRASS_PALETTES.light.stones.map(shadeOf),
  dark:GRASS_PALETTES.dark.stones.map(shadeOf)
};

/* Декор на земле: пятна голой земли, россыпи камушков и валуны с мхом.
   Позиции считаются один раз и рисуются только в поле зрения камеры. */
let terrainDecor = null;
function buildTerrainDecor(){
  const R=mulberry32(90731), items=[];
  const farFrom=(x,y,clear)=>{
    if(pointSegmentDistance(x,y,90,90,WORLD-90,WORLD-90)<330) return false;
    for(const lane of LANES) for(let i=1;i<lane.length;i++)
      if(pointSegmentDistance(x,y,lane[i-1].x,lane[i-1].y,lane[i].x,lane[i].y)<clear) return false;
    return true;
  };
  const rangeXY=()=>[80+R()*(WORLD-160),80+R()*(WORLD-160)];
  for(let i=0;i<150;i++){
    const [x,y]=rangeXY(); if(!farFrom(x,y,170)) continue;
    const n=9, base=36+R()*74, pts=[];
    for(let k=0;k<n;k++){ const a=k/n*Math.PI*2, rr=base*(0.7+R()*0.5); pts.push({x:Math.cos(a)*rr,y:Math.sin(a)*rr*0.66}); }
    items.push({k:'dirt',x,y,pts});
  }
  for(let i=0;i<360;i++){
    const [x,y]=rangeXY(); if(!farFrom(x,y,128)) continue;
    const list=[], n=2+((R()*4)|0);
    for(let k=0;k<n;k++){ const rx=3+R()*9; list.push({dx:(R()-0.5)*46,dy:(R()-0.5)*30,rx,ry:rx*(0.6+R()*0.3),rot:R()*3,sh:(R()*5)|0,moss:R()<0.35?0.6:0}); }
    items.push({k:'stones',x,y,list});
  }
  for(let i=0;i<46;i++){
    const [x,y]=rangeXY(); if(!farFrom(x,y,185)) continue;
    const rx=16+R()*16, blades=[];
    for(let k=0;k<7;k++) blades.push({a:-Math.PI/2+(k/6-0.5)*2.4,len:10+R()*12,dx:(R()-0.5)*rx*1.8});
    items.push({k:'boulder',x,y,rx,ry:rx*(0.68+R()*0.16),rot:(R()-0.5)*0.5,sh:(R()*5)|0,blades});
  }
  return items;
}
function drawTerrainDecor(){
  if(!terrainDecor) terrainDecor=buildTerrainDecor();
  const mx=VW*0.75+180, my=VH*0.75+180;
  for(const it of terrainDecor){
    if(Math.abs(it.x-cam.x)>mx || Math.abs(it.y-cam.y)>my) continue;
    const dark=it.x>it.y, key=dark?'dark':'light', shades=DECOR_STONE_SHADES[key];
    const moss=(dark?GRASS_PALETTES.dark:GRASS_PALETTES.light).moss;
    if(it.k==='dirt'){
      const trace=(sc)=>{
        const pts=it.pts, n=pts.length;
        ctx.beginPath();
        ctx.moveTo((pts[n-1].x+pts[0].x)/2*sc,(pts[n-1].y+pts[0].y)/2*sc);
        for(let i=0;i<n;i++){ const p=pts[i], q=pts[(i+1)%n]; ctx.quadraticCurveTo(p.x*sc,p.y*sc,(p.x+q.x)/2*sc,(p.y+q.y)/2*sc); }
        ctx.closePath();
      };
      ctx.save(); ctx.translate(it.x,it.y);
      trace(1.22); ctx.fillStyle=dark?'rgba(0,0,0,0.22)':'rgba(30,40,14,0.20)'; ctx.fill();
      trace(1.08); ctx.fillStyle=dark?'rgba(0,0,0,0.25)':'rgba(40,28,12,0.22)'; ctx.fill();
      trace(1); ctx.fillStyle=dark?dirtPatternDark:dirtPatternLight; ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.30)'; ctx.lineWidth=3; ctx.stroke();
      ctx.restore();
    } else if(it.k==='stones'){
      for(const s of it.list) drawStoneShape(ctx,it.x+s.dx,it.y+s.dy,s.rx,s.ry,s.rot,shades[s.sh],moss,s.moss);
    } else if(it.k==='boulder'){
      ctx.save();
      ctx.lineCap='round';
      for(const b of it.blades){
        ctx.strokeStyle=dark?'#35523b':'#74a63a'; ctx.lineWidth=2;
        const bx=it.x+b.dx, by=it.y+it.ry*0.6;
        ctx.beginPath(); ctx.moveTo(bx,by);
        ctx.quadraticCurveTo(bx+Math.cos(b.a)*b.len*0.4,by+Math.sin(b.a)*b.len*0.7,bx+Math.cos(b.a)*b.len,by+Math.sin(b.a)*b.len);
        ctx.stroke();
      }
      ctx.restore();
      drawStoneShape(ctx,it.x,it.y,it.rx,it.ry,it.rot,shades[it.sh],moss,0.7);
    }
  }
}

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

const WORLD  = 6500;
const GRID   = 52;
const CELL   = WORLD / GRID;
const TEAM_COL = ['#4caf50', '#e53935', '#b58a55'];
const TEAM_NAME = ['Свет', 'Тьма'];
const LANE_NAMES = ['МИД', 'ВЕРХ', 'НИЗ'];
let MID_PUSH_TIME = 300;
/* Режимы игры против ботов: turbo — как раньше, allpick — медленная экономика и долгая лайн-фаза */
const GAME_MODES = {
  turbo:   {name:'ТУРБО',    coinsPerSec:3, creepBountyMul:1,   xpMul:1,   midPushTime:300},
  allpick: {name:'ALL PICK', coinsPerSec:1, creepBountyMul:0.5, xpMul:0.6, midPushTime:600}
};
let gameMode = 'turbo';
function gameModeCfg(){ return GAME_MODES[gameMode] || GAME_MODES.turbo; }
const BOT_FARM_PHASE_TIME = 180;
const BOT_SCENARIO_NAMES = [
  'Фарм и быстрый пуш мида', 'Лесная засада-ганг', 'Давление по бокам',
  'Ранний инвайд вражеского леса', 'Оборона и контратака', 'Роаминг и перетяжки'
];
let botTeamScenarios = [];
const makeTowerId = (team, lane, tier, base = false) => base ? `ancient:${team}` : `tower:${team}:${lane}:${tier}`;

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
let storeTab = 'shop';
let storeCategory = 'skins';
let redReginaSkinOwned = false;
let redReginaSkinEquipped = false;
try {
  const savedCosmetics = JSON.parse(localStorage.getItem('shadowRampageCosmetics') || '{}');
  redReginaSkinOwned = savedCosmetics.redReginaOwned === true;
  redReginaSkinEquipped = redReginaSkinOwned && savedCosmetics.redReginaEquipped === true;
} catch(err) {}
let storePhraseOwned = false;
let storeChipOwned = false;
let storeAudioOwned = false;
let storeFeedimidiOwned = false;
let storeNineteenOwned = false;
let storeAbuuuOwned = false;
let storeShovelOwned = false;
let storePhraseIndex = 0;
let phraseWheelOpen = false;
let phraseWheelSelection = -1;
let storeAudio = null;
const EMBEDDED_STORE_AUDIO = '';
const STORE_AUDIO_FALLBACK = 'C:/Users/elski/Downloads/korolia-ne-ubit.mp3';
let portraitRenderMode = false;
let winner = null;
let rankedOnlineMatch = false;
const RANKED_WIN_MMR = 50, RANKED_LOSS_MMR = 40;
let visGrid    = new Uint8Array(GRID*GRID);
let explored   = new Uint8Array(GRID*GRID);
let visibleUnitCache = new WeakSet();
let mouse = {x:0, y:0, wx:0, wy:0};
let edgePan = {x:0, y:0};
let cameraKeys = {x:0, y:0};
let cameraDrag = {active:false, lastX:0, lastY:0};
let cameraManual = false;
let draggedInventoryIndex = -1;
let lastPressedKey = '';
let shopOpen = false;
let shopGuideOpen = false;
let pendingPurchaseId = null;
let shopScrollRow = 0;
let inspectUnit = null;
let pendingSellIndex = -1;
let changelogOpen = false;
let changelogScroll = 0;
let settingsOpen = false;
let touchControlsEnabled = (() => {
  try { return localStorage.getItem('shadowTouchControls') === 'true'; }
  catch(err) { return false; }
})();
let touchJoystick = {id:null, dx:0, dy:0};
const activeTouches = new Map();
let scoreboardOpen = false;
let changelogPage = 0;
const CHANGELOG_PAGE_SIZE = 4;
const GAME_VERSION = '0.8.0';
const CHANGELOG_HISTORY = [
  'Обновление 0.7.8: исправлена ульта Сасыча (Разрыв наносит урон за каждый шаг цели, боты стараются стоять на месте), базы стали огромными и красивыми, добавлены комнаты возрождения: регенерация только внутри комнаты, вражеские бойцы там попадают под жёсткий обстрел башен',
  'Баланс 0.7.7: ультимейт Джувсюта «Большой обед» переработан — съедает лесного крипа или героя с HP ≤ 200 и навсегда получает здоровье и урон, перезарядка 10/8/5 с, без маны; «Разбег» усилен; боты фармят ультом',
  'Обновление 0.7.7: карта увеличена на 30%, здоровье башен и трона увеличено втрое, обновлены Иллюзионист и панель героя, активные предметы расходуют ману, добавлена анимированная заставка',
  'Обновление 0.7.6b: исправлен скин Красная Ригина, скорость героев снижена на 10%, добавлен активный предмет «Замисть», звон монет при покупке, профили из мирового топа и вход в мультиплеер только с аккаунтом',
  'Обновление 0.7.6a: вместо магазина фраз появился магазин с бесплатным скином «Красная Ригина» и отдельным инвентарём для его применения',
  'Обновление 0.7.6: для Света и Тьмы независимо выбираются сценарии поведения ботов с шестью фазами; боты меняют линии, фармят лес и переходят к совместным атакам по таймеру, убийствам и падению башен',
  'Обновление 0.7.5c: Йосып, Срака мо3гов, новый порядок бот-закупа и исправление навыков Ригины',
  'Обновление 0.7.5b: боты получили приоритетные активные предметы; события меню получили новые иллюстрации',
  'Обновление 0.7.5a: ребаланс магазина и юнитов — цены и эффекты предметов обновлены, а главное меню переведено на более космическую синтезаторную тему',
  'Обновление 0.7.5a: Шрам-Аркадия, БКБ, Мантированная сталь, Волосы Ильи, Подушка Тимура, Оторванная рука мо3гов и Дагонская империя пересмотрены под новый темп поздней игры',
  'Обновление 0.7.4b: первые 3 минуты боты фармят линейных и лесных крипов вместо ранних драк и сноса башен; HP всех башен увеличено втрое',
  'Обновление 0.7.4b: мировой топ вынесен из карьеры профиля в отдельное окно; кнопка «МИРОВОЙ ТОП» находится в левом нижнем углу меню',
  'Обновление 0.7.4b: профиль показывает победы, поражения, убийства, смерти, любимых бойцов и подробные отчёты последних матчей',
  'Обновление 0.7.4b: за матчи начисляется опыт, уровни открывают титулы и рамки; мировой топ сортируется по общему числу побед над ботами и игроками',
  'Обновление 0.7.4a: в главном меню появился счётчик подключённых к серверу игроков; число обновляется при входе и выходе, а при недоступном сервере показывается статус подключения',
  'Обновление 0.7.4a: добавлена тихая космическая музыка меню, а на карте усилены тени леса и каменная фактура дорог',
  'Обновление 0.7.3b: магазин получил новые изображения предметов и обновлённые плашки, изображения используются и в инвентаре; добавлены статистика и полезные функции онлайн-меню; исправлено перемещение предметов',
  'Обновление 0.7.3b: исправлены форма Трансформера и ульта Савелия, здоровье всех бойцов увеличено на 15%',
  'Обновление 0.7.0: аккаунты (ник и пароль, смена ника, уровень с нуля растёт с каждой победы над ботами и игроками), новый фон главного меню с рунной печатью и алым вихрем, золотая тройка в логотипе, пропуск выбора бойцов сразу после пика и 5-секундная заставка при входе в матч',
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
const CHANGELOG = (() => {
  const sections = [{version:'0.8.0', title:'ОНЛАЙН-ЛОББИ', changes:[
    'Онлайн-меню переделано в стиле Dota 2: две колонки «Силы Света» и «Силы Тьмы», слоты с портретами героев, кнопки «Занять», «Сбалансировать», «Поменять местами», блок «Неопределившиеся».',
    'Появилась кнопка «Создать лобби». Создатель становится лидером: меняет название, режим и правила, исключает игроков, распускает лобби и запускает матч.',
    'Герой выбирается сеткой портретов вместо списка имён; занятые герои затемнены.',
    'Режимы лобби: 1 на 1 (Solo Mid), 2 на 2, 3 на 3 и 4 на 4. Правила: Турбо или All Pick.',
    'Настройка ботов: пустые места можно заменять ботами или оставлять игрокам. Ботов считает компьютер лидера лобби; матчи с ботами не идут в рейтинг.',
    'Онлайн-матч теперь поддерживает до 4 игроков в команде. Если лидер выходит, его роль переходит к следующему игроку.'
  ]},{version:'0.7.9', title:'ТУРБО И ALL PICK', changes:[
    'После кнопки «Играть» нужно выбрать режим игры против ботов: Турбо или All Pick.',
    'Турбо — прежняя игра: 3 монеты в секунду, полная награда за крипов, боты уходят в мид с 5-й минуты.',
    'All Pick: 1 монета в секунду, крипы и лесные нейтралы дают вдвое меньше монет, опыт идёт на 40% медленнее, боты дольше стоят на линиях и идут в мид только с 10-й минуты. За убийство героя награда прежняя — 200 монет.'
  ]},{version:'0.7.8', title:'ДЖУВСЮТ И ОБЪЁМ', changes:[
    'У Джувсюта над головой появился счётчик съеденного «🍖 ×N» с анимацией и полоской голода до потери стака; за лесного крипа +1, за героя +10.',
    'Бойцы, крипы и постройки получили псевдо-3D объём: блик и тень на моделях, длинные косые тени, боковые стенки башен, казарм и трона.'
  ]},{version:'0.7.7', title:'КАРТА, БОЙЦЫ И БАЛАНС', changes:[
    'Карта увеличена на 30%; масштабирование согласовано между игрой и сервером.',
    'Здоровье башен и трона сохранено на утроенном уровне.',
    'Иллюзионист получил бирюзово-золотую модель с короной, посохом и золотой иллюзией; нижняя панель героя разделена на ровные секции.',
    'Активация активных предметов расходует ману: Мунуция — 60, Мантированная сталь — 80, Шрам-Аркадия — 100, Бошка Агнии — 90; прочие активные предметы — 60, кроме предметов-исключений.',
    'При запуске показывается анимированная заставка мира с рунической печатью и свечением.',
    'Лес Сил Света получил такой же выразительный силуэт деревьев, как лес Сил Тьмы, с зелёной листвой. Игровые столкновения и расположение деревьев не менялись.',
    'Песчаное дно реки стало детальнее, а вода получила более чёткий берег и многослойные блики.',
    'В магазине предметы показаны компактными иконками; название, цена и описание появляются при наведении.',
    'В меню обновлены новости и события: представлены предметы «Замисть» и «Дисперсер» и улучшенная карта. Песчаная текстура создаётся один раз и повторно используется.'
  ]},{version:'0.7.6b', title:'ПРЕДМЕТЫ, СКИНЫ И ОНЛАЙН', changes:[
    'Скин «Красная Ригина» теперь переносится в боевого героя во всех режимах. Скорость героев снижена на 10%.',
    'Добавлен предмет «Замисть» за 2900 монет: активация даёт +65% сопротивления урону, +100 к урону и +50 к скорости.',
    'Покупка предмета сопровождается звоном монет. Кнопки главного меню получили красно-чёрное оформление.',
    'Игроки мирового топа открывают подробный профиль по нажатию; для входа в онлайн-комнаты требуется действующий аккаунт.'
  ]},{version:'0.7.6a', title:'СКИНЫ И ИНВЕНТАРЬ', changes:[
    'Магазин фраз заменён магазином с бесплатным скином «Красная Ригина»; добавлен отдельный инвентарь, где скин можно применить или снять.',
    'Раздел с фразами сохранён внутри магазина.'
  ]},{version:'0.7.6', title:'ШЕСТЬ СЦЕНАРИЕВ БОТОВ', changes:[
    'Свет и Тьма независимо получают один из шести сценариев: фарм и пуш мида, лесная засада, давление по бокам, инвайд леса, оборона с контратакой или роуминг.',
    'Поведение проходит шесть фаз с переходами по времени, убийствам героев и уничтожению башен; выбывшие боты не останавливают действия оставшейся команды.'
  ]},{version:'0.7.5c', title:'ЙОСЫП И НОВЫЕ ПРЕДМЕТЫ', changes:[
    'Йосып стал зелёным шестилапым жуком; Блювака оставляет видимый яд, четыре лужи сохраняются 6 секунд, а ультимейт высасывает 75 HP в секунду в течение 12 секунд.',
    'Добавлена Срака мо3гов за 3300 монет: активация на 2 секунды даёт +350 к скорости атаки и +250 к урону; для предмета нарисована отдельная иконка.',
    'Боты теперь покупают Клыки Васьки, Сапог Джоэла и ПТ в одном порядке, а затем приоритетно собирают Мунуцию, Мантированную сталь и Бошку Агнии и активируют предметы в бою.',
    'Исправлено падение игрового кадра, когда бот-Ригина использовала навыки рядом с вражеским героем. Иллюстрации событий меню стали разнообразнее.'
  ]},{version:'0.7.5a', title:'РЕБАЛАНС ЮНИТОВ И МАГАЗИНА', changes:[
    'Пересмотрены цены предметов магазина: Шрам-Аркадия 2400, БКБ 1750, Мантированная сталь 2400, Волосы Ильи 1500, Подушка Тимура 200, Оторванная рука мо3гов 1300, Дагонская империя 1100.',
    'Дагонская империя ослаблена по КД до 10 секунд, но усилена до 1200 магического урона по отдельной цели.',
    'Яйцо-голли ослаблено до +250 к скорости на 2 секунды, что делает актив более управляемым и предсказуемым.',
    'Ребаланс юнитов и магазина доведён до более ровного темпа на 1–30 уровнях: поздняя игра стала менее жёсткой, а ранние пики и контроль лучше работают в командных драках.',
    'Главное меню переведено на более космическую синтезаторную тему и спокойный, дальний арпеджио в стиле глубокой космической сцены.'
  ]},{version:'0.7.4', title:'ИСПРАВЛЕНИЯ МУЛЬТИПЛЕЕРА', changes:[
    'Исправлено: в мультиплеере бойцы других игроков отображались на твоём экране не теми, кого они выбрали (скиллы при этом были правильные).',
    'Мунуция подорожала с 2000 до 4500 монет.'
  ]},{version:'0.7.3a', title:'САВЕЛИЙ: ФОРМА ТРАНСФОРМЕРА', changes:[
    'Добавлен новый playable-герой Савелий — толстый футбольный форвард ближнего боя с ролью кэрри / инициатора.',
    'Добавлены Ловкий уворот, Звонкий клич, Форма Трансформера и ультимейт Яростный рев со страхом.',
    'Аганим шард усиливает Звонкий клич замедлением и снижением брони, а Aghanim Scepter улучшает уворот и сопротивление магии.',
    'Обновлены выбор героя, онлайн-ростер, визуальный портрет и changelog.'
  ]},{version:'0.7.3', title:'РЕЙТИНГ, HUD И ЯЙЦО-ГОЛЛИ', changes:[
    'Добавлен онлайн-рейтинг: за победу +25, за поражение −20 (минимум 0); каждые 100 очков повышают ранг от Рекрута 1 до Рекрута 5.',
    'Ранг и число рейтинга теперь отображаются прямо на кнопке онлайна; рейтинг сохраняется в профиле аккаунта.',
    'Добавлен активный предмет «Яйцо-голли» за 1800 монет: +500 к скорости передвижения на 3 секунды, перезарядка 25 секунд.',
    'Панель героя, навыков и предметов перестраивается на узких экранах; оформление ячеек и шкал стало выразительнее.'
  ]},{version:'0.7.2', title:'НОВЫЕ БАШНИ И ТРОН', changes:[
    'Башни Сил Света перерисованы: светлый каменный обелиск с голубым светящимся узором, золотой кромкой и круглым основанием с водой.',
    'Башни Сил Тьмы перерисованы: чёрный шипастый камень на груде глыб, красные пульсирующие прожилки и огненное «око» под шляпой башни.',
    'Трон Сил Света теперь дерево с розовой сакурой, белыми камнями, голубыми кристаллами, световым столбом и порталом; лепестки медленно падают.',
    'Трон Сил Тьмы теперь пять чёрных шипастых башен-когтей вокруг раскалённого красного ядра с языками пламени и искрами.',
    'Под каждой постройкой есть кольцо цвета команды, а в онлайн-матче внешний вид зависит от настоящей стороны комнаты (Свет или Тьма).'
  ]},{version:'0.7.1', title:'ПРОФИЛЬ, АВАТАРКИ И РАЗМИНКА', changes:[
    'В профиле считаются все победы и поражения, а также число матчей и процент побед; в главном меню рядом с аватаркой видны победы и поражения.',
    'Каждый матч получает свой номер: один и тот же результат не засчитывается дважды, а если сервер был недоступен, результат досчитается при следующем входе.',
    'Добавлено 20 аватарок: 15 портретов героев игры и 5 тематических эмблем (Лопата, Башня, Древний, Руна, Крип). Выбор находится в окне профиля и сохраняется на сервере.',
    'Во время отсчёта «До начала битвы» герои свободно ходят по своей базе (ПКМ), боты тоже двигаются; это работает и в онлайн-матче 3 на 3. Боя, крипов и волн до конца отсчёта нет.'
  ]},{version:'0.6.2', title:'ТРУСЫ ДИАНЫ И НОВОЕ МЕНЮ', changes:[
    'Добавлен предмет «Трусы Дианы» (3500 монет): +60 к урону атак и способностей, а активная аура включается и выключается без перезарядки и наносит небольшой урон врагам и крипам рядом.',
    'Добавлен предмет «Жирфсютин» (4000 монет): +1800 к максимальному и текущему здоровью.',
    'В магазин фраз добавлена новая фраза «Лопата челлендж».',
    'Главное меню переработано в красной теме DOTA SENSE: профиль, новости и события, блоки новинок.',
    'При продаже предметов с бонусом к здоровью бонус теперь снимается.',
    'Добавлен голос диктора: First Blood, Double/Triple Kill, Rampage, серии убийств до Beyond Godlike, отсчёты выбора героя и старта матча, события башен и базы, Team Wipe, Victory и Defeat.',
    'Выбор героя теперь длится 30 секунд, перед боем идёт 30-секундный отсчёт для закупки.'
  ]},{version:'0.6.1c', title:'HUD И ТЕМП ИГРЫ', changes:[
    'Добавлена верхняя лента героев матча: павшие бойцы отображаются серыми, как в Dota.',
    'Инвентарь перестроен в горизонтальную сетку 3 на 2, магазин получил быстрый доступ и счётчик монет рядом с кнопкой.',
    'Добавлены отдельные иконки ПТ, Клыков Васьки и Мунуции, а игровой цикл оптимизирован без удаления механик.',
    'Исправлено распределение ботов: на мид выходят один союзный и два вражеских бота; остальные держат свои линии.',
    'Снижена стоимость отрисовки внеэкранных эффектов, частиц и DOM-обновлений на каждом кадре.'
  ]},{version:'0.6.1b', title:'БОИ 4 НА 4', changes:[
    'Обычный режим расширен до 4 на 4: дополнительный союзный и вражеский боты занимают мид.',
    'Лесные нейтралы получили новые силуэты, а их лагеря отмечены тотемами и кострами.',
    'Меню дополнено анимированными рунами и световыми следами; при наведении на кнопки звучит короткий сигнал.',
    'В магазине появились каменные панели, золотые акценты и цветные грани в духе Dota.'
  ]},{version:'0.6.1a', title:'ГЕРОИ И БАЛАНС', changes:[
    'Таланты отключены, исправлены клавиши навыков Ригины и её ультимейт стал длиннее.',
    'Удалён луч Гриши; усилен поздний урон героев, исправлены аура Ильи, Молотов и управление иллюзиями.',
    'Снижено здоровье башен, ослаблен Снайпер, добавлены звуки применения предметов.'
  ]},{version:'0.6.0', title:'НОВЫЕ РЕЖИМЫ', changes:[
    'Кнопка онлайн перенесена к игровым режимам, обновлены оформление главного меню и фон.',
    'Добавлены сенсорное управление и адаптация интерфейса для телефонов.',
    'Цены всех предметов магазина снижены на 7%.'
  ]}];
  const sectionsByVersion = new Map();
  for(const entry of CHANGELOG_HISTORY){
    const match = entry.match(/^Обновление\s+([^:]+):\s*(.*)$/);
    const version = match ? match[1] : 'Ранние версии';
    let section = sectionsByVersion.get(version);
    if(!section){
      section = {version, changes:[]};
      sectionsByVersion.set(version, section);
      sections.push(section);
    }
    section.changes.push(match ? match[2] : entry);
  }
  return sections;
})();
function changelogRows(){
  return CHANGELOG.flatMap(section => [
    {type:'heading', text:'ОБНОВЛЕНИЕ ' + section.version},
    ...section.changes.map(text => ({type:'entry', text}))
  ]);
}
function changelogContentHeight(){
  return CHANGELOG.reduce((height, section) => height + 36 + section.changes.length * 62, 0);
}
const SHOP_ITEMS = {
  mango: {name:'Манго', icon:'◆', cost:70, desc:'Активный: восстанавливает 100 маны. Не расходуется — можно использовать повторно.', color:'#72e6a5', active:true},
  joelBoots: {name:'Сапог Джоэла', icon:'▲', cost:500, desc:'Пассивно: +45 к скорости передвижения.', color:'#e7c77a', speed:45, active:false},
  tango: {name:'Танго', icon:'♣', cost:90, desc:'Активный расходуемый предмет: съедает ближайшее дерево и восстанавливает 90 HP.', color:'#79d46c', active:true},
  fangs: {name:'Клыки Васьки', icon:'✦', cost:500, desc:'Пассивно: +100 к обычным атакам и к урону способностей.', color:'#ff8d8d', damage:100, active:false},
  bkb: {name:'БКБ', icon:'✚', cost:1750, desc:'Активный: на 10 сек. снижает урон обычных атак на 60% и снимает оглушение. КД 50 сек.', color:'#f0c36a', active:true},
  pt: {name:'ПТ', icon:'◆', cost:200, totalCost:1200, desc:'Сборка: Сапог Джоэла + Клыки Васьки + 200 монет. Пассивно: +150 урона, +60 скорости передвижения и ускорение атак.', color:'#ff9e5d', active:false},
  blink: {name:'Блинк', icon:'◇', cost:1150, range:500, desc:'Активный: телепортирует героя к курсору на расстояние до 500 единиц, сбрасывая движение и атаку. КД 20 сек.', color:'#8fd8ff', active:true},
  evsyutin: {name:'Еблет Евсютина', icon:'♥', cost:1250, desc:'Пассивно: +500 к максимальному и текущему здоровью.', color:'#ff7898', hp:500, active:false},
  mantledSteel: {name:'Мантированная сталь', icon:'▣', cost:2400, desc:'Активный: создаёт 3 точные копии героя на 7 секунд. КД 14 сек.', color:'#b8c7d9', manaCost:80, active:true},
  manaTome: {name:'Научилсяловить', icon:'✧', cost:550, desc:'Пассивно: увеличивает восстановление маны на 10%.', color:'#7ed6ff', manaRegen:0.10, active:false},
  manaHooves: {name:'Капыта-Дерезладия', icon:'♢', cost:1400, desc:'Пассивно: +800 к максимальной и текущей мане.', color:'#c59cff', maxMp:800, active:false},
  superBoots: {name:'Супер сапог', icon:'⬆', cost:2950, desc:'Пассивно: +70 к скорости передвижения. Активный: ещё +110 скорости на 6 сек. КД 24 сек.', color:'#ffd34f', speed:70, activeSpeed:110, activeDuration:6, cooldown:24, active:true},
  aghanimHead: {name:'Бошка Агнии', icon:'✹', cost:3000, desc:'Активный: на 10 сек. даёт +180 урона, +100 скорости передвижения и ускоряет атаки. КД 30 сек.', color:'#ff74d4', manaCost:90, activeDuration:10, cooldown:30, active:true},
  ilyaHair: {name:'Волосы Ильи', icon:'☄', cost:1500, desc:'Пассивно: +10 скорости, +60 урона и -20% урона от обычных атак. Активный: оглушает выбранного врага на 4 сек. КД 25 сек.', color:'#e9f5ff', cooldown:25, active:true, speed:10, damage:60, attackResist:0.2, stunDuration:4},
  aghanimShard: {name:'Аганим шард', icon:'⬢', cost:1400, desc:'При покупке добавляет герою персональную способность G. Эффект зависит от выбранного героя и предмет не занимает слот инвентаря.', color:'#8be9fd', active:false, cooldown:35},
  enemy302: {name:'Враги-302 школы', icon:'⌛', cost:1350, desc:'Пассивно: сокращает перезарядку всех обычных способностей героя на 30%. На предметы не влияет.', color:'#f3b4ff', cooldownReduction:0.30, active:false},
  tornBrainHand: {name:'Оторванная рука мо3гов', icon:'☠', cost:1300, desc:'Активный: телепортирует героя к выбранному врагу и наносит ему 350 физического урона. КД 12 сек.', color:'#d7a879', cooldown:12, active:true},
  munition: {name:'Мунуция', icon:'⚙', cost:4500, desc:'Активный: на 3 сек. резко ускоряет атаки героя. КД 18 сек.', color:'#f5d36b', manaCost:60, activeDuration:3, cooldown:18, attackSpeed:6, active:true},
  hatchet: {name:'Топорик', icon:'🪓', cost:125, desc:'Пассивно: +35 урона. Активный: срубает ближайшее дерево в радиусе 150. КД 10 сек.', color:'#c68b5b', cooldown:10, damage:35, active:true}
  ,satanic: {name:'Сатаник', icon:'♦', cost:2900, desc:'Пассивно: +660 к максимальному и текущему здоровью. Обычные атаки возвращают 25% нанесённого урона.', color:'#d83b55', hp:660, lifesteal:0.25, active:false}
  ,arcadiaScar: {name:'Шрам-Аркадия', icon:'✦', cost:2400, desc:'Активный: на 7 сек. даёт +250 урона и ускоряет атаки в 3 раза относительно базовой скорости. КД 24 сек.', color:'#ff7043', manaCost:100, activeDuration:7, damage:250, attackSpeed:2, cooldown:24, active:true}
  ,kinglandia: {name:'Кингляндия', icon:'♛', cost:4450, desc:'Пассивно: +650 к урону обычных атак.', color:'#f4d35e', damage:650, active:false}
  ,gur: {name:'Гур', icon:'⬆', cost:1600, desc:'Активный: подбрасывает выбранного врага на 0,8 сек. и даёт герою на 12 сек. +150 урона, +100 скорости передвижения и ускорение атак. КД 28 сек.', color:'#d9f2ff', activeDuration:12, damage:150, attackSpeed:0.8, moveSpeed:100, cooldown:28, active:true}
  ,dagonEmpire: {name:'Дагонская империя', icon:'⚡', cost:1100, desc:'Активный: наносит выбранному вражескому бойцу 1200 магического урона. КД 10 сек.', color:'#ff4f8b', cooldown:10, damage:1200, active:true}
  ,timurPillow: {name:'Подушка тимура', icon:'☁', cost:200, desc:'Активный расходуемый предмет: лечит 600 HP за 10 секунд. Любой урон врага сразу прерывает лечение.', color:'#9ed8ff', active:true}
  ,brainEye: {name:'Оторванный Глаз Мозгов', icon:'◉', cost:1900, desc:'Пассивно: +210 к дальности атаки героя.', color:'#ff8fd8', attackRange:210, active:false}
  ,brainAss: {name:'Срака мо3гов', icon:'✹', cost:3300, desc:'Активный: на 2 секунды даёт +350 к скорости атаки и +250 к урону. КД 24 секунды.', color:'#ff638d', activeDuration:2, attackSpeed:3.5, damage:250, cooldown:24, active:true}
  ,aghanimScepter: {name:'Аганим Скептер', icon:'✹', cost:2000, desc:'Пассивно: улучшает уникальную механику героя — дополнительные снаряды, заряды, радиус или урон зависят от героя.', color:'#b992ff', active:false}
};
const SHOP_ITEM_IDS = [
  'mango','joelBoots','tango','fangs','bkb','pt','blink','evsyutin',
  'mantledSteel','manaTome','manaHooves','superBoots','aghanimHead',
  'ilyaHair','aghanimShard','enemy302','tornBrainHand','munition',
  'hatchet','satanic','arcadiaScar','kinglandia','gur','dagonEmpire',
  'timurPillow','brainEye','aghanimScepter','brainAss'
];
for(const item of Object.values(SHOP_ITEMS)){
  if(typeof item.cost === 'number') item.cost = Math.round(item.cost * 0.93);
  if(typeof item.totalCost === 'number') item.totalCost = Math.round(item.totalCost * 0.93);
}
SHOP_ITEMS.bkb.cost = 1750;
SHOP_ITEMS.mantledSteel.cost = 2400;
SHOP_ITEMS.ilyaHair.cost = 1500;
SHOP_ITEMS.arcadiaScar.cost = 2400;
SHOP_ITEMS.dagonEmpire.cost = 1100;
SHOP_ITEMS.dagonEmpire.cooldown = 10;
SHOP_ITEMS.dagonEmpire.damage = 1200;
SHOP_ITEMS.timurPillow.cost = 200;
SHOP_ITEMS.tornBrainHand.cost = 1300;
SHOP_ITEMS.tornBrainHand.cooldown = 12;
SHOP_ITEMS.brainAss.cost = 3300;
/* Новые предметы добавлены ПОСЛЕ множителя 0.93, поэтому цена в магазине ровно такая, как указана. */
SHOP_ITEMS.dianaPants = {
  name:'Трусы Дианы', icon:'♡', cost:3500, color:'#ff6fb0', active:true,
  desc:'Пассивно: +60 к урону обычных атак и способностей. Активный (без перезарядки): включает/выключает ауру — пока она включена, каждую секунду наносит небольшой урон (35) всем врагам и крипам рядом.',
  damage:60, auraDamage:35, auraRadius:360, auraInterval:0.5
};
SHOP_ITEMS.girfsyutin = {
  name:'Жирфсютин', icon:'♥', cost:4000, color:'#ff9a5c', active:false,
  desc:'Пассивно: +1800 к максимальному и текущему здоровью.',
  hp:1800
};
SHOP_ITEMS.eggGolly = {
  name:'Яйцо-голли', icon:'🥚', cost:1800, color:'#8be9fd', active:true,
  desc:'Активный: на 2 секунды даёт +250 к скорости передвижения. КД 25 секунд.',
  activeDuration:2, cooldown:25, moveSpeed:250
};
SHOP_ITEMS.eggGolly.cost = 1800;
SHOP_ITEMS.zamist = {
  name:'Замисть', icon:'⇄', cost:2900, color:'#ed3d4e', active:true,
  desc:'Активный: на 10 секунд даёт +65% сопротивления урону, +100 к урону и +50 к скорости. КД 30 сек.',
  activeDuration:10, cooldown:30, damage:100, moveSpeed:50, damageResistance:0.65
};
SHOP_ITEM_IDS.push('dianaPants','girfsyutin','eggGolly','zamist');

/* ===== Пять новых предметов: Кая и Санга, Вейкер Ветра, Святой медальон, Нуллификатор, Диспёрсер ===== */
SHOP_ITEMS.kayaSange = {
  name:'Кая и Санга', icon:'❖', cost:3400, color:'#7fb8ff', active:false,
  desc:'Пассивно: +450 к максимальному и текущему здоровью, +350 к максимальной и текущей мане, +18% к урону способностей и 25% сопротивления эффектам — оглушение, замедление и безмолвие на вас длятся на 25% меньше.',
  hp:450, maxMp:350, spellAmp:0.18, statusResist:0.25
};
SHOP_ITEMS.windWaker = {
  name:'Вейкер Ветра', icon:'≋', cost:3900, color:'#7fe9d4', active:true,
  desc:'Активный: поднимает в ураган вас или выбранного союзника на 2,5 сек. и снимает с него вредные эффекты. В урагане боец неуязвим и свободно летает над деревьями, но не может атаковать и применять способности. Дальность 700. КД 22 сек.',
  cooldown:22, duration:2.5, castRange:700
};
SHOP_ITEMS.holyLocket = {
  name:'Святой медальон', icon:'✿', cost:2500, color:'#ffd978', active:true,
  desc:'Пассивно: +30% ко всему получаемому лечению; каждые 4 сек. накапливает заряд (до 20). Активный: тратит все заряды и мгновенно восстанавливает вам или выбранному союзнику 30 HP и 15 маны за каждый заряд. Дальность 700. КД 4 сек.',
  healAmp:0.30, maxCharges:20, chargeInterval:4, hpPerCharge:30, mpPerCharge:15, cooldown:4, castRange:700
};
SHOP_ITEMS.nullifier = {
  name:'Нуллификатор', icon:'⊘', cost:3600, color:'#b07cff', active:true,
  desc:'Активный: на 5 сек. вешает на вражеского бойца печать пустоты — срывает с него все положительные эффекты сразу и продолжает срывать новые каждый кадр. Пока печать действует, у цели не работают БКБ, Замисть, Супер сапог, Мантированная сталь, Подушка Тимура и Вейкер Ветра. Дальность 700. КД 16 сек.',
  cooldown:16, duration:5, castRange:700
};
SHOP_ITEMS.disperser = {
  name:'Диспёрсер', icon:'✣', cost:3100, color:'#6fe0ff', active:true,
  desc:'Пассивно: +30 к скорости передвижения. Активный на врага: сжигает 250 маны, наносит магический урон, равный 60% сожжённой маны, и замедляет на 50% на 4 сек. На союзника или себя: снимает оглушение, замедление, безмолвие и вредные эффекты и даёт +180 к скорости на 4 сек. Дальность 650. КД 14 сек.',
  speed:30, manaBurn:250, burnDamageRatio:0.6, slow:0.5, slowDuration:4, hasteSpeed:180, hasteDuration:4, cooldown:14, castRange:650
};
SHOP_ITEM_IDS.push('kayaSange','windWaker','holyLocket','nullifier','disperser');
const SHOP_ITEM_VIEWS = SHOP_ITEM_IDS.map(id => ({...SHOP_ITEMS[id], id}));

/* Общие помощники для новых предметов. */
function heroHasItem(unit, id){ return !!(unit && unit.inventory && unit.inventory.some(i => i && i.id === id)); }
function healAmpOf(unit){ return heroHasItem(unit,'holyLocket') ? 1 + SHOP_ITEMS.holyLocket.healAmp : 1; }
function statusResistOf(unit){ return heroHasItem(unit,'kayaSange') ? SHOP_ITEMS.kayaSange.statusResist : 0; }
const POSITIVE_BUFF_TYPES = new Set(['armor','shardArmor','spd','as','dmg','haste','regen','hpregen','shardShield','shardBlade','shardSpell','juvsyutGuard','dawnShardShield','tribuShield','mageReflect','bladeFury','bloodrage','enchantTotem','ilyaAura','exileRage','reginaUnleash','electricOverload']);
const NEGATIVE_BUFF_TYPES = new Set(['burning','poison','yosypPoison','yosypDrain','fear','shardMark']);
const NULLIFY_BLOCKED_ITEMS = new Set(['bkb','zamist','superBoots','mantledSteel','timurPillow','windWaker']);
/* Срывает положительные эффекты и защитные предметы (Нуллификатор, Ураган). */
function purgePositiveEffects(unit){
  if(!unit) return;
  if(unit.buffs && unit.buffs.some(b => POSITIVE_BUFF_TYPES.has(b.type) && !b.isOrb && !(b.t >= 9000)))
    unit.buffs = unit.buffs.filter(b => !POSITIVE_BUFF_TYPES.has(b.type) || b.isOrb || b.t >= 9000);
  unit.bkbActive = 0; unit.windTimer = 0; unit.timurPillow = 0;
  if(unit.inventory) for(const it of unit.inventory){
    if(it && NULLIFY_BLOCKED_ITEMS.has(it.id) && it.activeTimer > 0) it.activeTimer = 0;
  }
}
/* Снимает оглушение, замедление, безмолвие и вредные эффекты (Диспёрсер, Вейкер Ветра). */
function purgeNegativeEffects(unit){
  if(!unit) return;
  unit.stunTimer = 0; unit.slowT = 0; unit.slow = 0; unit.silenceTimer = 0; unit.attackSlowT = 0;
  if(unit.buffs && unit.buffs.some(b => NEGATIVE_BUFF_TYPES.has(b.type))) unit.buffs = unit.buffs.filter(b => !NEGATIVE_BUFF_TYPES.has(b.type));
}
/* Цель предмета: союзный герой под курсором или сам владелец. null — если цель слишком далеко. */
function pickAllyOrSelf(hero, range){
  const hovered = pickUnitAt(mouse.wx, mouse.wy);
  const target = (hovered && !hovered.dead && hovered.team === hero.team && hovered.type === 'hero' && !hovered.isIllusion) ? hovered : hero;
  if(target !== hero && Math.hypot(target.x-hero.x, target.y-hero.y) > range + target.radius){ flashMsg(hero, 'Слишком далеко'); return null; }
  return target;
}

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
      hover: {from:760,to:1120,duration:0.09,type:'triangle',volume:0.025},
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

function playPurchaseChime(){
  try {
    abilityAudioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const context=abilityAudioContext;
    context.resume();
    const start=context.currentTime;
    for(const [frequency,delay,duration,volume] of [[1480,0,0.18,0.06],[1976,0.045,0.2,0.045],[2489,0.09,0.24,0.03]]){
      const oscillator=context.createOscillator(), gain=context.createGain();
      oscillator.type='sine';
      oscillator.frequency.setValueAtTime(frequency,start+delay);
      oscillator.frequency.exponentialRampToValueAtTime(frequency*0.72,start+delay+duration);
      gain.gain.setValueAtTime(0.0001,start+delay);
      gain.gain.exponentialRampToValueAtTime(volume,start+delay+0.008);
      gain.gain.exponentialRampToValueAtTime(0.001,start+delay+duration);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(start+delay); oscillator.stop(start+delay+duration+0.02);
    }
  } catch(err) {}
}

function playAbilitySound(kind){
  if(kind==='purchase'){ playPurchaseChime(); return; }
  playSynthSfx(kind === 'coin' ? 'coin' : kind === 'level' ? 'level' : 'cast');
}

function playHeroSfx(kind){
  if(kind === 'attack_tribupainer'){ playSynthSfx('shotgun'); return; }
  if(kind === 'savelyCry'){ playSynthSfx('stun'); return; }
  if(kind === 'savelyTransform'){ playSynthSfx('level'); return; }
  if(kind === 'savelyFear'){ playSynthSfx('ultimate'); return; }
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
      attack_mageHunter: [190, 520, 'sawtooth'], attack_dawnMaiden: [85, 190, 'square'], attack_exileKnight: [110, 260, 'sawtooth'], attack_savely: [105, 310, 'square'], shotgun: [75, 420, 'sawtooth']
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

/* =========================================================
   ДИКТОР: очередь фраз с приоритетами (speechSynthesis, en-US)
   ========================================================= */
const ANNOUNCER = {queue:[], speaking:false, token:0, last:{}, enabled:true};
function announcerVoice(){
  try {
    const voices = window.speechSynthesis.getVoices().filter(v => /^en(?:-|_)/i.test(v.lang || ''));
    return voices.find(v => /male|david|mark|daniel|alex|guy|george|ryan/i.test(v.name)) || voices[0] || null;
  } catch(err) { return null; }
}
function announce(text, opts={}){
  if(!ANNOUNCER.enabled || !text) return;
  if(!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
  const now = performance.now();
  if(opts.key){
    const prev = ANNOUNCER.last[opts.key];
    if(prev && now - prev < (opts.cooldown || 0) * 1000) return;
    ANNOUNCER.last[opts.key] = now;
  }
  if(opts.interrupt){
    ANNOUNCER.queue.length = 0;
    ANNOUNCER.token++;
    ANNOUNCER.speaking = false;
    try { window.speechSynthesis.cancel(); } catch(err) {}
  }
  if(ANNOUNCER.queue.length >= 4) ANNOUNCER.queue.shift();
  ANNOUNCER.queue.push({text, rate:opts.rate, pitch:opts.pitch});
  pumpAnnouncer();
}
function pumpAnnouncer(){
  if(ANNOUNCER.speaking || !ANNOUNCER.queue.length) return;
  const item = ANNOUNCER.queue.shift();
  const token = ++ANNOUNCER.token;
  const finish = () => {
    if(ANNOUNCER.token !== token) return;
    ANNOUNCER.speaking = false;
    pumpAnnouncer();
  };
  try {
    const voice = new SpeechSynthesisUtterance(item.text);
    voice.lang = 'en-US';
    voice.rate = item.rate || 0.9;
    voice.pitch = item.pitch || 0.5;
    voice.volume = 1;
    const chosen = announcerVoice();
    if(chosen) voice.voice = chosen;
    voice.onend = finish;
    voice.onerror = finish;
    ANNOUNCER.speaking = true;
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(voice);
    /* Chrome иногда не присылает onend — страховка, чтобы очередь не зависла. */
    setTimeout(finish, 6000);
  } catch(err) { ANNOUNCER.speaking = false; }
}
function announcerStop(){
  ANNOUNCER.queue.length = 0; ANNOUNCER.token++; ANNOUNCER.speaking = false;
  try { window.speechSynthesis.cancel(); } catch(err) {}
}
const SPREE_LINES = {
  3:['Killing Spree!','СЕРИЯ УБИЙСТВ'], 4:['Dominating!','ДОМИНИРОВАНИЕ'], 5:['Mega Kill!','МЕГА-УБИЙСТВО'],
  6:['Unstoppable!','НЕОСТАНОВИМЫЙ'], 7:['Wicked Sick!','ПРЕВОСХОДНО'], 8:['Monster Kill!','МОНСТРУОЗНОЕ УБИЙСТВО'],
  9:['Godlike!','БОЖЕСТВЕННО'], 10:['Holy Shit!','БОГОПОДОБНО']
};
function spreeLine(count){ return count >= 11 ? ['Beyond Godlike!','БОГОПОДОБНО'] : (SPREE_LINES[count] || null); }
const DRAFT_LINES = {30:'30 seconds remaining to pick!', 20:'20 seconds remaining!', 10:'10 seconds remaining!', 5:'5 seconds remaining!', 0:'Time is up!'};
const PREMATCH_LINES = {30:'30 seconds until the battle begins!', 15:'15 seconds until the battle begins!', 10:'10 seconds remaining!',
  5:'5...', 4:'4...', 3:'3...', 2:'2...', 1:'1...', 0:'Let the battle begin!'};
const PREMATCH_SECONDS = 30;
let prematchTime = 0, prematchLastSec = Infinity, draftLastSec = Infinity;
let firstBloodDone = false, resultAnnounced = false;

function updatePrematch(dt){
  prematchTime -= dt;
  const sec = Math.max(0, Math.ceil(prematchTime));
  if(sec !== prematchLastSec){
    prematchLastSec = sec;
    const line = PREMATCH_LINES[sec];
    if(line) announce(line, {interrupt: sec <= 5, rate: sec <= 5 ? 0.8 : 0.9});
  }
  if(prematchTime <= 0) prematchTime = 0;
}
/* Подготовка к бою: игроки и боты свободно ходят по всей карте. Боты сначала
   закупаются, потом расходятся по позициям своих линий. Если рядом оказывается
   враг — включается обычный боевой ИИ, так что заварушка возможна уже сейчас. */
function updatePrematchBotAI(h, dt){
  if(h.dead || h.isDummy) return;
  const range = Math.min(h.vision || 900, 950);
  let enemy = null, best = range;
  for(const u of heroes){
    if(!u || u.dead || u.team === h.team) continue;
    const d = Math.hypot(u.x - h.x, u.y - h.y);
    if(d < best){ best = d; enemy = u; }
  }
  if(enemy || (h.combatTimer || 0) > 0){ updateEnemyAI(h, dt); return; }

  h.prematchShopT = (h.prematchShopT || 0) - dt;
  if(h.prematchShopT <= 0){
    h.prematchShopT = 0.6;
    if(h.coins >= 70) buyBotItem(h);
  }
  if(h.attackTarget && (h.attackTarget.dead || h.attackTarget.team === h.team)) h.attackTarget = null;
  h.prematchWanderT = (h.prematchWanderT || 0) - dt;
  const arrived = h.moveTarget && Math.hypot(h.moveTarget.x - h.x, h.moveTarget.y - h.y) < 70;
  if(h.prematchWanderT <= 0 || arrived || !h.moveTarget){
    h.prematchWanderT = 2.5 + Math.random() * 3.5;
    const spot = h.hp < h.maxHp * 0.65 ? spawnRoomCenter(h.team) : botLaneObjective(h);
    h.attackTarget = null;
    h.moveTarget = {x: clamp(spot.x + rnd(-170, 170), 60, WORLD - 60), y: clamp(spot.y + rnd(-170, 170), 60, WORLD - 60)};
  }
}
function drawPrematchOverlay(){
  if(prematchTime <= 0 || gameState !== 'playing') return;
  const sec = Math.ceil(prematchTime);
  const y = VW < 760 ? 74 : 92;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px Georgia, serif'; ctx.fillStyle = '#e8c984';
  ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText('ДО НАЧАЛА БИТВЫ', VW/2, y); ctx.fillText('ДО НАЧАЛА БИТВЫ', VW/2, y);
  ctx.font = '900 44px Georgia, serif';
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.9)'; ctx.strokeText(String(sec), VW/2, y + 44);
  ctx.fillStyle = sec <= 5 ? '#ff4a3a' : '#fff0c7'; ctx.fillText(String(sec), VW/2, y + 44);
  ctx.font = '12px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.lineWidth = 3;
  const hint = 'Закупайся и занимай позицию — ПКМ: идти. Драться можно уже сейчас';
  ctx.strokeText(hint, VW/2, y + 66); ctx.fillText(hint, VW/2, y + 66);
  ctx.restore();
}
function noteStructureAttack(target, source, fromSync){
  if(!playerHero || gameState !== 'playing' || !target) return;
  if(target.type !== 'tower' && target.type !== 'barracks' && target.type !== 'ancient') return;
  if(source && source.team === target.team) return;
  const mine = target.team === playerHero.team;
  if(target.type === 'ancient'){
    if(mine) announce('Your base is under attack!', {key:'baseAttack', cooldown:20});
    return;
  }
  if(mine) announce('Your tower is under attack!', {key:'towerAttackMine', cooldown:20});
  else if(fromSync || (source && source.team === playerHero.team)) announce('Enemy tower is under attack!', {key:'towerAttackEnemy', cooldown:25});
}

function playRampageVoice(){
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
const MENU_MUSIC_BASS = [55, 73.42, 82.41, 98, 110, 123.47, 146.83, 110];
const MENU_MUSIC_MELODY = [293.66, 0, 329.63, 0, 392, 0, 349.23, 0];

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
  playMenuNote(MENU_MUSIC_BASS[step], 2.8, 0.15, 'sine');
  playMenuNote(MENU_MUSIC_BASS[step] * 2, 2.2, 0.04, 'sine');
  if(MENU_MUSIC_MELODY[step]){
    playMenuNote(MENU_MUSIC_MELODY[step], 1.5, 0.045, 'sine');
  }
  menuMusicStep++;
}

function playDraftMusicStep(){
  if(!musicEnabled || !menuAudioContext || gameState !== 'menu' || menuStage !== 'draft') return;
  const step = menuMusicStep++ % 8;
  const notes = [146.83,164.81,196,220,196,164.81,130.81,164.81];
  playMenuNote(notes[step], 0.78, 0.16, 'triangle');
  playMenuNote(notes[step] * 2, 0.34, 0.05, 'sine');
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
    menuMusicGain.gain.setTargetAtTime(0.12, menuAudioContext.currentTime, 0.35);
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
  if(storeShovelOwned) phrases.push('shovel');
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
  {id:'abuuu', label:'АБУУУУ РАРАРАР', text:'АБУУУУУУУУ! РА-РА-РА!', color:'#ff8278'},
  {id:'shovel', label:'ЛОПАТА', text:'Лопата челлендж!', color:'#ffb347'}
];
const STORE_PHRASE_CARDS = [
  {id:'legacy',title:'КЛАССИКА',desc:'Короля не убить!',color:'#ffd568'},
  {id:'chip',title:'КОРОЛЬ-ЧИП',desc:'А Чип короооооооль!',color:'#ff9fbd'},
  {id:'pesik',title:'АНИМЕ-ФРАЗА',desc:'Пёсик, пёсик — ав-ав-ав!',color:'#8be9fd'},
  {id:'feedimidi',title:'ФИДИ МИДИ',desc:'Фиди миди',color:'#ffd568'},
  {id:'nineteen',title:'ПАЦАНЫ, МНЕ 19',desc:'Страшная реплика',color:'#bda8ff'},
  {id:'abuuu',title:'АБУУУУ РАРАРАР',desc:'Кричалка',color:'#ff8278'},
  {id:'shovel',title:'ЛОПАТА ЧЕЛЛЕНДЖ',desc:'Лопата челлендж!',color:'#ffb347'}
];

function isStorePhraseOwned(id){
  if(id==='legacy') return storePhraseOwned;
  if(id==='chip') return storeChipOwned;
  if(id==='pesik') return storeAudioOwned;
  if(id==='feedimidi') return storeFeedimidiOwned;
  if(id==='nineteen') return storeNineteenOwned;
  if(id==='abuuu') return storeAbuuuOwned;
  if(id==='shovel') return storeShovelOwned;
  return false;
}

function unlockStorePhrase(id){
  if(id==='legacy') storePhraseOwned=true;
  if(id==='chip') storeChipOwned=true;
  if(id==='pesik') storeAudioOwned=true;
  if(id==='feedimidi') storeFeedimidiOwned=true;
  if(id==='nineteen') storeNineteenOwned=true;
  if(id==='abuuu') storeAbuuuOwned=true;
  if(id==='shovel') storeShovelOwned=true;
}

function saveReginaSkinState(){
  try {
    localStorage.setItem('shadowRampageCosmetics',JSON.stringify({
      redReginaOwned:redReginaSkinOwned,redReginaEquipped:redReginaSkinEquipped
    }));
  } catch(err) {}
}

function setReginaSkinEquipped(equipped){
  if(!redReginaSkinOwned) return;
  redReginaSkinEquipped=equipped;
  if(playerHero && playerHero.def.id==='regina') playerHero.skinId=equipped?'reginaRed':null;
  saveReginaSkinState();
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
  const shovelSettings = {text:'Лопата челлендж!', rate:1.08, pitch:0.85, pattern:/male|муж|dmitri|alex|pavel|deep|bass|baritone/i};
  const settings = variant === 'shovel' ? shovelSettings : (variant === 'feedimidi'
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
        : {text:'А Чип короооооооль!', rate:0.78, pitch:0.48, pattern:/male|муж|dmitri|alex|pavel|deep|bass|baritone/i}))))));

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
    menuMusicGain.gain.setTargetAtTime(0.12, menuAudioContext.currentTime, 0.5);
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
  earthshaker:'Enchant Totem превращается в прыжок с приземлением, наносящим урон и оглушение по области',
  savely:'Форма Трансформера длится дольше, уворот срабатывает на каждом третьем ударе и Савелий получает +30% сопротивления магии'
};

function applyDamage(target, amount, source){
  if(!target || target.dead) return;
  const sourceHero = source && source.coins !== undefined
    ? source
    : (source && source.source && source.source.coins !== undefined ? source.source : null);
  if(target.onlinePlayerId && sourceHero && sourceHero.isOnlineReplicatedCast) return;
  if(target.onlinePlayerId && sourceHero && sourceHero.isPlayer && sourceHero.team === target.team) return;
  if(isBuilding(target) && source && Number.isInteger(source.team) && source.team === target.team) return;
  if(target.invulnerable || target.windTimer > 0) return;
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
  if(source && source.attack && target.def && target.def.id === 'savely'){
    target.savelyPhysicalHits = (target.savelyPhysicalHits || 0) + 1;
    if(target.savelyPhysicalHits % (hasScepter(target) ? 3 : 4) === 0){
      addText(target.x,target.y-target.radius-24,'ПРОМАХ • УВОРОТ','#ffe08a',0.8,14);
      fxRing(target.x,target.y,34,'#ffd36b',0.25);
      return;
    }
  }
  if(!(source && source.attack) && target.def && target.def.id === 'savely' && hasScepter(target)) amount *= 0.70;
  const zamist=target.inventory&&target.inventory.find(item=>item&&item.id==='zamist');
  if(zamist&&zamist.activeTimer>0) amount*=1-SHOP_ITEMS.zamist.damageResistance;
  if(source && source.attack && attackResistance) amount *= 1 - attackResistance;
  const shardShield = target.buffs && target.buffs.some(buff => buff.type === 'shardShield');
  if(source && source.attack && shardShield) amount *= 0.65;
  const juvsyutGuard = target.buffs && target.buffs.find(buff => buff.type === 'juvsyutGuard');
  if(juvsyutGuard && source && source.team !== target.team) amount *= juvsyutGuard.multiplier || 0.72;
  const shardMark = target.buffs && target.buffs.find(buff => buff.type === 'shardMark');
  if(shardMark) amount *= 1 + shardMark.val;
  if(source && source.def && source.def.id === 'golly' && source.buffs && source.buffs.some(b => b.type === 'gollyRed')) amount *= 2;
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
      const burn = 24 + sourceHero.level * 7;
      target.mp = Math.max(0, (target.mp || 0) - burn);
      spawnParticles(target.x, target.y, '#c56cff', 7, 0.45);
      fxRing(target.x, target.y, 28, '#c56cff', 0.18);
    }
    if(sourceHero.def.id === 'dawnMaiden'){
      const blessingLevel=(sourceHero.skills.find(skill=>skill.id==='dawnBlessing')||{level:0}).level;
      for(const ally of heroes){
        if(ally.team === sourceHero.team && !ally.dead && Math.hypot(ally.x-sourceHero.x, ally.y-sourceHero.y) < 300){
          ally.hp = Math.min(ally.maxHp, ally.hp + 24 + blessingLevel*8 + sourceHero.level*3);
          spawnParticles(ally.x, ally.y, '#fff0a8', 5, 0.3);
        }
      }
    }
        if(sourceHero.def.id === 'exileKnight' && !sourceHero.splashing && target.type !== 'tower'){
      sourceHero.splashing = true;
      for(const nearby of units){
          if(nearby !== target && !nearby.dead && nearby.team !== sourceHero.team && nearby.team !== 2 && !isBuilding(nearby) &&
            Math.hypot(nearby.x-target.x, nearby.y-target.y) < 130)
            applyDamage(nearby, amount * 0.60, {team:sourceHero.team, source:sourceHero, attack:true, fangsDamageIncluded:true, fangsDamageScale:0.60, dianaDamageIncluded:true, dianaDamageScale:0.60});
      }
      sourceHero.splashing = false;
      fxBeam(sourceHero.x, sourceHero.y, target.x, target.y, '#ff707a', 0.16);
    }
  }
  if(sourceHero && sourceHero.def && !(source && (source.attack || source.skipAbilityScaling))){
    const bloodrage = sourceHero.buffs && sourceHero.buffs.find(buff => buff.type === 'bloodrage');
    if(bloodrage) amount *= bloodrage.spellMult;
    const shardSpell = sourceHero.buffs && sourceHero.buffs.find(buff => buff.type === 'shardSpell');
    if(shardSpell) amount *= shardSpell.val;
    if(sourceHero.spellAmp) amount *= 1 + sourceHero.spellAmp;
    if(heroHasItem(sourceHero,'kayaSange')) amount *= 1 + SHOP_ITEMS.kayaSange.spellAmp;
    const heroScale = sourceHero.def.id === 'grisha'
      ? GRISHA_ABILITY_DAMAGE_MULT
      : (sourceHero.def.abilityDamageScale || 1);
    const skillLevelScale = sourceHero.castingSkillLevel > 1
      ? 1 + (sourceHero.castingSkillLevel - 1) * 0.22
      : 1;
    const lateSkillScale = sourceHero.def.lateSkillGrowth
      ? 1 + Math.max(0, sourceHero.level - 10) * sourceHero.def.lateSkillGrowth
      : 1;
    amount *= heroScale * skillLevelScale * heroLevelSkillDamageMult(sourceHero.level) * lateSkillScale;
  }
  const reflect = target.buffs && target.buffs.find(buff => buff.type === 'mageReflect');
  if(reflect && sourceHero && sourceHero.team !== target.team && source && !source.attack){
    applyDamage(sourceHero, amount * reflect.val, {team:target.team, source:target, magic:true});
    fxRing(target.x, target.y, 105, '#d58cff', 0.35);
  }
  noteStructureAttack(target, source, false);
  const armor = target.getArmor ? target.getArmor() : (target.armor || 0);
  const structureBonus = target.type === 'tower' ? 1.2 : 1;
  const fangsBonus = sourceHero && sourceHero.inventory && sourceHero.inventory.some(item => item && item.id === 'fangs')
    ? SHOP_ITEMS.fangs.damage
    : 0;
  const dianaBonus = sourceHero && sourceHero.inventory && sourceHero.inventory.some(item => item && item.id === 'dianaPants')
    ? SHOP_ITEMS.dianaPants.damage
    : 0;
  const fangsInAmount = fangsBonus && source && source.fangsDamageIncluded
    ? fangsBonus * (source.fangsDamageScale || 1)
    : 0;
  const dianaInAmount = dianaBonus && source && source.dianaDamageIncluded
    ? dianaBonus * (source.dianaDamageScale || 1)
    : 0;
  const amountBeforeFlatBonuses = Math.max(0, amount - fangsInAmount - dianaInAmount);
  const mitigatedDamage = source && source.trueDamage
    ? Math.max(1, amountBeforeFlatBonuses)
    : Math.max(1, amountBeforeFlatBonuses * armorMult(armor) * structureBonus);
  const fangsDamage = fangsBonus * (source && source.attack ? (source.fangsDamageScale || 1) : 1);
  const dianaDamage = dianaBonus * (source && source.attack ? (source.dianaDamageScale || 1) : 1);
  const dmg = mitigatedDamage + fangsDamage + dianaDamage;
  if(isStructure(target) && target.isServerAuthoritative && window.__shadowOnlineMatch){
    const onlineSocket = window.__shadowOnlineSocket;
    if(onlineSocket && onlineSocket.connected && sourceHero && sourceHero.isPlayer &&
       sourceHero.onlinePlayerId === onlineSocket.id && sourceHero.team !== target.team){
      onlineSocket.emit('playerDamage',{towerId:target.id,amount:dmg});
    } else if(onlineSocket && onlineSocket.connected && sourceHero && sourceHero.isHostedBot && sourceHero.team !== target.team){
      onlineSocket.emit('botProxy',{botId:sourceHero.onlinePlayerId,type:'damage',payload:{towerId:target.id,amount:dmg}});
    }
    return;
  }
  const onlineSocket = window.__shadowOnlineSocket;
      const onlineSourceTeam = sourceHero ? sourceHero.team : source && source.team;
      if(onlineSocket && onlineSocket.connected && target.onlinePlayerId && onlineSourceTeam === 0 &&
        onlineSocket.id !== target.onlinePlayerId && !target.isHostedBot){
    onlineSocket.emit('playerDamage',{targetId:target.onlinePlayerId,amount:dmg});
  } else if(onlineSocket && onlineSocket.connected && sourceHero && sourceHero.isHostedBot && target.type === 'hero' &&
        target.onlinePlayerId && !target.isHostedBot && target.onlinePlayerId !== onlineSocket.id && sourceHero.team !== target.team){
    onlineSocket.emit('botProxy',{botId:sourceHero.onlinePlayerId,type:'damage',payload:{targetId:target.onlinePlayerId,amount:dmg}});
  }
  if(sourceHero && sourceHero.type === 'hero' && sourceHero.team !== target.team && target.type === 'hero'){
    target.damageContributors.set(sourceHero, (target.damageContributors.get(sourceHero) || 0) + dmg);
  }
  if(sourceHero && sourceHero.team !== target.team && sourceHero.inventory && sourceHero.inventory.some(i => i && i.id === 'satanic') && source && source.attack){
    sourceHero.hp = Math.min(sourceHero.maxHp, sourceHero.hp + dmg * SHOP_ITEMS.satanic.lifesteal);
  }
  target.hp -= dmg;
  if(source && source.attack && sourceHero && sourceHero.def && sourceHero.def.id === 'yosyp' && target.buffs){
    const passive = sourceHero.skills.find(skill => skill.id === 'yosypBlowback');
    if(passive && passive.level > 0 && target.team !== sourceHero.team && !isBuilding(target)){
      target.buffs = target.buffs.filter(buff => buff.type !== 'yosypPoison' || buff.source !== sourceHero);
      target.addBuff({type:'yosypPoison',damage:sourceHero.dmg*(0.12+passive.level*0.04),tick:0,t:3,source:sourceHero});
      spawnParticles(target.x,target.y,'#9cff62',8,0.45);
    }
  }
  target.hitFlash = 0.18;
  if(target.type === 'hero') target.combatTimer = 3.2;
  if(sourceHero && sourceHero.type === 'hero') sourceHero.combatTimer = 3.2;
  addText(target.x + rnd(-12,12), target.y - target.radius - 6,
          Math.round(dmg), target.type==='hero' ? '#ff5555' : '#ffd24a', 0.8, 15);
  if(target.hp <= 0) killUnit(target, source);
}

function tickYosypEffects(unit, dt){
  const poison=unit.buffs.find(buff=>buff.type==='yosypPoison');
  if(poison && poison.source && !unit.dead){
    poison.tick=(poison.tick||0)+dt;
    if(poison.tick>=1 || poison.t<=dt+1e-6){ poison.tick=Math.max(0,poison.tick-1); applyDamage(unit,poison.damage,{team:poison.source.team,source:poison.source,magic:true}); }
  }
  const drain=unit.buffs.find(buff=>buff.type==='yosypDrain');
  if(drain && drain.source && !unit.dead){
    drain.tick=(drain.tick||0)+dt;
    if(drain.tick>=1 || drain.t<=dt+1e-6){
      drain.tick=Math.max(0,drain.tick-1);
      applyDamage(unit,75,{team:drain.source.team,source:drain.source,magic:true,trueDamage:true,skipAbilityScaling:true});
      if(!drain.source.dead) drain.source.hp=Math.min(drain.source.maxHp,drain.source.hp+75);
      fxBeam(drain.source.x,drain.source.y,unit.x,unit.y,'#8aff62',0.24);
    }
  }
}

function canBreakBarracks(barracks){
  return !!barracks && barracks.type === 'barracks' && canDamageStructure(barracks, null, true);
}

const GRISHA_ABILITY_DAMAGE_MULT = 0.48;
function heroLevelSkillDamageMult(level){
  if(!level || level <= 1) return 1;
  const earlyLevels = Math.min(level - 1, 9);
  const lateLevels = Math.max(0, level - 10);
  return 1 + earlyLevels * 0.02 + lateLevels * 0.008;
}
function attackLevelDamageMult(level){
  if(!level || level <= 15) return 1;
  return 1 + Math.min(level - 15, 15) * 0.006;
}
function abilityDamage(source, amount){
  return amount;
}

function killUnit(u, source){
  if(u.dead) return;
  u.dead = true; u.hp = 0;
  const rewardHero = source && source.coins !== undefined
    ? source
    : (source && source.source && source.source.coins !== undefined ? source.source : null);
  if(u.type === 'neutral') u.respawnTimer = 30;
  if(rewardHero && rewardHero.team !== u.team){
    const bountyMul = gameModeCfg().creepBountyMul;
    const reward = u.type === 'neutral' ? Math.round(70*bountyMul) : (u.type === 'creep' ? Math.round(60*bountyMul) : (u.type === 'hero' ? 200 : 0));
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
    rewardHero.spreeKills = (rewardHero.spreeKills || 0) + 1;
    const multi = rewardHero.killStreak;
    const isFirstBlood = !firstBloodDone;
    firstBloodDone = true;
    const spree = spreeLine(rewardHero.spreeKills);
    let streak = multi >= 4 ? 'RAMPAGE' : (multi === 3 ? 'ТРОЙНОЕ УБИЙСТВО' :
      (multi === 2 ? 'ДВОЙНОЕ УБИЙСТВО' : (isFirstBlood ? 'ПЕРВАЯ КРОВЬ' : (spree ? spree[1] : 'УБИЙСТВО'))));
    if(multi === 4){
      rampageBanner = {t:4.2, owner:rewardHero, streak:multi};
      playRampageVoice();
    }
    if(rewardHero === playerHero){
      /* Приоритет: Rampage > мульти-килл > первая кровь; серия без смертей идёт следом. */
      if(multi >= 4){
        announce('Rampage!', {interrupt:true, rate:0.8, pitch:0.4});
        if(spree) announce(spree[0]);
      } else {
        if(multi === 3) announce('Triple Kill!', {interrupt:true});
        else if(multi === 2) announce('Double Kill!', {interrupt:true});
        else if(isFirstBlood) announce('First Blood!', {interrupt:true});
        if(spree) announce(spree[0], {interrupt: multi < 2 && !isFirstBlood});
      }
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
    if(playerHero) announce(u.team === playerHero.team ? 'Your tower has fallen!' : 'Enemy tower has been destroyed!', {interrupt:true});
  }
  if(u.type === 'tower'){
    noteBotScenarioTower(1-u.team,u);
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
    if(Math.hypot(h.x-u.x, h.y-u.y) < 1500) gainXp(h, (u.xpValue || 40) * gameModeCfg().xpMul);
  }
  if(u.type === 'hero'){
    noteBotScenarioKill(1-u.team,u);
      playSynthSfx('death');
     if(u === playerHero && rewardHero && rewardHero.team === 1)
       botTaunt(rewardHero, 'playerDeath');
    u.respawnTimer = 8 + u.level * 1.5;
    if(u.def && u.def.id === 'juvsyut') juvsyutResetDevour(u);
    u.killStreak = 0;
    u.spreeKills = 0;
    u.lastHeroKillTime = -Infinity;
    addText(u.x, u.y-60, 'УБИТ!', '#ff3b3b', 1.6, 26);
    const squad = heroes.filter(h => h.team === u.team && h.type === 'hero' && !h.isIllusion);
    if(squad.length >= 2 && squad.every(h => h.dead)) announce('Team Wipe!', {interrupt:true, key:'teamWipe', cooldown:10});
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
  const slashDamageScale = 1.18 + slash.level * 0.08;
  const damage = hero.getDamage() * slashDamageScale;
  applyDamage(target, damage, {team:hero.team, source:hero, attack:true, fangsDamageIncluded:true, fangsDamageScale:slashDamageScale, dianaDamageIncluded:true, dianaDamageScale:slashDamageScale});
  fxBeam(hero.x, hero.y, target.x, target.y, '#fff2a8', 0.18);
  fxRing(target.x, target.y, 38, '#ffe066', 0.35);
  spawnParticles(target.x, target.y, '#fff7c7', 9, 0.42);
  slash.strikes--;
  if(slash.strikes <= 0) slash.t = 0;
}

function getInvokeCooldown(hero, key){
  return hero.spellCooldowns[key] || 0;
}

const FREE_ACTIVATION_ITEM_IDS = new Set([
  'mango','tango','pt','manaHooves','kayaSange','kayaSanga','kayaAndSange',
  'dianaPants','evsyutin','disperser','dneperseer','dnieperseer'
]);
const FREE_ACTIVATION_ITEM_NAMES = new Set(['Кая и Санга','Днепёрсеер','Диспёрсер']);

function getActivationManaCost(item){
  if(!item) return 0;
  const definition = SHOP_ITEMS[item.id];
  if(!definition || !definition.active) return 0;
  if(FREE_ACTIVATION_ITEM_IDS.has(item.id) || FREE_ACTIVATION_ITEM_NAMES.has(definition.name)) return 0;
  return Number.isFinite(definition.manaCost) ? definition.manaCost : 60;
}

function activateInventoryItem(hero, index){
  const item = hero.inventory[index];
  if(!item) return false;
  const cost = getActivationManaCost(item);
  if(cost > 0 && hero.mp < cost){
    flashMsg(hero, 'Недостаточно маны для ' + item.name + ': ' + cost);
    return false;
  }
  if(!performInventoryItemActivation(hero, index)) return false;
  if(cost > 0) hero.mp -= cost;
  return true;
}

function performInventoryItemActivation(hero, index){
  const item = hero.inventory[index];
  if(!item) return false;
  if(hero.nullifyTimer > 0 && NULLIFY_BLOCKED_ITEMS.has(item.id)){ flashMsg(hero, 'Нуллификатор: предмет заблокирован'); return false; }
  if(item.id === 'dianaPants'){
    item.auraOn = !item.auraOn;
    item.auraTimer = 0;
    addText(hero.x, hero.y - 56, item.auraOn ? 'ТРУСЫ ДИАНЫ: ВКЛ' : 'ТРУСЫ ДИАНЫ: ВЫКЛ', '#ff6fb0', 0.9, 15);
    fxRing(hero.x, hero.y, item.auraOn ? SHOP_ITEMS.dianaPants.auraRadius : 60, '#ff6fb0', 0.5);
    return true;
  }
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
  if(item.id === 'eggGolly'){
    if(item.cooldown > 0){ flashMsg(hero, 'Яйцо-голли на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    item.cooldown = SHOP_ITEMS.eggGolly.cooldown;
    item.activeTimer = SHOP_ITEMS.eggGolly.activeDuration;
    addText(hero.x, hero.y - 56, 'ЯЙЦО-ГОЛЛИ: +250 СКОРОСТИ', '#8be9fd', 1.1, 16);
    fxRing(hero.x, hero.y, 96, '#8be9fd', 0.6);
    return true;
  }
  if(item.id === 'zamist'){
    if(item.cooldown > 0){ flashMsg(hero, 'Замисть на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    item.cooldown=SHOP_ITEMS.zamist.cooldown;
    item.activeTimer=SHOP_ITEMS.zamist.activeDuration;
    hero.addBuff({type:'dmg',id:'zamistDamage',val:SHOP_ITEMS.zamist.damage,t:SHOP_ITEMS.zamist.activeDuration});
    addText(hero.x,hero.y-56,'ЗАМИСТЬ: ЗАЩИТА И НАТИСК','#ed3d4e',1.2,16);
    fxRing(hero.x,hero.y,100,'#ed3d4e',0.65);
    return true;
  }
  if(item.id === 'windWaker'){
    const cfg = SHOP_ITEMS.windWaker;
    if(item.cooldown > 0){ flashMsg(hero, 'Вейкер Ветра на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    const target = pickAllyOrSelf(hero, cfg.castRange);
    if(!target) return false;
    purgeNegativeEffects(target);
    target.windTimer = cfg.duration;
    target.silenceTimer = Math.max(target.silenceTimer || 0, cfg.duration);
    target.attackTarget = null;
    item.cooldown = cfg.cooldown;
    addText(target.x, target.y - 64, 'УРАГАН!', '#7fe9d4', 1.2, 17);
    fxRing(target.x, target.y, 110, '#7fe9d4', 0.7);
    fxRing(target.x, target.y, 70, '#e6fffa', 0.5);
    spawnParticles(target.x, target.y, '#bff7ec', 18, 1.2);
    if(target !== hero) fxBeam(hero.x, hero.y, target.x, target.y, '#7fe9d4', 0.3);
    return true;
  }
  if(item.id === 'holyLocket'){
    const cfg = SHOP_ITEMS.holyLocket;
    if(item.cooldown > 0){ flashMsg(hero, 'Святой медальон на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    const charges = Math.floor(item.charges || 0);
    if(charges < 1){ flashMsg(hero, 'В медальоне нет зарядов'); return false; }
    const target = pickAllyOrSelf(hero, cfg.castRange);
    if(!target) return false;
    const amp = healAmpOf(hero);
    const hpGain = Math.min(target.maxHp - target.hp, charges * cfg.hpPerCharge * amp);
    const mpGain = target.maxMp ? Math.min(target.maxMp - target.mp, charges * cfg.mpPerCharge * amp) : 0;
    target.hp += Math.max(0, hpGain);
    if(mpGain > 0) target.mp += mpGain;
    item.charges = 0; item.chargeTimer = 0;
    item.cooldown = cfg.cooldown;
    addText(target.x, target.y - 64, '+' + Math.round(Math.max(0,hpGain)) + ' HP' + (mpGain > 0 ? '  +' + Math.round(mpGain) + ' МП' : ''), '#ffd978', 1.2, 16);
    fxRing(target.x, target.y, 84, '#ffd978', 0.6);
    spawnParticles(target.x, target.y, '#fff0b0', 14, 1);
    if(target !== hero) fxBeam(hero.x, hero.y, target.x, target.y, '#ffd978', 0.3);
    return true;
  }
  if(item.id === 'nullifier'){
    const cfg = SHOP_ITEMS.nullifier;
    if(item.cooldown > 0){ flashMsg(hero, 'Нуллификатор на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    const target = pickUnitAt(mouse.wx, mouse.wy);
    if(!target || target.team === hero.team || target.dead || isBuilding(target)){ flashMsg(hero, 'Наведите на вражеского бойца'); return false; }
    if(Math.hypot(target.x-hero.x, target.y-hero.y) > cfg.castRange + target.radius){ flashMsg(hero, 'Слишком далеко'); return false; }
    purgePositiveEffects(target);
    target.nullifyTimer = cfg.duration;
    item.cooldown = cfg.cooldown;
    addText(target.x, target.y - 64, 'НУЛЛИФИКАТОР', '#b07cff', 1.2, 16);
    fxBeam(hero.x, hero.y, target.x, target.y, '#b07cff', 0.4);
    fxRing(target.x, target.y, 90, '#b07cff', 0.6);
    spawnParticles(target.x, target.y, '#d9bcff', 16, 1);
    return true;
  }
  if(item.id === 'disperser'){
    const cfg = SHOP_ITEMS.disperser;
    if(item.cooldown > 0){ flashMsg(hero, 'Диспёрсер на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    const hovered = pickUnitAt(mouse.wx, mouse.wy);
    let target = hero;
    if(hovered && !hovered.dead && !isBuilding(hovered)){
      if(hovered.team !== hero.team || (hovered.type === 'hero' && !hovered.isIllusion)) target = hovered;
    }
    if(target !== hero && Math.hypot(target.x-hero.x, target.y-hero.y) > cfg.castRange + target.radius){ flashMsg(hero, 'Слишком далеко'); return false; }
    if(target.team !== hero.team){
      const burned = Math.min(target.mp || 0, cfg.manaBurn);
      if(target.mp) target.mp = Math.max(0, target.mp - burned);
      if(burned > 0) applyDamage(target, burned * cfg.burnDamageRatio, {team:hero.team, source:hero, magic:true});
      target.slow = Math.max(target.slowT > 0 ? target.slow : 0, cfg.slow);
      target.slowT = Math.max(target.slowT || 0, cfg.slowDuration);
      addText(target.x, target.y - 64, 'ДИСПЁРСЕР: -' + Math.round(burned) + ' МАНЫ', '#6fe0ff', 1.2, 16);
      fxBeam(hero.x, hero.y, target.x, target.y, '#6fe0ff', 0.4);
      fxRing(target.x, target.y, 80, '#6fe0ff', 0.55);
      spawnParticles(target.x, target.y, '#a8f1ff', 14, 1);
    } else {
      purgeNegativeEffects(target);
      target.buffs = target.buffs.filter(b => b.id !== 'disperserHaste');
      target.addBuff({type:'haste', id:'disperserHaste', t:cfg.hasteDuration});
      addText(target.x, target.y - 64, 'ДИСПЁРСЕР: ОЧИЩЕНИЕ', '#6fe0ff', 1.2, 16);
      fxRing(target.x, target.y, 90, '#6fe0ff', 0.6);
      spawnParticles(target.x, target.y, '#d8fbff', 16, 1.1);
      if(target !== hero) fxBeam(hero.x, hero.y, target.x, target.y, '#6fe0ff', 0.3);
    }
    item.cooldown = cfg.cooldown;
    return true;
  }
  if(item.id === 'blink'){
    if(item.cooldown > 0){ flashMsg(hero, 'Блинк на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    const distance = Math.hypot(mouse.wx-hero.x, mouse.wy-hero.y) || 1;
    const range = Math.min(SHOP_ITEMS.blink.range, distance);
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
  if(item.id === 'brainAss'){
    if(item.cooldown > 0){ flashMsg(hero, 'Срака мо3гов на КД ' + Math.ceil(item.cooldown) + 'с'); return false; }
    item.cooldown = SHOP_ITEMS.brainAss.cooldown;
    item.activeTimer = SHOP_ITEMS.brainAss.activeDuration;
    hero.addBuff({type:'dmg',id:'brainAssDamage',val:SHOP_ITEMS.brainAss.damage,t:SHOP_ITEMS.brainAss.activeDuration});
    hero.addBuff({type:'as',id:'brainAssAttackSpeed',val:SHOP_ITEMS.brainAss.attackSpeed,t:SHOP_ITEMS.brainAss.activeDuration});
    addText(hero.x, hero.y - 56, 'СРАКА МО3ГОВ: РАЗГОН', '#ff638d', 1.0, 16);
    fxRing(hero.x, hero.y, 86, '#ff638d', 0.55);
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
    const damage = SHOP_ITEMS.dagonEmpire.damage || 1200;
    applyDamage(target, damage, {team:hero.team, source:hero, magic:true});
    item.cooldown = SHOP_ITEMS.dagonEmpire.cooldown;
    addText(target.x, target.y - 56, 'ДАГОН: -' + damage, '#ff4f8b', 1.0, 16);
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
    hero.hp = Math.min(hero.maxHp, hero.hp + 90 * healAmpOf(hero));
    trees.splice(trees.indexOf(tree), 1);
    hero.inventory[index] = null;
    addText(hero.x, hero.y - 56, '+90 HP', '#79d46c', 1.0, 16);
    fxRing(hero.x, hero.y, 72, '#79d46c', 0.45);
    return true;
  }
  return false;
}

function useInventoryItem(hero,index){
  const activated=activateInventoryItem(hero,index);
  if(activated) playAbilitySound('cast');
  return activated;
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
  /* Покупка сразу по клику, без окна подтверждения. */
  pendingPurchaseId = null;
  buyShopItem(id);
}

function buyBotItem(hero){
  const bootsIndex = hero.inventory.findIndex(i => i && i.id === 'joelBoots');
  const fangsIndex = hero.inventory.findIndex(i => i && i.id === 'fangs');
  const ptOwned = hero.inventory.some(i => i && i.id === 'pt');
  const starterId = ptOwned ? null : fangsIndex < 0 ? 'fangs' : bootsIndex < 0 ? 'joelBoots' : null;
  if(starterId){
    const item = SHOP_ITEMS[starterId];
    const slot = hero.inventory.findIndex(i => !i);
    if(slot >= 0 && hero.coins >= item.cost){
      hero.coins -= item.cost;
      hero.inventory[slot] = createInventoryItem(starterId);
      applyItemStats(hero, starterId);
    }
    return;
  }
  if(!ptOwned && bootsIndex >= 0 && fangsIndex >= 0 && hero.coins >= SHOP_ITEMS.pt.cost){
    hero.coins -= SHOP_ITEMS.pt.cost;
    hero.inventory[bootsIndex] = createInventoryItem('pt');
    hero.inventory[fangsIndex] = null;
    applyItemStats(hero, 'pt');
    return;
  }
  if(!ptOwned) return;
  const priority = ['munition','mantledSteel','aghanimHead'];
  const remaining = ['bkb','blink','evsyutin','manaHooves','superBoots','ilyaHair','enemy302','tornBrainHand','hatchet','satanic','arcadiaScar','kinglandia','gur','brainEye','aghanimScepter','brainAss','kayaSange','disperser'];
  const owned = new Set(hero.inventory.filter(Boolean).map(item => item.id));
  const id = [...priority,...remaining].find(itemId => !owned.has(itemId) && SHOP_ITEMS[itemId] &&
    hero.coins >= SHOP_ITEMS[itemId].cost && hero.inventory.some(item => !item));
  if(!id) return;
  const slot = hero.inventory.findIndex(i => !i);
  hero.coins -= SHOP_ITEMS[id].cost;
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
    activeTimer:0,
    ...(id === 'holyLocket' ? {charges:0, chargeTimer:0} : {})
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
  if(id === 'girfsyutin'){
    hero.maxHp += SHOP_ITEMS.girfsyutin.hp;
    hero.hp += SHOP_ITEMS.girfsyutin.hp;
  }
  if(id === 'kayaSange'){
    hero.maxHp += SHOP_ITEMS.kayaSange.hp;
    hero.hp += SHOP_ITEMS.kayaSange.hp;
    hero.maxMp += SHOP_ITEMS.kayaSange.maxMp;
    hero.mp += SHOP_ITEMS.kayaSange.maxMp;
  }
}

/* Аура «Трусы Дианы»: небольшой урон всем врагам и крипам рядом. */
function tickDianaAura(hero){
  const cfg = SHOP_ITEMS.dianaPants;
  const dmg = cfg.auraDamage * cfg.auraInterval;
  for(const u of units){
    if(u.dead || u.team === hero.team || isBuilding(u)) continue;
    if(Math.hypot(u.x-hero.x, u.y-hero.y) > cfg.auraRadius + (u.radius||0)) continue;
    applyDamage(u, dmg, {team:hero.team, source:hero, trueDamage:true});
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
  getDamage(){ let d=this.dmg; if(this.inventory && this.inventory.some(i => i && i.id === 'fangs')) d+=SHOP_ITEMS.fangs.damage; if(this.inventory && this.inventory.some(i => i && i.id === 'pt')) d+=150; if(this.inventory && this.inventory.some(i => i && i.id === 'ilyaHair')) d+=SHOP_ITEMS.ilyaHair.damage; if(this.inventory && this.inventory.some(i => i && i.id === 'hatchet')) d+=SHOP_ITEMS.hatchet.damage; if(this.inventory && this.inventory.some(i => i && i.id === 'kinglandia')) d+=SHOP_ITEMS.kinglandia.damage; if(this.inventory && this.inventory.some(i => i && i.id === 'dianaPants')) d+=SHOP_ITEMS.dianaPants.damage; const aghanimHead=this.inventory && this.inventory.find(i => i && i.id === 'aghanimHead'); if(aghanimHead && aghanimHead.activeTimer>0) d+=180; const arcadiaScar=this.inventory && this.inventory.find(i => i && i.id === 'arcadiaScar'); if(arcadiaScar && arcadiaScar.activeTimer>0) d+=SHOP_ITEMS.arcadiaScar.damage; const gur=this.inventory && this.inventory.find(i => i && i.id === 'gur'); if(gur && gur.activeTimer>0) d+=SHOP_ITEMS.gur.damage; for(const b of this.buffs) if(b.type === 'dmg') d+=b.val; if(this.buffs.some(b=>b.type==='doubleDamage')) d*=2; const exileRage=this.buffs.find(b=>b.type==='exileRage'); if(exileRage) d*=1+exileRage.val; const lateAttackGrowth=this.def && this.def.lateAttackGrowth ? 1+Math.max(0,this.level-10)*this.def.lateAttackGrowth : 1; return d*this.damageMultiplier*attackLevelDamageMult(this.level)*lateAttackGrowth; }
  getAttackTime(){ let m=1; if(this.inventory && this.inventory.some(i => i && i.id === 'pt')) m+=0.6; const munition=this.inventory && this.inventory.find(i => i && i.id === 'munition'); if(munition && munition.activeTimer>0) m+=SHOP_ITEMS.munition.attackSpeed; const arcadiaScar=this.inventory && this.inventory.find(i => i && i.id === 'arcadiaScar'); if(arcadiaScar && arcadiaScar.activeTimer>0) m+=SHOP_ITEMS.arcadiaScar.attackSpeed; const gur=this.inventory && this.inventory.find(i => i && i.id === 'gur'); if(gur && gur.activeTimer>0) m+=SHOP_ITEMS.gur.attackSpeed; if(this.def && this.def.id === 'arcady' && this.skills && this.skills[2]) m+=this.skills[2].level*0.25; if(this.def && this.def.id === 'malit' && this.skills && this.skills[1] && this.skills[1].level>0) m+=0.18; const aghanimHead=this.inventory && this.inventory.find(i => i && i.id === 'aghanimHead'); if(aghanimHead && aghanimHead.activeTimer>0) m+=1.8; for(const b of this.buffs) if(b.type === 'as') m+=b.val; const bloodrage=this.buffs.find(b => b.type === 'bloodrage'); if(bloodrage) m+=bloodrage.val; return this.atkTime/m; }
  getSpeed(){
    let speed=this.speed;
    if(this.inventory && this.inventory.some(item=>item&&item.id==='joelBoots')) speed+=SHOP_ITEMS.joelBoots.speed;
    if(this.inventory && this.inventory.some(item=>item&&item.id==='pt')) speed+=60;
    if(this.inventory && this.inventory.some(item=>item&&item.id==='ilyaHair')) speed+=SHOP_ITEMS.ilyaHair.speed;
    if(this.def&&this.def.id==='arcady'&&this.skills&&this.skills[2]) speed+=this.skills[2].level*27.5;
    const gur=this.inventory&&this.inventory.find(item=>item&&item.id==='gur');
    if(gur&&gur.activeTimer>0) speed+=SHOP_ITEMS.gur.moveSpeed;
    const eggGolly=this.inventory&&this.inventory.find(item=>item&&item.id==='eggGolly');
    if(eggGolly&&eggGolly.activeTimer>0) speed+=SHOP_ITEMS.eggGolly.moveSpeed;
    const zamist=this.inventory&&this.inventory.find(item=>item&&item.id==='zamist');
    if(zamist&&zamist.activeTimer>0) speed+=SHOP_ITEMS.zamist.moveSpeed;
    if(heroHasItem(this,'disperser')) speed+=SHOP_ITEMS.disperser.speed;
    if(this.buffs.some(buff=>buff.type==='haste')) speed+=180;
    if(this.def&&this.def.id==='malit'&&this.skills&&this.skills[1]&&this.skills[1].level>0) speed*=1.18;
    const superBoots=this.inventory&&this.inventory.find(item=>item&&item.id==='superBoots');
    if(superBoots){ speed+=SHOP_ITEMS.superBoots.speed; if(superBoots.activeTimer>0) speed+=SHOP_ITEMS.superBoots.activeSpeed; }
    const aghanimHead=this.inventory&&this.inventory.find(item=>item&&item.id==='aghanimHead');
    if(aghanimHead&&aghanimHead.activeTimer>0) speed+=100;
    for(const buff of this.buffs) if(buff.type==='spd') speed*=(1+buff.val);
    const thirst=this.def&&this.def.id==='sasych'
      ? heroes.filter(hero=>hero.team!==this.team&&!hero.dead&&hero.type==='hero').reduce((sum,hero)=>sum+(1-hero.hp/hero.maxHp)*0.48,0)
      : 0;
    speed*=1+thirst;
    if(this.slowT>0) speed*=(1-this.slow);
    return speed;
  }
  addBuff(b){ this.buffs.push(b); }
  tickTimers(dt){
    if(this.atkCd>0) this.atkCd-=dt;
    if(this.attackSlowT>0) this.attackSlowT=Math.max(0,this.attackSlowT-dt);
    if(this.inventory){
      /* Кая и Санга: сопротивление эффектам ускоряет спад оглушения, замедления и безмолвия. */
      const statusResist=statusResistOf(this);
      if(statusResist>0){
        const extra=dt*statusResist/(1-statusResist);
        if(this.stunTimer>0) this.stunTimer=Math.max(0,this.stunTimer-extra);
        if(this.slowT>0) this.slowT=Math.max(0,this.slowT-extra);
        if(this.silenceTimer>0 && !(this.windTimer>0)) this.silenceTimer=Math.max(0,this.silenceTimer-extra);
      }
    }
    if(this.windTimer>0){
      this.windTimer=Math.max(0,this.windTimer-dt);
      this.attackTarget=null;
      if(this.windTimer<=0){ this.silenceTimer=0; fxRing(this.x,this.y,60,'#7fe9d4',0.35); }
    }
    if(this.nullifyTimer>0){
      this.nullifyTimer=Math.max(0,this.nullifyTimer-dt);
      purgePositiveEffects(this);
    }
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
    if(this.ruptureState && this.isPlayer!==true && !(this.windTimer>0) && !(this.buffs && this.buffs.some(buff=>buff.type==='fear'))){
      /* Разрыв: бот понимает, что двигаться нельзя — стоит и ждёт, пока эффект спадёт */
      this.moving=false; this.moveTarget=null; return;
    }
    const fear=this.buffs.find(buff=>buff.type==='fear');
    if(fear){
      const dx=this.x-fear.sourceX,dy=this.y-fear.sourceY,d=Math.hypot(dx,dy)||1;
      this.moveTarget={x:clamp(this.x+dx/d*260,60,WORLD-60),y:clamp(this.y+dy/d*260,60,WORLD-60)};
    }
    /* Игрока никогда не должно намертво заклинить в дереве или в узкой щели между
       деревьями (например, после случайного блинка) — если такое случилось,
       аккуратно выталкиваем его наружу прежде, чем считать обычное движение. */
    if(this.isPlayer === true && !(this.windTimer > 0)) resolveTreeOverlap(this, dt);
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
      if(canMoveTo(nextX, nextY, this.radius, this.isPlayer !== true || this.windTimer > 0)){
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
    if(this.stunTimer>0 || this.windTimer>0) return;
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
          const pelletDamage=Math.max(33,this.getDamage()*0.38+Math.max(0,this.level-8)*0.75);
          for(let pellet=0;pellet<bullets;pellet++){
            const spread=(pellet-(bullets-1)/2)*0.075;
            const projectile=spawnProjectile(this.x,this.y,t,pelletDamage,{team:this.team,source:this,attack:true,incendiary,fangsDamageIncluded:true,fangsDamageScale:0.38,dianaDamageIncluded:true,dianaDamageScale:0.38},1100,'#ffb36b',8);
            projectile.spread=spread;
            projectile.incendiary=incendiary;
          }
          fxRing(this.x + Math.cos(this.facing)*62, this.y + Math.sin(this.facing)*62, 28, '#ffd08a', 0.18);
          spawnParticles(this.x + Math.cos(this.facing)*58, this.y + Math.sin(this.facing)*58, '#ffb36b', 12, 0.7);
          return;
        }
        if(this.getAttackRange()>220){
          const shotSource={team:this.team, source:this, attack:true, fangsDamageIncluded:true, dianaDamageIncluded:true};
          let shotDamage=this.getDamage();
          if(this.def && this.def.id === 'sniper') shotDamage*=0.8;
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
            const unleashDamageMultiplier = unleash.damageMultiplier || 1.15;
            applyDamage(t, this.getDamage() * unleashDamageMultiplier, {team: this.team, source: this, attack: true, fangsDamageIncluded:true, fangsDamageScale:unleashDamageMultiplier, dianaDamageIncluded:true, dianaDamageScale:unleashDamageMultiplier});
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
            let fangsDamageScale=1;
            if(this.def && this.def.id === 'juggernaut' && this.skills && this.skills[2] &&
               this.skills[2].level > 0){
              const bladeDanceLevel=this.skills[2].level;
               const critChance=[0,0.20,0.30,0.40,0.50][bladeDanceLevel] || 0;
               if(Math.random() < critChance){
                 fangsDamageScale=[0,1.7,1.9,2.1,2.3][bladeDanceLevel] || 1.7;
                 attackDamage *= fangsDamageScale;
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
            applyDamage(t, attackDamage, {team: this.team, source: this, attack: true, fangsDamageIncluded:true, fangsDamageScale, dianaDamageIncluded:true, dianaDamageScale:fangsDamageScale});
          }
          if(this.def && this.def.id === 'electricGosha') applyElectricOverload(this, t);
          if(this.owner && this.owner.def && this.owner.def.id === 'illusionist' && this.owner.isPlayer && Math.random() < 0.15) spawnPassiveIllusion(this.owner, t);
          fxHit(t.x, t.y, '#ffdd88');
        }
      }
    }
  }
  update(dt){
    tickYosypEffects(this,dt);
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
        if(this.def && this.def.id==='ilya'){
          this.hp=Math.max(1,this.hp-(18+this.level*0.5));
          this.hitFlash=Math.max(this.hitFlash||0,0.12);
        }
        for(const unit of units){
          if(unit.team===this.team||unit.dead||isStructure(unit)) continue;
          if(Math.hypot(unit.x-this.x,unit.y-this.y)<aura.radius){
            applyDamage(unit,aura.damage + (this.auraDamageBonus || 0),this);
            unit.addBuff({type:'poison',val:aura.damage,t:3});
          }
        }
      }
    }
    tickRupture(this, dt);
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

const MAP_SCALE = 1.846;
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
  if(baseWallBlocked(x, y, radius)) return false;
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
    if(this.isIllusion && this.playerControlled) return;
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
  const radius = 160 + level * 20;
  const damage = 350 + level * 125;
  fxRing(drone.x, drone.y, radius * 0.58, '#ffffff', 0.22);
  fxRing(drone.x, drone.y, radius, '#65ff9a', 0.8);
  spawnParticles(drone.x, drone.y, '#b9ffd0', 44 + level * 8, 1.5 + level * 0.08);
  addText(drone.x, drone.y - 70, 'ДРОН ВЗОРВАЛСЯ  •  УР. ' + level, '#8dffad', 1.25, 17);
  for(const unit of units){
    if(unit.dead || unit.team === drone.team || unit.team === 2) continue;
    if(Math.hypot(unit.x-drone.x, unit.y-drone.y) <= radius + unit.radius)
      applyDamage(unit, abilityDamage(hero, damage), {team:drone.team, source:hero});
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
  const radius=150+mine.level*16, damage=320+mine.level*100;
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

const REBALANCE_HERO_POOL = ['Пиро','Шадоу','Голли','Ригина','Малит','Снайпер','Илья','Гриша'];
const REBALANCE_ITEM_POOL = ['БКБ','ПТ','Дагон','Шрам-Аркадия','Яйцо-голли','Волосы Ильи'];

function spawnIllusion(hero, options={}){
  const angle = options.angle === undefined ? Math.random()*Math.PI*2 : options.angle;
  const life = (options.life || 12) + (hero.illusionLifeBonus || 0);
  const illusion = new TimedSummon(hero, clamp(hero.x+Math.cos(angle)*55,60,WORLD-60), clamp(hero.y+Math.sin(angle)*55,60,WORLD-60), {
    kind:'illusion', life, hp:hero.maxHp, dmg:hero.getDamage(), radius:hero.radius, speed:hero.getSpeed(), atkRange:hero.atkRange,
    atkTime:hero.getAttackTime(), armor:hero.getArmor(), copyColor:hero.def.color, copyDef:hero.def,
    isIllusion:true, damageMultiplier:(options.damageMultiplier || 0.3) + Math.max(0,hero.level-10)*0.012 + (hero.illusionDamageBonus || 0), damageTakenMultiplier:options.damageTakenMultiplier || 2
  });
  illusion.level=hero.level;
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
    const ancientHp = Math.round(43200 * 1.08);
    super({
      x, y, team,
      radius: base?46:(tier===1?19:22), speed:0,
      hp: base?ancientHp:6000,
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
    this.id = makeTowerId(team, lane, tier, base);
    this.isServerAuthoritative = true;
  }
  update(dt){
    this.tickTimers(dt);
    this.attackTarget = null;
    this.isAttacking = false;
    // Клиент НЕ меняет HP башен локально — сервер является единственным источником правды.
    if(this.hp <= 0){ this.hp = 0; this.alive = false; this.dead = true; }
  }
  findTarget(){
    return null;
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
      const nearBase = BASES.some(base => Math.hypot(base.x-x, base.y-y) < 520) || inBaseArea(x, y);
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
      const nearBase=BASES.some(base=>Math.hypot(base.x-center.x,base.y-center.y)<500) || inBaseArea(center.x, center.y);
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
      const nearBase=BASES.some(base=>Math.hypot(base.x-treeX,base.y-treeY)<650) || inBaseArea(treeX, treeY);
      if(!nearBase && canPlaceTree(treeX, treeY, 120)) trees.push({x:treeX,y:treeY,radius:24,kind:['pine','broadleaf','crystal','birch','autumn'][Math.floor(Math.random()*5)]});
    }
  }
  /* Оба леса используют одинаковые силуэты; цвет и вариант задаются координатами. */
  for(const tree of trees){
    if(isDireSide(tree.x, tree.y)){
      tree.kind = 'dire';
      tree.v = Math.abs(Math.floor(tree.x*7 + tree.y*13)) % DIRE_TREE_VARIANTS;
    } else {
      tree.kind = 'radiant';
      tree.v = Math.abs(Math.floor(tree.x*7 + tree.y*13)) % DIRE_TREE_VARIANTS;
    }
  }
}

/* ===== Деревья обеих сторон: ветви и кроны рисуются в кэшируемые спрайты ===== */
const DIRE_TREE_VARIANTS = 8;
const DIRE_SPRITE = {W:260, H:240, OX:130, OY:175, S:2};
const direTreeSprites = [];
const radiantTreeSprites = [];
function isDireSide(x, y){ return y < x; }
function direRng(seed){
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function getDireTreeSprite(variant, radiant=false){
  const sprites=radiant?radiantTreeSprites:direTreeSprites;
  if(!sprites[variant]) sprites[variant] = buildDireTreeSprite(variant,radiant);
  return sprites[variant];
}
function buildDireTreeSprite(variant,radiant=false){
  const {W,H,OX,OY,S} = DIRE_SPRITE;
  const c = document.createElement('canvas');
  c.width = W*S; c.height = H*S;
  const g = c.getContext('2d');
  g.scale(S,S); g.translate(OX,OY);
  g.lineCap = 'round'; g.lineJoin = 'round';
  const rnd = direRng(variant*7919 + 101);
  const tips = [];
  const BASE_Y = 38;

  /* Один изогнутый отрезок ветви с плавным сужением и красноватой кромкой от лавы. */
  const limb = (x0,y0,x1,y1,cx,cy,w0,w1) => {
    const N = 9, pts = [];
    for(let i=0;i<=N;i++){
      const t=i/N, u=1-t;
      pts.push({x:u*u*x0+2*u*t*cx+t*t*x1, y:u*u*y0+2*u*t*cy+t*t*y1, w:w0+(w1-w0)*t});
    }
    for(let pass=0; pass<3; pass++){
      for(let i=1;i<=N;i++){
        const a=pts[i-1], b=pts[i];
        if(pass===0){ g.strokeStyle='rgba(0,0,0,0.35)'; g.lineWidth=b.w+1.6; }
        else if(pass===1){ g.strokeStyle=b.w>5?'#1d1514':'#150f10'; g.lineWidth=b.w; }
        else {
          if(b.w<3.2) continue;
          g.strokeStyle='rgba(150,70,48,0.42)'; g.lineWidth=Math.max(1,b.w*0.28);
          g.beginPath(); g.moveTo(a.x-b.w*0.22,a.y); g.lineTo(b.x-b.w*0.22,b.y); g.stroke(); continue;
        }
        g.beginPath(); g.moveTo(a.x,a.y); g.lineTo(b.x,b.y); g.stroke();
      }
    }
  };

  const grow = (x,y,ang,len,w,depth) => {
    const curve = (rnd()-0.5)*0.95;
    const ex = x+Math.cos(ang)*len, ey = y+Math.sin(ang)*len;
    const cx = (x+ex)/2 - Math.sin(ang)*len*curve;
    const cy = (y+ey)/2 + Math.cos(ang)*len*curve;
    const w1 = Math.max(1.1, w*0.66);
    limb(x,y,ex,ey,cx,cy,w,w1);
    if(depth<=0 || len<8){ tips.push({x:ex,y:ey,w:w1}); return; }
    /* боковой сучок из середины ветви */
    if(depth>=2 && rnd()<0.7){
      const side = rnd()<0.5 ? -1 : 1;
      const mx = (x+2*cx+ex)/4, my = (y+2*cy+ey)/4;
      grow(mx,my,ang+side*(0.8+rnd()*0.5),len*0.55,w1*0.7,depth-2);
    }
    const kids = (depth>=3 && rnd()<0.45) ? 3 : 2;
    for(let i=0;i<kids;i++){
      const spread = (i-(kids-1)/2)*(0.5+rnd()*0.55) + (rnd()-0.5)*0.35;
      grow(ex,ey,ang+spread,len*(0.64+rnd()*0.2),w1,depth-1);
    }
  };

  /* корни и основание */
  for(let i=-1;i<=1;i+=1){
    const ra = -Math.PI/2 + i*(1.0+rnd()*0.4);
    const rx = i*(10+rnd()*8), ry = BASE_Y+2-Math.abs(i)*0;
    limb(i*3,BASE_Y-8, rx, ry, i*6, BASE_Y-3, 6.5, 1.8);
  }
  const lean = (rnd()-0.5)*0.45;
  grow(0, BASE_Y-4, -Math.PI/2 + lean, 40+rnd()*10, 14+rnd()*2, 4);

  /* кроны: выбираем самые высокие/дальние кончики веток */
  const sorted = tips.slice().sort((a,b)=> (a.y - Math.abs(a.x)*0.25) - (b.y - Math.abs(b.x)*0.25));
  const picked = [];
  const wanted = 2 + Math.floor(rnd()*2);
  for(const tip of sorted){
    if(picked.length>=wanted) break;
    if(tip.y > BASE_Y-45) continue;
    if(picked.every(p => Math.hypot(p.x-tip.x, p.y-tip.y) > 38)) picked.push(tip);
  }
  /* одна крона обычно «сидит» поближе к стволу, как на референсе */
  if(rnd()<0.6){
    const low = tips.filter(t => t.y>BASE_Y-70 && t.y<BASE_Y-25 && picked.every(p=>Math.hypot(p.x-t.x,p.y-t.y)>38));
    if(low.length) picked.push(low[Math.floor(rnd()*low.length)]);
  }
  const palette = radiant
    ? ['#1e542d','#28743a','#359447','#4cad50','#74c95a']
    : ['#7d2118','#a22d1c','#c13f23','#d9532b','#ec6e3a'];
  for(const tip of picked){
    const R = 17 + rnd()*9;
    const fx = tip.x + (rnd()-0.5)*4, fy = tip.y - R*0.25;
    /* тёмная тень под кроной и тёплое свечение */
    g.fillStyle='rgba(0,0,0,0.30)';
    g.beginPath(); g.ellipse(fx+2,fy+R*0.55,R*0.95,R*0.55,0,0,Math.PI*2); g.fill();
    const glow = g.createRadialGradient(fx,fy,R*0.3,fx,fy,R*1.6);
    glow.addColorStop(0,radiant?'rgba(105,235,100,0.13)':'rgba(255,90,40,0.16)');
    glow.addColorStop(1,radiant?'rgba(105,235,100,0)':'rgba(255,90,40,0)');
    g.fillStyle=glow; g.beginPath(); g.arc(fx,fy,R*1.6,0,Math.PI*2); g.fill();
    /* основной объём — тёмный шар */
    g.fillStyle=palette[0];
    g.beginPath(); g.arc(fx,fy,R,0,Math.PI*2); g.fill();
    /* комочки листвы, чем выше — тем светлее */
    const blobs = Math.round(R*1.6);
    for(let i=0;i<blobs;i++){
      const a = rnd()*Math.PI*2, d = Math.sqrt(rnd())*R*0.86;
      const bx = fx+Math.cos(a)*d, by = fy+Math.sin(a)*d;
      const light = Math.min(1, Math.max(0, 0.5 - (by-fy)/(R*1.6) - (bx-fx)/(R*3.2) + (rnd()-0.5)*0.35));
      g.fillStyle = palette[Math.min(palette.length-1, Math.floor(light*palette.length))];
      g.beginPath(); g.arc(bx,by,R*(0.16+rnd()*0.14),0,Math.PI*2); g.fill();
    }
    /* мелкие блики и тёмные просветы */
    for(let i=0;i<Math.round(R*0.8);i++){
      const a = rnd()*Math.PI*2, d = Math.sqrt(rnd())*R*0.8;
      g.fillStyle = radiant
        ? (rnd()<0.6?'rgba(190,255,150,0.72)':'rgba(16,58,25,0.58)')
        : (rnd()<0.6?'rgba(255,170,100,0.75)':'rgba(60,12,10,0.55)');
      g.beginPath(); g.arc(fx+Math.cos(a)*d, fy+Math.sin(a)*d - R*0.1, 0.9+rnd()*1.3, 0, Math.PI*2); g.fill();
    }
    /* тёмный обод снизу для объёма */
    g.strokeStyle='rgba(40,6,6,0.45)'; g.lineWidth=2.2;
    g.beginPath(); g.arc(fx,fy,R-1,0.15*Math.PI,0.85*Math.PI); g.stroke();
  }

  /* упавшие листья у корней */
  for(let i=0;i<9;i++){
    g.fillStyle = radiant
      ? (rnd()<0.5?'rgba(115,195,70,0.8)':'rgba(55,125,48,0.8)')
      : (rnd()<0.5?'rgba(200,70,38,0.8)':'rgba(120,32,24,0.8)');
    g.beginPath(); g.ellipse(-26+rnd()*54, BASE_Y+2+rnd()*8, 2.4, 1.3, rnd()*3, 0, Math.PI*2); g.fill();
  }
  return c;
}
function drawDireTree(tree,radiant=false){
  const {W,H,OX,OY} = DIRE_SPRITE;
  const sprite = getDireTreeSprite(tree.v || 0,radiant);
  /* лёгкое покачивание на ветру вокруг основания */
  const sway = Math.sin(gameTime*1.1 + tree.x*0.013 + tree.y*0.007) * 0.025;
  ctx.save();
  ctx.translate(0,38);
  ctx.transform(1,0,sway,1,0,0);
  ctx.drawImage(sprite, -OX, -OY-38, W, H);
  ctx.restore();
  /* Медленно падающие листья добавляют жизни лесу обеих сторон. */
  for(let i=0;i<2;i++){
    const phase = (gameTime*0.22 + i*0.5 + (tree.x*0.0017 + tree.y*0.0011)) % 1;
    const lx = -34 + i*38 + Math.sin(phase*7 + i*2) * 11 + phase*26;
    const ly = -48 + phase*84;
    ctx.save();
    ctx.globalAlpha = Math.sin(phase*Math.PI) * 0.85;
    ctx.translate(lx,ly); ctx.rotate(phase*9 + i);
    ctx.fillStyle = radiant ? (i?'#93d96b':'#55ad4a') : (i?'#e2582c':'#b8341f');
    ctx.beginPath(); ctx.ellipse(0,0,3.2,1.7,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
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
      spawnAoE(x,y,r,480 + 240*lvl,h,3,'#a0f0ff',120 + 60*lvl);
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
      h.buffs = h.buffs.filter(b => b.id !== 'invokeVigor');
      h.addBuff({type:'spd', id:'invokeVigor', val: 0.9 + 0.2*lvl, t: 6});
      fxRing(h.x,h.y,130,'#ffe066',0.7);
      fxRing(h.x,h.y,80,'#fff2a8',0.5);
      addText(h.x, h.y-60, 'БОДРОСТЬ: СКОРОСТЬ +' + Math.round((0.9+0.2*lvl)*100) + '%', '#ffe066', 1.2, 18);
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
      let tgt=null, bd=800;
      for(const u of units){
        if(u.team===h.team||u.dead||u.team===2||isStructure(u)) continue;
        const d = Math.hypot(u.x-h.x, u.y-h.y);
        if(d < bd){ bd = d; tgt = u; }
      }
      if(tgt){
        applyDamage(tgt, abilityDamage(h,280 + 140*lvl), h);
        fxBeam(h.x,h.y,tgt.x,tgt.y,'#ffcc00',0.35);
        fxHit(tgt.x, tgt.y, '#ffcc00');
        fxRing(tgt.x, tgt.y, 70, '#ffcc00', 0.4);
      }
      h.buffs = h.buffs.filter(b => b.id !== 'invokeForge');
      h.addBuff({type:'dmg', id:'invokeForge', val: 90 + 45*lvl, t: 8});
      h.addBuff({type:'armor', id:'invokeForgeArmor', val: 4 + 3*lvl, t: 8});
      fxRing(h.x,h.y,120,'#ffb347',0.6);
      addText(h.x, h.y-60, 'КУЗНЕЧНЫЙ ДУХ', '#ffb347', 1.2, 18);
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
  mageHunterReflect: {name:'Щит отражения',short:'E',type:'self',maxLevel:4,cd:[0,21,18,15,12],mana:[0,90,105,120,135],desc:'Усиленный купол отражает магический урон.',cast(h,x,y,lvl){h.addBuff({type:'mageReflect',val:0.46+lvl*0.08,t:8});heroBurst(h,'#b47cff',120,34);playHeroSfx('shield');}},
  mageHunterUlt: {name:'Пустой резерв',short:'R',type:'point',maxLevel:3,cd:[0,65,54,44],mana:[0,160,210,260],range:900,ult:true,desc:'Сжигает ману цели и наносит больше урона от её пустого резерва.',cast(h,x,y,lvl){const t=pickUnitAt(x,y);if(!t||t.team===h.team||t.dead||t.type!=='hero'){flashMsg(h,'Наведите на вражеского героя');return;}const missing=Math.max(0,t.maxMp-(t.mp||0));t.mp=0;const late=1+Math.max(0,h.level-10)*(h.def.lateSkillGrowth||0);applyDamage(t,missing*(0.48+lvl*0.11)*late,h);fxRing(t.x,t.y,150,'#c56cff',0.8);spawnParticles(t.x,t.y,'#efb0ff',48,1.4);playHeroSfx('mana');}},
  dawnHammer: {name:'Разрушитель звёзд',short:'Q',type:'self',maxLevel:4,cd:[0,12,10,8,6],mana:[0,70,80,90,100],desc:'Размахивает усиленным солнечным молотом и оглушает врагов вокруг.',cast(h,x,y,lvl){const r=210+24*lvl;const damage=(190+100*lvl)*1.18;for(const u of units)if(!u.dead&&u.team!==h.team&&u.team!==2&&!isBuilding(u)&&Math.hypot(u.x-h.x,u.y-h.y)<=r+u.radius){applyDamage(u,damage,h);u.stunTimer=Math.max(u.stunTimer,0.8+lvl*0.15);}fxRing(h.x,h.y,r,'#ffd36b',0.65);spawnRadialBlades(h.x,h.y,r,'#fff0a8',24);playHeroSfx('hammer');}},
  dawnHammerThrow: {name:'Небесный молот',short:'W',type:'point',maxLevel:4,cd:[0,16,14,12,10],mana:[0,85,95,105,115],range:850,desc:'Запускает усиленный молот, оглушает цель и притягивает Рассветную деву к ней.',cast(h,x,y,lvl){const t=pickUnitAt(x,y);if(!t||t.team===h.team||t.dead||isBuilding(t)){flashMsg(h,'Наведите на врага');return;}fxBeam(h.x,h.y,t.x,t.y,'#ffd36b',0.35);spawnHammerTrail(t.x,t.y);t.stunTimer=Math.max(t.stunTimer,1.05+lvl*0.18);applyDamage(t,190+90*lvl,h);const d=Math.hypot(t.x-h.x,t.y-h.y)||1;h.x=clamp(t.x-(t.x-h.x)/d*95,60,WORLD-60);h.y=clamp(t.y-(t.y-h.y)/d*95,60,WORLD-60);playHeroSfx('hammer');}},
  dawnBlessing: {name:'Сияние',short:'E',type:'self',maxLevel:4,cd:[0,0,0,0,0],mana:[0,0,0,0,0],desc:'Пассивно немного сильнее лечит союзников после атак.',cast(){}},
  dawnGlobalJump: {name:'Солнечный страж',short:'R',type:'point',maxLevel:3,cd:[0,90,75,60],mana:[0,180,230,280],range:2600,ult:true,desc:'Отмечает область рядом с любым союзником на карте. Круг пульсирует, лечит союзников и жжёт врагов, затем героиня влетает в центр, оглушает и наносит мощный урон.',cast(h,x,y,lvl){const castRadius=520;let nearAlly=false;for(const u of heroes){if(u.team===h.team&&!u.dead&&Math.hypot(u.x-x,u.y-y)<=castRadius){nearAlly=true;break;}}if(!nearAlly){flashMsg(h,'Нужен союзник рядом с целью');return false;}const radius=260;const life=2.4+0.45*lvl;aoes.push({x,y,radius,dmg:0,manaDmg:0,team:h.team,source:h,delay:0,t:0,color:'#fff4af',applied:false,life,dead:false,dawnField:true,landed:false,tickInterval:0.5,healAmt:75+35*lvl,burnAmt:abilityDamage(h,90+55*lvl),landDmg:abilityDamage(h,300+150*lvl),ultLvl:lvl});fxMark(x,y,radius,'#fff4af',life);addText(x,y-radius-18,'РАССВЕТ ИДЁТ','#fff4af',1.0,15);playHeroSfx('jump');return true;}},
  exileGauntlet: {name:'Бросок рукавицы',short:'Q',type:'point',maxLevel:4,cd:[0,12,10,8,6],mana:[0,70,80,90,100],range:760,desc:'Усиленное AoE-оглушение в точке.',cast(h,x,y,lvl){const r=165+20*lvl;fxBeam(h.x,h.y,x,y,'#ff5a61',0.28);spawnParticles(x,y,'#ff7b68',32,1);for(const u of units)if(!u.dead&&u.team!==h.team&&u.team!==2&&!isBuilding(u)&&Math.hypot(u.x-x,u.y-y)<r+u.radius){applyDamage(u,abilityDamage(h,215+105*lvl),h);u.stunTimer=Math.max(u.stunTimer,0.85+lvl*0.12);}fxRing(x,y,r,'#ff5a61',0.6);playHeroSfx('gauntlet');}},
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
    desc:'Тратит здоровье Ильи каждую секунду, нанося усиленный урон врагам рядом.',
    cast(h,x,y,lvl){
      h.buffs=h.buffs.filter(buff=>buff.type!=='ilyaAura');
      h.addBuff({type:'ilyaAura',radius:210+18*lvl,damage:abilityDamage(h,56+36*lvl),t:8,auraTimer:0});
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
      let target=null,nearest=190;
      for(const unit of units){
        if(unit.dead||unit.team===h.team||unit.team===2||isBuilding(unit)) continue;
        const distance=Math.hypot(unit.x-h.x,unit.y-h.y);
        if(distance<nearest){ nearest=distance; target=unit; }
      }
      if(target){
        target.slow=Math.max(target.slow||0,0.42);
        target.slowT=Math.max(target.slowT||0,3);
        igniteUnit(target,h,8,14);
      }
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
    desc:'Поджигает область на 8 секунд: враги внутри получают урон каждые 0.3 сек., а выйдя из огня, ещё 10 секунд горят по 25 HP в секунду.',
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
    desc:'Меняет местами героя и ближайшую к курсору иллюзию и восстанавливает здоровье (15/20/25/30% от макс. HP). Если клонов нет, умение не тратится.',
    cast(h,x,y,lvl){
      let target=null, best=Infinity;
      for(const unit of units){
        if(!unit.isIllusion || unit.owner!==h || unit.dead) continue;
        const distance=Math.hypot(unit.x-x,unit.y-y);
        if(distance<best){best=distance;target=unit;}
      }
      if(!target){flashMsg(h,'Нет клонов');return false;}
      const oldX=h.x, oldY=h.y; h.x=target.x; h.y=target.y; target.x=oldX; target.y=oldY;
      h.attackTarget=null; target.attackTarget=null; fxRing(h.x,h.y,75,'#d8b4ff',0.45);
      const heal=Math.round(h.maxHp*(0.10+0.05*lvl));
      h.hp=Math.min(h.maxHp,h.hp+heal);
      addText(h.x,h.y-70,'+'+heal+' HP','#7dff9a',1.2,18);
      fxRing(h.x,h.y,95,'#7dff9a',0.5);
      return true;
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
      aoes.push({x,y,radius,dmg:abilityDamage(h,18+9*lvl),manaDmg:0,team:h.team,source:h,
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
  gollyCrystal: {
    name:'Кристалл', short:'Q', type:'point', maxLevel:4,
    cd:[0,8,7,6,5], mana:[0,70,80,90,100], range:850,
    desc:'Кристалл замораживает врага на 0.3 секунды',
    cast(h,x,y,lvl){
      const radius=70;
      spawnAoE(x,y,radius,70+38*lvl,h,0.18,'#9eeaff');
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
      const radius=210, damage=130+55*lvl;
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
      h.addBuff({type:'armor', val:2+1.5*lvl, t:7});
      h.addBuff({type:'spd', val:0.07+0.015*lvl, t:7});
      h.hp=Math.min(h.maxHp,h.hp+40+22*lvl);
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
    cd:[0,40,40,40], mana:[0,100,120,140],
    desc:'Красный режим: быстрый бег и двойной урон на 6 секунд',
    cast(h){
      h.buffs = h.buffs.filter(b => b.type !== 'gollyRed' && b.id !== 'gollyRedSpeed');
      h.addBuff({type:'gollyRed', val:2, t:6});
      h.addBuff({type:'spd', id:'gollyRedSpeed', val:0.7, t:6});
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
    desc:'Наносит урон от здоровья цели и накладывает Разрыв на 8 сек: пока враг двигается, он получает урон за каждый пройденный шаг. Если он стоит на месте — урона нет.',
    cast(h,x,y,lvl){
      let target=null, best=100;
      for(const unit of units){
        if(unit.team===h.team||unit.dead||unit.team===2) continue;
        const distance=Math.hypot(unit.x-x,unit.y-y);
        if(!isStructure(unit) && distance<best){best=distance;target=unit;}
      }
      if(!target){ flashMsg(h,'Нет цели для Rupture'); return; }
      applyDamage(target,target.maxHp*(0.12+lvl*0.04),h);
      target.ruptureState={x:target.x,y:target.y,t:8,damagePerDistance:0.45+lvl*0.2,source:h};
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
  reginaDispose: {name:'Dispose',short:'Q',type:'point',maxLevel:4,cd:[0,14,12,10,8],mana:[0,70,80,90,100],range:700,desc:'Подбрасывает врага через Регину; при приземлении наносит усиленный урон и замедляет область.',cast(h,x,y,lvl){
    const target=findReginaTarget(h,x,y,0);
    if(!target){ flashMsg(h,'Наведите Q на врага или крипа'); return false; }
    const startX=target.x, startY=target.y;
    const landing={x:clamp(h.x,60,WORLD-60),y:clamp(h.y+190,60,WORLD-60)};
    const radius=145+12*lvl;
    const impactDamage=abilityDamage(h,[0,170,250,340,450][lvl]);
    h.facing=Math.atan2(startY-h.y,startX-h.x);
    startArcMotion(target,landing.x,landing.y,0.62,()=>{
      if(target.dead) return;
      reginaLandingImpact(h,landing.x,landing.y,impactDamage,radius,0.75+lvl*0.12,'DISPOSE');
      target.slow=0.35; target.slowT=2.5;
    },105,h.x,h.y-45);
    fxBeam(startX,startY,landing.x,landing.y,'#ff7ca2',0.45);
    fxRing(startX,startY,42,'#ffb0c5',0.35);
    addText(landing.x,landing.y-70,'БРОСОК ВНИЗ','#ffb0c5',1.0,16);
    return true;
  }},
  reginaRebound: {name:'Rebound',short:'W',type:'point',maxLevel:4,cd:[0,16,14,12,10],mana:[0,80,90,100,110],range:850,desc:'Перепрыгивает через выбранного врага или крипа; при приземлении наносит усиленный урон и оглушает врагов вокруг.',cast(h,x,y,lvl){
    const jumpTarget=findReginaTarget(h,x,y,1);
    if(!jumpTarget){ flashMsg(h,'Наведите W на вражеского героя или крипа'); return false; }
    const dx=jumpTarget.x-h.x, dy=jumpTarget.y-h.y;
    const distance=Math.hypot(dx,dy)||1;
    const ux=dx/distance, uy=dy/distance;
    const leapBeyond=88+jumpTarget.radius;
    const landing={x:clamp(jumpTarget.x+ux*leapBeyond,60,WORLD-60),y:clamp(jumpTarget.y+uy*leapBeyond,60,WORLD-60)};
    const radius=165+15*lvl;
    const impactDamage=abilityDamage(h,[0,175,265,360,470][lvl]);
    h.facing=Math.atan2(dy,dx);
    fxRing(jumpTarget.x,jumpTarget.y,48,'#ffd1de',0.35);
    fxBeam(h.x,h.y,landing.x,landing.y,'#ff9fbd',0.55);
    startArcMotion(h,landing.x,landing.y,0.78,()=>{
      reginaLandingImpact(h,h.x,h.y,impactDamage,radius,1.25+lvl*0.12,'REBOUND');
    },112,(h.x+landing.x)/2,Math.min(h.y,landing.y)-125);
    return true;
  }},
  reginaUnleash: {name:'Unleash',short:'R',type:'self',maxLevel:3,cd:[0,75,62,50],mana:[0,150,190,230],ult:true,desc:'На 14 секунд получает усиленную скорость атаки и урон; последний заряд выпускает мощную замедляющую волну.',cast(h,x,y,lvl){
    const scepter=hasScepter(h);
    const duration=scepter ? 17 : 14;
    const charges=5+lvl+(scepter?1:0);
    h.buffs=h.buffs.filter(buff=>buff.type!=='reginaUnleash'&&buff.id!=='reginaRageSpeed');
    h.addBuff({type:'reginaUnleash',t:duration,strikes:0,charges,totalCharges:charges,damageMultiplier:1.3+lvl*0.1+(scepter?0.1:0),pulseDamage:abilityDamage(h,170+lvl*75+(scepter?50:0)),pulseRadius:175+lvl*14+(scepter?25:0),pulseSlow:0.62+(scepter?0.08:0),pulseSlowDuration:3.5});
    h.addBuff({type:'as',id:'reginaRageSpeed',val:3.4+lvl*0.5+(scepter?0.35:0),t:duration});
    heroBurst(h,'#ff6688',145+(scepter?25:0),48);
    addText(h.x,h.y-75,'UNLEASH • ЯРОСТЬ x'+charges,'#ffb0c5',1.3,20);
  }}
};

const YOSYP_SKILLS = {
  yosypBlowback:{name:'Блювака',short:'Q',type:'self',passive:true,maxLevel:4,cd:[0,0,0,0,0],mana:[0,0,0,0,0],desc:'Пассивно отравляет врагов обычными атаками. Яд наносит дополнительный урон от базовой атаки в течение 3 секунд.',cast(){ }},
  yosypPuddles:{name:'Четыре лужи',short:'W',type:'self',maxLevel:4,cd:[0,18,16,14,12],mana:[0,70,80,90,100],desc:'Бросает 4 лужи вокруг героя: враги в зонах получают небольшой урон и оглушение. Лужи остаются на земле 6 секунд.',cast(h,x,y,lvl){
    const angles=[-Math.PI/4,Math.PI/4,3*Math.PI/4,5*Math.PI/4];
    const distances=[145,245,145,245];
    const radius=104+lvl*7, damage=abilityDamage(h,55+lvl*22), hit=new Set();
    for(let index=0;index<angles.length;index++){
      const px=clamp(h.x+Math.cos(angles[index])*distances[index],60,WORLD-60);
      const py=clamp(h.y+Math.sin(angles[index])*distances[index],60,WORLD-60);
      aoes.push({x:px,y:py,radius,dmg:0,manaDmg:0,team:h.team,source:h,delay:0,t:0,color:'#91ed62',applied:true,life:6,dead:false,visual:'yosypPuddle'});
      fxRing(px,py,radius,'#a7ff70',0.75);
      spawnParticles(px,py,'#a7ff70',18,0.75);
      for(const unit of units){
        if(hit.has(unit)||unit.dead||unit.team===h.team||unit.team===2||isBuilding(unit)) continue;
        if(Math.hypot(unit.x-px,unit.y-py)<=radius+unit.radius){
          hit.add(unit);
          applyDamage(unit,damage,h);
          unit.stunTimer=Math.max(unit.stunTimer,0.85+lvl*0.12);
        }
      }
    }
    addText(h.x,h.y-72,'ЧЕТЫРЕ ЛУЖИ','#a7ff70',1.0,16);
  }},
  yosypDrain:{name:'Зелёный отсос',short:'R',type:'point',maxLevel:3,cd:[0,70,60,50],mana:[0,130,170,210],range:1100,ult:true,desc:'Направляет луч во вражеского героя и высасывает 75 HP в секунду в течение 12 секунд.',cast(h,x,y,lvl){
    const target=pickUnitAt(x,y);
    if(!target||target.team===h.team||target.dead||target.type!=='hero') { flashMsg(h,'Наведите ульту на вражеского героя'); return false; }
    target.buffs=target.buffs.filter(buff=>buff.type!=='yosypDrain');
    target.addBuff({type:'yosypDrain',tick:0,t:12,source:h});
    fxBeam(h.x,h.y,target.x,target.y,'#91ed62',0.7);
    fxRing(target.x,target.y,60,'#a7ff70',0.55);
    addText(target.x,target.y-64,'ЙОСЫП ВЫСАСЫВАЕТ HP','#baff89',1.2,16);
    return true;
  }}
};
Object.assign(SKILLS,YOSYP_SKILLS);

const TRIBUPAINER_SKILLS = {
  tribuIncendiary: {name:'Поджигающие пули',short:'Q',type:'self',passive:false,maxLevel:4,cd:[0,14,12,10,8],mana:[0,45,55,65,75],desc:'На 10 секунд дробовик поджигает цель на 5–8 секунд; урон горения растёт с уровнем навыка.',cast(h){ h.tribuIncendiaryTimer=10; addText(h.x,h.y-62,'ПОДЖИГАЮЩИЕ ПУЛИ','#ff8a3d',1.1,16); fxRing(h.x,h.y,78,'#ff5a24',0.45); }},
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
    desc:'15 секунд мчится на зелёном байке: наносит урон и оглушает при контакте, получает щит и не может стрелять.',
    cast(h){
      if(h.bikeSpeedBoost) h.speed-=h.bikeSpeedBoost;
      h.bikeSpeedBoost=260; h.speed+=h.bikeSpeedBoost;
      h.bikeTimer=15; h.bikeHitTimer=0; h.bikeShieldTimer=15; h.attackTarget=null;
      addText(h.x,h.y-72,'ЗЕЛЁНЫЙ БАЙК — 15 СЕКУНД','#8dffad',1.3,18);
      fxRing(h.x,h.y,120,'#65ff9a',0.75); spawnParticles(h.x,h.y,'#b9ffd0',36,1.4);
    }
  }
};

/* ===== Джувсют: «Большой обед» — пожирание лесных крипов ===== */
const JUVSYUT_DEVOUR_BONUS = [null, {hp:40, dmg:5}, {hp:50, dmg:10}, {hp:60, dmg:20}];
const JUVSYUT_HERO_DMG_BONUS = 100;   // фиксированный урон за съеденного героя
const JUVSYUT_HUNGER_TIME = 60;        // сек. без еды до потери одного стака
const JUVSYUT_HERO_STACKS = 10;        // герой = 10 лесных крипов
const JUVSYUT_HERO_EAT_HP = 200;       // героя можно съесть, только если HP <= 200

function juvsyutDevourState(h){
  if(!h.devour) h.devour = {count:0, hp:0, dmg:0, hunger:0};
  return h.devour;
}
function juvsyutDevourGain(h, stacks, lvl, fixedDmg){
  const st = juvsyutDevourState(h);
  const b = JUVSYUT_DEVOUR_BONUS[Math.max(1, Math.min(3, lvl || 1))];
  const hp = b.hp * stacks;
  const dmg = (fixedDmg !== undefined) ? fixedDmg : b.dmg * stacks;
  const maxBefore = h.maxHp, dmgBefore = h.dmg;
  st.count += stacks; st.hp += hp; st.dmg += dmg; st.hunger = 0;
  h.devourPop = 0.6;
  addText(h.x, h.y - 128, '🍖 +' + stacks + (stacks>=10 ? '  (ГЕРОЙ!)' : ''), stacks>=10 ? '#ff9d62' : '#ffd9a8', 1.4, stacks>=10 ? 22 : 18);
  h.maxHp += hp; h.hp += hp; h.dmg += dmg;
  addText(h.x, h.y - 96, '+' + Math.round(h.maxHp - maxBefore) + ' HP, +' + Math.round(h.dmg - dmgBefore) + ' урона  (всего ×' + st.count + ': +' + Math.round(st.hp) + ' HP, +' + Math.round(st.dmg) + ' урона)', '#ffb36b', 1.5, 15);
}
function juvsyutDevourLose(h){
  const st = h.devour;
  if(!st || st.count <= 0) return;
  const avgHp = st.hp / st.count, avgDmg = st.dmg / st.count;
  st.count--; st.hp = Math.max(0, st.hp - avgHp); st.dmg = Math.max(0, st.dmg - avgDmg);
  if(st.count === 0){ st.hp = 0; st.dmg = 0; }
  h.maxHp = Math.max(1, h.maxHp - avgHp); h.hp = Math.min(h.hp, h.maxHp);
  h.dmg = Math.max(1, h.dmg - avgDmg);
  addText(h.x, h.y - 96, 'ГОЛОД: −1 СТАК  (осталось ×' + st.count + ')', '#ff8a6b', 1.3, 15);
}
function juvsyutResetDevour(h){
  const st = h.devour;
  if(!st) return;
  if(st.hp || st.dmg){
    h.maxHp = Math.max(1, h.maxHp - st.hp);
    h.hp = Math.min(h.hp, h.maxHp);
    h.dmg = Math.max(1, h.dmg - st.dmg);
  }
  st.count = 0; st.hp = 0; st.dmg = 0; st.hunger = 0;
}
function juvsyutEatNeutral(h, creep, lvl){
  fxBeam(h.x, h.y, creep.x, creep.y, '#ffb36b', 0.25);
  spawnParticles(creep.x, creep.y, '#ffd0a8', 18, 1.0);
  killUnit(creep, h);
  juvsyutDevourGain(h, 1, lvl);
}
/* Ищет цель под курсором: только лесной крип или вражеский герой. */
function juvsyutFindDevourTarget(h, x, y){
  let best = null, bestDistance = 90;
  for(const u of units){
    if(u.dead || u.team === h.team) continue;
    const eligible = u.type === 'neutral' || (u.type === 'hero' && !u.isIllusion);
    if(!eligible) continue;
    const distance = Math.hypot(u.x - x, u.y - y) - u.radius;
    if(distance < bestDistance){ bestDistance = distance; best = u; }
  }
  return best;
}
function updateJuvsyutDevour(h, dt){
  const st = juvsyutDevourState(h);
  if(h.devourPop > 0) h.devourPop = Math.max(0, h.devourPop - dt*1.5);
  /* Голод: 60 секунд без еды — минус один стак, затем отсчёт заново. */
  if(st.count > 0){
    st.hunger += dt;
    if(st.hunger >= JUVSYUT_HUNGER_TIME){ st.hunger = 0; juvsyutDevourLose(h); }
  } else st.hunger = 0;
}
/* ИИ бота: ходит к лагерям и использует ульт на лесных крипов / добивает слабых героев.
   Возвращает true, если бот занят этим в текущем тике. */
function juvsyutBotThink(h, hpPct){
  const ult = h.skills[3];
  if(!ult || ult.level < 1 || h.stunTimer > 0 || ult.cd > 0) return false;
  /* 1) Добить героя с HP <= 200 — бонус за 10 крипов. */
  const victim = units.find(u => u.type === 'hero' && u.team !== h.team && !u.dead && !u.isIllusion &&
    !u.invulnerable && u.hp <= JUVSYUT_HERO_EAT_HP && Math.hypot(u.x - h.x, u.y - h.y) <= 560);
  if(victim && castSkill(h, 3, victim.x, victim.y)) return true;
  /* 2) Ближайший лесной крип в зоне каста — съедаем. */
  let near = null, nearD = 560;
  for(const u of units){
    if(u.dead || u.type !== 'neutral') continue;
    const d = Math.hypot(u.x - h.x, u.y - h.y);
    if(d < nearD){ nearD = d; near = u; }
  }
  const enemyClose = units.some(u => u.type === 'hero' && u.team !== h.team && !u.dead &&
    Math.hypot(u.x - h.x, u.y - h.y) < 450);
  if(near && !enemyClose && castSkill(h, 3, near.x, near.y)) return true;
  /* 3) Ульт готов, врагов рядом нет — идём в лес к лагерю. */
  const pushing = gameTime >= MID_PUSH_TIME && h.midPushAssignment;
  const enemyNear = units.some(u => u.type === 'hero' && u.team !== h.team && !u.dead &&
    Math.hypot(u.x - h.x, u.y - h.y) < 700);
  if(!pushing && !enemyNear && hpPct > 0.5 && updateBotFarm(h)) return true;
  return false;
}

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
    desc:'Разгоняется на 6 секунд: быстрее передвигается и получает усиленный бонус к скорости и урону атак.',
    cast(h,x,y,lvl){
      h.buffs=h.buffs.filter(buff=>buff.type!=='juvsyutRoll'&&buff.id!=='juvsyutRollDamage');
      h.addBuff({type:'spd',id:'juvsyutRoll',val:0.24+lvl*0.05,t:6});
      h.addBuff({type:'as',id:'juvsyutRollAttack',val:0.28+lvl*0.06,t:6});
      h.addBuff({type:'dmg',id:'juvsyutRollDamage',val:30+21*lvl,t:6});
      fxRing(h.x,h.y,95,'#ffbd78',0.6);
      spawnParticles(h.x,h.y,'#ffd0a8',36,1.1);
      addText(h.x,h.y-66,'РАЗБЕГ','#ffbd78',1.2,17);
    }
  },
  juvsyutFeast: {
    name:'Большой обед', short:'R', type:'point', maxLevel:3,
    cd:[0,10,8,5], mana:[0,0,0,0], range:600, ult:true,
    desc:'Наведите на лесного крипа — Джувсют съедает его и навсегда получает +HP и урон (ур.1: +40 HP и +5 урона, ур.2: +50 и +10, ур.3: +60 и +20). Перезарядка 10/8/5 с, мана не тратится. Без еды 60 секунд — теряется один стак. На вражеского героя с HP ≤ 200: съедает его (+HP как за 10 крипов и +100 урона); если HP выше 200 — не срабатывает, перезарядка не включается. Смерть сбрасывает все бонусы.',
    cast(h,x,y,lvl){
      const target=juvsyutFindDevourTarget(h,x,y);
      if(!target){ flashMsg(h,'Наведите на лесного крипа или героя с HP ≤ 200'); return false; }
      if(target.type==='hero'){
        if(target.invulnerable){ flashMsg(h,'Цель неуязвима'); return false; }
        if(target.hp>JUVSYUT_HERO_EAT_HP){ flashMsg(h,'У героя больше 200 HP'); return false; }
        fxBeam(h.x,h.y,target.x,target.y,'#ff9d62',0.35);
        fxRing(target.x,target.y,120,'#ff9d62',0.8);
        spawnParticles(target.x,target.y,'#ffe0bd',48,1.5);
        killUnit(target,h);
        juvsyutDevourGain(h,JUVSYUT_HERO_STACKS,lvl,JUVSYUT_HERO_DMG_BONUS);
        addText(h.x,h.y-120,'ГЕРОЙ СЪЕДЕН!  ×'+JUVSYUT_HERO_STACKS,'#ff9d62',1.6,20);
      } else {
        juvsyutEatNeutral(h,target,lvl);
      }
      fxRing(h.x,h.y,130,'#ff9d62',0.7);
      addText(h.x,h.y-82,'БОЛЬШОЙ ОБЕД','#ffd0a8',1.2,17);
      return true;
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
      h.buffs=h.buffs.filter(buff=>!['chipCrown','chipCrownArmor','chipCrownSpeed','chipCrownRegen'].includes(buff.id));
      h.addBuff({type:'chipCrown',id:'chipCrown',t:8+lvl});
      h.addBuff({type:'armor',id:'chipCrownArmor',val:5+2*lvl,t:8+lvl});
      h.addBuff({type:'spd',id:'chipCrownSpeed',val:0.12+0.025*lvl,t:8+lvl});
      h.addBuff({type:'hpregen',id:'chipCrownRegen',val:10+5*lvl,t:8+lvl});
      fxRing(h.x,h.y,110,'#ffe39a',0.7);
      addText(h.x,h.y-68,'КОРОНА ВЛАСТИ','#ffe39a',1.2,17);
      return true;
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
  exileKnight: {name:'Клеймо изгнанника', short:'G', type:'point', maxLevel:1, cd:[0,26], mana:[0,75], range:700, desc:'Помечает врага и наносит ему мощный удар с оглушением.', cast(h,x,y){ const target=pickUnitAt(x,y); if(!target||target.team===h.team||target.dead||isBuilding(target)){ flashMsg(h,'Наведите на вражеского бойца'); return; } applyDamage(target,h.getDamage()*1.65,{team:h.team,source:h,attack:true,fangsDamageIncluded:true,fangsDamageScale:1.65,dianaDamageIncluded:true,dianaDamageScale:1.65}); target.addBuff({type:'shardMark',val:0.20,t:8}); target.stunTimer=Math.max(target.stunTimer,1.1); fxRing(target.x,target.y,78,'#ff7180',0.55); }},
  pyro: {name:'Огненный щит', short:'G', type:'self', maxLevel:1, cd:[0,28], mana:[0,80], desc:'Щит снижает урон атак на 35% на 8 секунд.', cast(h){ h.addBuff({type:'shardShield',val:0.35,t:8}); fxRing(h.x,h.y,90,'#ff9d5c',0.55); }},
  warlord: {name:'Бросок клинка', short:'G', type:'point', maxLevel:1, cd:[0,24], mana:[0,70], range:700, desc:'Наносит цели сильный удар и оглушает на 1.2 секунды.', cast(h,x,y){ const target=pickUnitAt(x,y); if(!target||target.team===h.team||target.dead||isBuilding(target)){ flashMsg(h,'Наведите на вражеского бойца'); return; } applyDamage(target,h.getDamage()*1.8,{team:h.team,source:h,attack:true,fangsDamageIncluded:true,fangsDamageScale:1.8,dianaDamageIncluded:true,dianaDamageScale:1.8}); target.stunTimer=Math.max(target.stunTimer,1.2); fxRing(target.x,target.y,70,'#8be9fd',0.5); }},
  grisha: {name:'Усиление стихий', short:'G', type:'self', maxLevel:1, cd:[0,30], mana:[0,90], desc:'Усиливает следующее заклинание Гриши на 50%.', cast(h){ h.addBuff({type:'shardSpell',val:1.5,t:12}); }},
  golly: {name:'Ледяная броня', short:'G', type:'self', maxLevel:1, cd:[0,30], mana:[0,90], desc:'Даёт 12 брони на 10 секунд.', cast(h){ h.addBuff({type:'shardArmor',val:12,t:10}); fxRing(h.x,h.y,100,'#8be9fd',0.55); }},
  sasych: {name:'Кровавая метка', short:'G', type:'point', maxLevel:1, cd:[0,28], mana:[0,70], range:700, desc:'Помечает врага: он получает на 25% больше урона 8 секунд.', cast(h,x,y){ const target=pickUnitAt(x,y); if(!target||target.team===h.team||target.dead||isBuilding(target)){ flashMsg(h,'Наведите на вражеского бойца'); return; } target.addBuff({type:'shardMark',val:0.25,t:8}); }},
  ilya: {name:'Ядовитое поле', short:'G', type:'point', maxLevel:1, cd:[0,32], mana:[0,100], range:650, desc:'Создаёт поле на 8 секунд. Враги внутри получают урон и не могут использовать способности.', cast(h,x,y){ aoes.push({x,y,radius:230,dmg:abilityDamage(h,70),manaDmg:0,team:h.team,source:h,delay:0,t:0,color:'#55e06f',applied:false,life:8,dead:false,silenceDuration:1.2,poisonField:true}); fxMark(x,y,230,'#55e06f',8); }},
  malit: {name:'Тяжёлый удар', short:'G', type:'point', maxLevel:1, cd:[0,28], mana:[0,80], range:650, desc:'Удар Малита наносит 220 урона и оглушает врага на 1 секунду.', cast(h,x,y){ const target=pickUnitAt(x,y); if(!target||target.team===h.team||target.dead||isBuilding(target)){ flashMsg(h,'Наведите на врага'); return; } applyDamage(target,220,h); target.stunTimer=Math.max(target.stunTimer,1); fxHit(target.x,target.y,'#f2c38b'); }},
  illusionist: {name:'Зеркальный зал', short:'G', type:'self', maxLevel:1, cd:[0,32], mana:[0,100], desc:'Создаёт две сильные иллюзии на 10 секунд.', cast(h){ spawnIllusion(h,{life:10,damageMultiplier:0.8,damageTakenMultiplier:1.5,angle:0}); spawnIllusion(h,{life:10,damageMultiplier:0.8,damageTakenMultiplier:1.5,angle:Math.PI}); fxRing(h.x,h.y,110,'#e8d4ff',0.65); }}
  ,shadow: {name:'Тёмный залп', short:'G', type:'point', maxLevel:1, cd:[0,28], mana:[0,90], range:700, desc:'Выпускает усиленный ближний койл, наносящий 910 урона.', cast(h,x,y){ castShadowCoil(h,x,y,1,700,910,1300,420); }}
  ,savely: {name:'Резонанс клича', short:'G', type:'self', maxLevel:1, cd:[0,30], mana:[0,90], desc:'Звонкий клич дополнительно замедляет врагов на 40% и снижает им броню на 5 на 3.5 секунды.', cast(h){ h.shardSkill=true; addText(h.x,h.y-62,'КЛИЧ УСИЛЕН SHARD','#8be9fd',1.1,16); }}
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
      applyDamage(target,abilityDamage(h,85+45*lvl),h);
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
      const damage = abilityDamage(h,400+100*lvl);
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
      const radius=320;
      for(let turn=0;turn<2;turn++){
        for(const unit of units){
          if(unit.team===h.team || unit.dead || isBuilding(unit)) continue;
          if(Math.hypot(unit.x-h.x,unit.y-h.y)<radius) applyDamage(unit,abilityDamage(h,150+55*lvl),h);
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

const SAVELY_SKILLS = {
  savelyEvade:{name:'Ловкий уворот',short:'Q',type:'self',passive:true,maxLevel:1,cd:[0,0],mana:[0,0],desc:'Пассивно: каждая 4-я входящая физическая атака гарантированно промахивается.'},
  savelyCry:{name:'Звонкий клич',short:'W',type:'self',maxLevel:4,cd:[0,11,9,7,5],mana:[0,75,90,105,120],damage:[0,130,210,290,370],radius:350,desc:'Громкий крик наносит магический урон врагам вокруг. С шардом замедляет и снижает броню.',cast(h,x,y,lvl){
    const shard=!!h.shardSkill;
    for(const unit of units){
      if(unit.dead||unit.team===h.team||unit.team===2||isBuilding(unit)||Math.hypot(unit.x-h.x,unit.y-h.y)>this.radius+unit.radius) continue;
      applyDamage(unit,abilityDamage(h,this.damage[lvl]),h);
      if(shard){unit.slow=Math.max(unit.slow||0,0.4);unit.slowT=Math.max(unit.slowT||0,3.5);unit.addBuff({type:'armor',id:'savelyCryArmor',val:-5,t:3.5});}
    }
    fxRing(h.x,h.y,this.radius,'#ffbd54',0.8);spawnParticles(h.x,h.y,'#fff0a8',52,1.45);addText(h.x,h.y-this.radius-20,shard?'ЗВОНКИЙ КЛИЧ • SHARD':'ЗВОНКИЙ КЛИЧ','#ffe09a',1.2,18);playHeroSfx('savelyCry');
  }},
  savelyTransformer:{name:'Форма Трансформера',short:'E',type:'self',maxLevel:4,cd:[0,60,53,46,39],mana:[0,90,105,120,135],duration:[0,10,12,14,16],damage:[0,30,50,70,90],attackSpeed:[0,40,65,90,115],speed:[0,0.12,0.16,0.20,0.24],desc:'Савелий нажимает на родинку и превращается в робота: получает урон, скорость атаки и скорость передвижения.',cast(h,x,y,lvl){
    h.buffs = Array.isArray(h.buffs) ? h.buffs : []; h.buffs=h.buffs.filter(buff=>!['savelyTransformer','savelyTransformerDamage','savelyTransformerAttack','savelyTransformerSpeed'].includes(buff.id)); const safeLevel=clamp(Number(lvl)||1,1,4); const duration=this.duration[safeLevel]; h.addBuff({type:'savelyTransformer',id:'savelyTransformer',t:duration}); h.addBuff({type:'dmg',id:'savelyTransformerDamage',val:this.damage[safeLevel],t:duration}); h.addBuff({type:'as',id:'savelyTransformerAttack',val:this.attackSpeed[safeLevel]/100,t:duration}); h.addBuff({type:'spd',id:'savelyTransformerSpeed',val:this.speed[safeLevel],t:duration}); heroBurst(h,'#ffb347',125,42); addText(h.x,h.y-82,'ФОРМА ТРАНСФОРМЕРА • '+duration+' СЕК','#ffd36b',1.3,18); playHeroSfx('savelyTransform');
  }},
  savelyFear:{name:'Яростный рев',short:'R',type:'point',maxLevel:3,ult:true,cd:[0,75,60,45],mana:[0,170,220,270],range:[0,1000,1200,1400],damage:[0,323,468,612],fearDuration:[0,2,2.5,3],desc:'Рёв по прямой линии наносит магический урон и заставляет врагов разбегаться.',cast(h,x,y,lvl){
    const safeLevel=clamp(Number(lvl)||1,1,3);
    const targetX=Number.isFinite(x)?x:h.x+Math.cos(h.angle||0)*this.range[safeLevel];
    const targetY=Number.isFinite(y)?y:h.y+Math.sin(h.angle||0)*this.range[safeLevel];
    const angle=Math.atan2(targetY-h.y,targetX-h.x),distance=Math.min(this.range[safeLevel],Math.hypot(targetX-h.x,targetY-h.y)||1),width=115;
    for(const unit of units){const along=(unit.x-h.x)*Math.cos(angle)+(unit.y-h.y)*Math.sin(angle),across=Math.abs((unit.x-h.x)*Math.sin(angle)-(unit.y-h.y)*Math.cos(angle));if(unit.dead||unit.team===h.team||unit.team===2||isBuilding(unit)||along<0||along>distance||across>width+unit.radius)continue;applyDamage(unit,abilityDamage(h,this.damage[safeLevel]),h);unit.buffs=Array.isArray(unit.buffs)?unit.buffs.filter(buff=>buff.type!=='fear'):[];unit.addBuff({type:'fear',id:'savelyFear',t:this.fearDuration[safeLevel],sourceX:h.x,sourceY:h.y});}
    const ex=h.x+Math.cos(angle)*distance,ey=h.y+Math.sin(angle)*distance;fxBeam(h.x,h.y,ex,ey,'#ffcf68',0.75);fxRing(h.x,h.y,100,'#ff8f45',0.75);spawnParticles(ex,ey,'#fff0ad',45,1.4);addText(h.x+Math.cos(angle)*distance*.55,h.y+Math.sin(angle)*distance*.55-34,'СТРАХ','#fff0a8',1.3,20);playHeroSfx('savelyFear');
  }}
};
Object.assign(SKILLS,SAVELY_SKILLS);
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
    lateSkillGrowth:0.012,
    skills:['quas','wex','exort','invoke']
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
    baseDmg:52, dmgPerLvl:6, speed:150,
    atkRange:150, atkTime:0.92,
    baseArmor:2, armorPerLvl:0.35, vision:1000,
    hpRegen:1.2, mpRegen:1.4,
    lateSkillGrowth:0.01, lateAttackGrowth:0.01,
    skills:['bloodrage','bloodRite','thirst','rupture']
  },
  {
    id:'ilya', name:'Илья', title:'Жирный повелитель ауры',
    color:'#6c9b58', color2:'#c8ef8d',
    baseHp:1080, hpPerLvl:145, baseMp:280, mpPerLvl:34,
    baseDmg:88, dmgPerLvl:9, speed:132,
    atkRange:155, atkTime:1.15,
    baseArmor:7, armorPerLvl:0.8, vision:980,
    hpRegen:3.5, mpRegen:1.8,
    lateSkillGrowth:0.015,
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
    lateSkillGrowth:0.025, lateAttackGrowth:0.01,
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
    color:'#0e5461', color2:'#79e4e4',
    baseHp:720, hpPerLvl:95, baseMp:340, mpPerLvl:42,
    baseDmg:72, dmgPerLvl:8, speed:162,
    atkRange:500, atkTime:1.08,
    baseArmor:2, armorPerLvl:0.45, vision:1080,
    hpRegen:1.6, mpRegen:2.2,
    lateSkillGrowth:0.015, lateAttackGrowth:0.01,
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
    baseDmg:68, dmgPerLvl:8, speed:158,
    atkRange:500, atkTime:1.05,
    baseArmor:6, armorPerLvl:0.65, vision:1080,
    hpRegen:2.2, mpRegen:2.5,
    lateSkillGrowth:0.02, lateAttackGrowth:0.012,
    skills:['mo3giDrone','mo3giGift','mo3giMines','mo3giBike']
  },
  {
    id:'tribupainer', name:'Трибупейнер', title:'Повелитель огромного дробовика',
    color:'#4a3028', color2:'#ffb36b',
    balanceScale:1.05,
    baseHp:900, hpPerLvl:120, baseMp:300, mpPerLvl:38,
    baseDmg:34, dmgPerLvl:4.5, speed:145,
    atkRange:560, atkTime:1.15,
    baseArmor:5, armorPerLvl:0.6, vision:1040,
    hpRegen:2.2, mpRegen:2.0,
    lateSkillGrowth:0.025, lateAttackGrowth:0.035,
    skills:['tribuIncendiary','tribuShield','tribuInvisibility','tribuExecution'],
    weapon:{type:'shotgun',color:'#ffb36b',size:0.4125}
  },
  {
    id:'mageHunter', name:'Охотник на магов', title:'Ближний carry',
    balanceScale:0.85,
    color:'#24184d', color2:'#a980ff', baseHp:850, hpPerLvl:114,
    baseMp:290, mpPerLvl:36, baseDmg:98, dmgPerLvl:10, speed:220,
    atkRange:150, atkTime:0.66, baseArmor:5, armorPerLvl:0.7,
    vision:1020, hpRegen:2.4, mpRegen:1.8,
    lateSkillGrowth:0.018, lateAttackGrowth:0.01,
    skills:['mageHunterManaBurn','mageHunterBlink','mageHunterReflect','mageHunterUlt'], weapon:{type:'dualBlades',color:'#d58cff',size:1.25,followFacing:true}
  },
  {
    id:'regina', name:'Ригина', title:'Героиня яростного натиска',
      color:'#6e3048', color2:'#ff9fbd',
      baseHp:940, hpPerLvl:126, baseMp:290, mpPerLvl:36,
      baseDmg:86, dmgPerLvl:9.2, speed:196,
      atkRange:155, atkTime:0.82, baseArmor:6, armorPerLvl:0.72,
      vision:1000, hpRegen:2.6, mpRegen:1.8,
      lateSkillGrowth:0.018,
      skills:['reginaDispose','reginaRebound','reginaUnleash'], weapon:{type:'dualBlades',color:'#ff9fbd',size:1.05}
    },
  {
    id:'yosyp', name:'Йосып', title:'Зелёный токсик',
    color:'#42612d', color2:'#a7ff70',
    baseHp:930, hpPerLvl:122, baseMp:360, mpPerLvl:44,
    baseDmg:78, dmgPerLvl:8.4, speed:164,
    atkRange:175, atkTime:1.02, baseArmor:5, armorPerLvl:0.62,
    vision:1020, hpRegen:2.5, mpRegen:2.4,
    lateSkillGrowth:0.016,
    skills:['yosypBlowback','yosypPuddles','yosypDrain'], weapon:{type:'club',color:'#a7ff70',size:1.12}
  },
  {
    id:'dawnMaiden', name:'Рассветная дева', title:'Танк / инициатор',
    balanceScale:0.78, damageScale:1,
    color:'#8a5424', color2:'#fff3b0', baseHp:1160, hpPerLvl:154,
    baseMp:330, mpPerLvl:39, baseDmg:150, dmgPerLvl:8.6, speed:150,
    atkRange:155, atkTime:0.99, baseArmor:9, armorPerLvl:0.95,
    vision:1000, hpRegen:3.8, mpRegen:2.0,
    lateSkillGrowth:0.018,
    skills:['dawnHammer','dawnHammerThrow','dawnBlessing','dawnGlobalJump'], weapon:{type:'hammer',color:'#ffe39a',size:1.55}
  },
  {
    id:'exileKnight', name:'Рыцарь-изгнанник', title:'Ближний carry',
    balanceScale:0.84, damageScale:0.72,
    color:'#18384f', color2:'#9bdfff', baseHp:980, hpPerLvl:132,
    baseMp:280, mpPerLvl:34, baseDmg:135, dmgPerLvl:11, speed:178,
    atkRange:145, atkTime:0.84, baseArmor:7, armorPerLvl:0.82,
    vision:1010, hpRegen:3.0, mpRegen:1.7,
    lateSkillGrowth:0.02,
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
    id:'savely', name:'Савелий', title:'Жирный футбольный трансформер',
    color:'#254f68', color2:'#ffcc66',
    baseHp:1008, hpPerLvl:133.2, baseMp:300, mpPerLvl:34,
    baseDmg:102, dmgPerLvl:9.5, speed:158,
    atkRange:155, atkTime:0.96, baseArmor:8, armorPerLvl:0.82,
    vision:1000, hpRegen:3.4, mpRegen:1.8,
    lateSkillGrowth:0.018, lateAttackGrowth:0.012,
    skills:['savelyEvade','savelyCry','savelyTransformer','savelyFear'],
    weapon:{type:'club',color:'#ffcc66',size:1.35}
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
    baseHp:600, hpPerLvl:66, baseMp:330, mpPerLvl:40,
    baseDmg:74, dmgPerLvl:7.5, speed:158,
    atkRange:690, atkTime:1.18, baseArmor:3, armorPerLvl:0.48,
    vision:1250, hpRegen:1.6, mpRegen:2.4,
    skills:['sniperShrapnel','sniperHeadshot','sniperTakeAim','sniperAssassinate'],
    weapon:{type:'sniperRifle',color:'#d9b079',size:1.0,followFacing:true}
  }
];

const HERO_STAT_BALANCE = {
  pyro:[600,78,50,3.5,1], warlord:[920,112,78,4.2,0.94], grisha:[560,72,30,2.4,1.08],
  golly:[760,106,46,3.4,1], sasych:[610,72,47,2.8,0.92], ilya:[1010,126,78,3.5,0.93],
  malit:[930,116,68,3.2,0.95], arcady:[620,74,52,3.5,1], illusionist:[680,82,60,3.6,0.94],
  shadow:[850,97,58,3.2,1], electricGosha:[720,86,54,3.5,1.02], mo3gi:[800,95,64,3.8,0.95],
  tribupainer:[850,102,32,2.5,0.95], mageHunter:[760,92,52,2.5,0.92], regina:[870,105,60,2.6,0.94],
  yosyp:[860,102,70,7.8,0.98],
  dawnMaiden:[1080,137,72,3,0.92], exileKnight:[900,112,90,3.7,0.92], juvsyut:[970,128,68,3.2,0.95],
  chip:[760,90,58,3.3,1.03], savely:[970,116,80,3.4,0.94], juggernaut:[930,110,78,3,0.94],
  earthshaker:[880,116,78,4.2,0.98], sniper:[540,58,68,3.8,1.04]
};

for(const def of HERO_DEFS){
  [def.baseHp, def.hpPerLvl, def.baseDmg, def.dmgPerLvl, def.abilityDamageScale] = HERO_STAT_BALANCE[def.id];
  if(def.damageScale === undefined) def.damageScale = 1;
  if(def.lateSkillGrowth) def.lateSkillGrowth *= 0.25;
  if(def.lateAttackGrowth) def.lateAttackGrowth *= 0.25;
}

function offerTalent(hero){
  return;
}

class Hero extends Unit {
  constructor(def, team){
    const balanceScale = def.balanceScale || 1;
    const spawnAt = spawnPoint(team);
    super({
      x:spawnAt.x, y:spawnAt.y, team,
      radius:24, speed:def.speed * balanceScale * 0.9,
      hp:def.baseHp, dmg:def.baseDmg,
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
    this.killStreak = 0; this.spreeKills = 0; this.lastHeroKillTime = -Infinity;
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
      this.skills[4].level = 1;
      this.skills[4].free = true;
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
    this.maxHp += d.hpPerLvl; this.hp = Math.min(this.maxHp, this.hp + d.hpPerLvl);
    this.maxMp += d.mpPerLvl * balanceScale; this.mp = Math.min(this.maxMp, this.mp + d.mpPerLvl * balanceScale);
    this.dmg += d.dmgPerLvl * (d.damageScale || balanceScale); this.armor += d.armorPerLvl * balanceScale;
    if(this.def.id === 'golly' && this.level >= 6 && this.skills[3] && this.skills[3].level < 1){
      this.skills[3].level = 1; this.skills[3].free = true;
      addText(this.x, this.y-100, 'ЛЕДЯНЫЕ ГОЛЕМЫ ОТКРЫТЫ', '#8eeaff', 1.4, 18);
    }
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
      /* 3) Докачиваем всё остальное */
      for(let i=0;i<4;i++){
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
        { const respawnAt = spawnPoint(this.team); this.x = respawnAt.x; this.y = respawnAt.y; }
        this.moveTarget = null; this.attackTarget = null;
        this.combatTimer = 0;
        this.buffs.length = 0;
        if(this.def.id === 'juvsyut') juvsyutResetDevour(this);
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
    tickYosypEffects(this,dt);
    this.tickTimers(dt);
    if(this.def.id === 'juvsyut') updateJuvsyutDevour(this, dt);
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
      if(item.id === 'holyLocket' && !this.dead){
        const lockerCfg = SHOP_ITEMS.holyLocket;
        if((item.charges || 0) < lockerCfg.maxCharges){
          item.chargeTimer = (item.chargeTimer || 0) + dt;
          if(item.chargeTimer >= lockerCfg.chargeInterval){
            item.chargeTimer -= lockerCfg.chargeInterval;
            item.charges = Math.min(lockerCfg.maxCharges, (item.charges || 0) + 1);
          }
        }
      }
      if(item.id === 'dianaPants' && item.auraOn && !this.dead){
        item.auraTimer = (item.auraTimer || 0) - dt;
        if(item.auraTimer <= 0){
          item.auraTimer = SHOP_ITEMS.dianaPants.auraInterval;
          tickDianaAura(this);
        }
      }
    }
    if(this.timurPillow > 0){
      const heal = Math.min(this.maxHp - this.hp, 60 * dt * healAmpOf(this));
      this.hp += heal;
      this.timurPillow = Math.max(0, this.timurPillow - dt);
    }
    const manaBoost = this.inventory.some(i => i && i.id === 'manaTome') ? 1.10 : 1;
    this.mp = Math.min(this.maxMp, this.mp + this.mpRegen * manaBoost * dt);

    let regen = this.hpRegen;
    for(const b of this.buffs) if(b.type === 'hpregen') regen += b.val;
    if(this.buffs.some(b=>b.type==='regen')) regen += this.maxHp*0.04;
    this.hp = Math.min(this.maxHp, this.hp + regen*dt*healAmpOf(this));

    const base = BASES[this.team];
    const nearBase = inSpawnRoom(this.x, this.y, this.team, 20);
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
    tickRupture(this, dt);
    resolveBaseWalls(this);
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
            const bikeLevel=(this.skills.find(skill=>skill.id==='mo3giBike')||{level:1}).level||1;
            applyDamage(unit,abilityDamage(this,80+35*bikeLevel),this); unit.stunTimer=Math.max(unit.stunTimer,0.65);
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
      if(hero === playerHero && typeof window.__shadowOnlineSkillCast === 'function')
        window.__shadowOnlineSkillCast(hero,slot,s.id,tx,ty);
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

function draftSkipRect(){ return {x:VW-24-230,y:78,w:230,h:38}; }

/* Драфт: в рейтинге герои уникальны (бот не берёт героя игрока и наоборот), боты выбирают
   постепенно. В обычных режимах допускается до двух одинаковых героев. */
let draftBotTimer = 0;
const DRAFT_MAX_COPIES = () => rankedOnlineMatch ? 1 : 2;
function draftHeroCount(index, ignoreBotSlot=-1){
  let count = draftPlayerIndex === index ? 1 : 0;
  draftBotIndices.forEach((bot, slot) => { if(bot === index && slot !== ignoreBotSlot) count++; });
  return count;
}
function draftBotPool(slot){
  const result = [];
  for(let i=0;i<HERO_DEFS.length;i++) if(draftHeroCount(i, slot) < DRAFT_MAX_COPIES()) result.push(i);
  return result;
}
function draftPlayerBlocked(index){
  /* Игрок не может взять героя, если лимит копий исчерпан ботами (свой текущий выбор не считается). */
  let count = 0; draftBotIndices.forEach(bot => { if(bot === index) count++; });
  return count >= DRAFT_MAX_COPIES();
}
function draftFillBot(slot){
  const pool = draftBotPool(slot);
  draftBotIndices[slot] = pool[Math.floor(Math.random()*pool.length)];
}
function beginDraft(preselected=-1){
  menuStage='draft';
  draftTime=30;
  draftLastSec=Infinity;
  draftCountdownSpoken=false;
  draftPlayerIndex=preselected;
  selectedHeroIndex=preselected>=0 ? preselected : 0;
  draftBotIndices=new Array(7).fill(-1);
  draftBotTimer=1.5;
  if(!rankedOnlineMatch) for(let i=0;i<7;i++) draftFillBot(i);
}
function finishDraft(){
  for(let i=0;i<7;i++) if(draftBotIndices[i] < 0) draftFillBot(i);
  if(draftPlayerIndex<0){
    const pool=[]; for(let i=0;i<HERO_DEFS.length;i++) if(!draftPlayerBlocked(i)) pool.push(i);
    draftPlayerIndex=pool[Math.floor(Math.random()*pool.length)];
  }
  startGame(draftPlayerIndex,draftBotIndices);
}

function updateDraft(dt){
  if(menuStage!=='draft') return;
  draftTime=Math.max(0,draftTime-dt);
  const draftSec=Math.ceil(draftTime);
  if(draftSec!==draftLastSec){
    draftLastSec=draftSec;
    if(DRAFT_LINES[draftSec]) announce(DRAFT_LINES[draftSec], {interrupt: draftSec<=10});
  }
  if(rankedOnlineMatch){
    draftBotTimer-=dt;
    if(draftBotTimer<=0){
      const open=[]; draftBotIndices.forEach((index,slot)=>{ if(index<0) open.push(slot); });
      if(open.length){ draftFillBot(open[Math.floor(Math.random()*open.length)]); draftBotTimer=1.2+Math.random()*2.2; }
    }
  }
  if(draftTime<=0) finishDraft();
}

function startGame(playerIndex, draftPicks=null){
  stopMenuMusic();
  MID_PUSH_TIME = gameModeCfg().midPushTime;
  units=[]; heroes=[]; projectiles=[]; aoes=[]; walls=[]; trees=[]; fxs=[]; particles=[]; texts=[]; runes=[]; mo3giMines=[]; grassBends=[];
  controlledUnit=null;
  explored = new Uint8Array(GRID*GRID);
  gameTime=0; waveTimer=8; waveCount=0; winner=null; visionTimer=0; botTeamScenarios=[];
   barracksDestroyed=[0,0]; megaCreeps=[false,false]; recentKills=[];
  structuresSwapped=false; firstBloodDone=false; resultAnnounced=false; prematchTime=PREMATCH_SECONDS; prematchLastSec=Infinity;
  structureProgress=[createStructureProgress(),createStructureProgress()];
   rampageBanner={t:0, owner:null, streak:0};
  shopOpen=false;
  shopGuideOpen=false;
  shopScrollRow=0;
  pendingPurchaseId=null;
  talentOpen=false; talentChoices=[]; talentHero=null;
  talentTreeOpen=false;
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
  let picks;
  if(Array.isArray(draftPicks) && draftPicks.length>=7){
    picks=draftPicks.slice(0,7);
  } else {
    const excluded=new Set([playerIndex]);
    picks=Array.from({length:7},()=>{
      const index=randomHero([...excluded]);
      excluded.add(index);
      return index;
    });
  }
  const [enemyIndex,allyIndex,allyIndex2,enemyAllyIndex,enemyAllyIndex2,allyMidIndex,enemyMidIndex]=picks;

  playerHero = new Hero(HERO_DEFS[playerIndex], 0);
  playerHero.isPlayer = true;
  if(redReginaSkinEquipped && playerHero.def.id==='regina') playerHero.skinId='reginaRed';
  enemyHero  = new Hero(HERO_DEFS[enemyIndex], 1);
  const allyHero = new Hero(HERO_DEFS[allyIndex], 0);
  const allyHero2 = new Hero(HERO_DEFS[allyIndex2], 0);
  const enemyAllyHero = new Hero(HERO_DEFS[enemyAllyIndex], 1);
  const enemyAllyHero2 = new Hero(HERO_DEFS[enemyAllyIndex2], 1);
  const allyMidHero = new Hero(HERO_DEFS[allyMidIndex], 0);
  const enemyMidHero = new Hero(HERO_DEFS[enemyMidIndex], 1);
  createBotScenario(0,[allyHero,allyHero2,allyMidHero]);
  createBotScenario(1,[enemyHero,enemyAllyHero,enemyAllyHero2,enemyMidHero]);
  allyMidHero.midPushAssignment = true;
  enemyHero.midPushAssignment = true;
  enemyMidHero.midPushAssignment = true;
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
  placeHeroOnLane(allyMidHero, 0);
  placeHeroOnLane(enemyMidHero, 0);

  const matchHeroes=[playerHero,allyHero,allyHero2,allyMidHero,enemyHero,enemyAllyHero,enemyAllyHero2,enemyMidHero];
  for(const hero of matchHeroes) hero.levelSkill(0);

  heroes.push(...matchHeroes);
  units.push(...matchHeroes);

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
  startMatchIntro();
  canvas.focus();
}

let structuresSwapped = false;
function orientOnlineMapForTeam(globalTeam){
  if(globalTeam !== 1) return;
  structuresSwapped = true;
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
  MID_PUSH_TIME = GAME_MODES.turbo.midPushTime;
  stopMenuMusic();
  units=[]; heroes=[]; projectiles=[]; aoes=[]; walls=[]; trees=[]; fxs=[]; particles=[]; texts=[]; runes=[]; mo3giMines=[]; grassBends=[];
  controlledUnit=null;
  explored = new Uint8Array(GRID*GRID);
  gameTime=0; waveTimer=8; waveCount=0; winner=null; visionTimer=0;
  barracksDestroyed=[0,0]; megaCreeps=[false,false]; recentKills=[];
  structuresSwapped=false; firstBloodDone=false; resultAnnounced=false; prematchTime=0;
  structureProgress=[createStructureProgress(),createStructureProgress()];
  rampageBanner={t:0, owner:null, streak:0};
  shopOpen=false; shopGuideOpen=false; shopScrollRow=0; pendingPurchaseId=null;
  talentOpen=false; talentChoices=[]; talentHero=null; talentTreeOpen=false;
  chatMessages=[]; chatInputOpen=false;
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
  if(redReginaSkinEquipped && playerHero.def.id==='regina') playerHero.skinId='reginaRed';
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
  const lane = gameTime >= MID_PUSH_TIME && h.midPushAssignment ? 0 : (Number.isInteger(h.assignedLane) ? h.assignedLane : 0);
  const path = LANES[lane];
  if(gameTime >= MID_PUSH_TIME && h.midPushAssignment){
    return path[h.team === 0 ? path.length - 1 : 0];
  }
  /* До 5:00 герой держит свою линию, не телепортируясь сразу под чужую базу. */
  const safePoint = h.team === 0 ? path[Math.min(1, path.length - 1)] : path[Math.max(0, path.length - 2)];
  return safePoint || path[0];
}

function createBotScenario(team, members){
  const scenarioId = Math.floor(Math.random() * 6) + 1;
  botTeamScenarios[team] = {id:scenarioId,phase:1,elapsed:0,midKill:false,towers:Object.create(null),members};
  members.forEach((hero,index) => { hero.botScenarioSlot = index; });
}

function noteBotScenarioKill(team, victim){
  const scenario = botTeamScenarios[team];
  if(scenario && victim && laneDistanceToPoint(victim.x,victim.y,0) < 520) scenario.midKill = true;
}

function noteBotScenarioTower(team, tower){
  const scenario = botTeamScenarios[team];
  if(scenario && tower && tower.type === 'tower' && tower.team !== team){
    scenario.towers[tower.lane + ':' + tower.tier] = true;
  }
}

function scenarioTowerDown(scenario,lane){
  return !!scenario.towers[lane + ':1'];
}

function advanceBotScenario(scenario, dt){
  if(!scenario || scenario.phase >= 6) return;
  scenario.elapsed += dt;
  const allies = scenario.members.filter(hero => hero && !hero.dead);
  const readyLevel = allies.length > 0 && allies.every(hero => hero.level >= 3);
  const sideTowersDown = scenarioTowerDown(scenario,1) && scenarioTowerDown(scenario,2);
  let advance = false;
  switch(scenario.id){
    case 1:
      advance = scenario.phase === 1 ? scenario.elapsed >= 8 :
        scenario.phase === 2 ? scenario.elapsed >= 150 :
        scenario.phase === 3 ? scenario.elapsed >= 25 :
        scenario.phase === 4 ? scenarioTowerDown(scenario,0) || scenario.elapsed >= 180 :
        scenario.phase === 5 ? sideTowersDown || scenario.elapsed >= 120 : false;
      break;
    case 2:
      advance = scenario.phase === 1 ? scenario.elapsed >= 10 :
        scenario.phase === 2 ? readyLevel || scenario.elapsed >= 100 :
        scenario.phase === 3 ? scenario.midKill || scenario.elapsed >= 100 :
        scenario.phase === 4 ? scenarioTowerDown(scenario,0) || scenario.elapsed >= 140 :
        scenario.phase === 5 ? scenarioTowerDown(scenario,2) || scenario.elapsed >= 120 : false;
      break;
    case 3:
      advance = scenario.phase === 1 ? scenario.elapsed >= 8 :
        scenario.phase === 2 ? gameTime >= 240 :
        scenario.phase === 3 ? scenario.elapsed >= 30 :
        scenario.phase === 4 ? sideTowersDown || scenario.elapsed >= 150 :
        scenario.phase === 5 ? scenario.elapsed >= 30 : false;
      break;
    case 4:
      advance = scenario.phase === 1 ? gameTime >= 120 :
        scenario.phase === 2 ? scenario.elapsed >= 25 :
        scenario.phase === 3 ? scenario.elapsed >= 55 :
        scenario.phase === 4 ? scenarioTowerDown(scenario,1) || scenario.elapsed >= 120 :
        scenario.phase === 5 ? scenario.elapsed >= 50 : false;
      break;
    case 5:
      advance = scenario.phase === 1 ? scenario.elapsed >= 8 :
        scenario.phase === 2 ? scenario.midKill || scenario.elapsed >= 240 :
        scenario.phase === 3 ? scenario.elapsed >= 10 :
        scenario.phase === 4 ? scenarioTowerDown(scenario,0) || scenario.elapsed >= 150 :
        scenario.phase === 5 ? scenario.elapsed >= 60 : false;
      break;
    case 6:
      advance = scenario.phase === 1 ? scenario.elapsed >= 60 :
        scenario.phase === 2 ? scenario.elapsed >= 90 :
        scenario.phase === 3 ? scenario.elapsed >= 30 :
        scenario.phase === 4 ? Object.keys(scenario.towers).length > 0 || scenario.elapsed >= 150 :
        scenario.phase === 5 ? scenario.elapsed >= 90 : false;
      break;
  }
  if(advance){ scenario.phase++; scenario.elapsed = 0; }
}

function updateBotScenarios(dt){
  for(const scenario of botTeamScenarios) advanceBotScenario(scenario,dt);
}

function botScenarioDirective(hero){
  const scenario = botTeamScenarios[hero.team];
  if(!scenario) return null;
  const slot = hero.botScenarioSlot || 0;
  const lanes = (values) => values[Math.min(slot,values.length-1)];
  let lane = 0, jungle = false, passive = false, rune = false;
  switch(scenario.id){
    case 1:
      if(scenario.phase <= 2){ lane=lanes([1,2,2]); jungle=slot===2; passive=scenario.phase===2; }
      else if(scenario.phase <= 4) lane=0;
      else if(scenario.phase === 5) lane=lanes([1,1,2]);
      else jungle=true;
      break;
    case 2:
      if(scenario.phase <= 2){ lane=slot===2?2:1; jungle=slot<2; passive=scenario.phase===2; }
      else if(scenario.phase <= 4) lane=slot===2?2:0;
      else lane=2;
      break;
    case 3:
      if(scenario.phase <= 4){ lane=lanes([1,2,0]); passive=scenario.phase===2; }
      else lane=0;
      break;
    case 4:
      if(scenario.phase===1 || scenario.phase===6) jungle=true;
      else if(scenario.phase===2) lane=lanes([1,2,0]);
      else if(scenario.phase===3){ lane=0; rune=true; }
      else if(scenario.phase===4) lane=slot<2?1:0;
      else lane=0;
      break;
    case 5:
      if(scenario.phase<=2){ lane=slot===0?1:2; passive=scenario.phase===2; }
      else if(scenario.phase<=4 || scenario.phase===6) lane=0;
      else jungle=true;
      break;
    case 6:
      if(scenario.phase<=2) lane=slot===2 ? (Math.floor(scenario.elapsed/18)%3) : (slot===0?1:slot===1?2:0);
      else if(scenario.phase===3) lane=slot===0?2:slot===1?1:0;
      else if(scenario.phase===4) lane=units
        .filter(unit => unit.type==='tower' && unit.team!==hero.team && !unit.dead)
        .sort((left,right)=>left.hp/left.maxHp-right.hp/right.maxHp)[0]?.lane ?? 0;
      else lane=0;
      break;
  }
  return {lane,jungle,passive,rune,scenario};
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
  const lane = gameTime >= MID_PUSH_TIME && h.midPushAssignment ? 0 : (Number.isInteger(h.assignedLane) ? h.assignedLane : 0);
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
  const botTarget = h.attackTarget && !h.attackTarget.dead && h.attackTarget.team !== h.team ? h.attackTarget : null;
  const botTargetDistance = botTarget ? Math.hypot(botTarget.x-h.x,botTarget.y-h.y) : Infinity;
  for(const itemId of ['aghanimHead','munition']){
    const itemIndex = h.inventory.findIndex(item => item && item.id === itemId);
    if(itemIndex >= 0 && h.inventory[itemIndex].cooldown <= 0 && botTarget &&
       botTargetDistance <= h.getAttackRange() + botTarget.radius + 100) useInventoryItem(h,itemIndex);
  }
  if(h.aiTimer > 0) return;
  h.aiTimer = 0.18;
  const scenarioDirective = botScenarioDirective(h);
  if(scenarioDirective){
    h.assignedLane = scenarioDirective.lane;
    h.midPushAssignment = scenarioDirective.lane === 0;
  }

  const base = spawnRoomCenter(h.team);
  const hpPct = h.hp / h.maxHp;
  const nearBase = inSpawnRoom(h.x, h.y, h.team, 60);

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
     !inSpawnRoom(h.x, h.y, h.team, -40)){
    h.moveTarget = {x:base.x + rnd(-60,60), y:base.y + rnd(-60,60)};
    h.attackTarget = null;
    if(h.def.id==='pyro' && h.skills[2].level>0 && h.skills[2].cd<=0 && hpPct<0.2){
      castSkill(h, 2, base.x, base.y);
    }
    return;
  }
  if(h.def.id === 'juvsyut' && juvsyutBotThink(h, hpPct)) return;
  if(hpPct < 0.65 && h.def.id === 'warlord' && h.skills[1].level > 0 && h.skills[1].cd <= 0){
    castSkill(h, 1, h.x, h.y);
  }

  const farmPhaseEnemy = gameTime < BOT_FARM_PHASE_TIME
    ? heroes.filter(unit => unit.type === 'hero' && unit.team !== h.team && !unit.dead &&
        Math.hypot(unit.x-h.x,unit.y-h.y) <= h.vision)
      .sort((left,right)=>Math.hypot(left.x-h.x,left.y-h.y)-Math.hypot(right.x-h.x,right.y-h.y))[0]
    : null;
  if(!scenarioDirective && gameTime < BOT_FARM_PHASE_TIME && !farmPhaseEnemy){
    const farmLane = Number.isInteger(h.assignedLane) ? h.assignedLane : 0;
    const laneCreep = units
      .filter(unit => unit.type === 'creep' && unit.team !== h.team && !unit.dead &&
        laneDistanceToPoint(unit.x,unit.y,farmLane) < 190 && Math.hypot(unit.x-h.x,unit.y-h.y) <= h.vision)
      .sort((left,right)=>Math.hypot(left.x-h.x,left.y-h.y)-Math.hypot(right.x-h.x,right.y-h.y))[0];
    if(laneCreep){
      h.laneState = 'lane';
      h.attackTarget = laneCreep;
      h.moveTarget = null;
      return;
    }
    if(updateBotFarm(h)) return;
    h.attackTarget = null;
    h.laneState = 'lane';
    const path = LANES[farmLane] || LANES[0];
    const farmingWaypoint = path[h.team === 0 ? Math.min(1,path.length-1) : Math.max(0,path.length-2)];
    h.moveTarget = {x:farmingWaypoint.x+rnd(-70,70),y:farmingWaypoint.y+rnd(-70,70)};
    return;
  }
  if(scenarioDirective && scenarioDirective.passive){
    const defender = units.filter(unit => unit.type==='hero' && unit.team!==h.team && !unit.dead &&
      Math.hypot(unit.x-h.x,unit.y-h.y)<=h.vision)
      .sort((left,right)=>Math.hypot(left.x-h.x,left.y-h.y)-Math.hypot(right.x-h.x,right.y-h.y))[0];
    if(defender){ h.attackTarget=defender; h.moveTarget=null; return; }
    const creep = units.filter(unit => unit.type==='creep' && unit.team!==h.team && !unit.dead &&
      laneDistanceToPoint(unit.x,unit.y,scenarioDirective.lane)<220 && Math.hypot(unit.x-h.x,unit.y-h.y)<=h.vision)
      .sort((left,right)=>Math.hypot(left.x-h.x,left.y-h.y)-Math.hypot(right.x-h.x,right.y-h.y))[0];
    if(creep){ h.laneState='lane'; h.attackTarget=creep; h.moveTarget=null; return; }
    if(updateBotFarm(h)) return;
    h.attackTarget=null;
    const safePath=LANES[scenarioDirective.lane]||LANES[0];
    const safePoint=safePath[h.team===0?Math.min(1,safePath.length-1):Math.max(0,safePath.length-2)];
    h.moveTarget={x:safePoint.x,y:safePoint.y};
    return;
  }
  if(scenarioDirective && scenarioDirective.rune && runes.length){
    const rune=runes.slice().sort((left,right)=>Math.hypot(left.x-h.x,left.y-h.y)-Math.hypot(right.x-h.x,right.y-h.y))[0];
    if(Math.hypot(rune.x-h.x,rune.y-h.y)>48){ h.attackTarget=null; h.moveTarget={x:rune.x,y:rune.y}; return; }
  }
  if(scenarioDirective && scenarioDirective.jungle && !farmPhaseEnemy && updateBotFarm(h)) return;

  const strategicLane = scenarioDirective ? scenarioDirective.lane :
    (gameTime >= MID_PUSH_TIME && h.midPushAssignment ? 0 : (Number.isInteger(h.assignedLane) ? h.assignedLane : 0));
  if(!scenarioDirective && gameTime >= MID_PUSH_TIME && h.midPushAssignment) h.assignedLane = 0;
  const laneEnemy = units
    .filter(unit => unit.team !== h.team && unit.team !== 2 && !unit.dead &&
      isUnitOnBotLane(unit, strategicLane) && Math.hypot(unit.x-h.x,unit.y-h.y) <= h.vision)
    .sort((left,right) => (right.type === 'hero') - (left.type === 'hero'))[0];
  /* В первые 5 минут бот может помочь соседней линии, если там уже
     началась драка рядом с союзником, а не продолжать слепо идти по своей. */
  const nearbyFight = (gameTime < MID_PUSH_TIME || h.midPushAssignment) ? units
    .filter(unit => unit.type === 'hero' && unit.team !== h.team && !unit.dead &&
      Math.hypot(unit.x-h.x,unit.y-h.y) <= Math.min(820,h.vision))
    .filter(unit => units.some(ally =>
      ally.type === 'hero' && ally.team === h.team && !ally.dead &&
      ally !== h && Math.hypot(ally.x-unit.x,ally.y-unit.y) < 520
    ))
    .sort((left,right) => Math.hypot(left.x-h.x,left.y-h.y) - Math.hypot(right.x-h.x,right.y-h.y))[0] : null;
  const visibleEnemy = farmPhaseEnemy || nearbyFight || laneEnemy;
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
  } else if(gameTime >= MID_PUSH_TIME && h.midPushAssignment){
    h.laneState = 'mid-push';
  }

  const structureTarget = getBotStructureObjective(h, strategicLane);
  const urgentFight = farmPhaseEnemy || (nearbyFight &&
    Math.hypot(nearbyFight.x-h.x, nearbyFight.y-h.y) <= 760
      ? nearbyFight : null);
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

  if(h.def.id === 'regina' || h.def.id === 'yosyp'){
    if(target){
      const d=Math.hypot(target.x-h.x,target.y-h.y);
      h.attackTarget=target; h.moveTarget=null;
      if(h.def.id==='regina'){
        if(h.skills[2] && h.skills[2].level>0 && h.skills[2].cd<=0 && d<420) castSkill(h,2,h.x,h.y);
        else if(h.skills[1] && h.skills[1].level>0 && h.skills[1].cd<=0 && d<760) castSkill(h,1,target.x,target.y);
        else if(h.skills[0] && h.skills[0].cd<=0 && d<620) castSkill(h,0,target.x,target.y);
      } else {
        if(h.skills[2] && h.skills[2].level>0 && h.skills[2].cd<=0 && target.type==='hero' && d<1050) castSkill(h,2,target.x,target.y);
        else if(h.skills[1] && h.skills[1].level>0 && h.skills[1].cd<=0 && d<700) castSkill(h,1,h.x,h.y);
      }
    } else {
      h.attackTarget=null;
      const goal=botLaneObjective(h);
      h.moveTarget={x:goal.x+rnd(-100,100),y:goal.y+rnd(-100,100)};
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
      if(isHero && h.def.id!=='juvsyut' && h.skills[3] && h.skills[3].level>0 && h.skills[3].cd<=0 && d<400)
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
  /* Подготовка к бою: мир живёт полностью (герои ходят по всей карте, бои возможны),
     но игровое время, волны крипов, доход и сценарии ботов ждут конца отсчёта. */
  const pre = prematchTime > 0;
  if(pre) updatePrematch(dt);
  else gameTime += dt;
  if(!pre) updateBotScenarios(dt);
  updateBotChatReplies();
  if(killStreakBanner.t > 0) killStreakBanner.t = Math.max(0, killStreakBanner.t - dt);
  if(rampageBanner.t > 0) rampageBanner.t = Math.max(0, rampageBanner.t - dt);
  if(gameTime > 0 && Math.floor(gameTime/120) !== Math.floor((gameTime-dt)/120)) spawnRunes();
  updateRunes(dt);

  if(!pre) for(const hero of heroes){
    hero.coinTimer += dt;
    while(hero.coinTimer >= 1){ hero.coinTimer -= 1; hero.coins += gameModeCfg().coinsPerSec; }
  }
  if(testMode && playerHero){ playerHero.coins = 99999; playerHero.coinTimer = 0; }

  if(!pre){
    waveTimer -= dt;
    if(waveTimer <= 0){ waveTimer = WAVE_INTERVAL; if(!testMode) spawnWave(); }
  }

  if(touchControlsEnabled && touchJoystick.id!==null && playerHero && !playerHero.dead){
    const length=Math.hypot(touchJoystick.dx,touchJoystick.dy);
    if(length>0.12){
      playerHero.attackTarget=null;
      playerHero.moveTarget={
        x:clamp(playerHero.x+touchJoystick.dx/length*420,60,WORLD-60),
        y:clamp(playerHero.y+touchJoystick.dy/length*420,60,WORLD-60)
      };
    }
  }

  for(const h of heroes){
    if(h.dead){ h.update(dt); continue; }
    if(h !== playerHero && !h.isDummy && (!h.isOnlineRemote || h.isOnlineBot)){
      if(pre) updatePrematchBotAI(h, dt); else updateEnemyAI(h, dt);
    }
    h.update(dt);
  }
  updateBaseRooms(dt);
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
      if(p.incendiary){
        const skillLevel=(attackOwner && attackOwner.skills.find(skill=>skill.id==='tribuIncendiary')?.level)||1;
        const scepter=!!(scepterOwner && hasScepter(scepterOwner));
        igniteUnit(p.target,attackOwner,(scepter?7:5)+skillLevel-1,(scepter?35:25)+(skillLevel-1)*6);
      }
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
     /* Дожигание Молотова Аркадия: после выхода из огня цель ещё 10 секунд
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
          igniteUnit(u, a.source || {team:a.team}, 10, 25);
        }
      }
      a.insideSet = currentlyInside;
      if(a.t > a.delay + a.life){
        for(const u of a.insideSet){
          if(!u.dead) igniteUnit(u, a.source || {team:a.team}, 10, 25);
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
  visibleUnitCache = new WeakSet();
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
  for(const unit of units){
    if(unit.team===0 || unit.dead) continue;
    const gx=clamp(Math.floor(unit.x/CELL),0,GRID-1);
    const gy=clamp(Math.floor(unit.y/CELL),0,GRID-1);
    if(visGrid[gy*GRID+gx]) visibleUnitCache.add(unit);
  }
  for(let i=0;i<visGrid.length;i++) if(visGrid[i]) explored[i] = 1;
}

function isVisibleToPlayer(u){
  if(u.invisible && u.team !== 0) return false;
  if(u.team===0) return true;
  if(u.type==='hero' && u.hp/u.maxHp < 0.25 && heroes.some(hero => hero.team===0 && !hero.dead && hero.def.id==='sasych')) return true;
  return visibleUnitCache.has(u);
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

function touchPoint(touch){
  const rect=canvas.getBoundingClientRect();
  return {x:touch.clientX-rect.left,y:touch.clientY-rect.top};
}
function dispatchTouchMouse(type,touch,button=0){
  canvas.dispatchEvent(new MouseEvent(type,{
    bubbles:true,cancelable:true,button,clientX:touch.clientX,clientY:touch.clientY
  }));
}
function touchJoystickAnchor(){ return {x:86,y:VH-132}; }
function updateTouchJoystick(point){
  const center=touchJoystickAnchor(), radius=66;
  let dx=(point.x-center.x)/radius, dy=(point.y-center.y)/radius;
  const length=Math.hypot(dx,dy);
  if(length>1){ dx/=length; dy/=length; }
  touchJoystick.dx=dx;
  touchJoystick.dy=dy;
}
canvas.addEventListener('touchstart',e=>{
  if(!touchControlsEnabled) return;
  e.preventDefault();
  for(const touch of e.changedTouches){
    const point=touchPoint(touch);
    if(gameState==='playing' && touchJoystick.id===null){
      const anchor=touchJoystickAnchor();
      if(Math.hypot(point.x-anchor.x,point.y-anchor.y)<94){
        touchJoystick.id=touch.identifier;
        updateTouchJoystick(point);
        continue;
      }
    }
    if(gameState==='menu' && changelogOpen){
      const panel={x:Math.max(18,VW/2-360),y:Math.max(22,VH/2-280),w:Math.min(720,VW-36),h:Math.min(560,VH-44)};
      const insideList=point.x>=panel.x+24 && point.x<=panel.x+panel.w-24 &&
        point.y>=panel.y+78 && point.y<=panel.y+panel.h-64;
      if(insideList){
        activeTouches.set(touch.identifier,{type:'scroll',lastY:point.y});
        continue;
      }
    }
    activeTouches.set(touch.identifier,{type:'pointer'});
    dispatchTouchMouse('mousemove',touch);
    dispatchTouchMouse('mousedown',touch);
  }
},{passive:false});
canvas.addEventListener('touchmove',e=>{
  if(!touchControlsEnabled) return;
  e.preventDefault();
  for(const touch of e.changedTouches){
    const point=touchPoint(touch);
    if(touch.identifier===touchJoystick.id){
      updateTouchJoystick(point);
      continue;
    }
    const state=activeTouches.get(touch.identifier);
    if(state && state.type==='scroll' && gameState==='menu' && changelogOpen){
      const panel={x:Math.max(18,VW/2-360),y:Math.max(22,VH/2-280),w:Math.min(720,VW-36),h:Math.min(560,VH-44)};
      const viewportHeight=panel.h-142;
      changelogScroll=clamp(changelogScroll+state.lastY-point.y,0,Math.max(0,changelogContentHeight()-viewportHeight));
      state.lastY=point.y;
    } else if(state && state.type==='pointer'){
      dispatchTouchMouse('mousemove',touch);
    }
  }
},{passive:false});
function endTouchInput(e){
  if(!touchControlsEnabled) return;
  e.preventDefault();
  for(const touch of e.changedTouches){
    if(touch.identifier===touchJoystick.id){
      touchJoystick.id=null;
      touchJoystick.dx=0;
      touchJoystick.dy=0;
      if(playerHero && !playerHero.attackTarget) playerHero.moveTarget=null;
    }
    const state=activeTouches.get(touch.identifier);
    if(state && state.type==='pointer') dispatchTouchMouse('mouseup',touch);
    activeTouches.delete(touch.identifier);
  }
}
canvas.addEventListener('touchend',endTouchInput,{passive:false});
canvas.addEventListener('touchcancel',endTouchInput,{passive:false});

canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = e.clientX - r.left;
  mouse.y = e.clientY - r.top;
  if(heroView.drag) heroViewPointerMove(mouse.x,mouse.y);
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
  updateMenuButtonHoverSound();
  const edge=42;
  edgePan.x = mouse.x < edge ? -1 : (mouse.x > VW-edge ? 1 : 0);
  edgePan.y = mouse.y < edge ? -1 : (mouse.y > VH-edge ? 1 : 0);
});

canvas.addEventListener('wheel', e => {
  if(heroViewWheel(e)){ e.preventDefault(); return; }
  if(gameState === 'menu' && changelogOpen){
    const panel={x:Math.max(18,VW/2-360),y:Math.max(22,VH/2-280),w:Math.min(720,VW-36),h:Math.min(560,VH-44)};
    if(e.clientX>=panel.x && e.clientX<=panel.x+panel.w && e.clientY>=panel.y+68 && e.clientY<=panel.y+panel.h-54){
      const contentHeight=changelogContentHeight(), viewportHeight=panel.h-142;
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

window.addEventListener('mouseup', heroViewPointerUp);
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

  if(gameState === 'menu' && e.button === 0 && heroViewPointerDown(mx, my)){ e.preventDefault(); return; }
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
      if(item){ playerHero.coins += Math.floor((SHOP_ITEMS[item.id]?.cost || 0)*0.5); playerHero.inventory[pendingSellIndex]=null; const soldHp=SHOP_ITEMS[item.id]?.hp; if(soldHp){ playerHero.maxHp=Math.max(1,playerHero.maxHp-soldHp); playerHero.hp=Math.min(playerHero.hp,playerHero.maxHp); } }
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
        draggedInventoryIndex=i;
        if(item.active && e.shiftKey){
          addText(playerHero.x, playerHero.y - 58,
            'НАЖМИТЕ ' + inventoryBinds[i].toUpperCase() + ' ДЛЯ ИСПОЛЬЗОВАНИЯ',
            item.color || '#b9c7d8', 0.9, 13);
        } else if(!item.active){
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
    if(tgt && tgt.isIllusion && tgt.owner===playerHero){
      if(controlledUnit && controlledUnit.isIllusion) controlledUnit.playerControlled=false;
      controlledUnit=tgt;
      tgt.playerControlled=true;
      addText(tgt.x,tgt.y-52,'ИЛЛЮЗИЯ ПОД КОНТРОЛЕМ','#e8d4ff',0.9,13);
      return;
    }
    if(tgt===playerHero && controlledUnit && controlledUnit.isIllusion){
      controlledUnit.playerControlled=false;
      controlledUnit=playerHero;
      return;
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
      } else if(typeof window.__shadowOnlineAttackTarget === 'function'){
        window.__shadowOnlineAttackTarget(tgt);
      }
    } else if(tgt && !tgt.dead){
      inspectUnit = tgt;
    } else {
      control.attackTarget = null;
      control.moveTarget = {x:w.x, y:w.y};
      if(typeof window.__shadowOnlineClearTarget === 'function') window.__shadowOnlineClearTarget();
      fxRing(w.x, w.y, 26, '#7fffa0', 0.35);
    }
  }
});
canvas.addEventListener('mouseup', e => {
  heroViewPointerUp();
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
  if(gameState === 'menu' && menuStage === 'draft' && draftPlayerIndex >= 0 && !settingsOpen && (e.code === 'Enter' || e.code === 'NumpadEnter')){
    finishDraft();
    e.preventDefault();
    return;
  }
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
  const skillKey = PHYSICAL_KEY_LETTER[code] || key;
  const skillKeyConflict = ['q','w','e','r','f','g'].includes(skillKey);
  if(skillKeyConflict) itemSlot = -1;
  if(itemSlot >= 0){
    useInventoryItem(playerHero, itemSlot);
    e.preventDefault();
    return;
  }

  const physicalSkillKey=PHYSICAL_KEY_LETTER[code] || key;
  const skillShort={q:'Q',й:'Q',w:'W',ц:'W',e:'E',у:'E',r:'R',к:'R',f:'F',а:'F',g:'G',п:'G'}[physicalSkillKey];
  const slot=skillShort ? playerHero.skills.findIndex(skill=>skill.def.short===skillShort) : -1;

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
  let best=null, bestDistance=70;
  for(const unit of units){
    if(unit.dead || (unit.team!==0 && !isVisibleToPlayer(unit))) continue;
    const distance=Math.hypot(unit.x-x,unit.y-y)-unit.radius;
    if(distance<bestDistance){ bestDistance=distance; best=unit; }
  }
  return best;
}

function edgeHash(a,b){
  const value=Math.sin(a*127.1+b*311.7)*43758.5453;
  return value-Math.floor(value);
}

function drawRoadEdgeFringe(lane,laneIndex){
  ctx.save();
  for(let segment=1;segment<lane.length;segment++){
    const start=lane[segment-1], end=lane[segment];
    const dx=end.x-start.x, dy=end.y-start.y;
    const length=Math.hypot(dx,dy)||1;
    const nx=-dy/length, ny=dx/length;
    const marks=Math.ceil(length/54);
    for(let index=0;index<=marks;index++){
      const t=index/marks;
      const centerX=start.x+dx*t, centerY=start.y+dy*t;
      for(const side of [-1,1]){
        const hash=edgeHash(segment*97+index,laneIndex*11+side);
        const x=centerX+nx*side*(78+hash*28);
        const y=centerY+ny*side*(78+hash*28);
        const darkSide=x>y;
        ctx.globalAlpha=0.28+hash*0.32;
        if(hash>0.48){
          ctx.fillStyle=darkSide?(hash>0.76?'rgba(30,48,36,0.7)':'rgba(40,62,46,0.62)'):(hash>0.76?'rgba(90,120,50,0.6)':'rgba(106,132,58,0.54)');
          ctx.beginPath(); ctx.ellipse(x,y,3+hash*5,2+hash*3,Math.atan2(dy,dx),0,Math.PI*2); ctx.fill();
        } else {
          ctx.fillStyle=(darkSide?darkPathTexturePattern:pathTexturePattern)||'rgba(138,119,79,0.7)';
          ctx.beginPath(); ctx.ellipse(x,y,5+hash*8,3+hash*5,Math.atan2(dy,dx),0,Math.PI*2); ctx.fill();
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
  ctx.fillStyle = grassTexturePattern;
  ctx.fillRect(0,0,WORLD,WORLD);
  /* Земли Тьмы: чёрная трава с красными цветами и тёмными камнями. */
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(WORLD,0); ctx.lineTo(WORLD,WORLD); ctx.closePath(); ctx.clip();
  ctx.fillStyle = darkGrassTexturePattern;
  ctx.fillRect(0,0,WORLD,WORLD);
  ctx.restore();

  // Светлая и тёмная половины карты получают разные оттенки.
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,0.08)';
  ctx.beginPath();
  ctx.moveTo(0,0); ctx.lineTo(WORLD,0); ctx.lineTo(WORLD,WORLD); ctx.closePath();
  ctx.fill();
  ctx.fillStyle='rgba(58,150,92,0.04)';
  ctx.beginPath();
  ctx.moveTo(0,0); ctx.lineTo(0,WORLD); ctx.lineTo(WORLD,WORLD); ctx.closePath();
  ctx.fill();
  ctx.restore();

  /* Мягкая сетка и крупные пятна рельефа делают пустые поля живее. */
  ctx.save();
  ctx.strokeStyle='rgba(164,211,157,0.02)';
  ctx.lineWidth=2;
  for(let x=0;x<=WORLD;x+=220){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,WORLD); ctx.stroke(); }
  for(let y=0;y<=WORLD;y+=220){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(WORLD,y); ctx.stroke(); }
  ctx.restore();

  ctx.fillStyle = 'rgba(35,60,25,0.14)';
  for(let x=0; x<WORLD; x+=220){
    for(let y=0; y<WORLD; y+=220){
      const s = ((x*13 + y*7) % 90) + 60;
      ctx.beginPath();
      ctx.arc(x + ((x*31+y*17)%160), y + ((y*7+y*41)%160), s, 0, Math.PI*2);
      ctx.fill();
    }
  }

  drawTerrainDecor();

  ctx.save();
  /* Песчаное дно лежит под полупрозрачной водой, поэтому через неё видно берег. */
  ctx.strokeStyle = 'rgba(26,34,30,0.34)';
  ctx.lineWidth = 494; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(90, 90); ctx.lineTo(WORLD-90, WORLD-90); ctx.stroke();
  ctx.strokeStyle = sandTexturePattern || '#b79a61';
  ctx.lineWidth = 470; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(90, 90); ctx.lineTo(WORLD-90, WORLD-90); ctx.stroke();
  /* Светлая кромка отделяет песчаный берег от прозрачной воды. */
  ctx.strokeStyle = 'rgba(203,229,191,0.28)';
  ctx.lineWidth = 378; ctx.stroke();
  /* Сама вода остаётся прозрачной — песчаное дно и берег видны сквозь неё. */
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
    ctx.strokeStyle = 'rgba(20,15,8,0.08)';
    ctx.lineWidth = 132; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,235,190,0.10)';
    ctx.lineWidth = 96; ctx.stroke();
    /* Мягкая протоптанная колея по центру. */
    ctx.strokeStyle = 'rgba(60,46,28,0.35)';
    ctx.lineWidth = 40; ctx.stroke();
    ctx.restore();

    /* На землях Тьмы дорога из чёрного базальта с тлеющими искрами. */
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(WORLD,0); ctx.lineTo(WORLD,WORLD); ctx.closePath(); ctx.clip();
    ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(lane[0].x, lane[0].y);
    for(let i=1;i<lane.length;i++) ctx.lineTo(lane[i].x, lane[i].y);
    ctx.strokeStyle='rgba(0,0,0,0.35)'; ctx.lineWidth=196; ctx.stroke();
    ctx.strokeStyle='#1b1517'; ctx.lineWidth=158; ctx.stroke();
    ctx.strokeStyle=darkPathTexturePattern||'#3a3335'; ctx.lineWidth=132; ctx.stroke();
    ctx.strokeStyle='rgba(255,70,50,0.05)'; ctx.lineWidth=40; ctx.stroke();
    ctx.restore();

    drawRoadEdgeFringe(lane, laneIndex);

    ctx.save();
    for(let segment=1;segment<lane.length;segment++){
      const start=lane[segment-1], end=lane[segment];
      const dx=end.x-start.x, dy=end.y-start.y, length=Math.hypot(dx,dy)||1;
      const angle=Math.atan2(dy,dx), nx=-dy/length, ny=dx/length;
      const steps=Math.floor(length/112);
      for(let step=1;step<steps;step++){
        const t=step/steps, cx=start.x+dx*t, cy=start.y+dy*t;
        for(let row=-1;row<=1;row++){
          const hash=edgeHash(step+segment*71,row+laneIndex*9);
          const px=cx+nx*row*38, py=cy+ny*row*38;
          ctx.save(); ctx.translate(px,py); ctx.rotate(angle);
          ctx.fillStyle=hash>.52?'rgba(190,166,118,0.20)':'rgba(31,27,20,0.19)';
          ctx.fillRect(-39,-10,78,20);
          ctx.strokeStyle='rgba(22,19,15,0.24)'; ctx.lineWidth=2;
          ctx.strokeRect(-39,-10,78,20);
          ctx.restore();
        }
      }
    }
    ctx.restore();

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
    ctx.fillStyle='rgba(3,8,7,0.34)';
    ctx.beginPath(); ctx.ellipse(9,34,29,10,-0.18,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(205,230,166,0.10)';
    ctx.beginPath(); ctx.ellipse(-8,25,15,4,-0.18,0,Math.PI*2); ctx.fill();
    if(tree.kind==='dire' || tree.kind==='radiant'){
      drawDireTree(tree,tree.kind==='radiant');
    } else if(tree.kind==='pine'){
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

  drawBaseComplexes();

  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 20;
  ctx.strokeRect(0,0,WORLD,WORLD);
}

function getWeaponConfig(unit){
  if(unit.def && unit.def.id==='regina' && unit.skinId==='reginaRed')
    return {...unit.def.weapon,color:'#ff344f'};
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
  if(unit.def && unit.def.id === 'yosyp') return;
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
function drawNeutralCreepBody(u, col){
  const scale=Math.max(0.72,u.radius/18);
  const palette=u.kind==='wolf'?['#b9c8d1','#637681']:
    u.kind==='satyr'?['#c7824f','#69402d']:
    u.kind==='big'?['#9a8765','#4f5148']:['#83aa61','#3f633d'];
  ctx.save();
  ctx.scale(scale,scale);
  ctx.rotate(u.facing||0);
  ctx.fillStyle='rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0,16,18,6,0,0,Math.PI*2); ctx.fill();
  if(u.kind==='wolf'){
    ctx.fillStyle=palette[1];
    ctx.beginPath(); ctx.ellipse(-2,2,17,9,-0.12,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(12,-3,9,7,-0.25,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(15,-8); ctx.lineTo(13,-17); ctx.lineTo(21,-10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(19,-2); ctx.lineTo(29,1); ctx.lineTo(19,4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=palette[1]; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(-12,6); ctx.lineTo(-17,15); ctx.moveTo(-3,7); ctx.lineTo(-5,16);
    ctx.moveTo(8,6); ctx.lineTo(7,15); ctx.stroke();
    ctx.fillStyle='#ffdc82'; ctx.beginPath(); ctx.arc(15,-5,1.7,0,Math.PI*2); ctx.fill();
  } else {
    const body=ctx.createLinearGradient(-14,-16,14,18);
    body.addColorStop(0,palette[0]); body.addColorStop(1,palette[1]); ctx.fillStyle=body;
    ctx.beginPath();
    if(u.kind==='big'){
      ctx.moveTo(-15,13); ctx.lineTo(-13,-8); ctx.lineTo(-7,-17); ctx.lineTo(0,-12);
      ctx.lineTo(8,-19); ctx.lineTo(15,-7); ctx.lineTo(14,13); ctx.closePath();
    } else {
      ctx.moveTo(-13,12); ctx.lineTo(-15,-2); ctx.lineTo(-9,-14); ctx.lineTo(8,-15);
      ctx.lineTo(15,-4); ctx.lineTo(12,13); ctx.closePath();
    }
    ctx.fill(); ctx.strokeStyle='rgba(25,23,18,0.75)'; ctx.lineWidth=2; ctx.stroke();
    ctx.strokeStyle=palette[1]; ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(-10,9); ctx.lineTo(-15,17); ctx.moveTo(9,9); ctx.lineTo(14,17); ctx.stroke();
    if(u.kind==='satyr'){
      ctx.strokeStyle='#e6bd79'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(-7,-13); ctx.lineTo(-13,-20); ctx.lineTo(-15,-16);
      ctx.moveTo(7,-13); ctx.lineTo(13,-20); ctx.lineTo(15,-16); ctx.stroke();
    }
    ctx.fillStyle='#f4e6b5'; ctx.beginPath(); ctx.arc(-5,-5,1.8,0,Math.PI*2); ctx.arc(5,-5,1.8,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(18,18,16,0.72)'; ctx.fillRect(-8,1,16,3);
  }
  ctx.restore();
  ctx.strokeStyle=col; ctx.globalAlpha=0.68; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,0,u.radius+3,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1;
}

/* =========================================================
   Модели башен и трона в стиле Dota 2:
   Силы Света — светлый камень с голубым свечением и сакура,
   Силы Тьмы — чёрный шипастый камень с красными прожилками и огнём.
   ========================================================= */
function structurePoly(points, fill, stroke, lw){
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for(let i=1;i<points.length;i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  if(fill){ ctx.fillStyle = fill; ctx.fill(); }
  if(stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1.5; ctx.lineJoin = 'round'; ctx.stroke(); }
}

function drawLightTowerModel(r, t){
  const s = r / 20;
  ctx.save();
  ctx.scale(s, s);
  const pulse = 0.65 + 0.35 * Math.sin(t * 2.2);
  /* каменное основание-диск с водой */
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 12, 26, 10, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#b8ab8c'; ctx.strokeStyle = '#6f654f'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 10, 24, 9, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#9fe6f5'; ctx.globalAlpha = 0.55 + 0.25 * pulse;
  ctx.beginPath(); ctx.ellipse(0, 10, 15, 5.5, 0, 0, Math.PI*2); ctx.fill(); ctx.globalAlpha = 1;
  /* корпус-обелиск */
  const body = ctx.createLinearGradient(-14, 0, 14, 0);
  body.addColorStop(0, '#cfc4a6'); body.addColorStop(0.5, '#efe6cf'); body.addColorStop(1, '#a79b7d');
  structurePoly([[-12,10],[-14,-8],[-10,-24],[-3,-34],[8,-31],[14,-20],[13,-4],[11,10]], body, '#6f654f', 1.6);
  /* голова-«птичий клюв» */
  structurePoly([[-10,-24],[-3,-34],[8,-31],[16,-27],[8,-24],[-1,-22]], '#f6efdc', '#6f654f', 1.4);
  /* голубое свечение в трещинах */
  ctx.save();
  ctx.shadowColor = '#7fe3ff'; ctx.shadowBlur = 8 * pulse;
  ctx.fillStyle = 'rgba(130,225,255,' + (0.75 + 0.2 * pulse) + ')';
  structurePoly([[-9,-20],[-1,-24],[3,-21],[-4,-17]], ctx.fillStyle, null);
  structurePoly([[-10,-9],[2,-13],[8,-9],[-1,-4]], ctx.fillStyle, null);
  structurePoly([[-8,2],[1,-1],[6,3],[-2,7]], ctx.fillStyle, null);
  structurePoly([[4,-29],[8,-28],[6,-25]], ctx.fillStyle, null);
  ctx.restore();
  /* золотая кромка */
  ctx.strokeStyle = 'rgba(224,178,70,0.85)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-13, 8); ctx.lineTo(-14, -8); ctx.stroke();
  ctx.restore();
}

function drawDarkTowerModel(r, t){
  const s = r / 20;
  ctx.save();
  ctx.scale(s, s);
  const pulse = 0.6 + 0.4 * Math.sin(t * 3.1 + 1);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, 12, 27, 10, 0, 0, Math.PI*2); ctx.fill();
  /* груда камней в основании */
  structurePoly([[-24,12],[-17,2],[-9,6],[-2,-2],[8,5],[17,0],[25,12],[10,17],[-12,17]], '#2b2e33', '#0d0f12', 1.6);
  structurePoly([[-17,2],[-9,6],[-12,12],[-22,11]], '#3a3e44', null);
  /* корпус из чёрных блоков */
  structurePoly([[-11,6],[-13,-8],[-9,-20],[-12,-26],[-4,-30],[0,-36],[6,-30],[13,-24],[10,-12],[12,6]], '#23262b', '#0d0f12', 1.8);
  structurePoly([[-13,-8],[-9,-20],[-5,-15],[-8,-3]], '#32363c', null);
  structurePoly([[3,-27],[10,-14],[8,4],[2,2]], '#181a1e', null);
  /* «шляпа» башни */
  structurePoly([[-16,-24],[-6,-30],[-2,-38],[6,-37],[10,-31],[18,-26],[8,-22],[-8,-22]], '#1b1d21', '#0d0f12', 1.6);
  /* красные прожилки */
  ctx.save();
  ctx.shadowColor = '#ff3b2b'; ctx.shadowBlur = 8 * pulse;
  ctx.strokeStyle = 'rgba(255,70,50,' + (0.7 + 0.3 * pulse) + ')'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-11,-14); ctx.lineTo(-3,-9); ctx.lineTo(4,-12); ctx.lineTo(11,-6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9,-2); ctx.lineTo(0,2); ctx.lineTo(8,-1); ctx.stroke();
  ctx.restore();
  /* огненное око под шляпой */
  ctx.save();
  ctx.shadowColor = '#ff8a3d'; ctx.shadowBlur = 12 * pulse;
  ctx.fillStyle = 'rgba(255,150,60,' + (0.8 + 0.2 * pulse) + ')';
  ctx.beginPath(); ctx.ellipse(-3, -23, 4.5, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#fff1c0'; ctx.beginPath(); ctx.ellipse(-3, -23, 1.8, 1.2, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawLightAncientModel(r, t){
  const s = r / 46;
  ctx.save();
  ctx.scale(s, s);
  const pulse = 0.65 + 0.35 * Math.sin(t * 1.8);
  /* каменная площадка */
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 20, 62, 24, 0, 0, Math.PI*2); ctx.fill();
  const plates = [[-54,18,-34,2,-8,10,-14,22],[8,10,38,0,56,16,34,26],[-30,24,-4,12,26,24,6,34]];
  structurePoly([[-56,14],[-38,-2],[-6,-8],[30,-4],[56,12],[40,28],[0,34],[-38,30]], '#8d8672', '#4f4a3b', 2);
  structurePoly([[-44,12],[-24,2],[0,-2],[24,2],[44,12],[22,24],[-20,24]], '#a49d86', null);
  /* сияющий голубой портал в центре */
  const portal = ctx.createRadialGradient(0, 6, 2, 0, 6, 34);
  portal.addColorStop(0, 'rgba(235,252,255,' + (0.95) + ')');
  portal.addColorStop(0.4, 'rgba(120,220,255,' + (0.7 * pulse + 0.2) + ')');
  portal.addColorStop(1, 'rgba(60,160,230,0)');
  ctx.fillStyle = portal; ctx.beginPath(); ctx.ellipse(0, 6, 36, 20, 0, 0, Math.PI*2); ctx.fill();
  /* световой столб */
  const beam = ctx.createLinearGradient(0, -90, 0, 6);
  beam.addColorStop(0, 'rgba(150,225,255,0)'); beam.addColorStop(1, 'rgba(150,225,255,' + (0.35 * pulse + 0.15) + ')');
  ctx.fillStyle = beam; ctx.fillRect(-14, -90, 28, 96);
  /* ствол дерева сакуры */
  structurePoly([[-14,18],[-10,-6],[-18,-22],[-8,-16],[-2,-34],[4,-16],[14,-24],[8,-4],[16,18],[0,12]], '#5a4332', '#2e2118', 2);
  /* кристаллы */
  ctx.save(); ctx.shadowColor = '#8be9fd'; ctx.shadowBlur = 10 * pulse;
  structurePoly([[-46,6],[-42,-30],[-34,-4]], '#bfeeff', '#4aa8c9', 1.4);
  structurePoly([[-30,-2],[-26,-40],[-20,-8]], '#9fe3ff', '#4aa8c9', 1.4);
  structurePoly([[34,0],[40,-32],[46,2]], '#bfeeff', '#4aa8c9', 1.4);
  ctx.restore();
  /* белые каменные глыбы */
  structurePoly([[-30,-6],[-18,-26],[-4,-22],[-6,-4]], '#e9dfc8', '#8a7f66', 1.6);
  structurePoly([[8,-8],[16,-30],[30,-24],[32,-6]], '#e9dfc8', '#8a7f66', 1.6);
  structurePoly([[-16,12],[-4,-2],[10,2],[12,16]], '#cfc3a6', '#8a7f66', 1.6);
  /* розовая крона */
  const blossoms = [[-34,-14,13],[-18,-30,15],[0,-38,16],[18,-30,15],[34,-14,13],[-8,-18,12],[12,-14,12],[-26,0,10],[28,2,10],[0,-24,12]];
  blossoms.forEach((b, i) => {
    const sway = Math.sin(t * 1.2 + i) * 1.2;
    ctx.fillStyle = i % 2 ? '#f27fb3' : '#ff9fc9';
    ctx.beginPath(); ctx.arc(b[0] + sway, b[1], b[2], 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,225,238,0.55)';
    ctx.beginPath(); ctx.arc(b[0] + sway - b[2]*0.25, b[1] - b[2]*0.3, b[2]*0.45, 0, Math.PI*2); ctx.fill();
  });
  /* лепестки */
  ctx.fillStyle = 'rgba(255,170,205,0.85)';
  for(let i=0;i<6;i++){
    const ph = (t * 0.35 + i / 6) % 1;
    ctx.beginPath(); ctx.ellipse(-30 + i * 12 + Math.sin(ph * 6 + i) * 6, -20 + ph * 50, 2.4, 1.4, ph * 6, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawDarkAncientModel(r, t){
  const s = r / 46;
  ctx.save();
  ctx.scale(s, s);
  const pulse = 0.6 + 0.4 * Math.sin(t * 2.6);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(0, 20, 64, 25, 0, 0, Math.PI*2); ctx.fill();
  /* тёмная каменная плита */
  structurePoly([[-58,14],[-40,-4],[-6,-10],[32,-6],[58,12],[42,30],[0,36],[-40,32]], '#34373d', '#0d0f12', 2);
  structurePoly([[-44,14],[-22,2],[2,-2],[26,2],[46,14],[22,26],[-22,26]], '#2a2d32', null);
  /* раскалённое ядро */
  const core = ctx.createRadialGradient(0, 8, 2, 0, 8, 38);
  core.addColorStop(0, 'rgba(255,245,190,1)');
  core.addColorStop(0.3, 'rgba(255,150,50,' + (0.85 * pulse + 0.15) + ')');
  core.addColorStop(0.7, 'rgba(210,40,20,' + (0.55 * pulse + 0.15) + ')');
  core.addColorStop(1, 'rgba(120,10,10,0)');
  ctx.fillStyle = core; ctx.beginPath(); ctx.ellipse(0, 8, 42, 22, 0, 0, Math.PI*2); ctx.fill();
  /* языки пламени */
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for(let i=0;i<5;i++){
    const fx = -18 + i * 9, h = 18 + 10 * Math.sin(t * 5 + i * 1.7);
    const fg = ctx.createLinearGradient(0, 10, 0, 10 - h);
    fg.addColorStop(0, 'rgba(255,120,40,0.6)'); fg.addColorStop(1, 'rgba(255,60,20,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.moveTo(fx - 5, 10); ctx.quadraticCurveTo(fx, 10 - h * 0.6, fx + Math.sin(t * 4 + i) * 3, 10 - h); ctx.quadraticCurveTo(fx + 3, 10 - h * 0.4, fx + 5, 10); ctx.fill();
  }
  ctx.restore();
  /* шипастые башни-когти по кругу (сзади → спереди) */
  const spires = [
    {x:-34,y:-4,h:62,w:12},{x:34,y:-4,h:62,w:12},
    {x:-42,y:18,h:48,w:11},{x:42,y:18,h:48,w:11},
    {x:0,y:-8,h:70,w:12}
  ];
  spires.forEach((sp, i) => {
    const lean = sp.x === 0 ? 0 : (sp.x < 0 ? 5 : -5);
    structurePoly([[sp.x - sp.w, sp.y + 12],[sp.x - sp.w * 0.6, sp.y - sp.h * 0.45],[sp.x + lean, sp.y - sp.h],[sp.x + sp.w * 0.6, sp.y - sp.h * 0.45],[sp.x + sp.w, sp.y + 12]], '#1c1e22', '#07080a', 1.8);
    structurePoly([[sp.x - sp.w, sp.y + 12],[sp.x - sp.w * 0.6, sp.y - sp.h * 0.45],[sp.x + lean, sp.y - sp.h],[sp.x - 1, sp.y - sp.h * 0.2]], '#2d3036', null);
    /* красный отсвет изнутри */
    ctx.save(); ctx.shadowColor = '#ff3b2b'; ctx.shadowBlur = 8 * pulse;
    ctx.strokeStyle = 'rgba(255,80,50,' + (0.5 + 0.4 * pulse) + ')'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(sp.x, sp.y + 10); ctx.lineTo(sp.x + (sp.x < 0 ? 3 : -3), sp.y - sp.h * 0.5); ctx.stroke();
    ctx.restore();
  });
  /* искры */
  ctx.fillStyle = 'rgba(255,190,90,0.9)';
  for(let i=0;i<7;i++){
    const ph = (t * 0.6 + i / 7) % 1;
    ctx.beginPath(); ctx.arc(-20 + i * 7 + Math.sin(ph * 8 + i) * 4, 8 - ph * 60, 1.6 * (1 - ph) + 0.4, 0, Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

function drawStructureModel(u, col){
  const t = gameTime || performance.now() / 1000;
  const light = (u.team === 0) !== structuresSwapped;
  /* цветное кольцо у основания — чтобы команду было видно с первого взгляда */
  ctx.save();
  ctx.strokeStyle = col; ctx.globalAlpha = 0.55; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(0, u.radius * 0.45, u.radius * (u.isBase ? 1.35 : 1.45), u.radius * (u.isBase ? 0.55 : 0.6), 0, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  if(u.isBase){ light ? drawLightAncientModel(u.radius*1.7, t) : drawDarkAncientModel(u.radius*1.7, t); }
  else { light ? drawLightTowerModel(u.radius, t) : drawDarkTowerModel(u.radius, t); }
}


/* ===== Счётчик съеденного для Джувсюта + псевдо-3D объём ===== */
const FX_3D = true;
function drawJuvsyutDevourBadge(u){
  const st = u.devour;
  const count = st ? st.count : 0;
  const cx = u.x, cy = u.y - u.radius - 74;
  const text = '×' + count;
  ctx.save();
  ctx.font = 'bold 15px Segoe UI, Arial';
  const tw = ctx.measureText(text).width;
  const w = tw + 46, h = 24;
  const x = cx - w/2, y = cy - h/2;
  const pop = u.devourPop > 0 ? 1 + Math.min(0.35, u.devourPop) : 1;
  ctx.translate(cx, cy); ctx.scale(pop, pop); ctx.translate(-cx, -cy);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, 'rgba(70,34,16,0.92)'); g.addColorStop(1, 'rgba(28,12,6,0.92)');
  ctx.fillStyle = g; ctx.strokeStyle = count > 0 ? '#ffb36b' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
  ctx.shadowColor = count > 0 ? '#ff9d62' : 'transparent'; ctx.shadowBlur = count > 0 ? 12 : 0;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.font = '15px Segoe UI Emoji, Segoe UI, Arial'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('🍖', x + 8, cy + 1);
  ctx.font = 'bold 15px Segoe UI, Arial'; ctx.textAlign = 'right';
  ctx.fillStyle = count > 0 ? '#ffd9a8' : '#b9a58f';
  ctx.fillText(text, x + w - 10, cy + 1);
  /* Полоска голода: заполняется до потери стака */
  if(count > 0){
    const frac = clamp(st.hunger / JUVSYUT_HUNGER_TIME, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 8, y + h + 2, w - 16, 3);
    ctx.fillStyle = frac > 0.75 ? '#ff6b4a' : '#ffb36b';
    ctx.fillRect(x + 8, y + h + 2, (w - 16) * (1 - frac), 3);
  }
  ctx.restore();
}
function draw3DLighting(u){
  /* Объёмный свет: блик сверху-слева, тень снизу-справа, контровой свет */
  const r = u.radius;
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.clip();
  const sh = ctx.createRadialGradient(-r*0.38, -r*0.45, r*0.1, 0, 0, r*1.05);
  sh.addColorStop(0, 'rgba(255,255,255,0.28)');
  sh.addColorStop(0.45, 'rgba(255,255,255,0)');
  sh.addColorStop(1, 'rgba(0,0,20,0.42)');
  ctx.fillStyle = sh; ctx.fillRect(-r, -r, r*2, r*2);
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r - 1, Math.PI*1.1, Math.PI*1.75); ctx.stroke();
  ctx.restore();
}
function draw3DShadow(u){
  /* Длинная косая тень от «солнца» вместо плоского эллипса */
  const r = u.radius;
  const tall = (u.type === 'tower' || u.type === 'ancient') ? 2.4 : (u.type === 'barracks' ? 1.4 : 1);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.30)';
  ctx.translate(r*0.25, r*0.7);
  ctx.transform(1, 0, -0.65*tall, 1, 0, 0);
  ctx.beginPath(); ctx.ellipse(0, -r*0.15*tall, r*0.8, r*0.5*tall, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
function draw3DExtrude(u){
  /* Боковые стенки построек — эффект высоты */
  const r = u.radius;
  const hgt = u.type === 'ancient' ? r*0.9 : (u.type === 'tower' ? r*1.4 : r*0.5);
  const side = ctx.createLinearGradient(-r, 0, r, 0);
  side.addColorStop(0, 'rgba(0,0,0,0.05)'); side.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.save();
  ctx.fillStyle = u.team === 0 ? '#1d3347' : '#3a1a24';
  ctx.beginPath(); ctx.ellipse(0, r*0.55, r*0.9, r*0.38, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = side;
  ctx.fillRect(-r*0.9, -hgt*0.2, r*1.8, hgt*0.9);
  ctx.restore();
}

function drawUnit(u){
  if(u.dead) return;
  if(u.invisible) return;
  const isEnemy = u.team !== 0;
  if(isEnemy && !isVisibleToPlayer(u) && !u.arcMotion) return;

  const col = TEAM_COL[u.team];
  const arcProgress = u.arcMotion ? clamp(u.arcMotion.t/u.arcMotion.duration,0,1) : 0;
  const arcLift = u.arcMotion ? Math.sin(arcProgress*Math.PI) * u.arcMotion.height : 0;
  const windLift = u.windTimer > 0 ? Math.min(1, (SHOP_ITEMS.windWaker.duration - u.windTimer + 0.12) / 0.3) * (38 + Math.sin(gameTime*6)*5) : 0;
  const visualLift = arcLift || windLift || (u.liftTimer > 0 ? Math.sin((0.65-u.liftTimer)/0.65*Math.PI)*45 : 0);
  const walkableUnit = u.type !== 'tower' && u.type !== 'barracks' && u.type !== 'ancient';
  const strideAmt = walkableUnit ? Math.sin(u.walkPhase*Math.PI*2) : 0;
  const walkBob = walkableUnit ? Math.abs(strideAmt) * Math.min(5, u.radius*0.2) * (u.moving?1:0) : 0;
  if(u.windTimer > 0 || u.nullifyTimer > 0) drawItemStatusFx(u, visualLift);
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
    const heroAccent = u.skinId === 'reginaRed' ? '#ff344f' : (u.def.color2 || col);
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
  if(FX_3D){ draw3DShadow(u); if(u.type==='tower'||u.type==='ancient'||u.type==='barracks') draw3DExtrude(u); }

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
    drawStructureModel(u, col);
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
    const isDetailedModel = ['sasych','ilya','malit','arcady','juvsyut','chip','earthshaker','yosyp'].includes(u.def.id) || isReferenceModel;
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
     } else if(u.def.id==='savely'){
       const s=u.radius/24;
       ctx.save(); ctx.scale(s,s);
       const robot=u.buffs&&u.buffs.some(buff=>buff.id==='savelyTransformer');
       ctx.shadowColor=robot?'#ffb347':'#5ed5ff'; ctx.shadowBlur=robot?22:12;
       ctx.fillStyle=robot?'rgba(255,150,45,0.22)':'rgba(42,164,210,0.2)';
       ctx.beginPath(); ctx.ellipse(0,16,42,37,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
       ctx.fillStyle=robot?'#a94f2d':'#d84d35'; ctx.strokeStyle='#421f2b'; ctx.lineWidth=2.5;
       ctx.beginPath(); ctx.moveTo(-31,-1); ctx.lineTo(-40,34); ctx.quadraticCurveTo(0,51,40,34); ctx.lineTo(31,-1); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.fillStyle=robot?'#e7a33d':'#f1e4cf'; ctx.strokeStyle=robot?'#572b25':'#a43c37';
       ctx.beginPath(); ctx.moveTo(-24,0); ctx.lineTo(-27,39); ctx.quadraticCurveTo(0,46,27,39); ctx.lineTo(24,0); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.strokeStyle=robot?'#ffcf55':'#d94f46'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,1); ctx.lineTo(0,42); ctx.stroke();
       ctx.fillStyle='#172b42'; ctx.strokeStyle='#081321'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.ellipse(-13,42,10,5,0,0,Math.PI*2); ctx.ellipse(13,42,10,5,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.fillStyle=robot?'#798899':'#c98862'; ctx.strokeStyle='#4a2d31';
       ctx.beginPath(); ctx.ellipse(0,-12,26,28,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.fillStyle=robot?'#263848':'#3d222b'; ctx.beginPath(); ctx.arc(0,-29,25,Math.PI,Math.PI*2); ctx.fill();
       ctx.fillStyle=robot?'#ffdc6b':'#fff1d0'; ctx.shadowColor=robot?'#ffb347':'#fff1d0'; ctx.shadowBlur=robot?12:4;
       ctx.beginPath(); ctx.ellipse(-9,-12,5,3,0,0,Math.PI*2); ctx.ellipse(9,-12,5,3,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
       ctx.strokeStyle='#512934'; ctx.lineWidth=2.2; ctx.beginPath(); ctx.arc(0,0,10,0.15,Math.PI-0.15); ctx.stroke();
       ctx.fillStyle=robot?'#ffb347':'#f5c65c'; ctx.strokeStyle='#744122'; ctx.lineWidth=1.5;
       ctx.beginPath(); ctx.arc(0,15,7,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#fff0c7'; ctx.font='bold 8px Segoe UI, Arial'; ctx.textAlign='center'; ctx.fillText('S',0,18);
       ctx.fillStyle=robot?'#536779':'#e1eef4'; ctx.strokeStyle='#182838'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.ellipse(-30,4,8,12,-0.35,0,Math.PI*2); ctx.ellipse(30,4,8,12,0.35,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#f3ead9'; ctx.strokeStyle='#263447'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.arc(47,25,12,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.strokeStyle='#273849'; ctx.lineWidth=1.4;
       for(let i=0;i<5;i++){const a=i*Math.PI/2.5;ctx.beginPath();ctx.moveTo(47,25);ctx.lineTo(47+Math.cos(a)*10,25+Math.sin(a)*10);ctx.stroke();}
      if(robot){ctx.fillStyle='#ffbd42';ctx.beginPath();ctx.arc(0,-43,4+Math.sin(gameTime*8)*1.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffdc72';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-31,7);ctx.lineTo(-43,25);ctx.moveTo(31,7);ctx.lineTo(43,25);ctx.stroke();}
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
      // Палитра меняется для выбранного игроком косметического образа.
      const redSkin=u.skinId==='reginaRed';
       const s = u.radius/24;
       ctx.save();
       ctx.scale(s,s);
       ctx.fillStyle=redSkin?'rgba(100,12,30,0.38)':'rgba(29,54,83,0.34)'; ctx.shadowColor=redSkin?'#ff263f':'#ff6f91'; ctx.shadowBlur=18;
       ctx.beginPath(); ctx.ellipse(0,15,33,39,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
       ctx.fillStyle=redSkin?'#78172b':'#31557f'; ctx.strokeStyle=redSkin?'#310b18':'#172d49'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.moveTo(-22,-4); ctx.lineTo(-31,31); ctx.lineTo(0,41); ctx.lineTo(31,31); ctx.lineTo(22,-4); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.fillStyle=redSkin?'#eadce0':'#d9e4ea'; ctx.strokeStyle=redSkin?'#c88995':'#a7bfd0'; ctx.lineWidth=1.5;
       ctx.beginPath(); ctx.moveTo(-15,-2); ctx.lineTo(15,-2); ctx.lineTo(18,28); ctx.quadraticCurveTo(0,36,-18,28); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.fillStyle=redSkin?'#c62842':'#3f78b1'; ctx.fillRect(-5,0,4,24); ctx.fillRect(3,0,4,24);
       ctx.fillStyle=redSkin?'#692536':'#9a6844'; ctx.strokeStyle=redSkin?'#32101a':'#4b3025'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.roundRect(-29,0,9,28,3); ctx.roundRect(20,0,9,28,3); ctx.fill(); ctx.stroke();
       ctx.fillStyle=redSkin?'#4a101f':'#243b3c'; ctx.strokeStyle=redSkin?'#cf5267':'#6c8a80';
       ctx.beginPath(); ctx.moveTo(-28,-4); ctx.lineTo(-38,-18); ctx.lineTo(-30,-30); ctx.lineTo(-18,-12); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.beginPath(); ctx.moveTo(28,-4); ctx.lineTo(38,-18); ctx.lineTo(30,-30); ctx.lineTo(18,-12); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#e0a276'; ctx.strokeStyle='#6d4434'; ctx.lineWidth=1.5;
       ctx.beginPath(); ctx.ellipse(0,-13,18,21,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.fillStyle=redSkin?'#52101e':'#a84f2d'; ctx.strokeStyle=redSkin?'#260810':'#5c2e22'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.moveTo(-19,-17); ctx.quadraticCurveTo(-15,-39,4,-37); ctx.quadraticCurveTo(20,-35,22,-18); ctx.lineTo(15,-25); ctx.quadraticCurveTo(2,-33,-10,-24); ctx.closePath(); ctx.fill(); ctx.stroke();
       ctx.fillStyle=redSkin?'#b12640':'#c96535'; ctx.beginPath(); ctx.arc(25,-34,13,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.strokeStyle=redSkin?'#e4465d':'#e8a06c'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-12,-25); ctx.lineTo(-19,-7); ctx.moveTo(7,-29); ctx.lineTo(16,-12); ctx.stroke();
       ctx.fillStyle='#6f352b'; ctx.beginPath(); ctx.arc(-7,-12,2.4,0,Math.PI*2); ctx.arc(7,-12,2.4,0,Math.PI*2); ctx.fill();
       ctx.fillStyle='#ffeff2'; ctx.beginPath(); ctx.arc(-7,-13,1,0,Math.PI*2); ctx.arc(7,-13,1,0,Math.PI*2); ctx.fill();
       ctx.strokeStyle='#7e3d3d'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(-7,-3); ctx.quadraticCurveTo(0,1,7,-3); ctx.stroke();
       ctx.restore();
     } else if(u.def.id==='yosyp'){
       const s=u.radius/24;
       ctx.save(); ctx.scale(s,s);
       const gait=Math.sin(gameTime*10+(u.walkPhase||0));
       ctx.fillStyle='rgba(20,55,22,0.34)';
       ctx.beginPath(); ctx.ellipse(0,23,39,18,0,0,Math.PI*2); ctx.fill();
       for(const side of [-1,1]){
         for(let leg=0;leg<3;leg++){
           const anchorY=leg*13+1;
           const swing=gait*(leg===1?4:-4)*(side===1?1:-1);
           const kneeX=side*(27+Math.abs(swing)*0.35), kneeY=anchorY+7+swing;
           const footX=side*(39+Math.abs(swing)), footY=anchorY+17-swing*0.35;
           ctx.strokeStyle='#294b21'; ctx.lineWidth=5; ctx.lineCap='round'; ctx.lineJoin='round';
           ctx.beginPath(); ctx.moveTo(side*13,anchorY); ctx.lineTo(kneeX,kneeY); ctx.lineTo(footX,footY); ctx.stroke();
           ctx.strokeStyle='#88c84d'; ctx.lineWidth=2;
           ctx.beginPath(); ctx.moveTo(side*14,anchorY-1); ctx.lineTo(kneeX,kneeY-1); ctx.stroke();
           ctx.fillStyle='#a7e85b'; ctx.beginPath(); ctx.arc(kneeX,kneeY,3,0,Math.PI*2); ctx.fill();
         }
       }
       ctx.shadowColor='#82ff42'; ctx.shadowBlur=18;
       const shell=ctx.createLinearGradient(-22,-5,22,35);
       shell.addColorStop(0,'#c0ef67'); shell.addColorStop(0.3,'#72b936'); shell.addColorStop(0.72,'#3f812d'); shell.addColorStop(1,'#234c28');
       ctx.fillStyle=shell; ctx.strokeStyle='#183d25'; ctx.lineWidth=2.6;
       ctx.beginPath(); ctx.ellipse(0,14,23,31,0,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
       ctx.strokeStyle='rgba(208,255,129,0.74)'; ctx.lineWidth=1.5;
       ctx.beginPath(); ctx.moveTo(0,-14); ctx.bezierCurveTo(-2,0,-2,24,0,43); ctx.stroke();
       for(let plate=0;plate<3;plate++){
         ctx.strokeStyle='rgba(31,76,34,0.62)'; ctx.lineWidth=1.4;
         ctx.beginPath(); ctx.ellipse(0,plate*12+4,21-plate*1.5,7,0,0,Math.PI*2); ctx.stroke();
       }
       const head=ctx.createRadialGradient(-6,-27,2,0,-22,20);
       head.addColorStop(0,'#a9e758'); head.addColorStop(0.65,'#579b35'); head.addColorStop(1,'#234d2b');
       ctx.fillStyle=head; ctx.strokeStyle='#1b3d27'; ctx.lineWidth=2.4;
       ctx.beginPath(); ctx.ellipse(0,-23,18,16,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
       ctx.fillStyle='#132b22'; ctx.shadowColor='#baff62'; ctx.shadowBlur=9;
       ctx.beginPath(); ctx.ellipse(-10,-25,5,7,-0.25,0,Math.PI*2); ctx.ellipse(10,-25,5,7,0.25,0,Math.PI*2); ctx.fill();
       ctx.fillStyle='#d9ff8c'; ctx.beginPath(); ctx.arc(-11,-27,1.8,0,Math.PI*2); ctx.arc(9,-27,1.8,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
       ctx.strokeStyle='#436e31'; ctx.lineWidth=2.5; ctx.lineCap='round';
       ctx.beginPath(); ctx.moveTo(-7,-34); ctx.quadraticCurveTo(-21,-51,-27,-44); ctx.moveTo(7,-34); ctx.quadraticCurveTo(21,-51,27,-44); ctx.stroke();
       ctx.fillStyle='#a7e85b'; ctx.beginPath(); ctx.arc(-27,-44,3,0,Math.PI*2); ctx.arc(27,-44,3,0,Math.PI*2); ctx.fill();
       ctx.strokeStyle='#244a28'; ctx.lineWidth=2;
       ctx.beginPath(); ctx.moveTo(-7,-13); ctx.lineTo(-12,-6); ctx.lineTo(-3,-9); ctx.moveTo(7,-13); ctx.lineTo(12,-6); ctx.lineTo(3,-9); ctx.stroke();
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

      // Золотой призрачный двойник повторяет силуэт мага.
      ctx.save();
      ctx.translate(34,-8);
      ctx.globalAlpha=0.22+Math.sin(gameTime*2.4)*0.035;
      ctx.fillStyle='#f2d28a'; ctx.strokeStyle='#fff0bd'; ctx.lineWidth=1.5;
      ctx.shadowColor='#f4d27d'; ctx.shadowBlur=13;
      ctx.beginPath(); ctx.ellipse(0,-17,12,15,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-13,-4); ctx.lineTo(-20,25); ctx.lineTo(0,31);
      ctx.lineTo(20,25); ctx.lineTo(13,-4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(11,-10); ctx.lineTo(29,-33); ctx.stroke();
      ctx.restore();

      // Бирюзовая мантия с золотой отделкой.
      ctx.fillStyle='rgba(67,218,220,0.25)';
      ctx.shadowColor='#62e7e8'; ctx.shadowBlur=18;
      ctx.beginPath(); ctx.ellipse(0,14,32,24,0,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;
      ctx.fillStyle='#123b4c'; ctx.strokeStyle='#d5ae5c'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(-25,2); ctx.lineTo(-31,31); ctx.lineTo(0,38);
      ctx.lineTo(31,31); ctx.lineTo(25,2); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#f2d58a'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(-21,9); ctx.lineTo(-25,27); ctx.lineTo(0,33);
      ctx.lineTo(25,27); ctx.lineTo(21,9); ctx.stroke();

      // Рельефные золотые наплечники.
      ctx.fillStyle='#d8b35f'; ctx.strokeStyle='#6b4926'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(-22,6,12,8,-0.35,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(22,6,12,8,0.35,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#fff0bd'; ctx.lineWidth=1.2;
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

      // Золотая корона с высокими лучами.
      ctx.fillStyle='#f4d36e'; ctx.strokeStyle='#fff0b5'; ctx.lineWidth=1.5;
      ctx.beginPath();
      ctx.moveTo(-19,-16); ctx.lineTo(-25,-28); ctx.lineTo(-13,-25);
      ctx.lineTo(-11,-38); ctx.lineTo(-3,-28); ctx.lineTo(4,-41);
      ctx.lineTo(9,-28); ctx.lineTo(20,-34); ctx.lineTo(17,-19);
      ctx.lineTo(9,-12); ctx.lineTo(0,-20); ctx.lineTo(-9,-12); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle='#dceff0';
      ctx.beginPath(); ctx.moveTo(-18,-12); ctx.quadraticCurveTo(-28,3,-19,19);
      ctx.lineTo(-12,23); ctx.lineTo(-12,-7); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(18,-12); ctx.quadraticCurveTo(28,3,19,19);
      ctx.lineTo(12,23); ctx.lineTo(12,-7); ctx.closePath(); ctx.fill();

      // Брови, нос и длинная белая борода.
      ctx.strokeStyle='#183d50'; ctx.lineWidth=2.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(-12,-10); ctx.lineTo(-3,-13); ctx.moveTo(3,-13); ctx.lineTo(12,-10);
      ctx.moveTo(0,-6); ctx.lineTo(-3,5); ctx.lineTo(3,6); ctx.stroke();
      ctx.fillStyle='#e6f2e7'; ctx.strokeStyle='#9caeaa'; ctx.lineWidth=1.2;
      ctx.beginPath();
      ctx.moveTo(-12,4); ctx.quadraticCurveTo(-8,18,0,30);
      ctx.quadraticCurveTo(8,18,12,4); ctx.quadraticCurveTo(7,9,0,12);
      ctx.quadraticCurveTo(-7,9,-12,4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='rgba(102,148,155,0.75)'; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(-7,9); ctx.lineTo(-3,24); ctx.moveTo(0,11); ctx.lineTo(0,28); ctx.moveTo(7,9); ctx.lineTo(3,24); ctx.stroke();

      // Сияющие глаза.
      ctx.shadowColor='#82ffff'; ctx.shadowBlur=14; ctx.fillStyle='#eaffff';
      ctx.beginPath(); ctx.ellipse(-8,-6,4,2.4,-0.12,0,Math.PI*2);
      ctx.ellipse(8,-6,4,2.4,0.12,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=0;

      // Кристалл на груди.
      ctx.fillStyle='#42e5df'; ctx.strokeStyle='#f2ffff'; ctx.lineWidth=1.5;
      ctx.shadowColor='#45fff3'; ctx.shadowBlur=12;
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
      ctx.strokeStyle='#684521'; ctx.lineWidth=4; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(7,7); ctx.lineTo(u.radius*1.45,-u.radius*1.35); ctx.stroke();
      ctx.strokeStyle='#f1d278'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(u.radius*1.5,-u.radius*1.45,7,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle='#57f5ec'; ctx.shadowColor='#57f5ec'; ctx.shadowBlur=10;
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
  } else if(u.type === 'neutral'){
    drawNeutralCreepBody(u, col);
  } else {
    ctx.fillStyle = u.ranged ? '#8d6e63' : '#6d4c41';
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
  if(u.buffs && u.buffs.some(buff => buff.type === 'yosypPoison')){
    const pulse=0.5+0.5*Math.sin(gameTime*11);
    ctx.save();
    ctx.globalAlpha=0.58+pulse*0.24;
    ctx.strokeStyle='#a7ff54'; ctx.lineWidth=2.5; ctx.shadowColor='#7dff3f'; ctx.shadowBlur=14;
    ctx.beginPath(); ctx.arc(0,0,u.radius+7+pulse*3,0,Math.PI*2); ctx.stroke();
    ctx.shadowBlur=8; ctx.fillStyle='#a7ff54'; ctx.strokeStyle='#e2ff9e'; ctx.lineWidth=1;
    for(let bubble=0;bubble<4;bubble++){
      const angle=gameTime*2.4+bubble*Math.PI/2;
      const orbit=u.radius*0.68;
      const x=Math.cos(angle)*orbit, y=Math.sin(angle)*orbit-5;
      ctx.beginPath(); ctx.arc(x,y,2.5+(bubble%2),0,Math.PI*2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  if(FX_3D && (u.type==='hero'||u.type==='neutral'||u.type==='creep'||u.type==='tower'||u.type==='ancient')) draw3DLighting(u);
  ctx.restore();
  const dianaAura = u.inventory && u.inventory.find(i => i && i.id === 'dianaPants' && i.auraOn);
  if(dianaAura && !u.dead){
    const auraR = SHOP_ITEMS.dianaPants.auraRadius;
    ctx.save();
    const pulse = 0.5 + 0.5*Math.sin(gameTime*4);
    const glow = ctx.createRadialGradient(u.x,u.y,auraR*0.2,u.x,u.y,auraR);
    glow.addColorStop(0,'rgba(255,111,176,0)');
    glow.addColorStop(1,'rgba(255,111,176,'+(0.10+pulse*0.06)+')');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(u.x,u.y,auraR,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,140,194,'+(0.55+pulse*0.25)+')';
    ctx.lineWidth = 2; ctx.setLineDash([14,10]);
    ctx.lineDashOffset = -gameTime*30;
    ctx.beginPath(); ctx.arc(u.x,u.y,auraR,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
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
    const roleLabel = gameTime >= MID_PUSH_TIME && u.midPushAssignment ? 'МИД • PUSH' : LANE_NAMES[u.assignedLane || 0];
    ctx.strokeText(roleLabel, u.x, u.y - u.radius - 50);
    ctx.fillText(roleLabel, u.x, u.y - u.radius - 50);
    ctx.restore();
  }
  if(u.type === 'hero' && u.def.id === 'juvsyut' && !portraitRenderMode) drawJuvsyutDevourBadge(u);
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

function isWorldPointVisible(x,y,padding=140){
  return Number.isFinite(x) && Number.isFinite(y) &&
    x>=cam.x-VW/2-padding && x<=cam.x+VW/2+padding &&
    y>=cam.y-VH/2-padding && y<=cam.y+VH/2+padding;
}

function drawWorldObjects(){
  for(const puddle of aoes){
    if(puddle.visual !== 'yosypPuddle' || puddle.dead) continue;
    const fade=Math.max(0,Math.min(1,puddle.t/0.16,(puddle.life-puddle.t)/0.55));
    if(fade<=0) continue;
    const pulse=1+Math.sin(gameTime*4+puddle.x*0.02)*0.045;
    ctx.save(); ctx.translate(puddle.x,puddle.y); ctx.scale(pulse,1);
    ctx.globalAlpha=fade*0.82;
    const slime=ctx.createRadialGradient(-puddle.radius*0.18,-puddle.radius*0.12,2,0,0,puddle.radius);
    slime.addColorStop(0,'rgba(190,255,104,0.9)');
    slime.addColorStop(0.44,'rgba(91,190,48,0.82)');
    slime.addColorStop(0.82,'rgba(32,91,36,0.8)');
    slime.addColorStop(1,'rgba(18,47,28,0.12)');
    ctx.fillStyle=slime; ctx.strokeStyle='rgba(187,255,102,0.9)'; ctx.lineWidth=2.5;
    ctx.shadowColor='#89ff48'; ctx.shadowBlur=12;
    ctx.beginPath(); ctx.ellipse(0,0,puddle.radius,puddle.radius*0.68,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur=0; ctx.fillStyle='rgba(220,255,137,0.85)';
    for(let bubble=0;bubble<3;bubble++){
      const x=Math.sin(gameTime*2+bubble*2.1+puddle.y)*puddle.radius*0.42;
      const y=Math.cos(gameTime*1.7+bubble*2.5+puddle.x)*puddle.radius*0.22;
      ctx.beginPath(); ctx.arc(x,y,3+bubble%2,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
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
  for(const camp of NEUTRAL_CAMPS){
    const index=campIndexOf(camp);
    if(!units.some(unit=>unit.type==='neutral'&&unit.campIndex===index)) continue;
    const {x,y}=camp[0], pulse=1+Math.sin(gameTime*2.4+index)*0.06;
    ctx.save(); ctx.translate(x,y);
    ctx.globalAlpha=0.72;
    ctx.strokeStyle='rgba(229,192,128,0.68)'; ctx.lineWidth=3;
    ctx.setLineDash([7,8]); ctx.beginPath(); ctx.ellipse(0,0,75*pulse,52*pulse,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle='#514332'; ctx.strokeStyle='#bea16b'; ctx.lineWidth=2;
    for(const stone of [[-55,-18],[52,-22],[-40,34],[42,32]]){
      ctx.beginPath(); ctx.ellipse(stone[0],stone[1],8,6,stone[0]*0.02,0,Math.PI*2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle='#ff8c42'; ctx.shadowColor='#ff9a45'; ctx.shadowBlur=18;
    ctx.beginPath(); ctx.moveTo(-8,8); ctx.quadraticCurveTo(-14,-8,0,-18); ctx.quadraticCurveTo(12,-5,7,8); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#ffe9a0'; ctx.shadowBlur=7;
    ctx.beginPath(); ctx.moveTo(-3,7); ctx.quadraticCurveTo(-5,-2,1,-9); ctx.quadraticCurveTo(7,-1,4,7); ctx.closePath(); ctx.fill(); ctx.shadowBlur=0;
    ctx.strokeStyle='#c8aa70'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(0,-35); ctx.lineTo(0,-66); ctx.stroke();
    ctx.fillStyle='#bd5541'; ctx.beginPath(); ctx.moveTo(1,-64); ctx.lineTo(26,-57); ctx.lineTo(1,-49); ctx.closePath(); ctx.fill();
    ctx.textAlign='center'; ctx.font='bold 10px Segoe UI, Arial';
    ctx.fillStyle='#f2dca9'; ctx.shadowColor='#17130e'; ctx.shadowBlur=5;
    ctx.fillText('ЛАГЕРЬ '+(index+1),0,75); ctx.shadowBlur=0;
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
  const renderMargin=260;
  const viewLeft=cam.x-VW/2-renderMargin, viewRight=cam.x+VW/2+renderMargin;
  const viewTop=cam.y-VH/2-renderMargin, viewBottom=cam.y+VH/2+renderMargin;
  const list = units.filter(unit =>
    unit.x+unit.radius>=viewLeft && unit.x-unit.radius<=viewRight &&
    unit.y+unit.radius>=viewTop && unit.y-unit.radius<=viewBottom
  ).sort((a,b) => a.y-b.y);
  for(const u of list){
    if((u.type === 'tower' || u.type === 'ancient') && (!u.alive || u.hp <= 0 || u.dead)) continue;
    drawUnitSafely(u);
  }

  for(const p of projectiles){
    if(!isWorldPointVisible(p.x,p.y,180)) continue;
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
    const fxX=Number.isFinite(f.x)?f.x:f.x1, fxY=Number.isFinite(f.y)?f.y:f.y1;
    if(!isWorldPointVisible(fxX,fxY,Math.max(180,f.r||0))) continue;
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
    if(!isWorldPointVisible(p.x,p.y,90)) continue;
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
    if(!isWorldPointVisible(t.x,t.y,120)) continue;
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

function minimapSize(){ return VW < 980 ? 160 : (VH < 760 ? 190 : 230); }
function drawMinimap(){
  const S = minimapSize(), pad = 8;
  const x0 = pad, y0 = VH-S-pad;
  const k = S/WORLD;
  ctx.save();
  ctx.fillStyle = 'rgba(6,8,10,0.96)';
  ctx.fillRect(x0-5, y0-5, S+10, S+10);
  ctx.strokeStyle = 'rgba(150,125,80,0.75)'; ctx.lineWidth = 2;
  ctx.strokeRect(x0-5, y0-5, S+10, S+10);
  ctx.beginPath(); ctx.rect(x0, y0, S, S); ctx.clip();
  ctx.fillStyle = '#0d1a0b';
  ctx.fillRect(x0, y0, S, S);
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
  const mobile = VW < 720;
  const compact = VW < 980;
  const skillCount = (playerHero && playerHero.skills.length) || 4;
  if(mobile){
    const panel = {x:8,y:VH-252,w:VW-16,h:244};
    const skillGap = 4;
    const skillSize = Math.min(48,Math.max(36,Math.floor((VW-32-(skillCount-1)*skillGap)/skillCount)));
    const skillsW = skillCount*skillSize+(skillCount-1)*skillGap;
    const itemSize = Math.min(32,Math.max(24,Math.floor((VW-36-8)/3)));
    const itemGap = 4;
    const itemsW = 3*itemSize+2*itemGap;
    return {
      panel,
      stats:{x:panel.x+56,y:panel.y,w:panel.w-64},
      skills:{x:(VW-skillsW)/2,y:panel.y+120,w:skillSize,h:skillSize,gap:skillGap},
      items:{x:(VW-itemsW)/2,y:panel.y+178,w:itemSize,h:itemSize,gap:itemGap,columns:3,rows:2}
    };
  }
  const panelH = compact ? 128 : 144;
  const itemSize = compact ? 42 : 50;
  const itemGap = 4;
  const skillGap = 4;
  const skillSize = compact ? 52 : 62;
  const portraitW = compact ? 92 : 112;
  const skillsW = skillCount * skillSize + (skillCount - 1) * skillGap;
  const infoW = Math.max(skillsW, compact ? 200 : 240);
  const itemsW = 3 * itemSize + 2 * itemGap;
  const pad = 10, sep = 10;
  const totalW = pad + portraitW + sep + infoW + sep + itemsW + pad;
  const mmRight = minimapSize() + 18;
  let x = (VW - totalW) / 2;
  if(x < mmRight) x = Math.min(mmRight, Math.max(4, VW - totalW - 4));
  const panelY = VH - panelH;
  const infoX = x + pad + portraitW + sep;
  const skillsY = panelY + 12;
  const hpY = skillsY + skillSize + 9;
  const itemsH = 2 * itemSize + itemGap;
  return {
    panel: {x, y: panelY, w: totalW, h: panelH},
    portrait: {x: x + pad, y: panelY + 12, w: portraitW, h: panelH - 24},
    stats: {x: infoX, y: panelY, w: infoW},
    skills: {x: infoX, y: skillsY, w: skillSize, h: skillSize, gap: skillGap},
    hp: {x: infoX, y: hpY, w: infoW, h: compact ? 18 : 22},
    mp: {x: infoX, y: hpY + (compact ? 20 : 24), w: infoW, h: compact ? 14 : 16},
    items: {x: x + pad + portraitW + sep + infoW + sep, y: panelY + (panelH - itemsH) / 2, w: itemSize, h: itemSize, gap: itemGap, columns: 3, rows: 2}
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
  const w = VW < 720 ? 132 : 170, h = VW < 720 ? 38 : 46;
  const rect = {x:VW-8-w, y:VH-8-h, w, h};
  if(VW >= 720){
    const panel = combatHudLayout().panel;
    if(rect.x < panel.x + panel.w + 6) rect.y = panel.y - h - 6;
  } else {
    rect.y = combatHudLayout().panel.y - h - 6;
  }
  return rect;
}
function shopGuideButtonRect(){
  const {r} = shopLayout();
  return {x:r.x+r.w-196, y:r.y+13, w:178, h:30};
}
function shopLayout(){
  const h = Math.min(640, Math.max(420, VH-72));
  const r = {x:Math.max(12,VW/2-560),y:Math.max(36,(VH-h)/2),w:Math.min(1120,VW-24),h};
  const detailsW = VW >= 980 ? 282 : 0;
  const columns = VW >= 980 ? 9 : (VW < 620 ? 4 : 5);
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
  const column=i%items.columns, row=Math.floor(i/items.columns);
  return {x:items.x+column*(items.w+items.gap), y:items.y+row*(items.h+items.gap), w:items.w, h:items.h};
}
function hoveredItemRangePreview(){
  if(!playerHero) return null;
  for(let i=0;i<6;i++){
    const rect=inventorySlotRect(i), item=playerHero.inventory[i];
    if(item&&mouse.x>=rect.x&&mouse.x<=rect.x+rect.w&&mouse.y>=rect.y&&mouse.y<=rect.y+rect.h)
      return item.id;
  }
  if(shopOpen&&!shopGuideOpen){
    for(let i=0;i<SHOP_ITEM_IDS.length;i++){
      const rect=shopItemRect(i);
      if(mouse.x>=rect.x&&mouse.x<=rect.x+rect.w&&mouse.y>=rect.y&&mouse.y<=rect.y+rect.h)
        return SHOP_ITEM_IDS[i];
    }
  }
  return null;
}
function drawItemRangePreview(){
  const itemId=hoveredItemRangePreview();
  const item=SHOP_ITEMS[itemId];
  if(!item||!playerHero) return;
  let radius=item.range||item.auraRadius||0;
  if(item.attackRange){
    const alreadyOwned=playerHero.inventory.some(entry=>entry&&entry.id==='brainEye');
    radius=playerHero.getAttackRange()+(alreadyOwned?0:item.attackRange);
  }
  if(!radius) return;
  ctx.save();
  ctx.fillStyle='rgba(100,210,255,0.055)';
  ctx.beginPath(); ctx.arc(playerHero.x,playerHero.y,radius,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle=item.color||'#8be9fd'; ctx.lineWidth=2.5; ctx.setLineDash([12,8]);
  ctx.beginPath(); ctx.arc(playerHero.x,playerHero.y,radius,0,Math.PI*2); ctx.stroke();
  ctx.setLineDash([]);
  const labelY=Math.max(cam.y-VH/2+22,playerHero.y-radius-14);
  ctx.font='bold 13px Segoe UI, Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.lineWidth=4; ctx.strokeStyle='rgba(3,7,13,0.9)';
  ctx.strokeText('РАДИУС '+Math.round(radius),playerHero.x,labelY);
  ctx.fillStyle=item.color||'#8be9fd'; ctx.fillText('РАДИУС '+Math.round(radius),playerHero.x,labelY);
  ctx.restore();
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

/* Ураган Вейкера Ветра и печать Нуллификатора вокруг бойца. */
function drawItemStatusFx(u, lift){
  ctx.save();
  ctx.translate(u.x, u.y);
  if(u.windTimer > 0){
    const r = u.radius + 16;
    ctx.fillStyle = 'rgba(8,24,22,0.22)';
    ctx.beginPath(); ctx.ellipse(0, 4, r*0.85, r*0.3, 0, 0, Math.PI*2); ctx.fill();
    ctx.lineCap = 'round';
    for(let k=0;k<6;k++){
      const t = k/5, y = -lift*0.2 + 14 - t*(lift+u.radius*2.6);
      const w = r*(0.55 + 0.55*t);
      const a = gameTime*7 + k*1.3;
      ctx.strokeStyle = 'rgba(' + (190+k*10) + ',255,' + (235-k*6) + ',' + (0.55 - t*0.25) + ')';
      ctx.lineWidth = 3.4 - t*1.4;
      ctx.beginPath(); ctx.ellipse(0, y, w, w*0.26, 0, a, a + Math.PI*1.35); ctx.stroke();
    }
    if(Math.random() < 0.35) spawnParticles(u.x + (Math.random()-0.5)*u.radius*2, u.y - lift*0.5, '#d9fff6', 1, 0.5);
  }
  if(u.nullifyTimer > 0){
    const pulse = 0.55 + Math.sin(gameTime*8)*0.2;
    ctx.strokeStyle = 'rgba(176,124,255,' + pulse + ')';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -lift*0.3, u.radius + 12, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([6,8]); ctx.lineDashOffset = -gameTime*30;
    ctx.beginPath(); ctx.arc(0, -lift*0.3, u.radius + 20, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(235,220,255,' + (pulse+0.15) + ')'; ctx.lineWidth = 2.5;
    const s = u.radius*0.55; const cy = -u.radius*2.4 - lift*0.3;
    ctx.beginPath(); ctx.arc(0, cy, s, 0, Math.PI*2); ctx.moveTo(-s*.7, cy+s*.7); ctx.lineTo(s*.7, cy-s*.7); ctx.stroke();
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
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.beginPath();
  ctx.ellipse(-size*.24, -size*.28, size*.16, size*.07, -0.35, 0, Math.PI*2);
  ctx.fill();
  ctx.shadowBlur = 0;
  if(item.id === 'blink'){
    ctx.save();
    ctx.rotate(-0.18);
    ctx.shadowColor='#8feaff'; ctx.shadowBlur=14;
    const crystal=ctx.createLinearGradient(-size*.24,-size*.45,size*.25,size*.44);
    crystal.addColorStop(0,'#e8ffff'); crystal.addColorStop(0.28,'#68d9ff'); crystal.addColorStop(0.7,'#2474d0'); crystal.addColorStop(1,'#17265d');
    ctx.fillStyle=crystal; ctx.strokeStyle='#b8f5ff'; ctx.lineWidth=Math.max(1.5,size*.045);
    ctx.beginPath(); ctx.moveTo(0,-size*.45); ctx.lineTo(size*.28,-size*.08); ctx.lineTo(size*.16,size*.38); ctx.lineTo(-size*.18,size*.45); ctx.lineTo(-size*.32,-size*.08); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.78)'; ctx.lineWidth=Math.max(1,size*.028);
    ctx.beginPath(); ctx.moveTo(0,-size*.38); ctx.lineTo(0,size*.36); ctx.moveTo(-size*.25,-size*.05); ctx.lineTo(size*.22,size*.15); ctx.stroke();
    ctx.restore();
  } else if(item.id === 'dianaPants'){
    ctx.save();
    ctx.shadowColor='#ff76c8'; ctx.shadowBlur=12;
    const cloth=ctx.createLinearGradient(-size*.35,-size*.2,size*.35,size*.48);
    cloth.addColorStop(0,'#ffe4fa'); cloth.addColorStop(.35,'#ef77bd'); cloth.addColorStop(1,'#742469');
    ctx.fillStyle=cloth; ctx.strokeStyle='#ffd0f1'; ctx.lineWidth=Math.max(1.5,size*.05);
    ctx.beginPath(); ctx.moveTo(-size*.36,-size*.25); ctx.quadraticCurveTo(0,-size*.43,size*.36,-size*.25); ctx.lineTo(size*.27,size*.34); ctx.quadraticCurveTo(0,size*.48,-size*.27,size*.34); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#fff0a8'; ctx.lineWidth=Math.max(1,size*.035);
    ctx.beginPath(); ctx.moveTo(-size*.28,-size*.19); ctx.quadraticCurveTo(0,-size*.02,size*.28,-size*.19); ctx.moveTo(-size*.18,size*.02); ctx.lineTo(-size*.08,size*.29); ctx.moveTo(size*.18,size*.02); ctx.lineTo(size*.08,size*.29); ctx.stroke();
    ctx.fillStyle='#ffe56d'; ctx.beginPath(); ctx.arc(0,-size*.2,size*.055,0,Math.PI*2); ctx.fill();
    ctx.restore();
  } else if(item.id === 'mango'){
    ctx.save();
    ctx.rotate(-0.35);
    ctx.fillStyle='#f5ad35'; ctx.strokeStyle='#6c321e'; ctx.lineWidth=Math.max(1.5,size*.05);
    ctx.beginPath(); ctx.moveTo(-size*.25,size*.32); ctx.quadraticCurveTo(-size*.46,-size*.12,-size*.08,-size*.4); ctx.quadraticCurveTo(size*.38,-size*.5,size*.4,-size*.08); ctx.quadraticCurveTo(size*.35,size*.34,0,size*.45); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#68b958'; ctx.beginPath(); ctx.ellipse(-size*.02,-size*.43,size*.2,size*.07,-.3,0,Math.PI*2); ctx.fill(); ctx.restore();
  } else if(item.id === 'joelBoots' || item.id === 'superBoots'){
    ctx.save(); ctx.rotate(-0.18);
    const boot=ctx.createLinearGradient(-size*.35,-size*.42,size*.35,size*.44);
    boot.addColorStop(0,'#d7a26b'); boot.addColorStop(.45,'#80502f'); boot.addColorStop(1,'#251c28');
    ctx.fillStyle=boot; ctx.strokeStyle='#e8c27f'; ctx.lineWidth=Math.max(1.5,size*.05);
    ctx.beginPath(); ctx.moveTo(-size*.2,-size*.4); ctx.lineTo(size*.1,-size*.42); ctx.lineTo(size*.16,size*.05); ctx.quadraticCurveTo(size*.47,size*.08,size*.43,size*.3); ctx.quadraticCurveTo(size*.05,size*.5,-size*.34,size*.3); ctx.lineTo(-size*.4,-size*.04); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle=item.id==='superBoots'?'#ffe36e':'#75e6a7'; ctx.lineWidth=Math.max(1,size*.045);
    for(let line=-1;line<=1;line++){ctx.beginPath();ctx.moveTo(-size*.16,line*size*.11-size*.2);ctx.lineTo(size*.12,line*size*.11-size*.14);ctx.stroke();}
    ctx.restore();
  } else if(item.id === 'tango'){
    ctx.save();
    ctx.fillStyle='#4d9a50'; ctx.strokeStyle='#c4ed83'; ctx.lineWidth=Math.max(1.5,size*.045);
    ctx.beginPath(); ctx.moveTo(-size*.08,size*.42); ctx.quadraticCurveTo(-size*.18,size*.05,-size*.34,-size*.3); ctx.quadraticCurveTo(-size*.04,-size*.12,size*.08,-size*.02); ctx.quadraticCurveTo(size*.16,-size*.34,size*.35,-size*.38); ctx.quadraticCurveTo(size*.22,size*.02,size*.08,size*.43); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#e4f3a1'; ctx.beginPath(); ctx.moveTo(-size*.08,size*.38);ctx.lineTo(-size*.04,-size*.2);ctx.moveTo(size*.08,size*.28);ctx.lineTo(size*.28,-size*.25);ctx.stroke(); ctx.restore();
  } else if(item.id === 'bkb'){
    ctx.save();
    ctx.fillStyle='#a9363e'; ctx.strokeStyle='#ffcf74'; ctx.lineWidth=Math.max(1.5,size*.05);
    ctx.beginPath(); ctx.moveTo(-size*.28,-size*.34); ctx.lineTo(size*.28,-size*.34); ctx.lineTo(size*.38,size*.25); ctx.quadraticCurveTo(0,size*.46,-size*.38,size*.25); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#ffd86d'; ctx.beginPath(); ctx.arc(-size*.13,-size*.08,size*.07,0,Math.PI*2); ctx.arc(size*.13,-size*.08,size*.07,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#fff0a6'; ctx.beginPath(); ctx.moveTo(-size*.15,size*.15); ctx.lineTo(0,size*.28); ctx.lineTo(size*.15,size*.15); ctx.stroke(); ctx.restore();
  } else if(item.id === 'satanic'){
    ctx.save(); ctx.fillStyle='#b92d46'; ctx.strokeStyle='#ff9a9e'; ctx.lineWidth=Math.max(1.5,size*.05);
    ctx.beginPath(); ctx.moveTo(0,-size*.46); ctx.lineTo(size*.34,-size*.1); ctx.lineTo(size*.25,size*.36); ctx.lineTo(-size*.25,size*.36); ctx.lineTo(-size*.34,-size*.1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#ffcf72'; ctx.beginPath(); ctx.arc(0,-size*.05,size*.1,0,Math.PI*2); ctx.fill(); ctx.restore();
  } else if(item.id === 'aghanimShard'){
    ctx.save(); ctx.shadowColor='#7be9ff'; ctx.shadowBlur=14; ctx.fillStyle='#49c9ef'; ctx.strokeStyle='#dbffff'; ctx.lineWidth=Math.max(1.5,size*.045);
    ctx.beginPath(); ctx.moveTo(0,-size*.48); ctx.lineTo(size*.28,-size*.08); ctx.lineTo(size*.12,size*.43); ctx.lineTo(-size*.26,size*.16); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,.75)'; ctx.beginPath();ctx.moveTo(0,-size*.38);ctx.lineTo(-size*.1,size*.1);ctx.lineTo(size*.12,size*.3);ctx.stroke();ctx.restore();
  } else if(item.id === 'timurPillow'){
    ctx.save(); const pillow=ctx.createLinearGradient(-size*.35,-size*.3,size*.35,size*.35); pillow.addColorStop(0,'#f5ffff');pillow.addColorStop(.5,'#9ed8ff');pillow.addColorStop(1,'#557db0');
    ctx.fillStyle=pillow;ctx.strokeStyle='#e9ffff';ctx.lineWidth=Math.max(1.5,size*.05);ctx.beginPath();ctx.roundRect(-size*.38,-size*.3,size*.76,size*.6,size*.18);ctx.fill();ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=Math.max(1,size*.03);ctx.beginPath();ctx.moveTo(-size*.22,-size*.18);ctx.quadraticCurveTo(0,0,size*.22,-size*.18);ctx.moveTo(-size*.22,size*.18);ctx.quadraticCurveTo(0,0,size*.22,size*.18);ctx.stroke();ctx.restore();
  } else if(item.id === 'pt'){
    ctx.save();
    ctx.rotate(-0.12);
    const boot=ctx.createLinearGradient(-size*.35,-size*.2,size*.35,size*.45);
    boot.addColorStop(0,'#e7b05e'); boot.addColorStop(0.55,'#9a542f'); boot.addColorStop(1,'#38222a');
    ctx.fillStyle=boot; ctx.strokeStyle='#241a1d'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(-size*.24,-size*.34); ctx.lineTo(size*.12,-size*.38); ctx.lineTo(size*.2,size*.08);
    ctx.quadraticCurveTo(size*.48,size*.12,size*.44,size*.32); ctx.quadraticCurveTo(size*.1,size*.48,-size*.3,size*.3); ctx.lineTo(-size*.38,-size*.08); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='#62d38a'; ctx.lineWidth=Math.max(2,size*.07);
    for(let line=-1;line<=1;line++){
      ctx.beginPath(); ctx.moveTo(-size*.12,line*size*.08-size*.18); ctx.lineTo(size*.15,line*size*.08-size*.13); ctx.stroke();
    }
    ctx.restore();
  } else if(item.id === 'fangs'){
    ctx.save();
    ctx.strokeStyle='#e9edf4'; ctx.fillStyle='#bac5d4'; ctx.lineWidth=2;
    for(let knife=-1;knife<=1;knife++){
      const offset=knife*size*.22;
      ctx.beginPath(); ctx.moveTo(offset-size*.08,-size*.28); ctx.lineTo(offset+size*.1,size*.25); ctx.lineTo(offset+size*.22,size*.34); ctx.lineTo(offset+size*.05,-size*.1); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle='#5e6b7b'; ctx.lineWidth=Math.max(2,size*.08);
    ctx.beginPath(); ctx.moveTo(-size*.38,size*.34); ctx.lineTo(size*.38,size*.34); ctx.stroke();
    ctx.restore();
  } else if(item.id === 'munition'){
    ctx.save();
    ctx.rotate(-0.28);
    ctx.fillStyle='#a62f35'; ctx.strokeStyle='#24131c'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(-size*.08,-size*.42); ctx.lineTo(size*.12,-size*.42); ctx.lineTo(size*.13,size*.17); ctx.lineTo(size*.42,size*.39); ctx.lineTo(size*.28,size*.5); ctx.lineTo(-size*.05,size*.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#11131d'; ctx.fillRect(-size*.15,-size*.47,size*.3,size*.13);
    ctx.fillStyle='#e14b42'; ctx.beginPath(); ctx.arc(size*.02,-size*.51,size*.08,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#f28b56'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(size*.19,size*.23); ctx.lineTo(size*.35,size*.39); ctx.stroke();
    ctx.restore();
  } else if(item.id === 'brainAss'){
    ctx.save();
    ctx.shadowColor='#ff638d'; ctx.shadowBlur=12;
    const shape=ctx.createLinearGradient(-size*.35,-size*.35,size*.32,size*.4);
    shape.addColorStop(0,'#ffc0cf'); shape.addColorStop(.5,'#e94d82'); shape.addColorStop(1,'#76244f');
    ctx.fillStyle=shape; ctx.strokeStyle='#ffe0a8'; ctx.lineWidth=Math.max(1.5,size*.05);
    ctx.beginPath(); ctx.moveTo(-size*.31,-size*.25); ctx.quadraticCurveTo(-size*.1,-size*.42,0,-size*.23);
    ctx.quadraticCurveTo(size*.14,-size*.42,size*.31,-size*.22); ctx.lineTo(size*.25,size*.2);
    ctx.quadraticCurveTo(0,size*.45,-size*.25,size*.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur=0; ctx.strokeStyle='#ffd7e1'; ctx.lineWidth=Math.max(1.2,size*.035);
    ctx.beginPath(); ctx.moveTo(-size*.13,-size*.12); ctx.bezierCurveTo(-size*.28,-size*.02,-size*.05,size*.02,-size*.18,size*.13);
    ctx.moveTo(size*.13,-size*.12); ctx.bezierCurveTo(size*.28,-size*.02,size*.05,size*.02,size*.18,size*.13); ctx.stroke();
    ctx.restore();
  } else if(item.id === 'eggGolly'){
    ctx.save();
    ctx.rotate(-0.12);
    const egg=ctx.createLinearGradient(-size*.3,-size*.4,size*.3,size*.4);
    egg.addColorStop(0,'#f4ffff'); egg.addColorStop(0.42,'#8be9fd'); egg.addColorStop(1,'#2876a5');
    ctx.fillStyle=egg; ctx.strokeStyle='#d9fbff'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,-size*.43);
    ctx.bezierCurveTo(size*.3,-size*.35,size*.4,size*.12,size*.2,size*.38);
    ctx.quadraticCurveTo(0,size*.55,-size*.2,size*.38);
    ctx.bezierCurveTo(-size*.4,size*.12,-size*.3,-size*.35,0,-size*.43);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.ellipse(-size*.1,-size*.17,size*.07,size*.13,-0.35,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(28,106,144,0.7)';
    ctx.beginPath(); ctx.arc(size*.12,size*.1,size*.045,0,Math.PI*2); ctx.arc(-size*.08,size*.22,size*.035,0,Math.PI*2); ctx.fill();
    ctx.restore();
  } else if(item.id === 'evsyutin' || item.id === 'girfsyutin'){
    ctx.save(); const skin=item.id==='girfsyutin'?'#d88453':'#c88f6f';
    ctx.fillStyle=skin; ctx.strokeStyle='#552d2b'; ctx.lineWidth=Math.max(1.5,size*.05);
    ctx.beginPath(); ctx.ellipse(0,size*.05,size*.3,size*.38,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#f4c49a'; ctx.beginPath(); ctx.ellipse(-size*.11,-size*.08,size*.06,size*.04,0,0,Math.PI*2);ctx.ellipse(size*.11,-size*.08,size*.06,size*.04,0,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#7b3a35';ctx.beginPath();ctx.arc(0,size*.08,size*.13,0,Math.PI);ctx.stroke();ctx.restore();
  } else if(item.id === 'mantledSteel' || item.id === 'manaTome'){
    ctx.save(); ctx.fillStyle=item.id==='mantledSteel'?'#8798aa':'#5cc8e4'; ctx.strokeStyle='#e3f7ff'; ctx.lineWidth=Math.max(1.5,size*.05);
    ctx.beginPath();ctx.moveTo(-size*.3,-size*.38);ctx.lineTo(size*.3,-size*.28);ctx.lineTo(size*.22,size*.4);ctx.lineTo(-size*.34,size*.28);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle=item.id==='mantledSteel'?'#d9efff':'#f9ffff';ctx.lineWidth=Math.max(1,size*.035);ctx.beginPath();ctx.moveTo(-size*.12,-size*.2);ctx.lineTo(size*.15,size*.24);ctx.moveTo(size*.12,-size*.23);ctx.lineTo(-size*.14,size*.22);ctx.stroke();ctx.restore();
  } else if(item.id === 'manaHooves' || item.id === 'hatchet'){
    ctx.save(); ctx.strokeStyle='#d9a56a';ctx.lineWidth=Math.max(2,size*.09);ctx.beginPath();ctx.moveTo(0,-size*.4);ctx.lineTo(0,size*.35);ctx.stroke();
    ctx.fillStyle=item.id==='hatchet'?'#cbd9e8':'#a97bda';ctx.strokeStyle='#f0d8ff';ctx.lineWidth=Math.max(1.5,size*.045);
    if(item.id==='hatchet'){ctx.beginPath();ctx.moveTo(0,-size*.32);ctx.quadraticCurveTo(size*.42,-size*.25,size*.38,size*.08);ctx.quadraticCurveTo(size*.18,size*.25,0,size*.22);ctx.closePath();}
    else {ctx.beginPath();ctx.ellipse(0,-size*.18,size*.28,size*.2,-.35,0,Math.PI*2);}
    ctx.fill();ctx.stroke();ctx.restore();
  } else if(item.id === 'aghanimHead' || item.id === 'aghanimScepter'){
    ctx.save();ctx.rotate(-.12);ctx.fillStyle='#8f5ad8';ctx.strokeStyle='#f5d5ff';ctx.lineWidth=Math.max(1.5,size*.05);
    ctx.beginPath();ctx.moveTo(-size*.22,size*.4);ctx.lineTo(-size*.1,-size*.12);ctx.lineTo(-size*.3,-size*.3);ctx.lineTo(0,-size*.46);ctx.lineTo(size*.3,-size*.3);ctx.lineTo(size*.1,-size*.12);ctx.lineTo(size*.22,size*.4);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#ffec85';ctx.beginPath();ctx.arc(0,-size*.28,size*.1,0,Math.PI*2);ctx.fill();ctx.restore();
  } else if(item.id === 'ilyaHair'){
    ctx.save();ctx.fillStyle='#24222c';ctx.strokeStyle='#b7c7da';ctx.lineWidth=Math.max(1.5,size*.05);ctx.beginPath();ctx.moveTo(-size*.36,size*.35);ctx.quadraticCurveTo(-size*.46,-size*.2,-size*.2,-size*.4);ctx.quadraticCurveTo(0,-size*.52,size*.2,-size*.4);ctx.quadraticCurveTo(size*.46,-size*.2,size*.36,size*.35);ctx.lineTo(size*.12,size*.16);ctx.lineTo(0,size*.38);ctx.lineTo(-size*.12,size*.16);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  } else if(item.id === 'enemy302'){
    ctx.save();ctx.fillStyle='#b5c5d7';ctx.strokeStyle='#493c72';ctx.lineWidth=Math.max(1.5,size*.05);ctx.beginPath();ctx.roundRect(-size*.32,-size*.34,size*.64,size*.68,size*.12);ctx.fill();ctx.stroke();ctx.fillStyle='#6f4e9c';ctx.fillRect(-size*.2,-size*.22,size*.4,size*.12);ctx.fillRect(-size*.2,size*.04,size*.28,size*.12);ctx.restore();
  } else if(item.id === 'tornBrainHand'){
    ctx.save();ctx.strokeStyle='#d7a879';ctx.lineWidth=Math.max(3,size*.13);ctx.beginPath();ctx.moveTo(-size*.3,size*.35);ctx.lineTo(size*.2,-size*.18);ctx.stroke();ctx.fillStyle='#d7a879';ctx.strokeStyle='#744631';ctx.lineWidth=Math.max(1,size*.04);for(let finger=-2;finger<=2;finger++){ctx.beginPath();ctx.ellipse(size*.24+finger*size*.08,-size*.25+Math.abs(finger)*size*.03,size*.05,size*.18,finger*.18,0,Math.PI*2);ctx.fill();ctx.stroke();}ctx.restore();
  } else if(item.id === 'arcadiaScar' || item.id === 'kinglandia'){
    ctx.save();ctx.fillStyle=item.id==='kinglandia'?'#e6b64f':'#c44f35';ctx.strokeStyle='#ffe1a0';ctx.lineWidth=Math.max(1.5,size*.05);ctx.beginPath();ctx.moveTo(-size*.34,size*.28);ctx.lineTo(-size*.1,-size*.3);ctx.lineTo(size*.04,size*.18);ctx.lineTo(size*.2,-size*.4);ctx.lineTo(size*.35,size*.28);ctx.quadraticCurveTo(0,size*.48,-size*.34,size*.28);ctx.fill();ctx.stroke();ctx.restore();
  } else if(item.id === 'gur'){
    ctx.save();ctx.fillStyle='#58c7bf';ctx.strokeStyle='#d8fff1';ctx.lineWidth=Math.max(1.5,size*.05);ctx.beginPath();ctx.ellipse(-size*.16,size*.2,size*.2,size*.2,0,0,Math.PI*2);ctx.ellipse(size*.15,size*.16,size*.24,size*.18,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#b9fff1';ctx.beginPath();ctx.moveTo(0,size*.02);ctx.lineTo(0,-size*.4);ctx.stroke();ctx.restore();
  } else if(item.id === 'dagonEmpire'){
    ctx.save();ctx.fillStyle='#c53c9c';ctx.strokeStyle='#ffd1ff';ctx.lineWidth=Math.max(1.5,size*.05);ctx.beginPath();ctx.moveTo(-size*.08,size*.43);ctx.lineTo(size*.08,size*.43);ctx.lineTo(size*.13,-size*.18);ctx.lineTo(size*.3,-size*.36);ctx.lineTo(0,-size*.46);ctx.lineTo(-size*.3,-size*.36);ctx.lineTo(-size*.13,-size*.18);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#fff08c';ctx.beginPath();ctx.arc(0,-size*.29,size*.07,0,Math.PI*2);ctx.fill();ctx.restore();
  } else if(item.id === 'brainEye'){
    ctx.save();ctx.fillStyle='#d9b7aa';ctx.strokeStyle='#6e3c4a';ctx.lineWidth=Math.max(1.5,size*.05);ctx.beginPath();ctx.moveTo(-size*.42,0);ctx.quadraticCurveTo(0,-size*.38,size*.42,0);ctx.quadraticCurveTo(0,size*.38,-size*.42,0);ctx.fill();ctx.stroke();ctx.fillStyle='#d34e66';ctx.beginPath();ctx.arc(0,0,size*.15,0,Math.PI*2);ctx.fill();ctx.fillStyle='#211523';ctx.beginPath();ctx.arc(0,0,size*.06,0,Math.PI*2);ctx.fill();ctx.restore();
  } else if(item.id === 'kayaSange'){
    ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
    /* Санга — клинок */
    ctx.save(); ctx.rotate(0.62);
    const blade=ctx.createLinearGradient(-size*.06,-size*.46,size*.06,size*.1);
    blade.addColorStop(0,'#ffffff'); blade.addColorStop(.5,'#cfd9e6'); blade.addColorStop(1,'#7d8aa0');
    ctx.fillStyle=blade; ctx.strokeStyle='#2c3550'; ctx.lineWidth=Math.max(1,size*.035);
    ctx.beginPath(); ctx.moveTo(0,-size*.5); ctx.lineTo(size*.075,-size*.34); ctx.lineTo(size*.065,size*.08); ctx.lineTo(-size*.065,size*.08); ctx.lineTo(-size*.075,-size*.34); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#e6b94e'; ctx.fillRect(-size*.19,size*.08,size*.38,size*.07); ctx.strokeRect(-size*.19,size*.08,size*.38,size*.07);
    ctx.fillStyle='#8a2b3a'; ctx.fillRect(-size*.04,size*.15,size*.08,size*.22);
    ctx.fillStyle='#e6b94e'; ctx.beginPath(); ctx.arc(0,size*.4,size*.055,0,Math.PI*2); ctx.fill();
    ctx.restore();
    /* Кая — посох с синим камнем */
    ctx.save(); ctx.rotate(-0.62);
    ctx.strokeStyle='#5b3d27'; ctx.lineWidth=Math.max(2,size*.07);
    ctx.beginPath(); ctx.moveTo(0,size*.46); ctx.lineTo(0,-size*.18); ctx.stroke();
    ctx.strokeStyle='#e6b94e'; ctx.lineWidth=Math.max(1.5,size*.04);
    ctx.beginPath(); ctx.arc(0,-size*.26,size*.13,0.2*Math.PI,0.8*Math.PI,true); ctx.stroke();
    ctx.shadowColor='#6fb2ff'; ctx.shadowBlur=14;
    const orb=ctx.createRadialGradient(-size*.03,-size*.31,size*.01,0,-size*.27,size*.14);
    orb.addColorStop(0,'#ffffff'); orb.addColorStop(.35,'#8fd0ff'); orb.addColorStop(1,'#2b5fd0');
    ctx.fillStyle=orb; ctx.beginPath(); ctx.arc(0,-size*.27,size*.115,0,Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.restore();
  } else if(item.id === 'windWaker'){
    ctx.save(); ctx.lineCap='round';
    ctx.shadowColor='#7fe9d4'; ctx.shadowBlur=12;
    /* воронка урагана */
    for(let ring=0; ring<5; ring++){
      const t=ring/4, y=-size*.36+t*size*.7, w=size*(.36-.27*t);
      const g=ctx.createLinearGradient(-w,y,w,y);
      g.addColorStop(0,'rgba(127,233,212,.15)'); g.addColorStop(.5,'rgba(235,255,250,.95)'); g.addColorStop(1,'rgba(60,170,170,.35)');
      ctx.strokeStyle=g; ctx.lineWidth=Math.max(1.5,size*(.07-.03*t));
      ctx.beginPath(); ctx.ellipse(0.04*size*Math.sin(ring*1.7),y,w,size*.065,0,0,Math.PI*2); ctx.stroke();
    }
    ctx.shadowBlur=0;
    /* кружащие частицы и маленькая птица-вертушка */
    ctx.fillStyle='#e9fff9';
    for(const [px,py,pr] of [[-.34,-.3,.03],[.36,-.12,.025],[-.3,.22,.025],[.28,.34,.03]]){ ctx.beginPath(); ctx.arc(size*px,size*py,size*pr,0,Math.PI*2); ctx.fill(); }
    ctx.strokeStyle='#bffff0'; ctx.lineWidth=Math.max(1,size*.04);
    ctx.beginPath(); ctx.moveTo(-size*.42,-size*.1); ctx.quadraticCurveTo(-size*.2,-size*.2,-size*.06,-size*.08); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(size*.42,size*.12); ctx.quadraticCurveTo(size*.2,size*.22,size*.07,size*.1); ctx.stroke();
    ctx.restore();
  } else if(item.id === 'holyLocket'){
    ctx.save(); ctx.lineJoin='round'; ctx.lineCap='round';
    /* цепочка */
    ctx.strokeStyle='#d8b45a'; ctx.lineWidth=Math.max(1.5,size*.045); ctx.setLineDash([size*.07,size*.04]);
    ctx.beginPath(); ctx.moveTo(-size*.3,-size*.46); ctx.quadraticCurveTo(0,-size*.18,size*.3,-size*.46); ctx.stroke(); ctx.setLineDash([]);
    /* корпус медальона */
    ctx.shadowColor='#ffd978'; ctx.shadowBlur=14;
    const gold=ctx.createLinearGradient(-size*.3,-size*.2,size*.3,size*.4);
    gold.addColorStop(0,'#fff2b8'); gold.addColorStop(.45,'#f0b94a'); gold.addColorStop(1,'#9a6420');
    ctx.fillStyle=gold; ctx.strokeStyle='#5e3a12'; ctx.lineWidth=Math.max(1.5,size*.045);
    ctx.beginPath(); ctx.arc(0,size*.12,size*.33,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
    ctx.fillStyle='#fff7da'; ctx.beginPath(); ctx.arc(0,size*.12,size*.25,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#e0a840'; ctx.lineWidth=Math.max(1,size*.03); ctx.stroke();
    /* сердце с крестом */
    ctx.fillStyle='#e0455f';
    ctx.beginPath(); ctx.moveTo(0,size*.3); ctx.bezierCurveTo(-size*.26,size*.12,-size*.16,-size*.04,0,size*.06); ctx.bezierCurveTo(size*.16,-size*.04,size*.26,size*.12,0,size*.3); ctx.fill();
    ctx.fillStyle='#fff'; ctx.fillRect(-size*.025,size*.08,size*.05,size*.14); ctx.fillRect(-size*.07,size*.12,size*.14,size*.05);
    /* камешек и ушко */
    ctx.fillStyle='#7ee8ff'; ctx.beginPath(); ctx.arc(0,-size*.24,size*.05,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='#5e3a12'; ctx.lineWidth=Math.max(1,size*.025); ctx.stroke();
    ctx.restore();
  } else if(item.id === 'nullifier'){
    ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.shadowColor='#a45cff'; ctx.shadowBlur=16;
    const orbN=ctx.createRadialGradient(-size*.1,-size*.12,size*.03,0,0,size*.42);
    orbN.addColorStop(0,'#c9a4ff'); orbN.addColorStop(.45,'#6a35c9'); orbN.addColorStop(1,'#1b0b3b');
    ctx.fillStyle=orbN; ctx.strokeStyle='#e5d2ff'; ctx.lineWidth=Math.max(1.5,size*.05);
    ctx.beginPath(); ctx.arc(0,0,size*.36,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
    /* печать пустоты: перечёркнутое кольцо */
    ctx.strokeStyle='#f3e9ff'; ctx.lineWidth=Math.max(2,size*.07);
    ctx.beginPath(); ctx.arc(0,0,size*.2,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-size*.14,size*.14); ctx.lineTo(size*.14,-size*.14); ctx.stroke();
    /* осколки по краям */
    ctx.fillStyle='#d9bcff';
    for(const a of [-2.5,-0.6,0.9,2.3]){
      const bx=Math.cos(a)*size*.4, by=Math.sin(a)*size*.4;
      ctx.beginPath(); ctx.moveTo(bx+Math.cos(a)*size*.13,by+Math.sin(a)*size*.13); ctx.lineTo(bx+Math.cos(a+1.6)*size*.05,by+Math.sin(a+1.6)*size*.05); ctx.lineTo(bx+Math.cos(a-1.6)*size*.05,by+Math.sin(a-1.6)*size*.05); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  } else if(item.id === 'disperser'){
    ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
    /* расходящиеся волны */
    ctx.strokeStyle='rgba(111,224,255,.55)'; ctx.lineWidth=Math.max(1,size*.035);
    for(const r of [.3,.42]){ ctx.beginPath(); ctx.arc(0,0,size*r,0,Math.PI*2); ctx.stroke(); }
    /* перо-кристалл */
    ctx.shadowColor='#6fe0ff'; ctx.shadowBlur=14;
    const feather=ctx.createLinearGradient(-size*.2,size*.4,size*.2,-size*.4);
    feather.addColorStop(0,'#1f78c4'); feather.addColorStop(.5,'#6fe0ff'); feather.addColorStop(1,'#f2ffff');
    ctx.fillStyle=feather; ctx.strokeStyle='#e5ffff'; ctx.lineWidth=Math.max(1.5,size*.04);
    ctx.beginPath(); ctx.moveTo(-size*.22,size*.4); ctx.quadraticCurveTo(-size*.3,-size*.05,size*.18,-size*.42);
    ctx.quadraticCurveTo(size*.36,-size*.02,size*.02,size*.2); ctx.quadraticCurveTo(-size*.08,size*.3,-size*.22,size*.4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=Math.max(1,size*.03);
    ctx.beginPath(); ctx.moveTo(-size*.2,size*.38); ctx.quadraticCurveTo(-size*.02,size*.0,size*.16,-size*.36); ctx.stroke();
    /* искры, разлетающиеся в стороны */
    ctx.fillStyle='#e8ffff';
    for(const [px,py,pr] of [[.38,.22,.035],[.3,.36,.025],[-.38,-.26,.03],[-.3,-.38,.022],[.4,-.3,.025]]){ ctx.beginPath(); ctx.arc(size*px,size*py,size*pr,0,Math.PI*2); ctx.fill(); }
    ctx.restore();
  } else if(item.id === 'zamist'){
    ctx.save();
    ctx.strokeStyle='#ff5361'; ctx.fillStyle='#ff5361'; ctx.lineWidth=Math.max(2.5,size*.075); ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.shadowColor='#f02f49'; ctx.shadowBlur=10;
    for(const direction of [1,-1]){
      const y=direction*size*.16, startX=-direction*size*.32, endX=direction*size*.32;
      ctx.beginPath(); ctx.moveTo(startX,y); ctx.lineTo(endX,y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(endX-direction*size*.15,y-size*.13); ctx.lineTo(endX,y); ctx.lineTo(endX-direction*size*.15,y+size*.13); ctx.stroke();
    }
    ctx.restore();
  } else {
    const seed = Array.from(String(item.id || '')).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = item.color || '#8be9fd';
    ctx.strokeStyle = 'rgba(255,255,255,0.62)';
    ctx.lineWidth = Math.max(1, size * 0.045);
    ctx.beginPath();
    for(let point=0; point<7; point++){
      const angle = point * Math.PI * 2 / 7 - Math.PI / 2;
      const radius = size * (0.16 + ((seed + point * 17) % 9) / 28);
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if(point === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = 0.72;
    ctx.beginPath(); ctx.arc((seed % 5 - 2) * size * 0.08, ((seed >> 2) % 5 - 2) * size * 0.08, size * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = item.color || '#8be9fd';
    ctx.globalAlpha = .78;
    ctx.beginPath(); ctx.arc(0,0,size*.22,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle='rgba(255,255,255,.75)'; ctx.lineWidth=Math.max(1,size*.04);
    ctx.beginPath(); ctx.moveTo(-size*.26,size*.22); ctx.lineTo(0,-size*.27); ctx.lineTo(size*.28,size*.22); ctx.stroke();
  }
  ctx.fillStyle = rarity;
  ctx.beginPath();
  ctx.arc(size*.34, size*.34, Math.max(2, size*.055), 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function getShopItemDescription(item, hero, itemId=null){
  if(!item) return '';
  const id = itemId || item.id;
  let description = item.desc;
  if(id === 'aghanimShard' && hero && hero.def){
    const shard = SHARD_SKILLS[hero.def.id];
    if(shard) description += ' Сейчас для ' + hero.def.name + ': ' + shard.name + ' — ' + shard.desc;
  }
  if(id === 'aghanimScepter' && hero && hero.def && SCEPTER_UPGRADES[hero.def.id]){
    description += ' Улучшение этого героя: ' + SCEPTER_UPGRADES[hero.def.id] + '.';
  }
  const manaCost = getActivationManaCost({id});
  if(manaCost > 0) description += ' Активация расходует ' + manaCost + ' маны.';
  return description;
}

function drawShop(){
  const h = playerHero;
  if(!h) return;
  const button = shopButtonRect();
  ctx.save();
  const buttonGradient=ctx.createLinearGradient(button.x,button.y,button.x,button.y+button.h);
  buttonGradient.addColorStop(0,shopOpen?'rgba(70,56,32,0.96)':'rgba(24,28,34,0.96)'); buttonGradient.addColorStop(1,'rgba(8,10,14,0.98)');
  ctx.fillStyle=buttonGradient; ctx.fillRect(button.x,button.y,button.w,button.h);
  ctx.strokeStyle=shopOpen?'#e2c07a':'rgba(150,125,80,0.8)'; ctx.lineWidth=2; ctx.strokeRect(button.x,button.y,button.w,button.h);
  const cx=button.x+20, cy=button.y+button.h/2;
  ctx.fillStyle='#e8b93c'; ctx.beginPath(); ctx.arc(cx,cy,9,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#8a6414'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#fff1b8'; ctx.font='bold 11px Consolas, monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('$',cx,cy+0.5);
  ctx.textBaseline='alphabetic';
  ctx.fillStyle='#ffd568'; ctx.font='bold '+(VW<720?15:19)+'px Segoe UI, Arial'; ctx.textAlign='left';
  ctx.fillText(String(Math.floor(h.coins)),button.x+36,button.y+button.h/2+7);
  ctx.fillStyle='rgba(255,255,255,0.78)'; ctx.font='bold 11px Segoe UI, Arial'; ctx.textAlign='right';
  ctx.fillText(shopOpen?'ЗАКРЫТЬ':'МАГАЗИН',button.x+button.w-10,button.y+button.h/2+4);
  if(!shopOpen){ ctx.restore(); return; }
  const {r, detailsW, columns, visibleRows, totalRows} = shopLayout();
  const shopGradient=ctx.createLinearGradient(r.x,r.y,r.x+r.w,r.y+r.h);
  shopGradient.addColorStop(0,'rgba(35,48,60,0.99)'); shopGradient.addColorStop(0.48,'rgba(18,27,36,0.99)'); shopGradient.addColorStop(1,'rgba(7,12,18,0.99)');
  ctx.fillStyle=shopGradient; ctx.fillRect(r.x,r.y,r.w,r.h);
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x+8,r.y+50,r.w-16,r.h-58); ctx.clip();
  ctx.strokeStyle='rgba(125,168,194,0.07)'; ctx.lineWidth=1;
  for(let offset=-r.h;offset<r.w;offset+=34){
    ctx.beginPath(); ctx.moveTo(r.x+offset,r.y+r.h); ctx.lineTo(r.x+offset+r.h,r.y+50); ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle='#c7a96b'; ctx.lineWidth=3; ctx.strokeRect(r.x,r.y,r.w,r.h);
  ctx.strokeStyle='rgba(243,208,145,0.42)'; ctx.lineWidth=1; ctx.strokeRect(r.x+6,r.y+6,r.w-12,r.h-12);
  const headerGradient=ctx.createLinearGradient(r.x,r.y,r.x+r.w,r.y+44);
  headerGradient.addColorStop(0,'rgba(114,65,52,0.92)'); headerGradient.addColorStop(0.52,'rgba(44,54,63,0.97)'); headerGradient.addColorStop(1,'rgba(18,26,34,0.96)');
  ctx.fillStyle=headerGradient; ctx.fillRect(r.x+8,r.y+8,r.w-16,38);
  ctx.strokeStyle='rgba(229,192,128,0.72)'; ctx.lineWidth=1; ctx.strokeRect(r.x+8,r.y+8,r.w-16,38);
  ctx.fillStyle='#eac37c'; ctx.shadowColor='#d29d52'; ctx.shadowBlur=12;
  ctx.beginPath(); ctx.arc(r.x+28,r.y+27,8+Math.sin(gameTime*4)*1.5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle='rgba(106,155,184,0.045)'; ctx.fillRect(r.x+8,r.y+50,r.w-16,r.h-58);
  ctx.textAlign='left'; ctx.fillStyle='#f1d49b'; ctx.font='bold 20px Georgia, serif';
  ctx.fillText('МАГАЗИН',r.x+48,r.y+32);
  ctx.textAlign='right'; ctx.fillStyle='#ffe9bd'; ctx.font='bold 16px Georgia, serif';
  ctx.fillText(h.coins + ' монет',r.x+r.w-214,r.y+32);
  const guideButton=shopGuideButtonRect();
  ctx.fillStyle=shopGuideOpen ? '#d7b36a' : 'rgba(182,134,67,0.22)';
  ctx.fillRect(guideButton.x,guideButton.y,guideButton.w,guideButton.h);
  ctx.strokeStyle=shopGuideOpen ? '#fff0c7' : '#b58a55'; ctx.lineWidth=1.2; ctx.strokeRect(guideButton.x,guideButton.y,guideButton.w,guideButton.h);
  ctx.fillStyle=shopGuideOpen ? '#111821' : '#f0d9aa'; ctx.font='bold 11px Segoe UI, Arial'; ctx.textAlign='center';
  ctx.fillText('✦  ОТ СОЗДАТЕЛЕЙ',guideButton.x+guideButton.w/2,guideButton.y+19);
  if(shopGuideOpen){
    drawCreatorGuide();
    ctx.restore();
    return;
  }
  const entries=SHOP_ITEM_VIEWS;
  let hoveredShopItem = null;
  for(let i=0;i<entries.length;i++){
    const itemRow = Math.floor(i/columns);
    if(itemRow < shopScrollRow || itemRow >= shopScrollRow + visibleRows) continue;
    const item=entries[i], ir=shopItemRect(i);
    const hovered=mouse.x>=ir.x&&mouse.x<=ir.x+ir.w&&mouse.y>=ir.y&&mouse.y<=ir.y+ir.h;
    if(hovered) hoveredShopItem = SHOP_ITEM_IDS[i];
    const itemGradient=ctx.createLinearGradient(ir.x,ir.y,ir.x,ir.y+ir.h);
    itemGradient.addColorStop(0,hovered?'rgba(111,145,160,0.52)':'rgba(43,57,68,0.92)'); itemGradient.addColorStop(1,hovered?'rgba(67,51,47,0.98)':'rgba(13,20,27,0.98)');
    ctx.fillStyle=itemGradient; ctx.fillRect(ir.x,ir.y,ir.w,ir.h);
    ctx.strokeStyle=item.color; ctx.lineWidth=hovered?2:1; ctx.strokeRect(ir.x,ir.y,ir.w,ir.h);
    if(hovered){
      ctx.strokeStyle='rgba(255,255,255,0.6)'; ctx.lineWidth=1; ctx.strokeRect(ir.x+3,ir.y+3,ir.w-6,ir.h-6);
    }
    ctx.fillStyle='rgba(255,231,185,0.08)'; ctx.fillRect(ir.x+4,ir.y+4,ir.w-8,3);
    drawItemIcon(item,ir.x+ir.w/2,ir.y+ir.h/2,Math.min(54,ir.w-12));
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
  const selected = hoveredShopItem ? SHOP_ITEMS[hoveredShopItem] : null;
  if(selected){
    const panelW = detailsW ? detailsW : Math.min(300,r.w-20);
    const panelH = detailsW ? 420 : Math.min(220,r.h-76);
    const panelX = detailsW ? r.x + r.w - detailsW - 10 : clamp(mouse.x+14,r.x+10,r.x+r.w-panelW-10);
    const panelY = detailsW ? r.y + 54 : clamp(mouse.y+14,r.y+54,r.y+r.h-panelH-8);
    ctx.fillStyle='rgba(11,14,15,0.98)'; ctx.fillRect(panelX,panelY,panelW,panelH);
    ctx.strokeStyle='#b58a55'; ctx.lineWidth=2; ctx.strokeRect(panelX,panelY,panelW,panelH);
    ctx.fillStyle='rgba(190,145,78,0.16)'; ctx.fillRect(panelX+1,panelY+40,panelW-2,1);
    ctx.textAlign='left'; ctx.fillStyle=selected.color; ctx.font='bold 16px Georgia, serif';
    ctx.fillText(selected.name + '  •  ' + selected.cost + ' монет',panelX+16,panelY+28);
    drawWrappedText(getShopItemDescription(selected, h, hoveredShopItem || selectedShopItem), panelX+16, panelY+58, panelW-32, 18, '#fff', '13px Segoe UI, Arial');
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='11px Segoe UI, Arial';
    ctx.fillText(selected.active ? 'Активный предмет' : 'Пассивный предмет',panelX+16,panelY+panelH-14);
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
  drawWrappedText(getShopItemDescription(item, playerHero, pendingPurchaseId),VW/2-190,panel.y+75,380,18,'rgba(255,255,255,0.72)','13px Segoe UI, Arial');
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
  for(let i=0;i<6;i++){
    const r=inventorySlotRect(i), item=playerHero.inventory[i];
    const cooling=!!item&&item.cooldown>0;
    const tile=ctx.createLinearGradient(r.x,r.y,r.x,r.y+r.h);
    tile.addColorStop(0,item?(cooling?'rgba(34,38,44,0.96)':'rgba(37,48,62,0.96)'):'rgba(13,19,28,0.94)');
    tile.addColorStop(1,'rgba(4,8,14,0.98)');
    ctx.fillStyle=tile; ctx.fillRect(r.x,r.y,r.w,r.h);
    ctx.strokeStyle=item ? (cooling?'#68717b':item.color) : 'rgba(255,255,255,0.25)'; ctx.lineWidth=item?2:1.5; ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.strokeStyle='rgba(255,255,255,0.16)'; ctx.lineWidth=1; ctx.strokeRect(r.x+3,r.y+3,r.w-6,r.h-6);
    ctx.textAlign='center'; ctx.font='bold 20px Segoe UI, Arial'; ctx.fillStyle=item ? item.color : 'rgba(255,255,255,0.25)';
    const icon = item ? (item.id==='mango' ? '◆' : item.id==='tango' ? '♣' : item.id==='fangs' ? '✦' : item.id==='bkb' ? '✚' : item.id==='pt' ? '◆' : item.id==='blink' ? '◇' : item.id==='evsyutin' ? '♥' : item.id==='mantledSteel' ? '▣' : item.id==='manaTome' ? '✧' : item.id==='manaHooves' ? '♢' : item.id==='superBoots' ? '⬆' : item.id==='aghanimHead' ? '✹' : item.id==='ilyaHair' ? '☄' : item.id==='aghanimShard' ? '⬢' : item.id==='aghanimScepter' ? '✹' : item.id==='enemy302' ? '⌛' : item.id==='tornBrainHand' ? '☠' : item.id==='munition' ? '⚙' : item.id==='hatchet' ? '🪓' : item.id==='satanic' ? '♦' : item.id==='arcadiaScar' ? '✦' : item.id==='kinglandia' ? '♛' : item.id==='gur' ? '⬆' : item.id==='brainEye' ? '◉' : item.id==='dianaPants' ? '♡' : item.id==='girfsyutin' ? '♥' : '▲') : '-';
    ctx.save();
    if(cooling) ctx.filter='grayscale(1)';
    drawItemIcon(item,r.x+r.w/2,r.y+r.h/2,Math.min(42,r.w-10));
    ctx.restore();
    if(item && item.id==='holyLocket'){
      ctx.save(); ctx.textAlign='right'; ctx.textBaseline='alphabetic';
      ctx.font='bold '+Math.max(10,Math.min(14,r.w*.28))+'px Consolas, monospace';
      ctx.fillStyle='rgba(0,0,0,.65)'; ctx.fillText(String(Math.floor(item.charges||0)),r.x+r.w-4,r.y+r.h-5);
      ctx.fillStyle='#ffd978'; ctx.fillText(String(Math.floor(item.charges||0)),r.x+r.w-5,r.y+r.h-6);
      ctx.restore();
    }
    if(cooling){
      ctx.fillStyle='rgba(3,6,10,0.54)'; ctx.fillRect(r.x+3,r.y+3,r.w-6,r.h-6);
      ctx.fillStyle='#f1f3f5'; ctx.font='bold '+Math.max(10,Math.min(15,r.w*.32))+'px Consolas, monospace';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.shadowColor='rgba(0,0,0,0.9)'; ctx.shadowBlur=4;
      ctx.fillText(String(Math.ceil(item.cooldown)),r.x+r.w/2,r.y+r.h/2);
      ctx.shadowBlur=0; ctx.textBaseline='alphabetic';
    }
    if(item && item.activeTimer>0){
      const configuredDuration=SHOP_ITEMS[item.id]?.activeDuration;
      const activeDuration=configuredDuration||(item.id==='bkb'||item.id==='aghanimHead'?10:item.activeTimer);
      const badgeX=r.x+r.w-9, badgeY=r.y+9, radius=8;
      ctx.fillStyle='rgba(3,8,14,0.96)'; ctx.beginPath(); ctx.arc(badgeX,badgeY,radius+2,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.24)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(badgeX,badgeY,radius,0,Math.PI*2); ctx.stroke();
      ctx.strokeStyle=item.color||'#8be9fd'; ctx.lineWidth=2.5; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(badgeX,badgeY,radius,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(item.activeTimer/activeDuration,0,1)); ctx.stroke();
      ctx.fillStyle='#fff'; ctx.font='bold 7px Consolas, monospace'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(String(Math.ceil(item.activeTimer)),badgeX,badgeY+0.5); ctx.textBaseline='alphabetic';
    }
    if(item && item.auraOn){
      ctx.font='bold 9px Segoe UI, Arial'; ctx.fillStyle='#72e6a5'; ctx.textAlign='left'; ctx.fillText('ВКЛ',r.x+5,r.y+r.h-5); ctx.textAlign='center';
    }
    ctx.font='10px Segoe UI, Arial'; ctx.fillStyle='rgba(255,255,255,0.65)'; ctx.fillText(inventoryBinds[i].toUpperCase(),r.x+r.w-7,r.y+r.h-5);
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
  return;
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
  const x=8, w=Math.min(390,VW*0.34), h=chatMessages.length*22+48, y=VH-minimapSize()-24-h;
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
  if(VW<720){
    const panelFill=ctx.createLinearGradient(panel.x,panel.y,panel.x,panel.y+panel.h);
    panelFill.addColorStop(0,'rgba(18,22,28,0.96)'); panelFill.addColorStop(1,'rgba(5,7,10,0.98)');
    ctx.beginPath(); ctx.roundRect(panel.x,panel.y,panel.w,panel.h,6); ctx.fillStyle=panelFill; ctx.fill();
    ctx.strokeStyle='rgba(150,125,80,0.7)'; ctx.lineWidth=2; ctx.stroke();
  if(VW<720){
    drawHeroTexture(hero.def,panel.x+8,panel.y+14,42,66,performance.now()/1000,false);
    const barX=stats.x+8, barW=panel.x+panel.w-12-barX, barH=10;
    ctx.textAlign='left'; ctx.fillStyle='#f2e2bd'; ctx.font='bold 12px Segoe UI, Arial';
    ctx.fillText(hero.def.name+'  •  Ур. '+hero.level,barX,panel.y+18);
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='9px Segoe UI, Arial';
    ctx.fillText('ЗДОРОВЬЕ',barX,panel.y+37);
    ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(barX,panel.y+41,barW,barH);
    ctx.fillStyle='#35c85a'; ctx.fillRect(barX,panel.y+41,barW*clamp(hero.hp/hero.maxHp,0,1),barH);
    ctx.fillStyle='#fff'; ctx.font='bold 9px Consolas, monospace';
    ctx.fillText(Math.ceil(hero.hp)+' / '+Math.ceil(hero.maxHp),barX+5,panel.y+50);
    ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.font='9px Segoe UI, Arial';
    ctx.fillText('МАНА',barX,panel.y+66);
    ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(barX,panel.y+70,barW,barH);
    ctx.fillStyle='#3988e8'; ctx.fillRect(barX,panel.y+70,barW*clamp(hero.mp/hero.maxMp,0,1),barH);
    ctx.fillStyle='#fff'; ctx.font='bold 9px Consolas, monospace';
    ctx.fillText(Math.ceil(hero.mp)+' / '+Math.ceil(hero.maxMp),barX+5,panel.y+79);
    ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.font='10px Segoe UI, Arial';
    ctx.fillText('АТАКА '+Math.round(hero.getDamage())+'  •  БРОНЯ '+Math.round(hero.getArmor()),barX,panel.y+101);
    ctx.restore();
    return;
  }
  }
  /* === Нижняя панель в стиле Dota 2: портрет | способности + HP/MP | предметы === */
  const panelFill=ctx.createLinearGradient(panel.x,panel.y,panel.x,panel.y+panel.h);
  panelFill.addColorStop(0,'rgba(24,26,30,0.97)'); panelFill.addColorStop(1,'rgba(6,7,9,0.99)');
  ctx.beginPath(); ctx.roundRect(panel.x,panel.y,panel.w,panel.h,[8,8,0,0]); ctx.fillStyle=panelFill; ctx.fill();
  ctx.strokeStyle='rgba(150,125,80,0.8)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(panel.x,panel.y+panel.h); ctx.lineTo(panel.x,panel.y+8); ctx.quadraticCurveTo(panel.x,panel.y,panel.x+8,panel.y);
  ctx.lineTo(panel.x+panel.w-8,panel.y); ctx.quadraticCurveTo(panel.x+panel.w,panel.y,panel.x+panel.w,panel.y+8); ctx.lineTo(panel.x+panel.w,panel.y+panel.h); ctx.stroke();

  /* портрет */
  const pt=layout.portrait;
  ctx.save();
  ctx.beginPath(); ctx.rect(pt.x,pt.y,pt.w,pt.h); ctx.clip();
  ctx.fillStyle='#07090c'; ctx.fillRect(pt.x,pt.y,pt.w,pt.h);
  drawHeroTexture(hero.def, pt.x+(pt.w-64)/2, pt.y+6, 64, pt.h-34, performance.now()/1000, false);
  const shade=ctx.createLinearGradient(0,pt.y+pt.h-30,0,pt.y+pt.h);
  shade.addColorStop(0,'rgba(0,0,0,0)'); shade.addColorStop(1,'rgba(0,0,0,0.85)');
  ctx.fillStyle=shade; ctx.fillRect(pt.x,pt.y+pt.h-30,pt.w,30);
  ctx.restore();
  ctx.strokeStyle=hero.def.color2||'#8b7a55'; ctx.lineWidth=2; ctx.strokeRect(pt.x,pt.y,pt.w,pt.h);
  ctx.textAlign='left'; ctx.font='bold 11px Consolas, monospace';
  ctx.fillStyle='#e8d9b0';
  ctx.fillText('⚔ '+Math.round(hero.getDamage()),pt.x+5,pt.y+pt.h-7);
  ctx.textAlign='right';
  ctx.fillText('🛡 '+Math.round(hero.getArmor()),pt.x+pt.w-5,pt.y+pt.h-7);
  /* имя над портретом и уровень */
  ctx.textAlign='left'; ctx.font='bold 12px Segoe UI, Arial'; ctx.fillStyle='#f2e2bd';
  ctx.strokeStyle='rgba(0,0,0,0.9)'; ctx.lineWidth=3;
  const nm=String(hero.def.name||'').toUpperCase();
  ctx.strokeText(nm,pt.x+22,panel.y-6); ctx.fillText(nm,pt.x+22,panel.y-6);
  ctx.beginPath(); ctx.arc(panel.x+pt.x-panel.x+10,panel.y-11,11,0,Math.PI*2);
  ctx.fillStyle='#141820'; ctx.fill(); ctx.strokeStyle='#c7a96b'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#fff0c7'; ctx.font='bold 12px Segoe UI, Arial'; ctx.textAlign='center';
  ctx.fillText(String(hero.level),pt.x+10,panel.y-7);

  /* полосы HP / MP */
  const drawBar=(r,frac,c1,c2,txt)=>{
    ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(r.x,r.y,r.w,r.h);
    const g=ctx.createLinearGradient(0,r.y,0,r.y+r.h); g.addColorStop(0,c1); g.addColorStop(1,c2);
    ctx.fillStyle=g; ctx.fillRect(r.x+1,r.y+1,(r.w-2)*clamp(frac,0,1),r.h-2);
    ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1; ctx.strokeRect(r.x+0.5,r.y+0.5,r.w-1,r.h-1);
    ctx.fillStyle='#fff'; ctx.font='bold '+Math.max(10,r.h-6)+'px Segoe UI, Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.shadowColor='rgba(0,0,0,0.9)'; ctx.shadowBlur=3;
    ctx.fillText(txt,r.x+r.w/2,r.y+r.h/2+0.5);
    ctx.shadowBlur=0; ctx.textBaseline='alphabetic';
  };
  drawBar(layout.hp,hero.hp/hero.maxHp,'#58d86a','#1f7d33',Math.ceil(hero.hp)+' / '+Math.ceil(hero.maxHp));
  drawBar(layout.mp,hero.mp/hero.maxMp,'#4d97f0','#1c4f9a',Math.ceil(hero.mp)+' / '+Math.ceil(hero.maxMp));

  /* разделитель между блоками */
  ctx.strokeStyle='rgba(150,125,80,0.3)'; ctx.lineWidth=1;
  const sepX=layout.items.x-6;
  ctx.beginPath(); ctx.moveTo(sepX,panel.y+14); ctx.lineTo(sepX,panel.y+panel.h-14); ctx.stroke();
  ctx.restore();
}

function formatClock(t){
  const neg = t < 0; t = Math.abs(Math.floor(t));
  return (neg ? '-' : '') + Math.floor(t/60) + ':' + String(t%60).padStart(2,'0');
}
function teamKills(team){
  let k = 0;
  for(const hero of heroes) if(hero && hero.type==='hero' && hero.team===team) k += hero.kills || 0;
  return k;
}
function drawMatchHeroStrip(){
  if(!heroes.length) return;
  const roster=heroes.filter(hero=>hero && hero.type==='hero' && hero.def);
  const left=roster.filter(hero=>hero.team===0), right=roster.filter(hero=>hero.team!==0);
  if(!roster.length) return;
  const compact=VW<760;
  const size=compact?30:44, gap=compact?3:4;
  const centerW=compact?118:176;
  const sideW=n=>n*size+Math.max(0,n-1)*gap;
  const cx=VW/2, top=0;
  const barH=size+8;
  const now=performance.now()/1000;
  ctx.save();
  /* общая тёмная плашка */
  const lw=sideW(left.length), rw=sideW(right.length);
  const x0=cx-centerW/2-lw-12, x1=cx+centerW/2+rw+12;
  ctx.fillStyle='rgba(6,8,11,0.86)';
  ctx.beginPath(); ctx.roundRect(x0,top-6,x1-x0,barH+6,[0,0,10,10]); ctx.fill();
  ctx.strokeStyle='rgba(150,125,80,0.6)'; ctx.lineWidth=1.5; ctx.stroke();
  const drawSide=(list,startX)=>{
    list.forEach((hero,i)=>{
      const px=startX+i*(size+gap), y=4, dead=!!hero.dead;
      ctx.save();
      ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(px,y,size,size);
      drawHeroStripIcon(hero.def,px,y,size,now,dead);
      ctx.restore();
      if(dead){
        ctx.fillStyle='rgba(8,10,14,0.55)'; ctx.fillRect(px,y,size,size);
        const cd=Math.ceil(hero.respawnTimer||0);
        if(cd>0){
          ctx.fillStyle='#fff'; ctx.font='bold '+Math.round(size*.42)+'px Segoe UI, Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText(String(cd),px+size/2,y+size/2); ctx.textBaseline='alphabetic';
        }
      }
      const frac=dead?0:clamp(hero.hp/hero.maxHp,0,1);
      ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(px,y+size+1,size,3);
      ctx.fillStyle=hero.team===0?'#4cc96c':'#d95a4a'; ctx.fillRect(px,y+size+1,size*frac,3);
      if(hero.isPlayer || hero===playerHero){
        ctx.strokeStyle='#ffe066'; ctx.lineWidth=1.5; ctx.strokeRect(px-0.5,y-0.5,size+1,size+1);
      }
    });
  };
  drawSide(left,cx-centerW/2-lw-4);
  drawSide(right,cx+centerW/2+4);
  /* центр: счёт и часы */
  const pre = prematchTime > 0;
  ctx.textAlign='center';
  const scoreFont='bold '+(compact?20:28)+'px Segoe UI, Arial';
  ctx.font=scoreFont;
  ctx.fillStyle='#7be08f'; ctx.fillText(String(teamKills(0)),cx-centerW/2+(compact?22:30),compact?26:34);
  ctx.fillStyle='#ff8d7d'; ctx.fillText(String(teamKills(1)),cx+centerW/2-(compact?22:30),compact?26:34);
  ctx.fillStyle='#fff'; ctx.font='bold '+(compact?14:17)+'px Segoe UI, Arial';
  ctx.fillText(pre?formatClock(-Math.ceil(prematchTime)):formatClock(gameTime),cx,compact?19:25);
  ctx.fillStyle=pre?'#ffd568':'rgba(255,255,255,0.45)'; ctx.font=(compact?9:10)+'px Segoe UI, Arial';
  if(pre) ctx.fillText('ДО БИТВЫ',cx,compact?33:41);
  ctx.restore();
}

function drawTopLeftStats(h){
  if(testMode || !h) return;
  const x=8, y=8, w=VW<760?150:176, rowH=VW<760?17:20;
  const rows=[
    ['У / С / П', (h.kills||0)+' / '+(h.deaths||0)+' / '+(h.assists||0)],
    ['Монеты', String(Math.floor(h.coins))]
  ];
  ctx.save();
  ctx.fillStyle='rgba(6,8,11,0.62)';
  ctx.beginPath(); ctx.roundRect(x,y,w,rows.length*rowH+10,6); ctx.fill();
  ctx.font='12px Segoe UI, Arial';
  rows.forEach((row,i)=>{
    const ry=y+19+i*rowH;
    ctx.textAlign='left'; ctx.fillStyle='rgba(255,255,255,0.55)'; ctx.fillText(row[0],x+10,ry);
    ctx.textAlign='right'; ctx.fillStyle=i===1?'#ffd568':'#fff'; ctx.font='bold 13px Consolas, monospace';
    ctx.fillText(row[1],x+w-10,ry); ctx.font='12px Segoe UI, Arial';
  });
  ctx.restore();
}

function drawHeroStripIcon(def,x,y,size,now,dead){
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x,y,size,size,4); ctx.clip();
  const base=ctx.createLinearGradient(x,y,x+size,y+size);
  base.addColorStop(0,dead?'#4b535d':def.color2);
  base.addColorStop(0.5,dead?'#30363e':def.color);
  base.addColorStop(1,'#080b12');
  ctx.fillStyle=base; ctx.fillRect(x,y,size,size);
  ctx.globalAlpha=dead?0.32:0.42; ctx.strokeStyle=dead?'#a4adb7':def.color2; ctx.lineWidth=1;
  for(let line=0;line<4;line++){
    ctx.beginPath(); ctx.moveTo(x-size*.2,y+size*(0.2+line*.22)); ctx.lineTo(x+size*1.1,y+size*(0.02+line*.22)); ctx.stroke();
  }
  ctx.globalAlpha=dead?0.55:1;
  ctx.fillStyle=dead?'#737d88':(def.color2||'#e8eef7');
  ctx.beginPath(); ctx.arc(x+size*.5,y+size*.42,size*.21,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=dead?'#363d45':(def.color||'#172337');
  ctx.beginPath(); ctx.ellipse(x+size*.5,y+size*.76,size*.34,size*.3,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=dead?'#c0c6cc':'#101621';
  ctx.beginPath(); ctx.arc(x+size*.44,y+size*.41,Math.max(1.2,size*.035),0,Math.PI*2); ctx.arc(x+size*.56,y+size*.41,Math.max(1.2,size*.035),0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=dead?0.35:0.85; ctx.fillStyle='#fff0c7'; ctx.font='bold '+Math.max(8,size*.22)+'px Segoe UI, Arial'; ctx.textAlign='center';
  ctx.fillText((def.name||'?').slice(0,2).toUpperCase(),x+size*.5,y+size*.94);
  ctx.restore();
}

function drawHUD(){
  if(!playerHero) return;
  const h = playerHero;

  drawMatchHeroStrip();
  drawTopLeftStats(h);

  if(h.def.id === 'shadow'){
    const lay = combatHudLayout();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff8a3d';
    ctx.font = 'bold 14px Segoe UI, Arial';
    ctx.fillText('Души: ' + (h.shadowSouls || 0) + ' / 30', lay.panel.x + 4, lay.panel.y - 30);
  }

  /* === ПАНЕЛЬ ОРБОВ ДЛЯ ГРИШИ === */
  if(h.def.id === 'grisha' && h.orbs){
    const orbY = combatHudLayout().panel.y - 62;
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

    const skillGradient=ctx.createLinearGradient(r.x,r.y,r.x+r.w,r.y+r.h);
    skillGradient.addColorStop(0,s.level>0?(ready?'rgba(39,91,130,0.96)':'rgba(45,51,64,0.96)'):'rgba(19,24,32,0.96)');
    skillGradient.addColorStop(1,'rgba(5,9,16,0.98)');
    ctx.fillStyle=skillGradient; ctx.beginPath(); ctx.roundRect(r.x,r.y,r.w,r.h,6); ctx.fill();
    const skillColor=def.ult?'#e2a84e':(ready?'#79bde8':'rgba(255,255,255,0.34)');
    ctx.strokeStyle=skillColor; ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect(r.x,r.y,r.w,r.h,6); ctx.stroke();
    ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(r.x+4,r.y+4,r.w-8,r.h-8,4); ctx.stroke();

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

function drawTouchControls(){
  if(!touchControlsEnabled || gameState!=='playing') return;
  const anchor=touchJoystickAnchor();
  const stickX=anchor.x+touchJoystick.dx*34;
  const stickY=anchor.y+touchJoystick.dy*34;
  ctx.save();
  ctx.globalAlpha=0.78;
  ctx.fillStyle='rgba(8,12,18,0.42)';
  ctx.beginPath(); ctx.arc(anchor.x,anchor.y,66,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(255,226,166,0.68)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(anchor.x,anchor.y,66,0,Math.PI*2); ctx.stroke();
  ctx.fillStyle='rgba(210,86,55,0.84)';
  ctx.beginPath(); ctx.arc(stickX,stickY,25,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='rgba(255,241,208,0.8)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(stickX,stickY,25,0,Math.PI*2); ctx.stroke();
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

/* Таблица на Tab в стиле Dota 2: две команды стопкой, портреты, уровень, золото, У/С/П и предметы. */
function drawScoreboard(){
  if(!scoreboardOpen) return;
  const roster = heroes.filter(h => h && h.type === 'hero' && !h.isIllusion);
  const teams = [
    {team:0, title:'СИЛЫ СВЕТА', color:'#72e6a5', dark:'rgba(20,52,34,0.94)', mid:'rgba(14,34,24,0.94)'},
    {team:1, title:'СИЛЫ ТЬМЫ',  color:'#ff7b7b', dark:'rgba(58,20,22,0.94)', mid:'rgba(36,14,16,0.94)'}
  ];
  const showItems = VW >= 700;
  const rowH = VH < 640 ? 34 : 42, headH = 34, gap = 12;
  const colItems = showItems ? 6*26 + 8 : 0;
  const w = Math.min(showItems ? 700 : 460, VW - 16);
  const rows = teams.map(t => roster.filter(h => h.team === t.team));
  const totalH = teams.reduce((sum,t,i)=> sum + headH + Math.max(1,rows[i].length)*(rowH+2), 0) + gap;
  const x = Math.round(VW/2 - w/2), y = Math.max(8, Math.round(VH/2 - totalH/2));
  const fit = (text, maxW) => {
    if(ctx.measureText(text).width <= maxW) return text;
    while(text.length > 1 && ctx.measureText(text + '…').width > maxW) text = text.slice(0,-1);
    return text + '…';
  };
  /* правые колонки: от края к центру */
  const pad = 10;
  const itemsX = x + w - pad - colItems;
  const colA = itemsX - (showItems ? 8 : 0) - 28, colD = colA - 30, colK = colD - 30, colGold = colK - 62, colLvl = colGold - 40;
  const nameX = x + pad + 4 + rowH + 8;
  const nameMaxW = Math.max(40, colLvl - 20 - nameX);

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fillRect(x - 6, y - 6, w + 12, totalH + 12);
  let cy = y;
  teams.forEach((t, ti) => {
    const list = rows[ti];
    const teamKills = list.reduce((sum,h) => sum + (h.kills || 0), 0);
    /* шапка команды */
    const hg = ctx.createLinearGradient(x, cy, x + w, cy);
    hg.addColorStop(0, t.dark); hg.addColorStop(1, 'rgba(8,12,18,0.96)');
    ctx.fillStyle = hg; ctx.fillRect(x, cy, w, headH);
    ctx.fillStyle = t.color; ctx.fillRect(x, cy, 3, headH);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.font = 'bold 20px Georgia, serif'; ctx.fillStyle = '#fff';
    ctx.fillText(String(teamKills), x + 14, cy + headH/2 + 1);
    ctx.font = 'bold 14px Georgia, serif'; ctx.fillStyle = t.color;
    ctx.fillText(t.title, x + 14 + Math.max(24, ctx.measureText(String(teamKills)).width + 10), cy + headH/2 + 1);
    ctx.font = 'bold 10px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.textAlign = 'center';
    ctx.fillText('УР', colLvl + 14, cy + headH/2 + 1);
    ctx.fillText('ЗОЛОТО', colGold + 28, cy + headH/2 + 1);
    ctx.fillText('У', colK + 12, cy + headH/2 + 1);
    ctx.fillText('С', colD + 12, cy + headH/2 + 1);
    ctx.fillText('П', colA + 12, cy + headH/2 + 1);
    if(showItems){ ctx.textAlign = 'left'; ctx.fillText('ПРЕДМЕТЫ', itemsX, cy + headH/2 + 1); }
    cy += headH;
    /* строки героев */
    list.forEach(hero => {
      const dead = !!hero.dead, mine = hero === playerHero;
      const rg = ctx.createLinearGradient(x, cy, x + w, cy);
      rg.addColorStop(0, t.mid); rg.addColorStop(1, 'rgba(10,14,20,0.94)');
      ctx.fillStyle = rg; ctx.fillRect(x, cy, w, rowH);
      if(mine){ ctx.fillStyle = 'rgba(255,213,104,0.10)'; ctx.fillRect(x, cy, w, rowH); }
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x, cy + rowH - 1, w, 1);
      /* портрет */
      const ps = rowH - 8, px = x + pad + 2, py = cy + 4;
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(px, py, ps, ps);
      drawHeroStripIcon(hero.def, px, py, ps, performance.now()/1000, dead);
      ctx.strokeStyle = mine ? '#ffd568' : (dead ? '#66707c' : t.color); ctx.lineWidth = mine ? 2 : 1.2; ctx.strokeRect(px, py, ps, ps);
      if(dead){
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(px, py, ps, ps);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Consolas, monospace'; ctx.textAlign = 'center';
        ctx.fillText(String(Math.ceil(hero.respawnTimer || 0)), px + ps/2, py + ps/2 + 1);
      }
      /* имена */
      const nick = hero === playerHero ? ((account.profile && account.profile.nick) || 'ТЫ') : (hero.onlinePlayerId ? 'Игрок' : 'Бот');
      ctx.textAlign = 'left'; ctx.font = 'bold 13px Segoe UI, Arial'; ctx.fillStyle = dead ? '#9aa3ad' : '#fff';
      ctx.fillText(fit(hero.def.name, nameMaxW), nameX, cy + rowH/2 - 7);
      ctx.font = '10px Segoe UI, Arial'; ctx.fillStyle = mine ? '#ffd568' : 'rgba(255,255,255,0.5)';
      ctx.fillText(fit(nick, nameMaxW), nameX, cy + rowH/2 + 8);
      /* уровень, золото, У/С/П */
      ctx.textAlign = 'center'; ctx.font = 'bold 13px Segoe UI, Arial'; ctx.fillStyle = dead ? '#9aa3ad' : '#e9edf2';
      ctx.fillText(String(hero.level || 1), colLvl + 14, cy + rowH/2 + 1);
      ctx.fillStyle = '#f2ce87'; ctx.font = 'bold 13px Consolas, monospace';
      ctx.fillText(String(Math.floor(hero.coins || 0)), colGold + 28, cy + rowH/2 + 1);
      ctx.font = 'bold 13px Segoe UI, Arial';
      ctx.fillStyle = '#e9edf2'; ctx.fillText(String(hero.kills || 0), colK + 12, cy + rowH/2 + 1);
      ctx.fillStyle = '#ff9a9a'; ctx.fillText(String(hero.deaths || 0), colD + 12, cy + rowH/2 + 1);
      ctx.fillStyle = '#b9d9ff'; ctx.fillText(String(hero.assists || 0), colA + 12, cy + rowH/2 + 1);
      /* предметы */
      if(showItems){
        for(let slot = 0; slot < 6; slot++){
          const ix = itemsX + slot*26, iy = cy + (rowH - 22)/2;
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(ix, iy, 24, 22);
          ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1; ctx.strokeRect(ix + .5, iy + .5, 23, 21);
          const item = hero.inventory && hero.inventory[slot];
          if(item){
            ctx.save(); ctx.beginPath(); ctx.rect(ix, iy, 24, 22); ctx.clip();
            if(item.cooldown > 0) ctx.filter = 'grayscale(1)';
            drawItemIcon(item, ix + 12, iy + 11, 22);
            ctx.restore();
          }
        }
      }
      cy += rowH + 2;
    });
    if(!list.length) cy += rowH + 2;
    if(ti === 0) cy += gap;
  });
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

let menuHover = -1;
let menuButtonHitboxes = [];
let lastMenuButtonHoverKey = '';
function menuWide(){ return VW>=900 && VH>=560; }
function menuScale(){ return Math.max(0.6, Math.min(1.25, Math.min(VW/1408, VH/768))); }
function menuNavRect(index){
  const s=menuScale(), w=Math.round(220*s), gap=Math.round(16*s), h=Math.round(52*s);
  const total=3*w+2*gap;
  return {x:Math.round(VW/2-total/2)+index*(w+gap), y:VH-Math.round(150*s), w, h};
}

/* Портрет героя для HTML-лобби: рисуем настоящую модель на отдельном canvas. */
window.__renderHeroPortrait = function(target, heroId){
  const def = HERO_DEFS.find(hero => hero.id === heroId);
  if(!def || !target) return false;
  const previous = ctx;
  try {
    ctx = target.getContext('2d');
    ctx.clearRect(0, 0, target.width, target.height);
    drawHeroTexture(def, 0, 0, target.width, target.height, performance.now()/1000);
    return true;
  } catch(err) {
    return false;
  } finally {
    ctx = previous;
    portraitRenderMode = false;
  }
};
function modeCardRects(){
  const narrow = VW < 760;
  const w = narrow ? Math.min(VW-48, 420) : Math.min(340, (VW-120)/3);
  const h = narrow ? Math.min(170, (VH-260)/3) : 300;
  const gap = 28;
  const y0 = narrow ? 150 : Math.max(150, VH/2 - h/2 - 10);
  if(narrow) return [
    {id:'turbo',   x:VW/2-w/2, y:y0,       w, h},
    {id:'allpick', x:VW/2-w/2, y:y0+h+12, w, h},
    {id:'ranked',  x:VW/2-w/2, y:y0+(h+12)*2, w, h}
  ];
  return [
    {id:'turbo',   x:VW/2-w*1.5-gap, y:y0, w, h},
    {id:'allpick', x:VW/2-w/2,       y:y0, w, h},
    {id:'ranked',  x:VW/2+w/2+gap,   y:y0, w, h}
  ];
}
function drawModeSelect(){
  const info = {
    turbo:   {title:'ТУРБО',    tag:'БЫСТРАЯ ИГРА',  color:'#ff9d62', lines:['+3 монеты в секунду','Полная награда за крипов','Обычный опыт','Боты идут в мид с 5-й минуты']},
    allpick: {title:'ALL PICK', tag:'КЛАССИКА',      color:'#8dd2ff', lines:['+1 монета в секунду','Крипы дают в 2 раза меньше монет','За героя — как обычно (200)','Опыт медленнее: уровни дольше','Боты дольше стоят на линиях (до 10-й минуты)']},
    ranked:  {title:'РЕЙТИНГ',  tag:'ALL PICK 4 НА 4', color:'#ffd866', lines:['Правила All Pick, 4 на 4 с ботами','Победа: +'+RANKED_WIN_MMR+' MMR','Поражение: −'+RANKED_LOSS_MMR+' MMR',
      account.profile ? 'Твой ранг: '+accountRatingRank(account.profile.rating||0)+' · '+(account.profile.rating||0) : 'Нужен вход в аккаунт']}
  };
  ctx.textAlign='center';
  ctx.fillStyle='#f6e6be'; ctx.font='bold 27px Georgia, serif';
  ctx.fillText('ВЫБОР РЕЖИМА',VW/2,72);
  ctx.font='13px Segoe UI, Arial'; ctx.fillStyle='rgba(255,255,255,.68)';
  ctx.fillText('Игра против ботов 4 на 4 · рейтинговый режим даёт MMR',VW/2,100);
  const back={x:24,y:78,w:120,h:38}; drawMenuButton(back,'‹  НАЗАД',{radius:7});
  for(const m of modeCardRects()){
    const d = info[m.id];
    const hover = mouse.x>=m.x && mouse.x<=m.x+m.w && mouse.y>=m.y && mouse.y<=m.y+m.h;
    if(gameState==='menu') menuButtonHitboxes.push({x:m.x,y:m.y,w:m.w,h:m.h,key:'mode:'+m.id});
    ctx.save();
    ctx.shadowColor = hover ? d.color : 'rgba(0,0,0,.5)'; ctx.shadowBlur = hover ? 26 : 10;
    const g = ctx.createLinearGradient(m.x,m.y,m.x,m.y+m.h);
    g.addColorStop(0, hover ? 'rgba(48,30,26,.97)' : 'rgba(26,20,24,.95)'); g.addColorStop(1, 'rgba(8,8,12,.97)');
    ctx.fillStyle = g; ctx.strokeStyle = hover ? d.color : 'rgba(215,179,106,.45)'; ctx.lineWidth = hover ? 3 : 2;
    ctx.beginPath(); ctx.roundRect(m.x,m.y,m.w,m.h,14); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.textAlign='center';
    ctx.fillStyle = d.color; ctx.font='bold 12px Segoe UI, Arial'; ctx.fillText(d.tag, m.x+m.w/2, m.y+30);
    ctx.font='bold 34px Georgia, serif'; ctx.fillStyle='#fff2d2'; ctx.fillText(d.title, m.x+m.w/2, m.y+70);
    ctx.strokeStyle = d.color; ctx.globalAlpha=.5; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(m.x+m.w*0.25, m.y+88); ctx.lineTo(m.x+m.w*0.75, m.y+88); ctx.stroke(); ctx.globalAlpha=1;
    ctx.font='14px Segoe UI, Arial'; ctx.fillStyle='rgba(255,255,255,.82)';
    d.lines.forEach((line,i)=>ctx.fillText(line, m.x+m.w/2, m.y+118+i*26));
    if(hover){ ctx.fillStyle=d.color; ctx.font='bold 13px Segoe UI, Arial'; ctx.fillText('НАЖМИ, ЧТОБЫ ВЫБРАТЬ', m.x+m.w/2, m.y+m.h-16); }
  }
}

function menuPlayRect(){
  if(menuWide()){ const s=menuScale(); return {x:Math.round(44*s),y:Math.round(150*s),w:Math.round(360*s),h:Math.round(84*s)}; }
  return {x:VW/2-150,y:VW<820||VH<820?VH/2-122:VH/2-28,w:300,h:72};
}
function menuChangelogRect(){ if(menuWide()) return menuNavRect(1); return {x:VW/2-155,y:VW<820||VH<820?VH/2+28:VH/2+178,w:310,h:48}; }
function menuSettingsRect(){
  if(menuWide() && menuStage==='home'){ const s=menuScale(), size=Math.round(56*s); return {x:VW-Math.round(44*s)-size,y:Math.round(22*s),w:size,h:size}; }
  return {x:VW-174,y:22,w:150,h:42};
}
function menuSettingsPanel(){
  const w=Math.min(560,VW-24), h=Math.min(560,VH-24);
  return {x:(VW-w)/2,y:(VH-h)/2,w,h};
}
function menuSettingsLayout(panel){
  const compact=panel.h<500;
  const columns=compact?3:(VW<430?2:3);
  const gap=VW<600?8:16;
  const rowWidth=(panel.w-72-gap*(columns-1))/columns;
  return {
    music:{x:panel.x+36,y:panel.y+(compact?72:142),w:panel.w-72,h:48},
    touch:{x:panel.x+36,y:panel.y+(compact?126:202),w:panel.w-72,h:48},
    bindTitleY:panel.y+(compact?184:282),
    bindHintY:panel.y+(compact?202:302),
    columns,
    rows:Array.from({length:6},(_,index)=>({
      x:panel.x+36+(index%columns)*(rowWidth+gap),
      y:panel.y+(compact?210:316)+Math.floor(index/columns)*(compact?34:52),
      w:rowWidth,h:compact?30:44
    })),
    close:{x:panel.x+(panel.w-180)/2,y:panel.y+panel.h-58,w:180,h:44}
  };
}
function menuStoreRect(){ if(menuWide()) return menuNavRect(2); return {x:VW/2-155,y:VW<820||VH<820?VH/2+88:VH/2+292,w:310,h:48}; }
function storePanelLayout(){
  const width=Math.max(0,Math.min(660,VW-24)), height=Math.max(0,Math.min(560,VH-24));
  const panel={x:(VW-width)/2,y:(VH-height)/2,w:width,h:height};
  const tabGap=10, tabWidth=(width-48-tabGap)/2;
  const tabs={
    shop:{x:panel.x+24,y:panel.y+76,w:tabWidth,h:38},
    inventory:{x:panel.x+24+tabWidth+tabGap,y:panel.y+76,w:tabWidth,h:38}
  };
  const categoryGap=8, categoryWidth=(width-48-categoryGap)/2;
  const categories={
    skins:{x:panel.x+24,y:panel.y+124,w:categoryWidth,h:30},
    phrases:{x:panel.x+24+categoryWidth+categoryGap,y:panel.y+124,w:categoryWidth,h:30}
  };
  const phraseGap=8, phraseWidth=(width-48-phraseGap*2)/3;
  const phraseHeight=Math.min(76,Math.max(40,(height-245)/3));
  const phraseCards=STORE_PHRASE_CARDS.map((card,index)=>({
    x:panel.x+24+(index%3)*(phraseWidth+phraseGap),
    y:panel.y+166+Math.floor(index/3)*(phraseHeight+phraseGap),w:phraseWidth,h:phraseHeight
  }));
  return {
    panel,tabs,categories,phraseCards,
    skinCard:{x:panel.x+24,y:panel.y+166,w:width-48,h:Math.max(72,height-270)},
    action:{x:panel.x+24,y:panel.y+height-104,w:width-48,h:42},
    close:{x:panel.x+24,y:panel.y+height-54,w:width-48,h:40}
  };
}

const UPDATE_SPOTLIGHT = [
  {version:'0.8.0',title:'ALL PICK И ОНЛАЙН-ЛОББИ',description:'Новый режим All Pick с медленной экономикой и долгой лайн-фазой, а в онлайне — лобби как в Dota 2 с режимами 1v1–4v4 и ботами.',compactDescription:'All Pick и лобби 1v1–4v4 с ботами.'},
  {version:'0.7.8',title:'СЧЁТЧИК ДЖУВСЮТА И 3D',description:'Над Джувсютом виден счётчик съеденных крипов, а бойцы и постройки получили объём и косые тени.',compactDescription:'Счётчик еды и объёмная графика.'},
  {version:'0.7.7',title:'ОБНОВЛЁННАЯ КАРТА',description:'Зелёные деревья Света в стиле Тьмы, более выразительное песчаное дно и прозрачная вода с бликами.',compactDescription:'Зелёный лес Света, детальный песок и вода.'},
  {version:'0.7.7',title:'НОВЫЕ ПРЕДМЕТЫ В МЕНЮ',description:'В новостях показаны Замисть и Диспёрсер, а также иллюстрация обновлённой карты.',compactDescription:'Замисть, Диспёрсер и улучшенная карта.'},
  {version:'0.7.7',title:'МАГАЗИН КАК В DOTA',description:'Предметы показаны компактными иконками, а название, цена и описание появляются при наведении.',compactDescription:'Иконки предметов и описание при наведении.'},
  {version:'0.7.6b',title:'ПРЕДМЕТ «ЗАМИСТЬ» И ПРОФИЛИ',description:'Новый активный предмет, звон монет при покупке, профили игроков мирового топа и обязательный аккаунт для онлайна.',compactDescription:'Замисть, профили игроков и аккаунт для онлайна.'},
  {version:'0.7.6a',title:'КРАСНАЯ РИГИНА И ИНВЕНТАРЬ',description:'Забери первый бесплатный скин в магазине, примени его в инвентаре и используй на Ригине в матче.',compactDescription:'Бесплатный скин Ригины и новый инвентарь.'},
  {version:'0.7.4b',title:'КАРЬЕРА И ИСТОРИЯ МАТЧЕЙ',description:'Победы, поражения, убийства, смерти, любимые бойцы и подробные отчёты последних игр с итогом команд.',compactDescription:'Карьера игрока и отчёты последних матчей.'},
  {version:'0.7.4b',title:'МИРОВОЙ ТОП ПО ПОБЕДАМ',description:'Смотри десятку игроков с наибольшим числом побед над ботами и игроками. MMR отображается как дополнительная статистика.',compactDescription:'Глобальный топ по победам в матчах.'},
  {version:'0.7.4b',title:'ПРОГРЕСС АККАУНТА',description:'Личные показатели, любимые герои и недавние результаты остаются с аккаунтом после следующего входа.',compactDescription:'Статистика сохраняется в аккаунте.'},
  {version:'0.7.4a',title:'ЖИВОЙ СЧЁТЧИК ОНЛАЙНА',description:'Верхняя панель показывает число активных подключений к серверу. Счётчик обновляется сразу при входе и выходе игроков и переживает временную недоступность Render.',compactDescription:'Актуальное число подключённых игроков на сервере.'},
  {version:'0.7.4a',title:'ТИХАЯ КОСМИЧЕСКАЯ ТЕМА',description:'Главное меню получило новую оригинальную музыку: медленный низкий пад и редкие высокие ноты звучат спокойно и не заглушают игру.',compactDescription:'Новая спокойная космическая музыка меню.'},
  {version:'0.7.4a',title:'КАРТА: ТЕНИ И КАМЕННЫЕ ДОРОГИ',description:'Добавлены контактные тени деревьев, глубина берегов и каменная разметка линий без изменений маршрутов и игровой физики.',compactDescription:'Тени леса и более читаемые каменные линии.'},
  {version:'0.7.3b',title:'МАГАЗИН: НОВЫЕ ИЗОБРАЖЕНИЯ',description:'Предметы получили новые объёмные карточки. Та же иконка теперь отображается в магазине и в шести слотах инвентаря.',compactDescription:'Новые изображения предметов в магазине и инвентаре.'},
  {version:'0.7.3b',title:'САВЕЛИЙ: ТРАНСФОРМАЦИЯ ПОЧИНЕНА',description:'Форма Трансформера и Яростный рев больше не ломают состояние интерфейса и корректно работают с любой целью.',compactDescription:'Стабильные трансформер и ульта Савелия.'},
  {version:'0.7.3b',title:'ОНЛАЙН: СТАТИСТИКА И РЕЙТИНГ',description:'В онлайн-разделе появились профиль, рейтинг, победы, поражения, матчи и винрейт перед поиском комнаты.',compactDescription:'Профиль, рейтинг и статистика прямо перед матчем.'}
];

function drawMenuUpdatePreview(playRect){
  const sections=UPDATE_SPOTLIGHT.slice(0,3);
  const compact=VW<820||VH<820;
  const width=Math.min(780,VW-32);
  const rowHeight=compact?68:76;
  const gap=compact?7:9;
  const raise=compact?(VH<620?0:18):Math.min(86,VH*0.055);
  const x=(VW-width)/2, top=playRect.y-sections.length*rowHeight-(sections.length-1)*gap-14-raise;
  ctx.save();
  sections.forEach((section,index)=>{
    const y=top+index*(rowHeight+gap), h=rowHeight-2;
    const accent=index===0?'#e7b968':(index===1?'#77c6ce':'#c57b69');
    const hovered=mouse.x>=x&&mouse.x<=x+width&&mouse.y>=y&&mouse.y<=y+h;
    ctx.save();
    ctx.shadowColor=accent; ctx.shadowBlur=index===0?14:7;
    const fill=ctx.createLinearGradient(x,y,x+width,y+h);
    fill.addColorStop(0,index===0?'rgba(27,35,45,0.97)':'rgba(16,24,33,0.94)');
    fill.addColorStop(1,index===0?'rgba(18,16,23,0.98)':'rgba(10,14,21,0.96)');
    ctx.fillStyle=fill; ctx.beginPath(); ctx.roundRect(x,y,width,h,7); ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle=hovered?'#fff0c7':accent; ctx.lineWidth=index===0?2:1.4;
    ctx.beginPath(); ctx.roundRect(x,y,width,h,7); ctx.stroke();
    ctx.strokeStyle='rgba(255,244,218,0.22)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(x+5,y+5,width-10,h-10,4); ctx.stroke();
    const corner=12;
    ctx.strokeStyle=accent; ctx.lineWidth=2;
    for(const side of [-1,1]) for(const vertical of [-1,1]){
      const cx=side<0?x+9:x+width-9, cy=vertical<0?y+9:y+h-9;
      ctx.beginPath(); ctx.moveTo(cx,cy+vertical*corner); ctx.lineTo(cx,cy); ctx.lineTo(cx-side*corner,cy); ctx.stroke();
    }
    const splitX=x+(compact?112:154);
    ctx.fillStyle=accent; ctx.fillRect(splitX,y+12,1,h-24);
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillStyle='rgba(255,240,199,0.58)'; ctx.font='bold 8px Consolas, monospace';
    ctx.fillText('ОБНОВЛЕНИЕ',x+15,y+(compact?18:21));
    ctx.fillStyle=accent; ctx.font='bold '+(compact?'12px':'14px')+' Consolas, monospace';
    ctx.fillText(section.version.toUpperCase(),x+15,y+(compact?43:48));
    const copyX=splitX+15, copyWidth=width-(copyX-x)-16;
    ctx.fillStyle='#fff0c7'; ctx.font='bold '+(compact?'11px':'14px')+' Segoe UI, Arial';
    ctx.fillText(section.title,copyX,y+(compact?20:25));
    ctx.textBaseline='alphabetic';
    ctx.fillStyle='rgba(233,239,246,0.82)'; ctx.font=(compact?'9px':'11px')+' Segoe UI, Arial';
    const description=compact?(section.compactDescription||section.description):section.description;
    const descriptionLines=wrapMenuText(description,copyWidth,(compact?'9px':'11px')+' Segoe UI, Arial');
    descriptionLines.slice(0,2).forEach((line,lineIndex)=>
      ctx.fillText(line,copyX,y+(compact?39:48)+lineIndex*(compact?10:14))
    );
    ctx.restore();
  });
  ctx.restore();
}

function updateMenuButtonHoverSound(){
  if(gameState!=='menu'){
    lastMenuButtonHoverKey='';
    return;
  }
  let current='';
  for(let index=menuButtonHitboxes.length-1;index>=0;index--){
    const button=menuButtonHitboxes[index];
    if(mouse.x>=button.x&&mouse.x<=button.x+button.w&&mouse.y>=button.y&&mouse.y<=button.y+button.h){
      current=button.key;
      break;
    }
  }
  if(current && current!==lastMenuButtonHoverKey) playSynthSfx('hover');
  lastMenuButtonHoverKey=current;
}

function drawMenuButton(rect, label, options={}){
  const hover = mouse.x>=rect.x && mouse.x<=rect.x+rect.w &&
                mouse.y>=rect.y && mouse.y<=rect.y+rect.h;
  if(gameState==='menu') menuButtonHitboxes.push({x:rect.x,y:rect.y,w:rect.w,h:rect.h,key:options.hoverKey||`${label}:${Math.round(rect.x)}:${Math.round(rect.y)}`});
  const primary = options.primary === true;
  const active = options.active === true;
  const redBlack = options.redBlack === true;
  const radius = options.radius || 8;
  ctx.save();
  ctx.shadowColor = hover || active
    ? (primary || redBlack ? 'rgba(235,44,58,0.58)' : 'rgba(215,179,106,0.35)')
    : 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = hover || active ? 18 : 8;
  const fill = ctx.createLinearGradient(rect.x,rect.y,rect.x,rect.y+rect.h);
  if(primary){
    fill.addColorStop(0, hover ? '#d96847' : '#b94835');
    fill.addColorStop(1, hover ? '#8d2c28' : '#70201f');
  } else if(redBlack){
    fill.addColorStop(0,hover||active?'#81212a':'#351116');
    fill.addColorStop(1,'#09090d');
  } else {
    fill.addColorStop(0, hover || active ? 'rgba(119,42,34,0.95)' : 'rgba(28,24,27,0.96)');
    fill.addColorStop(1, hover || active ? 'rgba(68,27,27,0.98)' : 'rgba(10,11,16,0.96)');
  }
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(rect.x,rect.y,rect.w,rect.h,radius); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = primary ? '#f5d99c' : redBlack ? (hover||active?'#ff5662':'#a8323d') : (hover || active ? '#e3bd70' : 'rgba(215,179,106,0.72)');
  ctx.lineWidth = primary ? 2 : 1.5;
  ctx.stroke();
  ctx.strokeStyle = primary ? 'rgba(255,237,188,0.48)' : redBlack ? 'rgba(237,61,78,0.5)' : 'rgba(185,67,49,0.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(rect.x+4,rect.y+4,rect.w-8,rect.h-8,Math.max(3,radius-3));
  ctx.stroke();
  ctx.fillStyle = primary ? '#fff0c7' : redBlack ? '#ffe4e4' : '#e8c984';
  ctx.font = options.large ? 'bold '+(options.fontSize||21)+'px Segoe UI, Arial' : 'bold '+(options.fontSize||12)+'px Segoe UI, Arial';
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
    const layout = menuSettingsLayout(panel);
    const musicToggle = layout.music;
    const touchToggle = layout.touch;
    if(mx>=musicToggle.x && mx<=musicToggle.x+musicToggle.w && my>=musicToggle.y && my<=musicToggle.y+musicToggle.h){
      setMusicEnabled(!musicEnabled);
    } else if(mx>=touchToggle.x && mx<=touchToggle.x+touchToggle.w && my>=touchToggle.y && my<=touchToggle.y+touchToggle.h){
      setTouchControlsEnabled(!touchControlsEnabled);
    } else {
      for(let index=0;index<6;index++){
        const row=layout.rows[index];
        if(mx>=row.x&&mx<=row.x+row.w&&my>=row.y&&my<=row.y+row.h){ rebindSlot=index; return; }
      }
      const layoutClose=layout.close;
      if(mx>=layoutClose.x && mx<=layoutClose.x+layoutClose.w && my>=layoutClose.y && my<=layoutClose.y+layoutClose.h){
        settingsOpen = false; rebindSlot=-1;
      }
    }
    return;
  }
  const storeButton=menuStoreRect();
  if(menuStage==='home' && mx>=storeButton.x && mx<=storeButton.x+storeButton.w && my>=storeButton.y && my<=storeButton.y+storeButton.h){
    storeOpen=!storeOpen; changelogOpen=false; settingsOpen=false; return;
  }
  if(storeOpen){
    const layout=storePanelLayout();
    const inside=(rect)=>mx>=rect.x&&mx<=rect.x+rect.w&&my>=rect.y&&my<=rect.y+rect.h;
    if(inside(layout.close)){storeOpen=false;return;}
    if(inside(layout.tabs.shop)){storeTab='shop';return;}
    if(inside(layout.tabs.inventory)){storeTab='inventory';return;}
    if(storeTab==='shop'){
      if(inside(layout.categories.skins)){storeCategory='skins';return;}
      if(inside(layout.categories.phrases)){storeCategory='phrases';return;}
      if(storeCategory==='phrases'){
        for(let index=0;index<STORE_PHRASE_CARDS.length;index++){
          if(inside(layout.phraseCards[index])){unlockStorePhrase(STORE_PHRASE_CARDS[index].id);return;}
        }
      } else if(inside(layout.action)){
        redReginaSkinOwned=true;
        saveReginaSkinState();
        storeTab='inventory';
        return;
      }
    } else if(inside(layout.action)){
      if(redReginaSkinOwned) setReginaSkinEquipped(!redReginaSkinEquipped);
      else { storeTab='shop'; storeCategory='skins'; }
    }
    return;
  }
  const changelogButton = menuChangelogRect();
  if(menuStage==='home' && mx>=changelogButton.x && mx<=changelogButton.x+changelogButton.w && my>=changelogButton.y && my<=changelogButton.y+changelogButton.h){
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
    if(menuProfileRect && mx>=menuProfileRect.x && mx<=menuProfileRect.x+menuProfileRect.w && my>=menuProfileRect.y && my<=menuProfileRect.y+menuProfileRect.h){ openAccountModal(); return; }
    for(const hit of menuHomeHits){
      if(mx>=hit.x && mx<=hit.x+hit.w && my>=hit.y && my<=hit.y+hit.h){
        if(hit.action==='store'){ storeOpen=true; changelogOpen=false; settingsOpen=false; }
        else if(hit.action==='online'){ onlineEntryElement.click(); }
        else if(hit.action==='account'){ openAccountModal(); }
        else if(hit.action==='leaderboard') window.openLeaderboard();
        else if(hit.action==='changelog'){ changelogOpen=true; changelogScroll=0; }
        else if(hit.action==='fighters'){ menuStage='heroes'; menuHeroPage=0; }
        return;
      }
    }
    const play = menuPlayRect();
    if(mx>=play.x && mx<=play.x+play.w && my>=play.y && my<=play.y+play.h){
      menuStage = 'mode';
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
      rankedOnlineMatch=false;
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
  if(menuStage === 'mode'){
    const back={x:24,y:78,w:120,h:38};
    if(mx>=back.x && mx<=back.x+back.w && my>=back.y && my<=back.y+back.h){ menuStage='home'; return; }
    for(const m of modeCardRects()){
      if(mx>=m.x && mx<=m.x+m.w && my>=m.y && my<=m.y+m.h){
        if(m.id==='ranked'){
          if(!account.token){ openAccountModal(); return; }
          gameMode='allpick'; rankedOnlineMatch=true;
        } else { gameMode=m.id; rankedOnlineMatch=false; }
        beginDraft(); return;
      }
    }
    return;
  }
  if(menuStage === 'draft'){
    const back={x:24,y:78,w:120,h:38};
    if(mx>=back.x && mx<=back.x+back.w && my>=back.y && my<=back.y+back.h){ stopMenuMusic(); announcerStop(); menuStage='home'; return; }
    const skip=draftSkipRect();
    if(draftPlayerIndex>=0 && mx>=skip.x && mx<=skip.x+skip.w && my>=skip.y && my<=skip.y+skip.h){ finishDraft(); return; }
    for(let i=0;i<HERO_DEFS.length;i++){
      const r=menuCardRect(i);
      if(mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h){ if(draftPlayerBlocked(i)) return; draftPlayerIndex=i; selectedHeroIndex=i; return; }
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

function setTouchControlsEnabled(enabled){
  touchControlsEnabled=enabled;
  document.body.classList.toggle('touch-enabled',enabled);
  try { localStorage.setItem('shadowTouchControls',String(enabled)); }
  catch(err) {}
  if(!enabled){
    touchJoystick.id=null;
    touchJoystick.dx=0;
    touchJoystick.dy=0;
    activeTouches.clear();
    if(playerHero && !playerHero.attackTarget) playerHero.moveTarget=null;
  }
}
document.body.classList.toggle('touch-enabled',touchControlsEnabled);
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
function menuFightersRect(){ if(menuWide()) return menuNavRect(0); return {x:VW/2-155,y:VW<820||VH<820?VH/2-42:VH/2+62,w:310,h:54}; }
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
    const redSkin=def.skinId==='reginaRed';
    ctx.fillStyle='#e9b39e'; ctx.strokeStyle=redSkin?'#4b0b18':'#59243c'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(0,-112,34,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle=redSkin?'#641126':'#5a2940'; ctx.beginPath(); ctx.arc(0,-130,42,Math.PI,Math.PI*2); ctx.fill();
    ctx.strokeStyle=redSkin?'#ff4058':'#ff9fbd'; ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(-58,-34); ctx.lineTo(-92,-91); ctx.moveTo(58,-34); ctx.lineTo(92,-91); ctx.stroke();
    ctx.fillStyle='#fff0f5'; ctx.beginPath(); ctx.arc(-12,-112,4,0,Math.PI*2); ctx.arc(12,-112,4,0,Math.PI*2); ctx.fill();
  } else if(def.id==='yosyp'){
    ctx.fillStyle='#344623'; ctx.strokeStyle='#b6ff72'; ctx.lineWidth=4;
    ctx.beginPath(); ctx.moveTo(-44,-118); ctx.lineTo(-28,-156); ctx.lineTo(0,-141); ctx.lineTo(28,-156); ctx.lineTo(44,-118); ctx.lineTo(34,-75); ctx.lineTo(-34,-75); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#b6ff72'; ctx.shadowColor='#8dff55'; ctx.shadowBlur=14;
    ctx.beginPath(); ctx.arc(-12,-110,6,0,Math.PI*2); ctx.arc(12,-110,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.strokeStyle='#d9f5a6'; ctx.lineWidth=7; ctx.beginPath(); ctx.moveTo(60,-22); ctx.lineTo(89,-94); ctx.stroke();
    ctx.fillStyle='#8aa65a'; ctx.beginPath(); ctx.ellipse(89,-98,13,8,-.3,0,Math.PI*2); ctx.fill();
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
    facing:-Math.PI/2, isPlayer:false, shadowSouls:0, skinId:def.skinId||null,
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

/* ===== Осмотр бойца: крутить мышью/пальцем, масштаб колесом, двойной клик — сброс ===== */
const heroView = {id:null, yaw:0, pitch:0.2, vel:0, zoom:1, drag:false, lastX:0, lastY:0, lastT:0, idle:0, lastClick:0};
function heroDetailPortraitRect(){
  const compact=VW<920;
  return {x:compact?28:64, y:150, w:VW*.34, h:Math.min(430,VH-258)};
}
function heroViewReset(){ heroView.yaw=0; heroView.pitch=0.2; heroView.vel=0; heroView.zoom=1; heroView.idle=0; }
function heroViewPointerDown(mx,my){
  if(gameState!=='menu' || menuStage!=='heroDetail') return false;
  const r=heroDetailPortraitRect();
  if(mx<r.x||mx>r.x+r.w||my<r.y||my>r.y+r.h) return false;
  const t=performance.now();
  if(t-heroView.lastClick<350){ heroViewReset(); heroView.lastClick=0; return true; }
  heroView.lastClick=t;
  heroView.drag=true; heroView.lastX=mx; heroView.lastY=my; heroView.vel=0; heroView.idle=0;
  return true;
}
function heroViewPointerMove(mx,my){
  if(!heroView.drag) return;
  const dx=mx-heroView.lastX; heroView.lastX=mx;
  const d=dx*0.012;
  heroView.yaw+=d; heroView.vel=d*60; heroView.idle=0;
  if(typeof my==='number'){
    const dy=my-heroView.lastY; heroView.lastY=my;
    heroView.pitch=clamp(heroView.pitch+dy*0.008,-0.15,0.75);
  }
}
function heroViewPointerUp(){ heroView.drag=false; }
function heroViewWheel(e){
  if(gameState!=='menu' || menuStage!=='heroDetail') return false;
  const r=heroDetailPortraitRect();
  if(e.clientX<r.x||e.clientX>r.x+r.w||e.clientY<r.y||e.clientY>r.y+r.h) return false;
  heroView.zoom=clamp(heroView.zoom*(e.deltaY>0?0.92:1.08),0.7,1.7);
  heroView.idle=0;
  return true;
}
function drawHeroViewer(def,x,y,w,h,now){
  if(heroView.id!==def.id){ heroView.id=def.id; heroViewReset(); }
  const dt=1/60;
  if(!heroView.drag){
    heroView.idle+=dt;
    if(Math.abs(heroView.vel)>0.02){ heroView.yaw+=heroView.vel*dt; heroView.vel*=0.94; }
    else if(heroView.idle>2.5) heroView.yaw+=0.35*dt;
  }
  /* сцена: тёмная сцена и круг-постамент */
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x,y,w,h,18); ctx.clip();
  const bg=ctx.createRadialGradient(x+w/2,y+h*.45,10,x+w/2,y+h*.5,Math.max(w,h)*.8);
  bg.addColorStop(0,'#1a2233'); bg.addColorStop(1,'#05070c');
  ctx.fillStyle=bg; ctx.fillRect(x,y,w,h);
  /* настоящая 3D-модель бойца (hero3d.js): вращение по двум осям, масштаб колесом */
  if(window.Hero3D){
    Hero3D.draw(ctx,def,x,y,w,h,{yaw:heroView.yaw,pitch:heroView.pitch,zoom:heroView.zoom,t:now});
  }
  ctx.restore();

  ctx.strokeStyle='rgba(215,179,106,.55)'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.roundRect(x,y,w,h,18); ctx.stroke();
  const deg=Math.round(((heroView.yaw*180/Math.PI)%360+360)%360);
  ctx.textAlign='left'; ctx.font='bold 11px Consolas, monospace'; ctx.fillStyle='rgba(255,255,255,.6)';
  ctx.fillText('↻ '+deg+'°   ×'+heroView.zoom.toFixed(2),x+12,y+h-12);
  ctx.textAlign='right'; ctx.font='11px Segoe UI, Arial'; ctx.fillStyle='rgba(255,255,255,.5)';
  ctx.fillText('тяни — крутить  •  колесо — масштаб  •  2×клик — сброс',x+w-12,y+h-12);
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
  drawHeroViewer(def,leftX,top,portraitW,portraitH,now);
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
  ctx.fillText('Тяни мышью — крути 3D-модель бойца и осматривай со всех сторон',VW/2,VH-18);
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
  const layout=storePanelLayout(), panel=layout.panel;
  ctx.fillStyle='rgba(0,0,0,0.62)'; ctx.fillRect(0,0,VW,VH);
  ctx.save();
  ctx.fillStyle='rgba(7,12,22,0.98)'; ctx.fillRect(panel.x,panel.y,panel.w,panel.h);
  ctx.strokeStyle='#e15b55'; ctx.lineWidth=2.5; ctx.strokeRect(panel.x,panel.y,panel.w,panel.h);
  ctx.textAlign='center'; ctx.fillStyle='#f2e2bd'; ctx.font='bold 25px Georgia, serif'; ctx.fillText('МАГАЗИН',VW/2,panel.y+40);
  ctx.fillStyle='rgba(255,255,255,0.58)'; ctx.font='12px Segoe UI, Arial'; ctx.fillText('Косметика и предметы коллекции',VW/2,panel.y+59);
  drawMenuButton(layout.tabs.shop,'МАГАЗИН',{active:storeTab==='shop'});
  drawMenuButton(layout.tabs.inventory,'ИНВЕНТАРЬ',{active:storeTab==='inventory'});

  if(storeTab==='shop'){
    drawMenuButton(layout.categories.skins,'СКИНЫ',{active:storeCategory==='skins'});
    drawMenuButton(layout.categories.phrases,'ФРАЗЫ',{active:storeCategory==='phrases'});
    if(storeCategory==='skins'){
      const card=layout.skinCard, regina=HERO_DEFS.find(hero=>hero.id==='regina');
      ctx.fillStyle='rgba(24,16,25,0.96)'; ctx.fillRect(card.x,card.y,card.w,card.h);
      ctx.strokeStyle='#b52d3c'; ctx.lineWidth=2; ctx.strokeRect(card.x,card.y,card.w,card.h);
      if(regina) drawHeroTexture({...regina,color:'#5b101e',color2:'#ff4058',skinId:'reginaRed'},card.x+12,card.y+12,Math.min(120,card.w*0.34),card.h-24,performance.now()/1000);
      const detailsX=card.x+Math.min(150,card.w*0.42), detailsWidth=card.x+card.w-detailsX-10;
      ctx.textAlign='left'; ctx.fillStyle='#ff5968'; ctx.font='bold '+Math.min(18,Math.max(13,detailsWidth/9))+'px Segoe UI, Arial';
      ctx.fillText('КРАСНАЯ РИГИНА',detailsX,card.y+42);
      ctx.fillStyle='rgba(255,240,235,0.76)'; ctx.font='13px Segoe UI, Arial';
      wrapMenuText('Алый боевой образ Ригины. Не меняет характеристики героя.',detailsWidth,'13px Segoe UI, Arial').slice(0,3)
        .forEach((line,index)=>ctx.fillText(line,detailsX,card.y+72+index*18));
      ctx.fillStyle='#78e6a8'; ctx.font='bold 13px Segoe UI, Arial'; ctx.fillText('БЕСПЛАТНО',detailsX,card.y+card.h-22);
      drawMenuButton(layout.action,redReginaSkinOwned?'ПОЛУЧЕНО • В ИНВЕНТАРЕ':'ЗАБРАТЬ БЕСПЛАТНО',{primary:!redReginaSkinOwned});
    } else {
      STORE_PHRASE_CARDS.forEach((card,index)=>{
        const rect=layout.phraseCards[index], owned=isStorePhraseOwned(card.id);
        ctx.fillStyle='rgba(24,31,48,0.95)'; ctx.fillRect(rect.x,rect.y,rect.w,rect.h);
        ctx.strokeStyle=owned?'#72e6a5':card.color; ctx.lineWidth=2; ctx.strokeRect(rect.x,rect.y,rect.w,rect.h);
        ctx.textAlign='left'; ctx.fillStyle=card.color; ctx.font='bold 11px Segoe UI, Arial'; ctx.fillText(card.title,rect.x+8,rect.y+20);
        ctx.fillStyle='#fff'; ctx.font='11px Segoe UI, Arial';
        wrapMenuText(card.desc,rect.w-16,'11px Segoe UI, Arial').slice(0,2).forEach((line,lineIndex)=>ctx.fillText(line,rect.x+8,rect.y+39+lineIndex*13));
        ctx.fillStyle=owned?'#72e6a5':'#ffd568'; ctx.font='bold 10px Segoe UI, Arial'; ctx.fillText(owned?'ПОЛУЧЕНО':'БЕСПЛАТНО',rect.x+8,rect.y+rect.h-8);
      });
    }
  } else if(redReginaSkinOwned){
    const card=layout.skinCard, regina=HERO_DEFS.find(hero=>hero.id==='regina');
    ctx.fillStyle='rgba(24,16,25,0.96)'; ctx.fillRect(card.x,card.y,card.w,card.h);
    ctx.strokeStyle=redReginaSkinEquipped?'#72e6a5':'#b52d3c'; ctx.lineWidth=2; ctx.strokeRect(card.x,card.y,card.w,card.h);
    if(regina) drawHeroTexture({...regina,color:'#5b101e',color2:'#ff4058',skinId:'reginaRed'},card.x+12,card.y+12,Math.min(120,card.w*0.34),card.h-24,performance.now()/1000);
    const detailsX=card.x+Math.min(150,card.w*0.42), detailsWidth=card.x+card.w-detailsX-10;
    ctx.textAlign='left'; ctx.fillStyle='#ff5968'; ctx.font='bold '+Math.min(18,Math.max(13,detailsWidth/9))+'px Segoe UI, Arial';
    ctx.fillText('КРАСНАЯ РИГИНА',detailsX,card.y+42);
    ctx.fillStyle=redReginaSkinEquipped?'#72e6a5':'rgba(255,240,235,0.7)'; ctx.font='13px Segoe UI, Arial';
    ctx.fillText(redReginaSkinEquipped?'СКИН ПРИМЕНЁН':'ГОТОВ К ПРИМЕНЕНИЮ',detailsX,card.y+70);
    ctx.fillStyle='rgba(255,255,255,0.58)'; ctx.font='12px Segoe UI, Arial';
    wrapMenuText('Будет виден, когда выбран герой Ригина.',detailsWidth,'12px Segoe UI, Arial').slice(0,2)
      .forEach((line,index)=>ctx.fillText(line,detailsX,card.y+94+index*16));
    drawMenuButton(layout.action,redReginaSkinEquipped?'СНЯТЬ СКИН':'ПРИМЕНИТЬ СКИН',{primary:!redReginaSkinEquipped});
  } else {
    ctx.textAlign='center'; ctx.fillStyle='#dce5ef'; ctx.font='bold 17px Segoe UI, Arial';
    ctx.fillText('ИНВЕНТАРЬ ПОКА ПУСТ',VW/2,panel.y+panel.h*0.58);
    ctx.fillStyle='rgba(255,255,255,0.58)'; ctx.font='13px Segoe UI, Arial';
    ctx.fillText('Заберите бесплатный скин в магазине.',VW/2,panel.y+panel.h*0.58+25);
    drawMenuButton(layout.action,'ОТКРЫТЬ МАГАЗИН',{primary:true});
  }
  drawMenuButton(layout.close,'ЗАКРЫТЬ',{active:true});
  ctx.restore();
}

function drawCosmicBackdrop(now){
  ctx.save();
  ctx.globalCompositeOperation='screen';
  const sourceX=VW*(0.5+Math.sin(now*0.11)*0.025), sourceY=VH*0.16;
  const rayLength=Math.hypot(VW,VH)*1.1;
  for(let index=0;index<11;index++){
    const angle=Math.PI*(0.15+index*0.071)+Math.sin(now*0.08+index)*0.025;
    const endX=sourceX+Math.cos(angle)*rayLength, endY=sourceY+Math.sin(angle)*rayLength;
    const perpendicular=angle+Math.PI/2, width=Math.min(VW,VH)*(0.012+(index%3)*0.006);
    ctx.globalAlpha=0.45+Math.sin(now*0.32+index*0.9)*0.12;
    ctx.fillStyle=index%4===0?'rgba(111,222,235,0.11)':(index%3===0?'rgba(255,188,112,0.10)':'rgba(155,146,206,0.075)');
    ctx.beginPath();
    ctx.moveTo(sourceX+Math.cos(perpendicular)*2,sourceY+Math.sin(perpendicular)*2);
    ctx.lineTo(endX+Math.cos(perpendicular)*width,endY+Math.sin(perpendicular)*width);
    ctx.lineTo(endX-Math.cos(perpendicular)*width,endY-Math.sin(perpendicular)*width);
    ctx.lineTo(sourceX-Math.cos(perpendicular)*2,sourceY-Math.sin(perpendicular)*2);
    ctx.closePath(); ctx.fill();
  }

  for(let index=0;index<180;index++){
    const x=(index*0.61803398875%1)*VW;
    const y=(index*0.75487766625%1)*VH;
    const sparkle=(Math.sin(now*(0.8+index%4*0.12)+index*2.17)+1)/2;
    const size=index%29===0?2.1:(index%7===0?1.35:0.8);
    ctx.globalAlpha=0.16+sparkle*(index%29===0?0.72:0.35);
    ctx.fillStyle=index%11===0?'#8be9fd':(index%7===0?'#ffe2a1':'#edf4ff');
    ctx.beginPath(); ctx.arc(x,y,size,0,Math.PI*2); ctx.fill();
    if(index%29===0){
      ctx.globalAlpha*=0.55; ctx.lineWidth=0.7; ctx.strokeStyle=ctx.fillStyle;
      ctx.beginPath(); ctx.moveTo(x-size*2.8,y); ctx.lineTo(x+size*2.8,y);
      ctx.moveTo(x,y-size*2.8); ctx.lineTo(x,y+size*2.8); ctx.stroke();
    }
  }
  ctx.restore();
}

/* =========================================================
   АККАУНТ: ник + пароль, уровень растёт с каждой победой
   ========================================================= */
const ACCOUNT_TOKEN_KEY = 'dotasense-account-token';
const ACCOUNT_PROFILE_KEY = 'dotasense-account-profile';
const account = { token: null, profile: null, lastGain: 0 };
let accountCareer = {history:[], leaders:[]};
let accountCareerLoading = false;
let leaderboardLoading = false;
let leaderboardError = '';
let selectedLeaderboardProfile = null;
const ACCOUNT_RANKS = [[0,'Новобранец'],[3,'Страж'],[6,'Рыцарь'],[10,'Герольд'],[15,'Защитник'],[25,'Легенда'],[40,'Божество'],[60,'Бессмертный']];
function accountRank(level){
  let name = ACCOUNT_RANKS[0][1];
  for(const [min, title] of ACCOUNT_RANKS) if(level >= min) name = title;
  return name;
}
const MMR_RANKS = ['РЕКРУТ','СТРАЖ','РЫЦАРЬ','ГЕРОЛЬД','ЗАЩИТНИК','ЛЕГЕНДА','БОЖЕСТВО','ТИТАН'];
/* 100 MMR = одна звезда, 5 звёзд = ранг (500 MMR). С 4000 MMR — БЕССМЕРТНЫЙ. */
function accountRatingRank(rating){
  rating = Math.max(0, Math.floor(rating || 0));
  const tier = Math.floor(rating / 500);
  if(tier >= MMR_RANKS.length) return 'БЕССМЕРТНЫЙ';
  return MMR_RANKS[tier] + ' ' + (Math.floor((rating % 500) / 100) + 1);
}
function refreshOnlineEntryLabel(){
  if(!onlineEntryElement) return;
  const profile=account.profile;
  if(!profile){ onlineEntryElement.textContent='ОНЛАЙН 3 НА 3 · ВОЙДИ ДЛЯ РЕЙТИНГА'; return; }
  const rating=Number.isFinite(profile.rating)?profile.rating:0;
  onlineEntryElement.textContent='ОНЛАЙН · '+accountRatingRank(rating)+' · '+rating+' MMR';
}
function accountStore(key, value){
  try { if(value == null) localStorage.removeItem(key); else localStorage.setItem(key, value); }
  catch(err) {}
}
function accountRead(key){
  try { return localStorage.getItem(key); } catch(err) { return null; }
}
function accountSet(token, profile){
  account.token = token;
  account.profile = profile;
  accountStore(ACCOUNT_TOKEN_KEY, token);
  accountStore(ACCOUNT_PROFILE_KEY, profile ? JSON.stringify(profile) : null);
  renderAccountModal();
  if(token) loadAccountCareer();
  else accountCareer = {history:[], leaders:[]};
}
async function accountApi(name, payload){
  let response;
  try {
    response = await fetch('/api/' + name, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload || {}) });
  } catch(err) {
    const error = new Error('Сервер недоступен. Попробуй позже.');
    error.network = true;
    throw error;
  }
  let data = {};
  try { data = await response.json(); } catch(err) {}
  if(!response.ok){
    const error = new Error(data.error || 'Ошибка сервера');
    error.status = response.status;
    throw error;
  }
  return data;
}
function careerHeroName(id){
  const hero = HERO_DEFS.find(def => def.id === id);
  return hero ? hero.name : (id || 'Неизвестный боец');
}
function careerNode(tag, className, text){
  const node = document.createElement(tag);
  if(className) node.className = className;
  if(text != null) node.textContent = text;
  return node;
}
function renderCareerPanel(){
  const panel = document.getElementById('career-panel');
  if(!panel) return;
  panel.hidden = !account.profile;
  if(!account.profile) return;

  const profile = account.profile;
  const summary = document.getElementById('career-summary');
  const favorites = document.getElementById('career-favorites');
  const history = document.getElementById('career-history');
  const xp = document.getElementById('career-xp');
  summary.replaceChildren(); favorites.replaceChildren(); history.replaceChildren();
  xp.textContent = (profile.xp || 0) % 500 + ' / 500 XP';

  [
    ['МАТЧИ',profile.matches || 0],['ПОБЕДЫ',profile.wins || 0],['ПОРАЖЕНИЯ',profile.losses || 0],
    ['УБИЙСТВА',profile.kills || 0],['СМЕРТИ',profile.deaths || 0],['MMR',profile.rating || 0]
  ].forEach(([label,value])=>{
    const cell=careerNode('div','career-stat');
    cell.append(careerNode('b','',String(value)),careerNode('span','',label));
    summary.appendChild(cell);
  });

  const favoritesList = profile.favoriteHeroes || [];
  if(!favoritesList.length) favorites.appendChild(careerNode('span','career-empty','Сыграй первый матч'));
  else favoritesList.forEach(hero=>favorites.appendChild(careerNode('span','career-favorite',careerHeroName(hero.heroId)+' · '+hero.games)));

  if(!accountCareer.history.length){
    history.appendChild(careerNode('div','career-empty','История появится после первой завершённой игры.'));
  } else accountCareer.history.forEach(match=>{
    const details=careerNode('details','career-match'+(match.won?'':' loss'));
    const summaryNode=careerNode('summary');
    const date=Number.isFinite(match.playedAt) ? new Date(match.playedAt).toLocaleDateString('ru-RU') : '';
    summaryNode.append(
      careerNode('span','career-match-title',careerHeroName(match.heroId)+' · '+date),
      careerNode('span','career-match-score',`${match.kills||0}/${match.deaths||0}/${match.assists||0} · ${(match.netWorth||0).toLocaleString('ru-RU')}`)
    );
    details.appendChild(summaryNode);
    const body=careerNode('div','career-match-body');
    (match.participants || []).forEach(player=>{
      const row=careerNode('div','career-participant'+(player.team===match.winnerTeam?' winner':''));
      row.append(
        careerNode('span','',`${player.nick || careerHeroName(player.heroId)} · ${careerHeroName(player.heroId)}`),
        careerNode('span','',`${player.kills||0}/${player.deaths||0}/${player.assists||0}`),
        careerNode('span','',`${(player.netWorth||0).toLocaleString('ru-RU')} зол.`),
        careerNode('span','',player.team===match.winnerTeam?'ПОБЕДИТЕЛЬ':'')
      );
      body.appendChild(row);
    });
    details.appendChild(body);
    history.appendChild(details);
  });
}
function renderLeaderboardPanel(){
  const list=document.getElementById('world-leaderboard-list');
  const status=document.getElementById('leaderboard-status');
  if(!list||!status) return;
  list.replaceChildren();
  status.textContent=leaderboardLoading?'Загрузка мирового рейтинга…':leaderboardError;
  if(!accountCareer.leaders.length){
    if(!leaderboardLoading) status.textContent=leaderboardError || 'Таблица пока пуста.';
    return;
  }
  const currentNick=account.profile&&account.profile.nick;
  accountCareer.leaders.forEach(player=>{
    const row=careerNode('li',player.nick===currentNick?'me':'');
    row.appendChild(careerNode('span','leaderboard-place','#'+player.rank));
    const identity=careerNode('button','leaderboard-player leaderboard-profile-link');
    identity.type='button';
    identity.append(careerNode('strong','',player.nick),careerNode('small','',`${player.title||'Новобранец'} · MMR ${player.rating||0}`));
    identity.addEventListener('click',()=>showLeaderboardProfile(player));
    row.append(identity,careerNode('span','leaderboard-wins',String(player.wins||0)));
    list.appendChild(row);
  });
}
function showLeaderboardProfile(profile){
  selectedLeaderboardProfile=profile;
  document.getElementById('leaderboard-list-view').hidden=true;
  document.getElementById('leaderboard-player-profile').hidden=false;
  document.getElementById('leaderboard-profile-avatar').textContent=(profile.nick||'?').slice(0,1).toUpperCase();
  document.getElementById('leaderboard-profile-name').textContent=profile.nick||'Игрок';
  document.getElementById('leaderboard-profile-title').textContent=(profile.title||'Новобранец')+' · '+accountRank(profile.level||0);
  const stats=document.getElementById('leaderboard-profile-stats');
  stats.replaceChildren();
  [['ПОБЕДЫ',profile.wins],['ПОРАЖЕНИЯ',profile.losses],['МАТЧИ',profile.matches],['УБИЙСТВА',profile.kills],['СМЕРТИ',profile.deaths],['РЕЙТИНГ',profile.rating]]
    .forEach(([label,value])=>{
      const cell=careerNode('div','leaderboard-profile-stat');
      cell.append(careerNode('b','',String(value||0)),careerNode('span','',label));
      stats.appendChild(cell);
    });
  const favorites=document.getElementById('leaderboard-profile-favorites');
  favorites.replaceChildren();
  const heroes=profile.favoriteHeroes||[];
  if(heroes.length) heroes.forEach(hero=>favorites.appendChild(careerNode('span','',careerHeroName(hero.heroId)+' · '+hero.games)));
  else favorites.appendChild(careerNode('span','','Пока нет сыгранных матчей'));
}
document.getElementById('leaderboard-profile-back').addEventListener('click',()=>{
  selectedLeaderboardProfile=null;
  document.getElementById('leaderboard-player-profile').hidden=true;
  document.getElementById('leaderboard-list-view').hidden=false;
});
async function loadLeaderboard(){
  if(leaderboardLoading) return;
  leaderboardLoading=true; leaderboardError=''; renderLeaderboardPanel();
  try {
    const response=await fetch('/api/leaderboard');
    let data;
    try { data=await response.json(); }
    catch(err) { throw new Error('Мировой топ сейчас недоступен. Проверь подключение к серверу.'); }
    if(!response.ok) throw new Error(data.error||'Мировой рейтинг временно недоступен');
    accountCareer.leaders=data.players||[];
  } catch(err) {
    leaderboardError=err.message||'Мировой рейтинг временно недоступен';
  } finally {
    leaderboardLoading=false;
    renderLeaderboardPanel();
  }
}
window.openLeaderboard=function(){
  selectedLeaderboardProfile=null;
  document.getElementById('leaderboard-player-profile').hidden=true;
  document.getElementById('leaderboard-list-view').hidden=false;
  document.getElementById('leaderboard-modal').hidden=false;
  loadLeaderboard();
};
window.closeLeaderboard=function(){ document.getElementById('leaderboard-modal').hidden=true; };
async function loadAccountCareer(){
  if(!account.token || accountCareerLoading) return;
  const token = account.token;
  accountCareerLoading = true;
  try {
    const careerResponse=await accountApi('career',{token});
    if(account.token !== token) return;
    account.profile=careerResponse.profile;
    accountCareer.history=careerResponse.history || [];
    accountStore(ACCOUNT_PROFILE_KEY,JSON.stringify(account.profile));
    renderAccountModal();
  } catch(err) {
    if(account.token !== token) return;
    if(err.status === 401) accountSet(null,null);
    const note=document.getElementById('career-history');
    if(note && account.profile) note.textContent='Не удалось загрузить карьеру. Проверь подключение и повтори вход.';
  } finally {
    accountCareerLoading = false;
    if(account.token && account.token !== token) loadAccountCareer();
  }
}
const ACCOUNT_PENDING_KEY = 'dotasense-pending-results';
function pendingResults(){
  try { const list = JSON.parse(accountRead(ACCOUNT_PENDING_KEY) || '[]'); return Array.isArray(list) ? list : []; }
  catch(err) { return []; }
}
function savePendingResults(list){
  accountStore(ACCOUNT_PENDING_KEY, list.length ? JSON.stringify(list.slice(-40)) : null);
}
function makeMatchId(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}
/* Отправляет результат на сервер. Если сервер недоступен — результат остаётся в очереди
   и будет досчитан при следующем входе/открытии игры (дубли сервер отбрасывает по matchId). */
async function accountSendResult(entry){
  const data = await accountApi('result', {
    token: account.token, won: !!entry.won, matchId: entry.matchId,
    ranked: entry.ranked === true, stats: entry.stats || {}
  });
  account.profile = data.profile;
  accountStore(ACCOUNT_PROFILE_KEY, JSON.stringify(data.profile));
  return data;
}
function currentMatchCareerStats(){
  const roster = heroes.filter(hero => hero && hero.type === 'hero' && !hero.isIllusion);
  const netWorthOf = hero => Math.floor((hero.coins || 0) + (hero.inventory || []).reduce((total, item) =>
    total + (item ? (SHOP_ITEMS[item.id]?.totalCost || SHOP_ITEMS[item.id]?.cost || 0) : 0), 0));
  const participants = roster.map(hero => ({
    nick: hero === playerHero && account.profile ? account.profile.nick : hero.def.name,
    heroId: hero.def.id,
    team: hero.team,
    kills: hero.kills || 0,
    deaths: hero.deaths || 0,
    assists: hero.assists || 0,
    netWorth: netWorthOf(hero)
  }));
  return {
    heroId: playerHero && playerHero.def ? playerHero.def.id : '',
    kills: playerHero ? playerHero.kills || 0 : 0,
    deaths: playerHero ? playerHero.deaths || 0 : 0,
    assists: playerHero ? playerHero.assists || 0 : 0,
    netWorth: playerHero ? netWorthOf(playerHero) : 0,
    winnerTeam: winner === 1 ? 1 : 0,
    participants
  };
}
async function accountFlushPending(){
  if(!account.token) return;
  let list = pendingResults();
  if(!list.length) return;
  const left = [];
  for(const entry of list){
    try { await accountSendResult(entry); }
    catch(err) {
      if(err.status === 401){ left.push(entry); break; }
      if(err.network || err.status >= 500 || err.status === 429) left.push(entry);
    }
  }
  savePendingResults(left);
  renderAccountModal();
}
async function accountRecordResult(won, matchId, ranked, stats){
  account.lastGain = 0;
  if(!account.token) return;
  matchId = matchId || makeMatchId();
  const entry = { won: !!won, matchId, ranked: !!ranked, stats: stats || {} };
  const before = account.profile ? account.profile.level : 0;
  /* Сначала кладём в очередь: если вкладку закроют раньше ответа сервера — результат не потеряется. */
  savePendingResults(pendingResults().concat(entry));
  try {
    const data = await accountSendResult(entry);
    savePendingResults(pendingResults().filter(item => item.matchId !== matchId));
    account.lastGain = data.profile.level - before;
    renderAccountModal();
    loadAccountCareer();
    accountFlushPending();
  } catch(err) {
    if(err.status === 401) accountSet(null, null);
    else if(!(err.network || err.status >= 500 || err.status === 429)) savePendingResults(pendingResults().filter(item => item.matchId !== matchId));
    console.warn('Не удалось сохранить результат матча:', err.message);
  }
}

/* =========================================================
   АВАТАРКИ: 15 героев игры + 5 тематических эмблем
   ========================================================= */
const AVATAR_DEFS = [
  {id:'pyro'},{id:'warlord'},{id:'grisha'},{id:'golly'},{id:'sasych'},
  {id:'ilya'},{id:'malit'},{id:'arcady'},{id:'illusionist'},{id:'shadow'},
  {id:'mo3gi'},{id:'regina'},{id:'juggernaut'},{id:'sniper'},{id:'chip'},{id:'savely'},
  {id:'shovel', name:'Лопата', c1:'#3a2415', c2:'#d7b36a'},
  {id:'tower',  name:'Башня',  c1:'#102a4a', c2:'#8be9fd'},
  {id:'ancient',name:'Древний',c1:'#3c1010', c2:'#ff6b57'},
  {id:'rune',   name:'Руна',   c1:'#241046', c2:'#c79bff'},
  {id:'creep',  name:'Крип',   c1:'#12301a', c2:'#7dff9a'}
];
const avatarImages = Object.create(null);
let avatarCacheBuilt = false;

function drawThemeAvatar(def, S){
  ctx.save();
  ctx.beginPath(); ctx.rect(0,0,S,S); ctx.clip();
  const bg = ctx.createLinearGradient(0,0,S,S);
  bg.addColorStop(0,'#0b0f1a'); bg.addColorStop(0.55,def.c1); bg.addColorStop(1,'#05070d');
  ctx.fillStyle = bg; ctx.fillRect(0,0,S,S);
  const glow = ctx.createRadialGradient(S*.5,S*.45,2,S*.5,S*.45,S*.7);
  glow.addColorStop(0, def.c2 + 'aa'); glow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0,0,S,S);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const cx = S/2, cy = S/2;
  if(def.id === 'shovel'){
    dsShovelGlyph(cx, cy, S*.8, '#e3e8ee');
  } else if(def.id === 'tower'){
    ctx.fillStyle = '#9fb6cf'; ctx.strokeStyle = '#0a1422'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.rect(cx-S*.17, cy-S*.14, S*.34, S*.5); ctx.fill(); ctx.stroke();
    for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.rect(cx+i*S*.13-S*.05, cy-S*.26, S*.1, S*.12); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = def.c2; ctx.shadowColor = def.c2; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(cx, cy+S*.04, S*.07, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a1422'; ctx.fillRect(cx-S*.05, cy+S*.2, S*.1, S*.16);
  } else if(def.id === 'ancient'){
    ctx.fillStyle = def.c2; ctx.strokeStyle = '#ffe2c9'; ctx.lineWidth = 3; ctx.shadowColor = def.c2; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(cx, cy-S*.34); ctx.lineTo(cx+S*.22, cy); ctx.lineTo(cx, cy+S*.34); ctx.lineTo(cx-S*.22, cy); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy-S*.34); ctx.lineTo(cx, cy+S*.34); ctx.moveTo(cx-S*.22, cy); ctx.lineTo(cx+S*.22, cy); ctx.stroke();
  } else if(def.id === 'rune'){
    ctx.strokeStyle = def.c2; ctx.lineWidth = 3; ctx.shadowColor = def.c2; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(cx, cy, S*.33, 0, Math.PI*2); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, S*.26, 0, Math.PI*2); ctx.stroke();
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx, cy-S*.2); ctx.lineTo(cx, cy+S*.2);
    ctx.moveTo(cx, cy-S*.1); ctx.lineTo(cx+S*.14, cy-S*.2);
    ctx.moveTo(cx, cy+S*.02); ctx.lineTo(cx-S*.14, cy-S*.08);
    ctx.moveTo(cx, cy+S*.12); ctx.lineTo(cx+S*.14, cy+S*.03); ctx.stroke(); ctx.shadowBlur = 0;
  } else if(def.id === 'creep'){
    ctx.fillStyle = '#4fb86a'; ctx.strokeStyle = '#0a1d10'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy+S*.04, S*.27, 0, Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8e4cf';
    ctx.beginPath(); ctx.moveTo(cx-S*.2, cy-S*.14); ctx.lineTo(cx-S*.3, cy-S*.34); ctx.lineTo(cx-S*.08, cy-S*.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+S*.2, cy-S*.14); ctx.lineTo(cx+S*.3, cy-S*.34); ctx.lineTo(cx+S*.08, cy-S*.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffec6b'; ctx.beginPath(); ctx.arc(cx-S*.1, cy, S*.05, 0, Math.PI*2); ctx.arc(cx+S*.1, cy, S*.05, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#0a1d10'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy+S*.14, S*.1, 0.15*Math.PI, 0.85*Math.PI); ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = def.c2 + 'aa'; ctx.lineWidth = 2; ctx.strokeRect(1,1,S-2,S-2);
  ctx.restore();
}

/* Рисуем в левом верхнем углу основного холста и копируем в скрытые холсты.
   Вызывается в начале кадра сразу после clearRect, поэтому на экране ничего не мелькает. */
function buildAvatarCache(){
  avatarCacheBuilt = true;
  const S = 96;
  for(const def of AVATAR_DEFS){
    try {
      ctx.save();
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,S,S);
      const heroDef = HERO_DEFS.find(item => item.id === def.id);
      if(heroDef) drawHeroTexture(heroDef, 0, 0, S, S, 0, false);
      else if(def.c1) drawThemeAvatar(def, S);
      else { ctx.restore(); continue; }
      ctx.restore();
      const off = document.createElement('canvas');
      off.width = S; off.height = S;
      off.getContext('2d').drawImage(canvas, 0, 0, S, S, 0, 0, S, S);
      avatarImages[def.id] = { canvas: off, url: off.toDataURL('image/png'), name: heroDef ? heroDef.name : def.name };
    } catch(err) { try { ctx.restore(); } catch(e) {} console.warn('Аватарка не создана:', def.id, err); }
  }
  ctx.clearRect(0,0,S,S);
  renderAccountModal();
}
function drawAvatarImage(id, x, y, size){
  const item = avatarImages[id];
  if(!item) return false;
  ctx.drawImage(item.canvas, x, y, size, size);
  return true;
}
async function accountSetAvatar(id){
  if(accountBusy || !account.token) return;
  accountBusy = true;
  try {
    const data = await accountApi('avatar', { token: account.token, avatar: id });
    accountSet(account.token, data.profile);
    setAccountMessage('Аватарка изменена', true);
  } catch(err) {
    if(err.status === 401) accountSet(null, null);
    setAccountMessage(err.message);
  }
  accountBusy = false;
}
function renderAvatarPicker(){
  const box = document.getElementById('acc-avatars');
  if(!box) return;
  const current = account.profile ? account.profile.avatar : '';
  if(box.childElementCount !== AVATAR_DEFS.length || box.dataset.ready !== String(avatarCacheBuilt)){
    box.innerHTML = '';
    for(const def of AVATAR_DEFS){
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'acc-avatar-opt'; button.dataset.id = def.id;
      const item = avatarImages[def.id];
      if(item){ button.style.backgroundImage = 'url(' + item.url + ')'; button.title = item.name; button.setAttribute('aria-label', item.name); }
      button.addEventListener('click', () => accountSetAvatar(def.id));
      button.addEventListener('pointerenter', () => playSynthSfx('hover'));
      box.appendChild(button);
    }
    box.dataset.ready = String(avatarCacheBuilt);
  }
  for(const button of box.children) button.classList.toggle('selected', button.dataset.id === current);
}

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
let accountMode = 'login';
let accountBusy = false;

function setAccountMessage(text, ok){
  accountUi.error.textContent = text || '';
  accountUi.error.classList.toggle('ok', !!ok);
}
function setAccountMode(mode){
  accountMode = mode;
  accountUi.tabLogin.classList.toggle('active', mode === 'login');
  accountUi.tabRegister.classList.toggle('active', mode === 'register');
  accountUi.submit.textContent = mode === 'login' ? 'ВОЙТИ' : 'СОЗДАТЬ АККАУНТ';
  accountUi.pass.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  setAccountMessage('');
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
window.openChangelog = function(){
  gameState = 'menu';
  menuStage = 'home';
  changelogOpen = true;
  changelogScroll = 0;
};
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
async function submitAccountForm(){
  if(accountBusy) return;
  const nick = accountUi.nick.value.trim();
  const password = accountUi.pass.value;
  if(!nick || !password){ setAccountMessage('Введи ник и пароль'); return; }
  accountBusy = true; accountUi.submit.disabled = true;
  try {
    const data = await accountApi(accountMode, { nick, password });
    accountUi.pass.value = '';
    accountSet(data.token, data.profile);
    accountFlushPending();
    setAccountMessage((accountMode === 'register' ? 'Аккаунт создан. Добро пожаловать, ' : 'С возвращением, ') + data.profile.nick + '!', true);
  } catch(err) {
    setAccountMessage(err.message);
  }
  accountBusy = false; accountUi.submit.disabled = false;
}
async function submitRename(){
  if(accountBusy || !account.token) return;
  const newNick = accountUi.newNick.value.trim();
  if(!newNick){ setAccountMessage('Введи новый ник'); return; }
  accountBusy = true; accountUi.rename.disabled = true;
  try {
    const data = await accountApi('nick', { token: account.token, newNick });
    accountUi.newNick.value = '';
    accountSet(account.token, data.profile);
    setAccountMessage('Ник изменён', true);
  } catch(err) {
    if(err.status === 401) accountSet(null, null);
    setAccountMessage(err.message);
  }
  accountBusy = false; accountUi.rename.disabled = false;
}
async function submitLogout(){
  const token = account.token;
  accountSet(null, null);
  setAccountMode('login');
  setAccountMessage('Ты вышел из аккаунта', true);
  if(token) { try { await accountApi('logout', { token }); } catch(err) {} }
}
(function bindAccountUi(){
  const ui = accountUi;
  /* Клавиши в окне аккаунта не должны попадать в игровые горячие клавиши. */
  ['keydown','keyup','keypress'].forEach(type => ui.modal.addEventListener(type, event => {
    event.stopPropagation();
    if(type === 'keydown' && event.key === 'Escape') closeAccountModal();
  }));
  ui.modal.addEventListener('mousedown', event => { if(event.target === ui.modal) closeAccountModal(); });
  ui.close.addEventListener('click', closeAccountModal);
  ui.tabLogin.addEventListener('click', () => setAccountMode('login'));
  ui.tabRegister.addEventListener('click', () => setAccountMode('register'));
  ui.submit.addEventListener('click', submitAccountForm);
  ui.rename.addEventListener('click', submitRename);
  ui.logout.addEventListener('click', submitLogout);
  [ui.nick, ui.pass].forEach(input => input.addEventListener('keydown', event => { if(event.key === 'Enter') submitAccountForm(); }));
  ui.newNick.addEventListener('keydown', event => { if(event.key === 'Enter') submitRename(); });
  [ui.close, ui.tabLogin, ui.tabRegister, ui.submit, ui.rename, ui.logout].forEach(button => button.addEventListener('pointerenter', () => playSynthSfx('hover')));

  /* Восстановление сессии: сразу показываем сохранённый профиль, затем сверяемся с сервером. */
  const token = accountRead(ACCOUNT_TOKEN_KEY);
  if(token){
    account.token = token;
    try { account.profile = JSON.parse(accountRead(ACCOUNT_PROFILE_KEY) || 'null'); } catch(err) { account.profile = null; }
    accountApi('me', { token }).then(data => {
      account.profile = data.profile;
      accountStore(ACCOUNT_PROFILE_KEY, JSON.stringify(data.profile));
      renderAccountModal();
      loadAccountCareer();
      accountFlushPending();
    }).catch(err => {
      if(err.status === 401) accountSet(null, null);
    });
  }
  renderAccountModal();
})();

/* =========================================================
   DOTA SENSE — главное меню в красной теме
   ========================================================= */
let menuHomeHits = [];
let menuProfileRect = null;

function dsMetalPanel(x,y,w,h,stroke){
  ctx.save();
  const fill=ctx.createLinearGradient(x,y,x,y+h);
  fill.addColorStop(0,'rgba(38,27,31,0.95)'); fill.addColorStop(1,'rgba(14,10,13,0.97)');
  ctx.fillStyle=fill; ctx.strokeStyle=stroke||'#7a2a2a'; ctx.lineWidth=2;
  ctx.shadowColor='rgba(0,0,0,0.65)'; ctx.shadowBlur=14;
  ctx.beginPath(); ctx.roundRect(x,y,w,h,6); ctx.fill();
  ctx.shadowBlur=0; ctx.stroke();
  ctx.strokeStyle='rgba(210,130,110,0.22)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(x+4,y+4,w-8,h-8,3); ctx.stroke();
  ctx.restore();
}

function dsShovelGlyph(cx,cy,size,color){
  ctx.save();
  ctx.translate(cx,cy); ctx.rotate(-0.7);
  ctx.fillStyle='#7a4b2a'; ctx.fillRect(-size*0.05,-size*0.5,size*0.1,size*0.62);
  ctx.fillRect(-size*0.16,-size*0.52,size*0.32,size*0.07);
  ctx.fillStyle=color||'#cfd5dc'; ctx.strokeStyle='#1a1214'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(-size*0.18,size*0.1); ctx.lineTo(size*0.18,size*0.1);
  ctx.quadraticCurveTo(size*0.22,size*0.42,0,size*0.55); ctx.quadraticCurveTo(-size*0.22,size*0.42,-size*0.18,size*0.1);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function dsHash(n){ const v=Math.sin(n*12.9898+78.233)*43758.5453; return v-Math.floor(v); }

function dsRuneGlyph(x,y,size,seed){
  ctx.beginPath();
  ctx.moveTo(x,y-size); ctx.lineTo(x,y+size);
  const branches=1+Math.floor(dsHash(seed)*3);
  for(let b=0;b<branches;b++){
    const by=y-size+dsHash(seed*3+b+1)*size*1.5;
    const dir=dsHash(seed*5+b+2)>0.5?1:-1;
    const len=size*(0.5+dsHash(seed*7+b+3)*0.7);
    const tilt=(dsHash(seed*11+b+4)-0.5)*size*0.8;
    ctx.moveTo(x,by); ctx.lineTo(x+dir*len,by+tilt+size*0.45);
  }
  ctx.stroke();
}

/* Большая рунная печать: кольца, руны, гексаграмма, пентаграмма и горящий глаз. */
function dsDrawSigil(cx,cy,R,now,intensity){
  intensity=intensity==null?1:intensity;
  const pulse=0.5+0.5*Math.sin(now*2);
  ctx.save();
  ctx.translate(cx,cy);
  ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.globalCompositeOperation='lighter';
  const disc=ctx.createRadialGradient(0,0,R*0.1,0,0,R*1.18);
  disc.addColorStop(0,'rgba(255,70,45,'+(0.24*intensity)+')');
  disc.addColorStop(0.7,'rgba(160,20,20,'+(0.10*intensity)+')');
  disc.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=disc; ctx.beginPath(); ctx.arc(0,0,R*1.18,0,Math.PI*2); ctx.fill();

  const ringColor='rgba(255,110,85,'+((0.55+0.3*pulse)*intensity)+')';
  const softColor='rgba(255,100,80,'+(0.45*intensity)+')';
  const goldColor='rgba(255,205,140,'+(0.8*intensity)+')';
  ctx.shadowColor='rgba(255,60,40,0.9)'; ctx.shadowBlur=18;
  ctx.strokeStyle=ringColor; ctx.lineWidth=3;
  ctx.beginPath(); ctx.arc(0,0,R,0,Math.PI*2); ctx.stroke();
  ctx.lineWidth=1.2; ctx.strokeStyle=softColor;
  ctx.beginPath(); ctx.arc(0,0,R*1.065,0,Math.PI*2); ctx.stroke();
  ctx.shadowBlur=0;

  ctx.setLineDash([3,12]); ctx.lineDashOffset=-now*18; ctx.lineWidth=1.6; ctx.strokeStyle=softColor;
  ctx.beginPath(); ctx.arc(0,0,R*0.93,0,Math.PI*2); ctx.stroke();
  ctx.setLineDash([]);

  ctx.save(); ctx.rotate(now*0.08); ctx.beginPath();
  for(let i=0;i<72;i++){
    const a=i*Math.PI*2/72, long=i%6===0, r0=R*0.84, r1=R*(long?0.91:0.875);
    ctx.moveTo(Math.cos(a)*r0,Math.sin(a)*r0); ctx.lineTo(Math.cos(a)*r1,Math.sin(a)*r1);
  }
  ctx.lineWidth=1.4; ctx.strokeStyle=softColor; ctx.stroke(); ctx.restore();

  ctx.save(); ctx.rotate(-now*0.06); ctx.lineWidth=1.8; ctx.strokeStyle=goldColor;
  for(let i=0;i<24;i++){
    ctx.save(); ctx.rotate(i*Math.PI*2/24); ctx.translate(0,-R*0.76);
    dsRuneGlyph(0,0,R*0.042,i+1);
    ctx.restore();
  }
  ctx.restore();

  ctx.lineWidth=1.4; ctx.strokeStyle=softColor;
  ctx.beginPath(); ctx.arc(0,0,R*0.69,0,Math.PI*2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0,0,R*0.67,0,Math.PI*2); ctx.stroke();

  ctx.save(); ctx.rotate(now*0.14); ctx.lineWidth=1.8; ctx.strokeStyle=ringColor;
  for(let tri=0;tri<2;tri++){
    ctx.beginPath();
    for(let i=0;i<3;i++){
      const a=i*Math.PI*2/3+tri*Math.PI/3-Math.PI/2;
      const px=Math.cos(a)*R*0.66, py=Math.sin(a)*R*0.66;
      if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath(); ctx.stroke();
  }
  ctx.restore();

  ctx.save(); ctx.rotate(-now*0.1); ctx.lineWidth=1.6; ctx.strokeStyle=goldColor;
  ctx.beginPath();
  for(let i=0;i<=5;i++){
    const a=((i*2)%5)*Math.PI*2/5-Math.PI/2;
    const px=Math.cos(a)*R*0.5, py=Math.sin(a)*R*0.5;
    if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
  }
  ctx.stroke(); ctx.restore();

  ctx.lineWidth=1.6; ctx.strokeStyle=ringColor;
  ctx.beginPath(); ctx.arc(0,0,R*0.34,0,Math.PI*2); ctx.stroke();
  ctx.save(); ctx.rotate(now*0.3); ctx.fillStyle=goldColor;
  for(let i=0;i<8;i++){
    ctx.save(); ctx.rotate(i*Math.PI/4); ctx.translate(0,-R*0.34);
    ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(3,0); ctx.lineTo(0,4); ctx.lineTo(-3,0); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  /* Горящий глаз в центре. */
  const ew=R*0.27, eh=R*0.1;
  ctx.globalCompositeOperation='source-over';
  ctx.beginPath(); ctx.moveTo(-ew,0); ctx.quadraticCurveTo(0,-eh*2,ew,0); ctx.quadraticCurveTo(0,eh*2,-ew,0); ctx.closePath();
  ctx.fillStyle='rgba(18,0,2,'+(0.92*intensity)+')'; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.globalCompositeOperation='lighter';
  const iris=ctx.createRadialGradient(0,0,0,0,0,R*0.1);
  iris.addColorStop(0,'rgba(255,240,200,'+intensity+')'); iris.addColorStop(0.35,'rgba(255,120,70,'+intensity+')'); iris.addColorStop(1,'rgba(160,10,10,0)');
  ctx.fillStyle=iris; ctx.beginPath(); ctx.arc(0,0,R*(0.1+0.012*pulse),0,Math.PI*2); ctx.fill();
  ctx.globalCompositeOperation='source-over';
  ctx.fillStyle='rgba(10,0,0,'+(0.95*intensity)+')';
  ctx.beginPath(); ctx.ellipse(0,0,R*0.014,R*0.07,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.globalCompositeOperation='lighter';
  ctx.beginPath(); ctx.moveTo(-ew,0); ctx.quadraticCurveTo(0,-eh*2,ew,0); ctx.quadraticCurveTo(0,eh*2,-ew,0); ctx.closePath();
  ctx.lineWidth=2; ctx.strokeStyle=goldColor; ctx.stroke();

  /* Огненные шары на орбите с хвостами. */
  for(let k=0;k<3;k++){
    const base=now*(0.5+k*0.12)+k*2.1;
    for(let tr=0;tr<12;tr++){
      const a=base-tr*0.05, rr=R*(1.12+k*0.06);
      const fade=1-tr/12;
      ctx.fillStyle='rgba('+(k===1?'255,200,120':'255,100,60')+','+(fade*0.85*intensity)+')';
      ctx.beginPath(); ctx.arc(Math.cos(a)*rr,Math.sin(a)*rr,(4.2-k*0.5)*fade*(0.6+R/320),0,Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();
}

/* Алый вихрь: спиральные рукава, молнии по ободу и обломки на орбите. */
function dsDrawPortal(px,py,rx,ry,now){
  ctx.save();
  ctx.translate(px,py);
  ctx.globalCompositeOperation='lighter';
  ctx.save(); ctx.scale(1,ry/rx);
  const aura=ctx.createRadialGradient(0,0,rx*0.2,0,0,rx*2.3);
  aura.addColorStop(0,'rgba(255,60,35,0.38)'); aura.addColorStop(0.5,'rgba(150,15,20,0.16)'); aura.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=aura; ctx.beginPath(); ctx.arc(0,0,rx*2.3,0,Math.PI*2); ctx.fill();
  ctx.restore();

  ctx.globalCompositeOperation='source-over';
  ctx.save(); ctx.scale(rx,ry);
  const body=ctx.createRadialGradient(0,0,0,0,0,1);
  body.addColorStop(0,'rgba(5,0,0,1)'); body.addColorStop(0.35,'rgba(30,2,4,0.98)');
  body.addColorStop(0.75,'rgba(120,12,14,0.9)'); body.addColorStop(1,'rgba(230,50,35,0.85)');
  ctx.fillStyle=body; ctx.beginPath(); ctx.arc(0,0,1,0,Math.PI*2); ctx.fill();
  ctx.restore();

  ctx.globalCompositeOperation='lighter';
  const ARMS=5, PER=44;
  for(let a=0;a<ARMS;a++){
    for(let j=0;j<PER;j++){
      const t=j/PER;
      const ang=a*Math.PI*2/ARMS+t*6.5-now*1.1*(1.2-t*0.5);
      const rr=0.12+t*0.86;
      const x=Math.cos(ang)*rr*rx, y=Math.sin(ang)*rr*ry;
      const size=(1-t)*3+1;
      const alpha=(0.15+0.7*(1-t)*(0.6+0.4*dsHash(a*50+j))).toFixed(3);
      ctx.fillStyle=t<0.35?'rgba(255,230,190,'+alpha+')':(t<0.7?'rgba(255,120,80,'+alpha+')':'rgba(220,40,30,'+alpha+')');
      ctx.fillRect(x-size/2,y-size/2,size,size);
    }
  }
  ctx.shadowColor='rgba(255,60,40,1)'; ctx.shadowBlur=14;
  ctx.lineWidth=2.5; ctx.strokeStyle='rgba(255,170,120,0.85)';
  ctx.beginPath(); ctx.ellipse(0,0,rx*0.42,ry*0.42,0,0,Math.PI*2); ctx.stroke();
  ctx.lineWidth=2; ctx.strokeStyle='rgba(255,110,85,0.7)';
  for(let k=0;k<3;k++){
    const a0=now*(0.9+k*0.3)*(k%2?-1:1);
    ctx.beginPath(); ctx.ellipse(0,0,rx*(0.62+k*0.14),ry*(0.62+k*0.14),0,a0,a0+Math.PI*1.2); ctx.stroke();
  }
  ctx.lineWidth=4; ctx.strokeStyle='rgba(255,90,60,0.85)';
  ctx.beginPath(); ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2); ctx.stroke();
  ctx.shadowBlur=0;

  const seed=Math.floor(now*9);
  ctx.lineWidth=1.6; ctx.strokeStyle='rgba(255,200,170,0.85)';
  for(let b=0;b<3;b++){
    const base=dsHash(seed*3+b)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(Math.cos(base)*rx,Math.sin(base)*ry);
    for(let seg=1;seg<=6;seg++){
      const outward=1+seg*0.11;
      const jitter=(dsHash(seed*17+b*7+seg)-0.5)*0.35;
      ctx.lineTo(Math.cos(base+jitter)*rx*outward,Math.sin(base+jitter)*ry*outward);
    }
    ctx.stroke();
  }

  ctx.globalCompositeOperation='source-over';
  for(let i=0;i<12;i++){
    const a=now*0.25*(i%2?1:-1)+i*0.9, orbit=1.25+0.25*dsHash(i), size=5+dsHash(i+9)*8;
    ctx.save(); ctx.translate(Math.cos(a)*rx*orbit,Math.sin(a)*ry*orbit*0.92); ctx.rotate(a*2+i);
    ctx.fillStyle=i%3?'#1a0709':'#2a0c0e'; ctx.strokeStyle='rgba(255,90,60,0.55)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(-size,-size*0.4); ctx.lineTo(size*0.2,-size); ctx.lineTo(size,size*0.3); ctx.lineTo(-size*0.3,size*0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/* Логотип DOTA / SENSE + большая золотая тройка (нарисована вектором, без шрифтов). */
function dsDrawGoldThree(cx,cy,H,now){
  const r1=H*0.235, r2=H*0.265, lw=H*0.2;
  const c1=cy-H/2+r1, c2=cy+H/2-r2, jy=c1+r1;
  const path=new Path2D();
  path.arc(cx,c1,r1,Math.PI*1.1,Math.PI*2.5,false);
  path.moveTo(cx-r1*0.45,jy); path.lineTo(cx,jy);
  path.moveTo(cx,c2-r2);
  path.arc(cx,c2,r2,Math.PI*1.5,Math.PI*2.9,false);
  ctx.save();
  ctx.lineJoin='round'; ctx.lineCap='round';
  const pulse=0.5+0.5*Math.sin(now*2.2);
  ctx.shadowColor='rgba(255,150,50,'+(0.5+0.35*pulse)+')'; ctx.shadowBlur=H*0.3;
  ctx.strokeStyle='#2a0808'; ctx.lineWidth=lw+H*0.09; ctx.stroke(path);
  ctx.shadowBlur=0;
  const gold=ctx.createLinearGradient(0,cy-H/2,0,cy+H/2);
  gold.addColorStop(0,'#fff6c8'); gold.addColorStop(0.35,'#f6c14a'); gold.addColorStop(0.7,'#c4761c'); gold.addColorStop(1,'#7a3d0e');
  ctx.strokeStyle=gold; ctx.lineWidth=lw; ctx.stroke(path);
  ctx.strokeStyle='rgba(120,30,10,0.55)'; ctx.lineWidth=lw*0.12; ctx.stroke(path);
  ctx.translate(-lw*0.18,-lw*0.2);
  ctx.strokeStyle='rgba(255,255,240,0.6)'; ctx.lineWidth=lw*0.2; ctx.stroke(path);
  ctx.restore();
  /* Мерцающая искра на тройке. */
  const sx=cx+r1*0.95, sy=cy-H*0.42, size=H*(0.12+0.06*Math.sin(now*3.1));
  ctx.save(); ctx.globalCompositeOperation='lighter'; ctx.fillStyle='rgba(255,240,200,0.9)';
  ctx.beginPath(); ctx.moveTo(sx,sy-size*2); ctx.lineTo(sx+size*0.35,sy-size*0.35); ctx.lineTo(sx+size*2,sy); ctx.lineTo(sx+size*0.35,sy+size*0.35);
  ctx.lineTo(sx,sy+size*2); ctx.lineTo(sx-size*0.35,sy+size*0.35); ctx.lineTo(sx-size*2,sy); ctx.lineTo(sx-size*0.35,sy-size*0.35); ctx.closePath(); ctx.fill();
  ctx.restore();
}

function drawDotaSenseLogo(cx,y,w,h,now,noMoon){
  now=now||performance.now()/1000;
  ctx.save();
  const x=cx-w/2, c=Math.round(h*0.22);
  const plate=ctx.createLinearGradient(x,y,x,y+h);
  plate.addColorStop(0,'#4a4a50'); plate.addColorStop(0.5,'#2a2a30'); plate.addColorStop(1,'#1a1a1f');
  ctx.shadowColor='rgba(0,0,0,0.75)'; ctx.shadowBlur=18;
  ctx.fillStyle=plate; ctx.strokeStyle='#8f6a62'; ctx.lineWidth=3;
  ctx.beginPath();
  ctx.moveTo(x+c,y); ctx.lineTo(x+w-c,y); ctx.lineTo(x+w,y+c); ctx.lineTo(x+w,y+h-c);
  ctx.lineTo(x+w-c,y+h); ctx.lineTo(x+c,y+h); ctx.lineTo(x,y+h-c); ctx.lineTo(x,y+c); ctx.closePath();
  ctx.fill(); ctx.shadowBlur=0; ctx.stroke();
  ctx.strokeStyle='rgba(190,50,40,0.7)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(x+9,y+8,w-18,h-16,4); ctx.stroke();
  for(const px of [x+4,x+w-4]){
    ctx.fillStyle='#b4231f'; ctx.strokeStyle='#e8c9b0'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(px,y+h/2-9); ctx.lineTo(px+9,y+h/2); ctx.lineTo(px,y+h/2+9); ctx.lineTo(px-9,y+h/2); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  /* Замеряем слова при базовом размере и ужимаем всё, чтобы влезло вместе с тройкой. */
  const baseFont=Math.round(h*0.56);
  ctx.font='900 '+baseFont+'px Georgia, serif';
  const dotaW0=ctx.measureText('DOTA').width, senseW0=ctx.measureText('SENSE').width;
  const emblem0=h*0.6, gap0=h*0.12, threeW0=h*0.5;
  const total0=dotaW0+gap0+emblem0+gap0+senseW0+gap0*1.8+threeW0;
  const k=Math.min(1,(w-h*0.95)/total0);
  const fontPx=Math.max(8,Math.round(baseFont*k));
  const emblem=emblem0*k, gap=gap0*k, threeW=threeW0*k;
  ctx.font='900 '+fontPx+'px Georgia, serif';
  ctx.textBaseline='middle'; ctx.textAlign='left';
  const dotaW=ctx.measureText('DOTA').width, senseW=ctx.measureText('SENSE').width;
  const total=dotaW+gap+emblem+gap+senseW+gap*1.8+threeW;
  let tx=cx-total/2; const ty=y+h/2+2;
  const drawWord=(word,wx)=>{
    ctx.lineWidth=5; ctx.strokeStyle='#120c0e'; ctx.strokeText(word,wx,ty);
    const tg=ctx.createLinearGradient(0,ty-fontPx/2,0,ty+fontPx/2);
    tg.addColorStop(0,'#efe6d3'); tg.addColorStop(1,'#a89f8d');
    ctx.fillStyle=tg; ctx.fillText(word,wx,ty);
  };
  drawWord('DOTA',tx); tx+=dotaW+gap;
  ctx.save();
  ctx.translate(tx+emblem/2,y+h/2);
  ctx.fillStyle='#b4231f'; ctx.strokeStyle='#2a0c0c'; ctx.lineWidth=3;
  ctx.shadowColor='rgba(255,60,40,0.7)'; ctx.shadowBlur=14;
  ctx.beginPath(); ctx.roundRect(-emblem/2,-emblem/2,emblem,emblem,5); ctx.fill(); ctx.stroke();
  ctx.shadowBlur=0;
  ctx.fillStyle='#ece3d2';
  ctx.beginPath(); ctx.moveTo(-emblem*0.38,emblem*0.42); ctx.lineTo(-emblem*0.14,emblem*0.42); ctx.lineTo(emblem*0.38,-emblem*0.42); ctx.lineTo(emblem*0.14,-emblem*0.42); ctx.closePath(); ctx.fill();
  ctx.restore();
  tx+=emblem+gap;
  drawWord('SENSE',tx); tx+=senseW+gap*1.8;
  dsDrawGoldThree(tx+threeW/2,y+h/2+h*0.02,h*0.66*k+h*0.08*(1-k),now);
  ctx.textBaseline='alphabetic';
  ctx.restore();
  /* кровавая луна слева от логотипа (справа теперь профиль игрока) */
  if(!noMoon && VW>=900){
    const mr=Math.round(h*0.34), mx=x-mr*2.4, my=y+h*0.55;
    if(mx>mr*1.6){
      ctx.save();
      const moon=ctx.createRadialGradient(mx-mr*0.3,my-mr*0.3,mr*0.1,mx,my,mr);
      moon.addColorStop(0,'#ff6a5a'); moon.addColorStop(0.6,'#c01f1f'); moon.addColorStop(1,'#6b0c10');
      ctx.shadowColor='rgba(255,50,40,0.85)'; ctx.shadowBlur=36;
      ctx.fillStyle=moon; ctx.beginPath(); ctx.arc(mx,my,mr,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }
}

function drawDotaSenseBackdrop(now){
  ctx.save();
  const base=ctx.createLinearGradient(0,0,0,VH);
  base.addColorStop(0,'#1c0508'); base.addColorStop(0.5,'#3a0a0e'); base.addColorStop(1,'#0d0204');
  ctx.fillStyle=base; ctx.fillRect(0,0,VW,VH);
  const glow=ctx.createRadialGradient(VW*0.5,VH*0.46,0,VW*0.5,VH*0.46,Math.max(VW,VH)*0.62);
  glow.addColorStop(0,'rgba(190,40,30,0.38)'); glow.addColorStop(0.5,'rgba(110,18,20,0.18)'); glow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,VW,VH);

  /* тусклые звёзды */
  for(let i=0;i<90;i++){
    const x=((i*0.61803398875)%1)*VW, y=((i*0.75487766625)%1)*VH*0.72;
    const tw=0.5+0.5*Math.sin(now*(0.7+i%5*0.2)+i*1.9);
    ctx.globalAlpha=0.15+0.5*tw*(i%7===0?1:0.55);
    ctx.fillStyle=i%9===0?'#ffd9b0':'#ffc4bb';
    ctx.fillRect(x,y,i%13===0?2:1,i%13===0?2:1);
  }
  ctx.globalAlpha=1;

  /* медленный туман */
  for(let i=0;i<5;i++){
    const fx=VW*(0.1+i*0.2)+Math.sin(now*0.07+i*2)*90, fy=VH*(0.55+(i%2)*0.2)+Math.cos(now*0.05+i)*30;
    const fr=Math.min(VW,VH)*0.5;
    const fog=ctx.createRadialGradient(fx,fy,0,fx,fy,fr);
    fog.addColorStop(0,'rgba(130,24,28,0.16)'); fog.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=fog; ctx.fillRect(fx-fr,fy-fr,fr*2,fr*2);
  }

  const R=Math.min(VW*0.2,VH*0.3), sx=VW*0.37, sy=VH*0.5;
  const prx=Math.min(VW*0.085,VH*0.15), pry=prx*1.9, ppx=VW*0.66, ppy=VH*0.5;

  /* столб света над печатью */
  ctx.save(); ctx.globalCompositeOperation='lighter';
  const beam=ctx.createLinearGradient(0,0,0,sy);
  beam.addColorStop(0,'rgba(255,60,40,0)'); beam.addColorStop(1,'rgba(255,60,40,'+(0.2+0.06*Math.sin(now*1.6))+')');
  ctx.fillStyle=beam; ctx.fillRect(sx-R*0.22,0,R*0.44,sy);
  ctx.restore();

  dsDrawSigil(sx,sy,R,now);

  /* поток энергии от печати к вихрю */
  if(VW>=700){
    const x0=sx+R*0.98, y0=sy-R*0.1, x2=ppx-prx*1.1, y2=ppy-pry*0.2, x1=(x0+x2)/2, y1=sy-R*1.1;
    ctx.save(); ctx.globalCompositeOperation='lighter';
    ctx.strokeStyle='rgba(255,90,60,0.12)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(x0,y0); ctx.quadraticCurveTo(x1,y1,x2,y2); ctx.stroke();
    for(let i=0;i<36;i++){
      const t=(now*0.12+i/36)%1, u=1-t;
      const bx=u*u*x0+2*u*t*x1+t*t*x2, by=u*u*y0+2*u*t*y1+t*t*y2;
      const pulse=Math.sin(Math.PI*t);
      ctx.fillStyle='rgba(255,'+(140+Math.round(80*pulse))+',90,'+(0.85*pulse)+')';
      ctx.beginPath(); ctx.arc(bx,by,1.2+2*pulse,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  dsDrawPortal(ppx,ppy,prx,pry,now);

  /* скалы по низу */
  for(let layer=0;layer<2;layer++){
    ctx.fillStyle=layer?'rgba(14,3,6,0.97)':'rgba(48,10,14,0.85)';
    ctx.beginPath(); ctx.moveTo(0,VH);
    const peaks=14;
    for(let i=0;i<=peaks;i++){
      const px2=i*VW/peaks;
      const py2=VH*(0.84+layer*0.05)-Math.abs(Math.sin(i*2.1+layer*1.7))*VH*0.07-((i*7+layer*3)%4)*VH*0.012;
      ctx.lineTo(px2,py2);
    }
    ctx.lineTo(VW,VH); ctx.closePath(); ctx.fill();
  }

  /* поднимающиеся искры и пепел, ветер дует вправо */
  ctx.save(); ctx.globalCompositeOperation='lighter';
  for(let i=0;i<90;i++){
    const phase=(now*0.045*(0.6+(i%5)*0.2)+i/90)%1;
    const ex=((i*137.5)%VW)+phase*60+Math.sin(now*0.6+i)*16, ey=VH*(1-phase);
    ctx.globalAlpha=0.75*Math.sin(phase*Math.PI);
    ctx.fillStyle=i%4===0?'#ffd27a':'#ff6a3d';
    const size=i%6===0?2.4:(i%3===0?1.6:1.1);
    ctx.fillRect(ex,ey,size,size);
  }
  ctx.restore();

  const vig=ctx.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*0.3,VW/2,VH/2,Math.max(VW,VH)*0.75);
  vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,0,0.6)');
  ctx.fillStyle=vig; ctx.fillRect(0,0,VW,VH);
  ctx.restore();
}

function drawDotaSenseHome(){
  const s=menuScale(), m=Math.round(44*s);
  const hit=(r)=>mouse.x>=r.x&&mouse.x<=r.x+r.w&&mouse.y>=r.y&&mouse.y<=r.y+r.h;

  /* --- ИГРАТЬ 3x3 --- */
  const play=menuPlayRect();
  drawMenuButton(play,'ИГРАТЬ',{primary:true,large:true,fontSize:Math.round(34*s),radius:10});
  ctx.save();
  ctx.fillStyle='rgba(255,236,200,0.9)'; ctx.font='bold '+Math.round(26*s)+'px Georgia, serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.beginPath(); ctx.arc(play.x+play.h*0.55,play.y+play.h/2,play.h*0.34,0,Math.PI*2);
  ctx.fillStyle='rgba(30,8,10,0.75)'; ctx.fill(); ctx.strokeStyle='#e8c9b0'; ctx.lineWidth=2; ctx.stroke();
  ctx.fillStyle='#ffe6c2'; ctx.font='bold '+Math.round(26*s)+'px Segoe UI, Arial'; ctx.fillText('⚔',play.x+play.h*0.55,play.y+play.h/2+1);
  const tab={x:play.x+play.w/2-Math.round(62*s),y:play.y+play.h-2,w:Math.round(124*s),h:Math.round(38*s)};
  ctx.fillStyle='#2a1a1d'; ctx.strokeStyle='#8f3b34'; ctx.lineWidth=2;
  ctx.beginPath(); ctx.moveTo(tab.x,tab.y); ctx.lineTo(tab.x+tab.w,tab.y); ctx.lineTo(tab.x+tab.w-10,tab.y+tab.h); ctx.lineTo(tab.x+10,tab.y+tab.h); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#e65a46'; ctx.font='bold '+Math.round(20*s)+'px Georgia, serif'; ctx.fillText('3x3',tab.x+tab.w/2,tab.y+tab.h/2+2);
  ctx.restore();

  /* --- левая колонка: новинки магазина --- */
  const colX=play.x, colW=play.w;
  const aY=tab.y+tab.h+Math.round(18*s);
  const rowH=Math.round(66*s), aH=Math.round(40*s)+3*rowH+Math.round(20*s);
  dsMetalPanel(colX,aY,colW,aH);
  ctx.save();
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillStyle='#e65a46'; ctx.font='bold '+Math.round(14*s)+'px Georgia, serif';
  ctx.fillText('НОВИНКИ МАГАЗИНА',colX+Math.round(16*s),aY+Math.round(22*s));
  const showcase=[
    {id:'zamist',line:'Защита, урон и скорость на 10 секунд'},
    {id:'disperser',line:'Очищение союзника или замедление врага'},
    {id:'brainAss',line:'+350 скорости атаки и +250 урона'}
  ];
  showcase.forEach((entry,index)=>{
    const def=SHOP_ITEMS[entry.id];
    const ry=aY+Math.round(40*s)+index*rowH;
    ctx.fillStyle='rgba(120,30,30,0.18)'; ctx.fillRect(colX+Math.round(10*s),ry,colW-Math.round(20*s),rowH-Math.round(6*s));
    drawItemIcon({id:entry.id,color:def.color,icon:def.icon},colX+Math.round(44*s),ry+(rowH-6*s)/2,Math.round(46*s));
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillStyle='#f3e4c6'; ctx.font='bold '+Math.round(16*s)+'px Segoe UI, Arial';
    ctx.fillText(def.name,colX+Math.round(80*s),ry+Math.round(17*s));
    ctx.fillStyle='#ffd568'; ctx.font='bold '+Math.round(13*s)+'px Consolas, monospace';
    ctx.fillText('◆ '+def.cost.toLocaleString('ru-RU'),colX+Math.round(80*s),ry+Math.round(37*s));
    ctx.fillStyle='rgba(235,225,215,0.6)'; ctx.font=Math.round(11*s)+'px Segoe UI, Arial';
    ctx.fillText(entry.line,colX+Math.round(80*s),ry+Math.round(54*s));
  });
  ctx.restore();

  /* --- левая колонка: лопата челлендж --- */
  const bY=aY+aH+Math.round(14*s), bH=Math.round(92*s);
  const challenge={x:colX,y:bY,w:colW,h:bH};
  const chHover=hit(challenge);
  dsMetalPanel(challenge.x,challenge.y,challenge.w,challenge.h,chHover?'#e65a46':'#7a2a2a');
  menuHomeHits.push({x:challenge.x,y:challenge.y,w:challenge.w,h:challenge.h,action:'store'});
  menuButtonHitboxes.push({x:challenge.x,y:challenge.y,w:challenge.w,h:challenge.h,key:'challenge'});
  dsShovelGlyph(challenge.x+Math.round(46*s),challenge.y+challenge.h/2,Math.round(56*s));
  ctx.save();
  ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillStyle='#e65a46'; ctx.font='bold '+Math.round(11*s)+'px Consolas, monospace';
  ctx.fillText('НОВАЯ ФРАЗА',challenge.x+Math.round(92*s),challenge.y+Math.round(22*s));
  ctx.fillStyle='#fff0c7'; ctx.font='bold '+Math.round(19*s)+'px Georgia, serif';
  ctx.fillText('ЛОПАТА ЧЕЛЛЕНДЖ',challenge.x+Math.round(92*s),challenge.y+Math.round(46*s));
  ctx.fillStyle='rgba(235,225,215,0.65)'; ctx.font=Math.round(11*s)+'px Segoe UI, Arial';
  ctx.fillText(isStorePhraseOwned('shovel')?'Получено • жми K в бою':'Забери бесплатно во вкладке «Фразы»',challenge.x+Math.round(92*s),challenge.y+Math.round(69*s));
  ctx.restore();

  /* --- профиль (клик открывает окно аккаунта) --- */
  const gear=menuSettingsRect();
  const profW=Math.round(260*s), profH=gear.h;
  const prof={x:gear.x-Math.round(12*s)-profW,y:gear.y,w:profW,h:profH};
  menuProfileRect=prof;
  const profHover=hit(prof);
  const pf=account.profile;
  const frameColor=pf&&pf.frame==='legend'?'#ffd568':pf&&pf.frame==='dominion'?'#d797ff':pf&&pf.frame==='veteran'?'#67c9df':'#6b2a2a';
  menuButtonHitboxes.push({x:prof.x,y:prof.y,w:prof.w,h:prof.h,key:'profile'});
  dsMetalPanel(prof.x,prof.y,prof.w,prof.h,profHover?'#e65a46':frameColor);
  const pNick=pf?pf.nick:'Гость', pLevel=pf?pf.level:0;
  ctx.save();
  const av=profH-Math.round(12*s);
  ctx.fillStyle='#14090c'; ctx.strokeStyle=pf?frameColor:'#8f6a62'; ctx.lineWidth=2;
  ctx.fillRect(prof.x+6,prof.y+6,av,av); ctx.strokeRect(prof.x+6,prof.y+6,av,av);
  ctx.fillStyle='#d9d0bf'; ctx.font='bold '+Math.round(26*s)+'px Georgia, serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  if(!(pf && pf.avatar && drawAvatarImage(pf.avatar,prof.x+6,prof.y+6,av))) ctx.fillText(pf?pNick.charAt(0).toUpperCase():'?',prof.x+6+av/2,prof.y+6+av/2+1);
  const badgeW=Math.max(Math.round(28*s),Math.round((String(pLevel).length*8+12)*s));
  ctx.fillStyle='#b4231f'; ctx.fillRect(prof.x+6+av/2-badgeW/2,prof.y+profH-Math.round(9*s),badgeW,Math.round(13*s));
  ctx.fillStyle='#fff'; ctx.font='bold '+Math.round(10*s)+'px Consolas, monospace'; ctx.fillText(String(pLevel),prof.x+6+av/2,prof.y+profH-Math.round(2.5*s));
  ctx.textAlign='left';
  const tx0=prof.x+av+Math.round(18*s), maxTextW=prof.x+prof.w-tx0-Math.round(26*s);
  ctx.fillStyle='#e8c984'; ctx.font='bold '+Math.round(14*s)+'px Segoe UI, Arial';
  let shownNick=pNick; while(shownNick.length>3 && ctx.measureText(shownNick).width>maxTextW) shownNick=shownNick.slice(0,-1);
  ctx.fillText(shownNick+(shownNick!==pNick?'…':''),tx0,prof.y+Math.round(15*s));
  ctx.fillStyle=pf?frameColor:'rgba(255,200,170,0.75)'; ctx.font=Math.round(12*s)+'px Segoe UI, Arial';
  ctx.fillText(pf?'✦ '+(pf.title||accountRank(pLevel)):'Нажми, чтобы войти',tx0,prof.y+Math.round(31*s));
  ctx.fillStyle='#ffd568'; ctx.font='bold '+Math.round(12*s)+'px Consolas, monospace';
  ctx.fillText(pf?'◆ Побед: '+pf.wins+'  Поражений: '+pf.losses:'Создай аккаунт',tx0,prof.y+Math.round(46*s));
  ctx.textAlign='right'; ctx.fillStyle=profHover?'#ffd568':'rgba(255,240,199,0.45)'; ctx.font=Math.round(14*s)+'px Segoe UI, Arial';
  ctx.fillText('✎',prof.x+prof.w-Math.round(10*s),prof.y+Math.round(16*s));
  ctx.restore();

  /* --- NEWS & EVENTS --- */
  const nW=Math.round(300*s), nX=VW-m-nW, nY=Math.round(118*s), nH=VH-nY-Math.round(80*s);
  dsMetalPanel(nX,nY,nW,nH);
  ctx.save();
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle='#e65a46'; ctx.font='bold '+Math.round(17*s)+'px Georgia, serif';
  ctx.fillText('NEWS & EVENTS',nX+nW/2,nY+Math.round(24*s));
  ctx.fillStyle='rgba(230,90,70,0.4)'; ctx.fillRect(nX+Math.round(14*s),nY+Math.round(42*s),nW-Math.round(28*s),1);
  const news=[
    {tag:'0.8.0',title:'ALL PICK: НОВЫЙ РЕЖИМ',art:'allpick',action:'changelog'},
    {tag:'0.7.7',title:'УЛУЧШЕННАЯ КАРТА',art:'map',action:'changelog'},
    {tag:'0.7.7',title:'ЗАМИСТЬ: НОВЫЙ АКТИВ',art:'item',item:'Замисть',itemId:'zamist',action:'store'},
    {tag:'0.7.7',title:'ДИСПЁРСЕР: НОВЫЙ ПРЕДМЕТ',art:'item',item:'Диспёрсер',itemId:'disperser',action:'store'},
    {tag:'0.7.5c',title:'СРАКА МО3ГОВ: НОВЫЙ АКТИВ',art:'item',item:'Срака мо3гов',itemId:'brainAss',action:'store'},
    {tag:'0.7.4b',title:'КАРЬЕРА И ИСТОРИЯ МАТЧЕЙ',art:'heart',action:'account'}
  ];
  const cGap=Math.round(10*s), cTop=nY+Math.round(52*s);
  const cH=Math.floor((nH-Math.round(52*s)-Math.round(12*s)-cGap*(news.length-1))/news.length);
  news.forEach((entry,index)=>{
    const card={x:nX+Math.round(12*s),y:cTop+index*(cH+cGap),w:nW-Math.round(24*s),h:cH};
    const hov=hit(card)&&entry.action;
    ctx.save();
    ctx.beginPath(); ctx.rect(card.x,card.y,card.w,card.h); ctx.clip();
    const art=ctx.createLinearGradient(card.x,card.y,card.x+card.w,card.y+card.h);
    const artTone = entry.art === 'map' ? ['#315c36','#0d2825'] : entry.art === 'item' ? ['#42142c','#140d24'] : entry.art === 'bot' ? ['#16383c','#101426'] : entry.art === 'allpick' ? ['#0f3550','#0a1424'] : ['#3a0d12','#120508'];
    art.addColorStop(0,artTone[0]); art.addColorStop(1,artTone[1]);
    ctx.fillStyle=art; ctx.fillRect(card.x,card.y,card.w,card.h);
    const gx=card.x+card.w*0.62, gy=card.y+card.h*0.42;
    ctx.globalAlpha=0.9;
    if(entry.art==='map'){
      ctx.fillStyle='#4c793c'; ctx.fillRect(card.x,card.y,card.w,card.h);
      ctx.strokeStyle='rgba(20,20,17,0.72)'; ctx.lineWidth=card.h*0.2; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(card.x+card.w*.08,card.y+card.h*.9); ctx.lineTo(card.x+card.w*.45,card.y+card.h*.55); ctx.lineTo(card.x+card.w*.92,card.y+card.h*.1); ctx.stroke();
      ctx.strokeStyle='#c4a46a'; ctx.lineWidth=card.h*0.24;
      ctx.beginPath(); ctx.moveTo(card.x+card.w*.04,card.y+card.h*.92); ctx.lineTo(card.x+card.w*.48,card.y+card.h*.48); ctx.lineTo(card.x+card.w*.96,card.y+card.h*.04); ctx.stroke();
      ctx.strokeStyle='#267f99'; ctx.lineWidth=card.h*0.16;
      ctx.beginPath(); ctx.moveTo(card.x+card.w*.04,card.y+card.h*.92); ctx.lineTo(card.x+card.w*.48,card.y+card.h*.48); ctx.lineTo(card.x+card.w*.96,card.y+card.h*.04); ctx.stroke();
      for(let tree=0;tree<8;tree++){
        const tx=card.x+card.w*(.1+(tree*37%78)/100), ty=card.y+card.h*(.15+(tree*23%65)/100);
        ctx.fillStyle=tree%2?'#234c31':'#5e9b4c';
        ctx.beginPath(); ctx.arc(tx,ty,card.h*.055,0,Math.PI*2); ctx.fill();
      }
    } else if(entry.art==='unit' || entry.art==='hero'){
      const heroDef=HERO_DEFS.find(def=>def.name===entry.hero) || HERO_DEFS[0];
      drawHeroTexture(heroDef,card.x+card.w*.42,card.y-2,card.w*.59,card.h-24,performance.now()/1000);
      ctx.globalAlpha=1;
      ctx.fillStyle='rgba(0,0,0,.3)'; ctx.fillRect(card.x+card.w*.42,card.y,card.w*.59,card.h-24);
      ctx.strokeStyle=heroDef.color2; ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(gx,gy,card.h*.37,0,Math.PI*2); ctx.stroke();
    } else if(entry.art==='item'){
      for(let ray=0;ray<12;ray++){
        const angle=ray*Math.PI/6+performance.now()/6000;
        ctx.strokeStyle=ray%2?'rgba(255,192,207,.18)':'rgba(255,224,168,.3)';
        ctx.lineWidth=ray%3===0?2:1;
        ctx.beginPath(); ctx.moveTo(gx+Math.cos(angle)*card.h*.15,gy+Math.sin(angle)*card.h*.15);
        ctx.lineTo(gx+Math.cos(angle)*card.h*.48,gy+Math.sin(angle)*card.h*.48); ctx.stroke();
      }
      const featuredItem=SHOP_ITEMS[entry.itemId] || Object.values(SHOP_ITEMS).find(item=>item.name===entry.item);
      drawItemIcon({id:entry.itemId||'brainAss',color:featuredItem&&featuredItem.color},gx,gy,card.h*.75);
    } else if(entry.art==='allpick'){
      const nowT=performance.now()/1000;
      const picks=[HERO_DEFS[2],HERO_DEFS[18]||HERO_DEFS[0],HERO_DEFS[9]||HERO_DEFS[1]];
      const pw=card.w*0.2, ph=card.h-Math.round(40*s);
      picks.forEach((def,k)=>{ if(def) drawHeroTexture(def,card.x+card.w*0.07+k*(pw+card.w*0.04),card.y+Math.round(24*s),pw,ph,nowT); });
      ctx.globalAlpha=1; ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.shadowColor='#6fd0ff'; ctx.shadowBlur=14;
      ctx.fillStyle='#bfeaff'; ctx.font='bold '+Math.round(card.h*0.26)+'px Georgia, serif';
      ctx.fillText('ALL',card.x+card.w*0.70,card.y+card.h*0.34); ctx.fillText('PICK',card.x+card.w*0.70,card.y+card.h*0.62);
    } else if(entry.art==='bot'){
      const colors=['#a7ff70','#ffd568','#ff638d'];
      for(let mark=0;mark<3;mark++){
        const px=gx+(mark-1)*card.h*.38;
        ctx.fillStyle='rgba(8,12,18,.8)'; ctx.strokeStyle=colors[mark]; ctx.lineWidth=3;
        ctx.beginPath(); ctx.arc(px,gy,card.h*.22,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.fillStyle=colors[mark]; ctx.beginPath(); ctx.arc(px,gy-card.h*.03,card.h*.07,0,Math.PI*2); ctx.fill();
        ctx.fillRect(px-card.h*.12,gy+card.h*.07,card.h*.24,card.h*.1);
      }
    } else {
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.shadowColor='#ff3b2a'; ctx.shadowBlur=18;
      if(entry.art==='3v3'){ ctx.fillStyle='#f0b040'; ctx.font='bold '+Math.round(card.h*0.5)+'px Georgia, serif'; ctx.fillText('3v3',gx,gy); }
      else { ctx.fillStyle=entry.art==='heart'?'#ff6fb0':'#ff9a5c'; ctx.font='bold '+Math.round(card.h*0.55)+'px Segoe UI, Arial'; ctx.fillText(entry.art==='heart'?'♡':'♥',gx,gy); }
    }
    ctx.globalAlpha=1; ctx.shadowBlur=0;
    ctx.fillStyle='rgba(8,3,5,0.82)'; ctx.fillRect(card.x,card.y+card.h-Math.round(30*s),card.w,Math.round(30*s));
    ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillStyle='#f3e4c6'; ctx.font='bold '+Math.round(11.5*s)+'px Segoe UI, Arial';
    ctx.fillText(entry.title,card.x+Math.round(9*s),card.y+card.h-Math.round(15*s));
    ctx.fillStyle='#a8231f'; ctx.fillRect(card.x,card.y,Math.round(72*s),Math.round(20*s));
    ctx.fillStyle='#fff0e0'; ctx.font='bold '+Math.round(10.5*s)+'px Segoe UI, Arial';
    ctx.fillText(entry.tag,card.x+Math.round(9*s),card.y+Math.round(10.5*s));
    ctx.restore();
    ctx.strokeStyle=hov?'#ff8a70':'rgba(150,50,45,0.7)'; ctx.lineWidth=hov?2.5:1.5;
    ctx.strokeRect(card.x,card.y,card.w,card.h);
    if(entry.action){
      menuHomeHits.push({x:card.x,y:card.y,w:card.w,h:card.h,action:entry.action});
      menuButtonHitboxes.push({x:card.x,y:card.y,w:card.w,h:card.h,key:'news'+index});
    }
  });
  ctx.restore();

  /* --- нижняя панель навигации --- */
  drawMenuButton(menuFightersRect(),'⚔  БОЙЦЫ',{active:true,redBlack:true,radius:8,large:true,fontSize:Math.round(16*s)});
  drawMenuButton(menuChangelogRect(),'▣  ЧЕНДЖЛОГ',{redBlack:true,radius:8,large:true,fontSize:Math.round(16*s)});
  drawMenuButton(menuStoreRect(),'▣  МАГАЗИН',{redBlack:true,radius:8,large:true,fontSize:Math.round(16*s)});

  /* --- статус и версия --- */
  ctx.save();
  ctx.textBaseline='middle';
  const badge={x:VW-m-Math.round(130*s),y:VH-Math.round(62*s),w:Math.round(130*s),h:Math.round(36*s)};
  dsMetalPanel(badge.x,badge.y,badge.w,badge.h,'#7a2a2a');
  ctx.textAlign='left'; ctx.fillStyle='#e8c9b0'; ctx.font='bold '+Math.round(14*s)+'px Segoe UI, Arial';
  ctx.fillText('ONLINE',badge.x+Math.round(16*s),badge.y+badge.h/2);
  ctx.fillStyle=Math.sin(performance.now()/400)>0?'#ff4a3a':'#a8231f';
  ctx.beginPath(); ctx.arc(badge.x+badge.w-Math.round(20*s),badge.y+badge.h/2,Math.round(5*s),0,Math.PI*2); ctx.fill();
  ctx.textAlign='right'; ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.font=Math.round(11*s)+'px Consolas, monospace';
  ctx.fillText('v'+GAME_VERSION,VW-m,VH-Math.round(14*s));
  ctx.restore();
}

function drawMenuGenericBackdrop(now){
  const g = ctx.createLinearGradient(0,0,VW,VH);
  g.addColorStop(0, '#07141a');
  g.addColorStop(0.42, '#15121a');
  g.addColorStop(1, '#2a0e13');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,VW,VH);
  drawCosmicBackdrop(now);

  // Медленно движущиеся туманные пятна создают глубину без картинок и загрузок.
  ctx.save();
  for(let i=0;i<7;i++){
    const px = VW*(0.08 + i*0.15) + Math.sin(now*0.16+i*1.7)*70;
    const py = VH*(0.18 + (i%3)*0.32) + Math.cos(now*0.13+i)*40;
    const glow = ctx.createRadialGradient(px,py,0,px,py,Math.min(VW,VH)*0.32);
    glow.addColorStop(0, i%3===0 ? 'rgba(54,177,164,0.12)' : (i%2 ? 'rgba(172,42,30,0.14)' : 'rgba(210,154,63,0.10)'));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(px-Math.min(VW,VH)*0.32,py-Math.min(VW,VH)*0.32,Math.min(VW,VH)*0.64,Math.min(VW,VH)*0.64);
  }
  ctx.restore();

  ctx.save();
  for(let i=0;i<32;i++){
    const phase=(now*0.055+i/32)%1;
    const x=(i*173+phase*VW*0.32)%VW;
    const y=(i*97+Math.sin(now*0.24+i*1.8)*VH*0.08+VH*phase*0.2)%VH;
    const glow=i%4===0?'rgba(112,232,213,0.42)':'rgba(255,177,91,0.4)';
    ctx.globalAlpha=0.25+0.35*Math.sin(phase*Math.PI);
    ctx.fillStyle=glow;
    ctx.beginPath(); ctx.arc(x,y,i%5===0?2:1,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.lineCap='round';
  for(let i=0;i<18;i++){
    const phase=(now*0.075+i/18)%1;
    const x=(i*251+Math.sin(now*0.32+i*1.4)*42+VW*phase*0.18)%VW;
    const y=VH*(1-phase);
    const length=7+(i%4)*3;
    ctx.globalAlpha=0.16+0.35*Math.sin(phase*Math.PI);
    ctx.strokeStyle=i%4===0?'#8be9fd':'#ffb75d';
    ctx.lineWidth=i%5===0?2:1;
    ctx.shadowColor=ctx.strokeStyle;
    ctx.shadowBlur=8;
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-2,y+length); ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.lineWidth=1;
  for(let i=0;i<6;i++){
    const phase=now*0.12+i*0.83;
    const y=VH*(0.16+i*0.13)+Math.sin(phase)*24;
    ctx.globalAlpha=0.045+(i%2)*0.018;
    ctx.strokeStyle=i%3===0?'#8be9fd':(i%2?'#ff8b55':'#e3bd70');
    ctx.shadowColor=ctx.strokeStyle;
    ctx.shadowBlur=14;
    ctx.beginPath();
    ctx.moveTo(-20,y);
    ctx.bezierCurveTo(VW*0.25,y+Math.sin(phase+1)*68,VW*0.68,y-Math.cos(phase)*52,VW+20,y+Math.sin(phase*0.7)*34);
    ctx.stroke();
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
  ctx.globalAlpha=0.10;
  ctx.setLineDash([3,15]);
  ctx.beginPath(); ctx.ellipse(0,0,Math.min(VW,VH)*0.34,Math.min(VW,VH)*0.16,Math.PI/3,0,Math.PI*2); ctx.stroke();
  ctx.setLineDash([]);
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6, r=Math.min(VW,VH)*0.39;
    ctx.fillStyle=i%3===0 ? '#d6a85c' : '#7e2927';
    ctx.fillRect(Math.cos(a)*r-2,Math.sin(a)*r-2,4,4);
  }
  ctx.restore();

  // Дальние цитадели добавляют фону силуэт карты, не мешая центральному меню.
  ctx.save();
  const fortressScale=Math.min(1,Math.max(0.58,Math.min(VW,VH)/760));
  for(const side of [-1,1]){
    ctx.save();
    ctx.translate(VW/2+side*Math.min(VW*0.39,430),VH*0.52);
    ctx.scale(side*fortressScale,fortressScale);
    ctx.globalAlpha=0.18;
    ctx.fillStyle='#080e16'; ctx.strokeStyle='#c29c5a'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(-78,112); ctx.lineTo(-68,-8); ctx.lineTo(-47,-32);
    ctx.lineTo(-31,-8); ctx.lineTo(-24,-70); ctx.lineTo(0,-98); ctx.lineTo(24,-70);
    ctx.lineTo(31,-8); ctx.lineTo(47,-32); ctx.lineTo(68,-8); ctx.lineTo(78,112); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.globalAlpha=0.12; ctx.fillStyle='#d0ad6e';
    ctx.fillRect(-8,-56,16,22); ctx.fillRect(-53,5,12,25); ctx.fillRect(41,5,12,25);
    ctx.globalAlpha=0.24; ctx.strokeStyle='#a74436'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(0,-97); ctx.lineTo(0,-130); ctx.stroke();
    ctx.fillStyle='#a74436'; ctx.beginPath(); ctx.moveTo(1,-129); ctx.lineTo(34,-119); ctx.lineTo(1,-108); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // Затемнение по краям, чтобы заголовок и кнопки читались как игровой интерфейс.
  const vignette = ctx.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*0.2,VW/2,VH/2,Math.max(VW,VH)*0.72);
  vignette.addColorStop(0,'rgba(0,0,0,0)');
  vignette.addColorStop(1,'rgba(0,0,0,0.70)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0,0,VW,VH);

}

function drawMenu(){
  menuButtonHitboxes=[];
  prematchTime=0; resultAnnounced=false; firstBloodDone=false;
  const onlineEntry=onlineEntryElement;
  const showOnlineEntry=menuStage==='home'&&!settingsOpen&&!storeOpen&&!changelogOpen;
  const hideOnlineEntry=!showOnlineEntry;
  if(onlineEntry.hidden!==hideOnlineEntry){
    onlineEntry.hidden=hideOnlineEntry;
    onlineEntry.style.display=hideOnlineEntry?'none':'flex';
  }
  const wantOnlineTop=(menuWide() && menuStage==='home') ? (VH-80)+'px' : '';
  if(onlineEntry.style.top!==wantOnlineTop) onlineEntry.style.top=wantOnlineTop;
  menuHomeHits=[];
  const now = performance.now()/1000;
  if(menuStage!=='home') drawMenuGenericBackdrop(now);

  if(menuStage === 'home'){
    drawDotaSenseBackdrop(now);
    const logoScale=menuScale();
    const logoW=Math.min(Math.round(660*logoScale),VW-24), logoH=Math.round(Math.min(logoW*0.17,112*logoScale));
    drawDotaSenseLogo(VW/2, menuWide()?Math.round(18*logoScale):70, logoW, logoH, now);
  } else {
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Segoe UI, Arial';
    ctx.fillStyle = '#d7b36a';
    ctx.fillText('АРЕНА ТРЁХ СИЛ  •  ONLINE', VW/2, 32);
  }

  const settingsButton = menuSettingsRect();
  if(menuWide() && menuStage==='home') drawMenuButton(settingsButton,'⚙',{active:settingsOpen,large:true,fontSize:24,radius:8}); else drawMenuButton(settingsButton,'⚙  НАСТРОЙКИ',{active:settingsOpen});

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

    const layout = menuSettingsLayout(panel);
    const musicToggle = layout.music;
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

    const touchToggle=layout.touch;
    const touchHover=mouse.x>=touchToggle.x && mouse.x<=touchToggle.x+touchToggle.w &&
                     mouse.y>=touchToggle.y && mouse.y<=touchToggle.y+touchToggle.h;
    ctx.fillStyle=touchControlsEnabled || touchHover ? 'rgba(139,44,35,0.44)' : 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.roundRect(touchToggle.x,touchToggle.y,touchToggle.w,touchToggle.h,7); ctx.fill();
    ctx.strokeStyle=touchControlsEnabled || touchHover ? '#d7b36a' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth=1.5; ctx.stroke();
    ctx.textAlign='left'; ctx.fillStyle='#fff'; ctx.font='bold 14px Segoe UI, Arial';
    ctx.fillText('ДЛЯ ТЕЛЕФОНОВ',touchToggle.x+16,touchToggle.y+21);
    ctx.fillStyle=touchControlsEnabled ? '#e2b866' : 'rgba(255,255,255,0.45)';
    ctx.font='12px Segoe UI, Arial';
    ctx.fillText(touchControlsEnabled ? 'ВКЛЮЧЕНО' : 'ВЫКЛЮЧЕНО',touchToggle.x+16,touchToggle.y+38);
    const touchSwitchX=touchToggle.x+touchToggle.w-48, touchSwitchY=touchToggle.y+13;
    ctx.fillStyle=touchControlsEnabled ? '#c94d35' : '#3d424b';
    ctx.beginPath(); ctx.roundRect(touchSwitchX,touchSwitchY,32,20,10); ctx.fill();
    ctx.fillStyle='#f9e6bd';
    ctx.beginPath(); ctx.arc(touchSwitchX+(touchControlsEnabled?22:10),touchSwitchY+10,7,0,Math.PI*2); ctx.fill();

    ctx.textAlign='left'; ctx.fillStyle='#fff1d0'; ctx.font='bold 15px Segoe UI, Arial';
    ctx.fillText('БИНДЫ ПРЕДМЕТОВ',panel.x+36,layout.bindTitleY);
    ctx.fillStyle='rgba(255,255,255,0.52)'; ctx.font='12px Segoe UI, Arial';
    ctx.fillText('Нажмите слот, затем нужную клавишу.',panel.x+36,layout.bindHintY);
    for(let index=0;index<6;index++){
      const row=layout.rows[index];
      const active=rebindSlot===index;
      ctx.fillStyle=active?'rgba(215,179,106,0.35)':'rgba(255,255,255,0.06)'; ctx.fillRect(row.x,row.y,row.w,row.h);
      ctx.strokeStyle=active?'#ffd568':'rgba(255,255,255,0.25)'; ctx.lineWidth=active?2:1; ctx.strokeRect(row.x,row.y,row.w,row.h);
      ctx.textAlign='left'; ctx.fillStyle='#fff'; ctx.font='bold 12px Segoe UI, Arial'; ctx.fillText('СЛОТ '+(index+1),row.x+10,row.y+18);
      ctx.fillStyle=active?'#ffd568':'#8be9fd'; ctx.font='bold 18px Consolas, monospace'; ctx.textAlign='right'; ctx.fillText(active?'...':inventoryBinds[index].toUpperCase(),row.x+row.w-10,row.y+29);
    }
    drawMenuButton(layout.close,'ГОТОВО',{});
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
    ctx.fillText('ВЕРСИЯ ' + GAME_VERSION,panel.x+30,panel.y+57);
    const close={x:panel.x+panel.w-142,y:panel.y+18,w:116,h:34};
    drawMenuButton(close,'X  ЗАКРЫТЬ',{active:true});
    const viewport={x:panel.x+24,y:panel.y+78,w:panel.w-48,h:panel.h-142};
    ctx.save(); ctx.beginPath(); ctx.rect(viewport.x,viewport.y,viewport.w,viewport.h); ctx.clip();
    ctx.font='14px Segoe UI, Arial';
    let rowOffset=0;
    let entryIndex=0;
    for(const row of changelogRows()){
      const heading=row.type==='heading';
      const rowHeight=heading?36:62;
      const rowY=viewport.y+rowOffset-changelogScroll;
      if(rowY+rowHeight>=viewport.y && rowY<=viewport.y+viewport.h){
        if(heading){
          ctx.fillStyle='rgba(185,48,36,0.15)';
          ctx.fillRect(viewport.x,rowY,viewport.w-12,30);
          ctx.fillStyle='#ffd568'; ctx.font='bold 12px Consolas, monospace';
          ctx.fillText(row.text,viewport.x+10,rowY+20);
        } else {
          ctx.fillStyle=entryIndex%2 ? 'rgba(255,255,255,0.025)' : 'rgba(37,105,160,0.12)';
          ctx.beginPath(); ctx.roundRect(viewport.x,rowY+2,viewport.w-12,56,4); ctx.fill();
          ctx.fillStyle='#c8543d'; ctx.beginPath(); ctx.arc(viewport.x+16,rowY+20,3,0,Math.PI*2); ctx.fill();
          ctx.fillStyle='rgba(235,246,255,0.9)';
          wrapMenuText(row.text,viewport.w-54,'14px Segoe UI, Arial').slice(0,2).forEach((line,lineIndex)=>ctx.fillText(line,viewport.x+30,rowY+20+lineIndex*17));
          entryIndex++;
        }
      }
      rowOffset+=rowHeight;
    }
    ctx.restore();
    const contentHeight=changelogContentHeight(), viewportHeight=viewport.h;
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
    if(menuWide()){ drawDotaSenseHome(); return; }
    const play = menuPlayRect();
    drawMenuUpdatePreview(play);
    ctx.textAlign='center'; ctx.font=VW<820||VH<820?'11px Segoe UI, Arial':'13px Segoe UI, Arial';
    ctx.fillStyle='rgba(255,255,255,0.62)';
    ctx.fillText('Сражение героев, предметов и древних сил',VW/2,play.y-10);
    drawMenuButton(play,'ИГРАТЬ',{primary:true,large:true,radius:10});
    const fightersButton = menuFightersRect();
    drawMenuButton(fightersButton,'⚔  БОЙЦЫ',{active:true,redBlack:true,radius:8});
    const changelog = menuChangelogRect();
    drawMenuButton(changelog,'▣  CHANGELOG',{redBlack:true,radius:8});
    const storeButton=menuStoreRect();
    drawMenuButton(storeButton,'▣  МАГАЗИН',{redBlack:true,radius:8});
    ctx.font = '14px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    if(VW>=820 && VH>=820) ctx.fillText('Нажми «БОЙЦЫ», чтобы открыть профиль и способности героя', VW/2, changelog.y+72);
    return;
  }

  if(menuStage === 'mode'){
    drawModeSelect();
    return;
  }

  if(menuStage === 'heroDetail'){
    drawHeroDetail(HERO_DEFS[selectedHeroIndex] || HERO_DEFS[0]);
    return;
  }

  if(menuStage === 'draft'){
    const now=performance.now()/1000, remaining=Math.ceil(draftTime);
    ctx.textAlign='center'; ctx.fillStyle='#f6e6be'; ctx.font='bold 27px Georgia, serif';
    ctx.fillText('ВЫБОР БОЙЦОВ  •  4 НА 4',VW/2,72);
    ctx.fillStyle=remaining<=10?'#ff7568':'#d7b36a'; ctx.font='bold 30px Consolas, monospace'; ctx.fillText(remaining+' СЕК',VW/2,108);
    ctx.font='13px Segoe UI, Arial'; ctx.fillStyle='rgba(255,255,255,.68)'; ctx.fillText(draftPlayerIndex<0?'Выберите бойца для своей команды':'Боец выбран. Нажми «ПРОПУСТИТЬ» или Enter, чтобы начать сразу.',VW/2,132);
    const slots=[{label:'ВЫ',index:draftPlayerIndex,team:'#72e6a5'},...draftBotIndices.map((index,i)=>({label:'БОТ '+(i+1),index,team:i<3?'#72e6a5':'#ff8585'}))];
    const slotWidth=(VW-36)/slots.length;
    slots.forEach((slot,index)=>{ const x=18+index*slotWidth, w=slotWidth-3; ctx.fillStyle='rgba(5,9,16,.82)'; ctx.fillRect(x,138,w,106); ctx.strokeStyle=slot.team; ctx.lineWidth=2; ctx.strokeRect(x,138,w,106); ctx.fillStyle=slot.team; ctx.font='bold 11px Segoe UI, Arial'; ctx.fillText(slot.label,x+w/2,156); if(slot.index>=0) drawHeroTexture(HERO_DEFS[slot.index],x+4,164,w-8,68,now); else { ctx.fillStyle='rgba(255,255,255,.45)'; ctx.font='12px Segoe UI, Arial'; ctx.fillText('ОЖИДАНИЕ',x+w/2,202); } });
    drawDraftSkillPanel(now);
    const back={x:24,y:78,w:120,h:38}; drawMenuButton(back,'‹  НАЗАД',{radius:7});
    const skipRect=draftSkipRect(), canSkip=draftPlayerIndex>=0;
    drawMenuButton(skipRect,canSkip?'⏭  ПРОПУСТИТЬ':'ПРОПУСК: ВЫБЕРИ БОЙЦА',{radius:7,primary:canSkip,active:canSkip,fontSize:canSkip?15:12});
    if(!canSkip){ ctx.save(); ctx.fillStyle='rgba(0,0,0,.5)'; ctx.beginPath(); ctx.roundRect(skipRect.x,skipRect.y,skipRect.w,skipRect.h,7); ctx.fill(); ctx.restore(); }
    for(let i=0;i<HERO_DEFS.length;i++){ const r=menuCardRect(i), selected=i===draftPlayerIndex; drawHeroTexture(HERO_DEFS[i],r.x,r.y,r.w,r.h,now); if(selected){ ctx.strokeStyle='#ffd568'; ctx.lineWidth=4; ctx.strokeRect(r.x-2,r.y-2,r.w+4,r.h+4); } if(draftPlayerBlocked(i)&&!selected){ ctx.fillStyle='rgba(0,0,0,.62)'; ctx.fillRect(r.x,r.y,r.w,r.h); } ctx.fillStyle='rgba(4,7,12,.76)'; ctx.fillRect(r.x,r.y+r.h-24,r.w,24); ctx.fillStyle='#fff'; ctx.font='bold 12px Segoe UI, Arial'; ctx.fillText(HERO_DEFS[i].name,r.x+r.w/2,r.y+r.h-8); }
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

/* =========================================================
   Вступительная заставка матча (5 секунд, в стиле Dota)
   ========================================================= */
const MATCH_INTRO_SECONDS = 5;
let matchIntroStart = -1, matchIntroFlags = {};
function startMatchIntro(){ matchIntroStart = performance.now(); matchIntroFlags = {}; }

function drawMatchIntro(){
  if(matchIntroStart < 0) return;
  const t = (performance.now() - matchIntroStart) / 1000;
  if(t >= MATCH_INTRO_SECONDS || gameState !== 'playing'){ matchIntroStart = -1; return; }
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const easeOut = v => 1 - Math.pow(1 - clamp01(v), 3);
  const easeInOut = v => { v = clamp01(v); return v < 0.5 ? 4*v*v*v : 1 - Math.pow(-2*v + 2, 3) / 2; };
  const now = performance.now() / 1000;
  const fade = 1 - clamp01((t - 4.1) / 0.9);
  const veil = t < 3.2 ? 0.96 : 0.96 * (1 - easeInOut((t - 3.2) / 1.8));
  if(!matchIntroFlags.start && t > 0.05){ matchIntroFlags.start = true; playSynthSfx('ultimate'); }
  if(!matchIntroFlags.slam && t >= 1.0){ matchIntroFlags.slam = true; playSynthSfx('stun'); }
  if(!matchIntroFlags.teams && t >= 2.3){ matchIntroFlags.teams = true; playSynthSfx('level'); }

  const cx = VW / 2, cy = VH * 0.46;
  ctx.save();
  ctx.setTransform(1,0,0,1,0,0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(10,2,5,' + veil.toFixed(3) + ')';
  ctx.fillRect(0, 0, VW, VH);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(VW, VH) * 0.6);
  glow.addColorStop(0, 'rgba(130,18,20,' + (0.55 * veil / 0.96).toFixed(3) + ')');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, VW, VH);

  /* рунная печать */
  const sigilR = Math.min(VW, VH) * 0.34 * (0.75 + 0.25 * easeOut(t / 1.4));
  const sigilAlpha = fade * easeOut((t - 0.1) / 0.8);
  if(sigilAlpha > 0.01){ ctx.globalAlpha = sigilAlpha; dsDrawSigil(cx, cy, sigilR, now, 1); ctx.globalAlpha = 1; }

  /* ударные волны и вспышка в момент появления логотипа */
  for(let k = 0; k < 2; k++){
    const u = (t - 1.0 - k * 0.18) / 0.9;
    if(u > 0 && u < 1){
      ctx.strokeStyle = 'rgba(255,120,90,' + ((1 - u) * 0.8 * fade).toFixed(3) + ')';
      ctx.lineWidth = 6 * (1 - u) + 1;
      ctx.beginPath(); ctx.arc(cx, cy, easeOut(u) * Math.max(VW, VH) * 0.7, 0, Math.PI * 2); ctx.stroke();
    }
  }
  const flash = (t - 1.0) / 0.3;
  if(flash > 0 && flash < 1){ ctx.fillStyle = 'rgba(255,200,170,' + (0.35 * (1 - flash)).toFixed(3) + ')'; ctx.fillRect(0, 0, VW, VH); }

  /* логотип DOTA SENSE 3 */
  const logoW = Math.min(Math.round(VW * 0.62), 780), logoH = Math.round(logoW * 0.17);
  if(t >= 1.0){
    const slam = easeOut((t - 1.0) / 0.35);
    const shake = t < 1.5 ? (1 - (t - 1.0) / 0.5) * 6 : 0;
    ctx.save();
    ctx.globalAlpha = clamp01((t - 1.0) / 0.25) * fade;
    ctx.translate(Math.sin(t * 90) * shake, Math.cos(t * 77) * shake);
    ctx.translate(cx, cy); ctx.scale(1 + 0.55 * (1 - slam), 1 + 0.55 * (1 - slam)); ctx.translate(-cx, -cy);
    drawDotaSenseLogo(cx, cy - logoH / 2, logoW, logoH, now, true);
    ctx.restore();
  }

  /* подзаголовок */
  if(t >= 1.9){
    const a = clamp01((t - 1.9) / 0.5) * fade;
    ctx.save();
    ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if('letterSpacing' in ctx) ctx.letterSpacing = '8px';
    ctx.font = 'bold ' + Math.round(Math.max(13, Math.min(20, VW / 70))) + 'px Georgia, serif';
    ctx.fillStyle = '#e8c984';
    const subY = cy + logoH / 2 + 34;
    ctx.fillText('АРЕНА ТРЁХ СИЛ', cx, subY);
    const lineW = 160 * easeOut((t - 1.9) / 0.6);
    ctx.fillStyle = 'rgba(230,90,70,0.7)';
    ctx.fillRect(cx - 190 - lineW, subY - 1, lineW, 2); ctx.fillRect(cx + 190, subY - 1, lineW, 2);
    ctx.restore();
  }

  /* команды: портреты героев выезжают с двух сторон */
  if(t >= 2.2 && playerHero){
    const list = heroes.filter(h => h && h.def && h.type === 'hero' && !h.isIllusion);
    const myTeam = playerHero.team;
    const mine = list.filter(h => h.team === myTeam).sort((a, b) => (b === playerHero) - (a === playerHero)).slice(0, 4);
    const foes = list.filter(h => h.team !== myTeam).slice(0, 4);
    const bw = Math.round(Math.min(118, VW / 10)), bh = Math.round(bw * 0.78), gap = 10, rowY = Math.round(VH * 0.64);
    const place = (arr, side) => arr.forEach((h, i) => {
      const p = easeOut((t - 2.3 - i * 0.12) / 0.6);
      if(p <= 0) return;
      const total = arr.length * (bw + gap) - gap;
      const x = (side < 0 ? cx - 70 - total : cx + 70) + i * (bw + gap) + side * (1 - p) * VW * 0.35;
      const isMe = h === playerHero;
      ctx.save();
      ctx.globalAlpha = p * fade;
      ctx.fillStyle = 'rgba(8,3,5,0.88)'; ctx.fillRect(x - 3, rowY - 3, bw + 6, bh + 30);
      drawHeroTexture(h.def, x, rowY, bw, bh, now);
      ctx.strokeStyle = isMe ? '#ffd568' : (side < 0 ? '#72e6a5' : '#ff8585'); ctx.lineWidth = isMe ? 3 : 2;
      ctx.strokeRect(x - 3, rowY - 3, bw + 6, bh + 30);
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Segoe UI, Arial'; ctx.textAlign = 'center';
      ctx.fillText(isMe ? 'ТЫ • ' + h.def.name : h.def.name, x + bw / 2, rowY + bh + 17);
      ctx.restore();
    });
    place(mine, -1); place(foes, 1);
    const labelA = clamp01((t - 2.3) / 0.5) * fade;
    ctx.save();
    ctx.globalAlpha = labelA; ctx.textAlign = 'center'; ctx.font = 'bold 15px Georgia, serif';
    if('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.fillStyle = '#72e6a5'; ctx.fillText(myTeam === 0 ? 'СВЕТ' : 'ТЬМА', cx - 70 - (mine.length * (bw + gap) - gap) / 2, rowY - 14);
    ctx.fillStyle = '#ff8585'; ctx.fillText(myTeam === 0 ? 'ТЬМА' : 'СВЕТ', cx + 70 + (foes.length * (bw + gap) - gap) / 2, rowY - 14);
    ctx.restore();
    const vp = easeOut((t - 2.6) / 0.4);
    if(vp > 0){
      ctx.save();
      ctx.globalAlpha = vp * fade; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '900 ' + Math.round(bh * 0.62) + 'px Georgia, serif';
      ctx.lineWidth = 6; ctx.strokeStyle = '#2a0808'; ctx.strokeText('VS', cx, rowY + bh / 2 + 8);
      const vg = ctx.createLinearGradient(0, rowY, 0, rowY + bh);
      vg.addColorStop(0, '#fff1b8'); vg.addColorStop(1, '#c4761c');
      ctx.fillStyle = vg; ctx.shadowColor = 'rgba(255,120,50,0.8)'; ctx.shadowBlur = 18;
      ctx.fillText('VS', cx, rowY + bh / 2 + 8);
      ctx.restore();
    }
  }

  /* девиз */
  if(t >= 3.0){
    ctx.save();
    ctx.globalAlpha = clamp01((t - 3.0) / 0.5) * fade; ctx.textAlign = 'center';
    if('letterSpacing' in ctx) ctx.letterSpacing = '3px';
    ctx.font = 'bold 14px Segoe UI, Arial'; ctx.fillStyle = 'rgba(255,240,199,0.8)';
    ctx.fillText('ЗАЩИТИ СВОЙ ДРЕВНИЙ  •  УНИЧТОЖЬ ВРАЖЕСКИЙ', cx, VH * 0.9);
    ctx.restore();
  }

  /* кинематографичные чёрные полосы */
  const bar = easeOut(t / 0.5) * (1 - easeInOut((t - 4.3) / 0.7));
  const barH = VH * 0.11 * bar;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VW, barH); ctx.fillRect(0, VH - barH, VW, barH);
  ctx.fillStyle = 'rgba(230,90,70,0.75)'; ctx.fillRect(0, barH - 1, VW, 1.5); ctx.fillRect(0, VH - barH - 0.5, VW, 1.5);
  ctx.restore();
}

function drawOver(){
  const myTeam = playerHero ? playerHero.team : 0;
  const won = winner === myTeam;
  if(!resultAnnounced){
    resultAnnounced = true;
    announce(winner === myTeam ? 'Victory!' : 'Defeat!', {interrupt:true, rate:0.8});
    if(!testMode) accountRecordResult(won, makeMatchId(), rankedOnlineMatch, currentMatchCareerStats());
    rankedOnlineMatch=false;
  }
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
  ctx.font='bold 14px Segoe UI, Arial'; ctx.fillStyle='#e8c984';
  ctx.fillText(account.profile ? '✦ '+account.profile.nick+'  •  Уровень '+account.profile.level+(won && account.lastGain>0 ? '  (+'+account.lastGain+' за победу)' : '') : 'Войди в аккаунт в главном меню, чтобы копить уровень',VW/2,panel.y+192);

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
let domMatchState = false;
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
    if(!avatarCacheBuilt){ buildAvatarCache(); ctx.clearRect(0,0,VW,VH); }

    if(gameState === 'menu'){
      if(domMatchState){ document.body.classList.remove('in-match'); domMatchState=false; }
      startMenuMusic();
      updateDraft(dt);
      updateMenuHover();
      drawMenu();
    } else {
      if(!domMatchState){ document.body.classList.add('in-match'); domMatchState=true; }
      stopMenuMusic();
      update(dt);
      if(!Number.isFinite(cam.x) || !Number.isFinite(cam.y)){
        cam.x = playerHero && Number.isFinite(playerHero.x) ? playerHero.x : WORLD/2;
        cam.y = playerHero && Number.isFinite(playerHero.y) ? playerHero.y : WORLD/2;
        cameraManual = false;
      }
      ctx.save();
      ctx.translate(-cam.x + VW/2, -cam.y + VH/2);
      terrainFrameIndex++;
      const redrawTerrain = !terrainFrameValid || terrainFrameIndex % 2 === 0;
      if(redrawTerrain){
        drawTerrain();
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        terrainFrameCtx.clearRect(0,0,VW,VH);
        terrainFrameCtx.drawImage(canvas,0,0);
        ctx.restore();
        terrainFrameValid = true;
      } else {
        ctx.save();
        ctx.setTransform(1,0,0,1,0,0);
        ctx.drawImage(terrainFrameCanvas,0,0);
        ctx.restore();
      }
      drawItemRangePreview();
      drawWorldObjects();
      drawBaseOverlay();
      ctx.restore();
      drawFog();
      drawMinimap();
      drawHUD();
      drawTouchControls();
      if(testMode) drawTestPanel();
      drawKillStreakBanner();
      drawPrematchOverlay();
      drawScoreboard();
      drawMatchIntro();
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
  terrainFrameCanvas.width = VW;
  terrainFrameCanvas.height = VH;
  terrainFrameValid = false;
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
  let lastSnapshotSignature = '';
  let authoritativeMode = false;
  let onlineHostId = null;
  const botVersions = new Map();
  let botSnapTick = 0;
  const remoteHeroes = new Map();
  const remoteBulletIds = new Set();

  function syncTowerState(sTower){
    if(!sTower || !Number.isFinite(sTower.hp) && !Number.isFinite(sTower.maxHp) && !sTower.id) return;
    const tower = units.find(u =>
      (u.type === 'tower' || u.type === 'ancient') && String(u.id) === String(sTower.id)
    );
    if(!tower) return;
    const nextHp = Number.isFinite(sTower.hp) ? Math.max(0,sTower.hp) : tower.hp;
    const nextAlive = sTower.alive !== false && nextHp > 0;
    if(!tower.dead && nextAlive && nextHp < tower.hp - 0.5) noteStructureAttack(tower, null, tower.team !== (playerHero ? playerHero.team : 0));
    if(!tower.dead && !nextAlive) killUnit(tower,null);
    tower.hp = nextAlive ? nextHp : 0;
    tower.maxHp = Number.isFinite(sTower.maxHp) ? sTower.maxHp : tower.maxHp;
    tower.alive = nextAlive;
    tower.dead = !nextAlive;
  }

  function attachAuthoritativeSocket(){
    const candidate = window.__shadowOnlineSocket;
    if(!candidate || candidate === socket) return;
    socket = candidate;
    socket.on('match:begin', beginAuthoritativeMatch);
    socket.on('gameState', state => {
      serverGameState = state;
      syncRosterFromState(state);
      if(Array.isArray(state?.towers)){
        for(const towerData of state.towers){
          syncTowerState(towerData);
        }
      }
    });
    socket.on('room:host', data => {
      if(!data) return;
      onlineHostId = data.hostId || null;
      bindRosterHeroes();
    });
    socket.on('tower:update', data => {
      if(!data || !data.id) return;
      syncTowerState(data);
    });
    socket.on('tower:shot', event => {
      if(!event || !event.id) return;
      fxRing(event.x, event.y, 18, event.team === 0 ? '#8be9fd' : '#ff8a3d', 0.18);
    });
    socket.on('game_over', data => {
      if(!data || !Number.isInteger(data.winner)) return;
      /* Сервер присылает победителя в глобальных командах (0 — Свет, 1 — Тьма), а на клиенте
         своя команда всегда локальная 0 (карта для Тьмы зеркалится). Переводим в локальные,
         иначе победа Тьмы засчитывалась как поражение. */
      const localMember = onlineRoster && onlineRoster.find(member => member.id === onlineId);
      winner = localMember ? (data.winner === localMember.team ? 0 : 1) : data.winner;
      gameState = 'over';
    });
    socket.on('playerSnapshot', applyRemotePlayerSnapshot);
    socket.on('playerVitals', applyLocalVitals);
    socket.on('playerSkill', applyRemoteSkill);
    socket.on('match:player-left', data => {
      addText(playerHero ? playerHero.x : WORLD/2, playerHero ? playerHero.y : WORLD/2, data.message, '#ffd568', 2, 16);
    });
    if(window.__shadowOnlineMatch) beginAuthoritativeMatch(window.__shadowOnlineMatch);
  }

  function beginAuthoritativeMatch(payload){
    if(onlineId) return;
    if(!payload || !Array.isArray(payload.roster) || payload.roster.length < 2 || payload.roster.length > 8){
      showMatchStartError('Для матча нужны от 2 до 8 игроков.');
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
    if(!own.length || !enemy.length || own.length > 4 || enemy.length > 4 || Math.abs(own.length-enemy.length)>1){
      showMatchStartError('Нужно от 1 до 4 игроков в каждой команде.');
      return;
    }
    const heroIdOf = member => member.hero || member.heroId;
    const heroIndex = HERO_DEFS.findIndex(hero => hero.id === heroIdOf(local));
    const heroIndexOf = member => HERO_DEFS.findIndex(hero => hero.id === heroIdOf(member));
    const ownOthers = own.filter(member => member.id !== local.id);
    const fallback = heroIndex;
    /* startGame требует 7 выборов: [враг1, союзник1, союзник2, враг2, враг3, союзник-мид, враг-мид].
       Раньше передавалось 5, из-за чего startGame игнорировал их и ставил СЛУЧАЙНЫХ бойцов. */
    const picks = [enemy[0] ? heroIndexOf(enemy[0]) : fallback,
      ownOthers[0] ? heroIndexOf(ownOthers[0]) : fallback,
      ownOthers[1] ? heroIndexOf(ownOthers[1]) : fallback,
      enemy[1] ? heroIndexOf(enemy[1]) : fallback,
      enemy[2] ? heroIndexOf(enemy[2]) : fallback,
      ownOthers[2] ? heroIndexOf(ownOthers[2]) : fallback,
      enemy[3] ? heroIndexOf(enemy[3]) : fallback];
    if(heroIndex < 0 || picks.some(index => index < 0)){
      showMatchStartError('Сервер прислал неизвестного героя.');
      return;
    }
    try {
      onlineId = payload.id;
      onlineRoster = payload.roster;
      onlineHostId = payload.hostId || null;
      gameMode = (payload.settings && GAME_MODES[payload.settings.ruleset]) ? payload.settings.ruleset : 'turbo';
      rankedOnlineMatch = !!(payload.settings && payload.settings.ranked);
      rosterSignature = onlineRoster.map(member => `${member.id}:${member.slot}:${member.team}:${heroIdOf(member)}`).join('|');
      originalStartGame(heroIndex, picks);
      orientOnlineMapForTeam(local.team);
      authoritativeMode = true;
      bindRosterHeroes();
      serverGameState = payload.state || null;
      const localState = serverGameState && serverGameState.players.find(player => player.id === onlineId);
      if(localState && playerHero){
        playerHero.x = localState.x;
        playerHero.y = localState.y;
        playerHero.moveTarget = null;
        localState.hp = playerHero.hp;
        localState.maxHp = playerHero.maxHp;
        localState.gold = playerHero.coins;
        serverDamageVersion = Number.isInteger(localState.damageVersion) ? localState.damageVersion : 0;
      }
      // Hard-snap every teammate/enemy hero straight to their true server spot right
      // away too, not just our own hero - otherwise a remote hero can sit at its
      // offline placeholder position (wrong base) until a later event (e.g. its
      // owner's first death/respawn) happens to force a resync.
      if(serverGameState && Array.isArray(serverGameState.players)){
        for(const remote of serverGameState.players){
          if(remote.id === onlineId) continue;
          const remoteHero = remoteHeroes.get(remote.id);
          if(remoteHero && Number.isFinite(remote.x) && Number.isFinite(remote.y)){
            remoteHero.x = remote.x;
            remoteHero.y = remote.y;
            remoteHero.moveTarget = null;
          }
        }
      }
      applyAuthoritativeState();
      sendPlayerStats();
      sendPlayerSnapshot(true);
      document.getElementById('mode-picker')?.setAttribute('hidden','');
    } catch(error) {
      onlineId = null;
      onlineRoster = null;
      authoritativeMode = false;
      rankedOnlineMatch = false;
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
      /* heroes[3] — мид-союзник (в онлайне не используется); враги идут с индекса 4 */
      {member:enemy[0],hero:heroes[4]},
      {member:enemy[1],hero:heroes[5]},
      {member:enemy[2],hero:heroes[6]},
      {member:ownOthers[2],hero:heroes[3]},
      {member:enemy[3],hero:heroes[7]}
    ].map(slot => slot.member ? {member:slot.member,hero:remoteHeroes.get(slot.member.id) || slot.hero} : slot)
     .filter(slot => slot.member && slot.hero);
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
      hero.isHostedBot = !!member.bot && onlineHostId === onlineId;
      hero.isOnlineBot = hero.isHostedBot;
      if(hero.isOnlineRemote && !hero.isHostedBot){
        // Their real position/HP/mana already arrive over the network, so this
        // hero must never decide where to walk or whom to fight among players -
        // that used to fight the network sync every frame and is what caused the
        // teleporting/jitter. But turning combat off completely meant teammates
        // and enemies simulated on your own screen never fought back against lane
        // creeps at all, so from your point of view creeps near them simply never
        // died. This narrow stand-in only ever lets them swing at a lane creep
        // that has already wandered into their (network-accurate) attack range -
        // it never moves them and never targets another hero, so it can't bring
        // back the rubber-banding.
        hero.updateAI = function(){
          const current = this.attackTarget;
          if(current && (current.dead || current.team === this.team || current.type !== 'creep' ||
             this.distTo(current) > this.getAttackRange() + current.radius + 20)){
            this.attackTarget = null;
          }
          if(!this.attackTarget){
            for(const u of units){
              if(u === this || u.dead || u.type !== 'creep' || u.team === this.team) continue;
              if(this.distTo(u) <= this.getAttackRange() + u.radius){ this.attackTarget = u; break; }
            }
          }
        };
        delete hero.updateCombat;
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
      id:player.id, slot:player.slot, team:player.team, bot:!!player.bot,
      hero:player.heroId, heroId:player.heroId
    }));
    if(!nextRoster.some(member => member.id === onlineId)) return;
    const signature = nextRoster.map(member => `${member.id}:${member.slot}:${member.team}:${member.heroId}`).join('|');
    if(signature === rosterSignature) return;
    rosterSignature = signature;
    onlineRoster = nextRoster;
    bindRosterHeroes();
  }

  function applyAuthoritativeState(frameDt=1/60){
    if(!authoritativeMode || !serverGameState || !Array.isArray(serverGameState.players)) return;
    const dt=Math.min(0.1,Math.max(0,Number(frameDt)||0));
    const blend=1-Math.exp(-18*dt);
    for(const remote of serverGameState.players){
      const hero = remoteHeroes.get(remote.id);
      if(!hero) continue;
      if(hero.isHostedBot) continue;
      if(remote.id !== onlineId){
        const error=Math.hypot(remote.x-hero.x,remote.y-hero.y);
        if(error>260){ hero.x=remote.x; hero.y=remote.y; }
        else { hero.x+=(remote.x-hero.x)*blend; hero.y+=(remote.y-hero.y)*blend; }
      }
      hero.facing = remote.angle;
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

  function skillEffectState(hero){
    // IMPORTANT: never include x/y/mp/maxMp here. This state is built from OUR
    // OWN (possibly stale/laggy) local replica of another player's hero, and
    // used to get broadcast as if it were ground truth about that hero. That
    // caused two very visible bugs: your own hero teleporting/rubber-banding
    // whenever anyone nearby cast a skill (their stale copy of your position
    // was pushed back onto your real hero), and your mana randomly rewinding
    // or refilling (same thing, but with mp). Position and mana always come
    // from a hero's own client; only genuine CC/buff state travels this way.
    return {
      stunTimer:hero.stunTimer,silenceTimer:hero.silenceTimer,
      slow:hero.slow,slowT:hero.slowT,attackSlow:hero.attackSlow,attackSlowT:hero.attackSlowT,
      liftTimer:hero.liftTimer,knockbackX:hero.knockbackX,knockbackY:hero.knockbackY,knockbackTimer:hero.knockbackTimer,
      buffs:(hero.buffs||[]).slice(0,24).map(buff=>({
        type:buff.type,val:buff.val,t:buff.t,multiplier:buff.multiplier,damage:buff.damage
      }))
    };
  }

  function sendSkillCast(hero,slot,skillId,tx,ty){
    if(!socket || !socket.connected || !authoritativeMode) return;
    const effects=[];
    for(const [targetId,target] of remoteHeroes){
      // Include allies too (heals/buffs), not just enemies (damage/CC) - otherwise
      // support skills never get an authoritative correction on the ally's own screen.
      if(targetId===onlineId) continue;
      effects.push({targetId,state:skillEffectState(target)});
    }
    sendPlayerSnapshot(true);
    socket.emit('playerSkill',{
      heroId:hero.def.id,skillId,slot,level:hero.skills[slot]?.level||1,
      x:hero.x,y:hero.y,angle:hero.facing,tx,ty,effects
    });
  }

  function applyRemoteSkill(event){
    if(!authoritativeMode || !event || event.id===onlineId) return;
    const caster=remoteHeroes.get(event.id);
    if(caster){
      caster.x=event.x; caster.y=event.y; caster.facing=event.angle;
      const skill=caster.skills.find(item=>item.id===event.skillId);
      if(skill){
        if(Number.isFinite(event.level)) skill.level=event.level;
        caster.castingSkillLevel=skill.level;
        caster.scepterSkillBoost=hasScepter(caster)&&(event.slot===0||event.slot===1||skill.def.ult);
        caster.isOnlineReplicatedCast=true;
        try { skill.def.cast(caster,event.tx,event.ty,skill.level); }
        catch(error){ console.warn('Не удалось воспроизвести онлайн-способность:',error); }
        finally { caster.castingSkillLevel=0; caster.scepterSkillBoost=false; caster.isOnlineReplicatedCast=false; }
        castSkillVisual(caster,skill,event.tx,event.ty);
      }
    }
    for(const effect of event.effects||[]){
      const target=remoteHeroes.get(effect.targetId);
      const state=effect.state;
      if(!target || target.onlinePlayerId!==onlineId || !state) continue;
      // No x/y/mp/maxMp here on purpose - see skillEffectState().
      for(const key of ['stunTimer','silenceTimer','slow','slowT','attackSlow','attackSlowT','liftTimer','knockbackX','knockbackY','knockbackTimer']){
        if(Number.isFinite(state[key])) target[key]=state[key];
      }
      if(Array.isArray(state.buffs)) target.buffs=state.buffs.map(buff=>({...buff}));
    }
  }

  function moveOnlineHeroToAttackRange(target){
    if(!authoritativeMode || !playerHero || !target || target.dead) return;
    sendInput({type:'attackTarget',targetId:target.onlinePlayerId||null,targetX:target.x,targetY:target.y,
      speed:playerHero.getSpeed(),attackRange:playerHero.getAttackRange()});
  }
  function clearOnlineAttackTarget(){
    if(authoritativeMode) sendInput({type:'clearTarget'});
  }
  window.__shadowOnlineSkillCast=sendSkillCast;
  window.__shadowOnlineAttackTarget=moveOnlineHeroToAttackRange;
  window.__shadowOnlineClearTarget=clearOnlineAttackTarget;

  const originalStartGame = startGame;
  const originalUpdate = update;
  update = function(){
    originalUpdate.apply(this, arguments);
    if(authoritativeMode) applyAuthoritativeState(arguments[0]);
  };

  function sendInput(action){
    if(!socket || !socket.connected) return;
    socket.emit('playerInput', action);
  }
  function sendPlayerSnapshot(force=false,teleport=false){
    if(!socket || !socket.connected || !authoritativeMode || !playerHero) return;
    const effects=[];
    for(const [targetId,target] of remoteHeroes){
      // Include allies too, so ongoing ally-targeted effects (heals, shields, auras)
      // keep correcting on the ally's own screen, not just enemy debuffs.
      if(targetId===onlineId) continue;
      effects.push({targetId,state:skillEffectState(target)});
    }
    const snapshot={
      heroId:playerHero.def.id,level:playerHero.level,xp:playerHero.xp,
      x:playerHero.x,y:playerHero.y,teleport,
      hp:playerHero.hp,maxHp:playerHero.maxHp,mp:playerHero.mp,maxMp:playerHero.maxMp,
      inventory:playerHero.inventory.map(item=>item&&({id:item.id,cooldown:item.cooldown||0,activeTimer:item.activeTimer||0})),
      skills:playerHero.skills.map(skill=>({id:skill.id,level:skill.level,cd:skill.cd||0})),
      buffs:playerHero.buffs.slice(0,24).map(buff=>({type:buff.type,val:buff.val,t:buff.t,multiplier:buff.multiplier,damage:buff.damage})),
      bkbActive:playerHero.bkbActive||0,timurPillow:playerHero.timurPillow||0,effects
    };
    const quantize=value=>Math.round((Number(value)||0)*5)/5;
    const signature=JSON.stringify({
      level:snapshot.level,inventory:snapshot.inventory.map(item=>item&&[item.id,quantize(item.cooldown),quantize(item.activeTimer)]),
      skills:snapshot.skills.map(skill=>[skill.id,skill.level,quantize(skill.cd)]),
      buffs:snapshot.buffs.map(buff=>[buff.type,quantize(buff.val),quantize(buff.t)]),
      effects:snapshot.effects.map(effect=>[effect.targetId,effect.state.mp,effect.state.stunTimer,effect.state.silenceTimer,effect.state.buffs.map(buff=>[buff.type,quantize(buff.t)])]),
      bkb:quantize(snapshot.bkbActive),pillow:quantize(snapshot.timurPillow)
    });
    if(!force && signature===lastSnapshotSignature) return;
    lastSnapshotSignature=signature;
    socket.emit('playerSnapshot',snapshot);
  }
  const originalUseInventoryItem=useInventoryItem;
  useInventoryItem=function(hero,index){
    const beforeX=hero.x,beforeY=hero.y;
    const used=originalUseInventoryItem.apply(this,arguments);
    if(used && hero===playerHero) sendPlayerSnapshot(true,Math.hypot(hero.x-beforeX,hero.y-beforeY)>120);
    return used;
  };
  const originalBuyShopItem=buyShopItem;
  buyShopItem=function(id){
    const bought=originalBuyShopItem.apply(this,arguments);
    if(bought) sendPlayerSnapshot(true);
    return bought;
  };
  function applyRemotePlayerSnapshot(snapshot){
    if(!authoritativeMode || !snapshot || snapshot.id===onlineId) return;
    const hero=remoteHeroes.get(snapshot.id);
    if(!hero) return;
    if(Number.isFinite(snapshot.level)) hero.level=snapshot.level;
    if(Number.isFinite(snapshot.xp)) hero.xp=snapshot.xp;
    for(const key of ['hp','maxHp','mp','maxMp','bkbActive','timurPillow'])
      if(Number.isFinite(snapshot[key])) hero[key]=snapshot[key];
    if(Array.isArray(snapshot.inventory)) hero.inventory=snapshot.inventory.slice(0,6).map(item=>item&&({
      ...createInventoryItem(item.id),cooldown:Number(item.cooldown)||0,activeTimer:Number(item.activeTimer)||0
    }));
    if(Array.isArray(snapshot.skills)){
      for(const remoteSkill of snapshot.skills){
        const skill=hero.skills.find(item=>item.id===remoteSkill.id);
        if(skill){skill.level=remoteSkill.level;skill.cd=remoteSkill.cd;}
      }
    }
    if(Array.isArray(snapshot.buffs)) hero.buffs=snapshot.buffs.map(buff=>({...buff}));
    for(const effect of snapshot.effects||[]){
      const target=remoteHeroes.get(effect.targetId),state=effect.state;
      if(!target || target.onlinePlayerId!==onlineId || !state) continue;
      // No x/y/mp/maxMp here on purpose - see skillEffectState().
      for(const key of ['stunTimer','silenceTimer','slow','slowT','attackSlow','attackSlowT','liftTimer','knockbackX','knockbackY','knockbackTimer'])
        if(Number.isFinite(state[key])) target[key]=state[key];
      if(Array.isArray(state.buffs)) target.buffs=state.buffs.map(buff=>({...buff}));
    }
  }
  window.__shadowOnlineItemUsed=sendPlayerSnapshot;
  function sendPlayerStats(){
    if(!socket || !socket.connected || !authoritativeMode || !playerHero) return;
    socket.emit('playerStats',{
      hp:playerHero.hp,maxHp:playerHero.maxHp,gold:playerHero.coins,
      alive:!playerHero.dead,respawnTimer:Math.max(0,playerHero.respawnTimer||0),
      damageVersion:serverDamageVersion,sequence:++statsSequence
    });
  }
  function sendPlayerPosition(){
    if(!socket || !socket.connected || !authoritativeMode || !playerHero || playerHero.dead) return;
    sendInput({type:'position',x:playerHero.x,y:playerHero.y,angle:playerHero.facing,
      speed:playerHero.getSpeed(),attackRange:playerHero.getAttackRange()});
  }
  function applyLocalVitals(vitals){
    if(!vitals) return;
    const isLocal = vitals.id === onlineId;
    const hero = isLocal ? playerHero : remoteHeroes.get(vitals.id);
    if(!hero || (!isLocal && !hero.isHostedBot)) return;
    const knownVersion = isLocal ? serverDamageVersion : (botVersions.get(vitals.id) ?? -1);
    if(Number.isInteger(vitals.damageVersion) && vitals.damageVersion < knownVersion) return;
    if(Number.isInteger(vitals.damageVersion)){
      if(isLocal) serverDamageVersion = vitals.damageVersion; else botVersions.set(vitals.id, vitals.damageVersion);
    }
    if(Number.isFinite(vitals.maxHp)) hero.maxHp = vitals.maxHp;
    if(vitals.alive === false){
      if(!hero.dead){
        hero.dead = true;
        hero.deaths++;
        hero.killStreak = 0;
        hero.spreeKills = 0;
        hero.lastHeroKillTime = -Infinity;
      }
      hero.hp = 0;
      hero.respawnTimer = Math.max(0,Number(vitals.respawnTimer)||0);
      return;
    }
    if(vitals.alive === true && hero.dead){
      hero.respawnTimer = 0;
      hero.update(0);
    }
    if(Number.isFinite(vitals.hp)) hero.hp = vitals.hp;
    if(Number.isFinite(vitals.respawnTimer)) hero.respawnTimer = Math.max(0,vitals.respawnTimer);
  }
  /* Хост считает ИИ ботов и шлёт серверу их позицию/здоровье от имени бота. */
  function sendHostedBots(){
    if(!socket || !socket.connected || !authoritativeMode || onlineHostId !== onlineId) return;
    botSnapTick++;
    for(const [id,hero] of remoteHeroes){
      if(!hero.isHostedBot) continue;
      const emit = (type,payload) => socket.emit('botProxy',{botId:id,type,payload});
      if(!hero.dead) emit('input',{type:'position',x:hero.x,y:hero.y,angle:hero.facing,speed:hero.getSpeed(),attackRange:hero.getAttackRange()});
      emit('stats',{hp:hero.hp,maxHp:hero.maxHp,gold:hero.coins,alive:!hero.dead,
        respawnTimer:Math.max(0,hero.respawnTimer||0),damageVersion:botVersions.get(id) ?? 0,sequence:++statsSequence});
      if(botSnapTick % 20 === 0){
        emit('snapshot',{heroId:hero.def.id,level:hero.level,xp:hero.xp,x:hero.x,y:hero.y,teleport:false,
          hp:hero.hp,maxHp:hero.maxHp,mp:hero.mp,maxMp:hero.maxMp,
          inventory:hero.inventory.map(item=>item&&({id:item.id,cooldown:item.cooldown||0,activeTimer:item.activeTimer||0})),
          skills:hero.skills.map(skill=>({id:skill.id,level:skill.level,cd:skill.cd||0})),
          buffs:[],bkbActive:hero.bkbActive||0,timurPillow:hero.timurPillow||0,effects:[]});
      }
    }
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
    if(event.button === 2){
      if(playerHero.attackTarget && !playerHero.attackTarget.dead)
        moveOnlineHeroToAttackRange(playerHero.attackTarget);
      else sendInput({type:'move', moveTarget:{x:mouse.wx,y:mouse.wy}, angle:playerHero.facing});
    }
    // Left click is used for selecting/casting in this MOBA-style UI - it used to also
    // fire a leftover 80-damage 'shoot' bullet from an earlier prototype, which caused
    // random unexplained damage (including right after spawning). Removed.
  }, true);
  setInterval(() => {
    attachAuthoritativeSocket();
    if(authoritativeMode && playerHero) sendInput({type:'aim', angle:playerHero.facing});
    if(authoritativeMode) sendPlayerPosition();
    if(authoritativeMode) sendPlayerStats();
    if(authoritativeMode) sendPlayerSnapshot(false);
    if(authoritativeMode) sendHostedBots();
    if(authoritativeMode && playerHero && playerHero.attackTarget && !playerHero.attackTarget.dead){
      const target=playerHero.attackTarget;
      sendInput({type:'attackTarget',targetId:target.onlinePlayerId||null,targetX:target.x,targetY:target.y,
        speed:playerHero.getSpeed(),attackRange:playerHero.getAttackRange()});
    }
    const entry = onlineEntryElement;
    if(entry){
      const visible=gameState==='menu'&&menuStage==='home'&&!settingsOpen&&!storeOpen&&!changelogOpen;
      entry.hidden=!visible;
      entry.style.display=visible?'block':'none';
    }
  }, 50);
})();

/* ================================================================
   БАЗЫ 0.7.8 — большая территория базы, комната возрождения со стенами,
   фонтан только внутри комнаты, башни стреляют по врагам в комнате.
   Геометрия задана в координатах (u,v): угол карты = (0,0),
   u — вдоль одной стороны, v — вдоль другой. Для Сил Света это
   левый нижний угол (x=u, y=WORLD-v), для Сил Тьмы — правый верхний
   (x=WORLD-v, y=u).
   ================================================================ */
const BASE_ROOM_SIZE = 600;
const BASE_ROOM_MARGIN = 40;
const BASE_AREA = 1450;
const BASE_ART_SIZE = 1500;
const ROOM_FOUNTAIN_UV = [340, 340];
const ROOM_TURRETS = [[95,95],[95,585],[585,95],[640,375],[375,640]];
const ROOM_WALLS_UV = [[620,40,660,360],[40,620,360,660]];

function baseUV(team, u, v){
  return team === 0 ? {x:u, y:WORLD - v} : {x:WORLD - v, y:u};
}
/* Угол карты (0 — левый нижний, 1 — правый верхний), в котором стоит трон команды.
   В онлайне у второй команды карта зеркалится, поэтому смотрим на положение трона. */
function cornerOf(team){
  const b = BASES[team];
  return (b && b.x > WORLD/2) ? 1 : 0;
}
function cornerRect(corner){
  const a = baseUV(corner, BASE_ROOM_MARGIN, BASE_ROOM_MARGIN);
  const b = baseUV(corner, BASE_ROOM_MARGIN + BASE_ROOM_SIZE, BASE_ROOM_MARGIN + BASE_ROOM_SIZE);
  return {x0:Math.min(a.x,b.x), y0:Math.min(a.y,b.y), x1:Math.max(a.x,b.x), y1:Math.max(a.y,b.y)};
}
function baseRoomRect(team){ return cornerRect(cornerOf(team)); }
function spawnRoomCenter(team){
  const r = baseRoomRect(team);
  return {x:(r.x0+r.x1)/2, y:(r.y0+r.y1)/2};
}
function spawnPoint(team){
  const c = spawnRoomCenter(team);
  return {x:c.x + (Math.random()-0.5)*260, y:c.y + (Math.random()-0.5)*260};
}
function prematchRoamCenter(team){
  const c = spawnRoomCenter(team), b = BASES[team] || c;
  return {x:(c.x+b.x)/2, y:(c.y+b.y)/2};
}
function inSpawnRoom(x, y, team, pad){
  pad = pad || 0;
  const r = baseRoomRect(team);
  return x >= r.x0-pad && x <= r.x1+pad && y >= r.y0-pad && y <= r.y1+pad;
}
function inBaseArea(x, y){
  return (x < BASE_AREA && y > WORLD-BASE_AREA) || (x > WORLD-BASE_AREA && y < BASE_AREA);
}

let BASE_WALL_RECTS = null;
function baseWallRects(){
  if(BASE_WALL_RECTS) return BASE_WALL_RECTS;
  BASE_WALL_RECTS = [];
  for(let team=0; team<2; team++){
    for(const [u0,v0,u1,v1] of ROOM_WALLS_UV){
      const a = baseUV(team,u0,v0), b = baseUV(team,u1,v1);
      BASE_WALL_RECTS.push({x:Math.min(a.x,b.x), y:Math.min(a.y,b.y), w:Math.abs(a.x-b.x), h:Math.abs(a.y-b.y)});
    }
  }
  return BASE_WALL_RECTS;
}
function baseWallBlocked(x, y, r){
  if(!((x < 800 && y > WORLD-800) || (x > WORLD-800 && y < 800))) return false;
  for(const w of baseWallRects()){
    const cx = clamp(x, w.x, w.x+w.w), cy = clamp(y, w.y, w.y+w.h);
    if(Math.hypot(x-cx, y-cy) < r) return true;
  }
  return false;
}
/* Если героя телепортировало/откинуло в стену — вытолкнуть наружу. */
function resolveBaseWalls(unit){
  if(!unit || !((unit.x < 800 && unit.y > WORLD-800) || (unit.x > WORLD-800 && unit.y < 800))) return;
  const r = unit.radius || 20;
  for(const w of baseWallRects()){
    const cx = clamp(unit.x, w.x, w.x+w.w), cy = clamp(unit.y, w.y, w.y+w.h);
    const dx = unit.x-cx, dy = unit.y-cy, d = Math.hypot(dx,dy);
    if(d >= r) continue;
    if(d > 0.01){ unit.x += dx/d*(r-d); unit.y += dy/d*(r-d); }
    else {
      const l = unit.x-w.x, rr = w.x+w.w-unit.x, t = unit.y-w.y, b = w.y+w.h-unit.y;
      const m = Math.min(l,rr,t,b);
      if(m===l) unit.x = w.x-r; else if(m===rr) unit.x = w.x+w.w+r;
      else if(m===t) unit.y = w.y-r; else unit.y = w.y+w.h+r;
    }
  }
}

/* ---------- Ульта Сасыча (Rupture): урон за каждое пройденное расстояние ---------- */
function tickRupture(unit, dt){
  const r = unit.ruptureState;
  if(!r) return;
  if(unit.dead){ unit.ruptureState = null; return; }
  const moved = Math.min(700, Math.hypot(unit.x-r.x, unit.y-r.y));
  r.x = unit.x; r.y = unit.y;
  r.t -= dt;
  if(moved > 0.5){
    r.acc = (r.acc || 0) + moved * r.damagePerDistance;
    if(r.acc >= 10){
      const dmg = r.acc; r.acc = 0;
      applyDamage(unit, dmg, r.source);
      if(Math.random() < 0.5) spawnParticles(unit.x, unit.y, '#ff2a4a', 2, 0.5);
    }
  }
  if(r.t <= 0) unit.ruptureState = null;
}

/* ---------- Башни комнаты возрождения ---------- */
const roomBolts = [];
const roomFlash = [0,0];
const roomFireT = [0,0];
function updateBaseRooms(dt){
  for(let i=roomBolts.length-1;i>=0;i--){ roomBolts[i].t -= dt; if(roomBolts[i].t <= 0) roomBolts.splice(i,1); }
  roomFlash[0] = Math.max(0, roomFlash[0]-dt); roomFlash[1] = Math.max(0, roomFlash[1]-dt);
  for(let team=0; team<2; team++){
    const foes = [];
    for(const u of units){
      if(u.dead || u.team !== 1-team) continue;
      if(isBuilding(u) || isStructure(u)) continue;
      if(u.isOnlineRemote && !u.isOnlineBot) continue;
      if(!inSpawnRoom(u.x, u.y, team, 10)) continue;
      foes.push(u);
    }
    const corner = cornerOf(team);
    roomFireT[corner] -= dt;
    if(!foes.length){ roomFireT[corner] = Math.min(roomFireT[corner], 0.12); continue; }
    if(roomFireT[corner] > 0) continue;
    roomFireT[corner] = 0.5;
    roomFlash[corner] = 0.25;
    for(const [u,v] of ROOM_TURRETS){
      const p = baseUV(corner,u,v);
      let best = null, bd = Infinity;
      for(const f of foes){ const d = Math.hypot(f.x-p.x, f.y-p.y); if(d < bd){ bd = d; best = f; } }
      if(!best) continue;
      roomBolts.push({x1:p.x, y1:p.y-44, x2:best.x, y2:best.y, t:0.22, max:0.22, team:corner});
      applyDamage(best, 80 + (best.maxHp||600)*0.05, {team});
      fxHit(best.x, best.y, corner===0 ? '#9fffe0' : '#ff7a3a');
    }
  }
}

/* Молнии башен + красная метка Rupture — поверх юнитов. */
function drawBaseOverlay(){
  for(const b of roomBolts){
    const k = b.t/b.max;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = b.team===0 ? 'rgba(150,255,220,'+k+')' : 'rgba(255,140,60,'+k+')';
    ctx.shadowColor = b.team===0 ? '#7dffd8' : '#ff7a2a'; ctx.shadowBlur = 16;
    ctx.lineWidth = 2 + 5*k; ctx.lineCap = 'round';
    const mx = (b.x1+b.x2)/2 + (Math.random()-0.5)*34, my = (b.y1+b.y2)/2 + (Math.random()-0.5)*34;
    ctx.beginPath(); ctx.moveTo(b.x1,b.y1); ctx.lineTo(mx,my); ctx.lineTo(b.x2,b.y2); ctx.stroke();
    ctx.restore();
  }
  const now = performance.now()/1000;
  for(const u of units){
    if(!u.ruptureState || u.dead) continue;
    const r = u.ruptureState, pulse = 0.5 + 0.5*Math.sin(now*7);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,40,70,'+(0.45+0.4*pulse)+')'; ctx.lineWidth = 3;
    ctx.shadowColor = '#ff2a4a'; ctx.shadowBlur = 12;
    ctx.setLineDash([9,7]); ctx.lineDashOffset = -now*30;
    ctx.beginPath(); ctx.arc(u.x, u.y, (u.radius||20)+10+pulse*4, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff5a75'; ctx.font = 'bold 12px Segoe UI, Arial'; ctx.textAlign = 'center';
    ctx.fillText('РАЗРЫВ '+Math.ceil(r.t), u.x, u.y + (u.radius||20) + 28);
    ctx.restore();
  }
}

/* ---------- Оформление баз ---------- */
const baseArtCache = [null,null];
function getBaseArt(team){
  if(baseArtCache[team]) return baseArtCache[team];
  const S = BASE_ART_SIZE, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d');
  if(team === 0) g.setTransform(1,0,0,-1,0,S); else g.setTransform(0,1,-1,0,S,0);
  try { paintBaseArt(g, team===0 ? 'light' : 'dark', team===0 ? 1337 : 7331); }
  catch(err){ console.error('Ошибка отрисовки базы:', err); }
  baseArtCache[team] = cv;
  return cv;
}

function paintBaseArt(g, style, seed){
  const dark = style === 'dark';
  let sd = seed;
  const R = () => { sd = (sd + 0x6D2B79F5) | 0; let t = Math.imul(sd ^ (sd>>>15), 1|sd); t = (t + Math.imul(t ^ (t>>>7), 61|t)) ^ t; return ((t ^ (t>>>14))>>>0)/4294967296; };
  const L = 1300, RR = 520, CX = 813, CY = 813;
  const glow = dark ? '#ff5a1f' : '#8be9fd';
  const platform = () => { g.beginPath(); g.moveTo(-80,-80); g.lineTo(L,-80); g.lineTo(L,L-RR); g.arc(L-RR,L-RR,RR,0,Math.PI/2); g.lineTo(-80,L); g.closePath(); };
  const line = (ax,ay,bx,by) => { g.beginPath(); g.moveTo(ax,ay); g.lineTo(bx,by); g.stroke(); };
  const ROADS = [[520,520,CX,CY,100],[CX,CY,1400,1400,120],[CX,CY,1400,CY,100],[CX,CY,CX,1400,100]];
  const nearRoad = (u,v,m) => ROADS.some(r => pointSegmentDistance(u,v,r[0],r[1],r[2],r[3]) < r[4]/2+m);

  /* тень платформы и подложка */
  g.save(); platform(); g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 80; g.fillStyle = '#000'; g.fill(); g.restore();
  g.save(); platform(); g.clip();
  const bg = g.createRadialGradient(CX,CY,50,CX,CY,1000);
  bg.addColorStop(0, dark ? '#1c1720' : '#4a5b38'); bg.addColorStop(1, dark ? '#0b090d' : '#33422a');
  g.fillStyle = bg; g.fillRect(-100,-100,L+200,L+200);

  /* плитка */
  const T = 62;
  const cols = dark ? ['#2c2932','#34303a','#27242c','#302d37','#2a2630'] : ['#aaa690','#b6b19b','#a09d87','#a8a38d','#9fa88a'];
  for(let u=-T; u<L+T; u+=T) for(let v=-T; v<L+T; v+=T){
    g.fillStyle = cols[Math.floor(R()*cols.length)];
    g.beginPath(); g.roundRect(u+2+(R()-0.5)*3, v+2+(R()-0.5)*3, T-4, T-4, 7); g.fill();
    g.fillStyle = dark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.14)'; g.fillRect(u+5,v+5,T-12,3);
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(u+5,v+T-8,T-12,3);
  }
  /* мох / тёмные пятна */
  for(let i=0;i<110;i++){
    const u = R()*L, v = R()*L, r = 20+R()*70;
    const mg = g.createRadialGradient(u,v,0,u,v,r);
    mg.addColorStop(0, dark ? 'rgba(70,30,90,0.30)' : 'rgba(86,140,52,0.38)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = mg; g.beginPath(); g.arc(u,v,r,0,Math.PI*2); g.fill();
  }
  /* трещины */
  for(let i=0;i<(dark?46:70);i++){
    let u = R()*L, v = R()*L; const n = 4+Math.floor(R()*5);
    g.beginPath(); g.moveTo(u,v);
    for(let k=0;k<n;k++){ u += (R()-0.5)*90; v += (R()-0.5)*90; g.lineTo(u,v); }
    if(dark){
      g.save(); g.strokeStyle = 'rgba(255,90,30,0.85)'; g.lineWidth = 2.2; g.shadowColor = '#ff5a1f'; g.shadowBlur = 10; g.stroke(); g.restore();
    } else { g.strokeStyle = 'rgba(40,40,28,0.35)'; g.lineWidth = 1.6; g.stroke(); }
  }
  /* трава в щелях, цветы, камешки */
  if(!dark){
    for(let i=0;i<260;i++){
      const u = R()*L, v = R()*L;
      g.strokeStyle = R()<0.5 ? '#6fae3d' : '#8bc84a'; g.lineWidth = 1.6;
      for(let k=0;k<3;k++){ g.beginPath(); g.moveTo(u+k*3,v); g.lineTo(u+k*3+(R()-0.5)*8, v+8+R()*8); g.stroke(); }
    }
    const fc = ['#ffffff','#ffe27a','#ffb3d1','#c9b3ff'];
    for(let i=0;i<90;i++){ g.fillStyle = fc[Math.floor(R()*4)]; g.beginPath(); g.arc(R()*L,R()*L,2+R()*1.6,0,Math.PI*2); g.fill(); }
  }
  for(let i=0;i<170;i++){
    g.fillStyle = dark ? 'rgba(20,18,24,0.9)' : 'rgba(120,118,104,0.9)';
    g.beginPath(); g.ellipse(R()*L,R()*L,2+R()*4,1.5+R()*3,R()*3,0,Math.PI*2); g.fill();
  }

  /* дороги */
  g.lineCap = 'round';
  for(const [ax,ay,bx,by,w] of ROADS){
    g.strokeStyle = dark ? '#120f14' : '#6d6a58'; g.lineWidth = w+14; line(ax,ay,bx,by);
    g.strokeStyle = dark ? '#2f242b' : '#cfc7aa'; g.lineWidth = w; line(ax,ay,bx,by);
    g.strokeStyle = dark ? 'rgba(255,90,40,0.22)' : 'rgba(255,255,255,0.2)'; g.lineWidth = w*0.45; line(ax,ay,bx,by);
    const len = Math.hypot(bx-ax,by-ay), nx = -(by-ay)/len, ny = (bx-ax)/len;
    g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 2;
    for(let d=14; d<len; d+=34){
      const px = ax+(bx-ax)*d/len, py = ay+(by-ay)*d/len;
      line(px-nx*w/2*0.95, py-ny*w/2*0.95, px+nx*w/2*0.95, py+ny*w/2*0.95);
    }
  }
  g.lineCap = 'butt';

  /* постамент трона */
  const ring = (r,fill,stroke,lw) => { g.beginPath(); g.arc(CX,CY,r,0,Math.PI*2); if(fill){ g.fillStyle = fill; g.fill(); } if(stroke){ g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
  ring(352, dark ? '#0d0a10' : '#6b6650');
  ring(342, dark ? '#1d1722' : '#e3dcc4');
  const pg = g.createRadialGradient(CX,CY,20,CX,CY,330);
  pg.addColorStop(0, dark ? '#3a1612' : '#fbf6e4'); pg.addColorStop(0.55, dark ? '#1a1218' : '#e6dfc8'); pg.addColorStop(1, dark ? '#120d14' : '#cfc7aa');
  ring(330, pg);
  g.save(); g.shadowColor = glow; g.shadowBlur = 14;
  ring(318, null, dark ? 'rgba(255,100,40,0.9)' : 'rgba(110,220,245,0.95)', 4);
  ring(250, null, dark ? 'rgba(255,100,40,0.7)' : 'rgba(110,220,245,0.75)', 3);
  g.strokeStyle = dark ? 'rgba(255,100,40,0.85)' : 'rgba(110,220,245,0.85)'; g.lineWidth = 3;
  for(let k=0;k<2;k++){ g.beginPath(); for(let i=0;i<3;i++){ const a = k*Math.PI/3 + i*Math.PI*2/3 - Math.PI/2; const px = CX+Math.cos(a)*236, py = CY+Math.sin(a)*236; if(i===0) g.moveTo(px,py); else g.lineTo(px,py); } g.closePath(); g.stroke(); }
  for(let i=0;i<36;i++){ const a = i/36*Math.PI*2; g.beginPath(); g.moveTo(CX+Math.cos(a)*262,CY+Math.sin(a)*262); g.lineTo(CX+Math.cos(a)*(i%3===0?300:284),CY+Math.sin(a)*(i%3===0?300:284)); g.stroke(); }
  g.restore();

  /* кольцо: шипы (Тьма) / колонны с кристаллами (Свет) */
  const roadAngles = [Math.PI*1.25, Math.PI*0.25, 0, Math.PI/2];
  for(let i=0;i<20;i++){
    const a = i/20*Math.PI*2 + 0.1;
    if(roadAngles.some(ra => Math.abs(Math.atan2(Math.sin(a-ra),Math.cos(a-ra))) < 0.2)) continue;
    const bx = CX+Math.cos(a)*350, by = CY+Math.sin(a)*350;
    const ca = Math.cos(a), sa = Math.sin(a);
    if(dark){
      const len = 90+R()*70, w = 26+R()*10;
      g.fillStyle = '#0d0b10'; g.strokeStyle = '#4a1a18'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(bx-sa*w, by+ca*w); g.lineTo(bx+ca*len+ (R()-0.5)*14, by+sa*len); g.lineTo(bx+sa*w, by-ca*w); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#241a22'; g.beginPath(); g.moveTo(bx-sa*w, by+ca*w); g.lineTo(bx+ca*len, by+sa*len); g.lineTo(bx, by); g.closePath(); g.fill();
      g.save(); g.strokeStyle = 'rgba(255,70,40,0.85)'; g.shadowColor = '#ff3b2b'; g.shadowBlur = 10; g.lineWidth = 2;
      line(bx, by, bx+ca*len*0.85, by+sa*len*0.85); g.restore();
    } else {
      g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(bx-13+6, by-13+6, 30, 30);
      g.fillStyle = '#f1ead5'; g.strokeStyle = '#8d8568'; g.lineWidth = 2; g.fillRect(bx-15,by-15,30,30); g.strokeRect(bx-15,by-15,30,30);
      g.save(); g.shadowColor = '#8be9fd'; g.shadowBlur = 16; g.fillStyle = '#9fe9ff';
      g.beginPath(); g.moveTo(bx,by-12); g.lineTo(bx+9,by); g.lineTo(bx,by+12); g.lineTo(bx-9,by); g.closePath(); g.fill(); g.restore();
    }
  }
  g.restore(); /* конец клипа платформы */

  /* кромка платформы */
  g.save(); g.lineJoin = 'round';
  platform(); g.strokeStyle = dark ? '#09070b' : '#4e4a3a'; g.lineWidth = 46; g.stroke();
  platform(); g.strokeStyle = dark ? '#3d2a2e' : '#d9d1b6'; g.lineWidth = 30; g.stroke();
  platform(); g.strokeStyle = dark ? 'rgba(255,90,40,0.6)' : 'rgba(255,255,255,0.5)'; g.lineWidth = 5; g.shadowColor = glow; g.shadowBlur = 14; g.stroke();
  g.restore();
  const posts = [];
  for(let v=110; v<L-RR; v+=130) posts.push([L,v]);
  for(let a=0; a<Math.PI/2-0.01; a+=130/RR) posts.push([L-RR+Math.cos(a)*RR, L-RR+Math.sin(a)*RR]);
  for(let u=110; u<L-RR; u+=130) posts.push([u,L]);
  for(const [pu,pv] of posts){
    if(dark){
      g.fillStyle = '#0d0b10'; g.strokeStyle = '#5a2220'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(pu-13,pv-13); g.lineTo(pu,pv+34); g.lineTo(pu+13,pv-13); g.closePath(); g.fill(); g.stroke();
      g.save(); g.shadowColor = '#ff3b2b'; g.shadowBlur = 12; g.fillStyle = '#ff6a3a'; g.beginPath(); g.arc(pu,pv-2,4,0,Math.PI*2); g.fill(); g.restore();
    } else {
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(pu-11+6,pv-11+6,26,26);
      g.fillStyle = '#f1ead5'; g.strokeStyle = '#8d8568'; g.lineWidth = 2; g.fillRect(pu-13,pv-13,26,26); g.strokeRect(pu-13,pv-13,26,26);
      g.save(); g.shadowColor = '#8be9fd'; g.shadowBlur = 14; g.fillStyle = '#b7f2ff'; g.beginPath(); g.arc(pu,pv,6,0,Math.PI*2); g.fill(); g.restore();
    }
  }

  /* деревья / шипастые заросли по краям (без коллизии, только декор) */
  const decor = [];
  for(let i=0;i<46;i++){
    const side = Math.floor(R()*4);
    let u, v;
    if(side===0){ u = L-110+R()*230; v = 80+R()*(L-RR-80); }
    else if(side===1){ v = L-110+R()*230; u = 80+R()*(L-RR-80); }
    else if(side===2){ u = 720+R()*560; v = 55+R()*110; }
    else { v = 720+R()*560; u = 55+R()*110; }
    if(nearRoad(u,v,70) || (u<720 && v<720)) continue;
    if(decor.some(d => Math.hypot(d[0]-u,d[1]-v) < 70)) continue;
    decor.push([u,v,0.8+R()*0.6]);
  }
  for(const [u,v,sz] of decor){
    if(!dark){
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(u+14,v+10,40*sz,26*sz,0,0,Math.PI*2); g.fill();
      g.fillStyle = '#4b3526'; g.beginPath(); g.arc(u,v,9*sz,0,Math.PI*2); g.fill();
      const cs = ['#f27fb3','#ff9fc9','#ffc2dc','#ee6aa6'];
      for(let k=0;k<9;k++){
        const a = k/9*Math.PI*2, d = (k%3===0?0:22)*sz;
        g.fillStyle = cs[k%4]; g.beginPath(); g.arc(u+Math.cos(a)*d,v+Math.sin(a)*d,(24+R()*8)*sz,0,Math.PI*2); g.fill();
      }
      g.fillStyle = 'rgba(255,235,244,0.5)'; g.beginPath(); g.arc(u-8*sz,v-9*sz,14*sz,0,Math.PI*2); g.fill();
      g.fillStyle = 'rgba(255,170,205,0.8)';
      for(let k=0;k<10;k++){ g.beginPath(); g.ellipse(u+(R()-0.5)*130*sz,v+(R()-0.5)*130*sz,3,1.8,R()*3,0,Math.PI*2); g.fill(); }
    } else {
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(u+14,v+10,42*sz,26*sz,0,0,Math.PI*2); g.fill();
      g.strokeStyle = '#1a1018'; g.lineCap = 'round';
      for(let k=0;k<5;k++){ const a = k/5*Math.PI*2+R(); g.lineWidth = 7*sz; g.beginPath(); g.moveTo(u,v); g.quadraticCurveTo(u+Math.cos(a)*30*sz,v+Math.sin(a)*30*sz+10,u+Math.cos(a+0.4)*52*sz,v+Math.sin(a+0.4)*52*sz); g.stroke(); }
      g.lineCap = 'butt';
      const fc = ['#4d2468','#6a3a8a','#8e4aa8','#7a2f6a'];
      for(let k=0;k<8;k++){ const a = R()*Math.PI*2, d = R()*40*sz; g.fillStyle = fc[k%4]; g.beginPath(); g.arc(u+Math.cos(a)*d,v+Math.sin(a)*d,(12+R()*10)*sz,0,Math.PI*2); g.fill(); }
      g.save(); g.shadowColor = '#ff8a3a'; g.shadowBlur = 10; g.fillStyle = '#ff9a45';
      for(let k=0;k<4;k++){ g.beginPath(); g.arc(u+(R()-0.5)*60*sz,v+(R()-0.5)*60*sz,3+R()*2,0,Math.PI*2); g.fill(); } g.restore();
    }
  }

  /* ================= КОМНАТА ВОЗРОЖДЕНИЯ ================= */
  const RU = 40, RS = BASE_ROOM_SIZE;
  g.save(); g.beginPath(); g.rect(RU,RU,RS,RS); g.clip();
  const rc = dark ? ['#241d2a','#1b1621'] : ['#dcefe6','#c9e3d9'];
  for(let u=RU; u<RU+RS; u+=60) for(let v=RU; v<RU+RS; v+=60){
    g.fillStyle = rc[((u-RU)/60+(v-RU)/60)%2]; g.fillRect(u,v,60,60);
    g.strokeStyle = dark ? 'rgba(255,100,40,0.10)' : 'rgba(80,170,160,0.18)'; g.lineWidth = 1; g.strokeRect(u+0.5,v+0.5,59,59);
  }
  const [FU,FV] = ROOM_FOUNTAIN_UV;
  const rg = g.createRadialGradient(FU,FV,10,FU,FV,300);
  rg.addColorStop(0, dark ? 'rgba(255,110,40,0.35)' : 'rgba(120,255,220,0.35)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(RU,RU,RS,RS);
  /* ковровая дорожка к выходу */
  g.lineCap = 'butt';
  g.strokeStyle = dark ? '#3a1218' : '#b8405f'; g.lineWidth = 78; line(FU,FV,560,560);
  g.strokeStyle = dark ? '#7a4a2a' : '#e8c66a'; g.lineWidth = 70; line(FU,FV,560,560);
  g.strokeStyle = dark ? '#5a1620' : '#c94a6a'; g.lineWidth = 58; line(FU,FV,560,560);
  /* руны вокруг фонтана */
  g.save(); g.shadowColor = glow; g.shadowBlur = 10;
  g.strokeStyle = dark ? 'rgba(255,110,50,0.85)' : 'rgba(80,200,220,0.9)'; g.lineWidth = 3;
  g.beginPath(); g.arc(FU,FV,200,0,Math.PI*2); g.stroke();
  g.beginPath(); g.arc(FU,FV,170,0,Math.PI*2); g.stroke();
  for(let i=0;i<16;i++){ const a = i/16*Math.PI*2; line(FU+Math.cos(a)*176,FV+Math.sin(a)*176,FU+Math.cos(a)*194,FV+Math.sin(a)*194); }
  g.restore();
  /* чаша фонтана */
  g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(FU+8,FV+8,128,0,Math.PI*2); g.fill();
  g.fillStyle = dark ? '#3a2a30' : '#efe8d2'; g.beginPath(); g.arc(FU,FV,128,0,Math.PI*2); g.fill();
  g.fillStyle = dark ? '#1b1013' : '#cfc7aa'; g.beginPath(); g.arc(FU,FV,112,0,Math.PI*2); g.fill();
  g.fillStyle = dark ? '#7a1c0a' : '#4cc3e6'; g.beginPath(); g.arc(FU,FV,98,0,Math.PI*2); g.fill();
  /* жаровни / кристаллы-светильники */
  for(const [bu,bv] of [[100,340],[340,100],[100,560],[560,100]]){
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(bu+6,bv+6,22,0,Math.PI*2); g.fill();
    g.fillStyle = dark ? '#2a2026' : '#d8d1b8'; g.strokeStyle = dark ? '#6a2a22' : '#8d8568'; g.lineWidth = 3;
    g.beginPath(); g.arc(bu,bv,20,0,Math.PI*2); g.fill(); g.stroke();
    g.fillStyle = dark ? '#1a0c08' : '#9fe9ff'; g.beginPath(); g.arc(bu,bv,12,0,Math.PI*2); g.fill();
  }
  /* черепа и кости у Тьмы / цветочные вазоны у Света */
  for(let i=0;i<16;i++){
    const u = RU+30+R()*(RS-60), v = RU+30+R()*(RS-60);
    if(Math.hypot(u-FU,v-FV) < 210) continue;
    if(dark){
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(u+3,v+3,12,10,0,0,Math.PI*2); g.fill();
      g.fillStyle = '#d6cfbd'; g.beginPath(); g.ellipse(u,v,11,9.5,0,0,Math.PI*2); g.fill();
      g.fillStyle = '#c2bba8'; g.fillRect(u-6,v+6,12,6);
      g.fillStyle = '#120a0c'; g.beginPath(); g.arc(u-4,v-1,3,0,Math.PI*2); g.arc(u+4,v-1,3,0,Math.PI*2); g.fill();
    } else {
      g.fillStyle = '#ffb3d1'; g.beginPath(); g.arc(u,v,4,0,Math.PI*2); g.fill();
      g.fillStyle = '#7fd47a'; g.beginPath(); g.arc(u+5,v+3,3,0,Math.PI*2); g.fill();
    }
  }
  g.restore();

  /* стены комнаты */
  const wall = (u0,v0,u1,v1) => {
    g.save(); g.shadowColor = 'rgba(0,0,0,0.65)'; g.shadowBlur = 20; g.shadowOffsetX = 8; g.shadowOffsetY = 8;
    g.fillStyle = dark ? '#2e2a33' : '#bfb8a0'; g.fillRect(u0,v0,u1-u0,v1-v0); g.restore();
    g.fillStyle = dark ? '#403b48' : '#ddd6bd'; g.fillRect(u0+5,v0+5,u1-u0-10,v1-v0-10);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.5;
    const horiz = (u1-u0) > (v1-v0);
    if(horiz){ for(let u=u0+30; u<u1; u+=30) line(u,v0+5,u,v1-5); line(u0+5,(v0+v1)/2,u1-5,(v0+v1)/2); }
    else { for(let v=v0+30; v<v1; v+=30) line(u0+5,v,u1-5,v); line((u0+u1)/2,v0+5,(u0+u1)/2,v1-5); }
    g.save(); g.strokeStyle = dark ? 'rgba(255,100,40,0.55)' : 'rgba(110,220,245,0.6)'; g.lineWidth = 2; g.shadowColor = glow; g.shadowBlur = 8;
    if(horiz) line(u0+8,(v0+v1)/2+9,u1-8,(v0+v1)/2+9); else line((u0+u1)/2+9,v0+8,(u0+u1)/2+9,v1-8);
    g.restore();
  };
  wall(0,0,660,40); wall(0,0,40,660);
  wall(620,40,660,360); wall(40,620,360,660);
  /* пилоны ворот */
  const pillar = (pu,pv) => {
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(pu-30+8,pv-30+8,64,64);
    g.fillStyle = dark ? '#2a2630' : '#c7bfa4'; g.strokeStyle = dark ? '#0b090d' : '#6d6650'; g.lineWidth = 3;
    g.fillRect(pu-32,pv-32,64,64); g.strokeRect(pu-32,pv-32,64,64);
    g.fillStyle = dark ? '#3b3642' : '#e6dfc6'; g.fillRect(pu-24,pv-24,48,48);
  };
  pillar(640,375); pillar(375,640);
  /* основания башен */
  for(const [tu,tv] of ROOM_TURRETS){
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(tu+7,tv+7,30,0,Math.PI*2); g.fill();
    g.fillStyle = dark ? '#1d1a21' : '#9a947c'; g.strokeStyle = dark ? '#6a2a22' : '#e8e0c8'; g.lineWidth = 4;
    g.beginPath(); g.arc(tu,tv,28,0,Math.PI*2); g.fill(); g.stroke();
    g.fillStyle = dark ? '#34303a' : '#cfc7aa'; g.beginPath(); g.arc(tu,tv,18,0,Math.PI*2); g.fill();
  }
}

function baseFlame(x, y, sz, t, ph, glowCol){
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const gl = ctx.createRadialGradient(x,y,0,x,y,sz*2.4);
  gl.addColorStop(0, glowCol); gl.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(x,y,sz*2.4,0,Math.PI*2); ctx.fill();
  for(let i=0;i<3;i++){
    const h = sz*(1.5+0.6*Math.sin(t*7+ph+i*2)), ox = (i-1)*sz*0.45;
    const fg = ctx.createLinearGradient(0,y,0,y-h);
    fg.addColorStop(0, 'rgba(255,170,60,0.85)'); fg.addColorStop(1, 'rgba(255,50,20,0)');
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.moveTo(x+ox-sz*0.35,y);
    ctx.quadraticCurveTo(x+ox,y-h*0.7,x+ox+Math.sin(t*5+i+ph)*sz*0.3,y-h);
    ctx.quadraticCurveTo(x+ox+sz*0.1,y-h*0.4,x+ox+sz*0.35,y); ctx.fill();
  }
  ctx.restore();
}

function drawBaseComplexes(){
  const t = performance.now()/1000;
  for(let team=0; team<2; team++){
    const dark = team === 1;
    const ax = dark ? WORLD-BASE_ART_SIZE : 0, ay = dark ? 0 : WORLD-BASE_ART_SIZE;
    if(Math.abs(cam.x-(ax+BASE_ART_SIZE/2)) > VW/2+BASE_ART_SIZE/2 + 50 || Math.abs(cam.y-(ay+BASE_ART_SIZE/2)) > VH/2+BASE_ART_SIZE/2 + 50) continue;
    ctx.drawImage(getBaseArt(team), ax, ay);
    const rr = cornerRect(team);
    /* зона восстановления */
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = (dark ? 'rgba(255,80,30,' : 'rgba(80,255,200,') + (0.05+0.03*Math.sin(t*2)) + ')';
    ctx.fillRect(rr.x0, rr.y0, rr.x1-rr.x0, rr.y1-rr.y0);
    ctx.restore();
    /* фонтан */
    const f = baseUV(team, ROOM_FOUNTAIN_UV[0], ROOM_FOUNTAIN_UV[1]);
    ctx.save();
    const wg = ctx.createRadialGradient(f.x,f.y,4,f.x,f.y,96);
    if(dark){ wg.addColorStop(0,'rgba(255,241,168,0.95)'); wg.addColorStop(0.45,'rgba(255,106,31,'+(0.7+0.2*Math.sin(t*3))+')'); wg.addColorStop(1,'rgba(122,20,8,0.8)'); }
    else { wg.addColorStop(0,'rgba(240,254,255,0.95)'); wg.addColorStop(0.45,'rgba(120,225,250,'+(0.7+0.2*Math.sin(t*3))+')'); wg.addColorStop(1,'rgba(60,170,220,0.8)'); }
    ctx.fillStyle = wg; ctx.beginPath(); ctx.arc(f.x,f.y,96,0,Math.PI*2); ctx.fill();
    for(let k=0;k<3;k++){
      const ph = (t*0.5+k/3)%1;
      ctx.strokeStyle = (dark ? 'rgba(255,170,90,' : 'rgba(200,252,255,') + ((1-ph)*0.7) + ')'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(f.x,f.y,24+ph*72,0,Math.PI*2); ctx.stroke();
    }
    ctx.restore();
    if(dark){
      baseFlame(f.x, f.y+6, 34, t, 0, 'rgba(255,100,30,0.35)');
      for(let k=0;k<4;k++){ const a = k/4*Math.PI*2+t*0.5; baseFlame(f.x+Math.cos(a)*50, f.y+Math.sin(a)*30+6, 16, t, k, 'rgba(255,80,20,0.2)'); }
    } else {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const jg = ctx.createLinearGradient(0,f.y,0,f.y-100);
      jg.addColorStop(0,'rgba(190,250,255,0.75)'); jg.addColorStop(1,'rgba(190,250,255,0)');
      ctx.fillStyle = jg; ctx.beginPath(); ctx.moveTo(f.x-14,f.y); ctx.quadraticCurveTo(f.x,f.y-(80+14*Math.sin(t*4)),f.x+14,f.y); ctx.fill();
      ctx.fillStyle = 'rgba(220,255,255,0.9)';
      for(let k=0;k<10;k++){ const ph = (t*0.7+k/10)%1; ctx.beginPath(); ctx.arc(f.x+Math.sin(k*2.1+t)*30*ph, f.y-ph*90+ph*ph*70, 2.2*(1-ph)+0.6, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
    /* огни: жаровни и пилоны ворот */
    for(const [bu,bv,s] of [[100,340,15],[340,100,15],[100,560,15],[560,100,15],[640,375,18],[375,640,18]]){
      const p = baseUV(team,bu,bv);
      if(dark) baseFlame(p.x, p.y, s, t, bu+bv, 'rgba(255,90,30,0.28)');
      else {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const cg = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,s*2.6);
        cg.addColorStop(0,'rgba(190,250,255,'+(0.65+0.25*Math.sin(t*2+bu)) +')'); cg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(p.x,p.y,s*2.6,0,Math.PI*2); ctx.fill(); ctx.restore();
      }
    }
    /* башни обстрела */
    for(const [tu,tv] of ROOM_TURRETS){
      const p = baseUV(team,tu,tv), fl = roomFlash[team] > 0 ? 1 : 0;
      ctx.save();
      ctx.fillStyle = dark ? '#2a2630' : '#d8d1b8'; ctx.strokeStyle = dark ? '#6a2a22' : '#8d8568'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x,p.y-26,16,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.shadowColor = dark ? '#ff5a1f' : '#7dffd8'; ctx.shadowBlur = 12 + fl*20;
      ctx.fillStyle = dark ? (fl?'#ffe0a0':'#ff6a3a') : (fl?'#ffffff':'#8ff7dc');
      ctx.beginPath(); ctx.arc(p.x,p.y-26,7+fl*3,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    /* аура и вращающиеся руны трона */
    const b = baseUV(team, 813, 813);
    if(b){
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const tg = ctx.createRadialGradient(b.x,b.y,30,b.x,b.y,380);
      tg.addColorStop(0, (dark ? 'rgba(255,60,30,' : 'rgba(150,240,255,') + (0.14+0.05*Math.sin(t*1.6)) + ')'); tg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(b.x,b.y,380,0,Math.PI*2); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.strokeStyle = dark ? 'rgba(255,120,50,0.55)' : 'rgba(130,235,255,0.6)'; ctx.lineWidth = 4;
      ctx.setLineDash([26,20]); ctx.lineDashOffset = -t*22; ctx.shadowColor = dark ? '#ff5a1f' : '#8be9fd'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(b.x,b.y,284,0,Math.PI*2); ctx.stroke(); ctx.restore();
      if(!dark){
        ctx.save(); ctx.fillStyle = 'rgba(255,170,205,0.85)';
        for(let k=0;k<14;k++){ const ph = (t*0.12+k/14)%1; ctx.beginPath(); ctx.ellipse(b.x-380+ph*760+Math.sin(ph*9+k)*30, b.y-260+((ph*3+k*0.37)%1)*520, 3.2, 1.8, ph*8, 0, Math.PI*2); ctx.fill(); }
        ctx.restore();
      } else {
        ctx.save(); ctx.fillStyle = 'rgba(255,170,80,0.9)';
        for(let k=0;k<16;k++){ const ph = (t*0.3+k/16)%1; ctx.beginPath(); ctx.arc(b.x-220+((k*97)%440)+Math.sin(ph*7+k)*10, b.y+60-ph*260, 2*(1-ph)+0.5, 0, Math.PI*2); ctx.fill(); }
        ctx.restore();
      }
    }
  }
}
