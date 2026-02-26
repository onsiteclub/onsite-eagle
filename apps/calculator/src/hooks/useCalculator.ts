// src/hooks/useCalculator.ts
// Hook principal para lógica da calculadora

import { useState, useCallback } from 'react';
import { calculate, type CalculationResult } from '../lib/calculator';
import { saveCalculation, type InputMethod } from '../lib/calculations';
import { logger } from '../lib/logger';

interface SaveOptions {
  userId?: string;
  inputMethod?: InputMethod;
  voiceLogId?: string;
  tradeContext?: string;
  appVersion?: string;
}

interface UseCalculatorReturn {
  expression: string;
  setExpression: (value: string) => void;
  setExpressionAndCompute: (value: string, saveOptions?: SaveOptions) => CalculationResult | null;
  displayValue: string;
  lastResult: CalculationResult | null;
  justCalculated: boolean;
  lastCalculationId: string | null;

  // Ações
  compute: (saveOptions?: SaveOptions) => CalculationResult | null;
  clear: () => void;
  backspace: () => void;
  appendKey: (key: string) => void;
  appendFraction: (fraction: string) => void;
  appendOperator: (operator: string) => void;
  loadResult: (result: CalculationResult) => void;
}

/**
 * Hook que encapsula toda a lógica da calculadora
 * Gerencia expressão, resultado, e memória
 */
