// src/components/HamburgerMenu.tsx
// Menu hamburger com drawer lateral

import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { AuthModal } from './auth';
import LegalModal from './LegalModal';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

const APP_VERSION = '1.0.0';

// External URLs for legal pages
const LEGAL_URLS = {
  privacy: 'https://onsiteclub.ca/legal/calculator/privacy.html',
  terms: 'https://onsiteclub.ca/legal/calculator/terms.html',
};

interface HamburgerMenuProps {
  user: User | null;
  userName?: string;
  onAuthSuccess: (user: User, isNewUser: boolean) => void;
  onSignOut: () => void;
}

export default function HamburgerMenu({ user, userName, onAuthSuccess, onSignOut }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [legalChoice, setLegalChoice] = useState<'privacy' | 'terms' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openUrl = useCallback((url: string) => {
    window.open(url, Capacitor.isNativePlatform() ? '_system' : '_blank');
  }, []);

  // Show choice popup for legal pages
  const openLegalChoice = useCallback((type: 'privacy' | 'terms') => {
    setLegalChoice(type);
    setIsOpen(false);
  }, []);

  // Open in web browser
  const openLegalInWeb = useCallback(() => {
    if (legalChoice) {
      const url = LEGAL_URLS[legalChoice];
      window.open(url, Capacitor.isNativePlatform() ? '_system' : '_blank');
      setLegalChoice(null);
    }
  }, [legalChoice]);

  // Open in app modal
  const openLegalInApp = useCallback(() => {
    if (legalChoice) {
      setLegalModal(legalChoice);
      setLegalChoice(null);
    }
  }, [legalChoice]);

  const handleAuthSuccess = useCallback((authUser: User, isNewUser: boolean) => {
    setShowAuthModal(false);
    setIsOpen(false);
    onAuthSuccess(authUser, isNewUser);
  }, [onAuthSuccess]);

  const handleSignOut = useCallback(() => {
    setIsOpen(false);
    onSignOut();
  }, [onSignOut]);

  const handlePrivacyPolicy = useCallback(() => {
    openLegalChoice('privacy');
  }, [openLegalChoice]);

  const handleTermsOfService = useCallback(() => {
    openLegalChoice('terms');
  }, [openLegalChoice]);

  const handleSupport = useCallback(() => {
    openUrl('https://onsiteclub.ca/support');
    setIsOpen(false);
  }, [openUrl]);

  const handleRateApp = useCallback(() => {
    // TODO: Replace with actual store URLs when published
    const isAndroid = Capacitor.getPlatform() === 'android';
    const storeUrl = isAndroid
      ? 'https://play.google.com/store/apps/details?id=ca.onsiteclub.calculator'
      : 'https://apps.apple.com/app/onsite-calculator/id000000000';
    openUrl(storeUrl);
    setIsOpen(false);
  }, [openUrl]);

  const handleDeleteAccount = useCallback(async () => {
    if (!supabase || !user) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // 1. Delete user's calculation history
      await supabase
        .from('app_calculator_calculations')
        .delete()
        .eq('user_id', user.id);

      // 2. Delete user's consents
      await supabase
        .from('core_consents')
        .delete()
        .eq('user_id', user.id);

      // 3. Delete user's voice logs
      await supabase
        .from('voice_logs')
        .delete()
        .eq('user_id', user.id);

      // 4. Delete user's profile
      await supabase
        .from('core_profiles')
        .delete()
        .eq('id', user.id);

      // 5. Delete auth user (this signs out automatically)
      // Note: This requires the user to be authenticated
      // For complete deletion, we use Supabase's delete user function
      const { error } = await supabase.rpc('delete_user');

      if (error) {
        // If RPC doesn't exist, just sign out (admin will need to delete auth user)
        console.warn('[DeleteAccount] RPC not available, signing out only:', error.message);
      }

      // 6. Sign out and close
      setShowDeleteConfirm(false);
      setIsOpen(false);
      onSignOut();

    } catch (err) {
      console.error('[DeleteAccount] Error:', err);
      setDeleteError('Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
    }
  }, [user, onSignOut]);

  return (
    <>
      {/* Hamburger Button */}
      <button
        className="hamburger-btn"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="menu-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div className={`menu-drawer ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="menu-header">
          <img
            src="/images/logo-onsite-club-02.png"
            alt="OnSite Club"
            className="menu-logo"
          />
          <button
            className="menu-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* User Info */}
        {userName && (
          <div className="menu-user">
            <div className="menu-user-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="menu-user-name">{userName}</span>
          </div>
        )}

        {/* Menu Items */}
        <nav className="menu-nav">
          {/* Auth Button */}
          {!user ? (
            <button className="menu-item menu-item-primary" onClick={() => setShowAuthModal(true)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              <span>Sign In / Create Account</span>
            </button>
          ) : (
            <>
              <button className="menu-item menu-item-signout" onClick={handleSignOut}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Sign Out</span>
              </button>
              <button className="menu-item menu-item-danger" onClick={() => setShowDeleteConfirm(true)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                <span>Delete Account</span>
              </button>
            </>
          )}

          <div className="menu-divider" />

          <button className="menu-item" onClick={handleSupport}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>Help & Support</span>
          </button>

          <button className="menu-item" onClick={handleRateApp}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Rate This App</span>
          </button>

          <div className="menu-divider" />

          <button className="menu-item" onClick={handlePrivacyPolicy}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Privacy Policy</span>
          </button>

          <button className="menu-item" onClick={handleTermsOfService}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Terms of Service</span>
          </button>
        </nav>

        {/* Footer */}
        <div className="menu-footer">
          <span className="menu-version">Version {APP_VERSION}</span>
          <span className="menu-copyright">OnSite Club Inc.</span>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Legal Modal (Privacy Policy / Terms of Service) */}
      <LegalModal
        isOpen={legalModal !== null}
        onClose={() => setLegalModal(null)}
        type={legalModal || 'privacy'}
      />

      {/* Legal Choice Modal */}
      {legalChoice && (
        <div className="legal-choice-overlay" onClick={() => setLegalChoice(null)}>
          <div className="legal-choice-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="legal-choice-title">
              {legalChoice === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
            </h3>
            <p className="legal-choice-text">Where would you like to view this?</p>
            <div className="legal-choice-buttons">
              <button className="legal-choice-btn legal-choice-btn-app" onClick={openLegalInApp}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <span>View in App</span>
              </button>
              <button className="legal-choice-btn legal-choice-btn-web" onClick={openLegalInWeb}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span>Open in Browser</span>
              </button>
            </div>
            <button className="legal-choice-cancel" onClick={() => setLegalChoice(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="delete-modal-overlay" onClick={() => !isDeleting && setShowDeleteConfirm(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="delete-modal-title">Delete Account?</h3>
            <p className="delete-modal-text">
              This will permanently delete your account and all associated data including:
            </p>
            <ul className="delete-modal-list">
              <li>Your profile information</li>
              <li>Calculation history</li>
              <li>Voice logs</li>
              <li>All preferences and settings</li>
            </ul>
            <p className="delete-modal-warning">
              This action cannot be undone.
            </p>

            {deleteError && (
              <div className="delete-modal-error">{deleteError}</div>
            )}

            <div className="delete-modal-actions">
              <button
                className="delete-modal-btn delete-modal-btn-cancel"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="delete-modal-btn delete-modal-btn-delete"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete My Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
