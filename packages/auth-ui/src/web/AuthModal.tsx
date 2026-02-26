/**
 * AuthModal — Modal overlay wrapper for web auth (Calculator-style popup).
 *
 * Wraps LoginForm/SignupForm in a modal overlay. Closes on backdrop click or Escape.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import type { AuthFlowCallbacks, AuthScreenMode } from '../types';

export interface AuthModalProps extends AuthFlowCallbacks {
  appName?: string;
  subtitle?: string;
  showSignup?: boolean;
  legal?: { termsUrl: string; privacyUrl: string };
  icons?: { eyeOpen?: React.ReactNode; eyeClosed?: React.ReactNode };
  onClose: () => void;
}

export function AuthModal({
  appName = 'Club',
  subtitle,
  showSignup = true,
  legal,
  icons,
  onClose,
  onSignIn,
  onSignUp,
  onSuccess,
}: AuthModalProps) {
  const [screen, setScreen] = useState<AuthScreenMode>('login');

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handleEscape]);

  if (!onSignIn) return null;

  const modeSubtitle =
    screen === 'login' ? (subtitle ?? 'Sign in to your account') :
    'Create your account';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 mx-4 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#667085] hover:text-[#101828] text-xl leading-none"
        >
          &times;
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-[#101828]">OnSite {appName}</h2>
          <p className="text-[#667085] text-sm mt-1">{modeSubtitle}</p>
        </div>

        {screen === 'login' && (
          <LoginForm
            showForgotPassword={false}
            showSignup={showSignup && !!onSignUp}
            icons={icons}
            onSignIn={onSignIn}
            onSwitchToSignup={() => setScreen('signup')}
            onSuccess={onSuccess}
          />
        )}

        {screen === 'signup' && onSignUp && (
          <SignupForm
            icons={icons}
            legal={legal}
            onSignUp={onSignUp}
            onSwitchToLogin={() => setScreen('login')}
            onSuccess={onSuccess}
          />
        )}
      </div>
    </div>
  );
}
