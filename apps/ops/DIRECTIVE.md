# OnSite Ops — Diretiva de Continuação da Implementação

**Para:** Claude Code
**De:** Cris (owner)
**Data:** 21 de abril de 2026
**Versão:** 2.0 (substitui BRIEFING.md para fins de execução)
**Status atual:** Mockup navegável pronto, zero backend

---

## 1. Ponto de Partida

O projeto **apps/ops** já existe dentro do monorepo CERBERO e tem:

- Next.js 16 + React 19 + Tailwind v4 + TypeScript configurados
- 4 telas navegáveis (`/inbox`, `/statement`, `/clients`, `/export`) com state local
- Design system completo em `globals.css` (paleta preto/amarelo/verde/vermelho)
- 10 componentes React organizados em `shared/`, `inbox/`, `statement/`
- Mock data em `src/lib/mock-data.ts` (167 linhas)
- Tipos TS base em `src/types/index.ts` (parcialmente alinhados com briefing original)
- 3 modais funcionais: `AddClientModal`, `ReconcileModal`, `CashPayoutModal`
- Lógica de divergência de reconciliação já implementada em JavaScript local

O que **não existe**:

- Nenhuma integração com Supabase (nem client, nem migrations, nem tabelas)
- Nenhum endpoint API (`src/app/api/` não existe)
- Nenhum sistema de autenticação
- Nenhuma configuração de email (Postmark inbound, Resend outbound)
- Nenhum `.env`
- Nenhum middleware de auth
- Zero persistência — tudo em React state

**Esta diretiva é um plano de continuação**, não de reinício. Não refazer o que já está pronto.

---

## 2. Decisões Arquiteturais Consolidadas

Algumas decisões mudaram desde o briefing original. Seguir estas:

### 2.1 Prefixo de tabelas: `ops_`

Todas as tabelas do OnSite Ops usam prefixo `ops_` no schema `public`. Isso alinha com a DIRECTIVE 2026-02-01 do CERBERO (CLAUDE.md).

Mapeamento do briefing original → nomes reais:

| Briefing original | Nome correto |
|---|---|
| `operators` | `ops_operators` |
| `companies` | `ops_companies` |
| `clients` | `ops_clients` |
| `client_company_access` | `ops_client_company_access` |
| `gcs` | `ops_gcs` |
| `invoices` | `ops_invoices` |
| `invoice_versions` | `ops_invoice_versions` |
| `ledger_entries` | `ops_ledger_entries` |
| `accountant_contacts` | `ops_accountant_contacts` |
| `export_logs` | `ops_export_logs` |
| `inbox_blocklist` | `ops_inbox_blocklist` |

### 2.2 Banco de dados: GiantGate Supabase (o banco 2)

O OnSite Ops compartilha o mesmo Supabase do Timekeeper (GiantGate). Mas **nunca faz query cross-app**. A comunicação com Timekeeper é exclusivamente via email inbound. Se o OnSite Ops precisar de dado do Timekeeper, o Timekeeper manda por email — ponto.

### 2.3 Identidade de clientes: o email é o identificador

O OnSite Ops **não consulta** a tabela de usuários do Timekeeper nem de qualquer outro app. A tabela `ops_clients` é autônoma e indexada por `(operator_id, email)`. Quando um invoice chega por email, o sistema procura em `ops_clients` pelo email do remetente. Se existe, associa. Se não, cria card "novo remetente" pra Paulo decidir.

### 2.4 Comunicação Timekeeper ↔ Ops: exclusivamente email

- Timekeeper usa `MFMailComposeViewController` (iOS) ou `Intent.ACTION_SEND` (Android) para compor email com PDF anexado
- Email sai do Gmail/iCloud do próprio usuário, não de servidor OnSite
- OnSite Ops recebe em `{username}@onsiteclub.ca` via Postmark Inbound
- Nenhum código compartilhado, nenhuma API pública, nenhuma query cruzada

---

## 3. Ordem de Execução

Respeitar rigorosamente a ordem abaixo. Cada fase desbloqueia a próxima. Não pular.

