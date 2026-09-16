/* ===========================================================
   FUERA DE LA OFICINA — RPG táctico por turnos
   Motor propio: Canvas 2D + pixel art procedural
   =========================================================== */
'use strict';

/* ---------- 1. UTILIDADES ---------- */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const pick = (arr, r) => arr[Math.floor((r ? r() : Math.random()) * arr.length)];
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function chance(p) { return Math.random() < p; }
function ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

/* ---------- 2. AUDIO (Web Audio API, sin assets) ---------- */
const Audio_ = {
  ctx: null, master: null, enabled: true, vol: 0.35,
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.vol;
      this.master.connect(this.ctx.destination);
    } catch (e) { this.enabled = false; }
  },
  tone(freq, dur, type, vol, slide) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, filt) {
    if (!this.enabled || !this.ctx) return;
    const sr = this.ctx.sampleRate, len = Math.floor(sr * dur);
    const buf = this.ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = this.ctx.createBufferSource(); s.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filt || 1200;
    const g = this.ctx.createGain(); g.gain.value = vol || 0.2;
    s.connect(f); f.connect(g); g.connect(this.master); s.start();
  },
  sfx(name) {
    if (!this.enabled) return;
    this.init();
    switch (name) {
      case 'confirm': this.tone(660, 0.07, 'square', 0.18); setTimeout(() => this.tone(880, 0.07, 'square', 0.15), 55); break;
      case 'cancel': this.tone(300, 0.09, 'square', 0.15, 180); break;
      case 'move': this.tone(520, 0.03, 'square', 0.07); break;
      case 'hit': this.noise(0.13, 0.28, 900); this.tone(180, 0.09, 'sawtooth', 0.12, 80); break;
      case 'crit': this.noise(0.2, 0.34, 2200); this.tone(320, 0.15, 'sawtooth', 0.2, 90); break;
      case 'miss': this.tone(420, 0.07, 'sine', 0.1, 260); break;
      case 'heal': this.tone(523, 0.1, 'sine', 0.16); setTimeout(() => this.tone(784, 0.14, 'sine', 0.14), 80); break;
      case 'buff': this.tone(440, 0.09, 'triangle', 0.14); setTimeout(() => this.tone(660, 0.12, 'triangle', 0.12), 70); break;
      case 'debuff': this.tone(330, 0.12, 'triangle', 0.14, 160); break;
      case 'chest': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.11, 'square', 0.15), i * 70)); break;
      case 'levelup': [523, 659, 784, 1046, 1318].forEach((f, i) => setTimeout(() => this.tone(f, 0.14, 'triangle', 0.18), i * 90)); break;
      case 'victory': [392, 523, 659, 784, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'square', 0.16), i * 110)); break;
      case 'defeat': [392, 349, 311, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.28, 'triangle', 0.16), i * 180)); break;
      case 'encounter': [200, 400, 200, 500, 200, 700].forEach((f, i) => setTimeout(() => this.tone(f, 0.07, 'square', 0.2), i * 60)); break;
      case 'text': this.tone(1100 + Math.random() * 200, 0.015, 'square', 0.035); break;
      case 'coin': this.tone(988, 0.05, 'square', 0.13); setTimeout(() => this.tone(1318, 0.09, 'square', 0.11), 45); break;
      case 'door': this.noise(0.22, 0.2, 500); break;
      case 'boss': [110, 110, 146, 110, 175, 164].forEach((f, i) => setTimeout(() => this.tone(f, 0.22, 'sawtooth', 0.18), i * 150)); break;
    }
  }
};

/* ---------- 2b. "JUGOSIDAD": CÁMARA, DESTELLOS Y PARTÍCULAS ---------- */
/* Sistema pequeño y generico reutilizado por el mundo y el combate para dar
   sensacion de impacto: sacudida de camara, destello de pantalla y una
   piscina de particulas vectoriales (nada de imagenes, todo dibujado). */
