/* Визуал рун 0.9.8.3: символы, свечение, пульсация, появление, подбор, площадка. Только рисование — механики рун остаются в game.js. */
const RuneVisuals = (function(){
  const bursts = [];   /* короткие анимации подбора */
  const sparks = [];   /* лёгкие частицы вокруг рун */
  const STYLE = {
    doubleDamage:{c2:'#ffb199', dark:'#5a0f12'},
    haste:{c2:'#fff6b8', dark:'#5a4608'},
    regen:{c2:'#c8ffe0', dark:'#0f4a2c'}
  };
  function quality(){
    const perf = (typeof perfLevel!=='undefined') ? perfLevel : 0;
    const glow = (typeof GFX!=='undefined') ? GFX.glow : 2;
    const part = (typeof GFX!=='undefined') ? GFX.particles : 2;
    return {glow: perf<2 && glow>0, rich: perf<2, sparkMax: perf>=3 ? 0 : [3,6,10][part]|0};
  }
  function glyph(g,type,s){
    g.beginPath();
    if(type==='doubleDamage'){          /* два скрещённых клинка */
      for(const d of [-1,1]){ g.moveTo(-s*0.7*d,s*0.75); g.lineTo(s*0.62*d,-s*0.78); g.moveTo(-s*0.38*d,s*0.5); g.lineTo(-s*0.05*d,s*0.2); }
      g.moveTo(-s*0.42,s*0.52); g.lineTo(-s*0.18,s*0.8); g.moveTo(s*0.42,s*0.52); g.lineTo(s*0.18,s*0.8);
    } else if(type==='haste'){          /* молния-стрела */
      g.moveTo(s*0.28,-s*0.85); g.lineTo(-s*0.5,s*0.1); g.lineTo(-s*0.02,s*0.1); g.lineTo(-s*0.28,s*0.85); g.lineTo(s*0.52,-s*0.15); g.lineTo(s*0.04,-s*0.15); g.closePath();
    } else {                            /* крест-росток */
      g.moveTo(0,-s*0.75); g.lineTo(0,s*0.75); g.moveTo(-s*0.75,0); g.lineTo(s*0.75,0);
      g.moveTo(0,-s*0.1); g.quadraticCurveTo(s*0.6,-s*0.2,s*0.5,-s*0.7); g.quadraticCurveTo(s*0.05,-s*0.55,0,-s*0.1);
    }
  }
  /* Площадка: тёмный диск, каменное кольцо с насечками и лёгкое свечение. rune может быть null (спот пуст). */
  function drawPad(g,x,y,rune,t){
    const q=quality(), col = rune ? rune.color : '#9aa7b8';
    g.save(); g.translate(x,y);
    g.fillStyle='rgba(8,10,14,0.35)'; g.beginPath(); g.ellipse(0,2,46,34,0,0,Math.PI*2); g.fill();
    g.strokeStyle='rgba(190,180,160,0.38)'; g.lineWidth=3; g.beginPath(); g.ellipse(0,2,44,32,0,0,Math.PI*2); g.stroke();
    g.strokeStyle='rgba(0,0,0,0.35)'; g.lineWidth=1; g.beginPath(); g.ellipse(0,2,38,27,0,0,Math.PI*2); g.stroke();
    g.fillStyle='rgba(205,195,170,0.45)';
    for(let i=0;i<8;i++){ const a=i*Math.PI/4+Math.PI/8; g.fillRect(Math.cos(a)*41-2,Math.sin(a)*29+2-2,4,4); }
    if(rune){
      g.globalAlpha=0.28+Math.sin(t*3)*0.08; g.strokeStyle=col; g.lineWidth=2;
      g.setLineDash([6,8]); g.lineDashOffset=-t*14;
      g.beginPath(); g.ellipse(0,2,32,22,0,0,Math.PI*2); g.stroke(); g.setLineDash([]);
      if(q.rich){
        const gr=g.createRadialGradient(0,2,2,0,2,40);
        gr.addColorStop(0,col); gr.addColorStop(1,'rgba(0,0,0,0)');
        g.globalAlpha=0.18+Math.sin(t*3)*0.05; g.fillStyle=gr; g.beginPath(); g.ellipse(0,2,40,29,0,0,Math.PI*2); g.fill();
      }
    }
    g.restore();
  }
  let lastT=0;
  function draw(g,runes,spots){
    const nowMs=performance.now(); const dt=lastT?Math.min(0.1,(nowMs-lastT)/1000):0.016; lastT=nowMs;
    const q=quality(), now=(typeof gameTime!=='undefined')?gameTime:0;
    if(spots) for(const sp of spots){
      const r = runes.find(u=>Math.hypot(u.x-sp.x,u.y-sp.y)<20) || null;
      drawPad(g,sp.x,sp.y,r,now);
    }
    for(const rune of runes){
      const st=STYLE[rune.type]||STYLE.regen, age=rune.age||0, t=rune.pulse||0;
      const appear=Math.min(1,age/0.9), ease=1-Math.pow(1-appear,3);
      const bob=Math.sin(t*2.4)*3-14*ease, pulse=1+Math.sin(t*4)*0.07;
      g.save(); g.translate(rune.x,rune.y);
      /* тень на земле */
      g.fillStyle='rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(0,6,13*ease,5*ease,0,0,Math.PI*2); g.fill();
      /* лучи появления: расширяющееся кольцо и вспышка */
      if(age<0.9){
        const k=age/0.9; g.globalAlpha=(1-k)*0.9; g.strokeStyle=rune.color; g.lineWidth=3*(1-k)+1;
        g.beginPath(); g.ellipse(0,4,12+k*50,8+k*34,0,0,Math.PI*2); g.stroke();
        g.globalAlpha=(1-k)*0.6; g.fillStyle=st.c2; g.fillRect(-2,-90*(1-k)*0.9+bob,4,90*(1-k)*0.9);
      }
      g.globalAlpha=Math.min(1,appear*1.4);
      g.translate(0,bob); g.scale(pulse*(0.4+0.6*ease),pulse*(0.4+0.6*ease));
      if(q.glow){ g.shadowColor=rune.color; g.shadowBlur=20+Math.sin(t*4)*6; }
      /* орб */
      const gr=g.createRadialGradient(-5,-6,1,0,0,20);
      gr.addColorStop(0,st.c2); gr.addColorStop(0.5,rune.color); gr.addColorStop(1,st.dark);
      g.fillStyle=gr; g.beginPath(); g.arc(0,0,17,0,Math.PI*2); g.fill();
      g.shadowBlur=0;
      g.strokeStyle='rgba(255,255,255,0.7)'; g.lineWidth=1.5; g.beginPath(); g.arc(0,0,17,0,Math.PI*2); g.stroke();
      /* вращающееся внешнее кольцо с метками */
      g.save(); g.rotate(t*0.9); g.strokeStyle=rune.color; g.globalAlpha*=0.8; g.lineWidth=1.5;
      g.setLineDash([3,6]); g.beginPath(); g.arc(0,0,23,0,Math.PI*2); g.stroke(); g.setLineDash([]); g.restore();
      /* символ */
      g.strokeStyle='#ffffff'; g.fillStyle='rgba(255,255,255,0.92)'; g.lineWidth=2.2; g.lineCap='round'; g.lineJoin='round';
      glyph(g,rune.type,9);
      if(rune.type==='haste') g.fill(); else g.stroke();
      g.restore();
      /* частицы-искры */
      if(q.sparkMax>0 && sparks.length<q.sparkMax*2 && Math.random()<dt*q.sparkMax*0.8){
        sparks.push({x:rune.x+(Math.random()-0.5)*26,y:rune.y-6,vx:(Math.random()-0.5)*10,vy:-18-Math.random()*16,life:0.9,max:0.9,c:rune.color});
      }
    }
    /* искры и подбор */
    for(let i=sparks.length-1;i>=0;i--){
      const p=sparks[i]; p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
      if(p.life<=0){ sparks.splice(i,1); continue; }
      g.globalAlpha=p.life/p.max; g.fillStyle=p.c; g.fillRect(p.x-1.2,p.y-1.2,2.4,2.4);
    }
    for(let i=bursts.length-1;i>=0;i--){
      const b=bursts[i]; b.t+=dt;
      if(b.t>=b.max){ bursts.splice(i,1); continue; }
      const k=b.t/b.max;
      g.save(); g.translate(b.x,b.y);
      g.globalAlpha=(1-k)*0.85; g.strokeStyle=b.c; g.lineWidth=4*(1-k)+1;
      g.beginPath(); g.arc(0,-10,16+k*58,0,Math.PI*2); g.stroke();
      g.globalAlpha=(1-k); g.fillStyle='#fff'; g.beginPath(); g.arc(0,-14-k*30,Math.max(0,14*(1-k)),0,Math.PI*2); g.fill();
      g.fillStyle=b.c;
      for(const s of b.sparks){ g.fillRect(s.dx*k*60-1.5,s.dy*k*60-10-1.5,3,3); }
      g.restore();
    }
    g.globalAlpha=1;
  }
  function pickup(x,y,color){
    const n=quality().sparkMax>0?10:4, s=[];
    for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; s.push({dx:Math.cos(a),dy:Math.sin(a)*0.7}); }
    bursts.push({x,y,c:color,t:0,max:0.55,sparks:s});
  }
  function clear(){ bursts.length=0; sparks.length=0; }
  return {draw,pickup,clear};
})();
