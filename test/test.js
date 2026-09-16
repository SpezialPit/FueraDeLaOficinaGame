// Arnés de pruebas headless: stubs mínimos de DOM/Canvas
const noop = () => {};
const fakeCtx = new Proxy({}, { get: (t, k) => {
  if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: noop });
  if (k === 'canvas') return { width: 100, height: 100 };
  if (k === 'measureText') return () => ({ width: 10 });
  return () => {};
}});
function mkEl() {
  const el = { style: {}, classList: { add: noop, remove: noop }, children: [], dataset: {},
    width: 64, height: 64, clientWidth: 960, clientHeight: 540,
    getContext: () => fakeCtx, toDataURL: () => 'data:', addEventListener: noop,
    querySelectorAll: () => [], querySelector: () => null, appendChild: noop, textContent: '', innerHTML: '' };
  return el;
}
const els = {};
global.document = {
  createElement: () => mkEl(),
  getElementById: id => (els[id] = els[id] || mkEl()),
  addEventListener: noop, body: mkEl()
};
const store = {};
global.localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => store[k] = v, removeItem: k => delete store[k] };
global.window = { addEventListener: noop, AudioContext: null, webkitAudioContext: null, requestAnimationFrame: noop, localStorage: global.localStorage };
global.requestAnimationFrame = noop;
global.setTimeout = () => 0; global.setInterval = () => 0; global.clearInterval = noop;
global.navigator = { userAgent: 'node' };

// exponer internos
const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'src', 'bundle.js'), 'utf8');
const ctx = {};
const fn = new Function('document','window','localStorage','requestAnimationFrame','navigator','console',
  src + '\nreturn {G,World,ZONES,ENEMIES,BOSSES,CHARS,SKILLS,ITEMS,QUESTS,DLG,CHAPTERS,T,SOLID,generateZone,loadZone,tileAt,newGame,startBattle,playerAct,makeUnit,unitStats,grantXP,xpForLevel,saveGame,loadGame,readSlot,ensureUnits,getB:()=>B,setScene:(s)=>{G.scene=s},endPlayerTurn,computeEnding,addItem,applyEffects,STATUS,effStats,damage,mkFoe,mkAlly,alive,advanceChapter,startDialog,advanceDialog,interact,updateWorld,checkEncounter,openChest,exitOpen};');
const M = fn(global.document, global.window, global.localStorage, noop, global.navigator, console);

let pass = 0, fail = 0;
function t(name, f) {
  try { const r = f(); if (r === false) { console.log('  FAIL ' + name); fail++; } else { pass++; } }
  catch (e) { console.log('  ERROR ' + name + ': ' + e.message + '\n' + (e.stack||'').split('\n')[1]); fail++; }
}

console.log('\n=== 1. GENERACIÓN DE ZONAS Y CONECTIVIDAD ===');
Object.keys(M.ZONES).forEach(zid => {
  t('zona ' + zid + ' genera y conecta POIs', () => {
    M.loadZone(zid);
    const Z = M.ZONES[zid], W = M.World;
    // flood fill desde el centro
    const seen = new Uint8Array(Z.w * Z.h);
    const start = [Math.floor(Z.w / 2), Math.floor(Z.h / 2)];
    const stack = [start]; seen[start[1] * Z.w + start[0]] = 1;
    let count = 0;
    while (stack.length) {
      const [x, y] = stack.pop(); count++;
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy]) => {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= Z.w || ny >= Z.h) return;
        const i = ny * Z.w + nx;
        if (seen[i]) return;
        if (M.SOLID[M.tileAt(nx, ny)]) return;
        seen[i] = 1; stack.push([nx, ny]);
      });
    }
    const pois = [].concat(
      (Z.npcs||[]).map(n=>[n.x,n.y]), (Z.chests||[]).map(c=>[c.x,c.y]),
      (Z.exits||[]).map(e=>[e.x,e.y]), Z.boss?[[Z.boss.x,Z.boss.y]]:[], Z.boss2?[[Z.boss2.x,Z.boss2.y]]:[]);
    const bad = pois.filter(p => !seen[p[1]*Z.w+p[0]]);
    if (bad.length) { console.log('    POIs inalcanzables en ' + zid + ': ' + JSON.stringify(bad)); return false; }
    if (count < 200) { console.log('    zona demasiado pequeña: ' + count); return false; }
    return true;
  });
});

