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

/* ---------- 4. DATOS: ESTADOS ---------- */
const ELEM = { fis: 'Físico', men: 'Mental', soc: 'Social' };
const EL_COLOR = { fis: '#e86a5a', men: '#7aa6ff', soc: '#f0c04a' };

const STATUS = {
  ansiedad: { n: 'Ansiedad', bad: 1, dot: 0.07, el: 'men', ico: '≈' },
  agotamiento: { n: 'Agotamiento', bad: 1, mod: { atk: -0.30 }, ico: '▽' },
  bloqueo: { n: 'Bloqueo', bad: 1, mod: { def: -0.30, res: -0.20 }, ico: '✕' },
  lentitud: { n: 'Lentitud', bad: 1, mod: { spd: -0.40 }, ico: '↓' },
  silencio: { n: 'Silencio', bad: 1, noSkill: 1, ico: '∅' },
  sueno: { n: 'Sueño', bad: 1, skip: 1, breakOnHit: 1, ico: 'z' },
  provocado: { n: 'Provocado', bad: 1, ico: '!' },
  duda: { n: 'Duda', bad: 1, mod: { atk: -0.15, spd: -0.15 }, dot: 0.03, el: 'men', ico: '?' },
  motivacion: { n: 'Motivación', mod: { atk: 0.35, mag: 0.35 }, ico: '▲' },
  foco: { n: 'Foco', crit: 0.30, ico: '◎' },
  muro: { n: 'Muro', mod: { def: 0.50, res: 0.50 }, ico: '⬛' },
  respirar: { n: 'Respiración', regen: 0.07, ico: '♥' },
  contra: { n: 'Contraataque', ico: '↺' },
  celeridad: { n: 'Celeridad', mod: { spd: 0.45 }, ico: '»' },
  claridad: { n: 'Claridad', mod: { res: 0.35 }, immune: 1, ico: '☀' }
};

/* ---------- 5. DATOS: HABILIDADES ---------- */
/* ap: coste en Puntos de Acción; en: energía; cd: cooldown; pow: multiplicador
   tgt: enemy|allEnemies|ally|allAllies|self|dead */
const SKILLS = {
  /* --- ALEX --- */
  corte: { n: 'Corte de Rutina', ap: 1, en: 0, pow: 1.15, el: 'fis', tgt: 'enemy', d: 'Golpe limpio y sin ceremonia.' },
  decision: { n: 'Decisión', ap: 1, en: 6, cd: 2, tgt: 'ally', buff: ['motivacion', 3], d: 'Sube ATK/MAG de un aliado 3 turnos.' },
  renuncia: { n: 'Renuncia', ap: 2, en: 10, cd: 3, pow: 2.2, el: 'soc', tgt: 'enemy', hpCost: 0.10, d: 'Daño social alto a costa de 10% de tu HP.' },
  claridad_s: { n: 'Claridad', ap: 1, en: 8, cd: 2, tgt: 'ally', heal: 0.18, cleanse: 1, buff: ['claridad', 3], d: 'Cura, limpia estados y da inmunidad breve.' },
  no: { n: 'Decir Que No', ap: 2, en: 12, cd: 4, pow: 1.3, el: 'soc', tgt: 'allEnemies', inflict: ['bloqueo', 0.7, 3], d: 'Daño en área + Bloqueo.' },
  punto_final: { n: 'Punto Final', ap: 3, en: 26, cd: 6, pow: 3.4, el: 'soc', tgt: 'enemy', ult: 1, d: 'Definitiva. Ignora el 40% de la defensa.', pierce: 0.4 },
  /* --- MARTA --- */
  analisis: { n: 'Análisis', ap: 1, en: 5, tgt: 'enemy', inflict: ['bloqueo', 1, 4], reveal: 1, d: 'Revela debilidades e inflige Bloqueo.' },
  plan_b: { n: 'Plan B', ap: 2, en: 12, cd: 3, tgt: 'allAllies', buff: ['muro', 3], d: 'Muro (DEF/RES +50%) a todo el equipo.' },
  retro: { n: 'Retrospectiva', ap: 2, en: 14, cd: 2, tgt: 'allAllies', heal: 0.12, cleanse: 1, d: 'Cura al grupo y limpia un estado negativo.' },
  sabotaje: { n: 'Sabotaje', ap: 1, en: 8, cd: 2, pow: 0.7, el: 'men', tgt: 'enemy', inflict: ['lentitud', 0.85, 3], d: 'Daño mental + Lentitud.' },
  gantt: { n: 'Gantt Roto', ap: 2, en: 16, cd: 3, pow: 0.55, hits: 4, el: 'men', tgt: 'enemy', d: 'Cuatro impactos mentales encadenados.' },
  reunion_util: { n: 'Reunión Útil', ap: 3, en: 24, cd: 6, tgt: 'allAllies', ult: 1, apGain: 1, buff: ['foco', 3], d: 'Todo el equipo gana +1 PA el próximo turno y Foco.' },
  /* --- DANI --- */
  golpe_seco: { n: 'Golpe Seco', ap: 1, en: 0, pow: 1.3, el: 'fis', tgt: 'enemy', d: 'Rápido y directo.' },
  racha: { n: 'Racha', ap: 2, en: 10, cd: 2, pow: 0.62, hits: 3, el: 'fis', tgt: 'enemy', d: 'Tres golpes seguidos.' },
  todo_nada: { n: 'Todo o Nada', ap: 2, en: 14, cd: 3, pow: 2.0, el: 'fis', tgt: 'enemy', critBonus: 0.45, selfDebuff: ['bloqueo', 2], d: 'Crítico muy probable, te deja expuesto.' },
  adrenalina: { n: 'Adrenalina', ap: 1, en: 10, cd: 3, tgt: 'self', buff: ['celeridad', 3], apGain: 1, d: '+1 PA el próximo turno y Celeridad.' },
  desahogo: { n: 'Desahogo', ap: 2, en: 15, cd: 3, pow: 1.1, el: 'fis', tgt: 'allEnemies', d: 'Descarga física en área.' },
  ultima_hora: { n: 'Última Hora', ap: 3, en: 25, cd: 6, pow: 3.0, el: 'fis', tgt: 'enemy', ult: 1, lowHpBonus: 1, d: 'Cuanto menos HP te queda, más daño hace.' },
  /* --- LUCÍA --- */
  respirar_s: { n: 'Respirar', ap: 1, en: 6, tgt: 'ally', heal: 0.22, d: 'Curación fiable.' },
  cuidados: { n: 'Cuidados', ap: 2, en: 16, cd: 2, tgt: 'allAllies', heal: 0.16, buff: ['respirar', 3], d: 'Cura al grupo y deja regeneración.' },
  limite: { n: 'Poner un Límite', ap: 1, en: 10, cd: 2, tgt: 'ally', shield: 0.35, d: 'Escudo que absorbe daño.' },
  dormir: { n: 'Descansar de Verdad', ap: 2, en: 12, cd: 3, tgt: 'enemy', inflict: ['sueno', 0.75, 3], d: 'Duerme a un enemigo. Se rompe al golpearlo.' },
  silencio_s: { n: 'Silencio Necesario', ap: 1, en: 11, cd: 3, tgt: 'enemy', inflict: ['silencio', 0.8, 3], d: 'Impide que use habilidades.' },
  segunda: { n: 'Segunda Oportunidad', ap: 3, en: 28, cd: 7, tgt: 'dead', revive: 0.6, ult: 1, d: 'Revive a un aliado con 60% de HP.' },
  /* --- JORGE --- */
  provocar: { n: 'Provocar', ap: 1, en: 5, tgt: 'allEnemies', inflict: ['provocado', 1, 2], buff: ['muro', 2], self: 1, d: 'Atrae los ataques y te refuerza.' },
  muro_s: { n: 'Muro de Carga', ap: 1, en: 8, cd: 2, tgt: 'self', buff: ['muro', 3], d: 'DEF/RES +50% durante 3 turnos.' },
  contra_s: { n: 'Aguantar el Tipo', ap: 2, en: 12, cd: 3, tgt: 'self', buff: ['contra', 3], d: 'Devuelve el 60% del daño recibido.' },
  carga: { n: 'Carga', ap: 2, en: 10, cd: 2, pow: 1.5, el: 'fis', tgt: 'enemy', inflict: ['agotamiento', 0.6, 3], d: 'Embestida que agota.' },
  cubrir: { n: 'Cubrir', ap: 1, en: 9, cd: 2, tgt: 'ally', cover: 3, d: 'Recibes los golpes dirigidos a ese aliado.' },
  no_pasaras: { n: 'De Aquí No Pasa', ap: 3, en: 24, cd: 6, tgt: 'allAllies', ult: 1, shield: 0.45, buff: ['muro', 4], d: 'Escudo y Muro para todo el equipo.' },
  /* --- ENEMIGOS --- */
  e_golpe: { n: 'Golpe', ap: 1, pow: 1, el: 'fis', tgt: 'enemy' },
  e_zumbido: { n: 'Zumbido', ap: 1, pow: 0.9, el: 'men', tgt: 'enemy', inflict: ['duda', 0.35, 3] },
  e_notif: { n: 'Notificación', ap: 1, pow: 0.8, el: 'men', tgt: 'allEnemies', inflict: ['ansiedad', 0.4, 3] },
  e_bloqueo: { n: 'Bloquear Agenda', ap: 1, pow: 0.5, el: 'soc', tgt: 'enemy', inflict: ['bloqueo', 0.8, 3] },
  e_grito: { n: 'Escalar el Tema', ap: 2, pow: 1.6, el: 'soc', tgt: 'enemy', inflict: ['agotamiento', 0.5, 3] },
  e_drenar: { n: 'Drenar Horas', ap: 2, pow: 1.2, el: 'men', tgt: 'enemy', drain: 0.5 },
  e_area: { n: 'Reunión Ampliada', ap: 2, pow: 1.0, el: 'soc', tgt: 'allEnemies' },
  e_lento: { n: 'Retraso', ap: 1, pow: 0.6, el: 'fis', tgt: 'enemy', inflict: ['lentitud', 0.7, 3] },
  e_silencio: { n: 'No Es El Momento', ap: 1, pow: 0.4, el: 'soc', tgt: 'enemy', inflict: ['silencio', 0.6, 2] },
  e_buff: { n: 'Sinergia', ap: 1, tgt: 'ally', buff: ['motivacion', 3] },
  e_cura: { n: 'Recalcular', ap: 2, tgt: 'ally', heal: 0.2 },
  e_kpi: { n: 'Objetivo Trimestral', ap: 2, pow: 1.3, el: 'men', tgt: 'allEnemies', inflict: ['duda', 0.5, 3] },
  e_reset: { n: 'Replanificar', ap: 3, tgt: 'self', cleanse: 1, heal: 0.25 },
  e_espejo: { n: 'Reflejo', ap: 2, pow: 1.5, el: 'men', tgt: 'enemy', mirror: 1 },
  e_juicio: { n: 'Evaluación de Desempeño', ap: 3, pow: 1.8, el: 'soc', tgt: 'allEnemies', inflict: ['duda', 0.7, 4] }
};

/* ---------- 6. DATOS: OBJETOS ---------- */
const ITEMS = {
  cafe: { n: 'Café de máquina', t: 'use', price: 40, heal: 60, d: 'Recupera 60 HP. Sabe a plástico.' },
  cafe2: { n: 'Café de verdad', t: 'use', price: 120, heal: 180, d: 'Recupera 180 HP.' },
  bocata: { n: 'Bocata de tortilla', t: 'use', price: 90, heal: 120, en: 25, d: '120 HP y 25 EN.' },
  siesta: { n: 'Siesta corta', t: 'use', price: 200, healPct: 0.5, d: 'Recupera el 50% del HP máximo.' },
  agua: { n: 'Botella de agua', t: 'use', price: 30, en: 30, d: 'Recupera 30 de Energía.' },
  te: { n: 'Infusión', t: 'use', price: 110, en: 90, d: 'Recupera 90 de Energía.' },
  tila: { n: 'Tila', t: 'use', price: 80, cleanse: 1, d: 'Elimina todos los estados negativos.' },
  finde: { n: 'Fin de semana', t: 'use', price: 600, revive: 0.7, d: 'Revive a un aliado caído con 70% HP.' },
  paseo: { n: 'Paseo largo', t: 'use', price: 350, healAll: 0.35, d: 'Cura al grupo entero un 35%.' },
  /* armas */
  boli: { n: 'Bolígrafo corporativo', t: 'weapon', price: 0, atk: 4, who: 'alex', d: 'Arma inicial de Alex.' },
  llaves: { n: 'Llaves de casa', t: 'weapon', price: 320, atk: 12, spd: 3, who: 'alex' },
  guitarra: { n: 'Guitarra de segunda mano', t: 'weapon', price: 900, atk: 24, mag: 14, who: 'alex' },
  carta: { n: 'Carta de renuncia', t: 'weapon', price: 2100, atk: 42, mag: 26, who: 'alex', d: 'Firmada. Definitiva.' },
  portatil: { n: 'Portátil de empresa', t: 'weapon', price: 0, atk: 5, mag: 8, who: 'marta' },
  cuaderno: { n: 'Cuaderno Moleskine', t: 'weapon', price: 380, mag: 18, res: 4, who: 'marta' },
  pizarra: { n: 'Rotulador de pizarra', t: 'weapon', price: 1100, mag: 34, who: 'marta' },
  mochila: { n: 'Mochila cargada', t: 'weapon', price: 0, atk: 9, who: 'dani' },
  bici: { n: 'Candado de bici', t: 'weapon', price: 420, atk: 20, spd: 4, who: 'dani' },
  maza: { n: 'Llave inglesa', t: 'weapon', price: 1250, atk: 40, who: 'dani' },
  termo: { n: 'Termo', t: 'weapon', price: 0, mag: 7, who: 'lucia' },
  botiquin: { n: 'Botiquín', t: 'weapon', price: 400, mag: 20, res: 6, who: 'lucia' },
  manta: { n: 'Manta de lana', t: 'weapon', price: 1150, mag: 36, res: 12, who: 'lucia' },
  casco: { n: 'Casco de obra', t: 'weapon', price: 0, atk: 8, def: 6, who: 'jorge' },
  escudo: { n: 'Tapa de contenedor', t: 'weapon', price: 450, atk: 14, def: 14, who: 'jorge' },
  viga: { n: 'Viga corta', t: 'weapon', price: 1300, atk: 32, def: 20, who: 'jorge' },
  /* armaduras */
  camisa: { n: 'Camisa planchada', t: 'armor', price: 60, def: 5, res: 2 },
  sudadera: { n: 'Sudadera vieja', t: 'armor', price: 240, def: 12, res: 8 },
  chaqueta: { n: 'Chaqueta de lluvia', t: 'armor', price: 620, def: 22, res: 14 },
  abrigo: { n: 'Abrigo de montaña', t: 'armor', price: 1400, def: 36, res: 26 },
  traje_a: { n: 'Traje entallado', t: 'armor', price: 1800, def: 30, res: 34, spd: -2 },
  /* accesorios */
  auriculares: { n: 'Auriculares', t: 'acc', price: 280, res: 10, d: 'Reduce el daño Mental un 10%.', mit: { men: 0.1 } },
  reloj_a: { n: 'Reloj parado', t: 'acc', price: 520, spd: 8, d: 'Nunca sabes qué hora es. Mejor.' },
  foto: { n: 'Foto antigua', t: 'acc', price: 700, hp: 90, d: 'Un recuerdo que sostiene.' },
  cuerda: { n: 'Cuerda de escalada', t: 'acc', price: 850, def: 12, hp: 60 },
  libreta: { n: 'Libreta de ideas', t: 'acc', price: 900, mag: 16, en: 30 },
  anillo: { n: 'Anillo de tuerca', t: 'acc', price: 1500, atk: 18, crit: 0.08 },
  silencio_i: { n: 'Modo avión', t: 'acc', price: 1600, res: 22, d: 'Inmune a Ansiedad.', immune: ['ansiedad'] },
  brujula: { n: 'Brújula rota', t: 'acc', price: 2400, atk: 12, mag: 12, spd: 6, hp: 100 },
  /* materiales / clave */
  chatarra: { n: 'Chatarra', t: 'mat', price: 25 },
  cable: { n: 'Cable USB', t: 'mat', price: 35 },
  madera: { n: 'Tabla de palé', t: 'mat', price: 30 },
  tarjeta: { n: 'Tarjeta de fichaje', t: 'key', price: 0, d: 'Ya no abre nada.' },
  llave_metro: { n: 'Abono de transporte', t: 'key', price: 0 },
  mapa_bosque: { n: 'Mapa del Bosque', t: 'key', price: 0 },
  permiso: { n: 'Permiso de obra', t: 'key', price: 0 },
  cristal: { n: 'Fragmento de espejo', t: 'key', price: 0 }
};

/* ---------- 7. DATOS: PERSONAJES JUGABLES ---------- */
const CHARS = {
  alex: {
    n: 'Alex', role: 'Equilibrado', pal: pal('alex', { H: '#4a3528', C: '#4d6fb5', A: '#9fb8ee', P: '#2f3549' }),
    base: { hp: 160, en: 50, atk: 18, def: 14, mag: 15, res: 13, spd: 12 },
    grow: { hp: 21, en: 5, atk: 3.1, def: 2.3, mag: 2.6, res: 2.2, spd: 1.5 },
    learn: { 1: ['corte'], 3: ['decision'], 6: ['claridad_s'], 10: ['renuncia'], 15: ['no'], 22: ['punto_final'] },
    bio: 'Doce años en SICE. Se fue un martes. Todavía no sabe si fue valiente o imprudente.'
  },
  marta: {
    n: 'Marta', role: 'Estratega', pal: pal('marta', { H: '#8a3a2a', S: '#e8b487', C: '#6a4f9a', A: '#c0a6e8', P: '#37304a' }),
    base: { hp: 130, en: 70, atk: 12, def: 12, mag: 21, res: 17, spd: 14 },
    grow: { hp: 16, en: 7, atk: 1.9, def: 2.0, mag: 3.5, res: 2.9, spd: 1.8 },
    learn: { 1: ['analisis', 'sabotaje'], 4: ['retro'], 8: ['plan_b'], 13: ['gantt'], 20: ['reunion_util'] },
    bio: 'Sigue dentro. Dice que se queda por el equipo. A veces se lo cree.'
  },
  dani: {
    n: 'Dani', role: 'Atacante', pal: pal('dani', { H: '#1d1a24', S: '#a96b45', C: '#b8452f', A: '#f0a070', P: '#2b2430' }),
    base: { hp: 145, en: 45, atk: 24, def: 11, mag: 8, res: 9, spd: 17 },
    grow: { hp: 18, en: 4, atk: 4.2, def: 1.7, mag: 1.1, res: 1.5, spd: 2.4 },
    learn: { 1: ['golpe_seco'], 3: ['adrenalina'], 7: ['racha'], 12: ['todo_nada'], 17: ['desahogo'], 24: ['ultima_hora'] },
    bio: 'Dejó el trabajo antes que nadie. Lleva tres años diciendo que está genial.'
  },
  lucia: {
    n: 'Lucía', role: 'Soporte', pal: pal('lucia', { H: '#c2913c', S: '#f2cba3', C: '#3f8f74', A: '#a8e0c8', P: '#2a3f3a' }),
    base: { hp: 125, en: 80, atk: 10, def: 11, mag: 23, res: 20, spd: 13 },
    grow: { hp: 15, en: 8, atk: 1.5, def: 1.9, mag: 3.8, res: 3.2, spd: 1.7 },
    learn: { 1: ['respirar_s'], 4: ['limite'], 7: ['silencio_s'], 11: ['cuidados'], 16: ['dormir'], 21: ['segunda'] },
    bio: 'Enfermera. Trabaja más horas que todos y no quiere dejarlo. Eso desconcierta a Alex.'
  },
  jorge: {
    n: 'Jorge', role: 'Tanque', pal: pal('jorge', { H: '#5a5a62', S: '#d9a878', C: '#c8822a', A: '#f2c070', P: '#3a3a44' }),
    base: { hp: 230, en: 40, atk: 16, def: 24, mag: 7, res: 18, spd: 8 },
    grow: { hp: 30, en: 4, atk: 2.6, def: 4.0, mag: 1.0, res: 3.0, spd: 1.0 },
    learn: { 1: ['provocar'], 3: ['muro_s'], 6: ['carga'], 10: ['cubrir'], 14: ['contra_s'], 23: ['no_pasaras'] },
    bio: 'Dos hijos y una hipoteca. No puede irse. No quiere que le compadezcan por ello.'
  }
};

/* ---------- 8. DATOS: ENEMIGOS ---------- */
function E(id, n, grid, p, lvl, st, sk, weak, res, xp, gold, drop) {
  return { id, n, grid, pal: p, lvl, base: st, skills: sk, weak, res, xp, gold, drop };
}
const ENEMIES = {};
[
  E('correo', 'Correo Sin Leer', 'correo', cpal('e1', '#8a8f9e', '#dfe3ee'), 2, { hp: 70, atk: 12, def: 8, mag: 10, res: 7, spd: 9 }, ['e_golpe', 'e_zumbido'], 'soc', 'men', 14, 18, ['cable']),
  E('notif', 'Notificación Perpetua', 'notif', cpal('e2', '#c03a3a', '#f06a5a'), 3, { hp: 60, atk: 10, def: 6, mag: 16, res: 9, spd: 18 }, ['e_notif', 'e_zumbido'], 'fis', 'men', 16, 20, ['cable']),
  E('silla', 'Silla Giratoria', 'silla', cpal('e3', '#3a3a48', '#6a6a7e'), 4, { hp: 110, atk: 16, def: 14, mag: 6, res: 8, spd: 11 }, ['e_golpe', 'e_lento'], 'men', 'fis', 20, 26, ['chatarra']),
  E('impresora', 'Impresora Atascada', 'maquina', cpal('e4', '#6a6f80', '#c8ccd8'), 5, { hp: 150, atk: 18, def: 20, mag: 8, res: 12, spd: 6 }, ['e_golpe', 'e_lento', 'e_bloqueo'], 'men', 'fis', 26, 34, ['chatarra', 'cable']),
  E('becario', 'Becario Fantasma', 'fantasma', cpal('e5', '#5a6a9a', '#9fb4e0'), 4, { hp: 90, atk: 13, def: 9, mag: 18, res: 14, spd: 15 }, ['e_zumbido', 'e_silencio'], 'soc', 'men', 22, 28, []),
  E('alarma', 'Alarma de las 6:50', 'reloj', cpal('e6', '#b03a5a', '#f0a0b0'), 6, { hp: 120, atk: 20, def: 12, mag: 20, res: 12, spd: 22 }, ['e_zumbido', 'e_notif'], 'fis', 'men', 30, 36, []),
  E('comercial', 'Comercial Insistente', 'traje', cpal('e7', '#2a3a6a', '#d8dce8'), 6, { hp: 130, atk: 17, def: 13, mag: 15, res: 16, spd: 14 }, ['e_grito', 'e_silencio', 'e_buff'], 'men', 'soc', 32, 44, []),
  E('vecino', 'Vecino Con Preguntas', 'traje', cpal('e8', '#5a4a2a', '#e8d8b0'), 5, { hp: 105, atk: 14, def: 11, mag: 14, res: 13, spd: 12 }, ['e_bloqueo', 'e_zumbido'], 'fis', 'soc', 26, 38, []),
  E('torniquete', 'Torniquete Hambriento', 'torniquete', cpal('e9', '#4a5a4a', '#a0c090'), 8, { hp: 190, atk: 24, def: 26, mag: 10, res: 14, spd: 8 }, ['e_golpe', 'e_lento'], 'men', 'fis', 42, 52, ['chatarra']),
  E('anuncio', 'Anuncio Luminoso', 'notif', cpal('e10', '#8a3ac0', '#e0a0f0'), 9, { hp: 150, atk: 16, def: 14, mag: 28, res: 18, spd: 20 }, ['e_notif', 'e_drenar'], 'fis', 'men', 46, 56, []),
  E('vagon', 'Vagón de Hora Punta', 'vagon', cpal('e11', '#2a4a6a', '#6a9ac0'), 10, { hp: 260, atk: 28, def: 24, mag: 14, res: 16, spd: 10 }, ['e_area', 'e_golpe', 'e_lento'], 'men', 'fis', 58, 70, ['chatarra']),
  E('megafonia', 'Megafonía', 'maquina', cpal('e12', '#7a6a3a', '#e0d090'), 9, { hp: 160, atk: 14, def: 16, mag: 26, res: 22, spd: 13 }, ['e_silencio', 'e_notif', 'e_cura'], 'fis', 'soc', 48, 60, ['cable']),
  E('domingo', 'Domingo Por La Tarde', 'nube', cpal('e13', '#4a4a7a', '#9a9ac8'), 12, { hp: 230, atk: 20, def: 18, mag: 32, res: 26, spd: 14 }, ['e_notif', 'e_drenar', 'e_zumbido'], 'soc', 'men', 70, 78, []),
  E('ansiedad_n', 'Ansiedad Nocturna', 'nube', cpal('e14', '#2a2a4a', '#6a5a9a'), 13, { hp: 200, atk: 18, def: 14, mag: 38, res: 24, spd: 24 }, ['e_notif', 'e_zumbido', 'e_drenar'], 'soc', 'men', 76, 84, []),
  E('recuerdo', 'Recuerdo Insistente', 'fantasma', cpal('e15', '#6a8a7a', '#c0e0d0'), 12, { hp: 210, atk: 22, def: 17, mag: 28, res: 22, spd: 17 }, ['e_drenar', 'e_bloqueo'], 'fis', 'men', 68, 74, ['madera']),
  E('musgo', 'Musgo del Tiempo', 'nube', cpal('e16', '#3a6a3a', '#90c070'), 11, { hp: 280, atk: 20, def: 26, mag: 16, res: 20, spd: 6 }, ['e_lento', 'e_golpe'], 'fis', 'men', 62, 66, ['madera']),
  E('trader', 'Trader Agotado', 'traje', cpal('e17', '#1a1a2a', '#c8c0a0'), 15, { hp: 260, atk: 34, def: 22, mag: 24, res: 22, spd: 21 }, ['e_grito', 'e_buff', 'e_golpe'], 'men', 'soc', 96, 120, []),
  E('clausula', 'Cláusula Pequeña', 'correo', cpal('e18', '#5a5a3a', '#e8e8c0'), 14, { hp: 240, atk: 22, def: 30, mag: 30, res: 28, spd: 12 }, ['e_bloqueo', 'e_silencio', 'e_drenar'], 'fis', 'soc', 90, 110, []),
  E('nomina', 'Nómina Fantasma', 'fantasma', cpal('e19', '#3a5a5a', '#a0d0d0'), 16, { hp: 280, atk: 26, def: 24, mag: 34, res: 30, spd: 18 }, ['e_drenar', 'e_kpi'], 'soc', 'men', 104, 140, []),
  E('onboarding', 'Onboarding Infinito', 'maquina', cpal('e20', '#3a4a8a', '#a0b0e8'), 15, { hp: 320, atk: 24, def: 28, mag: 28, res: 26, spd: 11 }, ['e_area', 'e_bloqueo', 'e_cura'], 'men', 'soc', 100, 126, ['cable']),
  E('comparacion', 'Comparación', 'espejo', cpal('e21', '#7a7a8a', '#e8e8f8'), 19, { hp: 340, atk: 30, def: 26, mag: 40, res: 32, spd: 22 }, ['e_espejo', 'e_kpi'], 'fis', 'men', 150, 170, ['cristal']),
  E('dudaE', 'Duda Razonable', 'nube', cpal('e22', '#5a4a6a', '#b0a0c8'), 18, { hp: 300, atk: 26, def: 24, mag: 38, res: 34, spd: 20 }, ['e_zumbido', 'e_drenar', 'e_silencio'], 'soc', 'men', 140, 150, []),
  E('futuro', 'Futuro Difuso', 'fantasma', cpal('e23', '#8a8a5a', '#f0f0c0'), 20, { hp: 380, atk: 32, def: 28, mag: 36, res: 30, spd: 19 }, ['e_kpi', 'e_bloqueo', 'e_reset'], 'fis', 'soc', 160, 190, []),
  E('eco', 'Eco del Espejo', 'espejo', cpal('e24', '#404050', '#c0c8e0'), 22, { hp: 420, atk: 36, def: 30, mag: 42, res: 36, spd: 24 }, ['e_espejo', 'e_grito', 'e_kpi'], null, 'men', 190, 220, ['cristal'])
].forEach(e => ENEMIES[e.id] = e);

