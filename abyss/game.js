'use strict';
// =====================================================================
//  심연 원정 — 오리지널 2D 던전 액션
// =====================================================================
const D = window.GAME_DATA;
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 960, H = 540, TS = 32, MW = 72, MH = 52;
let SC = 1, DPR = 1;
function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  SC = Math.min(innerWidth / W, innerHeight / H);
  cv.style.width = W * SC + 'px'; cv.style.height = H * SC + 'px';
  cv.width = Math.round(W * SC * DPR); cv.height = Math.round(H * SC * DPR);
}
addEventListener('resize', resize); resize();

// ---------- utils
const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b, c, d) => Math.hypot(c - a, d - b), angTo = (a, b, c, d) => Math.atan2(d - b, c - a);
const pick = a => a[Math.random() * a.length | 0];
function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; }
const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000;
const FONT = '"Noto Sans KR","Malgun Gothic","Apple SD Gothic Neo",sans-serif';
const TFONT = '"Black Han Sans","Noto Sans KR",sans-serif';

// ---------- optional images
const IMGS = {};
function loadImg(key, src) { if (!src) return; const im = new Image(); im.onload = () => IMGS[key] = im; im.src = src; }
loadImg('hero', D.hero.img);
for (const k in D.monsters) loadImg(k, D.monsters[k].img);
for (const k in D.bosses) loadImg(k, D.bosses[k].img);
function drawImgSprite(key, r, flip, scale = 1) {
  const im = IMGS[key]; if (!im) return false;
  const h = r * 3.2 * scale, w = h * im.width / im.height;
  ctx.save(); if (flip) ctx.scale(-1, 1); ctx.drawImage(im, -w / 2, -h * 0.78, w, h); ctx.restore(); return true;
}

// ---------- input
const keys = {}; let pressed = {};
const mouse = { x: W / 2, y: H / 2, down: false, clicked: false };
addEventListener('keydown', e => { if (!keys[e.code]) pressed[e.code] = true; keys[e.code] = true; if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); audioInit(); });
addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });
cv.addEventListener('mousemove', e => { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / SC; mouse.y = (e.clientY - r.top) / SC; });
cv.addEventListener('mousedown', e => { audioInit(); if (e.button === 0) { mouse.down = true; mouse.clicked = true; } if (e.button === 2) pressed.Mouse2 = true; });
addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());

// ---------- audio
let AC = null, muted = false;
function audioInit() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } else if (AC.state === 'suspended') AC.resume(); }
function tone(f, d, type = 'square', v = 0.06, slide = 0, delay = 0) {
  if (!AC || muted) return; const t = AC.currentTime + delay;
  const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + d + 0.02);
}
let NB = null;
function noise(d, v = 0.1, f = 1200, q = 1) {
  if (!AC || muted) return;
  if (!NB) { NB = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); const a = NB.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1; }
  const s = AC.createBufferSource(); s.buffer = NB; const fl = AC.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = f; fl.Q.value = q;
  const g = AC.createGain(); g.gain.setValueAtTime(v, AC.currentTime); g.gain.exponentialRampToValueAtTime(0.0008, AC.currentTime + d);
  s.connect(fl); fl.connect(g); g.connect(AC.destination); s.start(); s.stop(AC.currentTime + d + 0.02);
}
const SFX = {
  swing: () => noise(0.14, 0.07, 2600), heavy: () => { noise(0.22, 0.12, 1400); tone(90, 0.2, 'sawtooth', 0.05, -40); },
  hit: () => { noise(0.09, 0.16, 900); tone(140, 0.08, 'square', 0.04, -70); },
  hurt: () => { tone(220, 0.18, 'sawtooth', 0.07, -140); noise(0.12, 0.1, 700); },
  dodge: () => noise(0.16, 0.06, 4000), pickup: () => { tone(880, 0.06, 'triangle', 0.05); tone(1320, 0.08, 'triangle', 0.04, 0, 0.05); },
  rune: () => tone(1100 + Math.random() * 300, 0.05, 'triangle', 0.025),
  soul: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.05, 0, i * 0.08)); },
  kill: () => { noise(0.2, 0.1, 600); tone(160, 0.2, 'triangle', 0.05, -100); },
  boom: () => { noise(0.45, 0.2, 500); tone(70, 0.4, 'sine', 0.12, -40); },
  shoot: () => tone(500, 0.12, 'square', 0.03, -250), ui: () => tone(660, 0.05, 'square', 0.03),
  rage: () => { tone(110, 0.5, 'sawtooth', 0.09, 60); noise(0.5, 0.12, 800); },
  level: () => { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.22, 'square', 0.04, 0, i * 0.09)); },
  potion: () => { tone(400, 0.25, 'sine', 0.06, 400); }, portal: () => { tone(200, 0.8, 'sine', 0.07, 600); },
  crack: () => { noise(0.2, 0.18, 1800); tone(300, 0.1, 'square', 0.03, -200); }, roar: () => { tone(80, 0.9, 'sawtooth', 0.1, -30); noise(0.8, 0.12, 400); },
};

// ---------- save
const SAVE_KEY = 'abyss_expedition_v1';
const DEFAULT_SAVE = { runes: 40, wpn: 0, arm: 0, potMax: 3, slots: 3, souls: [], level: 1, xp: 0, best: 0, checkpoint: 1, clears: 0, deaths: 0, seenTut: false };
let save = Object.assign({}, DEFAULT_SAVE);
try { const s = localStorage.getItem(SAVE_KEY); if (s) save = Object.assign({}, DEFAULT_SAVE, JSON.parse(s)); } catch (e) { }
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } }

const xpNeed = l => Math.floor(24 * Math.pow(l, 1.55));
const wpnCost = () => Math.floor(30 * Math.pow(1.55, save.wpn));
const armCost = () => Math.floor(30 * Math.pow(1.55, save.arm));
const potCost = () => 60 * (save.potMax - 2);
const slotCost = () => 600;

function calcStats() {
  const l = save.level;
  const s = { maxHp: 100 + (l - 1) * 12 + save.arm * 16, atk: 12 + (l - 1) * 2 + save.wpn * 4, def: save.arm * 2, spd: 155, crit: 0.06, critMul: 1.8, regen: 0, life: 0, aspd: 1 };
  const has = id => save.souls.includes(id);
  if (has('rat')) s.spd *= 1.1; if (has('skel')) s.def += 4; if (has('shroom')) s.regen += 1;
  if (has('wolf')) s.atk += 4; if (has('newt')) s.crit += 0.05; if (has('golem')) s.maxHp += 30;
  if (has('spider')) s.aspd += 0.1; if (has('wraith')) s.life += 0.04;
  if (has('ratking')) { s.atk *= 1.1; s.regen += 2; } if (has('warden')) { s.def += 10; s.maxHp += 40; }
  if (has('eye')) { s.crit += 0.1; s.critMul += 0.5; }
  s.atk = Math.round(s.atk); return s;
}

// ---------- world state
let state = 'title', paused = false, gtime = 0;
let ents = [], projs = [], parts = [], floats = [], picks = [], zones = [], warns = [], beams = [], fx = [], props = [];
let cam = { x: 0, y: 0 }, shakeT = 0, shakeM = 0, hitStop = 0, flashT = 0, flashCol = '#fff';
let FL = null, floorT = 0, overSpawn = 0, runRunes = 0, runKills = 0, bossRef = null, flow = null, flowKey = -1, startFloor = 1;
let msgs = [], bannerO = null, soulPending = null, uiButtons = [], deathInfo = null, P = null, tutT = 0;

function msg(t, col = '#fff') { msgs.push({ t, col, life: 3.5 }); if (msgs.length > 5) msgs.shift(); }
function banner(t, sub = '', col = '#ffd27a') { bannerO = { t, sub, col, life: 3 }; }
function shake(m, t = 0.25) { shakeM = Math.max(shakeM, m); shakeT = Math.max(shakeT, t); }
function floatTxt(x, y, t, col = '#fff', size = 14) { floats.push({ x, y, t: String(t), col, size, life: 0.9, vy: -40 }); }
function part(x, y, o = {}) { if (parts.length > 900) return; parts.push(Object.assign({ x, y, vx: rnd(-60, 60), vy: rnd(-60, 60), life: 0.5, max: 0.5, col: '#fff', size: 3, g: 0, drag: 0.9, glow: false, shape: 'sq' }, o)); }
function burst(x, y, n, col, sp = 140, size = 3, life = 0.5, glow = false) {
  for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(sp * 0.3, sp); const l = rnd(life * 0.5, life); part(x, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, col, size: rnd(size * 0.6, size * 1.3), life: l, max: l, glow }); }
}

// ---------- map
const T = () => FL.tiles;
function tileAt(tx, ty) { if (tx < 0 || ty < 0 || tx >= MW || ty >= MH) return 1; return FL.tiles[ty * MW + tx]; }
function solidAt(px, py) { const t = tileAt(Math.floor(px / TS), Math.floor(py / TS)); return t === 1 || t === 2; }
function collides(x, y, r) {
  if (solidAt(x, y)) return true;
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; if (solidAt(x + Math.cos(a) * r, y + Math.sin(a) * r)) return true; }
  return false;
}
function moveEnt(e, dx, dy) {
  let moved = true; const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 8) || 1; const sx = dx / steps, sy = dy / steps;
  for (let i = 0; i < steps; i++) {
    if (!collides(e.x + sx, e.y, e.r)) e.x += sx; else moved = false;
    if (!collides(e.x, e.y + sy, e.r)) e.y += sy; else moved = false;
  }
  return moved;
}
function los(x1, y1, x2, y2) { const d = dist(x1, y1, x2, y2), n = Math.ceil(d / 14); for (let i = 1; i < n; i++) { const t = i / n; if (solidAt(lerp(x1, x2, t), lerp(y1, y2, t))) return false; } return true; }

function genFloor(f) {
  const theme = D.themes[Math.min(D.themes.length - 1, Math.floor((f - 1) / 3))];
  FL = { f, tiles: new Uint8Array(MW * MH).fill(1), seen: new Uint8Array(MW * MH), rooms: [], torches: [], decor: [], cracks: {}, theme, boss: f % 3 === 0 };
  const tl = FL.tiles;
  const carve = (x, y) => { if (x > 0 && y > 0 && x < MW - 1 && y < MH - 1) tl[y * MW + x] = 0; };
  const carveRect = r => { for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) carve(x, y); };
  const cx = r => Math.floor(r.x + r.w / 2), cy = r => Math.floor(r.y + r.h / 2);
  const rooms = FL.rooms;
  function corridorPath(x1, y1, x2, y2) { const p = []; const hf = Math.random() < 0.5; let x = x1, y = y1; p.push([x, y]); if (hf) { while (x !== x2) { x += Math.sign(x2 - x); p.push([x, y]); } while (y !== y2) { y += Math.sign(y2 - y); p.push([x, y]); } } else { while (y !== y2) { y += Math.sign(y2 - y); p.push([x, y]); } while (x !== x2) { x += Math.sign(x2 - x); p.push([x, y]); } } return p; }
  function corridor(x1, y1, x2, y2) { for (const [x, y] of corridorPath(x1, y1, x2, y2)) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) carve(x + a, y + b); }
  if (FL.boss) {
    rooms.push({ x: 4, y: 21, w: 9, h: 9 });
    rooms.push({ x: 28, y: 9, w: 34, h: 32, arena: true });
    rooms.forEach(carveRect); corridor(cx(rooms[0]), cy(rooms[0]), rooms[1].x + 1, cy(rooms[1]));
    // pillars
    const a = rooms[1];[[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]].forEach(([u, v]) => { const px = Math.floor(a.x + a.w * u), py = Math.floor(a.y + a.h * v); for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) tl[(py + y) * MW + px + x] = 1; });
  } else {
    let tries = 0; const target = 11 + Math.min(4, Math.floor(f / 3));
    while (rooms.length < target && tries++ < 600) {
      const w = ri(7, 13), h = ri(6, 10), x = ri(2, MW - w - 3), y = ri(2, MH - h - 3);
      if (rooms.every(o => x + w + 2 < o.x || o.x + o.w + 2 < x || y + h + 2 < o.y || o.y + o.h + 2 < y)) rooms.push({ x, y, w, h });
    }
    rooms.forEach(carveRect);
    const conn = [rooms[0]], rest = rooms.slice(1);
    while (rest.length) {
      let best = null, bd = 1e9, bi = 0;
      for (let i = 0; i < rest.length; i++) for (const c of conn) { const d = Math.abs(cx(rest[i]) - cx(c)) + Math.abs(cy(rest[i]) - cy(c)); if (d < bd) { bd = d; best = c; bi = i; } }
      corridor(cx(rest[bi]), cy(rest[bi]), cx(best), cy(best)); conn.push(rest.splice(bi, 1)[0]);
    }
    for (let k = 0; k < 3; k++) { const a = pick(rooms), b = pick(rooms); if (a !== b) corridor(cx(a), cy(a), cx(b), cy(b)); }
    // secret room
    for (let t = 0; t < 300; t++) {
      const w = 5, h = 5, x = ri(2, MW - w - 3), y = ri(2, MH - h - 3); let ok = true;
      for (let yy = y - 2; yy < y + h + 2 && ok; yy++) for (let xx = x - 2; xx < x + w + 2; xx++) if (tileAt(xx, yy) !== 1) { ok = false; break; }
      if (!ok) continue;
      let near = null, nd = 1e9; for (const r of rooms) { const d = Math.abs(cx(r) - (x + 2)) + Math.abs(cy(r) - (y + 2)); if (d < nd) { nd = d; near = r; } }
      if (nd > 16) continue;
      const sr = { x, y, w, h, secret: true }; const path = corridorPath(cx(near), cy(near), x + 2, y + 2);
      const was = path.map(([px, py]) => tileAt(px, py)); carveRect(sr);
      let crackSet = false;
      for (let i = 0; i < path.length; i++) { const [px, py] = path[i]; if (was[i] === 1 && tileAt(px, py) === 1) { if (!crackSet) { tl[py * MW + px] = 2; FL.cracks[py * MW + px] = 3; crackSet = true; } else carve(px, py); } }
      if (crackSet) { sr.chest = true; FL.secret = sr; }
      break;
    }
  }
  // torches & decor
  for (const r of rooms) {
    const n = r.arena ? 8 : ri(1, 2);
    for (let i = 0; i < n * 4 && FL.torches.filter(t => t.room === r).length < n; i++) { const x = ri(r.x, r.x + r.w - 1); if (tileAt(x, r.y - 1) === 1 && !FL.torches.some(t => Math.abs(t.tx - x) < 3 && t.ty === r.y - 1)) FL.torches.push({ tx: x, ty: r.y - 1, room: r }); }
    const nd = Math.floor(r.w * r.h / 14);
    for (let i = 0; i < nd; i++) FL.decor.push({ x: (rnd(r.x, r.x + r.w)) * TS, y: rnd(r.y, r.y + r.h) * TS, k: ri(0, 4), s: rnd(0.7, 1.3) });
  }
}

function roomCenter(r) { return { x: (r.x + r.w / 2) * TS, y: (r.y + r.h / 2) * TS }; }
function randInRoom(r, m = 1) { return { x: (rnd(r.x + m, r.x + r.w - m)) * TS, y: rnd(r.y + m, r.y + r.h - m) * TS }; }

function spawnMonster(type, x, y, f) {
  const d = D.monsters[type]; const hm = 1 + (f - 1) * 0.24, am = 1 + (f - 1) * 0.16;
  const e = { type, d, x, y, r: d.r, hp: Math.round(d.hp * hm), max: Math.round(d.hp * hm), atk: d.atk * am, spd: d.spd * rnd(0.9, 1.1), cdT: rnd(0.5, 1.5), windT: 0, hitF: 0, stunT: 0, slowT: 0, poisonT: 0, poisonD: 0, kx: 0, ky: 0, aggro: false, dir: 1, anim: rnd(0, 10), wander: { a: rnd(0, 6.28), t: 0 }, alpha: 1 };
  if (collides(x, y, e.r)) { // nudge
    for (let i = 0; i < 20; i++) { const nx = x + rnd(-40, 40), ny = y + rnd(-40, 40); if (!collides(nx, ny, e.r)) { e.x = nx; e.y = ny; break; } }
    if (collides(e.x, e.y, e.r)) return null;
  }
  ents.push(e); return e;
}
function spawnBoss(type, x, y, f) {
  const d = D.bosses[type]; const tier = Math.floor((f - 1) / 9); const m = 1 + tier * 0.9 + Math.max(0, f - 9) * 0.04;
  const e = { boss: true, type, d, x, y, r: d.r, hp: Math.round(d.hp * m), max: Math.round(d.hp * m), atk: d.atk * (1 + tier * 0.6), spd: 75, t: 2.5, act: null, actT: 0, hitF: 0, stunT: 0, slowT: 0, poisonT: 0, poisonD: 0, kx: 0, ky: 0, aggro: false, dir: 1, anim: 0, alpha: 1, summoned: 0, woke: false };
  ents.push(e); bossRef = e; return e;
}

