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
  face(pts,center,color,glow,nm,shine){
    const k=this.sc;
    const P=pts.map(p=>[p[0]*k,p[1]*k,p[2]*k]);
    const col=rgb(color);
    if(shine==null){
      const mx=Math.max(col[0],col[1],col[2]), mn=Math.min(col[0],col[1],col[2]);
      shine=(mx>105 && (mx-mn)/mx<.22)?.6:.16;
    }
    this.target.push({p:P,c:[center[0]*k,center[1]*k,center[2]*k],col,glow:!!glow,nm:nm||null,sh:shine});
  }
  box(c,s,color,o){
    o=o||{}; const r=o.rot||[0,0,0];
    const hx=s[0]/2,hy=s[1]/2,hz=s[2]/2;
    const v=[[-hx,-hy,-hz],[hx,-hy,-hz],[hx,hy,-hz],[-hx,hy,-hz],[-hx,-hy,hz],[hx,-hy,hz],[hx,hy,hz],[-hx,hy,hz]]
      .map(p=>add(rotEuler(p,r),c));
    const F=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];
    for(const f of F) this.face(f.map(i=>v[i]),c,color,o.glow,null,o.shine);
  }
  obox(a,b,w,t,color,o){
    o=o||{}; const d=sub(b,a); const [bx,by,bz]=basisY(d,o.hint);
    const L=len(d), c=lerp(a,b,.5);
    const loc=[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,.5,-.5],[-.5,.5,-.5],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]
      .map(p=>add(c,add(add(mul(bx,p[0]*w),mul(by,p[1]*L)),mul(bz,p[2]*t))));
    const F=[[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]];
    for(const f of F) this.face(f.map(i=>loc[i]),c,color,o.glow,null,o.shine);
  }
  tube(a,b,r1,r2,color,o){
    o=o||{}; const n=o.seg||14; const d=sub(b,a); const [bx,by,bz]=basisY(d);
    const tilt=(r1-r2)/(len(d)||1);
    const c=lerp(a,b,.5);
    const ra=[],rb=[];
    for(let i=0;i<n;i++){
      const ang=i/n*Math.PI*2, dx=Math.cos(ang), dz=Math.sin(ang);
      const off=add(mul(bx,dx),mul(bz,dz));
      ra.push(add(a,mul(off,r1))); rb.push(add(b,mul(off,r2)));
    }
    for(let i=0;i<n;i++){
      const j=(i+1)%n;
      const am=(i+.5)/n*Math.PI*2;
      const nm=norm(add(add(mul(bx,Math.cos(am)),mul(bz,Math.sin(am))),mul(by,tilt)));
      this.face([ra[i],ra[j],rb[j],rb[i]],c,color,o.glow,nm,o.shine);
    }
    if(r1>0.001) this.face(ra.slice().reverse(),c,color,o.glow,mul(by,-1),o.shine);
    if(r2>0.001) this.face(rb,c,color,o.glow,by,o.shine);
  }
  cone(base,tip,r,color,o){ this.tube(base,tip,r,0,color,o); }
  ell(c,r,color,o){
    o=o||{}; const nr=o.rings||9, ns=o.seg||16, rot=o.rot||[0,0,0];
    const pt=(i,j)=>{
      const th=i/nr*Math.PI, ph=j/ns*Math.PI*2;
      const p=[r[0]*Math.sin(th)*Math.cos(ph), r[1]*Math.cos(th), r[2]*Math.sin(th)*Math.sin(ph)];
      return add(rotEuler(p,rot),c);
    };
    for(let i=0;i<nr;i++) for(let j=0;j<ns;j++){
      const a=pt(i,j), b=pt(i,j+1), d=pt(i+1,j), e=pt(i+1,j+1);
      const tm=(i+.5)/nr*Math.PI, pm=(j+.5)/ns*Math.PI*2;
      const nm=norm(rotEuler([Math.sin(tm)*Math.cos(pm)/r[0],Math.cos(tm)/r[1],Math.sin(tm)*Math.sin(pm)/r[2]],rot));
      if(i===0) this.face([a,d,e],c,color,o.glow,nm,o.shine);
      else if(i===nr-1) this.face([a,b,d],c,color,o.glow,nm,o.shine);
      else this.face([a,b,e,d],c,color,o.glow,nm,o.shine);
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
const G=(S,c,r,col,o)=>S.ell(c,[r,r,r],col,Object.assign({glow:1,rings:5,seg:8},o||{}));
function eyes(S,y,w,z,o){
  o=o||{};
  const iris=o.eye||'#3a2a1c', brow=o.brow||'#2a1c14', ang=o.angry==null?.18:o.angry;
  for(const sx of [-1,1]){
    const ex=sx*.105*w;
    S.ell([ex,y+.03,z],[.052,.044,.03],o.white||'#f4f1ea',{rings:5,seg:8,shine:.5});
    S.ell([ex,y+.03,z+.02],[.032,.036,.018],iris,{rings:4,seg:8,glow:o.glow});
    S.ell([ex,y+.03,z+.03],[.016,.02,.01],'#0b0b10',{rings:4,seg:6,shine:.8});
    S.ell([ex+.012,y+.046,z+.036],[.007,.007,.005],'#ffffff',{rings:3,seg:5,glow:1});
    S.box([ex,y+.07,z+.004],[.112,.018,.032],o.lid||'#8a5a44',{rot:[0,0,-sx*ang*.4]});
    S.box([ex,y+.115,z-.005],[.105,.026,.032],brow,{rot:[0,0,-sx*ang]});
  }
}
function face3(S,y,w,z,o){
  o=o||{};
  eyes(S,y,w,z,o);
  const skin=o.skin||'#d9a07e';
  S.box([0,y+.01,z-.002],[.03,.1,.03],skin,{shine:.2});
  S.ell([0,y-.04,z+.02],[.038,.034,.04],skin,{rings:5,seg:8});
  S.ell([0,y-.07,z+.044],[.032,.026,.03],skin,{rings:5,seg:8,shine:.3});
  for(const sx of [-1,1]) S.ell([sx*.026,y-.078,z+.038],[.014,.012,.012],'#6a3a30',{rings:3,seg:5});
  const lip=o.lip||'#8a3b3b', m=o.mouth||'smile';
  if(m==='grin'){
    S.box([0,y-.125,z-.002],[.15,.036,.025],'#2a0e12');
    S.box([0,y-.112,z+.012],[.14,.014,.01],'#fbfbf2');
    S.box([0,y-.135,z+.012],[.12,.012,.01],'#fbfbf2');
  } else if(m==='stern'){
    S.box([0,y-.125,z-.002],[.1,.014,.02],lip,{rot:[0,0,0]});
  } else {
    S.box([0,y-.12,z-.002],[.1,.014,.02],lip);
    S.box([-.052,y-.112,z-.012],[.03,.012,.016],lip,{rot:[0,0,.5]});
    S.box([.052,y-.112,z-.012],[.03,.012,.016],lip,{rot:[0,0,-.5]});
  }
  if(o.cheeks) for(const sx of [-1,1]) S.ell([sx*.15*w,y-.06,z-.05],[.05,.025,.02],o.cheeks,{rings:4,seg:6});
}
function man(S,o){
  const b=o.bulk||1, sk=o.skin||'#e8b894', cl=o.cloth||'#555', lg=o.legs||cl, bt=o.boots||'#2a2a30';
  const gap=(o.gap||.2)*b, hipY=o.hipY||.95, shY=o.shY||1.58, hy=o.headY||2.0, hw=o.headW||1;
  const trim=o.trim||'#d7b36a';
  for(const s of [-1,1]){
    S.tube([s*gap,.2,0],[s*gap,hipY*.55,.01],.115*b,.14*b,lg);
    S.tube([s*gap,hipY*.55,.01],[s*gap,hipY,0],.14*b,.15*b,lg);
    S.ell([s*gap,hipY*.55,.02],[.145*b,.1,.145*b],lg,{rings:6,seg:10});
    if(o.knee) S.ell([s*gap,hipY*.55,.12*b],[.12*b,.14,.07],o.knee,{rings:5,seg:8,shine:.5});
    S.tube([s*gap,.36,0],[s*gap,.2,0],.125*b,.15*b,bt,{seg:12});
    S.tube([s*gap,.2,0],[s*gap,.16,0],.15*b,.15*b,bt,{seg:12});
    S.tube([s*gap,.4,0],[s*gap,.35,0],.14*b,.14*b,o.cuff||trim,{seg:12,shine:.5});
    S.ell([s*gap,.1,.1],[.16*b,.1,.27],bt,{shine:.4});
    S.ell([s*gap,.095,.3],[.13*b,.075,.1],o.toe||bt,{rings:5,seg:8,shine:.5});
    S.box([s*gap,.025,.1],[.3*b,.05,.52],'#14141a');
  }
  S.ell([0,hipY+.02,0],[.45*b,.17,.3*b],lg);
  S.tube([0,hipY,0],[0,1.35,0],.34*b,.4*b,cl,{seg:16});
  S.ell([0,1.38,0],[.47*b,.5,.31*b],cl,{rings:10,seg:18});
  S.ell([0,1.62,.06],[.4*b,.2,.24*b],cl,{rings:6,seg:14});
  if(o.chest){
    S.ell([0,1.47,.17*b],[.37*b,.3,.17*b],o.chest,{rings:7,seg:12,shine:.55});
    S.box([0,1.48,.33*b],[.05,.5,.04],o.chestTrim||trim,{shine:.6});
    for(const s of [-1,1]) S.ell([s*.19*b,1.55,.3*b],[.05,.05,.03],o.chestTrim||trim,{rings:4,seg:6,shine:.7});
  }
  if(o.collar){ S.tube([0,1.64,0],[0,1.78,0],.27,.2,o.collar,{seg:14,shine:.4}); }
  if(!o.nobelt){
    S.tube([0,hipY-.04,0],[0,hipY+.1,0],.46*b,.46*b,o.belt||'#3a2a1a',{seg:18,shine:.35});
    S.box([0,hipY+.03,.3*b],[.2,.16,.05],trim,{shine:.7});
    S.box([0,hipY+.03,.33*b],[.1,.08,.02],o.belt||'#3a2a1a',{shine:.4});
    if(!o.nopouch) for(const s of [-1,1]){ S.box([s*.38*b,hipY-.02,.1],[.13,.17,.13],'#3a2a1a'); S.box([s*.38*b,hipY+.05,.1],[.14,.05,.14],'#2a1c10'); }
  }
  S.tube([0,1.74,0],[0,1.92,0],.11,.1,sk);
  S.ell([0,hy,0],[.27*hw,.3,.27*hw],sk,{rings:11,seg:18});
  S.ell([0,hy-.08,.04],[.22*hw,.2,.22*hw],sk,{rings:6,seg:12});
  S.ell([0,hy-.17,.06*hw],[.15*hw,.09,.15*hw],sk,{rings:5,seg:10});
  for(const sx of [-1,1]){
    S.ell([sx*.27*hw,hy,0],[.04,.07,.04],sk,{rings:5,seg:8});
    if(o.pointEars) S.cone([sx*.29*hw,hy+.02,0],[sx*.5*hw,hy+.14,-.06],.045,sk,{seg:6});
  }
  if(o.hair) S.ell([0,hy+.05,-.05],[.29*hw,.29,.29*hw],o.hair,{rings:8,seg:14});
  if(o.fringe){ for(let i=0;i<5;i++){ const x=(i-2)*.1*hw; S.cone([x,hy+.24,.16*hw],[x*1.1,hy+.1,.28*hw],.06,o.fringe,{seg:5}); } }
  if(o.face) face3(S,hy,hw,.25*hw,Object.assign({skin:sk},o.fo||{}));
  if(o.beard){
    S.ell([0,hy-.17,.1*hw],[.2*hw,.17,.17*hw],o.beard,{rings:6,seg:10});
    S.cone([0,hy-.2,.12*hw],[0,hy-.5,.16*hw],.12*hw,o.beard,{seg:8});
  }
  for(const s of [-1,1]){
    const sh=[s*.5*b,shY,0];
    const hand=(s>0?o.armR:o.armL)||[s*.62*b,1.0,.12];
    const el=add(lerp(sh,hand,.5),[s*.13,-.12,.1]);
    S.ell(sh,[.2*b,.17,.2*b],o.pad||cl,{rings:7,seg:12,shine:o.pad?.45:.2});
    if(o.pad) S.tube([sh[0],sh[1]-.04,sh[2]],[sh[0]+s*.03,sh[1]-.13,sh[2]],.215*b,.2*b,o.padTrim||trim,{seg:12,shine:.55});
    S.tube(sh,el,.125*b,.105*b,o.arm||cl);
    S.ell(el,[.11*b,.11*b,.11*b],o.arm||cl,{rings:6,seg:10});
    S.tube(el,hand,.105*b,.085*b,o.forearm||o.arm||sk);
    const dir=norm(sub(hand,el));
    if(o.bracer) S.tube(lerp(el,hand,.4),lerp(el,hand,.85),.115*b,.1*b,o.bracer,{seg:10,shine:.5});
    S.tube(hand,add(hand,mul(dir,.05)),.1*b,.1*b,o.glove||sk,{seg:10});
    const hc=add(hand,mul(dir,.06));
    S.ell(hc,[.115*b,.115*b,.115*b],o.glove||sk,{rings:7,seg:12});
    let pp=cross(dir,[0,0,1]); if(len(pp)<.2) pp=cross(dir,[1,0,0]); pp=norm(pp);
    S.ell(add(add(hc,mul(pp,.09*s)),mul(dir,.03)),[.04,.04,.04],o.glove||sk,{rings:4,seg:6});
    for(let k=-1;k<=1;k++) S.ell(add(add(hc,mul(dir,.1)),mul(pp,k*.05)),[.036,.04,.036],o.glove||sk,{rings:4,seg:6});
  }
  return {};
}
function robe(S,rb,rt,h,col,trim,gl){
  S.tube([0,.04,0],[0,h*.55,0],rb,rb*.78+rt*.22,col,{seg:22});
  S.tube([0,h*.55,0],[0,h,0],rb*.78+rt*.22,rt,col,{seg:22});
  if(trim){ S.tube([0,.02,0],[0,.14,0],rb+.02,rb+.015,trim,{seg:22,shine:.5,glow:gl});
    S.tube([0,h*.62,0],[0,h*.66,0],rb*.74+rt*.26+.01,rb*.74+rt*.26+.01,trim,{seg:22,shine:.5});
    for(const s of [-1,1]) S.box([s*(rb*.8),h*.3,.1],[.05,h*.5,.04],trim,{shine:.5,glow:gl,rot:[0,0,s*.04]});
    S.box([0,h*.3,rb*.84],[.07,h*.52,.03],trim,{shine:.5,glow:gl}); }
}
function cape(S,col,trim,w,top,bot,z,n){
  n=n||5;
  for(let i=0;i<n;i++){
    const x=(i-(n-1)/2)*(w/n), a=Math.abs(i-(n-1)/2);
    S.box([x,(top+bot)/2,z-a*.03],[w/n*.96,top-bot,.05],col,{rot:[.1+a*.03,0,-x*.18]});
    if(trim) S.box([x,bot+.03,z-a*.03-.02],[w/n*.96,.07,.06],trim,{rot:[.1+a*.03,0,-x*.18],shine:.5});
  }
}
function spikeRing(S,y,R,n,L,col,o){ o=o||{};
  for(let i=0;i<n;i++){ const a=i/n*Math.PI*2+(o.ph||0); S.cone([Math.cos(a)*R,y,Math.sin(a)*R],[Math.cos(a)*(R+(o.out||0)),y+L,Math.sin(a)*(R+(o.out||0))],o.r||.06,col,{seg:5,glow:o.glow}); } }
function pauldron(S,s,y,col,tr,sp){
  S.ell([s*.62,y,0],[.28,.2,.28],col,{rings:6,seg:12,shine:.5});
  S.tube([s*.62,y-.06,0],[s*.64,y-.17,0],.29,.27,tr,{seg:12,shine:.6});
  if(sp) for(let i=0;i<sp;i++) S.cone([s*(.58+i*.06),y+.12,(i-(sp-1)/2)*.12],[s*(.66+i*.1),y+.38,(i-(sp-1)/2)*.15],.05,tr,{seg:5,shine:.6});
}
function flick(t,k){return Math.sin(t*9+k)*.5+Math.sin(t*14.3+k*2)*.5;}
function embers(S,t,R,col,n,hgt){ n=n||6; hgt=hgt||2.4;
  for(let i=0;i<n;i++){ const ph=(t*.35+i/n)%1, a=t*.8+i*2.4; G(S,[Math.cos(a)*(R+.15*Math.sin(i)),.3+ph*hgt,Math.sin(a)*(R+.15*Math.sin(i))],.045*(1-ph*.6),col); } }

/* ---------- Модели героев ---------- */
const MODELS={};

MODELS.pyro=(S,d,t)=>{
  man(S,{nobelt:true,face:true,cloth:'#8a1f10',arm:'#a52d18',bracer:'#ffcf63',armR:[.78,1.4,.38],armL:[-.62,1.55,.55],glove:'#e8b894',skin:'#e8b894',fo:{eye:'#ff9a2a',glow:1,angry:.3,mouth:'grin'},collar:'#ffcf63',beard:'#6b2410'});
  robe(S,.64,.4,1.5,'#a52d18','#ffcf63',1);
  S.tube([0,1.5,0],[0,1.62,0],.42,.3,'#ffcf63');
  for(const s of [-1,1]){ S.tube([s*.5,1.3,.04],[s*.64,.7,.1],.14,.2,'#7a1608',{seg:10}); S.tube([s*.64,.7,.1],[s*.66,.62,.1],.21,.21,'#ffcf63',{seg:10,glow:1}); }
  S.tube([0,1.0,0],[0,1.14,0],.52,.52,'#3a0e06',{seg:18}); G(S,[0,1.08,.52],.09,'#ff762f');
  for(let i=0;i<7;i++){ const a=-1.2+i*.4; S.cone([Math.sin(a)*.62,.12,Math.cos(a)*.62],[Math.sin(a)*.64,.5,Math.cos(a)*.64],.05,'#ff762f',{glow:1,seg:5}); }
  S.ell([0,1.85,.2],[.17,.22,.1],'#e0d8c8');
  S.tube([0,2.2,0],[0,2.27,0],.56,.56,'#5c1006',{seg:14});
  S.tube([0,2.25,0],[0,2.33,0],.5,.46,'#ffcf63',{seg:14,shine:.6});
  S.cone([0,2.24,0],[0,3.0,-.08],.42,'#7a1608',{seg:12});
  for(let i=0;i<3;i++) G(S,[Math.sin(i*2.1)*.3,2.55+i*.12,Math.cos(i*2.1)*.3+.05],.05,'#ffcf63');
  S.tube([.78,0,.38],[.78,2.35,.38],.05,.05,'#5b3a1e');
  for(let i=0;i<4;i++) S.tube([.78,.5+i*.5,.38],[.78,.56+i*.5,.38],.075,.075,'#ffcf63',{shine:.6});
  const f=flick(t,1)*.04;
  for(let i=0;i<4;i++){ const a=i*1.57; S.cone([.78+Math.cos(a)*.1,2.35,.38+Math.sin(a)*.1],[.78+Math.cos(a)*.27,2.78,.38+Math.sin(a)*.27],.04,'#ffcf63',{seg:5}); }
  S.ell([.78,2.55,.38],[.2,.24+f,.2],'#ffcf63',{glow:1});
  S.cone([.78,2.6,.38],[.78,3.15+f*2,.38],.14,'#ff762f',{glow:1});
  S.cone([.78,2.6,.38],[.78,2.95+f*2,.38],.09,'#fff3b0',{glow:1});
  S.ell([-.62,1.9+flick(t,3)*.03,.6],[.22,.22,.22],'#ff9a3c',{glow:1});
  S.cone([-.62,1.95,.6],[-.62,2.35+flick(t,5)*.05,.6],.12,'#ff762f',{glow:1});
  embers(S,t,1.0,'#ff9a3c',7,2.6);
};

MODELS.warlord=(S,d,t)=>{
  man(S,{bulk:1.15,face:false,cloth:'#3b7fa8',arm:'#3b7fa8',forearm:'#b9d8e7',pad:'#b9d8e7',padTrim:'#d7b36a',bracer:'#d7b36a',chest:'#b9d8e7',chestTrim:'#d7b36a',knee:'#b9d8e7',armR:[.82,1.35,.4],armL:[-.7,1.1,.25],legs:'#2d4f66',belt:'#d7b36a',trim:'#d7b36a',collar:'#b9d8e7',toe:'#b9d8e7'});
  cape(S,'#8f2730','#d7b36a',1.0,2.0,.7,-.42,5);
  for(let i=0;i<6;i++){ const x=(i-2.5)*.17; S.box([x,.82,.3],[.15,.45,.04],'#b9d8e7',{rot:[-.1,0,0],shine:.5}); S.box([x,.62,.31],[.15,.03,.05],'#d7b36a'); }
  S.ell([0,2.12,0],[.34,.26,.34],'#b9d8e7',{rings:8,seg:16,shine:.6});
  S.box([0,2.0,.22],[.34,.1,.06],'#1a2a38');
  S.tube([0,2.04,0],[0,2.1,0],.35,.35,'#d7b36a',{seg:16,shine:.6});
  for(const s of [-1,1]){ S.box([s*.3,1.92,.16],[.06,.3,.2],'#b9d8e7',{rot:[0,s*.3,0],shine:.5}); S.cone([s*.3,2.25,0],[s*.52,2.6,-.1],.07,'#d7b36a',{seg:5}); }
  S.box([0,2.3,.0],[.06,.25,.5],'#b9d8e7',{shine:.5});
  S.cone([0,2.3,-.05],[0,2.78,-.45],.1,'#c0392b');
  for(let i=0;i<3;i++) S.cone([0,2.32,-.05-i*.08],[0,2.7-i*.1,-.5-i*.1],.08-i*.01,'#c0392b',{seg:6});
  S.ell([-.58,1.7,0],[.25,.16,.25],'#b9d8e7',{shine:.5}); S.ell([.58,1.7,0],[.25,.16,.25],'#b9d8e7',{shine:.5});
  for(const s of [-1,1]) for(let i=0;i<3;i++) S.cone([s*(.5+i*.1),1.84,0],[s*(.55+i*.12),2.08,0],.045,'#d7b36a',{seg:5});
  S.obox([.82,1.3,.4],[.95,2.9,.5],.16,.045,'#e8f4ff',{shine:.9});
  S.obox([.84,1.5,.4],[.93,2.8,.5],.04,.05,'#9fb8c8');
  S.box([.82,1.32,.4],[.5,.07,.12],'#d7b36a',{shine:.7});
  S.ell([.82,1.34,.4],[.09,.05,.09],'#c0392b',{glow:1,rings:4,seg:8});
  S.tube([.8,1.0,.38],[.8,1.28,.38],.05,.05,'#4a2a1a');
  for(let i=0;i<4;i++) S.tube([.8,1.0+i*.07,.38],[.8,1.03+i*.07,.38],.058,.058,'#d7b36a');
  S.ell([.8,.95,.38],[.08,.08,.08],'#d7b36a',{shine:.7});
  S.box([-.78,1.1,.3],[.05,1.0,.78],'#b9d8e7',{rot:[0,0,.15],shine:.6});
  G(S,[-.78,1.15,.34],.12,'#d7b36a',{glow:0,shine:.8}); G(S,[-.78,1.15,.34],.06,'#c0392b');
};

MODELS.grisha=(S,d,t)=>{
  man(S,{nobelt:true,face:true,cloth:'#4a2a8a',bracer:'#e0c8ff',armR:[.7,1.9,.3],armL:[-.7,1.9,.3],glove:'#e8b894',beard:'#d8d2e8',fo:{eye:'#7ad8ff',glow:1,angry:-.05,brow:'#d8d2e8'},collar:'#e0c8ff'});
  robe(S,.62,.42,1.55,'#4a2a8a','#e0c8ff',1);
  for(let i=0;i<5;i++){ S.box([Math.sin(i*1.25-2.5)*.5,.5+((i*3)%4)*.22,Math.cos(i*1.25-2.5)*.6],[.07,.07,.02],'#9be8ff',{glow:1,rot:[0,i,.7]}); }
  S.tube([0,1.35,0],[0,1.42,0],.44,.44,'#e0c8ff',{seg:16,shine:.6});
  S.ell([0,1.2,.38],[.1,.1,.05],'#75d8ff',{glow:1,rings:5,seg:8});
  S.tube([0,2.22,0],[0,2.27,0],.5,.5,'#27184e',{seg:16});
  S.tube([0,2.23,0],[0,2.3,0],.42,.42,'#e0c8ff',{seg:16,glow:1});
  S.cone([0,2.26,0],[0,3.05,-.28],.36,'#27184e',{seg:14});
  S.tube([0,2.3,0],[0,2.42,0],.34,.31,'#ffcf65',{seg:14,shine:.6});
  S.cone([0,2.9,-.2],[0,3.25,-.45],.1,'#27184e',{seg:8});
  for(let i=0;i<4;i++) S.box([Math.sin(i*1.6)*.18,2.55+i*.1,.25-i*.05+Math.cos(i*1.6)*.1],[.07,.07,.02],'#ffcf65',{glow:1,rot:[0,0,i]});
  const cs=['#75d8ff','#e58bff','#ffcf65'];
  cs.forEach((c,i)=>{const a=t*1.8+i*2.094; const p=[Math.cos(a)*.95,1.65+Math.sin(t*2+i)*.12,Math.sin(a)*.95];
    S.ell(p,[.17,.17,.17],c,{glow:1});
    if(i===0) for(let k=0;k<5;k++){const q=k*1.256+t*2; S.cone(add(p,[0,.1,0]),add(p,[Math.cos(q)*.24,.28,Math.sin(q)*.24]),.05,'#ff8a3a',{glow:1,seg:5});}
    if(i===1) for(let k=0;k<6;k++){const q=k*1.047; S.cone(add(p,[Math.cos(q)*.13,0,Math.sin(q)*.13]),add(p,[Math.cos(q)*.33,0,Math.sin(q)*.33]),.04,'#d9f7ff',{glow:1,seg:5});}
    if(i===2) S.tube(add(p,[-.15,.15,0]),add(p,[.15,-.15,.05]),.025,.025,'#fff3b0',{glow:1,seg:5});
  });
  S.ring([0,1.0,0],.95,.02,'#e0c8ff',{glow:1,n:26,phase:t*.5});
  for(const s of [-1,1]) G(S,[s*.7,2.05+Math.sin(t*3+s)*.05,.35],.1,s>0?'#75d8ff':'#e58bff');
};

MODELS.golly=(S,d,t)=>{
  man(S,{nobelt:true,face:true,cloth:'#174d78',skin:'#cfe8f3',bracer:'#bfefff',armR:[.75,1.4,.4],armL:[-.65,1.35,.45],glove:'#cfe8f3',fo:{eye:'#7fe8ff',glow:1,angry:.1,brow:'#e8fbff',lip:'#6aa0c8'},beard:'#e8fbff',collar:'#bfefff',pad:'#bfefff'});
  robe(S,.62,.42,1.55,'#174d78','#bfefff',1);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2; S.cone([Math.cos(a)*.6,.1,Math.sin(a)*.6],[Math.cos(a)*.7,.4+(i%3)*.12,Math.sin(a)*.7],.07,'#d9f7ff',{seg:5,glow:1});}
  S.tube([0,2.2,0],[0,2.27,0],.34,.32,'#bfefff',{seg:14,shine:.6,glow:1});
  for(let i=0;i<9;i++){const a=-1.1+i*.275; const hh=2.5+(i%3)*.2-Math.abs(i-4)*.04; S.cone([Math.sin(a)*.27,2.25,Math.cos(a)*.1-.02],[Math.sin(a)*.38,hh,Math.cos(a)*.1-.02],.07,'#d9f7ff',{glow:i%2===0});}
  for(const s of [-1,1]){ for(let i=0;i<3;i++) S.cone([s*(.5+i*.07),1.75,i*.05-.05],[s*(.75+i*.09),2.1+i*.22,i*.08-.05],.1-i*.015,'#bfefff',{glow:i===1}); }
  S.ell([0,1.18,.4],[.1,.14,.05],'#d9f7ff',{glow:1,rings:5,seg:8});
  S.tube([.75,0,.4],[.75,2.2,.4],.05,.05,'#6fb4d6');
  for(let i=0;i<3;i++) S.tube([.75,.5+i*.5,.4],[.75,.56+i*.5,.4],.08,.08,'#bfefff');
  S.cone([.75,2.1,.4],[.75,2.85,.4],.15,'#d9f7ff',{glow:1}); S.cone([.75,2.1,.4],[.75,1.7,.4],.12,'#d9f7ff',{glow:1});
  for(let i=0;i<4;i++){const a=i*1.57; S.cone([.75+Math.cos(a)*.15,2.2,.4+Math.sin(a)*.15],[.75+Math.cos(a)*.4,2.45,.4+Math.sin(a)*.4],.045,'#9fe8ff',{glow:1,seg:5});}
  for(let i=0;i<6;i++){const a=t*.9+i*1.047,R=1.25; const p=[Math.cos(a)*R,1.4+Math.sin(t*1.5+i)*.18,Math.sin(a)*R];
    S.cone(p,add(p,[Math.cos(a)*.3,.35,Math.sin(a)*.3]),.08,'#bfefff',{glow:1});}
  S.ring([0,.03,0],1.1,.03,'#9fe8ff',{glow:1,n:30,phase:-t*.4});
};

MODELS.sasych=(S,d,t)=>{
  man(S,{nobelt:true,face:false,cloth:'#310d1b',arm:'#4a1226',skin:'#c9b3b8',bracer:'#9d1d35',armR:[.85,1.25,.45],armL:[-.85,1.25,.45],glove:'#9d1d35',legs:'#240912',bulk:.95,knee:'#6a1428',collar:'#9d1d35'});
  robe(S,.5,.38,1.3,'#310d1b','#9d1d35');
  cape(S,'#1a0710','#9d1d35',1.1,1.9,.3,-.4,5);
  for(let i=0;i<2;i++) S.obox([-.35+i*.0,1.8,.3],[.35,1.0,.34],.1,.03,'#6a1428',{shine:.5});
  for(let i=0;i<3;i++){ S.tube([-.2+i*.1,1.18,.33],[-.2+i*.1,1.3,.33],.045,.045,'#d9425c',{glow:1,seg:7}); S.tube([-.2+i*.1,1.3,.33],[-.2+i*.1,1.34,.33],.05,.05,'#4a1226',{seg:7}); }
  S.cone([0,2.0,-.1],[0,2.78,-.28],.38,'#240912',{seg:14});
  S.ell([0,2.0,-.04],[.32,.34,.32],'#240912');
  S.tube([0,1.78,0],[0,1.98,0],.26,.3,'#9d1d35',{seg:14});
  S.ell([0,1.97,.12],[.2,.22,.15],'#c9b3b8');
  S.ell([0,1.9,.14],[.15,.12,.1],'#c9b3b8',{rings:5,seg:8});
  S.ell([-.09,1.99,.25],[.05,.04,.03],'#ff5368',{glow:1,rings:4,seg:6}); S.ell([.09,1.99,.25],[.05,.04,.03],'#ff5368',{glow:1,rings:4,seg:6});
  S.box([0,1.9,.27],[.1,.02,.02],'#3a0a14');
  for(const s of [-1,1]){ S.cone([s*.03,1.86,.26],[s*.03,1.78,.27],.012,'#fff',{seg:4}); }
  for(const s of [-1,1]){
    S.obox([s*.85,1.25,.45],[s*1.2,2.05,.75],.12,.035,'#e9bfd0',{shine:.8});
    S.obox([s*.85,1.25,.45],[s*1.05,1.0,.35],.1,.035,'#9d1d35',{glow:1});
    S.obox([s*.85,1.25,.45],[s*1.1,1.9,.7],.05,.04,'#9d1d35',{glow:1});
    S.cone([s*.52,1.65,0],[s*.7,2.05,-.05],.08,'#9d1d35');
    for(let k=0;k<3;k++) S.cone([s*(.9+k*.05),1.24,.45+k*.04],[s*(.98+k*.07),1.0-.1*k,.48+k*.05],.03,'#e9bfd0',{seg:5});
    G(S,[s*.97,.78-((t*.6+(s>0?0:.5))%1)*.3,.34],.03,'#d9425c');
  }
  embers(S,t,.9,'#d9425c',5,2.2);
};

MODELS.ilya=(S,d,t)=>{
  const skin='#a8d86e', cloth='#5d8a49', HY=2.2;
  man(S,{bulk:1.5,gap:.22,hipY:.8,cloth:cloth,skin:skin,headY:HY,shY:1.62,armR:[.98,1.05,.32],armL:[-.98,1.05,.32],glove:skin,belt:'#4a3320',trim:'#ffd568',boots:'#3b2a1a',cuff:'#ffd568',bracer:'#c8933a',knee:'#7a5a2c',pad:'#7a5a2c',padTrim:'#ffd568',toe:'#5a4128',legs:'#6b5330',arm:skin,forearm:skin,face:true,nobelt:true,
    fo:{eye:'#ffd24a',glow:1,angry:.4,brow:'#2e4a1c',mouth:'grin',lip:'#4a1a1a',skin:skin,cheeks:'#82b857'},headW:1.22});
  /* живот (ниже и меньше, чтобы лицо было видно) */
  S.ell([0,.98,.2],[.8,.66,.62],skin,{rings:9,seg:14});
  S.ell([0,.9,.8],[.09,.09,.03],'#6f9a47',{rings:5,seg:8});
  /* кожаный жилет поверх груди */
  for(const s of [-1,1]){
    S.ell([s*.28,1.5,.2],[.27,.36,.27],'#7a5a2c',{rings:7,seg:12,shine:.35});
    S.box([s*.52,1.45,.0],[.1,.8,.5],'#6a4a24');
    for(let k=0;k<4;k++) S.ell([s*(.14),1.78-k*.2,.52],[.045,.045,.03],'#ffd568',{rings:3,seg:6,shine:.8});
  }
  S.box([0,1.5,.55],[.08,.95,.03],'#3a2a14');
  S.ell([0,1.78,.5],[.2,.1,.08],'#ffd568',{rings:5,seg:8,shine:.7});
  S.ell([0,1.78,.56],[.07,.07,.03],'#8dff79',{glow:1,rings:4,seg:8});
  /* пояс с сигилом ауры, набедренник */
  S.tube([0,.7,0],[0,.88,0],.82,.82,'#4a3320',{seg:22,shine:.35});
  S.tube([0,.76,.8],[0,.84,.8],.2,.2,'#ffd568',{seg:14,shine:.7});
  S.ell([0,.8,.86],[.11,.11,.04],'#8dff79',{glow:1,rings:5,seg:10});
  for(let i=0;i<5;i++){ S.box([(i-2)*.3,.42,.58-Math.abs(i-2)*.12],[.24,.5,.05],i%2?'#6b5330':'#5d8a49',{rot:[-.15,(i-2)*.12,0]}); S.box([(i-2)*.3,.18,.6-Math.abs(i-2)*.12],[.24,.04,.06],'#ffd568'); }
  /* голова: ирокез, налобный камень, клыки, борода, серьги */
  for(let i=0;i<7;i++){ const z=-.3+i*.1; S.cone([0,HY+.25,z],[0,HY+.62+(i%2)*.08-Math.abs(i-3)*.06,z-.12],.08,'#3f6a2c',{seg:5}); }
  S.ell([0,HY+.12,.33],[.07,.08,.03],'#8dff79',{glow:1,rings:5,seg:8});
  S.tube([0,HY+.17,.02],[0,HY+.2,.02],.36,.36,'#4a3320',{seg:16,shine:.4});
  for(const s of [-1,1]){
    S.cone([s*.1,HY-.2,.31],[s*.13,HY-.02,.36],.045,'#fbfbf2',{seg:5,shine:.5});
    S.ring([s*.4,HY-.08,0],.08,.018,'#ffd568',{axis:'x',n:8,shine:.7});
  }
  S.cone([0,HY-.25,.22],[0,HY-.65,.34],.17,'#3f6a2c',{seg:8});
  S.ell([0,HY-.22,.2],[.2,.12,.14],'#4a6a2c',{rings:5,seg:9});
  /* наплечники с шипами */
  for(const s of [-1,1]){
    S.ell([s*.84,1.86,0],[.36,.26,.36],'#7a5a2c',{rings:6,seg:12,shine:.5});
    S.tube([s*.84,1.78,0],[s*.86,1.64,0],.38,.36,'#ffd568',{seg:12,shine:.6});
    for(let k=0;k<3;k++){ const a=(k-1)*.6; S.cone([s*.84+Math.sin(a)*.2,2.02,Math.cos(a)*.2-.05],[s*.9+Math.sin(a)*.3,2.42,Math.cos(a)*.3-.1],.075,'#e9d9b0',{seg:5,shine:.5}); }
  }
  /* аура: кольца, лучи, руны, нимб за спиной */
  S.ring([0,1.1,0],1.55,.07,'#8dff79',{glow:1,phase:t*.8,n:22});
  S.ring([0,1.1,0],1.75+Math.sin(t*2)*.05,.04,'#c8ef8d',{glow:1,phase:-t*.6,n:22});
  S.ring([0,.35,0],1.35,.03,'#8dff79',{glow:1,phase:t*.3,n:22});
  S.ring([0,2.1,-.55],.95,.04,'#8dff79',{glow:1,axis:'z',n:24,phase:t*.4});
  for(let i=0;i<10;i++){ const a=i/10*Math.PI*2+t*.4; S.cone([Math.cos(a)*.95,2.1+Math.sin(a)*.95,-.55],[Math.cos(a)*1.15,2.1+Math.sin(a)*1.15,-.55],.04,'#b8ff9a',{glow:1,seg:4}); }
  for(let i=0;i<8;i++){ const a=t*.7+i*.785, ph=(t*.4+i/8)%1; S.cone([Math.cos(a)*1.65,.2+ph*2.4,Math.sin(a)*1.65],[Math.cos(a)*1.65,.45+ph*2.4,Math.sin(a)*1.65],.045,'#b8ff9a',{glow:1,seg:5}); }
  for(let i=0;i<4;i++){ const a=-t*.5+i*1.57; S.box([Math.cos(a)*1.9,1.5+Math.sin(t+i)*.15,Math.sin(a)*1.9],[.18,.18,.03],'#8dff79',{glow:1,rot:[0,-a,.785]}); }
};

MODELS.malit=(S,d,t)=>{
  man(S,{bulk:1.3,face:false,cloth:'#b97952',pad:'#4f2b26',padTrim:'#e4b16f',arm:'#b97952',glove:'#4f2b26',legs:'#6a4630',armR:[.95,1.2,.4],armL:[-.8,1.15,.3],belt:'#e4b16f',trim:'#e4b16f',chest:'#8a5236',chestTrim:'#e4b16f',knee:'#4f2b26',bracer:'#4f2b26'});
  for(let i=0;i<6;i++){ const x=(i-2.5)*.16; S.ell([x*1.1,1.64,.34],[.045,.045,.03],'#e4b16f',{rings:3,seg:6,shine:.8}); }
  S.ell([0,2.08,0],[.33,.27,.33],'#4f2b26',{shine:.5});
  S.box([0,2.0,.25],[.36,.1,.06],'#f0c69a',{glow:1});
  S.box([0,2.12,.28],[.06,.2,.04],'#2a1410');
  S.tube([0,2.08,0],[0,2.15,0],.34,.34,'#e4b16f',{seg:14,shine:.6});
  for(const s of [-1,1]){ S.box([s*.33,1.92,.1],[.06,.34,.3],'#4f2b26'); S.cone([s*.32,2.2,0],[s*.62,2.52,-.1],.09,'#e4b16f',{seg:6,shine:.6}); S.ell([s*.58,1.75,0],[.3,.2,.3],'#4f2b26',{shine:.5}); for(let k=0;k<3;k++) S.cone([s*(.5+k*.1),1.93,0],[s*(.55+k*.12),2.2,0],.045,'#e4b16f',{seg:5}); }
  S.box([0,1.45,-.5],[.78,1.0,.4],'#4f2b26');
  for(let i=0;i<3;i++) S.tube([-.28+i*.28,1.9,-.5],[-.28+i*.28,2.6-i%2*.2,-.5],.07,.07,'#e4b16f');
  for(let i=0;i<3;i++) G(S,[-.28+i*.28,2.62-i%2*.2,-.5],.06,'#ff6a4a');
  S.tube([.7,1.85,.1],[.7,2.0,1.1],.1,.1,'#e7c27e'); S.ell([.7,2.0,1.1],[.1,.1,.06],'#ff6a4a',{glow:1,rings:4,seg:8});
  S.ring([.7,1.95,.9],.12,.02,'#4f2b26',{axis:'z',n:10});
  S.tube([.95,.5,.4],[1.1,2.0,.45],.07,.07,'#e4b16f');
  for(let i=0;i<3;i++) S.tube([.97+i*.05,.7+i*.4,.4],[.97+i*.05,.76+i*.4,.4],.1,.1,'#4f2b26');
  S.box([1.1,2.05,.45],[.5,.34,.28],'#8a8a8a',{shine:.7});
  for(const s of [-1,1]) S.cone([1.1+s*.27,2.05,.45],[1.1+s*.42,2.05,.45],.1,'#c8c8c8',{seg:6,shine:.8});
  S.cone([1.1,2.22,.45],[1.1,2.5,.45],.08,'#c8c8c8',{seg:6});
};

MODELS.arcady=(S,d,t)=>{
  man(S,{face:true,cloth:'#2a2f3a',arm:'#2a2f3a',glove:'#ef5b32',armR:[.55,1.3,.7],armL:[-.35,1.3,.95],legs:'#1d2129',belt:'#ef5b32',trim:'#ef5b32',knee:'#ef5b32',bracer:'#ef5b32',collar:'#ef5b32',skin:'#e0a97c',fo:{eye:'#ffb04a',glow:1,angry:.3,mouth:'grin'}});
  S.box([.0,1.35,.33],[.6,.7,.06],'#ef5b32');
  for(let i=0;i<4;i++) S.box([0,1.12+i*.15,.37],[.5,.025,.02],'#2a2f3a');
  for(let i=0;i<5;i++) S.tube([-.28+i*.07,.9,.4],[-.28+i*.07,1.15,.4],.035,.035,i%2?'#c0392b':'#ffd08a',{seg:6});
  S.tube([-.3,1.78,.2],[.3,.95,.38],.03,.03,'#3b2a22',{seg:5});
  for(const s of [-1,1]){ S.ell([s*.12,2.1,.2],[.1,.08,.07],'#17202b'); S.tube([s*.12,2.1,.2],[s*.12,2.1,.26],.09,.09,'#8a8a8a',{seg:10,shine:.7}); S.ell([s*.12,2.1,.27],[.065,.05,.03],'#ffd08a',{glow:1,rings:4,seg:8}); }
  S.tube([-.3,2.12,.05],[.3,2.12,.05],.025,.025,'#17202b',{seg:5});
  S.box([0,2.1,0],[.62,.05,.5],'#17202b');
  S.tube([0,2.3,0],[0,2.18,0],.0,.33,'#2a2f3a',{seg:12});
  for(let i=0;i<5;i++){const f=flick(t,i)*.06; S.cone([(i-2)*.1,2.25,0],[(i-2)*.1,2.7+(i%2)*.15-Math.abs(i-2)*.05+f,-.12],.09,'#ef5b32',{glow:1});}
  S.tube([-.22,1.7,0],[.22,1.7,0],.17,.17,'#ef5b32',{seg:12});
  S.box([-.1,1.55,.3],[.2,.4,.06],'#c0392b',{rot:[0,0,.15]});
  S.tube([.3,1.25,.2],[.3,1.35,1.45],.06,.05,'#ff8a5e'); S.box([.3,1.2,.4],[.1,.3,.5],'#3b2a22');
  S.tube([.3,1.3,1.1],[.3,1.35,1.45],.09,.07,'#8a8a8a',{shine:.7});
  S.ell([.3,1.35,1.5],[.06,.06,.05],'#ffd08a',{glow:1,rings:4,seg:8});
  S.cone([.3,1.35,1.5],[.3,1.4,2.1+flick(t,2)*.1],.1,'#ff762f',{glow:1,seg:7});
  S.cone([.3,1.35,1.5],[.3,1.38,1.85],.06,'#fff3b0',{glow:1,seg:6});
  S.tube([.1,1.9,-.38],[.1,1.2,-.4],.03,.03,'#8a8a8a',{seg:5});
  S.tube([-.1,1.6,-.38],[.3,1.4,.1],.03,.03,'#3b2a22',{seg:5});
  embers(S,t,.7,'#ff8a3a',5,2.0);
};

MODELS.illusionist=(S,d,t)=>{
  man(S,{nobelt:true,face:false,cloth:'#0e5461',bracer:'#79e4e4',armR:[.65,1.55,.45],armL:[-.65,1.55,.45],glove:'#eadbff',collar:'#79e4e4'});
  robe(S,.6,.45,1.55,'#0e5461','#79e4e4',1);
  cape(S,'#0b3a45','#79e4e4',1.0,1.9,.4,-.4,5);
  S.box([0,1.42,.4],[.2,.9,.03],'#eadbff');
  S.ell([0,1.62,.3],[.1,.05,.05],'#79e4e4',{glow:1,rings:4,seg:8});
  S.box([-.08,1.7,.3],[.14,.1,.04],'#eadbff',{rot:[0,0,.5]}); S.box([.08,1.7,.3],[.14,.1,.04],'#eadbff',{rot:[0,0,-.5]});
  S.ell([0,1.99,.1],[.24,.27,.18],'#eadbff');
  S.ell([0,1.98,.17],[.2,.11,.12],'#f3f3fb',{rings:5,seg:10,shine:.7});
  S.box([0,2.02,.255],[.4,.1,.03],'#11323a');
  S.ell([-.08,2.02,.27],[.045,.03,.02],'#79e4e4',{rings:4,seg:6,glow:1}); S.ell([.08,2.02,.27],[.045,.03,.02],'#79e4e4',{rings:4,seg:6,glow:1});
  S.box([0,1.88,.27],[.06,.08,.02],'#eadbff');
  S.box([0,1.82,.27],[.14,.012,.02],'#11323a');
  S.ring([.1,2.0,.3],.07,.012,'#ffd568',{axis:'z',n:10,shine:.8});
  S.tube([.1,1.93,.3],[.2,1.5,.34],.006,.006,'#ffd568',{seg:4});
  S.tube([0,2.22,0],[0,2.27,0],.46,.46,'#11323a',{seg:16});
  S.tube([0,2.24,0],[0,2.88,0],.27,.27,'#11323a');
  S.tube([0,2.3,0],[0,2.44,0],.275,.275,'#79e4e4',{glow:1});
  S.ell([.0,2.37,.28],[.05,.05,.02],'#ffd568',{glow:1,rings:4,seg:8});
  for(let i=0;i<4;i++){const a=t*1.1+i*Math.PI/2; const p=[Math.cos(a)*1.2,1.55+Math.sin(t*1.3+i)*.1,Math.sin(a)*1.2]; const ry=[0,-a+Math.PI/2,0];
    S.box(p,[.55,.9,.04],'#79e4e4',{glow:1,rot:ry});
    S.box(p,[.64,1.0,.03],'#eadbff',{rot:ry,shine:.7}); }
  S.tube([.65,.5,.45],[.65,1.5,.45],.025,.025,'#11323a');
  S.ell([.65,1.56,.45],[.06,.06,.06],'#79e4e4',{glow:1,rings:4,seg:8});
};

MODELS.shadow=(S,d,t)=>{
  man(S,{bulk:1.1,face:false,cloth:'#110507',skin:'#2a0a10',arm:'#1a0709',glove:'#2a0a10',armR:[.85,1.1,.5],armL:[-.85,1.1,.5],legs:'#08030b',belt:'#ff4b24',trim:'#ff4b24',headW:1.1,knee:'#2a0a10',bracer:'#2a0a10'});
  S.ell([0,1.5,.28],[.28,.3,.12],'#08030b',{shine:.6});
  for(let i=0;i<4;i++) S.box([0,1.64-i*.1,.36],[.4-i*.04,.03,.03],'#ff4b24',{glow:1});
  S.ell([0,1.4,.34],[.07,.07,.03],'#ff4b24',{glow:1,rings:4,seg:8});
  for(const s of [-1,1]){
    S.cone([s*.12,2.2,.0],[s*.4,3.0,-.15],.09,'#08030b');
    S.cone([s*.2,2.2,.0],[s*.6,2.6,-.1],.06,'#1a0709');
    S.ell([s*.1,2.04,.24],[.07,.05,.03],'#ff4b24',{glow:1,rings:4,seg:6});
    S.box([s*.1,2.1,.26],[.12,.02,.02],'#08030b',{rot:[0,0,s*.4]});
    for(let k=0;k<3;k++) S.cone([s*(.85+k*.03),1.1-.04*k,.5+k*.04],[s*(.95+k*.07),.9-.16*k,.75+k*.06],.035,'#ff4b24',{glow:1,seg:5});
    S.cone([s*.5,1.7,-.05],[s*.78,2.3,-.15],.12,'#08030b');
    S.cone([s*.62,1.75,0],[s*.9,2.1,-.1],.1,'#1a0709');
    S.box([s*.5,1.55,-.5],[.07,1.5,.9],'#08030b',{rot:[0.2,s*.5,s*.3]});
    S.box([s*.78,1.4,-.6],[.05,1.1,.7],'#1a0709',{rot:[0.2,s*.7,s*.4]});
  }
  for(let i=0;i<5;i++) S.box([0,2.0-.03*i,.255],[.1+.02*i,.012,.015],'#ff4b24',{glow:1});
  S.tube([0,2.3,-.02],[0,2.4,-.02],.3,.28,'#ff4b24',{glow:1,seg:12});
  for(let i=0;i<7;i++){const a=i*.9, f=flick(t,i); S.cone([Math.sin(a)*.4,1.7,-.2+Math.cos(a)*.2],[Math.sin(a)*.5,2.3+.2*f+(i%3)*.12,-.2+Math.cos(a)*.3],.07,'#ff4b24',{glow:1,seg:6});}
  for(let i=0;i<5;i++){const a=t*1.5+i*1.257; S.ell([Math.cos(a)*1.05,1.3+Math.sin(t*2+i)*.2,Math.sin(a)*1.05],[.09,.09,.09],'#ff7043',{glow:1,rings:5,seg:8});
    S.cone([Math.cos(a)*1.05,1.3+Math.sin(t*2+i)*.2,Math.sin(a)*1.05],[Math.cos(a-.5)*1.1,1.1+Math.sin(t*2+i)*.2,Math.sin(a-.5)*1.1],.06,'#ff7043',{glow:1,seg:5});}
  S.ring([0,.04,0],.9,.03,'#ff4b24',{glow:1,n:24,phase:t});
};

MODELS.electricGosha=(S,d,t)=>{
  man(S,{face:true,cloth:'#237aa3',arm:'#237aa3',glove:'#7feaff',armR:[.5,1.5,.8],armL:[-.5,1.5,.8],legs:'#174e68',belt:'#7feaff',trim:'#7feaff',knee:'#7feaff',bracer:'#7feaff',chest:'#174e68',chestTrim:'#7feaff',pad:'#174e68',padTrim:'#7feaff',fo:{eye:'#7feaff',glow:1,angry:.25,mouth:'grin'},collar:'#7feaff'});
  S.ell([0,1.5,.34],[.13,.13,.05],'#e8ffff',{glow:1,rings:6,seg:10});
  S.ring([0,1.5,.36],.17,.02,'#7feaff',{glow:1,axis:'z',n:12,phase:t*2});
  for(let i=0;i<10;i++){const a=-1.3+i*.29, hgt=.35+(i%3)*.12; S.cone([Math.sin(a)*.22,2.2+Math.cos(a)*.05,-.02],[Math.sin(a)*.5,2.2+hgt+.2,-.02-(i%2)*.1],.07,'#7feaff',{glow:1,seg:5});}
  S.tube([-.3,2.12,.15],[.3,2.12,.15],.04,.04,'#174e68',{seg:6});
  for(const s of [-1,1]){ S.tube([s*.12,2.1,.25],[s*.12,2.1,.3],.1,.1,'#174e68',{seg:10}); S.ell([s*.1,2.03,.25],[.05,.04,.03],'#e8ffff',{glow:1,rings:4,seg:6});
    S.tube([s*.55,1.75,0],[s*.55,2.1,0],.04,.04,'#8a8a8a',{seg:6}); S.ell([s*.55,2.15,0],[.08,.08,.08],'#7feaff',{glow:1,rings:4,seg:8});
    const p0=[s*.5,1.55,0], p1=[s*.75,1.9,.2], p2=[s*.55,1.6,.45], p3=[s*.5,1.5,.8];
    S.tube(p0,p1,.035,.035,'#b9f8ff',{glow:1,seg:5}); S.tube(p1,p2,.035,.035,'#b9f8ff',{glow:1,seg:5}); S.tube(p2,p3,.035,.035,'#b9f8ff',{glow:1,seg:5}); }
  const c=[0,1.55,1.0]; S.ell(c,[.26,.26,.26],'#b9f8ff',{glow:1,rings:6,seg:10});
  S.ring(c,.36,.02,'#7feaff',{glow:1,axis:'x',n:14,phase:t*3});
  for(let i=0;i<7;i++){const a=t*3+i*.9, b=t*2+i; const dir=norm([Math.cos(a),Math.sin(b),Math.sin(a)]); const e=add(c,mul(dir,.55+.1*flick(t,i))); S.cone(add(c,mul(dir,.2)),e,.05,'#7feaff',{glow:1,seg:5});
    S.cone(e,add(e,mul([Math.sin(b),Math.cos(a),Math.sin(i)],.18)),.035,'#e8ffff',{glow:1,seg:4}); }
  S.ring([0,.04,0],.8,.03,'#7feaff',{glow:1,n:22,phase:-t*2});
};

MODELS.mo3gi=(S,d,t)=>{
  man(S,{face:true,bulk:1.1,cloth:'#294638',arm:'#294638',glove:'#1e3328',legs:'#223a2d',boots:'#161c18',belt:'#3a4a3c',armR:[.4,1.25,.75],armL:[-.3,1.3,.95],knee:'#1e3328',bracer:'#3a4a3c',trim:'#7dffb0',skin:'#d9a07e',fo:{eye:'#3a2a1c',angry:.28,mouth:'stern',brow:'#1a1a14'}});
  S.box([0,1.4,.12],[.8,.7,.42],'#3a4a3c'); S.box([-.15,1.3,.35],[.2,.25,.06],'#1e3328'); S.box([.15,1.3,.35],[.2,.25,.06],'#1e3328');
  for(const s of [-1,1]){ S.box([s*.15,1.3,.39],[.16,.03,.02],'#7dffb0'); S.tube([s*.3,1.6,.3],[s*.3,1.45,.3],.03,.03,'#c0392b',{seg:6}); }
  for(let i=0;i<3;i++) S.ell([-.28+i*.12,1.6,.36],[.05,.07,.04],'#556b2f',{rings:4,seg:6});
  S.tube([-.4,1.75,.2],[.4,1.1,.4],.04,.04,'#1e3328',{seg:5});
  S.ell([0,2.12,0],[.34,.26,.34],'#1e3328',{shine:.5});
  S.tube([0,2.04,0],[0,2.08,0],.34,.34,'#3a4a3c',{seg:14});
  S.tube([-.12,2.08,.2],[.12,2.08,.2],.075,.075,'#17202b',{seg:10});
  S.box([0,2.02,.26],[.3,.07,.05],'#7dffb0',{glow:1});
  for(const s of [-1,1]){ S.box([s*.3,1.9,.12],[.04,.35,.25],'#1e3328'); }
  S.tube([0,1.82,.15],[0,1.78,.28],.12,.1,'#1e3328',{seg:10});
  S.box([0,1.5,-.45],[.7,.9,.3],'#1e3328');
  for(let i=0;i<3;i++) S.box([0,1.2+i*.28,-.31],[.6,.04,.04],'#3a4a3c');
  S.tube([.2,1.95,-.45],[.2,2.5,-.45],.03,.03,'#7dffb0',{glow:1,seg:5});
  S.ell([.2,2.52,-.45],[.05,.05,.05],'#7dffb0',{glow:1,rings:4,seg:6});
  S.box([.25,1.25,.2],[.12,.22,.7],'#222'); S.tube([.25,1.3,.5],[.25,1.35,1.5],.05,.05,'#222'); S.box([.25,1.42,.8],[.07,.1,.3],'#444');
  S.tube([.25,1.35,1.2],[.25,1.35,1.5],.08,.08,'#555',{seg:8,shine:.7});
  S.box([.25,1.1,.5],[.08,.28,.14],'#3a3a3a');
  const by=2.45+Math.sin(t*2)*.08, c=[1.05,by,.25];
  S.box(c,[.3,.1,.3],'#7dffb0',{glow:1});
  S.ell([c[0],c[1]-.1,c[2]],[.08,.06,.08],'#17202b',{rings:4,seg:8});
  S.ell([c[0],c[1]-.14,c[2]+.05],[.03,.03,.03],'#ff4b24',{glow:1,rings:3,seg:5});
  for(const [dx,dz] of [[1,1],[-1,1],[1,-1],[-1,-1]]){ const p=[c[0]+dx*.22,c[1]+.04,c[2]+dz*.22]; S.tube(c,p,.015,.015,'#444',{seg:4}); S.tube(add(p,[0,.01,0]),add(p,[Math.cos(t*30)*.16,.01,Math.sin(t*30)*.16]),.012,.012,'#9aa',{seg:4}); }
};

MODELS.tribupainer=(S,d,t)=>{
  man(S,{nobelt:true,face:true,bulk:1.1,cloth:'#4a3028',arm:'#4a3028',glove:'#2c1b15',legs:'#2c1b15',armR:[.45,1.2,.6],armL:[-.15,1.3,1.1],beard:'#2c1b15',skin:'#d9a07e',fo:{eye:'#7a5a2c',angry:.3,mouth:'stern',brow:'#2c1b15'},bracer:'#6b4423',collar:'#ffb36b'});
  robe(S,.58,.5,1.4,'#4a3028','#ffb36b');
  for(let i=0;i<8;i++){ S.tube([-.35+i*.1,1.75-i*.06,.38],[-.35+i*.1,1.6-i*.06,.38],.03,.03,i%2?'#c0392b':'#ffd08a',{seg:6}); }
  S.tube([-.4,1.8,.32],[.4,1.1,.4],.045,.045,'#6b4423',{seg:6});
  S.box([0,1.0,.45],[.9,.1,.1],'#6b4423'); for(let i=0;i<5;i++) S.box([-.36+i*.18,.96,.5],[.1,.14,.08],'#ffb36b');
  S.tube([0,2.22,0],[0,2.28,0],.64,.64,'#2c1b15',{seg:16});
  S.tube([0,2.25,0],[0,2.64,0],.3,.28,'#2c1b15',{seg:12});
  S.tube([0,2.3,0],[0,2.4,0],.31,.31,'#ffb36b',{seg:12,shine:.6});
  S.ell([0,2.45,.27],[.06,.06,.02],'#ffd08a',{glow:1,rings:4,seg:6});
  for(const s of [-1,1]){ S.tube([.45+s*.06,1.3,.1],[.45+s*.06,1.34,2.2],.06,.06,'#8a8a8a',{shine:.7});
    S.tube([.45+s*.06,1.32,1.9],[.45+s*.06,1.34,2.22],.075,.075,'#555',{shine:.7});
    S.ell([.45+s*.06,1.34,2.22],[.07,.07,.05],'#ffb36b',{glow:1,rings:4,seg:8}); }
  S.cone([.45,1.34,2.3],[.45,1.36,2.65+flick(t,1)*.06],.08,'#ff9a3c',{glow:1,seg:6});
  S.box([.45,1.28,1.1],[.22,.16,.8],'#6b4423',{shine:.4});
  S.box([.45,1.2,-.15],[.18,.3,.7],'#6b4423',{rot:[-.2,0,0]});
  for(let i=0;i<4;i++) S.box([.45,1.15+i*.0,.0+i*.28],[.26,.03,.03],'#ffb36b',{shine:.6});
  S.tube([.45,1.4,.2],[.45,1.7,.1],.05,.05,'#8a8a8a',{seg:6});
};

MODELS.mageHunter=(S,d,t)=>{
  man(S,{nobelt:true,face:false,cloth:'#24184d',arm:'#24184d',glove:'#a980ff',armR:[.8,1.2,.55],armL:[-.8,1.2,.55],legs:'#160f33',bracer:'#a980ff',knee:'#a980ff',collar:'#a980ff',chest:'#160f33',chestTrim:'#a980ff'});
  robe(S,.52,.4,1.35,'#24184d','#a980ff',1);
  cape(S,'#160f33','#a980ff',.95,2.0,.5,-.4,5);
  S.ell([0,1.42,.3],[.1,.12,.04],'#d58cff',{glow:1,rings:5,seg:8});
  S.ring([0,1.42,.32],.15,.015,'#a980ff',{glow:1,axis:'z',n:12});
  for(let i=0;i<5;i++) S.box([0,1.7-i*.17,.36],[.03,.1,.02],'#a980ff',{glow:1});
  S.cone([0,2.0,-.1],[0,2.75,-.3],.38,'#160f33',{seg:14}); S.ell([0,2.0,-.04],[.32,.34,.32],'#160f33');
  S.box([0,1.9,.15],[.38,.28,.1],'#0a0618');
  S.ell([0,1.97,.1],[.2,.22,.15],'#2a1a50');
  S.ell([0,1.85,.14],[.18,.14,.1],'#a980ff',{rings:5,seg:8,shine:.7});
  S.ell([-.09,1.99,.23],[.055,.04,.03],'#d58cff',{glow:1,rings:4,seg:6}); S.ell([.09,1.99,.23],[.055,.04,.03],'#d58cff',{glow:1,rings:4,seg:6});
  S.cone([0,2.15,.16],[0,2.4,.2],.035,'#d58cff',{seg:4,glow:1});
  for(const s of [-1,1]){
    S.ell([s*.6,1.75,0],[.28,.18,.28],'#2a1a50',{shine:.5});
    for(let k=0;k<3;k++) S.cone([s*(.52+k*.1),1.9,0],[s*(.6+k*.12),2.2+k*.05,-.05],.05,'#a980ff',{seg:5,shine:.6});
    S.obox([s*.8,1.2,.55],[s*1.05,1.8,.9],.1,.03,'#d58cff',{glow:1});
    S.obox([s*.8,1.2,.55],[s*.95,1.5,.7],.18,.06,'#a980ff',{shine:.7});
    S.obox([s*.8,1.2,.55],[s*.72,.95,.48],.04,.04,'#a980ff',{shine:.7}); }
  for(let i=0;i<3;i++){ const a=t*1.3+i*2.09; S.box([Math.cos(a)*1.1,1.2+Math.sin(t*2+i)*.2,Math.sin(a)*1.1],[.12,.12,.02],'#d58cff',{glow:1,rot:[0,-a,.785]}); }
};

MODELS.regina=(S,d,t)=>{
  const red=d.skinId==='reginaRed';
  const hair=red?'#641126':'#3a1a2a', cloth=red?'#5b101e':'#6e3048', acc=red?'#ff4058':'#ff9fbd';
  man(S,{nobelt:true,bulk:.9,face:true,cloth:cloth,arm:cloth,glove:'#e9b39e',skin:'#e9b39e',armR:[.8,1.3,.6],armL:[-.8,1.3,.6],legs:'#2a1520',belt:acc,trim:acc,bracer:acc,knee:acc,chest:'#2a1520',chestTrim:acc,pad:'#2a1520',padTrim:acc,fo:{eye:red?'#ff4058':'#ff9fbd',glow:1,angry:.22,mouth:'smile',lip:red?'#8a1426':'#c0506a',brow:hair,cheeks:'#f09a90'},collar:acc});
  S.tube([0,.7,0],[0,1.05,0],.55,.3,cloth,{seg:12});
  for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; S.box([Math.sin(a)*.5,.78,Math.cos(a)*.5],[.2,.4,.04],'#2a1520',{rot:[Math.cos(a)*-.25,a,Math.sin(a)*.25],shine:.4}); S.box([Math.sin(a)*.52,.6,Math.cos(a)*.52],[.2,.03,.05],acc,{rot:[0,a,0],glow:0,shine:.6}); }
  S.tube([0,.92,0],[0,1.04,0],.4,.4,acc,{seg:16,shine:.5});
  S.ell([0,2.05,-.04],[.31,.33,.3],hair);
  for(let i=0;i<5;i++){ const x=(i-2)*.1; S.cone([x,2.26,.14],[x*1.2,2.08,.27],.06,hair,{seg:5}); }
  S.ell([0,1.98,.1],[.22,.25,.17],'#e9b39e');
  S.tube([0,2.26,.02],[0,2.32,.02],.3,.3,acc,{seg:14,shine:.6});
  G(S,[0,2.3,.3],.05,acc);
  S.tube([0,2.1,-.28],[0,1.5,-.45],.09,.05,hair,{seg:8}); S.tube([0,1.5,-.45],[0,.8,-.4],.06,.02,hair,{seg:8});
  S.ell([0,2.12,-.3],[.09,.09,.09],acc,{rings:5,seg:8,shine:.6});
  for(const s of [-1,1]){ S.ell([s*.35,1.7,-.1],[.1,.4,.1],hair); S.cone([s*.36,1.35,-.1],[s*.34,.95,-.1],.08,hair,{seg:6}); S.obox([s*.8,1.3,.6],[s*1.0,1.95,.95],.1,.03,acc,{glow:1}); S.obox([s*.8,1.3,.6],[s*.9,.95,.5],.07,.03,'#2a1520',{shine:.5}); S.box([s*.8,1.28,.6],[.14,.06,.14],acc,{shine:.7});
    S.box([s*.12,2.14,.22],[.06,.02,.02],hair,{rot:[0,0,s*.4]}); }
  S.cone([-.15,1.62,.35],[-.4,1.35,.28],.04,acc,{seg:4,glow:1}); S.cone([.15,1.62,.35],[.4,1.35,.28],.04,acc,{seg:4,glow:1});
  embers(S,t,.9,acc,4,2.0);
};

