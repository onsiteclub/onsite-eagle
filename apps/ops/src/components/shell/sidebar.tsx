import { signoutAction } from '@/app/(auth)/actions'
import { initialsOf, requireOperator } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NavItemLink } from './nav-item-link'

export async function Sidebar() {
  const operator = await requireOperator()
  const supabase = await createClient()

  // Badge count: invoices needing action (pending + new_sender)
  const { count: inboxCount } = await supabase
    .from('ops_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('operator_id', operator.id)
    .in('status', ['pending', 'new_sender'])

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">OS</div>
        <div className="brand-name">OnSite</div>
      </div>

      <div className="sidebar-body">
        <div className="nav-group expanded active">
          <div className="nav-group-head">
            <div className="nav-icon">📥</div>
            <span>Ops</span>
            <span className="caret">▶</span>
          </div>
          <div className="nav-children">
            <NavItemLink href="/inbox" label="Inbox" badge={inboxCount ?? 0} />
            <NavItemLink href="/ledgers" label="Ledgers" />
            <NavItemLink href="/closing" label="Closing" />
            <NavItemLink href="/settings" label="Settings" />
          </div>
        </div>

        <div className="nav-group coming-soon">
          <div className="nav-group-head">
            <div className="nav-icon">✓</div>
            <span>Checklist</span>
            <span className="soon-badge">beta</span>
          </div>
        </div>

        <div className="nav-group coming-soon">
          <div className="nav-group-head">
            <div className="nav-icon">👷</div>
            <span>Operator</span>
            <span className="soon-badge">beta</span>
          </div>
        </div>

        <div className="sidebar-divider" />

        <div className="nav-group">
          <div className="nav-group-head">
            <div className="nav-icon">⚙</div>
            <span>Account</span>
          </div>
        </div>
      </div>

      <div className="sidebar-foot">
        <form action={signoutAction}>
          <button type="submit" className="user-chip" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <div className="user-avatar">{initialsOf(operator.display_name)}</div>
            <div className="user-info">
              <div className="user-name">{operator.display_name}</div>
              <div className="user-email">{operator.email}</div>
            </div>
          </button>
        </form>
      </div>
    </aside>
  )
}
