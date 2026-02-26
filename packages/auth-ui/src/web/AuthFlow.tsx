/**
 * AuthFlow — Web auth orchestrator.
 *
 * Full login/signup/forgot flow in a centered card.
 * Auto-wires to @onsite/auth's useAuth() if inside AuthProvider.
 */

'use client';

import { useState, useMemo } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { ForgotForm } from './ForgotForm';
import type { AuthFlowProps, AuthScreenMode } from '../types';

// Try to dynamically access useAuth
let useAuthHook: (() => {
  signIn: (c: { email: string; password: string }) => Promise<void>;
  signUp: (c: { email: string; password: string; name: string; role: string }) => Promise<void>;
  user: unknown;
  loading: boolean;
}) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const authModule = require('@onsite/auth');
  useAuthHook = authModule.useAuth;
} catch {
  // Fine — not in AuthProvider context
}

export function AuthFlow({
  appName,
  icon,
  subtitle,
  footer = 'OnSite Club — Built for the trades',
  showSignup = false,
  showForgotPassword = true,
  defaultRole = 'worker',
  icons,
  legal,
  initialScreen = 'login',
  onSignIn,
  onSignUp,
  onForgotPassword,
  onSuccess,
}: AuthFlowProps) {
  const [screen, setScreen] = useState<AuthScreenMode>(initialScreen);

  // Try to get auth context
  const authContext = useMemo(() => {
    if (!useAuthHook) return null;
    try {
      return useAuthHook();
    } catch {
      return null;
    }
  }, []);

  const handleSignIn = onSignIn ?? (authContext
    ? async (email: string, password: string) => {
        await authContext.signIn({ email, password });
      }
    : undefined);

  const handleSignUp = onSignUp ?? (authContext
    ? async (email: string, password: string, profile: { name: string }) => {
        await authContext.signUp({
          email,
          password,
          name: profile.name,
          role: defaultRole,
        });
        return { needsConfirmation: false };
      }
    : undefined);

  const handleForgotPassword = onForgotPassword;

  if (!handleSignIn) {
    throw new Error(
      '[@onsite/auth-ui] AuthFlow requires either an AuthProvider ancestor or onSignIn callback.'
    );
  }

  // Loading state from auth context
  if (authContext?.loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-[#0F766E]" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // Already authenticated
  if (authContext?.user) return null;

  const modeSubtitle =
    screen === 'login' ? (subtitle ?? 'Sign in to your account') :
    screen === 'signup' ? 'Create your account' :
    screen === 'forgot-password' ? 'Reset your password' :
    'Check your email';

  return (
    <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 border border-gray-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-[#0F766E] mb-4">
            {icon ?? (
              <span className="text-white text-2xl font-bold">
                {appName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#101828]">OnSite {appName}</h1>
          <p className="text-[#667085] text-sm mt-1">{modeSubtitle}</p>
        </div>

        {/* Forms */}
        {screen === 'login' && (
          <LoginForm
            showForgotPassword={showForgotPassword && !!handleForgotPassword}
            showSignup={showSignup && !!handleSignUp}
            icons={icons}
            onSignIn={handleSignIn}
            onForgotPassword={() => setScreen('forgot-password')}
            onSwitchToSignup={() => setScreen('signup')}
            onSuccess={onSuccess}
          />
        )}

        {screen === 'signup' && handleSignUp && (
          <SignupForm
            icons={icons}
            legal={legal}
            onSignUp={handleSignUp}
            onSwitchToLogin={() => setScreen('login')}
            onEmailSent={() => setScreen('email-sent')}
            onSuccess={onSuccess}
          />
        )}

        {screen === 'forgot-password' && handleForgotPassword && (
          <ForgotForm
            onSubmit={handleForgotPassword}
            onBack={() => setScreen('login')}
          />
        )}

        {screen === 'email-sent' && (
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
              Account created! Check your email to verify, then sign in below.
            </div>
            <LoginForm
              showForgotPassword={false}
              showSignup={false}
              icons={icons}
              onSignIn={handleSignIn}
              onSuccess={onSuccess}
            />
          </div>
        )}

        {/* Footer */}
        {footer && (
          <p className="text-center text-[#9CA3AF] text-xs mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}
