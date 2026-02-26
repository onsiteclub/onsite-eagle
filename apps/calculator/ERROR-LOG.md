# OnSite Calculator - Error Log

Registro de erros encontrados durante o desenvolvimento, build e publicacao.
Cada erro inclui categoria, causa raiz, o que foi exigido e como foi corrigido.

## Sumario

| # | Erro | Categoria | Severidade | Linha |
|---|------|-----------|------------|-------|
| 001 | iPad Multitasking Orientations | App Store / iOS | Blocker | L19 |
| 002 | MODIFY_AUDIO_SETTINGS Removido | Android / Manifest | Blocker | L59 |
| 003 | Porcentagem Voz → /100 | API / Whisper / GPT | High | L97 |
| 004 | Consent Modal Bloqueio Permanente | UX / Consent | High | L130 |
| 005 | onError Nao Resetava Estado | UX / Estado | Medium | L160 |
| 006 | console.log Invisivel WebView | Debug / Android | Low | L187 |
| 007 | Delete/Export Re-adicionados Sem Autorizacao | Processo / Regressao | Blocker | L211 |

---

## #001 - iPad Multitasking Orientations

| Campo | Detalhe |
|-------|---------|
| **Data** | 2026-02-21 |
| **Categoria** | App Store / iOS / Info.plist |
| **Severidade** | Blocker (impede upload TestFlight) |
| **Versao** | v1.0.9 (build 25) |
| **Pipeline** | Codemagic build #15 |
| **Commit fix** | `1b29714` |

**Erro:**
```
UPLOAD FAILED - Validation failed (code 409)
Invalid bundle. The "UIInterfaceOrientationPortrait" orientations were provided
for the UISupportedInterfaceOrientations Info.plist key, but you need to include
all of the "UIInterfaceOrientationPortrait, UIInterfaceOrientationPortraitUpsideDown,
UIInterfaceOrientationLandscapeLeft, UIInterfaceOrientationLandscapeRight"
orientations to support iPad multitasking.
```

**O que a Apple exige:**
- A chave `UISupportedInterfaceOrientations~ipad` deve conter todas as 4 orientacoes para suportar iPad multitasking (Split View, Slide Over).
- Isso e obrigatorio para qualquer app que suporte iPad, mesmo que o app seja otimizado para portrait.

**O que estava errado:**
- `UISupportedInterfaceOrientations~ipad` no `ios/App/App/Info.plist` so tinha `UIInterfaceOrientationPortrait`.

**Como foi corrigido:**
- Adicionadas as 4 orientacoes na chave `~ipad`:
  - `UIInterfaceOrientationPortrait`
  - `UIInterfaceOrientationPortraitUpsideDown`
  - `UIInterfaceOrientationLandscapeLeft`
  - `UIInterfaceOrientationLandscapeRight`
- A chave `UISupportedInterfaceOrientations` (iPhone) permanece so com Portrait.

**Arquivo:** `ios/App/App/Info.plist`

---

## #002 - Android MODIFY_AUDIO_SETTINGS Removido Indevidamente

| Campo | Detalhe |
|-------|---------|
| **Data** | 2026-02-20 |
| **Categoria** | Android / Manifest / Permissoes |
| **Severidade** | Blocker (voz parou de funcionar) |
| **Versao** | v1.0.9 (durante desenvolvimento) |
| **Commit fix** | `a783cc0` |

**Erro:**
```
Toast: "Microphone access denied. Check device settings."
getUserMedia() falha silenciosamente no Android WebView.
```

**Contexto:**
- Auditoria de seguranca identificou `MODIFY_AUDIO_SETTINGS` como permissao potencialmente desnecessaria.
- Foi removida como fix de auditoria (BLOCKER F03).

**O que o Android exige:**
- Android WebView precisa de `MODIFY_AUDIO_SETTINGS` para que `navigator.mediaDevices.getUserMedia()` funcione.
- Sem essa permissao, o WebView nega acesso ao microfone mesmo com `RECORD_AUDIO` concedido.
- Isso e especifico do Capacitor/WebView — apps nativos nao precisam.

**O que estava errado:**
- Permissao `MODIFY_AUDIO_SETTINGS` foi removida do `AndroidManifest.xml`.

**Como foi corrigido:**
- Permissao restaurada no `AndroidManifest.xml`:
  ```xml
  <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
  ```

**Arquivo:** `android/app/src/main/AndroidManifest.xml`

---

## #003 - Porcentagem por Voz Convertida para /100

| Campo | Detalhe |
|-------|---------|
| **Data** | 2026-02-20 |
| **Categoria** | API / Whisper / GPT / Calculo |
| **Severidade** | High (resultado incorreto) |
| **Versao** | v1.0.9 (durante desenvolvimento) |
| **Commit fix** | `a783cc0` |

**Erro:**
- Usuario fala: "100 menos 10 por cento"
- Whisper transcreve: "100 menos 10 por cento"
- GPT converte para: `100 - 10 / 100` (errado)
- Resultado: `99.9` em vez de `90`

**O que era esperado:**
- GPT deveria converter para: `100 - 10%`
- Resultado correto: `90`

**Causa raiz:**
- GPT-4o interpreta "por cento" / "percent" como divisao por 100 em vez de usar o operador `%`.
- O SYSTEM_PROMPT nao tinha instrucoes especificas sobre porcentagem.

**Como foi corrigido (3 camadas):**
1. **SYSTEM_PROMPT** (`api/interpret.ts`): Adicionada secao PERCENTAGE com instrucoes explicitas para usar `%` e nunca `/100`.
2. **Sanitizacao client-side** (`src/hooks/useCalculator.ts`): Regex `(\d+)\s*\/\s*100\b` → `$1%`
3. **Sanitizacao server-side** (`api/interpret.ts`): Mesma regex como fallback.

