// src/components/TabNavigation.tsx
// Navegação por abas para Calculator, Converter, Triangle

export type TabType = 'calculator' | 'converter' | 'triangle';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

// Ícones monocromáticos SVG
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

// Ícone de régua/escala para conversor
const ConverterIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="1" />
    <line x1="6" y1="6" x2="6" y2="10" />
    <line x1="10" y1="6" x2="10" y2="12" />
    <line x1="14" y1="6" x2="14" y2="10" />
    <line x1="18" y1="6" x2="18" y2="12" />
  </svg>
);

// Ícone de esquadro (carpenter's square) para triângulo
const TriangleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21V3H21" />
    <path d="M3 21L21 3" />
  </svg>
);

export default function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'calculator', label: 'Calculator', icon: <CalculatorIcon /> },
    { id: 'converter', label: 'Converter', icon: <ConverterIcon /> },
    { id: 'triangle', label: 'Triangle', icon: <TriangleIcon /> },
  ];

  return (
    <nav className="tab-navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
        >
          <span className="tab-icon">{tab.icon}</span>
          <span className="tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
