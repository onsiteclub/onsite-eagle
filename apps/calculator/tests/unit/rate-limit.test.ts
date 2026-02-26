// tests/unit/rate-limit.test.ts
// F02: Verifica rate limiting persistente via Supabase

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @supabase/supabase-js before importing the module
const mockSelect = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));
const mockCreateClient = vi.fn(() => ({
  from: mockFrom,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

// Import after mocking
import { checkRateLimit, RATE_LIMIT_MAX_REQUESTS } from '../../api/lib/rate-limit';

describe('F02 - Persistent Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set env vars for Supabase
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    // Default mock chain: select -> eq -> eq -> eq -> gte
    const chainResult = { count: 0, error: null };
    const chain = {
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue(chainResult),
      ...chainResult,
    };
    mockSelect.mockReturnValue(chain);
  });

  it('allows request when count is below limit', async () => {
    const chain = {
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count: 5, error: null }),
    };
    mockSelect.mockReturnValue(chain);

    const result = await checkRateLimit('1.2.3.4');
    expect(result).toBe(true);
  });

  it('blocks request when count reaches limit', async () => {
    const chain = {
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count: RATE_LIMIT_MAX_REQUESTS, error: null }),
    };
    mockSelect.mockReturnValue(chain);

    const result = await checkRateLimit('1.2.3.4');
    expect(result).toBe(false);
  });

  it('blocks request when count exceeds limit', async () => {
    const chain = {
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count: RATE_LIMIT_MAX_REQUESTS + 10, error: null }),
    };
    mockSelect.mockReturnValue(chain);

    const result = await checkRateLimit('1.2.3.4');
    expect(result).toBe(false);
  });

  it('fails open when Supabase returns an error', async () => {
    const chain = {
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockResolvedValue({ count: null, error: { message: 'DB connection failed' } }),
    };
    mockSelect.mockReturnValue(chain);

    const result = await checkRateLimit('1.2.3.4');
    expect(result).toBe(true);
  });

  it('fails open when Supabase env vars are missing', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = await checkRateLimit('1.2.3.4');
    expect(result).toBe(true);
  });

  it('fails open when Supabase throws exception', async () => {
    mockSelect.mockImplementation(() => {
      throw new Error('Network error');
    });

    const result = await checkRateLimit('1.2.3.4');
    expect(result).toBe(true);
  });

  it('queries correct table and filters', async () => {
    const eqFn = vi.fn().mockReturnThis();
    const gteFn = vi.fn().mockResolvedValue({ count: 0, error: null });
    const chain = { eq: eqFn, gte: gteFn };
    mockSelect.mockReturnValue(chain);

    await checkRateLimit('10.0.0.1');

    // Verify it queries app_logs with correct filters
    expect(mockFrom).toHaveBeenCalledWith('app_logs');
    expect(mockSelect).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    expect(eqFn).toHaveBeenCalledWith('module', 'Voice');
    expect(eqFn).toHaveBeenCalledWith('action', 'api_request');
    expect(eqFn).toHaveBeenCalledWith('ip', '10.0.0.1');
  });
});