function enterFloor(f) {
  ents = []; projs = []; parts = []; floats = []; picks = []; zones = []; warns = []; beams = []; fx = []; props = []; bossRef = null;
  genFloor(f); flowKey = -1;
  const s = roomCenter(FL.rooms[0]); if (P) { P.x = s.x; P.y = s.y; }
  floorT = FL.boss ? 999 : 240 + Math.min(60, f * 4); overSpawn = 0;
  const pool = Object.keys(D.monsters).filter(k => f >= D.monsters[k].floors[0] && f <= D.monsters[k].floors[1]);
  if (FL.boss) {
    const a = FL.rooms[1], c = roomCenter(a); const types = ['ratking', 'warden', 'eye'];
    const bt = f <= 9 ? types[f / 3 - 1] : types[(f / 3 - 1) % 3];
    spawnBoss(bt, c.x + 120, c.y, f);
  } else {
    let far = FL.rooms[1], fd = 0;
    FL.rooms.forEach((r, i) => { if (i === 0) return; const c = roomCenter(r), d = dist(c.x, c.y, s.x, s.y); if (d > fd) { fd = d; far = r; } });
    const pc = roomCenter(far); props.push({ kind: 'portal', x: pc.x, y: pc.y, r: 26 });
    FL.rooms.forEach((r, i) => {
      if (i === 0) return;
      let n = Math.floor(r.w * r.h / 26) + ri(0, 2) + Math.floor(f / 4);
      if (r === far) n += 2;
      for (let k = 0; k < n; k++) {
        const t = pick(pool), p = randInRoom(r);
        if (t === 'wolf') { for (let j = 0; j < ri(2, 3); j++) spawnMonster('wolf', p.x + rnd(-30, 30), p.y + rnd(-30, 30), f); k += 1; }
        else spawnMonster(t, p.x, p.y, f);
      }
    });
    const chestRooms = FL.rooms.slice(1).sort(() => Math.random() - 0.5).slice(0, ri(1, 2));
    chestRooms.forEach(r => { const p = randInRoom(r, 2); props.push({ kind: 'chest', x: p.x, y: p.y, r: 14, open: false }); });
    if (FL.secret) { const c = roomCenter(FL.secret); props.push({ kind: 'chest', x: c.x, y: c.y, r: 14, open: false, gold: true }); }
  }
  banner(`지하 ${f}층`, FL.theme.name + (FL.boss ? ' — 강력한 기운이 느껴진다' : ''), FL.boss ? '#ff7a5a' : '#ffd27a');
  if (f > save.best) save.best = f;
  SFX.portal();
}

function startRun(f) {
  startFloor = f; runRunes = 0; runKills = 0;
  const s = calcStats();
  P = { x: 0, y: 0, r: 11, s, hp: s.maxHp, st: 100, rage: 0, rageT: 0, aim: 0, atkT: 0, atkDur: 0, combo: 0, comboT: 0, hitDone: false, swingAng: 0, dodgeT: 0, dodgeCd: 0, dvx: 0, dvy: 0, inv: 0, hurtT: 0, shield: 0, shieldT: 0, buffs: {}, pots: save.potMax, cds: [0, 0, 0, 0], walk: 0, rush: 0, rvx: 0, rvy: 0, stoneT: 0 };
  state = 'dungeon'; paused = false; enterFloor(f);
  if (!save.seenTut) { tutT = 14; save.seenTut = true; writeSave(); }
}

// ---------- flow field (BFS from player)
function updFlow() {
  const ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS), key = pty * MW + ptx; if (key === flowKey) return; flowKey = key;
  if (!flow) flow = new Int16Array(MW * MH); flow.fill(-1);
  const q = new Int32Array(MW * MH); let h = 0, t = 0; q[t++] = key; flow[key] = 0;
  while (h < t) { const c = q[h++], cx = c % MW, cy = (c / MW) | 0, d = flow[c]; if (d > 45) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy, n = ny * MW + nx; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue; if (flow[n] !== -1 || FL.tiles[n] !== 0) continue; flow[n] = d + 1; q[t++] = n; } }
}
function flowDir(e) {
  const tx = Math.floor(e.x / TS), ty = Math.floor(e.y / TS); let best = null, bd = 9999;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const nx = tx + dx, ny = ty + dy; if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue; const v = flow[ny * MW + nx];
    if (v < 0) continue; if (dx && dy && (FL.tiles[ty * MW + nx] !== 0 || FL.tiles[ny * MW + tx] !== 0)) continue;
    if (v < bd) { bd = v; best = [nx, ny]; }
  }
  if (!best) return null; return angTo(e.x, e.y, (best[0] + 0.5) * TS, (best[1] + 0.5) * TS);
}

// ---------- combat
function hurtPlayer(dmg, src) {
  if (!P || P.hp <= 0) return false;
  if (P.inv > 0 || P.dodgeT > 0 || P.stoneT > 0 || P.rush > 0) return false;
  dmg = Math.max(1, Math.round(dmg * 60 / (60 + P.s.def * 2.2) * rnd(0.9, 1.1)));
  if (P.shield > 0) { const a = Math.min(P.shield, dmg); P.shield -= a; dmg -= a; floatTxt(P.x, P.y - 30, '흡수 ' + a, '#e8e0c8', 12); if (dmg <= 0) { P.inv = 0.2; return true; } }
  P.hp -= dmg; P.inv = 0.45; P.hurtT = 0.25; P.rage = Math.min(100, P.rage + 7);
  floatTxt(P.x, P.y - 28, '-' + dmg, '#ff5050', 16); shake(5, 0.2); SFX.hurt(); burst(P.x, P.y, 8, '#a01818', 120, 3, 0.5);
  if (src) { const a = angTo(src.x, src.y, P.x, P.y); moveEnt(P, Math.cos(a) * 10, Math.sin(a) * 10); }
  if (P.hp <= 0) playerDie();
  return true;
}
function dmgEnemy(e, base, o = {}) {
  if (e.dead) return;
  const crit = o.noCrit ? false : Math.random() < P.s.crit;
  let dmg = base * (crit ? P.s.critMul : 1) * rnd(0.9, 1.1) * (P.rageT > 0 ? 1.4 : 1);
  dmg = Math.max(1, Math.round(dmg)); e.hp -= dmg; e.hitF = 0.12; e.aggro = true;
  if (e.boss && !e.woke) e.woke = true;
  floatTxt(e.x + rnd(-6, 6), e.y - e.r - 10, crit ? dmg + '!' : dmg, crit ? '#ffd040' : (o.col || '#ffffff'), crit ? 20 : 14);
  const bc = e.boss ? '#6a2a2a' : e.d.blood; burst(e.x, e.y, crit ? 10 : 6, bc, 150, 3, 0.45);
  if (o.kb && !e.boss) { const a = o.ka !== undefined ? o.ka : angTo(P.x, P.y, e.x, e.y); e.kx += Math.cos(a) * o.kb; e.ky += Math.sin(a) * o.kb; }
  if (o.stun && !e.boss) e.stunT = Math.max(e.stunT, o.stun);
  if (o.stun && e.boss) e.stunT = Math.max(e.stunT, o.stun * 0.25);
  if (o.slow) e.slowT = Math.max(e.slowT, o.slow);
  if (!o.noRage) P.rage = Math.min(100, P.rage + (o.rage || 3));
  const life = P.s.life + (P.rageT > 0 ? 0.08 : 0); if (life > 0) P.hp = Math.min(P.s.maxHp, P.hp + dmg * life);
  if (!o.silent) SFX.hit();
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true; runKills++;
  const d = e.d; const f = FL.f;
  gainXp(Math.round(d.xp * (1 + (f - 1) * 0.12)));
  const [a, b] = d.rune; const n = Math.round(ri(a, b) * (1 + (f - 1) * 0.15));
  dropRunes(e.x, e.y, n);
  if (Math.random() < (e.boss ? 1 : 0.035)) picks.push({ kind: 'pot', x: e.x + rnd(-10, 10), y: e.y + rnd(-10, 10), t: 0 });
  const sc = e.boss ? 1 : d.soul * (save.souls.includes(e.type) ? 0.5 : 1);
  if (Math.random() < sc) { picks.push({ kind: 'soul', id: e.type, x: e.x, y: e.y, t: 0 }); msg(`${D.souls[e.type].name}이(가) 떨어졌다!`, D.gradeColors[D.souls[e.type].grade]); }
  burst(e.x, e.y, e.boss ? 80 : 18, e.boss ? '#ffb070' : d.blood, e.boss ? 320 : 180, 4, 0.8);
  SFX.kill(); hitStop = e.boss ? 0.35 : 0.04;
  if (e.boss) {
    shake(14, 1); flashT = 0.4; flashCol = '#fff';
    const a = FL.rooms[1], c = roomCenter(a);
    props.push({ kind: 'portal', x: c.x + 90, y: c.y, r: 26 }); props.push({ kind: 'return', x: c.x - 90, y: c.y, r: 26 });
    ents.forEach(o => { if (!o.boss && !o.dead) { o.hp = 0; killEnemy(o); } });
    projs = projs.filter(p => p.owner === 'p'); warns = []; beams = beams.filter(b => b.owner === 'p');
    const next = FL.f + 1; if (next > save.checkpoint) save.checkpoint = next;
    if (FL.f === 9 && !e.rewardDone) { save.clears++; banner('심연의 눈이 감겼다', '원정 성공! 더 깊은 곳으로 내려갈 수도 있다', '#ffd040'); }
    else banner(`${d.name} 처치!`, '귀환의 문 또는 하강의 문을 선택하라', '#ffd040');
    writeSave(); bossRef = null;
  }
}
function dropRunes(x, y, n) {
  const chunks = Math.min(12, Math.max(1, Math.ceil(n / 4)));
  for (let i = 0; i < chunks; i++) { const v = Math.floor(n / chunks) + (i < n % chunks ? 1 : 0); if (v <= 0) continue; const a = rnd(0, 6.28), s = rnd(40, 140); picks.push({ kind: 'rune', v, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0 }); }
}
function gainXp(n) {
  save.xp += n;
  while (save.xp >= xpNeed(save.level)) {
    save.xp -= xpNeed(save.level); save.level++;
    const old = P.s.maxHp; P.s = calcStats(); P.hp = Math.min(P.s.maxHp, P.hp + (P.s.maxHp - old) + P.s.maxHp * 0.3);
    banner(`레벨 ${save.level}`, '힘이 솟구친다!', '#7fe0ff'); SFX.level(); burst(P.x, P.y, 40, '#7fe0ff', 200, 3, 0.8, true);
  }
}
function playerDie() {
  P.hp = 0; const lost = Math.floor(runRunes * 0.5); const kept = runRunes - lost;
  save.runes += kept; save.deaths++; writeSave();
  deathInfo = { floor: FL.f, kills: runKills, kept, lost };
  burst(P.x, P.y, 60, '#a01818', 220, 4, 1); shake(12, 0.8); SFX.roar();
  setTimeout(() => { state = 'dead'; }, 900);
  state = 'dying';
}
function returnToCamp() {
  save.runes += runRunes; writeSave();
  deathInfo = { floor: FL.f, kills: runKills, kept: runRunes, lost: 0, ret: true };
  state = 'returned'; SFX.portal();
}

// ---------- player skills
const SKILLS = {
  rat() { P.buffs.sprint = 5; burst(P.x, P.y, 20, '#c8a77a', 160); msg('질주!', '#c8a77a'); },
  skel() { P.shield = Math.round(P.s.maxHp * 0.3); P.shieldT = 6; burst(P.x, P.y, 24, '#e8e0c8', 160); },
  shroom() { zones.push({ owner: 'p', x: P.x, y: P.y, r: 120, life: 3, max: 3, tick: 0, dmg: P.s.atk * 0.45, col: '#8fd05a', kind: 'spore' }); burst(P.x, P.y, 40, '#8fd05a', 220, 5, 0.9); },
  wolf() { const a = P.aim; P.rush = 0.2; P.rvx = Math.cos(a) * 950; P.rvy = Math.sin(a) * 950; P.rushHit = new Set(); SFX.dodge(); },
  newt() { const a = P.aim; projs.push({ owner: 'p', kind: 'fireball', x: P.x + Math.cos(a) * 16, y: P.y + Math.sin(a) * 16, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, r: 9, dmg: P.s.atk * 2.2, life: 1.6 }); SFX.shoot(); },
  golem() { shake(9, 0.35); SFX.boom(); fx.push({ kind: 'ring', x: P.x, y: P.y, r: 10, r2: 150, life: 0.4, max: 0.4, col: '#c8b080' }); ents.forEach(e => { if (!e.dead && dist(e.x, e.y, P.x, P.y) < 150 + e.r) dmgEnemy(e, P.s.atk * 1.7, { kb: 260, stun: 1.3 }); }); burst(P.x, P.y, 40, '#8a7a5a', 260, 5, 0.7); },
  spider() { fx.push({ kind: 'ring', x: P.x, y: P.y, r: 10, r2: 160, life: 0.45, max: 0.45, col: '#a8e0ff' }); ents.forEach(e => { if (!e.dead && dist(e.x, e.y, P.x, P.y) < 160 + e.r) dmgEnemy(e, P.s.atk * 1.1, { slow: 3.5, col: '#a8e0ff' }); }); burst(P.x, P.y, 50, '#c8f0ff', 260, 3, 0.8, true); tone(1200, 0.4, 'sine', 0.05, -600); },
  wraith() { let n = 0; ents.forEach(e => { if (!e.dead && dist(e.x, e.y, P.x, P.y) < 190 + e.r && n < 6) { n++; fx.push({ kind: 'drain', x: e.x, y: e.y, life: 0.5, max: 0.5 }); dmgEnemy(e, P.s.atk * 1.3, { col: '#80ffe0' }); } }); const h = Math.min(0.4, n * 0.08) * P.s.maxHp; P.hp = Math.min(P.s.maxHp, P.hp + h); if (h) floatTxt(P.x, P.y - 30, '+' + Math.round(h), '#80ffa0', 15); tone(300, 0.5, 'sine', 0.06, 500); },
  ratking() { zones.push({ owner: 'p', follow: true, x: P.x, y: P.y, r: 115, life: 6, max: 6, tick: 0, dmg: P.s.atk * 0.6, col: '#a0ff60', kind: 'plague' }); SFX.roar(); },
  warden() { P.stoneT = 3; shake(8, 0.3); SFX.boom(); fx.push({ kind: 'ring', x: P.x, y: P.y, r: 10, r2: 130, life: 0.4, max: 0.4, col: '#d0c090' }); ents.forEach(e => { if (!e.dead && dist(e.x, e.y, P.x, P.y) < 130 + e.r) dmgEnemy(e, P.s.atk * 1.5, { kb: 300, stun: 0.8 }); }); },
  eye() { beams.push({ owner: 'p', x: P.x, y: P.y, a: P.aim, len: 560, w: 26, life: 0.6, max: 0.6, warn: 0, tick: 0, dmg: P.s.atk * 0.9, follow: true }); shake(6, 0.6); tone(150, 0.6, 'sawtooth', 0.07, 300); },
};
function useSkill(i) {
  const id = save.souls[i]; if (!id || P.cds[i] > 0) return;
  SKILLS[id](); P.cds[i] = D.souls[id].cd;
}

// ---------- update
function update(dt) {
  gtime += dt;
  if (pressed.KeyM) { muted = !muted; msg(muted ? '소리 끔' : '소리 켬'); }
  for (const m of msgs) m.life -= dt; msgs = msgs.filter(m => m.life > 0);
  if (bannerO) { bannerO.life -= dt; if (bannerO.life <= 0) bannerO = null; }
  if (state === 'title') { if (mouse.clicked || pressed.Enter || pressed.Space) { state = 'camp'; SFX.ui(); } return; }
  if (state === 'camp' || state === 'dead' || state === 'returned' || state === 'credits') { handleButtons(); return; }
  if (state === 'soulPick') { handleSoulPick(); return; }
  if (state === 'dungeon' || state === 'dying') {
    if (state === 'dungeon' && (pressed.Escape || pressed.KeyP)) paused = !paused;
    if (paused) { handleButtons(); return; }
    if (hitStop > 0) { hitStop -= dt; return; }
    if (tutT > 0) tutT -= dt;
    if (state === 'dungeon') updPlayer(dt);
    updFlow();
    for (const e of ents) if (!e.dead) updEnemy(e, dt);
    ents = ents.filter(e => !e.dead);
    separate();
    updProjs(dt); updZones(dt); updBeams(dt); updPicks(dt); updMisc(dt);
    if (state === 'dungeon') updFloorTimer(dt);
    // camera
    const tx = P.x - W / 2 + Math.cos(P.aim) * 40, ty = P.y - H / 2 + Math.sin(P.aim) * 30;
    cam.x = lerp(cam.x, tx, Math.min(1, dt * 8)); cam.y = lerp(cam.y, ty, Math.min(1, dt * 8));
    // explore
    const ptx = Math.floor(P.x / TS), pty = Math.floor(P.y / TS);
    for (let y = pty - 7; y <= pty + 7; y++) for (let x = ptx - 9; x <= ptx + 9; x++) if (x >= 0 && y >= 0 && x < MW && y < MH) FL.seen[y * MW + x] = 1;
  }
}

