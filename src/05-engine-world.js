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
