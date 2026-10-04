/* =========================================================
   Hero3D — мини-3D движок на canvas 2D (без библиотек)
   Каждому бойцу своя трёхмерная модель из примитивов:
   боксы, эллипсоиды, трубы/конусы. Модель можно вертеть
   по двум осям. Вызов: Hero3D.draw(ctx, def, x, y, w, h, o)
   o = {yaw, pitch, zoom, t}
   ========================================================= */
(function(){
'use strict';
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const add=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const mul=(a,k)=>[a[0]*k,a[1]*k,a[2]*k];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const len=a=>Math.hypot(a[0],a[1],a[2]);
const norm=a=>{const l=len(a)||1;return [a[0]/l,a[1]/l,a[2]/l];};
const lerp=(a,b,k)=>[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];
const colCache={};
function rgb(c){
  if(colCache[c]) return colCache[c];
  let h=c.replace('#',''); if(h.length===3) h=h.split('').map(x=>x+x).join('');
  const v=[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  return colCache[c]=v;
}
function rotEuler(p,r){
  let [x,y,z]=p;
  if(r[2]){const c=Math.cos(r[2]),s=Math.sin(r[2]);[x,y]=[x*c-y*s,x*s+y*c];}
  if(r[0]){const c=Math.cos(r[0]),s=Math.sin(r[0]);[y,z]=[y*c-z*s,y*s+z*c];}
  if(r[1]){const c=Math.cos(r[1]),s=Math.sin(r[1]);[x,z]=[x*c+z*s,-x*s+z*c];}
  return [x,y,z];
}
function basisY(dir,hint){
  const y=norm(dir);
  let h=hint||(Math.abs(y[1])>0.95?[1,0,0]:[0,1,0]);
  let x=cross(h,y); if(len(x)<1e-4) x=cross([0,0,1],y);
  x=norm(x); const z=norm(cross(x,y));
  return [x,y,z];
}

/* ---------- Сцена ---------- */
class Scene{
  constructor(){ this.faces=[]; this.pre=[]; this.sc=1; this.target=this.faces; }
  face(pts,center,color,glow){
    const k=this.sc;
    const P=pts.map(p=>[p[0]*k,p[1]*k,p[2]*k]);
    this.target.push({p:P,c:[center[0]*k,center[1]*k,center[2]*k],col:rgb(color),glow:!!glow});
  }
  box(c,s,color,o){
    o=o||{}; const r=o.rot||[0,0,0];
    const hx=s[0]/2,hy=s[1]/2,hz=s[2]/2;
    const v=[[-hx,-hy,-hz],[hx,-hy,-hz],[hx,hy,-hz],[-hx,hy,-hz],[-hx,-hy,hz],[hx,-hy,hz],[hx,hy,hz],[-hx,hy,hz]]
      .map(p=>add(rotEuler(p,r),c));
    const F=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];
    for(const f of F) this.face(f.map(i=>v[i]),c,color,o.glow);
  }
  obox(a,b,w,t,color,o){
    o=o||{}; const d=sub(b,a); const [bx,by,bz]=basisY(d,o.hint);
    const L=len(d), c=lerp(a,b,.5);
    const loc=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]
      .map(p=>add(c,add(add(mul(bx,p[0]*w),mul(by,p[1]*L)),mul(bz,p[2]*t))));
    const F=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];
    for(const f of F) this.face(f.map(i=>loc[i]),c,color,o.glow);
  }
  tube(a,b,r1,r2,color,o){
    o=o||{}; const n=o.seg||10; const d=sub(b,a); const [bx,by,bz]=basisY(d);
    const c=lerp(a,b,.5);
    const ra=[],rb=[];
    for(let i=0;i<n;i++){
      const ang=i/n*Math.PI*2, dx=Math.cos(ang), dz=Math.sin(ang);
      const off=add(mul(bx,dx),mul(bz,dz));
      ra.push(add(a,mul(off,r1))); rb.push(add(b,mul(off,r2)));
    }
    for(let i=0;i<n;i++){
      const j=(i+1)%n;
      this.face([ra[i],ra[j],rb[j],rb[i]],c,color,o.glow);
    }
    if(r1>0.001) this.face(ra.slice().reverse(),c,color,o.glow);
    if(r2>0.001) this.face(rb,c,color,o.glow);
  }
  cone(base,tip,r,color,o){ this.tube(base,tip,r,0,color,o); }
  ell(c,r,color,o){
    o=o||{}; const nr=o.rings||7, ns=o.seg||12, rot=o.rot||[0,0,0];
    const pt=(i,j)=>{
      const th=i/nr*Math.PI, ph=j/ns*Math.PI*2;
      const p=[r[0]*Math.sin(th)*Math.cos(ph), r[1]*Math.cos(th), r[2]*Math.sin(th)*Math.sin(ph)];
      return add(rotEuler(p,rot),c);
    };
    for(let i=0;i<nr;i++) for(let j=0;j<ns;j++){
      const a=pt(i,j), b=pt(i,j+1), d=pt(i+1,j), e=pt(i+1,j+1);
      if(i===0) this.face([a,d,e],c,color,o.glow);
      else if(i===nr-1) this.face([a,b,d],c,color,o.glow);
      else this.face([a,b,e,d],c,color,o.glow);
    }
  }
  ring(c,R,th,color,o){
    o=o||{}; const n=o.n||18, ax=o.axis||'y', ph=o.phase||0;
    const pt=i=>{ const a=i/n*Math.PI*2+ph, u=Math.cos(a)*R, v=Math.sin(a)*R;
      return ax==='y'?[c[0]+u,c[1],c[2]+v]:(ax==='x'?[c[0],c[1]+u,c[2]+v]:[c[0]+u,c[1]+v,c[2]]); };
    for(let i=0;i<n;i++){
      const a=pt(i), b=pt(i+1);
      const tt=ax==='y'?[0,1,0]:[0,0,1];
      this.obox(a,b,th,th,color,{glow:o.glow,hint:tt});
    }
  }
}

