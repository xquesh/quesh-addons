@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install.ps1" %*
if errorlevel 1 (
    echo.
    echo Nie udalo sie uruchomic instalatora.
    pause
    exit /b 1
)
