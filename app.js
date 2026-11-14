  // DEMO_MODUS = true: Die Seite läuft ohne Server (Passwort: demo), nur zum Ansehen des Designs.
  var DEMO_MODUS = false;

(function () {
  "use strict";

  var root = document.documentElement;
  var $ = function (id) { return document.getElementById(id); };

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function setMsg(node, text, isError) {
    node.textContent = text || "";
    node.className = "msg" + (isError ? " error" : "");
  }

  // ======================================================================
  // Server-Aufrufe
  // ======================================================================
  async function api(path, body) {
    if (DEMO_MODUS) {
      await wait(600);
      if (path === "/api/login") return body.password === "demo" ? { ok: true } : { ok: false, status: 401 };
      if (path === "/api/ask") {
        return { ok: true, answer: "Das ist eine **Beispiel-Antwort** im Demo-Modus.\n\nDeine Frage war:\n- „" + body.question + "“\n- Sie wird hier nur angezeigt." };
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

  // ======================================================================
  // Ansichten und Anmeldung
  // ======================================================================
  var loginView = $("login"), appView = $("app");
  var activeTab = "start";

  function show(view) {
    loginView.hidden = view !== "login";
    appView.hidden = view !== "app";
    if (view === "login") $("pw").focus();
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
        show("app");
        showTab("start");
      } else if (r.status === 429) {
        setMsg($("login-msg"), "Zu viele Versuche. Warte einige Minuten und versuche es erneut.", true);
      } else {
        setMsg($("login-msg"), "Das Passwort ist falsch. Prüfe die Eingabe und versuche es erneut.", true);
      }
    } catch (err) {
      setMsg($("login-msg"), "Keine Verbindung zum Server. Versuche es gleich noch einmal.", true);
    }
    btn.disabled = false;
  });

  $("logout-btn").addEventListener("click", async function () {
    try { await api("/api/logout"); } catch (e) {}
    $("q").value = "";
    updateCount();
    $("answer").hidden = true;
    setMsg($("ask-msg"), "");
    stopGame();
    stopTools();
    show("login");
  });

  // ======================================================================
  // Farbe (eine oder mehrere Farben, mehrere ergeben einen Farbverlauf)
  // ======================================================================
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
  // Fertige Farbthemen (ein Klick setzt die ganze Farbfolge)
  var PALETTES = [
    ["Lagune", ["#0f8f98", "#1f8a5b"]],
    ["Tiefsee", ["#2447d6", "#0f8f98"]],
    ["Korallenriff", ["#d6409f", "#d9651a", "#e8b400"]],
    ["Nordlicht", ["#1f8a5b", "#0f8f98", "#7a3fc4"]],
    ["Sonnenuntergang", ["#e8b400", "#d9651a", "#c62f3a", "#7a3fc4"]],
    ["Kirschblüte", ["#d6409f", "#7a3fc4"]]
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

  function sameColors(a, b) {
    return a.length === b.length && a.every(function (c, i) { return c === b[i]; });
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
    // Farbthemen markieren
    var pals = document.querySelectorAll("#palettes .chip");
    for (var i = 0; i < pals.length; i++) {
      pals[i].setAttribute("aria-pressed", String(sameColors(colors, PALETTES[i][1])));
    }
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

  // Farbthemen als Knöpfe mit kleiner Vorschau
  PALETTES.forEach(function (p) {
    var b = el("button", "chip");
    b.type = "button";
    var sw = el("span", "pal-sw");
    sw.setAttribute("aria-hidden", "true");
    sw.style.background = p[1].length > 1 ? "linear-gradient(90deg, " + p[1].join(", ") + ")" : p[1][0];
    b.appendChild(sw);
    b.appendChild(document.createTextNode(p[0]));
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", function () {
      setColorMsg("");
      if (sameColors(colors, p[1])) colors = [];      // zweiter Klick: zurück zur Standardfarbe
      else colors = p[1].slice();
      applyColors(true);
    });
    $("palettes").appendChild(b);
  });

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

  // ======================================================================
  // Fragen
  // ======================================================================
  var SUGGESTIONS = [
    "Warum ist das Meer salzig?",
    "Erkläre mir den Unterschied zwischen Wetter und Klima.",
    "Wie funktioniert ein Kühlschrank?",
    "Was passiert, wenn ein Stern stirbt?",
    "Schreibe ein kurzes Gedicht über Quallen.",
    "Was ist der Unterschied zwischen Kraken und Tintenfischen?",
    "Wie lerne ich Vokabeln schneller?",
    "Gib mir drei Ideen für ein Abendessen mit Linsen.",
    "Hilf mir, eine freundliche Absage per E-Mail zu schreiben.",
    "Welche Tricks gibt es für schnelles Kopfrechnen?",
    "Erkläre mir Zinseszins an einem Beispiel.",
    "Wie schreibe ich einen guten Lebenslauf?",
    "Warum träumen wir?",
    "Wie funktioniert ein Elektromotor?"
  ];
  var HISTORY_KEY = "fragen-verlauf-v1";
  var HISTORY_MAX = 8;
  var suggestStart = 0;

  function renderSuggestions() {
    var box = $("suggest");
    box.textContent = "";
    for (var k = 0; k < 4; k++) {
      var text = SUGGESTIONS[(suggestStart + k) % SUGGESTIONS.length];
      var b = el("button", "chip", text);
      b.type = "button";
      b.addEventListener("click", (function (t) {
        return function () { $("q").value = t; updateCount(); $("q").focus(); };
      })(text));
      box.appendChild(b);
    }
  }

  $("suggest-more").addEventListener("click", function () {
    suggestStart = (suggestStart + 4) % SUGGESTIONS.length;
    renderSuggestions();
  });

  function updateCount() {
    $("q-count").textContent = $("q").value.length + " von 4000 Zeichen";
  }
  $("q").addEventListener("input", updateCount);
  $("q").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (!$("ask-btn").disabled) $("ask-form").requestSubmit();
    }
  });

  // --- Antwort: einfaches, sicheres Markdown (nur Textknoten, nie HTML aus der Antwort) ---
  function inlineMd(parent, str) {
    var re = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\s][^*\n]*\*)/g;
    var last = 0, m;
    while ((m = re.exec(str)) !== null) {
      if (m.index > last) parent.appendChild(document.createTextNode(str.slice(last, m.index)));
      var tok = m[0], node;
      if (tok.charAt(0) === "`") { node = el("code", "", tok.slice(1, -1)); }
      else if (tok.slice(0, 2) === "**") { node = el("strong", "", tok.slice(2, -2)); }
      else { node = el("em", "", tok.slice(1, -1)); }
      parent.appendChild(node);
      last = m.index + tok.length;
    }
    if (last < str.length) parent.appendChild(document.createTextNode(str.slice(last)));
  }

  function renderMarkdown(text, target) {
    target.textContent = "";
    var lines = String(text).replace(/\r\n?/g, "\n").split("\n");
    var UL = /^\s*[-*•]\s+(.*)$/, OL = /^\s*\d+[.)]\s+(.*)$/, HEAD = /^#{1,4}\s+(.*)$/, FENCE = /^\s*```/;
    var i = 0;
    while (i < lines.length) {
      var line = lines[i], m;
      if (FENCE.test(line)) {
        var code = [];
        i++;
        while (i < lines.length && !FENCE.test(lines[i])) { code.push(lines[i]); i++; }
        i++;                                          // schließende Zeile überspringen
        var pre = el("pre");
        pre.appendChild(el("code", "", code.join("\n")));
        target.appendChild(pre);
      } else if (/^\s*$/.test(line)) {
        i++;
      } else if ((m = HEAD.exec(line))) {
        var h = el("h3");
        inlineMd(h, m[1]);
        target.appendChild(h);
        i++;
      } else if (UL.test(line) || OL.test(line)) {
        var ordered = !UL.test(line);
        var list = el(ordered ? "ol" : "ul");
        while (i < lines.length && (ordered ? OL : UL).test(lines[i])) {
          var li = el("li");
          inlineMd(li, (ordered ? OL : UL).exec(lines[i])[1]);
          list.appendChild(li);
          i++;
        }
        target.appendChild(list);
      } else {
        var p = el("p"), first = true;
        while (i < lines.length && !/^\s*$/.test(lines[i]) && !FENCE.test(lines[i]) && !HEAD.test(lines[i]) && !UL.test(lines[i]) && !OL.test(lines[i])) {
          if (!first) p.appendChild(document.createElement("br"));
          inlineMd(p, lines[i]);
          first = false;
          i++;
        }
        target.appendChild(p);
      }
    }
  }

  var currentAnswer = "";

  function showAnswer(text) {
    currentAnswer = text;
    renderMarkdown(text, $("answer-text"));
    $("answer").hidden = false;
    $("copy-btn").textContent = "Antwort kopieren";
  }

  $("copy-btn").addEventListener("click", async function () {
    var ok = false;
    try { await navigator.clipboard.writeText(currentAnswer); ok = true; } catch (e) {}
    if (!ok) {
      var ta = document.createElement("textarea");
      ta.value = currentAnswer;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
    }
    $("copy-btn").textContent = ok ? "Kopiert" : "Kopieren nicht möglich";
  });

  // --- Verlauf (nur in diesem Browser) ---
  function loadHistory() {
    try {
      var v = JSON.parse(store.get(HISTORY_KEY));
      if (Array.isArray(v)) {
        return v.filter(function (x) { return x && typeof x.q === "string" && typeof x.a === "string"; }).slice(0, HISTORY_MAX);
      }
    } catch (e) {}
    return [];
  }

  function saveHistory(list) { store.set(HISTORY_KEY, JSON.stringify(list.slice(0, HISTORY_MAX))); }

  function whenText(ts) {
    try {
      return new Date(ts).toLocaleString("de-DE", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ""; }
  }

  function renderHistory() {
    var list = loadHistory();
    $("history-box").hidden = !list.length;
    var ul = $("history");
    ul.textContent = "";
    list.forEach(function (h) {
      var li = el("li");
      var b = el("button");
      b.type = "button";
      b.appendChild(document.createTextNode(h.q.length > 110 ? h.q.slice(0, 110) + " …" : h.q));
      b.appendChild(el("span", "when", whenText(h.t)));
      b.addEventListener("click", function () {
        $("q").value = h.q;
        updateCount();
        showAnswer(h.a);
        $("answer").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  $("history-clear").addEventListener("click", function () {
    if (window.confirm("Den Verlauf der Fragen in diesem Browser löschen?")) {
      store.del(HISTORY_KEY);
      renderHistory();
    }
  });

  function pushHistory(q, a) {
    var list = loadHistory().filter(function (h) { return h.q !== q; });
    list.unshift({ q: q, a: a.slice(0, 8000), t: Date.now() });
    saveHistory(list);
    renderHistory();
  }

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
        showAnswer(r.answer);
        pushHistory(question, r.answer);
        setMsg($("ask-msg"), "");
      } else if (r.status === 401) {
        show("login");
        setMsg($("login-msg"), "Die Sitzung ist abgelaufen. Gib das Passwort erneut ein.", true);
      } else if (r.status === 429) {
        setMsg($("ask-msg"), "Das kostenlose Limit ist erreicht. Versuche es in einigen Minuten oder morgen erneut.", true);
      } else {
        setMsg($("ask-msg"), "Die Antwort konnte nicht geladen werden. Versuche es erneut.", true);
      }
    } catch (err) {
      setMsg($("ask-msg"), "Keine Verbindung zum Server. Versuche es gleich noch einmal.", true);
    }
    btn.disabled = false;
  });

  renderSuggestions();
  renderHistory();
  updateCount();

  // ======================================================================
  // Start: Tiefenmesser, Fakt, Tipp und Spiele-Übersicht
  // ======================================================================
  var FACTS = [
    "Der Ozean bedeckt etwa 71 Prozent der Erdoberfläche. Der Pazifik allein ist größer als alle Landflächen der Erde zusammen.",
    "Die tiefste bekannte Stelle des Meeres liegt im Marianengraben, ungefähr 11 Kilometer unter der Oberfläche.",
    "Quallen bestehen zu rund 95 Prozent aus Wasser. Sie haben weder Gehirn noch Herz noch Knochen.",
    "Quallen gibt es seit mindestens 500 Millionen Jahren, also deutlich länger als Dinosaurier.",
    "Die Qualle Turritopsis dohrnii kann sich unter Stress wieder zum Polypen zurückentwickeln. Deshalb nennt man sie die unsterbliche Qualle.",
    "Oktopusse haben drei Herzen und blaues Blut.",
    "Bei Seepferdchen tragen die Männchen die Jungen aus.",
    "Seeotter halten beim Schlafen oft Pfoten, damit sie nicht auseinandertreiben.",
    "Wale und Delfine schlafen mit nur einer Gehirnhälfte. Die andere bleibt wach.",
    "Delfine rufen sich mit eigenen Pfiffen, die ähnlich wie Namen funktionieren.",
    "Pottwale tauchen mehr als eine Stunde lang und über 1.000 Meter tief.",
    "Buckelwale singen Lieder, die sich über die Jahre verändern und von anderen Walen übernommen werden.",
    "Der Walhai ist der größte Fisch der Welt. Er frisst winziges Plankton.",
    "Viele Tiefseebewohner erzeugen selbst Licht. Das nennt man Biolumineszenz.",
    "Der Anglerfisch lockt Beute mit einem leuchtenden Köder in der Dunkelheit an.",
    "Der Riesenkalmar hat Augen mit bis zu rund 27 Zentimetern Durchmesser, die größten im Tierreich.",
    "Der Pistolenkrebs schlägt seine Schere so schnell zu, dass eine Schockwelle entsteht, die kleine Beute betäubt.",
    "Tintenfische können ihre Farbe in Bruchteilen einer Sekunde ändern.",
    "Seesterne haben kein Gehirn und kein Blut.",
    "Perlen entstehen, wenn eine Muschel einen Fremdkörper mit vielen Schichten Perlmutt umhüllt.",
    "Etwa 3,5 Prozent des Meerwassers sind gelöste Salze.",
    "Schall breitet sich im Wasser rund viermal schneller aus als in der Luft.",
    "Die Sargassosee ist das einzige Meer ohne Küste. Sie wird nur von Strömungen begrenzt.",
    "Mehr als 80 Prozent des Ozeans sind bis heute weder kartiert noch erkundet.",
    "Das Great Barrier Reef ist so groß, dass man es vom Weltraum aus sehen kann.",
    "Das Herz eines Blauwals wiegt ungefähr 180 Kilogramm.",
    "Die Nautilus-Tiere sind lebende Fossilien: Ihre Verwandten gibt es seit rund 500 Millionen Jahren."
  ];
  var TIPS = [
    "Dein Quallen-Imperium arbeitet auch weiter, wenn die Seite geschlossen ist, normalerweise bis zu 8 Stunden lang.",
    "Goldene Perlen im Quallen-Imperium verschwinden nach 12 Sekunden. Schnell klicken lohnt sich.",
    "Expeditionen im Quallen-Imperium laufen in echter Zeit, auch bei geschlossener Seite.",
    "Mit dem Spielstand-Code nimmst du deine Rekorde auf ein anderes Gerät mit. Du findest ihn im Reiter Spielstand.",
    "Im Reiter Farbe mischst du bis zu fünf Farben zu einem Verlauf für die ganze Seite.",
    "Bei Wortraten gibt es jeden Tag ein neues Wort, für alle dasselbe.",
    "Beim Schach stellst du die Stärke des Computers von 400 bis 1800 Elo ein. Mit „Online mit Code“ spielst du gegen ein anderes Gerät.",
    "Die Rennstrecke erzeugt zufällige Strecken über 3 Runden. Deine Bestzeit wird für jede Strecke gespeichert.",
    "Die Uhr kann auch Stoppuhr, Timer und Wecker.",
    "Mit Strg+Enter sendest du eine Frage ab, ohne zur Maus zu greifen.",
    "Im Quallen-Shop tauschst du Quallen gegen dauerhafte Fähigkeiten, statt nur den Bonus zu behalten."
  ];

  var ZONES = [
    [0, "Sonnenlichtzone", "Hier reicht das Licht für Pflanzen und Korallen."],
    [200, "Dämmerzone", "Das Licht wird schwach, und viele Tiere leuchten selbst."],
    [1000, "Mitternachtszone", "Hier ist es dauerhaft dunkel, und der Druck ist enorm."],
    [4000, "Abgrund", "Kalt, still und weit weg von allem."],
    [6000, "Tiefseegraben", "Die tiefsten Orte der Erde. Nur wenige Tiere leben hier."]
  ];
  var MAX_DEPTH = 10935;

  function jsonOf(key) {
    try { return JSON.parse(store.get(key)); } catch (e) { return null; }
  }

  function num(n) { return typeof n === "number" && isFinite(n) ? n : 0; }

  function fmtInt(n) {
    try { return Math.floor(n).toLocaleString("de-DE"); } catch (e) { return String(Math.floor(n)); }
  }

  function fmtBig(n) {
    var units = [[1e12, "Bio."], [1e9, "Mrd."], [1e6, "Mio."], [1e3, "Tsd."]];
    if (!isFinite(n)) return "unendlich viele";
    if (n >= 1e15) return n.toExponential(2).replace(".", ",").replace("e+", " × 10^");
    for (var i = 0; i < units.length; i++) {
      if (n >= units[i][0]) return (n / units[i][0]).toFixed(2).replace(".", ",") + " " + units[i][1];
    }
    return fmtInt(n);
  }

  // Zahl für einen Tag (stabil für alle Geräte, in Berliner Zeit)
  function dayIndex() {
    var s;
    try { s = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }); } catch (e) { s = new Date().toISOString().slice(0, 10); }
    var p = s.split("-").map(Number);
    return Math.floor(Date.UTC(p[0], p[1] - 1, p[2]) / 86400000);
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 5) return "Noch wach?";
    if (h < 11) return "Guten Morgen.";
    if (h < 18) return "Guten Tag.";
    return "Guten Abend.";
  }

  // Wie tief liegt dein Imperium? Aus dem Spielstand des Quallen-Imperiums berechnet.
  function imperiumInfo() {
    var d = jsonOf("quallenimperium-v1");
    if (!d || !Array.isArray(d.owned)) return null;
    var buildings = d.owned.reduce(function (a, b) { return a + num(b); }, 0);
    var arts = Array.isArray(d.artifacts) ? d.artifacts.filter(Boolean).length : 0;
    var depth = buildings * 9 + num(d.planets) * 140 + num(d.quallen) * 4 + num(d.resets) * 30 + arts * 20;
    return {
      coins: num(d.coins), buildings: buildings, planets: num(d.planets), quallen: num(d.quallen),
      depth: Math.min(MAX_DEPTH, Math.round(depth))
    };
  }

  function zoneOf(depth) {
    var z = ZONES[0];
    ZONES.forEach(function (x) { if (depth >= x[0]) z = x; });
    return z;
  }

  function renderGauge(depth) {
    var g = $("gauge");
    g.textContent = "";
    for (var m = 0; m <= 10000; m += 2000) {
      var t = el("div", "tick");
      t.style.top = (m / MAX_DEPTH * 100) + "%";
      t.appendChild(el("span", "", m === 0 ? "0" : (m / 1000) + " km"));
      g.appendChild(t);
    }
    var you = el("div", "you");
    you.style.top = (depth / MAX_DEPTH * 100) + "%";
    g.appendChild(you);
  }

  var GAMES_META = [
    { id: "quallenimperium", icon: "🪼", name: "Quallen-Imperium", desc: "Aufbauspiel unter Wasser", stat: function () {
      var i = imperiumInfo();
      if (!i || !i.buildings && !i.coins) return "Noch nicht gestartet";
      return fmtInt(i.buildings) + " Fabriken" + (i.planets ? ", " + i.planets + (i.planets === 1 ? " Planet" : " Planeten") : "") + ", " + fmtBig(i.coins) + " Perlen";
    } },
    { id: "wortraten", icon: "🔤", name: "Wortraten", desc: "Jeden Tag ein neues Wort", stat: function () {
      var w = jsonOf("wortraten-v1");
      if (!w || !w.stats || !num(w.stats.played)) return "Noch nicht gespielt";
      return fmtInt(w.stats.played) + " gespielt, Serie " + fmtInt(num(w.stats.streak)) + ", längste Serie " + fmtInt(num(w.stats.best));
    } },
    { id: "snake", icon: "🐍", name: "Snake", desc: "Der Klassiker", stat: bestStat("snake-best") },
    { id: "2048", icon: "🔢", name: "2048", desc: "Zahlen verschmelzen", stat: bestStat("2048-best") },
    { id: "autorennen", icon: "🏎️", name: "Autorennen", desc: "Hindernissen ausweichen, das Tempo steigt", stat: bestStat("rennen-best") },
    { id: "rennstrecke", icon: "🏁", name: "Rennstrecke", desc: "Zeitfahren auf zufälligen Strecken", stat: function () {
      var n = 0;
      try {
        for (var i = 0; i < localStorage.length; i++) if (/^rennstrecke:\d+$/.test(localStorage.key(i))) n++;
      } catch (e) {}
      return n ? "Bestzeiten auf " + n + (n === 1 ? " Strecke" : " Strecken") : "Noch keine Bestzeit";
    } },
    { id: "quallenrunner", icon: "🏃", name: "Quallen-Runner", desc: "Springen und ducken unter Wasser", stat: bestStat("quallen-best") },
    { id: "schach", icon: "♟️", name: "Schach", desc: "Gegen den Computer, zu zweit oder online mit Code", stat: function () {
      var v = Number(store.get("schach-elo"));
      return v > 0 ? "Deine Wertung: " + fmtInt(v) + " Elo" : "Noch nicht gespielt";
    } }
  ];

  function bestStat(key) {
    return function () {
      var v = Number(store.get(key));
      return v > 0 ? "Rekord " + fmtInt(v) : "Noch kein Rekord";
    };
  }

  var wantedGame = null;

  function openGame(id) {
    wantedGame = id;
    showTab("spiele");
  }

  function initStart() {
    var info = imperiumInfo();
    var depth = info ? info.depth : 0;
    var hero = $("hero");
    var dp = Math.sqrt(depth / MAX_DEPTH);                 // Wurzel: schon früh sichtbar tiefer
    hero.style.setProperty("--dp", Math.round(dp * 100) + "%");
    hero.classList.toggle("deep", dp > 0.3);

    $("hero-title").textContent = greeting();
    var date = "";
    try { date = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" }); } catch (e) {}
    $("hero-date").textContent = date;
    if (info && (info.buildings || info.coins)) {
      var z = zoneOf(depth);
      $("hero-depth").textContent = "Dein Imperium liegt in " + fmtInt(depth) + " Metern Tiefe.";
      $("hero-zone").textContent = z[1] + ": " + z[2];
      $("hero-go").textContent = "Weiter im Quallen-Imperium";
    } else {
      $("hero-depth").textContent = "Noch liegt alles an der Wasseroberfläche.";
      $("hero-zone").textContent = "Baue im Quallen-Imperium Fabriken, dann tauchst du Meter für Meter tiefer.";
      $("hero-go").textContent = "Quallen-Imperium starten";
    }
    renderGauge(depth);

    var day = dayIndex();
    $("fact").textContent = FACTS[day % FACTS.length];
    $("tip").textContent = TIPS[(day * 7 + 3) % TIPS.length];

    var ul = $("game-table");
    ul.textContent = "";
    GAMES_META.forEach(function (g) {
      var li = el("li", "grow");
      var ic = el("span", "gicon", g.icon);
      ic.setAttribute("aria-hidden", "true");
      var nm = el("div", "gname", g.name);
      var st = el("div", "gstat", g.desc + ". " + g.stat());
      var b = el("button", "", "Spielen");
      b.type = "button";
      b.setAttribute("aria-label", g.name + " spielen");
      b.addEventListener("click", function () { openGame(g.id); });
      [ic, nm, st, b].forEach(function (c) { li.appendChild(c); });
      ul.appendChild(li);
    });
  }

  $("hero-go").addEventListener("click", function () { openGame("quallenimperium"); });

  // ======================================================================
  // Reiter
  // ======================================================================
  var tabs = document.querySelectorAll(".tab");
  var panels = {
    start: $("panel-start"), fragen: $("panel-fragen"), spiele: $("panel-spiele"),
    spielstand: $("panel-spielstand"), uhr: $("panel-uhr"), farbe: $("panel-farbe")
  };

  function showTab(name) {
    activeTab = name;
    tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.tab === name)); });
    Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== name; });
    stopGame();
    stopTools();
    if (name === "start") initStart();
    else if (name === "spiele") initGames();
    else if (name === "spielstand" || name === "uhr") initTool(name);
    else if (name === "fragen") $("q").focus({ preventScroll: true });
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () { showTab(t.dataset.tab); });
  });

  // ======================================================================
  // spiele.js laden (Spiele, Uhr und Spielstand stecken in dieser einen Datei)
  // ======================================================================
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

  function metaOf(id) {
    for (var i = 0; i < GAMES_META.length; i++) if (GAMES_META[i].id === id) return GAMES_META[i];
    return null;
  }

  function setGamesMsg(text, isError) {
    var e = $("games-msg");
    e.textContent = text || "";
    e.className = "msg" + (isError ? " error" : "");
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
    var m = current && metaOf(current.id);
    $("game-desc").textContent = m ? m.desc : "";
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
      var m = metaOf(g.id);
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.dataset.id = g.id;
      b.textContent = (m ? m.icon + " " : "") + g.name;
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
    var target = null;
    if (wantedGame) {
      games.forEach(function (g) { if (g.id === wantedGame) target = g; });
      wantedGame = null;
    }
    pick(target || current || games[0]);
  }

  // Start: Die Seite zeigt zuerst die Startansicht, sobald man angemeldet ist.
  // (Ohne Anmeldung zeigt die Seite nur den Eintritt.)
  show("login");
})();