const Shake = { x: 0, y: 0, t: 0, mag: 0 };
function shake(mag, dur) { Shake.mag = Math.max(Shake.mag * (Shake.t > 0 ? Shake.t / 0.4 : 0), mag); Shake.t = Math.max(Shake.t, dur); }
function updateShake(dt) {
  if (Shake.t > 0) {
    Shake.t -= dt;
    const f = clamp(Shake.t / 0.4, 0, 1);
    Shake.x = (Math.random() * 2 - 1) * Shake.mag * f;
    Shake.y = (Math.random() * 2 - 1) * Shake.mag * f;
  } else { Shake.x = 0; Shake.y = 0; Shake.mag = 0; }
}
const Flash = { t: 0, max: 1, col: '#fff' };
function flash(col, dur) { Flash.col = col; Flash.t = dur; Flash.max = dur; }

const FXP = [];
function spawnFX(x, y, opts) {
  FXP.push(Object.assign({ x, y, vx: 0, vy: 0, life: 0.5, age: 0, size: 3, color: '#fff', shape: 'dot', rot: 0, vr: 0, grav: 0, delay: 0 }, opts));
  if (FXP.length > 260) FXP.splice(0, FXP.length - 260);
}
function updateFX(dt) {
  for (let i = FXP.length - 1; i >= 0; i--) {
    const p = FXP[i];
    if (p.delay > 0) { p.delay -= dt; continue; }
    p.age += dt;
    if (p.age >= p.life) { FXP.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += (p.grav || 0) * dt;
    p.rot += (p.vr || 0) * dt;
  }
}
function drawStarShape(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * 2 * Math.PI / 5;
    const x1 = Math.cos(a) * r, y1 = Math.sin(a) * r;
    i ? ctx.lineTo(x1, y1) : ctx.moveTo(x1, y1);
    const a2 = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45);
  }
  ctx.closePath();
}
function drawFX(ctx) {
  FXP.forEach(p => {
    if (p.delay > 0) return;
    const t = clamp(p.age / p.life, 0, 1);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
    if (p.shape === 'dot') { ctx.beginPath(); ctx.arc(0, 0, Math.max(0.3, p.size * (1 - t * 0.3)), 0, 7); ctx.fill(); }
    else if (p.shape === 'slash') { ctx.lineWidth = p.size; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-11, 5); ctx.quadraticCurveTo(0, -p.size * 2.2, 11, -5); ctx.stroke(); }
    else if (p.shape === 'ring') { ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, p.size * (0.25 + t * 1.5), 0, 7); ctx.stroke(); }
    else if (p.shape === 'spark') { ctx.fillRect(-p.size / 2, -1, p.size, 2); }
    else if (p.shape === 'star') { drawStarShape(ctx, p.size * (1 - t * 0.4)); ctx.fill(); }
    ctx.restore();
  });
}

/* ---------- 3. SPRITES PIXEL-ART PROCEDURALES ---------- */
const PX = 1; // pixel unit inside sprite canvases

// --- plantillas humanoides 16x16 ---
const H_TORSO = {
  down: [
    "................",
    "....OOOOOOOO....",
    "...OHHHHHHHHO...",
    "..OHHHHHHHHHHO..",
    "..OHSSSSSSSSHO..",
    "..OSSEWSSEWSSO..",
    "..OSSSSSSSSSSO..",
    "...OSSSmmSSSO...",
    "....OSSSSSSO....",
    "...OCCCCCCCCO...",
    "..OCCCCAACCCCO..",
    "..OCCCCAACCCCO..",
    "..OSCCCAACCCSO..",
    "...OCCCCCCCCO..."
  ],
  side: [
    "................",
    "....OOOOOOO.....",
    "...OHHHHHHHO....",
    "..OHHHHHHHHHO...",
    "..OHHSSSSSSHO...",
    "..OHSEWSSSSSO...",
    "..OHSSSSSSSSO...",
    "...OSSmSSSSO....",
    "....OSSSSSO.....",
    "...OCCCCCCCO....",
    "...OCCCAACCCO...",
    "...OCCCAACCCO...",
    "...OSCCAACCSO...",
    "....OCCCCCCO...."
  ],
  up: [
    "................",
    "....OOOOOOOO....",
    "...OHHHHHHHHO...",
    "..OHHHHHHHHHHO..",
    "..OHHHHHHHHHHO..",
    "..OHHHHHHHHHHO..",
    "..OHHHHHHHHHHO..",
    "...OHHHHHHHHO...",
    "....OSSSSSSO....",
    "...OCCCCCCCCO...",
    "..OCCCCCCCCCCO..",
    "..OCCCCCCCCCCO..",
    "..OSCCCCCCCCSO..",
    "...OCCCCCCCCO..."
  ]
};
const H_LEGS = [
  ["...OPPPOOPPPO...", "...OBBBO.OBBBO.."],
  ["..OPPPOOPPPO....", "..OBBBO..OBBBO.."],
  ["....OPPPOOPPPO..", "..OBBBO..OBBBO.."]
];

