// src/components/LegalModal.tsx
// Modal component to display Privacy Policy and Terms of Service locally
// Used as fallback when external URLs are unavailable

import { useEffect } from 'react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms';
}

const PRIVACY_POLICY = `
# Privacy Policy

**Last Updated: January 2025**

**OnSite Club Inc.** ("we", "us", or "our") operates the OnSite Calculator mobile application (the "App"). This Privacy Policy explains how we collect, use, disclose, and protect your information.

---

## 1. Information We Collect

### Information You Provide
- Email address, name, password (encrypted)
- Birthday, gender, trade/specialty (optional)

### Voice Data
- Audio is processed in real-time to convert speech to text
- Audio is NOT stored on our servers after processing
- Transcribed text may be logged if you consent

### Usage Data
- Calculations performed
- App usage patterns
- Device information
- Error logs

---

## 2. How We Use Your Information

- Provide the App's functionality
- Process voice commands
- Save your calculation history
- Improve our services
- Send communications (only if you opt-in)

---

## 3. Information Sharing

We share data with:
- **Supabase** - Authentication & database
- **OpenAI** - Voice transcription (not retained)
- **Vercel** - App hosting

We do NOT sell your personal information.

---

## 4. Your Rights

- **Access** your data
- **Correct** your information
- **Delete** your account
- **Withdraw** consent anytime
- **Export** your data

---

## 5. Data Security

- Encryption in transit (HTTPS/TLS)
- Encryption at rest
- Row-level security
- Secure authentication

---

## 6. Contact Us

**Email:** privacy@onsiteclub.ca

---

For the full Privacy Policy, visit: https://onsiteclub.ca/legal/calculator/privacy.html
`;

const TERMS_OF_SERVICE = `
# Terms of Service

**Last Updated: January 2025**

Welcome to OnSite Calculator. By using this App, you agree to these Terms.

---

## 1. Description of Service

OnSite Calculator provides:
- Construction calculations (feet, inches, fractions)
- Unit conversions
- Voice input for hands-free operation
- Triangle calculations
- Calculation history (for registered users)

---

## 2. User Accounts

- Account creation is optional
- You are responsible for your account security
- You may delete your account at any time

---

## 3. Acceptable Use

You agree NOT to:
- Use the App for illegal purposes
- Attempt to hack or reverse engineer the App
- Interfere with the App's operation

---

## 4. Voice Feature

- Voice recognition is provided "as is"
- We do not guarantee 100% accuracy
- Always verify calculations for critical work

---

## 5. Disclaimer

THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES.

**IMPORTANT:** This App is a tool to assist with calculations. For critical construction work, always verify measurements with professional tools.

---

## 6. Limitation of Liability

We are NOT liable for:
- Errors in calculations
- Reliance on the App for critical measurements
- Loss of data
- Indirect or consequential damages

---

## 7. Changes to Terms

We may update these Terms. Continued use constitutes acceptance.

---

## 8. Governing Law

These Terms are governed by the laws of Ontario, Canada.

---

## 9. Contact Us

**Email:** legal@onsiteclub.ca

---

For the full Terms of Service, visit: https://onsiteclub.ca/legal/calculator/terms.html
`;

export default function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  const content = type === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE;
  const title = type === 'privacy' ? 'Privacy Policy' : 'Terms of Service';

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal-header">
          <h2 className="legal-modal-title">{title}</h2>
          <button className="legal-modal-close" onClick={onClose} type="button">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="legal-modal-content">
          <pre className="legal-modal-text">{content}</pre>
        </div>
        <div className="legal-modal-footer">
          <button className="legal-modal-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
