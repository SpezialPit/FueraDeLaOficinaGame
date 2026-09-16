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
