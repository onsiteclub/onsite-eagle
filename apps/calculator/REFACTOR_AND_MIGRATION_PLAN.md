# OnSite Calculator — Plano de Migração, Refatoração e Publicação

**Criado em:** 2026-04-21
**Autor do plano:** Claude Code (baseado em auditoria read-only dos dois codebases)
**Status:** DRAFT — aguardando comando explícito do humano para executar cada fase
**Escopo:** este documento vive em `onsite-eagle/apps/calculator/`. Todo o trabalho descrito aqui acontece **dentro do monorepo eagle**, não no repo standalone `onsite-calculator/`.

---

## Regra zero — sem branches

Conforme instrução explícita: **NÃO criar branches `refactor/v2` ou sub-branches por fase no monorepo.** Trabalho acontece direto na branch ativa do monorepo (`main` ou equivalente). Cada fase termina com commit(s) diretos, sem PR separado.

Se a fase envolver publicação em loja, commits vão pra `main` normalmente — Codemagic dispara pipeline no push e manda pra TestFlight/Play Internal. É assim que o ecossistema eagle já funciona.

---

## Contexto — por que este documento existe

### 1. Dois calculators em paralelo

Havia (até 2026-04-21) **dois codebases** representando o mesmo app `ca.onsiteclub.calculator`:

| Codebase | Caminho | Estado |
|---|---|---|
| **Standalone (legacy)** | `c:\Dev\Onsite-club\onsite-calculator\` | Publicado iOS (build 26) + Android (versionCode 14). `main` @ commit `e6d1fd4` (2026-02-24). |
| **Monorepo (ativo p/ desenvolvimento)** | `c:\Dev\Onsite-club\onsite-eagle\apps\calculator\` | Mais avançado: tem `AuthProvider`, `AuthGate`, freemium. Último commit 2026-02-26. Ainda não publicado nas lojas. |

**Decisão:** toda refatoração v2 acontece **aqui** (monorepo). Standalone vira referência histórica/rollback — congelado em tag `v1.0.9-final-standalone`.

### 2. Por que refatorar aqui e não no standalone

- Monorepo já tem login implementado (próximo passo planejado no roadmap).
- Monorepo aponta pro **Supabase correto** (`dbasazrdbtigrdntaehb`, o DB do ecossistema) com prefixos de tabela certos (`ccl_*`, `core_voice_logs`).
- Monorepo usa packages compartilhados (`@onsite/auth`, `@onsite/logger`, `@onsite/tokens`, `@onsite/utils`) — fix de engine vale pra calculator E pros outros apps que consomem a lib.
- Publicar duas vezes o mesmo app é desperdício.

### 3. Arquitetura de banco confirmada

```
bjkhofdrzpczgnwxoauk                 dbasazrdbtigrdntaehb
(admin/dashboard OnSite Club)        (ecossistema eagle — 90 tabelas)

Login/auth quando implementado       ├─ egl_*  (obras/monitor)
                                     ├─ tmk_*  (timekeeper)
                                     ├─ ccl_*  (calculator) ← AQUI
                                     ├─ core_* (profiles, devices, voice_logs)
                                     ├─ log_*  (erros, eventos cross-app)
                                     ├─ bil_*  (billing/stripe)
                                     └─ ...
