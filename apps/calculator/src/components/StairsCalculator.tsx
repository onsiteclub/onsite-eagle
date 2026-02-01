import { useState, useCallback, useMemo } from 'react';
import { parseToInches, formatInches } from '../lib/calculator/engine';

type InputType = 'riser' | 'tread' | 'steps' | 'totalRise' | 'totalRun';

const FRACTION_PAD = [
  ['1/8"', '1/4"', '3/8"', '1/2"'],
  ['5/8"', '3/4"', '7/8"', "'ft"],
];

interface StairsCalculatorProps {
  voiceEnabled?: boolean;
  isRecording?: boolean;
}

export default function StairsCalculator({}: StairsCalculatorProps) {
  const [riserHeight, setRiserHeight] = useState('7');
  const [treadDepth, setTreadDepth] = useState('10');
  const [numSteps, setNumSteps] = useState('12');

  // Temp input buffers for total fields (user types here, OK commits paired value)
  const [totalRise, setTotalRise] = useState('');
  const [totalRun, setTotalRun] = useState('');

  const [activeInput, setActiveInput] = useState<InputType | null>('riser');

  // Real-time computation based on which field is active
  // Relationships: totalRise = riser × steps, totalRun = tread × (steps-1)
  const computed = useMemo(() => {
    const riser = parseToInches(riserHeight);
    const tread = parseToInches(treadDepth);
    const steps = parseInt(numSteps);
    const rise = parseToInches(totalRise);
    const run = parseToInches(totalRun);

    // Branch 1: editing totalRise → riser adjusts (riser = totalRise / steps)
    if (activeInput === 'totalRise' && rise > 0 && steps > 0) {
      const adjRiser = rise / steps;
      // totalRun stays based on current tread
      const computedRun = tread > 0 && steps > 1 ? tread * (steps - 1) : 0;
      const runForStringer = computedRun > 0 ? computedRun : 0;
      const stringer = rise > 0 && runForStringer > 0
        ? Math.sqrt(rise * rise + runForStringer * runForStringer) : 0;
      return {
        adjustedRiser: formatInches(adjRiser),
        totalRun: computedRun > 0 ? formatInches(computedRun) : null,
        stringer: stringer > 0 ? formatInches(stringer) : null,
      };
    }

    // Branch 2: editing totalRun → tread adjusts (tread = totalRun / (steps-1))
    if (activeInput === 'totalRun' && run > 0 && steps > 1) {
      const adjTread = run / (steps - 1);
      // totalRise stays based on current riser
      const computedRise = riser > 0 && steps > 0 ? riser * steps : 0;
      const stringer = computedRise > 0 && run > 0
        ? Math.sqrt(computedRise * computedRise + run * run) : 0;
      return {
        adjustedTread: formatInches(adjTread),
        totalRise: computedRise > 0 ? formatInches(computedRise) : null,
        stringer: stringer > 0 ? formatInches(stringer) : null,
      };
    }

    // Branch 3: editing riser/tread/steps or idle → forward compute totals
    if (riser > 0 && tread > 0 && steps > 0) {
      const computedRise = riser * steps;
      const computedRun = tread * (steps - 1);
      const stringer = Math.sqrt(computedRise * computedRise + computedRun * computedRun);
      return {
        totalRise: formatInches(computedRise),
        totalRun: formatInches(computedRun),
        stringer: formatInches(stringer),
      };
    }

    return null;
  }, [activeInput, riserHeight, treadDepth, numSteps, totalRise, totalRun]);

  // Display values
  const displayRiser = (activeInput === 'totalRise' && computed?.adjustedRiser)
    ? computed.adjustedRiser : riserHeight;

  const displayTread = (activeInput === 'totalRun' && computed?.adjustedTread)
    ? computed.adjustedTread : treadDepth;

  const displayTotalRise = activeInput === 'totalRise'
    ? totalRise : (computed?.totalRise || '');

  const displayTotalRun = activeInput === 'totalRun'
    ? totalRun : (computed?.totalRun || '');

  const displayStringer = computed?.stringer || '';

  // SVG stair path — always uses numSteps (steps is never computed)
  const stairPath = useMemo(() => {
    const steps = Math.max(2, Math.min(parseInt(numSteps) || 6, 20));
    const x0 = 48, y0 = 148, x1 = 188, y1 = 28;
    const totalW = x1 - x0;
    const totalH = y0 - y1;
    const stepW = totalW / steps;
    const stepH = totalH / steps;

    let path = `M ${x0},${y0}`;
    for (let i = 0; i < steps; i++) {
      const x = x0 + i * stepW;
      const y = y0 - (i + 1) * stepH;
      path += ` L ${x},${y} L ${x + stepW},${y}`;
    }
    path += ` L ${x1},${y0} Z`;
    return path;
  }, [numSteps]);

  // Commit: save adjusted riser/tread to state when leaving total fields
  const commitTotals = useCallback(() => {
    if (activeInput === 'totalRise' && computed?.adjustedRiser) {
      setRiserHeight(computed.adjustedRiser);
      setTotalRise('');
    } else if (activeInput === 'totalRun' && computed?.adjustedTread) {
      setTreadDepth(computed.adjustedTread);
      setTotalRun('');
    }
  }, [activeInput, computed]);

  const handleInputClick = (input: InputType) => {
    // Commit if leaving a total field
    if ((activeInput === 'totalRise' || activeInput === 'totalRun') && input !== activeInput) {
      commitTotals();
    }
    setActiveInput(input);
    if (input === 'totalRise') setTotalRise('');
    else if (input === 'totalRun') setTotalRun('');
  };

  const getCurrentValue = (): string => {
    switch (activeInput) {
      case 'riser': return riserHeight;
      case 'tread': return treadDepth;
      case 'steps': return numSteps;
      case 'totalRise': return totalRise;
      case 'totalRun': return totalRun;
      default: return '';
    }
  };

  const setCurrentValue = useCallback((value: string) => {
    switch (activeInput) {
      case 'riser': setRiserHeight(value); break;
      case 'tread': setTreadDepth(value); break;
      case 'steps': setNumSteps(value); break;
      case 'totalRise': setTotalRise(value); break;
      case 'totalRun': setTotalRun(value); break;
    }
  }, [activeInput]);

  const handleFractionClick = useCallback((frac: string) => {
    if (!activeInput || activeInput === 'steps') return;
    const current = getCurrentValue();
    if (frac === "'ft") {
      setCurrentValue(current + "' ");
    } else {
      const value = frac.replace('"', '');
      if (current && /\d$/.test(current)) {
        setCurrentValue(current + ' ' + value);
      } else {
        setCurrentValue(current + value);
      }
    }
  }, [activeInput, riserHeight, treadDepth, numSteps, totalRise, totalRun, setCurrentValue]);

  const handleKeyPress = useCallback((key: string) => {
    if (!activeInput) return;
    const currentValue = getCurrentValue();

    if (key === 'C') {
      setRiserHeight('');
      setTreadDepth('');
      setNumSteps('');
      setTotalRise('');
      setTotalRun('');
    } else if (key === 'DEL') {
      setCurrentValue(currentValue.slice(0, -1));
    } else if (key === 'OK') {
      // Commit adjusted riser/tread if editing totals
      if (activeInput === 'totalRise' || activeInput === 'totalRun') {
        commitTotals();
      }
      // Move to next field
      if (activeInput === 'totalRise') {
        setActiveInput('totalRun');
        setTotalRun('');
      } else if (activeInput === 'totalRun') {
        setActiveInput('riser');
      } else {
        const inputs: InputType[] = ['riser', 'tread', 'steps'];
        const currentIndex = inputs.indexOf(activeInput);
        const nextIndex = (currentIndex + 1) % inputs.length;
        setActiveInput(inputs[nextIndex]);
      }
    } else if (key === '.' && currentValue.includes('.')) {
      return;
    } else {
      setCurrentValue(currentValue + key);
    }
  }, [activeInput, riserHeight, treadDepth, numSteps, totalRise, totalRun, setCurrentValue, commitTotals]);

  return (
    <div className="easy-square stairs-calculator">
      {/* Header */}
      <div className="easy-square-header">
        <img src="/images/logo-onsite-club-02.png" alt="OnSite" className="easy-square-logo" />
        <span className="easy-square-title">Easy-Stairs</span>
      </div>

      {/* Stair Drawing in white container */}
      <div className="stairs-drawing-container">
        <div className="stairs-visual">
          <svg viewBox="0 0 235 185" className="stairs-svg">
            {/* Bottom floor slab */}
            <rect x="20" y="148" width="28" height="12" fill="#D4C5A9" stroke="currentColor" strokeWidth="1.5" rx="1" />
            <text x="34" y="157" textAnchor="middle" fontSize="6" fontWeight="600" fill="#5C4B3A" fontFamily="Arial, sans-serif">Floor</text>

            {/* Top floor slab */}
            <rect x="188" y="16" width="35" height="12" fill="#D4C5A9" stroke="currentColor" strokeWidth="1.5" rx="1" />
            <text x="205" y="25" textAnchor="middle" fontSize="6" fontWeight="600" fill="#5C4B3A" fontFamily="Arial, sans-serif">Floor</text>

            {/* Dynamic stair steps */}
            <path d={stairPath} fill="none" stroke="currentColor" strokeWidth="2.5" />
            {/* Stringer diagonal */}
            <line x1="48" y1="148" x2="188" y2="28" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5,3" />

            {/* Dimension lines */}
            <line x1="10" y1="28" x2="10" y2="148" stroke="#5C6B7A" strokeWidth="2" />
            <line x1="4" y1="28" x2="16" y2="28" stroke="#5C6B7A" strokeWidth="2.5" />
            <line x1="4" y1="148" x2="16" y2="148" stroke="#5C6B7A" strokeWidth="2.5" />
            <line x1="48" y1="172" x2="188" y2="172" stroke="#5C6B7A" strokeWidth="2" />
            <line x1="48" y1="166" x2="48" y2="178" stroke="#5C6B7A" strokeWidth="2.5" />
            <line x1="188" y1="166" x2="188" y2="178" stroke="#5C6B7A" strokeWidth="2.5" />
          </svg>

          {/* Y value - Total Rise */}
          <div
            className={`stairs-overlay stairs-overlay-rise ${activeInput === 'totalRise' ? 'active' : ''}`}
            onClick={() => handleInputClick('totalRise')}
          >
            {displayTotalRise || '—'}
          </div>

          {/* X value - Total Run */}
          <div
            className={`stairs-overlay stairs-overlay-run ${activeInput === 'totalRun' ? 'active' : ''}`}
            onClick={() => handleInputClick('totalRun')}
          >
            {displayTotalRun || '—'}
          </div>

          {/* Z value - Stringer */}
          <div className="stairs-overlay stairs-overlay-stringer">
            {displayStringer || '—'}
          </div>
        </div>
      </div>

      {/* Input fields below the drawing */}
      <div className="stairs-fields-row">
        <div
          className={`stairs-field ${activeInput === 'riser' ? 'active' : ''} ${activeInput === 'totalRise' && computed?.adjustedRiser ? 'computed' : ''}`}
          onClick={() => handleInputClick('riser')}
        >
          <span className="stairs-field-label">Riser Height</span>
          <span className="stairs-field-value">{displayRiser || '—'}</span>
        </div>
        <div
          className={`stairs-field ${activeInput === 'tread' ? 'active' : ''} ${activeInput === 'totalRun' && computed?.adjustedTread ? 'computed' : ''}`}
          onClick={() => handleInputClick('tread')}
        >
          <span className="stairs-field-label">Tread Depth</span>
          <span className="stairs-field-value">{displayTread || '—'}</span>
        </div>
        <div
          className={`stairs-field ${activeInput === 'steps' ? 'active' : ''}`}
          onClick={() => handleInputClick('steps')}
        >
          <span className="stairs-field-label"># of Steps</span>
          <span className="stairs-field-value">{numSteps || '—'}</span>
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
