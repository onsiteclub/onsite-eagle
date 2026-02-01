@echo off
REM Build APK completo via linha de comando
REM Nao precisa abrir o Android Studio!

echo ========================================
echo   Build APK Automatico
echo ========================================
echo.

REM 1. Build web
echo [1/5] Building web...
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%
echo.

REM 2. Sync Capacitor
echo [2/5] Syncing Capacitor...
call npx cap sync android
if %errorlevel% neq 0 exit /b %errorlevel%
echo.

REM 3. Build Debug APK
echo [3/5] Building Debug APK...
cd android
call gradlew assembleDebug
if %errorlevel% neq 0 (
    cd ..
    echo ERROR: Build falhou!
    pause
    exit /b %errorlevel%
)
cd ..
echo.

REM 4. Localiza o APK
echo [4/5] Locating APK...
set APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk
if exist "%APK_PATH%" (
    echo ✓ APK gerado com sucesso!
    echo.
    echo Localizacao: %APK_PATH%
    echo Tamanho:
    dir "%APK_PATH%" | findstr app-debug.apk
) else (
    echo ERRO: APK nao encontrado!
    pause
    exit /b 1
)
echo.

REM 5. Pergunta se quer instalar
echo [5/5] Instalacao no celular
echo.
choice /C SN /M "Deseja instalar no celular conectado por USB"
if %errorlevel% equ 1 (
    echo.
    echo Instalando...
    adb install -r "%APK_PATH%"
    if %errorlevel% equ 0 (
        echo ✓ APK instalado com sucesso!
        echo.
        echo Iniciando app...
        adb shell am start -n ca.onsiteclub.calculator/.MainActivity
    ) else (
        echo.
        echo ERRO: Falha na instalacao.
        echo Certifique-se de que:
        echo 1. O celular esta conectado via USB
        echo 2. A depuracao USB esta ativada
        echo 3. ADB esta instalado
    )
)
echo.

echo ========================================
echo   Build concluido!
echo ========================================
echo.
echo APK salvo em:
echo %APK_PATH%
echo.
echo Voce pode:
echo 1. Copiar o APK para o celular manualmente
echo 2. Compartilhar o APK
echo 3. Instalar via "adb install -r %APK_PATH%"
echo.
pause
