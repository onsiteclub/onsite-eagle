// src/App.tsx
// Main app — Calculator with tabs: Calculator, Converter, Triangle
// Freemium model: basic calculator without login, voice + history require login

import { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from '@onsite/auth';
import Calculator from './components/Calculator';
import TabNavigation, { type TabType } from './components/TabNavigation';
import UnitConverter from './components/UnitConverter';
import TriangleCalculator from './components/TriangleCalculator';
import HamburgerMenu from './components/HamburgerMenu';
import AuthGate from './components/AuthGate';
import { useOnlineStatus } from './hooks';
import { supabase } from './lib/supabase';
import type { VoiceState } from './types/calculator';
import './styles/App.css';

export default function App() {
  if (supabase) {
    return (
      <AuthProvider supabase={supabase}>
        <AppContent />
      </AuthProvider>
    );
  }
  // No Supabase configured — run in anonymous mode
  return <AppContent />;
}

function AppContent() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | undefined>();
  const isOnline = useOnlineStatus();

  // Safely access auth (may not be within AuthProvider if supabase is null)
  const auth = useOptionalAuth();
  const user = auth?.user ?? null;

  const handleLogoClick = () => {
    window.open('https://onsiteclub.ca', '_blank');
  };

  // Show auth gate with a contextual message
  const promptLogin = useCallback((message: string) => {
    setAuthMessage(message);
    setShowAuthGate(true);
  }, []);

  // Called when voice button is clicked but user is not logged in
  const handleVoiceUpgradeClick = useCallback(() => {
    promptLogin('Sign in to use voice input');
  }, [promptLogin]);

  const handleAuthSuccess = useCallback(() => {
    setShowAuthGate(false);
    setAuthMessage(undefined);
  }, []);

  const handleSignOut = useCallback(async () => {
    if (auth?.signOut) {
      await auth.signOut();
    }
  }, [auth]);

  return (
    <div className="app">
      {/* Shared Header */}
      <header className="header">
        <div className="brand">
          <img
            src="/images/onsite-club-logo.png"
            alt="OnSite Club"
            className="logo-img"
            onClick={handleLogoClick}
            style={{ cursor: 'pointer' }}
          />
        </div>
        <div className="header-actions">
          {!isOnline && <div className="offline-badge">Offline</div>}
          {user ? (
            <>
              <span className="user-name">{user.name}</span>
              <button
                className="sign-out-btn"
                onClick={handleSignOut}
                title="Sign out"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </>
          ) : supabase ? (
            <button
              className="sign-in-btn"
              onClick={() => promptLogin('Sign in to unlock all features')}
            >
              Sign In
            </button>
          ) : null}
          <HamburgerMenu />
        </div>
      </header>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'calculator' && (
          <Calculator
            voiceState={voiceState}
            setVoiceState={setVoiceState}
            hasVoiceAccess={!!user}
            onVoiceUpgradeClick={handleVoiceUpgradeClick}
          />
        )}

        {activeTab === 'converter' && (
          <UnitConverter
            voiceEnabled={!!user}
            isRecording={voiceState === 'recording'}
          />
        )}

        {activeTab === 'triangle' && (
          <TriangleCalculator
            voiceEnabled={!!user}
            isRecording={voiceState === 'recording'}
          />
        )}
      </div>

      {/* Tab Navigation - Bottom */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Auth Gate Modal */}
      {showAuthGate && supabase && (
        <AuthGate
          supabase={supabase}
          onClose={() => setShowAuthGate(false)}
          onSuccess={handleAuthSuccess}
          message={authMessage}
        />
      )}
    </div>
  );
}

/**
 * Safely access auth context — returns null if not within AuthProvider.
 * This allows AppContent to work both with and without Supabase configured.
 */
function useOptionalAuth() {
  try {
    return useAuth();
  } catch {
    return null;
  }
}
