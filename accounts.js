const crypto = require('crypto');
const mongoose = require('mongoose');

const NICK_RE = /^[\p{L}\p{N}_\- ]{3,16}$/u;
const MAX_BODY = 4096;
const AVATAR_IDS = new Set(['pyro','warlord','grisha','golly','sasych','ilya','malit','arcady','illusionist','shadow','mo3gi','regina','juggernaut','sniper','vaspassir','chip','savely','shovel','tower','ancient','rune','creep','virsudi','olex']);
const HERO_IDS = new Set(['pyro','warlord','grisha','golly','sasych','ilya','malit','arcady','illusionist','shadow','electricGosha','mo3gi','tribupainer','mageHunter','regina','yosyp','dawnMaiden','exileKnight','juvsyut','chip','savely','juggernaut','earthshaker','sniper','vaspassir','virsudi','olex','psih','marin']);
const MONGODB_URI = process.env.MONGODB_URI;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/* ===== 0.9.7.9: Сенсики (валюта-осколки) и ежедневное задание ===== */
const SHARDS_PER_WIN = 500;
const DAILY_QUEST = { id: 'hero_hunter', title: 'Охотник за головами', desc: 'Убей 10 героев за день (в любых матчах)', target: 10, reward: 300 };
const MAX_QUEST_KILLS_PER_MATCH = 30;
/* 0.9.9.0: ещё два ежедневных задания за Сенсики. Прогресс считается по итогам матчей (победы и помощь в убийствах). */
const EXTRA_QUESTS = [
  { id: 'double_win', title: 'Серия побед', desc: 'Выиграй 2 матча за день', target: 2, reward: 400, field: 'wins' },
  { id: 'team_player', title: 'Командный игрок', desc: 'Помоги в 20 убийствах за день (ассисты)', target: 20, reward: 250, field: 'assists' },
  /* 0.9.9.7: ещё три задания на Сенсики */
  { id: 'marathon', title: 'Марафонец', desc: 'Сыграй 4 матча за день (победа не обязательна)', target: 4, reward: 250, field: 'games' },
  { id: 'slayer', title: 'Каратель', desc: 'Убей 25 героев за день (отдельно от «Охотника за головами»)', target: 25, reward: 450, field: 'kills' },
  { id: 'triple_win', title: 'Триумфатор', desc: 'Выиграй 3 матча за день', target: 3, reward: 650, field: 'wins' }
];
/* 0.9.9.3: платные скины за Сенсики. Цены лежат на сервере — клиент их не диктует. */
/* 0.9.9.4: все цены снижены на 9% (1500→1365, 2500→2275, 4000→3640); добавлены скины Вирсуди, Шмедика и Гриши. */
const SKIN_PRICES = {
  sniperGhillie: 341, sniperPolar: 569, sniperCrimson: 910,
  psihToxic: 341, psihFrost: 569, psihBlood: 910,
  mo3giDesert: 341, mo3giArctic: 569, mo3giNeon: 910,
  virsudiBloodMoon: 910, earthshakerMagma: 569, grishaEmerald: 341,
  /* 0.9.9.7: ВСЕ цены на скины урезаны в 4 раза (1365→341, 2275→569, 3640→910, аркана 7280→1820, иммортал 4550→1138).
     Цены продублированы в game.js — они обязаны совпадать. */
  sniperInferno: 1820, chipParrot: 1138,
  /* 0.9.9.8: АРКАНА Вирсуди — 1200 Сенсиков (цена обязана совпадать с game.js) */
  virsudiArcana: 1200
};
/* ===== 0.10.0: МАСТЕРСТВО ГЕРОЕВ. Все бойцы, 5 уровней. Уровень растёт за победы на этом герое в любом режиме.
   Награда за каждый уровень — Сенсики, забирается вручную по порядку (1 → 5). Все числа лежат только на сервере. ===== */
