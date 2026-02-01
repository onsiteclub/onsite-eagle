// src/components/auth/ResetPasswordModal.tsx
// Modal para definir nova senha após clicar no link de reset

import { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import './auth-styles.css';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ResetPasswordModal({ isOpen, onClose, onSuccess }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validações
    if (!password) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!supabase) {
      setError('Service unavailable');
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(true);

      // Limpar URL e fechar após 2 segundos
      setTimeout(() => {
        // Remove hash/query params da URL
        window.history.replaceState({}, document.title, window.location.pathname.replace('/reset-password', '/'));
        onSuccess();
      }, 2000);

    } catch (err) {
      console.error('[ResetPassword] Error:', err);
      setError('Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [password, confirmPassword, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose} type="button">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="auth-header">
          <div className="auth-logo">
            <img src="/images/logo-onsite-club-02.png" alt="OnSite Club" />
          </div>
          <h2 className="auth-title">Set New Password</h2>
          <p className="auth-subtitle">Enter your new password below</p>
        </div>

        {success ? (
          <div className="auth-success-message">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p>Password updated successfully!</p>
            <p className="auth-subtitle">Redirecting...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {error && (
              <div className="auth-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="new-password">New Password</label>
              <div className="auth-input-wrapper">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  className="auth-toggle-password"
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
            </div>

            <div className="auth-field">
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading || !password || !confirmPassword}
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