MODELS.yosyp=(S,d,t)=>{
  man(S,{bulk:1.15,face:false,cloth:'#42612d',arm:'#42612d',glove:'#8aa65a',skin:'#8aa65a',armR:[.9,1.1,.4],armL:[-.75,1.0,.35],legs:'#344623',headW:1.1,knee:'#344623',bracer:'#2a3a1c',trim:'#a7ff70',chest:'#344623'});
  S.ell([0,1.5,-.15],[.5,.55,.38],'#42612d');
  for(let i=0;i<3;i++){ const x=(i-1)*.28; S.tube([x,1.1,-.45],[x,2.0,-.45],.12,.12,'#9fb89a',{seg:10,shine:.7}); S.tube([x,1.1,-.45],[x,1.55+i*.1,-.45],.1,.1,'#a7ff70',{glow:1,seg:10}); S.tube([x,2.0,-.45],[x,2.1,-.45],.07,.07,'#2a3a1c',{seg:8}); }
  S.tube([-.3,1.7,-.3],[-.3,1.4,.2],.025,.025,'#2a3a1c',{seg:5}); S.tube([.3,1.7,-.3],[.3,1.4,.2],.025,.025,'#2a3a1c',{seg:5});
  S.cone([0,1.95,0],[0,2.65,-.25],.34,'#344623',{seg:14}); S.ell([0,2.0,-.02],[.32,.35,.32],'#344623');
  S.ell([0,1.9,.15],[.22,.18,.16],'#2a3a1c',{rings:6,seg:10,shine:.5});
  for(const s of [-1,1]){ S.tube([s*.1,2.0,.2],[s*.1,2.0,.3],.1,.1,'#2a3a1c',{seg:10}); S.ell([s*.1,2.0,.3],[.07,.06,.03],'#a7ff70',{glow:1,rings:4,seg:6}); }
  S.tube([-.1,1.8,.3],[-.1,1.5,.35],.05,.05,'#2a3a1c',{seg:6}); S.tube([.1,1.8,.3],[.1,1.5,.35],.05,.05,'#2a3a1c',{seg:6});
  S.ell([0,1.8,.33],[.1,.1,.05],'#2a3a1c',{rings:4,seg:8});
  for(const s of [-1,1]){ S.ell([s*.62,1.86,.02],[.17,.12,.17],'#d9f5a6',{rings:5,seg:8}); S.tube([s*.62,1.86,.02],[s*.62,1.76,.02],.11,.1,'#c4a67a',{seg:8}); }
  S.tube([.9,.25,.4],[.95,2.0,.45],.1,.15,'#d9f5a6',{shine:.6}); S.ell([.95,2.1,.45],[.2,.17,.2],'#a7ff70',{glow:1});
  for(let i=0;i<3;i++) G(S,[.9+Math.sin(t*3+i)*.2,2.35+((t*.7+i*.33)%1)*.4,.45+Math.cos(t*3+i)*.2],.05,'#a7ff70');
  S.tube([-.3,1.4,-.5],[-.3,2.1,-.5],.12,.12,'#344623'); S.ell([-.3,2.15,-.5],[.12,.1,.12],'#a7ff70',{glow:1});
  for(let i=0;i<4;i++) S.ell([Math.cos(t*1.2+i*1.57)*.9,.4+((t*.6+i*.25)%1)*1.5,Math.sin(t*1.2+i*1.57)*.9],[.08,.08,.08],'#a7ff70',{glow:1,rings:4,seg:6});
  G(S,[.9,.55-((t*.8)%1)*.3,.4],.04,'#a7ff70');
  S.ring([0,.012,0],1.1,.035,'#a7ff70',{glow:1,n:26,phase:t*.5});
  S.ring([0,.012,0],.8,.025,'#a7ff70',{glow:1,n:22,phase:-t*.7});
};

