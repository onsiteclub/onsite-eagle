# OnSite Ops — Briefing Técnico de Implementação

**Projeto:** OnSite Ops
**Cliente interno:** OnSite Club (Cris)
**Agente executor:** Claude Code
**Data:** 21 de abril de 2026
**Versão do briefing:** 1.0

---

## 1. Visão do Produto

### 1.1 O que é

OnSite Ops é um dashboard web para **operadores da construção civil canadense** — sub-sub-contratantes que gerenciam múltiplas empresas próprias e coordenam o trabalho de clientes (trabalhadores autônomos) que executam serviços pra General Contractors (Minto, Mattamy, Tamarack, etc).

O operador recebe invoices dos seus clientes por email, valida contra o pagamento do GC, entrega cash ao cliente descontando uma porcentagem acordada, e mantém registro fiscal organizado pra contador.

### 1.2 O que NÃO é

- Não é um sistema de contabilidade completo (não compete com QuickBooks, Xero)
- Não é um sistema de folha de pagamento
- Não faz integração bancária em v1 (Plaid/Flinks ficam pra futuro)
- Não gera invoice — recebe invoice pronta do cliente via email
- Não tem mobile nativo em v1 — é web-only, responsivo

### 1.3 Modelo mental

**Extrato bancário com reconciliação manual.** Cada cliente do operador tem uma "conta" com saldo. Invoices chegam como débitos (operador deve ao cliente). Pagamentos cash viram créditos (operador quitou). O fluxo é:

1. Invoice chega por email → vira débito na conta do cliente
2. GC paga operador (cheque/EFT) → operador registra no app com reconciliação
3. Operador paga cash ao cliente → crédito na conta, invoice quitada e travada

Confirmação sempre é **verbal** (WhatsApp, ligação). O app registra; a combinação é humana.

---

## 2. Stack Técnica

### 2.1 Stack alinhada ao ecossistema OnSite Club existente

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes + Server Actions
- **Banco de dados:** Supabase (PostgreSQL + Row Level Security)
- **Autenticação:** Supabase Auth (email + magic link)
- **Storage:** Supabase Storage (para PDFs de invoices)
- **Estado global:** Zustand (consistente com resto do ecossistema)
- **Email inbound:** Postmark Inbound (webhook)
- **Email outbound:** Resend (envios ao contador, notificações)
- **Deploy:** Vercel
- **Monorepo:** Turborepo (integrar como novo app em `apps/ops`)

### 2.2 Decisões arquiteturais

**Desacoplamento do Timekeeper.** OnSite Ops e Timekeeper têm **bancos de dados separados**. A comunicação entre eles é via **email** (protocolo aberto), nunca via API compartilhada. Isso protege:
- Aprovação da Apple do Timekeeper (app solo, sem tracking de terceiros)
- Independência evolutiva dos dois produtos
- Flexibilidade: OnSite Ops recebe emails de qualquer origem, não só Timekeeper

**Row Level Security (RLS) como camada de segurança primária.** Toda tabela tem `operator_id`, e RLS garante que operador só enxerga seus próprios dados. Isso é cinto e suspensório — mesmo se a camada de aplicação falhar, o banco bloqueia.

**Imutabilidade de registros fiscais.** Invoices, pagamentos e documentos contábeis são **append-only**. Nunca se edita ou deleta registro histórico. Correções viram novos registros vinculados.

---

## 3. Modelo de Dados

### 3.1 Tabelas principais

