# OnSite Checklist — Plano de Implementacao Capacitor

> Branch: `feat/checklist-capacitor`
> Base: Next.js 16.1.6 web app → Capacitor native (Android + iOS)
> CI/CD: GitHub Actions (Android) + Codemagic (iOS)
> Meta: Aprovacao Play Store + App Store

---

## VISAO GERAL

```
┌─────────────────────────────────────────────────────────────┐
│                    ESTADO ATUAL                              │
│                                                              │
│  Next.js web app (apps/checklist/)                          │
│  • 2 fluxos: autenticado + self-service                     │
│  • Fotos via <input type="file"> + Supabase Storage         │
│  • Templates hardcoded + DB (frm_gate_check_templates)      │
│  • Sem offline, sem SQLite, sem camera nativa               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    ESTADO FINAL                              │
│                                                              │
│  Capacitor app (Android + iOS)                              │
│  • SQLite local (offline-first, funciona sem sinal)         │
│  • Camera nativa (melhor qualidade, compressao)             │
│  • Fotos no filesystem do device                            │
│  • Sync queue → Supabase quando online                      │
│  • Auth persistido via Preferences                          │
│  • Distribuicao: Play Store + App Store                     │
└─────────────────────────────────────────────────────────────┘
```

---

## FASE 0 — FUNDACAO CAPACITOR (~1 dia)

**Objetivo:** Next.js buildado como static export, rodando dentro do Capacitor shell.

### 0.1 Configurar Next.js para Static Export

```js
// next.config.js
module.exports = {
  output: 'export',        // Gera HTML/CSS/JS estatico em /out
  images: { unoptimized: true },
  // trailingSlash: true    // Necessario pra deep links funcionarem
}
```

**Impacto:** API routes (`/api/*`) NAO funcionam em static export.
- `/api/reports` → migrar pra Supabase Edge Function ou client-side direto
- `/api/upload` → upload direto via Supabase Storage SDK
- `middleware.ts` → auth check move pra client-side guard

### 0.2 Capacitor Init

```bash
cd apps/checklist
npm install @capacitor/core @capacitor/cli
npx cap init "OnSite Checklist" "ca.onsiteclub.checklist" --web-dir out
npx cap add android
npx cap add ios
```

### 0.3 capacitor.config.ts

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ca.onsiteclub.checklist',
  appName: 'OnSite Checklist',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0F766E'
    }
  }
};

export default config;
```

### 0.4 Scripts no package.json

```json
{
  "scripts": {
    "build:native": "next build && npx cap sync",
    "build:android": "npm run build:native && npx cap open android",
    "build:ios": "npm run build:native && npx cap open ios",
    "dev": "next dev --port 3004",
    "dev:native": "next dev --port 3004 & npx cap run android --livereload --external"
  }
}
```

### 0.5 Validacao Fase 0

- [ ] `npm run build` gera `/out` com todos os HTML
- [ ] `npx cap sync android` copia pra `android/app/src/main/assets/public/`
- [ ] App abre no device/emulador mostrando o checklist web
- [ ] Navegacao entre paginas funciona (client-side routing)

---

## FASE 1 — PLUGINS NATIVOS (~1 dia)

**Objetivo:** Substituir APIs web por plugins nativos do Capacitor.

### 1.1 Instalar Plugins

```bash
npm install @capacitor/camera @capacitor/filesystem @capacitor/network \
            @capacitor/preferences @capacitor/splash-screen @capacitor/app \
            @capacitor/haptics @capacitor/status-bar
```

### 1.2 Camera Nativa

Substituir `<input type="file" accept="image/*">` por `Camera.getPhoto()`:

```ts
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

async function takePhoto(): Promise<string> {
  const photo = await Camera.getPhoto({
    quality: 72,
    width: 1280,
    resultType: CameraResultType.Uri,    // Retorna path no device
    source: CameraSource.Camera,
    saveToGallery: false
  });
  return photo.path!;  // file:///var/.../photo.jpg
}
```

**Componente:** `PhotoCaptureNative.tsx` — substitui `PhotoCapture.tsx` e `PhotoCaptureLocal.tsx`

### 1.3 Filesystem

Fotos salvas no disco do device (nao base64 em memoria):

```ts
import { Filesystem, Directory } from '@capacitor/filesystem';

// Salvar foto comprimida
const savedFile = await Filesystem.copy({
  from: photo.path,
  to: `checklist-photos/${uuid}.jpg`,
  toDirectory: Directory.Data
});

// Ler pra preview
const file = await Filesystem.readFile({
  path: `checklist-photos/${uuid}.jpg`,
  directory: Directory.Data
});
// file.data = base64 (pra exibir em <img>)
```

### 1.4 Network Detection

```ts
import { Network } from '@capacitor/network';

