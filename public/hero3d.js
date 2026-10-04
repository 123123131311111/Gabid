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
  face(pts,center,color,glow,nm,shine,vn){
    const k=this.sc;
    const P=pts.map(p=>[p[0]*k,p[1]*k,p[2]*k]);
    const col=rgb(color);
    if(shine==null){
      const mx=Math.max(col[0],col[1],col[2]), mn=Math.min(col[0],col[1],col[2]);
      shine=(mx>105 && (mx-mn)/mx<.22)?.6:.16;
    }
    this.target.push({p:P,c:[center[0]*k,center[1]*k,center[2]*k],col,glow:!!glow,nm:nm||null,sh:shine,vn:vn||null});
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
    const vnr=[];
    for(let i=0;i<n;i++){
      const ang=i/n*Math.PI*2;
      vnr.push(norm(add(add(mul(bx,Math.cos(ang)),mul(bz,Math.sin(ang))),mul(by,tilt))));
    }
    for(let i=0;i<n;i++){
      const j=(i+1)%n;
      const am=(i+.5)/n*Math.PI*2;
      const nm=norm(add(add(mul(bx,Math.cos(am)),mul(bz,Math.sin(am))),mul(by,tilt)));
      this.face([ra[i],ra[j],rb[j],rb[i]],c,color,o.glow,nm,o.shine,o.flat?null:[vnr[i],vnr[j],vnr[j],vnr[i]]);
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
    const vnAt=(i,j)=>{
      const th=i/nr*Math.PI, ph=j/ns*Math.PI*2;
      return norm(rotEuler([Math.sin(th)*Math.cos(ph)/r[0],Math.cos(th)/r[1],Math.sin(th)*Math.sin(ph)/r[2]],rot));
    };
    for(let i=0;i<nr;i++) for(let j=0;j<ns;j++){
      const a=pt(i,j), b=pt(i,j+1), d=pt(i+1,j), e=pt(i+1,j+1);
      const tm=(i+.5)/nr*Math.PI, pm=(j+.5)/ns*Math.PI*2;
      const nm=norm(rotEuler([Math.sin(tm)*Math.cos(pm)/r[0],Math.cos(tm)/r[1],Math.sin(tm)*Math.sin(pm)/r[2]],rot));
      const na=vnAt(i,j), nb=vnAt(i,j+1), nd=vnAt(i+1,j), ne=vnAt(i+1,j+1);
      if(i===0) this.face([a,d,e],c,color,o.glow,nm,o.shine,[na,nd,ne]);
      else if(i===nr-1) this.face([a,b,d],c,color,o.glow,nm,o.shine,[na,nb,nd]);
      else this.face([a,b,e,d],c,color,o.glow,nm,o.shine,[na,nb,ne,nd]);
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

/* ---------- ЧИП: скелетная анимация посоха ----------
   pose = {kind:'idle'|'attack'|'cast'|'twirl'|'show', slot, p(0..1)}
   'show' — витринный цикл для окна просмотра (вертит посох, бьёт, кастует все 4 способности). */
const E_io=x=>x*x*(3-2*x), E_out=x=>1-Math.pow(1-x,3), E_in=x=>x*x*x*.5+x*x*.5;
const cl01=x=>Math.max(0,Math.min(1,x));
const bell=(x,c,w)=>Math.exp(-((x-c)/w)*((x-c)/w));
const CH_IH=[.8,1.3,.45], CH_ID=[0,1,0], CH_IL=[-.65,1.35,.55];
const gripL=(h,d)=>add(sub(h,mul(d,.5)),[-.14,0,0]);
function K(p,h,d,l,e){ d=norm(d); return {p,h,d,l:l||gripL(h,d),e:e||E_io}; }
const CH_KEYS={
  attack:[K(0,CH_IH,CH_ID,CH_IL),
    K(.28,[.72,2.0,-.1],[.12,.55,-.85],null,E_out),          // замах за плечо
    K(.5,[.5,1.42,.82],[0,-.5,.87],null,E_in),                // быстрый удар вперёд-вниз
    K(.72,[.6,1.38,.62],[0,.2,1],null,E_out),                 // отдача
    K(1,CH_IH,CH_ID,CH_IL)],
  c0:[K(0,CH_IH,CH_ID,CH_IL),                                 // Королевский приказ: указывает посохом
    K(.3,[.7,1.75,.35],[.1,.8,.5],[-.5,1.9,.5],E_out),
    K(.5,[.55,1.5,.85],[0,.05,1],[-.35,1.75,.95],E_in),
    K(.78,[.58,1.5,.8],[0,.12,1],[-.35,1.75,.95]),
    K(1,CH_IH,CH_ID,CH_IL)],
  c1:[K(0,CH_IH,CH_ID,CH_IL),                                 // Корона власти: посох вверх и в землю перед собой
    K(.32,[.55,2.15,.35],[0,1,.1],null,E_out),
    K(.5,[.5,1.12,.68],[0,1,0],[.28,1.42,.7],E_in),
    K(.74,[.5,1.12,.68],[0,1,0],[.28,1.42,.7]),
    K(1,CH_IH,CH_ID,CH_IL)],
  c2:[K(0,CH_IH,CH_ID,CH_IL),                                 // Монета судьбы: подбрасывает и щёлкает посохом
    K(.28,[.7,.95,.1],[.25,.7,-.6],[-.4,1.55,.85],E_out),
    K(.5,[.6,1.35,.7],[0,.45,1],[-.5,1.3,.7],E_in),
    K(.75,[.62,1.4,.65],[0,.4,1],[-.55,1.3,.65]),
    K(1,CH_IH,CH_ID,CH_IL)],
  c3:[K(0,CH_IH,CH_ID,CH_IL),                                 // Тронный переворот: над головой и ударом в пол
    K(.38,[.35,2.3,.3],[0,1,.12],[-.05,2.0,.32],E_out),
    K(.5,[.45,1.12,.62],[0,1,0],[.2,1.42,.65],E_in),
    K(.82,[.45,1.12,.62],[0,1,0],[.2,1.42,.65]),
    K(1,CH_IH,CH_ID,CH_IL)]
};
const CH_SHOW=[['idle',2],['twirl',1.9],['attack',.55],['attack',.55],['idle',1],['cast',1,0],['idle',.7],['cast',1,2],['idle',.7],['cast',1.2,1],['idle',.8],['cast',1.5,3],['idle',1.2]];
const CH_SHOW_T=CH_SHOW.reduce((a,x)=>a+x[1],0);
function chipResolve(pose,t){
  if(!pose||pose.kind==='idle') return {kind:'idle',p:0};
  if(pose.kind!=='show') return pose;
  let tm=((t%CH_SHOW_T)+CH_SHOW_T)%CH_SHOW_T;
  for(const [k,du,sl] of CH_SHOW){ if(tm<du) return {kind:k,slot:sl,p:tm/du}; tm-=du; }
  return {kind:'idle',p:0};
}
function chipCore(kind,slot,p,t){
  if(kind==='twirl'){
    const w=E_io(cl01(Math.min(p/.14,(1-p)/.14)));
    const th=4*Math.PI*E_io(cl01((p-.1)/.8));
    const hc=[.42+.12*Math.cos(th*.5),1.38+.1*Math.sin(th),.78];
    const dd=norm([Math.sin(th)*.95,Math.cos(th),.22]);
    return {h:lerp(CH_IH,hc,w), d:norm(lerp(CH_ID,dd,w)), l:lerp(CH_IL,[-.55,1.62+.1*Math.sin(th*.5),.78],w)};
  }
  const key=kind==='attack'?'attack':(kind==='cast'?'c'+slot:null);
  if(!key){
    return {h:[.8+.012*Math.sin(t*1.6),1.3+.018*Math.sin(t*1.6),.45], d:norm([.025*Math.sin(t*1.3),1,.035*Math.cos(t*1.1)]),
            l:[-.65,1.35+.02*Math.sin(t*1.6+1),.55]};
  }
  const KS=CH_KEYS[key];
  if(p<=0) return {h:KS[0].h,d:KS[0].d,l:KS[0].l};
  for(let i=1;i<KS.length;i++) if(p<=KS[i].p){
    const a=KS[i-1], b=KS[i], u=b.e((p-a.p)/(b.p-a.p));
    return {h:lerp(a.h,b.h,u), d:norm(lerp(a.d,b.d,u)), l:lerp(a.l,b.l,u)};
  }
  const e=KS[KS.length-1]; return {h:e.h,d:e.d,l:e.l};
}
function chipState(rp,t){
  const kind=rp.kind, slot=rp.slot, p=rp.p||0;
  const c=chipCore(kind,slot,p,t);
  const st={h:c.h,d:c.d,l:c.l,fx:0,orbit:1,spin:0,burst:0,coin:null,rings:[],spikes:0,trail:[],beam:0};
  const head=(q)=>{ const k=chipCore(kind,slot,q,t); return add(k.h,mul(k.d,1.15)); };
  const addTrail=(q0,q1,n,step)=>{ for(let k=1;k<=n;k++){ const q=p-k*step; if(q<q0||q>q1) break; st.trail.push(head(q)); } };
  if(kind==='attack'){
    st.fx=.25+.75*bell(p,.52,.12); st.burst=bell(p,.6,.13);
    addTrail(.2,.7,6,.03);
  } else if(kind==='twirl'){
    st.fx=.35+.3*Math.sin(p*Math.PI); addTrail(.1,.92,7,.018);
  } else if(kind==='cast'){
    if(slot===0){ st.fx=.3+.7*bell(p,.55,.16); st.beam=bell(p,.62,.17); st.burst=bell(p,.55,.1); }
    else if(slot===1){
      st.fx=.3+.7*bell(p,.55,.22);
      st.orbit=1+3*E_io(cl01((p-.4)/.2))*(1-E_io(cl01((p-.85)/.15)));
      st.spin=8*E_io(cl01((p-.35)/.5));
      for(const j of [0,.1]){ const k=(p-.5-j)/.4; if(k>0&&k<1) st.rings.push({r:.2+.95*E_out(k),w:.05*(1-k)+.02}); }
      st.burst=bell(p,.52,.08);
    } else if(slot===2){
      st.fx=.3+.5*bell(p,.5,.12); st.burst=bell(p,.5,.07); addTrail(.3,.62,5,.03);
      if(p>.18){
        const u=cl01((p-.5)/.35);
        const pos=p<.5?[-.4,1.55+.05*Math.sin(p*40),.85]:[-.4*(1-u),1.55+Math.sin(u*Math.PI)*.9+.2*u,.85+.3*u];
        st.coin={pos,size:p<.5?1:1-E_io(cl01((u-.75)/.25)),spin:p*34};
      }
    } else {
      st.fx=.2+.8*E_io(cl01(p/.4))*(1-.4*E_io(cl01((p-.7)/.3)));
      st.orbit=1+3*E_io(cl01((p-.15)/.35))*(1-E_io(cl01((p-.85)/.15)));
      st.spin=10*E_io(cl01((p-.1)/.6));
      for(const j of [0,.09,.18]){ const k=(p-.5-j)/.38; if(k>0&&k<1) st.rings.push({r:.2+.95*E_out(k),w:.06*(1-k)+.02}); }
      st.spikes=bell(p,.64,.16); st.burst=bell(p,.52,.08);
    }
  } else { st.fx=0; }
  return st;
}
function chipStaff(S,h,d,t,fx){
  const [bx,by,bz]=basisY(d,[1,0,0]);
  const at=s=>add(h,mul(d,s));
  S.tube(at(-1.1),at(1.0),.045,.045,'#ffd568');
  for(let i=0;i<3;i++) S.tube(at(-.55+i*.5),at(-.49+i*.5),.07,.07,'#fff3b0',{shine:.7});
  const hd=at(1.15), rr=.16+.05*fx;
  S.ell(hd,[rr,rr,rr],'#c0392b',{glow:1});
  for(let i=0;i<4;i++){ const a=i*1.57; const v=add(mul(bx,Math.cos(a)),mul(bz,Math.sin(a)));
    S.cone(add(at(1.0),mul(v,.1)),add(at(1.25),mul(v,.22)),.035,'#ffd568',{seg:5,shine:.7}); }
  if(fx>.3) for(let i=0;i<5;i++){ const a=t*3+i*1.2566; const v=add(mul(bx,Math.cos(a)),mul(bz,Math.sin(a)));
    G(S,add(add(hd,mul(v,.25+.05*fx)),mul(by,Math.sin(a*1.7)*.1)),.025+.02*fx,'#fff3b0'); }
  return hd;
}
MODELS.chip=(S,d,t,pose)=>{
  const rp=chipResolve(pose,t), st=chipState(rp,t);
  man(S,{nobelt:true,face:true,bulk:1.0,cloth:'#49376d',arm:'#49376d',glove:'#ffd568',armR:st.h,armL:st.l,legs:'#2c2145',belt:'#ffd568',trim:'#ffd568',bracer:'#ffd568',beard:'#f5f0e8',knee:'#ffd568',collar:'#f5f0e8',pad:'#ffd568',padTrim:'#fff3b0',fo:{eye:'#4a7aff',angry:.0,mouth:'smile',brow:'#f5f0e8',lip:'#a0505a'}});
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
  // посох
  const hd=chipStaff(S,st.h,st.d,t,st.fx);
  // шлейф за головой посоха
  st.trail.forEach((tp,i)=>G(S,tp,Math.max(.03,.12-i*.014),i%2?'#ffd568':'#fff3b0'));
  // вспышка удара / каста
  if(st.burst>.04){
    const [bx,,bz]=basisY(st.d,[1,0,0]), b=st.burst;
    G(S,hd,.07+.12*b,'#fff3b0');
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2+.4; const v=add(mul(bx,Math.cos(a)),mul(bz,Math.sin(a)));
      S.cone(add(hd,mul(v,.12)),add(hd,mul(v,.2+.42*b)),.035,'#ffd568',{glow:1,seg:5}); }
  }
  // луч приказа
  if(st.beam>.05) for(let i=1;i<=6;i++){ const q=add(hd,mul(st.d,.15+i*.28*st.beam+.1)); if(Math.hypot(q[0],q[2])>2.15) break; G(S,q,.05+.05*st.beam*(1-i/8),'#fff0a8'); }
  // монета
  if(st.coin){ const c=st.coin; if(c.size>.05) S.ell(c.pos,[.2*c.size,.05*c.size,.2*c.size],'#ffd568',{glow:1,rings:5,seg:10,rot:[c.spin,0,.3]}); }
  // золотые монеты вокруг (ускоряются при W/R)
  for(let i=0;i<6;i++){ const a=t*1.4+i*1.047+st.spin; S.ell([Math.cos(a)*1.15,1.2+Math.sin(t*2+i)*.2+.15*(st.orbit-1)/3,Math.sin(a)*1.15],[.13*(1+.4*(st.orbit-1)/3),.03,.13*(1+.4*(st.orbit-1)/3)],'#ffd568',{glow:1,rings:4,seg:8,rot:[.5,a,0]}); }
  // эффекты на полу (рисуются под моделью)
  if(st.rings.length||st.spikes>.02){
    const kk=S.sc, tg=S.target; S.target=S.pre; S.sc=1;
    for(const r of st.rings) S.ring([0,.012,0],r.r,r.w,'#ffd568',{glow:1,n:36});
    if(st.spikes>.02) for(let i=0;i<10;i++){ const a=i/10*Math.PI*2+.3, hh=.15+.85*st.spikes*(.7+.3*Math.sin(i*2.3));
      S.cone([Math.cos(a)*.95,0,Math.sin(a)*.95],[Math.cos(a)*.95,hh,Math.sin(a)*.95],.07,'#fff0a8',{glow:1,seg:5}); }
    S.sc=kk; S.target=tg;
  }
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

/* ---------- Процедурные текстуры: 3D value-noise в координатах модели ---------- */
const HT=new Float32Array(4096);
(function(){ let s=1337; for(let i=0;i<4096;i++){ s=(s*1664525+1013904223)>>>0; HT[i]=s/4294967296; } })();
function hash3(x,y,z){ return HT[((x*73856093)^(y*19349663)^(z*83492791))&4095]; }
function vnoise(x,y,z){
  const xi=Math.floor(x), yi=Math.floor(y), zi=Math.floor(z);
  let fx=x-xi, fy=y-yi, fz=z-zi;
  fx=fx*fx*(3-2*fx); fy=fy*fy*(3-2*fy); fz=fz*fz*(3-2*fz);
  const a=hash3(xi,yi,zi), b=hash3(xi+1,yi,zi), c=hash3(xi,yi+1,zi), d=hash3(xi+1,yi+1,zi);
  const e=hash3(xi,yi,zi+1), f=hash3(xi+1,yi,zi+1), g=hash3(xi,yi+1,zi+1), h=hash3(xi+1,yi+1,zi+1);
  const x1=a+(b-a)*fx, x2=c+(d-c)*fx, x3=e+(f-e)*fx, x4=g+(h-g)*fx;
  const y1=x1+(x2-x1)*fy, y2=x3+(x4-x3)*fy;
  return y1+(y2-y1)*fz;
}

/* ---------- Z-буфер растеризатор (вместо сортировки граней) ----------
   Каждый пиксель хранит ближайший фрагмент (id грани, позиция в модели,
   нормаль). Поэтому текстуры больше не «въезжают» друг в друга.
   Освещение считается один раз на пиксель (deferred shading). */
const PW26=new Float32Array(1025), PW70=new Float32Array(1025);
for(let i=0;i<=1024;i++){ const x=i/1024; PW26[i]=Math.pow(x,26); PW70[i]=Math.pow(x,70); }
let BUF=null, OUTB=null;
const SCR={cap:0,IWF:null,NF:null,VX:new Float64Array(64),VY:new Float64Array(64),VZ:new Float64Array(64),XS:new Float64Array(64),YS:new Float64Array(64),EX:new Float64Array(4),EY:new Float64Array(4)};
function getBuf(n){
  if(!BUF||BUF.n<n){
    BUF={n,w:new Float32Array(n),id:new Int32Array(n),l1:new Float32Array(n),l2:new Float32Array(n)};
  }
  return BUF;
}
function getOut(n){
  if(!OUTB||OUTB.n<n){ OUTB={n,out:new Uint8ClampedArray(n*4),glow:new Uint8ClampedArray(n*4)}; }
  return OUTB;
}

function render(def,o){
  o=o||{};
  const W=o.W|0, H=o.H|0;
  const yaw=o.yaw||0, pitch=o.pitch==null?.2:o.pitch, t=o.t||0;
  const D=9, f=o.f, cx=o.cx, cy=o.cy;
  const S=new Scene();
  if(o.pedestal) drawPedestal(S,def,t);
  (MODELS[def.id]||fallback)(S,def,t,o.pose);
  const all=S.pre.concat(S.faces);
  const preCount=S.pre.length;
  const B=getBuf(W*H);
  B.w.fill(0,0,W*H); B.id.fill(-1,0,W*H);
  const Bw=B.w, Bid=B.id, Bl1=B.l1, Bl2=B.l2;
  const cyw=Math.cos(yaw), syw=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch);
  const T=[0,1.3,0];
  const bob=Math.sin(t*1.6)*.025;
  const BW=.00012;                       // допуск по глубине: декали (глаза, узоры) выигрывают у основы
  const nF=all.length;
  if(!SCR.IWF||SCR.cap<nF){ SCR.cap=Math.ceil(nF*1.3)+64; SCR.IWF=new Float32Array(SCR.cap*64); SCR.NF=new Float32Array(SCR.cap*3); }
  const IWF=SCR.IWF, NF=SCR.NF, VX=SCR.VX, VY=SCR.VY, VZ=SCR.VZ, XS=SCR.XS, YS=SCR.YS, EX=SCR.EX, EY=SCR.EY;

  for(let fi=0;fi<nF;fi++){
    const fc=all[fi];
    const bobY=fi<preCount?0:bob;
    const n0=fc.p.length;
    for(let k=0;k<n0;k++){
      const p=fc.p[k];
      const px=p[0]-T[0], py=p[1]+bobY-T[1], pz=p[2]-T[2];
      const X=px*cyw-pz*syw, Z=px*syw+pz*cyw;
      VX[k]=X; VY[k]=py*cp-Z*sp; VZ[k]=py*sp+Z*cp;
    }
    const Cx=fc.c[0]-T[0], Cy=fc.c[1]+bobY-T[1], Cz=fc.c[2]-T[2];
    const cX=Cx*cyw-Cz*syw, cZ=Cx*syw+Cz*cyw, cY=Cy*cp-cZ*sp, cZ2=Cy*sp+cZ*cp;
    let ax,ay,az,bx,by,bz;
    if(n0===3){ ax=VX[1]-VX[0]; ay=VY[1]-VY[0]; az=VZ[1]-VZ[0]; bx=VX[2]-VX[0]; by=VY[2]-VY[0]; bz=VZ[2]-VZ[0]; }
    else { ax=VX[2]-VX[0]; ay=VY[2]-VY[0]; az=VZ[2]-VZ[0]; bx=VX[3]-VX[1]; by=VY[3]-VY[1]; bz=VZ[3]-VZ[1]; }
    let nx=ay*bz-az*by, ny=az*bx-ax*bz, nz=ax*by-ay*bx;
    const nl=Math.hypot(nx,ny,nz); if(nl<1e-9) continue; nx/=nl; ny/=nl; nz/=nl;
    const fp0=(VX[0]+VX[1]+VX[2])/3, fp1=(VY[0]+VY[1]+VY[2])/3, fp2=(VZ[0]+VZ[1]+VZ[2])/3;
    if(nx*(fp0-cX)+ny*(fp1-cY)+nz*(fp2-cZ2)<0){ nx=-nx; ny=-ny; nz=-nz; }
    if(nx*(-fp0)+ny*(-fp1)+nz*(D-fp2)<=0) continue;       // задняя грань
    let behind=false;
    const iwo=fi*64;
    for(let k=0;k<n0;k++){
      const dd=D-VZ[k]; if(dd<.5){behind=true;break;}
      IWF[iwo+k]=1/dd; XS[k]=cx+VX[k]*f/dd; YS[k]=cy-VY[k]*f/dd;
    }
    if(behind) continue;
    if(fc.nm){ const m=fc.nm; const X=m[0]*cyw-m[2]*syw, Z=m[0]*syw+m[2]*cyw; NF[fi*3]=X; NF[fi*3+1]=m[1]*cp-Z*sp; NF[fi*3+2]=m[1]*sp+Z*cp; }
    else { NF[fi*3]=nx; NF[fi*3+1]=ny; NF[fi*3+2]=nz; }
    // построчная растеризация веера треугольников
    for(let tri=1;tri<n0-1;tri++){
      const x0=XS[0],y0=YS[0],x1=XS[tri],y1=YS[tri],x2=XS[tri+1],y2=YS[tri+1];
      const area=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0);
      if(Math.abs(area)<1e-6) continue;
      const ymin=Math.max(0,Math.ceil(Math.min(y0,y1,y2)-.5)), ymax=Math.min(H-1,Math.floor(Math.max(y0,y1,y2)-.5));
      if(ymin>ymax) continue;
      const inv=1/area;
      const l1x=(y2-y0)*inv, l1y=-(x2-x0)*inv, l2x=-(y1-y0)*inv, l2y=(x1-x0)*inv;   // аффинные барицентрики
      const iw0=IWF[iwo], d1=IWF[iwo+tri]-iw0, d2=IWF[iwo+tri+1]-iw0;
      const wx=l1x*d1+l2x*d2;
      const code=fi*64+tri;
      EX[0]=x0; EY[0]=y0; EX[1]=x1; EY[1]=y1; EX[2]=x2; EY[2]=y2; EX[3]=x0; EY[3]=y0;
      for(let y=ymin;y<=ymax;y++){
        const py=y+.5;
        let xl=1e9, xr=-1e9;
        for(let e=0;e<3;e++){
          const ex=EX[e], ey=EY[e], fx=EX[e+1], fy=EY[e+1];
          if((ey<=py&&fy>py)||(fy<=py&&ey>py)){ const x=ex+(py-ey)*(fx-ex)/(fy-ey); if(x<xl) xl=x; if(x>xr) xr=x; }
        }
        if(xl>xr) continue;
        const xa=Math.max(0,Math.ceil(xl-.5)), xb=Math.min(W-1,Math.floor(xr-.5));
        if(xa>xb) continue;
        const pxa=xa+.5;
        let l1=(pxa-x0)*l1x+(py-y0)*l1y;
        let l2=(pxa-x0)*l2x+(py-y0)*l2y;
        let ws=iw0+l1*d1+l2*d2;
        let idx=y*W+xa;
        for(let x=xa;x<=xb;x++,idx++){
          if(ws>=Bw[idx]-BW){ Bw[idx]=ws; Bid[idx]=code; Bl1[idx]=l1; Bl2[idx]=l2; }
          l1+=l1x; l2+=l2x; ws+=wx;
        }
      }
    }
  }

  /* ---- шейдинг: один раз на пиксель ---- */
  const L=norm([-.45,.7,.6]), L2=norm([.75,.15,.45]), L3=norm([.1,.35,-1]);
  const Hh=norm(add(L,[0,0,1]));
  const acc=rgb(def.color2||'#ffffff');
  const OB=getOut(W*H), out=OB.out;
  out.fill(0,0,W*H*4);
  let glowBuf=null;
  if(o.bloom!==false){ glowBuf=OB.glow; glowBuf.fill(0,0,W*H*4); }
  const tx=o.texture===false?0:1;
  for(let idx=0,tot=W*H;idx<tot;idx++){
    const code=B.id[idx]; if(code<0) continue;
    const fi=code>>6, tri=code&63;
    const fc=all[fi], o4=idx*4;
    const i0=0,i1=tri,i2=tri+1;
    const l1=B.l1[idx], l2=B.l2[idx], l0=1-l1-l2;
    const iwo=fi*64;
    const w0=l0*IWF[iwo], w1=l1*IWF[iwo+i1], w2=l2*IWF[iwo+i2], ws=w0+w1+w2;
    const a=w0/ws, b=w1/ws, c=w2/ws;
    const P0=fc.p[i0],P1=fc.p[i1],P2=fc.p[i2];
    const mx=P0[0]*a+P1[0]*b+P2[0]*c, my=P0[1]*a+P1[1]*b+P2[1]*c, mz=P0[2]*a+P1[2]*b+P2[2]*c;
    let cr=fc.col[0], cg=fc.col[1], cb=fc.col[2];
    if(fc.glow){
      const fl=.88+.12*vnoise(mx*14,my*14+t*3,mz*14);
      out[o4]=Math.min(255,(cr*1.1+55)*fl); out[o4+1]=Math.min(255,(cg*1.1+55)*fl); out[o4+2]=Math.min(255,(cb*1.1+55)*fl); out[o4+3]=255;
      if(glowBuf){ glowBuf[o4]=cr; glowBuf[o4+1]=cg; glowBuf[o4+2]=cb; glowBuf[o4+3]=255; }
      continue;
    }
    let nx,ny,nz;
    if(fc.vn){
      const N=fc.vn, A=N[i0],Bn=N[i1],Cn=N[i2];
      const mx_=A[0]*a+Bn[0]*b+Cn[0]*c, my_=A[1]*a+Bn[1]*b+Cn[1]*c, mz_=A[2]*a+Bn[2]*b+Cn[2]*c;   // модельное → камера
      const Xr=mx_*cyw-mz_*syw, Zr=mx_*syw+mz_*cyw;
      nx=Xr; ny=my_*cp-Zr*sp; nz=my_*sp+Zr*cp;
    } else { nx=NF[fi*3]; ny=NF[fi*3+1]; nz=NF[fi*3+2]; }
    const nlen=Math.sqrt(nx*nx+ny*ny+nz*nz)||1; nx/=nlen; ny/=nlen; nz/=nlen;
    const sh=fc.sh;
    let mul_=1, spcBoost=1;
    if(tx&&fi>=preCount){
      // крупные пятна + мелкое зерно (привязаны к модели, не «плывут» при вращении)
      const n1=vnoise(mx*4.2,my*4.2,mz*4.2), n2=vnoise(mx*17,my*17,mz*17);
      mul_=.92+.16*n1+(n2-.5)*.1;
      if(sh>.4){                                   // металл — «шлифовка» вдоль вертикали
        const st=vnoise(mx*46,my*5,mz*46);
        mul_*=.94+.12*st; spcBoost=.75+.5*st;
      }
    }
    const key=Math.max(0,(nx*L[0]+ny*L[1]+nz*L[2]+.22)/1.22);
    const fil=Math.max(0,nx*L2[0]+ny*L2[1]+nz*L2[2]);
    const rm0=Math.max(0,nx*L3[0]+ny*L3[1]+nz*L3[2]), rim=rm0*Math.sqrt(rm0);
    const amb=.3+.17*ny+Math.max(0,-ny)*.05;                               // полусферический ambient
    const ao=.68+.32*Math.min(1,Math.max(0,(my-.05)/1.1));                  // затенение у земли
    const ndh=Math.max(0,nx*Hh[0]+ny*Hh[1]+nz*Hh[2]);
    const spc=(sh>.4?PW70:PW26)[(Math.min(1,ndh)*1024)|0]*sh*150*spcBoost;
    const om=1-Math.max(0,nz), edge=om*om*om*.22;
    const env=sh>.4?(Math.max(0,ny)*.1*sh+om*om*.12*sh)*255:0;
    const base=amb*ao, rm=rim*.34+edge*.35;
    out[o4]  =cr*mul_*(base+key*.84+fil*.17)+acc[0]*rm+spc+env*.5;
    out[o4+1]=cg*mul_*(base+key*.8 +fil*.2 )+acc[1]*rm+spc+env*.55;
    out[o4+2]=cb*mul_*(base+key*.74+fil*.27)+acc[2]*rm+spc+env*.7;
    out[o4+3]=255;
  }

  /* ---- тонкий тёмный контур по силуэту и перепадам глубины (в 1/глубине) ---- */
  if(o.outline!==false){
    const thr=.0045;
    for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){
      const idx=y*W+x; if(B.id[idx]<0) continue;
      const w=B.w[idx];
      if(w-B.w[idx-1]>thr||w-B.w[idx+1]>thr||w-B.w[idx-W]>thr||w-B.w[idx+W]>thr){
        const o4=idx*4; out[o4]*=.55; out[o4+1]*=.55; out[o4+2]*=.58;
      }
    }
  }
  return {data:out,glow:glowBuf,W,H};
}

