// src/components/AutoFitText.tsx
// Auto-shrinks font size to fit text within container

import { useRef, useEffect, type ReactNode } from 'react';

interface AutoFitTextProps {
  children: ReactNode;
  className?: string;
  maxFontSize?: number;  // in px
  minFontSize?: number;  // in px
}

export default function AutoFitText({
  children,
  className = '',
  maxFontSize = 28,
  minFontSize = 12,
}: AutoFitTextProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reset to max size first
    el.style.fontSize = `${maxFontSize}px`;

    // Shrink until it fits
    let size = maxFontSize;
    while (el.scrollWidth > el.clientWidth && size > minFontSize) {
      size -= 1;
      el.style.fontSize = `${size}px`;
    }
  }, [children, maxFontSize, minFontSize]);

  return (
    <span ref={ref} className={className}>
      {children}
    </span>
  );
}