### Fase 1 — Infraestrutura Base (dependências + Supabase)
### Fase 2 — Schema + RLS + Storage
### Fase 3 — Autenticação e Onboarding
### Fase 4 — Substituir mock data por queries reais (read-only)
### Fase 5 — Ações mutadoras (adicionar cliente, reconciliar, pagar)
### Fase 6 — Email Inbound (Postmark webhook)
### Fase 7 — Email Outbound (Resend) + Export ao contador
### Fase 8 — Deploy e validação

---

## 4. Fase 1 — Infraestrutura Base

### 4.1 Instalar dependências

Em `apps/ops/`:

```bash
pnpm add @supabase/ssr @supabase/supabase-js zustand
pnpm add -D supabase
```

Em `apps/ops/` para servidor:

```bash
pnpm add postmark resend jszip date-fns
```

### 4.2 Criar `.env.local` e `.env.example`

**`.env.example`** (commitar):

```env
# Supabase (GiantGate)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Postmark Inbound
POSTMARK_INBOUND_WEBHOOK_SECRET=

# Resend Outbound
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
INBOX_DOMAIN=onsiteclub.ca
```

**`.env.local`** (nunca commitar, já no `.gitignore`): preencher com valores reais do Supabase GiantGate.

### 4.3 Criar clients do Supabase

**`src/lib/supabase/client.ts`** (browser):

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**`src/lib/supabase/server.ts`** (server components / actions):

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context — ignorar
          }
        },
      },
    }
  )
}
```

**`src/lib/supabase/service.ts`** (service role, apenas para webhooks):

```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

### 4.4 Criar `middleware.ts` na raiz de `apps/ops/`

Protege todas as rotas do dashboard. Redireciona para `/login` se não autenticado. Exemplo canônico do Supabase SSR docs. Exceção: `/api/inbox` deve ser público (webhook).

---

## 5. Fase 2 — Schema + RLS + Storage

### 5.1 Migration

Criar `supabase/migrations/023_onsite_ops.sql` com o schema completo. Usar as definições do BRIEFING original (seção 3.1), **aplicando o prefixo `ops_`** em todas as tabelas.

Pontos críticos ao escrever a migration:

- Todas as FK respeitando o prefixo (ex: `references ops_operators(id)`)
- `gen_random_uuid()` como default de todos os IDs
- Timestamps em `timestamptz default now()`
- Unique constraints onde o briefing especifica: `(operator_id, email)` em `ops_clients`, `(client_id, company_id)` em `ops_client_company_access`, `(invoice_id, version_number)` em `ops_invoice_versions`
- Índices em todas as FK e em colunas de busca frequente

### 5.2 RLS Policies

Habilitar RLS em **todas** as tabelas `ops_*`. Padrão de policy:

```sql
alter table ops_invoices enable row level security;

create policy "ops_invoices_select_own"
  on ops_invoices for select
  using (
    operator_id in (
      select id from ops_operators where user_id = auth.uid()
    )
  );

create policy "ops_invoices_insert_own"
  on ops_invoices for insert
  with check (
    operator_id in (
      select id from ops_operators where user_id = auth.uid()
    )
  );

create policy "ops_invoices_update_unlocked"
  on ops_invoices for update
  using (
    operator_id in (
      select id from ops_operators where user_id = auth.uid()
    )
    and status != 'locked'
  );

-- Nenhuma policy de DELETE em ops_invoices nem em ops_ledger_entries.
-- Registros fiscais são imutáveis.
```

Replicar esse padrão em todas as tabelas `ops_*`.

**Exceção importante:** `ops_invoices` precisa de uma policy adicional para permitir `INSERT` via service role (webhook de email inbound). A service role bypassa RLS por padrão, então nenhuma policy extra é necessária — mas documentar no código que o endpoint `/api/inbox` usa service role propositalmente.

### 5.3 Storage

Criar bucket `ops_invoices` no Supabase Storage:

- **Privado** (não público)
- Policy de upload: apenas service role
- Policy de leitura: signed URLs com expiração de 1 hora
- Sem configuração de lifecycle automático (retenção manual por compliance CRA)

### 5.4 Gerar tipos TypeScript

Após aplicar a migration:

```bash
pnpm supabase gen types typescript --project-id <GIANTGATE_PROJECT_ID> > src/types/database.ts
```

