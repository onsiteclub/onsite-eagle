# Checklist Android — CI/CD Setup

Pipeline: [.github/workflows/build-checklist-android.yml](../../.github/workflows/build-checklist-android.yml)

## O que o workflow faz

| Trigger | Resultado |
|---------|-----------|
| Push em `main` afetando o checklist ou deps | Build release (AAB + APK assinado) |
| `workflow_dispatch` (UI manual) | Build release **ou** debug, à sua escolha |

Saída: artifacts baixáveis na aba **Actions** do GitHub
- `checklist-aab-<sha>` — `.aab` pra Play Store
- `checklist-apk-<sha>` — `.apk` pra instalar direto no device
- `checklist-mapping-<sha>` — ProGuard mapping (retenção 90 dias, pra deobfuscation de crashes)

## Secrets obrigatórios (GitHub → Settings → Secrets and variables → Actions)

| Secret | De onde vem | Exemplo |
|--------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` do app | `https://dbasazrdbtigrdntaehb.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` do app | `eyJhbG...` (JWT público) |
| `CHECKLIST_KEYSTORE_BASE64` | Você gera (veja abaixo) | Longa string base64 |
| `CHECKLIST_KEYSTORE_PASSWORD` | Você escolhe na criação do keystore | Senha forte (≥12 chars) |
| `CHECKLIST_KEY_ALIAS` | Você escolhe na criação | Ex: `checklist-key` |
| `CHECKLIST_KEY_PASSWORD` | Você escolhe na criação | Pode ser a mesma do keystore |

## Gerando o keystore (uma vez só — NUNCA perca esse arquivo)

**CRÍTICO:** o keystore de produção identifica seu app pro Play Store. Se você perder, **não pode mais publicar atualizações do mesmo app** — fica obrigado a registrar um novo pacote.

### 1. Gerar

Rode local na sua máquina (não no CI):

```bash
keytool -genkeypair -v \
  -keystore checklist.keystore \
  -alias checklist-key \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -storepass 'TROQUE_ISSO' \
  -keypass 'TROQUE_ISSO' \
  -dname "CN=OnSite Club, O=OnSite Club Inc, L=Ottawa, ST=Ontario, C=CA"
```

- `validity 10000` = ~27 anos, recomendado pelo Google
- Troque `TROQUE_ISSO` por senhas fortes
- Pode usar alias diferente de `checklist-key` se quiser

### 2. Codificar em base64 (pro secret no GitHub)

**Linux/Mac:**
```bash
base64 -w 0 checklist.keystore > checklist.keystore.base64
```

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("checklist.keystore")) | Out-File -Encoding ASCII checklist.keystore.base64
```

### 3. Backup seguro

- **Mantenha 2 cópias do .keystore em local seguro** (1Password, cofre, pen drive encriptado)
- **Nunca** commite o .keystore ou o .base64 no git
- Anote a senha junto com o backup

### 4. Adicionar os secrets no GitHub

1. Vá em `github.com/<user>/onsite-eagle/settings/secrets/actions`
2. Clique em **New repository secret** e adicione cada um:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `CHECKLIST_KEYSTORE_BASE64` — cole o conteúdo do `.base64`
   - `CHECKLIST_KEYSTORE_PASSWORD`
   - `CHECKLIST_KEY_ALIAS` (ex: `checklist-key`)
   - `CHECKLIST_KEY_PASSWORD`

## Rodar o workflow

### Manual (primeira vez recomendado)

1. GitHub → **Actions** → **Build Checklist Android** → **Run workflow**
2. Selecione a branch (`feat/checklist-capacitor` enquanto estiver em dev)
3. `build_type`: `release` (gera AAB + APK assinados) ou `debug` (só APK debug)
4. Aguarde ~10-15 min
5. Vá em **Artifacts** e baixe

### Automático

Merge em `main` com mudanças no checklist → build release dispara automaticamente.

## Instalar o APK no seu Samsung

1. Baixe `checklist-apk-<sha>.zip` → extraia o `.apk`
2. Conecte o Samsung por USB com **USB debugging habilitado** (Settings → Developer options)
3. Instale via ADB:
   ```bash
   adb install -r path/to/app-release.apk
   ```
4. OU: copia o APK pro telefone (Google Drive / email), abre, confirma "Instalar de fontes desconhecidas"

## Próximos passos (quando tiver Google Play Developer Account — $25 taxa única)

1. Criar service account no Google Cloud (role **Service Account User**)
2. Dar acesso da service account na Play Console (Users & Permissions)
3. Adicionar secret `GOOGLE_PLAY_SERVICE_ACCOUNT` (JSON) no GitHub
4. Adicionar step no workflow:
   ```yaml
   - uses: r0adkll/upload-google-play@v1
     with:
       serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT }}
       packageName: ca.onsiteclub.checklist
       releaseFiles: apps/checklist/android/app/build/outputs/bundle/release/*.aab
       track: internal
       status: draft
   ```
5. Reenvia pro Play Console Internal Testing automaticamente em cada merge

## Troubleshooting

**Build falha com "Keystore was tampered with or password incorrect"**
→ Verifica se `CHECKLIST_KEYSTORE_BASE64` foi colado inteiro, sem quebras de linha. No Windows, prefira `base64 -w 0` (sem wrap) de Git Bash / WSL ao invés do `Out-File` que pode meter BOM/CRLF.

**Build falha em `next build` com "Missing env NEXT_PUBLIC_SUPABASE_URL"**
→ Secrets não configurados corretamente. Valida na aba Settings → Secrets.

**Gradle out-of-memory**
→ Runner ubuntu-latest tem 7GB RAM, suficiente pro Gradle 8. Se bater, adicione ao início do job:
```yaml
env:
  GRADLE_OPTS: '-Xmx4g -XX:MaxMetaspaceSize=1g'
```

**APK instala mas abre com splash verde e não carrega**
→ Log via `adb logcat | grep -i capacitor` no device. Provavelmente um plugin nativo faltando ou erro no JavaScript bundle. Checa se o `out/` foi copiado pro `android/app/src/main/assets/public/`.