MODELS.dawnMaiden=(S,d,t)=>{
  man(S,{bulk:1.05,face:true,cloth:'#8a5424',arm:'#8a5424',forearm:'#fff3b0',pad:'#fff3b0',padTrim:'#ffe39a',glove:'#fff3b0',legs:'#6a3f18',armR:[.85,1.25,.5],armL:[-.7,1.3,.3],belt:'#fff3b0',trim:'#ffe39a',chest:'#fff3b0',chestTrim:'#d7a24a',knee:'#fff3b0',bracer:'#ffe39a',collar:'#fff3b0',toe:'#fff3b0',skin:'#f0c69a',fo:{eye:'#ffcf5a',glow:1,angry:-.05,mouth:'smile',lip:'#c0605a',cheeks:'#f4a890'}});
  S.tube([0,.7,0],[0,1.05,0],.6,.32,'#fff3b0',{seg:12});
  for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; S.box([Math.sin(a)*.52,.78,Math.cos(a)*.52],[.2,.38,.04],'#fff8e0',{rot:[Math.cos(a)*-.22,a,Math.sin(a)*.22],shine:.5}); S.box([Math.sin(a)*.54,.6,Math.cos(a)*.54],[.2,.03,.05],'#ffe39a',{rot:[0,a,0],glow:1}); }
  cape(S,'#fff8e0','#ffe39a',.9,2.0,.6,-.42,5);
  S.ell([0,1.46,.34],[.08,.08,.04],'#ffe39a',{glow:1,rings:5,seg:8});
  for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; S.cone([Math.cos(a)*.1,1.46+Math.sin(a)*.1,.36],[Math.cos(a)*.17,1.46+Math.sin(a)*.17,.38],.02,'#ffe39a',{glow:1,seg:4}); }
  S.ell([0,2.1,0],[.31,.27,.31],'#fff3b0',{shine:.7}); 
  S.ell([0,1.98,.16],[.2,.2,.12],'#f0c69a');
  S.box([0,2.0,.25],[.2,.05,.05],'#1a1208');
  S.tube([0,2.22,0],[0,2.26,0],.3,.3,'#ffe39a',{seg:14,shine:.7});
  S.box([0,2.15,.28],[.05,.18,.04],'#fff3b0',{shine:.7});
  for(const s of [-1,1]){ for(let k=0;k<4;k++) S.box([s*(.4+k*.1),2.3+k*.08,-.05-k*.05],[.05,.5-k*.05,.2],'#ffe39a',{rot:[0,0,-s*(.5+k*.12)],glow:1}); }
  S.ring([0,2.75+Math.sin(t*2)*.04,0],.3,.05,'#fff3b0',{glow:1,n:14});
  S.ring([0,2.2,-.15],.85,.035,'#ffe39a',{glow:1,axis:'z',n:30,phase:t*.3});
  for(let i=0;i<12;i++){ const a=i/12*Math.PI*2+t*.3; S.cone([Math.cos(a)*.95,2.2+Math.sin(a)*.95,-.15],[Math.cos(a)*1.15,2.2+Math.sin(a)*1.15,-.15],.035,'#ffe39a',{glow:1,seg:4}); }
  S.tube([.85,.85,.5],[.85,1.9,.5],.06,.06,'#5b3a1e'); S.box([.85,2.05,.5],[.7,.35,.35],'#ffe39a',{glow:1});
  S.box([.85,2.05,.5],[.8,.2,.4],'#d7a24a',{shine:.7});
  S.ell([.85,2.05,.7],[.09,.09,.04],'#fff3b0',{glow:1,rings:4,seg:8});
  S.ell([-.85,1.2,.3],[.07,.5,.4],'#fff3b0',{shine:.7});
  S.ell([-.88,1.2,.3],[.05,.2,.18],'#ffe39a',{glow:1,rings:5,seg:8});
  for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; S.cone([-.9,1.2+Math.sin(a)*.2,.3+Math.cos(a)*.2],[-.97,1.2+Math.sin(a)*.5,.3+Math.cos(a)*.5],.03,'#ffe39a',{glow:1,seg:4}); }
};

