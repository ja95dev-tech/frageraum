"""Fragenraum: passwortgeschützte Website mit Gemini-Fragen, Spielen und Uhr."""

import hashlib
import hmac
import os
import sys
import threading
import time
from collections import deque
from datetime import datetime, timedelta, timezone

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory, session
from werkzeug.middleware.proxy_fix import ProxyFix

APP_VERSION = "flach-2"
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
    # Für den Online-Modus im Schach (PeerJS): Das Skript kommt von unpkg.com,
    # die Vermittlung läuft über 0.peerjs.com. Sonst bleibt alles auf der eigenen Adresse.
    resp.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data:; connect-src 'self' https://0.peerjs.com wss://0.peerjs.com; object-src 'none'; "
        "base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
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
