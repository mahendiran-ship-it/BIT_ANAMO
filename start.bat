@echo off
setlocal EnableExtensions

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo BIT_ANAMO startup

echo Checking required commands...
where python >nul 2>nul
if errorlevel 1 (
  echo ERROR: Python was not found on PATH.
  echo Install Python 3.10+ and try again.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm was not found on PATH.
  echo Install Node.js and npm, then try again.
  pause
  exit /b 1
)

if not exist "%ROOT%backend\requirements.txt" (
  echo ERROR: backend project files were not found.
  pause
  exit /b 1
)
if not exist "%ROOT%frontend\package.json" (
  echo ERROR: frontend project files were not found.
  pause
  exit /b 1
)

set "PYTHON=python"
if exist "%ROOT%.venv\Scripts\python.exe" set "PYTHON=%ROOT%.venv\Scripts\python.exe"
if exist "%ROOT%backend\.venv\Scripts\python.exe" set "PYTHON=%ROOT%backend\.venv\Scripts\python.exe"

if not exist "%ROOT%frontend\node_modules" (
  echo Installing frontend dependencies...
  pushd "%ROOT%frontend"
  call npm install
  if errorlevel 1 (
    popd
    echo ERROR: npm install failed.
    pause
    exit /b 1
  )
  popd
)

echo Starting backend at http://127.0.0.1:8000
start "BIT_ANAMO Backend" /D "%ROOT%backend" "%PYTHON%" -m uvicorn app.main:app --host 127.0.0.1 --port 8000

echo Starting frontend at http://localhost:5174
start "BIT_ANAMO Frontend" /D "%ROOT%frontend" "%ComSpec%" /k "call npm run dev -- --host 127.0.0.1 --port 5174"

timeout /t 3 /nobreak >nul
start "" "http://localhost:5174/"

echo.
echo BIT_ANAMO is starting.
echo Frontend: http://localhost:5174/
echo Backend:  http://127.0.0.1:8000/
echo API docs: http://127.0.0.1:8000/docs
endlocal