```

Tabelas calculator-relevantes:
- `ccl_calculations` — cálculos feitos (FK `user_id → core_profiles.id`, `template_id → ccl_templates.id`, `voice_log_id → core_voice_logs.id`)
- `ccl_templates` — templates de cálculo por trade
- `core_voice_logs` — dataset de voz cross-app (fundacional p/ Prumo ML)
- `log_errors`, `log_events` — telemetria cross-app

Referência autoritativa do schema: `onsite-eagle/SCHEMA_REGISTRY.md`.

---

## Mecânica de aprovação nas lojas

### Como Apple e Google identificam "o mesmo app"

Nenhuma das lojas lê código-fonte. Identidade do app = **bundle ID + chave de assinatura**:

| Loja | Identificador | Chave |
|---|---|---|
| Apple | `CFBundleIdentifier` = `ca.onsiteclub.calculator` | Apple Distribution Certificate + provisioning profile (conta Apple Developer) |
| Google | `applicationId` = `ca.onsiteclub.calculator` | **Upload key** (sua keystore) + **App signing key** (gerenciada pelo Google — "Play App Signing" está ATIVO, confirmado 2026-04-21) |

Se publicarmos do monorepo com os três batendo:
- Mesmo bundle ID
- `versionCode` Android > 14 (atual: 14 no standalone, 1 no monorepo — **precisa pular pra >=15**)
- Build number iOS > 26
- Mesma chave de assinatura

→ Lojas veem como **update normal**, não app novo. Review: 1-2 dias iOS, horas no Android.

### Quando a review demora mais

Apple pode demorar mais (3-7 dias) se:
- Permissões novas aparecerem (ex.: localização, câmera)
- UX mudar drasticamente (novo fluxo de login → eles revalidam)
- Privacy policy não casar com permissões declaradas

Não é rejeição — só review mais cauteloso. **Planejar publicação de v2.0 com buffer de 1 semana.**

### Bundle JS muda — e tudo bem

O bundle compilado vai ser diferente entre standalone e monorepo:
- Monorepo usa Tailwind + packages compartilhados (~+35 kB gzip)
- Auth UI adiciona ~+20 kB gzip
- Hashes de arquivo mudam

Loja não compara bundle — só comportamento final.

---

## Estado atual do monorepo — blockers de publicação

Auditoria realizada em 2026-04-21. Estes pontos **impedem publicação imediata**:

| # | Blocker | Severidade | Arquivo |
|---|---|---|---|
| B1 | **iOS não existe** — pasta `ios/App/App/Info.plist` ausente | 🔴 bloqueador | `apps/calculator/ios/` (precisa `npx cap add ios` + setup completo) |
| B2 | **Permissões Android incompletas** — só `INTERNET` declarada; voz precisa `RECORD_AUDIO` + `MODIFY_AUDIO_SETTINGS` | 🔴 bloqueador | `apps/calculator/android/app/src/main/AndroidManifest.xml` |
| B3 | **`NSMicrophoneUsageDescription` iOS ausente** | 🔴 bloqueador (consequência de B1) | — |
| B4 | **`versionCode = 1`** — Play Store rejeita qualquer valor ≤ 14 (último publicado) | 🔴 bloqueador | `apps/calculator/android/app/build.gradle:10` |
| B5 | **Upload keystore ausente** no monorepo | 🔴 bloqueador | Precisa copiar de `onsite-calculator/android/app/onsite-calculator-release.keystore` OU rotacionar via Play Console |
| B6 | **`@onsite/logger` package** — referenciado em imports, confirmar que existe e build funciona | 🟡 verificar | `onsite-eagle/packages/logger/` |
| B7 | **Testes (vitest)** — confirmar se rodam dentro do monorepo e se a suite existente foi copiada | 🟡 verificar | `apps/calculator/tests/` |
| B8 | **Codemagic signing group** `onsite_calculator_keystore` precisa existir no dashboard Codemagic — herdado ou recriar | 🟡 verificar | Codemagic settings |

Estes blockers são resolvidos na **Fase 0** abaixo.

---

## Bugs e problemas herdados do standalone

Lista consolidada da auditoria do standalone + revisão do `REFACTOR_V2_PLAN.md` original (cópia desse arquivo está em `onsite-calculator/REFACTOR_V2_PLAN.md` no repo legacy). Aplicáveis ao monorepo porque a maioria do código é idêntica:

### Bugs de domínio (confirmados por prints de usuário)

| ID | Sintoma | Causa-raiz | Localização |
|---|---|---|---|
| D1 | `25' 7 × 32' 3 → "9900' 9"` | Engine multiplica comprimentos como escalares; não sabe que `ft × ft = sqft` | `src/lib/calculator/engine.ts` evaluateTokens + formatInches |
| D2 | `25' 6 × 31' 6 → "9639' "` (aspa vazia) | `formatInches` quando `feet>0 && whole=0 && frac=0` omite zero mas mantém `"`. Guard: `if (adjustedWhole > 0 || (feet === 0 && !fracStr))` | `engine.ts:82-94` |
| D3 | `"www.intervoices.com"` apareceu como expressão | Whisper alucinou; sem guarda-corpo pós-transcrição nem schema validation | `api/interpret.ts` |

### Bugs silenciosos (auditoria)

| ID | Problema | Evidência |
|---|---|---|
| S1 | `saveVoiceLog` nunca recebe `user_id` → `voice_logs` nunca populada | `api/interpret.ts:416-426` chama sem user_id; `api/lib/voice-logs.ts:94` rejeita sem |
| S2 | Tabela `app_calculator_calculations` referenciada no código, mas não existe — monorepo usa `ccl_calculations` | `src/lib/calculations.ts:116` precisa ser atualizado |
| S3 | `syncConsentToServer` só dispara com user logado; sem auth = consents nunca sincroniza | `src/lib/consent.ts:54` |
| S4 | Sanitização regex duplicada (client + server) | `api/interpret.ts:388-401` + `src/hooks/useCalculator.ts:148-154` |
| S5 | Timeout fetch (20s) < MediaRecorder auto-stop (30s) | `Calculator.tsx:115` vs `useVoiceRecorder.ts:7` |
| S6 | `detectLanguage` enviesa para `'en'` em input vazio → distorce analytics | `api/lib/voice-logs.ts:253` |
| S7 | `extractEntities` não captura `×` `÷` (unicode) | `api/lib/voice-logs.ts:147` |
| S8 | `checkRateLimit` fail-open em erro de Supabase → anti-DDoS silenciosamente desligado | `api/lib/rate-limit.ts:33,39` |
| S9 | `server-logger.ts` (110 linhas) é código morto — nunca importado | `src/lib/server-logger.ts` |

### Segurança

| ID | Problema | Ação |
|---|---|---|
| SEC1 | Keystore Android com senha em texto claro (`OnsiteClub2024`) em build.gradle | Fase 0.5 — ler de env var |
| SEC2 | `.env` standalone contém `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY` em disco local | Rotação planejada pelo humano fora deste escopo |
| SEC3 | 21 vulnerabilidades npm no standalone (11 high) — status no monorepo precisa auditoria própria | Fase 5 — `npm audit` no monorepo |

### Compliance / privacy

| ID | Problema | Ação |
|---|---|---|
| C1 | Privacy policy standalone menciona features que não existem + omite que áudio vai pra OpenAI US | Fase 5 — reescrever p/ realidade do monorepo |
| C2 | Usuário não consegue revogar consent nem deletar dados pelo app | Fase 5 — tela Privacy Dashboard + endpoint delete |

### Desempenho e infra

| ID | Problema | Ação |
|---|---|---|
| P1 | Rate limit via `COUNT(*) FROM app_logs` por IP não escala | Fase 5 — migrar pra Upstash Redis ou tabela `rate_limits` dedicada |
| P2 | `gpt-4o` usado; `gpt-4o-mini` é 17× mais barato | Fase 2 — A/B test; se pass rate ≥95%, migrar |
| P3 | Cobertura de teste baixa (standalone: 82% engine / 0% UI) | Fase 1-3 — testes por fase |

---

## Fases de trabalho

