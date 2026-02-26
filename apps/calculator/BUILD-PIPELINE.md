# OnSite Calculator - Build Pipeline

## Versioning (SEMPRE atualizar antes de build)

4 arquivos precisam estar em sync:

| Arquivo | Campo |
|---------|-------|
| `package.json` | `"version": "1.0.X"` |
| `android/app/build.gradle` | `versionCode N` + `versionName "1.0.X"` |
| `ios/App/App.xcodeproj/project.pbxproj` | `CURRENT_PROJECT_VERSION = N` + `MARKETING_VERSION = 1.0.X` (Debug + Release) |

> `versionCode` / `CURRENT_PROJECT_VERSION` = inteiro incremental (Play Store e App Store exigem que sempre aumente)
> `versionName` / `MARKETING_VERSION` = string visivel ao usuario

---

## 1. Android - Teste via USB (Android Studio)

**Quando usar:** testar no celular conectado via cabo USB

```bash
# 1. Build web + sync pro Android
npx vite build && npx cap sync android

# 2. Abrir no Android Studio
npx cap open android

# 3. No Android Studio:
#    - Conectar celular via USB (Developer Options + USB Debugging ativados)
#    - Selecionar device no dropdown
#    - Clicar Run (triangulo verde) ou Shift+F10
```

**Pre-requisitos no celular:**
- Settings > About Phone > tap "Build Number" 7x (ativa Developer Options)
- Settings > Developer Options > USB Debugging = ON

---

## 2. Android - APK (instalar manualmente / QA)

**Quando usar:** enviar APK para testers ou instalar manualmente

```bash
# 1. Build web + sync
npx vite build && npx cap sync android

# 2. Gerar APK assinado (via PowerShell no Windows)
powershell -Command "Set-Location 'android'; .\gradlew.bat assembleRelease"

# Ou via Claude Code:
# "gera um APK pra mim"
```

**Output:** `android/app/build/outputs/apk/release/app-release.apk` (~3.8 MB)

**Assinatura:** usa keystore em `android/app/onsite-calculator-release.keystore` (configurado em build.gradle)

---

## 3. Android - AAB (Play Store)

**Quando usar:** subir nova versao no Google Play Console

```bash
# 1. Build web + sync
npx vite build && npx cap sync android

# 2. Gerar AAB assinado
powershell -Command "Set-Location 'android'; .\gradlew.bat bundleRelease"

# Ou via Claude Code:
# "gera um AAB pra Play Store"
```

**Output:** `android/app/build/outputs/bundle/release/app-release.aab` (~3.6 MB)

**Upload:** Google Play Console > Production > Create new release > Upload AAB

> IMPORTANTE: `versionCode` deve ser MAIOR que o da versao anterior no Play Store

---

## 4. iOS - TestFlight (Codemagic - AUTOMATICO)

**Quando usar:** push para `main` dispara automaticamente

**Trigger:** `git push origin main`

**O que acontece (codemagic.yaml):**
1. `npm ci` - instala dependencias
2. `npm run build` - build web
3. `npx cap sync ios` - sync Capacitor
4. `pod install` - instala CocoaPods
5. `xcode-project use-profiles` - configura assinatura
6. `agvtool new-version` - incrementa build number automaticamente do TestFlight
7. `xcode-project build-ipa` - compila o IPA
8. Upload para TestFlight (grupo "Internal Testers")

**Monitorar:** https://codemagic.io (dashboard)

**Nao precisa:** mexer em `CURRENT_PROJECT_VERSION` no pbxproj para iOS builds
(Codemagic incrementa automaticamente baseado no ultimo build do TestFlight)

---

## 5. iOS - Debug Build (Codemagic)

**Trigger:** abrir Pull Request (qualquer branch)

**Gera:** IPA de debug para teste (nao publica no TestFlight)

---

## Resumo Rapido

| Acao | Comando |
|------|---------|
| Testar no Android (USB) | `npx vite build && npx cap sync android` → Android Studio Run |
| Gerar APK | `npx vite build && npx cap sync android` → `gradlew assembleRelease` |
| Gerar AAB (Play Store) | `npx vite build && npx cap sync android` → `gradlew bundleRelease` |
| iOS TestFlight | `git push origin main` (automatico via Codemagic) |
| iOS Debug | Abrir PR (automatico via Codemagic) |

---

## Keystore Android

- Arquivo: `android/app/onsite-calculator-release.keystore`
- Alias: `onsite-calculator`
- Configurado em: `android/app/build.gradle` (signingConfigs.release)
- **IMPORTANTE:** este arquivo esta no .gitignore - nao perde ele!

## Env Vars (Codemagic)

- Grupo `supabase_credentials` com:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