/* ---------- Базовый гуманоид ---------- */
function man(S,o){
  const b=o.bulk||1, sk=o.skin||'#e8b894', cl=o.cloth||'#555', lg=o.legs||cl, bt=o.boots||'#2a2a30';
  const gap=(o.gap||.2)*b, hipY=o.hipY||.95, shY=o.shY||1.58, hy=o.headY||2.0;
  for(const s of [-1,1]){
    S.tube([s*gap,.12,0],[s*gap,hipY,0],.13*b,.15*b,lg);
    S.ell([s*gap,.07,.09],[.15*b,.09,.24],bt);
  }
  S.ell([0,1.32,0],[.46*b,.52,.3*b],cl);
  S.box([0,.98,0],[.88*b,.12,.54*b],o.belt||'#3a2a1a');
  S.ell([0,hy,0],[.27*(o.headW||1),.3,.27*(o.headW||1)],sk);
  const hands={};
  for(const s of [-1,1]){
    const key=s>0?'R':'L';
    const sh=[s*.5*b,shY,0];
    const hand=(s>0?o.armR:o.armL)||[s*.62*b,1.0,.12];
    const el=add(lerp(sh,hand,.5),[s*.13,-.12,.1]);
    S.ell(add(sh,[0,0,0]),[.17*b,.15,.17*b],o.pad||cl);
    S.tube(sh,el,.12*b,.1*b,o.arm||cl);
    S.tube(el,hand,.1*b,.085*b,o.forearm||o.arm||sk);
    S.ell(hand,[.1*b,.1*b,.1*b],o.glove||sk);
    hands[key]=hand;
  }
  return hands;
}
function robe(S,rb,rt,h,col,trim){
  S.tube([0,.04,0],[0,h,0],rb,rt,col,{seg:14});
  if(trim) S.tube([0,.04,0],[0,.13,0],rb+.015,rb+.015,trim,{seg:14});
}
function flick(t,k){return Math.sin(t*9+k)*.5+Math.sin(t*14.3+k*2)*.5;}

/* ---------- Модели героев ---------- */
const MODELS={};

MODELS.pyro=(S,d,t)=>{
  const H=man(S,{cloth:'#8a1f10',arm:'#a52d18',armR:[.78,1.4,.38],armL:[-.62,1.55,.55],glove:'#e8b894',skin:'#e8b894'});
  robe(S,.64,.4,1.5,'#a52d18','#ffcf63');
  S.tube([0,1.5,0],[0,1.62,0],.42,.3,'#ffcf63');
  S.ell([0,1.85,.2],[.17,.22,.1],'#e0d8c8');
  S.tube([0,2.2,0],[0,2.27,0],.54,.54,'#5c1006',{seg:14});
  S.cone([0,2.24,0],[0,3.0,-.08],.42,'#7a1608',{seg:12});
  S.tube([.78,0,.38],[.78,2.35,.38],.05,.05,'#5b3a1e');
  const f=flick(t,1)*.04;
  S.ell([.78,2.5,.38],[.2,.24+f,.2],'#ffcf63',{glow:1});
  S.cone([.78,2.55,.38],[.78,3.05+f*2,.38],.13,'#ff762f',{glow:1});
  S.ell([-.62,1.9+flick(t,3)*.03,.6],[.22,.22,.22],'#ff9a3c',{glow:1});
};

MODELS.warlord=(S,d,t)=>{
  const H=man(S,{bulk:1.15,cloth:'#3b7fa8',arm:'#3b7fa8',forearm:'#b9d8e7',pad:'#b9d8e7',armR:[.82,1.35,.4],armL:[-.7,1.1,.25],legs:'#2d4f66',belt:'#d7b36a'});
  S.box([0,1.4,-.4],[.9,1.4,.07],'#8f2730',{rot:[.1,0,0]});
  S.ell([0,2.12,0],[.33,.24,.33],'#b9d8e7');
  S.box([0,2.0,.22],[.3,.1,.05],'#1a2a38');
  S.cone([0,2.3,-.05],[0,2.7,-.35],.09,'#c0392b');
  S.ell([-.58,1.7,0],[.25,.16,.25],'#b9d8e7'); S.ell([.58,1.7,0],[.25,.16,.25],'#b9d8e7');
  S.obox([.82,1.3,.4],[.95,2.9,.5],.16,.045,'#e8f4ff');
  S.box([.82,1.32,.4],[.5,.07,.12],'#d7b36a'); S.ell([.8,1.15,.38],[.08,.08,.08],'#d7b36a');
  S.box([-.78,1.1,.3],[.05,.9,.7],'#b9d8e7',{rot:[0,0,.15]});
};

MODELS.grisha=(S,d,t)=>{
  man(S,{cloth:'#4a2a8a',armR:[.7,1.9,.3],armL:[-.7,1.9,.3],glove:'#e8b894'});
  robe(S,.62,.42,1.55,'#4a2a8a','#e0c8ff');
  S.cone([0,2.0,-.12],[0,2.78,-.22],.38,'#27184e');
  S.ell([0,1.99,-.05],[.3,.32,.3],'#27184e');
  S.ell([0,1.98,.1],[.2,.22,.18],'#e8b894');
  const cs=['#75d8ff','#e58bff','#ffcf65'];
  cs.forEach((c,i)=>{const a=t*1.8+i*2.094; S.ell([Math.cos(a)*.95,1.65+Math.sin(t*2+i)*.12,Math.sin(a)*.95],[.16,.16,.16],c,{glow:1});});
};

