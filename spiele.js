// Alle Spiele (window.Spiele) und Werkzeuge (window.Werkzeuge: Uhr, Spielstand) in einer Datei.
// Wird nur nach dem Login ausgeliefert.

// ===== 2048.js =====
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
// Spiel: Autorennen (Hindernissen ausweichen, das Tempo steigt)
(window.Spiele = window.Spiele || []).push({
  id: "autorennen",
  name: "Autorennen",
  start: function (box) {
    var W = 320, H = 480;
    var LANES = 4, ROAD_X = 20, LANE_W = 70;
    var CAR_W = 36, CAR_H = 62;
    var PY = H - 90;
    var COLORS = ["#e0a800", "#8a949b", "#1aa38f", "#c2185b", "#f2f2f2"];

    var canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    canvas.className = "game-canvas";
    canvas.style.aspectRatio = "2 / 3";
    canvas.style.maxWidth = "20rem";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Rennstrecke von oben");
    var ctx = canvas.getContext("2d");

    var info = document.createElement("p");
    info.className = "msg";
    info.setAttribute("aria-live", "polite");

    var startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.textContent = "Start";

    var steer = document.createElement("div");
    steer.className = "steer";
    [["Links", "◀ Links", -1], ["Rechts", "Rechts ▶", 1]].forEach(function (d) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pad-btn";
      b.textContent = d[1];
      b.setAttribute("aria-label", d[0]);
      b.addEventListener("click", function () { move(d[2]); });
      steer.appendChild(b);
    });

    box.appendChild(canvas);
    var row = document.createElement("div");
    row.className = "row";
    row.appendChild(startBtn);
    row.appendChild(info);
    box.appendChild(row);
    box.appendChild(steer);

    var lane, px, enemies, time, dist, offset, spawnIn, running, over, raf, prev;
    var best = 0;
    try { best = Number(localStorage.getItem("rennen-best")) || 0; } catch (e) {}

    function laneX(l) { return ROAD_X + l * LANE_W + LANE_W / 2; }
    function score() { return Math.floor(dist / 10); }
    function scoreText() { return "Punkte: " + score() + " · Rekord: " + best; }
    function css(name, fallback) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    }

    function reset() {
      lane = 1;
      px = laneX(lane);
      enemies = [];
      time = 0;
      dist = 0;
      offset = 0;
      spawnIn = 0.6;
      over = false;
    }

    function speed() { return Math.min(220 + time * 7, 520); }

    function spawn() {
      var l = Math.floor(Math.random() * LANES);
      var near = enemies.filter(function (e) { return e.y < 160; });
      if (near.length >= 2 || near.some(function (e) { return e.lane === l; })) return;
      enemies.push({
        lane: l,
        x: laneX(l),
        y: -CAR_H,
        rel: 0.5 + Math.random() * 0.35,
        color: COLORS[Math.floor(Math.random() * COLORS.length)]
      });
    }

    function begin() {
      cancelAnimationFrame(raf);
      reset();
      running = true;
      startBtn.textContent = "Neustart";
      info.textContent = scoreText();
      prev = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function crash() {
      running = false;
      over = true;
      if (score() > best) {
        best = score();
        try { localStorage.setItem("rennen-best", String(best)); } catch (e) {}
      }
      info.textContent = "Crash! " + scoreText();
      draw();
    }

    function move(d) {
      if (!running) { begin(); return; }
      lane = Math.max(0, Math.min(LANES - 1, lane + d));
    }

    function update(dt) {
      time += dt;
      var v = speed();
      dist += v * dt;
      offset = (offset + v * dt) % 40;
      px += (laneX(lane) - px) * Math.min(1, dt * 14);

      spawnIn -= dt;
      if (spawnIn <= 0) {
        spawn();
        spawnIn = (170 + Math.random() * 130) / v;
      }
      enemies.forEach(function (e) { e.y += v * e.rel * dt; });
      enemies = enemies.filter(function (e) { return e.y < H + CAR_H; });

      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (Math.abs(e.x - px) < CAR_W - 6 && Math.abs(e.y - PY) < CAR_H - 8) { crash(); return; }
      }
      info.textContent = scoreText();
    }

    function drawCar(x, y, color) {
      ctx.fillStyle = "#111";
      ctx.fillRect(x - CAR_W / 2 - 3, y - CAR_H / 2 + 8, 6, 14);
      ctx.fillRect(x + CAR_W / 2 - 3, y - CAR_H / 2 + 8, 6, 14);
      ctx.fillRect(x - CAR_W / 2 - 3, y + CAR_H / 2 - 22, 6, 14);
      ctx.fillRect(x + CAR_W / 2 - 3, y + CAR_H / 2 - 22, 6, 14);
      ctx.fillStyle = color;
      ctx.fillRect(x - CAR_W / 2, y - CAR_H / 2, CAR_W, CAR_H);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(x - CAR_W / 2 + 5, y - CAR_H / 2 + 12, CAR_W - 10, 14);
      ctx.fillRect(x - CAR_W / 2 + 5, y + 8, CAR_W - 10, 10);
    }

    function draw() {
      ctx.fillStyle = css("--line", "#c9d5db");
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#33393f";
      ctx.fillRect(ROAD_X, 0, LANES * LANE_W, H);
      ctx.fillStyle = "#f2f2f2";
      ctx.fillRect(ROAD_X - 3, 0, 3, H);
      ctx.fillRect(ROAD_X + LANES * LANE_W, 0, 3, H);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (var i = 1; i < LANES; i++) {
        for (var y = -40 + offset; y < H; y += 40) ctx.fillRect(ROAD_X + i * LANE_W - 2, y, 4, 22);
      }
      enemies.forEach(function (e) { drawCar(e.x, e.y, e.color); });
      drawCar(px, PY, css("--accent", "#2447d6"));

      if (!running) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.font = "bold 30px system-ui, sans-serif";
        ctx.fillText(over ? "Crash!" : "Bereit?", W / 2, H / 2 - 8);
        ctx.font = "16px system-ui, sans-serif";
        ctx.fillText(over ? "Start drücken für eine neue Runde" : "Start drücken oder lenken", W / 2, H / 2 + 22);
      }
    }

    function frame(t) {
      if (!running) return;
      var dt = Math.min(0.05, (t - prev) / 1000);
      prev = t;
      update(dt);
      if (running) { draw(); raf = requestAnimationFrame(frame); }
    }

    function onKey(e) {
      if (!canvas.offsetParent || e.repeat) return;
      var t = e.target && e.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      var d = 0;
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") d = -1;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") d = 1;
      if (!d) return;
      e.preventDefault();
      move(d);
    }

    canvas.addEventListener("pointerdown", function (e) {
      var rect = canvas.getBoundingClientRect();
      move(e.clientX - rect.left < rect.width / 2 ? -1 : 1);
    });
    startBtn.addEventListener("click", begin);
    document.addEventListener("keydown", onKey);
    document.addEventListener("farbe-geaendert", draw);

    reset();
    running = false;
    draw();
    info.textContent = "Lenke mit den Pfeiltasten (oder A und D). Auf dem Handy: links oder rechts tippen.";

    return function stop() {
      cancelAnimationFrame(raf);
      running = false;
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("farbe-geaendert", draw);
    };
  }
});