/* ---------- 9. DATOS: JEFES ---------- */
function BD(id, n, grid, p, lvl, st, sk, weak, res, xp, gold, mech, intro) {
  return { id, n, grid, pal: p, lvl, base: st, skills: sk, weak, res, xp, gold, boss: 1, mech, intro, drop: [] };
}
const BOSSES = {};
[
  BD('fichaje', 'EL ÚLTIMO FICHAJE', 'torniquete', cpal('b1', '#2a3a5a', '#8ab0d8'), 5,
    { hp: 420, atk: 20, def: 18, mag: 16, res: 14, spd: 12 }, ['e_golpe', 'e_bloqueo', 'e_lento'], 'soc', 'fis', 140, 200,
    { enrage: 0.3 }, 'La puerta te reconoce. Todavía.'),
  BD('reunion', 'LA REUNIÓN INFINITA', 'maquina', cpal('b2', '#4a4a6a', '#b0b0d0'), 8,
    { hp: 1020, atk: 22, def: 24, mag: 26, res: 24, spd: 10 }, ['e_area', 'e_silencio', 'e_bloqueo', 'e_cura'], 'fis', 'soc', 260, 340,
    { summon: ['correo', 'notif'], summonEvery: 3 }, 'Solo serán quince minutos.'),
  BD('calendario', 'EL CALENDARIO', 'calendario', cpal('b3', '#8a2a3a', '#f0c0a0'), 12,
    { hp: 1100, atk: 30, def: 26, mag: 34, res: 26, spd: 26 }, ['e_notif', 'e_kpi', 'e_lento', 'e_area'], 'men', 'soc', 460, 520,
    { hasteEvery: 4 }, 'Cada casilla ocupada es una decisión que ya no puedes tomar.'),
  BD('sueldo', 'EL SUELDO FANTASMA', 'fantasma', cpal('b4', '#2a6a5a', '#a0e0c8'), 14,
    { hp: 1250, atk: 32, def: 24, mag: 36, res: 30, spd: 18 }, ['e_drenar', 'e_bloqueo', 'e_kpi'], 'fis', 'men', 540, 700,
    { drainGold: 1 }, 'El día 30 ya no llega nada.'),
  BD('algoritmo', 'EL ALGORITMO', 'notif', cpal('b5', '#3a2a7a', '#c0a0f0'), 17,
    { hp: 1500, atk: 34, def: 28, mag: 44, res: 34, spd: 30 }, ['e_notif', 'e_espejo', 'e_kpi', 'e_reset'], 'fis', 'men', 700, 860,
    { adapt: 1 }, 'Aprende de ti más rápido de lo que tú aprendes de él.'),
  BD('kpi', 'EL KPI', 'grafico', cpal('b6', '#8a6a1a', '#f0d070'), 19,
    { hp: 1700, atk: 38, def: 32, mag: 40, res: 32, spd: 20 }, ['e_kpi', 'e_grito', 'e_bloqueo', 'e_area'], 'soc', 'men', 820, 980,
    { growEvery: 3 }, 'Lo que no se mide no existe. Tú llevas meses sin medirte.'),
  BD('mercado', 'EL MERCADO LABORAL', 'vagon', cpal('b7', '#5a5a2a', '#e0e0a0'), 21,
    { hp: 1950, atk: 42, def: 34, mag: 38, res: 36, spd: 22 }, ['e_area', 'e_juicio', 'e_lento', 'e_reset'], 'men', 'fis', 960, 1200,
    { random: 1 }, 'Nadie sabe lo que quiere. Ni siquiera él.'),
  BD('jefe', 'EL JEFE', 'jefe', cpal('b8', '#6a1a2a', '#e0b090'), 23,
    { hp: 2300, atk: 46, def: 38, mag: 42, res: 38, spd: 24 }, ['e_juicio', 'e_grito', 'e_silencio', 'e_buff', 'e_area'], 'soc', 'fis', 1150, 1500,
    { phases: 2 }, 'No es malo. Es exactamente lo que el sistema le pidió que fuera.'),
  BD('comparacion_b', 'LA COMPARACIÓN', 'espejo', cpal('b9', '#3a5a7a', '#d0e8f8'), 25,
    { hp: 2500, atk: 44, def: 36, mag: 50, res: 42, spd: 28 }, ['e_espejo', 'e_kpi', 'e_juicio', 'e_drenar'], null, 'men', 1300, 1700,
    { copyStats: 1 }, 'Le muestra a cada uno la vida que no eligió.'),
  BD('espejo_b', 'EL ESPEJO', 'espejo_boss', cpal('b10', '#1a1a2a', '#e8e8f8'), 28,
    { hp: 3400, atk: 50, def: 40, mag: 52, res: 44, spd: 26 }, ['e_espejo', 'e_juicio', 'e_grito', 'e_reset', 'e_kpi'], null, null, 2200, 2600,
    { phases: 3, final: 1 }, 'No tiene voz propia. Usa la tuya.')
].forEach(b => BOSSES[b.id] = b);

function enemyDef(id) { return ENEMIES[id] || BOSSES[id]; }

/* ---------- 10. TILES Y TEMAS ---------- */
const T = { FLOOR: 0, WALL: 1, WATER: 2, PATH: 3, TREE: 4, BUILD: 5, BRIDGE: 6, TALL: 7, DOOR: 8, CARPET: 9, DESK: 10, ROCK: 11, SAND: 12, SNOW: 13, METAL: 14, RAIL: 15, VOID: 16 };
const SOLID = { 1: 1, 2: 1, 4: 1, 5: 1, 10: 1, 11: 1, 16: 1 };
const ELEVATED = { 1: 10, 4: 14, 5: 18, 10: 6, 11: 9 };

const THEMES = {
  office: { sky: '#1a1b26', 0: ['#40424f', '#4a4c5a'], 3: ['#565a6a', '#5f6474'], 9: ['#6a4550', '#74505c'], 1: ['#2c2e3a', '#5a5e70'], 5: ['#33353f', '#4a4d5c'], 10: ['#4a3a2e', '#6a5442'], 8: ['#8a6a3a', '#b08a4a'], 14: ['#4d5260', '#585e6e'], 16: ['#101018', '#101018'], light: '#ffe9c0', amb: 0.10 },
  town: { sky: '#2a2438', 0: ['#3d6a42', '#48784d'], 3: ['#8a7a5e', '#988769'], 5: ['#5a4a58', '#7a6478'], 1: ['#4a3f4c', '#6a5a6c'], 4: ['#25502e', '#2f6038'], 2: ['#2a4a7a', '#35609a'], 6: ['#7a5a3a', '#8f6c48'], 7: ['#356038', '#3f7042'], 8: ['#8a6a3a', '#b08a4a'], 11: ['#4a4a52', '#66666e'], 16: ['#14121c', '#14121c'], light: '#ffd9a0', amb: 0.22 },
  route: { sky: '#26304a', 0: ['#476a3e', '#537a48'], 3: ['#8d7d5c', '#9c8b68'], 4: ['#22482a', '#2b5634'], 2: ['#27477a', '#325c96'], 6: ['#7a5a3a', '#8f6c48'], 7: ['#3a6a3c', '#457a46'], 11: ['#4d4d55', '#696971'], 1: ['#3a3f44', '#555b62'], 5: ['#544860', '#6e6080'], 8: ['#8a6a3a', '#b08a4a'], 16: ['#101420', '#101420'], light: '#ffe4b0', amb: 0.28 },
  metro: { sky: '#0e0f18', 0: ['#2e3038', '#373943'], 3: ['#3d4049', '#474a55'], 14: ['#44484f', '#50555e'], 15: ['#5a5148', '#6e6254'], 1: ['#1e2028', '#3a3d47'], 5: ['#242630', '#34374a'], 10: ['#3a3038', '#4e424c'], 2: ['#1a2c3a', '#24404f'], 8: ['#7a5a2a', '#a07a3a'], 16: ['#07070c', '#07070c'], light: '#b8d8ff', amb: 0.06 },
  forest: { sky: '#1e2438', 0: ['#2f5236', '#38603f'], 3: ['#6a5c46', '#786950'], 4: ['#193a20', '#204828'], 2: ['#1e3d62', '#27507e'], 6: ['#66492f', '#7a5a3c'], 7: ['#2a5630', '#336339'], 11: ['#41414a', '#595963'], 1: ['#2a3a2c', '#3f523f'], 5: ['#3a3242', '#524658'], 8: ['#7a5a2a', '#a07a3a'], 16: ['#0c0f16', '#0c0f16'], light: '#a0c8ff', amb: 0.14 },
  finance: { sky: '#151824', 0: ['#3a3d4a', '#454956'], 3: ['#55596a', '#60647a'], 5: ['#282c3c', '#3c4256'], 1: ['#222636', '#3a3f54'], 2: ['#1e3050', '#284068'], 6: ['#4a4a58', '#5c5c6c'], 10: ['#3a3242', '#4e4458'], 8: ['#7a6a3a', '#a08a4a'], 14: ['#454a5a', '#515668'], 16: ['#0a0c14', '#0a0c14'], light: '#cfe0ff', amb: 0.12 },
  desert: { sky: '#3a2a20', 12: ['#a88a52', '#b89a5e'], 0: ['#a88a52', '#b89a5e'], 3: ['#c0a468', '#cdb276'], 11: ['#6e5a42', '#86705a'], 1: ['#5e4c38', '#7a654c'], 5: ['#6a5640', '#8a7256'], 4: ['#5a6a3a', '#6e7e48'], 8: ['#8a6a3a', '#b08a4a'], 16: ['#1c1208', '#1c1208'], light: '#ffd58a', amb: 0.34 },
  archive: { sky: '#12101a', 0: ['#3a3242', '#443c4e'], 3: ['#4c4456', '#565064'], 1: ['#241e2c', '#3c3448'], 5: ['#2a2434', '#3e3648'], 10: ['#4a3a2e', '#63503f'], 8: ['#7a5a2a', '#a07a3a'], 16: ['#08070c', '#08070c'], light: '#e8c890', amb: 0.08 },
  mountain: { sky: '#2a3450', 13: ['#b8c4d8', '#c6d2e4'], 0: ['#7e8a9c', '#8c98aa'], 3: ['#98a4b6', '#a6b2c4'], 11: ['#5a6070', '#747a8c'], 1: ['#4a5060', '#666c7e'], 4: ['#2a4a3a', '#356048'], 2: ['#3a6a9a', '#4a80b4'], 6: ['#6a5a4a', '#7e6c5a'], 8: ['#7a5a2a', '#a07a3a'], 16: ['#141a28', '#141a28'], light: '#ffffff', amb: 0.32 },
  mirror: { sky: '#08080f', 0: ['#1c1c2a', '#242436'], 3: ['#2c2c40', '#36364e'], 1: ['#121220', '#242438'], 14: ['#30304a', '#3a3a58'], 5: ['#181828', '#282840'], 8: ['#6a6a9a', '#8a8ac0'], 16: ['#000000', '#000000'], light: '#e0e0ff', amb: 0.05 }
};

/* ---------- 11. ZONAS ---------- */
/* gen: base, obstacle, obsAmt, water, tall, deco */
const ZONES = {
  oficina: {
    n: 'SICE — Planta 7', theme: 'office', w: 44, h: 34, seed: 1001, lvl: 2,
    gen: { base: T.FLOOR, obs: T.WALL, obsAmt: 0.10, rooms: 1, desk: 0.05 },
    weather: null, enc: ['correo', 'notif', 'silla', 'becario'], encRate: 0.018, encTiles: [T.FLOOR, T.CARPET],
    npcs: [
      { x: 8, y: 26, n: 'Marta', p: 'marta', s: 'marta_of' },
      { x: 30, y: 10, n: 'Jorge', p: 'jorge', s: 'jorge_of' },
      { x: 20, y: 6, n: 'Recepción', p: 'npc_g', s: 'recepcion' },
      { x: 34, y: 24, n: 'Compañero', p: 'npc_b', s: 'comp1' },
      { x: 12, y: 14, n: 'Compañera', p: 'npc_p', s: 'comp2' },
      { x: 38, y: 16, n: 'Máquina de café', p: 'npc_m', s: 'maquina_cafe' }
    ],
    chests: [{ x: 5, y: 5, it: 'cafe', n: 3 }, { x: 40, y: 30, it: 'camisa' }, { x: 26, y: 30, gold: 120 }],
    exits: [{ x: 21, y: 32, to: 'barrio', tx: 24, ty: 8, label: 'Salir del edificio', need: { flag: 'ch1_boss' } }],
    boss: { x: 21, y: 30, id: 'fichaje', flag: 'ch1_boss', pre: 'boss_fichaje' }
  },
  barrio: {
    n: 'Barrio de Villa Ronda', theme: 'town', w: 52, h: 40, seed: 2002, lvl: 4,
    gen: { base: T.FLOOR, obs: T.TREE, obsAmt: 0.09, build: 6, tall: 0.08, water: 0 },
    weather: null, enc: ['vecino', 'comercial', 'alarma', 'notif'], encRate: 0.022, encTiles: [T.TALL],
    npcs: [
      { x: 22, y: 12, n: 'Lucía', p: 'lucia', s: 'lucia_barrio' },
      { x: 34, y: 20, n: 'Dani', p: 'dani', s: 'dani_barrio' },
      { x: 12, y: 24, n: 'Rosa, la del quiosco', p: 'npc_p', s: 'rosa' },
      { x: 44, y: 14, n: 'Chico del portal', p: 'npc_b', s: 'portal' },
      { x: 16, y: 34, n: 'Señor Tomás', p: 'npc_g', s: 'tomas' },
      { x: 40, y: 32, n: 'Nerea', p: 'npc_r', s: 'nerea' },
      { x: 28, y: 28, n: 'Camarero del Ronda', p: 'npc_m', s: 'camarero', shop: 'bar' }
    ],
    chests: [{ x: 6, y: 6, it: 'agua', n: 2 }, { x: 48, y: 36, it: 'auriculares' }, { x: 8, y: 36, gold: 200 }],
    exits: [
      { x: 24, y: 6, to: 'oficina', tx: 21, ty: 30, label: 'SICE (cerrado)', need: { flag: 'nunca' } },
      { x: 50, y: 20, to: 'meridiana', tx: 3, ty: 22, label: 'Ciudad Meridiana', need: { ch: 3 } },
      { x: 26, y: 38, to: 'ruta_norte', tx: 20, ty: 3, label: 'Ruta Norte', need: { ch: 5 } }
    ]
  },
  meridiana: {
    n: 'Ciudad Meridiana', theme: 'town', w: 56, h: 42, seed: 3003, lvl: 7,
    gen: { base: T.FLOOR, obs: T.TREE, obsAmt: 0.06, build: 10, tall: 0.05, water: 1 },
    weather: 'rain', enc: ['comercial', 'anuncio', 'becario', 'alarma'], encRate: 0.02, encTiles: [T.TALL],
    npcs: [
      { x: 14, y: 12, n: 'Tendera', p: 'npc_p', s: 'tienda_gen', shop: 'general' },
      { x: 40, y: 14, n: 'Herrera', p: 'npc_r', s: 'tienda_arm', shop: 'armas' },
      { x: 26, y: 30, n: 'Sonia', p: 'npc_b', s: 'sonia' },
      { x: 44, y: 34, n: 'Iker', p: 'npc_g', s: 'iker' },
      { x: 10, y: 34, n: 'Músico callejero', p: 'npc_m', s: 'musico' },
      { x: 50, y: 8, n: 'Reclutadora', p: 'npc_p2', s: 'reclutadora' },
      { x: 30, y: 8, n: 'Padre con carrito', p: 'npc_b', s: 'padre' },
      { x: 20, y: 38, n: 'Ana la fisio', p: 'npc_r', s: 'ana', shop: 'posada' }
    ],
    chests: [{ x: 4, y: 4, it: 'sudadera' }, { x: 52, y: 40, it: 'reloj_a' }, { x: 4, y: 40, gold: 450 }, { x: 52, y: 4, it: 'tila', n: 3 }],
    exits: [
      { x: 3, y: 22, to: 'barrio', tx: 48, ty: 20, label: 'Villa Ronda' },
      { x: 54, y: 22, to: 'metro', tx: 4, ty: 20, label: 'Estación — El Metro', need: { ch: 4 } },
      { x: 28, y: 3, to: 'financiera', tx: 24, ty: 44, label: 'Ciudad Financiera', need: { ch: 8 } }
    ],
    boss: { x: 26, y: 20, id: 'reunion', flag: 'ch3_boss', pre: 'boss_reunion', need: { ch: 3 }, once: 1 }
  },
  ruta_norte: {
    n: 'Ruta Norte — Extrarradio', theme: 'route', w: 48, h: 46, seed: 4004, lvl: 9,
    gen: { base: T.FLOOR, obs: T.TREE, obsAmt: 0.16, tall: 0.22, water: 1, rocks: 0.05 },
    weather: 'wind', enc: ['alarma', 'vecino', 'musgo', 'recuerdo', 'comercial'], encRate: 0.03, encTiles: [T.TALL, T.FLOOR],
    npcs: [
      { x: 24, y: 20, n: 'Ciclista', p: 'npc_r', s: 'ciclista' },
      { x: 10, y: 34, n: 'Pastor', p: 'npc_g', s: 'pastor' },
      { x: 38, y: 40, n: 'Excursionista', p: 'npc_b', s: 'excursionista' },
      { x: 30, y: 8, n: 'Vendedor ambulante', p: 'npc_m', s: 'ambulante', shop: 'ruta' }
    ],
    chests: [{ x: 5, y: 43, it: 'cuerda' }, { x: 44, y: 5, it: 'bocata', n: 3 }, { x: 22, y: 44, gold: 380 }, { x: 45, y: 30, it: 'mapa_bosque' }],
    exits: [
      { x: 20, y: 3, to: 'barrio', tx: 26, ty: 36, label: 'Villa Ronda' },
      { x: 44, y: 22, to: 'bosque', tx: 4, ty: 24, label: 'Bosque del Domingo', need: { item: 'mapa_bosque' } },
      { x: 6, y: 6, to: 'archivo', tx: 20, ty: 34, label: 'El Archivo', need: { ch: 10 } }
    ]
  },
  metro: {
    n: 'El Metro', theme: 'metro', w: 50, h: 36, seed: 5005, lvl: 11,
    gen: { base: T.METAL, obs: T.WALL, obsAmt: 0.20, rail: 1, corridors: 1 },
    weather: null, enc: ['torniquete', 'vagon', 'anuncio', 'megafonia', 'notif'], encRate: 0.038, encTiles: [T.METAL, T.FLOOR, T.PATH],
    npcs: [
      { x: 12, y: 8, n: 'Revisor', p: 'npc_g', s: 'revisor' },
      { x: 38, y: 28, n: 'Chica con libro', p: 'npc_p', s: 'chica_libro' },
      { x: 24, y: 18, n: 'Hombre dormido', p: 'npc_b', s: 'dormido' }
    ],
    chests: [{ x: 4, y: 32, it: 'llaves' }, { x: 46, y: 4, it: 'cafe2', n: 3 }, { x: 46, y: 32, gold: 600 }, { x: 24, y: 4, it: 'foto' }],
    exits: [{ x: 4, y: 20, to: 'meridiana', tx: 52, ty: 22, label: 'Salida' }],
    boss: { x: 44, y: 18, id: 'calendario', flag: 'ch4_boss', pre: 'boss_calendario' }
  },
  bosque: {
    n: 'Bosque del Domingo', theme: 'forest', w: 52, h: 48, seed: 6006, lvl: 13,
    gen: { base: T.FLOOR, obs: T.TREE, obsAmt: 0.26, tall: 0.24, water: 1, rocks: 0.04 },
    weather: 'fog', enc: ['domingo', 'ansiedad_n', 'recuerdo', 'musgo'], encRate: 0.034, encTiles: [T.TALL, T.FLOOR],
    npcs: [
      { x: 26, y: 24, n: 'Ermitaño', p: 'npc_g', s: 'ermitano' },
      { x: 14, y: 40, n: 'Pareja acampada', p: 'npc_r', s: 'pareja' },
      { x: 42, y: 12, n: 'Niña perdida', p: 'npc_p2', s: 'nina' }
    ],
    chests: [{ x: 6, y: 44, it: 'chaqueta' }, { x: 48, y: 44, it: 'libreta' }, { x: 48, y: 6, gold: 800 }, { x: 20, y: 6, it: 'paseo', n: 2 }],
    exits: [{ x: 4, y: 24, to: 'ruta_norte', tx: 42, ty: 22, label: 'Ruta Norte' }],
    boss: { x: 44, y: 40, id: 'sueldo', flag: 'ch6_boss', pre: 'boss_sueldo', need: { ch: 6 } }
  },
  financiera: {
    n: 'Ciudad Financiera', theme: 'finance', w: 54, h: 46, seed: 7007, lvl: 16,
    gen: { base: T.FLOOR, obs: T.BUILD, obsAmt: 0.14, build: 12, corridors: 1 },
    weather: 'rain', enc: ['trader', 'clausula', 'nomina', 'onboarding', 'anuncio'], encRate: 0.036, encTiles: [T.FLOOR, T.PATH],
    npcs: [
      { x: 10, y: 10, n: 'Analista', p: 'npc_b', s: 'analista' },
      { x: 44, y: 36, n: 'Limpiadora', p: 'npc_p', s: 'limpiadora' },
      { x: 28, y: 14, n: 'Emprendedor', p: 'npc_r', s: 'emprendedor' },
      { x: 16, y: 38, n: 'Vendedor de trajes', p: 'npc_m', s: 'trajes', shop: 'lujo' }
    ],
    chests: [{ x: 4, y: 4, it: 'traje_a' }, { x: 50, y: 4, it: 'silencio_i' }, { x: 4, y: 42, gold: 1400 }, { x: 50, y: 42, it: 'permiso' }],
    exits: [
      { x: 24, y: 44, to: 'meridiana', tx: 28, ty: 5, label: 'Meridiana' },
      { x: 52, y: 22, to: 'desierto', tx: 4, ty: 22, label: 'Desierto de los KPIs', need: { ch: 9 } }
    ],
    boss: { x: 26, y: 8, id: 'algoritmo', flag: 'ch8_boss', pre: 'boss_algoritmo', need: { ch: 8 } }
  },
  desierto: {
    n: 'Desierto de los KPIs', theme: 'desert', w: 56, h: 40, seed: 8008, lvl: 19,
    gen: { base: T.SAND, obs: T.ROCK, obsAmt: 0.13, rocks: 0.10 },
    weather: 'sand', enc: ['futuro', 'dudaE', 'nomina', 'clausula', 'trader'], encRate: 0.04, encTiles: [T.SAND, T.PATH],
    npcs: [
      { x: 20, y: 30, n: 'Consultor perdido', p: 'npc_b', s: 'consultor' },
      { x: 42, y: 12, n: 'Estatua de bronce', p: 'npc_g', s: 'estatua' }
    ],
    chests: [{ x: 5, y: 36, it: 'anillo' }, { x: 50, y: 5, it: 'te', n: 4 }, { x: 5, y: 5, gold: 1800 }],
    exits: [
      { x: 4, y: 22, to: 'financiera', tx: 50, ty: 22, label: 'Ciudad Financiera' },
      { x: 52, y: 20, to: 'montana', tx: 24, ty: 44, label: 'Montaña del Futuro', need: { ch: 11 } }
    ],
    boss: { x: 30, y: 18, id: 'kpi', flag: 'ch9_boss', pre: 'boss_kpi', need: { ch: 9 } }
  },
  archivo: {
    n: 'El Archivo', theme: 'archive', w: 42, h: 38, seed: 9009, lvl: 18,
    gen: { base: T.FLOOR, obs: T.WALL, obsAmt: 0.24, desk: 0.10, corridors: 1 },
    weather: null, enc: ['clausula', 'recuerdo', 'becario', 'dudaE'], encRate: 0.04, encTiles: [T.FLOOR, T.PATH],
    npcs: [{ x: 20, y: 20, n: 'Archivera', p: 'npc_p2', s: 'archivera' }],
    chests: [{ x: 4, y: 4, it: 'brujula' }, { x: 38, y: 34, gold: 1200 }, { x: 4, y: 34, it: 'finde', n: 2 }],
    exits: [{ x: 20, y: 34, to: 'ruta_norte', tx: 8, ty: 8, label: 'Salir' }],
    boss: { x: 20, y: 6, id: 'mercado', flag: 'ch10_boss', pre: 'boss_mercado', need: { ch: 10 } }
  },
  montana: {
    n: 'La Montaña del Futuro', theme: 'mountain', w: 46, h: 48, seed: 10010, lvl: 23,
    gen: { base: T.SNOW, obs: T.ROCK, obsAmt: 0.22, rocks: 0.08, water: 1 },
    weather: 'snow', enc: ['comparacion', 'futuro', 'dudaE', 'eco'], encRate: 0.042, encTiles: [T.SNOW, T.PATH],
    npcs: [
      { x: 22, y: 34, n: 'Refugio — Guarda', p: 'npc_g', s: 'guarda', shop: 'refugio' },
      { x: 12, y: 18, n: 'Escaladora', p: 'npc_r', s: 'escaladora' }
    ],
    chests: [{ x: 4, y: 4, it: 'abrigo' }, { x: 42, y: 44, it: 'maza' }, { x: 42, y: 4, gold: 2200 }],
    exits: [
      { x: 24, y: 46, to: 'desierto', tx: 50, ty: 20, label: 'Desierto' },
      { x: 22, y: 3, to: 'espejo', tx: 20, ty: 30, label: 'La Cumbre', need: { flag: 'ch12_boss' } }
    ],
    boss: { x: 22, y: 8, id: 'jefe', flag: 'ch12_boss', pre: 'boss_jefe', need: { ch: 12 } }
  },
  espejo: {
    n: 'El Espejo', theme: 'mirror', w: 40, h: 36, seed: 11011, lvl: 27,
    gen: { base: T.FLOOR, obs: T.WALL, obsAmt: 0.12, corridors: 1 },
    weather: 'ash', enc: ['eco', 'comparacion'], encRate: 0.03, encTiles: [T.FLOOR, T.PATH],
    npcs: [{ x: 20, y: 24, n: '¿Alex?', p: 'alex', s: 'otro_alex' }],
    chests: [{ x: 4, y: 4, it: 'carta' }, { x: 36, y: 4, it: 'finde', n: 3 }],
    exits: [{ x: 20, y: 32, to: 'montana', tx: 22, ty: 5, label: 'Bajar' }],
    boss: { x: 20, y: 14, id: 'comparacion_b', flag: 'ch13_boss', pre: 'boss_comparacion' },
    boss2: { x: 20, y: 6, id: 'espejo_b', flag: 'final_boss', pre: 'boss_espejo', need: { flag: 'ch13_boss' } }
  }
};

