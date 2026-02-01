// src/components/auth/AuthModal.tsx
// Main orchestrator component for multi-step authentication flow

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { setConsent } from '../../lib/consent';
import type { User } from '@supabase/supabase-js';
import EmailStep from './EmailStep';
import PasswordStep from './PasswordStep';
import SignupStep from './SignupStep';
import './auth-styles.css';

// Document versions for compliance tracking
const TERMS_VERSION = 'tos_v1.0';
const PRIVACY_VERSION = 'privacy_v1.0';
const APP_VERSION = '1.0.0';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, isNewUser: boolean) => void;
}

type AuthStep = 'email' | 'password' | 'signup';

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
}: AuthModalProps) {
  const [step, setStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('email');
      setEmail('');
      setIsLoading(false);
    }
  }, [isOpen]);

  // Check if email exists in Supabase using RPC function
  // Requires: CREATE FUNCTION public.check_email_exists(email_to_check TEXT) in Supabase
  const checkEmailExists = useCallback(async (emailToCheck: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const { data, error } = await supabase.rpc('check_email_exists', {
        email_to_check: emailToCheck.toLowerCase()
      });

      if (error) {
        console.error('[AuthModal] RPC error:', error.message);
        return false;
      }

      console.log('[AuthModal] Email exists:', data);
      return data === true;
    } catch (err) {
      console.error('[AuthModal] checkEmailExists error:', err);
      return false;
    }
  }, []);

  // Handle email submission - determines next step
  const handleEmailSubmit = useCallback((submittedEmail: string, exists: boolean) => {
    setEmail(submittedEmail);
    setStep(exists ? 'password' : 'signup');
  }, []);

  // Handle sign in (existing user)
  const handleSignIn = useCallback(async (
    emailToUse: string,
    password: string
  ): Promise<{ error: string | null }> => {
    if (!supabase) {
      return { error: 'Authentication is not available.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Incorrect password. Please try again.' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: 'Please confirm your email before signing in.' };
        }
        return { error: error.message };
      }

      if (data.user) {
        onSuccess(data.user, false);
      }

      return { error: null };
    } catch (err) {
      console.error('[AuthModal] signIn error:', err);
      return { error: 'Something went wrong. Please try again.' };
    }
  }, [onSuccess]);

  // Handle forgot password
  const handleForgotPassword = useCallback(async (
    emailToUse: string
  ): Promise<{ error: string | null }> => {
    if (!supabase) {
      return { error: 'Authentication is not available.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('[AuthModal] Reset password error:', error.message);
        return { error: error.message };
      }

      console.log('[AuthModal] Password reset email sent to:', emailToUse);
      return { error: null };
    } catch (err) {
      console.error('[AuthModal] forgotPassword error:', err);
      return { error: 'Something went wrong. Please try again.' };
    }
  }, []);

  // Handle sign up (new user)
  const handleSignUp = useCallback(async (
    emailToUse: string,
    password: string,
    profile: {
      firstName: string;
      lastName: string;
      dateOfBirth: string;
      gender: string;
      tradeId: string | null;
      tradeOther: string | null;
      acceptMarketing: boolean;
    }
  ): Promise<{ error: string | null; needsConfirmation?: boolean; redirectToPassword?: boolean }> => {
    if (!supabase) {
      return { error: 'Authentication is not available.' };
    }

    try {
      // Create the user account
      const { data, error } = await supabase.auth.signUp({
        email: emailToUse,
        password,
        options: {
          data: {
            first_name: profile.firstName,
            last_name: profile.lastName,
          },
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('already registered') ||
            error.message.toLowerCase().includes('already been registered')) {
          // Email exists - redirect to password step
          console.log('[AuthModal] Email already registered, redirecting to password step');
          setStep('password');
          return { error: null, redirectToPassword: true };
        }
        return { error: error.message };
      }

      // Check if user was created but has no identities (means email already exists)
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        console.log('[AuthModal] Email already exists (empty identities), redirecting to password step');
        setStep('password');
        return { error: null, redirectToPassword: true };
      }

      // If user was created, update their profile in core_profiles table
      if (data.user) {
        const { error: profileError } = await supabase
          .from('core_profiles')
          .upsert({
            id: data.user.id,
            first_name: profile.firstName,
            last_name: profile.lastName,
            date_of_birth: profile.dateOfBirth,
            gender: profile.gender,
            trade_id: profile.tradeId,
            trade_other: profile.tradeOther,
            updated_at: new Date().toISOString(),
          });

        if (profileError) {
          console.error('[AuthModal] Profile update error:', profileError);
          // Don't fail the signup for profile errors
        }

        // Record Terms of Service acceptance (required for App Store compliance)
        const tosResult = await setConsent(data.user.id, 'terms_of_service', true, {
          documentVersion: TERMS_VERSION,
          appVersion: APP_VERSION,
          userAgent: navigator.userAgent,
        });
        if (!tosResult) {
          console.warn('[AuthModal] Failed to save terms_of_service consent');
        }

        // Record Privacy Policy acceptance (required for App Store compliance)
        const privacyResult = await setConsent(data.user.id, 'privacy_policy', true, {
          documentVersion: PRIVACY_VERSION,
          appVersion: APP_VERSION,
          userAgent: navigator.userAgent,
        });
        if (!privacyResult) {
          console.warn('[AuthModal] Failed to save privacy_policy consent');
        }

        // Record Marketing consent (user choice - can be true or false)
        const marketingResult = await setConsent(data.user.id, 'marketing', profile.acceptMarketing, {
          appVersion: APP_VERSION,
          userAgent: navigator.userAgent,
        });
        if (!marketingResult) {
          console.warn('[AuthModal] Failed to save marketing consent');
        }

        console.log('[AuthModal] Consents recorded - ToS:', tosResult, 'Privacy:', privacyResult, 'Marketing:', profile.acceptMarketing);

        // If we have a session, user is logged in
        if (data.session) {
          console.log('[AuthModal] User has session, logging in');
          onSuccess(data.user, true);
          return { error: null, needsConfirmation: false };
        }

        // No session - try to sign in with the credentials we just used
        // This handles the case where a pending user was created during email check
        console.log('[AuthModal] No session after signup, attempting auto-login');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });

        if (signInError) {
          // If sign-in fails, email confirmation might be required
          console.log('[AuthModal] Auto-login failed:', signInError.message);
          if (signInError.message.toLowerCase().includes('email not confirmed')) {
            return { error: null, needsConfirmation: true };
          }
          // For other errors, still show confirmation screen
          return { error: null, needsConfirmation: true };
        }

        if (signInData.user && signInData.session) {
          console.log('[AuthModal] Auto-login successful');
          onSuccess(signInData.user, true);
          return { error: null, needsConfirmation: false };
        }

        // Fallback: show confirmation screen
        return { error: null, needsConfirmation: true };
      }

      return { error: null, needsConfirmation: true };
    } catch (err) {
      console.error('[AuthModal] signUp error:', err);
      return { error: 'Something went wrong. Please try again.' };
    }
  }, [onSuccess]);

  // Handle going back to email step
  const handleBack = useCallback(() => {
    setStep('email');
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={handleClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        {step === 'email' && (
          <EmailStep
            onEmailSubmit={handleEmailSubmit}
            onClose={handleClose}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            checkEmailExists={checkEmailExists}
          />
        )}

        {step === 'password' && (
          <PasswordStep
            email={email}
            onSignIn={handleSignIn}
            onForgotPassword={handleForgotPassword}
            onBack={handleBack}
            onClose={handleClose}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {step === 'signup' && (
          <SignupStep
            email={email}
            onSignUp={handleSignUp}
            onBack={handleBack}
            onClose={handleClose}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}
      </div>
    </div>
  );
}
