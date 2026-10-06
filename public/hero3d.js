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
let CUR_WALK=null;
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
    o=o||{}; const n=o.seg||18; const d=sub(b,a); const [bx,by,bz]=basisY(d);
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
    o=o||{}; const nr=o.rings||11, ns=o.seg||22, rot=o.rot||[0,0,0];
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
  const WK=o.walk!=null?o.walk:CUR_WALK;
  if(AXC){ if(AXC.cap){ AXC.idle={R:o.armR||[.62*b,1.0,.12],L:o.armL||[-.62*b,1.0,.12]}; AXC.b=b; AXC.shY=shY; }
    else if(AXC.cur){ o=Object.assign({},o,{armR:AXC.cur.R,armL:AXC.cur.L}); } }
  for(const s of [-1,1]){
    let sw=0, lift=0;
    if(WK!=null){ const ph=WK+(s>0?0:Math.PI); sw=Math.sin(ph)*.34; lift=Math.max(0,Math.cos(ph))*.17; }
    const D=[0,lift,sw], kz=.01+sw*.55+lift*.9, ky=hipY*.55+lift*.55, ay=.2+lift*.9;
    S.tube([s*gap,ay,sw],[s*gap,ky,kz],.115*b,.14*b,lg);
    S.tube([s*gap,ky,kz],[s*gap,hipY,0],.14*b,.15*b,lg);
    S.ell([s*gap,ky,kz+.01],[.145*b,.1,.145*b],lg,{rings:6,seg:10});
    if(o.knee) S.ell([s*gap,ky,kz+.11*b],[.12*b,.14,.07],o.knee,{rings:5,seg:8,shine:.5});
    S.tube(add([s*gap,.36,0],D),add([s*gap,.2,0],D),.125*b,.15*b,bt,{seg:12});
    S.tube(add([s*gap,.2,0],D),add([s*gap,.16,0],D),.15*b,.15*b,bt,{seg:12});
    S.tube(add([s*gap,.4,0],D),add([s*gap,.35,0],D),.14*b,.14*b,o.cuff||trim,{seg:12,shine:.5});
    const tilt=WK!=null?-Math.cos(WK+(s>0?0:Math.PI))*.35:0;
    S.ell(add([s*gap,.1,.1],D),[.16*b,.1,.27],bt,{shine:.4,rot:[tilt,0,0]});
    S.ell(add([s*gap,.095,.3],D),[.13*b,.075,.1],o.toe||bt,{rings:5,seg:8,shine:.5});
    S.box(add([s*gap,.025,.1],D),[.3*b,.05,.52],'#14141a',{rot:[tilt,0,0]});
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

/* ---------- Универсальная анимация бойцов (ходьба / атака / способности / ульта) ----------
   Для героев, у которых модель написана без поз: поверх неё работает система gaReg.
   AXC — контекст текущего рендера: руки ведутся по ключевым кадрам, а оружие, которое герой
   держит в руке, жёстко «приклеивается» к ней через hmark()/hold() (поворот + сдвиг граней). */
let AXC=null;
const hmark=S=>S.faces.length;
function rotTo(a,b){
  const v=cross(a,b), c=dot(a,b);
  if(c<-.9999) return x=>x;
  const k=1/(1+c);
  return x=>{ const cv=cross(v,x), dv=dot(v,x); return [x[0]*c+cv[0]+v[0]*dv*k, x[1]*c+cv[1]+v[1]*dv*k, x[2]*c+cv[2]+v[2]*dv*k]; };
}
function hold(S,m,side){
  const A=AXC; if(!A||!A.cur||A.cap) return;
  const I=side==='R'?A.idle.R:A.idle.L, C=side==='R'?A.cur.R:A.cur.L, s=side==='R'?1:-1;
  const sh=[s*.5*A.b,A.shY,0], k=S.sc;
  const a=norm(sub(I,sh)), c=norm(sub(C,sh));
  const R=rotTo(a,c), ip=mul(I,k), tr=sub(mul(C,k),ip);
  const mv=q=>add(add(R(sub(q,ip)),ip),tr);
  for(let i=m;i<S.faces.length;i++){
    const f=S.faces[i];
    f.p=f.p.map(mv); f.c=mv(f.c);
    if(f.nm) f.nm=R(f.nm);
    if(f.vn) f.vn=f.vn.map(R);
  }
}
function robe(S,rb,rt,h,col,trim,gl){
  const rw=CUR_WALK==null?0:Math.sin(CUR_WALK)*.07, rx=CUR_WALK==null?0:Math.sin(CUR_WALK*2)*.025;
  S.tube([rx,.04,rw],[0,h*.55,0],rb,rb*.78+rt*.22,col,{seg:22});
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

MODELS.pyro=(S,d,t,pose)=>{
  const ga=gaState(d.id,pose,t), O=sub(ga.R,[.78,1.4,.38]), Q=(x,y,z)=>add([x,y,z],O);
  man(S,{nobelt:true,face:true,cloth:'#8a1f10',arm:'#a52d18',bracer:'#ffcf63',armR:ga.R,armL:ga.L,glove:'#e8b894',skin:'#e8b894',fo:{eye:'#ff9a2a',glow:1,angry:.3,mouth:'grin'},collar:'#ffcf63',beard:'#6b2410'});
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
  S.tube(Q(.78,0,.38),Q(.78,2.35,.38),.05,.05,'#5b3a1e');
  for(let i=0;i<4;i++) S.tube(Q(.78,.5+i*.5,.38),Q(.78,.56+i*.5,.38),.075,.075,'#ffcf63',{shine:.6});
  const f=flick(t,1)*.04+ga.fx*.07;
  for(let i=0;i<4;i++){ const a=i*1.57; S.cone(Q(.78+Math.cos(a)*.1,2.35,.38+Math.sin(a)*.1),Q(.78+Math.cos(a)*.27,2.78,.38+Math.sin(a)*.27),.04,'#ffcf63',{seg:5}); }
  S.ell(Q(.78,2.55,.38),[.2,.24+f,.2],'#ffcf63',{glow:1});
  S.cone(Q(.78,2.6,.38),Q(.78,3.15+f*2,.38),.14,'#ff762f',{glow:1});
  S.cone(Q(.78,2.6,.38),Q(.78,2.95+f*2,.38),.09,'#fff3b0',{glow:1});
  { const lb=add(ga.L,[0,.35+flick(t,3)*.03,.05]), lr=.22*(1+ga.fx*.5);
    S.ell(lb,[lr,lr,lr],'#ff9a3c',{glow:1});
    S.cone(add(lb,[0,.05,0]),add(lb,[0,.4+flick(t,5)*.05+ga.fx*.2,0]),.12,'#ff762f',{glow:1}); }
  embers(S,t,1.0,'#ff9a3c',7,2.6);
  gaFx(S,ga);
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
  const _h1=hmark(S);
  S.obox([.82,1.3,.4],[.95,2.9,.5],.16,.045,'#e8f4ff',{shine:.9});
  S.obox([.84,1.5,.4],[.93,2.8,.5],.04,.05,'#9fb8c8');
  S.box([.82,1.32,.4],[.5,.07,.12],'#d7b36a',{shine:.7});
  S.ell([.82,1.34,.4],[.09,.05,.09],'#c0392b',{glow:1,rings:4,seg:8});
  S.tube([.8,1.0,.38],[.8,1.28,.38],.05,.05,'#4a2a1a');
  for(let i=0;i<4;i++) S.tube([.8,1.0+i*.07,.38],[.8,1.03+i*.07,.38],.058,.058,'#d7b36a');
  S.ell([.8,.95,.38],[.08,.08,.08],'#d7b36a',{shine:.7});
  hold(S,_h1,'R');
  const _h2=hmark(S);
  S.box([-.78,1.1,.3],[.05,1.0,.78],'#b9d8e7',{rot:[0,0,.15],shine:.6});
  G(S,[-.78,1.15,.34],.12,'#d7b36a',{glow:0,shine:.8}); G(S,[-.78,1.15,.34],.06,'#c0392b');
  hold(S,_h2,'L');
};

MODELS.grisha=(S,d,t,pose)=>{
  const ga=gaState(d.id,pose,t);
  man(S,{nobelt:true,face:true,cloth:'#4a2a8a',bracer:'#e0c8ff',armR:ga.R,armL:ga.L,glove:'#e8b894',beard:'#d8d2e8',fo:{eye:'#7ad8ff',glow:1,angry:-.05,brow:'#d8d2e8'},collar:'#e0c8ff'});
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
  cs.forEach((c,i)=>{const a=t*1.8+i*2.094+ga.fx*Math.sin(ga.p*3.14)*5; const p=[Math.cos(a)*.95,1.65+Math.sin(t*2+i)*.12,Math.sin(a)*.95];
    S.ell(p,[.17,.17,.17],c,{glow:1});
    if(i===0) for(let k=0;k<5;k++){const q=k*1.256+t*2; S.cone(add(p,[0,.1,0]),add(p,[Math.cos(q)*.24,.28,Math.sin(q)*.24]),.05,'#ff8a3a',{glow:1,seg:5});}
    if(i===1) for(let k=0;k<6;k++){const q=k*1.047; S.cone(add(p,[Math.cos(q)*.13,0,Math.sin(q)*.13]),add(p,[Math.cos(q)*.33,0,Math.sin(q)*.33]),.04,'#d9f7ff',{glow:1,seg:5});}
    if(i===2) S.tube(add(p,[-.15,.15,0]),add(p,[.15,-.15,.05]),.025,.025,'#fff3b0',{glow:1,seg:5});
  });
  S.ring([0,1.0,0],.95,.02,'#e0c8ff',{glow:1,n:26,phase:t*.5});
  for(const s of [-1,1]) G(S,add(s>0?ga.R:ga.L,[0,.16+Math.sin(t*3+s)*.05,.05]),.1*(1+ga.fx*.5),s>0?'#75d8ff':'#e58bff');
  gaFx(S,ga);
};

MODELS.golly=(S,d,t)=>{
  man(S,{nobelt:true,face:true,cloth:'#174d78',skin:'#cfe8f3',bracer:'#bfefff',armR:[.75,1.4,.4],armL:[-.65,1.35,.45],glove:'#cfe8f3',fo:{eye:'#7fe8ff',glow:1,angry:.1,brow:'#e8fbff',lip:'#6aa0c8'},beard:'#e8fbff',collar:'#bfefff',pad:'#bfefff'});
  robe(S,.62,.42,1.55,'#174d78','#bfefff',1);
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2; S.cone([Math.cos(a)*.6,.1,Math.sin(a)*.6],[Math.cos(a)*.7,.4+(i%3)*.12,Math.sin(a)*.7],.07,'#d9f7ff',{seg:5,glow:1});}
  S.tube([0,2.2,0],[0,2.27,0],.34,.32,'#bfefff',{seg:14,shine:.6,glow:1});
  for(let i=0;i<9;i++){const a=-1.1+i*.275; const hh=2.5+(i%3)*.2-Math.abs(i-4)*.04; S.cone([Math.sin(a)*.27,2.25,Math.cos(a)*.1-.02],[Math.sin(a)*.38,hh,Math.cos(a)*.1-.02],.07,'#d9f7ff',{glow:i%2===0});}
  for(const s of [-1,1]){ for(let i=0;i<3;i++) S.cone([s*(.5+i*.07),1.75,i*.05-.05],[s*(.75+i*.09),2.1+i*.22,i*.08-.05],.1-i*.015,'#bfefff',{glow:i===1}); }
  S.ell([0,1.18,.4],[.1,.14,.05],'#d9f7ff',{glow:1,rings:5,seg:8});
  const _h3=hmark(S);
  S.tube([.75,0,.4],[.75,2.2,.4],.05,.05,'#6fb4d6');
  for(let i=0;i<3;i++) S.tube([.75,.5+i*.5,.4],[.75,.56+i*.5,.4],.08,.08,'#bfefff');
  S.cone([.75,2.1,.4],[.75,2.85,.4],.15,'#d9f7ff',{glow:1}); S.cone([.75,2.1,.4],[.75,1.7,.4],.12,'#d9f7ff',{glow:1});
  for(let i=0;i<4;i++){const a=i*1.57; S.cone([.75+Math.cos(a)*.15,2.2,.4+Math.sin(a)*.15],[.75+Math.cos(a)*.4,2.45,.4+Math.sin(a)*.4],.045,'#9fe8ff',{glow:1,seg:5});}
  hold(S,_h3,'R');
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
    const _hs1=hmark(S);
    S.obox([s*.85,1.25,.45],[s*1.2,2.05,.75],.12,.035,'#e9bfd0',{shine:.8});
    S.obox([s*.85,1.25,.45],[s*1.05,1.0,.35],.1,.035,'#9d1d35',{glow:1});
    S.obox([s*.85,1.25,.45],[s*1.1,1.9,.7],.05,.04,'#9d1d35',{glow:1});
    hold(S,_hs1,s>0?'R':'L');
    S.cone([s*.52,1.65,0],[s*.7,2.05,-.05],.08,'#9d1d35');
    const _hs2=hmark(S);
    for(let k=0;k<3;k++) S.cone([s*(.9+k*.05),1.24,.45+k*.04],[s*(.98+k*.07),1.0-.1*k,.48+k*.05],.03,'#e9bfd0',{seg:5});
    G(S,[s*.97,.78-((t*.6+(s>0?0:.5))%1)*.3,.34],.03,'#d9425c');
    hold(S,_hs2,s>0?'R':'L');
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
  const _h4=hmark(S);
  S.tube([.95,.5,.4],[1.1,2.0,.45],.07,.07,'#e4b16f');
  for(let i=0;i<3;i++) S.tube([.97+i*.05,.7+i*.4,.4],[.97+i*.05,.76+i*.4,.4],.1,.1,'#4f2b26');
  S.box([1.1,2.05,.45],[.5,.34,.28],'#8a8a8a',{shine:.7});
  for(const s of [-1,1]) S.cone([1.1+s*.27,2.05,.45],[1.1+s*.42,2.05,.45],.1,'#c8c8c8',{seg:6,shine:.8});
  S.cone([1.1,2.22,.45],[1.1,2.5,.45],.08,'#c8c8c8',{seg:6});
  hold(S,_h4,'R');
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
  const _h5=hmark(S);
  S.tube([.3,1.25,.2],[.3,1.35,1.45],.06,.05,'#ff8a5e'); S.box([.3,1.2,.4],[.1,.3,.5],'#3b2a22');
  S.tube([.3,1.3,1.1],[.3,1.35,1.45],.09,.07,'#8a8a8a',{shine:.7});
  S.ell([.3,1.35,1.5],[.06,.06,.05],'#ffd08a',{glow:1,rings:4,seg:8});
  S.cone([.3,1.35,1.5],[.3,1.4,2.1+flick(t,2)*.1],.1,'#ff762f',{glow:1,seg:7});
  S.cone([.3,1.35,1.5],[.3,1.38,1.85],.06,'#fff3b0',{glow:1,seg:6});
  hold(S,_h5,'R');
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
  const _h6=hmark(S);
  S.tube([.65,.5,.45],[.65,1.5,.45],.025,.025,'#11323a');
  S.ell([.65,1.56,.45],[.06,.06,.06],'#79e4e4',{glow:1,rings:4,seg:8});
  hold(S,_h6,'R');
};

MODELS.shadow=(S,d,t,pose)=>{
  const ga=gaState(d.id,pose,t);
  const ch='#120707', ch2='#241010', rock='#190a0a', lava='#ff5a1f', hot='#ffb347', core='#fff0a8', ember='#e8300f';
  // изогнутый шип-«крыло»: цепочка конусов, сужается к кончику
  const horn=(pts,r0,col,o)=>{ const n=pts.length-1; for(let i=0;i<n;i++) S.tube(pts[i],pts[i+1],r0*(1-i/n),r0*(1-(i+1)/n),col,o||{seg:6}); };
  man(S,{bulk:1.1,nobelt:true,face:false,cloth:ch,skin:ch2,arm:rock,forearm:ch2,glove:ch2,armR:ga.R,armL:ga.L,legs:'#0b0404',boots:'#0b0404',
    headW:1.1,knee:ch2,bracer:'#4a170c',pad:rock,padTrim:lava,toe:ch2,cuff:ch2,trim:lava});
  // грудь: раскалённые рёбра-трещины + позвоночник
  S.box([0,1.5,.335],[.032,.64,.03],hot,{glow:1});
  for(let i=0;i<5;i++) for(const s of [-1,1])
    S.box([s*.125,1.72-i*.105,.335],[.22-.016*i,.026,.03],i%2?lava:hot,{glow:1,rot:[0,0,-s*.42]});
  for(let i=0;i<2;i++) for(const s of [-1,1]) S.box([s*.085,1.17-i*.1,.31],[.13,.022,.03],lava,{glow:1,rot:[0,0,-s*.3]});
  S.ell([0,1.42,.345],[.075,.075,.03],core,{glow:1,rings:4,seg:8});
  // плечи + крылья из шипов
  for(const s of [-1,1]){
    horn([[s*.42,1.82,-.12],[s*.62,2.15,-.22],[s*.95,2.55,-.3],[s*1.28,2.95,-.3],[s*1.38,3.2,-.26]],.25,ch);
    horn([[s*.5,1.78,-.1],[s*.85,1.98,-.2],[s*1.2,2.15,-.25],[s*1.5,2.2,-.2],[s*1.7,2.0,-.1]],.19,ch2);
    horn([[s*.5,1.66,-.1],[s*.85,1.62,-.18],[s*1.2,1.42,-.2],[s*1.45,1.05,-.15]],.15,ch);
    S.cone([s*.95,2.5,-.3],[s*1.32,2.42,-.28],.075,ch2,{seg:5}); S.cone([s*.64,2.17,-.22],[s*.98,2.28,-.26],.07,ch2,{seg:5}); S.cone([s*1.2,2.15,-.25],[s*1.4,2.5,-.3],.07,ch,{seg:5}); S.cone([s*.95,1.62,-.18],[s*1.15,1.9,-.2],.06,ch2,{seg:5});
    S.cone([s*1.36,3.15,-.27],[s*1.4,3.42,-.25],.045,lava,{glow:1,seg:5});
    S.cone([s*1.68,2.03,-.1],[s*1.82,1.82,-.05],.04,lava,{glow:1,seg:5});
    S.cone([s*.7,1.8,.05],[s*1.0,2.12,.18],.09,ch,{seg:5});
    S.cone([s*.78,1.7,.04],[s*1.08,1.86,.22],.06,ch2,{seg:5});
    // трещины на руках
    const h=s>0?ga.R:ga.L, sh=[s*.5,1.58,0], el=add(lerp(sh,h,.5),[s*.13,-.12,.1]), off=[0,0,.115];
    for(const [a,b,k] of [[sh,el,.28],[sh,el,.62],[el,h,.25],[el,h,.6]]){
      S.obox(add(lerp(a,b,k),off),add(lerp(a,b,k+.16),off),.034,.03,k>.5?hot:lava,{glow:1});
    }
    // горящая ладонь: пламя + когти
    for(let k=0;k<5;k++){ const fl=flick(t,k+(s>0?0:5)), ox=(k-2)*.045;
      S.cone(add(h,[ox,.04,.02]),add(h,[ox*1.5,.28+.12*fl+.2*ga.fx+(k===2?.14:0),.03]),.07-.006*Math.abs(k-2),k%2?hot:lava,{glow:1,seg:5}); }
    const dA=norm(sub(h,sh));
    for(let k=-1;k<=1;k++){ const b0=add(h,add(mul(dA,.1),[k*.045,0,.0])); S.cone(b0,add(b0,add(mul(dA,.2),[k*.04,0,.04])),.03,ch,{seg:5}); }
  }
  // спина: гребень
  for(let i=0;i<4;i++) S.cone([0,1.85-i*.22,-.3],[0,2.17-i*.22,-.68+i*.05],.08,ch2,{seg:5});
  // голова: лицо-череп
  for(const s of [-1,1]){
    S.box([s*.115,2.045,.3],[.15,.042,.035],hot,{glow:1,rot:[0,0,s*.45]});
    S.ell([s*.1,2.04,.315],[.034,.03,.02],core,{glow:1,rings:4,seg:6});
    S.box([s*.12,2.125,.29],[.21,.05,.05],ch,{rot:[0,0,s*.45]});
    S.cone([s*.15,2.2,.02],[s*.4,2.7,-.2],.085,ch,{seg:6});
    S.cone([s*.24,2.2,0],[s*.52,2.5,-.1],.06,ch2,{seg:5});
    S.cone([s*.25,1.93,.12],[s*.36,1.78,.22],.045,ch2,{seg:5});
  }
  // пасть: рваная, раскалённая
  S.box([0,1.9,.305],[.26,.1,.03],lava,{glow:1});
  S.box([0,1.9,.322],[.2,.03,.02],core,{glow:1});
  for(let i=0;i<6;i++){ const x=-.105+i*.042;
    S.cone([x,1.95,.318],[x,1.885,.322],.016,ch,{seg:4});
    S.cone([x+.02,1.85,.318],[x+.02,1.915,.322],.016,ch,{seg:4}); }
  // огненная голова: клубящееся пламя вокруг черепа
  S.ell([0,2.36,-.07],[.3,.22,.26],ember,{glow:1,rings:5,seg:10});
  for(let i=0;i<14;i++){ const a=i/14*Math.PI*2+i*.4, fl=flick(t,i*.9), rr=.17+.08*(i%3);
    const bx=Math.cos(a)*rr, bz=Math.sin(a)*rr*.75-.06, hh=2.6+.28*(i%4)+.18*fl+.2*ga.fx;
    S.cone([bx,2.2+.05*(i%2),bz],[bx*2.4+Math.sin(t*2.5+i)*.06,hh,bz*1.8-.1],.13-.012*(i%3),i%3===0?hot:(i%2?lava:ember),{glow:1,seg:6}); }
  S.cone([0,2.3,-.1],[0,3.1+.15*flick(t,9)+.35*ga.fx,-.16],.24,lava,{glow:1,seg:8});
  S.cone([0,2.34,-.08],[0,2.85+.12*flick(t,11)+.28*ga.fx,-.12],.15,hot,{glow:1,seg:7});
  S.cone([0,2.36,-.06],[0,2.6+.1*flick(t,13)+.2*ga.fx,-.08],.08,core,{glow:1,seg:6});
  // ноги тонут в огне
  for(let i=0;i<18;i++){ const a=i/18*Math.PI*2+t*.3+(i%2)*.2, fl=flick(t,i*1.3), r=.18+.17*((i*7)%3);
    S.cone([Math.cos(a)*r,.04,Math.sin(a)*r],[Math.cos(a)*r*.55+Math.sin(t*3+i)*.03,.55+.18*fl+.2*(i%4),Math.sin(a)*r*.55],.095,[ember,lava,hot][i%3],{glow:1,seg:5}); }
  // искры и души
  for(let i=0;i<9;i++){ const y=((t*.55+i*.31)%2.6)+.25, x=Math.sin(i*7.1+t*1.3)*.75, z=Math.cos(i*4.3+t)*.55;
    G(S,[x,y,z],.022+.012*(i%3),i%2?hot:lava,{rings:3,seg:5}); }
  for(let i=0;i<3;i++){ const a=t*1.5+i*2.09; G(S,[Math.cos(a)*1.0,1.3+Math.sin(t*2+i)*.2,Math.sin(a)*1.0],.07,'#ff7043'); }
  S.ring([0,.04,0],.9,.03,lava,{glow:1,n:24,phase:t});
  gaFx(S,ga);
};

MODELS.electricGosha=(S,d,t,pose)=>{
  const ga=gaState(d.id,pose,t);
  man(S,{face:true,cloth:'#237aa3',arm:'#237aa3',glove:'#7feaff',armR:ga.R,armL:ga.L,legs:'#174e68',belt:'#7feaff',trim:'#7feaff',knee:'#7feaff',bracer:'#7feaff',chest:'#174e68',chestTrim:'#7feaff',pad:'#174e68',padTrim:'#7feaff',fo:{eye:'#7feaff',glow:1,angry:.25,mouth:'grin'},collar:'#7feaff'});
  S.ell([0,1.5,.34],[.13,.13,.05],'#e8ffff',{glow:1,rings:6,seg:10});
  S.ring([0,1.5,.36],.17,.02,'#7feaff',{glow:1,axis:'z',n:12,phase:t*2});
  for(let i=0;i<10;i++){const a=-1.3+i*.29, hgt=.35+(i%3)*.12; S.cone([Math.sin(a)*.22,2.2+Math.cos(a)*.05,-.02],[Math.sin(a)*.5,2.2+hgt+.2,-.02-(i%2)*.1],.07,'#7feaff',{glow:1,seg:5});}
  S.tube([-.3,2.12,.15],[.3,2.12,.15],.04,.04,'#174e68',{seg:6});
  for(const s of [-1,1]){ S.tube([s*.12,2.1,.25],[s*.12,2.1,.3],.1,.1,'#174e68',{seg:10}); S.ell([s*.1,2.03,.25],[.05,.04,.03],'#e8ffff',{glow:1,rings:4,seg:6});
    S.tube([s*.55,1.75,0],[s*.55,2.1,0],.04,.04,'#8a8a8a',{seg:6}); S.ell([s*.55,2.15,0],[.08,.08,.08],'#7feaff',{glow:1,rings:4,seg:8});
    const hh=s>0?ga.R:ga.L, p0=[s*.5,1.55,0], p3=hh, p1=add(lerp(p0,p3,.33),[s*.22,.32,.05]), p2=add(lerp(p0,p3,.66),[s*.08,.1,.05]);
    S.tube(p0,p1,.035,.035,'#b9f8ff',{glow:1,seg:5}); S.tube(p1,p2,.035,.035,'#b9f8ff',{glow:1,seg:5}); S.tube(p2,p3,.035,.035,'#b9f8ff',{glow:1,seg:5}); }
  const c=add(lerp(ga.R,ga.L,.5),[0,.05,.2]), bs=1+.55*ga.fx; S.ell(c,[.26*bs,.26*bs,.26*bs],'#b9f8ff',{glow:1,rings:6,seg:10});
  S.ring(c,.36*bs,.02,'#7feaff',{glow:1,axis:'x',n:14,phase:t*3});
  for(let i=0;i<7;i++){const a=t*3+i*.9, b=t*2+i; const dir=norm([Math.cos(a),Math.sin(b),Math.sin(a)]); const e=add(c,mul(dir,.55+.1*flick(t,i))); S.cone(add(c,mul(dir,.2)),e,.05,'#7feaff',{glow:1,seg:5});
    S.cone(e,add(e,mul([Math.sin(b),Math.cos(a),Math.sin(i)],.18)),.035,'#e8ffff',{glow:1,seg:4}); }
  S.ring([0,.04,0],.8,.03,'#7feaff',{glow:1,n:22,phase:-t*2});
  gaFx(S,ga);
};

MODELS.mo3gi=(S,d,t,pose)=>{
  const ga=gaState(d.id,pose,t), O=sub(ga.R,[.4,1.25,.75]), P=(x,y,z)=>add([x,y,z],O);
  man(S,{face:true,bulk:1.1,cloth:'#294638',arm:'#294638',glove:'#1e3328',legs:'#223a2d',boots:'#161c18',belt:'#3a4a3c',armR:ga.R,armL:ga.L,knee:'#1e3328',bracer:'#3a4a3c',trim:'#7dffb0',skin:'#d9a07e',fo:{eye:'#3a2a1c',angry:.28,mouth:'stern',brow:'#1a1a14'}});
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
  S.box(P(.25,1.25,.2),[.12,.22,.7],'#222'); S.tube(P(.25,1.3,.5),P(.25,1.35,1.5),.05,.05,'#222'); S.box(P(.25,1.42,.8),[.07,.1,.3],'#444');
  S.tube(P(.25,1.35,1.2),P(.25,1.35,1.5),.08,.08,'#555',{seg:8,shine:.7});
  S.box(P(.25,1.1,.5),[.08,.28,.14],'#3a3a3a');
  if(ga.kind==='attack'&&ga.burst>.05){ const mz=P(.25,1.35,1.55), bb=ga.burst; G(S,mz,.08+.16*bb,'#fff3b0');
    for(let i=0;i<5;i++){ const a=i/5*Math.PI*2+.3; S.cone(mz,add(mz,[Math.cos(a)*.2*bb,Math.sin(a)*.2*bb,.22+.3*bb]),.03,'#ffd36b',{glow:1,seg:4}); } }
  const by=2.45+Math.sin(t*2)*.08, c=[1.05,by,.25];
  S.box(c,[.3,.1,.3],'#7dffb0',{glow:1});
  S.ell([c[0],c[1]-.1,c[2]],[.08,.06,.08],'#17202b',{rings:4,seg:8});
  S.ell([c[0],c[1]-.14,c[2]+.05],[.03,.03,.03],'#ff4b24',{glow:1,rings:3,seg:5});
  for(const [dx,dz] of [[1,1],[-1,1],[1,-1],[-1,-1]]){ const p=[c[0]+dx*.22,c[1]+.04,c[2]+dz*.22]; S.tube(c,p,.015,.015,'#444',{seg:4}); S.tube(add(p,[0,.01,0]),add(p,[Math.cos(t*30)*.16,.01,Math.sin(t*30)*.16]),.012,.012,'#9aa',{seg:4}); }
  gaFx(S,ga);
};

MODELS.tribupainer=(S,d,t,pose)=>{
  const ga=gaState(d.id,pose,t), O=sub(ga.R,[.45,1.2,.6]), P=(x,y,z)=>add([x,y,z],O);
  man(S,{nobelt:true,face:true,bulk:1.1,cloth:'#4a3028',arm:'#4a3028',glove:'#2c1b15',legs:'#2c1b15',armR:ga.R,armL:ga.L,beard:'#2c1b15',skin:'#d9a07e',fo:{eye:'#7a5a2c',angry:.3,mouth:'stern',brow:'#2c1b15'},bracer:'#6b4423',collar:'#ffb36b'});
  robe(S,.58,.5,1.4,'#4a3028','#ffb36b');
  for(let i=0;i<8;i++){ S.tube([-.35+i*.1,1.75-i*.06,.38],[-.35+i*.1,1.6-i*.06,.38],.03,.03,i%2?'#c0392b':'#ffd08a',{seg:6}); }
  S.tube([-.4,1.8,.32],[.4,1.1,.4],.045,.045,'#6b4423',{seg:6});
  S.box([0,1.0,.45],[.9,.1,.1],'#6b4423'); for(let i=0;i<5;i++) S.box([-.36+i*.18,.96,.5],[.1,.14,.08],'#ffb36b');
  S.tube([0,2.22,0],[0,2.28,0],.64,.64,'#2c1b15',{seg:16});
  S.tube([0,2.25,0],[0,2.64,0],.3,.28,'#2c1b15',{seg:12});
  S.tube([0,2.3,0],[0,2.4,0],.31,.31,'#ffb36b',{seg:12,shine:.6});
  S.ell([0,2.45,.27],[.06,.06,.02],'#ffd08a',{glow:1,rings:4,seg:6});
  for(const s of [-1,1]){ S.tube(P(.45+s*.06,1.3,.1),P(.45+s*.06,1.34,2.2),.06,.06,'#8a8a8a',{shine:.7});
    S.tube(P(.45+s*.06,1.32,1.9),P(.45+s*.06,1.34,2.22),.075,.075,'#555',{shine:.7});
    S.ell(P(.45+s*.06,1.34,2.22),[.07,.07,.05],'#ffb36b',{glow:1,rings:4,seg:8}); }
  S.cone(P(.45,1.34,2.3),P(.45,1.36,2.65+flick(t,1)*.06+ga.burst*.7),.08+ga.burst*.1,'#ff9a3c',{glow:1,seg:6});
  if(ga.burst>.05){ const mz=P(.45,1.35,2.35), bb=ga.burst; G(S,mz,.1+.2*bb,'#fff3b0');
    for(let i=0;i<6;i++){ const a=i/6*Math.PI*2; S.cone(mz,add(mz,[Math.cos(a)*.3*bb,Math.sin(a)*.3*bb,.25+.4*bb]),.035,'#ffd36b',{glow:1,seg:4}); } }
  S.box(P(.45,1.28,1.1),[.22,.16,.8],'#6b4423',{shine:.4});
  S.box(P(.45,1.2,-.15),[.18,.3,.7],'#6b4423',{rot:[-.2,0,0]});
  for(let i=0;i<4;i++) S.box(P(.45,1.15+i*.0,.0+i*.28),[.26,.03,.03],'#ffb36b',{shine:.6});
  S.tube(P(.45,1.4,.2),P(.45,1.7,.1),.05,.05,'#8a8a8a',{seg:6});
  gaFx(S,ga);
};

MODELS.mageHunter=(S,d,t,pose)=>{
  const ga=gaState(d.id,pose,t);
  man(S,{nobelt:true,face:false,cloth:'#24184d',arm:'#24184d',glove:'#a980ff',armR:ga.R,armL:ga.L,legs:'#160f33',bracer:'#a980ff',knee:'#a980ff',collar:'#a980ff',chest:'#160f33',chestTrim:'#a980ff'});
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
    { const h=s>0?ga.R:ga.L, bd=norm(add(norm(sub(h,[s*.5,1.58,0])),[s*.15,.55,.25]));
      S.obox(h,add(h,mul(bd,.85+.25*ga.fx)),.1,.03,'#d58cff',{glow:1});
      S.obox(h,add(h,mul(bd,.4)),.18,.06,'#a980ff',{shine:.7});
      S.obox(h,sub(h,mul(bd,.28)),.04,.04,'#a980ff',{shine:.7}); } }
  for(let i=0;i<3;i++){ const a=t*1.3+i*2.09; S.box([Math.cos(a)*1.1,1.2+Math.sin(t*2+i)*.2,Math.sin(a)*1.1],[.12,.12,.02],'#d58cff',{glow:1,rot:[0,-a,.785]}); }
  gaFx(S,ga);
};