MODELS.exileKnight=(S,d,t)=>{
  man(S,{bulk:1.2,face:false,cloth:'#18384f',arm:'#18384f',forearm:'#2c5878',pad:'#2c5878',padTrim:'#9bdfff',glove:'#0c1e2c',legs:'#102a3c',belt:'#9bdfff',trim:'#9bdfff',armR:[.9,1.2,.5],armL:[-.8,1.1,.4],knee:'#2c5878',bracer:'#2c5878',chest:'#2c5878',chestTrim:'#9bdfff',collar:'#2c5878',toe:'#2c5878'});
  cape(S,'#10202c','#9bdfff',1.1,1.95,.4,-.42,5);
  S.box([0,1.4,.37],[.5,.8,.03],'#18384f'); S.ell([0,1.55,.4],[.09,.09,.03],'#9bdfff',{glow:1,rings:4,seg:8}); S.box([0,1.35,.39],[.08,.5,.02],'#9bdfff');
  for(let i=0;i<5;i++){ const x=(i-2)*.17; S.box([x,.75,.3],[.15,.4,.04],'#2c5878',{rot:[-.1,0,0],shine:.5}); }
  S.ell([0,2.1,0],[.34,.31,.34],'#2c5878',{shine:.6});
  S.box([0,2.05,.28],[.3,.05,.05],'#9bdfff',{glow:1});
  S.box([0,2.0,.3],[.04,.28,.03],'#2c5878');
  for(const s of [-1,1]){ S.box([s*.32,1.9,.1],[.05,.35,.3],'#2c5878',{shine:.5}); }
  S.tube([0,2.2,0],[0,2.26,0],.32,.32,'#9bdfff',{seg:14,shine:.6});
  S.cone([0,2.35,0],[0,2.7,-.2],.08,'#9bdfff');
  for(let i=0;i<5;i++){ S.cone([0,2.3,-.05-i*.06],[0,2.55-i*.07,-.3-i*.1],.07,'#9bdfff',{seg:6,glow:i===0}); }
  for(const s of [-1,1]){ S.ell([s*.62,1.72,0],[.28,.2,.28],'#2c5878',{shine:.5}); for(let k=0;k<3;k++) S.cone([s*(.55+k*.08),1.9,k*.05-.05],[s*(.6+k*.1),2.2,k*.07-.07],.045,'#9bdfff',{seg:5}); }
  for(let i=0;i<3;i++) S.tube([-.8,1.1-i*.12,.4],[-.8,.95-i*.12,.4],.1,.1,'#9bdfff',{seg:8,shine:.5,glow:0});
  S.ell([-.8,.7,.4],[.05,.12,.05],'#9bdfff',{glow:1,rings:4,seg:6});
  S.obox([.9,1.1,.5],[1.0,3.0,.6],.2,.05,'#ff707a',{glow:1}); S.box([.9,1.15,.5],[.6,.08,.14],'#9bdfff');
  S.obox([.9,1.2,.5],[1.0,2.9,.6],.06,.055,'#ffe0e2',{glow:1});
  S.tube([.9,.95,.5],[.9,1.1,.5],.06,.06,'#2c5878'); S.ell([.9,.9,.5],[.09,.09,.09],'#9bdfff',{shine:.7});
  for(let i=0;i<5;i++){ const ph=(t*.4+i/5)%1; G(S,[.95,1.3+ph*1.5,.55+Math.sin(t*2+i)*.1],.03,'#ff707a'); }
};