### Regras por fase
- Cada fase termina com: testes passando + build funcionando + commit(s) direto(s) na branch ativa do monorepo
- Cada fase pode disparar pipeline Codemagic → TestFlight internal + Play internal (validação real com binário)
- Cada fase incrementa `versionCode` Android e build number iOS
- Commits em português, imperativo, curtos. Exemplo: `fix: engine calcula área em ft × ft`
- **Pedir confirmação humana antes de deletar código**, mesmo código morto confirmado
- Nunca commitar `.env*`, chaves, keystores

---

### Fase 0 — Unblocking de publicação + paridade com standalone

**Tempo estimado:** 2-3 dias
**Meta:** monorepo calculator compila, roda, passa testes, e **pode ser publicado** nas lojas substituindo o standalone sem regressão para usuários.

#### 0.1. Restaurar iOS (B1)

```bash
cd apps/calculator
npx cap add ios
```

Em seguida configurar:
- `ios/App/App/Info.plist` com `NSMicrophoneUsageDescription` (copiar texto do standalone)
- `ios/App/App.xcodeproj/project.pbxproj`:
  - `MARKETING_VERSION = 1.0`
  - `CURRENT_PROJECT_VERSION = 27` (próximo após 26)
  - `PRODUCT_BUNDLE_IDENTIFIER = ca.onsiteclub.calculator`
- Copiar ícones/splashscreens de `onsite-calculator/ios/App/App/Assets.xcassets/`

#### 0.2. Corrigir permissões Android (B2)

Editar `apps/calculator/android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

> ⚠️ `MODIFY_AUDIO_SETTINGS` é obrigatório pra `getUserMedia()` funcionar no WebView Capacitor Android. NÃO remover.

#### 0.3. Bumpar `versionCode` (B4)

`apps/calculator/android/app/build.gradle:10`:
```gradle
versionCode 15   // era 1; pula pra cima do último publicado do standalone (14)
versionName "1.0"
```

#### 0.4. Copiar keystore (B5)

```bash
cp onsite-calculator/android/app/onsite-calculator-release.keystore \
   onsite-eagle/apps/calculator/android/app/
