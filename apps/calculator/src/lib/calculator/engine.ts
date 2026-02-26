// src/lib/calculator/engine.ts
// Engine de cálculo para medidas de construção (inches, feet, frações)
// Baseado no código original OnSite Calculator v3.2

import type { CalculationResult } from '../../types/calculator';
import { logger } from '../logger';

// ============================================
// CONVERSORES
// ============================================

/**
 * Converte um valor (com ou sem fração/feet) para polegadas decimais
 * Exemplos: "5 1/2" → 5.5, "3'" → 36, "2' 6" → 30, "7" → 7
 */
export function parseToInches(str: string): number {
  let s = str.trim().replace(/"/g, '');
  let totalInches = 0;
  
  // Verifica se tem feet (apóstrofo)
  if (s.includes("'")) {
    const parts = s.split("'");
    const feet = parseFloat(parts[0]) || 0;
    totalInches += feet * 12;
    s = parts[1] || '';
    s = s.trim();
  }
  
  if (!s) return totalInches;
  
  // Mixed number: "5 1/2" ou "10 3/8"
  const mixedMatch = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseFloat(mixedMatch[1]);
    const num = parseFloat(mixedMatch[2]);
    const den = parseFloat(mixedMatch[3]);
    return totalInches + whole + (num / den);
  }
  
  // Simple fraction: "1/2" ou "3/8"
  const fracMatch = s.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    return totalInches + (parseFloat(fracMatch[1]) / parseFloat(fracMatch[2]));
  }
  
  // Whole number or decimal
  return totalInches + (parseFloat(s) || 0);
}

/**
 * Formata polegadas decimais para formato de construção
 * Exemplo: 11.5 → "11 1/2""
 * Para números inteiros (sem fração), não mostra símbolo de polegadas
 * Exemplo: 20 → "20" (não "20"")
 */
export function formatInches(inches: number): string {
  if (!isFinite(inches)) return 'Error';

  const negative = inches < 0;
  inches = Math.abs(inches);

  const feet = Math.floor(inches / 12);
  const remaining = inches % 12;

  const whole = Math.floor(remaining);
  const frac = remaining - whole;

  // Arredonda para o 1/16 mais próximo
  const sixteenths = Math.round(frac * 16);
  let fracStr = '';
  let adjustedWhole = whole;

  if (sixteenths > 0 && sixteenths < 16) {
    const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
    const d = gcd(sixteenths, 16);
    fracStr = ` ${sixteenths / d}/${16 / d}`;
  } else if (sixteenths === 16) {
    // Arredondou pra cima
    adjustedWhole = whole + 1;
  }

  // Determina se tem fração ou feet (precisa de símbolos)
  const hasFraction = fracStr !== '';
  const hasFeet = feet > 0;

  let result = '';
  if (hasFeet) result += `${feet}' `;
  if (adjustedWhole > 0 || (feet === 0 && !fracStr)) result += adjustedWhole;
  result += fracStr;

  // Só adiciona " se tem fração ou feet (indica medida de construção)
  if (hasFraction || hasFeet) {
    result += '"';
  }

  return (negative ? '-' : '') + result.trim();
}

/**
 * Formata polegadas totais COM FRAÇÃO (não decimal)
 * Exemplo: 24.875 → "24 7/8 In"
 * Para números inteiros (sem fração), não mostra " In"
 * Exemplo: 20 → "20" (não "20 In")
 */
export function formatTotalInches(inches: number): string {
  if (!isFinite(inches)) return 'Error';

  const negative = inches < 0;
  inches = Math.abs(inches);

  const whole = Math.floor(inches);
  const frac = inches - whole;

  // Arredonda para o 1/16 mais próximo
  const sixteenths = Math.round(frac * 16);
  let fracStr = '';
  let adjustedWhole = whole;

  if (sixteenths > 0 && sixteenths < 16) {
    const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
    const d = gcd(sixteenths, 16);
    fracStr = ` ${sixteenths / d}/${16 / d}`;
  } else if (sixteenths === 16) {
    // Arredondou pra cima
    adjustedWhole = whole + 1;
  }

  const hasFraction = fracStr !== '';

  // Só adiciona " In" se tem fração (indica medida de construção)
  if (hasFraction) {
    return (negative ? '-' : '') + adjustedWhole + fracStr + ' In';
  }

  return (negative ? '-' : '') + adjustedWhole.toString();
}

/**
 * Formata número: inteiro sem decimais, quebrado com decimais
 * Exemplo: 2.0 → "2", 2.5 → "2.5"
 */