// Estado atual
const status = await Network.getStatus();
// status.connected: boolean
// status.connectionType: 'wifi' | 'cellular' | 'none' | 'unknown'

// Listener pra mudancas
Network.addListener('networkStatusChange', (status) => {
  if (status.connected) {
    triggerSync();  // Dispara sync quando volta online
  }
});
```

### 1.5 Auth Persistence

```ts
import { Preferences } from '@capacitor/preferences';

// Salvar sessao
await Preferences.set({ key: 'supabase_session', value: JSON.stringify(session) });

// Recuperar no startup
const { value } = await Preferences.get({ key: 'supabase_session' });
if (value) {
  const session = JSON.parse(value);
  await supabase.auth.setSession(session);
}
```

### 1.6 Permissoes Android/iOS

**android/app/src/main/AndroidManifest.xml:**
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

**ios/App/App/Info.plist:**
```xml
<key>NSCameraUsageDescription</key>
<string>OnSite Checklist needs camera access to photograph construction inspections</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>OnSite Checklist needs photo library access to attach existing photos to inspections</string>
```

### 1.7 Validacao Fase 1

- [ ] Camera nativa abre e tira foto
- [ ] Foto salva no filesystem do device
- [ ] Preview da foto carrega do filesystem
- [ ] Network.getStatus() retorna estado correto
- [ ] Auth persiste entre kills do app

---

## FASE 2 — SQLITE + OFFLINE-FIRST (~3 dias)

**Objetivo:** App funciona 100% offline. Dados sincronizam quando tem sinal.

### 2.1 Instalar SQLite

```bash
npm install @capacitor-community/sqlite
npm install drizzle-orm
npm install -D drizzle-kit
```

### 2.2 Schema SQLite (Drizzle)

```ts
// lib/db/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const gateChecks = sqliteTable('gate_checks', {
  id: text('id').primaryKey(),              // UUID v4 gerado local
  remoteId: text('remote_id'),              // Preenchido apos sync
  lotId: text('lot_id').notNull(),
  lotNumber: text('lot_number'),
  jobsiteName: text('jobsite_name'),
  transition: text('transition').notNull(), // framing_to_roofing, etc.
  checkedBy: text('checked_by'),            // user_id ou nome (self-service)
  checkedByName: text('checked_by_name'),
  status: text('status').notNull().default('in_progress'),
  organizationId: text('organization_id'),
  syncStatus: text('sync_status').notNull().default('pending'),
  // pending | syncing | synced | error
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const gateCheckItems = sqliteTable('gate_check_items', {
  id: text('id').primaryKey(),
  gateCheckId: text('gate_check_id').notNull(),
  itemCode: text('item_code').notNull(),
  itemLabel: text('item_label').notNull(),
  isBlocking: integer('is_blocking', { mode: 'boolean' }).default(false),
  result: text('result').notNull().default('pending'),
  // pending | pass | fail | na
  notes: text('notes'),
  syncStatus: text('sync_status').notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

export const photos = sqliteTable('photos', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  gateCheckId: text('gate_check_id').notNull(),
  localPath: text('local_path').notNull(),  // file:///...
  remoteUrl: text('remote_url'),            // Preenchido apos upload
  syncStatus: text('sync_status').notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const syncQueue = sqliteTable('sync_queue', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  entityType: text('entity_type').notNull(), // check | item | photo
  entityId: text('entity_id').notNull(),
  operation: text('operation').notNull(),    // create | update
  payload: text('payload').notNull(),        // JSON
  priority: integer('priority').notNull().default(0),
  // 0 = normal, 1 = high (completion), 2 = photo
  attempts: integer('attempts').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(5),
  lastError: text('last_error'),
  lastAttemptAt: integer('last_attempt_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

// Templates cacheados do servidor
export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  transition: text('transition').notNull(),
  itemCode: text('item_code').notNull(),
  itemLabel: text('item_label').notNull(),
  sortOrder: integer('sort_order').notNull(),
  isBlocking: integer('is_blocking', { mode: 'boolean' }).default(false),
  fetchedAt: integer('fetched_at', { mode: 'timestamp' }),
});
```

### 2.3 Database Manager

```ts
// lib/db/manager.ts
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

class DatabaseManager {
  private sqlite: SQLiteConnection;
  private db: any;

  async initialize() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.db = await this.sqlite.createConnection(
      'checklist',     // DB name
      false,           // encrypted
      'no-encryption', // mode
      1,               // version
      false            // readonly
    );
    await this.db.open();
    await this.runMigrations();
  }

  async runMigrations() {
    // Cria tabelas se nao existem
    // Versiona via PRAGMA user_version
  }
}
```

### 2.4 Sync Engine

```ts
// lib/sync/engine.ts

class SyncEngine {
  private isRunning = false;
  private intervalId: number | null = null;

  // Inicia sync periodico (30s) + listener de network
  start() {
    this.intervalId = setInterval(() => this.processQueue(), 30_000);
    Network.addListener('networkStatusChange', (s) => {
      if (s.connected) this.processQueue();
    });
  }

  async processQueue() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const status = await Network.getStatus();
      if (!status.connected) return;

      // 1. Fotos primeiro (geram URLs necessarias pros items)
      await this.syncPhotos(5);

      // 2. Gate checks (cria no servidor)
      await this.syncGateChecks(5);

      // 3. Items (atualiza resultados)
      await this.syncGateCheckItems(10);

      // 4. Completions (dispara completeGateCheck no servidor)
      await this.syncCompletions();

    } finally {
      this.isRunning = false;
    }
  }

  private async syncPhotos(batch: number) {
    // Pega N fotos com sync_status = 'pending'
    // Upload pra Supabase Storage
    // Atualiza remote_url na tabela photos
    // Remove da sync_queue
  }

  private async syncGateChecks(batch: number) {
    // Pega checks com sync_status = 'pending'
    // POST pra Supabase (insert frm_gate_checks)
    // Salva remote_id retornado
    // Marca synced
  }

  private async syncGateCheckItems(batch: number) {
    // Pega items modificados
    // PATCH no Supabase (update frm_gate_check_items)
    // Marca synced
  }

  private async syncCompletions() {
    // Checks com status = 'passed'|'failed' e sync do completion pendente
    // Chama completeGateCheck() no servidor via RPC ou Edge Function
    // Isso dispara auto-advance do lote no servidor
  }
}
```

### 2.5 Fluxo de Write (Offline)

```
Carpinteiro marca item PASS
  → SQLite: UPDATE gate_check_items SET result='pass', sync_status='pending'
  → SQLite: INSERT INTO sync_queue (entity_type='item', operation='update', ...)
  → UI: "✓" imediato (zero espera de rede)

