// src/components/VoiceConsentModal.tsx
// Modal de consentimento para uso do microfone (App Store compliance)
// Mostra no primeiro uso do microfone - ANTES de acessar o microfone

import { useState } from 'react';
import { setLocalConsent, syncConsentToServer, type ConsentType } from '../lib/consent';
import { logger } from '../lib/logger';

interface VoiceConsentModalProps {
  onConsent: (microphoneGranted: boolean, voiceTrainingGranted: boolean) => void;
}

export default function VoiceConsentModal({ onConsent }: VoiceConsentModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const saveConsent = (type: ConsentType, granted: boolean) => {
    setLocalConsent(type, granted);
    syncConsentToServer(type, granted);
  };

  const handleAccept = async () => {
    setIsLoading(true);

    try {
      // Save microphone usage consent (required)
      saveConsent('microphone_usage', true);
      logger.consent.granted('microphone_usage', true);

      onConsent(true, false);
    } catch (err) {
      console.error('[VoiceConsent] Error saving consent:', err);
      // Still allow to continue
      onConsent(true, false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="popup-overlay">
      <div className="popup-content consent-modal" onClick={e => e.stopPropagation()}>
        <div className="popup-icon">🎙️</div>

        <h2 className="popup-title">Voice Calculator</h2>

        <p className="popup-description">
          This feature uses your microphone to convert speech into calculations.
        </p>

        <div className="consent-details">
          <p className="consent-text">
            <strong>How it works:</strong>
          </p>
          <ul className="consent-list">
            <li>Press and hold the microphone button</li>
            <li>Speak your calculation (e.g., "three feet six inches plus two feet")</li>
            <li>Release to see the result</li>
          </ul>

          <p className="consent-text consent-privacy">
            🔒 Your voice is sent to our server and processed using OpenAI's transcription service. Audio is not stored after processing. The resulting calculation expression may be logged for up to 30 days for error monitoring.
          </p>
        </div>

        <button
          className="popup-btn popup-btn-primary"
          onClick={handleAccept}
          disabled={isLoading}
        >
          {isLoading ? 'Please wait...' : 'Continue'}
        </button>

        <p className="popup-note">
          You can change microphone access anytime in your device settings.
        </p>
      </div>
    </div>
  );
}
