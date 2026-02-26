import { SupabaseClient } from '@supabase/supabase-js'

export async function getWeeklyStats(supabase: SupabaseClient, userId: string) {
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoISO = weekAgo.toISOString()

  // Run queries in parallel
  const [hoursResult, photosResult, calcsResult] = await Promise.all([
    // Timekeeper hours this week
    supabase
      .from('app_timekeeper_entries')
      .select('duration_minutes, entry_at, exit_at')
      .eq('user_id', userId)
      .gte('entry_at', weekAgoISO)
      .is('deleted_at', null),

    // Photos uploaded this week
    supabase
      .from('egl_photos')
      .select('id', { count: 'exact', head: true })
      .eq('uploaded_by', userId)
      .gte('created_at', weekAgoISO),

    // Calculations this week
    supabase
      .from('app_calculator_calculations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', weekAgoISO),
  ])

  // Calculate total hours
  let totalMinutes = 0
  hoursResult.data?.forEach(entry => {
    if (entry.duration_minutes) {
      totalMinutes += entry.duration_minutes
    } else if (entry.exit_at) {
      const start = new Date(entry.entry_at).getTime()
      const end = new Date(entry.exit_at).getTime()
      totalMinutes += Math.round((end - start) / 60000)
    }
  })

  return {
    hoursWorked: Math.round(totalMinutes / 60 * 10) / 10,
    sessionsCount: hoursResult.data?.length ?? 0,
    photosUploaded: photosResult.count ?? 0,
    calculationsDone: calcsResult.count ?? 0,
  }
}

export async function getAppStats(supabase: SupabaseClient, userId: string) {
  const [
    timekeeperResult,
    calculatorResult,
    photosResult,
    sitesResult,
    ordersResult,
  ] = await Promise.all([
    // Timekeeper total
    supabase
      .from('app_timekeeper_entries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('deleted_at', null),

    // Calculator total
    supabase
      .from('app_calculator_calculations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),

    // Photos total
    supabase
      .from('egl_photos')
      .select('id', { count: 'exact', head: true })
      .eq('uploaded_by', userId),

    // Sites via org membership
    supabase
      .from('egl_sites')
      .select('id', { count: 'exact', head: true }),

    // Shop orders
    supabase
      .from('app_shop_orders')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  return {
    timekeeper: { entries: timekeeperResult.count ?? 0, hasData: (timekeeperResult.count ?? 0) > 0 },
    calculator: { calculations: calculatorResult.count ?? 0, hasData: (calculatorResult.count ?? 0) > 0 },
    field: { photos: photosResult.count ?? 0, hasData: (photosResult.count ?? 0) > 0 },
    eagle: { sites: sitesResult.count ?? 0, hasData: (sitesResult.count ?? 0) > 0 },
    shop: { orders: ordersResult.count ?? 0, hasData: (ordersResult.count ?? 0) > 0 },
    operator: { hasData: false },
    inspect: { hasData: false },
  }
}

export interface ActivityItem {
  id: string
  type: 'entry' | 'photo' | 'calculation'
  description: string
  timestamp: string
}

export async function getRecentActivity(supabase: SupabaseClient, userId: string): Promise<ActivityItem[]> {
  const [entriesRes, photosRes, calcsRes] = await Promise.all([
    supabase
      .from('app_timekeeper_entries')
      .select('id, entry_at, geofence_name, duration_minutes')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('entry_at', { ascending: false })
      .limit(3),
    supabase
      .from('egl_photos')
      .select('id, ai_validation_status, created_at')
      .eq('uploaded_by', userId)
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('app_calculator_calculations')
      .select('id, calculation_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const items: ActivityItem[] = []

  entriesRes.data?.forEach(e => {
    const hours = e.duration_minutes ? `${Math.round(e.duration_minutes / 60 * 10) / 10}h` : ''
    items.push({
      id: e.id,
      type: 'entry',
      description: `Hours synced${e.geofence_name ? ` at ${e.geofence_name}` : ''}${hours ? ` (${hours})` : ''}`,
      timestamp: e.entry_at,
    })
  })

  photosRes.data?.forEach(p => {
    const status = p.ai_validation_status === 'approved' ? 'approved' : p.ai_validation_status === 'rejected' ? 'needs review' : 'uploaded'
    items.push({
      id: p.id,
      type: 'photo',
      description: `Photo ${status}`,
      timestamp: p.created_at,
    })
  })

  calcsRes.data?.forEach(c => {
    const type = (c.calculation_type || 'calculation').replace(/_/g, ' ')
    items.push({
      id: c.id,
      type: 'calculation',
      description: `${type} completed`,
      timestamp: c.created_at,
    })
  })

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)
}

export async function getLatestNews(supabase: SupabaseClient, limit = 3) {
  const { data } = await supabase
    .from('club_news')
    .select('id, type, title_en, cta_url, cta_label, published_at')
    .eq('is_active', true)
    .lte('published_at', new Date().toISOString())
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(limit)

  return data ?? []
}

export async function getStreak(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from('club_streaks')
    .select('current_count, longest_count')
    .eq('user_id', userId)
    .eq('streak_type', 'daily_activity')
    .single()

  return {
    current: data?.current_count ?? 0,
    longest: data?.longest_count ?? 0,
  }
}
