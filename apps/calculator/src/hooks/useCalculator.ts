// src/hooks/useCalculator.ts
// State + action layer over the engine. Owns the current expression string,
// the latest CalculationResult, and the chained-operation memory (`+10` after
// a result becomes `<previous-result> + 10`).

import { useState, useCallback } from 'react';
import { calculate, type CalculationResult } from '../engine';
import { saveCalculation, type InputMethod } from '../lib/calculations';
import { sanitizeExpression } from '../lib/sanitize-expression';
import { logger } from '../lib/logger';
import { logger as pkgLogger } from '@onsite/logger';

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
  /** Pre-formatted primary display string. "" before the first compute, "Erro"
   *  on the most recent failure, otherwise the engine's `primary.value`. */
  displayValue: string;
  lastResult: CalculationResult | null;
  justCalculated: boolean;
  lastCalculationId: string | null;

  compute: (saveOptions?: SaveOptions) => CalculationResult | null;
  clear: () => void;
  backspace: () => void;
  appendKey: (key: string) => void;
  appendFraction: (fraction: string) => void;
  appendOperator: (operator: string) => void;
  loadResult: (result: CalculationResult) => void;
}

/** The continuation rule: if the user types an operator-leading expression
 *  ("+10", "* 3") right after a successful compute, prepend the previous
 *  primary.value so the new expression chains. The previous primary is
 *  already engine-parseable (e.g. `8 3/4"`, `6 m`, `96`). */
function chainedExpression(value: string, prev: CalculationResult | null): string {
  const trimmed = value.trim();
  const startsWithOp = /^[+\-*/%×÷]/.test(trimmed);
  if (!startsWithOp || !prev || prev.isError) return value;
  // Engine already accepts the formatted forms as input — pass primary.value
  // directly. Strip any trailing inch quote because the engine's tokenizer
  // wants either feet+inches or bare inches on a single number, not both
  // floating around.
  const previous = prev.primary.value;
  const opMatch = trimmed.match(/^([+\-*/%×÷])\s*/);
  if (!opMatch) return value;
  const operator = opMatch[0];
  const rest = trimmed.slice(operator.length);
  return `${previous} ${operator.trim()} ${rest}`;
}

export function useCalculator(): UseCalculatorReturn {
  const [expression, setExpression] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [lastResult, setLastResult] = useState<CalculationResult | null>(null);
  const [justCalculated, setJustCalculated] = useState(false);
  const [lastCalculationId, setLastCalculationId] = useState<string | null>(null);

  const compute = useCallback((saveOptions?: SaveOptions) => {
    const result = calculate(expression);
    if (result) {
      setDisplayValue(result.primary.value || (result.isError ? 'Error' : ''));
      setLastResult(result);
      setJustCalculated(true);

      logger.calculator.compute(!result.isError, {
        expression: result.expression,
        result: result.primary.value,
        inputMethod: saveOptions?.inputMethod || 'keyboard',
      });

      if (saveOptions?.userId && !result.isError) {
        saveCalculation(result, saveOptions).then((id) => {
          if (id) setLastCalculationId(id);
        });
      }
    } else if (expression) {
      logger.calculator.compute(false, { expression });
    }
    return result;
  }, [expression]);

  const clear = useCallback(() => {
    setExpression('');
    setDisplayValue('');
    setLastResult(null);
    setJustCalculated(false);
  }, []);

  const backspace = useCallback(() => {
    setExpression((prev) => prev.slice(0, -1));
    setJustCalculated(false);
  }, []);

  const appendKey = useCallback((key: string) => {
    if (justCalculated) {
      setExpression(key);
      setJustCalculated(false);
    } else {
      setExpression((prev) => prev + key);
    }
  }, [justCalculated]);

  const appendFraction = useCallback((fraction: string) => {
    const value = fraction.replace('"', '');
    if (justCalculated && lastResult && !lastResult.isError) {
      setExpression(value);
      setJustCalculated(false);
    } else if (expression && /\d$/.test(expression)) {
      setExpression((prev) => prev + ' ' + value);
    } else {
      setExpression((prev) => prev + value);
    }
  }, [justCalculated, lastResult, expression]);

  const appendOperator = useCallback((operator: string) => {
    const op = ` ${operator} `;
    if (justCalculated && lastResult && !lastResult.isError) {
      setExpression(lastResult.primary.value + op);
      setJustCalculated(false);
    } else {
      setExpression((prev) => {
        const replaced = prev.trimEnd().replace(/\s*[+\-*/%]\s*$/, '');
        return replaced + op;
      });
    }
  }, [justCalculated, lastResult]);

  const handleSetExpression = useCallback((value: string) => {
    setExpression(value);
    setJustCalculated(false);
  }, []);

  /** Direct compute used by voice/text-parser inputs. Sanitizes and chains. */
  const setExpressionAndCompute = useCallback((value: string, saveOptions?: SaveOptions) => {
    let sanitized = sanitizeExpression(value);
    sanitized = sanitized.replace(/\s{2,}/g, ' ').trim();
    const finalExpression = chainedExpression(sanitized, lastResult);

    setExpression(finalExpression);
    const result = calculate(finalExpression);
    if (result) {
      setDisplayValue(result.primary.value || (result.isError ? 'Error' : ''));
      setLastResult(result);
      setJustCalculated(true);

      pkgLogger.debug('ENGINE', 'setExpressionAndCompute', {
        original: value,
        finalExpression,
        primary: result.primary.value,
      });

      logger.calculator.compute(!result.isError, {
        expression: result.expression,
        result: result.primary.value,
        inputMethod: saveOptions?.inputMethod || 'voice',
      });

      if (saveOptions?.userId && !result.isError) {
        saveCalculation(result, saveOptions).then((id) => {
          if (id) setLastCalculationId(id);
        });
      }
    } else if (finalExpression) {
      logger.calculator.compute(false, { expression: finalExpression, inputMethod: 'voice' });
    }
    return result;
  }, [lastResult]);

  const loadResult = useCallback((result: CalculationResult) => {
    setExpression(result.expression);
    setDisplayValue(result.primary.value || (result.isError ? 'Error' : ''));
    setLastResult(result);
    setJustCalculated(true);
    logger.calculator.compute(!result.isError, {
      expression: result.expression,
      result: result.primary.value,
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
