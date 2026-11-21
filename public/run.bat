@echo off
setlocal enabledelayedexpansion
title DELICIOUS CAKE CORNER - Smart Bakery POS Launcher
color 0E
cd /d "%~dp0"

echo ===================================================================
echo       DELICIOUS CAKE CORNER - SMART BAKERY POS ^& BILLING
echo       100%% Eggless Bakery - Mansuka, Ghatal, WB
echo ===================================================================
echo.

:: 1. Check if Portable Single-File POS HTML exists alongside this launcher
for %%F in ("%~dp0DCC_POS*.html" "%~dp0Delicious_Cake_Corner_POS*.html") do (
    if exist "%%~fF" (
        echo [PORTABLE POS] Found offline/online POS app: %%~nxF
        echo Opening in full-screen app window...
        call :OpenAppUrl "%%~fF"
        exit /b
    )
)

:: 2. Only start local Node/Vite server if inside the actual source project folder
if exist "%~dp0package.json" (
    where node >nul 2>nul
    if !errorlevel! equ 0 (
        if not exist "%~dp0node_modules" (
            echo [Setup] Installing required packages for first time setup...
            call npm install
        )
        echo [POS] Starting local bakery server on port 3000...
        call :OpenAppUrl "http://localhost:3000"
        call npm run dev
        pause
        exit /b
    )
)

:: 3. Separate System Mode (No project source / No Node.js required)
echo [Separate System Mode] No local source code in this folder.
echo Tip: For 100%% offline/online standalone run on any PC without server,
echo      download "DCC_POS_*.html" from the Run File button inside the app.
echo.
set "TARGET_URL=https://ais-pre-7horp6gssg2hdcmryj25ch-268324610539.asia-east1.run.app"
echo Opening POS URL: %TARGET_URL%
call :OpenAppUrl "%TARGET_URL%"
timeout /t 2 >nul
exit /b

:OpenAppUrl
set "URL_TO_OPEN=%~1"
set "BROWSER_EXE="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER_EXE if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "BROWSER_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER_EXE if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not defined BROWSER_EXE if exist "%LocalAppData%\Microsoft\Edge\Application\msedge.exe" set "BROWSER_EXE=%LocalAppData%\Microsoft\Edge\Application\msedge.exe"

if defined BROWSER_EXE (
    start "" "%BROWSER_EXE%" --app="%URL_TO_OPEN%"
) else (
    start "" "%URL_TO_OPEN%"
)
goto :eof
