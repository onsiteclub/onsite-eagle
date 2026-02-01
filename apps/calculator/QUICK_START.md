# ⚡ Quick Start - OnSite Calculator

## 🚀 Build em 3 Passos

### 1️⃣ Prepare o Ambiente
```bash
npm install
```

### 2️⃣ Execute o Script
```bash
# Windows (duplo clique)
build-android.bat

# Ou via terminal
npm run android:build
```

### 3️⃣ No Android Studio
- Conecte o celular via USB
- Clique em **Run** (▶️)
- Pronto! 🎉

---

## 🤖 Build Automático (Sem Android Studio)

```bash
# Gera APK + Instala no celular
build-apk.bat
install-to-phone.bat
```

**Resultado:** App instalado no celular! 📱

---

## 🔥 Deploy Completo (Recomendado)

```bash
deploy.bat
```

Faz tudo automaticamente:
- ✅ Verifica código
- ✅ Builda
- ✅ Gera APK
- ✅ Instala no celular
- ✅ Mostra logs

---

## 📊 Scripts Disponíveis

| Comando | O que faz |
|---------|-----------|
| `build-android.bat` | Build + Abre Android Studio |
| `build-apk.bat` | Gera APK via linha de comando |
| `install-to-phone.bat` | Instala APK no celular |
| `deploy.bat` | Deploy completo automatizado |

---

## 🐛 Problemas?

### Celular não detectado:
```bash
# Verifique se aparece:
adb devices

# Se não aparecer:
# 1. Ative "Depuração USB" no celular
# 2. Reconecte o cabo USB
```

### Build falhou:
```bash
# Limpe e tente novamente:
cd android
gradlew clean
cd ..
npm run android:apk
```

### Android Studio não abre:
```bash
# Execute manualmente:
npm run build
npx cap sync android
# Depois abra o Android Studio e importe o projeto em ./android/
```

---

## 📖 Documentação Completa

- **Guia de Build:** [BUILD_GUIDE.md](BUILD_GUIDE.md)
- **Autenticação:** [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md)
- **Checklist:** [CHECKLIST.md](CHECKLIST.md)
- **README:** [README.md](README.md)

---

## ✨ Fluxo do App

```
📱 Abre App
    ↓
🔐 Tela de Login/Signup
    ↓
🔢 Calculadora de Construção
    ↓
🎙️ Clica Voice → Modal de Upgrade
    ↓
💳 Checkout Stripe (navegador)
    ↓
✅ Retorna ao App → Voice Liberado
```

---

**Tudo pronto! Bora buildar! 🚀**
