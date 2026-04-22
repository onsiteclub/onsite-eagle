'use client'

import { Modal } from './modal'

export function SuccessModal({
  open,
  onClose,
  message,
}: {
  open: boolean
  onClose: () => void
  message: string
}) {
  return (
    <Modal open={open} onClose={onClose} maxWidth={340} bodyClassName="text-center px-6 py-8">
      <div className="w-12 h-12 bg-green text-white rounded-full grid place-items-center mx-auto mb-3 text-[24px] font-black">
        ✓
      </div>
      <div className="font-black text-[16px] uppercase tracking-[-0.01em]">{message}</div>
    </Modal>
  )
}
