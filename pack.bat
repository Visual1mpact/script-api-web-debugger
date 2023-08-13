@echo off
setlocal ENABLEDELAYEDEXPANSION
cd /d "%~dp0\pack"

if "%1" NEQ "" goto program

rem -------------------- CLI --------------------

:clitop

cls
echo w, watch   - runs tsc watch
echo c, compile - converts TS to JS
echo y, copy    - copy pack to directory
echo.
echo a, subadd  - adds a script pack to be debugged
echo r, subrm   - removes an added script pack
echo.
echo h, hook    - adds and lists the pack to the bds world
echo u, unhook  - removes and unlists the pack from the bds world
echo.
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
if "%1" == "y" goto p_copy
if "%1" == "copy" goto p_copy

if "%1" == "a" goto p_subadd
if "%1" == "subadd" goto p_subadd
if "%1" == "r" goto p_subrm
if "%1" == "subrm" goto p_subrm

if "%1" == "h" goto p_hook
if "%1" == "hook" goto p_hook
if "%1" == "u" goto p_unhook
if "%1" == "unhook" goto p_unhook

echo invalid command
exit /b 1

rem ------------ SUB: WATCH ------------

:p_watch
cls

if exist pack\scripts rd /s /q pack\scripts
cmd /c tsc -w -p tsconfig.json

exit /b

rem ------------ SUB: COMPILE ------------

:p_compile
cls

if exist pack\scripts rd /s /q pack\scripts
cmd /c tsc -p tsconfig.json

set opts=%~2
if "%opts%" NEQ "" (
    if "%opts%" NEQ "%opts:nodialogue=%" exit /b
)

choice /n /c yn /m "Recompile? [YN]: "
if %errorlevel% == 2 exit /b
goto p_compile

rem ------------ SUB: COPY ------------

:p_copy

set dest="%~2"
if %dest% == "" (
    set /p dest="Directory path: "
    set dest="!dest:"=!"
)

:p_copy_top
cls

if exist %dest% rd /s /q %dest%
md %dest%
xcopy /e /c /i /q /y pack %dest%

echo Copied

set opts=%~3
if "%opts%" NEQ "" (
    if "%opts%" NEQ "%opts:nodialogue=%" exit /b
)
choice /n /c yn /m "Copy again? [YN]: "
if %errorlevel% == 2 exit /b
goto p_copy_top

rem ------------ SUB: SUBADD ------------

:p_subadd
cls

set dest="%~2"
if %dest% == "" (
    set /p dest="Script pack directory to be added: "
    set dest="!dest:"=!"
)
cmd /c node tool/subadd.js "%dest%"

exit /b %errorlevel%

rem ------------ SUB: SUBRM ------------

:p_subrm
cls

rd /s /q pack\subpacks\subscript

exit /b

rem ------------ SUB: HOOK ------------

:p_hook
cls

set dest="%~2"
if %dest% == "" (
    set /p dest="BDS Directory: "
    set dest="!dest:"=!"
)
cmd /c node tool/hook.js "%dest%"

exit /b %errorlevel%

rem ------------ SUB: UNHOOK ------------

:p_unhook
cls

set dest="%~2"
if %dest% == "" (
    set /p dest="BDS Directory: "
    set dest="!dest:"=!"
)
cmd /c node tool/unhook.js "%dest%"

exit /b %errorlevel%
