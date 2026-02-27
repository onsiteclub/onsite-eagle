import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@onsite/logger'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Unified document type for response
interface UnifiedDocument {
  id: string
  house_id: string | null
  site_id: string | null
  name: string
  file_url: string
  file_type: string
  file_size?: number
  category: string
  source: 'document' | 'timeline' | 'photo'
  created_at: string
  sender_name?: string
}

// GET - Fetch ALL files for a site/house (documents + timeline attachments)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const siteId = searchParams.get('siteId')
  const houseId = searchParams.get('houseId')

  if (!siteId && !houseId) {
    return NextResponse.json({ error: 'siteId or houseId is required' }, { status: 400 })
  }

  const allFiles: UnifiedDocument[] = []

  // 1. Fetch from egl_documents table (directly linked via house_id)
  try {
    let docsQuery = supabase
      .from('egl_documents')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (houseId) {
      docsQuery = docsQuery.eq('house_id', houseId)
    } else if (siteId) {
      docsQuery = docsQuery.eq('site_id', siteId)
    }

    const { data: docs } = await docsQuery

    if (docs) {
      for (const doc of docs) {
        allFiles.push({
          id: doc.id,
          house_id: doc.house_id,
          site_id: doc.site_id,
          name: doc.name,
          file_url: doc.file_url,
          file_type: doc.file_type || 'unknown',
          file_size: doc.file_size,
          category: doc.category || 'document',
          source: 'document',
          created_at: doc.created_at,
        })
      }
    }
  } catch (e) {
    // Table might not exist yet, continue
    logger.info('EAGLE', 'egl_documents table not available', { error: String(e) })
  }

  // 1b. Fetch LINKED documents (from bulk upload system)
  if (houseId) {
    try {
      const { data: linkedDocs } = await supabase
        .from('v_house_documents')
        .select('*')
        .eq('house_id', houseId)
        .order('uploaded_at', { ascending: false })

      if (linkedDocs) {
        const existingIds = new Set(allFiles.map(f => f.id))
        for (const doc of linkedDocs) {
          // Avoid duplicates if document is both directly linked and via document_links
          if (!existingIds.has(doc.document_id)) {
            allFiles.push({
              id: doc.document_id,
              house_id: houseId,
              site_id: null,
              name: doc.file_name,
              file_url: doc.file_url,
              file_type: doc.file_type || 'unknown',
              file_size: doc.file_size_bytes,
              category: doc.document_type === 'blueprint' ? 'plan' : (doc.document_type || 'document'),
              source: 'document',
              created_at: doc.uploaded_at,
            })
            existingIds.add(doc.document_id)
          }
        }
      }
    } catch (e) {
      logger.info('EAGLE', 'v_house_documents view not available', { error: String(e) })
    }
  }

  // 2. Fetch attachments from egl_messages (timeline uploads)
  try {
    let messagesQuery = supabase
      .from('egl_messages')
      .select('id, house_id, site_id, attachments, created_at, sender_name')
      .not('attachments', 'eq', '[]')
      .order('created_at', { ascending: false })

    if (houseId) {
      messagesQuery = messagesQuery.eq('house_id', houseId)
    } else if (siteId) {
      messagesQuery = messagesQuery.eq('site_id', siteId)
    }

    const { data: messages } = await messagesQuery

    if (messages) {
      for (const msg of messages) {
        const attachments = msg.attachments as Array<{
          type?: string
          url: string
          name?: string
        }> | null

        if (attachments && Array.isArray(attachments)) {
          for (let i = 0; i < attachments.length; i++) {
            const att = attachments[i]
            if (!att.url) continue

            // Determine file type from URL or attachment type
            const ext = att.url.toLowerCase().split('.').pop()?.split('?')[0] || ''
            const isImage = att.type === 'photo' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
            const isPdf = ext === 'pdf'

            allFiles.push({
              id: `msg_${msg.id}_${i}`,
              house_id: msg.house_id,
              site_id: msg.site_id,
              name: att.name || `File ${i + 1}`,
              file_url: att.url,
              file_type: isImage ? 'image' : isPdf ? 'pdf' : ext,
              category: isImage ? 'photo' : 'attachment',
              source: isImage ? 'photo' : 'timeline',
              created_at: msg.created_at,
              sender_name: msg.sender_name,
            })
          }
        }
      }
    }
  } catch (e) {
    console.error('Error fetching message attachments:', e)
  }

  // 3. Sort all files by date (newest first)
  allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return NextResponse.json(allFiles)
}

// POST - Create a new document record (after file upload)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      site_id,
      house_id,
      name,
      file_url,
      file_path,
      file_type,
      file_size,
      category,
      description,
    } = body

    if (!name || !file_url) {
      return NextResponse.json(
        { error: 'Missing required fields: name, file_url' },
        { status: 400 }
      )
    }

    if (!site_id && !house_id) {
      return NextResponse.json(
        { error: 'Either site_id or house_id is required' },
        { status: 400 }
      )
    }

    // Determine category from file type if not provided
    let docCategory = category || 'other'
    if (!category && file_type) {
      if (file_type.includes('pdf')) {
        docCategory = 'document'
      } else if (file_type.includes('image')) {
        docCategory = 'photo'
      } else if (file_type.includes('dwg') || name.toLowerCase().includes('.dwg')) {
        docCategory = 'drawing'
      }
    }

    const { data, error } = await supabase
      .from('egl_documents')
      .insert({
        site_id: site_id || null,
        house_id: house_id || null,
        name,
        file_url,
        file_path: file_path || null,
        file_type: file_type || null,
        file_size: file_size || null,
        category: docCategory,
        description: description || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting document:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in POST /api/documents:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a document record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Document id is required' }, { status: 400 })
    }

    // Get the document first to delete from storage too
    const { data: doc } = await supabase
      .from('egl_documents')
      .select('file_path')
      .eq('id', id)
      .single()

    // Delete from database
    const { error } = await supabase
      .from('egl_documents')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting document:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Also delete from storage if we have the path
    if (doc?.file_path) {
      await supabase.storage.from('egl-documents').remove([doc.file_path])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/documents:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
