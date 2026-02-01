// src/components/VoiceConsentModal.tsx
// Modal de consentimento para uso do microfone (App Store compliance)
// Mostra no primeiro uso do microfone - ANTES de acessar o microfone

import { useState } from 'react';
import { setConsent, setLocalConsent, type ConsentType } from '../lib/consent';
import { logger } from '../lib/logger';

interface VoiceConsentModalProps {
  userId?: string;  // Optional - for anonymous users
  onConsent: (microphoneGranted: boolean, voiceTrainingGranted: boolean) => void;
  onClose: () => void;
}

export default function VoiceConsentModal({ userId, onConsent, onClose }: VoiceConsentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [helpImprove, setHelpImprove] = useState(false);

  const saveConsent = async (type: ConsentType, granted: boolean) => {
    if (userId) {
      // Logged in user - save to database
      return await setConsent(userId, type, granted, {
        documentVersion: '1.0',
        appVersion: '1.0.0',
      });
    } else {
      // Anonymous user - save to local storage
      setLocalConsent(type, granted);
      return true;
    }
  };

  const handleAccept = async () => {
    setIsLoading(true);

    try {
      // Save microphone usage consent (required)
      const micResult = await saveConsent('microphone_usage', true);
      if (micResult) {
        logger.consent.granted('microphone_usage', true);
      }

      // Save voice training consent (optional - based on checkbox)
      const trainingResult = await saveConsent('voice_training', helpImprove);
      if (trainingResult) {
        logger.consent.granted('voice_training', helpImprove);
      }

      onConsent(true, helpImprove);
    } catch (err) {
      console.error('[VoiceConsent] Error saving consent:', err);
      // Still allow to continue
      onConsent(true, helpImprove);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    setIsLoading(true);

    try {
      // Save microphone usage declined
      await saveConsent('microphone_usage', false);
      logger.consent.granted('microphone_usage', false);

      onConsent(false, false);
    } catch (err) {
      console.error('[VoiceConsent] Error saving consent:', err);
      onConsent(false, false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content consent-modal" onClick={e => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>×</button>

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
            🔒 Your voice is sent to our secure server for processing and is not stored after the calculation is complete.
          </p>

          <label className="consent-checkbox-label">
            <input
              type="checkbox"
              checked={helpImprove}
              onChange={(e) => setHelpImprove(e.target.checked)}
              disabled={isLoading}
            />
            <span className="consent-checkbox-text">
              Help improve voice recognition by allowing anonymized transcriptions to be used for training
            </span>
          </label>
        </div>

        <button
          className="popup-btn popup-btn-primary"
          onClick={handleAccept}
          disabled={isLoading}
        >
          {isLoading ? 'Please wait...' : 'Allow Microphone'}
        </button>

        <button
          className="popup-btn popup-btn-secondary"
          onClick={handleDecline}
          disabled={isLoading}
        >
          Don't Allow
        </button>

        <p className="popup-note">
          You can change this anytime in your device settings.
        </p>
      </div>
    </div>
  );
}
