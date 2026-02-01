// src/components/auth/SignupStep.tsx
// Step 2B: Full registration form for new accounts
// Fields match core_profiles table: first_name, last_name, date_of_birth, trade_id, trade_other, gender

import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../../lib/supabase';
import LegalModal from '../LegalModal';

interface Trade {
  id: string;
  name: string;
}

interface SignupFormData {
  firstName: string;
  lastName: string;
  birthday: { month: string; day: string; year: string };
  gender: 'female' | 'male' | 'other' | null;
  password: string;
  tradeId: string; // uuid from ref_trades or 'other'
  tradeOther: string; // text when tradeId is 'other'
  acceptMarketing: boolean;
}

interface SignupStepProps {
  email: string;
  onSignUp: (
    email: string,
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
  ) => Promise<{ error: string | null; needsConfirmation?: boolean; redirectToPassword?: boolean }>;
  onBack: () => void;
  onClose: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);

export default function SignupStep({
  email,
  onSignUp,
  onBack,
  onClose,
  isLoading,
  setIsLoading,
}: SignupStepProps) {
  const [formData, setFormData] = useState<SignupFormData>({
    firstName: '',
    lastName: '',
    birthday: { month: '', day: '', year: '' },
    gender: null,
    password: '',
    tradeId: '',
    tradeOther: '',
    acceptMarketing: false,
  });
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);

  // Fetch trades from ref_trades table
  useEffect(() => {
    const fetchTrades = async () => {
      if (!supabase) {
        setTradesLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('ref_trades')
          .select('id, name')
          .order('name');

        if (error) {
          console.error('[SignupStep] Error fetching trades:', error.message);
        } else if (data) {
          setTrades(data as Trade[]);
        }
      } catch (err) {
        console.error('[SignupStep] Exception fetching trades:', err);
      } finally {
        setTradesLoading(false);
      }
    };

    fetchTrades();
  }, []);

  const openLegalPage = useCallback((type: 'privacy' | 'terms') => {
    const urls = {
      privacy: 'https://onsiteclub.ca/legal/calculator/privacy.html',
      terms: 'https://onsiteclub.ca/legal/calculator/terms.html',
    };

    if (Capacitor.isNativePlatform()) {
      window.open(urls[type], '_system');
    }

    setLegalModal(type);
  }, []);

  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) return 'First name is required';
    if (!formData.lastName.trim()) return 'Last name is required';
    if (!formData.birthday.year || !formData.birthday.month || !formData.birthday.day) {
      return 'Date of birth is required';
    }
    if (!formData.gender) return 'Gender is required';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 6) return 'Password must be at least 6 characters';
    return null;
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      // Build birthday string (YYYY-MM-DD format)
      const monthIndex = MONTHS.indexOf(formData.birthday.month) + 1;
      const dateOfBirth = `${formData.birthday.year}-${String(monthIndex).padStart(2, '0')}-${String(formData.birthday.day).padStart(2, '0')}`;

      // Determine trade_id and trade_other based on selection
      let tradeId: string | null = null;
      let tradeOther: string | null = null;

      if (formData.tradeId === 'other') {
        // User selected "Other" - save text in trade_other
        tradeOther = formData.tradeOther.trim() || null;
      } else if (formData.tradeId) {
        // User selected a trade from the list - save uuid in trade_id
        tradeId = formData.tradeId;
      }

      const result = await onSignUp(email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        dateOfBirth,
        gender: formData.gender!,
        tradeId,
        tradeOther,
        acceptMarketing: formData.acceptMarketing,
      });

      if (result.redirectToPassword) {
        // AuthModal already switched to password step, nothing to do here
        return;
      } else if (result.error) {
        setError(result.error);
      } else if (result.needsConfirmation) {
        setShowConfirmation(true);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error('[SignupStep] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [email, formData, onSignUp, setIsLoading]);

  const updateField = <K extends keyof SignupFormData>(
    field: K,
    value: SignupFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Show confirmation message after signup
  if (showConfirmation) {
    return (
      <div className="auth-step confirmation-step">
        <button className="auth-close-btn" onClick={onClose} type="button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="auth-header">
          <img src="/images/onsite-club-logo.png" alt="OnSite Club" className="auth-logo" />
          <div className="auth-confirmation-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#0F3D3A" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className="auth-title">Check Your Email</h2>
          <p className="auth-subtitle">
            We sent a confirmation link to<br />
            <strong>{email}</strong>
          </p>
          <p className="auth-confirmation-text">
            Click the link in your email to activate your account.
          </p>
        </div>

        <button
          type="button"
          className="auth-btn auth-btn-secondary"
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    );
  }

  return (
    <div className="auth-step signup-step">
      <button className="auth-close-btn" onClick={onClose} type="button">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="auth-header">
        <img src="/images/onsite-club-logo.png" alt="OnSite Club" className="auth-logo" />
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">It's quick and easy</p>
      </div>

      <form className="auth-form signup-form" onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}

        {/* Name row */}
        <div className="auth-row">
          <input
            type="text"
            className="auth-input"
            placeholder="First name *"
            value={formData.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            disabled={isLoading}
            autoComplete="given-name"
            autoFocus
          />
          <input
            type="text"
            className="auth-input"
            placeholder="Last name *"
            value={formData.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            disabled={isLoading}
            autoComplete="family-name"
          />
        </div>

        {/* Birthday - Required */}
        <div className="auth-field-group">
          <label className="auth-label">Date of Birth *</label>
          <div className="auth-row auth-row-birthday">
            <select
              className="auth-select"
              value={formData.birthday.month}
              onChange={(e) => updateField('birthday', { ...formData.birthday, month: e.target.value })}
              disabled={isLoading}
            >
              <option value="">Month</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              className="auth-select"
              value={formData.birthday.day}
              onChange={(e) => updateField('birthday', { ...formData.birthday, day: e.target.value })}
              disabled={isLoading}
            >
              <option value="">Day</option>
              {DAYS.map(d => <option key={d} value={String(d)}>{d}</option>)}
            </select>
            <select
              className="auth-select"
              value={formData.birthday.year}
              onChange={(e) => updateField('birthday', { ...formData.birthday, year: e.target.value })}
              disabled={isLoading}
            >
              <option value="">Year</option>
              {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Gender - Required */}
        <div className="auth-field-group">
          <label className="auth-label">Gender *</label>
          <div className="auth-radio-group">
            <label className="auth-radio">
              <input
                type="radio"
                name="gender"
                checked={formData.gender === 'female'}
                onChange={() => updateField('gender', 'female')}
                disabled={isLoading}
              />
              <span className="auth-radio-label">Female</span>
            </label>
            <label className="auth-radio">
              <input
                type="radio"
                name="gender"
                checked={formData.gender === 'male'}
                onChange={() => updateField('gender', 'male')}
                disabled={isLoading}
              />
              <span className="auth-radio-label">Male</span>
            </label>
            <label className="auth-radio">
              <input
                type="radio"
                name="gender"
                checked={formData.gender === 'other'}
                onChange={() => updateField('gender', 'other')}
                disabled={isLoading}
              />
              <span className="auth-radio-label">Other</span>
            </label>
          </div>
        </div>

        {/* Trade - Optional (dropdown from ref_trades) */}
        <div className="auth-field-group">
          <label className="auth-label">
            Trade/Profession
            <span className="auth-label-optional">(optional)</span>
          </label>
          <select
            className="auth-select"
            value={formData.tradeId}
            onChange={(e) => updateField('tradeId', e.target.value)}
            disabled={isLoading || tradesLoading}
          >
            <option value="">Select your trade...</option>
            {trades.map(trade => (
              <option key={trade.id} value={trade.id}>{trade.name}</option>
            ))}
            <option value="other">Other (specify below)</option>
          </select>

          {/* Show text input when "Other" is selected */}
          {formData.tradeId === 'other' && (
            <input
              type="text"
              className="auth-input"
              placeholder="Enter your trade/profession"
              value={formData.tradeOther}
              onChange={(e) => updateField('tradeOther', e.target.value)}
              disabled={isLoading}
              style={{ marginTop: '8px' }}
            />
          )}
        </div>

        {/* Email (read-only) */}
        <div className="auth-email-display">
          <span className="auth-email-value">{email}</span>
          <button type="button" className="auth-change-link" onClick={onBack}>
            Change
          </button>
        </div>

        {/* Password */}
        <div className="auth-field auth-field-password">
          <input
            type={showPassword ? 'text' : 'password'}
            className="auth-input"
            placeholder="Password *"
            value={formData.password}
            onChange={(e) => updateField('password', e.target.value)}
            disabled={isLoading}
            autoComplete="new-password"
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

        {/* Marketing consent checkbox */}
        <div className="auth-field-group">
          <label className="auth-checkbox">
            <input
              type="checkbox"
              checked={formData.acceptMarketing}
              onChange={(e) => updateField('acceptMarketing', e.target.checked)}
              disabled={isLoading}
            />
            <span className="auth-checkbox-mark" />
            <span className="auth-checkbox-label">Send me tips and updates about OnSite products</span>
          </label>
        </div>

        {/* Terms */}
        <p className="auth-terms">
          By clicking Register, you agree to our{' '}
          <button type="button" className="auth-link" onClick={() => openLegalPage('terms')}>
            Terms
          </button>
          {' and '}
          <button type="button" className="auth-link" onClick={() => openLegalPage('privacy')}>
            Privacy Policy
          </button>
          .
        </p>

        <button
          type="submit"
          className="auth-btn auth-btn-primary auth-btn-register"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="auth-spinner" />
              Creating account...
            </>
          ) : (
            'Register & Login'
          )}
        </button>
      </form>

      {/* Legal Modal */}
      <LegalModal
        isOpen={legalModal !== null}
        onClose={() => setLegalModal(null)}
        type={legalModal || 'privacy'}
      />
    </div>
  );
}
