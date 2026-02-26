/**
 * Login Screen — OnSite Inspect
 *
 * Uses shared @onsite/auth-ui components.
 * No signup — inspectors are pre-registered by supervisors.
 */

import { AuthFlow } from '@onsite/auth-ui';

export default function Login() {
  return (
    <AuthFlow
      appName="Inspect"
      showSignup={false}
      showForgotPassword={false}
      subtitle="Sign in to manage inspections"
      footer="Account created by site supervisor"
    />
  );
}
