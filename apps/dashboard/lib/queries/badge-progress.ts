import { SupabaseClient } from '@supabase/supabase-js'

interface BadgeWithProgress {
  id: string
  name_en: string
  category: string
  blades_reward: number | null
  criteria: { type: string; threshold: number } | null
  progress: number // 0-1
  currentValue: number
  threshold: number
}

export async function getNextBadges(
  supabase: SupabaseClient,
  userId: string,
  earnedIds: Set<string>,
  allBadges: any[]
): Promise<BadgeWithProgress[]> {
  // Get user stats for progress calculation
  const [hoursRes, photosRes, calcsRes] = await Promise.all([
    supabase
      .from('app_timekeeper_entries')
      .select('duration_minutes')
      .eq('user_id', userId)
      .is('deleted_at', null),
    supabase
      .from('egl_photos')
      .select('id', { count: 'exact', head: true })
      .eq('uploaded_by', userId),
    supabase
      .from('app_calculator_calculations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  const totalHours = Math.round(
    (hoursRes.data?.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) ?? 0) / 60
  )
  const totalPhotos = photosRes.count ?? 0
  const totalCalcs = calcsRes.count ?? 0

  const statsMap: Record<string, number> = {
    hours: totalHours,
    photos: totalPhotos,
    calculations: totalCalcs,
    sessions: hoursRes.data?.length ?? 0,
  }

  const unearned = allBadges.filter(b => !earnedIds.has(b.id) && b.criteria)

  const withProgress: BadgeWithProgress[] = unearned
    .map(badge => {
      const criteria = badge.criteria as { type: string; threshold: number } | null
      if (!criteria?.type || !criteria?.threshold) return null

      const currentValue = statsMap[criteria.type] ?? 0
      const progress = Math.min(currentValue / criteria.threshold, 0.99) // cap below 1 since not earned

      return {
        id: badge.id,
        name_en: badge.name_en,
        category: badge.category,
        blades_reward: badge.blades_reward,
        criteria,
        progress,
        currentValue,
        threshold: criteria.threshold,
      } as BadgeWithProgress
    })
    .filter((b): b is BadgeWithProgress => b !== null && b.progress > 0.1) // only show 10%+ progress
    .sort((a, b) => b!.progress - a!.progress)
    .slice(0, 3)

  return withProgress
}
