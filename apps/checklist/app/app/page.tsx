'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@onsite/supabase/client'
import { listJobsites } from '@onsite/framing'
import type { FrmJobsite } from '@onsite/framing'
import LotSearchClient from './LotSearchClient'

export default function AppPage() {
  const [jobsites, setJobsites] = useState<FrmJobsite[] | null>(null)

  useEffect(() => {
    const supabase = createClient()
    listJobsites(supabase).then((data) => setJobsites(data ?? []))
  }, [])

  if (!jobsites) {
    return (
      <div className="py-8 text-center text-[15px] text-[#888884]">
        Loading jobsites...
      </div>
    )
  }

  return <LotSearchClient jobsites={jobsites} />
}
