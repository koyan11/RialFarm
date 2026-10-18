/**
 * server.mjs — Dev server Node.js untuk Lembah Kenanga
 *
 * Menggantikan tools/serve.py, menyajikan static files + API backend.
 * Data pemain disimpan di var/players.json (tanpa dependensi eksternal).
 *
 * Jalankan:
 *   node server.mjs [port]
 * Default port: 8080
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.argv[2] || '8080', 10);
const DATA_DIR = path.join(__dirname, 'var');
const DB_PATH = path.join(DATA_DIR, 'players.json');

// ── Database JSON sederhana ─────────────────────────────────────────────────
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '{}', 'utf8');

function loadDB() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return {}; }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function genKey() {
  return crypto.randomBytes(18).toString('base64url');
}

// ── Validasi username ───────────────────────────────────────────────────────
const USERNAME_RE = /^[A-Za-z0-9]{3,16}$/;
function validateUsername(u) {
  if (!u || typeof u !== 'string' || !u.trim()) return 'Username belum diisi.';
  const s = u.trim();
  if (s.length < 3) return 'Username minimal 3 karakter.';
  if (s.length > 16) return 'Username maksimal 16 karakter.';
  if (!USERNAME_RE.test(s)) return 'Username hanya boleh huruf dan angka, tanpa spasi.';
  return null;
}

// ── API handlers ─────────────────────────────────────────────────────────────
function findPlayer(db, username) {
  const key = Object.keys(db).find(k => k.toLowerCase() === username.trim().toLowerCase());
  return key ? db[key] : null;
}

function handleAPI(path_, body) {
  const db = loadDB();

  // POST /api/player/check
  if (path_ === '/api/player/check') {
    const { username } = body;
    const err = validateUsername(username);
    if (err) return { ok: true, available: false, reason: err };
    const exists = findPlayer(db, username);
    if (exists) return { ok: true, available: false, reason: `Username "${username.trim()}" sudah dipakai.` };
    return { ok: true, available: true, reason: '' };
  }

  // POST /api/player/register
  if (path_ === '/api/player/register') {
    const { username, profile } = body;
    const err = validateUsername(username);
    if (err) return { ok: false, error: err };
    const u = username.trim();
    if (findPlayer(db, u)) return { ok: false, error: `Username "${u}" sudah dipakai. Coba yang lain.` };
    const key = genKey();
    db[u] = { username: u, profile: profile || {}, save: null, keyHash: hashKey(key), createdAt: Date.now() };
    saveDB(db);
    return { ok: true, username: u, key };
  }

  // POST /api/player/resume
  if (path_ === '/api/player/resume') {
    const { username } = body;
    const err = validateUsername(username);
    if (err) return { ok: false, error: err };
    const player = findPlayer(db, username);
    if (!player) return { ok: false, error: 'Username itu belum terdaftar.' };
    const key = genKey();
    player.keyHash = hashKey(key);
    saveDB(db);
    return { ok: true, username: player.username, key, profile: player.profile || {}, save: player.save || null };
  }

  // POST /api/player/save
  if (path_ === '/api/player/save') {
    const { username, key, profile, save } = body;
    const err = validateUsername(username);
    if (err) return { ok: false, error: err };
    const player = findPlayer(db, username);
    if (!player) return { ok: false, error: 'Username itu belum terdaftar.' };
    if (!player.keyHash || player.keyHash !== hashKey(key || '')) return { ok: false, error: 'Sesi tidak sah. Muat ulang halaman.' };
    if (typeof save !== 'object') return { ok: false, error: 'Bentuk simpanan salah.' };
    const blob = JSON.stringify(save);
    if (blob.length > 256 * 1024) return { ok: false, error: 'Simpanan terlalu besar.' };
    player.profile = profile || player.profile;
    player.save = save;
    player.savedAt = Date.now();
    saveDB(db);
    return { ok: true };
  }

  return null; // bukan API ini
}

// ── MIME types ───────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript',
  '.mjs':  'text/javascript',
  '.json': 'application/json',
  '.css':  'text/css',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.mp3':  'audio/mpeg',
  '.ogg':  'audio/ogg',
  '.wav':  'audio/wav',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// ── Server utama ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // CORS headers (untuk dev lokal)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  // Handle API
  if (pathname.startsWith('/api/player/')) {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Metode tidak didukung.' }));
      return;
    }
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => {
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch {}
      const result = handleAPI(pathname, body);
      if (result) {
        res.writeHead(result.ok === false ? (result.error?.includes('sudah dipakai') ? 409 : 400) : 200,
          { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Endpoint tidak dikenal.' }));
      }
    });
    return;
  }

  // Static file serving
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);

  // Cegah path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  // Kalau directory, coba index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404); res.end('Not found: ' + pathname); return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🌾 Lembah Kenanga dev server berjalan!`);
  console.log(`   http://localhost:${PORT}/\n`);
  console.log(`   Data pemain: ${DB_PATH}`);
  console.log(`   Tekan Ctrl+C untuk berhenti.\n`);
});
