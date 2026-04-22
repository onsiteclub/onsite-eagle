// src/lib/calculator/engine.ts
// Engine de cálculo para medidas de construção (inches, feet, frações)
// Phase 1: dimensional arithmetic. Multiplicar dois comprimentos vira área;
// multiplicar área por comprimento vira volume. Escalares adaptam ao contexto
// (ex: `5 1/2 + 3 * 2` = 11.5 inches — o 3 e 2 são dimensionless e somam como
// comprimento por coerção). Somas/subtrações entre dimensões explícitas diferentes
// dão erro.

import type {
  CalculationResult,
  DimensionType,
} from '../../types/calculator';
import { logger } from '../logger';

// ============================================
// TIPOS INTERNOS
// ============================================

/** 0 = escalar puro, 1 = comprimento (in), 2 = área (sqin), 3 = volume (cuin). */
type Dim = 0 | 1 | 2 | 3;

/** Valor numérico acompanhado da dimensão que ele representa.
 *  Comprimentos são sempre em polegadas (inches), áreas em sqin, volumes em cuin. */
interface Quantity {
  value: number;
  dim: Dim;
}

function dimName(d: Dim): DimensionType {
  return (['scalar', 'length', 'area', 'volume'] as const)[d];
}

// ============================================
// CONVERSORES (público — testes dependem)
// ============================================

/**
 * Converte um valor (com ou sem fração/feet) para polegadas decimais.
 * Função pura sobre a string de entrada — NÃO carrega dim, só valor.
 * Exemplos: "5 1/2" → 5.5, "3'" → 36, "2' 6" → 30, "7" → 7
 */
export function parseToInches(str: string): number {
  let s = str.trim().replace(/"/g, '');
  let totalInches = 0;

  if (s.includes("'")) {
    const parts = s.split("'");
    const feet = parseFloat(parts[0]) || 0;
    totalInches += feet * 12;
    s = (parts[1] || '').trim();
  }

  if (!s) return totalInches;

  const mixedMatch = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseFloat(mixedMatch[2]);
    const den = parseFloat(mixedMatch[3]);
    return totalInches + whole + (num / den);
  }

  const fracMatch = s.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    return totalInches + (parseFloat(fracMatch[1]) / parseFloat(fracMatch[2]));
  }

  return totalInches + (parseFloat(s) || 0);
}

/**
 * Classifica a dimensão intrínseca de um token.
 * Marcadores `'` ou `"` => comprimento. Fração `n/m` dentro do token => comprimento.
 * Caso contrário escalar.
 */