/* Paletas de NPCs genéricos */
const NPCPAL = {
  npc_g: pal('npcg', { H: '#9a9a9a', C: '#6a6a72', A: '#8a8a94', P: '#3a3a42' }),
  npc_b: pal('npcb', { H: '#2a2420', C: '#3f6a5a', A: '#70a090', P: '#2c3540' }),
  npc_p: pal('npcp', { H: '#6a2a4a', S: '#e8b487', C: '#a8547a', A: '#e0a0c0', P: '#402a3a' }),
  npc_p2: pal('npcp2', { H: '#c8a040', S: '#f0cfa8', C: '#7a9ac8', A: '#c0d8f0', P: '#33405a' }),
  npc_r: pal('npcr', { H: '#a04a20', S: '#d9a878', C: '#4a8a4a', A: '#90d090', P: '#2e3a2e' }),
  npc_m: pal('npcm', { H: '#20201a', S: '#a96b45', C: '#8a7a4a', A: '#d0c080', P: '#3a3428' })
};
function npcPal(k) { return NPCPAL[k] || (CHARS[k] ? CHARS[k].pal : NPCPAL.npc_g); }

/* ---------- 12. TIENDAS ---------- */
const SHOPS = {
  bar: { n: 'Bar Ronda', items: ['cafe', 'agua', 'bocata', 'tila'] },
  general: { n: 'Todo a Mano', items: ['cafe', 'cafe2', 'agua', 'te', 'bocata', 'tila', 'camisa', 'sudadera', 'auriculares'] },
  armas: { n: 'Herrera e Hijas', items: ['llaves', 'cuaderno', 'bici', 'botiquin', 'escudo', 'sudadera', 'reloj_a'] },
  posada: { n: 'Consulta de Ana', items: ['tila', 'siesta', 'paseo'], inn: 1, innPrice: 80 },
  ruta: { n: 'Furgoneta de Paco', items: ['cafe', 'bocata', 'agua', 'cuerda', 'chaqueta'] },
  lujo: { n: 'Sastrería Lombard', items: ['traje_a', 'chaqueta', 'silencio_i', 'libreta', 'foto', 'cafe2'] },
  refugio: { n: 'Refugio de la Cara Norte', items: ['abrigo', 'maza', 'viga', 'manta', 'pizarra', 'carta', 'anillo', 'brujula', 'finde', 'paseo', 'siesta'], inn: 1, innPrice: 300 }
};

/* ---------- 13. CAPÍTULOS ---------- */
const CHAPTERS = [
  { n: 1, t: 'El último fichaje', o: 'Recorre la planta 7 y enfréntate a lo que hay en la puerta.', zone: 'oficina' },
  { n: 2, t: 'La puerta', o: 'Vuelve al barrio. Habla con Lucía y con Dani.', zone: 'barrio' },
  { n: 3, t: 'El primer día sin calendario', o: 'Viaja a Ciudad Meridiana y termina con la Reunión Infinita.', zone: 'meridiana' },
  { n: 4, t: 'La ciudad sin oficina', o: 'Baja al Metro y detén al Calendario.', zone: 'metro' },
  { n: 5, t: 'Dinero', o: 'Sal a la Ruta Norte. Necesitas ingresos y aire.', zone: 'ruta_norte' },
  { n: 6, t: '¿Y ahora qué?', o: 'Cruza el Bosque del Domingo y afronta al Sueldo Fantasma.', zone: 'bosque' },
  { n: 7, t: 'Los que se quedaron', o: 'Habla con quienes siguen dentro. Escúchalos de verdad.', zone: 'barrio' },
  { n: 8, t: 'Los que escaparon', o: 'Entra en la Ciudad Financiera y desactiva el Algoritmo.', zone: 'financiera' },
  { n: 9, t: 'El precio de medirlo todo', o: 'Atraviesa el Desierto de los KPIs.', zone: 'desierto' },
  { n: 10, t: 'El currículum', o: 'Encuentra El Archivo y enfréntate al Mercado Laboral.', zone: 'archivo' },
  { n: 11, t: 'Volver a empezar', o: 'Sube hacia la Montaña del Futuro.', zone: 'montana' },
  { n: 12, t: 'El trabajo de ser uno mismo', o: 'En la montaña te espera El Jefe.', zone: 'montana' },
  { n: 13, t: 'La Comparación', o: 'Cruza a El Espejo.', zone: 'espejo' },
  { n: 14, t: '¿Qué quieres hacer mañana?', o: 'Enfréntate a El Espejo.', zone: 'espejo' }
];

/* ---------- 14. MISIONES ---------- */
function Q(id, n, z, d, r) { return { id, n, z, d, r }; }
const QUESTS = {};
[
  Q('q_marta', 'El antiguo compañero', 'oficina', 'Marta te pidió que no desaparecieras. Habla con ella cuando salgas.', { xp: 80, gold: 150 }),
  Q('q_cafe', 'La máquina que se quedó tu euro', 'oficina', 'La máquina de café de la planta 7 te debe algo.', { xp: 40, gold: 60, it: ['cafe', 3] }),
  Q('q_rosa', 'El quiosco de Rosa', 'barrio', 'Rosa lleva 31 años abriendo a las 6. Quiere contártelo.', { xp: 120, gold: 200 }),
  Q('q_tomas', 'El jubilado', 'barrio', 'Tomás se jubiló hace ocho meses y no sabe qué hacer con los días.', { xp: 140, gold: 180, it: ['foto', 1] }),
  Q('q_nerea', 'La que se fue primero', 'barrio', 'Nerea dejó su trabajo hace dos años. Quiere que veas cómo le fue.', { xp: 160, gold: 250 }),
  Q('q_portal', 'El chico del portal', 'barrio', 'Busca su primer trabajo y te pide consejo.', { xp: 100, gold: 120 }),
  Q('q_curriculum', 'El currículum', 'meridiana', 'Una reclutadora quiere tu CV. Tú no estás seguro de querer dárselo.', { xp: 260, gold: 400 }),
  Q('q_musico', 'El músico', 'meridiana', 'Dejó una nómina por una guitarra. Quiere saber si se arrepiente.', { xp: 240, gold: 0, it: ['guitarra', 1] }),
  Q('q_padre', 'El padre', 'meridiana', 'No puede irse. Mantiene a dos personas. No quiere tu lástima.', { xp: 280, gold: 300 }),
  Q('q_sonia', 'Los sábados de Sonia', 'meridiana', 'Sonia trabaja seis días. El séptimo no sabe qué hacer.', { xp: 220, gold: 260 }),
  Q('q_iker', 'El que volvió', 'meridiana', 'Iker lo dejó todo, y a los ocho meses volvió. Quiere explicarte por qué.', { xp: 300, gold: 350 }),
  Q('q_ana', 'La consulta de Ana', 'meridiana', 'Ana necesita cinco piezas de chatarra para arreglar su camilla.', { xp: 180, gold: 200, it: ['siesta', 2] }),
  Q('q_ciclista', 'Kilómetros', 'ruta_norte', 'Un ciclista mide su vida en distancias, no en horas.', { xp: 320, gold: 380 }),
  Q('q_pastor', 'El que nunca tuvo jefe', 'ruta_norte', 'Lleva cuarenta años sin jefe. No lo recomienda a ciegas.', { xp: 340, gold: 300 }),
  Q('q_excursion', 'La cima pequeña', 'ruta_norte', 'Alguien quiere subir un cerro modesto antes de ir a por uno grande.', { xp: 300, gold: 420 }),
  Q('q_revisor', 'El revisor', 'metro', 'Lleva 22 años viendo pasar a la misma gente a la misma hora.', { xp: 400, gold: 450 }),
  Q('q_libro', 'Cuatro páginas al día', 'metro', 'Una chica lee en el metro. Es el único rato que es suyo.', { xp: 380, gold: 400 }),
  Q('q_dormido', 'El hombre dormido', 'metro', 'Duerme desde Nuevos Ministerios. Alguien debería despertarlo.', { xp: 360, gold: 380, it: ['tila', 3] }),
  Q('q_ermitano', 'El ermitaño del domingo', 'bosque', 'Vive en el bosque desde hace seis años. Dice que no huyó.', { xp: 520, gold: 500 }),
  Q('q_pareja', 'Dos que se fueron juntos', 'bosque', 'Lo dejaron todo a la vez. Ahora discuten a la vez.', { xp: 480, gold: 520 }),
  Q('q_nina', 'La niña perdida', 'bosque', 'Se ha alejado buscando una piña concreta. Llévala de vuelta.', { xp: 440, gold: 600 }),
  Q('q_analista', 'Doce horas', 'financiera', 'Un analista calcula cuánto vale su hora. El número le asusta.', { xp: 640, gold: 700 }),
  Q('q_limpiadora', 'Antes de las siete', 'financiera', 'Limpia la torre cuando no hay nadie. Es su parte favorita.', { xp: 600, gold: 650 }),
  Q('q_emprendedor', 'El emprendedor', 'financiera', 'Se fue para no tener jefe. Ahora tiene catorce.', { xp: 700, gold: 800 }),
  Q('q_consultor', 'El consultor perdido', 'desierto', 'Lleva días optimizando un desierto.', { xp: 820, gold: 900 }),
  Q('q_estatua', 'La estatua', 'desierto', 'Erigida a la mayor productividad de la historia. Nadie recuerda a quién.', { xp: 780, gold: 1000 }),
  Q('q_archivera', 'Todo lo que fuiste', 'archivo', 'La Archivera guarda todas las versiones de ti que no llegaron a existir.', { xp: 900, gold: 1000, it: ['brujula', 1] }),
  Q('q_guarda', 'La cara norte', 'montana', 'El guarda del refugio ha visto subir a mucha gente huyendo de algo.', { xp: 1100, gold: 1200 }),
  Q('q_escaladora', 'Sin cima', 'montana', 'Escala rutas que no llevan a ninguna parte. A propósito.', { xp: 1050, gold: 1100 }),
  Q('q_chatarra', 'Reciclaje', 'barrio', 'Junta 5 piezas de chatarra por la ruta y el metro.', { xp: 260, gold: 400 })
].forEach(q => QUESTS[q.id] = q);

