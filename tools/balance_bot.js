/* Icebound Balancing-Testbot
   ---------------------------------------------------------------------------
   Spielt Missionen selbstaendig durch, um Balance-Zahlen zu pruefen.
   Voraussetzung: Spiel mit ?balance-probe laden (siehe Docs/BALANCING.md).
   Einsatz: kompletten Inhalt in die Browser-Konsole einfuegen, dann z. B.

     __run('nivalis', 2, {tune:1, airCount:1})
     __dump('Titel', 'Untertitel', 'Notiz')      // Rohdaten fuer die Karte

   Spielweise (bewusst "ordentlich, aber nicht perfekt" - ein Mensch soll die
   letzten 20 % durch spezialisierte Turmwahl und -position herausholen):
     1. Vier Tuerme als Grundverteidigung.
     2. Danach Riegel bauen: eine Spalte komplett sperren, Luecke abwechselnd
        oben/unten -> Maeanderroute. Vorher wird per eigener Wegfindung geprueft,
        ob die Gegner den Umweg wirklich nehmen; bringt der Riegel nichts, wird
        er verworfen.
     3. Tuerme sind das bevorzugte Sperrbauteil - sie blockieren wie eine Mauer
        und schiessen dabei. Mauern nur fuer Restluecken.
     4. Das unmittelbare Basisumfeld bleibt frei (dort baut man nur reaktiv).
     5. Railguns werden vor Geraden bevorzugt (Durchschuss trifft mehrere),
        Luftabwehr auf die Direktlinien Spawn -> Basis verteilt.
   =========================================================================== */
