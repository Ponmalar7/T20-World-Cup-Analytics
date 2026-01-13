from flask import Flask, jsonify, send_from_directory
from datetime import datetime
import io
import csv
from pathlib import Path
from collections import defaultdict
BASE = Path(__file__).resolve().parent.parent
DATA_FILE = BASE / 'data' / 'matches_sample.csv'

app = Flask(__name__, static_folder=str(BASE / 'frontend'))


def read_matches():
    out = []
    if not DATA_FILE.exists():
        return out
    with DATA_FILE.open(newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            try:
                out.append({
                    'date': r.get('date'),
                    'match_id': r.get('match_id'),
                    'team1': r.get('team1'),
                    'team2': r.get('team2'),
                    'team1_runs': int(r.get('team1_runs') or 0),
                    'team2_runs': int(r.get('team2_runs') or 0),
                    'winner': r.get('winner')
                })
            except Exception:
                continue
    return out


def match_in_range(m, start=None, end=None, team=None):
    # m['date'] is ISO string
    try:
        d = datetime.strptime(m['date'], "%Y-%m-%d").date()
    except Exception:
        return False
    if start:
        try:
            s = datetime.strptime(start, "%Y-%m-%d").date()
            if d < s:
                return False
        except Exception:
            pass
    if end:
        try:
            e = datetime.strptime(end, "%Y-%m-%d").date()
            if d > e:
                return False
        except Exception:
            pass
    if team:
        t = team.lower()
        if t not in (m.get('team1','').lower(), m.get('team2','').lower(), (m.get('winner') or '').lower()):
            return False
    return True


@app.route('/api/matches')
def api_matches():
    # optional query params: team, start (YYYY-MM-DD), end (YYYY-MM-DD)
    team = None
    start = None
    end = None
    from flask import request
    team = request.args.get('team')
    start = request.args.get('start')
    end = request.args.get('end')
    matches = read_matches()
    if team or start or end:
        matches = [m for m in matches if match_in_range(m, start=start, end=end, team=team)]
    return jsonify(matches)


@app.route('/api/summary')
def api_summary():
    from flask import request
    team = request.args.get('team')
    start = request.args.get('start')
    end = request.args.get('end')
    matches = read_matches()
    if team or start or end:
        matches = [m for m in matches if match_in_range(m, start=start, end=end, team=team)]
    summary = {
        'total_matches': len(matches),
        'total_runs': 0,
        'teams': {}
    }
    teams = defaultdict(lambda: {'matches': 0, 'runs': 0, 'wins': 0})
    for m in matches:
        summary['total_runs'] += m['team1_runs'] + m['team2_runs']
        teams[m['team1']]['matches'] += 1
        teams[m['team2']]['matches'] += 1
        teams[m['team1']]['runs'] += m['team1_runs']
        
        teams[m['team2']]['runs'] += m['team2_runs']
        if m['winner']:
            teams[m['winner']]['wins'] += 1
    # convert
    summary['teams'] = {t: v for t, v in teams.items()}
    return jsonify(summary)


@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/api/upload', methods=['POST'])
def api_upload():
    from flask import request
    if 'file' not in request.files:
        return jsonify({'error': 'no file uploaded'}), 400
    f = request.files['file']
    if f.filename == '':
        return jsonify({'error': 'empty filename'}), 400
    # basic validation + preview flow
    content = f.stream.read().decode('utf-8')
    lines = content.splitlines()
    if not lines:
        return jsonify({'error': 'empty file'}), 400
    # check header contains expected columns (order may vary)
    header = [h.strip() for h in lines[0].split(',')]
    expected = ['date', 'match_id', 'team1', 'team2', 'team1_runs', 'team2_runs', 'winner']
    if any(h not in header for h in expected):
        return jsonify({'error': 'invalid csv headers', 'expected': expected, 'found': header}), 400

    # parse rows and validate
    reader = csv.DictReader(io.StringIO(content))
    errors = []
    preview = []
    row_count = 0
    for i, row in enumerate(reader, start=1):
        row_count += 1
        row_errs = []
        # date
        try:
            datetime.strptime(row.get('date', ''), '%Y-%m-%d')
        except Exception:
            row_errs.append('invalid date')
        # teams
        if not row.get('team1') or not row.get('team2'):
            row_errs.append('missing team1/team2')
        # runs
        try:
            int(row.get('team1_runs') or 0)
            int(row.get('team2_runs') or 0)
        except Exception:
            row_errs.append('invalid runs')
        if row_errs:
            errors.append({'row': i, 'errors': row_errs, 'data': row})
        if len(preview) < 10:
            preview.append(row)

    # if confirm flag present, commit only if no errors
    confirm = request.form.get('confirm') in ('1', 'true', 'yes')
    if confirm:
        if errors:
            return jsonify({'error': 'validation errors', 'errors': errors}), 400
        try:
            DATA_FILE.write_text(content, encoding='utf-8')
        except Exception as e:
            return jsonify({'error': str(e)}), 500
        return jsonify({'status': 'ok', 'rows': row_count})

    # return preview and errors (if any)
    return jsonify({'preview': preview, 'errors': errors, 'rows': row_count})


if __name__ == '__main__':
    import os
    debug = os.environ.get("FLASK_DEBUG", "0").lower() in ("1", "true", "yes")
    host = os.environ.get("FLASK_HOST", "127.0.0.1")
    port = int(os.environ.get("FLASK_PORT", "8000"))
    app.run(debug=debug, host=host, port=port)