MODELS.golly=(S,d,t)=>{
  man(S,{cloth:'#174d78',skin:'#cfe8f3',armR:[.75,1.4,.4],armL:[-.65,1.35,.45],glove:'#cfe8f3'});
  robe(S,.62,.42,1.55,'#174d78','#bfefff');
  for(let i=0;i<5;i++){const a=-.9+i*.45; S.cone([Math.sin(a)*.2,2.22,Math.cos(a)*.12-.02],[Math.sin(a)*.3,2.62+(i%2)*.18,Math.cos(a)*.1-.02],.07,'#d9f7ff');}
  for(const s of [-1,1]) S.cone([s*.5,1.7,0],[s*.78,2.05,0],.1,'#bfefff');
  S.tube([.75,0,.4],[.75,2.2,.4],.05,.05,'#6fb4d6');
  S.cone([.75,2.1,.4],[.75,2.75,.4],.15,'#d9f7ff',{glow:1}); S.cone([.75,2.1,.4],[.75,1.7,.4],.12,'#d9f7ff',{glow:1});
  for(let i=0;i<6;i++){const a=t*.9+i*1.047,R=1.25; const p=[Math.cos(a)*R,1.4+Math.sin(t*1.5+i)*.18,Math.sin(a)*R];
    S.cone(p,add(p,[Math.cos(a)*.3,.35,Math.sin(a)*.3]),.08,'#bfefff',{glow:1});}
};

MODELS.sasych=(S,d,t)=>{
  man(S,{cloth:'#310d1b',arm:'#4a1226',skin:'#c9b3b8',armR:[.85,1.25,.45],armL:[-.85,1.25,.45],glove:'#9d1d35',legs:'#240912',bulk:.95});
  robe(S,.5,.38,1.3,'#310d1b','#9d1d35');
  S.cone([0,2.0,-.1],[0,2.75,-.2],.36,'#240912');
  S.ell([0,2.0,-.04],[.31,.33,.31],'#240912');
  S.ell([0,1.97,.12],[.2,.22,.15],'#c9b3b8');
  S.ell([-.09,1.99,.25],[.05,.04,.03],'#ff5368',{glow:1,rings:4,seg:6}); S.ell([.09,1.99,.25],[.05,.04,.03],'#ff5368',{glow:1,rings:4,seg:6});
  for(const s of [-1,1]){
    S.obox([s*.85,1.25,.45],[s*1.2,2.05,.75],.12,.035,'#e9bfd0');
    S.obox([s*.85,1.25,.45],[s*1.05,1.0,.35],.1,.035,'#9d1d35',{glow:1});
    S.cone([s*.52,1.65,0],[s*.7,2.05,-.05],.08,'#9d1d35');
  }
};

MODELS.ilya=(S,d,t)=>{
  man(S,{bulk:1.5,gap:.22,hipY:.8,cloth:'#6c9b58',skin:'#c8ef8d',headY:1.95,shY:1.5,armR:[.95,1.0,.3],armL:[-.95,1.0,.3],glove:'#c8ef8d',belt:'#3a5a2a'});
  S.ell([0,1.15,.14],[.92,.82,.7],'#6c9b58',{rings:9,seg:14});
  S.ell([0,.95,.7],[.18,.12,.05],'#557f48',{rings:5,seg:8});
  S.box([0,1.12,.78],[.28,.14,.03],'#ffd568');
  S.ell([0,2.0,0],[.3,.3,.3],'#c8ef8d');
  S.ell([-.1,2.02,.25],[.04,.04,.03],'#1a2a10',{rings:4,seg:6}); S.ell([.1,2.02,.25],[.04,.04,.03],'#1a2a10',{rings:4,seg:6});
  S.ring([0,1.1,0],1.5,.07,'#8dff79',{glow:1,phase:t*.8,n:22});
  S.ring([0,1.1,0],1.7+Math.sin(t*2)*.05,.04,'#c8ef8d',{glow:1,phase:-t*.6,n:22});
};

MODELS.malit=(S,d,t)=>{
  man(S,{bulk:1.3,cloth:'#b97952',pad:'#4f2b26',arm:'#b97952',glove:'#4f2b26',legs:'#6a4630',armR:[.95,1.2,.4],armL:[-.8,1.15,.3],belt:'#e4b16f'});
  S.ell([0,2.08,0],[.32,.26,.32],'#4f2b26');
  S.box([0,2.0,.25],[.34,.1,.06],'#f0c69a',{glow:1});
  S.box([0,1.45,-.5],[.78,1.0,.4],'#4f2b26');
  S.tube([-.2,1.9,-.5],[-.2,2.6,-.5],.07,.07,'#e4b16f'); S.tube([.2,1.9,-.5],[.2,2.6,-.5],.07,.07,'#e4b16f');
  S.tube([.7,1.85,.1],[.7,2.0,1.1],.1,.1,'#e7c27e'); S.ell([.7,2.0,1.1],[.1,.1,.06],'#ff6a4a',{glow:1,rings:4,seg:8});
  S.tube([.95,.5,.4],[1.1,2.0,.45],.07,.07,'#e4b16f'); S.box([1.1,2.05,.45],[.4,.28,.22],'#8a8a8a');
};

