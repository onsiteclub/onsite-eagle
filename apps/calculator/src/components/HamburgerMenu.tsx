// src/components/HamburgerMenu.tsx
// Menu hamburger com drawer lateral

import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import LegalModal from './LegalModal';

const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';

// External URLs for legal pages
const LEGAL_URLS = {
  privacy: 'https://onsiteclub.ca/legal/calculator/privacy.html',
  terms: 'https://onsiteclub.ca/legal/calculator/terms.html',
};

export default function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<'privacy' | 'terms' | null>(null);
  const [legalChoice, setLegalChoice] = useState<'privacy' | 'terms' | null>(null);

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

  const handlePrivacyPolicy = useCallback(() => {
    openLegalChoice('privacy');
  }, [openLegalChoice]);

  const handleTermsOfService = useCallback(() => {
    openLegalChoice('terms');
  }, [openLegalChoice]);

  const handleSupport = useCallback(() => {
    openUrl('https://www.onsiteclub.ca/#contact');
    setIsOpen(false);
  }, [openUrl]);

  const handleRateApp = useCallback(() => {
    const isAndroid = Capacitor.getPlatform() === 'android';
    const storeUrl = isAndroid
      ? 'https://play.google.com/store/apps/details?id=ca.onsiteclub.calculator'
      : 'https://apps.apple.com/app/onsite-calculator/id000000000';
    openUrl(storeUrl);
    setIsOpen(false);
  }, [openUrl]);


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

        {/* Menu Items */}
        <nav className="menu-nav">
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
    </>
  );
}
