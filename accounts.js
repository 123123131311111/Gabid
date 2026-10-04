const crypto = require('crypto');
const mongoose = require('mongoose');

const NICK_RE = /^[\p{L}\p{N}_\- ]{3,16}$/u;
const MAX_BODY = 4096;
const AVATAR_IDS = new Set(['pyro','warlord','grisha','golly','sasych','ilya','malit','arcady','illusionist','shadow','mo3gi','regina','juggernaut','sniper','chip','savely','shovel','tower','ancient','rune','creep']);
const HERO_IDS = new Set(['pyro','warlord','grisha','golly','sasych','ilya','malit','arcady','illusionist','shadow','electricGosha','mo3gi','tribupainer','mageHunter','regina','yosyp','dawnMaiden','exileKnight','juvsyut','chip','savely','juggernaut','earthshaker','sniper']);
const MONGODB_URI = process.env.MONGODB_URI;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const participantSchema = new mongoose.Schema({
  nick: { type: String, maxlength: 24, default: '' },
  heroId: { type: String, maxlength: 40, default: '' },
  team: { type: Number, min: 0, max: 1, default: 0 },
  kills: { type: Number, min: 0, default: 0 },
  deaths: { type: Number, min: 0, default: 0 },
  assists: { type: Number, min: 0, default: 0 },
  netWorth: { type: Number, min: 0, default: 0 }
}, { _id: false });

const matchSchema = new mongoose.Schema({
  matchId: { type: String, maxlength: 40, default: '' },
  won: { type: Boolean, default: false },
  heroId: { type: String, maxlength: 40, default: '' },
  kills: { type: Number, min: 0, default: 0 },
  deaths: { type: Number, min: 0, default: 0 },
  assists: { type: Number, min: 0, default: 0 },
  netWorth: { type: Number, min: 0, default: 0 },
  winnerTeam: { type: Number, min: 0, max: 1, default: 0 },
  xpGained: { type: Number, min: 0, default: 0 },
  ratingChange: { type: Number, default: 0 },
  playedAt: { type: Number, default: Date.now },
  participants: { type: [participantSchema], default: [] }
}, { _id: false });

const accountSchema = new mongoose.Schema({
  nick: { type: String, required: true },
  nickKey: { type: String, required: true, unique: true, index: true },
  salt: { type: String, required: true },
  hash: { type: String, required: true },
  level: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  rating: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  kills: { type: Number, default: 0 },
  deaths: { type: Number, default: 0 },
  heroStats: { type: Map, of: Number, default: {} },
  history: { type: [matchSchema], default: [] },
  avatar: { type: String, default: '' },
  recent: { type: [String], default: [] },
  times: { type: [Number], default: [] },
  created: { type: Number, default: Date.now }
}, { versionKey: false });
accountSchema.index({ rating: -1, wins: -1, level: -1, created: 1 });

const sessionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  accountKey: { type: String, required: true, index: true },
  created: { type: Number, required: true },
  lastResult: { type: Number }
}, { versionKey: false });

const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);
const Session = mongoose.models.GameSession || mongoose.model('GameSession', sessionSchema);
let connectionPromise = null;

async function connect(){
  if(!MONGODB_URI) throw new Error('MONGODB_URI is not configured');
  if(mongoose.connection.readyState === 1) return;
  if(!connectionPromise){
    connectionPromise = mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
      .then(() => undefined)
      .catch(err => { connectionPromise = null; throw err; });
  }
  await connectionPromise;
}