```sql
-- =====================================
-- OPERATORS (os Paulos)
-- =====================================
create table operators (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) unique not null,
  display_name text not null,
  inbox_username text unique not null,  -- ex: "paulo" (forma paulo@onsiteclub.ca)
  default_fee_percent numeric(5,2) default 15.00,
  created_at timestamptz default now()
);

create index on operators(inbox_username);
create index on operators(user_id);

-- =====================================
-- COMPANIES (as 4-5 empresas do operador)
-- =====================================
create table companies (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references operators(id) on delete cascade not null,
  legal_name text not null,
  trade_name text,
  hst_number text,
  wsib_number text,
  address text,
  invoice_prefix text not null,  -- ex: "JK-A" para JK Construction Ltd
  current_invoice_number integer default 0,
  logo_url text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index on companies(operator_id);

-- =====================================
-- CLIENTS (os Joões)
-- =====================================
create table clients (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references operators(id) on delete cascade not null,
  email text not null,
  display_name text not null,
  phone text,
  fee_percent_override numeric(5,2),  -- null = usa default_fee_percent do operador
  status text not null default 'active', -- active | blocked | archived
  first_invoice_at timestamptz,
  created_at timestamptz default now(),

  unique(operator_id, email)  -- mesmo email pode existir em outros operadores
);

create index on clients(operator_id);
create index on clients(email);

-- =====================================
-- CLIENT_COMPANY_ACCESS (quais empresas cada cliente pode usar)
-- =====================================
create table client_company_access (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null,
  created_at timestamptz default now(),

  unique(client_id, company_id)
);

-- =====================================
-- GCs (General Contractors: Mattamy, Minto, etc)
-- =====================================
create table gcs (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references operators(id) on delete cascade not null,
  name text not null,
  default_payment_method text default 'cheque', -- cheque | eft | mixed
  notes text,
  created_at timestamptz default now()
);

-- =====================================
-- INVOICES (recebidas por email)
-- =====================================
create table invoices (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references operators(id) on delete cascade not null,
  client_id uuid references clients(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  gc_id uuid references gcs(id) on delete set null,

  -- Identidade
  invoice_number text,              -- ex: "JK-A-0047" (extraído do PDF/assunto se possível)
  pdf_url text not null,            -- URL no Supabase Storage
  pdf_hash text,                    -- SHA-256 do PDF para integridade

  -- Valores
  amount_gross numeric(12,2) not null,  -- total da invoice
  amount_hst numeric(12,2),             -- se extraível
  amount_received numeric(12,2),        -- quanto o GC realmente pagou (preenchido na reconciliação)

  -- Metadata do email original
  from_email text not null,
  from_name text,
  subject text,
  received_at timestamptz not null,
  raw_email_id text,                    -- ID do Postmark para rastreabilidade

  -- Status e lifecycle
  status text not null default 'pending',
    -- pending: recebida, aguardando operador processar
    -- new_sender: de remetente desconhecido, aguardando decisão
    -- rejected: operador rejeitou
    -- approved: operador aceitou, invoice ativa no extrato
    -- paid_by_gc: GC pagou, aguardando repasse ao cliente
    -- paid_to_client: cash entregue ao cliente
    -- locked: totalmente fechada, imutável

  -- Detalhes operacionais
  site_address text,
  divergence_flagged boolean default false,
  divergence_amount numeric(12,2),
  operator_notes text,

  -- Timestamps de lifecycle
  approved_at timestamptz,
  paid_by_gc_at timestamptz,
  paid_to_client_at timestamptz,
  locked_at timestamptz,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on invoices(operator_id, status);
create index on invoices(client_id);
create index on invoices(received_at desc);

-- =====================================
-- INVOICE_VERSIONS (se a mesma invoice chegar mais de uma vez)
-- =====================================
create table invoice_versions (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid references invoices(id) on delete cascade not null,
  version_number integer not null,
  amount_gross numeric(12,2) not null,
  pdf_url text not null,
  pdf_hash text,
  received_at timestamptz not null,
  is_current boolean default true,
  rejected boolean default false,

  unique(invoice_id, version_number)
);

-- =====================================
-- LEDGER_ENTRIES (o extrato propriamente dito — append-only)
-- =====================================
create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references operators(id) on delete cascade not null,
  client_id uuid references clients(id) on delete cascade not null,

  entry_type text not null,
    -- invoice_received: débito (operador deve ao cliente)
    -- gc_payment_received: informativo (GC pagou, ainda não repassou)
    -- advance_paid: crédito parcial (adiantamento cash ao cliente)
    -- cash_paid_full: crédito (quitação total cash ao cliente)
    -- operator_fee: dedução (porcentagem do operador)
    -- adjustment: ajuste manual

  amount numeric(12,2) not null,  -- positivo = crédito; negativo = débito
  balance_after numeric(12,2) not null,

  invoice_id uuid references invoices(id) on delete set null,
  description text,
  entry_date date not null default current_date,

  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create index on ledger_entries(operator_id, client_id, entry_date desc);
create index on ledger_entries(invoice_id);

-- =====================================
-- ACCOUNTANT_CONTACTS (email do contador do operador)
-- =====================================
create table accountant_contacts (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references operators(id) on delete cascade not null,
  email text not null,
  name text,
  is_primary boolean default true,
  created_at timestamptz default now()
);

-- =====================================
-- EXPORT_LOGS (histórico de envios ao contador)
-- =====================================
create table export_logs (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references operators(id) on delete cascade not null,
  company_id uuid references companies(id) on delete set null,
  period_start date not null,
  period_end date not null,
  accountant_email text not null,
  zip_url text,  -- URL do ZIP gerado, armazenado no Storage
  invoice_count integer not null,
  total_amount numeric(12,2) not null,
  sent_at timestamptz default now()
);

-- =====================================
-- INBOX_BLOCKLIST (emails bloqueados pelo operador)
-- =====================================
create table inbox_blocklist (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid references operators(id) on delete cascade not null,
  blocked_email text not null,
  reason text,
  blocked_at timestamptz default now(),

  unique(operator_id, blocked_email)
);
```

