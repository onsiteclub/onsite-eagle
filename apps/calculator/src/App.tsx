// src/App.tsx
// Main app — Calculator with tabs: Calculator, Converter, Triangle
// Freemium model: basic calculator without login, voice + history require login

import { useState, useCallback } from 'react';
import { AuthProvider, useAuth } from '@onsite/auth';
import ConversationalCalculator from './components/ConversationalCalculator';
import TabNavigation, { type TabType } from './components/TabNavigation';
import UnitConverter from './components/UnitConverter';
import TriangleCalculator from './components/TriangleCalculator';
import StairsCalculator from './components/StairsCalculator';
import HamburgerMenu from './components/HamburgerMenu';
import AuthGate from './components/AuthGate';
import Toast from './components/Toast';
import { useOnlineStatus } from './hooks';
import { supabase } from './lib/supabase';
import type { VoiceState, RoutedIntent } from './types/calculator';
import './styles/App.css';

// Step 2 — friendly label shown in the auto-switch toast so the user
// understands WHY the tab jumped. Keeps tabs as a UX affordance (visible
// what's possible) without making them control behavior.
const TAB_LABEL_PT: Record<TabType, string> = {
  calculator: 'Calculadora',
  stairs: 'Escada',
  triangle: 'Triângulo',
  converter: 'Conversor',
};

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
  // Step 2 — voice intent routing. When GPT classifies the input as
  // stairs/triangle/conversion, the Calculator tab hands off the parsed
  // expression + parameters via this slot; the destination tab consumes
  // it on mount (see e.g. UnitConverter) and clears it once applied.
  const [routedIntent, setRoutedIntent] = useState<RoutedIntent | null>(null);
  const [routeToast, setRouteToast] = useState<string | null>(null);
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

  // Step 2 — single entry point for auto-routing. Called by tabs that interpret
  // natural-language input (today: ConversationalCalculator). Switches the tab,
  // stashes the parsed intent for the destination to consume, and surfaces a
  // toast so the user can tell WHY the view changed.
  const handleIntentRouted = useCallback(
    (tab: TabType, intent?: RoutedIntent) => {
      setActiveTab(tab);
      setRoutedIntent(intent ?? null);
      setRouteToast(`Abrindo ${TAB_LABEL_PT[tab]}…`);
    },
    [],
  );

  // Destination tabs call this after applying the routed intent to their form.
  const consumeRoutedIntent = useCallback(() => {
    setRoutedIntent(null);
  }, []);

  return (
    <div className="app">
      {/* Shared Header
          Desktop mockup: "OnSite Calculator" wordmark + ⌘K hint + avatar.
          Mobile: logo + sign-in + hamburger (current behavior preserved via CSS). */}
      <header className="header">
        <div className="brand">
          <img
            src="/images/onsite-club-logo.png"
            alt="OnSite Club"
            className="logo-img"
            onClick={handleLogoClick}
            style={{ cursor: 'pointer' }}
          />
          <span className="brand-wordmark">
            <span className="brand-wordmark__name">OnSite</span>
            <span className="brand-wordmark__product">Calculator</span>
          </span>
        </div>
        <div className="header-actions">
          {!isOnline && <div className="offline-badge">Offline</div>}
          {/* ⌘K / Ctrl+K hint — desktop-only visual placeholder for a future
              command palette. Button for a11y; no onClick yet. */}
          <button
            type="button"
            className="header-shortcut"
            aria-label="Command palette (em breve)"
            title="Atalho em breve"
          >
            <kbd>⌘</kbd><kbd>K</kbd>
          </button>
          {user ? (
            <>
              <button
                type="button"
                className="header-avatar"
                onClick={handleSignOut}
                title={`${user.name} — sair`}
                aria-label={`${user.name} — sair`}
              >
                {initialsFromName(user.name)}
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
          <ConversationalCalculator
            voiceState={voiceState}
            setVoiceState={setVoiceState}
            hasVoiceAccess={!!user}
            onVoiceUpgradeClick={handleVoiceUpgradeClick}
            onIntentRouted={handleIntentRouted}
          />
        )}

        {activeTab === 'stairs' && (
          <StairsCalculator
            voiceEnabled={!!user}
            isRecording={voiceState === 'recording'}
            routedIntent={routedIntent}
            onRoutedIntentConsumed={consumeRoutedIntent}
          />
        )}

        {activeTab === 'triangle' && (
          <TriangleCalculator
            voiceEnabled={!!user}
            isRecording={voiceState === 'recording'}
            routedIntent={routedIntent}
            onRoutedIntentConsumed={consumeRoutedIntent}
          />
        )}

        {activeTab === 'converter' && (
          <UnitConverter
            voiceEnabled={!!user}
            isRecording={voiceState === 'recording'}
            routedIntent={routedIntent}
            onRoutedIntentConsumed={consumeRoutedIntent}
          />
        )}
      </div>

      {/* Tab Navigation - Bottom. `isOnline` + `appVersion` only render on desktop. */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOnline={isOnline}
        appVersion={typeof __APP_VERSION__ !== 'undefined' ? `v${__APP_VERSION__}` : undefined}
      />

      {/* Step 2 — auto-switch feedback. Tabs are a discovery affordance, not a
          gate, but when GPT routes the user somewhere new they deserve to know
          why the view changed. */}
      {routeToast && (
        <Toast
          message={routeToast}
          type="info"
          duration={2500}
          onClose={() => setRouteToast(null)}
        />
      )}

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

/** "Cristony Rocha" → "CR". Fallback "•" when name is empty. */
function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '•';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