Carpinteiro tira foto
  → Camera.getPhoto() → file:///var/.../photo.jpg
  → Filesystem.copy() → Data/checklist-photos/{uuid}.jpg
  → SQLite: INSERT INTO photos (local_path=..., sync_status='pending')
  → SQLite: INSERT INTO sync_queue (entity_type='photo', operation='create', ...)
  → UI: thumbnail do filesystem local

Background (a cada 30s ou network:online)
  → SyncEngine.processQueue()
  → Fotos: upload → remote_url
  → Items: update com remote_url da foto
  → Check completion: chama servidor pra auto-advance
```

### 2.6 Conflito Resolution

```
Estrategia: last-write-wins (simples e suficiente pra checklist)

- Cada item tem updated_at (timestamp local)
- No sync, envia updated_at junto
- Servidor compara: se server.updated_at > local.updated_at → descarta
- Se local e mais recente → aceita

Caso raro (2 pessoas editando mesmo check):
- Adicionar campo 'version' (lamport clock)
- Se conflito detectado → marcar item como 'needs_review'
- Dashboard supervisor mostra badge "⚠ conflito"
```

### 2.7 Template Caching

```
No primeiro uso (ou periodicamente):
  → Fetch frm_gate_check_templates do Supabase
  → Salva na tabela templates do SQLite
  → Offline: usa templates locais pra instanciar checklist
  → Campo fetched_at pra saber quando atualizar (24h TTL)
```

### 2.8 Validacao Fase 2

- [ ] Criar checklist offline (sem conexao) funciona
- [ ] Marcar items pass/fail offline funciona
- [ ] Fotos salvas no filesystem local
- [ ] Sync automatico quando volta online
- [ ] Dados aparecem no Supabase apos sync
- [ ] App sobrevive kill + reopen (dados persistem)
- [ ] Templates carregam do cache quando offline

---

## FASE 3 — MIGRAR API ROUTES (~1 dia)

**Objetivo:** Eliminar dependencia de API routes (incompativeis com static export).

### 3.1 Upload direto (substituir /api/upload)

```ts
// Antes: POST /api/upload (server-side)
// Depois: upload direto do client

import { createClient } from '@supabase/supabase-js';

