// src/components/auth/EmailStep.tsx
// Step 1: Email input - checks if account exists on button click

import { useState, useCallback } from 'react';

interface EmailStepProps {
  onEmailSubmit: (email: string, exists: boolean) => void;
  onClose: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  checkEmailExists: (email: string) => Promise<boolean>;
}

export default function EmailStep({
  onEmailSubmit,
  onClose,
  isLoading,
  setIsLoading,
  checkEmailExists,
}: EmailStepProps) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const validateEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError('Please enter your email');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    // Show loading spinner while checking
    setIsLoading(true);

    try {
      // Check if email exists in Supabase
      const exists = await checkEmailExists(trimmedEmail);
      // Navigate to appropriate step
      onEmailSubmit(trimmedEmail, exists);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('[EmailStep] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [email, checkEmailExists, onEmailSubmit, setIsLoading]);

  return (
    <div className="auth-step email-step">
      <button className="auth-close-btn" onClick={onClose} type="button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="auth-header">
        <img src="/images/onsite-club-logo.png" alt="OnSite Club" className="auth-logo" />
        <h2 className="auth-title">Welcome</h2>
        <p className="auth-subtitle">Enter your email to continue</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}

        <div className="auth-field">
          <input
            type="email"
            className="auth-input"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete="email"
            autoFocus
          />
        </div>

        <button
          type="submit"
          className="auth-btn auth-btn-primary"
          disabled={isLoading || !email.trim()}
        >
          {isLoading ? (
            <>
              <span className="auth-spinner" />
              Verifying...
            </>
          ) : (
            'Continue'
          )}
        </button>
      </form>
    </div>
  );
}
