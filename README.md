T20 World Cup Analytics — Minimal Full-Stack Example

Overview:
- Small Flask backend that reads a CSV of matches and exposes JSON APIs.
- A static frontend (`index.html`) that requests summary data and draws charts with Chart.js.

Quick start:

1. Create a virtualenv and install dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

2. Run the backend (from project root):

```bash
python backend/app.py
```

Then open http://127.0.0.1:8000 in your browser.

Files of interest:
- `backend/app.py` — Flask app and API endpoints.
- `data/matches_sample.csv` — small sample dataset to start with.
- `frontend/index.html` and `frontend/app.js` — simple UI and charting.

Next steps you can ask me for:
- Expand data model (ball-by-ball, players, top scorers).
- Add upload UI to import CSVs.
- Add filters (by team, date range) and more charts.
- Dockerfile + deployment instructions.
