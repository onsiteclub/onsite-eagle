import { createClient } from '@onsite/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        device_id: null,
        device_model: null,
        device_platform: null,
        device_registered_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      console.error('Unlink device error:', error)
      return NextResponse.json({ error: 'Failed to unlink device' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Unlink device error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