function updPlayer(dt) {
  const s = P.s;
  for (const k in P.buffs) P.buffs[k] -= dt;
  P.inv -= dt; P.hurtT -= dt; P.dodgeCd -= dt; P.comboT -= dt; P.stoneT -= dt;
  for (let i = 0; i < 4; i++) P.cds[i] = Math.max(0, P.cds[i] - dt);
  if (P.shieldT > 0) { P.shieldT -= dt; if (P.shieldT <= 0) P.shield = 0; }
  if (P.rageT > 0) { P.rageT -= dt; if (Math.random() < 0.5) part(P.x + rnd(-10, 10), P.y + rnd(-5, 12), { vx: rnd(-10, 10), vy: rnd(-90, -40), col: pick(['#ff4020', '#ff8030', '#ffc040']), size: 3, life: 0.5, max: 0.5, glow: true }); }
  P.hp = Math.min(s.maxHp, P.hp + s.regen * dt);
  P.st = Math.min(100, P.st + 30 * dt);
  P.aim = angTo(P.x, P.y, mouse.x + cam.x, mouse.y + cam.y);
  let mx = ((keys.KeyD || keys.ArrowRight) ? 1 : 0) - ((keys.KeyA || keys.ArrowLeft) ? 1 : 0);
  let my = ((keys.KeyS || keys.ArrowDown) ? 1 : 0) - ((keys.KeyW || keys.ArrowUp) ? 1 : 0);
  const l = Math.hypot(mx, my); if (l) { mx /= l; my /= l; }
  let spd = s.spd * (P.buffs.sprint > 0 ? 1.6 : 1) * (P.rageT > 0 ? 1.2 : 1) * (P.buffs.slow > 0 ? 0.55 : 1);
  if (P.rush > 0) {
    P.rush -= dt; moveEnt(P, P.rvx * dt, P.rvy * dt);
    part(P.x, P.y, { vx: 0, vy: 0, col: '#ff3030', size: 6, life: 0.25, max: 0.25 });
    ents.forEach(e => { if (!e.dead && !P.rushHit.has(e) && dist(e.x, e.y, P.x, P.y) < e.r + 30) { P.rushHit.add(e); dmgEnemy(e, s.atk * 1.9, { kb: 200 }); } });
  } else if (P.dodgeT > 0) {
    P.dodgeT -= dt; moveEnt(P, P.dvx * dt, P.dvy * dt);
    part(P.x, P.y + 8, { vx: rnd(-20, 20), vy: rnd(-20, 0), col: '#6a5a48', size: 4, life: 0.3, max: 0.3 });
  } else {
    if (P.atkT > 0) spd *= 0.45;
    moveEnt(P, mx * spd * dt, my * spd * dt);
    if (l) { P.walk += dt * 11 * spd / 155; if (Math.random() < 0.08) part(P.x, P.y + 12, { vx: 0, vy: -8, col: 'rgba(120,100,80,0.6)', size: 3, life: 0.4, max: 0.4 }); }
    if ((pressed.Space || pressed.Mouse2 || pressed.ShiftLeft) && P.dodgeCd <= 0 && P.st >= 25) {
      const a = l ? Math.atan2(my, mx) : P.aim; P.dvx = Math.cos(a) * 560; P.dvy = Math.sin(a) * 560;
      P.dodgeT = 0.2; P.inv = Math.max(P.inv, 0.3); P.dodgeCd = 0.4; P.st -= 25; P.atkT = 0; SFX.dodge();
    }
  }
  // attack
  if (mouse.down && P.atkT <= 0 && P.dodgeT <= 0 && P.rush <= 0) {
    P.combo = P.comboT > 0 ? (P.combo % 3) + 1 : 1;
    const asp = s.aspd * (P.rageT > 0 ? 1.3 : 1);
    P.atkDur = (P.combo === 3 ? 0.46 : 0.3) / asp; P.atkT = P.atkDur; P.hitDone = false; P.swingAng = P.aim;
    P.comboT = P.atkDur + 0.4; moveEnt(P, Math.cos(P.aim) * 6, Math.sin(P.aim) * 6);
    (P.combo === 3 ? SFX.heavy : SFX.swing)();
  }
  if (P.atkT > 0) { P.atkT -= dt; if (!P.hitDone && P.atkT < P.atkDur * 0.55) { P.hitDone = true; swingHit(); } }
  // skills & actions
  for (let i = 0; i < 4; i++) if (pressed['Digit' + (i + 1)]) useSkill(i);
  if (pressed.KeyQ) {
    if (P.rage >= 100) { P.rageT = 8; P.rage = 0; SFX.rage(); shake(8, 0.5); banner('광폭화!', '공격력·속도·흡혈 상승', '#ff5030'); burst(P.x, P.y, 50, '#ff4020', 260, 4, 0.8, true); fx.push({ kind: 'ring', x: P.x, y: P.y, r: 10, r2: 120, life: 0.4, max: 0.4, col: '#ff5030' }); ents.forEach(e => { if (!e.dead && dist(e.x, e.y, P.x, P.y) < 120) { e.stunT = Math.max(e.stunT, e.boss ? 0.2 : 1); } }); }
    else msg('분노가 부족하다 (' + Math.floor(P.rage) + '/100)', '#ff8060');
  }
  if (pressed.KeyF) {
    if (P.pots > 0 && P.hp < s.maxHp) { P.pots--; const h = s.maxHp * 0.45; P.hp = Math.min(s.maxHp, P.hp + h); floatTxt(P.x, P.y - 30, '+' + Math.round(h), '#60ff80', 16); SFX.potion(); burst(P.x, P.y, 20, '#60ff80', 100, 3, 0.7, true); }
    else if (P.pots <= 0) msg('물약이 없다', '#ff8080');
  }
  if (pressed.KeyE) {
    for (const p of props) {
      if (dist(p.x, p.y, P.x, P.y) > 48) continue;
      if (p.kind === 'portal') { enterFloor(FL.f + 1); return; }
      if (p.kind === 'return') { returnToCamp(); return; }
      if (p.kind === 'chest' && !p.open) openChest(p);
    }
  }
}
function swingHit() {
  const s = P.s; const heavy = P.combo === 3; const range = heavy ? 88 : 74, arc = heavy ? Math.PI * 2 : 2.2;
  const mult = heavy ? 1.7 : (P.combo === 2 ? 1.1 : 1);
  fx.push({ kind: 'slash', x: P.x, y: P.y, a: P.swingAng, arc, r: range, life: 0.18, max: 0.18, dir: P.combo === 2 ? -1 : 1, heavy, rage: P.rageT > 0 });
  let hit = 0;
  for (const e of ents) {
    if (e.dead) continue; const d = dist(P.x, P.y, e.x, e.y);
    if (d < range + e.r && Math.abs(angDiff(P.swingAng, angTo(P.x, P.y, e.x, e.y))) < arc / 2 + 0.15) {
      dmgEnemy(e, s.atk * mult, { kb: heavy ? 280 : 140, stun: heavy ? 0.35 : 0.12 }); hit++;
    }
  }
  if (hit) { hitStop = heavy ? 0.07 : 0.035; shake(heavy ? 6 : 3, 0.12); }
  else if (heavy) shake(3, 0.12);
  // walls, chests
  for (let i = -1; i <= 1; i++) {
    const a = P.swingAng + i * 0.5, px = P.x + Math.cos(a) * 34, py = P.y + Math.sin(a) * 34; const tx = Math.floor(px / TS), ty = Math.floor(py / TS), k = ty * MW + tx;
    if (tileAt(tx, ty) === 2) { FL.cracks[k]--; SFX.crack(); shake(4, 0.15); burst((tx + 0.5) * TS, (ty + 0.5) * TS, 14, FL.theme.wallTop, 160, 4, 0.6); if (FL.cracks[k] <= 0) { FL.tiles[k] = 0; flowKey = -1; msg('벽이 무너졌다... 숨겨진 공간이다!', '#ffd27a'); SFX.boom(); } break; }
  }
  for (const p of props) if (p.kind === 'chest' && !p.open && dist(p.x, p.y, P.x + Math.cos(P.swingAng) * 30, P.y + Math.sin(P.swingAng) * 30) < 50) openChest(p);
}
function openChest(p) {
  p.open = true; SFX.pickup(); burst(p.x, p.y, 24, p.gold ? '#ffd040' : '#c8a060', 160, 3, 0.7, true);
  const f = FL.f; dropRunes(p.x, p.y, Math.round((p.gold ? 60 : 20) * (1 + f * 0.25)));
  if (Math.random() < (p.gold ? 1 : 0.5)) picks.push({ kind: 'pot', x: p.x + 14, y: p.y + 10, t: 0 });
  if (Math.random() < (p.gold ? 0.6 : 0.08)) { const pool = Object.keys(D.monsters).filter(k => f >= D.monsters[k].floors[0] - 1); const id = pick(pool); picks.push({ kind: 'soul', id, x: p.x - 14, y: p.y + 10, t: 0 }); msg('상자 안에서 영혼 결정이 빛난다!', '#c080ff'); }
}

function updEnemy(e, dt) {
  e.anim += dt; e.hitF -= dt; e.slowT -= dt;
  if (e.poisonT > 0) { e.poisonT -= dt; e.ptick = (e.ptick || 0) - dt; if (e.ptick <= 0) { e.ptick = 0.5; dmgEnemy(e, e.poisonD, { noCrit: true, col: '#8fd05a', noRage: true, silent: true }); if (e.dead) return; } }
  // knockback
  if (Math.abs(e.kx) + Math.abs(e.ky) > 1) { moveEnt(e, e.kx * dt, e.ky * dt); e.kx *= Math.pow(0.002, dt); e.ky *= Math.pow(0.002, dt); }
  if (e.stunT > 0) { e.stunT -= dt; e.windT = 0; if (e.act && e.boss) { e.act = null; } return; }
  if (e.boss) return updBoss(e, dt);
  const d = e.d, dd = dist(e.x, e.y, P.x, P.y), sm = e.slowT > 0 ? 0.5 : 1;
  const see = dd < 340 && los(e.x, e.y, P.x, P.y);
  if (!e.aggro && (see && dd < 300 || dd < 90)) { e.aggro = true; ents.forEach(o => { if (!o.aggro && dist(o.x, o.y, e.x, e.y) < 160) o.aggro = true; }); }
  if (P.hp <= 0) e.aggro = false;
  e.cdT -= dt;
  const toP = angTo(e.x, e.y, P.x, P.y);
  const chase = (mul = 1) => { let a = see ? toP : flowDir(e); if (a === null) a = toP; moveEnt(e, Math.cos(a) * e.spd * sm * mul * dt, Math.sin(a) * e.spd * sm * mul * dt); e.dir = Math.cos(a) >= 0 ? 1 : -1; };
  if (!e.aggro) { e.wander.t -= dt; if (e.wander.t <= 0) { e.wander.t = rnd(1, 3); e.wander.a = rnd(0, 6.28); e.wander.m = Math.random() < 0.5; } if (e.wander.m) { moveEnt(e, Math.cos(e.wander.a) * e.spd * 0.3 * dt, Math.sin(e.wander.a) * e.spd * 0.3 * dt); e.dir = Math.cos(e.wander.a) >= 0 ? 1 : -1; } return; }
  e.dir = Math.cos(toP) >= 0 ? 1 : -1;
  if (e.dashT > 0) { // wolf lunge
    e.dashT -= dt; moveEnt(e, e.dvx * dt, e.dvy * dt);
    if (!e.dashHit && dist(e.x, e.y, P.x, P.y) < e.r + P.r + 4) { e.dashHit = true; hurtPlayer(e.atk * 1.3, e); }
    return;
  }
  if (e.windT > 0) {
    e.windT -= dt;
    if (e.windT <= 0) {
      if (d.ai === 'melee') { if (dist(e.x, e.y, P.x, P.y) < d.range + e.r + P.r + 8) hurtPlayer(e.atk, e); e.lunge = 0.12; }
      else if (d.ai === 'lunge') { e.dashT = 0.32; e.dashHit = false; e.dvx = Math.cos(e.la) * 470; e.dvy = Math.sin(e.la) * 470; }
      else if (d.ai === 'slam') { shake(6, 0.25); SFX.boom(); fx.push({ kind: 'ring', x: e.sx, y: e.sy, r: 10, r2: 80, life: 0.35, max: 0.35, col: '#9a8a6a' }); burst(e.sx, e.sy, 26, '#7a6a50', 200, 4, 0.6); if (dist(e.sx, e.sy, P.x, P.y) < 80 + P.r) hurtPlayer(e.atk, e); }
      else if (d.ai === 'ranged' || d.ai === 'blink') fireEnemyProj(e);
      e.cdT = d.cd * rnd(0.85, 1.2);
    }
    return;
  }
  if (d.ai === 'melee') {
    if (dd < d.range + e.r + P.r && e.cdT <= 0) e.windT = 0.38; else if (dd > d.range + e.r + P.r - 4) chase();
  } else if (d.ai === 'lunge') {
    if (dd < d.range && see && e.cdT <= 0) { e.windT = 0.5; e.la = toP; } else if (dd > 70 || !see) chase(); else { const a = toP + Math.PI / 2; moveEnt(e, Math.cos(a) * e.spd * 0.5 * dt, Math.sin(a) * e.spd * 0.5 * dt); }
  } else if (d.ai === 'slam') {
    if (dd < d.range + e.r + P.r + 20 && e.cdT <= 0) { e.windT = 0.85; e.sx = e.x + Math.cos(toP) * 30; e.sy = e.y + Math.sin(toP) * 30; warns.push({ kind: 'circle', x: e.sx, y: e.sy, r: 80, t: 0, max: 0.85 }); } else chase();
  } else if (d.ai === 'ranged' || d.ai === 'blink') {
    if (d.ai === 'blink' && e.cdT <= 0 && dd < 200 && Math.random() < 0.01) { // blink
      for (let i = 0; i < 10; i++) { const a = rnd(0, 6.28), nx = P.x + Math.cos(a) * 150, ny = P.y + Math.sin(a) * 150; if (!collides(nx, ny, e.r) && los(nx, ny, P.x, P.y)) { burst(e.x, e.y, 16, '#80ffe0', 120, 3, 0.5, true); e.x = nx; e.y = ny; burst(e.x, e.y, 16, '#80ffe0', 120, 3, 0.5, true); break; } }
    }
    if (see && dd < d.range && e.cdT <= 0) { e.windT = 0.45; }
    else if (!see || dd > d.range * 0.85) chase();
    else if (dd < d.range * 0.45) { moveEnt(e, -Math.cos(toP) * e.spd * sm * dt, -Math.sin(toP) * e.spd * sm * dt); }
  }
  if (e.lunge > 0) e.lunge -= dt;
}
function fireEnemyProj(e) {
  const k = e.d.proj, a = angTo(e.x, e.y, P.x, P.y);
  if (k === 'spore') { for (let i = -1; i <= 1; i++) projs.push({ owner: 'e', kind: 'spore', x: e.x, y: e.y, vx: Math.cos(a + i * 0.25) * 180, vy: Math.sin(a + i * 0.25) * 180, r: 6, dmg: e.atk, life: 2 }); }
  else if (k === 'fire') projs.push({ owner: 'e', kind: 'efire', x: e.x, y: e.y, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, r: 7, dmg: e.atk, life: 2.5 });
  else if (k === 'web') projs.push({ owner: 'e', kind: 'web', x: e.x, y: e.y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 8, dmg: e.atk * 0.7, life: 2, slow: 2 });
  else if (k === 'shade') { for (let i = 0; i < 2; i++) projs.push({ owner: 'e', kind: 'shade', x: e.x, y: e.y, vx: Math.cos(a + (i ? 0.15 : -0.15)) * 210, vy: Math.sin(a + (i ? 0.15 : -0.15)) * 210, r: 7, dmg: e.atk, life: 3, home: 1.5 }); }
  SFX.shoot();
}