MODELS.juvsyut=(S,d,t)=>{
  const sk='#f2a36f';
  man(S,{face:true,bulk:1.5,gap:.23,hipY:.8,cloth:'#7b432d',skin:sk,headY:1.95,shY:1.5,armR:[1.0,1.0,.3],armL:[-1.0,1.0,.3],glove:sk,belt:'#ffd568',legs:'#4a2a1c',trim:'#ffd568',bracer:'#3a2a1c',knee:'#4a2a1c',pad:'#3a2a1c',padTrim:'#ffd568',fo:{eye:'#3a2a1c',angry:.35,mouth:'grin',lip:'#6a2a22',brow:'#2a1008',cheeks:'#e08a60'},headW:1.05,arm:sk,forearm:sk});
  S.ell([0,1.12,.15],[.95,.8,.72],'#7b432d',{rings:9,seg:14});
  S.ell([0,1.5,.25],[.7,.36,.45],'#5a2f1d',{rings:7,seg:12});
  for(let i=0;i<4;i++) S.box([0,1.7-i*.2,.62],[.7-i*.05,.04,.03],'#ffd568',{shine:.7});
  S.box([0,1.0,.82],[.34,.2,.04],'#ffd568',{shine:.7}); G(S,[0,1.0,.85],.06,'#c0392b',{glow:0,shine:.7});
  for(let i=0;i<4;i++){ S.box([(i-1.5)*.3,.45,.55],[.22,.5,.05],'#5a2f1d',{rot:[-.15,0,(i-1.5)*.06]}); }
  S.tube([0,2.2,0],[0,2.28,0],.34,.34,'#c0392b',{seg:14,shine:.4});
  S.tube([-.3,2.0,.0],[.3,2.0,.0],.02,.02,'#c0392b',{seg:5});
  S.box([-.35,2.2,-.15],[.1,.06,.5],'#c0392b',{rot:[0,0,-.5]});
  S.cone([0,2.22,0],[0,2.62,-.1],.12,'#2a1008',{seg:6}); 
  for(const s of [-1,1]){
    S.ring([s*.34,1.9,0],.08,.02,'#ffd568',{axis:'x',n:8,shine:.8});
    S.cone([s*.08,1.8,.27],[s*.1,1.98,.31],.04,'#fbfbf2',{seg:5,shine:.5});
    S.ell([s*.8,1.8,0],[.34,.24,.34],'#3a2a1c',{rings:6,seg:12,shine:.4});
    for(let k=0;k<3;k++) S.cone([s*(.72+k*.08),1.95,(k-1)*.12],[s*(.78+k*.1),2.3,(k-1)*.15],.07,'#d6c7a0',{seg:5,shine:.5});
    for(let k=0;k<3;k++) S.cone([s*1.0+(k-1)*.12,.9,.3],[s*1.0+(k-1)*.14,.9,.55],.035,'#8a8a8a',{seg:5,shine:.8});
  }
  for(let i=0;i<7;i++){ const a=-.9+i*.3; S.ell([Math.sin(a)*.28,1.78+Math.cos(a)*-.04,.3-Math.abs(a)*.1],[.04,.07,.03],'#e9d9b0',{rings:4,seg:6,shine:.6}); }
  S.tube([.0,1.84,.26],[0,1.65,.34],.01,.01,'#3a2a1c',{seg:4});
  S.tube([1.0,.45,.35],[1.15,2.0,.4],.1,.2,'#d69a61'); S.ell([1.15,2.05,.4],[.2,.14,.2],'#d69a61');
  S.tube([1.02,.7,.36],[1.05,.8,.36],.14,.14,'#3a2a1c',{seg:8});
  for(let i=0;i<5;i++){const a=i*1.26; S.cone([1.15+Math.cos(a)*.15,1.8+(i%2)*.15,.4+Math.sin(a)*.15],[1.15+Math.cos(a)*.36,1.8+(i%2)*.15,.4+Math.sin(a)*.36],.05,'#8a8a8a',{seg:5,shine:.8});}
  S.cone([1.15,2.15,.4],[1.15,2.45,.4],.07,'#8a8a8a',{seg:5,shine:.8});
};