```

Esse keystore **nunca vai pro git** (já há `*.keystore` no `.gitignore`). Apenas local + credenciais no Codemagic (já configurado via `android_signing: onsite_calculator_keystore`).

**Segurança imediata (pré-publicação):** refatorar `build.gradle` para ler senha de env var:

```gradle
signingConfigs {
    release {
        storeFile file('onsite-calculator-release.keystore')
        storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD') ?: ''
        keyAlias 'onsite-calculator'
        keyPassword System.getenv('ANDROID_KEY_PASSWORD') ?: ''
    }
}
```

Vars configuradas no Codemagic `android_signing` group. Para dev local, humano exporta no shell.

#### 0.5. Verificar packages `@onsite/*` (B6)

```bash
cd onsite-eagle
ls packages/logger packages/auth packages/tokens packages/utils
npm run build --filter=@onsite/calculator
```

Se algum faltar ou falhar: **parar e reportar ao humano** antes de continuar. Pode exigir trabalho nos packages compartilhados.

#### 0.6. Rodar suite de testes (B7)

```bash
cd onsite-eagle/apps/calculator
npm run test       # vitest run
```

Esperado: 131+ testes passando (herdados do standalone).

Se tests/ estiver ausente ou quebrado, copiar do standalone:
```bash
cp -r onsite-calculator/tests onsite-eagle/apps/calculator/
```

Ajustar imports pra usar `@onsite/logger` onde aplicável.

#### 0.7. Reconciliar diferenças com standalone

Comparar arquivos-chave e identificar o que o standalone tem que o monorepo não:

```bash
for f in src/App.tsx src/components/Calculator.tsx src/hooks/useCalculator.ts \
         src/lib/calculator/engine.ts src/lib/calculations.ts api/interpret.ts; do
  echo "## $f"
  diff onsite-calculator/$f onsite-eagle/apps/calculator/$f
done > /tmp/diff-report.txt
```

**Observações já identificadas pela auditoria:**
- `engine.ts`: byte-a-byte idêntico ✅ — nada a reconciliar
- Monorepo importa `logger` de `@onsite/logger` em vez de `../lib/logger` — intencional, manter
- Monorepo tem `AuthGate.tsx`, `AuthProvider` — standalone não; manter do monorepo
- `supabase.ts` diverge bastante (732 bytes a mais no monorepo) — verificar que mudou

Para cada item do standalone ausente no monorepo: decidir se é regressão ou se foi removido intencionalmente.

#### 0.8. Corrigir bug crítico S1 (`saveVoiceLog`)

Já planejado no plano original. Implementação no monorepo:

1. Schema `core_voice_logs` em `dbasazrdbtigrdntaehb` precisa ter coluna `device_id TEXT` OU aceitar `user_id` sem FK (o monorepo já tem `core_profiles` — se usuário estiver logado, passa profile.id; se não, device_id UUID).

2. Em `api/interpret.ts`: quando header `x-device-id` presente OU JWT presente:
   ```ts
   const userId = verifiedJWT?.sub;          // se logado
   const deviceId = req.headers['x-device-id']; // sempre presente depois do cliente gerar
   ```

3. `saveVoiceLog` aceita ambos (preferindo user_id quando disponível):
   ```ts
   if (!record.user_id && !record.device_id) return null; // mantém guard
   ```

4. Cliente gera device_id uma vez e persiste:
   ```ts
   // apps/calculator/src/lib/device.ts
   import { Preferences } from '@capacitor/preferences';
   export async function getOrCreateDeviceId() {
     const { value } = await Preferences.get({ key: 'device_id' });
     if (value) return value;
     const id = crypto.randomUUID();
     await Preferences.set({ key: 'device_id', value: id });
     return id;
   }
   ```

5. Envia em todas as requests:
   ```ts
   fetch(API_ENDPOINT, {
     headers: { 'x-device-id': await getOrCreateDeviceId() },
     ...
   });
   ```

**Validação:** gravar 1 áudio com consent=true → query `SELECT count(*) FROM core_voice_logs WHERE device_id = '...'` retorna 1.

#### 0.9. Corrigir S2 (tabela `calculations`)

Trocar em `src/lib/calculations.ts:116`:
```ts
.from('app_calculator_calculations')   // ERRADO
```
Por:
```ts
.from('ccl_calculations')              // CERTO (schema registry)
```

Validar no schema registry que os campos batem:
- `user_id` UUID
- `calc_type` TEXT CHECK IN (...)
- `calc_subtype` TEXT
- `input_expression` TEXT
- `result_value` DECIMAL
- `result_unit` TEXT
- `result_formatted` TEXT
- `input_method` TEXT
- `voice_log_id` UUID (FK `core_voice_logs.id`)
- `template_id` UUID (FK `ccl_templates.id`)
- `trade_context` TEXT
- `was_successful` BOOLEAN
- `app_version` TEXT

Se houver divergência de colunas, consultar `SCHEMA_REGISTRY.md` + SQL migrations em `onsite-eagle/supabase/migrations/`.

#### 0.10. Limpar código morto (pedir confirmação humana)

Itens confirmados (já removidos no standalone ou nunca usados):
- `src/lib/server-logger.ts` (110 linhas, nunca importado)
- `src/hooks/useVoiceUsage.ts` (86 linhas, não consumido)
- `src/components/StairsCalculator.tsx` — mover pra `archive/StairsCalculator-v1.tsx.bak`, vai voltar na Fase 4

**NÃO deletar sem o humano confirmar.**

#### 0.11. Primeiro deploy de paridade — internal track

Após 0.1–0.10 verdes:

1. Commit único: `feat: migra publicação de calculator para monorepo — paridade com v1.0.9 standalone`
2. Push → Codemagic roda:
   - Build AAB + APK
   - Publica no Play Console **internal track** (submit_as_draft: true)
   - Build IPA + publica TestFlight **Internal Testers**
3. Humano testa ambos:
   - Instala sobre app anterior — **confirma que histórico local não sumiu**
   - Grava voz, calcula, confirma que resultado chega
   - Confirma que ícone, splash, permissions idênticos ao standalone

Se bater: **esta versão é a nova base**. Standalone fica congelado.

#### Critérios de aceitação da Fase 0

- [ ] `npm run build` funciona em `apps/calculator`
- [ ] `npm run test` passa (131+ testes)
- [ ] `npx cap sync ios && cap sync android` sem erros
- [ ] AAB + IPA gerados pelo Codemagic
- [ ] Publicação em Play Internal + TestFlight Internal bem-sucedida
- [ ] Humano validou em dispositivo físico (instala sobre v1.0, sem regressão)
- [ ] Standalone `onsite-calculator/` marcado com tag `v1.0.9-final-standalone`
- [ ] Tag nesta fase: `calculator-v1.1.0-monorepo-parity`

---

### Fase 1 — Engine dimensional

**Tempo estimado:** 1-2 semanas
**Meta:** consertar bugs D1, D2. Engine entende `comprimento × comprimento = área`.

#### 1.1. Novo tipo aditivo (não substitutivo)

Em `src/types/calculator.ts`, **adicionar** campos ao `CalculationResult` existente em vez de substituir. Mantém compatibilidade:

```ts
export type DimensionType = 'length' | 'area' | 'volume' | 'scalar' | 'count';
export type OperationKind = 'add' | 'subtract' | 'multiply' | 'divide' | 'area' | 'volume' | 'percentage';

export interface CalculationResult {
  // Novos
  valueCanonical: number;
  displayPrimary: string;
  displaySecondary: string;
  dimension: DimensionType;
  unit: ImperialUnit | MetricUnit;
  operation: OperationKind;
  explanation: string;

  // Legados — mantidos até Fase 3 migrar componentes
  resultFeetInches: string;
  resultTotalInches: string;
  resultDecimal: number;
  expression: string;
  isInchMode: boolean;
}
```

#### 1.2. Álgebra de Quantity

Substituir ifs aninhados por estrutura explícita em `src/lib/calculator/engine.ts`:

```ts
interface Quantity { value: number; dim: 0 | 1 | 2 | 3; } // scalar|length|area|volume

function multiply(a: Quantity, b: Quantity): Quantity {
  return { value: a.value * b.value, dim: (a.dim + b.dim) as 0|1|2|3 };
}

function add(a: Quantity, b: Quantity): Quantity {
  if (a.dim !== b.dim) throw new Error(`Cannot add dim${a.dim} + dim${b.dim}`);
  return { value: a.value + b.value, dim: a.dim };
}

function divide(a: Quantity, b: Quantity): Quantity {
  if (b.value === 0) throw new Error('Division by zero');
  return { value: a.value / b.value, dim: (a.dim - b.dim) as 0|1|2|3 };
}
```

`parseToInches` retorna `Quantity` com dim=1 se tiver `'` ou `"`, dim=0 caso contrário.

#### 1.3. Corrigir `formatInches` para bug D2

Regra nova: quando resultado tem feet e inches=0, **display primário** é `9639'` (canteiro omite o zero); **display secundário** (total inches) é `115668 In` — nada de aspa vazia.

Remover o `if (hasFraction || hasFeet) result += '"'` atual; reconstruir format:
- `X'` se só tem feet (inteiro) e nada mais
- `X' Y"` se tem feet + whole inches > 0
- `X' Y Z/16"` se tem feet + whole + fração
- `X"` / `X Y/16"` se só tem inches
- `0` se zero

#### 1.4. System prompt do GPT propaga dimensão

Atualizar `SYSTEM_PROMPT` em `api/interpret.ts` para retornar:

```json
{
  "expression": "25' 6 * 31' 6",
  "intent": "area_calculation",
  "expected_dimension": "area",
  "explanation_pt": "Área de 25'6\" por 31'6\""
}
```

Engine recebe `intent` como **hint**, não verdade — valida por dimensão algébrica.

#### 1.5. Testes obrigatórios

Em `tests/unit/engine-dimensional.test.ts` (novo):

```ts
test("25' 6 × 31' 6 = 803.25 sqft", () => {
  const r = calculate("25' 6 * 31' 6");
  expect(r.dimension).toBe('area');
  expect(r.unit).toBe('sqft');
  expect(r.valueCanonical).toBeCloseTo(803.25, 1);
});

test('formatInches(9639*12) = "9639\'"', () => {
  expect(formatInches(115668)).toBe("9639'");  // sem aspa vazia
});

test("10 × 10 sem unidade é escalar", () => {
  const r = calculate("10 * 10");
  expect(r.dimension).toBe('scalar');
  expect(r.valueCanonical).toBe(100);
});

test("5' + 3 sqft lança erro dimensional", () => {
  expect(() => calculate("5' + 10 sqft")).toThrow(/dim|incompatible/i);
});

test("área × altura = volume", () => {
  const r = calculate("10' * 10' * 8'");
  expect(r.dimension).toBe('volume');
});
```

#### 1.6. UI mínima de dimensão

Em `Calculator.tsx`, adicionar label pequeno acima do resultado: "Comprimento" / "Área" / "Volume" / "Escalar". Visual refinado na Fase 3.

#### Critérios Fase 1

- [ ] Prints 1 e 2 (D1, D2) reproduzidos em teste e passam
- [ ] ≥15 testes novos em `engine-dimensional.test.ts`
- [ ] Nenhum teste existente quebrou
- [ ] Deploy internal + validação humana
- [ ] Tag: `calculator-v1.2.0-phase-1`

---

### Fase 2 — Hardening de voz

**Tempo estimado:** 1 semana
**Meta:** eliminar alucinação (D3), validar output do GPT, A/B test gpt-4o-mini, decidir modelo definitivo.

#### 2.1. Suite de regressão de áudios — ANTES de mexer em código de voz

30 amostras em `tests/voice-regression/`:
- 5 PT puros, 5 EN puros, 5 portunhol, 5 espanhol
- 4 frações por extenso
- 3 operações compostas
- 2 dimensões ("2 por 4")
- 1 ruído de fundo
- 1 francês (Quebec, mercado)

Cada amostra: `.webm` + `expected.json` com `{expression, intent, dimension}`.

Runner `tests/voice-regression/run.ts` roda via API real, compara contra gabarito, reporta pass rate.

Rodar **antes** de qualquer mudança no pipeline de voz — é o baseline.

#### 2.2. Validação anti-alucinação pós-Whisper

Em `api/interpret.ts`, após receber transcrição:

```ts
function looksLikeHallucination(t: string): boolean {
  const s = t.toLowerCase().trim();
  if (s.length < 2) return true;
  if (/^[\s.,]*$/.test(s)) return true;
  if (/https?:\/\/|www\.|\.com|\.ca|\.org|\.net/i.test(s)) return true;
  if (/@\w+\.\w+/.test(s)) return true;
  const knownHallucinations = [
    'thanks for watching', 'obrigado por assistir',
    'subscribe', 'like and subscribe', 'merci de regarder',
  ];
  return knownHallucinations.some(h => s.includes(h));
}

if (looksLikeHallucination(transcribedText)) {
  return res.status(200).json({
    error: 'unclear_audio',
    userMessage: 'Não entendi. Tente falar mais próximo do microfone.'
  });
}
```

#### 2.3. Schema validation com Valibot

Instalar Valibot (1.4 kB, 10× menor que Zod):
```bash
npm install valibot --workspace=@onsite/calculator
```

```ts
import * as v from 'valibot';

const UNITS = /(sqft|sqin|cuft|cuin|sqm|cum|mm|cm|yd|ft|in|m|x)/i;
const EXPR_CHARS = new RegExp(`^(\\d+(\\.\\d+)?|[\\s+\\-*/()%'"]|${UNITS.source})+$`);

