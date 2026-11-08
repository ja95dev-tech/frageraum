  // DEMO_MODUS = true: Die Seite läuft ohne Server (Passwort: demo), nur zum Ansehen des Designs.
  var DEMO_MODUS = false;

  var $ = function (id) { return document.getElementById(id); };
  var loginView = $("login"), askView = $("ask");

  function show(view) {
    loginView.hidden = view !== "login";
    askView.hidden = view !== "ask";
    if (view === "login") $("pw").focus(); else $("q").focus();
  }

  function setMsg(el, text, isError) {
    el.textContent = text || "";
    el.className = "msg" + (isError ? " error" : "");
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function api(path, body) {
    if (DEMO_MODUS) {
      await wait(600);
      if (path === "/api/login") {
        return body.password === "demo" ? { ok: true } : { ok: false, status: 401 };
      }
      if (path === "/api/ask") {
        return { ok: true, answer: "Das ist eine Beispiel-Antwort im Demo-Modus.\n\nDeine Frage war:\n„" + body.question + "“" };
      }
      return { ok: true };
    }
    var res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {})
    });
    var data = {};
    try { data = await res.json(); } catch (e) {}
    data.ok = res.ok;
    data.status = res.status;
    return data;
  }

  $("login-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var btn = $("login-btn");
    btn.disabled = true;
    setMsg($("login-msg"), "Prüfe Passwort …");
    try {
      var r = await api("/api/login", { password: $("pw").value });
      if (r.ok) {
        $("pw").value = "";
        setMsg($("login-msg"), "");
        show("ask");
      } else if (r.status === 429) {
        setMsg($("login-msg"), "Zu viele Versuche. Warte einige Minuten und versuche es erneut.", true);
      } else {
        setMsg($("login-msg"), "Das Passwort ist falsch. Prüfe die Eingabe und versuche es erneut.", true);
      }
    } catch (e) {
      setMsg($("login-msg"), "Keine Verbindung zum Server. Versuche es gleich noch einmal.", true);
    }
    btn.disabled = false;
  });

  $("ask-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    var btn = $("ask-btn");
    var question = $("q").value.trim();
    if (!question) return;
    btn.disabled = true;
    $("answer").hidden = true;
    setMsg($("ask-msg"), "Gemini denkt nach …");
    try {
      var r = await api("/api/ask", { question: question });
      if (r.ok) {
        $("answer-text").textContent = r.answer;
        $("answer").hidden = false;
        setMsg($("ask-msg"), "");
      } else if (r.status === 401) {
        show("login");
        setMsg($("login-msg"), "Die Sitzung ist abgelaufen. Gib das Passwort erneut ein.", true);
      } else if (r.status === 429) {
        setMsg($("ask-msg"), "Das kostenlose Limit ist erreicht. Versuche es in einigen Minuten oder morgen erneut.", true);
      } else {
        setMsg($("ask-msg"), "Die Antwort konnte nicht geladen werden. Versuche es erneut.", true);
      }
    } catch (e) {
      setMsg($("ask-msg"), "Keine Verbindung zum Server. Versuche es gleich noch einmal.", true);
    }
    btn.disabled = false;
  });

  $("logout-btn").addEventListener("click", async function () {
    try { await api("/api/logout"); } catch (e) {}
    $("q").value = "";
    $("answer").hidden = true;
    setMsg($("ask-msg"), "");
    show("login");
  });

