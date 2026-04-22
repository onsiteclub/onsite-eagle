# OnSite Ops

Dashboard web para operadores da construção civil canadense — recebe invoices de clientes autônomos por email, reconcilia contra pagamentos de General Contractors, paga cash descontando porcentagem, e envia fechamento ao contador.

Stack: **Next.js 16.1.6 · React 19 · TypeScript · Tailwind v4 · Supabase (PostgreSQL + RLS + Storage) · Postmark Inbound · Resend**.

Faz parte do monorepo CERBERO em [Onsite-club/onsite-eagle](../..). Plano de execução vivo: [DIRECTIVE.md](DIRECTIVE.md). Briefing original: [BRIEFING.md](BRIEFING.md).

---

## Rodando local

```bash
# Na raiz do monorepo
npm install
npm run dev:ops        # → http://localhost:3008
```

O servidor roda sempre na porta 3008 (monitor usa 3000, sheets 3003).

### Variáveis de ambiente

`.env.local` já vem preenchido com chaves do projeto Supabase `dbasazrdbtigrdntaehb` (compartilhado com monitor/field/inspect). Campos externos (Postmark/Resend) estão vazios e precisam ser preenchidos quando subir as contas.

Ver [`.env.example`](.env.example) para a lista completa.

### Desabilitando confirmação de email (dev)

Por padrão o Supabase exige confirmação por email antes do login. Como não temos SMTP configurado ainda (chega em Fase 7), desabilite em:

> Supabase Dashboard → Project `dbasazrdbtigrdntaehb` → Authentication → Settings → **"Enable email confirmations"** = off

Aí `/signup` cria user já confirmado e o flow de onboarding segue direto.

---

## Arquitetura

### Tabelas Supabase (prefixo `ops_`)

Ver migration [`supabase/migrations/023_onsite_ops.sql`](../../supabase/migrations/023_onsite_ops.sql) e CLAUDE.md DIRECTIVE 2026-04-21.

11 tabelas: `ops_operators`, `ops_companies`, `ops_clients`, `ops_client_company_access`, `ops_gcs`, `ops_invoices`, `ops_invoice_versions`, `ops_ledger_entries`, `ops_accountant_contacts`, `ops_export_logs`, `ops_inbox_blocklist`.

Storage bucket privado: `ops-invoices` com path `{operator_id}/{sha256}.pdf`.

### Rotas

| Path | Tipo | Acesso |
|---|---|---|
| `/login`, `/signup` | Client + Server Action | Público (redireciona se logado) |
| `/onboarding` | Server + Client wizard | Logado sem `ops_operators` |
| `/inbox` | Server + Client view | Logado com `ops_operators` |
| `/statement?clientId=X` | Server + Client view | Logado com `ops_operators` |
| `/clients` | Server | Logado com `ops_operators` |
| `/export?companyId=...` | Server (form GET) | Logado com `ops_operators` |
| `/auth/callback` | Route Handler | Público (PKCE exchange) |
| `/api/inbox?token=...` | Route Handler | Público (Postmark webhook, autenticado por token) |

Middleware em [`src/middleware.ts`](src/middleware.ts) controla redirecionamentos.

---

## Postmark Inbound — setup

### Dev (sem domínio real)

O webhook em `/api/inbox` aceita chamadas HTTP POST autenticadas por token via query-string.

```bash
# Simula um email recebido (payload Postmark válido)
node apps/ops/scripts/simulate-postmark.mjs paulo@onsiteclub.ca joao@gmail.com "Invoice $2840"
```

O script lê `POSTMARK_INBOUND_WEBHOOK_SECRET` do `.env.local` automaticamente e gera um PDF mínimo válido anexado. Use `paulo` (ou qualquer username que você tenha reservado no onboarding) no destinatário.

Para invoices reais, passe o caminho do PDF como quarto argumento.

### Produção

1. **DNS do domínio** (ou subdomínio dedicado):
   ```
   onsiteclub.ca.         MX   10  inbound.postmarkapp.com.
   ```
   Se `onsiteclub.ca` já tem MX (Gmail Workspace etc), use subdomínio `inbox.onsiteclub.ca`.

2. **Postmark Dashboard → Server (Inbound Stream)**:
   - Webhook URL: `https://ops.onsiteclub.ca/api/inbox?token=<POSTMARK_INBOUND_WEBHOOK_SECRET>`
   - Method: POST
   - Content-Type: JSON

3. **Preencher `.env.local`** (ou env vars da Vercel):
   ```
   POSTMARK_INBOUND_WEBHOOK_SECRET=<gere com openssl rand -hex 32>
   ```

4. **Testar**: mandar email real para `<seuusername>@onsiteclub.ca` com PDF anexado. Checar no dashboard Postmark que foi processado, e em `/inbox` que apareceu.

---

## Próximos passos

Ver [DIRECTIVE.md §8 Fase 7](DIRECTIVE.md) (Resend outbound + ZIP export) e [§11 Fase 8](DIRECTIVE.md) (deploy Vercel).

## Debugging

- **Signed URLs expirando cedo**: `PDF_URL_TTL_SECONDS` em [`src/lib/supabase/storage.ts`](src/lib/supabase/storage.ts) — default 1h.
- **Middleware redirecionando em loop**: `/auth/callback` e `/api/inbox` estão excluídos. Se modificar o matcher em [`src/middleware.ts`](src/middleware.ts), ajustar o mesmo padrão em [`src/lib/supabase/middleware.ts`](src/lib/supabase/middleware.ts).
- **Invoice chegando sem valor**: regex de extração de `$X,XXX.XX` está em [`src/app/api/inbox/route.ts`](src/app/api/inbox/route.ts) → `extractAmountFromSubject()`. Operador pode editar depois.
- **Dev server não sobe**: apagar `.next/dev/` se lock file presistir. Metro-style hot reload do Turbopack.