/* ---------- Canvas-обёртки ---------- */
function mkCanvas(w,h){
  if(typeof document==='undefined') return null;
  const c=document.createElement('canvas'); c.width=w; c.height=h; return c;
}
const TMP={};
function tmpCanvas(name,w,h){
  const k=name+w+'x'+h;
  return TMP[k]||(TMP[k]=mkCanvas(w,h));
}
function toCanvas(res,name){
  // итог: модель + мягкое свечение (bloom) поверх
  const {W,H}=res, n=W*H*4;
  const cv=tmpCanvas((name||'m'),W,H), g=cv.getContext('2d');
  g.globalCompositeOperation='source-over'; g.globalAlpha=1;
  g.putImageData(new ImageData(res.data.subarray(0,n),W,H),0,0);
  if(res.glow){
    const gc=tmpCanvas('g',W,H); gc.getContext('2d').putImageData(new ImageData(res.glow.subarray(0,n),W,H),0,0);
    g.save(); g.globalCompositeOperation='lighter'; g.imageSmoothingEnabled=true;
    for(const [div,al] of [[3,.55],[7,.5]]){
      const sw=Math.max(2,Math.round(W/div)), sh=Math.max(2,Math.round(H/div));
      const sm=tmpCanvas('s'+div,sw,sh), sg=sm.getContext('2d');
      sg.clearRect(0,0,sw,sh); sg.imageSmoothingEnabled=true; sg.drawImage(gc,0,0,sw,sh);
      g.globalAlpha=al; g.drawImage(sm,0,0,W,H);
    }
    g.restore();
  }
  return cv;
}