### 3.2 Row Level Security (RLS)

Todas as tabelas acima devem ter RLS habilitado. Exemplo de policy para `invoices`:

```sql
alter table invoices enable row level security;

-- Operador vê só seus próprios invoices
create policy "operator_reads_own_invoices"
  on invoices for select
  using (
    operator_id in (
      select id from operators where user_id = auth.uid()
    )
  );

-- Operador atualiza só seus próprios invoices, e só se não estiver locked
create policy "operator_updates_own_unlocked_invoices"
  on invoices for update
  using (
    operator_id in (
      select id from operators where user_id = auth.uid()
    )
    and status != 'locked'
  );

-- Inserção acontece via webhook (service role), não via cliente autenticado
-- Nenhuma policy de delete — invoices nunca são deletados
```

Aplicar padrão similar em todas as outras tabelas, sempre cruzando pelo `operator_id → user_id`.

---

## 4. Fluxos Principais

### 4.1 Recepção de email (webhook)

**Endpoint:** `POST /api/inbox`

**Trigger:** Postmark Inbound envia webhook quando chega email em qualquer `*@onsiteclub.ca`.

**Lógica:**

```typescript
// app/api/inbox/route.ts
import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  const email = await request.json()

  // Validar assinatura do Postmark (segurança)
  const signature = request.headers.get('x-postmark-signature')
  if (!validatePostmarkSignature(signature, email)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createServiceClient()

  // 1. Identificar o operador pelo destinatário
  const [username] = email.To.split('@')
  const { data: operator } = await supabase
    .from('operators')
    .select('*')
    .eq('inbox_username', username)
    .single()

  if (!operator) {
    // Email recebido mas operador não existe — descartar silenciosamente
    return Response.json({ ok: true, status: 'no_operator' })
  }

  // 2. Verificar blocklist
  const { data: blocked } = await supabase
    .from('inbox_blocklist')
    .select('id')
    .eq('operator_id', operator.id)
    .eq('blocked_email', email.From)
    .single()

  if (blocked) {
    return Response.json({ ok: true, status: 'blocked' })
  }

  // 3. Extrair PDF do anexo
  const pdfAttachment = email.Attachments?.find(
    (a: any) => a.ContentType === 'application/pdf'
  )

  if (!pdfAttachment) {
    // Sem PDF — registrar como email estranho, notificar operador
    return Response.json({ ok: true, status: 'no_pdf' })
  }

  // 4. Upload do PDF pro Storage
  const pdfBuffer = Buffer.from(pdfAttachment.Content, 'base64')
  const pdfHash = createHash('sha256').update(pdfBuffer).digest('hex')
  const pdfPath = `invoices/${operator.id}/${pdfHash}.pdf`

  await supabase.storage
    .from('invoices')
    .upload(pdfPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false  // nunca sobrescrever
    })

  const { data: { publicUrl } } = supabase.storage
    .from('invoices')
    .getPublicUrl(pdfPath)

  // 5. Verificar se cliente já existe
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('operator_id', operator.id)
    .eq('email', email.From)
    .single()

  // 6. Tentar extrair valor do assunto (opcional)
  const amountMatch = email.Subject.match(/\$[\d,.]+/)
  const amount = amountMatch
    ? parseFloat(amountMatch[0].replace(/[$,]/g, ''))
    : 0

  // 7. Criar invoice
  const { data: invoice } = await supabase
    .from('invoices')
    .insert({
      operator_id: operator.id,
      client_id: client?.id || null,
      pdf_url: publicUrl,
      pdf_hash: pdfHash,
      amount_gross: amount,
      from_email: email.From,
      from_name: email.FromName,
      subject: email.Subject,
      received_at: email.Date,
      raw_email_id: email.MessageID,
      status: client ? 'pending' : 'new_sender'
    })
    .select()
    .single()

  // 8. Se cliente novo, criar notificação
  if (!client) {
    // Enviar notificação via Supabase Realtime ou push
    await notifyNewSender(operator.id, invoice)
  }

  return Response.json({ ok: true, invoice_id: invoice.id })
}
```

