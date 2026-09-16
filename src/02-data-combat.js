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