MODELS.arcady=(S,d,t)=>{
  man(S,{cloth:'#2a2f3a',arm:'#2a2f3a',glove:'#ef5b32',armR:[.55,1.3,.7],armL:[-.35,1.3,.95],legs:'#1d2129',belt:'#ef5b32'});
  S.box([.0,1.35,.33],[.6,.7,.06],'#ef5b32',{rot:[0,0,0]});
  for(const s of [-1,1]){ S.ell([s*.12,2.1,.2],[.1,.08,.07],'#17202b'); S.ell([s*.12,2.1,.26],[.065,.05,.03],'#ffd08a',{glow:1,rings:4,seg:8}); }
  S.box([0,2.1,0],[.62,.05,.5],'#17202b');
  for(let i=0;i<4;i++){const f=flick(t,i)*.06; S.cone([(i-1.5)*.1,2.25,0],[(i-1.5)*.1,2.65+(i%2)*.15+f,-.1],.09,'#ef5b32',{glow:1});}
  S.tube([.3,1.25,.2],[.3,1.35,1.45],.06,.05,'#ff8a5e'); S.box([.3,1.2,.4],[.1,.3,.5],'#3b2a22');
  S.ell([.3,1.35,1.5],[.06,.06,.05],'#ffd08a',{glow:1,rings:4,seg:8});
  for(let i=0;i<3;i++) S.tube([-.25+i*.1,.85,.28],[-.25+i*.1,1.15,.28],.04,.04,'#c0392b');
};

MODELS.illusionist=(S,d,t)=>{
  man(S,{cloth:'#0e5461',armR:[.65,1.55,.45],armL:[-.65,1.55,.45],glove:'#eadbff'});
  robe(S,.6,.45,1.55,'#0e5461','#79e4e4');
  S.ell([0,1.99,.1],[.24,.27,.18],'#eadbff');
  S.ell([-.08,2.02,.27],[.045,.03,.02],'#0e5461',{rings:4,seg:6}); S.ell([.08,2.02,.27],[.045,.03,.02],'#0e5461',{rings:4,seg:6});
  S.tube([0,2.22,0],[0,2.27,0],.4,.4,'#11323a'); S.tube([0,2.24,0],[0,2.85,0],.27,.27,'#11323a'); S.tube([0,2.3,0],[0,2.42,0],.275,.275,'#79e4e4',{glow:1});
  for(let i=0;i<4;i++){const a=t*1.1+i*Math.PI/2; S.box([Math.cos(a)*1.2,1.55+Math.sin(t*1.3+i)*.1,Math.sin(a)*1.2],[.55,.9,.04],'#79e4e4',{glow:1,rot:[0,-a+Math.PI/2,0]});}
};

MODELS.shadow=(S,d,t)=>{
  man(S,{bulk:1.1,cloth:'#110507',skin:'#2a0a10',arm:'#1a0709',glove:'#2a0a10',armR:[.85,1.1,.5],armL:[-.85,1.1,.5],legs:'#08030b',belt:'#ff4b24',headW:1.1});
  for(const s of [-1,1]){
    S.cone([s*.12,2.2,.0],[s*.28,2.85,-.1],.09,'#08030b');
    S.ell([s*.1,2.04,.24],[.07,.05,.03],'#ff4b24',{glow:1,rings:4,seg:6});
    for(let k=0;k<3;k++) S.cone([s*(.85+k*.03),1.1-.04*k,.5+k*.04],[s*(.95+k*.07),.9-.16*k,.75+k*.06],.035,'#ff4b24',{glow:1,seg:5});
    S.cone([s*.5,1.7,-.05],[s*.78,2.3,-.15],.12,'#08030b');
    S.box([s*.5,1.55,-.5],[.07,1.5,.9],'#08030b',{rot:[0.2,s*.5,s*.3]});
  }
  for(let i=0;i<7;i++){const a=i*.9, f=flick(t,i); S.cone([Math.sin(a)*.4,1.7,-.2+Math.cos(a)*.2],[Math.sin(a)*.5,2.3+.2*f+(i%3)*.12,-.2+Math.cos(a)*.3],.07,'#ff4b24',{glow:1,seg:6});}
  for(let i=0;i<5;i++){const a=t*1.5+i*1.257; S.ell([Math.cos(a)*1.05,1.3+Math.sin(t*2+i)*.2,Math.sin(a)*1.05],[.09,.09,.09],'#ff7043',{glow:1,rings:5,seg:8});}
};

MODELS.electricGosha=(S,d,t)=>{
  const hands=man(S,{cloth:'#237aa3',arm:'#237aa3',glove:'#7feaff',armR:[.5,1.5,.8],armL:[-.5,1.5,.8],legs:'#174e68',belt:'#7feaff'});
  for(let i=0;i<8;i++){const a=-1.1+i*.31, hgt=.32+(i%3)*.1; S.cone([Math.sin(a)*.22,2.2+Math.cos(a)*.05,-.02],[Math.sin(a)*.45,2.2+hgt+.2,-.02],.07,'#7feaff',{glow:1,seg:5});}
  for(const s of [-1,1]){ S.ell([s*.1,2.03,.25],[.05,.04,.03],'#e8ffff',{glow:1,rings:4,seg:6});
    const p0=[s*.5,1.55,0], p1=[s*.75,1.9,.2], p2=[s*.55,1.6,.45], p3=[s*.5,1.5,.8];
    S.tube(p0,p1,.035,.035,'#b9f8ff',{glow:1,seg:5}); S.tube(p1,p2,.035,.035,'#b9f8ff',{glow:1,seg:5}); S.tube(p2,p3,.035,.035,'#b9f8ff',{glow:1,seg:5}); }
  const c=[0,1.55,1.0]; S.ell(c,[.26,.26,.26],'#b9f8ff',{glow:1,rings:6,seg:10});
  for(let i=0;i<6;i++){const a=t*3+i*1.047, b=t*2+i; const dir=norm([Math.cos(a),Math.sin(b),Math.sin(a)]); S.cone(add(c,mul(dir,.2)),add(c,mul(dir,.55+.1*flick(t,i))),.05,'#7feaff',{glow:1,seg:5});}
};

