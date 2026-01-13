# Helper to run the app in dev or production using the venv
# Usage: From project root: powershell -File backend\run.ps1

$root = (Split-Path -Parent $PSScriptRoot)
$py = Join-Path $root ".venv\Scripts\python.exe"
$waitress = Join-Path $root ".venv\Scripts\waitress-serve.exe"

if ($env:PROD -eq "1") {
    if (Test-Path $waitress) {
        & $waitress --port=8000 backend.app:app
    } else {
        Write-Error "waitress not found in venv. Install with: .venv\Scripts\python.exe -m pip install waitress"
    }
} else {
    if (Test-Path $py) {
        & $py backend/app.py
    } else {
        Write-Error "Python not found in venv. Create venv and install requirements first."
    }
}