const MASTERY_HEROES = Array.from(HERO_IDS);   /* 0.10.0 (дополнение): мастерство есть у ВСЕХ героев */
const MASTERY_WINS = [1, 3, 6, 10, 15];          /* суммарно побед для уровней 1..5 */
const MASTERY_REWARDS = [150, 300, 500, 800, 1500]; /* Сенсики за уровни 1..5 */
const MASTERY_SET = new Set(MASTERY_HEROES);
const EXTRA_QUEST_BY_ID = Object.fromEntries(EXTRA_QUESTS.map(q => [q.id, q]));
const MAX_QUEST_ASSISTS_PER_MATCH = 40;
/* 0.9.8.6: активация «Дотасенс +» — разовая покупка навсегда. Цена хранится только на сервере. */
const DSPLUS_PRICE = 1000;
const dayKey = (time = Date.now()) => {
  try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(time)); }
  catch(err) { return new Date(time).toISOString().slice(0, 10); }
};

const participantSchema = new mongoose.Schema({
  nick: { type: String, maxlength: 24, default: '' },
  heroId: { type: String, maxlength: 40, default: '' },
  team: { type: Number, min: 0, max: 1, default: 0 },
  kills: { type: Number, min: 0, default: 0 },
  deaths: { type: Number, min: 0, default: 0 },
  assists: { type: Number, min: 0, default: 0 },
  netWorth: { type: Number, min: 0, default: 0 },
  level: { type: Number, min: 1, default: 1 },
  gold: { type: Number, min: 0, default: 0 },
  items: { type: [String], default: [] }
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
  duration: { type: Number, min: 0, default: 0 },
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
  mastery: { type: Map, of: Number, default: {} },
  masteryClaimed: { type: Map, of: Number, default: {} },
  history: { type: [matchSchema], default: [] },
  shards: { type: Number, min: 0, default: 0 },
  dsPlus: { type: Boolean, default: false },
  dsPlusAt: { type: Number, default: 0 },
  skins: { type: [String], default: [] },
  daily: {
    day: { type: String, default: '' },
    kills: { type: Number, min: 0, default: 0 },
    claimed: { type: Boolean, default: false }
  },
  quests: {
    day: { type: String, default: '' },
    wins: { type: Number, min: 0, default: 0 },
    assists: { type: Number, min: 0, default: 0 },
    kills: { type: Number, min: 0, default: 0 },
    games: { type: Number, min: 0, default: 0 },
    claimed: { type: [String], default: [] }
  },
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
/* ===== 0.10.0 (дополнение): РУКОВОДСТВА СБОРОК. Игрок собирает сборку героя из трёх этапов (начало, середина, конец).
   Сборки общие: их видят и могут выбрать в катке все игроки. ===== */
const GUIDE_STAGES = ['start', 'mid', 'end'];
const GUIDE_MAX_ITEMS = 6, GUIDE_MAX_PER_HERO = 5, GUIDE_MAX_TOTAL = 30;
const guideSchema = new mongoose.Schema({
  heroId: { type: String, maxlength: 40, index: true },
  authorKey: { type: String, maxlength: 60, index: true },
  author: { type: String, maxlength: 40, default: '' },
  title: { type: String, maxlength: 40, default: '' },
  start: { type: [String], default: [] },
  mid: { type: [String], default: [] },
  end: { type: [String], default: [] },
  updatedAt: { type: Number, default: Date.now }
});
const BuildGuide = mongoose.models.BuildGuide || mongoose.model('BuildGuide', guideSchema);
const cleanStage = v => (Array.isArray(v) ? v : []).map(x => String(x || '')).filter(x => /^[A-Za-z0-9_]{1,40}$/.test(x)).slice(0, GUIDE_MAX_ITEMS);
const guideView = (g, ownerKey) => ({ id: String(g._id), heroId: g.heroId, author: g.author, title: g.title, start: g.start, mid: g.mid, end: g.end, mine: !!ownerKey && g.authorKey === ownerKey, updatedAt: g.updatedAt });

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

function dailyState(acc){
  const today = dayKey();
  const daily = acc.daily || {};
  const fresh = daily.day === today;
  const progress = fresh ? Math.min(DAILY_QUEST.target, Math.max(0, daily.kills || 0)) : 0;
  const claimed = fresh && daily.claimed === true;
  return {
    id: DAILY_QUEST.id, title: DAILY_QUEST.title, desc: DAILY_QUEST.desc,
    target: DAILY_QUEST.target, reward: DAILY_QUEST.reward,
    progress, claimed, ready: !claimed && progress >= DAILY_QUEST.target, day: today
  };
}
/* Профиль владельца: публичные поля + личные (Сенсики и задание). В таблицу лидеров это не попадает. */
function extraQuestsState(acc){
  const today = dayKey();
  const q = acc.quests || {};
  const fresh = q.day === today;
  const claimedList = fresh && Array.isArray(q.claimed) ? q.claimed : [];
  return EXTRA_QUESTS.map(def => {
    const progress = fresh ? Math.min(def.target, Math.max(0, q[def.field] || 0)) : 0;
    const claimed = claimedList.includes(def.id);
    return { id: def.id, title: def.title, desc: def.desc, target: def.target, reward: def.reward, progress, claimed, ready: !claimed && progress >= def.target, day: today };
  });
}
function masteryState(acc){
  const toObj = m => m instanceof Map ? Object.fromEntries(m) : (m || {});
  const wins = toObj(acc.mastery), claimed = toObj(acc.masteryClaimed);
  const out = {};
  for(const id of MASTERY_HEROES) out[id] = { wins: Math.max(0, Number(wins[id]) || 0), claimed: Math.max(0, Math.min(5, Number(claimed[id]) || 0)) };
  return out;
}
const ownProfile = acc => ({ ...publicProfile(acc), shards: Math.max(0, Math.floor(acc.shards || 0)), daily: dailyState(acc), quests: extraQuestsState(acc), dsPlus: acc.dsPlus === true, dsPlusPrice: DSPLUS_PRICE, skins: Array.isArray(acc.skins) ? acc.skins.filter(id => SKIN_PRICES[id]) : [], mastery: masteryState(acc), masteryCfg: { heroes: MASTERY_HEROES, wins: MASTERY_WINS, rewards: MASTERY_REWARDS } });

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
      return [200, { token: await makeSession(nickKey), profile: ownProfile(acc) }];
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
    return [200, { token: await makeSession(acc.nickKey), profile: ownProfile(acc) }];
  },

  async me(body){
    const auth = await authed(body);
    return auth ? [200, { profile: ownProfile(auth.acc) }] : [401, { error: 'Сессия истекла, войди заново' }];
  },

  async career(body){
    const auth = await authed(body);
    if(!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    return [200, {
      profile: ownProfile(auth.acc),
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
    return [200, { profile: ownProfile(updated) }];
  },

  async avatar(body){
    const auth = await authed(body);
    if(!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    const id = String(body.avatar || '');
    if(id && !AVATAR_IDS.has(id)) return [400, { error: 'Неизвестная аватарка' }];
    await Account.updateOne({ _id: auth.acc._id }, { $set: { avatar: id } });
    const updated = await Account.findById(auth.acc._id);
    return [200, { profile: ownProfile(updated) }];
  },

  async claimdaily(body){
    const auth = await authed(body);
    if(!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    const today = dayKey();
    const claimed = await Account.findOneAndUpdate({
      _id: auth.acc._id,
      'daily.day': today,
      'daily.claimed': { $ne: true },
      'daily.kills': { $gte: DAILY_QUEST.target }
    }, {
      $set: { 'daily.claimed': true },
      $inc: { shards: DAILY_QUEST.reward }
    }, { new: true });
    if(!claimed){
      const current = await Account.findById(auth.acc._id);
      return [200, { profile: ownProfile(current), claimed: false }];
    }
    return [200, { profile: ownProfile(claimed), claimed: true, reward: DAILY_QUEST.reward }];
  },

  /* 0.9.9.0: получение награды за дополнительное задание. Атомарно: условие и начисление в одном запросе. */
  async claimquest(body){
    const auth = await authed(body);
    if(!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    const def = EXTRA_QUEST_BY_ID[String(body.questId || '')];
    if(!def) return [400, { error: 'Неизвестное задание' }];
    const today = dayKey();
    const claimed = await Account.findOneAndUpdate({
      _id: auth.acc._id,
      'quests.day': today,
      'quests.claimed': { $ne: def.id },
      ['quests.' + def.field]: { $gte: def.target }
    }, {
      $push: { 'quests.claimed': def.id },
      $inc: { shards: def.reward }
    }, { new: true });
    if(!claimed){
      const current = await Account.findById(auth.acc._id);
      return [200, { profile: ownProfile(current), claimed: false }];
    }
    return [200, { profile: ownProfile(claimed), claimed: true, reward: def.reward, questId: def.id }];
  },

  /* 0.10.0: награда за уровень мастерства героя. Уровни забираются строго по порядку; проверка и выдача — одним запросом. */
  async claimmastery(body){
    const auth = await authed(body);
    if(!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    const heroId = String(body.heroId || '');
    const level = Math.floor(Number(body.level) || 0);
    if(!MASTERY_SET.has(heroId) || level < 1 || level > MASTERY_WINS.length) return [400, { error: 'Неверный уровень мастерства' }];
    const cond = level === 1 ? { $or: [{ ['masteryClaimed.' + heroId]: { $exists: false } }, { ['masteryClaimed.' + heroId]: 0 }] } : { ['masteryClaimed.' + heroId]: level - 1 };
    const reward = MASTERY_REWARDS[level - 1];
    const claimed = await Account.findOneAndUpdate({
      _id: auth.acc._id,
      ['mastery.' + heroId]: { $gte: MASTERY_WINS[level - 1] },
      ...cond
    }, {
      $set: { ['masteryClaimed.' + heroId]: level },
      $inc: { shards: reward }
    }, { new: true });
    if(!claimed){
      const current = await Account.findById(auth.acc._id);
      return [200, { profile: ownProfile(current), claimed: false }];
    }
    return [200, { profile: ownProfile(claimed), claimed: true, reward, heroId, level }];
  },

  /* ===== РУКОВОДСТВА СБОРОК ===== */
  async saveguide(body){
    const auth = await authed(body);
    if(!auth) return [401, { error: 'Войди в аккаунт, чтобы создавать сборки' }];
    const heroId = String(body.heroId || '');
    if(!HERO_IDS.has(heroId)) return [400, { error: 'Неизвестный герой' }];
    const title = String(body.title || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 28) || 'Моя сборка';
    const stages = {}; for(const k of GUIDE_STAGES) stages[k] = cleanStage(body[k]);
    if(!GUIDE_STAGES.some(k => stages[k].length)) return [400, { error: 'Добавь в сборку хотя бы один предмет' }];
    const key = auth.acc.nickKey;
    const gid = String(body.id || '');
    if(/^[a-f0-9]{24}$/.test(gid)){
      const upd = await BuildGuide.findOneAndUpdate({ _id: gid, authorKey: key, heroId }, { $set: { title, ...stages, author: auth.acc.nick, updatedAt: Date.now() } }, { new: true });
      if(upd) return [200, { guide: guideView(upd, key) }];
    }
    if(await BuildGuide.countDocuments({ authorKey: key, heroId }) >= GUIDE_MAX_PER_HERO) return [400, { error: 'На одного героя можно создать не больше ' + GUIDE_MAX_PER_HERO + ' сборок' }];
    if(await BuildGuide.countDocuments({ authorKey: key }) >= GUIDE_MAX_TOTAL) return [400, { error: 'Достигнут лимит сборок' }];
    const made = await BuildGuide.create({ heroId, authorKey: key, author: auth.acc.nick, title, ...stages, updatedAt: Date.now() });
    return [200, { guide: guideView(made, key) }];
  },

  async deleteguide(body){
    const auth = await authed(body);
    if(!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    const gid = String(body.id || '');
    if(!/^[a-f0-9]{24}$/.test(gid)) return [400, { error: 'Неверная сборка' }];
    await BuildGuide.deleteOne({ _id: gid, authorKey: auth.acc.nickKey });
    return [200, { ok: true }];
  },

  /* Список сборок героя: свои (если передан токен) и сборки других игроков, новые сверху. Токен необязателен. */
  async listguides(body){
    const heroId = String(body.heroId || '');
    if(!HERO_IDS.has(heroId)) return [400, { error: 'Неизвестный герой' }];
    let key = '';
    if(body.token){ const auth = await authed(body); if(auth) key = auth.acc.nickKey; }
    const list = await BuildGuide.find({ heroId }).sort({ updatedAt: -1 }).limit(40).lean();
    list.sort((a, b) => (b.authorKey === key) - (a.authorKey === key) || b.updatedAt - a.updatedAt);
    return [200, { guides: list.map(g => guideView(g, key)) }];
  },

  /* Покупка «Дотасенс +». Одна атомарная операция: условие (не куплено И хватает Сенсиков) и списание
     выполняются в одном запросе к MongoDB, поэтому двойной клик или две вкладки не спишут баланс дважды. */
  async buyplus(body){
    const auth = await authed(body);
    if(!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    const bought = await Account.findOneAndUpdate({
      _id: auth.acc._id,
      dsPlus: { $ne: true },
      shards: { $gte: DSPLUS_PRICE }
    }, {
      $inc: { shards: -DSPLUS_PRICE },
      $set: { dsPlus: true, dsPlusAt: Date.now() }
    }, { new: true });
    if(bought) return [200, { profile: ownProfile(bought), bought: true, price: DSPLUS_PRICE }];
    const current = await Account.findById(auth.acc._id);
    if(current && current.dsPlus === true) return [200, { profile: ownProfile(current), bought: false, already: true }];
    return [409, { error: 'Не хватает Сенсиков: нужно ' + DSPLUS_PRICE, profile: current ? ownProfile(current) : undefined }];
  },

  /* 0.9.9.3: покупка скина за Сенсики. Одна атомарная операция: скин ещё не куплен И хватает Сенсиков. */
  async buyskin(body){
    const auth = await authed(body);
    if(!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    const skinId = String(body.skinId || '');
    const price = Object.prototype.hasOwnProperty.call(SKIN_PRICES, skinId) ? SKIN_PRICES[skinId] : 0;
    if(!price) return [400, { error: 'Неизвестный скин' }];
    const bought = await Account.findOneAndUpdate({
      _id: auth.acc._id,
      skins: { $ne: skinId },
      shards: { $gte: price }
    }, {
      $inc: { shards: -price },
      $push: { skins: skinId }
    }, { new: true });
    if(bought) return [200, { profile: ownProfile(bought), bought: true, skinId, price }];
    const current = await Account.findById(auth.acc._id);
    if(current && Array.isArray(current.skins) && current.skins.includes(skinId)) return [200, { profile: ownProfile(current), bought: false, already: true, skinId }];
    return [409, { error: 'Не хватает Сенсиков: нужно ' + price, profile: current ? ownProfile(current) : undefined }];
  },

  async result(body){
    const auth = await authed(body);
    if(!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    const now = Date.now();
    const matchId = typeof body.matchId === 'string' && /^[a-z0-9]{6,40}$/i.test(body.matchId) ? body.matchId : null;
    const account = auth.acc;
    if(matchId && account.recent.includes(matchId)) return [200, { profile: ownProfile(account), ignored: true }];

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
      netWorth: Math.round(clamp(Number(player.netWorth) || 0, 0, 100000000)),
      level: Math.round(clamp(Number(player.level) || 1, 1, 99)),
      gold: Math.round(clamp(Number(player.gold) || 0, 0, 100000000)),
      items: (Array.isArray(player.items) ? player.items.slice(0, 6) : [])
        .map(id => typeof id === 'string' && /^[A-Za-z0-9_]{1,32}$/.test(id) ? id : '')
    })) : [];
    const duration = Math.round(clamp(Number(inputStats.duration) || 0, 0, 86400));

    const recentTimes = account.times.filter(time => now - time < 3600000);
    if(recentTimes.length >= 40) return [200, { profile: ownProfile(account), ignored: true }];

    if(!account.xp && account.level > 0){
      await Account.updateOne({ _id: account._id, xp: 0 }, { $set: { xp: account.level * 500 } });
    }

    if(!matchId){
      const session = await Session.findOneAndUpdate({
        _id: auth.session._id,
        $or: [{ lastResult: { $exists: false } }, { lastResult: { $lt: now - 60000 } }]
      }, { $set: { lastResult: now } }, { new: true }).lean();
      if(!session) return [200, { profile: ownProfile(account), ignored: true }];
    }

    const won = body.won === true;
    const xpGained = 100 + kills * 12 + assists * 5 + (won ? 100 : 0);
    const ratingChange = body.ranked === true ? (won ? 50 : -40) : 0;
    const filter = { _id: account._id };
    if(matchId) filter.recent = { $ne: matchId };
    /* Сенсики: +500 за победу. Ежедневное задание считает убийства героев за текущие сутки (Киев). */
    const shardsGained = won ? SHARDS_PER_WIN : 0;
    const today = dayKey();
    const questKills = Math.min(kills, MAX_QUEST_KILLS_PER_MATCH);
    const sameDay = account.daily && account.daily.day === today;
    const questAssists = Math.min(assists, MAX_QUEST_ASSISTS_PER_MATCH);
    const questSameDay = account.quests && account.quests.day === today;
    const update = {
      $inc: {
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        xp: xpGained,
        kills,
        deaths,
        rating: ratingChange,
        shards: shardsGained,
        ...(sameDay ? { 'daily.kills': questKills } : {}),
        ...(questSameDay ? { 'quests.wins': won ? 1 : 0, 'quests.assists': questAssists, 'quests.kills': questKills, 'quests.games': 1 } : {}),
        ...(heroId ? { ['heroStats.' + heroId]: 1 } : {}),
        ...(won && MASTERY_SET.has(heroId) ? { ['mastery.' + heroId]: 1 } : {})
      },
      $set: {
        times: recentTimes.concat(now),
        ...(sameDay ? {} : { 'daily.day': today, 'daily.kills': questKills, 'daily.claimed': false }),
        ...(questSameDay ? {} : { 'quests.day': today, 'quests.wins': won ? 1 : 0, 'quests.assists': questAssists, 'quests.kills': questKills, 'quests.games': 1, 'quests.claimed': [] })
      },
      $push: {
        history: { $each: [{
          matchId: matchId || '', won, heroId, kills, deaths, assists, netWorth, winnerTeam, duration,
          xpGained, ratingChange, playedAt: now, participants
        }], $position: 0, $slice: 20 }
      }
    };
    if(matchId) update.$push.recent = { $each: [matchId], $slice: -60 };
    const updated = await Account.findOneAndUpdate(filter, update, { new: true });

    if(!updated) return [200, { profile: ownProfile(await Account.findById(account._id)), ignored: true }];
    const earnedLevel = Math.floor((updated.xp || 0) / 500);
    if(earnedLevel > updated.level){
      await Account.updateOne({ _id: updated._id }, { $max: { level: earnedLevel } });
      updated.level = earnedLevel;
    }
    if(updated.rating < 0){
      await Account.updateOne({ _id: updated._id, rating: { $lt: 0 } }, { $set: { rating: 0 } });
      updated.rating = 0;
    }
    return [200, { profile: ownProfile(updated) }];
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
