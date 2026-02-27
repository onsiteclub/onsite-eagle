/**
 * Login Page — OnSite Eagle Monitor
 *
 * Uses shared @onsite/auth-ui for consistent auth across all apps.
 * No signup — supervisors are pre-registered by admin.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@onsite/supabase/client';
import { AuthProvider, useAuth } from '@onsite/auth';
import { AuthFlow } from '@onsite/auth-ui/web';

export default function LoginPage() {
  const [supabase] = useState(() => createClient());

  return (
    <AuthProvider supabase={supabase}>
      <LoginFlow supabase={supabase} />
    </AuthProvider>
  );
}

function LoginFlow({ supabase }: { supabase: ReturnType<typeof createClient>}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  return (
    <AuthFlow
      appName="Eagle"
      logo={
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/onsite-club-logo.png"
          alt="OnSite Club"
          className="h-14"
        />
      }
      showSignup={false}
      showForgotPassword={true}
      subtitle="Sign in to monitor construction sites"
      user={user}
      authLoading={loading}
      onSignIn={async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
      }}
      onForgotPassword={async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw new Error(error.message);
      }}
      onSuccess={() => {
        router.push('/');
        router.refresh();
      }}
    />
  );
}