MODELS.regina=(S,d,t,pose)=>{
  const red=d.skinId==='reginaRed';
  const hair=red?'#641126':'#3a1a2a', cloth=red?'#5b101e':'#6e3048', acc=red?'#ff4058':'#ff9fbd';
  const ga=gaState(d.id,pose,t,[acc,'#fff0f4']);
  man(S,{nobelt:true,bulk:.9,face:true,cloth:cloth,arm:cloth,glove:'#e9b39e',skin:'#e9b39e',armR:ga.R,armL:ga.L,legs:'#2a1520',belt:acc,trim:acc,bracer:acc,knee:acc,chest:'#2a1520',chestTrim:acc,pad:'#2a1520',padTrim:acc,fo:{eye:red?'#ff4058':'#ff9fbd',glow:1,angry:.22,mouth:'smile',lip:red?'#8a1426':'#c0506a',brow:hair,cheeks:'#f09a90'},collar:acc});
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
  for(const s of [-1,1]){ S.ell([s*.35,1.7,-.1],[.1,.4,.1],hair); S.cone([s*.36,1.35,-.1],[s*.34,.95,-.1],.08,hair,{seg:6}); { const h=s>0?ga.R:ga.L, bd=norm(add(norm(sub(h,[s*.5,1.58,0])),[s*.15,.55,.25])); S.obox(h,add(h,mul(bd,.75+.2*ga.fx)),.1,.03,acc,{glow:1}); S.obox(h,sub(h,mul(bd,.4)),.07,.03,'#2a1520',{shine:.5}); S.box(h,[.14,.06,.14],acc,{shine:.7}); }
    S.box([s*.12,2.14,.22],[.06,.02,.02],hair,{rot:[0,0,s*.4]}); }
  S.cone([-.15,1.62,.35],[-.4,1.35,.28],.04,acc,{seg:4,glow:1}); S.cone([.15,1.62,.35],[.4,1.35,.28],.04,acc,{seg:4,glow:1});
  embers(S,t,.9,acc,4,2.0);
  gaFx(S,ga);
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
  const _h7=hmark(S);
  S.tube([.9,.25,.4],[.95,2.0,.45],.1,.15,'#d9f5a6',{shine:.6}); S.ell([.95,2.1,.45],[.2,.17,.2],'#a7ff70',{glow:1});
  for(let i=0;i<3;i++) G(S,[.9+Math.sin(t*3+i)*.2,2.35+((t*.7+i*.33)%1)*.4,.45+Math.cos(t*3+i)*.2],.05,'#a7ff70');
  hold(S,_h7,'R');
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
  const _h8=hmark(S);
  S.tube([.85,.85,.5],[.85,1.9,.5],.06,.06,'#5b3a1e'); S.box([.85,2.05,.5],[.7,.35,.35],'#ffe39a',{glow:1});
  S.box([.85,2.05,.5],[.8,.2,.4],'#d7a24a',{shine:.7});
  S.ell([.85,2.05,.7],[.09,.09,.04],'#fff3b0',{glow:1,rings:4,seg:8});
  hold(S,_h8,'R');
  const _h9=hmark(S);
  S.ell([-.85,1.2,.3],[.07,.5,.4],'#fff3b0',{shine:.7});
  S.ell([-.88,1.2,.3],[.05,.2,.18],'#ffe39a',{glow:1,rings:5,seg:8});
  for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; S.cone([-.9,1.2+Math.sin(a)*.2,.3+Math.cos(a)*.2],[-.97,1.2+Math.sin(a)*.5,.3+Math.cos(a)*.5],.03,'#ffe39a',{glow:1,seg:4}); }
  hold(S,_h9,'L');
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
  const _h10=hmark(S);
  for(let i=0;i<3;i++) S.tube([-.8,1.1-i*.12,.4],[-.8,.95-i*.12,.4],.1,.1,'#9bdfff',{seg:8,shine:.5,glow:0});
  S.ell([-.8,.7,.4],[.05,.12,.05],'#9bdfff',{glow:1,rings:4,seg:6});
  hold(S,_h10,'L');
  const _h11=hmark(S);
  S.obox([.9,1.1,.5],[1.0,3.0,.6],.2,.05,'#ff707a',{glow:1}); S.box([.9,1.15,.5],[.6,.08,.14],'#9bdfff');
  S.obox([.9,1.2,.5],[1.0,2.9,.6],.06,.055,'#ffe0e2',{glow:1});
  S.tube([.9,.95,.5],[.9,1.1,.5],.06,.06,'#2c5878'); S.ell([.9,.9,.5],[.09,.09,.09],'#9bdfff',{shine:.7});
  for(let i=0;i<5;i++){ const ph=(t*.4+i/5)%1; G(S,[.95,1.3+ph*1.5,.55+Math.sin(t*2+i)*.1],.03,'#ff707a'); }
  hold(S,_h11,'R');
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
  const _h12=hmark(S);
  S.tube([1.0,.45,.35],[1.15,2.0,.4],.1,.2,'#d69a61'); S.ell([1.15,2.05,.4],[.2,.14,.2],'#d69a61');
  S.tube([1.02,.7,.36],[1.05,.8,.36],.14,.14,'#3a2a1c',{seg:8});
  for(let i=0;i<5;i++){const a=i*1.26; S.cone([1.15+Math.cos(a)*.15,1.8+(i%2)*.15,.4+Math.sin(a)*.15],[1.15+Math.cos(a)*.36,1.8+(i%2)*.15,.4+Math.sin(a)*.36],.05,'#8a8a8a',{seg:5,shine:.8});}
  S.cone([1.15,2.15,.4],[1.15,2.45,.4],.07,'#8a8a8a',{seg:5,shine:.8});
  hold(S,_h12,'R');
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
const CH_SHOW=[['idle',2],['walk',2.4],['twirl',1.9],['attack',.55],['attack',.55],['idle',1],['cast',1,0],['idle',.7],['cast',1,2],['idle',.7],['cast',1.2,1],['idle',.8],['cast',1.5,3],['idle',1.2]];
const CH_SHOW_T=CH_SHOW.reduce((a,x)=>a+x[1],0);
function chipResolve(pose,t){
  if(!pose||pose.kind==='idle') return {kind:'idle',p:0};
  if(pose.kind!=='show') return pose;
  let tm=((t%CH_SHOW_T)+CH_SHOW_T)%CH_SHOW_T;
  for(const [k,du,sl] of CH_SHOW){ if(tm<du) return {kind:k,slot:sl,p:k==='walk'?tm*1.25:tm/du}; tm-=du; }
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
  if(kind==='walk'){ const ph=p*Math.PI*2; return {h:[.8,1.3+.03*Math.abs(Math.sin(ph)),.45-.1*Math.sin(ph)], d:norm([.025*Math.sin(ph),1,.035]), l:[-.65,1.35,.55+.2*Math.sin(ph)]}; }
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
  if(kind==='walk') CUR_WALK=p*Math.PI*2;
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

/* ---------- Общая система поз бойцов (атака / касты / витринный цикл) ----------
   Руки ведутся по ключевым кадрам, поверх — свечение, шлейфы, вспышки и снаряды. */
const GA={};
const E_lin=x=>x;
const GA_ST={
  punch:I=>[[.28,[.75,1.75,-.1],[-.55,1.45,.45],E_out],[.5,[.4,1.5,1.05],[-.5,1.45,.5],E_in],[.74,[.5,1.5,.8],[-.5,1.45,.5],E_out]],
  throw:I=>[[.3,[.8,2.15,-.2],[-.4,1.6,.7],E_out],[.52,[.45,1.45,1.0],[-.4,1.5,.5],E_in],[.76,[.5,1.4,.8],[-.45,1.5,.5],E_out]],
  dual:I=>[[.28,[.35,1.45,.25],[-.35,1.45,.25],E_out],[.5,[.3,1.55,1.05],[-.3,1.55,1.05],E_in],[.76,[.35,1.5,.9],[-.35,1.5,.9],E_out]],
  raise:I=>[[.36,[.5,2.35,.15],[-.5,2.35,.15],E_out],[.56,[.35,1.15,.95],[-.35,1.15,.95],E_in],[.8,[.4,1.2,.9],[-.4,1.2,.9],E_out]],
  clap:I=>[[.3,[1.05,1.5,.1],[-1.05,1.5,.1],E_out],[.55,[.1,1.5,1.0],[-.1,1.5,1.0],E_in],[.8,[.3,1.5,.85],[-.3,1.5,.85],E_out]],
  fan:I=>[[.36,[1.05,2.0,.2],[-1.05,2.0,.2],E_out],[.58,[1.0,1.95,.5],[-1.0,1.95,.5],E_lin],[.82,[1.0,1.95,.5],[-1.0,1.95,.5],E_lin]],
  slashR:I=>[[.3,[.85,2.1,-.25],[-.5,1.4,.5],E_out],[.5,[.35,1.15,.9],[-.5,1.4,.5],E_in],[.74,[.5,1.3,.8],[-.5,1.4,.5],E_out]],
  cross:I=>[[.3,[.95,2.0,-.1],[-.95,2.0,-.1],E_out],[.5,[-.25,1.3,.95],[.25,1.3,.95],E_in],[.76,[.2,1.35,.85],[-.2,1.35,.85],E_out]],
  conj:I=>[[.2,[.9,1.6,.2],[-.9,1.6,.2],E_out],[.4,[.5,2.3,.1],[-.5,2.3,.1],E_out],[.56,[.3,1.6,1.0],[-.3,1.6,1.0],E_in],[.8,[.4,1.55,.9],[-.4,1.55,.9],E_out]],
  guard:I=>[[.3,[.2,1.5,.8],[-.2,1.5,.8],E_out],[.7,[.2,1.5,.8],[-.2,1.5,.8],E_lin]],
  lup:I=>[[.35,null,[-.5,2.2,.4],E_out],[.6,null,[-.45,2.1,.5],E_lin],[.8,null,[-.45,2.1,.5],E_lin]],
  lpoint:I=>[[.3,null,[-.6,1.7,.5],E_out],[.5,null,[-.5,1.6,1.1],E_in],[.8,null,[-.5,1.6,1.05],E_lin]],
  ldown:I=>[[.4,null,[-.5,.9,.7],E_out],[.7,null,[-.5,.9,.7],E_lin]],
  lwave:I=>[[.25,null,[-.8,1.9,.2],E_out],[.5,null,[-.4,2.0,.2],E_io],[.75,null,[-.8,1.9,.2],E_io]],
  recoil:I=>[[.18,I.R,I.L,E_out],[.4,add(I.R,[0,.14,-.3]),add(I.L,[0,.1,-.3]),E_out],[.75,I.R,I.L,E_out]],
  bigrecoil:I=>[[.2,add(I.R,[0,.05,.1]),add(I.L,[0,.05,.1]),E_out],[.42,add(I.R,[0,.3,-.45]),add(I.L,[0,.25,-.45]),E_out],[.8,I.R,I.L,E_out]],
  sweep:I=>[[.3,[1.15,1.5,-.25],null,E_out],[.5,[-.35,1.4,1.0],null,E_in],[.76,[.35,1.35,.85],null,E_out]],
  stab:I=>[[.3,[.45,1.3,-.1],[-.3,1.3,.2],E_out],[.5,[.6,1.4,1.25],[-.3,1.35,.55],E_in],[.76,[.55,1.35,.9],null,E_out]],
  whirl:I=>[[.16,[1.15,1.5,.1],[-1.0,1.45,.0],E_out],[.32,[.35,1.5,1.1],[-.4,1.5,-.9],E_lin],[.48,[-.95,1.5,.15],[.95,1.5,.15],E_lin],[.64,[-.35,1.5,-.9],[.35,1.5,1.0],E_lin],[.8,[1.1,1.5,.05],[-1.0,1.45,.0],E_out]],
  flurry:I=>[[.14,[.95,1.9,.2],null,E_out],[.26,[.35,1.2,1.05],null,E_in],[.38,[1.0,1.5,.8],null,E_io],[.5,[-.25,1.4,1.05],null,E_in],[.62,[.85,1.95,.25],null,E_out],[.74,[.45,1.25,1.0],null,E_in],[.86,[.55,1.35,.85],null,E_out]],
  bash:I=>[[.3,null,[-.45,1.35,.35],E_out],[.5,[.5,1.35,.6],[-.35,1.4,1.15],E_in],[.76,null,[-.55,1.3,.65],E_out]],
  aim:I=>[[.3,add(I.R,[.05,.08,.05]),add(I.L,[.05,.05,.1]),E_out],[.5,add(I.R,[.05,.05,.1]),add(I.L,[.05,.03,.12]),E_lin],[.8,add(I.R,[.05,.03,.08]),add(I.L,[.05,.02,.1]),E_out]],
  gunup:I=>[[.35,add(I.R,[0,.9,-.1]),add(I.L,[.1,.9,-.2]),E_out],[.56,add(I.R,[0,.12,.45]),add(I.L,[0,.1,.4]),E_in],[.8,add(I.R,[0,.05,.3]),add(I.L,[0,.05,.3]),E_out]]
};
function gaReg(id,cfg){
  const mk=st=>{ const list=(typeof st==='function'?st:GA_ST[st])(cfg.idle);
    const e=(p)=>({p,R:cfg.idle.R,L:cfg.idle.L,e:E_io});
    return [e(0)].concat(list.map(([p,R,L,ez])=>({p,R:R||cfg.idle.R,L:L||cfg.idle.L,e:ez||E_io})),[e(1)]); };
  cfg.keys={attack:mk(cfg.att)}; cfg.casts.forEach((c,i)=>{ cfg.keys['c'+i]=mk(c); });
  cfg.hit=cfg.hit||.5; GA[id]=cfg;
  ANIM[id]=[{kind:'attack',p:.3},{kind:'attack',p:.5},{kind:'walk',p:.25},{kind:'walk',p:.75}];
  cfg.casts.forEach((_,i)=>{ ANIM[id].push({kind:'cast',slot:i,p:.3},{kind:'cast',slot:i,p:.55}); });
}
function gaShow(cfg){
  if(cfg._show) return cfg._show;
  const n=cfg.casts.length, L=[['idle',1.2],['walk',2.4],['attack',.8],['attack',.8],['idle',.8]];
  for(let i=0;i<n;i++){ L.push(['cast',i===n-1?1.5:1.15,i]); L.push(['idle',.7]); }
  cfg._show=L; cfg._showT=L.reduce((a,x)=>a+x[1],0); return L;
}
function gaResolve(cfg,pose,t){
  if(!pose||!pose.kind||pose.kind==='idle') return {kind:'idle',p:0};
  if(pose.kind!=='show') return pose;
  const L=gaShow(cfg), T=cfg._showT; let tm=((t%T)+T)%T;
  for(const [k,du,sl] of L){ if(tm<du) return {kind:k,slot:sl,p:k==='walk'?tm*1.25:tm/du}; tm-=du; }
  return {kind:'idle',p:0};
}
function gaCore(cfg,kind,slot,p,t){
  let key=null;
  if(kind==='attack') key='attack';
  else if(kind==='cast'){ const n=cfg.casts.length; key='c'+((((slot|0)%n)+n)%n); }
  if(kind==='walk'){ const ph=p*Math.PI*2, am=cfg.walkArm==null?.18:cfg.walkArm;
    return {R:add(cfg.idle.R,[0,.03*Math.abs(Math.sin(ph)),-Math.sin(ph)*am]),L:add(cfg.idle.L,[0,.03*Math.abs(Math.sin(ph)),Math.sin(ph)*am])}; }
  if(!key||!cfg.keys[key]) return {R:add(cfg.idle.R,[.012*Math.sin(t*1.6),.016*Math.sin(t*1.6),0]),L:add(cfg.idle.L,[0,.016*Math.sin(t*1.6+1),0])};
  const KS=cfg.keys[key];
  for(let i=1;i<KS.length;i++) if(p<=KS[i].p){ const a=KS[i-1], b=KS[i], u=b.e(cl01((p-a.p)/(b.p-a.p))); return {R:lerp(a.R,b.R,u),L:lerp(a.L,b.L,u)}; }
  const e=KS[KS.length-1]; return {R:e.R,L:e.L};
}
function gaState(id,pose,t,col){
  const cfg=GA[id], rp=gaResolve(cfg,pose,t), kind=rp.kind, slot=rp.slot, p=rp.p||0;
  const c=gaCore(cfg,kind,slot,p,t);
  if(kind==='walk') CUR_WALK=p*Math.PI*2;
  const st={cfg,kind,slot,p,t,col:col||cfg.col,R:c.R,L:c.L,fx:0,burst:0,trail:[],shot:null,rings:[]};
  if(kind==='attack'){
    const h=cfg.hit; st.fx=.2+.8*bell(p,h,.13); st.burst=bell(p,h+.05,.12);
    if(cfg.ranged){ const u=(p-h)/.3; if(u>0&&u<1) st.shot={u}; }
  } else if(kind==='cast'){
    st.fx=.3+.7*bell(p,.54,.2); st.burst=bell(p,.54,.09);
    const n=cfg.casts.length, sl=(((slot|0)%n)+n)%n;
    if(cfg.rings&&cfg.rings.includes(sl)) for(const j of [0,.08]){ const k=(p-.52-j)/.4; if(k>0&&k<1) st.rings.push({r:.2+(cfg.ringR||.95)*E_out(k),w:.05*(1-k)+.02}); }
  }
  if(kind!=='idle'&&st.fx>.25){ for(let k=1;k<=6;k++){ const q=p-k*.035; if(q<.08) break; const cc=gaCore(cfg,kind,slot,q,t); st.trail.push(cc); } }
  return st;
}
function gaFx(S,st){
  if(st.kind==='idle') return;
  const cfg=st.cfg, c=st.col, none=cfg.hands==='none';
  const hs=none?[]:(cfg.hands==='R'?[st.R]:[st.R,st.L]);
  for(const h of hs){ G(S,h,.06+.11*st.fx,c[0]); G(S,h,.035+.06*st.fx,c[1]); }
  const off=cfg.trailOff||[0,0,0];
  st.trail.forEach((tp,i)=>{ const th=cfg.trail==='none'?[]:(cfg.hands==='R'?[tp.R]:[tp.R,tp.L]); for(const h of th) G(S,add(h,off),Math.max(.025,.1-i*.014),i%2?c[0]:c[1]); });
  if(st.burst>.05&&!none){ const b=st.burst;
    for(const h of hs){ for(let i=0;i<6;i++){ const a=i/6*Math.PI*2+.4, v=[Math.cos(a),Math.sin(a),.5]; S.cone(add(h,mul(v,.1)),add(h,mul(v,.18+.4*b)),.032,c[0],{glow:1,seg:5}); } G(S,h,.08+.12*b,c[1]); } }
  if(st.shot){ const u=st.shot.u, ph=cfg.shotBoth?[st.R,st.L]:[st.R];
    for(const h of ph){ const pos=add(h,[0,-.05*u,.15+1.7*u]), r=1-.3*u;
      if(cfg.multi){ cfg.multi.forEach((mc,i)=>{ const a=st.t*9+i*2.094; G(S,add(pos,[Math.cos(a)*.1,Math.sin(a)*.1,0]),.085*r,mc); }); G(S,pos,.06*r,c[1]); }
      else { G(S,pos,.13*r,c[0]); G(S,pos,.07*r,c[1]); }
      for(let k=1;k<=3;k++) G(S,add(pos,[0,0,-k*.2]),.1*(1-k*.2),c[0]); } }
  if(st.rings.length){ const kk=S.sc, tg=S.target; S.target=S.pre; S.sc=1;
    for(const r of st.rings) S.ring([0,.012,0],r.r,r.w,c[1],{glow:1,n:36});
    S.sc=kk; S.target=tg; }
}

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
  const _h13=hmark(S);
  S.ell([-.95,.9,.9],[.28,.28,.28],'#f3f3f3',{rings:6,seg:10}); S.ell([-.95,.9,1.15],[.1,.1,.06],'#222',{rings:4,seg:6});
  for(let i=0;i<5;i++){ const a=i/5*Math.PI*2; S.ell([-.95+Math.cos(a)*.21,.9+Math.sin(a)*.21,.95],[.06,.06,.03],'#222',{rings:3,seg:5}); }
  S.box([-.95,.92,1.18],[.03,.3,.02],'#fff'); for(let i=0;i<3;i++) S.box([-.95,.82+i*.08,1.19],[.14,.02,.02],'#fff');
  hold(S,_h13,'L');
  const _h14=hmark(S);
  S.tube([1.0,.4,.35],[1.1,2.0,.4],.1,.18,'#ffcc66');
  S.tube([1.0,.6,.36],[1.03,.7,.37],.14,.14,'#254f68',{seg:8});
  S.ell([1.1,2.05,.4],[.2,.14,.2],'#ffcc66');
  hold(S,_h14,'R');
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
  const _h15=hmark(S);
  S.obox([.6,1.25,.7],[.8,3.0,1.3],.07,.03,'#fff0bd',{glow:1}); S.box([.6,1.3,.75],[.18,.05,.18],'#ffe7a2');
  S.obox([.6,1.25,.7],[.8,3.0,1.3],.04,.045,'#ffffff',{glow:1});
  S.box([.6,1.28,.75],[.34,.04,.34],'#ffe7a2',{shine:.8});
  S.tube([.58,1.0,.68],[.6,1.25,.7],.045,.045,'#3a1210');
  for(let i=0;i<3;i++) S.tube([.585,1.04+i*.07,.685],[.59,1.07+i*.07,.69],.055,.055,'#ffe7a2',{shine:.6});
  S.ell([.58,.95,.68],[.07,.07,.07],'#c0392b',{rings:4,seg:8,shine:.7});
  hold(S,_h15,'R');
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
  const _h16=hmark(S);
  S.tube([1.0,0,.45],[1.0,2.8,.45],.17,.2,'#5b4a36',{seg:8});
  for(let i=0;i<3;i++) S.tube([1.0,.8+i*.7,.45],[1.0,.9+i*.7,.45],.24,.24,'#8bd4ff',{glow:1,seg:10});
  for(let i=0;i<4;i++) S.box([1.0,.45+i*.7,.65],[.12,.12,.05],'#8bd4ff',{glow:1,rot:[0,0,.785]});
  S.box([1.0,3.0,.45],[.5,.4,.5],'#6e6a60');
  S.cone([1.0,3.2,.45],[1.0,3.6,.45],.2,'#8b8a82',{seg:6});
  S.ell([1.0,2.9,.7],[.08,.08,.04],'#8bd4ff',{glow:1,rings:4,seg:6});
  hold(S,_h16,'R');
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
  const _h17=hmark(S);
  S.tube([.4,1.45,.2],[.4,1.55,2.1],.05,.04,'#2a2a2a',{shine:.6}); S.box([.4,1.4,.1],[.14,.26,.9],'#6b4423',{shine:.4});
  S.tube([.4,1.7,.8],[.4,1.7,1.3],.07,.07,'#222'); S.ell([.4,1.7,1.32],[.07,.07,.03],'#ffd27a',{glow:1,rings:4,seg:8});
  S.tube([.4,1.55,1.9],[.4,1.55,2.15],.07,.05,'#444',{seg:8,shine:.6});
  S.tube([.4,1.72,.95],[.4,1.55,1.4],.015,.015,'#555',{seg:4});
  S.box([.4,1.1,.9],[.05,.35,.12],'#555',{rot:[.2,0,0]});
  hold(S,_h17,'R');
  S.box([-.35,1.5,-.35],[.4,.8,.25],'#4a2a18');
  S.tube([-.35,1.95,-.35],[-.35,2.0,-.35],.14,.14,'#d7b36a',{seg:8});
  for(const s of [-1,1]) S.cone([s*.15,.18,-.05],[s*.15,.04,-.18],.03,'#8a8a8a',{seg:5,shine:.8});
  const _h18=hmark(S);
  G(S,[.4,1.72,1.42],.025,'#ff5368');
  hold(S,_h18,'R');
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
  CUR_WALK=(o.pose&&o.pose.kind==='walk')?(o.pose.p||0)*Math.PI*2:null;
  (MODELS[def.id]||fallback)(S,def,t,o.pose);
  const walkBob=(CUR_WALK==null)?0:Math.abs(Math.sin(CUR_WALK))*.035;
  CUR_WALK=null;
  const all=S.pre.concat(S.faces);
  const preCount=S.pre.length;
  const B=getBuf(W*H);
  B.w.fill(0,0,W*H); B.id.fill(-1,0,W*H);
  const Bw=B.w, Bid=B.id, Bl1=B.l1, Bl2=B.l2;
  const cyw=Math.cos(yaw), syw=Math.sin(yaw), cp=Math.cos(pitch), sp=Math.sin(pitch);
  const T=[0,1.3,0];
  const bob=Math.sin(t*1.6)*.025*(walkBob?0:1)+walkBob;
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
      // 0.8.7: убрано мелкое зерно («шершавость») — остались только очень мягкие широкие переходы тона
      const n1=vnoise(mx*2.2,my*2.2,mz*2.2);
      mul_=.965+.07*n1;
      if(sh>.4){                                   // металл — едва заметная шлифовка, без крапа
        const st=vnoise(mx*14,my*3,mz*14);
        mul_*=.99+.02*st; spcBoost=.92+.16*st;
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
    let orr=cr*mul_*(base+key*.84+fil*.17)+acc[0]*rm+spc+env*.5;
    let ogg=cg*mul_*(base+key*.8 +fil*.2 )+acc[1]*rm+spc+env*.55;
    let obb=cb*mul_*(base+key*.74+fil*.27)+acc[2]*rm+spc+env*.7;
    // 0.8.7: лёгкая насыщенность и мягкий S-образный контраст — цвета «чище», объём читается лучше
    const lum=orr*.299+ogg*.587+obb*.114;
    orr=lum+(orr-lum)*1.12; ogg=lum+(ogg-lum)*1.12; obb=lum+(obb-lum)*1.12;
    out[o4]=orr; out[o4+1]=ogg; out[o4+2]=obb;
    out[o4+3]=255;
  }

  /* ---- тонкий тёмный контур по силуэту и перепадам глубины (в 1/глубине) ---- */
  if(o.outline!==false){
    const thr=.0045;
    for(let y=1;y<H-1;y++) for(let x=1;x<W-1;x++){
      const idx=y*W+x; if(B.id[idx]<0) continue;
      const w=B.w[idx];
      if(w-B.w[idx-1]>thr||w-B.w[idx+1]>thr||w-B.w[idx-W]>thr||w-B.w[idx+W]>thr){
        const o4=idx*4; out[o4]*=.66; out[o4+1]*=.66; out[o4+2]*=.7;
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
const ANIM={ chip:[{kind:'walk',p:.25},{kind:'walk',p:.75},{kind:'attack',p:.28},{kind:'attack',p:.5},{kind:'cast',slot:0,p:.3},{kind:'cast',slot:0,p:.55},{kind:'cast',slot:1,p:.32},{kind:'cast',slot:1,p:.7},
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
/* ---------- 0.8.4: спрайты бойцов считаются в Web Worker ----------
   Раньше каждый новый ракурс/кадр анимации рендерился программным 3D прямо в
   главном потоке (10–45 мс на спрайт) — отсюда лаги у всех игроков. Теперь
   тяжёлая часть (сцена + растеризация) идёт в воркере, а в главном потоке
   остаётся только дешёвая putImageData. Пока спрайт не готов, показывается
   ближайший уже готовый кадр. Если воркер недоступен — старый путь с бюджетом. */
const SELF_SRC=(typeof document!=='undefined'&&document.currentScript&&document.currentScript.src)||null;
let WK=null, WK_STATE=0;                       // 0 — не пробовали, 1 — работает, -1 — недоступен
const PEND=new Set(), META_PEND=new Set(), BAD=new Set();
let sprFrame=0, sprLast=0, sprSlow=false;
function onWorkerMsg(e){
  const d=e.data; if(!d) return;
  if(d.t==='meta'){ SPR_META[d.key]=d.m; META_PEND.delete(d.key); return; }
  if(d.t==='err'){ PEND.delete(d.key); META_PEND.delete(d.key); BAD.add(d.key); return; }
  if(d.t==='spr'){
    PEND.delete(d.key);
    const m=SPR_META[d.mkey]; if(!m) return;
    const res={data:new Uint8ClampedArray(d.data),glow:d.glow?new Uint8ClampedArray(d.glow):null,W:d.W,H:d.H};
    const hi=toCanvas(res,'spr');
    const cv=mkCanvas(m.W,m.H), g=cv.getContext('2d');
    g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
    g.drawImage(hi,0,0,m.W,m.H);
    storeSprite(d.key,{canvas:cv,ax:m.ax,ay:m.ay,w:m.W,h:m.H,u:sprFrame});
  }
}
function getWorker(){
  if(WK_STATE!==0) return WK_STATE===1?WK:null;
  try{
    if(typeof Worker==='undefined'||!SELF_SRC||(typeof location!=='undefined'&&location.protocol==='file:')){ WK_STATE=-1; return null; }
    WK=new Worker(SELF_SRC);
    WK.onmessage=onWorkerMsg;
    WK.onerror=()=>{ WK_STATE=-1; try{ WK.terminate(); }catch(err){} WK=null; PEND.clear(); META_PEND.clear(); };
    WK_STATE=1;
  }catch(err){ WK_STATE=-1; WK=null; }
  return WK;
}
/* кэш с вытеснением давно не используемых спрайтов (раньше при 2000 весь кэш обнулялся → новая волна лагов) */
function storeSprite(key,s){
  if(!SPR[key]) sprCount++;
  SPR[key]=s;
  if(sprCount>SPR_CAP) evictSprites();
}
function evictSprites(){
  const keys=Object.keys(SPR);
  keys.sort((a,b)=>SPR[a].u-SPR[b].u);
  const drop=Math.ceil(keys.length*.3);
  for(let i=0;i<drop;i++) delete SPR[keys[i]];
  sprCount=keys.length-drop;
}
/* общая часть для воркера и синхронного пути: растеризация одного ракурса */
function spriteRaw(def,m,animated,pose,fr,ang){
  const yaw=ang-Math.PI/2;
  const sx=animated?1.5:m.ss;
  const W=Math.round(m.W*sx), H=Math.round(m.H*sx);
  const f=m.ppu*m.dd0*sx;
  const cp=Math.cos(BATTLE_PITCH);
  const cx=m.ax*sx;
  const cy=m.ay*sx-1.3*cp*f/m.dd0;
  return render(def,{W,H,yaw,pitch:BATTLE_PITCH,t:animated?pose.p*.9+.2:fr*FR_DT,f,cx,cy,pedestal:false,pose});
}
/* anim = {kind:'attack'|'cast', slot, p:0..1} — только для бойцов из ANIM */
function battleSprite(def,radius,facing,time,anim,probe){
  if(typeof document==='undefined'||!def) return null;
  radius=Math.round(radius||24);
  const wk=getWorker();
  const mkey=def.id+'|'+(def.skinId||'')+'|'+radius;
  let m=SPR_META[mkey];
  if(!m){
    if(wk){
      if(BAD.has(mkey)) return null;
      if(!META_PEND.has(mkey)&&META_PEND.size<4){
        META_PEND.add(mkey);
        wk.postMessage({t:'meta',key:mkey,def:{id:def.id,skinId:def.skinId,color:def.color},radius});
      }
      return null;
    }
    m=meta(def,radius);
  }
  const animated=!!(anim&&ANIM[def.id]);
  const NA=animated?ANG_A:ANG;
  const a=((Math.round((facing||0)/(Math.PI*2)*NA)%NA)+NA)%NA;
  let fr=0, pose, pk='i';
  if(animated){
    if(anim.kind==='walk'){ const wq=(Math.floor((((anim.p%1)+1)%1)*8))%8; pose={kind:'walk',p:wq/8}; pk='w_'+wq; }
    else { const q=Math.min(ANIM_Q,Math.max(0,Math.round(anim.p*ANIM_Q)));
    pose={kind:anim.kind,slot:anim.slot,p:q/ANIM_Q}; pk=anim.kind[0]+(anim.slot==null?'':anim.slot)+'_'+q; }
  } else { fr=(def.id.indexOf('mon_')===0)?0:Math.floor((time||0)/FR_DT)%FR; pose={kind:'idle'}; }   // 0.8.4: монстры — один кадр покоя на ракурс (оживляются в game.js)
  const base=def.id+'|'+(def.skinId||'')+'|'+radius+'|';
  const key=base+NA+'|'+a+'|'+pk+'|'+fr;
  if(probe) probe.key=key;
  let s=SPR[key];
  if(s){ s.u=sprFrame; return s; }
  /* ближайший уже готовый кадр (сначала тот же ракурс, потом покой) */
  const nearest=()=>{
    for(let d=0;d<=NA/2;d++) for(const sg of [1,-1]){
      const aa=((a+sg*d)%NA+NA)%NA, q=SPR[base+NA+'|'+aa+'|'+pk+'|'+fr]; if(q){ q.u=sprFrame; return q; }
    }
    if(animated){
      const q0=anim.kind==='walk'?Math.floor((((anim.p%1)+1)%1)*8)%8:Math.round(anim.p*ANIM_Q), kd=anim.kind[0]+(anim.slot==null?'':anim.slot)+'_';
      for(let dq=1;dq<=ANIM_Q;dq++) for(const sg of [-1,1]){
        const qq=q0+sg*dq; if(qq<0||qq>ANIM_Q) continue;
        for(let d=0;d<=NA/2;d++) for(const s2 of [1,-1]){ const q=SPR[base+NA+'|'+(((a+s2*d)%NA+NA)%NA)+'|'+kd+qq+'|0']; if(q){ q.u=sprFrame; return q; } }
      }
    }
    for(let d=0;d<=ANG/2;d++) for(const sg of [1,-1]){
      const aa=((Math.round(a/NA*ANG)+sg*d)%ANG+ANG)%ANG;
      for(let k=0;k<FR;k++){ const q=SPR[base+ANG+'|'+aa+'|i|'+k]; if(q){ q.u=sprFrame; return q; } }
    }
    return null;
  };
  const ang=a/NA*Math.PI*2;
  if(wk){
    /* асинхронный путь: ставим задачу воркеру, а пока рисуем ближайший готовый кадр */
    if(!BAD.has(key)&&!PEND.has(key)&&PEND.size<6){
      PEND.add(key);
      wk.postMessage({t:'spr',key,mkey,def:{id:def.id,skinId:def.skinId,color:def.color},radius,animated,pose,fr,ang});
    }
    return nearest();
  }
  /* запасной синхронный путь (нет Worker): не больше одного спрайта за кадр и не в «тяжёлом» кадре */
  if((sprMade>=1&&nowMs()-sprT0>8)||sprSlow){
    const q=nearest(); if(q||sprMade>=1) return q;
  }
  sprMade++;
  const res=spriteRaw(def,m,animated,pose,fr,ang);
  const hi=toCanvas(res,'spr');
  const cv=mkCanvas(m.W,m.H), g=cv.getContext('2d');
  g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high';
  g.drawImage(hi,0,0,m.W,m.H);
  s={canvas:cv,ax:m.ax,ay:m.ay,w:m.W,h:m.H,u:sprFrame};
  storeSprite(key,s); return s;
}
/* Предварительный прогрев: в начале матча воркер заранее считает покой и ходьбу всех бойцов */
const WARM=[];
function prewarm(list){
  if(!getWorker()) return;
  WARM.length=0;
  for(const pair of list){
    const def=pair[0], r=Math.round(pair[1]||24);
    if(!def||!MODELS[def.id]) continue;
    if(def.id.indexOf('mon_')===0){ for(let a=0;a<ANG;a++) WARM.push([def,r,a/ANG*Math.PI*2,0,null]); continue; }
    for(let a=0;a<ANG;a++) for(let k=0;k<FR;k++) WARM.push([def,r,a/ANG*Math.PI*2,k*FR_DT+.01,null]);
    for(let a=0;a<ANG_A;a++) for(let ph=0;ph<8;ph++) WARM.push([def,r,a/ANG_A*Math.PI*2,0,{kind:'walk',p:(ph+.5)/8}]);
  }
}
function pumpWarm(){
  let guard=0;
  while(WARM.length&&PEND.size<3&&guard++<4){
    const it=WARM[0], probe={};
    battleSprite(it[0],it[1],it[2],it[3],it[4],probe);
    if(probe.key===undefined) break;         // метаданные ещё считаются в воркере
    WARM.shift();
  }
}
function resetBudget(){
  const t=nowMs(); sprSlow=sprLast>0&&(t-sprLast)>24; sprLast=t; sprT0=t; sprMade=0; sprFrame++;
  if(WARM.length&&!sprSlow) pumpWarm();
}
function has(id){ return !!MODELS[id]; }

/* =========================================================
   0.8.2 — Шмедик (Earthshaker) и Сасыч (Bloodseeker):
   новые модели с настоящим скелетом (IK рук и ног), ходьбой
   на четырёх лапах / хищным бегом, ударом и 4 способностями.
   ========================================================= */
const RK=(p,ks)=>{                 // ключевые кадры: [[t,значение,easing?],...]; значение — число или массив
  if(p<=ks[0][0]) return ks[0][1];
  for(let i=1;i<ks.length;i++) if(p<=ks[i][0]){
    const a=ks[i-1], b=ks[i], e=(b[2]||E_io)(cl01((p-a[0])/((b[0]-a[0])||1)));
    return Array.isArray(a[1])?a[1].map((v,j)=>v+(b[1][j]-v)*e):a[1]+(b[1]-a[1])*e;
  }
  return ks[ks.length-1][1];
};
function mkRot(pitch,yaw,roll){
  const cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw),cr=Math.cos(roll),sr=Math.sin(roll);
  return v=>{ let x=v[0],y=v[1],z=v[2];
    let x1=x*cy+z*sy, z1=-x*sy+z*cy; x=x1; z=z1;           // скрутка корпуса (вокруг Y)
    let y2=y*cp-z*sp, z2=z*cp+y*sp; y=y2; z=z2;            // наклон вперёд (вокруг X)
    let x3=x*cr-y*sr, y3=x*sr+y*cr;                        // крен (вокруг Z)
    return [x3,y3,z]; };
}
function xfGroup(S,m,pivot,R,tr,sc){                       // повернуть/сдвинуть/промасштабировать грани, добавленные после индекса m
  const k=S.sc, pv=mul(pivot,k), t=mul(tr||[0,0,0],k), ss=sc||1;
  const mv=q=>add(add(R(mul(sub(q,pv),ss)),pv),t);
  for(let i=m;i<S.faces.length;i++){ const f=S.faces[i];
    f.p=f.p.map(mv); f.c=mv(f.c); if(f.nm) f.nm=R(f.nm); if(f.vn) f.vn=f.vn.map(R); }
}
function ik2(sh,tg,l1,l2,pole){                            // двухсуставная конечность: возвращает локоть/колено и достижимую кисть
  let d=sub(tg,sh), D=len(d); const mx=l1+l2-.002;
  if(D>mx){ tg=add(sh,mul(norm(d),mx)); d=sub(tg,sh); D=mx; }
  if(D<.12){ D=.12; }
  const dir=norm(d), a=(l1*l1-l2*l2+D*D)/(2*D), h=Math.sqrt(Math.max(0,l1*l1-a*a));
  let pv=sub(pole,mul(dir,dot(pole,dir))); pv=len(pv)<1e-4?[0,0,1]:norm(pv);
  return {el:add(add(sh,mul(dir,a)),mul(pv,h)),hand:tg};
}
function limbPhase(ph,A,z0,lift,gy){                       // шаг: опора (скользит назад) + мах вперёд по дуге
  const u=((ph/(Math.PI*2))%1+1)%1;
  if(u<.5) return [z0+A-2*A*(u/.5),gy];
  const s=(u-.5)/.5; return [z0-A+2*A*E_io(s),gy+lift*Math.sin(Math.PI*s)];
}
function rigResolve(pose,t,key,nc){
  if(!pose||!pose.kind||pose.kind==='idle') return {kind:'idle',p:0};
  if(pose.kind!=='show') return pose;
  const L=[['idle',1.2],['walk',2.4],['attack',.8],['attack',.8],['idle',.8]];
  for(let i=0;i<nc;i++){ L.push(['cast',i===nc-1?1.5:1.15,i]); L.push(['idle',.7]); }
  const T=L.reduce((a,x)=>a+x[1],0); let tm=((t%T)+T)%T;
  for(const [k,du,sl] of L){ if(tm<du) return {kind:k,slot:sl,p:k==='walk'?tm*1.25:tm/du}; tm-=du; }
  return {kind:'idle',p:0};
}
function floorFx(S,fn){ const kk=S.sc, tg=S.target; S.target=S.pre; S.sc=1; try{ fn(); } finally { S.sc=kk; S.target=tg; } }
const rnd1=(i,k)=>{ const v=Math.sin((i+1)*12.9898+k*78.233)*43758.5453; return v-Math.floor(v); };

/* ---------------- ШМЕДИК: Earthshaker, ходит на четырёх лапах ---------------- */
function esPose(rp,t){
  const k=rp.kind, p=rp.p||0, sl=rp.slot|0, br=Math.sin(t*1.6);
  const P={pitch:.34+.018*br,twist:0,roll:0,offY:.012*br,offZ:0,head:0,
    hR:[.9,.58+.02*br,.44],hL:[-.9,.58+.02*Math.sin(t*1.6+1),.44],fR:[.38,0,.08],fL:[-.38,0,0],glow:0,rise:0};
  if(k==='walk'){
    const ph=p*Math.PI*2;
    const hr=limbPhase(ph,.42,.9,.46,.2), hl=limbPhase(ph+Math.PI,.42,.9,.46,.2);
    const fl=limbPhase(ph,.46,.04,.36,0), fr=limbPhase(ph+Math.PI,.46,.04,.36,0);
    P.hR=[.86,hr[1],hr[0]]; P.hL=[-.86,hl[1],hl[0]]; P.fL=[-.38,fl[1],fl[0]]; P.fR=[.38,fr[1],fr[0]];
    P.pitch=.82+.035*Math.sin(ph*2); P.offY=.04*Math.cos(ph*2)-.05; P.roll=.05*Math.sin(ph); P.twist=-.12*Math.cos(ph);
    P.head=-.55*P.pitch+.05*Math.sin(ph*2); P.glow=.1;
  } else if(k==='attack'){
    P.pitch=RK(p,[[0,.34],[.3,-.06],[.5,.7,E_in],[.75,.5],[1,.34]]);
    P.twist=RK(p,[[0,0],[.3,.55],[.5,-.5,E_in],[.8,-.15],[1,0]]);
    P.offZ=RK(p,[[0,0],[.3,-.06],[.5,.18,E_in],[1,0]]);
    P.hR=RK(p,[[0,P.hR],[.3,[1.05,2.7,-.5]],[.5,[.38,.45,1.6],E_in],[.75,[.5,.5,1.35]],[1,[.9,.58,.44]]]);
    P.hL=RK(p,[[0,P.hL],[.3,[-.95,1.15,.7]],[.5,[-.8,1.1,.6]],[1,[-.9,.58,.44]]]);
    P.head=RK(p,[[0,0],[.3,.2],[.5,-.3],[1,0]]);
    P.fire=bell(p,.52,.1);
  } else if(k==='cast'&&sl===0){          // Fissure: встаёт на дыбы и бьёт кулаками в землю, разлом бежит вперёд
    P.pitch=RK(p,[[0,.34],[.3,-.28],[.5,.82,E_in],[.8,.7],[1,.34]]);
    P.offY=RK(p,[[0,0],[.3,.14],[.5,-.12,E_in],[1,0]]);
    P.offZ=RK(p,[[0,0],[.3,-.1],[.5,.22,E_in],[1,0]]);
    P.hR=RK(p,[[0,P.hR],[.3,[.55,3.05,-.1]],[.5,[.55,.16,1.55],E_in],[.82,[.55,.16,1.55]],[1,[.9,.58,.44]]]);
    P.hL=RK(p,[[0,P.hL],[.3,[-.55,3.05,-.1]],[.5,[-.55,.16,1.55],E_in],[.82,[-.55,.16,1.55]],[1,[-.9,.58,.44]]]);
    P.head=RK(p,[[0,0],[.3,.5],[.5,-.5,E_in],[1,0]]);
    P.glow=bell(p,.55,.3); P.fire=bell(p,.52,.1);
  } else if(k==='cast'&&sl===1){          // Enchant Totem: приседает, подпрыгивает с тотемом, приземляется со вспышкой
    P.pitch=RK(p,[[0,.34],[.25,.7],[.5,-.05],[.65,.6,E_in],[.85,.5],[1,.34]]);
    P.offY=RK(p,[[0,0],[.25,-.22],[.5,1.0,E_out],[.65,-.1,E_in],[.8,0],[1,0]]);
    P.hR=RK(p,[[0,P.hR],[.25,[.95,.2,.55]],[.5,[.8,3.0,.2]],[.65,[1.0,.16,1.0],E_in],[1,[.9,.58,.44]]]);
    P.hL=RK(p,[[0,P.hL],[.25,[-.95,.2,.55]],[.5,[-.8,3.0,.2]],[.65,[-1.0,.16,1.0],E_in],[1,[-.9,.58,.44]]]);
    const air=Math.max(0,P.offY); P.fR=[.38,air*.9,.1+air*.2]; P.fL=[-.38,air*.9,.1+air*.2];
    P.head=RK(p,[[0,0],[.5,.4],[.65,-.3],[1,0]]); P.glow=bell(p,.55,.3)*1.2; P.fire=bell(p,.62,.08);
  } else if(k==='cast'&&sl===2){          // Aftershock: топает ногой, ударная волна
    P.pitch=RK(p,[[0,.34],[.3,.22],[.5,.62,E_in],[.8,.5],[1,.34]]);
    P.offY=RK(p,[[0,0],[.3,.1],[.5,-.14,E_in],[1,0]]);
    P.hR=RK(p,[[0,P.hR],[.3,[1.45,1.5,.2]],[.5,[1.15,.3,.7],E_in],[1,[.9,.58,.44]]]);
    P.hL=RK(p,[[0,P.hL],[.3,[-1.45,1.5,.2]],[.5,[-1.15,.3,.7],E_in],[1,[-.9,.58,.44]]]);
    P.fR=RK(p,[[0,P.fR],[.3,[.5,.95,.4]],[.5,[.42,0,.25],E_in],[1,P.fR]]);
    P.head=RK(p,[[0,0],[.3,.3],[.5,-.2],[1,0]]); P.glow=bell(p,.52,.2); P.fire=bell(p,.5,.1);
  } else if(k==='cast'){                  // Echo Slam: встаёт во весь рост, рычит и обрушивает кулаки — волны по всей земле
    P.pitch=RK(p,[[0,.34],[.28,-.18],[.42,-.22],[.52,.85,E_in],[.8,.7],[1,.34]]);
    P.offY=RK(p,[[0,0],[.28,.22],[.42,.26],[.52,-.16,E_in],[1,0]]);
    P.hR=RK(p,[[0,P.hR],[.28,[1.35,2.8,.2]],[.42,[1.4,3.0,.15]],[.52,[.95,.14,1.0],E_in],[.85,[.95,.14,1.0]],[1,[.9,.58,.44]]]);
    P.hL=RK(p,[[0,P.hL],[.28,[-1.35,2.8,.2]],[.42,[-1.4,3.0,.15]],[.52,[-.95,.14,1.0],E_in],[.85,[-.95,.14,1.0]],[1,[-.9,.58,.44]]]);
    P.head=RK(p,[[0,0],[.3,.65],[.42,.7],[.52,-.5,E_in],[1,0]]);
    P.glow=1.4*bell(p,.5,.35); P.fire=bell(p,.54,.12); P.shake=bell(p,.4,.14);
  }
  return P;
}
function esFloor(S,rp,P){
  const k=rp.kind, p=rp.p||0, sl=rp.slot|0; if(k!=='cast') return;
  const A='#ffb04a', B='#8bd4ff';
  floorFx(S,()=>{
    if(sl===0){
      const g=E_out(cl01((p-.5)/.24)), fade=1-cl01((p-.78)/.22); if(g<=0.01) return;
      let prev=[0,.025,.75];
      for(let i=1;i<=9;i++){
        const z=.75+i*.2*g*1.0, x=(rnd1(i,3)-.5)*.34*(i/9);
        const q=[x,.025,z];
        S.obox(prev,q,.09*fade+.02,.03,i%2?A:B,{glow:1,hint:[0,1,0]});
        const h=(.12+.28*rnd1(i,5))*g*fade;
        S.cone([x+.16,0,z],[x+.2,h,z+.02],.07,'#6b5842',{seg:5});
        S.cone([x-.16,0,z],[x-.2,h*.8,z-.02],.06,'#8a6f4d',{seg:5});
        prev=q;
      }
    } else if(sl===1){
      const r=cl01((p-.62)/.38); if(r>0){ S.ring([0,.012,0],.3+1.5*E_out(r),.07*(1-r)+.015,B,{glow:1,n:36}); S.ring([0,.012,0],.2+1.0*E_out(r),.05*(1-r)+.01,A,{glow:1,n:30}); }
    } else if(sl===2){
      for(const j of [0,.1]){ const r=cl01((p-.5-j)/.42); if(r>0) S.ring([0,.012,0],.2+1.45*E_out(r),.06*(1-r)+.015,j?A:B,{glow:1,n:34}); }
    } else {
      for(const j of [0,.09,.18]){ const r=cl01((p-.52-j)/.46); if(r>0) S.ring([0,.012,0],.3+2.1*E_out(r),.07*(1-r)+.015,j===.09?A:B,{glow:1,n:44}); }
      const g=E_out(cl01((p-.52)/.2)), fade=1-cl01((p-.85)/.15);
      if(g>.01) for(let i=0;i<8;i++){ const a=i/8*Math.PI*2+.2; S.obox([Math.cos(a)*.35,.025,Math.sin(a)*.35],[Math.cos(a)*(.35+1.9*g),.025,Math.sin(a)*(.35+1.9*g)],.07*fade+.015,.03,i%2?A:B,{glow:1,hint:[0,1,0]}); }
    }
  });
}
MODELS.earthshaker=(S,d,t,pose)=>{
  const rp=rigResolve(pose,t,'es',4), P=esPose(rp,t);
  const FUR='#d9852b', FUR2='#f0a746', FURD='#a85a1f', LEA='#2b1a16', LEA2='#43281e', RED='#b8262c', STONE='#8f8678', STONE2='#a89f90', RUNE=P.glow>.6?'#ffc878':'#ff8a2b';
  const PV=[0,.95,0], sh=P.shake?Math.sin(t*60)*.025*P.shake:0;
  const R=mkRot(P.pitch,P.twist,P.roll), TR=[sh,P.offY,P.offZ];
  const Wp=q=>add(add(R(sub(q,PV)),PV),TR);
  esFloor(S,rp,P);
  const m0=S.faces.length;
  /* корпус: мех, ремни, шипы */
  S.ell([0,.98,0],[.5,.3,.36],LEA2,{rings:6,seg:12});
  S.tube([0,.9,0],[0,1.25,0],.46,.52,LEA,{seg:12});
  S.tube([0,.96,0],[0,1.1,0],.56,.56,LEA,{seg:14,shine:.4});
  S.box([0,1.03,.55],[.2,.18,.06],RED,{shine:.5}); S.box([0,1.03,.58],[.1,.1,.03],'#ff8a2b',{glow:1});
  S.ell([0,1.5,0],[.72,.62,.55],FUR,{rings:9,seg:16});
  S.ell([0,1.38,.12],[.55,.5,.44],FUR2,{rings:7,seg:12});
  S.ell([0,1.55,.26],[.5,.46,.28],LEA2,{rings:6,seg:12,shine:.3});
  for(const s of [-1,1]){
    S.obox([s*.5,1.9,.18],[-s*.42,1.05,.3],.15,.05,RED,{shine:.4});
    S.obox([s*.5,1.9,.18],[-s*.42,1.05,.3],.07,.06,LEA,{shine:.4});
    S.ell([s*.74,1.85,0],[.42,.34,.42],FUR2,{rings:7,seg:12});
    S.ell([s*.8,1.92,.02],[.3,.2,.3],LEA2,{rings:5,seg:10,shine:.4});
    for(let i=0;i<3;i++) S.cone([s*(.62+i*.14),2.0,.0+(i-1)*.1],[s*(.7+i*.2),2.38+i*.04,(i-1)*.14],.07,'#d8d4cc',{seg:5});
    for(let i=0;i<4;i++) S.cone([s*(.5+i*.08),1.55-i*.1,-.15],[s*(.78+i*.1),1.45-i*.12,-.38],.08,FURD,{seg:5});
    S.cone([s*.3,1.72,.4],[s*.34,1.9,.52],.06,'#d8d4cc',{seg:5});
  }
  for(let i=0;i<2;i++) S.cone([(i?.18:-.18),1.42,.5],[(i?.2:-.2),1.52,.64],.06,'#d8d4cc',{seg:5});
  S.cone([0,1.3,.52],[0,1.4,.68],.06,'#d8d4cc',{seg:5});
  /* тотем-молот на спине */
  const tz=-.52, ty=2.32;
  S.tube([-.85,ty,tz],[.85,ty,tz],.25,.25,STONE,{seg:10,shine:.3});
  for(const s of [-1,1]){
    S.tube([s*.78,ty,tz],[s*1.22,ty,tz],.42,.42,STONE2,{seg:8,shine:.35});
    S.tube([s*1.2,ty,tz],[s*1.3,ty,tz],.46,.46,RED,{seg:8,shine:.45});
    S.tube([s*1.3,ty,tz],[s*1.34,ty,tz],.36,.36,'#d2573a',{seg:8,shine:.3});
    S.tube([s*.74,ty,tz],[s*.8,ty,tz],.46,.46,RED,{seg:8,shine:.45});
    for(let i=0;i<4;i++){ const a=i*Math.PI/2+Math.PI/4;
      S.box([s*1.0,ty+Math.sin(a)*.43,tz+Math.cos(a)*.43],[.3,.16,.05],RUNE,{glow:1,rot:[-a,0,0]}); }
    S.box([s*.52,ty+.01,tz+.26],[.14,.26,.03],RUNE,{glow:1}); S.box([s*.3,ty+.26,tz+.01],[.14,.03,.2],RUNE,{glow:1});
  }
  S.box([0,ty,tz+.27],[.5,.05,.03],RUNE,{glow:1}); S.box([0,ty+.25,tz],[.04,.03,.5],RUNE,{glow:1});
  for(const s of [-1,1]) S.box([s*.3,ty-.2,tz],[.16,.55,.5],LEA,{shine:.3});
  for(const s of [-1,1]) S.obox([s*.34,2.0,.05],[s*.3,ty-.15,tz+.1],.1,.05,RED,{shine:.4});
  /* голова: наклоняется независимо от корпуса, чтобы смотреть вперёд */
  const mh=S.faces.length, HP=[0,1.82,.2];
  S.ell([0,1.96,.04],[.52,.44,.4],FURD,{rings:7,seg:12});
  for(let i=0;i<7;i++){ const a=-1.1+i*.37; S.cone([Math.sin(a)*.3,2.06,Math.cos(a)*.26-.05],[Math.sin(a)*.5,2.25+(i%2)*.08,Math.cos(a)*.3-.22],.07,FUR,{seg:5}); }
  S.ell([0,1.99,.38],[.33,.32,.36],FUR2,{rings:9,seg:14});
  S.ell([0,1.9,.62],[.14,.1,.16],'#2b2420',{rings:5,seg:8,shine:.4});
  S.cone([0,1.93,.62],[0,1.82,.92],.13,'#2b2420',{seg:6,shine:.5});
  S.ell([0,2.0,.58],[.1,.08,.12],FUR,{rings:4,seg:6});
  for(const s of [-1,1]){
    S.ell([s*.15,2.07,.66],[.065,.055,.04],'#f4f1ea',{rings:5,seg:8});
    S.ell([s*.15,2.07,.69],[.04,.04,.02],'#ffd23f',{rings:4,seg:6,glow:1});
    S.box([s*.15,2.16,.65],[.18,.045,.05],'#3a1a10',{rot:[0,0,-s*.5]});
    S.cone([s*.26,2.16,.46],[s*.5,2.46,.4],.075,'#efe4c4',{seg:6,shine:.4});
    S.cone([s*.34,2.0,.32],[s*.5,2.1,.22],.06,FURD,{seg:5});
  }
  S.ell([0,1.74,.52],[.3,.34,.2],'#e8892f',{rings:7,seg:12});
  S.cone([0,1.78,.55],[0,1.18,.72],.22,'#e8892f',{seg:8});
  S.tube([0,1.3,.74],[0,.98,.76],.07,.05,'#d2681f',{seg:6});
  S.tube([0,1.2,.75],[0,1.14,.76],.095,.095,RED,{seg:8,shine:.4});
  xfGroup(S,mh,HP,mkRot(P.head,0,0),[0,0,.07],1.3);
  /* свечение рун и вспышка удара */
  if(P.glow>.15){ for(const s of [-1,1]) G(S,[s*1.36,ty,tz+.02],.1+.08*P.glow,'#ff9a3c'); G(S,[0,ty+.28,tz],.08+.06*P.glow,'#ffe2a8'); }
  xfGroup(S,m0,PV,R,TR);
  /* конечности — по IK, ладони/стопы стоят на земле */
  const sw=s=>Wp([s*.74,1.76,0]);
  const arm=(s,tg)=>{
    const shd=sw(s), r=ik2(shd,tg,.78,.78,[s*.55,-.1,-.7]), el=r.el, hd=r.hand, dir=norm(sub(hd,el));
    S.tube(shd,el,.21,.17,FUR); S.ell(el,[.18,.18,.18],FURD,{rings:6,seg:9});
    S.cone(el,add(el,[s*.18,-.08,-.3]),.07,FUR2,{seg:5});
    S.tube(el,lerp(el,hd,.5),.17,.17,FUR);
    const a=lerp(el,hd,.36), b=lerp(el,hd,.97);
    S.tube(a,b,.27,.25,LEA,{seg:10,shine:.35});
    S.tube(a,lerp(a,b,.14),.29,.29,RED,{seg:10,shine:.45}); S.tube(lerp(a,b,.86),b,.28,.28,RED,{seg:10,shine:.45});
    const mid=lerp(a,b,.5); const out=norm(cross(dir,[0,0,1])); const od=mul(out,s*(out[0]*s<0?-1:1));
    S.cone(add(mid,mul(od,.2)),add(add(mid,mul(od,.5)),[0,.1,0]),.07,'#d8d4cc',{seg:5});
    S.cone(add(lerp(a,b,.3),mul(od,.2)),add(add(lerp(a,b,.3),mul(od,.44)),[0,.1,0]),.06,'#d8d4cc',{seg:5});
    S.ell(add(hd,mul(dir,.1)),[.25,.22,.27],'#3a2418',{rings:6,seg:10,shine:.3});
    S.tube(hd,add(hd,mul(dir,.14)),.24,.24,RED,{seg:10,shine:.4});
    for(let i=-1;i<=1;i++) S.ell(add(add(hd,mul(dir,.26)),[i*.09,0,0]),[.07,.07,.07],'#5a3622',{rings:4,seg:6});
  };
  arm(1,P.hR); arm(-1,P.hL);
  const leg=(s,ft)=>{
    const hip=[s*.36,.96+P.offY,P.offZ*.6], r=ik2(hip,add(ft,[0,.2,0]),.58,.58,[s*.12,.1,1]), kn=r.el, an=r.hand;
    S.ell(hip,[.27,.24,.27],FURD,{rings:6,seg:10});
    S.tube(hip,kn,.24,.2,LEA2,{seg:10}); S.ell(kn,[.2,.2,.2],LEA,{rings:6,seg:10,shine:.3});
    S.ell(add(kn,[0,0,.12]),[.14,.15,.08],'#d8d4cc',{rings:4,seg:6,shine:.5});
    S.tube(kn,an,.2,.17,LEA2,{seg:10});
    S.tube(add(an,[0,.14,0]),add(an,[0,-.05,0]),.22,.2,'#4a2e20',{seg:10,shine:.3});
    S.tube(add(an,[0,.1,0]),add(an,[0,.04,0]),.235,.235,RED,{seg:10,shine:.45});
    S.ell(add(ft,[0,.1,.16]),[.21,.1,.32],'#4a2e20',{rings:5,seg:9,shine:.3});
    S.ell(add(ft,[0,.08,.4]),[.17,.08,.1],FUR,{rings:4,seg:7});
    S.box(add(ft,[0,.02,.14]),[.34,.04,.62],'#14100d');
  };
  leg(1,P.fR); leg(-1,P.fL);
  /* вспышки удара */
  if(P.fire>.1){ for(const s of [-1,1]){ const h=s>0?P.hR:P.hL; if(rp.kind==='attack'&&s<0) continue; G(S,add(h,[0,.12,.1]),.09+.1*P.fire,'#ffd27a'); G(S,add(h,[0,.12,.1]),.04+.05*P.fire,'#ffffff'); } }
  if(rp.kind==='idle'||rp.kind==='walk'){ for(let i=0;i<3;i++){ const a=t*.9+i*2.1; G(S,[Math.cos(a)*1.45,.5+Math.sin(t*1.7+i)*.14+.2*(rp.kind==='walk'),Math.sin(a)*1.45],.035,'#ffb04a'); } }
};

/* ---------------- САСЫЧ: Bloodseeker, хищник с кровавым клинком ---------------- */
function bsPose(rp,t){
  const k=rp.kind, p=rp.p||0, sl=rp.slot|0, br=Math.sin(t*1.8);
  const P={pitch:.44+.02*br,twist:.12,roll:0,offY:-.04+.015*br,offZ:0,head:-.2,
    hR:[.78,1.0+.02*br,.5],hL:[-.72,.92,.55],fR:[.46,0,.14],fL:[-.46,0,-.12],
    ba:[.25,.85,.5],bc:[.5,0,.9],glow:0};
  if(k==='walk'){
    const ph=p*Math.PI*2;
    const fr=limbPhase(ph,.62,.06,.46,0), fl=limbPhase(ph+Math.PI,.62,.06,.46,0);
    P.fR=[.4,fr[1],fr[0]]; P.fL=[-.4,fl[1],fl[0]];
    P.pitch=.74+.05*Math.sin(ph*2); P.offY=-.1+.05*Math.cos(ph*2); P.twist=.2*Math.cos(ph); P.roll=-.06*Math.sin(ph);
    P.hR=[.74,.78+.16*Math.abs(Math.sin(ph)),.1-.38*Math.cos(ph)]; P.hL=[-.66,.9+.12*Math.abs(Math.sin(ph)),.55+.5*Math.cos(ph)];
    P.ba=[.14,.12+.2*Math.sin(ph*2),-.95]; P.bc=[.9,.3,0]; P.head=-.55*P.pitch+.1;
  } else if(k==='attack'){
    P.pitch=RK(p,[[0,.46],[.28,.15],[.5,.78,E_in],[.8,.55],[1,.46]]);
    P.twist=RK(p,[[0,.12],[.28,.62],[.5,-.65,E_in],[.8,-.2],[1,.12]]);
    P.offZ=RK(p,[[0,0],[.28,-.08],[.5,.28,E_in],[1,0]]);
    P.hR=RK(p,[[0,P.hR],[.28,[.95,2.4,-.35]],[.5,[-.25,.85,1.4],E_in],[.78,[.2,.95,1.0]],[1,[.78,1.0,.5]]]);
    P.ba=RK(p,[[0,P.ba],[.28,[.35,.55,-.75]],[.5,[-.55,.1,.85],E_in],[.78,[0,.5,.8]],[1,[.25,.85,.5]]]);
    P.bc=RK(p,[[0,P.bc],[.28,[0,1,0]],[.5,[.2,.9,.2]],[1,[.5,0,.9]]]);
    P.hL=RK(p,[[0,P.hL],[.28,[-.9,1.5,.3]],[.5,[-.55,.95,1.25],E_in],[.8,[-.7,.9,.7]],[1,[-.72,.92,.55]]]);
    P.head=RK(p,[[0,-.2],[.28,.15],[.5,-.45],[1,-.2]]); P.fire=bell(p,.52,.1);
  } else if(k==='cast'&&sl===0){          // Bloodrage: поднимает клинок, ревёт, багровая аура
    P.pitch=RK(p,[[0,.46],[.35,-.15],[.75,-.12],[1,.46]]);
    P.twist=.1+.08*Math.sin(t*50)*bell(p,.5,.3);
    P.offY=RK(p,[[0,-.1],[.35,.08],[.75,.06],[1,-.1]]);
    P.hR=RK(p,[[0,P.hR],[.35,[.5,2.95,.1]],[.75,[.5,2.95,.1]],[1,[.78,1.0,.5]]]);
    P.ba=RK(p,[[0,P.ba],[.35,[.05,.98,.2]],[.75,[.05,.98,.2]],[1,[.25,.85,.5]]]);
    P.hL=RK(p,[[0,P.hL],[.35,[-1.2,2.2,.2]],[.75,[-1.2,2.0,.25]],[1,[-.72,.92,.55]]]);
    P.head=RK(p,[[0,-.2],[.35,.65],[.75,.55],[1,-.2]]); P.glow=1.2*bell(p,.5,.32); P.fire=bell(p,.45,.2);
  } else if(k==='cast'&&sl===1){          // Blood Rite: вонзает клинок в землю перед собой
    P.pitch=RK(p,[[0,.46],[.3,-.1],[.5,.78,E_in],[.85,.7],[1,.46]]);
    P.twist=RK(p,[[0,.12],[.3,.3],[.5,-.2],[1,.12]]);
    P.offZ=RK(p,[[0,0],[.3,-.06],[.5,.2,E_in],[1,0]]);
    P.hR=RK(p,[[0,P.hR],[.3,[.4,2.9,.0]],[.5,[.3,1.0,1.35],E_in],[.88,[.3,1.0,1.35]],[1,[.78,1.0,.5]]]);
    P.ba=RK(p,[[0,P.ba],[.3,[0,.95,-.2]],[.5,[0,-.98,.15],E_in],[.88,[0,-.98,.15]],[1,[.25,.85,.5]]]);
    P.bc=RK(p,[[0,P.bc],[.5,[0,0,1]],[1,[.5,0,.9]]]);
    P.hL=RK(p,[[0,P.hL],[.3,[-.45,2.6,.1]],[.5,[-.35,1.15,1.15],E_in],[.88,[-.35,1.15,1.15]],[1,[-.72,.92,.55]]]);
    P.head=RK(p,[[0,-.2],[.3,.3],[.5,-.5],[1,-.2]]); P.glow=bell(p,.55,.25); P.fire=bell(p,.5,.1);
  } else if(k==='cast'&&sl===2){          // Thirst: чует кровь — задирает голову, когти в стороны
    P.pitch=RK(p,[[0,.46],[.4,.05],[.8,.1],[1,.46]]);
    P.twist=.1*Math.sin(p*Math.PI*4);
    P.hR=RK(p,[[0,P.hR],[.4,[1.3,1.7,.35]],[.8,[1.3,1.6,.4]],[1,[.78,1.0,.5]]]);
    P.ba=RK(p,[[0,P.ba],[.4,[.6,.75,.2]],[.8,[.6,.75,.2]],[1,[.25,.85,.5]]]);
    P.hL=RK(p,[[0,P.hL],[.4,[-1.3,1.7,.35]],[.8,[-1.3,1.6,.4]],[1,[-.72,.92,.55]]]);
    P.head=RK(p,[[0,-.2],[.4,.6],[.8,.5],[1,-.2]]); P.glow=bell(p,.5,.3); P.fire=bell(p,.45,.2);
  } else if(k==='cast'){                  // Rupture: рывок вперёд и выпад клинком, кровавая цепь
    P.pitch=RK(p,[[0,.46],[.3,.28],[.5,.92,E_in],[.8,.8],[1,.46]]);
    P.twist=RK(p,[[0,.12],[.3,.7],[.5,-.2,E_in],[1,.12]]);
    P.offZ=RK(p,[[0,0],[.3,-.18],[.5,.4,E_in],[.8,.34],[1,0]]);
    P.offY=RK(p,[[0,-.1],[.3,-.24],[.5,-.16],[1,-.1]]);
    P.hR=RK(p,[[0,P.hR],[.3,[1.0,1.5,-.3]],[.5,[.3,1.35,1.7],E_in],[.85,[.3,1.35,1.6]],[1,[.78,1.0,.5]]]);
    P.ba=RK(p,[[0,P.ba],[.3,[.4,.2,-.9]],[.5,[0,.04,1],E_in],[.85,[0,.04,1]],[1,[.25,.85,.5]]]);
    P.bc=RK(p,[[0,P.bc],[.5,[0,1,0]],[1,[.5,0,.9]]]);
    P.hL=RK(p,[[0,P.hL],[.3,[-.9,1.1,.2]],[.5,[-.5,1.2,1.5],E_in],[.85,[-.5,1.2,1.4]],[1,[-.72,.92,.55]]]);
    P.fR=RK(p,[[0,P.fR],[.3,[.5,0,-.2]],[.5,[.42,0,.55],E_in],[1,P.fR]]);
    P.fL=RK(p,[[0,P.fL],[.3,[-.5,0,.0]],[.5,[-.42,0,.05],E_in],[1,P.fL]]);
    P.head=RK(p,[[0,-.2],[.3,.1],[.5,-.7],[1,-.2]]); P.glow=bell(p,.55,.3); P.fire=bell(p,.5,.1); P.chain=E_out(cl01((p-.45)/.3))*(1-cl01((p-.85)/.15));
  }
  return P;
}
function bsFloor(S,rp,P,hdBase){
  const k=rp.kind, p=rp.p||0, sl=rp.slot|0, R1='#ff3b55', R2='#ffd0da';
  floorFx(S,()=>{
    if(k==='attack'){ const r=cl01((p-.48)/.4); if(r>0) S.ring([0,.012,.5],.25+.7*E_out(r),.05*(1-r)+.01,R1,{glow:1,n:26}); return; }
    if(k!=='cast') return;
    if(sl===0){ for(const j of [0,.14]){ const r=cl01((p-.3-j)/.5); if(r>0) S.ring([0,.012,0],.3+1.5*E_out(r),.06*(1-r)+.012,j?R2:R1,{glow:1,n:34}); } }
    else if(sl===1){ const r=cl01((p-.48)/.5); if(r>0){ const c=[.3,.012,1.4]; S.ring(c,.25+.8*E_out(r),.05*(1-r)+.015,R1,{glow:1,n:28}); S.ring(c,.18+.5*E_out(r),.035*(1-r)+.01,R2,{glow:1,n:22}); } }
    else if(sl===2){ for(const j of [0,.12]){ const r=cl01((p-.35-j)/.5); if(r>0) S.ring([0,.012,0],.2+1.2*E_out(r),.05*(1-r)+.012,j?R2:R1,{glow:1,n:30}); } }
    else { const r=cl01((p-.55)/.4); if(r>0) S.ring([0,.012,1.8],.2+.7*E_out(r),.05*(1-r)+.012,R1,{glow:1,n:26}); }
  });
}
MODELS.sasych=(S,d,t,pose)=>{
  const rp=rigResolve(pose,t,'bs',4), P=bsPose(rp,t);
  const SK='#b9763f', SKD='#8f5428', SKL='#d09258', RED='#c4222b', REDD='#7d1219', BLK='#1b1413', BONE='#f1ead6', HAIR='#2a1b15';
  const PV=[0,.9,0], R=mkRot(P.pitch,P.twist,P.roll), TR=[0,P.offY,P.offZ];
  const Wp=q=>add(add(R(sub(q,PV)),PV),TR);
  bsFloor(S,rp,P);
  const m0=S.faces.length;
  /* корпус: набедренная повязка, рельефный торс, красно-чёрная накидка */
  S.ell([0,.95,0],[.42,.26,.3],SKD,{rings:6,seg:12});
  S.tube([0,.95,0],[0,.4,0],.43,.5,RED,{seg:12,shine:.3});
  for(let i=0;i<8;i++){ const a=i/8*Math.PI*2; S.box([Math.sin(a)*.47,.62,Math.cos(a)*.47],[.07,.5,.03],BLK,{rot:[0,a,0]}); }
  S.tube([0,.9,0],[0,1.04,0],.46,.46,BLK,{seg:14,shine:.4});
  S.box([0,.97,.46],[.16,.16,.04],BONE,{shine:.6}); S.box([0,.97,.485],[.08,.08,.02],RED,{glow:0});
  S.box([.18,.45,-.34],[.2,.9,.04],RED,{rot:[.1,0,.08]}); S.box([-.22,.4,-.34],[.2,.95,.04],REDD,{rot:[.1,0,-.06]});
  S.tube([0,1.0,0],[0,1.4,0],.33,.4,SK,{seg:14});
  S.ell([0,1.58,.02],[.58,.46,.36],SK,{rings:9,seg:16});
  for(const s of [-1,1]){ S.ell([s*.26,1.62,.2],[.27,.21,.16],SKL,{rings:6,seg:10});
    S.ell([s*.18,1.25,.22],[.16,.1,.08],SKD,{rings:4,seg:8}); S.ell([s*.17,1.1,.2],[.15,.09,.08],SKD,{rings:4,seg:8});
    S.ell([s*.64,1.8,0],[.27,.24,.27],SKL,{rings:6,seg:10});
    S.tube([s*.6,1.82,0],[s*.7,1.84,0],.28,.28,BLK,{seg:10,shine:.3}); }
  S.ell([0,1.86,-.06],[.46,.2,.3],SK,{rings:5,seg:10});
  S.box([0,1.7,-.31],[.74,.92,.05],RED,{shine:.3});
  for(let i=-2;i<=2;i++) S.box([i*.14,1.7,-.335],[.045,.9,.02],BLK);
  S.box([0,1.3,-.33],[.76,.06,.05],BLK);
  /* голова и кость-воротник (отдельная группа — голова смотрит вперёд) */
  const mh=S.faces.length, HP=[0,1.92,.04];
  S.tube([0,1.82,0],[0,2.0,.06],.17,.15,SK,{seg:10});
  for(let r=0;r<2;r++) for(let i=0;i<10;i++){ const a=i/10*Math.PI*2+r*.31, rr=.2+r*.04;
    const bx=Math.sin(a)*rr, bz=Math.cos(a)*rr+.04, by=1.86+r*.1;
    S.cone([bx,by,bz],[bx+Math.sin(a)*(.3+.08*rnd1(i,r)),by+.13+.1*rnd1(i,r+3),bz+Math.cos(a)*(.28+.08*rnd1(i,r+7))],.058-.01*r,BONE,{seg:5,shine:.5}); }
  S.ell([0,2.13,.1],[.27,.32,.29],RED,{rings:9,seg:14,shine:.25});
  S.ell([0,2.0,.2],[.19,.17,.15],RED,{rings:6,seg:10});
  for(let i=-1;i<=1;i++){ S.box([i*.1,2.34,.18],[.04,.2,.03],BLK,{rot:[-.7,0,i*.25]}); }
  for(const s of [-1,1]){
    S.box([s*.13,2.19,.375],[.2,.05,.03],BLK,{rot:[0,0,-s*.45]});
    S.box([s*.14,2.12,.385],[.14,.07,.03],BLK,{rot:[0,0,-s*.4]});
    S.ell([s*.12,2.15,.385],[.045,.026,.02],'#ffe27a',{glow:1,rings:4,seg:6});
    S.box([s*.16,2.0,.34],[.04,.2,.03],BLK,{rot:[0,0,s*.55]});
    S.box([s*.07,2.3,.3],[.03,.18,.03],BLK,{rot:[-.5,0,s*.1]});
  }
  S.box([0,1.98,.345],[.16,.07,.03],'#2a0a0e');
  for(let i=-2;i<=2;i++){ S.cone([i*.03,2.015,.355],[i*.03,1.955,.36],.014,BONE,{seg:4}); S.cone([i*.03,1.945,.355],[i*.03,1.985,.36],.012,BONE,{seg:4}); }
  S.ell([0,2.26,-.12],[.2,.2,.3],HAIR,{rings:6,seg:10});
  for(let i=0;i<9;i++){ const sx=(i-4)*.07;
    S.cone([sx*.8,2.36,-.02-i*.015],[sx*1.9,2.46+.08*Math.sin(i*1.7),-.5-.08*(i%3)],.07,i%2?HAIR:'#3a2519',{seg:5}); }
  for(const s of [-1,1]) for(let i=0;i<3;i++) S.cone([s*.2,2.2-i*.05,-.1],[s*(.48+i*.08),2.0-i*.2,-.42-i*.06],.05,HAIR,{seg:5});
  xfGroup(S,mh,HP,mkRot(P.head,0,0),[0,0,.04],1.32);
  xfGroup(S,m0,PV,R,TR);
  /* руки по IK: правая держит клинок, левая — когти */
  const shp=s=>Wp([s*.64,1.78,0]);
  let hdR=null, elR=null;
  const arm=(s,tg)=>{
    const shd=shp(s), r=ik2(shd,tg,.62,.62,[s*.6,-.15,-.8]), el=r.el, hd=r.hand, dir=norm(sub(hd,el));
    S.tube(shd,el,.14,.11,SK); S.ell(el,[.12,.12,.12],SKD,{rings:5,seg:8});
    S.tube(el,lerp(el,hd,.35),.11,.1,SK);
    S.tube(lerp(el,hd,.3),lerp(el,hd,.95),.145,.13,BLK,{seg:9,shine:.3});
    S.tube(lerp(el,hd,.3),lerp(el,hd,.38),.16,.16,RED,{seg:9,shine:.4}); S.tube(lerp(el,hd,.86),hd,.15,.15,RED,{seg:9,shine:.4});
    S.ell(add(hd,mul(dir,.07)),[.1,.1,.11],SK,{rings:5,seg:8});
    if(s<0) for(let i=-1;i<=1;i++){ const fp=add(add(hd,mul(dir,.14)),[i*.05,0,0]); S.cone(fp,add(fp,add(mul(dir,.2),[i*.03,-.04,0])),.028,BONE,{seg:4,shine:.5}); }
    if(s>0){ hdR=hd; elR=el; }
  };
  arm(1,P.hR); arm(-1,P.hL);
  /* изогнутый кровавый клинок в правой руке */
  if(hdR){
    const a=norm(P.ba); let c=sub(P.bc,mul(a,dot(P.bc,a))); c=len(c)<1e-3?[0,0,1]:norm(c); const nrm=norm(cross(a,c));
    const H=add(hdR,mul(a,-.0)), L=1.65, curve=1.0, Rb=L/curve;
    S.tube(add(H,mul(a,-.24)),add(H,mul(a,.16)),.05,.05,BLK,{seg:7,shine:.4});
    S.ell(add(H,mul(a,-.26)),[.07,.07,.07],BONE,{rings:4,seg:6,shine:.5});
    S.tube(add(H,mul(a,.14)),add(H,mul(a,.2)),.1,.1,BONE,{seg:8,shine:.5});
    const pt=u=>{ const b=u*curve; return add(add(H,mul(a,.2+Rb*Math.sin(b))),mul(c,Rb*(1-Math.cos(b)))); };
    const N=9;
    for(let i=0;i<N;i++){ const u0=i/N, u1=(i+1)/N, q0=pt(u0), q1=pt(u1);
      const w=.13+.2*Math.sin(Math.PI*(.12+.82*(u0+u1)/2))-(u1>.85?.08:0);
      const hint=nrm;
      S.obox(q0,q1,Math.max(.06,w),.035,'#f4eee6',{shine:.7,hint});
      S.obox(q0,q1,Math.max(.03,w*.5),.045,i%2?RED:'#a01822',{shine:.5,hint});
    }
    S.cone(pt(1),add(pt(1),mul(norm(add(mul(a,Math.cos(curve)),mul(c,Math.sin(curve)))),.22)),.07,'#f4eee6',{seg:4,shine:.7});
    if(P.glow>.1) for(let i=0;i<5;i++){ const q=pt(.2+i*.17); G(S,add(q,mul(nrm,.05)),.05+.07*P.glow,'#ff3b55'); }
  }
  /* ноги: широкий хищный шаг, голые стопы с когтями */
  const leg=(s,ft)=>{
    const hip=[s*.32,.9+P.offY,P.offZ*.6], r=ik2(hip,add(ft,[0,.12,0]),.62,.6,[s*.12,.1,1]), kn=r.el, an=r.hand;
    S.ell(hip,[.24,.22,.24],SKD,{rings:5,seg:9});
    S.tube(hip,kn,.22,.16,SK,{seg:10}); S.ell(kn,[.16,.17,.16],SKL,{rings:5,seg:8});
    S.tube(kn,an,.15,.11,SK,{seg:9});
    S.tube(add(an,[0,.16,0]),add(an,[0,.02,0]),.13,.12,BLK,{seg:9,shine:.3}); S.tube(add(an,[0,.14,0]),add(an,[0,.1,0]),.14,.14,RED,{seg:9,shine:.4});
    S.ell(add(ft,[0,.07,.12]),[.12,.07,.25],SK,{rings:4,seg:8});
    for(let i=-1;i<=1;i++) S.cone(add(ft,[i*.06,.06,.34]),add(ft,[i*.065,.03,.5]),.03,BONE,{seg:4,shine:.5});
    S.box(add(ft,[0,.015,.14]),[.26,.03,.5],'#14100d');
  };
  leg(1,P.fR); leg(-1,P.fL);
  /* кровавые эффекты */
  if(P.glow>.1){ for(let i=0;i<6;i++){ const ph=(t*.8+i/6)%1, a=i*1.05+t; G(S,[Math.cos(a)*(.9+.2*P.glow),.2+ph*2.2,Math.sin(a)*(.9+.2*P.glow)],.05*(1-ph*.5)+.02,i%2?'#ff3b55':'#ffd0da'); } }
  if(P.fire>.1 && hdR) G(S,hdR,.06+.08*P.fire,'#ff3b55');
  if(P.chain>.02){ for(let i=1;i<=9;i++){ const q=add(hdR||[.3,1.4,1.5],[Math.sin(i*2.1+t*8)*.05,Math.sin(i*1.3)*.04,.35+i*.24*P.chain]); G(S,q,.07*(1-i/12)*P.chain+.02,i%2?'#ff3b55':'#ffd0da'); } }
};
const _bsCasts=4;
ANIM.earthshaker=[{kind:'attack',p:.3},{kind:'attack',p:.5},{kind:'walk',p:.25},{kind:'walk',p:.75},{kind:'cast',slot:0,p:.3},{kind:'cast',slot:0,p:.55},{kind:'cast',slot:1,p:.5},{kind:'cast',slot:1,p:.7},{kind:'cast',slot:2,p:.3},{kind:'cast',slot:2,p:.55},{kind:'cast',slot:3,p:.4},{kind:'cast',slot:3,p:.6}];
ANIM.sasych=[{kind:'attack',p:.3},{kind:'attack',p:.5},{kind:'walk',p:.25},{kind:'walk',p:.75},{kind:'cast',slot:0,p:.4},{kind:'cast',slot:0,p:.6},{kind:'cast',slot:1,p:.3},{kind:'cast',slot:1,p:.6},{kind:'cast',slot:2,p:.4},{kind:'cast',slot:2,p:.6},{kind:'cast',slot:3,p:.35},{kind:'cast',slot:3,p:.6}];


/* ---------- Настройки анимаций бойцов: idle-руки, стиль атаки, стили 4 способностей ---------- */
gaReg('shadow',{walkArm:0.2,idle:{R:[.85,1.1,.5],L:[-.85,1.1,.5]},att:'dual',ranged:1,shotBoth:1,hit:.5,casts:['raise','raise','raise','fan'],rings:[0,1,2,3],ringR:1.3,col:['#ff5a1f','#fff0a8']});
gaReg('mageHunter',{walkArm:0.15,idle:{R:[.8,1.2,.55],L:[-.8,1.2,.55]},att:'cross',hit:.5,casts:['punch','cross','guard','raise'],rings:[3],hands:'none',trailOff:[0,.55,.25],col:['#d58cff','#ffffff']});
gaReg('tribupainer',{walkArm:0.05,idle:{R:[.45,1.2,.6],L:[-.15,1.3,1.1]},att:'recoil',hit:.4,casts:['bigrecoil','lup','lwave','gunup'],rings:[3],hands:'none',trail:'none',col:['#ffb36b','#fff3b0']});
gaReg('mo3gi',{walkArm:0.05,idle:{R:[.4,1.25,.75],L:[.05,1.3,1.0]},att:'recoil',hit:.4,casts:['lpoint','lup','ldown','raise'],rings:[2,3],hands:'none',trail:'none',col:['#7dffb0','#e8fff0']});
gaReg('regina',{walkArm:0.16,idle:{R:[.8,1.3,.6],L:[-.8,1.3,.6]},att:'slashR',hit:.5,casts:['throw','cross','raise'],rings:[0,2],hands:'none',trailOff:[0,.5,.2],col:['#ff9fbd','#fff0f4']});
gaReg('pyro',{walkArm:0.12,idle:{R:[.78,1.4,.38],L:[-.62,1.55,.55]},att:'throw',ranged:1,hit:.52,casts:['dual','clap','fan','raise'],rings:[1,3],col:['#ff762f','#fff3b0']});
gaReg('grisha',{walkArm:0.12,idle:{R:[.7,1.9,.3],L:[-.7,1.9,.3]},att:'conj',ranged:1,shotBoth:1,hit:.56,casts:['conj','clap','fan','raise'],rings:[1,3],multi:['#75d8ff','#e58bff','#ff8a3a'],col:['#e0c8ff','#ffffff']});
gaReg('electricGosha',{walkArm:0.14,idle:{R:[.5,1.5,.8],L:[-.5,1.5,.8]},att:'dual',hit:.5,casts:['throw','clap','fan','raise'],rings:[1,2,3],col:['#7feaff','#e8ffff']});


/* ---------- Анимации для остальных бойцов (0.8.1) ----------
   Для каждого: стиль удара, 4 способности (последняя — ульта), цвета вспышек. Положение рук в покое
   берётся прямо из модели (autoAnim ловит armR/armL у man()), так что внешний вид не меняется. */
function autoAnim(id,cfg){
  const orig=MODELS[id]; if(!orig||GA[id]) return;
  AXC={cap:true};
  try{ orig(new Scene(),{id,name:id,color:'#888',color2:'#ccc'},0,null); }catch(e){}
  const cap=AXC; AXC=null;
  if(!cap||!cap.idle) return;
  cfg.idle=cap.idle; cfg.b=cap.b; cfg.shY=cap.shY;
  gaReg(id,cfg);
  MODELS[id]=(S,d,t,pose)=>{
    const ga=gaState(id,pose,t);
    AXC={cur:{R:ga.R,L:ga.L},idle:cfg.idle,b:cfg.b,shY:cfg.shY};
    try{ orig(S,d,t,pose); } finally { AXC=null; }
    gaFx(S,ga);
  };
}
autoAnim('warlord',   {walkArm:.1, att:'slashR', hit:.5, casts:['sweep','raise','stab','whirl'], rings:[1,3], ringR:1.35, hands:'R', trailOff:[0,.7,.3], col:['#4fc3f7','#e1f5fe']});
autoAnim('golly',     {walkArm:.06,att:'throw',  hit:.52,ranged:1, casts:['lpoint','raise','guard','raise','fan'], rings:[1,3,4], ringR:1.3, hands:'R', trailOff:[0,.6,0], col:['#7fe8ff','#e8fbff']});
autoAnim('ilya',      {walkArm:.1, att:'punch',  hit:.5, casts:['throw','clap','guard','raise'], rings:[1,3], ringR:1.6, col:['#8dff79','#e6ffd9']});
autoAnim('malit',     {walkArm:.08,att:'slashR', hit:.5, casts:['raise','guard','stab','gunup'], rings:[0,3], ringR:1.3, hands:'R', trailOff:[0,.7,.1], col:['#ff6a4a','#ffe0b0']});
autoAnim('arcady',    {walkArm:.05,att:'recoil', hit:.45,ranged:1, casts:['recoil','throw','guard','gunup'], rings:[2,3], ringR:1.2, hands:'R', trail:'none', col:['#ff762f','#fff3b0']});
autoAnim('illusionist',{walkArm:.1,att:'throw',  hit:.52,ranged:1, casts:['clap','cross','fan','raise'], rings:[0,3], ringR:1.4, col:['#79e4e4','#eadbff']});
autoAnim('yosyp',     {walkArm:.1, att:'slashR', hit:.5, casts:['sweep','ldown','raise'], rings:[1,2], ringR:1.3, hands:'R', trailOff:[0,.5,.1], col:['#a7ff70','#eaffcf']});
autoAnim('dawnMaiden',{walkArm:.08,att:'slashR', hit:.5, casts:['sweep','throw','raise','raise'], rings:[0,2,3], ringR:1.5, hands:'R', trailOff:[0,.6,.1], col:['#ffe39a','#fff8e0']});
autoAnim('exileKnight',{walkArm:.08,att:'slashR',hit:.5, casts:['stab','sweep','raise','whirl'], rings:[2,3], ringR:1.45, hands:'R', trailOff:[0,.9,.2], col:['#ff707a','#ffe0e2']});
autoAnim('juvsyut',   {walkArm:.1, att:'punch',  hit:.5, casts:['bigrecoil','guard','whirl','raise'], rings:[0,2,3], ringR:1.6, hands:'R', trailOff:[0,.5,0], col:['#ffd568','#fff3b0']});
autoAnim('savely',    {walkArm:.1, att:'punch',  hit:.5, casts:['guard','raise','throw','raise'], rings:[1,3], ringR:1.6, hands:'R', trail:'none', col:['#ffcc66','#fff3c4']});
autoAnim('juggernaut',{walkArm:.1, att:'slashR', hit:.5, casts:['whirl','lup','sweep','flurry'], rings:[0,3], ringR:1.35, hands:'R', trailOff:[0,.9,.2], col:['#ffe7a2','#ffffff']});
autoAnim('sniper',    {walkArm:.05,att:'recoil', hit:.4, ranged:1, casts:['throw','recoil','aim','bigrecoil'], rings:[2], ringR:1.2, hands:'R', trail:'none', col:['#ffd27a','#fff3c4']});

/* =========================================================
   0.8.4 — 3D-монстры для крипов (5 вариантов).
   Лайновые крипы получают случайного монстра из пяти,
   лесные нейтралы — своего по типу лагеря.
   Цвет глаз/самоцветов — цвет команды (skinId = 't0' / 't1' / 't2',
   суффикс r — дальний бой, m — мега-крип).
   ========================================================= */
const MON_IDS=['mon_golem','mon_shroom','mon_hound','mon_imp','mon_slime','mon_goblin'];
const MON_ACC={'0':['#7dffb0','#e2fff0'],'1':['#ff6a4d','#ffd9cf'],'2':['#ffd36b','#fff3c8']};
function monInfo(d){
  const k=(d&&d.skinId)||'t2';
  return {acc:MON_ACC[k.charAt(1)]||MON_ACC['2'], ranged:k.indexOf('r')>1, mega:k.indexOf('m')>1};
}
/* общие детали: шар магии у дальних, золотое кольцо и корона у мега-крипов */
function monExtras(S,I,orbY,orbZ,topY,ringR){
  if(I.ranged){
    S.ell([0,orbY,orbZ],[.2,.2,.2],I.acc[1],{glow:1,rings:6,seg:10});
    S.ring([0,orbY,orbZ],.34,.045,I.acc[0],{glow:1,n:12,axis:'z'});
  }
  if(I.mega){
    S.ring([0,.04,0],ringR,.06,'#ffd24a',{glow:1,n:18});
    for(let i=0;i<5;i++){
      const a=i/5*Math.PI*2, x=Math.cos(a)*.22, z=Math.sin(a)*.22;
      S.cone([x,topY,z],[x*1.3,topY+.34,z*1.3],.07,'#ffd24a',{seg:5,glow:1,shine:.7});
    }
  }
}
/* Каменный голем */
MODELS.mon_golem=(S,d)=>{
  const I=monInfo(d), A=I.acc[0], A2=I.acc[1];
  const rock='#857d70', rock2='#625b51', dark='#3d3832', moss='#5f8d3c';
  for(const s of [-1,1]){
    S.tube([s*.4,.12,0],[s*.38,.9,0],.3,.34,rock2,{seg:8});
    S.box([s*.4,.1,.14],[.62,.22,.78],dark);
    S.ell([s*.38,.92,0],[.38,.24,.36],rock,{rings:5,seg:8});
  }
  S.ell([0,1.18,.02],[.72,.42,.56],rock2,{rings:6,seg:10});
  S.ell([0,1.6,0],[.9,.82,.64],rock,{rings:8,seg:12});
  S.box([0,1.66,.6],[.13,.7,.05],A,{glow:1});
  S.box([-.22,1.45,.59],[.34,.08,.05],A,{glow:1,rot:[0,0,.55]});
  S.box([.24,1.82,.59],[.34,.08,.05],A,{glow:1,rot:[0,0,-.55]});
  S.ell([-.4,2.0,-.1],[.3,.09,.3],moss,{rings:4,seg:6});
  for(const s of [-1,1]){
    S.ell([s*1.02,2.0,0],[.48,.42,.46],rock2,{rings:6,seg:10});
    S.ell([s*1.05,2.3,-.05],[.26,.08,.24],moss,{rings:4,seg:6});
    S.tube([s*1.08,1.85,0],[s*1.24,.95,.16],.3,.26,rock,{seg:8});
    S.ell([s*1.26,.72,.22],[.38,.36,.36],rock2,{rings:6,seg:10});
    for(let k=-1;k<=1;k++) S.ell([s*1.26+k*.14,.5,.42],[.09,.1,.1],dark,{rings:4,seg:6});
  }
  S.ell([0,2.3,.2],[.42,.36,.4],rock,{rings:7,seg:10});
  S.box([0,2.4,.52],[.66,.1,.14],dark);
  for(const s of [-1,1]) S.ell([s*.15,2.3,.55],[.085,.06,.04],A2,{glow:1,rings:4,seg:6});
  monExtras(S,I,1.9,1.0,2.7,1.1);
};
/* Мухомор-убийца */
MODELS.mon_shroom=(S,d)=>{
  const I=monInfo(d), A=I.acc[0];
  const cream='#eadfc2', cream2='#cdbf9c', red='#c4342d';
  for(const s of [-1,1]) S.ell([s*.26,.12,.14],[.2,.12,.28],cream2,{rings:4,seg:8});
  S.ell([0,.45,0],[.58,.42,.52],cream,{rings:6,seg:12});
  S.tube([0,.5,0],[0,1.2,0],.46,.4,cream,{seg:14});
  S.ell([0,1.18,0],[1.1,.2,1.05],'#e9d6b0',{rings:4,seg:16});
  S.ell([0,1.5,0],[1.12,.6,1.06],red,{rings:8,seg:16});
  for(const p of [[0,0],[.5,.3],[-.5,.35],[.15,-.55],[-.45,-.4],[.7,-.2],[-.72,-.05],[.35,.7],[-.2,.78]]){
    const nx=p[0]/1.12, nz=p[1]/1.06, k=1-nx*nx-nz*nz; if(k<=.02) continue;
    S.ell([p[0],1.5+.6*Math.sqrt(k)*.97,p[1]],[.17,.05,.17],'#fff6e4',{rings:3,seg:6});
  }
  S.ell([0,1.32,.88],[.5,.14,.2],'#a82a25',{rings:4,seg:8});
  for(const s of [-1,1]){
    S.ell([s*.34,1.8,.86],[.11,.09,.05],'#fff6e4',{rings:4,seg:8,rot:[.6,0,0]});
    S.ell([s*.34,1.82,.9],[.065,.06,.04],A,{glow:1,rings:4,seg:6,rot:[.6,0,0]});
    S.box([s*.34,1.93,.84],[.26,.06,.05],'#5a1410',{rot:[.6,0,-s*.4]});
    S.ell([s*.17,.98,.4],[.075,.07,.04],A,{glow:1,rings:4,seg:6});
    S.tube([s*.42,.85,.02],[s*.72,.55,.22],.1,.08,cream,{seg:8});
    S.ell([s*.74,.5,.26],[.13,.13,.13],cream2,{rings:5,seg:8});
  }
  S.box([0,.78,.42],[.2,.05,.03],'#3a2a1c');
  S.box([0,1.7,.97],[.3,.06,.05],'#5a1410',{rot:[.6,0,0]});
  for(const p of [[-.9,1.9,.3],[.8,2.05,-.2],[.1,2.3,.5]]) S.ell(p,[.07,.07,.07],A,{glow:1,rings:4,seg:6});
  monExtras(S,I,1.1,.95,2.15,1.2);
};
/* Адская гончая */
MODELS.mon_hound=(S,d)=>{
  const I=monInfo(d), A=I.acc[0], A2=I.acc[1];
  const fur='#463c52', fur2='#2f2839', belly='#5d5068';
  S.ell([0,1.02,.05],[.64,.55,.98],fur,{rings:8,seg:14});
  S.ell([0,1.1,.55],[.68,.62,.52],fur,{rings:7,seg:12});
  S.ell([0,.95,-.55],[.6,.55,.5],fur2,{rings:7,seg:12});
  S.ell([0,.78,.1],[.4,.3,.7],belly,{rings:5,seg:10});
  for(const s of [-1,1]){
    S.tube([s*.38,.95,.6],[s*.36,.1,.66],.2,.12,fur2,{seg:8});
    S.ell([s*.36,.07,.74],[.15,.08,.22],'#201b28',{rings:4,seg:8});
    S.tube([s*.38,.9,-.6],[s*.4,.5,-.85],.24,.14,fur2,{seg:8});
    S.tube([s*.4,.5,-.85],[s*.36,.1,-.62],.14,.1,fur2,{seg:8});
    S.ell([s*.36,.07,-.55],[.15,.08,.22],'#201b28',{rings:4,seg:8});
  }
  S.tube([0,1.15,.75],[0,1.55,1.0],.34,.26,fur,{seg:10});
  S.ell([0,1.62,1.1],[.38,.34,.38],fur,{rings:7,seg:10});
  S.tube([0,1.55,1.3],[0,1.48,1.7],.26,.15,fur,{seg:8});
  S.ell([0,1.5,1.76],[.09,.07,.07],'#15101a',{rings:4,seg:6});
  S.box([0,1.4,1.5],[.2,.04,.3],'#fbfbf2');
  for(const s of [-1,1]){
    S.ell([s*.15,1.72,1.34],[.06,.05,.04],A2,{glow:1,rings:4,seg:6});
    S.cone([s*.17,1.84,1.05],[s*.24,2.2,.92],.09,fur2,{seg:6});
  }
  for(let i=0;i<5;i++){ const z=.75-i*.38; S.cone([0,1.47-i*.04,z],[0,1.8-i*.05,z-.12],.08,A,{seg:5,glow:1}); }
  S.tube([0,1.1,-.95],[0,1.25,-1.5],.15,.07,fur2,{seg:8});
  S.ell([0,1.3,-1.55],[.1,.1,.1],A,{glow:1,rings:4,seg:6});
  monExtras(S,I,2.45,.9,2.35,1.3);
};
/* Рогатый бес */
MODELS.mon_imp=(S,d)=>{
  const I=monInfo(d), A=I.acc[0], A2=I.acc[1];
  const skin='#a62a3c', skin2='#7c1f2e', bone='#ece0c4';
  for(const s of [-1,1]){
    S.tube([s*.22,.08,.06],[s*.25,.55,-.06],.1,.11,skin2,{seg:8});
    S.tube([s*.25,.55,-.06],[s*.2,1.0,0],.11,.13,skin2,{seg:8});
    S.ell([s*.22,.06,.2],[.12,.07,.22],'#26121a',{rings:4,seg:8});
  }
  S.ell([0,1.3,0],[.42,.52,.32],skin,{rings:7,seg:12});
  S.ell([0,1.22,.2],[.28,.38,.14],'#d9705e',{rings:5,seg:8});
  S.ell([0,1.25,.3],[.07,.07,.04],A,{glow:1,rings:4,seg:6});
  for(const s of [-1,1]){
    S.tube([s*.4,1.55,0],[s*.55,1.1,.22],.1,.08,skin,{seg:8});
    for(let k=-1;k<=1;k++) S.cone([s*.55+k*.04,1.05,.26],[s*.55+k*.05,.82,.38],.035,bone,{seg:4});
  }
  S.ell([0,2.0,.04],[.36,.33,.32],skin,{rings:8,seg:12});
  for(const s of [-1,1]){
    S.cone([s*.2,2.2,0],[s*.38,2.74,-.16],.1,bone,{seg:6,shine:.5});
    S.cone([s*.32,2.0,0],[s*.65,2.12,-.05],.07,skin,{seg:5});
    S.ell([s*.14,2.05,.3],[.075,.06,.04],A2,{glow:1,rings:4,seg:6});
    S.box([s*.14,2.15,.32],[.2,.045,.03],'#2a0e12',{rot:[0,0,-s*.4]});
  }
  S.box([0,1.84,.3],[.2,.04,.03],'#2a0e12');
  for(const s of [-1,1]) S.cone([s*.07,1.84,.3],[s*.07,1.73,.32],.025,bone,{seg:4});
  for(const s of [-1,1]){
    const P=[s*.3,1.65,-.16], T1=[s*1.25,2.55,-.5], T2=[s*1.4,1.85,-.6], T3=[s*1.0,1.2,-.45];
    S.tube(P,T1,.04,.02,skin2,{seg:5}); S.tube(P,T2,.04,.02,skin2,{seg:5}); S.tube(P,T3,.04,.02,skin2,{seg:5});
    for(const q of [[P,T1,T2],[P,T2,T3]]) for(const dz of [-.3,.3]){
      const c=[(q[0][0]+q[1][0]+q[2][0])/3,(q[0][1]+q[1][1]+q[2][1])/3,(q[0][2]+q[1][2]+q[2][2])/3+dz];
      S.face(q,c,'#5a1a2e',false,null,.2);
    }
  }
  S.tube([0,.95,-.2],[0,.62,-.7],.07,.05,skin2,{seg:6});
  S.tube([0,.62,-.7],[0,.98,-1.05],.05,.04,skin2,{seg:6});
  S.cone([0,.98,-1.05],[0,1.3,-1.18],.12,A,{seg:5,glow:1});
  monExtras(S,I,1.45,.85,2.4,.9);
};
/* Одноглазый слизень */
MODELS.mon_slime=(S,d)=>{
  const I=monInfo(d), A=I.acc[0];
  const g1='#3fbf8f', g2='#2a9a75', g3='#8ff0c4';
  S.ell([0,.32,0],[1.0,.36,.95],g2,{rings:6,seg:16});
  S.ell([0,.9,0],[.86,.82,.8],g1,{rings:9,seg:16});
  S.ell([0,1.55,-.05],[.42,.34,.4],g1,{rings:6,seg:12});
  S.ell([-.3,1.2,.52],[.2,.1,.1],g3,{rings:4,seg:8,shine:.8});
  S.ell([0,1.0,.74],[.38,.42,.2],'#f4f6f0',{rings:7,seg:12,shine:.5});
  S.ell([0,1.0,.88],[.21,.23,.09],A,{glow:1,rings:5,seg:10});
  S.ell([0,1.0,.95],[.095,.15,.05],'#0b0b10',{rings:4,seg:8});
  S.box([0,1.36,.8],[.62,.1,.1],'#1d6b52',{rot:[0,0,.12]});
  S.box([0,.55,.82],[.52,.1,.08],'#12392d');
  for(const x of [-.16,.0,.16]) S.cone([x,.6,.86],[x,.5,.88],.035,'#f4f6f0',{seg:4});
  for(const s of [-1,1]){
    S.ell([s*.86,.75,.12],[.24,.3,.24],g1,{rings:5,seg:10});
    S.ell([s*.95,.22,.4],[.2,.2,.2],g2,{rings:4,seg:8});
  }
  for(const p of [[.5,1.1,.45],[-.55,.8,.5],[.2,1.45,.3],[.62,.5,.5]]) S.ell(p,[.07,.07,.07],g3,{rings:3,seg:6,glow:1});
  S.ell([-.3,1.58,.15],[.07,.07,.07],A,{glow:1,rings:3,seg:6});
  monExtras(S,I,1.4,.95,1.95,1.15);
};

/* 0.8.5: Гоблин-копейщик — единая модель всех лайновых крипов обеих команд.
   Команду выдают цвет глаз, самоцвета на поясе, плаща и вымпела на копье.
   Дальние крипы отличаются только меньшим размером (хитбокс), мега-крипы — кольцом и короной. */
MODELS.mon_goblin=(S,d)=>{
  const I=monInfo(d), A=I.acc[0], A2=I.acc[1];
  const team=((d&&d.skinId)||'t0').charAt(1);
  const cloth = team==='1' ? '#b8392a' : '#2f9a68';
  const cloth2= team==='1' ? '#7c231a' : '#1f6b47';
  const skin='#7fb94b', skin2='#5f9636', leather='#6b4a2b', leather2='#4a3220', metal='#cfd6dc', wood='#7a5632';
  /* ноги и ступни */
  for(const s of [-1,1]){
    S.tube([s*.2,.1,.04],[s*.22,.55,0],.12,.13,skin2,{seg:8});
    S.tube([s*.22,.55,0],[s*.2,.98,.02],.13,.15,skin2,{seg:8});
    S.ell([s*.2,.07,.16],[.14,.08,.26],leather2,{rings:4,seg:8});
  }
  /* набедренная повязка и торс */
  S.box([0,.98,.12],[.5,.26,.06],cloth2);
  S.ell([0,1.3,0],[.42,.48,.32],leather,{rings:7,seg:12});
  S.ell([0,1.26,.2],[.3,.34,.12],'#8a6238',{rings:5,seg:8});
  S.box([0,1.0,0],[.52,.1,.4],leather2);
  S.ell([0,1.0,.22],[.07,.07,.04],A,{glow:1,rings:4,seg:6});
  /* плащ за спиной цвета команды */
  S.box([0,1.35,-.3],[.5,.7,.05],cloth,{rot:[.12,0,0]});
  /* плечи */
  for(const s of [-1,1]) S.ell([s*.42,1.58,0],[.18,.12,.2],leather2,{rings:4,seg:8});
  /* левая рука со щитом */
  S.tube([-.42,1.52,.02],[-.6,1.2,.28],.1,.08,skin,{seg:8});
  S.ell([-.66,1.2,.34],[.08,.34,.34],wood,{rings:6,seg:10});
  S.ell([-.72,1.2,.34],[.05,.12,.12],A,{glow:1,rings:4,seg:6});
  /* правая рука держит копьё */
  S.tube([.42,1.52,.02],[.58,1.22,.36],.1,.08,skin,{seg:8});
  S.ell([.6,1.2,.4],[.11,.11,.11],skin2,{rings:4,seg:8});
  /* копьё: древко наклонено вперёд, наконечник, вымпел */
  S.tube([.6,.3,-.45],[.7,2.95,.95],.045,.04,wood,{seg:6});
  S.cone([.7,2.95,.95],[.74,3.5,1.18],.09,metal,{seg:6,shine:.8});
  S.box([.68,2.6,.78],[.03,.3,.3],cloth,{rot:[.2,0,0]});
  S.tube([.6,.3,-.45],[.58,.15,-.5],.07,.05,leather2,{seg:6});
  /* голова с большими ушами */
  S.ell([0,1.95,.06],[.4,.36,.36],skin,{rings:8,seg:12});
  for(const s of [-1,1]){
    S.cone([s*.3,2.0,0],[s*.92,2.28,-.18],.13,skin,{seg:6});
    S.cone([s*.3,2.0,.02],[s*.82,2.2,-.08],.07,'#d98a7a',{seg:5});
    S.ell([s*.15,2.04,.34],[.09,.07,.05],'#fff6dc',{rings:4,seg:8});
    S.ell([s*.15,2.04,.38],[.055,.05,.04],A2,{glow:1,rings:4,seg:6});
    S.box([s*.15,2.15,.36],[.2,.045,.03],'#26361a',{rot:[0,0,-s*.45]});
    S.cone([s*.07,1.78,.34],[s*.07,1.9,.36],.03,'#f4efe0',{seg:4});
  }
  /* нос, рот с клыками, кожаный шлем */
  S.cone([0,1.98,.38],[0,1.9,.62],.07,skin2,{seg:6});
  S.box([0,1.8,.34],[.22,.04,.03],'#26361a');
  S.ell([0,2.2,.0],[.38,.2,.36],leather,{rings:5,seg:10});
  S.ring([0,2.1,.0],.38,.035,leather2,{n:14});
  S.cone([0,2.3,0],[0,2.6,-.05],.06,cloth,{seg:5});
  /* мега-крип: золотое кольцо и корона (без шара у дальних — модель одна) */
  if(I.mega){
    S.ring([0,.04,0],1.0,.06,'#ffd24a',{glow:1,n:18});
    for(let i=0;i<5;i++){
      const a=i/5*Math.PI*2, x=Math.cos(a)*.22, z=Math.sin(a)*.22;
      S.cone([x,2.34,z],[x*1.3,2.7,z*1.3],.07,'#ffd24a',{seg:5,glow:1,shine:.7});
    }
  }
};

/* 0.8.6: FPV-дрон Мо3ги — настоящая 3D-модель (как на референсе): карбоновая рама-«растяжка»,
   зелёные моторы с бирюзовыми гайками, двухлопастные винты, батарея в чёрной обмотке с белой лентой,
   красные разъёмы, камера спереди, антенна и тяжёлый боеприпас под рамой, примотанный лентой.
   Перёд модели — ось +Z. skinId 't0'/'t1' — цвет огонька команды. */
MODELS.mon_drone=(S,d)=>{
  const team=(((d&&d.skinId)||'t0').charAt(1)==='1');
  const LED=team?'#ff5a4a':'#7dffb0';
  const carbon='#1a1d23', carbon2='#2b303a', steel='#aab3bd';
  const green='#2f9a5a', green2='#1d6b3f', teal='#3fe0cc';
  const olive='#625b37', oliveDk='#4a4429', tape='#dde4ec';
  const h=1.05;
  /* плиты рамы и стойки */
  S.box([0,h,0],[.52,.05,1.0],carbon2,{shine:.55});
  S.box([0,h+.3,.02],[.48,.05,.88],carbon2,{shine:.55});
  for(const sx of [-1,1]) for(const sz of [-1,1]) S.tube([sx*.2,h,sz*.4],[sx*.2,h+.3,sz*.4],.034,.034,steel,{seg:6,shine:.85});
  /* лучи, моторы, винты */
  const M=[[-.92,.72],[.92,.72],[-.92,-.72],[.92,-.72]];
  M.forEach((m,i)=>{
    const sx=Math.sign(m[0]), sz=Math.sign(m[1]);
    S.obox([sx*.16,h+.1,sz*.22],[m[0],h+.1,m[1]],.15,.05,carbon,{hint:[0,1,0],shine:.5});
    S.obox([sx*.16,h+.14,sz*.22],[m[0]*.62,h+.14,m[1]*.62],.05,.03,carbon2,{hint:[0,1,0],shine:.5});
    S.tube([m[0],h+.02,m[1]],[m[0],h+.08,m[1]],.12,.12,carbon,{seg:12});
    S.tube([m[0],h+.08,m[1]],[m[0],h+.24,m[1]],.145,.14,green,{seg:14,shine:.45});
    S.tube([m[0],h+.12,m[1]],[m[0],h+.2,m[1]],.15,.15,green2,{seg:14,shine:.3});
    S.tube([m[0],h+.24,m[1]],[m[0],h+.33,m[1]],.06,.05,teal,{seg:8,shine:.75});
    const a=i*1.1+.45, dx=Math.cos(a)*.56, dz=Math.sin(a)*.56;
    S.obox([m[0]-dx,h+.31,m[1]-dz],[m[0]+dx,h+.31,m[1]+dz],.13,.016,'#14161a',{hint:[0,1,0],shine:.3});
    S.ring([m[0],h+.3,m[1]],.58,.012,'#7c8590',{n:22});
  });
  /* батарея в чёрной обмотке и белая лента */
  S.box([0,h+.5,-.12],[.54,.3,.76],'#17181c',{shine:.22});
  S.box([0,h+.5,-.12],[.5,.26,.8],'#202228',{shine:.22});
  S.box([0,h+.5,-.12],[.1,.33,.84],tape,{shine:.7});
  S.box([.275,h+.5,-.35],[.02,.2,.2],'#2b2e36',{shine:.3});
  /* красные разъёмы и конденсатор */
  S.box([.3,h+.16,.12],[.1,.12,.2],'#d02a1d',{shine:.5});
  S.box([-.3,h+.16,-.18],[.1,.12,.2],'#d02a1d',{shine:.5});
  S.tube([.0,h+.2,-.52],[.0,h+.2,-.62],.07,.07,'#d02a1d',{seg:8,shine:.5});
  /* камера спереди с линзой */
  S.box([0,h+.17,.52],[.26,.22,.18],'#0f1115',{shine:.4});
  S.ell([0,h+.17,.63],[.075,.075,.05],'#0a2733',{rings:5,seg:10,shine:.8});
  S.ell([0,h+.17,.66],[.035,.035,.025],'#6ff0ff',{glow:1,rings:4,seg:8});
  /* антенна и огонёк команды */
  S.tube([-.1,h+.3,-.46],[-.14,h+.78,-.8],.016,.012,'#0b0b0d',{seg:5});
  S.ell([-.14,h+.8,-.82],[.03,.03,.03],'#ff8a3d',{glow:1,rings:4,seg:6});
  S.ell([0,h+.04,-.52],[.05,.04,.05],LED,{glow:1,rings:4,seg:8});
  S.ell([0,h+.04,.52],[.05,.04,.05],LED,{glow:1,rings:4,seg:8});
  /* боеприпас под рамой: оливковый корпус с облупившейся краской, открытый передний срез, сужение к хвосту */
  const y0=h-.3;
  S.tube([0,y0,-.4],[0,y0,.7],.22,.22,olive,{seg:16,shine:.12});
  S.tube([0,y0,-.4],[0,y0,-.95],.22,.11,oliveDk,{seg:16,shine:.12});
  S.tube([0,y0,-.95],[0,y0,-1.0],.11,.11,'#2a2718',{seg:10});
  S.tube([0,y0,.69],[0,y0,.72],.165,.165,'#100e08',{seg:14});
  S.ring([0,y0,.7],.2,.04,'#c9bd91',{n:16,axis:'z'});
  /* потёртости на корпусе */
  for(const p of [[.12,.19,.35],[-.16,.12,.05],[.19,.02,-.12],[-.1,.2,-.25]]) S.box([p[0],y0+p[1],p[2]],[.07,.025,.1],'#a79f7b',{shine:.2,rot:[0,.4,0]});
  /* скотч, которым боеприпас примотан к раме */
  for(const z of [.38,.0,-.3]) S.ring([0,y0,z],.228,.035,tape,{n:16,axis:'z',shine:.6});
  S.box([0,h-.12,.38],[.1,.34,.07],tape,{shine:.6});
  S.box([0,h-.12,-.3],[.1,.34,.07],tape,{shine:.6});
};

/* ---- точка входа Web Worker (тот же файл, без DOM) ---- */
if(typeof document==='undefined'&&typeof self!=='undefined'&&typeof importScripts==='function'){
  self.onmessage=function(e){
    const d=e.data; if(!d) return;
    try{
      if(d.t==='meta'){
        const m=meta(d.def,d.radius);
        self.postMessage({t:'meta',key:d.key,m});
      } else if(d.t==='spr'){
        const m=meta(d.def,d.radius);
        const res=spriteRaw(d.def,m,d.animated,d.pose,d.fr,d.ang);
        const n=res.W*res.H*4;
        const data=res.data.slice(0,n), glow=res.glow?res.glow.slice(0,n):null;
        const tr=[data.buffer]; if(glow) tr.push(glow.buffer);
        self.postMessage({t:'spr',key:d.key,mkey:d.mkey,W:res.W,H:res.H,data:data.buffer,glow:glow?glow.buffer:null},tr);
      }
    }catch(err){ self.postMessage({t:'err',key:d.key,message:String(err&&err.message||err)}); }
  };
}
const API={draw,models:MODELS,monsterIds:MON_IDS,render,battleSprite,resetBudget,prewarm,has,hasAnim:id=>!!ANIM[id],_meta:meta,_pitch:BATTLE_PITCH,_fdt:FR_DT};
(typeof window!=='undefined'?window:globalThis).Hero3D=API;
if(typeof module!=='undefined') module.exports=API;
})();
