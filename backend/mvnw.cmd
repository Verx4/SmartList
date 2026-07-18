@echo off
setlocal

set "BASE_DIR=%~dp0"
set "MAVEN_VERSION=3.9.9"
set "MAVEN_HOME=%BASE_DIR%.mvn\apache-maven-%MAVEN_VERSION%"
set "MAVEN_ZIP=%BASE_DIR%.mvn\apache-maven-%MAVEN_VERSION%.zip"
set "MAVEN_URL=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/%MAVEN_VERSION%/apache-maven-%MAVEN_VERSION%-bin.zip"

if exist "%MAVEN_HOME%\bin\mvn.cmd" goto executar

java "%BASE_DIR%.mvn\wrapper\MavenDownloader.java" "%MAVEN_URL%" "%MAVEN_ZIP%"
if errorlevel 1 exit /b 1

powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%MAVEN_ZIP%' -DestinationPath '%BASE_DIR%.mvn' -Force"
if errorlevel 1 exit /b 1

del /q "%MAVEN_ZIP%"

:executar
call "%MAVEN_HOME%\bin\mvn.cmd" %*
exit /b %errorlevel%
