// src/components/AuthGate.tsx
// Login/Signup modal using shared @onsite/auth-ui components.
// Freemium gating — auth is optional, modal popup when premium feature needed.

import type { SupabaseClient } from '@supabase/supabase-js';
import { AuthModal } from '@onsite/auth-ui/web';
import type { SignupProfile } from '@onsite/auth-ui/web';

interface AuthGateProps {
  supabase: SupabaseClient;
  onClose: () => void;
  onSuccess: () => void;
  message?: string;
}

export default function AuthGate({ supabase, onClose, onSuccess, message }: AuthGateProps) {
  return (
    <AuthModal
      appName="Calculator"
      logo={
        <img
          src="/images/onsite-club-logo.png"
          alt="OnSite Club"
          style={{ height: 48, width: 'auto' }}
        />
      }
      message={message}
      showSignup={true}
      legal={{
        termsUrl: 'https://onsiteclub.ca/legal/calculator/terms.html',
        privacyUrl: 'https://onsiteclub.ca/legal/calculator/privacy.html',
      }}
      onClose={onClose}
      onSignIn={async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
      }}
      onSignUp={async (email, password, profile: SignupProfile) => {
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

        if (data.user?.identities?.length === 0) {
          throw new Error('This email is already registered. Please sign in instead.');
        }

        return { needsConfirmation: !data.session };
      }}
      onSuccess={onSuccess}
    />
  );
}