MODELS.chip=(S,d,t)=>{
  man(S,{nobelt:true,face:true,bulk:1.0,cloth:'#49376d',arm:'#49376d',glove:'#ffd568',armR:[.8,1.3,.45],armL:[-.65,1.35,.55],legs:'#2c2145',belt:'#ffd568',trim:'#ffd568',bracer:'#ffd568',beard:'#f5f0e8',knee:'#ffd568',collar:'#f5f0e8',pad:'#ffd568',padTrim:'#fff3b0',fo:{eye:'#4a7aff',angry:.0,mouth:'smile',brow:'#f5f0e8',lip:'#a0505a'}});
  robe(S,.6,.45,1.5,'#49376d','#f5f0e8');
  cape(S,'#8f1d3a','#f5f0e8',1.05,2.0,.45,-.4,5);
  for(let i=0;i<9;i++){ S.ell([(i-4)*.12,1.72,.0+Math.abs(i-4)*-.02],[.1,.08,.1],'#f5f0e8',{rings:4,seg:6}); }
  S.tube([0,1.35,0],[0,1.45,0],.45,.45,'#ffd568',{seg:18,shine:.7});
  for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; G(S,[Math.sin(a)*.46,1.4,Math.cos(a)*.46],.045,i%2?'#c0392b':'#4a7aff',{glow:0,shine:.8}); }
  S.ell([0,1.15,.45],[.13,.13,.04],'#ffd568',{shine:.7}); S.ell([0,1.15,.48],[.08,.08,.03],'#c0392b',{glow:1,rings:4,seg:8});
  S.ell([0,1.85,.18],[.2,.24,.12],'#eee');
  S.tube([0,2.25,0],[0,2.55,0],.3,.34,'#ffd568',{seg:10,glow:1});
  S.tube([0,2.25,0],[0,2.33,0],.31,.31,'#c0392b',{seg:10,shine:.5});
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2; S.cone([Math.cos(a)*.31,2.55,Math.sin(a)*.31],[Math.cos(a)*.33,2.9,Math.sin(a)*.33],.06,'#ffd568',{glow:1,seg:5}); G(S,[Math.cos(a)*.33,2.93,Math.sin(a)*.33],.04,i%2?'#4a7aff':'#c0392b'); }
  G(S,[0,2.4,.33],.05,'#4a7aff');
  S.tube([.8,.2,.45],[.8,2.3,.45],.045,.045,'#ffd568'); 
  for(let i=0;i<3;i++) S.tube([.8,.8+i*.5,.45],[.8,.86+i*.5,.45],.07,.07,'#fff3b0',{shine:.7});
  S.ell([.8,2.45,.45],[.16,.16,.16],'#c0392b',{glow:1});
  for(let i=0;i<4;i++){const a=i*1.57; S.cone([.8+Math.cos(a)*.1,2.3,.45+Math.sin(a)*.1],[.8+Math.cos(a)*.22,2.55,.45+Math.sin(a)*.22],.035,'#ffd568',{seg:5,shine:.7});}
  for(let i=0;i<6;i++){const a=t*1.4+i*1.047; S.ell([Math.cos(a)*1.15,1.2+Math.sin(t*2+i)*.2,Math.sin(a)*1.15],[.13,.03,.13],'#ffd568',{glow:1,rings:4,seg:8,rot:[.5,a,0]});}
};

