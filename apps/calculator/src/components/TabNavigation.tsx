// src/components/TabNavigation.tsx
// Bottom navigation — Calculator, Stairs, Triangle, Converter.
// Mobile: icon-forward, tight. Desktop: icon + text label inline + version/online
// indicator on the far right (per mockup).

export type TabType = 'calculator' | 'stairs' | 'triangle' | 'converter';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  /** Online state surfaces as an indicator dot in the desktop footer. */
  isOnline?: boolean;
  /** App version string shown next to the indicator. Optional — hidden if absent. */
  appVersion?: string;
}

const CalculatorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="8" y1="6" x2="16" y2="6" />
    <line x1="8" y1="10" x2="8" y2="10.01" />
    <line x1="12" y1="10" x2="12" y2="10.01" />
    <line x1="16" y1="10" x2="16" y2="10.01" />
    <line x1="8" y1="14" x2="8" y2="14.01" />
    <line x1="12" y1="14" x2="12" y2="14.01" />
    <line x1="16" y1="14" x2="16" y2="14.01" />
    <line x1="8" y1="18" x2="8" y2="18.01" />
    <line x1="12" y1="18" x2="12" y2="18.01" />
    <line x1="16" y1="18" x2="16" y2="18.01" />
  </svg>
);

const ConverterIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="1" />
    <line x1="6" y1="6" x2="6" y2="10" />
    <line x1="10" y1="6" x2="10" y2="12" />
    <line x1="14" y1="6" x2="14" y2="10" />
    <line x1="18" y1="6" x2="18" y2="12" />
  </svg>
);

const TriangleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21V3H21" />
    <path d="M3 21L21 3" />
  </svg>
);

const StairsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 20, 8 20, 8 15, 13 15, 13 10, 18 10, 18 5, 21 5" />
  </svg>
);

export default function TabNavigation({ activeTab, onTabChange, isOnline, appVersion }: TabNavigationProps) {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'calculator', label: 'Cálculo',  icon: <CalculatorIcon /> },
    { id: 'stairs',     label: 'Escada',   icon: <StairsIcon /> },
    { id: 'triangle',   label: 'Esquadro', icon: <TriangleIcon /> },
    { id: 'converter',  label: 'Conversão',icon: <ConverterIcon /> },
  ];

  return (
    <nav className="tab-navigation">
      <div className="tab-navigation__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Right-side status cluster — visible only on desktop (CSS). */}
      {(appVersion || isOnline !== undefined) && (
        <div className="tab-navigation__status" aria-live="polite">
          {appVersion && <span className="tab-navigation__version">{appVersion}</span>}
          {isOnline !== undefined && (
            <span className={`tab-navigation__online ${isOnline ? 'tab-navigation__online--yes' : 'tab-navigation__online--no'}`}>
              <span className="tab-navigation__dot" aria-hidden="true" />
              {isOnline ? 'online' : 'offline'}
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
