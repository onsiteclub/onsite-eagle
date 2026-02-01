@echo off
REM Instala o APK direto no celular via USB

echo ========================================
echo   Instalacao Direta no Celular
echo ========================================
echo.

REM Verifica se o celular esta conectado
echo Verificando conexao com celular...
adb devices
if %errorlevel% neq 0 (
    echo.
    echo ERRO: ADB nao encontrado!
    echo.
    echo Instale o ADB:
    echo 1. Baixe Android Platform Tools
    echo 2. Adicione ao PATH do Windows
    echo.
    pause
    exit /b 1
)
echo.

REM Verifica se existe APK
set APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk
if not exist "%APK_PATH%" (
    echo ERRO: APK nao encontrado!
    echo.
    echo Execute primeiro: build-apk.bat
    echo.
    pause
    exit /b 1
)

REM Instala
echo Instalando APK...
adb install -r "%APK_PATH%"
if %errorlevel% equ 0 (
    echo.
    echo ✓ Instalado com sucesso!
    echo.
    echo Iniciando aplicativo...
    adb shell am start -n ca.onsiteclub.calculator/.MainActivity
    echo.
    echo ✓ App iniciado!
) else (
    echo.
    echo ERRO: Falha na instalacao
    echo.
    echo Verifique:
    echo 1. Celular conectado via USB
    echo 2. Depuracao USB ativada
    echo 3. Dispositivo aparece em "adb devices"
)
echo.
pause
