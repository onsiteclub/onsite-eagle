/**
 * Login Screen — OnSite Timekeeper
 *
 * Uses shared @onsite/auth-ui with custom callbacks.
 * Timekeeper uses Zustand authStore (not @onsite/auth provider),
 * so we pass explicit onSignIn/onSignUp/onForgotPassword.
 */

import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AuthFlow } from '@onsite/auth-ui';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase, isSupabaseConfigured } from '../../src/lib/supabase';

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuthStore();

  return (
    <AuthFlow
      appName="Timekeeper"
      logo={
        <Image
          source={require('../../assets/onsite-club-logo.png')}
          style={{ height: 56, width: 140 }}
          resizeMode="contain"
        />
      }
      showSignup={true}
      showForgotPassword={true}
      subtitle="Enter your credentials to continue"
      legal={{
        termsUrl: 'https://onsiteclub.ca/legal/timekeeper/terms.html',
        privacyUrl: 'https://onsiteclub.ca/legal/timekeeper/privacy.html',
      }}
      icons={{
        email: <Ionicons name="mail-outline" size={20} color="#9CA3AF" />,
        lock: <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />,
        eyeOpen: <Ionicons name="eye-outline" size={20} color="#9CA3AF" />,
        eyeClosed: <Ionicons name="eye-off-outline" size={20} color="#9CA3AF" />,
      }}
      onSignIn={async (email, password) => {
        const result = await signIn(email, password);
        if (!result.success) {
          throw new Error(result.error || 'Sign in failed');
        }
      }}
      onSignUp={async (email, password, profile) => {
        if (!isSupabaseConfigured() || !supabase) {
          throw new Error('Authentication is not available');
        }

        const metadata: Record<string, string> = {
          first_name: profile.firstName,
          last_name: profile.lastName,
          full_name: `${profile.firstName} ${profile.lastName}`.trim(),
        };
        if (profile.dateOfBirth) metadata.date_of_birth = profile.dateOfBirth;
        if (profile.trade) metadata.trade = profile.trade;
        if (profile.gender) metadata.gender = profile.gender;

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: metadata },
        });

        if (error) throw new Error(error.message);

        // Empty identities means email already exists
        if (data.user?.identities?.length === 0) {
          throw new Error('This email is already registered. Please sign in instead.');
        }

        return { needsConfirmation: !data.session };
      }}
      onForgotPassword={async (email) => {
        if (!isSupabaseConfigured() || !supabase) {
          throw new Error('Authentication is not available');
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw new Error(error.message);
      }}
      onSuccess={() => {
        router.replace('/(tabs)');
      }}
    />
  );
}