/* ---------- 15. DIÁLOGOS ---------- */
/* Nodo: string | {w,t} | {do:{...}} | {c:[{l, then:[], req:{}}]} | {if:'flag', then:[], else:[]} */
const DLG = {
  /* ===== OFICINA ===== */
  marta_of: [
    { w: 'Marta', t: 'Vaya. Has venido a recoger la mesa un martes por la mañana. Muy tú.' },
    { w: 'Marta', t: 'Aún estás a tiempo de decir que era una broma. Recursos Humanos tarda dos semanas en procesar nada.' },
    {
      c: [
        { l: '"No es una broma."', then: [{ w: 'Marta', t: 'Ya. Lo sabía antes de preguntarlo.' }, { w: 'Marta', t: 'Prométeme una cosa: no desaparezcas. La gente que se va desaparece, y luego un día te enteras de que vive en Portugal.' }, { do: { ax: { libertad: 2, vinculos: 1 }, q: 'q_marta' } }] },
        { l: '"No lo sé todavía."', then: [{ w: 'Marta', t: 'Eso es más honesto. Y más incómodo.' }, { w: 'Marta', t: 'Vete igual. Pero no te mientas diciendo que estás seguro.' }, { do: { ax: { seguridad: 1, proposito: 1 }, q: 'q_marta' } }] },
        { l: '"¿Y tú por qué sigues?"', then: [{ w: 'Marta', t: 'Porque el equipo que yo he montado es bueno y no quiero que lo herede un imbécil.' }, { w: 'Marta', t: 'Eso no es conformismo. Es otra cosa. A veces me cuesta explicarlo incluso a mí.' }, { do: { ax: { vinculos: 2 }, q: 'q_marta' } }] }
      ]
    },
    { w: 'Marta', t: 'Anda, te acompaño hasta la puerta. Quiero ver la cara del torniquete.' },
    { do: { join: 'marta' } },
    'Marta se une al equipo.'
  ],
  jorge_of: [
    { w: 'Jorge', t: 'Me han dicho que te vas. ¿Es verdad?' },
    { w: 'Jorge', t: 'No te voy a dar la charla. Cada uno sabe lo que puede permitirse.' },
    { w: 'Jorge', t: 'Yo tengo dos críos y una hipoteca a 2041. Mi libertad tiene un número, y el número es grande.' },
    {
      c: [
        { l: '"No te estoy juzgando."', then: [{ w: 'Jorge', t: 'Ya lo sé. Pero lo dices tú, no los demás.' }, { do: { ax: { vinculos: 2 } } }] },
        { l: '"Podrías buscar otra cosa."', then: [{ w: 'Jorge', t: 'Podría. Y podría salir mal. Y entonces el que se queda sin cenar no soy yo.' }, { do: { ax: { seguridad: 1 } } }] }
      ]
    },
    { w: 'Jorge', t: 'Oye. Si un día te lías en algo raro y necesitas a alguien que aguante el primer golpe, llámame. Los fines de semana soy libre.' }
  ],
  recepcion: [
    { w: 'Recepción', t: 'Buenos días. ¿Visita o empleado?' },
    { w: 'Alex', t: '...Todavía no lo sé.' },
    { w: 'Recepción', t: 'Le pongo "visita". Es más rápido de tramitar.' }
  ],
  comp1: [
    { w: 'Compañero', t: 'Tío, ¿de verdad te vas? ¿Sin otro sitio al que ir?' },
    { w: 'Compañero', t: 'Yo llevo cuatro años diciendo que me voy. Lo digo cada enero. Es casi una tradición familiar.' },
    { w: 'Compañero', t: 'Si te va bien, cuéntamelo. Si te va mal... cuéntamelo también, que me tranquiliza.' }
  ],
  comp2: [
    { w: 'Compañera', t: 'A mí lo del teletrabajo me daba igual, en serio.' },
    { w: 'Compañera', t: 'Vivo sola, mi casa es pequeña y la oficina tiene café gratis y gente. Yo estaba deseando volver.' },
    { w: 'Compañera', t: 'No todos estábamos sufriendo, ¿sabes? Eso también es verdad.' },
    { do: { ax: { seguridad: 1 } } }
  ],
  maquina_cafe: [
    'La máquina zumba. En la pantalla parpadea: SALDO 0,00 €.',
    { w: 'Alex', t: 'Me debes un euro desde 2019.' },
    'La máquina no responde. Pero algo dentro hace clic.',
    { do: { q: 'q_cafe', it: ['cafe', 3], qdone: 'q_cafe' } },
    'Caen tres cafés. Los últimos que te dará esta empresa.'
  ],
  boss_fichaje: [
    'El torniquete de salida se ilumina. La pantalla marca tu nombre.',
    '"FICHAJE DE SALIDA — 09:47. ¿CONFIRMAR ABANDONO DE JORNADA?"',
    { w: 'Marta', t: 'Alex... la puerta no se abre.' },
    { w: 'Alex', t: 'Ya lo veo.' },
    'EL ÚLTIMO FICHAJE bloquea la salida.'
  ],
  /* ===== BARRIO ===== */
  lucia_barrio: [
    { w: 'Lucía', t: '¡Anda! A estas horas por la calle. ¿Te han despedido?' },
    { w: 'Alex', t: 'Me he despedido yo.' },
    { w: 'Lucía', t: 'Uf. Valiente. O inconsciente. Suelen ser la misma cosa vista desde distinta distancia.' },
    { w: 'Lucía', t: 'Yo hago turnos de doce horas y no pienso dejarlo, por si te lo preguntas.' },
    {
      c: [
        { l: '"¿Cómo lo aguantas?"', then: [{ w: 'Lucía', t: 'No lo aguanto. Lo elijo. Es distinto.' }, { w: 'Lucía', t: 'Hay días horribles. Y hay días en los que alguien respira gracias a mí. Con eso me basta.' }, { do: { ax: { proposito: 2 } } }] },
        { l: '"¿No te cansas?"', then: [{ w: 'Lucía', t: 'Muchísimo. Pero cansarse haciendo algo que importa no es lo mismo que cansarse rellenando un Excel.' }, { do: { ax: { proposito: 1, libertad: 1 } } }] }
      ]
    },
    { w: 'Lucía', t: 'Mira, tienes cara de no haber comido. Voy contigo un rato. Alguien tiene que vigilarte.' },
    { do: { join: 'lucia' } },
    'Lucía se une al equipo.'
  ],
  dani_barrio: [
    { w: 'Dani', t: '¡No me lo creo! ¡El último hombre en pie ha caído!' },
    { w: 'Dani', t: 'Bienvenido al club. Somos pocos y no tenemos sede.' },
    { w: 'Dani', t: 'Llevo tres años fuera. Es lo mejor que he hecho.' },
    {
      c: [
        { l: '"¿De verdad?"', then: [{ w: 'Dani', t: '...' }, { w: 'Dani', t: 'Los martes sí. Los domingos a las siete de la tarde, no tanto.' }, { w: 'Dani', t: 'Pero eso no lo digo en voz alta normalmente. Te lo digo a ti porque acabas de saltar.' }, { do: { ax: { libertad: 1, vinculos: 2 } } }] },
        { l: '"Me alegro por ti."', then: [{ w: 'Dani', t: 'Gracias, tío. En serio.' }, { do: { ax: { vinculos: 1 } } }] }
      ]
    },
    { w: 'Dani', t: 'Venga, te acompaño. Conozco atajos que no salen en ningún mapa.' },
    { do: { join: 'dani' } },
    'Dani se une al equipo.'
  ],
  rosa: [
    { w: 'Rosa', t: 'Treinta y un años abriendo a las seis menos cuarto.' },
    { w: 'Rosa', t: 'Y no te voy a decir que me arrepiento, porque sería mentira, y tampoco que ha sido bonito, porque también.' },
    { w: 'Rosa', t: 'Vender periódicos no era mi sueño. Era mi manera de no depender de nadie. Eso sí era mi sueño.' },
    { do: { q: 'q_rosa' } },
    {
      c: [
        { l: '"¿Y ahora qué haría distinto?"', then: [{ w: 'Rosa', t: 'Cerrar los domingos veinte años antes.' }, { do: { ax: { libertad: 2 }, qdone: 'q_rosa' } }] },
        { l: '"¿Volvería a hacerlo?"', then: [{ w: 'Rosa', t: 'Sí. Pero más despacio.' }, { do: { ax: { proposito: 2 }, qdone: 'q_rosa' } }] }
      ]
    }
  ],
  tomas: [
    { w: 'Tomás', t: 'Cuarenta y un años en la misma empresa. Me jubilé en marzo.' },
    { w: 'Tomás', t: 'Y llevo desde marzo levantándome a las seis y media sin ningún sitio al que ir.' },
    { w: 'Tomás', t: 'Nadie me avisó de eso. Te preparan para trabajar. No te preparan para después.' },
    { do: { q: 'q_tomas' } },
    {
      c: [
        { l: '"Podría empezar algo nuevo."', then: [{ w: 'Tomás', t: '¿A los 67? ...Bueno. Siempre quise aprender a hacer muebles.' }, { w: 'Tomás', t: 'Toma, llévate esto. Era de la fábrica vieja. A mí ya no me dice nada.' }, { do: { ax: { proposito: 2 }, it: ['foto', 1], qdone: 'q_tomas' } }] },
        { l: '"A mí me da miedo acabar así."', then: [{ w: 'Tomás', t: 'Pues no acabes así. Tienes treinta años de ventaja sobre mí.' }, { w: 'Tomás', t: 'Toma esto. Y no lo guardes en un cajón.' }, { do: { ax: { libertad: 2 }, it: ['foto', 1], qdone: 'q_tomas' } }] }
      ]
    }
  ],
  nerea: [
    { w: 'Nerea', t: 'Me fui hace dos años. Todo el mundo me dijo que era un error.' },
    { w: 'Nerea', t: 'Y durante catorce meses lo fue. De verdad. Gasté los ahorros, discutí con mi pareja y volví a casa de mi madre.' },
    { w: 'Nerea', t: 'Ahora estoy bien. Pero no me gusta cuando la gente cuenta mi historia saltándose los catorce meses.' },
    { do: { q: 'q_nerea', ax: { libertad: 1, seguridad: 1 } } },
    {
      c: [
        { l: '"Cuéntame los catorce meses."', then: [{ w: 'Nerea', t: 'Gracias por preguntar eso. Nadie pregunta eso.' }, { w: 'Nerea', t: 'Lo peor no fue el dinero. Fue no tener una respuesta cuando alguien preguntaba "¿y tú a qué te dedicas?".' }, { do: { ax: { vinculos: 2, proposito: 1 }, qdone: 'q_nerea' } }] },
        { l: '"¿Volverías a irte?"', then: [{ w: 'Nerea', t: 'Sí. Pero con seis meses más de colchón y la mitad de soberbia.' }, { do: { ax: { seguridad: 2 }, qdone: 'q_nerea' } }] }
      ]
    }
  ],
  portal: [
    { w: 'Chico', t: 'Perdona... ¿tú trabajabas en SICE, no? Mi madre te conoce.' },
    { w: 'Chico', t: 'Tengo entrevista el jueves. Primer trabajo. ¿Algún consejo?' },
    { do: { q: 'q_portal' } },
    {
      c: [
        { l: '"Aprende todo lo que puedas y vete cuando deje de enseñarte."', then: [{ w: 'Chico', t: 'Eso... tiene sentido, sí.' }, { do: { ax: { libertad: 2 }, qdone: 'q_portal' } }] },
        { l: '"Que no te convenzan de que la empresa es tu familia."', then: [{ w: 'Chico', t: 'Jo. Qué oscuro. Pero vale.' }, { do: { ax: { libertad: 1, seguridad: 1 }, qdone: 'q_portal' } }] },
        { l: '"Disfrútalo. En serio."', then: [{ w: 'Chico', t: 'Eso no me lo esperaba de alguien que acaba de dimitir.' }, { do: { ax: { proposito: 2, vinculos: 1 }, qdone: 'q_portal' } }] }
      ]
    }
  ],
  camarero: [
    { w: 'Camarero', t: '¿Lo de siempre? Ah, no, que lo de siempre era a las siete de la tarde con la mochila puesta.' },
    { w: 'Camarero', t: 'Ahora puedes tomártelo a las once de la mañana. Qué escándalo.' }
  ],
  /* ===== MERIDIANA ===== */
  tienda_gen: [{ w: 'Tendera', t: 'Pasa, pasa. Tenemos de todo menos tiempo.' }],
  tienda_arm: [{ w: 'Herrera', t: 'Cada herramienta es una manera distinta de decir que no. Elige bien.' }],
  sonia: [
    { w: 'Sonia', t: 'Seis días a la semana en la peluquería. El séptimo me siento en el sofá y no sé qué hacer.' },
    { w: 'Sonia', t: 'He desaprendido a tener tiempo libre. ¿Eso se puede recuperar?' },
    { do: { q: 'q_sonia' } },
    {
      c: [
        { l: '"Se recupera. Despacio."', then: [{ w: 'Sonia', t: 'Voy a empezar por no poner la tele el domingo. A ver qué pasa.' }, { do: { ax: { libertad: 2 }, qdone: 'q_sonia' } }] },
        { l: '"A lo mejor no necesitas recuperarlo."', then: [{ w: 'Sonia', t: 'Eso me alivia más de lo que debería.' }, { do: { ax: { seguridad: 2 }, qdone: 'q_sonia' } }] }
      ]
    }
  ],
  iker: [
    { w: 'Iker', t: 'Yo lo dejé todo. Como tú. Viajé, hice cerámica, escribí medio libro.' },
    { w: 'Iker', t: 'A los ocho meses volví a una oficina. Y la gente me miró como si hubiera fracasado.' },
    { w: 'Iker', t: 'No fracasé. Descubrí que me gustaba tener un problema que resolver cada mañana. Eso también es una respuesta.' },
    { do: { q: 'q_iker', ax: { seguridad: 1, proposito: 1 } } },
    {
      c: [
        { l: '"¿No echas de menos la libertad?"', then: [{ w: 'Iker', t: 'Echo de menos las mañanas. No echo de menos la incertidumbre.' }, { w: 'Iker', t: 'Resulta que yo no quería no trabajar. Quería trabajar en otras condiciones.' }, { do: { ax: { proposito: 2 }, qdone: 'q_iker' } }] },
        { l: '"Entonces perdiste ocho meses."', then: [{ w: 'Iker', t: 'No. Compré una respuesta que no se puede conseguir de otra forma.' }, { do: { ax: { libertad: 1 }, qdone: 'q_iker' } }] }
      ]
    }
  ],
  musico: [
    { w: 'Músico', t: 'Antes llevaba nóminas. Ahora llevo una funda.' },
    { w: 'Músico', t: 'Gano una quinta parte. Duermo el doble. No sé si eso es ganar.' },
    { do: { q: 'q_musico' } },
    {
      c: [
        { l: '"¿Te arrepientes?"', then: [{ w: 'Músico', t: 'Los días 28 de cada mes, mucho. Los días que alguien se para a escuchar, nada.' }, { w: 'Músico', t: 'Toma. Tengo dos y solo puedo tocar una. Úsala para algo.' }, { do: { it: ['guitarra', 1], ax: { libertad: 2, proposito: 1 }, qdone: 'q_musico' } }] },
        { l: '"Suena bien."', then: [{ w: 'Músico', t: 'Gracias. Es lo único que necesitaba oír hoy.' }, { w: 'Músico', t: 'Llévate esta. En serio.' }, { do: { it: ['guitarra', 1], ax: { vinculos: 2 }, qdone: 'q_musico' } }] }
      ]
    }
  ],
  reclutadora: [
    { w: 'Reclutadora', t: 'Tu perfil encaja perfectamente con una posición que estoy gestionando.' },
    { w: 'Reclutadora', t: 'Mismo sector, mejor banda salarial. Cien por cien presencial, eso sí.' },
    { do: { q: 'q_curriculum' } },
    {
      c: [
        { l: 'Aceptar la entrevista.', then: [{ w: 'Reclutadora', t: 'Perfecto. Te envío los detalles.' }, 'Has aceptado explorar una vuelta. No te compromete a nada. Todavía.', { do: { flag: 'acepto_entrevista', ax: { seguridad: 3 }, gold: 400, qdone: 'q_curriculum' } }] },
        { l: 'Rechazarla.', then: [{ w: 'Reclutadora', t: 'Entiendo. Guardo tu perfil por si cambias de opinión.' }, { w: 'Alex', t: 'Guárdelo en un sitio difícil de encontrar.' }, { do: { flag: 'rechazo_entrevista', ax: { libertad: 3 }, qdone: 'q_curriculum' } }] },
        { l: '"¿Por qué hace usted este trabajo?"', then: [{ w: 'Reclutadora', t: '...Nadie me pregunta eso.' }, { w: 'Reclutadora', t: 'Porque colocar a alguien en un sitio donde está mejor me parece un trabajo decente. Aunque el guion que me obligan a leer sea horrible.' }, { do: { ax: { vinculos: 2, proposito: 1 }, qdone: 'q_curriculum' } }] }
      ]
    }
  ],
  padre: [
    { w: 'Padre', t: 'Tú eres el que lo ha dejado, ¿no? Se comenta.' },
    { w: 'Padre', t: 'Yo no puedo. Y no quiero que me digas que sí puedo, porque tú no pagas mi guardería.' },
    { do: { q: 'q_padre' } },
    {
      c: [
        { l: '"Tienes razón. No puedo saberlo."', then: [{ w: 'Padre', t: 'Gracias. De verdad.' }, { w: 'Padre', t: 'Mira, yo tampoco soy infeliz. Es que mi libertad ahora mismo se llama Leo y tiene cuatro años.' }, { do: { ax: { vinculos: 3 }, qdone: 'q_padre' } }] },
        { l: '"Quizá haya opciones intermedias."', then: [{ w: 'Padre', t: 'Las hay. Y las miro todas los domingos por la noche.' }, { w: 'Padre', t: 'El problema no es que no existan. Es que todas cuestan seis meses de riesgo que no tengo.' }, { do: { ax: { seguridad: 2, proposito: 1 }, qdone: 'q_padre' } }] }
      ]
    }
  ],
  ana: [
    { w: 'Ana', t: 'Si necesitas descansar, aquí se descansa. Cobro, pero poco.' },
    { w: 'Ana', t: 'Por cierto: se me ha roto la camilla. Si encuentras cinco piezas de chatarra por ahí, te lo compenso.' },
    { do: { q: 'q_ana' } }
  ],
  boss_reunion: [
    'La sala de juntas de la torre está vacía. Y aun así la puerta está ocupada.',
    'Un aviso flota en el aire: "REUNIÓN DE SEGUIMIENTO — SIN HORA DE FIN".',
    { w: 'Marta', t: 'Reconozco ese formato. Tiene 14 asistentes y ningún orden del día.' },
    'LA REUNIÓN INFINITA comienza.'
  ],
  /* ===== RUTA ===== */
  ciclista: [
    { w: 'Ciclista', t: 'Hoy llevo 84 kilómetros. Ayer 60. Mañana no sé.' },
    { w: 'Ciclista', t: 'Antes medía mi semana en reuniones. Ahora la mido en desniveles. Sigo midiendo. Eso me preocupa un poco.' },
    { do: { q: 'q_ciclista' } },
    {
      c: [
        { l: '"Medir no es malo."', then: [{ w: 'Ciclista', t: 'No. Lo malo es medir lo que no elegiste.' }, { do: { ax: { proposito: 2 }, qdone: 'q_ciclista' } }] },
        { l: '"Prueba a salir sin cuentakilómetros."', then: [{ w: 'Ciclista', t: '...Eso me da un miedo absurdo. Voy a hacerlo.' }, { do: { ax: { libertad: 2 }, qdone: 'q_ciclista' } }] }
      ]
    }
  ],
  pastor: [
    { w: 'Pastor', t: 'Cuarenta años sin jefe. No te creas que es lo que la gente imagina.' },
    { w: 'Pastor', t: 'No tengo jefe, pero tengo 300 ovejas y ninguna entiende de vacaciones.' },
    { w: 'Pastor', t: 'La libertad sin estructura es solo otro tipo de cadena. Hay que construirse la estructura uno mismo. Eso cansa.' },
    { do: { q: 'q_pastor', ax: { proposito: 2 }, qdone: 'q_pastor' } }
  ],
  excursionista: [
    { w: 'Excursionista', t: 'Quiero subir el Pico Mediano antes de intentar la Montaña del Futuro.' },
    { w: 'Excursionista', t: 'La gente va directa a la grande y se estrella. Yo prefiero una cima pequeña que sí pueda hacer.' },
    { do: { q: 'q_excursion', ax: { seguridad: 1, proposito: 1 }, qdone: 'q_excursion' } },
    { w: 'Excursionista', t: 'Toma, llévate esto. A mí me sobra cuerda.' },
    { do: { it: ['cuerda', 1] } }
  ],
  ambulante: [{ w: 'Paco', t: 'Furgoneta, café y carretera. Facturo poco, pero facturo yo.' }],
  /* ===== METRO ===== */
  revisor: [
    { w: 'Revisor', t: 'Veintidós años. Conozco a la gente por el andén en el que se ponen.' },
    { w: 'Revisor', t: 'A ti te he visto. Vagón cuatro, puerta del fondo, auriculares. Cada mañana durante años.' },
    { w: 'Alex', t: '...No sabía que alguien me veía.' },
    { w: 'Revisor', t: 'Yo veo a todos. Es lo único interesante de este trabajo, y da para veintidós años.' },
    { do: { q: 'q_revisor', ax: { vinculos: 3 }, qdone: 'q_revisor' } }
  ],
  chica_libro: [
    { w: 'Chica', t: 'Cuatro páginas de ida, cuatro de vuelta. Ocho al día.' },
    { w: 'Chica', t: 'Son los únicos cuarenta minutos que no le pertenecen a nadie.' },
    { do: { q: 'q_libro' } },
    {
      c: [
        { l: '"Eso es poco."', then: [{ w: 'Chica', t: 'Es 22 libros al año. Poco no es.' }, { do: { ax: { proposito: 2 }, qdone: 'q_libro' } }] },
        { l: '"Eso es mucho."', then: [{ w: 'Chica', t: 'Gracias. Necesitaba que alguien lo dijera.' }, { do: { ax: { vinculos: 2 }, qdone: 'q_libro' } }] }
      ]
    }
  ],
  dormido: [
    'Duerme profundamente. Lleva la acreditación puesta y el móvil apagado en la mano.',
    { w: 'Marta', t: 'Ese soy yo dentro de tres años.' },
    {
      c: [
        { l: 'Despertarlo.', then: [{ w: 'Hombre', t: '¿Eh? ¿Qué parada...? Ay. Me he pasado cuatro.' }, { w: 'Hombre', t: 'Gracias. En serio. Llevo meses pasándome.' }, { do: { ax: { vinculos: 2 }, it: ['tila', 3], q: 'q_dormido', qdone: 'q_dormido' } }] },
        { l: 'Dejarlo dormir.', then: ['Sigues adelante. El vagón se aleja con él dentro.', { w: 'Lucía', t: 'A lo mejor era lo único que necesitaba hoy.' }, { do: { ax: { libertad: 1 }, q: 'q_dormido', qdone: 'q_dormido' } }] }
      ]
    }
  ],
  boss_calendario: [
    'El andén se llena de cuadrículas de luz. Cada una lleva una hora escrita.',
    '"09:00 SEGUIMIENTO / 09:30 SEGUIMIENTO / 10:00 SEGUIMIENTO / 10:00 SEGUIMIENTO"',
    { w: 'Dani', t: 'Tío, hay dos reuniones a la misma hora.' },
    { w: 'Marta', t: 'Siempre hay dos reuniones a la misma hora.' },
    'EL CALENDARIO desciende.'
  ],
  /* ===== BOSQUE ===== */
  ermitano: [
    { w: 'Ermitaño', t: 'Seis años aquí. La gente dice que huí. No huí: elegí.' },
    { w: 'Ermitaño', t: 'Pero te voy a contar lo que nadie cuenta: se pasa mucho tiempo solo. Y la soledad, después del tercer año, ya no es paz. Es solo soledad.' },
    { do: { q: 'q_ermitano' } },
    {
      c: [
        { l: '"¿Volvería?"', then: [{ w: 'Ermitaño', t: 'A la ciudad, quizá. A la oficina, jamás.' }, { w: 'Ermitaño', t: 'No son la misma cosa, y me costó cuatro años entenderlo.' }, { do: { ax: { libertad: 2, vinculos: 1 }, qdone: 'q_ermitano' } }] },
        { l: '"¿Qué echa de menos?"', then: [{ w: 'Ermitaño', t: 'Que alguien note si un día no aparezco.' }, { do: { ax: { vinculos: 3 }, qdone: 'q_ermitano' } }] }
      ]
    }
  ],
  pareja: [
    { w: 'Marcos', t: 'Lo dejamos los dos a la vez. Fue romántico durante seis semanas.' },
    { w: 'Irene', t: 'Y luego descubrimos que él quería viajar y yo quería montar algo. Resulta que "dejarlo" no era un plan compartido.' },
    { w: 'Marcos', t: 'Estamos bien. Discutimos, pero estamos bien.' },
    { do: { q: 'q_pareja', ax: { vinculos: 2 }, qdone: 'q_pareja' } },
    { w: 'Irene', t: 'Consejo gratis: "irse" no es un proyecto. Es solo una puerta.' }
  ],
  nina: [
    { w: 'Niña', t: 'Estoy buscando una piña que sea perfecta. Todas tienen algo mal.' },
    { w: 'Alex', t: '...Conozco la sensación.' },
    { w: 'Niña', t: '¿Me acompañas a volver? Luego sigo buscando otro día.' },
    { do: { q: 'q_nina', ax: { vinculos: 2, proposito: 1 }, qdone: 'q_nina', gold: 600 } },
    'La acompañas hasta el camino. Sus padres te lo agradecen mucho.'
  ],
  boss_sueldo: [
    'Entre los árboles hay una figura hecha de nóminas viejas.',
    'Habla con la voz del día 30.',
    { w: 'Alex', t: 'Ya no me ingresas nada.' },
    '"NO. PERO SIGO CONTANDO."',
    'EL SUELDO FANTASMA se alza.'
  ],
  /* ===== FINANCIERA ===== */
  analista: [
    { w: 'Analista', t: 'He calculado cuánto vale mi hora. Bruto, neto y descontando el trayecto.' },
    { w: 'Analista', t: 'Sale menos que la chica que me trae el café. Y yo pensaba que era al revés.' },
    { do: { q: 'q_analista' } },
    {
      c: [
        { l: '"El número no es toda la historia."', then: [{ w: 'Analista', t: 'Lo sé. Pero es el único trozo de la historia que sé leer.' }, { do: { ax: { proposito: 2 }, qdone: 'q_analista' } }] },
        { l: '"Entonces vete."', then: [{ w: 'Analista', t: 'Tengo un bonus en abril. Siempre hay un bonus en abril.' }, { do: { ax: { libertad: 1, seguridad: 1 }, qdone: 'q_analista' } }] }
      ]
    }
  ],
  limpiadora: [
    { w: 'Rita', t: 'Entro a las cinco. Para las siete la torre entera es mía.' },
    { w: 'Rita', t: 'Ochocientas personas trabajan aquí y ninguna ha visto este edificio en silencio. Yo sí.' },
    { w: 'Rita', t: 'Mi trabajo no le gusta a nadie. A mí esas dos horas me parecen lo mejor del día.' },
    { do: { q: 'q_limpiadora', ax: { proposito: 2, vinculos: 1 }, qdone: 'q_limpiadora' } }
  ],
  emprendedor: [
    { w: 'Emprendedor', t: 'Me fui para no tener jefe. Tengo catorce. Se llaman clientes.' },
    { w: 'Emprendedor', t: 'Trabajo más que nunca. Gano menos que nunca. Y aun así no volvería.' },
    { do: { q: 'q_emprendedor' } },
    {
      c: [
        { l: '"¿Por qué no volverías?"', then: [{ w: 'Emprendedor', t: 'Porque cuando hoy trabajo hasta las once, es culpa mía. Antes era culpa de otro.' }, { w: 'Emprendedor', t: 'Y resulta que la culpa propia pesa menos. Nadie me avisó de eso.' }, { do: { ax: { libertad: 2, proposito: 1 }, qdone: 'q_emprendedor' } }] },
        { l: '"Suena a trampa."', then: [{ w: 'Emprendedor', t: 'Lo es, un poco. Pero es mi trampa.' }, { do: { ax: { seguridad: 1, libertad: 1 }, qdone: 'q_emprendedor' } }] }
      ]
    }
  ],
  trajes: [{ w: 'Lombard', t: 'Un buen traje no te hace creer en la empresa. Te hace soportarla.' }],
  boss_algoritmo: [
    'La torre entera parpadea. Las pantallas muestran tu propio patrón de actividad de los últimos diez años.',
    '"SUJETO ALEX. PRODUCTIVIDAD ÓPTIMA: MARTES 10:40. RECOMENDACIÓN: REPETIR MARTES INDEFINIDAMENTE."',
    { w: 'Lucía', t: 'Está intentando convertirte en una media.' },
    'EL ALGORITMO se despliega.'
  ],
  /* ===== DESIERTO ===== */
  consultor: [
    { w: 'Consultor', t: 'Estoy optimizando este desierto. Hay un 12% de ineficiencia en la distribución de la arena.' },
    { w: 'Alex', t: '¿Para quién?' },
    { w: 'Consultor', t: '...' },
    { w: 'Consultor', t: 'Buena pregunta. Llevo cuatro días sin hacérmela.' },
    { do: { q: 'q_consultor', ax: { proposito: 2 }, qdone: 'q_consultor', gold: 900 } }
  ],
  estatua: [
    'Una estatua de bronce. La placa dice: "AL TRABAJADOR MÁS PRODUCTIVO DE SU GENERACIÓN".',
    'No hay nombre. La parte donde estaba el nombre está lisa, borrada por el viento.',
    { w: 'Marta', t: 'Qué broma más cruel.' },
    { do: { q: 'q_estatua', ax: { libertad: 2 }, qdone: 'q_estatua', gold: 1000 } }
  ],
  boss_kpi: [
    'El horizonte se llena de barras. Suben. Nunca bajan.',
    '"ALEX — OBJETIVOS CUMPLIDOS ESTE TRIMESTRE: 0. VALOR ESTIMADO DE TU EXISTENCIA: PENDIENTE DE REVISIÓN."',
    { w: 'Jorge', t: 'Hay que darle fuerte. Esta cosa solo entiende números.' },
    'EL KPI se materializa.'
  ],
  /* ===== ARCHIVO ===== */
  archivera: [
    { w: 'Archivera', t: 'Bienvenido. Aquí guardamos todas las versiones tuyas que no llegaron a ocurrir.' },
    { w: 'Archivera', t: 'El Alex que aceptó el traslado. El que montó el estudio. El que nunca entró en SICE.' },
    { w: 'Archivera', t: 'Puedes mirarlos, pero te advierto: mirar mucho tiempo estropea al original.' },
    { do: { q: 'q_archivera' } },
    {
      c: [
        { l: 'Mirar los expedientes.', then: ['Ves una vida en la que nunca dimitiste. Eres razonablemente feliz. También razonablemente pequeño.', { w: 'Archivera', t: 'Ninguna es mejor. Solo son distintas. Eso es lo que la gente no soporta.' }, { do: { ax: { proposito: 2, seguridad: 1 }, it: ['brujula', 1], qdone: 'q_archivera' } }] },
        { l: 'No mirarlos.', then: [{ w: 'Archivera', t: 'Muy poca gente elige eso. Toma, te lo has ganado.' }, { do: { ax: { libertad: 3 }, it: ['brujula', 1], qdone: 'q_archivera' } }] }
      ]
    }
  ],
  boss_mercado: [
    'El fondo del Archivo se abre a una sala llena de ofertas de empleo flotando.',
    'Todas piden cinco años de experiencia en tecnologías de tres años de antigüedad.',
    { w: 'Dani', t: 'Yo a esto ya me he enfrentado. No se puede ganar.' },
    { w: 'Marta', t: 'Se puede sobrevivir. No es lo mismo, pero sirve.' },
    'EL MERCADO LABORAL se agita.'
  ],
  /* ===== MONTAÑA ===== */
  guarda: [
    { w: 'Guarda', t: 'Sube mucha gente huyendo de algo. Se nota en la mochila: llevan demasiado.' },
    { w: 'Guarda', t: 'Los que suben hacia algo llevan poco y van más despacio.' },
    { do: { q: 'q_guarda' } },
    {
      c: [
        { l: '"¿Yo de cuáles soy?"', then: [{ w: 'Guarda', t: 'Todavía no lo sé. Llevas la mochila a medias.' }, { do: { ax: { proposito: 2 }, qdone: 'q_guarda' } }] },
        { l: '"Huir también vale."', then: [{ w: 'Guarda', t: 'Vale para llegar arriba. No vale para quedarse.' }, { do: { ax: { libertad: 2 }, qdone: 'q_guarda' } }] }
      ]
    }
  ],
  escaladora: [
    { w: 'Escaladora', t: 'Esta ruta no llega a ninguna cima. Muere en mitad de la pared.' },
    { w: 'Escaladora', t: 'Por eso me gusta. No hay nada que conseguir. Solo el rato de estar haciéndolo.' },
    { do: { q: 'q_escaladora', ax: { libertad: 2, proposito: 1 }, qdone: 'q_escaladora' } }
  ],
  boss_jefe: [
    'En el collado, de espaldas, hay una figura con abrigo largo. Se gira.',
    { w: '???', t: 'Alex. Me alegro de verte. De verdad.' },
    { w: '???', t: 'Yo también quise irme. En 2011. Me ofrecieron dirigir el área y dije que sí.' },
    { w: '???', t: 'No soy tu enemigo. Soy lo que pasa cuando dices que sí muchas veces seguidas.' },
    'EL JEFE bloquea el paso.'
  ],
  /* ===== ESPEJO ===== */
  otro_alex: [
    { w: '¿Alex?', t: 'Hola.' },
    { w: '¿Alex?', t: 'Yo no dimití. Sigo allí. El martes pasado me ascendieron.' },
    { w: '¿Alex?', t: 'No he venido a convencerte. He venido a que me mires bien.' },
    {
      c: [
        { l: '"¿Eres feliz?"', then: [{ w: '¿Alex?', t: 'A ratos. Como tú. Exactamente en la misma proporción.' }, { do: { ax: { proposito: 2 } } }] },
        { l: '"Podría haber sido tú."', then: [{ w: '¿Alex?', t: 'Sigues pudiendo. Esa es la parte incómoda.' }, { do: { ax: { seguridad: 2 } } }] },
        { l: 'No decir nada.', then: [{ w: '¿Alex?', t: 'Vale. Eso también es una respuesta.' }, { do: { ax: { libertad: 2 } } }] }
      ]
    }
  ],
  boss_comparacion: [
    'La sala se llena de superficies pulidas. En cada una hay alguien que te lleva ventaja.',
    'Alguien con casa. Alguien con hijos. Alguien con una empresa. Alguien tranquilo.',
    { w: 'Lucía', t: 'No mires. En serio, Alex, no mires.' },
    'LA COMPARACIÓN se despliega.'
  ],
  boss_espejo: [
    'Al final del pasillo hay una sola superficie. No refleja la sala.',
    'Te refleja a ti a los 25. Y a los 40. Y a los 70.',
    { w: 'Marta', t: 'Esto no lo podemos pelear por ti.' },
    { w: 'Jorge', t: 'Pero podemos aguantar de pie mientras lo haces.' },
    'EL ESPEJO despierta.'
  ]
};

