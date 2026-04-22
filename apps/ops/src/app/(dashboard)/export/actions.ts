'use server'

import { sendExportEmail } from '@/lib/email/resend'
import { generateCsv, type CsvInvoiceRow } from '@/lib/export/csv'
import { requireOperator } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import JSZip from 'jszip'
import { revalidatePath } from 'next/cache'

export type ExportState = {
  ok: boolean
  message: string | null
  downloadUrl: string | null
}

const initial: ExportState = { ok: false, message: null, downloadUrl: null }

export async function sendExportAction(
  _prev: ExportState,
  formData: FormData,
): Promise<ExportState> {
  const operator = await requireOperator()
  const supabase = await createClient()

  const companyId = String(formData.get('companyId') ?? '').trim()
  const from = String(formData.get('from') ?? '').trim()
  const to = String(formData.get('to') ?? '').trim()
  const accountantEmail = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!companyId || !from || !to || !accountantEmail) {
    return { ...initial, message: 'Preencha todos os campos.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountantEmail)) {
    return { ...initial, message: 'Email do contador inválido.' }
  }

  // 1. Company (must belong to operator)
  const { data: company } = await supabase
    .from('ops_companies')
    .select('id, legal_name, trade_name')
    .eq('id', companyId)
    .eq('operator_id', operator.id)
    .maybeSingle()
  if (!company) return { ...initial, message: 'Empresa não encontrada.' }

  // 2. Fetch invoices in range (any finalized state)
  const { data: invoices } = await supabase
    .from('ops_invoices')
    .select(`
      id, invoice_number, received_at, pdf_url, amount_gross, amount_hst,
      amount_received, status, site_address,
      client:ops_clients(display_name, email),
      gc:ops_gcs(name)
    `)
    .eq('operator_id', operator.id)
    .eq('company_id', companyId)
    .gte('received_at', `${from}T00:00:00Z`)
    .lte('received_at', `${to}T23:59:59Z`)
    .in('status', ['paid_by_gc', 'paid_to_client', 'locked'])
    .order('received_at', { ascending: true })

  if (!invoices || invoices.length === 0) {
    return {
      ...initial,
      message: 'Nenhuma invoice finalizada no período. Reconcilie/pague antes de exportar.',
    }
  }

  // 3. Build CSV + fetch PDFs
  const service = createServiceClient()

  const csvRows: CsvInvoiceRow[] = invoices.map((i) => {
    const client = Array.isArray(i.client) ? i.client[0] : i.client
    const gc = Array.isArray(i.gc) ? i.gc[0] : i.gc
    return {
      invoice_number: i.invoice_number,
      received_at: i.received_at,
      client_name: client?.display_name ?? null,
      client_email: client?.email ?? null,
      gc_name: gc?.name ?? null,
      site_address: i.site_address,
      amount_gross: Number(i.amount_gross),
      amount_hst: i.amount_hst !== null ? Number(i.amount_hst) : null,
      amount_received: i.amount_received !== null ? Number(i.amount_received) : null,
      status: i.status,
    }
  })

  const csv = generateCsv(csvRows)

  // 4. Download all PDFs concurrently
  const pdfBlobs = await Promise.all(
    invoices.map(async (inv, idx) => {
      if (!inv.pdf_url) return { name: `${idx + 1}.pdf`, buffer: null }
      const { data, error } = await service.storage
        .from('ops-invoices')
        .download(inv.pdf_url)
      if (error || !data) {
        console.error('[export] pdf download failed', inv.id, error)
        return { name: `${idx + 1}.pdf`, buffer: null }
      }
      const buffer = Buffer.from(await data.arrayBuffer())
      const label = inv.invoice_number || inv.id.slice(0, 8)
      return { name: `${label}.pdf`, buffer }
    }),
  )

  // 5. Build ZIP
  const zip = new JSZip()
  zip.file('fechamento.csv', csv)
  const invoicesFolder = zip.folder('invoices')
  if (invoicesFolder) {
    pdfBlobs.forEach(({ name, buffer }) => {
      if (buffer) invoicesFolder.file(name, buffer)
    })
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
  const timestamp = Date.now()
  const zipPath = `exports/${operator.id}/${timestamp}.zip`

  const { error: uploadError } = await service.storage
    .from('ops-invoices')
    .upload(zipPath, zipBuffer, {
      contentType: 'application/zip',
      upsert: false,
    })

  if (uploadError) {
    console.error('[export] zip upload failed', uploadError)
    return { ...initial, message: `Erro ao subir ZIP: ${uploadError.message}` }
  }

  // 6. Signed URL (30 days)
  const { data: signed } = await service.storage
    .from('ops-invoices')
    .createSignedUrl(zipPath, 60 * 60 * 24 * 30)

  if (!signed?.signedUrl) {
    return { ...initial, message: 'Erro ao gerar link de download.' }
  }

  // 7. Totals
  const totalAmount = csvRows.reduce((s, r) => s + r.amount_gross, 0)
  const hstAmount = csvRows.reduce((s, r) => s + (r.amount_hst ?? 0), 0)

  // 8. Send email (graceful no-op if RESEND_API_KEY missing)
  const sendRes = await sendExportEmail({
    to: accountantEmail,
    companyName: company.trade_name || company.legal_name,
    periodStart: from,
    periodEnd: to,
    downloadUrl: signed.signedUrl,
    invoiceCount: invoices.length,
    totalAmount,
    hstAmount,
  })

  if (!sendRes.ok) {
    return {
      ok: false,
      message: `ZIP gerado, mas falha ao enviar email: ${sendRes.error}`,
      downloadUrl: signed.signedUrl,
    }
  }

  // 9. Log the export
  await supabase.from('ops_export_logs').insert({
    operator_id: operator.id,
    company_id: companyId,
    period_start: from,
    period_end: to,
    accountant_email: accountantEmail,
    zip_url: zipPath,
    invoice_count: invoices.length,
    total_amount: totalAmount,
  })

  revalidatePath('/export')

  const suffix = sendRes.simulated
    ? ' (email simulado — RESEND_API_KEY não configurado)'
    : ''
  return {
    ok: true,
    message: `Fechamento enviado para ${accountantEmail}${suffix}.`,
    downloadUrl: signed.signedUrl,
  }
}
