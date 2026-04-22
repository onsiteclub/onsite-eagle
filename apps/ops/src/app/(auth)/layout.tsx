export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div
        className="w-full max-w-[400px] bg-paper border-2 border-ink p-7"
        style={{ boxShadow: 'var(--shadow-hard-lg)' }}
      >
        <div className="flex items-center gap-2.5 font-black text-[16px] uppercase tracking-[-0.02em] mb-7">
          <div className="w-[24px] h-[24px] bg-ink grid place-items-center text-yellow font-black text-[11px]">
            OS
          </div>
          OnSite Ops
        </div>
        {children}
      </div>
    </div>
  )
}
