const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 20000 });
const PORT = process.env.PORT || 3000;
const MAX_SLOTS = 6;
const WORLD_SIZE = 5000;
const TICK_RATE = 30;
const MAP_SCALE = 1.42;
const mapPoint = (x,y) => ({x:(x-1800)*MAP_SCALE+WORLD_SIZE/2,y:(y-1800)*MAP_SCALE+WORLD_SIZE/2});
const BASES = [{x:480,y:3120},{x:3120,y:480}].map(base => mapPoint(base.x,base.y));
const SPAWN_RADIUS = 180;
const HERO_IDS = ['pyro','warlord','grisha','golly','sasych','ilya','malit','arcady','illusionist','shadow','electricGosha','mo3gi','tribupainer','mageHunter','regina','dawnMaiden','exileKnight','juvsyut','chip','juggernaut','earthshaker','sniper'];
const DEFAULT_HEROES = ['shadow','ilya','golly','pyro','warlord','grisha'];
const rooms = Object.create(null);
const socketRooms = new Map();
let nextBulletId = 1;

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath){
    if(/\.(?:html|js)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-store');
  }
}));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const makeRoomId = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const roomOf = socket => rooms[socketRooms.get(socket.id)];

function createRoom(hostId){
  const room = {id:makeRoomId(), hostId, started:false, players:Object.create(null), bullets:[]};
  rooms[room.id] = room;
  return room;
}
function findOpenRoom(){ return Object.values(rooms).find(room => !room.started && Object.keys(room.players).length < MAX_SLOTS); }
function createLobbyPlayer(id, slot){
  return {id, slot, team:slot < 3 ? 0 : 1, bot:false, hero:DEFAULT_HEROES[slot]};
}
function nextOpenSlot(room){
  const players = Object.values(room.players);
  const counts = [players.filter(player => player.team === 0).length, players.filter(player => player.team === 1).length];
  const preferredTeam = counts[0] <= counts[1] ? 0 : 1;
  const slots = preferredTeam === 0 ? [0,1,2,3,4,5] : [3,4,5,0,1,2];
  return slots.find(slot => !players.some(player => player.slot === slot));
}
function lobbyPayload(room){
  return {roomId:room.id, hostId:room.hostId, started:room.started,
    players:Object.values(room.players).map(player => ({...player}))};
}
function emitLobby(room){ io.to(room.id).emit('lobbyUpdate', lobbyPayload(room)); }
function spawnPlayer(member){
  const base = BASES[member.team];
  const angle = (member.team === 0 ? -Math.PI/4 : 3*Math.PI/4) + ((member.slot % 3)-1)*0.35;
  const spawn = {x:base.x+Math.cos(angle)*SPAWN_RADIUS,y:base.y+Math.sin(angle)*SPAWN_RADIUS};
  return {id:member.id, slot:member.slot, team:member.team, bot:member.bot, heroId:member.hero || 'shadow',
    x:spawn.x, y:spawn.y,
    angle:member.team === 0 ? 0 : Math.PI, hp:900, maxHp:900, gold:600, alive:true,
    moveTarget:null, keys:Object.create(null), speed:210, cooldown:0,
    respawnX:spawn.x, respawnY:spawn.y, respawnTimer:0, damageVersion:0, lastStatsSequence:0};
}
function startRoom(room){
  if(!room || room.started) return false;
  const players = Object.values(room.players);
  const teamCounts = [players.filter(player => player.team === 0).length, players.filter(player => player.team === 1).length];
  if(players.length < 2 || players.length > MAX_SLOTS || Math.abs(teamCounts[0]-teamCounts[1]) > 1) return false;
  room.started = true;
  room.state = Object.create(null);
  for(const member of Object.values(room.players)) room.state[member.id] = spawnPlayer(member);
  const roster = Object.values(room.players).map(player => ({...player, heroId:player.hero}));
  for(const member of Object.values(room.players))
    io.to(member.id).emit('match:begin', {id:member.id, roomId:room.id, roster, state:gameState(room)});
  return true;
}
function gameState(room){
  return {tick:room.tick || 0, players:Object.values(room.state || {}).map(player => ({
    id:player.id, slot:player.slot, team:player.team, bot:player.bot, heroId:player.heroId,
    x:player.x, y:player.y, angle:player.angle, hp:player.hp, maxHp:player.maxHp,
    gold:player.gold, alive:player.alive, respawnTimer:player.respawnTimer,
    damageVersion:player.damageVersion
  })), bullets:room.bullets.map(bullet => ({id:bullet.id,x:bullet.x,y:bullet.y,team:bullet.team,angle:bullet.angle}))};
}
function handleInput(socket, input){
  const room = roomOf(socket); const player = room?.state?.[socket.id];
  if(!room || !player || !input) return;
  if(Number.isFinite(input.angle)) player.angle = input.angle;
  if(input.type === 'key' && typeof input.key === 'string' && /^(?:[wasd]|arrow(?:up|down|left|right))$/.test(input.key)) player.keys[input.key] = !!input.down;
  if(input.type === 'move' && input.moveTarget) player.moveTarget = {
    x:clamp(Number(input.moveTarget.x) || player.x, 40, WORLD_SIZE-40),
    y:clamp(Number(input.moveTarget.y) || player.y, 40, WORLD_SIZE-40)
  };
  if(input.type === 'aim') player.moveTarget = player.moveTarget;
  if(input.type === 'shoot' && player.cooldown <= 0 && player.alive){
    player.cooldown = 0.28;
    room.bullets.push({id:nextBulletId++,x:player.x,y:player.y,team:player.team,angle:player.angle,life:1.4,owner:player.id});
  }
}
function handlePlayerStats(socket, stats){
  const room = roomOf(socket); const player = room?.state?.[socket.id];
  if(!room || !player || !stats) return;
  if(Number.isFinite(stats.maxHp)) player.maxHp = clamp(stats.maxHp,1,1000000);
  if(Number.isFinite(stats.gold)) player.gold = clamp(stats.gold,0,100000000);
  if(!Number.isInteger(stats.sequence) || stats.sequence <= player.lastStatsSequence ||
     stats.damageVersion !== player.damageVersion) return;
  player.lastStatsSequence = stats.sequence;
  if(Number.isFinite(stats.hp)) player.hp = clamp(stats.hp,0,player.maxHp);
  if(stats.alive === false || player.hp <= 0){
    if(player.alive){
      player.alive = false;
      player.respawnTimer = clamp(Number(stats.respawnTimer) || 8,0,60);
      player.damageVersion++;
      emitPlayerVitals(room,player);
    }
  }
}
function emitPlayerVitals(room,player){
  io.to(player.id).emit('playerVitals',{
    id:player.id,hp:player.hp,maxHp:player.maxHp,alive:player.alive,
    respawnTimer:player.respawnTimer,damageVersion:player.damageVersion
  });
}
function handlePlayerDamage(socket, data){
  const room = roomOf(socket);
  const attacker = room?.state?.[socket.id];
  const target = room?.state?.[data?.targetId];
  if(!attacker || !target || !attacker.alive || !target.alive || attacker.team === target.team || !Number.isFinite(data.amount)) return;
  target.hp = Math.max(0,target.hp-clamp(data.amount,0,5000));
  target.damageVersion++;
  if(target.hp === 0){ target.alive = false; target.respawnTimer = 8; }
  emitPlayerVitals(room,target);
}
function handlePlayerSkill(socket,data){
  const room=roomOf(socket);
  const caster=room?.state?.[socket.id];
  if(!room||!caster||!caster.alive||!data||typeof data.skillId!=='string'||data.skillId.length>80) return;
  if(Number.isFinite(data.x)) caster.x=clamp(data.x,40,WORLD_SIZE-40);
  if(Number.isFinite(data.y)) caster.y=clamp(data.y,40,WORLD_SIZE-40);
  if(Number.isFinite(data.angle)) caster.angle=data.angle;
  const effects=[];
  for(const effect of Array.isArray(data.effects)?data.effects:[]){
    const target=room.state[effect?.targetId];
    if(!target||target.team===caster.team||!effect.state) continue;
    const state=effect.state;
    for(const key of ['mp','maxMp','stunTimer','silenceTimer','slow','slowT','attackSlow','attackSlowT','liftTimer','knockbackX','knockbackY','knockbackTimer']){
      if(Number.isFinite(state[key])) target[key]=clamp(state[key],key==='mp'||key==='maxMp'?0:-10000,key==='mp'||key==='maxMp'?100000:10000);
    }
    if(Array.isArray(state.buffs)){
      target.skillBuffs=state.buffs.slice(0,24).map(buff=>({
        type:String(buff.type||'').slice(0,40),val:Number.isFinite(buff.val)?clamp(buff.val,-10000,10000):undefined,
        t:Number.isFinite(buff.t)?clamp(buff.t,0,120):undefined,multiplier:Number.isFinite(buff.multiplier)?clamp(buff.multiplier,0,20):undefined,
        damage:Number.isFinite(buff.damage)?clamp(buff.damage,0,10000):undefined
      }));
    }
    effects.push({targetId:target.id,state});
  }
  io.to(room.id).emit('playerSkill',{
    id:socket.id,heroId:caster.heroId,skillId:data.skillId,slot:data.slot,
    x:caster.x,y:caster.y,angle:caster.angle,tx:Number.isFinite(data.tx)?clamp(data.tx,0,WORLD_SIZE):null,
    ty:Number.isFinite(data.ty)?clamp(data.ty,0,WORLD_SIZE):null,effects
  });
}
function tickRoom(room, dt){
  if(!room.started || !room.state) return;
  room.tick = (room.tick || 0) + 1;
  for(const player of Object.values(room.state)){
    player.cooldown = Math.max(0, player.cooldown - dt);
    if(!player.alive){
      player.respawnTimer = Math.max(0, (player.respawnTimer || 0) - dt);
      if(player.respawnTimer > 0) continue;
      player.alive = true;
      player.hp = player.maxHp;
      player.x = player.respawnX;
      player.y = player.respawnY;
      player.damageVersion++;
      player.moveTarget = null;
      player.keys = Object.create(null);
      player.cooldown = 0;
      continue;
    }
    const keys = player.keys || {};
    const keyX = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    const keyY = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
    let dx = keyX, dy = keyY;
    if(!dx && !dy && player.moveTarget){ dx = player.moveTarget.x-player.x; dy = player.moveTarget.y-player.y; if(Math.hypot(dx,dy) < 8) player.moveTarget = null; }
    const length = Math.hypot(dx,dy) || 1;
    if(dx || dy){ player.x = clamp(player.x + dx/length*player.speed*dt, 40, WORLD_SIZE-40); player.y = clamp(player.y + dy/length*player.speed*dt, 40, WORLD_SIZE-40); }
  }
  for(let i=room.bullets.length-1;i>=0;i--){
    const bullet = room.bullets[i];
    bullet.x += Math.cos(bullet.angle)*900*dt; bullet.y += Math.sin(bullet.angle)*900*dt; bullet.life -= dt;
    const hit = Object.values(room.state).find(player => player.alive && player.team !== bullet.team && Math.hypot(player.x-bullet.x,player.y-bullet.y) < 28);
    if(hit){
      hit.hp = Math.max(0, hit.hp-80);
      if(hit.hp === 0){ hit.alive = false; hit.respawnTimer = 5; }
      hit.damageVersion++;
      emitPlayerVitals(room,hit);
      room.bullets.splice(i,1);
      continue;
    }
    if(bullet.life <= 0 || bullet.x < 0 || bullet.x > WORLD_SIZE || bullet.y < 0 || bullet.y > WORLD_SIZE) room.bullets.splice(i,1);
  }
}