MODELS.savely=(S,d,t)=>{
  const sk='#e8b894';
  man(S,{face:true,bulk:1.5,gap:.23,hipY:.8,cloth:'#254f68',skin:sk,headY:1.95,shY:1.5,armR:[1.0,1.0,.35],armL:[-.95,1.05,.5],glove:'#ffcc66',legs:'#ffcc66',belt:'#ffcc66',boots:'#222',trim:'#ffcc66',pad:'#ffcc66',padTrim:'#254f68',bracer:'#ffcc66',knee:'#254f68',toe:'#ffcc66',fo:{eye:'#3a2a1c',angry:.1,mouth:'grin',cheeks:'#e09a80'},headW:1.05});
  S.ell([0,1.12,.15],[.92,.8,.7],'#254f68',{rings:9,seg:14});
  S.box([0,1.2,.84],[.44,.44,.03],'#ffcc66');
  S.box([0,1.2,.86],[.1,.3,.02],'#254f68'); S.box([-.1,1.3,.86],[.1,.08,.02],'#254f68');S.box([.1,1.3,.86],[.1,.08,.02],'#254f68');
  for(const s of [-1,1]) for(let k=0;k<2;k++) S.box([s*(.45+k*.18),1.12,.65],[.07,.7,.03],'#ffcc66',{rot:[0,s*.7,0]});
  for(let i=0;i<3;i++) S.box([0,1.5-i*.0,.7],[0,0,0],'#254f68');
  S.box([0,2.0,.25],[.4,.08,.06],'#ffcc66',{glow:1});
  S.ell([0,2.0,0],[.31,.31,.31],'#3a4a58',{rings:8,seg:14,shine:.7});
  S.ell([0,1.95,.14],[.24,.24,.18],sk);
  S.tube([0,2.15,0],[0,2.2,0],.33,.33,'#ffcc66',{seg:14,shine:.6});
  S.box([0,2.18,.0],[.1,.03,.6],'#ffcc66');
  S.ell([0,1.8,.28],[.09,.07,.04],'#8a3b3b',{rings:3,seg:6});
  S.tube([0,2.25,0],[0,2.65,0],.02,.02,'#aaa',{seg:5}); S.ell([0,2.7,0],[.07,.07,.07],'#ffcc66',{glow:1,rings:4,seg:6});
  S.ring([0,2.7,0],.2,.012,'#ffcc66',{glow:1,axis:'x',n:10,phase:t*3});
  for(const s of [-1,1]){ S.tube([s*.9,1.6,0],[s*.95,1.1,.1],.07,.07,'#8a8a8a',{seg:6});
    S.ell([s*.78,1.76,0],[.34,.22,.34],'#ffcc66',{rings:6,seg:12,shine:.6});
    S.box([s*.78,1.8,.0],[.5,.04,.2],'#254f68',{rot:[0,0,-s*.15]});
    S.box([s*.45,1.2,.5],[.04,.1,.4],'#ffcc66',{rot:[0,s*.5,0],glow:0});
  }
  S.ell([-.95,.9,.9],[.28,.28,.28],'#f3f3f3',{rings:6,seg:10}); S.ell([-.95,.9,1.15],[.1,.1,.06],'#222',{rings:4,seg:6});
  for(let i=0;i<5;i++){ const a=i/5*Math.PI*2; S.ell([-.95+Math.cos(a)*.21,.9+Math.sin(a)*.21,.95],[.06,.06,.03],'#222',{rings:3,seg:5}); }
  S.box([-.95,.92,1.18],[.03,.3,.02],'#fff'); for(let i=0;i<3;i++) S.box([-.95,.82+i*.08,1.19],[.14,.02,.02],'#fff');
  S.tube([1.0,.4,.35],[1.1,2.0,.4],.1,.18,'#ffcc66');
  S.tube([1.0,.6,.36],[1.03,.7,.37],.14,.14,'#254f68',{seg:8});
  S.ell([1.1,2.05,.4],[.2,.14,.2],'#ffcc66');
  G(S,[0,1.2,.88],.04,'#7feaff');
  S.ring([0,.04,0],.9,.03,'#ffcc66',{glow:1,n:22,phase:t});
};

MODELS.juggernaut=(S,d,t)=>{
  man(S,{face:false,bulk:1.1,cloth:'#8a241f',arm:'#8a241f',glove:'#3a1210',skin:'#d9b08a',legs:'#5a1612',armR:[.6,1.3,.8],armL:[-.55,1.35,.7],belt:'#ffe7a2',trim:'#ffe7a2',bracer:'#3a1210',pad:'#3a1210',padTrim:'#ffe7a2',collar:'#3a1210'});
  S.tube([0,.1,0],[0,1.0,0],.42,.3,'#5a1612',{seg:12});
  for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; S.box([Math.sin(a)*.42,.5,Math.cos(a)*.42],[.04,.8,.04],'#3a1210',{rot:[0,a,0]}); }
  S.tube([0,.95,0],[0,1.05,0],.45,.45,'#ffe7a2',{seg:16,shine:.6});
  S.box([.0,1.4,.36],[.2,.8,.03],'#ffe7a2');
  S.ell([0,2.0,-.02],[.3,.32,.3],'#3a1210'); S.ell([0,1.99,.1],[.23,.27,.17],'#ffe7a2',{shine:.6});
  S.box([-.09,2.03,.25],[.1,.03,.02],'#222',{rot:[0,0,.2]}); S.box([.09,2.03,.25],[.1,.03,.02],'#222',{rot:[0,0,-.2]});
  S.box([0,1.9,.26],[.05,.1,.02],'#c0392b'); S.box([0,1.86,.26],[.14,.015,.02],'#222');
  S.ell([-.17,1.95,.2],[.05,.08,.02],'#c0392b',{rings:3,seg:5});S.ell([.17,1.95,.2],[.05,.08,.02],'#c0392b',{rings:3,seg:5});
  S.tube([0,2.1,-.3],[0,1.35,-.5],.07,.04,'#2a1008');
  S.tube([0,2.1,-.3],[0,1.5,-.55],.05,.03,'#3a1210',{seg:6});
  S.ell([0,2.3,0],[.34,.14,.34],'#d9b08a',{shine:.4});
  S.cone([0,2.25,0],[0,2.62,0],.46,'#d9b08a',{seg:18,shine:.4});
  S.tube([0,2.24,0],[0,2.3,0],.5,.5,'#8a6a3a',{seg:18});
  S.ell([0,2.62,0],[.05,.05,.05],'#8a6a3a');
  for(let i=0;i<10;i++){ const a=i/10*Math.PI*2; S.tube([Math.sin(a)*.46,2.25,Math.cos(a)*.46],[Math.sin(a)*.46,2.28,Math.cos(a)*.46],.045,.045,'#3a1210',{seg:5}); }
  S.tube([0,1.5,0],[0,1.6,0],.3,.3,'#3a1210',{seg:12});
  S.ell([-.6,1.8,0],[.3,.18,.3],'#3a1210',{shine:.5}); S.ell([.6,1.8,0],[.3,.18,.3],'#3a1210',{shine:.5});
  S.obox([.6,1.25,.7],[.8,3.0,1.3],.07,.03,'#fff0bd',{glow:1}); S.box([.6,1.3,.75],[.18,.05,.18],'#ffe7a2');
  S.obox([.6,1.25,.7],[.8,3.0,1.3],.04,.045,'#ffffff',{glow:1});
  S.box([.6,1.28,.75],[.34,.04,.34],'#ffe7a2',{shine:.8});
  S.tube([.58,1.0,.68],[.6,1.25,.7],.045,.045,'#3a1210');
  for(let i=0;i<3;i++) S.tube([.585,1.04+i*.07,.685],[.59,1.07+i*.07,.69],.055,.055,'#ffe7a2',{shine:.6});
  S.ell([.58,.95,.68],[.07,.07,.07],'#c0392b',{rings:4,seg:8,shine:.7});
  S.ring([0,1.1,0],1.15,.02,'#ffe7a2',{glow:1,n:26,phase:t*1.5});
  for(let i=0;i<3;i++){ const a=t*2+i*2.09; S.box([Math.cos(a)*1.15,1.1+Math.sin(a*2)*.05,Math.sin(a)*1.15],[.25,.03,.03],'#fff0bd',{glow:1,rot:[0,-a,0]}); }
};

