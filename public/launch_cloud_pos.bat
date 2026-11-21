@echo off
setlocal enabledelayedexpansion
title DELICIOUS CAKE CORNER - Quick Launcher
cd /d "%~dp0"
echo Starting DELICIOUS CAKE CORNER Bakery POS...
echo Station: Mansuka, Ghatal

:: Prefer local portable HTML POS if present in the same folder
for %%F in ("%~dp0DCC_POS*.html" "%~dp0Delicious_Cake_Corner_POS*.html") do (
    if exist "%%~fF" (
        call :OpenAppUrl "%%~fF"
        exit /b
    )
)

set "TARGET_URL=https://ais-pre-7horp6gssg2hdcmryj25ch-268324610539.asia-east1.run.app"
call :OpenAppUrl "%TARGET_URL%"
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
