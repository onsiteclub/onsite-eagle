// tests/unit/voice-guards.test.ts
// Phase 2.2 + 2.3 regression tests for the voice pipeline guards.

import { describe, it, expect } from 'vitest';
import { looksLikeHallucination, parseGPTResponse } from '../../api/lib/voice-guards';

describe('looksLikeHallucination — stock Whisper garbage', () => {
  it('rejects empty string', () => {
    expect(looksLikeHallucination('')).toBe(true);
    expect(looksLikeHallucination('   ')).toBe(true);
    expect(looksLikeHallucination('a')).toBe(true);
  });

  it('rejects punctuation-only transcripts', () => {
    expect(looksLikeHallucination('. . .')).toBe(true);
    expect(looksLikeHallucination('!!!')).toBe(true);
    expect(looksLikeHallucination('-')).toBe(true);
  });

  it('rejects URLs and website names (Whisper hallucinates these on noise)', () => {
    expect(looksLikeHallucination('www.intervoices.com')).toBe(true);
    expect(looksLikeHallucination('check out https://example.com')).toBe(true);
    expect(looksLikeHallucination('visit foo.ca for more')).toBe(true);
    expect(looksLikeHallucination('site.com.br')).toBe(true);
    expect(looksLikeHallucination('contact@example.com')).toBe(true);
  });

  it('rejects social-media call-to-actions', () => {
    expect(looksLikeHallucination('thanks for watching')).toBe(true);
    expect(looksLikeHallucination('Thanks for watching!')).toBe(true);
    expect(looksLikeHallucination('obrigado por assistir')).toBe(true);
    expect(looksLikeHallucination('Please subscribe to the channel')).toBe(true);
    expect(looksLikeHallucination('like and subscribe')).toBe(true);
    expect(looksLikeHallucination('merci de regarder')).toBe(true);
    expect(looksLikeHallucination('gracias por ver')).toBe(true);
  });

  it('allows construction-calculator phrases', () => {
    expect(looksLikeHallucination('cinco e meio mais três')).toBe(false);
    expect(looksLikeHallucination('twenty five feet six inches')).toBe(false);
    expect(looksLikeHallucination('dois por quatro')).toBe(false);
    expect(looksLikeHallucination('ten and a half')).toBe(false);
    expect(looksLikeHallucination('cinco ponto cinco')).toBe(false);
  });
});

describe('parseGPTResponse — shape + alphabet validation', () => {
  it('accepts a minimal valid response', () => {
    const r = parseGPTResponse('{"expression":"5 + 3"}');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.expression).toBe('5 + 3');
  });

  it('accepts a rich valid response (Phase 2.3 schema)', () => {
    const r = parseGPTResponse(JSON.stringify({
      expression: "25' 6 * 31' 6",
      intent: 'area',
      expected_dimension: 'area',
      explanation_pt: 'Área de 25 pés 6 por 31 pés 6',
    }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.intent).toBe('area');
      expect(r.data.expected_dimension).toBe('area');
    }
  });

  it('rejects invalid JSON', () => {
    const r = parseGPTResponse('not json');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid_json');
  });

  it('rejects missing expression', () => {
    const r = parseGPTResponse('{"intent":"calculation"}');
    expect(r.ok).toBe(false);
  });

  it('rejects expressions with prose (e.g. GPT explaining inside the field)', () => {
    // These are the biggest real-world failures — GPT giving English prose back.
    const r1 = parseGPTResponse('{"expression":"that would be 5 plus 3"}');
    expect(r1.ok).toBe(false);

    const r2 = parseGPTResponse('{"expression":"5 plus 3 equals 8"}');
    expect(r2.ok).toBe(false);
  });

  it('rejects expressions with URLs', () => {
    const r = parseGPTResponse('{"expression":"www.foo.com"}');
    expect(r.ok).toBe(false);
  });

  it('rejects overly long expressions (>100 chars)', () => {
    const long = '1+1' + '+1'.repeat(60); // 123 chars
    const r = parseGPTResponse(JSON.stringify({ expression: long }));
    expect(r.ok).toBe(false);
  });

  it('rejects unknown intent values', () => {
    const r = parseGPTResponse(JSON.stringify({
      expression: '5 + 3',
      intent: 'something_weird',
    }));
    expect(r.ok).toBe(false);
  });

  it('rejects unknown expected_dimension values', () => {
    const r = parseGPTResponse(JSON.stringify({
      expression: '5 + 3',
      expected_dimension: '4d_hyperspace',
    }));
    expect(r.ok).toBe(false);
  });

  it('accepts expressions with feet/inch markers', () => {
    expect(parseGPTResponse(`{"expression":"2' 6\\""}`).ok).toBe(true);
    expect(parseGPTResponse(`{"expression":"5' + 3'"}`).ok).toBe(true);
  });

  it('accepts expressions with lumber dimensions (2x4)', () => {
    expect(parseGPTResponse('{"expression":"2x4"}').ok).toBe(true);
    expect(parseGPTResponse('{"expression":"2 x 4"}').ok).toBe(true);
  });

  it('accepts metric unit tokens', () => {
    expect(parseGPTResponse('{"expression":"150 mm"}').ok).toBe(true);
    expect(parseGPTResponse('{"expression":"2.5 m"}').ok).toBe(true);
    expect(parseGPTResponse('{"expression":"30 cm + 10 cm"}').ok).toBe(true);
  });

  it('accepts area/volume unit tokens in expression', () => {
    expect(parseGPTResponse('{"expression":"10 sqft"}').ok).toBe(true);
    expect(parseGPTResponse('{"expression":"5 cuft"}').ok).toBe(true);
  });

  it('accepts percentage expressions', () => {
    expect(parseGPTResponse('{"expression":"100 + 10%"}').ok).toBe(true);
    expect(parseGPTResponse('{"expression":"10% of 150"}').ok).toBe(false); // "of" is prose, not allowed
  });
});
