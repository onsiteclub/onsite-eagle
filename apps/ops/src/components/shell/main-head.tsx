import { requireOperator } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow } from 'date-fns'
import { Breadcrumb } from './breadcrumb'

export async function MainHead() {
  const operator = await requireOperator()
  const supabase = await createClient()

  const { data: last } = await supabase
    .from('ops_invoices')
    .select('received_at')
    .eq('operator_id', operator.id)
    .order('received_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastAt = last?.received_at ? new Date(last.received_at) : null
  const isRecent = lastAt ? Date.now() - lastAt.getTime() < 24 * 60 * 60 * 1000 : false
  const relative = lastAt
    ? formatDistanceToNow(lastAt, { addSuffix: false }) + ' ago'
    : 'no invoices yet'

  return (
    <div className="main-head">
      <Breadcrumb />
      <div className="main-head-actions">
        <div className="health-indicator">
          <div className={['health-dot', isRecent ? '' : 'stale'].join(' ')} />
          <span>Inbound {isRecent ? 'active' : 'quiet'} · {relative}</span>
        </div>
      </div>
    </div>
  )
}
