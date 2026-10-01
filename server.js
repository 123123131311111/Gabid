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
const SPAWN_RADIUS = 70;
const HERO_IDS = ['pyro','warlord','grisha','golly','sasych','ilya','malit','arcady','illusionist','shadow','electricGosha','mo3gi','tribupainer','mageHunter','regina','dawnMaiden','exileKnight','juvsyut','chip','juggernaut','earthshaker','sniper'];
const DEFAULT_HEROES = ['shadow','ilya','golly','pyro','warlord','grisha'];
const makeTowerId = (team, lane, tier, base = false) => base ? `ancient:${team}` : `tower:${team}:${lane}:${tier}`;
const TOWER_SPOTS = [
  {team:0,lane:0,tier:1,x:1550,y:2050},{team:0,lane:0,tier:2,x:1040,y:2560},
  {team:0,lane:1,tier:1,x:445,y:1600},{team:0,lane:1,tier:2,x:480,y:2350},
  {team:0,lane:2,tier:1,x:1600,y:3120},{team:0,lane:2,tier:2,x:1000,y:3120},
  {team:1,lane:0,tier:1,x:2000,y:1600},{team:1,lane:0,tier:2,x:2560,y:1040},
  {team:1,lane:1,tier:1,x:2600,y:485},{team:1,lane:1,tier:2,x:2940,y:498},
  {team:1,lane:2,tier:1,x:3110,y:3100},{team:1,lane:2,tier:2,x:3220,y:800}
];
const rooms = Object.create(null);
const socketRooms = new Map();
let nextBulletId = 1;

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath){
    if(/\.(?:html|js|css)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-store');
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
  const angle = (member.team === 0 ? -Math.PI/4 : 3*Math.PI/4) + ((member.slot % 3)-1)*0.55;
  const spawn = {x:base.x+Math.cos(angle)*SPAWN_RADIUS,y:base.y+Math.sin(angle)*SPAWN_RADIUS};
  return {id:member.id, slot:member.slot, team:member.team, bot:member.bot, heroId:member.hero || 'shadow',
    x:spawn.x, y:spawn.y,
    angle:member.team === 0 ? 0 : Math.PI, hp:900, maxHp:900, gold:600, alive:true,
    moveTarget:null, keys:Object.create(null), speed:210, cooldown:0,
    attackTargetId:null, attackRange:210,
    clientDriven:false,lastClientPositionAt:0,
    respawnX:spawn.x, respawnY:spawn.y, respawnTimer:0, damageVersion:0, lastStatsSequence:0};
}
function startRoom(room){
  if(!room || room.started) return false;
  const players = Object.values(room.players);
  const teamCounts = [players.filter(player => player.team === 0).length, players.filter(player => player.team === 1).length];
  if(players.length < 2 || players.length > MAX_SLOTS || Math.abs(teamCounts[0]-teamCounts[1]) > 1) return false;
  room.started = true;
  room.state = Object.create(null);
  room.towers = Object.create(null);
  for(const spot of TOWER_SPOTS){
    const towerId = makeTowerId(spot.team, spot.lane, spot.tier, false);
    const position = mapPoint(spot.x,spot.y);
    room.towers[towerId] = {
      id: towerId,
      team: spot.team,
      x: position.x,
      y: position.y,
      hp: 2000,
      maxHp: 2000,
      atkRange: 560,
      dmg: 82,
      atkTime: 1.05,
      cooldown: 0,
      targetId: null,
      alive: true,
      lane: spot.lane,
      tier: spot.tier,
      facing: 0
    };
  }
  room.towers[makeTowerId(0, null, null, true)] = {id:makeTowerId(0, null, null, true),team:0,x:BASES[0].x,y:BASES[0].y,hp:14400,maxHp:14400,atkRange:850,dmg:220,atkTime:0.8,cooldown:0,targetId:null,alive:true,tier:0,facing:0};
  room.towers[makeTowerId(1, null, null, true)] = {id:makeTowerId(1, null, null, true),team:1,x:BASES[1].x,y:BASES[1].y,hp:14400,maxHp:14400,atkRange:850,dmg:220,atkTime:0.8,cooldown:0,targetId:null,alive:true,tier:0,facing:0};
  for(const member of Object.values(room.players)) room.state[member.id] = spawnPlayer(member);
  const roster = Object.values(room.players).map(player => ({...player, heroId:player.hero}));
  for(const member of Object.values(room.players))
    io.to(member.id).emit('match:begin', {id:member.id, roomId:room.id, roster, state:gameState(room)});
  return true;
}
function gameState(room){
  return {
    tick:room.tick || 0,
    players:Object.values(room.state || {}).map(player => ({
      id:player.id, slot:player.slot, team:player.team, bot:player.bot, heroId:player.heroId,
      x:player.x, y:player.y, angle:player.angle, hp:player.hp, maxHp:player.maxHp,
      gold:player.gold, alive:player.alive, respawnTimer:player.respawnTimer,
      damageVersion:player.damageVersion
    })),
    towers:Object.values(room.towers || {}).map(tower => ({
      id:tower.id,
      team:tower.team,
      x:tower.x,
      y:tower.y,
      lane:tower.lane,
      tier:tower.tier,
      hp:tower.hp,
      maxHp:tower.maxHp,
      alive:tower.alive
    })),
    bullets:room.bullets.map(bullet => ({id:bullet.id,x:bullet.x,y:bullet.y,team:bullet.team,angle:bullet.angle}))
  };
}
function emitTowerState(room, tower){
  if(!room || !tower) return;
  io.to(room.id).emit('tower:update', {
    id:tower.id,
    x:tower.x,
    y:tower.y,
    lane:tower.lane,
    tier:tower.tier,
    hp:tower.hp,
    maxHp:tower.maxHp,
    alive:tower.alive,
    team:tower.team
  });
}
function applyTowerDamage(room, tower, amount){
  if(!room || !tower || !tower.alive || !Number.isFinite(amount) || amount <= 0) return;
  tower.hp = Math.max(0, tower.hp - clamp(amount,0,5000));
  if(tower.hp <= 0){
    tower.hp = 0;
    tower.alive = false;
  }
  emitTowerState(room, tower);
  if(tower.id && tower.id.startsWith('ancient:') && !tower.alive){
    const winningTeam = tower.team === 0 ? 1 : 0;
    io.to(room.id).emit('game_over', {winner:winningTeam});
  }
}
function handleInput(socket, input){
  const room = roomOf(socket); const player = room?.state?.[socket.id];
  if(!room || !player || !input) return;
  if(Number.isFinite(input.angle)) player.angle = input.angle;
  if(Number.isFinite(input.speed)) player.speed = clamp(input.speed,80,900);
  if(Number.isFinite(input.attackRange)) player.attackRange = clamp(input.attackRange,40,1400);
  if(input.type === 'position' && Number.isFinite(input.x) && Number.isFinite(input.y) && player.alive){
    const now=Date.now();
    const elapsed=player.lastClientPositionAt ? Math.min(1,(now-player.lastClientPositionAt)/1000) : 1;
    const maxStep=player.speed*elapsed*2.5+80;
    const targetX=clamp(input.x,40,WORLD_SIZE-40);
    const targetY=clamp(input.y,40,WORLD_SIZE-40);
    const dist=Math.hypot(targetX-player.x,targetY-player.y);
    if(!player.clientDriven || dist<=maxStep){
      player.x=targetX;
      player.y=targetY;
    } else {
      // Move as far as allowed instead of silently dropping the update, so the
      // server position always keeps catching up and can never get permanently
      // stuck (which used to cause other players to see it freeze then
      // suddenly 'teleport').
      const ratio=maxStep/dist;
      player.x=clamp(player.x+(targetX-player.x)*ratio,40,WORLD_SIZE-40);
      player.y=clamp(player.y+(targetY-player.y)*ratio,40,WORLD_SIZE-40);
    }
    player.clientDriven=true;
    player.lastClientPositionAt=now;
    if(Number.isFinite(input.angle)) player.angle=input.angle;
  }
  if(input.type === 'key' && typeof input.key === 'string' && /^(?:[wasd]|arrow(?:up|down|left|right))$/.test(input.key)){
    player.keys[input.key] = !!input.down;
    if(input.down){ player.attackTargetId=null; player.attackTargetPoint=null; }
  }
  if(input.type === 'attackTarget'){
    const target=room.state[input.targetId];
    player.attackTargetId=target && target.alive && target.team!==player.team ? target.id : null;
    player.attackTargetPoint=!player.attackTargetId&&Number.isFinite(input.targetX)&&Number.isFinite(input.targetY)
      ? {x:clamp(input.targetX,40,WORLD_SIZE-40),y:clamp(input.targetY,40,WORLD_SIZE-40)} : null;
    player.moveTarget=null;
  }
  if(input.type === 'clearTarget'){
    player.attackTargetId=null;
    player.attackTargetPoint=null;
    player.moveTarget=null;
  }
  if(input.type === 'move' && input.moveTarget){
    player.attackTargetId=null;
    player.attackTargetPoint=null;
    player.moveTarget = {
      x:clamp(Number(input.moveTarget.x) || player.x, 40, WORLD_SIZE-40),
      y:clamp(Number(input.moveTarget.y) || player.y, 40, WORLD_SIZE-40)
    };
  }
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
  if(!room || !attacker || !attacker.alive || !data || !Number.isFinite(data.amount) || data.amount <= 0) return;
  if(typeof data.towerId === 'string'){
    const tower = room.towers?.[data.towerId];
    if(!tower || !tower.alive || attacker.team === tower.team) return;
    applyTowerDamage(room, tower, data.amount);
    return;
  }
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
  caster.clientDriven=true;
  caster.lastClientPositionAt=Date.now();
  const effects=[];
  for(const effect of Array.isArray(data.effects)?data.effects:[]){
    const target=room.state[effect?.targetId];
    if(!target||target.team===caster.team||!effect.state) continue;
    const state=effect.state;
    // x/y and mp/maxMp are intentionally never taken from this side-channel: they
    // used to be copied straight from whatever the CASTER's browser believed
    // about this target (only an approximate, laggy replica), and re-broadcasting
    // that as fact caused constant teleporting/rubber-banding and mana that kept
    // rewinding/refilling itself. Only real CC/buff state travels this way -
    // position and mana always come from the target's own client.
    for(const key of ['stunTimer','silenceTimer','slow','slowT','attackSlow','attackSlowT','liftTimer','knockbackX','knockbackY','knockbackTimer']){
      if(Number.isFinite(state[key])) target[key]=clamp(state[key],-10000,10000);
    }
    if(Array.isArray(state.buffs)){
      target.skillBuffs=state.buffs.slice(0,24).map(buff=>({
        type:String(buff.type||'').slice(0,40),val:Number.isFinite(buff.val)?clamp(buff.val,-10000,10000):undefined,
        t:Number.isFinite(buff.t)?clamp(buff.t,0,120):undefined,multiplier:Number.isFinite(buff.multiplier)?clamp(buff.multiplier,0,20):undefined,
        damage:Number.isFinite(buff.damage)?clamp(buff.damage,0,10000):undefined
      }));
    }
    effects.push({targetId:target.id,state:{
      stunTimer:target.stunTimer,silenceTimer:target.silenceTimer,slow:target.slow,slowT:target.slowT,
      attackSlow:target.attackSlow,attackSlowT:target.attackSlowT,liftTimer:target.liftTimer,
      knockbackX:target.knockbackX,knockbackY:target.knockbackY,knockbackTimer:target.knockbackTimer,
      buffs:target.skillBuffs||[]
    }});
  }
  io.to(room.id).emit('playerSkill',{
    id:socket.id,heroId:caster.heroId,skillId:data.skillId,slot:data.slot,level:clamp(Number(data.level)||1,1,10),
    x:caster.x,y:caster.y,angle:caster.angle,tx:Number.isFinite(data.tx)?clamp(data.tx,0,WORLD_SIZE):null,
    ty:Number.isFinite(data.ty)?clamp(data.ty,0,WORLD_SIZE):null,effects
  });
}
function handlePlayerSnapshot(socket,data){
  const room=roomOf(socket);
  const player=room?.state?.[socket.id];
  if(!room||!player||!data||data.heroId!==player.heroId) return;
  if(data.teleport===true && Number.isFinite(data.x) && Number.isFinite(data.y)){
    player.x=clamp(data.x,40,WORLD_SIZE-40);
    player.y=clamp(data.y,40,WORLD_SIZE-40);
    player.moveTarget=null;
    player.clientDriven=true;
    player.lastClientPositionAt=Date.now();
  }
  const effects=[];
  for(const effect of Array.isArray(data.effects)?data.effects:[]){
    const target=room.state[effect?.targetId];
    if(!target||target.team===player.team||!effect.state) continue;
    const state=effect.state;
    // No x/y or mp/maxMp from this side-channel either - see handlePlayerSkill.
    for(const key of ['stunTimer','silenceTimer','slow','slowT','attackSlow','attackSlowT','liftTimer','knockbackX','knockbackY','knockbackTimer']){
      if(Number.isFinite(state[key])) target[key]=clamp(state[key],-10000,10000);
    }
    if(Array.isArray(state.buffs)) target.skillBuffs=state.buffs.slice(0,24);
    effects.push({targetId:target.id,state:{
      stunTimer:target.stunTimer,silenceTimer:target.silenceTimer,slow:target.slow,slowT:target.slowT,
      attackSlow:target.attackSlow,attackSlowT:target.attackSlowT,liftTimer:target.liftTimer,
      knockbackX:target.knockbackX,knockbackY:target.knockbackY,knockbackTimer:target.knockbackTimer,
      buffs:target.skillBuffs||[]
    }});
  }
  const snapshot={
    id:socket.id,heroId:player.heroId,
    level:clamp(Number(data.level)||1,1,30),xp:clamp(Number(data.xp)||0,0,100000000),
    mp:clamp(Number(data.mp)||0,0,1000000),maxMp:clamp(Number(data.maxMp)||0,0,1000000),
    inventory:Array.isArray(data.inventory)?data.inventory.slice(0,6).map(item=>item&&({
      id:String(item.id||'').slice(0,48),cooldown:clamp(Number(item.cooldown)||0,0,3600),activeTimer:clamp(Number(item.activeTimer)||0,0,3600)
    })):[],
    skills:Array.isArray(data.skills)?data.skills.slice(0,8).map(skill=>({
      id:String(skill.id||'').slice(0,48),level:clamp(Number(skill.level)||0,0,10),cd:clamp(Number(skill.cd)||0,0,3600)
    })):[],
    buffs:Array.isArray(data.buffs)?data.buffs.slice(0,24).map(buff=>({
      type:String(buff.type||'').slice(0,40),val:Number.isFinite(buff.val)?clamp(buff.val,-10000,10000):undefined,
      t:Number.isFinite(buff.t)?clamp(buff.t,0,120):undefined,multiplier:Number.isFinite(buff.multiplier)?clamp(buff.multiplier,0,20):undefined,
      damage:Number.isFinite(buff.damage)?clamp(buff.damage,0,10000):undefined
    })):[],
    bkbActive:clamp(Number(data.bkbActive)||0,0,120),timurPillow:clamp(Number(data.timurPillow)||0,0,120),effects
  };
  socket.to(room.id).emit('playerSnapshot',snapshot);
}
function tickTowerCombat(room, dt){
  if(!room || !room.state || !room.towers) return;

  for(const tower of Object.values(room.towers)){
    if(!tower || !tower.alive) continue;
    tower.cooldown = Math.max(0, (tower.cooldown || 0) - dt);

    let target = null;
    if(tower.targetId){
      const candidate = room.state[tower.targetId];
      if(candidate && candidate.alive && candidate.team !== tower.team &&
         Math.hypot(candidate.x - tower.x, candidate.y - tower.y) <= tower.atkRange + 32){
        target = candidate;
      }
    }
    if(!target){
      target = Object.values(room.state).find(player =>
        player.alive &&
        player.team !== tower.team &&
        Math.hypot(player.x - tower.x, player.y - tower.y) <= tower.atkRange + 32
      ) || null;
    }
    tower.targetId = target ? target.id : null;
    if(!target || tower.cooldown > 0) continue;

    tower.cooldown = tower.atkTime;
    tower.facing = Math.atan2(target.y - tower.y, target.x - tower.x);
    io.to(room.id).emit('tower:shot', {
      id: tower.id,
      x: tower.x,
      y: tower.y,
      targetId: target.id,
      angle: tower.facing,
      team: tower.team,
      dmg: tower.dmg
    });

    target.hp = Math.max(0, target.hp - tower.dmg);
    target.damageVersion = (target.damageVersion || 0) + 1;
    if(target.hp <= 0){
      target.hp = 0;
      target.alive = false;
      target.respawnTimer = 8;
    }
    emitPlayerVitals(room, target);

    if(tower.id && tower.id.startsWith('ancient:') && !tower.alive){
      const winningTeam = tower.team === 0 ? 1 : 0;
      io.to(room.id).emit('game_over', {winner:winningTeam});
    }
  }
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
      player.clientDriven = false;
      player.damageVersion++;
      player.moveTarget = null;
      player.keys = Object.create(null);
      player.cooldown = 0;
      player.lastClientPositionAt=Date.now();
      emitPlayerVitals(room,player);
      continue;
    }
    if(player.clientDriven) continue;
    const attackTarget=player.attackTargetId && room.state[player.attackTargetId];
    if(attackTarget && attackTarget.alive && attackTarget.team!==player.team){
      const dx=player.x-attackTarget.x,dy=player.y-attackTarget.y;
      const distance=Math.hypot(dx,dy)||1;
      const desired=Math.max(24,player.attackRange+24);
      if(distance>desired){
        player.moveTarget={x:attackTarget.x+dx/distance*desired,y:attackTarget.y+dy/distance*desired};
      }else player.moveTarget=null;
    }else if(player.attackTargetPoint){
      const dx=player.x-player.attackTargetPoint.x,dy=player.y-player.attackTargetPoint.y;
      const distance=Math.hypot(dx,dy)||1;
      const desired=Math.max(24,player.attackRange+28);
      if(distance>desired){
        player.moveTarget={x:player.attackTargetPoint.x+dx/distance*desired,y:player.attackTargetPoint.y+dy/distance*desired};
      }else player.moveTarget=null;
    }else if(player.attackTargetId){
      player.attackTargetId=null;
    }
    const keys = player.keys || {};
    const keyX = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    const keyY = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
    let dx = keyX, dy = keyY;
    if(!dx && !dy && player.moveTarget){ dx = player.moveTarget.x-player.x; dy = player.moveTarget.y-player.y; if(Math.hypot(dx,dy) < 8) player.moveTarget = null; }
    const length = Math.hypot(dx,dy) || 1;
    if(dx || dy){ player.x = clamp(player.x + dx/length*player.speed*dt, 40, WORLD_SIZE-40); player.y = clamp(player.y + dy/length*player.speed*dt, 40, WORLD_SIZE-40); }
  }
  tickTowerCombat(room, dt);
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
  socket.on('playerSnapshot', data => handlePlayerSnapshot(socket,data));
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
