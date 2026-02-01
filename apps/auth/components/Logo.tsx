'use client';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: { icon: 32, text: 'text-lg' },
    md: { icon: 40, text: 'text-xl' },
    lg: { icon: 56, text: 'text-2xl' },
  };

  const { icon, text } = sizes[size];

  return (
    <div className="flex items-center gap-3">
      {/* OnSite Icon - Location Pin with Dot */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-onsite-dark"
      >
        {/* Outer pin shape */}
        <path
          d="M24 4C15.163 4 8 11.163 8 20C8 31 24 44 24 44C24 44 40 31 40 20C40 11.163 32.837 4 24 4Z"
          fill="currentColor"
        />
        {/* Inner circle (accent) */}
        <circle cx="24" cy="20" r="8" fill="#F6C343" />
        {/* Center dot */}
        <circle cx="24" cy="20" r="3" fill="#1B2B27" />
      </svg>
      
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold ${text} text-onsite-dark leading-tight`}>
            OnSite
          </span>
          <span className="text-xs text-onsite-text-secondary tracking-wider uppercase">
            Club
          </span>
        </div>
      )}
    </div>
  );
}
