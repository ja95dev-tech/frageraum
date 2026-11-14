"""Fragenraum: passwortgeschützte Website mit Gemini-Fragen, Spielen und Uhr."""

import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import sys
import tempfile
import threading
import time
from collections import deque
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory, session
from werkzeug.middleware.proxy_fix import ProxyFix

APP_VERSION = "flach-1"
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

APP_PASSWORD = os.environ.get("APP_PASSWORD", "")
SESSION_SECRET = os.environ.get("SESSION_SECRET", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash-lite")
DAILY_LIMIT = int(os.environ.get("DAILY_LIMIT", "200"))
TRUST_PROXY = int(os.environ.get("TRUST_PROXY", "0"))
APP_ENV = os.environ.get("APP_ENV", "development")
PORT = int(os.environ.get("PORT", "3000"))
IS_PROD = APP_ENV == "production"

# Öffentliche Dateien (nur diese drei dürfen ohne Login abgerufen werden)
PUBLIC_FILES = ("index.html", "style.css", "app.js")
# Spiele und Uhr: nur nach dem Login
GAMES_FILE = "spiele.js"

# --- Pflicht-Einstellungen prüfen ---------------------------------------------
for _name, _value in (("APP_PASSWORD", APP_PASSWORD), ("SESSION_SECRET", SESSION_SECRET), ("GEMINI_API_KEY", GEMINI_API_KEY)):
    if not _value:
        sys.exit("Fehlende Einstellung: %s (siehe Anleitung, Schritt Environment Variables)" % _name)
if len(SESSION_SECRET) < 32:
    sys.exit("SESSION_SECRET ist zu kurz (mindestens 32 Zeichen).")

app = Flask(__name__, static_folder=None)
app.config.update(
    SECRET_KEY=SESSION_SECRET,
    SESSION_COOKIE_NAME="sid",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Strict",
    SESSION_COOKIE_SECURE=IS_PROD,
    PERMANENT_SESSION_LIFETIME=timedelta(hours=12),
    MAX_CONTENT_LENGTH=20 * 1024,
)
if TRUST_PROXY:
    # Hinter Render, Railway, nginx usw.: echte IP-Adresse und https erkennen
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=TRUST_PROXY, x_proto=TRUST_PROXY, x_host=TRUST_PROXY)


# --- Begrenzungen ---------------------------------------------------------------
class Limiter:
    """Einfache Begrenzung pro Schlüssel (z. B. IP-Adresse) in einem Zeitfenster."""

    def __init__(self, limit, window_seconds):
        self.limit = limit
        self.window = window_seconds
        self.hits = {}
        self.lock = threading.Lock()

    def _clean(self, key, now):
        q = self.hits.setdefault(key, deque())
        while q and now - q[0] > self.window:
            q.popleft()
        return q

    def blocked(self, key):
        with self.lock:
            now = time.monotonic()
            if len(self.hits) > 5000:
                for k in [k for k, q in self.hits.items() if not q or now - q[-1] > self.window]:
                    del self.hits[k]
            return len(self._clean(key, now)) >= self.limit

    def add(self, key):
        with self.lock:
            now = time.monotonic()
            self._clean(key, now).append(now)

    def allow(self, key):
        """Erlaubt die Anfrage und zählt sie, solange das Limit nicht erreicht ist."""
        if self.blocked(key):
            return False
        self.add(key)
        return True


login_failures = Limiter(limit=8, window_seconds=15 * 60)   # 8 falsche Passwörter in 15 Minuten
ask_limiter = Limiter(limit=6, window_seconds=60)            # 6 Fragen pro Minute

_day_lock = threading.Lock()
_day = {"key": datetime.now(timezone.utc).date(), "count": 0}


def take_daily_slot():
    """Eigenes Tageslimit, damit das kostenlose Gemini-Kontingent nicht aufgebraucht wird (UTC-Tag)."""
    with _day_lock:
        today = datetime.now(timezone.utc).date()
        if today != _day["key"]:
            _day["key"], _day["count"] = today, 0
        if _day["count"] >= DAILY_LIMIT:
            return False
        _day["count"] += 1
        return True


# --- Hilfsfunktionen ---------------------------------------------------------------
def safe_equal(a, b):
    ha = hashlib.sha256(str(a).encode("utf-8")).digest()
    hb = hashlib.sha256(str(b).encode("utf-8")).digest()
    return hmac.compare_digest(ha, hb)


def api_error(message, status):
    resp = jsonify({"error": message})
    resp.status_code = status
    return resp


def require_auth():
    """Gibt eine Fehlerantwort zurück, wenn man nicht angemeldet ist, sonst None."""
    if session.get("authed") is True:
        return None
    return api_error("Nicht angemeldet.", 401)


