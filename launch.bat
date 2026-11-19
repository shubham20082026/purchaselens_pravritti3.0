@echo off
setlocal
cd /d "%~dp0"
title PurchaseLens

if not exist "server.py" (
  echo Could not find the PurchaseLens project files.
  echo Extract the entire ZIP before running launch.bat.
  pause
  exit /b 1
)

set "PYTHON_CMD="
py -3 -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1
if not errorlevel 1 set "PYTHON_CMD=py -3"
if not defined PYTHON_CMD (
  python -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>&1
  if not errorlevel 1 set "PYTHON_CMD=python"
)
if not defined PYTHON_CMD (
  echo Python 3.10 or newer was not found.
  echo Install Python for Windows and make sure it is available on your PATH.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating the local Python environment...
  %PYTHON_CMD% -m venv .venv
  if errorlevel 1 (
    echo Could not create the Python environment. Check your Python installation.
    pause
    exit /b 1
  )
)

".venv\Scripts\python.exe" -c "import fastapi, uvicorn" >nul 2>&1
if errorlevel 1 (
  echo Installing required packages. This may take a few minutes...
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
  if errorlevel 1 (
    echo Installation failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
)

where node >nul 2>&1
if errorlevel 1 echo Note: Node.js 18 or newer is needed for Premium server-side features.

echo Starting PurchaseLens at http://127.0.0.1:8000
 echo Keep this window open while using the app. Press Ctrl+C to stop.
".venv\Scripts\python.exe" launch.py
if errorlevel 1 (
  echo PurchaseLens could not start. Check the message above.
  pause
  exit /b 1
)
endlocal
