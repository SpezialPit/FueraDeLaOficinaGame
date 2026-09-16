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