(function () {
  "use strict";

  var root = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  // ---------- Farbe (eine oder mehrere Farben, mehrere ergeben einen Farbverlauf) ----------
  var PRESETS = [
    ["Blau", "#2447d6"],
    ["Grün", "#1f8a5b"],
    ["Türkis", "#0f8f98"],
    ["Violett", "#7a3fc4"],
    ["Rot", "#c62f3a"],
    ["Orange", "#d9651a"],
    ["Gelb", "#e8b400"],
    ["Rosa", "#d6409f"]
  ];
  var MAX_COLORS = 5;
  var HEX = /^#[0-9a-f]{6}$/i;
  var colors = [];

  function luminance(hex) {
    var n = parseInt(hex.slice(1), 16);
    var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  // Schriftfarbe auf Buttons: die, die auf allen gewählten Farben am besten lesbar ist
  function inkFor(list) {
    var dark = "#0c1530", white = "#ffffff";
    function worst(ink) {
      var li = luminance(ink);
      return Math.min.apply(null, list.map(function (c) {
        var l = luminance(c);
        return (Math.max(l, li) + 0.05) / (Math.min(l, li) + 0.05);
      }));
    }
    return worst(white) >= worst(dark) ? white : dark;
  }

  function setColorMsg(text) { $("color-msg").textContent = text || ""; }

  function applyColors(save) {
    ["--accent", "--accent-ink", "--accent-gradient", "--bg-gradient"].forEach(function (p) {
      root.style.removeProperty(p);
    });
    if (colors.length) {
      root.style.setProperty("--accent", colors[0]);
      root.style.setProperty("--accent-ink", inkFor(colors));
    }
    if (colors.length > 1) {
      root.style.setProperty("--accent-gradient", "linear-gradient(135deg, " + colors.join(", ") + ")");
      root.style.setProperty("--bg-gradient", "linear-gradient(160deg, " + colors.map(function (c) {
        return "color-mix(in srgb, " + c + " 22%, var(--paper))";
      }).join(", ") + ")");
    }
    if (save) {
      if (colors.length) store.set("farben", JSON.stringify(colors)); else store.del("farben");
      store.del("farbe");
    }
    renderColors();
    document.dispatchEvent(new Event("farbe-geaendert"));
  }

  function renderColors() {
    var box = $("swatches");
    box.textContent = "";
    var all = PRESETS.map(function (p) { return { name: p[0], hex: p[1] }; });
    colors.forEach(function (c) {
      if (!all.some(function (a) { return a.hex === c; })) all.push({ name: "Eigene Farbe " + c, hex: c });
    });
    all.forEach(function (c) {
      var pos = colors.indexOf(c.hex);
      var b = document.createElement("button");
      b.type = "button";
      b.className = "swatch";
      b.dataset.hex = c.hex;
      b.style.background = c.hex;
      b.style.color = inkFor([c.hex]);
      b.textContent = pos >= 0 ? String(pos + 1) : "";
      b.setAttribute("aria-label", c.name + (pos >= 0 ? ", gewählt als Farbe " + (pos + 1) : ""));
      b.setAttribute("aria-pressed", String(pos >= 0));
      b.addEventListener("click", function () { toggleColor(c.hex); });
      box.appendChild(b);
    });
    $("gradient-preview").style.background = colors.length > 1
      ? "linear-gradient(90deg, " + colors.join(", ") + ")"
      : (colors.length ? colors[0] : "var(--accent)");
    $("gradient-text").textContent = colors.length > 1
      ? "Farbverlauf aus " + colors.length + " Farben"
      : (colors.length ? "Eine Farbe (einfarbig)" : "Standardfarbe");
  }

  function toggleColor(hex) {
    setColorMsg("");
    var i = colors.indexOf(hex);
    if (i >= 0) colors.splice(i, 1);
    else if (colors.length >= MAX_COLORS) { setColorMsg("Du kannst höchstens " + MAX_COLORS + " Farben wählen."); return; }
    else colors.push(hex);
    applyColors(true);
    var f = $("swatches").querySelector('[data-hex="' + hex + '"]');
    if (f) f.focus();
  }

  $("color-add").addEventListener("click", function () {
    var hex = $("custom-color").value.toLowerCase();
    if (!HEX.test(hex)) return;
    if (colors.indexOf(hex) >= 0) { setColorMsg("Diese Farbe ist schon gewählt."); return; }
    toggleColor(hex);
  });
  $("color-reset").addEventListener("click", function () {
    colors = [];
    setColorMsg("");
    applyColors(true);
  });

  // Gespeicherte Farben laden (auch die einzelne Farbe aus der älteren Version)
  (function () {
    var saved = null;
    try { saved = JSON.parse(store.get("farben")); } catch (e) {}
    if (!Array.isArray(saved)) {
      var old = store.get("farbe");
      saved = old ? [old] : [];
    }
    colors = saved
      .filter(function (c, i) { return typeof c === "string" && HEX.test(c) && saved.indexOf(c) === i; })
      .map(function (c) { return c.toLowerCase(); })
      .slice(0, MAX_COLORS);
  })();

  // ---------- Helligkeit ----------
  function applyTheme(mode, save) {
    if (mode === "light" || mode === "dark") root.setAttribute("data-theme", mode);
    else { mode = "auto"; root.removeAttribute("data-theme"); }
    var buttons = document.querySelectorAll("#themes .chip");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-pressed", String(buttons[i].dataset.theme === mode));
    }
    if (save) store.set("helligkeit", mode);
    document.dispatchEvent(new Event("farbe-geaendert"));
  }

  document.querySelectorAll("#themes .chip").forEach(function (b) {
    b.addEventListener("click", function () { applyTheme(b.dataset.theme, true); });
  });

  applyColors(false);
  applyTheme(store.get("helligkeit") || "auto", false);

  // ---------- Reiter ----------
  var tabs = document.querySelectorAll(".tab");
  var panels = {
    fragen: $("panel-fragen"), spiele: $("panel-spiele"), spielstand: $("panel-spielstand"),
    uhr: $("panel-uhr"), farbe: $("panel-farbe")
  };
  var activeTab = "fragen";

  function showTab(name) {
    activeTab = name;
    tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.tab === name)); });
    Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== name; });
    stopGame();
    stopTools();
    if (name === "spiele") initGames();
    else if (name === "spielstand" || name === "uhr") initTool(name);
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { showTab(t.dataset.tab); });
  });

  $("logout-btn").addEventListener("click", function () {
    showTab("fragen");
  });

  // ---------- spiele.js laden (Spiele, Uhr und Spielstand stecken in dieser einen Datei) ----------
  var gamesLoaded = false;
  var loadPromise = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error(src)); };
      document.head.appendChild(s);
    });
  }

  async function doLoad() {
    try {
      if (!window.DEMO_MODUS) {
        var r = await fetch("/spiele.js", { credentials: "same-origin" });
        if (r.status === 401) return { ok: false, msg: "Die Sitzung ist abgelaufen. Melde dich erneut an." };
        if (!r.ok) return { ok: false, msg: "Die Datei spiele.js konnte nicht geladen werden (Fehler " + r.status + "). Sie fehlt vermutlich auf dem Server." };
        await loadScript("/spiele.js");
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: "Die Datei spiele.js konnte nicht geladen werden. Prüfe die Verbindung und versuche es erneut." };
    }
  }

  // Lädt höchstens einmal, auch wenn man schnell zwischen den Reitern wechselt
  function ensureLoaded() {
    if (gamesLoaded) return Promise.resolve({ ok: true });
    if (!loadPromise) {
      loadPromise = doLoad().then(function (res) {
        if (res.ok) gamesLoaded = true;
        loadPromise = null;
        return res;
      });
    }
    return loadPromise;
  }

  function messageEl(text, isError) {
    var p = document.createElement("p");
    p.className = "msg" + (isError ? " error" : "");
    p.textContent = text;
    return p;
  }

  // ---------- Werkzeuge: Uhr und Spielstand ----------
  var toolStops = {};

  function stopTools() {
    Object.keys(toolStops).forEach(function (k) {
      if (typeof toolStops[k] === "function") toolStops[k]();
    });
    toolStops = {};
  }

  function findTool(id) {
    var list = (window.Werkzeuge || []).concat(window.Spiele || []);   // eine ältere spiele.js hat sie unter "Spiele"
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  async function initTool(name) {
    var box = $("tool-" + name);
    box.textContent = "";
    if (!gamesLoaded) box.appendChild(messageEl("Lade …", false));
    var r = await ensureLoaded();
    if (activeTab !== name) return;
    box.textContent = "";
    if (!r.ok) { box.appendChild(messageEl(r.msg, true)); return; }
    var tool = findTool(name);
    if (!tool) { box.appendChild(messageEl("Dieses Werkzeug fehlt in der Datei spiele.js. Lade die neueste spiele.js hoch.", true)); return; }
    toolStops[name] = tool.start(box);
  }

  // ---------- Spiele ----------
  var current = null;
  var stopFn = null;
  var listRendered = false;

  function setGamesMsg(text, isError) {
    var el = $("games-msg");
    el.textContent = text || "";
    el.className = "msg" + (isError ? " error" : "");
  }

  function stopGame() {
    if (typeof stopFn === "function") stopFn();
    stopFn = null;
  }

  function markChips() {
    var chips = document.querySelectorAll("#game-list .chip");
    chips.forEach(function (c) {
      c.setAttribute("aria-pressed", String(!!current && c.dataset.id === current.id));
    });
  }

  function pick(game) {
    stopGame();
    current = game;
    $("game-stage").textContent = "";
    stopFn = game.start($("game-stage"));
    markChips();
  }

  function renderList() {
    var list = $("game-list");
    list.textContent = "";
    (window.Spiele || []).forEach(function (g) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.id = g.id;
      b.textContent = g.name;
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () { pick(g); });
      list.appendChild(b);
    });
  }

  async function initGames() {
    if (!gamesLoaded) setGamesMsg("Lade Spiele …", false);
    var r = await ensureLoaded();
    if (activeTab !== "spiele") return;      // man hat den Reiter inzwischen gewechselt
    if (!r.ok) { setGamesMsg(r.msg, true); return; }
    setGamesMsg("", false);
    if (!listRendered) { renderList(); listRendered = true; }
    var games = window.Spiele || [];
    if (!games.length) { setGamesMsg("Noch keine Spiele vorhanden.", false); return; }
    pick(current || games[0]);
  }
})();