export function formatNumber(num: number): string {
  if (!isFinite(num)) return 'Error';
  
  if (Number.isInteger(num)) {
    return num.toString();
  }
  
  const fixed = num.toFixed(2);
  return parseFloat(fixed).toString();
}

// ============================================
// TOKENIZER
// ============================================

/**
 * Quebra a expressão em tokens (números e operadores)
 * "5 1/2 + 3 1/4 - 2" → ["5 1/2", "+", "3 1/4", "-", "2"]
 */
export function tokenize(expression: string): string[] {
  const tokens: string[] = [];
  let current = '';
  const expr = expression.trim();
  
  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];
    const nextChar = expr[i + 1] || '';
    
    // Operadores (com espaço antes ou depois indica que é operador, não fração)
    if ((char === '+' || char === '-' || char === '*' || char === '/' || char === '×' || char === '÷') 
        && current.trim() !== '' 
        && (expr[i-1] === ' ' || nextChar === ' ' || nextChar === '' || i === expr.length - 1)) {
      
      // Verifica se não é parte de uma fração (ex: 1/2)
      // Fração: número/número sem espaços ao redor
      if (char === '/' && /\d$/.test(current.trim()) && /^\d/.test(nextChar)) {
        // É uma fração, continua acumulando
        current += char;
        continue;
      }
      
      // É um operador
      if (current.trim()) {
        tokens.push(current.trim());
      }
      
      // Normaliza operadores
      let op = char;
      if (char === '×') op = '*';
      if (char === '÷') op = '/';
      tokens.push(op);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Último token
  if (current.trim()) {
    tokens.push(current.trim());
  }
  
  return tokens;
}

// ============================================
// PARSER/EVALUATOR (PEMDAS) - SEM EVAL!
// ============================================

/**
 * Avalia tokens respeitando PEMDAS
 * Primeiro processa * e /, depois + e -
 * SEGURO: Não usa eval() ou Function()
 */
export function evaluateTokens(tokens: string[]): number {
  if (tokens.length === 0) return 0;
  if (tokens.length === 1) return parseToInches(tokens[0]);
  
  // Converte valores para números (polegadas)
  const values: (number | string)[] = tokens.map((t, i) => {
    if (i % 2 === 0) {
      // Posição par = valor
      return parseToInches(t);
    }
    return t; // Operador
  });
  
  // PASSO 1: Processa * e / (maior precedência)
  let i = 1;
  while (i < values.length) {
    const op = values[i];
    if (op === '*' || op === '/') {
      const left = values[i - 1] as number;
      const right = values[i + 1] as number;
      let result: number;
      
      if (op === '*') {
        result = left * right;
      } else {
        result = right !== 0 ? left / right : NaN;
      }
      
      // Remove os 3 elementos (left, op, right) e insere o resultado
      values.splice(i - 1, 3, result);
      // Não incrementa i, pois o array encolheu
    } else {
      i += 2; // Pula para o próximo operador
    }
  }
  
  // PASSO 2: Processa + e - (menor precedência)
  i = 1;
  while (i < values.length) {
    const op = values[i];
    if (op === '+' || op === '-') {
      const left = values[i - 1] as number;
      const right = values[i + 1] as number;
      let result: number;
      
      if (op === '+') {
        result = left + right;
      } else {
        result = left - right;
      }
      
      values.splice(i - 1, 3, result);
      // Não incrementa i
    } else {
      i += 2;
    }
  }
  
  return values[0] as number;
}

// ============================================
// CÁLCULO DE PORCENTAGEM
// ============================================

function calculatePercentage(expr: string): CalculationResult | null {
  // Formato: "100 + 10%" = 100 + (100 * 0.10) = 110
  const percentMatch = expr.match(/^([\d.]+)\s*([+-])\s*([\d.]+)\s*%$/);
  if (percentMatch) {
    const base = parseFloat(percentMatch[1]);
    const op = percentMatch[2];
    const percent = parseFloat(percentMatch[3]);
    const percentValue = base * (percent / 100);
    const result = op === '+' ? base + percentValue : base - percentValue;
    
    return {
      resultFeetInches: formatNumber(result),
      resultTotalInches: formatNumber(result),
      resultDecimal: result,
      expression: expr,
      isInchMode: false
    };
  }
  
  // Porcentagem simples: "20% de 150" ou "150 * 20%"
  const simplePercentMatch = expr.match(/^([\d.]+)\s*%\s*(?:of|de|×|\*)?\s*([\d.]+)$/i) ||
                              expr.match(/^([\d.]+)\s*(?:×|\*)\s*([\d.]+)\s*%$/);
  if (simplePercentMatch) {
    const a = parseFloat(simplePercentMatch[1]);
    const b = parseFloat(simplePercentMatch[2]);
    const result = expr.includes('%') && expr.indexOf('%') < expr.length / 2 
      ? (a / 100) * b 
      : a * (b / 100);
    
    return {
      resultFeetInches: formatNumber(result),
      resultTotalInches: formatNumber(result),
      resultDecimal: result,
      expression: expr,
      isInchMode: false
    };
  }
  
  return null;
}

