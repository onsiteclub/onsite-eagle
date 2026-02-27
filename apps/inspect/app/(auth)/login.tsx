/**
 * Login Screen — OnSite Inspect
 *
 * Uses shared @onsite/auth-ui components.
 * No signup — inspectors are pre-registered by supervisors.
 */

import { Image } from 'react-native';
import { AuthFlow } from '@onsite/auth-ui';

export default function Login() {
  return (
    <AuthFlow
      appName="Inspect"
      logo={
        <Image
          source={require('../../assets/onsite-club-logo.png')}
          style={{ height: 56, width: 140 }}
          resizeMode="contain"
        />
      }
      showSignup={false}
      showForgotPassword={false}
      subtitle="Sign in to manage inspections"
      footer="Account created by site supervisor"
    />
  );
}