// --- rejillas de criaturas 16x16 ---
const GRIDS = {
  correo: [
    "................", "................",
    "..AAAAAAAAAAAA..", "..ABBBBBBBBBBA..",
    "..AB.B......B.A.", "..ABB.BB..BB.BA.",
    "..AB..EBBBBE..A.", "..AB.WE.WW.EW.A.",
    "..AB..........A.", "..AB...mmmm...A.",
    "..AB..........A.", "..AAAAAAAAAAAA..",
    "...A.A......A.A.", "................"
  ],
  notif: [
    "................", ".....AAAAAA.....",
    "...AAWWWWWWAA...", "..AWWWWWWWWWWA..",
    "..AWWEWWWWEWWA..", "..AWWEWWWWEWWA..",
    "..AWWWWWWWWWWA..", "..AWWWmmmmWWWA..",
    "..AWWWWWWWWWWA..", "...AWWWWWWWWA...",
    "....AWWWWWWA....", ".....AWWWWA.....",
    "......AWWA......", ".......AA......."
  ],
  silla: [
    "................", "...AAAAAAAA.....",
    "..ABBBBBBBBA....", "..AB.E..E.BA....",
    "..AB.WW.WW.A....", "..ABBBmmBBBA....",
    "..ABBBBBBBBA....", "...AAAAAAAA.....",
    "......AA........", "......AA........",
    "....AAAAAA......", "...A.A..A.A.....",
    "..WW......WW....", "................"
  ],
  maquina: [
    "................", "..AAAAAAAAAAAA..",
    "..ABBBBBBBBBBA..", "..AB.EWW.WWE.A..",
    "..AB........B.A.", "..ABBBmmmmBBBA..",
    "..AB........B.A.", "..AWWWWWWWWWWA..",
    "..AW........WA..", "..AAAAAAAAAAAA..",
    "...A........A...", "...A........A...",
    "..AA........AA..", "................"
  ],
  fantasma: [
    "................", ".....AAAAA......",
    "...AABBBBBAA....", "..ABBBBBBBBBA...",
    "..ABEWBBBWEBA...", "..ABBBBBBBBBA...",
    "..ABBBmmmBBBA...", "..ABBBBBBBBBA...",
    "..ABBBBBBBBBA...", "..ABBBBBBBBBA...",
    "..ABBBBBBBBBA...", "..A.BB.BB.BBA...",
    "...A..A..A..A...", "................"
  ],
  vagon: [
    "................", "..AAAAAAAAAAAA..",
    ".ABBBBBBBBBBBBA.", ".AB.WWWWWWWW.BA.",
    ".AB.WEW..WEW.BA.", ".AB.WWWWWWWW.BA.",
    ".ABBBBmmmmBBBBA.", ".ABBBBBBBBBBBBA.",
    ".AWWBBBBBBBBWWA.", ".AAAAAAAAAAAAAA.",
    "..A.A......A.A..", "..WWW......WWW..",
    "...W........W...", "................"
  ],
  nube: [
    "................", "....AAAA..AAA...",
    "..AABBBBAABBBAA.", ".ABBBBBBBBBBBBA.",
    ".ABBEWBBBBWEBBA.", ".ABBBBBBBBBBBBA.",
    ".ABBBBmmmmBBBBA.", ".AABBBBBBBBBBAA.",
    "...AAAAAAAAAA...", "....W..W..W.....",
    "...W..W..W......", "....W..W..W.....",
    "................", "................"
  ],
  grafico: [
    "................", "..A.............",
    "..A......BB.....", "..A...BB.BB.....",
    "..A.BBBB.BB.....", "..ABEB.B.BB.....",
    "..ABBBWBBBB.....", "..ABBB.BBBBW....",
    "..ABmmBBBBBW....", "..ABBBBBBBBW....",
    "..AAAAAAAAAAAA..", "................",
    "................", "................"
  ],
  torniquete: [
    "................", "..AA........AA..",
    "..AB........BA..", "..AB..WWWW..BA..",
    "..AB.WEWWEW.BA..", "..AB.WWWWWW.BA..",
    "..AB..mmmm..BA..", "..ABWWWWWWWWBA..",
    "..AB........BA..", "..AB........BA..",
    "..AB........BA..", "..AAAAAAAAAAAA..",
    "..A..........A..", "................"
  ],
  espejo: [
    "................", "....AAAAAAAA....",
    "...ABBBBBBBBA...", "..ABWWWWWWWWBA..",
    "..ABWEWWWWEWBA..", "..ABWWWWWWWWBA..",
    "..ABWWWmmWWWBA..", "..ABWWWWWWWWBA..",
    "..ABWWWWWWWWBA..", "..ABWWWWWWWWBA..",
    "...ABBBBBBBBA...", "....AAAAAAAA....",
    ".....A....A.....", "................"
  ],
  reloj: [
    "................", "....AAAAAAAA....",
    "..AABBBBBBBBAA..", ".ABBWWWWWWWWBBA.",
    ".ABWEWWWWWWEWBA.", ".ABWWWWAWWWWWBA.",
    ".ABWWWWAWWWWWBA.", ".ABWWWWAAAWWWBA.",
    ".ABWWmmWWWWWWBA.", ".ABBWWWWWWWWBBA.",
    "..AABBBBBBBBAA..", "....AAAAAAAA....",
    ".....A....A.....", "................"
  ],
  traje: [
    "................", ".....AAAAAA.....",
    "....ABBBBBBA....", "....ABEWWEBA....",
    "....ABWWWWBA....", ".....ABmmBA.....",
    "....AAAWWAAA....", "...AWWAWWAWWA...",
    "..AWWWAWWAWWWA..", "..AWWWAWWAWWWA..",
    "...AAWWWWWWAA...", "....AWWA.AWWA...",
    "....AWWA.AWWA...", "...AAAA...AAAA.."
  ]
};

