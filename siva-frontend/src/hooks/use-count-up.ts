import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * Animação de contagem progressiva (equivalente ao CountUp do React Bits).
 *
 * Interpola do valor anterior até o novo com easing cúbico. A animação só
 * dispara quando o valor muda de fato — nunca a cada renderização — e é
 * desligada quando o usuário prefere menos movimento.
 */
export function useCountUp(value: number, durationMs = 900): number {
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const previousValue = useRef(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const from = previousValue.current;
    if (from === value) return;

    const startedAt = performance.now();

    const step = (now: number): void => {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        previousValue.current = value;
      }
    };

    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, durationMs, prefersReducedMotion]);

  if (prefersReducedMotion) return value;

  return display;
}
