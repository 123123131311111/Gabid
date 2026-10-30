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

/* ---------- 0.9.0: универсальные скины — перекраска любой модели ---------- */
function rgb2hsl(c){
  const r=c[0]/255,g=c[1]/255,b=c[2]/255, mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2;
  let h=0,s=0;
  if(mx!==mn){
    const d=mx-mn; s=l>.5?d/(2-mx-mn):d/(mx+mn);
    if(mx===r) h=(g-b)/d+(g<b?6:0); else if(mx===g) h=(b-r)/d+2; else h=(r-g)/d+4;
    h*=60;
  }
  return [h,s,l];
}
function hsl2rgb(h,s,l){
  h=((h%360)+360)%360/360;
  const q=l<.5?l*(1+s):l+s-l*s, p=2*l-q;
  const f=t=>{ t=(t+1)%1; return t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p; };
  return [Math.round(f(h+1/3)*255),Math.round(f(h)*255),Math.round(f(h-1/3)*255)];
}
const SKIN_TINTS={
  /* 0.10.0.7: три новых скина-перекраски */
  /* Джаггернаут: «Нефритовый самурай» — нефритово-зелёная броня, светлые детали остаются жемчужными */
  juggernautJade:c=>{ const [h,s,l]=rgb2hsl(c); if(l>.88) return c; return hsl2rgb(150+(h%30)*.3, Math.min(.72,Math.max(.32,s*.6+.2)), l>.7?Math.min(.9,l):Math.max(.1,l*.92)); },
  /* Ригина: «Лунная жрица» — серебристо-лавандовое одеяние, холодные блики */
  reginaMoon:c=>{ const [h,s,l]=rgb2hsl(c); return hsl2rgb(246+(h%40)*.3, Math.min(.55,Math.max(.18,s*.5+.1)), l>.72?Math.min(.95,l+.05):Math.min(.7,l*.95+.06)); },
  /* Голли: «Золотой король» — золото и тёмная бронза */
  gollyGold:c=>{ const [h,s,l]=rgb2hsl(c); return hsl2rgb(42+(h%24)*.3, Math.min(.9,Math.max(.5,s*.6+.35)), l>.78?Math.min(.92,l):Math.max(.12,l*.95+.04)); },
  /* Шадоу: «Пустотный жнец» — чёрная броня с фиолетовым отливом, лава превращается в фиолетовое пламя, раскалённое — в голубое свечение душ.
     Циан и фиолет (эффекты самого скина) не трогаем. */
  shadowVoid:c=>{ const [h,s,l]=rgb2hsl(c);
    if(l>.9) return c;
    if(h>=170&&h<=300&&s>.35) return c;
    if(l<.3) return hsl2rgb(262+(h%20)*.3,Math.min(.45,s*.7+.12),l*1.05+.01);
    if(l>.6) return hsl2rgb(188,.92,Math.min(.9,l));
    if(s>.45) return hsl2rgb(274+(h%30)*.35,Math.min(.95,s*.5+.45),Math.max(.34,Math.min(.62,l)));
    return hsl2rgb(262,Math.min(.4,s),l); },
  /* Иллюзионист: «Розовый фокусник» — бирюза уходит в глубокий фиолет, голубые акценты становятся розовыми; золото и жемчуг остаются */
  illusionistPrism:c=>{ const [h,s,l]=rgb2hsl(c);
    if(h>=170&&h<=215&&s>.25){
      return l>.5 ? hsl2rgb(322,Math.min(.9,s+.1),Math.min(.8,l+.02)) : hsl2rgb(278+(h-170)*.2,Math.min(.7,s*.8),Math.max(.1,l*1.05)); }
    return c; },
  /* ---- 0.9.9.3: платные скины за Сенсики (по три на Снайпера, Психа и Мо3ги) ---- */
  /* Снайпер: «Лесной призрак» — маскировочный зелёный */
  sniperGhillie:c=>{ const [h,s,l]=rgb2hsl(c); return hsl2rgb(96+(h%36)*.35, Math.min(.62,Math.max(.28,s*.7+.12)), l>.78?l:Math.max(.12,l*.82)); },
  /* Снайпер: «Полярный егерь» — ледяной бело-голубой камуфляж */
  sniperPolar:c=>{ const [h,s,l]=rgb2hsl(c); return hsl2rgb(204+(h%30)*.25, Math.min(.5,Math.max(.12,s*.5)), Math.min(.95,l*.78+.22)); },
  /* Снайпер: «Алый охотник» — тёмно-красный с яркими бликами */
  sniperCrimson:c=>{ const [h,s,l]=rgb2hsl(c); return hsl2rgb(352+(h%24)*.25, Math.min(.9,Math.max(.5,s*.7+.3)), l>.72?Math.min(.9,l):l*.78); },
  /* 0.9.9.6 АРКАНА Снайпера: «Пламенный стрелок» — тлеющая красно-чёрная форма, раскалённые светлые детали; яркие огненные цвета эффектов не трогаем */
  sniperInferno:c=>{ const [h,s,l]=rgb2hsl(c);
    if(s>.9&&l>.5) return c;
    if(l>.62) return hsl2rgb(36+(h%24)*.3, .95, Math.min(.74,l*.85+.08));
    return hsl2rgb(6+(h%40)*.4, Math.min(.95,Math.max(.7,s*.45+.5)), Math.max(.07,l*.72)); },
  /* Псих: «Токсичный» — кислотно-зелёное безумие */
  psihToxic:c=>{ const [h,s,l]=rgb2hsl(c); return hsl2rgb(88+(h%50)*.3, Math.min(.95,Math.max(.55,s*.6+.35)), l>.7?Math.min(.9,l+.04):Math.max(.1,l*.9)); },
  /* Псих: «Ледяной кошмар» — холодный голубой с белыми клинками */
  psihFrost:c=>{ const [h,s,l]=rgb2hsl(c); return hsl2rgb(190+(h%40)*.3, Math.min(.85,Math.max(.35,s*.55+.3)), Math.min(.93,l*.9+.1)); },
  /* Псих: «Кровавое безумие» — глубокий алый */
  psihBlood:c=>{ const [h,s,l]=rgb2hsl(c); return hsl2rgb(356+(h%30)*.2, Math.min(.95,Math.max(.6,s*.6+.4)), l>.7?Math.min(.88,l):Math.max(.1,l*.85)); },
  /* Мо3ги: «Пустынный штурм» — песочная форма */
  mo3giDesert:c=>{ const [h,s,l]=rgb2hsl(c); return hsl2rgb(36+(h%40)*.15, Math.min(.55,Math.max(.28,s*.6+.15)), Math.min(.82,l*.85+.14)); },
  /* Мо3ги: «Арктический десант» — серо-белая экипировка */
  mo3giArctic:c=>{ const [h,s,l]=rgb2hsl(c); return hsl2rgb(208+(h%30)*.2, Math.min(.3,s*.4), Math.min(.94,l*.75+.24)); },
  /* Мо3ги: «Кибер-инженер» — неон: пурпурный корпус и голубые вставки */
  mo3giNeon:c=>{ const [h,s,l]=rgb2hsl(c); const hot=l>.6||s>.55; return hsl2rgb(hot?186:292+(h%30)*.2, Math.min(.92,Math.max(.55,s*.7+.3)), hot?Math.min(.8,l+.04):Math.max(.14,l*.95)); },
  /* ---- 0.9.9.4: скины Вирсуди, Шмедика и Гриши ---- */
  /* Вирсуди: «Кровавая луна» — чёрно-багровый плащ, яркие красные акценты */
  virsudiBloodMoon:c=>{ const [h,s,l]=rgb2hsl(c); const hot=l>.62; return hsl2rgb(hot?350:346+(h%24)*.2, Math.min(.9,Math.max(.45,s*.6+.3)), hot?Math.min(.78,l+.02):Math.max(.07,l*.7)); },
  /* 0.9.9.8 АРКАНА Вирсуди: «Бездна Приливов» — багровая броня, фиолетово-чёрное тело, ледяные блики и голубые клинки */
  virsudiArcana:c=>{ const [h,s,l]=rgb2hsl(c);
    if(l>.8) return hsl2rgb(186,.95,Math.min(.9,l));                          // яркое → неоновый циан
    if(s>.75&&l>.45) return (h>=36&&h<=60)?c:((h<70||h>330)?hsl2rgb(312,1,Math.max(.55,l)):c);  // акценты → неоновая маджента
    if(h<70||h>330) return hsl2rgb(338,Math.min(.9,Math.max(.6,s+.15)),Math.max(.16,Math.min(.62,l*1.1)));
    return hsl2rgb(268+(h%40)*.3,Math.min(.7,s*.7+.2),Math.max(.07,l*.8)); },
  /* 0.10.0 (дополнение) АРКАНА Пироманта: «Лазурный феникс» — тёплые цвета (красный, оранжевый, золото) превращаются в синее плазменное пламя и ледяное сияние.
     Синие, голубые и фиолетовые цвета (в том числе эффекты арканы) и телесные тона не трогаем. */
  pyroArcana:c=>{ const [h,s,l]=rgb2hsl(c);
    if(h>=150&&h<=290) return c;
    if(s<.65&&l>.6) return c;
    if(l>.6) return hsl2rgb(192,.9,Math.min(.9,l+.1));
    return hsl2rgb(218+(h%30)*.4,Math.min(.9,Math.max(.55,s*.8+.15)),Math.max(.1,l*.95)); },
  /* 0.10.0 (дополнение) Аркадий: «Золотой детонатор» — чёрная броня с золотом, оранжевое пламя превращается в золотое, белое оставляем; телесные тона не трогаем */
  arcadyGold:c=>{ const [h,s,l]=rgb2hsl(c);
    if(h>=22&&h<=34&&s<.7&&l>.55&&l<.8) return c;
    if(l>.82) return c;
    if(s>.4&&(h<52||h>330)) return hsl2rgb(43+(h%20)*.3,Math.min(1,s*.5+.5),Math.min(.72,Math.max(.46,l*.95+.1)));
    return hsl2rgb(40,Math.min(.5,s*.6+.1),Math.max(.06,l*.85)); },
  /* Шмедик: «Магмовый титан» — тёмный камень и оранжевая лава */
  earthshakerMagma:c=>{ const [h,s,l]=rgb2hsl(c); return hsl2rgb(18+(h%30)*.25, Math.min(.92,Math.max(.5,s*.7+.3)), l>.7?Math.min(.88,l):Math.max(.1,l*.85)); },
  /* Гриша: «Изумрудный чародей» — зелёная мантия и светящиеся самоцветы */
  grishaEmerald:c=>{ const [h,s,l]=rgb2hsl(c); return hsl2rgb(140+(h%40)*.25, Math.min(.85,Math.max(.45,s*.6+.3)), l>.75?Math.min(.92,l):Math.max(.12,l*.9)); }
};

