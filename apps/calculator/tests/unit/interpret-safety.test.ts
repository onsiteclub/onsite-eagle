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
  it('JSON.parse is wrapped in try/catch', () => {
    // Find the JSON.parse call and verify it's inside a try block
    const lines = interpretSource.split('\n');
    const jsonParseLineIndex = lines.findIndex(l => l.includes('parsed = JSON.parse(content)'));
    expect(jsonParseLineIndex).toBeGreaterThan(-1);

    // Look backwards for 'try {' before the JSON.parse
    const precedingLines = lines.slice(Math.max(0, jsonParseLineIndex - 5), jsonParseLineIndex);
    const hasTry = precedingLines.some(l => l.includes('try'));
    expect(hasTry).toBe(true);
  });

  it('has catch block that returns error response for invalid JSON', () => {
    // Verify there's a catch handling the JSON.parse failure
    expect(interpretSource).toContain('GPT returned invalid JSON');
    expect(interpretSource).toContain("error: 'Failed to parse voice input'");
  });

  it('validates expression field exists before proceeding', () => {
    expect(interpretSource).toContain('if (!parsed.expression)');
    expect(interpretSource).toContain("error: 'Could not understand the input'");
  });

  it('does not log raw GPT content (could contain PII from transcription)', () => {
    // Find the line with the GPT invalid JSON error log
    const line = interpretSource.split('\n').find(l => l.includes('GPT returned invalid JSON'));
    expect(line).toBeTruthy();
    // Should log raw_length, not raw_content or the full content string
    expect(line!).toContain('raw_length');
    expect(line!).not.toContain('raw_content');
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