MODELS.mo3gi=(S,d,t)=>{
  man(S,{bulk:1.1,cloth:'#294638',arm:'#294638',glove:'#1e3328',legs:'#223a2d',boots:'#161c18',belt:'#3a4a3c',armR:[.4,1.25,.75],armL:[-.3,1.3,.95]});
  S.box([0,1.4,.12],[.8,.7,.42],'#3a4a3c'); S.box([-.15,1.3,.35],[.2,.25,.06],'#1e3328'); S.box([.15,1.3,.35],[.2,.25,.06],'#1e3328');
  S.ell([0,2.1,0],[.32,.24,.32],'#1e3328'); S.box([0,2.02,.26],[.3,.07,.05],'#7dffb0',{glow:1});
  S.box([0,1.5,-.45],[.7,.9,.3],'#1e3328'); S.tube([.2,1.95,-.45],[.2,2.5,-.45],.03,.03,'#7dffb0',{glow:1,seg:5});
  S.box([.25,1.25,.2],[.12,.22,.7],'#222'); S.tube([.25,1.3,.5],[.25,1.35,1.5],.05,.05,'#222'); S.box([.25,1.42,.8],[.07,.1,.3],'#444');
  const by=2.45+Math.sin(t*2)*.08, c=[1.05,by,.25];
  S.box(c,[.3,.1,.3],'#7dffb0',{glow:1});
  for(const [dx,dz] of [[1,1],[-1,1],[1,-1],[-1,-1]]){ const p=[c[0]+dx*.22,c[1]+.04,c[2]+dz*.22]; S.tube(c,p,.015,.015,'#444',{seg:4}); S.tube(add(p,[0,.01,0]),add(p,[Math.cos(t*30)*.16,.01,Math.sin(t*30)*.16]),.012,.012,'#9aa',{seg:4}); }
};

MODELS.tribupainer=(S,d,t)=>{
  man(S,{bulk:1.1,cloth:'#4a3028',arm:'#4a3028',glove:'#2c1b15',legs:'#2c1b15',armR:[.45,1.2,.6],armL:[-.15,1.3,1.1]});
  robe(S,.58,.5,1.4,'#4a3028','#ffb36b');
  S.tube([0,2.22,0],[0,2.28,0],.6,.6,'#2c1b15',{seg:14}); S.tube([0,2.25,0],[0,2.62,0],.3,.28,'#2c1b15',{seg:12});
  S.tube([0,2.3,0],[0,2.38,0],.31,.31,'#ffb36b');
  for(const s of [-1,1]){ S.tube([.45+s*.06,1.3,.1],[.45+s*.06,1.34,2.2],.06,.06,'#8a8a8a'); S.ell([.45+s*.06,1.34,2.22],[.07,.07,.05],'#ffb36b',{glow:1,rings:4,seg:8}); }
  S.box([.45,1.28,1.1],[.22,.16,.8],'#6b4423'); S.box([.45,1.2,-.15],[.18,.3,.7],'#6b4423',{rot:[-.2,0,0]});
};

MODELS.mageHunter=(S,d,t)=>{
  man(S,{cloth:'#24184d',arm:'#24184d',glove:'#a980ff',armR:[.8,1.2,.55],armL:[-.8,1.2,.55],legs:'#160f33'});
  robe(S,.52,.4,1.35,'#24184d','#a980ff');
  S.box([0,1.35,-.4],[.8,1.4,.06],'#160f33',{rot:[.12,0,0]});
  S.cone([0,2.0,-.1],[0,2.7,-.2],.36,'#160f33'); S.ell([0,2.0,-.04],[.31,.33,.31],'#160f33');
  S.ell([0,1.97,.1],[.2,.22,.15],'#2a1a50');
  S.ell([-.09,1.99,.23],[.055,.04,.03],'#d58cff',{glow:1,rings:4,seg:6}); S.ell([.09,1.99,.23],[.055,.04,.03],'#d58cff',{glow:1,rings:4,seg:6});
  for(const s of [-1,1]) S.obox([s*.8,1.2,.55],[s*1.05,1.8,.9],.1,.03,'#d58cff',{glow:1});
};

MODELS.regina=(S,d,t)=>{
  const red=d.skinId==='reginaRed';
  const hair=red?'#641126':'#3a1a2a', cloth=red?'#5b101e':'#6e3048', acc=red?'#ff4058':'#ff9fbd';
  man(S,{bulk:.9,cloth:cloth,arm:cloth,glove:'#e9b39e',skin:'#e9b39e',armR:[.8,1.3,.6],armL:[-.8,1.3,.6],legs:'#2a1520',belt:acc});
  S.tube([0,.7,0],[0,1.05,0],.55,.3,cloth,{seg:12});
  S.ell([0,2.05,-.04],[.31,.33,.3],hair);
  S.ell([0,1.98,.1],[.22,.25,.17],'#e9b39e');
  for(const s of [-1,1]){ S.ell([s*.35,1.7,-.1],[.1,.4,.1],hair); S.ell([s*.09,1.99,.24],[.045,.04,.03],'#fff0f5',{rings:4,seg:6}); S.obox([s*.8,1.3,.6],[s*1.0,1.95,.95],.1,.03,acc,{glow:1}); }
};