**Reconciliar `src/types/index.ts` com `src/types/database.ts`.** Os tipos atuais do `index.ts` estão parcialmente desalinhados com o briefing (ex: `LedgerEntryType` tem 4 valores, deve ter 6: `invoice_received`, `gc_payment_received`, `advance_paid`, `cash_paid_full`, `operator_fee`, `adjustment`). Atualizar para refletir o schema real.

---

## 6. Fase 3 — Autenticação e Onboarding

### 6.1 Páginas de autenticação

Criar em `src/app/(auth)/`:

- `login/page.tsx` — magic link via email (primário) + email/password (fallback)
- `signup/page.tsx` — cadastro com email/senha
- `layout.tsx` — layout limpo, sem navegação

Usar design system existente (`globals.css`). Manter estética minimalista: caixa branca centralizada, border preto grosso, box-shadow hard.

### 6.2 Onboarding do operador

Primeira vez que um user autenticado acessa `/`, verificar se existe registro em `ops_operators` com `user_id = auth.uid()`. Se não existe, redirecionar para `/onboarding`.

**Fluxo de onboarding (3 passos):**

1. **Escolher inbox username:** input para escolher o username (validar unicidade em `ops_operators.inbox_username`). Preview: `{username}@onsiteclub.ca`. Botão "Reservar este email".

2. **Cadastrar primeira empresa:** form com legal_name, trade_name, hst_number, wsib_number (opcional), address, invoice_prefix (ex: "JK-A").

3. **Configurar contador (opcional):** email do contador. Pode pular.

Ao concluir, criar registros em `ops_operators`, `ops_companies` e opcionalmente `ops_accountant_contacts`, depois redirecionar para `/inbox`.

### 6.3 Middleware

Proteger rotas:

- `/api/inbox` → público (sem auth)
- `/(auth)/*` → apenas usuários **não** autenticados (redireciona para `/inbox` se logado)
- `/(dashboard)/*` → apenas usuários autenticados COM registro em `ops_operators`
- `/onboarding` → apenas usuários autenticados SEM registro em `ops_operators`

---

## 7. Fase 4 — Substituir Mock Data por Queries Reais (Read-Only)

Objetivo: fazer as 4 telas existentes puxarem dados reais do Supabase, sem ainda implementar ações mutadoras. Cada tela continua funcionando visualmente igual, mas com dados reais (que no início estarão vazios até a Fase 5/6).

### 7.1 Converter páginas para Server Components com queries

Atualmente as páginas importam de `@/lib/mock-data`. Substituir por queries ao Supabase.

**`/inbox/page.tsx`:**

```typescript
import { createClient } from '@/lib/supabase/server'

export default async function InboxPage() {
  const supabase = await createClient()

  // Buscar operador atual
  const { data: { user } } = await supabase.auth.getUser()
  const { data: operator } = await supabase
    .from('ops_operators')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  // Novos remetentes (status = 'new_sender')
  const { data: newSenders } = await supabase
    .from('ops_invoices')
    .select('*')
    .eq('operator_id', operator!.id)
    .eq('status', 'new_sender')
    .order('received_at', { ascending: false })

  // Invoices recentes (últimos 7 dias)
  const { data: recentInbox } = await supabase
    .from('ops_invoices')
    .select('*, client:ops_clients(display_name, email)')
    .eq('operator_id', operator!.id)
    .gte('received_at', sevenDaysAgo())
    .order('received_at', { ascending: false })
    .limit(50)

  return <InboxView newSenders={newSenders} recentInbox={recentInbox} />
}
```

Componentizar a view em `components/inbox/inbox-view.tsx`. Passar os dados como props. Componentes de apresentação (`NewSenderCard`, `InboxRow`) já existem — ajustar props apenas.

**`/statement/page.tsx`:**

Precisa de `?clientId=` na query string. Se não tiver, mostrar só a busca. Se tiver:

```typescript
const { data: client } = await supabase
  .from('ops_clients')
  .select('*')
  .eq('id', clientId)
  .single()

const { data: entries } = await supabase
  .from('ops_ledger_entries')
  .select('*, invoice:ops_invoices(*)')
  .eq('client_id', clientId)
  .order('entry_date', { ascending: false })

// Calcular saldo atual a partir da última entry
const currentBalance = entries[0]?.balance_after ?? 0
```

Separar `entries` em `open` e `closed` por status do invoice vinculado.

