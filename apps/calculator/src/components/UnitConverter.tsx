// src/components/UnitConverter.tsx
// Unit Converter with same layout style as Easy-Square
// Supports: in, ft, yd, mm, cm, m

import { useState, useCallback } from 'react';

type UnitType = 'in' | 'ft' | 'yd' | 'mm' | 'cm' | 'm';

const FRACTION_PAD = [
  ['1/8"', '1/4"', '3/8"', '1/2"'],
  ['5/8"', '3/4"', '7/8"', "'ft"],
];

// Decimal equivalents for fractions
const FRACTION_DECIMALS: Record<string, number> = {
  '1/8"': 1/8,
  '1/4"': 1/4,
  '3/8"': 3/8,
  '1/2"': 1/2,
  '5/8"': 5/8,
  '3/4"': 3/4,
  '7/8"': 7/8,
};

interface ConversionResult {
  value: number;
  fromUnit: UnitType;
  toUnit: UnitType;
  result: number;
  formatted: string;
}

// Conversion factors to meters (base unit)
const TO_METERS: Record<UnitType, number> = {
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mm: 0.001,
  cm: 0.01,
  m: 1,
};

// Unit display names
const UNIT_LABELS: Record<UnitType, string> = {
  in: 'Inches',
  ft: 'Feet',
  yd: 'Yards',
  mm: 'Millimeters',
  cm: 'Centimeters',
  m: 'Meters',
};

// Short symbols
const UNIT_SYMBOLS: Record<UnitType, string> = {
  in: '"',
  ft: "'",
  yd: 'yd',
  mm: 'mm',
  cm: 'cm',
  m: 'm',
};

interface UnitConverterProps {
  onVoiceRequest?: () => void;
  isRecording?: boolean;
  voiceEnabled?: boolean;
}