### 4.2 Novo remetente → Adicionar cliente

**UI:** Card no topo do Inbox com nome, email, invoice anexa, e botões "Recusar" / "Adicionar cliente".

**Ao clicar "Adicionar cliente":** abre modal com formulário:
- Nome (pré-preenchido com FromName)
- Email (read-only, vem do From)
- Porcentagem (default do operador, editável)
- Empresas autorizadas (checkboxes)

**Ao confirmar:**

```typescript
// Server Action
async function addClient(formData: {
  name: string
  email: string
  feePercent: number
  companyIds: string[]
  pendingInvoiceId: string
}) {
  const supabase = createClient()

  // Criar cliente
  const { data: client } = await supabase
    .from('clients')
    .insert({
      operator_id: currentOperator.id,
      email: formData.email,
      display_name: formData.name,
      fee_percent_override: formData.feePercent,
      first_invoice_at: new Date().toISOString()
    })
    .select()
    .single()

  // Autorizar empresas
  await supabase
    .from('client_company_access')
    .insert(
      formData.companyIds.map(cid => ({
        client_id: client.id,
        company_id: cid
      }))
    )

  // Vincular invoice pendente a esse cliente e aprovar
  await supabase
    .from('invoices')
    .update({
      client_id: client.id,
      status: 'approved',
      approved_at: new Date().toISOString()
    })
    .eq('id', formData.pendingInvoiceId)

  // Criar entrada no ledger
  const invoice = await getInvoice(formData.pendingInvoiceId)
  await supabase
    .from('ledger_entries')
    .insert({
      operator_id: currentOperator.id,
      client_id: client.id,
      entry_type: 'invoice_received',
      amount: -invoice.amount_gross,  // débito = negativo
      balance_after: -invoice.amount_gross,  // primeiro lançamento
      invoice_id: invoice.id,
      description: `Invoice ${invoice.invoice_number || invoice.id.slice(0, 8)}`,
      entry_date: new Date().toISOString().split('T')[0]
    })
}
```

### 4.3 Reconciliação: GC pagou

