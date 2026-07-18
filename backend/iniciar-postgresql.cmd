@echo off
title Smart List - Backend com PostgreSQL
cd /d "%~dp0"
where docker >nul 2>nul
if errorlevel 1 (
    echo Docker nao foi encontrado. Instale o Docker Desktop ou configure um PostgreSQL local.
    pause
    exit /b 1
)
docker compose up -d postgres
if errorlevel 1 (
    echo Nao foi possivel iniciar o PostgreSQL.
    pause
    exit /b 1
)
echo Iniciando o backend em http://localhost:8080...
call mvnw.cmd "-Dmaven.test.skip=true" spring-boot:run
pause