const GPTResponseSchema = v.object({
  expression: v.pipe(v.string(), v.regex(EXPR_CHARS), v.maxLength(100)),
  intent: v.picklist(['calculation', 'area', 'volume', 'conversion',
                       'stairs', 'triangle', 'unclear']),
  explanation_pt: v.optional(v.pipe(v.string(), v.maxLength(200))),
  expected_dimension: v.optional(v.picklist(['length','area','volume','scalar'])),
});

const parsed = v.safeParse(GPTResponseSchema, JSON.parse(raw));
if (!parsed.success) return res.status(200).json({ error: 'parse_failed' });
```

Regex whitelist rejeita `www`, `thanks`, e qualquer texto solto — só passa números, operadores e unidades conhecidas.

#### 2.4. Melhorar prompt Whisper

Adicionar ao prompt em `api/interpret.ts`:

```
Context: Construction calculator. User speaks numbers, fractions (half,
quarter, eighth), feet, inches, yards, meters, and math operators
(plus/minus/times/divided by). Never transcribe URLs, emails,
website names, or social media calls-to-action. If audio is unclear,
output empty string.
```

#### 2.5. A/B test gpt-4o vs gpt-4o-mini

Script `tests/voice-regression/benchmark-models.ts`:

```ts
const models = ['gpt-4o', 'gpt-4o-mini-2024-07-18'];
for (const model of models) {
  let pass = 0, fail = 0;
  for (const sample of samples) {
    const result = await runPipeline(sample, { model });
    if (matches(result, sample.expected)) pass++;
    else fail++;
  }
  console.log(`${model}: ${pass}/${pass+fail} (${(pass/(pass+fail)*100).toFixed(1)}%)`);
}
```

Rodar 3x por modelo (seed diferente). Se mini ≥95% do pass rate de 4o:
- **Trocar pra mini** — economia 17×.
- Documentar decisão em `docs/decisions/001-gpt-model.md` (ADR).

**Custo estimado do A/B:** 30 amostras × 2 modelos × 3 runs = 180 chamadas ≈ US$ 3-5.

#### 2.6. Cache semântico (opcional, post-validation)

Tabela `ccl_voice_cache` (propor no schema registry):
```sql
CREATE TABLE ccl_voice_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_transcription TEXT UNIQUE NOT NULL,
  expression TEXT NOT NULL,
  intent TEXT NOT NULL,
  hit_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_hit_at TIMESTAMPTZ DEFAULT now()
);
```

Lookup em normalização agressiva (lowercase, números por extenso → dígito, remove pontuação). Se hit: retorna em <50ms, skip OpenAI.

Meta: 20-40% hit rate após 1 mês de dados.

#### 2.7. Feedback visual na UI

3 estados em `Calculator.tsx`:
- "Ouvindo..." (MediaRecorder ativo)
- "Entendendo..." (upload + Whisper)
- "Calculando..." (GPT + engine)

Animação refinada na Fase 3.

#### Critérios Fase 2

- [ ] Baseline de 30 áudios rodando e salvo
- [ ] A/B test executado, decisão documentada em ADR
- [ ] Teste "www" → app responde "Não entendi", não calcula zero
- [ ] Cache hit 2ª vez < 200ms (se implementado)
- [ ] Deploy internal + validação
- [ ] Tag: `calculator-v1.3.0-phase-2`

---

### Fase 3 — UI conversacional

**Tempo estimado:** 2-3 semanas
**Meta:** tela que mostra "transcrição → interpretação → resultado" em cards; histórico rico; design system unificado.

#### 3.1. Design tokens via `@onsite/tokens`

Usar package já existente do monorepo. Refatorar CSS pra usar CSS variables derivadas dos tokens.

Meta de redução do CSS: 2808 linhas (standalone) → ~800.

#### 3.2. Componente `ConversationalCalculator`

Novo arquivo `src/components/ConversationalCalculator.tsx` substitui o `Calculator.tsx` atual como container principal. Layout em "chat":

```
┌────────────────────────────────────────┐
│ HISTÓRICO (scroll, últimos 10)         │
│ ┌────────────────────────────────────┐ │
│ │ Você disse: "25 e meio por 31..."  │ │
│ │ Entendi: 25' 6" × 31' 6"          │ │
│ │ Resultado: Área: 803.25 sq ft     │ │
│ │ [copiar] [editar] [refazer]       │ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ ... entrada anterior ...           │ │
│ └────────────────────────────────────┘ │
├────────────────────────────────────────┤
│ [teclado dinâmico]                     │
│ [ 🎤 Segure pra falar ]                │
└────────────────────────────────────────┘
```

#### 3.3. Transcrição em tempo real (voz nativa)

Dependência nova: avaliar `@capacitor-community/speech-recognition` (cuidado com bugs conhecidos iOS 17 — validar em branch isolada antes).

Enquanto usuário segura botão:
- SFSpeechRecognizer (iOS) / SpeechRecognizer (Android) transcreve em tempo real
- Texto aparece no card **enquanto** ele fala
- Usuário vê erro de transcrição antes de soltar → cancela sem gastar chamada OpenAI

Quando solta: texto final enviado pro GPT (pipeline atual).

Whisper vira **fallback** (se API nativa falhar ou idioma não suportado).

**Custo zero, latência zero, feedback imediato.**

#### 3.4. Histórico persistente expandido

`useCalculatorHistory` hoje armazena 5. Expandir pra 100 com campos:
- Transcrição original
- Expressão interpretada
- Operação (área/volume/etc.)
- Resultado display
- Timestamp
- Tipo (voz ou manual)

UI: swipe delete, long-press copiar, tap re-executar.

#### 3.5. Editor inline

Botão "editar" em cada card. Abre expressão no input, usuário ajusta manualmente, recalcula sem passar pelo GPT (expressão já estruturada).

#### 3.6. Export

Botão "exportar" no menu: copia últimos N cálculos como CSV/texto para clipboard. Arquiteto/estimador adora.

#### Critérios Fase 3

- [ ] CSS reduzido para <1000 linhas
- [ ] Transcrição em tempo real funciona (iOS + Android)
- [ ] Cards mostram os 3 passos
- [ ] Editor inline re-executa sem chamar GPT
- [ ] Export funcional
- [ ] Snapshot tests da UI
- [ ] Tag: `calculator-v2.0.0-phase-3` (bump major — UX mudou)

---

### Fase 4 — Modos unificados + Stairs + Triangle expandido

**Tempo estimado:** 1-2 semanas
**Meta:** voz funciona em qualquer modo; escada volta com OBC compliance; conversão some como aba dedicada (vira intent de voz).

#### 4.1. Intent routing

GPT classifica intent antes de parsear:

```json
{
  "intent": "calculation|area|volume|conversion|stairs|triangle|unclear",
  "parameters": { ... específico do intent ... }
}
```

Exemplos:
- "quinze metros em pés" → `intent: conversion, parameters: {from:15, fromUnit:'m', toUnit:'ft'}`
- "triângulo catetos três e quatro" → `intent: triangle, parameters: {legA:3, legB:4}`
- "escada 9 pés com espelho de 7" → `intent: stairs, parameters: {totalRise:108, riserHeight:7}`

#### 4.2. Modos em vez de abas

Teclado inferior muda baseado no modo ativo (voz override sempre disponível):
- **Cálculo** (default): numérico + frações + `'/"`
- **Escada**: Rise/Run/Degraus
- **Esquadro**: catetos
- **Conversão**: só voz + fallback manual "de X para Y"

