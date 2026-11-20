<!-- © 2026 BlaueQualle. Alle Rechte vorbehalten. Kopieren, Verändern und Weitergeben nur mit schriftlicher Erlaubnis. -->

# Fragenraum

Ein passwortgeschützter Fragenraum mit Gemini-Antworten, kleinen Spielen, Uhr und Farbthemen.

## Einrichtung

Du brauchst deinen eigenen Gemini-API-Key. Lege eine Datei `.env` neben `app.py` an:

```
APP_PASSWORD=dein-passwort
SESSION_SECRET=mindestens-32-zufaellige-zeichen
GEMINI_API_KEY=dein-gemini-key
```

Ohne diese drei Einstellungen startet die App nicht.

## Starten

```
pip install -r requirements.txt
python app.py
```

Online startet `gunicorn app:app` die Anwendung.

© 2026 BlaueQualle. Alle Rechte vorbehalten.