**`/clients/page.tsx`:**

```typescript
const { data: clients } = await supabase
  .from('ops_clients')
  .select(`
    *,
    open_balance:ops_ledger_entries(balance_after)
  `)
  .eq('operator_id', operator.id)
  .eq('status', 'active')
  .order('display_name')
```

**`/export/page.tsx`:**

Calcular preview dinamicamente baseado nos filtros selecionados (empresa + período). Usar `useState` para filtros, `useQuery` ou server action para preview.

### 7.2 Atualizar NavTabs com counts reais

`components/shared/nav-tabs.tsx` hoje tem badges hardcoded. Transformar em Server Component que faz COUNT:

```typescript
const { count: inboxCount } = await supabase
  .from('ops_invoices')
  .select('*', { count: 'exact', head: true })
  .eq('operator_id', operator.id)
  .in('status', ['pending', 'new_sender'])
```

### 7.3 Remover `mock-data.ts`

Após todas as telas puxarem dados reais, **deletar** `src/lib/mock-data.ts`. Não manter como fallback. Mock data em produção é dívida técnica que sempre vira bug.

---

## 8. Fase 5 — Ações Mutadoras (Server Actions)

Criar em `src/lib/actions/`:

### 8.1 `add-client.ts`

Server action chamada pelo `AddClientModal`:

```typescript
'use server'

export async function addClientAction(formData: {
  invoiceId: string
  name: string
  email: string
  feePercent: number
  companyIds: string[]
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: operator } = await supabase
    .from('ops_operators')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  // 1. Criar cliente
  const { data: client, error: clientError } = await supabase
    .from('ops_clients')
    .insert({
      operator_id: operator!.id,
      email: formData.email,
      display_name: formData.name,
      fee_percent_override: formData.feePercent,
      first_invoice_at: new Date().toISOString(),
      status: 'active'
    })
    .select()
    .single()

  if (clientError) throw clientError

  // 2. Autorizar empresas
  await supabase
    .from('ops_client_company_access')
    .insert(
      formData.companyIds.map(company_id => ({
        client_id: client.id,
        company_id
      }))
    )

  // 3. Atualizar invoice pendente
  const { data: invoice } = await supabase
    .from('ops_invoices')
    .update({
      client_id: client.id,
      status: 'approved',
      approved_at: new Date().toISOString()
    })
    .eq('id', formData.invoiceId)
    .select()
    .single()

  // 4. Criar primeira ledger entry (débito)
  await supabase
    .from('ops_ledger_entries')
    .insert({
      operator_id: operator!.id,
      client_id: client.id,
      entry_type: 'invoice_received',
      amount: -invoice!.amount_gross,
      balance_after: -invoice!.amount_gross,
      invoice_id: invoice!.id,
      description: `Invoice ${invoice!.invoice_number ?? invoice!.id.slice(0, 8)}`,
      entry_date: new Date().toISOString().split('T')[0]
    })

  revalidatePath('/inbox')
  revalidatePath('/clients')
}
```

### 8.2 `reject-sender.ts`

```typescript
'use server'

export async function rejectSenderAction(invoiceId: string, blockEmail: boolean) {
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('ops_invoices')
    .update({ status: 'rejected' })
    .eq('id', invoiceId)
    .select()
    .single()

  if (blockEmail) {
    await supabase
      .from('ops_inbox_blocklist')
      .insert({
        operator_id: invoice!.operator_id,
        blocked_email: invoice!.from_email,
        reason: 'Rejeitado no onboarding'
      })
  }

  revalidatePath('/inbox')
}
```

### 8.3 `reconcile-invoice.ts`

Marca invoice como `paid_by_gc`, salva `amount_received`, flagueia divergência se houver:

```typescript
'use server'

export async function reconcileInvoiceAction(
  invoiceId: string,
  amountReceived: number
) {
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('ops_invoices')
    .select('amount_gross')
    .eq('id', invoiceId)
    .single()

  const diff = amountReceived - invoice!.amount_gross
  const isDivergent = Math.abs(diff) > 0.5

  await supabase
    .from('ops_invoices')
    .update({
      amount_received: amountReceived,
      status: 'paid_by_gc',
      paid_by_gc_at: new Date().toISOString(),
      divergence_flagged: isDivergent,
      divergence_amount: isDivergent ? diff : null
    })
    .eq('id', invoiceId)

  revalidatePath(`/statement`)
}
```

