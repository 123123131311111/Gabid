/* Визуал логова и самого Рошана 0.9.8.4. Только рисование: механики, позиции и статы остаются в game.js.
   Статичная часть логова рисуется один раз в offscreen-canvas, динамика (огонь, руны, дымка) — лёгкая и зависит от настроек графики. */
const RoshanVisuals = (function(){
  const fx = [];            /* эффекты событий: spawn / death / chips */
  let lairCache = null;
  const CW = 620, CH = 540;  /* размер кэша, центр в (CW/2, CH/2) */

  function q(){
    const perf = (typeof perfLevel!=='undefined') ? perfLevel : 0;
    const gl = (typeof GFX!=='undefined') ? GFX.glow : 2;
    const pt = (typeof GFX!=='undefined') ? GFX.particles : 2;
    return {rich: perf<2, glow: perf<2 && gl>0, parts: perf>=3 ? 0 : [3,6,10][pt]|0, perf};
  }
  function rnd(seed){ return (typeof mulberry32==='function') ? mulberry32(seed) : (function(){ let a=seed; return ()=>((a=(a*16807)%2147483647)/2147483647); })(); }

  /* ---------- статичное логово ---------- */
  function stone(g,x,y,rx,ry,rot,R,tone){
    g.save(); g.translate(x,y); g.rotate(rot);
    g.fillStyle='rgba(0,0,0,0.38)'; g.beginPath(); g.ellipse(rx*0.25+3,ry*0.5+5,rx*1.1,ry*0.95,0,0,Math.PI*2); g.fill();
    /* неровный контур скалы */
    const n=9, pts=[];
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2, k=0.82+R()*0.3; pts.push([Math.cos(a)*rx*k,Math.sin(a)*ry*k]); }
    g.beginPath(); g.moveTo(pts[0][0],pts[0][1]); for(let i=1;i<n;i++) g.lineTo(pts[i][0],pts[i][1]); g.closePath();
    const gr=g.createLinearGradient(-rx,-ry,rx*0.8,ry);
    gr.addColorStop(0,'hsl(25,'+(8+tone*6)+'%,'+(40+tone*10)+'%)'); gr.addColorStop(0.55,'hsl(22,9%,'+(26+tone*6)+'%)'); gr.addColorStop(1,'hsl(20,10%,12%)');
    g.fillStyle=gr; g.fill(); g.strokeStyle='rgba(8,5,4,0.8)'; g.lineWidth=1.6; g.stroke();
    /* светлая грань и трещины */
    g.strokeStyle='rgba(255,225,190,0.28)'; g.lineWidth=1.4; g.beginPath(); g.moveTo(pts[7][0],pts[7][1]); g.lineTo(pts[8][0],pts[8][1]); g.lineTo(pts[0][0],pts[0][1]); g.lineTo(pts[1][0],pts[1][1]); g.stroke();
    g.strokeStyle='rgba(0,0,0,0.5)'; g.lineWidth=1;
    for(let c=0;c<2;c++){ let cx=(R()-0.5)*rx, cy=(R()-0.5)*ry; g.beginPath(); g.moveTo(cx,cy); for(let s=0;s<3;s++){ cx+=(R()-0.5)*rx*0.6; cy+=(R()-0.2)*ry*0.5; g.lineTo(cx,cy); } g.stroke(); }
    g.restore();
  }
  function crack(g,x,y,len,R,w){
    g.beginPath(); g.moveTo(x,y); let a=R()*6.28;
    const pts=[[x,y]];
    for(let s=0;s<6;s++){ a+=(R()-0.5)*1.2; x+=Math.cos(a)*len/6*(0.6+R()*0.8); y+=Math.sin(a)*len/6*(0.6+R()*0.8)*0.85; g.lineTo(x,y); pts.push([x,y]); }
    g.strokeStyle='rgba(0,0,0,0.7)'; g.lineWidth=w; g.stroke();
    g.strokeStyle='rgba(255,130,50,0.22)'; g.lineWidth=Math.max(0.6,w*0.4); g.beginPath(); g.moveTo(pts[0][0]+0.8,pts[0][1]+0.8); for(const p of pts) g.lineTo(p[0]+0.8,p[1]+0.8); g.stroke();
  }
  const ENT = Math.PI*0.75;   /* направление входа (визуальное: к юго-западу, к базе Света) */
  function buildLair(){
    const c=document.createElement('canvas'); c.width=CW; c.height=CH; const g=c.getContext('2d'); const R=rnd(8841);
    g.translate(CW/2,CH/2);
    /* окружающая выжженная земля с мягким переходом */
    let gr=g.createRadialGradient(0,0,100,0,0,255);
    gr.addColorStop(0,'rgba(30,18,14,0.95)'); gr.addColorStop(0.55,'rgba(52,36,28,0.82)'); gr.addColorStop(1,'rgba(52,36,28,0)');
    g.fillStyle=gr; g.beginPath(); g.ellipse(0,0,255,220,0,0,Math.PI*2); g.fill();
    /* пыль и камешки по ореолу */
    for(let i=0;i<150;i++){
      const a=R()*6.28, r=140+R()*100, x=Math.cos(a)*r, y=Math.sin(a)*r*0.86, s=1+R()*3;
      g.fillStyle=R()>0.5?'rgba(120,98,80,0.55)':'rgba(15,10,8,0.5)'; g.beginPath(); g.ellipse(x,y,s,s*0.7,R()*3,0,Math.PI*2); g.fill();
    }
    /* яма: ступенчатые уровни глубины */
    for(let i=0;i<4;i++){
      const k=1-i*0.1, col=['#3a2c25','#2c211c','#1c1411','#0d0807'][i];
      g.fillStyle=col; g.beginPath(); g.ellipse(0,i*3,138*k,114*k,0,0,Math.PI*2); g.fill();
      g.strokeStyle='rgba(255,220,180,'+(0.12-i*0.025)+')'; g.lineWidth=2; g.beginPath(); g.ellipse(0,i*3-1,138*k,114*k,0,Math.PI*1.05,Math.PI*1.9); g.stroke();
    }
    /* плитка пола: кладка каменных плит */
    g.save(); g.beginPath(); g.ellipse(0,6,104,82,0,0,Math.PI*2); g.clip();
    for(let y=-90;y<100;y+=22){
      const off=((y/22)&1)*14;
      for(let x=-120;x<120;x+=28){
        const tone=0.85+R()*0.3;
        g.fillStyle='rgba('+Math.round(70*tone)+','+Math.round(54*tone)+','+Math.round(46*tone)+',0.55)'; g.fillRect(x+off+1,y+1,26,20);
        g.strokeStyle='rgba(0,0,0,0.45)'; g.lineWidth=1; g.strokeRect(x+off+1,y+1,26,20);
        g.fillStyle='rgba(255,230,200,0.06)'; g.fillRect(x+off+2,y+2,24,3);
      }
    }
    for(let i=0;i<7;i++) crack(g,(R()-0.5)*160,(R()-0.5)*120,50+R()*50,R,1.6);
    /* центральная печать */
    g.restore();
    g.strokeStyle='rgba(255,140,60,0.5)'; g.lineWidth=2;
    for(const [rx,ry] of [[78,60],[58,44],[38,28]]){ g.beginPath(); g.ellipse(0,6,rx,ry,0,0,Math.PI*2); g.stroke(); }
    g.beginPath(); for(let i=0;i<6;i++){ const a=i*Math.PI/3-Math.PI/2; g.lineTo(Math.cos(a)*74,6+Math.sin(a)*56); } g.closePath(); g.stroke();
    g.fillStyle='rgba(255,150,70,0.8)'; g.font='bold 14px serif'; g.textAlign='center';
    for(let i=0;i<12;i++){ const a=i*Math.PI/6; g.fillText('ᛟᚱᚦᛉ'[i%4],Math.cos(a)*66,6+Math.sin(a)*50+5); }
    /* внешнее кольцо скал (с проёмом-входом) */
    const N=26;
    for(let i=0;i<N;i++){
      const a=i/N*Math.PI*2;
      let d=Math.abs(((a-ENT+Math.PI*3)%(Math.PI*2))-Math.PI); d=Math.abs(d);   /* d — угловое расстояние до входа */
      const dd=Math.abs(Math.atan2(Math.sin(a-ENT),Math.cos(a-ENT)));
      if(dd<0.34) continue;           /* проём входа */
      const big=(i%3===0), s=(big?26:15)+R()*8, rr=150+R()*14;
      stone(g,Math.cos(a)*rr,Math.sin(a)*rr*0.84,s,s*0.72,a+R(),R,R());
    }
    /* вход: ступени и две каменные стойки-арка */
    g.save(); g.translate(Math.cos(ENT)*148,Math.sin(ENT)*124); g.rotate(ENT+Math.PI/2);
    for(let s=0;s<4;s++){ g.fillStyle='hsl(24,8%,'+(30-s*4)+'%)'; g.fillRect(-26+s*2,-s*7,52-s*4,8); g.fillStyle='rgba(255,230,200,0.15)'; g.fillRect(-26+s*2,-s*7,52-s*4,2); g.strokeStyle='rgba(0,0,0,0.6)'; g.strokeRect(-26+s*2,-s*7,52-s*4,8); }
    for(const sx of [-1,1]){
      const px=sx*38; g.fillStyle='rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(px+4,-8,12,6,0,0,Math.PI*2); g.fill();
      const pg=g.createLinearGradient(px-10,0,px+10,0); pg.addColorStop(0,'#6f6055'); pg.addColorStop(0.5,'#4a3d35'); pg.addColorStop(1,'#241b17');
      g.fillStyle=pg; g.fillRect(px-9,-58,18,56); g.strokeStyle='#120c09'; g.lineWidth=1.5; g.strokeRect(px-9,-58,18,56);
      g.fillStyle='#8a796a'; g.fillRect(px-12,-64,24,8); g.strokeRect(px-12,-64,24,8);
      g.strokeStyle='rgba(0,0,0,0.55)'; g.beginPath(); g.moveTo(px-3,-50); g.lineTo(px+2,-36); g.lineTo(px-2,-22); g.stroke();
    }
    g.restore();
    /* кости и черепа */
    g.strokeStyle='#6a5c4a'; g.lineWidth=1.2;
    for(const b of [[-70,50,0.6],[60,56,-0.3],[-40,-62,1.2],[78,-34,0.2],[10,70,0.1]]){
      g.save(); g.translate(b[0],b[1]); g.rotate(b[2]); g.fillStyle='rgba(0,0,0,0.3)'; g.fillRect(-15,0,32,6);
      g.fillStyle='#e8dcc0'; g.fillRect(-16,-3,32,6); g.beginPath(); g.arc(-16,0,5,0,6.3); g.arc(16,0,5,0,6.3); g.fill(); g.restore();
    }
    g.fillStyle='#e8dcc0'; g.strokeStyle='#5c4e3c'; g.beginPath(); g.ellipse(-92,-20,11,9,0,0,6.3); g.fill(); g.stroke();
    g.fillStyle='#120806'; g.beginPath(); g.arc(-95,-21,2.4,0,6.3); g.arc(-88,-21,2.4,0,6.3); g.fill();
    /* жаровни по сторонам (база; пламя — динамика) */
    for(const p of BRAZIERS){
      g.fillStyle='rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(p[0]+3,p[1]+6,13,5,0,0,6.3); g.fill();
      g.fillStyle='#3b2f28'; g.beginPath(); g.moveTo(p[0]-9,p[1]+4); g.lineTo(p[0]-12,p[1]-8); g.lineTo(p[0]+12,p[1]-8); g.lineTo(p[0]+9,p[1]+4); g.closePath(); g.fill(); g.strokeStyle='#14100d'; g.lineWidth=1.5; g.stroke();
      g.fillStyle='#ff7a2a'; g.beginPath(); g.ellipse(p[0],p[1]-8,10,4,0,0,6.3); g.fill();
    }
    return c;
  }
  const BRAZIERS=[[-120,-84],[120,-84],[-126,88],[126,88]];

  function drawLair(g,L,t,cam){
    if(!lairCache) lairCache=buildLair();
    const Q=q();
    g.save(); g.translate(L.x,L.y);
    g.drawImage(lairCache,-CW/2,-CH/2);
    if(Q.rich){
      /* пульсирующее свечение печати и пламя жаровен (additive) */
      const prev=g.globalCompositeOperation; g.globalCompositeOperation='lighter';
      const pulse=0.5+0.5*Math.sin(t*1.7);
      let gr=g.createRadialGradient(0,6,10,0,6,100);
      gr.addColorStop(0,'rgba(255,110,40,'+(0.18+0.10*pulse)+')'); gr.addColorStop(1,'rgba(255,110,40,0)');
      g.fillStyle=gr; g.beginPath(); g.ellipse(0,6,100,78,0,0,6.3); g.fill();
      for(let i=0;i<BRAZIERS.length;i++){
        const p=BRAZIERS[i], fl=0.75+0.25*Math.sin(t*9+i*2.1)+0.1*Math.sin(t*17+i);
        const rg=g.createRadialGradient(p[0],p[1]-12,1,p[0],p[1]-12,46*fl);
        rg.addColorStop(0,'rgba(255,200,110,0.55)'); rg.addColorStop(0.4,'rgba(255,120,40,0.22)'); rg.addColorStop(1,'rgba(255,80,20,0)');
        g.fillStyle=rg; g.beginPath(); g.arc(p[0],p[1]-12,46*fl,0,6.3); g.fill();
        g.fillStyle='rgba(255,170,70,0.9)'; g.beginPath(); g.moveTo(p[0]-7,p[1]-8); g.quadraticCurveTo(p[0]-9+Math.sin(t*8+i)*2,p[1]-22*fl,p[0]+Math.sin(t*6+i)*2,p[1]-30*fl); g.quadraticCurveTo(p[0]+9,p[1]-18*fl,p[0]+7,p[1]-8); g.fill();
        g.fillStyle='rgba(255,240,180,0.9)'; g.beginPath(); g.ellipse(p[0],p[1]-13,3,6*fl,0,0,6.3); g.fill();
      }
      /* лёгкая подсветка входа */
      const ex=Math.cos(ENT)*150, ey=Math.sin(ENT)*126;
      gr=g.createRadialGradient(ex,ey,2,ex,ey,48); gr.addColorStop(0,'rgba(255,160,80,'+(0.12+0.06*pulse)+')'); gr.addColorStop(1,'rgba(255,160,80,0)');
      g.fillStyle=gr; g.beginPath(); g.arc(ex,ey,48,0,6.3); g.fill();
      g.globalCompositeOperation=prev;
    }
    /* искры и дымка (только при частицах) */
    if(Q.parts>0){
      const n=Q.parts*2;
      for(let i=0;i<n;i++){
        const ph=((t*0.35+i/n)%1), b=BRAZIERS[i%4];
        const x=b[0]+Math.sin(t*2+i*3)*8+(i%2?1:-1)*ph*14, y=b[1]-14-ph*70;
        g.globalAlpha=Math.sin(ph*Math.PI)*0.8; g.fillStyle=(i%3)?'#ffb060':'#ffe0a0'; g.fillRect(x-1.2,y-1.2,2.4,2.4);
      }
      if(Q.rich) for(let i=0;i<5;i++){      /* низкий туман */
        const a=t*0.12+i*1.26, x=Math.cos(a)*(70+i*12), y=Math.sin(a*1.3)*(50+i*6)+20;
        g.globalAlpha=0.07+0.03*Math.sin(t+i); g.fillStyle='#b9a99a'; g.beginPath(); g.ellipse(x,y,46,16,a*0.5,0,6.3); g.fill();
      }
      g.globalAlpha=1;
    }
    g.restore();
    drawFx(g,L,t);
  }

  /* ---------- события ---------- */
  function spawn(x,y){ fx.push({k:'spawn',x,y,t:0,max:1.8}); }
  function death(x,y){
    const n=q().parts>0?14:5, ch=[];
    for(let i=0;i<n;i++){ const a=Math.random()*6.28, v=40+Math.random()*90; ch.push({a,v,s:2+Math.random()*4}); }
    fx.push({k:'death',x,y,t:0,max:2.2,chips:ch,seed:Math.random()*9});
  }
  function hit(x,y){
    if(q().parts<=0) return;
    const n=Math.min(5,q().parts), ch=[];
    for(let i=0;i<n;i++){ ch.push({a:Math.random()*6.28,v:30+Math.random()*50,s:1.5+Math.random()*2.5}); }
    fx.push({k:'hit',x,y,t:0,max:0.55,chips:ch});
  }
  function clear(){ fx.length=0; }
  let lastT=0;
  function drawFx(g,L,t){
    const now=performance.now(); const dt=lastT?Math.min(0.1,(now-lastT)/1000):0.016; lastT=now;
    for(let i=fx.length-1;i>=0;i--){
      const e=fx[i]; e.t+=dt; if(e.t>=e.max){ fx.splice(i,1); continue; }
      const k=e.t/e.max;
      g.save(); g.translate(e.x,e.y);
      if(e.k==='spawn'){
        /* трещины пола с огнём, ударная волна и столб света */
        g.globalAlpha=(1-k)*0.9; g.strokeStyle='#ff9a4d'; g.lineWidth=5*(1-k)+1; g.beginPath(); g.ellipse(0,6,40+k*230,30+k*170,0,0,6.3); g.stroke();
        g.globalAlpha=Math.sin(Math.min(1,k*1.6)*Math.PI)*0.55; g.globalCompositeOperation='lighter';
        const lg=g.createLinearGradient(0,-260,0,0); lg.addColorStop(0,'rgba(255,170,80,0)'); lg.addColorStop(1,'rgba(255,170,80,0.8)');
        g.fillStyle=lg; g.fillRect(-46*(1-k*0.5),-260,92*(1-k*0.5),266);
        g.globalCompositeOperation='source-over'; g.globalAlpha=(1-k);
        const R=rnd(77);
        for(let c=0;c<8;c++){ const a=c*0.785+R()*0.4, len=(50+R()*90)*Math.min(1,k*3);
          g.strokeStyle='#ff7a2a'; g.lineWidth=2; g.beginPath(); g.moveTo(0,6); g.lineTo(Math.cos(a)*len*0.5+R()*8,6+Math.sin(a)*len*0.4); g.lineTo(Math.cos(a)*len,6+Math.sin(a)*len*0.8); g.stroke(); }
      } else if(e.k==='death'){
        g.globalAlpha=(1-k)*0.8; g.strokeStyle='#ffd27a'; g.lineWidth=6*(1-k)+1; g.beginPath(); g.ellipse(0,6,30+k*210,22+k*150,0,0,6.3); g.stroke();
        g.globalAlpha=(1-k)*0.5; g.fillStyle='#ff8a3d'; g.beginPath(); g.ellipse(0,0,60*(1-k)+10,44*(1-k)+8,0,0,6.3); g.fill();
        g.globalAlpha=(1-k); g.fillStyle='#8a7766';
        for(const c of e.chips){ const d=c.v*Math.min(1,k*2.2); g.fillRect(Math.cos(c.a)*d-c.s/2,Math.sin(c.a)*d*0.75-c.s/2-Math.sin(k*Math.PI)*40,c.s,c.s); }
        g.globalAlpha=(1-k)*0.35; g.fillStyle='#5a4a40'; g.beginPath(); g.ellipse(0,-k*50,50+k*60,28+k*30,0,0,6.3); g.fill();
      } else {
        g.globalAlpha=(1-k); g.fillStyle='#d8c4a8';
        for(const c of e.chips){ const d=c.v*k; g.fillRect(Math.cos(c.a)*d-c.s/2,Math.sin(c.a)*d*0.8-c.s/2-Math.sin(k*Math.PI)*14,c.s,c.s); }
      }
      g.restore();
    }
    g.globalAlpha=1;
  }

  /* ---------- Рошан: появление и вспышка урона (вызывается из drawRoshanBody) ---------- */
  function bodyState(u){
    if(u._rvHp===undefined) u._rvHp=u.hp;
    let dmg=u._rvHp-u.hp;
    if(dmg>1 && !u.dead){ u._rvFlash=1; hit(u.x,u.y); }
    u._rvHp=u.hp;
    const now=performance.now();
    if(u._rvFlash>0){ const dt=u._rvLast?Math.min(0.1,(now-u._rvLast)/1000):0.016; u._rvFlash=Math.max(0,u._rvFlash-dt*4); }
    u._rvLast=now;
    if(u._rvBorn===undefined) u._rvBorn=now;
    if(u.dead){ u._rvBorn=undefined; }
    const emerge=u._rvBorn===undefined?1:Math.min(1,(now-u._rvBorn)/1400);
    return {flash:u._rvFlash||0, emerge:1-Math.pow(1-emerge,3)};
  }
  function resetBorn(u){ if(u) u._rvBorn=performance.now(); }

  /* ---------- индикатор здоровья (заменяет полоску Рошана в общем коде, без дубликата) ---------- */
  function drawBar(g,u,x,y,w){
    const pct=Math.max(0,Math.min(1,u.hp/u.maxHp)), h=12, now=performance.now();
    if(u._rvTrail===undefined) u._rvTrail=pct;
    if(u._rvTrail>pct) u._rvTrail=Math.max(pct,u._rvTrail-0.0025*(u._rvTrail-pct>0.2?3:1)); else u._rvTrail=pct;
    g.save();
    g.fillStyle='rgba(10,6,4,0.88)'; g.fillRect(x-3,y-3,w+6,h+6);
    /* заливка */
    const gr=g.createLinearGradient(0,y,0,y+h);
    const low=pct<0.3;
    gr.addColorStop(0,low?'#ff8a5c':'#ffd27a'); gr.addColorStop(0.5,low?'#d8321f':'#ff8a3d'); gr.addColorStop(1,low?'#7a1208':'#a8481a');
    g.fillStyle='rgba(255,255,255,0.75)'; g.fillRect(x,y,w*u._rvTrail,h);      /* след потерянного здоровья */
    g.fillStyle=gr; g.fillRect(x,y,w*pct,h);
    g.fillStyle='rgba(255,255,255,0.22)'; g.fillRect(x,y,w*pct,3);
    if(low && q().glow){ g.globalAlpha=0.35+0.25*Math.sin(now/120); g.fillStyle='#ff3a20'; g.fillRect(x,y,w*pct,h); g.globalAlpha=1; }
    /* деления по 10% */
    g.strokeStyle='rgba(0,0,0,0.55)'; g.lineWidth=1; g.beginPath();
    for(let i=1;i<10;i++){ g.moveTo(x+w*i/10,y); g.lineTo(x+w*i/10,y+h); } g.stroke();
    /* каменная рамка с угловыми шипами */
    g.strokeStyle='#8a796a'; g.lineWidth=2; g.strokeRect(x-3,y-3,w+6,h+6);
    g.strokeStyle='rgba(0,0,0,0.6)'; g.lineWidth=1; g.strokeRect(x-1.5,y-1.5,w+3,h+3);
    g.fillStyle='#b9a894';
    for(const [cx,cy] of [[x-3,y-3],[x+w+3,y-3],[x-3,y+h+3],[x+w+3,y+h+3]]){ g.beginPath(); g.arc(cx,cy,3,0,6.3); g.fill(); }
    /* значение */
    g.font='bold 10px Segoe UI, Arial'; g.textAlign='center'; g.fillStyle='#fff'; g.shadowColor='#000'; g.shadowBlur=3;
    g.fillText(Math.ceil(u.hp)+' / '+Math.ceil(u.maxHp),x+w/2,y+h-2);
    g.restore();
  }
  return {drawLair,drawBar,spawn,death,hit,bodyState,resetBorn,clear};
})();
