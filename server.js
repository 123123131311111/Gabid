const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;
const MAX_PLAYERS = 6;
const WORLD_SIZE = 5000;
const queue = [];
const players = new Map();
const bullets = [];
let matchTimer = null;
let nextBulletId = 1;
let draftTimer = null;
let activeMatch = null;
const HERO_IDS = ['pyro','warlord','grisha','golly','sasych','ilya','malit','arcady','illusionist','shadow','electricGosha','mo3gi','tribupainer','mageHunter','regina','dawnMaiden','exileKnight','juvsyut','chip','juggernaut','earthshaker','sniper'];

app.use(express.static(path.join(__dirname, 'public')));

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const publicState = () => ({
  players: [...players.values()].map(player => ({
    id:player.id, team:player.team, bot:player.bot, x:player.x, y:player.y,
    angle:player.angle, hp:player.hp, maxHp:player.maxHp, alive:player.alive,
    heroId:player.heroId
  })),
  bullets: bullets.map(bullet => ({ id:bullet.id, x:bullet.x, y:bullet.y, team:bullet.team }))
});

function createPlayer(id, team, bot){
  return {id, team, bot, x:team ? WORLD_SIZE-600 : 600, y:900 + (team ? 1 : 0) * 1200,
    angle:team ? Math.PI : 0, hp:900, maxHp:900, alive:true, heroId:'shadow', cooldown:0,
    input:{x:0,y:0,angle:0}};
}
function emitQueue(){
  const playersInQueue = queue.length;
  for(const id of queue) io.to(id).emit('match:queue', {players:playersInQueue, max:MAX_PLAYERS});
}
function startMatch(){
  if(!queue.length) return;
  const ids = queue.splice(0, MAX_PLAYERS);
  while(ids.length < MAX_PLAYERS) ids.push('bot-' + Date.now() + '-' + ids.length);
  for(let index=0; index<ids.length; index++){
    const id = ids[index];
    const player = createPlayer(id, index < 3 ? 0 : 1, id.startsWith('bot-'));
    players.set(id, player);
  }
  activeMatch = {ids, choices:new Map()};
  for(const id of ids) if(!id.startsWith('bot-')) io.to(id).emit('match:start', {id, players:ids.filter(item => !item.startsWith('bot-')).length, state:publicState(), heroes:HERO_IDS});
  draftTimer = setTimeout(finalizeDraft, 20000);
  matchTimer = null;
}
function finalizeDraft(){
  if(!activeMatch) return;
  const accepted = new Set();
  const freeHeroes = HERO_IDS.slice();
  for(const id of activeMatch.ids){
    const choice = activeMatch.choices.get(id);
    if(choice && HERO_IDS.includes(choice) && !accepted.has(choice)){
      accepted.add(choice);
      const index = freeHeroes.indexOf(choice);
      if(index >= 0) freeHeroes.splice(index, 1);
    } else activeMatch.choices.set(id, freeHeroes.shift() || HERO_IDS[0]);
  }
  for(const id of activeMatch.ids){
    const player = players.get(id);
    if(player) player.heroId = activeMatch.choices.get(id);
  }
  const roster = activeMatch.ids.map(id => ({id, heroId:activeMatch.choices.get(id), team:players.get(id)?.team ?? 0}));
  for(const id of activeMatch.ids) if(!id.startsWith('bot-')) io.to(id).emit('match:begin', {id, roster, state:publicState()});
  activeMatch = null;
  draftTimer = null;
}
function queuePlayer(socket){
  if(!queue.includes(socket.id)) queue.push(socket.id);
  emitQueue();
  if(queue.length >= MAX_PLAYERS) startMatch();
  else if(!matchTimer) matchTimer = setTimeout(startMatch, 8000);
}

io.on('connection', socket => {
  socket.on('match:join', () => queuePlayer(socket));
  socket.on('hero:select', data => {
    if(!activeMatch || !activeMatch.ids.includes(socket.id) || !HERO_IDS.includes(data.heroId)) return;
    if([...activeMatch.choices.entries()].some(([id, hero]) => id !== socket.id && hero === data.heroId)) return;
    activeMatch.choices.set(socket.id, data.heroId);
    const humans = activeMatch.ids.filter(id => !id.startsWith('bot-'));
    for(const id of humans) io.to(id).emit('draft:state', {selected:[...activeMatch.choices.entries()]});
    if(humans.every(id => activeMatch.choices.has(id))) finalizeDraft();
  });
  socket.on('player:state', data => {
    const player = players.get(socket.id);
    if(!player || player.bot) return;
    if(Number.isFinite(data.x)) player.x = clamp(data.x, 40, WORLD_SIZE-40);
    if(Number.isFinite(data.y)) player.y = clamp(data.y, 40, WORLD_SIZE-40);
    if(Number.isFinite(data.angle)) player.angle = data.angle;
    if(Number.isFinite(data.hp)) player.hp = clamp(data.hp, 0, player.maxHp);
    if(Number.isFinite(data.maxHp)) player.maxHp = Math.max(1, data.maxHp);
    if(typeof data.alive === 'boolean') player.alive = data.alive;
    if(typeof data.heroId === 'string') player.heroId = data.heroId;
  });
  socket.on('player:shoot', data => {
    const player = players.get(socket.id);
    if(!player || !player.alive || player.cooldown > 0) return;
    player.angle = Number.isFinite(data.angle) ? data.angle : player.angle;
    player.cooldown = 0.28;
    bullets.push({id:nextBulletId++, x:player.x, y:player.y, team:player.team, angle:player.angle, life:1.2});
  });
  socket.on('disconnect', () => {
    const queuedIndex = queue.indexOf(socket.id);
    if(queuedIndex >= 0) queue.splice(queuedIndex, 1);
    players.delete(socket.id);
    if(activeMatch){
      activeMatch.choices.delete(socket.id);
      activeMatch.ids = activeMatch.ids.filter(id => id !== socket.id);
    }
    emitQueue();
    io.emit('match:player-left', {message:'Игрок отключился, его место занял бот.'});
  });
});

setInterval(() => {
  const humans = [...players.values()].filter(player => !player.bot && player.alive);
  for(const player of players.values()){
    player.cooldown = Math.max(0, player.cooldown - 0.05);
    if(player.bot && humans.length){
      const target = humans[0];
      player.angle = Math.atan2(target.y-player.y, target.x-player.x);
      player.x = clamp(player.x + Math.cos(player.angle)*9, 40, WORLD_SIZE-40);
      player.y = clamp(player.y + Math.sin(player.angle)*9, 40, WORLD_SIZE-40);
    }
  }
  for(let index=bullets.length-1; index>=0; index--){
    bullets[index].life -= 0.05;
    if(bullets[index].life <= 0) bullets.splice(index, 1);
  }
  if(players.size) io.emit('world:state', publicState());
}, 50);

server.listen(port, () => console.log(`Shadow Rampage 3v3 online: http://localhost:${port}`));