async function uploadPhoto(localPath: string, gateCheckId: string, itemCode: string) {
  const file = await Filesystem.readFile({
    path: localPath,
    directory: Directory.Data
  });

  const blob = base64ToBlob(file.data, 'image/jpeg');
  const path = `gate-checks/${gateCheckId}/${itemCode}_${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from('frm-media')
    .upload(path, blob, { contentType: 'image/jpeg' });

  return supabase.storage.from('frm-media').getPublicUrl(path).data.publicUrl;
}
```

### 3.2 Reports direto (substituir /api/reports)

```ts
// Criar report: INSERT direto via Supabase client
async function createSharedReport(data: ReportData) {
  const token = generateToken();
  const reference = generateReference();

  const { data: report } = await supabase
    .from('frm_shared_reports')
    .insert({ ...data, token, reference })
    .select()
    .single();

  // Inserir items
  await supabase
    .from('frm_shared_report_items')
    .insert(data.items.map(item => ({ ...item, report_id: report.id })));

  return { token, reference };
}
```

### 3.3 Auth Guard Client-Side (substituir middleware.ts)

```ts
// components/AuthGuard.tsx
function AuthGuard({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Tenta recuperar sessao do Preferences
    // Se nao tem → mostra LoginPage
    // Se tem → setSession e renderiza children
  }, []);

  if (loading) return <SplashScreen />;
  if (!session) return <LoginPage />;
  return children;
}
```

### 3.4 Validacao Fase 3

- [ ] Build `next build` com `output: 'export'` funciona
- [ ] Nenhuma API route no projeto
- [ ] Upload de fotos funciona direto do client
- [ ] Auth guard client-side funciona
- [ ] Reports criados/editados sem API route

---

## FASE 4 — UX NATIVA + POLISH (~2 dias)

**Objetivo:** App parece e funciona como nativo, nao como web embrulhado.

### 4.1 Splash Screen

```ts
import { SplashScreen } from '@capacitor/splash-screen';

// No startup, apos carregar dados:
await SplashScreen.hide({ fadeOutDuration: 300 });
```

Assets:
- `android/app/src/main/res/drawable/splash.xml` — verde teal #0F766E
- `ios/App/App/Assets.xcassets/Splash.imageset/`

### 4.2 Status Bar

```ts
import { StatusBar, Style } from '@capacitor/status-bar';

StatusBar.setBackgroundColor({ color: '#0F766E' });
StatusBar.setStyle({ style: Style.Dark });  // Texto branco
```

### 4.3 Haptic Feedback

```ts
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Ao marcar item como pass/fail:
await Haptics.impact({ style: ImpactStyle.Light });

// Ao completar checklist:
await Haptics.notification({ type: 'SUCCESS' });
```

### 4.4 Indicador de Sync

```
┌──────────────────────────────────────┐
│ 🟢 Synced              ← Online     │
│ 🟡 3 pending ↑         ← Offline    │
│ 🔴 Sync error (retry)  ← Erro       │
└──────────────────────────────────────┘
```

Componente `SyncBadge.tsx` — fixo no header, mostra estado da sync queue.

### 4.5 Pull-to-Refresh

Em listas (lotes, checks) — puxa pra baixo recarrega dados do servidor.

### 4.6 App Icon + Assets

Necessarios pra store submission:

| Asset | Android | iOS |
|-------|---------|-----|
| Icon | `mipmap-xxxhdpi` (192x192) | `AppIcon` (1024x1024) |
| Splash | `drawable/splash.xml` | LaunchScreen.storyboard |
| Feature graphic | 1024x500 (Play Store) | — |
| Screenshots | 16:9 phone, 10" tablet | 6.7" + 6.1" + iPad |

**Design:** Fundo teal (#0F766E), icone de checklist/clipboard branco,
texto "OnSite" embaixo. Consistente com Calculator.

### 4.7 Validacao Fase 4

- [ ] Splash screen aparece no boot
- [ ] Status bar teal com texto branco
- [ ] Haptics funcionam ao interagir
- [ ] Sync badge mostra estado correto
- [ ] App icon visivel no launcher
- [ ] Screenshots prontos pra store

---

## FASE 5 — STORE COMPLIANCE (~1-2 dias)

**Objetivo:** Tudo que Apple e Google exigem ALEM do app funcional.

### 5.1 Requisitos COMUNS (ambas stores)

| Requisito | Status | Acao |
|-----------|--------|------|
| Privacy Policy | TBD | Criar em `onsiteclub.ca/legal/checklist/privacy.html` |
| Terms of Service | TBD | Criar em `onsiteclub.ca/legal/checklist/terms.html` |
| Age Rating | — | Preencher questionario (sem conteudo adulto) |
| App Description | — | Escrever (EN + PT-BR) |
| Screenshots | — | Gerar 3-5 por device size |
| Support URL | — | `onsiteclub.ca/support` |
| Contact email | — | `support@onsiteclub.ca` |

### 5.2 Google Play Store (Android)

| Requisito | Detalhe |
|-----------|---------|
| Target SDK | 34 (Android 14) — ja configurado |
| Data Safety Form | Declarar: camera, fotos, dados de inspecao |
| App Signing | Google Play App Signing (upload key local) |
| Content Rating | IARC questionnaire |
| Store Listing | Title (30 chars), Short desc (80), Full desc (4000) |
| Feature Graphic | 1024x500 PNG |
| Track | Internal → Closed Beta → Production |
| AAB format | Obrigatorio (nao APK) |
| Declarations | Nao usa ads, nao e app de noticias, nao e governo |

**Data Safety Form — O que declarar:**

| Dado | Coletado | Compartilhado | Proposito |
|------|----------|---------------|-----------|
| Fotos | Sim | Nao | Funcionalidade do app |
| Nome/email | Sim | Nao | Conta e autenticacao |
| Dados de inspecao | Sim | Nao | Funcionalidade do app |
| Device info | Sim | Nao | Diagnostico |

### 5.3 Apple App Store (iOS)

| Requisito | Detalhe |
|-----------|---------|
| Xcode 16+ | Build com ultima versao |
| Deployment Target | iOS 16.0 (cobre 95%+ devices) |
| App Privacy | Nutrition label (similar ao Data Safety) |
| Review Guidelines | 4.2 (funcionalidade minima) — CRITICO |
| Screenshots | 6.7" (iPhone 15 Pro Max), 6.1" (iPhone 15), iPad |
| TestFlight | Obrigatorio antes de Production |
| Bundle ID | `ca.onsiteclub.checklist` |
| Provisioning | Managed by Codemagic |

**Guideline 4.2 — Minimum Functionality (a mais perigosa):**

Apple rejeita apps que sao "apenas um website embrulhado". O checklist
app passa porque tem funcionalidade nativa REAL:

```
✅ Camera nativa (nao <input type="file">)
✅ SQLite local (dados persistem offline)
✅ Filesystem (fotos no disco, nao cache web)
✅ Network detection (sync inteligente)
✅ Haptic feedback
✅ Splash screen nativa
✅ Funciona COMPLETAMENTE offline
```

**Justificativa pra review:** "OnSite Checklist is a construction
inspection tool designed for job sites with limited connectivity.
It uses native camera, local SQLite database, and filesystem storage
to enable fully offline inspections. Data syncs to our backend
when connectivity is restored."

### 5.4 Legal Pages

**Privacy Policy deve incluir:**
- Quais dados sao coletados (fotos, nome, email, dados de inspecao)
- Como sao armazenados (Supabase, criptografia em transito)
- Retencao (quanto tempo guarda)
- Direitos do usuario (deletar conta, exportar dados)
- Contato do DPO/responsavel

**Terms of Service deve incluir:**
- Uso aceito (inspecao de construcao, nao outro fim)
- Responsabilidade (app e ferramenta, nao substitui inspetor certificado)
- Propriedade intelectual
- Limitacao de responsabilidade

### 5.5 Validacao Fase 5

- [ ] Privacy Policy publicada e acessivel
- [ ] Terms of Service publicados
- [ ] Data Safety Form preenchido (Play Console)
- [ ] App Privacy preenchido (App Store Connect)
- [ ] Screenshots gerados pra todos os tamanhos
- [ ] Descricoes escritas (EN obrigatorio, PT-BR opcional)
- [ ] Content rating/age rating preenchido

---

## FASE 6 — CI/CD (~2 dias)

**Objetivo:** Build e deploy automatizado. Push to main = builds prontos.

### 6.1 GitHub Actions — Android

```yaml
# .github/workflows/build-checklist-android.yml

name: Checklist Android Build

on:
  push:
    branches: [main]
    paths:
      - 'apps/checklist/**'
      - 'packages/framing/**'
      - 'packages/export/**'
  workflow_dispatch:
    inputs:
      track:
        description: 'Play Store track'
        required: true
        default: 'internal'
        type: choice
        options: [internal, alpha, beta, production]

jobs:
  build-android:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Install dependencies
        run: npm ci

      - name: Build Next.js (static export)
        working-directory: apps/checklist
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: npm run build

      - name: Capacitor sync
        working-directory: apps/checklist
        run: npx cap sync android

      - name: Decode keystore
        working-directory: apps/checklist/android
        run: echo "${{ secrets.CHECKLIST_KEYSTORE_BASE64 }}" | base64 -d > app/checklist.keystore

      - name: Build AAB (Release)
        working-directory: apps/checklist/android
        env:
          KEYSTORE_PATH: checklist.keystore
          KEYSTORE_PASSWORD: ${{ secrets.CHECKLIST_KEYSTORE_PASSWORD }}
          KEY_ALIAS: ${{ secrets.CHECKLIST_KEY_ALIAS }}
          KEY_PASSWORD: ${{ secrets.CHECKLIST_KEY_PASSWORD }}
        run: |
          ./gradlew bundleRelease \
            -Pandroid.injected.signing.store.file=$PWD/app/$KEYSTORE_PATH \
            -Pandroid.injected.signing.store.password=$KEYSTORE_PASSWORD \
            -Pandroid.injected.signing.key.alias=$KEY_ALIAS \
            -Pandroid.injected.signing.key.password=$KEY_PASSWORD

      - name: Build APK (Debug — testers)
        working-directory: apps/checklist/android
        run: ./gradlew assembleRelease
          -Pandroid.injected.signing.store.file=$PWD/app/$KEYSTORE_PATH
          -Pandroid.injected.signing.store.password=$KEYSTORE_PASSWORD
          -Pandroid.injected.signing.key.alias=$KEY_ALIAS
          -Pandroid.injected.signing.key.password=$KEY_PASSWORD

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: checklist-android-${{ github.sha }}
          path: |
            apps/checklist/android/app/build/outputs/bundle/release/*.aab
            apps/checklist/android/app/build/outputs/apk/release/*.apk

      - name: Upload to Play Store
        if: github.ref == 'refs/heads/main'
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT }}
          packageName: ca.onsiteclub.checklist
          releaseFiles: apps/checklist/android/app/build/outputs/bundle/release/*.aab
          track: ${{ inputs.track || 'internal' }}
          status: draft
```

### 6.2 Codemagic — iOS

```yaml
# codemagic.yaml (adicionar ao existente na raiz)

workflows:
  # ... workflows existentes (timekeeper, calculator) ...

  checklist-ios-testflight:
    name: Checklist iOS TestFlight
    instance_type: mac_mini_m2
    max_build_duration: 60
    integrations:
      app_store_connect: OnSite Checklist
    environment:
      ios_signing:
        distribution_type: app_store
        bundle_identifier: ca.onsiteclub.checklist
      groups:
        - supabase_credentials
      node: 20
      xcode: latest
      cocoapods: default
      vars:
        APP_DIR: apps/checklist
    triggering:
      events:
        - push
      branch_patterns:
        - pattern: main
          include: true
      cancel_previous_builds: true
    scripts:
      - name: Install dependencies
        script: npm ci

      - name: Build Next.js static export
        script: |
          cd $APP_DIR
          npm run build

      - name: Capacitor sync iOS
        script: |
          cd $APP_DIR
          npx cap sync ios

      - name: Install CocoaPods
        script: |
          cd $APP_DIR/ios/App
          pod install

      - name: Set up code signing
        script: xcode-project use-profiles

      - name: Increment build number
        script: |
          LATEST=$(app-store-connect get-latest-testflight-build-number \
            "$APP_STORE_APPLE_ID")
          cd $APP_DIR/ios/App
          agvtool new-version -all $((LATEST + 1))

      - name: Build IPA
        script: |
          cd $APP_DIR/ios/App
          xcode-project build-ipa \
            --workspace App.xcworkspace \
            --scheme App \
            --config Release

    artifacts:
      - $APP_DIR/ios/App/build/ios/ipa/*.ipa

    publishing:
      app_store_connect:
        auth: integration
        submit_to_testflight: true
        beta_groups:
          - Internal Testers

  checklist-ios-debug:
    name: Checklist iOS Debug (PR)
    instance_type: mac_mini_m2
    max_build_duration: 45
    environment:
      groups:
        - supabase_credentials
      node: 20
      xcode: latest
      cocoapods: default
      vars:
        APP_DIR: apps/checklist
    triggering:
      events:
        - pull_request
      branch_patterns:
        - pattern: '*'
          include: true
    scripts:
      - name: Install dependencies
        script: npm ci

      - name: Build Next.js
        script: |
          cd $APP_DIR
          npm run build

      - name: Capacitor sync iOS
        script: |
          cd $APP_DIR
          npx cap sync ios

      - name: Install CocoaPods
        script: |
          cd $APP_DIR/ios/App
          pod install

      - name: Build Debug
        script: |
          cd $APP_DIR/ios/App
          xcode-project build-ipa \
            --workspace App.xcworkspace \
            --scheme App \
            --config Debug \
            --archive-flags="-destination 'generic/platform=iOS Simulator'"
```

### 6.3 Secrets Necessarios

**GitHub Actions (Android):**

| Secret | Descricao | Como gerar |
|--------|-----------|------------|
| `SUPABASE_URL` | URL do projeto | Ja existe |
| `SUPABASE_ANON_KEY` | Chave publica | Ja existe |
| `CHECKLIST_KEYSTORE_BASE64` | Keystore codificado | `base64 -w 0 checklist.keystore` |
| `CHECKLIST_KEYSTORE_PASSWORD` | Senha do keystore | Gerar e guardar |
| `CHECKLIST_KEY_ALIAS` | Alias da chave | Definir na criacao |
| `CHECKLIST_KEY_PASSWORD` | Senha da chave | Gerar e guardar |
| `GOOGLE_PLAY_SERVICE_ACCOUNT` | JSON da service account | Play Console → API Access |

**Gerar keystore:**
```bash
keytool -genkeypair -v \
  -keystore checklist.keystore \
  -alias checklist-key \
  -keyalg RSA -keysize 2048 \
  -validity 10000 \
  -storepass <SENHA> \
  -keypass <SENHA> \
  -dname "CN=OnSite Club, O=OnSite Club Inc, L=Ottawa, ST=Ontario, C=CA"
```

**Codemagic (iOS):**

| Config | Descricao | Onde configurar |
|--------|-----------|-----------------|
| App Store Connect API | Integracao automatica | Codemagic → Integrations |
| Bundle ID | `ca.onsiteclub.checklist` | Apple Developer Portal |
| Provisioning Profile | Managed by Codemagic | Automatico via integration |
| Beta Group | "Internal Testers" | App Store Connect |

### 6.4 Validacao Fase 6

- [ ] Push to main → GitHub Actions builda AAB + APK
- [ ] AAB publicado no Play Console (internal track, draft)
- [ ] APK disponivel como artifact pra download
- [ ] Push to main → Codemagic builda IPA
- [ ] IPA publicada no TestFlight
- [ ] PR → build de debug roda (smoke test)

---

## FASE 7 — DISTRIBUICAO INICIAL (testers) (~1 dia)

**Objetivo:** App nas maos de testers ANTES de submeter pra review.

### 7.1 Android — APK direto + Internal Testing

```
Caminho rapido (testers imediatos):
  GitHub Actions → artifact APK → link no WhatsApp do tester
  Tester instala em 30s, sem Play Store

Caminho oficial (pre-review):
  GitHub Actions → AAB → Play Console Internal Testing
  Ate 100 testers por email, instalam via Play Store
  Review do Google: ~horas (internal), ~dias (production)
```

### 7.2 iOS — TestFlight

```
Codemagic → IPA → App Store Connect → TestFlight
  → Convida testers por email (ate 10.000)
  → Review leve (~2 dias na primeira vez, automatico depois)
  → Builds expiram em 90 dias
```

### 7.3 Checklist de Teste

```
Cenario 1: Online completo
  [ ] Login
  [ ] Selecionar lote
  [ ] Abrir checklist (framing_to_roofing)
  [ ] Marcar todos items (mix de pass/fail/na)
  [ ] Tirar foto com camera nativa
  [ ] Submeter
  [ ] Verificar dados no Supabase

Cenario 2: Offline completo
  [ ] Ativar modo aviao
  [ ] Criar checklist
  [ ] Marcar items + tirar fotos
  [ ] Submeter (deve salvar local)
  [ ] Desativar modo aviao
  [ ] Verificar sync automatico
  [ ] Dados aparecem no Supabase

Cenario 3: Transicao online/offline
  [ ] Comecar checklist online
  [ ] Perder sinal no meio
  [ ] Continuar marcando items
  [ ] Sinal volta
  [ ] Sync parcial funciona

Cenario 4: Kill + reopen
  [ ] Comecar checklist
  [ ] Force-kill o app
  [ ] Reabrir
  [ ] Checklist retoma de onde parou

Cenario 5: Self-service
  [ ] Fluxo sem login
  [ ] Gerar report compartilhavel
  [ ] Link funciona no navegador
  [ ] PDF gera corretamente
```

### 7.4 Validacao Fase 7

- [ ] Pelo menos 3 testers com app instalado (Android)
- [ ] Pelo menos 1 tester com TestFlight (iOS)
- [ ] Todos os 5 cenarios de teste passando
- [ ] Feedback coletado e bugs criticos corrigidos

---

## FASE 8 — SUBMISSAO PARA STORES (~1-2 dias)

### 8.1 Play Store — Production

```
1. Play Console → Create app
   - App name: "OnSite Checklist"
   - Default language: English (Canada)
   - App category: Business → Construction

2. Store listing
   - Title: "OnSite Checklist - Construction QA"
   - Short description: "Offline-first construction inspection checklist"
   - Full description: (ver abaixo)
   - Screenshots: 3-5 por device
   - Feature graphic: 1024x500

3. Content rating → IARC questionnaire

4. Data safety → Preencher formulario

5. Pricing → Free

6. Release
   - Internal → Closed Beta → Open Beta → Production
   - Cada track requer review separado
```

### 8.2 App Store — Production

```
1. Apple Developer Portal
   - Register Bundle ID: ca.onsiteclub.checklist
   - Create App Store Connect record

2. App Store Connect
   - App name: "OnSite Checklist"
   - Subtitle: "Construction Inspection Tool"
   - Category: Business
   - Screenshots: 6.7", 6.1", iPad

3. App Review Information
   - Demo account (obrigatorio se tem login)
   - Review notes explaining native features

4. App Privacy
   - Nutrition labels (Data Used to Track You, etc.)

5. Submit for review
   - Primeira review: 1-3 dias
   - Resubmissao: 1-2 dias
```

### 8.3 Store Description (EN)

```
OnSite Checklist — Construction Phase Inspection

Built for the job site, not the office. OnSite Checklist lets
construction supervisors and inspectors run gate checks between
building phases — even with no internet connection.

FEATURES:
• Offline-first: Complete inspections without cell service
• Native camera: Capture deficiency photos instantly
• Auto-sync: Data uploads when connectivity returns
• Gate checks: Framing → Roofing → Trades → Final
• Photo evidence: Attach photos to any checklist item
• Shareable reports: Generate links or PDFs for stakeholders
• Deficiency tracking: Failed items auto-create follow-ups

DESIGNED FOR:
• Framing supervisors
• Building inspectors
• Quality assurance teams
• Construction project managers

Works seamlessly with the OnSite Club ecosystem for
construction workforce management.
```

### 8.4 Riscos de Rejeicao e Mitigacao

| Risco | Store | Mitigacao |
|-------|-------|-----------|
| "Web app wrapper" (4.2) | Apple | Camera nativa, SQLite, Filesystem, offline-first |
| Login obrigatorio | Apple | Manter fluxo self-service sem login |
| Crash no review | Ambas | Testar em devices similares aos reviewers |
| Privacy gaps | Ambas | Privacy policy completa antes de submeter |
| Screenshots genericos | Ambas | Screenshots reais com dados de demo |
| Metadata rejection | Apple | Nao usar "beta" ou "test" na descricao |

### 8.5 Validacao Fase 8

- [ ] App publicado no Play Store (pode ser closed beta)
- [ ] App publicado no App Store (via TestFlight → production)
- [ ] Nenhuma rejeicao pendente
- [ ] Links de download funcionando

---

## TIMELINE ESTIMADA

```
Semana 1:
  Fase 0 (Capacitor init)         — 1 dia
  Fase 1 (Plugins nativos)        — 1 dia
  Fase 2 (SQLite + offline)       — 3 dias

Semana 2:
  Fase 3 (Migrar API routes)      — 1 dia
  Fase 4 (UX nativa)              — 2 dias
  Fase 5 (Store compliance)       — 1-2 dias

Semana 3:
  Fase 6 (CI/CD)                  — 2 dias
  Fase 7 (Testers)                — 1 dia
  Fase 8 (Submissao)              — 1-2 dias

Total: ~2-3 semanas
```

---

## DEPENDENCIAS EXTERNAS (usuario precisa fazer)

| # | Acao | Onde | Bloqueio |
|---|------|------|----------|
| 1 | Criar Google Play Developer account ($25) | play.google.com | Fase 6 |
| 2 | Criar Apple Developer account ($99/ano) | developer.apple.com | Fase 6 |
| 3 | Gerar keystore Android | Terminal local | Fase 6 |
| 4 | Configurar App Store Connect integration no Codemagic | codemagic.io | Fase 6 |
| 5 | Adicionar secrets no GitHub repo | GitHub Settings | Fase 6 |
| 6 | Publicar Privacy Policy | onsiteclub.ca | Fase 5 |
| 7 | Publicar Terms of Service | onsiteclub.ca | Fase 5 |
| 8 | Criar screenshots/assets | Figma/real device | Fase 4 |
| 9 | Criar demo account pra Apple review | Supabase | Fase 8 |

---

## ARQUIVOS QUE SERAO CRIADOS/MODIFICADOS

### Novos
```
apps/checklist/capacitor.config.ts
apps/checklist/android/                    — Gerado por cap add android
apps/checklist/ios/                        — Gerado por cap add ios
apps/checklist/lib/db/schema.ts            — Drizzle schema SQLite
apps/checklist/lib/db/manager.ts           — Database manager
apps/checklist/lib/sync/engine.ts          — Sync engine
apps/checklist/lib/native/camera.ts        — Camera wrapper
apps/checklist/lib/native/filesystem.ts    — Filesystem wrapper
apps/checklist/lib/native/network.ts       — Network wrapper
apps/checklist/lib/native/auth.ts          — Auth persistence
apps/checklist/components/PhotoCaptureNative.tsx
apps/checklist/components/SyncBadge.tsx
apps/checklist/components/AuthGuard.tsx
.github/workflows/build-checklist-android.yml
codemagic.yaml                             — Adicionar workflows checklist
```

### Modificados
```
apps/checklist/next.config.js              — output: 'export'
apps/checklist/package.json                — +deps Capacitor, SQLite, Drizzle
apps/checklist/middleware.ts               — Remover (substituir por AuthGuard)
apps/checklist/app/api/*                   — Remover (substituir por client-side)
apps/checklist/components/ChecklistItem.tsx — Usar PhotoCaptureNative
apps/checklist/components/PhotoCapture.tsx  — Substituir por Native
apps/checklist/app/app/lot/[lotId]/check/[transition]/page.tsx — SQLite reads/writes
apps/checklist/app/self/check/[transition]/page.tsx — SQLite reads/writes
```

### Nao modificados (manter como esta)
```
packages/framing/*                         — Types e queries intactos
packages/export/*                          — PDF generation intacta
supabase/migrations/*                      — Schema DB intacto
```
