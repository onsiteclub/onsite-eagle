/**
 * AuthFlow — Full auth orchestrator for React Native.
 *
 * Manages navigation between login, signup, forgot password screens.
 * Auto-wires to @onsite/auth's useAuth() if inside AuthProvider,
 * otherwise uses explicitly provided callbacks.
 *
 * Usage:
 *   // Smart (inside AuthProvider):
 *   <AuthFlow appName="Field" />
 *
 *   // With explicit callbacks:
 *   <AuthFlow appName="Timekeeper" onSignIn={mySignIn} onSignUp={mySignUp} />
 */

import { useState, useMemo } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LoginScreen } from './LoginScreen';
import { SignupScreen } from './SignupScreen';
import { ForgotScreen } from './ForgotScreen';
import { authStyles as s } from './shared/styles';
import type { AuthFlowProps, AuthScreenMode } from '../types';

// Try to import useAuth — will fail gracefully if not in provider
let useAuthHook: (() => {
  signIn: (c: { email: string; password: string }) => Promise<void>;
  signUp: (c: { email: string; password: string; name: string; role: string }) => Promise<void>;
}) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const authModule = require('@onsite/auth');
  useAuthHook = authModule.useAuth;
} catch {
  // @onsite/auth not available or not in provider — that's fine
}

export function AuthFlow({
  appName,
  icon,
  subtitle,
  footer,
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

  // Try to get auth context for smart auto-wiring
  const authContext = useMemo(() => {
    if (!useAuthHook) return null;
    try {
      return useAuthHook();
    } catch {
      return null;
    }
  }, []);

  // Resolve handlers: explicit > context > undefined
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

  // Forgot password uses Supabase directly — callers should provide this
  const handleForgotPassword = onForgotPassword;

  if (!handleSignIn) {
    throw new Error(
      '[@onsite/auth-ui] AuthFlow requires either an AuthProvider ancestor or onSignIn callback.'
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {screen === 'login' && (
          <LoginScreen
            appName={appName}
            icon={icon}
            subtitle={subtitle}
            footer={footer}
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
          <SignupScreen
            appName={appName}
            icon={icon}
            icons={icons}
            legal={legal}
            onSignUp={handleSignUp}
            onSwitchToLogin={() => setScreen('login')}
            onEmailSent={() => setScreen('email-sent')}
            onSuccess={onSuccess}
          />
        )}

        {screen === 'forgot-password' && handleForgotPassword && (
          <ForgotScreen
            appName={appName}
            icon={icon}
            icons={icons}
            onSubmit={handleForgotPassword}
            onBack={() => setScreen('login')}
          />
        )}

        {screen === 'email-sent' && (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <LoginScreen
              appName={appName}
              icon={icon}
              subtitle="Check your email to verify your account, then sign in below."
              footer={footer}
              showForgotPassword={false}
              showSignup={false}
              icons={icons}
              onSignIn={handleSignIn}
              onSuccess={onSuccess}
            />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
