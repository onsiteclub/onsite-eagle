'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Share2 } from 'lucide-react'
import type { FrmJobsite } from '@onsite/framing'
import { JobsiteForm } from './JobsiteForm'
import { DeleteButton } from './DeleteButton'
import { ShareBuilder } from './ShareBuilder'
import { createClient } from '@onsite/supabase/client'
import { deleteJobsite } from '@onsite/framing'

interface JobsiteActionsProps {
  jobsite: FrmJobsite
}

export function JobsiteActions({ jobsite }: JobsiteActionsProps) {
  const [showEdit, setShowEdit] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    const supabase = createClient()
    await deleteJobsite(supabase, jobsite.id)
    router.push('/app/framing/jobsites')
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setShowShare(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Share with builder"
        >
          <Share2 className="w-4 h-4 text-[#667085]" />
        </button>
        <button
          onClick={() => setShowEdit(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Edit jobsite"
        >
          <Pencil className="w-4 h-4 text-[#667085]" />
        </button>
        <DeleteButton
          entityName={jobsite.name}
          onConfirm={handleDelete}
        />
      </div>

      {showEdit && (
        <JobsiteForm
          jobsite={jobsite}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            router.refresh()
          }}
        />
      )}

      {showShare && (
        <ShareBuilder
          jobsite={jobsite}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  )
}
