import { Logo } from './Logo';

interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-onsite-light">
      {/* Background subtle pattern */}
      <div className="fixed inset-0 bg-gradient-to-br from-onsite-light via-white to-onsite-gray -z-10" />
      
      {/* Card Container */}
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo size="lg" />
        </div>

        {/* Card */}
        <div className="card">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-onsite-dark mb-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-onsite-text-secondary">
                {subtitle}
              </p>
            )}
          </div>

          {/* Content */}
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-onsite-text-muted mt-6">
          © {new Date().getFullYear()} OnSite Club. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
