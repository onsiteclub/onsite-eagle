// tests/unit/interpret-privacy.test.ts
// F01: Verifica que transcricao NAO e logada em nenhum lugar

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const interpretSource = readFileSync(
  resolve(__dirname, '../../api/interpret.ts'),
  'utf-8'
);

describe('F01 - Privacy: Transcription not logged', () => {
  it('apiLogger.voice.success does NOT receive transcription field', () => {
    // Match the apiLogger.voice.success call and check its context argument
    const successCalls = interpretSource.match(/apiLogger\.voice\.success\([^)]+\)/g) || [];
    expect(successCalls.length).toBeGreaterThan(0);

    for (const call of successCalls) {
      // Must not have bare "transcription:" key (but "has_transcription:" is ok)
      expect(call).not.toMatch(/(?<!has_)transcription:/);
      expect(call).not.toMatch(/(?<!has_)transcription,/);
    }
  });

  it('apiLogger.voice.error does NOT receive transcription field', () => {
    const errorCalls = interpretSource.match(/apiLogger\.voice\.error\([^)]+\)/g) || [];
    expect(errorCalls.length).toBeGreaterThan(0);

    for (const call of errorCalls) {
      expect(call).not.toContain('transcription:');
      // transcribedText should not appear in error logger context
      expect(call).not.toMatch(/transcribedText/);
    }
  });

  it('console.log success line does NOT contain transcription', () => {
    const successLogs = interpretSource.match(/console\.log\(\s*'\[Voice\] Success:.*\)/g) || [];
    expect(successLogs.length).toBeGreaterThan(0);

    for (const log of successLogs) {
      expect(log).not.toContain('transcription');
      expect(log).not.toContain('transcribedText');
    }
  });

  it('console.error GPT line does NOT contain transcription', () => {
    const gptErrorLogs = interpretSource.match(/console\.error\(\s*'\[Voice\] GPT error:.*\)/g) || [];
    expect(gptErrorLogs.length).toBeGreaterThan(0);

    for (const log of gptErrorLogs) {
      expect(log).not.toContain('transcription');
      expect(log).not.toContain('transcribedText');
    }
  });

  it('has_transcription boolean flag is logged instead (for debugging)', () => {
    expect(interpretSource).toContain('has_transcription:');
  });

  it('transcribedText is still sent to GPT (required for functionality)', () => {
    // The transcribed text MUST be sent to GPT for interpretation - this is functional, not logging
    expect(interpretSource).toContain("content: transcribedText");
  });
});
