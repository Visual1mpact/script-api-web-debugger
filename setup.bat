@echo off

rem client

cd client

echo installing client node dependencies
cmd /c npm i

echo compiling client code
if exist app\scripts rd /s /q app\scripts
cmd /c tsc -p tsconfig.json

cd ..

rem pack

cd pack

echo installing pack node dependencies
cmd /c node tool/packages_installer.js

echo compiling pack code
if exist pack\scripts rd /s /q pack\scripts
cmd /c tsc -p tsconfig.json

cd ..

rem server

cd server

echo installing server node dependencies
cmd /c npm i

echo compiling server code
if exist app rd /s /q app
cmd /c tsc -p tsconfig.json

cd ..

echo finished