export function useCalculator(): UseCalculatorReturn {
  const [expression, setExpression] = useState('');
  const [displayValue, setDisplayValue] = useState('0');
  const [lastResult, setLastResult] = useState<CalculationResult | null>(null);
  const [justCalculated, setJustCalculated] = useState(false);
  const [lastCalculationId, setLastCalculationId] = useState<string | null>(null);

  // Calcular resultado
  const compute = useCallback((saveOptions?: SaveOptions) => {
    const result = calculate(expression);
    if (result) {
      setDisplayValue(result.resultFeetInches);
      setLastResult(result);
      setJustCalculated(true);

      // Log do cálculo
      logger.calculator.compute(true, {
        expression,
        result: result.resultFeetInches,
        inputMethod: saveOptions?.inputMethod || 'keyboard',
      });

      // Salvar cálculo no banco (async, não bloqueia)
      if (saveOptions?.userId) {
        saveCalculation(result, saveOptions).then(id => {
          if (id) setLastCalculationId(id);
        });
      }
    } else if (expression) {
      // Log de falha no cálculo
      logger.calculator.compute(false, { expression });
    }
    return result;
  }, [expression]);

  // Limpar tudo
  const clear = useCallback(() => {
    setExpression('');
    setDisplayValue('0');
    setLastResult(null);
    setJustCalculated(false);
  }, []);

  // Apagar último caractere
  const backspace = useCallback(() => {
    setExpression(prev => prev.slice(0, -1));
    setJustCalculated(false);
  }, []);

  // Adicionar tecla (número ou ponto)
  const appendKey = useCallback((key: string) => {
    if (justCalculated) {
      // Começar nova expressão após resultado
      setExpression(key);
      setJustCalculated(false);
    } else {
      setExpression(prev => prev + key);
    }
  }, [justCalculated]);

  // Adicionar fração
  const appendFraction = useCallback((fraction: string) => {
    const value = fraction.replace('"', '');
    
    if (justCalculated && lastResult) {
      // Após resultado, começar nova expressão
      setExpression(value);
      setJustCalculated(false);
    } else if (expression && /\d$/.test(expression)) {
      // Adiciona com espaço se já houver número (mixed number: "5 1/2")
      setExpression(prev => prev + ' ' + value);
    } else {
      setExpression(prev => prev + value);
    }
  }, [justCalculated, lastResult, expression]);

  // Adicionar operador (com memória automática)
  const appendOperator = useCallback((operator: string) => {
    const op = ` ${operator} `;
    
    if (justCalculated && lastResult) {
      // MEMÓRIA: Usa resultado anterior como primeiro elemento
      const previousResult = lastResult.isInchMode 
        ? lastResult.resultFeetInches.replace('"', '')
        : lastResult.resultFeetInches;
      
      setExpression(previousResult + op);
      setJustCalculated(false);
    } else {
      setExpression(prev => {
        // Replace trailing operator if exists (standard calculator behavior)
        const replaced = prev.trimEnd().replace(/\s*[+\-*/%]\s*$/, '');
        return replaced + op;
      });
    }
  }, [justCalculated, lastResult]);

  // Atualizar expressão diretamente (para voice input)
  const handleSetExpression = useCallback((value: string) => {
    setExpression(value);
    setJustCalculated(false);
  }, []);

  // Seta expressão e calcula imediatamente (para voice input)
  // NOVO: Se expressão começa com operador, continua do resultado anterior
  const setExpressionAndCompute = useCallback((value: string, saveOptions?: SaveOptions) => {
    // Sanitizar separadores de milhar que GPT pode inserir (ex: "10.000" → "10000", "10,000" → "10000")
    // Regra: ponto ou vírgula seguido de exatamente 3 dígitos = separador de milhar (não decimal)
    let sanitized = value;
    let prev;
    do { prev = sanitized; sanitized = sanitized.replace(/(\d),(\d{3})(?=\D|$)/g, '$1$2'); } while (sanitized !== prev);
    do { prev = sanitized; sanitized = sanitized.replace(/(\d)\.(\d{3})(?=\D|$)/g, '$1$2'); } while (sanitized !== prev);

    // Sanitizar "N / 100" → "N%" (GPT às vezes converte "por cento" para "/ 100")
    sanitized = sanitized.replace(/(\d+)\s*\/\s*100\b/g, '$1%');

    // Remove palavras/letras — só permite números, operadores, frações e símbolos de medida
    sanitized = sanitized.replace(/[a-zA-ZÀ-ÿ]+/g, '').replace(/\s{2,}/g, ' ').trim();

    let finalExpression = sanitized;

    // Verifica se começa com operador (+, -, *, /, %)
    const trimmed = value.trim();
    const startsWithOperator = /^[+\-*/%×÷]/.test(trimmed);

    if (startsWithOperator && lastResult) {
      // Usa o resultado anterior como base
      const previousResult = lastResult.isInchMode
        ? lastResult.resultFeetInches.replace('"', '')  // Remove aspas finais para inches
        : lastResult.resultDecimal.toString();

      // Se o operador está colado (ex: "+10"), adiciona espaço
      // Se já tem espaço (ex: "+ 10"), mantém
      const operatorMatch = trimmed.match(/^([+\-*/%×÷])\s*/);
      if (operatorMatch) {
        const operator = operatorMatch[0];
        const rest = trimmed.slice(operator.length);
        finalExpression = `${previousResult} ${operator.trim()} ${rest}`;
      }

      console.log('[useCalculator] Voice continuation detected:', {
        original: value,
        previousResult,
        finalExpression,
      });
    }

    setExpression(finalExpression);
    const result = calculate(finalExpression);
    if (result) {
      setDisplayValue(result.resultFeetInches);
      setLastResult(result);
      setJustCalculated(true);

      // Log do cálculo via voz
      logger.calculator.compute(true, {
        expression: finalExpression,
        result: result.resultFeetInches,
        inputMethod: saveOptions?.inputMethod || 'voice',
      });

      // Salvar cálculo no banco (async, não bloqueia)
      if (saveOptions?.userId) {
        saveCalculation(result, saveOptions).then(id => {
          if (id) setLastCalculationId(id);
        });
      }
    } else if (finalExpression) {
      // Log de falha no cálculo via voz
      logger.calculator.compute(false, { expression: finalExpression, inputMethod: 'voice' });
    }
    return result;
  }, [lastResult]);

  // Carregar resultado do histórico
  const loadResult = useCallback((result: CalculationResult) => {
    setExpression(result.expression);
    setDisplayValue(result.resultFeetInches);
    setLastResult(result);
    setJustCalculated(true);
    
    logger.calculator.compute(true, {
      expression: result.expression,
      result: result.resultFeetInches,
      inputMethod: 'history',
    });
  }, []);

  return {
    expression,
    setExpression: handleSetExpression,
    setExpressionAndCompute,
    displayValue,
    lastResult,
    justCalculated,
    lastCalculationId,
    compute,
    clear,
    backspace,
    appendKey,
    appendFraction,
    appendOperator,
    loadResult,
  };
}