### 8.4 `mark-paid-to-client.ts`

Esta é a action mais complexa. Ela cria múltiplas ledger entries de uma vez e trava a invoice:

```typescript
'use server'

export async function markPaidToClientAction(invoiceId: string) {
  const supabase = await createClient()

  // 1. Buscar invoice + operador + cliente
  const { data: invoice } = await supabase
    .from('ops_invoices')
    .select('*, client:ops_clients(*)')
    .eq('id', invoiceId)
    .single()

  if (invoice!.status !== 'paid_by_gc') {
    throw new Error('Invoice não está em status paid_by_gc')
  }

  // 2. Calcular fee (override ou default)
  const { data: operator } = await supabase
    .from('ops_operators')
    .select('default_fee_percent')
    .eq('id', invoice!.operator_id)
    .single()

  const feePercent = invoice!.client.fee_percent_override
    ?? operator!.default_fee_percent
  const feeAmount = invoice!.amount_received! * (feePercent / 100)

  // 3. Buscar adiantamentos pendentes do cliente
  const { data: pendingAdvances } = await supabase
    .from('ops_ledger_entries')
    .select('id, amount')
    .eq('client_id', invoice!.client_id)
    .eq('entry_type', 'advance_paid')
    .is('settled_by_invoice_id', null)

  const totalAdvances = pendingAdvances!.reduce((sum, a) => sum + a.amount, 0)
  const cashToClient = invoice!.amount_received! - feeAmount - totalAdvances

  // 4. Buscar saldo atual do cliente
  const { data: lastEntry } = await supabase
    .from('ops_ledger_entries')
    .select('balance_after')
    .eq('client_id', invoice!.client_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let runningBalance = lastEntry?.balance_after ?? 0

  // 5. Criar 3 ledger entries em sequência
  const entries = [
    {
      entry_type: 'gc_payment_received',
      amount: invoice!.amount_received,
      description: 'GC pagou invoice'
    },
    {
      entry_type: 'operator_fee',
      amount: -feeAmount,
      description: `Porcentagem do operador (${feePercent}%)`
    },
    {
      entry_type: 'cash_paid_full',
      amount: -(invoice!.amount_received! - feeAmount),
      description: 'Cash entregue ao cliente'
    }
  ]

  for (const entry of entries) {
    runningBalance += entry.amount
    await supabase.from('ops_ledger_entries').insert({
      operator_id: invoice!.operator_id,
      client_id: invoice!.client_id,
      invoice_id: invoiceId,
      ...entry,
      balance_after: runningBalance,
      entry_date: new Date().toISOString().split('T')[0]
    })
  }

  // 6. Marcar adiantamentos como liquidados
  if (pendingAdvances!.length > 0) {
    await supabase
      .from('ops_ledger_entries')
      .update({ settled_by_invoice_id: invoiceId })
      .in('id', pendingAdvances!.map(a => a.id))
  }

  // 7. Travar invoice
  await supabase
    .from('ops_invoices')
    .update({
      status: 'locked',
      paid_to_client_at: new Date().toISOString(),
      locked_at: new Date().toISOString()
    })
    .eq('id', invoiceId)

  revalidatePath('/statement')
}
```

**Nota:** o campo `settled_by_invoice_id` em `ops_ledger_entries` precisa ser adicionado ao schema. Adicionar na migration (Fase 2) antes de chegar aqui.

### 8.5 Conectar actions aos componentes

Atualizar `AddClientModal`, `ReconcileModal`, `CashPayoutModal`, e card "Novo remetente" para chamar as actions. Usar `useTransition` para loading states.

---

## 9. Fase 6 — Email Inbound (Postmark)

### 9.1 Criar endpoint `/api/inbox/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createHash } from 'crypto'

