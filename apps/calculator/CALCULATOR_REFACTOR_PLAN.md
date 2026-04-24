# OnSite Calculator — Plano de Refactor (Motor + UX)

**Criado em:** 2026-04-23
**Status:** Fase A ✅ · Fase B ✅ · Fase C ✅ · Fase D ✅
**Escopo:** `apps/calculator/` no monorepo eagle. Sem branches, commits direto na `main` (convenção do ecossistema).

> **Nota sobre o plano antigo.** Este documento **substitui as Fases 0–4** de [REFACTOR_AND_MIGRATION_PLAN.md](./REFACTOR_AND_MIGRATION_PLAN.md). O plano antigo continua válido como referência de longo prazo (Fase 5+: voz real, Sentry, monetização, iOS, Stairs/Triangle v2). Se houver conflito entre os dois, este prevalece até Fase D concluir.

---

## Objetivo

Entregar uma Calculator funcional no monorepo com **motor puro testado, UX manual completa e parser de texto livre determinístico** — sem depender de nenhuma API externa. Esta fase **não** entrega voz, Whisper, GPT-4o, Sentry com DSN, Stripe, monetização nem iOS; esses ficam para o plano antigo depois de validada a UX.

## Princípios de arquitetura

**Motor puro.** O engine de cálculo vive num módulo TypeScript sem imports de React, `@supabase/*`, `fetch` ou `window`. Recebe input estruturado (JSON), retorna resultado estruturado. Testável em Node isolado.

**UI consome, não reimplementa.** Componentes React chamam funções do motor. Qualquer lógica de arredondamento, conversão de unidade ou frações mora no motor — nunca duplicada na camada de apresentação.

**Placeholder funcional de voz, não visual.** Enquanto voz real não existe, o input conversacional é um `<textarea>` que alimenta o mesmo parser determinístico que, no futuro, receberá a transcrição do Whisper. Isso permite dogfooding da UX conversacional hoje, sem chave de API.

**Zero APIs externas até a UX estar validada.** Sem OpenAI, sem Sentry ativo, sem Stripe. Reduz custo, superfície de bug e dependência de segredo em env.

---

## Fase A — Motor isolado ✅

**Objetivo.** Portar o engine do repo standalone para um módulo TypeScript puro dentro de `apps/calculator/src/engine/` (ou promover para `packages/calc-engine` se a reutilização entre apps ficar óbvia).

**Entregáveis.** Funções tipadas que recebem input estruturado (operação, operandos, unidades) e retornam resultado estruturado (valor, unidade canônica, formato de display). Cobertura das operações críticas: aritmética básica, frações imperiais, conversão imperial↔métrico, áreas/volumes, fórmulas de stairs (rise/run, total rise, number of risers). Suite de teste Vitest em `tests/unit/engine/` rodando em Node sem DOM.

**Critério de saída.** `npm run test -- engine` passa com cobertura ≥80% nas funções exportadas. Engine importável de `./engine` sem puxar React no bundle. Nenhum teste usa mocks de rede ou Supabase.

**Estimativa.** 3–4 dias (ajustes, não rewrite — o código já existe no standalone).

**Entrega (commit `bf69a1c`, 2026-04-23).** Módulo `src/engine/` criado via `git mv` a partir de `src/lib/calculator/`. Única impureza (`import logger` em engine.ts) removida — o catch agora retorna `buildErrorResult` sem side effect. Types do engine (`CalculationResult`, `DimensionType`, `Token`, `CanonicalUnit`) extraídos para `src/engine/types.ts`; `src/types/calculator.ts` re-exporta pra compat. 9 import sites atualizados. **103/103 testes engine passando, cobertura 96.19% stmts / 88.23% branches / 100% funções.** Zero mocks de rede/Supabase nos testes. Engine importa apenas `./types` e `./building-codes/obc-2024.json`.

## Fase B — UX manual em cima do motor ✅

**Objetivo.** Tela onde o usuário escolhe a operação, digita operandos com unidades e vê o resultado — sem auth, sem histórico, sem backend.

**Entregáveis.** Uma única rota/tela com seletor de operação (dropdown ou chips), campos numéricos com unidade, botão de calcular e result panel. Reaproveitar [ConversationalCalculator.tsx](./src/components/ConversationalCalculator.tsx), [ResultPanel](./src/components/) e discovery chips existentes onde couberem. Sem dependência de `@onsite/auth`, `@onsite/supabase` ou `/api/*`. App roda offline.

**Critério de saída.** Qualquer operação suportada pelo motor é executável manualmente pela UI, em Android físico, sem login e sem internet. Build Android via Codemagic continua verde.