/* Textos de capítulo al avanzar */
const CH_INTRO = {
  2: ['Sales a la calle a las diez de la mañana de un martes.', 'Nunca habías visto tu barrio a esta hora. Hay gente. Muchísima gente. ¿Qué hace toda esta gente aquí?'],
  3: ['Primer día sin calendario.', 'Te despiertas a las 6:40 sin despertador. Tu cuerpo aún no se ha enterado.'],
  4: ['El dinero de la indemnización tiene fecha de caducidad.', 'Todavía no es urgente. Pero ya tiene forma.'],
  5: ['Han pasado tres semanas. La gente ha dejado de preguntar qué tal.', 'Eso es un alivio y una pérdida al mismo tiempo.'],
  6: ['Alguien te pregunta a qué te dedicas y por primera vez no tienes una frase preparada.'],
  7: ['Vuelves al barrio. Los que se quedaron siguen ahí, y siguen siendo personas completas.'],
  8: ['La Ciudad Financiera nunca apaga las luces. Ni siquiera para ahorrar.'],
  9: ['Todo aquí se mide. Hasta la arena.'],
  10: ['Toca decidir si quieres volver a existir para el mercado.'],
  11: ['La montaña se ve desde el desierto. Siempre se vio. Nunca miraste hacia allí.'],
  12: ['Arriba hace frío y hay menos excusas.'],
  13: ['La cumbre no era la cumbre.'],
  14: ['Última pregunta.']
};

/* ---------- 16. ESTADO GLOBAL ---------- */
const TS = 24;
const G = {
  scene: 'title', slot: 1, zone: 'oficina', chapter: 1,
  px: 21 * TS, py: 28 * TS, dir: 'up', anim: 0, moving: false,
  party: ['alex'], units: {}, gold: 500, inv: {}, equip: {},
  flags: {}, quests: {}, axes: { libertad: 0, seguridad: 0, vinculos: 0, proposito: 0 },
  chestsOpened: {}, defeated: {}, steps: 0, encCount: 0, playtime: 0,
  battle: null, dialog: null, ui: null, log: [], settings: { vol: 0.35, sfx: true, speed: 1 }
};
const World = { grid: null, zone: null, w: 0, h: 0, npcs: [], chests: [], exits: [], bosses: [], particles: [] };

/* ---------- 17. UNIDADES ---------- */
function statFor(id, lvl) {
  const c = CHARS[id], s = {};
  for (const k in c.base) s[k] = Math.floor(c.base[k] + c.grow[k] * (lvl - 1));
  return s;
}
function xpForLevel(l) { return Math.floor(42 * Math.pow(l, 1.72)); }
function makeUnit(id, lvl) {
  const c = CHARS[id];
  const s = statFor(id, lvl);
  const skills = [];
  for (const L in c.learn) if (+L <= lvl) c.learn[L].forEach(k => skills.push(k));
  return { id, lvl, xp: 0, hp: s.hp, en: s.en, base: s, skills, sp: Math.max(0, lvl - 1), boost: { hp: 0, atk: 0, def: 0, mag: 0, res: 0, spd: 0 } };
}
function unitStats(u) {
  const s = Object.assign({}, u.base);
  const B = { hp: 14, atk: 2, def: 2, mag: 2, res: 2, spd: 1.5 };
  for (const k in u.boost) s[k] = Math.floor(s[k] + (B[k] || 0) * u.boost[k]);
  const eq = G.equip[u.id] || {};
  ['weapon', 'armor', 'acc'].forEach(sl => {
    const it = ITEMS[eq[sl]];
    if (!it) return;
    ['atk', 'def', 'mag', 'res', 'spd', 'hp', 'en'].forEach(k => { if (it[k]) s[k] = (s[k] || 0) + it[k]; });
  });
  for (const k in s) s[k] = Math.max(1, Math.floor(s[k]));
  return s;
}
function unitCrit(u) {
  let c = 0.05 + Math.min(0.15, unitStats(u).spd * 0.002);
  const it = ITEMS[(G.equip[u.id] || {}).acc];
  if (it && it.crit) c += it.crit;
  return c;
}
function ensureUnits() {
  G.party.forEach(id => { if (!G.units[id]) { G.units[id] = makeUnit(id, avgLevel()); autoEquip(id); } });
}
function avgLevel() {
  const ids = Object.keys(G.units);
  if (!ids.length) return 1;
  return Math.max(1, Math.round(ids.reduce((a, i) => a + G.units[i].lvl, 0) / ids.length));
}
function autoEquip(id) {
  G.equip[id] = G.equip[id] || {};
  const start = { alex: 'boli', marta: 'portatil', dani: 'mochila', lucia: 'termo', jorge: 'casco' }[id];
  if (start && !G.equip[id].weapon) { G.equip[id].weapon = start; }
}
function addItem(id, n) { G.inv[id] = (G.inv[id] || 0) + (n || 1); }
function removeItem(id, n) { G.inv[id] = (G.inv[id] || 0) - (n || 1); if (G.inv[id] <= 0) delete G.inv[id]; }
function hasItem(id) { return (G.inv[id] || 0) > 0; }
function countItem(id) { return G.inv[id] || 0; }

function grantXP(amount) {
  const gained = [];
  G.party.forEach(id => {
    const u = G.units[id]; if (!u) return;
    u.xp += amount;
    while (u.xp >= xpForLevel(u.lvl + 1) && u.lvl < 60) {
      u.xp -= xpForLevel(u.lvl + 1);
      u.lvl++; u.sp++;
      const c = CHARS[id];
      u.base = statFor(id, u.lvl);
      u.hp = unitStats(u).hp; u.en = unitStats(u).en;
      if (c.learn[u.lvl]) c.learn[u.lvl].forEach(k => { if (!u.skills.includes(k)) { u.skills.push(k); gained.push(CHARS[id].n + ' aprende ' + SKILLS[k].n); } });
      gained.push(CHARS[id].n + ' sube a nivel ' + u.lvl);
    }
  });
  if (gained.length) Audio_.sfx('levelup');
  return gained;
}

/* ---------- 18. GENERACIÓN DE MUNDO ---------- */
function hash2(x, y, s) { let h = x * 374761393 + y * 668265263 + s * 2246822519; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; }

function generateZone(zid) {
  const z = ZONES[zid], g = z.gen, rnd = mulberry(z.seed);
  const w = z.w, h = z.h;
  const grid = new Uint8Array(w * h);
  const at = (x, y) => y * w + x;
  // base
  for (let i = 0; i < w * h; i++) grid[i] = g.base;
  // bordes
  for (let x = 0; x < w; x++) { grid[at(x, 0)] = T.VOID; grid[at(x, 1)] = g.obs || T.WALL; grid[at(x, h - 1)] = T.VOID; grid[at(x, h - 2)] = g.obs || T.WALL; }
  for (let y = 0; y < h; y++) { grid[at(0, y)] = T.VOID; grid[at(1, y)] = g.obs || T.WALL; grid[at(w - 1, y)] = T.VOID; grid[at(w - 2, y)] = g.obs || T.WALL; }
  // obstáculos por ruido agrupado
  const amt = g.obsAmt || 0;
  for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
    const n = hash2(x, y, z.seed) * 0.45 + hash2(Math.floor(x / 4), Math.floor(y / 4), z.seed + 7) * 0.55;
    if (n < amt) grid[at(x, y)] = g.obs;
  }
  // rocas dispersas
  if (g.rocks) for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++)
    if (grid[at(x, y)] === g.base && hash2(x, y, z.seed + 31) < g.rocks) grid[at(x, y)] = T.ROCK;
  // agua + puentes
  if (g.water) {
    const wy = Math.floor(h * 0.55);
    for (let x = 2; x < w - 2; x++) {
      const off = Math.floor(Math.sin(x * 0.22 + z.seed) * 2.2);
      for (let d = 0; d < 3; d++) grid[at(x, clamp(wy + off + d, 2, h - 3))] = T.WATER;
    }
    [Math.floor(w * 0.25), Math.floor(w * 0.62), Math.floor(w * 0.85)].forEach(bx => {
      for (let y = 2; y < h - 2; y++) if (grid[at(bx, y)] === T.WATER || grid[at(bx + 1, y)] === T.WATER) { grid[at(bx, y)] = T.BRIDGE; grid[at(bx + 1, y)] = T.BRIDGE; }
    });
  }
  // edificios
  if (g.build) {
    for (let b = 0; b < g.build; b++) {
      const bw = 4 + Math.floor(rnd() * 5), bh = 3 + Math.floor(rnd() * 4);
      const bx = 3 + Math.floor(rnd() * (w - bw - 6)), by = 3 + Math.floor(rnd() * (h - bh - 6));
      let ok = true;
      for (let y = by - 1; y < by + bh + 2 && ok; y++) for (let x = bx - 1; x < bx + bw + 1; x++)
        if (grid[at(x, y)] === T.BUILD || grid[at(x, y)] === T.WATER) { ok = false; break; }
      if (!ok) continue;
      for (let y = by; y < by + bh; y++) for (let x = bx; x < bx + bw; x++) grid[at(x, y)] = T.BUILD;
      grid[at(bx + (bw >> 1), by + bh - 1)] = T.DOOR;
      grid[at(bx + (bw >> 1), by + bh)] = T.PATH;
    }
  }
  // mesas de oficina
  if (g.desk) for (let y = 4; y < h - 4; y++) for (let x = 4; x < w - 4; x++)
    if (grid[at(x, y)] === g.base && hash2(x, y, z.seed + 91) < g.desk) { grid[at(x, y)] = T.DESK; if (x + 1 < w - 3) grid[at(x + 1, y)] = T.DESK; }
  // raíles
  if (g.rail) { const ry = Math.floor(h * 0.7); for (let x = 2; x < w - 2; x++) { grid[at(x, ry)] = T.RAIL; grid[at(x, ry + 1)] = T.RAIL; } }

  // puntos de interés -> caminos
  const pois = [];
  (z.npcs || []).forEach(n => pois.push([n.x, n.y]));
  (z.chests || []).forEach(c => pois.push([c.x, c.y]));
  (z.exits || []).forEach(e => pois.push([e.x, e.y]));
  if (z.boss) pois.push([z.boss.x, z.boss.y]);
  if (z.boss2) pois.push([z.boss2.x, z.boss2.y]);
  pois.push([Math.floor(w / 2), Math.floor(h / 2)]);
  const carve = (x0, y0, x1, y1) => {
    let x = x0, y = y0;
    const step = () => {
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = clamp(x + dx, 1, w - 2), ny = clamp(y + dy, 1, h - 2);
        const t = grid[at(nx, ny)];
        if (t === T.VOID) continue;
        if (t === T.WATER) { grid[at(nx, ny)] = T.BRIDGE; continue; }
        if (SOLID[t] || t === T.DOOR) grid[at(nx, ny)] = T.PATH;
      }
    };
    let guard = 0;
    while ((x !== x1 || y !== y1) && guard++ < 600) { step(); if (x !== x1) x += Math.sign(x1 - x); else if (y !== y1) y += Math.sign(y1 - y); }
    step();
  };
  for (let i = 0; i < pois.length; i++) {
    const a = pois[i], b = pois[(i + 1) % pois.length];
    carve(a[0], a[1], b[0], b[1]);
    if (i % 3 === 0) carve(a[0], a[1], pois[pois.length - 1][0], pois[pois.length - 1][1]);
  }
  // hierba alta
  if (g.tall) for (let y = 2; y < h - 2; y++) for (let x = 2; x < w - 2; x++) {
    if (grid[at(x, y)] !== g.base) continue;
    const n = hash2(Math.floor(x / 3), Math.floor(y / 3), z.seed + 55) * 0.6 + hash2(x, y, z.seed + 3) * 0.4;
    if (n < g.tall) grid[at(x, y)] = T.TALL;
  }
  // limpiar celdas de POI
  pois.forEach(p => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = clamp(p[0] + dx, 1, w - 2), ny = clamp(p[1] + dy, 1, h - 2);
      if (grid[at(nx, ny)] === T.VOID) continue;
      if (SOLID[grid[at(nx, ny)]]) grid[at(nx, ny)] = T.PATH;
    }
  });
  return grid;
}

function loadZone(zid, tx, ty) {
  const z = ZONES[zid];
  World.zone = zid; World.w = z.w; World.h = z.h;
  World.grid = generateZone(zid);
  World.npcs = (z.npcs || []).map(n => Object.assign({}, n));
  World.chests = (z.chests || []).map((c, i) => Object.assign({ key: zid + '_c' + i }, c));
  World.exits = (z.exits || []).map(e => Object.assign({}, e));
  World.bosses = [];
  if (z.boss) World.bosses.push(Object.assign({}, z.boss));
  if (z.boss2) World.bosses.push(Object.assign({}, z.boss2));
  World.particles = [];
  G.zone = zid;
  if (tx !== undefined) { G.px = tx * TS + TS / 2; G.py = ty * TS + TS / 2; }
}
function tileAt(x, y) {
  if (x < 0 || y < 0 || x >= World.w || y >= World.h) return T.VOID;
  return World.grid[y * World.w + x];
}
function solidAt(px, py) {
  const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
  const t = tileAt(tx, ty);
  if (SOLID[t]) return true;
  return World.npcs.some(n => n.x === tx && n.y === ty) || World.bosses.some(b => b.x === tx && b.y === ty && !G.flags[b.flag]);
}

/* ---------- 19. RENDER DEL MUNDO ---------- */
let CV, CX, VW = 960, VH = 540;
function initCanvas() {
  CV = document.getElementById('game');
  CX = CV.getContext('2d', { alpha: false });
  CX.imageSmoothingEnabled = false;
  resize();
  window.addEventListener('resize', resize);
}
function resize() {
  const wrap = document.getElementById('stage');
  const w = wrap.clientWidth, h = wrap.clientHeight;
  const scale = Math.max(1, Math.min(2, Math.floor(Math.min(w / 480, h / 270) * 2) / 2));
  VW = Math.floor(w / scale); VH = Math.floor(h / scale);
  CV.width = VW; CV.height = VH;
  CV.style.width = w + 'px'; CV.style.height = h + 'px';
  CX.imageSmoothingEnabled = false;
}
function tileColor(theme, t, x, y) {
  const c = theme[t] || theme[0] || ['#333', '#444'];
  return hash2(x, y, 9) > 0.5 ? c[0] : c[1];
}
function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g2 = (n >> 8) & 255, b = n & 255;
  r = clamp(Math.round(r * amt), 0, 255); g2 = clamp(Math.round(g2 * amt), 0, 255); b = clamp(Math.round(b * amt), 0, 255);
  return '#' + ((r << 16) | (g2 << 8) | b).toString(16).padStart(6, '0');
}

let camX = 0, camY = 0, tGlobal = 0;
function drawWorld(dt) {
  const z = ZONES[World.zone], th = THEMES[z.theme];
  camX = lerp(camX, clamp(G.px - VW / 2, 0, Math.max(0, World.w * TS - VW)), 0.18);
  camY = lerp(camY, clamp(G.py - VH / 2, 0, Math.max(0, World.h * TS - VH)), 0.18);
  const ox = Math.floor(camX), oy = Math.floor(camY);
  CX.fillStyle = th.sky; CX.fillRect(0, 0, VW, VH);
  const x0 = Math.max(0, Math.floor(ox / TS) - 1), x1 = Math.min(World.w - 1, Math.floor((ox + VW) / TS) + 1);
  const y0 = Math.max(0, Math.floor(oy / TS) - 1), y1 = Math.min(World.h - 1, Math.floor((oy + VH) / TS) + 2);

  const drawList = [];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const t = tileAt(x, y);
      if (t === T.VOID) continue;
      const px = x * TS - ox, py = y * TS - oy;
      const el = ELEVATED[t] || 0;
      const base = tileColor(th, t, x, y);
      if (!el) {
        CX.fillStyle = base; CX.fillRect(px, py, TS, TS);
        if (t === T.WATER) {
          CX.fillStyle = 'rgba(255,255,255,0.10)';
          const ww = 2 + Math.sin((x + y) * 0.9 + tGlobal * 1.8) * 1.6;
          CX.fillRect(px + 3, py + 8 + ww, TS - 6, 2);
        }
        if (t === T.TALL) {
          CX.fillStyle = shade(base, 0.72);
          for (let i = 0; i < 4; i++) { const gx = px + 3 + i * 5, sw = Math.sin(tGlobal * 2 + x + y + i) * 1.2; CX.fillRect(gx + sw, py + 10, 2, 12); }
        }
        if (t === T.RAIL) { CX.fillStyle = '#2a2a30'; CX.fillRect(px, py + 8, TS, 3); CX.fillRect(px, py + 16, TS, 3); }
        if (t === T.DOOR) { CX.fillStyle = shade(base, 0.6); CX.fillRect(px + 4, py + 2, TS - 8, TS - 2); CX.fillStyle = '#e8c070'; CX.fillRect(px + TS - 9, py + 12, 2, 3); }
        if (t === T.PATH && hash2(x, y, 17) > 0.86) { CX.fillStyle = shade(base, 0.86); CX.fillRect(px + 6, py + 8, 5, 4); }
      } else {
        // sombra proyectada
        CX.fillStyle = 'rgba(0,0,0,0.30)';
        CX.fillRect(px + 3, py + TS - 2, TS, 5);
        drawList.push({ y: y * TS + TS, f: () => {
          const top = shade(base, 1.18), side = shade(base, 0.62), side2 = shade(base, 0.44);
          CX.fillStyle = side2; CX.fillRect(px, py + TS - el, TS, el + 2);
          CX.fillStyle = side; CX.fillRect(px, py + TS - el, TS, Math.max(2, el / 2));
          CX.fillStyle = top; CX.fillRect(px, py - el, TS, TS);
          CX.fillStyle = shade(base, 1.34); CX.fillRect(px, py - el, TS, 3);
          if (t === T.TREE) {
            CX.fillStyle = shade(base, 1.45);
            CX.beginPath(); CX.arc(px + TS / 2, py - el + 8, 9, 0, 7); CX.fill();
            CX.fillStyle = shade(base, 0.9);
            CX.beginPath(); CX.arc(px + TS / 2 + 3, py - el + 11, 7, 0, 7); CX.fill();
          }
          if (t === T.BUILD) {
            CX.fillStyle = hash2(x, y, 41) > 0.55 ? 'rgba(255,220,150,0.55)' : 'rgba(90,110,150,0.45)';
            CX.fillRect(px + 5, py - el + 6, 5, 6); CX.fillRect(px + 14, py - el + 6, 5, 6);
          }
          if (t === T.DESK) { CX.fillStyle = '#2b3a4a'; CX.fillRect(px + 5, py - el + 4, 14, 9); CX.fillStyle = '#6fa8d8'; CX.fillRect(px + 6, py - el + 5, 12, 7); }
          if (t === T.WALL) { CX.fillStyle = 'rgba(0,0,0,0.12)'; CX.fillRect(px, py - el + 10, TS, 1); }
        } });
      }
    }
  }
  // cofres / salidas / npcs / jefes / jugador
  World.exits.forEach(e => drawList.push({ y: e.y * TS + 10, f: () => drawExit(e, ox, oy) }));
  World.chests.forEach(c => { if (!G.chestsOpened[c.key]) drawList.push({ y: c.y * TS + 20, f: () => drawChest(c, ox, oy) }); });
  World.npcs.forEach(n => drawList.push({ y: n.y * TS + TS, f: () => drawNPC(n, ox, oy) }));
  World.bosses.forEach(b => { if (!G.flags[b.flag] && bossAvailable(b)) drawList.push({ y: b.y * TS + TS, f: () => drawBossMarker(b, ox, oy) }); });
  drawList.push({ y: G.py + 8, f: () => drawPlayer(ox, oy) });
  drawList.sort((a, b) => a.y - b.y).forEach(d => d.f());

  drawLightAndWeather(th, z, dt, ox, oy);
}
function drawShadow(cx, cy, r) {
  CX.fillStyle = 'rgba(0,0,0,0.32)';
  CX.beginPath(); CX.ellipse(cx, cy, r, r * 0.42, 0, 0, 7); CX.fill();
}
function drawPlayer(ox, oy) {
  const px = Math.floor(G.px - ox), py = Math.floor(G.py - oy);
  drawShadow(px, py + 9, 8);
  const frame = G.moving ? (Math.floor(G.anim) % 2) + 1 : 0;
  const spr = humanSprite(CHARS.alex.pal, G.dir, frame, 2);
  CX.drawImage(spr, px - 16, py - 24);
}
function drawNPC(n, ox, oy) {
  const px = n.x * TS + TS / 2 - ox, py = n.y * TS + TS / 2 - oy;
  drawShadow(px, py + 9, 8);
  const bob = Math.sin(tGlobal * 1.6 + n.x) > 0.7 ? 1 : 0;
  CX.drawImage(humanSprite(npcPal(n.p), 'down', bob, 2), px - 16, py - 24);
  if (n.shop) { CX.fillStyle = '#f0c04a'; CX.font = '10px monospace'; CX.fillText('$', px - 2, py - 28); }
}
function drawBossMarker(b, ox, oy) {
  const px = b.x * TS + TS / 2 - ox, py = b.y * TS + TS / 2 - oy;
  const d = enemyDef(b.id);
  drawShadow(px, py + 10, 14);
  const pulse = 1 + Math.sin(tGlobal * 3) * 0.06;
  CX.save(); CX.translate(px, py - 6); CX.scale(pulse, pulse);
  const spr = creatureSprite(d.grid, d.pal, 2);
  CX.globalAlpha = 0.92; CX.drawImage(spr, -spr.width / 2, -spr.height / 2); CX.restore();
  CX.fillStyle = 'rgba(230,60,60,' + (0.5 + Math.sin(tGlobal * 4) * 0.3) + ')';
  CX.font = 'bold 8px monospace'; CX.textAlign = 'center';
  CX.fillText('!', px, py - 30); CX.textAlign = 'left';
}
function drawChest(c, ox, oy) {
  const px = c.x * TS + TS / 2 - ox, py = c.y * TS + TS / 2 - oy;
  drawShadow(px, py + 8, 8);
  CX.fillStyle = '#6a4a26'; CX.fillRect(px - 9, py - 8, 18, 15);
  CX.fillStyle = '#8a6636'; CX.fillRect(px - 9, py - 8, 18, 6);
  CX.fillStyle = '#e0c070'; CX.fillRect(px - 2, py - 4, 4, 6);
  CX.fillStyle = 'rgba(255,230,150,' + (0.25 + Math.sin(tGlobal * 3 + c.x) * 0.18) + ')';
  CX.fillRect(px - 11, py - 10, 22, 19);
}
function drawExit(e, ox, oy) {
  const px = e.x * TS - ox, py = e.y * TS - oy;
  const open = exitOpen(e);
  CX.fillStyle = open ? 'rgba(120,220,180,' + (0.20 + Math.sin(tGlobal * 2.5) * 0.10) + ')' : 'rgba(200,80,80,0.18)';
  CX.fillRect(px, py, TS, TS);
  CX.strokeStyle = open ? '#8ce0b8' : '#c06868'; CX.lineWidth = 1;
  CX.strokeRect(px + 0.5, py + 0.5, TS - 1, TS - 1);
  CX.fillStyle = open ? '#d8fff0' : '#e8b0b0'; CX.font = '7px monospace'; CX.textAlign = 'center';
  CX.fillText(e.label.slice(0, 18), px + TS / 2, py - 3); CX.textAlign = 'left';
}
function drawLightAndWeather(th, z, dt, ox, oy) {
  // luz ambiental / viñeta
  const gr = CX.createRadialGradient(VW / 2, VH / 2, VH * 0.28, VW / 2, VH / 2, VH * 0.92);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,' + (0.75 - th.amb) + ')');
  CX.fillStyle = gr; CX.fillRect(0, 0, VW, VH);
  // halo del jugador en zonas oscuras
  if (th.amb < 0.16) {
    const lx = G.px - ox, ly = G.py - oy;
    const lg = CX.createRadialGradient(lx, ly, 8, lx, ly, 120);
    lg.addColorStop(0, 'rgba(255,240,200,0.20)');
    lg.addColorStop(1, 'rgba(255,240,200,0)');
    CX.fillStyle = lg; CX.fillRect(lx - 130, ly - 130, 260, 260);
  }
  const wk = z.weather;
  if (!wk) return;
  if (World.particles.length < 140) {
    for (let i = 0; i < 4; i++) World.particles.push({ x: Math.random() * (VW + 200) - 100, y: -10 - Math.random() * 60, v: 1, l: 1 });
  }
  const cfg = {
    rain: { vy: 420, vx: -90, col: 'rgba(160,200,255,0.5)', w: 1, h: 9 },
    snow: { vy: 60, vx: 22, col: 'rgba(255,255,255,0.8)', w: 2, h: 2 },
    fog: { vy: 8, vx: 26, col: 'rgba(200,220,235,0.05)', w: 60, h: 24 },
    wind: { vy: 30, vx: 190, col: 'rgba(220,230,200,0.25)', w: 8, h: 1 },
    sand: { vy: 20, vx: 230, col: 'rgba(230,200,140,0.30)', w: 6, h: 1 },
    ash: { vy: 40, vx: -30, col: 'rgba(200,200,220,0.35)', w: 2, h: 2 }
  }[wk] || { vy: 100, vx: 0, col: '#fff', w: 1, h: 4 };
  CX.fillStyle = cfg.col;
  World.particles.forEach(p => {
    p.x += cfg.vx * dt + Math.sin(tGlobal + p.y * 0.05) * 6 * dt;
    p.y += cfg.vy * dt;
    if (p.y > VH + 20 || p.x < -140 || p.x > VW + 140) { p.x = Math.random() * (VW + 200) - 100; p.y = -10; }
    CX.fillRect(p.x, p.y, cfg.w, cfg.h);
  });
}

