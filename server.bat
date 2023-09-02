@echo off
setlocal ENABLEDELAYEDEXPANSION
cd /d "%~dp0\server"

if "%1" NEQ "" goto program

rem -------------------- CLI --------------------

:clitop

cls
echo w, watch   - runs tsc watch
echo s, start   - start server
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
if "%1" == "s" goto p_start
if "%1" == "start" goto p_start
if "%1" == "c" goto p_compile
if "%1" == "compile" goto p_compile

echo invalid command
exit /b 1

rem ------------ SUB: WATCH ------------

:p_watch
cls

if exist app rd /s /q app
cmd /c tsc -w -p tsconfig.json

exit /b

rem ------------ SUB: START ------------

:p_start
cls

if not exist "node_modules" (
    echo server/node_modules not found, installing required modules...
    cmd /c npm i
)

if not exist "app\main.js" (
    echo server/app/main.js file not found, transpiling...
    cmd /c tsc -p tsconfig.json
    
    if !errorlevel! NEQ 0 (
        choice /n /c yn /m "Error detected^! Continue anyway? [YN]"
        if !errorlevel! == 2 exit /b
    )
)

set dest="%~2"
if %dest% == "" (
    set /p dest="BDS Executable path: "
    set dest="!dest:"=!"
)

:p_start_top
cls

cmd /c node app/main.js %dest%

if %errorlevel% == 99 goto p_start_top

if %errorlevel% NEQ 0 (
    echo Server crashed: exitcode !errorlevel!
    echo  : R - restart now
    echo  : X - exit

    choice /n /c rx /m "> "
    if !errorlevel! == 2 exit /b
    goto p_start_top
)

exit /b

rem ------------ SUB: COMPILE ------------

:p_compile
cls

cmd /c tsc -p tsconfig.json

choice /n /c yn /m "Recompile? [YN]: "
if %errorlevel% == 2 exit /b
goto p_compile
