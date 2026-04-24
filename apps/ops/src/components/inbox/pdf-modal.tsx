'use client'

import { Modal } from '@/components/shared/modal'

export function PdfModal({
  open,
  title,
  pdfUrl,
  onClose,
}: {
  open: boolean
  title: string
  pdfUrl: string | null
  onClose: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title={`${title}.pdf`} maxWidth={900}>
      {pdfUrl ? (
        <iframe
          src={pdfUrl}
          title={`${title} PDF preview`}
          style={{
            width: '100%',
            height: '70vh',
            border: '1px solid var(--color-line)',
            background: 'var(--color-paper-2)',
          }}
        />
      ) : (
        <div className="pdf-preview">[ PDF indisponível ]</div>
      )}
    </Modal>
  )
}