MODELS.earthshaker=(S,d,t)=>{
  man(S,{face:true,bulk:1.5,gap:.25,hipY:.85,cloth:'#5b4a36',arm:'#6a5742',glove:'#6a5742',skin:'#8a7255',legs:'#44382a',pad:'#6e6a60',padTrim:'#8bd4ff',armR:[1.0,1.05,.45],armL:[-1.0,1.05,.3],headY:2.0,belt:'#8bd4ff',trim:'#8bd4ff',bracer:'#6e6a60',knee:'#6e6a60',beard:'#3a2c20',fo:{eye:'#8bd4ff',glow:1,angry:.35,mouth:'stern',brow:'#3a2c20'},cuff:'#6e6a60'});
  for(const s of [-1,1]){ S.ell([s*.75,1.75,0],[.32,.26,.32],'#6e6a60',{rings:5,seg:8});
    for(let k=0;k<3;k++){ S.cone([s*(.7+k*.08),1.95,(k-1)*.14],[s*(.78+k*.11),2.35+k*.08,(k-1)*.18],.09,'#8b8a82',{seg:5});}
    S.ell([s*.76,1.82,.1],[.1,.04,.1],'#8bd4ff',{glow:1,rings:3,seg:6}); }
  S.ell([0,1.5,.34],[.3,.3,.1],'#d8d0c0');
  for(let i=0;i<4;i++){ S.box([0,1.35+i*.17,.52],[.7-i*.05,.06,.04],'#8bd4ff',{glow:1}); }
  S.tube([-.3,1.78,.12],[.3,1.15,.52],.05,.05,'#3a2c20',{seg:6});
  S.tube([0,2.28,0],[0,2.34,0],.31,.31,'#6e6a60',{seg:12});
  for(let i=0;i<5;i++){ const a=-1.0+i*.5; S.cone([Math.sin(a)*.3,2.3,Math.cos(a)*.2-.05],[Math.sin(a)*.34,2.55+(i%2)*.1,Math.cos(a)*.2-.05],.06,'#8b8a82',{seg:5}); }
  for(const s of [-1,1]){ S.tube([s*.2,1.75,.2],[s*.28,1.4,.3],.04,.03,'#3a2c20',{seg:5}); S.ell([s*.28,1.38,.3],[.05,.05,.05],'#8bd4ff',{glow:1,rings:3,seg:5}); }
  S.tube([1.0,0,.45],[1.0,2.8,.45],.17,.2,'#5b4a36',{seg:8});
  for(let i=0;i<3;i++) S.tube([1.0,.8+i*.7,.45],[1.0,.9+i*.7,.45],.24,.24,'#8bd4ff',{glow:1,seg:10});
  for(let i=0;i<4;i++) S.box([1.0,.45+i*.7,.65],[.12,.12,.05],'#8bd4ff',{glow:1,rot:[0,0,.785]});
  S.box([1.0,3.0,.45],[.5,.4,.5],'#6e6a60');
  S.cone([1.0,3.2,.45],[1.0,3.6,.45],.2,'#8b8a82',{seg:6});
  S.ell([1.0,2.9,.7],[.08,.08,.04],'#8bd4ff',{glow:1,rings:4,seg:6});
  for(let i=0;i<4;i++){ const a=t*.8+i*1.57; S.box([Math.cos(a)*1.3,.8+Math.sin(t*1.5+i)*.2,Math.sin(a)*1.3],[.2,.18,.2],'#6e6a60',{rot:[a,a,0]}); S.box([Math.cos(a)*1.3,.8+Math.sin(t*1.5+i)*.2,Math.sin(a)*1.3],[.08,.2,.08],'#8bd4ff',{glow:1,rot:[a,a,0]}); }
};

MODELS.sniper=(S,d,t)=>{
  S.sc=.95;
  man(S,{face:true,bulk:1.2,cloth:'#7e3f24',arm:'#7e3f24',glove:'#3a2415',legs:'#4a2a18',skin:'#e0a97c',armR:[.5,1.4,.7],armL:[-.3,1.35,1.0],headY:1.9,belt:'#3a2415',trim:'#d7b36a',beard:'#6b4423',knee:'#3a2415',bracer:'#3a2415',collar:'#3a2415',fo:{eye:'#4a7a9a',angry:.25,mouth:'stern',brow:'#6b4423'},toe:'#3a2415',cuff:'#3a2415'});
  S.ell([0,1.45,.26],[.3,.28,.14],'#d9b079');
  for(let i=0;i<9;i++) S.tube([-.38+i*.095,1.8-i*.07,.3],[-.38+i*.095,1.64-i*.07,.3],.028,.028,i%3===0?'#c0392b':'#d7b36a',{seg:6});
  S.tube([-.4,1.82,.28],[.4,1.1,.4],.04,.04,'#3a2415',{seg:5});
  for(const s of [-1,1]) S.box([s*.3,1.0,.3],[.14,.2,.1],'#3a2415');
  S.ell([0,2.0,.0],[.3,.22,.3],'#3a2415'); S.tube([0,2.1,0],[0,2.14,0],.5,.5,'#3a2415',{seg:14});
  S.tube([0,2.12,0],[0,2.4,0],.32,.3,'#3a2415',{seg:12});
  S.tube([0,2.13,0],[0,2.2,0],.34,.34,'#d7b36a',{seg:12,shine:.5});
  S.tube([-.3,2.1,.15],[.3,2.1,.15],.03,.03,'#17202b',{seg:5});
  for(const s of [-1,1]){ S.tube([s*.12,2.12,.22],[s*.12,2.12,.28],.08,.08,'#8a6a3a',{seg:10,shine:.5}); S.ell([s*.12,2.12,.29],[.06,.06,.02],'#7ad8ff',{glow:1,rings:4,seg:8}); }
  S.tube([.4,1.45,.2],[.4,1.55,2.1],.05,.04,'#2a2a2a',{shine:.6}); S.box([.4,1.4,.1],[.14,.26,.9],'#6b4423',{shine:.4});
  S.tube([.4,1.7,.8],[.4,1.7,1.3],.07,.07,'#222'); S.ell([.4,1.7,1.32],[.07,.07,.03],'#ffd27a',{glow:1,rings:4,seg:8});
  S.tube([.4,1.55,1.9],[.4,1.55,2.15],.07,.05,'#444',{seg:8,shine:.6});
  S.tube([.4,1.72,.95],[.4,1.55,1.4],.015,.015,'#555',{seg:4});
  S.box([.4,1.1,.9],[.05,.35,.12],'#555',{rot:[.2,0,0]});
  S.box([-.35,1.5,-.35],[.4,.8,.25],'#4a2a18');
  S.tube([-.35,1.95,-.35],[-.35,2.0,-.35],.14,.14,'#d7b36a',{seg:8});
  for(const s of [-1,1]) S.cone([s*.15,.18,-.05],[s*.15,.04,-.18],.03,'#8a8a8a',{seg:5,shine:.8});
  G(S,[.4,1.72,1.42],.025,'#ff5368');
};

/* ---------- Запасная модель для героев без отдельной ---------- */
function fallback(S,d,t){
  man(S,{cloth:d.color||'#556',face:true,armR:[.7,1.3,.4],armL:[-.7,1.3,.4]});
  robe(S,.55,.4,1.4,d.color||'#556',d.color2||'#fff');
  S.ell([0,2.5,0],[.15,.15,.15],d.color2||'#fff',{glow:1});
}

/* ---------- Рендер ---------- */
function drawPedestal(S,d,t){
  S.target=S.pre; const k=S.sc; S.sc=1; const ac=d.color2||'#d7b36a';
  S.tube([0,-.34,0],[0,-.18,0],1.75,1.68,'#12151f',{seg:36,shine:.3});
  S.tube([0,-.18,0],[0,-.06,0],1.62,1.5,'#1d2230',{seg:36,shine:.4});
  S.tube([0,-.06,0],[0,0,0],1.46,1.46,'#2a3042',{seg:36,shine:.5});
  S.ring([0,.006,0],1.28,.045,ac,{glow:1,n:40,phase:t*.2});
  S.ring([0,.006,0],.98,.028,ac,{glow:1,n:32,phase:-t*.3});
  for(let i=0;i<12;i++){ const a=i/12*Math.PI*2+t*.15; S.box([Math.cos(a)*1.38,.01,Math.sin(a)*1.38],[.11,.012,.04],ac,{glow:1,rot:[0,-a,0]}); }
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
  const L=norm([-.45,.7,.6]), L2=norm([.75,.15,.45]), L3=norm([.1,.35,-1]);
  const H=norm(add(L,[0,0,1]));
  const acc=rgb(def.color2||'#ffffff');
  const rv=v=>{ const X=v[0]*cyw-v[2]*syw, Z=v[0]*syw+v[2]*cyw; return [X,v[1]*cp-Z*sp,v[1]*sp+Z*cp]; };
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
      out.push({P,n,nm:fc.nm?rv(fc.nm):n,z:zs/P.length,col:fc.col,glow:fc.glow,sh:fc.sh});
    }
    return out;
  };
  const paint=list=>{
    ctx.lineJoin='round';
    for(const fc of list){
      const pts=fc.P.map(p=>{const dd=D-p[2]; return [cx+p[0]*f/dd, cy-p[1]*f/dd];});
      let r=fc.col[0],g=fc.col[1],b=fc.col[2];
      if(fc.glow){
        r=Math.min(255,r*1.1+55); g=Math.min(255,g*1.1+55); b=Math.min(255,b*1.1+55);
        ctx.shadowColor='rgb('+(fc.col[0]|0)+','+(fc.col[1]|0)+','+(fc.col[2]|0)+')'; ctx.shadowBlur=16;
      } else {
        const nn=fc.nm;
        const key=Math.max(0,dot(nn,L)), fil=Math.max(0,dot(nn,L2)), rim=Math.pow(Math.max(0,dot(nn,L3)),1.5);
        const amb=.3+.16*nn[1];
        const spc=Math.pow(Math.max(0,dot(nn,H)),30)*fc.sh*150;
        const edge=Math.pow(1-Math.max(0,nn[2]),3)*.22;
        r=r*(amb+key*.84+fil*.17)+acc[0]*(rim*.34+edge*.35)+spc;
        g=g*(amb+key*.8+fil*.2)+acc[1]*(rim*.34+edge*.35)+spc;
        b=b*(amb+key*.74+fil*.27)+acc[2]*(rim*.34+edge*.35)+spc;
        r=Math.min(255,r); g=Math.min(255,g); b=Math.min(255,b);
        ctx.shadowBlur=0;
      }
      const s='rgb('+(r|0)+','+(g|0)+','+(b|0)+')';
      ctx.fillStyle=s; ctx.strokeStyle=s; ctx.lineWidth=1.1;
      ctx.beginPath(); ctx.moveTo(pts[0][0],pts[0][1]);
      for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0],pts[i][1]);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.shadowBlur=0;
  };
  ctx.save();
  // тень под бойцом
  const g=tr([0,0,0]); const dd=D-g[2];
  { const gx=cx+g[0]*f/dd, gy=cy-g[1]*f/dd, rx=1.5*f/dd;
    const bgl=ctx.createRadialGradient(cx,cy-f/dd*.4,4,cx,cy-f/dd*.4,f/dd*2.4);
    const ac=rgb(def.color2||'#ffffff');
    bgl.addColorStop(0,'rgba('+ac[0]+','+ac[1]+','+ac[2]+',.22)'); bgl.addColorStop(1,'rgba('+ac[0]+','+ac[1]+','+ac[2]+',0)');
    ctx.fillStyle=bgl; ctx.fillRect(x,y,w,h);
    ctx.save(); ctx.translate(gx,gy); ctx.scale(1,Math.max(.12,sp*.9+.1));
    const sg=ctx.createRadialGradient(0,0,2,0,0,rx*.8);
    sg.addColorStop(0,'rgba(0,0,0,.6)'); sg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=sg; ctx.beginPath(); ctx.arc(0,0,rx*.8,0,Math.PI*2); ctx.fill(); ctx.restore(); }
  const pre=prep(S.pre,0).sort((a,b)=>a.z-b.z);
  paint(pre.filter(q=>!q.glow)); paint(pre.filter(q=>q.glow));
  const mdl=prep(S.faces,bob).sort((a,b)=>a.z-b.z);
  paint(mdl);
  ctx.restore();
}

window.Hero3D={draw,models:MODELS};
})();
