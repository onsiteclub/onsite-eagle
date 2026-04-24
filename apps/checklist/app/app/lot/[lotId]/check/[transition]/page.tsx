'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// Legacy route — all live traffic goes through /app/check. This file
// stays around only because a handful of older links (notifications,
// bookmarks) may still hit it. Redirect them to the canonical page so
// there is exactly one checklist UI to maintain.
interface Props {
  params: Promise<{ lotId: string; transition: string }>
}

export default function LegacyChecklistRedirect({ params }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    params.then(({ lotId, transition }) => {
      const gcId = searchParams.get('gcId')
      const qs = new URLSearchParams({ lotId, t: transition })
      if (gcId) qs.set('gcId', gcId)
      router.replace(`/app/check?${qs.toString()}`)
    })
  }, [params, router, searchParams])

  return <div className="py-8 text-center text-[15px] text-[#888884]">Redirecting...</div>
}
