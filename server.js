const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const WIDTH = 1600;
const HEIGHT = 900;
const MAX_PLAYERS = 6;
const TICK_RATE = 20;
const BROADCAST_RATE = 15;
const SHOP = {
  damage: { name: 'Клинок', cost: 120, damage: 12 },
  armor: { name: 'Броня', cost: 150, armor: 2 },
  health: { name: 'Сердце', cost: 180, maxHp: 100 }
};

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

const slots = [];
const players = new Map();
const bullets = [];
const units = [];
let nextUnitId = 1;
let nextBulletId = 1;
let lastBroadcast = 0;

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function makePlayer(id, team, bot = false) {
  const sideX = team === 0 ? 220 : WIDTH - 220;
  return { id, team, bot, x: sideX, y: 180 + (slots.length % 3) * 270, angle: team ? Math.PI : 0,
    hp: 500, maxHp: 500, gold: 600, damage: 28, armor: 0, alive: true,
    input: { up:false, down:false, left:false, right:false }, cooldown: 0, respawn: 0,
    inventory: [], lastAction: 0 };
}
function fillBots() {
  while (slots.length < MAX_PLAYERS) {
    const index = slots.length;
    const bot = makePlayer(`bot-${index + 1}`, index < 3 ? 0 : 1, true);
    slots.push(bot.id); players.set(bot.id, bot);
  }
}
function replaceBot(team, id) {
  const index = slots.indexOf(id);
  if (index >= 0) {
    players.delete(id);
    const bot = makePlayer(`bot-${index + 1}-${Date.now()}`, team, true);
    slots[index] = bot.id;
    players.set(bot.id, bot);
  }
}
function publicState() {
  return {
    world: { width: WIDTH, height: HEIGHT },
    players: [...players.values()].map(p => ({ id:p.id, team:p.team, bot:p.bot, x:p.x, y:p.y,
      angle:p.angle, hp:p.hp, maxHp:p.maxHp, gold:p.gold, damage:p.damage, armor:p.armor,
      alive:p.alive, inventory:p.inventory })),
    bullets: bullets.map(b => ({ id:b.id, x:b.x, y:b.y, team:b.team })),
    units: units.map(u => ({ id:u.id, team:u.team, x:u.x, y:u.y, hp:u.hp, maxHp:u.maxHp }))
  };
}
function sendError(socket, message) { socket.emit('game:error', { message }); }
function validPlayer(socket) { return players.get(socket.id); }

io.on('connection', socket => {
  const free = slots.find(id => players.get(id)?.bot);
  if (!free) { socket.emit('game:error', { message:'Комната заполнена (3 на 3).' }); socket.disconnect(true); return; }
  const old = players.get(free);
  const player = makePlayer(socket.id, old.team, false);
  player.x = old.x; player.y = old.y;
  const index = slots.indexOf(free); slots[index] = socket.id;
  players.delete(free); players.set(socket.id, player);
  socket.emit('game:init', { id:socket.id, state:publicState(), shop:SHOP });
  socket.broadcast.emit('game:notice', { message:'Игрок подключился.' });

  socket.on('player:input', data => {
    const p = validPlayer(socket); if (!p || p.respawn > 0) return;
    p.input = { up:!!data.up, down:!!data.down, left:!!data.left, right:!!data.right };
    if (Number.isFinite(data.angle)) p.angle = data.angle;
  });
  socket.on('player:shoot', data => {
    const p = validPlayer(socket); if (!p || !p.alive || p.cooldown > 0) return;
    if (!Number.isFinite(data.angle)) return;
    p.angle = data.angle; p.cooldown = 0.28; p.lastAction = Date.now();
    bullets.push({ id:nextBulletId++, owner:p.id, team:p.team, x:p.x + Math.cos(p.angle)*25,
      y:p.y + Math.sin(p.angle)*25, vx:Math.cos(p.angle)*720, vy:Math.sin(p.angle)*720, life:2, damage:p.damage });
  });
  socket.on('player:spawn', data => {
    const p = validPlayer(socket); if (!p || !p.alive || p.gold < 80) return;
    p.gold -= 80;
    units.push({ id:nextUnitId++, owner:p.id, team:p.team, x:p.x, y:p.y, hp:160, maxHp:160,
      vx: p.team === 0 ? 90 : -90 });
  });
  socket.on('player:buy', id => {
    const p = validPlayer(socket); const item = SHOP[id];
    if (!p || !item || p.gold < item.cost || p.inventory.includes(id)) return sendError(socket, 'Покупка недоступна');
    p.gold -= item.cost; p.inventory.push(id);
    if (item.damage) p.damage += item.damage;
    if (item.armor) p.armor += item.armor;
    if (item.maxHp) { p.maxHp += item.maxHp; p.hp += item.maxHp; }
    socket.emit('game:notice', { message:`Куплено: ${item.name}` });
  });
  socket.on('disconnect', () => {
    const p = players.get(socket.id); if (!p) return;
    players.delete(socket.id);
    const index = slots.indexOf(socket.id);
    if (index >= 0) { const bot = makePlayer(`bot-${index + 1}-${Date.now()}`, p.team, true); slots[index] = bot.id; players.set(bot.id, bot); }
  });
});

