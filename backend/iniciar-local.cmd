@echo off
title Minha Lista - Backend local
cd /d "%~dp0"
echo Iniciando o backend em http://localhost:8080...
echo Para encerrar, pressione Ctrl+C.
echo.
call mvnw.cmd "-Dmaven.test.skip=true" spring-boot:run "-Dspring-boot.run.profiles=local"
pause
