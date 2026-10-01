/* Аккаунты DotaSense: регистрация, вход, смена ника, прогресс уровня.
   Только встроенные модули Node. Данные хранятся в JSON-файле.
   На Render (free) диск стирается при деплое — для постоянного хранения
   подключи Disk и укажи путь в переменной окружения DATA_DIR. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'accounts.json');
const NICK_RE = /^[\p{L}\p{N}_\- ]{3,16}$/u;
const MAX_BODY = 4096;

let db = { accounts: {}, sessions: {} };
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
} catch (err) { console.error('accounts: не удалось прочитать базу', err.message); }
db.accounts ||= {}; db.sessions ||= {};

let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const tmp = DB_FILE + '.tmp';
    try { fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, DB_FILE); }
    catch (err) { console.error('accounts: не удалось сохранить', err.message); }
  }, 150);
}

const keyOf = nick => nick.trim().toLowerCase();
const hashPassword = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
const publicProfile = acc => ({ nick: acc.nick, level: acc.level, wins: acc.wins, losses: acc.losses });

function makeSession(key) {
  const token = crypto.randomBytes(24).toString('hex');
  db.sessions[token] = { key, created: Date.now() };
  save();
  return token;
}
function authed(body) {
  const session = db.sessions[String(body.token || '')];
  const acc = session && db.accounts[session.key];
  return acc ? { acc, session } : null;
}

/* Простой лимит попыток по IP: 20 запросов входа/регистрации за минуту. */
const attempts = new Map();
function tooMany(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter(t => now - t < 60000);
  list.push(now);
  attempts.set(ip, list);
  return list.length > 20;
}

function validateNick(nick) {
  if (typeof nick !== 'string') return 'Введи ник';
  nick = nick.trim().replace(/\s+/g, ' ');
  if (!NICK_RE.test(nick)) return 'Ник: 3–16 символов (буквы, цифры, _ - пробел)';
  return null;
}
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 4 || password.length > 64) return 'Пароль: от 4 до 64 символов';
  return null;
}

const routes = {
  register(body, ip) {
    if (tooMany(ip)) return [429, { error: 'Слишком много попыток, подожди минуту' }];
    const nickErr = validateNick(body.nick) || validatePassword(body.password);
    if (nickErr) return [400, { error: nickErr }];
    const nick = body.nick.trim().replace(/\s+/g, ' ');
    const key = keyOf(nick);
    if (db.accounts[key]) return [409, { error: 'Этот ник уже занят' }];
    const salt = crypto.randomBytes(16).toString('hex');
    db.accounts[key] = { nick, salt, hash: hashPassword(body.password, salt), level: 0, wins: 0, losses: 0, created: Date.now() };
    return [200, { token: makeSession(key), profile: publicProfile(db.accounts[key]) }];
  },
  login(body, ip) {
    if (tooMany(ip)) return [429, { error: 'Слишком много попыток, подожди минуту' }];
    const acc = db.accounts[keyOf(String(body.nick || ''))];
    if (!acc || typeof body.password !== 'string') return [401, { error: 'Неверный ник или пароль' }];
    const given = Buffer.from(hashPassword(body.password, acc.salt), 'hex');
    const real = Buffer.from(acc.hash, 'hex');
    if (given.length !== real.length || !crypto.timingSafeEqual(given, real)) return [401, { error: 'Неверный ник или пароль' }];
    return [200, { token: makeSession(keyOf(acc.nick)), profile: publicProfile(acc) }];
  },
  me(body) {
    const auth = authed(body);
    return auth ? [200, { profile: publicProfile(auth.acc) }] : [401, { error: 'Сессия истекла, войди заново' }];
  },
  logout(body) {
    delete db.sessions[String(body.token || '')];
    save();
    return [200, { ok: true }];
  },
  nick(body) {
    const auth = authed(body);
    if (!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    const err = validateNick(body.newNick);
    if (err) return [400, { error: err }];
    const nick = body.newNick.trim().replace(/\s+/g, ' ');
    const newKey = keyOf(nick), oldKey = keyOf(auth.acc.nick);
    if (newKey !== oldKey) {
      if (db.accounts[newKey]) return [409, { error: 'Этот ник уже занят' }];
      db.accounts[newKey] = auth.acc;
      delete db.accounts[oldKey];
      for (const session of Object.values(db.sessions)) if (session.key === oldKey) session.key = newKey;
    }
    auth.acc.nick = nick;
    save();
    return [200, { profile: publicProfile(auth.acc) }];
  },
  /* Результат матча. Клиент присылает только факт победы/поражения;
     уровень = количество побед (каждая победа над ботами или игроками +1). */
  result(body) {
    const auth = authed(body);
    if (!auth) return [401, { error: 'Сессия истекла, войди заново' }];
    const now = Date.now();
    if (auth.session.lastResult && now - auth.session.lastResult < 60000) return [200, { profile: publicProfile(auth.acc), ignored: true }];
    auth.session.lastResult = now;
    if (body.won === true) { auth.acc.wins += 1; auth.acc.level += 1; } else auth.acc.losses += 1;
    save();
    return [200, { profile: publicProfile(auth.acc) }];
  }
};

/* Возвращает true, если запрос обработан как API. */
function handle(req, res) {
  if (!req.url.startsWith('/api/')) return false;
  const name = req.url.slice(5).split('?')[0];
  const route = routes[name];
  const send = (code, payload) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(payload));
  };
  if (!route || req.method !== 'POST') { send(404, { error: 'Not found' }); return true; }
  let raw = '';
  let aborted = false;
  req.on('data', chunk => {
    raw += chunk;
    if (raw.length > MAX_BODY && !aborted) { aborted = true; send(413, { error: 'Слишком большой запрос' }); req.destroy(); }
  });
  req.on('end', () => {
    if (aborted) return;
    let body;
    try { body = JSON.parse(raw || '{}'); } catch (err) { return send(400, { error: 'Неверный запрос' }); }
    if (!body || typeof body !== 'object') return send(400, { error: 'Неверный запрос' });
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || '';
    try { const [code, payload] = route(body, ip); send(code, payload); }
    catch (err) { console.error('accounts:', err); send(500, { error: 'Ошибка сервера' }); }
  });
  return true;
}

module.exports = { handle };
