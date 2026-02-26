// tests/unit/cors.test.ts
// F03 + F07: Verifica que CORS rejeita origens nao autorizadas

import { describe, it, expect } from 'vitest';
import { isAllowedOrigin } from '../../api/interpret';

describe('F03+F07 - CORS: isAllowedOrigin', () => {
  // Production domains
  it('allows calculator.onsiteclub.ca', () => {
    expect(isAllowedOrigin('https://calculator.onsiteclub.ca')).toBe(true);
  });

  it('allows app.onsiteclub.ca', () => {
    expect(isAllowedOrigin('https://app.onsiteclub.ca')).toBe(true);
  });

  it('allows onsiteclub-calculator.vercel.app (main deploy)', () => {
    expect(isAllowedOrigin('https://onsiteclub-calculator.vercel.app')).toBe(true);
  });

  it('allows onsite-calculator.vercel.app (alias)', () => {
    expect(isAllowedOrigin('https://onsite-calculator.vercel.app')).toBe(true);
  });

  // Capacitor/native origins
  it('allows capacitor://localhost', () => {
    expect(isAllowedOrigin('capacitor://localhost')).toBe(true);
  });

  it('allows ionic://localhost', () => {
    expect(isAllowedOrigin('ionic://localhost')).toBe(true);
  });

  // Dev origins
  it('allows localhost:5173 (dev)', () => {
    expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
  });

  it('allows localhost:3000 (dev)', () => {
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
  });

  // Vercel preview deployments (our project only)
  it('allows our project preview deployments (onsiteclub-calculator)', () => {
    expect(isAllowedOrigin('https://feature-xyz-onsiteclub-calculator.vercel.app')).toBe(true);
    expect(isAllowedOrigin('https://abc123def-onsiteclub-calculator.vercel.app')).toBe(true);
  });

  it('allows our project preview deployments (onsite-calculator)', () => {
    expect(isAllowedOrigin('https://feature-xyz-onsite-calculator.vercel.app')).toBe(true);
  });

  // BLOCKED - F07: random vercel.app sites
  it('REJECTS random .vercel.app sites', () => {
    expect(isAllowedOrigin('https://evil-site.vercel.app')).toBe(false);
    expect(isAllowedOrigin('https://phishing-app.vercel.app')).toBe(false);
    expect(isAllowedOrigin('https://other-project.vercel.app')).toBe(false);
  });

  it('REJECTS vercel.app sites that contain but dont end with our project name', () => {
    expect(isAllowedOrigin('https://onsiteclub-calculator-evil.vercel.app')).toBe(false);
    expect(isAllowedOrigin('https://fake-onsite-calculator-phish.vercel.app')).toBe(false);
  });

  // Edge cases
  it('REJECTS empty string', () => {
    expect(isAllowedOrigin('')).toBe(false);
  });

  it('REJECTS random external domains', () => {
    expect(isAllowedOrigin('https://evil.com')).toBe(false);
    expect(isAllowedOrigin('https://attacker.io')).toBe(false);
  });

  it('REJECTS http versions of production domains', () => {
    expect(isAllowedOrigin('http://calculator.onsiteclub.ca')).toBe(false);
  });
});
