@echo off
setlocal ENABLEDELAYEDEXPANSION
cd /d "%~dp0\client"

if "%1" NEQ "" goto program

rem -------------------- CLI --------------------

:clitop

cls
echo w, watch   - runs tsc watch
echo c, compile - converts TS to JS
echo cls        - cls
echo exit       - exit

:cliloop

set /p arg=">>> "

if "%arg%" == "cls" goto clitop
if "%arg%" == "exit" exit /b

call :program %arg%

goto cliloop

rem -------------------- MAIN --------------------

:program

if "%1" == "w" goto p_watch
if "%1" == "watch" goto p_watch
if "%1" == "c" goto p_compile
if "%1" == "compile" goto p_compile

echo invalid command
exit /b 1

rem ------------ SUB: WATCH ------------

:p_watch
cls

if exist app\scripts rd /s /q app\scripts
cmd /c tsc -w -p tsconfig.json

exit /b

rem ------------ SUB: COMPILE ------------

:p_compile
cls

cmd /c tsc -p tsconfig.json

choice /n /c yn /m "Recompile? [YN]: "
if %errorlevel% == 2 exit /b
goto p_compile
