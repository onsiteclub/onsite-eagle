@echo off
REM Script completo de deploy
REM Build + Instala + Testa no celular

setlocal enabledelayedexpansion

echo ========================================
echo   OnSite Calculator - Deploy Completo
echo ========================================
echo.

REM 1. Type check
echo [1/6] Type checking...
call npm run type-check
if %errorlevel% neq 0 (
    echo.
    echo ERRO: Erros de TypeScript encontrados!
    echo Corrija os erros antes de continuar.
    pause
    exit /b 1
)
echo ✓ Type check passou
echo.

REM 2. Lint
echo [2/6] Linting code...
call npm run lint
echo ✓ Lint completo
echo.

REM 3. Build web
echo [3/6] Building web application...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build web falhou!
    pause
    exit /b 1
)
echo ✓ Build web completo
echo.

REM 4. Sync Capacitor
echo [4/6] Syncing with Capacitor...
call npx cap sync android
if %errorlevel% neq 0 (
    echo ERROR: Sync falhou!
    pause
    exit /b 1
)
echo ✓ Capacitor sincronizado
echo.

REM 5. Build APK
echo [5/6] Building APK...
cd android
call gradlew assembleDebug
set BUILD_RESULT=%errorlevel%
cd ..

if %BUILD_RESULT% neq 0 (
    echo ERROR: Build APK falhou!
    pause
    exit /b 1
)
echo ✓ APK gerado
echo.

REM 6. Instalar
echo [6/6] Instalando no celular...
set APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk

adb devices | findstr "device$" >nul
if %errorlevel% equ 0 (
    echo Celular detectado!
    echo Instalando...
    adb install -r "%APK_PATH%"
    if %errorlevel% equ 0 (
        echo ✓ Instalado!
        echo.
        echo Iniciando app...
        adb shell am start -n ca.onsiteclub.calculator/.MainActivity
        timeout /t 2 >nul
        echo.
        echo Abrindo logs...
        echo Pressione Ctrl+C para sair dos logs
        echo.
        adb logcat -s "Capacitor:*" "chromium:*"
    )
) else (
    echo.
    echo Nenhum celular detectado via USB.
    echo APK gerado em: %APK_PATH%
)

echo.
echo ========================================
echo   Deploy concluido!
echo ========================================
pause
