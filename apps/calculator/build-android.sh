#!/bin/bash
# Script de Build para Android - OnSite Calculator
# Este script prepara o projeto para build no Android Studio

echo "========================================"
echo "  OnSite Calculator - Android Build"
echo "========================================"
echo ""

# 1. Build da aplicação web
echo "[1/4] Building web application..."
npm run build
if [ $? -ne 0 ]; then
    echo "ERROR: Build falhou!"
    exit 1
fi
echo "✓ Build web completo"
echo ""

# 2. Sincroniza com Capacitor
echo "[2/4] Syncing with Capacitor..."
npx cap sync android
if [ $? -ne 0 ]; then
    echo "ERROR: Sync falhou!"
    exit 1
fi
echo "✓ Capacitor sincronizado"
echo ""

# 3. Copia assets atualizados
echo "[3/4] Copying assets..."
npx cap copy android
echo "✓ Assets copiados"
echo ""

# 4. Abre Android Studio
echo "[4/4] Opening Android Studio..."
npx cap open android
echo ""

echo "========================================"
echo "  Build preparado com sucesso!"
echo "========================================"
echo ""
echo "Próximo passo:"
echo "1. No Android Studio, clique em 'Build' > 'Build Bundle(s) / APK(s)'"
echo "2. Escolha 'Build APK(s)' para gerar o APK"
echo "3. Ou conecte seu celular USB e clique no botão 'Run'"
echo ""
