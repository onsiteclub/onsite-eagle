import 'server-only'
import { Resend } from 'resend'

const FROM_ADDRESS = 'dev@onsiteclub.ca'

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

export type SendExportEmailParams = {
  to: string
  companyName: string
  periodStart: string
  periodEnd: string
  downloadUrl: string
  invoiceCount: number
  totalAmount: number
  hstAmount: number
}

const CAD = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
})

function renderExportHtml(p: SendExportEmailParams): string {
  return `<!doctype html>
<html><body style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0A0A0A;">
  <h1 style="font-size:20px;margin:0 0 16px;text-transform:uppercase;letter-spacing:-0.02em;">
    Fechamento ${p.periodStart} — ${p.periodEnd}
  </h1>
  <p style="margin:0 0 12px;"><strong>${p.companyName}</strong></p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-family:Menlo,monospace;font-size:13px;">
    <tr><td style="padding:6px 0;">Invoices no período</td><td style="text-align:right;"><strong>${p.invoiceCount}</strong></td></tr>
    <tr><td style="padding:6px 0;">Total faturado</td><td style="text-align:right;"><strong>${CAD.format(p.totalAmount)}</strong></td></tr>
    <tr><td style="padding:6px 0;">HST coletado</td><td style="text-align:right;"><strong>${CAD.format(p.hstAmount)}</strong></td></tr>
  </table>
  <p style="margin:20px 0;">
    <a href="${p.downloadUrl}"
       style="display:inline-block;background:#0A0A0A;color:#FFCD11;padding:12px 20px;text-decoration:none;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;font-size:12px;">
      Baixar ZIP (válido 30 dias)
    </a>
  </p>
  <p style="font-size:12px;color:#52525B;margin:24px 0 0;">
    O ZIP contém todas as invoices em PDF + planilha CSV contábil. Link expira em 30 dias — salve uma cópia se precisar.
  </p>
</body></html>`
}

export async function sendExportEmail(
  params: SendExportEmailParams,
): Promise<{ ok: boolean; error?: string; simulated?: boolean }> {
  const client = getResend()

  if (!client) {
    console.warn('[resend] RESEND_API_KEY missing — skipping actual send', {
      to: params.to,
      companyName: params.companyName,
      downloadUrl: params.downloadUrl,
    })
    return { ok: true, simulated: true }
  }

  const { error } = await client.emails.send({
    from: FROM_ADDRESS,
    to: params.to,
    subject: `Fechamento ${params.periodStart} a ${params.periodEnd} — ${params.companyName}`,
    html: renderExportHtml(params),
  })

  if (error) {
    console.error('[resend] send failed', error)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