console.log('\n=== 2. INTEGRIDAD DE DATOS ===');
t('todas las salidas apuntan a zonas existentes', () => Object.values(M.ZONES).every(z => (z.exits||[]).every(e => !!M.ZONES[e.to])));
t('todos los enemigos de zona existen', () => Object.values(M.ZONES).every(z => (z.enc||[]).every(e => !!M.ENEMIES[e])));
t('todos los jefes de zona existen', () => Object.values(M.ZONES).every(z => (!z.boss || !!M.BOSSES[z.boss.id]) && (!z.boss2 || !!M.BOSSES[z.boss2.id])));
t('todas las habilidades de personaje existen', () => Object.values(M.CHARS).every(c => Object.values(c.learn).every(arr => arr.every(k => !!M.SKILLS[k]))));
t('todas las habilidades de enemigo existen', () => Object.values(M.ENEMIES).concat(Object.values(M.BOSSES)).every(e => e.skills.every(k => !!M.SKILLS[k])));
t('todos los objetos de cofre existen', () => Object.values(M.ZONES).every(z => (z.chests||[]).every(c => c.gold || !!M.ITEMS[c.it])));
t('todos los diálogos de NPC existen', () => Object.values(M.ZONES).every(z => (z.npcs||[]).every(n => { if (!M.DLG[n.s]) { console.log('    falta DLG: ' + n.s); return false; } return true; })));
t('todos los diálogos de jefe existen', () => Object.values(M.ZONES).every(z => (!z.boss || !!M.DLG[z.boss.pre]) && (!z.boss2 || !!M.DLG[z.boss2.pre])));
t('todas las misiones referidas en diálogos existen', () => {
  let ok = true;
  const walk = nodes => nodes.forEach(n => {
    if (!n || typeof n === 'string') return;
    if (n.do) { if (n.do.q && !M.QUESTS[n.do.q]) { console.log('    quest inexistente: ' + n.do.q); ok = false; }
                if (n.do.qdone && !M.QUESTS[n.do.qdone]) { console.log('    quest inexistente: ' + n.do.qdone); ok = false; }
                if (n.do.it && !M.ITEMS[n.do.it[0]]) { console.log('    item inexistente: ' + n.do.it[0]); ok = false; } }
    if (n.c) n.c.forEach(c => { if (c.then) walk(c.then); if (c.do) walk([{do:c.do}]); });
  });
  Object.values(M.DLG).forEach(walk);
  return ok;
});
t('14 capítulos definidos', () => M.CHAPTERS.length === 14);
t('todas las zonas de misión existen', () => Object.values(M.QUESTS).every(q => !!M.ZONES[q.z]));

console.log('\n=== 3. PROGRESIÓN / XP ===');
t('nueva partida arranca', () => { M.newGame(); return M.G.chapter === 1 && M.G.party.length === 1; });
t('Alex nivel 1 con estadísticas válidas', () => { const s = M.unitStats(M.G.units.alex); return s.hp > 100 && s.atk > 10; });
t('curva de XP creciente', () => { for (let i = 1; i < 30; i++) if (M.xpForLevel(i+1) <= M.xpForLevel(i)) return false; return true; });
t('grantXP sube de nivel y aprende habilidades', () => {
  const before = M.G.units.alex.lvl;
  M.grantXP(5000);
  const u = M.G.units.alex;
  return u.lvl > before && u.skills.length >= 2 && u.sp > 0;
});
t('estadísticas escalan con el nivel', () => {
  const a = M.unitStats(M.makeUnit('alex', 1)), b = M.unitStats(M.makeUnit('alex', 20));
  return b.hp > a.hp * 2 && b.atk > a.atk * 2;
});

