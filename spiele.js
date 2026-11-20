/* © 2026 BlaueQualle. Alle Rechte vorbehalten.
   Kopieren, Verändern und Weitergeben dieses Codes nur mit schriftlicher Erlaubnis von BlaueQualle. */
// Alle Spiele (window.Spiele) und Werkzeuge (window.Werkzeuge: Uhr, Spielstand) in einer Datei.
// Wird nur nach dem Login ausgeliefert.

// Kein versehentliches Markieren (iPad): Spielfläche nicht auswählbar, kein Lupen-/Kopier-Menü, kein Doppeltipp-Zoom
(function () {
  if (document.getElementById("spiele-global-css")) return;
  var st = document.createElement("style");
  st.id = "spiele-global-css";
  st.textContent =
    "#game-stage{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}" +
    "#game-stage input,#game-stage textarea,#game-stage .sch-code{-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}" +
    "#game-stage button,#game-stage canvas{touch-action:manipulation}" +
    "#game-stage canvas{-webkit-touch-callout:none}";
  document.head.appendChild(st);
  document.addEventListener("contextmenu", function (e) { if (e.target && e.target.closest && e.target.closest("#game-stage canvas, #game-stage .so-board, #game-stage .board, #game-stage .g2048")) e.preventDefault(); });
})();

// ===== 2048.js =====
// © 2026 BlaueQualle. Alle Rechte vorbehalten.
// Spiel: 2048
(function () {
  "use strict";

  var N = 4;
  var saved = null;   // bleibt erhalten, wenn man den Reiter wechselt

  // ---------- Spielregeln ----------
  function emptyBoard() {
    var b = [];
    for (var i = 0; i < N * N; i++) b.push(0);
    return b;
  }

  // Schiebt eine Zeile nach links und verschmilzt gleiche Zahlen (jede Kachel nur einmal)
  function slideRow(row) {
    var nums = row.filter(function (v) { return v; });
    var out = [], merged = [], score = 0, i = 0;
    while (i < nums.length) {
      if (i + 1 < nums.length && nums[i] === nums[i + 1]) {
        out.push(nums[i] * 2);
        merged.push(out.length - 1);
        score += nums[i] * 2;
        i += 2;
      } else {
        out.push(nums[i]);
        i++;
      }
    }
    while (out.length < N) out.push(0);
    return { row: out, score: score, merged: merged };
  }

  // dir: "left" | "right" | "up" | "down"
  function move(board, dir) {
    var b = board.slice(), score = 0, moved = false, mergedAt = [], i, j;
    for (i = 0; i < N; i++) {
      var idx = [];
      for (j = 0; j < N; j++) {
        if (dir === "left") idx.push(i * N + j);
        else if (dir === "right") idx.push(i * N + (N - 1 - j));
        else if (dir === "up") idx.push(j * N + i);
        else idx.push((N - 1 - j) * N + i);
      }
      var res = slideRow(idx.map(function (k) { return b[k]; }));
      for (j = 0; j < N; j++) {
        if (b[idx[j]] !== res.row[j]) moved = true;
        b[idx[j]] = res.row[j];
      }
      res.merged.forEach(function (pos) { mergedAt.push(idx[pos]); });
      score += res.score;
    }
    return { board: b, score: score, moved: moved, merged: mergedAt };
  }

  function canMove(board) {
    for (var r = 0; r < N; r++) {
      for (var c = 0; c < N; c++) {
        var v = board[r * N + c];
        if (v === 0) return true;
        if (c < N - 1 && board[r * N + c + 1] === v) return true;
        if (r < N - 1 && board[(r + 1) * N + c] === v) return true;
      }
    }
    return false;
  }

  function addTile(board, rnd) {
    var free = [];
    for (var i = 0; i < board.length; i++) if (board[i] === 0) free.push(i);
    if (!free.length) return { board: board, pos: -1 };
    var pos = free[Math.floor(rnd() * free.length)];
    var b = board.slice();
    b[pos] = rnd() < 0.9 ? 2 : 4;
    return { board: b, pos: pos };
  }

  // ---------- Oberfläche ----------
  function start(box) {
    var board, score, won, over, best = 0;
    try { best = Number(localStorage.getItem("2048-best")) || 0; } catch (e) {}

    var grid = document.createElement("div");
    grid.className = "g2048";
    grid.setAttribute("role", "img");
    grid.setAttribute("aria-label", "Spielfeld von 2048");
    var cells = [];
    for (var i = 0; i < N * N; i++) {
      var cell = document.createElement("div");
      cell.className = "tile";
      grid.appendChild(cell);
      cells.push(cell);
    }

    var info = document.createElement("p");
    info.className = "msg";
    info.setAttribute("aria-live", "polite");

    var row = document.createElement("div");
    row.className = "row";
    var newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.textContent = "Neues Spiel";
    row.appendChild(newBtn);
    row.appendChild(info);

    var pad = document.createElement("div");
    pad.className = "dpad";
    [["pad-up", "▲", "Hoch", "up"], ["pad-left", "◀", "Links", "left"],
     ["pad-down", "▼", "Runter", "down"], ["pad-right", "▶", "Rechts", "right"]].forEach(function (d) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pad-btn " + d[0];
      b.textContent = d[1];
      b.setAttribute("aria-label", d[2]);
      b.addEventListener("click", function () { play(d[3]); });
      pad.appendChild(b);
    });

    box.appendChild(grid);
    box.appendChild(row);
    box.appendChild(pad);

    function render(newPos, mergedAt) {
      for (var i = 0; i < cells.length; i++) {
        var v = board[i], c = cells[i];
        c.className = "tile" + (i === newPos ? " neu" : "") + (mergedAt && mergedAt.indexOf(i) >= 0 ? " fusion" : "");
        c.textContent = v ? String(v) : "";
        c.style.background = "var(--line)";
        c.style.color = "var(--ink)";
        if (v) {
          var level = Math.round(Math.log(v) / Math.LN2);
          var share = Math.min(100, 10 + level * 9);
          c.style.background = "color-mix(in srgb, var(--accent) " + share + "%, var(--panel))";
          c.style.color = level >= 7 ? "var(--accent-ink)" : "var(--ink)";
          c.style.fontSize = v >= 1024 ? "0.8em" : v >= 128 ? "0.95em" : "";
        } else {
          c.style.fontSize = "";
        }
      }
      var text = "Punkte: " + score + " · Rekord: " + best;
      if (over) text += " · Game over";
      else if (won) text += " · 2048 erreicht! Du kannst weiterspielen.";
      info.textContent = text;
      saved = { board: board.slice(), score: score, won: won, over: over };
    }

    function newGame() {
      board = emptyBoard();
      score = 0;
      won = false;
      over = false;
      board = addTile(board, Math.random).board;
      board = addTile(board, Math.random).board;
      render(-1, null);
    }

    function play(dir) {
      if (over) return;
      var res = move(board, dir);
      if (!res.moved) return;
      board = res.board;
      score += res.score;
      if (score > best) {
        best = score;
        try { localStorage.setItem("2048-best", String(best)); } catch (e) {}
      }
      var added = addTile(board, Math.random);
      board = added.board;
      if (!won && board.some(function (v) { return v >= 2048; })) won = true;
      if (!canMove(board)) over = true;
      render(added.pos, res.merged);
    }

    function onKey(e) {
      if (!grid.offsetParent) return;
      var t = e.target && e.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      var map = {
        ArrowLeft: "left", a: "left", A: "left",
        ArrowRight: "right", d: "right", D: "right",
        ArrowUp: "up", w: "up", W: "up",
        ArrowDown: "down", s: "down", S: "down"
      };
      var dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      play(dir);
    }

    var sx = 0, sy = 0;
    grid.addEventListener("touchstart", function (e) {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    grid.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) play(dx > 0 ? "right" : "left");
      else play(dy > 0 ? "down" : "up");
    }, { passive: true });

    newBtn.addEventListener("click", newGame);
    document.addEventListener("keydown", onKey);
    var recolor = function () { render(-1, null); };
    document.addEventListener("farbe-geaendert", recolor);

    if (saved) {
      board = saved.board.slice();
      score = saved.score;
      won = saved.won;
      over = saved.over;
      render(-1, null);
    } else {
      newGame();
    }

    return function stop() {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("farbe-geaendert", recolor);
    };
  }

  (window.Spiele = window.Spiele || []).push({
    id: "2048",
    name: "2048",
    start: start,
    _engine: { slideRow: slideRow, move: move, canMove: canMove, addTile: addTile, emptyBoard: emptyBoard }
  });
})();

;
// ===== autorennen.js =====
// © 2026 BlaueQualle. Alle Rechte vorbehalten.
// Spiel: Autorennen (frei lenken, dem Verkehr ausweichen, Münzen, Schild und Nitro sammeln, Tag und Nacht wechseln)
(window.Spiele = window.Spiele || []).push({
  id: "autorennen",
  name: "Autorennen",
  start: function (box) {
    var W = 360, H = 540;
    var LANES = 4, ROAD_X = 40, LANE_W = 70, ROAD_W = LANES * LANE_W;
    var CAR_W = 36, CAR_H = 62;
    var PY = H - 110;
    var PHW = 13, PHH = 26;                         // Trefferfläche des Spielerautos (etwas kleiner als das Bild)
    var BEST_KEY = "rennen-best", COINS_KEY = "rennen-muenzen";
    var COLORS = ["#e0a800", "#8a949b", "#1aa38f", "#c2185b", "#f2f2f2", "#7a3fc4", "#d9651a"];
    var PHASE_LEN = 5400;                           // Meter, danach beginnt der Tag von vorn
    var PHASES = [
      { at: 0, name: "Morgen", tint: "rgba(255,196,128,0.12)", dark: 0, rain: false },
      { at: 600, name: "Tag", tint: null, dark: 0, rain: false },
      { at: 1500, name: "Abend", tint: "rgba(255,110,50,0.18)", dark: 0.12, rain: false },
      { at: 2500, name: "Nacht", tint: null, dark: 0.62, rain: false },
      { at: 3800, name: "Regen", tint: "rgba(30,50,90,0.25)", dark: 0.42, rain: true }
    ];

    var canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.className = "game-canvas";
    canvas.style.aspectRatio = W + " / " + H;
    canvas.style.maxWidth = "min(100%, 22rem, calc(76vh * " + (W / H).toFixed(3) + "))";
    canvas.style.touchAction = "none";
    canvas.tabIndex = 0;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Straße von oben. Du fährst unten und weichst dem Verkehr aus.");
    var ctx = canvas.getContext("2d");

    var night = document.createElement("canvas");
    night.width = W;
    night.height = H;
    var nctx = night.getContext("2d");

    var info = document.createElement("p");
    info.className = "msg";
    info.setAttribute("aria-live", "polite");

    var startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.textContent = "Start";
    var pauseBtn = document.createElement("button");
    pauseBtn.type = "button";
    pauseBtn.className = "link";
    pauseBtn.textContent = "Pause";
    pauseBtn.disabled = true;

    var held = { left: false, right: false, nitro: false };
    var steer = document.createElement("div");
    steer.className = "steer";
    function holdButton(label, text, key) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pad-btn";
      b.textContent = text;
      b.setAttribute("aria-label", label);
      b.style.touchAction = "none";
      function down(e) { e.preventDefault(); held[key] = true; if (key !== "nitro") wake(); }
      function up() { held[key] = false; }
      b.addEventListener("pointerdown", down);
      b.addEventListener("pointerup", up);
      b.addEventListener("pointercancel", up);
      b.addEventListener("pointerleave", up);
      b.addEventListener("keydown", function (e) { if (e.key === " " || e.key === "Enter") { e.preventDefault(); held[key] = true; } });
      b.addEventListener("keyup", function (e) { if (e.key === " " || e.key === "Enter") held[key] = false; });
      steer.appendChild(b);
      return b;
    }
    holdButton("Links lenken", "◀ Links", "left");
    holdButton("Nitro zünden", "Nitro", "nitro");
    holdButton("Rechts lenken", "Rechts ▶", "right");

    var help = document.createElement("p");
    help.className = "hint";
    help.textContent = "Lenken: Pfeiltasten oder A und D, auf dem Handy die linke oder rechte Bildhälfte gedrückt halten. Nitro: Leertaste. Pause: P. Weiche Autos, Lastern, Pylonen und Ölflecken aus. Münzen bringen Punkte, ein Schild fängt einen Unfall ab, und Nitro-Flaschen füllen den Tank. Wer knapp an Autos vorbeifährt, sammelt Bonuspunkte mit Combo. Mit Nitro bist du kurz unverwundbar und rammst alles weg.";

    box.appendChild(canvas);
    var row = document.createElement("div");
    row.className = "row";
    row.appendChild(startBtn);
    row.appendChild(pauseBtn);
    row.appendChild(info);
    box.appendChild(row);
    box.appendChild(steer);
    box.appendChild(help);

    var st = null, running = false, over = false, paused = false, raf = null, prev = 0, stopped = false, infoAt = 0;
    var best = 0, coinsTotal = 0;
    try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) {}
    try { coinsTotal = Number(localStorage.getItem(COINS_KEY)) || 0; } catch (e) {}
    var ptrDir = 0;

    function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
    function laneX(l) { return ROAD_X + l * LANE_W + LANE_W / 2; }
    function metres() { return st.dist / 12; }
    function score() { return Math.floor(st.dist / 10 + st.bonus); }
    function phaseOf(m) {
      var mm = m % PHASE_LEN, idx = 0;
      for (var i = 0; i < PHASES.length; i++) if (mm >= PHASES[i].at) idx = i;
      return idx;
    }
    function css(name, fallback) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    }
    function hash(i) {
      var x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    }

    function reset() {
      st = {
        x: laneX(1), vx: 0, v: 220, time: 0, dist: 0, bonus: 0, coins: 0, lives: 3, inv: 0, shield: false,
        nitro: 40, nitroOn: false, combo: 1, comboT: 0, slip: 0, objs: [], parts: [], texts: [],
        spawnD: 140, itemD: 400, shake: 0, phase: 0, banner: "", bannerT: 0, tilt: 0, rain: [], smashed: 0, near: 0
      };
      over = false;
    }

    // ---------- Verkehr und Gegenstände ----------
    function level() { return Math.floor(metres() / 400); }

    function isSolid(o) { return o.kind === "car" || o.kind === "truck" || o.kind === "cone"; }

    function laneBusy(l) {
      return st.objs.some(function (o) { return isSolid(o) && !o.hit && o.y < 280 && Math.abs(o.x - laneX(l)) < LANE_W / 2; });
    }

    function freeLaneCount() {
      var n = 0;
      for (var l = 0; l < LANES; l++) if (!laneBusy(l)) n++;
      return n;
    }

    function spawnObstacle() {
      var lv = level(), r = Math.random() * 100, kind = "car";
      if (lv >= 1 && r < 12) kind = "truck";
      else if (r < 30) kind = "cone";
      else if (lv >= 1 && r < 42) kind = "oil";
      var l = Math.floor(Math.random() * LANES);
      if (laneBusy(l) && freeLaneCount() <= 2) return;          // immer mindestens eine Spur frei lassen
      if (freeLaneCount() <= 1 && kind !== "oil") return;
      var o = { kind: kind, x: laneX(l), y: 0, vx: 0, sp: 0, hw: 14, hh: 26, hit: false, near: false, rot: 0, color: COLORS[Math.floor(Math.random() * COLORS.length)], lc: 0 };
      if (kind === "car") { o.sp = 60 + Math.random() * 80; o.y = -40; }
      if (kind === "truck") { o.sp = 40; o.hw = 17; o.hh = 52; o.y = -70; }
      if (kind === "cone") { o.hw = 7; o.hh = 7; o.y = -20; }
      if (kind === "oil") { o.hw = 22; o.hh = 14; o.y = -20; }
      if (lv >= 2 && kind === "car" && Math.random() < 0.2) o.lc = 0.6 + Math.random();   // wechselt später die Spur
      st.objs.push(o);
    }

    function spawnItems() {
      var l = Math.floor(Math.random() * LANES), r = Math.random();
      if (laneBusy(l)) return;
      if (r < 0.14) { st.objs.push({ kind: "shield", x: laneX(l), y: -20, sp: 0, hw: 11, hh: 11, near: true }); return; }
      if (r < 0.3) { st.objs.push({ kind: "nitro", x: laneX(l), y: -20, sp: 0, hw: 11, hh: 11, near: true }); return; }
      var n = 4 + Math.floor(Math.random() * 3), zig = Math.random() < 0.4, l2 = clamp(l + (Math.random() < 0.5 ? -1 : 1), 0, LANES - 1);
      for (var i = 0; i < n; i++) {
        var lane = zig ? (i < n / 2 ? l : l2) : l;
        st.objs.push({ kind: "coin", x: laneX(lane), y: -20 - i * 46, sp: 0, hw: 11, hh: 11, near: true, ph: i });
      }
    }

    // ---------- Partikel und Texte ----------
    function burst(x, y, color, n, spd) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, s = (0.4 + Math.random()) * spd;
        st.parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.4, t: 0, c: color, r: 1.5 + Math.random() * 2 });
      }
    }
    function floatText(text, x, y, color) { st.texts.push({ text: text, x: x, y: y, t: 0, c: color || "#ffffff" }); }

    // ---------- Ablauf ----------
    function wake() { if (!running && !over) begin(); }

    function begin() {
      cancelAnimationFrame(raf);
      reset();
      running = true;
      paused = false;
      pauseBtn.disabled = false;
      pauseBtn.textContent = "Pause";
      startBtn.textContent = "Neustart";
      prev = performance.now();
      raf = requestAnimationFrame(frame);
      updateInfo(true);
    }

    function togglePause() {
      if (!running) return;
      paused = !paused;
      pauseBtn.textContent = paused ? "Weiter" : "Pause";
      if (!paused) prev = performance.now();
      draw();
    }

    function finish() {
      running = false;
      over = true;
      pauseBtn.disabled = true;
      var s = score();
      coinsTotal += st.coins;
      try { localStorage.setItem(COINS_KEY, String(coinsTotal)); } catch (e) {}
      if (s > best) {
        best = s;
        try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
        st.newBest = true;
      }
      updateInfo(true);
      draw();
    }

    function updateInfo(force) {
      var now = performance.now();
      if (!force && now - infoAt < 400) return;
      infoAt = now;
      if (!st) return;
      var t = "Punkte: " + score() + ". Leben: " + st.lives + ". Münzen: " + st.coins + ". Rekord: " + best + ".";
      if (over) t = (st.newBest ? "Neuer Rekord! " : "Unfall! ") + t + " Münzen insgesamt: " + coinsTotal + ".";
      info.textContent = t;
    }

    function hurt(o) {
      o.hit = true;
      o.vx = (o.x >= st.x ? 1 : -1) * (90 + Math.random() * 60);
      o.rot = (Math.random() < 0.5 ? -1 : 1) * 4;
      if (st.nitroOn) {
        st.bonus += 25; st.smashed++;
        burst(o.x, o.y, o.color || "#f2a31b", 14, 160);
        floatText("+25", o.x, o.y, "#ffd23f");
        o.smash = true;
        return;
      }
      if (st.inv > 0) return;
      if (st.shield) {
        st.shield = false;
        st.inv = 1;
        st.shake = 0.2;
        burst(st.x, PY, "#5ec8ff", 18, 170);
        floatText("Schild!", st.x, PY - 40, "#5ec8ff");
        return;
      }
      st.lives--;
      st.inv = 1.8;
      st.combo = 1; st.comboT = 0;
      st.v *= 0.6;
      st.shake = 0.4;
      burst((o.x + st.x) / 2, (o.y + PY) / 2, "#ffb347", 22, 200);
      if (st.lives <= 0) finish();
    }

    function update(dt) {
      var s = st;
      s.time += dt;
      var m = metres();
      var lvl = level();

      // Phase wechseln
      var ph = phaseOf(m);
      if (ph !== s.phase) { s.phase = ph; s.banner = PHASES[ph].name; s.bannerT = 2.5; }
      if (s.bannerT > 0) s.bannerT -= dt;

      // Nitro
      var wantNitro = held.nitro || s.nitroKey;
      if (wantNitro && s.nitro > (s.nitroOn ? 0 : 12)) {
        s.nitroOn = true;
        s.nitro = Math.max(0, s.nitro - 34 * dt);
        if (s.nitro <= 0) s.nitroOn = false;
      } else { s.nitroOn = false; s.nitro = Math.min(100, s.nitro + 3 * dt); }

      // Tempo
      var base = Math.min(230 + lvl * 32, 520);
      var tv = base * (s.nitroOn ? 1.45 : 1);
      s.v += (tv - s.v) * Math.min(1, dt * (s.nitroOn ? 4 : 1.6));
      s.dist += s.v * dt;

      // Lenken mit Beschleunigung
      var dir = (held.left || ptrDir < 0 || s.leftKey ? -1 : 0) + (held.right || ptrDir > 0 || s.rightKey ? 1 : 0);
      if (s.slip > 0) {
        s.slip -= dt;
        s.vx += (Math.sin(s.time * 11) * 110 + dir * 380) * dt;     // auf Öl rutscht das Auto
        s.vx *= Math.exp(-2.2 * dt);
      } else {
        s.vx += dir * 1700 * dt;
        s.vx *= Math.exp(-(dir ? 2.2 : 9) * dt);
      }
      s.vx = clamp(s.vx, -290, 290);
      s.x += s.vx * dt;
      var minX = ROAD_X + PHW + 3, maxX = ROAD_X + ROAD_W - PHW - 3;
      if (s.x < minX) { s.x = minX; if (s.vx < -80) burst(s.x - 10, PY, "#ffd23f", 4, 80); s.vx = Math.abs(s.vx) * 0.3; }
      if (s.x > maxX) { s.x = maxX; if (s.vx > 80) burst(s.x + 10, PY, "#ffd23f", 4, 80); s.vx = -Math.abs(s.vx) * 0.3; }
      s.tilt += (clamp(s.vx / 290, -1, 1) * 0.22 - s.tilt) * Math.min(1, dt * 12);
      if (s.inv > 0) s.inv -= dt;
      if (s.shake > 0) s.shake -= dt;
      if (s.comboT > 0) { s.comboT -= dt; if (s.comboT <= 0) s.combo = 1; }

      // Neues auf der Straße
      s.spawnD -= s.v * dt;
      if (s.spawnD <= 0) {
        spawnObstacle();
        s.spawnD = Math.max(120, 270 - lvl * 14) * (0.8 + Math.random() * 0.5);
      }
      s.itemD -= s.v * dt;
      if (s.itemD <= 0) { spawnItems(); s.itemD = 650 + Math.random() * 500; }

      // Bewegen und Kollidieren
      for (var i = 0; i < s.objs.length; i++) {
        var o = s.objs[i];
        o.y += (s.v - (o.sp || 0)) * dt;
        if (o.hit) { o.x += o.vx * dt; o.rot2 = (o.rot2 || 0) + o.rot * dt; continue; }
        if (o.lc > 0 && o.y > 40) {
          o.lc -= dt;
          if (o.lc <= 0) {
            var cur = Math.round((o.x - ROAD_X - LANE_W / 2) / LANE_W), nl = clamp(cur + (Math.random() < 0.5 ? -1 : 1), 0, LANES - 1);
            o.tx = laneX(nl);
          }
        }
        if (o.tx !== undefined) {
          var step = 55 * dt;
          if (Math.abs(o.tx - o.x) <= step) { o.x = o.tx; o.tx = undefined; } else o.x += o.tx > o.x ? step : -step;
        }
        var dx = Math.abs(o.x - s.x), dy = Math.abs(o.y - PY);
        if (o.kind === "coin") {
          if (dx < 22 && dy < 26) {
            o.gone = true; s.coins++; s.bonus += 10;
            burst(o.x, o.y, "#ffd23f", 5, 90);
          }
        } else if (o.kind === "shield" || o.kind === "nitro") {
          if (dx < 24 && dy < 28) {
            o.gone = true;
            if (o.kind === "shield") { s.shield = true; floatText("Schild", o.x, o.y, "#5ec8ff"); }
            else { s.nitro = Math.min(100, s.nitro + 45); floatText("Nitro", o.x, o.y, "#ff9f1c"); }
            burst(o.x, o.y, o.kind === "shield" ? "#5ec8ff" : "#ff9f1c", 10, 120);
          }
        } else if (o.kind === "oil") {
          if (dx < o.hw + 8 && dy < o.hh + PHH - 10 && s.slip <= 0 && !s.nitroOn) { s.slip = 1.3; floatText("Öl!", s.x, PY - 40, "#bbbbbb"); }
        } else {
          if (dx < o.hw + PHW && dy < o.hh + PHH) { hurt(o); if (!running) return; }
          else if (!o.near && (o.kind === "car" || o.kind === "truck") && dy < o.hh + PHH) {
            var gap = dx - (o.hw + PHW);
            if (gap > 0 && gap <= 11) {
              o.near = true;
              s.combo = Math.min(5, s.comboT > 0 ? s.combo + 1 : 2);
              s.comboT = 4;
              s.near++;
              var pts = 15 * s.combo;
              s.bonus += pts;
              floatText("Knapp! +" + pts, s.x, PY - 50, "#7ee8a2");
            }
          }
        }
      }
      s.objs = s.objs.filter(function (o) { return !o.gone && o.y < H + 130 && o.y > -300 && o.x > -80 && o.x < W + 80; });

      // Partikel und Texte
      s.parts.forEach(function (p) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; });
      s.parts = s.parts.filter(function (p) { return p.t < p.life; });
      s.texts.forEach(function (t) { t.t += dt; t.y -= 30 * dt; });
      s.texts = s.texts.filter(function (t) { return t.t < 1.1; });
      if (s.nitroOn && Math.random() < 0.9) {
        s.parts.push({ x: s.x + (Math.random() - 0.5) * 10, y: PY + CAR_H / 2, vx: (Math.random() - 0.5) * 30, vy: 120 + Math.random() * 100, life: 0.3, t: 0, c: Math.random() < 0.5 ? "#ffb703" : "#ff5d2a", r: 3 });
      }
      if (PHASES[s.phase].rain) {
        while (s.rain.length < 60) s.rain.push({ x: Math.random() * W, y: Math.random() * H });
        s.rain.forEach(function (r) { r.y += 620 * dt; r.x -= 60 * dt; if (r.y > H) { r.y = -10; r.x = Math.random() * (W + 60); } });
      } else s.rain = [];

      updateInfo(false);
    }

    // ---------- Zeichnen ----------
    function rrect(x, y, w, h, r) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    }

    function drawCar(x, y, color, tilt, sparkle) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt || 0);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      rrect(-CAR_W / 2 + 3, -CAR_H / 2 + 5, CAR_W, CAR_H, 8); ctx.fill();
      ctx.fillStyle = "#111";
      [[-CAR_W / 2 - 3, -CAR_H / 2 + 8], [CAR_W / 2 - 3, -CAR_H / 2 + 8], [-CAR_W / 2 - 3, CAR_H / 2 - 22], [CAR_W / 2 - 3, CAR_H / 2 - 22]].forEach(function (w) { ctx.fillRect(w[0], w[1], 6, 14); });
      ctx.fillStyle = color;
      rrect(-CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H, 9); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      rrect(-CAR_W / 2 + 3, -CAR_H / 2 + 3, 8, CAR_H - 6, 4); ctx.fill();
      ctx.fillStyle = "rgba(15,25,35,0.85)";
      rrect(-CAR_W / 2 + 6, -CAR_H / 2 + 13, CAR_W - 12, 13, 3); ctx.fill();   // Frontscheibe
      rrect(-CAR_W / 2 + 6, 6, CAR_W - 12, 9, 3); ctx.fill();                  // Heckscheibe
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(-CAR_W / 2 + 6, -CAR_H / 2 + 26, CAR_W - 12, 8);              // Dach
      ctx.fillStyle = "#fff6c8";
      ctx.fillRect(-CAR_W / 2 + 3, -CAR_H / 2 + 2, 7, 4);
      ctx.fillRect(CAR_W / 2 - 10, -CAR_H / 2 + 2, 7, 4);                       // Scheinwerfer
      ctx.fillStyle = "#e5222d";
      ctx.fillRect(-CAR_W / 2 + 3, CAR_H / 2 - 5, 8, 3);
      ctx.fillRect(CAR_W / 2 - 11, CAR_H / 2 - 5, 8, 3);                        // Rücklichter
      ctx.restore();
    }

    function drawTruck(o) {
      var x = o.x, y = o.y, w = 38, h = 108;
      ctx.save();
      ctx.translate(x, y);
      if (o.hit) ctx.rotate(o.rot2 || 0);
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillRect(-w / 2 + 3, -h / 2 + 5, w, h);
      ctx.fillStyle = "#111";
      [-h / 2 + 12, 4, h / 2 - 18].forEach(function (yy) { ctx.fillRect(-w / 2 - 3, yy, 5, 14); ctx.fillRect(w / 2 - 2, yy, 5, 14); });
      ctx.fillStyle = "#e9edf0";
      rrect(-w / 2, -h / 2 + 30, w, h - 30, 4); ctx.fill();                      // Anhänger
      ctx.fillStyle = o.color;
      ctx.fillRect(-w / 2, -h / 2 + 52, w, 6);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(-2, -h / 2 + 30, 4, h - 30);
      ctx.fillStyle = o.color;
      rrect(-w / 2 + 1, -h / 2, w - 2, 30, 6); ctx.fill();                       // Fahrerhaus
      ctx.fillStyle = "rgba(15,25,35,0.85)";
      rrect(-w / 2 + 6, -h / 2 + 6, w - 12, 10, 3); ctx.fill();
      ctx.fillStyle = "#fff6c8";
      ctx.fillRect(-w / 2 + 3, -h / 2 + 1, 6, 4);
      ctx.fillRect(w / 2 - 9, -h / 2 + 1, 6, 4);
      ctx.fillStyle = "#e5222d";
      ctx.fillRect(-w / 2 + 3, h / 2 - 4, 7, 3);
      ctx.fillRect(w / 2 - 10, h / 2 - 4, 7, 3);
      ctx.restore();
    }

    function drawObj(o) {
      var t = st.time;
      if (o.kind === "car") {
        if (o.hit) { ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.rot2 || 0); drawCar(0, 0, o.color, 0); ctx.restore(); }
        else drawCar(o.x, o.y, o.color, o.tx !== undefined ? (o.tx > o.x ? 0.12 : -0.12) : 0);
      } else if (o.kind === "truck") drawTruck(o);
      else if (o.kind === "cone") {
        ctx.save();
        ctx.translate(o.x, o.y);
        if (o.hit) ctx.rotate(o.rot2 || 0);
        ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.arc(2, 3, 9, 0, 7); ctx.fill();
        ctx.fillStyle = "#ff7a1a"; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill();
        ctx.fillStyle = "#ff7a1a"; ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, 7); ctx.fill();
        ctx.restore();
      } else if (o.kind === "oil") {
        var g = ctx.createRadialGradient(o.x, o.y, 2, o.x, o.y, 24);
        g.addColorStop(0, "rgba(10,10,18,0.95)"); g.addColorStop(0.7, "rgba(30,30,50,0.85)"); g.addColorStop(1, "rgba(30,30,50,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(o.x, o.y, 26, 16, 0.3, 0, 7); ctx.fill();
        ctx.strokeStyle = "rgba(120,200,255,0.35)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(o.x - 3, o.y - 2, 12, 6, 0.3, 0, 7); ctx.stroke();
      } else if (o.kind === "coin") {
        var sx = Math.abs(Math.cos(t * 5 + (o.ph || 0)));
        ctx.fillStyle = "#c98f00"; ctx.beginPath(); ctx.ellipse(o.x, o.y + 1, 10 * Math.max(0.25, sx), 10, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.ellipse(o.x, o.y, 9 * Math.max(0.25, sx), 9, 0, 0, 7); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.beginPath(); ctx.ellipse(o.x - 2, o.y - 3, 2.5 * Math.max(0.25, sx), 3, 0, 0, 7); ctx.fill();
      } else if (o.kind === "shield") {
        ctx.fillStyle = "rgba(94,200,255,0.3)"; ctx.beginPath(); ctx.arc(o.x, o.y, 16 + Math.sin(t * 6) * 1.5, 0, 7); ctx.fill();
        ctx.fillStyle = "#5ec8ff"; ctx.beginPath();
        ctx.moveTo(o.x, o.y - 11); ctx.lineTo(o.x + 9, o.y - 7); ctx.lineTo(o.x + 7, o.y + 4); ctx.lineTo(o.x, o.y + 11); ctx.lineTo(o.x - 7, o.y + 4); ctx.lineTo(o.x - 9, o.y - 7); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillRect(o.x - 1.5, o.y - 7, 3, 12);
      } else if (o.kind === "nitro") {
        ctx.fillStyle = "rgba(255,159,28,0.3)"; ctx.beginPath(); ctx.arc(o.x, o.y, 16 + Math.sin(t * 6) * 1.5, 0, 7); ctx.fill();
        ctx.fillStyle = "#ff9f1c"; rrect(o.x - 6, o.y - 10, 12, 20, 4); ctx.fill();
        ctx.fillStyle = "#c2410c"; ctx.fillRect(o.x - 3, o.y - 13, 6, 5);
        ctx.fillStyle = "#fff"; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillText("N", o.x, o.y + 4);
      }
    }

    function scenery() {
      var world = st.dist, SP = 70, first = Math.floor((world - H - 100) / SP), last = Math.ceil(world / SP) + 2;
      for (var i = first; i <= last; i++) {
        var y = world - i * SP;
        if (y < -90 || y > H + 90) continue;
        for (var side = 0; side < 2; side++) {
          var h = hash(i * 2 + side + 7), cx = side ? ROAD_X + ROAD_W + 20 : ROAD_X - 20, jitter = (hash(i * 3 + side) - 0.5) * 14, yy = y + (hash(i + side * 13) - 0.5) * 30;
          if (h < 0.45) {                                   // Baum
            var r = 11 + hash(i + 5 * side) * 6;
            ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.beginPath(); ctx.arc(cx + jitter + 4, yy + 5, r, 0, 7); ctx.fill();
            ctx.fillStyle = "#2f7a3a"; ctx.beginPath(); ctx.arc(cx + jitter, yy, r, 0, 7); ctx.fill();
            ctx.fillStyle = "#47a152"; ctx.beginPath(); ctx.arc(cx + jitter - 3, yy - 3, r * 0.6, 0, 7); ctx.fill();
          } else if (h < 0.62) {                            // Busch
            ctx.fillStyle = "#3d8f46"; ctx.beginPath(); ctx.arc(cx + jitter, yy, 7, 0, 7); ctx.fill();
            ctx.fillStyle = "#e9a3c1"; ctx.beginPath(); ctx.arc(cx + jitter + 2, yy - 2, 2, 0, 7); ctx.fill();
          } else if (h < 0.76) {                            // Laterne
            var lx = side ? ROAD_X + ROAD_W + 6 : ROAD_X - 6;
            ctx.fillStyle = "#555"; ctx.fillRect(lx - 1.5, yy - 1.5, 3, 3);
            ctx.fillStyle = PHASES[st.phase].dark > 0.3 ? "#ffe9a6" : "#9aa";
            ctx.beginPath(); ctx.arc(lx + (side ? 6 : -6), yy, 3, 0, 7); ctx.fill();
          } else if (h < 0.86) {                            // Haus von oben
            var hx = side ? ROAD_X + ROAD_W + 8 : ROAD_X - 34;
            ctx.fillStyle = "rgba(0,0,0,0.2)"; ctx.fillRect(hx + 3, yy - 14 + 4, 26, 30);
            ctx.fillStyle = hash(i) < 0.5 ? "#b4543a" : "#6d7d8c"; ctx.fillRect(hx, yy - 14, 26, 30);
            ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(hx, yy - 14, 26, 7);
          } else if (h < 0.92) {                            // Schild
            var sx2 = side ? ROAD_X + ROAD_W + 9 : ROAD_X - 9;
            ctx.fillStyle = "#555"; ctx.fillRect(sx2 - 1, yy, 2, 8);
            ctx.fillStyle = "#2a66d9"; ctx.fillRect(sx2 - 8, yy - 8, 16, 9);
            ctx.fillStyle = "#fff"; ctx.fillRect(sx2 - 5, yy - 5, 10, 2);
          }
        }
      }
    }

    function hearts() {
      for (var i = 0; i < 3; i++) {
        var x = W - 22 - i * 24, y = 24, on = i < st.lives;
        ctx.fillStyle = on ? "#ff4d6d" : "rgba(255,255,255,0.28)";
        ctx.beginPath();
        ctx.moveTo(x, y + 6); ctx.bezierCurveTo(x - 12, y - 3, x - 6, y - 12, x, y - 5); ctx.bezierCurveTo(x + 6, y - 12, x + 12, y - 3, x, y + 6);
        ctx.fill();
      }
    }

    function draw() {
      if (!st) return;
      var ph = PHASES[st.phase];
      ctx.save();
      if (st.shake > 0) ctx.translate((Math.random() - 0.5) * 8 * st.shake * 2.5, (Math.random() - 0.5) * 8 * st.shake * 2.5);
      // Boden und Straße
      ctx.fillStyle = "#4f8f4a";
      ctx.fillRect(-10, -10, W + 20, H + 20);
      scenery();
      ctx.fillStyle = ph.rain ? "#2b3036" : "#383e45";
      ctx.fillRect(ROAD_X, -10, ROAD_W, H + 20);
      ctx.fillStyle = "#cfd6da";
      ctx.fillRect(ROAD_X - 4, -10, 4, H + 20);
      ctx.fillRect(ROAD_X + ROAD_W, -10, 4, H + 20);
      var off = st.dist % 40;
      ctx.fillStyle = "#c62f3a";
      for (var ry = -40 + (st.dist % 20) * 2; ry < H + 40; ry += 40) {                   // Randstreifen
        ctx.fillRect(ROAD_X - 4, ry, 4, 20); ctx.fillRect(ROAD_X + ROAD_W, ry, 4, 20);
      }
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (var i = 1; i < LANES; i++) for (var y = -40 + off; y < H; y += 40) ctx.fillRect(ROAD_X + i * LANE_W - 2, y, 4, 22);
      if (ph.rain) { ctx.fillStyle = "rgba(170,200,230,0.08)"; ctx.fillRect(ROAD_X, 0, ROAD_W, H); }
      // Geschwindigkeitslinien bei Nitro
      if (st.nitroOn) {
        ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 2;
        for (var k = 0; k < 14; k++) {
          var lxk = ROAD_X + 8 + hash(k + 1) * (ROAD_W - 16), lyk = ((hash(k + 40) * H + st.time * 900) % (H + 100)) - 50;
          ctx.beginPath(); ctx.moveTo(lxk, lyk); ctx.lineTo(lxk, lyk + 40); ctx.stroke();
        }
      }
      st.objs.forEach(drawObj);
      // Spielerauto
      if (!(st.inv > 0 && Math.floor(st.inv * 12) % 2 === 0 && !st.nitroOn)) drawCar(st.x, PY, css("--accent", "#2447d6"), st.tilt);
      if (st.shield) {
        ctx.strokeStyle = "rgba(94,200,255,0.85)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(st.x, PY, 30, 44, 0, 0, 7); ctx.stroke();
        ctx.fillStyle = "rgba(94,200,255,0.12)"; ctx.fill();
      }
      st.parts.forEach(function (p) {
        ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.restore();

      // Tageszeit
      if (ph.tint) { ctx.fillStyle = ph.tint; ctx.fillRect(0, 0, W, H); }
      if (ph.dark > 0) {
        nctx.globalCompositeOperation = "source-over";
        nctx.clearRect(0, 0, W, H);
        nctx.fillStyle = "rgba(4,8,24," + ph.dark + ")";
        nctx.fillRect(0, 0, W, H);
        nctx.globalCompositeOperation = "destination-out";
        function glow(x, y, rx, ry, a) {
          nctx.save();
          nctx.translate(x, y);
          nctx.scale(1, ry / rx);
          var g = nctx.createRadialGradient(0, 0, 2, 0, 0, rx);
          g.addColorStop(0, "rgba(0,0,0," + a + ")"); g.addColorStop(1, "rgba(0,0,0,0)");
          nctx.fillStyle = g;
          nctx.beginPath(); nctx.arc(0, 0, rx, 0, 7); nctx.fill();
          nctx.restore();
        }
        glow(st.x, PY - 90, 90, 170, 0.95);
        glow(st.x, PY + 10, 40, 40, 0.5);
        st.objs.forEach(function (o) { if (o.kind === "car" || o.kind === "truck") glow(o.x, o.y + (o.hh || 26), 30, 24, 0.5); });
        ctx.drawImage(night, 0, 0);
      }
      if (ph.rain) {
        ctx.strokeStyle = "rgba(200,220,255,0.55)"; ctx.lineWidth = 1;
        ctx.beginPath();
        st.rain.forEach(function (r) { ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 3, r.y + 12); });
        ctx.stroke();
      }

      // Anzeigen
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      rrect(8, 8, 124, 44, 8); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.fillText(String(score()), 16, 32);
      ctx.font = "11px system-ui, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText("Rekord " + best + "  ·  " + Math.round(metres()) + " m", 16, 46);
      hearts();
      if (st.combo > 1) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#7ee8a2";
        ctx.font = "bold 20px system-ui, sans-serif";
        ctx.fillText("Combo x" + st.combo, W / 2, 80);
      }
      // Nitro-Anzeige und Tempo
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      rrect(8, H - 34, W - 16, 26, 8); ctx.fill();
      ctx.fillStyle = "#ff9f1c";
      rrect(14, H - 28, Math.max(0, (W - 160) * st.nitro / 100), 14, 5); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1.5;
      rrect(14, H - 28, W - 160, 14, 5); ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(Math.round(st.v * 0.42) + " km/h", W - 14, H - 17);
      ctx.textAlign = "left";
      ctx.font = "bold 10px system-ui, sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText("NITRO", 20, H - 17);
      // Schwebende Texte
      st.texts.forEach(function (t) {
        ctx.globalAlpha = Math.max(0, 1 - t.t / 1.1);
        ctx.fillStyle = t.c;
        ctx.font = "bold 16px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(t.text, t.x, t.y);
      });
      ctx.globalAlpha = 1;
      if (st.bannerT > 0) {
        ctx.globalAlpha = Math.min(1, st.bannerT);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 28px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(st.banner, W / 2, 130);
        ctx.globalAlpha = 1;
      }

      if (!running) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "bold 32px system-ui, sans-serif";
        ctx.fillText(over ? "Unfall!" : paused ? "Pause" : "Bereit?", W / 2, H / 2 - 30);
        ctx.font = "16px system-ui, sans-serif";
        if (over) {
          ctx.fillText("Punkte: " + score() + (st.newBest ? " (neuer Rekord!)" : ""), W / 2, H / 2 + 2);
          ctx.fillText("Strecke: " + Math.round(metres()) + " m, Münzen: " + st.coins, W / 2, H / 2 + 26);
          ctx.fillText("Start drücken für eine neue Runde", W / 2, H / 2 + 58);
        } else ctx.fillText("Start drücken oder lenken", W / 2, H / 2 + 2);
      }
      if (paused && running) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.font = "bold 32px system-ui, sans-serif";
        ctx.fillText("Pause", W / 2, H / 2);
      }
    }

    function frame(t) {
      if (!running || stopped) return;
      var dt = Math.min(0.04, (t - prev) / 1000 || 0.016);
      prev = t;
      if (!paused && !document.hidden) {
        // in kleinen Schritten rechnen, damit bei hohem Tempo nichts durch das Auto hindurchfliegt
        var n = Math.max(1, Math.ceil(dt / 0.012)), h = dt / n;
        for (var i = 0; i < n && running; i++) update(h);
      }
      if (running || over) draw();
      if (running) raf = requestAnimationFrame(frame);
    }

    function onKey(e) {
      if (!canvas.offsetParent) return;
      var t = e.target && e.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      var down = e.type === "keydown", k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      var handled = true;
      if (k === "ArrowLeft" || k === "a") { if (st) st.leftKey = down; if (down) wake(); }
      else if (k === "ArrowRight" || k === "d") { if (st) st.rightKey = down; if (down) wake(); }
      else if (k === " " && t !== "BUTTON") { if (st) st.nitroKey = down; }
      else if (k === "p" && down) togglePause();
      else handled = false;
      if (handled) e.preventDefault();
    }

    function pointerSteer(e) {
      var rect = canvas.getBoundingClientRect();
      ptrDir = e.clientX - rect.left < rect.width / 2 ? -1 : 1;
    }
    canvas.addEventListener("pointerdown", function (e) {
      canvas.focus({ preventScroll: true });
      if (canvas.setPointerCapture) { try { canvas.setPointerCapture(e.pointerId); } catch (x) {} }
      pointerSteer(e);
      wake();
    });
    canvas.addEventListener("pointermove", function (e) { if (ptrDir) pointerSteer(e); });
    function ptrEnd() { ptrDir = 0; }
    canvas.addEventListener("pointerup", ptrEnd);
    canvas.addEventListener("pointercancel", ptrEnd);
    canvas.addEventListener("lostpointercapture", ptrEnd);
    startBtn.addEventListener("click", function () { begin(); canvas.focus({ preventScroll: true }); });
    pauseBtn.addEventListener("click", togglePause);
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKey);
    document.addEventListener("farbe-geaendert", draw);

    canvas.__ar = function () { return { st: st, running: running, held: held }; };

    reset();
    running = false;
    draw();
    info.textContent = "Rekord: " + best + ". Münzen insgesamt: " + coinsTotal + ". Start drücken oder lenken.";
    canvas.focus({ preventScroll: true });

    return function stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      running = false;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKey);
      document.removeEventListener("farbe-geaendert", draw);
    };
  }
});

;
// ===== quallenimperium.js =====
// © 2026 BlaueQualle. Alle Rechte vorbehalten.
// Spiel: Quallen-Imperium (Aufbauspiel unter Wasser)
// Sammle Perlen, baue 29 Arten von Unterwasser-Fabriken, erforsche Verbesserungen, fange Goldene Perlen,
// schalte Erfolge frei (je +2 % Produktion, dauerhaft) und erweitere dein Imperium für einen dauerhaften Bonus. Der Fortschritt wird im Browser gespeichert
// und läuft bis zu 8 Stunden weiter, auch wenn die Seite zu ist.
(function () {
  "use strict";

  var SAVE_KEY = "quallenimperium-v1";
  var GROWTH = 1.15;
  var MAX_OFFLINE = 8 * 3600;
  var BOOST_FACTOR = 7, BOOST_SECONDS = 30;
  var PRESTIGE_DIV = 1e9, PRESTIGE_BONUS = 0.04;
  var CLICK_BOOST = 10, CLICK_BOOST_SECONDS = 30;

  // Titel nach Anzahl der Quallen
  var TITLES = [[0, "Quallenlarve"], [1, "Junge Qualle"], [5, "Riffwächter"], [15, "Tiefsee-Hüter"], [40, "Meeresfürst"],
    [100, "Quallenkönig"], [250, "Herrscher der Ozeane"], [600, "Gottqualle"]];
  function titleFor(q) {
    var name = TITLES[0][1];
    TITLES.forEach(function (t) { if (q >= t[0]) name = t[1]; });
    return name;
  }

  // Quallen-Shop: dauerhafte Verbesserungen, bezahlt mit Quallen (bleiben nach jeder Imperium-Erweiterung erhalten).
  // Ausgegebene Quallen zählen nicht mehr für den Produktionsbonus, du tauschst also Bonus gegen Spezialfähigkeiten.
  var PERKS = [
    { name: "Perlen-Anfangsvorrat", cost: 1, desc: "Jede neue Runde beginnt mit 10.000 Perlen." },
    { name: "Tiefschlaf", cost: 2, desc: "Dein Imperium arbeitet offline bis zu 24 statt 8 Stunden weiter." },
    { name: "Goldener Magnet", cost: 3, desc: "Goldene Perlen erscheinen doppelt so oft." },
    { name: "Starke Tentakel", cost: 3, desc: "Der Ertrag pro Klick verdoppelt sich dauerhaft." },
    { name: "Lange Strömung", cost: 4, desc: "Strömungsrausch und Klick-Segen dauern doppelt so lang." },
    { name: "Forschungs-Erbe", cost: 6, desc: "Die ersten 3 Forschungen sind nach jeder Erweiterung schon erledigt." },
    { name: "Quallen-Segen", cost: 8, desc: "Jede Qualle gibt +6 % statt +4 % Produktion." },
    { name: "Expeditions-Funk", cost: 3, desc: "Expeditionen dauern nur halb so lang." },
    { name: "Schatzsucher", cost: 5, desc: "Artefakte werden um die Hälfte öfter gefunden." },
    { name: "Perlenzins", cost: 7, desc: "Jeder Erfolg gibt +3 % statt +2 % Produktion." },
    { name: "Goldene Beute", cost: 10, desc: "Der Perlenregen der Goldenen Perle bringt doppelt so viele Perlen." },
    { name: "Quallen-Dynastie", cost: 12, desc: "Jede Imperium-Erweiterung bringt 25 % mehr Quallen." }
  ];
  function perkOn(s, i) { return !!s.perks[i]; }
  function spentQuallen(s) {
    var sum = 0;
    PERKS.forEach(function (p, i) { if (s.perks[i]) sum += p.cost; });
    return sum;
  }
  function freeQuallen(s) { return Math.max(0, s.quallen - spentQuallen(s)); }
  function quallenEach(s) { return PRESTIGE_BONUS * (perkOn(s, 6) ? 1.5 : 1) * (galaxyDone(s, 2) ? 1.25 : 1); }
  function maxOffline(s) { return galaxyDone(s, 4) ? 48 * 3600 : perkOn(s, 1) ? 24 * 3600 : MAX_OFFLINE; }
  function goldGap(s) { return perkOn(s, 2) || s.planets >= 3 ? 0.5 : 1; }
  function boostLen(s) { return perkOn(s, 4) ? 2 : 1; }
  function achEach(s) { return (perkOn(s, 9) ? 0.03 : ACH_BONUS) + (galaxyDone(s, 5) ? 0.01 : 0); }

  // Planeten: zweite Erweiterungsstufe. Setzt auch Quallen und Quallen-Fähigkeiten zurück. Erfolge, Artefakte und Planeten bleiben.
  var PLANET_DIV = 100, PLANET_BONUS = 0.5;
  var PLANETS = [
    { icon: "🌍", name: "Aquaria" }, { icon: "🪐", name: "Thalassa" }, { icon: "🌕", name: "Nerida" }, { icon: "🔵", name: "Oceanus" },
    { icon: "🟣", name: "Abyssia" }, { icon: "🟢", name: "Coralis" }, { icon: "🟠", name: "Perlonia" }, { icon: "🔴", name: "Kraken-Prime" },
    { icon: "⚪", name: "Nautilus" }, { icon: "🟡", name: "Medusa" }, { icon: "🌑", name: "Tiefenrund" }, { icon: "🌐", name: "Neu-Neptun" }
  ];
  var PLANET_MILESTONES = [
    { need: 1, desc: "Nach jeder Erweiterung startest du mit 1 Mio. Perlen." },
    { need: 2, desc: "Der Ertrag pro Klick verdoppelt sich." },
    { need: 3, desc: "Goldene Perlen erscheinen doppelt so oft." },
    { need: 5, desc: "Expeditionen dauern halb so lang." },
    { need: 8, desc: "Imperium-Erweiterungen bringen 25 % mehr Quallen." }
  ];
  // Galaxien: Die Planeten sind in 10 Galaxien mit je 5 bis 8 Planeten geordnet (zusammen 65).
  // Jede vollständige Galaxie schaltet einen eigenen Bonus frei.
  var GALAXIES = [
    { name: "Nebel-Nest", size: 5, desc: "Produktion x1,5" },
    { name: "Perlen-Spirale", size: 6, desc: "Ertrag pro Klick x3" },
    { name: "Quallen-Wirbel", size: 7, desc: "Jede Qualle gibt 25 % mehr Bonus" },
    { name: "Korallen-Ring", size: 8, desc: "Artefakte wirken 25 % stärker" },
    { name: "Tiefsee-Haufen", size: 6, desc: "Offline-Zeit bis zu 48 Stunden" },
    { name: "Strudel-Band", size: 5, desc: "Jeder Erfolg gibt +1 % mehr Produktion" },
    { name: "Aqua-Kern", size: 7, desc: "Expeditionen bringen doppelt so viele Perlen" },
    { name: "Sternenmeer", size: 8, desc: "Jeder Planet gibt +75 % statt +50 %" },
    { name: "Zeit-Nebel", size: 6, desc: "Produktion x2" },
    { name: "Das Große Meer", size: 7, desc: "Produktion x3" }
  ];
  var GAL_END = [], TOTAL_PLANETS = 0;
  GALAXIES.forEach(function (g) { TOTAL_PLANETS += g.size; GAL_END.push(TOTAL_PLANETS); });
  function galaxyStart(i) { return i === 0 ? 0 : GAL_END[i - 1]; }
  function galaxyDone(s, i) { return s.planets >= GAL_END[i]; }
  function galaxiesDone(s) {
    var n = 0;
    for (var i = 0; i < GALAXIES.length; i++) if (galaxyDone(s, i)) n++;
    return n;
  }
  // Die Galaxie, an der gerade gebaut wird (die letzte, wenn alle fertig sind)
  function currentGalaxy(s) { return Math.min(galaxiesDone(s), GALAXIES.length - 1); }
  function galaxyFactor(s) {
    return (galaxyDone(s, 0) ? 1.5 : 1) * (galaxyDone(s, 8) ? 2 : 1) * (galaxyDone(s, 9) ? 3 : 1);
  }
  function planetEach(s) { return galaxyDone(s, 7) ? 0.75 : PLANET_BONUS; }

  function planetFactor(s) { return 1 + planetEach(s) * s.planets; }
  // Planeten kommen einzeln, und jeder weitere braucht mehr Quallen (100, 283, 520, 800 …)
  function planetNeed(s) { return Math.ceil(PLANET_DIV * Math.pow(s.planets + 1, 1.5)); }
  function planetGain(s) { return s.planets < TOTAL_PLANETS && s.quallen >= planetNeed(s) ? 1 : 0; }
  function planetName(i) {
    var base = PLANETS[i % PLANETS.length], round = Math.floor(i / PLANETS.length);
    return base.icon + " " + base.name + (round ? " " + (round + 1) : "");
  }
  function rainAmount(s, now) { return Math.max(50, cps(s, now) * 120) * (perkOn(s, 10) ? 2 : 1); }

  // Artefakte: werden auf Expeditionen gefunden, geben dauerhaft Produktionsbonus und bleiben nach jeder Erweiterung erhalten
  var ARTIFACTS = [
    { icon: "⚓", name: "Rostiger Anker", bonus: 0.05 },
    { icon: "🧭", name: "Verzauberter Kompass", bonus: 0.08 },
    { icon: "🏺", name: "Amphore der Tiefe", bonus: 0.10 },
    { icon: "🗝️", name: "Schlüssel von Atlantis", bonus: 0.12 },
    { icon: "📜", name: "Seekarte der Alten", bonus: 0.15 },
    { icon: "💎", name: "Herz des Ozeans", bonus: 0.20 },
    { icon: "🔱", name: "Splitter des Dreizacks", bonus: 0.25 },
    { icon: "👁️", name: "Auge der Tiefsee", bonus: 0.30 },
    { icon: "🪬", name: "Amulett des Riffs", bonus: 0.40 },
    { icon: "🧜", name: "Schuppe der Meerjungfrau", bonus: 0.50 },
    { icon: "🐚", name: "Stimme des Meeres", bonus: 0.75 },
    { icon: "👑", name: "Krone des Meereskönigs", bonus: 1.00 }
  ];
  function artCount(s) { return s.artifacts.reduce(function (a, b) { return a + (b ? 1 : 0); }, 0); }
  function artFactor(s) {
    var f = 1;
    ARTIFACTS.forEach(function (a, i) { if (s.artifacts[i]) f += a.bonus * (galaxyDone(s, 3) ? 1.25 : 1); });
    return f;
  }

  // Expeditionen: laufen in echter Zeit (auch bei geschlossener Seite). Belohnung: Perlen und vielleicht ein Artefakt.
  var EXPEDITIONS = [
    { name: "Kurze Erkundung", secs: 60, chance: 0.05 },
    { name: "Riff-Expedition", secs: 600, chance: 0.25 },
    { name: "Tiefsee-Tauchgang", secs: 3600, chance: 0.6 },
    { name: "Expedition ins Unbekannte", secs: 4 * 3600, chance: 1 }
  ];
  var EXP_REWARD = 1.5;   // Belohnung = Produktion von (Dauer × 1,5) Sekunden
  function expReward(s) { return EXP_REWARD * (galaxyDone(s, 6) ? 2 : 1); }
  function expSecs(s, i) { return EXPEDITIONS[i].secs / (perkOn(s, 7) || s.planets >= 5 ? 2 : 1); }
  function expActive(s) { return !!s.exp; }
  function expReady(s, now) { return !!s.exp && now >= s.exp.end; }

  function startExpedition(s, i, now) {
    if (!EXPEDITIONS[i] || s.exp) return false;
    s.exp = { i: i, end: now + expSecs(s, i) * 1000 };
    return true;
  }

  // Gibt { perlen, artifact } zurück (artifact = Index oder -1) oder null, wenn nichts abzuholen ist
  function collectExpedition(s, now, rand) {
    if (!expReady(s, now)) return null;
    var def = EXPEDITIONS[s.exp.i];
    var perlen = cps(s, now) * def.secs * expReward(s);
    gain(s, perlen);
    s.exp = null;
    s.expDone++;
    var found = -1, missing = [];
    ARTIFACTS.forEach(function (a, i) { if (!s.artifacts[i]) missing.push(i); });
    var chance = Math.min(1, def.chance * (perkOn(s, 8) ? 1.5 : 1));
    if (missing.length && rand() < chance) {
      found = missing[Math.floor(rand() * missing.length) % missing.length];
      s.artifacts[found] = 1;
    }
    return { perlen: perlen, artifact: found };
  }

  function fmtTime(sec) {
    var t = Math.max(0, Math.ceil(sec)), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), r = t % 60;
    if (h) return h + " Std. " + (m ? m + " Min." : "");
    if (m) return m + " Min." + (r ? " " + r + " s" : "");
    return r + " s";
  }

  // Meeres-Nachrichten: erscheinen als Ticker unter den Meldungen ([ab so vielen Fabriken, Text])
  var NEWS = [
    [0, "Ein Krebs behauptet, er habe die Perle zuerst gesehen."],
    [0, "Die Strömung ist heute angenehm warm."],
    [0, "Eine Möwe hat über dem Wasser nach dir gesucht."],
    [3, "Die Muscheln fordern einen Betriebsrat. Die Algen stimmen zu."],
    [5, "Ein Schwarm Sardinen übt für den großen Auftritt."],
    [8, "Der Bürgermeister der Riffstadt eröffnet eine neue Schwimmbahn."],
    [10, "Garnelen-Gewerkschaft: Mehr Freizeit für alle Scheren!"],
    [12, "Ein Tintenfisch hat ein Meisterwerk gemalt. Niemand erkennt, was es darstellt."],
    [15, "Wissenschaftler staunen: Das Plankton ist heute besonders gut gelaunt."],
    [20, "Die Haifisch-Bank senkt die Zinsen. Die Fische jubeln."],
    [25, "Ein Wal singt vor ausverkaufter Halle."],
    [30, "Forscher finden alte Münzen im Sand: sie stammen von dir."],
    [40, "In der Tiefsee leuchtet es neuerdings in allen Farben."],
    [50, "Der Strudel-Reaktor läuft auf Hochtouren. Alle Fische halten Abstand."],
    [60, "Delfine liefern die Post schneller als je zuvor."],
    [80, "Händler aus fernen Meeren wollen dein Imperium besuchen."],
    [100, "Eine Schildkröte, 300 Jahre alt, lobt deine Pläne."],
    [130, "Atlantis meldet: Wir haben dich schon erwartet."],
    [160, "Sternschnuppen regnen ins Meer. Das Meer sagt danke."],
    [200, "Der Quallen-Thronsaal bekommt einen neuen Kronleuchter."],
    [250, "Der Ozean selbst scheint dir zuzuhören."],
    [300, "Alle Meerjungfrauen sprechen von dir."],
    [400, "Die Tiefsee-Portale summen eine unbekannte Melodie."],
    [500, "Gelehrte streiten, ob das hier noch ein Imperium oder schon ein Weltall ist."],
    [650, "Die Zeit fließt im Imperium ein bisschen langsamer."],
    [800, "Selbst die Sterne schauen neidisch auf dein Meer."]
  ];
  function newsPool(s) {
    var n = buildingCount(s);
    var pool = NEWS.filter(function (x) { return n >= x[0]; });
    if (s.planets >= 1) {
      pool.push([0, "Auf deinem neuen Planeten wachsen die ersten Algen."], [0, "Raumschiffe voller Garnelen melden: Landung geglückt."],
        [0, "Zwei Monde umkreisen dein Imperium und finden es großartig."]);
    }
    return pool;
  }

  var BUILDINGS = [
    { icon: "🌿", name: "Algenfarm", makes: "Algen", cost: 15, cps: 0.2 },
    { icon: "🐚", name: "Muschelbank", makes: "Muscheln", cost: 100, cps: 1.2 },
    { icon: "🦐", name: "Garnelenzucht", makes: "Garnelen", cost: 650, cps: 7 },
    { icon: "🐠", name: "Fischfarm", makes: "Fische", cost: 4000, cps: 38 },
    { icon: "🦪", name: "Perlenmanufaktur", makes: "Zuchtperlen", cost: 25000, cps: 210 },
    { icon: "🦀", name: "Krabbenwerft", makes: "Krabbenkutter", cost: 160000, cps: 1200 },
    { icon: "⚗️", name: "Plankton-Labor", makes: "Plankton-Konzentrat", cost: 1e6, cps: 7000 },
    { icon: "🦑", name: "Tintenwerkstatt", makes: "Tinte und Farben", cost: 7.5e6, cps: 42000 },
    { icon: "⛏️", name: "Tiefsee-Mine", makes: "Edelsteine", cost: 5.5e7, cps: 250000 },
    { icon: "🌋", name: "Thermalkraftwerk", makes: "Strom aus Vulkanquellen", cost: 4e8, cps: 1.5e6 },
    { icon: "🐙", name: "Kraken-Werft", makes: "Schiffe", cost: 3e9, cps: 9e6 },
    { icon: "🦈", name: "Haifisch-Bank", makes: "Zinsen", cost: 2.2e10, cps: 5.5e7 },
    { icon: "🐳", name: "Walgesang-Studio", makes: "Hits und Konzerte", cost: 1.6e11, cps: 3.3e8 },
    { icon: "🔱", name: "Atlantis-Tempel", makes: "Schätze", cost: 1.2e12, cps: 2e9 },
    { icon: "🌀", name: "Strudel-Reaktor", makes: "Strudelkraft", cost: 9e12, cps: 1.2e10 },
    { icon: "👑", name: "Quallen-Thronsaal", makes: "Quallengold", cost: 7e13, cps: 7.5e10 },
    { icon: "🏭", name: "Chinesische-Kinderarbeit", makes: "Temu-ware", cost: 5e14, cps:9e11},
    { icon: "🌌", name: "Tiefsee-Portal", makes: "Dimensionsperlen", cost: 4.5e15, cps: 8e12 },
    { icon: "🪼", name: "Ur-Qualle", makes: "Ur-Energie", cost: 4e16, cps: 7.5e13 },
    { icon: "🔮", name: "Orakel-Grotte", makes: "Prophezeiungen", cost: 3.5e17, cps: 6e14 },
    { icon: "🏰", name: "Kristallpalast", makes: "Kristallstrom", cost: 3e18, cps: 5e15 },
    { icon: "⭐", name: "Sternenmeer-Observatorium", makes: "Sternenstaub", cost: 2.8e19, cps: 4.5e16 },
    { icon: "🌊", name: "Ozean-Bewusstsein", makes: "Gedankenwellen", cost: 2.6e20, cps: 4.2e17 },
    { icon: "🧿", name: "Auge des Sturms", makes: "Sturmenergie", cost: 2.4e21, cps: 3.9e18 },
    { icon: "🗿", name: "Versunkene Statuen", makes: "Ehrfurcht", cost: 2.2e22, cps: 3.6e19 },
    { icon: "🌠", name: "Meteor-Schmiede", makes: "Sternenmetall", cost: 2e23, cps: 3.3e20 },
    { icon: "🐉", name: "Seedrachen-Hort", makes: "Drachengold", cost: 1.9e24, cps: 3.1e21 },
    { icon: "⏳", name: "Zeitstrom-Schleuse", makes: "Zeitperlen", cost: 1.8e25, cps: 2.9e22 },
    { icon: "♾️", name: "Unendlichkeits-Muschel", makes: "Unendlichkeit", cost: 1.7e26, cps: 2.7e23 }
  ];

  // Jede Stufe verdoppelt den Ertrag pro Klick
  var CLICK_UPGRADES = [
    { cost: 100, name: "Starke Tentakel" },
    { cost: 2500, name: "Perlentaucher" },
    { cost: 5e4, name: "Schatzsucher-Netz" },
    { cost: 1e6, name: "Königlicher Auftrag" },
    { cost: 2e7, name: "Tiefsee-Kran" },
    { cost: 5e8, name: "Strudelgriff" },
    { cost: 1e10, name: "Neptuns Dreizack" },
    { cost: 3e11, name: "Quallen-Magie" },
    { cost: 1e13, name: "Ur-Greifer" },
    { cost: 5e14, name: "Portal-Hände" },
    { cost: 2e16, name: "Orakel-Berührung" },
    { cost: 1e18, name: "Sternen-Griff" },
    { cost: 5e19, name: "Meteor-Faust" },
    { cost: 2e21, name: "Drachen-Pranke" },
    { cost: 1e23, name: "Zeit-Griff" }
  ];

  // Verbesserungen je Fabrik: verdoppeln den Ertrag dieser Fabrik
  var MULT_RULES = [
    { need: 10, factor: 50 },
    { need: 25, factor: 500 },
    { need: 50, factor: 5000 },
    { need: 100, factor: 50000 }
  ];

  // Forschung: gibt dauerhaft einen Bonus auf die gesamte Produktion (bis zum Imperium-Neustart)
  var RESEARCH = [
    { name: "Warme Strömung", cost: 2000, bonus: 0.10 },
    { name: "Plankton-Dünger", cost: 25000, bonus: 0.15 },
    { name: "Riffnetzwerk", cost: 3e5, bonus: 0.20 },
    { name: "Leuchtalgen-Licht", cost: 3e6, bonus: 0.25 },
    { name: "Tiefsee-Handel", cost: 4e7, bonus: 0.30 },
    { name: "Perlenbörse", cost: 5e8, bonus: 0.40 },
    { name: "Muränen-Wachen", cost: 7e9, bonus: 0.50 },
    { name: "Meeresgott-Segen", cost: 1e11, bonus: 0.60 },
    { name: "Strudelmagie", cost: 1.5e12, bonus: 0.80 },
    { name: "Delfin-Post", cost: 2.5e13, bonus: 1.00 },
    { name: "Quallen-Weisheit", cost: 4e14, bonus: 1.50 },
    { name: "Das Große Riff", cost: 7e15, bonus: 2.00 },
    { name: "Perlen-Syndikat", cost: 1.2e17, bonus: 3.00 },
    { name: "Portal-Netzwerk", cost: 2e18, bonus: 4.00 },
    { name: "Ur-Strömung", cost: 3.5e19, bonus: 6.00 },
    { name: "Orakel-Prophezeiung", cost: 5e20, bonus: 8.00 },
    { name: "Kristall-Resonanz", cost: 8e21, bonus: 10.00 },
    { name: "Sternen-Navigation", cost: 1.3e23, bonus: 14.00 },
    { name: "Ozean-Einheit", cost: 2e24, bonus: 20.00 },
    { name: "Das Ende der Tiefe", cost: 4e25, bonus: 30.00 },
    { name: "Sturm-Bändigung", cost: 6e26, bonus: 40.00 },
    { name: "Statuen-Segen", cost: 1e28, bonus: 55.00 },
    { name: "Meteor-Regen", cost: 1.6e29, bonus: 75.00 },
    { name: "Drachen-Pakt", cost: 2.6e30, bonus: 100.00 },
    { name: "Zeit-Falte", cost: 4e31, bonus: 150.00 },
    { name: "Unendliche Tiefe", cost: 7e32, bonus: 250.00 }
  ];

  var STAGES = [[0, "Korallenlager"], [10, "Unterwasserdorf"], [30, "Riffstadt"], [70, "Tiefsee-Stadt"],
    [150, "Meeresmetropole"], [300, "Atlantis"], [600, "Quallen-Imperium"],[700, "Chinesische-Kinderarbeit"],
    [800, "Ozean-Gottheit"], [1000, "Weltmeer-Imperium"]];

  // Erfolge: bleiben auch nach dem Imperium-Neustart erhalten, jeder gibt dauerhaft +2 % Produktion
  var ACH_BONUS = 0.02;
  var ACHIEVEMENTS = [
    { name: "Erste Perlen", desc: "100 Klicks", check: function (s) { return s.clicks >= 100; } },
    { name: "Fleißige Tentakel", desc: "1.000 Klicks", check: function (s) { return s.clicks >= 1000; } },
    { name: "Klickmeister", desc: "10.000 Klicks", check: function (s) { return s.clicks >= 10000; } },
    { name: "Kleines Vermögen", desc: "Insgesamt 10 Tsd. Perlen verdient", check: function (s) { return s.allTime >= 1e4; } },
    { name: "Perlenbaron", desc: "Insgesamt 10 Mio. Perlen verdient", check: function (s) { return s.allTime >= 1e7; } },
    { name: "Perlenkönig", desc: "Insgesamt 10 Mrd. Perlen verdient", check: function (s) { return s.allTime >= 1e10; } },
    { name: "Perlengott", desc: "Insgesamt 10 Bio. Perlen verdient", check: function (s) { return s.allTime >= 1e13; } },
    { name: "Unendliche Tiefe", desc: "Insgesamt 10 Brd. Perlen verdient", check: function (s) { return s.allTime >= 1e16; } },
    { name: "Kleine Flotte", desc: "10 Fabriken gleichzeitig", check: function (s) { return buildingCount(s) >= 10; } },
    { name: "Große Flotte", desc: "50 Fabriken gleichzeitig", check: function (s) { return buildingCount(s) >= 50; } },
    { name: "Armada", desc: "150 Fabriken gleichzeitig", check: function (s) { return buildingCount(s) >= 150; } },
    { name: "Ozeanherrscher", desc: "400 Fabriken gleichzeitig", check: function (s) { return buildingCount(s) >= 400; } },
    { name: "Vielfalt", desc: "Von jeder Fabrik mindestens eine", check: function (s) { return s.owned.every(function (n) { return n >= 1; }); } },
    { name: "Gelehrte Qualle", desc: "Alle Forschungen abgeschlossen", check: function (s) { return s.research.every(function (r) { return !!r; }); } },
    { name: "Perlenfischer", desc: "10 Goldene Perlen gefangen", check: function (s) { return s.golds >= 10; } },
    { name: "Goldrausch", desc: "50 Goldene Perlen gefangen", check: function (s) { return s.golds >= 50; } },
    { name: "Neuanfang", desc: "Das Imperium zum ersten Mal erweitert", check: function (s) { return s.resets >= 1; } },
    { name: "Dynastie", desc: "Das Imperium 5-mal erweitert", check: function (s) { return s.resets >= 5; } },
    { name: "Quallenschwarm", desc: "10 Quallen besitzen", check: function (s) { return s.quallen >= 10; } },
    { name: "Quallenflut", desc: "50 Quallen besitzen", check: function (s) { return s.quallen >= 50; } },
    { name: "Unsterbliches Imperium", desc: "Das Imperium 10-mal erweitert", check: function (s) { return s.resets >= 10; } },
    { name: "Klicklegende", desc: "100.000 Klicks", check: function (s) { return s.clicks >= 100000; } },
    { name: "Tentakel-Gott", desc: "Alle Klick-Verbesserungen gekauft", check: function (s) { return s.clickLevel >= CLICK_UPGRADES.length; } },
    { name: "Perlen-Imperator", desc: "Insgesamt 10 Trd. Perlen verdient", check: function (s) { return s.allTime >= 1e19; } },
    { name: "Perlen-Gottheit", desc: "Insgesamt 10 Quad. Perlen verdient", check: function (s) { return s.allTime >= 1e22; } },
    { name: "Jenseits der Zahlen", desc: "Insgesamt 10 Qdd. Perlen verdient", check: function (s) { return s.allTime >= 1e28; } },
    { name: "Spezialist", desc: "100 Stück einer Fabrik", check: function (s) { return s.owned.some(function (n) { return n >= 100; }); } },
    { name: "Großmeister", desc: "300 Stück einer Fabrik", check: function (s) { return s.owned.some(function (n) { return n >= 300; }); } },
    { name: "Ertragsmeister", desc: "Eine Fabrik voll verbessert", check: function (s) { return s.mult.some(function (m) { return m >= MULT_RULES.length; }); } },
    { name: "Perlenjäger", desc: "100 Goldene Perlen gefangen", check: function (s) { return s.golds >= 100; } },
    { name: "Klick-Gott", desc: "1.000.000 Klicks", check: function (s) { return s.clicks >= 1e6; } },
    { name: "Grenzenlos", desc: "Insgesamt 10 Quin. Perlen verdient", check: function (s) { return s.allTime >= 1e31; } },
    { name: "Perlen-Legende", desc: "250 Goldene Perlen gefangen", check: function (s) { return s.golds >= 250; } },
    { name: "Ewiges Imperium", desc: "Das Imperium 25-mal erweitert", check: function (s) { return s.resets >= 25; } },
    { name: "Quallen-Ozean", desc: "150 Quallen besitzen", check: function (s) { return s.quallen >= 150; } },
    { name: "Sammler", desc: "6 Artefakte gefunden", check: function (s) { return artCount(s) >= 6; } },
    { name: "Archäologe", desc: "Alle Artefakte gefunden", check: function (s) { return artCount(s) >= ARTIFACTS.length; } },
    { name: "Entdecker", desc: "10 Expeditionen abgeschlossen", check: function (s) { return s.expDone >= 10; } },
    { name: "Weltenbummler", desc: "100 Expeditionen abgeschlossen", check: function (s) { return s.expDone >= 100; } },
    { name: "Quallen-Händler", desc: "Alle Quallen-Fähigkeiten gekauft", check: function (s) { return s.perks.every(function (p) { return !!p; }); } }
  ];
  // Pro Fabrik ein Erfolg für 25 Stück (neue Erfolge nur hinten anhängen, damit alte Spielstände passen)
  BUILDINGS.forEach(function (b, i) {
    ACHIEVEMENTS.push({ name: b.icon + " " + b.name + "-Meister", desc: "25 × " + b.name, check: function (s) { return s.owned[i] >= 25; } });
  });
  ACHIEVEMENTS.push(
    { name: "Erster Planet", desc: "Den ersten Planeten gegründet", check: function (s) { return s.planets >= 1; } },
    { name: "Planetenjäger", desc: "5 Planeten", check: function (s) { return s.planets >= 5; } },
    { name: "Herr der Planeten", desc: "10 Planeten", check: function (s) { return s.planets >= 10; } },
    { name: "Kosmischer Herrscher", desc: "25 Planeten", check: function (s) { return s.planets >= 25; } },
    { name: "Erste Galaxie", desc: "Eine Galaxie vollständig besiedelt", check: function (s) { return galaxiesDone(s) >= 1; } },
    { name: "Galaxienforscher", desc: "3 Galaxien vollständig besiedelt", check: function (s) { return galaxiesDone(s) >= 3; } },
    { name: "Herr der Galaxien", desc: "Alle Galaxien vollständig besiedelt", check: function (s) { return galaxiesDone(s) >= GALAXIES.length; } }
  );

  var UNITS = [[1e42, "Sept."], [1e39, "Sxd."], [1e36, "Sext."], [1e33, "Qid."], [1e30, "Quin."], [1e27, "Qdd."],
    [1e24, "Quad."], [1e21, "Trd."], [1e18, "Tri."], [1e15, "Brd."], [1e12, "Bio."], [1e9, "Mrd."], [1e6, "Mio."], [1e3, "Tsd."]];

  // ---------- Spielregeln ----------
  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }

  function newState() {
    return {
      coins: 0, total: 0, allTime: 0, clicks: 0,
      owned: zeros(BUILDINGS.length), mult: zeros(BUILDINGS.length), clickLevel: 0,
      research: zeros(RESEARCH.length), quallen: 0, resets: 0, boostUntil: 0, last: Date.now(),
      ach: zeros(ACHIEVEMENTS.length), golds: 0, clickBoostUntil: 0, perks: zeros(PERKS.length),
      artifacts: zeros(ARTIFACTS.length), expDone: 0, exp: null, planets: 0, pResets: 0
    };
  }

  function cost(i, owned) { return Math.ceil(BUILDINGS[i].cost * Math.pow(GROWTH, owned)); }

  // Preis für n Stück auf einmal
  function costN(i, owned, n) {
    return Math.ceil(BUILDINGS[i].cost * Math.pow(GROWTH, owned) * (Math.pow(GROWTH, n) - 1) / (GROWTH - 1));
  }

  function maxAffordable(s, i) {
    var base = BUILDINGS[i].cost * Math.pow(GROWTH, s.owned[i]);
    var x = s.coins * (GROWTH - 1) / base + 1;
    if (!(x >= GROWTH)) return 0;
    var n = Math.floor(Math.log(x) / Math.log(GROWTH));
    while (n > 0 && costN(i, s.owned[i], n) > s.coins) n--;
    return n;
  }

  function perBuilding(s, i) { return BUILDINGS[i].cps * Math.pow(2, s.mult[i]); }

  function baseCps(s) {
    var sum = 0;
    for (var i = 0; i < BUILDINGS.length; i++) sum += s.owned[i] * perBuilding(s, i);
    return sum;
  }

  function researchBonus(s) {
    var b = 0;
    for (var i = 0; i < RESEARCH.length; i++) if (s.research[i]) b += RESEARCH[i].bonus;
    return b;
  }

  function quallenFactor(s) { return 1 + quallenEach(s) * freeQuallen(s); }
  function boostActive(s, now) { return now < s.boostUntil; }

  function achCount(s) { return s.ach.reduce(function (a, b) { return a + (b ? 1 : 0); }, 0); }
  function achFactor(s) { return 1 + achEach(s) * achCount(s); }

  // Schaltet neu erreichte Erfolge frei und gibt deren Namen zurück
  function checkAch(s) {
    var fresh = [];
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (!s.ach[i] && ACHIEVEMENTS[i].check(s)) { s.ach[i] = 1; fresh.push(ACHIEVEMENTS[i].name); }
    }
    return fresh;
  }

  function multiplier(s, now) {
    return (1 + researchBonus(s)) * quallenFactor(s) * achFactor(s) * artFactor(s) * planetFactor(s) * galaxyFactor(s) * (boostActive(s, now) ? BOOST_FACTOR : 1);
  }

  function cps(s, now) { return baseCps(s) * multiplier(s, now); }

  function clickValue(s, now) {
    var boost = (now < s.clickBoostUntil ? CLICK_BOOST : 1) * (perkOn(s, 3) ? 2 : 1) * (s.planets >= 2 ? 2 : 1) * (galaxyDone(s, 1) ? 3 : 1);
    return (Math.pow(2, s.clickLevel) * (1 + researchBonus(s)) * quallenFactor(s) * achFactor(s) * artFactor(s) * planetFactor(s) * galaxyFactor(s) + cps(s, now) * 0.02) * boost;
  }

  // n: Zahl oder "max". Gibt die Anzahl der gebauten Fabriken zurück (0 = nichts gekauft).
  function buy(s, i, n) {
    if (n === "max") n = maxAffordable(s, i);
    if (!(n >= 1)) return 0;
    while (n > 0 && costN(i, s.owned[i], n) > s.coins) n--;
    if (n < 1) return 0;
    s.coins -= costN(i, s.owned[i], n);
    s.owned[i] += n;
    return n;
  }

  function upgradePrice(i, level) { return BUILDINGS[i].cost * MULT_RULES[level].factor; }

  function canUpgrade(s, i) {
    var level = s.mult[i];
    return level < MULT_RULES.length && s.owned[i] >= MULT_RULES[level].need;
  }

  function upgradeBuilding(s, i) {
    if (!canUpgrade(s, i)) return false;
    var price = upgradePrice(i, s.mult[i]);
    if (s.coins < price) return false;
    s.coins -= price;
    s.mult[i]++;
    return true;
  }

  function upgradeClick(s) {
    if (s.clickLevel >= CLICK_UPGRADES.length) return false;
    var price = CLICK_UPGRADES[s.clickLevel].cost;
    if (s.coins < price) return false;
    s.coins -= price;
    s.clickLevel++;
    return true;
  }

  function buyResearch(s, i) {
    if (s.research[i] || s.coins < RESEARCH[i].cost) return false;
    s.coins -= RESEARCH[i].cost;
    s.research[i] = 1;
    return true;
  }

  function earn(s, seconds, now) {
    var amount = cps(s, now) * seconds;
    s.coins += amount;
    s.total += amount;
    s.allTime += amount;
    return amount;
  }

  function gain(s, amount) {
    s.coins += amount;
    s.total += amount;
    s.allTime += amount;
  }

  function buildingCount(s) { return s.owned.reduce(function (a, b) { return a + b; }, 0); }

  function stageName(s) {
    var n = buildingCount(s), name = STAGES[0][1];
    STAGES.forEach(function (st) { if (n >= st[0]) name = st[1]; });
    return name;
  }

  // Imperium erweitern: so viele Quallen gibt es für diese Runde
  function prestigeGain(s) { return Math.floor(Math.sqrt(s.total / PRESTIGE_DIV) * (perkOn(s, 11) || s.planets >= 8 ? 1.25 : 1)); }

  function prestige(s, now) {
    var g = prestigeGain(s);
    if (g < 1) return 0;
    var keep = { quallen: s.quallen + g, resets: s.resets + 1, allTime: s.allTime, clicks: s.clicks, ach: s.ach.slice(), golds: s.golds, perks: s.perks.slice(), artifacts: s.artifacts.slice(), expDone: s.expDone, exp: s.exp, planets: s.planets, pResets: s.pResets };
    var fresh = newState();
    Object.keys(fresh).forEach(function (k) { s[k] = fresh[k]; });
    s.quallen = keep.quallen;
    s.resets = keep.resets;
    s.allTime = keep.allTime;
    s.clicks = keep.clicks;
    s.ach = keep.ach;
    s.golds = keep.golds;
    s.perks = keep.perks;
    s.artifacts = keep.artifacts;
    s.expDone = keep.expDone;
    s.exp = keep.exp;
    s.planets = keep.planets;
    s.pResets = keep.pResets;
    grantStart(s);
    if (perkOn(s, 5)) { for (var r = 0; r < 3; r++) s.research[r] = 1; }
    s.last = now;
    return g;
  }

  // Startperlen nach einer Erweiterung: Anfangsvorrat-Fähigkeit und Planeten-Meilenstein
  function grantStart(s) {
    var c = Math.max(perkOn(s, 0) ? 10000 : 0, s.planets >= 1 ? 1e6 : 0);
    if (c > 0) { s.coins = c; s.total = c; s.allTime += c; }
  }

  // Planet gründen: setzt Perlen, Fabriken, Forschung, Quallen und Quallen-Fähigkeiten zurück. Gibt die Zahl neuer Planeten zurück.
  function planetize(s, now) {
    var g = planetGain(s);
    if (g < 1) return 0;
    var keep = { planets: s.planets + g, pResets: s.pResets + 1, resets: s.resets, allTime: s.allTime, clicks: s.clicks,
      ach: s.ach.slice(), golds: s.golds, artifacts: s.artifacts.slice(), expDone: s.expDone, exp: s.exp };
    var fresh = newState();
    Object.keys(fresh).forEach(function (k) { s[k] = fresh[k]; });
    Object.keys(keep).forEach(function (k) { s[k] = keep[k]; });
    grantStart(s);
    s.last = now;
    return g;
  }

  // Kauft eine Quallen-Verbesserung, wenn genug freie Quallen da sind
  function buyPerk(s, i) {
    if (!PERKS[i] || s.perks[i] || freeQuallen(s) < PERKS[i].cost) return false;
    s.perks[i] = 1;
    return true;
  }

  function fmt(n) {
    if (!isFinite(n)) return "∞";
    if (n < 1000) return n < 100 && Math.floor(n) !== n ? n.toFixed(1).replace(".", ",") : String(Math.floor(n));
    if (n >= 1e45) {
      var exp = Math.floor(Math.log10(n)), mant = n / Math.pow(10, exp);
      if (mant >= 9.995) { mant = 1; exp++; }   // Rundung: 9,999 wird 1,00 × 10 hoch (exp+1)
      return mant.toFixed(2).replace(".", ",") + "e" + exp;
    }
    for (var i = 0; i < UNITS.length; i++) {
      if (n >= UNITS[i][0]) return (n / UNITS[i][0]).toFixed(2).replace(".", ",") + " " + UNITS[i][1];
    }
    return String(Math.floor(n));
  }

  // Macht aus einem (evtl. fehlenden oder zu kurzen) Feld eine Liste der Länge n, mit Nullen aufgefüllt
  function padTo(a, n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(Array.isArray(a) && isFinite(a[i]) ? Number(a[i]) : 0);
    return out;
  }

  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (v && Array.isArray(v.owned) && v.owned.length >= 1 && v.owned.length <= BUILDINGS.length && isFinite(v.coins) && isFinite(v.total)) {
        var base = newState();
        Object.keys(base).forEach(function (k) { if (v[k] === undefined) v[k] = base[k]; });
        // Ältere Spielstände haben weniger Fabriken, Forschungen und Erfolge: auffüllen statt zurücksetzen
        v.owned = padTo(v.owned, BUILDINGS.length);
        v.mult = padTo(v.mult, BUILDINGS.length);
        v.research = padTo(v.research, RESEARCH.length);
        v.ach = padTo(v.ach, ACHIEVEMENTS.length);
        v.perks = padTo(v.perks, PERKS.length);
        v.artifacts = padTo(v.artifacts, ARTIFACTS.length);
        if (!isFinite(v.expDone)) v.expDone = 0;
        if (!v.exp || !isFinite(v.exp.end) || !EXPEDITIONS[v.exp.i]) v.exp = null;
        if (!isFinite(v.golds)) v.golds = 0;
        if (!isFinite(v.allTime) || v.allTime < v.total) v.allTime = v.total;
        return v;
      }
    } catch (e) {}
    return newState();
  }

  function save(s) {
    s.last = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  // ---------- Oberfläche ----------
  // Aufbau: dunkles Meeres-Fenster (Zähler, Perle zum Klicken, Riff) und darunter helle Arbeitsbereiche in den Farben der Seite.
  var CSS = [
    ".qi{--qi-glow:#55e6c8;--qi-violet:#9b8cff;--qi-pearl:#f3eee4;--qi-gold:#ffc857;max-width:40rem}",

    /* Meeres-Fenster */
    ".qi-scene{position:relative;overflow:hidden;border-radius:1.4rem 1.4rem 0.8rem 0.8rem;padding:1.1rem 1rem 1rem;color:var(--qi-pearl);" +
      "background:radial-gradient(120% 70% at 50% -10%,rgba(85,230,200,.30),transparent 60%),linear-gradient(180deg,#0e4560 0%,#0a2c3f 45%,#061922 100%);" +
      "box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}",
    ".qi-in{position:relative;z-index:1}",
    ".qi-top{display:flex;justify-content:space-between;align-items:flex-start;gap:.75rem}",
    ".qi-stage{font-family:var(--serif);font-style:italic;font-size:1.05rem;line-height:1.25}",
    ".qi-stagebar{height:3px;width:7.5rem;max-width:100%;border-radius:2px;background:rgba(255,255,255,.16);margin-top:.4rem;overflow:hidden}",
    ".qi-stagebar i{display:block;height:100%;width:0;background:var(--qi-glow);transition:width .4s}",
    ".qi-chips{display:flex;gap:.4rem;flex-wrap:wrap;justify-content:flex-end}",
    ".qi-chip{font-size:.8rem;font-weight:600;line-height:1.2;padding:.25rem .65rem;border-radius:999px;background:rgba(155,140,255,.24);border:1px solid rgba(155,140,255,.6)}",
    ".qi-count{font-family:var(--serif);font-weight:600;font-size:clamp(2.6rem,12vw,4rem);line-height:1.05;letter-spacing:-.02em;text-align:center;margin:.7rem 0 0;font-variant-numeric:tabular-nums;text-shadow:0 0 26px rgba(85,230,200,.4)}",
    ".qi-rate{text-align:center;margin:.2rem 0 0;font-size:.95rem;opacity:.85}",
    ".qi-bonus{text-align:center;margin:0;font-size:.82rem;opacity:.6}",
    ".qi-orbwrap{position:relative;display:flex;justify-content:center;margin:1.1rem 0 .9rem}",
    ".qi-orb{width:8.6rem;height:8.6rem;border-radius:50%;border:0;padding:0;cursor:pointer;color:#12303e;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.15rem;" +
      "background:radial-gradient(circle at 34% 28%,#ffffff 0%,#f3eee4 28%,#b9d8e3 62%,#6fb0c9 100%);" +
      "box-shadow:0 0 0 6px rgba(85,230,200,.14),0 0 48px rgba(85,230,200,.5),inset -8px -10px 22px rgba(20,70,95,.35);transition:transform .08s ease,box-shadow .2s}",
    ".qi-orb:active{transform:scale(.94)}",
    ".qi-orb .e{font-size:2.5rem;line-height:1}",
    ".qi-orb .v{font-size:.95rem;font-weight:700}",
    ".qi-float{position:absolute;top:28%;left:50%;transform:translateX(-50%);font-weight:700;font-size:1.1rem;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.6);pointer-events:none;white-space:nowrap}",
    ".qi-reef{display:flex;flex-wrap:wrap;gap:.35rem;justify-content:center;padding:.7rem 0 0;border-top:1px solid rgba(255,255,255,.12);min-height:2.8rem}",
    ".qi-reef .r{display:inline-flex;align-items:center;gap:.3rem;padding:.1rem .55rem .1rem .4rem;border-radius:999px;background:rgba(255,255,255,.09);font-size:.85rem;font-variant-numeric:tabular-nums}",
    ".qi-reef .r b{font-size:1.15rem;font-weight:400;line-height:1.3}",
    ".qi-empty{width:100%;text-align:center;font-size:.9rem;opacity:.75;margin:0}",
    ".qi-bub{position:absolute;bottom:-1.5rem;border-radius:50%;border:1px solid rgba(255,255,255,.32);background:rgba(255,255,255,.07);pointer-events:none;opacity:0}",
    ".qi-gold{position:absolute;z-index:2;padding:.5rem 1rem;font-size:.9rem;font-weight:700;border-radius:999px;border:2px solid #fff3c4;cursor:pointer;color:#4a2f00;" +
      "background:radial-gradient(circle at 30% 25%,#fff1b8,#ffc857 60%,#e09a1a);box-shadow:0 0 24px rgba(255,200,87,.85)}",

    /* Meldungen */
    ".qi-note{margin:.9rem 0 0;padding:.65rem .9rem;border-left:4px solid var(--accent);background:var(--panel);border-radius:0 8px 8px 0;font-size:.95rem}",
    ".qi-note:empty{display:none}",
    ".qi-ticker{margin:.55rem 0 0;color:var(--muted);font-style:italic;font-size:.9rem;min-height:1.4rem}",

    /* Reiter */
    ".qi-tabs{display:flex;flex-wrap:wrap;gap:.2rem;margin:1.1rem 0 1.4rem;padding:.25rem;border:1px solid var(--line);border-radius:1.5rem;background:var(--panel)}",
    ".qi-tab{flex:1 1 auto;text-align:center;background:none;color:var(--muted);border-radius:999px;padding:.5rem .85rem;font-size:.92rem;white-space:nowrap}",
    "@media (max-width:30rem){.qi-tab{padding:.5rem .55rem;font-size:.88rem}}",
    ".qi-tab[aria-selected=true]{background-color:var(--accent);background-image:var(--accent-gradient,none);color:var(--accent-ink)}",

    /* Texte */
    ".qi-h{font-family:var(--serif);font-size:1.45rem;font-weight:600;letter-spacing:-.01em;line-height:1.2;margin:2rem 0 .4rem}",
    ".qi-panel>.qi-h:first-child{margin-top:0}",
    ".qi-lead{color:var(--muted);margin:0 0 1rem;max-width:34rem;font-size:.95rem}",

    /* Knöpfe */
    ".qi-btn{font:inherit;font-weight:600;font-size:.92rem;line-height:1.2;padding:.6rem 1.05rem;border:0;border-radius:999px;cursor:pointer;" +
      "background-color:var(--accent);background-image:var(--accent-gradient,none);color:var(--accent-ink)}",
    ".qi-btn.alt{background:var(--panel);color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--accent)}",
    ".qi-btn.block{width:100%;max-width:26rem;padding:.9rem 1.2rem;font-size:1rem}",
    ".qi-btn:disabled{opacity:.4;cursor:not-allowed}",
    ".qi-qty{display:inline-flex;gap:.15rem;padding:.2rem;margin:0 0 .6rem;border:1px solid var(--line);border-radius:999px;background:var(--panel)}",
    ".qi-qty button{background:none;color:var(--muted);padding:.3rem .85rem;border-radius:999px;font-size:.88rem;font-weight:600}",
    ".qi-qty button[aria-pressed=true]{background-color:var(--ink);background-image:none;color:var(--panel)}",

    /* Zeilen (Fabriken, Forschung, Expeditionen, Quallen-Shop) */
    ".qi-list{list-style:none;margin:0;padding:0}",
    ".qi-row{position:relative;display:grid;grid-template-columns:2.8rem minmax(0,1fr) auto;grid-template-areas:'d n c' 'd s s' '. a a';gap:.1rem .85rem;align-items:center;padding:.9rem 0 1.05rem;border-top:1px solid var(--line)}",
    ".qi-list>.qi-row:first-child{border-top:0}",
    ".qi-row.done{opacity:.6}",
    ".qi-disc{grid-area:d;align-self:start;width:2.8rem;height:2.8rem;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.45rem;background:color-mix(in srgb,var(--accent) 14%,var(--panel));box-shadow:inset 0 0 0 1px var(--line)}",
    ".qi-name{grid-area:n;font-weight:650;line-height:1.25}",
    ".qi-num{grid-area:c;font-family:var(--serif);font-size:1.6rem;font-weight:600;line-height:1;font-variant-numeric:tabular-nums;text-align:right}",
    ".qi-sub{grid-area:s;color:var(--muted);font-size:.85rem;line-height:1.4}",
    ".qi-acts{grid-area:a;display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.55rem}",
    ".qi-acts:empty{display:none}",
    ".qi-bar{position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--line)}",
    ".qi-bar i{display:block;height:100%;width:0;background:var(--accent);transition:width .3s}",

    /* Status und Fortschritt */
    ".qi-status{padding:.95rem 1.1rem;border-radius:12px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line);margin:0 0 1.2rem}",
    ".qi-status strong{display:block;font-family:var(--serif);font-size:1.25rem;font-weight:600;line-height:1.25}",
    ".qi-status .qi-btn{margin-top:.7rem}",
    ".qi-progress{height:6px;border-radius:3px;background:var(--line);margin:.65rem 0 0;overflow:hidden}",
    ".qi-progress i{display:block;height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--qi-glow));transition:width .3s}",
    ".qi-progtext{color:var(--muted);font-size:.85rem;margin:.4rem 0 .9rem}",

    /* Kacheln (Artefakte, Erfolge) */
    ".qi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(10.5rem,1fr));gap:.6rem;list-style:none;margin:0;padding:0}",
    ".qi-grid.small{grid-template-columns:repeat(auto-fill,minmax(8.5rem,1fr))}",
    ".qi-tile{display:flex;flex-direction:column;gap:.15rem;min-width:0;padding:.75rem .8rem;border-radius:12px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line)}",
    ".qi-tile .i{font-size:1.6rem;line-height:1.15}",
    ".qi-tile .n{font-weight:650;font-size:.9rem;line-height:1.25;overflow-wrap:anywhere}",
    ".qi-tile .d{color:var(--muted);font-size:.8rem;line-height:1.35}",
    ".qi-tile.on{box-shadow:inset 0 0 0 1.5px var(--accent);background:color-mix(in srgb,var(--accent) 8%,var(--panel))}",
    ".qi-tile.off{opacity:.62}",
    ".qi-tile.off .i{filter:grayscale(1)}",

    /* Sternkarte (Galaxien und Planeten) */
    ".qi-map{display:grid;grid-template-columns:repeat(auto-fill,minmax(6.6rem,1fr));gap:.5rem;list-style:none;margin:0 0 1rem;padding:0}",
    ".qi-gal{min-width:0;padding:.6rem .65rem;border-radius:10px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line)}",
    ".qi-gal.done{box-shadow:inset 0 0 0 1.5px var(--accent)}",
    ".qi-gal.cur{box-shadow:inset 0 0 0 2px var(--ink)}",
    ".qi-gal .n{font-size:.78rem;font-weight:650;line-height:1.25;overflow-wrap:anywhere}",
    ".qi-pips{display:flex;gap:3px;flex-wrap:wrap;margin-top:.45rem}",
    ".qi-pip{width:.55rem;height:.55rem;border-radius:50%;background:var(--line)}",
    ".qi-pip.on{background:var(--accent)}",
    ".qi-curgal{margin:0 0 1rem;font-size:.95rem}",

    /* Zahlen-Kacheln */
    ".qi-stats2{display:grid;grid-template-columns:repeat(auto-fill,minmax(9.5rem,1fr));gap:.6rem;margin:0 0 1rem}",
    ".qi-stat{padding:.65rem .8rem;border-radius:10px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line);min-width:0}",
    ".qi-stat .v{font-family:var(--serif);font-size:1.45rem;font-weight:600;line-height:1.15;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}",
    ".qi-stat .l{color:var(--muted);font-size:.8rem;line-height:1.3}",
    ".qi details{margin:.4rem 0 1rem;font-size:.92rem}",
    ".qi summary{cursor:pointer;font-weight:600}",
    ".qi details ul{margin:.5rem 0 0;padding-left:1.1rem;color:var(--muted)}",
    ".qi details p{margin:.5rem 0 0;color:var(--muted)}",

    /* Bewegung nur, wenn gewünscht */
    "@media (prefers-reduced-motion:no-preference){" +
      ".qi-bub{animation:qi-rise linear infinite}" +
      "@keyframes qi-rise{0%{transform:translateY(0);opacity:0}15%{opacity:.8}100%{transform:translateY(-22rem);opacity:0}}" +
      ".qi-float{animation:qi-up .8s ease-out forwards}" +
      "@keyframes qi-up{from{opacity:1;transform:translate(-50%,0)}to{opacity:0;transform:translate(-50%,-4.5rem)}}" +
      ".qi-gold{animation:qi-pulse 1s ease-in-out infinite alternate}" +
      "@keyframes qi-pulse{from{transform:scale(1)}to{transform:scale(1.1)}}}",
    "@media (prefers-reduced-motion:reduce){.qi-float{display:none}}"
  ].join("\n");

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function qbtn(text, cls) {
    var b = el("button", "qi-btn" + (cls ? " " + cls : ""), text);
    b.type = "button";
    return b;
  }

  // Eine Zeile mit Symbol, Name, Zahl rechts, Untertext, Knöpfen und Leiste unten
  function makeRow(icon, name) {
    var li = el("li", "qi-row");
    var disc = el("span", "qi-disc", icon);
    disc.setAttribute("aria-hidden", "true");
    var nm = el("div", "qi-name", name);
    var num = el("div", "qi-num");
    var sub = el("div", "qi-sub");
    var acts = el("div", "qi-acts");
    var bar = el("div", "qi-bar");
    var fill = el("i");
    bar.appendChild(fill);
    [disc, nm, num, sub, acts, bar].forEach(function (c) { li.appendChild(c); });
    return { li: li, name: nm, num: num, sub: sub, acts: acts, fill: fill };
  }

  function setFill(node, ratio) {
    node.style.width = Math.round(Math.max(0, Math.min(1, ratio)) * 100) + "%";
  }

  function tile(icon, name, desc) {
    var li = el("li", "qi-tile");
    var i = el("div", "i", icon), n = el("div", "n", name), d = el("div", "d", desc);
    li.appendChild(i);
    li.appendChild(n);
    li.appendChild(d);
    return { li: li, i: i, n: n, d: d };
  }

  function stat(label) {
    var box = el("div", "qi-stat");
    var v = el("div", "v"), l = el("div", "l", label);
    box.appendChild(v);
    box.appendChild(l);
    return { box: box, v: v };
  }

  // Erfolgsmeldung: bei mehr als 3 neuen Erfolgen nur die ersten drei nennen
  function achText(names, each) {
    var shown = names.length > 3 ? names.slice(0, 3).join(", ") + " und " + (names.length - 3) + " weitere" : names.join(", ");
    return "🏆 " + (names.length === 1 ? "Erfolg" : names.length + " Erfolge") + " freigeschaltet: " + shown + " (+" + Math.round(each * names.length * 100) + " % Produktion)";
  }

  function start(box) {
    if (!document.getElementById("qi-style")) {
      var st = document.createElement("style");
      st.id = "qi-style";
      st.textContent = CSS;
      document.head.appendChild(st);
    }

    var s = load();
    var qty = 1;                 // 1, 10, 100 oder "max"
    var tab = "fabriken";
    var welcome = "";
    var now0 = Date.now();
    var gap = (now0 - s.last) / 1000;
    if (gap > 1) {
      var got = earn(s, Math.min(gap, maxOffline(s)), now0);
      if (gap > 60 && got > 0) welcome = "Willkommen zurück! Dein Imperium hat in deiner Abwesenheit " + fmt(got) + " Perlen verdient.";
    }
    s.last = now0;

    var root = el("div", "qi");
    box.appendChild(root);

    // --- Meeres-Fenster ---
    var scene = el("section", "qi-scene");
    scene.setAttribute("aria-label", "Dein Unterwasser-Imperium");
    for (var bi = 0; bi < 9; bi++) {
      var bub = el("span", "qi-bub");
      var bsize = 0.4 + ((bi * 37) % 10) / 10 * 0.9;
      bub.setAttribute("aria-hidden", "true");
      bub.style.cssText = "left:" + (6 + bi * 11) + "%;width:" + bsize + "rem;height:" + bsize + "rem;animation-duration:" + (7 + (bi % 4) * 2) + "s;animation-delay:-" + (bi * 1.7) + "s";
      scene.appendChild(bub);
    }
    var inner = el("div", "qi-in");
    scene.appendChild(inner);

    var top = el("div", "qi-top");
    var stageBox = el("div");
    var stageEl = el("div", "qi-stage");
    var stageBar = el("div", "qi-stagebar");
    var stageFill = el("i");
    stageBar.appendChild(stageFill);
    stageBox.appendChild(stageEl);
    stageBox.appendChild(stageBar);
    var chipsEl = el("div", "qi-chips");
    var boostChip = el("span", "qi-chip");
    var clickChip = el("span", "qi-chip");
    boostChip.hidden = true;
    clickChip.hidden = true;
    chipsEl.appendChild(boostChip);
    chipsEl.appendChild(clickChip);
    top.appendChild(stageBox);
    top.appendChild(chipsEl);

    var coinsEl = el("p", "qi-count");
    var rateEl = el("p", "qi-rate");
    var bonusEl = el("p", "qi-bonus");

    var orbWrap = el("div", "qi-orbwrap");
    var clickBtn = el("button", "qi-orb");
    clickBtn.type = "button";
    var orbE = el("span", "e", "🦪"), orbV = el("span", "v");
    orbE.setAttribute("aria-hidden", "true");
    clickBtn.appendChild(orbE);
    clickBtn.appendChild(orbV);
    orbWrap.appendChild(clickBtn);

    var reef = el("div", "qi-reef");
    var gold = el("button", "qi-gold", "✨ Goldene Perle");
    gold.type = "button";
    gold.hidden = true;

    [top, coinsEl, rateEl, bonusEl, orbWrap, reef].forEach(function (c) { inner.appendChild(c); });
    scene.appendChild(gold);
    root.appendChild(scene);

    var note = el("p", "qi-note");
    note.setAttribute("aria-live", "polite");
    note.textContent = welcome;
    var ticker = el("p", "qi-ticker");
    root.appendChild(note);
    root.appendChild(ticker);

    // --- Reiter ---
    var tabsEl = el("div", "qi-tabs");
    tabsEl.setAttribute("role", "tablist");
    tabsEl.setAttribute("aria-label", "Bereiche");
    var tabBtns = {};
    [["fabriken", "🐚", "Fabriken"], ["forschung", "🔬", "Forschung"], ["expeditionen", "🧭", "Expeditionen"], ["erfolge", "🏆", "Erfolge"], ["imperium", "👑", "Imperium"]].forEach(function (t) {
      var b = el("button", "qi-tab", t[1] + " " + t[2]);
      b.type = "button";
      b.setAttribute("role", "tab");
      b.addEventListener("click", function () { b.blur(); tab = t[0]; showTab(); refresh(); });
      tabsEl.appendChild(b);
      tabBtns[t[0]] = b;
    });
    root.appendChild(tabsEl);

    function panel() {
      var p = el("div", "qi-panel");
      p.setAttribute("role", "tabpanel");
      root.appendChild(p);
      return p;
    }

    // --- Fabriken ---
    var panelF = panel();
    var qtyBox = el("div", "qi-qty");
    qtyBox.setAttribute("role", "group");
    qtyBox.setAttribute("aria-label", "Kaufmenge");
    var qtyBtns = [];
    [[1, "x1"], [10, "x10"], [100, "x100"], ["max", "Max"]].forEach(function (q) {
      var b = el("button", "", q[1]);
      b.type = "button";
      b.addEventListener("click", function () { b.blur(); qty = q[0]; refresh(); });
      qtyBox.appendChild(b);
      qtyBtns.push({ v: q[0], el: b });
    });
    panelF.appendChild(qtyBox);
    var shop = el("ul", "qi-list");
    var rows = BUILDINGS.map(function (b, i) {
      var r = makeRow(b.icon, b.name);
      var buyBtn = qbtn("");
      var upBtn = qbtn("", "alt");
      buyBtn.addEventListener("click", function () { if (buy(s, i, qty)) refresh(); });
      upBtn.addEventListener("click", function () { if (upgradeBuilding(s, i)) refresh(); });
      r.acts.appendChild(buyBtn);
      r.acts.appendChild(upBtn);
      shop.appendChild(r.li);
      r.buyBtn = buyBtn;
      r.upBtn = upBtn;
      return r;
    });
    panelF.appendChild(shop);

    // --- Forschung ---
    var panelR = panel();
    panelR.appendChild(el("h2", "qi-h", "Klick-Verbesserung"));
    var clickList = el("ul", "qi-list");
    var clickRow = makeRow("👆", "");
    var clickUp = qbtn("");
    clickUp.addEventListener("click", function () { if (upgradeClick(s)) refresh(); });
    clickRow.acts.appendChild(clickUp);
    clickList.appendChild(clickRow.li);
    panelR.appendChild(clickList);
    panelR.appendChild(el("h2", "qi-h", "Forschung"));
    panelR.appendChild(el("p", "qi-lead", "Jede Forschung gibt einen Bonus auf die gesamte Produktion. Er gilt bis zur nächsten Imperium-Erweiterung."));
    var rList = el("ul", "qi-list");
    var rRows = RESEARCH.map(function (r, i) {
      var row = makeRow("🔬", r.name);
      row.num.textContent = "+" + Math.round(r.bonus * 100) + " %";
      row.sub.textContent = "Mehr Produktion für alle Fabriken";
      var b = qbtn("");
      b.addEventListener("click", function () { if (buyResearch(s, i)) refresh(); });
      row.acts.appendChild(b);
      rList.appendChild(row.li);
      row.btn = b;
      return row;
    });
    panelR.appendChild(rList);

    // --- Expeditionen ---
    var panelE = panel();
    panelE.appendChild(el("p", "qi-lead", "Schicke eine Expedition in die Tiefe. Sie läuft auch weiter, wenn die Seite geschlossen ist. Du bekommst Perlen und mit etwas Glück ein Artefakt mit dauerhaftem Produktionsbonus."));
    var expBox = el("div", "qi-status");
    var expStatus = el("strong");
    var expProg = el("div", "qi-progress");
    var expFill = el("i");
    expProg.appendChild(expFill);
    var expCollect = qbtn("Belohnung abholen");
    expCollect.hidden = true;
    expBox.appendChild(expStatus);
    expBox.appendChild(expProg);
    expBox.appendChild(expCollect);
    panelE.appendChild(expBox);
    var expList = el("ul", "qi-list");
    var expRows = EXPEDITIONS.map(function (x, i) {
      var r = makeRow("🧭", x.name);
      var b = qbtn("Losschicken");
      b.addEventListener("click", function () { if (startExpedition(s, i, Date.now())) { save(s); refresh(); } });
      r.acts.appendChild(b);
      expList.appendChild(r.li);
      r.btn = b;
      return r;
    });
    panelE.appendChild(expList);
    panelE.appendChild(el("h2", "qi-h", "Artefakte"));
    var artInfo = el("p", "qi-lead");
    panelE.appendChild(artInfo);
    var artList = el("ul", "qi-grid small");
    var artRows = ARTIFACTS.map(function () {
      var t = tile("", "", "");
      artList.appendChild(t.li);
      return t;
    });
    panelE.appendChild(artList);
    expCollect.addEventListener("click", function () {
      var r = collectExpedition(s, Date.now(), Math.random);
      if (!r) return;
      note.textContent = "Die Expedition ist zurück! +" + fmt(r.perlen) + " Perlen" +
        (r.artifact >= 0 ? " und ein Artefakt: " + ARTIFACTS[r.artifact].icon + " " + ARTIFACTS[r.artifact].name + " (+" + Math.round(ARTIFACTS[r.artifact].bonus * 100) + " % Produktion)!" : ".");
      save(s);
      refresh();
    });

    // --- Erfolge ---
    var panelA = panel();
    var aInfo = el("p", "qi-lead");
    panelA.appendChild(aInfo);
    var aList = el("ul", "qi-grid");
    var aRows = ACHIEVEMENTS.map(function (a) {
      var t = tile("", a.name, a.desc);
      aList.appendChild(t.li);
      return t;
    });
    panelA.appendChild(aList);

    // --- Imperium ---
    var panelI = panel();
    panelI.appendChild(el("h2", "qi-h", "Imperium erweitern"));
    var pInfo = el("p", "qi-lead");
    panelI.appendChild(pInfo);
    var qStats = el("div", "qi-stats2");
    var stQ = stat("Quallen gesamt"), stFree = stat("Davon frei"), stBonus = stat("Bonus durch Quallen");
    [stQ, stFree, stBonus].forEach(function (x) { qStats.appendChild(x.box); });
    panelI.appendChild(qStats);
    var pBtn = qbtn("", "block");
    panelI.appendChild(pBtn);

    panelI.appendChild(el("h2", "qi-h", "Quallen-Shop"));
    var perkInfo = el("p", "qi-lead");
    panelI.appendChild(perkInfo);
    var perkList = el("ul", "qi-list");
    var perkRows = PERKS.map(function (p, i) {
      var r = makeRow("🪼", p.name);
      r.num.textContent = p.cost + (p.cost === 1 ? " Qualle" : " Quallen");
      r.num.style.fontSize = "1.05rem";
      r.sub.textContent = p.desc;
      var b = qbtn("");
      b.addEventListener("click", function () {
        if (buyPerk(s, i)) { note.textContent = "Gekauft: " + p.name + "."; save(s); refresh(); }
      });
      r.acts.appendChild(b);
      perkList.appendChild(r.li);
      r.btn = b;
      return r;
    });
    panelI.appendChild(perkList);

    panelI.appendChild(el("h2", "qi-h", "Planeten"));
    var planetInfo = el("p", "qi-lead");
    panelI.appendChild(planetInfo);
    var planetProg = el("div", "qi-progress");
    var planetFill = el("i");
    planetProg.appendChild(planetFill);
    var planetProgText = el("p", "qi-progtext");
    panelI.appendChild(planetProg);
    panelI.appendChild(planetProgText);
    var galaxyMap = el("ul", "qi-map");
    var galCells = GALAXIES.map(function (g) {
      var li = el("li", "qi-gal");
      var n = el("div", "n", "🌌 " + g.name);
      var pips = el("div", "qi-pips");
      var list = [];
      for (var k = 0; k < g.size; k++) {
        var pip = el("span", "qi-pip");
        pips.appendChild(pip);
        list.push(pip);
      }
      li.title = "Bonus bei vollständiger Besiedlung: " + g.desc;
      li.appendChild(n);
      li.appendChild(pips);
      galaxyMap.appendChild(li);
      return { li: li, pips: list };
    });
    panelI.appendChild(galaxyMap);
    var planetList = el("p", "qi-curgal");
    panelI.appendChild(planetList);
    var planetBtn = qbtn("", "block");
    panelI.appendChild(planetBtn);
    var det = el("details");
    det.appendChild(el("summary", "", "Galaxien, Boni und Meilensteine"));
    det.appendChild(el("p", "", "Die Planeten sind in Galaxien geordnet, und jede vollständige Galaxie gibt einen eigenen Bonus. Planeten kommen einzeln, und jeder braucht mehr Quallen als der vorherige. Beim Gründen verlierst du alles, auch alle Quallen und Quallen-Fähigkeiten. Erfolge, Artefakte und Planeten bleiben."));
    var galaxyList = el("ul");
    var milestoneList = el("ul");
    det.appendChild(galaxyList);
    det.appendChild(milestoneList);
    panelI.appendChild(det);

    panelI.appendChild(el("h2", "qi-h", "Statistik"));
    var statsBox = el("div", "qi-stats2");
    var statDefs = ["Insgesamt verdient", "Klicks", "Imperium-Erweiterungen", "Planeten", "Planet-Gründungen", "Titel", "Erfolge", "Goldene Perlen gefangen", "Expeditionen"].map(function (l) {
      var x = stat(l);
      statsBox.appendChild(x.box);
      return x;
    });
    panelI.appendChild(statsBox);
    var resetBtn = el("button", "link", "Ganz neu beginnen");
    resetBtn.type = "button";
    panelI.appendChild(resetBtn);

    function showTab() {
      var map = { fabriken: panelF, forschung: panelR, expeditionen: panelE, erfolge: panelA, imperium: panelI };
      Object.keys(map).forEach(function (k) { map[k].hidden = k !== tab; });
      Object.keys(tabBtns).forEach(function (k) { tabBtns[k].setAttribute("aria-selected", String(k === tab)); });
    }

    // Riff: eine Plakette je Fabrik, die du besitzt
    var reefSig = "";
    function renderReef() {
      var sig = s.owned.join(",");
      if (sig === reefSig) return;
      reefSig = sig;
      reef.textContent = "";
      var any = false;
      BUILDINGS.forEach(function (b, i) {
        if (!s.owned[i]) return;
        any = true;
        var r = el("span", "r");
        r.title = b.name;
        r.appendChild(el("b", "", b.icon));
        r.appendChild(document.createTextNode(String(s.owned[i])));
        reef.appendChild(r);
      });
      if (!any) reef.appendChild(el("p", "qi-empty", "Das Meer ist noch leer. Sammle Perlen und baue die erste Algenfarm."));
    }

    function refresh() {
      var now = Date.now();
      var rate = cps(s, now);
      var count = buildingCount(s);

      coinsEl.textContent = fmt(s.coins);
      rateEl.textContent = "Perlen, +" + fmt(rate) + " pro Sekunde";
      var bonus = multiplier(s, now) / (boostActive(s, now) ? BOOST_FACTOR : 1);
      bonusEl.textContent = "Bonus auf alles: x" + bonus.toFixed(2).replace(".", ",");

      var prev = 0, next = null;
      STAGES.forEach(function (stg) { if (count >= stg[0]) prev = stg[0]; else if (next === null) next = stg[0]; });
      stageEl.textContent = stageName(s) + ", " + count + (count === 1 ? " Fabrik" : " Fabriken");
      setFill(stageFill, next === null ? 1 : (count - prev) / (next - prev));
      stageBar.title = next === null ? "Höchste Stufe erreicht" : "Nächste Stufe bei " + next + " Fabriken";

      boostChip.hidden = !boostActive(s, now);
      if (!boostChip.hidden) boostChip.textContent = "🌊 Strömungsrausch x" + BOOST_FACTOR + ", noch " + Math.ceil((s.boostUntil - now) / 1000) + " s";
      clickChip.hidden = !(now < s.clickBoostUntil);
      if (!clickChip.hidden) clickChip.textContent = "👆 Klick-Segen x" + CLICK_BOOST + ", noch " + Math.ceil((s.clickBoostUntil - now) / 1000) + " s";

      var cv = fmt(clickValue(s, now));
      orbV.textContent = "+" + cv;
      clickBtn.setAttribute("aria-label", "Perlen sammeln, +" + cv);
      renderReef();
      Object.keys(tabBtns).forEach(function (k) { tabBtns[k].setAttribute("aria-selected", String(k === tab)); });

      if (tab === "fabriken") {
        qtyBtns.forEach(function (q) { q.el.setAttribute("aria-pressed", String(q.v === qty)); });
        BUILDINGS.forEach(function (b, i) {
          var r = rows[i];
          var show = i === 0 || s.owned[i] > 0 || s.total >= b.cost * 0.15 || (i > 0 && s.owned[i - 1] > 0 && s.total >= b.cost * 0.05);
          r.li.hidden = !show;
          if (!show) return;
          var per = perBuilding(s, i) * multiplier(s, now);
          var n = qty === "max" ? Math.max(1, maxAffordable(s, i)) : qty;
          var c = costN(i, s.owned[i], n);
          var share = rate > 0 ? Math.round(s.owned[i] * per / rate * 100) : 0;
          r.num.textContent = String(s.owned[i]);
          r.sub.textContent = "Je " + fmt(per) + " " + b.makes + " pro Sekunde" + (s.owned[i] ? ", das sind " + share + " % deiner Perlen" : "");
          r.buyBtn.textContent = "Bauen" + (n > 1 ? " x" + n : "") + " (" + fmt(c) + ")";
          r.buyBtn.disabled = s.coins < c;
          setFill(r.fill, s.coins / c);
          if (canUpgrade(s, i)) {
            var price = upgradePrice(i, s.mult[i]);
            r.upBtn.hidden = false;
            r.upBtn.textContent = "Ertrag x2 (" + fmt(price) + ")";
            r.upBtn.disabled = s.coins < price;
          } else {
            r.upBtn.hidden = true;
          }
        });
      } else if (tab === "forschung") {
        if (s.clickLevel < CLICK_UPGRADES.length) {
          var u = CLICK_UPGRADES[s.clickLevel];
          clickRow.name.textContent = u.name;
          clickRow.num.textContent = "x2";
          clickRow.sub.textContent = "Verdoppelt den Ertrag pro Klick (Stufe " + (s.clickLevel + 1) + " von " + CLICK_UPGRADES.length + ")";
          clickUp.hidden = false;
          clickUp.textContent = "Verbessern (" + fmt(u.cost) + ")";
          clickUp.disabled = s.coins < u.cost;
          setFill(clickRow.fill, s.coins / u.cost);
          clickRow.li.classList.remove("done");
        } else {
          clickRow.name.textContent = "Alle Stufen gekauft";
          clickRow.num.textContent = "";
          clickRow.sub.textContent = "Dein Ertrag pro Klick ist voll ausgebaut.";
          clickUp.hidden = true;
          setFill(clickRow.fill, 1);
          clickRow.li.classList.add("done");
        }
        RESEARCH.forEach(function (r, i) {
          var row = rRows[i], b = row.btn;
          row.li.classList.toggle("done", !!s.research[i]);
          if (s.research[i]) { b.textContent = "✓ erforscht"; b.disabled = true; setFill(row.fill, 1); }
          else { b.textContent = "Erforschen (" + fmt(r.cost) + ")"; b.disabled = s.coins < r.cost; setFill(row.fill, s.coins / r.cost); }
        });
      } else if (tab === "expeditionen") {
        var running = expActive(s), ready = expReady(s, now);
        if (!running) {
          expStatus.textContent = "Keine Expedition unterwegs";
          setFill(expFill, 0);
        } else if (ready) {
          expStatus.textContent = "Die Expedition ist zurück!";
          setFill(expFill, 1);
        } else {
          var total = expSecs(s, s.exp.i) * 1000;
          expStatus.textContent = EXPEDITIONS[s.exp.i].name + ": noch " + fmtTime((s.exp.end - now) / 1000);
          setFill(expFill, 1 - (s.exp.end - now) / total);
        }
        expProg.hidden = !running;
        expCollect.hidden = !ready;
        EXPEDITIONS.forEach(function (x, i) {
          var r = expRows[i];
          var ch = Math.round(Math.min(1, x.chance * (perkOn(s, 8) ? 1.5 : 1)) * 100);
          r.num.textContent = fmtTime(expSecs(s, i));
          r.sub.textContent = "Perlen für " + fmtTime(x.secs * expReward(s)) + " Produktion, " + ch + " % Chance auf ein Artefakt";
          r.btn.disabled = running;
        });
        artInfo.textContent = artCount(s) + " von " + ARTIFACTS.length + " Artefakten gefunden (+" + Math.round((artFactor(s) - 1) * 100) + " % Produktion). Artefakte bleiben nach einer Imperium-Erweiterung erhalten.";
        artRows.forEach(function (t, i) {
          var a = ARTIFACTS[i], have = !!s.artifacts[i];
          t.li.className = "qi-tile " + (have ? "on" : "off");
          t.i.textContent = have ? a.icon : "❔";
          t.n.textContent = have ? a.name : "Unbekanntes Artefakt";
          t.d.textContent = have ? "+" + Math.round(a.bonus * 100) + " % Produktion" : "Noch nicht gefunden";
        });
      } else if (tab === "erfolge") {
        aInfo.textContent = achCount(s) + " von " + ACHIEVEMENTS.length + " Erfolgen. Jeder gibt dauerhaft +" + Math.round(achEach(s) * 100) +
          " % Produktion (jetzt +" + Math.round(achEach(s) * achCount(s) * 100) + " %) und bleibt nach einer Imperium-Erweiterung erhalten.";
        aRows.forEach(function (t, i) {
          var have = !!s.ach[i];
          t.li.className = "qi-tile " + (have ? "on" : "off");
          t.i.textContent = have ? "🏆" : "🔒";
        });
      } else {
        var g = prestigeGain(s);
        pInfo.textContent = "Beim Erweitern verlierst du alle Perlen, Fabriken und Forschungen. Dafür bekommst du Quallen, und jede gibt dauerhaft +" +
          Math.round(quallenEach(s) * 100) + " % Produktion. In dieser Runde hast du " + fmt(s.total) + " Perlen verdient.";
        stQ.v.textContent = String(s.quallen);
        stFree.v.textContent = String(freeQuallen(s));
        stBonus.v.textContent = "+" + Math.round(quallenEach(s) * freeQuallen(s) * 100) + " %";
        pBtn.textContent = g >= 1 ? "Imperium erweitern (+" + g + " Quallen)" : "Imperium erweitern (ab " + fmt(PRESTIGE_DIV) + " Perlen in einer Runde)";
        pBtn.disabled = g < 1;

        perkInfo.textContent = "Tausche freie Quallen gegen dauerhafte Fähigkeiten. Ausgegebene Quallen geben keinen Produktionsbonus mehr. Du hast " + freeQuallen(s) + " freie Quallen.";
        PERKS.forEach(function (p, i) {
          var r = perkRows[i], b = r.btn;
          r.li.classList.toggle("done", !!s.perks[i]);
          if (s.perks[i]) { b.textContent = "✓ gekauft"; b.disabled = true; setFill(r.fill, 1); }
          else { b.textContent = "Kaufen (" + p.cost + (p.cost === 1 ? " Qualle" : " Quallen") + ")"; b.disabled = freeQuallen(s) < p.cost; setFill(r.fill, freeQuallen(s) / p.cost); }
        });

        var pg = planetGain(s);
        var allPlanets = s.planets >= TOTAL_PLANETS;
        planetInfo.textContent = "Jeder Planet gibt dauerhaft +" + Math.round(planetEach(s) * 100) + " % Produktion. Du hast " + s.planets + " von " + TOTAL_PLANETS + " Planeten (+" +
          Math.round(planetEach(s) * s.planets * 100) + " %). Das Gründen setzt auch alle Quallen und Quallen-Fähigkeiten zurück.";
        planetProg.hidden = allPlanets;
        planetProgText.hidden = allPlanets;
        if (!allPlanets) {
          setFill(planetFill, s.quallen / planetNeed(s));
          planetProgText.textContent = s.quallen + " von " + planetNeed(s) + " Quallen für den nächsten Planeten";
        }
        planetBtn.textContent = allPlanets ? "Alle Planeten gegründet" : pg >= 1 ? "Planet gründen (+1 Planet)" : "Planet gründen (ab " + planetNeed(s) + " Quallen)";
        planetBtn.disabled = pg < 1;

        var cg = currentGalaxy(s), inGal = Math.min(s.planets - galaxyStart(cg), GALAXIES[cg].size), names = [];
        for (var pi = galaxyStart(cg); pi < s.planets && pi < GAL_END[cg]; pi++) names.push(planetName(pi));
        planetList.textContent = allPlanets ? "Alle Galaxien sind vollständig besiedelt." :
          "Aktuelle Galaxie: " + GALAXIES[cg].name + ", " + inGal + " von " + GALAXIES[cg].size + " Planeten" + (names.length ? " (" + names.join(", ") + ")" : "") + ". Bonus bei Fertigstellung: " + GALAXIES[cg].desc + ".";
        galaxyList.textContent = "";
        GALAXIES.forEach(function (gx, gi) {
          var done = galaxyDone(s, gi), cur = gi === cg && !done;
          var have = Math.max(0, Math.min(s.planets - galaxyStart(gi), gx.size));
          galCells[gi].li.className = "qi-gal" + (done ? " done" : cur ? " cur" : "");
          galCells[gi].pips.forEach(function (pip, k) { pip.className = "qi-pip" + (k < have ? " on" : ""); });
          galaxyList.appendChild(el("li", "", (done ? "✓ " : cur ? "▶ " : "🔒 ") + gx.name + " (" + have + "/" + gx.size + " Planeten): " + gx.desc));
        });
        milestoneList.textContent = "";
        PLANET_MILESTONES.forEach(function (m) {
          milestoneList.appendChild(el("li", "", (s.planets >= m.need ? "✓ " : "🔒 ") + m.need + (m.need === 1 ? " Planet: " : " Planeten: ") + m.desc));
        });

        var vals = [fmt(s.allTime) + " Perlen", fmt(s.clicks), String(s.resets), String(s.planets), String(s.pResets), titleFor(s.quallen),
          achCount(s) + " von " + ACHIEVEMENTS.length, String(s.golds), String(s.expDone)];
        vals.forEach(function (v, i) { statDefs[i].v.textContent = v; });
      }
    }

    clickBtn.addEventListener("click", function () {
      var v = clickValue(s, Date.now());
      gain(s, v);
      s.clicks++;
      var f = el("span", "qi-float", "+" + fmt(v));
      orbWrap.appendChild(f);
      setTimeout(function () { if (f.parentNode) f.parentNode.removeChild(f); }, 900);
      refresh();
    });

    pBtn.addEventListener("click", function () {
      var g = prestigeGain(s);
      if (g < 1) return;
      if (window.confirm("Imperium erweitern? Du verlierst alle Perlen, Fabriken und Forschungen und bekommst " + g + " Quallen: +" + Math.round(g * quallenEach(s) * 100) + " % Produktion für immer (oder Fähigkeiten im Quallen-Shop).")) {
        prestige(s, Date.now());
        reefSig = "";
        note.textContent = "Dein Imperium wächst! Du hast jetzt " + s.quallen + " Quallen.";
        save(s);
        refresh();
      }
    });

    planetBtn.addEventListener("click", function () {
      var g = planetGain(s);
      if (g < 1) return;
      if (window.confirm("Planet gründen? Du verlierst alles: Perlen, Fabriken, Forschungen, Quallen und Quallen-Fähigkeiten. Du bekommst " + g +
        (g === 1 ? " Planet" : " Planeten") + " (+" + Math.round(g * planetEach(s) * 100) + " % Produktion für immer). Erfolge, Artefakte und Planeten bleiben.")) {
        var doneBefore = galaxiesDone(s);
        planetize(s, Date.now());
        reefSig = "";
        var doneAfter = galaxiesDone(s);
        note.textContent = doneAfter > doneBefore ?
          "Galaxie vollständig: " + GALAXIES[doneAfter - 1].name + "! Bonus: " + GALAXIES[doneAfter - 1].desc + "." :
          "Ein neuer Planet! Du hast jetzt " + s.planets + " Planeten.";
        var newAch = checkAch(s);   // sofort prüfen, damit die Erfolgsmeldung diese Meldung nicht überschreibt
        if (newAch.length) note.textContent += " " + achText(newAch, achEach(s));
        save(s);
        refresh();
      }
    });

    resetBtn.addEventListener("click", function () {
      if (window.confirm("Wirklich ganz neu beginnen? Alles geht verloren, auch deine Quallen.")) {
        s = newState();
        reefSig = "";
        note.textContent = "";
        save(s);
        refresh();
      }
    });

    // --- Goldene Perle ---
    var nextGold = Date.now() + 15000 + Math.random() * 30000, goldHideAt = 0;
    gold.addEventListener("click", function () {
      var now = Date.now();
      gold.hidden = true;
      nextGold = now + (45000 + Math.random() * 65000) * goldGap(s);
      s.golds++;
      var roll = Math.random();
      var ownedIdx = [];
      s.owned.forEach(function (n, i) { if (n > 0) ownedIdx.push(i); });
      if (roll < 0.45) {
        var amount = rainAmount(s, now);
        gain(s, amount);
        note.textContent = "Perlenregen! Du bekommst " + fmt(amount) + " Perlen.";
      } else if (roll < 0.75) {
        s.boostUntil = now + BOOST_SECONDS * boostLen(s) * 1000;
        note.textContent = "Strömungsrausch! " + BOOST_SECONDS * boostLen(s) + " Sekunden lang x" + BOOST_FACTOR + " Produktion.";
      } else if (roll < 0.9) {
        s.clickBoostUntil = now + CLICK_BOOST_SECONDS * boostLen(s) * 1000;
        note.textContent = "Klick-Segen! " + CLICK_BOOST_SECONDS * boostLen(s) + " Sekunden lang x" + CLICK_BOOST + " Ertrag pro Klick.";
      } else if (ownedIdx.length) {
        var gi = ownedIdx[Math.floor(Math.random() * ownedIdx.length)], gn = 1 + Math.floor(Math.random() * 3);
        s.owned[gi] += gn;
        note.textContent = "Geschenk des Meeres! " + gn + " × " + BUILDINGS[gi].name + " gratis.";
      } else {
        var amount2 = rainAmount(s, now);
        gain(s, amount2);
        note.textContent = "Perlenregen! Du bekommst " + fmt(amount2) + " Perlen.";
      }
      refresh();
    });

    var lastNews = 0, newsIdx = -1;
    function showNews(now) {
      var pool = newsPool(s);
      if (!pool.length) return;
      var i;
      do { i = Math.floor(Math.random() * pool.length); } while (pool.length > 1 && i === newsIdx);
      newsIdx = i;
      ticker.textContent = "📰 " + pool[i][1];
      lastNews = now;
    }
    showNews(Date.now());

    var lastTick = Date.now(), lastSave = Date.now();
    var timer = setInterval(function () {
      var now = Date.now();
      earn(s, Math.min((now - lastTick) / 1000, maxOffline(s)), now);
      lastTick = now;
      if (now - lastNews > 15000) showNews(now);
      var fresh = checkAch(s);
      if (fresh.length) note.textContent = achText(fresh, achEach(s));
      if (now - lastSave > 3000) { save(s); lastSave = now; }
      if (!gold.hidden && now > goldHideAt) { gold.hidden = true; nextGold = now + (45000 + Math.random() * 65000) * goldGap(s); }
      if (gold.hidden && now >= nextGold) {
        gold.style.left = (5 + Math.random() * 60) + "%";
        gold.style.top = (10 + Math.random() * 55) + "%";
        gold.hidden = false;
        goldHideAt = now + 12000;
      }
      refresh();
    }, 100);

    showTab();
    refresh();

    return function stop() {
      clearInterval(timer);
      save(s);
    };
  }

  (window.Spiele = window.Spiele || []).push({
    id: "quallenimperium",
    name: "Quallen-Imperium",
    start: start,
    _engine: {
      BUILDINGS: BUILDINGS, RESEARCH: RESEARCH, CLICK_UPGRADES: CLICK_UPGRADES, MULT_RULES: MULT_RULES,
      GALAXIES: GALAXIES, GAL_END: GAL_END, TOTAL_PLANETS: TOTAL_PLANETS, galaxyDone: galaxyDone, galaxiesDone: galaxiesDone,
      galaxyFactor: galaxyFactor, planetEach: planetEach, planetName: planetName,
      PLANETS: PLANETS, PLANET_MILESTONES: PLANET_MILESTONES, planetNeed: planetNeed, planetGain: planetGain, planetize: planetize, planetFactor: planetFactor,
      ARTIFACTS: ARTIFACTS, EXPEDITIONS: EXPEDITIONS, NEWS: NEWS, newsPool: newsPool, artFactor: artFactor, artCount: artCount,
      startExpedition: startExpedition, collectExpedition: collectExpedition, expSecs: expSecs, fmtTime: fmtTime, achEach: achEach,
      PERKS: PERKS, buyPerk: buyPerk, freeQuallen: freeQuallen, quallenEach: quallenEach, maxOffline: maxOffline,
      titleFor: titleFor, CLICK_BOOST: CLICK_BOOST, ACHIEVEMENTS: ACHIEVEMENTS, checkAch: checkAch, achCount: achCount, achFactor: achFactor, padTo: padTo,
      newState: newState, cost: cost, costN: costN, maxAffordable: maxAffordable, buy: buy, cps: cps, baseCps: baseCps,
      clickValue: clickValue, upgradeBuilding: upgradeBuilding, canUpgrade: canUpgrade, upgradePrice: upgradePrice,
      upgradeClick: upgradeClick, buyResearch: buyResearch, earn: earn, gain: gain, prestigeGain: prestigeGain, prestige: prestige,
      multiplier: multiplier, stageName: stageName, fmt: fmt, buildingCount: buildingCount, PRESTIGE_DIV: PRESTIGE_DIV
    }
  });
})();

;
// ===== quallenrunner.js =====
// © 2026 BlaueQualle. Alle Rechte vorbehalten.
// Spiel: Quallen-Runner (Endlos-Läufer unter Wasser: springen und ducken, das Tempo steigt)
(function () {
  "use strict";

  var W = 600, H = 200, GROUND = 168;
  var DINO_X = 60, DINO_W = 34, STAND_H = 44, DUCK_H = 26;
  var GRAVITY = 2400, JUMP_V = 640;

  // ---------- Spielregeln (getrennt von der Zeichnung) ----------
  function newState() {
    return { t: 0, dist: 0, score: 0, speed: 280, y: 0, vy: 0, onGround: true, duck: false, obstacles: [], nextIn: 520, dead: false };
  }

  // y = Höhe über dem Boden. inp = { jump, duck }. rnd = Zufallsfunktion.
  function step(s, inp, rnd, dt) {
    if (s.dead) return;
    s.t += dt;
    s.speed = Math.min(280 + s.score * 0.4, 650);
    s.dist += s.speed * dt;
    s.score = Math.floor(s.dist / 10);

    if (inp.jump && s.onGround) { s.vy = JUMP_V; s.onGround = false; }
    s.duck = !!inp.duck && s.onGround;
    if (!s.onGround) {
      s.vy -= GRAVITY * (inp.duck ? 1.8 : 1) * dt;
      s.y += s.vy * dt;
      if (s.y <= 0) { s.y = 0; s.vy = 0; s.onGround = true; }
    }

    s.nextIn -= s.speed * dt;
    if (s.nextIn <= 0) spawn(s, rnd);

    for (var i = 0; i < s.obstacles.length; i++) {
      var o = s.obstacles[i];
      o.x -= (s.speed + (o.kind === "bird" ? 60 : 0)) * dt;   // Fische schwimmen schneller
    }
    s.obstacles = s.obstacles.filter(function (o) { return o.x + o.w > -20; });

    var dh = s.duck ? DUCK_H : STAND_H;
    var left = DINO_X + 4, right = DINO_X + DINO_W - 4, bottom = s.y + 3, top = s.y + dh - 3;
    for (var j = 0; j < s.obstacles.length; j++) {
      var b = s.obstacles[j];
      var bl = b.x + 3, br = b.x + b.w - 3, bb = b.y + 3, bt = b.y + b.h - 3;
      if (right > bl && left < br && top > bb && bottom < bt) { s.dead = true; return; }
    }
  }

  function spawn(s, rnd) {
    var o;
    if (s.score > 300 && rnd() < 0.28) {
      var levels = [10, 34, 70];            // tief (Kugelfisch), mittel (ducken), hoch (drunter durchschwimmen)
      o = { kind: "bird", x: W + 20, y: levels[Math.floor(rnd() * 3)], w: 34, h: 24 };
    } else {
      var stems = 1 + Math.floor(rnd() * (s.score > 150 ? 3 : 2));
      o = { kind: "cactus", x: W + 20, y: 0, w: 12 + stems * 11, h: 30 + Math.floor(rnd() * 17), stems: stems };
    }
    s.obstacles.push(o);
    s.nextIn = o.w + s.speed * 0.8 + 60 + rnd() * s.speed * 0.7;
  }

  // ---------- Zeichnen ----------
  function start(box) {
    // Fokus vom Knopf im Spiel-Menü lösen, damit Leertaste und Pfeiltasten im Spiel ankommen
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

    var canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.className = "game-canvas";
    canvas.style.aspectRatio = W + " / " + H;
    canvas.style.maxWidth = "38rem";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Quallen-Runner: eine Qualle springt über Korallen");
    var ctx = canvas.getContext("2d");

    var info = document.createElement("p");
    info.className = "msg";
    info.setAttribute("aria-live", "polite");

    var startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.textContent = "Start";

    var keys = { jump: false, duck: false };
    var pad = document.createElement("div");
    pad.className = "steer";
    pad.style.maxWidth = "38rem";
    [["Springen", "jump"], ["Ducken (halten)", "duck"]].forEach(function (d) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pad-btn";
      b.textContent = d[0];
      b.style.touchAction = "none";
      b.addEventListener("pointerdown", function (e) { e.preventDefault(); keys[d[1]] = true; if (d[1] === "jump") begin(); });
      var off = function () { keys[d[1]] = false; };
      b.addEventListener("pointerup", off);
      b.addEventListener("pointerleave", off);
      b.addEventListener("pointercancel", off);
      b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      pad.appendChild(b);
    });

    var row = document.createElement("div");
    row.className = "row";
    row.appendChild(startBtn);
    row.appendChild(info);
    box.appendChild(canvas);
    box.appendChild(row);
    box.appendChild(pad);

    var s = newState();
    var running = false, raf = 0, prev = 0, jumpQueued = false;
    var offset = 0, best = 0, variantCounter = 0;
    var bubbles = [];
    for (var n = 0; n < 16; n++) {
      bubbles.push({ x: Math.random() * W, y: Math.random() * GROUND, r: 1.5 + Math.random() * 3, v: 10 + Math.random() * 22 });
    }
    try { best = Number(localStorage.getItem("quallen-best")) || 0; } catch (e) {}

    function css(name, fallback) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    }

    function scoreText() { return "Punkte: " + s.score + " · Rekord: " + best; }

    function begin() {
      if (running) return;
      s = newState();
      running = true;
      startBtn.textContent = "Neustart";
      info.textContent = scoreText();
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function crash() {
      running = false;
      if (s.score > best) {
        best = s.score;
        try { localStorage.setItem("quallen-best", String(best)); } catch (e) {}
      }
      info.textContent = "Game over. " + scoreText();
      draw();
    }

    function line(x1, y1, x2, y2) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    function dot(x, y, r) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Hintergrund: Wasser, Lichtstrahlen, Seegras, Blasen, Sand ---
    function drawBackground() {
      var g = ctx.createLinearGradient(0, 0, 0, GROUND);
      g.addColorStop(0, "#8ae0f5");
      g.addColorStop(0.55, "#2a8fc2");
      g.addColorStop(1, "#0d5a8a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, GROUND);

      ctx.fillStyle = "rgba(255,255,255,0.08)";
      for (var i = 0; i < 4; i++) {
        var rx = ((i * 170 + s.t * 6) % (W + 120)) - 60;
        ctx.beginPath();
        ctx.moveTo(rx, 0);
        ctx.lineTo(rx + 40, 0);
        ctx.lineTo(rx - 50, GROUND);
        ctx.lineTo(rx - 110, GROUND);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = "rgba(8,70,110,0.5)";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      for (var x = -((offset * 0.3) % 120) - 120; x < W + 120; x += 120) {
        for (var k = 0; k < 2; k++) {
          var bx = x + 30 + k * 38;
          var sway = Math.sin(s.t * 1.5 + bx * 0.05) * 5;
          ctx.beginPath();
          ctx.moveTo(bx, GROUND);
          ctx.quadraticCurveTo(bx + sway, GROUND - 28, bx + sway * 1.6, GROUND - 56 - k * 12);
          ctx.stroke();
        }
      }

      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      bubbles.forEach(function (b) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
      });

      ctx.fillStyle = "#e4cf98";
      ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = "#c9b176";
      ctx.fillRect(0, GROUND, W, 3);
      for (var p = -(offset % 50); p < W; p += 50) {
        ctx.fillRect(p + 8, GROUND + 14, 12, 3);
        ctx.fillRect(p + 30, GROUND + 24, 7, 3);
      }
    }

    // --- Die Qualle ---
    function mixHex(hex, amount) {          // mit Weiß mischen (heller machen)
      var m = /^#([0-9a-f]{6})$/i.exec(hex);
      if (!m) return hex;
      var n = parseInt(m[1], 16), r = (n >> 16) & 255, g = (n >> 8) & 255, bl = n & 255;
      function mx(c) { return Math.round(c + (255 - c) * amount); }
      return "rgb(" + mx(r) + "," + mx(g) + "," + mx(bl) + ")";
    }

    function drawJelly() {
      var accent = css("--accent", "#2447d6");
      var light = mixHex(accent, 0.35), pale = mixHex(accent, 0.7);
      var cx = DINO_X + DINO_W / 2, yb = GROUND - s.y, t = s.t;
      var air = !s.onGround, duck = s.duck;
      var pulse = 1 + 0.07 * Math.sin(t * 10);
      var rx, ry, cy, tl;
      if (duck) { rx = 21; ry = 9; cy = yb - 12; tl = 9; }
      else if (air) { rx = 15; ry = 17; cy = yb - 28; tl = 26; }
      else { rx = 17 * (2 - pulse); ry = 16 * pulse; cy = yb - 26 + Math.sin(t * 9) * 1.5; tl = 22; }

      ctx.strokeStyle = pale;
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.globalAlpha = 0.9;
      for (var i = -1.5; i <= 1.5; i += 1) {
        var tx = cx + i * (rx / 2.2);
        ctx.beginPath();
        ctx.moveTo(tx, cy);
        for (var j = 1; j <= 4; j++) {
          var f = j / 4;
          ctx.lineTo(tx + Math.sin(t * 8 + i * 1.7 + j * 1.3) * (air ? 1.5 : 3.5) * f, cy + tl * f);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      ctx.shadowColor = "rgba(255,255,255,0.75)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * 0.62, ry * 0.6, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.ellipse(cx - rx * 0.4, cy - ry * 0.55, rx * 0.28, ry * 0.18, -0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0b2a3d";
      dot(cx - 4, cy - ry * 0.25, 2);
      dot(cx + 5, cy - ry * 0.25, 2);
    }

    // --- Korallen am Boden (drei Arten) ---
    function drawCoral(o) {
      if (o.variant === undefined) o.variant = variantCounter++ % 3;
      var v = o.variant, n = o.stems, base = GROUND;
      var cols = [["#ff5d8f", "#ffb3c9"], ["#ff8f3d", "#ffd2a6"], ["#a447c4", "#e2a9f0"]][v];
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (var i = 0; i < n; i++) {
        var cx = o.x + o.w / 2 + (i - (n - 1) / 2) * 11;
        var hh = o.h - (i % 2) * 8;
        ctx.strokeStyle = cols[0];
        ctx.fillStyle = cols[0];
        if (v === 0) {                       // Geweihkoralle
          ctx.lineWidth = 8;
          line(cx, base, cx, base - hh);
          ctx.lineWidth = 6;
          line(cx, base - hh * 0.5, cx - 10, base - hh * 0.78);
          line(cx, base - hh * 0.32, cx + 10, base - hh * 0.6);
          ctx.fillStyle = cols[1];
          dot(cx, base - hh, 4.2);
          dot(cx - 10, base - hh * 0.78, 3.4);
          dot(cx + 10, base - hh * 0.6, 3.4);
        } else if (v === 1) {                // Röhrenkoralle
          ctx.fillRect(cx - 6, base - hh, 12, hh);
          ctx.fillStyle = cols[1];
          ctx.beginPath();
          ctx.ellipse(cx, base - hh, 6.5, 3.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(60,20,0,0.35)";
          ctx.beginPath();
          ctx.ellipse(cx, base - hh, 3.6, 1.8, 0, 0, Math.PI * 2);
          ctx.fill();
        } else {                             // Fächerkoralle
          ctx.beginPath();
          ctx.moveTo(cx, base);
          ctx.lineTo(cx - 13, base - hh + 6);
          ctx.quadraticCurveTo(cx, base - hh - 10, cx + 13, base - hh + 6);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = cols[1];
          ctx.lineWidth = 2;
          line(cx, base - 3, cx - 8, base - hh + 7);
          line(cx, base - 3, cx, base - hh + 1);
          line(cx, base - 3, cx + 8, base - hh + 7);
        }
      }
    }

    // --- Meerestiere (tief: Kugelfisch, mittel: Clownfisch zum Ducken, hoch: Fischschwarm) ---
    function drawFish(o) {
      var cy = GROUND - o.y - 12, x = o.x, flap = Math.sin(s.t * 14) * 2;
      if (o.y < 20) {
        ctx.fillStyle = "#e9b933";
        ctx.beginPath();
        ctx.moveTo(x + 29, cy);
        ctx.lineTo(x + 37, cy - 6 + flap);
        ctx.lineTo(x + 37, cy + 6 + flap);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#f6d046";
        ctx.beginPath();
        ctx.ellipse(x + 17, cy, 13, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#b9902a";
        ctx.lineWidth = 2;
        for (var a = 0; a < 6.28; a += 0.8) {
          line(x + 17 + Math.cos(a) * 12, cy + Math.sin(a) * 10, x + 17 + Math.cos(a) * 16, cy + Math.sin(a) * 13);
        }
        ctx.fillStyle = "#fff";
        dot(x + 10, cy - 3, 3);
        ctx.fillStyle = "#0b2a3d";
        dot(x + 9.5, cy - 3, 1.5);
      } else if (o.y < 60) {
        ctx.fillStyle = "#ff8a3d";
        ctx.beginPath();
        ctx.moveTo(x + 30, cy);
        ctx.lineTo(x + 38, cy - 8 + flap);
        ctx.lineTo(x + 38, cy + 8 + flap);
        ctx.closePath();
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x + 17, cy, 15, 9, 0, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = "#ff8a3d";
        ctx.fillRect(x, cy - 10, 36, 20);
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.fillRect(x + 10, cy - 10, 4, 20);
        ctx.fillRect(x + 21, cy - 10, 4, 20);
        ctx.restore();
        ctx.fillStyle = "#ff8a3d";
        ctx.fillRect(x + 14, cy - 12, 10, 4);
        ctx.fillStyle = "#fff";
        dot(x + 7, cy - 2, 2.6);
        ctx.fillStyle = "#0b2a3d";
        dot(x + 6.6, cy - 2, 1.3);
      } else {
        for (var i = 0; i < 3; i++) {
          var fx = x + i * 9, fy = cy + (i % 2 ? -6 : 5) + Math.sin(s.t * 6 + i) * 1.5;
          ctx.fillStyle = "#e3edf5";
          ctx.beginPath();
          ctx.ellipse(fx + 9, fy, 7, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(fx + 15, fy);
          ctx.lineTo(fx + 21, fy - 4);
          ctx.lineTo(fx + 21, fy + 4);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = "#0b2a3d";
          dot(fx + 5, fy - 1, 1);
        }
      }
    }

    function shadowText(text, x, y) {
      ctx.shadowColor = "rgba(0,30,60,0.8)";
      ctx.shadowBlur = 4;
      ctx.fillText(text, x, y);
      ctx.shadowBlur = 0;
    }

    function draw() {
      drawBackground();
      s.obstacles.forEach(function (o) { if (o.kind === "cactus") drawCoral(o); else drawFish(o); });
      drawJelly();

      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "right";
      ctx.font = "bold 16px system-ui, sans-serif";
      shadowText("REKORD " + best + "   " + s.score, W - 12, 24);

      if (!running) {
        ctx.textAlign = "center";
        ctx.font = "bold 26px system-ui, sans-serif";
        shadowText(s.dead ? "Game over" : "Quallen-Runner", W / 2, 70);
        ctx.font = "15px system-ui, sans-serif";
        shadowText(s.dead ? "Leertaste oder Tippen für eine neue Runde" : "Leertaste, Pfeil hoch oder Tippen zum Starten", W / 2, 96);
      }
    }

    function frame(t) {
      if (!running) return;
      var dt = Math.min(0.033, (t - prev) / 1000);
      prev = t;
      step(s, { jump: jumpQueued || keys.jump, duck: keys.duck }, Math.random, dt);
      jumpQueued = false;
      offset += s.speed * dt;
      bubbles.forEach(function (b) {
        b.y -= b.v * dt;
        b.x -= s.speed * 0.1 * dt;
        if (b.y < -6 || b.x < -6) { b.y = GROUND - 4; b.x = Math.random() * W; }
      });
      info.textContent = scoreText();
      if (s.dead) { crash(); return; }
      draw();
      raf = requestAnimationFrame(frame);
    }

    function onDown(e) {
      if (!canvas.offsetParent || e.repeat) return;
      var tag = e.target && e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      var k = e.key;
      if (k === " " || k === "ArrowUp" || k === "w" || k === "W") {
        e.preventDefault();
        if (!running) begin(); else jumpQueued = true;
        keys.jump = true;
      } else if (k === "ArrowDown" || k === "s" || k === "S") {
        e.preventDefault();
        keys.duck = true;
      }
    }
    function onUp(e) {
      var k = e.key;
      if (k === " " || k === "ArrowUp" || k === "w" || k === "W") keys.jump = false;
      if (k === "ArrowDown" || k === "s" || k === "S") keys.duck = false;
    }

    canvas.addEventListener("pointerdown", function () { if (!running) begin(); else jumpQueued = true; });
    startBtn.addEventListener("click", function () { running = false; cancelAnimationFrame(raf); begin(); });
    document.addEventListener("keydown", onDown);
    document.addEventListener("keyup", onUp);
    document.addEventListener("farbe-geaendert", draw);

    draw();
    info.textContent = "Springen: Leertaste oder Pfeil hoch. Ducken: Pfeil runter (die Qualle zieht sich zusammen). Auf dem Handy: Tasten unten oder aufs Feld tippen.";

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
      keys.jump = keys.duck = false;
      document.removeEventListener("keydown", onDown);
      document.removeEventListener("keyup", onUp);
      document.removeEventListener("farbe-geaendert", draw);
    }
    stop.state = function () { return s; };   // nur für Tests
    return stop;
  }

  (window.Spiele = window.Spiele || []).push({
    id: "quallenrunner",
    name: "Quallen-Runner",
    start: start,
    _engine: { newState: newState, step: step, DINO_X: DINO_X, DINO_W: DINO_W, STAND_H: STAND_H, DUCK_H: DUCK_H }
  });
})();

;
// ===== rennstrecke.js =====
// © 2026 BlaueQualle. Alle Rechte vorbehalten.
// Spiel: Rennstrecke in 3D (Zeitfahren auf zufällig erzeugten Strecken, 3 Runden, Quallen-Auto)
(function () {
  "use strict";

  var WW = 3200, WH = 2400;   // Größe der Welt
  var VW = 480, VH = 360;     // Bildgröße der 3D-Ansicht
  var ROAD = 76;              // Straßenbreite
  var SP = 10;                // Abstand der Streckenpunkte
  var LAPS = 3;

  // ---------- Streckenerzeugung ----------
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Gleiche Nummer = gleiche Strecke
  function genTrack(seed) {
    var rnd = mulberry(seed);
    var K = 9 + Math.floor(rnd() * 5);
    var cx = WW / 2, cy = WH / 2, base = [], i, j;
    for (i = 0; i < K; i++) {
      var ang = ((i + (rnd() - 0.5) * 0.5) / K) * Math.PI * 2;
      var rad = 0.52 + rnd() * 0.48;
      base.push({ x: cx + Math.cos(ang) * WW * 0.4 * rad, y: cy + Math.sin(ang) * WH * 0.4 * rad });
    }

    // Geschlossene Kurve durch alle Stützpunkte (Catmull-Rom)
    var dense = [];
    for (i = 0; i < K; i++) {
      var p0 = base[(i + K - 1) % K], p1 = base[i], p2 = base[(i + 1) % K], p3 = base[(i + 2) % K];
      for (j = 0; j < 24; j++) {
        var t = j / 24, t2 = t * t, t3 = t2 * t;
        dense.push({
          x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        });
      }
    }

    // Gleichmäßige Punkte entlang der Strecke
    var len = dense.length, cum = [0];
    for (i = 1; i <= len; i++) {
      var a = dense[i - 1], b = dense[i % len];
      cum.push(cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
    }
    var total = cum[len], n = Math.round(total / SP), pts = [], seg = 0;
    for (i = 0; i < n; i++) {
      var target = (i / n) * total;
      while (cum[seg + 1] < target) seg++;
      var f = (target - cum[seg]) / (cum[seg + 1] - cum[seg]);
      var pa = dense[seg], pb = dense[(seg + 1) % len];
      pts.push({ x: pa.x + (pb.x - pa.x) * f, y: pa.y + (pb.y - pa.y) * f });
    }
    if (rnd() < 0.5) pts.reverse();

    // Büsche neben der Strecke (nur Dekoration)
    var bushes = [];
    for (i = 0; i < 700 && bushes.length < 260; i++) {
      var bx = rnd() * WW, by = rnd() * WH, ok = true;
      for (j = 0; j < n; j += 2) {
        if (Math.hypot(bx - pts[j].x, by - pts[j].y) < ROAD) { ok = false; break; }
      }
      if (ok) bushes.push({ x: bx, y: by, r: 8 + rnd() * 16 });
    }
    return { seed: seed, pts: pts, n: n, length: total, bushes: bushes };
  }

  // ---------- Fahrphysik ----------
  function newSim(tr) {
    var p0 = tr.pts[0], p1 = tr.pts[1];
    return {
      x: p0.x, y: p0.y, a: Math.atan2(p1.y - p0.y, p1.x - p0.x), vx: 0, vy: 0, speed: 0,
      idx: 0, prog: 0, flow: 0, lap: 0, lapTimes: [], t: 0, lapStart: 0,
      onRoad: true, dist: 0, wrong: false, finished: false
    };
  }

  function step(s, tr, inp, dt) {
    if (s.finished) return;
    var fx = Math.cos(s.a), fy = Math.sin(s.a);
    var vf0 = s.vx * fx + s.vy * fy;

    // Lenken (wirkt stärker bei Tempo)
    var steer = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    s.a += steer * 2.5 * Math.min(1, Math.abs(vf0) / 90) * (vf0 >= 0 ? 1 : -1) * dt;

    // Geschwindigkeit in Fahrtrichtung und seitlich (Driften)
    fx = Math.cos(s.a); fy = Math.sin(s.a);
    var rx = -fy, ry = fx;
    var vf = s.vx * fx + s.vy * fy;
    var vl = s.vx * rx + s.vy * ry;
    var acc = 0;
    if (inp.up) acc += 300;
    if (inp.down) acc -= vf > 20 ? 520 : 160;
    vf += acc * dt;
    vf *= Math.exp(-(s.onRoad ? 0.9 : 3.6) * dt);
    vl *= Math.exp(-(s.onRoad ? 5 : 3) * dt);
    s.vx = vf * fx + vl * rx;
    s.vy = vf * fy + vl * ry;
    s.x = Math.max(20, Math.min(WW - 20, s.x + s.vx * dt));
    s.y = Math.max(20, Math.min(WH - 20, s.y + s.vy * dt));
    s.speed = Math.hypot(s.vx, s.vy);
    s.t += dt;

    // Fortschritt entlang der Strecke
    var n = tr.n, best = 1e18, bi = s.idx, k, i, dx, dy, d2;
    for (k = -45; k <= 45; k++) {
      i = (s.idx + k + n) % n;
      dx = s.x - tr.pts[i].x; dy = s.y - tr.pts[i].y; d2 = dx * dx + dy * dy;
      if (d2 < best) { best = d2; bi = i; }
    }
    var delta = bi - s.idx;
    if (delta > n / 2) delta -= n;
    if (delta < -n / 2) delta += n;
    s.idx = bi;
    s.prog += delta;
    s.flow = s.flow * 0.97 + delta * 0.03;
    s.wrong = s.flow < -0.15 && s.speed > 40;
    s.dist = Math.sqrt(best);
    s.onRoad = s.dist <= ROAD / 2 + 4;

    if (s.prog >= n) {
      s.prog -= n;
      s.lapTimes.push(s.t - s.lapStart);
      s.lapStart = s.t;
      s.lap++;
      if (s.lap >= LAPS) s.finished = true;
    }
  }

  // ---------- Hilfen ----------
  function fmt(sec) {
    var m = Math.floor(sec / 60);
    var s = (sec - m * 60).toFixed(2);
    if (s.length < 5) s = "0" + s;
    return m + ":" + s.replace(".", ",");
  }

  function readBest(seed) {
    try {
      var v = JSON.parse(localStorage.getItem("rennstrecke:" + seed));
      if (v && typeof v.lap === "number" && typeof v.total === "number") return v;
    } catch (e) {}
    return null;
  }

  function writeBest(seed, v) {
    try { localStorage.setItem("rennstrecke:" + seed, JSON.stringify(v)); } catch (e) {}
  }

  // ---------- Oberfläche ----------
  function start(box) {
    var canvas = document.createElement("canvas");
    canvas.width = VW;
    canvas.height = VH;
    canvas.className = "game-canvas";
    canvas.style.aspectRatio = VW + " / " + VH;
    canvas.style.maxWidth = "34rem";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Rennstrecke in 3D");
    var ctx = canvas.getContext("2d");

    var row1 = document.createElement("div");
    row1.className = "row";
    var newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.textContent = "Neue Strecke";
    var restartBtn = document.createElement("button");
    restartBtn.type = "button";
    restartBtn.className = "link";
    restartBtn.textContent = "Neustart";
    row1.appendChild(newBtn);
    row1.appendChild(restartBtn);

    var row2 = document.createElement("div");
    row2.className = "row";
    var seedLabel = document.createElement("label");
    seedLabel.className = "inline";
    seedLabel.textContent = "Strecken-Nr.";
    seedLabel.htmlFor = "strecke-nr";
    var seedInput = document.createElement("input");
    seedInput.type = "number";
    seedInput.id = "strecke-nr";
    seedInput.className = "num";
    seedInput.min = "1";
    seedInput.max = "999999";
    var loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.className = "link";
    loadBtn.textContent = "Laden";
    row2.appendChild(seedLabel);
    row2.appendChild(seedInput);
    row2.appendChild(loadBtn);

    var info = document.createElement("p");
    info.className = "msg";
    info.setAttribute("aria-live", "polite");

    var keys = { up: false, down: false, left: false, right: false };
    var drive = document.createElement("div");
    drive.className = "drive";
    var steerBox = document.createElement("div");
    var pedalBox = document.createElement("div");
    [
      [steerBox, "left", "◀", "Links"], [steerBox, "right", "▶", "Rechts"],
      [pedalBox, "down", "Bremse", "Bremse"], [pedalBox, "up", "Gas", "Gas"]
    ].forEach(function (d) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pad-btn";
      b.textContent = d[2];
      b.setAttribute("aria-label", d[3]);
      function on(e) { e.preventDefault(); keys[d[1]] = true; }
      function off() { keys[d[1]] = false; }
      b.addEventListener("pointerdown", on);
      b.addEventListener("pointerup", off);
      b.addEventListener("pointerleave", off);
      b.addEventListener("pointercancel", off);
      b.addEventListener("contextmenu", function (e) { e.preventDefault(); });
      d[0].appendChild(b);
    });
    drive.appendChild(steerBox);
    drive.appendChild(pedalBox);

    box.appendChild(canvas);
    box.appendChild(row1);
    box.appendChild(row2);
    box.appendChild(info);
    box.appendChild(drive);

    var track, sim, phase, countdown, best, raf, prev, lapShown, cam = { x: 0, y: 0 };

    function css(name, fallback) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    }

    function restart() {
      sim = newSim(track);
      parts = [];
      updateCam(0, true);
      phase = "count";
      countdown = 3.2;
      lapShown = 0;
      best = readBest(track.seed);
      info.textContent = "Strecke " + track.seed + ": " + LAPS + " Runden, so schnell wie möglich." +
        (best ? " Bestzeit: " + fmt(best.total) + "." : "");
    }

    function loadSeed(seed) {
      track = genTrack(seed);
      buildView();
      seedInput.value = String(seed);
      restart();
    }

    function newTrack() { loadSeed(1000 + Math.floor(Math.random() * 9000)); }

    function afterLap() {
      while (lapShown < sim.lapTimes.length) {
        var t = sim.lapTimes[lapShown];
        lapShown++;
        info.textContent = "Runde " + lapShown + ": " + fmt(t);
      }
      if (sim.finished && phase !== "done") {
        phase = "done";
        var bestLap = Math.min.apply(null, sim.lapTimes);
        var record = !best || sim.t < best.total;
        var next = { lap: best ? Math.min(best.lap, bestLap) : bestLap, total: best ? Math.min(best.total, sim.t) : sim.t };
        writeBest(track.seed, next);
        info.textContent = "Ziel! Gesamtzeit " + fmt(sim.t) + ", beste Runde " + fmt(bestLap) +
          (record ? ". Neuer Rekord auf dieser Strecke!" : ".");
        best = next;
      }
    }

    // ----- 3D-Ansicht: Verfolgerkamera hinter dem Auto -----
    var NEAR = 5, FOV = 360, HORIZ = Math.round(VH * 0.4), BACK = 30, AHEAD = 62, HILL = 42;
    var FOG = [176, 208, 226];
    var view = null, camA = 0, camX = 0, camY = 0, camZ = 0, camF = FOV, cA = 1, sA = 0, parts = [], clock0 = performance.now();

    function fogMix(c, d) {
      var t = Math.max(0, Math.min(1, (d - 140) / 480));
      return "rgb(" + Math.round(c[0] + (FOG[0] - c[0]) * t) + "," + Math.round(c[1] + (FOG[1] - c[1]) * t) + "," + Math.round(c[2] + (FOG[2] - c[2]) * t) + ")";
    }

    function hexA(hex, a) {
      var m = /^#([0-9a-f]{6})$/i.exec(hex || "");
      if (!m) return "rgba(36,71,214," + a + ")";
      var n = parseInt(m[1], 16);
      return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
    }

    function buildView() {
      var n = track.n, z = [], nx = [], ny = [], i;
      var ph1 = (track.seed % 97) / 97 * 6.2832, ph2 = (track.seed % 53) / 53 * 6.2832;
      var m1 = 2 + (track.seed % 2), m2 = 3 + (track.seed % 3);   // ganze Zahlen, damit sich die Hügel zur Runde schließen
      for (i = 0; i < n; i++) {
        z.push(HILL * (0.6 * Math.sin(6.2832 * m1 * i / n + ph1) + 0.4 * Math.sin(6.2832 * m2 * i / n + ph2)));
        var a = track.pts[(i + n - 1) % n], b = track.pts[(i + 1) % n];
        var tx = b.x - a.x, ty = b.y - a.y, L = Math.hypot(tx, ty) || 1;
        nx.push(-ty / L);
        ny.push(tx / L);
      }
      var bz = track.bushes.map(function (b) {
        var best = 1e18, bi = 0;
        for (var j = 0; j < n; j += 2) {
          var dx = b.x - track.pts[j].x, dy = b.y - track.pts[j].y, d2 = dx * dx + dy * dy;
          if (d2 < best) { best = d2; bi = j; }
        }
        return z[bi];
      });
      view = { z: z, nx: nx, ny: ny, bz: bz };
    }

    function carZ() {
      var n = track.n, i = sim.idx, a = track.pts[i], b = track.pts[(i + 1) % n], z = view.z;
      var dx = b.x - a.x, dy = b.y - a.y, t = ((sim.x - a.x) * dx + (sim.y - a.y) * dy) / (dx * dx + dy * dy);
      if (t < 0) { var j = (i + n - 1) % n; return z[j] + (z[i] - z[j]) * (1 + Math.max(t, -1)); }
      return z[i] + (z[(i + 1) % n] - z[i]) * Math.min(t, 1);
    }

    function updateCam(dt, snap) {
      var da = sim.a - camA;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      camA += snap ? da : da * Math.min(1, dt * 5);
      var sp = Math.min(sim.speed, 330), D = 62 + sp * 0.08;
      camX = sim.x - Math.cos(camA) * D;
      camY = sim.y - Math.sin(camA) * D;
      var tz = carZ() + 28;
      camZ = snap ? tz : camZ + (tz - camZ) * Math.min(1, dt * 7);
      camF = FOV + sp * 0.15;
      cA = Math.cos(camA); sA = Math.sin(camA);
    }

    function updateParts(dt) {
      var i, p;
      if (phase === "run" && sim.speed > 60 && parts.length < 36 && Math.random() < 0.5) {
        var fx = Math.cos(sim.a), fy = Math.sin(sim.a), o = (Math.random() - 0.5) * 22;
        parts.push({ x: sim.x - fx * 16 - fy * o, y: sim.y - fy * 16 + fx * o, z: carZ() + 4, vz: 8 + Math.random() * 10, life: 1.0, r: 0.5 + Math.random() * 0.8 });
      }
      for (i = parts.length - 1; i >= 0; i--) {
        p = parts[i];
        p.life -= dt;
        p.z += p.vz * dt;
        if (p.life <= 0) parts.splice(i, 1);
      }
    }

    // Vieleck mit Nah-Abschneiden zeichnen; Punkte: [Tiefe, seitlich, Höhe relativ zur Kamera]
    function polyFill(P, color) {
      var out = [], m = P.length, a, b, t, q;
      for (q = 0; q < m; q++) {
        a = P[q]; b = P[(q + 1) % m];
        if (a[0] >= NEAR) out.push(a);
        if ((a[0] >= NEAR) !== (b[0] >= NEAR)) {
          t = (NEAR - a[0]) / (b[0] - a[0]);
          out.push([NEAR, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
        }
      }
      if (out.length < 3) return;
      ctx.beginPath();
      for (q = 0; q < out.length; q++) {
        var X = VW / 2 + camF * out[q][1] / out[q][0], Y = HORIZ - camF * out[q][2] / out[q][0];
        if (q) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    }

    function band(A, B, L1, L2, color) {
      polyFill([
        [A.d + L1 * A.dn, A.l + L1 * A.ln, A.z], [A.d + L2 * A.dn, A.l + L2 * A.ln, A.z],
        [B.d + L2 * B.dn, B.l + L2 * B.ln, B.z], [B.d + L1 * B.dn, B.l + L1 * B.ln, B.z]
      ], color);
    }

    var C_GRASS = [[84, 150, 78], [74, 136, 70]], C_ROAD = [[58, 63, 69], [66, 71, 78]];

    function drawSegment(A, B) {
      var d = (A.d + B.d) / 2, st = Math.floor(A.i / 4) % 2, W = ROAD / 2, c;
      band(A, B, -140, 140, fogMix(C_GRASS[st], d));
      c = fogMix(Math.floor(A.i / 2) % 2 ? [211, 58, 58] : [245, 245, 245], d);
      band(A, B, W, W + 9, c);
      band(A, B, -W - 9, -W, c);
      band(A, B, -W, W, fogMix(C_ROAD[st], d));
      c = fogMix([228, 228, 228], d);
      band(A, B, -W + 4, -W + 6, c);
      band(A, B, W - 6, W - 4, c);
      if (Math.floor(A.i / 3) % 2 === 0) band(A, B, -1.5, 1.5, c);
      if (A.i === 0 || A.i === track.n - 1) {
        for (var q = 0; q < 8; q++) {
          band(A, B, -W + (q * ROAD) / 8, -W + ((q + 1) * ROAD) / 8, (q + (A.i === 0 ? 0 : 1)) % 2 ? "#fff" : "#111");
        }
      }
    }

    function drawGate(A) {
      var W = ROAD / 2 + 12, c, q, h0 = 36, h1 = 50, dd, ll;
      [-1, 1].forEach(function (s) {
        dd = A.d + s * W * A.dn; ll = A.l + s * W * A.ln;
        polyFill([[dd, ll - 3, A.z], [dd, ll + 3, A.z], [dd, ll + 3, A.z + h1], [dd, ll - 3, A.z + h1]], "#d9d9d9");
      });
      for (q = 0; q < 14; q++) {
        var L1 = -W + (q * 2 * W) / 14, L2 = -W + ((q + 1) * 2 * W) / 14;
        var d1 = A.d + L1 * A.dn, l1 = A.l + L1 * A.ln, d2 = A.d + L2 * A.dn, l2 = A.l + L2 * A.ln, m = (h0 + h1) / 2;
        polyFill([[d1, l1, A.z + h0], [d2, l2, A.z + h0], [d2, l2, A.z + m], [d1, l1, A.z + m]], q % 2 ? "#fff" : "#111");
        polyFill([[d1, l1, A.z + m], [d2, l2, A.z + m], [d2, l2, A.z + h1], [d1, l1, A.z + h1]], q % 2 ? "#111" : "#fff");
      }
    }

    function drawBush(b, bi, d, l, z) {
      var s = camF / d, X = VW / 2 + s * l, Y = HORIZ - s * z, r = b.r;
      if (bi % 7 === 0) {          // Koralle
        ctx.fillStyle = fogMix([232, 96, 150], d);
        [[-0.7, 0.9, 0.55], [0, 1.5, 0.7], [0.7, 1.0, 0.5]].forEach(function (c) {
          ctx.beginPath();
          ctx.ellipse(X + c[0] * r * s, Y - c[1] * r * s, c[2] * r * s * 0.6, c[2] * r * s * 1.5, 0, 0, Math.PI * 2);
          ctx.fill();
        });
        return;
      }
      ctx.fillStyle = fogMix([96, 68, 44], d);
      ctx.fillRect(X - r * 0.17 * s, Y - r * 1.3 * s, r * 0.34 * s, r * 1.3 * s);
      ctx.fillStyle = fogMix(bi % 3 ? [52, 118, 62] : [66, 136, 74], d);
      ctx.beginPath();
      ctx.ellipse(X, Y - r * 2.0 * s, r * 1.05 * s, r * 1.15 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.ellipse(X - r * 0.3 * s, Y - r * 2.3 * s, r * 0.5 * s, r * 0.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    function skyJelly(x, y, s, t) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.ellipse(x, y, 11 * s, 8 * s, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1.2;
      for (var k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(x + k * 5 * s, y);
        ctx.bezierCurveTo(x + k * 5 * s + Math.sin(t * 2 + k) * 4 * s, y + 8 * s, x + k * 5 * s - Math.sin(t * 2 + k) * 4 * s, y + 14 * s, x + k * 5 * s + Math.sin(t * 2 + k) * 3 * s, y + 20 * s);
        ctx.stroke();
      }
    }

    function drawSky() {
      var t = (performance.now() - clock0) / 1000, g = ctx.createLinearGradient(0, 0, 0, HORIZ);
      g.addColorStop(0, "#3a74dc");
      g.addColorStop(1, "rgb(" + FOG.join(",") + ")");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VW, HORIZ + 2);
      var wrap = VW * 3, sx = ((VW * 0.7 - camA * 190) % wrap + wrap) % wrap - VW * 0.5;
      var sg = ctx.createRadialGradient(sx, HORIZ * 0.45, 4, sx, HORIZ * 0.45, 70);
      sg.addColorStop(0, "rgba(255,248,210,1)");
      sg.addColorStop(0.25, "rgba(255,236,160,0.85)");
      sg.addColorStop(1, "rgba(255,236,160,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(sx - 80, 0, 160, HORIZ);
      var off = camA * 190, x, h;
      [["#9db8d6", 0.012, 26, 0], ["#86a5c8", 0.021, 20, 3]].forEach(function (L, li) {
        ctx.fillStyle = L[0];
        ctx.beginPath();
        ctx.moveTo(0, HORIZ + 2);
        for (x = 0; x <= VW; x += 6) {
          h = L[2] * (0.6 + 0.4 * Math.sin((x + off * (1 + li * 0.3)) * L[1] + L[3])) + 10 * Math.sin((x + off) * 0.047 + li);
          ctx.lineTo(x, HORIZ - 6 - h * 0.6);
        }
        ctx.lineTo(VW, HORIZ + 2);
        ctx.closePath();
        ctx.fill();
      });
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (var c = 0; c < 4; c++) {
        var cx = ((c * 190 - camA * 120) % (VW + 200) + VW + 200) % (VW + 200) - 100, cy = 24 + (c % 2) * 30;
        ctx.beginPath(); ctx.ellipse(cx, cy, 34, 9, 0, 0, Math.PI * 2); ctx.ellipse(cx + 18, cy - 6, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
      }
      for (var j = 0; j < 3; j++) {
        var jx = ((j * 230 + 60 - camA * 90) % (VW + 160) + VW + 160) % (VW + 160) - 80;
        skyJelly(jx, 30 + j * 22 + Math.sin(t + j * 2) * 4, 0.8 + j * 0.2, t + j);
      }
    }

    // Quallen-Auto von hinten: Kuppel, Karosserie, Räder, leuchtende Fangarme
    function drawCar(X, Y, u, skew, roll) {
      var t = (performance.now() - clock0) / 1000, acc = css("--accent", "#2447d6"), k, w;
      ctx.save();
      ctx.translate(X, Y);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath(); ctx.ellipse(0, 1 * u, 17 * u, 4 * u, 0, 0, Math.PI * 2); ctx.fill();
      ctx.rotate(roll);
      ctx.transform(1, 0, skew, 1, 0, 0);
      // Fangarme (hängen leuchtend hinter dem Auto)
      for (k = -2; k <= 2; k++) {
        ctx.strokeStyle = hexA(acc, 0.55);
        ctx.lineWidth = 2.2 * u;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(k * 5.5 * u, -5 * u);
        ctx.bezierCurveTo(k * 7 * u + Math.sin(t * 5 + k) * 3 * u, 2 * u, k * 6 * u - Math.sin(t * 5 + k) * 3 * u, 6 * u, k * 8 * u + Math.sin(t * 4 + k) * 2.5 * u, 11 * u);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.5)";
        ctx.lineWidth = 0.8 * u;
        ctx.stroke();
      }
      // Räder
      ctx.fillStyle = "#15181d";
      ctx.fillRect(-16.5 * u, -9 * u, 6.5 * u, 10 * u);
      ctx.fillRect(10 * u, -9 * u, 6.5 * u, 10 * u);
      ctx.fillStyle = "#3a414b";
      ctx.fillRect(-15.5 * u, -6.5 * u, 2 * u, 5 * u);
      ctx.fillRect(13.5 * u, -6.5 * u, 2 * u, 5 * u);
      // Karosserie
      var bg = ctx.createLinearGradient(0, -12 * u, 0, -2 * u);
      bg.addColorStop(0, "rgba(255,255,255,0.55)");
      bg.addColorStop(0.35, acc);
      bg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = acc;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-14.5 * u, -12 * u, 29 * u, 10 * u, 3 * u); else ctx.rect(-14.5 * u, -12 * u, 29 * u, 10 * u);
      ctx.fill();
      ctx.fillStyle = bg;
      ctx.fill();
      // Rücklichter
      var brake = keys.down;
      ctx.fillStyle = brake ? "#ff3b30" : "#a3221c";
      ctx.shadowColor = "#ff3b30";
      ctx.shadowBlur = brake ? 10 : 3;
      ctx.fillRect(-12.5 * u, -9 * u, 6 * u, 2.2 * u);
      ctx.fillRect(6.5 * u, -9 * u, 6 * u, 2.2 * u);
      ctx.shadowBlur = 0;
      // Kuppel
      var dg = ctx.createRadialGradient(-3 * u, -22 * u, 1 * u, 0, -15 * u, 15 * u);
      dg.addColorStop(0, "rgba(255,255,255,0.95)");
      dg.addColorStop(0.45, hexA(acc, 0.65));
      dg.addColorStop(1, hexA(acc, 0.35));
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.ellipse(0, -12 * u, 12.5 * u, 14 * u, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.1 * u;
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 0.9 * u;
      for (w = -1; w <= 1; w++) {
        ctx.beginPath();
        ctx.moveTo(w * 4.5 * u, -12 * u);
        ctx.quadraticCurveTo(w * 6 * u, -20 * u, w * 2 * u, -25 * u);
        ctx.stroke();
      }
      ctx.restore();
    }

    function hudBox(x, y, w, h) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, 8); else ctx.rect(x, y, w, h);
      ctx.fill();
    }

    function centerText(text, size, y) {
      ctx.font = "bold " + size + "px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, VW / 2, y);
    }

    function draw() {
      var n = track.n, k, i, A, B, items = [], seg = [], shake = (phase === "run" && !sim.onRoad && sim.speed > 40) ? (Math.random() - 0.5) * 3 : 0;
      ctx.save();
      ctx.translate(0, shake);
      drawSky();
      var gg = ctx.createLinearGradient(0, HORIZ, 0, VH);
      gg.addColorStop(0, "rgb(" + FOG.join(",") + ")");
      gg.addColorStop(0.25, "rgb(74,136,70)");
      gg.addColorStop(1, "rgb(60,118,58)");
      ctx.fillStyle = gg;
      ctx.fillRect(0, HORIZ, VW, VH - HORIZ + 4);

      for (k = -BACK; k <= AHEAD + 1; k++) {
        i = (sim.idx + k + n) % n;
        var p = track.pts[i], dx = p.x - camX, dy = p.y - camY;
        seg.push({
          d: dx * cA + dy * sA, l: -dx * sA + dy * cA, z: view.z[i] - camZ,
          dn: view.nx[i] * cA + view.ny[i] * sA, ln: -view.nx[i] * sA + view.ny[i] * cA, i: i
        });
      }
      for (k = 0; k < seg.length - 1; k++) {
        A = seg[k]; B = seg[k + 1];
        if (Math.max(A.d, B.d) < NEAR - 1) continue;
        items.push({ d: (A.d + B.d) / 2, t: 0, A: A, B: B });
        if (A.i === 0) items.push({ d: A.d - 8, t: 1, A: A });
      }
      track.bushes.forEach(function (b, bi) {
        var dx = b.x - camX, dy = b.y - camY, d = dx * cA + dy * sA;
        if (d < NEAR + 4 || d > 620) return;
        var l = -dx * sA + dy * cA;
        if (Math.abs(l) > d * 0.75 + b.r * 3) return;
        items.push({ d: d - 6, t: 2, b: b, bi: bi, l: l, z: view.bz[bi] - camZ });
      });
      parts.forEach(function (q) {
        var dx = q.x - camX, dy = q.y - camY, d = dx * cA + dy * sA;
        if (d < NEAR) return;
        items.push({ d: d - 6, t: 3, q: q, l: -dx * sA + dy * cA, z: q.z - camZ });
      });
      items.sort(function (a, b) { return b.d - a.d; });
      items.forEach(function (it) {
        if (it.t === 0) drawSegment(it.A, it.B);
        else if (it.t === 1) drawGate(it.A);
        else if (it.t === 2) drawBush(it.b, it.bi, it.d + 6, it.l, it.z);
        else {
          var s = camF / (it.d + 6), a = Math.max(0, it.q.life);
          ctx.strokeStyle = "rgba(255,255,255," + (0.6 * a).toFixed(2) + ")";
          ctx.fillStyle = hexA(css("--accent", "#2447d6"), 0.2 * a);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(VW / 2 + s * it.l, HORIZ - s * it.z, Math.max(1, it.q.r * s), 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });

      // Auto
      var cdx = sim.x - camX, cdy = sim.y - camY, cd = Math.max(NEAR, cdx * cA + cdy * sA), cl = -cdx * sA + cdy * cA;
      var cu = camF / cd, cz = carZ() - camZ;
      var steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      drawCar(VW / 2 + cu * cl, HORIZ - cu * cz, cu * 0.8, Math.sin(sim.a - camA) * 0.9, steer * 0.05 * Math.min(1, sim.speed / 120));

      // Tempo-Linien
      if (sim.speed > 170) {
        ctx.strokeStyle = "rgba(255,255,255," + Math.min(0.35, (sim.speed - 170) / 400).toFixed(2) + ")";
        ctx.lineWidth = 1;
        for (i = 0; i < 14; i++) {
          var ang = (i / 14) * Math.PI * 2 + (performance.now() / 400) % 6.28, r1 = 150 + ((i * 53) % 60), r2 = r1 + 30;
          ctx.beginPath();
          ctx.moveTo(VW / 2 + Math.cos(ang) * r1, HORIZ + 30 + Math.sin(ang) * r1 * 0.6);
          ctx.lineTo(VW / 2 + Math.cos(ang) * r2, HORIZ + 30 + Math.sin(ang) * r2 * 0.6);
          ctx.stroke();
        }
      }
      ctx.restore();

      // Anzeigen
      hudBox(8, 8, 128, 52);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(fmt(sim.t), 16, 31);
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("Runde " + Math.min(sim.lap + 1, LAPS) + "/" + LAPS + (best ? " · Best " + fmt(best.lap) : ""), 16, 51);

      hudBox(VW - 106, 8, 98, 74);
      var sc = 90 / WW;
      ctx.beginPath();
      ctx.moveTo(VW - 102 + track.pts[0].x * sc, 12 + track.pts[0].y * sc);
      for (i = 4; i < track.n; i += 4) ctx.lineTo(VW - 102 + track.pts[i].x * sc, 12 + track.pts[i].y * sc);
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = css("--accent", "#2447d6");
      ctx.beginPath();
      ctx.arc(VW - 102 + sim.x * sc, 12 + sim.y * sc, 3.5, 0, Math.PI * 2);
      ctx.fill();

      hudBox(8, VH - 40, 118, 32);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText(Math.round(sim.speed * 0.45) + " km/h", 16, VH - 18);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(16, VH - 14, 102, 3);
      ctx.fillStyle = css("--accent", "#2447d6");
      ctx.fillRect(16, VH - 14, 102 * Math.min(1, sim.speed / 330), 3);

      ctx.fillStyle = "#fff";
      if (phase === "count") {
        hudBox(0, VH / 2 - 56, VW, 96);
        ctx.fillStyle = "#fff";
        centerText(countdown > 0.4 ? String(Math.ceil(countdown - 0.2)) : "Los!", 56, VH / 2 + 14);
      } else if (phase === "run" && sim.wrong) {
        ctx.fillStyle = "#ff8a80";
        centerText("Falsche Richtung!", 24, 100);
      } else if (phase === "run" && !sim.onRoad) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        centerText("Abseits der Strecke", 15, 100);
      } else if (phase === "done") {
        hudBox(0, VH / 2 - 70, VW, 140);
        ctx.fillStyle = "#fff";
        centerText("Ziel!", 34, VH / 2 - 22);
        centerText(fmt(sim.t), 28, VH / 2 + 16);
        centerText("Neue Strecke oder Neustart wählen", 14, VH / 2 + 46);
      }
    }

    function frame(t) {
      var dt = Math.min(0.033, (t - prev) / 1000);
      prev = t;
      if (phase === "count") {
        countdown -= dt;
        if (countdown <= 0) phase = "run";
      } else if (phase === "run") {
        step(sim, track, keys, dt);
        afterLap();
      }
      updateCam(dt, false);
      updateParts(dt);
      draw();
      raf = requestAnimationFrame(frame);
    }

    function keyChange(down) {
      return function (e) {
        if (!canvas.offsetParent) return;
        var t = e.target && e.target.tagName;
        if (t === "INPUT" || t === "TEXTAREA") return;
        var name = null;
        if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") name = "up";
        if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") name = "down";
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") name = "left";
        if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") name = "right";
        if (!name) return;
        e.preventDefault();
        keys[name] = down;
      };
    }
    var onDown = keyChange(true), onUp = keyChange(false);

    newBtn.addEventListener("click", newTrack);
    restartBtn.addEventListener("click", restart);
    loadBtn.addEventListener("click", function () {
      var v = parseInt(seedInput.value, 10);
      if (v >= 1 && v <= 999999) loadSeed(v);
    });
    document.addEventListener("keydown", onDown);
    document.addEventListener("keyup", onUp);

    newTrack();
    prev = performance.now();
    raf = requestAnimationFrame(frame);

    return function stop() {
      cancelAnimationFrame(raf);
      keys.up = keys.down = keys.left = keys.right = false;
      document.removeEventListener("keydown", onDown);
      document.removeEventListener("keyup", onUp);
    };
  }

  (window.Spiele = window.Spiele || []).push({
    id: "rennstrecke",
    name: "Rennstrecke",
    start: start,
    _engine: { genTrack: genTrack, newSim: newSim, step: step, LAPS: LAPS, ROAD: ROAD }
  });
})();

;
// ===== schach.js =====
// © 2026 BlaueQualle. Alle Rechte vorbehalten.
// Spiel: Schach (alle Regeln, Computergegner mit einstellbarer Stärke von 400 bis 1800 Elo, Zwei-Spieler-Modus)
// Figuren im 3D-Drucker-Design: Weiß = orange, Schwarz = schwarz.
(function () {
  "use strict";

  var FILES = "abcdefgh";
  var START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  var VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  var GLYPH = { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" };
  var NAMES = { k: "König", q: "Dame", r: "Turm", b: "Läufer", n: "Springer", p: "Bauer" };
  var KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  var KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  var DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  var ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // ---------- Regeln ----------
  function isWhite(p) { return p !== "" && p === p.toUpperCase(); }
  function colorOf(p) { return p === "" ? "" : (isWhite(p) ? "w" : "b"); }
  function inside(r, f) { return r >= 0 && r < 8 && f >= 0 && f < 8; }

  // Brett: 64 Felder, Index 0 = a8, 63 = h1 (wie bei FEN). Großbuchstaben = Weiß.
  function fromFEN(fen) {
    var parts = fen.split(" ");
    var b = [];
    parts[0].split("/").forEach(function (row) {
      for (var i = 0; i < row.length; i++) {
        if (/\d/.test(row[i])) { for (var k = 0; k < Number(row[i]); k++) b.push(""); }
        else b.push(row[i]);
      }
    });
    var cr = parts[2] || "-";
    var ep = parts[3] && parts[3] !== "-" ? (8 - Number(parts[3][1])) * 8 + FILES.indexOf(parts[3][0]) : -1;
    return {
      b: b,
      turn: parts[1] || "w",
      castle: { K: cr.indexOf("K") >= 0, Q: cr.indexOf("Q") >= 0, k: cr.indexOf("k") >= 0, q: cr.indexOf("q") >= 0 },
      ep: ep,
      half: Number(parts[4] || 0)
    };
  }

  function attacked(b, sq, by) {
    var r = sq >> 3, f = sq & 7, i, nr, nf, p, d;
    var pr = by === "w" ? r + 1 : r - 1;
    var pawn = by === "w" ? "P" : "p";
    if (pr >= 0 && pr < 8) {
      if (f > 0 && b[pr * 8 + f - 1] === pawn) return true;
      if (f < 7 && b[pr * 8 + f + 1] === pawn) return true;
    }
    var n = by === "w" ? "N" : "n";
    for (i = 0; i < 8; i++) {
      nr = r + KN[i][0]; nf = f + KN[i][1];
      if (inside(nr, nf) && b[nr * 8 + nf] === n) return true;
    }
    var k = by === "w" ? "K" : "k";
    for (i = 0; i < 8; i++) {
      nr = r + KG[i][0]; nf = f + KG[i][1];
      if (inside(nr, nf) && b[nr * 8 + nf] === k) return true;
    }
    var bq = by === "w" ? "BQ" : "bq";
    var rq = by === "w" ? "RQ" : "rq";
    for (d = 0; d < 4; d++) {
      nr = r + DIAG[d][0]; nf = f + DIAG[d][1];
      while (inside(nr, nf)) {
        p = b[nr * 8 + nf];
        if (p !== "") { if (bq.indexOf(p) >= 0) return true; break; }
        nr += DIAG[d][0]; nf += DIAG[d][1];
      }
      nr = r + ORTH[d][0]; nf = f + ORTH[d][1];
      while (inside(nr, nf)) {
        p = b[nr * 8 + nf];
        if (p !== "") { if (rq.indexOf(p) >= 0) return true; break; }
        nr += ORTH[d][0]; nf += ORTH[d][1];
      }
    }
    return false;
  }

  function pseudo(s) {
    var b = s.b, white = s.turn === "w", out = [];
    var enemy = white ? "b" : "w";

    function addPawn(from, to, promo) {
      if (promo) {
        ["q", "r", "b", "n"].forEach(function (x) { out.push({ from: from, to: to, promo: x }); });
      } else {
        out.push({ from: from, to: to });
      }
    }

    for (var sq = 0; sq < 64; sq++) {
      var p = b[sq];
      if (p === "" || isWhite(p) !== white) continue;
      var r = sq >> 3, f = sq & 7, lp = p.toLowerCase(), i, nr, nf, t, d;

      if (lp === "p") {
        var dir = white ? -1 : 1, start = white ? 6 : 1, last = white ? 0 : 7;
        nr = r + dir;
        if (nr >= 0 && nr < 8) {
          t = nr * 8 + f;
          if (b[t] === "") {
            addPawn(sq, t, nr === last);
            if (r === start && b[t + dir * 8] === "") out.push({ from: sq, to: t + dir * 8, flag: "dbl" });
          }
          for (d = -1; d <= 1; d += 2) {
            nf = f + d;
            if (nf < 0 || nf > 7) continue;
            t = nr * 8 + nf;
            if (b[t] !== "" && isWhite(b[t]) !== white) addPawn(sq, t, nr === last);
            else if (b[t] === "" && t === s.ep) out.push({ from: sq, to: t, flag: "ep" });
          }
        }
      } else if (lp === "n" || lp === "k") {
        var offs = lp === "n" ? KN : KG;
        for (i = 0; i < 8; i++) {
          nr = r + offs[i][0]; nf = f + offs[i][1];
          if (!inside(nr, nf)) continue;
          t = nr * 8 + nf;
          if (b[t] === "" || isWhite(b[t]) !== white) out.push({ from: sq, to: t });
        }
        if (lp === "k") {
          var home = white ? 60 : 4;
          if (sq === home && !attacked(b, home, enemy)) {
            var rook = white ? "R" : "r";
            if ((white ? s.castle.K : s.castle.k) && b[home + 1] === "" && b[home + 2] === "" &&
                b[home + 3] === rook && !attacked(b, home + 1, enemy)) {
              out.push({ from: home, to: home + 2, flag: "castleK" });
            }
            if ((white ? s.castle.Q : s.castle.q) && b[home - 1] === "" && b[home - 2] === "" &&
                b[home - 3] === "" && b[home - 4] === rook && !attacked(b, home - 1, enemy)) {
              out.push({ from: home, to: home - 2, flag: "castleQ" });
            }
          }
        }
      } else {
        var dirs = lp === "b" ? DIAG : lp === "r" ? ORTH : DIAG.concat(ORTH);
        for (i = 0; i < dirs.length; i++) {
          nr = r + dirs[i][0]; nf = f + dirs[i][1];
          while (inside(nr, nf)) {
            t = nr * 8 + nf;
            if (b[t] === "") out.push({ from: sq, to: t });
            else { if (isWhite(b[t]) !== white) out.push({ from: sq, to: t }); break; }
            nr += dirs[i][0]; nf += dirs[i][1];
          }
        }
      }
    }
    return out;
  }

  function make(s, m) {
    var b = s.b.slice();
    var p = b[m.from];
    var white = isWhite(p);
    var lp = p.toLowerCase();
    var capture = b[m.to] !== "" || m.flag === "ep";
    var c = { K: s.castle.K, Q: s.castle.Q, k: s.castle.k, q: s.castle.q };

    b[m.to] = m.promo ? (white ? m.promo.toUpperCase() : m.promo) : p;
    b[m.from] = "";
    if (m.flag === "ep") b[m.to + (white ? 8 : -8)] = "";
    if (m.flag === "castleK") { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = ""; }
    if (m.flag === "castleQ") { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = ""; }

    if (lp === "k") { if (white) { c.K = false; c.Q = false; } else { c.k = false; c.q = false; } }
    [m.from, m.to].forEach(function (x) {
      if (x === 63) c.K = false;
      if (x === 56) c.Q = false;
      if (x === 7) c.k = false;
      if (x === 0) c.q = false;
    });

    return {
      b: b,
      turn: white ? "b" : "w",
      castle: c,
      ep: m.flag === "dbl" ? (m.from + m.to) / 2 : -1,
      half: lp === "p" || capture ? 0 : s.half + 1
    };
  }

  function inCheckFor(b, color) {
    var king = color === "w" ? "K" : "k";
    var sq = b.indexOf(king);
    return sq >= 0 && attacked(b, sq, color === "w" ? "b" : "w");
  }

  function inCheck(s) { return inCheckFor(s.b, s.turn); }

  function legalMoves(s) {
    return pseudo(s).filter(function (m) { return !inCheckFor(make(s, m).b, s.turn); });
  }

  function keyOf(s) {
    var c = s.castle;
    return s.b.map(function (p) { return p || "."; }).join("") + s.turn +
      (c.K ? "K" : "") + (c.Q ? "Q" : "") + (c.k ? "k" : "") + (c.q ? "q" : "") + s.ep;
  }

  function insufficient(s) {
    var rest = s.b.filter(function (p) { return p !== "" && p.toLowerCase() !== "k"; });
    if (rest.length === 0) return true;
    return rest.length === 1 && "nbNB".indexOf(rest[0]) >= 0;
  }

  // Ergebnis: { over, result: "matt"|"patt"|"50"|"material"|"wiederholung"|null, check, moves }
  function status(s, keys) {
    var moves = legalMoves(s);
    var check = inCheck(s);
    if (!moves.length) return { over: true, result: check ? "matt" : "patt", check: check, moves: moves };
    if (insufficient(s)) return { over: true, result: "material", check: check, moves: moves };
    if (s.half >= 100) return { over: true, result: "50", check: check, moves: moves };
    var k = keyOf(s), n = 0;
    for (var i = 0; i < keys.length; i++) if (keys[i] === k) n++;
    if (n >= 3) return { over: true, result: "wiederholung", check: check, moves: moves };
    return { over: false, result: null, check: check, moves: moves };
  }

  // ---------- Computergegner: schneller Motor mit Elo-Stufen ----------
// Schach-Motor: schnelle Suche für die Computergegner (läuft komplett im Browser)
var SchachMotor = (function () {
  "use strict";

  var OFF = 16, MATE = 30000, INF = 32000, MAXPLY = 100;
  var B = new Int8Array(120);          // Brett 10x12; leer = 0, weiß 1..6 (Bauer, Springer, Läufer, Turm, Dame, König), schwarz 9..14, außen 16
  var side = 0, castle = 0, ep = 0, half = 0, hply = 0;   // side: 0 = Weiß, 8 = Schwarz
  var KS = [0, 0];
  var h1 = 0, h2 = 0;
  var noise = 0, salt = 0;

  // ---------- Zufallszahlen für den Stellungs-Schlüssel ----------
  var Z1 = new Int32Array(16 * 120), Z2 = new Int32Array(16 * 120);
  var ZC1 = new Int32Array(16), ZC2 = new Int32Array(16), ZE1 = new Int32Array(120), ZE2 = new Int32Array(120);
  var ZS1 = 0, ZS2 = 0;
  (function () {
    var s = 0x2545F491;
    function r() { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return s | 0; }
    var i;
    for (i = 0; i < Z1.length; i++) { Z1[i] = r(); Z2[i] = r(); }
    for (i = 0; i < 16; i++) { ZC1[i] = r(); ZC2[i] = r(); }
    for (i = 0; i < 120; i++) { ZE1[i] = r(); ZE2[i] = r(); }
    ZS1 = r(); ZS2 = r();
  })();

  // ---------- Rückgängig-Speicher und Stellungsverlauf ----------
  var U_MOVE = new Int32Array(1200), U_CASTLE = new Int8Array(1200), U_EP = new Uint8Array(1200), U_HALF = new Int16Array(1200);
  var U_H1 = new Int32Array(1200), U_H2 = new Int32Array(1200);
  var HH1 = new Int32Array(1200), HH2 = new Int32Array(1200);

  var KN = [-21, -19, -12, -8, 8, 12, 19, 21];
  var DB = [-11, -9, 9, 11];
  var DR = [-10, -1, 1, 10];
  var DK = [-11, -10, -9, -1, 1, 9, 10, 11];
  var CMASK = new Int8Array(120);
  for (var ci = 0; ci < 120; ci++) CMASK[ci] = 15;
  CMASK[21] = 13; CMASK[25] = 12; CMASK[28] = 14; CMASK[91] = 7; CMASK[95] = 3; CMASK[98] = 11;

  function sqName(s) { return "abcdefgh".charAt(s % 10 - 1) + String(Math.floor(s / 10) - 1); }
  function sqFrom(name) { return (name.charCodeAt(1) - 48 + 1) * 10 + (name.charCodeAt(0) - 96); }

  // ---------- Stellung laden ----------
  function loadFEN(fen) {
    var parts = fen.split(" "), i, r, f, c;
    for (i = 0; i < 120; i++) B[i] = OFF;
    var rows = parts[0].split("/");
    var map = { p: 9, n: 10, b: 11, r: 12, q: 13, k: 14, P: 1, N: 2, B: 3, R: 4, Q: 5, K: 6 };
    for (r = 0; r < 8; r++) {
      var rank = 7 - r, file = 0;
      for (i = 0; i < rows[r].length; i++) {
        c = rows[r].charAt(i);
        if (c >= "1" && c <= "8") { for (f = 0; f < Number(c); f++) { B[(rank + 2) * 10 + file + 1] = 0; file++; } }
        else { var sq = (rank + 2) * 10 + file + 1; B[sq] = map[c]; if (map[c] === 6) KS[0] = sq; if (map[c] === 14) KS[1] = sq; file++; }
      }
    }
    side = parts[1] === "b" ? 8 : 0;
    var cr = parts[2] || "-";
    castle = (cr.indexOf("K") >= 0 ? 1 : 0) | (cr.indexOf("Q") >= 0 ? 2 : 0) | (cr.indexOf("k") >= 0 ? 4 : 0) | (cr.indexOf("q") >= 0 ? 8 : 0);
    ep = parts[3] && parts[3] !== "-" ? sqFrom(parts[3]) : 0;
    half = Number(parts[4] || 0);
    computeHash();
  }

  function computeHash() {
    h1 = 0; h2 = 0;
    for (var s = 21; s <= 98; s++) {
      var p = B[s];
      if (p > 0 && p < OFF) { h1 ^= Z1[p * 120 + s]; h2 ^= Z2[p * 120 + s]; }
    }
    h1 ^= ZC1[castle]; h2 ^= ZC2[castle];
    if (ep) { h1 ^= ZE1[ep]; h2 ^= ZE2[ep]; }
    if (side) { h1 ^= ZS1; h2 ^= ZS2; }
  }

  // ---------- Bewertung ----------
  var MG_VAL = [0, 82, 337, 365, 477, 1025, 0], EG_VAL = [0, 94, 281, 297, 512, 936, 0];
  var PST_MG = new Int16Array(16 * 120), PST_EG = new Int16Array(16 * 120);

  function pst(type, f, r, eg) {
    var cd = Math.max(Math.abs(f - 3.5), Math.abs(r - 3.5));
    var c = 3.5 - cd, fd = Math.abs(f - 3.5);
    switch (type) {
      case 1:
        if (r === 0 || r === 7) return 0;
        if (eg) return [0, 0, 8, 18, 34, 60, 95, 0][r];
        return [0, 0, 4, 10, 20, 34, 52, 0][r] + [-6, -2, 2, 10, 10, 2, -2, -6][f] * (r < 5 ? 1 : 0.4) - (r === 1 && (f === 3 || f === 4) ? 8 : 0);
      case 2: return eg ? c * 8 - 12 : c * 10 - 14;
      case 3: return eg ? c * 4 - 4 : c * 5 - 6 - (r === 0 ? 6 : 0);
      case 4: return eg ? (r === 6 ? 10 : 0) + c * 2 : (r === 6 ? 12 : 0) + (f === 3 || f === 4 ? 5 : 0);
      case 5: return eg ? c * 5 - 8 : c * 3 - 5;
      default: return eg ? c * 14 - 12 : fd * 8 - r * 22;
    }
  }

  (function () {
    for (var t = 1; t <= 6; t++) {
      for (var r = 0; r < 8; r++) {
        for (var f = 0; f < 8; f++) {
          var sq = (r + 2) * 10 + f + 1, msq = (7 - r + 2) * 10 + f + 1;
          PST_MG[t * 120 + sq] = Math.round(MG_VAL[t] + pst(t, f, r, false));
          PST_EG[t * 120 + sq] = Math.round(EG_VAL[t] + pst(t, f, r, true));
          PST_MG[(t + 8) * 120 + msq] = -Math.round(MG_VAL[t] + pst(t, f, r, false));
          PST_EG[(t + 8) * 120 + msq] = -Math.round(EG_VAL[t] + pst(t, f, r, true));
        }
      }
    }
  })();

  var PHASE_W = [0, 0, 1, 1, 2, 4, 0];
  var wCnt = new Int8Array(10), bCnt = new Int8Array(10), wMin = new Int8Array(10), bMax = new Int8Array(10);
  var wPawns = new Int16Array(10), bPawns = new Int16Array(10), rooks = new Int16Array(8);
  var PASSED = [0, 0, 8, 16, 32, 56, 96, 0];

  // Bewertung aus Sicht des Spielers am Zug
  function evaluate() {
    var mg = 0, eg = 0, phase = 0, s, p, t, f, r, i;
    var wb = 0, bb = 0, nw = 0, nb = 0, wpn = 0, bpn = 0, nr = 0, wMat = 0, bMat = 0;
    for (i = 0; i < 10; i++) { wCnt[i] = 0; bCnt[i] = 0; wMin[i] = 8; bMax[i] = -1; }
    for (s = 21; s <= 98; s++) {
      p = B[s];
      if (p === 0 || p >= OFF) continue;
      mg += PST_MG[p * 120 + s];
      eg += PST_EG[p * 120 + s];
      t = p & 7;
      phase += PHASE_W[t];
      if (t === 1) {
        f = s % 10; r = Math.floor(s / 10) - 2;
        if (p === 1) { wCnt[f]++; if (r < wMin[f]) wMin[f] = r; wPawns[wpn++] = s; }
        else { bCnt[f]++; if (r > bMax[f]) bMax[f] = r; bPawns[bpn++] = s; }
      } else if (t === 3) { if (p === 3) wb++; else bb++; if (p === 3) wMat++; else bMat++; }
      else if (t === 2) { if (p === 2) wMat++; else bMat++; }
      else if (t === 4) { rooks[nr++] = s; if (p === 4) wMat += 2; else bMat += 2; }
      else if (t === 5) { if (p === 5) wMat += 4; else bMat += 4; }
    }
    // Zu wenig Material: Remis
    if (wpn === 0 && bpn === 0 && wMat <= 1 && bMat <= 1) return 0;

    if (wb >= 2) { mg += 30; eg += 50; }
    if (bb >= 2) { mg -= 30; eg -= 50; }

    for (i = 0; i < wpn; i++) {
      s = wPawns[i]; f = s % 10; r = Math.floor(s / 10) - 2;
      if (wCnt[f] > 1) { mg -= 8; eg -= 16; }
      if (wCnt[f - 1] === 0 && wCnt[f + 1] === 0) { mg -= 12; eg -= 15; }
      if (!(bMax[f] > r || bMax[f - 1] > r || bMax[f + 1] > r)) { mg += PASSED[r] >> 1; eg += PASSED[r] + (PASSED[r] >> 1); }
    }
    for (i = 0; i < bpn; i++) {
      s = bPawns[i]; f = s % 10; r = Math.floor(s / 10) - 2;
      if (bCnt[f] > 1) { mg += 8; eg += 16; }
      if (bCnt[f - 1] === 0 && bCnt[f + 1] === 0) { mg += 12; eg += 15; }
      if (!(wMin[f] < r || wMin[f - 1] < r || wMin[f + 1] < r)) { var rr = 7 - r; mg -= PASSED[rr] >> 1; eg -= PASSED[rr] + (PASSED[rr] >> 1); }
    }
    for (i = 0; i < nr; i++) {
      s = rooks[i]; f = s % 10;
      if (B[s] === 4) { if (wCnt[f] === 0) { if (bCnt[f] === 0) { mg += 20; eg += 15; } else { mg += 10; eg += 8; } } }
      else { if (bCnt[f] === 0) { if (wCnt[f] === 0) { mg -= 20; eg -= 15; } else { mg -= 10; eg -= 8; } } }
    }
    // Königssicherheit: Bauern vor dem König (nur im Mittelspiel)
    var k = KS[0], sh = 0;
    if (k < 40) {
      if (B[k + 10] === 1) sh += 10; if (B[k + 9] === 1) sh += 10; if (B[k + 11] === 1) sh += 10;
      if (B[k + 20] === 1) sh += 5; if (B[k + 19] === 1) sh += 5; if (B[k + 21] === 1) sh += 5;
      mg += sh;
    }
    k = KS[1]; sh = 0;
    if (k > 80) {
      if (B[k - 10] === 9) sh += 10; if (B[k - 9] === 9) sh += 10; if (B[k - 11] === 9) sh += 10;
      if (B[k - 20] === 9) sh += 5; if (B[k - 19] === 9) sh += 5; if (B[k - 21] === 9) sh += 5;
      mg -= sh;
    }
    if (phase > 24) phase = 24;
    var score = ((mg * phase + eg * (24 - phase)) / 24) | 0;
    if (noise) {
      var x = Math.imul(h1 ^ salt, 0x9E3779B1);
      x ^= x >>> 15;
      score += ((x & 0xFFFF) % (2 * noise + 1)) - noise;
    }
    return (side === 0 ? score : -score) + 10;
  }

  // ---------- Angriffe und Zugerzeugung ----------
  function attacked(sq, by) {
    var i, t, d;
    if (by === 0) { if (B[sq - 9] === 1 || B[sq - 11] === 1) return true; }
    else { if (B[sq + 9] === 9 || B[sq + 11] === 9) return true; }
    var kn = by | 2, kg = by | 6;
    for (i = 0; i < 8; i++) { if (B[sq + KN[i]] === kn || B[sq + DK[i]] === kg) return true; }
    var b1 = by | 3, q = by | 5, r1 = by | 4;
    for (i = 0; i < 4; i++) {
      d = DB[i]; t = sq + d;
      while (B[t] === 0) t += d;
      if (B[t] === b1 || B[t] === q) return true;
      d = DR[i]; t = sq + d;
      while (B[t] === 0) t += d;
      if (B[t] === r1 || B[t] === q) return true;
    }
    return false;
  }

  function inCheck() { return attacked(KS[side >> 3], side ^ 8); }

  var MOVES = new Int32Array(MAXPLY * 256 + 256), SCORES = new Int32Array(MAXPLY * 256 + 256);

  // Erzeugt alle Pseudo-Züge (ohne Prüfung auf Selbstschach). Gibt die Zahl der Züge zurück.
  function gen(base, capsOnly) {
    var n = base, s, p, t, to, i, target, d, dir, op = side ^ 8;
    for (s = 21; s <= 98; s++) {
      p = B[s];
      if (p === 0 || p >= OFF || (p & 8) !== side) continue;
      t = p & 7;
      if (t === 1) {
        dir = side === 0 ? 10 : -10;
        var promoTo = side === 0 ? 9 : 2, startRank = side === 0 ? 3 : 8;
        to = s + dir;
        var isPromo = Math.floor(to / 10) === promoTo;
        if (B[to] === 0) {
          if (isPromo) { MOVES[n++] = s | (to << 7) | (5 << 14); if (!capsOnly) { MOVES[n++] = s | (to << 7) | (2 << 14); MOVES[n++] = s | (to << 7) | (4 << 14); MOVES[n++] = s | (to << 7) | (3 << 14); } }
          else if (!capsOnly) {
            MOVES[n++] = s | (to << 7);
            if (Math.floor(s / 10) === startRank && B[to + dir] === 0) MOVES[n++] = s | ((to + dir) << 7) | (4 << 17);
          }
        }
        for (i = -1; i <= 1; i += 2) {
          to = s + dir + i; target = B[to];
          if (target !== 0 && target < OFF && (target & 8) === op) {
            var cap = target << 21;
            if (isPromo) { MOVES[n++] = s | (to << 7) | (5 << 14) | cap; MOVES[n++] = s | (to << 7) | (2 << 14) | cap; MOVES[n++] = s | (to << 7) | (4 << 14) | cap; MOVES[n++] = s | (to << 7) | (3 << 14) | cap; }
            else MOVES[n++] = s | (to << 7) | cap;
          } else if (to === ep && ep !== 0) {
            MOVES[n++] = s | (to << 7) | (1 << 17) | ((op | 1) << 21);
          }
        }
      } else if (t === 2 || t === 6) {
        var offs = t === 2 ? KN : DK;
        for (i = 0; i < 8; i++) {
          to = s + offs[i]; target = B[to];
          if (target === 0) { if (!capsOnly) MOVES[n++] = s | (to << 7); }
          else if (target < OFF && (target & 8) === op) MOVES[n++] = s | (to << 7) | (target << 21);
        }
        if (t === 6 && !capsOnly) {
          if (side === 0) {
            if ((castle & 1) && B[26] === 0 && B[27] === 0 && B[28] === 4 && !attacked(25, 8) && !attacked(26, 8) && !attacked(27, 8)) MOVES[n++] = 25 | (27 << 7) | (2 << 17);
            if ((castle & 2) && B[24] === 0 && B[23] === 0 && B[22] === 0 && B[21] === 4 && !attacked(25, 8) && !attacked(24, 8) && !attacked(23, 8)) MOVES[n++] = 25 | (23 << 7) | (2 << 17);
          } else {
            if ((castle & 4) && B[96] === 0 && B[97] === 0 && B[98] === 12 && !attacked(95, 0) && !attacked(96, 0) && !attacked(97, 0)) MOVES[n++] = 95 | (97 << 7) | (2 << 17);
            if ((castle & 8) && B[94] === 0 && B[93] === 0 && B[92] === 0 && B[91] === 12 && !attacked(95, 0) && !attacked(94, 0) && !attacked(93, 0)) MOVES[n++] = 95 | (93 << 7) | (2 << 17);
          }
        }
      } else {
        var dirs = t === 3 ? DB : t === 4 ? DR : DK;
        var cnt = t === 5 ? 8 : 4;
        for (i = 0; i < cnt; i++) {
          d = dirs[i]; to = s + d;
          while (true) {
            target = B[to];
            if (target === 0) { if (!capsOnly) MOVES[n++] = s | (to << 7); }
            else { if (target < OFF && (target & 8) === op) MOVES[n++] = s | (to << 7) | (target << 21); break; }
            to += d;
          }
        }
      }
    }
    return n;
  }

  // ---------- Zug ausführen und zurücknehmen ----------
  function make(m) {
    var from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flags = (m >> 17) & 15, cap = (m >> 21) & 15;
    var p = B[from];
    U_MOVE[hply] = m; U_CASTLE[hply] = castle; U_EP[hply] = ep; U_HALF[hply] = half; U_H1[hply] = h1; U_H2[hply] = h2;
    h1 ^= Z1[p * 120 + from]; h2 ^= Z2[p * 120 + from];
    B[from] = 0;
    if (cap) {
      if (flags & 1) {
        var cs = side === 0 ? to - 10 : to + 10;
        h1 ^= Z1[cap * 120 + cs]; h2 ^= Z2[cap * 120 + cs]; B[cs] = 0;
      } else { h1 ^= Z1[cap * 120 + to]; h2 ^= Z2[cap * 120 + to]; }
    }
    var np = promo ? (side | promo) : p;
    B[to] = np;
    h1 ^= Z1[np * 120 + to]; h2 ^= Z2[np * 120 + to];
    if ((p & 7) === 6) KS[side >> 3] = to;
    if (flags & 2) {
      var rf, rt;
      if (to > from) { rf = to + 1; rt = to - 1; } else { rf = to - 2; rt = to + 1; }
      var rook = B[rf];
      B[rf] = 0; B[rt] = rook;
      h1 ^= Z1[rook * 120 + rf] ^ Z1[rook * 120 + rt]; h2 ^= Z2[rook * 120 + rf] ^ Z2[rook * 120 + rt];
    }
    h1 ^= ZC1[castle]; h2 ^= ZC2[castle];
    castle &= CMASK[from] & CMASK[to];
    h1 ^= ZC1[castle]; h2 ^= ZC2[castle];
    if (ep) { h1 ^= ZE1[ep]; h2 ^= ZE2[ep]; }
    ep = (flags & 4) ? (side === 0 ? to - 10 : to + 10) : 0;
    if (ep) { h1 ^= ZE1[ep]; h2 ^= ZE2[ep]; }
    half = ((p & 7) === 1 || cap) ? 0 : half + 1;
    side ^= 8;
    h1 ^= ZS1; h2 ^= ZS2;
    hply++;
    HH1[hply] = h1; HH2[hply] = h2;
  }

  function unmake() {
    hply--;
    var m = U_MOVE[hply];
    var from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flags = (m >> 17) & 15, cap = (m >> 21) & 15;
    side ^= 8;
    var p = promo ? (side | 1) : B[to];
    B[from] = p;
    if ((p & 7) === 6) KS[side >> 3] = from;
    if (flags & 1) { B[to] = 0; B[side === 0 ? to - 10 : to + 10] = cap; }
    else B[to] = cap;
    if (flags & 2) {
      var rf, rt;
      if (to > from) { rf = to + 1; rt = to - 1; } else { rf = to - 2; rt = to + 1; }
      B[rf] = B[rt]; B[rt] = 0;
    }
    castle = U_CASTLE[hply]; ep = U_EP[hply]; half = U_HALF[hply]; h1 = U_H1[hply]; h2 = U_H2[hply];
  }

  function makeNull() {
    U_MOVE[hply] = 0; U_CASTLE[hply] = castle; U_EP[hply] = ep; U_HALF[hply] = half; U_H1[hply] = h1; U_H2[hply] = h2;
    if (ep) { h1 ^= ZE1[ep]; h2 ^= ZE2[ep]; }
    ep = 0; half++;
    side ^= 8; h1 ^= ZS1; h2 ^= ZS2;
    hply++; HH1[hply] = h1; HH2[hply] = h2;
  }

  function unmakeNull() {
    hply--; side ^= 8;
    castle = U_CASTLE[hply]; ep = U_EP[hply]; half = U_HALF[hply]; h1 = U_H1[hply]; h2 = U_H2[hply];
  }

  // Alle regelkonformen Züge zählen (für Tests)
  function perft(depth, ply) {
    if (depth === 0) return 1;
    var base = ply * 256, n = gen(base, false), total = 0, us = side >> 3;
    for (var i = base; i < n; i++) {
      var m = MOVES[i];
      make(m);
      if (!attacked(KS[us], side)) total += perft(depth - 1, ply + 1);
      unmake();
    }
    return total;
  }

  // ---------- Suche ----------
  var TT_BITS = 18, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1;
  var ttLock = new Int32Array(TT_SIZE), ttMove = new Int32Array(TT_SIZE), ttScore = new Int16Array(TT_SIZE), ttDepth = new Int8Array(TT_SIZE), ttFlag = new Int8Array(TT_SIZE);
  var KILL1 = new Int32Array(MAXPLY + 4), KILL2 = new Int32Array(MAXPLY + 4);
  var HIST = new Int32Array(16 * 120);
  var nodes = 0, abort = false, deadline = 0, maxNodes = 0, rootPly0 = 0;
  var VICT = [0, 100, 320, 330, 500, 900, 0];
  function nowMs() { return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now(); }

  function isRepetition() {
    var lim = hply - half;
    if (lim < 0) lim = 0;
    for (var i = hply - 2; i >= lim; i -= 2) if (HH1[i] === h1 && HH2[i] === h2) return true;
    return false;
  }

  function hasPieces() {
    // Gibt es außer Bauern und König noch eigene Figuren? (für Nullzug)
    for (var s = 21; s <= 98; s++) {
      var p = B[s];
      if (p > 1 && p < OFF && (p & 8) === side && (p & 7) !== 6 && (p & 7) !== 1) return true;
    }
    return false;
  }

  function scoreMoves(base, n, ply, ttm) {
    for (var i = base; i < n; i++) {
      var m = MOVES[i], sc;
      if (m === ttm) sc = 2000000;
      else {
        var cap = (m >> 21) & 15, promo = (m >> 14) & 7;
        if (cap || promo) {
          sc = 1000000 + VICT[cap & 7] * 10 - VICT[B[m & 127] & 7] / 10 + (promo ? VICT[promo] : 0);
        } else if (m === KILL1[ply]) sc = 900000;
        else if (m === KILL2[ply]) sc = 800000;
        else sc = HIST[B[m & 127] * 120 + ((m >> 7) & 127)];
      }
      SCORES[i] = sc;
    }
  }

  function pick(base, n, i) {
    var best = i, bs = SCORES[i];
    for (var j = i + 1; j < n; j++) if (SCORES[j] > bs) { bs = SCORES[j]; best = j; }
    if (best !== i) { var tm = MOVES[i], ts = SCORES[i]; MOVES[i] = MOVES[best]; SCORES[i] = bs; MOVES[best] = tm; SCORES[best] = ts; }
    return MOVES[i];
  }

  function qsearch(alpha, beta, ply) {
    nodes++;
    if ((nodes & 1023) === 0 && (nowMs() > deadline || (maxNodes && nodes > maxNodes))) abort = true;
    if (abort) return 0;
    if (ply >= MAXPLY - 2) return evaluate();
    var chk = inCheck();
    var stand = -INF;
    if (!chk) {
      stand = evaluate();
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
    }
    var base = ply * 256, n = gen(base, !chk), us = side >> 3, legal = 0;
    scoreMoves(base, n, ply, 0);
    for (var i = base; i < n; i++) {
      var m = pick(base, n, i);
      if (!chk) {
        var cap = (m >> 21) & 15;
        if (stand + VICT[cap & 7] + 200 < alpha && !((m >> 14) & 7)) continue;   // aussichtslos
      }
      make(m);
      if (attacked(KS[us], side)) { unmake(); continue; }
      legal++;
      var sc = -qsearch(-beta, -alpha, ply + 1);
      unmake();
      if (abort) return 0;
      if (sc > stand) stand = sc;
      if (sc > alpha) { alpha = sc; if (alpha >= beta) break; }
    }
    if (chk && legal === 0) return -MATE + ply;
    return stand;
  }

  function search(depth, alpha, beta, ply, canNull) {
    nodes++;
    if ((nodes & 1023) === 0 && (nowMs() > deadline || (maxNodes && nodes > maxNodes))) abort = true;
    if (abort) return 0;
    var pv = beta - alpha > 1, chk = inCheck(), i;
    if (ply > 0) {
      if (half >= 100 || isRepetition()) return 0;
      if (-MATE + ply > alpha) alpha = -MATE + ply;
      if (MATE - ply - 1 < beta) beta = MATE - ply - 1;
      if (alpha >= beta) return alpha;
    }
    if (ply >= MAXPLY - 2) return evaluate();
    if (chk) depth++;
    if (depth <= 0) return qsearch(alpha, beta, ply);

    var idx = h1 & TT_MASK, ttm = 0;
    if (ttLock[idx] === h2) {
      ttm = ttMove[idx];
      if (ttDepth[idx] >= depth && ply > 0) {
        var ts = ttScore[idx], tf = ttFlag[idx];
        if (ts > MATE - 200) ts -= ply; else if (ts < -MATE + 200) ts += ply;
        if (tf === 0) return ts;
        if (tf === 1 && ts >= beta) return ts;
        if (tf === 2 && ts <= alpha) return ts;
      }
    }

    var stat = chk ? -INF : evaluate();
    if (!pv && !chk) {
      if (depth <= 3 && stat - 110 * depth >= beta) return stat;                      // klar besser: abschneiden
      if (canNull && depth >= 3 && stat >= beta && hasPieces()) {                        // Nullzug
        makeNull();
        var ns = -search(depth - 1 - (depth > 5 ? 3 : 2), -beta, -beta + 1, ply + 1, false);
        unmakeNull();
        if (abort) return 0;
        if (ns >= beta) return ns >= MATE - 200 ? beta : ns;
      }
    }

    var base = ply * 256, n = gen(base, false), us = side >> 3, legal = 0, best = -INF, bestMove = 0, flag = 2, origAlpha = alpha;
    scoreMoves(base, n, ply, ttm);
    for (i = base; i < n; i++) {
      var m = pick(base, n, i);
      var quiet = !((m >> 21) & 15) && !((m >> 14) & 7);
      make(m);
      if (attacked(KS[us], side)) { unmake(); continue; }
      legal++;
      var sc, ext = 0;
      if (legal === 1) sc = -search(depth - 1, -beta, -alpha, ply + 1, true);
      else {
        var red = 0;
        if (depth >= 3 && legal > 3 && quiet && !chk) red = legal > 8 ? 2 : 1;
        sc = -search(depth - 1 - red, -alpha - 1, -alpha, ply + 1, true);
        if (sc > alpha && red) sc = -search(depth - 1, -alpha - 1, -alpha, ply + 1, true);
        if (sc > alpha && sc < beta) sc = -search(depth - 1, -beta, -alpha, ply + 1, true);
      }
      unmake();
      if (abort) return 0;
      if (sc > best) {
        best = sc; bestMove = m;
        if (sc > alpha) {
          alpha = sc; flag = 0;
          if (alpha >= beta) {
            flag = 1;
            if (quiet) {
              if (KILL1[ply] !== m) { KILL2[ply] = KILL1[ply]; KILL1[ply] = m; }
              HIST[B[m & 127] * 120 + ((m >> 7) & 127)] += depth * depth;
            }
            break;
          }
        }
      }
    }
    if (legal === 0) return chk ? -MATE + ply : 0;
    if (flag === 2 && best <= origAlpha) flag = 2; else if (flag !== 1) flag = 0;
    var store = best;
    if (store > MATE - 200) store += ply; else if (store < -MATE + 200) store -= ply;
    if (ttLock[idx] !== h2 || ttDepth[idx] <= depth) {
      ttLock[idx] = h2; ttMove[idx] = bestMove; ttScore[idx] = store; ttDepth[idx] = depth; ttFlag[idx] = flag;
    }
    return best;
  }

  // Wurzelzüge: alle regelkonformen Züge der Stellung
  function rootMoves() {
    var n = gen(0, false), us = side >> 3, list = [];
    for (var i = 0; i < n; i++) {
      var m = MOVES[i];
      make(m);
      if (!attacked(KS[us], side)) list.push(m);
      unmake();
    }
    return list;
  }

  function moveToObj(m) {
    var promo = (m >> 14) & 7;
    return { from: sqName(m & 127), to: sqName((m >> 7) & 127), promo: promo ? "  nbrq".charAt(promo) : "" };
  }

  function clearTables() {
    ttLock.fill(0); ttDepth.fill(0); HIST.fill(0); KILL1.fill(0); KILL2.fill(0);
  }

  // Stellung und Vorgeschichte laden (history = Liste früherer Stellungen als FEN, älteste zuerst)
  function setup(fen, history) {
    var idx = 0, i;
    hply = 0;
    for (i = 0; history && i < history.length; i++) {
      loadFEN(history[i]);
      HH1[idx] = h1; HH2[idx] = h2; idx++;
    }
    loadFEN(fen);
    hply = idx;
    HH1[hply] = h1; HH2[hply] = h2;
  }

  // ---------- Zugwahl ----------
  // opts: { fen, history, depth, timeMs, nodes, mode: "best" | "skill", temp, blunder, blunderMax, noise }
  function think(opts) {
    setup(opts.fen, opts.history || []);
    var t0 = nowMs();
    var roots = rootMoves();
    if (!roots.length) return null;
    if (roots.length === 1) return { move: moveToObj(roots[0]), score: 0, depth: 0, nodes: 0, ms: 0 };
    nodes = 0; abort = false; maxNodes = opts.nodes || 0;
    noise = opts.noise || 0;
    salt = noise ? ((opts.rnd || Math.random)() * 4294967296) | 0 : 0;
    deadline = t0 + (opts.timeMs || 1e9);
    var maxDepth = opts.depth || 6;

    if (opts.mode === "skill") {
      // Alle Züge bewerten und mit Streuung auswählen (menschlicher, schwächer)
      var scored = [];
      for (var ri = 0; ri < roots.length; ri++) {
        make(roots[ri]);
        var sc = -search(maxDepth - 1, -INF, INF, 1, true);
        unmake();
        if (abort) break;
        scored.push({ m: roots[ri], s: Math.max(-2000, Math.min(2000, sc)) });
      }
      if (!scored.length) scored.push({ m: roots[0], s: 0 });
      scored.sort(function (a, b) { return b.s - a.s; });
      var top = scored[0].s, chosen = scored[0];
      var rnd = opts.rnd || Math.random;
      if (opts.blunder && rnd() < opts.blunder && scored.length > 1) {
        var pool = scored.filter(function (x, i) { return i > 0 && x.s >= top - (opts.blunderMax || 300); });
        if (!pool.length) pool = scored.slice(1);
        chosen = pool[Math.floor(rnd() * pool.length)];
      } else if (opts.temp) {
        var ws = scored.map(function (x) { return Math.exp((x.s - top) / opts.temp); });
        var tot = ws.reduce(function (a, b) { return a + b; }, 0), r = rnd() * tot, acc = 0;
        for (var wi = 0; wi < scored.length; wi++) { acc += ws[wi]; if (r <= acc) { chosen = scored[wi]; break; } }
      }
      noise = 0;
      return { move: moveToObj(chosen.m), score: chosen.s, depth: maxDepth, nodes: nodes, ms: Math.round(nowMs() - t0) };
    }

    // Stärkster Modus: schrittweise vertiefen
    var bestMove = roots[0], bestScore = 0, doneDepth = 0;
    for (var d = 1; d <= maxDepth; d++) {
      var sc2 = search(d, -INF, INF, 0, false);
      if (abort) break;
      var entry = ttMove[h1 & TT_MASK];
      if (ttLock[h1 & TT_MASK] === h2 && entry) bestMove = entry;
      bestScore = sc2; doneDepth = d;
      if (Math.abs(sc2) > MATE - 100) break;                                  // Matt gefunden
      if (nowMs() - t0 > (opts.timeMs || 1e9) * 0.45 && d >= 4) break;       // für die nächste Tiefe reicht die Zeit nicht
    }
    // Der Zug aus der Hash-Tabelle muss ein gültiger Wurzelzug sein
    if (roots.indexOf(bestMove) < 0) {
      var found = roots.filter(function (x) { return (x & 0x1FFFFF) === (bestMove & 0x1FFFFF); })[0];
      bestMove = found || roots[0];
    }
    noise = 0;
    return { move: moveToObj(bestMove), score: bestScore, depth: doneDepth, nodes: nodes, ms: Math.round(nowMs() - t0) };
  }

  // ---------- Spielstärke (ungefähre Elo) ----------
  // 400 bis 1600: alle Züge werden bewertet und mit Streuung und gelegentlichen Fehlern gewählt.
  // ab 1700: der beste Zug aus einer immer tieferen Suche, mit kleinem Rauschen für Abwechslung.
  var LEVELS = {
    400: { mode: "skill", depth: 1, temp: 150, blunder: 0.45, blunderMax: 700 },
    500: { mode: "skill", depth: 1, temp: 110, blunder: 0.33, blunderMax: 600 },
    600: { mode: "skill", depth: 1, temp: 80, blunder: 0.22, blunderMax: 500 },
    700: { mode: "skill", depth: 2, temp: 75, blunder: 0.18, blunderMax: 450 },
    800: { mode: "skill", depth: 2, temp: 60, blunder: 0.13, blunderMax: 400 },
    900: { mode: "skill", depth: 2, temp: 48, blunder: 0.09, blunderMax: 350 },
    1000: { mode: "skill", depth: 2, temp: 38, blunder: 0.06, blunderMax: 300 },
    1100: { mode: "skill", depth: 3, temp: 36, blunder: 0.045, blunderMax: 300 },
    1200: { mode: "skill", depth: 3, temp: 28, blunder: 0.03, blunderMax: 250 },
    1300: { mode: "skill", depth: 3, temp: 22, blunder: 0.02, blunderMax: 250 },
    1400: { mode: "skill", depth: 3, temp: 16, blunder: 0.01, blunderMax: 200 },
    1500: { mode: "best", depth: 3, timeMs: 300, noise: 110 },
    1600: { mode: "best", depth: 3, timeMs: 300, noise: 80 },
    1700: { mode: "best", depth: 3, timeMs: 300, noise: 45 },
    1800: { mode: "best", depth: 4, timeMs: 300, noise: 100 }
  };

  function levelParams(elo) {
    var e = Math.max(400, Math.min(1800, Math.round(elo / 100) * 100));
    var l = LEVELS[e], o = {};
    for (var k in l) o[k] = l[k];
    return o;
  }

  return {
    levels: LEVELS, levelParams: levelParams,
    loadFEN: loadFEN, setup: setup, perft: function (d) { return perft(d, 0); }, think: think, clearTables: clearTables,
    evaluate: function () { return evaluate(); }, inCheck: function () { return inCheck(); }, rootMoves: function () { return rootMoves().map(moveToObj); }
  };
})();


  // ---------- Figuren ----------
// Figuren im 3D-Drucker-Design: König = Extruder mit Krone, Dame = Filamentspule mit Krone,
// Läufer = Drucker mit offenem Rahmen, Springer = Pferdekopf auf einer Düse,
// Turm = Drucker mit Gehäuse, Bauer = Bauer mit Düsenspitze.
var FigurenArt = (function () {
  "use strict";

  var PAL = {
    w: { main: "#f2791d", mid: "#cf5a0b", dark: "#6b2603", light: "#ffb56e", glass: "rgba(107,38,3,0.45)" },
    b: { main: "#26262b", mid: "#55555e", dark: "#000000", light: "#a3a3b0", glass: "rgba(0,0,0,0.5)" }
  };

  function st(c, w) { return ' stroke="' + c.dark + '" stroke-width="' + (w || 3) + '" stroke-linejoin="round" stroke-linecap="round"'; }

  var ART = {
    // Bauer: kleiner als die anderen, unten eine Düsenspitze
    P: function (c) {
      return '<g transform="translate(50 97) scale(0.84) translate(-50 -97)">' +
        '<path d="M42 43 L58 43 L66 70 L34 70 Z" fill="' + c.main + '"' + st(c) + '/>' +
        '<rect x="37" y="36" width="26" height="8" rx="3.5" fill="' + c.mid + '"' + st(c) + '/>' +
        '<circle cx="50" cy="24" r="12.5" fill="' + c.main + '"' + st(c) + '/>' +
        '<circle cx="45.5" cy="19.5" r="3.6" fill="' + c.light + '" opacity="0.85"/>' +
        '<rect x="29" y="70" width="42" height="9" rx="3.5" fill="' + c.mid + '"' + st(c) + '/>' +
        '<rect x="40" y="79" width="20" height="6" fill="' + c.main + '"' + st(c) + '/>' +
        '<path d="M40 85 L60 85 L50 96 Z" fill="' + c.mid + '"' + st(c) + '/>' +
        '</g>';
    },
    // Turm: Drucker mit Gehäuse und Zinnen
    R: function (c) {
      return '<rect x="24" y="19" width="13" height="14" rx="2" fill="' + c.main + '"' + st(c) + '/>' +
        '<rect x="43.5" y="19" width="13" height="14" rx="2" fill="' + c.main + '"' + st(c) + '/>' +
        '<rect x="63" y="19" width="13" height="14" rx="2" fill="' + c.main + '"' + st(c) + '/>' +
        '<rect x="24" y="30" width="52" height="58" rx="6" fill="' + c.main + '"' + st(c) + '/>' +
        '<rect x="32" y="41" width="36" height="37" rx="4" fill="' + c.glass + '"' + st(c, 2.5) + '/>' +
        '<rect x="35" y="50" width="30" height="4" fill="' + c.light + '"' + st(c, 1.5) + '/>' +
        '<rect x="46" y="48" width="9" height="12" rx="2" fill="' + c.main + '"' + st(c, 2) + '/>' +
        '<path d="M48 60 L53 60 L50.5 65 Z" fill="' + c.light + '"' + st(c, 1.5) + '/>' +
        '<rect x="36" y="70" width="28" height="5" rx="1.5" fill="' + c.light + '"' + st(c, 2) + '/>' +
        '<rect x="27" y="86" width="12" height="6" rx="2" fill="' + c.mid + '"' + st(c, 2.5) + '/>' +
        '<rect x="61" y="86" width="12" height="6" rx="2" fill="' + c.mid + '"' + st(c, 2.5) + '/>';
    },
    // Läufer: Drucker mit offenem Rahmen
    B: function (c) {
      return '<rect x="16" y="27" width="12" height="9" rx="2" fill="' + c.main + '"' + st(c, 2.5) + '/>' +
        '<rect x="26" y="14" width="7" height="62" fill="' + c.main + '"' + st(c, 2.5) + '/>' +
        '<rect x="67" y="14" width="7" height="62" fill="' + c.main + '"' + st(c, 2.5) + '/>' +
        '<rect x="22" y="9" width="56" height="10" rx="2.5" fill="' + c.main + '"' + st(c) + '/>' +
        '<path d="M56 36 Q66 28 61 19" fill="none"' + st(c, 2.5) + '/>' +
        '<rect x="30" y="40" width="40" height="6" rx="1.5" fill="' + c.mid + '"' + st(c, 2.5) + '/>' +
        '<rect x="45" y="34" width="12" height="17" rx="2.5" fill="' + c.main + '"' + st(c, 2.5) + '/>' +
        '<path d="M47 51 L55 51 L51 58 Z" fill="' + c.light + '"' + st(c, 2) + '/>' +
        '<path d="M30 68 L70 68 L77 75 L23 75 Z" fill="' + c.light + '"' + st(c, 2.5) + '/>' +
        '<rect x="21" y="75" width="58" height="13" rx="3" fill="' + c.main + '"' + st(c) + '/>' +
        '<rect x="30" y="80" width="14" height="3" rx="1.5" fill="' + c.mid + '"/>';
    },
    // Springer: Pferdekopf mit Mähne auf einer Düse
    N: function (c) {
      return '<path d="M34 73 C27 58 29 40 42 28 L45 13 L56 24 C63 28 75 36 83 50 L79 59 C72 61 66 59 62 57 C58 61 58 67 63 73 Z" fill="' + c.main + '"' + st(c) + '/>' +
        '<path d="M42 28 L29 21 L38 35 Z" fill="' + c.mid + '"' + st(c, 2.5) + '/>' +
        '<path d="M37 38 L23 36 L34 47 Z" fill="' + c.mid + '"' + st(c, 2.5) + '/>' +
        '<path d="M33 48 L20 49 L31 59 Z" fill="' + c.mid + '"' + st(c, 2.5) + '/>' +
        '<path d="M32 59 L21 64 L34 70 Z" fill="' + c.mid + '"' + st(c, 2.5) + '/>' +
        '<path d="M53 33 Q61 35 67 43" fill="none" stroke="' + c.light + '" stroke-width="2.5" stroke-linecap="round" opacity="0.75"/>' +
        '<circle cx="64" cy="38" r="2.8" fill="' + c.dark + '"/>' +
        '<circle cx="78" cy="52" r="1.7" fill="' + c.dark + '"/>' +
        '<rect x="29" y="72" width="42" height="8" rx="3.5" fill="' + c.mid + '"' + st(c) + '/>' +
        '<rect x="41" y="80" width="18" height="6" fill="' + c.main + '"' + st(c) + '/>' +
        '<path d="M41 86 L59 86 L50 96 Z" fill="' + c.mid + '"' + st(c) + '/>';
    },
    // Dame: Filamentspule mit Krone
    Q: function (c) {
      var lines = "";
      [58, 64, 70, 76].forEach(function (y) { lines += '<path d="M30 ' + y + ' Q50 ' + (y + 6) + ' 70 ' + y + '" fill="none"' + st(c, 1.8) + '/>'; });
      return '<ellipse cx="50" cy="80" rx="36" ry="8.5" fill="' + c.mid + '"' + st(c) + '/>' +
        '<rect x="30" y="52" width="40" height="28" fill="' + c.main + '"' + st(c, 3) + '/>' +
        lines +
        '<ellipse cx="50" cy="52" rx="36" ry="8.5" fill="' + c.mid + '"' + st(c) + '/>' +
        '<ellipse cx="50" cy="52" rx="13" ry="3.6" fill="' + c.dark + '"/>' +
        '<path d="M33 46 L30 26 L41 36 L50 19 L59 36 L70 26 L67 46 Z" fill="' + c.main + '"' + st(c) + '/>' +
        '<rect x="33" y="42" width="34" height="6" rx="2" fill="' + c.mid + '"' + st(c, 2.5) + '/>' +
        '<circle cx="30" cy="25" r="3.2" fill="' + c.light + '"' + st(c, 2) + '/>' +
        '<circle cx="50" cy="18" r="3.2" fill="' + c.light + '"' + st(c, 2) + '/>' +
        '<circle cx="70" cy="25" r="3.2" fill="' + c.light + '"' + st(c, 2) + '/>';
    },
    // König: Extruder (Motor, Zahnräder, Düse) mit Krone und Filamentschlauch
    K: function (c) {
      return '<path d="M76 30 C87 26 89 15 82 6" fill="none" stroke="' + c.dark + '" stroke-width="5.5" stroke-linecap="round"/>' +
        '<path d="M76 30 C87 26 89 15 82 6" fill="none" stroke="' + c.mid + '" stroke-width="2.4" stroke-linecap="round"/>' +
        '<rect x="13" y="37" width="24" height="26" rx="4" fill="' + c.mid + '"' + st(c) + '/>' +
        '<path d="M19 37 V63 M25 37 V63 M31 37 V63" fill="none"' + st(c, 1.5) + '/>' +
        '<rect x="32" y="27" width="52" height="40" rx="10" fill="' + c.main + '"' + st(c) + '/>' +
        '<circle cx="66" cy="45" r="13.5" fill="none" stroke="' + c.dark + '" stroke-width="3.6" stroke-dasharray="4.4 3.4"/>' +
        '<circle cx="66" cy="45" r="11" fill="' + c.mid + '"' + st(c, 2.2) + '/>' +
        '<circle cx="66" cy="45" r="4" fill="' + c.light + '"' + st(c, 2) + '/>' +
        '<circle cx="47" cy="55" r="9.5" fill="none" stroke="' + c.dark + '" stroke-width="3.2" stroke-dasharray="3.6 3"/>' +
        '<circle cx="47" cy="55" r="7.5" fill="' + c.mid + '"' + st(c, 2.2) + '/>' +
        '<circle cx="47" cy="55" r="2.6" fill="' + c.light + '"' + st(c, 1.6) + '/>' +
        '<rect x="42" y="67" width="26" height="8" fill="' + c.mid + '"' + st(c, 2.5) + '/>' +
        '<rect x="40" y="75" width="30" height="8" rx="2" fill="' + c.main + '"' + st(c, 2.5) + '/>' +
        '<path d="M45 83 L65 83 L55 96 Z" fill="' + c.mid + '"' + st(c, 2.5) + '/>' +
        '<path d="M42 19 L39 7 L46 13 L52 4 L58 13 L65 7 L62 19 Z" fill="' + c.main + '"' + st(c, 2.8) + '/>' +
        '<rect x="41" y="16" width="22" height="6" rx="2" fill="' + c.mid + '"' + st(c, 2.2) + '/>';
    }
  };

  // Alle Figuren als <symbol> in einer Zeichnung: ID qs-wK (weiß/orange König), qs-bP (schwarzer Bauer) usw.
  function sprite() {
    var out = '<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>';
    ["w", "b"].forEach(function (col) {
      Object.keys(ART).forEach(function (t) {
        out += '<symbol id="qs-' + col + t + '" viewBox="0 0 100 100">' + ART[t](PAL[col]) + '</symbol>';
      });
    });
    return out + '</defs></svg>';
  }

  return { sprite: sprite, TYPES: Object.keys(ART) };
})();


  var ELO_MIN = 400, ELO_MAX = 1800;

  function eloLabel(e) { return e < 800 ? "Anfänger" : e < 1200 ? "Einsteiger" : e < 1500 ? "Fortgeschritten" : "Stark"; }

  function loadElo() {
    try {
      var v = Number(localStorage.getItem("schach-elo"));
      if (v >= ELO_MIN && v <= ELO_MAX) return Math.round(v / 100) * 100;
    } catch (e) {}
    return 1000;
  }

  function saveElo(v) { try { localStorage.setItem("schach-elo", String(v)); } catch (e) {} }

  // Stellung als FEN-Text für den Motor
  function toFEN(s) {
    var rows = [], r, f, p, e, row;
    for (r = 0; r < 8; r++) {
      row = ""; e = 0;
      for (f = 0; f < 8; f++) {
        p = s.b[r * 8 + f];
        if (!p) e++; else { if (e) row += e; e = 0; row += p; }
      }
      if (e) row += e;
      rows.push(row);
    }
    var c = s.castle, cr = (c.K ? "K" : "") + (c.Q ? "Q" : "") + (c.k ? "k" : "") + (c.q ? "q" : "");
    return rows.join("/") + " " + s.turn + " " + (cr || "-") + " " + (s.ep >= 0 ? sqName(s.ep) : "-") + " " + s.half + " 1";
  }

  var SVGNS = "http://www.w3.org/2000/svg", XLINK = "http://www.w3.org/1999/xlink";
  var FIG_KEY = "schach-figuren";
  var GLYPH = { K: "\u265A", Q: "\u265B", R: "\u265C", B: "\u265D", N: "\u265E", P: "\u265F" };
  var figStyle = (function () {
    try { return localStorage.getItem(FIG_KEY) === "klassisch" ? "klassisch" : "art"; } catch (e) { return "art"; }
  })();

  function pieceSvg(p) {
    if (figStyle === "klassisch") {
      var white = isWhite(p);
      var sv = document.createElementNS(SVGNS, "svg");
      sv.setAttribute("viewBox", "0 0 100 100");
      sv.setAttribute("aria-hidden", "true");
      var t = document.createElementNS(SVGNS, "text");
      t.setAttribute("x", "50");
      t.setAttribute("y", "78");
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("font-size", "88");
      t.setAttribute("font-family", "'Segoe UI Symbol','Noto Sans Symbols 2','DejaVu Sans','Apple Symbols',serif");
      t.setAttribute("fill", white ? "#ffffff" : "#15181d");
      t.setAttribute("stroke", white ? "#15181d" : "#ffffff");
      t.setAttribute("stroke-width", white ? "3.5" : "2");
      t.setAttribute("stroke-linejoin", "round");
      t.setAttribute("paint-order", "stroke fill");
      t.textContent = GLYPH[p.toUpperCase()] + "\uFE0E";
      sv.appendChild(t);
      return sv;
    }
    var id = "#qs-" + (isWhite(p) ? "w" : "b") + p.toUpperCase();
    var svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("aria-hidden", "true");
    var use = document.createElementNS(SVGNS, "use");
    use.setAttribute("href", id);
    use.setAttributeNS(XLINK, "xlink:href", id);
    svg.appendChild(use);
    return svg;
  }

  var SCH_CSS = ".sq svg{width:92%;height:92%;pointer-events:none}" +
    ".sq.bp svg{filter:drop-shadow(0 0 1.2px rgba(255,255,255,0.9))}" +
    ".sq.wp svg{filter:drop-shadow(0 0 0.8px rgba(0,0,0,0.4))}" +
    ".sch-elo{max-width:26rem;margin:0 0 1rem}" +
    ".sch-elo label{display:block;margin:0 0 0.3rem;font-weight:600}" +
    ".sch-elo input[type=range]{width:100%;padding:0;accent-color:var(--accent);background:transparent;border:0}" +
    ".board{position:relative}" +
    ".sch-end{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;cursor:pointer;overflow:hidden;opacity:0;animation:sch-in .45s ease-out forwards}" +
    ".sch-end.win{background:radial-gradient(circle at 50% 42%,rgba(255,214,102,.93),rgba(31,138,91,.9) 70%)}" +
    ".sch-end.lose{background:radial-gradient(circle at 50% 42%,rgba(130,24,36,.88),rgba(8,10,20,.94) 72%)}" +
    ".sch-end.draw{background:radial-gradient(circle at 50% 42%,rgba(96,140,190,.92),rgba(24,40,66,.94) 72%)}" +
    ".sch-end h3{font-family:var(--serif,Georgia,serif);font-size:clamp(2rem,10vw,3.2rem);line-height:1.1;margin:.25rem 0;color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.45);animation:sch-pop .7s cubic-bezier(.2,1.6,.4,1) .15s both}" +
    ".sch-end p{margin:0;font-size:1.05rem;opacity:.95;animation:sch-pop .6s ease-out .4s both}" +
    ".sch-end .ico{font-size:3.6rem;line-height:1;animation:sch-bounce 1.3s ease-in-out .5s infinite}" +
    ".sch-end.lose .ico{animation:sch-drop 1.6s ease-in-out infinite}" +
    ".sch-end .hint{font-size:.8rem;opacity:.75;margin-top:1rem}" +
    ".sch-conf{position:absolute;top:-10%;border-radius:2px;pointer-events:none;animation:sch-fall linear infinite}" +
    ".board.sch-shake{animation:sch-shake .6s}" +
    "@keyframes sch-in{to{opacity:1}}@keyframes sch-pop{from{transform:scale(.2) rotate(-8deg);opacity:0}to{transform:none;opacity:1}}" +
    "@keyframes sch-bounce{50%{transform:translateY(-9px) scale(1.07)}}@keyframes sch-drop{50%{transform:translateY(7px) rotate(-6deg)}}" +
    "@keyframes sch-fall{to{transform:translateY(560px) rotate(720deg)}}" +
    "@keyframes sch-shake{20%{transform:translateX(-9px)}40%{transform:translateX(9px)}60%{transform:translateX(-5px)}80%{transform:translateX(4px)}}" +
    "@media (prefers-reduced-motion:reduce){.sch-end,.sch-end *{animation:none!important}.sch-end{opacity:1}.board.sch-shake{animation:none}}" +
    ".sch-lobby{max-width:30rem;margin:0 0 1rem}" +
    ".sch-lobby p{margin:0 0 0.8rem}" +
    ".sch-lobby .row{margin:0.4rem 0 1rem;align-items:center}" +
    ".sch-lobby input[type=text]{width:9rem;font:600 1.4rem/1.2 var(--serif,Georgia,serif);letter-spacing:0.25em;text-transform:uppercase;text-align:center}" +
    ".sch-bar{margin:0 0 0.8rem}" +
    ".sch-code{display:inline-block;font:700 1.9rem/1.2 var(--serif,Georgia,serif);letter-spacing:0.3em;padding:0.1em 0.35em 0.1em 0.5em;border:2px dashed var(--accent);border-radius:0.5rem;margin:0.2rem 0.8rem 0.4rem 0}" +
    ".sch-bar .row{margin:0.4rem 0 0}";

  // ---------- Oberfläche ----------
  function sqName(sq) { return FILES[sq & 7] + (8 - (sq >> 3)); }

  function pieceName(p) {
    return (isWhite(p) ? "weißer " : "schwarzer ") + NAMES[p.toLowerCase()];
  }

  function chipRow(box, label, items, onPick) {
    var row = document.createElement("div");
    row.className = "chips";
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", label);
    var buttons = items.map(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.textContent = it[1];
      b.addEventListener("click", function () { onPick(it[0]); });
      row.appendChild(b);
      return { id: it[0], el: b };
    });
    box.appendChild(row);
    return function mark(active) {
      buttons.forEach(function (x) { x.el.setAttribute("aria-pressed", String(x.id === active)); });
    };
  }

  function start(box) {
    if (!document.getElementById("sch-style")) {
      var st = document.createElement("style");
      st.id = "sch-style";
      st.textContent = SCH_CSS;
      document.head.appendChild(st);
    }
    if (!document.getElementById("qs-sprite")) {
      var sp = document.createElement("div");
      sp.id = "qs-sprite";
      sp.innerHTML = FigurenArt.sprite();
      document.body.appendChild(sp);
    }
    var OKEY = "schach-online";
    var mode = loadNet() ? "online" : "w";      // "w": du spielst Weiß, "b": du spielst Schwarz, "2": zwei Spieler, "online": gegen ein anderes Gerät
    var elo = loadElo();
    var state, keys, stack, last, sel, targets, cur, thinking, timer, stopped = false;
    var played = [], net = null, pollT = null, sending = false, desync = false, overSent = false, onlineColor = "r";

    var markMode = chipRow(box, "Spielmodus",
      [["w", "Als Weiß gegen Computer"], ["b", "Als Schwarz gegen Computer"], ["2", "Zwei Spieler"], ["online", "Online mit Code"]],
      function (id) {
        leaveOnlineView();
        mode = id;
        markMode(mode);
        eloBox.hidden = mode === "2" || mode === "online";
        if (mode === "online") enterOnline(); else newGame();
      });

    var markFig = chipRow(box, "Aussehen der Figuren",
      [["art", "Figuren: N3dXo-Design"], ["klassisch", "Figuren: Klassisch"]],
      function (id) {
        figStyle = id;
        try { localStorage.setItem(FIG_KEY, id); } catch (e) {}
        markFig(id);
        for (var i = 0; i < cells.length; i++) cells[i].dataset.p = "#";   // erzwingt neu zeichnen
        if (state && (mode !== "online" || net)) render();
      });
    markFig(figStyle);

    var eloBox = document.createElement("div");
    eloBox.className = "sch-elo";
    var eloText = document.createElement("label");
    eloText.htmlFor = "sch-elo-in";
    var eloInput = document.createElement("input");
    eloInput.type = "range";
    eloInput.id = "sch-elo-in";
    eloInput.min = String(ELO_MIN);
    eloInput.max = String(ELO_MAX);
    eloInput.step = "100";
    eloInput.value = String(elo);
    function updateEloText() { eloText.textContent = "Stärke des Computers: ca. " + elo + " Elo (" + eloLabel(elo) + ")"; }
    eloInput.addEventListener("input", function () { elo = Number(eloInput.value); saveElo(elo); updateEloText(); });
    updateEloText();
    eloBox.appendChild(eloText);
    eloBox.appendChild(eloInput);
    box.appendChild(eloBox);

    var board = document.createElement("div");
    board.className = "board";
    board.setAttribute("role", "group");
    board.setAttribute("aria-label", "Schachbrett");
    var cells = [];
    for (var i = 0; i < 64; i++) {
      var cell = document.createElement("button");
      cell.type = "button";
      cell.addEventListener("click", function (e) { onSquare(Number(e.currentTarget.dataset.sq)); });
      board.appendChild(cell);
      cells.push(cell);
    }
    box.appendChild(board);

    // ---------- Ende der Partie: Animation für Sieg, Niederlage und Remis ----------
    var endEl = null, shownKey = "", audio = null;
    function reasonText(r) { return r === "matt" ? "Schachmatt" : r === "patt" ? "Patt" : r === "50" ? "50-Züge-Regel" : r === "material" ? "Zu wenig Material" : "Dreimal dieselbe Stellung"; }
    function outcome() {
      if (mode === "online") {
        if (!net || net.players < 2) return null;
        if (net.st === "end" && net.reason === "draw") return { kind: "draw", sub: "Remis vereinbart" };
        if (net.st === "end" && net.reason && net.reason.indexOf("resign-") === 0) {
          return net.reason.slice(7) === net.you ? { kind: "lose", sub: "Du hast aufgegeben" } : { kind: "win", sub: "Dein Gegner hat aufgegeben" };
        }
        if (!cur || !cur.over) return null;
        if (cur.result === "matt") return state.turn === net.you ? { kind: "lose", sub: "Schachmatt" } : { kind: "win", sub: "Schachmatt" };
        return { kind: "draw", sub: reasonText(cur.result) };
      }
      if (!cur || !cur.over) return null;
      if (cur.result !== "matt") return { kind: "draw", sub: reasonText(cur.result) };
      var winner = state.turn === "w" ? "b" : "w";
      if (mode === "2") return { kind: "win", title: winner === "w" ? "Weiß gewinnt!" : "Schwarz gewinnt!", sub: "Schachmatt" };
      return winner === humanColor() ? { kind: "win", sub: "Schachmatt" } : { kind: "lose", sub: "Schachmatt" };
    }
    function jingle(kind) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC || stopped) return;
        audio = audio || new AC();
        if (audio.state === "suspended") audio.resume();
        var seq = kind === "win" ? [523, 659, 784, 1047] : kind === "lose" ? [392, 330, 262, 196] : [440, 440];
        seq.forEach(function (f, i) {
          var t0 = audio.currentTime + i * 0.14, o = audio.createOscillator(), g = audio.createGain();
          o.type = kind === "lose" ? "sawtooth" : "triangle";
          o.frequency.value = f;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
          o.connect(g); g.connect(audio.destination);
          o.start(t0); o.stop(t0 + 0.32);
        });
      } catch (e) {}
    }
    function hideEnd() {
      if (endEl && endEl.parentNode) endEl.parentNode.removeChild(endEl);
      endEl = null;
    }
    function showEnd(o) {
      hideEnd();
      var el = document.createElement("div"), ico = document.createElement("div"), h = document.createElement("h3"),
        p = document.createElement("p"), hint = document.createElement("div"), i, c, cols;
      el.className = "sch-end " + o.kind;
      el.setAttribute("role", "status");
      ico.className = "ico";
      ico.textContent = o.kind === "win" ? "🏆" : o.kind === "lose" ? "💔" : "🤝";
      h.textContent = o.title || (o.kind === "win" ? "Gewonnen!" : o.kind === "lose" ? "Verloren" : "Remis");
      p.textContent = o.sub || "";
      hint.className = "hint";
      hint.textContent = "Tippen zum Ausblenden";
      if (o.kind !== "draw") {
        cols = o.kind === "win" ? ["#ffd23f", "#ff5d73", "#4cd7a6", "#6aa7ff", "#d6409f", "#ffffff"] : ["#2b2f3a", "#4a4f5e", "#6b2230", "#1b1d26"];
        for (i = 0; i < (o.kind === "win" ? 44 : 18); i++) {
          c = document.createElement("span");
          c.className = "sch-conf";
          c.style.left = Math.round(Math.random() * 100) + "%";
          c.style.width = (5 + Math.round(Math.random() * 5)) + "px";
          c.style.height = (o.kind === "win" ? 8 + Math.round(Math.random() * 6) : 10 + Math.round(Math.random() * 14)) + "px";
          c.style.background = cols[i % cols.length];
          c.style.animationDuration = (o.kind === "win" ? 2 + Math.random() * 2 : 3 + Math.random() * 2).toFixed(2) + "s";
          c.style.animationDelay = (-Math.random() * 3).toFixed(2) + "s";
          el.appendChild(c);
        }
      }
      [ico, h, p, hint].forEach(function (x) { el.appendChild(x); });
      el.addEventListener("click", hideEnd);
      board.appendChild(el);
      endEl = el;
      if (o.kind === "lose") {
        board.classList.remove("sch-shake");
        void board.offsetWidth;
        board.classList.add("sch-shake");
        setTimeout(function () { board.classList.remove("sch-shake"); }, 700);
      }
      jingle(o.kind);
    }
    function endFx() {
      var o = outcome();
      if (!o) { shownKey = ""; hideEnd(); return; }
      var key = mode + "|" + o.kind + "|" + o.sub + "|" + stack.length + "|" + (net ? net.code + net.st + net.reason : "");
      if (key === shownKey) return;
      shownKey = key;
      showEnd(o);
    }

    var info = document.createElement("p");
    info.className = "msg";
    info.setAttribute("aria-live", "polite");
    box.appendChild(info);

    var row = document.createElement("div");
    row.className = "row";
    var newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.textContent = "Neues Spiel";
    newBtn.addEventListener("click", newGame);
    var undoBtn = document.createElement("button");
    undoBtn.type = "button";
    undoBtn.className = "link";
    undoBtn.textContent = "Zug zurück";
    undoBtn.addEventListener("click", undo);
    row.appendChild(newBtn);
    row.appendChild(undoBtn);
    box.appendChild(row);

    function humanColor() { return mode === "b" ? "b" : "w"; }
    function computerTurn() { return mode !== "2" && mode !== "online" && state.turn !== humanColor(); }
    function say(t) { info.textContent = t; }

    function statusText() {
      if (mode === "online") return onlineStatus();
      var who = state.turn === "w" ? "Weiß (orange)" : "Schwarz";
      if (cur.over) {
        if (cur.result === "matt") return "Schachmatt! " + (state.turn === "w" ? "Schwarz" : "Weiß") + " gewinnt.";
        if (cur.result === "patt") return "Patt: unentschieden.";
        if (cur.result === "50") return "Remis (50-Züge-Regel).";
        if (cur.result === "material") return "Remis (zu wenig Material).";
        return "Remis (dreimal dieselbe Stellung).";
      }
      if (thinking) return "Computer denkt nach …";
      var who2 = mode === "2" ? who + " ist am Zug" : (computerTurn() ? "Computer ist am Zug" : "Du bist am Zug");
      return who2 + (cur.check ? ": Schach!" : ".");
    }

    function render() {
      var flip = mode === "b" || (mode === "online" && !!net && net.you === "b");
      for (var i = 0; i < 64; i++) {
        var sq = flip ? 63 - i : i;
        var p = state.b[sq], r = sq >> 3, f = sq & 7, c = cells[i];
        c.dataset.sq = String(sq);
        c.className = "sq " + (((r + f) & 1) ? "dk" : "lt") +
          (p ? (isWhite(p) ? " wp" : " bp") : "") +
          (sq === sel ? " sel" : "") +
          (targets.indexOf(sq) >= 0 ? " tg" : "") +
          (last && (sq === last.from || sq === last.to) ? " lm" : "");
        var pk = p || "";
        if (c.dataset.p !== pk) {
          c.dataset.p = pk;
          c.textContent = "";
          if (p) c.appendChild(pieceSvg(p));
        }
        c.setAttribute("aria-label", sqName(sq) + (p ? ", " + pieceName(p) : ", leer"));
      }
      say(statusText());
      if (mode === "online") renderBar();
      endFx();
    }

    function afterMove() {
      cur = status(state, keys);
      sel = -1;
      targets = [];
      thinking = !cur.over && computerTurn();
      render();
      if (thinking) timer = setTimeout(computerMove, 60);
    }

    function moveStr(m) { return sqName(m.from) + sqName(m.to) + (m.promo || ""); }

    function step(m) {
      stack.push({ s: state, k: keys.length, last: last });
      state = make(state, m);
      keys.push(keyOf(state));
      played.push(moveStr(m));
      last = { from: m.from, to: m.to };
    }

    function apply(m) {
      step(m);
      afterMove();
      if (mode === "online") sendMove(played.length - 1, played[played.length - 1]);
    }

    function computerMove() {
      if (stopped) return;
      var m = null;
      try {
        var params = SchachMotor.levelParams(elo);
        params.fen = toFEN(state);
        params.history = stack.slice(-120).map(function (e) { return toFEN(e.s); });
        SchachMotor.clearTables();
        var res = SchachMotor.think(params);
        if (res) {
          var key = res.move.from + res.move.to + res.move.promo;
          m = cur.moves.filter(function (x) { return sqName(x.from) + sqName(x.to) + (x.promo || "") === key; })[0];
        }
      } catch (e) {}
      if (!m) m = cur.moves[Math.floor(Math.random() * cur.moves.length)];   // Notfall: irgendein erlaubter Zug
      thinking = false;
      apply(m);
    }

    function onSquare(sq) {
      if (thinking || cur.over || computerTurn()) return;
      if (mode === "online" && (!net || net.players < 2 || net.st !== "play" || state.turn !== net.you || sending)) return;
      var p = state.b[sq];
      if (sel >= 0 && targets.indexOf(sq) >= 0) {
        var cands = cur.moves.filter(function (m) { return m.from === sel && m.to === sq; });
        var m = cands.filter(function (x) { return !x.promo || x.promo === "q"; })[0] || cands[0];
        apply(m);
        return;
      }
      if (p && colorOf(p) === state.turn) {
        sel = sq;
        targets = cur.moves.filter(function (m) { return m.from === sq; }).map(function (m) { return m.to; });
      } else {
        sel = -1;
        targets = [];
      }
      render();
    }

    function undo() {
      if (thinking) return;
      var min = (mode === "b") ? 1 : 0;   // der erste Computerzug bleibt stehen
      if (stack.length <= min) return;
      do {
        var e = stack.pop();
        state = e.s; keys.length = e.k; last = e.last;
      } while (mode !== "2" && state.turn !== humanColor() && stack.length > min);
      afterMove();
    }

    function newGame() {
      clearTimeout(timer);
      state = fromFEN(START);
      keys = [keyOf(state)];
      stack = [];
      played = [];
      last = null;
      sel = -1;
      targets = [];
      afterMove();
    }

    // ---------- Online (zwei Geräte, verbunden über einen Code) ----------
    function loadNet() {
      try {
        var v = JSON.parse(localStorage.getItem(OKEY));
        if (v && typeof v.code === "string" && typeof v.token === "string" && (v.you === "w" || v.you === "b")) return v;
      } catch (e) {}
      return null;
    }

    function saveNet() {
      try {
        if (net && net.st !== "end") localStorage.setItem(OKEY, JSON.stringify({ code: net.code, token: net.token, you: net.you }));
        else localStorage.removeItem(OKEY);
      } catch (e) {}
    }

    function post(path, body) {
      return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) { d.ok = r.ok; d.http = r.status; return d; });
        });
    }

    var lobby = document.createElement("div");
    lobby.className = "sch-lobby";
    lobby.hidden = true;
    var lobbyIntro = document.createElement("p");
    lobbyIntro.textContent = "Spiele gegen jemanden auf einem anderen Gerät. Eine Person erstellt eine Partie und schickt den Code. Die andere Person gibt den Code ein.";
    lobby.appendChild(lobbyIntro);
    var markOnlineColor = chipRow(lobby, "Meine Farbe",
      [["r", "Farbe zufällig"], ["w", "Ich bin Weiß"], ["b", "Ich bin Schwarz"]],
      function (id) { onlineColor = id; markOnlineColor(id); });
    markOnlineColor(onlineColor);
    var createRow = document.createElement("div");
    createRow.className = "row";
    var createBtn = document.createElement("button");
    createBtn.type = "button";
    createBtn.textContent = "Partie erstellen";
    createRow.appendChild(createBtn);
    lobby.appendChild(createRow);
    var joinLabel = document.createElement("label");
    joinLabel.htmlFor = "sch-code-in";
    joinLabel.textContent = "Oder Code von deinem Gegner eingeben";
    lobby.appendChild(joinLabel);
    var joinRow = document.createElement("div");
    joinRow.className = "row";
    var codeIn = document.createElement("input");
    codeIn.type = "text";
    codeIn.id = "sch-code-in";
    codeIn.maxLength = 5;
    codeIn.autocomplete = "off";
    codeIn.setAttribute("autocapitalize", "characters");
    codeIn.setAttribute("spellcheck", "false");
    var joinBtn = document.createElement("button");
    joinBtn.type = "button";
    joinBtn.textContent = "Beitreten";
    joinRow.appendChild(codeIn);
    joinRow.appendChild(joinBtn);
    lobby.appendChild(joinRow);
    var lobbyMsg = document.createElement("p");
    lobbyMsg.className = "msg";
    lobbyMsg.setAttribute("role", "status");
    lobby.appendChild(lobbyMsg);
    box.insertBefore(lobby, board);

    var bar = document.createElement("div");
    bar.className = "sch-bar";
    bar.hidden = true;
    var codeShow = document.createElement("span");
    codeShow.className = "sch-code";
    var colorText = document.createElement("p");
    colorText.className = "msg";
    var barRow = document.createElement("div");
    barRow.className = "row";
    function barBtn(text, cls, fn) {
      var b = document.createElement("button");
      b.type = "button";
      if (cls) b.className = cls;
      b.textContent = text;
      b.addEventListener("click", fn);
      barRow.appendChild(b);
      return b;
    }
    var copyBtn = barBtn("Code kopieren", "link", function () {
      var done = function (ok) { copyBtn.textContent = ok ? "Kopiert" : "Code markieren und kopieren"; };
      try { navigator.clipboard.writeText(net.code).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
    });
    var offerBtn = barBtn("Remis anbieten", "", function () { act("offer"); });
    var acceptBtn = barBtn("Remis annehmen", "", function () { act("accept"); });
    var declineBtn = barBtn("Ablehnen", "link", function () { act("decline"); });
    var resignBtn = barBtn("Aufgeben", "link", function () {
      if (window.confirm("Wirklich aufgeben?")) act("resign");
    });
    var leaveBtn = barBtn("Partie verlassen", "link", function () { leaveGame(); });
    bar.appendChild(codeShow);
    bar.appendChild(colorText);
    bar.appendChild(barRow);
    box.insertBefore(bar, board);

    function showOnlineView() {
      lobby.hidden = !!net;
      bar.hidden = !net;
      board.hidden = !net;
      info.hidden = !net;
      row.hidden = true;
    }

    function leaveOnlineView() {
      clearTimeout(pollT);
      lobby.hidden = true;
      bar.hidden = true;
      board.hidden = false;
      info.hidden = false;
      row.hidden = false;
    }

    function renderBar() {
      var play = net.st === "play" && net.players === 2;
      var offered = net.offer && net.offer !== net.you;
      codeShow.textContent = net.code;
      colorText.textContent = "Du spielst " + (net.you === "w" ? "Weiß (orange)" : "Schwarz") + ". Gib den Code deinem Gegner, falls er noch nicht beigetreten ist.";
      colorText.hidden = net.players === 2;
      copyBtn.hidden = net.players === 2;
      offerBtn.hidden = !play || cur.over || !!net.offer;
      acceptBtn.hidden = !play || cur.over || !offered;
      declineBtn.hidden = acceptBtn.hidden;
      resignBtn.hidden = !play || cur.over;
      leaveBtn.textContent = net.st === "end" || cur.over ? "Zurück zur Auswahl" : "Partie verlassen";
    }

    function onlineStatus() {
      if (!net) return "";
      if (net.players < 2) return "Warte auf deinen Gegner. Er gibt den Code auf seinem Gerät ein.";
      if (net.st === "end" && net.reason === "draw") return "Remis vereinbart.";
      if (net.st === "end" && net.reason && net.reason.indexOf("resign-") === 0) {
        return net.reason.slice(7) === net.you ? "Du hast aufgegeben." : "Dein Gegner hat aufgegeben. Du gewinnst.";
      }
      if (cur.over) {
        if (cur.result === "matt") return state.turn === net.you ? "Schachmatt. Dein Gegner gewinnt." : "Schachmatt. Du gewinnst!";
        if (cur.result === "patt") return "Patt: unentschieden.";
        if (cur.result === "50") return "Remis (50-Züge-Regel).";
        if (cur.result === "material") return "Remis (zu wenig Material).";
        return "Remis (dreimal dieselbe Stellung).";
      }
      var t = state.turn === net.you ? "Du bist am Zug" : "Dein Gegner ist am Zug";
      t += cur.check ? ": Schach!" : ".";
      if (net.offer && net.offer !== net.you) t += " Dein Gegner bietet Remis an.";
      else if (net.offer) t += " Du hast Remis angeboten.";
      if (!net.opp) t += " Dein Gegner ist gerade nicht verbunden.";
      return t;
    }

    function findMove(ms) {
      return cur.moves.filter(function (x) { return moveStr(x) === ms; })[0] || null;
    }

    // Spielt Züge der Reihe nach nach. Gibt false zurück, wenn einer nicht erlaubt ist.
    function playList(list) {
      for (var i = 0; i < list.length; i++) {
        cur = status(state, keys);
        var m = findMove(list[i]);
        if (!m) return false;
        step(m);
      }
      return true;
    }

    function startsWith(a, b) {
      if (a.length < b.length) return false;
      for (var i = 0; i < b.length; i++) if (a[i] !== b[i]) return false;
      return true;
    }

    function rebuild(list) {
      state = fromFEN(START);
      keys = [keyOf(state)];
      stack = [];
      played = [];
      last = null;
      playList(list);
      afterMove();
    }

    function sync(d) {
      net.players = d.players;
      net.st = d.status;
      net.reason = d.reason;
      net.offer = d.offer;
      net.opp = !!d.opp_online;
      var S = d.moves || [];
      if (desync) { desync = false; rebuild(S); }
      else if (S.length > played.length && startsWith(S, played)) {
        var ok = playList(S.slice(played.length));
        if (!ok) rebuild(S); else afterMove();
      } else if (!startsWith(played, S)) rebuild(S);
      else render();
      if (net.st === "end") saveNet();
      if (cur.over && net.st === "play" && !overSent && net.players === 2) {
        overSent = true;
        post("/api/schach/act", { code: net.code, token: net.token, action: "over" }).then(function (r) { if (r.ok && net) { net.st = r.status; net.reason = r.reason; saveNet(); render(); } });
      }
    }

    function lost(msg) {
      clearTimeout(pollT);
      net = null;
      saveNet();
      showOnlineView();
      lobbyMsg.textContent = msg;
      lobbyMsg.className = "msg error";
    }

    function poll() {
      clearTimeout(pollT);
      if (stopped || mode !== "online" || !net) return;
      var mine = net;
      post("/api/schach/state", { code: net.code, token: net.token }).then(function (d) {
        if (stopped || mode !== "online" || net !== mine) return;
        if (d.http === 404) return lost("Diese Partie gibt es nicht mehr. Erstelle eine neue Partie.");
        if (d.http === 401) return lost("Die Sitzung ist abgelaufen. Melde dich neu an.");
        if (d.ok && !sending) sync(d);
        schedule();
      }, function () {
        if (stopped || mode !== "online" || net !== mine) return;
        net.opp = false;
        render();
        schedule();
      });
    }

    function schedule() {
      clearTimeout(pollT);
      if (net && net.st !== "end") pollT = setTimeout(poll, document.hidden ? 5000 : 1500);
    }

    function sendMove(ply, ms) {
      sending = true;
      var mine = net;
      post("/api/schach/move", { code: net.code, token: net.token, ply: ply, move: ms }).then(function (d) {
        sending = false;
        if (stopped || net !== mine) return;
        if (d.ok) sync(d);
        else { desync = true; poll(); }
      }, function () {
        sending = false;
        if (stopped || net !== mine) return;
        desync = true;
        schedule();
      });
    }

    function act(action) {
      if (!net) return;
      post("/api/schach/act", { code: net.code, token: net.token, action: action }).then(function (d) {
        if (d.ok && net) sync(d);
      }, function () {});
    }

    function beginOnline() {
      clearTimeout(timer);
      thinking = false;
      overSent = false;
      desync = false;
      sending = false;
      state = fromFEN(START);
      keys = [keyOf(state)];
      stack = [];
      played = [];
      last = null;
      sel = -1;
      targets = [];
      cur = status(state, keys);
      showOnlineView();
      render();
      poll();
    }

    function enterOnline() {
      lobbyMsg.textContent = "";
      if (!net) {
        var saved = loadNet();
        if (saved) net = { code: saved.code, token: saved.token, you: saved.you, st: "wait", players: 1, offer: null, opp: false, reason: null };
      }
      if (net) beginOnline();
      else { showOnlineView(); cur = status(fromFEN(START), [keyOf(fromFEN(START))]); }
    }

    function leaveGame() {
      clearTimeout(pollT);
      net = null;
      saveNet();
      lobbyMsg.textContent = "";
      showOnlineView();
    }

    function startNet(d, wait) {
      net = { code: d.code, token: d.token, you: d.you, st: wait ? "wait" : "play", players: wait ? 1 : 2, offer: null, opp: true, reason: null };
      saveNet();
      beginOnline();
    }

    function lobbyBusy(b) { createBtn.disabled = b; joinBtn.disabled = b; }

    function lobbyFail(d) {
      var text = d.http === 401 ? "Die Sitzung ist abgelaufen. Melde dich neu an." :
        d.http === 404 ? "Diesen Code gibt es nicht. Prüfe die Eingabe." :
        d.http === 409 ? "Diese Partie ist schon voll." :
        d.http === 429 ? "Zu viele Versuche. Warte kurz und versuche es erneut." :
        "Das hat nicht geklappt. Versuche es erneut.";
      lobbyMsg.textContent = text;
      lobbyMsg.className = "msg error";
      lobbyBusy(false);
    }

    createBtn.addEventListener("click", function () {
      lobbyBusy(true);
      lobbyMsg.className = "msg";
      lobbyMsg.textContent = "Erstelle Partie …";
      post("/api/schach/create", { color: onlineColor }).then(function (d) {
        lobbyBusy(false);
        if (stopped) return;
        if (!d.ok) return lobbyFail(d);
        lobbyMsg.textContent = "";
        startNet(d, true);
      }, function () { lobbyFail({ http: 0 }); });
    });

    function join() {
      var code = codeIn.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      if (code.length !== 5) { lobbyMsg.className = "msg error"; lobbyMsg.textContent = "Der Code hat 5 Zeichen."; return; }
      lobbyBusy(true);
      lobbyMsg.className = "msg";
      lobbyMsg.textContent = "Trete bei …";
      post("/api/schach/join", { code: code }).then(function (d) {
        lobbyBusy(false);
        if (stopped) return;
        if (!d.ok) return lobbyFail(d);
        lobbyMsg.textContent = "";
        codeIn.value = "";
        startNet(d, false);
      }, function () { lobbyFail({ http: 0 }); });
    }
    joinBtn.addEventListener("click", join);
    codeIn.addEventListener("keydown", function (e) { if (e.key === "Enter") join(); });

    function recolor() { if (state && (mode !== "online" || net)) render(); }
    document.addEventListener("farbe-geaendert", recolor);

    markMode(mode);
    eloBox.hidden = mode === "2" || mode === "online";
    if (mode === "online") enterOnline(); else newGame();

    return function stop() {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(pollT);
      try { if (audio) audio.close(); } catch (e) {}
      document.removeEventListener("farbe-geaendert", recolor);
    };
  }

  (window.Spiele = window.Spiele || []).push({
    id: "schach",
    name: "Schach",
    start: start,
    _engine: { fromFEN: fromFEN, legalMoves: legalMoves, make: make, status: status, keyOf: keyOf, START: START, toFEN: toFEN, motor: SchachMotor }
  });
})();

;
// ===== minesweeper.js =====
// © 2026 BlaueQualle. Alle Rechte vorbehalten.
// Spiel: Minesweeper (Minen finden, ohne eine zu berühren)
(function () {
  "use strict";

  var LEVELS = {
    leicht: { name: "Leicht", rows: 9, cols: 9, mines: 10 },
    mittel: { name: "Mittel", rows: 16, cols: 16, mines: 40 },
    schwer: { name: "Schwer", rows: 16, cols: 30, mines: 99 }
  };
  var LEVEL_KEY = "minen-level";
  function timeKey(id) { return "minen-zeit-" + id; }

  var CSS =
    ".ms-wrap{max-width:100%;overflow-x:auto;padding:0.25rem 0 0.75rem}" +
    ".ms-grid{display:grid;gap:2px;width:max-content;padding:4px;border-radius:0.6rem;background:color-mix(in srgb, var(--ink,#17313a) 22%, var(--panel,#fff))}" +
    ".ms-cell{box-sizing:border-box;width:var(--cs);height:var(--cs);min-width:0;padding:0;margin:0;display:grid;place-items:center;border-radius:4px;" +
    "border:1px solid color-mix(in srgb, var(--ink,#17313a) 28%, transparent);cursor:pointer;font:700 calc(var(--cs) * 0.56)/1 Georgia,serif;" +
    "background:color-mix(in srgb, var(--accent,#2447d6) 20%, var(--panel,#fff));color:var(--ink,#17313a);touch-action:manipulation;user-select:none;-webkit-user-select:none}" +
    ".ms-cell:hover{background:color-mix(in srgb, var(--accent,#2447d6) 32%, var(--panel,#fff))}" +
    ".ms-cell.open{cursor:default;background:var(--panel,#fff);border-color:color-mix(in srgb, var(--ink,#17313a) 12%, transparent)}" +
    ".ms-cell.open:hover{background:var(--panel,#fff)}" +
    ".ms-cell.boom{background:#d6402b;color:#fff}" +
    ".ms-cell.wrong{background:color-mix(in srgb, #d6402b 35%, var(--panel,#fff))}" +
    ".ms-cell.hint-safe{outline:3px solid #1f8a4c;outline-offset:-2px}" +
    ".ms-cell.hint-mine{outline:3px solid #d6402b;outline-offset:-2px}" +
    ".ms-cell:focus-visible{outline:3px solid var(--accent,#2447d6);outline-offset:1px;position:relative}" +
    ".ms-cell.n1{color:color-mix(in srgb, #2447d6 70%, var(--ink,#17313a))}" +
    ".ms-cell.n2{color:color-mix(in srgb, #1f8a4c 70%, var(--ink,#17313a))}" +
    ".ms-cell.n3{color:color-mix(in srgb, #d6402b 70%, var(--ink,#17313a))}" +
    ".ms-cell.n4{color:color-mix(in srgb, #6a2fb0 70%, var(--ink,#17313a))}" +
    ".ms-cell.n5{color:color-mix(in srgb, #9a5a0c 70%, var(--ink,#17313a))}" +
    ".ms-cell.n6{color:color-mix(in srgb, #0e8a8a 70%, var(--ink,#17313a))}" +
    ".ms-cell.n7{color:var(--ink,#17313a)}" +
    ".ms-cell.n8{color:color-mix(in srgb, #6b7280 80%, var(--ink,#17313a))}" +
    ".ms-bar{display:flex;flex-wrap:wrap;gap:0.5rem 1.4rem;align-items:center;margin:0 0 0.6rem;font-weight:700}" +
    ".ms-bar span{font-variant-numeric:tabular-nums}";

  function fmtTime(ms) {
    return (ms / 1000).toFixed(1).replace(".", ",") + " s";
  }

  function start(box) {
    if (!document.getElementById("ms-style")) {
      var st = document.createElement("style");
      st.id = "ms-style";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    var levelId = "mittel";
    try { var sv = localStorage.getItem(LEVEL_KEY); if (LEVELS[sv]) levelId = sv; } catch (e) {}

    var rows, cols, total, mineCount;
    var mine, adj, state, started, over, won, opened, flags, t0, elapsed, timer, hintUsed, flagMode, cur;
    var cells = [];

    function el(tag, cls, text) {
      var e = document.createElement(tag);
      if (cls) e.className = cls;
      if (text) e.textContent = text;
      return e;
    }

    // ---------- Oberfläche ----------
    var chips = el("div", "chips");
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", "Schwierigkeit");
    var chipEls = {};
    Object.keys(LEVELS).forEach(function (id) {
      var L = LEVELS[id];
      var b = el("button", "chip", L.name + " (" + L.cols + "×" + L.rows + ", " + L.mines + " Minen)");
      b.type = "button";
      b.addEventListener("click", function () {
        levelId = id;
        try { localStorage.setItem(LEVEL_KEY, id); } catch (e) {}
        markLevel();
        newGame();
      });
      chipEls[id] = b;
      chips.appendChild(b);
    });
    function markLevel() {
      Object.keys(chipEls).forEach(function (id) { chipEls[id].setAttribute("aria-pressed", String(id === levelId)); });
    }

    var bar = el("div", "ms-bar");
    var minesOut = el("span"), timeOut = el("span"), bestOut = el("span");
    bar.appendChild(minesOut); bar.appendChild(timeOut); bar.appendChild(bestOut);

    var wrap = el("div", "ms-wrap");
    var grid = el("div", "ms-grid");
    grid.setAttribute("role", "group");
    grid.setAttribute("aria-label", "Minenfeld");
    wrap.appendChild(grid);

    var info = el("p", "msg");
    info.setAttribute("aria-live", "polite");
    var row = el("div", "row");
    var newBtn = el("button", "", "Neue Runde");
    newBtn.type = "button";
    var flagBtn = el("button", "link", "Flaggen setzen: aus");
    flagBtn.type = "button";
    flagBtn.setAttribute("aria-pressed", "false");
    var hintBtn = el("button", "link", "Tipp");
    hintBtn.type = "button";
    row.appendChild(newBtn); row.appendChild(flagBtn); row.appendChild(hintBtn);
    var help = el("p", "msg", "Klicke ein Feld an, um es aufzudecken. Eine Zahl zeigt, wie viele Minen in den acht Nachbarfeldern liegen. Setze mit Rechtsklick, gedrückt halten oder dem Schalter „Flaggen setzen“ eine Flagge auf ein Feld, das du für eine Mine hältst. Klickst du eine Zahl an, deren Flaggen schon stimmen, deckt das Spiel die übrigen Nachbarn auf. Der erste Klick ist immer sicher. Tastatur: Pfeiltasten zum Bewegen, Leertaste zum Aufdecken, F für eine Flagge. Ein Tipp zeigt einen sicheren Zug oder eine sichere Mine, dann zählt die Zeit aber nicht mehr als Rekord.");

    box.appendChild(chips);
    box.appendChild(bar);
    box.appendChild(wrap);
    box.appendChild(info);
    box.appendChild(row);
    box.appendChild(help);

    function say(t) { info.textContent = t; }

    // ---------- Spiellogik ----------
    function neighbors(i) {
      var r = Math.floor(i / cols), c = i % cols, out = [];
      for (var dr = -1; dr <= 1; dr++) for (var dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var rr = r + dr, cc = c + dc;
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) out.push(rr * cols + cc);
      }
      return out;
    }

    function bestTime() {
      try { var v = Number(localStorage.getItem(timeKey(levelId))); return v > 0 ? v : 0; } catch (e) { return 0; }
    }

    function buildGrid() {
      var L = LEVELS[levelId];
      rows = L.rows; cols = L.cols; mineCount = L.mines; total = rows * cols;
      grid.textContent = "";
      cells = [];
      var avail = Math.max(240, (box.clientWidth || 600));
      var cs = Math.max(avail < 520 ? 28 : 20, Math.min(38, Math.floor((avail - 16) / cols) - 2));
      grid.style.setProperty("--cs", cs + "px");
      grid.style.gridTemplateColumns = "repeat(" + cols + ", var(--cs))";
      for (var i = 0; i < total; i++) {
        var b = el("button", "ms-cell");
        b.type = "button";
        b.dataset.i = String(i);
        b.tabIndex = i === 0 ? 0 : -1;
        grid.appendChild(b);
        cells.push(b);
      }
      cur = 0;
    }

    function newGame() {
      clearInterval(timer);
      timer = null;
      buildGrid();
      mine = new Array(total).fill(0);
      adj = new Array(total).fill(0);
      state = new Array(total).fill(0);      // 0 verdeckt, 1 offen, 2 Flagge
      started = false; over = false; won = false; opened = 0; flags = 0; elapsed = 0; hintUsed = false;
      render();
      say("Klicke ein Feld an. Der erste Klick ist sicher.");
    }

    function placeMines(safe) {
      var banned = {};
      banned[safe] = true;
      var around = neighbors(safe);
      if (total - 1 - around.length >= mineCount) around.forEach(function (n) { banned[n] = true; });
      var free = [];
      for (var i = 0; i < total; i++) if (!banned[i]) free.push(i);
      for (var k = free.length - 1; k > 0; k--) {          // mischen
        var j = Math.floor(Math.random() * (k + 1)), tmp = free[k]; free[k] = free[j]; free[j] = tmp;
      }
      for (var m = 0; m < mineCount; m++) mine[free[m]] = 1;
      for (var a = 0; a < total; a++) {
        var n = 0;
        neighbors(a).forEach(function (x) { n += mine[x]; });
        adj[a] = n;
      }
    }

    function beginTimer() {
      t0 = performance.now();
      say("");
      timer = setInterval(function () { elapsed = performance.now() - t0; renderBar(); }, 100);
    }

    function lose(hit) {
      over = true;
      clearInterval(timer); timer = null;
      elapsed = performance.now() - t0;
      for (var i = 0; i < total; i++) if (mine[i] && state[i] !== 2) state[i] = 1;
      cur = hit;
      render(hit);
      say("Das war eine Mine. Die Runde ist verloren. Starte mit „Neue Runde“ noch einmal.");
    }

    function win() {
      over = true; won = true;
      clearInterval(timer); timer = null;
      elapsed = performance.now() - t0;
      for (var i = 0; i < total; i++) if (mine[i]) state[i] = 2;
      flags = mineCount;
      var msg = "Geschafft in " + fmtTime(elapsed) + ".";
      if (!hintUsed) {
        var best = bestTime();
        if (!best || elapsed < best) {
          try { localStorage.setItem(timeKey(levelId), String(Math.round(elapsed))); } catch (e) {}
          msg += best ? " Neuer Rekord, vorher " + fmtTime(best) + "." : " Das ist dein erster Rekord.";
        } else msg += " Dein Rekord: " + fmtTime(best) + ".";
      } else msg += " Mit Tipp, deshalb zählt die Zeit nicht als Rekord.";
      render();
      say(msg);
    }

    function reveal(i) {
      if (over || state[i] !== 0) return;
      if (!started) { started = true; placeMines(i); beginTimer(); }
      if (mine[i]) { state[i] = 1; lose(i); return; }
      var stack = [i];
      while (stack.length) {
        var k = stack.pop();
        if (state[k] !== 0) continue;
        state[k] = 1; opened++;
        if (adj[k] === 0) neighbors(k).forEach(function (n) { if (state[n] === 0) stack.push(n); });
      }
      clearHints();
      if (opened === total - mineCount) win(); else render();
    }

    function toggleFlag(i) {
      if (over || state[i] === 1) return;
      if (state[i] === 0) { state[i] = 2; flags++; } else { state[i] = 0; flags--; }
      clearHints();
      render();
    }

    function chord(i) {
      if (over || state[i] !== 1 || adj[i] === 0) return;
      var nb = neighbors(i), f = 0;
      nb.forEach(function (n) { if (state[n] === 2) f++; });
      if (f !== adj[i]) return;
      for (var k = 0; k < nb.length && !over; k++) if (state[nb[k]] === 0) reveal(nb[k]);
    }

    // ---------- Tipp: einfache Logik ----------
    var hintCell = -1, hintKind = "";
    function clearHints() { hintCell = -1; hintKind = ""; }

    function findHint() {
      var info2 = [];
      for (var i = 0; i < total; i++) {
        if (state[i] !== 1 || adj[i] === 0) continue;
        var hid = [], f = 0;
        neighbors(i).forEach(function (n) { if (state[n] === 0) hid.push(n); else if (state[n] === 2) f++; });
        if (!hid.length) continue;
        var rem = adj[i] - f;
        if (rem === 0) return { kind: "safe", i: hid[0] };
        if (rem === hid.length) return { kind: "mine", i: hid[0] };
        info2.push({ hid: hid, rem: rem });
      }
      // Vergleich zweier Zahlen: liegen die verdeckten Nachbarn der einen ganz in denen der anderen
      for (var a = 0; a < info2.length; a++) {
        for (var b = 0; b < info2.length; b++) {
          if (a === b) continue;
          var A = info2[a], B = info2[b];
          if (A.hid.length >= B.hid.length) continue;
          var sub = A.hid.every(function (x) { return B.hid.indexOf(x) >= 0; });
          if (!sub) continue;
          var diff = B.hid.filter(function (x) { return A.hid.indexOf(x) < 0; });
          var dr = B.rem - A.rem;
          if (dr === 0) return { kind: "safe", i: diff[0] };
          if (dr === diff.length) return { kind: "mine", i: diff[0] };
        }
      }
      return null;
    }

    function hint() {
      if (over) return;
      if (!started) { say("Mache erst den ersten Klick, dann kann ich einen Tipp geben."); return; }
      var h = findHint();
      if (!h) { say("Ich finde mit einfacher Logik keinen sicheren Zug. Du musst jetzt raten."); return; }
      hintUsed = true;
      hintCell = h.i; hintKind = h.kind;
      render();
      cells[h.i].focus();
      say(h.kind === "safe" ? "Dieses Feld ist sicher (grün markiert)." : "Auf diesem Feld liegt eine Mine (rot markiert). Setze eine Flagge.");
    }

    // ---------- Darstellung ----------
    function renderBar() {
      minesOut.textContent = "Minen: " + (mineCount - flags);
      timeOut.textContent = "Zeit: " + fmtTime(started ? (over ? elapsed : performance.now() - t0) : 0);
      var b = bestTime();
      bestOut.textContent = b ? "Rekord: " + fmtTime(b) : "";
    }

    function cellLabel(i) {
      var r = Math.floor(i / cols) + 1, c = i % cols + 1, pos = "Reihe " + r + ", Spalte " + c + ": ";
      if (state[i] === 2) return pos + (over && !won && !mine[i] ? "falsche Flagge" : "Flagge");
      if (state[i] === 0) return pos + "verdeckt";
      if (mine[i]) return pos + "Mine";
      return pos + (adj[i] ? adj[i] + (adj[i] === 1 ? " Mine in der Nähe" : " Minen in der Nähe") : "leer");
    }

    function render(boom) {
      for (var i = 0; i < total; i++) {
        var b = cells[i], s = state[i], cls = "ms-cell", txt = "";
        if (s === 1) {
          cls += " open";
          if (mine[i]) { txt = "💣"; if (i === boom) cls += " boom"; }
          else if (adj[i]) { txt = String(adj[i]); cls += " n" + adj[i]; }
        } else if (s === 2) {
          txt = "🚩";
          if (over && !won && !mine[i]) { cls += " wrong"; txt = "✕"; }
        }
        if (i === hintCell) cls += hintKind === "safe" ? " hint-safe" : " hint-mine";
        if (b.className !== cls) b.className = cls;
        if (b.textContent !== txt) b.textContent = txt;
        b.setAttribute("aria-label", cellLabel(i));
      }
      renderBar();
    }

    // ---------- Eingabe ----------
    var pressTimer = null, longDone = false;
    function cellOf(e) {
      var t = e.target;
      while (t && t !== grid && !(t.dataset && t.dataset.i !== undefined)) t = t.parentNode;
      return t && t.dataset && t.dataset.i !== undefined ? Number(t.dataset.i) : -1;
    }

    grid.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse") return;
      var i = cellOf(e);
      if (i < 0) return;
      longDone = false;
      clearTimeout(pressTimer);
      pressTimer = setTimeout(function () { longDone = true; toggleFlag(i); if (navigator.vibrate) { try { navigator.vibrate(20); } catch (x) {} } }, 420);
    });
    ["pointerup", "pointercancel", "pointerleave", "pointermove"].forEach(function (ev) {
      grid.addEventListener(ev, function (e) { if (ev === "pointermove" && !e.buttons) return; clearTimeout(pressTimer); });
    });
    grid.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      var i = cellOf(e);
      if (i >= 0) toggleFlag(i);
    });
    grid.addEventListener("click", function (e) {
      var i = cellOf(e);
      if (i < 0) return;
      cur = i;
      if (longDone) { longDone = false; return; }
      if (state[i] === 1) { chord(i); return; }
      if (flagMode) toggleFlag(i);
      else if (state[i] === 0) reveal(i);
      else toggleFlag(i);                                   // ein Klick auf eine Flagge nimmt sie weg
    });

    function focusCell(i) {
      if (i < 0 || i >= total) return;
      cells[cur].tabIndex = -1;
      cur = i;
      cells[i].tabIndex = 0;
      cells[i].focus();
    }
    grid.addEventListener("focusin", function (e) {
      var i = cellOf(e);
      if (i >= 0 && i !== cur) { cells[cur].tabIndex = -1; cur = i; cells[i].tabIndex = 0; }
    });
    grid.addEventListener("keydown", function (e) {
      var i = cellOf(e);
      if (i < 0) return;
      var r = Math.floor(i / cols), c = i % cols, k = e.key;
      if (k === "ArrowLeft" && c > 0) focusCell(i - 1);
      else if (k === "ArrowRight" && c < cols - 1) focusCell(i + 1);
      else if (k === "ArrowUp" && r > 0) focusCell(i - cols);
      else if (k === "ArrowDown" && r < rows - 1) focusCell(i + cols);
      else if (k === "f" || k === "F") toggleFlag(i);
      else return;
      e.preventDefault();
    });

    newBtn.addEventListener("click", newGame);
    hintBtn.addEventListener("click", hint);
    flagBtn.addEventListener("click", function () {
      flagMode = !flagMode;
      flagBtn.textContent = "Flaggen setzen: " + (flagMode ? "an" : "aus");
      flagBtn.setAttribute("aria-pressed", String(flagMode));
    });
    function onResize() { /* Feldgröße bleibt, die Fläche scrollt bei Bedarf */ }
    window.addEventListener("resize", onResize);

    flagMode = false;
    markLevel();
    newGame();

    return function stop() {
      clearInterval(timer);
      clearTimeout(pressTimer);
      window.removeEventListener("resize", onResize);
    };
  }

  (window.Spiele = window.Spiele || []).push({
    id: "minesweeper",
    name: "Minesweeper",
    start: start,
    _engine: { LEVELS: LEVELS, timeKey: timeKey }
  });
})();

;
// ===== snake.js =====
// © 2026 BlaueQualle. Alle Rechte vorbehalten.
// Spiel: Snake
// Jedes Spiel registriert sich selbst in window.Spiele und liefert eine stop()-Funktion zurück.
(window.Spiele = window.Spiele || []).push({
  id: "snake",
  name: "Snake",
  start: function (box) {
    var N = 18;
    var CELL = 20;
    var SIZE = N * CELL;

    var canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    canvas.className = "game-canvas";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Snake-Spielfeld");
    var ctx = canvas.getContext("2d");

    var info = document.createElement("p");
    info.className = "msg";
    info.setAttribute("aria-live", "polite");

    var startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.textContent = "Start";

    var pad = document.createElement("div");
    pad.className = "dpad";
    [
      ["pad-up", "▲", "Hoch", 0, -1],
      ["pad-left", "◀", "Links", -1, 0],
      ["pad-down", "▼", "Runter", 0, 1],
      ["pad-right", "▶", "Rechts", 1, 0]
    ].forEach(function (d) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pad-btn " + d[0];
      b.textContent = d[1];
      b.setAttribute("aria-label", d[2]);
      b.addEventListener("click", function () { turn(d[3], d[4]); });
      pad.appendChild(b);
    });

    box.appendChild(canvas);
    var row = document.createElement("div");
    row.className = "row";
    row.appendChild(startBtn);
    row.appendChild(info);
    box.appendChild(row);
    box.appendChild(pad);

    var snake, dir, nextDir, food, score, timer, over;
    var best = 0;
    try { best = Number(localStorage.getItem("snake-best")) || 0; } catch (e) {}

    function css(name, fallback) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    }

    function placeFood() {
      var free = [];
      for (var x = 0; x < N; x++) {
        for (var y = 0; y < N; y++) {
          if (!snake.some(function (s) { return s.x === x && s.y === y; })) free.push({ x: x, y: y });
        }
      }
      food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
    }

    function say(text) { info.textContent = text; }

    function scoreText() { return "Punkte: " + score + " · Rekord: " + best; }

    function draw() {
      ctx.fillStyle = css("--panel", "#ffffff");
      ctx.fillRect(0, 0, SIZE, SIZE);
      if (food) {
        ctx.fillStyle = css("--ink", "#17313a");
        ctx.beginPath();
        ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
      }
      var accent = css("--accent", "#2447d6");
      snake.forEach(function (s, i) {
        ctx.globalAlpha = i === 0 ? 1 : 0.75;
        ctx.fillStyle = accent;
        ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      });
      ctx.globalAlpha = 1;
    }

    function setTimer() {
      clearInterval(timer);
      timer = setInterval(tick, 140 - Math.min(score * 4, 70));
    }

    function reset() {
      snake = [{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }];
      dir = { x: 1, y: 0 };
      nextDir = dir;
      score = 0;
      over = false;
      placeFood();
      draw();
    }

    function begin() {
      reset();
      say(scoreText());
      startBtn.textContent = "Neustart";
      setTimer();
    }

    function end() {
      clearInterval(timer);
      timer = null;
      over = true;
      if (score > best) {
        best = score;
        try { localStorage.setItem("snake-best", String(best)); } catch (e) {}
      }
      say("Game over. " + scoreText());
    }

    function tick() {
      dir = nextDir;
      var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
      var hit = head.x < 0 || head.y < 0 || head.x >= N || head.y >= N ||
        snake.some(function (s) { return s.x === head.x && s.y === head.y; });
      if (hit) { end(); draw(); return; }
      snake.unshift(head);
      if (food && head.x === food.x && head.y === food.y) {
        score++;
        placeFood();
        setTimer();
      } else {
        snake.pop();
      }
      draw();
      say(scoreText());
    }

    function turn(dx, dy) {
      if (!timer) { begin(); }
      if (dx === -dir.x && dy === -dir.y) return;
      nextDir = { x: dx, y: dy };
    }

    function onKey(e) {
      if (!canvas.offsetParent) return;
      var t = e.target && e.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      var map = {
        ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
        ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0], D: [1, 0]
      };
      var m = map[e.key];
      if (!m) return;
      e.preventDefault();
      turn(m[0], m[1]);
    }

    var sx = 0, sy = 0;
    canvas.addEventListener("touchstart", function (e) {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    canvas.addEventListener("touchend", function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0);
      else turn(0, dy > 0 ? 1 : -1);
    }, { passive: true });

    startBtn.addEventListener("click", begin);
    document.addEventListener("keydown", onKey);
    document.addEventListener("farbe-geaendert", draw);

    reset();
    say("Drücke Start oder eine Pfeiltaste. Auf dem Handy: wischen oder die Tasten unten.");

    return function stop() {
      clearInterval(timer);
      timer = null;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("farbe-geaendert", draw);
    };
  }
});

;
// ===== spielstand.js =====
// © 2026 BlaueQualle. Alle Rechte vorbehalten.
// Werkzeug: Spielstand sichern und übertragen (Rekorde und Fortschritt als kurzer Code oder Datei)
(function () {
  "use strict";

  var FIXED = ["snake-best", "2048-best", "rennen-best", "quallen-best", "quallenimperium-v1", "wortraten-v1", "farben", "helligkeit", "tischtennis-best", "minen-zeit-leicht", "minen-zeit-mittel", "minen-zeit-schwer", "flaggen-best-leicht", "flaggen-best-alle", "flaggen-best-europa", "flaggen-best-asien", "flaggen-best-afrika", "flaggen-best-amerika", "flaggen-best-ozeanien", "solitaer-best"];
  var BEST_KEYS = ["snake-best", "2048-best", "rennen-best", "quallen-best", "tischtennis-best", "flaggen-best-leicht", "flaggen-best-alle", "flaggen-best-europa", "flaggen-best-asien", "flaggen-best-afrika", "flaggen-best-amerika", "flaggen-best-ozeanien", "solitaer-best"];
  var MINEN_KEYS = ["minen-zeit-leicht", "minen-zeit-mittel", "minen-zeit-schwer"];
  var TRACK = /^rennstrecke:\d{1,6}$/;
  var BEST_RE = /-best(-[a-z]+)?$/;   // auch flaggen-best-leicht usw.
  var MAX_VALUE = 200000;

  // ---------- Regeln: was gehört zum Spielstand, was ist gültig ----------
  function isKnownKey(k) { return FIXED.indexOf(k) >= 0 || TRACK.test(k); }

  function parseJson(v) { try { return JSON.parse(v); } catch (e) { return undefined; } }
  function num(n) { return typeof n === "number" && isFinite(n); }

  function validValue(k, v) {
    if (typeof v !== "string" || v.length > MAX_VALUE) return false;
    if (BEST_RE.test(k) || /^minen-zeit-/.test(k)) return /^\d{1,12}$/.test(v);
    if (k === "helligkeit") return v === "auto" || v === "light" || v === "dark";
    if (k === "farben") {
      var a = parseJson(v);
      return Array.isArray(a) && a.length <= 5 && a.every(function (c) { return typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c); });
    }
    if (TRACK.test(k)) {
      var r = parseJson(v);
      return !!r && num(r.lap) && num(r.total);
    }
    if (k === "quallenimperium-v1") {
      var d = parseJson(v);
      return !!d && Array.isArray(d.owned) && d.owned.length >= 1 && d.owned.length <= 50 && Array.isArray(d.mult) &&
        num(d.coins) && num(d.total) && (d.allTime === undefined || num(d.allTime)) && (d.quallen === undefined || num(d.quallen));
    }
    if (k === "wortraten-v1") {
      var w = parseJson(v);
      return !!w && !!w.stats && num(w.stats.played) && Array.isArray(w.guesses);
    }
    return false;
  }

  function readLocal() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (isKnownKey(k)) {
          var v = localStorage.getItem(k);
          if (validValue(k, v)) out[k] = v;
        }
      }
    } catch (e) {}
    return out;
  }

  // ---------- Kompakte Darstellung (nur das Nötige, ohne Zwischenspeicher-Felder) ----------
  function round2(n) { return Math.round(n * 100) / 100; }

  function compact(data) {
    var c = {};
    var best = BEST_KEYS.map(function (k) { return data[k] !== undefined ? Number(data[k]) : null; });
    if (best.some(function (x) { return x !== null; })) c.b = best;

    var mz = MINEN_KEYS.map(function (k) { return data[k] !== undefined ? Number(data[k]) : null; });
    if (mz.some(function (x) { return x !== null; })) c.m = mz;

    var tracks = Object.keys(data).filter(function (k) { return TRACK.test(k); }).map(function (k) {
      var r = JSON.parse(data[k]);
      return [Number(k.split(":")[1]), round2(r.lap), round2(r.total)];
    });
    if (tracks.length) c.r = tracks;

    if (data["quallenimperium-v1"]) {
      var d = JSON.parse(data["quallenimperium-v1"]);
      c.i = [Math.floor(d.coins), Math.floor(d.total), Math.floor(d.allTime || d.total), d.clicks || 0, d.owned, d.mult,
        d.clickLevel || 0, (d.research || []).map(function (x) { return x ? 1 : 0; }).join(""), d.quallen || 0, d.resets || 0,
        (d.ach || []).map(function (x) { return x ? 1 : 0; }).join(""), d.golds || 0,
        (d.perks || []).map(function (x) { return x ? 1 : 0; }).join(""),
        (d.artifacts || []).map(function (x) { return x ? 1 : 0; }).join(""), d.expDone || 0, d.planets || 0, d.pResets || 0];
    }
    if (data["wortraten-v1"]) {
      var w = JSON.parse(data["wortraten-v1"]);
      var st = w.stats;
      c.w = [w.day || "", w.guesses, w.status === "won" ? 1 : w.status === "lost" ? 2 : 0, w.counted || "",
        [st.played, st.won || 0, st.streak || 0, st.best || 0, st.lastWin || "", st.dist || []]];
    }
    if (data.farben) c.f = JSON.parse(data.farben).map(function (h) { return h.slice(1); }).join(",");
    if (data.helligkeit) c.h = data.helligkeit.charAt(0);   // a = auto, l = light, d = dark
    return c;
  }

  function expand(c) {
    var data = {};
    if (c.m) MINEN_KEYS.forEach(function (k, i) { if (c.m[i] !== null && c.m[i] !== undefined) data[k] = String(Math.floor(c.m[i])); });
    if (c.b) BEST_KEYS.forEach(function (k, i) { if (c.b[i] !== null && c.b[i] !== undefined) data[k] = String(Math.floor(c.b[i])); });
    (c.r || []).forEach(function (t) { data["rennstrecke:" + t[0]] = JSON.stringify({ lap: t[1], total: t[2] }); });
    if (c.i) {
      var i = c.i;
      data["quallenimperium-v1"] = JSON.stringify({
        coins: i[0], total: i[1], allTime: i[2], clicks: i[3], owned: i[4], mult: i[5], clickLevel: i[6],
        research: String(i[7]).split("").map(Number), quallen: i[8], resets: i[9], boostUntil: 0, last: Date.now(),
        ach: String(i[10] || "").split("").map(Number), golds: Number(i[11]) || 0,
        perks: String(i[12] || "").split("").map(Number),
        artifacts: String(i[13] || "").split("").map(Number), expDone: Number(i[14]) || 0,
        planets: Number(i[15]) || 0, pResets: Number(i[16]) || 0
      });
    }
    if (c.w) {
      var w = c.w, st = w[4];
      data["wortraten-v1"] = JSON.stringify({
        day: w[0], guesses: w[1], status: ["playing", "won", "lost"][w[2]] || "playing", counted: w[3],
        stats: { played: st[0], won: st[1], streak: st[2], best: st[3], lastWin: st[4], dist: st[5] }
      });
    }
    if (c.f) data.farben = JSON.stringify(String(c.f).split(",").map(function (h) { return "#" + h; }));
    if (c.h) data.helligkeit = { a: "auto", l: "light", d: "dark" }[c.h] || "auto";
    return data;
  }

  // ---------- Code erzeugen und lesen ----------
  function toB64(bytes) {
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/=+$/, "");
  }

  function fromB64(s) {
    s = s.replace(/=+$/, "");
    while (s.length % 4) s += "=";
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  async function through(bytes, stream) {
    var out = new Blob([bytes]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(out).arrayBuffer());
  }

  // Format: FRS2 + Kennbuchstabe (p = unkomprimiert, r = komprimiert, z = komprimiert mit Kopfdaten) + Daten
  async function makeCode(data) {
    var plain = new TextEncoder().encode(JSON.stringify(compact(data)));
    var best = "FRS2p" + toB64(plain);
    if (typeof CompressionStream === "function") {
      var tries = [["r", "deflate-raw"], ["z", "deflate"]];
      for (var i = 0; i < tries.length; i++) {
        try {
          var packed = await through(plain, new CompressionStream(tries[i][1]));
          var code = "FRS2" + tries[i][0] + toB64(packed);
          if (code.length < best.length) best = code;
          break;
        } catch (e) {}
      }
    }
    return best;
  }

  // Gibt { data, ignored } zurück oder { error }
  async function parseCode(text) {
    var clean = String(text || "").replace(/\s+/g, "");
    var m2 = /FRS2[prz][A-Za-z0-9+\/]+/.exec(clean);
    var m1 = /FRS1:[A-Za-z0-9+\/=]+/.exec(clean);
    var raw;
    try {
      if (m2) {
        var kind = m2[0].charAt(4), bytes = fromB64(m2[0].slice(5));
        if (kind === "r" || kind === "z") {
          if (typeof DecompressionStream !== "function") return { error: "Dieser Browser kann den Code nicht entpacken. Nutze ein neueres Gerät oder einen neueren Browser." };
          bytes = await through(bytes, new DecompressionStream(kind === "r" ? "deflate-raw" : "deflate"));
        }
        raw = expand(JSON.parse(new TextDecoder().decode(bytes)));
      } else if (m1) {
        var old = JSON.parse(new TextDecoder().decode(fromB64(m1[0].slice(5))));
        if (!old || old.format !== "fragenraum-spielstand" || !old.data || typeof old.data !== "object") return { error: "Das ist kein Spielstand aus dieser Seite." };
        raw = old.data;
      } else {
        return { error: "Das sieht nicht nach einem Spielstand-Code aus. Er beginnt mit FRS." };
      }
    } catch (e) {
      return { error: "Der Code ist beschädigt oder unvollständig. Kopiere ihn noch einmal komplett." };
    }
    var data = {}, ignored = 0;
    Object.keys(raw).forEach(function (k) {
      if (isKnownKey(k) && validValue(k, raw[k])) data[k] = raw[k]; else ignored++;
    });
    if (!Object.keys(data).length) return { error: "Der Code enthält keine verwendbaren Daten." };
    return { data: data, ignored: ignored };
  }

  // ---------- Zusammenführen: jeweils den besseren Stand behalten ----------
  function mergeValue(k, local, imported) {
    if (local === undefined) return imported;
    if (BEST_RE.test(k)) return String(Math.max(Number(local), Number(imported)));
    if (/^minen-zeit-/.test(k)) return String(Math.min(Number(local), Number(imported)));   // schnellere Zeit gewinnt
    if (TRACK.test(k)) {
      var a = JSON.parse(local), b = JSON.parse(imported);
      return JSON.stringify({ lap: Math.min(a.lap, b.lap), total: Math.min(a.total, b.total) });
    }
    if (k === "quallenimperium-v1") {
      var li = JSON.parse(local), im = JSON.parse(imported);
      var lv = Math.max(li.allTime || 0, li.total), iv = Math.max(im.allTime || 0, im.total);
      return iv > lv ? imported : local;     // der Stand mit mehr insgesamt verdienten Perlen
    }
    if (k === "wortraten-v1") {
      var x = JSON.parse(local), y = JSON.parse(imported);
      if (y.stats.played !== x.stats.played) return y.stats.played > x.stats.played ? imported : local;
      if ((y.day || "") !== (x.day || "")) return (y.day || "") > (x.day || "") ? imported : local;
      return y.guesses.length > x.guesses.length ? imported : local;
    }
    return imported;   // Farben und Helligkeit: der Code gewinnt
  }

  // mode: "merge" oder "replace". Gibt die Zahl der geschriebenen Einträge zurück.
  function applyImport(imported, mode) {
    var local = readLocal(), n = 0;
    if (mode === "replace") {
      Object.keys(local).forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} });
      local = {};
    }
    Object.keys(imported).forEach(function (k) {
      var v = mode === "replace" ? imported[k] : mergeValue(k, local[k], imported[k]);
      try { localStorage.setItem(k, v); n++; } catch (e) {}
    });
    return n;
  }

  function fmtNum(n) {
    try { return Math.floor(n).toLocaleString("de-DE"); } catch (e) { return String(Math.floor(n)); }
  }

  function summarize(data) {
    var lines = [];
    var names = { "snake-best": "Snake", "2048-best": "2048", "rennen-best": "Autorennen", "quallen-best": "Quallen-Runner", "tischtennis-best": "Tischtennis (längster Ballwechsel)", "flaggen-best-leicht": "Flaggenraten leicht (von 20 Punkten)", "flaggen-best-alle": "Flaggenraten alle Länder (von 20)", "flaggen-best-europa": "Flaggenraten Europa (von 20)", "flaggen-best-asien": "Flaggenraten Asien (von 20)", "flaggen-best-afrika": "Flaggenraten Afrika (von 20)", "flaggen-best-amerika": "Flaggenraten Amerika (von 20)", "flaggen-best-ozeanien": "Flaggenraten Ozeanien (von 20)", "solitaer-best": "Solitär (Punkte)" };
    Object.keys(names).forEach(function (k) {
      if (data[k] !== undefined) lines.push(names[k] + ": Rekord " + fmtNum(Number(data[k])));
    });
    var mn = { "minen-zeit-leicht": "leicht", "minen-zeit-mittel": "mittel", "minen-zeit-schwer": "schwer" };
    Object.keys(mn).forEach(function (k) {
      if (data[k] !== undefined) lines.push("Minesweeper " + mn[k] + ": Bestzeit " + (Number(data[k]) / 1000).toFixed(1).replace(".", ",") + " s");
    });
    var tracks = Object.keys(data).filter(function (k) { return TRACK.test(k); });
    if (tracks.length) lines.push("Rennstrecke: Bestzeiten auf " + tracks.length + (tracks.length === 1 ? " Strecke" : " Strecken"));
    if (data["quallenimperium-v1"]) {
      var d = JSON.parse(data["quallenimperium-v1"]);
      var count = d.owned.reduce(function (a, b) { return a + (Number(b) || 0); }, 0);
      lines.push("Quallen-Imperium: " + count + " Fabriken, insgesamt " + fmtNum(Math.max(d.allTime || 0, d.total)) + " Perlen verdient" + (d.quallen ? ", " + d.quallen + " Quallen" : ""));
    }
    if (data["wortraten-v1"]) {
      var w = JSON.parse(data["wortraten-v1"]);
      lines.push("Wortraten: " + w.stats.played + " gespielt, längste Serie " + (w.stats.best || 0));
    }
    if (data.farben || data.helligkeit) lines.push("Aussehen: Farben und Helligkeit");
    return lines;
  }

  // ---------- Oberfläche ----------
  var CSS = ".ss-ta{min-height:3.5rem;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:0.8rem;line-height:1.3;word-break:break-all}" +
    ".ss-list{padding-left:1.2rem;margin:0.25rem 0 1rem}" +
    ".ss-sec{max-width:34rem;margin:0 0 2rem}";

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function fillList(ul, lines, emptyText) {
    ul.textContent = "";
    if (!lines.length) { ul.appendChild(el("li", "", emptyText)); return; }
    lines.forEach(function (l) { ul.appendChild(el("li", "", l)); });
  }

  function start(box) {
    if (!document.getElementById("ss-style")) {
      var st = document.createElement("style");
      st.id = "ss-style";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    var alive = true;

    // --- Sichern ---
    var out = el("div", "ss-sec");
    out.appendChild(el("p", "label", "Spielstand sichern"));
    out.appendChild(el("p", "msg", "Das ist der Stand auf diesem Gerät:"));
    var outList = el("ul", "ss-list");
    out.appendChild(outList);
    var codeBox = el("textarea", "ss-ta");
    codeBox.readOnly = true;
    codeBox.rows = 3;
    codeBox.setAttribute("aria-label", "Dein Spielstand-Code");
    codeBox.addEventListener("focus", function () { codeBox.select(); });
    out.appendChild(codeBox);
    var lenMsg = el("p", "msg");
    out.appendChild(lenMsg);
    var outRow = el("div", "row");
    var copyBtn = el("button", "", "Code kopieren");
    copyBtn.type = "button";
    var shareBtn = el("button", "", "Teilen …");
    shareBtn.type = "button";
    shareBtn.hidden = typeof navigator.share !== "function";
    var saveBtn = el("button", "link", "Als Datei speichern");
    saveBtn.type = "button";
    outRow.appendChild(copyBtn);
    outRow.appendChild(shareBtn);
    outRow.appendChild(saveBtn);
    out.appendChild(outRow);
    var outMsg = el("p", "msg");
    outMsg.setAttribute("aria-live", "polite");
    out.appendChild(outMsg);

    // --- Einfügen ---
    var inn = el("div", "ss-sec");
    inn.appendChild(el("p", "label", "Spielstand einfügen"));
    inn.appendChild(el("p", "msg", "Füge hier den Code von deinem anderen Gerät ein, oder wähle die gespeicherte Datei aus."));
    var inBox = el("textarea", "ss-ta");
    inBox.rows = 3;
    inBox.setAttribute("aria-label", "Spielstand-Code einfügen");
    inBox.placeholder = "FRS2…";
    inn.appendChild(inBox);
    var file = document.createElement("input");
    file.type = "file";
    file.accept = ".txt,.json,text/plain";
    file.setAttribute("aria-label", "Datei mit Spielstand auswählen");
    inn.appendChild(file);
    var preview = el("ul", "ss-list");
    inn.appendChild(preview);
    var inRow = el("div", "row");
    var mergeBtn = el("button", "", "Zusammenführen (empfohlen)");
    mergeBtn.type = "button";
    var replaceBtn = el("button", "link", "Alles ersetzen");
    replaceBtn.type = "button";
    inRow.appendChild(mergeBtn);
    inRow.appendChild(replaceBtn);
    inn.appendChild(inRow);
    var inMsg = el("p", "msg");
    inMsg.setAttribute("aria-live", "polite");
    inn.appendChild(inMsg);
    var reloadBtn = el("button", "", "Seite neu laden");
    reloadBtn.type = "button";
    reloadBtn.hidden = true;
    inn.appendChild(reloadBtn);
    inn.appendChild(el("p", "msg", "Zusammenführen behält jeweils den besseren Wert (höchster Rekord, schnellste Zeit, weitester Fortschritt). Alles ersetzen überschreibt den Stand auf diesem Gerät komplett."));

    box.appendChild(out);
    box.appendChild(inn);

    function setMsg(target, text, isError) {
      target.textContent = text || "";
      target.className = "msg" + (isError ? " error" : "");
    }

    async function refreshExport() {
      var data = readLocal();
      fillList(outList, summarize(data), "Auf diesem Gerät gibt es noch keinen Spielstand.");
      if (!Object.keys(data).length) {
        codeBox.value = "";
        lenMsg.textContent = "";
      } else {
        var code = await makeCode(data);
        if (!alive) return;
        codeBox.value = code;
        lenMsg.textContent = "Dein Code ist " + code.length + " Zeichen kurz.";
      }
      copyBtn.disabled = saveBtn.disabled = shareBtn.disabled = !codeBox.value;
    }

    var seq = 0;
    async function readInput() {
      var my = ++seq;
      preview.textContent = "";
      if (!inBox.value.trim()) { setMsg(inMsg, ""); mergeBtn.disabled = replaceBtn.disabled = true; return null; }
      var res = await parseCode(inBox.value);
      if (my !== seq || !alive) return null;       // inzwischen wurde weitergetippt
      if (res.error) { setMsg(inMsg, res.error, true); mergeBtn.disabled = replaceBtn.disabled = true; return null; }
      setMsg(inMsg, "Der Code enthält:");
      fillList(preview, summarize(res.data), "");
      mergeBtn.disabled = replaceBtn.disabled = false;
      return res;
    }

    copyBtn.addEventListener("click", function () {
      var text = codeBox.value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { setMsg(outMsg, "Code kopiert. Füge ihn auf dem anderen Gerät ein."); },
          function () { codeBox.select(); setMsg(outMsg, "Markiere den Text im Feld und kopiere ihn von Hand."); });
      } else {
        codeBox.select();
        setMsg(outMsg, "Markiere den Text im Feld und kopiere ihn von Hand.");
      }
    });

    shareBtn.addEventListener("click", function () {
      if (typeof navigator.share !== "function") return;
      navigator.share({ title: "Fragenraum Spielstand", text: codeBox.value }).then(function () { setMsg(outMsg, "Geteilt."); }, function () {});
    });

    saveBtn.addEventListener("click", function () {
      try {
        var blob = new Blob([codeBox.value], { type: "text/plain" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "fragenraum-spielstand-" + new Date().toISOString().slice(0, 10) + ".txt";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        setMsg(outMsg, "Datei gespeichert.");
      } catch (e) {
        setMsg(outMsg, "Das Speichern als Datei hat nicht geklappt. Nutze „Code kopieren“.", true);
      }
    });

    inBox.addEventListener("input", readInput);
    file.addEventListener("change", function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { inBox.value = String(reader.result || ""); readInput(); };
      reader.onerror = function () { setMsg(inMsg, "Die Datei konnte nicht gelesen werden.", true); };
      reader.readAsText(f);
    });

    async function doImport(mode) {
      var res = await readInput();
      if (!res) return;
      if (mode === "replace" && !window.confirm("Wirklich alles ersetzen? Der Stand auf diesem Gerät wird überschrieben.")) return;
      var n = applyImport(res.data, mode);
      setMsg(inMsg, "Fertig: " + n + " Einträge übernommen. Lade die Seite neu, damit alles (auch die Farben) angezeigt wird.");
      reloadBtn.hidden = false;
      refreshExport();
    }
    mergeBtn.addEventListener("click", function () { doImport("merge"); });
    replaceBtn.addEventListener("click", function () { doImport("replace"); });
    reloadBtn.addEventListener("click", function () { window.location.reload(); });

    copyBtn.disabled = saveBtn.disabled = shareBtn.disabled = true;
    mergeBtn.disabled = replaceBtn.disabled = true;
    refreshExport();

    return function stop() { alive = false; };
  }

  (window.Werkzeuge = window.Werkzeuge || []).push({
    id: "spielstand",
    name: "Spielstand",
    start: start,
    _engine: { isKnownKey: isKnownKey, validValue: validValue, makeCode: makeCode, parseCode: parseCode, mergeValue: mergeValue, applyImport: applyImport, readLocal: readLocal, summarize: summarize }
  });
})();

;
// ===== uhr.js =====
// © 2026 BlaueQualle. Alle Rechte vorbehalten.
// Werkzeug: Uhr mit Uhrzeit, Stoppuhr, Timer und Wecker
// Der Zustand liegt außerhalb der Ansicht und im Browser-Speicher. Stoppuhr, Timer und Wecker
// laufen deshalb weiter, wenn man den Reiter wechselt oder die Seite neu lädt.
(function () {
  "use strict";

  var KEY = "uhr-v1";

  function defaults() {
    return {
      sw: { acc: 0, startedAt: null, laps: [] },
      timer: { total: 300000, remaining: 300000, endAt: null, done: false },
      alarm: { time: "07:00", on: false, rang: false, firedKey: "" }
    };
  }

  function load() {
    try {
      var m = JSON.parse(localStorage.getItem(KEY));
      if (m && m.sw && m.timer && m.alarm) return m;
    } catch (e) {}
    return defaults();
  }

  var model = load();
  var activeMode = "zeit";

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(model)); } catch (e) {}
  }

  function pad(n, len) {
    var s = String(n);
    while (s.length < (len || 2)) s = "0" + s;
    return s;
  }

  // ---------- Ton ----------
  var audio = null;

  function ensureAudio() {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!audio && AC) audio = new AC();
      if (audio && audio.state === "suspended") audio.resume();
    } catch (e) {}
  }

  function beep() {
    if (!audio) ensureAudio();
    if (!audio) return;
    try {
      for (var r = 0; r < 3; r++) {
        for (var k = 0; k < 3; k++) {
          var t0 = audio.currentTime + r * 1.2 + k * 0.25;
          var o = audio.createOscillator();
          var g = audio.createGain();
          o.type = "sine";
          o.frequency.value = 880;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
          o.connect(g);
          g.connect(audio.destination);
          o.start(t0);
          o.stop(t0 + 0.22);
        }
      }
    } catch (e) {}
  }

  function announce() { document.dispatchEvent(new Event("uhr-update")); }

  // ---------- Hintergrundprüfung für Timer und Wecker ----------
  setInterval(function () {
    var t = model.timer;
    if (t.endAt && Date.now() >= t.endAt) {
      t.endAt = null;
      t.remaining = 0;
      t.done = true;
      save();
      beep();
      announce();
    }
    var a = model.alarm;
    if (a.on) {
      var d = new Date();
      var hm = pad(d.getHours()) + ":" + pad(d.getMinutes());
      var k = d.toDateString() + hm;
      if (hm === a.time && a.firedKey !== k) {
        a.firedKey = k;
        a.on = false;
        a.rang = true;
        save();
        beep();
        announce();
      }
    }
  }, 500);

  // ---------- Stoppuhr ----------
  function swElapsed() {
    return model.sw.acc + (model.sw.startedAt ? Date.now() - model.sw.startedAt : 0);
  }

  function fmtSw(ms) {
    var total = Math.floor(ms / 10);
    var cs = total % 100;
    var s = Math.floor(total / 100) % 60;
    var m = Math.floor(total / 6000) % 60;
    var h = Math.floor(total / 360000);
    return (h ? h + ":" + pad(m) : String(m)) + ":" + pad(s) + "," + pad(cs);
  }

  // ---------- Timer ----------
  function tRemaining() {
    var t = model.timer;
    return t.endAt ? Math.max(0, t.endAt - Date.now()) : t.remaining;
  }

  function fmtTimer(ms) {
    var total = Math.ceil(ms / 1000);
    var s = total % 60, m = Math.floor(total / 60) % 60, h = Math.floor(total / 3600);
    return (h ? h + ":" : "") + pad(m) + ":" + pad(s);
  }

  // ---------- Oberfläche ----------
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function button(label, cls, onClick) {
    var b = el("button", cls, label);
    b.type = "button";
    b.addEventListener("click", function () { ensureAudio(); onClick(); });
    return b;
  }

  function start(box) {
    var panels = {};
    var modeButtons = {};

    // Umschalter
    var modes = el("div", "chips");
    modes.setAttribute("role", "group");
    modes.setAttribute("aria-label", "Bereich der Uhr");
    [["zeit", "Uhrzeit"], ["stopp", "Stoppuhr"], ["timer", "Timer"], ["wecker", "Wecker"]].forEach(function (m) {
      var b = el("button", "chip", m[1]);
      b.type = "button";
      b.addEventListener("click", function () { activeMode = m[0]; showMode(); refresh(); });
      modes.appendChild(b);
      modeButtons[m[0]] = b;
      panels[m[0]] = el("div");
      panels[m[0]].hidden = true;
    });
    box.appendChild(modes);

    // --- Uhrzeit ---
    var timeBig = el("p", "clock-big");
    var dateText = el("p", "msg");
    var world = el("ul", "world");
    var zones = [["London", "Europe/London"], ["New York", "America/New_York"], ["Tokio", "Asia/Tokyo"], ["Sydney", "Australia/Sydney"]];
    var worldItems = zones.map(function (z) {
      var li = el("li");
      var name = el("span", "", z[0]);
      var val = el("span");
      li.appendChild(name);
      li.appendChild(val);
      world.appendChild(li);
      return { tz: z[1], val: val };
    });
    panels.zeit.appendChild(timeBig);
    panels.zeit.appendChild(dateText);
    panels.zeit.appendChild(world);

    // --- Stoppuhr ---
    var swBig = el("p", "clock-big");
    var swRow = el("div", "row");
    var swStart = button("Start", "", function () {
      var sw = model.sw;
      if (sw.startedAt) { sw.acc = swElapsed(); sw.startedAt = null; }
      else { sw.startedAt = Date.now(); }
      save();
      refresh();
    });
    var swLap = button("Runde", "chip", function () {
      var sw = model.sw;
      if (!sw.startedAt) return;
      sw.laps.push(swElapsed());
      save();
      refresh();
    });
    var swReset = button("Zurücksetzen", "link", function () {
      model.sw = { acc: 0, startedAt: null, laps: [] };
      save();
      refresh();
    });
    swRow.appendChild(swStart);
    swRow.appendChild(swLap);
    swRow.appendChild(swReset);
    var swList = el("ol", "laps");
    panels.stopp.appendChild(swBig);
    panels.stopp.appendChild(swRow);
    panels.stopp.appendChild(swList);

    // --- Timer ---
    var tBig = el("p", "clock-big");
    var tBar = document.createElement("progress");
    tBar.max = 1;
    tBar.value = 0;
    tBar.setAttribute("aria-hidden", "true");
    var fields = el("div", "fields");
    var inputs = {};
    [["h", "Std"], ["m", "Min"], ["s", "Sek"]].forEach(function (f) {
      var wrap = el("div");
      var lab = el("label", "", f[1]);
      lab.htmlFor = "uhr-t-" + f[0];
      var inp = document.createElement("input");
      inp.type = "number";
      inp.id = "uhr-t-" + f[0];
      inp.min = "0";
      inp.max = f[0] === "h" ? "99" : "59";
      inp.addEventListener("input", readInputs);
      wrap.appendChild(lab);
      wrap.appendChild(inp);
      fields.appendChild(wrap);
      inputs[f[0]] = inp;
    });
    var presets = el("div", "chips");
    presets.setAttribute("role", "group");
    presets.setAttribute("aria-label", "Vorgaben");
    [["1 Min", 60], ["5 Min", 300], ["10 Min", 600], ["25 Min (Pomodoro)", 1500], ["5 Min Pause", 300]].forEach(function (p) {
      presets.appendChild(button(p[0], "chip", function () { setDuration(p[1] * 1000); }));
    });
    var tRow = el("div", "row");
    var tStart = button("Start", "", function () {
      var t = model.timer;
      if (t.endAt) { t.remaining = tRemaining(); t.endAt = null; }
      else {
        if (t.remaining <= 0) t.remaining = t.total;
        if (t.remaining <= 0) return;
        t.endAt = Date.now() + t.remaining;
        t.done = false;
      }
      save();
      refresh();
    });
    var tReset = button("Zurücksetzen", "link", function () {
      var t = model.timer;
      t.endAt = null;
      t.remaining = t.total;
      t.done = false;
      save();
      fillInputs();
      refresh();
    });
    var tTest = button("Ton testen", "link", function () { beep(); });
    tRow.appendChild(tStart);
    tRow.appendChild(tReset);
    tRow.appendChild(tTest);
    var tMsg = el("p", "msg");
    tMsg.setAttribute("aria-live", "polite");
    panels.timer.appendChild(tBig);
    panels.timer.appendChild(tBar);
    panels.timer.appendChild(presets);
    panels.timer.appendChild(fields);
    panels.timer.appendChild(tRow);
    panels.timer.appendChild(tMsg);

    function fillInputs() {
      var sec = Math.round(model.timer.total / 1000);
      inputs.h.value = String(Math.floor(sec / 3600));
      inputs.m.value = String(Math.floor(sec / 60) % 60);
      inputs.s.value = String(sec % 60);
    }

    function setDuration(ms) {
      var t = model.timer;
      if (t.endAt) return;
      t.total = ms;
      t.remaining = ms;
      t.done = false;
      save();
      fillInputs();
      refresh();
    }

    function readInputs() {
      var t = model.timer;
      if (t.endAt) return;
      var h = Math.max(0, parseInt(inputs.h.value, 10) || 0);
      var m = Math.max(0, parseInt(inputs.m.value, 10) || 0);
      var s = Math.max(0, parseInt(inputs.s.value, 10) || 0);
      t.total = (h * 3600 + m * 60 + s) * 1000;
      t.remaining = t.total;
      t.done = false;
      save();
      refresh();
    }

    // --- Wecker ---
    var aBig = el("p", "clock-big");
    var aField = el("div", "fields");
    var aWrap = el("div");
    var aLab = el("label", "", "Weckzeit");
    aLab.htmlFor = "uhr-wecker";
    var aInput = document.createElement("input");
    aInput.type = "time";
    aInput.id = "uhr-wecker";
    aInput.className = "num";
    aInput.addEventListener("input", function () {
      if (/^\d\d:\d\d$/.test(aInput.value)) {
        model.alarm.time = aInput.value;
        model.alarm.firedKey = "";
        save();
        refresh();
      }
    });
    aWrap.appendChild(aLab);
    aWrap.appendChild(aInput);
    aField.appendChild(aWrap);
    var aRow = el("div", "row");
    var aToggle = button("Einschalten", "", function () {
      var a = model.alarm;
      a.on = !a.on;
      a.rang = false;
      a.firedKey = "";
      save();
      refresh();
    });
    var aTest = button("Ton testen", "link", function () { beep(); });
    aRow.appendChild(aToggle);
    aRow.appendChild(aTest);
    var aMsg = el("p", "msg");
    aMsg.setAttribute("aria-live", "polite");
    var aHint = el("p", "msg", "Der Wecker klingelt nur, solange diese Seite in einem Browser-Tab geöffnet ist.");
    panels.wecker.appendChild(aBig);
    panels.wecker.appendChild(aField);
    panels.wecker.appendChild(aRow);
    panels.wecker.appendChild(aMsg);
    panels.wecker.appendChild(aHint);

    Object.keys(panels).forEach(function (k) { box.appendChild(panels[k]); });

    function showMode() {
      Object.keys(panels).forEach(function (k) {
        panels[k].hidden = k !== activeMode;
        modeButtons[k].setAttribute("aria-pressed", String(k === activeMode));
      });
    }

    function refresh() {
      var now = new Date();
      if (activeMode === "zeit") {
        timeBig.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
        try {
          dateText.textContent = now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        } catch (e) { dateText.textContent = ""; }
        worldItems.forEach(function (w) {
          try {
            w.val.textContent = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: w.tz }).format(now);
          } catch (e) { w.val.textContent = "–"; }
        });
      } else if (activeMode === "stopp") {
        swBig.textContent = fmtSw(swElapsed());
        swStart.textContent = model.sw.startedAt ? "Stopp" : (model.sw.acc ? "Weiter" : "Start");
        swLap.disabled = !model.sw.startedAt;
        var laps = model.sw.laps;
        swList.textContent = "";
        for (var i = laps.length - 1; i >= 0; i--) {
          var li = el("li", "", "Runde " + (i + 1) + ": " + fmtSw(laps[i] - (i ? laps[i - 1] : 0)) + " (gesamt " + fmtSw(laps[i]) + ")");
          swList.appendChild(li);
        }
      } else if (activeMode === "timer") {
        var t = model.timer, rem = tRemaining();
        tBig.textContent = fmtTimer(rem);
        tBar.max = Math.max(1, t.total);
        tBar.value = t.total - rem;
        tStart.textContent = t.endAt ? "Pause" : (rem > 0 && rem < t.total ? "Weiter" : "Start");
        var running = !!t.endAt;
        inputs.h.disabled = inputs.m.disabled = inputs.s.disabled = running;
        tMsg.textContent = t.done ? "Die Zeit ist um!" : "";
        tMsg.className = "msg" + (t.done ? " error" : "");
      } else {
        var a = model.alarm;
        aBig.textContent = a.time;
        aToggle.textContent = a.on ? "Ausschalten" : "Einschalten";
        aMsg.textContent = a.rang ? "Der Wecker hat geklingelt." : (a.on ? "Der Wecker ist eingeschaltet." : "Der Wecker ist aus.");
        aMsg.className = "msg" + (a.rang ? " error" : "");
      }
    }

    fillInputs();
    aInput.value = model.alarm.time;
    showMode();
    refresh();

    var ticker = setInterval(refresh, 100);
    document.addEventListener("uhr-update", refresh);

    return function stop() {
      clearInterval(ticker);
      document.removeEventListener("uhr-update", refresh);
    };
  }

  (window.Werkzeuge = window.Werkzeuge || []).push({
    id: "uhr",
    name: "Uhr",
    start: start
  });
})();

;
// ===== tischtennis.js =====
// © 2026 BlaueQualle. Alle Rechte vorbehalten.
// Spiel: Tischtennis (2D, Ansicht von oben, Platte hochkant: du spielst unten und schlägst nach oben, gegen den Computer, bis 11 Punkte)
// Intern liegt die Platte waagerecht (x = Länge, y = Breite). Beim Zeichnen und bei der Eingabe wird sie um 90 Grad gedreht.
// Der Ball hat zusätzlich eine Höhe (z) und Spin: Topspin sinkt schneller und springt flach nach vorn,
// Unterschnitt schwebt und bremst nach dem Aufsprung, Seitenspin lässt den Ball in der Luft und beim Aufsprung zur Seite wandern.
(window.Spiele = window.Spiele || []).push((function () {
  var W = 760, H = 580;                       // Länge und Breite des Spielfelds (breiter: neben der Platte ist Platz zum Laufen)
  var TL = 120, TR = 640;                     // Platte: von links nach rechts (Länge 520, wie 274 cm)
  var TT = 146, TB = 434;                     // Platte: oben bis unten (Breite 288, wie 152,5 cm)
  var NETX = 380, NETH = 28, NETEXT = 26;     // Netz in der Mitte, Höhe und Überstand an den Seiten
  var R = 7;                                  // Ballradius
  var G = 950;                                // Schwerkraft (in z-Richtung)
  var DRAG = 0.35;                            // Luftwiderstand pro Sekunde
  var BOUNCE_FRICTION = 0.8;                  // beim Aufsprung auf der Platte geht Tempo verloren
  var MAGNUS = 330;                           // Seitenkraft durch Seitenspin
  var DIP = 260;                              // zusätzliche Schwerkraft durch Topspin (bei Unterschnitt weniger)
  var KICK = 150;                             // Seitenschub beim Aufsprung durch Seitenspin
  var PR = 18;                                // Radius des Schlägerblatts
  var REACH = PR + R + 5;                     // so weit reicht der Schläger des Computers
  var PREACH = Math.round(REACH * 1.6);       // Dein Schläger trifft den Ball aus größerer Entfernung (großer Trefferbereich)
  var BALLVIS = 1.4;                          // Der Ball wird größer gezeichnet
  var HITZ = 56;                              // bis zu dieser Höhe kann der Ball getroffen werden
  var MIDY = (TT + TB) / 2;
  var SIDE = 220;                             // so weit darfst du seitlich über die Plattenkante hinaus laufen
  var PY0 = TT - SIDE, PY1 = TB + SIDE;       // Laufbereich quer
  var PXMIN = -50;                            // so weit darfst du hinter die Platte zurück (der Gegner spiegelbildlich)
  var XMIN = -120, XMAX = W + 120, YMIN = PY0 - 60, YMAX = PY1 + 60;   // außerhalb davon ist der Ball im Aus
  var BEST_KEY = "tischtennis-best", LEVEL_KEY = "tischtennis-level", BLADE_KEY = "tischtennis-holz", RUBBER_KEY = "tischtennis-belag", LEN_KEY = "tischtennis-laenge", SOUND_KEY = "tischtennis-ton";

  var LEVELS = {
    leicht: { name: "Leicht", speed: 250, err: 60, slip: 0.25, react: 0.55, spin: 0.15 },
    mittel: { name: "Mittel", speed: 370, err: 34, slip: 0.12, react: 0.3, spin: 0.35 },
    schwer: { name: "Schwer", speed: 520, err: 14, slip: 0.04, react: 0.1, spin: 0.6 }
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------- Physik (wird vom Spiel, der Flugbahn-Vorschau und dem Computer gemeinsam benutzt) ----------
  function advance(b, dt) {
    var dm = Math.exp(-DRAG * dt);
    b.vx *= dm; b.vy *= dm;
    b.vy += b.sd * MAGNUS * dt;                  // Seitenspin lenkt den Ball ab
    b.vz -= (G + b.sp * DIP) * dt;               // Topspin zieht nach unten, Unterschnitt trägt
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    var sm = Math.exp(-0.25 * dt);
    b.sp *= sm; b.sd *= sm;
  }

  function bounce(b) {
    b.z = 0;
    var hard = clamp(-b.vz / 500, 0, 1);            // harte Aufsprünge verlieren mehr Höhe
    b.vz = -b.vz * clamp(0.9 - 0.06 * hard - 0.1 * b.sp, 0.68, 0.98);
    var f = BOUNCE_FRICTION * (1 + 0.35 * b.sp);   // Topspin schiebt nach vorn, Unterschnitt bremst
    b.vx *= f; b.vy *= f;
    if (b.sp > 0.3) b.vz *= 1 - 0.12 * b.sp;      // Topspin springt flacher
    b.vy += b.sd * KICK;                           // Seitenspin schiebt zur Seite
    b.sp *= 0.6; b.sd *= 0.6;
  }

  // Fliegt den Ball bis zum ersten Aufsprung. Gibt den Landepunkt und die Höhe über dem Netz zurück.
  function simulate(bx, by, bz, v, sp, sd) {
    var b = { x: bx, y: by, z: bz, vx: v.vx, vy: v.vy, vz: v.vz, sp: sp, sd: sd }, dt = 1 / 120, zNet = null;
    for (var i = 0; i < 360; i++) {
      var px = b.x;
      advance(b, dt);
      if (zNet === null && (px < NETX) !== (b.x < NETX)) zNet = b.z;
      if (b.z <= 0 && b.vz < 0) break;
    }
    return { x: b.x, y: b.y, zNet: zNet };
  }

  function base(bx, by, bz, ax, ay, T) {
    var f = DRAG / (1 - Math.exp(-DRAG * T));
    return { vx: (ax - bx) * f, vy: (ay - by) * f, vz: (0.5 * G * T * T - bz) / T };
  }

  // Berechnet die Start-Geschwindigkeit, damit der Ball nach etwa der Zeit T bei (xt, yt) auf der Platte aufkommt,
  // auch mit Spin, und dabei mit Abstand über das Netz fliegt.
  function plan(bx, by, bz, xt, yt, T0, sp, sd) {
    var T = T0, v = null;
    for (var i = 0; i < 20; i++) {
      var ax = xt, ay = yt, r;
      for (var j = 0; j < 4; j++) {
        v = base(bx, by, bz, ax, ay, T);
        r = simulate(bx, by, bz, v, sp, sd);
        ax += xt - r.x; ay += yt - r.y;
      }
      v = base(bx, by, bz, ax, ay, T);
      r = simulate(bx, by, bz, v, sp, sd);
      if (r.zNet === null || r.zNet > NETH + R + 6) return v;
      T += 0.04;
    }
    return v;
  }

  // Der Spin entsteht aus der Schlägerbewegung, nicht aus einer Auswahl:
  // - früh und hoch getroffen, mit schnellem Schlag nach vorn: Topspin
  // - spät und tief getroffen oder den Schläger nach hinten ziehen: Unterschnitt
  // - Schläger beim Treffer seitlich bewegt: Seitenspin
  // Je schneller der Schläger, desto mehr Drall.
  // Ausrüstung: Das Holz bestimmt das Tempo deiner Schläge, der Belag den Spin.
  // Werte sind Spielwerte, angelehnt an den Charakter der Butterfly-Produkte (1,00 = Grundwert).
  // speed: Tempo, ctl: Kontrolle (weniger Streuung), spin: Drall, flat: Tempo des Belags
  var BLADES = [
    { id: "primorac", name: "Primorac", speed: 0.84, ctl: 1.25 },
    { id: "tb-caf", name: "Timo Boll CAF", speed: 0.93, ctl: 1.12 },
    { id: "tb-alc", name: "Timo Boll ALC", speed: 1.00, ctl: 1.00 },
    { id: "innerforce", name: "Innerforce ALC", speed: 1.03, ctl: 1.10 },
    { id: "viscaria", name: "Viscaria", speed: 1.08, ctl: 0.95 },
    { id: "zjk", name: "Zhang Jike Super ZLC", speed: 1.15, ctl: 0.82 }
  ];
  var RUBBERS = [
    { id: "flextra", name: "Flextra", spin: 0.70, speed: 0.88, ctl: 1.30 },
    { id: "sriver", name: "Sriver", spin: 0.85, speed: 0.92, ctl: 1.20 },
    { id: "glayzer", name: "Glayzer", spin: 0.95, speed: 0.98, ctl: 1.15 },
    { id: "rozena", name: "Rozena", spin: 1.05, speed: 1.03, ctl: 1.02 },
    { id: "ten05", name: "Tenergy 05", spin: 1.00, speed: 1.00, ctl: 1.00 },
    { id: "ten64", name: "Tenergy 64", spin: 1.06, speed: 0.96, ctl: 1.08 },
    { id: "ten80", name: "Tenergy 80", spin: 0.98, speed: 1.07, ctl: 0.96 },
    { id: "dig05", name: "Dignics 05", spin: 1.18, speed: 1.06, ctl: 0.95 },
    { id: "dig09c", name: "Dignics 09C", spin: 1.25, speed: 1.02, ctl: 0.90 }
  ];
  var GEAR = { V: 1, ctl: 1, spin: 1 };      // Gesamtwirkung der gewählten Ausrüstung
  function setGear(blade, rubber) {
    GEAR.V = blade.speed * rubber.speed;
    GEAR.ctl = blade.ctl * rubber.ctl;
    GEAR.spin = rubber.spin;
  }

  function computeSpin(p, ct) {
    var core = PR + R;
    var f = clamp(Math.sqrt(p.sx * p.sx + p.sy * p.sy) / 600, 0.15, 1);
    var h = clamp((ct.z - 22) / 24, -1, 1);
    var sp = clamp(h * (0.3 + 0.7 * f) + clamp(p.sx / 700, -0.5, 0.5), -1, 1);
    var sd = clamp(clamp(p.sy / 650, -1, 1) * 0.9 + clamp(ct.ry / core, -1, 1) * 0.25 * f, -1, 1);
    if (Math.abs(sp) < 0.1) sp = 0;
    if (Math.abs(sd) < 0.12) sd = 0;
    // Der Belag verstärkt oder dämpft den Drall, der aus deiner Bewegung entsteht
    return { sp: clamp(sp * GEAR.spin, -1.3, 1.3), sd: clamp(sd * GEAR.spin, -1.3, 1.3) };
  }

  function segDist2(ax, ay, bx, by, cx, cy) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy, t = l2 ? clamp(((cx - ax) * dx + (cy - ay) * dy) / l2, 0, 1) : 0;
    var qx = ax + dx * t - cx, qy = ay + dy * t - cy;
    return qx * qx + qy * qy;
  }

  function onTable(x, y) { return x >= TL && x <= TR && y >= TT && y <= TB; }

  var TT_CSS =
    ".tt-lobby{max-width:30rem;margin:0 0 1rem}" +
    ".tt-lobby p{margin:0 0 0.8rem}" +
    ".tt-lobby .row{margin:0.4rem 0 1rem;align-items:center}" +
    ".tt-lobby input[type=text]{width:9rem;font:600 1.4rem/1.2 var(--serif,Georgia,serif);letter-spacing:0.25em;text-transform:uppercase;text-align:center}" +
    ".tt-gear{display:flex;flex-wrap:wrap;gap:0.6rem 1.4rem;margin:0.2rem 0 0.4rem}" +
    ".tt-gear label{display:flex;flex-direction:column;gap:0.25rem;font-weight:600}" +
    ".tt-gear select{min-width:11rem;font:inherit;font-weight:500;padding:0.45rem 0.6rem;border:1px solid var(--line,#b9cdd2);border-radius:0.5rem;background:var(--panel,#fff);color:var(--ink,#17313a)}" +
    ".tt-bar{margin:0 0 0.8rem}" +
    ".tt-code{display:inline-block;font:700 1.9rem/1.2 var(--serif,Georgia,serif);letter-spacing:0.3em;padding:0.1em 0.35em 0.1em 0.5em;border:2px dashed var(--accent);border-radius:0.5rem;margin:0.2rem 0.8rem 0.4rem 0}" +
    ".tt-bar .row{margin:0.4rem 0 0}";

  function start(box) {
    if (!document.getElementById("tt-style")) {
      var st = document.createElement("style");
      st.id = "tt-style";
      st.textContent = TT_CSS;
      document.head.appendChild(st);
    }
    var canvas = document.createElement("canvas");
    canvas.width = 840;                       // 3D-Ansicht von hinten (hochkant)
    canvas.height = 640;
    canvas.className = "game-canvas";
    canvas.style.aspectRatio = "840 / 640";
    canvas.style.maxWidth = "min(100%, 52rem, calc(78vh * " + (840 / 640).toFixed(3) + "))";
    canvas.setAttribute("role", "img");
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "Tischtennisplatte in 3D von hinten gesehen. Du spielst vorne, der Computer hinten.");
    var ctx = canvas.getContext("2d");

    function chipGroup(label, entries, onPick) {
      var rowEl = document.createElement("div");
      rowEl.className = "chips";
      rowEl.setAttribute("role", "group");
      rowEl.setAttribute("aria-label", label);
      var btns = {};
      Object.keys(entries).forEach(function (id) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = entries[id];
        b.addEventListener("click", function () { onPick(id); canvas.focus({ preventScroll: true }); });
        rowEl.appendChild(b);
        btns[id] = b;
      });
      return {
        el: rowEl,
        mark: function (active) { Object.keys(btns).forEach(function (id) { btns[id].setAttribute("aria-pressed", String(id === active)); }); }
      };
    }

    var online = false, net = null;
    var matchLen = 11;                        // Spielende offline: 5, 11 oder 21 Punkte
    try { var sl0 = Number(localStorage.getItem(LEN_KEY)); if (sl0 === 5 || sl0 === 11 || sl0 === 21) matchLen = sl0; } catch (e) {}            // online: gegen ein anderes Gerät mit Code
    var levelId = "mittel", aim = 0;            // aim: Aufschlagwinkel in Bogenmaß
    try { var sv = localStorage.getItem(LEVEL_KEY); if (LEVELS[sv]) levelId = sv; } catch (e) {}

    var levelNames = {};
    Object.keys(LEVELS).forEach(function (id) { levelNames[id] = LEVELS[id].name; });
    var levelGroup = chipGroup("Schwierigkeit", levelNames, function (id) {
      levelId = id;
      try { localStorage.setItem(LEVEL_KEY, id); } catch (e) {}
      levelGroup.mark(levelId);
      newMatch();
    });
    levelGroup.mark(levelId);

    var lenGroup = chipGroup("Spielende", { "5": "Bis 5 Punkte", "11": "Bis 11 Punkte", "21": "Bis 21 Punkte" }, function (id) {
      matchLen = Number(id);
      try { localStorage.setItem(LEN_KEY, id); } catch (e) {}
      lenGroup.mark(String(matchLen));
      newMatch();
    });
    lenGroup.mark(String(matchLen));

    // Ausrüstung: Holz bestimmt das Tempo, Belag den Spin
    var blade = BLADES[2], rubber = RUBBERS[4];
    try {
      var sb = localStorage.getItem(BLADE_KEY), sr = localStorage.getItem(RUBBER_KEY);
      BLADES.forEach(function (x) { if (x.id === sb) blade = x; });
      RUBBERS.forEach(function (x) { if (x.id === sr) rubber = x; });
    } catch (e) {}
    setGear(blade, rubber);

    var gearBox = document.createElement("div");
    gearBox.className = "tt-gear";
    function gearSelect(id, label, list, current, onPick) {
      var wrap = document.createElement("label");
      wrap.htmlFor = id;
      wrap.textContent = label;
      var sel = document.createElement("select");
      sel.id = id;
      list.forEach(function (x) {
        var o = document.createElement("option");
        o.value = x.id; o.textContent = x.name;
        if (x === current) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener("change", function () {
        list.forEach(function (x) { if (x.id === sel.value) onPick(x); });
        sel.blur();
        canvas.focus({ preventScroll: true });
      });
      wrap.appendChild(sel);
      return wrap;
    }
    var gearInfo = document.createElement("p");
    gearInfo.className = "msg";
    gearInfo.setAttribute("aria-live", "polite");
    function rate(v, lo, hi) {
      return ["sehr niedrig", "niedrig", "mittel", "hoch", "sehr hoch"][clamp(Math.round((v - lo) / (hi - lo) * 4), 0, 4)];
    }
    function showGear() {
      gearInfo.textContent = "Holz " + blade.name + ": Tempo " + rate(blade.speed, 0.82, 1.17) + ", Kontrolle " + rate(blade.ctl, 0.8, 1.27) +
        ". Belag " + rubber.name + ": Spin " + rate(rubber.spin, 0.68, 1.27) + ", Tempo " + rate(rubber.speed, 0.86, 1.09) + ", Kontrolle " + rate(rubber.ctl, 0.88, 1.32) +
        ". Wie hart und mit wie viel Spin der Ball fliegt, hängt weiter von deinem Schlägertempo und der Bewegungsrichtung beim Treffen ab.";
    }
    gearBox.appendChild(gearSelect("tt-blade", "Holz", BLADES, blade, function (x) {
      blade = x; setGear(blade, rubber); showGear();
      try { localStorage.setItem(BLADE_KEY, x.id); } catch (e) {}
    }));
    gearBox.appendChild(gearSelect("tt-rubber", "Belag", RUBBERS, rubber, function (x) {
      rubber = x; setGear(blade, rubber); showGear();
      try { localStorage.setItem(RUBBER_KEY, x.id); } catch (e) {}
    }));
    showGear();

    var info = document.createElement("p");
    info.className = "msg";
    info.setAttribute("aria-live", "polite");
    var row = document.createElement("div");
    row.className = "row";
    var startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.textContent = "Neues Spiel";
    row.appendChild(startBtn);
    var soundBtn = document.createElement("button");
    soundBtn.type = "button";
    soundBtn.className = "link";
    soundBtn.setAttribute("aria-pressed", String(!muted));
    soundBtn.textContent = muted ? "Ton: aus" : "Ton: an";
    soundBtn.addEventListener("click", function () {
      muted = !muted;
      try { localStorage.setItem(SOUND_KEY, muted ? "aus" : "an"); } catch (e) {}
      soundBtn.textContent = muted ? "Ton: aus" : "Ton: an";
      soundBtn.setAttribute("aria-pressed", String(!muted));
      if (!muted) sfx("hit", 0.5);
      canvas.focus({ preventScroll: true });
    });
    row.appendChild(soundBtn);
    row.appendChild(info);

    var aimRow = document.createElement("div");
    aimRow.className = "steer";
    aimRow.style.maxWidth = "min(100%, 24rem)";
    aimRow.style.alignItems = "center";
    var aimLeft = document.createElement("button");
    aimLeft.type = "button"; aimLeft.className = "pad-btn"; aimLeft.textContent = "◀ Drehen";
    aimLeft.setAttribute("aria-label", "Aufschlag nach links drehen");
    var aimText = document.createElement("span");
    aimText.className = "msg";
    aimText.style.flex = "1";
    aimText.style.textAlign = "center";
    var aimRight = document.createElement("button");
    aimRight.type = "button"; aimRight.className = "pad-btn"; aimRight.textContent = "Drehen ▶";
    aimRight.setAttribute("aria-label", "Aufschlag nach rechts drehen");
    aimRow.appendChild(aimLeft); aimRow.appendChild(aimText); aimRow.appendChild(aimRight);
    function turnAim(dir, deg) {
      aim = clamp(aim + dir * (deg || 3) * Math.PI / 180, -35 * Math.PI / 180, 35 * Math.PI / 180);
      if (Math.abs(aim) < 0.005) aim = 0;
      showAim();
      if (S && S.state) { S.previewAt = 0; }
    }
    function showAim() {
      var d = Math.round(aim * 180 / Math.PI);
      aimText.textContent = "Aufschlagwinkel: " + (d === 0 ? "gerade" : (d > 0 ? d + "° nach rechts" : -d + "° nach links"));
    }
    aimLeft.addEventListener("click", function () { turnAim(-1, 5); canvas.focus({ preventScroll: true }); });
    aimRight.addEventListener("click", function () { turnAim(1, 5); canvas.focus({ preventScroll: true }); });
    showAim();

    var help = document.createElement("p");
    help.className = "hint";
    help.textContent = "Du spielst unten und schlägst nach oben, der Computer spielt oben. Führe den Schläger mit Maus oder Finger über das Spielfeld, oder nutze die Pfeiltasten oder W, A, S, D. Lass den Ball erst aufspringen und triff ihn dann, solange der Ring um den Schläger leuchtet. Triffst du ihn mit der linken Kante, fliegt er nach rechts. Bewegst du den Schläger beim Treffer schnell nach oben zum Netz, wird der Schlag härter und länger. Spin entsteht aus deiner Bewegung: Triffst du den Ball früh und hoch mit schnellem Schlag nach vorn, gibt das Topspin (der Ball springt nach vorn). Triffst du ihn spät und tief oder ziehst den Schläger zurück, gibt das Unterschnitt (kurz und hoch). Bewegst du den Schläger beim Treffer zur Seite, bekommt der Ball Seitenspin und fliegt eine Kurve. Je schneller der Schläger, desto mehr Spin. Aufschlag: Leertaste oder Tippen wirft den Ball hoch, dann triffst du ihn, solange er fällt. Er muss zuerst auf deiner Hälfte aufspringen und dann über das Netz. Den Aufschlagwinkel drehst du mit den Knöpfen, mit Q und E oder mit dem Mausrad. Die gepunktete Linie zeigt die Flugbahn und das gelbe Kreuz den Landepunkt. Neben und hinter der Platte ist Platz: Weit geschlagene Bälle kannst du noch zurückspielen, solange sie nicht auf dem Boden aufkommen. Ausrüstung: Das Holz bestimmt das Tempo deiner Schläge, der Belag den Spin. Dein eigenes Schlägertempo und die Bewegungsrichtung beim Treffen zählen aber immer noch. Je länger ein Ballwechsel dauert, desto schneller wird der Ball. Smashes lassen den Bildschirm wackeln. Mit „Ton“ schaltest du die Geräusche ein oder aus, und bei „Spielende“ wählst du 5, 11 oder 21 Punkte (online immer 11). Online: Eine Person erstellt eine Partie und schickt den Code, die andere gibt ihn ein. Beide sehen sich selbst unten. Wer den Ball zuletzt gespielt hat, wartet auf die Entscheidung des Gegners.";

    var modeGroup = chipGroup("Spielmodus", { cpu: "Gegen den Computer", online: "Online mit Code" }, function (id) { setMode(id); });
    modeGroup.mark("cpu");

    var lobby = document.createElement("div");
    lobby.className = "tt-lobby";
    lobby.hidden = true;
    var lobbyIntro = document.createElement("p");
    lobbyIntro.textContent = "Spiele gegen jemanden auf einem anderen Gerät. Eine Person erstellt eine Partie und schickt den Code. Die andere Person gibt den Code ein. Der Ersteller schlägt zuerst auf.";
    lobby.appendChild(lobbyIntro);
    var createRow = document.createElement("div");
    createRow.className = "row";
    var createBtn = document.createElement("button");
    createBtn.type = "button";
    createBtn.textContent = "Partie erstellen";
    createRow.appendChild(createBtn);
    lobby.appendChild(createRow);
    var joinLabel = document.createElement("label");
    joinLabel.htmlFor = "tt-code-in";
    joinLabel.textContent = "Oder Code von deinem Gegner eingeben";
    lobby.appendChild(joinLabel);
    var joinRow = document.createElement("div");
    joinRow.className = "row";
    var codeIn = document.createElement("input");
    codeIn.type = "text";
    codeIn.id = "tt-code-in";
    codeIn.maxLength = 5;
    codeIn.autocomplete = "off";
    codeIn.setAttribute("autocapitalize", "characters");
    codeIn.setAttribute("spellcheck", "false");
    var joinBtn = document.createElement("button");
    joinBtn.type = "button";
    joinBtn.textContent = "Beitreten";
    joinRow.appendChild(codeIn);
    joinRow.appendChild(joinBtn);
    lobby.appendChild(joinRow);
    var lobbyMsg = document.createElement("p");
    lobbyMsg.className = "msg";
    lobbyMsg.setAttribute("role", "status");
    lobby.appendChild(lobbyMsg);

    var bar = document.createElement("div");
    bar.className = "tt-bar";
    bar.hidden = true;
    var codeShow = document.createElement("span");
    codeShow.className = "tt-code";
    var barRow = document.createElement("div");
    barRow.className = "row";
    var copyBtn = document.createElement("button");
    copyBtn.type = "button"; copyBtn.className = "link"; copyBtn.textContent = "Code kopieren";
    copyBtn.addEventListener("click", function () {
      var done = function (ok) { copyBtn.textContent = ok ? "Kopiert" : "Code markieren und kopieren"; };
      try { navigator.clipboard.writeText(net.code).then(function () { done(true); }, function () { done(false); }); } catch (e) { done(false); }
    });
    var leaveBtn = document.createElement("button");
    leaveBtn.type = "button"; leaveBtn.className = "link"; leaveBtn.textContent = "Partie verlassen";
    leaveBtn.addEventListener("click", function () { leaveNet(); showView(); newMatch(); });
    barRow.appendChild(copyBtn); barRow.appendChild(leaveBtn);
    bar.appendChild(codeShow); bar.appendChild(barRow);

    box.appendChild(modeGroup.el);
    box.appendChild(levelGroup.el);
    box.appendChild(lenGroup.el);
    box.appendChild(gearBox);
    box.appendChild(gearInfo);
    box.appendChild(lobby);
    box.appendChild(bar);
    box.appendChild(canvas);
    box.appendChild(aimRow);
    box.appendChild(row);
    box.appendChild(help);

    var best = 0;
    try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch (e) {}

    // ---------- Zustand ----------
    var S = {};
    var raf = null, lastT = 0, stopped = false, nextTimer = null;
    var keys = {};
    var target = { x: 170, y: MIDY };       // wohin die Maus oder der Finger zeigt
    var banner = "";

    function css(name, fb) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fb;
    }

    function say(t) { info.textContent = t; }
    function oppName() { return online ? "Gegner" : "Computer"; }
    function goal() { return online ? 11 : matchLen; }
    function kmh(v) { return Math.round(v * 0.09); }

    function newBall(x, y, z) { return { x: x, y: y, z: z, vx: 0, vy: 0, vz: 0, sp: 0, sd: 0, rot: 0 }; }

    function newMatch() {
      clearTimeout(nextTimer);
      S = {
        score: { L: 0, R: 0 }, points: 0, state: "serve", server: "L",
        ball: newBall(150, MIDY, 40),
        pl: { x: 170, y: MIDY, vx: 0, vy: 0, sx: 0, sy: 0, ox: 170, oy: MIDY, cd: 0, flash: 0 },
        cpu: { x: 600, y: MIDY, vx: 0, vy: 0, sx: 0, sy: 0, ox: 600, oy: MIDY, cd: 0, flash: 0, tx: 600, ty: MIDY, plan: false },
        stats: { smash: 0, fast: 0, aces: 0 }, shake: 0, last: null, expect: null, bounced: false, rally: 0, longest: 0, over: false, frozen: false, pend: null, rng: null, trail: [], pop: null, cord: false, serveLeg: 0, serve2: null, preview: null, previewAt: 0
      };
      banner = "";
      prepareServe();
      updateText();
      showView();
    }

    function serverFor(points) {
      var s = points < (goal() - 1) * 2 ? (Math.floor(points / 2) % 2 === 0 ? "L" : "R") : (points % 2 === 0 ? "L" : "R");
      if (online && net && !net.host) s = s === "L" ? "R" : "L";        // der Gast schlägt als Zweiter auf
      return s;
    }

    function prepareServe() {
      S.server = serverFor(S.points);
      S.state = "serve";
      S.last = null;
      S.expect = null;
      S.bounced = false;
      S.rally = 0;
      S.trail = [];
      S.ball = newBall(S.server === "L" ? S.pl.x + PR + 10 : 610, S.server === "L" ? S.pl.y : MIDY, S.server === "L" ? 34 : 40);
      S.serveLeg = 0;
      S.preview = null;
      S.frozen = false; S.pend = null;
      S.cpu.plan = false;
      S.serveAt = performance.now() + 900;
      banner = S.server === "L" ? "Dein Aufschlag: Leertaste/Tippen wirft hoch" : "Aufschlag " + (online ? "Gegner" : "Computer");
      var ml = goal() - 1, ph = "";
      if (S.score.L >= ml && S.score.L > S.score.R) ph = "Matchball für dich";
      else if (S.score.R >= ml && S.score.R > S.score.L) ph = "Matchball für " + (online ? "deinen Gegner" : "den Computer");
      if (ph) banner = ph + ": " + banner;
      if (waiting()) banner = waitBanner();
      updateText();
    }

    function updateText() {
      var t = "Du " + S.score.L + " : " + S.score.R + " " + oppName();
      if (S.over) {
        t += S.score.L > S.score.R ? ". Du hast gewonnen" : (online ? ". Dein Gegner hat gewonnen" : ". Der Computer hat gewonnen");
        t += ". Deine Smashes: " + S.stats.smash + ", Asse: " + S.stats.aces + (S.stats.fast ? ", schnellster Ball: " + kmh(S.stats.fast) + " km/h" : "");
      }
      else if (S.rally > 1) t += ". Ballwechsel: " + S.rally;
      t += ". Rekord: längster Ballwechsel " + best + ".";
      if (online && net && net.players === 2 && !net.opp && !net.left) t += " Die Verbindung zum Gegner ist unterbrochen.";
      say(t);
    }

    // ---------- Ton ----------
    var audio = null, muted = false, lastSfx = {};
    try { muted = localStorage.getItem(SOUND_KEY) === "aus"; } catch (e) {}
    function actx() {
      if (muted) return null;
      try {
        if (!audio) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; audio = new AC(); }
        if (audio.state === "suspended") audio.resume();
        return audio;
      } catch (e) { return null; }
    }
    function tone(a, f0, f1, dur, vol, type, delay) {
      var t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(f0, t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(a.destination);
      o.start(t0); o.stop(t0 + dur + 0.03);
    }
    function noise(a, dur, vol, freq) {
      var n = Math.max(1, Math.floor(a.sampleRate * dur)), buf = a.createBuffer(1, n, a.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
      src.buffer = buf; f.type = "bandpass"; f.frequency.value = freq; g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(a.destination); src.start();
    }
    function sfx(kind, v) {
      var now = performance.now();
      if (lastSfx[kind] && now - lastSfx[kind] < 45) return;
      lastSfx[kind] = now;
      var a = actx();
      if (!a) return;
      v = clamp(v === undefined ? 0.5 : v, 0, 1);
      try {
        if (kind === "hit") { noise(a, 0.05, 0.25 + 0.3 * v, 2600); tone(a, 900 + 500 * v, 380, 0.07, 0.12 + 0.12 * v, "triangle"); }
        else if (kind === "smash") { noise(a, 0.09, 0.6, 1800); tone(a, 1200, 220, 0.14, 0.3, "triangle"); tone(a, 140, 60, 0.18, 0.35, "sine"); }
        else if (kind === "table") { tone(a, 620 + 200 * v, 340, 0.05, 0.08 + 0.2 * v, "sine"); noise(a, 0.02, 0.06 + 0.1 * v, 3200); }
        else if (kind === "net") { noise(a, 0.12, 0.2, 700); tone(a, 220, 110, 0.1, 0.1, "sine"); }
        else if (kind === "win") { tone(a, 523, 523, 0.12, 0.18, "triangle"); tone(a, 784, 784, 0.2, 0.18, "triangle", 0.1); }
        else if (kind === "lose") { tone(a, 330, 330, 0.14, 0.16, "triangle"); tone(a, 220, 200, 0.24, 0.16, "triangle", 0.12); }
      } catch (e) {}
    }

    // ---------- Online ----------
    // Jedes Gerät rechnet die Flugbahn selbst. Gesendet werden nur Aufschlag, Schlag und Punkt sowie die Schlägerposition.
    // Der Spieler, zu dem der Ball fliegt, entscheidet über Netz, Aus und Aufsprung. Der Gegner wird spiegelbildlich gezeigt.
    function post(path, body) {
      return fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) { d.ok = r.ok; d.http = r.status; return d; });
        });
    }

    function makeRng(seed) {
      var a = seed >>> 0;
      return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        var x = a;
        x = Math.imul(x ^ (x >>> 15), x | 1);
        x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
      };
    }

    function waiting() { return online && (!net || net.players < 2 || net.left); }
    function waitBanner() { return !net ? "" : net.left ? "Dein Gegner hat die Partie verlassen" : "Warte auf deinen Gegner: Code " + net.code; }

    function showView() {
      var lob = online && !net;
      lobby.hidden = !lob;
      bar.hidden = !(online && net);
      canvas.style.display = lob ? "none" : "";
      aimRow.style.display = lob ? "none" : "";
      row.style.display = lob ? "none" : "";
      levelGroup.el.style.display = online ? "none" : "";
      lenGroup.el.style.display = online ? "none" : "";
      gearBox.style.display = lob ? "none" : "";
      gearInfo.style.display = lob ? "none" : "";
      startBtn.style.display = online && !S.over ? "none" : "";
      if (net) {
        codeShow.textContent = net.code;
        copyBtn.hidden = net.players === 2;
        leaveBtn.textContent = S.over || net.left ? "Zurück zur Auswahl" : "Partie verlassen";
      }
    }

    function setMode(m) {
      if (m === (online ? "online" : "cpu")) return;
      if (net) leaveNet();
      online = m === "online";
      modeGroup.mark(m);
      lobbyMsg.textContent = "";
      lobbyMsg.className = "msg";
      newMatch();
      showView();
      if (!online) canvas.focus({ preventScroll: true });
    }

    function netSend(ev) {
      if (!net) return;
      ev.c = ++net.cid;
      ev.m = net.match;
      if (ev.pt === undefined) ev.pt = S.points;
      net.outbox.push(ev);
      kick();
    }

    function kick() {
      if (!net || net.busy) return;
      clearTimeout(net.timer);
      sync();
    }

    function schedule() {
      if (!net) return;
      clearTimeout(net.timer);
      var wait = document.hidden ? 1500 : net.outbox.length ? 0 : net.players < 2 ? 700 : 70;
      net.timer = setTimeout(sync, wait);
    }

    function sync() {
      var mine = net;
      if (!mine || mine.busy) return;
      mine.busy = true;
      var sent = mine.outbox.slice(0, 8), t0 = performance.now();
      post("/api/tischtennis/sync", { code: mine.code, token: mine.token, since: mine.since, send: sent, pos: { x: S.pl.x, y: S.pl.y } }).then(function (d) {
        mine.busy = false;
        if (stopped || net !== mine) return;
        if (d.http === 404) return lostNet("Diese Partie gibt es nicht mehr. Erstelle eine neue Partie.");
        if (d.http === 401) return lostNet("Die Sitzung ist abgelaufen. Melde dich neu an.");
        if (d.ok) {
          mine.rtt = mine.rtt * 0.8 + (performance.now() - t0) * 0.2;
          if (sent.length) { var lastC = sent[sent.length - 1].c; mine.outbox = mine.outbox.filter(function (e) { return e.c > lastC; }); }
          gotSync(d);
        }
        schedule();
      }, function () {
        mine.busy = false;
        if (stopped || net !== mine) return;
        if (mine.opp) { mine.opp = false; updateText(); }
        schedule();
      });
    }

    function gotSync(d) {
      net.players = d.players;
      if (net.opp !== !!d.opp_online) { net.opp = !!d.opp_online; updateText(); }
      if (d.pos) { net.oppX = 2 * NETX - d.pos.x; net.oppY = 2 * MIDY - d.pos.y; }
      var now = performance.now();
      (d.events || []).forEach(function (ev) {
        if (ev.s > net.since) net.since = ev.s;
        ev.age = Math.max(0, d.now - ev.t) + net.rtt / 2000;
        ev.arr = now;
        net.inq.push(ev);
      });
      if (net.players === 2 && !net.started) { net.started = true; newMatch(); }
      showView();
    }

    function lostNet(msg) {
      clearTimeout(net && net.timer);
      net = null;
      newMatch();
      showView();
      lobbyMsg.textContent = msg;
      lobbyMsg.className = "msg error";
    }

    function leaveNet() {
      var mine = net;
      if (!mine) return;
      clearTimeout(mine.timer);
      net = null;
      var bye = { k: "bye", c: ++mine.cid, m: mine.match, pt: 0 };
      post("/api/tischtennis/sync", { code: mine.code, token: mine.token, since: mine.since, send: mine.outbox.concat([bye]).slice(-8) }).then(null, function () {});
    }

    function startNet(d) {
      net = { code: d.code, token: d.token, host: !!d.host, players: d.host ? 1 : 2, since: 0, outbox: [], cid: 0, match: 0, inq: [],
        busy: false, timer: null, opp: true, left: false, rtt: 120, started: !d.host, oppX: 2 * NETX - 170, oppY: MIDY };
      newMatch();
      showView();
      kick();
      canvas.focus({ preventScroll: true });
    }

    function lobbyBusy(v) { createBtn.disabled = v; joinBtn.disabled = v; }

    function lobbyFail(d) {
      lobbyMsg.textContent = d.http === 401 ? "Die Sitzung ist abgelaufen. Melde dich neu an." :
        d.http === 404 ? "Diesen Code gibt es nicht. Prüfe die Eingabe." :
        d.http === 409 ? "Diese Partie ist schon voll." :
        d.http === 429 ? "Zu viele Versuche. Warte kurz und versuche es erneut." :
        "Das hat nicht geklappt. Versuche es erneut.";
      lobbyMsg.className = "msg error";
      lobbyBusy(false);
    }

    createBtn.addEventListener("click", function () {
      lobbyBusy(true);
      lobbyMsg.className = "msg";
      lobbyMsg.textContent = "Erstelle Partie …";
      post("/api/tischtennis/create", {}).then(function (d) {
        lobbyBusy(false);
        if (stopped) return;
        if (!d.ok) return lobbyFail(d);
        lobbyMsg.textContent = "";
        startNet(d);
      }, function () { lobbyFail({ http: 0 }); });
    });

    function joinGame() {
      var code = codeIn.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      if (code.length !== 5) { lobbyMsg.className = "msg error"; lobbyMsg.textContent = "Der Code hat 5 Zeichen."; return; }
      lobbyBusy(true);
      lobbyMsg.className = "msg";
      lobbyMsg.textContent = "Trete bei …";
      post("/api/tischtennis/join", { code: code }).then(function (d) {
        lobbyBusy(false);
        if (stopped) return;
        if (!d.ok) return lobbyFail(d);
        lobbyMsg.textContent = "";
        codeIn.value = "";
        startNet(d);
      }, function () { lobbyFail({ http: 0 }); });
    }
    joinBtn.addEventListener("click", joinGame);
    codeIn.addEventListener("keydown", function (e) { if (e.key === "Enter") joinGame(); });

    // Der Gegner wird weich zur gemeldeten Position bewegt (gespiegelt)
    function moveOpp(h) {
      var c = S.cpu;
      if (!net) return;
      var f = 1 - Math.exp(-14 * h);
      c.x += (clamp(net.oppX, NETX + 16, W - PXMIN) - c.x) * f;
      c.y += (clamp(net.oppY, PY0, PY1) - c.y) * f;
    }

    function handleEvent(ev) {
      if (ev.k === "bye") {
        net.left = true;
        if (S.state === "rally" || S.state === "toss") S.state = "point";
        S.pend = null; S.frozen = false;
        banner = waitBanner();
        showView();
        return 0;
      }
      if (ev.k === "rematch") {
        if (ev.m > net.match) { net.match = ev.m; newMatch(); showView(); }
        return 0;
      }
      if (ev.m < net.match) return 0;
      if (ev.m > net.match) return 1;
      if (ev.pt < S.points) return 0;
      if (ev.pt > S.points) return 1;
      if (ev.k === "serve") {
        if (S.state !== "serve" || S.server !== "R") return 1;
        applyShot(ev, true);
        return 0;
      }
      if (ev.k === "shot") {
        if (S.state !== "rally") return 1;
        applyShot(ev, false);
        return 0;
      }
      if (ev.k === "point") {
        if (S.state !== "rally") return 1;
        award(ev.w === 1 ? "R" : "L", ev.why, { L: ev.sr, R: ev.sl });
        return 0;
      }
      return 0;
    }

    function processInbox() {
      if (!net || !net.inq.length) return;
      var now = performance.now(), keep = [], q = net.inq;
      net.inq = [];
      q.sort(function (a, b) { return a.s - b.s; });
      for (var i = 0; i < q.length; i++) {
        if (!net) return;
        if (handleEvent(q[i]) === 1 && now - q[i].arr < 6000) keep.push(q[i]);
      }
      if (net) net.inq = keep.concat(net.inq);
    }

    // Schlag des Gegners übernehmen (gespiegelt) und um die Übertragungszeit weiterlaufen lassen
    function applyShot(ev, isServe) {
      var b = S.ball;
      b.x = 2 * NETX - ev.x; b.y = 2 * MIDY - ev.y; b.z = ev.z;
      b.vx = -ev.vx; b.vy = -ev.vy; b.vz = ev.vz;
      b.sp = ev.sp; b.sd = -ev.sd; b.rot = 0;
      S.rng = makeRng(ev.seed);
      S.frozen = false; S.pend = null;
      S.last = "R"; S.bounced = false; S.cord = false; S.trail = []; S.preview = null;
      S.cpu.flash = 0.18;
      sfx("hit", 0.6);
      if (isServe) {
        S.serveLeg = 1; S.expect = "R"; S.serve2 = { xt: 2 * NETX - ev.xt, yt: 2 * MIDY - ev.yt, T: ev.T };
        S.state = "rally"; S.rally = 1; banner = "";
      } else {
        S.serveLeg = 0; S.expect = "L"; S.rally++;
        if (S.rally > S.longest) S.longest = S.rally;
      }
      updateText();
      var age = Math.min(0.45, ev.age + (performance.now() - ev.arr) / 1000), n = Math.floor(age / STEP);
      S.pl.ox = S.pl.x; S.pl.oy = S.pl.y;
      for (var i = 0; i < n && S.state === "rally" && !S.frozen; i++) stepBall(STEP);
    }

    // ---------- Schläge ----------
    function launch(b, v, sp, sd) {
      b.vx = v.vx; b.vy = v.vy; b.vz = v.vz;
      b.sp = sp; b.sd = sd;
    }

    // ---------- Aufschlag ----------
    // Du wirfst den Ball selbst hoch und schlägst ihn dann. Wie beim echten Tischtennis muss er zuerst auf der eigenen
    // Plattenhälfte aufspringen und dann über das Netz auf die Seite des Gegners.
    // Richtung, Länge, Tempo und Spin kommen vom Berührungspunkt, der Schlägerbewegung und der gewählten Schlagart.
    function serveSolveL(b, ct, p) {
      var core = PR + R, d = Math.sqrt(ct.rx * ct.rx + ct.ry * ct.ry);
      var q = d <= core ? 1 : 1 - 0.45 * clamp((d - core) / (PREACH - core), 0, 1);
      var power = clamp(clamp(p.sx / 520, 0, 1) + clamp(Math.abs(p.sy) / 900, 0, 0.3), 0, 1);
      var mix = 0.7 + 0.3 * q;
      var V = GEAR.V, pw = clamp(power * V, 0, 1.2);
      var x1 = TL + 100 + 130 * pw * mix;                            // erster Aufsprung auf deiner Hälfte
      var slope = clamp(ct.ry / PREACH * 0.9 + Math.tan(aim), -0.85, 0.85);   // Aufschlagwinkel (drehbar) und Treffpunkt
      var y1 = clamp(b.y + slope * (x1 - b.x) + p.sy * 0.05, TT + 14, TB - 14);
      var xt2 = NETX + 50 + 190 * pw * mix;                          // zweiter Aufsprung beim Gegner
      var raw = b.y + slope * (xt2 - b.x) * 0.9 + p.sy * 0.1;
      var yt2 = raw + (clamp(raw, TT + 16, TB - 16) - raw) * 0.55 + (1 - q) * 60 * (Math.random() * 2 - 1);
      xt2 += (1 - q) * 30 * (Math.random() * 2 - 1) / GEAR.ctl;
      var spin = computeSpin(p, ct), sp = spin.sp, sd = spin.sd;
      var T1 = (0.5 - 0.1 * power) / Math.sqrt(V);
      return { v1: plan(b.x, b.y, b.z, x1, y1, T1, sp, sd), xt2: xt2, yt2: yt2, T2: (0.62 - 0.14 * power) / Math.sqrt(V), sp: sp, sd: sd, q: q, power: power };
    }

    function playerServe(ct) {
      var b = S.ball, p = S.pl, sol = serveSolveL(b, ct, p);
      launch(b, sol.v1, sol.sp, sol.sd);
      S.serve2 = { xt: sol.xt2, yt: sol.yt2, T: sol.T2 };
      S.serveLeg = 1;
      S.frozen = false; S.pend = null;
      var seed = Math.floor(Math.random() * 1e9);
      S.rng = makeRng(seed);
      if (online) netSend({ k: "serve", x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, sp: b.sp, sd: b.sd, xt: sol.xt2, yt: sol.yt2, T: sol.T2, seed: seed });
      S.last = "L";
      S.expect = "L";
      S.bounced = false;
      S.cord = false;
      S.state = "rally";
      S.rally = 1;
      S.preview = null;
      banner = "";
      p.cd = 0.2;
      p.flash = 0.18;
      sfx("hit", 0.4);
      var name = sol.sp > 0.2 ? "Topspin-Aufschlag" : sol.sp < -0.2 ? "Unterschnitt-Aufschlag" : Math.abs(sol.sd) > 0.2 ? "Seitenspin-Aufschlag" : "Aufschlag";
      pop(sol.q < 0.7 ? "Kantenball" : name, p.x, p.y);
      updateText();
    }

    function cpuServe() {
      var b = S.ball, lv = LEVELS[levelId];
      var x1 = NETX + 40 + Math.random() * 110, y1 = TT + 30 + Math.random() * (TB - TT - 60);
      var xt2 = TL + 30 + Math.random() * (NETX - TL - 90), yt2 = TT + 30 + Math.random() * (TB - TT - 60);
      var sp = 0, sd = 0;
      if (Math.random() < lv.spin) sp = Math.random() < 0.5 ? 0.8 : -0.8;
      if (Math.random() < lv.spin * 0.7) sd = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.4);
      if (Math.random() < lv.slip * 0.5) xt2 = TL - 55;             // Patzer
      launch(b, plan(b.x, b.y, b.z, x1, y1, 0.46, sp, sd), sp, sd);
      S.serve2 = { xt: xt2, yt: yt2, T: 0.6 };
      S.serveLeg = 1;
      sfx("hit", 0.4);
      S.last = "R";
      S.expect = "R";
      S.bounced = false;
      S.cord = false;
      S.state = "rally";
      S.rally = 1;
      S.cpu.flash = 0.18;
      banner = "";
      updateText();
    }

    // Wirft den Ball hoch. Danach muss er getroffen werden, solange er fällt.
    function toss() {
      var b = S.ball;
      b.vx = 0; b.vy = 0; b.vz = 440;
      S.state = "toss";
      banner = "";
    }

    function stepToss(dt) {
      var b = S.ball, px = b.x, py = b.y, pz = b.z;
      advance(b, dt);
      if (b.vz < 0 && S.pl.cd <= 0) {
        var ct = hits(S.pl, px, py, pz);
        if (ct) { playerServe(ct); return; }
      }
      if (b.z <= 0 && b.vz < 0) {                    // Ball verfehlt: noch einmal
        S.state = "serve";
        b.vx = 0; b.vy = 0; b.vz = 0; b.z = 34;
        banner = "Verfehlt: Leertaste/Tippen wirft neu hoch";
      }
    }

    // Vorschau: Flugbahn und Landepunkt des Aufschlags, wenn du den Ball jetzt in der Mitte triffst
    function computePreview() {
      var b = S.ball, p = S.pl;
      var probe = { x: b.x, y: b.y, z: S.state === "toss" ? clamp(b.z, 8, 34) : 34 };
      var sol = serveSolveL(probe, { rx: 0, ry: 0, z: probe.z }, p);
      var c = { x: probe.x, y: probe.y, z: probe.z, vx: sol.v1.vx, vy: sol.v1.vy, vz: sol.v1.vz, sp: sol.sp, sd: sol.sd };
      var pts = [], leg = 1, dt = 1 / 60;
      for (var i = 0; i < 240; i++) {
        advance(c, dt);
        if (i % 2 === 0) pts.push({ x: c.x, y: c.y, z: c.z });
        if (c.z <= 0 && c.vz < 0) {
          if (leg === 1) {
            bounce(c);
            var v2 = plan(c.x, c.y, Math.max(c.z, 2), sol.xt2, sol.yt2, sol.T2, c.sp, c.sd);
            c.vx = v2.vx; c.vy = v2.vy; c.vz = v2.vz;
            pts.push({ x: c.x, y: c.y, z: 0 });
            leg = 2;
          } else { pts.push({ x: c.x, y: c.y, z: 0 }); break; }
        }
      }
      S.preview = pts;
    }

    // Kleiner Hinweis über dem Spielfeld (zum Beispiel "Smash!")
    function pop(text, x, y) { S.pop = { text: text, x: x, y: y, t: 0.9 }; }

    // Du schlägst den Ball. Der Berührungspunkt (ct) entscheidet über Richtung und Qualität des Schlags:
    // In der Mitte des Schlägers ist der Schlag sauber, am Rand wird er schwächer und ungenauer ("Kantenball"),
    // und ein Ball hinter dem Schläger wird nur noch hochgeschoben. Tempo, Schlaghöhe und Schlägerbewegung geben Wucht.
    function playerHit(ct) {
      var b = S.ball, p = S.pl;
      var core = PR + R, d = Math.sqrt(ct.rx * ct.rx + ct.ry * ct.ry);
      var q = d <= core ? 1 : 1 - 0.45 * clamp((d - core) / (PREACH - core), 0, 1);      // Treffer auf der Schlägermitte
      var behind = ct.rx < -core * 0.6;                           // Ball hinter der Schlägermitte
      if (behind) q *= 0.75;
      q *= 1 - 0.22 * clamp(Math.abs(ct.z - 26) / 30, 0, 1);      // beste Trefferhöhe: etwa auf Schlägerhöhe
      var inSp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      var swing = Math.sqrt(p.sx * p.sx + p.sy * p.sy);
      // Härte des Schlags: Schlägertempo nach vorn plus ein Teil der Ballenergie (Block)
      var power = clamp(clamp(p.sx / 520, 0, 1) * 0.85 + clamp(Math.abs(p.sy) / 900, 0, 0.25) + clamp(inSp / 1100, 0, 1) * 0.2, 0, 1);
      var smash = b.z >= 30 && p.sx > 260 && q > 0.75;            // hoher Ball und schneller Schlag nach vorn
      if (smash) power = clamp(power + 0.25, 0, 1);
      var V = GEAR.V;                                             // Holz und Belag: Tempo des Schlags
      var xt = NETX + 60 + 175 * clamp(power * V, 0, 1.2) * (0.6 + 0.4 * q);
      // Richtung: Schlagrichtung des Schlägers und Treffpunkt auf dem Blatt
      var swingSlope = clamp(p.sy / Math.max(140, Math.abs(p.sx)), -0.8, 0.8);
      var slope = clamp(ct.ry / PREACH * 0.7 + swingSlope * 0.55, -0.8, 0.8);
      var raw = b.y + slope * (xt - b.x);
      var yt = raw + (clamp(raw, TT + 16, TB - 16) - raw) * 0.5;  // leichte Hilfe, den Ball auf die Platte zu bringen
      // Ungenauigkeit: schlechter Treffpunkt und sehr schnelle Schläge nehmen Kontrolle
      var loose = ((1 - q) * 70 + clamp((swing - 450) / 600, 0, 1) * 18) / GEAR.ctl + Math.max(0, V - 1) * 50;
      yt += loose * (Math.random() * 2 - 1);
      xt += loose * 0.55 * (Math.random() * 2 - 1);
      var spin = computeSpin(p, ct), sp = spin.sp, sd = spin.sd;   // Spin aus Schlägertempo, Richtung und Treffhöhe
      if (behind) sp = Math.min(sp, -0.2);
      // Spin des ankommenden Balls: Topspin springt länger, Unterschnitt kürzer, Seitenspin lenkt ab
      xt += clamp(b.sp, -1, 1) * 28 * (1 - 0.6 * clamp(-p.sx / 200, 0, 1));
      yt += clamp(b.sd, -1, 1) * 22;
      xt = clamp(xt, NETX + 30, TR + 40);
      var ramp = Math.min(0.12, S.rally * 0.007);                 // lange Ballwechsel werden schneller
      var T = Math.max(0.34, (0.74 - 0.24 * power - (smash ? 0.1 : 0) - ramp) / V);
      launch(b, plan(b.x, b.y, b.z, xt, yt, T, sp, sd), sp, sd);
      afterHit("L");
      S.frozen = false; S.pend = null;
      var seed = Math.floor(Math.random() * 1e9);
      S.rng = makeRng(seed);
      if (online) netSend({ k: "shot", x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, sp: b.sp, sd: b.sd, seed: seed });
      p.cd = 0.2;
      p.flash = 0.18;
      var spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (spd > S.stats.fast) S.stats.fast = spd;
      if (smash) { S.stats.smash++; S.shake = 0.9; sfx("smash"); } else sfx("hit", power);
      if (smash) pop("Smash! " + kmh(spd) + " km/h", p.x, p.y);
      else if (q < 0.7) pop("Kantenball", p.x, p.y);
      else if (behind) pop("Zu spät", p.x, p.y);
      else if (sp > 0.45) pop("Topspin", p.x, p.y);
      else if (sp < -0.45) pop("Unterschnitt", p.x, p.y);
      else if (Math.abs(sd) > 0.45) pop("Seitenspin", p.x, p.y);
    }

    function cpuHit(ct) {
      var b = S.ball, c = S.cpu, lv = LEVELS[levelId];
      var core = PR + R, d = Math.sqrt(ct.rx * ct.rx + ct.ry * ct.ry);
      var q = d <= core ? 1 : 1 - 0.5 * clamp((d - core) / (REACH - core), 0, 1);
      var yt = (S.pl.y < MIDY ? MIDY + 80 : MIDY - 80) + (Math.random() - 0.5) * 70 + (Math.random() - 0.5) * 2 * lv.err + (1 - q) * 60 * (Math.random() * 2 - 1);
      var xt = TL + 30 + Math.random() * 200;
      var T = Math.max(0.4, 0.62 + Math.random() * 0.16 - Math.min(0.12, S.rally * 0.007));
      var sp = 0, sd = 0;
      if (Math.random() < lv.spin) sp = Math.random() < 0.5 ? 0.8 : -0.8;
      if (Math.random() < lv.spin * 0.7) sd = (Math.random() < 0.5 ? -1 : 1) * (0.4 + Math.random() * 0.4);
      if (Math.random() < lv.slip) xt = TL - 55;                // Patzer: der Ball fliegt zu weit ins Aus
      launch(b, plan(b.x, b.y, b.z, xt, yt, T, sp, sd), sp, sd);
      afterHit("R");
      sfx("hit", 0.5);
      c.cd = 0.2;
      c.flash = 0.18;
      c.plan = false;
    }

    function afterHit(side) {
      S.last = side;
      S.expect = side === "L" ? "R" : "L";
      S.bounced = false;
      S.cord = false;
      S.serveLeg = 0;
      S.rally++;
      if (S.rally > S.longest) S.longest = S.rally;
      updateText();
    }

    // ---------- Punkte ----------
    // Gründe als Zahlen, damit sie online übertragen werden können
    var WHY = ["", "Netz", "Ball landet auf der eigenen Seite", "Aufschlag muss zuerst auf der eigenen Seite aufspringen", "Ball landet auf der falschen Seite", "Ball im Aus"];
    function whyText(code, side) {
      if (code === 6) return side === "L" ? oppName2() + " erreicht den Ball nicht" : "Du erreichst den Ball nicht";
      if (code === 7) return side === "L" ? oppName2() + " verpasst den Ball" : "Du verpasst den Ball";
      return WHY[code] || "";
    }
    function oppName2() { return online ? "Dein Gegner" : "Der Computer"; }

    function award(side, code, forced) {
      if (S.state !== "rally") return;
      if (forced) { S.score.L = forced.L; S.score.R = forced.R; S.points = forced.L + forced.R; }
      else { S.score[side]++; S.points++; }
      if (side === "L" && S.server === "L" && S.rally <= 1) S.stats.aces++;
      S.state = "point";
      S.frozen = false; S.pend = null;
      sfx(side === "L" ? "win" : "lose");
      var a = S.score.L, b2 = S.score.R;
      if (S.longest > best) {
        best = S.longest;
        try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) {}
      }
      if ((a >= goal() || b2 >= goal()) && Math.abs(a - b2) >= 2) {
        S.over = true;
        banner = a > b2 ? "Du gewinnst " + a + " : " + b2 + "!" : (online ? "Dein Gegner gewinnt " : "Computer gewinnt ") + b2 + " : " + a + ".";
        startBtn.textContent = "Noch ein Spiel";
        updateText();
        showView();
        return;
      }
      var why = whyText(code, side);
      banner = (side === "L" ? "Punkt für dich" : "Punkt für " + (online ? "deinen Gegner" : "den Computer")) + (why ? ": " + why : "");
      updateText();
      nextTimer = setTimeout(function () { if (!stopped) prepareServe(); }, 1300);
    }

    function other(s) { return s === "L" ? "R" : "L"; }

    // Entscheidung über den Ballwechsel. Online entscheidet immer der Spieler, zu dem der Ball fliegt.
    // Der Schläger zeigt seinen eigenen Schlag nur an und wartet auf die Meldung des Gegners.
    function decide(side, code) {
      if (online && S.last === "L") {
        if (!S.pend) S.pend = { side: side, code: code, at: performance.now() };
        S.frozen = true;
        return;
      }
      var pt = S.points;
      award(side, code);
      if (online) netSend({ k: "point", w: side === "R" ? 1 : 0, sl: S.score.L, sr: S.score.R, why: code, pt: pt });
    }

    // Der letzte Schläger hat einen Fehler gemacht (Netz, ins Aus, falsche Seite).
    function fault(code) { decide(other(S.last), code); }

    function onBounce(x) {
      var side = x < NETX ? "L" : "R";
      if (!S.bounced) {
        if (side === S.expect) S.bounced = true;
        else fault(2);
      } else if (side === S.expect) {
        decide(S.last, 6);                          // zweiter Aufsprung
      } else {
        fault(4);
      }
    }

    function decideOut() {
      if (S.bounced) decide(S.last, 7);
      else fault(5);
    }

    // ---------- Computergegner ----------
    function predict() {
      // Spielt die Flugbahn (mit Spin) im Voraus durch und sucht die Stelle, an der der Ball nach dem Aufsprung wieder in Schlaghöhe kommt.
      var s = S.ball, b = { x: s.x, y: s.y, z: s.z, vx: s.vx, vy: s.vy, vz: s.vz, sp: s.sp, sd: s.sd };
      var bounced = S.bounced, dt = 1 / 120, pos = { x: b.x, y: b.y };
      for (var i = 0; i < 480; i++) {
        advance(b, dt);
        if (b.z <= 0 && b.vz < 0 && onTable(b.x, b.y)) {
          bounce(b);
          if (b.x >= NETX) bounced = true;
        }
        pos = { x: b.x, y: b.y };
        if (bounced && b.vz < 0 && b.z <= HITZ - 12 && b.x >= NETX) break;
        if (b.x > XMAX || b.x < XMIN || b.y < YMIN || b.y > YMAX || (b.z <= 0 && !onTable(b.x, b.y))) break;
      }
      return pos;
    }

    function moveCpu(dt) {
      var c = S.cpu, lv = LEVELS[levelId];
      var tx = 610, ty = MIDY;
      if (S.state === "rally" && S.last === "L") {
        if (!c.plan && (S.bounced || S.ball.x > NETX)) {
          var p = predict();
          c.tx = p.x + 10; c.ty = p.y;
          c.plan = true;
          c.planAt = performance.now() + lv.react * 1000;
        }
        if (c.plan && performance.now() >= c.planAt) { tx = c.tx; ty = c.ty; }
        else if (c.plan) { tx = c.x; ty = c.y; }
      }
      var dx = clamp(tx, NETX + 16, W - PXMIN) - c.x, dy = clamp(ty, PY0, PY1) - c.y;
      var dist = Math.sqrt(dx * dx + dy * dy), step = lv.speed * dt;
      var ox = c.x, oy = c.y;
      if (dist > step) { c.x += dx / dist * step; c.y += dy / dist * step; } else { c.x += dx; c.y += dy; }
      c.vx = (c.x - ox) / dt; c.vy = (c.y - oy) / dt;
    }

    // ---------- Schritt und Zeichnen ----------
    function movePlayer(dt) {
      var p = S.pl, ox = p.x, oy = p.y, k = 560 * dt;
      if (keys.ArrowUp || keys.w) target.x += k;        // nach oben = zum Netz
      if (keys.ArrowDown || keys.s) target.x -= k;
      if (keys.ArrowLeft || keys.a) target.y -= k;
      if (keys.ArrowRight || keys.d) target.y += k;
      target.x = clamp(target.x, PXMIN, NETX - 16);
      target.y = clamp(target.y, PY0, PY1);
      var f = 1 - Math.exp(-24 * dt);                       // leicht geglättet
      p.x += (target.x - p.x) * f;
      p.y += (target.y - p.y) * f;
      p.vx = (p.x - ox) / dt; p.vy = (p.y - oy) / dt;
      var ea = 1 - Math.exp(-dt / 0.05);                      // geglättetes Tempo (Maus-Zittern zählt kaum)
      p.sx += (p.vx - p.sx) * ea; p.sy += (p.vy - p.sy) * ea;
    }

    // Trifft der Ball den Schläger? Es zählt die Bewegung des Balls relativ zum Schläger seit dem letzten Schritt,
    // damit weder schnelle Bälle noch schnelle Schläger durcheinander hindurchfliegen.
    // Gibt den Berührungspunkt relativ zur Schlägermitte zurück (oder null).
    function hits(pad, px, py, pz) {
      var b = S.ball;
      if (Math.min(pz, b.z) > HITZ) return null;
      var rr = pad === S.pl ? PREACH : REACH;
      var ax = px - pad.ox, ay = py - pad.oy, bx = b.x - pad.x, by = b.y - pad.y;
      if (segDist2(ax, ay, bx, by, 0, 0) > rr * rr) return null;
      var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      var u = l2 ? clamp(-(ax * dx + ay * dy) / l2, 0, 1) : 1;          // Zeitpunkt der größten Annäherung
      return { rx: ax + dx * u, ry: ay + dy * u, z: pz + (b.z - pz) * u };
    }

    function stepBall(dt) {
      if (S.frozen) return;
      var b = S.ball, px = b.x, py = b.y, pz = b.z;
      advance(b, dt);
      b.rot += (b.sp * 11 + b.sd * 9) * dt;

      // Netz: beim Überqueren der Mitte muss der Ball hoch genug sein
      if ((px < NETX) !== (b.x < NETX) && b.y > TT - NETEXT && b.y < TB + NETEXT && b.z < NETH + R * 0.4) {
        if (b.z > NETH - 5 && !S.cord) {               // Netzroller: der Ball streift die Netzkante und trudelt weiter
          S.cord = true;
          b.vx *= 0.5; b.vz = Math.max(b.vz, 0) + 80; b.vy += ((S.rng ? S.rng() : Math.random()) - 0.5) * 160 * (online && S.last === "R" ? -1 : 1); b.sp *= 0.5; b.sd *= 0.5;
          pop("Netzroller!", b.x, b.y);
          sfx("net");
        } else { sfx("net"); fault(1); return; }
      }

      if (b.z <= 0 && b.vz < 0) {
        if (onTable(b.x, b.y)) {
          sfx("table", clamp(-b.vz / 500, 0, 1));
          bounce(b);
          if (S.serveLeg === 1) {                              // erster Aufsprung des Aufschlags
            var own = S.last === "L" ? b.x < NETX : b.x >= NETX;
            if (!own) { fault(3); return; }
            S.serveLeg = 2;
            S.expect = other(S.last);
            S.bounced = false;
            var s2 = S.serve2;
            launch(b, plan(b.x, b.y, Math.max(b.z, 2), s2.xt, s2.yt, s2.T, b.sp, b.sd), b.sp, b.sd);   // von der Platte über das Netz
          } else onBounce(b.x);
          if (S.state !== "rally") return;
        } else { decideOut(); return; }                      // Ball fällt neben der Platte auf den Boden
      }
      if (b.x < XMIN || b.x > XMAX || b.y < YMIN || b.y > YMAX) { decideOut(); return; }

      // Geschlagen wird erst, nachdem der Ball auf der eigenen Seite aufgesprungen ist
      var ct;
      if (S.bounced && S.expect === "L" && S.pl.cd <= 0 && (ct = hits(S.pl, px, py, pz))) playerHit(ct);
      else if (!online && S.bounced && S.expect === "R" && S.cpu.cd <= 0 && (ct = hits(S.cpu, px, py, pz))) cpuHit(ct);
    }

    var acc = 0, STEP = 1 / 240;                      // fester Zeitschritt: auf beiden Geräten läuft die Physik gleich
    function step(h) {
      S.pl.ox = S.pl.x; S.pl.oy = S.pl.y; S.cpu.ox = S.cpu.x; S.cpu.oy = S.cpu.y;
      movePlayer(h);
      if (online) moveOpp(h); else moveCpu(h);
      S.pl.cd -= h; S.cpu.cd -= h;
      S.pl.flash -= h; S.cpu.flash -= h;
      if (S.pop) { S.pop.t -= h; if (S.pop.t <= 0) S.pop = null; }
      if (S.shake > 0) S.shake = Math.max(0, S.shake - h * 3);
      if (S.state === "serve" && S.server === "L") { S.ball.x = S.pl.x + PR + 10; S.ball.y = S.pl.y; S.ball.z = 34; }
      else if (S.state === "serve" && online) { S.ball.x = S.cpu.x - PR - 10; S.ball.y = S.cpu.y; S.ball.z = 34; }
      if (S.state === "rally") stepBall(h);
      else if (S.state === "toss") stepToss(h);
    }

    function frame(t) {
      if (stopped) return;
      var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
      lastT = t;
      if (!document.hidden) {
        if (online) processInbox();
        acc += dt;
        var n = 0;
        while (acc >= STEP && n < 16) { step(STEP); acc -= STEP; n++; }
        if (acc > STEP) acc = 0;
        if (S.state === "rally" || S.state === "point") {
          S.trail.push({ x: S.ball.x, y: S.ball.y, z: S.ball.z });
          if (S.trail.length > 16) S.trail.shift();
        } else if (S.trail.length) S.trail = [];
        if (!online && S.state === "serve" && S.server === "R" && performance.now() >= S.serveAt) cpuServe();
        if ((S.state === "serve" && S.server === "L") || S.state === "toss") {
          if (performance.now() - S.previewAt > 90) { S.previewAt = performance.now(); computePreview(); }
        } else S.preview = null;
        // Meldung des Gegners bleibt aus: dann gilt nach kurzer Zeit die eigene Einschätzung
        if (S.pend && S.state === "rally" && performance.now() - S.pend.at > 3500) { var pd = S.pend; award(pd.side, pd.code); }
      }
      draw();
      raf = requestAnimationFrame(frame);
    }

    function paddle(p, color, dir, active) {
      // Schatten, Griff, Schlägerblatt von oben (dir: Richtung des Griffs, -1 nach links, 1 nach rechts)
      ctx.fillStyle = "rgba(0,0,0,0.16)";
      ctx.beginPath(); ctx.ellipse(p.x - 5, p.y + 5, PR, PR * 0.95, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#8a6238";
      ctx.fillRect(dir > 0 ? p.x + PR - 4 : p.x - PR - 14, p.y - 4, 18, 8);
      ctx.fillStyle = "#1b1b1b";
      ctx.beginPath(); ctx.arc(p.x, p.y, PR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(p.x, p.y, PR - 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath(); ctx.arc(p.x + 5, p.y - 4, PR * 0.45, 0, Math.PI * 2); ctx.fill();
      if (p.flash > 0) {                              // Aufleuchten beim Treffer
        ctx.strokeStyle = "rgba(255,255,255," + (p.flash / 0.18).toFixed(2) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, PR + (0.18 - p.flash) * 120, 0, Math.PI * 2); ctx.stroke();
      }
      if (active) {                                   // Ring: jetzt kann der Ball getroffen werden
        ctx.strokeStyle = "#ffd23f";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, p === S.pl ? PREACH : REACH, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // Spin-Anzeige: so dreht sich der Ball gerade (nimmt in der Luft ab und beim Aufsprung stark ab)
    function drawSpinHud(ink, panel, b) {
      var x0 = 840 - 126, y0 = 640 - 78, w = 114, h = 66;
      ctx.fillStyle = panel;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x0, y0, w, h);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1;
      ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
      ctx.globalAlpha = 1;
      ctx.fillStyle = ink;
      ctx.textAlign = "left";
      ctx.font = "700 12px Georgia, serif";
      var topName = b.sp > 0.08 ? "Topspin" : b.sp < -0.08 ? "Unterschnitt" : "Kein Vor-/Rückdreher";
      ctx.fillText("Spin: " + (b.sp > 0.08 || b.sp < -0.08 ? topName : "keiner"), x0 + 6, y0 + 15, w - 12);
      function bar(y, val, color, left, right) {
        var cx = x0 + w / 2, half = 40;
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = ink;
        ctx.fillRect(cx - half, y, half * 2, 8);
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        var len = clamp(val, -1.3, 1.3) * half * 0.77;
        ctx.fillRect(len >= 0 ? cx : cx + len, y, Math.abs(len), 8);
        ctx.fillStyle = ink;
        ctx.fillRect(cx - 0.5, y - 2, 1, 12);
        ctx.font = "10px Georgia, serif";
        ctx.textAlign = "right"; ctx.fillText(left, cx - half - 3, y + 8);
        ctx.textAlign = "left"; ctx.fillText(right, cx + half + 3, y + 8);
      }
      bar(y0 + 24, b.sp, b.sp >= 0 ? "#d6409f" : "#2447d6", "U", "T");
      ctx.font = "700 12px Georgia, serif";
      ctx.fillStyle = ink;
      ctx.textAlign = "left";
      ctx.fillText("Seitenspin: " + (Math.abs(b.sd) < 0.08 ? "keiner" : b.sd > 0 ? "rechts" : "links"), x0 + 6, y0 + 52, w - 12);
      bar(y0 + 55, b.sd, "#e8b400", "L", "R");
    }

    // ---------- 3D-Ansicht (Kamera hinter deinem Ende der Platte) ----------
    var CW = 840, CH = 640, FLOORZ = -140, PADZ = 24;
    var CAM = { x: -190, y: MIDY, z: 360, th: 0.95, F: 400, cx: CW / 2, cy: 330 };
    CAM.c = Math.cos(CAM.th); CAM.s = Math.sin(CAM.th);

    function proj(x, y, z) {
      var rx = x - CAM.x, rz = z - CAM.z;
      var d = rx * CAM.c - rz * CAM.s;
      if (d < 8) return null;
      var up = rx * CAM.s + rz * CAM.c, k = CAM.F / d;
      return { x: CAM.cx + (y - CAM.y) * k, y: CAM.cy - up * k, d: d, k: k };
    }
    function unproj(sx, sy, z0) {          // Bildpunkt -> Punkt auf der Ebene in Höhe z0
      var rc = (sx - CAM.cx) / CAM.F, uc = -(sy - CAM.cy) / CAM.F;
      var dz = -CAM.s + CAM.c * uc, dx = CAM.c + CAM.s * uc, t;
      t = dz > -0.02 ? 6000 : (z0 - CAM.z) / dz;
      return { x: CAM.x + t * dx, y: CAM.y + t * rc };
    }
    function poly3(pts, fill, stroke, lw) {
      var q = [], i;
      for (i = 0; i < pts.length; i++) { var p = proj(pts[i][0], pts[i][1], pts[i][2]); if (!p) return; q.push(p); }
      ctx.beginPath();
      for (i = 0; i < q.length; i++) { if (i) ctx.lineTo(q[i].x, q[i].y); else ctx.moveTo(q[i].x, q[i].y); }
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
    }
    function line3(a, b, color, lw) {
      var p = proj(a[0], a[1], a[2]), q = proj(b[0], b[1], b[2]);
      if (!p || !q) return;
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    function circle3(cx, cy, z, r, n) {       // Kreis auf einer waagerechten Ebene
      var pts = [], i;
      for (i = 0; i < n; i++) pts.push([cx + Math.cos(i * 2 * Math.PI / n) * r, cy + Math.sin(i * 2 * Math.PI / n) * r, z]);
      return pts;
    }

    function drawPaddle3(p, color, front, active) {
      var g = proj(p.x, p.y, 0), c = proj(p.x, p.y, PADZ);
      if (!g || !c) return;
      var r = PR * 1.15 * c.k;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.ellipse(g.x, g.y, r * 0.95, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#8a6238"; ctx.lineWidth = r * 0.42; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(c.x, c.y + r * 0.8); ctx.lineTo(c.x + r * 0.18, c.y + r * 1.95); ctx.stroke();
      ctx.fillStyle = "#151515";
      ctx.beginPath(); ctx.ellipse(c.x, c.y, r, r * 0.97, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(c.x, c.y, r * 0.86, r * 0.83, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.beginPath(); ctx.ellipse(c.x - r * 0.25, c.y - r * 0.3, r * 0.4, r * 0.28, -0.5, 0, Math.PI * 2); ctx.fill();
      if (front) {
        ctx.fillStyle = "rgba(0,0,0,0.35)";
        ctx.beginPath(); ctx.ellipse(c.x, c.y, r * 0.86, r * 0.83, 0, 0, Math.PI * 2); ctx.fill();
      }
      if (p.flash > 0) {
        ctx.strokeStyle = "rgba(255,255,255," + (p.flash / 0.18).toFixed(2) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(c.x, c.y, r + (0.18 - p.flash) * 150 * c.k, 0, Math.PI * 2); ctx.stroke();
      }
      if (active) poly3(circle3(p.x, p.y, 0, p === S.pl ? PREACH : REACH, 40), "rgba(255,210,63,0.16)", "#ffd23f", 2.5);
    }

    function drawNet3() {
      var y0 = TT - NETEXT, y1 = TB + NETEXT, i;
      poly3([[NETX, y0, 0], [NETX, y1, 0], [NETX, y1, NETH], [NETX, y0, NETH]], "rgba(235,240,245,0.28)");
      for (i = 0; i <= 12; i++) { var yy = y0 + (y1 - y0) * i / 12; line3([NETX, yy, 0], [NETX, yy, NETH], "rgba(30,30,30,0.35)", 0.8); }
      for (i = 1; i < 4; i++) line3([NETX, y0, NETH * i / 4], [NETX, y1, NETH * i / 4], "rgba(30,30,30,0.3)", 0.8);
      line3([NETX, y0, NETH], [NETX, y1, NETH], "#f7f7f7", 3);
      line3([NETX, y0, 0], [NETX, y0, NETH + 3], "#222", 4);
      line3([NETX, y1, 0], [NETX, y1, NETH + 3], "#222", 4);
    }

    function drawBall3(b, ink) {
      var s = proj(b.x, b.y, onTable(b.x, b.y) ? 0 : FLOORZ), p = proj(b.x, b.y, b.z);
      if (!p) return;
      var br = R * BALLVIS * p.k;
      if (s) {
        ctx.fillStyle = "rgba(0,0,0," + (onTable(b.x, b.y) ? 0.32 : 0.2) + ")";
        ctx.beginPath(); ctx.ellipse(s.x, s.y, br * 1.05, br * 0.5, 0, 0, Math.PI * 2); ctx.fill();
      }
      var gr = ctx.createRadialGradient(p.x - br * 0.35, p.y - br * 0.4, br * 0.1, p.x, p.y, br);
      gr.addColorStop(0, "#ffffff"); gr.addColorStop(1, "#f3dfb3");
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(p.x, p.y, br, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, br, 0, Math.PI * 2); ctx.stroke();
      if (Math.abs(b.sp) + Math.abs(b.sd) > 0.08) {
        ctx.strokeStyle = b.sp > 0.08 ? "#d6409f" : b.sp < -0.08 ? "#2447d6" : "#e8b400";
        ctx.lineWidth = Math.max(1.5, br * 0.25);
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(b.rot) * br, p.y + Math.sin(b.rot) * br);
        ctx.lineTo(p.x - Math.cos(b.rot) * br, p.y - Math.sin(b.rot) * br);
        ctx.stroke();
      }
    }

    function draw() {
      var panel = css("--panel", "#ffffff"), ink = css("--ink", "#17313a"), accent = css("--accent", "#2447d6");
      var b = S.ball, now = performance.now(), i, p, q, items = [];
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.textBaseline = "alphabetic";
      var shk = S.shake > 0 ? S.shake : 0;               // Bildschirmwackeln bei einem Smash
      CAM.cx = CW / 2 + (Math.random() - 0.5) * shk * 16;
      CAM.cy = 330 + (Math.random() - 0.5) * shk * 12;
      // Hintergrund: dunkle Halle mit Boden
      var bg = ctx.createLinearGradient(0, 0, 0, CH);
      bg.addColorStop(0, "#0a1a24"); bg.addColorStop(1, "#16384a");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CW, CH);
      var mat = [[-260, -420, FLOORZ], [1020, -420, FLOORZ], [1020, 1000, FLOORZ], [-260, 1000, FLOORZ]];
      poly3(mat, "rgba(255,255,255,0.05)", "rgba(255,255,255,0.12)", 1.5);
      for (i = -260; i <= 1020; i += 100) line3([i, -420, FLOORZ], [i, 1000, FLOORZ], "rgba(255,255,255,0.06)", 1);
      for (i = -420; i <= 1000; i += 100) line3([-260, i, FLOORZ], [1020, i, FLOORZ], "rgba(255,255,255,0.06)", 1);
      // Beine und Schatten der Platte
      poly3([[TL + 10, TT + 10, FLOORZ], [TR + 14, TT + 10, FLOORZ], [TR + 14, TB + 14, FLOORZ], [TL + 10, TB + 14, FLOORZ]], "rgba(0,0,0,0.28)");
      [[TL + 28, TT + 14], [TL + 28, TB - 14], [TR - 28, TT + 14], [TR - 28, TB - 14]].forEach(function (l) {
        var k0 = proj(l[0], l[1], -10), k1 = proj(l[0], l[1], FLOORZ);
        if (k0 && k1) line3([l[0], l[1], -10], [l[0], l[1], FLOORZ], "#20262b", Math.max(3, 7 * k0.k));
      });
      // Platte
      poly3([[TL, TT, -14], [TL, TB, -14], [TL, TB, 0], [TL, TT, 0]], "color-mix(in srgb, " + accent + " 55%, #000)");
      poly3([[TL, TT, 0], [TR, TT, 0], [TR, TB, 0], [TL, TB, 0]], accent);
      var sheen = ctx.createLinearGradient(0, proj(TR, MIDY, 0) ? proj(TR, MIDY, 0).y : 0, 0, proj(TL, MIDY, 0) ? proj(TL, MIDY, 0).y : CH);
      sheen.addColorStop(0, "rgba(0,0,0,0.22)"); sheen.addColorStop(0.6, "rgba(255,255,255,0)"); sheen.addColorStop(1, "rgba(255,255,255,0.14)");
      poly3([[TL, TT, 0], [TR, TT, 0], [TR, TB, 0], [TL, TB, 0]], sheen);
      var lw = proj(TL, MIDY, 0) ? Math.max(1.5, 2.4 * proj(TL, MIDY, 0).k) : 2;
      poly3([[TL + 2, TT + 2, 0], [TR - 2, TT + 2, 0], [TR - 2, TB - 2, 0], [TL + 2, TB - 2, 0]], null, "rgba(255,255,255,0.92)", lw);
      line3([TL, MIDY, 0], [TR, MIDY, 0], "rgba(255,255,255,0.85)", Math.max(1, lw * 0.7));
      // Spur des Balls
      for (i = 0; i < S.trail.length - 1; i++) {
        p = proj(S.trail[i].x, S.trail[i].y, S.trail[i].z);
        if (!p) continue;
        ctx.fillStyle = "rgba(255,255,255," + (0.05 + 0.3 * i / S.trail.length).toFixed(2) + ")";
        ctx.beginPath(); ctx.arc(p.x, p.y, R * 0.7 * p.k, 0, Math.PI * 2); ctx.fill();
      }
      // Aufschlagrichtung (Pfeil auf der Platte) und Vorschau der Flugbahn
      if (S.server === "L" && (S.state === "serve" || S.state === "toss")) {
        var ca = Math.cos(aim), sa = Math.sin(aim), ax = b.x, ay = b.y, col = "#ffd23f";
        line3([ax + ca * 16, ay + sa * 16, 0], [ax + ca * 58, ay + sa * 58, 0], col, 3);
        line3([ax + ca * 58, ay + sa * 58, 0], [ax + Math.cos(aim + 2.6) * 12 + ca * 58, ay + Math.sin(aim + 2.6) * 12 + sa * 58, 0], col, 3);
        line3([ax + ca * 58, ay + sa * 58, 0], [ax + Math.cos(aim - 2.6) * 12 + ca * 58, ay + Math.sin(aim - 2.6) * 12 + sa * 58, 0], col, 3);
      }
      if (S.preview && S.preview.length) {
        for (i = 0; i < S.preview.length; i++) {
          p = proj(S.preview[i].x, S.preview[i].y, S.preview[i].z);
          if (!p) continue;
          ctx.fillStyle = "rgba(255,255,255," + (0.35 + 0.25 * (i % 2)) + ")";
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.4, 2.2 * p.k), 0, Math.PI * 2); ctx.fill();
        }
        var lp = S.preview[S.preview.length - 1];
        line3([lp.x - 9, lp.y - 9, 0], [lp.x + 9, lp.y + 9, 0], "#ffd23f", 3);
        line3([lp.x + 9, lp.y - 9, 0], [lp.x - 9, lp.y + 9, 0], "#ffd23f", 3);
      }
      // Tiefen-Reihenfolge: Computer-Schläger, Netz, Ball, dein Schläger (von hinten nach vorn)
      var hitWin = S.state === "rally" && S.bounced && b.z <= HITZ + 6;
      var dep = function (x, y, z) { var r = proj(x, y, z); return r ? r.d : 0; };
      items.push({ d: dep(S.cpu.x, S.cpu.y, PADZ), f: function () { drawPaddle3(S.cpu, "#2b2b2b", true, false); } });
      items.push({ d: dep(NETX, MIDY, 10), f: drawNet3 });
      items.push({ d: dep(b.x, b.y, b.z), f: function () { drawBall3(b, ink); } });
      items.push({ d: dep(S.pl.x, S.pl.y, PADZ), f: function () { drawPaddle3(S.pl, "#c62f3a", false, hitWin && S.expect === "L"); } });
      items.sort(function (a, c) { return c.d - a.d; });
      items.forEach(function (it) { it.f(); });

      // Anzeigen
      drawSpinHud(ink, panel, b);
      if (S.pop) {
        p = proj(S.pop.x, S.pop.y, 50);
        if (p) {
          ctx.globalAlpha = clamp(S.pop.t / 0.4, 0, 1);
          ctx.fillStyle = "#fff";
          ctx.strokeStyle = "rgba(0,0,0,0.55)";
          ctx.lineWidth = 4;
          ctx.font = "700 20px Georgia, serif";
          ctx.textAlign = "center";
          var py = p.y - (0.9 - S.pop.t) * 40, pxx = clamp(p.x, 60, CW - 60);
          ctx.strokeText(S.pop.text, pxx, py); ctx.fillText(S.pop.text, pxx, py);
          ctx.globalAlpha = 1;
        }
      }
      ctx.font = "700 24px Georgia, serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(10, 10, 150 + (online ? 0 : 18), 36); ctx.fillRect(10, CH - 46, 108, 36);
      ctx.fillStyle = "#fff";
      ctx.fillText(oppName() + " " + S.score.R, 18, 36);
      ctx.fillText("Du " + S.score.L, 18, CH - 20);
      ctx.font = "600 11px Georgia, serif";
      ctx.fillText(blade.name + " + " + rubber.name, 18, CH - 48, 180);
      if (S.over) { S.endAt = S.endAt || now; drawEnd(S.score.L > S.score.R, (now - S.endAt) / 1000); } else S.endAt = 0;
      if (banner) {
        ctx.font = "700 20px Georgia, serif";
        var lines = banner.split(": "), bw = 0, li;
        for (li = 0; li < lines.length; li++) bw = Math.max(bw, ctx.measureText(lines[li]).width);
        bw = Math.min(CW - 16, bw + 28);
        var bh = lines.length * 28 + 14, by0 = S.over ? CH * 0.55 : CH * 0.2;
        ctx.fillStyle = panel;
        ctx.globalAlpha = 0.93;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(CW / 2 - bw / 2, by0 - bh / 2, bw, bh, 12); else ctx.rect(CW / 2 - bw / 2, by0 - bh / 2, bw, bh);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = ink;
        ctx.textAlign = "center";
        for (li = 0; li < lines.length; li++) ctx.fillText(lines[li], CW / 2, by0 - bh / 2 + 28 + li * 28 - 4, CW - 30);
      }
    }

    // Spielende: Gewonnen = Konfetti und Glanz, Verloren = rote Ränder
    function drawEnd(won, t) {
      var i, k = clamp(t / 0.5, 0, 1), sc = 1 + 2.4 * Math.pow(1 - k, 2) * (1 - k * 0.2);
      if (won) {
        var gl = ctx.createRadialGradient(CW / 2, CH * 0.3, 20, CW / 2, CH * 0.3, CH * 0.7);
        gl.addColorStop(0, "rgba(255,214,102," + (0.45 * k).toFixed(2) + ")"); gl.addColorStop(1, "rgba(255,214,102,0)");
        ctx.fillStyle = gl; ctx.fillRect(0, 0, CW, CH);
        var cols = ["#ffd23f", "#ff5d73", "#4cd7a6", "#6aa7ff", "#d6409f", "#ffffff"];
        for (i = 0; i < 54; i++) {
          var cx = ((i * 83) % CW) + Math.sin(t * 2.2 + i) * 14, cyy = ((t * 150 + i * 61) % (CH + 40)) - 20;
          ctx.save(); ctx.translate(cx, cyy); ctx.rotate(t * 3 + i);
          ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-4, -2, 8, 4); ctx.restore();
        }
      } else {
        var vg = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.25, CW / 2, CH / 2, CH * 0.75);
        vg.addColorStop(0, "rgba(160,20,35,0)"); vg.addColorStop(1, "rgba(160,20,35," + (0.6 * k).toFixed(2) + ")");
        ctx.fillStyle = vg; ctx.fillRect(0, 0, CW, CH);
      }
      ctx.save();
      ctx.translate(CW / 2, CH * 0.3 + (won ? 0 : Math.sin(t * 40) * 3 * (1 - k)));
      ctx.scale(sc, sc);
      ctx.font = "700 54px Georgia, serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 8; ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.fillStyle = won ? "#ffd23f" : "#ff8a80";
      ctx.globalAlpha = k;
      ctx.strokeText(won ? "Gewonnen!" : "Verloren", 0, 0);
      ctx.fillText(won ? "Gewonnen!" : "Verloren", 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // ---------- Eingaben ----------
    function canvasPoint(e) {
      var r = canvas.getBoundingClientRect();
      return unproj((e.clientX - r.left) * CW / r.width, (e.clientY - r.top) * CH / r.height, PADZ);
    }

    function tryServe() {
      if (S.state === "serve" && S.server === "L" && !S.over && !waiting()) toss();
    }

    canvas.addEventListener("wheel", function (e) {
      if (S.state !== "serve" && S.state !== "toss") return;
      e.preventDefault();
      turnAim(e.deltaY > 0 ? 1 : -1, 3);
    }, { passive: false });
    canvas.addEventListener("pointermove", function (e) {
      var p = canvasPoint(e);
      target.x = p.x; target.y = p.y;
    });
    canvas.addEventListener("pointerdown", function (e) {
      canvas.focus({ preventScroll: true });
      var p = canvasPoint(e);
      target.x = p.x; target.y = p.y;
      tryServe();
    });

    function onKey(e) {
      if (!canvas.offsetParent) return;
      var t = e.target && e.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA" || t === "BUTTON") return;
      var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (e.type === "keydown" && (k === " " || k === "Enter")) { e.preventDefault(); tryServe(); return; }
      if (e.type === "keydown" && (k === "q" || k === "e")) { turnAim(k === "q" ? -1 : 1); return; }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "a", "d", "w", "s"].indexOf(k) < 0) return;
      e.preventDefault();
      keys[k] = e.type === "keydown";
    }

    startBtn.addEventListener("click", function () {
      startBtn.textContent = "Neues Spiel";
      if (online) {
        if (!net || waiting()) return;
        net.match++;
        netSend({ k: "rematch", pt: 0 });
      }
      newMatch();
      showView();
      canvas.focus({ preventScroll: true });
    });
    document.addEventListener("keydown", onKey);
    document.addEventListener("keyup", onKey);
    document.addEventListener("farbe-geaendert", draw);

    // Für Tests
    canvas.__tt = function () { return { S: S, target: target, net: net, online: online }; };

    newMatch();
    raf = requestAnimationFrame(frame);
    canvas.focus({ preventScroll: true });          // Tasten (Leertaste, Pfeile, 1 bis 3) gehen sofort an das Spiel

    return function stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      clearTimeout(nextTimer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("keyup", onKey);
      document.removeEventListener("farbe-geaendert", draw);
      leaveNet();
    };
  }

  return { id: "tischtennis", name: "Tischtennis", start: start, _engine: { plan: plan, simulate: simulate, advance: advance, bounce: bounce, NETX: NETX, NETH: NETH, R: R, G: G } };
})());

;
// ===== flaggenraten.js =====
// © 2026 BlaueQualle. Alle Rechte vorbehalten.
// Spiel: Flaggenraten (alle Länder, Namen eintippen, nach 3 Fehlversuchen kommt die 4er-Auswahl)
(function () {
  "use strict";

  var ROUNDS = 10, TRIES = 3, LEVEL_KEY = "flaggen-level";

  // ---------- Flaggen zeichnen (Bild 30 x 20) ----------
  function f(x) { return +x.toFixed(3); }
  function R(x, y, w, h, c) { return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '" fill="' + c + '"/>'; }
  function C(x, y, r, c) { return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + c + '"/>'; }
  function CS(x, y, r, c, w) { return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="none" stroke="' + c + '" stroke-width="' + w + '"/>'; }
  function L(x1, y1, x2, y2, w, c) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="' + w + '"/>'; }
  function P(pts, c) { return '<polygon points="' + pts + '" fill="' + c + '"/>'; }
  function PATH(d, fill, stroke, w) { return '<path d="' + d + '" fill="' + fill + '"' + (stroke ? ' stroke="' + stroke + '" stroke-width="' + w + '"' : "") + "/>"; }
  function sum(a) { return a.reduce(function (s, v) { return s + v; }, 0); }
  function hs(cols, ws) {
    ws = ws || cols.map(function () { return 1; });
    var t = sum(ws), y = 0, o = "";
    cols.forEach(function (c, i) { var h = 20 * ws[i] / t; o += R(0, y, 30, h + 0.05, c); y += h; });
    return o;
  }
  function vs(cols, ws) {
    ws = ws || cols.map(function () { return 1; });
    var t = sum(ws), x = 0, o = "";
    cols.forEach(function (c, i) { var w = 30 * ws[i] / t; o += R(x, 0, w + 0.05, 20, c); x += w; });
    return o;
  }
  function S(cx, cy, r, n, fill, rot, ratio) {
    var pts = [], k, a, rr;
    ratio = ratio || 0.382;
    for (k = 0; k < 2 * n; k++) {
      a = (rot || 0) - Math.PI / 2 + k * Math.PI / n;
      rr = k % 2 ? r * ratio : r;
      pts.push(f(cx + rr * Math.cos(a)) + "," + f(cy + rr * Math.sin(a)));
    }
    return P(pts.join(" "), fill);
  }
  function pent(cx, cy, r, c, w) {          // Pentagramm aus Linien
    var order = [0, 2, 4, 1, 3], pts = order.map(function (k) {
      var a = -Math.PI / 2 + k * 2 * Math.PI / 5;
      return f(cx + r * Math.cos(a)) + "," + f(cy + r * Math.sin(a));
    });
    return '<polygon points="' + pts.join(" ") + '" fill="none" stroke="' + c + '" stroke-width="' + w + '" stroke-linejoin="miter"/>';
  }
  function uj() {
    return R(0, 0, 30, 20, "#012169") + L(0, 0, 30, 20, 3.6, "#fff") + L(30, 0, 0, 20, 3.6, "#fff") +
      L(0, 0, 30, 20, 1.4, "#c8102e") + L(30, 0, 0, 20, 1.4, "#c8102e") +
      R(12, 0, 6, 20, "#fff") + R(0, 7, 30, 6, "#fff") + R(13, 0, 4, 20, "#c8102e") + R(0, 8, 30, 4, "#c8102e");
  }
  function tri(cx, cy, rot, pat) {
    var o = '<g transform="translate(' + cx + " " + cy + ") rotate(" + rot + ')" fill="#000">', k;
    for (k = 0; k < 3; k++) {
      var y = -2.1 + k * 1.5;
      if (pat.charAt(k) === "s") o += '<rect x="-2.2" y="' + y + '" width="4.4" height="0.9"/>';
      else o += '<rect x="-2.2" y="' + y + '" width="1.9" height="0.9"/><rect x="0.3" y="' + y + '" width="1.9" height="0.9"/>';
    }
    return o + "</g>";
  }
  function maple() {
    var h = [[0, -5], [0.9, -3.2], [1.9, -3.7], [1.6, -1.3], [3.9, -2.4], [3.4, -0.4], [4.7, 0.5], [2.4, 2.6], [2.8, 3.7], [0.5, 3.3], [0.5, 5.2]], pts = [], i;
    h.forEach(function (p) { pts.push(f(15 + p[0]) + "," + f(10 + p[1])); });
    for (i = h.length - 2; i >= 1; i--) pts.push(f(15 - h[i][0]) + "," + f(10 + h[i][1]));
    return P(pts.join(" "), "#d52b1e");
  }
  function usa() {
    var o = "", i, r, c;
    for (i = 0; i < 13; i++) o += R(0, i * 20 / 13, 30, 20 / 13 + 0.05, i % 2 ? "#fff" : "#b22234");
    o += R(0, 0, 12, 20 * 7 / 13, "#3c3b6e");
    for (r = 0; r < 9; r++) for (c = 0; c < (r % 2 ? 5 : 6); c++) o += C((r % 2 ? 2 : 1) + c * 2, 0.9 + r * 1.1, 0.34, "#fff");
    return o;
  }

  var E = true;   // E = bekannte (leichte) Flagge
  var DRAWN_LIST = [
    { n: "Deutschland", e: E, g: hs(["#000", "#dd0000", "#ffce00"]) },
    { n: "Frankreich", e: E, g: vs(["#0055a4", "#fff", "#ef4135"]) },
    { n: "Italien", e: E, g: vs(["#009246", "#fff", "#ce2b37"]) },
    { n: "Spanien", e: E, g: hs(["#aa151b", "#f1bf00", "#aa151b"], [1, 2, 1]) },
    { n: "Japan", e: E, g: R(0, 0, 30, 20, "#fff") + C(15, 10, 6, "#bc002d") },
    { n: "China", e: E, g: R(0, 0, 30, 20, "#de2910") + S(5, 5, 3, 5, "#ffde00") + [[10, 2], [12, 4], [12, 7], [10, 9]].map(function (p) { return S(p[0], p[1], 1, 5, "#ffde00", Math.atan2(5 - p[1], 5 - p[0]) + Math.PI / 2); }).join("") },
    { n: "USA", e: E, g: usa() },
    { n: "Vereinigtes Königreich", e: E, g: uj() },
    { n: "Brasilien", e: E, g: R(0, 0, 30, 20, "#009b3a") + P("15,2 27,10 15,18 3,10", "#fedf00") + C(15, 10, 4.2, "#002776") + PATH("M10.9,9 Q15,7.4 19.1,11.2", "none", "#fff", 0.7) },
    { n: "Kanada", e: E, g: vs(["#d52b1e", "#fff", "#d52b1e"], [1, 2, 1]) + maple() },
    { n: "Schweiz", e: E, g: R(0, 0, 30, 20, "#d52b1e") + R(13, 4, 4, 12, "#fff") + R(9, 8, 12, 4, "#fff") },
    { n: "Niederlande", e: E, g: hs(["#ae1c28", "#fff", "#21468b"]) },
    { n: "Schweden", e: E, g: R(0, 0, 30, 20, "#006aa7") + R(9, 0, 3.5, 20, "#fecc00") + R(0, 8.25, 30, 3.5, "#fecc00") },
    { n: "Norwegen", e: E, g: R(0, 0, 30, 20, "#ba0c2f") + R(8, 0, 6, 20, "#fff") + R(0, 7, 30, 6, "#fff") + R(9.5, 0, 3, 20, "#00205b") + R(0, 8.5, 30, 3, "#00205b") },
    { n: "Dänemark", e: E, g: R(0, 0, 30, 20, "#c8102e") + R(9, 0, 3, 20, "#fff") + R(0, 8.5, 30, 3, "#fff") },
    { n: "Österreich", e: E, g: hs(["#ed2939", "#fff", "#ed2939"]) },
    { n: "Polen", e: E, g: hs(["#fff", "#dc143c"]) },
    { n: "Russland", e: E, g: hs(["#fff", "#0039a6", "#d52b1e"]) },
    { n: "Türkei", e: E, g: R(0, 0, 30, 20, "#e30a17") + C(11, 10, 5, "#fff") + C(12.4, 10, 4, "#e30a17") + S(16.3, 10, 2.4, 5, "#fff", Math.PI / 2 - 0.3) },
    { n: "Indien", e: E, g: hs(["#ff9933", "#fff", "#138808"]) + CS(15, 10, 2.5, "#000080", 0.4) + C(15, 10, 0.5, "#000080") },
    { n: "Mexiko", e: E, g: vs(["#006847", "#fff", "#ce1126"]) + C(15, 10, 2.3, "#8c6a3a") + C(15, 10, 1.5, "#4f8a3a") },
    { n: "Griechenland", e: E, g: (function () { var o = "", i; for (i = 0; i < 9; i++) o += R(0, i * 20 / 9, 30, 20 / 9 + 0.05, i % 2 ? "#fff" : "#0d5eaf"); return o + R(0, 0, 100 / 9, 100 / 9, "#0d5eaf") + R(40 / 9, 0, 20 / 9, 100 / 9, "#fff") + R(0, 40 / 9, 100 / 9, 20 / 9, "#fff"); })() },
    { n: "Argentinien", e: E, g: hs(["#74acdf", "#fff", "#74acdf"]) + C(15, 10, 1.9, "#f6b40e") },
    { n: "Irland", e: E, g: vs(["#169b62", "#fff", "#ff883e"]) },
    { n: "Portugal", e: E, g: R(0, 0, 12, 20, "#006600") + R(12, 0, 18, 20, "#ff0000") + C(12, 10, 3.4, "#ffcc00") + C(12, 10, 2.2, "#ff0000") + R(10.8, 8.8, 2.4, 2.4, "#fff") },
    { n: "Belgien", e: E, g: vs(["#000", "#fae042", "#ed2939"]) },
    { n: "Ukraine", e: E, g: hs(["#0057b7", "#ffd700"]) },
    { n: "Australien", e: E, g: R(0, 0, 30, 20, "#00247d") + '<g transform="scale(0.5)">' + uj() + "</g>" + S(7.5, 15.2, 2.5, 7, "#fff", 0, 0.5) + S(22, 3.4, 1.3, 7, "#fff", 0, 0.5) + S(25.6, 7.6, 1.3, 7, "#fff", 0, 0.5) + S(22, 16.2, 1.3, 7, "#fff", 0, 0.5) + S(18.4, 9.6, 1.3, 7, "#fff", 0, 0.5) + S(24, 11.6, 0.8, 5, "#fff") },
    { n: "Neuseeland", g: R(0, 0, 30, 20, "#00247d") + '<g transform="scale(0.5)">' + uj() + "</g>" + [[22.5, 4.5], [19.5, 8.8], [25.5, 8.8], [22.5, 15]].map(function (p) { return S(p[0], p[1], 1.9, 5, "#fff") + S(p[0], p[1], 1.4, 5, "#cc142b"); }).join("") },
    { n: "Ungarn", g: hs(["#ce2939", "#fff", "#477050"]) },
    { n: "Luxemburg", g: hs(["#ed2939", "#fff", "#00a1de"]) },
    { n: "Bulgarien", g: hs(["#fff", "#00966e", "#d62612"]) },
    { n: "Estland", g: hs(["#0072ce", "#000", "#fff"]) },
    { n: "Litauen", g: hs(["#fdb913", "#006a44", "#c1272d"]) },
    { n: "Lettland", g: hs(["#9e3039", "#fff", "#9e3039"], [2, 1, 2]) },
    { n: "Rumänien", g: vs(["#002b7f", "#fcd116", "#ce1126"]) },
    { n: "Nigeria", g: vs(["#008751", "#fff", "#008751"]) },
    { n: "Bangladesch", g: R(0, 0, 30, 20, "#006a4e") + C(13.5, 10, 6, "#f42a41") },
    { n: "Finnland", g: R(0, 0, 30, 20, "#fff") + R(8, 0, 4.5, 20, "#003580") + R(0, 7.75, 30, 4.5, "#003580") },
    { n: "Island", g: R(0, 0, 30, 20, "#02529c") + R(8, 0, 4, 20, "#fff") + R(0, 8, 30, 4, "#fff") + R(9, 0, 2, 20, "#dc1e35") + R(0, 9, 30, 2, "#dc1e35") },
    { n: "Tschechien", g: hs(["#fff", "#d7141a"]) + P("0,0 15,10 0,20", "#11457e") },
    { n: "Ägypten", g: hs(["#ce1126", "#fff", "#000"]) + C(15, 10, 1.7, "#c09300") },
    { n: "Marokko", g: R(0, 0, 30, 20, "#c1272d") + pent(15, 10.4, 4.6, "#006233", 0.7) },
    { n: "Pakistan", g: R(0, 0, 30, 20, "#01411c") + R(0, 0, 7.5, 20, "#fff") + C(19, 10, 5, "#fff") + C(20.4, 9.2, 4.2, "#01411c") + S(23.2, 7.6, 1.8, 5, "#fff", 0.5) },
    { n: "Israel", g: R(0, 0, 30, 20, "#fff") + R(0, 2, 30, 2.4, "#0038b8") + R(0, 15.6, 30, 2.4, "#0038b8") + '<polygon points="15,5.9 18.6,12.1 11.4,12.1" fill="none" stroke="#0038b8" stroke-width="0.7"/><polygon points="15,14.1 11.4,7.9 18.6,7.9" fill="none" stroke="#0038b8" stroke-width="0.7"/>' },
    { n: "Vietnam", g: R(0, 0, 30, 20, "#da251d") + S(15, 10.4, 5.6, 5, "#ffff00") },
    { n: "Thailand", g: hs(["#a51931", "#f4f5f8", "#2d2a4a", "#f4f5f8", "#a51931"], [1, 1, 2, 1, 1]) },
    { n: "Kolumbien", g: hs(["#fcd116", "#003893", "#ce1126"], [2, 1, 1]) },
    { n: "Peru", g: vs(["#d91023", "#fff", "#d91023"]) },
    { n: "Chile", g: hs(["#fff", "#d52b1e"]) + R(0, 0, 10, 10, "#0039a6") + S(5, 5, 3, 5, "#fff") },
    { n: "Kuba", g: hs(["#002a8f", "#fff", "#002a8f", "#fff", "#002a8f"]) + P("0,0 13,10 0,20", "#cf142b") + S(4.3, 10.2, 2.7, 5, "#fff") },
    { n: "Ghana", g: hs(["#ce1126", "#fcd116", "#006b3f"]) + S(15, 10.5, 3.1, 5, "#000") },
    { n: "Jamaika", g: R(0, 0, 30, 20, "#000") + P("0,0 30,0 15,10", "#009b3a") + P("0,20 30,20 15,10", "#009b3a") + L(0, 0, 30, 20, 2.6, "#fed100") + L(30, 0, 0, 20, 2.6, "#fed100") },
    { n: "Singapur", g: hs(["#ef3340", "#fff"]) + C(6.8, 5, 3.3, "#fff") + C(8.2, 5, 3, "#ef3340") + [0, 1, 2, 3, 4].map(function (k) { var a = -Math.PI / 2 + k * 2 * Math.PI / 5; return S(12.6 + 2.2 * Math.cos(a), 5 + 2.2 * Math.sin(a), 0.85, 5, "#fff", a + Math.PI / 2); }).join("") },
    { n: "Indonesien", g: hs(["#ff0000", "#fff"]) },
    { n: "Kroatien", g: hs(["#ff0000", "#fff", "#171796"]) + R(13, 6.2, 4, 5, "#fff") + (function () { var o = "", r, c; for (r = 0; r < 4; r++) for (c = 0; c < 3; c++) if ((r + c) % 2 === 0) o += R(13 + c * 1.333, 6.2 + r * 1.25, 1.333, 1.25, "#ff0000"); return o; })() },
    { n: "Katar", g: R(0, 0, 30, 20, "#8a1538") + (function () { var pts = ["0,0", "8,0"], i; for (i = 0; i < 9; i++) pts.push("11," + f(i * 20 / 9 + 10 / 9), "8," + f((i + 1) * 20 / 9)); pts.push("0,20"); return P(pts.join(" "), "#fff"); })() },
    { n: "Philippinen", g: R(0, 0, 30, 10, "#0038a8") + R(0, 10, 30, 10, "#ce1126") + P("0,0 17,10 0,20", "#fff") + C(5, 10, 2.1, "#fcd116") },
    { n: "Südkorea", g: R(0, 0, 30, 20, "#fff") + C(15, 10, 4.2, "#cd2e3a") + PATH("M10.8,10 A4.2,4.2 0 0 0 19.2,10 Z", "#0047a0") + C(12.9, 10, 2.1, "#cd2e3a") + C(17.1, 10, 2.1, "#0047a0") + tri(5.6, 4.2, -56, "sss") + tri(24.4, 4.2, 56, "bsb") + tri(5.6, 15.8, -124, "sbs") + tri(24.4, 15.8, 124, "bbb") },
    { n: "Bolivien", g: hs(["#d52b1e", "#f9e300", "#007934"]) },
    { n: "Venezuela", g: hs(["#ffcc00", "#00247d", "#cf142b"]) + (function () { var o = "", k; for (k = 0; k < 8; k++) { var a = Math.PI + 0.45 + k * (Math.PI - 0.9) / 7; o += C(15 + 6.2 * Math.cos(a), 13.2 + 6.2 * Math.sin(a), 0.5, "#fff"); } return o; })() },
    { n: "Armenien", g: hs(["#d90012", "#0033a0", "#f2a800"]) },
    { n: "Senegal", g: vs(["#00853f", "#fdef42", "#e31b23"]) + S(15, 10.4, 3.2, 5, "#00853f") },
    { n: "Kamerun", g: vs(["#007a5e", "#ce1126", "#fcd116"]) + S(15, 10.4, 3.2, 5, "#fcd116") },
    { n: "Mali", g: vs(["#14b53a", "#fcd116", "#ce1126"]) },
    { n: "Sierra Leone", g: hs(["#1eb53a", "#fff", "#0072c6"]) },
    { n: "Gabun", g: hs(["#009e60", "#fcd116", "#3a75c4"]) },
    { n: "Elfenbeinküste", g: vs(["#f77f00", "#fff", "#009e60"]) }
  ];

  // ---------- alle Länder (Flagge = Emoji-Flagge des Geräts, sonst gezeichneter Rückfall) ----------
  var RAW = "AL|Albanien||eu\nAD|Andorra||eu\nBE|Belgien||eu|1\nBA|Bosnien und Herzegowina|Bosnien;Bosnien-Herzegowina|eu\nBG|Bulgarien||eu\nDK|Dänemark|Daenemark|eu|1\nDE|Deutschland|BRD|eu|1\nEE|Estland||eu\nFI|Finnland||eu|1\nFR|Frankreich||eu|1\nGR|Griechenland||eu|1\nIE|Irland||eu|1\nIS|Island||eu|1\nIT|Italien||eu|1\nXK|Kosovo||eu\nHR|Kroatien||eu\nLV|Lettland||eu\nLI|Liechtenstein||eu\nLT|Litauen||eu\nLU|Luxemburg||eu\nMT|Malta||eu\nMD|Moldau|Moldawien;Moldova|eu\nMC|Monaco||eu\nME|Montenegro||eu\nNL|Niederlande|Holland|eu|1\nMK|Nordmazedonien|Mazedonien|eu\nNO|Norwegen||eu|1\nAT|Österreich|Oesterreich|eu|1\nPL|Polen||eu|1\nPT|Portugal||eu|1\nRO|Rumänien|Rumaenien|eu\nRU|Russland|Russische Föderation|eu|1\nSM|San Marino||eu\nSE|Schweden||eu|1\nCH|Schweiz||eu|1\nRS|Serbien||eu\nSK|Slowakei||eu\nSI|Slowenien||eu\nES|Spanien||eu|1\nCZ|Tschechien|Tschechische Republik;Tschechei|eu\nUA|Ukraine||eu|1\nHU|Ungarn||eu\nVA|Vatikanstadt|Vatikan|eu\nGB|Vereinigtes Königreich|Großbritannien;Grossbritannien;England;UK;Vereinigtes Koenigreich;Britain|eu|1\nBY|Belarus|Weißrussland;Weissrussland|eu\nCY|Zypern||eu\nAF|Afghanistan||as\nAM|Armenien||as\nAZ|Aserbaidschan||as\nBH|Bahrain||as\nBD|Bangladesch|Bangladesh|as\nBT|Bhutan||as\nBN|Brunei||as\nCN|China|Volksrepublik China|as|1\nGE|Georgien||as\nIN|Indien||as|1\nID|Indonesien||as\nIQ|Irak||as\nIR|Iran||as\nIL|Israel||as\nJP|Japan||as|1\nYE|Jemen||as\nJO|Jordanien||as\nKH|Kambodscha||as\nKZ|Kasachstan||as\nQA|Katar|Qatar|as\nKG|Kirgisistan|Kirgistan|as\nKW|Kuwait||as\nLA|Laos||as\nLB|Libanon||as\nMY|Malaysia||as\nMV|Malediven||as\nMN|Mongolei||as\nMM|Myanmar|Birma|as\nNP|Nepal||as\nKP|Nordkorea||as\nOM|Oman||as\nPK|Pakistan||as\nPS|Palästina|Palaestina|as\nPH|Philippinen||as\nSA|Saudi-Arabien|Saudi Arabien|as\nSG|Singapur||as\nLK|Sri Lanka||as\nSY|Syrien||as\nTJ|Tadschikistan||as\nTW|Taiwan||as\nTH|Thailand||as\nTL|Osttimor|Timor-Leste;Timor Leste|as\nTR|Türkei|Tuerkei|as|1\nTM|Turkmenistan||as\nAE|Vereinigte Arabische Emirate|VAE;Emirate|as\nUZ|Usbekistan||as\nVN|Vietnam||as\nKR|Südkorea|Suedkorea;Korea|as|1\nEG|Ägypten|Aegypten|af|1\nGQ|Äquatorialguinea|Aequatorialguinea|af\nET|Äthiopien|Aethiopien|af\nDZ|Algerien||af\nAO|Angola||af\nBJ|Benin||af\nBW|Botsuana|Botswana|af\nBF|Burkina Faso||af\nBI|Burundi||af\nDJ|Dschibuti|Djibouti|af\nCI|Elfenbeinküste|Elfenbeinkueste;Côte d'Ivoire;Cote d'Ivoire|af\nER|Eritrea||af\nSZ|Eswatini|Swasiland|af\nGA|Gabun||af\nGM|Gambia||af\nGH|Ghana||af\nGN|Guinea||af\nGW|Guinea-Bissau|Guinea Bissau|af\nCM|Kamerun||af\nCV|Kap Verde|Cabo Verde;Kapverden|af\nKE|Kenia||af\nKM|Komoren||af\nCG|Kongo|Republik Kongo;Kongo-Brazzaville|af\nCD|Demokratische Republik Kongo|DR Kongo;Kongo-Kinshasa;DRK|af\nLS|Lesotho||af\nLR|Liberia||af\nLY|Libyen||af\nMG|Madagaskar||af\nMW|Malawi||af\nML|Mali||af\nMA|Marokko||af\nMR|Mauretanien||af\nMU|Mauritius||af\nMZ|Mosambik||af\nNA|Namibia||af\nNE|Niger||af\nNG|Nigeria||af\nRW|Ruanda||af\nZM|Sambia||af\nST|São Tomé und Príncipe|Sao Tome und Principe;Sao Tome|af\nSN|Senegal||af\nSC|Seychellen||af\nSL|Sierra Leone||af\nZW|Simbabwe||af\nSO|Somalia||af\nZA|Südafrika|Suedafrika|af|1\nSS|Südsudan|Suedsudan|af\nSD|Sudan||af\nTZ|Tansania||af\nTG|Togo||af\nTD|Tschad||af\nTN|Tunesien||af\nUG|Uganda||af\nCF|Zentralafrikanische Republik|ZAR|af\nAG|Antigua und Barbuda||am\nAR|Argentinien||am|1\nBS|Bahamas||am\nBB|Barbados||am\nBZ|Belize||am\nBO|Bolivien||am\nBR|Brasilien||am|1\nCL|Chile||am\nCR|Costa Rica||am\nDM|Dominica||am\nDO|Dominikanische Republik||am\nEC|Ecuador||am\nSV|El Salvador||am\nGD|Grenada||am\nGT|Guatemala||am\nGY|Guyana||am\nHT|Haiti||am\nHN|Honduras||am\nJM|Jamaika||am\nCA|Kanada||am|1\nCO|Kolumbien||am\nCU|Kuba||am\nMX|Mexiko||am|1\nNI|Nicaragua||am\nPA|Panama||am\nPY|Paraguay||am\nPE|Peru||am\nKN|St. Kitts und Nevis|Sankt Kitts und Nevis;Saint Kitts und Nevis|am\nLC|St. Lucia|Sankt Lucia;Saint Lucia|am\nVC|St. Vincent und die Grenadinen|Sankt Vincent und die Grenadinen;Saint Vincent und die Grenadinen|am\nSR|Suriname||am\nTT|Trinidad und Tobago||am\nUY|Uruguay||am\nUS|USA|Vereinigte Staaten;Vereinigte Staaten von Amerika;Amerika;United States|am|1\nVE|Venezuela||am\nAU|Australien||oc|1\nFJ|Fidschi|Fiji|oc\nKI|Kiribati||oc\nMH|Marshallinseln||oc\nFM|Mikronesien||oc\nNR|Nauru||oc\nNZ|Neuseeland||oc|1\nPW|Palau||oc\nPG|Papua-Neuguinea|Papua Neuguinea|oc\nWS|Samoa||oc\nSB|Salomonen|Salomoninseln|oc\nTO|Tonga||oc\nTV|Tuvalu||oc\nVU|Vanuatu||oc";
  var DRAWN = {};
  DRAWN_LIST.forEach(function (d) { DRAWN[d.n] = '<svg viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Flagge">' + d.g + "</svg>"; });

  function emojiOf(code) { return String.fromCodePoint(0x1F1E6 + code.charCodeAt(0) - 65, 0x1F1E6 + code.charCodeAt(1) - 65); }
  function norm(s) {
    return String(s).toLowerCase().replace(/ß/g, "ss").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u").replace(/[^a-z0-9]/g, "");
  }
  var COUNTRIES = RAW.split("\n").filter(Boolean).map(function (line) {
    var p = line.split("|"), names = [p[1]].concat(p[2] ? p[2].split(";") : []);
    return { code: p[0], n: p[1], names: names, keys: names.map(norm), r: p[3], e: p[4] === "1", emoji: emojiOf(p[0]), svg: DRAWN[p[1]] || "" };
  });
  var ALLKEYS = {};
  COUNTRIES.forEach(function (c) { c.keys.forEach(function (k) { (ALLKEYS[k] = ALLKEYS[k] || []).push(c); }); });

  function lev(a, b) {
    var m = a.length, n = b.length, d = [], i, j;
    for (i = 0; i <= m; i++) { d[i] = [i]; }
    for (j = 1; j <= n; j++) d[0][j] = j;
    for (i = 1; i <= m; i++) for (j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
    return d[m][n];
  }
  // Richtig, wenn der Name (oder eine andere Schreibweise) stimmt. Ein kleiner Tippfehler ist erlaubt,
  // aber nur, wenn die Eingabe nicht genau der Name eines anderen Landes ist (z. B. Irland / Island).
  function isRight(input, c) {
    var v = norm(input), i, hit;
    if (!v) return false;
    if (c.keys.indexOf(v) >= 0) return true;
    hit = ALLKEYS[v];
    if (hit && hit.length) return false;
    for (i = 0; i < c.keys.length; i++) if (c.keys[i].length >= 6 && lev(v, c.keys[i]) <= 1) return true;
    return false;
  }

  var emojiState = null;
  function emojiOk() {          // zeigt das Gerät echte Flaggen? (Windows zeigt oft nur Buchstaben)
    if (emojiState !== null) return emojiState;
    emojiState = false;
    try {
      var cv = document.createElement("canvas"), x, d, i;
      cv.width = 64; cv.height = 40;
      x = cv.getContext("2d");
      x.textBaseline = "top";
      x.font = "32px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
      x.fillText(emojiOf("DE"), 2, 2);
      d = x.getImageData(0, 0, 64, 40).data;
      for (i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] > 180 && d[i + 1] < 70 && d[i + 2] < 70) { emojiState = true; break; }
    } catch (e) {}
    return emojiState;
  }

  var POOLS = [["leicht", "Leicht"], ["alle", "Alle Länder"], ["eu", "Europa"], ["as", "Asien"], ["af", "Afrika"], ["am", "Amerika"], ["oc", "Ozeanien"]];
  var BEST_KEY = { leicht: "flaggen-best-leicht", alle: "flaggen-best-alle", eu: "flaggen-best-europa", as: "flaggen-best-asien", af: "flaggen-best-afrika", am: "flaggen-best-amerika", oc: "flaggen-best-ozeanien" };

  function shuffle(a) {
    var b = a.slice(), i, j, t;
    for (i = b.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = b[i]; b[i] = b[j]; b[j] = t; }
    return b;
  }
  function getNum(k) { try { var v = parseInt(localStorage.getItem(k), 10); return v > 0 ? v : 0; } catch (e) { return 0; } }
  function setNum(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) {} }
  function getLevel() {
    try { var l = localStorage.getItem(LEVEL_KEY); if (BEST_KEY[l]) return l; } catch (e) {}
    return "leicht";
  }
  function poolFor(level, real) {
    var list = COUNTRIES.filter(function (c) {
      if (level === "leicht") return c.e;
      if (level === "alle") return true;
      return c.r === level;
    });
    return real ? list : list.filter(function (c) { return c.svg; });
  }
  function makeQuestions(level, real) {
    var pool = poolFor(level, real);
    return shuffle(pool).slice(0, ROUNDS).map(function (c) { return { c: c, tries: 0, choice: false, opts: null }; });
  }
  function optionsFor(c, level, real) {
    var pool = poolFor(level, real).filter(function (x) { return x !== c; }), all = real ? COUNTRIES : COUNTRIES.filter(function (x) { return x.svg; });
    var same = shuffle(pool.filter(function (x) { return x.r === c.r; })), rest = shuffle(all.filter(function (x) { return x !== c && same.indexOf(x) < 0; }));
    var picked = same.slice(0, 3);
    if (picked.length < 3) picked = picked.concat(shuffle(pool.filter(function (x) { return picked.indexOf(x) < 0; })).slice(0, 3 - picked.length));
    if (picked.length < 3) picked = picked.concat(rest.slice(0, 3 - picked.length));
    return shuffle(picked.concat([c]));
  }

  function addStyle() {
    if (document.getElementById("flaggen-css")) return;
    var st = document.createElement("style");
    st.id = "flaggen-css";
    st.textContent =
      ".fl{max-width:26rem}.fl-modes{display:flex;gap:.4rem;flex-wrap:wrap;margin:0 0 1rem}.fl-modes .chip{padding:.45rem .8rem;font-size:.9rem}" +
      ".fl-head{display:flex;justify-content:space-between;gap:.5rem;color:var(--muted);font-size:.9rem;margin:0 0 .6rem;font-variant-numeric:tabular-nums}" +
      ".fl-flag{display:flex;align-items:center;justify-content:center;border-radius:.9rem;overflow:hidden;background:var(--panel);line-height:1;aspect-ratio:3/2;box-shadow:0 0 0 1px var(--line),0 14px 30px -16px color-mix(in srgb,var(--accent) 60%,transparent)}" +
      ".fl-flag svg{display:block;width:100%;height:100%}" +
      ".fl-emoji{font-size:min(34vw,9.5rem);font-family:'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;line-height:1}" +
      ".fl-hint{margin:.8rem 0 .4rem;color:var(--muted);font-size:.9rem}" +
      ".fl-form{display:flex;gap:.5rem;flex-wrap:wrap}.fl-form input{flex:1 1 11rem;min-width:0;font-size:1.05rem}" +
      ".fl-help{margin-top:.3rem}" +
      ".fl-ans{display:grid;grid-template-columns:1fr 1fr;gap:.6rem;margin:1rem 0 .4rem}" +
      ".fl-ans button{background:var(--panel);background-image:none;color:var(--ink);border:1px solid var(--line);padding:.8rem .5rem;font-size:.95rem;line-height:1.25;min-height:3.2rem}" +
      ".fl-ans button.ok{background:#1f8a5b;border-color:#1f8a5b;color:#fff}" +
      ".fl-ans button.no{background:#c62f3a;border-color:#c62f3a;color:#fff}" +
      ".fl-ans button.dim{opacity:.55}" +
      ".fl-res{text-align:center;padding:1.2rem 1rem;border-radius:1.1rem;background:var(--panel);border:1px solid var(--line);margin:0 0 1rem}" +
      ".fl-big{font-family:var(--serif);font-size:3rem;line-height:1.1;margin:0}.fl-res p{margin:.3rem 0}";
    document.head.appendChild(st);
  }

  function start(box) {
    addStyle();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    var real = emojiOk(), level = getLevel(), qs = [], qi = 0, score = 0, typed = 0, locked = false, over = false, timer = 0, stopped = false;
    var root = document.createElement("div"), modes = document.createElement("div"), head = document.createElement("div"),
      flagBox = document.createElement("div"), hint = document.createElement("p"), form = document.createElement("form"),
      input = document.createElement("input"), checkBtn = document.createElement("button"), helpBtn = document.createElement("button"),
      ans = document.createElement("div"), msg = document.createElement("p"), nextBtn = document.createElement("button"), res = document.createElement("div");
    root.className = "fl"; modes.className = "fl-modes"; head.className = "fl-head"; flagBox.className = "fl-flag";
    hint.className = "fl-hint"; form.className = "fl-form"; ans.className = "fl-ans"; msg.className = "msg"; res.className = "fl-res";
    msg.setAttribute("aria-live", "polite");
    input.type = "text"; input.setAttribute("aria-label", "Name des Landes"); input.placeholder = "Name des Landes";
    input.autocomplete = "off"; input.spellcheck = false; input.setAttribute("autocapitalize", "none"); input.setAttribute("autocorrect", "off"); input.maxLength = 40;
    checkBtn.type = "submit"; checkBtn.textContent = "Prüfen";
    helpBtn.type = "button"; helpBtn.className = "link fl-help"; helpBtn.textContent = "Ich weiß es nicht (Auswahl zeigen)";
    nextBtn.type = "button"; nextBtn.hidden = true; res.hidden = true; ans.hidden = true;
    form.appendChild(input); form.appendChild(checkBtn);
    var modeBtns = {};
    POOLS.forEach(function (m) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = m[1];
      b.setAttribute("aria-pressed", String(m[0] === level));
      b.addEventListener("click", function () { level = m[0]; try { localStorage.setItem(LEVEL_KEY, level); } catch (e) {} newGame(); });
      modes.appendChild(b); modeBtns[m[0]] = b;
    });
    [modes, head, flagBox, hint, form, helpBtn, ans, msg, nextBtn, res].forEach(function (x) { root.appendChild(x); });
    box.appendChild(root);

    function maxPoints() { return ROUNDS * 2; }
    function renderHead() {
      head.textContent = "";
      [over ? "Fertig" : "Frage " + (qi + 1) + " von " + ROUNDS, "Punkte: " + score, "Rekord: " + getNum(BEST_KEY[level]) + " von " + maxPoints()].forEach(function (t) {
        var s = document.createElement("span"); s.textContent = t; head.appendChild(s);
      });
    }

    function newGame() {
      clearTimeout(timer);
      qs = makeQuestions(level, real); qi = 0; score = 0; typed = 0; locked = false; over = false;
      Object.keys(modeBtns).forEach(function (k) { modeBtns[k].setAttribute("aria-pressed", String(k === level)); });
      res.hidden = true; flagBox.hidden = false;
      show();
    }

    function show() {
      var q = qs[qi];
      locked = false;
      nextBtn.hidden = true; ans.hidden = true; ans.textContent = "";
      form.hidden = false; helpBtn.hidden = false; input.value = "";
      if (real) { flagBox.textContent = ""; var sp = document.createElement("span"); sp.className = "fl-emoji"; sp.setAttribute("role", "img"); sp.setAttribute("aria-label", "Flagge"); sp.textContent = q.c.emoji; flagBox.appendChild(sp); }
      else flagBox.innerHTML = q.c.svg;
      hint.textContent = "Tippe den Namen des Landes ein. Du hast " + TRIES + " Versuche.";
      msg.textContent = real ? "" : "Dein Gerät zeigt keine Emoji-Flaggen, deshalb sind hier nur " + poolFor("alle", false).length + " gezeichnete Flaggen dabei.";
      msg.className = "msg";
      renderHead();
      try { input.focus(); } catch (e) {}
    }

    function lock() { locked = true; form.hidden = true; helpBtn.hidden = true; }

    function done(ok, text) {
      lock();
      msg.textContent = text;
      msg.className = "msg" + (ok ? "" : " error");
      renderHead();
      var last = qi === ROUNDS - 1;
      if (ok) timer = setTimeout(next, 1100);
      else { nextBtn.textContent = last ? "Ergebnis ansehen" : "Weiter"; nextBtn.hidden = false; nextBtn.focus(); }
    }

    function toChoice(text) {
      var q = qs[qi];
      q.choice = true;
      form.hidden = true; helpBtn.hidden = true;
      q.opts = optionsFor(q.c, level, real);
      ans.textContent = "";
      q.opts.forEach(function (o, i) {
        var b = document.createElement("button");
        b.type = "button"; b.textContent = o.n;
        b.addEventListener("click", function () { pickChoice(i); });
        ans.appendChild(b);
      });
      ans.hidden = false;
      hint.textContent = "Wähle das richtige Land aus (1 Punkt).";
      msg.textContent = text || "";
      msg.className = "msg";
    }

    function pickChoice(i) {
      var q = qs[qi];
      if (locked || over || stopped || !q.choice) return;
      var ok = q.opts[i] === q.c;
      Array.prototype.forEach.call(ans.querySelectorAll("button"), function (b, k) { b.className = q.opts[k] === q.c ? "ok" : k === i ? "no" : "dim"; });
      if (ok) score += 1;
      done(ok, ok ? "Richtig! Das ist " + q.c.n + "." : "Falsch. Das war " + q.c.n + ".");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var q = qs[qi], v = input.value.trim();
      if (locked || over || stopped || q.choice || !v) return;
      q.tries++;
      if (isRight(v, q.c)) { score += 2; typed++; done(true, "Richtig! Das ist " + q.c.n + "."); return; }
      if (q.tries >= TRIES) { toChoice("Leider " + TRIES + " Mal nicht richtig. Wähle jetzt aus 4 Ländern:"); return; }
      var left = TRIES - q.tries;
      msg.textContent = "Nicht richtig. Noch " + left + (left === 1 ? " Versuch." : " Versuche.");
      msg.className = "msg error";
      hint.textContent = "Versuch " + (q.tries + 1) + " von " + TRIES + ".";
      input.value = "";
      input.focus();
    });
    helpBtn.addEventListener("click", function () { if (!locked && !over) toChoice("Wähle aus 4 Ländern:"); });

    function next() {
      clearTimeout(timer);
      if (stopped || !locked) return;
      if (qi >= ROUNDS - 1) { finish(); return; }
      qi++;
      show();
    }
    nextBtn.addEventListener("click", next);

    function finish() {
      over = true;
      var prev = getNum(BEST_KEY[level]), record = score > prev;
      if (record) setNum(BEST_KEY[level], score);
      flagBox.hidden = true; ans.hidden = true; nextBtn.hidden = true; form.hidden = true; helpBtn.hidden = true; hint.textContent = "";
      msg.textContent = "";
      res.textContent = "";
      var big = document.createElement("p"), t1 = document.createElement("p"), t2 = document.createElement("p"), r = document.createElement("p"), again = document.createElement("button");
      big.className = "fl-big"; big.textContent = score + " von " + maxPoints() + " Punkten";
      big.style.fontSize = "2rem";
      t1.textContent = typed + " von " + ROUNDS + " Flaggen hast du selbst getippt.";
      t2.textContent = score >= 18 ? "Fantastisch! Du bist ein Flaggen-Profi." : score >= 14 ? "Sehr gut!" : score >= 8 ? "Gut gemacht." : "Übung macht den Meister.";
      r.textContent = record ? "Neuer Rekord!" : "Rekord: " + getNum(BEST_KEY[level]) + " von " + maxPoints();
      again.type = "button"; again.textContent = "Noch eine Runde";
      again.addEventListener("click", newGame);
      [big, t1, t2, r, again].forEach(function (x) { res.appendChild(x); });
      res.hidden = false;
      renderHead();
      again.focus();
    }

    function onKey(e) {
      if (stopped || !root.offsetParent) return;
      var tg = e.target && e.target.tagName;
      if (tg === "INPUT" || tg === "TEXTAREA" || e.ctrlKey || e.metaKey || e.altKey) return;
      var q = qs[qi];
      if (!over && !locked && q && q.choice && e.key >= "1" && e.key <= "4") { pickChoice(+e.key - 1); e.preventDefault(); }
      else if (!over && locked && (e.key === "Enter" || e.key === " ") && !nextBtn.hidden) { next(); e.preventDefault(); }
    }
    document.addEventListener("keydown", onKey);

    newGame();
    return function stop() {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }

  (window.Spiele = window.Spiele || []).push({
    id: "flaggenraten", name: "Flaggenraten", start: start,
    _engine: { COUNTRIES: COUNTRIES, isRight: isRight, norm: norm, makeQuestions: makeQuestions, emojiOk: emojiOk }
  });
})();

;
// ===== solitaer.js =====
// © 2026 BlaueQualle. Alle Rechte vorbehalten.
// Spiel: Solitär (Klondike): Karten per Ziehen oder Tippen bewegen, Zug zurück, Tipp, Spielstand bleibt erhalten
(function () {
  "use strict";

  var SAVE_KEY = "solitaer-save", BEST_KEY = "solitaer-best", DRAW_KEY = "solitaer-draw";
  var SUITS = ["♠", "♥", "♦", "♣"], RANKS = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "B", "D", "K"];

  // ---------- Spielregeln (ohne Oberfläche, gut testbar) ----------
  function suitOf(id) { return id % 4; }
  function rankOf(id) { return Math.floor(id / 4) + 1; }
  function isRed(id) { var s = suitOf(id); return s === 1 || s === 2; }

  function newState() {
    var ids = [], i, j, t, st = { stock: [], waste: [], found: [[], [], [], []], tab: [[], [], [], [], [], [], []], up: {} };
    for (i = 0; i < 52; i++) ids.push(i);
    for (i = ids.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = ids[i]; ids[i] = ids[j]; ids[j] = t; }
    for (i = 0; i < 7; i++) {
      for (j = 0; j <= i; j++) st.tab[i].push(ids.pop());
      st.up[st.tab[i][i]] = true;
    }
    st.stock = ids;
    return st;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function canFound(st, id) {            // darf diese (einzelne) Karte auf ihre Ablage?
    var f = st.found[suitOf(id)];
    return f.length === rankOf(id) - 1;
  }
  function canTab(st, id, col) {         // darf die Karte (oder der Stapel mit dieser obersten Karte) auf die Spalte?
    var pile = st.tab[col];
    if (!pile.length) return rankOf(id) === 13;
    var top = pile[pile.length - 1];
    return isRed(top) !== isRed(id) && rankOf(top) === rankOf(id) + 1;
  }
  function totalFound(st) { return st.found[0].length + st.found[1].length + st.found[2].length + st.found[3].length; }
  function allUp(st) {
    if (st.stock.length || st.waste.length) return false;
    for (var c = 0; c < 7; c++) for (var k = 0; k < st.tab[c].length; k++) if (!st.up[st.tab[c][k]]) return false;
    return true;
  }
  function validState(st) {
    try {
      var seen = {}, n = 0, all = [].concat(st.stock, st.waste, st.found[0], st.found[1], st.found[2], st.found[3]);
      for (var c = 0; c < 7; c++) all = all.concat(st.tab[c]);
      if (st.tab.length !== 7 || st.found.length !== 4) return false;
      for (var i = 0; i < all.length; i++) {
        if (typeof all[i] !== "number" || all[i] < 0 || all[i] > 51 || seen[all[i]]) return false;
        seen[all[i]] = true; n++;
      }
      return n === 52;
    } catch (e) { return false; }
  }
  // Alle möglichen Züge (für Tipp): { from: "w" | "t<col>" | "f<suit>", idx, to: "f" | "t<col>" }
  function listMoves(st) {
    var out = [], c, k, id, d;
    if (st.waste.length) {
      id = st.waste[st.waste.length - 1];
      if (canFound(st, id)) out.push({ from: "w", idx: st.waste.length - 1, to: "f" });
      for (d = 0; d < 7; d++) if (canTab(st, id, d)) out.push({ from: "w", idx: st.waste.length - 1, to: "t" + d });
    }
    for (c = 0; c < 7; c++) {
      var pile = st.tab[c];
      for (k = 0; k < pile.length; k++) {
        if (!st.up[pile[k]]) continue;
        id = pile[k];
        if (k === pile.length - 1 && canFound(st, id)) out.push({ from: "t" + c, idx: k, to: "f" });
        for (d = 0; d < 7; d++) {
          if (d === c || !canTab(st, id, d)) continue;
          if (rankOf(id) === 13 && k === 0) continue;       // König ganz unten in eine leere Spalte bringt nichts
          out.push({ from: "t" + c, idx: k, to: "t" + d });
        }
      }
    }
    return out;
  }

  function addStyle() {
    if (document.getElementById("solitaer-css")) return;
    var st = document.createElement("style");
    st.id = "solitaer-css";
    st.textContent =
      ".so{max-width:34rem;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}" +
      ".so-bar{display:flex;gap:.4rem;flex-wrap:wrap;margin:0 0 .6rem;align-items:center}.so-bar .chip{padding:.45rem .8rem;font-size:.9rem}" +
      ".so-bar button.act{padding:.5rem .9rem;font-size:.9rem}" +
      ".so-info{display:flex;justify-content:space-between;gap:.5rem;flex-wrap:wrap;color:var(--muted);font-size:.9rem;margin:0 0 .6rem;font-variant-numeric:tabular-nums}" +
      ".so-board{position:relative;width:100%;border-radius:1.1rem;padding:0;overflow:hidden;background:radial-gradient(120% 90% at 50% -25%,color-mix(in srgb,var(--accent) 45%,transparent),transparent 60%),linear-gradient(180deg,#0e4560,#0a3248 55%,#07202e);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 12px 30px -16px rgba(6,25,34,.7)}" +
      ".so-slot{position:absolute;border-radius:.45em;border:2px dashed rgba(255,255,255,.28);color:rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;box-sizing:border-box}" +
      ".so-slot.hint{border-color:#ffd23f;box-shadow:0 0 12px #ffd23f}" +
      ".so-card{position:absolute;border-radius:.45em;box-sizing:border-box;touch-action:none;cursor:pointer;transition:left .12s,top .12s;box-shadow:0 1px 3px rgba(0,0,0,.45)}" +
      ".so-card.face{background:#fff;color:#17313a;border:1px solid #b9c4cb}.so-card.red{color:#c62f3a}" +
      ".so-card.face .tl{position:absolute;left:.3em;top:.1em;line-height:1.05;font-weight:700;text-align:center}" +
      ".so-card.face .mid{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:2.1em;opacity:.9}" +
      ".so-card.face .br{position:absolute;right:.3em;bottom:.1em;line-height:1.05;font-weight:700;transform:rotate(180deg);text-align:center}" +
      ".so-card.back{border:2px solid #fff;background:repeating-linear-gradient(45deg,rgba(255,255,255,.14) 0 .35em,transparent .35em .7em),linear-gradient(135deg,var(--accent),#0e4560)}" +
      ".so-card.drag{transition:none;z-index:999!important;box-shadow:0 10px 22px rgba(0,0,0,.5)}" +
      ".so-card.hint{outline:3px solid #ffd23f;box-shadow:0 0 14px #ffd23f}" +
      ".so-card.no{animation:so-no .3s}@keyframes so-no{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}" +
      ".so-msg{min-height:1.5rem;margin:.5rem 0 0}" +
      ".so-win{position:absolute;inset:0;z-index:2000;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#fff;background:radial-gradient(circle at 50% 42%,rgba(255,214,102,.94),rgba(31,138,91,.92) 70%);overflow:hidden;opacity:0;animation:so-in .45s ease-out forwards}" +
      ".so-win h3{font-family:var(--serif);font-size:clamp(2rem,9vw,3.2rem);margin:.2rem 0;color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.4);animation:so-pop .7s cubic-bezier(.2,1.6,.4,1) .15s both}" +
      ".so-win p{margin:.15rem 0}.so-win button{margin-top:1rem}" +
      ".so-conf{position:absolute;top:-10%;border-radius:2px;pointer-events:none;animation:so-fall linear infinite}" +
      "@keyframes so-in{to{opacity:1}}@keyframes so-pop{from{transform:scale(.2) rotate(-8deg);opacity:0}to{transform:none;opacity:1}}@keyframes so-fall{to{transform:translateY(900px) rotate(720deg)}}" +
      "@media (prefers-reduced-motion:reduce){.so-win,.so-win *{animation:none!important}.so-win{opacity:1}.so-card{transition:none}}";
    document.head.appendChild(st);
  }

  function getNum(k) { try { var v = parseInt(localStorage.getItem(k), 10); return v > 0 ? v : 0; } catch (e) { return 0; } }
  function fmtTime(s) { s = Math.floor(s); return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }

  function start(box) {
    addStyle();
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    var drawN = 1, st, score = 0, moves = 0, elapsed = 0, history = [], won = false, hintT = 0, stopped = false, lastTick = 0, tickId = 0, started = false;
    try { drawN = localStorage.getItem(DRAW_KEY) === "3" ? 3 : 1; } catch (e) {}

    var root = document.createElement("div"), bar = document.createElement("div"), info = document.createElement("div"),
      board = document.createElement("div"), msg = document.createElement("p");
    root.className = "so"; bar.className = "so-bar"; info.className = "so-info"; board.className = "so-board"; msg.className = "msg so-msg";
    msg.setAttribute("aria-live", "polite");
    var chips = {};
    [[1, "1 Karte ziehen"], [3, "3 Karten ziehen"]].forEach(function (m) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = m[1];
      b.setAttribute("aria-pressed", String(m[0] === drawN));
      b.addEventListener("click", function () {
        if (m[0] === drawN) return;
        if (moves > 0 && !won && !window.confirm("Das startet ein neues Spiel. Fortfahren?")) return;
        drawN = m[0];
        try { localStorage.setItem(DRAW_KEY, String(drawN)); } catch (e) {}
        newGame();
      });
      bar.appendChild(b); chips[m[0]] = b;
    });
    function act(label, fn) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "act"; b.textContent = label;
      b.addEventListener("click", fn);
      bar.appendChild(b);
      return b;
    }
    var undoBtn = act("Zug zurück", undo), hintBtn = act("Tipp", hint), autoBtn = act("Auto-Ablage", autoFinish), newBtn = act("Neues Spiel", function () {
      if (moves > 0 && !won && !window.confirm("Aktuelles Spiel abbrechen und neu mischen?")) return;
      newGame();
    });
    autoBtn.hidden = true;
    [bar, info, board, msg].forEach(function (x) { root.appendChild(x); });
    box.appendChild(root);

    // ---------- Speichern ----------
    function save() {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify({ st: st, score: score, moves: moves, elapsed: elapsed, draw: drawN, won: won })); } catch (e) {}
    }
    function load() {
      try {
        var d = JSON.parse(localStorage.getItem(SAVE_KEY));
        if (d && validState(d.st) && !d.won && (d.draw === 1 || d.draw === 3)) {
          st = d.st; score = d.score | 0; moves = d.moves | 0; elapsed = +d.elapsed || 0; drawN = d.draw; started = moves > 0;
          return true;
        }
      } catch (e) {}
      return false;
    }

    function newGame() {
      st = newState(); score = 0; moves = 0; elapsed = 0; history = []; won = false; started = false;
      Object.keys(chips).forEach(function (k) { chips[k].setAttribute("aria-pressed", String(+k === drawN)); });
      msg.textContent = "";
      save();
      render();
    }

    // ---------- Zeichnen ----------
    var L = { cw: 50, ch: 70, g: 6, topH: 80 }, els = {};
    function layout() {
      var W = board.clientWidth || 320;
      L.g = Math.max(4, Math.round(W * 0.012));
      L.cw = (W - 8 * L.g) / 7;
      L.ch = L.cw * 1.42;
      L.topH = L.ch + 2 * L.g;
      board.style.fontSize = Math.max(10, L.cw * 0.27) + "px";
    }
    function colX(c) { return L.g + c * (L.cw + L.g); }

    function cardEl(id, faceUp, left, top, z, pile, idx) {
      var el = document.createElement("div");
      el.className = "so-card " + (faceUp ? "face" + (isRed(id) ? " red" : "") : "back");
      el.style.left = left + "px"; el.style.top = top + "px"; el.style.width = L.cw + "px"; el.style.height = L.ch + "px"; el.style.zIndex = z;
      el.dataset.id = id; el.dataset.pile = pile; el.dataset.idx = idx;
      if (faceUp) {
        var lbl = RANKS[rankOf(id)] + "<br>" + SUITS[suitOf(id)];
        el.innerHTML = '<span class="tl">' + lbl + '</span><span class="mid">' + SUITS[suitOf(id)] + '</span><span class="br">' + lbl + "</span>";
        el.setAttribute("aria-label", RANKS[rankOf(id)] + " " + SUITS[suitOf(id)]);
      }
      board.appendChild(el);
      els[id] = el;
      return el;
    }
    function slot(left, top, text, cls) {
      var el = document.createElement("div");
      el.className = "so-slot" + (cls ? " " + cls : "");
      el.style.left = left + "px"; el.style.top = top + "px"; el.style.width = L.cw + "px"; el.style.height = L.ch + "px";
      el.textContent = text || "";
      board.appendChild(el);
      return el;
    }

    function render() {
      layout();
      board.textContent = "";
      els = {};
      var i, c, k, pile, y, z = 1, maxY = 0;
      // Vorrat und Abwurf
      var stockSlot = slot(colX(0), L.g, st.stock.length ? "" : "↻", "stock");
      stockSlot.dataset.pile = "s";
      if (st.stock.length) { var sc = cardEl(st.stock[st.stock.length - 1], false, colX(0), L.g, 1, "s", st.stock.length - 1); sc.dataset.count = st.stock.length; }
      var showN = drawN === 3 ? Math.min(3, st.waste.length) : Math.min(1, st.waste.length);
      for (i = 0; i < showN; i++) {
        var wi = st.waste.length - showN + i;
        cardEl(st.waste[wi], true, colX(1) + i * L.cw * 0.28, L.g, 2 + i, "w", wi);
      }
      // Ablagen
      for (i = 0; i < 4; i++) {
        slot(colX(3 + i), L.g, SUITS[i], "found");
        for (k = 0; k < st.found[i].length; k++) if (k >= st.found[i].length - 2) cardEl(st.found[i][k], true, colX(3 + i), L.g, 1 + k, "f" + i, k);
      }
      // Spalten
      var offDown = L.ch * 0.15, offUp = L.ch * 0.3;
      for (c = 0; c < 7; c++) {
        slot(colX(c), L.topH + L.g, "", "col").dataset.pile = "t" + c;
        pile = st.tab[c]; y = L.topH + L.g;
        // bei sehr langen Spalten enger stapeln
        var need = 0, kk;
        for (kk = 0; kk < pile.length - 1; kk++) need += st.up[pile[kk]] ? offUp : offDown;
        var maxH = Math.max(L.ch * 4.2, 0), scale = need + L.ch > maxH + L.ch ? (maxH) / need : 1;
        for (k = 0; k < pile.length; k++) {
          cardEl(pile[k], !!st.up[pile[k]], colX(c), y, 10 + k, "t" + c, k);
          y += (st.up[pile[k]] ? offUp : offDown) * (scale < 1 ? Math.max(0.55, scale) : 1);
        }
        maxY = Math.max(maxY, y - (pile.length ? (st.up[pile[pile.length - 1]] ? offUp : offDown) * (scale < 1 ? Math.max(0.55, scale) : 1) : 0) + L.ch);
      }
      board.style.height = Math.max(maxY, L.topH + L.g + L.ch * 2.6) + L.g * 2 + "px";
      info.textContent = "";
      [["Punkte: " + score], ["Züge: " + moves], ["Zeit: " + fmtTime(elapsed)], ["Rekord: " + getNum(BEST_KEY)]].forEach(function (t) {
        var s = document.createElement("span"); s.textContent = t[0]; info.appendChild(s);
      });
      undoBtn.disabled = !history.length || won;
      autoBtn.hidden = won || !allUp(st);
      hintBtn.disabled = won;
    }

    // ---------- Züge ----------
    function snapshot() { history.push({ st: clone(st), score: score, moves: moves }); if (history.length > 300) history.shift(); }
    function flipTop(c) {
      var pile = st.tab[c];
      if (pile.length && !st.up[pile[pile.length - 1]]) { st.up[pile[pile.length - 1]] = true; score += 5; }
    }
    function pickCards(from, idx) {             // welche Karten gehören zum Zug?
      if (from === "w") return [st.waste[idx]];
      if (from.charAt(0) === "f") return [st.found[+from.slice(1)][idx]];
      return st.tab[+from.slice(1)].slice(idx);
    }
    function doMove(from, idx, to) {
      var cards = pickCards(from, idx), id = cards[0], ok = false, c;
      if (!cards.length || cards[0] === undefined) return false;
      if (to === "f") {
        if (cards.length !== 1 || !canFound(st, id)) return false;
        if (from === "w" && idx !== st.waste.length - 1) return false;
        if (from.charAt(0) === "t" && idx !== st.tab[+from.slice(1)].length - 1) return false;
        snapshot();
        removeFrom(from, idx);
        st.found[suitOf(id)].push(id);
        score += from === "w" ? 10 : from.charAt(0) === "f" ? 0 : 10;
        ok = true;
      } else {
        c = +to.slice(1);
        if (from === "t" + c || !canTab(st, id, c)) return false;
        if (from === "w" && idx !== st.waste.length - 1) return false;
        if (from.charAt(0) === "f" && idx !== st.found[+from.slice(1)].length - 1) return false;
        snapshot();
        removeFrom(from, idx);
        cards.forEach(function (x) { st.tab[c].push(x); });
        score += from === "w" ? 5 : from.charAt(0) === "f" ? -15 : 0;
        ok = true;
      }
      if (from.charAt(0) === "t") flipTop(+from.slice(1));
      if (score < 0) score = 0;
      afterMove();
      return ok;
    }
    function removeFrom(from, idx) {
      if (from === "w") st.waste.splice(idx, 1);
      else if (from.charAt(0) === "f") st.found[+from.slice(1)].splice(idx, 1);
      else st.tab[+from.slice(1)].splice(idx);
    }
    function drawFromStock() {
      snapshot();
      if (st.stock.length) {
        for (var i = 0; i < drawN && st.stock.length; i++) { var id = st.stock.pop(); st.up[id] = true; st.waste.push(id); }
      } else if (st.waste.length) {
        st.stock = st.waste.slice().reverse();
        st.stock.forEach(function (id) { st.up[id] = false; });
        st.waste = [];
        score = Math.max(0, score - (drawN === 1 ? 100 : 20));
      } else { history.pop(); return; }
      afterMove();
    }
    function afterMove() {
      moves++;
      started = true;
      hideHint();
      if (totalFound(st) === 52) { win(); return; }
      save();
      render();
      if (!stopped) msg.textContent = "";
    }
    function undo() {
      if (!history.length || won) return;
      var h = history.pop();
      st = h.st; score = h.score; moves = h.moves;
      hideHint();
      msg.textContent = "";
      save();
      render();
    }

    // Antippen: erst auf die Ablage, sonst auf die erste passende Spalte
    function autoMove(from, idx) {
      var cards = pickCards(from, idx), id = cards[0], d;
      if (cards.length === 1 && from.charAt(0) !== "f" && canFound(st, id)) return doMove(from, idx, "f");
      for (d = 0; d < 7; d++) {
        if (from === "t" + d) continue;
        if (!st.tab[d].length) continue;
        if (canTab(st, id, d)) return doMove(from, idx, "t" + d);
      }
      if (rankOf(id) === 13 && !(from.charAt(0) === "t" && idx === 0)) {
        for (d = 0; d < 7; d++) if (!st.tab[d].length) return doMove(from, idx, "t" + d);
      }
      return false;
    }

    // ---------- Tipp ----------
    function hideHint() {
      clearTimeout(hintT);
      Array.prototype.forEach.call(board.querySelectorAll(".hint"), function (e) { e.classList.remove("hint"); });
    }
    function hint() {
      if (won) return;
      hideHint();
      var ms = listMoves(st), m = null, i;
      for (i = 0; i < ms.length; i++) if (ms[i].to === "f") { m = ms[i]; break; }
      if (!m) {
        for (i = 0; i < ms.length; i++) {
          var from = ms[i].from, c0 = from.charAt(0) === "t" ? +from.slice(1) : -1;
          if (c0 >= 0 && ms[i].idx > 0 && !st.up[st.tab[c0][ms[i].idx - 1]]) { m = ms[i]; break; }     // deckt eine Karte auf
        }
      }
      if (!m) m = ms[0] || null;
      if (m) {
        pickCards(m.from, m.idx).forEach(function (id) { if (els[id]) els[id].classList.add("hint"); });
        if (m.to === "f") {
          var s = board.querySelectorAll(".so-slot.found")[suitOf(pickCards(m.from, m.idx)[0])];
          if (s) s.classList.add("hint");
        } else {
          var tc = board.querySelector('.so-slot[data-pile="' + m.to + '"]'), pile = st.tab[+m.to.slice(1)];
          if (pile.length && els[pile[pile.length - 1]]) els[pile[pile.length - 1]].classList.add("hint"); else if (tc) tc.classList.add("hint");
        }
        msg.textContent = "Tipp: Die markierten Karten kannst du verschieben.";
      } else if (st.stock.length || st.waste.length) {
        var sl = board.querySelector(".so-slot.stock");
        if (sl) sl.classList.add("hint");
        if (els[st.stock[st.stock.length - 1]]) els[st.stock[st.stock.length - 1]].classList.add("hint");
        msg.textContent = "Tipp: Ziehe eine neue Karte vom Stapel.";
      } else msg.textContent = "Kein Zug mehr möglich. Mit „Zug zurück“ oder „Neues Spiel“ geht es weiter.";
      hintT = setTimeout(hideHint, 2500);
    }

    // ---------- Auto-Ablage und Sieg ----------
    var autoT = 0;
    function autoFinish() {
      if (won || !allUp(st)) return;
      clearTimeout(autoT);
      (function step() {
        if (stopped || won) return;
        var ms = listMoves(st).filter(function (m) { return m.to === "f"; });
        if (!ms.length) return;
        doMove(ms[0].from, ms[0].idx, "f");
        if (!won) autoT = setTimeout(step, 90);
      })();
    }
    function win() {
      won = true;
      score += Math.round(700000 / Math.max(30, elapsed));              // schneller = mehr Bonuspunkte
      var record = score > getNum(BEST_KEY);
      if (record) { try { localStorage.setItem(BEST_KEY, String(score)); } catch (e) {} }
      save();
      render();
      var el = document.createElement("div"), h = document.createElement("h3"), p1 = document.createElement("p"), p2 = document.createElement("p"), b = document.createElement("button"), i, c, cols = ["#ffd23f", "#ff5d73", "#4cd7a6", "#6aa7ff", "#d6409f", "#ffffff"];
      el.className = "so-win";
      for (i = 0; i < 50; i++) {
        c = document.createElement("span");
        c.className = "so-conf";
        c.style.left = Math.round(Math.random() * 100) + "%";
        c.style.width = (5 + Math.round(Math.random() * 5)) + "px"; c.style.height = (8 + Math.round(Math.random() * 6)) + "px";
        c.style.background = cols[i % cols.length];
        c.style.animationDuration = (2.5 + Math.random() * 2).toFixed(2) + "s"; c.style.animationDelay = (-Math.random() * 3).toFixed(2) + "s";
        el.appendChild(c);
      }
      h.textContent = "Gewonnen!";
      p1.textContent = score + " Punkte in " + fmtTime(elapsed) + " mit " + moves + " Zügen";
      p2.textContent = record ? "Neuer Rekord!" : "Rekord: " + getNum(BEST_KEY) + " Punkte";
      b.type = "button"; b.textContent = "Neues Spiel";
      b.addEventListener("click", newGame);
      [h, p1, p2, b].forEach(function (x) { el.appendChild(x); });
      board.appendChild(el);
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    }

    // ---------- Ziehen und Tippen ----------
    var drag = null;
    function pt(e) { var r = board.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
    function onDown(e) {
      if (won || e.button > 0) return;
      var el = e.target.closest ? e.target.closest(".so-card, .so-slot") : null;
      if (!el) return;
      hideHint();
      var pile = el.dataset.pile, idx = +el.dataset.idx;
      if (pile === "s" || (el.classList.contains("so-slot") && pile === "s")) { drawFromStock(); e.preventDefault(); return; }
      if (!el.classList.contains("so-card") || el.classList.contains("back")) return;
      var from = pile, cards = pickCards(from, idx), p = pt(e);
      if (from.charAt(0) === "f" && idx !== st.found[+from.slice(1)].length - 1) return;
      if (from === "w" && idx !== st.waste.length - 1) return;
      drag = { from: from, idx: idx, ids: cards, sx: p.x, sy: p.y, moved: false, pid: e.pointerId };
      try { board.setPointerCapture(e.pointerId); } catch (er) {}
      e.preventDefault();
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      var p = pt(e), dx = p.x - drag.sx, dy = p.y - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) < 8) return;
      drag.moved = true;
      drag.ids.forEach(function (id, i) {
        var el = els[id];
        if (!el) return;
        el.classList.add("drag");
        el.style.zIndex = 999 + i;
        el.style.transform = "translate(" + dx + "px," + dy + "px)";
      });
      e.preventDefault();
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      var d = drag; drag = null;
      try { board.releasePointerCapture(e.pointerId); } catch (er) {}
      var p = pt(e);
      if (!d.moved) {
        if (!autoMove(d.from, d.idx)) {
          var el = els[d.ids[0]];
          if (el) { el.classList.add("no"); setTimeout(function () { el.classList.remove("no"); }, 320); }
        }
        return;
      }
      var first = els[d.ids[0]], r = first ? first.getBoundingClientRect() : null, br = board.getBoundingClientRect();
      var cx = r ? r.left - br.left + L.cw / 2 : p.x, cy = r ? r.top - br.top + L.ch / 2 : p.y;
      var col = Math.max(0, Math.min(6, Math.floor(cx / (L.cw + L.g)))), moved = false;
      if (cy < L.topH && col >= 3 && d.ids.length === 1) moved = doMove(d.from, d.idx, "f");
      else if (cy >= L.topH - L.ch * 0.3) moved = doMove(d.from, d.idx, "t" + col);
      if (!moved) render();
    }
    board.addEventListener("pointerdown", onDown);
    board.addEventListener("pointermove", onMove);
    board.addEventListener("pointerup", onUp);
    board.addEventListener("pointercancel", function () { if (drag) { drag = null; render(); } });
    board.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    board.addEventListener("selectstart", function (e) { e.preventDefault(); });

    function onResize() { if (!stopped && !won) render(); }
    window.addEventListener("resize", onResize);

    // ---------- Uhr ----------
    lastTick = performance.now();
    tickId = setInterval(function () {
      var now = performance.now();
      if (started && !won && !stopped && root.offsetParent) {
        elapsed += (now - lastTick) / 1000;
        var spans = info.querySelectorAll("span");
        if (spans[2]) spans[2].textContent = "Zeit: " + fmtTime(elapsed);
      }
      lastTick = now;
    }, 500);

    if (!load()) newGame(); else { Object.keys(chips).forEach(function (k) { chips[k].setAttribute("aria-pressed", String(+k === drawN)); }); render(); }
    msg.textContent = "Ziehe Karten oder tippe sie an. Antippen legt sie automatisch ab.";

    return function stop() {
      stopped = true;
      clearInterval(tickId);
      clearTimeout(autoT);
      clearTimeout(hintT);
      window.removeEventListener("resize", onResize);
      if (!won) save();
    };
  }

  (window.Spiele = window.Spiele || []).push({
    id: "solitaer", name: "Solitär", start: start,
    _engine: { newState: newState, canFound: canFound, canTab: canTab, listMoves: listMoves, validState: validState, allUp: allUp, totalFound: totalFound }
  });
})();
;
// ===== wortraten.js =====
// © 2026 BlaueQualle. Alle Rechte vorbehalten.
// Spiel: Wortraten (jeden Tag ein neues Wort, für alle dasselbe)
(function () {
  "use strict";

  var WORDS = "ABEND ACKER ADLER ALARM ALLEE AMPEL ANGEL ANGST APFEL ARENA ASCHE ATLAS AUTOR BADEN BAUCH BAUER BEERE BERGE BETON BIENE BIRNE BLATT BLICK BLITZ BLUME BLUSE BOGEN BRAND BRAUT BRIEF BRUST BUCHT BÜSTE CHAOS CLOWN COUCH CREME DACHS DAUER DEGEN DELLE DICHT DINGE DRAHT DRAMA DRECK DUNST DURST EBENE ENGEL ERBSE ERNTE ESSEN ETAGE EIMER EICHE EIFER EISEN FABEL FARBE FEDER FEIER FEIGE FERNE FERSE FEUER FISCH FLECK FLIRT FLUSS FLUCH FRAGE FUCHS FUNKE FÜLLE GABEL GEIST GEMSE GESTE GLANZ GLÜCK GRUBE GRUND GÄSTE GÄNSE GEBEN GEHEN HAFEN HAKEN HALLE HANDY HASEN HAUPT HEIDE HONIG HOSEN HÖHLE HÜTTE HOBEL HERDE HORDE IDEAL IMKER INSEL JACKE JAGEN JUBEL JUNGE KABEL KAMEL KAMIN KANAL KARTE KATZE KEGEL KERZE KETTE KIOSK KISTE KLANG KLEID KLEIN KLIMA KNOPF KOHLE KRAFT KRANK KREIS KRIEG KRONE KÜCHE KUGEL KUNDE KUNST KURVE KÜSTE LACHS LADEN LAGER LAMPE LARVE LASER LAUBE LEBEN LEDER LEERE LEHRE LEINE LEISE LESEN LICHT LIEBE LILIE LINIE LISTE LOCKE LUCHS LUNGE MACHT MAGEN MALER MARKT MASKE MASSE MATTE MAUER MENGE MESSE MILCH MINZE MORAL MOTOR MÜNZE MUSIK MÜTZE NACHT NADEL NAGEL NEBEL NUDEL NÜSSE OFFEN OHREN OPERN ORKAN OSTEN OTTER PAARE PALME PAPST PARTY PASTE PAUSE PERLE PFAHL PFEIL PILZE PIRAT PISTE PLATZ POKAL PREIS PUDEL PUNKT PUPPE QUARK QUOTE RADAR RAUCH REGAL REGEN REIFE REIHE REISE RINDE ROBBE ROBOT ROMAN ROUTE RUDER RUHIG RUNDE SACHE SAITE SALAT SANFT SAUCE SÄULE SCHAF SCHAL SCHUH SEGEL SEIDE SEIFE SEITE SEKTE SERIE SKALA SOCKE SOHLE SONNE SPECK SPIEL SPORT STAAT STADT STAHL STALL STAMM STAUB STEIN STERN STIEL STIFT STILL STOCK STOFF STOLZ STROH STUBE STUHL STURM SUCHE SÜNDE SUPPE TAFEL TANNE TANTE TASSE TAUBE TEICH TEMPO TEXTE THEMA THRON TIEFE TIGER TINTE TISCH TITEL TOAST TONNE TORTE TRAUM TRICK TRUHE TULPE ÜBUNG UMWEG VATER VIDEO VIRUS VOGEL WACHE WAGEN WALZE WANGE WANZE WATTE WEIDE WELLE WENIG WERTE WESEN WETTE WIESE WOCHE WOLKE WOLLE WUNDE WURST WÜRDE WÜSTE ZANGE ZEBRA ZEILE ZELLE ZIEGE ZITAT ZÜGEL ZUNGE ZWEIG AHORN ALTAR AMSEL ANKER ARMEE AROMA BANDE BASIS BEUTE BIBEL BINDE BISON BLOCK BODEN BOMBE BRAUN BREIT BRISE BRUCH BUCHE CHIPS DAMEN DATEN DECKE DEMUT DOLCH DONUT DOSEN DUELL EIGEN EILIG ELFEN EMAIL ENDEN ENTEN ERBEN ESSIG FADEN FAHNE FALKE FALLE FASER FEIND FELGE FLACH FLOSS FLÖTE FRECH FROST GALLE GARBE GASSE GEBET GEIER GENAU GILDE GLATT GLEIS GLIED GREIS GRILL GROLL GUMMI HAARE HAFER HAGEL HARFE HAUCH HAUEN HECKE HEBEL HENNE HOLEN HOTEL HUMOR HUNDE INDEX JAHRE JEANS JUWEL KAKAO KAMPF KASSE KAUEN KERNE KLAGE KNALL KNIFF KOALA KOMET KORBE KRAUT KREBS KRUMM KÜSSE LANZE LAUTE LEGEN LEHNE LEIER LIPPE LOBEN LOGIK LOSEN MAGIE MANGO MARKE MEERE MINEN MITTE MOLCH MONAT MÖWEN MUTIG NAHEN NARBE NEBEN NEFFE NERVE NETZE NONNE NOTEN OASEN OLIVE OPFER ORDEN ORGEL OZEAN PAKET PANNE PAPPE PEDAL PFERD PFLUG PHASE PIANO PLANE PROBE PUMPE QUALM QUARZ RABEN RAMPE RASSE RATEN REDEN REGEL REICH RIESE RILLE RINGE RISSE ROGEN ROSEN RÜBEN RUFEN RUMPF SAGEN SAHNE SALBE SAMEN SAUER SAUNA SCHON SCHEU SEHEN SEHNE SENKE SILBE SIRUP SPALT SPEER SPION STEIF STUFE STUMM SUMPF TATEN TEILE TIERE TOBEN TOPAS TRIEB TROST TRUPP TÜREN TYPEN UNTEN UHREN VASEN VORNE WAAGE WACHS WEICH WEISE WIDER WITZE WONNE WORTE WUCHT WÜRZE ZECHE ZEHEN ZENIT ZONEN ZWERG ZWIRN".split(" ");
  var EPOCH = Date.UTC(2026, 0, 1);
  var KEY = "wortraten-v1";
  var ROWS = 6, COLS = 5;

  // ---------- Wort des Tages ----------
  function mulberry(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Datum in deutscher Zeit als "JJJJ-MM-TT"
  function berlinDate(d) {
    d = d || new Date();
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    } catch (e) {
      var p = function (n) { return (n < 10 ? "0" : "") + n; };
      return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
    }
  }

  function dayNumber(dateStr) {
    var p = dateStr.split("-");
    return Math.floor((Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])) - EPOCH) / 86400000);
  }

  function dateOfDay(n) { return new Date(EPOCH + n * 86400000).toISOString().slice(0, 10); }

  var ORDER = null;
  function order() {
    if (!ORDER) {
      var idx = WORDS.map(function (_, i) { return i; });
      var rnd = mulberry(20260101);
      for (var i = idx.length - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1));
        var t = idx[i]; idx[i] = idx[j]; idx[j] = t;
      }
      ORDER = idx;
    }
    return ORDER;
  }

  // Alle Wörter kommen einmal dran, bevor sich etwas wiederholt
  function dailyWord(dateStr) {
    var len = WORDS.length;
    var k = ((dayNumber(dateStr) % len) + len) % len;
    return WORDS[order()[k]];
  }

  // 2 = richtige Stelle, 1 = im Wort, aber an anderer Stelle, 0 = nicht enthalten
  function score(guess, answer) {
    var res = [], left = {}, i;
    for (i = 0; i < COLS; i++) {
      if (guess[i] === answer[i]) res[i] = 2;
      else { res[i] = 0; left[answer[i]] = (left[answer[i]] || 0) + 1; }
    }
    for (i = 0; i < COLS; i++) {
      if (res[i] === 0 && left[guess[i]] > 0) { res[i] = 1; left[guess[i]]--; }
    }
    return res;
  }

  // ---------- Speicher ----------
  function loadStore() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      if (v && v.stats) return v;
    } catch (e) {}
    return { day: "", guesses: [], status: "playing", counted: "", stats: { played: 0, won: 0, streak: 0, best: 0, lastWin: "", dist: [0, 0, 0, 0, 0, 0] } };
  }

  function saveStore(v) {
    try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
  }

  var freeState = null;   // Freies Spiel bleibt beim Reiterwechsel erhalten

  // ---------- Oberfläche ----------
  var CSS =
    ".wr-board{display:grid;grid-template-rows:repeat(6,1fr);gap:0.35rem;width:100%;max-width:19rem;margin:0 0 1rem}" +
    ".wr-row{display:grid;grid-template-columns:repeat(5,1fr);gap:0.35rem}" +
    ".wr-tile{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:2px solid var(--line);border-radius:6px;background:var(--panel);font-weight:700;font-size:1.5rem;text-transform:uppercase;user-select:none}" +
    ".wr-tile.fill{border-color:var(--ink)}" +
    ".wr-tile.s2{background:#3a9d5d;border-color:#3a9d5d;color:#fff}" +
    ".wr-tile.s1{background:#d4a72c;border-color:#d4a72c;color:#1b1500}" +
    ".wr-tile.s0{background:#6b7b84;border-color:#6b7b84;color:#fff}" +
    ".wr-kb{display:flex;flex-direction:column;gap:0.35rem;width:100%;max-width:26rem;margin:0 0 1rem}" +
    ".wr-kr{display:flex;gap:0.25rem;justify-content:center}" +
    ".wr-key{flex:1;min-width:0;padding:0.7rem 0;font-size:0.95rem;background:var(--panel);background-image:none;color:var(--ink);border:1px solid var(--line);border-radius:5px;text-transform:uppercase}" +
    ".wr-key.wide{flex:1.6}" +
    ".wr-key.s2{background:#3a9d5d;border-color:#3a9d5d;color:#fff}" +
    ".wr-key.s1{background:#d4a72c;border-color:#d4a72c;color:#1b1500}" +
    ".wr-key.s0{background:#6b7b84;border-color:#6b7b84;color:#fff;opacity:0.8}" +
    "@media (prefers-reduced-motion: no-preference){.wr-tile.pop{animation:wr-pop 0.1s ease-out}@keyframes wr-pop{from{transform:scale(0.88)}to{transform:none}}}";

  function addStyle() {
    if (document.getElementById("wr-style")) return;
    var s = document.createElement("style");
    s.id = "wr-style";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  var KEYROWS = ["QWERTZUIOPÜ", "ASDFGHJKLÖÄ", "ENTER|YXCVBNM|BACK"];
  var LABEL = ["nicht im Wort", "falsche Stelle", "richtige Stelle"];

  function start(box) {
    addStyle();
    // Der Fokus liegt noch auf dem Knopf im Spiel-Menü: lösen, damit die Tastatur im Spiel ankommt
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    var store = loadStore();
    var today = berlinDate();
    if (store.day !== today) { store.day = today; store.guesses = []; store.status = "playing"; saveStore(store); }

    var mode = "tag";                 // "tag" = Wort des Tages, "frei" = Freies Spiel
    var state;                        // { answer, guesses, status }
    var current = "";
    var msgTimer = null;

    // --- Umschalter ---
    var chips = el("div", "chips");
    chips.setAttribute("role", "group");
    chips.setAttribute("aria-label", "Spielart");
    var chipDay = el("button", "chip", "Wort des Tages");
    var chipFree = el("button", "chip", "Freies Spiel");
    chipDay.type = chipFree.type = "button";
    chips.appendChild(chipDay);
    chips.appendChild(chipFree);

    // --- Spielfeld ---
    var board = el("div", "wr-board");
    board.setAttribute("role", "group");
    board.setAttribute("aria-label", "Rateversuche");
    var tiles = [];
    for (var r = 0; r < ROWS; r++) {
      var row = el("div", "wr-row");
      tiles.push([]);
      for (var c = 0; c < COLS; c++) {
        var t = el("div", "wr-tile");
        row.appendChild(t);
        tiles[r].push(t);
      }
      board.appendChild(row);
    }

    var msg = el("p", "msg");
    msg.setAttribute("aria-live", "polite");

    // --- Tastatur ---
    var kb = el("div", "wr-kb");
    var keyEls = {};
    KEYROWS.forEach(function (rowStr) {
      var kr = el("div", "wr-kr");
      var keys = rowStr.indexOf("|") >= 0 ? rowStr.split("|") : [rowStr];
      keys.forEach(function (part) {
        var list = (part === "ENTER" || part === "BACK") ? [part] : part.split("");
        list.forEach(function (k) {
          var b = el("button", "wr-key" + (k.length > 1 ? " wide" : ""));
          b.type = "button";
          b.textContent = k === "ENTER" ? "Enter" : k === "BACK" ? "⌫" : k;
          b.setAttribute("aria-label", k === "ENTER" ? "Eingeben" : k === "BACK" ? "Löschen" : k);
          b.addEventListener("click", function () { b.blur(); press(k); });
          kr.appendChild(b);
          if (k.length === 1) keyEls[k] = b;
        });
      });
      kb.appendChild(kr);
    });

    var actions = el("div", "row");
    var shareBtn = el("button", "", "Ergebnis kopieren");
    shareBtn.type = "button";
    shareBtn.hidden = true;
    var newBtn = el("button", "", "Neues Wort");
    newBtn.type = "button";
    newBtn.hidden = true;
    actions.appendChild(shareBtn);
    actions.appendChild(newBtn);

    var statsEl = el("p", "msg");

    box.appendChild(chips);
    box.appendChild(board);
    box.appendChild(msg);
    box.appendChild(kb);
    box.appendChild(actions);
    box.appendChild(statsEl);

    function say(text, keep) {
      msg.textContent = text || "";
      clearTimeout(msgTimer);
      if (text && !keep) msgTimer = setTimeout(function () { msg.textContent = ""; refreshMessage(); }, 2500);
    }

    function refreshMessage() {
      if (state.status === "won") say("Richtig! Das Wort war " + state.answer + ".", true);
      else if (state.status === "lost") say("Leider nicht geschafft. Das Wort war " + state.answer + ".", true);
    }

    function streakNow() {
      var s = store.stats;
      var n = dayNumber(today);
      return (s.lastWin === today || s.lastWin === dateOfDay(n - 1)) ? s.streak : 0;
    }

    function renderStats() {
      var s = store.stats;
      var pct = s.played ? Math.round((s.won / s.played) * 100) : 0;
      statsEl.textContent = "Serie: " + streakNow() + " · Längste Serie: " + s.best + " · Gespielt: " + s.played + " · Gewonnen: " + pct + " %" +
        (mode === "tag" ? " · Das nächste Wort kommt um Mitternacht (deutsche Zeit)." : "");
    }

    function render() {
      chipDay.setAttribute("aria-pressed", String(mode === "tag"));
      chipFree.setAttribute("aria-pressed", String(mode === "frei"));
      var keyState = {};
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          var tile = tiles[r][c];
          var g = state.guesses[r];
          var ch = "", cls = "wr-tile", label = "leer";
          if (g) {
            ch = g[c];
            var sc = score(g, state.answer)[c];
            cls += " s" + sc;
            label = ch + ", " + LABEL[sc];
            if (!keyState[ch] || keyState[ch] < sc + 1) keyState[ch] = sc + 1;
          } else if (r === state.guesses.length && state.status === "playing" && current[c]) {
            ch = current[c];
            cls += " fill";
            label = ch;
          }
          tile.className = cls;
          tile.textContent = ch;
          tile.setAttribute("aria-label", label);
        }
      }
      Object.keys(keyEls).forEach(function (k) {
        var v = keyState[k];
        keyEls[k].className = "wr-key" + (v ? " s" + (v - 1) : "");
      });
      var done = state.status !== "playing";
      shareBtn.hidden = !done;
      newBtn.hidden = !(done && mode === "frei");
      renderStats();
    }

    function finishDaily(won) {
      if (store.counted === today) return;
      store.counted = today;
      var s = store.stats;
      s.played++;
      if (won) {
        s.won++;
        s.dist[state.guesses.length - 1]++;
        s.streak = s.lastWin === dateOfDay(dayNumber(today) - 1) ? s.streak + 1 : 1;
        s.lastWin = today;
        if (s.streak > s.best) s.best = s.streak;
      } else {
        s.streak = 0;
      }
    }

    function submit() {
      if (current.length < COLS) { say("Zu kurz: Es müssen " + COLS + " Buchstaben sein."); return; }
      state.guesses.push(current);
      var won = current === state.answer;
      current = "";
      if (won) state.status = "won";
      else if (state.guesses.length >= ROWS) state.status = "lost";
      if (mode === "tag") {
        store.guesses = state.guesses.slice();
        store.status = state.status;
        if (state.status !== "playing") finishDaily(won);
        saveStore(store);
      }
      render();
      if (state.status !== "playing") refreshMessage();
    }

    function press(k) {
      if (state.status !== "playing") return;
      if (k === "ENTER") { submit(); return; }
      if (k === "BACK") { current = current.slice(0, -1); render(); return; }
      if (current.length < COLS) {
        current += k;
        render();
        var t = tiles[state.guesses.length][current.length - 1];
        t.classList.add("pop");
      }
    }

    function startDaily() {
      mode = "tag";
      current = "";
      today = berlinDate();
      if (store.day !== today) { store.day = today; store.guesses = []; store.status = "playing"; saveStore(store); }
      state = { answer: dailyWord(today), guesses: store.guesses.slice(), status: store.status };
      say("");
      render();
      refreshMessage();
    }

    function startFree(fresh) {
      mode = "frei";
      current = "";
      if (fresh || !freeState) {
        var prev = freeState ? freeState.answer : "";
        var w;
        do { w = WORDS[Math.floor(Math.random() * WORDS.length)]; } while (w === prev && WORDS.length > 1);
        freeState = { answer: w, guesses: [], status: "playing" };
      }
      state = freeState;
      say("");
      render();
      refreshMessage();
    }

    function shareText() {
      var lines = state.guesses.map(function (g) {
        return score(g, state.answer).map(function (s) { return s === 2 ? "🟩" : s === 1 ? "🟨" : "⬛"; }).join("");
      });
      var head = "Wortraten " + (mode === "tag" ? "Tag " + (dayNumber(today) + 1) : "(freies Spiel)") + " " +
        (state.status === "won" ? state.guesses.length : "X") + "/" + ROWS;
      return head + "\n" + lines.join("\n");
    }

    shareBtn.addEventListener("click", function () {
      var text = shareText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { say("Ergebnis kopiert."); }, function () { say(text.replace(/\n/g, " ")); });
      } else {
        say(text.replace(/\n/g, " "));
      }
    });
    newBtn.addEventListener("click", function () { startFree(true); });
    chipDay.addEventListener("click", function () { chipDay.blur(); startDaily(); });
    chipFree.addEventListener("click", function () { chipFree.blur(); startFree(false); });

    function onKey(e) {
      if (!board.offsetParent || e.ctrlKey || e.metaKey || e.altKey) return;
      var tg = e.target, t = tg && tg.tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      if (e.key === "Enter" && t === "BUTTON" && box.contains(tg)) return;   // Knopf in diesem Spiel erledigt das selbst
      if (e.key === "Enter") { e.preventDefault(); press("ENTER"); }
      else if (e.key === "Backspace") { e.preventDefault(); press("BACK"); }
      else if (/^[a-zA-ZäöüÄÖÜ]$/.test(e.key)) { e.preventDefault(); press(e.key.toUpperCase()); }
    }
    document.addEventListener("keydown", onKey);

    startDaily();

    return function stop() {
      clearTimeout(msgTimer);
      document.removeEventListener("keydown", onKey);
    };
  }

  (window.Spiele = window.Spiele || []).push({
    id: "wortraten",
    name: "Wortraten",
    start: start,
    _engine: { WORDS: WORDS, dailyWord: dailyWord, dayNumber: dayNumber, score: score, berlinDate: berlinDate, dateOfDay: dateOfDay }
  });
})();