**UI:** Na tela de extrato do cliente, operador clica no checkbox de uma invoice em aberto. Abre modal com:
- Valor da invoice (grande, à direita)
- Campo "Recebido" (input monetário, amarelo)

Se usuário digitar valor **dentro da tolerância** de $0.50 → botão "Confirmar" normal.
Se usuário digitar valor **fora da tolerância** → banner vermelho aparece com diferença, botão vira "Usar mesmo assim" vermelho.

**Ao confirmar:**

```typescript
async function reconcileInvoice(invoiceId: string, receivedAmount: number) {
  const supabase = createClient()

  // Atualizar invoice
  await supabase
    .from('invoices')
    .update({
      amount_received: receivedAmount,
      status: 'paid_by_gc',
      paid_by_gc_at: new Date().toISOString(),
      divergence_flagged: Math.abs(receivedAmount - invoice.amount_gross) > 0.5,
      divergence_amount: receivedAmount - invoice.amount_gross
    })
    .eq('id', invoiceId)

  // (Não cria ledger entry ainda — só quando o cash for pago ao cliente)
  // Abre automaticamente o modal de "Pagar cash"
}
```

### 4.4 Pagamento cash ao cliente

**Trigger:** Após reconciliação bem-sucedida, modal "Pagar cash" abre automaticamente.

**UI:** Breakdown do cálculo:
- Recebido: $X
- − Operador Y%: $Z
- − Adiantamento: $W (se houver)
- = Cash ao cliente: $T

Botão "Paguei · Marcar quitado" (primário) e "Depois" (secundário).

**Ao clicar "Paguei":**

```typescript
async function markPaidToClient(invoiceId: string) {
  const supabase = createClient()
  const invoice = await getInvoice(invoiceId)

  // Calcular porcentagem
  const feePercent = await getClientFeePercent(invoice.client_id)
  const fee = invoice.amount_received * (feePercent / 100)

  // Buscar adiantamentos pendentes
  const pendingAdvances = await getPendingAdvances(invoice.client_id)
  const totalAdvances = pendingAdvances.reduce((sum, a) => sum + a.amount, 0)

  const cashToClient = invoice.amount_received - fee - totalAdvances

  // Criar ledger entries (múltiplos registros, um por movimento)
  await supabase.from('ledger_entries').insert([
    {
      operator_id: invoice.operator_id,
      client_id: invoice.client_id,
      entry_type: 'gc_payment_received',
      amount: invoice.amount_received,
      invoice_id: invoiceId,
      description: 'GC pagou invoice',
      balance_after: /* calcular */
    },
    {
      operator_id: invoice.operator_id,
      client_id: invoice.client_id,
      entry_type: 'operator_fee',
      amount: -fee,
      invoice_id: invoiceId,
      description: `Porcentagem do operador (${feePercent}%)`,
      balance_after: /* calcular */
    },
    {
      operator_id: invoice.operator_id,
      client_id: invoice.client_id,
      entry_type: 'cash_paid_full',
      amount: cashToClient,
      invoice_id: invoiceId,
      description: 'Cash entregue ao cliente',
      balance_after: /* calcular */
    }
  ])

  // Marcar adiantamentos como quitados
  await supabase
    .from('advances')
    .update({ settled_invoice_id: invoiceId })
    .in('id', pendingAdvances.map(a => a.id))

  // Travar invoice
  await supabase
    .from('invoices')
    .update({
      status: 'locked',
      paid_to_client_at: new Date().toISOString(),
      locked_at: new Date().toISOString()
    })
    .eq('id', invoiceId)
}
```

### 4.5 Exportar ao contador

**UI:** Aba "Enviar ao contador" com formulário:
- Empresa (select)
- Período (de/até)
- Email do contador
- Preview do conteúdo (quantidade de invoices, totais)
- Botão "Enviar ZIP por email"

**Ao enviar:**