Falar "escada de 9 pés" no modo Cálculo → muda automaticamente pro modo Escada.

#### 4.3. Stairs com OBC compliance

Criar `src/lib/calculator/stairs.ts` (código novo; refatorar/adaptar `StairsCalculator.tsx` arquivado na Fase 0.10).

Input: rise total + altura espelho (ou nº degraus) + profundidade piso
Output:
- Rise unit (altura cada espelho)
- Número de degraus
- Stringer length (trigonométrico)
- **Compliance check** contra OBC 2024 (Ontario Building Code):
  - Rise: 125mm mín, 200mm máx (residencial)
  - Run: 255mm mín
  - Nosing: 25mm máx
  - Headroom: 1950mm mín

Regras em `src/lib/calculator/building-codes/obc-2024.json` — versionado, fácil atualizar.

UI mostra:
```
✅ Rise: 190mm (OK, entre 125-200mm)
✅ Run: 280mm (OK, mín 255mm)
⚠️ Headroom: 1900mm (abaixo do mínimo OBC 1950mm)
```

**Escopo MVP:** só Ontario. Outras províncias/países em release futura.

#### 4.4. Triangle expandido

Hoje só Pitágoras. Adicionar:
- Ângulo de corte (miter) dado dois lados
- Verificar 90° (3-4-5, 6-8-10, 9-12-15)
- Conversão graus/decimal/fração para "5-12 pitch" (telhado)