function tokenDim(token: string): Dim {
  if (/['"]/.test(token)) return 1;
  if (/\d+\/\d+/.test(token)) return 1;
  return 0;
}

function parseTokenToQuantity(token: string): Quantity {
  return { value: parseToInches(token), dim: tokenDim(token) };
}

// ============================================
// ÁLGEBRA DE QUANTITY
// ============================================

function mulQ(a: Quantity, b: Quantity): Quantity {
  const newDim = a.dim + b.dim;
  if (newDim > 3) throw new Error('Dimensão acima de volume (dim > 3)');
  return { value: a.value * b.value, dim: newDim as Dim };
}

function divQ(a: Quantity, b: Quantity): Quantity {
  if (b.value === 0) return { value: NaN, dim: 0 };
  const newDim = a.dim - b.dim;
  if (newDim < 0) throw new Error('Divisão produz dimensão negativa');
  return { value: a.value / b.value, dim: newDim as Dim };
}

/**
 * Para soma/subtração: dimensões iguais somam direto.
 * Se uma delas é escalar (dim 0), é promovida à dim da outra (coerção
 * contextual — um carpinteiro dizendo `5 1/2 + 3` entende que o 3 é polegadas).
 * Dimensões explícitas diferentes (ex: length + area) lançam erro.
 */
function coerceForAddSub(a: Quantity, b: Quantity): [Quantity, Quantity] {
  if (a.dim === b.dim) return [a, b];
  if (a.dim === 0) return [{ value: a.value, dim: b.dim }, b];
  if (b.dim === 0) return [a, { value: b.value, dim: a.dim }];
  throw new Error(
    `Não posso somar/subtrair ${dimName(a.dim)} com ${dimName(b.dim)}`
  );
}

function addQ(a: Quantity, b: Quantity): Quantity {
  const [l, r] = coerceForAddSub(a, b);
  return { value: l.value + r.value, dim: l.dim };
}

function subQ(a: Quantity, b: Quantity): Quantity {
  const [l, r] = coerceForAddSub(a, b);
  return { value: l.value - r.value, dim: l.dim };
}

// ============================================
// FORMATTERS
// ============================================

/**
 * Formata polegadas decimais para formato de construção.
 * Exemplos: 30 → "2' 6\"", 36 → "3'", 11.5 → "11 1/2\"", 20 → "20".
 */
export function formatInches(inches: number): string {
  if (!isFinite(inches)) return 'Error';

  const negative = inches < 0;
  inches = Math.abs(inches);

  let feet = Math.floor(inches / 12);
  const remaining = inches - feet * 12;
  let whole = Math.floor(remaining);
  const frac = remaining - whole;

  let sixteenths = Math.round(frac * 16);
  if (sixteenths === 16) {
    sixteenths = 0;
    whole += 1;
    if (whole === 12) { whole = 0; feet += 1; }
  }

  let fracStr = '';
  if (sixteenths > 0) {
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const d = gcd(sixteenths, 16);
    fracStr = `${sixteenths / d}/${16 / d}`;
  }

  const hasFeet = feet > 0;
  const hasWhole = whole > 0;
  const hasFrac = fracStr !== '';

  if (!hasFeet && !hasWhole && !hasFrac) return '0';

  const inchParts: string[] = [];
  if (hasWhole) inchParts.push(String(whole));
  if (hasFrac) inchParts.push(fracStr);
  const inchText = inchParts.join(' ');

  const quote = hasFrac || (hasFeet && inchText) ? '"' : '';

  let result: string;
  if (hasFeet && inchText) {
    result = `${feet}' ${inchText}${quote}`;
  } else if (hasFeet) {
    result = `${feet}'`;
  } else {
    result = `${inchText}${quote}`;
  }

  return (negative ? '-' : '') + result;
}

/**
 * Formata polegadas totais com fração (não decimal).
 * Exemplo: 24.875 → "24 7/8 In". Inteiro puro sem fração → "20".
 */
export function formatTotalInches(inches: number): string {
  if (!isFinite(inches)) return 'Error';

  const negative = inches < 0;
  inches = Math.abs(inches);

  const whole = Math.floor(inches);
  const frac = inches - whole;

  const sixteenths = Math.round(frac * 16);
  let fracStr = '';
  let adjustedWhole = whole;

  if (sixteenths > 0 && sixteenths < 16) {
    const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
    const d = gcd(sixteenths, 16);
    fracStr = ` ${sixteenths / d}/${16 / d}`;
  } else if (sixteenths === 16) {
    adjustedWhole = whole + 1;
  }

  const hasFraction = fracStr !== '';
  if (hasFraction) {
    return (negative ? '-' : '') + adjustedWhole + fracStr + ' In';
  }
  return (negative ? '-' : '') + adjustedWhole.toString();
}

/**
 * Formata número: inteiro sem decimais, quebrado com 2 casas decimais.
 */
export function formatNumber(num: number): string {
  if (!isFinite(num)) return 'Error';
  if (Number.isInteger(num)) return num.toString();
  return parseFloat(num.toFixed(2)).toString();
}

/** Área em polegadas quadradas → display primário em sqft + secundário em sqin. */
function formatArea(sqin: number): { primary: string; secondary: string } {
  const sqft = sqin / 144;
  return {
    primary: `${formatNumber(sqft)} sq ft`,
    secondary: `${formatNumber(sqin)} sq in`,
  };
}

/** Volume em polegadas cúbicas → display primário em cuft + secundário em cuin. */
function formatVolume(cuin: number): { primary: string; secondary: string } {
  const cuft = cuin / 1728;
  return {
    primary: `${formatNumber(cuft)} cu ft`,
    secondary: `${formatNumber(cuin)} cu in`,
  };
}

// ============================================
// TOKENIZER (público — testes dependem)
// ============================================

/**
 * Quebra expressão em tokens (números e operadores).
 * "5 1/2 + 3 1/4 - 2" → ["5 1/2", "+", "3 1/4", "-", "2"]
 */
export function tokenize(expression: string): string[] {
  const tokens: string[] = [];
  let current = '';
  const expr = expression.trim();

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    const nextChar = expr[i + 1] || '';

    if ((char === '+' || char === '-' || char === '*' || char === '/' || char === '×' || char === '÷')
        && current.trim() !== ''
        && (expr[i - 1] === ' ' || nextChar === ' ' || nextChar === '' || i === expr.length - 1)) {

      // Fração? Não é operador.
      if (char === '/' && /\d$/.test(current.trim()) && /^\d/.test(nextChar)) {
        current += char;
        continue;
      }

      if (current.trim()) tokens.push(current.trim());
      let op = char;
      if (char === '×') op = '*';
      if (char === '÷') op = '/';
      tokens.push(op);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

// ============================================
// EVALUATOR (Quantity-aware)
// ============================================

/**
 * Avalia uma lista de tokens já tokenizada aplicando PEMDAS e retorna
 * o valor decimal resultante em polegadas (para compat com testes legados).
 * SEM `eval()`. Para acessar a dimensão resultante, use `evaluateQuantity`.
 */
export function evaluateTokens(tokens: string[]): number {
  return evaluateQuantity(tokens).value;
}

/** Mesmo algoritmo do evaluateTokens, mas retorna `Quantity` com dim tracking. */
function evaluateQuantity(tokens: string[]): Quantity {
  if (tokens.length === 0) return { value: 0, dim: 0 };
  if (tokens.length === 1) return parseTokenToQuantity(tokens[0]);

  const values: (Quantity | string)[] = tokens.map((t, i) =>
    i % 2 === 0 ? parseTokenToQuantity(t) : t
  );

  // Passo 1: * e / (maior precedência)
  let i = 1;
  while (i < values.length) {
    const op = values[i];
    if (op === '*' || op === '/') {
      const left = values[i - 1] as Quantity;
      const right = values[i + 1] as Quantity;
      const result = op === '*' ? mulQ(left, right) : divQ(left, right);
      values.splice(i - 1, 3, result);
    } else {
      i += 2;
    }
  }

  // Passo 2: + e -
  i = 1;
  while (i < values.length) {
    const op = values[i];
    if (op === '+' || op === '-') {
      const left = values[i - 1] as Quantity;
      const right = values[i + 1] as Quantity;
      const result = op === '+' ? addQ(left, right) : subQ(left, right);
      values.splice(i - 1, 3, result);
    } else {
      i += 2;
    }
  }

  return values[0] as Quantity;
}

// ============================================
// PORCENTAGEM
// ============================================

function calculatePercentage(expr: string): CalculationResult | null {
  // "100 + 10%" = 110
  const pctAddSub = expr.match(/^([\d.]+)\s*([+-])\s*([\d.]+)\s*%$/);
  if (pctAddSub) {
    const base = parseFloat(pctAddSub[1]);
    const op = pctAddSub[2];
    const pct = parseFloat(pctAddSub[3]);
    const delta = base * (pct / 100);
    const value = op === '+' ? base + delta : base - delta;
    return buildScalarResult(value, expr);
  }

  // "20% de 150" ou "150 * 20%"
  const pctSimple =
    expr.match(/^([\d.]+)\s*%\s*(?:of|de|×|\*)?\s*([\d.]+)$/i) ||
    expr.match(/^([\d.]+)\s*(?:×|\*)\s*([\d.]+)\s*%$/);
  if (pctSimple) {
    const a = parseFloat(pctSimple[1]);
    const b = parseFloat(pctSimple[2]);
    const value =
      expr.includes('%') && expr.indexOf('%') < expr.length / 2
        ? (a / 100) * b
        : a * (b / 100);
    return buildScalarResult(value, expr);
  }

  return null;
}

// ============================================
// HELPERS PARA RESULTADO
// ============================================

function buildScalarResult(value: number, expression: string): CalculationResult {
  return {
    valueCanonical: value,
    dimension: 'scalar',
    unitCanonical: 'number',
    displayPrimary: formatNumber(value),
    displaySecondary: '—',

    resultFeetInches: formatNumber(value),
    resultTotalInches: '—',
    resultDecimal: value,
    expression,
    isInchMode: false,
  };
}

function buildErrorResult(expression: string): CalculationResult {
  return {
    valueCanonical: NaN,
    dimension: 'scalar',
    unitCanonical: 'number',
    displayPrimary: 'Error',
    displaySecondary: 'Error',

    resultFeetInches: 'Error',
    resultTotalInches: 'Error',
    resultDecimal: NaN,
    expression,
    isInchMode: true,
  };
}

function buildResultFromQuantity(q: Quantity, expression: string): CalculationResult {
  if (!isFinite(q.value)) return buildErrorResult(expression);

  switch (q.dim) {
    case 0:
      return buildScalarResult(q.value, expression);
    case 1: {
      const primary = formatInches(q.value);
      const secondary = formatTotalInches(q.value);
      return {
        valueCanonical: q.value,
        dimension: 'length',
        unitCanonical: 'in',
        displayPrimary: primary,
        displaySecondary: secondary,
        resultFeetInches: primary,
        resultTotalInches: secondary,
        resultDecimal: q.value,
        expression,
        isInchMode: true,
      };
    }
    case 2: {
      const { primary, secondary } = formatArea(q.value);
      return {
        valueCanonical: q.value,
        dimension: 'area',
        unitCanonical: 'sqin',
        displayPrimary: primary,
        displaySecondary: secondary,
        // Legacy fields: area no formato feet/inches não faz sentido — reusa displayPrimary.
        resultFeetInches: primary,
        resultTotalInches: secondary,
        resultDecimal: q.value,
        expression,
        isInchMode: false,
      };
    }
    case 3: {
      const { primary, secondary } = formatVolume(q.value);
      return {
        valueCanonical: q.value,
        dimension: 'volume',
        unitCanonical: 'cuin',
        displayPrimary: primary,
        displaySecondary: secondary,
        resultFeetInches: primary,
        resultTotalInches: secondary,
        resultDecimal: q.value,
        expression,
        isInchMode: false,
      };
    }
  }
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

/**
 * Calcula uma expressão de construção ou matemática pura.
 * Aceita: "5 1/2 + 3 1/4 - 2 * 1/2", "2' 6 + 3'", "100 + 10%", "25' × 30'".
 * Retorna `null` para entrada vazia.
 */
export function calculate(expression: string): CalculationResult | null {
  const expr = expression.trim();
  if (!expr) return null;

  try {
    if (expr.includes('%')) {
      const pct = calculatePercentage(expr);
      if (pct) return pct;
    }

    const tokens = tokenize(expr);
    if (tokens.length === 0) return buildErrorResult(expr);

    const q = evaluateQuantity(tokens);
    return buildResultFromQuantity(q, expr);
  } catch (error) {
    logger.calculator.error(String(error), expr);
    return buildErrorResult(expr);
  }
}