function botThink(p) {
  const enemies = [...players.values()].filter(other => other.team !== p.team && other.alive);
  const target = enemies.sort((a,b) => distance(a,p)-distance(b,p))[0];
  if (!target) return;
  p.angle = Math.atan2(target.y-p.y, target.x-p.x);
  p.input = { up:false, down:false, left:false, right:false };
  if (distance(p,target) > 300) { p.input.right = Math.cos(p.angle) > 0; p.input.left = !p.input.right; p.input.down = Math.sin(p.angle) > 0; p.input.up = !p.input.down; }
  if (p.cooldown <= 0) {
    p.cooldown = 0.28;
    bullets.push({ id:nextBulletId++, owner:p.id, team:p.team, x:p.x+Math.cos(p.angle)*25, y:p.y+Math.sin(p.angle)*25,
      vx:Math.cos(p.angle)*720, vy:Math.sin(p.angle)*720, life:2, damage:p.damage });
  }
}
function tick() {
  const dt = 1 / TICK_RATE;
  for (const p of players.values()) {
    p.cooldown = Math.max(0, p.cooldown - dt);
    if (p.respawn > 0) { p.respawn -= dt; if (p.respawn <= 0) { p.alive = true; p.hp = p.maxHp; p.x = p.team ? WIDTH-220 : 220; } continue; }
    if (p.bot) botThink(p);
    const dx = (p.input.right ? 1 : 0) - (p.input.left ? 1 : 0);
    const dy = (p.input.down ? 1 : 0) - (p.input.up ? 1 : 0);
    const length = Math.hypot(dx,dy) || 1;
    p.x = clamp(p.x + dx / length * 230 * dt, 28, WIDTH-28);
    p.y = clamp(p.y + dy / length * 230 * dt, 28, HEIGHT-28);
    if (Date.now() - p.lastAction > 1000) p.gold += 1;
  }
  for (let i=bullets.length-1; i>=0; i--) {
    const b = bullets[i]; b.x += b.vx*dt; b.y += b.vy*dt; b.life -= dt;
    let hit = false;
    for (const p of players.values()) if (p.alive && p.team !== b.team && Math.hypot(p.x-b.x,p.y-b.y)<22) {
      const damage = Math.max(1, b.damage - p.armor*2); p.hp -= damage; hit = true;
      if (p.hp <= 0) { p.alive = false; p.respawn = 5; const owner = players.get(b.owner); if (owner) owner.gold += 120; }
      break;
    }
    if (hit || b.life <= 0 || b.x<0 || b.x>WIDTH || b.y<0 || b.y>HEIGHT) bullets.splice(i,1);
  }
  for (let i=units.length-1; i>=0; i--) {
    const u = units[i]; u.x += u.vx*dt;
    const targets = [...players.values()].filter(p => p.alive && p.team !== u.team && distance(p,u)<25);
    if (targets[0]) { targets[0].hp -= 12; units.splice(i,1); continue; }
    if (u.x < 20 || u.x > WIDTH-20 || u.hp <= 0) units.splice(i,1);
  }
  const now = Date.now();
  if (now - lastBroadcast >= 1000 / BROADCAST_RATE) { lastBroadcast = now; io.emit('game:state', publicState()); }
}
setInterval(tick, 1000 / TICK_RATE);
fillBots();
server.listen(PORT, () => console.log(`Multiplayer server: http://localhost:${PORT}`));