export async function POST(request: NextRequest) {
  // 1. Validar assinatura Postmark
  const signature = request.headers.get('x-postmark-signature')
  const rawBody = await request.text()

  if (!validatePostmarkSignature(signature, rawBody)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const email = JSON.parse(rawBody)
  const supabase = createServiceClient()

  // 2. Identificar operador pelo destinatário
  const [username] = email.To.split('@')
  const { data: operator } = await supabase
    .from('ops_operators')
    .select('id')
    .eq('inbox_username', username)
    .single()

  if (!operator) {
    // Destinatário não existe — descartar silenciosamente
    return Response.json({ ok: true, status: 'no_operator' })
  }

  // 3. Verificar blocklist
  const { data: blocked } = await supabase
    .from('ops_inbox_blocklist')
    .select('id')
    .eq('operator_id', operator.id)
    .eq('blocked_email', email.From)
    .maybeSingle()

  if (blocked) {
    return Response.json({ ok: true, status: 'blocked' })
  }

  // 4. Extrair PDF anexo
  const pdfAttachment = email.Attachments?.find(
    (a: any) => a.ContentType === 'application/pdf'
  )

  if (!pdfAttachment) {
    // TODO: registrar como email sem PDF para Paulo revisar
    return Response.json({ ok: true, status: 'no_pdf' })
  }

  // 5. Upload PDF para Storage com hash como nome
  const pdfBuffer = Buffer.from(pdfAttachment.Content, 'base64')
  const pdfHash = createHash('sha256').update(pdfBuffer).digest('hex')
  const pdfPath = `${operator.id}/${pdfHash}.pdf`

  const { error: uploadError } = await supabase.storage
    .from('ops_invoices')
    .upload(pdfPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false
    })

  // upsert:false + erro de duplicata = PDF idêntico já existe; ignorar
  if (uploadError && !uploadError.message.includes('already exists')) {
    return new Response('Storage error', { status: 500 })
  }

  // 6. Verificar se cliente existe
  const { data: client } = await supabase
    .from('ops_clients')
    .select('id')
    .eq('operator_id', operator.id)
    .eq('email', email.From)
    .maybeSingle()

  // 7. Tentar extrair valor do assunto
  const amountMatch = email.Subject.match(/\$\s?([\d,.]+)/)
  const amount = amountMatch
    ? parseFloat(amountMatch[1].replace(/[,.]/g, match =>
        match === ',' ? '' : '.'
      ))
    : 0

  // 8. Criar invoice
  await supabase
    .from('ops_invoices')
    .insert({
      operator_id: operator.id,
      client_id: client?.id ?? null,
      pdf_url: pdfPath,
      pdf_hash: pdfHash,
      amount_gross: amount,
      from_email: email.From,
      from_name: email.FromName,
      subject: email.Subject,
      received_at: email.Date,
      raw_email_id: email.MessageID,
      status: client ? 'pending' : 'new_sender'
    })

  return Response.json({ ok: true })
}

function validatePostmarkSignature(signature: string | null, body: string): boolean {
  if (!signature) return false
  const secret = process.env.POSTMARK_INBOUND_WEBHOOK_SECRET!
  const expected = createHash('sha256')
    .update(secret + body)
    .digest('base64')
  return signature === expected
}
```

### 9.2 Função auxiliar: gerar signed URL para o PDF

`src/lib/supabase/storage.ts`:

```typescript
export async function getInvoicePdfUrl(pdfPath: string): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from('ops_invoices')
    .createSignedUrl(pdfPath, 60 * 60) // 1 hora

  return data!.signedUrl
}
```

Usar nas views sempre que precisar mostrar link de PDF.

### 9.3 Configurar Postmark

1. Criar conta Postmark (ou usar existente)
2. Criar servidor **Inbound** no dashboard
3. Configurar webhook URL: `https://ops.onsiteclub.ca/api/inbox` (produção) ou ngrok local para testes
4. Configurar DNS do domínio `onsiteclub.ca`:
   ```
   onsiteclub.ca. MX 10 inbound.postmarkapp.com.
   ```
5. Copiar o webhook secret para `.env.local` (variável `POSTMARK_INBOUND_WEBHOOK_SECRET`)
6. Testar enviando email para qualquer `*@onsiteclub.ca`

### 9.4 Teste end-to-end

1. Criar operador `paulo` via onboarding → email `paulo@onsiteclub.ca` reservado
2. De uma conta Gmail pessoal, mandar email para `paulo@onsiteclub.ca` com PDF anexado e assunto `Invoice teste $100`
3. Verificar nos logs do Vercel que o webhook foi chamado
4. Abrir `/inbox` como Paulo → card "Novo remetente" deve aparecer
5. Clicar "Adicionar cliente" → fluxo completo de adição
6. Mandar segundo email da mesma conta → deve entrar direto como "pending" sem card de novo remetente