MODELS.yosyp=(S,d,t)=>{
  man(S,{bulk:1.15,cloth:'#42612d',arm:'#42612d',glove:'#8aa65a',skin:'#8aa65a',armR:[.9,1.1,.4],armL:[-.75,1.0,.35],legs:'#344623',headW:1.1});
  S.ell([0,1.5,-.15],[.5,.55,.38],'#42612d');
  S.cone([0,1.95,0],[0,2.6,-.2],.32,'#344623'); S.ell([0,2.0,-.02],[.3,.33,.3],'#344623');
  S.ell([-.1,2.0,.25],[.06,.05,.03],'#a7ff70',{glow:1,rings:4,seg:6}); S.ell([.1,2.0,.25],[.06,.05,.03],'#a7ff70',{glow:1,rings:4,seg:6});
  S.tube([.9,.25,.4],[.95,2.0,.45],.1,.15,'#d9f5a6'); S.ell([.95,2.1,.45],[.2,.17,.2],'#a7ff70',{glow:1});
  S.tube([-.3,1.4,-.5],[-.3,2.1,-.5],.12,.12,'#344623'); S.ell([-.3,2.15,-.5],[.12,.1,.12],'#a7ff70',{glow:1});
  for(let i=0;i<4;i++) S.ell([Math.cos(t*1.2+i*1.57)*.9,.4+((t*.6+i*.25)%1)*1.5,Math.sin(t*1.2+i*1.57)*.9],[.08,.08,.08],'#a7ff70',{glow:1,rings:4,seg:6});
};

MODELS.dawnMaiden=(S,d,t)=>{
  man(S,{bulk:1.05,cloth:'#8a5424',arm:'#8a5424',forearm:'#fff3b0',pad:'#fff3b0',glove:'#fff3b0',legs:'#6a3f18',armR:[.85,1.25,.5],armL:[-.7,1.3,.3],belt:'#fff3b0'});
  S.tube([0,.7,0],[0,1.05,0],.6,.32,'#fff3b0',{seg:12});
  S.box([0,1.4,-.4],[.85,1.5,.06],'#fff8e0',{rot:[.1,0,0]});
  S.ell([0,2.1,0],[.31,.27,.31],'#fff3b0'); S.box([0,2.0,.25],[.2,.05,.05],'#1a1208');
  for(const s of [-1,1]) S.box([s*.4,2.3,-.05],[.05,.5,.22],'#ffe39a',{rot:[0,0,-s*.5],glow:1});
  S.ring([0,2.75+Math.sin(t*2)*.04,0],.3,.05,'#fff3b0',{glow:1,n:14});
  S.tube([.85,.85,.5],[.85,1.9,.5],.06,.06,'#5b3a1e'); S.box([.85,2.05,.5],[.7,.35,.35],'#ffe39a',{glow:1});
  S.ell([-.85,1.2,.3],[.07,.5,.4],'#fff3b0');
};

MODELS.exileKnight=(S,d,t)=>{
  man(S,{bulk:1.2,cloth:'#18384f',arm:'#18384f',forearm:'#2c5878',pad:'#2c5878',glove:'#0c1e2c',legs:'#102a3c',belt:'#9bdfff',armR:[.9,1.2,.5],armL:[-.8,1.1,.4]});
  S.box([0,1.4,-.4],[.9,1.5,.07],'#10202c',{rot:[.12,0,0]});
  S.ell([0,2.1,0],[.33,.3,.33],'#2c5878'); S.box([0,2.05,.28],[.3,.05,.05],'#9bdfff',{glow:1});
  S.cone([0,2.35,0],[0,2.7,-.2],.08,'#9bdfff');
  for(const s of [-1,1]) S.ell([s*.62,1.72,0],[.27,.2,.27],'#2c5878');
  S.obox([.9,1.1,.5],[1.0,3.0,.6],.2,.05,'#ff707a',{glow:1}); S.box([.9,1.15,.5],[.6,.08,.14],'#9bdfff');
};

MODELS.juvsyut=(S,d,t)=>{
  man(S,{bulk:1.5,gap:.23,hipY:.8,cloth:'#7b432d',skin:'#f2a36f',headY:1.95,shY:1.5,armR:[1.0,1.0,.3],armL:[-1.0,1.0,.3],glove:'#f2a36f',belt:'#ffd568',legs:'#4a2a1c'});
  S.ell([0,1.12,.15],[.95,.8,.72],'#7b432d',{rings:9,seg:14});
  S.box([0,1.0,.82],[.3,.18,.04],'#ffd568');
  S.ell([0,2.0,0],[.3,.3,.3],'#f2a36f'); S.tube([0,2.1,0],[0,2.18,0],.32,.32,'#c0392b');
  S.tube([1.0,.45,.35],[1.15,2.0,.4],.1,.2,'#d69a61'); S.ell([1.15,2.05,.4],[.2,.14,.2],'#d69a61');
  for(let i=0;i<5;i++){const a=i*1.26; S.cone([1.15+Math.cos(a)*.15,1.8+(i%2)*.15,.4+Math.sin(a)*.15],[1.15+Math.cos(a)*.36,1.8+(i%2)*.15,.4+Math.sin(a)*.36],.05,'#8a8a8a',{seg:5});}
};