const BOSS_GRIDS = {
  calendario: [
    "....................", "..AAAAAAAAAAAAAAAA..",
    "..ABBBBBBBBBBBBBBA..", "..ABWWWWWWWWWWWWBA..",
    "..ABWEEWWWWWWEEWBA..", "..ABWEEWWWWWWEEWBA..",
    "..ABWWWWWWWWWWWWBA..", "..ABWWmmmmmmmmWWBA..",
    "..ABWWWWWWWWWWWWBA..", "..ABWCWCWCWCWCWWBA..",
    "..ABWWWWWWWWWWWWBA..", "..ABWCWCWCWCWCWWBA..",
    "..ABWWWWWWWWWWWWBA..", "..ABWCWCWCWCWCWWBA..",
    "..ABBBBBBBBBBBBBBA..", "..AAAAAAAAAAAAAAAA..",
    "...A..A......A..A...", "...A..A......A..A...",
    "..AA..AA....AA..AA..", "...................."
  ],
  jefe: [
    "....................", "......AAAAAAAA......",
    ".....ABBBBBBBBA.....", "....ABBBBBBBBBBA....",
    "....ABWWWWWWWWBA....", "....ABWEEWWEEWBA....",
    "....ABWWWWWWWWBA....", ".....ABWmmmmWBA.....",
    "......AWWWWWWA......", "....AACCCCCCCCAA....",
    "...ACCCCCCCCCCCCA...", "..ACCCCCWWWWCCCCCA..",
    "..ACCCCWWWWWWCCCCA..", "..AWCCCWWWWWWCCCWA..",
    "..AWCCCCCWWCCCCCWA..", "..AACCCCCCCCCCCCAA..",
    "...ACCCCCCCCCCCCA...", "...AAAA......AAAA...",
    "..AAAA........AAAA..", "...................."
  ],
  espejo_boss: [
    "....................", "....AAAAAAAAAAAA....",
    "...ABBBBBBBBBBBBA...", "..ABWWWWWWWWWWWWBA..",
    "..ABWWWWWWWWWWWWBA..", "..ABWWEEWWWWEEWWBA..",
    "..ABWWEEWWWWEEWWBA..", "..ABWWWWWWWWWWWWBA..",
    "..ABWWWWmmmmWWWWBA..", "..ABWWWWWWWWWWWWBA..",
    "..ABWWCWWWWWWCWWBA..", "..ABWWWCWWWWCWWWBA..",
    "..ABWWWWCCCCWWWWBA..", "..ABWWWWWWWWWWWWBA..",
    "..ABBBBBBBBBBBBBBA..", "...AAAAAAAAAAAAAA...",
    "....A....AA....A....", "....A....AA....A....",
    "...AAA..AAAA..AAA...", "...................."
  ]
};

