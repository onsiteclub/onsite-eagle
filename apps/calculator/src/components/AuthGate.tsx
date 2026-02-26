// src/components/AuthGate.tsx
// Login/Signup modal for freemium gating
// Uses @onsite/auth for authentication against Eagle Supabase

import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

interface AuthGateProps {
  supabase: SupabaseClient;
  onClose: () => void;
  onSuccess: () => void;
  message?: string;
}

type AuthMode = 'sign-in' | 'sign-up';

export default function AuthGate({ supabase, onClose, onSuccess, message }: AuthGateProps) {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'sign-in') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;

        // Create profile in core_profiles
        if (data.user) {
          await supabase.from('core_profiles').insert({
            id: data.user.id,
            email,
            full_name: name || email.split('@')[0],
          });
        }
      }

      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>&times;</button>

        <div className="auth-logo">
          <img
            src="/images/onsite-club-logo.png"
            alt="OnSite Club"
            style={{ height: 48, width: 'auto' }}
          />
        </div>

        <h2 className="auth-title">
          {mode === 'sign-in' ? 'Sign In' : 'Create Account'}
        </h2>

        {message && (
          <p className="auth-subtitle">{message}</p>
        )}

        {error && (
          <div className="auth-error">{error}</div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'sign-up' && (
            <input
              className="auth-input"
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          )}

          <input
            className="auth-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <div className="auth-password-wrapper">
            <input
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>

          <button
            type="submit"
            className="auth-btn auth-btn-primary"
            disabled={loading || !email || !password}
          >
            {loading && <span className="auth-spinner" />}
            {loading
              ? 'Please wait...'
              : mode === 'sign-in'
                ? 'Sign In'
                : 'Create Account'
            }
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button
            className="auth-link"
            onClick={() => {
              setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
              setError(null);
            }}
          >
            {mode === 'sign-in'
              ? "Don't have an account? Sign Up"
              : 'Already have an account? Sign In'
            }
          </button>
        </div>

        {mode === 'sign-up' && (
          <p className="auth-terms">
            By creating an account you agree to the{' '}
            <a href="https://onsiteclub.ca/legal/calculator/terms.html" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="https://onsiteclub.ca/legal/calculator/privacy.html" target="_blank" rel="noopener noreferrer">
              Privacy Policy
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