io.on('connection', socket => {
  socket.on('match:join', () => {
    if(roomOf(socket)) return emitLobby(roomOf(socket));
    const room = findOpenRoom() || createRoom(socket.id);
    const slot = nextOpenSlot(room);
    if(!Number.isInteger(slot)) return socket.emit('room:error',{message:'Комната заполнена.'});
    room.players[socket.id] = createLobbyPlayer(socket.id, slot);
    socketRooms.set(socket.id, room.id); socket.join(room.id); emitLobby(room);
  });
  socket.on('room:select', data => {
    const room = roomOf(socket); const player = room?.players?.[socket.id];
    if(!room || room.started || !player) return;
    if(Number.isInteger(data.slot) && data.slot >= 0 && data.slot < MAX_SLOTS &&
       !Object.values(room.players).some(other => other.id !== socket.id && other.slot === data.slot)){
      const nextTeam = data.slot < 3 ? 0 : 1;
      const players = Object.values(room.players);
      const counts = [players.filter(other => other.team === 0 && other.id !== socket.id).length,
        players.filter(other => other.team === 1 && other.id !== socket.id).length];
      counts[nextTeam]++;
      if(Math.abs(counts[0]-counts[1]) <= 1){ player.slot = data.slot; player.team = nextTeam; }
    }
    if(typeof data.heroId === 'string' && HERO_IDS.includes(data.heroId) &&
       !Object.values(room.players).some(other => other.id !== socket.id && other.hero === data.heroId)) player.hero = data.heroId;
    emitLobby(room);
  });
  socket.on('room:start', () => {
    const room = roomOf(socket);
    if(!room || room.started) return socket.emit('room:error',{message:'Комната уже запущена.'});
    if(room.hostId !== socket.id) return socket.emit('room:error',{message:'Стартовать может только хост.'});
    if(Object.keys(room.players).length < 2) return socket.emit('room:error',{message:'Нужен хотя бы ещё один игрок.'});
    if(!startRoom(room)) return socket.emit('room:error',{message:'Распределите игроков по командам поровну.'});
    socket.emit('room:started');
  });
  socket.on('playerInput', input => handleInput(socket, input));
  socket.on('playerStats', stats => handlePlayerStats(socket, stats));
  socket.on('playerDamage', data => handlePlayerDamage(socket, data));
  socket.on('playerSkill', data => handlePlayerSkill(socket,data));
  socket.on('disconnect', () => {
    const room = roomOf(socket); socketRooms.delete(socket.id); if(!room) return;
    delete room.players[socket.id];
    if(!room.started){
      if(room.hostId === socket.id) room.hostId = Object.keys(room.players)[0] || null;
      if(Object.keys(room.players).length) emitLobby(room); else delete rooms[room.id];
    } else if(room.state){
      delete room.state[socket.id];
      io.to(room.id).emit('match:player-left',{message:'Игрок отключился.'});
      if(Object.keys(room.players).length) io.to(room.id).emit('gameState',gameState(room));
      else delete rooms[room.id];
    }
  });
});

setInterval(() => {
  const dt = 1/TICK_RATE;
  for(const room of Object.values(rooms)){
    tickRoom(room, dt);
    if(room.started) io.to(room.id).emit('gameState', gameState(room));
  }
}, 1000/TICK_RATE);

server.listen(PORT, () => console.log(`Shadow Rampage authoritative server on ${PORT}`));