function fallback(S,d,t){
  man(S,{cloth:d.color||'#556',face:true,armR:[.7,1.3,.4],armL:[-.7,1.3,.4]});
  robe(S,.55,.4,1.4,d.color||'#556',d.color2||'#fff');
  S.ell([0,2.5,0],[.15,.15,.15],d.color2||'#fff',{glow:1});
}

/* Окно просмотра бойца (вращение мышью) */
function draw(ctx,def,x,y,w,h,o){
  const yaw=o.yaw||0, pitch=o.pitch==null?.2:o.pitch, zoom=o.zoom||1, t=o.t||0;
  const D=9;
  const ss=o.ss||1.5;                              // суперсэмплинг для гладких краёв
  const W=Math.max(8,Math.round(w*ss)), H=Math.max(8,Math.round(h*ss));
  const fpx=Math.min(h*.86/3.5, w*.86/3.5)*D*zoom*ss;
  const cx=W/2, cy=H*.6;
  const sp=Math.sin(pitch);
  const res=render(def,{W,H,yaw,pitch,t,f:fpx,cx,cy,pedestal:true,pose:{kind:'show'}});
  const img=toCanvas(res,'view');
  ctx.save();
  // мягкая тень/подсветка под бойцом
  { const ac=rgb(def.color2||'#ffffff');
    const unit=fpx/ss/D;
    const bgl=ctx.createRadialGradient(x+w/2,y+h*.6-unit*.4,4,x+w/2,y+h*.6-unit*.4,unit*2.4);
    bgl.addColorStop(0,'rgba('+ac[0]+','+ac[1]+','+ac[2]+',.22)'); bgl.addColorStop(1,'rgba('+ac[0]+','+ac[1]+','+ac[2]+',0)');
    ctx.fillStyle=bgl; ctx.fillRect(x,y,w,h); }
  ctx.imageSmoothingEnabled=true; ctx.imageSmoothingQuality='high';
  ctx.drawImage(img,x,y,w,h);
  ctx.restore();
}