/* ---------- 20. MOVIMIENTO E INTERACCIÓN ---------- */
const Keys = {};
window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) e.preventDefault();
  if (!Keys[e.key]) onKeyPress(e.key);
  Keys[e.key] = true;
});
window.addEventListener('keyup', e => { Keys[e.key] = false; });
const Touch = { x: 0, y: 0, active: false };

function updateWorld(dt) {
  if (G.scene !== 'world') return;
  let dx = 0, dy = 0;
  if (Keys['ArrowLeft'] || Keys['a'] || Keys['A']) dx -= 1;
  if (Keys['ArrowRight'] || Keys['d'] || Keys['D']) dx += 1;
  if (Keys['ArrowUp'] || Keys['w'] || Keys['W']) dy -= 1;
  if (Keys['ArrowDown'] || Keys['s'] || Keys['S']) dy += 1;
  if (Touch.active) { dx += Touch.x; dy += Touch.y; }
  const mag = Math.hypot(dx, dy);
  G.moving = mag > 0.15;
  if (G.moving) {
    dx /= mag; dy /= mag;
    const sp = 110 * dt;
    const nx = G.px + dx * sp, ny = G.py + dy * sp;
    const R = 7;
    if (!solidAt(nx - R, G.py + 6) && !solidAt(nx + R, G.py + 6) && !solidAt(nx - R, G.py - 2) && !solidAt(nx + R, G.py - 2)) G.px = nx;
    if (!solidAt(G.px - R, ny + 6) && !solidAt(G.px + R, ny + 6) && !solidAt(G.px - R, ny - 2) && !solidAt(G.px + R, ny - 2)) G.py = ny;
    if (Math.abs(dx) > Math.abs(dy)) G.dir = dx > 0 ? 'right' : 'left'; else G.dir = dy > 0 ? 'down' : 'up';
    G.anim += dt * 7;
    G.steps += sp;
    checkEncounter(sp);
    checkAutoTriggers();
  }
}
function checkAutoTriggers() {
  const tx = Math.floor(G.px / TS), ty = Math.floor(G.py / TS);
  for (const e of World.exits) {
    if (Math.abs(e.x - tx) < 1 && Math.abs(e.y - ty) < 1) {
      if (exitOpen(e)) { useExit(e); return; }
      else if (!G._exitWarn || tGlobal - G._exitWarn > 2) { G._exitWarn = tGlobal; toast(exitReason(e)); }
    }
  }
  for (const b of World.bosses) {
    if (G.flags[b.flag] || !bossAvailable(b)) continue;
    if (Math.abs(b.x - tx) <= 1 && Math.abs(b.y - ty) <= 1) { startBossEncounter(b); return; }
  }
}
function exitOpen(e) {
  if (!e.need) return true;
  if (e.need.ch && G.chapter < e.need.ch) return false;
  if (e.need.flag && !G.flags[e.need.flag]) return false;
  if (e.need.item && !hasItem(e.need.item)) return false;
  return true;
}
function exitReason(e) {
  if (e.need.flag === 'nunca') return 'La tarjeta ya no abre esta puerta.';
  if (e.need.ch) return 'Todavía no. (Capítulo ' + e.need.ch + ')';
  if (e.need.item) return 'Necesitas: ' + ITEMS[e.need.item].n;
  if (e.need.flag) return 'Algo te impide pasar todavía.';
  return 'Cerrado.';
}
function bossAvailable(b) {
  if (b.need) {
    if (b.need.ch && G.chapter < b.need.ch) return false;
    if (b.need.flag && !G.flags[b.need.flag]) return false;
  }
  return true;
}
function useExit(e) {
  Audio_.sfx('door');
  fadeTo(() => { loadZone(e.to, e.tx, e.ty); camX = G.px - VW / 2; camY = G.py - VH / 2; toast(ZONES[e.to].n); autosave(); });
}
function checkEncounter(dist) {
  const z = ZONES[World.zone];
  if (!z.enc || !z.enc.length) return;
  const t = tileAt(Math.floor(G.px / TS), Math.floor(G.py / TS));
  if (z.encTiles && !z.encTiles.includes(t)) return;
  G.encCount += dist / TS;
  if (G.encCount > 3 && Math.random() < z.encRate * (dist / 6)) {
    G.encCount = 0;
    const n = 1 + (Math.random() < 0.45 ? 1 : 0) + (Math.random() < 0.18 ? 1 : 0);
    const ids = []; for (let i = 0; i < n; i++) ids.push(pick(z.enc));
    Audio_.sfx('encounter');
    fadeTo(() => startBattle(ids, {}));
  }
}
function interact() {
  const tx = Math.floor(G.px / TS), ty = Math.floor(G.py / TS);
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[G.dir];
  const fx = tx + d[0], fy = ty + d[1];
  const near = (a, b) => (Math.abs(a.x - fx) <= 0 && Math.abs(a.y - fy) <= 0) || (Math.abs(a.x - tx) === 0 && Math.abs(a.y - ty) === 0);
  const npc = World.npcs.find(n => near(n) || (Math.abs(n.x - tx) <= 1 && Math.abs(n.y - ty) <= 1 && (n.x === fx || n.y === fy)));
  if (npc) { openNPC(npc); return; }
  const ch = World.chests.find(c => !G.chestsOpened[c.key] && Math.abs(c.x - tx) <= 1 && Math.abs(c.y - ty) <= 1);
  if (ch) { openChest(ch); return; }
  const ex = World.exits.find(e => Math.abs(e.x - tx) <= 1 && Math.abs(e.y - ty) <= 1);
  if (ex) { if (exitOpen(ex)) useExit(ex); else toast(exitReason(ex)); return; }
}
function openChest(c) {
  G.chestsOpened[c.key] = 1;
  Audio_.sfx('chest');
  let msg = '';
  if (c.gold) { G.gold += c.gold; msg = 'Encuentras ' + c.gold + ' €.'; }
  else { addItem(c.it, c.n || 1); msg = 'Obtienes ' + ITEMS[c.it].n + (c.n > 1 ? ' x' + c.n : '') + '.'; }
  startDialog([msg]);
}
function openNPC(n) {
  if (n.shop) {
    const scr = (DLG[n.s] || []).slice();
    scr.push({ shop: n.shop });
    startDialog(scr, n);
  } else startDialog(DLG[n.s] || ['...'], n);
}

/* ---------- 21. COMBATE ---------- */
const TERRAINS = {
  office: { n: 'Luz fluorescente', men: 1.20 }, town: { n: 'Calle abierta', enRegen: 3 },
  route: { n: 'Aire libre', enRegen: 5, fis: 1.1 }, metro: { n: 'Ruido de túnel', spd: -0.1, men: 1.15 },
  forest: { n: 'Niebla del domingo', men: 1.25, hpRegen: 2 }, finance: { n: 'Suelo pulido', soc: 1.2 },
  desert: { n: 'Sol de KPIs', men: 1.15, enRegen: -2 }, archive: { n: 'Papel apilado', soc: 1.15 },
  mountain: { n: 'Frío en la cara', fis: 1.15, spd: -0.05 }, mirror: { n: 'Superficie reflectante', men: 1.3, soc: 1.3 }
};
let B = null;
const FloatTexts = [];

function mkAlly(id) {
  const u = G.units[id], s = unitStats(u);
  return { side: 'ally', id, u, name: CHARS[id].n, pal: CHARS[id].pal, lvl: u.lvl, max: s.hp, maxEn: s.en, hp: Math.min(u.hp, s.hp), en: Math.min(u.en, s.en), st: {}, ap: 3, apNext: 0, cds: {}, shield: 0, cover: null, alive: u.hp > 0, base: s, anim: 0 };
}
function mkFoe(id, i) {
  const d = enemyDef(id);
  const lz = ZONES[World.zone] ? ZONES[World.zone].lvl : d.lvl;
  const pl = avgLevel();
  // los enemigos normales se adaptan al nivel del grupo para que el combate
  // siga siendo una decision y no un tramite; los jefes mantienen su nivel fijo.
  let lvl;
  if (d.boss) lvl = d.lvl;
  else {
    const target = Math.max(lz, pl - 1);
    lvl = clamp(d.lvl + Math.round((target - d.lvl) * 0.85) + ri(-1, 1), Math.max(1, d.lvl - 2), 45);
  }
  const dl = lvl - d.lvl;
  const s = {};
  for (const k in d.base) {
    const growth = (k === 'hp') ? 0.16 : 0.10;
    s[k] = Math.max(1, Math.floor(d.base[k] * (1 + dl * growth)));
  }
  // los jefes deben aguantar varias rondas: son un obstaculo, no un tramite
  if (d.boss) { s.hp = Math.floor(s.hp * 2.8); s.def = Math.floor(s.def * 1.25); s.res = Math.floor(s.res * 1.25); }
  const xpScale = Math.max(0.6, 1 + dl * 0.11);
  const def = dl > 0 ? Object.assign({}, d, { xp: Math.floor(d.xp * xpScale), gold: Math.floor(d.gold * xpScale) }) : d;
  return { side: 'foe', uid: id + '_' + i, defId: id, def, name: d.n, lvl, max: s.hp, hp: s.hp, st: {}, ap: d.boss ? 4 : (lvl >= 14 ? 3 : 2), cds: {}, shield: 0, alive: true, base: s, boss: !!d.boss, phase: 0, anim: 0, x: 0, y: 0 };
}
function effStats(a) {
  const s = Object.assign({}, a.base);
  for (const k in a.st) {
    const d = STATUS[k]; if (!d || !d.mod) continue;
    for (const st in d.mod) s[st] = Math.floor(s[st] * (1 + d.mod[st]));
  }
  const T = B && B.terrain;
  if (T && T.spd) s.spd = Math.floor(s.spd * (1 + T.spd));
  for (const k in s) s[k] = Math.max(1, s[k]);
  return s;
}
function alive(list) { return list.filter(u => u.alive); }

function startBattle(enemyIds, opts) {
  ensureUnits();
  const th = ZONES[World.zone].theme;
  B = {
    allies: G.party.slice(0, 4).map(mkAlly),
    foes: enemyIds.map(mkFoe),
    round: 1, order: [], idx: 0, phase: 'start', log: [], sel: null, targeting: null,
    terrain: Object.assign({ n: 'Terreno neutro' }, TERRAINS[th] || {}), boss: !!opts.boss, theme: th,
    escape: !opts.boss, result: null, timer: 0, pending: []
  };
  B.foes.forEach((f, i) => { f.x = 0.20 + (i % 3) * 0.16 + (i > 2 ? 0.08 : 0); f.y = 0.30 + Math.floor(i / 3) * 0.16 + (i % 2) * 0.06; });
  G.scene = 'battle';
  blog('¡' + (B.foes.length > 1 ? B.foes.length + ' enemigos aparecen!' : B.foes[0].name + ' aparece!'));
  blog('Terreno: ' + B.terrain.n);
  newRound();
  renderBattleUI();
}
function startBossEncounter(b) {
  const pre = DLG[b.pre] || [];
  G._pendingBoss = b;
  startDialog(pre.concat([{ startBoss: b.id, flag: b.flag }]));
}
function blog(t) { B.log.push(t); if (B.log.length > 60) B.log.shift(); }

function newRound() {
  B.order = alive(B.allies).concat(alive(B.foes));
  B.order.sort((a, b) => effStats(b).spd - effStats(a).spd + (Math.random() - 0.5) * 2);
  B.idx = -1;
  B.order.forEach(u => { u.ap = (u.side === 'ally' ? 3 : (u.boss ? 4 : 2)) + (u.apNext || 0); u.apNext = 0; for (const k in u.cds) if (u.cds[k] > 0) u.cds[k]--; });
  // mecánicas de jefe por ronda
  B.foes.filter(f => f.alive && f.boss).forEach(f => bossRoundMech(f));
  nextTurn();
}
function bossRoundMech(f) {
  const m = f.def.mech || {};
  if (m.summon && B.round % (m.summonEvery || 3) === 0 && B.foes.filter(x => x.alive).length < 4) {
    const id = pick(m.summon);
    const nf = mkFoe(id, B.foes.length);
    nf.x = 0.20 + (B.foes.length % 3) * 0.16; nf.y = 0.30 + Math.floor(B.foes.length / 3) * 0.18;
    B.foes.push(nf); blog(f.name + ' convoca a ' + nf.name + '.');
  }
  if (m.hasteEvery && B.round % m.hasteEvery === 0) { applyStatus(f, 'celeridad', 3); blog(f.name + ' acelera el ritmo.'); }
  if (m.growEvery && B.round % m.growEvery === 0) { f.base.atk = Math.floor(f.base.atk * 1.12); f.base.mag = Math.floor(f.base.mag * 1.12); blog(f.name + ' revisa sus objetivos al alza.'); }
  if (m.drainGold && B.round % 4 === 0 && G.gold > 0) { const g = Math.min(G.gold, 40); G.gold -= g; blog(f.name + ' te descuenta ' + g + ' €.'); }
  if (m.random && B.round % 3 === 0) { const t = pick(alive(B.allies)); if (t) { applyStatus(t, pick(['duda', 'lentitud', 'bloqueo']), 3); blog('El mercado cambia sin avisar.'); } }
  const phases = m.phases || 0;
  if (phases) {
    const p = f.hp / f.max < 0.33 ? 2 : (f.hp / f.max < 0.66 ? 1 : 0);
    if (p > f.phase) {
      f.phase = p;
      applyStatus(f, 'motivacion', 99); f.shield += Math.floor(f.max * 0.12);
      blog(f.name + ' cambia de fase. (' + (p + 1) + '/' + (phases + 1) + ')');
      Audio_.sfx('boss');
    }
  }
}
function nextTurn() {
  if (checkEnd()) return;
  B.idx++;
  if (B.idx >= B.order.length) { endRoundEffects(); return; }
  const u = B.order[B.idx];
  if (!u.alive) return nextTurn();
  if (u.st.sueno) { blog(u.name + ' sigue descansando.'); tickStatus(u); return setTimeout(nextTurn, 350); }
  if (u.side === 'foe') { B.phase = 'foe'; setTimeout(() => foeAct(u), 420); }
  else { B.phase = 'player'; B.sel = u; B.targeting = null; renderBattleUI(); }
}
function endRoundEffects() {
  B.order.forEach(u => { if (u.alive) tickStatus(u); });
  const T = B.terrain;
  if (T.enRegen) B.allies.forEach(a => { if (a.alive) a.en = clamp(a.en + T.enRegen, 0, a.maxEn); });
  if (T.hpRegen) B.allies.forEach(a => { if (a.alive) a.hp = clamp(a.hp + T.hpRegen, 0, a.max); });
  if (checkEnd()) return;
  B.round++;
  blog('— Ronda ' + B.round + ' —');
  newRound();
}
function tickStatus(u) {
  for (const k in u.st) {
    const d = STATUS[k];
    if (d.dot) { const dmg = Math.max(1, Math.floor(u.max * d.dot)); u.hp -= dmg; float(u, dmg, EL_COLOR[d.el] || '#c88'); if (u.hp <= 0) kill(u); }
    if (d.regen) { const h = Math.floor(u.max * d.regen); u.hp = clamp(u.hp + h, 0, u.max); float(u, '+' + h, '#7ce0a0'); }
    u.st[k]--;
    if (u.st[k] <= 0) delete u.st[k];
  }
}
function applyStatus(u, key, turns) {
  if (!STATUS[key]) return;
  if (STATUS[key].bad) {
    if (u.st.claridad) { blog(u.name + ' lo esquiva (Claridad).'); return; }
    const acc = ITEMS[(G.equip[u.id] || {}).acc];
    if (acc && acc.immune && acc.immune.includes(key)) { blog(u.name + ' es inmune a ' + STATUS[key].n + '.'); return; }
  }
  u.st[key] = Math.max(u.st[key] || 0, turns);
}
function float(u, txt, col) { FloatTexts.push({ u, t: String(txt), c: col || '#fff', life: 1.0, off: Math.random() * 10 - 5 }); }
function kill(u) {
  u.alive = false; u.hp = 0;
  blog(u.name + (u.side === 'ally' ? ' cae.' : ' se desvanece.'));
}

function damage(src, tgt, sk, powMul) {
  const el = sk.el || 'fis';
  const sa = effStats(src), st = effStats(tgt);
  const A = el === 'fis' ? sa.atk : sa.mag;
  const D = el === 'fis' ? st.def : (el === 'men' ? st.res : st.def);
  let pow = (sk.pow || 1) * (powMul || 1);
  if (sk.lowHpBonus) pow *= 1 + (1 - src.hp / src.max) * 1.3;
  let raw = pow * A * 2.1 * (100 / (100 + D * 2.8 * (1 - (sk.pierce || 0))));
  if (B.terrain[el]) raw *= B.terrain[el];
  const def = tgt.def;
  if (def) { if (def.weak === el) raw *= 1.6; if (def.res === el) raw *= 0.6; }
  const acc = ITEMS[(G.equip[tgt.id] || {}).acc];
  if (acc && acc.mit && acc.mit[el]) raw *= (1 - acc.mit[el]);
  let critC = (src.side === 'ally' ? unitCrit(src.u) : 0.05) + (sk.critBonus || 0) + (src.st.foco ? STATUS.foco.crit : 0);
  const isCrit = Math.random() < critC;
  if (isCrit) raw *= 1.85;
  raw *= 0.9 + Math.random() * 0.2;
  let dmg = Math.max(1, Math.floor(raw));
  if (tgt.shield > 0) { const ab = Math.min(tgt.shield, dmg); tgt.shield -= ab; dmg -= ab; if (ab) float(tgt, 'Escudo -' + ab, '#9ad0ff'); }
  tgt.hp -= dmg;
  tgt.anim = 0.35;
  float(tgt, dmg, isCrit ? '#ffd24a' : EL_COLOR[el]);
  Audio_.sfx(isCrit ? 'crit' : 'hit');
  if (tgt.st.sueno && STATUS.sueno.breakOnHit) delete tgt.st.sueno;
  if (sk.drain) { const h = Math.floor(dmg * sk.drain); src.hp = clamp(src.hp + h, 0, src.max); float(src, '+' + h, '#7ce0a0'); }
  if (tgt.st.contra && tgt.alive && dmg > 0) {
    const back = Math.floor(dmg * 0.6);
    src.hp -= back; float(src, back, '#e88a4a'); blog(tgt.name + ' devuelve el golpe.');
    if (src.hp <= 0) kill(src);
  }
  if (tgt.hp <= 0) kill(tgt);
  return dmg;
}
function healUnit(tgt, amount) {
  const h = Math.floor(amount);
  tgt.hp = clamp(tgt.hp + h, 0, tgt.max);
  float(tgt, '+' + h, '#7ce0a0'); Audio_.sfx('heal');
}
function resolveSkill(src, sk, targets) {
  if (sk.hpCost) { const c = Math.floor(src.max * sk.hpCost); src.hp = Math.max(1, src.hp - c); float(src, c, '#e05a5a'); }
  const hits = sk.hits || 1;
  targets.forEach(t => {
    if (!t) return;
    if (sk.revive) { if (!t.alive) { t.alive = true; t.hp = Math.floor(t.max * sk.revive); float(t, 'De vuelta', '#ffd24a'); Audio_.sfx('levelup'); } return; }
    if (!t.alive) return;
    if (sk.heal) { healUnit(t, t.max * sk.heal + effStats(src).mag * 1.2); }
    if (sk.healPct) healUnit(t, t.max * sk.healPct);
    if (sk.shield) { t.shield += Math.floor(t.max * sk.shield); float(t, 'Escudo', '#9ad0ff'); Audio_.sfx('buff'); }
    if (sk.cleanse) { let n = 0; for (const k in t.st) if (STATUS[k].bad) { delete t.st[k]; n++; } if (n) { float(t, 'Limpio', '#c0f0ff'); } }
    if (sk.buff) { applyStatus(t, sk.buff[0], sk.buff[1]); float(t, STATUS[sk.buff[0]].n, '#9ae0b0'); Audio_.sfx('buff'); }
    if (sk.apGain) t.apNext = (t.apNext || 0) + sk.apGain;
    if (sk.cover) { t.coverBy = src; src.cover = t; }
    if (sk.pow) for (let i = 0; i < hits; i++) { if (!t.alive) break; damage(src, t, sk, 1 / Math.sqrt(hits) * (hits > 1 ? 1.15 : 1)); }
    if (sk.inflict && t.alive) {
      const [key, ch, tn] = sk.inflict;
      const resMod = 1 - Math.min(0.5, effStats(t).res / 260);
      if (Math.random() < ch * resMod) { applyStatus(t, key, tn); float(t, STATUS[key].n, '#e0a0d0'); Audio_.sfx('debuff'); }
    }
    if (sk.mirror && t.alive) { const st = effStats(t); if (st.atk > effStats(src).atk) { applyStatus(src, 'motivacion', 2); } }
  });
  if (sk.selfDebuff) applyStatus(src, sk.selfDebuff[0], sk.selfDebuff[1]);
  src.anim = 0.3;
}
function targetsFor(src, sk, chosen) {
  const allies = src.side === 'ally' ? B.allies : B.foes;
  const foes = src.side === 'ally' ? B.foes : B.allies;
  switch (sk.tgt) {
    case 'allEnemies': return alive(foes);
    case 'allAllies': return alive(allies);
    case 'self': return [src];
    case 'dead': return chosen ? [chosen] : allies.filter(a => !a.alive).slice(0, 1);
    case 'ally': return chosen ? [chosen] : [alive(allies)[0]];
    default: {
      let t = chosen || alive(foes)[0];
      const taunt = alive(foes).find(f => f.st.provocado && f.side !== src.side);
      if (src.side === 'foe') {
        const prov = alive(B.allies).find(a => a.st && a.st.provocado);
        const tank = alive(B.allies).find(a => a.cover && a.cover === t);
        if (tank) t = tank;
      }
      return [t];
    }
  }
}

/* --- acciones del jugador --- */
function playerAct(kind, key, target) {
  const u = B.sel;
  if (!u || B.phase !== 'player') return;
  if (kind === 'attack') {
    const sk = { n: 'Atacar', ap: 1, pow: 1.0, el: 'fis', tgt: 'enemy' };
    if (u.ap < 1) return;
    u.ap -= 1; blog(u.name + ' ataca.');
    resolveSkill(u, sk, targetsFor(u, sk, target));
  } else if (kind === 'skill') {
    const sk = SKILLS[key];
    if (u.ap < sk.ap || u.en < (sk.en || 0) || (u.cds[key] || 0) > 0) return;
    if (u.st.silencio) { toast('Silenciado.'); return; }
    u.ap -= sk.ap; u.en -= (sk.en || 0);
    if (sk.cd) u.cds[key] = sk.cd + 1;
    blog(u.name + ' usa ' + sk.n + '.');
    resolveSkill(u, sk, targetsFor(u, sk, target));
  } else if (kind === 'item') {
    if (u.ap < 1) return;
    const it = ITEMS[key];
    u.ap -= 1; removeItem(key, 1);
    blog(u.name + ' usa ' + it.n + '.');
    const t = target || u;
    if (it.heal) healUnit(t, it.heal);
    if (it.healPct) healUnit(t, t.max * it.healPct);
    if (it.healAll) alive(B.allies).forEach(a => healUnit(a, a.max * it.healAll));
    if (it.en) { t.en = clamp(t.en + it.en, 0, t.maxEn); float(t, '+' + it.en + ' EN', '#9ad0ff'); }
    if (it.cleanse) { for (const k in t.st) if (STATUS[k].bad) delete t.st[k]; float(t, 'Limpio', '#c0f0ff'); }
    if (it.revive && !t.alive) { t.alive = true; t.hp = Math.floor(t.max * it.revive); float(t, 'De vuelta', '#ffd24a'); }
  } else if (kind === 'defend') {
    if (u.ap < 1) return;
    u.ap = 0; u.apNext = 1; applyStatus(u, 'muro', 2);
    blog(u.name + ' aguanta.');
  } else if (kind === 'flee') {
    if (!B.escape) { toast('No puedes huir de esto.'); return; }
    const ok = Math.random() < 0.55 + effStats(u).spd * 0.004;
    if (ok) { blog('Escapáis.'); B.result = 'flee'; setTimeout(endBattle, 500); return; }
    blog('No podéis escapar.'); u.ap = 0;
  }
  B.targeting = null;
  syncAlly(u);
  if (checkEnd()) return;
  if (u.ap <= 0) { setTimeout(nextTurn, 280); B.phase = 'anim'; }
  renderBattleUI();
}
function endPlayerTurn() { if (B.phase !== 'player') return; B.sel.ap = 0; B.phase = 'anim'; setTimeout(nextTurn, 200); renderBattleUI(); }
function syncAlly(u) { if (u.side === 'ally') { u.u.hp = u.hp; u.u.en = u.en; } }

