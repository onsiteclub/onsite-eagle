// tests/unit/calculator.test.ts
import { describe, it, expect } from 'vitest';
import { 
  calculate, 
  parseToInches, 
  formatInches, 
  formatTotalInches,
  tokenize,
  evaluateTokens 
} from '../../src/lib/calculator';

describe('parseToInches', () => {
  it('parses whole numbers', () => {
    expect(parseToInches('5')).toBe(5);
    expect(parseToInches('12')).toBe(12);
  });

  it('parses simple fractions', () => {
    expect(parseToInches('1/2')).toBe(0.5);
    expect(parseToInches('3/4')).toBe(0.75);
    expect(parseToInches('3/8')).toBe(0.375);
  });

  it('parses mixed numbers', () => {
    expect(parseToInches('5 1/2')).toBe(5.5);
    expect(parseToInches('10 3/8')).toBe(10.375);
    expect(parseToInches('3 3/4')).toBe(3.75);
  });

  it('parses feet', () => {
    expect(parseToInches("1'")).toBe(12);
    expect(parseToInches("2'")).toBe(24);
    expect(parseToInches("3'")).toBe(36);
  });

  it('parses feet and inches', () => {
    expect(parseToInches("2' 6")).toBe(30);
    expect(parseToInches("1' 3")).toBe(15);
    expect(parseToInches("3' 6 1/2")).toBe(42.5);
  });
});

describe('formatInches', () => {
  it('formats whole inches', () => {
    expect(formatInches(8)).toBe('8"');
    expect(formatInches(12)).toBe('1\' 0"');
  });

  it('formats fractions', () => {
    expect(formatInches(0.5)).toBe('1/2"');
    expect(formatInches(0.75)).toBe('3/4"');
  });

  it('formats mixed numbers', () => {
    expect(formatInches(5.5)).toBe('5 1/2"');
    expect(formatInches(8.75)).toBe('8 3/4"');
  });

  it('formats feet and inches', () => {
    expect(formatInches(30)).toBe("2' 6\"");
    expect(formatInches(42)).toBe("3' 6\"");
  });
});

describe('formatTotalInches', () => {
  it('formats with fractions', () => {
    expect(formatTotalInches(24.5)).toBe('24 1/2 In');
    expect(formatTotalInches(99.75)).toBe('99 3/4 In');
  });
});

describe('tokenize', () => {
  it('tokenizes simple expression', () => {
    const tokens = tokenize('5 + 3');
    expect(tokens).toEqual(['5', '+', '3']);
  });

  it('tokenizes with fractions', () => {
    const tokens = tokenize('5 1/2 + 3 1/4');
    expect(tokens).toEqual(['5 1/2', '+', '3 1/4']);
  });

  it('tokenizes multiple operations', () => {
    const tokens = tokenize('5 1/2 + 3 1/4 - 2');
    expect(tokens).toEqual(['5 1/2', '+', '3 1/4', '-', '2']);
  });

  it('tokenizes with multiplication', () => {
    const tokens = tokenize('5 * 3');
    expect(tokens).toEqual(['5', '*', '3']);
  });
});

describe('evaluateTokens', () => {
  it('evaluates addition', () => {
    expect(evaluateTokens(['5', '+', '3'])).toBe(8);
  });

  it('evaluates subtraction', () => {
    expect(evaluateTokens(['10', '-', '3'])).toBe(7);
  });

  it('evaluates multiplication', () => {
    expect(evaluateTokens(['5', '*', '3'])).toBe(15);
  });

  it('evaluates division', () => {
    expect(evaluateTokens(['12', '/', '4'])).toBe(3);
  });

  it('respects PEMDAS - multiplication before addition', () => {
    expect(evaluateTokens(['2', '+', '3', '*', '4'])).toBe(14);
  });

  it('respects PEMDAS - division before subtraction', () => {
    expect(evaluateTokens(['10', '-', '6', '/', '2'])).toBe(7);
  });
});

describe('calculate', () => {
  describe('basic operations', () => {
    it('adds whole numbers', () => {
      const result = calculate('5 + 3');
      expect(result?.resultDecimal).toBe(8);
    });

    it('subtracts whole numbers', () => {
      const result = calculate('10 - 3');
      expect(result?.resultDecimal).toBe(7);
    });

    it('multiplies', () => {
      const result = calculate('5 * 3');
      expect(result?.resultDecimal).toBe(15);
    });

    it('divides', () => {
      const result = calculate('12 / 4');
      expect(result?.resultDecimal).toBe(3);
    });
  });

  describe('fractions', () => {
    it('adds fractions', () => {
      const result = calculate('1/2 + 1/4');
      expect(result?.resultDecimal).toBe(0.75);
      expect(result?.isInchMode).toBe(true);
    });

    it('adds mixed numbers', () => {
      const result = calculate('5 1/2 + 3 1/4');
      expect(result?.resultDecimal).toBe(8.75);
      expect(result?.resultFeetInches).toBe('8 3/4"');
    });

    it('subtracts mixed numbers', () => {
      const result = calculate('10 1/2 - 3 1/4');
      expect(result?.resultDecimal).toBe(7.25);
    });
  });

  describe('feet and inches', () => {
    it('adds feet', () => {
      const result = calculate("2' + 1'");
      expect(result?.resultDecimal).toBe(36);
      expect(result?.resultFeetInches).toBe("3' 0\"");
    });

    it('adds feet and inches', () => {
      const result = calculate("2' 6 + 1' 6");
      expect(result?.resultDecimal).toBe(48);
      expect(result?.resultFeetInches).toBe("4' 0\"");
    });
  });

  describe('complex expressions', () => {
    it('handles multiple operations', () => {
      const result = calculate('5 1/2 + 3 1/4 - 2');
      expect(result?.resultDecimal).toBe(6.75);
    });

    it('respects PEMDAS with fractions', () => {
      const result = calculate('5 1/2 + 3 * 2');
      // 5.5 + 6 = 11.5
      expect(result?.resultDecimal).toBe(11.5);
    });
  });

  describe('edge cases', () => {
    it('returns null for empty input', () => {
      expect(calculate('')).toBeNull();
    });

    it('handles division by zero', () => {
      const result = calculate('5 / 0');
      expect(result?.resultFeetInches).toBe('Error');
    });

    it('handles pure math mode', () => {
      const result = calculate('100 + 50');
      expect(result?.isInchMode).toBe(false);
      expect(result?.resultDecimal).toBe(150);
    });
  });

  describe('percentage', () => {
    it('calculates percentage addition', () => {
      const result = calculate('100 + 10%');
      expect(result?.resultDecimal).toBe(110);
    });

    it('calculates percentage subtraction', () => {
      const result = calculate('100 - 20%');
      expect(result?.resultDecimal).toBe(80);
    });
  });
});
