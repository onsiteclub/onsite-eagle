import { signoutAction } from '@/app/(auth)/actions'
import { initialsOf, requireOperator } from '@/lib/auth'
import { TopbarCopyButton } from './topbar-copy-button'

const INBOX_DOMAIN = process.env.INBOX_DOMAIN ?? 'onsiteclub.ca'

export async function Topbar() {
  const operator = await requireOperator()
  const address = `${operator.inbox_username}@${INBOX_DOMAIN}`

  return (
    <header className="flex items-center justify-between px-7 py-3.5 border-b border-line bg-paper">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2.5 font-black text-[14px] uppercase tracking-[-0.02em]">
          <div className="w-[22px] h-[22px] bg-ink grid place-items-center text-yellow font-black text-[10px]">
            OS
          </div>
          OnSite Ops
        </div>
        <div className="inline-flex items-center gap-2 font-mono text-[11px] font-medium text-ink-2 px-2.5 py-1.5 bg-paper-2 border border-line">
          <span className="text-yellow">✉</span>
          {address}
          <TopbarCopyButton address={address} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="w-7 h-7 bg-ink text-yellow grid place-items-center font-black text-[11px]"
          title={operator.display_name}
        >
          {initialsOf(operator.display_name)}
        </div>
        <form action={signoutAction}>
          <button
            type="submit"
            className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-3 hover:text-ink cursor-pointer"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  )
}
