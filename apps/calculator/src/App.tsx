// src/App.tsx
// App principal - Calculadora com abas: Calculator, Converter, Triangle
// Versão simplificada sem sistema de pagamento

import { useState, useEffect, useCallback } from 'react';
import Calculator from './components/Calculator';
import TabNavigation, { type TabType } from './components/TabNavigation';
import UnitConverter from './components/UnitConverter';
import TriangleCalculator from './components/TriangleCalculator';
import ResetPasswordModal from './components/auth/ResetPasswordModal';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { VoiceState } from './types/calculator';
import './styles/App.css';

export default function App() {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [activeTab, setActiveTab] = useState<TabType>('calculator');
  const [user, setUser] = useState<User | null>(null);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Check for reset password flow on mount
  useEffect(() => {
    // Check if URL contains reset-password path or recovery token
    const isResetPasswordFlow =
      window.location.pathname.includes('reset-password') ||
      window.location.hash.includes('type=recovery') ||
      window.location.hash.includes('access_token');

    if (isResetPasswordFlow) {
      console.log('[App] Reset password flow detected');
      setShowResetPassword(true);
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        // Get user's first name from metadata or profile
        const firstName = session.user.user_metadata?.first_name;
        setUserName(firstName || session.user.email?.split('@')[0]);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[App] Auth state change:', event);

      // Handle password recovery event
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[App] Password recovery event - showing reset modal');
        setShowResetPassword(true);
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        const firstName = session.user.user_metadata?.first_name;
        setUserName(firstName || session.user.email?.split('@')[0]);
      } else {
        setUserName(undefined);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle successful authentication
  const handleAuthSuccess = useCallback((authUser: User, isNewUser: boolean) => {
    setUser(authUser);
    const firstName = authUser.user_metadata?.first_name;
    setUserName(firstName || authUser.email?.split('@')[0]);
    console.log('[App] Auth success:', isNewUser ? 'New user' : 'Returning user');
  }, []);

  // Handle sign out
  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserName(undefined);
      console.log('[App] User signed out');
    } catch (err) {
      console.error('[App] Sign out error:', err);
    }
  }, []);

  return (
    <div className="app">
      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={showResetPassword}
        onClose={() => setShowResetPassword(false)}
        onSuccess={() => setShowResetPassword(false)}
      />

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'calculator' && (
          <Calculator
            voiceState={voiceState}
            setVoiceState={setVoiceState}
            hasVoiceAccess={true}
            onVoiceUpgradeClick={() => {}}
            onSignOut={handleSignOut}
            onAuthSuccess={handleAuthSuccess}
            user={user}
            userName={userName}
            userId={user?.id}
          />
        )}

        {activeTab === 'converter' && (
          <UnitConverter
            voiceEnabled={true}
            isRecording={voiceState === 'recording'}
          />
        )}

        {activeTab === 'triangle' && (
          <TriangleCalculator
            voiceEnabled={true}
            isRecording={voiceState === 'recording'}
          />
        )}
      </div>

      {/* Tab Navigation - Bottom */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
