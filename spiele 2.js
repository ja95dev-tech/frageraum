// Alle Spiele und Werkzeuge in einer Datei (wird nur nach dem Login ausgeliefert).

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
// ===== dino.js =====
// Spiel: Dino-Lauf (Endlos-Läufer: springen und ducken, das Tempo steigt)
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
      o.x -= (s.speed + (o.kind === "bird" ? 60 : 0)) * dt;
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
      var levels = [10, 34, 70];            // tief, mittel (ducken), hoch (drunter durchlaufen)
      o = { kind: "bird", x: W + 20, y: levels[Math.floor(rnd() * 3)], w: 34, h: 24, flap: 0 };
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
    canvas.setAttribute("aria-label", "Dino-Lauf");
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
    var clouds = [{ x: 90, y: 30 }, { x: 300, y: 55 }, { x: 520, y: 25 }];
    var offset = 0, best = 0;
    try { best = Number(localStorage.getItem("dino-best")) || 0; } catch (e) {}

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
        try { localStorage.setItem("dino-best", String(best)); } catch (e) {}
      }
      info.textContent = "Game over. " + scoreText();
      draw();
    }

    function drawDino(color, ink) {
      var x = DINO_X, yb = GROUND - s.y;
      var legs = Math.floor(s.t * 10) % 2;
      ctx.fillStyle = color;
      if (s.duck) {
        ctx.fillRect(x, yb - 18, 42, 14);
        ctx.fillRect(x + 32, yb - 26, 18, 14);
        ctx.fillRect(x - 6, yb - 16, 8, 6);
        ctx.fillRect(x + 8, yb - 4, 6, 4 + (legs ? 0 : -2));
        ctx.fillRect(x + 24, yb - 4, 6, 4 + (legs ? -2 : 0));
        ctx.fillStyle = ink;
        ctx.fillRect(x + 44, yb - 23, 3, 3);
      } else {
        ctx.fillRect(x + 4, yb - 32, 24, 22);
        ctx.fillRect(x + 16, yb - 44, 20, 16);
        ctx.fillRect(x - 4, yb - 28, 10, 8);
        var air = !s.onGround;
        ctx.fillRect(x + 8, yb - 10, 6, air ? 10 : (legs ? 10 : 6));
        ctx.fillRect(x + 20, yb - 10, 6, air ? 10 : (legs ? 6 : 10));
        ctx.fillStyle = ink;
        ctx.fillRect(x + 30, yb - 40, 3, 3);
      }
    }

    function drawObstacle(o, ink) {
      var yb = GROUND - o.y;
      ctx.fillStyle = ink;
      if (o.kind === "cactus") {
        for (var i = 0; i < o.stems; i++) {
          var sx = o.x + i * 11 + 3;
          var sh = o.h - (i % 2) * 8;
          ctx.fillRect(sx + 2, yb - sh, 6, sh);
          ctx.fillRect(sx - 2, yb - sh * 0.65, 4, 4);
          ctx.fillRect(sx - 2, yb - sh * 0.65 - 8, 4, 8);
          ctx.fillRect(sx + 8, yb - sh * 0.5, 4, 4);
          ctx.fillRect(sx + 10, yb - sh * 0.5 - 8, 4, 8);
        }
      } else {
        var flap = Math.floor(s.t * 8) % 2;
        ctx.fillRect(o.x + 6, yb - 16, 24, 10);
        ctx.fillRect(o.x, yb - 14, 8, 4);
        ctx.fillRect(o.x + 26, yb - 18, 8, 6);
        ctx.fillRect(o.x + 12, yb - (flap ? 24 : 6), 10, flap ? 8 : 6);
      }
    }

    function draw() {
      var ink = css("--ink", "#17313a");
      ctx.fillStyle = css("--panel", "#ffffff");
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = css("--line", "#c9d5db");
      clouds.forEach(function (c) { ctx.fillRect(c.x, c.y, 46, 8); ctx.fillRect(c.x + 10, c.y - 6, 26, 8); });
      ctx.fillStyle = ink;
      ctx.fillRect(0, GROUND, W, 2);
      for (var x = -(offset % 40); x < W; x += 40) ctx.fillRect(x, GROUND + 8, 14, 2);
      s.obstacles.forEach(function (o) { drawObstacle(o, ink); });
      drawDino(css("--accent", "#2447d6"), css("--panel", "#ffffff"));

      ctx.fillStyle = ink;
      ctx.textAlign = "right";
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillText("HI " + best + "   " + s.score, W - 12, 24);

      if (!running) {
        ctx.textAlign = "center";
        ctx.font = "bold 24px system-ui, sans-serif";
        ctx.fillText(s.dead ? "Game over" : "Bereit?", W / 2, 72);
        ctx.font = "15px system-ui, sans-serif";
        ctx.fillText(s.dead ? "Leertaste oder Tippen für eine neue Runde" : "Leertaste, Pfeil hoch oder Tippen zum Starten", W / 2, 98);
      }
    }

    function frame(t) {
      if (!running) return;
      var dt = Math.min(0.033, (t - prev) / 1000);
      prev = t;
      step(s, { jump: jumpQueued || keys.jump, duck: keys.duck }, Math.random, dt);
      jumpQueued = false;
      offset += s.speed * dt;
      clouds.forEach(function (c) { c.x -= s.speed * 0.15 * dt; if (c.x < -60) { c.x = W + 20; c.y = 20 + Math.random() * 50; } });
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
    info.textContent = "Springen: Leertaste oder Pfeil hoch. Ducken: Pfeil runter. Auf dem Handy: Tasten unten oder aufs Feld tippen.";

    return function stop() {
      running = false;
      cancelAnimationFrame(raf);
      keys.jump = keys.duck = false;
      document.removeEventListener("keydown", onDown);
      document.removeEventListener("keyup", onUp);
      document.removeEventListener("farbe-geaendert", draw);
    };
  }

  (window.Spiele = window.Spiele || []).push({
    id: "dino",
    name: "Dino-Lauf",
    start: start,
    _engine: { newState: newState, step: step, DINO_X: DINO_X, DINO_W: DINO_W, STAND_H: STAND_H, DUCK_H: DUCK_H }
  });
})();

