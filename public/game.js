const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const keys = new Set();
let myId = null;
let state = { world:{width:1600,height:900}, players:[], bullets:[], units:[] };
let lastInput = 0;
let notice = '';
let noticeTime = 0;
let camera = { x:800, y:450 };

function resize(){ canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; canvas.style.width = innerWidth+'px'; canvas.style.height = innerHeight+'px'; ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); }
addEventListener('resize', resize); resize(); canvas.focus();
function me(){ return state.players.find(p => p.id === myId); }
function worldPoint(event){ const r=canvas.getBoundingClientRect(); const mx=event.clientX-r.left, my=event.clientY-r.top; return {x:mx-innerWidth/2+camera.x,y:my-innerHeight/2+camera.y}; }
function sendInput(now){
  if(now-lastInput < 50) return; lastInput=now;
  const p=me(); if(!p) return;
  const dx=mouse.x-p.x, dy=mouse.y-p.y;
  socket.emit('player:input',{up:keys.has('w')||keys.has('arrowup'),down:keys.has('s')||keys.has('arrowdown'),left:keys.has('a')||keys.has('arrowleft'),right:keys.has('d')||keys.has('arrowright'),angle:Math.atan2(dy,dx)});
}
const mouse={x:800,y:450};
addEventListener('keydown', e=>{ keys.add(e.key.toLowerCase()); if(['1','2','3'].includes(e.key)) socket.emit('player:buy',{1:'damage',2:'armor',3:'health'}[e.key]); if(e.key.toLowerCase()==='q') socket.emit('player:spawn'); });
addEventListener('keyup', e=>keys.delete(e.key.toLowerCase()));
canvas.addEventListener('mousemove', e=>{ const p=worldPoint(e); mouse.x=p.x; mouse.y=p.y; });
canvas.addEventListener('mousedown', e=>{ if(e.button!==0) return; const p=me(); if(p) socket.emit('player:shoot',{angle:Math.atan2(mouse.y-p.y,mouse.x-p.x)}); });
socket.on('connect',()=>{status.textContent='Онлайн: подключено';});
socket.on('game:init', data=>{myId=data.id; state=data.state; status.textContent='Матч 3 на 3 • WASD, ЛКМ, Q, 1-3';});
socket.on('game:state', next=>{state=next; const p=me(); if(p){camera.x+=(p.x-camera.x)*0.18; camera.y+=(p.y-camera.y)*0.18;}});
socket.on('game:notice', data=>{notice=data.message; noticeTime=2.5;});
socket.on('game:error', data=>{notice=data.message; noticeTime=4;});
function draw(){
  ctx.clearRect(0,0,innerWidth,innerHeight); ctx.save(); ctx.translate(innerWidth/2-camera.x,innerHeight/2-camera.y);
  ctx.fillStyle='#1b3028'; ctx.fillRect(0,0,state.world.width,state.world.height);
  ctx.strokeStyle='#3f8460'; ctx.lineWidth=4; ctx.strokeRect(0,0,state.world.width,state.world.height);
  ctx.strokeStyle='rgba(210,190,125,.22)'; ctx.lineWidth=120; ctx.beginPath(); ctx.moveTo(100,800); ctx.lineTo(800,450); ctx.lineTo(1500,100); ctx.stroke();
  for(const u of state.units){ctx.fillStyle=u.team?'#ff976b':'#7dffb0';ctx.beginPath();ctx.arc(u.x,u.y,12,0,Math.PI*2);ctx.fill();}
  for(const b of state.bullets){ctx.fillStyle=b.team?'#ffcc75':'#8be9fd';ctx.beginPath();ctx.arc(b.x,b.y,5,0,Math.PI*2);ctx.fill();}
  for(const p of state.players){
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle); ctx.globalAlpha=p.alive?1:.28;
    ctx.fillStyle=p.team?'#c94b5d':'#48c978'; ctx.beginPath(); ctx.arc(0,0,22,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#f6e3b0'; ctx.fillRect(12,-4,20,8); ctx.restore();
    ctx.fillStyle='#fff'; ctx.font='12px system-ui'; ctx.textAlign='center'; ctx.fillText(p.bot?'BOT':p.id===myId?'YOU':'PLAYER',p.x,p.y-31);
    ctx.fillStyle='#171c25';ctx.fillRect(p.x-25,p.y-26,50,5);ctx.fillStyle=p.team?'#ef5c67':'#62e58e';ctx.fillRect(p.x-25,p.y-26,50*Math.max(0,p.hp/p.maxHp),5);
  }
  ctx.restore();
  const p=me(); if(p){ctx.textAlign='left';ctx.fillStyle='#e9f2ff';ctx.font='14px system-ui';ctx.fillText(`HP ${Math.ceil(p.hp)}/${p.maxHp}  Gold ${p.gold}  Damage ${p.damage}  Armor ${p.armor}`,16,innerHeight-18);}
  if(noticeTime>0){noticeTime-=1/60;ctx.textAlign='center';ctx.fillStyle='#ffd568';ctx.font='bold 18px system-ui';ctx.fillText(notice,innerWidth/2,70);}
}
function loop(now){sendInput(now);draw();requestAnimationFrame(loop);} requestAnimationFrame(loop);
