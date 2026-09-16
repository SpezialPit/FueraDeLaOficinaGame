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
