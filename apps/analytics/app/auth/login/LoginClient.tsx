/**
 * Login Page — OnSite Analytics
 *
 * Uses shared @onsite/auth-ui for consistent auth.
 * Admin-gated: after login, checks admin_users for approval.
 * No signup — admin access is by invitation only.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@onsite/supabase/client';
import { AuthProvider } from '@onsite/auth';
import { AuthFlow } from '@onsite/auth-ui/web';

export default function LoginClient() {
  const [supabase] = useState(() => createClient());

  return (
    <AuthProvider supabase={supabase}>
      <LoginFlow supabase={supabase} />
    </AuthProvider>
  );
}

function LoginFlow({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const router = useRouter();

  return (
    <AuthFlow
      appName="Analytics"
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
      subtitle="Admin access — sign in to continue"
      footer="Access restricted to approved administrators"
      onSignIn={async (email, password) => {
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw new Error(authError.message);

        // Check if user is approved admin
        const { data: adminUser } = await supabase
          .from('core_admin_users')
          .select('approved')
          .eq('user_id', data.user?.id)
          .single();

        if (!adminUser) {
          // Create pending admin request
          await supabase.from('core_admin_users').insert({
            user_id: data.user?.id,
            role: 'viewer',
            approved: false,
          });
          router.push('/auth/pending');
          return;
        }

        if (!adminUser.approved) {
          router.push('/auth/pending');
          return;
        }
      }}
      onForgotPassword={async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw new Error(error.message);
      }}
      onSuccess={() => {
        router.push('/dashboard/overview');
      }}
    />
  );
}
