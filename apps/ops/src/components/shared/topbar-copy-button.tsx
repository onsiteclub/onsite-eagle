'use client'

import { useState } from 'react'

export function TopbarCopyButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // ignore
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="text-ink-3 hover:text-ink text-[10px] ml-1 cursor-pointer"
    >
      {copied ? 'copiado' : 'copiar'}
    </button>
  )
}
