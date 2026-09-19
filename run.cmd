@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ============================================================
echo   VoiceGuard full-stack starting...
echo   When the green dot appears, open:
echo        http://localhost:8001
echo   First start takes ~30-40s (model warm-up).
echo   Keep this window OPEN while using the site.
echo   Close it to stop the server.
echo ============================================================
echo.
py -3.11 -m uvicorn backend.server:app --host 0.0.0.0 --port 8001
echo.
echo Server stopped.
pause