/* --- IA enemiga --- */
function foeAct(f) {
  if (!f.alive) return nextTurn();
  let guard = 0;
  const step = () => {
    if (!f.alive || f.ap <= 0 || guard++ > 6) { B.foes.forEach(x => { }); return setTimeout(nextTurn, 320); }
    const opts = (f.def.skills || ['e_golpe']).map(k => SKILLS[k]).filter(s => s && s.ap <= f.ap);
    const basic = { n: 'Golpe', ap: 1, pow: 0.95, el: 'fis', tgt: 'enemy' };
    let sk = null, chosen = null;
    const myTeam = alive(B.foes), enemyTeam = alive(B.allies);
    if (!enemyTeam.length) return setTimeout(nextTurn, 200);
    const hurt = myTeam.filter(m => m.hp / m.max < 0.5);
    const healSk = opts.find(s => s.heal);
    const resetSk = opts.find(s => s.cleanse && s.tgt === 'self');
    if (resetSk && Object.keys(f.st).filter(k => STATUS[k].bad).length >= 2) { sk = resetSk; chosen = f; }
    else if (healSk && hurt.length && Math.random() < 0.6) { sk = healSk; chosen = hurt.sort((a, b) => a.hp / a.max - b.hp / b.max)[0]; }
    else {
      const atk = opts.filter(s => s.pow || s.inflict);
      sk = atk.length ? pick(atk) : basic;
      const prov = enemyTeam.find(a => a.st.provocado);
      if (prov) chosen = prov;
      else if (Math.random() < 0.55) chosen = enemyTeam.slice().sort((a, b) => a.hp - b.hp)[0];
      else chosen = pick(enemyTeam);
      const tank = enemyTeam.find(a => a.cover === chosen);
      if (tank) chosen = tank;
    }
    if (f.st.silencio && sk !== basic) sk = basic;
    f.ap -= sk.ap || 1;
    blog(f.name + ': ' + sk.n);
    resolveSkill(f, sk, targetsFor(f, sk, chosen));
    B.allies.forEach(syncAlly);
    renderBattleUI();
    if (checkEnd()) return;
    setTimeout(step, 520);
  };
  step();
}

function checkEnd() {
  if (!B || B.result) return !!(B && B.result);
  if (!alive(B.foes).length) { B.result = 'win'; setTimeout(endBattle, 700); return true; }
  if (!alive(B.allies).length) { B.result = 'lose'; setTimeout(endBattle, 900); return true; }
  return false;
}
function endBattle() {
  const res = B.result;
  if (res === 'win') {
    let xp = 0, gold = 0; const drops = [];
    B.foes.forEach(f => { xp += f.def.xp; gold += f.def.gold; (f.def.drop || []).forEach(d => { if (chance(0.4)) drops.push(d); }); });
    G.gold += gold;
    drops.forEach(d => addItem(d, 1));
    B.allies.forEach(syncAlly);
    const ups = grantXP(xp);
    Audio_.sfx('victory');
    const lines = ['¡Victoria!', 'XP +' + xp + '   ' + gold + ' €'];
    if (drops.length) lines.push('Objetos: ' + drops.map(d => ITEMS[d].n).join(', '));
    ups.forEach(l => lines.push(l));
    if (G._pendingBoss) {
      const b = G._pendingBoss; G.flags[b.flag] = 1; G._pendingBoss = null;
      lines.push('');
      lines.push(...bossAfter(b));
    }
    B = null; G.scene = 'world'; hideBattleUI();
    startDialog(lines);
    autosave();
  } else if (res === 'flee') {
    B.allies.forEach(syncAlly); B = null; G.scene = 'world'; hideBattleUI(); G._pendingBoss = null;
  } else {
    Audio_.sfx('defeat');
    B = null; hideBattleUI(); G._pendingBoss = null;
    G.scene = 'world';
    G.party.forEach(id => { const u = G.units[id]; u.hp = Math.max(1, Math.floor(unitStats(u).hp * 0.3)); u.en = Math.floor(unitStats(u).en * 0.5); });
    G.gold = Math.floor(G.gold * 0.85);
    startDialog(['Te despiertas sin saber cuánto tiempo ha pasado.', 'Alguien te ha llevado a un sitio seguro. Has perdido algo de dinero y bastante dignidad.', 'Vuelve a intentarlo.']);
  }
  renderHUD();
}
function bossAfter(b) {
  const map = {
    ch1_boss: ['La puerta se abre. Sales a la calle. Son las 9:51 de un martes.', () => advanceChapter(2)],
    ch3_boss: ['La reunión termina. Nadie toma notas. No hacía falta.', () => advanceChapter(4)],
    ch4_boss: ['El Calendario se apaga casilla a casilla. Debajo solo hay tiempo.', () => advanceChapter(5)],
    ch6_boss: ['El Sueldo Fantasma se deshace. El dinero sigue siendo un problema, pero ya no es un fantasma.', () => advanceChapter(7)],
    ch8_boss: ['El Algoritmo deja de predecirte. Por primera vez en años, eres estadísticamente impredecible.', () => advanceChapter(9)],
    ch9_boss: ['El KPI se desploma. Las barras caen. Nadie muere por ello.', () => advanceChapter(10)],
    ch10_boss: ['El Mercado Laboral se dispersa. Sigue ahí fuera. Ya no te define.', () => advanceChapter(11)],
    ch12_boss: ['El Jefe se sienta en una piedra y mira el valle.', '"Sube tú. Yo ya elegí."', () => advanceChapter(13)],
    ch13_boss: ['La Comparación se rompe en mil trozos. Cada uno sigue reflejando a alguien.', () => advanceChapter(14)],
    final_boss: ['El Espejo se aquieta.', () => { G.flags.game_complete = 1; setTimeout(showEnding, 1800); }]
  };
  const e = map[b.flag] || [];
  const lines = [];
  e.forEach(x => { if (typeof x === 'function') setTimeout(x, 100); else lines.push(x); });
  return lines;
}
function advanceChapter(n) {
  if (G.chapter >= n) return;
  G.chapter = n;
  const intro = CH_INTRO[n];
  const ch = CHAPTERS[n - 1];
  setTimeout(() => {
    startDialog((intro || []).concat(['CAPÍTULO ' + n + ' — ' + ch.t, ch.o]));
    autosave();
  }, 400);
}

/* ---------- 22. RENDER DE COMBATE ---------- */
function drawBattle(dt) {
  const th = THEMES[B.theme];
  const g = CX.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, th.sky); g.addColorStop(1, shade(th.sky, 1.9));
  CX.fillStyle = g; CX.fillRect(0, 0, VH ? VW : VW, VH);
  // suelo
  CX.fillStyle = shade((th[0] || ['#333'])[0], 0.9);
  CX.beginPath(); CX.ellipse(VW * 0.5, VH * 0.72, VW * 0.62, VH * 0.34, 0, 0, 7); CX.fill();
  CX.fillStyle = 'rgba(255,255,255,0.05)';
  CX.beginPath(); CX.ellipse(VW * 0.5, VH * 0.70, VW * 0.5, VH * 0.26, 0, 0, 7); CX.fill();
  // enemigos
  B.foes.forEach(f => {
    if (!f.alive) return;
    const sc = f.boss ? 4 : 2.6;
    const spr = creatureSprite(f.def.grid, f.def.pal, sc);
    const x = VW * f.x + (f.boss ? VW * 0.12 : 0), y = VH * f.y;
    const shake = f.anim > 0 ? Math.sin(f.anim * 60) * 4 : 0;
    drawShadow(x + spr.width / 2, y + spr.height + 2, spr.width * 0.36);
    CX.save();
    if (f.anim > 0) CX.globalAlpha = 0.6 + Math.sin(f.anim * 40) * 0.4;
    CX.drawImage(spr, Math.floor(x + shake), Math.floor(y + Math.sin(tGlobal * 1.6 + f.x * 9) * 3));
    CX.restore();
    // barra
    const bw = Math.max(56, spr.width);
    bar(x + spr.width / 2 - bw / 2, y - 12, bw, 5, f.hp / f.max, '#d8504a', '#2a1418');
    CX.fillStyle = '#e8e8f0'; CX.font = '7px monospace'; CX.textAlign = 'center';
    CX.fillText(f.name + ' Lv' + f.lvl, x + spr.width / 2, y - 16);
    statusIcons(f, x + spr.width / 2 - 20, y - 4);
    CX.textAlign = 'left';
    if (f.anim > 0) f.anim -= dt;
  });
  // aliados
  B.allies.forEach((a, i) => {
    const x = VW * 0.60 + i * 42, y = VH * 0.58 + i * 16;
    const active = B.sel === a && B.phase === 'player';
    const spr = humanSprite(a.pal, 'left', a.alive ? (active ? (Math.floor(tGlobal * 6) % 2) + 1 : 0) : 0, 2.4);
    drawShadow(x + spr.width / 2, y + spr.height, spr.width * 0.3);
    CX.save();
    if (!a.alive) CX.globalAlpha = 0.28;
    if (a.anim > 0) { CX.globalAlpha = 0.6 + Math.sin(a.anim * 40) * 0.4; a.anim -= dt; }
    if (active) { CX.shadowColor = '#ffe08a'; CX.shadowBlur = 10; }
    CX.drawImage(spr, Math.floor(x), Math.floor(y + (active ? -3 : 0)));
    CX.restore();
    statusIcons(a, x, y - 6);
  });
  // textos flotantes
  for (let i = FloatTexts.length - 1; i >= 0; i--) {
    const f = FloatTexts[i]; f.life -= dt * 1.5;
    if (f.life <= 0) { FloatTexts.splice(i, 1); continue; }
    let x, y;
    if (f.u.side === 'foe') { const spr = creatureSprite(f.u.def.grid, f.u.def.pal, f.u.boss ? 4 : 2.6); x = VW * f.u.x + (f.u.boss ? VW * 0.12 : 0) + spr.width / 2; y = VH * f.u.y + 10; }
    else { const i2 = B.allies.indexOf(f.u); x = VW * 0.60 + i2 * 42 + 16; y = VH * 0.58 + i2 * 16; }
    CX.font = 'bold 11px monospace'; CX.textAlign = 'center';
    CX.fillStyle = 'rgba(0,0,0,0.6)';
    CX.fillText(f.t, x + f.off + 1, y - (1 - f.life) * 28 + 1);
    CX.fillStyle = f.c;
    CX.fillText(f.t, x + f.off, y - (1 - f.life) * 28);
    CX.textAlign = 'left';
  }
}
function bar(x, y, w, h, p, col, bg) {
  CX.fillStyle = bg || '#1a1620'; CX.fillRect(x, y, w, h);
  CX.fillStyle = col; CX.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * clamp(p, 0, 1)), h - 2);
}
function statusIcons(u, x, y) {
  let i = 0;
  CX.font = '8px monospace';
  for (const k in u.st) {
    const d = STATUS[k];
    CX.fillStyle = d.bad ? '#e06a8a' : '#7ce0a0';
    CX.fillText(d.ico, x + i * 9, y);
    i++;
    if (i > 5) break;
  }
}

/* ---------- 23. UI BÁSICA ---------- */
const $ = id => document.getElementById(id);
let toastT = 0;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); toastT = 2.4; }
let fadeA = 0, fadeCb = null, fadeDir = 0;
function fadeTo(cb) { fadeCb = cb; fadeDir = 1; }

/* --- DIÁLOGO --- */
function startDialog(script, npc) {
  if (!script || !script.length) return;
  G.dialog = { s: script.slice(), i: -1, npc, prev: G.scene === 'battle' ? 'world' : G.scene };
  G.scene = 'dialog';
  advanceDialog();
}
function advanceDialog() {
  const d = G.dialog; if (!d) return;
  if (d.wait) return;
  d.i++;
  if (d.i >= d.s.length) { closeDialog(); return; }
  const node = d.s[d.i];
  const box = $('dialog');
  box.style.display = 'block';
  if (typeof node === 'string') { renderLine('', node); return; }
  if (node.w !== undefined) { renderLine(node.w, node.t); return; }
  if (node.do) { applyEffects(node.do); return advanceDialog(); }
  if (node.c) { renderChoices(node.c); return; }
  if (node.shop) { closeDialog(); openShop(node.shop); return; }
  if (node.startBoss) {
    closeDialog();
    fadeTo(() => { Audio_.sfx('boss'); startBattle([node.startBoss], { boss: 1 }); });
    return;
  }
  advanceDialog();
}
function renderLine(who, text) {
  const box = $('dialog');
  box.innerHTML = '<div class="dname">' + (who ? esc(who) : '') + '</div><div class="dtext" id="dtext"></div><div class="dnext">▼</div>';
  const el = $('dtext');
  const full = String(text); let n = 0;
  G.dialog.typing = setInterval(() => {
    n += 2;
    el.textContent = full.slice(0, n);
    if (n % 6 === 0) Audio_.sfx('text');
    if (n >= full.length) { clearInterval(G.dialog.typing); G.dialog.typing = null; }
  }, 16);
  G.dialog.full = full; G.dialog.el = el;
}
function renderChoices(choices) {
  const d = G.dialog; d.wait = true;
  const box = $('dialog');
  const avail = choices.filter(c => !c.req || checkReq(c.req));
  box.innerHTML = '<div class="dname">Elige</div><div class="dchoices">' +
    avail.map((c, i) => '<button class="dchoice" data-i="' + i + '">' + esc(c.l) + '</button>').join('') + '</div>';
  box.querySelectorAll('.dchoice').forEach(b => b.onclick = () => {
    Audio_.sfx('confirm');
    const c = avail[+b.dataset.i];
    d.wait = false;
    if (c.then) d.s.splice(d.i + 1, 0, ...c.then);
    if (c.do) applyEffects(c.do);
    advanceDialog();
  });
}
function checkReq(r) {
  if (r.flag && !G.flags[r.flag]) return false;
  if (r.ch && G.chapter < r.ch) return false;
  if (r.item && !hasItem(r.item)) return false;
  return true;
}
function applyEffects(e) {
  if (e.flag) G.flags[e.flag] = 1;
  if (e.ax) for (const k in e.ax) G.axes[k] += e.ax[k];
  if (e.gold) { G.gold += e.gold; Audio_.sfx('coin'); }
  if (e.it) { addItem(e.it[0], e.it[1] || 1); }
  if (e.q && !G.quests[e.q]) { G.quests[e.q] = 'active'; toast('Nueva misión: ' + QUESTS[e.q].n); }
  if (e.qdone && G.quests[e.qdone] !== 'done') {
    G.quests[e.qdone] = 'done';
    const q = QUESTS[e.qdone];
    if (q && q.r) {
      if (q.r.gold) G.gold += q.r.gold;
      if (q.r.xp) grantXP(q.r.xp);
      if (q.r.it) addItem(q.r.it[0], q.r.it[1]);
    }
    toast('Misión completada: ' + (q ? q.n : ''));
    Audio_.sfx('levelup');
  }
  if (e.join && !G.party.includes(e.join)) {
    G.party.push(e.join);
    G.units[e.join] = makeUnit(e.join, Math.max(1, avgLevel()));
    autoEquip(e.join);
    toast(CHARS[e.join].n + ' se une al equipo');
  }
  if (e.ch) advanceChapter(e.ch);
  if (e.heal) G.party.forEach(id => { const u = G.units[id], s = unitStats(u); u.hp = s.hp; u.en = s.en; });
  renderHUD();
}
function closeDialog() {
  if (G.dialog && G.dialog.typing) clearInterval(G.dialog.typing);
  const npc = G.dialog ? G.dialog.npc : null;
  G.dialog = null;
  $('dialog').style.display = 'none';
  G.scene = 'world';
  // capítulo 2 automático al hablar con Lucía/Dani
  checkStoryProgress();
  renderHUD();
}
function esc(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }

function checkStoryProgress() {
  if (G.chapter === 2 && G.party.includes('lucia') && G.party.includes('dani')) advanceChapter(3);
  if (G.chapter === 5 && G.quests.q_ciclista) advanceChapter(6);
  if (G.chapter === 7 && (G.quests.q_iker === 'done' || G.quests.q_padre === 'done')) advanceChapter(8);
  if (G.chapter === 11 && G.zone === 'montana') advanceChapter(12);
}

/* --- HUD --- */
function renderHUD() {
  const h = $('hud');
  if (G.scene === 'title' || G.scene === 'ending') { h.style.display = 'none'; return; }
  h.style.display = 'flex';
  ensureUnits();
  const ch = CHAPTERS[G.chapter - 1] || CHAPTERS[0];
  h.innerHTML =
    '<div class="hudbox"><div class="hudch">CAP. ' + G.chapter + ' — ' + esc(ch.t) + '</div>' +
    '<div class="hudobj">' + esc(ch.o) + '</div></div>' +
    '<div class="hudparty">' + G.party.slice(0, 4).map(id => {
      const u = G.units[id], s = unitStats(u);
      return '<div class="pchip"><span class="pn">' + CHARS[id].n + '</span>' +
        '<span class="plv">Lv' + u.lvl + '</span>' +
        '<div class="pb"><i style="width:' + Math.round(u.hp / s.hp * 100) + '%"></i></div>' +
        '<div class="pb en"><i style="width:' + Math.round(u.en / s.en * 100) + '%"></i></div></div>';
    }).join('') + '</div>' +
    '<div class="hudbox right"><div class="hudgold">' + G.gold + ' €</div>' +
    '<div class="hudhint">[E] interactuar · [M] menú</div></div>';
}

/* --- TOAST / MENÚ PRINCIPAL DEL JUEGO --- */
const MENU_TABS = ['Equipo', 'Inventario', 'Habilidades', 'Diario', 'Mapa', 'Guardar', 'Opciones'];
function openMenu(tab) {
  G.scene = 'menu'; G.menuTab = tab || G.menuTab || 'Equipo';
  const m = $('menu'); m.style.display = 'flex';
  drawMenu();
}
function closeMenu() { $('menu').style.display = 'none'; G.scene = 'world'; renderHUD(); }
function drawMenu() {
  ensureUnits();
  const m = $('menu');
  let body = '';
  const t = G.menuTab;
  if (t === 'Equipo') body = menuParty();
  else if (t === 'Inventario') body = menuInv();
  else if (t === 'Habilidades') body = menuSkills();
  else if (t === 'Diario') body = menuQuests();
  else if (t === 'Mapa') body = menuMap();
  else if (t === 'Guardar') body = menuSave();
  else body = menuOptions();
  m.innerHTML = '<div class="mwrap"><div class="mtabs">' +
    MENU_TABS.map(x => '<button class="mtab' + (x === t ? ' on' : '') + '" data-t="' + x + '">' + x + '</button>').join('') +
    '<button class="mtab close" id="mclose">✕</button></div><div class="mbody">' + body + '</div></div>';
  m.querySelectorAll('.mtab').forEach(b => b.onclick = () => { if (b.id === 'mclose') return closeMenu(); Audio_.sfx('move'); G.menuTab = b.dataset.t; drawMenu(); });
  bindMenuActions();
}
function menuParty() {
  return '<div class="grid2">' + G.party.map(id => {
    const u = G.units[id], s = unitStats(u), c = CHARS[id], eq = G.equip[id] || {};
    const nx = xpForLevel(u.lvl + 1);
    return '<div class="card"><div class="chead"><b>' + c.n + '</b> <span class="tag">' + c.role + '</span> <span class="lv">Lv ' + u.lvl + '</span></div>' +
      '<div class="cbio">' + esc(c.bio) + '</div>' +
      '<div class="stats">' + ['hp', 'en', 'atk', 'def', 'mag', 'res', 'spd'].map(k =>
        '<span>' + k.toUpperCase() + ' <b>' + s[k] + '</b></span>').join('') + '</div>' +
      '<div class="xpb"><i style="width:' + Math.round(u.xp / nx * 100) + '%"></i></div><small>XP ' + u.xp + ' / ' + nx + '</small>' +
      '<div class="eqrow">' + ['weapon', 'armor', 'acc'].map(sl =>
        '<div class="eqslot"><small>' + ({ weapon: 'Arma', armor: 'Ropa', acc: 'Accesorio' })[sl] + '</small>' +
        '<select data-eq="' + id + '" data-slot="' + sl + '"><option value="">—</option>' +
        Object.keys(G.inv).concat(eq[sl] ? [eq[sl]] : []).filter((v, i, a) => a.indexOf(v) === i)
          .filter(k => ITEMS[k] && ITEMS[k].t === sl && (!ITEMS[k].who || ITEMS[k].who === id))
          .map(k => '<option value="' + k + '"' + (eq[sl] === k ? ' selected' : '') + '>' + ITEMS[k].n + '</option>').join('') +
        '</select></div>').join('') + '</div></div>';
  }).join('') + '</div>';
}
function menuInv() {
  const keys = Object.keys(G.inv).filter(k => G.inv[k] > 0);
  if (!keys.length) return '<p class="empty">La mochila está vacía.</p>';
  return '<div class="grid3">' + keys.map(k => {
    const it = ITEMS[k]; if (!it) return '';
    return '<div class="card sm"><b>' + it.n + '</b> <span class="tag">x' + G.inv[k] + '</span>' +
      '<div class="cbio">' + esc(it.d || itemDesc(it)) + '</div>' +
      (it.t === 'use' ? '<button class="btn" data-use="' + k + '">Usar</button>' : '') + '</div>';
  }).join('') + '</div>';
}
function itemDesc(it) {
  const p = [];
  ['atk', 'def', 'mag', 'res', 'spd', 'hp', 'en'].forEach(k => { if (it[k]) p.push(k.toUpperCase() + ' ' + (it[k] > 0 ? '+' : '') + it[k]); });
  return p.join('  ') || '—';
}
function menuSkills() {
  return G.party.map(id => {
    const u = G.units[id], c = CHARS[id];
    return '<div class="card"><div class="chead"><b>' + c.n + '</b> <span class="tag">Puntos: ' + u.sp + '</span></div>' +
      '<div class="boosts">' + ['hp', 'atk', 'def', 'mag', 'res', 'spd'].map(k =>
        '<button class="btn sm" data-boost="' + id + '|' + k + '"' + (u.sp <= 0 ? ' disabled' : '') + '>+' + k.toUpperCase() + ' (' + u.boost[k] + ')</button>').join('') + '</div>' +
      '<div class="skills">' + u.skills.map(sk => {
        const s = SKILLS[sk];
        return '<div class="sk"><b>' + s.n + '</b> <span class="tag">' + s.ap + ' PA' + (s.en ? ' · ' + s.en + ' EN' : '') + (s.cd ? ' · CD ' + s.cd : '') + '</span>' +
          '<div class="cbio">' + esc(s.d || '') + '</div></div>';
      }).join('') + '</div>' +
      '<div class="cbio next">Próximas: ' + Object.keys(c.learn).filter(L => +L > u.lvl).map(L => c.learn[L].map(k => SKILLS[k].n + ' (Lv' + L + ')').join(', ')).join(', ') + '</div></div>';
  }).join('');
}
function menuQuests() {
  const act = Object.keys(G.quests).filter(k => G.quests[k] === 'active');
  const done = Object.keys(G.quests).filter(k => G.quests[k] === 'done');
  const row = k => { const q = QUESTS[k]; return q ? '<div class="qrow"><b>' + q.n + '</b><small>' + (ZONES[q.z] ? ZONES[q.z].n : '') + '</small><div class="cbio">' + esc(q.d) + '</div></div>' : ''; };
  return '<h3>Misiones activas (' + act.length + ')</h3>' + (act.map(row).join('') || '<p class="empty">Ninguna ahora mismo.</p>') +
    '<h3>Completadas (' + done.length + ' / ' + Object.keys(QUESTS).length + ')</h3>' + (done.map(row).join('') || '<p class="empty">Todavía nada.</p>') +
    '<h3>Decisiones</h3><div class="axes">' + Object.keys(G.axes).map(k =>
      '<div class="ax"><span>' + cap(k) + '</span><div class="pb"><i style="width:' + clamp(G.axes[k] * 5, 0, 100) + '%"></i></div><b>' + G.axes[k] + '</b></div>').join('') + '</div>';
}
function menuMap() {
  const zids = Object.keys(ZONES);
  return '<h3>Zonas</h3><div class="grid2">' + zids.map(z => {
    const Z = ZONES[z], seen = z === G.zone || G.flags['seen_' + z];
    return '<div class="card sm' + (z === G.zone ? ' here' : '') + '"><b>' + Z.n + '</b> <span class="tag">Nv ' + Z.lvl + '</span>' +
      '<div class="cbio">' + (Z.enc ? 'Enemigos: ' + Z.enc.map(e => ENEMIES[e] ? ENEMIES[e].n : e).slice(0, 3).join(', ') : 'Zona segura') + '</div></div>';
  }).join('') + '</div><h3>Zona actual</h3>' + minimapHTML();
}
function minimapHTML() {
  const s = 3, w = World.w, h = World.h;
  const c = document.createElement('canvas'); c.width = w * s; c.height = h * s;
  const x = c.getContext('2d');
  const th = THEMES[ZONES[World.zone].theme];
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const t = tileAt(xx, yy);
    x.fillStyle = t === T.VOID ? '#08080c' : (SOLID[t] ? shade((th[t] || th[0])[0], 0.7) : (th[t] || th[0])[0]);
    x.fillRect(xx * s, yy * s, s, s);
  }
  World.exits.forEach(e => { x.fillStyle = '#6ee0b0'; x.fillRect(e.x * s - 1, e.y * s - 1, s + 2, s + 2); });
  World.chests.forEach(cc => { if (!G.chestsOpened[cc.key]) { x.fillStyle = '#ffd24a'; x.fillRect(cc.x * s, cc.y * s, s + 1, s + 1); } });
  World.npcs.forEach(n => { x.fillStyle = '#7ab0ff'; x.fillRect(n.x * s, n.y * s, s + 1, s + 1); });
  World.bosses.forEach(b => { if (!G.flags[b.flag]) { x.fillStyle = '#ff4a5a'; x.fillRect(b.x * s - 2, b.y * s - 2, s + 4, s + 4); } });
  x.fillStyle = '#ffffff'; x.fillRect(Math.floor(G.px / TS) * s - 1, Math.floor(G.py / TS) * s - 1, s + 2, s + 2);
  return '<img class="minimap" src="' + c.toDataURL() + '">' +
    '<div class="legend"><span style="color:#fff">■ tú</span><span style="color:#6ee0b0">■ salida</span><span style="color:#ffd24a">■ cofre</span><span style="color:#7ab0ff">■ NPC</span><span style="color:#ff4a5a">■ jefe</span></div>';
}
function menuSave() {
  let h = '<h3>Partidas</h3><div class="grid3">';
  for (let i = 1; i <= 3; i++) {
    const d = readSlot(i);
    h += '<div class="card sm"><b>Slot ' + i + '</b><div class="cbio">' + (d ? 'Cap. ' + d.chapter + ' · ' + (ZONES[d.zone] ? ZONES[d.zone].n : '?') + '<br>Nv medio ' + d.lvl + ' · ' + d.gold + ' €<br><small>' + d.date + '</small>' : 'Vacío') + '</div>' +
      '<button class="btn" data-save="' + i + '">Guardar</button>' + (d ? '<button class="btn" data-load="' + i + '">Cargar</button>' : '') + '</div>';
  }
  const a = readSlot(0);
  h += '<div class="card sm"><b>Autoguardado</b><div class="cbio">' + (a ? 'Cap. ' + a.chapter + ' · ' + a.date : 'Vacío') + '</div>' + (a ? '<button class="btn" data-load="0">Cargar</button>' : '') + '</div>';
  return h + '</div>';
}
function menuOptions() {
  return '<h3>Opciones</h3><div class="card">' +
    '<label>Volumen <input type="range" id="optvol" min="0" max="100" value="' + Math.round(G.settings.vol * 100) + '"></label>' +
    '<label><input type="checkbox" id="optsfx"' + (G.settings.sfx ? ' checked' : '') + '> Efectos de sonido</label>' +
    '<p class="cbio">Controles: WASD / flechas para moverse · E o Espacio para interactuar · M menú · ESC cerrar.</p>' +
    '<button class="btn" id="opttitle">Volver al menú principal</button></div>';
}
function bindMenuActions() {
  const m = $('menu');
  m.querySelectorAll('[data-eq]').forEach(s => s.onchange = () => {
    const id = s.dataset.eq, sl = s.dataset.slot, val = s.value;
    G.equip[id] = G.equip[id] || {};
    G.equip[id][sl] = val || null;
    Audio_.sfx('confirm'); drawMenu(); renderHUD();
  });
  m.querySelectorAll('[data-use]').forEach(b => b.onclick = () => {
    const k = b.dataset.use, it = ITEMS[k];
    let used = false;
    G.party.forEach(id => {
      const u = G.units[id], s = unitStats(u);
      if (it.heal && u.hp < s.hp) { u.hp = clamp(u.hp + it.heal, 0, s.hp); used = true; }
      if (it.healPct && u.hp < s.hp) { u.hp = clamp(u.hp + s.hp * it.healPct, 0, s.hp); used = true; }
      if (it.healAll) { u.hp = clamp(u.hp + s.hp * it.healAll, 0, s.hp); used = true; }
      if (it.en && u.en < s.en) { u.en = clamp(u.en + it.en, 0, s.en); used = true; }
    });
    if (used) { removeItem(k, 1); Audio_.sfx('heal'); drawMenu(); renderHUD(); } else toast('No hace falta ahora mismo.');
  });
  m.querySelectorAll('[data-boost]').forEach(b => b.onclick = () => {
    const [id, k] = b.dataset.boost.split('|');
    const u = G.units[id];
    if (u.sp <= 0) return;
    u.sp--; u.boost[k]++;
    if (k === 'hp') u.hp += 14;
    Audio_.sfx('levelup'); drawMenu(); renderHUD();
  });
  m.querySelectorAll('[data-save]').forEach(b => b.onclick = () => { saveGame(+b.dataset.save); toast('Partida guardada en slot ' + b.dataset.save); drawMenu(); });
  m.querySelectorAll('[data-load]').forEach(b => b.onclick = () => { if (loadGame(+b.dataset.load)) { closeMenu(); toast('Partida cargada'); } });
  const v = $('optvol'); if (v) v.oninput = () => { G.settings.vol = v.value / 100; Audio_.vol = G.settings.vol; if (Audio_.master) Audio_.master.gain.value = G.settings.vol; };
  const sx = $('optsfx'); if (sx) sx.onchange = () => { G.settings.sfx = sx.checked; Audio_.enabled = sx.checked; };
  const tt = $('opttitle'); if (tt) tt.onclick = () => { autosave(); closeMenu(); showTitle(); };
}