#### Critérios Fase 4

- [ ] Voz funciona em todas as operações
- [ ] Mudança de modo por voz é instantânea
- [ ] Escada calcula e valida OBC
- [ ] Triangle expandido com pitch
- [ ] Tag: `calculator-v2.1.0-phase-4`

---

### Fase 5 — Compliance, segurança, performance

**Tempo estimado:** 1 semana
**Meta:** PIPEDA/LGPD real, segurança reforçada, performance otimizada.

#### 5.1. Privacy policy alinhada ao código

Editar `docs/PRIVACY_POLICY.md` refletindo comportamento real:
- Coleta de áudio: opcional, com consent
- Transcrições armazenadas: com consent separado
- Device ID anônimo: sempre (justifica: rate limit + cache)
- Transferência internacional: áudio vai pra OpenAI (US) — **disclose**
- Retenção: 90d voice_logs, 30d app_logs
- Exclusão: email privacy@onsiteclub.ca, 30d pra deletar

#### 5.2. Privacy Dashboard in-app

Componente `PrivacyDashboard.tsx` acessível via menu:
- Ver consent atual (microfone, voice_training)
- Revogar consent (1 botão)
- Ver quantos dados coletados (count de `core_voice_logs` por device_id)
- "Apagar meus dados" → chama `/api/privacy/delete`

#### 5.3. Endpoint `/api/privacy/delete`

Aceita `x-device-id`. Deleta de `core_voice_logs`, `log_errors`, `log_events`, `ccl_calculations` onde matched. Retorna contagem de rows deletadas.

#### 5.4. Rate limit em camadas (P1)

Substituir `COUNT FROM app_logs` por Upstash Redis:

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