// ---------- bosses
function bossShoot(e, a, sp, kind = 'orb', dmgMul = 1, r = 8) { projs.push({ owner: 'e', kind, x: e.x + Math.cos(a) * e.r * 0.8, y: e.y + Math.sin(a) * e.r * 0.8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r, dmg: e.atk * dmgMul, life: 5 }); }
function updBoss(e, dt) {
  const dd = dist(e.x, e.y, P.x, P.y), toP = angTo(e.x, e.y, P.x, P.y);
  if (!e.woke) { if (dd < 330) { e.woke = true; SFX.roar(); shake(10, 0.8); banner(e.d.name, e.d.title, '#ff6a4a'); } else return; }
  const enr = e.hp < e.max * 0.5; if (enr && !e.enr) { e.enr = true; SFX.roar(); shake(10, 0.6); msg(`${e.d.name}이(가) 격노한다!`, '#ff6040'); burst(e.x, e.y, 50, '#ff3020', 260, 4, 0.8, true); }
  e.dir = Math.cos(toP) >= 0 ? 1 : -1;
  if (e.type === 'ratking') {
    if (e.act === 'cw') { e.actT -= dt; if (e.actT <= 0) { e.act = 'charge'; e.actT = 0.75; e.cvx = Math.cos(e.ca) * 560; e.cvy = Math.sin(e.ca) * 560; SFX.roar(); } return; }
    if (e.act === 'charge') { e.actT -= dt; const ok = moveEnt(e, e.cvx * dt, e.cvy * dt); burst(e.x, e.y + 20, 2, '#5a4a3a', 60, 4, 0.4); if (dd < e.r + P.r + 4) hurtPlayer(e.atk * 1.4, e); if (!ok) { e.act = null; e.stunT = 1.1; shake(10, 0.4); SFX.boom(); burst(e.x, e.y, 30, '#8a7a5a', 240, 5, 0.7); for (let i = 0; i < (enr ? 3 : 2); i++) { const p = { x: e.x + rnd(-80, 80), y: e.y + rnd(-80, 80) }; if (!collides(p.x, p.y, 10)) spawnMonster('rat', p.x, p.y, FL.f).aggro = true; } } if (e.actT <= 0) e.act = null; return; }
    if (dd > e.r + P.r) moveEnt(e, Math.cos(toP) * (enr ? 100 : 75) * dt, Math.sin(toP) * (enr ? 100 : 75) * dt);
    e.bite = (e.bite || 0) - dt; if (dd < e.r + P.r + 12 && e.bite <= 0) { e.bite = 1.1; hurtPlayer(e.atk, e); }
    e.t -= dt; if (e.t <= 0) {
      const r = Math.random();
      if (r < 0.4) { e.act = 'cw'; e.actT = 0.8; e.ca = toP; warns.push({ kind: 'line', x: e.x, y: e.y, a: toP, len: 520, w: e.r * 2, t: 0, max: 0.8 }); }
      else if (r < 0.75) { const n = enr ? 6 : 4; for (let i = 0; i < n; i++) { const tx = P.x + rnd(-90, 90), ty = P.y + rnd(-90, 90); warns.push({ kind: 'circle', x: tx, y: ty, r: 50, t: 0, max: 0.9 }); projs.push({ owner: 'e', kind: 'glob', x: e.x, y: e.y, tx, ty, t: 0, ft: 0.9, sx: e.x, sy: e.y, r: 8, dmg: e.atk * 0.8, life: 0.9 }); } }
      else { for (let i = 0; i < (enr ? 5 : 3); i++) { const p = { x: e.x + rnd(-70, 70), y: e.y + rnd(-70, 70) }; const m = spawnMonster('rat', p.x, p.y, FL.f); if (m) m.aggro = true; } SFX.roar(); }
      e.t = enr ? 2.2 : 3.2;
    }
  } else if (e.type === 'warden') {
    if (e.act === 'slam') { e.actT -= dt; if (e.actT <= 0) { e.act = null; shake(12, 0.5); SFX.boom(); burst(e.sx, e.sy, 40, '#a89a7a', 300, 5, 0.8); if (dist(e.sx, e.sy, P.x, P.y) < e.sr + P.r) hurtPlayer(e.atk * 1.5, e); projs.push({ owner: 'e', kind: 'ring', x: e.sx, y: e.sy, rr: e.sr, vr: 260, max: 520, dmg: e.atk * 0.8, life: 2, hit: false, r: 0 }); } return; }
    if (e.act === 'spin') { e.actT -= dt; e.sa = (e.sa || 0) + dt * 2.6; e.st2 = (e.st2 || 0) - dt; if (e.st2 <= 0) { e.st2 = 0.11; for (let k = 0; k < 3; k++) bossShoot(e, e.sa + k * Math.PI * 2 / 3, 210, 'rock', 0.7); } if (e.actT <= 0) e.act = null; return; }
    if (e.act === 'stomp') { e.actT -= dt; e.st2 -= dt; if (e.st2 <= 0 && e.stomps > 0) { e.stomps--; e.st2 = 0.55; const tx = P.x, ty = P.y; warns.push({ kind: 'circle', x: tx, y: ty, r: 70, t: 0, max: 0.55, cb: () => { shake(7, 0.25); SFX.boom(); burst(tx, ty, 24, '#a89a7a', 200, 4, 0.6); if (dist(tx, ty, P.x, P.y) < 70 + P.r) hurtPlayer(e.atk, e); } }); } if (e.stomps <= 0 && e.st2 <= 0) e.act = null; return; }
    if (dd > e.r + P.r + 20) moveEnt(e, Math.cos(toP) * 55 * dt, Math.sin(toP) * 55 * dt);
    e.t -= dt; if (e.t <= 0) {
      const r = Math.random();
      if (r < 0.3 || dd < 110) { e.act = 'slam'; e.actT = 1.0; e.sx = e.x; e.sy = e.y; e.sr = 140; warns.push({ kind: 'circle', x: e.x, y: e.y, r: 140, t: 0, max: 1.0 }); }
      else if (r < 0.55) { const n = enr ? 24 : 16; for (let w = 0; w < (enr ? 2 : 1); w++) setTimeout(() => { if (!e.dead) for (let i = 0; i < n; i++) bossShoot(e, i * Math.PI * 2 / n + w * 0.13, 200, 'rock', 0.8); SFX.shoot(); }, w * 400); }
      else if (r < 0.8 || !enr) { e.act = 'stomp'; e.stomps = enr ? 5 : 3; e.st2 = 0.2; e.actT = 4; }
      else { e.act = 'spin'; e.actT = 2.8; }
      e.t = enr ? 1.8 : 2.6;
    }
  } else if (e.type === 'eye') {
    e.anim += dt; const want = 260; const a2 = toP + Math.PI + Math.sin(gtime * 0.7) * 0.8; const gx = P.x + Math.cos(a2) * want, gy = P.y + Math.sin(a2) * want;
    const ga = angTo(e.x, e.y, gx, gy), gd = dist(e.x, e.y, gx, gy); if (gd > 10 && e.act !== 'laser') moveEnt(e, Math.cos(ga) * Math.min(gd, 90) * dt, Math.sin(ga) * Math.min(gd, 90) * dt);
    const th = [0.66, 0.33]; if (e.summoned < 2 && e.hp < e.max * th[e.summoned]) { e.summoned++; for (let i = 0; i < 3; i++) { const m = spawnMonster('wraith', e.x + rnd(-100, 100), e.y + rnd(-100, 100), FL.f); if (m) m.aggro = true; } msg('망령들이 깨어난다!', '#80ffe0'); }
    if (e.act === 'spiral') { e.actT -= dt; e.sa = (e.sa || 0) + dt * (enr ? 2.4 : 1.8); e.st2 = (e.st2 || 0) - dt; if (e.st2 <= 0) { e.st2 = enr ? 0.07 : 0.1; bossShoot(e, e.sa, 190, 'orb', 0.7); bossShoot(e, e.sa + Math.PI, 190, 'orb', 0.7); if (enr) { bossShoot(e, -e.sa + Math.PI / 2, 170, 'orb', 0.7); } } if (e.actT <= 0) e.act = null; return; }
    if (e.act === 'aimed') { e.actT -= dt; e.st2 -= dt; if (e.st2 <= 0 && e.bursts > 0) { e.bursts--; e.st2 = 0.4; for (let i = -2; i <= 2; i++) bossShoot(e, toP + i * 0.14, 300, 'orb', 0.9); SFX.shoot(); } if (e.bursts <= 0) e.act = null; return; }
    if (e.act === 'laser') { e.actT -= dt; if (e.actT <= 0) e.act = null; return; }
    e.t -= dt; if (e.t <= 0) {
      const r = Math.random();
      if (r < 0.35) { e.act = 'spiral'; e.actT = enr ? 3.2 : 2.6; }
      else if (r < 0.65) { e.act = 'aimed'; e.bursts = enr ? 4 : 3; e.st2 = 0.3; e.actT = 3; }
      else { e.act = 'laser'; const dirS = Math.random() < 0.5 ? 1 : -1, sweep = enr ? 2.2 : 1.6; e.actT = 1.1 + 2.2; beams.push({ owner: 'e', src: e, a: toP - dirS * sweep / 2, rot: dirS * sweep / 2.2, len: 700, w: 30, warn: 1.1, life: 2.2, max: 2.2, tick: 0, dmg: e.atk * 0.5 }); }
      e.t = enr ? 1.3 : 2.0;
    }
  }
}