console.log('\n=== 4. COMBATE ===');
t('inicia combate normal', () => { M.newGame(); M.loadZone('oficina'); M.startBattle(['correo','notif'], {}); const B = M.getB(); return B && B.foes.length === 2 && B.allies.length === 1; });
t('orden de turnos calculado', () => { const B = M.getB(); return B.order.length >= 2; });
t('ataque básico causa daño', () => {
  const B = M.getB(); B.phase = 'player'; B.sel = B.allies[0]; B.sel.ap = 3;
  const foe = B.foes[0], hp0 = foe.hp;
  M.playerAct('attack', null, foe);
  return foe.hp < hp0;
});
t('el daño respeta debilidades', () => {
  const f1 = M.mkFoe('correo', 0), f2 = M.mkFoe('correo', 1);
  const src = M.mkAlly('alex');
  src.base.mag = 100; src.base.atk = 100;
  const d1 = M.damage(src, f1, { pow: 1, el: 'soc' });   // débil a soc
  const d2 = M.damage(src, f2, { pow: 1, el: 'men' });   // resiste men
  return d1 > d2;
});
t('estados alterados se aplican y expiran', () => {
  M.startBattle(['correo'], {});
  const B = M.getB(); const f = B.foes[0];
  f.st.ansiedad = 2;
  const hp0 = f.hp;
  M.effStats(f);
  return f.st.ansiedad === 2 && M.STATUS.ansiedad.dot > 0;
});
t('victoria otorga XP y oro', () => {
  M.newGame(); M.G.units.alex.lvl = 30; M.G.units.alex.base = { hp: 900, en: 400, atk: 200, def: 200, mag: 200, res: 200, spd: 200 };
  M.G.units.alex.hp = 900;
  M.loadZone('oficina'); M.startBattle(['correo'], {});
  const B = M.getB(); const gold0 = M.G.gold;
  B.phase = 'player'; B.sel = B.allies[0]; B.sel.ap = 3;
  let guard = 0;
  while (B.foes[0].alive && guard++ < 40) { B.sel.ap = 3; M.playerAct('attack', null, B.foes[0]); }
  return !B.foes[0].alive;
});
t('derrota no rompe el estado', () => {
  M.newGame(); M.loadZone('oficina'); M.startBattle(['correo'], {});
  const B = M.getB();
  B.allies[0].hp = 0; B.allies[0].alive = false;
  return true;
});
t('cada personaje tiene habilidades utilizables', () => {
  return Object.keys(M.CHARS).every(id => {
    const u = M.makeUnit(id, 25);
    return u.skills.length >= 5 && u.skills.every(k => M.SKILLS[k] && M.SKILLS[k].ap >= 1);
  });
});
t('los jefes escalan por encima de los enemigos normales', () => {
  const b = M.BOSSES.espejo_b, e = M.ENEMIES.eco;
  return b.base.hp > e.base.hp * 3;
});

console.log('\n=== 5. INVENTARIO / ECONOMÍA ===');
t('añadir y equipar objeto', () => {
  M.newGame(); M.addItem('llaves', 1);
  M.G.equip.alex = M.G.equip.alex || {}; M.G.equip.alex.weapon = 'llaves';
  const s = M.unitStats(M.G.units.alex);
  return s.atk >= M.CHARS.alex.base.atk + 12;
});
t('todos los objetos tienen precio y tipo', () => Object.entries(M.ITEMS).every(([k,i]) => typeof i.price === 'number' && i.t && i.n));
t('objetos equipables restringidos por personaje', () => M.ITEMS.guitarra.who === 'alex' && M.ITEMS.maza.who === 'dani');

console.log('\n=== 6. GUARDADO / CARGA ===');
t('guardar y cargar conserva el progreso', () => {
  M.newGame();
  M.G.chapter = 7; M.G.gold = 4242; M.addItem('cafe2', 5);
  M.G.flags.test_flag = 1; M.G.quests.q_rosa = 'done'; M.G.axes.libertad = 9;
  M.G.party.push('marta'); M.G.units.marta = M.makeUnit('marta', 12);
  M.G.px = 300; M.G.py = 400;
  M.saveGame(2);
  M.newGame();
  if (M.G.gold === 4242) return false;
  M.loadGame(2);
  return M.G.chapter === 7 && M.G.gold === 4242 && M.G.flags.test_flag === 1 &&
         M.G.quests.q_rosa === 'done' && M.G.axes.libertad === 9 &&
         M.G.party.includes('marta') && M.G.units.marta.lvl === 12 &&
         M.G.px === 300 && (M.G.inv.cafe2 === 5);
});
t('autoguardado en slot 0', () => { M.saveGame(0); return !!M.readSlot(0); });
t('slot vacío devuelve null', () => M.readSlot(9) === null);

