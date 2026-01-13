# Run the app with Waitress (production WSGI server)
# Usage: . .venv\Scripts\Activate.ps1  (optional)
#        .\run_server.ps1

$venvPython = ".venv\Scripts\python.exe"
if (-Not (Test-Path $venvPython)) {
  Write-Error "vPython not found at $venvPython. Create venv first: python -m venv .venv"
  exit 1
}

& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install waitress

# Start Waitress
& .venv\Scripts\waitress-serve --port=8000 backend.app:app
