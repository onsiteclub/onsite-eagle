/**
 * Login Screen — OnSite Field
 *
 * Uses shared @onsite/auth-ui components.
 * No signup — workers are pre-registered by supervisors.
 */

import { Ionicons } from '@expo/vector-icons';
import { AuthFlow } from '@onsite/auth-ui';

export default function Login() {
  return (
    <AuthFlow
      appName="Field"
      icon={<Ionicons name="construct" size={32} color="#fff" />}
      showSignup={false}
      showForgotPassword={false}
      subtitle="Sign in with your account to continue"
      footer="Account created by site supervisor"
      icons={{
        email: <Ionicons name="mail-outline" size={20} color="#9CA3AF" />,
        lock: <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />,
        eyeOpen: <Ionicons name="eye-outline" size={20} color="#9CA3AF" />,
        eyeClosed: <Ionicons name="eye-off-outline" size={20} color="#9CA3AF" />,
      }}
    />
  );
}
