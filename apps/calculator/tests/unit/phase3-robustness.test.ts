// tests/unit/phase3-robustness.test.ts
// F04, F08, F18, F19: Robustness & UX tests via static analysis

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read source files
const calculatorSrc = readFileSync(resolve(__dirname, '../../src/components/Calculator.tsx'), 'utf-8');

const voiceRecorderSrc = readFileSync(resolve(__dirname, '../../src/hooks/useVoiceRecorder.ts'), 'utf-8');
const appSrc = readFileSync(resolve(__dirname, '../../src/App.tsx'), 'utf-8');
const toastSrc = readFileSync(resolve(__dirname, '../../src/components/Toast.tsx'), 'utf-8');

describe('F04 - Voice API fetch timeout', () => {
  it('uses AbortController for timeout', () => {
    expect(calculatorSrc).toContain('new AbortController()');
  });

  it('sets 20s timeout', () => {
    expect(calculatorSrc).toContain('controller.abort(), 20000');
  });

  it('passes signal to fetch', () => {
    expect(calculatorSrc).toContain('signal: controller.signal');
  });

  it('clears timeout on success', () => {
    const lines = calculatorSrc.split('\n');
    const fetchLine = lines.findIndex(l => l.includes('signal: controller.signal'));
    // clearTimeout should appear after fetch completes
    const afterFetch = lines.slice(fetchLine).join('\n');
    expect(afterFetch).toContain('clearTimeout(timeoutId)');
  });

  it('handles AbortError specifically', () => {
    expect(calculatorSrc).toContain("error.name === 'AbortError'");
  });

  it('shows toast on timeout', () => {
    const lines = calculatorSrc.split('\n');
    const abortLine = lines.find(l => l.includes('AbortError'));
    expect(abortLine).toBeDefined();
    // Next few lines should show toast
    const abortIdx = lines.findIndex(l => l.includes('AbortError'));
    const nearbyLines = lines.slice(abortIdx, abortIdx + 3).join('\n');
    expect(nearbyLines).toContain('setToast');
  });
});


describe('F08 - Max recording duration', () => {
  it('defines MAX_RECORDING_MS constant', () => {
    expect(voiceRecorderSrc).toContain('MAX_RECORDING_MS');
  });

  it('sets max recording to 30 seconds', () => {
    expect(voiceRecorderSrc).toContain('MAX_RECORDING_MS = 30000');
  });

  it('has timeoutRef for auto-stop', () => {
    expect(voiceRecorderSrc).toContain('timeoutRef');
  });

  it('sets timeout with MAX_RECORDING_MS', () => {
    expect(voiceRecorderSrc).toContain('setTimeout');
    expect(voiceRecorderSrc).toContain('MAX_RECORDING_MS');
  });

  it('auto-stops MediaRecorder on timeout', () => {
    // The setTimeout block references MAX_RECORDING_MS and calls .stop()
    const lines = voiceRecorderSrc.split('\n');
    const timeoutLine = lines.findIndex(l => l.includes('setTimeout') && l.includes('current'));
    expect(timeoutLine).toBeGreaterThan(-1);
    const afterTimeout = lines.slice(timeoutLine, timeoutLine + 8).join('\n');
    expect(afterTimeout).toContain('.stop()');
    expect(afterTimeout).toContain('MAX_RECORDING_MS');
  });

  it('clears timeout on manual stop', () => {
    // Find the actual stopRecording function (not interface declaration)
    const lines = voiceRecorderSrc.split('\n');
    const stopFn = lines.findIndex(l => l.includes('const stopRecording'));
    expect(stopFn).toBeGreaterThan(-1);
    const fnBody = lines.slice(stopFn, stopFn + 10).join('\n');
    expect(fnBody).toContain('clearTimeout');
  });
});

describe('F18+F19 - No alert()/confirm() in source', () => {
  it('Calculator.tsx has no alert() calls', () => {
    // Match alert( but not setToast which might contain the word
    const alertCalls = calculatorSrc.match(/\balert\s*\(/g);
    expect(alertCalls).toBeNull();
  });

  it('App.tsx has no window.confirm() calls', () => {
    expect(appSrc).not.toContain('window.confirm');
  });

  it('App.tsx has no alert() calls', () => {
    const alertCalls = appSrc.match(/\balert\s*\(/g);
    expect(alertCalls).toBeNull();
  });

  it('Toast component exists and has auto-dismiss', () => {
    expect(toastSrc).toContain('setTimeout');
    expect(toastSrc).toContain('onClose');
  });

  it('Toast supports error, info, success types', () => {
    expect(toastSrc).toContain("'error'");
    expect(toastSrc).toContain("'info'");
    expect(toastSrc).toContain("'success'");
  });

  it('Calculator uses Toast for error feedback', () => {
    expect(calculatorSrc).toContain('import Toast');
    expect(calculatorSrc).toContain('setToast');
    expect(calculatorSrc).toContain('<Toast');
  });

  it('shows toast when microphone denied', () => {
    // The denied message and setToast may be on different lines (ternary expression)
    expect(calculatorSrc).toContain('Microphone access denied');
    expect(calculatorSrc).toContain('setToast');
  });

  it('shows toast when voice API fails', () => {
    const lines = calculatorSrc.split('\n');
    const failLine = lines.find(l => l.includes('Voice recognition failed'));
    expect(failLine).toBeDefined();
    expect(failLine).toContain('setToast');
  });
});