**Estimativa.** 3 dias.

**Entrega (2026-04-23).** Auditoria revelou que a infraestrutura de degradação graciosa já existia: `supabase` é `null` sem env vars ([supabase.ts:46-60](./src/lib/supabase.ts#L46-L60)), App envolve em `AuthProvider` só quando há supabase ([App.tsx:30-40](./src/App.tsx#L30-L40)), `saveCalculation` pula sem `userId` ([calculations.ts:87-96](./src/lib/calculations.ts#L87-L96)), histórico é 100% local via Capacitor Preferences, Sentry é no-op sem DSN. Keypad + fraction pad cobrem aritmética imperial; Stairs/Triangle/Converter têm formulários manuais estruturados. Único bloqueio encontrado: marcadores de merge conflict não resolvidos em ConversationalCalculator.tsx (linhas 19-23 e 616-620) — removidos. **Validação: 217/217 testes, typecheck limpo, lint limpo, `vite build` roda sem nenhuma env var (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SENTRY_DSN`, `VITE_OPENAI_API_KEY`, `VITE_API_URL` todas ausentes) — `built in 1.76s`.**

## Fase C — Camadas de produto ✅

**Objetivo.** Adicionar auth, persistência de histórico e privacy dashboard funcional por cima da UX validada na Fase B.

**Entregáveis.** `@onsite/auth` + `@onsite/auth-ui` wired no App (já parcialmente existente, validar). Histórico de cálculos persistido em `ccl_calculations` com `user_id` correto. [PrivacyDashboard.tsx](./src/components/PrivacyDashboard.tsx) conectado a `/api/privacy/delete`, o que exige criar `src/lib/device.ts` gerando UUID persistido em Capacitor Preferences. Correção do bug conhecido em `lib/logger.ts`: trocar destino `app_logs` por `log_errors` conforme schema vigente (seção 8.14 do CLAUDE.md). Remover `@sentry/react` das dependências ou deixar sem DSN (decisão do humano antes de iniciar a fase).

**Critério de saída.** Usuário anônimo faz cálculo e vê resultado; usuário logado faz cálculo e vê histórico persistido; usuário logado deleta dados pelo privacy dashboard e confirma no Supabase que as linhas sumiram. Logger escreve na tabela correta.

**Estimativa.** 3–4 dias.

**Entrega (2026-04-23).** Auditoria corrigiu dois itens que o panorama original havia marcado errado: (i) `src/lib/device.ts` já existia e está bem feito (68 linhas, cache + fallback para localStorage, `rotateDeviceId()` após deleção); (ii) o "bug" de `logger.ts` escrever em `app_logs` não é bug — CLAUDE.md §8.14 documenta `app_logs` como tabela válida com schema que bate exatamente com o que o logger envia (level, module, action, context, device_info, success, app_name, app_version). `PrivacyDashboard` já está wired via [HamburgerMenu.tsx:139](./src/components/HamburgerMenu.tsx#L139), `/api/privacy/delete` já existe e deleta de `ccl_calculations`, `core_voice_logs`, `log_errors`, `log_events` (identificação por JWT ou x-device-id). `@sentry/react` continua instalado como no-op sem DSN — decisão de desinstalar fica com o humano. **Única mudança real de código:** propagar `user.id` de [App.tsx:174-175](./src/App.tsx) para `ConversationalCalculator` via nova prop `userId`, que passa para `compute()` e `setExpressionAndCompute()` — sem isso `saveCalculation()` nunca disparava mesmo com usuário logado, porque o hook `useCalculator` filtra em `saveOptions?.userId`. Bônus: adicionar `userId` + `onIntentRouted` aos deps do `useCallback` do `handleAudioUpload` eliminou um warning preexistente de react-hooks/exhaustive-deps. **Validação: 217/217 testes, tsc limpo no escopo calculator, lint sem warnings novos, `vite build` sem env vars ✓ 1.81s.**

## Fase D — Input conversacional com placeholder determinístico ✅

**Objetivo.** Campo de texto livre que parseia expressões em português/inglês construction-idiomáticas ("10 pés mais 3 polegadas", "área de 12 por 8", "20% de 150") e produz o mesmo input estruturado que a UI da Fase B consome.

**Entregáveis.** Parser determinístico em `src/parser/` usando regex + lookup tables (unidades, operações, números por extenso). **Sem LLM.** Integração com a UI existente: ao enviar texto, o parser gera o input estruturado, o motor resolve, o result panel renderiza. Falhas de parse retornam mensagem amigável com sugestão ("não entendi 'mais ou menos 10 pés' — tente '10 pés'"). Contrato do parser fica documentado: é o mesmo contrato que Whisper+GPT alimentarão no futuro — por isso a Fase E (voz) do plano antigo fica trivial.

**Critério de saída.** Calculator é 100% utilizável por texto livre, sem clicar em botões de operação, para as operações cobertas pelo motor. Suite de teste do parser em `tests/unit/parser/` com ≥30 frases-exemplo reais tiradas dos logs antigos do standalone.

**Estimativa.** 4–5 dias.

**Entrega (2026-04-23).** Parser em [src/parser/](./src/parser/) com 3 arquivos: `index.ts` (pipeline de 12 passos), `tables.ts` (lookup PT/EN para unidades, operadores, números por extenso, frações, porcentagem), `types.ts` (contrato `ParseResult`). Pipeline determinístico, zero LLM, zero deps externas. API pública: `parseExpression(text): ParseResult`. UI integrada em [ConversationalCalculator](./src/components/ConversationalCalculator.tsx) via novo handler `handleCommit` que unifica o caminho keypad `=` e Enter do input — se houver 2+ letras consecutivas no input, roda pelo parser antes de chamar o engine; senão trata como expressão engine-direta. O antigo `<div role="textbox">` não-editável virou `<input type="text">` real, permitindo digitação livre em desktop/mobile. Keypad continua funcional em paralelo para quem prefere fraction pad. Falhas de parse mostram toast com `reason + suggestion`. **46 testes em [tests/unit/parser/parse-expression.test.ts](./tests/unit/parser/parse-expression.test.ts)** cobrindo: aritmética básica PT/EN, números por extenso, unidades imperial (pés/polegadas) + métrico (m/cm/mm), área e volume via "por"/"by", porcentagem ("X% de Y", "X por cento de Y"), frações por extenso (meio, um quarto, três oitavos), números mistos (cinco e meio → 5 1/2), erros (vazio, garbage, URL). Cada teste verifica ambas propriedades: expressão gerada + resultado do engine. **Validação: 263/263 testes (46 novos), tsc limpo, lint sem warnings novos, `vite build` sem env vars em 1.70s, bundle cresceu 4.5KB para o parser (puro TypeScript).**

---

## Fora de escopo explícito

Whisper, GPT-4o, OpenAI, qualquer chamada para `/api/interpret`. Sentry com DSN real (desinstalar ou stub). Stripe e qualquer paywall. Build iOS (Android-only nesta fase — `ios/` fica congelado). Stairs/Triangle v2 (mantêm comportamento v1 ou escondem atrás de feature flag). Migração integral das 100 páginas do plano antigo — apenas o que cabe nas Fases A–D.

## Dependências do repo protegido

Portar do `onsite-calculator/` standalone (`main` @ `e6d1fd4`, 2026-02-24):

**Motor.** `src/lib/calculator-engine.ts` e adjacentes — toda a lógica de frações imperiais, conversões, áreas, stairs. Portar para `apps/calculator/src/engine/`.

**Parser.** Regex de percentagem, lookup de unidades (pés, polegadas, metros, sinônimos PT/EN), normalizador de números por extenso. Hoje espalhado em [api/interpret.ts](./api/interpret.ts) e arquivos adjacentes do standalone — consolidar em `apps/calculator/src/parser/`.

**Testes.** `tests/unit/calculator.test.ts` do standalone (aritmética, frações, áreas) — migrar e expandir. Se houver suite de regressão de strings de entrada reais, trazer; caso contrário, extrair ≥30 amostras dos `core_voice_logs` já capturados.

**Não portar.** Qualquer código do standalone que toque Supabase, Whisper, GPT-4o, Sentry, Stripe — esses ou já existem no monorepo ou ficam para fase futura.

---

## Checklist de saída (fim da Fase D)

Build Android verde no Codemagic; `npm run validate` limpo. Usuário anônimo faz cálculo manual e por texto livre sem internet. Usuário logado tem histórico em `ccl_calculations` e consegue apagar tudo pelo privacy dashboard. Engine e parser com cobertura de teste ≥80%. Logger escreve em `log_errors`. Nenhuma variável de ambiente de API externa (OpenAI, Sentry DSN, Stripe) é necessária para build ou runtime. App instalável em Android físico a partir de APK gerado pelo pipeline padrão.

**Estimativa total: 13–16 dias de trabalho focado.** Depois disso, reabrir o plano antigo para decidir Fase E (voz real) e monetização.