```typescript
async function exportToAccountant(formData: {
  companyId: string
  periodStart: string
  periodEnd: string
  accountantEmail: string
}) {
  const supabase = createClient()

  // Buscar invoices do período
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, clients(*), gcs(*)')
    .eq('company_id', formData.companyId)
    .gte('received_at', formData.periodStart)
    .lte('received_at', formData.periodEnd)
    .in('status', ['paid_by_gc', 'paid_to_client', 'locked'])

  // Gerar CSV
  const csv = generateCSV(invoices)

  // Gerar relatório PDF resumido
  const summaryPdf = await generateSummaryPDF(invoices)

  // Baixar todos os PDFs individuais do Storage
  const pdfBlobs = await Promise.all(
    invoices.map(i => fetchPDF(i.pdf_url))
  )

  // Montar ZIP
  const zip = new JSZip()
  zip.file('fechamento.csv', csv)
  zip.file('resumo.pdf', summaryPdf)
  invoices.forEach((inv, idx) => {
    zip.file(`invoices/${inv.invoice_number}.pdf`, pdfBlobs[idx])
  })

  const zipBlob = await zip.generateAsync({ type: 'blob' })

  // Upload do ZIP pro Storage (link temporário)
  const zipPath = `exports/${operatorId}/${Date.now()}.zip`
  await supabase.storage.from('exports').upload(zipPath, zipBlob)
  const { data: { signedUrl } } = await supabase.storage
    .from('exports')
    .createSignedUrl(zipPath, 60 * 60 * 24 * 30)  // 30 dias

  // Enviar email com link via Resend
  await resend.emails.send({
    from: 'ops@onsiteclub.ca',
    to: formData.accountantEmail,
    subject: `Fechamento ${formData.periodStart} a ${formData.periodEnd} — ${companyName}`,
    html: renderAccountantEmail({ company, period, totals, downloadUrl: signedUrl })
  })

  // Registrar no log
  await supabase.from('export_logs').insert({
    operator_id: operatorId,
    company_id: formData.companyId,
    period_start: formData.periodStart,
    period_end: formData.periodEnd,
    accountant_email: formData.accountantEmail,
    zip_url: zipPath,
    invoice_count: invoices.length,
    total_amount: invoices.reduce((sum, i) => sum + i.amount_gross, 0)
  })
}
```

---

## 5. Estrutura de Pastas (Next.js App Router)

```
apps/ops/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # nav tabs, topbar
│   │   ├── page.tsx                      # redirect → /inbox
│   │   ├── inbox/
│   │   │   ├── page.tsx                  # lista de emails recebidos
│   │   │   └── [invoiceId]/page.tsx      # detalhe de invoice
│   │   ├── statement/
│   │   │   ├── page.tsx                  # busca de cliente
│   │   │   └── [clientId]/page.tsx       # extrato completo
│   │   ├── clients/
│   │   │   ├── page.tsx                  # lista de clientes
│   │   │   └── [clientId]/page.tsx       # perfil do cliente
│   │   ├── companies/
│   │   │   └── page.tsx                  # gerenciar empresas
│   │   ├── export/
│   │   │   └── page.tsx                  # enviar ao contador
│   │   └── settings/
│   │       └── page.tsx                  # email do operador, preferências
│   ├── api/
│   │   ├── inbox/route.ts                # webhook Postmark
│   │   └── export/route.ts               # geração de ZIP
│   └── layout.tsx
├── components/
│   ├── inbox/
│   │   ├── new-sender-card.tsx
│   │   ├── inbox-row.tsx
│   │   └── add-client-modal.tsx
│   ├── statement/
│   │   ├── client-header.tsx
│   │   ├── ledger-row.tsx
│   │   ├── reconcile-modal.tsx
│   │   └── cash-payout-modal.tsx
│   └── shared/
│       ├── topbar.tsx
│       ├── nav-tabs.tsx
│       └── success-modal.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # browser client
│   │   ├── server.ts                     # server component client
│   │   └── service.ts                    # service role (webhook only)
│   ├── email/
│   │   ├── postmark.ts                   # validação de webhook
│   │   └── resend.ts                     # envio de emails
│   ├── ledger/
│   │   ├── create-entry.ts
│   │   └── calculate-balance.ts
│   ├── pdf/
│   │   ├── extract.ts                    # extração de dados do PDF
│   │   └── summary-report.ts             # gerar PDF resumo
│   └── export/
│       └── zip-generator.ts
├── types/
│   └── database.ts                       # tipos gerados do Supabase
├── middleware.ts                         # auth guard
└── package.json
```

