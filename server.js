const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;
const MAX_SLOTS = 6;
const WORLD_SIZE = 5000;
const HERO_IDS = ['pyro','warlord','grisha','golly','sasych','ilya','malit','arcady','illusionist','shadow','electricGosha','mo3gi','tribupainer','mageHunter','regina','dawnMaiden','exileKnight','juvsyut','chip','juggernaut','earthshaker','sniper'];
const rooms = new Map();
const players = new Map();
const bullets = [];
let nextBulletId = 1;

app.use(express.static(path.join(__dirname, 'public')));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const roomFor = socket => rooms.get(socket.data.roomId);

function newRoom(hostId){
  const room = {id:Math.random().toString(36).slice(2,8).toUpperCase(), hostId, started:false, members:new Map()};
  rooms.set(room.id, room);
  return room;
}
function openRoom(){
  return [...rooms.values()].find(room => !room.started && room.members.size < MAX_SLOTS);
}
function heroList(room){
  return [...room.members.values()].map(member => member.heroId).filter(Boolean);
}
function roomState(room){
  return {
    roomId:room.id,
    hostId:room.hostId,
    started:room.started,
    members:[...room.members.values()].map(member => ({
      id:member.id, slot:member.slot, team:member.team, bot:member.bot,
      heroId:member.heroId
    }))
  };
}
function emitRoom(room){ io.to(room.id).emit('room:state', roomState(room)); }
function createPlayer(member){
  return {id:member.id, team:member.team, bot:member.bot, x:member.team ? WORLD_SIZE-600 : 600,
    y:member.team === 0 ? 900 + member.slot*120 : 900 + (member.slot-3)*120,
    angle:member.team ? Math.PI : 0, hp:900, maxHp:900, alive:true, heroId:member.heroId, cooldown:0};
}
function fillRoomWithBots(room){
  const usedHeroes = new Set(heroList(room));
  const freeHeroes = HERO_IDS.filter(hero => !usedHeroes.has(hero));
  for(const member of room.members.values()){
    if(member.heroId) continue;
    member.heroId = freeHeroes.shift() || HERO_IDS[0];
    usedHeroes.add(member.heroId);
  }
  for(let slot=0; slot<MAX_SLOTS; slot++){
    if([...room.members.values()].some(member => member.slot === slot)) continue;
    const id = `bot-${room.id}-${slot}`;
    room.members.set(id, {id, slot, team:slot < 3 ? 0 : 1, bot:true, heroId:freeHeroes.shift() || HERO_IDS[slot]});
  }
}
function startRoom(room){
  if(!room || room.started) return;
  fillRoomWithBots(room);
  room.started = true;
  for(const member of room.members.values()) players.set(member.id, createPlayer(member));
  const roster = [...room.members.values()].map(member => ({id:member.id, slot:member.slot, team:member.team, bot:member.bot, heroId:member.heroId}));
  for(const member of room.members.values()) if(!member.bot){
    io.to(member.id).emit('match:begin', {id:member.id, roomId:room.id, roster, state:worldState(room)});
  }
}
function worldState(room){
  return {
    players:[...room.members.values()].map(member => {
      const player = players.get(member.id) || createPlayer(member);
      return {id:player.id, team:player.team, bot:player.bot, x:player.x, y:player.y,
        angle:player.angle, hp:player.hp, maxHp:player.maxHp, alive:player.alive, heroId:player.heroId};
    }),
    bullets:bullets.map(bullet => ({id:bullet.id,x:bullet.x,y:bullet.y,team:bullet.team}))
  };
}

io.on('connection', socket => {
  socket.on('match:join', () => {
    if(roomFor(socket)) return emitRoom(roomFor(socket));
    const room = openRoom() || newRoom(socket.id);
    if(!room.hostId) room.hostId = socket.id;
    const usedSlots = new Set([...room.members.values()].map(member => member.slot));
    let slot = 0; while(usedSlots.has(slot)) slot++;
    room.members.set(socket.id, {id:socket.id, slot, team:slot < 3 ? 0 : 1, bot:false, heroId:null});
    socket.data.roomId = room.id;
    socket.join(room.id);
    emitRoom(room);
  });
  socket.on('room:select', data => {
    const room = roomFor(socket); const member = room?.members.get(socket.id);
    if(!room || room.started || !member) return;
    if(Number.isInteger(data.slot) && data.slot >= 0 && data.slot < MAX_SLOTS){
      const occupied = [...room.members.values()].find(item => item.slot === data.slot && item.id !== socket.id);
      if(!occupied) { member.slot = data.slot; member.team = data.slot < 3 ? 0 : 1; }
    }
    if(typeof data.heroId === 'string' && HERO_IDS.includes(data.heroId)){
      const occupied = [...room.members.values()].some(item => item.id !== socket.id && item.heroId === data.heroId);
      if(!occupied) member.heroId = data.heroId;
    }
    emitRoom(room);
  });
  socket.on('room:start', () => {
    const room = roomFor(socket);
    if(!room || room.started) return socket.emit('room:error', {message:'Комната уже запущена или не найдена.'});
    if(room.hostId !== socket.id) return socket.emit('room:error', {message:'Начать матч может только владелец комнаты.'});
    startRoom(room);
    socket.emit('room:started');
  });
  socket.on('player:state', data => {
    const player = players.get(socket.id);
    if(!player || player.bot) return;
    if(Number.isFinite(data.x)) player.x = clamp(data.x,40,WORLD_SIZE-40);
    if(Number.isFinite(data.y)) player.y = clamp(data.y,40,WORLD_SIZE-40);
    if(Number.isFinite(data.angle)) player.angle = data.angle;
    if(Number.isFinite(data.hp)) player.hp = clamp(data.hp,0,player.maxHp);
    if(Number.isFinite(data.maxHp)) player.maxHp = Math.max(1,data.maxHp);
    if(typeof data.alive === 'boolean') player.alive = data.alive;
  });
  socket.on('player:shoot', data => {
    const player = players.get(socket.id);
    if(!player || !player.alive || player.cooldown > 0) return;
    player.angle = Number.isFinite(data.angle) ? data.angle : player.angle;
    player.cooldown = 0.28;
    bullets.push({id:nextBulletId++,x:player.x,y:player.y,team:player.team,angle:player.angle,life:1.2});
  });
  socket.on('disconnect', () => {
    const room = roomFor(socket);
    players.delete(socket.id);
    if(!room) return;
    const leavingMember = room.members.get(socket.id);
    room.members.delete(socket.id);
    if(!room.started){
      if(room.hostId === socket.id) room.hostId = [...room.members.keys()][0] || null;
      if(room.members.size) emitRoom(room); else rooms.delete(room.id);
    } else {
      const botId = `bot-${room.id}-replacement-${Date.now()}`;
      const replacement = {id:botId,slot:leavingMember?.slot ?? 0,team:leavingMember?.team ?? 0,bot:true,heroId:leavingMember?.heroId || 'shadow'};
      room.members.set(botId, replacement);
      players.set(botId, createPlayer(replacement));
      io.to(room.id).emit('match:player-left', {message:'Игрок отключился. Его место занял бот.'});
    }
  });
});

setInterval(() => {
  for(const player of players.values()) player.cooldown = Math.max(0, player.cooldown - 0.05);
  for(let i=bullets.length-1;i>=0;i--){ bullets[i].life -= 0.05; if(bullets[i].life <= 0) bullets.splice(i,1); }
  for(const room of rooms.values()) if(room.started) io.to(room.id).emit('world:state', worldState(room));
}, 50);

server.listen(port, () => console.log(`Shadow Rampage 3v3 rooms: http://localhost:${port}`));
