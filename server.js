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
const TICK_RATE = 60;
const HERO_IDS = ['pyro','warlord','grisha','golly','sasych','ilya','malit','arcady','illusionist','shadow','electricGosha','mo3gi','tribupainer','mageHunter','regina','dawnMaiden','exileKnight','juvsyut','chip','juggernaut','earthshaker','sniper'];
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
function heroNames(room){ return Object.values(room.players).map(player => player.hero).filter(Boolean); }
function createLobbyPlayer(id, slot, bot=false){
  return {id, slot, team:slot < 3 ? 0 : 1, bot, hero:null};
}
function lobbyPayload(room){
  return {roomId:room.id, hostId:room.hostId, started:room.started,
    players:Object.values(room.players).map(player => ({...player}))};
}
function emitLobby(room){ io.to(room.id).emit('lobbyUpdate', lobbyPayload(room)); }
function spawnPlayer(member){
  const baseX = member.team === 0 ? 560 : WORLD_SIZE - 560;
  return {id:member.id, team:member.team, bot:member.bot, heroId:member.hero || 'shadow',
    x:baseX, y:member.team === 0 ? 2500 + (member.slot * 70) : 2500 - ((member.slot - 3) * 70),
    angle:member.team === 0 ? 0 : Math.PI, hp:900, maxHp:900, gold:600, alive:true,
    moveTarget:null, keys:Object.create(null), speed:210, cooldown:0};
}
function chooseBots(room){
  const used = new Set(heroNames(room));
  const freeHeroes = HERO_IDS.filter(hero => !used.has(hero));
  for(let slot=0; slot<MAX_SLOTS; slot++){
    const occupied = Object.values(room.players).some(player => player.slot === slot);
    if(occupied) continue;
    const id = `bot-${room.id}-${slot}`;
    room.players[id] = createLobbyPlayer(id, slot, true);
    room.players[id].hero = freeHeroes.shift() || HERO_IDS[slot];
  }
  for(const player of Object.values(room.players)) if(!player.hero) player.hero = freeHeroes.shift() || HERO_IDS[0];
}
function startRoom(room){
  if(!room || room.started) return;
  chooseBots(room);
  room.started = true;
  room.state = Object.create(null);
  for(const member of Object.values(room.players)) room.state[member.id] = spawnPlayer(member);
  const roster = Object.values(room.players).map(player => ({...player, heroId:player.hero}));
  for(const member of Object.values(room.players)) if(!member.bot)
    io.to(member.id).emit('match:begin', {id:member.id, roomId:room.id, roster, state:gameState(room)});
}
function gameState(room){
  return {tick:room.tick || 0, players:Object.values(room.state || {}).map(player => ({
    id:player.id, team:player.team, bot:player.bot, heroId:player.heroId,
    x:player.x, y:player.y, angle:player.angle, hp:player.hp, maxHp:player.maxHp,
    gold:player.gold, alive:player.alive
  })), bullets:room.bullets.map(bullet => ({id:bullet.id,x:bullet.x,y:bullet.y,team:bullet.team,angle:bullet.angle}))};
}
function nearestEnemy(room, player){
  return Object.values(room.state).filter(other => other.alive && other.team !== player.team)
    .sort((a,b) => Math.hypot(a.x-player.x,a.y-player.y) - Math.hypot(b.x-player.x,b.y-player.y))[0];
}
function handleInput(socket, input){
  const room = roomOf(socket); const player = room?.state?.[socket.id];
  if(!room || !player || player.bot || !input) return;
  if(Number.isFinite(input.angle)) player.angle = input.angle;
  if(input.type === 'key') player.keys[input.key] = !!input.down;
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
function tickRoom(room, dt){
  if(!room.started || !room.state) return;
  room.tick = (room.tick || 0) + 1;
  for(const player of Object.values(room.state)){
    player.cooldown = Math.max(0, player.cooldown - dt);
    if(!player.alive) continue;
    if(player.bot){
      const target = nearestEnemy(room, player);
      if(target){
        player.angle = Math.atan2(target.y-player.y, target.x-player.x);
        if(Math.hypot(target.x-player.x,target.y-player.y) > 700)
          player.moveTarget = {x:target.x, y:target.y};
      }
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
    if(hit){ hit.hp = Math.max(0, hit.hp-80); if(hit.hp === 0) hit.alive = false; room.bullets.splice(i,1); continue; }
    if(bullet.life <= 0 || bullet.x < 0 || bullet.x > WORLD_SIZE || bullet.y < 0 || bullet.y > WORLD_SIZE) room.bullets.splice(i,1);
  }
}

io.on('connection', socket => {
  socket.on('match:join', () => {
    if(roomOf(socket)) return emitLobby(roomOf(socket));
    const room = findOpenRoom() || createRoom(socket.id);
    const used = new Set(Object.values(room.players).map(player => player.slot));
    let slot = 0; while(used.has(slot)) slot++;
    room.players[socket.id] = createLobbyPlayer(socket.id, slot, false);
    socketRooms.set(socket.id, room.id); socket.join(room.id); emitLobby(room);
  });
  socket.on('room:select', data => {
    const room = roomOf(socket); const player = room?.players?.[socket.id];
    if(!room || room.started || !player) return;
    if(Number.isInteger(data.slot) && data.slot >= 0 && data.slot < MAX_SLOTS &&
       !Object.values(room.players).some(other => other.id !== socket.id && other.slot === data.slot)){
      player.slot = data.slot; player.team = data.slot < 3 ? 0 : 1;
    }
    if(typeof data.heroId === 'string' && HERO_IDS.includes(data.heroId) &&
       !Object.values(room.players).some(other => other.id !== socket.id && other.hero === data.heroId)) player.hero = data.heroId;
    emitLobby(room);
  });
  socket.on('room:start', () => {
    const room = roomOf(socket);
    if(!room || room.started) return socket.emit('room:error',{message:'Комната уже запущена.'});
    if(room.hostId !== socket.id) return socket.emit('room:error',{message:'Стартовать может только хост.'});
    startRoom(room); socket.emit('room:started');
  });
  socket.on('playerInput', input => handleInput(socket, input));
  socket.on('disconnect', () => {
    const room = roomOf(socket); socketRooms.delete(socket.id); if(!room) return;
    const leaving = room.players[socket.id]; delete room.players[socket.id];
    if(!room.started){
      if(room.hostId === socket.id) room.hostId = Object.keys(room.players)[0] || null;
      if(Object.keys(room.players).length) emitLobby(room); else delete rooms[room.id];
    } else if(room.state){
      const botId = `bot-${room.id}-replacement-${Date.now()}`;
      const bot = createLobbyPlayer(botId, leaving?.slot ?? 0, true); bot.hero = leaving?.hero || 'shadow';
      room.players[botId] = bot; room.state[botId] = spawnPlayer(bot);
      io.to(room.id).emit('match:player-left',{message:'Игрок отключился. Его слот перешёл боту.'});
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
