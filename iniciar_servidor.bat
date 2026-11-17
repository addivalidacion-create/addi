@echo off
title Servidor Addi
cd /d "%~dp0"
echo ==========================================
echo    Iniciando Servidor Backend Addi...
echo ==========================================
"C:\Program Files\nodejs\node.exe" server.js
if %errorlevel% neq 0 (
  echo.
  echo [ERROR] No se pudo iniciar el servidor.
  pause
)