;
// ===== quallenimperium.js =====
// Spiel: Quallen-Imperium (Aufbauspiel unter Wasser)
// Sammle Perlen, baue 19 Arten von Unterwasser-Fabriken, erforsche Verbesserungen, fange Goldene Perlen,
// schalte Erfolge frei (je +2 % Produktion, dauerhaft) und erweitere dein Imperium für einen dauerhaften Bonus. Der Fortschritt wird im Browser gespeichert
// und läuft bis zu 8 Stunden weiter, auch wenn die Seite zu ist.
(function () {
  "use strict";

  var SAVE_KEY = "quallenimperium-v1";
  var GROWTH = 1.15;
  var MAX_OFFLINE = 8 * 3600;
  var BOOST_FACTOR = 7, BOOST_SECONDS = 30;
  var PRESTIGE_DIV = 1e9, PRESTIGE_BONUS = 0.04;

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
    { icon: "🪼", name: "Ur-Qualle", makes: "Ur-Energie", cost: 4e16, cps: 7.5e13 }
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
    { cost: 5e14, name: "Portal-Hände" }
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
    { name: "Ur-Strömung", cost: 3.5e19, bonus: 6.00 }
  ];

  var STAGES = [[0, "Korallenlager"], [10, "Unterwasserdorf"], [30, "Riffstadt"], [70, "Tiefsee-Stadt"],
    [150, "Meeresmetropole"], [300, "Atlantis"], [600, "Quallen-Imperium"],[700, "Chinesische-Kinderarbeit"]];

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
    { name: "Quallenschwarm", desc: "10 Quallen besitzen", check: function (s) { return s.quallen >= 10; } }
  ];

  var UNITS = [[1e42, "Sept."], [1e39, "Sxd."], [1e36, "Sext."], [1e33, "Qid."], [1e30, "Quin."], [1e27, "Qdd."],
    [1e24, "Quad."], [1e21, "Trd."], [1e18, "Tri."], [1e15, "Brd."], [1e12, "Bio."], [1e9, "Mrd."], [1e6, "Mio."], [1e3, "Tsd."]];

  // ---------- Spielregeln ----------
  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }

  function newState() {
    return {
      coins: 0, total: 0, allTime: 0, clicks: 0,
      owned: zeros(BUILDINGS.length), mult: zeros(BUILDINGS.length), clickLevel: 0,
      research: zeros(RESEARCH.length), quallen: 0, resets: 0, boostUntil: 0, last: Date.now(),
      ach: zeros(ACHIEVEMENTS.length), golds: 0
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

  function quallenFactor(s) { return 1 + PRESTIGE_BONUS * s.quallen; }
  function boostActive(s, now) { return now < s.boostUntil; }

  function achCount(s) { return s.ach.reduce(function (a, b) { return a + (b ? 1 : 0); }, 0); }
  function achFactor(s) { return 1 + ACH_BONUS * achCount(s); }

  // Schaltet neu erreichte Erfolge frei und gibt deren Namen zurück
  function checkAch(s) {
    var fresh = [];
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      if (!s.ach[i] && ACHIEVEMENTS[i].check(s)) { s.ach[i] = 1; fresh.push(ACHIEVEMENTS[i].name); }
    }
    return fresh;
  }

  function multiplier(s, now) {
    return (1 + researchBonus(s)) * quallenFactor(s) * achFactor(s) * (boostActive(s, now) ? BOOST_FACTOR : 1);
  }

  function cps(s, now) { return baseCps(s) * multiplier(s, now); }

  function clickValue(s, now) {
    return Math.pow(2, s.clickLevel) * (1 + researchBonus(s)) * quallenFactor(s) * achFactor(s) + cps(s, now) * 0.02;
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
  function prestigeGain(s) { return Math.floor(Math.sqrt(s.total / PRESTIGE_DIV)); }

  function prestige(s, now) {
    var g = prestigeGain(s);
    if (g < 1) return 0;
    var keep = { quallen: s.quallen + g, resets: s.resets + 1, allTime: s.allTime, clicks: s.clicks, ach: s.ach.slice(), golds: s.golds };
    var fresh = newState();
    Object.keys(fresh).forEach(function (k) { s[k] = fresh[k]; });
    s.quallen = keep.quallen;
    s.resets = keep.resets;
    s.allTime = keep.allTime;
    s.clicks = keep.clicks;
    s.ach = keep.ach;
    s.golds = keep.golds;
    s.last = now;
    return g;
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
  var CSS =
    ".qi-ocean{position:relative;max-width:34rem;min-height:6.5rem;padding:0.75rem 1rem;margin:0 0 1rem;border-radius:8px;border:1px solid #2a8fc2;background:linear-gradient(#cdeffa,#6cc3e8 55%,#3b97c8);color:#0b2a3d;font-size:1.35rem;line-height:1.5;overflow:hidden}" +
    ".qi-ocean .qi-empty{font-size:0.95rem}" +
    ".qi-row{overflow-wrap:anywhere}" +
    ".qi-gold{position:absolute;padding:0.45rem 0.9rem;font-size:0.95rem;font-weight:700;background:linear-gradient(135deg,#ffe27a,#ffb300);color:#4a3200;border:2px solid #fff;border-radius:999px;box-shadow:0 0 16px #ffd54f;cursor:pointer}" +
    "@media (prefers-reduced-motion: no-preference){.qi-gold{animation:qi-pulse 1s ease-in-out infinite alternate}@keyframes qi-pulse{from{transform:scale(1)}to{transform:scale(1.1)}}}" +
    ".qi-qty{margin:0 0 0.75rem}" +
    ".qi-boost{font-weight:700;color:var(--accent)}" +
    ".qi-done{font-weight:700}" +
    ".qi-stats{padding-left:1.2rem;margin:0.5rem 0 1rem}";

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
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
      var got = earn(s, Math.min(gap, MAX_OFFLINE), now0);
      if (gap > 60 && got > 0) welcome = "Willkommen zurück! Dein Imperium hat in deiner Abwesenheit " + fmt(got) + " Perlen verdient.";
    }
    s.last = now0;

    // --- Kopf ---
    var coinsEl = el("p", "clock-big");
    var rateEl = el("p", "msg");
    var clickBtn = el("button", "big-btn");
    clickBtn.type = "button";

    var ocean = el("div", "qi-ocean");
    ocean.setAttribute("role", "img");
    ocean.setAttribute("aria-label", "Dein Unterwasser-Imperium");
    var gold = el("button", "qi-gold", "✨ Goldene Perle");
    gold.type = "button";
    gold.hidden = true;
    ocean.appendChild(gold);

    var note = el("p", "msg");
    note.setAttribute("aria-live", "polite");
    note.textContent = welcome;

    // --- Reiter ---
    var tabs = el("div", "chips");
    tabs.setAttribute("role", "group");
    tabs.setAttribute("aria-label", "Bereiche");
    var tabBtns = {};
    [["fabriken", "Fabriken"], ["forschung", "Forschung"], ["erfolge", "Erfolge"], ["imperium", "Imperium"]].forEach(function (t) {
      var b = el("button", "chip", t[1]);
      b.type = "button";
      b.addEventListener("click", function () { b.blur(); tab = t[0]; showTab(); refresh(); });
      tabs.appendChild(b);
      tabBtns[t[0]] = b;
    });

    // --- Fabriken ---
    var panelF = el("div");
    var qtyBox = el("div", "chips qi-qty");
    qtyBox.setAttribute("role", "group");
    qtyBox.setAttribute("aria-label", "Kaufmenge");
    var qtyBtns = [];
    [[1, "x1"], [10, "x10"], [100, "x100"], ["max", "Max"]].forEach(function (q) {
      var b = el("button", "chip", q[1]);
      b.type = "button";
      b.addEventListener("click", function () { b.blur(); qty = q[0]; refresh(); });
      qtyBox.appendChild(b);
      qtyBtns.push({ v: q[0], el: b });
    });
    panelF.appendChild(qtyBox);
    var shop = el("ul", "shop");
    var rows = BUILDINGS.map(function (b, i) {
      var li = el("li", "shop-row");
      var info = el("div", "shop-info");
      info.appendChild(el("strong", "", b.icon + " " + b.name));
      var detail = el("span", "msg");
      info.appendChild(detail);
      var btns = el("div", "shop-btns");
      var buyBtn = el("button", "shop-btn");
      buyBtn.type = "button";
      var upBtn = el("button", "shop-btn alt");
      upBtn.type = "button";
      buyBtn.addEventListener("click", function () { if (buy(s, i, qty)) refresh(); });
      upBtn.addEventListener("click", function () { if (upgradeBuilding(s, i)) refresh(); });
      btns.appendChild(buyBtn);
      btns.appendChild(upBtn);
      li.appendChild(info);
      li.appendChild(btns);
      shop.appendChild(li);
      return { li: li, detail: detail, buyBtn: buyBtn, upBtn: upBtn };
    });
    panelF.appendChild(shop);

    // --- Forschung ---
    var panelR = el("div");
    panelR.appendChild(el("p", "label", "Pro Klick"));
    var clickUp = el("button", "shop-btn");
    clickUp.type = "button";
    clickUp.addEventListener("click", function () { if (upgradeClick(s)) refresh(); });
    panelR.appendChild(clickUp);
    panelR.appendChild(el("p", "label", "Forschung (Bonus auf die gesamte Produktion)"));
    var rList = el("ul", "shop");
    var rRows = RESEARCH.map(function (r, i) {
      var li = el("li", "shop-row");
      var info = el("div", "shop-info");
      info.appendChild(el("strong", "", "🔬 " + r.name));
      info.appendChild(el("span", "msg", "+" + Math.round(r.bonus * 100) + " % Produktion"));
      var btns = el("div", "shop-btns");
      var b = el("button", "shop-btn");
      b.type = "button";
      b.addEventListener("click", function () { if (buyResearch(s, i)) refresh(); });
      btns.appendChild(b);
      li.appendChild(info);
      li.appendChild(btns);
      rList.appendChild(li);
      return { btn: b };
    });
    panelR.appendChild(rList);

    // --- Erfolge ---
    var panelA = el("div");
    var aInfo = el("p", "msg");
    panelA.appendChild(aInfo);
    var aList = el("ul", "shop");
    var aRows = ACHIEVEMENTS.map(function (a) {
      var li = el("li", "shop-row");
      var info = el("div", "shop-info");
      var title = el("strong", "", "");
      info.appendChild(title);
      info.appendChild(el("span", "msg", a.desc));
      li.appendChild(info);
      aList.appendChild(li);
      return { title: title, name: a.name };
    });
    panelA.appendChild(aList);

    // --- Imperium ---
    var panelI = el("div");
    panelI.appendChild(el("p", "label", "Imperium erweitern"));
    var pInfo = el("p", "msg");
    var pBtn = el("button", "");
    pBtn.type = "button";
    panelI.appendChild(pInfo);
    panelI.appendChild(pBtn);
    panelI.appendChild(el("p", "label", "Statistik"));
    var statsList = el("ul", "qi-stats");
    panelI.appendChild(statsList);
    var resetBtn = el("button", "link", "Ganz neu beginnen");
    resetBtn.type = "button";
    panelI.appendChild(resetBtn);

    box.appendChild(coinsEl);
    box.appendChild(rateEl);
    box.appendChild(clickBtn);
    box.appendChild(ocean);
    box.appendChild(note);
    box.appendChild(tabs);
    box.appendChild(panelF);
    box.appendChild(panelR);
    box.appendChild(panelA);
    box.appendChild(panelI);

    function showTab() {
      panelF.hidden = tab !== "fabriken";
      panelR.hidden = tab !== "forschung";
      panelA.hidden = tab !== "erfolge";
      panelI.hidden = tab !== "imperium";
      Object.keys(tabBtns).forEach(function (k) { tabBtns[k].setAttribute("aria-pressed", String(k === tab)); });
    }

    var oceanSig = "";
    function renderOcean() {
      var sig = s.owned.join(",");
      if (sig === oceanSig) return;
      oceanSig = sig;
      Array.prototype.slice.call(ocean.children).forEach(function (c) { if (c !== gold) ocean.removeChild(c); });
      var any = false;
      BUILDINGS.forEach(function (b, i) {
        if (!s.owned[i]) return;
        any = true;
        var shown = Math.min(s.owned[i], 10);
        ocean.insertBefore(el("div", "qi-row", new Array(shown + 1).join(b.icon) + (s.owned[i] > shown ? " +" + (s.owned[i] - shown) : "")), gold);
      });
      if (!any) ocean.insertBefore(el("span", "qi-empty", "Das Meer ist noch leer. Sammle Perlen und baue die erste Algenfarm."), gold);
    }

    function refresh() {
      var now = Date.now();
      var rate = cps(s, now);
      coinsEl.textContent = "🦪 " + fmt(s.coins);
      rateEl.textContent = "";
      var bonus = multiplier(s, now) / (boostActive(s, now) ? BOOST_FACTOR : 1);
      rateEl.appendChild(document.createTextNode("Pro Sekunde: " + fmt(rate) + " · " + stageName(s) + " (" + buildingCount(s) + " Fabriken) · Bonus x" + bonus.toFixed(2).replace(".", ",")));
      if (boostActive(s, now)) {
        rateEl.appendChild(document.createTextNode(" · "));
        rateEl.appendChild(el("span", "qi-boost", "Strömungsrausch x" + BOOST_FACTOR + " noch " + Math.ceil((s.boostUntil - now) / 1000) + " s"));
      }
      clickBtn.textContent = "🦪 Perlen sammeln (+" + fmt(clickValue(s, now)) + ")";
      renderOcean();
      Object.keys(tabBtns).forEach(function (k) { tabBtns[k].setAttribute("aria-pressed", String(k === tab)); });

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
          r.detail.textContent = "Besitz: " + s.owned[i] + " · produziert " + b.makes + ": je " + fmt(per) + " pro Sekunde" + (s.owned[i] ? " (" + share + " % deiner Perlen)" : "");
          r.buyBtn.textContent = "Bauen" + (n > 1 ? " x" + n : "") + " (" + fmt(c) + ")";
          r.buyBtn.disabled = s.coins < c;
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
          clickUp.hidden = false;
          clickUp.textContent = u.name + ": Klick x2 (" + fmt(u.cost) + ")";
          clickUp.disabled = s.coins < u.cost;
        } else {
          clickUp.hidden = true;
        }
        RESEARCH.forEach(function (r, i) {
          var b = rRows[i].btn;
          if (s.research[i]) { b.textContent = "✓ erforscht"; b.disabled = true; }
          else { b.textContent = "Erforschen (" + fmt(r.cost) + ")"; b.disabled = s.coins < r.cost; }
        });
      } else if (tab === "erfolge") {
        aInfo.textContent = achCount(s) + " von " + ACHIEVEMENTS.length + " Erfolgen · jeder gibt dauerhaft +" + Math.round(ACH_BONUS * 100) +
          " % Produktion (jetzt +" + Math.round(ACH_BONUS * achCount(s) * 100) + " %). Erfolge bleiben auch nach einer Imperium-Erweiterung erhalten.";
        aRows.forEach(function (r, i) {
          r.title.textContent = (s.ach[i] ? "🏆 " : "🔒 ") + r.name;
        });
      } else {
        var g = prestigeGain(s);
        pInfo.textContent = "Wenn du dein Imperium erweiterst, verlierst du alle Perlen, Fabriken und Forschungen. Dafür bekommst du Quallen: Jede Qualle gibt dauerhaft +" +
          Math.round(PRESTIGE_BONUS * 100) + " % Produktion. Du hast " + s.quallen + " Quallen (+" + Math.round(PRESTIGE_BONUS * s.quallen * 100) + " %). In dieser Runde hast du " + fmt(s.total) + " Perlen verdient.";
        pBtn.textContent = g >= 1 ? "Imperium erweitern (+" + g + " Quallen)" : "Imperium erweitern (ab " + fmt(PRESTIGE_DIV) + " Perlen in einer Runde)";
        pBtn.disabled = g < 1;
        var lines = [
          "Insgesamt verdient: " + fmt(s.allTime) + " Perlen",
          "Klicks: " + fmt(s.clicks),
          "Imperium-Erweiterungen: " + s.resets,
          "Quallen: " + s.quallen,
          "Erfolge: " + achCount(s) + " von " + ACHIEVEMENTS.length,
          "Goldene Perlen gefangen: " + s.golds
        ];
        statsList.textContent = "";
        lines.forEach(function (l) { statsList.appendChild(el("li", "", l)); });
      }
    }

    clickBtn.addEventListener("click", function () {
      var v = clickValue(s, Date.now());
      gain(s, v);
      s.clicks++;
      refresh();
    });

    pBtn.addEventListener("click", function () {
      var g = prestigeGain(s);
      if (g < 1) return;
      if (window.confirm("Imperium erweitern? Du verlierst alle Perlen, Fabriken und Forschungen und bekommst " + g + " Quallen: +" + Math.round(g * PRESTIGE_BONUS * 100) + " % Produktion für immer.")) {
        prestige(s, Date.now());
        oceanSig = "";
        note.textContent = "Dein Imperium wächst! Du hast jetzt " + s.quallen + " Quallen.";
        save(s);
        refresh();
      }
    });

    resetBtn.addEventListener("click", function () {
      if (window.confirm("Wirklich ganz neu beginnen? Alles geht verloren, auch deine Quallen.")) {
        s = newState();
        oceanSig = "";
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
      nextGold = now + 45000 + Math.random() * 65000;
      s.golds++;
      if (Math.random() < 0.6) {
        var amount = Math.max(50, cps(s, now) * 120);
        gain(s, amount);
        note.textContent = "Perlenregen! Du bekommst " + fmt(amount) + " Perlen.";
      } else {
        s.boostUntil = now + BOOST_SECONDS * 1000;
        note.textContent = "Strömungsrausch! " + BOOST_SECONDS + " Sekunden lang x" + BOOST_FACTOR + " Produktion.";
      }
      refresh();
    });

    var lastTick = Date.now(), lastSave = Date.now();
    var timer = setInterval(function () {
      var now = Date.now();
      earn(s, Math.min((now - lastTick) / 1000, MAX_OFFLINE), now);
      lastTick = now;
      var fresh = checkAch(s);
      if (fresh.length) note.textContent = "🏆 Erfolg freigeschaltet: " + fresh.join(", ") + " (+" + Math.round(ACH_BONUS * fresh.length * 100) + " % Produktion)";
      if (now - lastSave > 3000) { save(s); lastSave = now; }
      if (!gold.hidden && now > goldHideAt) { gold.hidden = true; nextGold = now + 45000 + Math.random() * 65000; }
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
      ACHIEVEMENTS: ACHIEVEMENTS, checkAch: checkAch, achCount: achCount, achFactor: achFactor, padTo: padTo,
      newState: newState, cost: cost, costN: costN, maxAffordable: maxAffordable, buy: buy, cps: cps, baseCps: baseCps,
      clickValue: clickValue, upgradeBuilding: upgradeBuilding, canUpgrade: canUpgrade, upgradePrice: upgradePrice,
      upgradeClick: upgradeClick, buyResearch: buyResearch, earn: earn, gain: gain, prestigeGain: prestigeGain, prestige: prestige,
      multiplier: multiplier, stageName: stageName, fmt: fmt, buildingCount: buildingCount, PRESTIGE_DIV: PRESTIGE_DIV
    }
  });
})();