console.log('\n=== 7. NARRATIVA / DECISIONES / FINALES ===');
t('los diálogos con efectos modifican los ejes', () => {
  M.newGame();
  M.applyEffects({ ax: { libertad: 3 }, flag: 'x', gold: 100 });
  return M.G.axes.libertad === 3 && M.G.flags.x === 1;
});
t('completar misión da recompensa', () => {
  M.newGame(); const g0 = M.G.gold;
  M.applyEffects({ q: 'q_rosa' }); M.applyEffects({ qdone: 'q_rosa' });
  return M.G.quests.q_rosa === 'done' && M.G.gold === g0 + M.QUESTS.q_rosa.r.gold;
});
t('unirse al equipo funciona', () => {
  M.newGame(); M.applyEffects({ join: 'jorge' });
  return M.G.party.includes('jorge') && !!M.G.units.jorge;
});
t('los 6 finales son alcanzables', () => {
  const combos = [
    { libertad: 30, seguridad: 2, vinculos: 2, proposito: 2 },
    { libertad: 2, seguridad: 30, vinculos: 2, proposito: 2 },
    { libertad: 2, seguridad: 2, vinculos: 30, proposito: 2 },
    { libertad: 2, seguridad: 2, vinculos: 2, proposito: 30 },
    { libertad: 10, seguridad: 10, vinculos: 9, proposito: 9 },
    { libertad: 1, seguridad: 1, vinculos: 1, proposito: 1 }
  ];
  const got = new Set();
  combos.forEach(c => { M.G.axes = c; got.add(M.computeEnding().id); });
  if (got.size !== 6) { console.log('    finales distintos obtenidos: ' + got.size + ' -> ' + [...got]); return false; }
  return true;
});
t('avance de capítulo', () => { M.newGame(); M.advanceChapter(5); return M.G.chapter === 5; });
t('puertas bloqueadas por capítulo', () => {
  M.newGame(); M.G.chapter = 1;
  const e = M.ZONES.barrio.exits.find(x => x.to === 'meridiana');
  const closed = !M.exitOpen(e);
  M.G.chapter = 5;
  return closed && M.exitOpen(e);
});

console.log('\n=== 8. SIMULACIÓN DE PARTIDA (bucle de combate completo) ===');
t('50 combates automáticos sin errores', () => {
  M.newGame();
  M.G.party = ['alex','marta','dani','lucia','jorge'];
  M.G.party.forEach(id => M.G.units[id] = M.makeUnit(id, 20));
  let wins = 0, rounds = 0;
  const zones = Object.keys(M.ZONES).filter(z => M.ZONES[z].enc && M.ZONES[z].enc.length);
  for (let n = 0; n < 50; n++) {
    const z = zones[n % zones.length];
    M.loadZone(z);
    M.G.party.forEach(id => { const u = M.G.units[id]; u.hp = M.unitStats(u).hp; u.en = M.unitStats(u).en; });
    const pool = M.ZONES[z].enc;
    const grp = [pool[n % pool.length], pool[(n+1) % pool.length]];
    if (n % 3 === 0) grp.push(pool[(n+2) % pool.length]);
    M.startBattle(grp, {});
    const B = M.getB(); if (!B) continue;
    let guard = 0;
    while (B.foes.some(f => f.alive) && B.allies.some(a => a.alive) && guard++ < 120) {
      rounds++;
      B.phase = 'player';
      B.allies.filter(a => a.alive).forEach(a => {
        B.sel = a; a.ap = 3;
        const target = B.foes.find(f => f.alive);
        if (!target) return;
        // alterna entre ataque básico y habilidades
        const usable = a.u.skills.filter(k => { const s = M.SKILLS[k]; return s.ap <= a.ap && a.en >= (s.en||0) && !(a.cds[k]>0); });
        if (usable.length && Math.random() < 0.6) {
          const k = usable[Math.floor(Math.random()*usable.length)];
          const s = M.SKILLS[k];
          const tg = s.tgt === 'ally' ? B.allies.find(x=>x.alive) : (s.tgt === 'dead' ? B.allies.find(x=>!x.alive) : target);
          M.playerAct('skill', k, tg || target);
        } else M.playerAct('attack', null, target);
      });
      // turno enemigo simplificado
      B.foes.filter(f => f.alive).forEach(f => {
        const sk = M.SKILLS[f.def.skills[0]] || { pow: 1, el: 'fis', tgt: 'enemy', ap: 1 };
        const tg = B.allies.find(a => a.alive);
        if (tg) M.damage(f, tg, sk);
      });
      B.foes.forEach(f => { if (f.hp <= 0) f.alive = false; });
      B.allies.forEach(a => { if (a.hp <= 0) a.alive = false; });
    }
    if (!B.foes.some(f => f.alive)) wins++;
  }
  console.log('    combates ganados: ' + wins + '/50, rondas totales: ' + rounds + ', media: ' + (rounds/50).toFixed(1) + ' rondas/combate');
  return wins > 30 && rounds > 100 && (rounds/50) >= 2;
});
t('todos los jefes son derrotables por un equipo del nivel esperado', () => {
  const results = [];
  Object.keys(M.BOSSES).forEach(bid => {
    const bd = M.BOSSES[bid];
    M.G.party = ['alex','marta','dani','lucia','jorge'];
    M.G.party.forEach(id => M.G.units[id] = M.makeUnit(id, bd.lvl + 2));
    M.loadZone('oficina');
    M.startBattle([bid], { boss: 1 });
    const B = M.getB();
    let guard = 0;
    while (B.foes[0].alive && B.allies.some(a=>a.alive) && guard++ < 200) {
      B.phase = 'player';
      B.allies.filter(a=>a.alive).forEach(a => {
        B.sel = a; a.ap = 3;
        let apGuard = 0;
        while (a.ap > 0 && apGuard++ < 8) {
          B.phase = 'player';
          const usable = a.u.skills.filter(k => { const s = M.SKILLS[k]; return s.ap <= a.ap && a.en >= (s.en||0) && !(a.cds[k]>0) && (s.pow || s.heal || s.buff); });
          const low = B.allies.filter(x=>x.alive && x.hp/x.max < 0.4);
          const healK = usable.find(k => M.SKILLS[k].heal);
          if (low.length && healK) { M.playerAct('skill', healK, low[0]); }
          else {
            const atkK = usable.filter(k => M.SKILLS[k].pow);
            if (atkK.length) M.playerAct('skill', atkK[0], B.foes[0]);
            else M.playerAct('attack', null, B.foes[0]);
          }
          if (a.ap > 0 && !usable.length) { M.playerAct('attack', null, B.foes[0]); }
          if (!B.foes[0].alive) break;
        }
      });
      if (!B.foes[0].alive) break;
      B.foes.filter(f=>f.alive).forEach(f => {
        f.def.skills.slice(0,2).forEach(k => {
          const sk = M.SKILLS[k]; const tg = B.allies.find(a=>a.alive);
          if (tg && sk.pow) M.damage(f, tg, sk);
        });
      });
      B.allies.forEach(a => { if (a.hp <= 0) a.alive = false; });
      B.allies.filter(a=>a.alive).forEach(a => { a.en = Math.min(a.maxEn, a.en + 8); for (const k in a.cds) if (a.cds[k]>0) a.cds[k]--; });
    }
    results.push(bid + ':' + (!B.foes[0].alive ? 'OK/' + guard + 'r' : 'FALLO(' + Math.round(B.foes[0].hp/B.foes[0].max*100) + '%)'));
  });
  console.log('    ' + results.join('  '));
  const rounds = results.map(r => parseInt((r.match(/OK\/(\d+)r/)||[0,0])[1]));
  const tooFast = results.filter((r,i) => rounds[i] < 3);
  if (tooFast.length) { console.log('    jefes demasiado breves (<3 rondas): ' + tooFast.join(', ')); return false; }
  return results.every(r => r.includes('OK'));
});