MODELS.chip=(S,d,t)=>{
  man(S,{bulk:1.0,cloth:'#49376d',arm:'#49376d',glove:'#ffd568',armR:[.8,1.3,.45],armL:[-.65,1.35,.55],legs:'#2c2145',belt:'#ffd568'});
  robe(S,.6,.45,1.5,'#49376d','#f5f0e8');
  S.box([0,1.4,-.38],[.95,1.5,.07],'#8f1d3a',{rot:[.1,0,0]});
  S.ell([0,1.85,.18],[.2,.22,.12],'#eee');
  S.tube([0,2.25,0],[0,2.55,0],.3,.34,'#ffd568',{seg:10,glow:1});
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2; S.cone([Math.cos(a)*.31,2.55,Math.sin(a)*.31],[Math.cos(a)*.33,2.85,Math.sin(a)*.33],.06,'#ffd568',{glow:1,seg:5});}
  S.tube([.8,.2,.45],[.8,2.3,.45],.045,.045,'#ffd568'); S.ell([.8,2.45,.45],[.16,.16,.16],'#c0392b',{glow:1});
  for(let i=0;i<4;i++){const a=t*1.4+i*1.57; S.ell([Math.cos(a)*1.15,1.2+Math.sin(t*2+i)*.2,Math.sin(a)*1.15],[.13,.03,.13],'#ffd568',{glow:1,rings:4,seg:8,rot:[.5,a,0]});}
};

MODELS.savely=(S,d,t)=>{
  man(S,{bulk:1.5,gap:.23,hipY:.8,cloth:'#254f68',skin:'#e8b894',headY:1.95,shY:1.5,armR:[1.0,1.0,.35],armL:[-.95,1.05,.5],glove:'#ffcc66',legs:'#ffcc66',belt:'#ffcc66',boots:'#222'});
  S.ell([0,1.12,.15],[.92,.8,.7],'#254f68',{rings:9,seg:14});
  S.box([0,1.2,.84],[.4,.4,.03],'#ffcc66');
  S.ell([0,2.0,0],[.3,.3,.3],'#e8b894'); S.box([0,2.0,.25],[.4,.08,.06],'#ffcc66',{glow:1});
  S.tube([0,2.25,0],[0,2.65,0],.02,.02,'#aaa',{seg:5}); S.ell([0,2.7,0],[.07,.07,.07],'#ffcc66',{glow:1,rings:4,seg:6});
  for(const s of [-1,1]) S.tube([s*.9,1.6,0],[s*.95,1.1,.1],.07,.07,'#8a8a8a',{seg:6});
  S.ell([-.95,.9,.9],[.28,.28,.28],'#f3f3f3',{rings:6,seg:10}); S.ell([-.95,.9,1.15],[.1,.1,.06],'#222',{rings:4,seg:6});
  S.tube([1.0,.4,.35],[1.1,2.0,.4],.1,.18,'#ffcc66');
};

MODELS.juggernaut=(S,d,t)=>{
  man(S,{bulk:1.1,cloth:'#8a241f',arm:'#8a241f',glove:'#3a1210',skin:'#d9b08a',legs:'#5a1612',armR:[.6,1.3,.8],armL:[-.55,1.35,.7],belt:'#ffe7a2'});
  S.tube([0,.1,0],[0,1.0,0],.42,.3,'#5a1612',{seg:12});
  S.ell([0,2.0,-.02],[.3,.32,.3],'#3a1210'); S.ell([0,1.99,.1],[.23,.27,.17],'#ffe7a2');
  S.box([-.09,2.03,.25],[.1,.03,.02],'#222'); S.box([.09,2.03,.25],[.1,.03,.02],'#222');
  S.tube([0,2.1,-.3],[0,1.35,-.5],.07,.04,'#2a1008');
  S.ell([0,2.3,0],[.3,.12,.3],'#d9b08a');
  S.obox([.6,1.25,.7],[.8,3.0,1.3],.07,.03,'#fff0bd',{glow:1}); S.box([.6,1.3,.75],[.18,.05,.18],'#ffe7a2');
};

MODELS.earthshaker=(S,d,t)=>{
  man(S,{bulk:1.5,gap:.25,hipY:.85,cloth:'#5b4a36',arm:'#6a5742',glove:'#6a5742',skin:'#8a7255',legs:'#44382a',pad:'#6e6a60',armR:[1.0,1.05,.45],armL:[-1.0,1.05,.3],headY:2.0,belt:'#8bd4ff'});
  for(const s of [-1,1]) S.ell([s*.75,1.75,0],[.3,.24,.3],'#6e6a60',{rings:5,seg:8});
  S.ell([0,1.9,.3],[.28,.3,.12],'#d8d0c0');
  S.tube([1.0,0,.45],[1.0,2.8,.45],.17,.2,'#5b4a36',{seg:8});
  for(let i=0;i<3;i++) S.tube([1.0,.8+i*.7,.45],[1.0,.9+i*.7,.45],.24,.24,'#8bd4ff',{glow:1,seg:10});
  S.box([1.0,3.0,.45],[.5,.4,.5],'#6e6a60');
};

MODELS.sniper=(S,d,t)=>{
  S.sc=.95;
  man(S,{bulk:1.2,cloth:'#7e3f24',arm:'#7e3f24',glove:'#3a2415',legs:'#4a2a18',skin:'#e0a97c',armR:[.5,1.4,.7],armL:[-.3,1.35,1.0],headY:1.9,belt:'#3a2415'});
  S.ell([0,1.75,.2],[.28,.4,.18],'#d9b079');
  S.ell([0,2.0,.0],[.3,.22,.3],'#3a2415'); S.tube([0,2.1,0],[0,2.14,0],.42,.42,'#3a2415',{seg:12});
  S.tube([.4,1.45,.2],[.4,1.55,2.1],.05,.04,'#2a2a2a'); S.box([.4,1.4,.1],[.14,.26,.9],'#6b4423');
  S.tube([.4,1.7,.8],[.4,1.7,1.3],.07,.07,'#222'); S.ell([.4,1.7,1.32],[.07,.07,.03],'#ffd27a',{glow:1,rings:4,seg:8});
};

