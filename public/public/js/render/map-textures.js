/* Процедурные текстуры карты (вынесено из game.js, этап 3). Обычный скрипт, подключается ПЕРЕД game.js.
   Здесь только чистые построители (canvas без ctx игры). createPattern(...) и декор земли остались в game.js. */
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
    dirt:'rgba(98,76,46,0.55)', dirtPatches:6, glow:false,
    tones:['rgba(120,170,50,0.16)','rgba(70,120,60,0.18)','rgba(170,170,70,0.13)','rgba(20,50,25,0.22)'], dry:['#9a9a4a','#b3a85a','#7d8a3c'], clover:'#5f9a3a', pebble:'rgba(150,130,100,0.9)'
  },
  dark:{
    base:'#141a17', blobL:'rgba(72,98,80,0.20)', blobD:'rgba(0,0,0,0.42)',
    blades:['#27392c','#1b2a20','#35523b','#0f1612','#48644c'], tip:'#648768',
    stones:['#4b5254','#3c4244','#5b6265','#2f3437','#6a7172'], moss:'rgba(42,92,64,0.75)',
    flowers:['#c2334f','#e0566f','#a82440','#e98aa0'], flowerCore:'#3a0f18', stem:'#1f3a28', flowerN:30,
    dirt:'rgba(8,6,7,0.62)', dirtPatches:7, glow:true,
    tones:['rgba(60,90,90,0.15)','rgba(40,60,80,0.14)','rgba(90,50,70,0.10)','rgba(0,0,0,0.28)'], dry:['#3d3f38','#4a4a40','#2f332e'], clover:'#2f5a45', pebble:'rgba(90,92,96,0.9)'
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

  /* 0.9.8.2: крупные цветовые переходы + мелкие детали (бесшовно через texWrap) */
  for(let i=0;i<Math.round(26*k);i++){
    const x=R()*S,y=R()*S,rx=70+R()*150,ry=rx*(0.45+R()*0.4),rot=R()*Math.PI,col=pal.tones[(R()*pal.tones.length)|0];
    texWrap(S,x,y,rx,(px,py)=>{
      g.save(); g.translate(px,py); g.rotate(rot); g.scale(1,ry/rx);
      const gr=g.createRadialGradient(0,0,0,0,0,rx);
      gr.addColorStop(0,col); gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr; g.beginPath(); g.arc(0,0,rx,0,Math.PI*2); g.fill(); g.restore();
    });
  }
  /* зернистая «пестрота» травы */
  for(let i=0;i<Math.round(900*k);i++){
    const x=R()*S,y=R()*S,r=1.5+R()*3.5,dark=R()>0.5;
    texWrap(S,x,y,r,(px,py)=>{
      g.globalAlpha=0.07+R()*0.08; g.fillStyle=dark?'#000':pal.tip;
      g.beginPath(); g.arc(px,py,r,0,Math.PI*2); g.fill();
    });
  }
  g.globalAlpha=1;
  /* сухие былинки */
  for(let i=0;i<Math.round(260*k);i++){
    const x=R()*S,y=R()*S,len=5+R()*8,a=-Math.PI/2+(R()-0.5)*1.8,col=pal.dry[(R()*pal.dry.length)|0];
    texWrap(S,x,y,len,(px,py)=>{
      g.globalAlpha=0.35+R()*0.3; g.strokeStyle=col; g.lineWidth=0.8+R()*0.6;
      g.beginPath(); g.moveTo(px,py); g.lineTo(px+Math.cos(a)*len,py+Math.sin(a)*len); g.stroke();
    });
  }
  g.globalAlpha=1;
  /* клевер */
  for(let i=0;i<Math.round(40*k);i++){
    const x=R()*S,y=R()*S,r=2+R()*1.6;
    texWrap(S,x,y,r*3,(px,py)=>{
      g.fillStyle='rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(px+1,py+2,r*2,r*1.2,0,0,Math.PI*2); g.fill();
      g.fillStyle=pal.clover;
      for(let q=0;q<3;q++){ const a=q*2.09+0.5; g.beginPath(); g.arc(px+Math.cos(a)*r,py+Math.sin(a)*r,r,0,Math.PI*2); g.fill(); }
      g.fillStyle='rgba(255,255,255,0.14)'; g.beginPath(); g.arc(px-0.5,py-1,r*0.6,0,Math.PI*2); g.fill();
    });
  }
  /* мелкая галька с тенью */
  for(let i=0;i<Math.round(60*k);i++){
    const x=R()*S,y=R()*S,r=0.8+R()*1.6;
    texWrap(S,x,y,r+2,(px,py)=>{
      g.fillStyle='rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(px+1,py+1.5,r*1.2,r*0.8,0,0,Math.PI*2); g.fill();
      g.fillStyle=pal.pebble; g.beginPath(); g.ellipse(px,py,r,r*0.75,0,0,Math.PI*2); g.fill();
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

  /* 0.9.8.2: тёмные влажные пятна, светлые сухие потёртости и трещины для глубины */
  for(let i=0;i<9;i++){
    const x=R()*S,y=R()*S,rx=18+R()*36,ry=rx*(0.45+R()*0.4),rot=R()*3,wet=R()>0.45;
    texWrap(S,x,y,rx,(px,py)=>{
      g.save(); g.translate(px,py); g.rotate(rot); g.scale(1,ry/rx);
      const gr=g.createRadialGradient(0,0,0,0,0,rx);
      gr.addColorStop(0,wet?'rgba(20,12,6,0.30)':'rgba(220,190,140,0.16)'); gr.addColorStop(1,'rgba(0,0,0,0)');
      g.fillStyle=gr; g.beginPath(); g.arc(0,0,rx,0,Math.PI*2); g.fill(); g.restore();
    });
  }
  for(let i=0;i<70;i++){
    const x=R()*S,y=R()*S,len=3+R()*7,a=R()*6.28;
    texWrap(S,x,y,len,(px,py)=>{
      g.globalAlpha=0.25+R()*0.25; g.strokeStyle=R()>0.5?pal.hi:pal.lo; g.lineWidth=0.8;
      g.beginPath(); g.moveTo(px,py); g.lineTo(px+Math.cos(a)*len,py+Math.sin(a)*len); g.stroke();
    });
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
