import { createClient } from '@onsite/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { first_name, last_name, company_name, trade } = body

    // Update core_profiles table
    const { error } = await supabase
      .from('core_profiles')
      .update({
        first_name: first_name?.trim() || null,
        last_name: last_name?.trim() || null,
        company_name: company_name?.trim() || null,
        trade: trade?.trim() || null,
        // Also update full_name for backward compatibility
        full_name: first_name && last_name
          ? `${first_name.trim()} ${last_name.trim()}`
          : first_name?.trim() || last_name?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
