import { createClient } from '@onsite/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, field, value } = await request.json()

    if (!id || !field || !value) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Map legacy field names to new column names
    const fieldMap: Record<string, string> = {
      'entrada': 'entry_at',
      'saida': 'exit_at',
      'entry_at': 'entry_at',
      'exit_at': 'exit_at',
    }

    const mappedField = fieldMap[field]
    if (!mappedField) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 })
    }

    // Fetch current entry to save original value
    const { data: currentEntry } = await supabase
      .from('tmk_entries')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!currentEntry) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // Prepare update with backup of original value
    const updateData: Record<string, any> = {
      [mappedField]: value,
      manually_edited: true,
      updated_at: new Date().toISOString(),
    }

    // Save original value if not already saved
    const originalField = mappedField === 'entry_at' ? 'original_entry_at' : 'original_exit_at'
    if (!currentEntry[originalField]) {
      updateData[originalField] = currentEntry[mappedField]
    }

    // Update entry
    const { data: updated, error } = await supabase
      .from('tmk_entries')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: 'Failed to update record' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
