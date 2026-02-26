import { createClient } from '@onsite/supabase/server'
import { redirect } from 'next/navigation'
import { Newspaper, Bell } from 'lucide-react'

export const metadata = { title: 'News | OnSite Club' }

export default async function NewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  // News will be populated after Phase 5 migration
  const { data: news } = await supabase
    .from('club_news')
    .select('*')
    .eq('is_active', true)
    .lte('published_at', new Date().toISOString())
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false })
    .limit(20)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#101828]">News & Updates</h1>
        <p className="text-[#667085] mt-1">Latest from OnSite Club</p>
      </div>

      {!news || news.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
          <Newspaper className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-[#101828] mb-1">No news yet</h3>
          <p className="text-[#667085] text-sm">Stay tuned for campaigns, badge challenges, and industry updates.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {news.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-50 text-brand-700 uppercase">
                  {item.type}
                </span>
                {item.is_pinned && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 uppercase">
                    Pinned
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-[#101828] mb-1">{item.title_en}</h3>
              {item.body_en && <p className="text-sm text-[#667085]">{item.body_en}</p>}
              {item.cta_url && (
                <a href={item.cta_url} className="text-sm text-brand-500 hover:text-brand-600 font-medium mt-2 inline-block">
                  {item.cta_label || 'Learn more'} &rarr;
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
