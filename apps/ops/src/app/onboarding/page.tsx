import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StepAccountant } from './step-accountant'
import { StepCompany } from './step-company'
import { StepOperator } from './step-operator'

type Step = 'operator' | 'company' | 'accountant'

const INBOX_DOMAIN = process.env.INBOX_DOMAIN ?? 'onsiteclub.ca'

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: operator } = await supabase
    .from('ops_operators')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  let hasCompany = false
  if (operator) {
    const { count } = await supabase
      .from('ops_companies')
      .select('*', { count: 'exact', head: true })
      .eq('operator_id', operator.id)
    hasCompany = (count ?? 0) > 0
  }

  // Derive the step from DB state, ignoring ?step= if it's ahead of progress.
  let step: Step
  if (!operator) step = 'operator'
  else if (!hasCompany) step = 'company'
  else {
    // Operator + company done → accountant (skippable) or straight to inbox.
    const params = await searchParams
    step = params.step === 'accountant' ? 'accountant' : 'accountant'
    // If they reload /onboarding after completing everything, send to inbox.
    const { count: accountantCount } = await supabase
      .from('ops_accountant_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('operator_id', operator.id)
    if ((accountantCount ?? 0) > 0) redirect('/inbox')
  }

  const stepNumber = step === 'operator' ? 1 : step === 'company' ? 2 : 3
  const titles: Record<Step, string> = {
    operator: 'Reserve seu email',
    company: 'Cadastre sua empresa',
    accountant: 'Contador',
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div
        className="w-full max-w-[480px] bg-paper border-2 border-ink p-7"
        style={{ boxShadow: 'var(--shadow-hard-lg)' }}
      >
        <div className="flex items-center gap-2.5 font-black text-[16px] uppercase tracking-[-0.02em] mb-5">
          <div className="w-[24px] h-[24px] bg-ink grid place-items-center text-yellow font-black text-[11px]">
            OS
          </div>
          OnSite Ops
        </div>

        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={[
                'flex-1 h-1',
                n <= stepNumber ? 'bg-ink' : 'bg-line',
              ].join(' ')}
            />
          ))}
        </div>

        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 mb-1">
          Passo {stepNumber} de 3
        </div>
        <h1
          className="font-black text-[24px] uppercase mb-5"
          style={{ letterSpacing: '-0.02em' }}
        >
          {titles[step]}
        </h1>

        {step === 'operator' && <StepOperator inboxDomain={INBOX_DOMAIN} />}
        {step === 'company' && <StepCompany />}
        {step === 'accountant' && <StepAccountant />}
      </div>
    </div>
  )
}
