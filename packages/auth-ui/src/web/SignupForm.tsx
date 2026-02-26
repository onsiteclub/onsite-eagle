/**
 * SignupForm — Web registration form.
 */

'use client';

import { useState, type FormEvent } from 'react';

export interface SignupFormProps {
  icons?: { eyeOpen?: React.ReactNode; eyeClosed?: React.ReactNode };
  legal?: { termsUrl: string; privacyUrl: string };
  onSignUp: (
    email: string,
    password: string,
    profile: { name: string }
  ) => Promise<{ needsConfirmation?: boolean }>;
  onSwitchToLogin?: () => void;
  onEmailSent?: () => void;
  onSuccess?: () => void;
}

export function SignupForm({
  icons,
  legal,
  onSignUp,
  onSwitchToLogin,
  onEmailSent,
  onSuccess,
}: SignupFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) { setError('Please enter your name'); return; }
    if (!trimmedEmail || !trimmedEmail.includes('@')) { setError('Please enter a valid email'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    setError(null);

    try {
      const result = await onSignUp(trimmedEmail, password, { name: trimmedName });
      if (result?.needsConfirmation) {
        onEmailSent?.();
      } else {
        onSuccess?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      setError(msg.includes('already registered') ? 'This email is already registered. Please sign in.' : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <input
        type="text"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-[#101828] bg-white"
        placeholder="Full name"
        autoFocus
        autoComplete="name"
        disabled={loading}
      />

      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-[#101828] bg-white"
        placeholder="Email"
        autoComplete="email"
        disabled={loading}
      />

      <div className="relative">
        <input
          type={showPw ? 'text' : 'password'}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-600 focus:border-transparent text-[#101828] bg-white"
          placeholder="Password (min 6 characters)"
          autoComplete="new-password"
          disabled={loading}
        />
        <button
          type="button"
          onClick={() => setShowPw(!showPw)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#101828] text-sm"
        >
          {showPw ? (icons?.eyeClosed ?? 'Hide') : (icons?.eyeOpen ?? 'Show')}
        </button>
      </div>

      {legal && (
        <p className="text-xs text-[#667085] text-center">
          By signing up, you agree to our{' '}
          <a href={legal.termsUrl} className="text-[#0F766E] hover:underline">Terms</a> and{' '}
          <a href={legal.privacyUrl} className="text-[#0F766E] hover:underline">Privacy Policy</a>.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-[#0F766E] hover:bg-[#0d6d66] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? (
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : null}
        {loading ? 'Creating account...' : 'Create Account'}
      </button>

      {onSwitchToLogin && (
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="w-full text-[#0F766E] hover:underline text-sm py-1"
        >
          Already have an account? Sign in
        </button>
      )}
    </form>
  );
}
