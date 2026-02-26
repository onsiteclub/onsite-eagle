/**
 * SignupScreen — Name + email + password registration.
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { AuthHeader } from './shared/AuthHeader';
import { AuthInput } from './shared/AuthInput';
import { PasswordInput } from './shared/PasswordInput';
import { AuthButton } from './shared/AuthButton';
import { ErrorBanner } from './shared/ErrorBanner';
import { authStyles as s } from './shared/styles';

export interface SignupScreenProps {
  appName: string;
  icon?: React.ReactNode;
  icons?: {
    email?: React.ReactNode;
    lock?: React.ReactNode;
    eyeOpen?: React.ReactNode;
    eyeClosed?: React.ReactNode;
  };
  legal?: { termsUrl: string; privacyUrl: string };
  onSignUp: (
    email: string,
    password: string,
    profile: { name: string; firstName?: string; lastName?: string }
  ) => Promise<{ needsConfirmation?: boolean }>;
  onSwitchToLogin?: () => void;
  onEmailSent?: () => void;
  onSuccess?: () => void;
}

export function SignupScreen({
  appName,
  icon,
  icons,
  legal,
  onSignUp,
  onSwitchToLogin,
  onEmailSent,
  onSuccess,
}: SignupScreenProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup() {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await onSignUp(trimmedEmail, password, { name: trimmedName });
      if (result?.needsConfirmation) {
        onEmailSent?.();
      } else {
        onSuccess?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('This email is already registered. Please sign in.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AuthHeader appName={appName} icon={icon} subtitle="Create your account" />

      <View style={s.form}>
        <ErrorBanner message={error} />

        <AuthInput
          label="Full name"
          placeholder="John Doe"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete="name"
          editable={!loading}
        />

        <AuthInput
          label="Email"
          icon={icons?.email}
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          editable={!loading}
        />

        <PasswordInput
          label="Password (min 6 characters)"
          icon={icons?.lock}
          eyeOpen={icons?.eyeOpen}
          eyeClosed={icons?.eyeClosed}
          placeholder="Create a password"
          value={password}
          onChangeText={setPassword}
          autoComplete="new-password"
          editable={!loading}
          onSubmitEditing={handleSignup}
          returnKeyType="go"
        />

        {legal ? (
          <Text style={s.legalText}>
            By signing up, you agree to our{' '}
            <Text style={s.legalLink} onPress={() => Linking.openURL(legal.termsUrl)}>
              Terms
            </Text>{' '}
            and{' '}
            <Text style={s.legalLink} onPress={() => Linking.openURL(legal.privacyUrl)}>
              Privacy Policy
            </Text>.
          </Text>
        ) : null}

        <AuthButton title="Create Account" onPress={handleSignup} loading={loading} />

        {onSwitchToLogin ? (
          <TouchableOpacity onPress={onSwitchToLogin} disabled={loading} style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={s.link}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </>
  );
}
