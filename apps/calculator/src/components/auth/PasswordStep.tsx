// src/components/auth/PasswordStep.tsx
// Step 2A: Password input for existing accounts (Login)

import { useState, useCallback } from 'react';

interface PasswordStepProps {
  email: string;
  onSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
  onForgotPassword: (email: string) => Promise<{ error: string | null }>;
  onBack: () => void;
  onClose: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function PasswordStep({
  email,
  onSignIn,
  onForgotPassword,
  onBack,
  onClose,
  isLoading,
  setIsLoading,
}: PasswordStepProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await onSignIn(email, password);
      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('[PasswordStep] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, onSignIn, setIsLoading]);

  const handleForgotPassword = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await onForgotPassword(email);
      if (result.error) {
        setError(result.error);
      } else {
        setResetSent(true);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('[PasswordStep] Forgot password error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [email, onForgotPassword, setIsLoading]);

  return (
    <div className="auth-step password-step">
      <button className="auth-close-btn" onClick={onClose} type="button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="auth-header">
        <img src="/images/onsite-club-logo.png" alt="OnSite Club" className="auth-logo" />
        <h2 className="auth-title">Welcome Back</h2>
        <p className="auth-subtitle">Enter your password to sign in</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}

        {/* Email display (read-only) */}
        <div className="auth-email-display">
          <span className="auth-email-value">{email}</span>
          <button type="button" className="auth-change-link" onClick={onBack}>
            Change
          </button>
        </div>

        {/* Password input */}
        <div className="auth-field auth-field-password">
          <input
            type={showPassword ? 'text' : 'password'}
            className="auth-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
            autoFocus
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>

        <button
          type="submit"
          className="auth-btn auth-btn-primary"
          disabled={isLoading || !password}
        >
          {isLoading ? (
            <>
              <span className="auth-spinner" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>

        {/* Forgot password link */}
        <div className="auth-footer-links">
          {resetSent ? (
            <p className="auth-reset-sent">
              ✓ Password reset email sent to <strong>{email}</strong>
            </p>
          ) : (
            <button
              type="button"
              className="auth-link"
              onClick={handleForgotPassword}
              disabled={isLoading}
            >
              Forgot password?
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