// ============================================
// CÁLCULO MATEMÁTICO PURO (SEGURO)
// ============================================

/**
 * Avalia expressão matemática pura SEM eval()
 * Usa o mesmo tokenizer/evaluator mas sem conversão de polegadas
 */
function calculatePureMath(expr: string): number | null {
  const cleanExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
  
  // Validação: só permite números, operadores e parênteses
  if (!/^[\d\s.+\-*/()]+$/.test(cleanExpr)) {
    return null;
  }
  
  // Tokeniza
  const tokens = tokenize(cleanExpr);
  if (tokens.length === 0) return null;
  
  // Avalia (sem conversão de polegadas)
  const values: (number | string)[] = tokens.map((t, i) => {
    if (i % 2 === 0) {
      const num = parseFloat(t);
      return isNaN(num) ? 0 : num;
    }
    return t;
  });
  
  // PEMDAS
  let i = 1;
  while (i < values.length) {
    const op = values[i];
    if (op === '*' || op === '/') {
      const left = values[i - 1] as number;
      const right = values[i + 1] as number;
      const result = op === '*' ? left * right : (right !== 0 ? left / right : NaN);
      values.splice(i - 1, 3, result);
    } else {
      i += 2;
    }
  }
  
  i = 1;
  while (i < values.length) {
    const op = values[i];
    if (op === '+' || op === '-') {
      const left = values[i - 1] as number;
      const right = values[i + 1] as number;
      const result = op === '+' ? left + right : left - right;
      values.splice(i - 1, 3, result);
    } else {
      i += 2;
    }
  }
  
  return values[0] as number;
}

// ============================================
// FUNÇÃO PRINCIPAL DE CÁLCULO
// ============================================

/**
 * Calcula uma expressão de construção ou matemática pura
 * Aceita: "5 1/2 + 3 1/4 - 2 * 1/2", "2' 6 + 3'", "100 + 10%", "5 * 3"
 * 
 * @param expression - Expressão a calcular
 * @returns Resultado formatado ou null se inválido
 */
export function calculate(expression: string): CalculationResult | null {
  const expr = expression.trim();
  if (!expr) return null;
  
  try {
    // PORCENTAGEM: Trata separadamente
    if (expr.includes('%')) {
      const percentResult = calculatePercentage(expr);
      if (percentResult) return percentResult;
    }
    
    // Verifica se tem conteúdo de polegadas (frações, feet, ou aspas)
    const hasInchContent = /['"]|\d+\/\d+/.test(expr);
    
    // Se não tem conteúdo de polegadas, trata como matemática pura
    if (!hasInchContent) {
      const pureResult = calculatePureMath(expr);
      if (pureResult !== null && isFinite(pureResult)) {
        // Matemática pura: apenas resultado decimal, sem conversão para inches
        return {
          resultFeetInches: formatNumber(pureResult),
          resultTotalInches: '—', // Traço indica "não aplicável"
          resultDecimal: pureResult,
          expression: expr,
          isInchMode: false  // Modo decimal puro
        };
      }
    }
    
    // Tokeniza e avalia como expressão de polegadas
    const tokens = tokenize(expr);
    
    if (tokens.length === 0) {
      return { 
        resultFeetInches: 'Error', 
        resultTotalInches: 'Error',
        resultDecimal: 0,
        expression: expr,
        isInchMode: true
      };
    }
    
    const resultInches = evaluateTokens(tokens);
    const formattedFeetInches = formatInches(resultInches);
    const formattedTotalInches = formatTotalInches(resultInches);
    
    return {
      resultFeetInches: formattedFeetInches,
      resultTotalInches: formattedTotalInches,
      resultDecimal: resultInches,
      expression: expr,
      isInchMode: true
    };
    
  } catch (error) {
    logger.calculator.error(String(error), expr);
    return {
      resultFeetInches: 'Error',
      resultTotalInches: 'Error',
      resultDecimal: 0,
      expression: expr,
      isInchMode: true
    };
  }
}