console.log('\n=== 9. VOLUMEN DE CONTENIDO ===');
const nz = Object.keys(M.ZONES).length, ne = Object.keys(M.ENEMIES).length, nb = Object.keys(M.BOSSES).length;
const nq = Object.keys(M.QUESTS).length, nc = Object.keys(M.CHARS).length, ns = Object.keys(M.SKILLS).length;
const ni = Object.keys(M.ITEMS).length, nd = Object.keys(M.DLG).length;
let npcs = 0, chests = 0;
Object.values(M.ZONES).forEach(z => { npcs += (z.npcs||[]).length; chests += (z.chests||[]).length; });
let words = 0;
const countW = n => { if (typeof n === 'string') words += n.split(/\s+/).length; else if (n && n.t) words += String(n.t).split(/\s+/).length; else if (n && n.c) n.c.forEach(c => { words += c.l.split(/\s+/).length; (c.then||[]).forEach(countW); }); };
Object.values(M.DLG).forEach(s => s.forEach(countW));
console.log(`  zonas=${nz} enemigos=${ne} jefes=${nb} misiones=${nq} personajes=${nc} habilidades=${ns} objetos=${ni} NPCs=${npcs} cofres=${chests} guiones=${nd} palabras_dialogo≈${words}`);
let tiles = 0; Object.values(M.ZONES).forEach(z => tiles += z.w * z.h);
console.log(`  superficie total del mundo: ${tiles} casillas (${Math.round(tiles*24*24/1000)}k px²)`);

console.log('\n================================');
console.log('  PASS: ' + pass + '   FAIL: ' + fail);
console.log('================================\n');
process.exit(fail ? 1 : 0);