const keyOf = nick => nick.trim().toLowerCase();
const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
function favoriteHeroes(acc){
  const stats = acc.heroStats instanceof Map ? Object.fromEntries(acc.heroStats) : (acc.heroStats || {});
  return Object.entries(stats)
    .map(([heroId, games]) => ({ heroId, games: Number(games) || 0 }))
    .sort((left, right) => right.games - left.games)
    .slice(0, 3);
}
const publicProfile = acc => ({
  nick: acc.nick,
  level: acc.level,
  wins: acc.wins || 0,
  losses: acc.losses || 0,
  rating: Number.isFinite(acc.rating) ? acc.rating : 0,
  avatar: AVATAR_IDS.has(acc.avatar) ? acc.avatar : '',
  xp: acc.xp || 0,
  kills: acc.kills || 0,
  deaths: acc.deaths || 0,
  matches: (acc.wins || 0) + (acc.losses || 0),
  favoriteHeroes: favoriteHeroes(acc),
  title: (acc.level || 0) >= 25 ? 'Легенда арены' : (acc.level || 0) >= 10 ? 'Гроза древних' : (acc.level || 0) >= 5 ? 'Ветеран битв' : 'Новобранец',
  frame: (acc.level || 0) >= 25 ? 'legend' : (acc.level || 0) >= 10 ? 'dominion' : (acc.level || 0) >= 5 ? 'veteran' : 'iron'
});

async function makeSession(key){
  const token = crypto.randomBytes(24).toString('hex');
  await Session.create({ token, accountKey: key, created: Date.now() });
  return token;
}

async function authed(body){
  const token = String(body.token || '');
  if(!token) return null;
  const session = await Session.findOne({ token }).lean();
  if(!session) return null;
  const acc = await Account.findOne({ nickKey: session.accountKey });
  return acc ? { acc, session } : null;
}

async function profileForToken(token){
  token=String(token||'');
  if(!/^[a-f0-9]{48}$/i.test(token)) return null;
  await connect();
  const auth=await authed({token});
  return auth ? publicProfile(auth.acc) : null;
}

const attempts = new Map();
function tooMany(ip){
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter(time => now - time < 60000);
  list.push(now);
  attempts.set(ip, list);
  return list.length > 20;
}

function validateNick(nick){
  if(typeof nick !== 'string') return 'Введи ник';
  nick = nick.trim().replace(/\s+/g, ' ');
  if(!NICK_RE.test(nick)) return 'Ник: 3–16 символов (буквы, цифры, _ - пробел)';
  return null;
}
function validatePassword(password){
  if(typeof password !== 'string' || password.length < 4 || password.length > 64) return 'Пароль: от 4 до 64 символов';
  return null;
}

