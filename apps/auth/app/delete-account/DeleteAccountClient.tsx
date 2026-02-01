'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@onsite/supabase/client';
import type { User } from '@supabase/supabase-js';

type Status = 'loading' | 'not-logged-in' | 'ready' | 'confirming' | 'deleting' | 'success' | 'error';

export function DeleteAccountClient() {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        setStatus('ready');
      } else {
        setStatus('not-logged-in');
      }
    };

    checkAuth();
  }, []);

  const handleRequestDelete = () => {
    setStatus('confirming');
    setConfirmText('');
    setError('');
  };

  const handleCancelDelete = () => {
    setStatus('ready');
    setConfirmText('');
    setError('');
  };

  const handleConfirmDelete = async () => {
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm.');
      return;
    }

    setStatus('deleting');
    setError('');

    try {
      // Call admin API to delete user
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user?.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      // Sign out locally
      await supabase.auth.signOut();

      setStatus('success');
    } catch (err) {
      console.error('Error deleting account:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete account. Please try again.');
      setStatus('confirming');
    }
  };

  return (
    <div className="min-h-screen bg-onsite-bg flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 bg-onsite-dark rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-onsite-accent" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div>
          <span className="font-bold text-onsite-text">OnSite</span>
          <span className="text-onsite-accent text-xs block">CLUB</span>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full">
        {/* Loading State */}
        {status === 'loading' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-onsite-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Loading...</p>
          </div>
        )}

        {/* Not Logged In State */}
        {status === 'not-logged-in' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Login Required</h1>
            <p className="text-gray-500 mb-6">
              You need to be logged in to delete your account.
            </p>
            <p className="text-sm text-gray-400">
              Please log in through the app first, then return to this page.
            </p>
          </div>
        )}

        {/* Ready State - Initial */}
        {status === 'ready' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Delete Account
            </h1>
            <p className="text-gray-500 mb-2">
              Logged in as: <span className="font-medium">{user?.email}</span>
            </p>

            <div className="bg-red-50 rounded-xl p-4 my-6 text-left">
              <p className="text-red-800 text-sm font-medium mb-2">Warning: This action is permanent!</p>
              <ul className="text-red-700 text-sm space-y-1">
                <li>• Your account will be permanently deleted</li>
                <li>• All your data will be removed</li>
                <li>• Active subscriptions will be canceled</li>
                <li>• This cannot be undone</li>
              </ul>
            </div>

            <button
              onClick={handleRequestDelete}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              I want to delete my account
            </button>
          </div>
        )}

        {/* Confirming State */}
        {status === 'confirming' && (
          <div>
            <h1 className="text-xl font-bold text-gray-900 text-center mb-2">
              Confirm Deletion
            </h1>
            <p className="text-gray-500 text-center mb-6">
              Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
            </p>

            <div className="space-y-4">
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Type DELETE"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-center font-mono text-lg"
                autoFocus
              />

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleConfirmDelete}
                disabled={confirmText !== 'DELETE'}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors"
              >
                Permanently Delete My Account
              </button>

              <button
                onClick={handleCancelDelete}
                className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 py-3 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Deleting State */}
        {status === 'deleting' && (
          <div className="text-center py-8">
            <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-500">Deleting your account...</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Account Deleted
            </h1>
            <p className="text-gray-500 mb-6">
              Your account has been permanently deleted.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-gray-600 text-sm">
                Thank you for using OnSite Club. If you ever want to come back, you can create a new account anytime.
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-400">
                  You can close this window
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
              onClick={() => setStatus('ready')}
              className="w-full bg-onsite-accent hover:bg-onsite-accent/90 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-gray-400 text-sm mt-8">
        © 2026 OnSite Club. All rights reserved.
      </p>
    </div>
  );
}