/* Accesorios cosmeticos: pequenos parches de color estampados sobre la
   silueta humanoide compartida para que cada heroe se reconozca de un
   vistazo (antes todos usaban exactamente la misma forma). Coordenadas en
   celdas de la rejilla de 16 de ancho, antes de escalar. */
const ACCESSORY = {
  alex: {
    down: [[6, 8, '#e0763a'], [7, 8, '#e0763a'], [8, 8, '#e0763a'], [9, 8, '#c05a28']],
    left: [[6, 8, '#e0763a'], [7, 8, '#e0763a'], [8, 8, '#c05a28']],
    up: [[6, 8, '#c05a28'], [7, 8, '#c05a28'], [8, 8, '#c05a28'], [9, 8, '#c05a28']]
  },
  marta: {
    down: [[5, 4, '#20202a'], [6, 4, '#20202a'], [9, 4, '#20202a'], [10, 4, '#20202a']],
    left: [[5, 4, '#20202a'], [6, 4, '#20202a']],
    up: []
  },
  dani: {
    down: [[4, 1, '#274a6a'], [5, 1, '#274a6a'], [6, 1, '#274a6a'], [7, 1, '#274a6a'], [8, 1, '#274a6a'], [9, 1, '#274a6a'], [10, 1, '#274a6a'], [11, 1, '#274a6a'], [3, 2, '#1c3a54'], [12, 2, '#1c3a54']],
    left: [[4, 1, '#274a6a'], [5, 1, '#274a6a'], [6, 1, '#274a6a'], [7, 1, '#274a6a'], [8, 1, '#274a6a'], [3, 2, '#1c3a54']],
    up: [[4, 1, '#1c3a54'], [5, 1, '#1c3a54'], [6, 1, '#1c3a54'], [7, 1, '#1c3a54'], [8, 1, '#1c3a54'], [9, 1, '#1c3a54'], [10, 1, '#1c3a54'], [11, 1, '#1c3a54']]
  },
  lucia: {
    down: [[12, 2, '#c2913c'], [13, 3, '#c2913c'], [12, 4, '#a97b30']],
    left: [[12, 2, '#c2913c'], [13, 3, '#c2913c'], [12, 4, '#a97b30']],
    up: [[7, 2, '#a97b30'], [8, 2, '#a97b30'], [7, 7, '#a97b30'], [8, 7, '#a97b30']]
  },
  jorge: {
    down: [[5, 7, '#4a4038'], [6, 7, '#4a4038'], [7, 7, '#4a4038'], [8, 7, '#4a4038'], [9, 7, '#4a4038'], [10, 7, '#4a4038'], [6, 8, '#4a4038'], [9, 8, '#4a4038']],
    left: [[5, 7, '#4a4038'], [6, 7, '#4a4038'], [7, 7, '#4a4038'], [8, 7, '#4a4038'], [9, 7, '#4a4038'], [7, 8, '#4a4038']],
    up: []
  }
};
function stampAccessory(ctx, id, dirKey, scale) {
  const set = ACCESSORY[id]; if (!set) return;
  const list = set[dirKey] || [];
  list.forEach(([cx, cy, col]) => { ctx.fillStyle = col; ctx.fillRect(cx * scale, cy * scale, scale, scale); });
}