/* --- TIENDA --- */
function openShop(id) {
  const sh = SHOPS[id]; if (!sh) return;
  G.scene = 'shop';
  const m = $('menu'); m.style.display = 'flex';
  const render = () => {
    m.innerHTML = '<div class="mwrap"><div class="mtabs"><button class="mtab on">' + sh.n + '</button>' +
      '<span class="shopgold">' + G.gold + ' €</span><button class="mtab close" id="mclose">✕</button></div><div class="mbody">' +
      (sh.inn ? '<div class="card"><b>Descansar</b><div class="cbio">Recupera todo el HP y la Energía del equipo.</div><button class="btn" id="innbtn">Descansar (' + sh.innPrice + ' €)</button></div>' : '') +
      '<h3>Comprar</h3><div class="grid3">' + sh.items.map(k => {
        const it = ITEMS[k];
        return '<div class="card sm"><b>' + it.n + '</b> <span class="tag">' + it.price + ' €</span>' +
          '<div class="cbio">' + esc(it.d || itemDesc(it)) + '</div>' +
          '<button class="btn" data-buy="' + k + '"' + (G.gold < it.price ? ' disabled' : '') + '>Comprar</button></div>';
      }).join('') + '</div><h3>Vender (50%)</h3><div class="grid3">' +
      Object.keys(G.inv).filter(k => G.inv[k] > 0 && ITEMS[k] && ITEMS[k].t !== 'key').map(k =>
        '<div class="card sm"><b>' + ITEMS[k].n + '</b> <span class="tag">x' + G.inv[k] + '</span>' +
        '<button class="btn" data-sell="' + k + '">Vender ' + Math.floor(ITEMS[k].price / 2) + ' €</button></div>').join('') +
      '</div></div></div>';
    $('mclose').onclick = () => { $('menu').style.display = 'none'; G.scene = 'world'; renderHUD(); };
    m.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const k = b.dataset.buy, it = ITEMS[k];
      if (G.gold < it.price) return;
      G.gold -= it.price; addItem(k, 1); Audio_.sfx('coin'); render(); renderHUD();
    });
    m.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => {
      const k = b.dataset.sell;
      G.gold += Math.floor(ITEMS[k].price / 2); removeItem(k, 1); Audio_.sfx('coin'); render(); renderHUD();
    });
    const ib = $('innbtn'); if (ib) ib.onclick = () => {
      if (G.gold < sh.innPrice) return toast('No te llega.');
      G.gold -= sh.innPrice;
      G.party.forEach(id => { const u = G.units[id], s = unitStats(u); u.hp = s.hp; u.en = s.en; });
      Audio_.sfx('heal'); toast('El equipo se recupera por completo.'); render(); renderHUD();
    };
  };
  render();
}

/* --- UI DE COMBATE --- */
function renderBattleUI() {
  const el = $('battleui');
  if (!B) { el.style.display = 'none'; return; }
  el.style.display = 'block';
  const logHTML = '<div class="blog">' + B.log.slice(-4).map(l => '<div>' + esc(l) + '</div>').join('') + '</div>';
  if (B.phase !== 'player' || !B.sel) { el.innerHTML = logHTML + '<div class="bwait">...</div>'; return; }
  const u = B.sel;
  const s = unitStats(u.u);
  let cmds = '';
  if (B.targeting) {
    const t = B.targeting;
    const list = t.tgt === 'ally' ? B.allies.filter(a => a.alive) : (t.tgt === 'dead' ? B.allies.filter(a => !a.alive) : B.foes.filter(f => f.alive));
    cmds = '<div class="btargets"><span class="blabel">Objetivo:</span>' + list.map((x, i) =>
      '<button class="bbtn" data-t="' + i + '">' + esc(x.name) + ' <small>' + Math.max(0, x.hp) + '</small></button>').join('') +
      '<button class="bbtn alt" data-cancel="1">Cancelar</button></div>';
  } else if (B.menu === 'skills') {
    cmds = '<div class="btargets">' + u.u.skills.map(k => {
      const sk = SKILLS[k];
      const ok = u.ap >= sk.ap && u.en >= (sk.en || 0) && !(u.cds[k] > 0) && !u.st.silencio;
      return '<button class="bbtn" data-sk="' + k + '"' + (ok ? '' : ' disabled') + ' title="' + esc(sk.d || '') + '">' + sk.n +
        ' <small>' + sk.ap + 'PA' + (sk.en ? '/' + sk.en + 'EN' : '') + ((u.cds[k] > 0) ? ' CD' + u.cds[k] : '') + '</small></button>';
    }).join('') + '<button class="bbtn alt" data-cancel="1">Volver</button></div>';
  } else if (B.menu === 'items') {
    const keys = Object.keys(G.inv).filter(k => G.inv[k] > 0 && ITEMS[k] && ITEMS[k].t === 'use');
    cmds = '<div class="btargets">' + (keys.length ? keys.map(k =>
      '<button class="bbtn" data-it="' + k + '">' + ITEMS[k].n + ' <small>x' + G.inv[k] + '</small></button>').join('') : '<span class="blabel">Sin objetos</span>') +
      '<button class="bbtn alt" data-cancel="1">Volver</button></div>';
  } else {
    cmds = '<div class="btargets">' +
      '<button class="bbtn" data-c="attack">Atacar <small>1PA</small></button>' +
      '<button class="bbtn" data-c="skills">Habilidades</button>' +
      '<button class="bbtn" data-c="items">Objetos</button>' +
      '<button class="bbtn" data-c="defend">Aguantar</button>' +
      (B.escape ? '<button class="bbtn alt" data-c="flee">Huir</button>' : '') +
      '<button class="bbtn alt" data-c="end">Fin de turno</button></div>';
  }
  el.innerHTML = logHTML +
    '<div class="bactor"><b>' + u.name + '</b> ' +
    '<span class="ap">' + '●'.repeat(Math.max(0, u.ap)) + '○'.repeat(Math.max(0, 3 - u.ap)) + '</span>' +
    '<span class="bhp">HP ' + Math.max(0, Math.floor(u.hp)) + '/' + u.max + '</span>' +
    '<span class="ben">EN ' + Math.max(0, Math.floor(u.en)) + '/' + u.maxEn + '</span>' +
    '<span class="bterr">' + B.terrain.n + ' · Ronda ' + B.round + '</span></div>' + cmds;

  el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
    const c = b.dataset.c;
    Audio_.sfx('confirm');
    if (c === 'skills' || c === 'items') { B.menu = c; renderBattleUI(); }
    else if (c === 'attack') { B.targeting = { kind: 'attack', tgt: 'enemy' }; renderBattleUI(); }
    else if (c === 'end') endPlayerTurn();
    else playerAct(c);
  });
  el.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => {
    const k = b.dataset.sk, sk = SKILLS[k];
    Audio_.sfx('confirm');
    if (['enemy', 'ally', 'dead'].includes(sk.tgt)) { B.targeting = { kind: 'skill', key: k, tgt: sk.tgt }; B.menu = null; renderBattleUI(); }
    else { B.menu = null; playerAct('skill', k); }
  });
  el.querySelectorAll('[data-it]').forEach(b => b.onclick = () => {
    const k = b.dataset.it;
    Audio_.sfx('confirm');
    B.targeting = { kind: 'item', key: k, tgt: ITEMS[k].revive ? 'dead' : 'ally' }; B.menu = null; renderBattleUI();
  });
  el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => {
    const t = B.targeting;
    const list = t.tgt === 'ally' ? B.allies.filter(a => a.alive) : (t.tgt === 'dead' ? B.allies.filter(a => !a.alive) : B.foes.filter(f => f.alive));
    const tgt = list[+b.dataset.t];
    playerAct(t.kind, t.key, tgt);
  });
  el.querySelectorAll('[data-cancel]').forEach(b => b.onclick = () => { Audio_.sfx('cancel'); B.targeting = null; B.menu = null; renderBattleUI(); });
}
function hideBattleUI() { $('battleui').style.display = 'none'; B = null; }

/* ---------- 24. GUARDADO ---------- */
const SKEY = 'fdlo_v1_';
function saveData() {
  return {
    v: 1, zone: G.zone, chapter: G.chapter, px: G.px, py: G.py, dir: G.dir,
    party: G.party, units: G.units, gold: G.gold, inv: G.inv, equip: G.equip,
    flags: G.flags, quests: G.quests, axes: G.axes, chests: G.chestsOpened,
    settings: G.settings, date: new Date().toLocaleString('es-ES'), lvl: avgLevel()
  };
}
function saveGame(slot) {
  try { localStorage.setItem(SKEY + slot, JSON.stringify(saveData())); return true; }
  catch (e) { toast('No se pudo guardar.'); return false; }
}
function autosave() { saveGame(0); }
function readSlot(slot) {
  try { const s = localStorage.getItem(SKEY + slot); return s ? JSON.parse(s) : null; } catch (e) { return null; }
}
function loadGame(slot) {
  const d = readSlot(slot);
  if (!d) return false;
  G.zone = d.zone; G.chapter = d.chapter; G.dir = d.dir || 'down';
  G.party = d.party; G.units = d.units; G.gold = d.gold; G.inv = d.inv || {};
  G.equip = d.equip || {}; G.flags = d.flags || {}; G.quests = d.quests || {};
  G.axes = d.axes || { libertad: 0, seguridad: 0, vinculos: 0, proposito: 0 };
  G.chestsOpened = d.chests || {}; G.settings = d.settings || G.settings;
  Audio_.vol = G.settings.vol; Audio_.enabled = G.settings.sfx;
  loadZone(G.zone);
  G.px = d.px; G.py = d.py;
  camX = G.px - VW / 2; camY = G.py - VH / 2;
  G.scene = 'world'; $('title').style.display = 'none'; $('menu').style.display = 'none';
  renderHUD();
  return true;
}
function newGame() {
  G.zone = 'oficina'; G.chapter = 1; G.party = ['alex']; G.units = {}; G.gold = 500;
  G.inv = { cafe: 3, agua: 2, camisa: 1 }; G.equip = {}; G.flags = {}; G.quests = {};
  G.axes = { libertad: 0, seguridad: 0, vinculos: 0, proposito: 0 }; G.chestsOpened = {};
  ensureUnits();
  loadZone('oficina', 21, 28);
  G.dir = 'up'; camX = G.px - VW / 2; camY = G.py - VH / 2;
  G.scene = 'world'; $('title').style.display = 'none';
  renderHUD();
  startDialog([
    'Martes. 09:41.',
    'Llevas doce años entrando por esa puerta. Hoy has entrado a recoger una taza, dos cables y una foto.',
    { w: 'Alex', t: 'Ya está. Se acabó.' },
    'CAPÍTULO 1 — El último fichaje',
    'Recorre la planta. Habla con quien quieras. Cuando estés listo, baja a la salida.'
  ]);
}

/* ---------- 25. FINALES ---------- */
const ENDINGS = [
  { id: 'libre', n: 'EL QUE NO VOLVIÓ', t: 'Alex no vuelve a una oficina. No se hace rico, no se hace famoso, y gana menos que antes. Se levanta cuando le da la gana y eso resulta ser, para él, un lujo suficiente. Algunos amigos dejan de entenderle. Otros le envidian en voz baja. Él ya no compara.' },
  { id: 'vuelta', n: 'EL QUE VOLVIÓ CON CONDICIONES', t: 'Alex vuelve a trabajar. No por rendición: por cálculo. Negocia días, horarios y un no rotundo que antes no sabía decir. Descubre que el problema nunca fue trabajar, sino trabajar sin margen. El sueldo vuelve. El miedo se va.' },
  { id: 'gente', n: 'EL QUE SE QUEDÓ CON LA GENTE', t: 'Al final no fue una cuestión de trabajo. Fue de quién aparece cuando las cosas se tuercen. Alex acaba viviendo cerca de Marta, tomando café con Jorge los sábados y discutiendo con Dani sobre si esto era o no una buena idea. Sigue sin tener una respuesta profesional. Tiene otras.' },
  { id: 'oficio', n: 'EL QUE ENCONTRÓ UN OFICIO', t: 'Alex encuentra algo que hacer con las manos y con las horas. No es una vocación épica ni una start-up. Es un oficio. Le ocupa más tiempo del que esperaba y no le importa, porque por primera vez el cansancio se parece a algo suyo.' },
  { id: 'equilibrio', n: 'EL QUE APRENDIÓ A REPARTIR', t: 'Alex no elige un bando. Trabaja parte del año, para parte del año, ve a su gente y se aburre a ratos. Nadie escribiría un libro sobre esta vida. Funciona.' },
  { id: 'deriva', n: 'EL QUE SIGUE MIRANDO LA PUERTA', t: 'Alex salió, pero nunca llegó a entrar en ninguna otra parte. Los días se parecen. No es infeliz; tampoco es otra cosa. A veces se pregunta si irse fue una decisión o solo un movimiento. Todavía tiene tiempo para averiguarlo.' }
];
function computeEnding() {
  const a = G.axes, total = a.libertad + a.seguridad + a.vinculos + a.proposito;
  if (total < 12) return ENDINGS[5];
  const entries = Object.entries(a).sort((x, y) => y[1] - x[1]);
  const [top, val] = entries[0], second = entries[1][1];
  if (val - second <= 2) return ENDINGS[4];
  return { libertad: ENDINGS[0], seguridad: ENDINGS[1], vinculos: ENDINGS[2], proposito: ENDINGS[3] }[top];
}
function showEnding() {
  const e = computeEnding();
  G.scene = 'ending';
  const t = $('title');
  t.style.display = 'flex';
  const qd = Object.values(G.quests).filter(v => v === 'done').length;
  t.innerHTML = '<div class="tbox ending"><h1>' + e.n + '</h1><p>' + esc(e.t) + '</p>' +
    '<p class="q">"¿Qué quieres hacer mañana?"</p>' +
    '<div class="stats2">Capítulos: ' + G.chapter + ' · Misiones: ' + qd + '/' + Object.keys(QUESTS).length +
    ' · Nivel medio: ' + avgLevel() + ' · Libertad ' + G.axes.libertad + ' / Seguridad ' + G.axes.seguridad + ' / Vínculos ' + G.axes.vinculos + ' / Propósito ' + G.axes.proposito + '</div>' +
    '<button class="tbtn" id="endback">Volver al menú</button></div>';
  $('endback').onclick = () => showTitle();
  renderHUD();
}

/* ---------- 26. TÍTULO ---------- */
function showTitle() {
  G.scene = 'title';
  const t = $('title'); t.style.display = 'flex';
  $('menu').style.display = 'none'; $('dialog').style.display = 'none'; $('battleui').style.display = 'none';
  const slots = [0, 1, 2, 3].map(i => ({ i, d: readSlot(i) })).filter(x => x.d);
  t.innerHTML = '<div class="tbox"><div class="tlogo">FUERA DE LA OFICINA</div>' +
    '<div class="tsub">Un RPG por turnos sobre qué hacer con el resto del día</div>' +
    '<button class="tbtn" id="tnew">Nueva partida</button>' +
    (slots.length ? '<div class="tslots">' + slots.map(s =>
      '<button class="tbtn alt" data-load="' + s.i + '">' + (s.i === 0 ? 'Autoguardado' : 'Slot ' + s.i) + ' — Cap. ' + s.d.chapter + ' · Nv ' + s.d.lvl + '</button>').join('') + '</div>' : '') +
    '<div class="tfoot">WASD/flechas · E interactuar · M menú</div></div>';
  $('tnew').onclick = () => { Audio_.init(); Audio_.sfx('confirm'); newGame(); };
  t.querySelectorAll('[data-load]').forEach(b => b.onclick = () => { Audio_.init(); Audio_.sfx('confirm'); loadGame(+b.dataset.load); });
  renderHUD();
}

/* ---------- 27. INPUT GLOBAL ---------- */
function onKeyPress(k) {
  if (G.scene === 'dialog') {
    if (k === ' ' || k === 'Enter' || k === 'e' || k === 'E') {
      const d = G.dialog;
      if (d && d.typing) { clearInterval(d.typing); d.typing = null; d.el.textContent = d.full; return; }
      advanceDialog();
    }
    return;
  }
  if (G.scene === 'menu' || G.scene === 'shop') { if (k === 'Escape' || k === 'm' || k === 'M') { $('menu').style.display = 'none'; G.scene = 'world'; renderHUD(); } return; }
  if (G.scene === 'world') {
    if (k === 'e' || k === 'E' || k === ' ' || k === 'Enter') { Audio_.init(); interact(); }
    if (k === 'm' || k === 'M' || k === 'Escape') { Audio_.init(); openMenu(); }
  }
}

/* ---------- 28. BUCLE PRINCIPAL ---------- */
let last = 0;
function loop(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
  last = ts; tGlobal += dt;
  if (G.scene !== 'title' && G.scene !== 'ending') {
    if (G.scene === 'battle' && B) drawBattle(dt);
    else if (World.grid) { updateWorld(dt); drawWorld(dt); }
  } else { CX.fillStyle = '#0b0c14'; CX.fillRect(0, 0, VW, VH); }
  // fade
  if (fadeDir) {
    fadeA += fadeDir * dt * 3.2;
    if (fadeA >= 1) { fadeA = 1; if (fadeCb) { fadeCb(); fadeCb = null; } fadeDir = -1; }
    if (fadeA <= 0) { fadeA = 0; fadeDir = 0; }
  }
  if (fadeA > 0) { CX.fillStyle = 'rgba(0,0,0,' + fadeA + ')'; CX.fillRect(0, 0, VW, VH); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) $('toast').classList.remove('show'); }
  if (G.scene === 'world') G.playtime += dt;
  requestAnimationFrame(loop);
}

/* ---------- 29. CONTROLES TÁCTILES ---------- */
function initTouch() {
  const pad = $('touchpad');
  if (!pad) return;
  let base = null;
  const set = (e) => {
    const t = e.touches[0]; if (!t) return;
    if (!base) base = { x: t.clientX, y: t.clientY };
    const dx = (t.clientX - base.x) / 40, dy = (t.clientY - base.y) / 40;
    Touch.x = clamp(dx, -1, 1); Touch.y = clamp(dy, -1, 1); Touch.active = true;
  };
  pad.addEventListener('touchstart', e => { e.preventDefault(); base = null; set(e); }, { passive: false });
  pad.addEventListener('touchmove', e => { e.preventDefault(); set(e); }, { passive: false });
  pad.addEventListener('touchend', e => { e.preventDefault(); Touch.active = false; Touch.x = Touch.y = 0; base = null; }, { passive: false });
  $('btnA').addEventListener('touchstart', e => { e.preventDefault(); Audio_.init(); if (G.scene === 'dialog') onKeyPress(' '); else interact(); }, { passive: false });
  $('btnB').addEventListener('touchstart', e => { e.preventDefault(); Audio_.init(); if (G.scene === 'world') openMenu(); else if (G.scene === 'menu' || G.scene === 'shop') { $('menu').style.display = 'none'; G.scene = 'world'; } }, { passive: false });
}

/* ---------- 30. ARRANQUE ---------- */
window.addEventListener('load', () => {
  initCanvas();
  initTouch();
  $('dialog').addEventListener('click', () => { if (G.scene === 'dialog') onKeyPress(' '); });
  showTitle();
  requestAnimationFrame(loop);
});
