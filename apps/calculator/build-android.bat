@echo off
REM Script de Build para Android - OnSite Calculator
REM Este script prepara o projeto para build no Android Studio

echo ========================================
echo   OnSite Calculator - Android Build
echo ========================================
echo.

REM 1. Build da aplicacao web
echo [1/4] Building web application...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build falhou!
    pause
    exit /b %errorlevel%
)
echo ✓ Build web completo
echo.

REM 2. Sincroniza com Capacitor
echo [2/4] Syncing with Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Sync falhou!
    pause
    exit /b %errorlevel%
)
echo ✓ Capacitor sincronizado
echo.

REM 3. Copia assets atualizados
echo [3/4] Copying assets...
call npx cap copy android
echo ✓ Assets copiados
echo.

REM 4. Abre Android Studio
echo [4/4] Opening Android Studio...
call npx cap open android
echo.

echo ========================================
echo   Build preparado com sucesso!
echo ========================================
echo.
echo Proximo passo:
echo 1. No Android Studio, clique em "Build" ^> "Build Bundle(s) / APK(s)"
echo 2. Escolha "Build APK(s)" para gerar o APK
echo 3. Ou conecte seu celular USB e clique no botao "Run"
echo.
pause