;
// ===== quallenrunner.js =====
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
// Spiel: Rennstrecke (Zeitfahren auf zufällig erzeugten Strecken, 3 Runden)
(function () {
  "use strict";

  var WW = 3200, WH = 2400;   // Größe der Welt
  var VW = 360, VH = 520;     // sichtbarer Ausschnitt
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
    canvas.style.maxWidth = "22.5rem";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "Rennstrecke von oben");
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
      phase = "count";
      countdown = 3.2;
      lapShown = 0;
      best = readBest(track.seed);
      info.textContent = "Strecke " + track.seed + ": " + LAPS + " Runden, so schnell wie möglich." +
        (best ? " Bestzeit: " + fmt(best.total) + "." : "");
    }

    function loadSeed(seed) {
      track = genTrack(seed);
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

    // ----- Zeichnen -----
    function pathTrack() {
      ctx.beginPath();
      ctx.moveTo(track.pts[0].x, track.pts[0].y);
      for (var i = 1; i < track.n; i++) ctx.lineTo(track.pts[i].x, track.pts[i].y);
      ctx.closePath();
    }

    function drawCar() {
      ctx.save();
      ctx.translate(sim.x, sim.y);
      ctx.rotate(sim.a);
      ctx.fillStyle = "#111";
      ctx.fillRect(-15, -12, 9, 4); ctx.fillRect(-15, 8, 9, 4);
      ctx.fillRect(8, -12, 9, 4); ctx.fillRect(8, 8, 9, 4);
      ctx.fillStyle = css("--accent", "#2447d6");
      ctx.fillRect(-18, -9, 36, 18);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(1, -6, 9, 12);
      ctx.restore();
    }

    function hudBox(x, y, w, h) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(x, y, w, h);
    }

    function centerText(text, size, y) {
      ctx.font = "bold " + size + "px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(text, VW / 2, y);
    }

    function draw() {
      cam.x = Math.max(0, Math.min(WW - VW, sim.x - VW / 2 + sim.vx * 0.25));
      cam.y = Math.max(0, Math.min(WH - VH, sim.y - VH / 2 + sim.vy * 0.25));

      ctx.fillStyle = "#5f9e57";
      ctx.fillRect(0, 0, VW, VH);
      ctx.save();
      ctx.translate(-cam.x, -cam.y);

      ctx.fillStyle = "#4d8a47";
      track.bushes.forEach(function (b) {
        if (b.x > cam.x - 30 && b.x < cam.x + VW + 30 && b.y > cam.y - 30 && b.y < cam.y + VH + 30) {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.lineJoin = "round";
      pathTrack();
      ctx.setLineDash([]);
      ctx.lineWidth = ROAD + 14;
      ctx.strokeStyle = "#f2f2f2";
      ctx.stroke();
      ctx.setLineDash([22, 22]);
      ctx.strokeStyle = "#d33a3a";
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = ROAD;
      ctx.strokeStyle = "#3a3f45";
      ctx.stroke();
      ctx.setLineDash([14, 22]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.stroke();
      ctx.setLineDash([]);

      var p0 = track.pts[0], p1 = track.pts[1];
      ctx.save();
      ctx.translate(p0.x, p0.y);
      ctx.rotate(Math.atan2(p1.y - p0.y, p1.x - p0.x));
      for (var k = 0; k < 8; k++) {
        ctx.fillStyle = k % 2 ? "#ffffff" : "#111111";
        ctx.fillRect(-5, -ROAD / 2 + (k * ROAD) / 8, 10, ROAD / 8);
      }
      ctx.restore();

      drawCar();
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
      for (var i = 4; i < track.n; i += 4) ctx.lineTo(VW - 102 + track.pts[i].x * sc, 12 + track.pts[i].y * sc);
      ctx.closePath();
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = css("--accent", "#2447d6");
      ctx.beginPath();
      ctx.arc(VW - 102 + sim.x * sc, 12 + sim.y * sc, 3.5, 0, Math.PI * 2);
      ctx.fill();

      hudBox(8, VH - 34, 96, 26);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillText(Math.round(sim.speed * 0.45) + " km/h", 16, VH - 16);

      ctx.fillStyle = "#fff";
      if (phase === "count") {
        hudBox(0, VH / 2 - 56, VW, 96);
        ctx.fillStyle = "#fff";
        centerText(countdown > 0.4 ? String(Math.ceil(countdown - 0.2)) : "Los!", 56, VH / 2 + 14);
      } else if (phase === "run" && sim.wrong) {
        ctx.fillStyle = "#ff8a80";
        centerText("Falsche Richtung!", 22, 96);
      } else if (phase === "run" && !sim.onRoad) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        centerText("Abseits der Strecke", 15, 96);
      } else if (phase === "done") {
        hudBox(0, VH / 2 - 70, VW, 140);
        ctx.fillStyle = "#fff";
        centerText("Ziel!", 34, VH / 2 - 22);
        centerText(fmt(sim.t), 28, VH / 2 + 16);
        ctx.font = "14px system-ui, sans-serif";
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
  function pieceSvg(p) {
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
    ".sch-elo input[type=range]{width:100%;padding:0;accent-color:var(--accent);background:transparent;border:0}";

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
    var mode = "w";      // "w": du spielst Weiß, "b": du spielst Schwarz, "2": zwei Spieler
    var elo = loadElo();
    var state, keys, stack, last, sel, targets, cur, thinking, timer, stopped = false;

    var markMode = chipRow(box, "Spielmodus",
      [["w", "Als Weiß gegen Computer"], ["b", "Als Schwarz gegen Computer"], ["2", "Zwei Spieler"]],
      function (id) { mode = id; markMode(mode); eloBox.hidden = mode === "2"; newGame(); });

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
    function computerTurn() { return mode !== "2" && state.turn !== humanColor(); }
    function say(t) { info.textContent = t; }

    function statusText() {
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
      var flip = mode === "b";
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
    }

    function afterMove() {
      cur = status(state, keys);
      sel = -1;
      targets = [];
      thinking = !cur.over && computerTurn();
      render();
      if (thinking) timer = setTimeout(computerMove, 60);
    }

    function apply(m) {
      stack.push({ s: state, k: keys.length, last: last });
      state = make(state, m);
      keys.push(keyOf(state));
      last = { from: m.from, to: m.to };
      afterMove();
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
      last = null;
      sel = -1;
      targets = [];
      afterMove();
    }

    function recolor() { render(); }
    document.addEventListener("farbe-geaendert", recolor);

    markMode(mode);
    eloBox.hidden = mode === "2";
    newGame();

    return function stop() {
      stopped = true;
      clearTimeout(timer);
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
// ===== snake.js =====
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
// Werkzeug: Spielstand sichern und übertragen (Rekorde und Fortschritt als kurzer Code oder Datei)
(function () {
  "use strict";

  var FIXED = ["snake-best", "2048-best", "rennen-best", "quallen-best", "quallenimperium-v1", "wortraten-v1", "farben", "helligkeit"];
  var BEST_KEYS = ["snake-best", "2048-best", "rennen-best", "quallen-best"];
  var TRACK = /^rennstrecke:\d{1,6}$/;
  var MAX_VALUE = 200000;

  // ---------- Regeln: was gehört zum Spielstand, was ist gültig ----------
  function isKnownKey(k) { return FIXED.indexOf(k) >= 0 || TRACK.test(k); }

  function parseJson(v) { try { return JSON.parse(v); } catch (e) { return undefined; } }
  function num(n) { return typeof n === "number" && isFinite(n); }

  function validValue(k, v) {
    if (typeof v !== "string" || v.length > MAX_VALUE) return false;
    if (/-best$/.test(k)) return /^\d{1,12}$/.test(v);
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

    var tracks = Object.keys(data).filter(function (k) { return TRACK.test(k); }).map(function (k) {
      var r = JSON.parse(data[k]);
      return [Number(k.split(":")[1]), round2(r.lap), round2(r.total)];
    });
    if (tracks.length) c.r = tracks;

    if (data["quallenimperium-v1"]) {
      var d = JSON.parse(data["quallenimperium-v1"]);
      c.i = [Math.floor(d.coins), Math.floor(d.total), Math.floor(d.allTime || d.total), d.clicks || 0, d.owned, d.mult,
        d.clickLevel || 0, (d.research || []).map(function (x) { return x ? 1 : 0; }).join(""), d.quallen || 0, d.resets || 0,
        (d.ach || []).map(function (x) { return x ? 1 : 0; }).join(""), d.golds || 0];
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
    if (c.b) BEST_KEYS.forEach(function (k, i) { if (c.b[i] !== null && c.b[i] !== undefined) data[k] = String(Math.floor(c.b[i])); });
    (c.r || []).forEach(function (t) { data["rennstrecke:" + t[0]] = JSON.stringify({ lap: t[1], total: t[2] }); });
    if (c.i) {
      var i = c.i;
      data["quallenimperium-v1"] = JSON.stringify({
        coins: i[0], total: i[1], allTime: i[2], clicks: i[3], owned: i[4], mult: i[5], clickLevel: i[6],
        research: String(i[7]).split("").map(Number), quallen: i[8], resets: i[9], boostUntil: 0, last: Date.now(),
        ach: String(i[10] || "").split("").map(Number), golds: Number(i[11]) || 0
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
    if (/-best$/.test(k)) return String(Math.max(Number(local), Number(imported)));
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
    var names = { "snake-best": "Snake", "2048-best": "2048", "rennen-best": "Autorennen", "quallen-best": "Quallen-Runner" };
    Object.keys(names).forEach(function (k) {
      if (data[k] !== undefined) lines.push(names[k] + ": Rekord " + fmtNum(Number(data[k])));
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
// ===== wortraten.js =====
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