(() => {
  const P = window.ICEBOUND_PROBE;
  if (!P) { console.error('ICEBOUND_PROBE fehlt — Seite mit ?balance-probe laden'); return; }
  const COLS = 20, ROWS = 13, CELL = 50;
  const RANGE = {rail:275, drone:225, rocket:290, mortar:310, laser:190, cryo:205, gatling:165, disruptor:260};
  const MINR = {mortar:156};
  const sum = a => a.reduce((x, y) => x + y, 0);

  const S = {
    /* Routenfelder mit Mehrfachnutzung und Geraden-Erkennung. */
    cellsFrom(paths) {
      const m = new Map();
      for (const p of paths) for (let i = 0; i < p.length; i++) {
        const c = p[i], k = c.x + ',' + c.y;
        let straight = false;
        if (i > 0 && i < p.length - 1) {
          const dx = p[i].x - p[i-1].x, dy = p[i].y - p[i-1].y;
          let run = 1, j = i, b = i;
          while (j+1 < p.length && p[j+1].x - p[j].x === dx && p[j+1].y - p[j].y === dy) { run++; j++; }
          while (b-1 >= 0 && p[b].x - p[b-1].x === dx && p[b].y - p[b-1].y === dy) { run++; b--; }
          straight = run >= 4;
        }
        const e = m.get(k) || {x:c.x, y:c.y, n:0, straight:false};
        e.n++; e.straight = e.straight || straight; m.set(k, e);
      }
      return [...m.values()];
    },
    routeCells() { return this.cellsFrom(P.allPaths()); },
    /* Deckung eines Bauplatzes anhand der ECHTEN Reichweite. */
    coverage(t, gx, gy, cells) {
      const cx = (gx+.5)*CELL, cy = (gy+.5)*CELL, r2 = RANGE[t]**2, mn2 = (MINR[t]||0)**2;
      let n = 0;
      for (const c of cells) {
        const dx = (c.x+.5)*CELL - cx, dy = (c.y+.5)*CELL - cy, d2 = dx*dx + dy*dy;
        if (d2 > r2 || d2 < mn2) continue;
        n += c.n * (t === 'rail' && c.straight ? 2.5 : 1);
      }
      return n;
    },
    /* Eigene Wegfindung (4er-Nachbarschaft wie im Spiel), damit ein Riegel VOR
       dem Bauen durchgerechnet werden kann. */
    blocked(extra = []) {
      const s = new Set();
      for (const o of P.obstacles()) s.add(o.x + ',' + o.y);
      for (const t of P.snapshot().towers) if (t.x != null) s.add(t.x + ',' + t.y);
      for (const c of extra) s.add(c.x + ',' + c.y);
      return s;
    },
    bfsPath(a, b, blk) {
      if (blk.has(a.x + ',' + a.y)) return null;
      const prev = new Map(), q = [[a.x, a.y]], seen = new Set([a.x + ',' + a.y]);
      while (q.length) {
        const [x, y] = q.shift();
        if (x === b.x && y === b.y) {
          const out = []; let k = x + ',' + y;
          while (k) { const [cx, cy] = k.split(',').map(Number); out.unshift({x:cx, y:cy}); k = prev.get(k); }
          return out;
        }
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const nx = x+dx, ny = y+dy, k = nx + ',' + ny;
          if (nx<0 || ny<0 || nx>=COLS || ny>=ROWS || seen.has(k)) continue;
          if (blk.has(k) && !(nx === b.x && ny === b.y)) continue;
          seen.add(k); prev.set(k, x + ',' + y); q.push([nx, ny]);
        }
      }
      return null;
    },
    hypoPaths(extra = []) {
      const map = P.map(), blk = this.blocked(extra), out = [];
      for (const sp of map.spawns) { const p = this.bfsPath(sp, map.base, blk); if (!p) return null; out.push(p); }
      return out;
    },
    totalRoute(extra = []) { const ps = this.hypoPaths(extra); return ps ? sum(ps.map(p => p.length)) : 0; },
    /* Alle Riegel-Varianten (Spalte x Lueckenseite) bewerten. Nur solche
       behalten, die die Route wirklich verlaengern. */
    rankBarriers(minGain) {
      const base = this.totalRoute(), out = [];
      for (let col = 2; col <= COLS-4; col++) for (const gapTop of [true, false]) {
        const gapRows = gapTop ? [0,1] : [ROWS-2, ROWS-1], cells = [];
        for (let y = 0; y < ROWS; y++) { if (gapRows.includes(y)) continue; cells.push({x:col, y}); }
        const free = cells.filter(c => P.canBuild(c.x, c.y));
        if (!free.length) continue;
        const after = this.totalRoute(free);
        out.push({col, gapTop, cells:free, gain: after ? after - base : -999});
      }
      return out.filter(b => b.gain >= minGain).sort((a, b) => (b.gain/b.cells.length) - (a.gain/a.cells.length));
    },
    /* Luftgegner fliegen direkt Spawn -> Basis. Abwehr auf diese Linien legen. */
    airSpots(count, ok) {
      const map = P.map(), lines = [];
      for (const sp of map.spawns) {
        const st = Math.max(Math.abs(map.base.x - sp.x), Math.abs(map.base.y - sp.y));
        for (let i = 1; i <= st; i++) lines.push({
          x: Math.round(sp.x + (map.base.x - sp.x)*i/st),
          y: Math.round(sp.y + (map.base.y - sp.y)*i/st), n:1, straight:false});
      }
      const out = [], av = [];
      for (let i = 0; i < count; i++) {
        let best = null;
        for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
          if (!P.canBuild(x, y) || !ok(x, y)) continue;
          if (av.some(a => Math.hypot(a.x-x, a.y-y) < 4)) continue;
          const s = this.coverage('rocket', x, y, lines);
          if (s <= 0) continue;
          if (!best || s > best.s) best = {x, y, s};
        }
        if (!best) break;
        out.push(best); av.push(best);
      }
      return out;
    }
  };

  window.__S = S;

  window.__play = function (opts) {
    const ground = opts.ground || ['rail','mortar','gatling','disruptor','cryo','rail','gatling','mortar','rail','cryo','disruptor','gatling'];
    const airCount = opts.airCount ?? 0, useMaze = opts.mode !== 'nomaze', minGain = opts.minGain ?? 4;
    const baseR = opts.baseZone ?? 4, maxBarriers = opts.maxBarriers ?? 4;
    let gAt = 0, lastWave = -1, towers = 0, walls = 0, air = 0, breached = false, barrierTowers = 0, spent = 0;
    const log = [], notes = [], startRoutes = P.routeLengths(), map = P.map();
    /* Basisumfeld bleibt frei, bis es einen Durchbruch gab. */
    const ok = (x, y) => breached || Math.hypot(x - map.base.x, y - map.base.y) > baseR;
    /* Abgelehnte Plaetze merken (sie wuerden eine Angriffslinie sperren) und den
       naechstbesten nehmen, statt die Bauschleife abzubrechen. */
    const bad = new Set();
    const spotFor = (t, cells) => {
      let best = null;
      for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
        if (!P.canBuild(x, y) || !ok(x, y) || bad.has(x + ',' + y)) continue;
        const s = S.coverage(t, x, y, cells);
        if (s <= 0) continue;
        if (!best || s > best.s) best = {x, y, s};
      }
      return best;
    };
    const addTowers = (max) => {
      let n = 0, guard = 0, cells = S.routeCells();
      while (n < max && guard++ < 40) {
        let t = ground[gAt % ground.length];
        if (P.cost(t) > P.credits()) {
          const aff = ground.filter(z => P.cost(z) <= P.credits());
          if (!aff.length) break;
          t = aff.sort((a, b) => P.cost(a) - P.cost(b))[0];
        }
        const sp = spotFor(t, cells);
        if (!sp) break;
        if (!P.plan(t, sp.x, sp.y)) { bad.add(sp.x + ',' + sp.y); continue; }
        gAt++; towers++; n++; cells = S.routeCells();
      }
      return n;
    };
    const addAir = () => {
      let n = 0;
      for (const s of S.airSpots(airCount, ok)) {
        if (air >= airCount) break;
        const t = air % 2 === 0 ? 'rocket' : 'laser';
        if (P.cost(t) > P.credits()) break;
        if (P.plan(t, s.x, s.y)) { air++; n++; }
      }
      return n;
    };
    const reserve = opts.barrierReserve ?? 300;
    const barrierNeed = () => {
      if (!useMaze) return 0;
      const b = S.rankBarriers(minGain).find(r => r.cells.every(c => ok(c.x, c.y)));
      return b ? b.cells.length * P.cost('wall') + reserve : 0;
    };
    const buildBarrier = () => {
      const b = S.rankBarriers(minGain).find(r => r.cells.every(c => ok(c.x, c.y)));
      if (!b) return 0;
      const wc = P.cost('wall');
      if (b.cells.length * wc > P.credits()) return 0;
      const hypo = S.hypoPaths(b.cells);
      if (!hypo) return 0;
      /* Deckung gegen die NEUE Route bewerten, nicht gegen die alte. */
      const newCells = S.cellsFrom(hypo);
      const scored = b.cells.map(c => {
        let bt = null;
        for (const t of ground) { const cov = S.coverage(t, c.x, c.y, newCells); if (!bt || cov > bt.cov) bt = {t, cov}; }
        return {c, ...bt};
      }).sort((a, z) => z.cov - a.cov);
      let budget = P.credits() - b.cells.length * wc;
      const asTower = new Map();
      for (const s of scored) {
        if (s.cov < (opts.towerInBarrier ?? 2)) continue;
        const extra = P.cost(s.t) - wc;
        if (extra > budget) continue;
        budget -= extra; asTower.set(s.c.x + ',' + s.c.y, s.t);
      }
      let n = 0;
      for (const c of b.cells) {
        const t = asTower.get(c.x + ',' + c.y) || 'wall';
        if (P.cost(t) > P.credits()) { if (P.plan('wall', c.x, c.y)) { walls++; n++; } continue; }
        if (!P.plan(t, c.x, c.y)) continue;
        if (t === 'wall') walls++; else { towers++; barrierTowers++; }
        n++;
      }
      notes.push({riegel:b.col, luecke: b.gapTop ? 'oben' : 'unten', gewinn:b.gain, felder:n, tuerme:asTower.size});
      return n;
    };
    const build = () => {
      const s = P.snapshot();
      if (s.over || !P.enterBuild()) return;
      const c0 = s.credits;
      const done = () => { P.commit(); spent += c0 - P.snapshot().credits; };
      if (s.breaches > 0) breached = true;
      const open = opts.openingTowers ?? 4;
      if (towers < open) { addTowers(open - towers); done(); return; }
      const need = barrierNeed();
      /* Fuer einen lohnenden Riegel sparen - aber nicht, wenn schon Schaden
         eintritt oder das Labyrinth steht. */
      if (need > 0 && need <= 1800 && notes.length < maxBarriers && s.integrity >= 100
          && towers >= (opts.saveAfter ?? 8) && P.credits() < need) { done(); return; }
      if (useMaze && notes.length < maxBarriers) buildBarrier();
      if (air < airCount) addAir();
      addTowers(99);
      done();
    };
    build();
    let elapsed = 0;
    while (elapsed < 3200) {
      const s = P.snapshot();
      if (s.over) break;
      if (s.credits >= 130) build();
      P.run(1.0);
      elapsed++;
      const t = P.snapshot();
      if (t.wave !== lastWave) {
        lastWave = t.wave;
        log.push({w:t.wave, hp:Math.round(t.integrity), tw:t.towers.filter(x => x.type !== 'wall').length,
                  wl:t.towers.filter(x => x.type === 'wall').length, k:t.kills, br:t.breaches, r:t.paths.join('/')});
      }
    }
    const s = P.snapshot(), byType = {};
    for (const t of s.towers) byType[t.type] = (byType[t.type] || 0) + 1;
    return {result:s.result, wave: s.wave + '/' + s.maxWaves, hp:Math.round(s.integrity),
            kills:s.kills, breaches:s.breaches, spent, eLeft:s.credits, xp:s.xp,
            towers:byType, barrierTowers, notes,
            routes: startRoutes.join('/') + ' -> ' + s.paths.join('/'),
            maze: +(sum(s.paths) / sum(startRoutes)).toFixed(2), log};
  };

  /* Mission starten und durchspielen. tune setzt ALLE Waffen auf diese Stufe. */
  window.__run = function (planet, missionIndex, opts = {}) {
    document.querySelector(`[data-planet="${planet}"]`).click();
    document.querySelector(`[data-mission="${missionIndex}"]`).click();
    document.querySelector('#startBtn').click();
    P.setSpeed(1);
    P.tuneAll(opts.tune ?? 0);
    return window.__play(opts);
  };

  /* Rohdaten fuer tools/balance_map_svg.py */
  window.__dump = function (title, sub, note) {
    const s = P.snapshot(), m = P.map();
    return JSON.stringify({title, sub, note,
      base:[m.base.x, m.base.y], spawns:m.spawns.map(p => [p.x, p.y]),
      obstacles: P.obstacles().map(o => o.x + ',' + o.y),
      towers: s.towers.map(t => ({t:t.type, x:t.x, y:t.y, kills:t.kills, dmg:t.dmg})),
      paths: P.allPaths().map(p => p.map(c => c.x + ',' + c.y).join(';'))});
  };

  console.log('Balancing-Bot bereit. Beispiel: __run("nivalis", 2, {tune:1, airCount:1})');
})();