const routes = {
  async register(body, ip){
    if(tooMany(ip)) return [429, { error: 'Слишком много попыток, подожди минуту' }];
    const validationError = validateNick(body.nick) || validatePassword(body.password);
    if(validationError) return [400, { error: validationError }];
    const nick = body.nick.trim().replace(/\s+/g, ' ');
    const nickKey = keyOf(nick);
    const salt = crypto.randomBytes(16).toString('hex');
    try {
      const acc = await Account.create({ nick, nickKey, salt, hash: hashPassword(body.password, salt) });
      return [200, { token: await makeSession(nickKey), profile: publicProfile(acc) }];
    } catch(err) {
      if(err && err.code === 11000) return [409, { error: 'Этот ник уже занят' }];
      throw err;
    }
  },

  async login(body, ip){
    if(tooMany(ip)) return [429, { error: 'Слишком много попыток, подожди минуту' }];
    const acc = await Account.findOne({ nickKey: keyOf(String(body.nick || '')) });
    if(!acc || typeof body.password !== 'string') return [401, { error: 'Неверный ник или пароль' }];
    const given = Buffer.from(hashPassword(body.password, acc.salt), 'hex');
    const real = Buffer.from(acc.hash, 'hex');
    if(given.length !== real.length || !crypto.timingSafeEqual(given, real)) return [401, { error: 'Неверный ник или пароль' }];
    return [200, { token: await makeSession(acc.nickKey), profile: publicProfile(acc) }];
  },

  async me(body){
    const auth = await authed(body);
    return auth ? [200, { profile: publicProfile(auth.acc) }] : [401, { error: 'Сессия истекла, войди заново' }];
  },

  async career(body){
    const auth = await authed(body);
    if(!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    return [200, {
      profile: publicProfile(auth.acc),
      history: auth.acc.history.slice(0, 20).map(match => ({
        ...match.toObject(),
        participants: match.participants.map(player => player.toObject())
      }))
    }];
  },

  async leaderboard(){
    const leaders = await Account.find({})
      .sort({ wins: -1, rating: -1, level: -1, created: 1 })
      .limit(10)
      .select('nick nickKey level wins losses rating avatar xp kills deaths heroStats')
      .lean();
    return [200, { players: leaders.map((player, index) => ({ rank: index + 1, ...publicProfile(player) })) }];
  },

  async logout(body){
    await Session.deleteOne({ token: String(body.token || '') });
    return [200, { ok: true }];
  },

  async nick(body){
    const auth = await authed(body);
    if(!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    const validationError = validateNick(body.newNick);
    if(validationError) return [400, { error: validationError }];
    const nick = body.newNick.trim().replace(/\s+/g, ' ');
    const newKey = keyOf(nick), oldKey = auth.acc.nickKey;
    if(newKey !== oldKey){
      try {
        await Account.updateOne({ _id: auth.acc._id }, { $set: { nick, nickKey: newKey } });
      } catch(err) {
        if(err && err.code === 11000) return [409, { error: 'Этот ник уже занят' }];
        throw err;
      }
      await Session.updateMany({ accountKey: oldKey }, { $set: { accountKey: newKey } });
    } else {
      await Account.updateOne({ _id: auth.acc._id }, { $set: { nick } });
    }
    const updated = await Account.findById(auth.acc._id);
    return [200, { profile: publicProfile(updated) }];
  },

  async avatar(body){
    const auth = await authed(body);
    if(!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    const id = String(body.avatar || '');
    if(id && !AVATAR_IDS.has(id)) return [400, { error: 'Неизвестная аватарка' }];
    await Account.updateOne({ _id: auth.acc._id }, { $set: { avatar: id } });
    const updated = await Account.findById(auth.acc._id);
    return [200, { profile: publicProfile(updated) }];
  },

  async result(body){
    const auth = await authed(body);
    if(!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    const now = Date.now();
    const matchId = typeof body.matchId === 'string' && /^[a-z0-9]{6,40}$/i.test(body.matchId) ? body.matchId : null;
    const account = auth.acc;
    if(matchId && account.recent.includes(matchId)) return [200, { profile: publicProfile(account), ignored: true }];

    const inputStats = body.stats && typeof body.stats === 'object' ? body.stats : {};
    const heroId = HERO_IDS.has(inputStats.heroId) ? inputStats.heroId : '';
    const kills = Math.round(clamp(Number(inputStats.kills) || 0, 0, 1000));
    const deaths = Math.round(clamp(Number(inputStats.deaths) || 0, 0, 1000));
    const assists = Math.round(clamp(Number(inputStats.assists) || 0, 0, 1000));
    const netWorth = Math.round(clamp(Number(inputStats.netWorth) || 0, 0, 100000000));
    const winnerTeam = inputStats.winnerTeam === 1 ? 1 : 0;
    const participants = Array.isArray(inputStats.participants) ? inputStats.participants.slice(0, 12).map(player => ({
      nick: String(player.nick || '').slice(0, 24),
      heroId: HERO_IDS.has(player.heroId) ? player.heroId : '',
      team: player.team === 1 ? 1 : 0,
      kills: Math.round(clamp(Number(player.kills) || 0, 0, 1000)),
      deaths: Math.round(clamp(Number(player.deaths) || 0, 0, 1000)),
      assists: Math.round(clamp(Number(player.assists) || 0, 0, 1000)),
      netWorth: Math.round(clamp(Number(player.netWorth) || 0, 0, 100000000))
    })) : [];

    const recentTimes = account.times.filter(time => now - time < 3600000);
    if(recentTimes.length >= 40) return [200, { profile: publicProfile(account), ignored: true }];

    if(!account.xp && account.level > 0){
      await Account.updateOne({ _id: account._id, xp: 0 }, { $set: { xp: account.level * 500 } });
    }

    if(!matchId){
      const session = await Session.findOneAndUpdate({
        _id: auth.session._id,
        $or: [{ lastResult: { $exists: false } }, { lastResult: { $lt: now - 60000 } }]
      }, { $set: { lastResult: now } }, { new: true }).lean();
      if(!session) return [200, { profile: publicProfile(account), ignored: true }];
    }

    const won = body.won === true;
    const xpGained = 100 + kills * 12 + assists * 5 + (won ? 100 : 0);
    const ratingChange = body.ranked === true ? (won ? 50 : -40) : 0;
    const filter = { _id: account._id };
    if(matchId) filter.recent = { $ne: matchId };
    const update = {
      $inc: {
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        xp: xpGained,
        kills,
        deaths,
        rating: ratingChange,
        ...(heroId ? { ['heroStats.' + heroId]: 1 } : {})
      },
      $set: {
        times: recentTimes.concat(now)
      },
      $push: {
        history: { $each: [{
          matchId: matchId || '', won, heroId, kills, deaths, assists, netWorth, winnerTeam,
          xpGained, ratingChange, playedAt: now, participants
        }], $position: 0, $slice: 20 }
      }
    };
    if(matchId) update.$push.recent = { $each: [matchId], $slice: -60 };
    const updated = await Account.findOneAndUpdate(filter, update, { new: true });

    if(!updated) return [200, { profile: publicProfile(await Account.findById(account._id)), ignored: true }];
    const earnedLevel = Math.floor((updated.xp || 0) / 500);
    if(earnedLevel > updated.level){
      await Account.updateOne({ _id: updated._id }, { $max: { level: earnedLevel } });
      updated.level = earnedLevel;
    }
    if(updated.rating < 0){
      await Account.updateOne({ _id: updated._id, rating: { $lt: 0 } }, { $set: { rating: 0 } });
      updated.rating = 0;
    }
    return [200, { profile: publicProfile(updated) }];
  }
};

function handle(req, res){
  if(!req.url.startsWith('/api/')) return false;
  const name = req.url.slice(5).split('?')[0];
  const route = routes[name];
  const send = (code, payload) => {
    if(res.headersSent) return;
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(payload));
  };
  if(name === 'leaderboard' && req.method === 'GET'){
    (async () => {
      try {
        await connect();
        const [code, payload] = await routes.leaderboard();
        send(code, payload);
      } catch(err) {
        console.error('accounts: leaderboard request failed', err && err.name ? err.name : 'Error');
        send(503, { error: 'Таблица лидеров временно недоступна' });
      }
    })();
    return true;
  }
  if(!route || req.method !== 'POST'){
    send(404, { error: 'Not found' });
    return true;
  }

  let raw = '';
  let aborted = false;
  req.on('data', chunk => {
    raw += chunk;
    if(raw.length > MAX_BODY && !aborted){
      aborted = true;
      send(413, { error: 'Слишком большой запрос' });
      req.destroy();
    }
  });
  req.on('end', async () => {
    if(aborted) return;
    let body;
    try { body = JSON.parse(raw || '{}'); }
    catch(err){ send(400, { error: 'Неверный запрос' }); return; }
    if(!body || typeof body !== 'object' || Array.isArray(body)){
      send(400, { error: 'Неверный запрос' });
      return;
    }
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '';
    try {
      await connect();
      const [code, payload] = await route(body, ip);
      send(code, payload);
    } catch(err) {
      console.error('accounts: request failed', err && err.name ? err.name : 'Error');
      send(503, { error: 'База аккаунтов временно недоступна' });
    }
  });
  return true;
}

module.exports = { handle, connect, profileForToken };
