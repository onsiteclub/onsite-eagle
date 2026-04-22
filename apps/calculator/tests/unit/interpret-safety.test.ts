// tests/unit/interpret-safety.test.ts
// F09 + F10: Verifica que interpret.ts trata JSON invalido e limita tamanho de arquivo

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const interpretSource = readFileSync(
  resolve(__dirname, '../../api/interpret.ts'),
  'utf-8'
);

describe('F09 - JSON.parse safety', () => {
  // Phase 2.3 — GPT response parsing was moved into `api/lib/voice-guards.ts`
  // (`parseGPTResponse`), which does the JSON.parse + Valibot shape validation
  // inside a try/catch and returns `{ ok: false, reason }` on any failure.
  // These regressions check that interpret.ts actually USES that safe wrapper,
  // handles its failure path, and doesn't leak raw content in logs.

  it('delegates parsing to parseGPTResponse (no raw JSON.parse on GPT content)', () => {
    // The only direct JSON.parse on GPT output would be unsafe; the guarded call is:
    expect(interpretSource).toContain('parseGPTResponse(sanitized)');
    // And interpret.ts must NOT directly call JSON.parse on `content` — it delegates.
    expect(interpretSource).not.toMatch(/JSON\.parse\(\s*content\s*\)/);
  });

  it('handles the ok=false branch explicitly', () => {
    // The rejection branch must return a clean error shape.
    expect(interpretSource).toContain('if (!gptParse.ok)');
    // Both user-facing error messages still appear (routing on reason).
    expect(interpretSource).toContain("'Failed to parse voice input'");
    expect(interpretSource).toContain("'Could not understand the input'");
  });

  it('has a dedicated error log line for GPT parse failure', () => {
    // Keeps the "GPT returned invalid JSON" signature so existing dashboards keep working.
    expect(interpretSource).toContain('GPT returned invalid JSON');
  });

  it('does not log raw GPT content (could contain PII from transcription)', () => {
    // Find the apiLogger.voice.error call for the GPT rejection.
    const line = interpretSource.split('\n').find((l) => l.includes('GPT returned invalid JSON'));
    expect(line).toBeTruthy();
    // Should log raw_length / reason only — never the full content or a preview.
    expect(line!).toContain('raw_length');
    expect(line!).not.toContain('raw_content');
    expect(line!).not.toContain('content_preview');
  });
});

describe('F10 - Audio file size validation', () => {
  it('has file size limit of 25MB (Whisper API limit)', () => {
    expect(interpretSource).toContain('25 * 1024 * 1024');
    expect(interpretSource).toContain("error: 'Audio file too large (max 25MB)'");
  });

  it('checks file size after extraction but before API call', () => {
    const lines = interpretSource.split('\n');
    const sizeCheckIndex = lines.findIndex(l => l.includes('Audio file too large'));
    const whisperCallIndex = lines.findIndex(l => l.includes('audio/transcriptions'));
    expect(sizeCheckIndex).toBeGreaterThan(-1);
    expect(whisperCallIndex).toBeGreaterThan(-1);
    expect(sizeCheckIndex).toBeLessThan(whisperCallIndex);
  });
});

describe('F03 - CORS wildcard removed', () => {
  it('does NOT set wildcard CORS for missing origin', () => {
    // The old code had: else if (!origin) { res.setHeader('Access-Control-Allow-Origin', '*'); }
    // Verify no wildcard CORS assignment exists
    expect(interpretSource).not.toMatch(/Access-Control-Allow-Origin.*\*/);
  });
});