/* ---------- 3D-бойцы на поле боя ----------
   Модель рендерится в спрайты (16 углов × 3 кадра анимации), кэшируется
   и рисуется поверх карты. Угол поворота = направление взгляда бойца. */
const SPR={}, SPR_META={};
let sprT0=0, sprMade=0, sprCount=0;
const nowMs=()=>(typeof performance!=='undefined'?performance.now():Date.now());
const ANG=16, ANG_A=8, FR=3, FR_DT=.23, BATTLE_PITCH=.5, SPR_CAP=1200;
/* какие бойцы умеют позы (удар / каст) и какие позы покрывает спрайт */
const ANIM={ chip:[{kind:'attack',p:.28},{kind:'attack',p:.5},{kind:'cast',slot:0,p:.3},{kind:'cast',slot:0,p:.55},{kind:'cast',slot:1,p:.32},{kind:'cast',slot:1,p:.7},
  {kind:'cast',slot:2,p:.3},{kind:'cast',slot:2,p:.6},{kind:'cast',slot:3,p:.38},{kind:'cast',slot:3,p:.62}] };
const ANIM_Q=7;
function extents(def,pose,ext){
  const S=new Scene(); (MODELS[def.id]||fallback)(S,def,.2,pose);
  for(const arr of [S.faces,S.pre]) for(const fc of arr) for(const p of fc.p){
    if(p[1]>ext.y) ext.y=p[1]; const r=Math.hypot(p[0],p[2]); if(r>ext.r) ext.r=r;
  }
}
function meta(def,radius){
  const key=def.id+'|'+(def.skinId||'')+'|'+radius;
  if(SPR_META[key]) return SPR_META[key];
  // базовые габариты (поза покоя) определяют масштаб, чтобы боец не уменьшался из-за замаха
  const e0={y:1,r:.6}; extents(def,{kind:'idle'},e0);
  const maxY=Math.min(e0.y,3.6), maxR=Math.min(e0.r,1.8);
  // габариты холста — по всем позам (замах над головой, кольца на земле и т.п.)
  const eA={y:e0.y,r:e0.r}; for(const ps of (ANIM[def.id]||[])) extents(def,ps,eA);
  const aY=Math.min(Math.max(eA.y,maxY),5), aR=Math.min(Math.max(eA.r,maxR),2.6);
  const ppu=Math.min(radius*3.5/maxY, radius*2.3/maxR);       // пикселей на единицу модели
  const ss=2;
  const W=Math.ceil((2*aR*ppu*1.18+10)), Hc=Math.ceil(aY*ppu*Math.cos(BATTLE_PITCH)+aR*ppu*Math.sin(BATTLE_PITCH)*1.3+aR*ppu*.6+16);
  const D=9, dd0=D+1.3*Math.sin(BATTLE_PITCH);
  const m={ppu,W,H:Hc,ss,maxY,maxR,D,dd0,ax:W/2,ay:Hc-Math.ceil(aR*ppu*Math.sin(BATTLE_PITCH)*.9)-10};
  return SPR_META[key]=m;
}
/* anim = {kind:'attack'|'cast', slot, p:0..1} — только для бойцов из ANIM */
function battleSprite(def,radius,facing,time,anim){
  if(typeof document==='undefined'||!def) return null;
  radius=Math.round(radius||24);
  const m=meta(def,radius);
  const animated=!!(anim&&ANIM[def.id]);
  const NA=animated?ANG_A:ANG;
  const a=((Math.round((facing||0)/(Math.PI*2)*NA)%NA)+NA)%NA;
  let fr=0, pose, pk='i';
  if(animated){
    const q=Math.min(ANIM_Q,Math.max(0,Math.round(anim.p*ANIM_Q)));
    pose={kind:anim.kind,slot:anim.slot,p:q/ANIM_Q}; pk=anim.kind[0]+(anim.slot==null?'':anim.slot)+'_'+q;
  } else { fr=Math.floor((time||0)/FR_DT)%FR; pose={kind:'idle'}; }
  const base=def.id+'|'+(def.skinId||'')+'|'+radius+'|';
  const key=base+NA+'|'+a+'|'+pk+'|'+fr;
  let s=SPR[key];
  if(s) return s;
  if(sprMade>=1 && nowMs()-sprT0>8){
    // нет бюджета — берём ближайший готовый кадр (сначала тот же, потом покоя)
    for(let d=0;d<=NA/2;d++) for(const sg of [1,-1]){
      const aa=((a+sg*d)%NA+NA)%NA, q=SPR[base+NA+'|'+aa+'|'+pk+'|'+fr]; if(q) return q;
    }
    if(animated){
      const q0=Math.round(anim.p*ANIM_Q), kd=anim.kind[0]+(anim.slot==null?'':anim.slot)+'_';
      for(let dq=1;dq<=ANIM_Q;dq++) for(const sg of [-1,1]){
        const qq=q0+sg*dq; if(qq<0||qq>ANIM_Q) continue;
        for(let d=0;d<=NA/2;d++) for(const s2 of [1,-1]){ const q=SPR[base+NA+'|'+(((a+s2*d)%NA+NA)%NA)+'|'+kd+qq+'|0']; if(q) return q; }
      }
    }
    for(let d=0;d<=ANG/2;d++) for(const sg of [1,-1]){
      const aa=((Math.round(a/NA*ANG)+sg*d)%ANG+ANG)%ANG;
      for(let k=0;k<FR;k++){ const q=SPR[base+ANG+'|'+aa+'|i|'+k]; if(q) return q; }
    }
    return null;
  }
  sprMade++;
  const ang=a/NA*Math.PI*2;
  const yaw=ang-Math.PI/2;
  const sx=animated?1.5:m.ss;
  const W=Math.round(m.W*sx), H=Math.round(m.H*sx);
  const f=m.ppu*m.dd0*sx;
  const cp=Math.cos(BATTLE_PITCH);
  const cx=m.ax*sx;
  const cy=m.ay*sx-1.3*cp*f/m.dd0;
  const res=render(def,{W,H,yaw,pitch:BATTLE_PITCH,t:animated?pose.p*.9+.2:fr*FR_DT,f,cx,cy,pedestal:false,pose});
  const hi=toCanvas(res,'spr');
  const cv=mkCanvas(m.W,m.H), g=cv.getContext('2d');
  g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
  g.drawImage(hi,0,0,m.W,m.H);
  s={canvas:cv,ax:m.ax,ay:m.ay,w:m.W,h:m.H};
  if(++sprCount>SPR_CAP){ for(const k in SPR) delete SPR[k]; sprCount=0; }
  SPR[key]=s; return s;
}
function resetBudget(){ sprT0=nowMs(); sprMade=0; }
function has(id){ return !!MODELS[id]; }

const API={draw,models:MODELS,render,battleSprite,resetBudget,has,hasAnim:id=>!!ANIM[id],_meta:meta,_pitch:BATTLE_PITCH,_fdt:FR_DT};
(typeof window!=='undefined'?window:globalThis).Hero3D=API;
if(typeof module!=='undefined') module.exports=API;
})();