---

## 10. Fase 7 — Email Outbound (Resend) + Export

### 10.1 Configurar Resend

1. Criar conta Resend
2. Verificar domínio `onsiteclub.ca` (adicionar DNS records SPF/DKIM que Resend fornece)
3. Criar API key com scope de envio
4. Adicionar `RESEND_API_KEY` ao `.env.local`

### 10.2 Criar função de envio de export

`src/lib/email/send-export.ts`:

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendExportEmail(params: {
  to: string
  company: string
  periodStart: string
  periodEnd: string
  downloadUrl: string
  totals: { invoiceCount: number; totalAmount: number; hstAmount: number }
}) {
  await resend.emails.send({
    from: 'ops@onsiteclub.ca',
    to: params.to,
    subject: `Fechamento ${params.periodStart} a ${params.periodEnd} — ${params.company}`,
    html: renderExportEmail(params)
  })
}
```

Criar template HTML simples, estilo corporativo discreto. Link grande e claro para download. Cópia de texto explicando o conteúdo do ZIP.

### 10.3 Endpoint de geração de ZIP

`src/app/api/export/route.ts`:

```typescript
import JSZip from 'jszip'

export async function POST(request: NextRequest) {
  const { companyId, periodStart, periodEnd, accountantEmail } = await request.json()

  const supabase = await createClient()

  // Buscar invoices do período
  const { data: invoices } = await supabase
    .from('ops_invoices')
    .select('*, client:ops_clients(*), gc:ops_gcs(*)')
    .eq('company_id', companyId)
    .gte('received_at', periodStart)
    .lte('received_at', periodEnd)
    .in('status', ['paid_by_gc', 'paid_to_client', 'locked'])

  // Gerar CSV
  const csv = generateCSV(invoices)

  // Gerar relatório PDF resumido (usar @react-pdf/renderer ou lib similar)
  const summaryPdf = await generateSummaryPDF(invoices)

  // Baixar todos os PDFs do Storage
  const pdfBlobs = await Promise.all(
    invoices.map(async inv => {
      const { data } = await supabase.storage
        .from('ops_invoices')
        .download(inv.pdf_url)
      return { name: inv.invoice_number || inv.id.slice(0, 8), blob: data }
    })
  )

  // Montar ZIP
  const zip = new JSZip()
  zip.file('fechamento.csv', csv)
  zip.file('resumo.pdf', summaryPdf)

  const invoicesFolder = zip.folder('invoices')
  pdfBlobs.forEach(({ name, blob }) => {
    invoicesFolder!.file(`${name}.pdf`, blob!)
  })

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

  // Upload do ZIP para Storage
  const zipPath = `exports/${operatorId}/${Date.now()}.zip`
  await supabase.storage.from('ops_invoices').upload(zipPath, zipBuffer)

  // Gerar signed URL (30 dias)
  const { data: { signedUrl } } = await supabase.storage
    .from('ops_invoices')
    .createSignedUrl(zipPath, 60 * 60 * 24 * 30)

  // Enviar email
  await sendExportEmail({
    to: accountantEmail,
    company: companyName,
    periodStart,
    periodEnd,
    downloadUrl: signedUrl,
    totals: { invoiceCount: invoices!.length, totalAmount: sum, hstAmount: hstSum }
  })

  // Registrar log
  await supabase.from('ops_export_logs').insert({
    operator_id: operatorId,
    company_id: companyId,
    period_start: periodStart,
    period_end: periodEnd,
    accountant_email: accountantEmail,
    zip_url: zipPath,
    invoice_count: invoices!.length,
    total_amount: sum
  })

  return Response.json({ ok: true })
}
```

### 10.4 Conectar ao frontend `/export/page.tsx`

Substituir os botões hardcoded por ação real que chama o endpoint. Mostrar loading state durante a geração do ZIP (pode levar 10-30 segundos com muitos invoices). Mostrar toast de sucesso quando concluir.

---

## 11. Fase 8 — Deploy e Validação

### 11.1 Deploy Vercel

1. Conectar repo ao Vercel (ou usar Vercel CLI)
2. Configurar variáveis de ambiente no dashboard Vercel (todas do `.env.example`)
3. Configurar domínio `ops.onsiteclub.ca` apontando para o deploy
4. Configurar webhook do Postmark para URL de produção

### 11.2 Checklist final de validação

- [ ] Signup + onboarding completo funciona
- [ ] Email chega em `{username}@onsiteclub.ca` e cria invoice
- [ ] Card "Novo remetente" aparece corretamente na primeira vez
- [ ] Adicionar cliente funciona e aparece em `/clients`
- [ ] Extrato carrega com ledger entries corretas
- [ ] Reconciliação com valor exato marca como paid_by_gc
- [ ] Reconciliação com divergência flagueia e permite continuar
- [ ] Pagamento cash cria 3 ledger entries e trava invoice
- [ ] Invoice locked não aparece como editável (checkbox desabilitado)
- [ ] Export gera ZIP e envia email para contador
- [ ] RLS bloqueia acesso cross-operator (testar com 2 contas)
- [ ] Signed URLs de PDF expiram corretamente
- [ ] Blocklist impede reenvio de email bloqueado

### 11.3 Documentar no README

Atualizar `apps/ops/README.md` com:

- Como rodar local (`pnpm dev`)
- Como criar operador de teste
- Como simular email inbound localmente (ngrok + Postmark)
- Comandos úteis (migrations, types generation)
- Troubleshooting comum

---

## 12. Regras de Execução

Válidas durante toda a implementação:

1. **Não deletar dados fiscais.** Se algo "precisa sumir", mude o status. Nenhum `DELETE` em `ops_invoices` ou `ops_ledger_entries`.

2. **Timestamps em UTC.** `timestamptz` no banco. Conversão pra timezone local só na UI.

3. **Nunca expor service role key no client.** Ela só aparece em `src/lib/supabase/service.ts` e em endpoints `/api/`.

4. **Preservar o design system.** O que está em `globals.css` é a fonte da verdade estética. Não introduzir novos tokens, cores, fontes sem necessidade clara.

5. **Lista antes de bullet.** Para conteúdo explicativo no produto (mensagens de confirmação, helpers), seguir o padrão minimalista já estabelecido: frases curtas, sem bullet point quando 1-2 linhas resolvem.

6. **Confiar em RLS.** Nunca filtrar por `operator_id` no código de aplicação (exceto no webhook de email que usa service role). Deixa o RLS fazer o filtro — isso é defesa em profundidade.

7. **Se o schema precisar mudar**, criar nova migration numerada. Não editar migration já aplicada.

8. **Commits semânticos por fase.** Um commit por subseção grande. Mensagens no formato `feat(ops): phase X.Y — descrição`.

9. **Ambiguidade → pergunta.** Se o briefing não cobrir algum caso, pausar e perguntar ao Cris. Não inventar regra de negócio.

---

## 13. Dependência Externa a Resolver (Bloqueante)

Antes de iniciar a Fase 6, o Cris precisa:

1. **Escolher e configurar o domínio de recepção.** Se `onsiteclub.ca` já está com outros serviços (Gmail Workspace, Cloudflare Email Routing, etc), há conflito no MX record. Opções:
   - Usar subdomínio dedicado: `inbox.onsiteclub.ca` (todos os usernames ficam `paulo@inbox.onsiteclub.ca`)
   - Deslocar emails existentes para outro serviço

2. **Criar conta Postmark** e me fornecer o webhook secret.

3. **Criar conta Resend** e verificar o domínio, me fornecer a API key.

---

## 14. Estado de Término da Diretiva

Quando todas as 8 fases estiverem concluídas e o checklist da Fase 8.2 passar, o OnSite Ops está em **Sprint 1 completo** (MVP funcional). A partir daí, abrir nova diretiva para Sprint 2 (histórico de versões de invoice, adiantamentos manuais, tela de clientes completa, gerenciamento de múltiplas empresas, refinamentos UX).

---

**Fim da diretiva de continuação.**

Salvar este arquivo como `apps/ops/DIRECTIVE.md` (substituindo ou complementando o `BRIEFING.md` existente). Começar pela Fase 1. Perguntar ao Cris antes de pular qualquer fase.
