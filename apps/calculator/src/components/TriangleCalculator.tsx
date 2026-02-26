import { useState, useCallback, useEffect, useRef } from 'react';
import { parseToInches, formatInches } from '../lib/calculator/engine';

type SideType = 'a' | 'b' | 'c'; // a = base, b = height, c = hypotenuse

const FRACTION_PAD = [
  ['1/8"', '1/4"', '3/8"', '1/2"'],
  ['5/8"', '3/4"', '7/8"', "'ft"],
];

interface TriangleCalculatorProps {
  voiceEnabled?: boolean;
  isRecording?: boolean;
}

export default function TriangleCalculator(_props: TriangleCalculatorProps) {
  // The two "user-set" sides (editHistory[0] = older, editHistory[1] = most recent)
  // The third side is always computed.
  const [editHistory, setEditHistory] = useState<[SideType, SideType]>(['a', 'b']);
  const [sideA, setSideA] = useState('3');
  const [sideB, setSideB] = useState('4');
  const [sideC, setSideC] = useState('5');
  const [activeSide, setActiveSide] = useState<SideType | null>(null);
  const isTyping = useRef(false);

  const getComputedSide = (history: [SideType, SideType]): SideType => {
    const sides: SideType[] = ['a', 'b', 'c'];
    return sides.find(s => !history.includes(s))!;
  };

  const getSideValue = (side: SideType): string => {
    return side === 'a' ? sideA : side === 'b' ? sideB : sideC;
  };

  const setSideValue = (side: SideType, value: string) => {
    if (side === 'a') setSideA(value);
    else if (side === 'b') setSideB(value);
    else setSideC(value);
  };

  // Recalculate the computed side whenever user-set sides change
  useEffect(() => {
    const computed = getComputedSide(editHistory);
    const [side1, side2] = editHistory;
    const v1 = parseToInches(getSideValue(side1));
    const v2 = parseToInches(getSideValue(side2));

    if (v1 > 0 && v2 > 0) {
      let result: number;

      if (computed === 'c') {
        // Computing hypotenuse: c = sqrt(a² + b²)
        result = Math.sqrt(v1 * v1 + v2 * v2);
      } else {
        // Computing a leg: need to know which of the two user-set sides is the hypotenuse
        const hypValue = side1 === 'c' ? v1 : side2 === 'c' ? v2 : 0;
        const legValue = side1 === 'c' ? v2 : side2 === 'c' ? v1 : 0;

        if (hypValue > 0 && legValue > 0 && hypValue > legValue) {
          result = Math.sqrt(hypValue * hypValue - legValue * legValue);
        } else {
          return; // Can't compute (hypotenuse must be largest)
        }
      }

      if (result > 0 && isFinite(result)) {
        setSideValue(computed, formatInches(result));
      }
    }
  }, [sideA, sideB, sideC, editHistory]);

  // When user clicks a side
  const handleSideClick = (side: SideType) => {
    setActiveSide(side);
    isTyping.current = true;

    // Update edit history: the clicked side becomes active (most recent user-edited)
    setEditHistory(prev => {
      if (prev.includes(side)) {
        // Already in history, move to end (most recent)
        const other = prev.find(s => s !== side)!;
        return [other, side];
      } else {
        // Not in history, replace the older entry
        return [prev[1], side];
      }
    });

    // Clear the field for new input
    setSideValue(side, '');
  };

  const getCurrentValue = (): string => {
    if (!activeSide) return '';
    return getSideValue(activeSide);
  };

  // Check if value ends with a complete fraction (auto-jump trigger)
  const isCompleteWithFraction = (value: string): boolean => {
    return /\d+\/\d+$/.test(value.trim());
  };

  // Move to next empty or next side
  const jumpToNext = useCallback(() => {
    if (!activeSide) return;
    const order: SideType[] = ['a', 'b', 'c'];
    const currentIdx = order.indexOf(activeSide);
    const next = order[(currentIdx + 1) % 3];
    setActiveSide(next);
    isTyping.current = false;
  }, [activeSide]);

  const handleFractionClick = useCallback((frac: string) => {
    if (!activeSide) return;
    const current = getCurrentValue();
    let newValue: string;

    if (frac === "'ft") {
      newValue = current + "' ";
      setSideValue(activeSide, newValue);
    } else {
      const value = frac.replace('"', '');
      if (current && /\d$/.test(current)) {
        newValue = current + ' ' + value;
      } else {
        newValue = current + value;
      }
      setSideValue(activeSide, newValue);

      // Auto-jump after fraction (nothing more to type)
      if (isCompleteWithFraction(newValue)) {
        setTimeout(() => jumpToNext(), 150);
      }
    }
  }, [activeSide, sideA, sideB, sideC, jumpToNext]);

  const handleKeyPress = useCallback((key: string) => {
    if (!activeSide) return;
    const currentValue = getCurrentValue();

    if (key === 'C') {
      // Clear all, reset to defaults
      setSideA('3');
      setSideB('4');
      setSideC('5');
      setEditHistory(['a', 'b']);
      setActiveSide(null);
      isTyping.current = false;
    } else if (key === 'DEL') {
      setSideValue(activeSide, currentValue.slice(0, -1));
    } else if (key === 'OK') {
      jumpToNext();
    } else if (key === '.' && currentValue.includes('.')) {
      return;
    } else {
      setSideValue(activeSide, currentValue + key);
    }
  }, [activeSide, sideA, sideB, sideC, jumpToNext]);

  // Presets
  const presets = [
    { label: '3-4-5', a: '3', b: '4', c: '5' },
    { label: '12-16-20', a: '12', b: '16', c: '20' },
    { label: '15-20-25', a: '15', b: '20', c: '25' },
  ];

  const applyPreset = (preset: { a: string; b: string; c: string }) => {
    setSideA(preset.a);
    setSideB(preset.b);
    setSideC(preset.c);
    setEditHistory(['a', 'b']);
    setActiveSide(null);
    isTyping.current = false;
  };

  return (
    <div className="easy-square">
      {/* Content Container */}
      <div className="content-container">
        {/* Triangle visual with inputs */}
        <div className="easy-square-triangle">
          <svg viewBox="0 0 240 200" className="easy-square-svg">
            <defs>
              <marker id="arrow-start" markerWidth="8" markerHeight="6" refX="0" refY="3" orient="auto">
                <path d="M8,0 L0,3 L8,6" fill="none" stroke="#5C6B7A" strokeWidth="1" />
              </marker>
              <marker id="arrow-end" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <path d="M0,0 L8,3 L0,6" fill="none" stroke="#5C6B7A" strokeWidth="1" />
              </marker>
            </defs>

            {/* Triangle fill */}
            <polygon
              points="30,138 195,138 195,18"
              fill="rgba(15, 61, 58, 0.08)"
              stroke="#0F3D3A"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Right angle square */}
            <path
              d="M177,138 L177,120 L195,120"
              fill="none"
              stroke="#0F3D3A"
              strokeWidth="1.5"
            />

            {/* Dimension line A (base) - below */}
            <line x1="30" y1="155" x2="195" y2="155" stroke="#5C6B7A" strokeWidth="1" markerStart="url(#arrow-start)" markerEnd="url(#arrow-end)" />
            <line x1="30" y1="138" x2="30" y2="160" stroke="#5C6B7A" strokeWidth="0.5" strokeDasharray="3,2" />
            <line x1="195" y1="138" x2="195" y2="160" stroke="#5C6B7A" strokeWidth="0.5" strokeDasharray="3,2" />

            {/* Dimension line B (height) - right */}
            <line x1="212" y1="18" x2="212" y2="138" stroke="#5C6B7A" strokeWidth="1" markerStart="url(#arrow-start)" markerEnd="url(#arrow-end)" />
            <line x1="195" y1="18" x2="217" y2="18" stroke="#5C6B7A" strokeWidth="0.5" strokeDasharray="3,2" />
            <line x1="195" y1="138" x2="217" y2="138" stroke="#5C6B7A" strokeWidth="0.5" strokeDasharray="3,2" />
          </svg>

          {/* C = hypotenuse (diagonal) */}
          <div
            className={`easy-square-input easy-square-input-c ${activeSide === 'c' ? 'active' : ''} ${getComputedSide(editHistory) === 'c' ? 'computed' : ''}`}
            onClick={() => handleSideClick('c')}
          >
            {sideC || ''}
          </div>

          {/* B = height (right side) */}
          <div
            className={`easy-square-input easy-square-input-b ${activeSide === 'b' ? 'active' : ''} ${getComputedSide(editHistory) === 'b' ? 'computed' : ''}`}
            onClick={() => handleSideClick('b')}
          >
            {sideB || ''}
          </div>

          {/* A = base (bottom) */}
          <div
            className={`easy-square-input easy-square-input-a ${activeSide === 'a' ? 'active' : ''} ${getComputedSide(editHistory) === 'a' ? 'computed' : ''}`}
            onClick={() => handleSideClick('a')}
          >
            {sideA || ''}
          </div>
        </div>

        {/* Presets */}
        <div className="easy-square-presets">
          {presets.map(p => (
            <button key={p.label} className="easy-square-preset" onClick={() => applyPreset(p)}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fraction Pad */}
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

      {/* Keypad */}
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