;
// ===== dorfaufbau.js =====
// Spiel: Dorfaufbau (Aufbauspiel). Sammle Münzen, baue Gebäude, und aus dem Weiler wird eine Metropole.
// Der Fortschritt wird im Browser gespeichert und läuft bis zu 8 Stunden weiter, auch wenn die Seite zu ist.
(function () {
  "use strict";

  var SAVE_KEY = "dorfaufbau-v1";
  var GROWTH = 1.15;
  var MAX_OFFLINE = 8 * 3600;

  var BUILDINGS = [
    { icon: "🌾", name: "Bauernhof", cost: 15, cps: 0.2 },
    { icon: "🪵", name: "Sägewerk", cost: 100, cps: 1.2 },
    { icon: "🥖", name: "Bäckerei", cost: 650, cps: 7 },
    { icon: "🏪", name: "Markt", cost: 4000, cps: 38 },
    { icon: "⛏️", name: "Mine", cost: 25000, cps: 210 },
    { icon: "⛵", name: "Hafen", cost: 160000, cps: 1200 },
    { icon: "🏰", name: "Burg", cost: 1000000, cps: 7000 },
    { icon: "🧙", name: "Zauberturm", cost: 7500000, cps: 42000 }
  ];

  // Jede Stufe verdoppelt den Klick-Ertrag
  var CLICK_UPGRADES = [
    { cost: 100, name: "Starke Hände" },
    { cost: 2500, name: "Schubkarre" },
    { cost: 50000, name: "Goldene Schaufel" },
    { cost: 1000000, name: "Königlicher Auftrag" }
  ];

  // Gebäude-Verbesserungen: verdoppeln den Ertrag eines Gebäudetyps
  var MULT_RULES = [
    { need: 10, factor: 50 },
    { need: 25, factor: 500 },
    { need: 50, factor: 5000 }
  ];

  var STAGES = [[0, "Weiler"], [10, "Dorf"], [30, "Kleinstadt"], [70, "Stadt"], [150, "Großstadt"], [300, "Metropole"]];
  var UNITS = [[1e15, "Brd."], [1e12, "Bio."], [1e9, "Mrd."], [1e6, "Mio."], [1e3, "Tsd."]];

  // ---------- Spielregeln ----------
  function zeros() { return BUILDINGS.map(function () { return 0; }); }

  function newState() {
    return { coins: 0, total: 0, clicks: 0, owned: zeros(), mult: zeros(), clickLevel: 0, last: Date.now() };
  }

  function cost(i, owned) { return Math.ceil(BUILDINGS[i].cost * Math.pow(GROWTH, owned)); }
  function perBuilding(s, i) { return BUILDINGS[i].cps * Math.pow(2, s.mult[i]); }

  function cps(s) {
    var sum = 0;
    for (var i = 0; i < BUILDINGS.length; i++) sum += s.owned[i] * perBuilding(s, i);
    return sum;
  }

  function clickValue(s) { return Math.pow(2, s.clickLevel) + cps(s) * 0.02; }

  function buy(s, i) {
    var c = cost(i, s.owned[i]);
    if (s.coins < c) return false;
    s.coins -= c;
    s.owned[i]++;
    return true;
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

  function earn(s, seconds) {
    var amount = cps(s) * seconds;
    s.coins += amount;
    s.total += amount;
    return amount;
  }

  function buildingCount(s) { return s.owned.reduce(function (a, b) { return a + b; }, 0); }

  function stageName(s) {
    var n = buildingCount(s), name = STAGES[0][1];
    STAGES.forEach(function (st) { if (n >= st[0]) name = st[1]; });
    return name;
  }

  function fmt(n) {
    if (!isFinite(n)) return "∞";
    if (n < 1000) {
      return n < 100 && Math.floor(n) !== n ? n.toFixed(1).replace(".", ",") : String(Math.floor(n));
    }
    for (var i = 0; i < UNITS.length; i++) {
      if (n >= UNITS[i][0]) return (n / UNITS[i][0]).toFixed(2).replace(".", ",") + " " + UNITS[i][1];
    }
    return String(Math.floor(n));
  }

  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (v && Array.isArray(v.owned) && v.owned.length === BUILDINGS.length && Array.isArray(v.mult) && isFinite(v.coins)) {
        v.mult = v.mult.length === BUILDINGS.length ? v.mult : zeros();
        v.clickLevel = v.clickLevel || 0;
        v.last = v.last || Date.now();
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
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function start(box) {
    var s = load();
    var welcome = "";
    var gap = (Date.now() - s.last) / 1000;
    if (gap > 1) {
      var got = earn(s, Math.min(gap, MAX_OFFLINE));
      if (gap > 60 && got > 0) welcome = "Willkommen zurück! Dein Dorf hat in deiner Abwesenheit " + fmt(got) + " Münzen verdient.";
    }
    s.last = Date.now();

    var coinsEl = el("p", "clock-big");
    var rateEl = el("p", "msg");
    var clickBtn = el("button", "big-btn");
    clickBtn.type = "button";

    var city = el("div", "city");
    city.setAttribute("role", "img");
    city.setAttribute("aria-label", "Deine Stadt");

    var clickUp = el("button", "shop-btn");
    clickUp.type = "button";

    var shop = el("ul", "shop");
    var rows = BUILDINGS.map(function (b, i) {
      var li = el("li", "shop-row");
      var info = el("div", "shop-info");
      var title = el("strong", "", b.icon + " " + b.name);
      var detail = el("span", "msg");
      info.appendChild(title);
      info.appendChild(detail);
      var btns = el("div", "shop-btns");
      var buyBtn = el("button", "shop-btn");
      buyBtn.type = "button";
      var upBtn = el("button", "shop-btn alt");
      upBtn.type = "button";
      buyBtn.addEventListener("click", function () { if (buy(s, i)) refresh(); });
      upBtn.addEventListener("click", function () { if (upgradeBuilding(s, i)) refresh(); });
      btns.appendChild(buyBtn);
      btns.appendChild(upBtn);
      li.appendChild(info);
      li.appendChild(btns);
      shop.appendChild(li);
      return { detail: detail, buyBtn: buyBtn, upBtn: upBtn };
    });

    var note = el("p", "msg");
    note.setAttribute("aria-live", "polite");
    note.textContent = welcome;
    var resetBtn = el("button", "link", "Neu beginnen");
    resetBtn.type = "button";

    box.appendChild(coinsEl);
    box.appendChild(rateEl);
    box.appendChild(clickBtn);
    box.appendChild(city);
    box.appendChild(clickUp);
    box.appendChild(shop);
    box.appendChild(note);
    box.appendChild(resetBtn);

    var citySig = "";

    function renderCity() {
      var sig = s.owned.join(",");
      if (sig === citySig) return;
      citySig = sig;
      city.textContent = "";
      var any = false;
      BUILDINGS.forEach(function (b, i) {
        if (!s.owned[i]) return;
        any = true;
        var shown = Math.min(s.owned[i], 12);
        var line = el("div", "city-row", new Array(shown + 1).join(b.icon) + (s.owned[i] > shown ? " +" + (s.owned[i] - shown) : ""));
        city.appendChild(line);
      });
      if (!any) city.appendChild(el("span", "msg", "Dein Land ist noch leer. Sammle Münzen und baue den ersten Bauernhof."));
    }

    function refresh() {
      coinsEl.textContent = "🪙 " + fmt(s.coins);
      rateEl.textContent = "Pro Sekunde: " + fmt(cps(s)) + " · " + stageName(s) + " (" + buildingCount(s) + " Gebäude)";
      clickBtn.textContent = "🪙 Münzen sammeln (+" + fmt(clickValue(s)) + ")";

      if (s.clickLevel < CLICK_UPGRADES.length) {
        var u = CLICK_UPGRADES[s.clickLevel];
        clickUp.hidden = false;
        clickUp.textContent = u.name + ": Klick x2 (" + fmt(u.cost) + ")";
        clickUp.disabled = s.coins < u.cost;
      } else {
        clickUp.hidden = true;
      }

      BUILDINGS.forEach(function (b, i) {
        var r = rows[i], c = cost(i, s.owned[i]);
        r.detail.textContent = "Besitz: " + s.owned[i] + " · je " + fmt(perBuilding(s, i)) + " pro Sekunde";
        r.buyBtn.textContent = "Bauen (" + fmt(c) + ")";
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
      renderCity();
    }

    clickBtn.addEventListener("click", function () {
      var v = clickValue(s);
      s.coins += v;
      s.total += v;
      s.clicks++;
      refresh();
    });
    clickUp.addEventListener("click", function () { if (upgradeClick(s)) refresh(); });
    resetBtn.addEventListener("click", function () {
      if (window.confirm("Wirklich neu beginnen? Der gesamte Fortschritt geht verloren.")) {
        s = newState();
        citySig = "";
        note.textContent = "";
        save(s);
        refresh();
      }
    });

    var lastTick = Date.now(), lastSave = Date.now();
    var timer = setInterval(function () {
      var now = Date.now();
      earn(s, Math.min((now - lastTick) / 1000, MAX_OFFLINE));
      lastTick = now;
      if (now - lastSave > 3000) { save(s); lastSave = now; }
      refresh();
    }, 100);

    refresh();

    return function stop() {
      clearInterval(timer);
      save(s);
    };
  }

  (window.Spiele = window.Spiele || []).push({
    id: "dorfaufbau",
    name: "Dorfaufbau",
    start: start,
    _engine: {
      BUILDINGS: BUILDINGS, MULT_RULES: MULT_RULES, CLICK_UPGRADES: CLICK_UPGRADES, newState: newState, cost: cost,
      cps: cps, clickValue: clickValue, buy: buy, upgradeBuilding: upgradeBuilding, canUpgrade: canUpgrade,
      upgradePrice: upgradePrice, upgradeClick: upgradeClick, earn: earn, fmt: fmt, stageName: stageName
    }
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
// Spiel: Schach (alle Regeln, Computergegner in drei Stufen, Zwei-Spieler-Modus)
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

  // ---------- Computergegner ----------
  function evaluate(s) {
    var score = 0;
    for (var sq = 0; sq < 64; sq++) {
      var p = s.b[sq];
      if (p === "") continue;
      var lp = p.toLowerCase(), r = sq >> 3, f = sq & 7;
      var v = VAL[lp];
      var dist = Math.max(Math.abs(r - 3.5), Math.abs(f - 3.5));
      if (lp === "n" || lp === "b") v += (3.5 - dist) * 8;
      if (lp === "p") v += (isWhite(p) ? 6 - r : r - 1) * 6 + (3.5 - dist) * 2;
      score += isWhite(p) ? v : -v;
    }
    return s.turn === "w" ? score : -score;
  }

  function orderScore(m, b) {
    var cap = b[m.to] !== "" ? VAL[b[m.to].toLowerCase()] * 10 - VAL[b[m.from].toLowerCase()] / 10 : 0;
    return cap + (m.promo === "q" ? 800 : 0);
  }

  function negamax(s, depth, alpha, beta, ply) {
    var ms = legalMoves(s);
    if (!ms.length) return inCheck(s) ? -100000 + ply : 0;
    if (depth === 0) return evaluate(s);
    ms.sort(function (x, y) { return orderScore(y, s.b) - orderScore(x, s.b); });
    var best = -Infinity;
    for (var i = 0; i < ms.length; i++) {
      var v = -negamax(make(s, ms[i]), depth - 1, -beta, -alpha, ply + 1);
      if (v > best) best = v;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  function bestMove(s, depth, noise) {
    var ms = legalMoves(s);
    ms.sort(function (x, y) { return orderScore(y, s.b) - orderScore(x, s.b); });
    var best = null, bv = -Infinity;
    ms.forEach(function (m) {
      var v = -negamax(make(s, m), depth - 1, -Infinity, Infinity, 1) + Math.random() * noise;
      if (v > bv) { bv = v; best = m; }
    });
    return best;
  }

  var LEVELS = { 1: { depth: 1, noise: 60 }, 2: { depth: 2, noise: 10 }, 3: { depth: 3, noise: 3 } };

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
    var mode = "w";      // "w": du spielst Weiß, "b": du spielst Schwarz, "2": zwei Spieler
    var level = 2;
    var state, keys, stack, last, sel, targets, cur, thinking, timer, stopped = false;

    var markMode = chipRow(box, "Spielmodus",
      [["w", "Als Weiß gegen Computer"], ["b", "Als Schwarz gegen Computer"], ["2", "Zwei Spieler"]],
      function (id) { mode = id; markMode(mode); newGame(); });
    var markLevel = chipRow(box, "Stufe",
      [[1, "Leicht"], [2, "Mittel"], [3, "Stark"]],
      function (id) { level = id; markLevel(level); });

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
      var who = state.turn === "w" ? "Weiß" : "Schwarz";
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
        c.textContent = p ? GLYPH[p.toLowerCase()] + "\uFE0E" : "";
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
      var lv = LEVELS[level];
      var m = bestMove(state, lv.depth, lv.noise);
      thinking = false;
      if (m) apply(m); else afterMove();
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
    markLevel(level);
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
    _engine: { fromFEN: fromFEN, legalMoves: legalMoves, make: make, status: status, bestMove: bestMove, keyOf: keyOf, START: START }
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

  (window.Spiele = window.Spiele || []).push({
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