**Arquivos:** `api/interpret.ts`, `src/hooks/useCalculator.ts`

---

## #004 - Consent Modal Bloqueava Voz Permanentemente

| Campo | Detalhe |
|-------|---------|
| **Data** | 2026-02-20 |
| **Categoria** | UX / Consent / Estado |
| **Severidade** | High (funcionalidade inacessivel) |
| **Versao** | v1.0.9 (durante desenvolvimento) |
| **Commit fix** | `a783cc0` |

**Erro:**
- Usuario clica "Not Now" no consent modal de microfone.
- Botao de voz nunca mais funciona — mostra toast de erro em vez de re-exibir o modal.

**Causa raiz:**
- Quando `hasVoiceConsent === false`, o codigo mostrava um toast de erro e retornava, sem opcao de reverter a decisao.

**Como foi corrigido:**
- Mudado para re-exibir o consent modal quando o usuario clica no botao de voz apos ter recusado:
  ```typescript
  if (hasVoiceConsent === false) {
    setShowConsentModal(true);
    return;
  }
  ```

**Arquivo:** `src/components/Calculator.tsx`

---

## #005 - onError Nao Resetava Estado do Botao de Voz

| Campo | Detalhe |
|-------|---------|
| **Data** | 2026-02-20 |
| **Categoria** | UX / Estado / Voice Recorder |
| **Severidade** | Medium (botao trava em estado errado) |
| **Versao** | v1.0.9 (durante desenvolvimento) |
| **Commit fix** | `a783cc0` |

**Erro:**
- Quando `getUserMedia()` falha, o botao de voz ficava travado em "Tap to Stop".
- Nenhum toast aparecia informando o erro.

**Causa raiz:**
- Callback `onError` em `Calculator.tsx` nao chamava `setVoiceState('idle')`.
- Nao diferenciava entre erro de permissao negada e outros erros.

**Como foi corrigido:**
- Adicionado `setVoiceState('idle')` no callback `onError`.
- Adicionada logica para diferenciar erros de permissao (isDenied) de erros genericos.
- Toast com mensagem adequada para cada caso.

**Arquivo:** `src/components/Calculator.tsx`

---

## #006 - console.log Nao Aparece no Android WebView

| Campo | Detalhe |
|-------|---------|
| **Data** | 2026-02-20 |
| **Categoria** | Debug / Android / WebView |
| **Severidade** | Low (afeta apenas debug) |
| **Versao** | N/A |

**Problema:**
- `console.log()` dentro do WebView do Capacitor nao aparece no logcat padrao do Android Studio.
- Dificultou debugging do botao de voz que aparentava nao funcionar.

**Solucao de contorno:**
- Usar `alert()` para debug rapido no dispositivo.
- Usar filtro correto no logcat: `adb logcat -s Capacitor:* chromium:*`
- Ou usar Chrome DevTools remote debugging: `chrome://inspect`

**Licao aprendida:**
- Em apps Capacitor, preferir `chrome://inspect` para debug real.
- O comando `npm run android:logs` ja esta configurado com o filtro correto.

---

## #007 - Delete Account / Export My Data Re-adicionados Sem Autorizacao

| Campo | Detalhe |
|-------|---------|
| **Data** | 2026-02-21 |
| **Categoria** | Processo / Regressao / Menu |
| **Severidade** | Blocker (causou resubmissao na Play Store) |
| **Versao** | v1.0 (versionCode 10 → 11) |
| **Commit fix** | `0197080` |

**Erro:**
- Usuario pediu para remover "Delete Account" e "Export My Data" do HamburgerMenu (nao existe sistema de contas).
- Items foram removidos com sucesso.
- Posteriormente, durante execucao automatica do fix F14 (auditoria GDPR), os items foram RE-ADICIONADOS sem consultar o usuario.
- O AAB com versionCode 10 foi gerado e submetido a Play Store COM os items indevidos.
- Usuario so descobriu apos 2h de processo de submissao de teste.

**Causa raiz:**
- Relatorio de auditoria recomendava "Delete Account" para compliance GDPR.
- A IA seguiu o relatorio cegamente sem questionar se fazia sentido no contexto (app sem contas).
- Violacao: reverter decisao explicita do usuario sem autorizacao.

**Impacto:**
- Retrabalho de ~2h de submissao no Google Play Console.
- Necessidade de novo AAB com versionCode incrementado (11).

**Como foi corrigido:**
- Removidos `handleDeleteAccount`, `handleExportData` e respectivos botoes do JSX.
- versionCode incrementado para 11.
- Novo AAB gerado: `onsite-calculator-v1.0.aab`

**Licao:**
- NUNCA re-adicionar codigo que o usuario pediu para remover, independente do que um relatorio automatizado diga.
- Sempre consultar o usuario antes de reverter uma decisao explicita dele.

**Arquivo:** `src/components/HamburgerMenu.tsx`

---

## Categorias

| Categoria | Descricao |
|-----------|-----------|
| **App Store / iOS** | Erros de validacao da Apple para upload TestFlight / App Store |
| **Android / Manifest** | Permissoes e configuracoes do AndroidManifest.xml |
| **API / Whisper / GPT** | Erros na cadeia de transcricao e interpretacao de voz |
| **UX / Consent** | Problemas com fluxo de consentimento e estado do usuario |
| **UX / Estado** | Bugs de estado da interface (botoes travados, etc.) |
| **Debug** | Problemas relacionados a depuracao e ferramentas de dev |
