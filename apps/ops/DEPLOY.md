# OnSite Ops — Deploy Guide

Passo-a-passo pra subir o app em produção na Vercel, com Postmark Inbound (emails entrando) e Resend Outbound (envio ao contador).

Estado antes de começar: Fases 1–7 do [DIRECTIVE.md](DIRECTIVE.md) concluídas, migration `023_onsite_ops.sql` aplicada no Supabase, dev funcionando em `localhost:3008`.

---

## 1. Supabase — verificar schema

O projeto Supabase (`dbasazrdbtigrdntaehb`) é compartilhado com monitor/field/inspect. As tabelas `ops_*` já estão aplicadas lá.

Antes de deployar, rode o preflight local pra confirmar:

```bash
cd apps/ops
npm run preflight
```

Esperado: 11 tabelas ops_\* existem, bucket `ops-invoices` é privado, webhook responde 401 sem token.

### Configuração Auth

No [Supabase Dashboard → Auth → URL Configuration](https://supabase.com/dashboard/project/dbasazrdbtigrdntaehb/auth/url-configuration):

- **Site URL**: `https://ops.onsiteclub.ca`
- **Redirect URLs** (adicionar — não remover os existentes):
  - `https://ops.onsiteclub.ca/auth/callback`
  - `http://localhost:3008/auth/callback` (para dev)

Em Auth → Settings → Email Auth:
- Se quiser confirmação de email em prod: mantenha **"Enable email confirmations" = ON**. Aí precisa SMTP configurado (Resend Email SMTP ou deixar o default do Supabase).

---

## 2. Postmark Inbound — emails chegando

### 2.1 DNS do domínio

Adicionar no provedor DNS de `onsiteclub.ca`:

```
onsiteclub.ca.    MX   10   inbound.postmarkapp.com.
```

⚠️ **Conflito**: se `onsiteclub.ca` já tem MX apontando pra Gmail/Workspace, você **perde** os emails desses serviços. Opções:

**(A) Subdomínio dedicado** (recomendado):
```
inbox.onsiteclub.ca.    MX   10   inbound.postmarkapp.com.
```
Atualizar `INBOX_DOMAIN=inbox.onsiteclub.ca` em `.env.production`. Usernames ficam `paulo@inbox.onsiteclub.ca`.

**(B) Mover emails existentes** pra outro serviço antes de trocar o MX.

### 2.2 Conta Postmark

1. Criar servidor em [account.postmarkapp.com](https://account.postmarkapp.com/servers)
2. Criar **Inbound Stream** no servidor
3. Em `Inbound → Settings`:
   - **Webhook URL**: `https://ops.onsiteclub.ca/api/inbox?token=<POSTMARK_INBOUND_WEBHOOK_SECRET>`
   - **Include raw email content in JSON payload**: off (opcional — só aumenta tamanho do payload)

### 2.3 Gerar secret de produção

```bash
openssl rand -hex 32
# ou
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Guardar pra usar no Vercel env.

---

## 3. Resend Outbound — envio ao contador

### 3.1 Conta + domínio

1. Criar conta em [resend.com/domains](https://resend.com/domains)
2. Adicionar domínio `onsiteclub.ca`
3. Adicionar os DNS records que o Resend mostrar (SPF + DKIM + MX). ⚠️ O MX do Resend é só pra bounces/replies — se já tiver MX pro Postmark (seção 2.1 A/B) e Resend exigir MX também, use subdomínio `send.onsiteclub.ca` no Resend.
4. Esperar verificação (minutos a horas)

### 3.2 API Key

Em [resend.com/api-keys](https://resend.com/api-keys), criar key com escopo **"Sending access"** restrito ao domínio verificado.

---

## 4. Vercel — deploy

### 4.1 Import do projeto

Via [vercel.com/new](https://vercel.com/new):

1. Import git repo `onsite-eagle`
2. **Root Directory**: `apps/ops`
3. Framework preset: **Next.js** (auto-detectado)
4. Build command: (deixar default — Vercel usa `npm run build`)
5. Install command: (deixar default — usa npm workspace install)
6. Output directory: (deixar default)

### 4.2 Environment Variables

Adicionar em Project Settings → Environment Variables (aplicar a Production):

```
NEXT_PUBLIC_SUPABASE_URL          = https://dbasazrdbtigrdntaehb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY     = <mesmo valor do dev>
SUPABASE_SERVICE_ROLE_KEY         = <mesmo valor do dev — MANTER SECRET>
NEXT_PUBLIC_APP_URL               = https://ops.onsiteclub.ca
INBOX_DOMAIN                      = onsiteclub.ca  (ou inbox.onsiteclub.ca se usar subdomínio)
POSTMARK_INBOUND_WEBHOOK_SECRET   = <secret gerado no passo 2.3>
RESEND_API_KEY                    = <key do passo 3.2>
```

O `SERVICE_ROLE_KEY` é sensível — não marcar como "Preview"/"Development" se preocupado com exposição em PRs.

### 4.3 Custom Domain

Em Project Settings → Domains:
- Adicionar `ops.onsiteclub.ca`
- Vercel mostra o registro CNAME pra adicionar no DNS:
  ```
  ops.onsiteclub.ca.    CNAME   cname.vercel-dns.com.
  ```
- Aguardar propagação + SSL auto-provisionado

### 4.4 Primeiro deploy

Click "Deploy". Se falhar, checar build logs — provavelmente algum import quebrado ou env var faltando.

Após verde: visitar `https://ops.onsiteclub.ca/login` — deve renderizar a tela de login.

---

## 5. Validação end-to-end

### 5.1 Preflight em prod

Criar `.env.production` local com os valores de prod (para o script preflight rodar contra prod):

```bash
cd apps/ops
cp .env.local .env.production
# editar com valores de prod
npm run preflight:prod
```

Esperado: todas checagens passam.

### 5.2 Fluxo completo

- [ ] `/signup` → criar conta. Confirmar email se estiver ON.
- [ ] Após confirm, `/login` → session ativa → redirect `/onboarding`
- [ ] Onboarding passo 1: escolher username (validar "já em uso" com segundo cadastro)
- [ ] Onboarding passo 2: cadastrar empresa
- [ ] Onboarding passo 3: email do contador (ou pular)
- [ ] Redirect `/inbox` — vazio
- [ ] Mandar email real pra `{username}@onsiteclub.ca` de outra conta, com PDF anexado, subject `Invoice $100`
- [ ] Checar Postmark dashboard — email processado
- [ ] Checar `/inbox` — card "Novo remetente" aparece
- [ ] Clicar "Adicionar cliente" → cliente criado, ledger entry inicial
- [ ] `/clients` — cliente aparece com saldo -$100
- [ ] `/statement?clientId=...` — extrato com invoice em aberto
- [ ] Clicar checkbox → modal de reconciliação → digitar $100 → confirmar
- [ ] Modal cash abre → clicar "Paguei" → 3 ledger entries criadas → invoice `locked`
- [ ] `/export` → company + período + email do contador → "Enviar ZIP"
- [ ] Contador recebe email com link do ZIP
- [ ] Abrir ZIP — contém CSV + invoices/{number}.pdf
- [ ] RLS check: criar segunda conta, tentar acessar `/statement?clientId=<clienteDaPrimeira>` — deve mostrar "Cliente não encontrado"

### 5.3 Checklist Postmark/Resend

- [ ] Postmark Inbound Stream mostra delivery count > 0
- [ ] Postmark webhook logs mostram 200 OK (não 4xx/5xx)
- [ ] Resend dashboard mostra email enviado
- [ ] Spam check: email chegou na caixa de entrada do contador (não spam folder)

---

## 6. Pós-deploy

- Documentar no Linear/issue tracker os secrets gerados (sem commitar)
- Configurar alertas: Vercel "Deployment Failures" + Postmark "Delivery Failures"
- Backup: Supabase já faz backup diário automático. Para Storage, avaliar se precisa replicar pra R2/S3 (Sprint 2).

---

## 7. Rollback

Problema em produção?

- **Rollback código**: Vercel dashboard → Deployments → promover deployment anterior
- **Rollback migration**: não fazer — CERBERO proíbe ALTER destrutivo. Se precisar reverter schema, abrir nova migration `024_ops_rollback_XXX.sql` com as mudanças compensatórias
- **Desabilitar webhook temporariamente**: Postmark dashboard → pause Inbound Stream (ou remover webhook URL)

---

**Fim do guide de deploy.**