/* ---------- Сцена ---------- */
class Scene{
  constructor(){ this.faces=[]; this.pre=[]; this.sc=1; this.target=this.faces; this.tx=null; }
  face(pts,center,color,glow,nm,shine,vn){
    const k=this.sc;
    const P=pts.map(p=>[p[0]*k,p[1]*k,p[2]*k]);
    let col=rgb(color);
    if(this.tx) col=this.tx(col);
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
  if(m==='grin'&&o.gape>.02){
    const g=Math.min(1,o.gape), yc=y-.14-.02*g, ry=.02+.058*g, rx=.075+.035*g;
    S.ell([0,yc,z-.028],[rx,ry,.04],'#2a0e12',{rings:5,seg:10});
    S.ell([0,yc-ry*.35,z-.012],[rx*.62,ry*.5,.02],'#c4505a',{rings:3,seg:8});
    S.ell([0,yc+ry*.62,z-.01],[rx*.82,.014,.014],'#fbfbf2',{rings:3,seg:8,shine:.5});
    S.ell([0,yc-ry*.7,z-.01],[rx*.7,.012,.012],'#fbfbf2',{rings:3,seg:8,shine:.5});
  } else if(m==='grin'){
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
  if(!o.noTorso){
  S.tube([0,hipY,0],[0,1.35,0],.34*b,.4*b,cl,{seg:16});
  S.ell([0,1.38,0],[.47*b,.5,.31*b],cl,{rings:10,seg:18});
  S.ell([0,1.62,.06],[.4*b,.2,.24*b],cl,{rings:6,seg:14});
  }
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
  if(d && d.skinId && String(d.skinId).split('+')[0]==='pyroArcana') pyroArcanaFx(S,t);
  gaFx(S,ga);
};
/* 0.10.0 (дополнение): детали арканы Пироманта — крылья феникса из лазурного пламени, нимб над колпаком, перья-хвост и летящие синие искры */
function pyroArcanaFx(S,t){
  const FL=['#2f7bff','#5ad0ff','#e8f8ff'];
  const fl=(i,k)=>Math.sin(t*(5+k)+i*1.9)*.5+.5;
  for(const s of [-1,1]){                                  // крылья
    for(let k=0;k<5;k++){ const f=fl(k+(s>0?5:0),2);
      S.cone([s*.34,1.6,-.22],[s*(.78+k*.3),1.78+k*.26+f*.14,-.5-k*.1],.1-.014*k,FL[k%3],{seg:6,glow:1,shine:0});
      S.cone([s*.34,1.5,-.2],[s*(.7+k*.26),1.35+k*.1+f*.08,-.46-k*.08],.07-.01*k,FL[(k+1)%3],{seg:5,glow:1,shine:0}); }
  }
  S.ring([0,3.28,0],.46,.03,'#e8f8ff',{glow:1,n:26,phase:t*.8});   // нимб
  S.ring([0,3.28,0],.34,.02,'#5ad0ff',{glow:1,n:18,phase:-t*1.1});
  for(let i=0;i<5;i++){ const f=fl(i,3);                  // хвост-оперение
    S.cone([0,.55,-.35],[(i-2)*.3,.12+f*.1,-1.05-Math.abs(i-2)*.08],.09,FL[i%3],{seg:6,glow:1,shine:0}); }
  for(let i=0;i<8;i++){ const ph=(t*.5+i/8)%1, a=i*2.4;   // искры
    G(S,[Math.cos(a)*.6*(1-ph*.3),.7+ph*2.2,Math.sin(a)*.5-.05],.035*(1-ph)+.012,i%2?'#5ad0ff':'#e8f8ff'); }
}

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

/* 3D-блик Гриши: три скрещённых луча — виден с любого ракурса */
function grSpark(S,p,L,k,col){
  if(k<.06) return; L*=k; const c=col||'#ffffff', w=L*.14;
  for(const s of [-1,1]){
    S.cone(p,add(p,[s*L,0,0]),w,c,{glow:1,seg:4});
    S.cone(p,add(p,[0,s*L*1.35,0]),w,c,{glow:1,seg:4});
    S.cone(p,add(p,[0,0,s*L]),w,c,{glow:1,seg:4});
  }
  G(S,p,L*.2,'#ffffff',{rings:3,seg:6});
}

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
  const tw=(i,sp)=>Math.pow(Math.max(0,Math.sin(t*sp+i*2.3)),4);   // мерцание бликов
  /* --- шляпа: золотой полумесяц, рубин на ленте, звезда на кончике --- */
  S.ell([0,2.66,.1],[.075,.075,.02],'#ffcf65',{rings:6,seg:10,shine:.9});
  S.ell([.03,2.68,.118],[.065,.065,.02],'#27184e',{rings:6,seg:10});
  S.ell([0,2.36,.345],[.05,.05,.03],'#ff6fd8',{glow:1,rings:4,seg:8});
  G(S,[0,3.27,-.46],.06+.015*Math.sin(t*4),'#ffcf65',{rings:3,seg:6});
  /* --- орбы: цветной хвост-комета, кольцо-ореол и мерцающий блик --- */
  cs.forEach((c,i)=>{const a=t*1.8+i*2.094+ga.fx*Math.sin(ga.p*3.14)*5; const yy=1.65+Math.sin(t*2+i)*.12; const p=[Math.cos(a)*.95,yy,Math.sin(a)*.95];
    S.ell(p,[.17,.17,.17],c,{glow:1});
    S.ell(add(p,[-.04,.05,.06]),[.06,.05,.04],'#ffffff',{glow:1,rings:3,seg:6});
    if(i===0) for(let k=0;k<5;k++){const q=k*1.256+t*2; S.cone(add(p,[0,.1,0]),add(p,[Math.cos(q)*.24,.28,Math.sin(q)*.24]),.05,'#ff8a3a',{glow:1,seg:5});}
    if(i===1) for(let k=0;k<6;k++){const q=k*1.047; S.cone(add(p,[Math.cos(q)*.13,0,Math.sin(q)*.13]),add(p,[Math.cos(q)*.33,0,Math.sin(q)*.33]),.04,'#d9f7ff',{glow:1,seg:5});}
    if(i===2) S.tube(add(p,[-.15,.15,0]),add(p,[.15,-.15,.05]),.025,.025,'#fff3b0',{glow:1,seg:5});
    for(let k=1;k<=4;k++){ const a2=a-k*.2; G(S,[Math.cos(a2)*.95,1.65+Math.sin(t*2+i-k*.4)*.12,Math.sin(a2)*.95],.15*(1-k*.2),c,{rings:3,seg:6}); }
    S.ring(p,.27,.012,'#ffffff',{glow:1,axis:i===1?'z':'x',n:12,phase:t*4+i});
    grSpark(S,add(p,[0,.02,0]),.24,tw(i,3.1),'#ffffff');
  });
  S.ring([0,1.0,0],.95,.02,'#e0c8ff',{glow:1,n:26,phase:t*.5});
  for(const s of [-1,1]) G(S,add(s>0?ga.R:ga.L,[0,.16+Math.sin(t*3+s)*.05,.05]),.1*(1+ga.fx*.5),s>0?'#75d8ff':'#e58bff');
  /* --- мантия: золотая каёмка и бегущие светящиеся руны --- */
  S.tube([0,.14,0],[0,.17,0],.645,.645,'#ffcf65',{seg:22,shine:.8});
  for(let i=0;i<10;i++){ const a=i/10*Math.PI*2, k=.5+.5*Math.sin(t*2.2-i*.65);
    S.box([Math.sin(a)*.62,.34,Math.cos(a)*.62],[.05+.05*k,.07+.07*k,.02],cs[i%3],{glow:1,rot:[0,a,0]}); }
  /* --- блики на шляпе, кулоне и в воздухе --- */
  grSpark(S,[0,3.3,-.47],.22,.55+.45*Math.sin(t*3.4),'#fff3b0');
  grSpark(S,[0,1.2,.44],.13,tw(1,2.4),'#ffffff');
  grSpark(S,[.0,2.37,.37],.1,tw(2,2.9),'#ffd6f5');
  for(let i=0;i<3;i++){ const a=t*.7+i*2.094, r=1.15+.12*Math.sin(t+i*2), y=.7+i*.75+.2*Math.sin(t*1.3+i);
    grSpark(S,[Math.cos(a)*r,y,Math.sin(a)*r],.17,tw(i+4,2.2),cs[i]); }
  /* --- поднимающиеся магические искры --- */
  for(let i=0;i<8;i++){ const ph=(t*.2+i/8)%1, a=i*2.4+t*.6, rr=.5+.35*Math.sin(i*1.7+t*.4), sz=.05*(1-ph)+.012;
    S.box([Math.cos(a)*rr,.15+ph*2.9,Math.sin(a)*rr],[sz,sz,sz],cs[i%3],{glow:1,rot:[ph*5,ph*4,0]}); }
  /* --- руническая гексаграмма под ногами --- */
  floorFx(S,()=>{
    const R=.86;
    for(let tri=0;tri<2;tri++){
      const pt=[0,1,2].map(i=>{ const a=(tri?-1:1)*t*.4+i*2.0944+tri*1.0472; return [Math.cos(a)*R,.014,Math.sin(a)*R]; });
      for(let i=0;i<3;i++) S.obox(pt[i],pt[(i+1)%3],.02,.02,tri?'#e58bff':'#75d8ff',{glow:1});
      for(const q of pt) G(S,add(q,[0,.02,0]),.045,tri?'#ffd6ff':'#d9f7ff',{rings:3,seg:6});
    }
    S.ring([0,.014,0],R,.014,'#ffcf65',{glow:1,n:24,phase:t*.2});
  });
  gaFx(S,ga);
  /* --- красивая атака и заклинания Гриши --- */
  if(ga.kind!=='idle'){
    const cfgG=ga.cfg, hands=[ga.R,ga.L];
    if(ga.kind==='attack'){
      const ch=cl01(ga.p/cfgG.hit);
      if(ga.p<cfgG.hit+.04) hands.forEach((h,hi)=>{            // зарядка: руны вращаются вокруг ладоней
        S.ring(h,.1+.2*ch,.014,cs[hi],{glow:1,axis:'z',n:14,phase:t*9+hi});
        for(let k=0;k<3;k++){ const a=t*8+k*2.094+hi, rr=.14+.22*(1-ch); G(S,add(h,[Math.cos(a)*rr,Math.sin(a)*rr,.02]),.035,cs[k],{rings:3,seg:6}); }
      });
      const bu=cl01((ga.p-cfgG.hit)/.25);
      if(ga.burst>.05) hands.forEach((h,hi)=>{                  // вспышка-звезда и расходящееся кольцо
        grSpark(S,add(h,[0,0,.1]),.5,ga.burst,hi?'#ffd6ff':'#d9f7ff');
        if(bu<1) S.ring(add(h,[0,0,.1]),.12+.55*bu,.02*(1-bu)+.008,'#ffffff',{glow:1,axis:'z',n:16});
      });
      if(ga.shot) hands.forEach((h,hi)=>{                       // снаряд: искрящийся хвост и звезда во главе
        const u=ga.shot.u, pos=add(h,[0,-.05*u,.15+1.7*u]);
        for(let k=1;k<=6;k++){ const w=.08*(k/6);
          G(S,add(pos,[Math.sin(t*14+k*1.1+hi*3)*w,Math.cos(t*14+k*1.1+hi*3)*w,-k*.17]),.045*(1-k*.12),cs[(k+hi)%3],{rings:3,seg:6}); }
        grSpark(S,pos,.3,.7+.3*Math.sin(t*22+hi),'#ffffff');
        if(u>.8) S.ring(add(pos,[0,0,.2]),.15+(u-.8)*2.5,.02,'#ffffff',{glow:1,axis:'z',n:16});
      });
    } else {
      if(ga.p>.3&&ga.p<.95) for(let i=0;i<9;i++){               // столб искр вокруг мага
        const ph=(ga.p*2.2+i/9)%1, a=i*2.4+t*3, rr=.55+.5*ph;
        G(S,[Math.cos(a)*rr,.2+ph*2.9,Math.sin(a)*rr],.05*(1-ph*.5),cs[i%3],{rings:3,seg:6}); }
      if(ga.burst>.05){
        grSpark(S,[0,3.35,-.4],.75,ga.burst,'#fff3b0');
        for(const h of hands) grSpark(S,h,.4,ga.burst,'#ffffff');
        S.ring([0,2.3,0],.45+.9*(1-ga.burst),.02,'#ffffff',{glow:1,n:24});
      }
    }
  }
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
  /* 0.10.0 (дополнение): РЕМОДЕЛЬ Аркадия — огненный стрелок: пламенный гребень, гогглы, бронированный наплечник, перевязь с динамитом,
     баллоны-огнемёт за спиной, шарф, барабан-магазин и горящая динамитная шашка в левой руке. Скин «Золотой детонатор» (arcadyGold) добавляет корону и крылья из золотого пламени. */
  const gold=!!(d&&d.skinId&&String(d.skinId).split('+')[0]==='arcadyGold');
  const OR='#ef5b32', DK='#2a2f3a', DK2='#1d2129', PL='#3a404c', ST='#8a8a8a', BR='#3b2a22', FL='#ff762f', HOT='#fff3b0', CR='#c0392b', WH='#ffd08a';
  man(S,{face:true,cloth:DK,arm:DK,glove:OR,armR:[.55,1.3,.7],armL:[-.35,1.3,.95],legs:DK2,belt:OR,trim:OR,knee:OR,bracer:OR,collar:OR,boots:'#15171d',cuff:OR,pad:PL,padTrim:OR,skin:'#e0a97c',fo:{eye:'#ffb04a',glow:1,angry:.3,mouth:'grin',brow:'#2a1008'}});
  /* --- бронированная грудь с эмблемой пламени --- */
  S.ell([0,1.46,.2],[.37,.31,.17],PL,{rings:7,seg:12,shine:.55});
  S.box([0,1.46,.36],[.05,.5,.03],OR,{shine:.6});
  S.cone([0,1.34,.37],[0,1.66,.37],.11,OR,{glow:1,seg:6});
  S.cone([0,1.4,.375],[0,1.58,.375],.055,HOT,{glow:1,seg:5});
  for(const s of [-1,1]){ S.cone([s*.17,1.4,.36],[s*.24,1.6,.36],.06,OR,{glow:1,seg:5}); S.ell([s*.22,1.3,.33],[.04,.04,.025],WH,{rings:4,seg:6,shine:.7}); }
  /* --- пояс: пряжка-череп, подсумки, связка динамита --- */
  S.box([0,1.0,.33],[.34,.2,.05],'#14161c',{shine:.5});
  S.ell([0,1.0,.37],[.07,.08,.025],WH,{rings:4,seg:8,shine:.7});
  S.box([.36,.96,.1],[.15,.2,.16],BR); S.box([.36,1.04,.1],[.16,.05,.17],'#2a1c10');
  for(let i=0;i<3;i++){ const x=-.42-.06*i+(i%2)*.03; S.tube([x,.78,.12],[x,1.08,.12],.045,.045,CR,{seg:6}); S.tube([x,1.08,.12],[x,1.11,.12],.05,.05,WH,{seg:6}); }
  S.tube([-.5,.92,.12],[-.36,.92,.12],.06,.06,BR,{seg:6});
  S.tube([-.45,1.11,.12],[-.41,1.2+flick(t,1)*.01,.14],.01,.01,BR,{seg:4});
  G(S,[-.41,1.22,.14],.025+Math.abs(flick(t,3))*.012,'#ffd08a');
  /* --- перевязь с динамитными шашками --- */
  S.tube([-.3,1.78,.2],[.3,.95,.38],.04,.04,BR,{seg:5});
  for(let i=0;i<5;i++){ const u=.1+i*.19, x=-.3+.6*u, y=1.78-.83*u, z=.2+.18*u;
    S.tube([x,y-.13,z+.06],[x,y+.13,z+.06],.04,.04,i%2?CR:'#e2574b',{seg:6});
    S.tube([x,y+.13,z+.06],[x,y+.16,z+.06],.044,.044,WH,{seg:6});
    S.tube([x,y-.16,z+.06],[x,y-.13,z+.06],.044,.044,'#3b2a22',{seg:6}); }
  /* --- наплечник и бронированная перчатка --- */
  S.ell([.56,1.74,0],[.18,.12,.2],PL,{rings:6,seg:10,shine:.6});
  for(let i=0;i<3;i++) S.cone([.5+i*.07,1.8,(i-1)*.1],[.58+i*.1,2.02+(i%2)*.04,(i-1)*.12],.045,OR,{seg:5,shine:.6});
  S.ell([-.56,1.72,0],[.16,.1,.18],PL,{rings:6,seg:10,shine:.6});
  /* --- шарф --- */
  S.tube([0,1.76,0],[0,1.84,0],.26,.24,OR,{seg:14,shine:.35});
  for(let i=0;i<4;i++){ const w=Math.sin(t*3+i*.9)*.07;
    S.box([-.18+w,1.6-i*.2,-.3-i*.05],[.14,.24,.03],i%2?CR:OR,{rot:[.25+i*.07,w*1.5,.1]}); }
  /* --- голова: гогглы, повязка, пламенный гребень --- */
  S.tube([0,2.1,0],[0,2.18,0],.3,.3,'#17202b',{seg:16,shine:.4});
  S.tube([0,2.17,0],[0,2.2,0],.305,.305,OR,{seg:16,shine:.5});
  S.tube([-.28,2.11,.04],[.28,2.11,.04],.022,.022,'#17202b',{seg:5});
  for(const s of [-1,1]){
    S.ell([s*.12,2.15,.2],[.1,.085,.07],'#17202b',{shine:.5});
    S.tube([s*.12,2.15,.2],[s*.12,2.15,.27],.085,.085,ST,{seg:10,shine:.8});
    S.ell([s*.12,2.15,.28],[.062,.05,.03],gold?'#fff3b0':WH,{glow:1,rings:4,seg:8});
  }
  S.box([0,2.15,.22],[.1,.03,.03],'#17202b');
  const crest=gold?9:7;
  for(let i=0;i<crest;i++){ const k=i-(crest-1)/2, f=flick(t,i)*.06;
    S.cone([k*.085,2.28,-.02],[k*.07,2.74+(i%2)*.14-Math.abs(k)*.06+f,-.14-Math.abs(k)*.03],.085,OR,{glow:1});
    S.cone([k*.085,2.3,-.02],[k*.06,2.52+(i%2)*.06-Math.abs(k)*.03+f*.5,-.1],.045,HOT,{glow:1,seg:5}); }
  const _h5=hmark(S);
  /* --- огнемёт-пистолет: ствол, барабан, прицел, пламя --- */
  S.box([.3,1.2,.4],[.11,.3,.18],BR);
  S.box([.3,1.34,.5],[.17,.17,.6],DK);
  S.tube([.3,1.35,.75],[.3,1.36,1.5],.078,.066,ST,{shine:.8,seg:10});
  for(let i=0;i<3;i++) S.tube([.3,1.355,.9+i*.17],[.3,1.355,.95+i*.17],.095,.095,OR,{seg:10,shine:.5});
  S.tube([.12,1.08,.52],[.48,1.08,.52],.15,.15,PL,{seg:12,shine:.6});
  S.tube([.1,1.08,.52],[.14,1.08,.52],.075,.075,OR,{seg:10,shine:.7,glow:1});
  S.tube([.46,1.08,.52],[.5,1.08,.52],.075,.075,OR,{seg:10,shine:.7});
  S.box([.3,1.46,.6],[.05,.06,.14],'#17202b');
  S.ell([.3,1.5,.66],[.03,.03,.03],gold?'#fff3b0':'#ff4a2a',{glow:1,rings:4,seg:6});
  S.ell([.3,1.36,1.5],[.07,.07,.05],WH,{glow:1,rings:4,seg:8});
  S.cone([.3,1.36,1.5],[.3,1.4,2.15+flick(t,2)*.12],.12,FL,{glow:1,seg:7});
  S.cone([.3,1.36,1.5],[.3,1.38,1.9],.07,HOT,{glow:1,seg:6});
  for(let i=0;i<3;i++){ const ph=(t*1.4+i/3)%1; G(S,[.3+Math.sin(i*2+t*5)*.05,1.38+ph*.1,1.7+ph*.7],.04*(1-ph)+.01,i%2?FL:HOT); }
  hold(S,_h5,'R');
  /* --- левая рука: горящая динамитная шашка (бросок = «Молотов/Динамит») --- */
  const _h6=hmark(S);
  S.tube([-.35,1.2,.95],[-.35,1.52,.95],.052,.052,CR,{seg:8,shine:.4});
  S.tube([-.35,1.5,.95],[-.35,1.54,.95],.056,.056,WH,{seg:8});
  S.tube([-.35,1.2,.95],[-.35,1.17,.95],.056,.056,BR,{seg:8});
  S.tube([-.35,1.54,.95],[-.31,1.64,.93],.01,.01,BR,{seg:4});
  G(S,[-.305,1.66,.93],.04+Math.abs(flick(t,5))*.02,HOT);
  G(S,[-.3,1.7+Math.abs(flick(t,6))*.03,.92],.025,FL);
  hold(S,_h6,'L');
  /* --- баллоны огнемёта за спиной, шланги, дежурный огонёк --- */
  for(const s of [-1,1]){
    S.tube([s*.15,1.0,-.4],[s*.15,1.88,-.4],.125,.125,'#5a1f14',{seg:12,shine:.6});
    S.tube([s*.15,1.86,-.4],[s*.15,1.95,-.4],.1,.1,ST,{seg:10,shine:.8});
    S.tube([s*.15,1.0,-.4],[s*.15,1.06,-.4],.13,.13,ST,{seg:12,shine:.6});
    S.tube([s*.15,1.45,-.4],[s*.15,1.5,-.4],.13,.13,OR,{seg:12,shine:.5});
    S.ell([s*.15,1.72,-.3],[.04,.04,.025],'#ffd08a',{glow:1,rings:4,seg:6}); }
  S.box([0,1.5,-.42],[.16,.2,.06],'#14161c');
  S.tube([.15,1.92,-.4],[.2,1.5,-.12],.03,.03,ST,{seg:5});
  S.tube([-.15,1.92,-.4],[-.1,1.7,.3],.03,.03,BR,{seg:5});
  S.cone([0,1.95,-.4],[0,2.12+flick(t,4)*.04,-.4],.07,FL,{glow:1,seg:6});
  /* --- аркана-скин: золотая корона, нимб и крылья из пламени --- */
  if(gold){
    const GD='#ffd34d', GW='#fff3b0';
    S.ring([0,2.62,-.02],.42,.028,GD,{glow:1,n:26,phase:t*.7});
    S.ring([0,2.62,-.02],.3,.018,GW,{glow:1,n:18,phase:-t*1.0});
    for(const s of [-1,1]) for(let i=0;i<5;i++){ const f=flick(t,i+(s>0?9:0))*.07;
      S.cone([s*(.12+i*.04),1.78-i*.04,-.42],[s*(.62+i*.3),2.06+i*.17+f,-.78-i*.04],.075-i*.006,i%2?GD:GW,{glow:1,seg:5,shine:0}); }
    for(let i=0;i<6;i++){ const ph=(t*.5+i/6)%1, a=i*1.7; G(S,[Math.cos(a)*.55,.6+ph*2.1,Math.sin(a)*.5],.035*(1-ph)+.012,i%2?GD:GW); }
    S.tube([-.28,2.28,.08],[.28,2.28,.08],.02,.02,GD,{seg:5,shine:.9});
    S.ell([0,2.27,.3],[.05,.07,.03],'#ff3d3d',{glow:1,rings:4,seg:8});
  }
  embers(S,t,.75,gold?'#ffd34d':'#ff8a3a',gold?8:6,2.1);
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
  /* 0.9.1: отделка — золотая шляпа с короной, наплечники, пояс-шарф, кулон, парящие искры и посох с кристаллом */
  const GOLD='#ffd568', CY='#79e4e4', PEARL='#eadbff';
  S.tube([0,2.225,0],[0,2.25,0],.5,.5,GOLD,{seg:18,shine:.8});
  S.tube([0,2.5,0],[0,2.58,0],.285,.285,GOLD,{seg:16,shine:.8});
  S.box([0,2.54,.275],[.13,.13,.03],GOLD,{rot:[0,0,Math.PI/4],shine:.9});
  S.ell([0,2.54,.292],[.04,.04,.02],'#ff7ad9',{glow:1,rings:4,seg:8});
  for(let i=0;i<6;i++){ const a=i*Math.PI/3+.3, k=flick(t,i)*.03;
    S.cone([Math.cos(a)*.2,2.88,Math.sin(a)*.2],[Math.cos(a)*.27,3.1+k+(i%2)*.05,Math.sin(a)*.27],.055,i%2?GOLD:CY,{glow:1,seg:5}); }
  S.cone([0,2.88,0],[0,3.28+flick(t,7)*.04,0],.1,GOLD,{glow:1,seg:6});
  S.ell([0,3.3,0],[.06,.06,.06],'#fff3b0',{glow:1,rings:4,seg:8});
  for(const s of [-1,1]){
    S.ell([s*.56,1.84,.02],[.2,.1,.2],GOLD,{shine:.8});
    S.ell([s*.56,1.9,.02],[.12,.06,.12],CY,{glow:1,rings:4,seg:8});
    S.cone([s*.66,1.86,.02],[s*.86,1.98,.02],.06,GOLD,{seg:5,shine:.7});
    S.ell([s*.2,2.15,.19],[.035,.035,.035],GOLD,{glow:1,rings:4,seg:6});
  }
  S.box([0,1.1,.31],[.5,.07,.05],GOLD,{shine:.8});
  S.ell([0,1.1,.345],[.07,.07,.03],CY,{glow:1,rings:4,seg:8});
  S.box([.18,.85,.33],[.08,.5,.03],GOLD,{rot:[0,0,.08]});
  S.ell([0,1.34,.36],[.06,.085,.03],'#ff7ad9',{glow:1,rings:4,seg:8});
  S.tube([-.1,1.62,.33],[0,1.37,.36],.01,.01,GOLD,{seg:4}); S.tube([.1,1.62,.33],[0,1.37,.36],.01,.01,GOLD,{seg:4});
  S.ring([0,.02,0],.95,.014,CY,{glow:1,n:26,phase:t*.6});
  S.ring([0,.02,0],.75,.01,GOLD,{glow:1,n:20,phase:-t*.9});
  for(let i=0;i<7;i++){ const a=t*1.5+i*Math.PI*2/7, r=.82+Math.sin(t*2+i)*.08;
    S.ell([Math.cos(a)*r,.5+i*.25+Math.sin(t*2.2+i)*.07,Math.sin(a)*r],[.045,.045,.045],i%2?GOLD:PEARL,{glow:1,rings:4,seg:6}); }
  const _h6=hmark(S);
  S.tube([.65,.5,.45],[.65,1.5,.45],.025,.025,'#11323a');
  for(let i=0;i<4;i++) S.tube([.65,.7+i*.22,.45],[.65,.78+i*.22,.45],.036,.036,i%2?GOLD:CY,{seg:6,shine:.7});
  S.cone([.65,.5,.45],[.65,.28,.45],.04,GOLD,{seg:6});
  S.ell([.65,1.56,.45],[.1,.1,.1],CY,{glow:1,rings:5,seg:10,shine:.7});
  S.ell([.65,1.56,.45],[.05,.05,.05],'#ffffff',{glow:1,rings:4,seg:8});
  S.ring([.65,1.56,.45],.17,.014,GOLD,{glow:1,axis:'z',n:14,phase:t*2});
  S.ring([.65,1.56,.45],.17,.014,PEARL,{glow:1,axis:'x',n:14,phase:-t*2});
  for(const s of [-1,1]) S.cone([.65+s*.07,1.62,.45],[.65+s*.17,1.84+flick(t,s+3)*.03,.45],.04,GOLD,{glow:1,seg:5});
  hold(S,_h6,'R');
};

/* ---- НОВЫЙ СКИН Иллюзиониста: «Розовый фокусник» (illusionistPrism). Только визуал: фиолетовый плащ, розовые акценты, парящие карты,
   мерцающие звёзды, призма над шляпой и кольца на земле. ---- */
function illusionistPrismFx(S,d,t){
  const ROSE='#ff7ad9', GOLD='#ffd568', PEARL='#fff4ff', VIO='#b58cff';
  for(let i=0;i<5;i++){ const a=-t*1.25+i*Math.PI*2/5, r=1.55, y=1.1+.55*Math.sin(t*1.6+i*1.3)+i*.12;
    const p=[Math.cos(a)*r,y,Math.sin(a)*r], ry=[0,-a+Math.PI/2,0];
    S.box(p,[.34,.5,.02],i%2?PEARL:ROSE,{rot:ry,shine:.7});
    S.box(p,[.38,.54,.012],GOLD,{rot:ry,shine:.8,glow:1}); }
  for(let i=0;i<8;i++){ const a=t*.8+i*.79, p=[Math.cos(a)*.95,1.0+((i*.43)%1.9)+.1*Math.sin(t*2+i),Math.sin(a)*.95], k=(.6+.4*Math.sin(t*5+i))*.15;
    S.box(p,[k,.02,.02],GOLD,{glow:1}); S.box(p,[.02,k,.02],GOLD,{glow:1}); }
  S.ring([0,3.45,0],.28,.012,ROSE,{glow:1,n:16,phase:t*2});
  S.box([0,3.62+flick(t,5)*.02,0],[.11,.11,.11],GOLD,{glow:1,rot:[t*1.5,t*2,0]});
  S.ring([0,.025,0],1.1,.012,ROSE,{glow:1,n:30,phase:t*.7});
  S.ring([0,.025,0],1.3,.01,VIO,{glow:1,n:34,phase:-t*.5});
}
const _illuBaseModel=MODELS.illusionist;
MODELS.illusionist=(S,d,t,pose)=>{
  _illuBaseModel(S,d,t,pose);
  if(d&&d.skinId&&String(d.skinId).split('+')[0]==='illusionistPrism') illusionistPrismFx(S,d,t);
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

/* ---- НОВЫЙ СКИН Шадоу: «Пустотный жнец» (shadowVoid). Только визуал. Нимб из призрачных шипов, светящиеся жилы на крыльях,
   семь вращающихся душ с хвостами, руны на земле и ядро-душа в груди. Цвета подобраны под палитру SKIN_TINTS.shadowVoid. ---- */
function shadowVoidFx(S,d,t,pose){
  const ga=gaState(d.id,pose,t);
  const CY='#7df3ff', VI='#b06bff', WH='#ffffff';
  for(let i=0;i<9;i++){ const a=t*.9+i*Math.PI*2/9, r=.62, k=flick(t,i*1.7)*.04;
    const x=Math.cos(a)*r, z=Math.sin(a)*r*.8-.08;
    S.cone([x,3.38,z],[x*1.12,3.82+k+(i%2)*.1+.15*ga.fx,z*1.12],.07,i%2?CY:VI,{glow:1,seg:5}); }
  S.ring([0,3.34,-.08],.62,.018,CY,{glow:1,n:22,phase:-t*1.2});
  const w1=[[.42,1.82,-.12],[.62,2.15,-.22],[.95,2.55,-.3],[1.28,2.95,-.3],[1.38,3.2,-.26]];
  const w2=[[.5,1.78,-.1],[.85,1.98,-.2],[1.2,2.15,-.25],[1.5,2.2,-.2],[1.7,2.0,-.1]];
  for(const s of [-1,1]){
    for(let i=0;i<4;i++) S.tube([s*w1[i][0],w1[i][1],w1[i][2]+.07],[s*w1[i+1][0],w1[i+1][1],w1[i+1][2]+.07],.028,.024,i%2?CY:VI,{glow:1,seg:4});
    for(let i=0;i<4;i++) S.tube([s*w2[i][0],w2[i][1],w2[i][2]+.06],[s*w2[i+1][0],w2[i+1][1],w2[i+1][2]+.06],.022,.018,i%2?VI:CY,{glow:1,seg:4});
    S.cone([s*1.38,3.2,-.26],[s*1.46,3.72+.1*flick(t,s+4),-.24],.06,CY,{glow:1,seg:5});
  }
  for(let i=0;i<7;i++){ const a=t*1.7+i*Math.PI*2/7, r=1.15+.1*Math.sin(t*1.5+i), y=.7+((i*.37)%1.6)+.12*Math.sin(t*2.2+i);
    const p=[Math.cos(a)*r,y,Math.sin(a)*r];
    G(S,p,.085,i%2?VI:CY); G(S,p,.045,WH,{rings:3,seg:5});
    S.cone(p,[p[0]+Math.sin(a)*.38,p[1]+.03,p[2]-Math.cos(a)*.38],.06,i%2?VI:CY,{glow:1,seg:5}); }
  S.ring([0,.03,0],1.25,.016,VI,{glow:1,n:34,phase:t*.6});
  S.ring([0,.03,0],1.05,.012,CY,{glow:1,n:28,phase:-t*.9});
  G(S,[0,1.42,.36],.05,WH);
  for(let i=0;i<5;i++){ const y=((t*.4+i*.52)%2.4)+.3, x=Math.sin(i*5.3+t*.9)*.6, z=Math.cos(i*3.1+t*.7)*.5;
    S.ell([x,y,z],[.05,.11,.05],i%2?CY:VI,{glow:1,rings:3,seg:6}); }
}
function shadowVoidFx2(S,d,t,pose){
  const ga=gaState(d.id,pose,t);
  const CY='#7df3ff', VI='#b06bff', DV='#3a1a8a', WH='#ffffff', BONE='#cdb8ff';
  /* призрачная коса за спиной: древко, изогнутое лезвие с внутренним светом и висящие души */
  S.tube([.5,.35,-.58],[-.45,3.0,-.62],.035,.035,DV,{seg:5});
  for(let i=0;i<5;i++){ const u=i/4; S.tube([.5-.95*u,.35+2.65*u,-.58-.04*u],[.5-.95*u,.42+2.65*u,-.58-.04*u],.055,.055,i%2?VI:CY,{glow:1,seg:6}); }
  const bl=[[-.45,3.0,-.62],[-.85,3.18,-.62],[-1.3,3.08,-.62],[-1.62,2.8,-.62],[-1.75,2.42,-.62]];
  for(let i=0;i<4;i++){ S.tube(bl[i],bl[i+1],.085-.017*i,.068-.017*i,CY,{glow:1,seg:5}); S.tube([bl[i][0],bl[i][1]-.04,bl[i][2]],[bl[i+1][0],bl[i+1][1]-.04,bl[i+1][2]],.04-.008*i,.03,WH,{glow:1,seg:4}); }
  G(S,[bl[4][0],bl[4][1]-.1+.04*Math.sin(t*3),bl[4][2]],.07,WH);
  /* нимб-руна за головой */
  S.ring([0,2.6,-.5],.8,.02,VI,{glow:1,axis:'z',n:38,phase:t*.5});
  S.ring([0,2.6,-.5],.62,.014,CY,{glow:1,axis:'z',n:30,phase:-t*.8});
  for(let i=0;i<12;i++){ const a=t*.5+i*Math.PI/6, c=Math.cos(a), s2=Math.sin(a);
    S.cone([c*.84,2.6+s2*.84,-.5],[c*1.0,2.6+s2*1.0,-.5],.035,i%3?VI:CY,{glow:1,seg:4}); }
  /* черепа на плечах с горящими глазницами */
  for(const s of [-1,1]){
    S.ell([s*.66,2.0,.12],[.14,.125,.13],BONE,{rings:5,seg:8,shine:.5});
    S.box([s*.66,1.9,.2],[.1,.05,.06],BONE);
    for(const e of [-1,1]) G(S,[s*.66+e*.05,2.02,.235],.026,CY,{rings:3,seg:5});
    /* ладонь: парящая душа над рукой */
    const hd=s>0?ga.R:ga.L, fl=flick(t,s*3+1);
    G(S,add(hd,[0,.62+.04*fl,0]),.11,CY); G(S,add(hd,[0,.62+.04*fl,0]),.06,WH,{rings:3,seg:5});
    S.cone(add(hd,[0,.55,0]),add(hd,[0,.95+.1*fl+.2*ga.fx,0]),.07,VI,{glow:1,seg:5});
    /* цепи у пояса */
    for(let i=0;i<6;i++){ const sw=Math.sin(t*2+i*.6+s)*.035*(i+1)/3;
      S.ell([s*.32+sw,.98-i*.12,.27],[.032,.05,.02],i%2?CY:VI,{glow:1,rings:3,seg:5}); }
    S.cone([s*.32+Math.sin(t*2+3.6+s)*.04,.26,.27],[s*.32+Math.sin(t*2+3.6+s)*.05,.12,.27],.045,CY,{glow:1,seg:4});
  }
  /* рваный плащ пустоты сзади */
  for(let i=0;i<7;i++){ const x=(i-3)*.14, w=Math.sin(t*2+i), w2=Math.cos(t*1.7+i);
    S.tube([x,1.72,-.36],[x+w*.09,.55+(i%3)*.12,-.56-w2*.07],.055,.014,i%2?VI:DV,{glow:i%2?1:0,seg:4}); }
  /* пентаграмма на земле */
  for(let i=0;i<5;i++){ const a1=t*.3+i*Math.PI*2/5, a2=t*.3+((i+2)%5)*Math.PI*2/5;
    S.tube([Math.cos(a1)*1.5,.035,Math.sin(a1)*1.5],[Math.cos(a2)*1.5,.035,Math.sin(a2)*1.5],.014,.014,i%2?VI:CY,{glow:1,seg:4}); }
  S.ring([0,.035,0],1.5,.018,VI,{glow:1,n:44,phase:-t*.3});
}
const _shadowBaseModel=MODELS.shadow;
MODELS.shadow=(S,d,t,pose)=>{
  _shadowBaseModel(S,d,t,pose);
  if(d&&d.skinId&&String(d.skinId).split('+')[0]==='shadowVoid') { shadowVoidFx(S,d,t,pose); shadowVoidFx2(S,d,t,pose); }
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

/* ---------- Джувсют 2.0 ----------
   Пузо — одна гладкая сфера; пояс, ремни, юбка и «наклейки» не плоские коробки,
   а лоскуты, натянутые прямо на поверхность эллипсоида (jvQuad), поэтому ничего
   не торчит и не мерцает. Голова вынесена над пузом, чтобы было видно рот и бивни. */
const JV={skin:'#f0a068',skinD:'#d98456',lea:'#6b3a24',leaD:'#3d2314',leaL:'#8f5233',belt:'#3a2412',
  gold:'#ffd568',goldD:'#d9a441',bone:'#f6eed8',boneD:'#cfc29b',fur:'#d2a873',furD:'#a07a4c',furL:'#ecc994',
  red:'#c0392b',redD:'#8e2a1f',iron:'#aab2ba',ironD:'#656d76',wood:'#d69a61',woodD:'#a8693a',dark:'#2a1008'};
const JV_BC=[0,1.0,.15], JV_BR=[.94,.72,.74];
function jvPt(th,ph,k){ k=k||1; const c=JV_BC,r=JV_BR; return [c[0]+r[0]*k*Math.sin(th)*Math.cos(ph), c[1]+r[1]*k*Math.cos(th), c[2]+r[2]*k*Math.sin(th)*Math.sin(ph)]; }
function jvNm(th,ph){ const r=JV_BR; return norm([Math.sin(th)*Math.cos(ph)/r[0],Math.cos(th)/r[1],Math.sin(th)*Math.sin(ph)/r[2]]); }
/* лоскут на поверхности пуза; uv — 4 точки [тета, фи] */
function jvQuad(S,uv,k,color,o){
  o=o||{};
  const P=uv.map(q=>jvPt(q[0],q[1],k)), N=uv.map(q=>jvNm(q[0],q[1]));
  const mx=uv.reduce((a,q)=>[a[0]+q[0]/uv.length,a[1]+q[1]/uv.length],[0,0]);
  S.face(P,JV_BC,color,o.glow,jvNm(mx[0],mx[1]),o.shine,N);
}
function jvBand(S,th0,th1,ph0,ph1,n,k,color,o){
  for(let j=0;j<n;j++){ const a=ph0+(ph1-ph0)*j/n, b=ph0+(ph1-ph0)*(j+1)/n;
    jvQuad(S,[[th0,a],[th0,b],[th1,b],[th1,a]],k,color,o); }
}
function jvStrip(S,p0,p1,w,n,k,color,o){
  const pts=[];
  for(let i=0;i<=n;i++){
    const u=i/n, th=p0[0]+(p1[0]-p0[0])*u, ph=p0[1]+(p1[1]-p0[1])*u, sn=Math.max(.3,Math.sin(th));
    const dth=p1[0]-p0[0], dph=(p1[1]-p0[1])*sn, l=Math.hypot(dth,dph)||1;
    const qt=-dph/l*w, qp=dth/l*w/sn;
    pts.push([[th-qt,ph-qp],[th+qt,ph+qp]]);
  }
  for(let i=0;i<n;i++) jvQuad(S,[pts[i][0],pts[i+1][0],pts[i+1][1],pts[i][1]],k,color,o);
}
/* кожаный язычок юбки: прямоугольник + остриё */
function jvTab(S,th0,th1,phc,hw,k,color,trim){
  const thm=th0+(th1-th0)*.55;
  jvQuad(S,[[th0,phc-hw],[th0,phc+hw],[thm,phc+hw],[thm,phc-hw]],k,color,{shine:.2});
  S.face([jvPt(thm,phc-hw,k),jvPt(thm,phc+hw,k),jvPt(th1,phc,k)],JV_BC,color,0,jvNm((thm+th1)/2,phc),.2,[jvNm(thm,phc-hw),jvNm(thm,phc+hw),jvNm(th1,phc)]);
  jvQuad(S,[[thm-.03,phc-hw],[thm-.03,phc+hw],[thm,phc+hw],[thm,phc-hw]],k+.006,trim,{shine:.7});
}
/* маленькая жертва для «Большого обеда» */
function jvVictim(S,pos,sc,t,fear){
  const w=Math.sin(t*22)*.22*fear, cw=Math.cos(w), sw=Math.sin(w);
  const V=(x,y,z)=>[pos[0]+(x*cw-y*sw)*sc, pos[1]+(x*sw+y*cw)*sc, pos[2]+z*sc];
  const e=(x,y,z,rx,ry,rz,col,o)=>S.ell(V(x,y,z),[rx*sc,ry*sc,rz*sc],col,o);
  e(0,0,0,.2,.23,.17,'#78b04a',{rings:6,seg:10});
  e(0,-.03,.1,.13,.15,.08,'#a6d46f',{rings:4,seg:8});
  e(0,.28,.02,.17,.15,.15,'#8cc457',{rings:6,seg:10});
  e(0,.22,.15,.06,.045,.025,'#3a1010',{rings:3,seg:6});
  for(const s of [-1,1]){
    e(s*.075,.31,.14,.05,.055,.035,'#ffffff',{rings:4,seg:7,shine:.5});
    e(s*.075,.31,.17,.022,.03,.02,'#111111',{rings:3,seg:5});
    S.cone(V(s*.1,.4,0),V(s*.15,.55,0),.04*sc,'#e8e0c8',{seg:5});
    S.tube(V(s*.19,.08,0),V(s*.3+Math.sin(t*18+s)*.07,.22+Math.cos(t*18+s)*.08,.05),.035*sc,.03*sc,'#78b04a',{seg:5});
    S.tube(V(s*.08,-.17,0),V(s*.11,-.36+Math.sin(t*20+s*2)*.05,.02),.045*sc,.04*sc,'#5d8f38',{seg:5});
  }
}
const jvSm=(x,a,b)=>{ const u=Math.max(0,Math.min(1,(x-a)/(b-a))); return u*u*(3-2*u); };
MODELS.juvsyut=(S,d,t)=>{
  const C=JV, HY=2.02;
  const ga=AXC&&AXC.ga, gk=ga?ga.kind:'idle', gp=ga?ga.p:0, gs=ga&&ga.slot!=null?(((ga.slot|0)%4)+4)%4:-1;
  const ult=gk==='cast'&&gs===3;
  /* раскрытие рта: рёв, откусывание, жевание, отрыжка */
  let gape=0;
  if(ult) gape=.85*bell(gp,.143,.07)+bell(gp,.571,.085)+jvSm(gp,.62,.67)*(1-jvSm(gp,.80,.84))*(.28+.12*Math.sin((gp-.62)*70))+.45*bell(gp,.857,.05);
  /* пузо дышит, пружинит при ходьбе, ударах и глотке */
  let bk=.012*Math.sin(t*1.6), bky=bk*.6;
  if(gk==='walk'){ bk=.022*Math.sin(gp*Math.PI*4); bky=-bk*.5; }
  else if(gk==='attack'){ bk=.05*bell(gp,.6,.1); bky=-bk*.7; }
  else if(gk==='cast'){
    if(gs===0){ bk=.07*bell(gp,.5,.1); bky=-bk*.7; }
    else if(gs===1){ bk=.08*bell(gp,.45,.22); bky=bk*.4; }
    else if(gs===2){ bk=.035*(bell(gp,.286,.05)+bell(gp,.571,.05)); bky=-bk; }
    else { bk=.09*bell(gp,.714,.07)+.03*bell(gp,.5,.1); bky=bk*.45; }
  }
  const BR0=JV_BR.slice(); JV_BR[0]*=1+bk; JV_BR[1]*=1+bky; JV_BR[2]*=1+bk;
  try{
  man(S,{face:true,bulk:1.5,gap:.23,hipY:.8,cloth:C.skin,skin:C.skin,headY:HY,shY:1.5,armR:[1.0,1.0,.3],armL:[-1.0,1.0,.3],glove:C.skin,nobelt:true,noTorso:true,legs:'#4a2a1c',cuff:C.fur,trim:C.gold,bracer:C.leaD,knee:'#4a2a1c',pad:C.leaD,padTrim:C.gold,fo:{eye:'#3a2a1c',angry:-.3,mouth:'grin',gape,lip:'#6a2a22',brow:'#2a1008',cheeks:'#e08a60'},headW:1.05,arm:C.skin,forearm:C.skin});

  /* --- пузо --- */
  S.ell(JV_BC,JV_BR,C.skin,{rings:14,seg:24});
  G(S,jvPt(1.38,Math.PI/2,1.0),.06,'#b5653d',{glow:0,rings:4,seg:8,shine:.1}); // пупок

  /* --- перекрёстные ремни через пузо + медальон --- */
  const PI=Math.PI;
  for(const sg of [-1,1]){
    const p0=[.6,PI/2-sg*.8], p1=[1.75,PI/2+sg*.62];
    jvStrip(S,p0,p1,.075,9,1.03,C.lea,{shine:.2});
    jvStrip(S,p0,p1,.018,9,1.037,C.goldD,{shine:.6});
    for(let i=1;i<9;i+=2){ const u=i/9; G(S,jvPt(p0[0]+(p1[0]-p0[0])*u,p0[1]+(p1[1]-p0[1])*u,1.065),.03,C.gold,{glow:0,rings:3,seg:6,shine:.8}); }
  }
  { const m=jvPt(1.25,PI/2,1.075);
    S.ell(m,[.14,.14,.04],C.goldD,{rings:6,seg:12,shine:.7});
    S.ell([m[0],m[1],m[2]+.02],[.105,.105,.035],C.gold,{rings:6,seg:12,shine:.8});
    G(S,[m[0],m[1],m[2]+.05],.045,C.red,{glow:0,rings:4,seg:8,shine:.8}); }

  /* --- широкий пояс с пряжкой --- */
  jvBand(S,1.74,1.98,0,PI*2,30,1.045,C.belt,{shine:.25});
  jvBand(S,1.74,1.765,0,PI*2,30,1.055,C.gold,{shine:.6});
  jvBand(S,1.955,1.98,0,PI*2,30,1.055,C.gold,{shine:.6});
  for(let i=0;i<22;i++){ const ph=i/22*PI*2; if(Math.abs(Math.sin(ph-PI/2))>.97&&Math.cos(ph-PI/2)>0) continue;
    G(S,jvPt(1.86,ph,1.075),.028,C.gold,{glow:0,rings:3,seg:5,shine:.8}); }
  { const q=jvPt(1.86,PI/2,1.095);
    S.box([q[0],q[1],q[2]],[.4,.3,.07],C.goldD,{shine:.7});
    S.box([q[0],q[1],q[2]+.03],[.33,.23,.05],C.gold,{shine:.8});
    S.box([q[0],q[1],q[2]+.06],[.22,.14,.03],C.redD,{shine:.5});
    G(S,[q[0],q[1],q[2]+.085],.05,C.red,{glow:0,rings:5,seg:8,shine:.9}); }

  /* --- меховая юбка и кожаные язычки --- */
  for(let i=0;i<24;i++){ const ph=i/24*PI*2;
    S.ell(jvPt(2.0,ph,1.07),[.13,.12,.13],i%2?C.fur:C.furL,{rings:4,seg:7,shine:.15}); }
  for(let i=0;i<9;i++){ const ph=PI/2+(i-4)*.31;
    jvTab(S,1.95,2.62,ph,.15,1.05,i%2?C.lea:C.leaL,C.gold);
    jvTab(S,1.95,2.62,ph+PI,.15,1.05,i%2?C.lea:C.leaL,C.gold); }
  /* трофей на поясе: куриная ножка (в тему «Большого обеда») */
  { const hp=jvPt(1.95,PI-.15,1.08);
    S.tube(hp,[hp[0],hp[1]-.12,hp[2]],.025,.025,C.leaD,{seg:5});
    S.ell([hp[0],hp[1]-.3,hp[2]],[.15,.19,.15],'#c8672e',{rings:6,seg:10,shine:.35});
    S.ell([hp[0]-.04,hp[1]-.26,hp[2]+.07],[.07,.09,.05],'#eaa35f',{rings:4,seg:6,shine:.5});
    S.tube([hp[0],hp[1]-.44,hp[2]],[hp[0],hp[1]-.64,hp[2]],.045,.04,C.bone,{seg:7,shine:.4});
    S.ell([hp[0]-.04,hp[1]-.66,hp[2]],[.055,.05,.05],C.bone,{rings:4,seg:6});
    S.ell([hp[0]+.04,hp[1]-.66,hp[2]],[.055,.05,.05],C.bone,{rings:4,seg:6}); }

  /* --- меховой воротник на плечах --- */
  for(let i=0;i<18;i++){ const ph=i/18*PI*2;
    S.ell(jvPt(.66,ph,1.06),[.16,.12,.16],i%2?C.fur:C.furL,{rings:4,seg:7,shine:.15}); }

  /* --- наплечники с костяными шипами --- */
  for(const s of [-1,1]){
    const cx=s*.84, cy=1.7;
    S.ell([cx,cy,0],[.37,.27,.37],C.lea,{rings:9,seg:16,shine:.3});
    S.ell([cx,cy+.1,0],[.28,.19,.28],C.leaL,{rings:7,seg:14,shine:.3});
    S.tube([cx,cy-.19,0],[cx,cy-.12,0],.3,.3,C.gold,{seg:18,shine:.75});
    for(let a=0;a<6;a++){ const an=a/6*PI*2+.3; G(S,[cx+Math.cos(an)*.37,cy-.03,Math.sin(an)*.37],.03,C.gold,{glow:0,rings:3,seg:5,shine:.8}); }
    for(let i=0;i<5;i++){ const an=i/5*PI*2+.4, ca=Math.cos(an), sa=Math.sin(an);
      S.cone([cx+ca*.16,cy+.22,sa*.16],[cx+ca*.3+s*.05,cy+.5-(i%2)*.1,sa*.3],.065,i%2?C.bone:C.boneD,{seg:6,shine:.5}); }
    S.cone([cx,cy+.25,0],[cx+s*.03,cy+.7,0],.085,C.bone,{seg:7,shine:.5});
    G(S,[cx,cy+.26,0],.06,C.gold,{glow:0,rings:4,seg:8,shine:.8});
  }

  /* --- голова: повязка, пучок, серьги, бивни, борода --- */
  S.tube([0,HY+.15,0],[0,HY+.25,0],.268,.185,C.red,{seg:18,shine:.35});
  S.ell([0,HY+.2,.238],[.055,.055,.03],C.gold,{rings:5,seg:10,shine:.8});
  G(S,[0,HY+.2,.262],.026,C.red,{glow:0,rings:3,seg:6,shine:.9});
  S.ell([0,HY+.2,-.24],[.075,.065,.06],C.redD,{rings:5,seg:8});
  S.tube([-.02,HY+.19,-.26],[.13,HY-.1,-.52],.05,.03,C.red,{seg:6});
  S.tube([.02,HY+.19,-.26],[-.1,HY-.04,-.5],.05,.03,C.redD,{seg:6});
  S.ell([0,HY+.33,-.03],[.12,.1,.12],C.dark,{rings:6,seg:10,shine:.3});
  S.tube([0,HY+.27,-.03],[0,HY+.31,-.03],.118,.118,C.gold,{seg:12,shine:.8});
  S.cone([0,HY+.38,-.03],[0,HY+.7,-.1],.095,C.dark,{seg:7,shine:.3});
  for(const s of [-1,1]){
    S.ring([s*.345,HY-.05,0],.085,.022,C.gold,{axis:'x',n:12,shine:.8});
    G(S,[s*.345,HY-.14,0],.032,C.red,{glow:0,rings:3,seg:6,shine:.8});
    S.tube([s*.085,HY-.17,.26],[s*.115,HY-.03,.3],.052,.033,C.bone,{seg:7,shine:.5});
    S.cone([s*.115,HY-.03,.3],[s*.1,HY+.08,.31],.033,C.bone,{seg:7,shine:.5});
  }
  for(let i=0;i<7;i++){ const a=-.9+i*.3; S.ell([Math.sin(a)*.26,HY-.24+Math.cos(a)*-.02,.26-Math.abs(a)*.1],[.045,.08,.035],C.bone,{rings:4,seg:6,shine:.5}); }
  S.cone([0,HY-.2,.24],[0,HY-.3,.3],.06,C.bone,{seg:7,shine:.5});

  /* --- левая рука: шипастый наруч --- */
  const _hL=hmark(S);
  for(let k=-1;k<=1;k++) S.cone([-1.1,1.07,.28+k*.09],[-1.3,1.1+k*.02,.28+k*.14],.04,C.iron,{seg:6,shine:.9});
  hold(S,_hL,'L');

  /* --- правая рука: шипастый наруч и дубина --- */
  const _hR0=hmark(S);
  for(let k=-1;k<=1;k++) S.cone([1.1,1.07,.28+k*.09],[1.3,1.1+k*.02,.28+k*.14],.04,C.iron,{seg:6,shine:.9});
  hold(S,_hR0,'R');
  const _hR=hmark(S);
  const A=[1.0,.45,.35], B=[1.15,2.0,.4], P=f=>lerp(A,B,f);
  const [ux,,uz]=basisY(sub(B,A)), axv=norm(sub(B,A));
  const RS=[[0,.085],[.22,.1],[.4,.12],[.62,.15],[.82,.19],[.96,.22]];
  const rad=f=>{ for(let i=1;i<RS.length;i++) if(f<=RS[i][0]){ const u=(f-RS[i-1][0])/(RS[i][0]-RS[i-1][0]); return RS[i-1][1]+(RS[i][1]-RS[i-1][1])*u; } return RS[RS.length-1][1]; };
  for(let i=1;i<RS.length;i++) S.tube(P(RS[i-1][0]),P(RS[i][0]),RS[i-1][1],RS[i][1],i%2?C.wood:'#e0a56d',{seg:16,shine:.25});
  S.ell(P(.97),[.21,.16,.21],C.wood,{rings:7,seg:14,shine:.25});
  for(const f of [.6,.84,.94]) S.tube(P(f-.025),P(f+.025),rad(f)+.018,rad(f)+.018,C.ironD,{seg:16,shine:.8});
  S.tube(P(.25),P(.43),rad(.3)+.014,rad(.4)+.014,'#3a2a1c',{seg:12,shine:.3});
  for(const f of [.25,.43]) S.tube(P(f-.012),P(f+.012),rad(f)+.024,rad(f)+.024,C.gold,{seg:12,shine:.8});
  G(S,P(-.01),.1,C.goldD,{glow:0,rings:5,seg:10,shine:.8});
  for(let k=0;k<12;k++){ const f=.5+k*.04, an=k*2.4, dr=add(mul(ux,Math.cos(an)),mul(uz,Math.sin(an)));
    const base=add(P(f),mul(dr,rad(f)*.9)); S.cone(base,add(add(base,mul(dr,.26)),mul(axv,.06)),.055,C.iron,{seg:6,shine:.9}); }
  S.cone(P(1.0),add(P(1.0),mul(axv,.34)),.085,C.iron,{seg:7,shine:.9});
  /* в ульте дубина втыкается в землю и ждёт, пока он поест */
  if(ult&&gp>=.27&&gp<.86&&AXC&&AXC.cur){ const sv=AXC.cur.R; AXC.cur.R=[.9,.55,.85]; hold(S,_hR,'R'); AXC.cur.R=sv; }
  else hold(S,_hR,'R');

  /* --- «Большой обед»: жертва в руках --- */
  if(ult&&AXC&&AXC.cur){
    const R=AXC.cur.R, L=AXC.cur.L, mid=[(R[0]+L[0])/2,(R[1]+L[1])/2,(R[2]+L[2])/2];
    const ground=[0,.3,1.45];
    let pos=null, sc=.8;
    if(gp<.3) pos=add(ground,[Math.sin(t*9)*.03,0,0]);
    else if(gp<.43){ const u=jvSm(gp,.3,.43); pos=lerp(ground,add(mid,[0,.02,.02]),u); }
    else if(gp<.62) pos=add(mid,[0,.02,.02]);
    else if(gp<.72){ const u=jvSm(gp,.62,.72); pos=lerp(add(mid,[0,0,0]),[0,HY-.2,.34],u); sc=.8*(1-.8*u); }
    if(pos) jvVictim(S,pos,sc,t,1);
  }
  }finally{ JV_BR[0]=BR0[0]; JV_BR[1]=BR0[1]; JV_BR[2]=BR0[2]; }
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
/* ---------- Король Чип: детализированная модель (горностай, золотое шитьё, самоцветы, корона с дугами) ---------- */
const CHP={GOLD:'#e3b13f',GOLD_HI:'#fff0a8',GOLD_DK:'#b9852a',PURP:'#4b3a78',PURP_HI:'#6a52a3',PURP_DK:'#2c2145',
  RED:'#a3213f',RED_DK:'#6e1229',FUR:'#f8f4ec',INK:'#1b1424',RUBY:'#d62845',SAPH:'#3f78ff',EMER:'#2fc27a',AMET:'#a05bff'};
function chipRobeR(y){ return y<=.825 ? .6-.033*(y/.825) : .567-.117*((y-.825)/.675); }
/* кольцо горностая: белые меховые «шарики» с чёрными хвостиками */
function chipFur(S,y,R,n,sx,sy,ph){
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2+(ph||0), c=Math.cos(a), s=Math.sin(a);
    S.ell([c*R,y,s*R],[sx,sy,sx],CHP.FUR,{rings:4,seg:7,shine:.12});
    if(i%2===0) S.ell([c*(R+sx*.62),y-sy*.15,s*(R+sx*.62)],[.02,.05,.02],CHP.INK,{rings:3,seg:5,shine:.08});
  }
}
/* самоцвет в золотой оправе, смотрит наружу от оси Y */
function chipGem(S,x,y,z,r,col){
  S.ell([x,y,z],[r*1.28,r*1.28,r*.7],CHP.GOLD,{rings:4,seg:8,shine:.85});
  const o=Math.hypot(x,z)||1;
  S.ell([x+x/o*r*.32,y,z+z/o*r*.32],[r,r,r*.75],col,{rings:4,seg:8,shine:.95});
  S.ell([x+x/o*r*.7-r*.25,y+r*.3,z+z/o*r*.7],[r*.2,r*.2,r*.12],'#ffffff',{rings:3,seg:5,glow:1});
}
/* золотая «звёздочка»-блик из двух скрещённых планок */
function chipStar(S,pos,size,k){
  if(k<.05) return; const L=size*k;
  S.box(pos,[L*2.2,L*.22,.012],'#fffbe0',{glow:1}); S.box(pos,[L*.22,L*2.2,.012],'#fffbe0',{glow:1});
  S.box(pos,[L*1.3,L*.14,.012],'#ffe9a0',{glow:1,rot:[0,0,.785]}); S.box(pos,[L*.14,L*1.3,.012],'#ffe9a0',{glow:1,rot:[0,0,.785]});
}
function chipStaff(S,h,d,t,fx){
  const C=CHP, [bx,by,bz]=basisY(d,[1,0,0]), at=s=>add(h,mul(d,s));
  const pulse=.5+.5*Math.sin(t*2.6);
  /* древко: золотая витая трубка с кольцами */
  S.tube(at(-1.12),at(1.0),.042,.042,C.GOLD,{seg:10,shine:.8});
  for(let i=0;i<9;i++){ const s0=-.95+i*.19; S.tube(at(s0),at(s0+.045),.056,.056,i%2?C.GOLD_HI:C.GOLD_DK,{seg:10,shine:.7}); }
  /* обмотка под ладонью: красная кожа и золотые кольца */
  S.tube(at(-.24),at(.26),.058,.058,C.RED_DK,{seg:10,shine:.3});
  for(const s0 of [-.26,.24]) S.tube(at(s0),at(s0+.04),.07,.07,C.GOLD_HI,{seg:10,shine:.8});
  /* навершие-пята */
  S.ell(at(-1.14),[.08,.1,.08],C.GOLD,{rings:5,seg:9,shine:.85}); S.cone(at(-1.2),at(-1.36),.045,C.GOLD_HI,{seg:6,shine:.8});
  /* чаша под шаром */
  S.tube(at(.98),at(1.0),.075,.075,C.GOLD_HI,{seg:12,shine:.8});
  S.tube(at(1.0),at(1.1),.06,.12,C.GOLD,{seg:12,shine:.8});
  S.tube(at(1.1),at(1.125),.13,.13,C.GOLD_HI,{seg:12,shine:.85});
  /* четыре изогнутых лапы-зажима, держащие шар */
  const hd=at(1.27), rr=.16+.045*fx+.012*pulse;
  for(let i=0;i<4;i++){ const a=i*1.5708+.78, v=add(mul(bx,Math.cos(a)),mul(bz,Math.sin(a)));
    const P=[add(at(1.12),mul(v,.1)),add(at(1.22),mul(v,rr+.05)),add(at(1.36),mul(v,rr+.04)),add(at(1.5),mul(v,.05))];
    for(let k=0;k<3;k++) S.tube(P[k],P[k+1],.024,.02,C.GOLD,{seg:6,shine:.8});
    S.ell(P[1],[.032,.032,.032],C.GOLD_HI,{rings:3,seg:6,shine:.9}); }
  S.cone(at(1.5),at(1.72),.055,C.GOLD_HI,{seg:8,shine:.85});
  S.ell(at(1.74),[.04,.04,.04],C.FUR,{rings:4,seg:7,shine:.95});
  /* рубиновый шар */
  S.ell(hd,[rr,rr,rr],C.RUBY,{rings:9,seg:16,shine:.9});
  S.ell(add(hd,add(mul(bx,-.05),mul(by,.07))),[rr*.38,rr*.3,rr*.3],'#ff9aa8',{rings:4,seg:8,glow:1});
  G(S,hd,rr*.55,'#ff5a73',{rings:4,seg:8,glow:1});
  /* кольца-орбиты вокруг шара при кастах */
  if(fx>.25){
    const k=fx;
    for(let i=0;i<7;i++){ const a=t*3.2+i*.8976; const v=add(mul(bx,Math.cos(a)),mul(bz,Math.sin(a)));
      G(S,add(add(hd,mul(v,rr+.12+.06*k)),mul(by,Math.sin(a*1.7)*.12)),.022+.02*k,i%2?C.GOLD_HI:'#ffd0d8'); }
    chipStar(S,add(hd,mul(bz,.02)),.2,.4+.6*k);
  }
  return hd;
}
/* 0.9.8: ИММОРТАЛКА «Королевский ара» — попугай на левом плече Чипа (skinId содержит '+parrot'). Качается, поворачивает голову, иногда машет крыльями. */
function chipParrot(S,t){
  const RED='#d9262e', RED_DK='#a01820', BLU='#2b6fe0', YEL='#ffd23c', CREAM='#f3eadb', BEAK='#efe4cc', DARK='#1b1b22', GOLD='#ffd568';
  const bob=Math.sin(t*2.3)*.012, turn=Math.sin(t*.8)*.045, flap=Math.pow(Math.max(0,Math.sin(t*.65)),14);
  const bx=-.5, by=1.99+bob, bz=.0;
  S.ell([bx,by,bz],[.098,.15,.088],RED,{rings:5,seg:10,shine:.55,rot:[.28,0,0]});               // тело
  S.ell([bx,by-.02,bz+.045],[.07,.1,.04],'#ef4a3a',{rings:4,seg:8,shine:.45,rot:[.28,0,0]});    // светлая грудка
  const hx=bx+turn, hy=by+.2, hz=bz+.045;
  S.ell([hx,hy,hz],[.074,.074,.076],RED,{rings:5,seg:10,shine:.55});                            // голова
  S.ell([hx,hy-.004,hz+.045],[.052,.05,.03],CREAM,{rings:4,seg:8,shine:.2});                    // белая «маска»
  for(const s of [-1,1]){
    S.ell([hx+s*.052,hy+.012,hz+.05],[.019,.019,.012],'#fff',{rings:3,seg:6,shine:.6});
    S.ell([hx+s*.054,hy+.012,hz+.058],[.011,.011,.008],DARK,{rings:3,seg:5,shine:.9}); }
  S.cone([hx,hy+.005,hz+.07],[hx,hy-.065,hz+.17],.042,BEAK,{seg:7,shine:.7});                   // загнутый клюв
  S.cone([hx,hy-.04,hz+.075],[hx,hy-.085,hz+.135],.028,DARK,{seg:6,shine:.5});
  for(const s of [-1,1]){                                                                      // крылья: красный верх, жёлтая и синяя полосы
    const wx=bx+s*.088, fl=s*flap*.9;
    S.ell([wx,by+.02,bz-.02],[.034,.125,.07],RED_DK,{rings:4,seg:8,shine:.4,rot:[.28,0,fl]});
    S.ell([wx+s*.004,by-.04,bz-.04],[.032,.07,.06],YEL,{rings:3,seg:7,shine:.45,rot:[.28,0,fl]});
    S.ell([wx+s*.006,by-.11,bz-.06],[.03,.075,.055],BLU,{rings:3,seg:7,shine:.5,rot:[.28,0,fl]}); }
  const tb=[bx,by-.1,bz-.07];                                                                  // длинный хвост
  for(const [o,col,len] of [[-.035,RED,.4],[0,RED_DK,.46],[.035,RED,.4]]){
    const tip=[bx+o*1.6,by-.1-len,bz-.2-len*.25+Math.sin(t*1.7+o*20)*.01];
    S.obox(tb,tip,.04,.012,col,{hint:[1,0,0],shine:.45});
    S.obox(lerp(tb,tip,.62),tip,.036,.013,BLU,{hint:[1,0,0],shine:.55}); }
  for(const s of [-1,1]){ const f=[bx+s*.035,by-.14,bz+.03];                                   // лапки на плече
    S.tube(f,[bx+s*.035,by-.2,bz+.05],.011,.011,'#4a4a52',{seg:5});
    S.ell([bx+s*.035,by-.205,bz+.065],[.022,.01,.03],'#4a4a52',{rings:3,seg:5}); }
  S.tube([bx-.035,by-.165,bz+.035],[bx-.035,by-.18,bz+.035],.018,.018,GOLD,{seg:8,shine:.9});   // золотое кольцо на лапке
  for(let i=0;i<3;i++){ const k=Math.pow(Math.max(0,Math.sin(t*2.1+i*2.1)),8);                // искры «иммортала»
    chipStar(S,[bx+Math.sin(t*.9+i*2.1)*.17,by+.14+i*.07,bz+Math.cos(t*.9+i*2.1)*.1],.07,k); }
}
MODELS.chip=(S,d,t,pose)=>{
  const C=CHP, rp=chipResolve(pose,t), st=chipState(rp,t), TAU=Math.PI*2;
  const walking=rp.kind==='walk';
  man(S,{nobelt:true,face:true,bulk:1.0,cloth:C.PURP,arm:C.PURP,glove:C.GOLD,armR:st.h,armL:st.l,legs:C.PURP_DK,belt:C.GOLD,trim:C.GOLD,bracer:C.GOLD,beard:C.FUR,knee:C.GOLD,
    pad:'#d9a93a',padTrim:C.GOLD_HI,fo:{eye:'#4a7aff',angry:.0,mouth:'smile',brow:C.FUR,lip:'#a0505a',cheeks:'#e8908a'}});

  /* --- мантия: пурпурная ткань, золотое шитьё и ромбы, бархатная вставка спереди --- */
  robe(S,.6,.45,1.5,C.PURP,null);
  S.tube([0,.18,0],[0,.3,0],chipRobeR(.18)+.012,chipRobeR(.3)+.012,C.GOLD,{seg:24,shine:.75});
  S.tube([0,.31,0],[0,.335,0],chipRobeR(.31)+.014,chipRobeR(.335)+.014,C.GOLD_HI,{seg:24,shine:.85});
  S.tube([0,.94,0],[0,.975,0],chipRobeR(.94)+.01,chipRobeR(.975)+.01,C.GOLD,{seg:24,shine:.75});
  for(const [y,n,ph] of [[.5,18,0],[.72,16,.2]]){
    for(let i=0;i<n;i++){ const a=i/n*TAU+ph, r=chipRobeR(y)+.008;
      S.box([Math.cos(a)*r,y,Math.sin(a)*r],[.075,.075,.022],i%2?C.GOLD:C.GOLD_HI,{rot:[0,Math.PI/2-a,.785],shine:.75});
      if(i%2===0) S.ell([Math.cos(a)*(r+.012),y,Math.sin(a)*(r+.012)],[.016,.016,.01],C.RUBY,{rings:3,seg:5,shine:.9,rot:[0,Math.PI/2-a,0]}); }
  }
  /* алая бархатная полоса по центру с золотой окантовкой и самоцветами */
  const strip=(w,col,off,sh)=>{ for(const [y0,y1] of [[.16,.825],[.825,1.1]])
    S.obox([0,y0,chipRobeR(y0)+off],[0,y1,chipRobeR(y1)+off],w,.02,col,{hint:[0,0,1],shine:sh}); };
  strip(.3,C.GOLD,.005,.7); strip(.24,C.RED_DK,.014,.25);
  for(const [y,col] of [[.42,C.RUBY],[.6,C.SAPH],[.78,C.EMER],[.96,C.RUBY]]) chipGem(S,0,y,chipRobeR(y)+.026,.04,col);
  /* ермин по подолу */
  chipFur(S,.1,.63,20,.13,.09,0);

  /* --- пояс: широкий золотой, самоцветы в оправе, большая пряжка --- */
  S.tube([0,1.3,0],[0,1.46,0],.455,.455,C.GOLD,{seg:20,shine:.8});
  S.tube([0,1.3,0],[0,1.315,0],.465,.465,C.GOLD_HI,{seg:20,shine:.85});
  S.tube([0,1.445,0],[0,1.46,0],.465,.465,C.GOLD_HI,{seg:20,shine:.85});
  const gems=[C.RUBY,C.SAPH,C.EMER,C.AMET];
  for(let i=0;i<10;i++){ const a=i/10*TAU+.31; if(Math.abs(Math.sin(a/2-.1))<.2&&Math.cos(a)>.9) continue;
    chipGem(S,Math.sin(a)*.47,1.38,Math.cos(a)*.47,.034,gems[i%4]); }
  S.ell([0,1.38,.475],[.2,.15,.05],C.GOLD,{rings:6,seg:12,shine:.85});
  S.ell([0,1.38,.505],[.15,.11,.04],C.GOLD_DK,{rings:5,seg:10,shine:.7});
  chipGem(S,0,1.38,.505,.075,C.RUBY);
  for(const s of [-1,1]) S.ell([s*.125,1.38,.52],[.028,.028,.02],C.FUR,{rings:3,seg:6,shine:.95});

  /* --- алая накидка на плечах с горностаевой отделкой и золотая цепь с подвеской --- */
  S.tube([0,1.47,0],[0,1.7,0],.5,.34,C.RED,{seg:22,shine:.28});
  S.tube([0,1.47,0],[0,1.5,0],.512,.5,C.GOLD,{seg:22,shine:.8});
  chipFur(S,1.48,.52,18,.12,.075,.15);
  chipFur(S,1.7,.33,12,.12,.085,.2);
  const Rm=y=>.5-.16*Math.max(0,(y-1.46))/.24;
  let prev=null;
  for(let i=0;i<=14;i++){ const f=-1+i/7, phi=f*1.05, y=1.66-.17*Math.cos(phi*1.45), r=Rm(y)+.035;
    const p=[Math.sin(phi)*r,y,Math.cos(phi)*r];
    S.ell(p,[.03,.03,.03],C.GOLD,{rings:3,seg:6,shine:.9});
    if(prev&&i%2) S.tube(prev,p,.014,.014,C.GOLD_HI,{seg:5,shine:.9}); prev=p; }
  const pY=1.5, pZ=Rm(pY)+.07;
  S.tube([0,pY+.08,pZ-.02],[0,pY,pZ],.016,.016,C.GOLD_HI,{seg:5});
  S.ell([0,pY-.02,pZ],[.1,.12,.035],C.GOLD,{rings:5,seg:10,shine:.85});
  S.ell([0,pY-.02,pZ+.022],[.075,.095,.03],C.RUBY,{rings:5,seg:10,shine:.95});
  S.ell([-.025,pY+.015,pZ+.045],[.016,.02,.01],'#fff',{rings:3,seg:5,glow:1});
  /* рубины на наплечниках */
  for(const s of [-1,1]){ chipGem(S,s*.56,1.7,.07,.04,C.RUBY); chipGem(S,s*.66,1.62,.1,.028,C.SAPH); }

  /* --- плащ-«трон» за спиной: 9 полотнищ, горностаевая кайма с хвостиками и золотая нить --- */
  /* плащ расходится от плеч к земле и обходит мантию сзади, а не проваливается в неё */
  for(let i=0;i<11;i++){ const k=i-5, ak=Math.abs(k), w=.19;
    const ta=[k*.095,2.05,-.4], tb=[k*.145,.45,-.82+ak*.012], P=u=>lerp(ta,tb,u);
    S.obox(ta,tb,w,.05,i%2?C.RED:'#b0264a',{hint:[0,0,1],shine:.3});
    S.obox(P(.89),tb,w,.075,C.FUR,{hint:[0,0,1],shine:.12});
    S.ell(add(P(.945),[0,0,-.05]),[.026,.06,.014],C.INK,{rings:3,seg:5,shine:.08});
    S.obox(add(P(.04),[0,0,-.028]),add(P(.86),[0,0,-.028]),.014,.012,C.GOLD,{hint:[0,0,1],shine:.7}); }
  S.box([0,2.05,-.4],[1.1,.05,.05],C.GOLD,{shine:.7});

  /* --- голова: горностаевый воротник, усы, седые виски --- */
  for(const s of [-1,1]){
    S.ell([s*.07,1.9,.255],[.1,.035,.04],C.FUR,{rings:4,seg:8,rot:[0,0,-s*.35],shine:.15});
    S.ell([s*.15,1.88,.245],[.05,.03,.035],C.FUR,{rings:3,seg:6,rot:[0,0,s*.6],shine:.15});
    S.ell([s*.27,2.02,-.02],[.06,.13,.1],C.FUR,{rings:4,seg:8,shine:.1});
    S.ell([s*.25,2.17,.02],[.05,.05,.09],C.FUR,{rings:3,seg:6,rot:[0,0,s*.4],shine:.1}); }
  S.ell([0,2.0,-.2],[.27,.16,.1],C.FUR,{rings:4,seg:10,shine:.1});

  /* --- корона: красный бархат, ободок с самоцветами, зубцы с жемчугом, две дуги и державный шар --- */
  S.ell([0,2.37,0],[.31,.2,.31],'#9b1c3a',{rings:6,seg:14,shine:.35});
  S.tube([0,2.22,0],[0,2.42,0],.335,.345,C.GOLD,{seg:20,shine:.8});
  S.tube([0,2.205,0],[0,2.235,0],.35,.35,C.GOLD_HI,{seg:20,shine:.88});
  S.tube([0,2.405,0],[0,2.435,0],.352,.352,C.GOLD_HI,{seg:20,shine:.88});
  for(let i=0;i<8;i++){ const a=i/8*TAU+.39; chipGem(S,Math.sin(a)*.352,2.32,Math.cos(a)*.352,.04,gems[i%4]); }
  for(let i=0;i<8;i++){ const a=i/8*TAU+.39+TAU/16, x=Math.sin(a)*.34, z=Math.cos(a)*.34;
    S.ell([x,2.215,z],[.026,.026,.026],C.FUR,{rings:3,seg:6,shine:.95}); }
  for(let i=0;i<8;i++){
    const a=i/8*TAU, tall=i%2===0, x=Math.sin(a)*.34, z=Math.cos(a)*.34, top=tall?2.8:2.66;
    S.cone([x,2.43,z],[x*.96,top,z*.96],.075,C.GOLD,{seg:6,shine:.85});
    S.ell([x*.96,top+.03,z*.96],[.04,.04,.04],tall?C.FUR:gems[(i/2|0)%4],{rings:4,seg:7,shine:.95});
    chipStar(S,[x*.96,top+.05,z*.96+.04],.1,Math.pow(Math.max(0,Math.sin(t*2.3+i*1.7)),10)); }
  for(const ax of [0,1]){
    let pv=null;
    for(let k=0;k<=8;k++){ const th=k/8*Math.PI, c=Math.cos(th)*.33, y=2.43+Math.sin(th)*.4;
      const p=ax?[0,y,c]:[c,y,0];
      if(pv) S.tube(pv,p,.024,.024,C.GOLD,{seg:6,shine:.85}); pv=p; }
  }
  S.ell([0,2.865,0],[.075,.075,.075],C.GOLD,{rings:6,seg:10,shine:.9});
  S.tube([0,2.86,0],[0,2.88,0],.085,.085,C.GOLD_HI,{seg:10,shine:.9});
  S.box([0,2.99,0],[.035,.16,.035],C.GOLD_HI,{shine:.9}); S.box([0,3.0,0],[.12,.035,.035],C.GOLD_HI,{shine:.9});
  chipGem(S,0,2.9,.07,.025,C.RUBY);
  chipStar(S,[0,3.02,.06],.14,.5+.5*Math.sin(t*3.1));

  /* --- меховые манжеты на запястьях --- */
  for(const [hp,s] of [[st.h,1],[st.l,-1]]){
    const dd=norm(sub(hp,[s*.5,1.58,0]));
    const c=sub(hp,mul(dd,.045));
    S.ell(c,[.13,.085,.13],C.FUR,{rings:4,seg:8,shine:.1,rot:[0,0,0]});
    S.ell(add(c,[s*.02,.03,.1]),[.022,.045,.02],C.INK,{rings:3,seg:5,shine:.08}); }

  if(d && d.skinId && String(d.skinId).indexOf('+parrot')>=0) chipParrot(S,t);

  /* --- посох --- */
  const hd=chipStaff(S,st.h,st.d,t,st.fx);
  st.trail.forEach((tp,i)=>G(S,tp,Math.max(.03,.13-i*.016),i%2?C.GOLD:C.GOLD_HI));

  /* --- вспышка удара / каста --- */
  if(st.burst>.04){
    const [bx,by,bz]=basisY(st.d,[1,0,0]), b=st.burst;
    G(S,hd,.08+.13*b,'#fff3b0');
    for(let i=0;i<8;i++){ const a=i/8*TAU+.4; const v=add(mul(bx,Math.cos(a)),mul(bz,Math.sin(a)));
      S.cone(add(hd,mul(v,.12)),add(hd,mul(v,.2+.5*b*(i%2?.7:1))),.035,i%2?C.GOLD:C.GOLD_HI,{glow:1,seg:5});
      if(i%2===0) G(S,add(hd,mul(v,.34+.5*b)),.03+.02*b,'#fffbe0'); }
    chipStar(S,hd,.3,b);
  }
  /* --- луч приказа с летящими монетками --- */
  if(st.beam>.05) for(let i=1;i<=7;i++){ const q=add(hd,mul(st.d,.15+i*.27*st.beam+.1)); if(Math.hypot(q[0],q[2])>2.2) break;
    G(S,q,.05+.05*st.beam*(1-i/9),i%2?'#fff0a8':'#ffd568');
    if(i%2) S.ell(add(q,[0,.09*Math.sin(t*9+i),0]),[.07,.018,.07],C.GOLD,{rings:3,seg:8,shine:.9,rot:[t*8+i,0,.4]}); }
  /* --- подброшенная монета (Монета судьбы) --- */
  if(st.coin){ const c=st.coin; if(c.size>.05){
    S.ell(c.pos,[.21*c.size,.05*c.size,.21*c.size],C.GOLD,{rings:5,seg:14,shine:.95,rot:[c.spin,0,.3]});
    S.ell(c.pos,[.14*c.size,.056*c.size,.14*c.size],C.GOLD_DK,{rings:4,seg:12,shine:.8,rot:[c.spin,0,.3]});
    chipStar(S,add(c.pos,[0,.06,.12]),.16*c.size,.5+.5*Math.sin(c.spin*.5)); } }

  /* --- золотые монеты-спутники: объёмные, с чеканкой и хвостиком искр (ускоряются при W/R) --- */
  const oq=(st.orbit-1)/3;
  for(let i=0;i<6;i++){
    const a=t*1.4+i*1.047+st.spin, rad=1.15, yy=1.2+Math.sin(t*2+i)*.2+.15*oq, k=1+.4*oq;
    const pos=[Math.cos(a)*rad,yy,Math.sin(a)*rad], rot=[.5,a,0];
    S.ell(pos,[.14*k,.03,.14*k],C.GOLD,{rings:4,seg:12,shine:.9,rot});
    S.ell(pos,[.1*k,.036,.1*k],C.GOLD_DK,{rings:3,seg:10,shine:.75,rot});
    S.ell(pos,[.045*k,.04,.045*k],C.GOLD_HI,{rings:3,seg:8,shine:.95,rot});
    for(let j=1;j<=2;j++){ const b=a-j*.2; G(S,[Math.cos(b)*rad,yy+.015*j,Math.sin(b)*rad],.034-.009*j,j===1?'#ffe9a0':'#ffd568'); }
  }
  /* --- золотая пыль, поднимающаяся вокруг короля, и мерцающие блики --- */
  for(let i=0;i<10;i++){ const ph=(t*.3+i/10)%1, a=t*.7+i*2.4, r=.75+.25*Math.sin(i*1.7);
    G(S,[Math.cos(a)*r,.2+ph*2.9,Math.sin(a)*r],.04*(1-ph*.65),i%3?C.GOLD:C.GOLD_HI); }
  for(let i=0;i<4;i++){ const a=i*1.57+.5;
    chipStar(S,[Math.cos(a)*.62,1.0+.9*Math.abs(Math.sin(i*1.9)),Math.sin(a)*.62+.06],.12,Math.pow(Math.max(0,Math.sin(t*1.9+i*2.2)),8)); }

  /* --- эффекты на полу (рисуются под моделью): золотой круг с рунами, кольца и шипы способностей --- */
  const kk=S.sc, tg=S.target; S.target=S.pre; S.sc=1;
  S.ring([0,.01,0],1.22,.012,C.GOLD,{glow:1,n:48});
  S.ring([0,.012,0],.88,.01,C.GOLD_DK,{glow:1,n:36});
  for(let i=0;i<12;i++){ const a=t*.35+i*TAU/12;
    S.box([Math.cos(a)*1.05,.012,Math.sin(a)*1.05],[.11,.01,.045],i%2?C.GOLD_HI:C.GOLD,{glow:1,rot:[0,-a,0]}); }
  for(let i=0;i<6;i++){ const a=-t*.5+i*TAU/6;
    S.box([Math.cos(a)*.7,.012,Math.sin(a)*.7],[.07,.01,.07],C.GOLD,{glow:1,rot:[0,-a+.785,0]}); }
  for(const r of st.rings) S.ring([0,.016,0],r.r,r.w,C.GOLD,{glow:1,n:36});
  if(st.spikes>.02){
    for(let i=0;i<10;i++){ const a=i/10*TAU+.3, hh=.15+.85*st.spikes*(.7+.3*Math.sin(i*2.3));
      S.cone([Math.cos(a)*.95,0,Math.sin(a)*.95],[Math.cos(a)*.95,hh,Math.sin(a)*.95],.07,'#fff0a8',{glow:1,seg:5}); }
    for(let i=0;i<10;i++){ const a=i/10*TAU+.3+TAU/20, hh=.1+.55*st.spikes*(.7+.3*Math.sin(i*1.7));
      S.cone([Math.cos(a)*1.2,0,Math.sin(a)*1.2],[Math.cos(a)*1.2,hh,Math.sin(a)*1.2],.05,C.GOLD,{glow:1,seg:5}); }
  }
  S.sc=kk; S.target=tg;
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
  /* Снайпер (дварф, как в референсе): красная куртка, жёлтые манжеты,
     розовые уши/нос/руки, пышная белая борода, кепка с очками (зелёная линза)
     и огромная базука-винтовка с металлическими кольцами. */
  S.sc=.9;
  const hy=1.78, PINK='#e0899f', RED='#b9322a', YEL='#e0a81f', BRN='#4a3524', WOOD='#8a4a2c', STEEL='#aeb4bd';
  man(S,{face:true,bulk:1.28,gap:.24,hipY:.88,shY:1.5,headY:hy,
    cloth:RED,arm:RED,forearm:'#5a3a26',glove:PINK,skin:'#e9a2b4',legs:BRN,boots:'#3a2a1c',toe:PINK,
    pad:'#4a4a52',padTrim:YEL,bracer:YEL,cuff:YEL,belt:'#2e241c',trim:YEL,knee:'#3a2a1c',collar:'#6a4a2a',
    pointEars:true,
    armR:[.5,1.16,.75],armL:[-.3,1.12,1.05],
    fo:{eye:'#2a2a33',angry:.2,mouth:'stern',brow:'#e8e8e8'}});
  // пояс и ремни крест-накрест
  S.tube([-.38,1.72,.22],[.34,1.02,.34],.04,.04,'#2e241c',{seg:6});
  S.tube([.38,1.72,.22],[-.34,1.02,.34],.035,.035,'#6a4a2a',{seg:6});
  for(const s of [-1,1]) S.box([s*.3,.95,.3],[.14,.2,.1],'#3a2a1c');
  // жёлтые заплатки и наплечники-пряжки
  S.box([-.3,1.6,.3],[.18,.14,.04],YEL);
  S.box([.28,1.35,.34],[.14,.16,.04],'#7a2218');
  // голова: нос, усы, борода
  S.ell([0,hy-.04,.3],[.075,.07,.08],'#e8758f',{rings:6,seg:10,shine:.4});
  for(const s of [-1,1]){
    S.ell([s*.1,hy-.1,.25],[.12,.055,.08],'#f4f4f4',{rings:5,seg:8});
    S.ell([s*.17,hy-.22,.2],[.14,.18,.14],'#f4f4f4',{rings:6,seg:10});
  }
  S.ell([0,hy-.32,.22],[.32,.34,.26],'#f7f7f7',{rings:8,seg:12});
  S.cone([0,hy-.4,.24],[0,hy-.95,.36],.27,'#f1f1f1',{seg:10});
  S.cone([-.1,hy-.38,.22],[-.12,hy-.7,.28],.1,'#e6e6e6',{seg:7});
  S.cone([.1,hy-.38,.22],[.12,hy-.7,.28],.1,'#e6e6e6',{seg:7});
  // кепка и очки с зелёной линзой
  S.ell([0,hy+.17,-.02],[.3,.2,.3],'#5a3d22',{rings:7,seg:14});
  S.tube([0,hy+.1,0],[0,hy+.14,0],.33,.33,'#3a2a1c',{seg:16});
  S.tube([-.3,hy+.12,.02],[.3,hy+.12,.02],.02,.02,'#2a2a2a',{seg:5});
  S.tube([-.28,hy+.14,.12],[.28,hy+.14,.12],.045,.045,'#2e241c',{seg:6});
  for(const s of [-1,1]){
    S.tube([s*.12,hy+.14,.24],[s*.12,hy+.14,.31],.1,.1,'#c9a24a',{seg:12,shine:.7});
    S.tube([s*.12,hy+.14,.31],[s*.12,hy+.14,.33],.065,.065,'#8a6a3a',{seg:10});
    S.ell([s*.12,hy+.14,.335],[.062,.062,.02],'#7dff5a',{glow:1,rings:4,seg:8});
  }
  const _h17=hmark(S);
  // базука-винтовка: толстый деревянный ствол, стальные кольца, второй ствол снизу
  S.tube([.42,1.24,.05],[.42,1.32,2.0],.15,.14,WOOD,{seg:12,shine:.35});
  S.tube([.42,1.06,.2],[.42,1.11,1.5],.11,.1,'#6e3a22',{seg:10,shine:.3});
  for(const z of [.35,.8,1.25,1.7]){
    S.tube([.42,1.26+z*.04,z],[.42,1.26+z*.04,z+.07],.19,.19,STEEL,{seg:12,shine:.8});
  }
  S.tube([.42,1.34,1.95],[.42,1.34,2.18],.185,.17,'#3a3a40',{seg:12,shine:.6});
  S.ell([.42,1.34,2.19],[.12,.12,.03],'#0d0d10',{rings:4,seg:10});
  S.box([.42,1.42,.35],[.07,.12,.35],'#2a2a30',{shine:.5});
  S.tube([.28,1.44,.8],[.24,1.66,.8],.012,.012,'#9aa0a8',{seg:4});
  S.box([.42,.86,.75],[.05,.34,.1],'#555',{rot:[.2,0,0]});
  // розовые лоскуты на стволе
  for(let i=0;i<3;i++) S.box([.5+i*.03,1.12-i*.03,.95+i*.06],[.04,.22,.03],'#e0899f',{rot:[0,0,.2*(i-1)]});
  hold(S,_h17,'R');
  // рюкзак и скатка за спиной
  S.box([-.35,1.45,-.38],[.42,.72,.26],'#d0a02e');
  S.tube([-.35,1.95,-.36],[-.35,2.02,-.36],.15,.15,'#7a4a2a',{seg:8});
  S.tube([-.1,1.85,-.45],[-.6,1.2,-.45],.1,.1,'#5a3d22',{seg:8});
  for(const s of [-1,1]) S.cone([s*.15,.18,-.05],[s*.15,.04,-.18],.03,'#8a8a8a',{seg:5,shine:.8});
  const _h18=hmark(S);
  G(S,[.42,1.34,2.28],.03,'#ff5368');
  hold(S,_h18,'R');
  if(d && d.skinId && String(d.skinId).split('+')[0]==='sniperInferno') sniperInfernoFx(S,t);
};
/* 0.9.9.6: огненные детали арканы Снайпера — корона пламени над кепкой, факел на дуле, раскалённые кольца ствола, языки за плечами и летящие угли */
function sniperInfernoFx(S,t){
  const FL=['#ff3d12','#ff7a1c','#ffb02e'];
  const fl=(i,k)=>Math.sin(t*(6+k)+i*2.1)*.5+.5;
  for(let i=0;i<8;i++){                                   // корона пламени
    const a=i/8*Math.PI*2, r=.23, f=fl(i,1), bx=Math.cos(a)*r, bz=Math.sin(a)*r;
    S.cone([bx,1.95,bz],[bx*.3,2.14+f*.22+(i%2)*.1,bz*.3],.075,FL[i%3],{seg:6,glow:1,shine:0});
  }
  G(S,[0,2.02,0],.13+.02*fl(0,2),'#ffb02e');
  for(const s of [-1,1]){                                 // огонь за плечами
    for(let k=0;k<3;k++){ const f=fl(k+(s>0?3:0),2);
      S.cone([s*.42,1.62,-.1-k*.05],[s*(.5+k*.06),1.95+f*.28+k*.1,-.2-k*.08],.08-.015*k,FL[k],{seg:6,glow:1,shine:0}); }
  }
  const mz=[.42,1.34,2.3];                                // факел на дуле
  for(let i=0;i<4;i++){ const f=fl(i,3);
    S.cone([mz[0],mz[1],mz[2]],[mz[0]+Math.sin(t*9+i)*.04,mz[1]+.06+f*.1,mz[2]+.22+f*.24+i*.03],.075-.014*i,FL[i%3],{seg:6,glow:1,shine:0}); }
  G(S,mz,.1+.03*fl(1,5),'#ffe27a');
  for(const z of [.35,.8,1.25,1.7]) G(S,[.42,1.33+z*.04,z+.03],.05,'#ff7a1c');   // жар на кольцах ствола
  for(let i=0;i<8;i++){                                   // летящие угли
    const ph=(t*.55+i/8)%1, a=i*2.4;
    G(S,[Math.cos(a)*.55*(1-ph*.4),.85+ph*1.7,Math.sin(a)*.42-.1],.03*(1-ph)+.012,i%2?'#ffb02e':'#ff5a1c');
  }
}

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
  S.tx=(def&&def.skinId&&SKIN_TINTS[String(def.skinId).split('+')[0]])||null;
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
  const cx=W/2+(o.dx||0)*W, cy=H*(o.cy==null?.6:o.cy);   /* dx/cy — сдвиг кадра для крупного плана (превью иммортала) */
  const sp=Math.sin(pitch);
  const res=render(def,{W,H,yaw,pitch,t,f:fpx,cx,cy,pedestal:!o.noPedestal,pose:o.pose||{kind:'show'}});
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
  if(d.t==='stand'){
    STAND_PEND.delete(d.key);
    const res={data:new Uint8ClampedArray(d.data),glow:d.glow?new Uint8ClampedArray(d.glow):null,W:d.W,H:d.H};
    const hi=toCanvas(res,'stand');
    const cv=mkCanvas(d.W,d.H); cv.getContext('2d').drawImage(hi,0,0);
    STAND[d.key]={canvas:cv,w:d.W,h:d.H,ax:d.W/2,ay:d.H*STAND_FOOT};
    return;
  }
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
/* ---------- Кинематографическая заставка: боец «стоит» лицом к камере ----------
   Крупный кадр (size×size) рисуется один раз в воркере и кэшируется. Поворот yaw: > 0 — боец
   смотрит влево на экране, < 0 — вправо. Ноги всегда на линии ay = h * STAND_FOOT. */
const STAND={}, STAND_PEND=new Set();
const STAND_FOOT=.88;
let standSyncFrame=-1;
function standRaw(def,size,yaw){
  const unit=.2*size, f=unit*9;
  return render(def,{W:size,H:size,yaw:yaw||0,pitch:.1,t:.3,f,cx:size/2,cy:size*.62,pedestal:false,pose:{kind:'idle'}});
}
function stand(def,size,yaw){
  if(typeof document==='undefined'||!def||!MODELS[def.id]) return null;
  size=Math.round(size||480); yaw=Math.round((yaw||0)*100)/100;
  const key='st|'+def.id+'|'+(def.skinId||'')+'|'+size+'|'+yaw;
  if(STAND[key]) return STAND[key];
  if(STAND_PEND.has(key)) return null;
  const sd={id:def.id,skinId:def.skinId,color:def.color,color2:def.color2};
  const wk=getWorker();
  if(wk){
    STAND_PEND.add(key);
    wk.postMessage({t:'stand',key,def:sd,size,yaw});
    return null;
  }
  /* запасной путь без Worker: не больше одного кадра за такт */
  if(standSyncFrame===sprFrame) return null;
  standSyncFrame=sprFrame;
  const res=standRaw(sd,size,yaw);
  const hi=toCanvas(res,'stand');
  const cv=mkCanvas(res.W,res.H); cv.getContext('2d').drawImage(hi,0,0);
  return STAND[key]={canvas:cv,w:res.W,h:res.H,ax:res.W/2,ay:res.H*STAND_FOOT};
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

/* =========================================================
   0.9.2 — ВИРСУДИ, «Теневой изгой»: новая 3D-модель со скелетом.
   Капюшон со светящимися глазами, рваный плащ, наплечник, два клинка
   с бирюзовой кромкой. Настоящий бег (корпус наклонён, плащ летит
   за спиной), двойной скрещённый удар и своя анимация на каждую
   способность: Q — волны, W — прыжок, E — кража, R — туман.
   ========================================================= */
const VS={NAVY:'#2b3752',NAVYD:'#171d2e',NAVYL:'#46598a',CYAN:'#a8eaff',CYAND:'#3fa9d6',STEEL:'#cfd9e8',STEELD:'#6b7a96',
  LEATH:'#3b2f2c',SKIN:'#c99d7d',FACE:'#b9d3df',FACED:'#7fa3b8',VOID:'#05070d',VIO:'#8a6bff',SMOKE:'#6f7fa8'};
function vsPose(rp,t){
  const k=rp.kind, p=rp.p||0, sl=rp.slot|0, br=Math.sin(t*1.7);
  const P={pitch:.3+.02*br,twist:.16,roll:0,offY:-.07+.012*br,offZ:0,head:-.12,
    hR:[.6,1.08+.02*br,.62],hL:[-.52,1.0+.02*br,.5],fR:[.3,0,.24],fL:[-.3,0,-.2],
    bR:[.12,.2,1],bL:[-.25,.3,-1],glow:0,fire:0,flow:0,air:0,drain:0,smoke:0};
  if(k==='walk'){
    const ph=p*Math.PI*2;
    const fr=limbPhase(ph,.66,.04,.58,0), fl=limbPhase(ph+Math.PI,.66,.04,.58,0);
    P.fR=[.27,fr[1],fr[0]]; P.fL=[-.27,fl[1],fl[0]];
    P.pitch=.74+.05*Math.sin(ph*2); P.offY=-.15+.06*Math.cos(ph*2);
    P.twist=.24*Math.cos(ph); P.roll=-.05*Math.sin(ph);
    P.hR=[.5,1.02+.1*Math.abs(Math.sin(ph)),-.28-.5*(fr[0]-.04)];
    P.hL=[-.5,1.02+.1*Math.abs(Math.cos(ph)),-.28-.5*(fl[0]-.04)];
    P.bR=[.1,.12,-1]; P.bL=[-.1,.12,-1];
    P.head=-.55*P.pitch+.1; P.flow=1;
  } else if(k==='attack'){
    P.pitch=RK(p,[[0,.3],[.28,.08],[.5,.62,E_in],[.8,.45],[1,.3]]);
    P.twist=RK(p,[[0,.16],[.28,.75],[.5,-.7,E_in],[.8,-.2],[1,.16]]);
    P.offZ=RK(p,[[0,0],[.28,-.08],[.5,.3,E_in],[1,0]]);
    P.hR=RK(p,[[0,P.hR],[.28,[.95,2.25,-.2]],[.5,[-.3,.9,1.4],E_in],[.8,[.3,1.0,.9]],[1,[.6,1.08,.62]]]);
    P.bR=RK(p,[[0,P.bR],[.28,[.3,.95,-.1]],[.5,[-.5,-.1,.9],E_in],[.8,[0,.3,1]],[1,P.bR]]);
    P.hL=RK(p,[[0,P.hL],[.32,[-.95,1.3,.1]],[.5,[-.95,1.65,.4]],[.68,[.5,.8,1.35],E_in],[.9,[-.2,1.0,.8]],[1,[-.52,1.0,.5]]]);
    P.bL=RK(p,[[0,P.bL],[.32,[-.4,.3,-.9]],[.5,[-.2,.6,.5]],[.68,[.7,-.1,.7],E_in],[1,P.bL]]);
    P.fR=RK(p,[[0,P.fR],[.5,[.3,0,.62],E_in],[1,P.fR]]);
    P.fL=RK(p,[[0,P.fL],[.5,[-.3,0,-.4],E_in],[1,P.fL]]);
    P.head=RK(p,[[0,-.12],[.28,.1],[.5,-.4],[1,-.12]]); P.fire=bell(p,.52,.1); P.arc=1;
  } else if(k==='cast'&&sl===0){        // Q «Отдай сдачу»: сжимается, держит скрещённые клинки 1,5 с и выпускает волны
    P.pitch=RK(p,[[0,.3],[.2,.52],[.85,.5],[.92,.02,E_out],[1,.2]]);
    P.twist=RK(p,[[0,.16],[.2,0],[.85,0],[1,.16]]);
    P.offY=RK(p,[[0,-.07],[.2,-.32],[.85,-.3],[.93,.06,E_out],[1,-.02]]);
    P.hR=RK(p,[[0,P.hR],[.2,[.14,1.35,.82]],[.85,[.14,1.4,.82]],[.93,[1.3,1.15,.3],E_out],[1,[1.25,1.1,.4]]]);
    P.hL=RK(p,[[0,P.hL],[.2,[-.14,1.3,.84]],[.85,[-.14,1.35,.84]],[.93,[-1.3,1.15,.3],E_out],[1,[-1.25,1.1,.4]]]);
    P.bR=RK(p,[[0,P.bR],[.2,[-.6,.9,.15]],[.85,[-.6,.9,.15]],[.93,[1,.15,.1]],[1,[1,.15,.1]]]);
    P.bL=RK(p,[[0,P.bL],[.2,[.6,.9,.15]],[.85,[.6,.9,.15]],[.93,[-1,.15,.1]],[1,[-1,.15,.1]]]);
    P.fR=RK(p,[[0,P.fR],[.2,[.5,0,.12]],[1,[.5,0,.12]]]); P.fL=RK(p,[[0,P.fL],[.2,[-.5,0,-.05]],[1,[-.5,0,-.05]]]);
    P.head=RK(p,[[0,-.12],[.2,.32],[.85,.3],[.93,-.15],[1,-.12]]);
    P.glow=Math.max(.25*cl01(p/.2)*(p<.9?1:0),bell(p,.93,.1)); P.fire=bell(p,.93,.06)+.3*cl01((p-.2)/.4)*(p<.9?1:0);
  } else if(k==='cast'&&sl===1){        // W «Прыжок на Коломию»: присед — прыжок — удар сверху
    P.pitch=RK(p,[[0,.3],[.12,.78],[.5,.5],[.88,.95,E_in],[.95,.5],[1,.3]]);
    P.offY=RK(p,[[0,-.07],[.12,-.34],[.5,1.15,E_out],[.9,-.1,E_in],[.94,0],[1,-.07]]);
    P.offZ=RK(p,[[0,0],[.12,-.08],[.5,.25],[.9,.35,E_in],[1,0]]);
    P.twist=RK(p,[[0,.16],[.12,.5],[.5,0],[.9,-.2],[1,.16]]);
    P.hR=RK(p,[[0,P.hR],[.12,[.5,.6,-.3]],[.5,[.45,2.0,1.0]],[.9,[.35,.25,1.5,],E_in],[.96,[.4,.5,1.3]],[1,[.6,1.08,.62]]]);
    P.hL=RK(p,[[0,P.hL],[.12,[-.5,.6,-.3]],[.5,[-.45,2.0,1.0]],[.9,[-.35,.25,1.5],E_in],[.96,[-.4,.5,1.3]],[1,[-.52,1.0,.5]]]);
    P.bR=RK(p,[[0,P.bR],[.12,[.1,.2,-1]],[.5,[.1,.5,.9]],[.9,[.1,-.9,.5],E_in],[.96,[.1,-.3,.9]],[1,P.bR]]);
    P.bL=RK(p,[[0,P.bL],[.12,[-.1,.2,-1]],[.5,[-.1,.5,.9]],[.9,[-.1,-.9,.5],E_in],[.96,[-.1,-.3,.9]],[1,P.bL]]);
    const air=Math.max(0,P.offY); P.air=air;
    P.fR=[.3,air*.75,.2+air*.35]; P.fL=[-.3,air*.9,-.2+air*.45];
    P.head=RK(p,[[0,-.12],[.12,.2],[.5,-.2],[.9,-.6],[1,-.12]]);
    P.glow=bell(p,.6,.3)*.7; P.fire=bell(p,.9,.06);
  } else if(k==='cast'&&sl===2){        // E «Царствоудий»: клинки в стороны, вытягивает силу врага
    P.pitch=RK(p,[[0,.3],[.35,.12],[.8,.16],[1,.3]]);
    P.hR=RK(p,[[0,P.hR],[.35,[1.25,1.55,.35]],[.8,[1.2,1.5,.4]],[1,[.6,1.08,.62]]]);
    P.hL=RK(p,[[0,P.hL],[.35,[-1.25,1.55,.35]],[.8,[-1.2,1.5,.4]],[1,[-.52,1.0,.5]]]);
    P.bR=RK(p,[[0,P.bR],[.35,[.8,.7,.3]],[.8,[.8,.7,.3]],[1,P.bR]]);
    P.bL=RK(p,[[0,P.bL],[.35,[-.8,.7,.3]],[.8,[-.8,.7,.3]],[1,P.bL]]);
    P.head=RK(p,[[0,-.12],[.35,.55],[.8,.45],[1,-.12]]); P.drain=bell(p,.55,.3); P.glow=.6*P.drain; P.fire=bell(p,.5,.15);
  } else if(k==='cast'){                // R «Изгойствоудий»: заворачивается в плащ, взрыв тумана
    P.pitch=RK(p,[[0,.3],[.3,.5],[.5,.55],[.75,.1,E_out],[1,.3]]);
    P.offY=RK(p,[[0,-.07],[.3,-.3],[.55,-.32],[.75,0],[1,-.07]]);
    P.hR=RK(p,[[0,P.hR],[.3,[.22,1.8,.6]],[.55,[.22,1.85,.58]],[.8,[1.1,1.4,.3],E_out],[1,[.6,1.08,.62]]]);
    P.hL=RK(p,[[0,P.hL],[.3,[-.22,1.78,.6]],[.55,[-.22,1.83,.58]],[.8,[-1.1,1.4,.3],E_out],[1,[-.52,1.0,.5]]]);
    P.bR=RK(p,[[0,P.bR],[.3,[-.3,-.9,.2]],[.55,[-.3,-.9,.2]],[.8,[.9,.2,.2]],[1,P.bR]]);
    P.bL=RK(p,[[0,P.bL],[.3,[.3,-.9,.2]],[.55,[.3,-.9,.2]],[.8,[-.9,.2,.2]],[1,P.bL]]);
    P.fR=RK(p,[[0,P.fR],[.3,[.4,0,.1]],[1,P.fR]]); P.fL=RK(p,[[0,P.fL],[.3,[-.4,0,0]],[1,P.fL]]);
    P.head=RK(p,[[0,-.12],[.3,.5],[.6,.55],[.8,-.1],[1,-.12]]);
    P.glow=bell(p,.6,.3); P.smoke=E_io(cl01(p/.55))*(1-cl01((p-.8)/.2)); P.fire=bell(p,.65,.1);
  }
  return P;
}
function vsFloor(S,rp,P){
  const k=rp.kind, p=rp.p||0, sl=rp.slot|0, C1='#83ddff', C2='#e4fbff', V1='#6f7fa8';
  floorFx(S,()=>{
    if(k==='attack'){ const r=cl01((p-.48)/.4); if(r>0) S.ring([0,.012,.5],.25+.8*E_out(r),.045*(1-r)+.01,C1,{glow:1,n:26}); return; }
    if(k!=='cast') return;
    if(sl===0){ for(const [j,c] of [[0,C1],[.09,C2],[.18,C1]]){ const r=cl01((p-.9-j*.25)/.2); if(r>0) S.ring([0,.012,0],.3+(1.3+j*4)*E_out(r),.06*(1-r)+.012,c,{glow:1,n:36}); }
      if(p>.15&&p<.9){ const g=cl01((p-.15)/.5), pr=.8*(1-.55*g); S.ring([0,.012,0],pr,.03,C1,{glow:1,n:28}); } }
    else if(sl===1){ const r=cl01((p-.62)/.4); if(r>0){ S.ring([0,.012,.4],.25+1.2*E_out(r),.06*(1-r)+.012,C1,{glow:1,n:30}); S.ring([0,.012,.4],.15+.7*E_out(r),.04*(1-r)+.01,C2,{glow:1,n:24}); } }
    else if(sl===2){ const r=cl01((p-.3)/.5); if(r>0) S.ring([0,.012,0],1.1-.8*E_out(r),.04*(1-r)+.012,'#8a6bff',{glow:1,n:28}); }
    else { for(const [j,c] of [[0,V1],[.12,C1]]){ const r=cl01((p-.55-j)/.45); if(r>0) S.ring([0,.012,0],.3+1.7*E_out(r),.07*(1-r)+.012,c,{glow:1,n:34}); } }
  });
}
function vsBlade(S,H,a,L,glow,t){
  a=norm(a);
  let cand=[0,0,1]; if(Math.abs(dot(a,cand))>.8) cand=[0,1,0];
  let c=sub(cand,mul(a,dot(cand,a))); c=norm(c);
  const nrm=norm(cross(a,c)), curve=.55, Rb=L/curve;
  /* рукоять, гарда, навершие */
  S.tube(add(H,mul(a,-.2)),add(H,mul(a,.12)),.05,.05,VS.LEATH,{seg:7,shine:.3});
  S.ell(add(H,mul(a,-.22)),[.06,.06,.06],VS.CYAN,{rings:4,seg:6,glow:1});
  S.box(add(H,mul(a,.14)),[.2,.05,.05],VS.STEELD,{shine:.6,rot:[0,0,0]});
  const pt=u=>{ const b=u*curve; return add(add(H,mul(a,.16+Rb*Math.sin(b))),mul(c,Rb*(1-Math.cos(b)))); };
  const N=6;
  for(let i=0;i<N;i++){
    const u0=i/N,u1=(i+1)/N,q0=pt(u0),q1=pt(u1);
    const w=.15*(1-.62*(u0+u1)/2);
    S.obox(q0,q1,Math.max(.045,w),.03,VS.STEEL,{shine:.75,hint:nrm});
    S.obox(add(q0,mul(c,-.0)),add(q1,mul(c,-.0)),Math.max(.02,w*.38),.038,VS.CYAN,{glow:1,hint:nrm});
  }
  S.cone(pt(1),add(pt(1),mul(norm(add(mul(a,Math.cos(curve)),mul(c,Math.sin(curve)))),.18)),.05,VS.STEEL,{seg:4,shine:.7});
  if(glow>.05) G(S,pt(.8),.06+.08*glow,VS.CYAN);
  return pt;
}
MODELS.virsudi=(S,d,t,pose)=>{
  /* 0.9.5 — Вирсуди переделан под Сларка: синяя рыбья кожа, оранжевый капюшон с фиолетовыми шипами,
     наплечник-фугу с зелёным глазом, рыбья голова-наруч, плавники, клыки и синие пузырьки. */
  const rp=rigResolve(pose,t,'vs',4), P=vsPose(rp,t);
  const B1='#1e4c84',B2='#0f2f58',B3='#2f6aa8',TEAL='#1b6a7e',TEALD='#10434f',CREAM='#cbbd9c',CREAMD='#8a7d61',
    ORG='#8a4320',ORGD='#4a2211',ORGL='#b8662a',PUR='#563692',PURL='#a28ad6',FIN='#a5634a',FIND='#6f3527',
    TUN='#1b2234',STRAP='#15110e',CLOTH='#4a1822',CLOTHD='#2e0f17',BUB='#4fb0f0',BUBH='#cfeeff',CLAW='#0d0e14';
  const PV=[0,.9,0], R=mkRot(P.pitch,P.twist,P.roll), TR=[0,P.offY,P.offZ];
  const Wp=q=>add(add(R(sub(q,PV)),PV),TR);
  vsFloor(S,rp,P);
  const m0=S.faces.length;
  /* таз, ремни, набедренная повязка */
  S.ell([0,.95,0],[.4,.25,.29],B2,{rings:6,seg:12});
  S.tube([0,.92,0],[0,1.06,0],.4,.4,STRAP,{seg:14,shine:.3});
  S.tube([0,1.06,0],[0,1.13,0],.375,.375,CREAMD,{seg:14,shine:.25});
  S.tube([0,1.13,0],[0,1.2,0],.36,.36,STRAP,{seg:14,shine:.3});
  S.box([0,1.02,.41],[.14,.14,.05],CREAMD,{shine:.5});
  S.box([.06,.62,.35],[.3,.62,.04],CLOTH,{rot:[.08,0,.05]}); S.box([-.14,.58,.34],[.2,.66,.04],CLOTHD,{rot:[.08,0,-.06]});
  S.box([0,.6,-.33],[.5,.62,.04],CLOTHD,{rot:[-.05,0,0]});
  /* торс: тёмная туника, светлое брюшко, ремни */
  S.tube([0,1.14,0],[0,1.46,0],.31,.37,TUN,{seg:14});
  S.ell([0,1.5,.02],[.46,.36,.3],TUN,{rings:9,seg:16});
  S.ell([0,1.4,.2],[.2,.32,.13],CREAM,{rings:6,seg:12,shine:.3});
  S.obox([-.34,1.74,.2],[.3,1.2,.28],.09,.04,STRAP,{shine:.35,hint:[0,0,1]});
  S.obox([.34,1.74,.16],[-.3,1.22,.27],.07,.04,STRAP,{shine:.35,hint:[0,0,1]});
  S.tube([0,1.7,0],[0,1.9,0],.34,.24,TUN,{seg:14});
  S.tube([0,1.74,0],[0,1.8,0],.36,.36,CREAMD,{seg:14,shine:.4});
  /* правое плечо: костяной наплечник-фугу с зелёным глазом и шипами */
  const PB=[.68,1.84,0];
  S.ell(PB,[.36,.31,.34],CREAM,{rings:8,seg:14,shine:.5});
  S.ell([.68,1.84,.0],[.38,.2,.36],CREAMD,{rings:5,seg:12,shine:.3});
  for(const dv of [[.55,.8,.1],[.95,.35,.2],[.5,.75,-.55],[.85,0,-.55],[.35,.15,-.95],[.6,.95,.35],[.15,1,0],[1,-.15,-.1],[.55,-.55,-.5],[.3,.5,-.8],[.9,.55,-.3],[.2,.9,-.4]]){
    const n=norm(dv); S.cone(add(PB,mul(n,.28)),add(PB,mul(n,.5)),.06,CREAM,{seg:5,shine:.55});
  }
  S.ell([.8,1.86,.22],[.09,.09,.06],'#6fc21e',{glow:1,rings:5,seg:10});
  S.ell([.82,1.86,.27],[.016,.07,.03],'#0b0b10',{rings:4,seg:8,shine:.7});
  S.ell([.84,1.9,.31],[.016,.016,.01],'#ffffff',{rings:3,seg:5,glow:1});
  /* левое плечо: оранжевая накидка и веер плавников */
  S.ell([-.62,1.8,0],[.27,.2,.26],ORGD,{rings:6,seg:10});
  for(let i=0;i<6;i++){ const a=i/5; S.cone([-.66-a*.04,1.88,-.04-a*.1],[-.92-a*.34,2.2+Math.sin(a*3)*.12-a*.15,-.2-a*.28],.075-a*.012,i%2?ORGL:FIND,{seg:4,shine:.35}); }
  /* хвост с плавником (чуть качается при беге) */
  const sw=Math.sin(t*3.1)*.12*(.4+P.flow);
  S.tube([0,.95,-.22],[sw*.5,.78,-.62],.12,.06,B1,{seg:8});
  S.obox([sw*.5,.78,-.6],[sw,.66,-1.06-.25*P.flow],.34,.03,FIN,{shine:.3,hint:[0,0,1]});
  for(let i=-2;i<=2;i++) S.cone([sw*.8+i*.05,.72,-.95],[sw+i*.13,.62+.04*(i%2),-1.28-.25*P.flow],.035,FIND,{seg:4});
  /* голова: капюшон, рыбья морда с клыками, фиолетовые шипы */
  const mh=S.faces.length, HP=[0,1.98,.04];
  S.tube([0,1.84,0],[0,2.0,.06],.17,.16,B1,{seg:10});
  S.ell([0,2.16,-.2],[.4,.38,.4],ORG,{rings:9,seg:16,shine:.3});           // капюшон-раковина
  S.ell([0,2.22,-.32],[.36,.32,.34],ORGD,{rings:7,seg:14,shine:.25});
  for(let i=0;i<4;i++) S.obox([0,2.5-i*.02,.12-i*.2],[0,2.42-i*.1,.04-i*.2],.07,.05,ORGD,{shine:.4,hint:[1,0,0]});
  S.ring([0,2.07,.06],.36,.06,ORGD,{axis:'z',n:22,});                          // кайма капюшона
  S.ell([0,2.03,.24],[.31,.31,.31],B1,{rings:8,seg:14,shine:.3});              // лицо
  S.ell([0,2.14,.36],[.2,.1,.2],B3,{rings:5,seg:10,shine:.3});              // светлая макушка морды
  S.ell([0,1.96,.52],[.2,.15,.27],B1,{rings:6,seg:12,shine:.3});               // верхняя челюсть
  S.ell([0,1.77,.47],[.19,.1,.27],CREAM,{rings:5,seg:12,shine:.3});           // нижняя челюсть
  S.ell([0,1.87,.52],[.15,.075,.2],'#1c070b',{rings:4,seg:10});               // пасть
  for(const s of [-1,1]){
    for(let i=0;i<7;i++){ const z=.36+i*.052, x=s*(.14-i*.013), L=(i%2?.1:.15)-i*.004;
      S.cone([x,1.94,z],[x,1.94-L,z],.022,'#f4eedd',{seg:4,shine:.7});
      S.cone([x,1.79,z],[x,1.79+L*.9,z],.022,'#f4eedd',{seg:4,shine:.7}); }
    S.cone([s*.04,1.94,.74],[s*.04,1.80,.74],.024,'#f4eedd',{seg:4,shine:.7});
    S.cone([s*.05,1.79,.72],[s*.05,1.92,.72],.024,'#f4eedd',{seg:4,shine:.7});
    S.ell([s*.15,2.08,.46],[.062,.034,.04],'#ff4d0a',{glow:1,rings:4,seg:10,rot:[0,0,s*.4]});      // узкие горящие глаза
    S.ell([s*.152,2.08,.495],[.01,.028,.012],'#0b0b10',{rings:3,seg:6,shine:.7});
    S.obox([s*.04,2.12,.52],[s*.28,2.25,.4],.075,.05,B2,{hint:[0,0,1]});                         // злое надбровье
    for(let g=0;g<3;g++) S.obox([s*.27,2.02-g*.05,.3-g*.02],[s*.3,1.99-g*.05,.2-g*.02],.012,.03,'#07101c',{hint:[0,0,1]}); // жабры
    S.cone([s*.24,2.0,.12],[s*.46,1.98,.0],.06,B3,{seg:5});                     // плавники-уши
    S.cone([s*.2,2.34,-.02],[s*.64,2.86,-.1],.075,PUR,{seg:5,shine:.55});       // фиолетовые шипы
    S.cone([s*.12,2.4,-.06],[s*.3,2.95,-.12],.045,PURL,{seg:4,shine:.6});
    S.cone([s*.26,2.28,-.04],[s*.7,2.6,-.12],.045,PUR,{seg:4,shine:.5});
  }
  S.ell([0,2.0,.72],[.035,.03,.03],B2,{rings:3,seg:6});
  xfGroup(S,mh,HP,mkRot(P.head,0,0),[0,0,.04],1.2);
  xfGroup(S,m0,PV,R,TR);
  /* руки по IK */
  const hands={};
  const arm=(s,tg)=>{
    const shd=Wp([s*.6,1.76,0]), r=ik2(shd,tg,.58,.58,[s*.5,-.2,-.8]), el=r.el, hd=r.hand, dir=norm(sub(hd,el));
    S.tube(shd,el,.14,.11,B1); S.ell(el,[.12,.12,.12],B2,{rings:5,seg:8});
    S.tube(el,hd,.11,.095,B1,{seg:9});
    if(s<0){                                                                    // рыбья голова-наруч с плавниками
      const hc=lerp(el,hd,.3);
      S.tube(lerp(el,hd,.12),lerp(el,hd,.78),.17,.12,ORG,{seg:9,shine:.4});
      S.ell(add(hc,[0,.02,.1]),[.15,.14,.2],ORGL,{rings:6,seg:10,shine:.4});
      S.ell(add(hc,[-.1,.08,.16]),[.055,.055,.04],'#ffe14a',{glow:1,rings:4,seg:8});
      S.ell(add(hc,[-.11,.08,.2]),[.022,.03,.015],'#0b0b10',{rings:3,seg:6});
      for(let i=0;i<4;i++) S.cone(add(lerp(el,hd,.2+i*.16),[-.1,.14,-.02]),add(lerp(el,hd,.12+i*.2),[-.34,.46-i*.06,-.16]),.06,i%2?FIND:ORGL,{seg:4,shine:.35});
      for(let i=0;i<3;i++) S.cone(add(hc,[.02*i-.03,-.02,.28]),add(hc,[.02*i-.03,-.12,.3]),.016,'#fffaf0',{seg:4});
    } else {
      S.tube(lerp(el,hd,.5),lerp(el,hd,.92),.13,.115,ORGD,{seg:9,shine:.35});
      S.tube(lerp(el,hd,.5),lerp(el,hd,.56),.145,.145,CREAMD,{seg:9,shine:.4});
    }
    S.ell(add(hd,mul(dir,.05)),[.105,.1,.105],B1,{rings:5,seg:8});
    let sd=cross(dir,[0,1,0]); sd=len(sd)<1e-3?[1,0,0]:norm(sd);
    for(let k=-1;k<=1;k++) S.cone(add(add(hd,mul(dir,.1)),mul(sd,k*.05)),add(add(hd,mul(dir,.24)),mul(sd,k*.07)),.022,CLAW,{seg:4,shine:.5});
    hands[s]=hd;
  };
  arm(1,P.hR); arm(-1,P.hL);
  const bp={};
  bp[1]=vsBlade(S,hands[1],P.bR,.98,P.fire,t);
  bp[-1]=vsBlade(S,hands[-1],P.bL,.98,P.fire,t);
  /* ноги: массивные бирюзово-синие, плавники на икрах, когтистые лапы */
  const leg=(s,ft)=>{
    const hip=[s*.27,.9+P.offY,P.offZ*.6], r=ik2(hip,add(ft,[0,.14,0]),.62,.6,[s*.1,.1,1]), kn=r.el, an=r.hand;
    S.ell(hip,[.25,.22,.24],B2,{rings:5,seg:9});
    S.tube(hip,kn,.23,.16,B1,{seg:10}); S.ell(kn,[.16,.17,.16],B3,{rings:5,seg:8,shine:.4});
    S.tube(kn,an,.15,.1,TEAL,{seg:9});
    S.obox(lerp(kn,an,.15),lerp(kn,an,.85),.04,.03,TEALD,{hint:[1,0,0]});
    S.obox(add(lerp(kn,an,.2),[s*.13,0,-.1]),add(lerp(kn,an,.85),[s*.3,.02,-.2]),.13,.02,FIN,{shine:.3,hint:[0,0,1]});
    for(let i=0;i<3;i++) S.cone(add(lerp(kn,an,.3+i*.2),[s*.12,0,-.1]),add(lerp(kn,an,.3+i*.2),[s*.38,.02+.04*i,-.26]),.03,FIND,{seg:4});
    S.ell(add(ft,[0,.07,.12]),[.13,.08,.22],TEAL,{rings:4,seg:8});
    for(let k=-1;k<=1;k++){ const x=k*.075;
      S.tube(add(ft,[x,.07,.2]),add(ft,[x*1.5,.05,.46]),.045,.03,TEALD,{seg:5});
      S.cone(add(ft,[x*1.5,.05,.46]),add(ft,[x*1.7,.03,.58]),.03,CREAM,{seg:4,shine:.6}); }
    S.cone(add(ft,[0,.09,-.04]),add(ft,[0,.2,-.2]),.04,CLAW,{seg:4});
  };
  leg(1,P.fR); leg(-1,P.fL);
  /* синие пузырьки: всегда поднимаются вокруг, при беге тянутся шлейфом за ногами */
  const bub=(pos,r)=>{ r*=1.7; G(S,pos,r,BUB,{glow:1}); G(S,[pos[0]+r*.3,pos[1]+r*.35,pos[2]+r*.5],r*.3,BUBH,{glow:1,rings:3,seg:5}); };
  for(let i=0;i<9;i++){ const ph=(t*.42+i/9)%1, a=i*2.4+t*.5, rr=.55+.35*Math.sin(i*1.7)+.18*ph;
    bub([Math.cos(a)*rr,.15+ph*2.5,Math.sin(a)*rr],.035+.05*Math.sin(Math.PI*ph)*(.6+.4*((i*37)%5)/5)); }
  if(P.flow>0){ for(let i=0;i<8;i++){ const ph=(t*1.5+i/8)%1;
    bub([Math.sin(i*2.3+t*2)*.28,.1+ph*.7+.04*Math.sin(i*5),-.3-ph*1.25],.03+.07*Math.sin(Math.PI*ph)); } }
  if(P.glow>.1){ for(let i=0;i<7;i++){ const ph=(t*.9+i/7)%1, a=i*.95+t*1.4;
    bub([Math.cos(a)*(.85+.25*P.glow),.2+ph*2.2,Math.sin(a)*(.85+.25*P.glow)],.05*(1-ph*.5)+.02); } }
  if(P.drain>.05){ for(let i=0;i<8;i++){ const ph=(t*1.1+i/8)%1, a=i*.8, o=1.6*(1-ph);
    G(S,[Math.cos(a)*o,1.0+.7*ph,Math.sin(a)*o+.3],.06+.03*(1-ph),i%2?VS.VIO:BUB); } }
  if(P.smoke>.03){ for(let i=0;i<14;i++){ const a=i*2.4+t, ph=(i*.137+t*.35)%1, rr=.4+1.3*P.smoke*(.4+ph*.6);
    G(S,[Math.cos(a)*rr,.35+ph*1.7,Math.sin(a)*rr],(.16+.13*(1-ph))*(.5+P.smoke*.6),i%3?'#4a86c8':'#bfe6ff',{glow:0,shine:.05}); } }
  if(P.fire>.1){ for(const s of [-1,1]) if(hands[s]) G(S,hands[s],.06+.1*P.fire,BUB); }
  if(rp.kind==='attack'&&rp.p>.38&&rp.p<.82){ const u0=cl01((rp.p-.38)/.44); for(let i=0;i<7;i++){ const u=i/6*u0, x=.95-1.4*u, y=2.1-1.3*u+.3*Math.sin(u*Math.PI), z=.1+1.2*u;
    G(S,[x,y,z],.07*(1-i/9)+.02,i%2?BUB:'#e4fbff'); } }
  if(rp.kind==='cast'&&rp.slot===1&&P.air>.15){ for(let i=1;i<=6;i++) bub([0,1.0+P.air*.5-i*.05,-.2-i*.22*P.air],.09*(1-i/8)); }
  if(d && d.skinId && String(d.skinId).split('+')[0]==='virsudiArcana') virsudiArcanaFx(S,t,bp,hands,rp,P);
};
/* 0.9.9.9: НЕОНОВАЯ аркана Вирсуди «Бездна Приливов» — неоновые клинки с белым ядром, крылья из света за спиной,
   вертикальные неон-кольца вокруг тела, светящийся круг под ногами, корона-нимб, и отдельные неон-эффекты для Q / W / R */
function virsudiArcanaFx(S,t,bp,hands,rp,P){
  const CY='#00f5ff', CYL='#c8fdff', MG='#ff2bd6', MGL='#ff9cf0', VI='#9b5cff', WH='#ffffff';
  rp=rp||{}; P=P||{};
  const kind=rp.kind, slot=rp.slot|0, pp=rp.p||0;
  const cast=kind==='cast', atk=kind==='attack', walk=kind==='walk';
  const pulse=.5+.5*Math.sin(t*6);
  /* --- неоновые клинки: широкое цветное свечение + белое раскалённое ядро + искры на кончике --- */
  for(const s of [-1,1]){
    const pt=bp&&bp[s]; if(!pt) continue;
    for(let i=0;i<7;i++){
      const u=.1+i/7*.9, f=Math.sin(t*8+i*1.7+s)*.5+.5, p=pt(u);
      G(S,[p[0],p[1]+.04,p[2]],.085+.04*f,i%2?CY:MG,{glow:1,shine:0});      // цветная неоновая кайма
      G(S,[p[0],p[1]+.04,p[2]],.04+.02*f,WH,{glow:1,shine:0});               // белая сердцевина
    }
    const tip=pt(1);
    G(S,tip,.14+.04*Math.sin(t*10+s),CYL);
    G(S,tip,.07,WH);
    if(atk||cast){                                                           // «хвост» света за клинком при ударе и касте
      for(let i=1;i<=6;i++){ const q=pt(1-i*.12); G(S,[q[0],q[1]-.05*i,q[2]-.06*i],.1*(1-i/8),i%2?MG:CY,{glow:1,shine:0}); }
    }
  }
  /* --- нимб-корона из неона --- */
  for(let i=0;i<7;i++){
    const a=i/7*Math.PI*2+t*.5, r=.24, f=Math.sin(t*5+i*2.1)*.5+.5, bx=Math.cos(a)*r, bz=Math.sin(a)*r-.1;
    S.cone([bx,2.7,bz],[bx*.4,2.98+f*.32+(i%2)*.14,bz*.4-.04],.075,i%2?CY:MG,{seg:6,glow:1,shine:0});
  }
  S.ring([0,2.72,-.1],.34,.018,CY,{glow:1,n:18,phase:t*1.2});
  S.ring([0,2.8,-.1],.26,.014,MG,{glow:1,n:16,phase:-t*1.6});
  G(S,[0,2.8,-.1],.15+.03*Math.sin(t*4),WH);
  /* --- неоновые «крылья» из света за спиной --- */
  const wingSpread=1+(walk?.15:0)+(cast?.35:0);
  for(const s of [-1,1]){
    for(let i=0;i<5;i++){
      const f=Math.sin(t*3.2+i*1.1+s)*.08, k=i/4;
      const base=[s*.22,1.75-i*.04,-.3];
      const tip=[s*(.75+k*.95)*wingSpread,2.55-i*.28+f*2,-.75-k*.35];
      S.cone(base,tip,.055,i%2?CY:MG,{seg:4,glow:1,shine:0});
      G(S,tip,.06+.02*pulse,i%2?CYL:MGL);
    }
  }
  /* --- вертикальные неон-кольца вокруг тела --- */
  const amp=1+(cast?.35:0);
  S.ring([0,1.55,0],1.05*amp,.026,CY,{glow:1,n:26,axis:'x',phase:t*1.3});
  S.ring([0,1.55,0],1.2*amp,.022,MG,{glow:1,n:26,axis:'z',phase:-t*1.1});
  S.ring([0,1.55,0],1.34*amp,.014,VI,{glow:1,n:22,axis:'x',phase:t*.7+1});
  /* --- светящийся круг под ногами --- */
  S.ring([0,.05,0],1.0,.03,CY,{glow:1,n:28,phase:t*.8});
  S.ring([0,.06,0],1.25,.02,MG,{glow:1,n:28,phase:-t*.6});
  for(let i=0;i<10;i++){                                                    // неоновые огни по кругу
    const a=i/10*Math.PI*2+t*1.4, r=.78+.1*Math.sin(t*3+i);
    G(S,[Math.cos(a)*r,.12+.05*Math.sin(t*4+i),Math.sin(a)*r],.055+.02*Math.sin(t*5+i),i%3===0?WH:(i%2?MG:CY));
  }
  /* --- поднимающиеся неоновые искры --- */
  for(let i=0;i<8;i++){
    const ph=(t*.55+i/8)%1, a=i*2.4+t*.6;
    G(S,[Math.cos(a)*.65,.3+ph*2.5,Math.sin(a)*.55],.04*(1-ph)+.014,i%3===0?WH:(i%2?MG:CYL));
  }
  /* --- отдельные неон-эффекты скиллов --- */
  if(cast&&slot===0){                                                       // Q «Отдай сдачу» — расходящиеся неон-волны
    for(let i=0;i<3;i++){ const u=(pp*1.6+i*.3)%1;
      S.ring([0,.1+i*.02,0],.6+u*2.6,.04*(1-u)+.012,i%2?MG:CY,{glow:1,n:30,phase:t*2}); }
  }
  if(cast&&slot===1){                                                       // W «Прыжок» — неоновый шлейф
    for(let i=1;i<=10;i++){ G(S,[Math.sin(i*1.9+t*9)*.18,.5+i*.05,-.15-i*.2],.16*(1-i/12),i%2?CY:MG,{glow:1,shine:0}); }
  }
  if(cast&&slot===3){                                                       // R «Изгойствоудий» — неоновый «призрак»
    for(let i=0;i<4;i++){ const a=t*3+i*Math.PI/2, r=.9+.25*Math.sin(t*5+i);
      S.ring([0,.4+i*.55,0],r,.02,i%2?MG:CY,{glow:1,n:20,phase:a}); }
    for(let i=0;i<10;i++){ const a=t*4+i*.63; G(S,[Math.cos(a)*.7,.2+((t*1.4+i/10)%1)*2.4,Math.sin(a)*.7],.05,WH); }
  }
}
ANIM.virsudi=[{kind:'attack',p:.3},{kind:'attack',p:.5},{kind:'attack',p:.7},{kind:'walk',p:.25},{kind:'walk',p:.75},
  {kind:'cast',slot:0,p:.5},{kind:'cast',slot:0,p:.93},{kind:'cast',slot:0,p:1},{kind:'cast',slot:1,p:.5},{kind:'cast',slot:1,p:.64},
  {kind:'cast',slot:2,p:.4},{kind:'cast',slot:2,p:.6},{kind:'cast',slot:3,p:.35},{kind:'cast',slot:3,p:.7}];


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
    AXC={cur:{R:ga.R,L:ga.L},idle:cfg.idle,b:cfg.b,shY:cfg.shY,ga};
    const m0=S.faces.length;
    try{ orig(S,d,t,pose); } finally { AXC=null; }
    gaFx(S,ga);
    if(cfg.post) cfg.post(S,ga,m0);
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
/* Джувсют: свои позы (дубина, таран, «сало-щит», разбег, «Большой обед») */
const JV_ST={
  club:I=>[[.286,[.8,2.3,-.35],[-.6,1.5,.3],E_out],[.429,[.65,1.7,.5],[-.5,1.35,.6],E_in],[.571,[.45,1.0,1.25],[-.45,1.2,.9],E_in],[.714,[.6,1.2,.9],[-.5,1.25,.7],E_out]],
  ram:I=>[[.143,[.95,1.05,-.5],[-.95,1.05,-.5],E_out],[.286,[1.0,1.0,-.6],[-1.0,1.0,-.6],E_lin],[.429,[.7,1.35,1.2],[-.7,1.35,1.2],E_in],[.571,[.6,1.4,1.05],[-.6,1.4,1.05],E_out],[.78,[.6,1.3,.85],[-.6,1.3,.85],E_lin]],
  flex:I=>[[.143,[.7,1.0,.65],[-.7,1.0,.65],E_out],[.286,[1.15,1.95,.1],[-1.15,1.95,.1],E_out],[.429,[1.05,2.05,.2],[-1.05,2.05,.2],E_io],[.571,[1.15,1.95,.1],[-1.15,1.95,.1],E_io],[.78,[1.1,1.9,.15],[-1.1,1.9,.15],E_lin]],
  pound:I=>[[.143,[1.0,1.7,.4],[-1.0,1.7,.4],E_out],[.286,[.25,1.45,.72],[-.25,1.45,.72],E_in],[.429,[1.0,1.7,.4],[-1.0,1.7,.4],E_out],[.571,[.25,1.45,.72],[-.25,1.45,.72],E_in],[.714,[.8,1.15,-.55],[-.8,1.15,-.55],E_out],[.857,[.7,1.3,.95],[-.7,1.15,-.35],E_in]],
  feast:I=>[[.143,[.55,1.9,0],[-1.3,1.8,.1],E_out],[.286,[.9,.55,.85],[-.5,.85,1.3],E_in],[.429,[.45,.8,1.3],[-.45,.8,1.3],E_out],[.571,[.26,1.95,.6],[-.26,1.95,.6],E_io],[.714,[.6,1.2,.7],[-.3,1.1,.8],E_io],[.857,[.9,.55,.85],[-.5,1.25,.85],E_io]]
};
function jvPost(S,ga,m0){
  const p=ga.p, k=ga.kind, sl=ga.slot==null?0:(((ga.slot|0)%4)+4)%4;
  let rx=0, ry=0, rz=0;
  if(k==='walk'){ const ph=p*Math.PI*2; rz=Math.sin(ph)*.035; ry=Math.sin(ph)*.05; }
  else if(k==='attack') rx=-.07*bell(p,.286,.12)+.11*bell(p,.58,.12);
  else if(k==='cast'){
    if(sl===0) rx=-.06*bell(p,.2,.1)+.14*bell(p,.5,.14);
    else if(sl===1) rx=-.05*bell(p,.43,.2);
    else if(sl===2) rx=-.03*bell(p,.2,.1)+.12*bell(p,.78,.12);
    else rx=-.09*bell(p,.143,.08)+.08*bell(p,.36,.1)-.1*bell(p,.571,.08)-.05*bell(p,.714,.06);
  }
  if(!rx&&!ry&&!rz) return;
  const kk=S.sc, pv=[0,.25*kk,0], R=[rx,ry,rz];
  for(let i=m0;i<S.faces.length;i++){
    const f=S.faces[i], mv=q=>add(rotEuler(sub(q,pv),R),pv);
    f.p=f.p.map(mv); f.c=mv(f.c);
    if(f.nm) f.nm=rotEuler(f.nm,R);
    if(f.vn) f.vn=f.vn.map(v=>rotEuler(v,R));
  }
}
autoAnim('juvsyut',   {walkArm:.1, att:JV_ST.club, hit:.58, casts:[JV_ST.ram,JV_ST.flex,JV_ST.pound,JV_ST.feast], rings:[0,1,2,3], ringR:1.6, hands:'R', trailOff:[0,.5,0], col:['#ffd568','#fff3b0'], post:jvPost});
autoAnim('savely',    {walkArm:.1, att:'punch',  hit:.5, casts:['guard','raise','throw','raise'], rings:[1,3], ringR:1.6, hands:'R', trail:'none', col:['#ffcc66','#fff3c4']});
autoAnim('juggernaut',{walkArm:.1, att:'slashR', hit:.5, casts:['whirl','lup','sweep','flurry'], rings:[0,3], ringR:1.35, hands:'R', trailOff:[0,.9,.2], col:['#ffe7a2','#ffffff']});
autoAnim('sniper',    {walkArm:.05,att:'recoil', hit:.4, ranged:1, casts:['throw','recoil','aim','bigrecoil'], rings:[2], ringR:1.2, hands:'R', trail:'none', col:['#ffd27a','#fff3c4']});

/* ---------- Олекс — боец-программист (0.9.8: ноутбук, печать, анимации под каждый скилл) ---------- */
const OL={CY:'#39e6ff',CYL:'#aef6ff',BL:'#4aa8ff',GR:'#7fff9a',HOOD:'#16233d',HOODD:'#0d1628',DARK:'#0b1020',SK:'#e8b894',HAIR:'#2a1c14'};
const olKb=(C,pit,x,z,y)=>add(C,rotEuler([x,y==null?.07:y,z],[pit,0,0]));
function olPose(rp,t0){
  const t=t0+(rp.p||0)*5;   /* фаза печати зависит от кадра анимации */
  const k=rp.kind, p=rp.p||0, sl=rp.slot|0, br=Math.sin(t*1.6);
  const P={C:[-.1,1.2+.012*br,.52],pit:.2,phi:1.75,hR:null,hL:null,lean:0,type:.35,flash:0,holo:1,fx:0,k,p,sl,
    off:[0,0,0],cable:1,ghost:0,rise:0};
  const typeR=(am,sp)=>{ const q=t*(sp||12); return olKb(P.C,P.pit,.14+.1*Math.sin(q*.7)*am,-.02+.07*Math.cos(q*.9)*am,.07+.035*am*Math.abs(Math.sin(q))); };
  const typeL=(am,sp)=>{ const q=t*(sp||12)+1.7; return olKb(P.C,P.pit,-.16+.1*Math.sin(q*.8)*am,-.01+.06*Math.cos(q)*am,.07+.03*am*Math.abs(Math.sin(q*1.1))); };
  const cradleL=()=>add(P.C,rotEuler([-.3,-.1,-.02],[P.pit,0,0]));
  const walkLike=()=>{ P.hR=typeR(P.type,10); P.hL=cradleL(); };
  if(k==='walk'){
    const ph=p*Math.PI*2;
    P.C=[-.1,1.2+.035*Math.abs(Math.sin(ph))-.0,.5+.02*Math.sin(ph)]; P.pit=.2+.02*Math.sin(ph*2); P.lean=.07; P.type=.55;
    walkLike();
  } else if(k==='attack'){
    /* замах: ноут вперёд, руки взлетают → бешеная печать → удар по Enter → сгусток кода летит вперёд */
    P.lean=RK(p,[[0,0],[.3,-.03],[.5,.16,E_in],[.8,.06],[1,0]]);
    P.C=RK(p,[[0,P.C],[.25,[0,1.38,.6]],[.5,[0,1.4,.66]],[.62,[0,1.4,.8],E_in],[1,P.C]]);
    P.pit=RK(p,[[0,.2],[.3,.38],[.62,.3],[1,.2]]);
    P.phi=RK(p,[[0,1.75],[.3,1.9],[1,1.75]]);
    P.type=RK(p,[[0,.4],[.2,1],[.48,1],[.6,.2],[1,.4]]);
    P.hL=olKb(P.C,P.pit,-.18+.06*Math.sin(t*20),.0,.08+.03*Math.abs(Math.sin(t*23)));
    if(p<.22){ P.hR=RK(p,[[0,typeR(.4,10)],[.22,[.55,1.95,.5]]]); P.hL=RK(p,[[0,cradleL()],[.22,P.hL]]); }
    else if(p<.5) P.hR=olKb(P.C,P.pit,.15+.1*Math.sin(t*22),-.02+.06*Math.cos(t*25),.07+.04*Math.abs(Math.sin(t*26)));
    else P.hR=RK(p,[[.5,olKb(P.C,P.pit,.2,-.04,.2)],[.56,olKb(P.C,P.pit,.24,-.06,.03),E_in],[.8,olKb(P.C,P.pit,.2,-.02,.14)],[1,typeR(.4,10)]]);
    P.flash=bell(p,.58,.09); P.fx=p>.55&&p<.95?(p-.55)/.4:0;
  } else if(k==='cast'&&sl===0){
    /* Q — «Строка кода»: ноут к цели, быстрая печать, Enter, луч символов */
    P.lean=RK(p,[[0,0],[.35,-.02],[.55,.14],[1,0]]);
    P.C=RK(p,[[0,P.C],[.3,[0,1.42,.7]],[.7,[0,1.42,.78]],[1,P.C]]); P.pit=RK(p,[[0,.2],[.3,.34],[1,.2]]); P.phi=1.9;
    P.type=RK(p,[[0,.4],[.2,1],[.45,1],[.55,.1],[1,.4]]);
    P.hL=olKb(P.C,P.pit,-.2,.0,.09);
    P.hR=p<.5?olKb(P.C,P.pit,.15+.1*Math.sin(t*24),-.02+.06*Math.cos(t*27),.07+.04*Math.abs(Math.sin(t*26))):RK(p,[[.5,olKb(P.C,P.pit,.2,-.04,.2)],[.56,olKb(P.C,P.pit,.24,-.06,.03),E_in],[.85,olKb(P.C,P.pit,.2,-.02,.14)],[1,typeR(.4,10)]]);
    P.flash=bell(p,.56,.08); P.fx=p>.52?cl01((p-.52)/.4):0;
  } else if(k==='cast'&&sl===1){
    /* W — «Вирус / Патч»: ноут на правой руке, левая выбрасывает руны вперёд */
    P.lean=RK(p,[[0,0],[.45,.1],[1,0]]);
    P.C=RK(p,[[0,P.C],[.25,[.32,1.2,.46]],[.8,[.32,1.2,.46]],[1,P.C]]); P.pit=.2; P.phi=1.8;
    P.hR=olKb(P.C,P.pit,.0,.1,-.06);
    P.hL=RK(p,[[0,cradleL()],[.35,[-.55,1.75,.55]],[.55,[-.4,1.62,1.25],E_in],[.85,[-.4,1.6,1.2]],[1,cradleL()]]);
    P.type=.2; P.flash=bell(p,.56,.1); P.fx=p>.5?cl01((p-.5)/.45):0;
  } else if(k==='cast'&&sl===2){
    /* E — «Авто-турель»: приседает, ставит ноут на землю, печатает — над ним вырастает голограмма-турель */
    P.lean=RK(p,[[0,0],[.3,.3],[.8,.3],[1,0]]);
    P.C=RK(p,[[0,P.C],[.3,[0,.16,.95]],[.85,[0,.16,.95]],[1,P.C]]); P.pit=RK(p,[[0,.2],[.3,.04],[.85,.04],[1,.2]]); P.phi=1.75; P.holo=0;
    P.hR=olKb(P.C,P.pit,.14+.1*Math.sin(t*22),-.02+.05*Math.cos(t*25),.07+.04*Math.abs(Math.sin(t*26)));
    P.hL=olKb(P.C,P.pit,-.16+.1*Math.sin(t*20+1),-.01+.05*Math.cos(t*23),.07+.04*Math.abs(Math.sin(t*28)));
    P.type=1; P.flash=bell(p,.6,.1); P.fx=cl01((p-.3)/.45); P.cable=0;
  } else if(k==='cast'&&sl===3){
    /* R — «Синий экран смерти»: ноут над головой, огромный синий экран, кольцо кода по земле */
    P.lean=RK(p,[[0,0],[.35,-.14],[.75,-.1],[1,0]]);
    P.C=RK(p,[[0,P.C],[.38,[0,2.62,.12]],[.85,[0,2.62,.12]],[1,P.C]]); P.pit=RK(p,[[0,.2],[.38,-.35],[.85,-.35],[1,.2]]); P.phi=RK(p,[[0,1.75],[.4,1.95],[1,1.75]]);
    P.hR=olKb(P.C,P.pit,.3,.0,-.08); P.hL=olKb(P.C,P.pit,-.3,.0,-.08);
    P.type=0; P.holo=0; P.flash=bell(p,.55,.12); P.fx=cl01((p-.3)/.4); P.cable=0;
  } else if(k==='cast'&&sl===4){
    /* T — «Отладка»: ноут закрыт и прижат к боку, рывок вперёд со шлейфом */
    P.lean=RK(p,[[0,0],[.3,.28],[.7,.34],[1,0]]);
    P.C=RK(p,[[0,P.C],[.25,[-.44,1.12,.02]],[.8,[-.44,1.12,.02]],[1,P.C]]); P.pit=RK(p,[[0,.2],[.25,1.5],[.8,1.5],[1,.2]]); P.phi=RK(p,[[0,1.75],[.25,.12],[.8,.12],[1,1.75]]);
    P.hL=RK(p,[[0,cradleL()],[.25,[-.5,1.1,.3]],[.8,[-.5,1.1,.3]],[1,cradleL()]]);
    P.hR=RK(p,[[0,typeR(.4,10)],[.3,[.55,1.5,.95]],[.7,[.5,1.4,.9]],[1,typeR(.4,10)]]);
    P.type=0; P.holo=0; P.flash=bell(p,.35,.12); P.ghost=bell(p,.5,.28); P.cable=0; P.fx=cl01(p/.6);
  } else {
    P.type=.45; walkLike();
  }
  if(!P.hR||!P.hL) walkLike();
  return P;
}
/* ноутбук: основание + откидная крышка; снаружи светится знак, внутри — экран */
function olLaptop(S,C,pit,phi,t,P){
  const BASE='#2a3550', LID='#1c2640', W=.66, D=.46;
  S.box(C,[W,.04,D],BASE,{rot:[pit,0,0],shine:.5});
  S.box(add(C,rotEuler([0,.022,-.02],[pit,0,0])),[W*.9,.01,D*.62],'#0e1526',{rot:[pit,0,0]});            // клавиатура
  for(let i=0;i<4;i++) S.box(add(C,rotEuler([0,.03,-.14+i*.06],[pit,0,0])),[W*.82,.008,.028],i%2?'#46557c':'#3a4668',{rot:[pit,0,0]});
  S.box(add(C,rotEuler([0,.026,.14],[pit,0,0])),[.2,.006,.08],'#1a2238',{rot:[pit,0,0]});                    // тачпад
  S.box(add(C,rotEuler([-W/2+.01,.0,0],[pit,0,0])),[.02,.03,D*.9],P&&P.k==='cast'?OL.CY:'#39e6ff',{rot:[pit,0,0],glow:1}); // неоновая кромка
  const hinge=add(C,rotEuler([0,.02,D/2-.01],[pit,0,0])), th=phi-Math.PI, d=[0,Math.sin(phi),-Math.cos(phi)];
  const dir=rotEuler(d,[pit,0,0]), lc=add(hinge,mul(dir,D/2));
  /* внутренняя нормаль (экран смотрит на героя): */
  const inn=norm(rotEuler([0,-Math.cos(phi),-Math.sin(phi)],[pit,0,0])), out=mul(inn,-1);
  S.box(lc,[W,.035,D],LID,{rot:[pit+th,0,0],shine:.5});
  if(phi>.4){
    const sc=add(lc,mul(inn,.022));
    const fl=P?P.flash:0;
    S.box(sc,[W*.9,.008,D*.86],fl>.2?'#e8ffff':'#0c2c52',{rot:[pit+th,0,0],glow:1});
    for(let i=0;i<5;i++){ const w=.14+((i*53+Math.floor(t*2))%5)*.07, along=D*.2+i*.07;
      S.box(add(add(hinge,mul(dir,along)),mul(inn,.03)),[w,.006,.022],i%2?OL.CYL:OL.CY,{rot:[pit+th,0,0],glow:1}); }
    const lg=add(lc,mul(out,.022));
    S.ell(lg,[.07,.07,.012],OL.CY,{glow:1,rings:4,seg:10,rot:[pit+th+Math.PI/2,0,0]});
  }
  return {lid:lc,inn,out,hinge,dir};
}
function olHolo(S,pos,w,h,t,col,mode,sc){
  sc=sc==null?1:sc; if(sc<.02) return;
  const W=w*sc,H=h*sc;
  S.box(pos,[W,H,.02],mode==='bsod'?'#06197a':'#0a2a4a',{glow:mode==='bsod'?0:1,shine:.3});
  S.box(add(pos,[0,0,.012]),[W*.96,H*.94,.008],mode==='bsod'?'#0b2fb4':'#0f3d66',{glow:mode==='bsod'?0:1,shine:.2});
  S.box(add(pos,[0,H*.5,0]),[W*1.04,.02*sc,.03],col,{glow:1}); S.box(add(pos,[0,-H*.5,0]),[W*1.04,.02*sc,.03],col,{glow:1});
  S.box(add(pos,[-W*.5,0,0]),[.02*sc,H,.03],col,{glow:1}); S.box(add(pos,[W*.5,0,0]),[.02*sc,H,.03],col,{glow:1});
  if(mode==='bsod'){
    /* грустный смайлик «:(» и строки текста */
    S.box(add(pos,[-W*.28,H*.18,.02]),[W*.05,H*.14,.01],'#f4fbff',{glow:1}); S.box(add(pos,[-W*.12,H*.18,.02]),[W*.05,H*.14,.01],'#f4fbff',{glow:1});
    S.box(add(pos,[-W*.2,H*.0,.02]),[W*.2,H*.04,.01],'#f4fbff',{glow:1,rot:[0,0,.0]});
    S.box(add(pos,[-W*.31,H*-.04,.02]),[W*.04,H*.1,.01],'#f4fbff',{glow:1}); S.box(add(pos,[-W*.09,H*-.04,.02]),[W*.04,H*.1,.01],'#f4fbff',{glow:1});
    for(let i=0;i<4;i++) S.box(add(pos,[-W*.12+((i*37)%3)*W*.04,-H*(.22+i*.1),.02]),[W*(.56-((i*29)%4)*.08),H*.04,.01],'#cfe6ff',{glow:1});
  } else {
    for(let i=0;i<6;i++){ const ww=W*(.25+((i*37+Math.floor(t*3+i))%5)*.12), sh=((t*.8+i*.17)%1);
      S.box(add(pos,[-W*.42+ww/2,H*.38-i*H*.14,.016]),[ww,H*.05,.008],i%3===0?OL.GR:(i%2?OL.CYL:OL.CY),{glow:1}); }
  }
}
MODELS.olex=(S,d,t,pose)=>{
  const {CY,CYL,BL,GR,HOOD,HOODD,DARK,SK,HAIR}=OL;
  const rp=rigResolve(pose,t,'ol',5), P=olPose(rp,t);
  const m0=S.faces.length;
  man(S,{face:true,cloth:HOOD,arm:HOOD,forearm:HOOD,legs:'#1a2236',boots:'#f2f4fa',toe:CY,belt:DARK,nopouch:true,trim:CY,cuff:CY,skin:SK,hair:HAIR,fringe:HAIR,
    glove:'#2a3550',bracer:CY,knee:'#26334f',armR:P.hR,armL:P.hL,walk:rp.kind==='walk'?rp.p*Math.PI*2:null,
    fo:{eye:'#2a3a5a',angry:0,mouth:'smile',brow:HAIR}});
  /* капюшон: объёмный, с неоновой каймой */
  S.ell([0,2.0,-.14],[.36,.3,.34],HOOD,{rings:8,seg:16});
  S.ell([0,2.2,-.06],[.3,.14,.3],HOOD,{rings:5,seg:12});
  S.ring([0,2.0,.1],.31,.022,CY,{axis:'z',n:22,glow:1});
  S.tube([-.31,1.82,.06],[-.31,1.66,.12],.035,.03,CY,{glow:1,seg:6}); S.tube([.31,1.82,.06],[.31,1.66,.12],.035,.03,CY,{glow:1,seg:6});
  /* наушники с неоном */
  S.tube([-.31,2.03,0],[.31,2.03,0],.05,.05,DARK,{seg:8});
  for(const s of [-1,1]){ S.ell([s*.31,2.0,0],[.085,.16,.16],DARK,{rings:5,seg:10,shine:.5}); S.ell([s*.365,2.0,0],[.025,.1,.1],CY,{glow:1,rings:4,seg:8});
    S.tube([s*.33,1.93,.1],[s*.2,1.82,.26],.012,.012,CY,{glow:1,seg:4}); S.ell([s*.19,1.82,.27],[.03,.03,.03],CYL,{glow:1,rings:3,seg:6}); }
  /* AR-очки: рамка и светящиеся стёкла, в стёклах бегут строки */
  S.box([0,2.04,.28],[.5,.12,.045],DARK,{shine:.7});
  for(const s of [-1,1]){ S.box([s*.12,2.04,.30],[.2,.085,.02],'#0f4a78',{glow:1}); S.box([s*.12,2.05+.015*Math.sin(t*5+s),.315],[.15,.012,.01],CYL,{glow:1}); }
  S.box([0,2.04,.31],[.04,.05,.02],CY,{glow:1});
  /* худи: логотип, шнурки, карман, схемы на плечах и рукавах */
  S.box([0,1.28,.345],[.52,.2,.05],HOODD);
  S.tube([-.08,1.58,.33],[-.08,1.4,.39],.014,.014,CYL,{seg:4}); S.tube([.08,1.58,.33],[.08,1.4,.39],.014,.014,CYL,{seg:4});
  S.ell([-.08,1.39,.39],[.02,.02,.02],CY,{glow:1,rings:3,seg:6}); S.ell([.08,1.39,.39],[.02,.02,.02],CY,{glow:1,rings:3,seg:6});
  S.box([.2,1.5,.36],[.14,.1,.02],CY,{glow:1,shine:.7}); S.box([.2,1.5,.375],[.09,.03,.01],DARK);
  for(const s of [-1,1]){ S.box([s*.3,1.62,.3],[.012,.22,.01],CY,{glow:1,rot:[0,0,s*.5]}); S.box([s*.46,1.45,.1],[.012,.3,.012],CY,{glow:1,rot:[.1,0,s*.12]}); }
  /* бейдж на шнурке */
  S.tube([-.12,1.7,.3],[0,1.38,.4],.008,.008,CY,{glow:1,seg:3}); S.tube([.12,1.7,.3],[0,1.38,.4],.008,.008,CY,{glow:1,seg:3});
  S.box([0,1.31,.4],[.12,.15,.012],'#e8f4ff',{shine:.6}); S.box([0,1.33,.41],[.07,.03,.006],CY,{glow:1});
  /* штаны: неоновые лампасы */
  for(const s of [-1,1]) S.box([s*.35,.7,.04],[.014,.55,.02],CY,{glow:1,shine:.5});
  /* рюкзак с мини-сервером, вентилятором и антенной */
  S.box([0,1.5,-.46],[.68,.88,.3],DARK);
  S.box([0,1.5,-.62],[.6,.78,.03],'#18223a');
  for(let i=0;i<4;i++){ S.box([0,1.18+i*.2,-.64],[.5,.05,.02],CY,{glow:(Math.floor(t*3)+i)%2===0?1:0}); }
  S.ell([0,1.62,-.65],[.17,.17,.03],'#222a3a',{rings:5,seg:12});
  for(let i=0;i<3;i++){ const a=t*9+i*2.094; S.tube([0,1.62,-.67],[Math.cos(a)*.15,1.62+Math.sin(a)*.15,-.67],.015,.015,CYL,{seg:4}); }
  S.tube([-.22,1.95,-.46],[-.22,2.5,-.46],.025,.025,CYL,{glow:1,seg:5});
  S.ell([-.22,2.53,-.46],[.05,.05,.05],Math.sin(t*6)>0?'#ff4b4b':'#7a1f1f',{glow:1,rings:4,seg:6});
  S.tube([.2,1.95,-.46],[.28,2.3,-.46],.02,.02,CY,{glow:1,seg:5});
  for(const s of [-1,1]) S.tube([s*.3,1.82,-.2],[s*.3,1.3,-.34],.025,.025,'#0e1526',{seg:5});
  /* ноутбук и кабель от рюкзака */
  const L=olLaptop(S,P.C,P.pit,P.phi,t,P);
  if(P.cable>0){
    const a=[.3,1.28,-.36], b=[.62,1.05,.0], c=add(P.C,rotEuler([.3,0,.12],[P.pit,0,0]));
    let prev=a; for(let i=1;i<=6;i++){ const u=i/6, q=add(add(mul(a,(1-u)*(1-u)),mul(b,2*u*(1-u))),mul(c,u*u)); S.tube(prev,q,.014,.014,CY,{glow:1,seg:4}); prev=q; }
  }
  /* голографический экран над ноутом, повёрнут к зрителю */
  if(P.holo>0){ const hy=P.C[1]+.62+Math.sin(t*2)*.03; olHolo(S,[P.C[0]+.92,hy+.45,P.C[2]-.05],.56,.34,t,CY,'code',P.holo*(rp.kind==='attack'||rp.kind==='cast'?1.15:1)); }
  /* пальцы-искры при печати */
  if(P.type>.5){ for(let i=0;i<3;i++){ const q=(t*5+i/3)%1; G(S,add(olKb(P.C,P.pit,.0+i*.14,-.04,.1),[0,q*.25,q*.1]),.022*(1-q),i%2?CYL:CY); } }
  /* общий наклон корпуса */
  if(P.lean) xfGroup(S,m0,[0,0,0],mkRot(P.lean,0,0),[0,0,0]);
  /* ---- эффекты способностей ---- */
  const fwd=(z,y,x)=>{ const R=mkRot(P.lean,0,0); return R([x||0,y,z]); };
  const k=rp.kind, sl=rp.slot|0;
  if(k==='attack'||(k==='cast'&&sl===0)){
    if(P.fx>0){ const n=7; for(let i=0;i<n;i++){ const u=P.fx*1.3-i*.09; if(u<0||u>1) continue; const z=.95+u*3.6;
      const col=i%2?CYL:CY, w=.2*(1-u*.4);
      S.box(fwd(z,1.5+.05*Math.sin(i*3+t*20)),[w,w*.6,.04],col,{glow:1,rot:[0,0,u*3+i]});
      if(i===0) G(S,fwd(z,1.5),.1,'#ffffff'); } }
    if(P.flash>.2) G(S,fwd(.95,1.52),.16*P.flash,'#e8ffff');
  }
  if(k==='cast'&&sl===1&&P.fx>0){
    const u=P.fx;
    for(let i=0;i<14;i++){ const a=i*.9+t*6, r=.12+u*.35, z=1.2+u*1.9*((i%5)/5+.35);
      S.box(fwd(z,1.6+Math.sin(a)*r,-.4+Math.cos(a)*r),[.07,.07,.02],i%2?GR:CY,{glow:1,rot:[0,0,a]}); }
    floorFx(S,()=>{ S.ring([0,.015,0],.9*u+.2,.03,GR,{glow:1,n:30}); });
    G(S,[-.4,1.6,1.22],.1+.12*P.flash,GR);
  }
  if(k==='cast'&&sl===2){
    const u=P.fx, tx=P.C[0], tz=P.C[2]+.05;
    if(u>0){ const g=E_out(u), y0=.28;
      S.ell([tx,y0+.06,tz],[.2*g,.07*g,.2*g],'#25345a',{glow:0,rings:4,seg:12});
      S.box([tx,y0+.2*g,tz],[.2*g,.2*g,.2*g],'#2c3d68',{glow:0,shine:.5});
      S.ell([tx,y0+.42*g,tz],[.13*g,.1*g,.13*g],CY,{glow:1,rings:4,seg:10});
      S.tube([tx,y0+.42*g,tz],[tx,y0+.46*g,tz+.45*g],.03*g,.022*g,CYL,{glow:1,seg:6});
      for(let i=0;i<6;i++){ const a=i/6*Math.PI*2+t*3; S.box([tx+Math.cos(a)*.3*g,y0+.05+((t*1.5+i/6)%1)*.5,tz+Math.sin(a)*.3*g],[.04,.04,.01],i%2?CYL:CY,{glow:1,rot:[0,a,0]}); }
      floorFx(S,()=>{ S.ring([tx,.015,tz],.35+.5*u,.03,CY,{glow:1,n:26}); }); }
  }
  if(k==='cast'&&sl===3){
    const u=P.fx, sc=E_out(u);
    olHolo(S,fwd(.6,3.7,0),1.9,1.1,t,BL,'bsod',sc);
    floorFx(S,()=>{ for(const j of [0,.15]){ const q=cl01(u-j); S.ring([0,.015,0],.4+2.2*q,.05*(1-q*.6)+.015,j?BL:CYL,{glow:1,n:44}); } });
    for(let i=0;i<22;i++){ const a=i*2.4+.5, rr=.8+((i*37)%7)*.28, ph=(t*1.1+i*.173)%1;
      if(u<.15) continue; S.box([Math.cos(a)*rr,3.3-ph*3.2,Math.sin(a)*rr],[.05,.1,.02],i%3?BL:CYL,{glow:1}); }
    G(S,fwd(.12,2.7,0),.22*P.flash+.06*u,'#cfe6ff');
  }
  if(k==='cast'&&sl===4){
    const g=P.ghost;
    if(g>.03){ for(let i=1;i<=7;i++){ const z=-.25-i*.4*g, a=(1-i/8)*g;
      S.box([0,1.5-i*.04,z],[.16*a+.03,.55*a+.06,.03],i%2?CY:CYL,{glow:1}); S.box([0,.7,z],[.14*a+.03,.5*a+.06,.03],CY,{glow:1}); } }
    G(S,[.5,1.5,.95],.1+.14*P.flash,CYL);
    floorFx(S,()=>{ S.ring([0,.015,0],.5+.7*P.fx,.04,CY,{glow:1,n:24}); });
    for(let i=0;i<10;i++){ const q=(t*2+i/10)%1; S.box([Math.sin(i*5)*.4,.2+q*1.6,-.2-q*1.2*g],[.05,.05,.02],i%2?CYL:CY,{glow:1}); }
  }
  /* парящие символы кода вокруг: в бою вращаются быстрее */
  const hot=rp.kind==='idle'||rp.kind==='walk'?1:1.8;
  for(let i=0;i<5;i++){ const a=t*1.2*hot+i*1.256, r=1.1+.05*Math.sin(t*2+i); S.box([Math.cos(a)*r,1.1+Math.sin(t*1.7+i)*.25+i*.14,Math.sin(a)*r],[.07,.07,.02],i%2?CY:CYL,{glow:1,rot:[0,a,0]}); }
};
ANIM.olex=[{kind:'attack',p:.3},{kind:'attack',p:.58},{kind:'walk',p:.25},{kind:'walk',p:.75},
  {kind:'cast',slot:0,p:.6},{kind:'cast',slot:1,p:.6},{kind:'cast',slot:2,p:.6},{kind:'cast',slot:3,p:.5},{kind:'cast',slot:3,p:.8},{kind:'cast',slot:4,p:.5}];

/* ---------- 0.8.8: Васпассир — худой лысый зелёный гоблин с огромными ушами и зелёным посохом с кристаллом ---------- */
const VASP_PAL={
  vaspassir:      {skin:'#6fbf4a',dark:'#3f7a2a',cloth:'#5a4426',cloth2:'#3a2c18',crystal:'#8dff5a',glow:'#c9ffa0',eye:'#ffe14a',scale:1},
  vaspassirOrange:{skin:'#e8892f',dark:'#a85a14',cloth:'#6a3a1a',cloth2:'#3a1e0c',crystal:'#ffb04a',glow:'#ffe0a0',eye:'#fff2a0',scale:.9},
  vaspassirCyan:  {skin:'#59b8ee',dark:'#2a78a8',cloth:'#24506a',cloth2:'#12303f',crystal:'#8fe8ff',glow:'#d8f8ff',eye:'#ffffff',scale:.9},
  vaspassirYellow:{skin:'#e8d23a',dark:'#a89212',cloth:'#6a5a1a',cloth2:'#3a300c',crystal:'#fff06a',glow:'#fffbc0',eye:'#ffffff',scale:.9},
  vaspassirPurple:{skin:'#a86be0',dark:'#6a3aa0',cloth:'#4a2a6a',cloth2:'#281640',crystal:'#d9a0ff',glow:'#f0d8ff',eye:'#fff0a0',scale:.9},
  vaspassirBlue:  {skin:'#4a6fe8',dark:'#2a3fa8',cloth:'#2a3a72',cloth2:'#141c3a',crystal:'#7aa0ff',glow:'#d0e0ff',eye:'#ffffff',scale:.9}
};
function vaspModel(P){
  return (S,d,t)=>{
    S.sc=P.scale;
    man(S,{face:true,bulk:.72,cloth:P.cloth,arm:P.skin,forearm:P.skin,glove:P.skin,legs:P.cloth2,skin:P.skin,
      armR:[.5,1.35,.6],armL:[-.46,1.0,.2],headY:1.95,headW:1.05,belt:P.cloth2,trim:P.dark,boots:P.cloth2,
      fo:{eye:P.eye}});
    /* лысая макушка-блик и тонкий нос */
    S.ell([0,2.2,.0],[.2,.1,.2],P.skin,{rings:5,seg:10,shine:.55});
    S.cone([0,1.93,.26],[0,1.88,.46],.05,P.dark,{seg:6});
    /* огромные уши — широкие лопасти, торчащие в стороны и назад */
    for(const s of [-1,1]){
      S.tube([s*.26,1.98,0],[s*.78,2.28,-.12],.085,.02,P.skin,{seg:8});
      S.ell([s*.58,2.17,-.07],[.2,.3,.05],P.skin,{rings:6,seg:10,rot:[0,0,s*.7]});
      S.ell([s*.56,2.15,-.04],[.12,.2,.03],P.dark,{rings:5,seg:8,rot:[0,0,s*.7]});
    }
    /* тряпичная жилетка и шнуры */
    S.ell([0,1.42,.1],[.3,.36,.2],P.cloth2,{rings:6,seg:12});
    for(let i=0;i<4;i++) S.box([-.1+i*.07,1.18,.2],[.025,.12,.02],P.dark);
    /* зелёные гранаты на поясе */
    for(const s of [-1,1]) S.ell([s*.3,.98,.22],[.07,.09,.07],'#58b83a',{rings:5,seg:8,shine:.6});
    const _h=hmark(S);
    /* посох с кристаллом в правой руке */
    S.tube([.5,.1,.62],[.5,2.55,.62],.045,.04,P.dark,{seg:8,shine:.4});
    for(const y of [.5,1.0,1.5]) S.ring([.5,y,.62],.07,.025,P.cloth2,{n:10,axis:'y'});
    S.tube([.5,2.5,.62],[.34,2.78,.62],.04,.03,P.dark,{seg:6});
    S.tube([.5,2.5,.62],[.66,2.78,.62],.04,.03,P.dark,{seg:6});
    S.ell([.5,2.78,.62],[.13,.2,.13],P.crystal,{glow:1,rings:6,seg:10,shine:.9});
    S.ell([.48,2.82,.66],[.04,.07,.04],P.glow,{glow:1,rings:4,seg:6});
    hold(S,_h,'R');
  };
}
for(const id in VASP_PAL) MODELS[id]=vaspModel(VASP_PAL[id]);
for(const id in VASP_PAL){
  autoAnim(id,{walkArm:.1,att:'slashR',hit:.5,casts:['raise','throw','clap','raise'],rings:[1,2,3],ringR:1.3,hands:'R',trailOff:[0,2.5,.6],col:[VASP_PAL[id].crystal,VASP_PAL[id].glow]});
}

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


/* ---------- 0.9.7.5: Псих — чумной доктор ---------- */
MODELS.psih=(S,d,t,pose)=>{
  const BLK='#0c0e13',BLK2='#171a22',CLOTH='#10131a',CLOTH2='#1b1f29',LEA='#b07a3c',LEA2='#85572a',BRASS='#d6aa4c',GLASS='#ffb52e',
        WOOD='#7a4136',GARL='#e8e1ce',GARL2='#b7ab8e',BLADE='#eef2f8',GLOW=d.color2||'#b6ff3a',ZIP='#f1e4a6';
  const kind=pose&&pose.kind,p=(pose&&pose.p)||0;
  const wk=kind==='walk'?Math.sin(p*Math.PI*2):0, at=kind==='attack'?Math.sin(Math.min(1,p)*Math.PI):0;
  const tw=Math.sin(t*5)*.012, bob=Math.sin(t*2.4)*.015, hy=2.0+bob;
  function lerp(a,b,k){return [a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];}
  /* сапоги выглядывают из-под подола */
  for(const s of [-1,1]){
    const sw=wk*s*.3;
    S.ell([s*.17,.07,sw+.14],[.13,.08,.25],BLK2,{rings:5,seg:8,shine:.35});
  }
  /* длинная тёмная ряса до земли */
  S.tube([0,1.08,0],[0,.55,0],.35,.44,CLOTH,{seg:16});
  S.tube([0,.55,0],[0,.12,wk*.07],.44,.55,CLOTH,{seg:16});
  S.tube([0,.14,wk*.07],[0,.08,wk*.07],.55,.56,CLOTH2,{seg:16,shine:.3});
  S.box([0,.62,.47],[.05,1.0,.02],CLOTH2,{});
  /* торс */
  S.tube([0,1.0,0],[0,1.58+bob,0],.31,.37,CLOTH,{seg:16});
  /* пояс, пряжка и свисающий ремень */
  S.tube([0,1.04,0],[0,1.13,0],.385,.385,BLK2,{seg:16,shine:.4});
  S.box([0,1.085,.385],[.1,.09,.03],BRASS,{shine:.8});
  S.obox([.14,1.04,.4],[.12,.5,.42],.06,.018,BLK2,{shine:.3});
  /* поясная сумка */
  S.box([.42,1.0,.1],[.14,.2,.22],BLK2,{shine:.3});
  S.box([.42,1.1,.1],[.15,.04,.23],LEA2,{shine:.4});
  /* связка чеснока на поясе */
  for(let i=0;i<4;i++){
    const gy=.96-i*.13, gx=-.26+Math.sin(t*2+i)*.012, gz=.42+i*.01;
    S.ell([gx,gy,gz],[.075,.085,.075],GARL,{rings:5,seg:8,shine:.45});
    S.cone([gx,gy+.07,gz],[gx,gy+.15,gz],.025,GARL2,{seg:5});
    S.tube([gx,gy+.15,gz],[gx,gy+.2,gz],.008,.008,BLK2,{seg:4});
  }
  /* плащ-накидка на плечах (капюшон-воротник) */
  S.tube([0,1.84+bob,0],[0,1.38+bob,0],.3,.6,CLOTH2,{seg:18});
  S.ell([0,1.72+bob,0],[.5,.26,.38],CLOTH,{rings:7,seg:16});
  S.tube([0,1.8+bob,0],[0,1.78+bob,0],.34,.34,BLK2,{seg:16});
  /* деревянный крест на шнурке */
  S.obox([-.12,1.86+bob,.3],[0,1.58+bob,.52],.018,.012,BLK2,{});
  S.obox([.12,1.86+bob,.3],[0,1.58+bob,.52],.018,.012,BLK2,{});
  S.box([0,1.46+bob,.56],[.06,.28,.03],WOOD,{shine:.35});
  S.box([0,1.52+bob,.56],[.2,.06,.03],WOOD,{shine:.35});
  /* руки: широкие рукава, чёрные кожаные перчатки, два скальпеля */
  for(const s of [-1,1]){
    const a=s>0?at:at*.4, sh=[s*.5,1.7+bob,.0], el=[s*.62,1.38,.14+a*.2], hd=[s*.55-s*a*.25,1.12+a*.2,.4+a*.4+wk*s*.1];
    S.tube(sh,el,.15,.125,CLOTH,{seg:10});
    S.tube(el,lerp(el,hd,.5),.125,.115,CLOTH,{seg:10});
    S.tube(lerp(el,hd,.45),hd,.1,.085,BLK,{seg:10,shine:.45});
    S.tube(lerp(el,hd,.42),lerp(el,hd,.52),.125,.125,BLK2,{seg:10,shine:.4});
    S.ell(hd,[.085,.085,.09],BLK,{rings:4,seg:8,shine:.45});
    const tip=[hd[0],hd[1]-.05,hd[2]+.64];
    S.obox(hd,[hd[0],hd[1],hd[2]+.1],.05,.05,BLK2,{});
    S.obox([hd[0],hd[1],hd[2]+.08],tip,.065,.014,BLADE,{shine:.9});
    S.box([hd[0],hd[1],hd[2]+.1],[.13,.025,.03],BRASS,{shine:.6});
    S.box([hd[0],hd[1]-.02,hd[2]+.42],[.022,.02,.05],'#8e1b1b');
  }
  /* капюшон за головой */
  S.ell([tw,hy-.04,-.06],[.31,.36,.31],CLOTH,{rings:8,seg:14});
  /* кожаная маска и клюв */
  S.ell([tw,hy-.02,.13],[.2,.25,.16],LEA,{rings:8,seg:14,shine:.35});
  S.ell([tw,hy+.1,.18],[.19,.06,.1],LEA2,{rings:4,seg:10});
  const bk=[[0,-.03,.22,.14],[0,-.08,.42,.108],[0,-.16,.62,.066],[0,-.27,.8,.012]];
  for(let i=0;i<3;i++){
    const A=bk[i],B=bk[i+1];
    S.tube([tw+A[0],hy+A[1],A[2]],[tw+B[0],hy+B[1],B[2]],A[3],B[3],i%2?LEA2:LEA,{seg:12,shine:.4});
  }
  /* «молния» вдоль клюва */
  for(let i=0;i<13;i++){
    const k=i/12, seg=Math.min(2,Math.floor(k*3)), kk=k*3-seg, A=bk[seg],B=bk[seg+1];
    const x=tw, y=hy+A[1]+(B[1]-A[1])*kk, z=A[2]+(B[2]-A[2])*kk, r=A[3]+(B[3]-A[3])*kk;
    S.box([x,y+r*.96,z],[.022,.014,.04],ZIP,{shine:.85});
  }
  S.box([tw,hy-.06,.34],[.02,.02,.2],ZIP,{shine:.8});
  /* круглые латунные очки с янтарным стеклом */
  for(const s of [-1,1]){
    const ex=s*.105+tw;
    S.ring([ex,hy+.06,.265],.068,.022,BRASS,{axis:'z',n:14,shine:.8});
    S.ell([ex,hy+.06,.272],[.062,.062,.026],GLASS,{rings:5,seg:10,glow:1});
    S.ell([ex-.02,hy+.085,.292],[.016,.016,.008],'#fff3c2',{rings:3,seg:5,glow:1});
  }
  S.tube([tw,hy+.02,0],[tw,hy+.06,0],.265,.265,BLK2,{seg:16});  /* ремешок маски */
  /* шляпа: широкие поля и плоская тулья */
  S.tube([tw,hy+.2,0],[tw,hy+.235,0],.54,.52,BLK,{seg:22});
  S.tube([tw,hy+.232,0],[tw,hy+.43,0],.27,.235,BLK2,{seg:18});
  S.tube([tw,hy+.43,0],[tw,hy+.455,0],.245,.225,BLK,{seg:18});
  S.tube([tw,hy+.235,0],[tw,hy+.3,0],.275,.27,'#222632',{seg:18,shine:.3});
  /* ядовитые огоньки вокруг */
  for(let i=0;i<4;i++){ const a=t*1.5+i*1.57; S.box([Math.cos(a)*.85,1.2+Math.sin(t*2+i)*.3+i*.18,Math.sin(a)*.85],[.05,.05,.05],i%2?GLOW:'#b58cff',{glow:1,rot:[a,a,0]}); }
};
ANIM.psih=[{kind:'attack',p:.3},{kind:'attack',p:.58},{kind:'walk',p:.25},{kind:'walk',p:.75}];


/* ---------- Мэрин — гангстер с автоматом (0.9.9.5) ---------- */
MODELS.marin=(S,d,t,pose)=>{
  const SUIT='#1a2030',SUIT2='#262e44',STRIPE='#4a5778',SHIRT='#f2f0e8',TIE='#c21f33',SKIN='#d8a477',SKIN2='#b57f56',
        HAT='#12141b',HAT2='#232733',BAND='#c8a24a',GOLD='#f0c94f',GUN='#17191e',GUN2='#3b414c',WOOD='#7b4a2a',SHADE='#07070a',
        SHOE='#0d0e12',GLOW=d.color2||'#ffb347',CIG='#d9d2c0';
  const kind=pose&&pose.kind,p=(pose&&pose.p)||0;
  const wk=kind==='walk'?Math.sin(p*Math.PI*2):0, at=kind==='attack'?Math.sin(Math.min(1,p)*Math.PI):0;
  const bob=Math.sin(t*2.2)*.014, hy=2.02+bob+(kind==='walk'?Math.abs(wk)*.03:0);
  /* ноги в брюках и лакированные туфли */
  for(const s of [-1,1]){
    const sw=wk*s*.3;
    S.tube([s*.17,1.05,sw*.35],[s*.17,.2,sw],.19,.15,SUIT,{seg:10});
    S.tube([s*.17,.88,sw*.35+.01],[s*.17,.84,sw*.35+.01],.2,.2,STRIPE,{seg:10});
    S.ell([s*.17,.09,sw+.14],[.14,.09,.27],SHOE,{rings:5,seg:8,shine:.7});
  }
  /* пиджак */
  S.tube([0,1.0,0],[0,1.66+bob,0],.33,.4,SUIT,{seg:16});
  S.tube([0,.72,0],[0,1.04,0],.34,.33,SUIT2,{seg:16});
  S.ell([0,1.66+bob,0],[.46,.2,.3],SUIT,{rings:6,seg:14});
  /* тонкая полоска на пиджаке */
  for(const x of [-.2,-.1,.1,.2]) S.box([x,1.3+bob*.5,.37+Math.abs(x)*-.1],[.012,.62,.02],STRIPE,{});
  /* рубашка, галстук, лацканы */
  S.box([0,1.5+bob,.355],[.2,.42,.03],SHIRT,{shine:.35});
  S.box([0,1.56+bob,.385],[.07,.3,.025],TIE,{shine:.5});
  S.box([0,1.4+bob,.39],[.055,.2,.025],TIE,{shine:.5});
  S.obox([-.1,1.72+bob,.33],[-.2,1.18+bob,.37],.05,.025,SUIT2,{shine:.3});
  S.obox([.1,1.72+bob,.33],[.2,1.18+bob,.37],.05,.025,SUIT2,{shine:.3});
  /* платочек и золотая цепочка */
  S.box([-.24,1.46+bob,.36],[.07,.06,.025],TIE,{shine:.4});
  S.tube([0,1.72+bob,0],[0,1.735+bob,0],.255,.255,GOLD,{seg:16,shine:.9});
  S.ell([0,1.5+bob,.385],[.045,.05,.02],GOLD,{rings:4,seg:8,shine:.9});
  /* ремень с золотой пряжкой */
  S.tube([0,.98,0],[0,1.05,0],.345,.345,SHOE,{seg:16,shine:.4});
  S.box([0,1.015,.345],[.09,.08,.03],GOLD,{shine:.9});
  /* левая рука — придерживает цевьё автомата */
  const g0=[.0,1.19+at*.02,.72-at*.08];            /* точка хвата цевья */
  {
    const sh=[-.46,1.68+bob,0], el=[-.58,1.4,.18], hd=[-.12,1.2,.58-at*.06];
    S.tube(sh,el,.15,.125,SUIT,{seg:10});
    S.tube(el,hd,.125,.1,SUIT,{seg:10});
    S.tube(sh,[sh[0]+(el[0]-sh[0])*.35,sh[1]+(el[1]-sh[1])*.35,sh[2]+(el[2]-sh[2])*.35],.155,.15,SUIT2,{seg:10});
    S.ell(hd,[.09,.085,.095],SKIN,{rings:4,seg:8,shine:.3});
    S.tube([-.54,1.43,.17],[-.52,1.41,.19],.115,.115,SHIRT,{seg:10});   /* манжета */
  }
  /* правая рука — на рукояти, автомат целиком спереди */
  {
    const rc=at*.12;                                 /* отдача */
    const sh=[.46,1.68+bob,0], el=[.62,1.4,.2-rc*.5], hd=[.3,1.12,.4-rc];
    S.tube(sh,el,.15,.125,SUIT,{seg:10});
    S.tube(el,hd,.125,.1,SUIT,{seg:10});
    S.tube(sh,[sh[0]+(el[0]-sh[0])*.35,sh[1]+(el[1]-sh[1])*.35,sh[2]+(el[2]-sh[2])*.35],.155,.15,SUIT2,{seg:10});
    S.tube([.58,1.43,.19-rc*.5],[.6,1.41,.2-rc*.5],.115,.115,SHIRT,{seg:10});
    S.ell(hd,[.09,.085,.095],SKIN,{rings:4,seg:8,shine:.3});
    /* «томпсон»: ствол, кожух, барабан, приклад, рукоять */
    const bz=.42-rc;                                  /* задняя точка ствола */
    S.box([.28,1.2,bz+.2],[.09,.1,.55],GUN,{shine:.55});                         /* ресивер */
    S.obox([.28,1.21,bz+.45],[.28,1.21,bz+1.02],.065,.065,GUN2,{shine:.7});       /* кожух ствола */
    S.obox([.28,1.21,bz+1.0],[.28,1.21,bz+1.16],.04,.04,GUN,{shine:.8});          /* дуло */
    S.tube([.28,1.12,bz+.55],[.28,1.1,bz+.55],.15,.15,GUN2,{seg:14,shine:.7});    /* дисковый магазин */
    S.tube([.28,1.15,bz+.55],[.28,1.06,bz+.55],.1,.1,GUN,{seg:12,shine:.5});
    S.obox([.28,1.18,bz+.1],[.28,1.1,bz-.28],.075,.07,WOOD,{shine:.5});          /* приклад */
    S.box([.28,1.04,bz+.28],[.06,.2,.06],WOOD,{shine:.5});                        /* рукоять */
    S.box([.28,1.28,bz+.3],[.03,.04,.1],GUN2,{shine:.6});                         /* прицел */
    /* вспышка выстрела */
    if(at>.2){
      const fl=.12+at*.14;
      S.ell([.28,1.21,bz+1.28],[fl,fl,fl*1.6],'#fff2b0',{rings:4,seg:8,glow:1});
      S.ell([.28,1.21,bz+1.38],[fl*.6,fl*.6,fl*1.4],GLOW,{rings:3,seg:6,glow:1});
    }
  }
  /* голова */
  S.tube([0,1.74+bob,0],[0,1.88+bob,0],.14,.14,SKIN2,{seg:10});
  S.ell([0,hy,0],[.235,.27,.235],SKIN,{rings:9,seg:16,shine:.3});
  S.ell([-.235,hy,0],[.04,.07,.04],SKIN2,{rings:3,seg:6});
  S.ell([.235,hy,0],[.04,.07,.04],SKIN2,{rings:3,seg:6});
  S.ell([0,hy-.02,.22],[.04,.055,.05],SKIN2,{rings:4,seg:8});                   /* нос */
  /* тёмные очки */
  for(const s of [-1,1]){
    S.ell([s*.095,hy+.045,.2],[.09,.065,.04],SHADE,{rings:5,seg:10,shine:.9});
    S.box([s*.095-.025,hy+.065,.235],[.025,.012,.01],'#7a8aa6',{shine:1});
  }
  S.box([0,hy+.05,.215],[.07,.015,.02],SHADE,{});
  /* усики, шрам и сигара */
  S.box([0,hy-.085,.215],[.14,.03,.03],'#2a1810',{});
  S.box([.13,hy-.01,.215],[.012,.12,.012],'#e3b895',{rot:[0,0,.5]});
  S.tube([.07,hy-.13,.2],[.13,hy-.11,.4],.02,.022,'#7a4a24',{seg:6});
  S.ell([.135,hy-.108,.41],[.022,.022,.02],GLOW,{rings:3,seg:6,glow:1});
  S.ell([.14+Math.sin(t*3)*.01,hy-.04+((t*.5)%1)*.25,.42],[.02,.02,.02],'#c9c9c9',{rings:3,seg:5});
  /* федора: поля, тулья, лента */
  S.tube([0,hy+.18,0],[0,hy+.22,0],.43,.4,HAT,{seg:22});
  S.tube([0,hy+.22,0],[0,hy+.44,0],.25,.2,HAT2,{seg:18});
  S.tube([0,hy+.44,0],[0,hy+.465,0],.2,.18,HAT,{seg:18});
  S.tube([0,hy+.22,0],[0,hy+.3,0],.255,.252,BAND,{seg:18,shine:.6});
  S.box([-.05,hy+.4,.19],[.14,.02,.02],HAT,{rot:[0,0,.2]});
  S.box([.16,hy+.22,.18],[.14,.05,.1],'#e8e4d4',{});                            /* перо за лентой */
  /* золотая аура-блёстки */
  for(let i=0;i<3;i++){ const a=t*1.2+i*2.1; S.box([Math.cos(a)*.8,1.1+Math.sin(t*1.6+i)*.25+i*.22,Math.sin(a)*.8],[.04,.04,.04],i%2?GOLD:GLOW,{glow:1,rot:[a,a,0]}); }
};
ANIM.marin=[{kind:'attack',p:.3},{kind:'attack',p:.58},{kind:'walk',p:.25},{kind:'walk',p:.75}];

/* ---- точка входа Web Worker (тот же файл, без DOM) ---- */
if(typeof document==='undefined'&&typeof self!=='undefined'&&typeof importScripts==='function'){
  self.onmessage=function(e){
    const d=e.data; if(!d) return;
    try{
      if(d.t==='meta'){
        const m=meta(d.def,d.radius);
        self.postMessage({t:'meta',key:d.key,m});
      } else if(d.t==='stand'){
        const res=standRaw(d.def,d.size,d.yaw);
        const n=res.W*res.H*4;
        const data=res.data.slice(0,n), glow=res.glow?res.glow.slice(0,n):null;
        const tr=[data.buffer]; if(glow) tr.push(glow.buffer);
        self.postMessage({t:'stand',key:d.key,W:res.W,H:res.H,data:data.buffer,glow:glow?glow.buffer:null},tr);
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
const API={ver:'0.9.5 Slark',draw,models:MODELS,monsterIds:MON_IDS,render,battleSprite,stand,resetBudget,prewarm,has,hasAnim:id=>!!ANIM[id],_meta:meta,_pitch:BATTLE_PITCH,_fdt:FR_DT};
(typeof window!=='undefined'?window:globalThis).Hero3D=API;
if(typeof module!=='undefined') module.exports=API;
})();
