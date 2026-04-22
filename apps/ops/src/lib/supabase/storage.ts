import 'server-only'
import { createServiceClient } from './service'

/** TTL padrão para signed URLs de invoice PDF (1 hora). */
const PDF_URL_TTL_SECONDS = 60 * 60

/**
 * Gera uma signed URL temporária para um PDF armazenado em `ops-invoices`.
 * Usa service_role — não precisa de operator_id no contexto, mas o caller
 * DEVE ter validado que o invoice pertence ao operador antes de chamar.
 *
 * @param pdfPath path relativo dentro do bucket (ex: "{operator_id}/{hash}.pdf")
 */
export async function getInvoicePdfUrl(pdfPath: string): Promise<string | null> {
  if (!pdfPath) return null

  const supabase = createServiceClient()
  const { data, error } = await supabase.storage
    .from('ops-invoices')
    .createSignedUrl(pdfPath, PDF_URL_TTL_SECONDS)

  if (error || !data) return null
  return data.signedUrl
}

/**
 * Assina múltiplos PDFs em lote. Retorna map path → signedUrl (ou null se falhar).
 */
export async function getInvoicePdfUrls(
  paths: string[],
): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {}
  if (paths.length === 0) return result

  // Supabase Storage não tem createSignedUrls batch built-in que aceite
  // paths de arquivos ainda não listados. Fazer em paralelo.
  const signed = await Promise.all(paths.map((p) => getInvoicePdfUrl(p)))
  paths.forEach((p, i) => {
    result[p] = signed[i]
  })
  return result
}