const perDevice = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(120, '1 m') });
const perIP     = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(300, '1 m') });
const global    = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10000, '1 m') });
```

Camadas:
- Per-device: 120/min (cobre uso intenso)
- Per-IP: 300/min (cobre canteiro com NAT)
- Global: 10.000/min (DDoS)

Upstash free tier: 10k cmd/dia — mais que suficiente.

**Fail-closed em produção** (se Redis indisponível, bloqueia temporariamente com 503 — nunca fail-open silencioso).

#### 5.5. Sentry para crash reporting

```bash
npm install @sentry/react @sentry/capacitor --workspace=@onsite/calculator
```

Free tier 5k events/mês. Sem PII no stack trace. Inicializar no `main.tsx`:

```ts
import * as Sentry from '@sentry/capacitor';
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Strip PII
    if (event.user) delete event.user.email;
    return event;
  }
});
```

#### 5.6. Upgrade majors (auditoria própria, não do standalone)

No monorepo:
```bash
npm audit --workspace=@onsite/calculator
```

Prioridade (se afetam calculator):
- Capacitor 6 → 7 ou 8 (cuidado com breaking nativos)
- Vite 5 → 6+ (se monorepo ainda está em 5)
- Vitest 2 → 3+

Uma dep por vez. Roda suite de voz + testes existentes após cada.

#### 5.7. Script `scripts/bump-version.ts`

```bash
npm run bump -- patch   # ou minor, major
```

Atualiza em sync:
- `apps/calculator/package.json` version
- `apps/calculator/android/app/build.gradle` (versionName + versionCode +1)
- `apps/calculator/ios/App/App.xcodeproj/project.pbxproj` (MARKETING_VERSION + CURRENT_PROJECT_VERSION +1)

Executar via `tsx scripts/bump-version.ts` — sem build step.

#### Critérios Fase 5

- [ ] Privacy policy reflete código real
- [ ] Usuário revoga consent + deleta dados pelo app
- [ ] Rate limit migrado para Redis (fail-closed)
- [ ] `npm audit` zero high
- [ ] Sentry capturando em produção
- [ ] Script bump funcional
- [ ] Tag: `calculator-v2.2.0-phase-5`

---

## Checklist de publicação (aplicável a cada tag)

Antes de cada `git push` que dispara publicação:

- [ ] `npm run build` e `npm run test` passam localmente
- [ ] `versionCode` Android incrementado (> última publicada — consultar Play Console)
- [ ] `CURRENT_PROJECT_VERSION` iOS incrementado (> última TestFlight)
- [ ] `versionName` / `MARKETING_VERSION` batem entre Android e iOS
- [ ] Nenhuma permissão nova adicionada sem justificativa em privacy policy
- [ ] `.env` / `.env.local` / `.env.production` **fora do commit**
- [ ] `*.keystore` fora do commit
- [ ] Tag anotada criada: `git tag -a calculator-v1.X.0-phase-N -m "..."`

Após push:
- [ ] Codemagic AAB/IPA builds verdes
- [ ] Play Internal track aceitou upload
- [ ] TestFlight Internal aceitou build
- [ ] Humano testou em dispositivo físico antes de promover pra Production

---

## Risk register

| Risk | Prob | Impacto | Mitigação |
|---|---|---|---|
| Monorepo iOS iniciar do zero atrasa Fase 0 | Média | Alta | Copiar `ios/` completo do standalone como ponto de partida |
| `@onsite/logger` não existe / quebrado | Baixa | Média | Fase 0.5 valida antes de continuar; se quebrado, consertar package primeiro |
| Play Store rejeita upload novo da keystore standalone | Muito baixa | Catastrófica | Play App Signing ativo (confirmado); keystore é upload key, rotação suportada |
| Apple review rejeita v2.0 por UX drasticamente diferente | Baixa | Alta (atraso) | Publicar incremental (v1.1, v1.2, ...) em vez de saltar pra v2.0 |
| A/B gpt-4o-mini tem pass rate <95% | Alta | Baixa | Se acontecer, ficar em gpt-4o; decisão reversível |
| Rate limit Redis free tier estoura | Baixa | Média | Monitorar uso primeiros 30 dias; fallback pra tabela `rate_limits` SQL |
| Migração de DB quebra histórico de usuário | Muito baixa | Média | Histórico é localStorage/Preferences, não DB — não afetado |

---

## Rollback plan

Se qualquer fase publicada causar regressão crítica em produção:

**Android:**
1. Play Console → Release → Promote última build boa de volta pra Production
2. Investigar, fixar no próximo push
3. Se fix demorar, comunicar em `release notes` da próxima versão

**iOS:**
1. App Store Connect → Version → Remove from sale (se grave)
2. Ou simplesmente não promover TestFlight → Production até fixar
3. Pra restaurar versão anterior: re-submit IPA da build anterior (mais complexo; preferir forward fix)

**Código:**
- Standalone `onsite-calculator/` fica como referência de último-estado-bom-conhecido
- Tag `v1.0.9-final-standalone` é o ponto de rollback absoluto
- `git revert <commit>` no monorepo para desfazer fase específica

---

## Decisões pendentes do humano

Questões que ficaram em aberto nas conversas anteriores — precisam resposta antes da fase correspondente:

1. **Play App Signing ativo** — ✅ confirmado 2026-04-21 (print do Console).

2. **Tabela `ccl_calculations` existe em prod** — presumido pelo SCHEMA_REGISTRY mas não queriado diretamente. **Antes da Fase 0.9**, humano deve:
   - (a) logar no Supabase dashboard do projeto `dbasazrdbtigrdntaehb`, Table Editor, confirmar `ccl_calculations` visível, OU
   - (b) rodar `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'ccl_%'` no SQL Editor e colar output.

3. **Rotação de chaves** — humano planeja fazer "depois" (fora deste escopo imediato). Lista do que rotacionar:
   - `SUPABASE_SERVICE_ROLE_KEY` do projeto `dbasazrdbtigrdntaehb`
   - `OPENAI_API_KEY`
   - `STRIPE_SECRET_KEY` (se integração for reativada)
   - `CHECKOUT_JWT_SECRET`
   - Keystore Android (após primeira publicação do monorepo, rotacionar upload key via Play Console)

4. **gpt-4o-mini A/B** — humano OK em queimar ~US$ 3-5 de crédito OpenAI? Responder antes da Fase 2.5.

5. **Adicionar FR (Quebec) nas 30 amostras de voz** — incluir 1 amostra francês? Responder antes da Fase 2.1.

6. **Sentry como package compartilhado (`@onsite/telemetry`)?** — vale investir em criar package ou `@sentry/capacitor` direto em cada app? Decidir antes da Fase 5.5.

7. **OBC vs outros building codes** — Fase 4.3 tem escopo Ontario. Expandir pra BC/Alberta/USA é feature futura ou entra agora?

8. **Publicar incremental (v1.1, v1.2 ...) ou saltar pra v2.0 após Fase 3?** — incremental é mais seguro (recomendado); salto é mais impactante em marketing.

---

## Operação — como executar este plano

Quando o humano pedir "executa Fase X" ou similar:

1. Agente lê **esta seção + a fase específica**
2. Se houver decisão pendente relacionada, perguntar ao humano **antes** de começar
3. Trabalhar direto na branch ativa (sem criar `refactor/v2-*`)
4. Antes de deletar código: confirmar com humano
5. Commits em português, imperativo, curtos
6. Ao final da fase: testes verdes + build ok + push → Codemagic publica internal → humano valida em dispositivo
7. Só então criar tag e avançar

**Ordem recomendada:** Fase 0 → 1 → 2 → 3 → 4 → 5 (linear, sem paralelismo entre fases).

**Cada fase ≈ uma sessão de trabalho** (alguns dias a 1-3 semanas dependendo do escopo).

---

## Referências

- `onsite-eagle/SCHEMA_REGISTRY.md` — tabelas do ecossistema
- `onsite-eagle/CLAUDE.md` — convenções do monorepo
- `onsite-eagle/apps/calculator/README.md` — specifics do app
- `onsite-calculator/docs/audits/estado-atual-2026-04-21.md` — auditoria completa do standalone (referência histórica)
- `onsite-calculator/REFACTOR_V2_PLAN.md` — plano original + revisão do agente (referência; obsoleto após este documento)

---

**Fim do plano. Aguardando comando do humano para iniciar Fase 0.**
