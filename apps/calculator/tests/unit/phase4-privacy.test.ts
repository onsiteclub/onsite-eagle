// tests/unit/phase4-privacy.test.ts
// Phase 4: Privacidade & Legal - Static analysis tests
// F06 (APP_VERSION), F11 (consent sync), F12 (IP), F13 (age), F14 (account deletion), F15 (retention SQL), F27 (Whisper language), F28 (policy alignment)

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf-8');

// ============================================
// F06: APP_VERSION centralizada via vite define
// ============================================
describe('F06 – APP_VERSION via vite define', () => {
  it('vite.config.ts defines __APP_VERSION__ from package.json', () => {
    const src = read('vite.config.ts');
    expect(src).toContain('__APP_VERSION__');
    expect(src).toContain('JSON.stringify(version)');
  });

  it('vite-env.d.ts declares __APP_VERSION__ global', () => {
    const src = read('src/vite-env.d.ts');
    expect(src).toContain('declare const __APP_VERSION__: string');
  });

  it('logger.ts uses __APP_VERSION__ instead of hardcoded version', () => {
    const src = read('src/lib/logger.ts');
    expect(src).toContain('__APP_VERSION__');
    expect(src).not.toMatch(/APP_VERSION\s*=\s*['"]1\.0\.0['"]/);
  });

  it('HamburgerMenu.tsx uses __APP_VERSION__ instead of hardcoded version', () => {
    const src = read('src/components/HamburgerMenu.tsx');
    expect(src).toContain('__APP_VERSION__');
    expect(src).not.toMatch(/APP_VERSION\s*=\s*['"]1\.0\.0['"]/);
  });
});

// ============================================
// F11: Consent sync to Supabase
// ============================================
describe('F11 – Consent sync to Supabase', () => {
  it('consent.ts exports syncConsentToServer function', () => {
    const src = read('src/lib/consent.ts');
    expect(src).toContain('export async function syncConsentToServer');
  });

  it('consent.ts imports supabase client', () => {
    const src = read('src/lib/consent.ts');
    expect(src).toContain("import { supabase, isSupabaseEnabled }");
  });

  it('syncConsentToServer upserts to consents table', () => {
    const src = read('src/lib/consent.ts');
    expect(src).toContain("from('consents').upsert");
  });

  it('syncConsentToServer skips microphone_usage (local-only)', () => {
    const src = read('src/lib/consent.ts');
    expect(src).toContain('SYNCABLE_TYPES');
    // microphone_usage should NOT be in the syncable types array
    const syncableMatch = src.match(/SYNCABLE_TYPES.*?\[([^\]]+)\]/s);
    expect(syncableMatch).toBeTruthy();
    expect(syncableMatch![1]).not.toContain('microphone_usage');
  });

  it('VoiceConsentModal calls syncConsentToServer', () => {
    const src = read('src/components/VoiceConsentModal.tsx');
    expect(src).toContain('syncConsentToServer');
  });
});

// ============================================
// F12: IP address disclosure in Privacy Policy
// ============================================
describe('F12 – IP address disclosure', () => {
  it('in-app Privacy Policy mentions IP address', () => {
    const src = read('src/components/LegalModal.tsx');
    expect(src.toLowerCase()).toContain('ip address');
  });

  it('docs/PRIVACY_POLICY.md mentions IP address', () => {
    const src = read('docs/PRIVACY_POLICY.md');
    expect(src.toLowerCase()).toContain('ip address');
  });

  it('docs/PRIVACY_POLICY_WEBSITE.md mentions IP address', () => {
    const src = read('docs/PRIVACY_POLICY_WEBSITE.md');
    expect(src.toLowerCase()).toContain('ip address');
  });
});

// ============================================
// F13: Minimum age consistently 16
// ============================================
describe('F13 – Minimum age = 16 across all policies', () => {
  it('in-app Privacy Policy says under 16', () => {
    const src = read('src/components/LegalModal.tsx');
    expect(src).toContain('under 16');
    expect(src).not.toContain('under 13');
  });

  it('docs/PRIVACY_POLICY.md says under 16', () => {
    const src = read('docs/PRIVACY_POLICY.md');
    expect(src).toContain('under 16');
  });

  it('docs/PRIVACY_POLICY_WEBSITE.md says under 16', () => {
    const src = read('docs/PRIVACY_POLICY_WEBSITE.md');
    expect(src).toContain('under 16');
    expect(src).not.toContain('under 13');
  });
});

// ============================================
// F15: Cleanup SQL functions
// ============================================
describe('F15 – Retention cleanup SQL', () => {
  it('retention_cleanup.sql exists', () => {
    const src = read('database/retention_cleanup.sql');
    expect(src).toBeTruthy();
  });

  it('has cleanup function for calculations (90 days)', () => {
    const src = read('database/retention_cleanup.sql');
    expect(src).toContain('cleanup_old_calculations');
    expect(src).toContain("90 days");
  });

  it('has cleanup function for voice_logs (30 days)', () => {
    const src = read('database/retention_cleanup.sql');
    expect(src).toContain('cleanup_old_voice_logs');
    expect(src).toContain("30 days");
  });

  it('has master cleanup function', () => {
    const src = read('database/retention_cleanup.sql');
    expect(src).toContain('run_retention_cleanup');
  });
});

// ============================================
// F27: Whisper language parametrizable
// ============================================
describe('F27 – Whisper language parametrizable', () => {
  it('interpret.ts reads language from env or query param', () => {
    const src = read('api/interpret.ts');
    expect(src).toContain('WHISPER_LANGUAGE');
    expect(src).toContain('req.query');
  });

  it('interpret.ts does NOT hardcode language as pt', () => {
    const src = read('api/interpret.ts');
    // Should not have formData.append('language', 'pt') hardcoded
    const lines = src.split('\n');
    const hardcodedLine = lines.find(l => l.includes("append('language'") && l.includes("'pt'"));
    expect(hardcodedLine).toBeFalsy();
  });

  it('defaults to auto-detect (no language) when no env/query override', () => {
    const src = read('api/interpret.ts');
    // Language is only appended conditionally (if whisperLang is truthy)
    expect(src).toContain("if (whisperLang)");
    // Default is empty string = auto-detect
    expect(src).toContain("|| ''");
  });
});

// ============================================
// F28: Privacy Policy alignment (data retention)
// ============================================
describe('F28 – Privacy Policy alignment', () => {
  it('in-app policy has data retention section', () => {
    const src = read('src/components/LegalModal.tsx');
    expect(src).toContain('Data Retention');
    expect(src).toContain('30 days');
  });

  it('docs/PRIVACY_POLICY.md has detailed retention periods', () => {
    const src = read('docs/PRIVACY_POLICY.md');
    expect(src).toContain('90 days');
    expect(src).toContain('30 days');
  });

  it('docs/PRIVACY_POLICY_WEBSITE.md has retention table', () => {
    const src = read('docs/PRIVACY_POLICY_WEBSITE.md');
    expect(src).toContain('90 days');
    expect(src).toContain('30 days');
  });
});