/* ---------- Запасная модель для героев без отдельной ---------- */
function fallback(S,d,t){
  man(S,{cloth:d.color||'#556',armR:[.7,1.3,.4],armL:[-.7,1.3,.4]});
  robe(S,.55,.4,1.4,d.color||'#556',d.color2||'#fff');
  S.ell([0,2.5,0],[.15,.15,.15],d.color2||'#fff',{glow:1});
}

/* ---------- Рендер ---------- */
function drawPedestal(S,d,t){
  S.target=S.pre; const k=S.sc; S.sc=1;
  S.tube([0,-.2,0],[0,-.02,0],1.55,1.45,'#1b1f2b',{seg:28});
  S.tube([0,-.03,0],[0,0,0],1.4,1.4,'#262b3b',{seg:28});
  S.ring([0,.004,0],1.2,.05,d.color2||'#d7b36a',{glow:1,n:30,phase:t*.2});
  S.ring([0,.004,0],.95,.03,d.color2||'#d7b36a',{glow:1,n:24,phase:-t*.3});
  S.sc=k; S.target=S.faces;
}

function draw(ctx,def,x,y,w,h,o){
  const yaw=o.yaw||0, pitch=o.pitch==null?.2:o.pitch, zoom=o.zoom||1, t=o.t||0;
  const S=new Scene();
  drawPedestal(S,def,t);
  const bob=Math.sin(t*1.6)*.025;
  (MODELS[def.id]||fallback)(S,def,t);
  const D=9, f=Math.min(h*.86/3.5, w*.86/3.5)*D*zoom;
  const cx=x+w/2, cy=y+h*.6;
  const cyw=Math.cos(yaw), syw=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch);
  const T=[0,1.3,0];
  const tr=p=>{
    let px=p[0]-T[0], py=p[1]-T[1]+(p.__b?0:0), pz=p[2]-T[2];
    let X=px*cyw-pz*syw, Z=px*syw+pz*cyw;
    let Y=py*cp-Z*sp, Z2=py*sp+Z*cp;
    return [X,Y,Z2];
  };
  const L=norm([-.5,.75,.55]);
  const prep=(arr,bobY)=>{
    const out=[];
    for(const fc of arr){
      const P=fc.p.map(p=>tr([p[0],p[1]+bobY,p[2]]));
      const C=tr([fc.c[0],fc.c[1]+bobY,fc.c[2]]);
      let n;
      if(P.length===3) n=cross(sub(P[1],P[0]),sub(P[2],P[0]));
      else n=cross(sub(P[2],P[0]),sub(P[3],P[1]));
      const nl=len(n); if(nl<1e-9) continue; n=mul(n,1/nl);
      const outv=sub(P[0],C);
      // нормаль должна смотреть наружу от центра примитива
      const fcn=[(P[0][0]+P[1][0]+P[2][0])/3-C[0],(P[0][1]+P[1][1]+P[2][1])/3-C[1],(P[0][2]+P[1][2]+P[2][2])/3-C[2]];
      if(dot(n,fcn)<0) n=mul(n,-1);
      const fcPos=[(P[0][0]+P[1][0]+P[2][0])/3,(P[0][1]+P[1][1]+P[2][1])/3,(P[0][2]+P[1][2]+P[2][2])/3];
      const view=[-fcPos[0],-fcPos[1],D-fcPos[2]];
      if(dot(n,view)<=0) continue;
      let zs=0; for(const p of P) zs+=p[2];
      out.push({P,n,z:zs/P.length,col:fc.col,glow:fc.glow});
    }
    return out;
  };
  const paint=list=>{
    ctx.lineJoin='round';
    for(const fc of list){
      const pts=fc.P.map(p=>{const dd=D-p[2]; return [cx+p[0]*f/dd, cy-p[1]*f/dd];});
      let r=fc.col[0],g=fc.col[1],b=fc.col[2];
      if(fc.glow){
        r=Math.min(255,r*1.15+40); g=Math.min(255,g*1.15+40); b=Math.min(255,b*1.15+40);
        ctx.shadowColor='rgb('+(fc.col[0]|0)+','+(fc.col[1]|0)+','+(fc.col[2]|0)+')'; ctx.shadowBlur=14;
      } else {
        const lam=Math.max(0,dot(fc.n,L)), rim=Math.pow(1-Math.max(0,fc.n[2]),2.5)*.18;
        const k=.34+.66*lam+rim;
        r=Math.min(255,r*k+rim*60); g=Math.min(255,g*k+rim*40); b=Math.min(255,b*k+rim*40);
        ctx.shadowBlur=0;
      }
      const s='rgb('+(r|0)+','+(g|0)+','+(b|0)+')';
      ctx.fillStyle=s; ctx.strokeStyle=s; ctx.lineWidth=.9;
      ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
      for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.shadowBlur=0;
  };
  ctx.save();
  // тень под бойцом
  const g=tr([0,0,0]); const dd=D-g[2];
  const pre=prep(S.pre,0).sort((a,b)=>a.z-b.z);
  paint(pre.filter(q=>!q.glow)); paint(pre.filter(q=>q.glow));
  const mdl=prep(S.faces,bob).sort((a,b)=>a.z-b.z);
  paint(mdl);
  ctx.restore();
}

window.Hero3D={draw,models:MODELS};
})();