export default function UnitConverter({}: UnitConverterProps) {
  const [inputValue, setInputValue] = useState('');
  const [fromUnit, setFromUnit] = useState<UnitType>('mm');
  const [toUnit, setToUnit] = useState<UnitType>('in');
  const [result, setResult] = useState<ConversionResult | null>(null);

  // Convert value between units
  const convert = useCallback((value: number, from: UnitType, to: UnitType): number => {
    const inMeters = value * TO_METERS[from];
    return inMeters / TO_METERS[to];
  }, []);

  // Format result with appropriate precision
  const formatResult = useCallback((value: number, unit: UnitType): string => {
    if (unit === 'in' || unit === 'ft' || unit === 'yd') {
      const rounded = Math.round(value * 10000) / 10000;
      const fraction = findNearestFraction(value % 1);
      const whole = Math.floor(value);

      if (fraction && Math.abs((whole + fraction.decimal) - value) < 0.01) {
        if (whole === 0) {
          return `${fraction.display}${UNIT_SYMBOLS[unit]}`;
        }
        return `${whole} ${fraction.display}${UNIT_SYMBOLS[unit]}`;
      }

      return `${rounded}${UNIT_SYMBOLS[unit]}`;
    }

    const rounded = Math.round(value * 100) / 100;
    return `${rounded}${UNIT_SYMBOLS[unit]}`;
  }, []);

  // Find nearest common fraction
  const findNearestFraction = (decimal: number): { display: string; decimal: number } | null => {
    const fractions = [
      { display: '1/16', decimal: 1/16 },
      { display: '1/8', decimal: 1/8 },
      { display: '3/16', decimal: 3/16 },
      { display: '1/4', decimal: 1/4 },
      { display: '5/16', decimal: 5/16 },
      { display: '3/8', decimal: 3/8 },
      { display: '7/16', decimal: 7/16 },
      { display: '1/2', decimal: 1/2 },
      { display: '9/16', decimal: 9/16 },
      { display: '5/8', decimal: 5/8 },
      { display: '11/16', decimal: 11/16 },
      { display: '3/4', decimal: 3/4 },
      { display: '13/16', decimal: 13/16 },
      { display: '7/8', decimal: 7/8 },
      { display: '15/16', decimal: 15/16 },
    ];

    for (const f of fractions) {
      if (Math.abs(f.decimal - decimal) < 0.02) {
        return f;
      }
    }
    return null;
  };

  // Execute conversion
  const handleConvert = useCallback(() => {
    const value = parseFloat(inputValue);
    if (isNaN(value)) {
      setResult(null);
      return;
    }

    const resultValue = convert(value, fromUnit, toUnit);
    setResult({
      value,
      fromUnit,
      toUnit,
      result: resultValue,
      formatted: formatResult(resultValue, toUnit),
    });
  }, [inputValue, fromUnit, toUnit, convert, formatResult]);

  // Swap units
  const handleSwapUnits = useCallback(() => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);

    if (result) {
      const newResult = convert(result.result, toUnit, fromUnit);
      setInputValue(result.result.toString());
      setResult({
        value: result.result,
        fromUnit: toUnit,
        toUnit: fromUnit,
        result: newResult,
        formatted: formatResult(newResult, fromUnit),
      });
    }
  }, [fromUnit, toUnit, result, convert, formatResult]);

  // Clear all
  const handleClear = useCallback(() => {
    setInputValue('');
    setResult(null);
  }, []);

  // Process keypad input
  const handleKeyPress = useCallback((key: string) => {
    if (key === 'C') {
      handleClear();
    } else if (key === 'DEL') {
      setInputValue(prev => prev.slice(0, -1));
    } else if (key === 'OK') {
      handleConvert();
    } else if (key === '.' && inputValue.includes('.')) {
      return;
    } else {
      setInputValue(prev => prev + key);
    }
  }, [inputValue, handleClear, handleConvert]);

  // Handle fraction pad: append decimal value or switch to feet
  const handleFractionClick = useCallback((frac: string) => {
    if (frac === "'ft") {
      // Switch "from" unit to feet
      setFromUnit('ft');
      return;
    }
    const decimal = FRACTION_DECIMALS[frac];
    if (decimal !== undefined) {
      setInputValue(prev => {
        const num = parseFloat(prev) || 0;
        const whole = Math.floor(num);
        return String(whole + decimal);
      });
    }
  }, []);

  const units: UnitType[] = ['in', 'ft', 'yd', 'mm', 'cm', 'm'];

  return (
    <div className="unit-converter">
      {/* Header */}
      <div className="unit-converter-header">
        <img src="/images/logo-onsite-club-02.png" alt="OnSite" className="easy-square-logo" />
        <span className="unit-converter-title">Unit Converter</span>
      </div>

      {/* Content Container */}
      <div className="content-container">
        {/* Display Area */}
        <div className="unit-converter-display">
        {/* From */}
        <div className="unit-converter-row">
          <div className="unit-converter-value">
            {inputValue || '0'}
          </div>
          <select
            className="unit-converter-select"
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value as UnitType)}
          >
            {units.map(u => (
              <option key={u} value={u}>{UNIT_LABELS[u]}</option>
            ))}
          </select>
        </div>

        {/* Swap button */}
        <button className="unit-converter-swap" onClick={handleSwapUnits}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 16V4M7 4L3 8M7 4L11 8" />
            <path d="M17 8V20M17 20L21 16M17 20L13 16" />
          </svg>
        </button>

        {/* To */}
        <div className="unit-converter-row">
          <div className="unit-converter-result">
            {result ? result.formatted : '—'}
          </div>
          <select
            className="unit-converter-select"
            value={toUnit}
            onChange={(e) => setToUnit(e.target.value as UnitType)}
          >
            {units.map(u => (
              <option key={u} value={u}>{UNIT_LABELS[u]}</option>
            ))}
          </select>
        </div>
      </div>

        {/* Quick presets */}
        <div className="unit-converter-presets">
          <button
            className="unit-converter-preset"
            onClick={() => { setFromUnit('mm'); setToUnit('in'); }}
          >
            mm → in
          </button>
          <button
            className="unit-converter-preset"
            onClick={() => { setFromUnit('in'); setToUnit('cm'); }}
          >
            in → cm
          </button>
          <button
            className="unit-converter-preset"
            onClick={() => { setFromUnit('ft'); setToUnit('m'); }}
          >
            ft → m
          </button>
        </div>
      </div>

      {/* Fraction Pad - same as Stairs/Triangle */}
      <div className="easy-square-fractions">
        {FRACTION_PAD.flat().map((frac, i) => (
          <button
            key={i}
            className={`frac-btn ${frac === "'ft" ? 'feet' : ''}`}
            onClick={() => handleFractionClick(frac)}
          >
            {frac}
          </button>
        ))}
      </div>

      {/* Keypad - same layout as Stairs/Triangle with DEL and . swapped */}
      <div className="easy-square-keypad">
        <div className="easy-square-row">
          {['7', '8', '9'].map(key => (
            <button key={key} className="easy-square-key" onClick={() => handleKeyPress(key)}>{key}</button>
          ))}
          <button className="easy-square-key" onClick={() => handleKeyPress('DEL')}>&#9003;</button>
        </div>
        <div className="easy-square-row">
          {['4', '5', '6'].map(key => (
            <button key={key} className="easy-square-key" onClick={() => handleKeyPress(key)}>{key}</button>
          ))}
          <button className="easy-square-key action" onClick={() => handleKeyPress('C')}>C</button>
        </div>
        <div className="easy-square-row">
          {['1', '2', '3'].map(key => (
            <button key={key} className="easy-square-key" onClick={() => handleKeyPress(key)}>{key}</button>
          ))}
          <button className="easy-square-key primary" onClick={() => handleKeyPress('OK')}>OK</button>
        </div>
        <div className="easy-square-row">
          <button className="easy-square-key" onClick={() => handleKeyPress('0')}>0</button>
          <button className="easy-square-key" onClick={() => handleKeyPress('.')}>.</button>
        </div>
      </div>
    </div>
  );
}