function updProjs(dt) {
  for (const p of projs) {
    p.life -= dt;
    if (p.kind === 'ring') { p.rr += p.vr * dt; const d = dist(p.x, p.y, P.x, P.y); if (!p.hit && Math.abs(d - p.rr) < 14 && P.dodgeT <= 0) { if (hurtPlayer(p.dmg)) p.hit = true; } if (p.rr > p.max) p.life = 0; continue; }
    if (p.kind === 'glob') { p.t += dt; const u = Math.min(1, p.t / p.ft); p.x = lerp(p.sx, p.tx, u); p.y = lerp(p.sy, p.ty, u) - Math.sin(u * Math.PI) * 80; if (u >= 1) { p.life = 0; zones.push({ owner: 'e', x: p.tx, y: p.ty, r: 50, life: 4, max: 4, tick: 0, dmg: p.dmg * 0.5, col: '#a0ff60', kind: 'poison' }); burst(p.tx, p.ty, 12, '#a0ff60', 120, 3, 0.5); if (dist(p.tx, p.ty, P.x, P.y) < 50 + P.r) hurtPlayer(p.dmg); } continue; }
    if (p.home && p.owner === 'e') { const a = Math.atan2(p.vy, p.vx), ta = angTo(p.x, p.y, P.x, P.y); const na = a + clamp(angDiff(a, ta), -p.home * dt, p.home * dt); const sp = Math.hypot(p.vx, p.vy); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (Math.random() < 0.5) { const c = { fireball: '#ffa030', efire: '#ff7020', spore: '#9fd060', web: '#d0f0ff', shade: '#80ffe0', orb: '#c080ff', rock: '#a89a7a' }[p.kind] || '#fff'; part(p.x, p.y, { vx: rnd(-20, 20), vy: rnd(-20, 20), col: c, size: p.r * 0.6, life: 0.3, max: 0.3, glow: p.kind !== 'rock' }); }
    if (solidAt(p.x, p.y)) { p.life = 0; if (p.kind === 'fireball') explode(p); else burst(p.x, p.y, 6, '#888', 80, 2, 0.3); continue; }
    if (p.owner === 'e') { if (dist(p.x, p.y, P.x, P.y) < p.r + P.r) { if (hurtPlayer(p.dmg)) { p.life = 0; if (p.slow) { P.buffs.slow = p.slow; msg('거미줄에 걸렸다!', '#d0f0ff'); } } } }
    else { for (const e of ents) if (!e.dead && dist(p.x, p.y, e.x, e.y) < p.r + e.r) { p.life = 0; if (p.kind === 'fireball') explode(p); else dmgEnemy(e, p.dmg); break; } }
  }
  projs = projs.filter(p => p.life > 0);
}
function explode(p) { SFX.boom(); shake(5, 0.2); fx.push({ kind: 'ring', x: p.x, y: p.y, r: 10, r2: 75, life: 0.3, max: 0.3, col: '#ffa030' }); burst(p.x, p.y, 30, '#ff9030', 220, 4, 0.6, true); ents.forEach(e => { if (!e.dead && dist(e.x, e.y, p.x, p.y) < 75 + e.r) { dmgEnemy(e, p.dmg, { kb: 160, col: '#ffb060' }); if (!e.dead) { e.poisonT = 2; e.poisonD = p.dmg * 0.1; } } }); }
function updZones(dt) {
  for (const z of zones) {
    z.life -= dt; z.tick -= dt; if (z.follow) { z.x = P.x; z.y = P.y; }
    if (Math.random() < 0.6) { const a = rnd(0, 6.28), r = rnd(0, z.r); part(z.x + Math.cos(a) * r, z.y + Math.sin(a) * r, { vx: 0, vy: rnd(-30, -10), col: z.col, size: rnd(3, 6), life: 0.6, max: 0.6, glow: z.owner === 'p' }); }
    if (z.tick <= 0) { z.tick = 0.5;
      if (z.owner === 'p') ents.forEach(e => { if (!e.dead && dist(e.x, e.y, z.x, z.y) < z.r + e.r) dmgEnemy(e, z.dmg, { noCrit: true, col: z.col, rage: 1, silent: true }); });
      else if (dist(z.x, z.y, P.x, P.y) < z.r) hurtPlayer(z.dmg);
    }
  }
  zones = zones.filter(z => z.life > 0);
}
function segDist(px, py, x1, y1, x2, y2) { const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy; let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0; t = clamp(t, 0, 1); return dist(px, py, x1 + dx * t, y1 + dy * t); }
function updBeams(dt) {
  for (const b of beams) {
    if (b.src) { if (b.src.dead) { b.life = 0; continue; } b.x = b.src.x; b.y = b.src.y; }
    if (b.follow) { b.x = P.x; b.y = P.y; b.a = P.aim; }
    if (b.warn > 0) { b.warn -= dt; continue; }
    b.life -= dt; if (b.rot) b.a += b.rot * dt; b.tick -= dt;
    // clip by walls
    let len = 0; while (len < b.len && !solidAt(b.x + Math.cos(b.a) * len, b.y + Math.sin(b.a) * len)) len += 10; b.cl = len;
    const x2 = b.x + Math.cos(b.a) * len, y2 = b.y + Math.sin(b.a) * len;
    if (Math.random() < 0.8) part(x2, y2, { col: b.owner === 'p' ? '#c080ff' : '#ff60c0', size: 4, life: 0.3, max: 0.3, glow: true });
    if (b.tick <= 0) { b.tick = 0.1;
      if (b.owner === 'p') ents.forEach(e => { if (!e.dead && segDist(e.x, e.y, b.x, b.y, x2, y2) < b.w / 2 + e.r) dmgEnemy(e, b.dmg, { noRage: true, silent: true, col: '#d0a0ff' }); });
      else if (segDist(P.x, P.y, b.x, b.y, x2, y2) < b.w / 2 + P.r - 4) hurtPlayer(b.dmg);
    }
  }
  beams = beams.filter(b => b.life > 0);
}
function updPicks(dt) {
  for (const p of picks) {
    p.t += dt;
    if (p.vx !== undefined) { if (!collides(p.x + p.vx * dt, p.y, 3)) p.x += p.vx * dt; if (!collides(p.x, p.y + p.vy * dt, 3)) p.y += p.vy * dt; p.vx *= Math.pow(0.02, dt); p.vy *= Math.pow(0.02, dt); }
    const d = dist(p.x, p.y, P.x, P.y);
    if (p.kind === 'rune' && p.t > 0.4) { if (d < 110) { const a = angTo(p.x, p.y, P.x, P.y), s = 420 * (1 - d / 140); p.x += Math.cos(a) * s * dt; p.y += Math.sin(a) * s * dt; } if (d < 16) { p.gone = true; runRunes += p.v; SFX.rune(); floatTxt(P.x + rnd(-8, 8), P.y - 24, '+' + p.v, '#7fd0ff', 11); } }
    else if (p.kind === 'pot' && d < 22 && p.t > 0.3) { p.gone = true; if (P.pots < save.potMax + 2) { P.pots++; msg('물약을 주웠다', '#60ff80'); } else { const h = P.s.maxHp * 0.2; P.hp = Math.min(P.s.maxHp, P.hp + h); } SFX.pickup(); }
    else if (p.kind === 'soul' && d < 24 && p.t > 0.5) { p.gone = true; absorbSoul(p.id); }
  }
  picks = picks.filter(p => !p.gone);
}
function absorbSoul(id) {
  const sd = D.souls[id];
  if (save.souls.includes(id)) { const v = 40 * sd.grade; runRunes += v; msg(`이미 흡수한 영혼 — ${D.currency} ${v}개로 정제했다`, '#7fd0ff'); SFX.pickup(); return; }
  if (save.souls.length < save.slots) { doAbsorb(id, -1); return; }
  soulPending = id; state = 'soulPick';
}
function doAbsorb(id, slot) {
  const sd = D.souls[id];
  if (slot >= 0) save.souls[slot] = id; else save.souls.push(id);
  const old = P.s.maxHp; P.s = calcStats(); P.hp += Math.max(0, P.s.maxHp - old);
  banner(`${sd.name} 흡수!`, `${sd.passive} · 스킬 [${sd.skill}]`, sd.color); SFX.soul();
  burst(P.x, P.y, 60, sd.color, 240, 4, 1, true); fx.push({ kind: 'ring', x: P.x, y: P.y, r: 10, r2: 100, life: 0.5, max: 0.5, col: sd.color });
  writeSave();
}
function handleSoulPick() {
  for (let i = 0; i < save.slots; i++) if (pressed['Digit' + (i + 1)]) { doAbsorb(soulPending, i); soulPending = null; state = 'dungeon'; return; }
  if (pressed.KeyX || pressed.Escape) { const v = 40 * D.souls[soulPending].grade; runRunes += v; msg(`영혼을 정제했다 (+${v})`, '#7fd0ff'); soulPending = null; state = 'dungeon'; return; }
  handleButtons();
}
function updMisc(dt) {
  for (const p of parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.pow(p.drag, dt * 10); p.vy *= Math.pow(p.drag, dt * 10); p.vy += p.g * dt; }
  parts = parts.filter(p => p.life > 0);
  for (const f of floats) { f.life -= dt; f.y += f.vy * dt; f.vy *= 0.95; } floats = floats.filter(f => f.life > 0);
  for (const w of warns) { w.t += dt; if (w.t >= w.max && w.cb) w.cb(); } warns = warns.filter(w => w.t < w.max);
  for (const f of fx) { f.life -= dt; } fx = fx.filter(f => f.life > 0);
  if (shakeT > 0) shakeT -= dt; else shakeM = 0; if (flashT > 0) flashT -= dt;
}
function separate() {
  for (let i = 0; i < ents.length; i++) for (let j = i + 1; j < ents.length; j++) {
    const a = ents[i], b = ents[j], d = dist(a.x, a.y, b.x, b.y), m = a.r + b.r;
    if (d < m && d > 0.01) { const o = (m - d) / 2, ax = (a.x - b.x) / d, ay = (a.y - b.y) / d; if (!a.boss) moveEnt(a, ax * o, ay * o); if (!b.boss) moveEnt(b, -ax * o, -ay * o); }
  }
  if (P && P.dodgeT <= 0) for (const e of ents) { const d = dist(e.x, e.y, P.x, P.y), m = e.r + P.r - 2; if (d < m && d > 0.01) { const o = m - d; moveEnt(P, (P.x - e.x) / d * o * (e.boss ? 1 : 0.5), (P.y - e.y) / d * o * (e.boss ? 1 : 0.5)); } }
}
function updFloorTimer(dt) {
  if (FL.boss) return;
  const before = floorT; floorT -= dt;
  if (before > 60 && floorT <= 60) { msg('어둠이 짙어진다... 서둘러 하강의 문을 찾아라!', '#ff8060'); }
  if (before > 0 && floorT <= 0) { banner('어둠의 범람', '끝없이 괴물이 몰려온다!', '#ff4040'); SFX.roar(); }
  if (floorT <= 0) {
    overSpawn -= dt;
    if (overSpawn <= 0) {
      overSpawn = Math.max(2.5, 6 - (-floorT) / 30);
      const pool = Object.keys(D.monsters).filter(k => FL.f >= D.monsters[k].floors[0] && FL.f <= D.monsters[k].floors[1]);
      for (let i = 0; i < 30; i++) { const a = rnd(0, 6.28), r = rnd(260, 400), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (!collides(x, y, 14)) { const m = spawnMonster(pick(pool), x, y, FL.f + 1); if (m) { m.aggro = true; burst(x, y, 16, '#300', 100, 4, 0.6); } break; } }
    }
  }
}

// ---------- buttons
function handleButtons() { if (!mouse.clicked) return; for (const b of uiButtons) if (b.on && mouse.x >= b.x && mouse.x <= b.x + b.w && mouse.y >= b.y && mouse.y <= b.y + b.h) { SFX.ui(); b.cb(); return; } }
function button(x, y, w, h, label, cb, o = {}) {
  const on = o.on !== false; const hov = on && mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
  uiButtons.push({ x, y, w, h, cb, on });
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  const base = o.col || '#5a3a22';
  g.addColorStop(0, on ? (hov ? shade(base, 40) : shade(base, 15)) : '#2a2622'); g.addColorStop(1, on ? (hov ? base : shade(base, -20)) : '#1c1a18');
  ctx.fillStyle = g; rr(x, y, w, h, 6); ctx.fill();
  ctx.strokeStyle = on ? (hov ? '#ffd27a' : 'rgba(255,210,122,0.45)') : 'rgba(255,255,255,0.1)'; ctx.lineWidth = hov ? 2 : 1; rr(x + 0.5, y + 0.5, w - 1, h - 1, 6); ctx.stroke();
  ctx.fillStyle = on ? '#fff3dc' : '#6a6258'; ctx.font = `bold ${o.size || 15}px ${FONT}`; ctx.textAlign = o.align || 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, o.align === 'left' ? x + 12 : x + w / 2, y + h / 2 + (o.sub ? -7 : 0));
  if (o.sub) { ctx.font = `12px ${FONT}`; ctx.fillStyle = on ? '#e8c890' : '#5a544c'; ctx.fillText(o.sub, o.align === 'left' ? x + 12 : x + w / 2, y + h / 2 + 10); }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
}
function shade(hex, a) { const n = parseInt(hex.slice(1), 16); let r = (n >> 16) + a, g = ((n >> 8) & 255) + a, b = (n & 255) + a; return `rgb(${clamp(r, 0, 255)},${clamp(g, 0, 255)},${clamp(b, 0, 255)})`; }
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function txt(t, x, y, size, col = '#fff', align = 'left', font = FONT, bold = true, stroke = true) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${font}`; ctx.textAlign = align;
  if (stroke) { ctx.lineWidth = Math.max(2, size / 6); ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(t, x, y); }
  ctx.fillStyle = col; ctx.fillText(t, x, y); ctx.textAlign = 'left';
}

// =====================================================================
//  RENDER
// =====================================================================
const lc = document.createElement('canvas'); lc.width = W / 2; lc.height = H / 2; const lctx = lc.getContext('2d');

function render() {
  uiButtons = [];
  ctx.setTransform(SC * DPR, 0, 0, SC * DPR, 0, 0);
  ctx.fillStyle = '#07050a'; ctx.fillRect(0, 0, W, H);
  if (state === 'title') return drawTitle();
  if (state === 'camp') return drawCamp();
  if (state === 'credits') return drawCredits();
  drawWorld();
  drawHUD();
  if (state === 'soulPick') drawSoulPick();
  if (paused) drawPause();
  if (state === 'dead' || state === 'returned') drawEndRun();
}

function drawWorld() {
  const sx = shakeT > 0 ? rnd(-shakeM, shakeM) : 0, sy = shakeT > 0 ? rnd(-shakeM, shakeM) : 0;
  const cx = Math.round(cam.x + sx), cy = Math.round(cam.y + sy);
  ctx.save(); ctx.translate(-cx, -cy);
  drawTiles(cx, cy);
  // decor
  for (const d of FL.decor) { if (d.x < cx - 40 || d.x > cx + W + 40 || d.y < cy - 40 || d.y > cy + H + 40) continue; drawDecor(d); }
  // zones
  for (const z of zones) { const a = Math.min(1, z.life / z.max * 2); const g = ctx.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r); g.addColorStop(0, hexA(z.col, 0.35 * a)); g.addColorStop(0.8, hexA(z.col, 0.18 * a)); g.addColorStop(1, hexA(z.col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, 7); ctx.fill(); }
  // warns
  for (const w of warns) {
    const u = w.t / w.max; ctx.save();
    if (w.kind === 'circle') { ctx.fillStyle = `rgba(255,40,30,${0.12 + 0.1 * Math.sin(gtime * 20)})`; ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,60,40,0.35)'; ctx.beginPath(); ctx.arc(w.x, w.y, w.r * u, 0, 7); ctx.fill(); ctx.strokeStyle = 'rgba(255,80,60,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w.x, w.y, w.r, 0, 7); ctx.stroke(); }
    else if (w.kind === 'line') { ctx.translate(w.x, w.y); ctx.rotate(w.a); ctx.fillStyle = `rgba(255,40,30,${0.15 + 0.1 * Math.sin(gtime * 20)})`; ctx.fillRect(0, -w.w / 2, w.len, w.w); ctx.fillStyle = 'rgba(255,60,40,0.3)'; ctx.fillRect(0, -w.w / 2, w.len * u, w.w); }
    ctx.restore();
  }
  // props
  for (const p of props) drawProp(p);
  // picks
  for (const p of picks) drawPick(p);
  // entities sorted by y
  const list = ents.slice(); if (P && P.hp > 0) list.push(P);
  list.sort((a, b) => a.y - b.y);
  for (const e of list) { if (e === P) drawPlayer(); else drawEnemy(e); }
  // projectiles
  for (const p of projs) drawProj(p);
  // beams
  for (const b of beams) drawBeam(b);
  // fx
  for (const f of fx) drawFx(f);
  // particles
  for (const p of parts) { const a = clamp(p.life / p.max, 0, 1); ctx.globalAlpha = a; ctx.fillStyle = p.col; const s = p.size * (0.4 + a * 0.6); if (p.glow) { ctx.globalCompositeOperation = 'lighter'; } ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); ctx.globalCompositeOperation = 'source-over'; }
  ctx.globalAlpha = 1;
  ctx.restore();
  drawLighting(cx, cy);
  // floats on top of light
  ctx.save(); ctx.translate(-cx, -cy);
  for (const f of floats) { ctx.globalAlpha = clamp(f.life / 0.5, 0, 1); txt(f.t, f.x, f.y, f.size, f.col, 'center'); }
  ctx.globalAlpha = 1;
  // interaction prompts
  if (P && state === 'dungeon') for (const p of props) if (dist(p.x, p.y, P.x, P.y) < 48 && !(p.kind === 'chest' && p.open)) { const t = p.kind === 'portal' ? '[E] 하강의 문 — 아래층으로' : p.kind === 'return' ? `[E] 귀환의 문 — ${D.camp}로` : '[E] 상자 열기'; txt(t, p.x, p.y - 42, 14, '#ffe6a0', 'center'); }
  ctx.restore();
  if (flashT > 0) { ctx.fillStyle = hexA(flashCol, flashT); ctx.fillRect(0, 0, W, H); }
  if (P && P.hurtT > 0) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); g.addColorStop(0, 'rgba(160,0,0,0)'); g.addColorStop(1, `rgba(160,0,0,${P.hurtT * 1.6})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (P && P.hp > 0 && P.hp < P.s.maxHp * 0.25) { const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85); g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(120,0,0,${0.25 + 0.15 * Math.sin(gtime * 6)})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
}
function hexA(hex, a) { if (hex.startsWith('rgb')) return hex; const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${clamp(a, 0, 1)})`; }

function drawTiles(cx, cy) {
  const th = FL.theme; const x0 = Math.max(0, Math.floor(cx / TS) - 1), y0 = Math.max(0, Math.floor(cy / TS) - 1), x1 = Math.min(MW - 1, Math.floor((cx + W) / TS) + 1), y1 = Math.min(MH - 1, Math.floor((cy + H) / TS) + 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const t = FL.tiles[y * MW + x], px = x * TS, py = y * TS, h = hash(x, y);
    if (t === 0) {
      ctx.fillStyle = th.floor[h % 3]; ctx.fillRect(px, py, TS, TS);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(px, py + TS - 1, TS, 1); ctx.fillRect(px + TS - 1, py, 1, TS);
      if (h % 7 === 0) { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(px + 6 + h % 9, py + 8); ctx.lineTo(px + 14 + h % 5, py + 16); ctx.lineTo(px + 12, py + 25); ctx.stroke(); }
      if (h % 11 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(px + 4, py + 4, 10, 6); }
      // wall shadow
      if (tileAt(x, y - 1) !== 0) { const g = ctx.createLinearGradient(0, py, 0, py + 12); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(px, py, TS, 12); }
    } else {
      const below = tileAt(x, y + 1) === 0;
      ctx.fillStyle = th.wallDark; ctx.fillRect(px, py, TS, TS);
      if (below) {
        // front face
        ctx.fillStyle = th.wall; ctx.fillRect(px, py + 8, TS, TS - 8);
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let r = 0; r < 3; r++) { ctx.fillRect(px, py + 8 + r * 8, TS, 1); const off = (r + h) % 2 ? 0 : 16; ctx.fillRect(px + off + 7, py + 8 + r * 8, 1, 8); ctx.fillRect(px + off + 23 - 16 * (off ? 1 : 0), py + 8 + r * 8, 1, 8); }
        ctx.fillStyle = th.wallTop; ctx.fillRect(px, py, TS, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(px, py + 8, TS, 2);
      } else {
        ctx.fillStyle = th.wallTop; ctx.globalAlpha = 0.55; ctx.fillRect(px, py, TS, TS); ctx.globalAlpha = 1;
        if (h % 5 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(px + h % 20, py + h % 17, 6, 4); }
      }
      if (t === 2) { // cracked
        ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(px + 8, py + 10); ctx.lineTo(px + 15, py + 18); ctx.lineTo(px + 12, py + 26); ctx.moveTo(px + 15, py + 18); ctx.lineTo(px + 24, py + 20); ctx.stroke();
        const n = FL.cracks[y * MW + x]; if (n < 3) { ctx.beginPath(); ctx.moveTo(px + 20, py + 9); ctx.lineTo(px + 26, py + 28); ctx.stroke(); }
      }
    }
  }
  // torches
  for (const t of FL.torches) {
    const px = (t.tx + 0.5) * TS, py = (t.ty + 1) * TS - 4; if (px < cx - 40 || px > cx + W + 40 || py < cy - 40 || py > cy + H + 40) continue;
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(px - 2, py - 6, 4, 10); ctx.fillStyle = '#6a5030'; ctx.fillRect(px - 4, py - 9, 8, 4);
    const fl = Math.sin(gtime * 14 + t.tx) * 2;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,140,40,0.9)'; ctx.beginPath(); ctx.ellipse(px, py - 14 - fl / 2, 4, 8 + fl, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,230,140,0.9)'; ctx.beginPath(); ctx.ellipse(px, py - 12, 2, 4, 0, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.06) part(px, py - 18, { vx: rnd(-8, 8), vy: rnd(-50, -20), col: '#ffb040', size: 2, life: 0.8, max: 0.8, glow: true });
  }
}
function drawDecor(d) {
  ctx.save(); ctx.translate(d.x, d.y); ctx.scale(d.s, d.s);
  if (d.k === 0) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(0, 3, 7, 3, 0, 0, 7); ctx.fill(); ctx.fillStyle = shade(FL.theme.wall, 10); ctx.beginPath(); ctx.ellipse(0, 0, 6, 4, 0, 0, 7); ctx.fill(); }
  else if (d.k === 1) { ctx.strokeStyle = '#cfc6ae'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, -2); ctx.stroke(); ctx.fillStyle = '#cfc6ae'; ctx.beginPath(); ctx.arc(-6, 0, 2, 0, 7); ctx.arc(6, -2, 2, 0, 7); ctx.fill(); }
  else if (d.k === 2) { ctx.fillStyle = '#cfc6ae'; ctx.beginPath(); ctx.arc(0, 0, 5, Math.PI, 0); ctx.fill(); ctx.fillRect(-3, 0, 6, 3); ctx.fillStyle = '#111'; ctx.fillRect(-3, -2, 2, 2); ctx.fillRect(1, -2, 2, 2); }
  else if (d.k === 3) { ctx.fillStyle = hexA(FL.theme.accent, 0.5); for (let i = 0; i < 3; i++) { ctx.fillRect(-4 + i * 4, -6 + (i % 2) * 2, 2, 7); } }
  else { ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 5, 0.3, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawProp(p) {
  ctx.save(); ctx.translate(p.x, p.y);
  if (p.kind === 'portal' || p.kind === 'return') {
    const c1 = p.kind === 'portal' ? '#a070ff' : '#60d0ff', c2 = p.kind === 'portal' ? '#40108a' : '#105a8a';
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(0, 6, 34, 14, 0, 0, 7); ctx.fill();
    // stone ring
    ctx.strokeStyle = '#5a5060'; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, 30, 14, 0, 0, 7); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.fillStyle = '#7a7080'; ctx.fillRect(Math.cos(a) * 30 - 3, Math.sin(a) * 14 - 3, 6, 6); }
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 28); g.addColorStop(0, '#fff'); g.addColorStop(0.3, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 26, 11, 0, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = hexA(c1, 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 26 * ((gtime * 0.6 + i / 3) % 1), 11 * ((gtime * 0.6 + i / 3) % 1), 0, 0, 7); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.3) part(p.x + rnd(-20, 20), p.y + rnd(-6, 6), { vx: 0, vy: rnd(-60, -30), col: c1, size: 3, life: 0.9, max: 0.9, glow: true });
    txt(p.kind === 'portal' ? '하강의 문' : '귀환의 문', 0, -24, 12, c1, 'center');
  } else if (p.kind === 'chest') {
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 10, 16, 5, 0, 0, 7); ctx.fill();
    const body = p.gold ? '#a07a20' : '#6a4424', band = p.gold ? '#ffd860' : '#a08050';
    ctx.fillStyle = body; ctx.fillRect(-14, -6, 28, 16); ctx.fillStyle = band; ctx.fillRect(-14, -6, 28, 3); ctx.fillRect(-14, 7, 28, 3); ctx.fillRect(-2, -6, 4, 16);
    if (p.open) { ctx.fillStyle = shade(body, -20); ctx.fillRect(-14, -16, 28, 10); ctx.fillStyle = '#1a1008'; ctx.fillRect(-12, -7, 24, 4); }
    else { ctx.fillStyle = shade(body, 15); ctx.beginPath(); ctx.moveTo(-14, -6); ctx.quadraticCurveTo(0, -18, 14, -6); ctx.fill(); ctx.fillStyle = band; ctx.fillRect(-3, -6, 6, 6); if (p.gold) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,220,100,${0.2 + 0.15 * Math.sin(gtime * 4)})`; ctx.beginPath(); ctx.arc(0, -2, 22, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; } }
  }
  ctx.restore();
}
function drawPick(p) {
  const bob = Math.sin(p.t * 4) * 2;
  ctx.save(); ctx.translate(p.x, p.y + bob);
  if (p.kind === 'rune') { ctx.fillStyle = '#7fd0ff'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(4, 0); ctx.lineTo(0, 5); ctx.lineTo(-4, 0); ctx.fill(); ctx.fillStyle = '#e0f6ff'; ctx.fillRect(-1, -3, 2, 3); }
  else if (p.kind === 'pot') { ctx.fillStyle = '#2a1a10'; ctx.fillRect(-2, -10, 4, 3); ctx.fillStyle = 'rgba(200,220,255,0.6)'; ctx.beginPath(); ctx.arc(0, -1, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#e03040'; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(-3, -4, 2, 3); }
  else if (p.kind === 'soul') { const c = D.souls[p.id].color; ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 22); g.addColorStop(0, hexA(c, 0.9)); g.addColorStop(1, hexA(c, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 22, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.rotate(p.t * 2); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 0); ctx.lineTo(0, 9); ctx.lineTo(-6, 0); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(2, 0); ctx.lineTo(0, 2); ctx.lineTo(-2, 0); ctx.fill(); if (Math.random() < 0.2) part(p.x, p.y, { vx: rnd(-15, 15), vy: rnd(-50, -20), col: c, size: 2, life: 0.7, max: 0.7, glow: true }); }
  ctx.restore();
}

// ---------- player sprite (original design: 철의 부족 전사)
function drawPlayer() {
  const x = P.x, y = P.y, faceR = Math.cos(P.aim) >= 0;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 14, 13, 5, 0, 0, 7); ctx.fill();
  if (P.inv > 0 && P.dodgeT <= 0 && P.rush <= 0 && Math.floor(gtime * 20) % 2) ctx.globalAlpha = 0.55;
  if (P.rageT > 0) { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(0, -6, 0, 0, -6, 34); g.addColorStop(0, 'rgba(255,60,20,0.45)'); g.addColorStop(1, 'rgba(255,60,20,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, -6, 34, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  if (P.stoneT > 0) { ctx.strokeStyle = `rgba(220,200,140,${0.5 + 0.3 * Math.sin(gtime * 10)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -6, 24, 0, 7); ctx.stroke(); }
  if (P.shield > 0) { ctx.strokeStyle = 'rgba(232,224,200,0.7)'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.arc(0, -6, 22, gtime, gtime + 7); ctx.stroke(); ctx.setLineDash([]); }
  const roll = P.dodgeT > 0;
  ctx.save();
  if (roll) { ctx.rotate((faceR ? 1 : -1) * (1 - P.dodgeT / 0.2) * Math.PI * 2); }
  if (!drawImgSprite('hero', 12, !faceR, D.hero.imgScale)) {
    ctx.scale(faceR ? 1.15 : -1.15, 1.15);
    const lg = Math.sin(P.walk) * 3.2, bob = Math.abs(Math.sin(P.walk)) * 1.2;
    ctx.translate(0, -bob);
    // legs
    ctx.fillStyle = '#4a3626'; ctx.fillRect(-5 + lg * 0.7, 3, 4, 7); ctx.fillRect(1 - lg * 0.7, 3, 4, 7);
    ctx.fillStyle = '#2a1d14'; ctx.fillRect(-6 + lg * 0.7, 9, 6, 3); ctx.fillRect(0 - lg * 0.7, 9, 6, 3);
    // back braid
    ctx.fillStyle = '#9a3220'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-6 - i * 0.6, -16 + i * 3.2, 2.2, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(-9, -4, 3, 2);
    // fur kilt
    ctx.fillStyle = '#7a6048'; ctx.beginPath(); ctx.moveTo(-7, -1); ctx.lineTo(7, -1); ctx.lineTo(8, 6); ctx.lineTo(4, 5); ctx.lineTo(2, 7); ctx.lineTo(-1, 5); ctx.lineTo(-4, 7); ctx.lineTo(-8, 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(-7, -2, 14, 3); ctx.fillStyle = '#c9a24a'; ctx.fillRect(-1, -2, 3, 3);
    // torso
    const skin = P.hurtT > 0 ? '#ff9a8a' : '#c98a5e';
    ctx.fillStyle = skin; ctx.beginPath(); ctx.moveTo(-7, -14); ctx.lineTo(7, -14); ctx.lineTo(6, -2); ctx.lineTo(-6, -2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(-6, -8, 12, 1); ctx.fillRect(0, -13, 1, 6);
    // war paint (blue tribal marks — original)
    ctx.fillStyle = '#2f5f9e'; ctx.fillRect(-5, -12, 2, 7); ctx.fillRect(3, -12, 2, 7); ctx.fillRect(-5, -6, 10, 1.5);
    // fur mantle
    ctx.fillStyle = '#5e4733'; ctx.beginPath(); ctx.ellipse(0, -14, 10.5, 4.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a6c4e'; for (let i = -9; i <= 9; i += 3) { ctx.beginPath(); ctx.arc(i, -15 + Math.abs(i) * 0.1, 2, 0, 7); ctx.fill(); }
    ctx.fillStyle = '#d8cdb0'; ctx.fillRect(6, -16, 3, 3); // bone clasp
    // head
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(1, -21, 5.6, 0, 7); ctx.fill();
    // hair (red, swept back)
    ctx.fillStyle = '#b5402a'; ctx.beginPath(); ctx.arc(0, -22.5, 6, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); ctx.fillRect(-6, -23, 4, 6);
    // beard
    ctx.fillStyle = '#9a3220'; ctx.beginPath(); ctx.moveTo(1, -19); ctx.lineTo(7, -19); ctx.lineTo(5, -14); ctx.lineTo(2, -15); ctx.closePath(); ctx.fill();
    // eye + paint stripe
    ctx.fillStyle = '#2f5f9e'; ctx.fillRect(2, -22.5, 5, 2);
    ctx.fillStyle = P.rageT > 0 ? '#ff4020' : '#f8f0e0'; ctx.fillRect(4, -22, 2, 1.5);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  // weapon
  if (!roll) drawAxe();
  ctx.restore();
}
function drawAxe() {
  const faceR = Math.cos(P.aim) >= 0;
  let a;
  if (P.atkT > 0) {
    const u = 1 - P.atkT / P.atkDur, e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    if (P.combo === 3) a = P.swingAng - 0.5 + e * Math.PI * 2;
    else { const s = P.combo === 2 ? -1 : 1; a = P.swingAng - s * 1.3 + s * 2.6 * e; }
  } else a = P.aim + (faceR ? -1.1 : 1.1) + Math.sin(gtime * 2) * 0.05;
  const sx = faceR ? 3 : -3, sy = -13;
  const hx = sx + Math.cos(a) * 9, hy = sy + Math.sin(a) * 9;
  // arm
  ctx.strokeStyle = P.hurtT > 0 ? '#ff9a8a' : '#b87c52'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(hx, hy); ctx.stroke();
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(a);
  ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(30, 0); ctx.stroke();
  ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 1; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(i * 3 - 2, -2); ctx.lineTo(i * 3, 2); ctx.stroke(); }
  const tier = save.wpn; const steel = tier >= 6 ? '#bfe6ff' : tier >= 3 ? '#d4dbe2' : '#9aa0a6', edge = tier >= 6 ? '#ffffff' : '#e8eef2';
  // double-bit head
  ctx.fillStyle = steel; ctx.beginPath(); ctx.moveTo(22, -2); ctx.quadraticCurveTo(26, -14, 36, -15); ctx.quadraticCurveTo(32, -6, 33, 0); ctx.quadraticCurveTo(32, 6, 36, 15); ctx.quadraticCurveTo(26, 14, 22, 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade('#808890', -30); ctx.beginPath(); ctx.moveTo(23, -3); ctx.quadraticCurveTo(19, -10, 14, -10); ctx.quadraticCurveTo(17, -4, 17, 0); ctx.quadraticCurveTo(17, 4, 14, 10); ctx.quadraticCurveTo(19, 10, 23, 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(36, -15); ctx.quadraticCurveTo(32, -6, 33, 0); ctx.quadraticCurveTo(32, 6, 36, 15); ctx.stroke();
  ctx.fillStyle = '#3a2a1a'; ctx.fillRect(20, -3, 4, 6);
  if (tier >= 6 || P.rageT > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = P.rageT > 0 ? 'rgba(255,80,30,0.5)' : 'rgba(120,200,255,0.4)'; ctx.beginPath(); ctx.arc(29, 0, 14, 0, 7); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; }
  ctx.restore();
}

// ---------- enemies
function drawEnemy(e) {
  ctx.save(); ctx.translate(e.x, e.y);
  const R = e.r;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, R * 0.9, R * 1.05, R * 0.38, 0, 0, 7); ctx.fill();
  if (e.windT > 0 && !e.boss) { ctx.fillStyle = `rgba(255,60,40,${0.4 + 0.3 * Math.sin(gtime * 40)})`; ctx.beginPath(); ctx.arc(0, -R - 12, 3, 0, 7); ctx.fill(); ctx.fillRect(-1.5, -R - 22, 3, 7); }
  ctx.save();
  const flash = e.hitF > 0;
  if (e.stunT > 0 && !e.boss) { for (let i = 0; i < 3; i++) { const a = gtime * 5 + i * 2.1; ctx.fillStyle = '#ffe060'; ctx.fillRect(Math.cos(a) * 9 - 1.5, -R - 10 + Math.sin(a) * 3, 3, 3); } }
  const fl = e.dir < 0;
  const key = e.type;
  if (!drawImgSprite(key, R, fl)) {
    if (fl) ctx.scale(-1, 1);
    const fn = SPR[e.type]; if (fn) fn(e, R);
  }
  if (flash) { ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(-R * 3, -R * 4, R * 6, R * 6); }
  ctx.restore();
  if (e.slowT > 0) { ctx.strokeStyle = 'rgba(160,220,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, R * 0.8, R, R * 0.35, 0, 0, 7); ctx.stroke(); }
  if (!e.boss && e.hp < e.max) { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(-R, -R * 2 - 8, R * 2, 4); ctx.fillStyle = '#e03a3a'; ctx.fillRect(-R, -R * 2 - 8, R * 2 * Math.max(0, e.hp / e.max), 4); }
  ctx.restore();
}
const SPR = {
  rat(e, R) {
    const w = Math.sin(e.anim * 18) * 2;
    ctx.strokeStyle = '#b08a7a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-9, 2); ctx.quadraticCurveTo(-17, -2 + w, -20, 4); ctx.stroke();
    ctx.fillStyle = '#6a5848'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a6858'; ctx.beginPath(); ctx.ellipse(8, -2, 6, 5, 0.2, 0, 7); ctx.fill();
    ctx.fillStyle = '#c09080'; ctx.beginPath(); ctx.arc(4, -7, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#e8a0a0'; ctx.fillRect(13, -2, 2, 2);
    ctx.fillStyle = '#ff3030'; ctx.fillRect(9, -4, 2, 2);
    ctx.fillStyle = '#4a3a2a'; ctx.fillRect(-6 + w, 5, 3, 3); ctx.fillRect(4 - w, 5, 3, 3);
  },
  skel(e, R) {
    const w = Math.sin(e.anim * 8) * 2, atk = e.windT > 0 ? -0.9 : (e.lunge > 0 ? 0.9 : 0);
    ctx.strokeStyle = '#d8d0b8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-3, 2); ctx.lineTo(-4 + w, 12); ctx.moveTo(3, 2); ctx.lineTo(4 - w, 12); ctx.stroke();
    ctx.fillStyle = '#d8d0b8'; ctx.fillRect(-1.5, -14, 3, 16);
    ctx.lineWidth = 1.8; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-6, -11 + i * 4); ctx.quadraticCurveTo(0, -9 + i * 4, 6, -11 + i * 4); ctx.stroke(); }
    ctx.fillStyle = '#5a3a20'; ctx.fillRect(-5, 0, 10, 3);
    ctx.fillStyle = '#e8e0c8'; ctx.beginPath(); ctx.arc(1, -19, 6, 0, 7); ctx.fill(); ctx.fillRect(-2, -15, 7, 4);
    ctx.fillStyle = '#1a0a0a'; ctx.fillRect(1, -21, 2.5, 3); ctx.fillRect(4.5, -21, 2, 3); ctx.fillStyle = '#ff5030'; ctx.fillRect(1.5, -20, 1.2, 1.2);
    ctx.save(); ctx.translate(6, -8); ctx.rotate(-0.6 + atk); ctx.fillStyle = '#8a5a30'; ctx.fillRect(0, -1.5, 22, 3); ctx.fillStyle = '#a06a3a'; ctx.fillRect(14, -2.5, 8, 5); ctx.fillStyle = '#4a3020'; ctx.fillRect(-3, -3, 3, 6); ctx.restore();
  },
  shroom(e, R) {
    const p = 1 + Math.sin(e.anim * 3) * 0.05 + (e.windT > 0 ? 0.12 : 0);
    ctx.fillStyle = '#d8d0b0'; ctx.fillRect(-4, -6, 8, 14);
    ctx.save(); ctx.scale(p, p); ctx.fillStyle = '#8a3a6a'; ctx.beginPath(); ctx.ellipse(0, -8, 14, 9, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(-14, -9, 28, 3);
    ctx.fillStyle = '#c0f080'; [[-7, -12], [3, -14], [8, -10], [-2, -9]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill(); });
    ctx.restore(); ctx.fillStyle = '#1a1a10'; ctx.fillRect(-2, -3, 1.5, 2); ctx.fillRect(1.5, -3, 1.5, 2);
  },
  wolf(e, R) {
    const run = e.dashT > 0, w = Math.sin(e.anim * (run ? 30 : 12)) * 3;
    ctx.fillStyle = '#4a4e58'; ctx.beginPath(); ctx.moveTo(-13, -4); ctx.lineTo(-20, -8 - w * 0.3); ctx.lineTo(-14, -1); ctx.fill();
    ctx.fillStyle = '#3a3e48'; ctx.fillRect(-9 + w, 2, 3, 9); ctx.fillRect(6 - w, 2, 3, 9);
    ctx.fillStyle = '#5a5e6a'; ctx.beginPath(); ctx.ellipse(0, -2, 14, 7, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a6e7a'; ctx.beginPath(); ctx.ellipse(-4, -6, 8, 4, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5a5e6a'; ctx.beginPath(); ctx.moveTo(9, -9); ctx.lineTo(20, -5); ctx.lineTo(19, -1); ctx.lineTo(9, 1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10, -9); ctx.lineTo(12, -15); ctx.lineTo(14, -9); ctx.fill();
    ctx.fillStyle = e.windT > 0 || run ? '#ff3030' : '#ffd040'; ctx.fillRect(14, -7, 2, 2);
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(17, -1, 1.5, 2);
  },
  newt(e, R) {
    const w = Math.sin(e.anim * 10) * 2;
    ctx.strokeStyle = '#c04a1a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-14, 4 + w, -20, -1); ctx.stroke();
    ctx.fillStyle = '#d0581e'; ctx.beginPath(); ctx.ellipse(0, 0, 10, 6, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, -3, 6, 4.5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#9a3a10'; ctx.fillRect(-6 + w, 4, 3, 4); ctx.fillRect(4 - w, 4, 3, 4);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,200,60,${0.6 + 0.3 * Math.sin(e.anim * 6)})`; [[-4, -3], [1, -4], [6, -2]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 7); ctx.fill(); });
    if (e.windT > 0) { ctx.fillStyle = 'rgba(255,150,40,0.7)'; ctx.beginPath(); ctx.arc(17, -3, 4 + Math.random() * 2, 0, 7); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#1a0a00'; ctx.fillRect(12, -5, 2, 2);
  },
  golem(e, R) {
    const w = Math.sin(e.anim * 4) * 2, up = e.windT > 0 ? -8 : 0;
    ctx.fillStyle = '#4a5048'; ctx.fillRect(-12 + w, 6, 9, 12); ctx.fillRect(3 - w, 6, 9, 12);
    ctx.fillStyle = '#5e665a'; ctx.beginPath(); ctx.moveTo(-17, -20); ctx.lineTo(15, -22); ctx.lineTo(19, 4); ctx.lineTo(-15, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6a8a50'; ctx.beginPath(); ctx.ellipse(-4, -21, 14, 5, 0, 0, 7); ctx.fill(); ctx.fillRect(-14, -12, 6, 4); ctx.fillRect(6, -2, 7, 4);
    ctx.fillStyle = '#4e564a'; ctx.fillRect(-26, -14 + up, 10, 22); ctx.fillRect(16, -16 + up, 10, 22);
    ctx.fillStyle = '#585e54'; ctx.fillRect(-28, 6 + up, 14, 10); ctx.fillRect(14, 4 + up, 14, 10);
    ctx.fillStyle = '#3e443c'; ctx.fillRect(-2, -32, 14, 12);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = e.windT > 0 ? '#ff6030' : '#a0ff80'; ctx.fillRect(3, -28, 3, 3); ctx.fillRect(8, -28, 3, 3); ctx.globalCompositeOperation = 'source-over';
  },
  spider(e, R) {
    ctx.strokeStyle = '#5a7088'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { const w = Math.sin(e.anim * 14 + i * 1.5) * 3; for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-2 + i * 3, 0); ctx.lineTo(-6 + i * 5 + w, s * 9 - 4); ctx.lineTo(-10 + i * 7 + w, s * 12 + 4); ctx.stroke(); } }
    ctx.fillStyle = '#8aa8c8'; ctx.beginPath(); ctx.ellipse(-6, -2, 9, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#c8e8ff'; ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(-6, -8); ctx.lineTo(-3, -3); ctx.lineTo(-8, -1); ctx.fill();
    ctx.fillStyle = '#6a88a8'; ctx.beginPath(); ctx.arc(5, -1, 5.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#ff4040'; [[6, -3], [8, -2], [7, 0]].forEach(([x, y]) => ctx.fillRect(x, y, 1.5, 1.5));
  },
  wraith(e, R) {
    const fl = Math.sin(e.anim * 3) * 3; ctx.translate(0, -6 + fl); ctx.globalAlpha = 0.85;
    const g = ctx.createLinearGradient(0, -20, 0, 16); g.addColorStop(0, '#3a5a5a'); g.addColorStop(1, 'rgba(30,60,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-10, -12); ctx.quadraticCurveTo(0, -26, 10, -12); ctx.lineTo(12, 10);
    for (let i = 0; i < 5; i++) ctx.lineTo(12 - i * 6 - 3, 16 + Math.sin(e.anim * 8 + i) * 3), ctx.lineTo(12 - (i + 1) * 6, 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0a1414'; ctx.beginPath(); ctx.ellipse(3, -12, 6, 7, 0, 0, 7); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#80ffe0'; ctx.fillRect(2, -14, 2, 2); ctx.fillRect(6, -14, 2, 2);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  },
  ratking(e, R) {
    const w = Math.sin(e.anim * 6) * 3, ch = e.act === 'charge';
    ctx.strokeStyle = '#9a7a6a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-26, 6); ctx.quadraticCurveTo(-48, -4 + w, -54, 12); ctx.stroke();
    ctx.fillStyle = '#4a3c30'; ctx.fillRect(-18 + w, 16, 9, 12); ctx.fillRect(10 - w, 16, 9, 12);
    ctx.fillStyle = '#5a4a3a'; ctx.beginPath(); ctx.ellipse(0, 2, 32, 22, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6a5848'; ctx.beginPath(); ctx.ellipse(-4, -8, 22, 12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#90c050'; [[-14, -4, 5], [4, -12, 4], [-2, 10, 6], [14, 4, 4]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#6a5848'; ctx.beginPath(); ctx.ellipse(28, -6, 16, 13, 0.15, 0, 7); ctx.fill();
    ctx.fillStyle = '#c09080'; ctx.beginPath(); ctx.arc(20, -20, 7, 0, 7); ctx.arc(32, -20, 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8a0a0'; ctx.fillRect(42, -6, 4, 4);
    ctx.fillStyle = '#f0e8d0'; ctx.fillRect(38, 2, 3, 6); ctx.fillRect(34, 2, 3, 5);
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = ch || e.enr ? '#ff3020' : '#ffa030'; ctx.fillRect(32, -11, 4, 4); ctx.globalCompositeOperation = 'source-over';
    // bone crown
    ctx.fillStyle = '#e8dcc0'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(16 + i * 5, -24); ctx.lineTo(18 + i * 5, -36 + (i % 2) * 5); ctx.lineTo(20 + i * 5, -24); ctx.fill(); }
    ctx.fillRect(15, -26, 27, 4);
  },
  warden(e, R) {
    const up = e.act === 'slam' ? -14 * (1 - e.actT) : 0, sp = e.act === 'spin' ? gtime * 10 : 0;
    ctx.fillStyle = '#5a564c'; ctx.fillRect(-18, 10, 13, 22); ctx.fillRect(5, 10, 13, 22);
    ctx.fillStyle = '#7a7466'; ctx.beginPath(); ctx.moveTo(-24, -34); ctx.lineTo(24, -34); ctx.lineTo(20, 14); ctx.lineTo(-20, 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a8474'; ctx.fillRect(-30, -40, 18, 14); ctx.fillRect(12, -40, 18, 14);
    ctx.fillStyle = '#6a6458'; ctx.save(); ctx.rotate(Math.sin(sp) * 0.3); ctx.fillRect(-38, -30 + up, 12, 38); ctx.fillRect(26, -30 + up, 12, 38); ctx.fillStyle = '#5a5448'; ctx.fillRect(-40, 4 + up, 16, 14); ctx.fillRect(24, 4 + up, 16, 14); ctx.restore();
    ctx.fillStyle = '#6e685a'; ctx.fillRect(-10, -56, 20, 22); ctx.fillStyle = '#4a463c'; ctx.fillRect(-12, -58, 24, 5);
    const gl = e.enr ? '#ff6040' : '#ffd070';
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gl; ctx.fillRect(-6, -48, 12, 3);
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(gtime * 4); ctx.fillRect(-2, -26, 4, 24); ctx.fillRect(-12, -16, 24, 3); ctx.fillRect(-26, -36, 10, 2); ctx.fillRect(16, -36, 10, 2);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-18, -30); ctx.lineTo(-10, -18); ctx.lineTo(-14, -4); ctx.moveTo(14, -10); ctx.lineTo(18, 6); ctx.stroke();
  },
  eye(e, R) {
    ctx.translate(0, -18 + Math.sin(gtime * 2) * 5);
    for (let i = 0; i < 7; i++) { const a = Math.PI * 0.2 + i / 6 * Math.PI * 0.6; ctx.strokeStyle = '#4a2a5a'; ctx.lineWidth = 5 - i % 2; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20); ctx.quadraticCurveTo(Math.cos(a) * 40 + Math.sin(gtime * 3 + i) * 10, Math.sin(a) * 40, Math.cos(a) * 34 + Math.sin(gtime * 2 + i) * 14, Math.sin(a) * 60); ctx.stroke(); }
    const g = ctx.createRadialGradient(-8, -8, 4, 0, 0, 36); g.addColorStop(0, '#f4e8f0'); g.addColorStop(0.7, '#c8a8c0'); g.addColorStop(1, '#6a3a6a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(160,20,40,0.6)'; ctx.lineWidth = 1; for (let i = 0; i < 8; i++) { const a = i * 0.8; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 33, Math.sin(a) * 33); ctx.quadraticCurveTo(Math.cos(a + 0.3) * 24, Math.sin(a + 0.3) * 24, Math.cos(a) * 18, Math.sin(a) * 18); ctx.stroke(); }
    const la = angTo(e.x, e.y - 18, P.x, P.y), ld = 12; const ix = Math.cos(la) * ld * (e.dir < 0 ? -1 : 1), iy = Math.sin(la) * ld;
    ctx.fillStyle = e.enr ? '#d02040' : '#7a30c0'; ctx.beginPath(); ctx.arc(ix, iy, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#0a0010'; ctx.beginPath(); ctx.ellipse(ix, iy, 4, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(ix - 5, iy - 6, 3, 0, 7); ctx.fill();
  },
};
function drawProj(p) {
  ctx.save(); ctx.translate(p.x, p.y);
  if (p.kind === 'ring') { ctx.restore(); ctx.strokeStyle = 'rgba(200,180,130,0.85)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(p.x, p.y, p.rr, 0, 7); ctx.stroke(); ctx.strokeStyle = 'rgba(255,240,200,0.5)'; ctx.lineWidth = 2; ctx.stroke(); return; }
  const col = { fireball: '#ffa030', efire: '#ff6020', spore: '#9fd060', web: '#e0f4ff', shade: '#80ffe0', orb: '#d080ff', rock: '#a89a7a', glob: '#a0ff60' }[p.kind] || '#fff';
  if (p.kind === 'rock') { ctx.rotate(gtime * 8); ctx.fillStyle = '#8a8070'; ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2); ctx.fillStyle = '#5a5448'; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r); }
  else if (p.kind === 'web') { ctx.strokeStyle = col; ctx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * -9, Math.sin(a) * -9); ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.stroke(); }
  else { ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r * 2.2); g.addColorStop(0, '#fff'); g.addColorStop(0.35, col); g.addColorStop(1, hexA(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, p.r * 2.2, 0, 7); ctx.fill(); }
  ctx.restore();
}
function drawBeam(b) {
  const col = b.owner === 'p' ? '#c080ff' : '#ff50b0';
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
  if (b.warn > 0) { ctx.fillStyle = `rgba(255,40,80,${0.15 + 0.1 * Math.sin(gtime * 25)})`; ctx.fillRect(0, -b.w / 2, b.len, b.w); ctx.strokeStyle = 'rgba(255,80,120,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(0, -b.w / 2, b.len, b.w); }
  else { const L = b.cl || b.len, wv = b.w * (0.8 + Math.sin(gtime * 40) * 0.2); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = hexA(col, 0.4); ctx.fillRect(0, -wv / 2 - 6, L, wv + 12); ctx.fillStyle = hexA(col, 0.8); ctx.fillRect(0, -wv / 2, L, wv); ctx.fillStyle = '#fff'; ctx.fillRect(0, -wv / 6, L, wv / 3); }
  ctx.restore();
}
function drawFx(f) {
  const u = 1 - f.life / f.max;
  if (f.kind === 'slash') {
    ctx.save(); ctx.translate(f.x, f.y); ctx.globalCompositeOperation = 'lighter';
    const a0 = f.heavy ? f.a : f.a - f.dir * f.arc / 2, sweep = f.heavy ? Math.PI * 2 : f.dir * f.arc;
    const col = f.rage ? [255, 90, 40] : (save.wpn >= 6 ? [140, 210, 255] : [255, 240, 210]);
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${(1 - u) * (0.7 - i * 0.2)})`; ctx.lineWidth = (f.heavy ? 14 : 10) - i * 3;
      ctx.beginPath(); const r = f.r - 8 - i * 6; if (sweep > 0) ctx.arc(0, 0, r, a0, a0 + sweep * Math.min(1, u * 2.5 + 0.3)); else ctx.arc(0, 0, r, a0 + sweep * Math.min(1, u * 2.5 + 0.3), a0); ctx.stroke();
    }
    ctx.restore();
  } else if (f.kind === 'ring') {
    ctx.strokeStyle = hexA(f.col, 1 - u); ctx.lineWidth = 6 * (1 - u) + 1; ctx.beginPath(); ctx.arc(f.x, f.y, lerp(f.r, f.r2, Math.sqrt(u)), 0, 7); ctx.stroke();
  } else if (f.kind === 'drain') {
    ctx.strokeStyle = `rgba(128,255,224,${1 - u})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo((f.x + P.x) / 2 + Math.sin(gtime * 20) * 20, (f.y + P.y) / 2 - 30, P.x, P.y); ctx.stroke();
  }
}
function drawLighting(cx, cy) {
  const dark = FL.theme.dark + (floorT <= 0 ? 0.06 : 0);
  lctx.globalCompositeOperation = 'source-over'; lctx.fillStyle = `rgba(4,2,8,${dark})`; lctx.fillRect(0, 0, lc.width, lc.height);
  lctx.globalCompositeOperation = 'destination-out';
  const L = (x, y, r, a = 1) => { const sx = (x - cx) / 2, sy = (y - cy) / 2, sr = r / 2; if (sx < -sr || sy < -sr || sx > lc.width + sr || sy > lc.height + sr) return; const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, sr); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(0.6, `rgba(0,0,0,${a * 0.6})`); g.addColorStop(1, 'rgba(0,0,0,0)'); lctx.fillStyle = g; lctx.fillRect(sx - sr, sy - sr, sr * 2, sr * 2); };
  if (P) L(P.x, P.y - 10, (floorT <= 0 ? 200 : 260) + Math.sin(gtime * 9) * 6 + (P.rageT > 0 ? 40 : 0), 1);
  for (const t of FL.torches) L((t.tx + 0.5) * TS, (t.ty + 1) * TS - 14, 150 + Math.sin(gtime * 12 + t.tx) * 8, 0.85);
  for (const p of props) if (p.kind !== 'chest') L(p.x, p.y, 170, 0.9); else if (p.gold && !p.open) L(p.x, p.y, 70, 0.6);
  for (const p of projs) if (p.kind !== 'rock' && p.kind !== 'ring') L(p.x, p.y, 70, 0.7);
  for (const p of picks) if (p.kind === 'soul') L(p.x, p.y, 90, 0.8);
  for (const z of zones) L(z.x, z.y, z.r * 1.4, 0.5);
  for (const b of beams) if (b.warn <= 0) { const n = 6; for (let i = 0; i <= n; i++) L(b.x + Math.cos(b.a) * (b.cl || b.len) * i / n, b.y + Math.sin(b.a) * (b.cl || b.len) * i / n, 90, 0.7); }
  for (const e of ents) if (e.boss && e.woke) L(e.x, e.y, 200, 0.6);
  if (FL.boss && bossRef && bossRef.woke) { const a = FL.rooms[1], c = roomCenter(a); L(c.x, c.y, 700, 0.45); }
  ctx.imageSmoothingEnabled = true; ctx.drawImage(lc, 0, 0, W, H);
  // warm tint
  ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = hexA(FL.theme.accent, 0.06); ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
}

// ---------- HUD
function bar(x, y, w, h, v, col, col2, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; rr(x - 2, y - 2, w + 4, h + 4, 4); ctx.fill();
  ctx.fillStyle = '#1a1010'; ctx.fillRect(x, y, w, h);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, col); g.addColorStop(1, col2); ctx.fillStyle = g; ctx.fillRect(x, y, w * clamp(v, 0, 1), h);
  ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x, y, w * clamp(v, 0, 1), 2);
  if (label) txt(label, x + w / 2, y + h - 3, Math.min(12, h), '#fff', 'center');
}
function drawHUD() {
  if (!P) return; const s = P.s;
  // portrait frame
  ctx.fillStyle = 'rgba(10,6,4,0.75)'; rr(12, 12, 290, 92, 10); ctx.fill(); ctx.strokeStyle = 'rgba(255,200,120,0.3)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.arc(52, 52, 30, 0, 7); ctx.fillStyle = '#2a1a12'; ctx.fill(); ctx.strokeStyle = P.rageT > 0 ? '#ff5030' : '#c9a24a'; ctx.lineWidth = 3; ctx.stroke(); ctx.clip();
  ctx.translate(50, 100); ctx.scale(3, 3); ctx.fillStyle = '#c98a5e'; ctx.beginPath(); ctx.arc(1, -21, 5.6, 0, 7); ctx.fill(); ctx.fillStyle = '#b5402a'; ctx.beginPath(); ctx.arc(0, -22.5, 6, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); ctx.fillRect(-6, -23, 4, 6); ctx.fillStyle = '#9a3220'; ctx.beginPath(); ctx.moveTo(1, -19); ctx.lineTo(7, -19); ctx.lineTo(5, -14); ctx.lineTo(2, -15); ctx.fill(); ctx.fillStyle = '#2f5f9e'; ctx.fillRect(2, -22.5, 5, 2); ctx.fillStyle = P.rageT > 0 ? '#ff4020' : '#f8f0e0'; ctx.fillRect(4, -22, 2, 1.5); ctx.fillStyle = '#5e4733'; ctx.beginPath(); ctx.ellipse(0, -11, 11, 4.5, 0, 0, 7); ctx.fill();
  ctx.restore();
  txt(`Lv.${save.level} ${D.hero.name}`, 92, 30, 14, '#ffe6b0');
  bar(92, 38, 200, 14, P.hp / s.maxHp, '#e84a4a', '#8a1a1a', `${Math.ceil(P.hp)} / ${s.maxHp}`);
  if (P.shield > 0) { ctx.fillStyle = 'rgba(232,224,200,0.55)'; ctx.fillRect(92, 38, 200 * Math.min(1, P.shield / s.maxHp), 4); }
  bar(92, 56, 200, 7, P.st / 100, '#e8d060', '#9a8020');
  bar(92, 67, 200, 9, P.rageT > 0 ? P.rageT / 8 : P.rage / 100, P.rage >= 100 || P.rageT > 0 ? '#ff6030' : '#c84020', '#6a1a0a');
  txt(P.rage >= 100 ? '분노 [Q] 광폭화 가능!' : (P.rageT > 0 ? '광폭화!' : '분노'), 96, 76, 9, P.rage >= 100 ? '#ffd060' : '#e0a080', 'left', FONT, true, false);
  bar(92, 84, 200, 4, save.xp / xpNeed(save.level), '#60c0ff', '#2060a0');
  txt(`ATK ${s.atk}  DEF ${s.def}  치명 ${Math.round(s.crit * 100)}%`, 92, 100, 10, '#bba890', 'left', FONT, false, false);
  // floor info
  ctx.fillStyle = 'rgba(10,6,4,0.75)'; rr(W / 2 - 110, 10, 220, 44, 10); ctx.fill();
  txt(`지하 ${FL.f}층 · ${FL.theme.name}`, W / 2, 28, 14, '#ffe6b0', 'center');
  if (!FL.boss) { const t = Math.max(0, floorT); const m = Math.floor(t / 60), sec = Math.floor(t % 60); txt(floorT > 0 ? `어둠까지 ${m}:${String(sec).padStart(2, '0')}` : '어둠의 범람!', W / 2, 47, 13, floorT < 60 ? '#ff6050' : '#c8b8a0', 'center'); }
  else txt(bossRef ? '보스 구역' : '문이 열렸다', W / 2, 47, 13, '#ff9070', 'center');
  // runes & potions
  ctx.fillStyle = 'rgba(10,6,4,0.75)'; rr(12, 110, 160, 30, 8); ctx.fill();
  ctx.fillStyle = '#7fd0ff'; ctx.beginPath(); ctx.moveTo(28, 116); ctx.lineTo(34, 125); ctx.lineTo(28, 134); ctx.lineTo(22, 125); ctx.fill();
  txt(`${runRunes}`, 42, 131, 14, '#bfe8ff');
  ctx.fillStyle = '#e03040'; ctx.beginPath(); ctx.arc(108, 126, 7, 0, 7); ctx.fill(); ctx.fillStyle = '#2a1a10'; ctx.fillRect(106, 115, 4, 4);
  txt(`x${P.pots} [F]`, 120, 131, 13, '#ffc0c0');
  // skill bar
  const n = save.slots, bw = 52, gap = 8, tot = n * bw + (n - 1) * gap + 70; let bx = W / 2 - tot / 2; const by = H - 70;
  ctx.fillStyle = 'rgba(10,6,4,0.7)'; rr(bx - 10, by - 10, tot + 20, 72, 12); ctx.fill();
  // rage slot
  drawSlot(bx, by, 52, 'Q', '광폭화', '#ff5030', P.rage >= 100 ? 0 : 1 - P.rage / 100, P.rageT > 0); bx += 70;
  for (let i = 0; i < n; i++) {
    const id = save.souls[i];
    if (id) { const sd = D.souls[id]; drawSlot(bx, by, bw, String(i + 1), sd.skill, sd.color, P.cds[i] / sd.cd, false, P.cds[i]); }
    else { ctx.fillStyle = 'rgba(40,30,24,0.8)'; rr(bx, by, bw, bw, 8); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.stroke(); txt(String(i + 1), bx + 6, by + 14, 11, '#776'); txt('빈 슬롯', bx + bw / 2, by + bw / 2 + 4, 10, '#665', 'center', FONT, false, false); }
    bx += bw + gap;
  }
  // minimap
  drawMinimap();
  // boss bar
  if (bossRef && bossRef.woke && !bossRef.dead) { const b = bossRef; ctx.fillStyle = 'rgba(10,4,4,0.8)'; rr(W / 2 - 250, 62, 500, 34, 8); ctx.fill(); txt(`${b.d.name} — ${b.d.title}`, W / 2, 77, 13, '#ffb090', 'center'); bar(W / 2 - 240, 82, 480, 9, b.hp / b.max, b.enr ? '#ff3030' : '#d04040', '#601010'); }
  // messages
  msgs.forEach((m, i) => { ctx.globalAlpha = clamp(m.life, 0, 1); txt(m.t, W / 2, H - 100 - (msgs.length - 1 - i) * 20, 14, m.col, 'center'); }); ctx.globalAlpha = 1;
  if (bannerO) { const a = clamp(bannerO.life, 0, 1) * clamp((3 - bannerO.life) * 4, 0, 1); ctx.globalAlpha = a; const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 150, W, 80); txt(bannerO.t, W / 2, 192, 34, bannerO.col, 'center', TFONT, false); txt(bannerO.sub, W / 2, 218, 14, '#e8dcc8', 'center'); ctx.globalAlpha = 1; }
  if (tutT > 0) { ctx.globalAlpha = clamp(tutT, 0, 1); ctx.fillStyle = 'rgba(0,0,0,0.7)'; rr(W - 330, H - 190, 318, 118, 10); ctx.fill(); const L = ['WASD 이동 · 마우스 조준', '좌클릭 도끼 공격 (3타 회전베기)', 'Space/우클릭 구르기 · Q 광폭화', '1~4 영혼 스킬 · F 물약 · E 상호작용', '금 간 벽은 부술 수 있다 · M 소리 · P 일시정지']; L.forEach((l, i) => txt(l, W - 320, H - 166 + i * 20, 12, '#ffe6c0', 'left', FONT, false)); ctx.globalAlpha = 1; }
}
function drawSlot(x, y, s, key, name, col, cdFrac, active, cdTime) {
  ctx.fillStyle = 'rgba(30,22,18,0.95)'; rr(x, y, s, s, 8); ctx.fill();
  const g = ctx.createRadialGradient(x + s / 2, y + s / 2, 2, x + s / 2, y + s / 2, s / 2); g.addColorStop(0, hexA(col, 0.9)); g.addColorStop(1, hexA(col, 0.15)); ctx.fillStyle = g; rr(x + 4, y + 4, s - 8, s - 8, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.save(); ctx.translate(x + s / 2, y + s / 2 - 2); ctx.rotate(Math.PI / 4); ctx.fillRect(-6, -6, 12, 12); ctx.restore();
  if (cdFrac > 0) { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(x, y + s * (1 - cdFrac), s, s * cdFrac); if (cdTime) txt(cdTime.toFixed(cdTime < 1 ? 1 : 0), x + s / 2, y + s / 2 + 6, 16, '#fff', 'center'); }
  ctx.strokeStyle = active ? '#ff6030' : (cdFrac <= 0 ? '#ffd27a' : 'rgba(255,255,255,0.15)'); ctx.lineWidth = active || cdFrac <= 0 ? 2 : 1; rr(x, y, s, s, 8); ctx.stroke();
  txt(key, x + 5, y + 13, 11, '#ffe6b0'); txt(name, x + s / 2, y + s + 9, 9, '#ddd', 'center', FONT, false);
}
function drawMinimap() {
  const sc = 2.2, w = MW * sc, h = MH * sc, x0 = W - w - 14, y0 = 14;
  ctx.fillStyle = 'rgba(8,5,4,0.75)'; rr(x0 - 6, y0 - 6, w + 12, h + 12, 8); ctx.fill();
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const k = y * MW + x; if (!FL.seen[k]) continue; const t = FL.tiles[k]; if (t === 0) { ctx.fillStyle = 'rgba(200,180,150,0.45)'; ctx.fillRect(x0 + x * sc, y0 + y * sc, sc, sc); } }
  for (const p of props) { const k = Math.floor(p.y / TS) * MW + Math.floor(p.x / TS); if (!FL.seen[k]) continue; ctx.fillStyle = p.kind === 'portal' ? '#b080ff' : p.kind === 'return' ? '#60d0ff' : (p.open ? '#665' : '#ffd040'); ctx.fillRect(x0 + p.x / TS * sc - 2, y0 + p.y / TS * sc - 2, 5, 5); }
  for (const e of ents) { const k = Math.floor(e.y / TS) * MW + Math.floor(e.x / TS); if (!FL.seen[k] || dist(e.x, e.y, P.x, P.y) > 350) continue; ctx.fillStyle = e.boss ? '#ff3030' : '#e06050'; ctx.fillRect(x0 + e.x / TS * sc - 1, y0 + e.y / TS * sc - 1, e.boss ? 5 : 2.5, e.boss ? 5 : 2.5); }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x0 + P.x / TS * sc, y0 + P.y / TS * sc, 2.6, 0, 7); ctx.fill();
}
function drawSoulPick() {
  ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, W, H);
  const sd = D.souls[soulPending];
  txt('영혼 슬롯이 가득 찼다', W / 2, 110, 26, '#ffe6b0', 'center', TFONT, false);
  txt(`새 영혼: ${sd.name} [${D.gradeNames[sd.grade]}]`, W / 2, 150, 18, sd.color, 'center');
  txt(`${sd.passive} · 스킬 [${sd.skill}] ${sd.skillDesc}`, W / 2, 175, 13, '#e8dcc8', 'center');
  txt('교체할 슬롯을 고르세요 (숫자키 또는 클릭) · X: 정제하여 룬으로', W / 2, 210, 13, '#bba890', 'center');
  const n = save.slots, bw = 200, gap = 14, x0 = W / 2 - (n * bw + (n - 1) * gap) / 2;
  for (let i = 0; i < n; i++) { const o = D.souls[save.souls[i]]; button(x0 + i * (bw + gap), 240, bw, 70, `${i + 1}. ${o.name}`, () => { doAbsorb(soulPending, i); soulPending = null; state = 'dungeon'; }, { sub: `${o.passive} / ${o.skill}`, size: 13, col: '#3a2a3a' }); }
  button(W / 2 - 110, 340, 220, 44, '정제한다 (X)', () => { const v = 40 * sd.grade; runRunes += v; soulPending = null; state = 'dungeon'; msg(`영혼을 정제했다 (+${v})`, '#7fd0ff'); }, { col: '#2a3a4a' });
}
function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
  txt('일시정지', W / 2, 150, 40, '#ffe6b0', 'center', TFONT, false);
  button(W / 2 - 120, 200, 240, 46, '계속하기', () => paused = false);
  button(W / 2 - 120, 256, 240, 46, muted ? '소리 켜기' : '소리 끄기', () => muted = !muted, { col: '#3a3a3a' });
  button(W / 2 - 120, 312, 240, 46, '원정 포기 (룬 절반 손실)', () => { paused = false; playerDie(); }, { col: '#5a1a1a' });
  const L = ['WASD 이동 · 마우스 조준 · 좌클릭 공격', 'Space/우클릭/Shift 구르기 · Q 광폭화', '1~4 영혼 스킬 · F 물약 · E 상호작용'];
  L.forEach((l, i) => txt(l, W / 2, 400 + i * 22, 13, '#c8b8a0', 'center', FONT, false));
}
function drawEndRun() {
  ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, W, H);
  const d = deathInfo, ret = d.ret;
  txt(ret ? '무사히 귀환했다' : '쓰러졌다...', W / 2, 150, 46, ret ? '#ffd27a' : '#e04040', 'center', TFONT, false);
  txt(ret ? `${D.camp}의 불빛이 보인다` : '동료들이 너를 야영지까지 끌고 왔다', W / 2, 185, 15, '#c8b8a0', 'center');
  const L = [`도달한 층: 지하 ${d.floor}층`, `처치한 괴물: ${d.kills}`, `획득한 ${D.currency}: ${d.kept}` + (d.lost ? `  (잃음: ${d.lost})` : '')];
  L.forEach((l, i) => txt(l, W / 2, 240 + i * 30, 18, '#ffe6c0', 'center'));
  button(W / 2 - 130, 360, 260, 50, '야영지로', () => { state = 'camp'; P = null; });
}

// ---------- title / camp
let embers = [];
function drawBackdrop(fire = true) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b0712'); g.addColorStop(0.6, '#1a0e10'); g.addColorStop(1, '#2a1208'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) { const x = (hash(i, 3) * 0.96) % W, y = (hash(i, 7) * 0.27) % 220; ctx.fillStyle = `rgba(255,240,220,${0.2 + 0.3 * Math.abs(Math.sin(gtime + i))})`; ctx.fillRect(x, y, 1.5, 1.5); }
  ctx.fillStyle = '#140c10'; ctx.beginPath(); ctx.moveTo(0, 330); for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 300 - Math.abs(Math.sin(x * 0.011)) * 110 - Math.sin(x * 0.03) * 20); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  ctx.fillStyle = '#0e080a'; ctx.beginPath(); ctx.moveTo(0, 380); for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 370 - Math.abs(Math.sin(x * 0.02 + 1)) * 50); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  if (embers.length < 80 && Math.random() < 0.5) embers.push({ x: rnd(0, W), y: H + 5, vy: rnd(-60, -20), vx: rnd(-10, 10), l: rnd(4, 9) });
  for (const e of embers) { e.x += e.vx / 60; e.y += e.vy / 60; e.l -= 1 / 60; ctx.fillStyle = `rgba(255,${120 + (e.l * 10 | 0)},40,${clamp(e.l / 4, 0, 1)})`; ctx.fillRect(e.x, e.y, 2, 2); }
  embers = embers.filter(e => e.l > 0 && e.y > -10);
}
function drawTitle() {
  drawBackdrop();
  // abyss glow
  const g = ctx.createRadialGradient(W / 2, H + 60, 10, W / 2, H + 60, 360); g.addColorStop(0, 'rgba(160,70,255,0.55)'); g.addColorStop(1, 'rgba(60,0,120,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // hero silhouette on cliff
  ctx.save(); ctx.translate(W / 2, 430); ctx.scale(4, 4);
  ctx.fillStyle = '#050307'; ctx.beginPath(); ctx.moveTo(-40, 30); ctx.lineTo(-20, 12); ctx.lineTo(25, 12); ctx.lineTo(45, 30); ctx.fill();
  ctx.fillRect(-5, -2, 4, 14); ctx.fillRect(1, -2, 4, 14); ctx.beginPath(); ctx.moveTo(-8, -1); ctx.lineTo(8, -1); ctx.lineTo(9, 6); ctx.lineTo(-9, 6); ctx.fill(); ctx.fillRect(-7, -15, 14, 14);
  ctx.beginPath(); ctx.ellipse(0, -15, 11, 5, 0, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(1, -21, 6, 0, 7); ctx.fill();
  for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(-6 - i * 0.8 + Math.sin(gtime * 2 + i) * 0.6, -18 + i * 3, 2, 0, 7); ctx.fill(); }
  ctx.save(); ctx.translate(7, -12); ctx.rotate(-0.4); ctx.fillRect(-2, -2, 4, 30); ctx.beginPath(); ctx.moveTo(-2, -2); ctx.quadraticCurveTo(-14, -6, -14, -14); ctx.quadraticCurveTo(-6, -10, 0, -10); ctx.quadraticCurveTo(6, -10, 14, -14); ctx.quadraticCurveTo(14, -6, 2, -2); ctx.fill(); ctx.restore();
  ctx.restore();
  const pulse = 0.85 + 0.15 * Math.sin(gtime * 2);
  ctx.shadowColor = '#ff6a20'; ctx.shadowBlur = 30 * pulse;
  txt(D.title, W / 2, 150, 82, '#ffcf8a', 'center', TFONT, false);
  ctx.shadowBlur = 0;
  txt(D.subtitle, W / 2, 186, 16, '#c8a070', 'center', FONT, true);
  ctx.globalAlpha = 0.5 + 0.5 * Math.sin(gtime * 3); txt('클릭하여 시작', W / 2, 250, 18, '#fff', 'center'); ctx.globalAlpha = 1;
  txt('오리지널 2D 던전 액션 · 진행은 브라우저에 자동 저장됩니다', W / 2, H - 14, 11, '#776a60', 'center', FONT, false, false);
}
function drawCamp() {
  drawBackdrop();
  // camp scene
  const fx0 = 250, fy0 = 420;
  for (const [tx, tw, c] of [[90, 120, '#3a2418'], [380, 100, '#2e1c14']]) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(tx, fy0 + 10); ctx.lineTo(tx + tw / 2, fy0 - 90); ctx.lineTo(tx + tw, fy0 + 10); ctx.fill(); ctx.fillStyle = '#120a08'; ctx.beginPath(); ctx.moveTo(tx + tw / 2 - 14, fy0 + 10); ctx.lineTo(tx + tw / 2, fy0 - 40); ctx.lineTo(tx + tw / 2 + 14, fy0 + 10); ctx.fill(); }
  const fg = ctx.createRadialGradient(fx0, fy0, 5, fx0, fy0, 260); fg.addColorStop(0, 'rgba(255,140,40,0.45)'); fg.addColorStop(1, 'rgba(255,80,0,0)'); ctx.fillStyle = fg; ctx.fillRect(0, 0, 540, H);
  ctx.fillStyle = '#2a1a10'; ctx.fillRect(fx0 - 30, fy0 + 4, 60, 8);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) { const h = 40 + Math.sin(gtime * 9 + i) * 10; ctx.fillStyle = i % 2 ? 'rgba(255,120,30,0.6)' : 'rgba(255,200,80,0.5)'; ctx.beginPath(); ctx.ellipse(fx0 - 15 + i * 6, fy0 - h / 2 + 6, 8, h / 2, 0, 0, 7); ctx.fill(); }
  ctx.globalCompositeOperation = 'source-over';
  if (Math.random() < 0.4) embers.push({ x: fx0 + rnd(-15, 15), y: fy0 - 20, vy: rnd(-80, -40), vx: rnd(-15, 15), l: rnd(1, 3) });
  // seated hero
  ctx.save(); ctx.translate(fx0 + 90, fy0 + 6); ctx.scale(-3, 3);
  ctx.fillStyle = '#4a3626'; ctx.fillRect(-8, 0, 14, 4); ctx.fillStyle = '#7a6048'; ctx.fillRect(-7, -4, 14, 6);
  ctx.fillStyle = '#c98a5e'; ctx.beginPath(); ctx.moveTo(-7, -16); ctx.lineTo(7, -16); ctx.lineTo(6, -4); ctx.lineTo(-6, -4); ctx.fill(); ctx.fillStyle = '#2f5f9e'; ctx.fillRect(-5, -14, 2, 7); ctx.fillRect(3, -14, 2, 7);
  ctx.fillStyle = '#5e4733'; ctx.beginPath(); ctx.ellipse(0, -16, 10.5, 4.5, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#c98a5e'; ctx.beginPath(); ctx.arc(1, -23, 5.6, 0, 7); ctx.fill(); ctx.fillStyle = '#b5402a'; ctx.beginPath(); ctx.arc(0, -24.5, 6, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); ctx.fillRect(-6, -25, 4, 8); ctx.fillStyle = '#9a3220'; ctx.beginPath(); ctx.moveTo(1, -21); ctx.lineTo(7, -21); ctx.lineTo(5, -16); ctx.lineTo(2, -17); ctx.fill();
  ctx.fillStyle = '#2f5f9e'; ctx.fillRect(2, -24.5, 5, 2);
  ctx.restore();
  txt(D.camp, 30, 50, 30, '#ffcf8a', 'left', TFONT, false);
  txt(`${D.hero.tribe}의 전사 ${D.hero.name} · Lv.${save.level}`, 30, 76, 14, '#d8c0a0');
  const st = calcStats();
  const info = [`체력 ${st.maxHp} · 공격력 ${st.atk} · 방어력 ${st.def}`, `치명타 ${Math.round(st.crit * 100)}% · 재생 ${st.regen}/초 · 흡혈 ${Math.round(st.life * 100)}%`, `최고 도달: 지하 ${save.best}층 · 원정 성공 ${save.clears}회`];
  info.forEach((l, i) => txt(l, 30, 104 + i * 20, 12, '#bba890', 'left', FONT, false));
  bar(30, 166, 220, 6, save.xp / xpNeed(save.level), '#60c0ff', '#2060a0');
  // right panel
  const px = 548, py = 20, pw = 396;
  ctx.fillStyle = 'rgba(14,9,7,0.85)'; rr(px, py, pw, H - 40, 12); ctx.fill(); ctx.strokeStyle = 'rgba(255,200,120,0.25)'; ctx.stroke();
  ctx.fillStyle = '#7fd0ff'; ctx.beginPath(); ctx.moveTo(px + 24, py + 16); ctx.lineTo(px + 32, py + 28); ctx.lineTo(px + 24, py + 40); ctx.lineTo(px + 16, py + 28); ctx.fill();
  txt(`${D.currency} ${save.runes}`, px + 42, py + 35, 20, '#bfe8ff');
  let y = py + 54;
  const can = c => save.runes >= c;
  const buy = (c, f) => () => { if (save.runes >= c) { save.runes -= c; f(); writeSave(); SFX.level(); } };
  button(px + 14, y, pw - 28, 44, `대장간 — 도끼 강화 +${save.wpn}`, buy(wpnCost(), () => save.wpn++), { on: can(wpnCost()), sub: `공격력 +4 · 비용 ${wpnCost()}`, size: 14, align: 'left' }); y += 50;
  button(px + 14, y, pw - 28, 44, `무두장이 — 가죽 갑옷 강화 +${save.arm}`, buy(armCost(), () => save.arm++), { on: can(armCost()), sub: `체력 +16 · 방어력 +2 · 비용 ${armCost()}`, size: 14, align: 'left' }); y += 50;
  if (save.potMax < 7) { button(px + 14, y, pw - 28, 44, `약초상 — 물약 주머니 (${save.potMax}개)`, buy(potCost(), () => save.potMax++), { on: can(potCost()), sub: `원정마다 물약 +1 · 비용 ${potCost()}`, size: 14, align: 'left' }); y += 50; }
  if (save.slots < 4) { button(px + 14, y, pw - 28, 44, '주술사 — 영혼 슬롯 확장', buy(slotCost(), () => save.slots++), { on: can(slotCost()), sub: `영혼 4개 보유 가능 · 비용 ${slotCost()}`, size: 14, align: 'left', col: '#3a2a4a' }); y += 50; }
  txt(`흡수한 ${D.soulWord} (${save.souls.length}/${save.slots})`, px + 16, y + 16, 13, '#e0c8ff'); y += 24;
  for (let i = 0; i < save.slots; i++) {
    const id = save.souls[i];
    ctx.fillStyle = 'rgba(40,30,40,0.7)'; rr(px + 14, y, pw - 28, 30, 6); ctx.fill();
    if (id) { const s = D.souls[id]; ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(px + 30, y + 15, 7, 0, 7); ctx.fill(); txt(`${s.name}`, px + 44, y + 13, 12, D.gradeColors[s.grade], 'left', FONT, true, false); txt(`${s.passive} · [${s.skill}] ${s.skillDesc}`, px + 44, y + 26, 10, '#a89888', 'left', FONT, false, false); const idx = i; button(px + pw - 66, y + 4, 46, 22, '방출', () => { save.souls.splice(idx, 1); writeSave(); }, { size: 11, col: '#4a2020' }); }
    else txt('— 비어 있음 —', px + pw / 2, y + 20, 11, '#665a50', 'center', FONT, false, false);
    y += 34;
  }
  // expedition buttons
  const cps = []; for (let f = 1; f <= save.checkpoint; f += 3) cps.push(f);
  const shown = cps.slice(-3); const bw = (pw - 28 - (shown.length - 1) * 8) / shown.length;
  const by = H - 40 - 64;
  shown.forEach((f, i) => button(px + 14 + i * (bw + 8), by, bw, 50, `지하 ${f}층부터`, () => startRun(f), { col: '#7a2a14', sub: f === 1 ? '원정 시작' : '체크포인트', size: 15 }));
  button(30, H - 52, 90, 30, '제작 정보', () => state = 'credits', { size: 12, col: '#2a2a2a' });
  button(130, H - 52, 110, 30, '기록 초기화', () => { if (confirm('정말 모든 진행을 초기화할까요?')) { save = Object.assign({}, DEFAULT_SAVE, { souls: [] }); writeSave(); } }, { size: 12, col: '#3a1a1a' });
}
function drawCredits() {
  drawBackdrop();
  txt('제작 정보', W / 2, 110, 36, '#ffcf8a', 'center', TFONT, false);
  D.credits.forEach((l, i) => txt(l, W / 2, 170 + i * 28, 15, '#e8dcc8', 'center', FONT, false));
  button(W / 2 - 80, H - 90, 160, 44, '돌아가기', () => state = 'camp');
}

// ---------- main loop
let last = performance.now();
function loop(t) {
  const dt = Math.min(0.033, (t - last) / 1000); last = t;
  try { update(dt); render(); } catch (err) { console.error(err); }
  pressed = {}; mouse.clicked = false;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
window.__game = { get state() { return state; }, get P() { return P; }, get ents() { return ents; }, startRun, enterFloor, absorbSoul, useSkill, save: () => save };