---

## 6. Prioridades de Implementação

### Sprint 1 (MVP funcional mínimo)

**Objetivo:** operador consegue receber invoice por email, ver no dashboard, reconciliar, marcar pago.

- [ ] Setup do projeto no monorepo Turborepo
- [ ] Schema completo do Supabase (tudo da seção 3)
- [ ] Auth básica com Supabase Auth
- [ ] Onboarding: cadastro de operador + escolha de inbox_username
- [ ] Cadastro de 1 empresa
- [ ] Webhook Postmark funcionando (recebe email, salva PDF, cria invoice)
- [ ] Tela Inbox com card "novo remetente"
- [ ] Modal "Adicionar cliente" funcional
- [ ] Tela de extrato do cliente
- [ ] Modal de reconciliação com validação de divergência
- [ ] Modal de pagamento cash com cálculo
- [ ] Marcar invoice como locked
- [ ] Deploy na Vercel

### Sprint 2 (Qualidade e robustez)

- [ ] Histórico de versões de invoice (se mesma invoice chegar duas vezes)
- [ ] Blocklist de remetentes
- [ ] Tela de Clientes com lista e perfil individual
- [ ] Gerenciamento de múltiplas empresas
- [ ] Adiantamentos manuais (botão "+ Adiantamento")
- [ ] Extração de dados do PDF (valor, endereço, GC) via regex ou OpenAI
- [ ] Export ao contador: geração de CSV + ZIP + envio por Resend
- [ ] Tela de configurações (perfil, empresas, contador)

### Sprint 3 (Polimento e escalabilidade)

- [ ] Notificações em tempo real via Supabase Realtime
- [ ] Dashboard analytics (faturamento mensal, % por GC)
- [ ] Mobile-responsive refinement
- [ ] Dark mode opcional
- [ ] Onboarding guiado com exemplos
- [ ] Integração com QuickBooks Online (OAuth + sync de invoices)
- [ ] Busca global (⌘K)
- [ ] Internacionalização EN/FR/PT

---

## 7. Considerações de Segurança

### 7.1 Autenticação e autorização

- Supabase Auth com magic link (preferível) + email/password
- Sessões via cookies httpOnly
- Middleware Next.js protege todas as rotas `(dashboard)`
- RLS habilitado em todas as tabelas

### 7.2 Webhook Postmark

- Validar assinatura do Postmark em toda request
- Usar service role key apenas no webhook, nunca exposta ao cliente
- Rate limiting no endpoint (ex: 100 req/min por IP)

### 7.3 PDFs e storage

- Bucket `invoices` no Supabase Storage configurado como **privado**
- Acesso via signed URLs com expiração curta (1h)
- Nunca deletar PDFs — imutabilidade fiscal
- Hash SHA-256 de cada PDF guardado no DB pra verificação de integridade

### 7.4 Compliance CRA

- Invoices nunca são deletadas; apenas movidas para status `rejected` ou `locked`
- Números de invoice são sequenciais por empresa (coluna `current_invoice_number`)
- Retenção de dados: mínimo 6 anos (configurar lifecycle policy no Storage)
- Timestamps em UTC em todas as tabelas
- Audit log via `created_at`, `updated_at`, e campos de lifecycle

---

## 8. Considerações de Design

### 8.1 Estética

