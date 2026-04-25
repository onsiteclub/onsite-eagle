// src/components/PrivacyDashboard.tsx
// Phase 5.2 — in-app privacy controls.
// Users see what consents are granted, revoke them with one tap, see their
// server-side footprint, and delete everything via /api/privacy/delete.

import { useCallback, useEffect, useState } from 'react';
import { getLocalConsentStatus, setLocalConsent, syncConsentToServer, type ConsentType } from '../lib/consent';
import { fetchPrivacyCounts, deleteAllData, type PrivacyCounts } from '../lib/privacy';
import { getOrCreateDeviceId } from '../lib/device';
import { logger } from '../lib/logger';

interface PrivacyDashboardProps {
  onClose: () => void;
}

type ConsentRow = { type: ConsentType; label: string; description: string };

const MANAGED_CONSENTS: ConsentRow[] = [
  {
    type: 'microphone_usage',
    label: 'Microphone',
    description: 'Lets the app record audio for voice input. Turning this off blocks the microphone.',
  },
  {
    type: 'voice_training',
    label: 'Improve voice recognition',
    description: 'Stores transcripts (text, not audio) to improve recognition. Optional.',
  },
];

export default function PrivacyDashboard({ onClose }: PrivacyDashboardProps) {
  const [consents, setConsents] = useState<Record<ConsentType, boolean | null>>({} as Record<ConsentType, boolean | null>);
  const [deviceId, setDeviceId] = useState<string>('');
  const [counts, setCounts] = useState<PrivacyCounts | null>(null);
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionSummary, setDeletionSummary] = useState<string | null>(null);

  // Load consent state + device id on mount.
  useEffect(() => {
    const initial: Record<ConsentType, boolean | null> = {} as Record<ConsentType, boolean | null>;
    for (const { type } of MANAGED_CONSENTS) {
      initial[type] = getLocalConsentStatus(type);
    }
    setConsents(initial);

    void getOrCreateDeviceId().then(setDeviceId);

    void fetchPrivacyCounts()
      .then(setCounts)
      .finally(() => setIsLoadingCounts(false));
  }, []);

  const toggleConsent = useCallback((type: ConsentType, current: boolean | null) => {
    const next = !current;
    setLocalConsent(type, next);
    setConsents((prev) => ({ ...prev, [type]: next }));
    // Fire-and-forget server sync — microphone_usage is local-only, voice_training syncs.
    void syncConsentToServer(type, next);
    logger.consent.prompted(type);
  }, []);

  const handleDelete = useCallback(async () => {
    const total = (counts?.voice_logs ?? 0) + (counts?.calculations ?? 0) + (counts?.errors ?? 0) + (counts?.events ?? 0);
    const confirmText = total > 0
      ? `Delete ${total} record(s) from the server? This cannot be undone.`
      : 'No server-side data found. We can still clear local cache for safety. Continue?';
    if (!window.confirm(confirmText)) return;

    setIsDeleting(true);
    setDeletionSummary(null);
    try {
      const result = await deleteAllData();
      const deletedTotal = Object.values(result.deleted).reduce((a, b) => (a ?? 0) + (b ?? 0), 0) ?? 0;
      setDeletionSummary(
        result.partialFailure
          ? `${deletedTotal} record(s) deleted, but some tables failed. Please retry.`
          : `${deletedTotal} record(s) deleted from server.`
      );
      // Refresh counts (should be zeros now).
      const refreshed = await fetchPrivacyCounts();
      setCounts(refreshed);
      // Refresh device id (deleteAllData rotates it).
      setDeviceId(await getOrCreateDeviceId());
    } catch (err) {
      logger.history.error('Deletion failed', { error: String(err) });
      setDeletionSummary('Deletion failed. Please retry or email privacy@onsiteclub.ca.');
    } finally {
      setIsDeleting(false);
    }
  }, [counts]);

  return (
    <div className="privacy-dashboard-overlay" onClick={onClose}>
      <div className="privacy-dashboard" onClick={(e) => e.stopPropagation()}>
        <header className="privacy-dashboard__header">
          <h2 className="privacy-dashboard__title">Privacy</h2>
          <button className="privacy-dashboard__close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div className="privacy-dashboard__body">
          {/* Section 1 — consents */}
          <section className="privacy-section">
            <h3 className="privacy-section__title">Consents</h3>
            <p className="privacy-section__sub">
              Turning a consent off takes effect immediately. Past consents stay on file for legal purposes.
            </p>

            {MANAGED_CONSENTS.map(({ type, label, description }) => {
              const current = consents[type];
              const granted = current === true;
              return (
                <div key={type} className="privacy-consent-row">
                  <div className="privacy-consent-row__text">
                    <span className="privacy-consent-row__label">{label}</span>
                    <span className="privacy-consent-row__desc">{description}</span>
                  </div>
                  <button
                    type="button"
                    className={`privacy-toggle ${granted ? 'privacy-toggle--on' : ''}`}
                    onClick={() => toggleConsent(type, current)}
                    aria-pressed={granted}
                  >
                    <span className="privacy-toggle__thumb" />
                  </button>
                </div>
              );
            })}
          </section>

          {/* Section 2 — data footprint */}
          <section className="privacy-section">
            <h3 className="privacy-section__title">Your data on our server</h3>
            <p className="privacy-section__sub">
              Anonymous identifier for this device: <code className="privacy-code">{deviceId.slice(0, 13)}…</code>
            </p>
            {isLoadingCounts ? (
              <p className="privacy-counts__loading">Loading…</p>
            ) : (
              <ul className="privacy-counts">
                <li><span>Voice recordings</span><strong>{counts?.voice_logs ?? 0}</strong></li>
                <li><span>Saved calculations</span><strong>{counts?.calculations ?? 0}</strong></li>
                <li><span>Events</span><strong>{counts?.events ?? 0}</strong></li>
                <li><span>Errors logged</span><strong>{counts?.errors ?? 0}</strong></li>
              </ul>
            )}
          </section>

          {/* Section 3 — delete */}
          <section className="privacy-section">
            <h3 className="privacy-section__title">Delete my data</h3>
            <p className="privacy-section__sub">
              Removes every record tied to this device and your account. Server deletion is immediate. Local history is wiped too.
            </p>
            <button
              type="button"
              className="privacy-delete-btn"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete all'}
            </button>
            {deletionSummary && (
              <p className="privacy-deletion-summary">{deletionSummary}</p>
            )}
          </section>

          <p className="privacy-dashboard__footer">
            Questions? <a href="mailto:privacy@onsiteclub.ca">privacy@onsiteclub.ca</a>
          </p>
        </div>
      </div>
    </div>
  );
}