@app.after_request
def security_headers(resp):
    resp.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; "
        "form-action 'self'; frame-ancestors 'none'"
    )
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    if IS_PROD:
        resp.headers["Strict-Transport-Security"] = "max-age=15552000; includeSubDomains"
    if request.path.startswith("/api/") or request.path in ("/spiele.js", "/health"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


# --- API ----------------------------------------------------------------------------
@app.post("/api/login")
def login():
    ip = request.remote_addr or "unbekannt"
    if login_failures.blocked(ip):
        return api_error("Zu viele Versuche.", 429)
    data = request.get_json(silent=True)
    pw = data.get("password") if isinstance(data, dict) else None
    if not isinstance(pw, str) or not safe_equal(pw, APP_PASSWORD):
        login_failures.add(ip)
        return api_error("Falsches Passwort.", 401)
    session.clear()
    session["authed"] = True
    session.permanent = True
    return jsonify({"ok": True})


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.post("/api/ask")
def ask():
    denied = require_auth()
    if denied:
        return denied
    if not ask_limiter.allow(request.remote_addr or "unbekannt"):
        return api_error("Zu viele Anfragen.", 429)

    data = request.get_json(silent=True)
    question = data.get("question") if isinstance(data, dict) else None
    if not isinstance(question, str) or not question.strip() or len(question) > 4000:
        return api_error("Ungültige Frage.", 400)
    if not take_daily_slot():
        return api_error("Tageslimit erreicht.", 429)

    url = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent" % GEMINI_MODEL
    payload = {
        "systemInstruction": {"parts": [{"text": "Antworte klar und verständlich. Antworte in der Sprache der Frage."}]},
        "contents": [{"role": "user", "parts": [{"text": question.strip()}]}],
        "generationConfig": {"maxOutputTokens": 2048},
    }
    try:
        # Der Schlüssel bleibt auf dem Server und erreicht nie den Browser.
        r = requests.post(
            url,
            headers={"Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY},
            json=payload,
            timeout=30,
        )
    except requests.RequestException as exc:
        app.logger.error("Anfrage an Gemini fehlgeschlagen: %s", exc)
        return api_error("Gemini ist nicht erreichbar.", 502)

    if r.status_code == 429:
        return api_error("Gemini-Limit erreicht.", 429)
    if not r.ok:
        app.logger.error("Gemini-Fehler %s: %s", r.status_code, r.text[:500])
        return api_error("Gemini hat einen Fehler gemeldet.", 502)

    try:
        parts = r.json()["candidates"][0]["content"]["parts"]
        answer = "".join(p.get("text", "") for p in parts).strip()
    except (ValueError, KeyError, IndexError, TypeError):
        answer = ""
    if not answer:
        return api_error("Keine Antwort erhalten (evtl. vom Sicherheitsfilter blockiert).", 502)
    return jsonify({"answer": answer})


# --- Online-Schach (Räume mit Code, Abfrage im Sekundentakt) ---------------------------
# Die Räume liegen in einer kleinen SQLite-Datei. So funktioniert es auch mit mehreren
# gunicorn-Prozessen. Eine Partie wird nach 24 Stunden ohne Zug automatisch gelöscht.
CHESS_DB = os.environ.get("CHESS_DB", os.path.join(tempfile.gettempdir(), "fragenraum_schach.db"))
CHESS_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
CHESS_MAX_ROOMS = 300
CHESS_MAX_PLIES = 800
CHESS_MOVE_RE = re.compile(r"^[a-h][1-8][a-h][1-8][qrbn]?$")
CHESS_CODE_RE = re.compile(r"^[A-Z0-9]{5}$")

chess_create_limit = Limiter(limit=10, window_seconds=60)
chess_join_limit = Limiter(limit=20, window_seconds=60)
chess_poll_limit = Limiter(limit=300, window_seconds=60)


def chess_db():
    con = sqlite3.connect(CHESS_DB, timeout=5, isolation_level=None)
    con.row_factory = sqlite3.Row
    return con


def chess_init():
    con = chess_db()
    try:
        con.execute(
            "CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, updated REAL, wtok TEXT, btok TEXT, "
            "wseen REAL, bseen REAL, moves TEXT, status TEXT, reason TEXT, offer TEXT)"
        )
    finally:
        con.close()


chess_init()


def chess_view(row, color):
    now = time.time()
    other = "b" if color == "w" else "w"
    seen = row[other + "seen"] or 0
    return {
        "you": color,
        "code": row["code"],
        "status": row["status"],
        "reason": row["reason"],
        "offer": row["offer"],
        "moves": json.loads(row["moves"]),
        "players": 2 if (row["wtok"] and row["btok"]) else 1,
        "opp_online": now - seen < 8,
    }


def chess_find(con, data):
    """Findet Raum und Farbe des Spielers anhand von Code und Schlüssel. Gibt (row, color) oder (None, None)."""
    code = data.get("code") if isinstance(data, dict) else None
    token = data.get("token") if isinstance(data, dict) else None
    if not isinstance(code, str) or not isinstance(token, str) or not CHESS_CODE_RE.match(code):
        return None, None
    row = con.execute("SELECT * FROM rooms WHERE code = ?", (code,)).fetchone()
    if not row:
        return None, None
    for color in ("w", "b"):
        t = row[color + "tok"]
        if t and hmac.compare_digest(t, token):
            return row, color
    return None, None


def chess_gate(limiter):
    denied = require_auth()
    if denied:
        return denied
    if not limiter.allow(request.remote_addr or "unbekannt"):
        return api_error("Zu viele Anfragen.", 429)
    return None


@app.post("/api/schach/create")
def chess_create():
    denied = chess_gate(chess_create_limit)
    if denied:
        return denied
    data = request.get_json(silent=True)
    pref = data.get("color") if isinstance(data, dict) else None
    color = pref if pref in ("w", "b") else secrets.choice("wb")
    token = secrets.token_urlsafe(16)
    now = time.time()
    con = chess_db()
    try:
        con.execute("BEGIN IMMEDIATE")
        con.execute("DELETE FROM rooms WHERE updated < ?", (now - 24 * 3600,))
        if con.execute("SELECT COUNT(*) FROM rooms").fetchone()[0] >= CHESS_MAX_ROOMS:
            con.execute("ROLLBACK")
            return api_error("Zu viele offene Partien.", 503)
        code = None
        for _ in range(20):
            c = "".join(secrets.choice(CHESS_CODE_CHARS) for _ in range(5))
            if not con.execute("SELECT 1 FROM rooms WHERE code = ?", (c,)).fetchone():
                code = c
                break
        if code is None:
            con.execute("ROLLBACK")
            return api_error("Kein freier Code.", 503)
        con.execute(
            "INSERT INTO rooms (code, updated, wtok, btok, wseen, bseen, moves, status, reason, offer) "
            "VALUES (?, ?, ?, ?, ?, ?, '[]', 'wait', NULL, NULL)",
            (code, now, token if color == "w" else None, token if color == "b" else None, now, now),
        )
        con.execute("COMMIT")
    finally:
        con.close()
    return jsonify({"code": code, "token": token, "you": color})


@app.post("/api/schach/join")
def chess_join():
    denied = chess_gate(chess_join_limit)
    if denied:
        return denied
    data = request.get_json(silent=True)
    code = data.get("code") if isinstance(data, dict) else None
    code = code.strip().upper() if isinstance(code, str) else ""
    if not CHESS_CODE_RE.match(code):
        return api_error("Ungültiger Code.", 400)
    token = secrets.token_urlsafe(16)
    now = time.time()
    con = chess_db()
    try:
        con.execute("BEGIN IMMEDIATE")
        row = con.execute("SELECT * FROM rooms WHERE code = ?", (code,)).fetchone()
        if not row:
            con.execute("ROLLBACK")
            return api_error("Diesen Code gibt es nicht.", 404)
        if row["wtok"] and row["btok"]:
            con.execute("ROLLBACK")
            return api_error("Die Partie ist schon voll.", 409)
        color = "b" if row["wtok"] else "w"
        if color == "w":
            sql = "UPDATE rooms SET wtok = ?, wseen = ?, status = 'play', updated = ? WHERE code = ?"
        else:
            sql = "UPDATE rooms SET btok = ?, bseen = ?, status = 'play', updated = ? WHERE code = ?"
        con.execute(sql, (token, now, now, code))
        con.execute("COMMIT")
    finally:
        con.close()
    return jsonify({"code": code, "token": token, "you": color})


@app.post("/api/schach/state")
def chess_state():
    denied = chess_gate(chess_poll_limit)
    if denied:
        return denied
    data = request.get_json(silent=True)
    con = chess_db()
    try:
        row, color = chess_find(con, data)
        if not row:
            return api_error("Partie nicht gefunden.", 404)
        now = time.time()
        con.execute("UPDATE rooms SET %sseen = ? WHERE code = ?" % color, (now, row["code"]))
        row = con.execute("SELECT * FROM rooms WHERE code = ?", (row["code"],)).fetchone()
        return jsonify(chess_view(row, color))
    finally:
        con.close()


@app.post("/api/schach/move")
def chess_move():
    denied = chess_gate(chess_poll_limit)
    if denied:
        return denied
    data = request.get_json(silent=True)
    mv = data.get("move") if isinstance(data, dict) else None
    ply = data.get("ply") if isinstance(data, dict) else None
    if not isinstance(mv, str) or not CHESS_MOVE_RE.match(mv) or not isinstance(ply, int) or isinstance(ply, bool):
        return api_error("Ungültiger Zug.", 400)
    con = chess_db()
    try:
        con.execute("BEGIN IMMEDIATE")
        row, color = chess_find(con, data)
        if not row:
            con.execute("ROLLBACK")
            return api_error("Partie nicht gefunden.", 404)
        moves = json.loads(row["moves"])
        mine = "w" if len(moves) % 2 == 0 else "b"
        if row["status"] != "play" or mine != color or ply != len(moves) or len(moves) >= CHESS_MAX_PLIES:
            con.execute("ROLLBACK")
            return api_error("Der Zug passt nicht zur Partie.", 409)
        moves.append(mv)
        con.execute(
            "UPDATE rooms SET moves = ?, offer = NULL, updated = ? WHERE code = ?",
            (json.dumps(moves), time.time(), row["code"]),
        )
        row = con.execute("SELECT * FROM rooms WHERE code = ?", (row["code"],)).fetchone()
        con.execute("COMMIT")
        return jsonify(chess_view(row, color))
    finally:
        con.close()


@app.post("/api/schach/act")
def chess_act():
    """Aufgeben und Remis anbieten, annehmen oder ablehnen."""
    denied = chess_gate(chess_poll_limit)
    if denied:
        return denied
    data = request.get_json(silent=True)
    action = data.get("action") if isinstance(data, dict) else None
    if action not in ("resign", "offer", "accept", "decline", "over"):
        return api_error("Ungültige Aktion.", 400)
    con = chess_db()
    try:
        con.execute("BEGIN IMMEDIATE")
        row, color = chess_find(con, data)
        if not row:
            con.execute("ROLLBACK")
            return api_error("Partie nicht gefunden.", 404)
        other = "b" if color == "w" else "w"
        if row["status"] == "play":
            if action == "resign":
                con.execute("UPDATE rooms SET status='end', reason=?, offer=NULL, updated=? WHERE code=?",
                            ("resign-" + color, time.time(), row["code"]))
            elif action == "offer" and row["wtok"] and row["btok"]:
                con.execute("UPDATE rooms SET offer=?, updated=? WHERE code=?", (color, time.time(), row["code"]))
            elif action == "accept" and row["offer"] == other:
                con.execute("UPDATE rooms SET status='end', reason='draw', offer=NULL, updated=? WHERE code=?",
                            (time.time(), row["code"]))
            elif action == "decline" and row["offer"] == other:
                con.execute("UPDATE rooms SET offer=NULL, updated=? WHERE code=?", (time.time(), row["code"]))
            elif action == "over":
                # Beide Seiten erkennen Matt, Patt und Remis selbst. Das Ende wird nur vermerkt.
                con.execute("UPDATE rooms SET status='end', reason='rules', offer=NULL, updated=? WHERE code=?",
                            (time.time(), row["code"]))
        row = con.execute("SELECT * FROM rooms WHERE code = ?", (row["code"],)).fetchone()
        con.execute("COMMIT")
        return jsonify(chess_view(row, color))
    finally:
        con.close()


# --- Statusseite (ohne Login, zeigt nur, ob die Dateien da sind) ---------------------
@app.get("/health")
def health():
    files = {name: os.path.isfile(os.path.join(BASE_DIR, name)) for name in PUBLIC_FILES + (GAMES_FILE,)}
    return jsonify({"ok": all(files.values()), "version": APP_VERSION, "dateien": files})


# --- Spiele und Uhr (nur nach dem Login) ----------------------------------------------
@app.get("/spiele.js")
def games_file():
    denied = require_auth()
    if denied:
        return denied
    return send_from_directory(BASE_DIR, GAMES_FILE, mimetype="text/javascript")


# --- Webseite ---------------------------------------------------------------------------
@app.get("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.get("/<name>")
def public_file(name):
    # Nur diese Dateien sind öffentlich. app.py, requirements.txt usw. sind nie abrufbar.
    if name not in PUBLIC_FILES:
        return api_error("Nicht gefunden.", 404)
    return send_from_directory(BASE_DIR, name)


@app.errorhandler(404)
@app.errorhandler(405)
@app.errorhandler(413)
def json_errors(err):
    return api_error("Nicht möglich.", err.code)


if __name__ == "__main__":
    # Nur für lokales Testen. Online startet gunicorn die Anwendung (siehe Anleitung).
    print("Läuft auf http://localhost:%d (Modell: %s)" % (PORT, GEMINI_MODEL))
    app.run(host="127.0.0.1", port=PORT)