Seguir o design system já estabelecido no mockup:
- Light mode (paper/ink)
- Tipografia: **Archivo** (display/body), **JetBrains Mono** (numbers/metadata)
- Paleta: preto (#0A0A0A), off-white (#FAFAF7), amarelo CAT (#FFCD11), verde (#16A34A), vermelho (#DC2626)
- Bordas duras, shadows chapadas (box-shadow: Xpx Ypx 0 color)
- Minimalismo radical — só mostrar o essencial
- Português como default, opção de inglês via toggle

### 8.2 Princípios de UX

1. **O humano decide, o app registra.** Nada é automático em movimento de dinheiro.
2. **Verbal é o canal real.** O app lembra o operador a confirmar por WhatsApp/ligação.
3. **Saldo é a pergunta principal.** Toda tela de cliente começa com "quanto devo".
4. **Divergência não bloqueia, alerta.** Operador é adulto, decide com info.
5. **Invoice paga é imutável.** Cadeado visual, sem edição possível.

### 8.3 Formatação monetária

- Padrão canadense: `$1,234.56` (vírgula milhar, ponto decimal)
- Mas UI em português pode usar `$ 1.234,56` se operador preferir
- Guardar no banco sempre em numeric(12,2) — UI formata na renderização

---

## 9. Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Postmark (inbound)
POSTMARK_INBOUND_WEBHOOK_SECRET=

# Resend (outbound)
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://ops.onsiteclub.ca
INBOX_DOMAIN=onsiteclub.ca
```

---

## 10. DNS e Configuração Externa

### 10.1 DNS do domínio onsiteclub.ca

```
# Inbound email (Postmark)
onsiteclub.ca.      MX    10    inbound.postmarkapp.com.

# Outbound email (Resend)
onsiteclub.ca.      TXT   "v=spf1 include:amazonses.com ~all"
_dmarc.onsiteclub.ca. TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@onsiteclub.ca"
resend._domainkey.onsiteclub.ca.  CNAME   resend._domainkey.resend.com.

# Subdomínio da app
ops.onsiteclub.ca.  CNAME  cname.vercel-dns.com.
```

### 10.2 Postmark

- Criar conta Postmark
- Configurar Inbound Stream apontando webhook pra `https://ops.onsiteclub.ca/api/inbox`
- Habilitar validação por assinatura HMAC

### 10.3 Resend

- Criar conta Resend
- Verificar domínio `onsiteclub.ca`
- Criar API key com scope de envio

---

## 11. Testes

### 11.1 Testes prioritários

- Webhook recebe email com PDF, salva corretamente
- Webhook rejeita email sem PDF ou de sender bloqueado
- Reconciliação com valor exato marca invoice como paid_by_gc
- Reconciliação com divergência marca divergence_flagged
- Pagamento cash cria 3 ledger entries corretas
- Invoice locked não pode ser editada (RLS)
- Export gera ZIP com todos PDFs do período

### 11.2 Testes manuais de integração

Enviar emails reais de teste pra `teste@onsiteclub.ca` com PDFs diversos e validar processamento.

---

## 12. Observações Finais Para o Agente

1. **Trabalhe em ordem das prioridades.** Não começar Sprint 2 sem Sprint 1 fechado.
2. **Preserve o estilo visual.** O mockup já define a linguagem. Não introduzir componentes de libraries tipo shadcn sem necessidade — preferir CSS direto.
3. **Seja obsessivo com RLS.** Todo select/insert/update/delete passa por RLS. Nenhuma exceção exceto o webhook com service role.
4. **Nunca delete dados fiscais.** Se algo precisa "sumir", muda status. Nunca `DELETE`.
5. **Timestamps sempre em UTC.** Conversão pra local timezone só na UI.
6. **Comente decisões contra-intuitivas no código.** Ex: "Não usar upsert aqui porque queremos falhar em duplicatas — auditoria."
7. **Se encontrar ambiguidade neste briefing, pause e pergunte.** Não invente regra de negócio sem confirmar com o Cris.

---

**Fim do briefing.**

Qualquer dúvida, consultar o Cris diretamente.
Este documento deve ser versionado junto com o código em `apps/ops/BRIEFING.md`.