const _sprCache = new Map();
function renderGrid(grid, pal, scale, eyeOverride) {
  const w = grid[0].length, h = grid.length;
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const x = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = grid[y];
    for (let i = 0; i < w; i++) {
      const ch = row[i];
      if (ch === '.' || ch === undefined) continue;
      const col = (eyeOverride && ch === 'E') ? eyeOverride : pal[ch];
      if (!col) continue;
      x.fillStyle = col;
      x.fillRect(i * scale, y * scale, scale, scale);
    }
  }
  return c;
}
function spriteKey() { return Array.prototype.join.call(arguments, '|'); }

/* Variante "destello": la misma silueta rellena de blanco solido, usada un
   par de fotogramas al recibir un golpe para que el impacto se lea de
   verdad en vez de solo parpadear la transparencia. */
const _flashCache = new WeakMap();
function flashVariant(cv) {
  if (_flashCache.has(cv)) return _flashCache.get(cv);
  const c = document.createElement('canvas');
  c.width = cv.width; c.height = cv.height;
  const x = c.getContext('2d');
  x.drawImage(cv, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, c.width, c.height);
  _flashCache.set(cv, c);
  return c;
}

/** Sprite humanoide: dir(down/up/left/right), frame 0..2 */
function humanSprite(pal, dir, frame, scale) {
  const key = spriteKey('h', pal.key, dir, frame, scale);
  if (_sprCache.has(key)) return _sprCache.get(key);
  const base = dir === 'up' ? H_TORSO.up : (dir === 'down' ? H_TORSO.down : H_TORSO.side);
  const grid = base.concat(H_LEGS[frame % 3]);
  let cv = renderGrid(grid, pal, scale);
  const accDir = dir === 'right' ? 'left' : dir;
  const actx = cv.getContext('2d');
  stampAccessory(actx, pal.key, accDir, scale);
  if (dir === 'right') {
    const m = document.createElement('canvas');
    m.width = cv.width; m.height = cv.height;
    const mx = m.getContext('2d');
    mx.translate(cv.width, 0); mx.scale(-1, 1); mx.drawImage(cv, 0, 0);
    cv = m;
  }
  _sprCache.set(key, cv);
  return cv;
}
/** Sprite de criatura. blink=true cierra el ojo (parpadeo periodico). */
function creatureSprite(gridName, pal, scale, blink) {
  const key = spriteKey('c', gridName, pal.key, scale, blink ? 'b' : 'o');
  if (_sprCache.has(key)) return _sprCache.get(key);
  const grid = GRIDS[gridName] || BOSS_GRIDS[gridName] || GRIDS.fantasma;
  const cv = renderGrid(grid, pal, scale, blink ? (pal.B || pal.b || pal.A) : null);
  _sprCache.set(key, cv);
  return cv;
}

/* Paletas de personajes */
function pal(key, o) {
  return Object.assign({
    key, O: '#14101c', S: '#f0c090', E: '#1a1426', W: '#ffffff', m: '#8a4a48',
    H: '#3a2a20', C: '#5570b0', A: '#8fa8e0', P: '#333a52', B: '#231d2e'
  }, o);
}
function cpal(key, a, b, w, e, m2) {
  return { key, A: a, B: b, W: w || '#f2f2f8', E: e || '#20121c', m: m2 || '#2a1420', C: b };
}
